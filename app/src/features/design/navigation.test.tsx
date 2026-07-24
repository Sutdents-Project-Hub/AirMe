// @vitest-environment jsdom

import { act, fireEvent, render, screen } from '@testing-library/react';
import { AccessibilityInfo, Animated } from 'react-native';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppHeader } from '../../components/app-header';
import { BottomNav } from '../../components/bottom-nav';
import { SegmentedTabBar } from '../../components/ui/segmented-tab-bar';

const routerMock = vi.hoisted(() => ({
  pathname: '/',
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('expo-router', () => ({
  usePathname: () => routerMock.pathname,
  useRouter: () => ({ push: routerMock.push, replace: routerMock.replace }),
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

vi.mock('@expo/vector-icons/MaterialCommunityIcons', () => ({ default: () => null }));

afterEach(() => {
  routerMock.pathname = '/';
  routerMock.push.mockReset();
  routerMock.replace.mockReset();
  vi.restoreAllMocks();
});

function setViewport(width: number) {
  Object.defineProperty(document.documentElement, 'clientWidth', {
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event('resize'));
}

describe('responsive AirMe navigation', () => {
  it('uses header navigation without a duplicate bottom dock on desktop', async () => {
    const reducedMotion = vi
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);
    setViewport(1440);
    render(
      <>
        <AppHeader demoMode />
        <BottomNav />
      </>,
    );
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByRole('navigation', { name: '主要導覽' })).toBeTruthy();
    expect(screen.getByRole('tablist', { name: '主要分頁' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: '今日' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(screen.getByRole('tab', { name: '路線規劃' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Air 日誌' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: '我的 AirMe' })).toBeTruthy();
    expect(reducedMotion).toHaveBeenCalledOnce();
  });

  it('uses the thumb-reachable bottom dock on mobile', () => {
    setViewport(375);
    render(
      <>
        <AppHeader demoMode />
        <BottomNav />
      </>,
    );

    expect(screen.getAllByRole('tablist')).toHaveLength(1);
    expect(screen.queryByRole('navigation', { name: '主要導覽' })).toBeNull();
    expect(screen.getByRole('tab', { name: '路線' })).toBeTruthy();
  });

  it('replaces the current route when a desktop tab is selected', async () => {
    const reducedMotion = vi
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);
    setViewport(1440);
    render(<AppHeader demoMode={false} />);
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole('tab', { name: '路線規劃' }));

    expect(routerMock.replace).toHaveBeenCalledWith('/routes');
    expect(routerMock.push).not.toHaveBeenCalled();
    expect(reducedMotion).toHaveBeenCalledOnce();
  });

  it('reads the reduced-motion preference before animating the indicator', async () => {
    const reducedMotion = vi
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
    const spring = vi.spyOn(Animated, 'spring');

    render(
      <SegmentedTabBar
        accessibilityLabel="測試分頁"
        activeHref="/"
        items={[
          { href: '/', label: '今日' },
          { href: '/routes', label: '路線規劃' },
        ]}
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(reducedMotion).toHaveBeenCalledOnce();
    expect(spring).not.toHaveBeenCalled();
  });
});
