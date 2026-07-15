// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppButton } from '../../components/ui/app-button';
import { Card } from '../../components/ui/card';
import { PatternSurface } from '../../components/ui/pattern-surface';
import { borders, lightPalette, shadows } from '../../design/tokens';

describe('green and white design system', () => {
  it('uses the approved calm green palette and soft geometry', () => {
    expect(lightPalette.background).toBe('#F4FBF7');
    expect(lightPalette.primary).toBe('#237A50');
    expect(lightPalette.accentSoft).toBe('#DDF4E7');
    expect(lightPalette.sky).toBe('#BCEACC');
    expect(lightPalette.ink).toBe('#173B2A');
    expect(borders.thick).toBe(1);
    expect(shadows.offset).toEqual({ width: 0, height: 8 });
  });

  it('applies a subtle card frame and keeps decorative patterns out of accessibility', () => {
    render(
      <PatternSurface pattern="grid">
        <Card testID="editorial-card" />
      </PatternSurface>,
    );

    expect(getComputedStyle(screen.getByTestId('editorial-card')).borderWidth).toBe('1px');
    expect(screen.getByTestId('pattern-grid').getAttribute('aria-hidden')).toBe('true');
  });

  it('keeps disabled actions explicit to assistive technology', () => {
    render(<AppButton label="測試按鈕" onPress={vi.fn()} disabled />);

    expect(screen.getByRole('button', { name: '測試按鈕' }).getAttribute('aria-disabled')).toBe(
      'true',
    );
  });
});
