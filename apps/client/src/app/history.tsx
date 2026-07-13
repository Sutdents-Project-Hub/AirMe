import { Redirect, type Href } from 'expo-router';

import { AppHeader } from '../components/app-header';
import { HistoryList } from '../components/history-list';
import { PageShell } from '../components/page-shell';
import { AppText } from '../components/ui/app-text';
import { Screen } from '../components/ui/screen';
import { useApp } from '../state/app-provider';

export default function HistoryScreen() {
  const app = useApp();
  if (app.hydrated && !app.local.onboardingCompleted) {
    return <Redirect href={'/onboarding' as Href} />;
  }
  return (
    <PageShell>
      <Screen maxWidth={860}>
        <AppHeader demoMode={app.local.demoMode} />
        <AppText variant="display" weight="900">
          我的活動紀錄
        </AppText>
        <AppText tone="muted">
          只保存去識別化摘要與主觀回饋，不宣稱環境與感受之間的醫療因果。
        </AppText>
        <HistoryList items={app.local.history} />
      </Screen>
    </PageShell>
  );
}
