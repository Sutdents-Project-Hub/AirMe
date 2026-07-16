// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FeedbackPanel } from '../../components/feedback-panel';

describe('FeedbackPanel', () => {
  it('records all required five-second feedback fields', () => {
    const onSubmit = vi.fn();
    render(<FeedbackPanel recommendationId="req_test" onSubmit={onSubmit} submitted={false} />);

    expect(screen.getByText('5 SECOND CHECK-IN')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '活動完成：是' }));
    fireEvent.click(screen.getByRole('button', { name: '活動後不舒服程度：輕微' }));
    fireEvent.click(screen.getByRole('button', { name: '建議是否有幫助：有' }));
    fireEvent.click(screen.getByRole('button', { name: '儲存活動回饋' }));

    expect(onSubmit).toHaveBeenCalledWith({
      recommendationId: 'req_test',
      completed: true,
      discomfort: 'mild',
      helpful: 'yes',
      note: undefined,
    });
  });

  it('shows a clear success state after local save', () => {
    render(<FeedbackPanel recommendationId="req_test" onSubmit={vi.fn()} submitted />);

    expect(screen.getByText('回饋已保存在這台裝置')).toBeTruthy();
  });
});
