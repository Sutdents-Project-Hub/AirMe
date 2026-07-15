import type { Location, Profile } from '@airme/contracts';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing, usePalette } from '../design/tokens';
import { AppButton } from './ui/app-button';
import { AppText } from './ui/app-text';
import { Card } from './ui/card';
import { Chip } from './ui/chip';

const LOCATIONS: Location[] = [
  { name: '高科大第一校區周邊', latitude: 22.754, longitude: 120.335 },
  { name: '高科大建工校區周邊', latitude: 22.651, longitude: 120.328 },
  { name: '高雄市前鎮區', latitude: 22.6, longitude: 120.31 },
];

interface ProfileFormProps {
  onSubmit: (value: { profile: Profile; location: Location }) => void;
  submitting: boolean;
}

export function ProfileForm({ onSubmit, submitting }: ProfileFormProps) {
  const palette = usePalette();
  const [ageGroup, setAgeGroup] = useState<Profile['ageGroup'] | null>(null);
  const [sensitive, setSensitive] = useState<Profile['sensitiveConditions']>([]);
  const [commuteMode, setCommuteMode] = useState<Profile['commuteMode'] | null>(null);
  const [activities, setActivities] = useState<NonNullable<Profile['commonActivities']>>([]);
  const [location, setLocation] = useState<Location | null>(null);

  const toggleSensitive = (value: Profile['sensitiveConditions'][number]) => {
    setSensitive((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };
  const toggleActivity = (value: NonNullable<Profile['commonActivities']>[number]) => {
    setActivities((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const complete = () => {
    if (!ageGroup || !commuteMode || !location) return;
    onSubmit({
      profile: { ageGroup, sensitiveConditions: sensitive, commuteMode, commonActivities: activities },
      location,
    });
  };

  return (
    <View style={styles.container}>
      <Card
        pattern="dots"
        patternColor={palette.ink}
        style={{ backgroundColor: palette.teal, borderColor: palette.ink }}>
        <AppText variant="title-small" weight="700">
          只留下真正會影響建議的資料
        </AppText>
        <AppText variant="body-small" style={{ color: palette.ink }}>
          這些設定只保存在這台裝置；AirMe 不收集姓名、學號、聯絡方式或醫療診斷。
        </AppText>
      </Card>

      <Field step="STEP 01" title="你的年齡層" hint="用來套用適齡的活動安全提醒">
        <Chip
          label="13–18 歲"
          selected={ageGroup === 'teen'}
          onPress={() => setAgeGroup('teen')}
          accessibilityLabel="年齡層：13–18 歲"
        />
        <Chip
          label="18 歲以上"
          selected={ageGroup === 'adult'}
          onPress={() => setAgeGroup('adult')}
          accessibilityLabel="年齡層：18 歲以上"
        />
      </Field>

      <Field step="STEP 02" title="空品敏感條件（可複選）" hint="不需要輸入病名或症狀細節">
        <Chip
          label="呼吸道較敏感"
          selected={sensitive.includes('respiratory-sensitive')}
          onPress={() => toggleSensitive('respiratory-sensitive')}
          accessibilityLabel="敏感條件：呼吸道較敏感"
        />
        <Chip
          label="心血管較敏感"
          selected={sensitive.includes('cardiovascular-sensitive')}
          onPress={() => toggleSensitive('cardiovascular-sensitive')}
          accessibilityLabel="敏感條件：心血管較敏感"
        />
        <Chip
          label="容易受過敏原影響"
          selected={sensitive.includes('allergy-sensitive')}
          onPress={() => toggleSensitive('allergy-sensitive')}
          accessibilityLabel="敏感條件：容易受過敏原影響"
        />
      </Field>

      <Field step="STEP 03" title="最常用的通勤方式">
        <Chip
          label="步行"
          selected={commuteMode === 'walk'}
          onPress={() => setCommuteMode('walk')}
          accessibilityLabel="通勤方式：步行"
        />
        <Chip
          label="單車"
          selected={commuteMode === 'bike'}
          onPress={() => setCommuteMode('bike')}
          accessibilityLabel="通勤方式：單車"
        />
        <Chip
          label="大眾運輸"
          selected={commuteMode === 'public-transit'}
          onPress={() => setCommuteMode('public-transit')}
          accessibilityLabel="通勤方式：大眾運輸"
        />
        <Chip
          label="機車"
          selected={commuteMode === 'scooter'}
          onPress={() => setCommuteMode('scooter')}
          accessibilityLabel="通勤方式：機車"
        />
      </Field>

      <Field step="STEP 04" title="常見活動（可複選）">
        <Chip
          label="慢跑"
          selected={activities.includes('run')}
          onPress={() => toggleActivity('run')}
          accessibilityLabel="常見活動：慢跑"
        />
        <Chip
          label="散步"
          selected={activities.includes('walk')}
          onPress={() => toggleActivity('walk')}
          accessibilityLabel="常見活動：散步"
        />
        <Chip
          label="球類"
          selected={activities.includes('ball-sports')}
          onPress={() => toggleActivity('ball-sports')}
          accessibilityLabel="常見活動：球類"
        />
      </Field>

      <Field
        step="STEP 05"
        title="常用地點"
        hint="只保存區域級、三位小數座標，不建立位置軌跡">
        {LOCATIONS.map((item) => (
          <Chip
            key={item.name}
            label={item.name}
            selected={location?.name === item.name}
            onPress={() => setLocation(item)}
            accessibilityLabel={`常用地點：${item.name}`}
          />
        ))}
      </Field>

      <AppButton
        label={submitting ? '正在儲存設定' : '完成設定'}
        accessibilityLabel={submitting ? '正在儲存設定' : '完成設定'}
        onPress={complete}
        disabled={!ageGroup || !commuteMode || !location}
        loading={submitting}
        variant="secondary"
      />
    </View>
  );
}

function Field({
  step,
  title,
  hint,
  children,
}: {
  step: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const palette = usePalette();
  return (
    <Card style={{ borderColor: palette.ink }}>
      <View style={styles.fieldHeading}>
        <View style={[styles.step, { backgroundColor: palette.coral, borderColor: palette.ink }]}>
          <AppText variant="caption" weight="900" style={{ color: palette.surface }}>
            {step}
          </AppText>
        </View>
        <AppText variant="title-small" weight="700">
          {title}
        </AppText>
        {hint ? (
          <AppText variant="body-small" tone="muted">
            {hint}
          </AppText>
        ) : null}
      </View>
      <View style={styles.chips}>{children}</View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xl },
  fieldHeading: { gap: spacing.sm },
  step: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    borderWidth: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
