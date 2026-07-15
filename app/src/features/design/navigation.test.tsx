// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppHeader } from '../../components/app-header';
import { BottomNav } from '../../components/bottom-nav';

vi.mock('expo-router', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

vi.mock('@expo/vector-icons/MaterialCommunityIcons', () => ({ default: () => null }));

function setViewport(width: number) {
  Object.defineProperty(document.documentElement, 'clientWidth', {
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event('resize'));
}

describe('responsive AirMe navigation', () => {
  it('uses header navigation without a duplicate bottom dock on desktop', () => {
    setViewport(1440);
    render(
      <>
        <AppHeader demoMode />
        <BottomNav />
      </>,
    );

    expect(screen.getByRole('button', { name: '今日' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '路線規劃' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Air 日誌' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '我的 AirMe' })).toBeTruthy();
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('uses the thumb-reachable bottom dock on mobile', () => {
    setViewport(375);
    render(
      <>
        <AppHeader demoMode />
        <BottomNav />
      </>,
    );

    expect(screen.getByRole('tablist')).toBeTruthy();
    expect(screen.getByRole('tab', { name: '路線' })).toBeTruthy();
  });
});
