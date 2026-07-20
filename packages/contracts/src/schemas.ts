import { z } from 'zod';

const coordinate = (minimum: number, maximum: number) =>
  z
    .number()
    .finite()
    .min(minimum)
    .max(maximum)
    .refine((value) => Math.abs(value * 1_000 - Math.round(value * 1_000)) < 1e-8, {
      message: '座標最多保留小數點後三位。',
    });

const preciseCoordinate = (minimum: number, maximum: number) =>
  z
    .number()
    .finite()
    .min(minimum)
    .max(maximum)
    .refine((value) => Math.abs(value * 1_000_000 - Math.round(value * 1_000_000)) < 1e-8, {
      message: '導航座標最多保留小數點後六位。',
    });

export const DataModeSchema = z.enum(['live', 'fixture']);
export const ProvenanceModeSchema = z.enum(['live', 'partial', 'fixture']);
export const RiskLevelSchema = z.enum(['low', 'moderate', 'high', 'very-high']);
export const AqiCategorySchema = z.enum([
  'good',
  'moderate',
  'unhealthy-sensitive',
  'unhealthy',
  'very-unhealthy',
  'hazardous',
]);

export const TaiwanAdministrativeAreaSchema = z.enum([
  '基隆市',
  '臺北市',
  '新北市',
  '桃園市',
  '新竹市',
  '新竹縣',
  '苗栗縣',
  '臺中市',
  '彰化縣',
  '南投縣',
  '雲林縣',
  '嘉義市',
  '嘉義縣',
  '臺南市',
  '高雄市',
  '屏東縣',
  '宜蘭縣',
  '花蓮縣',
  '臺東縣',
  '澎湖縣',
  '金門縣',
  '連江縣',
]);

export const LocationSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    administrativeArea: TaiwanAdministrativeAreaSchema.optional(),
    latitude: coordinate(21.7, 26.5),
    longitude: coordinate(118, 122.5),
  })
  .strict();

export const ProfileSchema = z
  .object({
    ageGroup: z.enum(['child', 'teen', 'adult']),
    sensitiveConditions: z
      .array(
        z.enum([
          'respiratory-sensitive',
          'cardiovascular-sensitive',
          'allergy-sensitive',
        ]),
      )
      .max(3),
    commuteMode: z.enum(['walk', 'bike', 'public-transit', 'car', 'scooter']),
    commonActivities: z
      .array(z.enum(['walk', 'run', 'cycle', 'ball-sports', 'outdoor-class', 'commute']))
      .max(6)
      .optional(),
  })
  .strict();

export const ActivityIntentSchema = z
  .object({
    activity: z.string().trim().min(1).max(80),
    time: z.string().trim().min(1).max(80).nullable(),
    location: z.string().trim().min(1).max(120).nullable(),
    intensity: z.enum(['light', 'moderate', 'vigorous', 'unspecified']),
    durationMinutes: z.number().int().min(1).max(720).nullable(),
    currentCondition: z.string().trim().min(1).max(160).nullable(),
    userGoal: z.string().trim().min(1).max(160).nullable(),
  })
  .strict();

export const ActivityIntentRequestSchema = z
  .object({
    activityText: z.string().trim().min(2).max(800),
    locale: z.literal('zh-TW'),
    timeZone: z.string().trim().min(1).max(80),
    dataMode: DataModeSchema.default('live'),
  })
  .strict();

export const EnvironmentRequestSchema = z
  .object({
    location: LocationSchema,
    dataMode: DataModeSchema.default('live'),
  })
  .strict();

export const ActivityIntentResponseSchema = z
  .object({
    intent: ActivityIntentSchema,
    missingField: z.enum(['activity', 'time', 'location', 'intensity', 'duration']).nullable(),
    clarificationQuestion: z.string().trim().min(1).max(180).nullable(),
    provenance: z
      .object({
        aiMode: z.enum(['live', 'fixture']),
      })
      .strict(),
  })
  .strict();

export const RecommendationRequestSchema = z
  .object({
    activityText: z.string().trim().min(2).max(800),
    profile: ProfileSchema,
    location: LocationSchema,
    locale: z.literal('zh-TW'),
    timeZone: z.string().trim().min(1).max(80),
    dataMode: DataModeSchema.default('live'),
    confirmedIntent: ActivityIntentSchema.optional(),
  })
  .strict();

export const EnvironmentSourceSchema = z
  .object({
    provider: z.enum(['moenv', 'cwa', 'airme-fixture']),
    label: z.string().trim().min(1).max(100),
    url: z.url(),
    observedAt: z.iso.datetime(),
    fetchedAt: z.iso.datetime(),
    stale: z.boolean(),
  })
  .strict();

export const EnvironmentSnapshotSchema = z
  .object({
    location: LocationSchema,
    airQuality: z
      .object({
        aqi: z.number().int().min(0).max(500),
        category: AqiCategorySchema,
        primaryPollutant: z.string().trim().min(1).max(80).nullable(),
      })
      .strict(),
    weather: z
      .object({
        summary: z.string().trim().min(1).max(160),
        temperatureC: z.number().min(-30).max(60).nullable(),
        rainProbability: z.number().int().min(0).max(100).nullable(),
      })
      .strict(),
    sources: z.array(EnvironmentSourceSchema).min(1).max(3),
    provenance: ProvenanceModeSchema,
  })
  .strict();

export const RecommendedPlanSchema = z
  .object({
    timing: z.string().trim().min(1).max(240),
    location: z.string().trim().min(1).max(240),
    intensity: z.string().trim().min(1).max(240),
    equipment: z.array(z.string().trim().min(1).max(100)).max(5),
  })
  .strict();

export const ActionCardSchema = z
  .object({
    riskLevel: RiskLevelSchema,
    headline: z.string().trim().min(1).max(180),
    recommendedPlan: RecommendedPlanSchema,
    why: z.array(z.string().trim().min(1).max(240)).min(1).max(3),
    safetyNotes: z.array(z.string().trim().min(1).max(240)).min(1).max(4),
    environment: EnvironmentSnapshotSchema,
    provenance: z
      .object({
        overall: ProvenanceModeSchema,
        environmentMode: ProvenanceModeSchema,
        aiMode: z.enum(['live', 'fixture']),
        rulesVersion: z.string().trim().min(1).max(80),
      })
      .strict(),
  })
  .strict();

export const ActionCardDraftSchema = ActionCardSchema.omit({
  environment: true,
  provenance: true,
});

export const RecommendationResponseSchema = z
  .object({
    actionCard: ActionCardSchema,
    contextToken: z.string().min(16).max(4_096),
    requestId: z.string().trim().min(1).max(100),
  })
  .strict();

export const FollowUpRequestSchema = z
  .object({
    question: z.string().trim().min(2).max(500),
    contextToken: z.string().min(16).max(4_096),
  })
  .strict();

export const FollowUpDraftSchema = z
  .object({
    answer: z.string().trim().min(1).max(1_200),
    suggestedQuestions: z.array(z.string().trim().min(1).max(160)).max(3),
  })
  .strict();

export const FollowUpResponseSchema = z
  .object({
    disposition: z.enum(['answered', 'out-of-scope', 'medical-boundary', 'urgent-safety']),
    answer: z.string().trim().min(1).max(1_200),
    suggestedQuestions: z.array(z.string().trim().min(1).max(160)).max(3),
    requestId: z.string().trim().min(1).max(100),
  })
  .strict();

export const ErrorCodeSchema = z.enum([
  'INVALID_REQUEST',
  'OUT_OF_SCOPE',
  'MEDICAL_BOUNDARY',
  'URGENT_SAFETY',
  'ENVIRONMENT_UNAVAILABLE',
  'AI_UNAVAILABLE',
  'CONTEXT_EXPIRED',
  'RATE_LIMITED',
  'AUTH_EMAIL_EXISTS',
  'AUTH_INVALID_CREDENTIALS',
  'AUTH_SESSION_EXPIRED',
  'AUTH_UNAVAILABLE',
  'ROUTING_UNAVAILABLE',
  'GEOCODING_UNAVAILABLE',
  'INTERNAL_ERROR',
]);

export const ApiErrorSchema = z
  .object({
    error: z
      .object({
        code: ErrorCodeSchema,
        message: z.string().trim().min(1).max(240),
        retryable: z.boolean(),
        requestId: z.string().trim().min(1).max(100),
      })
      .strict(),
  })
  .strict();

export const FeedbackSchema = z
  .object({
    id: z.string().trim().min(1).max(100),
    recommendationId: z.string().trim().min(1).max(100),
    completed: z.boolean(),
    discomfort: z.enum(['none', 'mild', 'obvious', 'prefer-not']),
    helpful: z.enum(['yes', 'no', 'unsure']),
    note: z.string().trim().max(240).optional(),
    createdAt: z.iso.datetime(),
  })
  .strict();

export const RecommendationHistoryItemSchema = z
  .object({
    id: z.string().trim().min(1).max(100),
    createdAt: z.iso.datetime(),
    activitySummary: z.string().trim().min(1).max(160),
    locationName: z.string().trim().min(1).max(80),
    riskLevel: RiskLevelSchema,
    headline: z.string().trim().min(1).max(180),
    provenance: ProvenanceModeSchema,
    activity: z.string().trim().min(1).max(80).optional(),
    activityTime: z.string().trim().min(1).max(80).optional(),
    durationMinutes: z.number().int().min(1).max(720).optional(),
    intensity: z.enum(['light', 'moderate', 'vigorous', 'unspecified']).optional(),
    aqi: z.number().int().min(0).max(500).optional(),
    aqiCategory: AqiCategorySchema.optional(),
    weatherSummary: z.string().trim().min(1).max(160).optional(),
    recommendedPlanSummary: z.string().trim().min(1).max(240).optional(),
    rulesVersion: z.string().trim().min(1).max(80).optional(),
  })
  .strict();

export const AccountSchema = z
  .object({
    id: z.uuid(),
    email: z.email().max(254),
    displayName: z.string().trim().min(1).max(40),
    createdAt: z.iso.datetime(),
  })
  .strict();

export const RegisterRequestSchema = z
  .object({
    email: z.email().max(254),
    password: z.string().min(12).max(128),
    displayName: z.string().trim().min(1).max(40),
    privacyConsent: z.literal(true),
  })
  .strict();

export const LoginRequestSchema = z
  .object({
    email: z.email().max(254),
    password: z.string().min(1).max(128),
  })
  .strict();

export const AuthSessionSchema = z
  .object({
    account: AccountSchema,
    accessToken: z.string().min(32).max(512),
    expiresAt: z.iso.datetime(),
  })
  .strict();

export const SessionStatusSchema = z
  .object({
    account: AccountSchema,
    expiresAt: z.iso.datetime(),
  })
  .strict();

export const RoutePointSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    latitude: preciseCoordinate(21.7, 26.5),
    longitude: preciseCoordinate(118, 122.5),
  })
  .strict();

export const RouteModeSchema = z.enum(['walking', 'cycling', 'driving']);

export const RouteRequestSchema = z
  .object({
    origin: RoutePointSchema,
    destination: RoutePointSchema,
    mode: RouteModeSchema,
    alternatives: z.number().int().min(1).max(3).default(2),
    dataMode: DataModeSchema.default('live'),
  })
  .strict();

export const RouteStepSchema = z
  .object({
    instruction: z.string().trim().min(1).max(240),
    distanceMeters: z.number().finite().min(0).max(2_000_000),
    durationSeconds: z.number().finite().min(0).max(172_800),
  })
  .strict();

export const RouteAlternativeSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    distanceMeters: z.number().finite().min(0).max(2_000_000),
    durationSeconds: z.number().finite().min(0).max(172_800),
    coordinates: z
      .array(z.tuple([preciseCoordinate(118, 122.5), preciseCoordinate(21.7, 26.5)]))
      .min(2)
      .max(5_000),
    steps: z.array(RouteStepSchema).min(1).max(80),
  })
  .strict();

export const RouteResponseSchema = z
  .object({
    origin: RoutePointSchema,
    destination: RoutePointSchema,
    mode: RouteModeSchema,
    alternatives: z.array(RouteAlternativeSchema).min(1).max(3),
    generatedAt: z.iso.datetime(),
    provenance: z.enum(['live', 'fixture']),
    provider: z.enum(['valhalla', 'airme-fixture']),
    attribution: z.string().trim().min(1).max(240),
  })
  .strict();

export const GeocodingSearchRequestSchema = z
  .object({
    query: z.string().trim().min(2).max(120),
    dataMode: DataModeSchema.default('live'),
  })
  .strict();

export const GeocodingResultSchema = z
  .object({
    id: z.string().trim().min(1).max(160),
    name: z.string().trim().min(1).max(160),
    administrativeArea: TaiwanAdministrativeAreaSchema.optional(),
    latitude: preciseCoordinate(21.7, 26.5),
    longitude: preciseCoordinate(118, 122.5),
  })
  .strict();

export const GeocodingSearchResponseSchema = z
  .object({
    results: z.array(GeocodingResultSchema).max(8),
    provenance: z.enum(['live', 'fixture']),
    provider: z.enum(['photon', 'airme-fixture']),
    attribution: z.string().trim().min(1).max(240),
  })
  .strict();

export type DataMode = z.infer<typeof DataModeSchema>;
export type ProvenanceMode = z.infer<typeof ProvenanceModeSchema>;
export type RiskLevel = z.infer<typeof RiskLevelSchema>;
export type TaiwanAdministrativeArea = z.infer<typeof TaiwanAdministrativeAreaSchema>;
export type Location = z.infer<typeof LocationSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type ActivityIntent = z.infer<typeof ActivityIntentSchema>;
export type ActivityIntentRequest = z.infer<typeof ActivityIntentRequestSchema>;
export type ActivityIntentResponse = z.infer<typeof ActivityIntentResponseSchema>;
export type EnvironmentRequest = z.infer<typeof EnvironmentRequestSchema>;
export type RecommendationRequest = z.infer<typeof RecommendationRequestSchema>;
export type EnvironmentSnapshot = z.infer<typeof EnvironmentSnapshotSchema>;
export type ActionCard = z.infer<typeof ActionCardSchema>;
export type ActionCardDraft = z.infer<typeof ActionCardDraftSchema>;
export type RecommendationResponse = z.infer<typeof RecommendationResponseSchema>;
export type FollowUpRequest = z.infer<typeof FollowUpRequestSchema>;
export type FollowUpDraft = z.infer<typeof FollowUpDraftSchema>;
export type FollowUpResponse = z.infer<typeof FollowUpResponseSchema>;
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type Feedback = z.infer<typeof FeedbackSchema>;
export type RecommendationHistoryItem = z.infer<typeof RecommendationHistoryItemSchema>;
export type Account = z.infer<typeof AccountSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type AuthSession = z.infer<typeof AuthSessionSchema>;
export type SessionStatus = z.infer<typeof SessionStatusSchema>;
export type RoutePoint = z.infer<typeof RoutePointSchema>;
export type RouteMode = z.infer<typeof RouteModeSchema>;
export type RouteRequest = z.infer<typeof RouteRequestSchema>;
export type RouteStep = z.infer<typeof RouteStepSchema>;
export type RouteAlternative = z.infer<typeof RouteAlternativeSchema>;
export type RouteResponse = z.infer<typeof RouteResponseSchema>;
export type GeocodingSearchRequest = z.infer<typeof GeocodingSearchRequestSchema>;
export type GeocodingResult = z.infer<typeof GeocodingResultSchema>;
export type GeocodingSearchResponse = z.infer<typeof GeocodingSearchResponseSchema>;
