import { describe, it, expect } from 'vitest';

import {
  generateP256KeyPair,
  decryptPrivateKeyJwk,
  encryptPrivateKeyJwk,
  generateEncryptedP256KeyPair
} from '../../src/v1.0/crypto/index.js';

describe('key-manager', () => {
  it('encrypts and decrypts an ES256 private JWK deterministically with provided salt/iv', () => {
    const keyPair = generateP256KeyPair();
    const passphrase = 'test-passphrase';
    const salt = new Uint8Array(16).fill(1);
    const iv = new Uint8Array(12).fill(2);

    const encrypted = encryptPrivateKeyJwk(keyPair.privateKeyJwk, {
      passphrase,
      salt,
      iv,
      scryptCost: 1 << 14
    });

    const decrypted = decryptPrivateKeyJwk(encrypted, passphrase);
    expect(decrypted).toEqual(keyPair.privateKeyJwk);
    expect(decrypted.kty).toBe('EC');
    expect(decrypted.crv).toBe('P-256');
    expect(decrypted.alg).toBe('ES256');
  });

  it('generates encrypted P-256 key pairs and decrypts the private key successfully', () => {
    const passphrase = 'another-passphrase';
    const { keyPair, encryptedPrivateKey } = generateEncryptedP256KeyPair(passphrase);

    const decrypted = decryptPrivateKeyJwk(encryptedPrivateKey, passphrase);
    expect(decrypted).toEqual(keyPair.privateKeyJwk);
    expect(keyPair.publicKeyJwk.kty).toBe('EC');
    expect(keyPair.publicKeyJwk.crv).toBe('P-256');
    expect(keyPair.publicKeyJwk.alg).toBe('ES256');
  });

  it('throws on wrong passphrase', () => {
    const passphrase = 'correct-passphrase';
    const wrongPassphrase = 'wrong-passphrase';
    const { encryptedPrivateKey } = generateEncryptedP256KeyPair(passphrase);

    expect(() => decryptPrivateKeyJwk(encryptedPrivateKey, wrongPassphrase)).toThrow();
  });
});
