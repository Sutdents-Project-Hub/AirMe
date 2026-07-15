import type {
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
}): RecommendationRequest {
  return {
    activityText: input.activityText.trim(),
    profile: input.profile,
    location: input.location,
    locale: 'zh-TW',
    timeZone: 'Asia/Taipei',
    dataMode: input.demoMode ? 'fixture' : 'live',
  };
}

export function toHistoryItem(
  recommendation: RecommendationResponse,
  activityText: string,
  location: Location,
  createdAt = new Date().toISOString(),
): RecommendationHistoryItem {
  return {
    id: recommendation.requestId,
    createdAt,
    activitySummary: activityText.trim().slice(0, 160),
    locationName: location.name,
    riskLevel: recommendation.actionCard.riskLevel,
    headline: recommendation.actionCard.headline,
    provenance: recommendation.actionCard.provenance.overall,
  };
}
