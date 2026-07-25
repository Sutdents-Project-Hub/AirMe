// @vitest-environment jsdom

import { act, render } from '@testing-library/react';
import { AccessibilityInfo, Animated } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import { Screen } from './screen';

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

describe('Screen', () => {
  it('does not replay an entrance animation whenever a route mounts', async () => {
    vi.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const timing = vi.spyOn(Animated, 'timing');

    render(
      <Screen scroll={false}>
        <div>頁面內容</div>
      </Screen>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(timing.mock.calls.some(([, config]) => config.duration === 360)).toBe(false);
  });
});
