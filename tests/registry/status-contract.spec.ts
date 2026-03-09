import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

function readJson(relativePath: string) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

describe('status-list contract assets', () => {
  it('keeps credentialStatus.id optional in authored schemas while constraining the StatusList2021Entry contract', () => {
    const degree = readJson('src/registry/credentialSchema/iu-edu-degree-v1.schema.json');
    const smartcert = readJson('src/registry/credentialSchema/iu-smartcert-v1.schema.json');
    const transcript = readJson('src/registry/credentialSchema/iu-edu-transcript-v1.schema.json');

    expect(degree.properties.credentialStatus.required).not.toContain('id');
    expect(smartcert.properties.credentialStatus.required).not.toContain('id');

    expect(transcript.properties.credentialStatus.properties.type.enum).toEqual(['StatusList2021Entry']);
    expect(transcript.properties.credentialStatus.properties.statusPurpose.enum).toEqual(['revocation']);
    expect(transcript.properties.credentialStatus.required).toEqual([
      'type',
      'statusPurpose',
      'statusListIndex',
      'statusListCredential'
    ]);
  });

  it('keeps authored and generated status-list payloads on the same canonical VC-v2 shape', () => {
    const authoredStatusList = readJson('src/registry/status/degree/2025/status-list.json');
    const publicStatusList = readJson('public/status/degree/2025/status-list.json');

    for (const payload of [authoredStatusList, publicStatusList]) {
      expect(payload['@context']).toEqual([
        'https://www.w3.org/ns/credentials/v2',
        'https://w3id.org/vc/status-list/2021/v1',
        'https://w3id.org/security/data-integrity/v2'
      ]);
      expect(payload.id).toBe(
        'https://infra-vc-registry-web-911368042037.asia-east2.run.app/status/degree/2025/status-list.json'
      );
      expect(payload.validFrom).toBeDefined();
      expect(payload.issuanceDate).toBeUndefined();
      expect(payload.credentialSubject.id).toBe(
        'https://infra-vc-registry-web-911368042037.asia-east2.run.app/status/degree/2025/status-list.json#list'
      );
    }
  });
});
