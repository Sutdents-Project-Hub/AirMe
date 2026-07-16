// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ProfileForm } from '../../components/profile-form';

describe('ProfileForm', () => {
  it('turns free text into approved local fields without submitting the original text', () => {
    const onSubmit = vi.fn();
    render(<ProfileForm onSubmit={onSubmit} submitting={false} />);

    fireEvent.change(screen.getByLabelText('希望 AirMe 怎麼稱呼你？'), {
      target: { value: '小翔' },
    });
    fireEvent.change(screen.getByLabelText('個人日常描述'), {
      target: { value: '我 15 歲，平常騎單車到高科大第一校區，鼻子容易受空品影響，放學會跑步。' },
    });
    fireEvent.click(screen.getByRole('button', { name: '讓 AirMe 整理我的設定' }));
    fireEvent.click(screen.getByRole('button', { name: '確認並建立我的 AirMe' }));

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
    render(<ProfileForm onSubmit={vi.fn()} submitting />);
    fireEvent.change(screen.getByLabelText('希望 AirMe 怎麼稱呼你？'), {
      target: { value: '小翔' },
    });
    fireEvent.change(screen.getByLabelText('個人日常描述'), {
      target: { value: '我 15 歲，走路到高科大建工校區，平常會慢跑。' },
    });
    fireEvent.click(screen.getByRole('button', { name: '讓 AirMe 整理我的設定' }));

    expect(
      screen.getByRole('button', { name: '正在建立個人檔案' }).getAttribute('aria-disabled'),
    ).toBe('true');
  });
});
