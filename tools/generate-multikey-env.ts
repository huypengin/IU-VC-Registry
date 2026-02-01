#!/usr/bin/env node

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { publickeyToMultibase, privatekeyToMultibase } from '../src/v1.0/crypto/convert-key.js';

const issuerName = process.argv[2] || 'iu';
const keyFilePath = resolve(process.cwd(), `src/registry/issuers/${issuerName}/ed25519.keys.json`);
const didFilePath = resolve(process.cwd(), `src/registry/issuers/${issuerName}/did.json`);

try {
    const keyData = JSON.parse(readFileSync(keyFilePath, 'utf-8'));
    const didDoc = JSON.parse(readFileSync(didFilePath, 'utf-8'));

    const publicKeyBytes = Buffer.from(keyData.publicKey, 'base64');
    const privateKeyBytes = Buffer.from(keyData.privateKey, 'base64');

    const publicKeyMultibase = publickeyToMultibase(publicKeyBytes);
    const secretKeyMultibase = privatekeyToMultibase(privateKeyBytes, publicKeyBytes);

    const keyId = didDoc.verificationMethod[0].id;
    const controllerId = didDoc.id;

    const multikeyJson = {
        "@context": "https://w3id.org/security/multikey/v1",
        "type": "Multikey",
        "controller": controllerId,
        "id": keyId,
        "publicKeyMultibase": publicKeyMultibase,
        "secretKeyMultibase": secretKeyMultibase
    };

    console.log('\n=== Environment Variables ===\n');
    console.log(`PUBLIC_DOMAIN=helena-unda-bounceably.ngrok-free.dev`);
    console.log(`REGISTRY_BASE_URL=https://helena-unda-bounceably.ngrok-free.dev`);
    console.log(`ISSUER_DID=${controllerId}`);
    console.log(`ISSUER_VERIFICATION_METHOD=${keyId}`);
    console.log(`ED25519_MULTIKEY_JSON='${JSON.stringify(multikeyJson)}'`);
    console.log('\n=== Copy the above to your .env file ===\n');

} catch (error) {
    console.error('Error generating Multikey:', error);
    process.exit(1);
}
