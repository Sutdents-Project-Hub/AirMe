# Coolify／VPS 部署計畫

## 現況

部署目標為自有 VPS 的 Coolify。正式環境採三個獨立 Resource：Web Application、API Application、PostgreSQL Database。repository 的 `docker-compose.yml` 與可選 `docker-compose.maps.yml` 僅供本機容器驗證；它們不是 Coolify 的部署設定。應用程式 Dockerfile 與 PostgreSQL migration 已就緒，但尚未建立 Coolify Resource、網域、production secret、備份或 production URL。

## 命名契約

- Repository／本機根資料夾：`AirMe`
- Project slug／Coolify project：`airme`
- 本機 Docker Compose project：`airme`（`docker-compose.yml` 頂層 `name: airme`）
- Coolify Resources：`airme-web`、`airme-api`、`airme-postgres`
- 本機 Compose services：`web`、`api`、`postgres`；不設定 `container_name`

## Coolify 三個 Resource

| Resource | 類型與 Dockerfile | 對外 port／健康檢查 | 網路與資料 |
|---|---|---|
| `airme-web` | Application；`app/Dockerfile` | `80`；`/` | Expo Web static export + Nginx；以 build variable 編譯 API HTTPS URL |
| `airme-api` | Application；`backend/Dockerfile` | `3000`；`GET /api/health`，啟動寬限 90 秒 | Fastify；透過 Coolify private network 連 PostgreSQL，啟動前執行 migration |
| `airme-postgres` | Coolify PostgreSQL 17 Database | 不公開；由 Coolify 管理 | 環境快取、匿名技術事件、最小帳號／session 與可選加密同步資料 |

兩個 Application 都必須使用 repository 根目錄作為 **Base Directory**，因為 Dockerfile 需要讀取根目錄的 `package-lock.json` 與 `packages/contracts/`。在 Coolify 的 Dockerfile Location 分別設定 `/app/Dockerfile` 與 `/backend/Dockerfile`。Web 與 API 各有自己的 HTTPS 網域，例如 `https://airme.example.com`、`https://api.airme.example.com`；Web 不再反向代理 `/api`，因此 API URL 必須在 Web build 時明確注入，且 API 必須設定精確 CORS origin。

### 可選自架地圖 overlay

`docker-compose.maps.yml` 是本機／維運用的可選 overlay，只有指定 `maps` profile 才會啟動下列服務。它不是目前三個 Coolify Resource 的一部分。若決定上線地圖，應先將 Valhalla、Photon 與 TileServer GL 規劃為獨立、受資源限制的 Resource，並為 TileServer GL 配置自己的 HTTPS 網域；完成前 AirMe 安全降級，不把 Demo 地圖當成線上導航。

| Service | 責任 | 持久資料 |
|---|---|---|
| `router` | Valhalla；首次啟動從 Taiwan OSM PBF 建立路網 graph tiles | `airme-valhalla` |
| `geocoder` | Photon；從已明確 bootstrap 的 `photon_data` 提供地點搜尋 | `airme-photon` |
| `tiles` | TileServer GL；提供 Planetiler 生成的 `taiwan.mbtiles` 與 style JSON | `airme-map-tiles`（唯讀） |
| `map-tiles-build` | 一次性 Planetiler 任務，生成台灣 MBTiles | `airme-map-tiles` |
| `photon-bootstrap` | 一次性 Photon jar／索引下載與解壓 | `airme-photon` |

一般 `up` 不會啟動兩個 `map-bootstrap` 任務，也不會下載台灣 PBF、Photon 索引或 Planetiler 所需的 basemap 資料。這避免把大量網路與磁碟操作藏在產品啟動中。

## 第一次部署步驟

1. 準備已安裝 Coolify 的 VPS，確認主機防火牆與 Coolify reverse proxy 能處理 80/443；這些主機操作不由此 repository 自動執行。
2. 在同一個 Coolify project／environment 建立 **PostgreSQL 17 Database** `airme-postgres`。保持不公開，記下 Coolify 提供的 internal connection URL。
3. 建立 **Dockerfile Application** `airme-api`，來源選此 repository，Base Directory 設 `/`、Dockerfile Location 設 `/backend/Dockerfile`、port 設 `3000`、health check 設 `GET /api/health`（`localhost:3000`、interval 5 秒、timeout 5 秒、retries 10、**Start Period 90 秒**）。API container 會先執行資料庫 migration，不能用較短的啟動寬限期。填入 API Resource 的 runtime variables，`DATABASE_URL` 使用步驟 2 的 internal URL。
4. 為 API 設 HTTPS 網域，例如 `api.<your-domain>`；資料庫一律不公開。API 是獨立 Resource，因此此公開 URL 是 Web 與原生 App 的合法呼叫端點，不是秘密。
5. 建立 **Dockerfile Application** `airme-web`，同樣使用 Base Directory `/`、Dockerfile Location `/app/Dockerfile`、port `80`、health check `/`。設定 Web Resource 的 build variables，尤其是 `EXPO_PUBLIC_API_BASE_URL=https://api.<your-domain>/api`。
6. 為 Web 設 HTTPS 網域，例如 `app.<your-domain>`，並將 API 的 `ALLOWED_ORIGINS` 設為該完整 origin（不含 path）。先部署 API，確認 health；再部署 Web。
7. 第一次可先將 API 設為 `AI_MODE=fixture` 驗證 Resource、migration、登入與跨網域 CORS，再切換／驗證 live 量界與政府資料。不要把 fixture 結果口述為即時資料。

## Coolify 環境變數

`airme-web` 只使用下列 **build variables**；三者都會進入 bundle，絕不能放 secret。

| 變數 | 範例／用途 |
|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | `https://api.<your-domain>/api` |
| `EXPO_PUBLIC_API_TIMEOUT_MS` | `22000` |
| `EXPO_PUBLIC_MAP_STYLE_URL` | 可選的完整 HTTPS style URL；未部署地圖時留空 |

`airme-postgres` 的資料庫名稱、使用者與密碼由 Coolify Database Resource 管理。以下是 **airme-api runtime variables**；秘密必須標記為 secret／masked，且不可勾選為 build variable。

| 變數 | 範例／用途 | 秘密 |
|---|---|---|
| `DATABASE_URL` | Coolify PostgreSQL Resource 提供的 internal connection URL | 是 |
| `DATABASE_REQUIRED` | production 固定 `true` | 否 |
| `AI_MODE` | 首次 Resource 驗證可用 `fixture`；正式展示前必須切為 `live` | 否 |
| `CONTEXT_SIGNING_SECRET` | 至少 32 bytes 的隨機字串 | 是 |
| `AUTH_SESSION_HMAC_SECRET` | 與其他 secret 不重複、至少 32 bytes 的隨機字串 | 是 |
| `CLOUD_SYNC_ENCRYPTION_KEY` | 獨立 32-byte base64url key；啟用 AES-256-GCM 帳號同步 | 是 |
| `AUTH_SESSION_TTL_SECONDS` | session 壽命，預設 30 天 | 否 |
| `LIANGJIE_AI_BASE_URL` | `https://liangjiewis.com` | 否 |
| `LIANGJIE_AI_MODEL` | 量界控制台中已驗證的 model ID | 否 |
| `LIANGJIE_AI_API_KEY` | 量界 token | 是 |
| `LIANGJIE_AI_JSON_MODE` | `auto`；不相容時改 `disabled` | 否 |
| `MOENV_API_KEY` | 環境部 key | 是 |
| `CWA_API_KEY` | 中央氣象署 key | 是 |
| `OPEN_METEO_FALLBACK_ENABLED` | `true` 時以明確模型資料作官方來源失敗的降級；公開商業環境先確認授權 | 否 |
| `ALLOWED_ORIGINS` | `https://app.<your-domain>`；原生 App 或其他 Web origin 以逗號分隔 | 否 |
| `REQUEST_TIMEOUT_MS` | 預設 `8000` | 否 |
| `AI_MAX_REQUESTS_PER_MINUTE` | 每 API process 預設 `60` | 否 |
| `AI_MAX_CONCURRENCY` | 每 API process 預設同時 `4` 個 AI 作業 | 否 |
| `ENVIRONMENT_MAX_REQUESTS_PER_MINUTE` | 每 API process 預設 `120` 次環境查詢 | 否 |
| `ENVIRONMENT_MAX_CONCURRENCY` | 每 API process 預設同時 `8` 個環境查詢 | 否 |
| `VALHALLA_ROUTE_URL` | 已部署、僅 internal network 可達的 Valhalla `/route` URL | 否 |
| `PHOTON_SEARCH_URL` | 已部署、僅 internal network 可達的 Photon `/api/` URL | 否 |
| `MAP_PUBLIC_BASE_URL` | TileServer GL 回傳 style／tile URL 的 canonical base；若另建地圖 Resource，使用其 HTTPS 網域 | 否 |
| `MAP_ALLOWED_HOSTS` | TileServer GL 接受的公開 host，逗號分隔 | 否 |
| `VALHALLA_TILE_URL` | Taiwan OSM PBF URL；預設 Geofabrik 台灣 extract | 否 |
| `PHOTON_DATABASE_URL` | 已審查且與 Photon jar 相容的 `photon_data` archive；只在明確 bootstrap 時使用 | 否 |
| `MAP_TILE_BUILD_MAX_HEAP` | Planetiler 建圖 JVM heap，例如 `4g` | 否 |
| `ROUTING_MAX_REQUESTS_PER_MINUTE` | 每 API process 路線／搜尋啟動頻率上限 | 否 |
| `ROUTING_MAX_CONCURRENCY` | 每 API process 路線／搜尋同時數上限 | 否 |
| `CONTEXT_TTL_SECONDS` | 預設 `1800` | 否 |

Production API 固定設 `DATABASE_REQUIRED=true`。`AI_MODE` 可在第一次以 `fixture` 驗證容器與 CORS，但正式展示必須切回 `live` 並驗證 provenance。`docker-compose.yml` 的 `POSTGRES_*`／`depends_on` 只服務本機 Compose；不要將它套入 Coolify Resource，否則會同時留下兩套資料庫設定。

API image 的 runtime 只安裝 contracts／backend production dependencies，並以 `node` 非 root 使用者執行。PostgreSQL Pool 含 5 秒連線 timeout、10 秒 query timeout 與 8 秒 statement timeout，避免資料庫不可用時無限卡住。

## 本機 Docker fixture 測試

`docker-compose.local.yml` 是本機覆蓋檔：它把 API 切換為 fixture、停用政府 API key，公開 `web:80` 到 `localhost:8080` 及 `api:3000` 到 `localhost:3000`。Web 以獨立 API URL 建置，這與 Coolify 的多 Resource 拓樸一致。與主 Compose 合併後只會在 `airme` Compose project 建立 `web`、`api`、`postgres` 三個 containers；不會停止、重建或使用其他 Compose 專案的 containers。

```bash
cp .env.local.example .env.local
docker compose --env-file .env.local -f docker-compose.yml -f docker-compose.local.yml up --build -d
docker compose --env-file .env.local -f docker-compose.yml -f docker-compose.local.yml ps
```

測試網址是 `http://localhost:8080`，API health 是 `http://localhost:3000/api/health`。停止本機 AirMe stack 時使用同一組檔案執行 `down`；除非你刻意要清除 fixture 資料庫，否則不要加 `-v`。

## 自架開源地圖服務

此路徑不使用 Google、Mapbox、MapTiler Cloud 或任何地圖 API key。圖資來源為 OpenStreetMap；請保留 OSM attribution，並在正式頁面檢查 style 是否確實顯示 attribution。MapLibre 只是渲染器，路線、搜尋與圖磚分別由 Valhalla、Photon、Planetiler／TileServer GL 處理。

1. 確認主機有足夠可用 CPU、RAM、SSD 與備份空間。Planetiler 除 OSM extract 外還會下載 basemap 來源；Photon planet index 很大，更新時還需要可安全切換的額外空間。先用 `.env.maps.example` 選定限制與資料來源，不要在未知容量的 VPS 直接執行。
2. 建立本機忽略的 `.env.maps.local`。若未來將 TileServer GL 獨立部署，`MAP_PUBLIC_BASE_URL` 設為它自己的 `https://maps.<your-domain>/`、`MAP_ALLOWED_HOSTS` 設為該 host，Web／iOS／Android 的 `EXPO_PUBLIC_MAP_STYLE_URL` 都使用同一完整 HTTPS URL。這些都不是 secret。
3. 先明確建立台灣 MBTiles。此命令會下載圖資並覆寫同名輸出，應在可觀察的維運時段執行：

```bash
cp .env.maps.example .env.maps.local
docker compose --env-file .env.local --env-file .env.maps.local \
  -f docker-compose.yml -f docker-compose.local.yml -f docker-compose.maps.yml \
  --profile map-bootstrap run --rm map-tiles-build
```

4. Photon 需要與 jar 版本相容的 `photon_data` archive。它的資料來源、台灣覆蓋、授權、更新週期與容量必須先人工確認，然後才在 `.env.maps.local` 填入 `PHOTON_DATABASE_URL`。空值會安全失敗，絕不自動下載 planet index：

```bash
docker compose --env-file .env.local --env-file .env.maps.local \
  -f docker-compose.yml -f docker-compose.local.yml -f docker-compose.maps.yml \
  --profile map-bootstrap run --rm photon-bootstrap
```

5. 啟動三個 self-hosted services 與 App；Valhalla 首次會把 `VALHALLA_TILE_URL` 的 Taiwan PBF 建成 graph tiles，完成前路線 API 會安全 unavailable：

```bash
docker compose --env-file .env.local --env-file .env.maps.local \
  -f docker-compose.yml -f docker-compose.local.yml -f docker-compose.maps.yml \
  --profile maps up --build -d
```

6. 在公開或本機網域逐項驗證 `POST /api/geocoding/search`、三種 `POST /api/routes`、TileServer GL style URL、MapLibre attribution、地圖 404／服務停機降級與 native HTTPS style 載入。這些真實圖資驗收目前尚未執行。

Planetiler 支援以 Docker 從區域 OSM extract 產生 MBTiles；Photon 官方建議下載 release jar 與相容 database dump 後以 `java -jar … serve` 啟動；TileServer GL 的 production 建議設定 canonical public URL 或 allowlist Host。實作連結見 [外部整合](integrations.md#路線地點搜尋與地圖)。

## 原生 App 設定

Web 與 iOS／Android bundle 都必須使用完整、非秘密的公開 API URL；它們不可使用相對 `/api`。發布前需重建：

```bash
EXPO_PUBLIC_API_BASE_URL=https://<your-domain>/api npm run build:web --workspace airme
```

原生 App 的 EAS profile 已在 `app/eas.json` 準備：`development` 供開發 client、`preview` 產生 Android APK、`production` 產生 Android App Bundle 與 iOS archive。實際 EAS project、簽章、商店帳號與實機驗收仍未執行；上例只說明 Web bundle 的環境變數，不能取代原生發佈流程。

前端 `EXPO_PUBLIC_API_TIMEOUT_MS` 預設為 `22000`，覆蓋環境資料與 AI 串接的正常上限；依線上 P95 調整時必須同步 App Docker build arg 與元件 README。

`EXPO_PUBLIC_MAP_STYLE_URL` 是公開的 MapLibre style URL，不是 secret。多 Resource 部署時 Web 與 native 都必須用完整的 HTTPS URL；native 地圖需使用 Expo development build 或正式 build，不能以 Expo Go 驗收。

## 上線驗收與觀測

- `https://api.<your-domain>/api/health`：確認 API 及必要 PostgreSQL 連線；API 有自己的公開 HTTPS 網域，PostgreSQL 不可公開。
- Web：檢查未登入一律導向註冊／登入、帳號建立後才可建立個人檔案、登出／刪除帳號、加密 state 同步與刪帳 cascade、首頁理解確認、路線降級、Air 日誌、fixture／live／partial 標籤、推薦、追問、回饋與資料清除。
- API：除既有 health／environment／recommendations／follow-ups 外，驗證 `POST /api/activity-intents` 不寫入 request body，帳號 token 不進 log，live／fixture provenance 正確。
- Maps：驗證 Valhalla／Photon／TileServer GL 的實際 health、台灣搜尋、三種移動方式、獨立 style 網域的 canonical HTTPS URL、timeout／限流／503 降級、MapLibre attribution，以及不顯示街道級 AQI、最低污染或 turn-by-turn 導航。
- Live：確認量界模型 ID、JSON output、429、timeout、無效輸出與 provider 失敗都不會洩漏 provider body。
- Abuse：驗證 32KB body 上限、malformed JSON、`AI_MAX_REQUESTS_PER_MINUTE`、`AI_MAX_CONCURRENCY` 與 429 UI。多 replica 部署前需再於 reverse proxy 或共用 store 加上全域 limiter。
- Data：確認環境部／中央氣象署優先順序、Open-Meteo 模型 fallback 的 attribution、時間、stale 與 partial／fixture 狀態。
- Database：確認 `accounts`／`account_sessions` 僅含最小驗證資料且未存原始 token；`account_cloud_states` 只有 ciphertext／IV／auth tag，其他 table 不得有 activity text、prompt、模型全文、精確路線或 IP。
- Server：repository 內 Nginx 已關閉 access log；用 Coolify logs 只看服務健康與錯誤分類，不將完整 request body 或 secret 寫入 log，並為外層 reverse proxy 的連線 IP 設定最短保存期與存取限制。

## 備份、回滾與維運

- 先在 Coolify 或 VPS 層建立 PostgreSQL volume 的排程備份，再宣稱正式資料庫可用；備份必須加密、限制存取並演練 restore。
- 若啟用地圖，將 `airme-valhalla`、`airme-photon`、`airme-map-tiles` 納入容量與備份／重建計畫。MBTiles 與 OSM graph 可從來源重建，Photon index 更新必須先完成新資料驗證並以目錄或 volume 原子切換，不能直接覆寫正在服務的 `photon_data`。
- 保留上一次成功 Docker image／deployment。程式回滾可使用 Coolify 的既有版本；資料庫 migration 不可直接假設可逆，新的 migration 需先設計相容或 rollback SQL。
- `CONTEXT_SIGNING_SECRET` 輪替會使既有追問 token 失效，應在低流量時進行並接受使用者重新產生行動卡。
- `AUTH_SESSION_HMAC_SECRET` 輪替會使所有登入 session 失效；公告後安排使用者重新登入，並保持舊值不可回復的風險紀錄。
- 若量界、政府資料或資料庫不可用，切換清楚標示的 fixture Demo；不要以錯誤快取或 fixture 假裝 live。

## 尚未驗證

- 實際 Coolify / VPS / Docker 版本、網域、TLS、firewall、運算與磁碟資源。
- Coolify Dockerfile Resource 的 Base Directory、Dockerfile Location、build variable 與 private PostgreSQL URL 在目標 VPS 的實際行為。
- 量界與政府 API 真實 key 的 quota、rate limit、JSON 相容性與服務條款。
- PostgreSQL 備份、restore、監控與 retention。
- Valhalla Taiwan PBF、Photon 台灣索引、Planetiler MBTiles 與 TileServer GL 的實際首次 bootstrap、資源需求、更新週期、route／search quality、監控、canonical URL 與 attribution。
- 正式 mobile build 與實體裝置流程。
- Coolify preview、真實量界／政府 API、VPS 資源與決賽設備的端到端驗證；完成前不得把 fixture 結果說成線上展示。
