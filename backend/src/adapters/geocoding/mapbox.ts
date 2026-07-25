import {
  GeocodingSearchResponseSchema,
  type GeocodingResult,
  type GeocodingSearchRequest,
  type GeocodingSearchResponse,
  type TaiwanAdministrativeArea,
} from '@airme/contracts';

import type { GeocodingAdapter } from './types';

const GEOCODING_UNAVAILABLE = 'GEOCODING_UNAVAILABLE';
const MAPBOX_ATTRIBUTION = '© Mapbox；資料 © OpenStreetMap contributors；地名搜尋：Mapbox';
const TAIWAN_BOUNDS = { minimumLatitude: 21.7, maximumLatitude: 26.5, minimumLongitude: 118, maximumLongitude: 122.5 };

const ADMINISTRATIVE_AREAS: TaiwanAdministrativeArea[] = [
  '基隆市', '臺北市', '新北市', '桃園市', '新竹市', '新竹縣', '苗栗縣', '臺中市', '彰化縣',
  '南投縣', '雲林縣', '嘉義市', '嘉義縣', '臺南市', '高雄市', '屏東縣', '宜蘭縣', '花蓮縣',
  '臺東縣', '澎湖縣', '金門縣', '連江縣',
];

export interface MapboxGeocodingAdapterOptions {
  apiBaseUrl: string;
  accessToken: string | null;
  timeoutMs?: number;
  fetcher?: typeof fetch;
}

type RecordValue = Record<string, unknown>;

function unavailable(): Error {
  return new Error(GEOCODING_UNAVAILABLE);
}

function asRecord(value: unknown): RecordValue | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as RecordValue : null;
}

function roundedCoordinate(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.round(value * 1_000_000) / 1_000_000;
}

function inTaiwan(latitude: number, longitude: number): boolean {
  return latitude >= TAIWAN_BOUNDS.minimumLatitude && latitude <= TAIWAN_BOUNDS.maximumLatitude
    && longitude >= TAIWAN_BOUNDS.minimumLongitude && longitude <= TAIWAN_BOUNDS.maximumLongitude;
}

function normalized(value: string): string {
  return value.trim().replaceAll('台', '臺');
}

function stringValues(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  const record = asRecord(value);
  return record ? Object.values(record).flatMap(stringValues) : [];
}

function administrativeAreaFor(feature: RecordValue): TaiwanAdministrativeArea | undefined {
  const text = stringValues(feature).map(normalized);
  return ADMINISTRATIVE_AREAS.find((area) => text.some((value) => value.includes(area)));
}

function featureResult(feature: unknown, index: number): GeocodingResult | null {
  const record = asRecord(feature);
  const properties = asRecord(record?.properties);
  const geometry = asRecord(record?.geometry);
  const coordinates = geometry?.coordinates;
  if (!record || !Array.isArray(coordinates)) return null;

  const longitude = roundedCoordinate(coordinates[0]);
  const latitude = roundedCoordinate(coordinates[1]);
  const name = [properties?.name_preferred, properties?.name, record.text, record.place_name]
    .find((value): value is string => typeof value === 'string' && value.trim() !== '')
    ?.trim()
    .slice(0, 160);
  const providerId = [properties?.mapbox_id, record.id]
    .find((value): value is string => typeof value === 'string' && value.trim() !== '')
    ?.trim()
    .slice(0, 160);
  if (!name || longitude === null || latitude === null || !inTaiwan(latitude, longitude)) return null;

  return {
    id: providerId ?? `mapbox-${index + 1}`,
    name,
    ...(administrativeAreaFor(record) ? { administrativeArea: administrativeAreaFor(record) } : {}),
    latitude,
    longitude,
  };
}

/** Normalizes Mapbox Search Box results (including POIs) and keeps only the Taiwan product boundary. */
export function parseMapboxGeocodingResponse(payload: unknown): GeocodingResult[] {
  try {
    const root = asRecord(payload);
    if (!root || !Array.isArray(root.features)) throw unavailable();
    return root.features.map(featureResult).filter((result): result is GeocodingResult => result !== null).slice(0, 8);
  } catch {
    throw unavailable();
  }
}

export class MapboxGeocodingAdapter implements GeocodingAdapter {
  private readonly fetcher: typeof fetch;

  constructor(private readonly options: MapboxGeocodingAdapterOptions) {
    this.fetcher = options.fetcher ?? fetch;
  }

  async search(request: GeocodingSearchRequest): Promise<GeocodingSearchResponse> {
    if (!this.options.accessToken) throw unavailable();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 5_000);
    try {
      const endpoint = new URL(`${this.options.apiBaseUrl.replace(/\/$/, '')}/search/searchbox/v1/forward`);
      endpoint.searchParams.set('q', request.query);
      endpoint.searchParams.set('country', 'tw');
      endpoint.searchParams.set('language', 'zh-TW');
      endpoint.searchParams.set('limit', '8');
      endpoint.searchParams.set('auto_complete', 'false');
      endpoint.searchParams.set('access_token', this.options.accessToken);
      const response = await this.fetcher(endpoint.toString(), { headers: { accept: 'application/json' }, signal: controller.signal });
      if (!response.ok) throw unavailable();
      const payload = await response.json().catch(() => null) as unknown;
      return GeocodingSearchResponseSchema.parse({
        results: parseMapboxGeocodingResponse(payload),
        provenance: 'live',
        provider: 'mapbox',
        attribution: MAPBOX_ATTRIBUTION,
      });
    } catch {
      throw unavailable();
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function createMapboxGeocodingAdapter(options: MapboxGeocodingAdapterOptions): GeocodingAdapter {
  return new MapboxGeocodingAdapter(options);
}
