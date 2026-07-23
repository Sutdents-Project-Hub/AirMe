import React, { useCallback, useRef } from 'react';
import {
  Redirect,
  useFocusEffect,
  useRouter,
  type Href,
} from 'expo-router';
import {
  Animated,
  StyleSheet,
  View,
} from 'react-native';

import { AppHeader } from '../components/app-header';
import { HistoryList } from '../components/history-list';
import { PageShell } from '../components/page-shell';
import { SegmentedTabBar } from '../components/ui/SegmentedTabBar';
import { AppButton } from '../components/ui/app-button';
import { AppText } from '../components/ui/app-text';
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

const CARD_RADIUS = 20;

const MAIN_TABS = [
  { key: '/', label: '今日建議' },
  { key: '/routes', label: '路線規劃' },
  { key: '/history', label: 'Air 日誌' },
  { key: '/settings', label: '設定' },
];

// ----------------------------------------------------------------------
// Hero 右側低對比裝飾
// ----------------------------------------------------------------------
function HeroDecor() {
  return (
    <View style={styles.heroDecor} pointerEvents="none">
      <View style={styles.decorCircleLg} />
      <View style={styles.decorCircleSm} />
      <View style={[styles.decorLine, styles.decorLineA]} />
      <View style={styles.decorDot} />
    </View>
  );
}

// ----------------------------------------------------------------------
// 簡易線性圖示：日誌本
// ----------------------------------------------------------------------
function IconJournal({ color }: { color: string }) {
  return (
    <View style={iconStyles.journalWrap}>
      <View
        style={[
          iconStyles.journalBody,
          {
            borderColor: color,
          },
        ]}
      >
        <View
          style={[
            iconStyles.journalLine,
            {
              backgroundColor: color,
            },
          ]}
        />

        <View
          style={[
            iconStyles.journalLine,
            {
              backgroundColor: color,
              width: 14,
            },
          ]}
        />
      </View>

      <View
        style={[
          iconStyles.journalSpine,
          {
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

// ----------------------------------------------------------------------
// 空狀態：圖示 + 說明 + 操作
// ----------------------------------------------------------------------
function EmptyHistoryState({
  onCreate,
}: {
  onCreate: () => void;
}) {
  const palette = usePalette();

  return (
    <View
      style={[
        styles.emptyCard,
        {
          backgroundColor: palette.surface ?? '#FFFFFF',
          borderColor:
            palette.border ?? 'rgba(0,0,0,0.06)',
        },
      ]}
    >
      <View
        style={[
          styles.emptyIconBadge,
          {
            backgroundColor: palette.accentSoft,
          },
        ]}
      >
        <IconJournal color={palette.accent ?? '#059669'} />
      </View>

      <AppText
        variant="title-small"
        weight="800"
        style={styles.emptyTitle}
      >
        還沒有任何紀錄
      </AppText>

      <AppText tone="muted" style={styles.emptyBody}>
        說出你今天的活動計畫，AirMe
        會結合環境數據幫你留下第一筆摘要。
      </AppText>

      <AppButton
        label="建立第一筆紀錄"
        onPress={onCreate}
        variant="primary"
      />
    </View>
  );
}

export default function HistoryScreen() {
  const app = useApp();
  const palette = usePalette();
  const router = useRouter();

  /*
   * 上方 Hero 與下方卡片共用這兩個 Animated.Value，
   * 所以兩者會執行完全相同且同步的進場動畫。
   */
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(12)).current;

  /*
   * 每次頁面獲得焦點時重新播放動畫。
   * 比一般 useEffect 更適合 Expo Router 頁面切換。
   */
  useFocusEffect(
    useCallback(() => {
      fade.setValue(0);
      slide.setValue(12);

      const entranceAnimation = Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.timing(slide, {
          toValue: 0,
          duration: 420,
          useNativeDriver: true,
        }),
      ]);

      entranceAnimation.start();

      return () => {
        entranceAnimation.stop();
      };
    }, [fade, slide])
  );

  if (app.hydrated && !app.account) {
    return <Redirect href={'/account' as Href} />;
  }

  if (
    app.hydrated &&
    !app.local.onboardingCompleted
  ) {
    return <Redirect href={'/onboarding' as Href} />;
  }

  const handleTabChange = (key: string) => {
    if (key !== '/history') {
      router.push(key as Href);
    }
  };

  const hasHistory = app.local.history.length > 0;

  const entranceStyle = {
    opacity: fade,
    transform: [{ translateY: slide }],
  };

  return (
    <PageShell>
      <Screen maxWidth={860}>
        <AppHeader demoMode={app.local.demoMode} />

        {/* 上方 Hero 卡片 */}
        <Animated.View
          style={[
            styles.hero,
            entranceStyle,
          ]}
        >
          <View
            style={[
              styles.heroCard,
              {
                backgroundColor:
                  palette.surface ??
                  'rgba(0,0,0,0.02)',
                borderColor:
                  palette.border ??
                  'rgba(0,0,0,0.06)',
              },
            ]}
          >
            <HeroDecor />

            <View style={styles.heroContent}>
              <View
                style={[
                  styles.eyebrow,
                  {
                    backgroundColor:
                      palette.accentSoft,
                  },
                ]}
              >
                <View
                  style={[
                    styles.eyebrowDot,
                    {
                      backgroundColor:
                        palette.accent,
                    },
                  ]}
                />

                <AppText
                  variant="body-small"
                  weight="900"
                  tone="accent"
                >
                  我的 Air 日誌
                </AppText>
              </View>

              <AppText
                variant="display"
                weight="900"
                style={styles.title}
              >
                活動、環境與感受，{`\n`}
                留成自己的脈絡。
              </AppText>

              <AppText
                tone="muted"
                style={styles.subtitle}
              >
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
          </View>
        </Animated.View>

        <View
          style={[
            styles.divider,
            {
              backgroundColor:
                palette.border ??
                'rgba(0,0,0,0.06)',
            },
          ]}
        />

        {/*
         * 下方所有內容都包在 Animated.View 裡，
         * 並直接使用與 Hero 相同的 entranceStyle。
         */}
        <Animated.View
          style={[
            styles.bottomAnimation,
            entranceStyle,
          ]}
        >
          {hasHistory ? (
            <View
              style={[
                styles.listCard,
                {
                  backgroundColor:
                    palette.surface ?? '#FFFFFF',
                  borderColor:
                    palette.border ??
                    'rgba(0,0,0,0.06)',
                },
              ]}
            >
              <HistoryList
                items={app.local.history}
                feedback={app.local.feedback}
              />
            </View>
          ) : (
            <EmptyHistoryState
              onCreate={() =>
                router.push('/' as Href)
              }
            />
          )}
        </Animated.View>
      </Screen>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    maxWidth: 680,
  },

  heroCard: {
    borderRadius: CARD_RADIUS + 4,
    borderWidth: 1.5,
    padding: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',

    shadowColor: '#064E3B',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.07,
    shadowRadius: 24,

    elevation: 5,
  },

  heroContent: {
    gap: spacing.md,
    zIndex: 1,
  },

  // --------------------------------------------------------------------
  // 右側低對比裝飾
  // --------------------------------------------------------------------

  heroDecor: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 200,
    zIndex: 0,
  },

  decorCircleLg: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1.5,
    borderColor: 'rgba(6,78,59,0.08)',
    top: -40,
    right: -40,
  },

  decorCircleSm: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16,185,129,0.08)',
    bottom: 20,
    right: 30,
  },

  decorLine: {
    position: 'absolute',
    height: 1,
    width: 120,
    backgroundColor: 'rgba(6,78,59,0.10)',
  },

  decorLineA: {
    top: 70,
    right: -10,
    transform: [{ rotate: '-20deg' }],
  },

  decorDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(6,78,59,0.22)',
    top: 62,
    right: 34,
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
  },

  subtitle: {
    maxWidth: 620,
  },

  tabSection: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.md,
  },

  /*
   * 只控制動畫容器版面，不加入背景或 padding，
   * 因此不會多產生一層卡片。
   */
  bottomAnimation: {
    width: '100%',
  },

  // --------------------------------------------------------------------
  // 有資料時的列表卡片
  // --------------------------------------------------------------------

  listCard: {
    borderRadius: CARD_RADIUS,
    borderWidth: 1.5,
    padding: spacing.md,

    shadowColor: '#064E3B',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.06,
    shadowRadius: 20,

    elevation: 4,
  },

  // --------------------------------------------------------------------
  // 空狀態卡片
  // --------------------------------------------------------------------

  emptyCard: {
    borderRadius: CARD_RADIUS,
    borderWidth: 1.5,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,

    shadowColor: '#064E3B',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.06,
    shadowRadius: 20,

    elevation: 4,
  },

  emptyIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },

  emptyTitle: {
    textAlign: 'center',
  },

  emptyBody: {
    textAlign: 'center',
    maxWidth: 380,
    marginBottom: spacing.xs,
  },
});

// 圖示樣式
const iconStyles = StyleSheet.create({
  journalWrap: {
    width: 22,
    height: 22,
    flexDirection: 'row',
    alignItems: 'center',
  },

  journalSpine: {
    width: 2.5,
    height: 20,
    borderRadius: 1.5,
    marginRight: 1,
  },

  journalBody: {
    flex: 1,
    height: 18,
    borderWidth: 1.5,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    justifyContent: 'center',
    gap: 3,
    paddingLeft: 4,
  },

  journalLine: {
    width: 10,
    height: 1.5,
    borderRadius: 1,
  },
});