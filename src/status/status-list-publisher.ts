import fs from 'node:fs/promises';
import path from 'node:path';
import { getStatusList } from './status-list-service.js';

const PUBLIC_REGISTRY_PATH = path.resolve('public/status');

/**
 * Publish a status list to the public registry
 * This creates a StatusList2021Credential JSON file that can be served via HTTPS
 */
export async function publishStatusList(listId: string): Promise<void> {
  const statusList = await getStatusList(listId);
  
  if (!statusList) {
    throw new Error(`Status list not found: ${listId}`);
  }

  // Parse listId to determine the file path
  // Example: "slu-degree-2025" -> public/status/degree/2025/status-list.json
  const parts = listId.split('-');
  const category = parts[1] || 'general';
  const year = parts[2] || new Date().getFullYear().toString();
  
  const dirPath = path.join(PUBLIC_REGISTRY_PATH, category, year);
  const filePath = path.join(dirPath, 'status-list.json');

  // Ensure directory exists
  await fs.mkdir(dirPath, { recursive: true });

  // Build StatusList2021Credential
  const credential = buildStatusList2021Credential(listId, statusList.encodedList, statusList.statusPurpose);

  // Write to file (atomic overwrite)
  await fs.writeFile(filePath, JSON.stringify(credential, null, 2), 'utf8');

  console.log(`✅ Published status list: ${listId} -> ${filePath}`);
}

/**
 * Build a W3C StatusList2021Credential
 * Spec: https://w3c-ccg.github.io/vc-status-list-2021/
 */
function buildStatusList2021Credential(
  listId: string,
  encodedList: string,
  statusPurpose: string
): any {
  const now = new Date().toISOString();
  const domain = process.env.PUBLIC_DOMAIN || 'helena-unda-bounceably.ngrok-free.dev';
  
  // Parse listId to build the credential ID
  const parts = listId.split('-');
  const category = parts[1] || 'general';
  const year = parts[2] || new Date().getFullYear().toString();
  
  return {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      `https://${domain}/contexts/vn-edu-statuslist-v1.jsonld`,
    ],
    id: `https://${domain}/status/${category}/${year}/status-list.json`,
    type: ['VerifiableCredential', 'StatusList2021Credential'],
    issuer: `did:web:${domain.replace(/\./g, ':')}:issuers:iu`,
    issuanceDate: now,
    credentialSubject: {
      id: `https://${domain}/status/${category}/${year}/status-list.json#list`,
      type: 'StatusList2021',
      statusPurpose,
      encodedList,
    },
  };
}

