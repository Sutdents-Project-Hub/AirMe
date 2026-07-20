import type { Location, Profile } from '@airme/contracts';
import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { spacing, typography, usePalette } from '../design/tokens';
import {
  createManualLocation,
  ACTIVITY_LABEL,
  parseProfileDescription,
  type ProfileUnderstanding,
} from '../features/profile/profile-parser';
import type { DeviceProfile } from '../storage/local-store';
import { AppButton } from './ui/app-button';
import { AppText } from './ui/app-text';
import { Card } from './ui/card';

interface ProfileFormProps {
  onSubmit: (value: {
    profile: Profile;
    location: Location;
    deviceProfile: DeviceProfile;
  }) => void;
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

export function ProfileForm({ onSubmit, submitting, initialName = '' }: ProfileFormProps) {
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
  const resolvedLocation = understanding?.location ?? manualLocation;
  const complete =
    understanding &&
    understanding.missing.every((field) => field === 'location') &&
    displayName.trim().length > 0 &&
    resolvedLocation;

  if (understanding) {
    const profile = understanding.profile;
    return (
      <View style={styles.container}>
        <Card style={{ backgroundColor: palette.accentSoft }}>
          <AppText variant="body-small" weight="800" tone="accent">
            AIRME 已整理
          </AppText>
          <AppText variant="title" weight="800">
            這是我理解的你
          </AppText>
          <AppText tone="muted">
            請確認後再儲存；剛才輸入的原始自我描述不會寫入裝置。
          </AppText>
        </Card>

        <Card>
          <SummaryRow label="裝置暱稱" value={displayName.trim()} />
          <SummaryRow label="年齡層" value={AGE_LABEL[profile.ageGroup]} />
          <SummaryRow label="通勤" value={COMMUTE_LABEL[profile.commuteMode]} />
          <SummaryRow
            label="空品敏感條件"
            value={
              profile.sensitiveConditions.length
                ? profile.sensitiveConditions.map((item) => CONDITION_LABEL[item]).join('、')
                : '未提及'
            }
          />
          <SummaryRow
            label="常見活動"
            value={
              profile.commonActivities?.length
                ? profile.commonActivities.map((item) => ACTIVITY_LABEL[item]).join('、')
                : '未提及'
            }
          />
          <SummaryRow label="常用區域" value={resolvedLocation?.name ?? '尚未完成'} />
        </Card>

        {understanding.missing.some((field) => field !== 'location') ? (
          <Card style={{ backgroundColor: palette.warningSoft }}>
            <AppText weight="800">還需要補一句</AppText>
            <AppText>
              {understanding.missing.includes('ageGroup') ? '請在描述中加入年齡或年齡層。' : ''}
              {understanding.missing.includes('commuteMode') ? '請在描述中加入最常用的通勤方式。' : ''}
            </AppText>
          </Card>
        ) : null}

        {!understanding.location ? (
          <Card>
            <AppText variant="title-small" weight="800">
              輸入常用區域座標
            </AppText>
            <AppText variant="body-small" tone="muted">
              只保存區域級座標到三位小數，不需要住址。可從地圖長按位置查看座標。
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
          <AppButton
            label={submitting ? '正在建立個人檔案' : '確認並建立我的 AirMe'}
            onPress={() => {
              if (!complete) return;
              onSubmit({
                profile,
                location: resolvedLocation,
                deviceProfile: { displayName: displayName.trim() },
              });
            }}
            disabled={!complete}
            loading={submitting}
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
          不需要 Email、密碼、學號或病歷。日後可自行建立帳號，但不會自動上傳這份設定或活動紀錄。
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
            請包含年齡、通勤方式、常見活動、空品敏感狀況與常用區域。
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
        </View>
        <AppButton
          label="讓 AirMe 整理我的設定"
          onPress={() => setUnderstanding(parseProfileDescription(description))}
          disabled={displayName.trim().length === 0 || description.trim().length < 8}
        />
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
