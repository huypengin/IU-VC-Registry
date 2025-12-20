// @ts-ignore
import jsigs, { DocumentLoader } from 'jsonld-signatures';
// @ts-ignore
import { DataIntegrityProof } from '@digitalbazaar/data-integrity';
// @ts-ignore
import { cryptosuite as eddsaRdfc2022CryptoSuite } from '@digitalbazaar/eddsa-rdfc-2022-cryptosuite';
// @ts-ignore
import * as Ed25519Multikey from '@digitalbazaar/ed25519-multikey';

const { purposes: { AssertionProofPurpose } } = jsigs;

interface DocumentLoaderOptions {
  extraDocuments?: Record<string, any>;
}

export function makeDocumentLoader({ extraDocuments = {} }: DocumentLoaderOptions = {}): DocumentLoader {
  return jsigs.extendContextLoader(async (url: string) => {
    if (url in extraDocuments) {
      return {
        contextUrl: null,
        documentUrl: url,
        document: extraDocuments[url]
      };
    }

    return jsigs.documentLoaders.node()(url);
  });
}

interface SignOptions {
  unsignedDocument: any;
  keyPairJson: any;
  documentLoader: DocumentLoader;
}

export async function signAsDataIntegrity({
  unsignedDocument,
  keyPairJson,
  documentLoader
}: SignOptions): Promise<any> {
  const keyPair = await Ed25519Multikey.from(keyPairJson);

  const suite = new DataIntegrityProof({
    signer: keyPair.signer(),
    cryptosuite: eddsaRdfc2022CryptoSuite
  });

  return await jsigs.sign(unsignedDocument, {
    suite,
    purpose: new AssertionProofPurpose(),
    documentLoader
  });
}
