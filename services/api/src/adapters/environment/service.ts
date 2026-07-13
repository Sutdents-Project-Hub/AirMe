import type { DataMode, EnvironmentSnapshot, Location } from '@airme/contracts';

import type { LoadAirQuality, LoadWeather } from './types';

interface EnvironmentServiceOptions {
  loadAirQuality: LoadAirQuality;
  loadWeather: LoadWeather;
  getFixture: (location: Location) => EnvironmentSnapshot;
  now?: () => Date;
  cacheTtlMs?: number;
  staleCacheMaxAgeMs?: number;
}

interface CacheEntry {
  storedAt: number;
  snapshot: EnvironmentSnapshot;
}

export class EnvironmentService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly options: EnvironmentServiceOptions) {}

  async getSnapshot(location: Location, mode: DataMode): Promise<EnvironmentSnapshot> {
    const fixture = this.options.getFixture(location);
    if (mode === 'fixture') return fixture;

    const nowMs = (this.options.now ?? (() => new Date()))().getTime();
    const cacheTtlMs = this.options.cacheTtlMs ?? 5 * 60 * 1_000;
    const staleCacheMaxAgeMs = this.options.staleCacheMaxAgeMs ?? 30 * 60 * 1_000;
    const cacheKey = `${location.latitude.toFixed(3)},${location.longitude.toFixed(3)}`;
    const cached = this.cache.get(cacheKey);

    if (cached && nowMs - cached.storedAt <= cacheTtlMs) {
      return cached.snapshot;
    }

    const [airResult, weatherResult] = await Promise.allSettled([
      this.options.loadAirQuality(location),
      this.options.loadWeather(location),
    ]);

    if (airResult.status === 'fulfilled' && weatherResult.status === 'fulfilled') {
      const snapshot: EnvironmentSnapshot = {
        location,
        airQuality: airResult.value.value,
        weather: weatherResult.value.value,
        sources: [airResult.value.source, weatherResult.value.source],
        provenance: 'live',
      };
      this.cache.set(cacheKey, { storedAt: nowMs, snapshot });
      return snapshot;
    }

    if (
      airResult.status === 'rejected' &&
      weatherResult.status === 'rejected' &&
      cached &&
      nowMs - cached.storedAt <= staleCacheMaxAgeMs
    ) {
      return {
        ...cached.snapshot,
        provenance: 'partial',
        sources: cached.snapshot.sources.map((item) => ({ ...item, stale: true })),
      };
    }

    if (airResult.status === 'fulfilled' || weatherResult.status === 'fulfilled') {
      const airQuality =
        airResult.status === 'fulfilled' ? airResult.value.value : fixture.airQuality;
      const weather =
        weatherResult.status === 'fulfilled' ? weatherResult.value.value : fixture.weather;
      const sources = [
        airResult.status === 'fulfilled' ? airResult.value.source : fixture.sources[0],
        weatherResult.status === 'fulfilled' ? weatherResult.value.source : fixture.sources[0],
      ].filter(
        (item, index, collection) =>
          collection.findIndex((candidate) => candidate.provider === item.provider) === index,
      );

      return { location, airQuality, weather, sources, provenance: 'partial' };
    }

    return fixture;
  }
}
