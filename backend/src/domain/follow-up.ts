import {
  FollowUpDraftSchema,
  FollowUpResponseSchema,
  type FollowUpRequest,
  type FollowUpResponse,
} from '@airme/contracts';

import type { RecommendationContext, ContextTokenService } from './context-token';
import {
  classifyUserText,
  containsUngroundedPersonalClaim,
  containsUnsafeMedicalClaim,
  contradictsSafetyFloor,
  FIXED_SAFETY_MESSAGES,
} from './safety';

interface FollowUpAi {
  answerFollowUp?: (input: {
    question: string;
    context: RecommendationContext;
  }) => Promise<{ answer: string; suggestedQuestions: string[] }>;
}

interface FollowUpServiceOptions {
  contextTokens: ContextTokenService;
  ai: FollowUpAi;
  requestId?: () => string;
}

function deterministicAnswer(context: RecommendationContext): string {
  const restrictions = context.restrictions.join('；') || '依當下感受調整活動強度';
  return `依目前 AQI ${context.environment.aqi} 與規則底線：${restrictions}。若改到室內，仍請確認通風與現場空氣狀況。`;
}

export class FollowUpService {
  constructor(private readonly options: FollowUpServiceOptions) {}

  async answer(request: FollowUpRequest): Promise<FollowUpResponse> {
    const disposition = classifyUserText(request.question);
    const requestId = (this.options.requestId ?? (() => crypto.randomUUID()))();

    if (disposition !== 'allowed') {
      const publicDisposition = disposition === 'injection' ? 'out-of-scope' : disposition;
      return FollowUpResponseSchema.parse({
        disposition: publicDisposition,
        answer: FIXED_SAFETY_MESSAGES[disposition],
        suggestedQuestions: ['現在適合改成什麼活動？'],
        requestId,
      });
    }

    const context = this.options.contextTokens.verify(request.contextToken);

    let draft = {
      answer: deterministicAnswer(context),
      suggestedQuestions: ['多久後再確認 AQI？', '如果改成低強度活動呢？'],
    };
    if (this.options.ai.answerFollowUp) {
      try {
        const candidate = FollowUpDraftSchema.parse(
          await this.options.ai.answerFollowUp({ question: request.question, context }),
        );
        if (
          containsUnsafeMedicalClaim(candidate.answer) ||
          containsUngroundedPersonalClaim(candidate.answer) ||
          contradictsSafetyFloor(
            candidate.answer,
            context.minimumRiskLevel,
            context.restrictions,
          )
        ) {
          throw new Error('AI_UNSAFE_OUTPUT');
        }
        draft = candidate;
      } catch {
        // The deterministic answer remains available for the competition fallback path.
      }
    }

    return FollowUpResponseSchema.parse({
      disposition: 'answered',
      ...draft,
      requestId,
    });
  }
}
