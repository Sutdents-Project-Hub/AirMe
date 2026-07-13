import {
  HttpRequest,
  type HttpRequestInit,
  type HttpResponseInit,
} from '@azure/functions';
import type {
  EnvironmentSnapshot,
  FollowUpResponse,
  RecommendationResponse,
} from '@airme/contracts';
import { describe, expect, it, vi } from 'vitest';

import { ContextTokenError } from '../domain/context-token';
import { createApiHandlers } from '../http/handlers';

const environment: EnvironmentSnapshot = {
  location: { name: '高雄市前鎮區', latitude: 22.6, longitude: 120.31 },
  airQuality: { aqi: 118, category: 'unhealthy-sensitive', primaryPollutant: '細懸浮微粒' },
  weather: { summary: '多雲短暫雨', temperatureC: 30, rainProbability: 40 },
  sources: [
    {
      provider: 'airme-fixture',
      label: 'AirMe 決賽示範資料',
      url: 'https://example.invalid/airme-fixture',
      observedAt: '2026-07-13T02:00:00.000Z',
      fetchedAt: '2026-07-13T02:00:00.000Z',
      stale: false,
    },
  ],
  provenance: 'fixture',
};

const recommendation: RecommendationResponse = {
  actionCard: {
    riskLevel: 'high',
    headline: '今天建議改成低強度室內活動。',
    recommendedPlan: {
      timing: '下午四點前確認最新資料。',
      location: '室內通風管理空間。',
      intensity: '低強度走路。',
      equipment: ['飲水'],
    },
    why: ['AQI 118。'],
    safetyNotes: ['明顯不適就停止。'],
    environment,
    provenance: {
      overall: 'fixture',
      environmentMode: 'fixture',
      aiMode: 'fixture',
      rulesVersion: 'moe-school-aqi-2026.1',
    },
  },
  contextToken: 'signed-context-token',
  requestId: 'req_service',
};

const followUp: FollowUpResponse = {
  disposition: 'answered',
  answer: '改成室內低強度走路較合適。',
  suggestedQuestions: [],
  requestId: 'req_follow',
};

function request(init: HttpRequestInit): HttpRequest {
  return new HttpRequest({ url: 'http://localhost/api/test', ...init });
}

function body(value: unknown): HttpRequestInit['body'] {
  return { string: JSON.stringify(value) };
}

function createHandlers(overrides: Record<string, unknown> = {}) {
  return createApiHandlers({
    allowedOrigins: ['http://localhost:8081'],
    getEnvironment: vi.fn().mockResolvedValue(environment),
    createRecommendation: vi.fn().mockResolvedValue(recommendation),
    answerFollowUp: vi.fn().mockResolvedValue(followUp),
    requestId: () => 'req_http',
    ...overrides,
  });
}

describe('AirMe HTTP handlers', () => {
  it('returns a health response without exposing configuration', async () => {
    const response = await createHandlers().health(request({ method: 'GET' }));

    expect(response.status).toBe(200);
    expect(response.jsonBody).toEqual({ status: 'ok', service: 'airme-api' });
  });

  it('handles an allowed CORS preflight', async () => {
    const response = await createHandlers().recommendations(
      request({ method: 'OPTIONS', headers: { origin: 'http://localhost:8081' } }),
    );

    expect(response.status).toBe(204);
    expect(response.headers).toMatchObject({
      'access-control-allow-origin': 'http://localhost:8081',
    });
  });

  it('returns normalized environment data', async () => {
    const response = await createHandlers().environment(
      request({
        method: 'GET',
        url: 'http://localhost/api/environment?name=高雄市前鎮區&lat=22.6&lng=120.31&mode=fixture',
      }),
    );

    expect(response.status).toBe(200);
    expect(response.jsonBody).toEqual(environment);
  });

  it('rejects an invalid recommendation payload with a stable error', async () => {
    const response = await createHandlers().recommendations(
      request({ method: 'POST', body: body({ activityText: '' }) }),
    );

    expect(response.status).toBe(400);
    expect((response.jsonBody as any).error).toEqual({
      code: 'INVALID_REQUEST',
      message: '請檢查輸入內容。',
      retryable: false,
      requestId: 'req_http',
    });
  });

  it('returns a structured recommendation and allowed origin', async () => {
    const response = await createHandlers().recommendations(
      request({
        method: 'POST',
        headers: { origin: 'http://localhost:8081' },
        body: body({
          activityText: '下午想在操場慢跑',
          profile: { ageGroup: 'teen', sensitiveConditions: [], commuteMode: 'walk' },
          location: environment.location,
          locale: 'zh-TW',
          timeZone: 'Asia/Taipei',
          dataMode: 'fixture',
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.jsonBody).toEqual(recommendation);
    expect(response.headers).toMatchObject({
      'access-control-allow-origin': 'http://localhost:8081',
    });
  });

  it('maps expired context without exposing token details', async () => {
    const response = await createHandlers({
      answerFollowUp: vi.fn().mockRejectedValue(new ContextTokenError('expired')),
    }).followUps(
      request({
        method: 'POST',
        body: body({ question: '改成室內走路可以嗎？', contextToken: 'expired-context-token' }),
      }),
    );

    expect(response.status).toBe(410);
    expect((response.jsonBody as any).error.code).toBe('CONTEXT_EXPIRED');
  });

  it('never returns a provider error body or stack', async () => {
    const response = await createHandlers({
      createRecommendation: vi
        .fn()
        .mockRejectedValue(new Error('provider-secret-body\nstack details')),
    }).recommendations(
      request({
        method: 'POST',
        body: body({
          activityText: '下午想在操場慢跑',
          profile: { ageGroup: 'teen', sensitiveConditions: [], commuteMode: 'walk' },
          location: environment.location,
          locale: 'zh-TW',
          timeZone: 'Asia/Taipei',
          dataMode: 'fixture',
        }),
      }),
    );

    expect(response.status).toBe(500);
    expect(JSON.stringify(response.jsonBody)).not.toContain('provider-secret');
    expect(JSON.stringify(response.jsonBody)).not.toContain('stack');
  });
});

void ({} as HttpResponseInit);
