import { Redirect, useRouter, type Href } from 'expo-router';
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

  if (!app.hydrated) return null;
  if (!app.account) return <Redirect href={'/account' as Href} />;

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
          你的帳號已驗證；設定可先略過，之後可從「我的 AirMe」補上。確認結構化結果後，原始自我描述不會被保存。
        </AppText>
      </View>
      <ProfileForm
        submitting={app.busy}
        analyzing={app.busy}
        initialName={app.local.deviceProfile?.displayName}
        onAnalyze={app.understandProfile}
        onSkip={async () => {
          await app.skipOnboarding();
          router.replace('/' as Href);
        }}
        onSubmit={async (value) => {
          await app.saveOnboarding(value);
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
