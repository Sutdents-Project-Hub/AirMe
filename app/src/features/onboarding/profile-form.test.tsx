// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ProfileForm } from '../../components/profile-form';

describe('ProfileForm', () => {
  it('turns free text into approved local fields without submitting the original text', () => {
    const onSubmit = vi.fn();
    render(<ProfileForm onSubmit={onSubmit} onSkip={vi.fn()} submitting={false} />);

    fireEvent.change(screen.getByLabelText('希望 AirMe 怎麼稱呼你？'), {
      target: { value: '小翔' },
    });
    fireEvent.change(screen.getByLabelText('個人日常描述'), {
      target: { value: '我 15 歲，平常騎單車到高科大第一校區，鼻子容易受空品影響，放學會跑步。' },
    });
    fireEvent.click(screen.getByRole('button', { name: '讓 AI 整理我的設定' }));
    fireEvent.click(screen.getByRole('button', { name: '確認並儲存已整理的設定' }));

    expect(onSubmit).toHaveBeenCalledWith({
      deviceProfile: { displayName: '小翔' },
      profile: {
        ageGroup: 'teen',
        sensitiveConditions: ['allergy-sensitive'],
        commuteMode: 'bike',
        commonActivities: ['run', 'cycle', 'commute'],
      },
      location: {
        name: '高科大第一校區周邊',
        administrativeArea: '高雄市',
        latitude: 22.75,
        longitude: 120.34,
      },
    });
    expect(JSON.stringify(onSubmit.mock.calls)).not.toContain('鼻子容易');
  });

  it('shows the saving state after the user confirms the understanding', () => {
    render(<ProfileForm onSubmit={vi.fn()} onSkip={vi.fn()} submitting />);
    fireEvent.change(screen.getByLabelText('希望 AirMe 怎麼稱呼你？'), {
      target: { value: '小翔' },
    });
    fireEvent.change(screen.getByLabelText('個人日常描述'), {
      target: { value: '我 15 歲，走路到高科大建工校區，平常會慢跑。' },
    });
    fireEvent.click(screen.getByRole('button', { name: '讓 AI 整理我的設定' }));

    expect(
      screen.getByRole('button', { name: '正在儲存個人設定' }).getAttribute('aria-disabled'),
    ).toBe('true');
  });

  it('allows all onboarding fields to be skipped without persisting the description', () => {
    const onSkip = vi.fn();
    render(<ProfileForm onSubmit={vi.fn()} onSkip={onSkip} submitting={false} />);

    fireEvent.click(screen.getByRole('button', { name: '先略過，之後再設定' }));

    expect(onSkip).toHaveBeenCalledOnce();
  });
});
