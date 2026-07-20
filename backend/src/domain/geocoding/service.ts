import type { GeocodingSearchRequest, GeocodingSearchResponse } from '@airme/contracts';

import { getGeocodingFixture } from '../../adapters/geocoding/fixture';
import type { GeocodingAdapter } from '../../adapters/geocoding/types';

export interface GeocodingService {
  search(request: GeocodingSearchRequest): Promise<GeocodingSearchResponse>;
}

export interface GeocodingServiceOptions {
  live: GeocodingAdapter;
  getFixture?: (request: GeocodingSearchRequest) => GeocodingSearchResponse;
}

function unavailable(): Error {
  return new Error('GEOCODING_UNAVAILABLE');
}

/**
 * Selects the explicit Demo/Live source.  It deliberately owns no cache or store so a user's
 * searched places and precise results remain request-scoped.
 */
export function createGeocodingService(options: GeocodingServiceOptions): GeocodingService {
  const getFixture = options.getFixture ?? getGeocodingFixture;

  return {
    async search(request: GeocodingSearchRequest): Promise<GeocodingSearchResponse> {
      if (request.dataMode === 'fixture') return getFixture(request);
      try {
        return await options.live.search(request);
      } catch {
        throw unavailable();
      }
    },
  };
}
