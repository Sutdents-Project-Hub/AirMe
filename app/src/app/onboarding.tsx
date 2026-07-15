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
        <View style={[styles.eyebrow, { backgroundColor: palette.accentSoft }]}>
          <AppText variant="body-small" weight="900" tone="accent">
            建立我的 AirMe
          </AppText>
        </View>
        <AppText variant="display" weight="900">
          一句話，讓 AirMe{`\n`}先理解你的日常。
        </AppText>
        <AppText tone="muted">
          免登入、免填表格；確認結構化結果後，原始自我描述不會被保存。
        </AppText>
      </View>
      <ProfileForm
        submitting={app.busy}
        initialName={app.local.deviceProfile?.displayName}
        onSubmit={async ({ profile, location, deviceProfile }) => {
          await app.saveOnboarding(profile, location, deviceProfile);
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
