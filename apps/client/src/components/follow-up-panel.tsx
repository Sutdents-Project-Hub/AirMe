import type { FollowUpResponse } from '@airme/contracts';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { radii, spacing, typography, usePalette } from '../design/tokens';
import { AppButton } from './ui/app-button';
import { AppText } from './ui/app-text';
import { Card } from './ui/card';
import { Chip } from './ui/chip';

interface FollowUpPanelProps {
  onAsk: (question: string) => Promise<FollowUpResponse>;
}

const STARTERS = ['改成室內走路可以嗎？', '多久後再確認 AQI？'];

const DISPOSITION_LABEL: Record<FollowUpResponse['disposition'], string> = {
  answered: 'AirMe 回覆',
  'out-of-scope': '問題範圍提醒',
  'medical-boundary': '安全邊界提醒',
  'urgent-safety': '立即安全提醒',
};

export function FollowUpPanel({ onAsk }: FollowUpPanelProps) {
  const palette = usePalette();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<FollowUpResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ask = async () => {
    if (question.trim().length < 2 || loading) return;
    setLoading(true);
    setError(null);
    try {
      setResponse(await onAsk(question.trim()));
      setQuestion('');
    } catch {
      setError('這次追問無法完成，請重新產生行動卡或稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <View style={styles.heading}>
        <AppText variant="title" weight="800">
          還想確認什麼？
        </AppText>
        <AppText tone="muted">
          可追問這次活動的空品、活動安全與一般自我保護。AirMe 不提供診斷或用藥建議。
        </AppText>
      </View>
      <View style={styles.starters}>
        {STARTERS.map((starter) => (
          <Chip
            key={starter}
            label={starter}
            selected={question === starter}
            onPress={() => setQuestion(starter)}
            accessibilityLabel={starter}
          />
        ))}
      </View>
      <TextInput
        accessibilityLabel="針對這張行動卡追問"
        editable={!loading}
        maxLength={500}
        onChangeText={setQuestion}
        placeholder="例如：如果改成室內活動呢？"
        placeholderTextColor={palette.textMuted}
        style={[
          styles.input,
          { backgroundColor: palette.background, borderColor: palette.border, color: palette.text },
        ]}
        value={question}
      />
      <AppButton
        label={loading ? '正在整理回覆' : '送出追問'}
        accessibilityLabel={loading ? '正在整理回覆' : '送出追問'}
        onPress={ask}
        disabled={question.trim().length < 2}
        loading={loading}
        variant="secondary"
      />
      {response ? (
        <View
          accessibilityLiveRegion="polite"
          style={[
            styles.response,
            {
              backgroundColor:
                response.disposition === 'urgent-safety'
                  ? palette.destructiveSoft
                  : palette.accentSoft,
            },
          ]}>
          <AppText variant="body-small" weight="800">
            {DISPOSITION_LABEL[response.disposition]}
          </AppText>
          <AppText>{response.answer}</AppText>
        </View>
      ) : null}
      {error ? (
        <AppText tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  heading: { gap: spacing.sm },
  starters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  input: {
    borderRadius: radii.md,
    borderWidth: 1,
    fontFamily: typography.family,
    fontSize: typography.size.body,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  response: { borderRadius: radii.md, gap: spacing.sm, padding: spacing.lg },
});
