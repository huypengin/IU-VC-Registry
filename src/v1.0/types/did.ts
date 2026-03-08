/**
 * DID Document Types
 * Type definitions for W3C DID Document specification
 */

// JsonWebKey interface for JWK format public keys
export interface JsonWebKey {
  [key: string]: unknown;
  kty: string;
  crv?: string;
  x?: string;
  y?: string;
  d?: string;
  use?: string;
  key_ops?: string[];
  alg?: string;
  kid?: string;
}

// Server configuration interface
export interface ServerConfig {
  port: number;
  httpsPort: number;
  host: string;
  certPath?: string;
  keyPath?: string;
  enableNgrok: boolean;
  ngrokAuthToken?: string;
}

export interface DIDDocument {
  '@context': string | string[];
  id: string;
  verificationMethod?: VerificationMethod[];
  authentication?: (string | VerificationMethod)[];
  assertionMethod?: (string | VerificationMethod)[];
  keyAgreement?: (string | VerificationMethod)[];
  capabilityInvocation?: (string | VerificationMethod)[];
  capabilityDelegation?: (string | VerificationMethod)[];
  service?: ServiceEndpoint[];
}

export interface VerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyJwk?: JsonWebKey;
}

export interface ServiceEndpoint {
  id: string;
  type: string;
  serviceEndpoint: string | object;
}

export interface DIDCreationOptions {
  method: string;
  publicKeyJwk: JsonWebKey;
  serviceEndpoints?: ServiceEndpoint[];
}
