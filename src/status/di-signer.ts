// @ts-ignore
import jsigsImport from 'jsonld-signatures';
// @ts-ignore
import jsonld from 'jsonld';
// @ts-ignore
import { DataIntegrityProof } from '@digitalbazaar/data-integrity';
// @ts-ignore
import { cryptosuite as ecdsaRdfc2019CryptoSuite } from '@digitalbazaar/ecdsa-rdfc-2019-cryptosuite';
// @ts-ignore
import * as EcdsaMultikey from '@digitalbazaar/ecdsa-multikey';

import fs from 'node:fs';
import path from 'node:path';

import type { JsonWebKey } from '../v1.0/types/did.js';

const jsigs: any = jsigsImport;
const { AssertionProofPurpose } = jsigs.purposes;

const baseDocumentLoader = jsonld.documentLoaders.node();

function readJson(relPathFromProjectRoot: string) {
  const abs = path.resolve(relPathFromProjectRoot);
  return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

function getRegistryStaticRoot(): string {
  const env = process.env.REGISTRY_STATIC_DIR?.trim();
  return env ? path.resolve(env) : path.resolve('public');
}

const CONTEXTS_DIR = path.join(getRegistryStaticRoot(), 'contexts');
const LOCAL_CONTEXTS: Record<string, any> = {
  'https://www.w3.org/2018/credentials/v1': readJson(path.join(CONTEXTS_DIR, 'vc-v1.json')),
  'https://www.w3.org/ns/credentials/v2': readJson(path.join(CONTEXTS_DIR, 'vc-v2.json')),
  'https://w3id.org/vc/status-list/2021/v1': readJson(path.join(CONTEXTS_DIR, 'status-list-2021-v1.json')),
  'https://w3id.org/security/data-integrity/v2': readJson(path.join(CONTEXTS_DIR, 'data-integrity-v2.json')),
  'https://w3id.org/security/multikey/v1': readJson(path.join(CONTEXTS_DIR, 'multikey-v1.json'))
};

export function makeDocumentLoader(extraDocuments: Record<string, any> = {}) {
  return async (url: string) => {
    if (url in extraDocuments) {
      return { contextUrl: null, documentUrl: url, document: extraDocuments[url] };
    }

    if (url in LOCAL_CONTEXTS) {
      return { contextUrl: null, documentUrl: url, document: LOCAL_CONTEXTS[url] };
    }

    return baseDocumentLoader(url);
  };
}

export async function signAsDataIntegrity({
  unsignedDocument,
  privateKeyJwk,
  keyId,
  controller,
  documentLoader
}: {
  unsignedDocument: any;
  privateKeyJwk: JsonWebKey;
  keyId: string;
  controller: string;
  documentLoader: any;
}) {
  const jwk: JsonWebKey = {
    ...privateKeyJwk,
    alg: privateKeyJwk.alg ?? 'ES256',
    use: privateKeyJwk.use ?? 'sig',
    key_ops: privateKeyJwk.key_ops ?? ['sign'],
    kid: keyId
  };

  const keyPair = await EcdsaMultikey.fromJwk({
    jwk,
    secretKey: true,
    id: keyId,
    controller
  });

  const suite = new DataIntegrityProof({
    signer: keyPair.signer(),
    cryptosuite: ecdsaRdfc2019CryptoSuite
  });

  return jsigs.sign(unsignedDocument, {
    suite,
    purpose: new AssertionProofPurpose(),
    documentLoader
  });
}
