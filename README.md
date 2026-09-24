# DID Web Creation System

> This project is based on [Original Repository](https://github.com/nathang0147/IU-VC-registry), which was developed as part of the original author's thesis.
> The work in this repository is independently developed as part of my own thesis, with modifications and extensions to the original work.

A complete TypeScript Node.js system for creating and serving W3C DID (Decentralized Identity) documents with ES256 / P-256 cryptography, HTTPS serving, and Docker deployment.

## 🏗️ Architecture Overview

This system implements three main components for DID creation:

### 1. 🔑 ES256 / P-256 Key Generation (`src/v1.0/crypto/`)
- Generate new P-256 keypairs
- Export public/private keys as JWK
- Encrypt private keys with AES-256-GCM + scrypt KDF
- Load/save keys from PEM files

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
- Generate ES256 / P-256 keys and DID documents
- Optional passphrase-based encryption
- Automatic injection into issuer DID documents

## 📁 Project Structure

```
├── src/
│   ├── app.ts                                  # Main application orchestrator
│   ├── v1.0/
│   │   ├── crypto/
│   │   │   ├── index.ts                        # Crypto module exports
│   │   │   ├── p256.ts                         # P-256 key generation
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
├── keys/                                        # Key material (gitignored)
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

### Quick Start with Docker & ngrok

Deploy your DID documents as a static web server and expose them with a real domain:

```powershell
# 1. One-command start (validates, builds, and starts Docker)
npm run docker:start

# 2. In another terminal, test the deployment
npm run docker:test

# 3. (Optional) Expose with ngrok for a real public domain
#    First install ngrok: choco install ngrok
#    Then authenticate: ngrok config add-authtoken YOUR_TOKEN
#    Finally start tunnel:
ngrok http 8080
```

Your DID documents will be accessible at:
- **Local**: `http://localhost:8080/issuers/principle/did.json`
- **Public** (with ngrok): `https://abc123.ngrok-free.app/issuers/principle/did.json`
- **DID Identifier**: `did:web:abc123.ngrok-free.app:issuers:principle`

📖 **[Full Docker Deployment Guide](.github/docs/docker-deployment-guide.md)**
📖 **[ngrok Setup Guide](.github/docs/ngrok-setup-guide.md)**

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
# One-command start (validate + build + docker up)
npm run docker:start

# Test the deployment endpoints
npm run docker:test

# Or run steps manually:
# Build Docker image
npm run docker:build

# Build and start with Docker Compose (foreground with logs)
npm run docker:up

# Build and start in background (detached mode)
npm run docker:up:detached

# View logs (when running in detached mode)
npm run docker:logs

# Stop Docker services
npm run docker:down
```

#### Cross-Repo Sync
```bash
# Check whether IU-cert-university's mirrored registry contract is out of sync
npm run sync:iu-cert-university

# Copy the canonical registry contract files into IU-cert-university
npm run sync:iu-cert-university -- --write

# Invoke Codex CLI in IU-cert-university to adapt local schemas/examples/tests/docs
npm run sync:iu-cert-university:adapt
```

The sync command mirrors only the canonical registry contract files into
`../IU-cert-university/src/schemas/registry-mirror/`. The follow-up Codex command
is for downstream adaptation inside `IU-cert-university`; it does not replace the
deterministic file sync.

#### Typical workflow:
```bash
# 1. Validate all contexts, schemas, DID docs
npm run registry:validate

# 2. Build the public/ folder
npm run registry:build

# 3. Build & run Docker (serving public/)
npm run docker:up

# 4. (In another terminal) Expose with ngrok
ngrok http 8080
```

#### Registry Contract Change Workflow:
```bash
# 1. Update the canonical registry contract in this repo
npm test
npm run build

# 2. Mirror the changed contract files into IU-cert-university
npm run sync:iu-cert-university -- --write

# 3. Let Codex adapt downstream copies in IU-cert-university
npm run sync:iu-cert-university:adapt
```

📖 **[Full Docker Deployment & ngrok Guide](.github/docs/docker-deployment-guide.md)**

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

- **ES256 / P-256 Cryptography**: Broad wallet compatibility with EC JWKs
- **AES-256-GCM Encryption**: Secure private key encryption with authenticated encryption
- **Scrypt KDF**: Password-based key derivation with configurable cost
- **HTTPS/TLS**: Encrypted communication
- **Docker Security**: Containerized execution with non-root user
- **Private Key Protection**: Keys are gitignored and optionally encrypted
- **Environment Variables**: Sensitive config via environment
- **Repository Hygiene**: Raw (`es256.keys.json`) and encrypted (`es256.encrypted.json`) key bundles are ignored via `.gitignore`. If you need to publish an example, rename it to `es256.keys.example.json` and strip the private key.

## 📖 Documentation

- **[Getting Started - Complete Tutorial](.github/docs/getting-started.md)** - Step-by-step guide for first-time users
- **[Quick Reference Card](.github/docs/quick-reference.md)** - One-page command reference
- **[Key Generator Guide](.github/docs/key-generator-guide.md)** - Complete guide for generating keys and DID documents
- **[Docker Deployment Guide](.github/docs/docker-deployment-guide.md)** - Complete guide for Docker deployment and ngrok setup
- **[ngrok Setup Guide](.github/docs/ngrok-setup-guide.md)** - Quick guide for exposing your server with ngrok
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
| `--did-domain <domain>` | DID domain or full identifier | `infra-vc-registry-web-911368042037.asia-east2.run.app:issuers:principle` |
| `--output <dir>` | Output directory for artifacts | `./src/registry/issuers/{issuer}` |
| `--issuer <name>` | Issuer folder name | `principle` |
| `--passphrase <pass>` | Passphrase for encryption | Environment variable |
| `--encrypted` | Enable key encryption | `false` |

### Output Files

**Unencrypted:**
- `did.json` - W3C compliant DID document
- `es256.keys.json` - Raw ES256 key material (JWK)

**Encrypted:**
- `did.json` - W3C compliant DID document
- `es256.encrypted.json` - Encrypted ES256 key bundle with scrypt parameters

### Example Output

```json
{
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://w3id.org/security/suites/jws-2020/v1"
  ],
  "id": "did:web:vc.example.vn:iu",
  "verificationMethod": [{
    "id": "did:web:vc.example.vn:iu#key-1",
    "type": "JsonWebKey2020",
    "controller": "did:web:vc.example.vn:iu",
    "publicKeyJwk": {
      "kty": "EC",
      "crv": "P-256",
      "x": "...",
      "y": "...",
      "alg": "ES256",
      "kid": "did:web:vc.example.vn:iu#key-1"
    }
  }],
  "assertionMethod": ["did:web:vc.example.vn:iu#key-1"]
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
node --loader ts-node/esm tools/registry-cli.ts generate --issuer principle --did-domain vc.example.vn

# Skip the build-to-public step if you only want to create files under src/
node --loader ts-node/esm tools/registry-cli.ts generate --issuer principle --no-build
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
- Generated private key files (e.g. `es256.keys.json`, `es256.encrypted.json`) are explicitly ignored in `.gitignore`. Never commit them.
- When running inside Docker build (the provided `infra/Dockerfile.nginx`), the builder stage uses `node --loader ts-node/esm` so TS entrypoints run correctly.

If you want a short alias, you can add a script to `package.json`:

```json
"scripts": {
  "vc:generate": "node --loader ts-node/esm tools/registry-cli.ts generate"
}
```
