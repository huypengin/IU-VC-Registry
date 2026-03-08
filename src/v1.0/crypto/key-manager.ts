import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

import type { JsonWebKey } from '../types/did.js';
import { P256KeyPair, generateP256KeyPair } from './p256.js';

const AES_ALGORITHM = 'aes-256-gcm';
const DEFAULT_SCRYPT_COST = 1 << 15; // 32768
const MIN_SCRYPT_COST = 1 << 4;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

export interface KeyEncryptionOptions {
  passphrase: string;
  salt?: Uint8Array;
  iv?: Uint8Array;
  scryptCost?: number;
  scryptBlockSize?: number;
  scryptParallelization?: number;
}

export interface EncryptedPrivateKeyBundle {
  cipher: 'aes-256-gcm';
  kdf: 'scrypt';
  kdfCost: number;
  kdfBlockSize: number;
  kdfParallelization: number;
  salt: string;
  iv: string;
  authTag: string;
  ciphertext: string;
}

export interface GeneratedEncryptedP256KeyPair {
  keyPair: P256KeyPair;
  encryptedPrivateKey: EncryptedPrivateKeyBundle;
}

export type GenerateEncryptedP256KeyPairOptions = Omit<KeyEncryptionOptions, 'passphrase'>;

function ensurePassphrase(passphrase: string): void {
  if (!passphrase || !passphrase.trim()) {
    throw new Error('A non-empty passphrase is required to protect the private key.');
  }
}

function toBuffer(value: Uint8Array | Buffer | undefined, length: number): Buffer {
  if (value) {
    return Buffer.from(value);
  }
  return randomBytes(length);
}

function deriveKey(
  passphrase: string,
  salt: Buffer,
  params: { cost: number; blockSize: number; parallelization: number }
): Buffer {
  const cost = Math.max(params.cost, MIN_SCRYPT_COST);
  const blockSize = Math.max(params.blockSize, 1);
  const parallelization = Math.max(params.parallelization, 1);

  if (cost < 2 || (cost & (cost - 1)) !== 0) {
    throw new Error('scrypt cost parameter must be a power of two greater than 1.');
  }

  // Validate parameters according to RFC 7914 limits
  if (blockSize * parallelization >= (1 << 30) / 128) {
    throw new Error('Invalid scrypt blockSize * parallelization combination.');
  }

  return scryptSync(passphrase, salt, KEY_LENGTH, {
    N: cost,
    r: blockSize,
    p: parallelization,
    maxmem: 256 * blockSize * cost + 1024
  });
}

function assertPrivateKeyJwk(privateKeyJwk: JsonWebKey): void {
  if (privateKeyJwk.kty !== 'EC' || privateKeyJwk.crv !== 'P-256' || !privateKeyJwk.d) {
    throw new Error('Expected an ES256 private P-256 JWK.');
  }
}

export function encryptPrivateKeyJwk(
  privateKeyJwk: JsonWebKey,
  options: KeyEncryptionOptions
): EncryptedPrivateKeyBundle {
  ensurePassphrase(options.passphrase);
  assertPrivateKeyJwk(privateKeyJwk);

  const salt = toBuffer(options.salt, SALT_LENGTH);
  const iv = toBuffer(options.iv, IV_LENGTH);
  const kdfCost = options.scryptCost ?? DEFAULT_SCRYPT_COST;
  const blockSize = options.scryptBlockSize ?? 8;
  const parallelization = options.scryptParallelization ?? 1;
  const key = deriveKey(options.passphrase, salt, {
    cost: kdfCost,
    blockSize,
    parallelization
  });

  const cipher = createCipheriv(AES_ALGORITHM, key, iv);
  const plaintext = Buffer.from(JSON.stringify(privateKeyJwk), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    cipher: AES_ALGORITHM,
    kdf: 'scrypt',
    kdfCost,
    kdfBlockSize: blockSize,
    kdfParallelization: parallelization,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: ciphertext.toString('base64')
  };
}

export function decryptPrivateKeyJwk(
  bundle: EncryptedPrivateKeyBundle,
  passphrase: string
): JsonWebKey {
  ensurePassphrase(passphrase);

  if (bundle.cipher !== AES_ALGORITHM) {
    throw new Error(`Unsupported cipher: ${bundle.cipher}`);
  }

  const salt = Buffer.from(bundle.salt, 'base64');
  const iv = Buffer.from(bundle.iv, 'base64');
  const authTag = Buffer.from(bundle.authTag, 'base64');
  const ciphertext = Buffer.from(bundle.ciphertext, 'base64');
  const key = deriveKey(passphrase, salt, {
    cost: bundle.kdfCost ?? DEFAULT_SCRYPT_COST,
    blockSize: bundle.kdfBlockSize ?? 8,
    parallelization: bundle.kdfParallelization ?? 1
  });

  const decipher = createDecipheriv(AES_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  try {
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const jwk = JSON.parse(plaintext.toString('utf8')) as JsonWebKey;
    assertPrivateKeyJwk(jwk);
    return jwk;
  } catch (error) {
    throw new Error('Failed to decrypt ES256 private key JWK: invalid passphrase or corrupted payload.');
  }
}

export function generateEncryptedP256KeyPair(
  passphrase: string,
  options?: GenerateEncryptedP256KeyPairOptions
): GeneratedEncryptedP256KeyPair {
  const keyPair = generateP256KeyPair();
  const encryptedPrivateKey = encryptPrivateKeyJwk(keyPair.privateKeyJwk, {
    passphrase,
    salt: options?.salt,
    iv: options?.iv,
    scryptCost: options?.scryptCost,
    scryptBlockSize: options?.scryptBlockSize,
    scryptParallelization: options?.scryptParallelization
  });

  return {
    keyPair,
    encryptedPrivateKey
  };
}
