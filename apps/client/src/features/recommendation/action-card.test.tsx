// @vitest-environment jsdom

import type { RecommendationResponse } from '@airme/contracts';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ActionCard } from '../../components/action-card';

const recommendation: RecommendationResponse = {
  actionCard: {
    riskLevel: 'high',
    headline: '今天建議改成較短、較低強度的方案。',
    recommendedPlan: {
      timing: '出發前再次確認最新 AQI。',
      location: '優先選擇有通風管理的室內空間。',
      intensity: '避免長時間或劇烈戶外活動。',
      equipment: ['攜帶飲水', '準備口罩'],
    },
    why: ['目前 AQI 為 118。', '你的設定包含敏感條件。'],
    safetyNotes: ['若明顯不適，停止活動並告知身邊成人。'],
    environment: {
      location: { name: '高科大第一校區周邊', latitude: 22.754, longitude: 120.335 },
      airQuality: {
        aqi: 118,
        category: 'unhealthy-sensitive',
        primaryPollutant: '細懸浮微粒',
      },
      weather: { summary: '多雲短暫雨', temperatureC: 31, rainProbability: 40 },
      sources: [
        {
          provider: 'airme-fixture',
          label: 'AirMe 決賽示範資料',
          url: 'https://example.invalid/airme-fixture',
          observedAt: '2026-07-13T08:00:00.000Z',
          fetchedAt: '2026-07-13T08:00:00.000Z',
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

describe('ActionCard', () => {
  it('communicates risk with text, plan, evidence, source and mode', () => {
    render(<ActionCard recommendation={recommendation} />);

    expect(screen.getByText('AIRME ACTION PLAN')).toBeTruthy();
    expect(screen.getByText('風險偏高')).toBeTruthy();
    expect(screen.getByText(recommendation.actionCard.headline)).toBeTruthy();
    expect(screen.getByText('時間')).toBeTruthy();
    expect(screen.getByText('為什麼')).toBeTruthy();
    expect(screen.getByText('AirMe 決賽示範資料')).toBeTruthy();
    expect(screen.getByText('決賽示範')).toBeTruthy();
    expect(screen.getByText(/更新：2026\/07\/13/)).toBeTruthy();
    for (const label of ['時間', '地點', '強度', '準備']) {
      expect(screen.getByLabelText(`建議方案：${label}`)).toBeTruthy();
    }
  });
});
