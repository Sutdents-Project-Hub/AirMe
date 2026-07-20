# Coolify／VPS 部署計畫

## 現況

部署目標為自有 VPS 的 Coolify。repository 已包含可部署的 `docker-compose.yml`、兩個 Dockerfile 與 PostgreSQL migration，但尚未建立 VPS、Coolify app、網域、production secret、備份或 production URL。

## 命名契約

- Repository／本機根資料夾：`AirMe`
- Project slug／Coolify project：`airme`
- 本機 Docker Compose project：`airme`（`docker-compose.yml` 頂層 `name: airme`）
- Coolify services：`airme-web`、`airme-api`、`airme-postgres`
- Compose services：`web`、`api`、`postgres`；不設定 `container_name`

## Compose 拓樸

| Service | Image／責任 | 網路與資料 |
|---|---|---|
| `web` | Nginx 提供 Expo Web 靜態檔，將 `/api` 代理到 `api` | Coolify 將公開網域指向 `web:80` |
| `api` | Node.js 22 + Fastify；先跑 migration 再啟動 | 僅 Compose internal network 的 `3000` |
| `postgres` | PostgreSQL 17；共享環境快取、匿名技術事件與最小化帳號／session 驗證資料 | 命名 volume `airme-postgres`，不公開 port |

Web 的 `EXPO_PUBLIC_API_BASE_URL` 在 Docker build 時固定為 `/api`。所以 Web 只需一個公開 HTTPS 網域；Nginx 會保留 `/api` 路徑轉送給 Fastify。

## 第一次部署步驟

1. 準備已安裝 Coolify 的 VPS，確認主機防火牆與 Coolify reverse proxy 能處理 80/443；這些主機操作不由此 repository 自動執行。
2. 在 Coolify 建立 **Docker Compose** application，來源選擇本 repository，Compose 路徑選 `docker-compose.yml`。
3. 在 app 的 Environment Variables 設定下列必填值；將 secret 類型標記為 secret／masked。
4. 將正式網域指向 service `web` 的 port `80`，開啟 TLS。不要公開 `api:3000` 或 `postgres:5432`。
5. 執行第一次 Deploy。`api` 會在啟動前執行 `npm run db:migrate`；`postgres` healthcheck 就緒後才允許 API 啟動。
6. 用公開網域驗證 `GET https://<your-domain>/api/health` 回應 `200` 與 `{"status":"ok","service":"airme-api"}`。
7. 先以 fixture 模式檢查 Web 與 API，再切換／驗證 live 量界與政府資料流程。不要把 fixture 結果口述為即時資料。

## Coolify 環境變數

| 變數 | 範例／用途 | 秘密 |
|---|---|---|
| `POSTGRES_DB` | `airme` | 否 |
| `POSTGRES_USER` | `airme` | 否 |
| `POSTGRES_PASSWORD` | PostgreSQL 強密碼 | 是 |
| `CONTEXT_SIGNING_SECRET` | 至少 32 bytes 的隨機字串 | 是 |
| `AUTH_SESSION_HMAC_SECRET` | 與其他 secret 不重複、至少 32 bytes 的隨機字串 | 是 |
| `AUTH_SESSION_TTL_SECONDS` | session 壽命，預設 30 天 | 否 |
| `LIANGJIE_AI_BASE_URL` | `https://liangjiewis.com` | 否 |
| `LIANGJIE_AI_MODEL` | 量界控制台中已驗證的 model ID | 否 |
| `LIANGJIE_AI_API_KEY` | 量界 token | 是 |
| `LIANGJIE_AI_JSON_MODE` | `auto`；不相容時改 `disabled` | 否 |
| `MOENV_API_KEY` | 環境部 key | 是 |
| `CWA_API_KEY` | 中央氣象署 key | 是 |
| `ALLOWED_ORIGINS` | 原生 App 或獨立 Web 的 HTTPS origin，逗號分隔 | 否 |
| `REQUEST_TIMEOUT_MS` | 預設 `8000` | 否 |
| `AI_MAX_REQUESTS_PER_MINUTE` | 每 API process 預設 `60` | 否 |
| `AI_MAX_CONCURRENCY` | 每 API process 預設同時 `4` 個 AI 作業 | 否 |
| `ENVIRONMENT_MAX_REQUESTS_PER_MINUTE` | 每 API process 預設 `120` 次環境查詢 | 否 |
| `ENVIRONMENT_MAX_CONCURRENCY` | 每 API process 預設同時 `8` 個環境查詢 | 否 |
| `VALHALLA_ROUTE_URL` | 已部署、僅 internal network 可達的 Valhalla `/route` URL | 否 |
| `PHOTON_SEARCH_URL` | 已部署、僅 internal network 可達的 Photon `/api/` URL | 否 |
| `ROUTING_MAX_REQUESTS_PER_MINUTE` | 每 API process 路線／搜尋啟動頻率上限 | 否 |
| `ROUTING_MAX_CONCURRENCY` | 每 API process 路線／搜尋同時數上限 | 否 |
| `CONTEXT_TTL_SECONDS` | 預設 `1800` | 否 |

Compose 會用資料庫的 `POSTGRES_*` 設定自動組成 API 連線。若改用 Coolify 獨立的 PostgreSQL service，請在 API 設定 `DATABASE_URL`，或完整提供 `DATABASE_HOST`、`DATABASE_PORT`、`DATABASE_NAME`、`DATABASE_USER`、`DATABASE_PASSWORD`；此時必須調整 Compose 的 `postgres` 服務與 `depends_on`，不要同時留下兩套不一致資料庫。

Compose 預設 `AI_MODE=live` 與 `DATABASE_REQUIRED=true`，但 `AI_MODE` 保留為環境變數，讓第一次部署可先在沒有 AI／政府 key 時以 fixture 驗證容器、migration 與同源 proxy。正式展示前必須明確切回 `AI_MODE=live`並驗證 provenance；不要把 fixture 設定誤帶到正式展示。

本 repository 的 Compose 固定只有 `web`、`api`、`postgres` 三項服務，**不會**自動下載台灣圖資或建立 Valhalla／Photon。若要在 production 啟用路線與地點搜尋，需由平台負責人另外以 internal network 部署並驗證兩項服務，再把上述 URL 指向它們；未完成前 API 會安全降級，不可把 Demo 地圖或外部地圖交接說成 live navigation。

API image 的 runtime 只安裝 contracts／backend production dependencies，並以 `node` 非 root 使用者執行。PostgreSQL Pool 含 5 秒連線 timeout、10 秒 query timeout 與 8 秒 statement timeout，避免資料庫不可用時無限卡住。

## 本機 Docker fixture 測試

`docker-compose.local.yml` 是本機覆蓋檔：它只把 API 切換為 fixture、停用政府 API key，並公開 `web:80` 到 `localhost:8080`。與主 Compose 合併後只會在 `airme` Compose project 建立 `web`、`api`、`postgres` 三個 containers；不會停止、重建或使用其他 Compose 專案的 containers。

```bash
cp .env.local.example .env.local
docker compose --env-file .env.local -f docker-compose.yml -f docker-compose.local.yml up --build -d
docker compose --env-file .env.local -f docker-compose.yml -f docker-compose.local.yml ps
```

測試網址是 `http://localhost:8080`，API health 是 `http://localhost:8080/api/health`。停止本機 AirMe stack 時使用同一組檔案執行 `down`；除非你刻意要清除 fixture 資料庫，否則不要加 `-v`。

## 原生 App 設定

Coolify Web 因同源可使用 `/api`。iOS／Android bundle 不可使用相對 URL，發布前需以非秘密的公開 API base URL 重建：

```bash
EXPO_PUBLIC_API_BASE_URL=https://<your-domain>/api npm run build:web --workspace airme
```

原生 App 的 EAS profile 已在 `app/eas.json` 準備：`development` 供開發 client、`preview` 產生 Android APK、`production` 產生 Android App Bundle 與 iOS archive。實際 EAS project、簽章、商店帳號與實機驗收仍未執行；上例只說明 Web bundle 的環境變數，不能取代原生發佈流程。

前端 `EXPO_PUBLIC_API_TIMEOUT_MS` 預設為 `22000`，覆蓋環境資料與 AI 串接的正常上限；依線上 P95 調整時必須同步 App Docker build arg 與元件 README。

`EXPO_PUBLIC_MAP_STYLE_URL` 是公開的 MapLibre style URL，不是 secret。Production 要提供可用、可歸屬且有用量策略的 style／tile provider；native MapLibre 需使用 Expo development build 或正式 build，不能以 Expo Go 驗收。

## 上線驗收與觀測

- `/api/health`：確認 API 及必要 PostgreSQL 連線；不要公開 `/api` container port。
- Web：檢查免登入個人檔案、註冊／登入／登出／刪除帳號、帳號刪除後本機資料仍由使用者控制、首頁理解確認、路線降級、Air 日誌、fixture／live 標籤、推薦、追問、回饋與資料清除。
- API：除既有 health／environment／recommendations／follow-ups 外，驗證 `POST /api/activity-intents` 不寫入 request body，帳號 token 不進 log，live／fixture provenance 正確。
- Maps：若已另行部署 Valhalla／Photon，驗證台灣搜尋、三種移動方式、timeout／限流／503 降級、MapLibre attribution，以及不顯示街道級 AQI、最低污染或 turn-by-turn 導航。
- Live：確認量界模型 ID、JSON output、429、timeout、無效輸出與 provider 失敗都不會洩漏 provider body。
- Abuse：驗證 32KB body 上限、malformed JSON、`AI_MAX_REQUESTS_PER_MINUTE`、`AI_MAX_CONCURRENCY` 與 429 UI。多 replica 部署前需再於 reverse proxy 或共用 store 加上全域 limiter。
- Data：確認環境部／中央氣象署來源、時間、stale 與 partial／fixture 狀態。
- Database：確認 `accounts`／`account_sessions` 僅含最小驗證資料，且未存原始 token；其他 table 不得有 activity text、裝置 profile、prompt、模型全文、精確路線或 IP。
- Server：repository 內 Nginx 已關閉 access log；用 Coolify logs 只看服務健康與錯誤分類，不將完整 request body 或 secret 寫入 log，並為外層 reverse proxy 的連線 IP 設定最短保存期與存取限制。

## 備份、回滾與維運

- 先在 Coolify 或 VPS 層建立 PostgreSQL volume 的排程備份，再宣稱正式資料庫可用；備份必須加密、限制存取並演練 restore。
- 保留上一次成功 Docker image／deployment。程式回滾可使用 Coolify 的既有版本；資料庫 migration 不可直接假設可逆，新的 migration 需先設計相容或 rollback SQL。
- `CONTEXT_SIGNING_SECRET` 輪替會使既有追問 token 失效，應在低流量時進行並接受使用者重新產生行動卡。
- `AUTH_SESSION_HMAC_SECRET` 輪替會使所有登入 session 失效；公告後安排使用者重新登入，並保持舊值不可回復的風險紀錄。
- 若量界、政府資料或資料庫不可用，切換清楚標示的 fixture Demo；不要以錯誤快取或 fixture 假裝 live。

## 尚未驗證

- 實際 Coolify / VPS / Docker 版本、網域、TLS、firewall、運算與磁碟資源。
- Coolify Compose 對 `depends_on` health condition 與 build args 的實際行為。
- 量界與政府 API 真實 key 的 quota、rate limit、JSON 相容性與服務條款。
- PostgreSQL 備份、restore、監控與 retention。
- Valhalla／Photon 台灣圖資建立、資源需求、更新週期、route quality、查詢額度與監控；Map style／tile provider 的 SLA、授權與 attribution。
- 正式 mobile build 與實體裝置流程。
- Coolify preview、真實量界／政府 API、VPS 資源與決賽設備的端到端驗證；完成前不得把 fixture 結果說成線上展示。
