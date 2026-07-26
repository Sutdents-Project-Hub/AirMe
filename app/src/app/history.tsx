import { Redirect, type Href, useRouter } from 'expo-router';
import { AppHeader } from '../components/app-header';
import { HistoryList } from '../components/history-list';
import { PageShell } from '../components/page-shell';
import { PageHero } from '../components/ui/page-hero';
import { Screen } from '../components/ui/screen';
import { useApp } from '../state/app-provider';

export default function HistoryScreen() {
  const app = useApp();
  const router = useRouter();
  if (app.hydrated && !app.account) {
    return <Redirect href={'/account' as Href} />;
  }
  if (app.hydrated && !app.local.onboardingCompleted) {
    return <Redirect href={'/onboarding' as Href} />;
  }
  return (
    <PageShell>
      <Screen maxWidth={860}>
        <AppHeader />
        <PageHero
          eyebrow="我的 Air 日誌"
          title={<>活動、環境與感受，{`\n`}留成自己的脈絡。</>}
          description="摘要與主觀回饋會先保存在這台裝置；後端啟用帳號同步時會加密同步。AirMe 不宣稱環境與感受之間的醫療因果。"
        />
        <HistoryList
          items={app.local.history}
          feedback={app.local.feedback}
          onCreateRecommendation={() => router.replace('/' as Href)}
          onSubmitFeedback={app.submitFeedback}
        />
      </Screen>
    </PageShell>
  );
}
