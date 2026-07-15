import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FeedbackSchema,
  LocationSchema,
  ProfileSchema,
  RecommendationHistoryItemSchema,
  type Feedback,
  type Location,
  type Profile,
  type RecommendationHistoryItem,
} from '@airme/contracts';
import { z } from 'zod';

const STORAGE_KEY = 'airme.local-state';

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const LocalStateSchema = z
  .object({
    version: z.literal(1),
    profile: ProfileSchema.nullable(),
    savedLocation: LocationSchema.nullable(),
    onboardingCompleted: z.boolean(),
    history: z.array(RecommendationHistoryItemSchema).max(20),
    feedback: z.array(FeedbackSchema).max(50),
    demoMode: z.boolean(),
  })
  .strict();

export type LocalState = z.infer<typeof LocalStateSchema>;

export const DEFAULT_LOCAL_STATE: LocalState = {
  version: 1,
  profile: null,
  savedLocation: null,
  onboardingCompleted: false,
  history: [],
  feedback: [],
  demoMode: true,
};

function freshDefault(): LocalState {
  return { ...DEFAULT_LOCAL_STATE, history: [], feedback: [] };
}

export function createLocalStore(storage: KeyValueStorage = AsyncStorage) {
  async function load(): Promise<LocalState> {
    const raw = await storage.getItem(STORAGE_KEY);
    if (!raw) return freshDefault();
    try {
      const parsed = LocalStateSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : freshDefault();
    } catch {
      return freshDefault();
    }
  }

  async function write(state: LocalState): Promise<LocalState> {
    const parsed = LocalStateSchema.parse(state);
    await storage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    return parsed;
  }

  return {
    load,
    async saveProfile(profile: Profile): Promise<LocalState> {
      const current = await load();
      return write({
        ...current,
        profile: ProfileSchema.parse(profile),
        onboardingCompleted: true,
      });
    },
    async setDemoMode(demoMode: boolean): Promise<LocalState> {
      return write({ ...(await load()), demoMode });
    },
    async setSavedLocation(savedLocation: Location): Promise<LocalState> {
      return write({ ...(await load()), savedLocation: LocationSchema.parse(savedLocation) });
    },
    async addHistory(item: RecommendationHistoryItem): Promise<LocalState> {
      const current = await load();
      const parsed = RecommendationHistoryItemSchema.parse(item);
      const history = [parsed, ...current.history.filter((entry) => entry.id !== parsed.id)].slice(
        0,
        20,
      );
      return write({ ...current, history });
    },
    async addFeedback(item: Feedback): Promise<LocalState> {
      const current = await load();
      const parsed = FeedbackSchema.parse(item);
      const feedback = [parsed, ...current.feedback.filter((entry) => entry.id !== parsed.id)].slice(
        0,
        50,
      );
      return write({ ...current, feedback });
    },
    async clear(): Promise<LocalState> {
      await storage.removeItem(STORAGE_KEY);
      return freshDefault();
    },
  };
}

export const localStore = createLocalStore();
