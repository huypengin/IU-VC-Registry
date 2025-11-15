/**
 * Ed25519 Key Generation Module
 * Handles creation and management of Ed25519 keypairs for DID documents
 */

import { generateKeyPairSync, createPublicKey, createPrivateKey } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';
import { publickeyToMultibase } from './convert-key';

export interface Ed25519KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
  publicKeyMultibase: string;
}

/**
 * Generate a new Ed25519 keypair
 */
export function generateEd25519KeyPair(): Ed25519KeyPair {
  // Generate Ed25519 keypair using Node.js crypto
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' }
  });

  // Extract raw 32-byte keys from DER format (simple approach)
  const rawPublicKey = new Uint8Array(publicKey.subarray(-32));
  const rawPrivateKey = new Uint8Array(privateKey.subarray(-32));

  // Convert to multibase format
  const publicKeyMultibase = publickeyToMultibase(rawPublicKey);

  return {
    publicKey: rawPublicKey,
    privateKey: rawPrivateKey,
    publicKeyMultibase
  };
}

/**
 * Load Ed25519 keypair from PEM files
 */
export function loadEd25519KeyPair(privateKeyPath: string, publicKeyPath: string): Ed25519KeyPair {
  // Read PEM files
  const privatePem = readFileSync(privateKeyPath, 'utf8');
  const publicPem = readFileSync(publicKeyPath, 'utf8');

  // Parse PEM keys
  const privateKeyObject = createPrivateKey(privatePem);
  const publicKeyObject = createPublicKey(publicPem);

  // Export as DER to get raw bytes
  const privateDer = privateKeyObject.export({ type: 'pkcs8', format: 'der' });
  const publicDer = publicKeyObject.export({ type: 'spki', format: 'der' });

  // Extract raw 32-byte keys
  const rawPrivateKey = new Uint8Array(privateDer.subarray(-32));
  const rawPublicKey = new Uint8Array(publicDer.subarray(-32));

  // Convert to multibase format
  const publicKeyMultibase = publickeyToMultibase(rawPublicKey);

  return {
    publicKey: rawPublicKey,
    privateKey: rawPrivateKey,
    publicKeyMultibase
  };
}

/**
 * Save Ed25519 keypair to PEM files
 */
export function saveEd25519KeyPair(keyPair: Ed25519KeyPair, privateKeyPath: string, publicKeyPath: string): void {
  // Create key objects from raw bytes
  const privateKeyObject = createPrivateKey({
    key: Buffer.concat([
      Buffer.from([0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20]),
      Buffer.from(keyPair.privateKey)
    ]),
    format: 'der',
    type: 'pkcs8'
  });

  const publicKeyObject = createPublicKey({
    key: Buffer.concat([
      Buffer.from([0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00]),
      Buffer.from(keyPair.publicKey)
    ]),
    format: 'der',
    type: 'spki'
  });

  // Export to PEM format
  const privatePem = privateKeyObject.export({ type: 'pkcs8', format: 'pem' });
  const publicPem = publicKeyObject.export({ type: 'spki', format: 'pem' });

  // Write to files
  writeFileSync(privateKeyPath, privatePem as string);
  writeFileSync(publicKeyPath, publicPem as string);
}
