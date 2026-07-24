import { Redirect, type Href, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '../components/app-header';
import { HistoryList } from '../components/history-list';
import { PageShell } from '../components/page-shell';
import { AppText } from '../components/ui/app-text';
import { Screen } from '../components/ui/screen';
import { radii, spacing, usePalette } from '../design/tokens';
import { useApp } from '../state/app-provider';

export default function HistoryScreen() {
  const app = useApp();
  const palette = usePalette();
  const router = useRouter();
  if (app.hydrated && !app.account) {
    return <Redirect href={'/account' as Href} />;
  }
  if (app.hydrated && !app.local.onboardingCompleted) {
    return <Redirect href={'/onboarding' as Href} />;
  }
  return (
    <PageShell>
      <Screen maxWidth={860}>
        <AppHeader demoMode={app.local.demoMode} />
        <View style={styles.hero}>
          <View style={[styles.eyebrow, { backgroundColor: palette.accentSoft }]}>
            <AppText variant="body-small" weight="900" tone="accent">
              我的 Air 日誌
            </AppText>
          </View>
          <AppText variant="display" weight="900">
            活動、環境與感受，{`\n`}留成自己的脈絡。
          </AppText>
          <AppText tone="muted">
            摘要與主觀回饋會先保存在這台裝置；後端啟用帳號同步時會加密同步。AirMe
            不宣稱環境與感受之間的醫療因果。
          </AppText>
        </View>
        <HistoryList
          items={app.local.history}
          feedback={app.local.feedback}
          onCreateRecommendation={() => router.replace('/' as Href)}
          onSubmitFeedback={app.submitFeedback}
        />
      </Screen>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.md, maxWidth: 680 },
  eyebrow: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
