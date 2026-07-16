# AirMe App／Web

同一套 Expo Router + TypeScript client 輸出 iOS、Android 與 Web。預設 `DEMO` 模式可以離線重播完整競賽流程；`LIVE` 模式只透過 `backend` 呼叫外部服務。

## 已實作

- 輸入優先的免登入裝置個人檔案、version 1 → 2 本機資料 migration 與資料清除。
- 今日環境摘要、活動自然語言輸入、可見的結構化理解、單一澄清、確認與行動卡。
- 資料來源、觀測／發布時間、fixture／live／partial／stale 狀態。
- 受限追問、醫療／離題／緊急情境處理。
- 五秒回饋（是否進行、不舒服程度、建議是否有幫助）與最多 20 筆整合式 Air 日誌，原始自我描述及當下狀況不寫入歷史。
- 安全路線頁：起終點不持久化、出發地環境判斷、外部地圖交接與資料不足聲明。
- 手機與桌面 responsive layout：手機首屏優先活動輸入，桌面保留環境／輸入雙欄；淺綠白固定亮色主題、鍵盤 focus 與至少 44pt 觸控目標。
- AirMe 原創 icon、splash、favicon 與繁體中文 Web metadata。

## 前端視覺與導覽

- `#F4FBF7` 背景、白色內容面、`#237A50` 主綠、`#DDF4E7` 淺綠與 `#173B2A` 文字組成固定亮色主題。
- 共用柔和圓角、1px 邊框、輕量陰影、大留白與膠囊控制項，不依平台建立第二套 UI。
- 900px 以上 Web 使用上方導覽；手機與窄版 Web 使用安全區內的底部導覽。
- 個人檔案、今日、行動卡、追問、回饋、Air 日誌、路線與設定使用相同資訊層級與狀態語言。

裝置暱稱、個人設定、歷史與回饋使用 AsyncStorage，只保存在裝置端；個人描述原稿與路線起終點只留在當次 UI 記憶體。前端不直接呼叫量界智算、環境部、中央氣象署或 PostgreSQL。

## 執行

從 repository 根目錄：

```bash
npm ci
npm run start --workspace airme
```

也可使用：

```bash
npm run web --workspace airme
npm run ios --workspace airme
npm run android --workspace airme
```

## 驗證

```bash
npm run test --workspace airme
npm run lint --workspace airme
npm run typecheck --workspace airme
npm run build:web --workspace airme
```

`build:web` 產生 `app/dist/`。Web static export、直接網址 hydration 與自動化 UI 流程已驗證；實體 iOS／Android 尚未驗證。前端預設 API timeout 為 22 秒，可由 `EXPO_PUBLIC_API_TIMEOUT_MS` 覆寫。

## 設定

- `EXPO_PUBLIC_API_BASE_URL`：本機或 Coolify HTTPS API 的 `/api` base URL。Coolify Web image 以同源 `/api` build。
- `EXPO_PUBLIC_API_TIMEOUT_MS`：前端逾時毫秒數。

所有 `EXPO_PUBLIC_*` 都會進入 App／Web bundle，不得放 secret。預設 Demo fixture 不需要任何環境變數；LIVE 只有在使用者明確切換後才呼叫 API。

## 主要路徑

- `app/`：Expo Router 頁面與 layout。
- `src/state/`：裝置端狀態與產品流程。
- `src/demo/`：明確標示的離線 fixture。
- `src/api/`：共用契約驗證的 API client。
- `src/components/`：設計系統與產品元件。

部署與外部服務限制見 [部署計畫](../docs/deployment.md) 與 [系統架構](../docs/architecture.md)。
