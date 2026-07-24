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

  it('keeps confirmed supplements in the API text and reports the remaining limit', async () => {
    const onSubmit = vi.fn();
    const onUnderstand = vi.fn(async () => understanding);
    const activity = '下午四點想在操場慢跑 30 分鐘';
    render(
      <ActivityComposer
        loading={false}
        onUnderstand={onUnderstand}
        onSubmit={onSubmit}
        initialValue={activity}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '先看看 AirMe 理解了什麼' }));
    expect(await screen.findByText('先確認活動，再產生建議')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '補充更多資訊' }));

    const supplement = screen.getByLabelText('補充活動資訊');
    expect(supplement.getAttribute('placeholder')).toContain('學校體育館');
    fireEvent.change(supplement, { target: { value: '改在室內，活動約 20 分鐘' } });
    expect(screen.getByText(/補充後還可輸入 \d+ 字/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '加入補充並重新整理' }));

    const combined = `${activity}\n補充：改在室內，活動約 20 分鐘`;
    expect(await screen.findByText(`目前活動內容共 ${combined.length} / 800 字`)).toBeTruthy();
    expect(onUnderstand).toHaveBeenLastCalledWith(combined);
    fireEvent.click(screen.getByRole('button', { name: '修改活動描述' }));
    expect((screen.getByLabelText('描述你的活動') as HTMLInputElement).value).toBe(combined);

    fireEvent.click(screen.getByRole('button', { name: '先看看 AirMe 理解了什麼' }));
    expect(await screen.findByText(`目前活動內容共 ${combined.length} / 800 字`)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '確認，產生我的行動卡' }));
    expect(onSubmit).toHaveBeenCalledWith(combined, understanding.intent);
  });

  it('blocks a supplement that would exceed the shared 800-character contract', async () => {
    const onUnderstand = vi.fn(async () => understanding);
    const activity = `跑步${'測'.repeat(794)}`;
    render(
      <ActivityComposer
        loading={false}
        onUnderstand={onUnderstand}
        onSubmit={vi.fn()}
        initialValue={activity}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '先看看 AirMe 理解了什麼' }));
    expect(await screen.findByText('先確認活動，再產生建議')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '補充更多資訊' }));
    fireEvent.change(screen.getByLabelText('補充活動資訊'), {
      target: { value: '一' },
    });

    expect(screen.getByText('補充後超過 800 字上限 1 字，請縮短內容。')).toBeTruthy();
    expect(
      screen
        .getByRole('button', { name: '加入補充並重新整理' })
        .getAttribute('aria-disabled'),
    ).toBe('true');
    expect(onUnderstand).toHaveBeenCalledTimes(1);
  });

  it('uses the clarification question to provide a relevant placeholder', async () => {
    const onUnderstand = vi.fn(async () => ({
      ...understanding,
      missingField: 'location' as const,
      clarificationQuestion: '這次活動會在哪個地點？',
    }));
    render(
      <ActivityComposer
        loading={false}
        onUnderstand={onUnderstand}
        onSubmit={vi.fn()}
        initialValue="下午想慢跑 30 分鐘"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '先看看 AirMe 理解了什麼' }));

    expect(
      await screen.findByPlaceholderText('例如：在學校操場或室內體育館'),
    ).toBeTruthy();
  });
});
