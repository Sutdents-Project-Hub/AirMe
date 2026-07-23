import React, { useEffect, useRef, useState } from 'react';
import { Redirect, useRouter, type Href } from 'expo-router';
import { StyleSheet, View, Platform, Image, Animated, Easing, Dimensions, ScrollView } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { AccountForm } from '../components/account-form';
import { AppHeader } from '../components/app-header';
import { AppButton } from '../components/ui/app-button';
import { AppText } from '../components/ui/app-text';
import { Card } from '../components/ui/card';
import { radii, spacing, usePalette } from '../design/tokens';
import { useApp } from '../state/app-provider';

// 圖片引用路徑
const GirlImage = require('../../../asset/image.jpg');
const BoyImage = require('../../../asset/image (1).jpg');

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * 注入網頁專用的 CSS 波浪流動動畫
 */
const injectWaveStyle = () => {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const styleId = 'wavy-background-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        @keyframes moveWave1 {
          0% { transform: translateX(0px) translateY(0px); }
          50% { transform: translateX(120px) translateY(10px); }
          100% { transform: translateX(0px) translateY(0px); }
        }
        @keyframes moveWave2 {
          0% { transform: translateX(0px) translateY(0px); }
          50% { transform: translateX(90px) translateY(-12px); }
          100% { transform: translateX(0px) translateY(0px); }
        }
        @keyframes moveWave3 {
          0% { transform: translateX(0px) translateY(0px); }
          50% { transform: translateX(140px) translateY(8px); }
          100% { transform: translateX(0px) translateY(0px); }
        }
        .wave-layer-1 { animation: moveWave1 8s ease-in-out infinite; }
        .wave-layer-2 { animation: moveWave2 6s ease-in-out infinite; }
        .wave-layer-3 { animation: moveWave3 10s ease-in-out infinite; }
      `;
      document.head.appendChild(style);
    }
  }
};

/**
 * 元件：動態波浪與兩側人物背景
 */
function WavyBackground() {
  const palette = usePalette();

  useEffect(() => {
    injectWaveStyle();
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* 左側女生 */}
      <View style={styles.leftCharacterContainer}>
        <Image
          source={GirlImage}
          style={[styles.characterImage, styles.flipHorizontal]}
          resizeMode="contain"
        />
      </View>

      {/* 右側男生 */}
      <View style={styles.rightCharacterContainer}>
        <Image
          source={BoyImage}
          style={styles.characterImage}
          resizeMode="contain"
        />
      </View>

      {/* 深綠波浪圖層 */}
      <View style={styles.waveContainer}>
        <Svg height="100%" width="100%" viewBox="0 0 1440 320" style={styles.waveSvg} preserveAspectRatio="none">
          <Path
            // @ts-ignore
            className="wave-layer-1"
            fill={palette.accentSoft || '#d1fae5'}
            opacity={0.6}
            d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,149.3C672,149,768,203,864,202.7C960,203,1056,149,1152,122.7C1248,96,1344,96,1392,96L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          />
          <Path
            // @ts-ignore
            className="wave-layer-2"
            fill="#22c55e"
            opacity={0.5}
            d="M0,64L48,90.7C96,117,192,171,288,197.3C384,224,480,224,576,213.3C672,203,768,181,864,154.7C960,128,1056,96,1152,101.3C1248,107,1344,149,1392,170.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          />
          <Path
            // @ts-ignore
            className="wave-layer-3"
            fill="#15803d"
            opacity={0.9}
            d="M0,224L48,213.3C96,203,192,181,288,186.7C384,192,480,224,576,240C672,256,768,256,864,240C960,224,1056,192,1152,170.7C1248,149,1344,139,1392,133.3L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          />
        </Svg>
      </View>
    </View>
  );
}

export default function AccountScreen() {
  const app = useApp();
  const palette = usePalette();
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);

  // 滑動與淡出動畫值
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // 安全寫入測試資料
  useEffect(() => {
    if (!app.account) {
      app.account = { displayName: '測試員', email: 'test@example.com' } as any;
      app.local.onboardingCompleted = true;
    }
  }, [app]);

  // 觸發向左滑出 + 淡出動畫
  const triggerSlideLeft = (onComplete?: () => void) => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -SCREEN_WIDTH * 0.8,
        duration: 450,
        easing: Easing.bezier(0.25, 1, 0.5, 1),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onComplete) onComplete();
    });
  };

  if (!app.hydrated) return null;

  if (app.account && !app.local.onboardingCompleted) {
    return <Redirect href={'/onboarding' as Href} />;
  }

  if (app.account) {
    return (
      <View style={styles.container}>
        <WavyBackground />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View style={styles.animatedContent}>
            <AppHeader demoMode={app.local.demoMode} />
            <View style={styles.hero}>
              <View style={[styles.eyebrow, { backgroundColor: palette.accentSoft }]}>
                <AppText variant="body-small" weight="900" tone="accent">
                  AIRME 帳號
                </AppText>
              </View>
              <AppText variant="display" weight="900">
                歡迎回來，{`\n`}{app.account.displayName}。
              </AppText>
            </View>
            <Card>
              <View style={styles.stack}>
                <AppText variant="title-small" weight="800">
                  目前登入帳號
                </AppText>
                <AppText>{app.account.email}</AppText>
                <AppText tone="muted">
                  登入只管理此帳號；裝置上的個人檔案、Air 日誌與回饋仍維持本機保存，不會自動上傳。
                </AppText>
                <AppButton label="回到我的 AirMe" onPress={() => router.replace('/settings' as Href)} />
                <AppButton label="登出這台裝置" onPress={() => void app.logout()} variant="secondary" loading={app.authBusy} />
                {confirmDelete ? (
                  <View style={styles.stack}>
                    <AppText tone="danger" weight="800">
                      刪除後無法復原帳號與登入工作階段；這台裝置的本機資料不會自動清除。
                    </AppText>
                    <AppButton
                      label="確認刪除 AirMe 帳號"
                      onPress={() => void app.deleteAccount()}
                      variant="danger"
                      loading={app.authBusy}
                    />
                    <AppButton label="取消" onPress={() => setConfirmDelete(false)} variant="ghost" />
                  </View>
                ) : (
                  <AppButton label="刪除 AirMe 帳號" onPress={() => setConfirmDelete(true)} variant="ghost" />
                )}
              </View>
            </Card>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WavyBackground />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.animatedContent,
            {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <AppHeader demoMode={app.local.demoMode} />
          <View style={styles.hero}>
            <View style={[styles.eyebrow, { backgroundColor: palette.accentSoft }]}>
              <AppText variant="body-small" weight="900" tone="accent">
                AIRME 帳號
              </AppText>
            </View>
            <AppText variant="display" weight="900">
              先登入，{`\n`}再建立你的 AirMe。
            </AppText>
            <AppText tone="muted">
              建立帳號後才能使用 AirMe。接著會建立只保存在這台裝置的個人情境；敏感設定、活動與回饋不會自動同步到雲端。
            </AppText>
          </View>

          <AccountForm
            onSubmitSuccess={() => {
              triggerSlideLeft();
            }}
          />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  animatedContent: {
    width: '100%',
    maxWidth: 760,
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
    zIndex: 10,
  },
  hero: { gap: spacing.md, maxWidth: 620 },
  eyebrow: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  stack: { gap: spacing.md },

  // 波浪與人物樣式
  waveContainer: {
    position: 'absolute',
    bottom: -20,
    left: '-25%',
    height: '45%',
    width: '160%',
    zIndex: 2,
  },
  waveSvg: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  leftCharacterContainer: {
    position: 'absolute',
    bottom: '-2%',
    left: '1%',
    width: 380,
    height: 520,
    zIndex: 1,
  },
  rightCharacterContainer: {
    position: 'absolute',
    bottom: '-2%',
    right: '1%',
    width: 380,
    height: 520,
    zIndex: 1,
  },
  characterImage: {
    width: '100%',
    height: '100%',
  },
  flipHorizontal: {
    transform: [{ scaleX: -1 }],
  },
});