import React, { useEffect, useRef, useState } from 'react';
import { Redirect, useRouter, type Href } from 'expo-router';
import {
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { ActivityComposer } from '../components/activity-composer';
import { AppHeader } from '../components/app-header';
import { EnvironmentHero } from '../components/environment-hero';
import { PageShell } from '../components/page-shell';
import { SegmentedTabBar } from '../components/ui/SegmentedTabBar';
import { AppButton } from '../components/ui/app-button';
import { AppText } from '../components/ui/app-text';
import { Card } from '../components/ui/card';
import { Screen } from '../components/ui/screen';
import { spacing, usePalette } from '../design/tokens';
import { useApp } from '../state/app-provider';

// ----------------------------------------------------------------------
// 1. 蘋果流體動態背景氣泡
// ----------------------------------------------------------------------
interface AppleBubbleConfig {
  id: number;
  size: number;
  color: string;
  top: `${number}%`;
  left: `${number}%`;
  opacity: number;
  duration: number;
  delay: number;
  offsetY: number;
  offsetX: number;
  scaleRange: [number, number, number];
}

const BUBBLE_CONFIGS: AppleBubbleConfig[] = [
  { id: 1, size: 220, color: '#A7F3D0', top: '-2%', left: '-10%', opacity: 0.3, duration: 8000, delay: 0, offsetY: -40, offsetX: 20, scaleRange: [1, 1.06, 0.96] },
  { id: 2, size: 260, color: '#D1FAE5', top: '35%', left: '72%', opacity: 0.35, duration: 9500, delay: 600, offsetY: -55, offsetX: -25, scaleRange: [1, 1.04, 0.98] },
  { id: 3, size: 240, color: '#6EE7B7', top: '68%', left: '-15%', opacity: 0.25, duration: 9000, delay: 300, offsetY: -45, offsetX: 30, scaleRange: [1, 1.05, 0.95] },
  { id: 4, size: 42, color: '#10B981', top: '12%', left: '18%', opacity: 0.5, duration: 4200, delay: 800, offsetY: -28, offsetX: -12, scaleRange: [1, 1.12, 0.92] },
  { id: 5, size: 28, color: '#059669', top: '16%', left: '84%', opacity: 0.45, duration: 3600, delay: 1200, offsetY: -20, offsetX: 10, scaleRange: [1, 1.08, 0.95] },
  { id: 6, size: 68, color: '#34D399', top: '26%', left: '6%', opacity: 0.4, duration: 5200, delay: 200, offsetY: -36, offsetX: 18, scaleRange: [1, 1.1, 0.94] },
  { id: 7, size: 22, color: '#047857', top: '45%', left: '94%', opacity: 0.6, duration: 3200, delay: 1500, offsetY: -18, offsetX: -8, scaleRange: [1, 1.15, 0.9] },
  { id: 8, size: 52, color: '#A7F3D0', top: '56%', left: '16%', opacity: 0.55, duration: 4800, delay: 500, offsetY: -32, offsetX: -15, scaleRange: [1, 1.08, 0.96] },
  { id: 9, size: 80, color: '#10B981', top: '65%', left: '85%', opacity: 0.35, duration: 6100, delay: 900, offsetY: -42, offsetX: 22, scaleRange: [1, 1.06, 0.95] },
  { id: 10, size: 36, color: '#34D399', top: '82%', left: '28%', opacity: 0.5, duration: 4000, delay: 400, offsetY: -24, offsetX: -10, scaleRange: [1, 1.1, 0.92] },
  { id: 11, size: 58, color: '#6EE7B7', top: '86%', left: '76%', opacity: 0.45, duration: 5000, delay: 1100, offsetY: -34, offsetX: 14, scaleRange: [1, 1.07, 0.95] },
];

function AppleBubbleItem({ item }: { item: AppleBubbleConfig }) {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(item.delay),
        Animated.timing(animValue, {
          toValue: 1,
          duration: item.duration,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
        Animated.timing(animValue, {
          toValue: 0,
          duration: item.duration,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [animValue, item]);

  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, item.offsetY],
  });

  const translateX = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, item.offsetX, 0],
  });

  const scale = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: item.scaleRange,
  });

  return (
    <Animated.View
      style={[
        styles.bubble,
        {
          width: item.size,
          height: item.size,
          borderRadius: item.size / 2,
          backgroundColor: item.color,
          top: item.top,
          left: item.left,
          opacity: item.opacity,
          transform: [{ translateY }, { translateX }, { scale }],
        },
      ]}
    />
  );
}

function AppleFloatingBackground() {
  return (
    <View style={styles.bubbleLayer} pointerEvents="none">
      {BUBBLE_CONFIGS.map((bubble) => (
        <AppleBubbleItem key={bubble.id} item={bubble} />
      ))}
    </View>
  );
}

// ----------------------------------------------------------------------
// 2. 主畫面 (HomeScreen)
// ----------------------------------------------------------------------
export default function HomeScreen() {
  const app = useApp();
  const palette = usePalette();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wideDashboard = width >= 880;

  const [activeTab, setActiveTab] = useState('today');

  useEffect(() => {
    if (!app.account) {
      app.account = { displayName: '測試員', email: 'test@example.com' } as any;
      app.local.onboardingCompleted = true;
    }
  }, [app]);

  if (!app.hydrated) {
    return (
      <View style={[styles.center, { backgroundColor: palette.background }]}>
        <ActivityIndicator color={palette.accent} size="large" />
        <AppText tone="muted">啟動 AirMe 中…</AppText>
      </View>
    );
  }
  if (!app.account) return <Redirect href={'/account' as Href} />;
  if (!app.local.onboardingCompleted) return <Redirect href={'/onboarding' as Href} />;

  const submit = async (
    activityText: string,
    intent: Parameters<typeof app.createRecommendation>[1]
  ) => {
    if (await app.createRecommendation(activityText, intent)) {
      router.push('/recommendation' as Href);
    }
  };

  const environmentPanel = (
    <View key="environment" style={styles.environmentColumn}>
      <View style={styles.floatingCapsuleBadge}>
        <View style={[styles.pulseDot, { backgroundColor: '#10B981' }]} />
        <AppText variant="body-small" weight="800" style={styles.badgeTextGreen}>
          即時環境數據
        </AppText>
      </View>

      <View style={styles.appleGlassCard}>
        <EnvironmentHero
          environment={app.environment}
          loading={app.environmentLoading}
          demoMode={app.local.demoMode}
          onRefresh={app.refreshEnvironment}
        />
      </View>
    </View>
  );

  const composerPanel = (
    <View key="composer" style={styles.composerColumn}>
      <View style={styles.floatingCapsuleBadge}>
        <View style={[styles.pulseDot, { backgroundColor: '#0EA5E9' }]} />
        <AppText variant="body-small" weight="800" style={styles.badgeTextBlue}>
          AI 智慧對話助理
        </AppText>
      </View>

      <View style={styles.appleGlassCard}>
        <ActivityComposer
          loading={app.busy}
          onUnderstand={app.understandActivity}
          onSubmit={(activityText, intent) => void submit(activityText, intent)}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.mainWrapper}>
      <AppleFloatingBackground />

      <PageShell>
        <Screen>
          <AppHeader demoMode={app.local.demoMode} />

          {/* Hero 區塊 */}
          <View style={styles.heroSection}>
            <View style={styles.heroPill}>
              <AppText variant="body-small" weight="900" style={{ color: '#065F46', letterSpacing: 0.3 }}>
                ✦ 今日空氣行動指南
              </AppText>
            </View>

            <AppText variant="display" weight="900" style={styles.heroTitle}>
              先理解你，{`\n`}再決定今天怎麼動。
            </AppText>

            <AppText style={styles.heroSubtitle}>
              嗨，{app.local.deviceProfile?.displayName ?? '今天的你'}！直接說出你的活動計畫，AirMe 會結合環境數據與健康防線為你量身建議。
            </AppText>

            {/* Taskbar */}
            <View style={styles.tabSection}>
              <SegmentedTabBar
                activeKey={activeTab}
                onChange={setActiveTab}
              />
            </View>
          </View>

          {app.error ? (
            <Card
              accessibilityRole="alert"
              key="error"
              pattern="dots"
              patternColor={palette.destructive}
              style={{
                backgroundColor: palette.destructiveSoft,
                borderColor: palette.ink,
                marginBottom: spacing.lg,
              }}>
              <AppText tone="danger" weight="800">
                目前無法完成
              </AppText>
              <AppText>{app.error}</AppText>
              {!app.local.demoMode ? (
                <AppButton
                  label="切換示範模式"
                  onPress={() => void app.setDemoMode(true)}
                  variant="secondary"
                />
              ) : null}
              <AppButton label="關閉提醒" onPress={app.clearError} variant="ghost" />
            </Card>
          ) : null}

          {/* Dashboard 主卡片內容 */}
          <View
            key="dashboard"
            style={[styles.dashboard, wideDashboard && styles.dashboardWide]}>
            {wideDashboard
              ? [environmentPanel, composerPanel]
              : [composerPanel, environmentPanel]}
          </View>
        </Screen>
      </PageShell>
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#EDF7ED',
  },
  bubbleLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  bubble: {
    position: 'absolute',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
  },
  center: { alignItems: 'center', flex: 1, gap: spacing.md, justifyContent: 'center' },

  heroSection: {
    alignItems: 'center',
    textAlign: 'center',
    alignSelf: 'center',
    gap: spacing.md,
    maxWidth: 720,
    width: '100%',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    zIndex: 2,
  },
  heroPill: {
    borderRadius: 99,
    paddingHorizontal: 18,
    paddingVertical: 7,
    backgroundColor: 'rgba(209, 250, 229, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(167, 243, 208, 0.9)',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  heroTitle: {
    fontSize: 44,
    lineHeight: 54,
    letterSpacing: -0.9,
    color: '#064E3B',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 26,
    color: '#047857',
    textAlign: 'center',
    maxWidth: 580,
    opacity: 0.88,
  },

  tabSection: {
    marginTop: 12,
    alignItems: 'center',
  },

  dashboard: { gap: spacing.xl, zIndex: 2 },
  dashboardWide: { alignItems: 'stretch', flexDirection: 'row' },
  environmentColumn: { flex: 0.85, width: '100%', gap: spacing.sm },
  composerColumn: { flex: 1.15, width: '100%', gap: spacing.sm },
  floatingCapsuleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 4,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  badgeTextGreen: { color: '#047857', fontSize: 13 },
  badgeTextBlue: { color: '#0369A1', fontSize: 13 },
  appleGlassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 32,
    padding: 14,
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.05,
    shadowRadius: 36,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
});