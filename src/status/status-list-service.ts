import { pool } from '../db/connection.js';
import { pako } from './pako-wrapper.js';

function extractCategoryAndYear(listId: string): { category: string; year: string } {
  const slashParts = listId.split('/');
  if (slashParts.length >= 2) {
    const category = slashParts[0];
    const yearPart = slashParts[1].split('-')[0];
    return { category, year: yearPart };
  }
  
  const dashParts = listId.split('-');
  const category = dashParts.length > 1 ? dashParts[1] : 'general';
  const year = dashParts.length > 2 ? dashParts[2] : new Date().getFullYear().toString();
  return { category, year };
}

export interface StatusList {
  id: string;
  nextIndex: number;
  encodedList: string;
  size: number;
  statusPurpose: string;
  publicUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: number;
  listId: string;
  credentialIndex: number;
  credentialId?: string;
  action: 'allocate' | 'revoke' | 'unrevoke';
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface StatusAllocation {
  index: number;
  credentialStatus: {
    id?: string;
    type: string;
    statusPurpose: string;
    statusListIndex: string;
    statusListCredential: string;
  };
}

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  if (!trimmed) {
    throw new Error('Status list base URL is required');
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function getStatusListBaseUrl(): string {
  const configured =
    process.env.REGISTRY_BASE_URL
    ?? process.env.PUBLIC_DOMAIN
    ?? 'https://infra-vc-registry-web-911368042037.asia-east2.run.app';
  return normalizeBaseUrl(configured);
}

export function buildStatusListPublicUrl(listId: string, baseUrl: string): string {
  const { category, year } = extractCategoryAndYear(listId);
  return `${normalizeBaseUrl(baseUrl)}/status/${category}/${year}/status-list.json`;
}

export function buildCredentialStatusEntry(input: {
  statusListCredential: string;
  statusListIndex: number | string;
  statusPurpose: string;
  includeId?: boolean;
}): StatusAllocation['credentialStatus'] {
  const statusListIndex = String(input.statusListIndex);
  return {
    ...(input.includeId === false
      ? {}
      : { id: `${input.statusListCredential}#${statusListIndex}` }),
    type: 'StatusList2021Entry',
    statusPurpose: input.statusPurpose,
    statusListIndex,
    statusListCredential: input.statusListCredential
  };
}

/**
 * Initialize a new status list with all bits set to 0
 */
export async function initStatusList(
  listId: string,
  size: number = 16384,
  statusPurpose: 'revocation' | 'suspension' = 'revocation'
): Promise<StatusList> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const byteLength = Math.ceil(size / 8);
    const bitstring = new Uint8Array(byteLength);

    const compressed = pako.gzip(bitstring);

    const encodedList = Buffer.from(compressed)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const publicUrl = buildStatusListPublicUrl(listId, getStatusListBaseUrl());

    const result = await client.query(
      `INSERT INTO status_lists (id, next_index, encoded_list, size, status_purpose, public_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [listId, 0, encodedList, size, statusPurpose, publicUrl]
    );

    await client.query('COMMIT');
    return dbRowToStatusList(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function allocateStatusIndices(
  listId: string,
  count: number = 1,
  credentialId?: string
): Promise<StatusAllocation[]> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT next_index, size, status_purpose FROM status_lists WHERE id = $1 FOR UPDATE`,
      [listId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Status list not found: ${listId}`);
    }

    const { next_index, size, status_purpose } = result.rows[0];
    const startIndex = next_index;
    const endIndex = startIndex + count;

    if (endIndex > size) {
      throw new Error(
        `Not enough space in status list. Requested: ${count}, Available: ${size - startIndex}`
      );
    }

    await client.query(
      `UPDATE status_lists SET next_index = $1 WHERE id = $2`,
      [endIndex, listId]
    );

    const statusListUrl = buildStatusListPublicUrl(listId, getStatusListBaseUrl());

    const allocations: StatusAllocation[] = [];
    for (let i = startIndex; i < endIndex; i++) {
      console.log(`📝 Inserting audit log: listId=${listId}, index=${i}, action=allocate`);
      const auditResult = await client.query(
        `INSERT INTO audit_logs (list_id, credential_index, credential_id, action)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [listId, i, credentialId || null, 'allocate']
      );
      console.log(`✅ Audit log inserted:`, auditResult.rows[0]);
      
      allocations.push({
        index: i,
        credentialStatus: buildCredentialStatusEntry({
          statusListCredential: statusListUrl,
          statusListIndex: i,
          statusPurpose: status_purpose
        })
      });
    }

    console.log(`💾 Committing transaction for allocateStatusIndices`);
    await client.query('COMMIT');
    console.log(`✅ Transaction committed successfully`);
    return allocations;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Set a bit in the status list (1 = revoked, 0 = valid)
 */
export async function setStatusBit(
  listId: string,
  index: number,
  value: 0 | 1,
  credentialId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock and get current status list
    const result = await client.query(
      `SELECT encoded_list, size FROM status_lists WHERE id = $1 FOR UPDATE`,
      [listId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Status list not found: ${listId}`);
    }

    const { encoded_list, size } = result.rows[0];

    // Validate index
    if (index < 0 || index >= size) {
      throw new Error(`Index ${index} out of bounds (0-${size - 1})`);
    }

    const compressed = base64urlToBuffer(encoded_list)
    const bitstring = pako.ungzip(compressed);

    const byteIndex = Math.floor(index / 8);
    const bitIndex = 7 - (index % 8);
    
    if (value === 1) {
      bitstring[byteIndex] |= 1 << bitIndex;
    } else {
      bitstring[byteIndex] &= ~(1 << bitIndex);
    }

    const newCompressed = pako.gzip(bitstring);
    const newEncodedList = Buffer.from(newCompressed)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    console.log(`📝 Updating status list: listId=${listId}, new encodedList length=${newEncodedList.length}`);
    const updateResult = await client.query(
      `UPDATE status_lists SET encoded_list = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING updated_at`,
      [newEncodedList, listId]
    );
    console.log(`✅ Status list updated, new updated_at:`, updateResult.rows[0]?.updated_at);

    const action = value === 1 ? 'revoke' : 'unrevoke';
    console.log(`📝 Inserting audit log: listId=${listId}, index=${index}, action=${action}`);
    const auditResult = await client.query(
      `INSERT INTO audit_logs (list_id, credential_index, credential_id, action, metadata)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [listId, index, credentialId || null, action, metadata ? JSON.stringify(metadata) : null]
    );
    console.log(`✅ Audit log inserted:`, auditResult.rows[0]);

    console.log(`💾 Committing transaction for setStatusBit`);
    await client.query('COMMIT');
    console.log(`✅ Transaction committed successfully`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get status list by ID
 */
export async function getStatusList(listId: string): Promise<StatusList | null> {
  const result = await pool.query(
    `SELECT * FROM status_lists WHERE id = $1`,
    [listId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return dbRowToStatusList(result.rows[0]);
}

export async function getStatusListByPublicUrl(publicUrl: string): Promise<StatusList | null> {
  const result = await pool.query(
    `SELECT * FROM status_lists WHERE public_url = $1`,
    [publicUrl]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return dbRowToStatusList(result.rows[0]);
}

export async function getAuditLogs(
  listId: string,
  limit: number = 100,
  offset: number = 0
): Promise<AuditLog[]> {
  const result = await pool.query(
    `SELECT * FROM audit_logs 
     WHERE list_id = $1 
     ORDER BY timestamp DESC 
     LIMIT $2 OFFSET $3`,
    [listId, limit, offset]
  );

  return result.rows.map(dbRowToAuditLog);
}

/**
 * Helper: Convert DB row to StatusList
 */
function dbRowToStatusList(row: any): StatusList {
  return {
    id: row.id,
    nextIndex: row.next_index,
    encodedList: row.encoded_list,
    size: row.size,
    statusPurpose: row.status_purpose,
    publicUrl: row.public_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Helper: Convert DB row to AuditLog
 */
function dbRowToAuditLog(row: any): AuditLog {
  return {
    id: row.id,
    listId: row.list_id,
    credentialIndex: row.credential_index,
    credentialId: row.credential_id,
    action: row.action,
    metadata: row.metadata,
    timestamp: row.timestamp,
  };
}

function base64urlToBuffer(b64url: string) {
    let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    return Buffer.from(b64, 'base64');
}
