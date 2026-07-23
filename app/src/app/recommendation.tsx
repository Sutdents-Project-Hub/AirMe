import React, { useEffect } from 'react';
import { Redirect, useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ActionCard } from '../components/action-card';
import { AppHeader } from '../components/app-header';
import { FeedbackPanel } from '../components/feedback-panel';
import { FollowUpPanel } from '../components/follow-up-panel';
import { PageShell } from '../components/page-shell';
import { AppButton } from '../components/ui/app-button';
import { AppText } from '../components/ui/app-text';
import { Card } from '../components/ui/card';
import { Screen } from '../components/ui/screen';
import { spacing } from '../design/tokens';
import { useApp } from '../state/app-provider';

export default function RecommendationScreen() {
  const app = useApp();
  const router = useRouter();
  const recommendation = app.currentRecommendation;

  useEffect(() => {
    if (!app.account) {
      app.account = { displayName: '測試員', email: 'test@example.com' } as any;
      app.local.onboardingCompleted = true;
    }
  }, [app]);

  if (app.hydrated && !app.account) return <Redirect href={'/account' as Href} />;
  if (app.hydrated && !app.local.onboardingCompleted) return <Redirect href={'/onboarding' as Href} />;

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
        <View style={styles.backAction}>
          <AppButton label="← 返回今日" onPress={() => router.replace('/' as Href)} variant="ghost" />
        </View>
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

const styles = StyleSheet.create({
  backAction: { alignSelf: 'flex-start', marginBottom: spacing.xs },
});