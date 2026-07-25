import { describe, expect, it, vi } from 'vitest';

import { createMapboxGeocodingAdapter, parseMapboxGeocodingResponse } from './mapbox';

const request = { query: '臺北車站', dataMode: 'live' as const };

function feature(options: { name: string; coordinates: [number, number]; country?: string; id?: string }) {
  return {
    type: 'Feature',
    id: options.id ?? 'poi.mapbox.123',
    properties: {
      mapbox_id: options.id ?? 'poi.mapbox.123',
      name_preferred: options.name,
      context: { country: { country_code: options.country ?? 'tw' }, place: { name: '臺北市' } },
    },
    geometry: { type: 'Point', coordinates: options.coordinates },
  };
}

describe('MapboxGeocodingAdapter', () => {
  it('sends a Taiwan-only Search Box query (including POIs) and normalizes the result', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      features: [
        feature({ name: '臺北車站', coordinates: [121.51703942, 25.04770812] }),
        feature({ name: '東京車站', coordinates: [139.767125, 35.681236], country: 'jp', id: 'poi.mapbox.jp' }),
      ],
    })));
    const adapter = createMapboxGeocodingAdapter({
      apiBaseUrl: 'https://api.mapbox.example.invalid/',
      accessToken: 'server-token',
      fetcher,
    });

    const result = await adapter.search(request);

    const url = new URL(String(fetcher.mock.calls[0]?.[0]));
    expect(url.origin + url.pathname).toBe('https://api.mapbox.example.invalid/search/searchbox/v1/forward');
    expect(url.searchParams.get('q')).toBe('臺北車站');
    expect(url.searchParams.get('country')).toBe('tw');
    expect(url.searchParams.get('language')).toBe('zh-TW');
    expect(url.searchParams.get('limit')).toBe('8');
    expect(url.searchParams.get('auto_complete')).toBe('false');
    expect(url.searchParams.get('access_token')).toBe('server-token');
    expect(result).toEqual({
      results: [{ id: 'poi.mapbox.123', name: '臺北車站', administrativeArea: '臺北市', latitude: 25.047708, longitude: 121.517039 }],
      provenance: 'live',
      provider: 'mapbox',
      attribution: '© Mapbox；資料 © OpenStreetMap contributors；地名搜尋：Mapbox',
    });
    expect(JSON.stringify(fetcher.mock.calls[0])).not.toContain('臺北車站');
  });

  it('maps missing credentials, upstream failures, timeouts and malformed payloads to the public error', async () => {
    const missing = createMapboxGeocodingAdapter({ apiBaseUrl: 'https://api.mapbox.example.invalid', accessToken: null });
    const unavailable = createMapboxGeocodingAdapter({
      apiBaseUrl: 'https://api.mapbox.example.invalid', accessToken: 'server-token',
      fetcher: vi.fn(async () => new Response('provider detail must not escape', { status: 429 })),
    });
    const malformed = createMapboxGeocodingAdapter({
      apiBaseUrl: 'https://api.mapbox.example.invalid', accessToken: 'server-token',
      fetcher: vi.fn(async () => new Response(JSON.stringify({ features: 'invalid' }))),
    });
    const timedOut = createMapboxGeocodingAdapter({
      apiBaseUrl: 'https://api.mapbox.example.invalid', accessToken: 'server-token',
      fetcher: vi.fn(async () => { const error = new Error('aborted'); error.name = 'AbortError'; throw error; }),
    });

    await expect(missing.search(request)).rejects.toThrow('GEOCODING_UNAVAILABLE');
    await expect(unavailable.search(request)).rejects.toThrow('GEOCODING_UNAVAILABLE');
    await expect(malformed.search(request)).rejects.toThrow('GEOCODING_UNAVAILABLE');
    await expect(timedOut.search(request)).rejects.toThrow('GEOCODING_UNAVAILABLE');
  });

  it('rejects malformed roots but permits valid empty results', () => {
    expect(() => parseMapboxGeocodingResponse({ features: 'not-an-array' })).toThrow('GEOCODING_UNAVAILABLE');
    expect(parseMapboxGeocodingResponse({ features: [] })).toEqual([]);
  });
});
