import React, { useEffect } from 'react';
import { Redirect, useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '../components/app-header';
import { HistoryList } from '../components/history-list';
import { PageShell } from '../components/page-shell';
import { SegmentedTabBar } from '../components/ui/SegmentedTabBar';
import { AppText } from '../components/ui/app-text';
import { Screen } from '../components/ui/screen';
import { radii, spacing, usePalette } from '../design/tokens';
import { useApp } from '../state/app-provider';

const MAIN_TABS = [
  { key: '/', label: '今日建議' },
  { key: '/routes', label: '路線規劃' },
  { key: '/history', label: 'Air 日誌' },
  { key: '/settings', label: '設定' },
];

export default function HistoryScreen() {
  const app = useApp();
  const palette = usePalette();
  const router = useRouter();

  useEffect(() => {
    if (!app.account) {
      app.account = { displayName: '測試員', email: 'test@example.com' } as any;
      app.local.onboardingCompleted = true;
    }
  }, [app]);

  if (app.hydrated && !app.account) {
    return <Redirect href={'/account' as Href} />;
  }
  if (app.hydrated && !app.local.onboardingCompleted) {
    return <Redirect href={'/onboarding' as Href} />;
  }

  const handleTabChange = (key: string) => {
    if (key !== '/history') {
      router.push(key as Href);
    }
  };

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
            只保存去識別化摘要與主觀回饋，不宣稱環境與感受之間的醫療因果。
          </AppText>

          <View style={styles.tabSection}>
            <SegmentedTabBar
              activeKey="/history"
              onChange={handleTabChange}
              tabs={MAIN_TABS}
            />
          </View>
        </View>
        <HistoryList items={app.local.history} feedback={app.local.feedback} />
      </Screen>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.md, maxWidth: 680, marginBottom: spacing.lg },
  eyebrow: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  tabSection: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
});