import type { Profile, RecommendationHistoryItem } from '@airme/contracts';
import { describe, expect, it } from 'vitest';

import { createLocalStore, DEFAULT_LOCAL_STATE, type KeyValueStorage } from './local-store';

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage {
  const values = new Map(Object.entries(initial));
  return {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      values.set(key, value);
    },
    removeItem: async (key) => {
      values.delete(key);
    },
  };
}

const profile: Profile = {
  ageGroup: 'teen',
  sensitiveConditions: ['respiratory-sensitive'],
  commuteMode: 'walk',
  commonActivities: ['run', 'commute'],
};

function historyItem(index: number): RecommendationHistoryItem {
  return {
    id: `recommendation-${index}`,
    createdAt: new Date(Date.UTC(2026, 6, 13, 2, index)).toISOString(),
    activitySummary: `活動 ${index}`,
    locationName: '高雄市前鎮區',
    riskLevel: 'moderate',
    headline: '可以活動，保留調整空間。',
    provenance: 'fixture',
  };
}

describe('local store', () => {
  it('returns a safe default for first launch or corrupt data', async () => {
    expect(await createLocalStore(memoryStorage()).load()).toEqual(DEFAULT_LOCAL_STATE);
    expect(
      await createLocalStore(memoryStorage({ 'airme.local-state': '{broken' })).load(),
    ).toEqual(DEFAULT_LOCAL_STATE);
  });

  it('persists only the approved profile fields', async () => {
    const store = createLocalStore(memoryStorage());

    const state = await store.saveProfile(profile);

    expect(state.profile).toEqual(profile);
    expect(state.onboardingCompleted).toBe(true);
    expect(JSON.stringify(state)).not.toContain('studentId');
  });

  it('persists one coarse common location without a location trail', async () => {
    const store = createLocalStore(memoryStorage());

    const state = await store.setSavedLocation({
      name: '高科大第一校區周邊',
      latitude: 22.754,
      longitude: 120.335,
    });

    expect(state.savedLocation?.name).toBe('高科大第一校區周邊');
    expect(JSON.stringify(state)).not.toContain('locationHistory');
  });

  it('keeps only the 20 most recent recommendation summaries', async () => {
    const store = createLocalStore(memoryStorage());
    for (let index = 0; index < 22; index += 1) {
      await store.addHistory(historyItem(index));
    }

    const state = await store.load();

    expect(state.history).toHaveLength(20);
    expect(state.history[0].id).toBe('recommendation-21');
    expect(state.history.at(-1)?.id).toBe('recommendation-2');
  });

  it('clears all local personal state', async () => {
    const store = createLocalStore(memoryStorage());
    await store.saveProfile(profile);
    await store.setDemoMode(false);

    expect(await store.clear()).toEqual(DEFAULT_LOCAL_STATE);
    expect(await store.load()).toEqual(DEFAULT_LOCAL_STATE);
  });
});
