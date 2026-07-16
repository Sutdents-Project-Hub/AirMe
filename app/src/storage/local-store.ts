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

const DeviceProfileSchema = z
  .object({
    displayName: z.string().trim().min(1).max(24),
  })
  .strict();

export type DeviceProfile = z.infer<typeof DeviceProfileSchema>;

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const LegacyFeedbackSchema = z
  .object({
    id: z.string().trim().min(1).max(100),
    recommendationId: z.string().trim().min(1).max(100),
    completed: z.boolean(),
    feeling: z.enum(['better', 'same', 'worse', 'not-sure']),
    note: z.string().trim().max(240).optional(),
    createdAt: z.iso.datetime(),
  })
  .strict()
  .transform(({ feeling: _feeling, ...feedback }): Feedback => ({
    ...feedback,
    discomfort: 'prefer-not',
    helpful: 'unsure',
  }));

const StoredFeedbackSchema = z.union([FeedbackSchema, LegacyFeedbackSchema]);

const LegacyLocalStateSchema = z
  .object({
    version: z.literal(1),
    profile: ProfileSchema.nullable(),
    savedLocation: LocationSchema.nullable(),
    onboardingCompleted: z.boolean(),
    history: z.array(RecommendationHistoryItemSchema).max(20),
    feedback: z.array(StoredFeedbackSchema).max(50),
    demoMode: z.boolean(),
  })
  .strict();

const LocalStateSchema = z
  .object({
    version: z.literal(2),
    deviceProfile: DeviceProfileSchema.nullable(),
    profile: ProfileSchema.nullable(),
    savedLocation: LocationSchema.nullable(),
    onboardingCompleted: z.boolean(),
    history: z.array(RecommendationHistoryItemSchema).max(20),
    feedback: z.array(StoredFeedbackSchema).max(50),
    demoMode: z.boolean(),
  })
  .strict();

export type LocalState = z.infer<typeof LocalStateSchema>;

export const DEFAULT_LOCAL_STATE: LocalState = {
  version: 2,
  deviceProfile: null,
  profile: null,
  savedLocation: null,
  onboardingCompleted: false,
  history: [],
  feedback: [],
  demoMode: true,
};

function freshDefault(): LocalState {
  return { ...DEFAULT_LOCAL_STATE, deviceProfile: null, history: [], feedback: [] };
}

function migrate(value: unknown): LocalState | null {
  const current = LocalStateSchema.safeParse(value);
  if (current.success) return current.data;
  const legacy = LegacyLocalStateSchema.safeParse(value);
  if (!legacy.success) return null;
  return LocalStateSchema.parse({
    ...legacy.data,
    version: 2,
    deviceProfile: null,
  });
}

export function createLocalStore(storage: KeyValueStorage = AsyncStorage) {
  async function load(): Promise<LocalState> {
    const raw = await storage.getItem(STORAGE_KEY);
    if (!raw) return freshDefault();
    try {
      return migrate(JSON.parse(raw)) ?? freshDefault();
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
    async saveProfile(profile: Profile, deviceProfile?: DeviceProfile): Promise<LocalState> {
      const current = await load();
      return write({
        ...current,
        deviceProfile: deviceProfile ? DeviceProfileSchema.parse(deviceProfile) : current.deviceProfile,
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
