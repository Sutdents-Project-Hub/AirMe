// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ActivityComposer } from '../../components/activity-composer';

describe('ActivityComposer', () => {
  it('requires a meaningful activity description and reports length', () => {
    const onSubmit = vi.fn();
    render(<ActivityComposer loading={false} onSubmit={onSubmit} />);

    expect(screen.getByText('AIRME ACTION LAB')).toBeTruthy();
    const submit = screen.getByRole('button', { name: '產生我的行動卡' });
    expect(submit.getAttribute('aria-disabled')).toBe('true');
    fireEvent.change(screen.getByLabelText('描述你的活動'), {
      target: { value: '下午四點想在操場慢跑 30 分鐘' },
    });

    expect(screen.getByText('16 / 800')).toBeTruthy();
    expect(submit.getAttribute('aria-disabled')).not.toBe('true');
    fireEvent.click(submit);
    expect(onSubmit).toHaveBeenCalledWith('下午四點想在操場慢跑 30 分鐘');
  });

  it('prevents duplicate submission while generating', () => {
    render(<ActivityComposer loading onSubmit={vi.fn()} initialValue="想散步" />);

    expect(
      screen.getByRole('button', { name: '正在分析環境與活動' }).getAttribute('aria-disabled'),
    ).toBe('true');
    expect(screen.getByText(/通常需要幾秒鐘/)).toBeTruthy();
  });
});
