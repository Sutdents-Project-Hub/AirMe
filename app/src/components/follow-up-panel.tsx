import type { FollowUpResponse } from '@airme/contracts';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { borders, radii, spacing, typography, usePalette } from '../design/tokens';
import { AppText } from './ui/app-text';
import { Card } from './ui/card';

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
    <Card
      pattern="dots"
      patternColor={palette.ink}
      style={{ backgroundColor: palette.yellow, borderColor: palette.ink }}>
      <View style={styles.heading}>
        <View style={[styles.eyebrow, { backgroundColor: palette.surface, borderColor: palette.ink }]}>
          <AppText variant="caption" weight="900">
            ASK WITHIN CONTEXT
          </AppText>
        </View>
        <AppText variant="title" weight="800">
          還想確認什麼？
        </AppText>
        <AppText tone="muted">
          可追問這次活動的空品、活動安全與一般自我保護。AirMe 不提供診斷或用藥建議。
        </AppText>
      </View>
      <View style={styles.starters}>
        {STARTERS.map((starter) => (
          <Pressable
            key={starter}
            accessibilityLabel={`快速提問：${starter}`}
            accessibilityRole="button"
            accessibilityState={{ selected: question === starter }}
            onPress={() => setQuestion(starter)}
            style={({ pressed }) => [
              styles.quickPrompt,
              {
                backgroundColor: question === starter ? palette.accentSoft : palette.surface,
                borderColor: question === starter ? palette.accent : palette.border,
                opacity: pressed ? 0.74 : 1,
              },
            ]}>
            <AppText variant="body-small" weight="700">
              ＋ {starter}
            </AppText>
          </Pressable>
        ))}
      </View>
      <View style={[styles.inputRow, { backgroundColor: palette.surface, borderColor: palette.ink }]}>
        <TextInput
          accessibilityLabel="針對這張行動卡追問"
          editable={!loading}
          maxLength={500}
          onChangeText={setQuestion}
          onSubmitEditing={() => void ask()}
          placeholder="例如：如果改成室內活動呢？"
          placeholderTextColor={palette.textMuted}
          returnKeyType="send"
          style={[styles.input, { color: palette.text }]}
          value={question}
        />
        <Pressable
          accessibilityLabel={loading ? '正在整理回覆' : '送出追問'}
          accessibilityRole="button"
          accessibilityState={{ disabled: loading || question.trim().length < 2 }}
          disabled={loading || question.trim().length < 2}
          onPress={() => void ask()}
          style={({ pressed }) => [
            styles.sendButton,
            {
              backgroundColor: palette.primary,
              opacity:
                loading || question.trim().length < 2 ? 0.45 : pressed ? 0.74 : 1,
            },
          ]}>
          <AppText weight="900" style={{ color: palette.onPrimary }}>
            {loading ? '…' : '→'}
          </AppText>
        </Pressable>
      </View>
      {response ? (
        <View
          accessibilityLiveRegion="polite"
          style={[
            styles.response,
            {
              backgroundColor:
                response.disposition === 'urgent-safety'
                  ? palette.destructiveSoft
                  : palette.surface,
              borderColor: palette.ink,
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
  eyebrow: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: borders.thin,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  starters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quickPrompt: {
    borderRadius: radii.pill,
    borderWidth: borders.thin,
    ...Platform.select({
      web: { boxShadow: '0 3px 8px rgba(23,59,42,0.12)' },
      default: { elevation: 2 },
    }),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputRow: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: borders.thick,
    flexDirection: 'row',
    minHeight: 56,
    padding: spacing.xs,
  },
  input: {
    flex: 1,
    fontFamily: typography.family,
    fontSize: typography.size.body,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sendButton: {
    alignItems: 'center',
    borderRadius: radii.sm,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  response: { borderRadius: radii.md, borderWidth: borders.thin, gap: spacing.sm, padding: spacing.lg },
});
