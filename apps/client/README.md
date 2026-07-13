# AirMe App／Web

同一套 Expo Router + TypeScript client 輸出 iOS、Android 與 Web。預設 `DEMO` 模式可以離線重播完整競賽流程；`LIVE` 模式只透過 `services/api` 呼叫外部服務。

## 已實作

- 初次設定與裝置端資料清除。
- 今日環境摘要、活動自然語言輸入與行動卡。
- 資料來源、觀測／發布時間、fixture／live／partial／stale 狀態。
- 受限追問、醫療／離題／緊急情境處理。
- 五秒回饋與最多 20 筆歷史紀錄。
- 手機與桌面 responsive layout、light／dark theme、鍵盤 focus 與 44pt 觸控目標。

個人設定、歷史與回饋使用 AsyncStorage，只保存在裝置端；前端不直接呼叫 Azure OpenAI、環境部或中央氣象署。

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

`build:web` 產生 `apps/client/dist/`。Web static export 與瀏覽器核心 Demo 已驗證；實體 iOS／Android 尚未驗證。

## 設定

- `EXPO_PUBLIC_API_BASE_URL`：本機或 Azure Functions 的 `/api` base URL。
- `EXPO_PUBLIC_API_TIMEOUT_MS`：前端逾時毫秒數。

所有 `EXPO_PUBLIC_*` 都會進入 App／Web bundle，不得放 secret。預設 Demo fixture 不需要任何環境變數；LIVE 只有在使用者明確切換後才呼叫 API。

## 主要路徑

- `app/`：Expo Router 頁面與 layout。
- `src/state/`：裝置端狀態與產品流程。
- `src/demo/`：明確標示的離線 fixture。
- `src/api/`：共用契約驗證的 API client。
- `src/components/`：設計系統與產品元件。

部署與外部服務限制見 [部署計畫](../../docs/deployment.md) 與 [系統架構](../../docs/architecture.md)。
