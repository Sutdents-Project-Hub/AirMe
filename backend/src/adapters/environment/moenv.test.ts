import { describe, expect, it } from 'vitest';

import { parseMoenvResponse } from './moenv';

describe('parseMoenvResponse', () => {
  it('selects the nearest station and normalizes Taiwan time', () => {
    const result = parseMoenvResponse(
      {
        records: [
          {
            sitename: '左營',
            county: '高雄市',
            aqi: '42',
            pollutant: '',
            publishtime: '2026-07-13 10:00:00',
            latitude: '22.6749',
            longitude: '120.2927',
          },
          {
            sitename: '前鎮',
            county: '高雄市',
            aqi: '118',
            pollutant: '細懸浮微粒',
            publishtime: '2026-07-13 10:00:00',
            latitude: '22.6054',
            longitude: '120.3075',
          },
        ],
      },
      { name: '高雄市前鎮區', latitude: 22.6, longitude: 120.31 },
      new Date('2026-07-13T02:03:00.000Z'),
    );

    expect(result.value).toEqual({
      aqi: 118,
      category: 'unhealthy-sensitive',
      primaryPollutant: '細懸浮微粒',
    });
    expect(result.source.observedAt).toBe('2026-07-13T02:00:00.000Z');
  });

  it('rejects a payload without usable stations', () => {
    expect(() =>
      parseMoenvResponse(
        { records: [{ sitename: '前鎮', aqi: '-' }] },
        { name: '高雄市前鎮區', latitude: 22.6, longitude: 120.31 },
        new Date('2026-07-13T02:03:00.000Z'),
      ),
    ).toThrow('MOENV_INVALID_RESPONSE');
  });
});
