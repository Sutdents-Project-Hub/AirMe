import type {
  ActionCardDraft,
  ActivityIntent,
  EnvironmentSnapshot,
  FollowUpDraft,
  ProfileDraft,
  RecommendationRequest,
} from '@airme/contracts';

import type { ActivityRuleResult } from '../../domain/rules';
import type { RecommendationContext } from '../../domain/context-token';

export interface ActionCardAiInput {
  request: RecommendationRequest;
  environment: EnvironmentSnapshot;
  rules: ActivityRuleResult;
}

export interface AiAdapter {
  readonly mode: 'live' | 'fixture';
  createActionCard(input: ActionCardAiInput): Promise<ActionCardDraft>;
  parseActivityIntent?(activityText: string): Promise<ActivityIntent>;
  understandProfile?(description: string): Promise<{
    profile: ProfileDraft;
    commonAreaHint: string | null;
  }>;
  answerFollowUp?(input: {
    question: string;
    context: RecommendationContext;
  }): Promise<FollowUpDraft>;
}
