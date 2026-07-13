import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { radii, spacing, typography, usePalette } from '../design/tokens';
import { AppButton } from './ui/app-button';
import { AppText } from './ui/app-text';
import { Card } from './ui/card';

interface ActivityComposerProps {
  loading: boolean;
  onSubmit: (value: string) => void;
  initialValue?: string;
}

export function ActivityComposer({ loading, onSubmit, initialValue = '' }: ActivityComposerProps) {
  const palette = usePalette();
  const [value, setValue] = useState(initialValue);
  const trimmed = value.trim();

  return (
    <Card>
      <View style={styles.heading}>
        <AppText variant="title" weight="800">
          你現在想做什麼？
        </AppText>
        <AppText tone="muted">
          把活動、時間、地點、強度和當下狀況寫在一起，AirMe 會整理成一張行動卡。
        </AppText>
      </View>
      <TextInput
        accessibilityLabel="描述你的活動"
        editable={!loading}
        maxLength={800}
        multiline
        onChangeText={setValue}
        placeholder="例如：下午四點想在學校操場慢跑 30 分鐘，今天喉嚨有點不舒服"
        placeholderTextColor={palette.textMuted}
        style={[
          styles.input,
          {
            backgroundColor: palette.background,
            borderColor: palette.border,
            color: palette.text,
          },
        ]}
        textAlignVertical="top"
        value={value}
      />
      <View style={styles.meta}>
        <AppText variant="caption" tone="muted">
          不需要填姓名或醫療診斷
        </AppText>
        <AppText variant="caption" tone="muted">
          {value.length} / 800
        </AppText>
      </View>
      <AppButton
        label={loading ? '正在分析環境與活動' : '產生我的行動卡'}
        accessibilityLabel={loading ? '正在分析環境與活動' : '產生我的行動卡'}
        onPress={() => onSubmit(trimmed)}
        disabled={trimmed.length < 2}
        loading={loading}
      />
      {loading ? (
        <AppText variant="body-small" tone="muted" accessibilityLiveRegion="polite">
          正在套用官方規則與環境資料，通常需要幾秒鐘。
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  heading: { gap: spacing.sm },
  input: {
    borderRadius: radii.md,
    borderWidth: 1,
    fontFamily: typography.family,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    minHeight: 140,
    padding: spacing.lg,
  },
  meta: { flexDirection: 'row', justifyContent: 'space-between' },
});
