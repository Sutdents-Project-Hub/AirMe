import type { Location, Profile } from '@airme/contracts';
import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { spacing, typography, usePalette } from '../design/tokens';
import {
  createManualLocation,
  ACTIVITY_LABEL,
  parseProfileDescription,
  resolveKnownLocation,
  type ProfileUnderstanding,
} from '../features/profile/profile-parser';
import type { DeviceProfile } from '../storage/local-store';
import { AppButton } from './ui/app-button';
import { AppText } from './ui/app-text';
import { Card } from './ui/card';

interface ProfileFormProps {
  onSubmit: (value: {
    profile: Profile;
    location?: Location;
    deviceProfile?: DeviceProfile;
  }) => void;
  onAnalyze?: (description: string) => Promise<ProfileUnderstanding | null>;
  onSkip: () => void;
  analyzing?: boolean;
  submitting: boolean;
  initialName?: string;
}

const AGE_LABEL: Record<Profile['ageGroup'], string> = {
  child: '12 歲以下',
  teen: '13–17 歲',
  adult: '18 歲以上',
};

const COMMUTE_LABEL: Record<Profile['commuteMode'], string> = {
  walk: '步行',
  bike: '單車',
  'public-transit': '大眾運輸',
  car: '汽車',
  scooter: '機車',
};

const CONDITION_LABEL: Record<Profile['sensitiveConditions'][number], string> = {
  'respiratory-sensitive': '呼吸道較敏感',
  'cardiovascular-sensitive': '心血管較敏感',
  'allergy-sensitive': '容易受過敏原影響',
};

export function ProfileForm({
  onSubmit,
  onAnalyze,
  onSkip,
  analyzing = false,
  submitting,
  initialName = '',
}: ProfileFormProps) {
  const palette = usePalette();
  const [displayName, setDisplayName] = useState(initialName);
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [understanding, setUnderstanding] = useState<ProfileUnderstanding | null>(null);
  const manualLocation = useMemo(
    () => createManualLocation({ name: locationName, latitude, longitude }),
    [latitude, locationName, longitude],
  );
  const knownLocation = resolveKnownLocation(understanding?.commonAreaHint ?? null);
  const resolvedLocation = knownLocation ?? manualLocation;
  const profile =
    understanding?.profile.ageGroup && understanding.profile.commuteMode
      ? {
          ageGroup: understanding.profile.ageGroup,
          sensitiveConditions: understanding.profile.sensitiveConditions,
          commuteMode: understanding.profile.commuteMode,
          commonActivities: understanding.profile.commonActivities,
        }
      : null;

  const analyze = async () => {
    if (description.trim().length < 2) return;
    const result = onAnalyze
      ? await onAnalyze(description)
      : parseProfileDescription(description);
    if (result) setUnderstanding(result);
  };

  if (understanding) {
    return (
      <View style={styles.container}>
        <Card style={{ backgroundColor: palette.accentSoft }}>
          <AppText variant="body-small" weight="800" tone="accent">
            {understanding.provenance.aiMode === 'live' ? 'AI 已整理' : 'AIRME 已整理'}
          </AppText>
          <AppText variant="title" weight="800">
            這是我理解的你
          </AppText>
          <AppText tone="muted">
            請確認後再儲存；原始自我描述只用於這次分析，不會寫入裝置或同步資料。
          </AppText>
          <AppText variant="caption" tone="muted">
            {understanding.provenance.aiMode === 'live'
              ? '此結果由 AI 從本次描述擷取；未提及的內容會保留為尚未設定。'
              : '目前使用示範規則整理；切換為 Live 模式後會由 AI 分析。'}
          </AppText>
        </Card>

        <Card>
          <SummaryRow label="裝置暱稱" value={displayName.trim() || '尚未設定'} />
          <SummaryRow label="年齡層" value={profile ? AGE_LABEL[profile.ageGroup] : '尚未提及'} />
          <SummaryRow label="通勤" value={profile ? COMMUTE_LABEL[profile.commuteMode] : '尚未提及'} />
          <SummaryRow
            label="空品敏感條件"
            value={
              understanding.profile.sensitiveConditions.length
                ? understanding.profile.sensitiveConditions.map((item) => CONDITION_LABEL[item]).join('、')
                : '未提及'
            }
          />
          <SummaryRow
            label="常見活動"
            value={
              understanding.profile.commonActivities.length
                ? understanding.profile.commonActivities.map((item) => ACTIVITY_LABEL[item]).join('、')
                : '未提及'
            }
          />
          <SummaryRow
            label="常用區域"
            value={resolvedLocation?.name ?? understanding.commonAreaHint ?? '尚未提及'}
          />
        </Card>

        {understanding.missing.length > 0 ? (
          <Card style={{ backgroundColor: palette.warningSoft }}>
            <AppText weight="800">還有項目尚未設定</AppText>
            <AppText>
              {understanding.missing.includes('ageGroup') ? '年齡層 ' : ''}
              {understanding.missing.includes('commuteMode') ? '通勤方式 ' : ''}
              {understanding.missing.includes('location') ? '常用區域 ' : ''}
              都可以先略過，之後在「我的 AirMe」補上。
            </AppText>
          </Card>
        ) : null}

        {!resolvedLocation ? (
          <Card>
            <AppText variant="title-small" weight="800">
              補上常用區域座標（可略過）
            </AppText>
            <AppText variant="body-small" tone="muted">
              {understanding.commonAreaHint
                ? `AI 讀到「${understanding.commonAreaHint}」，請確認後補上區域級座標。`
                : '只保存區域級座標到三位小數，不需要住址。可從地圖長按位置查看座標。'}
            </AppText>
            <TextField
              label="區域名稱"
              value={locationName}
              onChangeText={setLocationName}
              placeholder="例如：高雄市楠梓區住家周邊"
            />
            <View style={styles.coordinateRow}>
              <View style={styles.coordinateField}>
                <TextField
                  label="緯度"
                  value={latitude}
                  onChangeText={setLatitude}
                  placeholder="22.75"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.coordinateField}>
                <TextField
                  label="經度"
                  value={longitude}
                  onChangeText={setLongitude}
                  placeholder="120.34"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </Card>
        ) : null}

        <View style={styles.actions}>
          <AppButton label="返回修改描述" onPress={() => setUnderstanding(null)} variant="ghost" />
          {profile ? (
            <AppButton
              label={submitting ? '正在儲存個人設定' : '確認並儲存已整理的設定'}
              onPress={() => {
                onSubmit({
                  profile,
                  ...(resolvedLocation ? { location: resolvedLocation } : {}),
                  ...(displayName.trim() ? { deviceProfile: { displayName: displayName.trim() } } : {}),
                });
              }}
              loading={submitting}
            />
          ) : null}
          <AppButton
            label="先略過，之後再設定"
            onPress={onSkip}
            variant="secondary"
            disabled={submitting}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={{ backgroundColor: palette.accentSoft }}>
        <AppText variant="title-small" weight="800">
          先建立這台裝置的個人檔案
        </AppText>
        <AppText variant="body-small" style={{ color: palette.text }}>
          每一項都可先略過，之後再從「我的 AirMe」設定。這份設定與活動紀錄仍只保存在這台裝置，不會自動上傳。
        </AppText>
      </Card>

      <Card>
        <TextField
          label="希望 AirMe 怎麼稱呼你？"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="暱稱即可，不必使用真名"
          maxLength={24}
        />
        <View style={styles.field}>
          <AppText weight="700">用一句話介紹你的日常</AppText>
          <AppText variant="body-small" tone="muted">
            可寫年齡、通勤方式、常見活動、空品敏感狀況與常用區域；沒提到的欄位會保留為尚未設定。
          </AppText>
          <TextInput
            accessibilityLabel="個人日常描述"
            maxLength={600}
            multiline
            onChangeText={setDescription}
            placeholder="例如：我 15 歲，平常騎單車到高科大第一校區，鼻子容易受空品影響，放學會跑步。"
            placeholderTextColor={palette.textMuted}
            style={[
              styles.textarea,
              { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
            ]}
            textAlignVertical="top"
            value={description}
          />
          <AppText variant="caption" tone="muted" style={styles.counter}>
            {description.length} / 600
          </AppText>
          <AppText variant="caption" tone="muted">
            在線模式下，這段描述會暫時傳給 AirMe 後端與 AI 進行結構化分析；AirMe 不會將它寫入裝置、雲端同步或服務紀錄，AI 供應商的處理依其服務政策。
          </AppText>
        </View>
        <AppButton
          label={analyzing ? 'AI 正在整理設定' : '讓 AI 整理我的設定'}
          onPress={() => void analyze()}
          disabled={description.trim().length < 2}
          loading={analyzing}
        />
        <AppButton label="先略過，之後再設定" onPress={onSkip} variant="ghost" />
      </Card>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  const palette = usePalette();
  return (
    <View style={[styles.summaryRow, { borderBottomColor: palette.border }]}>
      <AppText variant="body-small" tone="muted" style={styles.summaryLabel}>
        {label}
      </AppText>
      <AppText weight="700" style={styles.summaryValue}>
        {value}
      </AppText>
    </View>
  );
}

function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  maxLength,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  maxLength?: number;
  keyboardType?: 'default' | 'decimal-pad';
}) {
  const palette = usePalette();
  return (
    <View style={styles.field}>
      <AppText weight="700">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        keyboardType={keyboardType}
        maxLength={maxLength}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        style={[
          styles.input,
          { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
        ]}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xl },
  field: { gap: spacing.sm },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    fontFamily: typography.family,
    fontSize: typography.size.body,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  textarea: {
    borderRadius: 16,
    borderWidth: 1,
    fontFamily: typography.family,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    minHeight: 168,
    padding: spacing.lg,
  },
  counter: { alignSelf: 'flex-end' },
  summaryRow: {
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.lg,
    paddingBottom: spacing.md,
  },
  summaryLabel: { width: 108 },
  summaryValue: { flex: 1 },
  coordinateRow: { flexDirection: 'row', gap: spacing.md },
  coordinateField: { flex: 1 },
  actions: { gap: spacing.md },
});
