import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SESSION_TOKEN_KEY = 'airme.auth-session-token.v1';

export interface AuthTokenStore {
  clear(): Promise<void>;
  load(): Promise<string | null>;
  save(token: string): Promise<void>;
}

function getWebSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export const authTokenStore: AuthTokenStore = {
  async clear() {
    if (Platform.OS === 'web') {
      getWebSessionStorage()?.removeItem(SESSION_TOKEN_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
  },
  async load() {
    if (Platform.OS === 'web') {
      return getWebSessionStorage()?.getItem(SESSION_TOKEN_KEY) ?? null;
    }
    return SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  },
  async save(token) {
    if (Platform.OS === 'web') {
      const storage = getWebSessionStorage();
      if (!storage) throw new Error('此瀏覽器無法安全保存登入狀態。');
      storage.setItem(SESSION_TOKEN_KEY, token);
      return;
    }
    await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },
};
