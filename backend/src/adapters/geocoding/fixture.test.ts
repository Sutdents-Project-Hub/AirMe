import { describe, expect, it } from 'vitest';

import { getGeocodingFixture } from './fixture';

describe('getGeocodingFixture', () => {
  it('replays a deterministic Taiwan-only demo search and normalizes 台 aliases', () => {
    const first = getGeocodingFixture({ query: '台北', dataMode: 'fixture' });
    const second = getGeocodingFixture({ query: '臺北', dataMode: 'fixture' });

    expect(first).toEqual(second);
    expect(first).toMatchObject({ provenance: 'fixture', provider: 'airme-fixture' });
    expect(first.results[0]).toMatchObject({
      id: 'fixture-taipei-station',
      name: '臺北車站',
      administrativeArea: '臺北市',
    });
  });

  it('does not invent a place when the fixture has no matching demo result', () => {
    expect(getGeocodingFixture({ query: '不存在地點', dataMode: 'fixture' }).results).toEqual([]);
  });
});
