/**
 * DID Document Builder
 * Creates and manages W3C DID Documents.
 */

import type { DIDDocument, JsonWebKey, VerificationMethod } from '../types/did.js';

const DEFAULT_DID_SUFFIX = 'infra-vc-registry-web-911368042037.asia-east2.run.app:issuers:principle';
const DID_CONTEXT = 'https://www.w3.org/ns/did/v1';
const JWS_2020_CONTEXT = 'https://w3id.org/security/suites/jws-2020/v1';
const DEFAULT_KEY_FRAGMENT = 'key-1';

function toVerificationMethodId(didId: string, keyFragment: string = DEFAULT_KEY_FRAGMENT): string {
  return `${didId}#${keyFragment}`;
}

function toPublicJwk(publicKeyJwk: JsonWebKey, keyId: string): JsonWebKey {
  return {
    kty: 'EC',
    crv: 'P-256',
    x: publicKeyJwk.x,
    y: publicKeyJwk.y,
    use: 'sig',
    key_ops: ['verify'],
    alg: 'ES256',
    kid: keyId
  };
}

/**
 * Build a complete DID document from options.
 */
export function buildDIDDocument(publicKeyJwk: JsonWebKey, domain?: string): DIDDocument {
  const didId = resolveDidIdentifier(domain);
  const keyId = toVerificationMethodId(didId);
  const verificationMethod = createJsonWebKey2020VerificationMethod(didId, publicKeyJwk);

  const didDocument: DIDDocument = {
    '@context': [DID_CONTEXT, JWS_2020_CONTEXT],
    id: didId,
    verificationMethod: [verificationMethod],
    assertionMethod: [keyId]
  };

  return didDocument;
}

function resolveDidIdentifier(domain?: string): string {
  if (!domain || !domain.trim()) {
    return `did:web:${DEFAULT_DID_SUFFIX}`;
  }

  const trimmed = domain.trim();
  if (trimmed.startsWith('did:')) {
    return trimmed;
  }

  return `did:web:${trimmed}`;
}

/**
 * Generate DID identifier from the public JWK (simplified).
 */
export function generateDIDIdentifier(_method: string, _publicKeyJwk: JsonWebKey): string {
  return 'did:web:iu.schema:issuers:principle';
}

/**
 * Create verification method for ES256/P-256 keys.
 */
export function createJsonWebKey2020VerificationMethod(
  didId: string,
  publicKeyJwk: JsonWebKey
): VerificationMethod {
  const keyId = publicKeyJwk.kid ?? toVerificationMethodId(didId);

  return {
    id: keyId,
    type: 'JsonWebKey2020',
    controller: didId,
    publicKeyJwk: toPublicJwk(publicKeyJwk, keyId)
  };
}

/**
 * Validate DID document structure (minimal validation).
 */
export function validateDIDDocument(document: DIDDocument): boolean {
  return !!(document.id && document.verificationMethod && document.verificationMethod.length > 0);
}

/**
 * Serialize DID document to JSON.
 */
export function serializeDIDDocument(document: DIDDocument): string {
  return JSON.stringify(document, null, 2);
}
