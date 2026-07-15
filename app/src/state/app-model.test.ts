import type { RecommendationResponse } from '@airme/contracts';
import { describe, expect, it } from 'vitest';

import { buildRecommendationRequest, toHistoryItem } from './app-model';

const profile = {
  ageGroup: 'teen' as const,
  sensitiveConditions: ['respiratory-sensitive' as const],
  commuteMode: 'walk' as const,
};
const location = { name: '高科大第一校區周邊', latitude: 22.754, longitude: 120.335 };

const recommendation = {
  actionCard: {
    riskLevel: 'high',
    headline: '建議改成較短、較低強度方案。',
    provenance: { overall: 'fixture' },
  },
  requestId: 'req_test',
} as RecommendationResponse;

describe('app model transforms', () => {
  it('builds a minimized fixture request from local preferences', () => {
    const request = buildRecommendationRequest({
      activityText: '下午四點想慢跑 30 分鐘',
      profile,
      location,
      demoMode: true,
    });

    expect(request).toEqual({
      activityText: '下午四點想慢跑 30 分鐘',
      profile,
      location,
      locale: 'zh-TW',
      timeZone: 'Asia/Taipei',
      dataMode: 'fixture',
    });
    expect(JSON.stringify(request)).not.toContain('studentId');
  });

  it('stores only a de-identified recommendation summary in history', () => {
    const history = toHistoryItem(
      recommendation,
      '下午四點想慢跑 30 分鐘，補上不需要保存的更多文字',
      location,
      '2026-07-13T02:00:00.000Z',
    );

    expect(history).toMatchObject({
      id: 'req_test',
      locationName: '高科大第一校區周邊',
      riskLevel: 'high',
      provenance: 'fixture',
    });
    expect(history).not.toHaveProperty('contextToken');
  });
});
