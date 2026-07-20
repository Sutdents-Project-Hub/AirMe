import type {
  Account,
  ActivityIntent,
  ActivityIntentResponse,
  EnvironmentSnapshot,
  Feedback,
  FollowUpResponse,
  GeocodingSearchResponse,
  LoginRequest,
  Location,
  Profile,
  RegisterRequest,
  RecommendationResponse,
  RouteMode,
  RoutePoint,
  RouteResponse,
} from '@airme/contracts';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { airMeApi, type AirMeApi } from '../api/client';
import {
  createDemoFollowUp,
  createDemoRecommendation,
  DEMO_ENVIRONMENT,
} from '../demo/demo-fixture';
import { parseActivityIntentLocally } from '../features/assistant/activity-intent';
import {
  localStore,
  type LocalState,
  type DeviceProfile,
  type createLocalStore,
  DEFAULT_LOCAL_STATE,
} from '../storage/local-store';
import { authTokenStore, type AuthTokenStore } from '../storage/auth-session';
import { buildRecommendationRequest, toHistoryItem } from './app-model';

type LocalStore = ReturnType<typeof createLocalStore>;

interface AppContextValue {
  local: LocalState;
  hydrated: boolean;
  busy: boolean;
  environmentLoading: boolean;
  environment: EnvironmentSnapshot | null;
  currentRecommendation: RecommendationResponse | null;
  route: RouteResponse | null;
  routeLoading: boolean;
  routeError: string | null;
  error: string | null;
  account: Account | null;
  authBusy: boolean;
  registerAccount(input: RegisterRequest): Promise<boolean>;
  loginAccount(input: LoginRequest): Promise<boolean>;
  logout(): Promise<void>;
  deleteAccount(): Promise<boolean>;
  searchPlaces(query: string): Promise<GeocodingSearchResponse | null>;
  planRoute(input: { origin: RoutePoint; destination: RoutePoint; mode: RouteMode }): Promise<RouteResponse | null>;
  saveOnboarding(profile: Profile, location: Location, deviceProfile: DeviceProfile): Promise<void>;
  refreshEnvironment(): Promise<void>;
  understandActivity(activityText: string): Promise<ActivityIntentResponse | null>;
  createRecommendation(activityText: string, intent: ActivityIntent): Promise<RecommendationResponse | null>;
  askFollowUp(question: string): Promise<FollowUpResponse>;
  submitFeedback(input: Omit<Feedback, 'id' | 'createdAt'>): Promise<void>;
  setDemoMode(value: boolean): Promise<void>;
  clearAll(): Promise<void>;
  clearError(): void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({
  children,
  api = airMeApi,
  store = localStore,
  tokenStore = authTokenStore,
}: PropsWithChildren<{ api?: AirMeApi; store?: LocalStore; tokenStore?: AuthTokenStore }>) {
  const [local, setLocal] = useState<LocalState>(DEFAULT_LOCAL_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [environmentLoading, setEnvironmentLoading] = useState(false);
  const [environment, setEnvironment] = useState<EnvironmentSnapshot | null>(null);
  const [currentRecommendation, setCurrentRecommendation] =
    useState<RecommendationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState<RouteResponse | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      try {
        const state = await store.load();
        if (!active) return;
        setLocal(state);
        if (state.demoMode && state.savedLocation) {
          setEnvironment({ ...DEMO_ENVIRONMENT, location: state.savedLocation });
        }
      } catch {
        if (!active) return;
        setLocal({ ...DEFAULT_LOCAL_STATE, history: [], feedback: [] });
        setEnvironment(null);
        setError('無法讀取這台裝置上的 AirMe 設定，已改用安全的初始狀態。');
      }

      try {
        const token = await tokenStore.load();
        if (token) {
          try {
            const session = await api.getSession(token);
            if (!active) return;
            setAccount(session.account);
          } catch {
            await tokenStore.clear().catch(() => undefined);
          }
        }
      } catch {
        await tokenStore.clear().catch(() => undefined);
      } finally {
        if (active) setHydrated(true);
      }
    };

    void hydrate();
    return () => {
      active = false;
    };
  }, [api, store, tokenStore]);

  const saveOnboarding = async (profile: Profile, location: Location, deviceProfile: DeviceProfile) => {
    setBusy(true);
    setError(null);
    try {
      await store.saveProfile(profile, deviceProfile);
      const state = await store.setSavedLocation(location);
      setLocal(state);
      if (state.demoMode) setEnvironment({ ...DEMO_ENVIRONMENT, location });
    } finally {
      setBusy(false);
    }
  };

  const understandActivity = async (activityText: string) => {
    setBusy(true);
    setError(null);
    try {
      return local.demoMode
        ? parseActivityIntentLocally(activityText)
        : await api.understandActivity({
            activityText,
            locale: 'zh-TW',
            timeZone: 'Asia/Taipei',
            dataMode: 'live',
          });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '無法整理活動內容。');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const refreshEnvironment = async () => {
    if (!local.savedLocation) return;
    setEnvironmentLoading(true);
    setError(null);
    try {
      const snapshot = local.demoMode
        ? { ...DEMO_ENVIRONMENT, location: local.savedLocation }
        : await api.getEnvironment(local.savedLocation, 'live');
      setEnvironment(snapshot);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '無法更新環境資料。');
    } finally {
      setEnvironmentLoading(false);
    }
  };

  const createRecommendation = async (activityText: string, intent: ActivityIntent) => {
    if (!local.profile || !local.savedLocation) return null;
    setBusy(true);
    setError(null);
    try {
      const request = buildRecommendationRequest({
        activityText,
        profile: local.profile,
        location: local.savedLocation,
        demoMode: local.demoMode,
        confirmedIntent: intent,
      });
      const response = local.demoMode
        ? createDemoRecommendation(request)
        : await api.createRecommendation(request);
      setCurrentRecommendation(response);
      setEnvironment(response.actionCard.environment);
      const state = await store.addHistory(
        toHistoryItem(response, intent, local.savedLocation),
      );
      setLocal(state);
      return response;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '行動卡產生失敗。');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const askFollowUp = async (question: string) => {
    if (!currentRecommendation) throw new Error('找不到目前的行動卡。');
    return local.demoMode
      ? createDemoFollowUp(question, `follow_${Date.now()}`)
      : api.followUp({ question, contextToken: currentRecommendation.contextToken });
  };

  const submitFeedback = async (input: Omit<Feedback, 'id' | 'createdAt'>) => {
    const state = await store.addFeedback({
      ...input,
      id: `feedback_${Date.now()}`,
      createdAt: new Date().toISOString(),
    });
    setLocal(state);
  };

  const setDemoMode = async (value: boolean) => {
    try {
      const state = await store.setDemoMode(value);
      setLocal(state);
      setEnvironment(
        value && state.savedLocation
          ? { ...DEMO_ENVIRONMENT, location: state.savedLocation }
          : null,
      );
      setError(null);
    } catch {
      setError('無法儲存示範模式設定，請稍後再試。');
    }
  };

  const clearAll = async () => {
    setLocal(await store.clear());
    setEnvironment(null);
    setCurrentRecommendation(null);
    setError(null);
  };

  const persistSession = async (session: { accessToken: string; account: Account }) => {
    await tokenStore.save(session.accessToken);
    setAccount(session.account);
  };

  const registerAccount = async (input: RegisterRequest) => {
    setAuthBusy(true);
    setError(null);
    try {
      await persistSession(await api.register(input));
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '無法建立帳號。');
      return false;
    } finally {
      setAuthBusy(false);
    }
  };

  const loginAccount = async (input: LoginRequest) => {
    setAuthBusy(true);
    setError(null);
    try {
      await persistSession(await api.login(input));
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '無法登入帳號。');
      return false;
    } finally {
      setAuthBusy(false);
    }
  };

  const logout = async () => {
    setAuthBusy(true);
    try {
      const token = await tokenStore.load();
      if (token) await api.logout(token).catch(() => undefined);
      await tokenStore.clear();
      setAccount(null);
    } catch {
      setError('無法清除這台裝置的登入狀態，請稍後再試。');
    } finally {
      setAuthBusy(false);
    }
  };

  const deleteAccount = async () => {
    setAuthBusy(true);
    setError(null);
    try {
      const token = await tokenStore.load();
      if (!token) throw new Error('登入已失效，請重新登入後再刪除帳號。');
      await api.deleteAccount(token);
      await tokenStore.clear();
      setAccount(null);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '無法刪除帳號。');
      return false;
    } finally {
      setAuthBusy(false);
    }
  };

  const searchPlaces = async (query: string) => {
    try {
      return await api.searchPlaces({
        query,
        dataMode: local.demoMode ? 'fixture' : 'live',
      });
    } catch (caught) {
      setRouteError(caught instanceof Error ? caught.message : '無法搜尋地點。');
      return null;
    }
  };

  const planRoute = async (input: { origin: RoutePoint; destination: RoutePoint; mode: RouteMode }) => {
    setRouteLoading(true);
    setRouteError(null);
    try {
      const response = await api.getRoutes({
        ...input,
        alternatives: 2,
        dataMode: local.demoMode ? 'fixture' : 'live',
      });
      setRoute(response);
      return response;
    } catch (caught) {
      setRoute(null);
      setRouteError(caught instanceof Error ? caught.message : '無法規劃路線。');
      return null;
    } finally {
      setRouteLoading(false);
    }
  };

  if (!hydrated) {
    return (
      <View accessibilityLabel="AirMe 正在載入" style={styles.loading}>
        <ActivityIndicator color="#176B4D" />
        <Text style={styles.loadingText}>正在開啟 AirMe…</Text>
      </View>
    );
  }

  return (
    <AppContext.Provider
      value={{
        local,
        hydrated,
        busy,
        environmentLoading,
        environment,
        currentRecommendation,
        route,
        routeLoading,
        routeError,
        error,
        account,
        authBusy,
        registerAccount,
        loginAccount,
        logout,
        deleteAccount,
        searchPlaces,
        planRoute,
        saveOnboarding,
        refreshEnvironment,
        understandActivity,
        createRecommendation,
        askFollowUp,
        submitFeedback,
        setDemoMode,
        clearAll,
        clearError: () => setError(null),
      }}>
      {children}
    </AppContext.Provider>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    backgroundColor: '#F4FBF7',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    minHeight: '100%',
  },
  loadingText: { color: '#52645D', fontSize: 16 },
});

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppProvider');
  return value;
}
