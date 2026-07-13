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

function createService(
  ai: AiAdapter = { mode: 'live', createActionCard: vi.fn().mockResolvedValue(lowRiskDraft) },
) {
  const contextTokens = new ContextTokenService({
    secret: 'test-secret-with-at-least-32-characters',
    ttlSeconds: 1_800,
    now: () => new Date('2026-07-13T02:00:00.000Z'),
  });
  return new RecommendationService({
    getEnvironment: vi.fn().mockResolvedValue(environment),
    ai,
    contextTokens,
    requestId: () => 'req_test',
  });
}

describe('RecommendationService', () => {
  it('enforces the deterministic rule floor over model risk', async () => {
    const response = await createService().create(request);

    expect(response.actionCard.riskLevel).toBe('high');
    expect(response.actionCard.recommendedPlan.intensity).toContain('避免長時間或劇烈戶外活動');
    expect(response.actionCard.provenance.rulesVersion).toBe('moe-school-aqi-2026.1');
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

  it('marks a successful fixture adapter response as fixture provenance', async () => {
    const response = await createService(new FixtureAiAdapter()).create(request);

    expect(response.actionCard.provenance.aiMode).toBe('fixture');
  });

  it('does not display generated medical claims', async () => {
    const service = createService({
      mode: 'live',
      createActionCard: vi.fn().mockResolvedValue({
        ...lowRiskDraft,
        headline: '你得了氣喘，請服用支氣管擴張藥。',
      }),
    });

    const response = await service.create(request);

    expect(response.actionCard.headline).not.toContain('服用');
    expect(response.actionCard.provenance.aiMode).toBe('fixture');
  });
});
