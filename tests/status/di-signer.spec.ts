import { describe, it, expect } from 'vitest';

import { makeDocumentLoader, signAsDataIntegrity } from '../../src/status/di-signer.js';
import { generateP256KeyPair } from '../../src/v1.0/crypto/index.js';
import { buildDIDDocument } from '../../src/v1.0/did/index.js';
import { buildUnsignedStatusList2021Credential } from '../../src/status/status-list-publisher.js';

describe('di-signer', () => {
  it('builds the canonical VC-v2 status-list payload shape before signing', () => {
    const unsignedDocument = buildUnsignedStatusList2021Credential({
      listId: 'degree/2025',
      encodedList: 'H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAA4G4wQAAB',
      statusPurpose: 'revocation',
      publicUrl: 'https://vc.test.local/status/degree/2025/status-list.json',
      issuerDid: 'did:web:vc.test.local:issuers:principle'
    });

    expect(unsignedDocument['@context']).toEqual([
      'https://www.w3.org/ns/credentials/v2',
      'https://w3id.org/vc/status-list/2021/v1',
      'https://w3id.org/security/data-integrity/v2'
    ]);
    expect(unsignedDocument.id).toBe('https://vc.test.local/status/degree/2025/status-list.json');
    expect(unsignedDocument.validFrom).toBeDefined();
    expect(unsignedDocument.issuanceDate).toBeUndefined();
    expect(unsignedDocument.credentialSubject.id).toBe(
      'https://vc.test.local/status/degree/2025/status-list.json#list'
    );
  });

  it('signs data integrity proofs with ES256 / P-256 key material', async () => {
    const didId = 'did:web:vc.test.local:issuers:principle';
    const keyId = `${didId}#key-1`;
    const keyPair = generateP256KeyPair(keyId);
    const didDocument = buildDIDDocument(keyPair.publicKeyJwk, didId);
    const unsignedDocument = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://w3id.org/security/data-integrity/v2'
      ],
      id: 'urn:uuid:test-di-proof',
      type: ['VerifiableCredential'],
      issuer: didId,
      issuanceDate: '2026-03-07T00:00:00.000Z',
      credentialSubject: {
        id: 'did:example:student123'
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
