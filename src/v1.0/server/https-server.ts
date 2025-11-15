/**
 * HTTPS Server Module
 * Serves DID documents over HTTPS with SSL/TLS support (local only)
 */

import express from 'express';
import https from 'https';
import cors from 'cors';
import helmet from 'helmet';
import { readFileSync } from 'fs';
import { DIDDocument, ServerConfig } from '../types/did';

/**
 * Start HTTPS server to serve DID documents
 */
export async function startHTTPSServer(config: ServerConfig, didDocument: DIDDocument): Promise<void> {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  // Serve DID document at the standard path
  app.get('/.well-known/did.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(didDocument);
  });

  // Serve DID document at custom path (for iu.schema)
  app.get('/issuers/principle/did.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(didDocument);
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json(healthCheck());
  });

  // Root endpoint with info
  app.get('/', (req, res) => {
    res.json({
      message: 'DID Web Service',
      did: didDocument.id,
      endpoints: {
        did_document: '/.well-known/did.json',
        custom_path: '/issuers/principle/did.json',
        health: '/health'
      }
    });
  });

  // Start HTTPS server
  if (config.certPath && config.keyPath) {
    const httpsOptions = {
      key: readFileSync(config.keyPath),
      cert: readFileSync(config.certPath)
    };

    https.createServer(httpsOptions, app).listen(config.httpsPort, () => {
      console.log(`🔒 HTTPS Server running on https://localhost:${config.httpsPort}`);
      console.log(`📄 DID Document available at: https://localhost:${config.httpsPort}/.well-known/did.json`);
      console.log(`🎯 Custom path: https://localhost:${config.httpsPort}/issuers/principle/did.json`);
    });
  }

  // Also start HTTP server for development
  app.listen(config.port, () => {
    console.log(`🌐 HTTP Server running on http://localhost:${config.port}`);
  });
}

/**
 * Setup SSL/TLS certificates for HTTPS
 */
export function setupSSLCertificates(certPath: string, keyPath: string): void {
  try {
    readFileSync(certPath);
    readFileSync(keyPath);
    console.log('✅ SSL certificates found and validated');
  } catch (error) {
    throw new Error(`SSL certificate setup failed: ${error}`);
  }
}

/**
 * Health check endpoint handler
 */
export function healthCheck(): { status: string; timestamp: string } {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString()
  };
}
