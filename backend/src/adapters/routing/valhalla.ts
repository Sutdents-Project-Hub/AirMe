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
const VALHALLA_ATTRIBUTION = '© OpenStreetMap contributors；路線計算：Valhalla';

export interface ValhallaRoutingAdapterOptions {
  /** Full Valhalla route endpoint, for example http://valhalla:8002/route. */
  endpoint: string;
  timeoutMs?: number;
  fetcher?: typeof fetch;
  now?: () => Date;
}

type RecordValue = Record<string, unknown>;

function unavailable(): Error {
  return new Error(ROUTING_UNAVAILABLE);
}

function asRecord(value: unknown): RecordValue | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as RecordValue)
    : null;
}

function finiteNumber(value: unknown): number | null {
  const number =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function rounded(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function hasSameCoordinate(
  left: [number, number] | undefined,
  right: [number, number] | undefined,
): boolean {
  if (!left || !right) return false;
  return left[0] === right[0] && left[1] === right[1];
}

/** Valhalla route shapes use the six-decimal encoded-polyline representation. */
export function decodeValhallaShape(shape: string): [number, number][] {
  const coordinates: [number, number][] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  const readValue = (): number => {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      if (index >= shape.length || shift > 30) throw unavailable();
      byte = shape.charCodeAt(index++) - 63;
      if (byte < 0 || byte > 63) throw unavailable();
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };

  try {
    while (index < shape.length) {
      latitude += readValue();
      longitude += readValue();
      coordinates.push([rounded(longitude / 1_000_000), rounded(latitude / 1_000_000)]);
    }
  } catch {
    throw unavailable();
  }

  if (coordinates.length < 2) throw unavailable();
  return coordinates;
}

function costingFor(mode: RouteMode): 'pedestrian' | 'bicycle' | 'auto' {
  if (mode === 'walking') return 'pedestrian';
  if (mode === 'cycling') return 'bicycle';
  return 'auto';
}

function shapeForTrip(trip: RecordValue, legs: RecordValue[]): [number, number][] {
  const tripShape = typeof trip.shape === 'string' ? trip.shape : null;
  const shapes = tripShape
    ? [tripShape]
    : legs.map((leg) => leg.shape).filter((shape): shape is string => typeof shape === 'string');
  if (shapes.length === 0) throw unavailable();

  return shapes.reduce<[number, number][]>((coordinates, shape) => {
    const next = decodeValhallaShape(shape);
    return coordinates.concat(hasSameCoordinate(coordinates.at(-1), next[0]) ? next.slice(1) : next);
  }, []);
}

function maneuverInstruction(maneuver: RecordValue): string | null {
  for (const key of [
    'verbal_pre_transition_instruction',
    'instruction',
    'verbal_transition_alert_instruction',
  ]) {
    const value = maneuver[key];
    if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 240);
  }
  return null;
}

function stepsForLegs(legs: RecordValue[]): RouteStep[] {
  const steps = legs.flatMap((leg) => {
    const maneuvers = leg.maneuvers;
    if (!Array.isArray(maneuvers)) return [];
    return maneuvers.map(asRecord).filter((item): item is RecordValue => item !== null);
  }).map((maneuver) => {
    const instruction = maneuverInstruction(maneuver);
    const lengthKm = finiteNumber(maneuver.length);
    const durationSeconds = finiteNumber(maneuver.time);
    if (!instruction || lengthKm === null || durationSeconds === null) throw unavailable();
    return {
      instruction,
      distanceMeters: Math.round(lengthKm * 1_000),
      durationSeconds: Math.round(durationSeconds),
    };
  });

  if (steps.length === 0 || steps.length > 80) throw unavailable();
  return steps;
}

function summaryForTrip(
  trip: RecordValue,
  legs: RecordValue[],
): { distanceMeters: number; durationSeconds: number } {
  const summary = asRecord(trip.summary);
  const lengthKm = finiteNumber(summary?.length);
  const durationSeconds = finiteNumber(summary?.time);
  if (lengthKm !== null && durationSeconds !== null) {
    return { distanceMeters: Math.round(lengthKm * 1_000), durationSeconds: Math.round(durationSeconds) };
  }

  const summaries = legs.map((leg) => asRecord(leg.summary));
  const lengths = summaries.map((item) => finiteNumber(item?.length));
  const durations = summaries.map((item) => finiteNumber(item?.time));
  if (
    !lengths.every((value): value is number => value !== null) ||
    !durations.every((value): value is number => value !== null)
  ) {
    throw unavailable();
  }
  return {
    distanceMeters: Math.round(lengths.reduce((total, value) => total + value, 0) * 1_000),
    durationSeconds: Math.round(durations.reduce((total, value) => total + value, 0)),
  };
}

function alternativeForTrip(trip: RecordValue, index: number): RouteAlternative {
  const legs = Array.isArray(trip.legs)
    ? trip.legs.map(asRecord).filter((leg): leg is RecordValue => leg !== null)
    : [];
  if (legs.length === 0) throw unavailable();

  const summary = summaryForTrip(trip, legs);
  return {
    id: `valhalla-${index + 1}`,
    ...summary,
    coordinates: shapeForTrip(trip, legs),
    steps: stepsForLegs(legs),
  };
}

function tripsFromResponse(payload: unknown): RecordValue[] {
  const root = asRecord(payload);
  const primary = asRecord(root?.trip);
  if (!primary) throw unavailable();

  const alternateValues = Array.isArray(root?.alternates) ? root.alternates : [];
  const alternates = alternateValues
    .map((item) => {
      const record = asRecord(item);
      return asRecord(record?.trip) ?? record;
    })
    .filter((item): item is RecordValue => item !== null);
  return [primary, ...alternates];
}

/** Converts a Valhalla /route response into the public, provider-independent contract. */
export function parseValhallaRouteResponse(
  payload: unknown,
  request: RouteRequest,
  generatedAt: Date,
): RouteResponse {
  try {
    const alternatives = tripsFromResponse(payload)
      .slice(0, request.alternatives)
      .map((trip, index) => alternativeForTrip(trip, index));
    if (alternatives.length === 0) throw unavailable();

    return RouteResponseSchema.parse({
      origin: request.origin,
      destination: request.destination,
      mode: request.mode,
      alternatives,
      generatedAt: generatedAt.toISOString(),
      provenance: 'live',
      provider: 'valhalla',
      attribution: VALHALLA_ATTRIBUTION,
    });
  } catch {
    throw unavailable();
  }
}

export class ValhallaRoutingAdapter implements RoutingAdapter {
  private readonly fetcher: typeof fetch;

  constructor(private readonly options: ValhallaRoutingAdapterOptions) {
    this.fetcher = options.fetcher ?? fetch;
  }

  async route(request: RouteRequest): Promise<RouteResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 5_000);
    try {
      const response = await this.fetcher(this.options.endpoint, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          locations: [
            { lat: request.origin.latitude, lon: request.origin.longitude },
            { lat: request.destination.latitude, lon: request.destination.longitude },
          ],
          costing: costingFor(request.mode),
          alternates: request.alternatives - 1,
          units: 'kilometers',
          directions_options: { units: 'kilometers', language: 'zh-TW' },
        }),
      });
      if (!response.ok) throw unavailable();
      const payload = (await response.json().catch(() => null)) as unknown;
      return parseValhallaRouteResponse(payload, request, (this.options.now ?? (() => new Date()))());
    } catch {
      throw unavailable();
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function createValhallaRoutingAdapter(
  options: ValhallaRoutingAdapterOptions,
): RoutingAdapter {
  return new ValhallaRoutingAdapter(options);
}
