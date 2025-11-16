import { describe, it, expect } from 'vitest';

import {
  generateEd25519KeyPair,
  decryptEd25519PrivateKey,
  encryptEd25519PrivateKey,
  generateEncryptedEd25519KeyPair
} from '../../src/v1.0/crypto/index.js';

describe('key-manager', () => {
  it('encrypts and decrypts an Ed25519 private key deterministically with provided salt/iv', () => {
    const keyPair = generateEd25519KeyPair();
    const passphrase = 'test-passphrase';
    const salt = new Uint8Array(16).fill(1);
    const iv = new Uint8Array(12).fill(2);

    const encrypted = encryptEd25519PrivateKey(keyPair.privateKey, {
      passphrase,
      salt,
      iv,
      scryptCost: 1 << 14
    });

    const decrypted = decryptEd25519PrivateKey(encrypted, passphrase);
    expect(decrypted).toEqual(keyPair.privateKey);
  });

  it('generates encrypted key pairs and decrypts the private key successfully', () => {
    const passphrase = 'another-passphrase';
    const { keyPair, encryptedPrivateKey } = generateEncryptedEd25519KeyPair(passphrase);

    const decrypted = decryptEd25519PrivateKey(encryptedPrivateKey, passphrase);
    expect(decrypted).toEqual(keyPair.privateKey);
  });

  it('throws on wrong passphrase', () => {
    const passphrase = 'correct-passphrase';
    const wrongPassphrase = 'wrong-passphrase';
    const { encryptedPrivateKey } = generateEncryptedEd25519KeyPair(passphrase);

    expect(() => decryptEd25519PrivateKey(encryptedPrivateKey, wrongPassphrase)).toThrow();
  });
});
