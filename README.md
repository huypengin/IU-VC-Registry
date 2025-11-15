# DID Web Creation System

A complete TypeScript Node.js system for creating and serving W3C DID (Decentralized Identity) documents with Ed25519 cryptography, HTTPS serving, and Docker deployment.

## 🏗️ Architecture Overview

This system implements three main components for DID creation:

### 1. 🔑 Ed25519 Key Generation (`src/crypto/`)
- Generate new Ed25519 keypairs
- Load/save keys from PEM files
- Convert public keys to multibase format

### 2. 📄 DID Document Builder (`src/did/`)
- Create W3C compliant DID documents
- Support for verification methods
- JSON serialization and validation

### 3. 🌐 HTTPS Server (`src/server/`)
- Express.js HTTPS server
- Docker containerization
- Ngrok tunneling for public access

## 📁 Project Structure

```
├── src/
│   ├── app.ts                    # Main application orchestrator
│   ├── crypto/
│   │   ├── index.ts              # Crypto module exports
│   │   ├── ed25519.ts            # Ed25519 key generation
│   │   └── convert-key.ts        # Key format conversion
│   ├── did/
│   │   ├── index.ts              # DID module exports
│   │   └── builder.ts            # DID document creation
│   ├── server/
│   │   ├── index.ts              # Server module exports
│   │   └── https-server.ts       # HTTPS server with SSL/TLS
│   └── types/
│       ├── multiformats.d.ts     # External type declarations
│       └── did.ts                # DID document types
├── docker/
│   ├── Dockerfile                # Container configuration
│   └── docker-compose.yml        # Multi-service orchestration
├── certs/                        # SSL certificates (gitignored)
├── keys/                         # Ed25519 keys (gitignored)
├── data/                         # Application data (gitignored)
├── dist/                         # Compiled JavaScript
├── index.ts                      # Application entry point
├── .env.example                  # Environment configuration template
└── README.md                     # This file
```

## 🚀 Available Commands

### Development
```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build TypeScript
npm run build

# Run production build
npm start
```

### Docker Deployment
```bash
# Build Docker image
npm run docker:build

# Start with Docker Compose
npm run docker:run

# Stop Docker services
npm run docker:stop
```

## ⚙️ Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Server settings
NODE_ENV=development
PORT=3000
HTTPS_PORT=3443

# SSL/TLS certificates
SSL_CERT_PATH=./certs/server.crt
SSL_KEY_PATH=./certs/server.key

# Ngrok public access
ENABLE_NGROK=true
NGROK_AUTHTOKEN=your_token_here

# DID configuration
DID_METHOD=web
DID_DOMAIN=your-domain.com
```

## 🔐 Security Features

- **Ed25519 Cryptography**: Modern elliptic curve signatures
- **HTTPS/TLS**: Encrypted communication
- **Docker Security**: Containerized execution with non-root user
- **Private Key Protection**: Keys are gitignored and containerized
- **Environment Variables**: Sensitive config via environment

## 📋 Implementation Checklist

### Phase 1: Crypto Module
- [ ] Implement Ed25519 key generation
- [ ] Add PEM file loading/saving
- [ ] Test multibase conversion

### Phase 2: DID Document
- [ ] Build DID document structure
- [ ] Add verification methods
- [ ] Implement validation

### Phase 3: HTTPS Server
- [ ] Setup Express.js with HTTPS
- [ ] Configure SSL certificates
- [ ] Integrate Ngrok tunneling
- [ ] Add Docker support

## 🛠️ Technology Stack

- **Runtime**: Node.js v20+ with TypeScript
- **Crypto**: Ed25519 (via Node.js crypto module)
- **Server**: Express.js with HTTPS
- **Containerization**: Docker + Docker Compose
- **Public Access**: Ngrok tunneling
- **Standards**: W3C DID Core specification

## 📄 DID Document Format

The system creates DID documents following W3C standards:

```json
{
  "@context": "https://www.w3.org/ns/did/v1",
  "id": "did:web:domain.com",
  "verificationMethod": [{
    "id": "did:web:domain.com#key-1",
    "type": "Ed25519VerificationKey2020",
    "controller": "did:web:domain.com",
    "publicKeyMultibase": "z6Mk..."
  }],
  "authentication": ["#key-1"]
}
```

Your DID creation system is now fully structured and ready for implementation!
