// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageHero } from './page-hero';

describe('PageHero', () => {
  it('keeps the page label, heading, supporting copy, and optional content together', () => {
    render(
      <PageHero
        eyebrow="今日空氣行動"
        title="先理解你，再決定今天怎麼動。"
        description="AirMe 會整理下一步。">
        <div>補充內容</div>
      </PageHero>,
    );

    expect(screen.getByText('今日空氣行動')).toBeTruthy();
    expect(screen.getByRole('heading', { name: '先理解你，再決定今天怎麼動。' })).toBeTruthy();
    expect(screen.getByText('AirMe 會整理下一步。')).toBeTruthy();
    expect(screen.getByText('補充內容')).toBeTruthy();
    expect(screen.getByTestId('pattern-dots')).toBeTruthy();
  });
});
