import { Pressable, StyleSheet } from 'react-native';

import { borders, radii, spacing, usePalette } from '../../design/tokens';
import { AppText } from './app-text';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}

export function Chip({ label, selected, onPress, accessibilityLabel }: ChipProps) {
  const palette = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? palette.accentSoft : palette.surface,
          borderColor: selected ? palette.primary : palette.border,
          opacity: pressed ? 0.72 : 1,
        },
      ]}>
      <AppText
        variant="body-small"
        weight={selected ? '700' : '500'}
        style={{ color: selected ? palette.primary : palette.text }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radii.pill,
    borderWidth: borders.thin,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
