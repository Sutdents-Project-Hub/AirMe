// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createLocalStore } from '../storage/local-store';
import { AppProvider, useApp } from './app-provider';

function AppStateProbe() {
  const app = useApp();
  return (
    <div>
      <span>{app.hydrated ? 'ready' : 'loading'}</span>
      <span>{app.local.onboardingCompleted ? 'onboarded' : 'blank'}</span>
      <span>{app.local.demoMode ? 'demo' : 'live'}</span>
      <span>{app.error ?? 'no-error'}</span>
    </div>
  );
}

describe('AppProvider hydration', () => {
  it('finishes safely with a blank local state when storage loading rejects', async () => {
    const store = createLocalStore({
      getItem: vi.fn().mockRejectedValue(new Error('storage unavailable')),
      setItem: vi.fn().mockResolvedValue(undefined),
      removeItem: vi.fn().mockResolvedValue(undefined),
    });

    render(
      <AppProvider store={store}>
        <AppStateProbe />
      </AppProvider>,
    );

    expect(await screen.findByText('ready')).toBeTruthy();
    expect(screen.getByText('blank')).toBeTruthy();
    expect(screen.getByText('demo')).toBeTruthy();
    expect(
      screen.getByText('無法讀取這台裝置上的 AirMe 設定，已改用安全的初始狀態。'),
    ).toBeTruthy();
  });
});
