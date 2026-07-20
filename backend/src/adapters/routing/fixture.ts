import type { RouteAlternative, RouteRequest, RouteResponse } from '@airme/contracts';

const FIXTURE_GENERATED_AT = '2026-07-13T08:00:00.000Z';

const SPEED_METERS_PER_SECOND: Record<RouteRequest['mode'], number> = {
  walking: 1.25,
  cycling: 4.17,
  driving: 8.33,
};

function haversineMeters(
  origin: RouteRequest['origin'],
  destination: RouteRequest['destination'],
): number {
  const radians = Math.PI / 180;
  const latitudeDelta = (destination.latitude - origin.latitude) * radians;
  const longitudeDelta = (destination.longitude - origin.longitude) * radians;
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(origin.latitude * radians) *
      Math.cos(destination.latitude * radians) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function modeLabel(mode: RouteRequest['mode']): string {
  if (mode === 'walking') return '步行';
  if (mode === 'cycling') return '自行車';
  return '開車';
}

function createAlternative(request: RouteRequest, index: number): RouteAlternative {
  // A small deterministic multiplier makes the alternatives visually distinct in the UI while
  // keeping the fixture independent of any real road or personal-location data.
  const distanceMeters = Math.round(haversineMeters(request.origin, request.destination) * (1.12 + index * 0.06));
  const durationSeconds = Math.max(
    60,
    Math.round(distanceMeters / SPEED_METERS_PER_SECOND[request.mode]),
  );

  return {
    id: `fixture-${index + 1}`,
    distanceMeters,
    durationSeconds,
    coordinates: [
      [request.origin.longitude, request.origin.latitude],
      [request.destination.longitude, request.destination.latitude],
    ],
    steps: [
      {
        instruction: `從${request.origin.name}以${modeLabel(request.mode)}出發`,
        distanceMeters,
        durationSeconds,
      },
      {
        instruction: `抵達${request.destination.name}`,
        distanceMeters: 0,
        durationSeconds: 0,
      },
    ],
  };
}

/** A deterministic, offline route used for the replayable competition demo. */
export function getRoutingFixture(request: RouteRequest): RouteResponse {
  return {
    origin: request.origin,
    destination: request.destination,
    mode: request.mode,
    alternatives: Array.from({ length: request.alternatives }, (_, index) =>
      createAlternative(request, index),
    ),
    generatedAt: FIXTURE_GENERATED_AT,
    provenance: 'fixture',
    provider: 'airme-fixture',
    attribution: 'AirMe 固定路線示範資料，非即時導航。',
  };
}
