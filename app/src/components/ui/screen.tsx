import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing, usePalette } from '../../design/tokens';

interface ScreenProps {
  scroll?: boolean;
  maxWidth?: number;
}

export function Screen({ children, scroll = true, maxWidth = 1120 }: PropsWithChildren<ScreenProps>) {
  const palette = usePalette();
  const { width } = useWindowDimensions();
  const horizontal = width >= 768 ? spacing.xl : spacing.lg;
  const content = (
    <View style={[styles.content, { maxWidth, paddingHorizontal: horizontal }]}>{children}</View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={[styles.patternSurface, { backgroundColor: palette.background }]}>
        <View pointerEvents="none" style={[styles.glowTop, { backgroundColor: palette.accentSoft }]} />
        <View pointerEvents="none" style={[styles.glowBottom, { backgroundColor: palette.sky }]} />
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
    opacity: 0.58,
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
    opacity: 0.24,
    position: 'absolute',
    width: 380,
  },
});
