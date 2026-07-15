import { describe, expect, it } from 'vitest';

import { parseCwaResponse } from './cwa';

describe('parseCwaResponse', () => {
  it('normalizes the matching city forecast', () => {
    const result = parseCwaResponse(
      {
        records: {
          location: [
            {
              locationName: '高雄市',
              weatherElement: [
                {
                  elementName: 'Wx',
                  time: [
                    {
                      startTime: '2026-07-13 09:00:00',
                      parameter: { parameterName: '多雲短暫雨' },
                    },
                  ],
                },
                {
                  elementName: 'PoP',
                  time: [{ parameter: { parameterName: '40' } }],
                },
                {
                  elementName: 'MinT',
                  time: [{ parameter: { parameterName: '28' } }],
                },
                {
                  elementName: 'MaxT',
                  time: [{ parameter: { parameterName: '32' } }],
                },
              ],
            },
          ],
        },
      },
      { name: '高雄市前鎮區', latitude: 22.6, longitude: 120.31 },
      new Date('2026-07-13T02:03:00.000Z'),
    );

    expect(result.value).toEqual({
      summary: '多雲短暫雨',
      temperatureC: 30,
      rainProbability: 40,
    });
    expect(result.source.observedAt).toBe('2026-07-13T01:00:00.000Z');
  });

  it('rejects a payload without the requested location', () => {
    expect(() =>
      parseCwaResponse(
        { records: { location: [] } },
        { name: '高雄市前鎮區', latitude: 22.6, longitude: 120.31 },
        new Date('2026-07-13T02:03:00.000Z'),
      ),
    ).toThrow('CWA_INVALID_RESPONSE');
  });
});
