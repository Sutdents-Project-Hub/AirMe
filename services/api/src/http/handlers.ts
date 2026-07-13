import type { HttpRequest, HttpResponseInit } from '@azure/functions';
import {
  DataModeSchema,
  FollowUpRequestSchema,
  LocationSchema,
  RecommendationRequestSchema,
  type EnvironmentSnapshot,
  type FollowUpRequest,
  type FollowUpResponse,
  type RecommendationRequest,
  type RecommendationResponse,
} from '@airme/contracts';
import { ZodError } from 'zod';

import { ContextTokenError } from '../domain/context-token';
import { corsHeaders } from './cors';
import { errorResponse, jsonResponse } from './respond';

interface ApiHandlerDependencies {
  allowedOrigins: string[];
  getEnvironment: (
    location: RecommendationRequest['location'],
    mode: RecommendationRequest['dataMode'],
  ) => Promise<EnvironmentSnapshot>;
  createRecommendation: (request: RecommendationRequest) => Promise<RecommendationResponse>;
  answerFollowUp: (request: FollowUpRequest) => Promise<FollowUpResponse>;
  requestId?: () => string;
}

export interface ApiHandlers {
  health(request: HttpRequest): Promise<HttpResponseInit>;
  environment(request: HttpRequest): Promise<HttpResponseInit>;
  recommendations(request: HttpRequest): Promise<HttpResponseInit>;
  followUps(request: HttpRequest): Promise<HttpResponseInit>;
}

async function readJson(request: HttpRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ZodError([]);
  }
}

export function createApiHandlers(deps: ApiHandlerDependencies): ApiHandlers {
  const requestId = () => (deps.requestId ?? (() => crypto.randomUUID()))();

  async function execute(
    request: HttpRequest,
    action: (headers: Record<string, string>) => Promise<HttpResponseInit>,
  ): Promise<HttpResponseInit> {
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
      const message = error instanceof Error ? error.message : '';
      const domainCodes = ['OUT_OF_SCOPE', 'MEDICAL_BOUNDARY', 'URGENT_SAFETY'] as const;
      const domainCode = domainCodes.find((code) => code === message);
      if (domainCode) {
        return errorResponse({
          status: 422,
          code: domainCode,
          message: '這個問題超出 AirMe 的空品與活動安全範圍。',
          retryable: false,
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
      execute(request, async (headers) =>
        jsonResponse(200, { status: 'ok', service: 'airme-api' }, headers),
      ),
    environment: (request) =>
      execute(request, async (headers) => {
        if (request.method.toUpperCase() !== 'GET') throw new ZodError([]);
        const location = LocationSchema.parse({
          name: request.query.get('name'),
          latitude: Number(request.query.get('lat')),
          longitude: Number(request.query.get('lng')),
        });
        const mode = DataModeSchema.parse(request.query.get('mode') ?? 'live');
        return jsonResponse(200, await deps.getEnvironment(location, mode), headers);
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
  };
}
