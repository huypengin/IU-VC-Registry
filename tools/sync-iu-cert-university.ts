#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import url from 'url';

export type SyncMode = 'check' | 'write';
export type SyncStatus = 'identical' | 'create' | 'update';

export type SyncOperation = {
  label: string;
  sourcePath: string;
  targetPath: string;
  status: SyncStatus;
};

type MirrorMapping = {
  label: string;
  sourceRelativePath: string;
  targetRelativePath: string;
};

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const ADAPT_PROMPT_PATH = path.join(
  ROOT,
  'tools',
  'prompts',
  'iu-cert-university-sync-adapt.md'
);

const MIRROR_MAPPINGS: MirrorMapping[] = [
  {
    label: 'degree context',
    sourceRelativePath: 'src/registry/contexts/iu-edu-degree-v1.jsonld',
    targetRelativePath: 'src/schemas/registry-mirror/contexts/iu-edu-degree-v1.jsonld',
  },
  {
    label: 'degree schema',
    sourceRelativePath: 'src/registry/credentialSchema/iu-edu-degree-v1.schema.json',
    targetRelativePath:
      'src/schemas/registry-mirror/credentialSchema/iu-edu-degree-v1.schema.json',
  },
];

export function computeSyncOperations(sourceRoot: string, targetRoot: string): SyncOperation[] {
  return MIRROR_MAPPINGS.map((mapping) => {
    const sourcePath = path.join(sourceRoot, mapping.sourceRelativePath);
    const targetPath = path.join(targetRoot, mapping.targetRelativePath);

    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Missing source file for ${mapping.label}: ${sourcePath}`);
    }

    const sourceContent = fs.readFileSync(sourcePath, 'utf8');
    const targetExists = fs.existsSync(targetPath);
    const targetContent = targetExists ? fs.readFileSync(targetPath, 'utf8') : null;

    let status: SyncStatus = 'identical';
    if (!targetExists) {
      status = 'create';
    } else if (targetContent !== sourceContent) {
      status = 'update';
    }

    return {
      label: mapping.label,
      sourcePath,
      targetPath,
      status,
    };
  });
}

export function mirrorRegistryContract(
  sourceRoot: string,
  targetRoot: string,
  mode: SyncMode
): { hasDrift: boolean; operations: SyncOperation[] } {
  if (!fs.existsSync(targetRoot)) {
    throw new Error(`Target repository path does not exist: ${targetRoot}`);
  }

  const operations = computeSyncOperations(sourceRoot, targetRoot);
  const hasDrift = operations.some((operation) => operation.status !== 'identical');

  if (mode === 'write') {
    for (const operation of operations) {
      if (operation.status === 'identical') {
        continue;
      }

      fs.mkdirSync(path.dirname(operation.targetPath), { recursive: true });
      fs.copyFileSync(operation.sourcePath, operation.targetPath);
    }
  }

  return { hasDrift, operations };
}

export function buildCodexExecArgs(targetRepoPath: string, prompt: string): string[] {
  return ['exec', '-C', targetRepoPath, prompt];
}

export function inferDefaultTargetRepoPath(root: string): string {
  const parentName = path.basename(path.dirname(root));
  if (parentName === '.worktrees') {
    return path.resolve(root, '..', '..', '..', 'IU-cert-university');
  }

  return path.resolve(root, '..', 'IU-cert-university');
}

function loadAdaptPromptTemplate(): string {
  if (!fs.existsSync(ADAPT_PROMPT_PATH)) {
    throw new Error(`Missing Codex prompt template: ${ADAPT_PROMPT_PATH}`);
  }

  return fs.readFileSync(ADAPT_PROMPT_PATH, 'utf8');
}

function buildAdaptPrompt(targetRepoPath: string): string {
  const template = loadAdaptPromptTemplate().trim();
  const mirrorPaths = MIRROR_MAPPINGS.map((mapping) =>
    `- ${path.join(targetRepoPath, mapping.targetRelativePath)}`
  ).join('\n');

  return `${template}\n\nMirrored contract files:\n${mirrorPaths}\n`;
}

function printOperations(operations: SyncOperation[]) {
  for (const operation of operations) {
    const targetLabel = path.relative(process.cwd(), operation.targetPath) || operation.targetPath;
    console.log(`${operation.status.toUpperCase()}: ${operation.label} -> ${targetLabel}`);
  }
}

function parseFlagValue(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  if (index === -1) return undefined;
  return argv[index + 1];
}

function resolveTargetRepoPath(argv: string[]): string {
  const explicit = parseFlagValue(argv, '--target') ?? process.env.IU_CERT_UNIVERSITY_PATH;
  return explicit ? path.resolve(explicit) : inferDefaultTargetRepoPath(ROOT);
}

function runSync(argv: string[]) {
  const mode: SyncMode = argv.includes('--write') ? 'write' : 'check';
  const targetRepoPath = resolveTargetRepoPath(argv);
  const result = mirrorRegistryContract(ROOT, targetRepoPath, mode);

  printOperations(result.operations);

  if (!result.hasDrift) {
    console.log('IU-cert-university mirror is in sync.');
    process.exit(0);
  }

  if (mode === 'check') {
    console.error('IU-cert-university mirror is out of sync.');
    process.exit(1);
  }

  console.log('IU-cert-university mirror updated.');
}

function runAdapt(argv: string[]) {
  const targetRepoPath = resolveTargetRepoPath(argv);
  if (!fs.existsSync(targetRepoPath)) {
    throw new Error(`Target repository path does not exist: ${targetRepoPath}`);
  }

  const prompt = buildAdaptPrompt(targetRepoPath);
  const args = buildCodexExecArgs(targetRepoPath, prompt);
  const result = spawnSync('codex', args, {
    cwd: ROOT,
    stdio: 'inherit',
  });

  process.exit(result.status ?? 1);
}

function main() {
  const [command = 'sync', ...argv] = process.argv.slice(2);

  if (command === 'sync') {
    runSync(argv);
    return;
  }

  if (command === 'adapt') {
    runAdapt(argv);
    return;
  }

  console.error(`Unknown command: ${command}`);
  process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
