// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppButton } from '../../components/ui/app-button';
import { Card } from '../../components/ui/card';
import { PatternSurface } from '../../components/ui/pattern-surface';
import { borders, lightPalette, shadows } from '../../design/tokens';

describe('editorial grid design system', () => {
  it('uses the approved reference palette and hard geometry', () => {
    expect(lightPalette.background).toBe('#FFF9EC');
    expect(lightPalette.coral).toBe('#F75B4B');
    expect(lightPalette.yellow).toBe('#FFD447');
    expect(lightPalette.teal).toBe('#08A6A6');
    expect(lightPalette.sky).toBe('#5BC0EB');
    expect(lightPalette.ink).toBe('#292827');
    expect(borders.thick).toBe(3);
    expect(shadows.offset).toEqual({ width: 5, height: 5 });
  });

  it('applies the thick card frame and keeps decorative patterns out of accessibility', () => {
    render(
      <PatternSurface pattern="grid">
        <Card testID="editorial-card" />
      </PatternSurface>,
    );

    expect(getComputedStyle(screen.getByTestId('editorial-card')).borderWidth).toBe('3px');
    expect(screen.getByTestId('pattern-grid').getAttribute('aria-hidden')).toBe('true');
  });

  it('keeps disabled editorial actions explicit to assistive technology', () => {
    render(<AppButton label="測試按鈕" onPress={vi.fn()} disabled />);

    expect(screen.getByRole('button', { name: '測試按鈕' }).getAttribute('aria-disabled')).toBe(
      'true',
    );
  });
});
