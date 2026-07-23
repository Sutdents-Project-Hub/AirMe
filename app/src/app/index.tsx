import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import {
  ActivityIndicator,
  Animated,
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
import { usePalette } from '../design/tokens';
import { useApp } from '../state/app-provider';

const spacing = {
  xs: 4,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
};

const CARD_RADIUS = 24;

// ----------------------------------------------------------------------
// 完全彈性碰撞背景圓球
//
// 圖層順序：
// 1. mainWrapper 綠色背景
// 2. ElasticBubbleBackground 動態圓球
// 3. contentLayer：導覽列、文字與灰色卡片
//
// 物理設定：
// - 圓球質量與面積成比例：mass = radius²
// - 圓球恢復係數為 1
// - 邊界恢復係數為 1
// - 沒有阻力、摩擦或速度衰減
// - 使用多個 substeps 降低高速穿透
// - 使用位置修正避免圓球互相卡住
// ----------------------------------------------------------------------

interface ElasticBubble {
  id: number;
  radius: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  color: string;
  opacity: number;
  position: Animated.ValueXY;
}

interface ElasticBubbleBackgroundProps {
  width: number;
  height: number;
}

const BUBBLE_COLORS = [
  '#D1FAE5',
  '#A7F3D0',
  '#86EFAC',
  '#6EE7B7',
  '#4ADE80',
  '#34D399',
  '#10B981',
  '#059669',
  '#047857',
  '#BBF7D0',
];

const BUBBLE_OPACITIES = [
  0.32,
  0.27,
  0.24,
  0.3,
  0.22,
  0.25,
  0.19,
  0.16,
  0.13,
  0.28,
];

// 直徑會再依畫面大小縮放。
const BUBBLE_BASE_DIAMETERS = [
  210,
  150,
  112,
  78,
  54,
  174,
  96,
  132,
  66,
  188,
];

const BUBBLE_ELASTICITY = 1;
const WALL_ELASTICITY = 1;
const PHYSICS_SUBSTEPS = 4;
const COLLISION_PASSES = 2;
const COLLISION_EPSILON = 0.0001;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

/**
 * 可重現的亂數產生器。
 *
 * 避免 React 重新渲染時，氣泡位置毫無預期地改變。
 */
function createSeededRandom(seed: number) {
  let value = seed >>> 0;

  return () => {
    value += 0x6d2b79f5;

    let result = value;

    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);

    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function createElasticBubbles(
  viewportWidth: number,
  viewportHeight: number
): ElasticBubble[] {
  const width = Math.max(viewportWidth, 1);
  const height = Math.max(viewportHeight, 1);
  const shortestSide = Math.min(width, height);

  const dimensionScale = clamp(width / 1180, 0.62, 1.12);
  const maximumDiameter = Math.max(32, shortestSide * 0.24);

  const seed =
    ((Math.round(width) * 73856093) ^
      (Math.round(height) * 19349663)) >>>
    0;

  const random = createSeededRandom(seed || 1);
  const bubbles: ElasticBubble[] = [];

  BUBBLE_BASE_DIAMETERS.forEach((baseDiameter, index) => {
    const diameter = clamp(
      baseDiameter * dimensionScale,
      32,
      maximumDiameter
    );

    const radius = diameter / 2;

    let x = width / 2;
    let y = height / 2;
    let foundNonOverlappingPosition = false;

    // 優先尋找不與其他圓球重疊的初始位置。
    for (let attempt = 0; attempt < 180; attempt += 1) {
      const availableWidth = Math.max(width - radius * 2, 0);
      const availableHeight = Math.max(height - radius * 2, 0);

      const candidateX = radius + random() * availableWidth;
      const candidateY = radius + random() * availableHeight;

      const hasOverlap = bubbles.some((bubble) => {
        const dx = candidateX - bubble.x;
        const dy = candidateY - bubble.y;
        const requiredDistance = radius + bubble.radius + 10;

        return dx * dx + dy * dy < requiredDistance * requiredDistance;
      });

      if (!hasOverlap) {
        x = candidateX;
        y = candidateY;
        foundNonOverlappingPosition = true;
        break;
      }
    }

    // 小螢幕若放不下全部圓球，允許初始輕微重疊。
    // 後續位置修正會把它們分開。
    if (!foundNonOverlappingPosition) {
      const availableWidth = Math.max(width - radius * 2, 0);
      const availableHeight = Math.max(height - radius * 2, 0);

      x = radius + random() * availableWidth;
      y = radius + random() * availableHeight;
    }

    const direction = random() * Math.PI * 2;

    // 使用溫和速度，避免背景太搶眼。
    const responsiveSpeedScale = width < 600 ? 0.78 : 1;
    const speed = (18 + random() * 31) * responsiveSpeedScale;

    const vx = Math.cos(direction) * speed;
    const vy = Math.sin(direction) * speed;

    bubbles.push({
      id: index + 1,
      radius,
      x,
      y,
      vx,
      vy,

      // 圓形面積為 πr²；碰撞公式中的共同 π 可以省略。
      mass: radius * radius,

      color: BUBBLE_COLORS[index % BUBBLE_COLORS.length],
      opacity: BUBBLE_OPACITIES[index % BUBBLE_OPACITIES.length],

      // Animated.View 使用左上角座標，所以需要扣除 radius。
      position: new Animated.ValueXY({
        x: x - radius,
        y: y - radius,
      }),
    });
  });

  return bubbles;
}

function keepBubbleInsideBounds(
  bubble: ElasticBubble,
  width: number,
  height: number
) {
  const minimumX = bubble.radius;
  const maximumX = Math.max(bubble.radius, width - bubble.radius);
  const minimumY = bubble.radius;
  const maximumY = Math.max(bubble.radius, height - bubble.radius);

  if (bubble.x < minimumX) {
    bubble.x = minimumX;

    if (bubble.vx < 0) {
      bubble.vx = -bubble.vx * WALL_ELASTICITY;
    }
  } else if (bubble.x > maximumX) {
    bubble.x = maximumX;

    if (bubble.vx > 0) {
      bubble.vx = -bubble.vx * WALL_ELASTICITY;
    }
  }

  if (bubble.y < minimumY) {
    bubble.y = minimumY;

    if (bubble.vy < 0) {
      bubble.vy = -bubble.vy * WALL_ELASTICITY;
    }
  } else if (bubble.y > maximumY) {
    bubble.y = maximumY;

    if (bubble.vy > 0) {
      bubble.vy = -bubble.vy * WALL_ELASTICITY;
    }
  }
}

function resolveElasticCollision(
  first: ElasticBubble,
  second: ElasticBubble
) {
  let dx = second.x - first.x;
  let dy = second.y - first.y;

  const combinedRadius = first.radius + second.radius;
  let distanceSquared = dx * dx + dy * dy;

  if (distanceSquared >= combinedRadius * combinedRadius) {
    return;
  }

  let distance: number;
  let normalX: number;
  let normalY: number;

  if (distanceSquared <= COLLISION_EPSILON) {
    // 若兩個圓心剛好完全重疊，建立一個穩定且可重現的法線。
    const angle =
      (((first.id * 73 + second.id * 137) % 360) * Math.PI) / 180;

    normalX = Math.cos(angle);
    normalY = Math.sin(angle);
    distance = 0;

    dx = normalX;
    dy = normalY;
    distanceSquared = 1;
  } else {
    distance = Math.sqrt(distanceSquared);
    normalX = dx / distance;
    normalY = dy / distance;
  }

  const inverseMassFirst = 1 / first.mass;
  const inverseMassSecond = 1 / second.mass;
  const inverseMassTotal = inverseMassFirst + inverseMassSecond;

  // second 相對於 first 的速度。
  const relativeVelocityX = second.vx - first.vx;
  const relativeVelocityY = second.vy - first.vy;

  const velocityAlongNormal =
    relativeVelocityX * normalX + relativeVelocityY * normalY;

  // 只有彼此接近時才施加碰撞脈衝。
  // 已經分離的圓球只需要位置修正，避免反覆加速。
  if (velocityAlongNormal < 0) {
    const impulseMagnitude =
      (-(1 + BUBBLE_ELASTICITY) * velocityAlongNormal) /
      inverseMassTotal;

    const impulseX = impulseMagnitude * normalX;
    const impulseY = impulseMagnitude * normalY;

    first.vx -= impulseX * inverseMassFirst;
    first.vy -= impulseY * inverseMassFirst;

    second.vx += impulseX * inverseMassSecond;
    second.vy += impulseY * inverseMassSecond;
  }

  // 修正穿透，避免圓球黏住或不停震動。
  const penetration = combinedRadius - distance;
  const correctionSlop = 0.01;
  const correctionPercentage = 0.88;

  const correctionMagnitude =
    (Math.max(penetration - correctionSlop, 0) /
      inverseMassTotal) *
    correctionPercentage;

  const correctionX = correctionMagnitude * normalX;
  const correctionY = correctionMagnitude * normalY;

  first.x -= correctionX * inverseMassFirst;
  first.y -= correctionY * inverseMassFirst;

  second.x += correctionX * inverseMassSecond;
  second.y += correctionY * inverseMassSecond;
}

function ElasticBubbleBackground({
  width,
  height,
}: ElasticBubbleBackgroundProps) {
  const bubbles = useMemo(
    () => createElasticBubbles(width, height),
    [width, height]
  );

  useEffect(() => {
    let animationFrame: number | undefined;
    let previousTimestamp: number | null = null;
    let running = true;

    const animate = (timestamp: number) => {
      if (!running) {
        return;
      }

      if (previousTimestamp === null) {
        previousTimestamp = timestamp;
        animationFrame = requestAnimationFrame(animate);
        return;
      }

      // 防止分頁切回、裝置喚醒或卡頓後產生過大的時間步長。
      const frameDeltaSeconds = clamp(
        (timestamp - previousTimestamp) / 1000,
        0,
        1 / 30
      );

      previousTimestamp = timestamp;

      const stepDeltaSeconds =
        frameDeltaSeconds / PHYSICS_SUBSTEPS;

      for (
        let substep = 0;
        substep < PHYSICS_SUBSTEPS;
        substep += 1
      ) {
        // 先積分位置。
        bubbles.forEach((bubble) => {
          bubble.x += bubble.vx * stepDeltaSeconds;
          bubble.y += bubble.vy * stepDeltaSeconds;

          keepBubbleInsideBounds(bubble, width, height);
        });

        // 多跑一次碰撞處理，有助於同時三顆以上接觸的情況。
        for (
          let collisionPass = 0;
          collisionPass < COLLISION_PASSES;
          collisionPass += 1
        ) {
          for (
            let firstIndex = 0;
            firstIndex < bubbles.length;
            firstIndex += 1
          ) {
            for (
              let secondIndex = firstIndex + 1;
              secondIndex < bubbles.length;
              secondIndex += 1
            ) {
              resolveElasticCollision(
                bubbles[firstIndex],
                bubbles[secondIndex]
              );
            }
          }

          // 碰撞位置修正後，再次確認圓球仍在畫面內。
          bubbles.forEach((bubble) => {
            keepBubbleInsideBounds(bubble, width, height);
          });
        }
      }

      // 將物理引擎的圓心座標轉成 Animated.View 左上角座標。
      bubbles.forEach((bubble) => {
        bubble.position.setValue({
          x: bubble.x - bubble.radius,
          y: bubble.y - bubble.radius,
        });
      });

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      running = false;

      if (animationFrame !== undefined) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [bubbles, height, width]);

  return (
    <View style={styles.bubbleLayer} pointerEvents="none">
      {bubbles.map((bubble) => (
        <Animated.View
          key={bubble.id}
          renderToHardwareTextureAndroid
          style={[
            styles.bubble,
            {
              width: bubble.radius * 2,
              height: bubble.radius * 2,
              borderRadius: bubble.radius,
              backgroundColor: bubble.color,
              opacity: bubble.opacity,
              transform: bubble.position.getTranslateTransform(),
            },
          ]}
        />
      ))}
    </View>
  );
}

// ----------------------------------------------------------------------
// Hero 卡片右側細線裝飾
// ----------------------------------------------------------------------

function HeroDecor() {
  return (
    <View style={styles.heroDecor} pointerEvents="none">
      <View style={styles.decorCircleLg} />
      <View style={styles.decorCircleMd} />
      <View style={styles.decorCircleSm} />

      <View style={[styles.decorLine, styles.decorLineA]} />
      <View style={[styles.decorLine, styles.decorLineB]} />

      <View style={styles.decorDot1} />
      <View style={styles.decorDot2} />
    </View>
  );
}

// ----------------------------------------------------------------------
// 面板進場動畫包裝
// ----------------------------------------------------------------------

function AnimatedPanel({
  children,
  delay,
  style,
}: {
  children: React.ReactNode;
  delay: number;
  style?: any;
}) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    const animation = Animated.parallel([
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
    ]);

    animation.start();

    return () => {
      animation.stop();
    };
  }, [delay, fade, slide]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fade,
          transform: [{ translateY: slide }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

// ----------------------------------------------------------------------
// 主畫面
// ----------------------------------------------------------------------

export default function HomeScreen() {
  const app = useApp();
  const palette = usePalette();
  const router = useRouter();

  const { width, height } = useWindowDimensions();
  const wideDashboard = width >= 880;

  const [activeTab, setActiveTab] = useState('today');

  const heroFade = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    const animation = Animated.parallel([
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
    ]);

    animation.start();

    return () => {
      animation.stop();
    };
  }, [heroFade, heroSlide]);

  if (!app.hydrated) {
    return (
      <View
        style={[
          styles.center,
          {
            backgroundColor: palette.background,
          },
        ]}
      >
        <ActivityIndicator color={palette.accent} size="large" />

        <AppText tone="muted">啟動 AirMe 中…</AppText>
      </View>
    );
  }

  const submit = async (
    activityText: string,
    intent: Parameters<typeof app.createRecommendation>[1]
  ) => {
    const created = await app.createRecommendation(
      activityText,
      intent
    );

    if (created) {
      router.push('/recommendation' as Href);
    }
  };

  const heroCardStyle = {
    backgroundColor: palette.surface ?? '#E3E7E3',
    borderColor: palette.border ?? 'rgba(0, 0, 0, 0.08)',
  };

  /*
   * 這裡不再替 EnvironmentHero 與 ActivityComposer
   * 額外套上另一層灰色 Card。
   *
   * 從畫面可看出這兩個子元件本身已經各自繪製 Card；
   * 原先 singleLayerCard 加在 AnimatedPanel 上，才會形成
   * 「灰色外框裡又有一張灰色卡片」的雙層效果。
   */

  const environmentPanel = (
    <AnimatedPanel
      key="environment"
      delay={0}
      style={styles.environmentColumn}
    >
      <EnvironmentHero
        environment={app.environment}
        loading={app.environmentLoading}
        demoMode={app.local.demoMode}
        onRefresh={app.refreshEnvironment}
      />
    </AnimatedPanel>
  );

  const composerPanel = (
    <AnimatedPanel
      key="composer"
      delay={90}
      style={styles.composerColumn}
    >
      <ActivityComposer
        loading={app.busy}
        onUnderstand={app.understandActivity}
        onSubmit={(activityText, intent) => {
          void submit(activityText, intent);
        }}
      />
    </AnimatedPanel>
  );

  return (
    <View style={styles.mainWrapper}>
      {/*
       * 動態圓球位於：
       * - 綠色 mainWrapper 背景之上
       * - contentLayer 與所有卡片之下
       */}
      <ElasticBubbleBackground width={width} height={height} />

      <View style={styles.contentLayer}>
        <PageShell>
          <Screen>
            <AppHeader demoMode={app.local.demoMode} />

            <Animated.View
              style={[
                styles.heroWrap,
                {
                  opacity: heroFade,
                  transform: [{ translateY: heroSlide }],
                },
              ]}
            >
              <View style={[styles.heroCard, heroCardStyle]}>
                <HeroDecor />

                <View style={styles.heroSection}>
                  <View
                    style={[
                      styles.heroPill,
                      {
                        backgroundColor: palette.accentSoft,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.heroPillDot,
                        {
                          backgroundColor: palette.accent,
                        },
                      ]}
                    />

                    <AppText
                      variant="body-small"
                      weight="900"
                      tone="accent"
                      style={{
                        letterSpacing: 0.3,
                      }}
                    >
                      今日空氣行動指南
                    </AppText>
                  </View>

                  <AppText
                    variant="display"
                    weight="900"
                    style={styles.heroTitle}
                  >
                    先理解你，{`\n`}再決定今天怎麼動。
                  </AppText>

                  <AppText style={styles.heroSubtitle}>
                    嗨，
                    {app.local.deviceProfile?.displayName ??
                      '今天的你'}
                    ！直接說出你的活動計畫，AirMe
                    會結合環境數據與健康防線為你量身建議。
                  </AppText>

                  <View style={styles.tabSection}>
                    <SegmentedTabBar
                      activeKey={activeTab}
                      onChange={setActiveTab}
                    />
                  </View>
                </View>
              </View>
            </Animated.View>

            <View style={styles.divider} />

            {app.error ? (
              <Card
                accessibilityRole="alert"
                key="error"
                pattern="dots"
                patternColor={palette.destructive}
                style={{
                  borderRadius: CARD_RADIUS,
                  borderWidth: 1.5,
                  backgroundColor: palette.destructiveSoft,
                  borderColor: palette.ink,
                  marginBottom: spacing.lg,
                }}
              >
                <AppText tone="danger" weight="800">
                  目前無法完成
                </AppText>

                <AppText>{app.error}</AppText>

                {!app.local.demoMode ? (
                  <AppButton
                    label="切換示範模式"
                    onPress={() => {
                      void app.setDemoMode(true);
                    }}
                    variant="secondary"
                  />
                ) : null}

                <AppButton
                  label="關閉提醒"
                  onPress={app.clearError}
                  variant="ghost"
                />
              </Card>
            ) : null}

            <View
              key="dashboard"
              style={[
                styles.dashboard,
                wideDashboard && styles.dashboardWide,
              ]}
            >
              {wideDashboard
                ? [environmentPanel, composerPanel]
                : [composerPanel, environmentPanel]}
            </View>
          </Screen>
        </PageShell>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#C8E6C9',
  },

  /*
   * zIndex 0：
   * 位於 mainWrapper 的綠色背景之上，
   * 但位於 contentLayer 之下。
   */
  bubbleLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    overflow: 'hidden',
  },

  bubble: {
    position: 'absolute',
    top: 0,
    left: 0,

    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',

    shadowColor: '#047857',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.09,
    shadowRadius: 18,
  },

  /*
   * zIndex 1：
   * 所有 Header、文字、Hero 與下方卡片均位於氣泡之上。
   */
  contentLayer: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
  },

  center: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
  },

  // --------------------------------------------------------------------
  // Hero 卡片
  // --------------------------------------------------------------------

  heroWrap: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 880,
    marginTop: spacing.md,
  },

  heroCard: {
    borderRadius: CARD_RADIUS,
    borderWidth: 1.5,
    overflow: 'hidden',

    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.04,
    shadowRadius: 16,

    elevation: 2,
  },

  heroSection: {
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.md,
    maxWidth: 720,
    width: '100%',
    zIndex: 1,
  },

  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 99,
    paddingHorizontal: 18,
    paddingVertical: 7,
  },

  heroPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  heroTitle: {
    fontSize: 44,
    lineHeight: 54,
    letterSpacing: -0.9,
    color: '#1C1D1F',
    textAlign: 'center',
  },

  heroSubtitle: {
    fontSize: 16,
    lineHeight: 26,
    color: '#374151',
    textAlign: 'center',
    maxWidth: 580,
    opacity: 0.88,
  },

  tabSection: {
    marginTop: 12,
    alignItems: 'center',
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    marginVertical: spacing.lg,
  },

  // --------------------------------------------------------------------
  // Hero 右側裝飾
  // --------------------------------------------------------------------

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
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    top: -60,
    right: -50,
  },

  decorCircleMd: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    bottom: -30,
    right: 40,
  },

  decorCircleSm: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    top: 40,
    right: 10,
  },

  decorLine: {
    position: 'absolute',
    height: 1,
    width: 150,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },

  decorLineA: {
    top: 70,
    right: -20,
    transform: [{ rotate: '-22deg' }],
  },

  decorLineB: {
    bottom: 60,
    right: 10,
    width: 100,
    transform: [{ rotate: '16deg' }],
  },

  decorDot1: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    top: 62,
    right: 40,
  },

  decorDot2: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    bottom: 66,
    right: 96,
  },

  // --------------------------------------------------------------------
  // 下方面板
  //
  // 這些 Column 現在只負責版面配置；
  // 不再加入背景、邊框、padding 或 overflow，
  // 因此不會在子元件的 Card 外再形成第二張灰色卡片。
  // --------------------------------------------------------------------

  dashboard: {
    gap: spacing.xl,
  },

  dashboardWide: {
    alignItems: 'stretch',
    flexDirection: 'row',
  },

  environmentColumn: {
    flex: 0.85,
    width: '100%',
    minWidth: 0,
  },

  composerColumn: {
    flex: 1.15,
    width: '100%',
    minWidth: 0,
  },
});