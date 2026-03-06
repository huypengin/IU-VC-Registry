import 'dotenv/config';

export interface Ed25519Multikey {
  '@context': string;
  type: string;
  controller: string;
  id: string;
  publicKeyMultibase: string;
  secretKeyMultibase: string;
}

export function loadMultikeyFromEnv(): Ed25519Multikey {
  const multikeyJson = process.env.ED25519_MULTIKEY_JSON;
  
  if (!multikeyJson) {
    throw new Error('ED25519_MULTIKEY_JSON environment variable is not set');
  }

  try {
    const multikey = JSON.parse(multikeyJson);
    
    if (!multikey.secretKeyMultibase) {
      throw new Error('Multikey is missing secretKeyMultibase');
    }
    
    if (!multikey.publicKeyMultibase) {
      throw new Error('Multikey is missing publicKeyMultibase');
    }
    
    if (!multikey.controller) {
      throw new Error('Multikey is missing controller');
    }
    
    if (!multikey.id) {
      throw new Error('Multikey is missing id');
    }
    
    return multikey as Ed25519Multikey;
  } catch (error) {
    throw new Error(`Failed to parse ED25519_MULTIKEY_JSON: ${error}`);
  }
}

export function getIssuerConfig() {
  return {
    publicDomain: process.env.PUBLIC_DOMAIN || 'infra-vc-registry-web-911368042037.asia-east2.run.app',
    issuerDid: process.env.ISSUER_DID || '',
    issuerVerificationMethod: process.env.ISSUER_VERIFICATION_METHOD || '',
    multikey: loadMultikeyFromEnv()
  };
}

