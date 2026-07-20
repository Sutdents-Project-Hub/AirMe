import { describe, expect, it, vi } from 'vitest';

import { createValhallaRoutingAdapter, parseValhallaRouteResponse } from './valhalla';

const request = {
  origin: { name: '臺北車站', latitude: 25.047708, longitude: 121.517039 },
  destination: { name: '中正紀念堂', latitude: 25.032404, longitude: 121.519883 },
  mode: 'walking' as const,
  alternatives: 2,
  dataMode: 'live' as const,
};

function encodePolyline6(points: Array<[number, number]>): string {
  let previousLatitude = 0;
  let previousLongitude = 0;
  const encodeValue = (value: number) => {
    let encoded = value < 0 ? ~(value << 1) : value << 1;
    let result = '';
    while (encoded >= 0x20) {
      result += String.fromCharCode((0x20 | (encoded & 0x1f)) + 63);
      encoded >>= 5;
    }
    return result + String.fromCharCode(encoded + 63);
  };

  return points
    .map(([latitude, longitude]) => {
      const latitudeValue = Math.round(latitude * 1_000_000);
      const longitudeValue = Math.round(longitude * 1_000_000);
      const encoded =
        encodeValue(latitudeValue - previousLatitude) + encodeValue(longitudeValue - previousLongitude);
      previousLatitude = latitudeValue;
      previousLongitude = longitudeValue;
      return encoded;
    })
    .join('');
}

function trip(shape: string, length = 1.25, time = 240) {
  return {
    summary: { length, time },
    legs: [
      {
        shape,
        maneuvers: [
          {
            verbal_pre_transition_instruction: '向南步行',
            length: 1.1,
            time: 210,
          },
          {
            instruction: '抵達目的地',
            length: 0.15,
            time: 30,
          },
        ],
      },
    ],
  };
}

describe('ValhallaRoutingAdapter', () => {
  it('sends a POST route request and normalizes primary and alternate routes', async () => {
    const primaryShape = encodePolyline6([
      [25.047708, 121.517039],
      [25.04, 121.518],
      [25.032404, 121.519883],
    ]);
    const alternateShape = encodePolyline6([
      [25.047708, 121.517039],
      [25.041, 121.522],
      [25.032404, 121.519883],
    ]);
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({ trip: trip(primaryShape), alternates: [{ trip: trip(alternateShape, 1.4, 260) }] }),
      ),
    );
    const adapter = createValhallaRoutingAdapter({
      endpoint: 'http://valhalla:8002/route',
      fetcher,
      now: () => new Date('2026-07-20T01:02:03.000Z'),
    });

    const result = await adapter.route(request);

    expect(fetcher).toHaveBeenCalledWith(
      'http://valhalla:8002/route',
      expect.objectContaining({ method: 'POST' }),
    );
    const sent = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
    expect(sent).toEqual({
      locations: [
        { lat: 25.047708, lon: 121.517039 },
        { lat: 25.032404, lon: 121.519883 },
      ],
      costing: 'pedestrian',
      alternates: 1,
      units: 'kilometers',
      directions_options: { units: 'kilometers', language: 'zh-TW' },
    });
    expect(JSON.stringify(sent)).not.toContain('臺北車站');
    expect(JSON.stringify(sent)).not.toContain('中正紀念堂');
    expect(result).toMatchObject({
      provenance: 'live',
      provider: 'valhalla',
      generatedAt: '2026-07-20T01:02:03.000Z',
      alternatives: [
        {
          id: 'valhalla-1',
          distanceMeters: 1250,
          durationSeconds: 240,
          coordinates: [
            [121.517039, 25.047708],
            [121.518, 25.04],
            [121.519883, 25.032404],
          ],
          steps: [
            { instruction: '向南步行', distanceMeters: 1100, durationSeconds: 210 },
            { instruction: '抵達目的地', distanceMeters: 150, durationSeconds: 30 },
          ],
        },
        { id: 'valhalla-2', distanceMeters: 1400, durationSeconds: 260 },
      ],
    });
  });

  it.each([
    ['walking', 'pedestrian'],
    ['cycling', 'bicycle'],
    ['driving', 'auto'],
  ] as const)('uses %s costing for %s routing', async (mode, costing) => {
    const shape = encodePolyline6([
      [25.047708, 121.517039],
      [25.032404, 121.519883],
    ]);
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ trip: trip(shape) })));
    const adapter = createValhallaRoutingAdapter({ endpoint: 'http://valhalla:8002/route', fetcher });

    await adapter.route({ ...request, mode, alternatives: 1 });

    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toMatchObject({ costing });
  });

  it('maps upstream, timeout and malformed responses to the fixed public error', async () => {
    const unavailable = createValhallaRoutingAdapter({
      endpoint: 'http://valhalla:8002/route',
      fetcher: vi.fn(async () => new Response('upstream detail should not escape', { status: 503 })),
    });
    const malformed = createValhallaRoutingAdapter({
      endpoint: 'http://valhalla:8002/route',
      fetcher: vi.fn(async () => new Response(JSON.stringify({ trip: { legs: [] } }))),
    });
    const timedOut = createValhallaRoutingAdapter({
      endpoint: 'http://valhalla:8002/route',
      fetcher: vi.fn(async () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        throw error;
      }),
    });

    await expect(unavailable.route(request)).rejects.toThrow('ROUTING_UNAVAILABLE');
    await expect(malformed.route(request)).rejects.toThrow('ROUTING_UNAVAILABLE');
    await expect(timedOut.route(request)).rejects.toThrow('ROUTING_UNAVAILABLE');
  });

  it('does not expose parser failures outside the routing boundary', () => {
    expect(() =>
      parseValhallaRouteResponse(
        { trip: { legs: [{ shape: '!', maneuvers: [] }] } },
        request,
        new Date('2026-07-20T01:02:03.000Z'),
      ),
    ).toThrow('ROUTING_UNAVAILABLE');
  });
});
