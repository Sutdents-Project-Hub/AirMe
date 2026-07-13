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
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: {
    alignSelf: 'center',
    flex: 1,
    gap: spacing.xl,
    paddingBottom: 104,
    paddingTop: spacing.lg,
    width: '100%',
  },
});
