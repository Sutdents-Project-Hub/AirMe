import { describe, expect, it } from 'vitest';

import { createDemoFollowUp, createDemoRecommendation, DEMO_ENVIRONMENT } from './demo-fixture';

const request = {
  activityText: '下午四點想在操場全力跑 30 分鐘',
  profile: {
    ageGroup: 'teen' as const,
    sensitiveConditions: ['respiratory-sensitive' as const],
    commuteMode: 'walk' as const,
  },
  location: { name: '高科大第一校區周邊', latitude: 22.754, longitude: 120.335 },
  locale: 'zh-TW' as const,
  timeZone: 'Asia/Taipei',
  dataMode: 'fixture' as const,
};

describe('client demo fixture', () => {
  it('creates a complete high-risk action card without a network', () => {
    const response = createDemoRecommendation(request, 'req_demo');

    expect(response.actionCard.riskLevel).toBe('high');
    expect(response.actionCard.environment.provenance).toBe('fixture');
    expect(response.actionCard.provenance.aiMode).toBe('fixture');
    expect(response.contextToken).toContain('local-demo-context');
    expect(DEMO_ENVIRONMENT.sources[0].label).toContain('決賽示範');
  });

  it('keeps medical and urgent boundaries in offline follow-up', () => {
    expect(createDemoFollowUp('我要吃什麼藥？', 'req_demo').disposition).toBe(
      'medical-boundary',
    );
    expect(createDemoFollowUp('我現在胸痛快昏倒了', 'req_demo').disposition).toBe(
      'urgent-safety',
    );
  });
});
