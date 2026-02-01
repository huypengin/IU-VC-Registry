// @ts-ignore
import jsigsImport from 'jsonld-signatures';
// @ts-ignore
import jsonld from 'jsonld';
// @ts-ignore
import { DataIntegrityProof } from '@digitalbazaar/data-integrity';
// @ts-ignore
import { cryptosuite as eddsaRdfc2022CryptoSuite } from '@digitalbazaar/eddsa-rdfc-2022-cryptosuite';
// @ts-ignore
import * as Ed25519Multikey from '@digitalbazaar/ed25519-multikey';

import fs from 'node:fs';
import path from 'node:path';

const jsigs: any = jsigsImport;
const { AssertionProofPurpose } = jsigs.purposes;

// Node-capable JSON-LD loader
const baseDocumentLoader = jsonld.documentLoaders.node();

// ESM-safe JSON file loader
function readJson(relPathFromProjectRoot: string) {
    const abs = path.resolve(relPathFromProjectRoot);
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

function getRegistryStaticRoot(): string {
    // Use the same env var as registry-server so local dev can point to `src/registry`
    // while production/default keeps using `public/`.
    const env = process.env.REGISTRY_STATIC_DIR?.trim();
    return env ? path.resolve(env) : path.resolve('public');
}

// Pin full context documents locally (NOT partial contexts)
const CONTEXTS_DIR = path.join(getRegistryStaticRoot(), 'contexts');
const LOCAL_CONTEXTS: Record<string, any> = {
    'https://www.w3.org/2018/credentials/v1': readJson(path.join(CONTEXTS_DIR, 'vc-v1.json')),
    'https://w3id.org/vc/status-list/2021/v1': readJson(path.join(CONTEXTS_DIR, 'status-list-2021-v1.json')),
    'https://w3id.org/security/data-integrity/v2': readJson(path.join(CONTEXTS_DIR, 'data-integrity-v2.json')),
    'https://w3id.org/security/multikey/v1': readJson(path.join(CONTEXTS_DIR, 'multikey-v1.json')),
};

export function makeDocumentLoader(extraDocuments: Record<string, any> = {}) {
    // This shape matches jsonld's documentLoader interface.
    return async (url: string) => {
        if (url in extraDocuments) {
            return { contextUrl: null, documentUrl: url, document: extraDocuments[url] };
        }

        if (url in LOCAL_CONTEXTS) {
            return { contextUrl: null, documentUrl: url, document: LOCAL_CONTEXTS[url] };
        }

        // fallback to network for anything else (or throw if you want strict)
        return baseDocumentLoader(url);
    };
}

export async function signAsDataIntegrity({
                                              unsignedDocument,
                                              keyPairJson,
                                              documentLoader
                                          }: {
    unsignedDocument: any;
    keyPairJson: any;
    documentLoader: any;
}) {
    const keyPair = await Ed25519Multikey.from(keyPairJson);

    const suite = new DataIntegrityProof({
        signer: keyPair.signer(),
        cryptosuite: eddsaRdfc2022CryptoSuite
    });

    return jsigs.sign(unsignedDocument, {
        suite,
        purpose: new AssertionProofPurpose(),
        documentLoader
    });
}
