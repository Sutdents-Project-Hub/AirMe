// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ActivityComposer } from '../../components/activity-composer';

const understanding = {
  intent: {
    activity: '跑步',
    time: '下午四點',
    location: '操場',
    intensity: 'moderate' as const,
    durationMinutes: 30,
    currentCondition: null,
    userGoal: '想慢跑',
  },
  missingField: null,
  clarificationQuestion: null,
  provenance: { aiMode: 'fixture' as const },
};

describe('ActivityComposer', () => {
  it('shows the structured understanding before sending a recommendation', async () => {
    const onSubmit = vi.fn();
    const onUnderstand = vi.fn(async () => understanding);
    render(<ActivityComposer loading={false} onUnderstand={onUnderstand} onSubmit={onSubmit} />);

    const firstAction = screen.getByRole('button', { name: '先看看 AirMe 理解了什麼' });
    expect(firstAction.getAttribute('aria-disabled')).toBe('true');
    fireEvent.change(screen.getByLabelText('描述你的活動'), {
      target: { value: '下午四點想在操場慢跑 30 分鐘' },
    });
    fireEvent.click(firstAction);

    expect(await screen.findByText('先確認活動，再產生建議')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '確認，產生我的行動卡' }));
    expect(onSubmit).toHaveBeenCalledWith('下午四點想在操場慢跑 30 分鐘', understanding.intent);
  });

  it('prevents duplicate parsing while loading', () => {
    render(
      <ActivityComposer
        loading
        onUnderstand={vi.fn(async () => understanding)}
        onSubmit={vi.fn()}
        initialValue="想散步"
      />,
    );

    expect(
      screen.getByRole('button', { name: '正在整理活動內容' }).getAttribute('aria-disabled'),
    ).toBe('true');
  });
});
