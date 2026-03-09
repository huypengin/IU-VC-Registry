import { afterAll, describe, expect, it } from 'vitest';

import {
  buildCredentialStatusEntry,
  buildStatusListPublicUrl
} from '../../src/status/status-list-service.js';
import { pool } from '../../src/db/connection.js';

afterAll(async () => {
  await pool.end();
});

describe('status-list-service helpers', () => {
  it('builds the canonical status-list public URL for a list id', () => {
    expect(
      buildStatusListPublicUrl('degree/2025', 'https://vc.test.local')
    ).toBe('https://vc.test.local/status/degree/2025/status-list.json');
  });

  it('builds a wallet-facing StatusList2021Entry with a derived optional id', () => {
    expect(
      buildCredentialStatusEntry({
        statusListCredential: 'https://vc.test.local/status/degree/2025/status-list.json',
        statusListIndex: 42,
        statusPurpose: 'revocation'
      })
    ).toEqual({
      id: 'https://vc.test.local/status/degree/2025/status-list.json#42',
      type: 'StatusList2021Entry',
      statusPurpose: 'revocation',
      statusListIndex: '42',
      statusListCredential: 'https://vc.test.local/status/degree/2025/status-list.json'
    });
  });
});
