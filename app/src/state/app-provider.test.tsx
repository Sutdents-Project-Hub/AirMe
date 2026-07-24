// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AirMeApi } from '../api/client';
import { DEFAULT_LOCAL_STATE, createLocalStore } from '../storage/local-store';
import type { AuthTokenStore } from '../storage/auth-session';
import { AppProvider, useApp } from './app-provider';

function AppStateProbe() {
  const app = useApp();
  return (
    <div>
      <span>{app.hydrated ? 'ready' : 'loading'}</span>
      <span>{app.local.onboardingCompleted ? 'onboarded' : 'blank'}</span>
      <span>{app.local.demoMode ? 'demo' : 'live'}</span>
      <span>{app.local.deviceProfile?.displayName ?? 'no-profile'}</span>
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

  it('keeps the local profile when restoring an account session fails', async () => {
    const storedState = {
      ...DEFAULT_LOCAL_STATE,
      onboardingCompleted: true,
      deviceProfile: { displayName: '測試同學' },
    };
    const store = createLocalStore({
      getItem: vi.fn().mockResolvedValue(JSON.stringify(storedState)),
      setItem: vi.fn().mockResolvedValue(undefined),
      removeItem: vi.fn().mockResolvedValue(undefined),
    });
    const tokenStore: AuthTokenStore = {
      clear: vi.fn().mockResolvedValue(undefined),
      load: vi.fn().mockRejectedValue(new Error('secure storage unavailable')),
      save: vi.fn().mockResolvedValue(undefined),
    };

    render(
      <AppProvider store={store} tokenStore={tokenStore}>
        <AppStateProbe />
      </AppProvider>,
    );

    expect(await screen.findByText('ready')).toBeTruthy();
    expect(screen.getByText('onboarded')).toBeTruthy();
    expect(screen.getByText('no-error')).toBeTruthy();
    expect(tokenStore.clear).toHaveBeenCalledOnce();
  });

  it('clears a different account cache when cloud synchronization is unavailable', async () => {
    const currentAccountId = '11111111-1111-4111-8111-111111111111';
    const previousAccountId = '22222222-2222-4222-8222-222222222222';
    const storedState = {
      ...DEFAULT_LOCAL_STATE,
      cloudAccountId: previousAccountId,
      onboardingCompleted: true,
      deviceProfile: { displayName: '上一位使用者' },
    };
    let persisted = JSON.stringify(storedState);
    const store = createLocalStore({
      getItem: vi.fn().mockImplementation(() => Promise.resolve(persisted)),
      setItem: vi.fn().mockImplementation((_key, value) => {
        persisted = value;
        return Promise.resolve();
      }),
      removeItem: vi.fn().mockResolvedValue(undefined),
    });
    const tokenStore: AuthTokenStore = {
      clear: vi.fn().mockResolvedValue(undefined),
      load: vi.fn().mockResolvedValue('x'.repeat(43)),
      save: vi.fn().mockResolvedValue(undefined),
    };
    const api = {
      getSession: vi.fn().mockResolvedValue({
        account: {
          id: currentAccountId,
          email: 'current@example.com',
          displayName: '目前使用者',
          createdAt: '2026-07-22T00:00:00.000Z',
        },
        expiresAt: '2026-08-22T00:00:00.000Z',
      }),
      getCloudState: vi.fn().mockRejectedValue(new Error('network unavailable')),
    } as unknown as AirMeApi;

    render(
      <AppProvider api={api} store={store} tokenStore={tokenStore}>
        <AppStateProbe />
      </AppProvider>,
    );

    await screen.findByText('no-profile');
    await waitFor(async () => {
      const isolated = await store.load();
      expect(isolated.cloudAccountId).toBe(currentAccountId);
      expect(isolated.history).toEqual([]);
      expect(isolated.feedback).toEqual([]);
    });
  });
});
