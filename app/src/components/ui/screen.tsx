import type { PropsWithChildren } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing, usePalette } from '../../design/tokens';

interface ScreenProps {
  scroll?: boolean;
  maxWidth?: number;
}

function useReduceMotion() {
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduceMotion(value);
      })
      .catch(() => {
        if (active) setReduceMotion(true);
      });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);

  return reduceMotion;
}

function useBreathe(duration: number, reduceMotion: boolean) {
  const [value] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduceMotion) {
      value.stopAnimation();
      value.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          isInteraction: false,
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          isInteraction: false,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [duration, reduceMotion, value]);

  return value;
}

export function Screen({ children, scroll = true, maxWidth = 1120 }: PropsWithChildren<ScreenProps>) {
  const palette = usePalette();
  const { width } = useWindowDimensions();
  const horizontal = width >= 768 ? spacing.xl : spacing.lg;
  const reduceMotion = useReduceMotion();
  const topProgress = useBreathe(6000, reduceMotion);
  const bottomProgress = useBreathe(6500, reduceMotion);
  const [contentProgress] = useState(() => new Animated.Value(1));
  const contentHasAnimated = useRef(false);

  useEffect(() => {
    if (reduceMotion) {
      contentProgress.stopAnimation();
      contentProgress.setValue(1);
      return;
    }
    if (contentHasAnimated.current) return;
    contentHasAnimated.current = true;
    contentProgress.setValue(0);
    Animated.timing(contentProgress, {
      toValue: 1,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      isInteraction: false,
      useNativeDriver: true,
    }).start();
  }, [contentProgress, reduceMotion]);

  const topScale = topProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const topTranslateY = topProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -20] });
  const topOpacity = topProgress.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.7] });
  const bottomScale = bottomProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] });
  const bottomTranslateY = bottomProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 20] });
  const bottomOpacity = bottomProgress.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.34] });
  const contentOpacity = contentProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });
  const contentTranslateY = contentProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 0],
  });

  const content = (
    <Animated.View
      role="main"
      style={[
        styles.content,
        {
          maxWidth,
          opacity: contentOpacity,
          paddingHorizontal: horizontal,
          transform: [{ translateY: contentTranslateY }],
        },
      ]}>
      {children}
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={[styles.patternSurface, { backgroundColor: palette.background }]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glowTop,
            {
              backgroundColor: palette.accentSoft,
              opacity: topOpacity,
              transform: [{ scale: topScale }, { translateY: topTranslateY }],
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glowBottom,
            {
              backgroundColor: palette.sky,
              opacity: bottomOpacity,
              transform: [{ scale: bottomScale }, { translateY: bottomTranslateY }],
            },
          ]}
        />
        {scroll ? (
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  patternSurface: { flex: 1, overflow: 'hidden' },
  scroll: { flexGrow: 1 },
  content: {
    alignSelf: 'center',
    flex: 1,
    gap: spacing.xl,
    paddingBottom: 104,
    paddingTop: spacing.lg,
    width: '100%',
  },
  glowTop: {
    borderRadius: 999,
    height: 420,
    position: 'absolute',
    right: -160,
    top: -190,
    width: 420,
  },
  glowBottom: {
    borderRadius: 999,
    bottom: -220,
    height: 380,
    left: -190,
    position: 'absolute',
    width: 380,
  },
});
