import {
  ActivityIntentResponseSchema,
  ApiErrorSchema,
  EnvironmentSnapshotSchema,
  FollowUpResponseSchema,
  RecommendationResponseSchema,
  type ActivityIntentRequest,
  type ActivityIntentResponse,
  type DataMode,
  type EnvironmentSnapshot,
  type ErrorCode,
  type FollowUpRequest,
  type FollowUpResponse,
  type Location,
  type RecommendationRequest,
  type RecommendationResponse,
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
  understandActivity(request: ActivityIntentRequest): Promise<ActivityIntentResponse>;
  getEnvironment(location: Location, mode: DataMode): Promise<EnvironmentSnapshot>;
  createRecommendation(request: RecommendationRequest): Promise<RecommendationResponse>;
  followUp(request: FollowUpRequest): Promise<FollowUpResponse>;
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

  return {
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
  };
}

export const airMeApi = createAirMeApi({
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api',
  timeoutMs: Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS) || 22_000,
});
