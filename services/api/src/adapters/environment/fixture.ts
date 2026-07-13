import type { EnvironmentSnapshot, Location } from '@airme/contracts';

const FIXTURE_OBSERVED_AT = '2026-07-13T08:00:00.000Z';

export function getEnvironmentFixture(location: Location): EnvironmentSnapshot {
  return {
    location,
    airQuality: {
      aqi: 118,
      category: 'unhealthy-sensitive',
      primaryPollutant: '細懸浮微粒',
    },
    weather: {
      summary: '決賽示範：多雲，午後短暫陣雨',
      temperatureC: 31,
      rainProbability: 40,
    },
    sources: [
      {
        provider: 'airme-fixture',
        label: 'AirMe 決賽示範資料',
        url: 'https://example.invalid/airme-fixture',
        observedAt: FIXTURE_OBSERVED_AT,
        fetchedAt: FIXTURE_OBSERVED_AT,
        stale: false,
      },
    ],
    provenance: 'fixture',
  };
}
