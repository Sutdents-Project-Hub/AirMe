import type {
  ActionCardDraft,
  EnvironmentSnapshot,
  FollowUpDraft,
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
  answerFollowUp?(input: {
    question: string;
    context: RecommendationContext;
  }): Promise<FollowUpDraft>;
}
