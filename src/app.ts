/**
 * Main DID Creation Application
 * Orchestrates the three main components:
 * 1. ES256 / P-256 key generation
 * 2. DID document creation  
 * 3. Local HTTPS server
 */

// Load environment variables from .env file (ES module compatible)
import 'dotenv/config';

import { generateP256KeyPair } from './v1.0/crypto/index.js';
import { buildDIDDocument, serializeDIDDocument } from './v1.0/did/index.js';
import { startHTTPSServer } from './v1.0/server/index.js';
import type { ServerConfig } from './v1.0/types/did.js';

/**
 * Main DID creation workflow
 */
export async function createDID(): Promise<void> {
  console.log('🔑 Step 1: Generating ES256 / P-256 keypair...');
  
  const keyPair = generateP256KeyPair();
  
  console.log('✅ Generated ES256 / P-256 keypair');
  console.log('📋 Public Key JWK:', JSON.stringify(keyPair.publicKeyJwk, null, 2));
  
  console.log('\n📄 Step 2: Building DID document...');
  
  // Build DID document for local serving
  const didDocument = buildDIDDocument(keyPair.publicKeyJwk);
  const didJson = serializeDIDDocument(didDocument);
  
  console.log('✅ Generated DID document');
  console.log('🌐 DID ID:', didDocument.id);
  console.log('\n📄 DID Document JSON:');
  console.log(didJson);
  
  console.log('\n🌐 Step 3: Starting local HTTPS server...');
  
  // Configure server for local use only
  const serverConfig: ServerConfig = {
    port: 3000,
    httpsPort: 3443,
    host: 'localhost',
    certPath: './certs/server.crt',
    keyPath: './certs/server.key',
    enableNgrok: false,
    ngrokAuthToken: undefined
  };
  
  // Start HTTPS server
  await startHTTPSServer(serverConfig, didDocument);
  
  console.log('\n✅ Local DID Web Service is running!');
  console.log('\n🔧 Local Access URLs:');
  console.log(`📄 HTTPS: https://localhost:${serverConfig.httpsPort}/issuers/principle/did.json`);
  console.log(`🌐 HTTP: http://localhost:${serverConfig.port}/issuers/principle/did.json`);
  console.log(`🔍 Health: https://localhost:${serverConfig.httpsPort}/health`);
  
  // Keep the process running
  console.log('\n🔄 Server is running locally. Press Ctrl+C to stop.');
}

/**
 * Application entry point
 */
async function main(): Promise<void> {
  try {
    console.log('🚀 Starting DID Web Service...');
    await createDID();
    console.log('✅ DID Web Service is running!');
  } catch (error) {
    console.error('❌ Failed to start DID service:', error);
    process.exit(1);
  }
}

// Run the application
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
