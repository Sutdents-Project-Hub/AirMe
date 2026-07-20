import { describe, expect, it, vi } from 'vitest';

import { createPhotonGeocodingAdapter, parsePhotonResponse } from './photon';

const request = { query: '臺北車站', dataMode: 'live' as const };

function photonFeature(options: {
  name: string;
  coordinates: [number, number];
  countrycode?: string;
  city?: string;
  osmType?: string;
  osmId?: number;
}) {
  return {
    type: 'Feature',
    properties: {
      name: options.name,
      countrycode: options.countrycode ?? 'tw',
      city: options.city ?? '臺北市',
      osm_type: options.osmType ?? 'N',
      osm_id: options.osmId ?? 123,
    },
    geometry: { type: 'Point', coordinates: options.coordinates },
  };
}

describe('PhotonGeocodingAdapter', () => {
  it('sends a bounded Photon query and normalizes only Taiwan results', async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          features: [
            photonFeature({
              name: '臺北車站',
              coordinates: [121.51703942, 25.04770812],
              osmId: 456,
            }),
            photonFeature({ name: '東京車站', coordinates: [139.767125, 35.681236], countrycode: 'jp' }),
            photonFeature({ name: '錯誤國碼', coordinates: [121.5, 25.02], countrycode: 'jp' }),
          ],
        }),
      ),
    );
    const adapter = createPhotonGeocodingAdapter({
      endpoint: 'https://photon.example.invalid/api/',
      fetcher,
    });

    const result = await adapter.search(request);

    const url = new URL(String(fetcher.mock.calls[0]?.[0]));
    expect(url.origin + url.pathname).toBe('https://photon.example.invalid/api/');
    expect(url.searchParams.get('q')).toBe('臺北車站');
    expect(url.searchParams.get('limit')).toBe('8');
    expect(url.searchParams.get('lang')).toBe('zh');
    expect(url.searchParams.get('bbox')).toBe('118,21.7,122.5,26.5');
    expect(result).toEqual({
      results: [
        {
          id: 'N:456',
          name: '臺北車站',
          administrativeArea: '臺北市',
          latitude: 25.047708,
          longitude: 121.517039,
        },
      ],
      provenance: 'live',
      provider: 'photon',
      attribution: '© OpenStreetMap contributors；地名搜尋：Photon',
    });
  });

  it('maps upstream, timeout and malformed payloads to GEOCODING_UNAVAILABLE', async () => {
    const unavailable = createPhotonGeocodingAdapter({
      endpoint: 'https://photon.example.invalid/api/',
      fetcher: vi.fn(async () => new Response('upstream detail must not escape', { status: 502 })),
    });
    const malformed = createPhotonGeocodingAdapter({
      endpoint: 'https://photon.example.invalid/api/',
      fetcher: vi.fn(async () => new Response(JSON.stringify({ noFeatures: true }))),
    });
    const timedOut = createPhotonGeocodingAdapter({
      endpoint: 'https://photon.example.invalid/api/',
      fetcher: vi.fn(async () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        throw error;
      }),
    });

    await expect(unavailable.search(request)).rejects.toThrow('GEOCODING_UNAVAILABLE');
    await expect(malformed.search(request)).rejects.toThrow('GEOCODING_UNAVAILABLE');
    await expect(timedOut.search(request)).rejects.toThrow('GEOCODING_UNAVAILABLE');
  });

  it('rejects invalid response roots but permits a valid empty result set', () => {
    expect(() => parsePhotonResponse({ features: 'not-an-array' })).toThrow('GEOCODING_UNAVAILABLE');
    expect(parsePhotonResponse({ features: [] })).toEqual([]);
  });
});
