import {
  ActivityIntentResponseSchema,
  ApiErrorSchema,
  AuthSessionSchema,
  CloudStateResponseSchema,
  CloudSyncStateSchema,
  EnvironmentSnapshotSchema,
  FollowUpResponseSchema,
  GeocodingSearchResponseSchema,
  RecommendationResponseSchema,
  RouteResponseSchema,
  SessionStatusSchema,
  type AuthSession,
  type CloudStateResponse,
  type CloudSyncState,
  type ActivityIntentRequest,
  type ActivityIntentResponse,
  type DataMode,
  type EnvironmentSnapshot,
  type ErrorCode,
  type FollowUpRequest,
  type FollowUpResponse,
  type GeocodingSearchRequest,
  type GeocodingSearchResponse,
  type Location,
  type RecommendationRequest,
  type RecommendationResponse,
  type LoginRequest,
  type RegisterRequest,
  type RouteRequest,
  type RouteResponse,
  type SessionStatus,
} from '@airme/contracts';
import type { ZodType } from 'zod';

type ClientErrorCode = ErrorCode | 'TIMEOUT' | 'NETWORK_ERROR' | 'INVALID_RESPONSE';

export class AirMeApiError extends Error {
  constructor(
    public readonly code: ClientErrorCode,
    message: string,
    public readonly retryable: boolean,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'AirMeApiError';
  }
}

interface AirMeApiOptions {
  baseUrl: string;
  timeoutMs: number;
  fetcher?: typeof fetch;
}

export interface AirMeApi {
  register(input: RegisterRequest): Promise<AuthSession>;
  login(input: LoginRequest): Promise<AuthSession>;
  getSession(accessToken: string): Promise<SessionStatus>;
  logout(accessToken: string): Promise<void>;
  deleteAccount(accessToken: string): Promise<void>;
  getCloudState(accessToken: string): Promise<CloudStateResponse>;
  saveCloudState(accessToken: string, state: CloudSyncState): Promise<CloudStateResponse>;
  understandActivity(request: ActivityIntentRequest): Promise<ActivityIntentResponse>;
  getEnvironment(location: Location, mode: DataMode): Promise<EnvironmentSnapshot>;
  createRecommendation(request: RecommendationRequest): Promise<RecommendationResponse>;
  followUp(request: FollowUpRequest): Promise<FollowUpResponse>;
  getRoutes(request: RouteRequest): Promise<RouteResponse>;
  searchPlaces(request: GeocodingSearchRequest): Promise<GeocodingSearchResponse>;
}

export function createAirMeApi(options: AirMeApiOptions): AirMeApi {
  const baseUrl = options.baseUrl.replace(/\/+$/, '');
  const fetcher = options.fetcher ?? fetch;

  async function call<T>(path: string, init: RequestInit, schema: ZodType<T>): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
    let response: Response;
    try {
      response = await fetcher(`${baseUrl}/${path}`, { ...init, signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AirMeApiError('TIMEOUT', '連線逾時，請稍後再試。', true);
      }
      throw new AirMeApiError('NETWORK_ERROR', '無法連上 AirMe 服務。', true);
    } finally {
      clearTimeout(timeout);
    }

    let payload: unknown;
    try {
      payload = (await response.json()) as unknown;
    } catch {
      throw new AirMeApiError('INVALID_RESPONSE', '服務回應格式不正確。', true);
    }

    if (!response.ok) {
      const root = typeof payload === 'object' && payload !== null ? payload : {};
      const publicError = ApiErrorSchema.safeParse({
        error: (root as Record<string, unknown>).error,
      });
      if (publicError.success) {
        throw new AirMeApiError(
          publicError.data.error.code,
          publicError.data.error.message,
          publicError.data.error.retryable,
          publicError.data.error.requestId,
        );
      }
      throw new AirMeApiError('INVALID_RESPONSE', '服務暫時無法完成。', response.status >= 500);
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      throw new AirMeApiError('INVALID_RESPONSE', '服務回應未通過安全格式檢查。', true);
    }
    return parsed.data;
  }

  async function callEmpty(path: string, init: RequestInit): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
    let response: Response;
    try {
      response = await fetcher(`${baseUrl}/${path}`, { ...init, signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AirMeApiError('TIMEOUT', '連線逾時，請稍後再試。', true);
      }
      throw new AirMeApiError('NETWORK_ERROR', '無法連上 AirMe 服務。', true);
    } finally {
      clearTimeout(timeout);
    }
    if (response.status === 204) return;
    let payload: unknown = null;
    try {
      payload = (await response.json()) as unknown;
    } catch {
      if (response.ok) return;
    }
    if (!response.ok) {
      const root = typeof payload === 'object' && payload !== null ? payload : {};
      const publicError = ApiErrorSchema.safeParse({
        error: (root as Record<string, unknown>).error,
      });
      if (publicError.success) {
        throw new AirMeApiError(
          publicError.data.error.code,
          publicError.data.error.message,
          publicError.data.error.retryable,
          publicError.data.error.requestId,
        );
      }
      throw new AirMeApiError('INVALID_RESPONSE', '服務暫時無法完成。', response.status >= 500);
    }
  }

  function bearer(accessToken: string): HeadersInit {
    return { authorization: `Bearer ${accessToken}` };
  }

  return {
    register(input) {
      return call(
        'auth/register',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(input),
        },
        AuthSessionSchema,
      );
    },
    login(input) {
      return call(
        'auth/login',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(input),
        },
        AuthSessionSchema,
      );
    },
    getSession(accessToken) {
      return call('auth/session', { method: 'GET', headers: bearer(accessToken) }, SessionStatusSchema);
    },
    logout(accessToken) {
      return callEmpty('auth/logout', { method: 'POST', headers: bearer(accessToken) });
    },
    deleteAccount(accessToken) {
      return callEmpty('auth/account', { method: 'DELETE', headers: bearer(accessToken) });
    },
    getCloudState(accessToken) {
      return call('account/state', { method: 'GET', headers: bearer(accessToken) }, CloudStateResponseSchema);
    },
    saveCloudState(accessToken, state) {
      return call(
        'account/state',
        {
          method: 'PUT',
          headers: { ...bearer(accessToken), 'content-type': 'application/json' },
          body: JSON.stringify(CloudSyncStateSchema.parse(state)),
        },
        CloudStateResponseSchema,
      );
    },
    understandActivity(request) {
      return call(
        'activity-intents',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(request),
        },
        ActivityIntentResponseSchema,
      );
    },
    getEnvironment(location, mode) {
      return call(
        'environment',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ location, dataMode: mode }),
        },
        EnvironmentSnapshotSchema,
      );
    },
    createRecommendation(request) {
      return call(
        'recommendations',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(request),
        },
        RecommendationResponseSchema,
      );
    },
    followUp(request) {
      return call(
        'follow-ups',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(request),
        },
        FollowUpResponseSchema,
      );
    },
    getRoutes(request) {
      return call(
        'routes',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(request),
        },
        RouteResponseSchema,
      );
    },
    searchPlaces(request) {
      return call(
        'geocoding/search',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(request),
        },
        GeocodingSearchResponseSchema,
      );
    },
  };
}

export const airMeApi = createAirMeApi({
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api',
  timeoutMs: Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS) || 22_000,
});
