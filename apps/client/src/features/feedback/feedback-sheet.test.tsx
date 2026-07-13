// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FeedbackPanel } from '../../components/feedback-panel';

describe('FeedbackPanel', () => {
  it('completes the required feedback in three actions', () => {
    const onSubmit = vi.fn();
    render(<FeedbackPanel recommendationId="req_test" onSubmit={onSubmit} submitted={false} />);

    fireEvent.click(screen.getByRole('button', { name: '活動完成：是' }));
    fireEvent.click(screen.getByRole('button', { name: '活動後感受：差不多' }));
    fireEvent.click(screen.getByRole('button', { name: '儲存活動回饋' }));

    expect(onSubmit).toHaveBeenCalledWith({
      recommendationId: 'req_test',
      completed: true,
      feeling: 'same',
      note: undefined,
    });
  });

  it('shows a clear success state after local save', () => {
    render(<FeedbackPanel recommendationId="req_test" onSubmit={vi.fn()} submitted />);

    expect(screen.getByText('回饋已保存在這台裝置')).toBeTruthy();
  });
});
