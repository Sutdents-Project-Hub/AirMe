import { Redirect, useRouter, type Href } from 'expo-router';
import { ProfileForm } from '../components/profile-form';
import { PageHero } from '../components/ui/page-hero';
import { Screen } from '../components/ui/screen';
import { useApp } from '../state/app-provider';

export default function OnboardingScreen() {
  const app = useApp();
  const router = useRouter();

  if (!app.hydrated) return null;
  if (!app.account) return <Redirect href={'/account' as Href} />;

  return (
    <Screen maxWidth={920}>
      <PageHero
        eyebrow="建立我的 AirMe"
        title={<>一句話，讓 AirMe{`\n`}先理解你的日常。</>}
        description="你的帳號已驗證；設定可先略過，之後可從「我的 AirMe」補上。確認結構化結果後，原始自我描述不會被保存。"
      />
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
