import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { radii, spacing, usePalette } from '../../design/tokens';

export function Card({ children, style, ...props }: PropsWithChildren<ViewProps>) {
  const palette = usePalette();
  return (
    <View
      {...props}
      style={[
        styles.card,
        { backgroundColor: palette.surface, borderColor: palette.border },
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg,
  },
});
