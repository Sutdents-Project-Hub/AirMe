import type { EnvironmentSnapshot, Location } from '@airme/contracts';
import { describe, expect, it, vi } from 'vitest';

import type { AirQualityReading, WeatherReading } from './types';
import { EnvironmentService } from './service';

const location: Location = {
  name: '高雄市前鎮區',
  latitude: 22.6,
  longitude: 120.31,
};

function source(provider: 'moenv' | 'cwa' | 'airme-fixture', observedAt: string) {
  return {
    provider,
    label:
      provider === 'moenv'
        ? '環境部空氣品質監測網'
        : provider === 'cwa'
          ? '中央氣象署開放資料平台'
          : 'AirMe 決賽示範資料',
    url:
      provider === 'moenv'
        ? 'https://data.moenv.gov.tw/'
        : provider === 'cwa'
          ? 'https://opendata.cwa.gov.tw/'
          : 'https://example.invalid/airme-fixture',
    observedAt,
    fetchedAt: observedAt,
    stale: false,
  } as const;
}

const airQuality: AirQualityReading = {
  value: { aqi: 82, category: 'moderate', primaryPollutant: '細懸浮微粒' },
  source: source('moenv', '2026-07-13T02:00:00.000Z'),
};

const weather: WeatherReading = {
  value: { summary: '多雲，午後短暫陣雨', temperatureC: 30, rainProbability: 40 },
  source: source('cwa', '2026-07-13T02:00:00.000Z'),
};

const fixture: EnvironmentSnapshot = {
  location,
  airQuality: { aqi: 118, category: 'unhealthy-sensitive', primaryPollutant: '細懸浮微粒' },
  weather: { summary: '決賽示範：多雲', temperatureC: 31, rainProbability: 30 },
  sources: [source('airme-fixture', '2026-07-13T00:00:00.000Z')],
  provenance: 'fixture',
};

describe('EnvironmentService', () => {
  it('combines two successful official sources as live data', async () => {
    const service = new EnvironmentService({
      loadAirQuality: vi.fn().mockResolvedValue(airQuality),
      loadWeather: vi.fn().mockResolvedValue(weather),
      getFixture: () => fixture,
      now: () => new Date('2026-07-13T02:05:00.000Z'),
    });

    const result = await service.getSnapshot(location, 'live');

    expect(result.provenance).toBe('live');
    expect(result.sources.map((item) => item.provider)).toEqual(['moenv', 'cwa']);
    expect(result.airQuality.aqi).toBe(82);
  });

  it('uses only the missing fixture field when one official source fails', async () => {
    const service = new EnvironmentService({
      loadAirQuality: vi.fn().mockRejectedValue(new Error('MOENV timeout')),
      loadWeather: vi.fn().mockResolvedValue(weather),
      getFixture: () => fixture,
      now: () => new Date('2026-07-13T02:05:00.000Z'),
    });

    const result = await service.getSnapshot(location, 'live');

    expect(result.provenance).toBe('partial');
    expect(result.airQuality.aqi).toBe(fixture.airQuality.aqi);
    expect(result.weather.summary).toBe(weather.value.summary);
    expect(result.sources.map((item) => item.provider)).toEqual(['airme-fixture', 'cwa']);
  });

  it('returns a clearly marked fixture when both official sources fail', async () => {
    const service = new EnvironmentService({
      loadAirQuality: vi.fn().mockRejectedValue(new Error('MOENV timeout')),
      loadWeather: vi.fn().mockRejectedValue(new Error('CWA timeout')),
      getFixture: () => fixture,
      now: () => new Date('2026-07-13T02:05:00.000Z'),
    });

    const result = await service.getSnapshot(location, 'live');

    expect(result).toEqual(fixture);
  });

  it('does not call official providers in fixture mode', async () => {
    const loadAirQuality = vi.fn().mockResolvedValue(airQuality);
    const loadWeather = vi.fn().mockResolvedValue(weather);
    const service = new EnvironmentService({
      loadAirQuality,
      loadWeather,
      getFixture: () => fixture,
      now: () => new Date('2026-07-13T02:05:00.000Z'),
    });

    expect(await service.getSnapshot(location, 'fixture')).toEqual(fixture);
    expect(loadAirQuality).not.toHaveBeenCalled();
    expect(loadWeather).not.toHaveBeenCalled();
  });

  it('reuses a fresh cache entry without another provider call', async () => {
    let now = new Date('2026-07-13T02:05:00.000Z');
    const loadAirQuality = vi.fn().mockResolvedValue(airQuality);
    const loadWeather = vi.fn().mockResolvedValue(weather);
    const service = new EnvironmentService({
      loadAirQuality,
      loadWeather,
      getFixture: () => fixture,
      now: () => now,
      cacheTtlMs: 10 * 60 * 1_000,
    });

    await service.getSnapshot(location, 'live');
    now = new Date('2026-07-13T02:10:00.000Z');
    const cached = await service.getSnapshot(location, 'live');

    expect(cached.provenance).toBe('live');
    expect(loadAirQuality).toHaveBeenCalledTimes(1);
    expect(loadWeather).toHaveBeenCalledTimes(1);
  });

  it('uses stale cached data conservatively when refresh fails', async () => {
    let now = new Date('2026-07-13T02:05:00.000Z');
    const loadAirQuality = vi.fn().mockResolvedValueOnce(airQuality);
    const loadWeather = vi.fn().mockResolvedValueOnce(weather);
    const service = new EnvironmentService({
      loadAirQuality,
      loadWeather,
      getFixture: () => fixture,
      now: () => now,
      cacheTtlMs: 60_000,
      staleCacheMaxAgeMs: 30 * 60 * 1_000,
    });

    await service.getSnapshot(location, 'live');
    loadAirQuality.mockRejectedValueOnce(new Error('offline'));
    loadWeather.mockRejectedValueOnce(new Error('offline'));
    now = new Date('2026-07-13T02:07:00.000Z');

    const stale = await service.getSnapshot(location, 'live');

    expect(stale.provenance).toBe('partial');
    expect(stale.sources.every((item) => item.stale)).toBe(true);
    expect(stale.airQuality.aqi).toBe(82);
  });
});
