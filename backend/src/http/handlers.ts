import {
  ActivityIntentRequestSchema,
  ProfileUnderstandingRequestSchema,
  CloudStateResponseSchema,
  CloudSyncStateSchema,
  LoginRequestSchema,
  RegisterRequestSchema,
  EnvironmentRequestSchema,
  FollowUpRequestSchema,
  GeocodingSearchRequestSchema,
  RecommendationRequestSchema,
  RouteRequestSchema,
  type ActivityIntentRequest,
  type ActivityIntentResponse,
  type ProfileUnderstandingRequest,
  type ProfileUnderstandingResponse,
  type CloudStateResponse,
  type CloudSyncState,
  type EnvironmentSnapshot,
  type FollowUpRequest,
  type FollowUpResponse,
  type GeocodingSearchRequest,
  type GeocodingSearchResponse,
  type RecommendationRequest,
  type RecommendationResponse,
  type RouteRequest,
  type RouteResponse,
} from '@airme/contracts';
import { ZodError } from 'zod';

import { ContextTokenError } from '../domain/context-token';
import { AccountAuthError, extractBearerToken, type AccountAuthService } from '../domain/account-auth';
import { FIXED_SAFETY_MESSAGES } from '../domain/safety';
import { corsHeaders } from './cors';
import { errorResponse, jsonResponse, type HttpResponse } from './respond';

export interface ApiRequest {
  method: string;
  headers: Headers;
  url: string;
  json(): Promise<unknown>;
}

interface ApiHandlerDependencies {
  allowedOrigins: string[];
  understandActivity: (request: ActivityIntentRequest) => Promise<ActivityIntentResponse>;
  understandProfile: (request: ProfileUnderstandingRequest) => Promise<ProfileUnderstandingResponse>;
  getEnvironment: (
    location: RecommendationRequest['location'],
    mode: RecommendationRequest['dataMode'],
  ) => Promise<EnvironmentSnapshot>;
  createRecommendation: (request: RecommendationRequest) => Promise<RecommendationResponse>;
  answerFollowUp: (request: FollowUpRequest) => Promise<FollowUpResponse>;
  getRoute?: (request: RouteRequest) => Promise<RouteResponse>;
  searchPlaces?: (request: GeocodingSearchRequest) => Promise<GeocodingSearchResponse>;
  auth?: Pick<AccountAuthService, 'register' | 'login' | 'getSession' | 'logout' | 'deleteAccount'>;
  cloudState?: {
    get(token: string | null): Promise<CloudStateResponse>;
    save(token: string | null, state: CloudSyncState): Promise<CloudStateResponse>;
  };
  isReady?: () => Promise<boolean>;
  requestId?: () => string;
}

export interface ApiHandlers {
  health(request: ApiRequest): Promise<HttpResponse>;
  environment(request: ApiRequest): Promise<HttpResponse>;
  activityIntents(request: ApiRequest): Promise<HttpResponse>;
  profileUnderstandings(request: ApiRequest): Promise<HttpResponse>;
  recommendations(request: ApiRequest): Promise<HttpResponse>;
  followUps(request: ApiRequest): Promise<HttpResponse>;
  register(request: ApiRequest): Promise<HttpResponse>;
  login(request: ApiRequest): Promise<HttpResponse>;
  session(request: ApiRequest): Promise<HttpResponse>;
  logout(request: ApiRequest): Promise<HttpResponse>;
  deleteAccount(request: ApiRequest): Promise<HttpResponse>;
  getCloudState(request: ApiRequest): Promise<HttpResponse>;
  saveCloudState(request: ApiRequest): Promise<HttpResponse>;
  routes(request: ApiRequest): Promise<HttpResponse>;
  geocodingSearch(request: ApiRequest): Promise<HttpResponse>;
}

async function readJson(request: ApiRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ZodError([]);
  }
}

export function createApiHandlers(deps: ApiHandlerDependencies): ApiHandlers {
  const requestId = () => (deps.requestId ?? (() => crypto.randomUUID()))();

  async function execute(
    request: ApiRequest,
    action: (headers: Record<string, string>) => Promise<HttpResponse>,
  ): Promise<HttpResponse> {
    const headers = corsHeaders(request, deps.allowedOrigins);
    if (request.method.toUpperCase() === 'OPTIONS') return { status: 204, headers };
    try {
      return await action(headers);
    } catch (error) {
      const id = requestId();
      if (error instanceof ZodError) {
        return errorResponse({
          status: 400,
          code: 'INVALID_REQUEST',
          message: '請檢查輸入內容。',
          retryable: false,
          requestId: id,
          headers,
        });
      }
      if (error instanceof ContextTokenError) {
        return errorResponse({
          status: error.reason === 'expired' ? 410 : 400,
          code: 'CONTEXT_EXPIRED',
          message: '這次建議的追問時間已結束，請重新產生行動卡。',
          retryable: false,
          requestId: id,
          headers,
        });
      }
      if (error instanceof AccountAuthError) {
        const authErrors = {
          'email-exists': {
            status: 409,
            code: 'AUTH_EMAIL_EXISTS',
            message: '此 Email 已註冊，請直接登入。',
            retryable: false,
          },
          'invalid-credentials': {
            status: 401,
            code: 'AUTH_INVALID_CREDENTIALS',
            message: 'Email 或密碼錯誤。',
            retryable: false,
          },
          'session-expired': {
            status: 401,
            code: 'AUTH_SESSION_EXPIRED',
            message: '登入狀態已失效，請重新登入。',
            retryable: false,
          },
          unavailable: {
            status: 503,
            code: 'AUTH_UNAVAILABLE',
            message: '帳號服務暫時無法使用，請稍後再試。',
            retryable: true,
          },
        } as const;
        const authError = authErrors[error.reason];
        return errorResponse({ ...authError, requestId: id, headers });
      }
      const message = error instanceof Error ? error.message : '';
      const safetyErrors = {
        OUT_OF_SCOPE: { code: 'OUT_OF_SCOPE', message: FIXED_SAFETY_MESSAGES['out-of-scope'] },
        MEDICAL_BOUNDARY: {
          code: 'MEDICAL_BOUNDARY',
          message: FIXED_SAFETY_MESSAGES['medical-boundary'],
        },
        URGENT_SAFETY: { code: 'URGENT_SAFETY', message: FIXED_SAFETY_MESSAGES['urgent-safety'] },
        INJECTION: { code: 'OUT_OF_SCOPE', message: FIXED_SAFETY_MESSAGES.injection },
      } as const;
      const safetyError = safetyErrors[message as keyof typeof safetyErrors];
      if (safetyError) {
        return errorResponse({
          status: 422,
          code: safetyError.code,
          message: safetyError.message,
          retryable: false,
          requestId: id,
          headers,
        });
      }
      if (message === 'ENVIRONMENT_LOCATION_MISMATCH') {
        return errorResponse({
          status: 422,
          code: 'ENVIRONMENT_UNAVAILABLE',
          message: '活動地點和目前選定區域不同，請先在設定更新區域，再重新產生行動卡。',
          retryable: false,
          requestId: id,
          headers,
        });
      }
      if (message === 'RATE_LIMITED') {
        return errorResponse({
          status: 429,
          code: 'RATE_LIMITED',
          message: '目前同時使用人數較多，請稍後再試。',
          retryable: true,
          requestId: id,
          headers,
        });
      }
      if (message === 'ROUTING_UNAVAILABLE') {
        return errorResponse({
          status: 503,
          code: 'ROUTING_UNAVAILABLE',
          message: '路線服務暫時無法使用，請稍後再試或開啟外部地圖。',
          retryable: true,
          requestId: id,
          headers,
        });
      }
      if (message === 'GEOCODING_UNAVAILABLE') {
        return errorResponse({
          status: 503,
          code: 'GEOCODING_UNAVAILABLE',
          message: '地點搜尋服務暫時無法使用，請稍後再試。',
          retryable: true,
          requestId: id,
          headers,
        });
      }
      if (message === 'CLOUD_SYNC_UNAVAILABLE') {
        return errorResponse({
          status: 503,
          code: 'AUTH_UNAVAILABLE',
          message: '雲端同步服務暫時無法使用，裝置上的資料不受影響。',
          retryable: true,
          requestId: id,
          headers,
        });
      }
      return errorResponse({
        status: 500,
        code: 'INTERNAL_ERROR',
        message: '服務暫時無法完成，請稍後再試或使用決賽示範模式。',
        retryable: true,
        requestId: id,
        headers,
      });
    }
  }

  return {
    health: (request) =>
      execute(request, async (headers) => {
        const ready = (await deps.isReady?.()) !== false;
        return jsonResponse(ready ? 200 : 503, { status: ready ? 'ok' : 'unavailable', service: 'airme-api' }, headers);
      }),
    environment: (request) =>
      execute(request, async (headers) => {
        if (request.method.toUpperCase() !== 'POST') throw new ZodError([]);
        const parsed = EnvironmentRequestSchema.parse(await readJson(request));
        return jsonResponse(
          200,
          await deps.getEnvironment(parsed.location, parsed.dataMode),
          headers,
        );
      }),
    activityIntents: (request) =>
      execute(request, async (headers) => {
        if (request.method.toUpperCase() !== 'POST') throw new ZodError([]);
        const parsed = ActivityIntentRequestSchema.parse(await readJson(request));
        return jsonResponse(200, await deps.understandActivity(parsed), headers);
      }),
    profileUnderstandings: (request) =>
      execute(request, async (headers) => {
        if (request.method.toUpperCase() !== 'POST') throw new ZodError([]);
        const parsed = ProfileUnderstandingRequestSchema.parse(await readJson(request));
        return jsonResponse(200, await deps.understandProfile(parsed), headers);
      }),
    recommendations: (request) =>
      execute(request, async (headers) => {
        if (request.method.toUpperCase() !== 'POST') throw new ZodError([]);
        const parsed = RecommendationRequestSchema.parse(await readJson(request));
        return jsonResponse(200, await deps.createRecommendation(parsed), headers);
      }),
    followUps: (request) =>
      execute(request, async (headers) => {
        if (request.method.toUpperCase() !== 'POST') throw new ZodError([]);
        const parsed = FollowUpRequestSchema.parse(await readJson(request));
        return jsonResponse(200, await deps.answerFollowUp(parsed), headers);
      }),
    register: (request) =>
      execute(request, async (headers) => {
        if (request.method.toUpperCase() !== 'POST') throw new ZodError([]);
        const parsed = RegisterRequestSchema.parse(await readJson(request));
        if (!deps.auth) throw new AccountAuthError('unavailable');
        return jsonResponse(201, await deps.auth.register(parsed), headers);
      }),
    login: (request) =>
      execute(request, async (headers) => {
        if (request.method.toUpperCase() !== 'POST') throw new ZodError([]);
        const parsed = LoginRequestSchema.parse(await readJson(request));
        if (!deps.auth) throw new AccountAuthError('unavailable');
        return jsonResponse(200, await deps.auth.login(parsed), headers);
      }),
    session: (request) =>
      execute(request, async (headers) => {
        if (request.method.toUpperCase() !== 'GET') throw new ZodError([]);
        if (!deps.auth) throw new AccountAuthError('unavailable');
        return jsonResponse(
          200,
          await deps.auth.getSession(extractBearerToken(request.headers.get('authorization'))),
          headers,
        );
      }),
    logout: (request) =>
      execute(request, async (headers) => {
        if (request.method.toUpperCase() !== 'POST') throw new ZodError([]);
        if (!deps.auth) throw new AccountAuthError('unavailable');
        await deps.auth.logout(extractBearerToken(request.headers.get('authorization')));
        return jsonResponse(204, undefined, headers);
      }),
    deleteAccount: (request) =>
      execute(request, async (headers) => {
        if (request.method.toUpperCase() !== 'DELETE') throw new ZodError([]);
        if (!deps.auth) throw new AccountAuthError('unavailable');
        await deps.auth.deleteAccount(extractBearerToken(request.headers.get('authorization')));
        return jsonResponse(204, undefined, headers);
      }),
    getCloudState: (request) =>
      execute(request, async (headers) => {
        if (request.method.toUpperCase() !== 'GET') throw new ZodError([]);
        if (!deps.cloudState) throw new Error('CLOUD_SYNC_UNAVAILABLE');
        const response = await deps.cloudState.get(extractBearerToken(request.headers.get('authorization')));
        return jsonResponse(200, CloudStateResponseSchema.parse(response), headers);
      }),
    saveCloudState: (request) =>
      execute(request, async (headers) => {
        if (request.method.toUpperCase() !== 'PUT') throw new ZodError([]);
        if (!deps.cloudState) throw new Error('CLOUD_SYNC_UNAVAILABLE');
        const state = CloudSyncStateSchema.parse(await readJson(request));
        const response = await deps.cloudState.save(
          extractBearerToken(request.headers.get('authorization')),
          state,
        );
        return jsonResponse(200, CloudStateResponseSchema.parse(response), headers);
      }),
    routes: (request) =>
      execute(request, async (headers) => {
        if (request.method.toUpperCase() !== 'POST') throw new ZodError([]);
        const parsed = RouteRequestSchema.parse(await readJson(request));
        if (!deps.getRoute) throw new Error('ROUTING_UNAVAILABLE');
        return jsonResponse(200, await deps.getRoute(parsed), headers);
      }),
    geocodingSearch: (request) =>
      execute(request, async (headers) => {
        if (request.method.toUpperCase() !== 'POST') throw new ZodError([]);
        const parsed = GeocodingSearchRequestSchema.parse(await readJson(request));
        if (!deps.searchPlaces) throw new Error('GEOCODING_UNAVAILABLE');
        return jsonResponse(200, await deps.searchPlaces(parsed), headers);
      }),
  };
}
