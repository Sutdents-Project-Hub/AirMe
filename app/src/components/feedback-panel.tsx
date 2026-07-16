import type { Feedback } from '@airme/contracts';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { borders, radii, spacing, typography, usePalette } from '../design/tokens';
import { AppButton } from './ui/app-button';
import { AppText } from './ui/app-text';
import { Card } from './ui/card';
import { Chip } from './ui/chip';

interface FeedbackPanelProps {
  recommendationId: string;
  submitted: boolean;
  onSubmit: (value: {
    recommendationId: string;
    completed: boolean;
    discomfort: Feedback['discomfort'];
    helpful: Feedback['helpful'];
    note: string | undefined;
  }) => void;
}

export function FeedbackPanel({ recommendationId, submitted, onSubmit }: FeedbackPanelProps) {
  const palette = usePalette();
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [discomfort, setDiscomfort] = useState<Feedback['discomfort'] | null>(null);
  const [helpful, setHelpful] = useState<Feedback['helpful'] | null>(null);
  const [note, setNote] = useState('');

  if (submitted) {
    return (
      <Card
        pattern="dots"
        patternColor={palette.success}
        style={{ backgroundColor: palette.successSoft, borderColor: palette.ink }}>
        <AppText variant="title-small" weight="800">
          回饋已保存在這台裝置
        </AppText>
        <AppText tone="muted">謝謝你留下紀錄。AirMe 不會把它解讀成醫療因果。</AppText>
      </Card>
    );
  }

  return (
    <Card pattern="stripes" patternColor={palette.coral}>
      <View style={styles.heading}>
        <View style={[styles.eyebrow, { backgroundColor: palette.coral, borderColor: palette.ink }]}>
          <AppText variant="caption" weight="900" style={{ color: palette.surface }}>
            5 SECOND CHECK-IN
          </AppText>
        </View>
        <AppText variant="title" weight="800">
          5 秒活動回饋
        </AppText>
        <AppText tone="muted">只保存你自己選擇的活動紀錄，不解釋原因，也不當成醫療紀錄。</AppText>
      </View>
      <View style={styles.field}>
        <AppText weight="700">後來有進行這項活動嗎？</AppText>
        <View style={styles.options}>
          <Chip
            label="有"
            selected={completed === true}
            onPress={() => setCompleted(true)}
            accessibilityLabel="活動完成：是"
          />
          <Chip
            label="沒有"
            selected={completed === false}
            onPress={() => setCompleted(false)}
            accessibilityLabel="活動完成：否"
          />
        </View>
      </View>
      <View style={styles.field}>
        <AppText weight="700">活動後有不舒服嗎？</AppText>
        <AppText variant="caption" tone="muted">若沒有進行活動，可選「不想回答」。</AppText>
        <View style={styles.options}>
          <Chip
            label="沒有"
            selected={discomfort === 'none'}
            onPress={() => setDiscomfort('none')}
            accessibilityLabel="活動後不舒服程度：沒有"
          />
          <Chip
            label="輕微"
            selected={discomfort === 'mild'}
            onPress={() => setDiscomfort('mild')}
            accessibilityLabel="活動後不舒服程度：輕微"
          />
          <Chip
            label="明顯"
            selected={discomfort === 'obvious'}
            onPress={() => setDiscomfort('obvious')}
            accessibilityLabel="活動後不舒服程度：明顯"
          />
          <Chip
            label="不想回答"
            selected={discomfort === 'prefer-not'}
            onPress={() => setDiscomfort('prefer-not')}
            accessibilityLabel="活動後不舒服程度：不想回答"
          />
        </View>
      </View>
      <View style={styles.field}>
        <AppText weight="700">這張建議有幫助嗎？</AppText>
        <View style={styles.options}>
          <Chip
            label="有"
            selected={helpful === 'yes'}
            onPress={() => setHelpful('yes')}
            accessibilityLabel="建議是否有幫助：有"
          />
          <Chip
            label="沒有"
            selected={helpful === 'no'}
            onPress={() => setHelpful('no')}
            accessibilityLabel="建議是否有幫助：沒有"
          />
          <Chip
            label="不確定"
            selected={helpful === 'unsure'}
            onPress={() => setHelpful('unsure')}
            accessibilityLabel="建議是否有幫助：不確定"
          />
        </View>
      </View>
      <TextInput
        accessibilityLabel="回饋備註（選填）"
        maxLength={240}
        onChangeText={setNote}
        placeholder="選填：記下想提醒自己的事"
        placeholderTextColor={palette.textMuted}
        style={[
          styles.input,
          { backgroundColor: palette.background, borderColor: palette.ink, color: palette.text },
        ]}
        value={note}
      />
      <AppButton
        label="儲存活動回饋"
        onPress={() => {
          if (completed === null || discomfort === null || helpful === null) return;
          onSubmit({
            recommendationId,
            completed,
            discomfort,
            helpful,
            note: note.trim() || undefined,
          });
        }}
        disabled={completed === null || discomfort === null || helpful === null}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  heading: { gap: spacing.sm },
  eyebrow: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: borders.thin,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  field: { gap: spacing.sm },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  input: {
    borderRadius: radii.md,
    borderWidth: borders.thick,
    fontFamily: typography.family,
    fontSize: typography.size.body,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
