import type { EnvironmentSnapshot, Location } from '@airme/contracts';

import { fetchJson } from '../../lib/fetch-json';
import type { AirQualityReading, LoadAirQuality } from './types';

interface MoenvLoaderOptions {
  apiKey: string;
  endpoint?: string;
  timeoutMs?: number;
  fetcher?: typeof fetch;
  now?: () => Date;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function field(record: Record<string, unknown>, ...names: string[]): unknown {
  for (const name of names) {
    if (record[name] !== undefined) return record[name];
  }
  return undefined;
}

function taiwanLocalToIso(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const normalized = value.includes('T') ? value : value.trim().replace(' ', 'T');
  const date = new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized) ? normalized : `${normalized}+08:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function categoryForAqi(aqi: number): EnvironmentSnapshot['airQuality']['category'] {
  if (aqi <= 50) return 'good';
  if (aqi <= 100) return 'moderate';
  if (aqi <= 150) return 'unhealthy-sensitive';
  if (aqi <= 200) return 'unhealthy';
  if (aqi <= 300) return 'very-unhealthy';
  return 'hazardous';
}

function normalizeAdministrativeArea(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  return value.trim().replace(/^台/u, '臺');
}

export function parseMoenvResponse(
  payload: unknown,
  location: Location,
  fetchedAt: Date,
): AirQualityReading {
  const root = asRecord(payload);
  const records = root?.records;
  if (!Array.isArray(records)) throw new Error('MOENV_INVALID_RESPONSE');

  const candidates = records
    .map(asRecord)
    .filter((record): record is Record<string, unknown> => record !== null)
    .map((record) => {
      const aqi = Number(field(record, 'aqi', 'AQI'));
      const latitude = Number(field(record, 'latitude', 'Latitude'));
      const longitude = Number(field(record, 'longitude', 'Longitude'));
      const observedAt = taiwanLocalToIso(field(record, 'publishtime', 'PublishTime'));
      const administrativeArea = normalizeAdministrativeArea(field(record, 'county', 'County'));
      return { record, aqi, latitude, longitude, observedAt, administrativeArea };
    })
    .filter(
      (item) =>
        Number.isInteger(item.aqi) &&
        item.aqi >= 0 &&
        item.aqi <= 500 &&
        Number.isFinite(item.latitude) &&
        Number.isFinite(item.longitude) &&
        item.observedAt !== null &&
        (!location.administrativeArea ||
          item.administrativeArea === location.administrativeArea),
    )
    .sort((a, b) => {
      const distanceA =
        (a.latitude - location.latitude) ** 2 + (a.longitude - location.longitude) ** 2;
      const distanceB =
        (b.latitude - location.latitude) ** 2 + (b.longitude - location.longitude) ** 2;
      return distanceA - distanceB;
    });

  const selected = candidates[0];
  if (!selected?.observedAt) throw new Error('MOENV_INVALID_RESPONSE');
  const distanceSquared =
    (selected.latitude - location.latitude) ** 2 +
    (selected.longitude - location.longitude) ** 2;
  if (distanceSquared > 0.25) throw new Error('MOENV_LOCATION_MISMATCH');
  const pollutant = field(selected.record, 'pollutant', 'Pollutant');

  return {
    value: {
      aqi: selected.aqi,
      category: categoryForAqi(selected.aqi),
      primaryPollutant:
        typeof pollutant === 'string' && pollutant.trim() !== '' ? pollutant.trim() : null,
    },
    source: {
      provider: 'moenv',
      label: '環境部空氣品質監測網',
      url: 'https://data.moenv.gov.tw/dataset/detail/AQX_P_432',
      observedAt: selected.observedAt,
      fetchedAt: fetchedAt.toISOString(),
      stale: fetchedAt.getTime() - new Date(selected.observedAt).getTime() > 2 * 60 * 60 * 1_000,
    },
  };
}

export function createMoenvLoader(options: MoenvLoaderOptions): LoadAirQuality {
  return async (location) => {
    const endpoint = new URL(
      options.endpoint ?? 'https://data.moenv.gov.tw/api/v2/aqx_p_432',
    );
    endpoint.searchParams.set('api_key', options.apiKey);
    endpoint.searchParams.set('limit', '1000');
    endpoint.searchParams.set('sort', 'ImportDate desc');
    const now = (options.now ?? (() => new Date()))();
    const payload = await fetchJson(endpoint.toString(), {
      timeoutMs: options.timeoutMs ?? 5_000,
      fetcher: options.fetcher,
    });
    return parseMoenvResponse(payload, location, now);
  };
}
