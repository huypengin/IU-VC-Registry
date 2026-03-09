import fs from 'node:fs/promises';
import path from 'node:path';
import { getStatusList } from './status-list-service.js';
import { getIssuerConfig } from '../v1.0/config/multikey.js';

const PUBLIC_REGISTRY_PATH = path.resolve('public/status');

interface StatusList2021CredentialParams {
  listId: string;
  encodedList: string;
  statusPurpose: string;
  publicUrl: string;
  issuerDid?: string;
}

export async function publishStatusList(listId: string): Promise<void> {
  const statusList = await getStatusList(listId);
  if (!statusList) throw new Error(`Status list not found: ${listId}`);

  if (!statusList.publicUrl) {
    throw new Error(`Status list ${listId} has no public_url configured`);
  }

  const urlPath = new URL(statusList.publicUrl).pathname;
  const pathParts = urlPath.split('/').filter(p => p);
  const category = pathParts[1] || 'general';
  const year = pathParts[2] || new Date().getFullYear().toString();

  const dirPath = path.join(PUBLIC_REGISTRY_PATH, category, year);
  const filePath = path.join(dirPath, 'status-list.json');
  await fs.mkdir(dirPath, { recursive: true });

  const unsigned = buildUnsignedStatusList2021Credential({
    listId,
    encodedList: statusList.encodedList,
    statusPurpose: statusList.statusPurpose,
    publicUrl: statusList.publicUrl
  });

  await fs.writeFile(filePath, JSON.stringify(unsigned, null, 2), 'utf8');
  console.log(`✅ Published status list: ${listId} -> ${filePath}`);
}

export function buildUnsignedStatusList2021Credential({
  listId,
  encodedList,
  statusPurpose,
  publicUrl,
  issuerDid
}: StatusList2021CredentialParams): any {
  const now = new Date().toISOString();
  const resolvedIssuerDid = issuerDid ?? getIssuerConfig().issuerDid;

  return {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://w3id.org/vc/status-list/2021/v1",
      "https://w3id.org/security/data-integrity/v2"
    ],
    id: publicUrl,
    type: ["VerifiableCredential", "StatusList2021Credential"],
    issuer: resolvedIssuerDid,
    validFrom: now,
    credentialSubject: {
      id: `${publicUrl}#list`,
      type: "StatusList2021",
      statusPurpose,
      encodedList
    }
  };
}
