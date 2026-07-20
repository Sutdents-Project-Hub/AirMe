import type { GeocodingSearchRequest, GeocodingSearchResponse } from '@airme/contracts';

/**
 * An external place-search provider.  Searches are request-scoped and must never be persisted.
 */
export interface GeocodingAdapter {
  search(request: GeocodingSearchRequest): Promise<GeocodingSearchResponse>;
}
