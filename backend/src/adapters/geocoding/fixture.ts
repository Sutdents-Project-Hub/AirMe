import type {
  GeocodingResult,
  GeocodingSearchRequest,
  GeocodingSearchResponse,
} from '@airme/contracts';

const FIXTURE_RESULTS: GeocodingResult[] = [
  {
    id: 'fixture-taipei-station',
    name: '臺北車站',
    administrativeArea: '臺北市',
    latitude: 25.047708,
    longitude: 121.517039,
  },
  {
    id: 'fixture-ntu-main-gate',
    name: '國立臺灣大學校總區',
    administrativeArea: '臺北市',
    latitude: 25.01734,
    longitude: 121.539751,
  },
  {
    id: 'fixture-kaohsiung-station',
    name: '高雄車站',
    administrativeArea: '高雄市',
    latitude: 22.639381,
    longitude: 120.302791,
  },
];

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase('zh-TW').replaceAll('台', '臺');
}

/** Deterministic, offline place suggestions for a replayable Demo flow. */
export function getGeocodingFixture(request: GeocodingSearchRequest): GeocodingSearchResponse {
  const query = normalized(request.query);
  const results = FIXTURE_RESULTS.filter((result) =>
    [result.name, result.administrativeArea ?? ''].some((value) => normalized(value).includes(query)),
  );

  return {
    results,
    provenance: 'fixture',
    provider: 'airme-fixture',
    attribution: 'AirMe 固定地點示範資料，非即時地名搜尋。',
  };
}
