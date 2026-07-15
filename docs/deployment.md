# Coolify／VPS 部署計畫

## 現況

部署目標為自有 VPS 的 Coolify。repository 已包含可部署的 `docker-compose.yml`、兩個 Dockerfile 與 PostgreSQL migration，但尚未建立 VPS、Coolify app、網域、production secret、備份或 production URL。

## Compose 拓樸

| Service | Image／責任 | 網路與資料 |
|---|---|---|
| `web` | Nginx 提供 Expo Web 靜態檔，將 `/api` 代理到 `api` | Coolify 將公開網域指向 `web:80` |
| `api` | Node.js 22 + Fastify；先跑 migration 再啟動 | 僅 Compose internal network 的 `3000` |
| `postgres` | PostgreSQL 17；共享環境快取與匿名技術事件 | 命名 volume `airme-postgres`，不公開 port |

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
| `LIANGJIE_AI_BASE_URL` | `https://liangjiewis.com` | 否 |
| `LIANGJIE_AI_MODEL` | 量界控制台中已驗證的 model ID | 否 |
| `LIANGJIE_AI_API_KEY` | 量界 token | 是 |
| `LIANGJIE_AI_JSON_MODE` | `auto`；不相容時改 `disabled` | 否 |
| `MOENV_API_KEY` | 環境部 key | 是 |
| `CWA_API_KEY` | 中央氣象署 key | 是 |
| `ALLOWED_ORIGINS` | 原生 App 或獨立 Web 的 HTTPS origin，逗號分隔 | 否 |
| `REQUEST_TIMEOUT_MS` | 預設 `8000` | 否 |
| `CONTEXT_TTL_SECONDS` | 預設 `1800` | 否 |

Compose 會用資料庫的 `POSTGRES_*` 設定自動組成 API 連線。若改用 Coolify 獨立的 PostgreSQL service，請在 API 設定 `DATABASE_URL`，或完整提供 `DATABASE_HOST`、`DATABASE_PORT`、`DATABASE_NAME`、`DATABASE_USER`、`DATABASE_PASSWORD`；此時必須調整 Compose 的 `postgres` 服務與 `depends_on`，不要同時留下兩套不一致資料庫。

`AI_MODE=live` 與 `DATABASE_REQUIRED=true` 已在 Compose 固定。若要在本機測試，使用 `AI_MODE=fixture DATABASE_REQUIRED=false`，不要把 fixture 設定誤帶到正式 Coolify app。

## 原生 App 設定

Coolify Web 因同源可使用 `/api`。iOS／Android bundle 不可使用相對 URL，發布前需以非秘密的公開 API base URL 重建：

```bash
EXPO_PUBLIC_API_BASE_URL=https://<your-domain>/api npm run build:web --workspace airme
```

真正的 mobile delivery（development build、APK、AAB 或 TestFlight）尚未決定；上例只說明環境變數，不能取代原生發佈流程。

## 上線驗收與觀測

- `/api/health`：確認 API 及必要 PostgreSQL 連線；不要公開 `/api` container port。
- Web：檢查首頁、設定、fixture／live 標籤、推薦、追問、回饋與資料清除。
- Live：確認量界模型 ID、JSON output、429、timeout、無效輸出與 provider 失敗都不會洩漏 provider body。
- Data：確認環境部／中央氣象署來源、時間、stale 與 partial／fixture 狀態。
- Database：確認僅出現 `environment_cache`、`service_events` 與 `schema_migrations`；抽查不得有 activity text、profile、prompt、模型全文或 IP。
- Server：用 Coolify logs 只看服務健康與錯誤分類，不將完整 request body 或 secret 寫入 log。

## 備份、回滾與維運

- 先在 Coolify 或 VPS 層建立 PostgreSQL volume 的排程備份，再宣稱正式資料庫可用；備份必須加密、限制存取並演練 restore。
- 保留上一次成功 Docker image／deployment。程式回滾可使用 Coolify 的既有版本；資料庫 migration 不可直接假設可逆，新的 migration 需先設計相容或 rollback SQL。
- `CONTEXT_SIGNING_SECRET` 輪替會使既有追問 token 失效，應在低流量時進行並接受使用者重新產生行動卡。
- 若量界、政府資料或資料庫不可用，切換清楚標示的 fixture Demo；不要以錯誤快取或 fixture 假裝 live。

## 尚未驗證

- 實際 Coolify / VPS / Docker 版本、網域、TLS、firewall、運算與磁碟資源。
- Coolify Compose 對 `depends_on` health condition 與 build args 的實際行為。
- 量界與政府 API 真實 key 的 quota、rate limit、JSON 相容性與服務條款。
- PostgreSQL 備份、restore、監控與 retention。
- 正式 mobile build 與實體裝置流程。
