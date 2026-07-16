import type { DataMode, EnvironmentSnapshot, Location } from '@airme/contracts';

import type { EnvironmentCacheEntry } from '../../database/types';
import type { LoadAirQuality, LoadWeather } from './types';

interface EnvironmentServiceOptions {
  loadAirQuality: LoadAirQuality;
  loadWeather: LoadWeather;
  getFixture: (location: Location) => EnvironmentSnapshot;
  now?: () => Date;
  cacheTtlMs?: number;
  staleCacheMaxAgeMs?: number;
  persistentCache?: {
    getEnvironmentCache(cacheKey: string): Promise<EnvironmentCacheEntry | null>;
    setEnvironmentCache(
      cacheKey: string,
      snapshot: EnvironmentSnapshot,
      options?: { preserveStoredAt?: number },
    ): Promise<void>;
  };
}

interface CacheEntry {
  storedAt: number;
  snapshot: EnvironmentSnapshot;
}

const CANONICAL_CACHE_LOCATION_NAME = 'AirMe 粗略位置';

function canonicalizeCachedSnapshot(snapshot: EnvironmentSnapshot): EnvironmentSnapshot {
  return {
    ...snapshot,
    location: {
      ...snapshot.location,
      name: CANONICAL_CACHE_LOCATION_NAME,
    },
  };
}

function applyRequestLocation(
  snapshot: EnvironmentSnapshot,
  location: Location,
): EnvironmentSnapshot {
  return { ...snapshot, location };
}

function staleSource(
  snapshot: EnvironmentSnapshot,
  provider: EnvironmentSnapshot['sources'][number]['provider'],
): EnvironmentSnapshot['sources'][number] | null {
  const source = snapshot.sources.find((item) => item.provider === provider);
  return source ? { ...source, stale: true } : null;
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
    const cacheKey = `${location.administrativeArea ?? 'unknown'}:${location.latitude.toFixed(3)},${location.longitude.toFixed(3)}`;
    let cached = this.cache.get(cacheKey);
    if (!cached && this.options.persistentCache) {
      const stored = await this.options.persistentCache.getEnvironmentCache(cacheKey).catch(() => null);
      if (stored) {
        const canonical = {
          ...stored,
          snapshot: canonicalizeCachedSnapshot(stored.snapshot),
        };
        cached = canonical;
        this.cache.set(cacheKey, canonical);
        if (stored.snapshot.location.name !== CANONICAL_CACHE_LOCATION_NAME) {
          void this.options.persistentCache
            .setEnvironmentCache(cacheKey, canonical.snapshot, {
              preserveStoredAt: stored.storedAt,
            })
            .catch(() => undefined);
        }
      }
    }

    if (cached && nowMs - cached.storedAt <= cacheTtlMs) {
      return applyRequestLocation(cached.snapshot, location);
    }

    const [airResult, weatherResult] = await Promise.allSettled([
      this.options.loadAirQuality(location),
      this.options.loadWeather(location),
    ]);

    if (airResult.status === 'fulfilled' && weatherResult.status === 'fulfilled') {
      const hasStaleSource = airResult.value.source.stale || weatherResult.value.source.stale;
      const snapshot: EnvironmentSnapshot = {
        location,
        airQuality: airResult.value.value,
        weather: weatherResult.value.value,
        sources: [airResult.value.source, weatherResult.value.source],
        provenance: hasStaleSource ? 'partial' : 'live',
      };
      const cachedSnapshot = canonicalizeCachedSnapshot(snapshot);
      const entry = { storedAt: nowMs, snapshot: cachedSnapshot };
      this.cache.set(cacheKey, entry);
      void this.options.persistentCache
        ?.setEnvironmentCache(cacheKey, cachedSnapshot)
        .catch(() => undefined);
      return snapshot;
    }

    const usableStaleCache =
      cached && nowMs - cached.storedAt <= staleCacheMaxAgeMs ? cached : null;

    if (airResult.status === 'rejected' && weatherResult.status === 'rejected') {
      if (!usableStaleCache) return fixture;
      return {
        ...applyRequestLocation(usableStaleCache.snapshot, location),
        provenance: 'partial',
        sources: usableStaleCache.snapshot.sources.map((item) => ({ ...item, stale: true })),
      };
    }

    if (airResult.status === 'rejected') {
      if (weatherResult.status !== 'fulfilled') return fixture;
      const cachedAirSource = usableStaleCache
        ? staleSource(usableStaleCache.snapshot, 'moenv')
        : null;
      if (!usableStaleCache || !cachedAirSource) return fixture;

      return {
        location,
        airQuality: usableStaleCache.snapshot.airQuality,
        weather: weatherResult.value.value,
        sources: [cachedAirSource, weatherResult.value.source],
        provenance: 'partial',
      };
    }

    const cachedWeatherSource = usableStaleCache
      ? staleSource(usableStaleCache.snapshot, 'cwa')
      : null;
    if (usableStaleCache && cachedWeatherSource) {
      return {
        location,
        airQuality: airResult.value.value,
        weather: usableStaleCache.snapshot.weather,
        sources: [airResult.value.source, cachedWeatherSource],
        provenance: 'partial',
      };
    }

    return {
      location,
      airQuality: airResult.value.value,
      weather: fixture.weather,
      sources: [airResult.value.source, ...fixture.sources],
      provenance: 'partial',
    };
  }
}
