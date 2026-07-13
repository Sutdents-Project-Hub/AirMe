import type { EnvironmentSnapshot, RecommendationRequest } from '@airme/contracts';
import { describe, expect, it, vi } from 'vitest';

import type { ActivityRuleResult } from '../../domain/rules';
import { AzureOpenAiAdapter } from './azure-openai';

const request: RecommendationRequest = {
  activityText: '下午四點想在操場慢跑 30 分鐘',
  profile: {
    ageGroup: 'teen',
    sensitiveConditions: ['respiratory-sensitive'],
    commuteMode: 'walk',
  },
  location: { name: '高雄市前鎮區', latitude: 22.6, longitude: 120.31 },
  locale: 'zh-TW',
  timeZone: 'Asia/Taipei',
  dataMode: 'fixture',
};

const environment: EnvironmentSnapshot = {
  location: request.location,
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

const rules: ActivityRuleResult = {
  minimumRiskLevel: 'high',
  reasonCodes: ['SENSITIVE_GROUP'],
  restrictions: ['避免長時間或劇烈戶外活動'],
  rulesVersion: 'moe-school-aqi-2026.1',
};

const draft = {
  riskLevel: 'high',
  headline: '建議降低強度並縮短戶外時間。',
  recommendedPlan: {
    timing: '下午四點前先確認最新 AQI。',
    location: '改到有空調與通風管理的室內空間。',
    intensity: '改為低強度走路 20 分鐘。',
    equipment: ['攜帶飲水'],
  },
  why: ['AQI 對敏感族群不友善。', '你設定了呼吸道敏感條件。'],
  safetyNotes: ['若明顯不適，停止活動並告知身邊成人。'],
};

describe('AzureOpenAiAdapter', () => {
  it('uses Entra ID and requests strict JSON Schema output', async () => {
    let capturedHeaders: HeadersInit | undefined;
    let capturedBody = '';
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      capturedHeaders = init?.headers;
      capturedBody = String(init?.body);
      return new Response(JSON.stringify({ output_text: JSON.stringify(draft) }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    const credential = {
      getToken: vi.fn().mockResolvedValue({ token: 'entra-test-token', expiresOnTimestamp: 0 }),
    };
    const adapter = new AzureOpenAiAdapter({
      endpoint: 'https://example.openai.azure.com',
      deployment: 'gpt-5',
      apiVersion: '2025-04-01-preview',
      timeoutMs: 5_000,
      fetcher,
      credential,
    });

    await adapter.createActionCard({ request, environment, rules });

    expect(new Headers(capturedHeaders).get('authorization')).toBe('Bearer entra-test-token');
    const body = JSON.parse(capturedBody) as Record<string, any>;
    expect(body.model).toBe('gpt-5');
    expect(body.text.format.type).toBe('json_schema');
    expect(body.text.format.strict).toBe(true);
    expect(body.input[1].content).not.toContain('studentId');
  });

  it('uses a backend-only API key when explicitly configured', async () => {
    let capturedHeaders: HeadersInit | undefined;
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      capturedHeaders = init?.headers;
      return new Response(JSON.stringify({ output_text: JSON.stringify(draft) }), { status: 200 });
    });
    const adapter = new AzureOpenAiAdapter({
      endpoint: 'https://example.openai.azure.com',
      deployment: 'gpt-5',
      apiVersion: '2025-04-01-preview',
      apiKey: 'backend-test-placeholder',
      timeoutMs: 5_000,
      fetcher,
    });

    await adapter.createActionCard({ request, environment, rules });

    expect(new Headers(capturedHeaders).get('api-key')).toBe('backend-test-placeholder');
    expect(new Headers(capturedHeaders).has('authorization')).toBe(false);
  });

  it('rejects provider output that does not match the action-card schema', async () => {
    const adapter = new AzureOpenAiAdapter({
      endpoint: 'https://example.openai.azure.com',
      deployment: 'gpt-5',
      apiVersion: '2025-04-01-preview',
      apiKey: 'backend-test-placeholder',
      timeoutMs: 5_000,
      fetcher: vi.fn(async () =>
        new Response(JSON.stringify({ output_text: '{"headline":"missing fields"}' }), {
          status: 200,
        }),
      ),
    });

    await expect(adapter.createActionCard({ request, environment, rules })).rejects.toThrow(
      'AI_INVALID_RESPONSE',
    );
  });

  it('answers a scoped follow-up with minimized signed context', async () => {
    let capturedBody = '';
    const adapter = new AzureOpenAiAdapter({
      endpoint: 'https://example.openai.azure.com',
      deployment: 'gpt-5',
      apiVersion: '2025-04-01-preview',
      apiKey: 'backend-test-placeholder',
      timeoutMs: 5_000,
      fetcher: vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        capturedBody = String(init?.body);
        return new Response(
          JSON.stringify({
            output_text: JSON.stringify({
              answer: '可以，室內低強度走路能避開目前的戶外暴露。',
              suggestedQuestions: ['活動前還要確認什麼？'],
            }),
          }),
          { status: 200 },
        );
      }),
    });

    const result = await adapter.answerFollowUp({
      question: '改成室內走路可以嗎？',
      context: {
        activitySummary: '操場慢跑 30 分鐘',
        locationName: '高雄市前鎮區',
        environment: {
          aqi: 118,
          category: 'unhealthy-sensitive',
          weatherSummary: '多雲短暫雨',
        },
        minimumRiskLevel: 'high',
        restrictions: ['避免長時間或劇烈戶外活動'],
      },
    });

    expect(result.answer).toContain('室內');
    expect(capturedBody).not.toContain('respiratory-sensitive');
    expect(JSON.parse(capturedBody).text.format.type).toBe('json_schema');
  });
});
