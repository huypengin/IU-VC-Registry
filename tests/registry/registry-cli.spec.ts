/**
 * Tests for tools/registry-cli.ts
 * Validates that the CLI can generate keys, validate registry, and build public/
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SAMPLE_IUSMARTCERT_VC } from '../../src/examples/iu-smartcert-v1.sample.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');
const TMP_TEST_DIR = path.join(ROOT, 'tmp', 'test-registry-cli');
const DEGREE_SCHEMA_PATH = path.join(
  ROOT,
  'src',
  'registry',
  'credentialSchema',
  'iu-edu-degree-v1.schema.json'
);
const DEGREE_CONTEXT_PATH = path.join(
  ROOT,
  'src',
  'registry',
  'contexts',
  'iu-edu-degree-v1.jsonld'
);
const PUBLIC_DEGREE_CONTEXT_PATH = path.join(
  ROOT,
  'public',
  'contexts',
  'iu-edu-degree-v1.jsonld'
);
const CREDENTIAL_ISSUANCE_EXAMPLE_PATH = path.join(
  ROOT,
  'src',
  'examples',
  'credential-issuance-example.ts'
);

// Helper to run CLI commands
function runCli(command: string): { stdout: string; stderr: string; status: number } {
  const cliPath = path.join(ROOT, 'tools', 'registry-cli.ts');
  const fullCommand = `node --loader ts-node/esm "${cliPath}" ${command}`;
  
  try {
    const stdout = execSync(fullCommand, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0' }
    });
    return { stdout, stderr: '', status: 0 };
  } catch (error: any) {
    // execSync throws when exit code is non-zero
    return {
      stdout: error.stdout?.toString() || '',
      stderr: error.stderr?.toString() || error.message || '',
      status: error.status ?? 1
    };
  }
}

function readDegreeSchema() {
  return JSON.parse(fs.readFileSync(DEGREE_SCHEMA_PATH, 'utf8'));
}

function readJsonFile(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

describe('Registry CLI', () => {
  beforeEach(() => {
    // Create temp directory for test outputs
    if (!fs.existsSync(TMP_TEST_DIR)) {
      fs.mkdirSync(TMP_TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Cleanup temp directory
    if (fs.existsSync(TMP_TEST_DIR)) {
      fs.rmSync(TMP_TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('validate command', () => {
    it('should validate registry JSON files without errors', () => {
      const result = runCli('validate');
      
      // Check that validation succeeded (exit code 0 or output contains success markers)
      const hasSuccess = result.status === 0 || result.stdout.includes('✅');
      expect(hasSuccess).toBe(true);
      expect(result.stdout).toContain('syntactically valid');
    });

    it('should check DID documents have did:web: ids', () => {
      const result = runCli('validate');
      
      const hasSuccess = result.status === 0 || result.stdout.includes('✅');
      expect(hasSuccess).toBe(true);
      expect(result.stdout).toContain('DID documents have did:web: ids');
    });

    it('should require the canonical degree credential type set in the schema', () => {
      const schema = readDegreeSchema();
      const typeProperty = schema.properties.type;

      expect(typeProperty.type).toBe('array');
      expect(typeProperty.minItems).toBe(4);
      expect(typeProperty.allOf).toEqual(
        expect.arrayContaining([
          { contains: { const: 'VerifiableCredential' } },
          { contains: { const: 'UniversityDegree' } },
          { contains: { const: 'EducationalOccupationalCredential' } },
          { contains: { const: 'VNEduDegreeCredential' } }
        ])
      );
    });

    it('should publish degree context terms for semantic and interoperability types', () => {
      const srcContext = readJsonFile(DEGREE_CONTEXT_PATH);
      const publicContext = readJsonFile(PUBLIC_DEGREE_CONTEXT_PATH);

      expect(srcContext).toEqual(publicContext);
      expect(srcContext['@context'].EducationalOccupationalCredential).toBe(
        'schema:EducationalOccupationalCredential'
      );
      expect(srcContext['@context'].UniversityDegree).toBe('vnEdu:UniversityDegree');
      expect(srcContext['@context'].VNEduDegreeCredential).toBe('vnEdu:VNEduDegreeCredential');
    });

    it('should keep SmartCert examples aligned with the canonical degree type set', () => {
      expect(SAMPLE_IUSMARTCERT_VC.type).toEqual(
        expect.arrayContaining([
          'VerifiableCredential',
          'UniversityDegree',
          'EducationalOccupationalCredential',
          'VNEduDegreeCredential',
          'IUSmartCertCredential'
        ])
      );

      const credentialIssuanceExample = fs.readFileSync(CREDENTIAL_ISSUANCE_EXAMPLE_PATH, 'utf8');
      expect(credentialIssuanceExample).not.toContain('IUEducationDegreeCredential');
      expect(credentialIssuanceExample).toContain('UniversityDegree');
      expect(credentialIssuanceExample).toContain('EducationalOccupationalCredential');
      expect(credentialIssuanceExample).toContain('VNEduDegreeCredential');
    });
  });

  describe('build command', () => {
    it('should copy src/registry to public/', () => {
      const publicDir = path.join(ROOT, 'public');
      
      // Clean public if exists
      if (fs.existsSync(publicDir)) {
        fs.rmSync(publicDir, { recursive: true, force: true });
      }

      const result = runCli('build');
      
      const hasSuccess = result.status === 0 || result.stdout.includes('✅');
      expect(hasSuccess).toBe(true);
      expect(result.stdout).toContain('Build complete');
      expect(fs.existsSync(publicDir)).toBe(true);
      
      // Verify some expected files were copied
      expect(fs.existsSync(path.join(publicDir, 'issuers'))).toBe(true);
      expect(fs.existsSync(path.join(publicDir, 'contexts'))).toBe(true);
    });
  });

  describe('generate command', () => {
    it('should generate keys and DID document for an issuer', { timeout: 15000 }, () => {
      const testIssuerDir = path.join(TMP_TEST_DIR, 'test-issuer-001');
      
      const result = runCli(
        `generate --issuer test-issuer-001 --did-domain vc.test.local --output "${testIssuerDir}" --no-build`
      );
      
      const hasSuccess = result.status === 0 || result.stdout.includes('✅ Generate complete');
      expect(hasSuccess).toBe(true);
      
      // Verify files were created
      const didPath = path.join(testIssuerDir, 'did.json');
      const keysPath = path.join(testIssuerDir, 'es256.keys.json');
      
      expect(fs.existsSync(didPath)).toBe(true);
      expect(fs.existsSync(keysPath)).toBe(true);
      
      // Verify DID document structure
      const didDoc = JSON.parse(fs.readFileSync(didPath, 'utf8'));
      expect(didDoc.id).toMatch(/^did:web:/);
      expect(didDoc.verificationMethod).toBeDefined();
      expect(Array.isArray(didDoc.verificationMethod)).toBe(true);
      expect(didDoc.verificationMethod.length).toBeGreaterThan(0);
      expect(didDoc.verificationMethod[0].type).toBe('JsonWebKey2020');
      expect(didDoc.verificationMethod[0].publicKeyJwk.kty).toBe('EC');
      expect(didDoc.verificationMethod[0].publicKeyJwk.crv).toBe('P-256');
      expect(didDoc.verificationMethod[0].publicKeyJwk.alg).toBe('ES256');
      expect(didDoc.verificationMethod[0].publicKeyMultibase).toBeUndefined();
      expect(didDoc.assertionMethod).toEqual([`${didDoc.id}#key-1`]);
      
      // Verify keys file structure
      const keys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
      expect(keys.algorithm).toBe('ES256');
      expect(keys.curve).toBe('P-256');
      expect(keys.publicKeyJwk.kty).toBe('EC');
      expect(keys.publicKeyJwk.crv).toBe('P-256');
      expect(keys.publicKeyJwk.alg).toBe('ES256');
      expect(keys.privateKeyJwk.kty).toBe('EC');
      expect(keys.privateKeyJwk.crv).toBe('P-256');
      expect(keys.privateKeyJwk.alg).toBe('ES256');
    });

    it('should generate encrypted keys when --encrypted flag is used', { timeout: 15000 }, () => {
      const testIssuerDir = path.join(TMP_TEST_DIR, 'test-issuer-encrypted');
      
      const result = runCli(
        `generate --issuer test-issuer-encrypted --did-domain vc.test.local --output "${testIssuerDir}" --encrypted --passphrase "test-passphrase-123" --no-build`
      );
      
      const hasSuccess = result.status === 0 || result.stdout.includes('✅');
      expect(hasSuccess).toBe(true);
      
      // Verify encrypted key file was created
      const encryptedKeysPath = path.join(testIssuerDir, 'es256.encrypted.json');
      expect(fs.existsSync(encryptedKeysPath)).toBe(true);
      
      // Verify encrypted bundle structure
      const encryptedBundle = JSON.parse(fs.readFileSync(encryptedKeysPath, 'utf8'));
      expect(encryptedBundle.algorithm).toBe('ES256');
      expect(encryptedBundle.curve).toBe('P-256');
      expect(encryptedBundle.keyPair).toBeDefined();
      expect(encryptedBundle.keyPair.publicKeyJwk.kty).toBe('EC');
      expect(encryptedBundle.keyPair.publicKeyJwk.crv).toBe('P-256');
      expect(encryptedBundle.keyPair.publicKeyJwk.alg).toBe('ES256');
      expect(encryptedBundle.encryptedPrivateKey).toBeDefined();
      
      // Check encrypted private key structure
      const epk = encryptedBundle.encryptedPrivateKey;
      expect(epk.cipher).toBe('aes-256-gcm');
      expect(epk.kdf).toBe('scrypt');
      expect(epk.salt).toBeDefined();
      expect(epk.iv).toBeDefined();
      expect(epk.authTag).toBeDefined();
      expect(epk.ciphertext).toBeDefined();
    });

    it('should build to public/ by default', { timeout: 15000 }, () => {
      const testIssuerDir = path.join(ROOT, 'src', 'registry', 'issuers', 'test-issuer-build');
      const publicIssuerDir = path.join(ROOT, 'public', 'issuers', 'test-issuer-build');
      
      // Clean up if exists
      if (fs.existsSync(testIssuerDir)) {
        fs.rmSync(testIssuerDir, { recursive: true, force: true });
      }
      if (fs.existsSync(publicIssuerDir)) {
        fs.rmSync(publicIssuerDir, { recursive: true, force: true });
      }

      const result = runCli(
        `generate --issuer test-issuer-build --did-domain vc.test.local`
      );
      
      const hasSuccess = result.status === 0 || result.stdout.includes('✅ Generate complete');
      expect(hasSuccess).toBe(true);
      expect(result.stdout).toContain('📦 Running build');
      expect(result.stdout).toContain('✅ public/ updated');
      
      // Verify files in both src and public
      expect(fs.existsSync(path.join(testIssuerDir, 'did.json'))).toBe(true);
      expect(fs.existsSync(path.join(publicIssuerDir, 'did.json'))).toBe(true);
      expect(fs.existsSync(path.join(publicIssuerDir, 'es256.keys.json'))).toBe(false);
      expect(fs.existsSync(path.join(publicIssuerDir, 'es256.encrypted.json'))).toBe(false);
      
      // Cleanup
      if (fs.existsSync(testIssuerDir)) {
        fs.rmSync(testIssuerDir, { recursive: true, force: true });
      }
      if (fs.existsSync(publicIssuerDir)) {
        fs.rmSync(publicIssuerDir, { recursive: true, force: true });
      }
    });

    it('should skip build when --no-build is specified', { timeout: 15000 }, () => {
      const testIssuerDir = path.join(TMP_TEST_DIR, 'test-issuer-no-build');
      
      const result = runCli(
        `generate --issuer test-issuer-no-build --did-domain vc.test.local --output "${testIssuerDir}" --no-build`
      );
      
      const hasSuccess = result.status === 0 || result.stdout.includes('✅ Generate complete');
      expect(hasSuccess).toBe(true);
      expect(result.stdout).toContain('ℹ️ Skipping build step');
      expect(result.stdout).not.toContain('📦 Running build');
    });
  });

  describe('CLI help and version', () => {
    it('should display help when no command is given', () => {
      const result = runCli('--help');
      
      // Help output may go to stdout or be captured differently
      const output = result.stdout + result.stderr;
      expect(output).toContain('vc-registry');
      expect(output).toContain('validate');
      expect(output).toContain('build');
      expect(output).toContain('generate');
    });

    it('should display version', () => {
      const result = runCli('--version');
      
      const output = result.stdout + result.stderr;
      expect(output).toMatch(/\d+\.\d+\.\d+/);
    });
  });
});
