/**
 * DID Document Builder
 * Creates and manages W3C DID Documents
 */

import { DIDDocument, DIDCreationOptions, VerificationMethod } from '../types/did';

/**
 * Build a complete DID document from options
 */
export function buildDIDDocument(publicKeyMultibase: string, domain?: string): DIDDocument {
  // Use your specific Ngrok domain
  const didDomain = "helena-unda-bounceably.ngrok-free.dev";
  const didId = `did:web:${didDomain}:issuers:principle`;
  const keyId = `${didId}:${publicKeyMultibase}`;

  // Create verification method
  const verificationMethod: VerificationMethod = {
    id: keyId,
    type: "Ed25519VerificationKey2020",
    controller: didId,
    publicKeyMultibase: publicKeyMultibase
  };

  // Build complete DID document
  const didDocument: DIDDocument = {
    "@context": ["https://www.w3.org/ns/did/v1"],
    id: didId,
    verificationMethod: [verificationMethod],
    assertionMethod: [keyId]
  };

  return didDocument;
}

/**
 * Generate DID identifier from public key (simplified)
 */
export function generateDIDIdentifier(method: string, publicKeyMultibase: string): string {
  return "did:web:iu.schema:issuers:principle";
}

/**
 * Create verification method for Ed25519 keys
 */
export function createEd25519VerificationMethod(didId: string, publicKeyMultibase: string): VerificationMethod {
  return {
    id: `${didId}:${publicKeyMultibase}`,
    type: "Ed25519VerificationKey2020",
    controller: didId,
    publicKeyMultibase: publicKeyMultibase
  };
}

/**
 * Validate DID document structure (minimal validation)
 */
export function validateDIDDocument(document: DIDDocument): boolean {
  return !!(document.id && document.verificationMethod && document.verificationMethod.length > 0);
}

/**
 * Serialize DID document to JSON
 */
export function serializeDIDDocument(document: DIDDocument): string {
  return JSON.stringify(document, null, 2);
}
