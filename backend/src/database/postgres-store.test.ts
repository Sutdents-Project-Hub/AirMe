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
});
