import type { EnvironmentSnapshot } from '@airme/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pool = vi.hoisted(() => ({
  query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  end: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('pg', () => ({
  Pool: class {
    query = pool.query;
    end = pool.end;
  },
}));

import { PostgresStore } from './postgres-store';

const snapshot: EnvironmentSnapshot = {
  location: { name: 'AirMe 粗略位置', latitude: 22.6, longitude: 120.31 },
  airQuality: { aqi: 82, category: 'moderate', primaryPollutant: null },
  weather: { summary: '多雲', temperatureC: 30, rainProbability: 20 },
  sources: [
    {
      provider: 'airme-fixture',
      label: '測試資料',
      url: 'https://example.invalid/fixture',
      observedAt: '2026-07-13T02:00:00.000Z',
      fetchedAt: '2026-07-13T02:00:00.000Z',
      stale: false,
    },
  ],
  provenance: 'fixture',
};

describe('PostgresStore environment cache', () => {
  beforeEach(() => pool.query.mockClear());

  it('scrubs legacy location names without refreshing cache age', async () => {
    const storedAt = new Date('2026-07-13T02:00:00.000Z').getTime();
    const store = new PostgresStore('postgresql://example.invalid/airme');

    await store.setEnvironmentCache('22.600,120.310', snapshot, {
      preserveStoredAt: storedAt,
    });

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('stored_at = environment_cache.stored_at'),
      ['22.600,120.310', JSON.stringify(snapshot), storedAt],
    );
  });

  it('inserts the password verifier and session digest without any raw token field', async () => {
    const store = new PostgresStore('postgresql://example.invalid/airme');
    const createdAt = new Date('2026-07-20T03:00:00.000Z');

    await store.createAccountWithSession({
      account: {
        id: 'fb3dc15f-473e-4561-8b32-6e5d858d8f2b',
        email: 'student@example.com',
        displayName: '小明',
        createdAt: createdAt.toISOString(),
        passwordHash: 'scrypt$N=16384,r=8,p=1$fake-salt$fake-key',
      },
      privacyConsentedAt: createdAt,
      session: {
        id: '856c1424-3fb1-4d4d-b737-53364d93bf8a',
        tokenDigest: 'hmac-digest-only',
        expiresAt: new Date('2026-08-19T03:00:00.000Z'),
        createdAt,
      },
    });

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO account_sessions'),
      expect.arrayContaining(['scrypt$N=16384,r=8,p=1$fake-salt$fake-key', 'hmac-digest-only']),
    );
    expect(pool.query.mock.calls[0]![0]).not.toContain('access_token');
  });
});
