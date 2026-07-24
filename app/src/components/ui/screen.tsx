import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';
import {
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

function useBreathe(duration: number) {
  const [value] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [value, duration]);

  return value;
}

export function Screen({ children, scroll = true, maxWidth = 1120 }: PropsWithChildren<ScreenProps>) {
  const palette = usePalette();
  const { width } = useWindowDimensions();
  const horizontal = width >= 768 ? spacing.xl : spacing.lg;

  const topProgress = useBreathe(6000);
  const bottomProgress = useBreathe(6500);

  const topScale = topProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const topTranslateY = topProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -20] });
  const topOpacity = topProgress.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.7] });

  const bottomScale = bottomProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] });
  const bottomTranslateY = bottomProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 20] });
  const bottomOpacity = bottomProgress.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.34] });

  const content = (
    <View
      role="main"
      style={[styles.content, { maxWidth, paddingHorizontal: horizontal }]}>
      {children}
    </View>
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
  patternSurface: { flex: 1 },
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
