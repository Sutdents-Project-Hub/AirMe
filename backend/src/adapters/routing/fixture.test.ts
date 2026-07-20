import { describe, expect, it } from 'vitest';

import { getRoutingFixture } from './fixture';

const request = {
  origin: { name: '臺北車站', latitude: 25.047708, longitude: 121.517039 },
  destination: { name: '中正紀念堂', latitude: 25.032404, longitude: 121.519883 },
  mode: 'walking' as const,
  alternatives: 2,
  dataMode: 'fixture' as const,
};

describe('getRoutingFixture', () => {
  it('returns deterministic, replayable alternatives without needing a provider', () => {
    const first = getRoutingFixture(request);
    const second = getRoutingFixture(request);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      origin: request.origin,
      destination: request.destination,
      mode: 'walking',
      generatedAt: '2026-07-13T08:00:00.000Z',
      provenance: 'fixture',
      provider: 'airme-fixture',
    });
    expect(first.alternatives).toHaveLength(2);
    expect(first.alternatives[0]).toMatchObject({
      id: 'fixture-1',
      coordinates: [
        [121.517039, 25.047708],
        [121.519883, 25.032404],
      ],
    });
    expect(first.alternatives[0]?.steps.map((step) => step.instruction)).toEqual([
      '從臺北車站以步行出發',
      '抵達中正紀念堂',
    ]);
  });
});
