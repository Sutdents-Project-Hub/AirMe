import { useRouter, type Href } from 'expo-router';

import { ActionCard } from '../components/action-card';
import { AppHeader } from '../components/app-header';
import { FeedbackPanel } from '../components/feedback-panel';
import { FollowUpPanel } from '../components/follow-up-panel';
import { PageShell } from '../components/page-shell';
import { AppButton } from '../components/ui/app-button';
import { AppText } from '../components/ui/app-text';
import { Card } from '../components/ui/card';
import { Screen } from '../components/ui/screen';
import { useApp } from '../state/app-provider';

export default function RecommendationScreen() {
  const app = useApp();
  const router = useRouter();
  const recommendation = app.currentRecommendation;

  if (!recommendation) {
    return (
      <PageShell>
        <Screen maxWidth={760}>
          <AppHeader demoMode={app.local.demoMode} />
          <Card>
            <AppText variant="title" weight="800">
              這張行動卡已不在目前工作階段
            </AppText>
            <AppText tone="muted">為了資料最小化，重新整理後不保存完整模型對話。</AppText>
            <AppButton label="回到今日" onPress={() => router.replace('/' as Href)} />
          </Card>
        </Screen>
      </PageShell>
    );
  }

  const submitted = app.local.feedback.some(
    (item) => item.recommendationId === recommendation.requestId,
  );

  return (
    <PageShell>
      <Screen maxWidth={860}>
        <AppHeader demoMode={app.local.demoMode} />
        <AppButton label="返回今日" onPress={() => router.replace('/' as Href)} variant="ghost" />
        <ActionCard recommendation={recommendation} />
        <FollowUpPanel onAsk={app.askFollowUp} />
        <FeedbackPanel
          recommendationId={recommendation.requestId}
          submitted={submitted}
          onSubmit={app.submitFeedback}
        />
      </Screen>
    </PageShell>
  );
}
