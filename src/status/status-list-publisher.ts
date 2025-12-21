import fs from 'node:fs/promises';
import path from 'node:path';
import { getStatusList } from './status-list-service.js';
import { makeDocumentLoader, signAsDataIntegrity } from './di-signer.js';
import { loadMultikeyFromEnv, getIssuerConfig } from '../v1.0/config/multikey.js';

const PUBLIC_REGISTRY_PATH = path.resolve('public/status');

interface StatusList2021CredentialParams {
  listId: string;
  encodedList: string;
  statusPurpose: string;
}

export async function publishStatusList(listId: string): Promise<void> {
  const statusList = await getStatusList(listId);
  if (!statusList) throw new Error(`Status list not found: ${listId}`);

  const parts = listId.split('-');
  const category = parts[1] || 'general';
  const year = parts[2] || new Date().getFullYear().toString();

  const dirPath = path.join(PUBLIC_REGISTRY_PATH, category, year);
  const filePath = path.join(dirPath, 'status-list.json');
  await fs.mkdir(dirPath, { recursive: true });

  const unsigned = buildUnsignedStatusList2021Credential({
    listId,
    encodedList: statusList.encodedList,
    statusPurpose: statusList.statusPurpose
  });

  const keyPairJson = loadMultikeyFromEnv();
  const documentLoader = makeDocumentLoader({ extraDocuments: {} });

  const signed = await signAsDataIntegrity({
    unsignedDocument: unsigned,
    keyPairJson,
    documentLoader
  });
  
  console.log('result sign', signed);

  await fs.writeFile(filePath, JSON.stringify(signed, null, 2), 'utf8');
  console.log(`✅ Published SIGNED status list: ${listId} -> ${filePath}`);
}

function buildUnsignedStatusList2021Credential({
  listId,
  encodedList,
  statusPurpose
}: StatusList2021CredentialParams): any {
  const now = new Date().toISOString();
  const config = getIssuerConfig();

  const parts = listId.split('-');
  const category = parts[1] || 'general';
  const year = parts[2] || new Date().getFullYear().toString();

  const statusListUrl = `https://${config.publicDomain}/status/${category}/${year}/status-list.json`;

  return {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://w3id.org/vc/status-list/2021/v1",
        'https://w3id.org/security/data-integrity/v2'
    ],
    id: statusListUrl,
    type: ["VerifiableCredential", "StatusList2021Credential"],
    issuer: config.issuerDid,
    issuanceDate: now,
    credentialSubject: {
      id: `${statusListUrl}#list`,
      type: "StatusList2021",
      statusPurpose,
      encodedList
    }
  };
}


