#!/usr/bin/env node

import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { Command } from 'commander';
import { buildDIDDocument, serializeDIDDocument } from '../../../v1.0/did/index.js';
import {
  assignKeyId,
  encryptPrivateKeyJwk,
  generateP256KeyPair
} from '../../../v1.0/crypto/index.js';

interface GenerateCommandOptions {
  didDomain?: string;
  output?: string;
  issuer?: string;
  passphrase?: string;
  encrypted?: boolean;
}

const program = new Command();
program
  .name('key-generator')
  .description('Generate ES256 / P-256 key material and inject it into issuer DID documents');

program
  .command('generate')
  .description('Create a DID document and key bundle for an issuer')
  .option('--did-domain <domain>', 'DID domain or full DID identifier to use in the document')
  .option('--output <dir>', 'Directory to write output artifacts', 'default')
  .option('--issuer <name>', 'Issuer folder name under src/registry/issuers', 'principle')
  .option('--passphrase <pass>', 'Passphrase to encrypt the private key bundle')
  .option('--encrypted', 'Encrypt the private key bundle with the provided passphrase')
  .action(async (options: GenerateCommandOptions) => {
    try {
      await handleGenerateCommand(options);
    } catch (error) {
      console.error('Failed to generate DID assets:', error);
      process.exitCode = 1;
    }
  });

async function handleGenerateCommand(options: GenerateCommandOptions): Promise<void> {
  const issuerName = options.issuer ?? 'principle';
  const resolvedOutput = options.output === 'default' ? undefined : options.output;
  const issuerDir = resolve(
    process.cwd(),
    resolvedOutput ?? `./src/registry/issuers/${issuerName}`
  );
  if (!existsSync(issuerDir)) {
    mkdirSync(issuerDir, { recursive: true });
  }

  const passphrase = options.passphrase ?? process.env.KEY_ENCRYPTION_PASSPHRASE;
  if (options.encrypted && !passphrase) {
    throw new Error('Passphrase is required when --encrypted is set. Provide --passphrase or KEY_ENCRYPTION_PASSPHRASE.');
  }

  const initialKeyPair = generateP256KeyPair();

  const didDocument = buildDIDDocument(initialKeyPair.publicKeyJwk, options.didDomain);
  const keyId = didDocument.verificationMethod?.[0]?.id;
  if (!keyId) {
    throw new Error('Generated DID document is missing a verification method id.');
  }
  const keyPair = assignKeyId(initialKeyPair, keyId);
  const didPath = resolve(issuerDir, 'did.json');
  writeFileSync(didPath, serializeDIDDocument(didDocument));

  const keyBundlePath = resolve(issuerDir, options.encrypted ? 'es256.encrypted.json' : 'es256.keys.json');
  const keyPayload = options.encrypted
    ? {
        algorithm: 'ES256',
        curve: 'P-256',
        keyPair: {
          publicKeyJwk: keyPair.publicKeyJwk
        },
        encryptedPrivateKey: encryptPrivateKeyJwk(keyPair.privateKeyJwk, {
          passphrase: passphrase as string
        })
      }
    : {
        algorithm: 'ES256',
        curve: 'P-256',
        publicKeyJwk: keyPair.publicKeyJwk,
        privateKeyJwk: keyPair.privateKeyJwk
      };

  writeFileSync(keyBundlePath, JSON.stringify(keyPayload, null, 2));

  console.log('✅ DID document written to', didPath);
  console.log('🔐 Key material written to', keyBundlePath);
}

if (import.meta.url.startsWith('file:')) {
  const modulePath = fileURLToPath(import.meta.url);
  const scriptPath = process.argv[1];
  if (modulePath === scriptPath) {
    program.parse(process.argv);
  }
}
