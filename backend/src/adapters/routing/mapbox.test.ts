import { describe, expect, it, vi } from 'vitest';

import { createMapboxRoutingAdapter, parseMapboxRouteResponse } from './mapbox';

const request = {
  origin: { name: '臺北車站', latitude: 25.047708, longitude: 121.517039 },
  destination: { name: '中正紀念堂', latitude: 25.032404, longitude: 121.519883 },
  mode: 'walking' as const,
  alternatives: 2,
  dataMode: 'live' as const,
};

function route(distance = 1250, duration = 240) {
  return {
    distance,
    duration,
    geometry: { type: 'LineString', coordinates: [[121.517039, 25.047708], [121.518, 25.04], [121.519883, 25.032404]] },
    legs: [{ steps: [
      { distance: 1100, duration: 210, maneuver: { instruction: '向南步行' } },
      { distance: 150, duration: 30, maneuver: { instruction: '抵達目的地' } },
    ] }],
  };
}

describe('MapboxRoutingAdapter', () => {
  it('sends a Chinese GeoJSON route request and normalizes alternatives', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ routes: [route(), route(1400, 260)] })));
    const adapter = createMapboxRoutingAdapter({
      apiBaseUrl: 'https://api.mapbox.example.invalid/', accessToken: 'server-token', fetcher,
      now: () => new Date('2026-07-25T01:02:03.000Z'),
    });

    const result = await adapter.route(request);

    const url = new URL(String(fetcher.mock.calls[0]?.[0]));
    expect(url.origin + url.pathname).toBe('https://api.mapbox.example.invalid/directions/v5/mapbox/walking/121.517039,25.047708;121.519883,25.032404');
    expect(url.searchParams.get('access_token')).toBe('server-token');
    expect(url.searchParams.get('alternatives')).toBe('true');
    expect(url.searchParams.get('geometries')).toBe('geojson');
    expect(url.searchParams.get('overview')).toBe('full');
    expect(url.searchParams.get('steps')).toBe('true');
    expect(url.searchParams.get('language')).toBe('zh-TW');
    expect(result).toMatchObject({
      provenance: 'live', provider: 'mapbox', generatedAt: '2026-07-25T01:02:03.000Z',
      alternatives: [
        {
          id: 'mapbox-1', distanceMeters: 1250, durationSeconds: 240,
          steps: [
            { instruction: '向南步行', distanceMeters: 1100, durationSeconds: 210 },
            { instruction: '抵達目的地', distanceMeters: 150, durationSeconds: 30 },
          ],
        },
        { id: 'mapbox-2', distanceMeters: 1400, durationSeconds: 260 },
      ],
    });
    expect(String(fetcher.mock.calls[0]?.[0])).not.toContain('臺北車站');
    expect(String(fetcher.mock.calls[0]?.[0])).not.toContain('中正紀念堂');
  });

  it.each([['walking', 'walking'], ['cycling', 'cycling'], ['driving', 'driving']] as const)(
    'uses the %s profile for %s routes', async (mode, profile) => {
      const fetcher = vi.fn(async () => new Response(JSON.stringify({ routes: [route()] })));
      const adapter = createMapboxRoutingAdapter({ apiBaseUrl: 'https://api.mapbox.example.invalid', accessToken: 'server-token', fetcher });

      await adapter.route({ ...request, mode, alternatives: 1 });

      expect(new URL(String(fetcher.mock.calls[0]?.[0])).pathname).toContain(`/mapbox/${profile}/`);
    },
  );

  it('maps missing credentials, upstream failures, timeouts and malformed payloads to the fixed public error', async () => {
    const missing = createMapboxRoutingAdapter({ apiBaseUrl: 'https://api.mapbox.example.invalid', accessToken: null });
    const unavailable = createMapboxRoutingAdapter({
      apiBaseUrl: 'https://api.mapbox.example.invalid', accessToken: 'server-token',
      fetcher: vi.fn(async () => new Response('provider detail must not escape', { status: 503 })),
    });
    const malformed = createMapboxRoutingAdapter({
      apiBaseUrl: 'https://api.mapbox.example.invalid', accessToken: 'server-token',
      fetcher: vi.fn(async () => new Response(JSON.stringify({ routes: [{ legs: [] }] }))),
    });
    const timedOut = createMapboxRoutingAdapter({
      apiBaseUrl: 'https://api.mapbox.example.invalid', accessToken: 'server-token',
      fetcher: vi.fn(async () => { const error = new Error('aborted'); error.name = 'AbortError'; throw error; }),
    });

    await expect(missing.route(request)).rejects.toThrow('ROUTING_UNAVAILABLE');
    await expect(unavailable.route(request)).rejects.toThrow('ROUTING_UNAVAILABLE');
    await expect(malformed.route(request)).rejects.toThrow('ROUTING_UNAVAILABLE');
    await expect(timedOut.route(request)).rejects.toThrow('ROUTING_UNAVAILABLE');
  });

  it('does not expose parser failures outside the routing boundary', () => {
    expect(() => parseMapboxRouteResponse({ routes: [{ geometry: { coordinates: [] } }] }, request, new Date())).toThrow('ROUTING_UNAVAILABLE');
  });
});
