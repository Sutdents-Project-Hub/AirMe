import { expect, test } from '@playwright/test';

test('requires an account before allowing access to the personal AirMe flow', async ({ page }) => {
  for (const path of ['/', '/onboarding', '/routes', '/history', '/settings', '/recommendation']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByText('先登入，')).toBeVisible();
  }
  await expect(page.getByRole('tab', { name: '建立帳號' })).toBeVisible();
});

test('fixture demo completes the personal air-safety journey without a backend', async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('airme.auth-session-token.v1', 'fixture-auth-session-token-for-e2e');
  });
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ account: { id: '8de274bc-7161-4f07-8e26-7bded5144c12', email: 'fixture@example.com', displayName: '示範同學', createdAt: '2026-07-21T00:00:00.000Z' }, expiresAt: '2026-07-22T00:00:00.000Z' }),
    });
  });
  await page.goto('/');

  await expect(page.getByText('建立我的 AirMe')).toBeVisible();
  await page.getByLabel('希望 AirMe 怎麼稱呼你？').fill('測試同學');
  await page.getByLabel('個人日常描述').fill('我 15 歲，平常騎單車到高科大第一校區，鼻子容易受空品影響，放學會跑步。');
  await page.getByRole('button', { name: '讓 AirMe 整理我的設定' }).click();
  await expect(page.getByText('這是我理解的你')).toBeVisible();
  await page.getByRole('button', { name: '確認並建立我的 AirMe' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('118', { exact: true })).toBeVisible();
  await expect(page.getByText('決賽示範').first()).toBeVisible();
  await page.getByLabel('描述你的活動').fill('今天下午四點想在操場全力跑 1600 公尺，大約 30 分鐘，鼻子有點塞');
  await page.getByRole('button', { name: '先看看 AirMe 理解了什麼' }).click();
  await expect(page.getByText('先確認活動，再產生建議')).toBeVisible();
  await page.getByRole('button', { name: '確認，產生我的行動卡' }).click();

  await expect(page).toHaveURL(/\/recommendation$/);
  await expect(page.getByText('AIRME ACTION PLAN')).toBeVisible();
  await expect(page.getByText('風險偏高')).toBeVisible();
  const followUp = page.getByLabel('針對這張行動卡追問');
  await followUp.fill('我是不是氣喘，該吃什麼藥？');
  await page.getByRole('button', { name: '送出追問' }).click();
  await expect(page.getByText('安全邊界提醒')).toBeVisible();
  await expect(page.getByText(/AirMe 不能診斷、建議用藥或判定症狀原因/)).toBeVisible();
  await followUp.fill('我呼吸很困難，還能繼續跑嗎？');
  await page.getByRole('button', { name: '送出追問' }).click();
  await expect(page.getByText('立即安全提醒')).toBeVisible();
  await expect(page.getByText(/請立即停止活動並到安全處休息/)).toBeVisible();

  await page.getByRole('button', { name: '活動完成：是' }).click();
  await page.getByRole('button', { name: '活動後不舒服程度：沒有' }).click();
  await page.getByRole('button', { name: '建議是否有幫助：有' }).click();
  await page.getByRole('button', { name: '儲存活動回饋' }).click();
  await expect(page.getByText('回饋已保存在這台裝置')).toBeVisible();

  await page.getByRole('button', { name: 'Air 日誌' }).click();
  await expect(page).toHaveURL(/\/history$/);
  await expect(page.getByText('我的 Air 日誌')).toBeVisible();
  await expect(page.getByRole('heading', { name: '跑步 · 今天下午四點 · 30 分鐘' })).toBeVisible();
  await page.getByRole('button', { name: '查看 跑步 · 今天下午四點 · 30 分鐘 詳細資訊' }).click();
  await expect(page.getByText('已進行活動')).toBeVisible();
});
