// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ProfileForm } from '../../components/profile-form';

describe('ProfileForm', () => {
  it('explains local-only data and submits only approved fields', () => {
    const onSubmit = vi.fn();
    render(<ProfileForm onSubmit={onSubmit} submitting={false} />);

    expect(screen.getByText(/只保存在這台裝置/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '年齡層：13–18 歲' }));
    fireEvent.click(screen.getByRole('button', { name: '敏感條件：呼吸道較敏感' }));
    fireEvent.click(screen.getByRole('button', { name: '通勤方式：步行' }));
    fireEvent.click(screen.getByRole('button', { name: '常見活動：慢跑' }));
    fireEvent.click(screen.getByRole('button', { name: '常用地點：高科大第一校區周邊' }));
    fireEvent.click(screen.getByRole('button', { name: '完成設定' }));

    expect(onSubmit).toHaveBeenCalledWith({
      profile: {
        ageGroup: 'teen',
        sensitiveConditions: ['respiratory-sensitive'],
        commuteMode: 'walk',
        commonActivities: ['run'],
      },
      location: {
        name: '高科大第一校區周邊',
        latitude: 22.754,
        longitude: 120.335,
      },
    });
    expect(JSON.stringify(onSubmit.mock.calls)).not.toContain('studentId');
  });

  it('shows a clear pending state while saving', () => {
    render(<ProfileForm onSubmit={vi.fn()} submitting />);

    expect(
      screen.getByRole('button', { name: '正在儲存設定' }).getAttribute('aria-disabled'),
    ).toBe('true');
  });
});
