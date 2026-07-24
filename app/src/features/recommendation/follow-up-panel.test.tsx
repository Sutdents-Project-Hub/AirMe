// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FollowUpPanel } from '../../components/follow-up-panel';

describe('FollowUpPanel', () => {
  it('submits a scoped question and displays the safety disposition', async () => {
    const onAsk = vi.fn().mockResolvedValue({
      disposition: 'medical-boundary',
      answer: 'AirMe 不能診斷、建議用藥或判定症狀原因。',
      suggestedQuestions: ['現在適合改成什麼活動？'],
      requestId: 'req_follow',
    });
    render(<FollowUpPanel onAsk={onAsk} />);

    fireEvent.change(screen.getByLabelText('針對這張行動卡追問'), {
      target: { value: '我要吃什麼藥？' },
    });
    fireEvent.click(screen.getByRole('button', { name: '送出追問' }));

    expect(await screen.findByText('安全邊界提醒')).toBeTruthy();
    expect(screen.getByText(/不能診斷/)).toBeTruthy();
  });

  it('offers in-scope starter questions', () => {
    render(<FollowUpPanel onAsk={vi.fn()} />);

    expect(screen.getByRole('button', { name: '快速提問：改成室內走路可以嗎？' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '快速提問：多久後再確認 AQI？' })).toBeTruthy();
  });
});
