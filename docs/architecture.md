# AirMe 技術與 VPS 架構

## 1. 技術選型

- `app`：React Native + Expo Router + TypeScript，單一專案輸出 iOS、Android 與 Web。
- `backend`：Node.js 22 + Fastify + TypeScript，作為唯一可信任後端。
- `packages/contracts`：Zod runtime schema 與前後端共用型別。
- 部署：自有 VPS 上的 Coolify，使用 repository 根目錄 Compose 建立 Web、API、PostgreSQL。
- AI：量界智算的 OpenAI 相容 Chat Completions API。
- 資料庫：PostgreSQL，只保存共享環境快取與匿名技術事件。

Expo 仍適合決賽的單一跨平台產品；Fastify 讓 API 在 VPS 容器中以固定 port 常駐。這不會把 AI 或政府 API key 移進前端。

`app/`、`backend/` 與 `packages/contracts/` 是固定 npm workspace component roots；manifest 直接位於各 component 根目錄。後續不增加 project-name、framework-name 或其他分類包層。

## 2. 元件邊界

### `app`

- 唯一產品前端，負責 UI、裝置端個人設定、回饋與離線 fixture。
- Web image 以 Nginx 提供靜態輸出，並把 `/api/*` 反向代理到 API container。
- 不持有 API key、資料庫帳密或任何伺服器端秘密。
- 個人設定、回饋與歷史仍只保留在裝置端。

### `backend`

- 驗證輸入、取得環境資料、套用官方規則、呼叫量界智算、驗證模型輸出與簽發短效追問 token。
- Fastify 以 `/api` 路由提供 API；不回傳 provider body、stack trace 或秘密。
- migration 由 `npm run db:migrate --workspace airme-api` 執行；容器啟動時會先執行 migration。
- 對 PostgreSQL 的存取只限環境快取、`service_events` 技術事件與 readiness check。

### `packages/contracts`

- 定義個人設定、粗略地點、環境來源、行動卡、追問、錯誤、回饋與歷史紀錄的 runtime schema。
- 由 App 與 API 共同使用，避免只共享 TypeScript 型別卻在 runtime 接受無效資料。

## 3. Coolify P0 拓樸

```mermaid
flowchart LR
  User["App／Web 使用者"] -->|HTTPS| Web["Coolify web：Nginx／Expo static"]
  Web -->|"/api reverse proxy"| Api["Coolify api：Node 22／Fastify"]
  Api --> Guard["輸入驗證／領域守門"]
  Guard --> Env["環境資料正規化"]
  Env --> Moenv["環境部 AQI"]
  Env --> Cwa["中央氣象署"]
  Guard --> Rules["官方規則安全底線"]
  Env --> Ai["量界智算 Chat Completions"]
  Rules --> Ai
  Ai --> Validate["JSON／Schema／安全後處理"]
  Api <--> Pg["PostgreSQL：快取／匿名技術事件"]
  Validate --> Web
```

Web 的正式 build 以 `EXPO_PUBLIC_API_BASE_URL=/api` 產生。瀏覽器請求因此使用同源，不須暴露 API container port 或設定 Web 的 CORS。原生 App 不具同源情境，最後打包時必須把 `EXPO_PUBLIC_API_BASE_URL` 設為 HTTPS 公開網域的 `/api`；這個值不是秘密。

## 4. 資料流與安全界線

1. Client 以共用 schema 建立 `RecommendationRequest`，只傳當次推論需要的活動、粗略地點與受控 profile 標籤。
2. API 驗證欄位、長度、列舉與座標精度，然後進行領域／醫療／緊急守門。
3. API 取得 AQI、天氣；PostgreSQL 先提供可用快取，外部成功回應才覆寫快取。
4. 程式規則依環境、活動強度與敏感標籤建立不可降低的 risk floor。
5. 量界 adapter 以 `POST /v1/chat/completions`、Bearer key、可設定模型與 JSON object 請求產生草稿。
6. API 以 Zod 驗證草稿、禁止醫療因果，並以程式規則強制最小風險；失敗時改用清楚標示的 fixture 安全降級。
7. API 不保存 request body、個人 profile、活動文字、回饋、context token 或模型完整回應；只寫入快取與匿名技術事件。

## 5. PostgreSQL schema

`backend/database/migrations/001-operational-data.sql` 建立：

| Table | 內容 | 明確不保存 |
|---|---|---|
| `environment_cache` | 粗略座標 key、標準化 AQI／天氣 JSON、取得時間 | 使用者 ID、活動、個人條件、精確地址 |
| `service_events` | 隨機 request ID、route、status code、duration、建立時間 | IP、request／response body、prompt、模型輸出、錯誤原文 |

所有 migration 都是版本化 SQL；`schema_migrations` 防止重複執行。決賽正式環境先採單一 API replica，避免多個 container 同時進行第一次 migration；之後再擴容前需加入 migration lock 與連線池容量評估。

## 6. API 契約

| Method | Route | 說明 |
|---|---|---|
| `GET` | `/api/health` | 不回傳配置的 API／資料庫 readiness |
| `GET` | `/api/environment` | AQI、天氣、來源、時間與降級狀態 |
| `POST` | `/api/recommendations` | 規則底線 + AI／fixture 行動卡 |
| `POST` | `/api/follow-ups` | 原情境內追問；離題、醫療與緊急固定處理 |

公開錯誤固定使用 `{ error: { code, message, retryable, requestId } }`。重要代碼為 `INVALID_REQUEST`、`OUT_OF_SCOPE`、`MEDICAL_BOUNDARY`、`URGENT_SAFETY`、`CONTEXT_EXPIRED` 與 `INTERNAL_ERROR`。

## 7. 執行與部署契約

- 本機與 container runtime：Node.js 22。
- API build：`npm run build --workspace airme-api`；啟動：`npm run start --workspace airme-api`。
- migration：`npm run db:migrate --workspace airme-api`。
- Web build：`npm run build:web --workspace airme`，輸出 `app/dist/`。
- Coolify：匯入根目錄 `docker-compose.yml`，公開網域設定到 `web:80`。
- `api` 只以 Compose internal network 暴露 `3000`，避免資料庫與 API port 直接公開。

## 8. 尚未驗證的外部條件

- VPS 的作業系統、Coolify 版本、反向代理、TLS、網域與防火牆。
- 量界智算指定模型對 JSON mode 的實際支援、額度、429 與延遲。
- 真實環境部／中央氣象署欄位、額度與 attribution。
- PostgreSQL 容器首次啟動、備份、restore 與磁碟容量。
- iOS／Android 最終安裝形式與原生 App 的 HTTPS API 網域。
