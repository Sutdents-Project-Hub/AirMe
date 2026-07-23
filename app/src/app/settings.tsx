import React, { useEffect, useRef, useState } from 'react';
import { Redirect, useRouter, type Href } from 'expo-router';
import {
  Animated,
  Easing,
  StyleSheet,
  Switch,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppHeader } from '../components/app-header';
import { PageShell } from '../components/page-shell';
import { SegmentedTabBar } from '../components/ui/SegmentedTabBar';
import { AppButton } from '../components/ui/app-button';
import { AppText } from '../components/ui/app-text';
import { Card } from '../components/ui/card';
import { Screen } from '../components/ui/screen';
import { usePalette } from '../design/tokens';
import { useApp } from '../state/app-provider';

// 本地保底的 spacing / radii 定義，避免 design/tokens 缺 key 導致整頁崩潰
const spacing = {
  xs: 4,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
};

const radii = {
  pill: 999,
};

const MAIN_TABS = [
  { key: '/', label: '今日建議' },
  { key: '/routes', label: '路線規劃' },
  { key: '/history', label: 'Air 日誌' },
  { key: '/settings', label: '設定' },
];

// ----------------------------------------------------------------------
// 簡易線性圖示（不依賴外部圖示庫，統一 22px、細線風格）
// ----------------------------------------------------------------------
function IconToggle({ color }: { color: string }) {
  return (
    <View style={[iconStyles.toggleTrack, { borderColor: color }]}>
      <View style={[iconStyles.toggleDot, { backgroundColor: color }]} />
    </View>
  );
}

function IconProfile({ color }: { color: string }) {
  return (
    <View style={iconStyles.wrap}>
      <View style={[iconStyles.profileHead, { borderColor: color }]} />
      <View style={[iconStyles.profileBody, { borderColor: color }]} />
    </View>
  );
}

function IconShield({ color }: { color: string }) {
  return (
    <View style={iconStyles.wrap}>
      <View style={[iconStyles.shield, { borderColor: color }]} />
    </View>
  );
}

function IconTrash({ color }: { color: string }) {
  return (
    <View style={iconStyles.wrap}>
      <View style={[iconStyles.trashLid, { backgroundColor: color }]} />
      <View style={[iconStyles.trashHandle, { borderColor: color }]} />
      <View style={[iconStyles.trashBody, { borderColor: color }]}>
        <View style={[iconStyles.trashStripe, { backgroundColor: color }]} />
        <View style={[iconStyles.trashStripe, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

function CardHeading({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <View style={styles.cardHeading}>
      {icon}
      <AppText variant="title-small" weight="800">
        {title}
      </AppText>
    </View>
  );
}

function StatBadge({
  value,
  label,
  tone,
}: {
  value: number | string;
  label: string;
  tone: string;
}) {
  return (
    <View style={styles.statBadge}>
      <View style={[styles.statBadgeNumber, { backgroundColor: tone }]}>
        <AppText weight="900" style={styles.statBadgeNumberText}>
          {value}
        </AppText>
      </View>
      <AppText variant="body-small" tone="muted">
        {label}
      </AppText>
    </View>
  );
}

// ----------------------------------------------------------------------
// 背景漂浮氣泡（低調版）
// ----------------------------------------------------------------------
interface BubbleConfig {
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
}

const BUBBLE_CONFIGS: BubbleConfig[] = [
  { id: 1, size: 200, color: '#A7F3D0', top: '-4%', left: '-8%', opacity: 0.2, duration: 9000, delay: 0, offsetY: -30, offsetX: 18 },
  { id: 2, size: 240, color: '#D1FAE5', top: '30%', left: '78%', opacity: 0.22, duration: 10500, delay: 400, offsetY: -40, offsetX: -20 },
  { id: 3, size: 180, color: '#6EE7B7', top: '72%', left: '-10%', opacity: 0.18, duration: 9500, delay: 200, offsetY: -34, offsetX: 22 },
  { id: 4, size: 46, color: '#10B981', top: '14%', left: '20%', opacity: 0.3, duration: 4600, delay: 700, offsetY: -22, offsetX: -10 },
  { id: 5, size: 60, color: '#34D399', top: '58%', left: '88%', opacity: 0.26, duration: 5200, delay: 900, offsetY: -28, offsetX: 14 },
];

function BackgroundBubble({ item }: { item: BubbleConfig }) {
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

  const translateY = animValue.interpolate({ inputRange: [0, 1], outputRange: [0, item.offsetY] });
  const translateX = animValue.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, item.offsetX, 0] });
  const scale = animValue.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.05, 0.97] });

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

function FloatingBackground() {
  return (
    <View style={styles.bubbleLayer} pointerEvents="none">
      {BUBBLE_CONFIGS.map((bubble) => (
        <BackgroundBubble key={bubble.id} item={bubble} />
      ))}
    </View>
  );
}

// ----------------------------------------------------------------------
// 主視覺右側抽象路線裝飾（半透明圓形＋細線＋路徑點）
// ----------------------------------------------------------------------
function HeroRouteDecor() {
  return (
    <View style={styles.heroDecor} pointerEvents="none">
      <View style={styles.decorCircleLg} />
      <View style={styles.decorCircleMd} />
      <View style={styles.decorCircleSm} />
      <View style={[styles.decorLine, styles.decorLineA]} />
      <View style={[styles.decorLine, styles.decorLineB]} />
      <View style={styles.decorDot1} />
      <View style={styles.decorDot2} />
      <View style={styles.decorDot3} />
    </View>
  );
}

// ----------------------------------------------------------------------
// 卡片進場動畫包裝
// ----------------------------------------------------------------------
function AnimatedCardWrapper({
  children,
  delay,
  style,
}: {
  children: React.ReactNode;
  delay: number;
  style: any;
}) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 380,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 380,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, slide, delay]);

  return (
    <Animated.View
      style={[style, { opacity: fade, transform: [{ translateY: slide }] }]}
    >
      {children}
    </Animated.View>
  );
}

export default function SettingsScreen() {
  const app = useApp();
  const palette = usePalette();
  const router = useRouter();
  const [confirmClear, setConfirmClear] = useState(false);
  const { width } = useWindowDimensions();
  const wide = width >= 760;

  const heroFade = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroFade, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.timing(heroSlide, {
        toValue: 0,
        duration: 420,
        useNativeDriver: true,
      }),
    ]).start();
  }, [heroFade, heroSlide]);

  if (app.hydrated && !app.account) {
    return <Redirect href={'/account' as Href} />;
  }
  if (app.hydrated && !app.local.onboardingCompleted) {
    return <Redirect href={'/onboarding' as Href} />;
  }

  const handleTabChange = (key: string) => {
    if (key !== '/settings') {
      router.push(key as Href);
    }
  };

  const sensitiveCount = app.local.profile?.sensitiveConditions.length ?? 0;
  const historyCount = app.local.history.length;
  const dangerColor = palette.coral ?? '#F87171';
  const cardStyle = wide ? styles.columnCard : styles.cardNarrow;

  const demoCard = (
    <AnimatedCardWrapper delay={0} style={cardStyle}>
      <Card pattern="dots" patternColor={palette.yellow} style={styles.cardFill}>
        <CardHeading
          icon={<IconToggle color={palette.accent ?? '#059669'} />}
          title="決賽示範模式"
        />
        <View style={styles.settingRow}>
          <View style={styles.settingCopy}>
            <AppText variant="body-small" tone="muted">
              使用固定、可重播資料，不需要網路或 API 金鑰。畫面會一直清楚標示 DEMO。
            </AppText>
          </View>
          <View style={styles.switchColumn}>
            <Switch
              accessibilityLabel="決賽示範模式"
              value={app.local.demoMode}
              onValueChange={app.setDemoMode}
              trackColor={{ false: palette.border, true: palette.air }}
            />
            <AppText
              variant="body-small"
              weight="700"
              style={{ color: app.local.demoMode ? (palette.air ?? '#059669') : (palette.muted ?? '#9CA3AF') }}
            >
              {app.local.demoMode ? '已開啟' : '已關閉'}
            </AppText>
          </View>
        </View>
      </Card>
    </AnimatedCardWrapper>
  );

  const profileCard = (
    <AnimatedCardWrapper delay={80} style={cardStyle}>
      <Card pattern="grid" patternColor={palette.teal} style={styles.cardFill}>
        <CardHeading
          icon={<IconProfile color={palette.teal ?? '#0D9488'} />}
          title="此裝置個人檔案"
        />
        <AppText weight="700">
          {app.local.deviceProfile?.displayName ?? '尚未設定暱稱'}
        </AppText>
        <AppText tone="muted">
          常用地點：{app.local.savedLocation?.name ?? '尚未設定'}
        </AppText>
        <View style={styles.statsRow}>
          <StatBadge value={sensitiveCount} label="敏感條件" tone={palette.yellow ?? '#FBBF24'} />
          <StatBadge value={historyCount} label="紀錄" tone={palette.teal ?? '#2DD4BF'} />
        </View>
        <AppButton
          label="編輯個人檔案"
          onPress={() => router.push('/onboarding' as Href)}
          variant="secondary"
        />
      </Card>
    </AnimatedCardWrapper>
  );

  const accountCard = (
    <AnimatedCardWrapper delay={160} style={cardStyle}>
      <Card
        pattern="stripes"
        patternColor={palette.surface}
        style={[
          styles.cardFill,
          { backgroundColor: palette.teal, borderColor: palette.ink },
        ]}>
        <CardHeading
          icon={<IconShield color={palette.ink ?? '#064E3B'} />}
          title="帳號與隱私"
        />
        <AppText>
          {`• 已登入：${app.account?.email ?? '帳號狀態載入中'}`}
        </AppText>
        <AppText>• 個人檔案、日誌與回饋仍只在這台裝置，不會因登入自動同步。</AppText>
        <AppText>• Live 模式只把當次推論必要內容送往 AirMe 後端。</AppText>
        <AppText>• AirMe 不做醫療診斷、不判定症狀原因，也不取代緊急協助。</AppText>
        <AppButton
          label="查看帳號"
          onPress={() => router.push('/account' as Href)}
          variant="secondary"
        />
      </Card>
    </AnimatedCardWrapper>
  );

  const clearCard = (
    <AnimatedCardWrapper delay={240} style={cardStyle}>
      <Card
        pattern="dots"
        patternColor={dangerColor}
        style={[
          styles.cardFill,
          styles.cardDanger,
          { borderColor: dangerColor, backgroundColor: 'rgba(248,113,113,0.06)' },
        ]}>
        <CardHeading
          icon={<IconTrash color={dangerColor} />}
          title="清除裝置端資料"
        />
        <AppText tone="muted">這會刪除個人偏好、活動摘要與回饋，無法復原。</AppText>
        {confirmClear ? (
          <View style={styles.confirm}>
            <AppButton
              label="確認清除全部資料"
              variant="danger"
              onPress={async () => {
                await app.clearAll();
                router.replace('/onboarding' as Href);
              }}
            />
            <AppButton label="取消" variant="ghost" onPress={() => setConfirmClear(false)} />
          </View>
        ) : (
          <AppButton
            label="清除全部資料"
            variant="danger"
            onPress={() => setConfirmClear(true)}
          />
        )}
      </Card>
    </AnimatedCardWrapper>
  );

  return (
    <View style={styles.pageWrapper}>
      <FloatingBackground />

      <PageShell>
        <Screen maxWidth={1000}>
          <AppHeader demoMode={app.local.demoMode} />

          <Animated.View
            style={[
              styles.hero,
              { opacity: heroFade, transform: [{ translateY: heroSlide }] },
            ]}
          >
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: palette.surface ?? 'rgba(255,255,255,0.7)',
                  borderColor: palette.border ?? 'rgba(0,0,0,0.06)',
                },
              ]}
            >
              {wide ? <HeroRouteDecor /> : null}

              <View style={[styles.heroInner, wide && styles.heroInnerWide]}>
                <View style={styles.heroLeft}>
                  <View style={[styles.eyebrow, { backgroundColor: palette.accentSoft }]}>
                    <View style={[styles.eyebrowDot, { backgroundColor: palette.accent }]} />
                    <AppText variant="body-small" weight="900" tone="accent">
                      我的 AirMe
                    </AppText>
                  </View>

                  <AppText variant="title-large" weight="900" style={styles.title}>
                    這是你的裝置檔案，{`\n`}資料去留由你決定。
                  </AppText>

                  <AppText tone="muted" style={styles.heroSubtitle}>
                    查看與管理你在這台裝置上的資料、隱私與示範設定。
                  </AppText>

                  <View style={styles.tabSection}>
                    <SegmentedTabBar
                      activeKey="/settings"
                      onChange={handleTabChange}
                      tabs={MAIN_TABS}
                    />
                  </View>
                </View>

                {wide ? (
                  <View style={styles.heroRight}>
                    <AppText variant="body-small" weight="800" tone="muted" style={styles.heroRightLabel}>
                      裝置摘要
                    </AppText>
                    <AppText weight="800">
                      {app.local.deviceProfile?.displayName ?? '尚未設定暱稱'}
                    </AppText>
                    <AppText variant="body-small" tone="muted">
                      常用地點：{app.local.savedLocation?.name ?? '尚未設定'}
                    </AppText>
                    <View style={styles.heroStatsRow}>
                      <StatBadge value={sensitiveCount} label="敏感條件" tone={palette.yellow ?? '#FBBF24'} />
                      <StatBadge value={historyCount} label="紀錄筆數" tone={palette.teal ?? '#2DD4BF'} />
                    </View>
                  </View>
                ) : null}
              </View>
            </View>
          </Animated.View>

          {wide ? (
            <View style={styles.columns}>
              <View style={styles.column}>
                {demoCard}
                {accountCard}
              </View>
              <View style={styles.column}>
                {profileCard}
                {clearCard}
              </View>
            </View>
          ) : (
            <View style={styles.grid}>
              {demoCard}
              {profileCard}
              {accountCard}
              {clearCard}
            </View>
          )}
        </Screen>
      </PageShell>
    </View>
  );
}

const CARD_RADIUS = 20;

const styles = StyleSheet.create({
  pageWrapper: {
    flex: 1,
    position: 'relative',
  },
  bubbleLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  bubble: {
    position: 'absolute',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
  },

  // Hero
  hero: { marginBottom: spacing.lg, zIndex: 2 },
  heroCard: {
    borderRadius: CARD_RADIUS + 4,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  heroInner: {
    gap: spacing.md,
  },
  heroInnerWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.xl,
  },
  heroLeft: {
    gap: spacing.sm,
    flex: 1,
    maxWidth: 560,
  },
  heroRight: {
    width: 220,
    gap: spacing.xs,
    paddingTop: spacing.xs,
    zIndex: 1,
  },
  heroRightLabel: {
    marginBottom: 2,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  eyebrow: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  title: {
    marginTop: spacing.xs,
    fontSize: 30,
    lineHeight: 38,
  },
  heroSubtitle: {
    maxWidth: 460,
  },
  tabSection: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },

  // 主視覺右側抽象路線裝飾
  heroDecor: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 260,
    zIndex: 0,
  },
  decorCircleLg: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1.5,
    borderColor: 'rgba(6,78,59,0.10)',
    top: -50,
    right: -40,
  },
  decorCircleMd: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1.5,
    borderColor: 'rgba(6,78,59,0.08)',
    bottom: -20,
    right: 60,
  },
  decorCircleSm: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(16,185,129,0.10)',
    top: 60,
    right: 10,
  },
  decorLine: {
    position: 'absolute',
    height: 1,
    width: 160,
    backgroundColor: 'rgba(6,78,59,0.12)',
  },
  decorLineA: {
    top: 90,
    right: -20,
    transform: [{ rotate: '-24deg' }],
  },
  decorLineB: {
    top: 150,
    right: 20,
    width: 100,
    transform: [{ rotate: '18deg' }],
  },
  decorDot1: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(6,78,59,0.35)',
    top: 84,
    right: 40,
  },
  decorDot2: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(6,78,59,0.28)',
    top: 145,
    right: 96,
  },
  decorDot3: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(6,78,59,0.22)',
    top: 172,
    right: 24,
  },

  // 寬螢幕：左右兩個獨立直向欄位，各自往上疊緊，避免高度不一造成錯位
  columns: {
    flexDirection: 'row',
    gap: spacing.xl,
    zIndex: 2,
    alignItems: 'flex-start',
  },
  column: {
    flex: 1,
    gap: spacing.xl,
  },
  columnCard: {
    width: '100%',
  },

  // 窄螢幕：單欄直向堆疊
  grid: { gap: spacing.xl, zIndex: 2 },
  cardNarrow: { width: '100%' },

  cardFill: {
    width: '100%',
    borderRadius: CARD_RADIUS,
    borderWidth: 1.5,
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
    gap: spacing.sm,
  },
  cardDanger: {
    borderStyle: 'solid',
  },
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  settingRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.lg },
  settingCopy: { flex: 1, gap: spacing.xs },
  switchColumn: { alignItems: 'center', gap: 4 },
  confirm: { gap: spacing.sm },

  // Stat badges
  statsRow: { flexDirection: 'row', gap: spacing.md, marginVertical: spacing.xs },
  statBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statBadgeNumber: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBadgeNumberText: {
    fontSize: 12,
    color: '#064E3B',
  },
});

// 圖示樣式（統一 22px 線性風格）
const iconStyles = StyleSheet.create({
  wrap: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTrack: {
    width: 22,
    height: 13,
    borderRadius: 7,
    borderWidth: 1.5,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  profileHead: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.5,
    marginBottom: 1,
  },
  profileBody: {
    width: 16,
    height: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1.5,
    borderBottomWidth: 0,
  },
  shield: {
    width: 15,
    height: 18,
    borderWidth: 1.5,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  trashLid: {
    width: 18,
    height: 2,
    borderRadius: 1,
    marginBottom: 1,
  },
  trashHandle: {
    position: 'absolute',
    top: -3,
    width: 8,
    height: 4,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    borderWidth: 1.5,
    borderBottomWidth: 0,
  },
  trashBody: {
    width: 14,
    height: 13,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 2,
  },
  trashStripe: {
    width: 1.4,
    height: 8,
    borderRadius: 1,
  },
});