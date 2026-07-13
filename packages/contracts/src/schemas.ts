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

export const LocationSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    latitude: coordinate(-90, 90),
    longitude: coordinate(-180, 180),
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

export const RecommendationRequestSchema = z
  .object({
    activityText: z.string().trim().min(2).max(800),
    profile: ProfileSchema,
    location: LocationSchema,
    locale: z.literal('zh-TW'),
    timeZone: z.string().trim().min(1).max(80),
    dataMode: DataModeSchema.default('live'),
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
    feeling: z.enum(['better', 'same', 'worse', 'not-sure']),
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
  })
  .strict();

export type DataMode = z.infer<typeof DataModeSchema>;
export type ProvenanceMode = z.infer<typeof ProvenanceModeSchema>;
export type RiskLevel = z.infer<typeof RiskLevelSchema>;
export type Location = z.infer<typeof LocationSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
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
