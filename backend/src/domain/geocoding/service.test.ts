import { describe, expect, it, vi } from 'vitest';

import { getGeocodingFixture } from '../../adapters/geocoding/fixture';
import type { GeocodingAdapter } from '../../adapters/geocoding/types';
import { createGeocodingService } from './service';

const fixtureRequest = { query: '臺北', dataMode: 'fixture' as const };

describe('createGeocodingService', () => {
  it('uses the fixture source only when Demo mode is explicitly selected', async () => {
    const search = vi.fn<GeocodingAdapter['search']>();
    const service = createGeocodingService({ live: { search } });

    await expect(service.search(fixtureRequest)).resolves.toEqual(getGeocodingFixture(fixtureRequest));
    expect(search).not.toHaveBeenCalled();
  });

  it('uses live Photon results in live mode', async () => {
    const liveResponse = {
      ...getGeocodingFixture(fixtureRequest),
      provenance: 'live' as const,
      provider: 'photon' as const,
      attribution: '© OpenStreetMap contributors；地名搜尋：Photon',
    };
    const search = vi.fn<GeocodingAdapter['search']>().mockResolvedValue(liveResponse);
    const service = createGeocodingService({ live: { search } });

    await expect(service.search({ query: '臺北', dataMode: 'live' })).resolves.toEqual(liveResponse);
    expect(search).toHaveBeenCalledWith({ query: '臺北', dataMode: 'live' });
  });

  it('normalizes every live provider failure to GEOCODING_UNAVAILABLE', async () => {
    const service = createGeocodingService({
      live: { search: vi.fn().mockRejectedValue(new Error('private upstream detail')) },
    });

    await expect(service.search({ query: '臺北', dataMode: 'live' })).rejects.toThrow(
      'GEOCODING_UNAVAILABLE',
    );
  });
});
