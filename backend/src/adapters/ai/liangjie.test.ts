import { describe, expect, it, vi } from 'vitest';

import { LiangjieAiAdapter } from './liangjie';

const input = {
  request: {
    activityText: '下午想在操場慢跑',
    profile: { ageGroup: 'teen' as const, sensitiveConditions: [], commuteMode: 'walk' as const },
    location: { name: '高雄市', latitude: 22.627, longitude: 120.301 },
    locale: 'zh-TW' as const,
    timeZone: 'Asia/Taipei',
    dataMode: 'live' as const,
    confirmedIntent: {
      activity: '慢跑',
      time: '下午',
      location: '學校操場',
      intensity: 'moderate' as const,
      durationMinutes: 30,
      currentCondition: null,
      userGoal: null,
    },
  },
  environment: {
    location: { name: '高雄市', latitude: 22.627, longitude: 120.301 },
    airQuality: { aqi: 82, category: 'moderate' as const, primaryPollutant: '細懸浮微粒' },
    weather: { summary: '多雲', temperatureC: 30, rainProbability: 20 },
    sources: [],
    provenance: 'live' as const,
  },
  rules: {
    minimumRiskLevel: 'moderate' as const,
    reasonCodes: ['AQI_2'],
    restrictions: ['降低活動強度'],
    rulesVersion: 'moe-school-aqi-2023-12-18.v1',
  },
};

describe('LiangjieAiAdapter', () => {
  it('uses the documented OpenAI-compatible endpoint and parses a JSON action card', async () => {
    let capturedUrl = '';
    let capturedHeaders: HeadersInit | undefined;
    let capturedBody: Record<string, unknown> | undefined;
    const adapter = new LiangjieAiAdapter({
      baseUrl: 'https://liangjiewis.com/',
      model: 'gemini-2.5-flash',
      apiKey: 'test-key',
      timeoutMs: 1_000,
      fetcher: vi.fn(async (url, init) => {
        capturedUrl = String(url);
        capturedHeaders = init?.headers;
        capturedBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    riskLevel: 'moderate',
                    headline: '降低強度。',
                    recommendedPlan: {
                      timing: '出發前確認資料。',
                      location: '避開車流。',
                      intensity: '低強度。',
                      equipment: ['飲水'],
                    },
                    why: ['AQI 82。'],
                    safetyNotes: ['不適請停止。'],
                  }),
                },
              },
            ],
          }),
        );
      }),
    });

    const result = await adapter.createActionCard(input);

    expect(capturedUrl).toBe('https://liangjiewis.com/v1/chat/completions');
    expect(new Headers(capturedHeaders).get('authorization')).toBe('Bearer test-key');
    expect(capturedBody).toMatchObject({
      model: 'gemini-2.5-flash',
      response_format: { type: 'json_object' },
    });
    const messages = capturedBody?.messages as { role: string; content: string }[];
    const providerInput = JSON.parse(messages[1].content) as Record<string, unknown>;
    expect(providerInput).toMatchObject({
      activity: { activity: '慢跑', locationType: '操場' },
      profileContext: { ageGroup: 'teen', sensitiveConditions: [] },
      selectedArea: '粗略區域已由後端比對',
    });
    expect(messages[1].content).not.toContain('22.627');
    expect(messages[1].content).not.toContain('120.301');
    expect(messages[1].content).not.toContain('高雄市');
    expect(result.riskLevel).toBe('moderate');
  });

  it('does not leak an upstream error body', async () => {
    const adapter = new LiangjieAiAdapter({
      baseUrl: 'https://liangjiewis.com',
      model: 'gemini-2.5-flash',
      apiKey: 'test-key',
      timeoutMs: 1_000,
      fetcher: vi.fn(async () => new Response('provider secret details', { status: 500 })),
    });

    await expect(adapter.createActionCard(input)).rejects.toThrow('AI_UNAVAILABLE');
  });

  it('retries without response_format when an OpenAI-compatible model rejects it in auto mode', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response('unsupported response_format', { status: 400 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    riskLevel: 'moderate',
                    headline: '降低強度。',
                    recommendedPlan: {
                      timing: '出發前確認資料。',
                      location: '避開車流。',
                      intensity: '低強度。',
                      equipment: ['飲水'],
                    },
                    why: ['AQI 82。'],
                    safetyNotes: ['不適請停止。'],
                  }),
                },
              },
            ],
          }),
        ),
      );
    const adapter = new LiangjieAiAdapter({
      baseUrl: 'https://liangjiewis.com',
      model: 'gemini-2.5-flash',
      apiKey: 'test-key',
      timeoutMs: 1_000,
      jsonMode: 'auto',
      fetcher,
    });

    await expect(adapter.createActionCard(input)).resolves.toMatchObject({ riskLevel: 'moderate' });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body))).not.toHaveProperty('response_format');
  });
});
