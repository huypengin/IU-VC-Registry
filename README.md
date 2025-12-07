# DID Web Creation System

A complete TypeScript Node.js system for creating and serving W3C DID (Decentralized Identity) documents with Ed25519 cryptography, HTTPS serving, and Docker deployment.

## 🏗️ Architecture Overview

This system implements three main components for DID creation:

### 1. 🔑 Ed25519 Key Generation (`src/v1.0/crypto/`)
- Generate new Ed25519 keypairs
- Encrypt private keys with AES-256-GCM + scrypt KDF
- Load/save keys from PEM files
- Convert public keys to multibase format

### 2. 📄 DID Document Builder (`src/v1.0/did/`)
- Create W3C compliant DID documents
- Support for verification methods
- JSON serialization and validation
- Configurable DID domains

### 3. 🌐 HTTPS Server (`src/v1.0/server/`)
- Express.js HTTPS server
- Docker containerization
- Ngrok tunneling for public access

### 4. 🔧 Key Generator CLI (`src/registry/issuers/helper/`)
- Generate Ed25519 keys and DID documents
- Optional passphrase-based encryption
- Automatic injection into issuer DID documents

## 📁 Project Structure

```
├── src/
│   ├── app.ts                                  # Main application orchestrator
│   ├── v1.0/
│   │   ├── crypto/
│   │   │   ├── index.ts                        # Crypto module exports
│   │   │   ├── ed25519.ts                      # Ed25519 key generation
│   │   │   ├── convert-key.ts                  # Key format conversion
│   │   │   └── key-manager.ts                  # Key encryption/decryption
│   │   ├── did/
│   │   │   ├── index.ts                        # DID module exports
│   │   │   └── builder.ts                      # DID document creation
│   │   ├── server/
│   │   │   ├── index.ts                        # Server module exports
│   │   │   └── https-server.ts                 # HTTPS server with SSL/TLS
│   │   └── types/
│   │       ├── multiformats.d.ts               # External type declarations
│   │       └── did.ts                          # DID document types
│   └── registry/
│       └── issuers/
│           └── helper/
│               └── keyGenerator.ts              # CLI for key generation
├── tests/
│   └── crypto/
│       └── key-manager.spec.ts                  # Key encryption tests
├── .github/
│   └── docs/
│       └── key-generator-guide.md               # Key generator documentation
├── docker/
│   ├── Dockerfile                               # Container configuration
│   └── docker-compose.yml                       # Multi-service orchestration
├── certs/                                       # SSL certificates (gitignored)
├── keys/                                        # Ed25519 keys (gitignored)
├── data/                                        # Application data (gitignored)
├── dist/                                        # Compiled JavaScript
├── index.ts                                     # Application entry point
├── .env.example                                 # Environment configuration template
└── README.md                                    # This file
```

## 🚀 Quick Start

### Generate Keys and DID Document

The fastest way to get started is to generate keys and a DID document:

```powershell
# Install dependencies
npm install

# Generate keys for default issuer (iu)
npm run generate:issuer

# Generate with custom domain
npm run generate:issuer -- --did-domain "vc.example.vn:iu"

# Generate with encrypted keys
npm run generate:issuer -- --encrypted --passphrase "your-secure-passphrase"
```

📖 **[Full Key Generator Guide](.github/docs/key-generator-guide.md)**

### Available Commands

#### Development
```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build TypeScript
npm run build

# Run production build
npm start

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

#### Key Generation
```bash
# Generate issuer keys and DID document
npm run generate:issuer

# Generate with custom options
npm run generate:issuer -- --did-domain "example.com" --issuer "university-a" --encrypted --passphrase "pass"
```

#### Docker Deployment
```bash
# Build Docker image
npm run docker:build

# Start with Docker Compose
npm run docker:run

# Stop Docker services
npm run docker:stop
```

#### Typical workflow:
```bash
# 1. Validate all contexts, schemas, DID docs
npm run registry:validate
# or
yarn registry:validate

# 2. Build the public/ folder
npm run registry:build
# or
yarn registry:build

# 3. Build & run Docker (serving public/)
docker compose -f infra/docker-compose.yml up --build

# 4. Expose with ngrok
ngrok http 8080
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

# Key encryption (optional)
KEY_ENCRYPTION_PASSPHRASE=your-secure-passphrase
```

## 🔐 Security Features

- **Ed25519 Cryptography**: Modern elliptic curve signatures
- **AES-256-GCM Encryption**: Secure private key encryption with authenticated encryption
- **Scrypt KDF**: Password-based key derivation with configurable cost
- **HTTPS/TLS**: Encrypted communication
- **Docker Security**: Containerized execution with non-root user
- **Private Key Protection**: Keys are gitignored and optionally encrypted
- **Environment Variables**: Sensitive config via environment
- **Repository Hygiene**: Raw (`ed25519.keys.json`) and encrypted (`ed25519.encrypted.json`) key bundles are ignored via `.gitignore`. If you need to publish an example, rename it to `ed25519.keys.example.json` and strip the private key.

## 📖 Documentation

- **[Key Generator Guide](.github/docs/key-generator-guide.md)** - Complete guide for generating keys and DID documents
- **[Coding Convention](.github/docs/coding-convention.md)** - Project coding standards
- **[Testing Convention](.github/docs/testing-convention.md)** - Testing guidelines

## 🧪 Testing

The project uses Vitest for testing:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

Current test coverage:
- ✅ Key encryption/decryption with AES-256-GCM
- ✅ Scrypt parameter validation
- ✅ Passphrase verification

## 📋 Key Generator CLI

### Basic Usage

```powershell
# Generate unencrypted keys
npm run generate:issuer

# Generate encrypted keys
npm run generate:issuer -- --encrypted --passphrase "secure-pass"

# Custom domain and issuer
npm run generate:issuer -- --did-domain "university.edu:dept" --issuer "dept-cs"
```

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--did-domain <domain>` | DID domain or full identifier | `helena-unda-bounceably.ngrok-free.dev:issuers:principle` |
| `--output <dir>` | Output directory for artifacts | `./src/registry/issuers/{issuer}` |
| `--issuer <name>` | Issuer folder name | `iu` |
| `--passphrase <pass>` | Passphrase for encryption | Environment variable |
| `--encrypted` | Enable key encryption | `false` |

### Output Files

**Unencrypted:**
- `did.json` - W3C compliant DID document
- `ed25519.keys.json` - Raw key material (base64-encoded)

**Encrypted:**
- `did.json` - W3C compliant DID document
- `ed25519.encrypted.json` - Encrypted key bundle with scrypt parameters

### Example Output

```json
{
  "@context": ["https://www.w3.org/ns/did/v1"],
  "id": "did:web:vc.example.vn:iu",
  "verificationMethod": [{
    "id": "did:web:vc.example.vn:iu:z6Mk...",
    "type": "Ed25519VerificationKey2020",
    "controller": "did:web:vc.example.vn:iu",
    "publicKeyMultibase": "z6Mk..."
  }],
  "assertionMethod": ["did:web:vc.example.vn:iu:z6Mk..."]
}
```

📖 **See [Key Generator Guide](.github/docs/key-generator-guide.md) for detailed examples and troubleshooting**

## How to use `vc-registry generate`

This project provides a small CLI to validate the registry, generate key material for an issuer, inject the resulting DID document and keys into the registry source tree, and copy the registry into `public/` so it can be served as static files.

There are two convenient ways to run the command:

1) Using the project CLI directly (recommended for development):

```powershell
# Validate registry files
node --loader ts-node/esm tools/registry-cli.ts validate

# Generate keys for an issuer (writes into src/registry/issuers/<issuer> and then copies to public/)
node --loader ts-node/esm tools/registry-cli.ts generate --issuer iu --did-domain vc.example.vn

# Skip the build-to-public step if you only want to create files under src/
node --loader ts-node/esm tools/registry-cli.ts generate --issuer iu --no-build
```

2) Via npm scripts (shortcut wrappers defined in package.json):

```powershell
# Validate
npm run registry:validate

# Build (copy src/registry -> public)
npm run registry:build
```

Notes
- The `generate` command will by default run the `build` step after generation to update `public/`. Use `--no-build` to skip copying to `public/`.
- Generated private key files (e.g. `ed25519.keys.json`, `ed25519.encrypted.json`) are explicitly ignored in `.gitignore`. Never commit them.
- When running inside Docker build (the provided `infra/Dockerfile.nginx`), the builder stage uses `node --loader ts-node/esm` so TS entrypoints run correctly.

If you want a short alias, you can add a script to `package.json`:

```json
"scripts": {
  "vc:generate": "node --loader ts-node/esm tools/registry-cli.ts generate"
}
```
