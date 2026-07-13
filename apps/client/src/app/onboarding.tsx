import { useRouter, type Href } from 'expo-router';

import { ProfileForm } from '../components/profile-form';
import { AppText } from '../components/ui/app-text';
import { Screen } from '../components/ui/screen';
import { useApp } from '../state/app-provider';

export default function OnboardingScreen() {
  const app = useApp();
  const router = useRouter();
  return (
    <Screen maxWidth={760}>
      <AppText variant="body-small" tone="accent" weight="800">
        AIRME · 第一次設定
      </AppText>
      <AppText variant="display" weight="900">
        讓每次活動建議更貼近你，也只保留必要資料。
      </AppText>
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
