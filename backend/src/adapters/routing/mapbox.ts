import {
  RouteResponseSchema,
  type RouteAlternative,
  type RouteMode,
  type RouteRequest,
  type RouteResponse,
  type RouteStep,
} from '@airme/contracts';

import type { RoutingAdapter } from './types';

const ROUTING_UNAVAILABLE = 'ROUTING_UNAVAILABLE';
const MAPBOX_ATTRIBUTION = '© Mapbox；資料 © OpenStreetMap contributors；路線計算：Mapbox';

export interface MapboxRoutingAdapterOptions {
  apiBaseUrl: string;
  accessToken: string | null;
  timeoutMs?: number;
  fetcher?: typeof fetch;
  now?: () => Date;
}

type RecordValue = Record<string, unknown>;

function unavailable(): Error {
  return new Error(ROUTING_UNAVAILABLE);
}

function asRecord(value: unknown): RecordValue | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as RecordValue : null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function roundedCoordinate(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.round(value * 1_000_000) / 1_000_000;
}

function profileFor(mode: RouteMode): 'walking' | 'cycling' | 'driving' {
  if (mode === 'walking') return 'walking';
  if (mode === 'cycling') return 'cycling';
  return 'driving';
}

function coordinatesFor(route: RecordValue): [number, number][] {
  const geometry = asRecord(route.geometry);
  const raw = geometry?.coordinates;
  if (!Array.isArray(raw)) throw unavailable();
  const coordinates = raw.map((point) => {
    if (!Array.isArray(point)) throw unavailable();
    const longitude = roundedCoordinate(point[0]);
    const latitude = roundedCoordinate(point[1]);
    if (longitude === null || latitude === null) throw unavailable();
    return [longitude, latitude] as [number, number];
  });
  if (coordinates.length < 2 || coordinates.length > 5_000) throw unavailable();
  return coordinates;
}

function stepsFor(route: RecordValue): RouteStep[] {
  const legs = Array.isArray(route.legs) ? route.legs.map(asRecord).filter((leg): leg is RecordValue => leg !== null) : [];
  const steps = legs.flatMap((leg) => Array.isArray(leg.steps) ? leg.steps.map(asRecord).filter((step): step is RecordValue => step !== null) : [])
    .map((step) => {
      const maneuver = asRecord(step.maneuver);
      const instruction = maneuver?.instruction;
      const distanceMeters = finiteNumber(step.distance);
      const durationSeconds = finiteNumber(step.duration);
      if (typeof instruction !== 'string' || !instruction.trim() || distanceMeters === null || durationSeconds === null) {
        throw unavailable();
      }
      return { instruction: instruction.trim().slice(0, 240), distanceMeters: Math.round(distanceMeters), durationSeconds: Math.round(durationSeconds) };
    });
  if (steps.length === 0 || steps.length > 80) throw unavailable();
  return steps;
}

function alternativeFor(route: RecordValue, index: number): RouteAlternative {
  const distanceMeters = finiteNumber(route.distance);
  const durationSeconds = finiteNumber(route.duration);
  if (distanceMeters === null || durationSeconds === null) throw unavailable();
  return {
    id: `mapbox-${index + 1}`,
    distanceMeters: Math.round(distanceMeters),
    durationSeconds: Math.round(durationSeconds),
    coordinates: coordinatesFor(route),
    steps: stepsFor(route),
  };
}

/** Converts a Mapbox Directions GeoJSON response into the public, provider-independent contract. */
export function parseMapboxRouteResponse(payload: unknown, request: RouteRequest, generatedAt: Date): RouteResponse {
  try {
    const root = asRecord(payload);
    if (!root || !Array.isArray(root.routes)) throw unavailable();
    const alternatives = root.routes.map(asRecord).filter((route): route is RecordValue => route !== null)
      .slice(0, request.alternatives).map(alternativeFor);
    if (alternatives.length === 0) throw unavailable();
    return RouteResponseSchema.parse({
      origin: request.origin,
      destination: request.destination,
      mode: request.mode,
      alternatives,
      generatedAt: generatedAt.toISOString(),
      provenance: 'live',
      provider: 'mapbox',
      attribution: MAPBOX_ATTRIBUTION,
    });
  } catch {
    throw unavailable();
  }
}

export class MapboxRoutingAdapter implements RoutingAdapter {
  private readonly fetcher: typeof fetch;

  constructor(private readonly options: MapboxRoutingAdapterOptions) {
    this.fetcher = options.fetcher ?? fetch;
  }

  async route(request: RouteRequest): Promise<RouteResponse> {
    if (!this.options.accessToken) throw unavailable();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 5_000);
    try {
      const points = `${request.origin.longitude},${request.origin.latitude};${request.destination.longitude},${request.destination.latitude}`;
      const endpoint = new URL(`${this.options.apiBaseUrl.replace(/\/$/, '')}/directions/v5/mapbox/${profileFor(request.mode)}/${points}`);
      endpoint.searchParams.set('access_token', this.options.accessToken);
      endpoint.searchParams.set('alternatives', request.alternatives > 1 ? 'true' : 'false');
      endpoint.searchParams.set('geometries', 'geojson');
      endpoint.searchParams.set('overview', 'full');
      endpoint.searchParams.set('steps', 'true');
      endpoint.searchParams.set('language', 'zh-TW');
      const response = await this.fetcher(endpoint.toString(), { headers: { accept: 'application/json' }, signal: controller.signal });
      if (!response.ok) throw unavailable();
      const payload = await response.json().catch(() => null) as unknown;
      return parseMapboxRouteResponse(payload, request, (this.options.now ?? (() => new Date()))());
    } catch {
      throw unavailable();
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function createMapboxRoutingAdapter(options: MapboxRoutingAdapterOptions): RoutingAdapter {
  return new MapboxRoutingAdapter(options);
}
