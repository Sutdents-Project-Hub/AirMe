import type { EnvironmentSnapshot, RecommendationRequest } from '@airme/contracts';
import { describe, expect, it, vi } from 'vitest';

import { FixtureAiAdapter } from '../adapters/ai/fixture';
import type { AiAdapter } from '../adapters/ai/types';
import { ContextTokenService } from './context-token';
import { RecommendationService } from './recommendation';

const request: RecommendationRequest = {
  activityText: '下午四點想在操場全力跑 30 分鐘',
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

const lowRiskDraft = {
  riskLevel: 'low' as const,
  headline: '可以照原計畫活動。',
  recommendedPlan: {
    timing: '下午四點。',
    location: '操場。',
    intensity: '全力跑。',
    equipment: [] as string[],
  },
  why: ['天氣可以。'],
  safetyNotes: ['留意身體狀況。'],
};

const safeHighRiskDraft = {
  riskLevel: 'high' as const,
  headline: '今天需要降低強度並縮短戶外活動。',
  recommendedPlan: {
    timing: '出發前再次確認官方資料。',
    location: '避開車流密集處。',
    intensity: '減少體力消耗與戶外活動。',
    equipment: ['攜帶飲水'],
  },
  why: ['目前 AQI 對敏感族群不健康。'],
  safetyNotes: ['若明顯不適，先停止活動並告知成人。'],
};

function createService(
  ai: AiAdapter = { mode: 'live', createActionCard: vi.fn().mockResolvedValue(lowRiskDraft) },
  environmentSnapshot: EnvironmentSnapshot = environment,
) {
  const contextTokens = new ContextTokenService({
    secret: 'test-secret-with-at-least-32-characters',
    ttlSeconds: 1_800,
    now: () => new Date('2026-07-13T02:00:00.000Z'),
  });
  return new RecommendationService({
    getEnvironment: vi.fn().mockResolvedValue(environmentSnapshot),
    ai,
    contextTokens,
    requestId: () => 'req_test',
  });
}

describe('RecommendationService', () => {
  it('enforces the deterministic rule floor over model risk', async () => {
    const response = await createService().create(request);

    expect(response.actionCard.riskLevel).toBe('high');
    expect(response.actionCard.recommendedPlan.intensity).toContain('減少體力消耗與戶外活動');
    expect(response.actionCard.recommendedPlan.intensity).not.toContain('全力跑');
    expect(response.actionCard.why).toContain(
      '本次使用的官方／標示資料為 AQI 118（unhealthy-sensitive）。',
    );
    expect(response.actionCard.provenance.rulesVersion).toBe('moe-school-aqi-2023-12-18.v1');
  });

  it('rejects a live draft that contradicts rules or invents personal history', async () => {
    const service = createService({
      mode: 'live',
      createActionCard: vi.fn().mockResolvedValue({
        ...lowRiskDraft,
        headline: '建議全力衝刺，不必降低強度。',
        why: ['你昨天沒有不舒服。'],
      }),
    });

    const response = await service.create(request);

    expect(response.actionCard.provenance.aiMode).toBe('fixture');
    expect(response.actionCard.headline).not.toContain('全力');
    expect(response.actionCard.why.join(' ')).not.toContain('昨天');
  });

  it('marks future activity guidance as partial and requires a fresh check', async () => {
    const response = await createService(undefined, {
      ...environment,
      sources: [
        { ...environment.sources[0], provider: 'moenv', label: '環境部空氣品質監測網', url: 'https://data.moenv.gov.tw/' },
      ],
      provenance: 'live',
    }).create({
      ...request,
      activityText: '明天下午想在操場跑 30 分鐘',
      confirmedIntent: {
        activity: '跑步',
        time: '明天下午',
        location: '操場',
        intensity: 'moderate',
        durationMinutes: 30,
        currentCondition: null,
        userGoal: null,
      },
    });

    expect(response.actionCard.provenance.overall).toBe('partial');
    expect(response.actionCard.recommendedPlan.timing).toContain('活動前重新取得');
    expect(response.actionCard.safetyNotes).toContain(
      '活動時間尚未到，現在的 AQI 不能當作該時段預報。',
    );
  });

  it('overrides an outdoor model location when red AQI rules keep a sensitive student indoors', async () => {
    const response = await createService(undefined, {
      ...environment,
      airQuality: { aqi: 175, category: 'unhealthy', primaryPollutant: '細懸浮微粒' },
      provenance: 'live',
    }).create({
      ...request,
      dataMode: 'live',
      confirmedIntent: {
        activity: '散步',
        time: '今天下午',
        location: '操場',
        intensity: 'light',
        durationMinutes: 20,
        currentCondition: null,
        userGoal: null,
      },
    });

    expect(response.actionCard.recommendedPlan.location).toContain('留在室內');
    expect(response.actionCard.recommendedPlan.location).not.toContain('操場');
  });

  it('falls back to deterministic AI content when the provider fails', async () => {
    const service = createService({
      mode: 'live',
      createActionCard: vi.fn().mockRejectedValue(new Error('provider unavailable')),
    });

    const response = await service.create(request);

    expect(response.actionCard.provenance.aiMode).toBe('fixture');
    expect(response.actionCard.provenance.overall).toBe('fixture');
    expect(response.contextToken.length).toBeGreaterThan(16);
  });

  it('rejects urgent symptoms supplied through confirmed intent before loading environment', async () => {
    await expect(
      createService().create({
        ...request,
        activityText: '下午四點想在操場跑 30 分鐘',
        confirmedIntent: {
          activity: '跑步',
          time: '下午四點',
          location: '操場',
          intensity: 'moderate',
          durationMinutes: 30,
          currentCondition: '現在喘不過氣',
          userGoal: null,
        },
      }),
    ).rejects.toThrow('URGENT_SAFETY');
  });

  it('does not silently use the saved county for an activity in another county', async () => {
    await expect(
      createService().create({
        ...request,
        location: { ...request.location, administrativeArea: '高雄市' },
        confirmedIntent: {
          activity: '跑步',
          time: '明天下午',
          location: '臺中市公園',
          intensity: 'moderate',
          durationMinutes: 30,
          currentCondition: null,
          userGoal: null,
        },
      }),
    ).rejects.toThrow('ENVIRONMENT_LOCATION_MISMATCH');
  });

  it('recognizes common city aliases without the 市 suffix in activity text', async () => {
    await expect(
      createService().create({
        ...request,
        location: { ...request.location, administrativeArea: '高雄市' },
        confirmedIntent: {
          activity: '跑步',
          time: '明天下午',
          location: '台中公園',
          intensity: 'moderate',
          durationMinutes: 30,
          currentCondition: null,
          userGoal: null,
        },
      }),
    ).rejects.toThrow('ENVIRONMENT_LOCATION_MISMATCH');
  });

  it('signs only a minimized follow-up context without custom location names or raw text', async () => {
    const contextTokens = new ContextTokenService({
      secret: 'test-secret-with-at-least-32-characters',
      ttlSeconds: 1_800,
      now: () => new Date('2026-07-13T02:00:00.000Z'),
    });
    const service = new RecommendationService({
      getEnvironment: vi.fn().mockResolvedValue(environment),
      ai: new FixtureAiAdapter(),
      contextTokens,
      requestId: () => 'req_test',
    });
    const response = await service.create({
      ...request,
      activityText: '我從小明家出發，下午想慢跑 30 分鐘',
      location: {
        name: '小明家（中山路 1 號）',
        administrativeArea: '高雄市',
        latitude: 22.6,
        longitude: 120.31,
      },
      confirmedIntent: {
        activity: '慢跑',
        time: '下午',
        location: '住家附近',
        intensity: 'moderate',
        durationMinutes: 30,
        currentCondition: null,
        userGoal: null,
      },
    });

    const context = contextTokens.verify(response.contextToken);
    expect(context.locationName).toBe('高雄市');
    expect(context.activitySummary).toBe('慢跑；下午；moderate 強度；30 分鐘');
    expect(JSON.stringify(context)).not.toMatch(/小明家|中山路|22\.6|120\.31/);
  });

  it('marks a successful fixture adapter response as fixture provenance', async () => {
    const response = await createService(new FixtureAiAdapter()).create(request);

    expect(response.actionCard.provenance.aiMode).toBe('fixture');
  });

  it('does not display generated medical claims', async () => {
    const service = createService({
      mode: 'live',
      createActionCard: vi.fn().mockResolvedValue({
        ...safeHighRiskDraft,
        headline: '你得了氣喘，請服用支氣管擴張藥。',
      }),
    });

    const response = await service.create(request);

    expect(response.actionCard.headline).not.toContain('服用');
    expect(response.actionCard.provenance.aiMode).toBe('fixture');
  });

  it.each([
    {
      label: 'medical equipment advice',
      draft: { ...safeHighRiskDraft, recommendedPlan: { ...safeHighRiskDraft.recommendedPlan, equipment: ['請服用支氣管擴張藥'] } },
    },
    {
      label: 'rule-conflicting safety note',
      draft: { ...safeHighRiskDraft, safetyNotes: ['沒問題，可以照常全力跑。'] },
    },
    {
      label: 'invented history outside why',
      draft: { ...safeHighRiskDraft, recommendedPlan: { ...safeHighRiskDraft.recommendedPlan, timing: '依你的歷史紀錄，下午一定適合。' } },
    },
  ])('rejects unsafe model content in every visible field: $label', async ({ draft }) => {
    const response = await createService({
      mode: 'live',
      createActionCard: vi.fn().mockResolvedValue(draft),
    }).create(request);

    expect(response.actionCard.provenance.aiMode).toBe('fixture');
    expect(JSON.stringify(response.actionCard)).not.toMatch(/服用|照常全力|歷史紀錄/);
  });
});
