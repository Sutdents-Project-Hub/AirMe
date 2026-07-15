import { Redirect, type Href } from 'expo-router';
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
  if (app.hydrated && !app.local.onboardingCompleted) {
    return <Redirect href={'/onboarding' as Href} />;
  }
  return (
    <PageShell>
      <Screen maxWidth={860}>
        <AppHeader demoMode={app.local.demoMode} />
        <View style={styles.hero}>
          <View style={[styles.eyebrow, { backgroundColor: palette.coral, borderColor: palette.ink }]}>
            <AppText variant="body-small" weight="900" style={{ color: palette.surface }}>
              MY AIR LOG
            </AppText>
          </View>
          <AppText variant="display" weight="900">
            每一次選擇，{`\n`}都留下剛好的線索。
          </AppText>
          <AppText tone="muted">
            只保存去識別化摘要與主觀回饋，不宣稱環境與感受之間的醫療因果。
          </AppText>
        </View>
        <HistoryList items={app.local.history} />
      </Screen>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.md, maxWidth: 680 },
  eyebrow: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
