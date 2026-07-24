import type { EnvironmentSnapshot, Location } from '@airme/contracts';

import { fetchJson } from '../../lib/fetch-json';
import type { AirQualityReading, LoadAirQuality, LoadWeather, WeatherReading } from './types';

interface OpenMeteoLoaderOptions {
  airQualityEndpoint?: string;
  forecastEndpoint?: string;
  timeoutMs?: number;
  fetcher?: typeof fetch;
  now?: () => Date;
}

type RecordValue = Record<string, unknown>;

const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const AIR_QUALITY_DOCS_URL = 'https://open-meteo.com/en/docs/air-quality-api';
const WEATHER_DOCS_URL = 'https://open-meteo.com/en/docs';

function asRecord(value: unknown): RecordValue | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as RecordValue)
    : null;
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
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

function weatherSummary(code: number): string {
  if (code === 0) return '晴朗';
  if ([1, 2].includes(code)) return '晴時多雲';
  if (code === 3) return '陰天';
  if ([45, 48].includes(code)) return '有霧';
  if ([51, 53, 55, 56, 57].includes(code)) return '毛毛雨';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '有雨';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '降雪';
  if ([95, 96, 99].includes(code)) return '雷雨';
  return '天氣狀況待確認';
}

/**
 * Open-Meteo provides a modelled estimate, not an official Taiwan station observation.
 * It is only a clearly labelled fallback when an official credential or provider is unavailable.
 */
export function parseOpenMeteoAirQualityResponse(
  payload: unknown,
  fetchedAt: Date,
): AirQualityReading {
  const root = asRecord(payload);
  const current = asRecord(root?.current);
  const aqi = finiteNumber(current?.us_aqi);
  const observedAt = taiwanLocalToIso(current?.time);
  if (aqi === null || !Number.isInteger(aqi) || aqi < 0 || aqi > 500 || !observedAt) {
    throw new Error('OPEN_METEO_AIR_QUALITY_INVALID_RESPONSE');
  }

  return {
    value: { aqi, category: categoryForAqi(aqi), primaryPollutant: null },
    source: {
      provider: 'open-meteo-air-quality',
      label: 'Open-Meteo／CAMS 空氣品質模型估算',
      url: AIR_QUALITY_DOCS_URL,
      observedAt,
      fetchedAt: fetchedAt.toISOString(),
      stale: fetchedAt.getTime() - new Date(observedAt).getTime() > 12 * 60 * 60 * 1_000,
    },
  };
}

export function parseOpenMeteoWeatherResponse(payload: unknown, fetchedAt: Date): WeatherReading {
  const root = asRecord(payload);
  const current = asRecord(root?.current);
  const hourly = asRecord(root?.hourly);
  const code = finiteNumber(current?.weather_code);
  const temperature = finiteNumber(current?.temperature_2m);
  const observedAt = taiwanLocalToIso(current?.time);
  const rainValues = hourly?.precipitation_probability;
  const firstRain = Array.isArray(rainValues) ? finiteNumber(rainValues[0]) : null;
  if (
    code === null ||
    !Number.isInteger(code) ||
    temperature === null ||
    !observedAt ||
    (firstRain !== null && (firstRain < 0 || firstRain > 100))
  ) {
    throw new Error('OPEN_METEO_WEATHER_INVALID_RESPONSE');
  }

  return {
    value: {
      summary: weatherSummary(code),
      temperatureC: Math.round(temperature * 10) / 10,
      rainProbability: firstRain === null ? null : Math.round(firstRain),
    },
    source: {
      provider: 'open-meteo-weather',
      label: 'Open-Meteo 天氣模型預報',
      url: WEATHER_DOCS_URL,
      observedAt,
      fetchedAt: fetchedAt.toISOString(),
      stale: fetchedAt.getTime() - new Date(observedAt).getTime() > 12 * 60 * 60 * 1_000,
    },
  };
}

export function createOpenMeteoAirQualityLoader(options: OpenMeteoLoaderOptions = {}): LoadAirQuality {
  return async (location: Location) => {
    const endpoint = new URL(options.airQualityEndpoint ?? AIR_QUALITY_URL);
    endpoint.searchParams.set('latitude', String(location.latitude));
    endpoint.searchParams.set('longitude', String(location.longitude));
    endpoint.searchParams.set('current', 'us_aqi');
    endpoint.searchParams.set('timezone', 'Asia/Taipei');
    const now = (options.now ?? (() => new Date()))();
    const payload = await fetchJson(endpoint.toString(), {
      timeoutMs: options.timeoutMs ?? 5_000,
      fetcher: options.fetcher,
    });
    return parseOpenMeteoAirQualityResponse(payload, now);
  };
}

export function createOpenMeteoWeatherLoader(options: OpenMeteoLoaderOptions = {}): LoadWeather {
  return async (location: Location) => {
    const endpoint = new URL(options.forecastEndpoint ?? FORECAST_URL);
    endpoint.searchParams.set('latitude', String(location.latitude));
    endpoint.searchParams.set('longitude', String(location.longitude));
    endpoint.searchParams.set('current', 'temperature_2m,weather_code');
    endpoint.searchParams.set('hourly', 'precipitation_probability');
    endpoint.searchParams.set('forecast_hours', '1');
    endpoint.searchParams.set('timezone', 'Asia/Taipei');
    const now = (options.now ?? (() => new Date()))();
    const payload = await fetchJson(endpoint.toString(), {
      timeoutMs: options.timeoutMs ?? 5_000,
      fetcher: options.fetcher,
    });
    return parseOpenMeteoWeatherResponse(payload, now);
  };
}
