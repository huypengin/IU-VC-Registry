#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const issuerName = process.argv[2] || 'principle';
const keyFilePath = resolve(process.cwd(), `src/registry/issuers/${issuerName}/es256.keys.json`);
const didFilePath = resolve(process.cwd(), `src/registry/issuers/${issuerName}/did.json`);

try {
  const keyData = JSON.parse(readFileSync(keyFilePath, 'utf-8'));
  const didDoc = JSON.parse(readFileSync(didFilePath, 'utf-8'));
  const keyId = didDoc.verificationMethod[0].id;
  const controllerId = didDoc.id;

  const privateKeyJwk = {
    ...keyData.privateKeyJwk,
    kid: keyId,
    alg: 'ES256',
    use: 'sig',
    key_ops: ['sign']
  };

  console.log('\n=== Environment Variables ===\n');
  console.log('PUBLIC_DOMAIN=infra-vc-registry-web-911368042037.asia-east2.run.app');
  console.log('REGISTRY_BASE_URL=https://infra-vc-registry-web-911368042037.asia-east2.run.app');
  console.log(`ISSUER_DID=${controllerId}`);
  console.log(`ISSUER_VERIFICATION_METHOD=${keyId}`);
  console.log(`ES256_PRIVATE_JWK_JSON='${JSON.stringify(privateKeyJwk)}'`);
  console.log('\n=== Copy the above to your .env file ===\n');
} catch (error) {
  console.error('Error generating ES256 env values:', error);
  process.exit(1);
}
