// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HistoryList } from '../../components/history-list';

describe('Air journal', () => {
  it('joins a recommendation snapshot with its local feedback', () => {
    render(
      <HistoryList
        items={[
          {
            id: 'req_1',
            createdAt: '2026-07-16T04:00:00.000Z',
            activitySummary: '跑步 · 下午四點 · 30 分鐘',
            locationName: '高科大第一校區周邊',
            riskLevel: 'high',
            headline: '今天建議降低強度。',
            provenance: 'fixture',
            aqi: 118,
            aqiCategory: 'unhealthy-sensitive',
            weatherSummary: '多雲',
          },
        ]}
        feedback={[
          {
            id: 'feedback_1',
            recommendationId: 'req_1',
            completed: true,
            discomfort: 'mild',
            helpful: 'yes',
            note: '下次提早出發',
            createdAt: '2026-07-16T05:00:00.000Z',
          },
        ]}
      />,
    );

    expect(screen.getByText('AQI 118 · 多雲')).toBeTruthy();
    expect(screen.getByText(/已進行活動 · 有輕微不舒服 · 建議有幫助/)).toBeTruthy();
    expect(screen.getByText('「下次提早出發」')).toBeTruthy();
  });
});
