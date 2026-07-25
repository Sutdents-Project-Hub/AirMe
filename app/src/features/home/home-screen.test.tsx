// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import HomeScreen from '../../app/index';
import { useApp } from '../../state/app-provider';

vi.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => <div>{`redirect:${href}`}</div>,
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

vi.mock('@expo/vector-icons/MaterialCommunityIcons', () => ({ default: () => null }));
vi.mock('../../state/app-provider', () => ({ useApp: vi.fn() }));

const mockedUseApp = vi.mocked(useApp);

function setViewport(width: number) {
  Object.defineProperty(document.documentElement, 'clientWidth', {
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event('resize'));
}

function createAppState(overrides: Record<string, unknown> = {}) {
  return {
    local: {
      version: 3 as const,
      cloudAccountId: null,
      deviceProfile: { displayName: '小空' },
      profile: {
        ageGroup: 'teen' as const,
        sensitiveConditions: [],
        commuteMode: 'walk' as const,
      },
      savedLocation: { name: '高科大', latitude: 22.754, longitude: 120.335 },
      onboardingCompleted: true,
      history: [],
      feedback: [],
      demoMode: false,
    },
    hydrated: true,
    busy: false,
    environmentLoading: false,
    environment: null,
    currentRecommendation: null,
    route: null,
    routeLoading: false,
    routeError: null,
    error: null,
    account: {
      id: 'account_test',
      displayName: '小空',
      email: 'test@example.com',
      createdAt: '2026-07-21T00:00:00.000Z',
    },
    authBusy: false,
    registerAccount: vi.fn(),
    loginAccount: vi.fn(),
    logout: vi.fn(),
    deleteAccount: vi.fn(),
    searchPlaces: vi.fn(),
    planRoute: vi.fn(),
    saveOnboarding: vi.fn(),
    skipOnboarding: vi.fn(),
    understandProfile: vi.fn(),
    refreshEnvironment: vi.fn(),
    understandActivity: vi.fn(),
    createRecommendation: vi.fn(),
    askFollowUp: vi.fn(),
    submitFeedback: vi.fn(),
    setDemoMode: vi.fn().mockResolvedValue(undefined),
    clearAll: vi.fn(),
    clearError: vi.fn(),
    ...overrides,
  };
}

function appearsBefore(first: HTMLElement, second: HTMLElement) {
  return Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe('HomeScreen recovery and responsive priority', () => {
  it('sends unauthenticated visitors to the account entry flow', () => {
    mockedUseApp.mockReturnValue(createAppState({ account: null }) as ReturnType<typeof useApp>);

    render(<HomeScreen />);

    expect(screen.getByText('redirect:/account')).toBeTruthy();
  });

  it('places the activity composer before the environment card at 390px', () => {
    setViewport(390);
    mockedUseApp.mockReturnValue(createAppState() as ReturnType<typeof useApp>);

    render(<HomeScreen />);

    expect(
      appearsBefore(screen.getByText('你現在想做什麼？'), screen.getByText('今日環境')),
    ).toBe(true);
  });

  it('keeps the environment card first in the desktop two-column dashboard', () => {
    setViewport(1200);
    mockedUseApp.mockReturnValue(createAppState() as ReturnType<typeof useApp>);

    render(<HomeScreen />);

    expect(
      appearsBefore(screen.getByText('今日環境'), screen.getByText('你現在想做什麼？')),
    ).toBe(true);
  });

  it('keeps activity planning unavailable until skipped setup is completed later', () => {
    mockedUseApp.mockReturnValue(
      createAppState({
        local: {
          ...createAppState().local,
          profile: null,
          savedLocation: null,
        },
      }) as ReturnType<typeof useApp>,
    );

    render(<HomeScreen />);

    expect(screen.getByText('還差一點個人設定')).toBeTruthy();
    expect(screen.queryByText('你現在想做什麼？')).toBeNull();
  });

  it('offers one-click demo recovery without clearing the activity draft', () => {
    setViewport(390);
    const setDemoMode = vi.fn().mockResolvedValue(undefined);
    let appState = createAppState({ error: '無法連線到 Live API。', setDemoMode });
    mockedUseApp.mockImplementation(() => appState as ReturnType<typeof useApp>);
    const view = render(<HomeScreen />);

    const activity = screen.getByLabelText('描述你的活動');
    fireEvent.change(activity, { target: { value: '下午四點想去操場慢跑' } });
    fireEvent.click(screen.getByRole('button', { name: '切換示範模式' }));

    expect(setDemoMode).toHaveBeenCalledWith(true);
    appState = createAppState({
      local: { ...appState.local, demoMode: true },
      error: null,
      setDemoMode,
    });
    view.rerender(<HomeScreen />);
    expect((screen.getByLabelText('描述你的活動') as HTMLInputElement).value).toBe(
      '下午四點想去操場慢跑',
    );
  });
});
