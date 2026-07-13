import { StyleSheet, View } from 'react-native';

import { radii, spacing, usePalette } from '../design/tokens';
import { AppText } from './ui/app-text';

export function AppHeader({ demoMode }: { demoMode: boolean }) {
  const palette = usePalette();
  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <View style={[styles.mark, { backgroundColor: palette.air }]} />
        <View>
          <AppText variant="title-small" weight="900">
            AirMe
          </AppText>
          <AppText variant="caption" tone="muted">
            空氣健康小管家
          </AppText>
        </View>
      </View>
      <View style={[styles.mode, { backgroundColor: demoMode ? palette.warningSoft : palette.successSoft }]}>
        <AppText variant="caption" weight="800">
          {demoMode ? 'DEMO' : 'LIVE'}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  brand: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  mark: { borderBottomLeftRadius: 14, borderBottomRightRadius: 14, borderTopLeftRadius: 14, borderTopRightRadius: 4, height: 32, width: 32 },
  mode: { borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
});
