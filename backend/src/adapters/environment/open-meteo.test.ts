import { describe, expect, it } from 'vitest';

import {
  parseOpenMeteoAirQualityResponse,
  parseOpenMeteoWeatherResponse,
} from './open-meteo';

const fetchedAt = new Date('2026-07-22T02:00:00.000Z');

describe('Open-Meteo environment fallback', () => {
  it('labels modelled US AQI separately from official station data', () => {
    const result = parseOpenMeteoAirQualityResponse(
      { current: { time: '2026-07-22T10:00', us_aqi: 108 } },
      fetchedAt,
    );

    expect(result).toMatchObject({
      value: { aqi: 108, category: 'unhealthy-sensitive', primaryPollutant: null },
      source: { provider: 'open-meteo-air-quality', stale: false },
    });
  });

  it('normalizes weather codes and the nearest precipitation probability', () => {
    const result = parseOpenMeteoWeatherResponse(
      {
        current: { time: '2026-07-22T10:00', temperature_2m: 31.26, weather_code: 61 },
        hourly: { precipitation_probability: [45] },
      },
      fetchedAt,
    );

    expect(result).toMatchObject({
      value: { summary: '有雨', temperatureC: 31.3, rainProbability: 45 },
      source: { provider: 'open-meteo-weather', stale: false },
    });
  });

  it('rejects incomplete fallback payloads instead of making up an AQI', () => {
    expect(() => parseOpenMeteoAirQualityResponse({ current: { us_aqi: 60 } }, fetchedAt)).toThrow(
      'OPEN_METEO_AIR_QUALITY_INVALID_RESPONSE',
    );
  });
});
