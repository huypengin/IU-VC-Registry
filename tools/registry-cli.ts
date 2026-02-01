#!/usr/bin/env ts-node

import { Command } from "commander";
import fs from "fs";
import path from "path";
import url from "url";
import { spawnSync } from 'child_process';

const program = new Command();

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src", "registry");
const PUBLIC = path.join(ROOT, "public");
const REGISTRY_CONFIG_PATH = path.join(SRC, "registry.config.json");
const DEFAULT_BASE_URL = "https://helena-unda-bounceably.ngrok-free.dev";
const REGISTRY_BASE_URL_ENV = "REGISTRY_BASE_URL";

type RegistryConfig = {
    baseUrl?: string;
};

/**
 * Recursively walk directory and run callback on each file.
 */
function walkDir(dir: string, cb: (filePath: string) => void) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir)) {
        const full = path.join(dir, entry);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            walkDir(full, cb);
        } else {
            cb(full);
        }
    }
}

/**
 * Simple JSON/JSON-LD syntax validation.
 */
function validateJsonSyntax(filePath: string) {
    const ext = path.extname(filePath);
    if (![".json", ".jsonld"].includes(ext)) return;

    const raw = fs.readFileSync(filePath, "utf8");
    try {
        JSON.parse(raw);
    } catch (e) {
        throw new Error(`❌ Invalid JSON in ${filePath}\n${String(e)}`);
    }
}

/**
 * Copy directory recursively.
 */
function copyDir(
    src: string,
    dest: string,
    transform?: (filePath: string, content: string) => string
) {
    if (!fs.existsSync(src)) return;
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

    for (const entry of fs.readdirSync(src)) {
        const srcPath = path.join(src, entry);
        const destPath = path.join(dest, entry);
        const stat = fs.statSync(srcPath);

        if (stat.isDirectory()) {
            copyDir(srcPath, destPath, transform);
        } else {
            if (transform && shouldRewriteFile(srcPath)) {
                const raw = fs.readFileSync(srcPath, "utf8");
                const rewritten = transform(srcPath, raw);
                fs.writeFileSync(destPath, rewritten, "utf8");
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }
}

function normalizeBaseUrl(value?: string): string | undefined {
    const trimmed = value?.trim();
    if (!trimmed) return undefined;
    const withoutSlash = trimmed.replace(/\/+$/, "");
    if (withoutSlash.startsWith("http://") || withoutSlash.startsWith("https://")) {
        return withoutSlash;
    }
    return `https://${withoutSlash}`;
}

function loadRegistryConfig(): RegistryConfig {
    const envBaseUrl = normalizeBaseUrl(process.env[REGISTRY_BASE_URL_ENV]);
    if (envBaseUrl) {
        return { baseUrl: envBaseUrl };
    }
    if (!fs.existsSync(REGISTRY_CONFIG_PATH)) {
        return { baseUrl: DEFAULT_BASE_URL };
    }
    try {
        const raw = fs.readFileSync(REGISTRY_CONFIG_PATH, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.baseUrl === "string" && parsed.baseUrl.trim()) {
            return { baseUrl: normalizeBaseUrl(parsed.baseUrl) };
        }
        return { baseUrl: DEFAULT_BASE_URL };
    } catch (e) {
        console.warn(`⚠️ Failed to read registry config (${REGISTRY_CONFIG_PATH}), using default baseUrl.`);
        return { baseUrl: DEFAULT_BASE_URL };
    }
}

function shouldRewriteFile(filePath: string): boolean {
    const ext = path.extname(filePath);
    if (![".json", ".jsonld"].includes(ext)) return false;
    const rel = path.relative(SRC, filePath).split(path.sep).join("/");
    return (
        rel.startsWith("contexts/") ||
        rel.startsWith("credentialSchema/") ||
        rel.startsWith("status/")
    );
}

function createBaseUrlRewriter(baseUrl: string | undefined) {
    if (!baseUrl || baseUrl === DEFAULT_BASE_URL) {
        return (_filePath: string, content: string) => content;
    }
    return (_filePath: string, content: string) =>
        content.replaceAll(DEFAULT_BASE_URL, baseUrl);
}

/**
 * Quick DID sanity check:
 * - .well-known/did.json id must start with did:web:
 * - "issuers/did.json must have valid DID format
 * */
function validateDidDocuments() {
    // Support both `.well-known` (standard) and existing `.well-know` (legacy/typo)
    const wellKnownCandidates = [
        path.join(SRC, ".well-known", "did.json"),
        path.join(SRC, ".well-know", "did.json")
    ];

    for (const wellKnownDidPath of wellKnownCandidates) {
        if (fs.existsSync(wellKnownDidPath)) {
            const raw = fs.readFileSync(wellKnownDidPath, "utf8");
            const didDoc = JSON.parse(raw);
            if (typeof didDoc.id !== "string" || !didDoc.id.startsWith("did:web:")) {
                throw new Error(
                    `❌ ${path.relative(SRC, wellKnownDidPath)} has invalid or missing "id" (expected did:web:...)`
                );
            }
            break; // found a valid candidate, stop checking further
        }
    }

    // Check all issuer DID documents
    const issuersPath = path.join(SRC, "issuers");
    if (fs.existsSync(issuersPath)) {
        const issuers = fs.readdirSync(issuersPath).filter(entry => {
            const fullPath = path.join(issuersPath, entry);
            return fs.statSync(fullPath).isDirectory() && entry !== "helper";
        });

        for (const issuer of issuers) {
            const didPath = path.join(issuersPath, issuer, "did.json");
            if (fs.existsSync(didPath)) {
                const raw = fs.readFileSync(didPath, "utf8");
                const didDoc = JSON.parse(raw);
                if (typeof didDoc.id !== "string" || !didDoc.id.startsWith("did:web:")) {
                    throw new Error(
                        `❌ issuers/${issuer}/did.json has invalid or missing "id" (expected did:web:...)`
                    );
                }
            }
        }
    }
}


program
    .name("vc-registry")
    .description("CLI to manage IU VC registry (contexts, schemas, DIDs)")
    .version("0.1.0");

program
    .command("validate")
    .description("Validate JSON/JSON-LD syntax + basic DID docs")
    .action(() => {
        if (!fs.existsSync(SRC)) {
            console.error(`❌ src/registry/ not found at ${SRC}`);
            process.exit(1);
        }

        console.log(`🔍 Validating JSON/JSON-LD under ${SRC}`);
        walkDir(SRC, (filePath) => {
            try {
                validateJsonSyntax(filePath);
            } catch (e) {
                console.error(String(e));
                process.exit(1);
            }
        });

        try {
            validateDidDocuments();
        } catch (e) {
            console.error(String(e));
            process.exit(1);
        }

        console.log("✅ All registry JSON/JSON-LD files are syntactically valid.");
        console.log("✅ DID documents have did:web: ids.");
    });

program
    .command("build")
    .description("Build public/ folder from src/registry/")
    .action(() => {
        if (!fs.existsSync(SRC)) {
            console.error(`❌ src/registry/ not found at ${SRC}`);
            process.exit(1);
        }

        console.log(`🧹 Cleaning ${PUBLIC}`);
        if (fs.existsSync(PUBLIC)) {
            fs.rmSync(PUBLIC, { recursive: true, force: true });
        }

        const { baseUrl } = loadRegistryConfig();
        const rewrite = createBaseUrlRewriter(baseUrl ?? DEFAULT_BASE_URL);

        console.log(`📦 Copying ${SRC} → ${PUBLIC}`);
        if (baseUrl && baseUrl !== DEFAULT_BASE_URL) {
            console.log(`🔁 Rewriting baseUrl ${DEFAULT_BASE_URL} → ${baseUrl}`);
        }
        copyDir(SRC, PUBLIC, rewrite);

        console.log("✅ Build complete. public/ is ready for Docker/nginx.");
    });

program
  .command('generate')
  .description('Generate keys and inject into a did.json for an issuer')
  .option('--issuer <name>', 'Issuer folder under src/registry/issuers', 'iu')
  .option('--did-domain <domain>', 'DID domain or full DID identifier')
  .option('--output <path>', 'Output directory (defaults to src/registry/issuers/<issuer>)')
  .option('--encrypted', 'Encrypt private key output')
  .option('--passphrase <pass>', 'Passphrase for encryption')
  .option('--no-build', 'Do not run `build` after generation (default: build to public)')
  .action((opts) => {
    // Call the keyGenerator helper script using node with ts-node ESM loader
    const args = ['--loader', 'ts-node/esm', './src/registry/issuers/helper/keyGenerator.ts', 'generate'];
    if (opts.issuer) args.push('--issuer', opts.issuer);
    if (opts.didDomain) args.push('--did-domain', opts.didDomain);
    if (opts.output) args.push('--output', opts.output);
    if (opts.encrypted) args.push('--encrypted');
    if (opts.passphrase) args.push('--passphrase', opts.passphrase);

    console.log('🔧 Running key generator...');
    const res = spawnSync('node', args, { stdio: 'inherit' });
    if (res.error) {
      console.error('Failed to execute key generator:', res.error);
      process.exit(1);
    }
    if (res.status !== 0) {
      process.exit(res.status ?? 1);
    }
    console.log('✅ Generate complete.');

    // By default, run the build step to copy src/registry -> public/
    // Commander converts --no-build to build: false
    if (opts.build !== false) {
      try {
        console.log('📦 Running build to copy generated assets to public/');
        if (fs.existsSync(PUBLIC)) {
          fs.rmSync(PUBLIC, { recursive: true, force: true });
        }
        const { baseUrl } = loadRegistryConfig();
        const rewrite = createBaseUrlRewriter(baseUrl ?? DEFAULT_BASE_URL);
        if (baseUrl && baseUrl !== DEFAULT_BASE_URL) {
          console.log(`🔁 Rewriting baseUrl ${DEFAULT_BASE_URL} → ${baseUrl}`);
        }
        copyDir(SRC, PUBLIC, rewrite);
        console.log('✅ public/ updated with generated assets.');
      } catch (e) {
        console.error('Failed to build public/ after generation:', e);
        process.exit(1);
      }
    } else {
      console.log('ℹ️ Skipping build step (--no-build). Remember to run `vc-registry build`.');
    }
  });

 program.parse(process.argv);
