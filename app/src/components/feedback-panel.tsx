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
    feeling: Feedback['feeling'];
    note: string | undefined;
  }) => void;
}

export function FeedbackPanel({ recommendationId, submitted, onSubmit }: FeedbackPanelProps) {
  const palette = usePalette();
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [feeling, setFeeling] = useState<Feedback['feeling'] | null>(null);
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
        <AppText tone="muted">只記錄完成狀況與主觀感受，不判定空品造成了什麼。</AppText>
      </View>
      <View style={styles.field}>
        <AppText weight="700">有完成今天的方案嗎？</AppText>
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
        <AppText weight="700">活動後的感受</AppText>
        <View style={styles.options}>
          <Chip
            label="比較好"
            selected={feeling === 'better'}
            onPress={() => setFeeling('better')}
            accessibilityLabel="活動後感受：比較好"
          />
          <Chip
            label="差不多"
            selected={feeling === 'same'}
            onPress={() => setFeeling('same')}
            accessibilityLabel="活動後感受：差不多"
          />
          <Chip
            label="比較差"
            selected={feeling === 'worse'}
            onPress={() => setFeeling('worse')}
            accessibilityLabel="活動後感受：比較差"
          />
          <Chip
            label="不確定"
            selected={feeling === 'not-sure'}
            onPress={() => setFeeling('not-sure')}
            accessibilityLabel="活動後感受：不確定"
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
          if (completed === null || feeling === null) return;
          onSubmit({
            recommendationId,
            completed,
            feeling,
            note: note.trim() || undefined,
          });
        }}
        disabled={completed === null || feeling === null}
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
