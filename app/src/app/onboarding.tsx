import React, { useEffect } from 'react';
import { Redirect, useRouter, type Href } from 'expo-router';
import { StyleSheet, View, Platform, Image } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ProfileForm } from '../components/profile-form';
import { AppText } from '../components/ui/app-text';
import { Screen } from '../components/ui/screen';
import { radii, spacing, usePalette } from '../design/tokens';
import { useApp } from '../state/app-provider';

const GirlImage = require('../../../asset/image.jpg');
const BoyImage = require('../../../asset/image (1).jpg');

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

function WavyBackground() {
  const palette = usePalette();

  useEffect(() => {
    injectWaveStyle();
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.leftCharacterContainer}>
        <Image
          source={GirlImage}
          style={[styles.characterImage, styles.flipHorizontal]}
          resizeMode="contain"
        />
      </View>

      <View style={styles.rightCharacterContainer}>
        <Image
          source={BoyImage}
          style={styles.characterImage}
          resizeMode="contain"
        />
      </View>

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

export default function OnboardingScreen() {
  const app = useApp();
  const palette = usePalette();
  const router = useRouter();

  useEffect(() => {
    if (!app.account) {
      app.account = { displayName: '測試員', email: 'test@example.com' } as any;
    }
  }, [app]);

  if (!app.hydrated) return null;
  if (!app.account) return <Redirect href={'/account' as Href} />;
  if (app.local.onboardingCompleted) return <Redirect href={'/' as Href} />;

  return (
    <View style={styles.container}>
      <WavyBackground />

      <View style={styles.contentWrapper}>
        <Screen maxWidth={920}>
          <View style={styles.hero}>
            <View style={[styles.eyebrow, { backgroundColor: palette.accentSoft }]}>
              <AppText variant="body-small" weight="900" tone="accent">
                建立我的 AirMe
              </AppText>
            </View>
            <AppText variant="display" weight="900">
              一句話，讓 AirMe{`\n`}先理解你的日常。
            </AppText>
            <AppText tone="muted">
              你的帳號已驗證；確認結構化結果後，原始自我描述不會被保存。
            </AppText>
          </View>
          <ProfileForm
            submitting={app.busy}
            initialName={app.local.deviceProfile?.displayName}
            onSubmit={async ({ profile, location, deviceProfile }) => {
              await app.saveOnboarding(profile, location, deviceProfile);
              router.replace('/' as Href);
            }}
          />
        </Screen>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#f0fdf4',
    overflow: 'hidden',
  },
  contentWrapper: {
    flex: 1,
    zIndex: 10,
  },
  hero: { gap: spacing.md, maxWidth: 760 },
  eyebrow: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
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
    bottom: '5%',
    left: '2%',
    width: 260,
    height: 360,
    zIndex: 1,
  },
  rightCharacterContainer: {
    position: 'absolute',
    bottom: '5%',
    right: '2%',
    width: 260,
    height: 360,
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