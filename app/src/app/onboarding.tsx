import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ProfileForm } from '../components/profile-form';
import { AppText } from '../components/ui/app-text';
import { Screen } from '../components/ui/screen';
import { radii, spacing, usePalette } from '../design/tokens';
import { useApp } from '../state/app-provider';

export default function OnboardingScreen() {
  const app = useApp();
  const palette = usePalette();
  const router = useRouter();
  return (
    <Screen maxWidth={920}>
      <View style={styles.hero}>
        <View style={[styles.eyebrow, { backgroundColor: palette.coral, borderColor: palette.ink }]}>
          <AppText variant="body-small" weight="900" style={{ color: palette.surface }}>
            AIRME · 第一次設定
          </AppText>
        </View>
        <AppText variant="display" weight="900">
          只留必要資訊，{`\n`}讓建議更貼近你。
        </AppText>
        <AppText tone="muted">
          五個小步驟完成個人化；不需要姓名、學號或醫療診斷。
        </AppText>
      </View>
      <ProfileForm
        submitting={app.busy}
        onSubmit={async ({ profile, location }) => {
          await app.saveOnboarding(profile, location);
          router.replace('/' as Href);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.md, maxWidth: 760 },
  eyebrow: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
