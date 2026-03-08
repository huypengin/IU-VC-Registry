/**
 * P-256 Key Generation Module
 * Handles creation and management of ES256-compatible keypairs for DID documents.
 */

import { createPrivateKey, createPublicKey, generateKeyPairSync } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

import type { JsonWebKey } from '../types/did.js';

export interface P256KeyPair {
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
}

function normalizePublicKeyJwk(jwk: JsonWebKey, keyId?: string): JsonWebKey {
  return {
    kty: 'EC',
    crv: 'P-256',
    x: jwk.x,
    y: jwk.y,
    use: 'sig',
    key_ops: ['verify'],
    alg: 'ES256',
    ...(keyId ? { kid: keyId } : {})
  };
}

function normalizePrivateKeyJwk(jwk: JsonWebKey, keyId?: string): JsonWebKey {
  return {
    kty: 'EC',
    crv: 'P-256',
    x: jwk.x,
    y: jwk.y,
    d: jwk.d,
    use: 'sig',
    key_ops: ['sign'],
    alg: 'ES256',
    ...(keyId ? { kid: keyId } : {})
  };
}

function toNodePublicJwk(jwk: JsonWebKey): JsonWebKey {
  return {
    kty: jwk.kty,
    crv: jwk.crv,
    x: jwk.x,
    y: jwk.y
  };
}

function toNodePrivateJwk(jwk: JsonWebKey): JsonWebKey {
  return {
    ...toNodePublicJwk(jwk),
    d: jwk.d
  };
}

function assertP256Jwk(jwk: JsonWebKey, requirePrivateComponent: boolean): void {
  if (jwk.kty !== 'EC') {
    throw new Error('Expected an EC JWK.');
  }
  if (jwk.crv !== 'P-256') {
    throw new Error('Expected a P-256 JWK.');
  }
  if (!jwk.x || !jwk.y) {
    throw new Error('JWK is missing x/y coordinates.');
  }
  if (requirePrivateComponent && !jwk.d) {
    throw new Error('Private JWK is missing d.');
  }
}

export function generateP256KeyPair(keyId?: string): P256KeyPair {
  const { publicKey, privateKey } = generateKeyPairSync('ec', {
    namedCurve: 'P-256'
  });

  const publicKeyJwk = normalizePublicKeyJwk(
    publicKey.export({ format: 'jwk' }) as JsonWebKey,
    keyId
  );
  const privateKeyJwk = normalizePrivateKeyJwk(
    privateKey.export({ format: 'jwk' }) as JsonWebKey,
    keyId
  );

  return {
    publicKeyJwk,
    privateKeyJwk
  };
}

export function assignKeyId(keyPair: P256KeyPair, keyId: string): P256KeyPair {
  return {
    publicKeyJwk: normalizePublicKeyJwk(keyPair.publicKeyJwk, keyId),
    privateKeyJwk: normalizePrivateKeyJwk(keyPair.privateKeyJwk, keyId)
  };
}

export function loadP256KeyPair(
  privateKeyPath: string,
  publicKeyPath: string,
  keyId?: string
): P256KeyPair {
  const privatePem = readFileSync(privateKeyPath, 'utf8');
  const publicPem = readFileSync(publicKeyPath, 'utf8');

  const privateKeyObject = createPrivateKey(privatePem);
  const publicKeyObject = createPublicKey(publicPem);

  const publicKeyJwk = normalizePublicKeyJwk(
    publicKeyObject.export({ format: 'jwk' }) as JsonWebKey,
    keyId
  );
  const privateKeyJwk = normalizePrivateKeyJwk(
    privateKeyObject.export({ format: 'jwk' }) as JsonWebKey,
    keyId
  );

  return {
    publicKeyJwk,
    privateKeyJwk
  };
}

export function saveP256KeyPair(
  keyPair: P256KeyPair,
  privateKeyPath: string,
  publicKeyPath: string
): void {
  assertP256Jwk(keyPair.publicKeyJwk, false);
  assertP256Jwk(keyPair.privateKeyJwk, true);

  const privateKeyObject = createPrivateKey({
    key: toNodePrivateJwk(keyPair.privateKeyJwk),
    format: 'jwk'
  });
  const publicKeyObject = createPublicKey({
    key: toNodePublicJwk(keyPair.publicKeyJwk),
    format: 'jwk'
  });

  const privatePem = privateKeyObject.export({ type: 'pkcs8', format: 'pem' });
  const publicPem = publicKeyObject.export({ type: 'spki', format: 'pem' });

  writeFileSync(privateKeyPath, privatePem as string);
  writeFileSync(publicKeyPath, publicPem as string);
}
