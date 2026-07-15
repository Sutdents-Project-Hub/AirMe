import type {
  ActivityIntent,
  Location,
  Profile,
  RecommendationHistoryItem,
  RecommendationRequest,
  RecommendationResponse,
} from '@airme/contracts';

export function buildRecommendationRequest(input: {
  activityText: string;
  profile: Profile;
  location: Location;
  demoMode: boolean;
  confirmedIntent?: ActivityIntent;
}): RecommendationRequest {
  return {
    activityText: input.activityText.trim(),
    profile: input.profile,
    location: input.location,
    locale: 'zh-TW',
    timeZone: 'Asia/Taipei',
    dataMode: input.demoMode ? 'fixture' : 'live',
    ...(input.confirmedIntent ? { confirmedIntent: input.confirmedIntent } : {}),
  };
}

export function toHistoryItem(
  recommendation: RecommendationResponse,
  intent: ActivityIntent,
  location: Location,
  createdAt = new Date().toISOString(),
): RecommendationHistoryItem {
  return {
    id: recommendation.requestId,
    createdAt,
    activitySummary: [
      intent.activity,
      intent.time,
      intent.durationMinutes ? `${intent.durationMinutes} 分鐘` : null,
    ]
      .filter(Boolean)
      .join(' · ')
      .slice(0, 160),
    locationName: location.name,
    riskLevel: recommendation.actionCard.riskLevel,
    headline: recommendation.actionCard.headline,
    provenance: recommendation.actionCard.provenance.overall,
    activity: intent.activity,
    activityTime: intent.time ?? undefined,
    durationMinutes: intent.durationMinutes ?? undefined,
    intensity: intent.intensity,
    aqi: recommendation.actionCard.environment.airQuality.aqi,
    aqiCategory: recommendation.actionCard.environment.airQuality.category,
    weatherSummary: recommendation.actionCard.environment.weather.summary,
    recommendedPlanSummary: recommendation.actionCard.recommendedPlan.intensity,
    rulesVersion: recommendation.actionCard.provenance.rulesVersion,
  };
}
