import type { Location } from '@airme/contracts';

import { fetchJson } from '../../lib/fetch-json';
import type { LoadWeather, WeatherReading } from './types';

interface CwaLoaderOptions {
  apiKey: string;
  endpoint?: string;
  datasetId?: string;
  timeoutMs?: number;
  fetcher?: typeof fetch;
  now?: () => Date;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function taiwanLocalToIso(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const normalized = value.includes('T') ? value : value.trim().replace(' ', 'T');
  const date = new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized) ? normalized : `${normalized}+08:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function firstParameter(element: Record<string, unknown> | undefined): {
  value: string | null;
  startTime: string | null;
} {
  const time = element?.time;
  const first = Array.isArray(time) ? asRecord(time[0]) : null;
  const parameter = asRecord(first?.parameter);
  const raw = parameter?.parameterName;
  return {
    value: typeof raw === 'string' ? raw : null,
    startTime: taiwanLocalToIso(first?.startTime),
  };
}

export function parseCwaResponse(
  payload: unknown,
  location: Location,
  fetchedAt: Date,
): WeatherReading {
  const root = asRecord(payload);
  const records = asRecord(root?.records);
  const locations = records?.location;
  if (!Array.isArray(locations)) throw new Error('CWA_INVALID_RESPONSE');

  const cityName = location.name.match(/^(.*?[縣市])/)?.[1] ?? location.name;
  const selected = locations
    .map(asRecord)
    .filter((item): item is Record<string, unknown> => item !== null)
    .find((item) => item.locationName === cityName);
  if (!selected || !Array.isArray(selected.weatherElement)) {
    throw new Error('CWA_INVALID_RESPONSE');
  }

  const elements = new Map<string, Record<string, unknown>>();
  for (const item of selected.weatherElement) {
    const element = asRecord(item);
    if (element && typeof element.elementName === 'string') {
      elements.set(element.elementName, element);
    }
  }

  const wx = firstParameter(elements.get('Wx'));
  const pop = firstParameter(elements.get('PoP12h') ?? elements.get('PoP'));
  const minT = firstParameter(elements.get('MinT'));
  const maxT = firstParameter(elements.get('MaxT'));
  const min = minT.value === null ? Number.NaN : Number(minT.value);
  const max = maxT.value === null ? Number.NaN : Number(maxT.value);
  const rainProbability = pop.value === null ? Number.NaN : Number(pop.value);
  const observedAt = wx.startTime;

  if (!wx.value || !observedAt) throw new Error('CWA_INVALID_RESPONSE');

  return {
    value: {
      summary: wx.value,
      temperatureC: Number.isFinite(min) && Number.isFinite(max) ? Math.round((min + max) / 2) : null,
      rainProbability: Number.isFinite(rainProbability) ? Math.round(rainProbability) : null,
    },
    source: {
      provider: 'cwa',
      label: '中央氣象署開放資料平台',
      url: 'https://opendata.cwa.gov.tw/',
      observedAt,
      fetchedAt: fetchedAt.toISOString(),
      stale: fetchedAt.getTime() - new Date(observedAt).getTime() > 12 * 60 * 60 * 1_000,
    },
  };
}

export function createCwaLoader(options: CwaLoaderOptions): LoadWeather {
  return async (location) => {
    const datasetId = options.datasetId ?? 'F-C0032-001';
    const endpoint = new URL(
      options.endpoint ?? `https://opendata.cwa.gov.tw/api/v1/rest/datastore/${datasetId}`,
    );
    endpoint.searchParams.set('Authorization', options.apiKey);
    endpoint.searchParams.set('format', 'JSON');
    const now = (options.now ?? (() => new Date()))();
    const payload = await fetchJson(endpoint.toString(), {
      timeoutMs: options.timeoutMs ?? 5_000,
      fetcher: options.fetcher,
    });
    return parseCwaResponse(payload, location, now);
  };
}
