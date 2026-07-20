# AirMe Node.js API

可信任後端邊界：標準化政府資料、執行官方規則、呼叫量界智算、驗證 JSON 輸出、簽發短效追問情境 token、處理可選帳號 session，以及轉送地點／路線請求，並向 App／Web 回傳穩定契約。API 使用 Node.js 22、Fastify 與 PostgreSQL，為 Coolify container deployment 設計。

## Endpoints

| Method | Route | 行為 |
|---|---|---|
| `GET` | `/api/health` | 服務／必要資料庫摘要，不洩漏設定或 provider 細節 |
| `POST` | `/api/environment` | request body 內的粗略地點對應 AQI／天氣、來源、時間與降級狀態 |
| `POST` | `/api/activity-intents` | 不持久化的活動意圖擷取；只回一個最重要澄清問題 |
| `POST` | `/api/recommendations` | 規則底線 + 量界／fixture AI + 結構化行動卡 |
| `POST` | `/api/follow-ups` | 原情境內追問；固定拒答／緊急處理 |
| `POST` | `/api/auth/register` | 建立可選帳號，保存 scrypt password hash 並簽發 session |
| `POST` | `/api/auth/login` | 驗證帳密並簽發 session；失敗訊息不洩漏帳號是否存在 |
| `GET` | `/api/auth/session` | 驗證 Bearer session |
| `POST` | `/api/auth/logout` | 撤銷當前 session |
| `DELETE` | `/api/auth/account` | 刪除帳號與所有 server session；不刪除裝置端資料 |
| `POST` | `/api/geocoding/search` | 轉送至已部署 Photon 的台灣地點搜尋 |
| `POST` | `/api/routes` | 轉送至已部署 Valhalla 的路線選項 |

輸入與輸出由 `packages/contracts` 的 Zod schema 驗證。已確認的活動強度會送入規則引擎，模型輸出不得降低程式規則風險；未支持的歷史／百分比事實、安全保證與規則衝突都會引發安全降級。活動文字只在請求記憶體處理；provider 錯誤、stack trace、endpoint 與 secret 不會出現在公開回應。

## 本機執行

從 repository 根目錄：

```bash
npm ci
AI_MODE=fixture DATABASE_REQUIRED=false npm run start --workspace airme-api
```

此模式監聽 `http://localhost:3000`，不需要 PostgreSQL 或 API key。正式 Compose 會先執行 migration，再以 `AI_MODE=live` 啟動。

要在本機 Compose 驗證真實量界 AI，請將 `AI_MODE=live`、`LIANGJIE_AI_BASE_URL`、`LIANGJIE_AI_MODEL`、`LIANGJIE_AI_API_KEY` 放在另一個已忽略的本機 env 檔，並以兩個 env 檔啟動：

```bash
docker compose --env-file .env.local --env-file .env.ai.local -f docker-compose.yml -f docker-compose.local.yml up --build -d
```

預設 `docker-compose.local.yml` 維持 fixture，避免未設定額外 env 檔時意外呼叫外部 AI。

## 驗證

```bash
npm run test --workspace airme-api
npm run typecheck --workspace airme-api
npm run build --workspace airme-api
npm run evaluate --workspace airme-api
```

評估資料位於 `evaluation/cases.json`，涵蓋 30 個正常、敏感、資料品質、醫療、緊急、離題與提示注入案例。

## 執行模式與設定

- `AI_MODE=fixture`：本機可重播結果，不呼叫外部 AI；`DATABASE_REQUIRED=false` 可省略 PostgreSQL。
- `AI_MODE=live`：使用量界 OpenAI 相容 Chat Completions；需 `LIANGJIE_AI_MODEL`、`LIANGJIE_AI_API_KEY`、`CONTEXT_SIGNING_SECRET` 與資料庫。
- `LIANGJIE_AI_BASE_URL`：預設 `https://liangjiewis.com`；`LIANGJIE_AI_JSON_MODE` 預設 `auto`，模型拒絕 JSON mode 時會對 400／404／422 自動重試一次不帶該參數，並始終以 Zod 驗證回應。
- `DATABASE_URL`，或 `DATABASE_HOST`、`DATABASE_PORT`、`DATABASE_NAME`、`DATABASE_USER`、`DATABASE_PASSWORD`：PostgreSQL 連線。
- `MOENV_API_KEY`、`CWA_API_KEY`：只存後端本機忽略檔或 Coolify secret。
- `ALLOWED_ORIGINS`：正式原生 App／跨網域 Web 不可使用萬用 `*`。
- `REQUEST_TIMEOUT_MS`、`CONTEXT_TTL_SECONDS`：timeout 與短效 HMAC context token。
- `AI_MAX_REQUESTS_PER_MINUTE`、`AI_MAX_CONCURRENCY`：每個 API process 的 AI 啟動頻率與同時數上限，預設 60／分鐘、同時 4 個。
- `ENVIRONMENT_MAX_REQUESTS_PER_MINUTE`、`ENVIRONMENT_MAX_CONCURRENCY`：環境查詢與政府 API 額度保護，預設 120／分鐘、同時 8 個。
- `AUTH_SESSION_HMAC_SECRET`、`AUTH_SESSION_TTL_SECONDS`：帳號 session token 的 HMAC digest secret 與壽命。live 模式需使用至少 32 bytes 且不同於其他 secret 的值。
- `VALHALLA_ROUTE_URL`、`PHOTON_SEARCH_URL`：自架 route／geocoding 服務的 internal URL；未部署時請維持 safe unavailable，而非改用未經同意的公共 routing server。
- `ROUTING_MAX_REQUESTS_PER_MINUTE`、`ROUTING_MAX_CONCURRENCY`：地點搜尋與路線的 per-process 防護。
- `CONTEXT_SIGNING_SECRET` 設定值少於 32 bytes 時 API 拒絕啟動。

## PostgreSQL

`database/migrations/001-operational-data.sql` 建立公開環境快取與匿名技術事件；`002-accounts.sql` 建立最小化帳號與 session table。執行：

```bash
npm run build --workspace airme-api
DATABASE_URL=postgresql://... npm run db:migrate --workspace airme-api
```

資料庫不保存裝置端個人設定、活動文字、症狀、回饋、完整 prompt、context token、模型完整輸出、精確路線或原始 session token。帳號資料僅有 Email、顯示名稱、password hash 與 session digest。詳見 [資料與儲存](../docs/data-and-storage.md)。

## 容器

`Dockerfile` 會建置 shared contracts 與 API，runtime 只安裝 contracts／backend production dependencies，以 `node` 非 root 使用者執行；container command 先跑 migration 再啟動 Fastify。根目錄 [docker-compose.yml](../docker-compose.yml) 是 Coolify 的三服務定義；部署程序見 [部署計畫](../docs/deployment.md)。
