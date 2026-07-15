import type { EnvironmentSnapshot } from '@airme/contracts';
import { StyleSheet, View } from 'react-native';

import { borders, spacing, usePalette } from '../design/tokens';
import { AppText } from './ui/app-text';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Taipei',
  }).format(new Date(value));
}

export function SourceDisclosure({ sources }: { sources: EnvironmentSnapshot['sources'] }) {
  const palette = usePalette();
  return (
    <View style={styles.list}>
      {sources.map((source) => (
        <View key={`${source.provider}-${source.observedAt}`} style={styles.row}>
          <View
            style={[
              styles.dot,
              {
                backgroundColor: source.stale ? palette.yellow : palette.surface,
                borderColor: palette.ink,
              },
            ]}
          />
          <View style={styles.copy}>
            <AppText variant="body-small" weight="700">
              {source.label}
            </AppText>
            <AppText variant="caption" tone="muted">
              {source.stale ? '資料已過更新時效 · ' : ''}更新：{formatDate(source.observedAt)}
            </AppText>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  row: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  dot: { borderRadius: 5, borderWidth: borders.thin, height: 10, marginTop: 6, width: 10 },
  copy: { flex: 1 },
});
