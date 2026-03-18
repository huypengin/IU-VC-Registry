import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

import {
  buildCodexExecArgs,
  computeSyncOperations,
  inferDefaultTargetRepoPath,
  mirrorRegistryContract,
} from '../../tools/sync-iu-cert-university.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

function makeTempDir(prefix: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeFile(filePath: string, content: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

describe('sync-iu-cert-university tool', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    vi.restoreAllMocks();
    while (tempDirs.length > 0) {
      fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
    }
  });

  it('detects drift when mirrored contract files differ', () => {
    const sourceRoot = makeTempDir('registry-source-');
    const targetRoot = makeTempDir('university-target-');
    tempDirs.push(sourceRoot, targetRoot);

    writeFile(
      path.join(sourceRoot, 'src/registry/contexts/iu-edu-degree-v1.jsonld'),
      '{"@context":{"UniversityDegree":"vnEdu:UniversityDegree"}}'
    );
    writeFile(
      path.join(sourceRoot, 'src/registry/credentialSchema/iu-edu-degree-v1.schema.json'),
      '{"type":"array"}'
    );

    writeFile(
      path.join(targetRoot, 'src/schemas/registry-mirror/contexts/iu-edu-degree-v1.jsonld'),
      '{"@context":{"UniversityDegree":"old"}}'
    );

    const operations = computeSyncOperations(sourceRoot, targetRoot);

    expect(operations).toHaveLength(2);
    expect(operations.map((operation) => operation.status)).toEqual(['update', 'create']);
  });

  it('writes mirrored files into the target repository', () => {
    const sourceRoot = makeTempDir('registry-source-');
    const targetRoot = makeTempDir('university-target-');
    tempDirs.push(sourceRoot, targetRoot);

    const contextContent = '{"@context":{"UniversityDegree":"vnEdu:UniversityDegree"}}';
    const schemaContent = '{"type":"array","minItems":4}';

    writeFile(
      path.join(sourceRoot, 'src/registry/contexts/iu-edu-degree-v1.jsonld'),
      contextContent
    );
    writeFile(
      path.join(sourceRoot, 'src/registry/credentialSchema/iu-edu-degree-v1.schema.json'),
      schemaContent
    );

    const result = mirrorRegistryContract(sourceRoot, targetRoot, 'write');

    expect(result.hasDrift).toBe(true);
    expect(result.operations.map((operation) => operation.status)).toEqual(['create', 'create']);
    expect(
      fs.readFileSync(
        path.join(targetRoot, 'src/schemas/registry-mirror/contexts/iu-edu-degree-v1.jsonld'),
        'utf8'
      )
    ).toBe(contextContent);
    expect(
      fs.readFileSync(
        path.join(
          targetRoot,
          'src/schemas/registry-mirror/credentialSchema/iu-edu-degree-v1.schema.json'
        ),
        'utf8'
      )
    ).toBe(schemaContent);
  });

  it('builds a codex exec invocation for downstream adaptation', () => {
    const prompt = 'Read mirrored files and adapt downstream schemas.';

    const args = buildCodexExecArgs('/tmp/iu-cert-university', prompt);

    expect(args).toEqual([
      'exec',
      '-C',
      '/tmp/iu-cert-university',
      prompt,
    ]);
  });

  it('resolves the default target repo path correctly from a worktree root', () => {
    const inferred = inferDefaultTargetRepoPath(
      '/Users/example/IU-VC-registry/.worktrees/iu-cert-sync'
    );

    expect(inferred).toBe('/Users/example/IU-cert-university');
  });

  it('runs as a CLI and reports drift in check mode', () => {
    const targetRoot = makeTempDir('university-target-');
    tempDirs.push(targetRoot);

    const result = spawnSync(
      'node',
      [
        '--loader',
        'ts-node/esm',
        'tools/sync-iu-cert-university.ts',
        'sync',
        '--target',
        targetRoot,
      ],
      {
        cwd: ROOT,
        encoding: 'utf8',
      }
    );

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('CREATE: degree context');
    expect(result.stdout).toContain('CREATE: degree schema');
    expect(result.stderr).toContain('IU-cert-university mirror is out of sync.');
  });
});
