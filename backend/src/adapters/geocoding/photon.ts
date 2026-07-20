import {
  GeocodingSearchResponseSchema,
  type GeocodingResult,
  type GeocodingSearchRequest,
  type GeocodingSearchResponse,
  type TaiwanAdministrativeArea,
} from '@airme/contracts';

import type { GeocodingAdapter } from './types';

const GEOCODING_UNAVAILABLE = 'GEOCODING_UNAVAILABLE';
const TAIWAN_BOUNDS = { minimumLatitude: 21.7, maximumLatitude: 26.5, minimumLongitude: 118, maximumLongitude: 122.5 };
const PHOTON_ATTRIBUTION = '© OpenStreetMap contributors；地名搜尋：Photon';

export interface PhotonGeocodingAdapterOptions {
  /** Full Photon search endpoint, for example https://photon.komoot.io/api/. */
  endpoint: string;
  timeoutMs?: number;
  fetcher?: typeof fetch;
}

type RecordValue = Record<string, unknown>;

function unavailable(): Error {
  return new Error(GEOCODING_UNAVAILABLE);
}

function asRecord(value: unknown): RecordValue | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as RecordValue)
    : null;
}

function roundedCoordinate(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.round(value * 1_000_000) / 1_000_000;
}

function isTaiwanCoordinate(latitude: number, longitude: number): boolean {
  return (
    latitude >= TAIWAN_BOUNDS.minimumLatitude &&
    latitude <= TAIWAN_BOUNDS.maximumLatitude &&
    longitude >= TAIWAN_BOUNDS.minimumLongitude &&
    longitude <= TAIWAN_BOUNDS.maximumLongitude
  );
}

const ADMINISTRATIVE_AREAS: TaiwanAdministrativeArea[] = [
  '基隆市',
  '臺北市',
  '新北市',
  '桃園市',
  '新竹市',
  '新竹縣',
  '苗栗縣',
  '臺中市',
  '彰化縣',
  '南投縣',
  '雲林縣',
  '嘉義市',
  '嘉義縣',
  '臺南市',
  '高雄市',
  '屏東縣',
  '宜蘭縣',
  '花蓮縣',
  '臺東縣',
  '澎湖縣',
  '金門縣',
  '連江縣',
];

function normalizeTaiwanText(value: string): string {
  return value.trim().replaceAll('台', '臺');
}

function administrativeAreaFor(properties: RecordValue): TaiwanAdministrativeArea | undefined {
  const values = [properties.state, properties.city, properties.county, properties.district]
    .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
    .map(normalizeTaiwanText);
  return ADMINISTRATIVE_AREAS.find((area) => values.some((value) => value.includes(area)));
}

function hasTaiwanCountryCode(properties: RecordValue): boolean {
  const countryCode = properties.countrycode ?? properties.country_code;
  return typeof countryCode !== 'string' || countryCode.trim() === '' || countryCode.trim().toLowerCase() === 'tw';
}

function featureResult(feature: unknown, index: number): GeocodingResult | null {
  const record = asRecord(feature);
  const properties = asRecord(record?.properties);
  const geometry = asRecord(record?.geometry);
  const coordinates = geometry?.coordinates;
  if (!properties || !hasTaiwanCountryCode(properties) || !Array.isArray(coordinates)) return null;

  const longitude = roundedCoordinate(coordinates[0]);
  const latitude = roundedCoordinate(coordinates[1]);
  const name = typeof properties.name === 'string' ? properties.name.trim().slice(0, 160) : '';
  if (!name || longitude === null || latitude === null || !isTaiwanCoordinate(latitude, longitude)) {
    return null;
  }

  const osmType = typeof properties.osm_type === 'string' ? properties.osm_type.trim() : '';
  const osmId = typeof properties.osm_id === 'string' || typeof properties.osm_id === 'number'
    ? String(properties.osm_id).trim()
    : '';
  return {
    id: osmType && osmId ? `${osmType}:${osmId}`.slice(0, 160) : `photon-${index + 1}`,
    name,
    ...(administrativeAreaFor(properties) ? { administrativeArea: administrativeAreaFor(properties) } : {}),
    latitude,
    longitude,
  };
}

/** Parses Photon GeoJSON and drops any result outside the Taiwan product boundary. */
export function parsePhotonResponse(payload: unknown): GeocodingResult[] {
  try {
    const root = asRecord(payload);
    if (!root || !Array.isArray(root.features)) throw unavailable();
    return root.features
      .map(featureResult)
      .filter((result): result is GeocodingResult => result !== null)
      .slice(0, 8);
  } catch {
    throw unavailable();
  }
}

export class PhotonGeocodingAdapter implements GeocodingAdapter {
  private readonly fetcher: typeof fetch;

  constructor(private readonly options: PhotonGeocodingAdapterOptions) {
    this.fetcher = options.fetcher ?? fetch;
  }

  async search(request: GeocodingSearchRequest): Promise<GeocodingSearchResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 5_000);
    try {
      const endpoint = new URL(this.options.endpoint);
      endpoint.searchParams.set('q', request.query);
      endpoint.searchParams.set('limit', '8');
      endpoint.searchParams.set('lang', 'zh');
      endpoint.searchParams.set(
        'bbox',
        `${TAIWAN_BOUNDS.minimumLongitude},${TAIWAN_BOUNDS.minimumLatitude},${TAIWAN_BOUNDS.maximumLongitude},${TAIWAN_BOUNDS.maximumLatitude}`,
      );
      const response = await this.fetcher(endpoint.toString(), {
        headers: { accept: 'application/json' },
        signal: controller.signal,
      });
      if (!response.ok) throw unavailable();
      const payload = (await response.json().catch(() => null)) as unknown;
      return GeocodingSearchResponseSchema.parse({
        results: parsePhotonResponse(payload),
        provenance: 'live',
        provider: 'photon',
        attribution: PHOTON_ATTRIBUTION,
      });
    } catch {
      throw unavailable();
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function createPhotonGeocodingAdapter(
  options: PhotonGeocodingAdapterOptions,
): GeocodingAdapter {
  return new PhotonGeocodingAdapter(options);
}
