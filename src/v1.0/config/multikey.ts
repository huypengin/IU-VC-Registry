import 'dotenv/config';

import type { JsonWebKey } from '../types/did.js';

export interface IssuerEs256PrivateJwk extends JsonWebKey {
  kty: 'EC';
  crv: 'P-256';
  d: string;
  x: string;
  y: string;
}

function validateEs256PrivateJwk(jwk: JsonWebKey): asserts jwk is IssuerEs256PrivateJwk {
  if (jwk.kty !== 'EC') {
    throw new Error('Expected ES256 private JWK with kty="EC".');
  }
  if (jwk.crv !== 'P-256') {
    throw new Error('Expected ES256 private JWK with crv="P-256".');
  }
  if (!jwk.x || !jwk.y || !jwk.d) {
    throw new Error('Expected ES256 private JWK with x, y, and d values.');
  }
}

export function loadEs256PrivateJwkFromEnv(): IssuerEs256PrivateJwk {
  const jwkJson = process.env.ES256_PRIVATE_JWK_JSON ?? process.env.ES256_JWK_JSON;

  if (!jwkJson) {
    throw new Error('ES256_PRIVATE_JWK_JSON environment variable is not set');
  }

  try {
    const jwk = JSON.parse(jwkJson) as JsonWebKey;
    validateEs256PrivateJwk(jwk);

    return {
      ...jwk,
      use: jwk.use ?? 'sig',
      key_ops: jwk.key_ops ?? ['sign'],
      alg: jwk.alg ?? 'ES256'
    };
  } catch (error) {
    throw new Error(`Failed to parse ES256_PRIVATE_JWK_JSON: ${error}`);
  }
}

export function getIssuerConfig() {
  const privateKeyJwk = loadEs256PrivateJwkFromEnv();
  const issuerDid = process.env.ISSUER_DID || '';
  const issuerVerificationMethod = process.env.ISSUER_VERIFICATION_METHOD || privateKeyJwk.kid || '';

  return {
    publicDomain: process.env.PUBLIC_DOMAIN || 'infra-vc-registry-web-911368042037.asia-east2.run.app',
    issuerDid,
    issuerVerificationMethod,
    privateKeyJwk
  };
}
