import { describe, it, expect } from 'vitest';

import { makeDocumentLoader, signAsDataIntegrity } from '../../src/status/di-signer.js';
import { generateP256KeyPair } from '../../src/v1.0/crypto/index.js';
import { buildDIDDocument } from '../../src/v1.0/did/index.js';

describe('di-signer', () => {
  it('signs data integrity proofs with ES256 / P-256 key material', async () => {
    const didId = 'did:web:vc.test.local:issuers:principle';
    const keyId = `${didId}#key-1`;
    const keyPair = generateP256KeyPair(keyId);
    const didDocument = buildDIDDocument(keyPair.publicKeyJwk, didId);
    const unsignedDocument = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://w3id.org/vc/status-list/2021/v1',
        'https://w3id.org/security/data-integrity/v2'
      ],
      id: 'https://vc.test.local/status/example',
      type: ['VerifiableCredential', 'StatusList2021Credential'],
      issuer: didId,
      issuanceDate: '2026-03-07T00:00:00.000Z',
      credentialSubject: {
        id: 'https://vc.test.local/status/example#list',
        type: 'StatusList2021',
        statusPurpose: 'revocation',
        encodedList: 'H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAA4G4wQAAB'
      }
    };

    const signed = await signAsDataIntegrity({
      unsignedDocument,
      privateKeyJwk: keyPair.privateKeyJwk,
      keyId,
      controller: didId,
      documentLoader: makeDocumentLoader({
        [didId]: didDocument
      })
    });

    expect(signed.proof.type).toBe('DataIntegrityProof');
    expect(signed.proof.cryptosuite).toBe('ecdsa-rdfc-2019');
    expect(signed.proof.verificationMethod).toBe(keyId);
  });
});
