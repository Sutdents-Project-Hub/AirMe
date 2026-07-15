import type { RecommendationRequest } from '@airme/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AirMeApiError, createAirMeApi } from './client';

const request: RecommendationRequest = {
  activityText: '下午四點想在操場慢跑 30 分鐘',
  profile: { ageGroup: 'teen', sensitiveConditions: [], commuteMode: 'walk' },
  location: { name: '高雄市前鎮區', latitude: 22.6, longitude: 120.31 },
  locale: 'zh-TW',
  timeZone: 'Asia/Taipei',
  dataMode: 'fixture',
};

const response = {
  actionCard: {
    riskLevel: 'moderate',
    headline: '可以活動，但建議降低強度。',
    recommendedPlan: {
      timing: '下午四點前確認最新 AQI。',
      location: '操場內圈。',
      intensity: '低到中強度。',
      equipment: ['飲水'],
    },
    why: ['AQI 普通。'],
    safetyNotes: ['明顯不適就停止。'],
    environment: {
      location: request.location,
      airQuality: { aqi: 82, category: 'moderate', primaryPollutant: '細懸浮微粒' },
      weather: { summary: '多雲', temperatureC: 30, rainProbability: 40 },
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
    },
    provenance: {
      overall: 'fixture',
      environmentMode: 'fixture',
      aiMode: 'fixture',
      rulesVersion: 'moe-school-aqi-2026.1',
    },
  },
  contextToken: 'signed-context-token',
  requestId: 'req_test',
};

afterEach(() => vi.useRealTimers());

describe('AirMe API client', () => {
  it('validates a structured activity understanding response', async () => {
    let capturedUrl = '';
    const api = createAirMeApi({
      baseUrl: 'http://localhost:7071/api',
      timeoutMs: 1_000,
      fetcher: vi.fn(async (url) => {
        capturedUrl = String(url);
        return new Response(
          JSON.stringify({
            intent: {
              activity: '跑步',
              time: '下午四點',
              location: '操場',
              intensity: 'moderate',
              durationMinutes: 30,
              currentCondition: null,
              userGoal: null,
            },
            missingField: null,
            clarificationQuestion: null,
            provenance: { aiMode: 'fixture' },
          }),
          { status: 200 },
        );
      }),
    });

    const result = await api.understandActivity({
      activityText: '下午四點想跑步 30 分鐘',
      locale: 'zh-TW',
      timeZone: 'Asia/Taipei',
      dataMode: 'fixture',
    });

    expect(capturedUrl).toBe('http://localhost:7071/api/activity-intents');
    expect(result.intent.activity).toBe('跑步');
  });
  it('normalizes the base URL and validates a recommendation response', async () => {
    let capturedUrl = '';
    const api = createAirMeApi({
      baseUrl: 'http://localhost:7071/api/',
      timeoutMs: 1_000,
      fetcher: vi.fn(async (url) => {
        capturedUrl = String(url);
        return new Response(JSON.stringify(response), { status: 200 });
      }),
    });

    const result = await api.createRecommendation(request);

    expect(capturedUrl).toBe('http://localhost:7071/api/recommendations');
    expect(result.requestId).toBe('req_test');
  });

  it('converts a public API error without exposing arbitrary payload fields', async () => {
    const api = createAirMeApi({
      baseUrl: 'http://localhost:7071/api',
      timeoutMs: 1_000,
      fetcher: vi.fn(async () =>
        new Response(
          JSON.stringify({
            error: {
              code: 'INVALID_REQUEST',
              message: '請檢查輸入內容。',
              retryable: false,
              requestId: 'req_error',
            },
            providerStack: 'must not escape',
          }),
          { status: 400 },
        ),
      ),
    });

    await expect(api.createRecommendation(request)).rejects.toEqual(
      expect.objectContaining({
        name: 'AirMeApiError',
        code: 'INVALID_REQUEST',
        message: '請檢查輸入內容。',
      }),
    );
  });

  it('rejects a successful response that violates the shared contract', async () => {
    const api = createAirMeApi({
      baseUrl: 'http://localhost:7071/api',
      timeoutMs: 1_000,
      fetcher: vi.fn(async () => new Response(JSON.stringify({ headline: 'incomplete' }))),
    });

    await expect(api.createRecommendation(request)).rejects.toEqual(
      expect.objectContaining({ code: 'INVALID_RESPONSE' }),
    );
  });

  it('aborts a request after the configured timeout', async () => {
    vi.useFakeTimers();
    const api = createAirMeApi({
      baseUrl: 'http://localhost:7071/api',
      timeoutMs: 100,
      fetcher: vi.fn(
        async (_url, init) =>
          await new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
          }),
      ),
    });

    const pending = api.createRecommendation(request);
    const assertion = expect(pending).rejects.toEqual(
      expect.objectContaining<Partial<AirMeApiError>>({ code: 'TIMEOUT' }),
    );
    await vi.advanceTimersByTimeAsync(101);

    await assertion;
  });
});
