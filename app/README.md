# AirMe App／Web

同一套 Expo Router + TypeScript client 輸出 iOS、Android 與 Web。預設 `DEMO` 模式可以離線重播完整競賽流程；`LIVE` 模式只透過 `backend` 呼叫外部服務。

## 已實作

- 必要 Email 帳號 session 作為產品入口；登入後可讓 AI 從一次性日常描述整理受控個人設定，也可略過後在設定頁補上。原稿不寫入裝置、雲端同步或 AirMe log；後端設定雲端同步金鑰後，才同步受控設定、粗略地點、日誌摘要與回饋。
- 今日環境摘要、活動自然語言輸入、可見的結構化理解、800 字內的多次補充、單一澄清、確認與行動卡。
- 資料來源、觀測／發布時間、fixture／live／partial／stale 狀態。
- 受限追問、醫療／離題／緊急情境處理。
- 五秒回饋（是否進行、不舒服程度、建議是否有幫助）與最多 20 筆整合式 Air 日誌；支援日期／風險篩選、詳情及同一筆回饋更新，原始自我描述及當下狀況不寫入歷史。
- 安全路線頁：起終點不持久化、Photon 地點搜尋、Valhalla 路線選項、MapLibre 預覽、起終點摘要、文字步驟、使用者主動開啟的 OpenStreetMap 路線交接與資料不足聲明；不宣稱街道級空品或 turn-by-turn 導航。
- 手機與桌面 responsive layout：手機首屏優先活動輸入，桌面保留環境／輸入雙欄；淺綠白固定亮色主題、鍵盤 focus 與至少 44pt 觸控目標。
- AirMe 原創 icon、splash、favicon 與繁體中文 Web metadata。

## 前端視覺與導覽

- `#F4FBF7` 背景、白色內容面、`#237A50` 主綠、`#DDF4E7` 淺綠與 `#173B2A` 文字組成固定亮色主題。
- 共用柔和圓角、1px 邊框、輕量陰影、大留白與膠囊控制項，不依平台建立第二套 UI。
- 900px 以上 Web 使用有選取指示的上方分段導覽；手機與窄版 Web 使用安全區內的底部導覽，不重複顯示兩套控制。
- 共用頁面以低幅度呼吸背景與淡入位移提示層級，系統開啟 reduced motion 時停用循環及進場動畫。
- 個人檔案、今日、行動卡、追問、回饋、Air 日誌、路線與設定使用相同資訊層級與狀態語言。

裝置暱稱、個人設定、歷史與回饋先使用 AsyncStorage；已登入且後端啟用同步時會以帳號 API 同步經 schema 限制的 snapshot。登入 token 在 iOS／Android 使用 Expo SecureStore，在 Web 只留於目前瀏覽器 tab 的 sessionStorage。個人描述原稿、追問 token 與路線起終點只留在當次 UI／API request 記憶體；在線個人描述會經後端送往量界，供應商處理依其服務政策。前端不直接呼叫量界智算、環境部、中央氣象署、Valhalla、Photon 或 PostgreSQL。

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
npm run test:e2e
```

`build:web` 產生 `app/dist/`。Web static export、直接網址 hydration 與 Desktop Chromium fixture E2E 已驗證；實體 iOS／Android 與真實 API 尚未驗證。前端預設 API timeout 為 22 秒，可由 `EXPO_PUBLIC_API_TIMEOUT_MS` 覆寫。

## 原生交付

`eas.json` 已準備三個不含秘密的交付 profile：`development` 供開發 client、`preview` 產生 Android APK 供內部安裝、`production` 產生 Android App Bundle，iOS 則使用 EAS 的 production archive 流程。實際 EAS 專案連結、Apple／Google 帳號、簽章與發佈仍由團隊帳號處理，尚未在本 repository 執行。

在已設定團隊 Expo／EAS 權限的環境，可從 `app/` 使用：

```bash
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest build --platform ios --profile production
```

## 設定

- `EXPO_PUBLIC_API_BASE_URL`：本機或 Coolify HTTPS API 的完整 `/api` base URL。Coolify Web 與 API 是獨立 Resource，例如 `https://api.example.com/api`；它必須在 Docker build 時設定。
- `EXPO_PUBLIC_API_TIMEOUT_MS`：前端逾時毫秒數。
- `EXPO_PUBLIC_MAP_STYLE_URL`：production MapLibre style URL；多 Resource 部署時必須是完整 HTTPS URL。自架建置見根目錄 `docker-compose.maps.yml` 與部署文件。Demo 可使用內建示範 style，不可視為 production 服務。

所有 `EXPO_PUBLIC_*` 都會進入 App／Web bundle，不得放 secret。新裝置預設使用 Live；使用者可在設定開啟明確標示的示範模式，該模式不需要任何 AI API key。MapLibre 原生地圖需要 Expo development build 或正式 build，不能在 Expo Go 中驗收。

## 主要路徑

- `app/`：Expo Router 頁面與 layout。
- `src/state/`：裝置端狀態與產品流程。
- `src/demo/`：明確標示的離線 fixture。
- `src/api/`：共用契約驗證的 API client。
- `src/components/`：設計系統與產品元件。

部署與外部服務限制見 [部署計畫](../docs/deployment.md) 與 [系統架構](../docs/architecture.md)。
