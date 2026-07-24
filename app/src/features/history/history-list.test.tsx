// @vitest-environment jsdom

import type { Feedback, RecommendationHistoryItem } from '@airme/contracts';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HistoryList } from '../../components/history-list';

const recommendation: RecommendationHistoryItem = {
  id: 'req_1',
  createdAt: '2026-07-16T04:00:00.000Z',
  activitySummary: '跑步 · 下午四點 · 30 分鐘',
  locationName: '高科大第一校區周邊',
  riskLevel: 'high',
  headline: '今天建議降低強度。',
  recommendedPlanSummary: '改成室內伸展 20 分鐘',
  provenance: 'fixture',
  aqi: 118,
  aqiCategory: 'unhealthy-sensitive',
  weatherSummary: '多雲',
};

const existingFeedback: Feedback = {
  id: 'feedback_1',
  recommendationId: recommendation.id,
  completed: true,
  discomfort: 'mild',
  helpful: 'yes',
  note: '下次提早出發',
  createdAt: '2026-07-16T05:00:00.000Z',
};

function renderHistory({
  items = [recommendation],
  feedback = [existingFeedback],
  onCreateRecommendation = vi.fn(),
  onSubmitFeedback = vi.fn().mockResolvedValue(undefined),
}: {
  items?: RecommendationHistoryItem[];
  feedback?: Feedback[];
  onCreateRecommendation?: () => void;
  onSubmitFeedback?: (
    value: Omit<Feedback, 'id' | 'createdAt'>,
  ) => Promise<void>;
} = {}) {
  render(
    <HistoryList
      items={items}
      feedback={feedback}
      onCreateRecommendation={onCreateRecommendation}
      onSubmitFeedback={onSubmitFeedback}
    />,
  );
}

describe('Air journal', () => {
  it('joins a recommendation snapshot with its latest local feedback', () => {
    const olderFeedback = {
      ...existingFeedback,
      id: 'feedback_older',
      note: '舊備註',
      createdAt: '2026-07-16T04:30:00.000Z',
    };

    renderHistory({ feedback: [olderFeedback, existingFeedback] });

    expect(screen.getByText('AQI 118')).toBeTruthy();
    expect(screen.getByText(/多雲/)).toBeTruthy();
    expect(screen.getByText(/已進行活動 · 有輕微不舒服 · 建議有幫助/)).toBeTruthy();
    expect(screen.getByText('「下次提早出發」')).toBeTruthy();
    expect(screen.queryByText('「舊備註」')).toBeNull();
  });

  it('uses the explicit legacy fallback when weather was not saved', () => {
    renderHistory({
      items: [{ ...recommendation, weatherSummary: undefined }],
      feedback: [],
    });

    expect(screen.getByText(/天氣未保存/)).toBeTruthy();
  });

  it('filters dates and labels using Asia/Taipei rather than UTC', () => {
    const taipeiJuly17 = {
      ...recommendation,
      id: 'req_july_17',
      createdAt: '2026-07-16T16:30:00.000Z',
      activitySummary: '台北時間七月十七日的散步',
    };
    const taipeiJuly16 = {
      ...recommendation,
      id: 'req_july_16',
      createdAt: '2026-07-16T10:00:00.000Z',
      activitySummary: '台北時間七月十六日的慢跑',
      riskLevel: 'low' as const,
    };

    renderHistory({
      items: [taipeiJuly17, taipeiJuly16],
      feedback: [],
    });

    fireEvent.click(screen.getByRole('button', { name: '日期篩選：7月17日' }));

    expect(screen.getByText('台北時間七月十七日的散步')).toBeTruthy();
    expect(screen.queryByText('台北時間七月十六日的慢跑')).toBeNull();
  });

  it('opens a closable detail dialog with the current privacy boundary', () => {
    renderHistory();

    fireEvent.click(
      screen.getByRole('button', {
        name: `查看 ${recommendation.activitySummary} 詳細資訊`,
      }),
    );

    expect(screen.getByRole('dialog', { name: 'Air 日誌詳細資訊' })).toBeTruthy();
    expect(screen.getByText(/後端啟用帳號同步時，會加密同步/)).toBeTruthy();
    expect(screen.getByText(/不會被解讀為醫療因果/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '關閉 Air 日誌詳細資訊' }));

    expect(screen.queryByRole('dialog', { name: 'Air 日誌詳細資訊' })).toBeNull();
  });

  it('keeps feedback and the dialog open when saving fails, then closes after retry', async () => {
    const onSubmitFeedback = vi
      .fn()
      .mockRejectedValueOnce(new Error('storage unavailable'))
      .mockResolvedValueOnce(undefined);
    renderHistory({ onSubmitFeedback });

    fireEvent.click(
      screen.getByRole('button', {
        name: `編輯活動回饋：${recommendation.activitySummary}`,
      }),
    );

    const note = screen.getByRole('textbox', {
      name: '回饋備註（選填）',
    }) as HTMLTextAreaElement;
    expect(note.value).toBe('下次提早出發');
    fireEvent.change(note, { target: { value: '下次改走室內' } });
    fireEvent.click(screen.getByRole('button', { name: '儲存回饋修改' }));

    expect(
      await screen.findByText('回饋儲存失敗，內容仍保留在畫面上，請再試一次。'),
    ).toBeTruthy();
    expect(screen.getByRole('dialog', { name: '活動後回饋' })).toBeTruthy();
    expect(note.value).toBe('下次改走室內');

    fireEvent.click(screen.getByRole('button', { name: '儲存回饋修改' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '活動後回饋' })).toBeNull();
    });
    expect(onSubmitFeedback).toHaveBeenLastCalledWith({
      recommendationId: recommendation.id,
      completed: true,
      discomfort: 'mild',
      helpful: 'yes',
      note: '下次改走室內',
    });
  });

  it('offers a way back to today when the journal is empty', () => {
    const onCreateRecommendation = vi.fn();
    renderHistory({
      items: [],
      feedback: [],
      onCreateRecommendation,
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: '回到今日建立第一張行動卡',
      }),
    );

    expect(onCreateRecommendation).toHaveBeenCalledOnce();
  });
});
