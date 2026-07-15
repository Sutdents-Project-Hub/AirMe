# AirMe Node.js API

可信任後端邊界：標準化政府資料、執行官方規則、呼叫量界智算、驗證 JSON 輸出、簽發短效追問情境 token，並向 App／Web 回傳穩定契約。API 使用 Node.js 22、Fastify 與 PostgreSQL，為 Coolify container deployment 設計。

## Endpoints

| Method | Route | 行為 |
|---|---|---|
| `GET` | `/api/health` | 服務／必要資料庫摘要，不洩漏設定或 provider 細節 |
| `GET` | `/api/environment` | AQI／天氣、來源、時間與降級狀態 |
| `POST` | `/api/activity-intents` | 不持久化的活動意圖擷取；只回一個最重要澄清問題 |
| `POST` | `/api/recommendations` | 規則底線 + 量界／fixture AI + 結構化行動卡 |
| `POST` | `/api/follow-ups` | 原情境內追問；固定拒答／緊急處理 |

輸入與輸出由 `packages/contracts` 的 Zod schema 驗證。已確認的活動強度會送入規則引擎，模型輸出不得降低程式規則風險。活動文字只在請求記憶體處理；provider 錯誤、stack trace、endpoint 與 secret 不會出現在公開回應。

## 本機執行

從 repository 根目錄：

```bash
npm ci
AI_MODE=fixture DATABASE_REQUIRED=false npm run start --workspace airme-api
```

此模式監聽 `http://localhost:3000`，不需要 PostgreSQL 或 API key。正式 Compose 會先執行 migration，再以 `AI_MODE=live` 啟動。

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

## PostgreSQL

`database/migrations/001-operational-data.sql` 建立公開環境快取與匿名技術事件 table。執行：

```bash
npm run build --workspace airme-api
DATABASE_URL=postgresql://... npm run db:migrate --workspace airme-api
```

資料庫不保存個人設定、活動文字、症狀、回饋、完整 prompt、context token 或模型完整輸出。詳見 [資料與儲存](../docs/data-and-storage.md)。

## 容器

`Dockerfile` 會建置 shared contracts 與 API，container command 先跑 migration 再啟動 Fastify。根目錄 [docker-compose.yml](../docker-compose.yml) 是 Coolify 的三服務定義；部署程序見 [部署計畫](../docs/deployment.md)。
