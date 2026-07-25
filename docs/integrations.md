# 外部整合與 AI

## 量界智算

- 用途：活動意圖理解、情境組合、結構化行動卡與限定追問。
- 介面：OpenAI 相容 `POST /v1/chat/completions`，API 以 `Authorization: Bearer <token>` 呼叫。
- 設定：`LIANGJIE_AI_BASE_URL`、`LIANGJIE_AI_MODEL`、`LIANGJIE_AI_API_KEY`、`LIANGJIE_AI_JSON_MODE`。
- 實作：`backend/src/adapters/ai/liangjie.ts`；模型 ID 一律由環境變數指定，不寫死在程式。
- 結構化輸出：請求 JSON object，並在 system prompt 要求單一 JSON；無論 provider 是否接受 JSON mode，後端都以 Zod 重新驗證。輸出無效、逾時或失敗時不回傳 provider 原文，改採安全 fixture 降級。
- `POST /api/activity-intents` 先要求量界只擷取使用者明示的活動欄位；未知值必須為 `null`／`unspecified`。Demo 或量界失敗時使用清楚標示的本機保守解析。
- `POST /api/profile-understandings` 在使用者確認在線分析後，將一次性的自我描述送給量界，只接受受控年齡／敏感標籤／通勤／活動與不含座標的粗略區域提示；未知欄位為 `null`／空陣列，使用者可略過後再設定。AirMe 不記錄原稿、prompt 或回應全文；量界供應商的保留政策仍須在 production 前確認。
- 產生行動卡前，後端不把自訂地點名或座標交給量界；只傳已確認的活動欄位、粗略活動地點類型、受控個人標籤、受控縣市、環境事實與規則底線。環境 location 與來源 URL 不重複送入模型。
- 限定追問只把短效 token 中的結構化活動摘要、受控縣市、環境事實與規則底線交給量界，不帶原始活動文字、自訂地點名或座標。
- 限制：不給模型任何 secret、資料庫權限、任意 web search、工具使用權或醫療判斷權。
- 部署前必驗證：實際 model ID、JSON mode 相容性、429、timeout、延遲與 token 額度。將 `backend/.env.example` 複製為已忽略的 `backend/.env.live.local`，填入輪替後的 key 與 model 後執行 `npm run verify:ai-live --workspace airme-api`；它只發送三筆不含個資的結構化 smoke request，輸出只包含通過狀態／模型 ID 或安全失敗代碼，不輸出 provider 原始錯誤或 key。
- API 以 `AI_MAX_REQUESTS_PER_MINUTE` 與 `AI_MAX_CONCURRENCY` 保護意圖、推薦與追問三種 AI 路由；限制是每個 process，正式擴容時需增加共用 limiter。
- 環境查詢另以 `ENVIRONMENT_MAX_REQUESTS_PER_MINUTE` 與 `ENVIRONMENT_MAX_CONCURRENCY` 保護政府 API 額度；正式多 replica 仍需共用 limiter 或 reverse proxy limit。

量界官方文件列出 OpenAI／Gemini 相容格式及 `https://liangjiewis.com/v1/chat/completions`；該文件也提示並非所有相容參數都一定可用，因此 `auto` 會在 400／404／422 時重試一次不帶 JSON mode，仍由 Zod 拒絕無效回覆。若已有證據確認某模型不支援，才改為 `disabled`。不要把文件的範例 token 視為可用或可安全使用的憑證。[量界 AI 文件](https://liangjiewis.com/cfg/doc.html)

## 環境部環境資料開放平臺

- 用途：即時 AQI、主要污染物、測站與觀測時間。
- 已實作資料集 adapter：`AQX_P_432`；有 key 時優先使用。未設定 key 或官方請求失敗時，可啟用 `OPEN_METEO_FALLBACK_ENABLED` 取得明確標示的 Open-Meteo／CAMS 模型 US AQI，整體 provenance 維持 `partial`，不得說成環境部即時實測。
- API 只接受臺灣範圍粗略座標；MOENV 會先依受控縣市過濾測站，再檢查最近測站距離，避免把高雄天氣與臺北 AQI 等錯配資料混在同一張卡。
- 認證：後端保存 `MOENV_API_KEY`。
- 必做：timeout、快取、欄位缺失、測站對應、資料過期與來源標示。
- 官方說明：[API 使用說明](https://data.moenv.gov.tw/paradigm)

## 中央氣象署開放資料

- 用途：活動建議所需的溫度、降雨與短期預報欄位。
- 已實作 `F-C0032-001` 地區預報 adapter；App 將使用者顯示名稱與受控台灣縣市分開，API 以 `administrativeArea` 查詢 CWA。官方來源不可用時可用 Open-Meteo 天氣模型降級，並保留來源與 `partial` 狀態。公開商業產品採用 Open-Meteo 前必須先確認其方案、CC BY attribution 與用量條款。
- 認證：後端保存 `CWA_API_KEY`。
- 官方說明：[OpenData API](https://opendata.cwa.gov.tw/dist/opendata-swagger.html)

## PostgreSQL

- 用途：跨 API restart 的 AQI／天氣短期快取、不含 payload 的技術事件，以及可選加密帳號同步 snapshot。
- 快取只寫入固定 `AirMe 粗略位置`名稱，回應時才套回當次請求的顯示地點；舊快取中的私人名稱會被正規化。
- App 以 `POST /api/environment` 的 JSON body 傳送粗略地點，避免地點與座標出現在 reverse proxy access-log URL。
- MOENV 失敗時只能使用可接受時效內的 stale MOENV AQI，否則整體改為 fixture；不把 fixture AQI 混成即時部分資料。CWA 失敗時先用 stale weather，沒有時才使用明示 fixture weather 的 partial 結果。
- migration：`backend/database/migrations/`；由 `npm run db:migrate --workspace airme-api` 執行。
- AirMe PostgreSQL 不保存：IP、完整活動文字、症狀、完整 prompt、context token、模型回應或精確位置；必要帳號保存 Email、顯示名稱、password hash、同意／建立時間與 session token digest。設定同步 key 時，profile／粗略地點／日誌摘要／回饋只以 AES-256-GCM ciphertext 形式保存。外層 Coolify／VPS proxy 的連線 IP log 需另設保存政策。
- Coolify `airme-postgres` Database Resource 提供 API 使用的 internal connection URL；不公開資料庫 port。本機 Compose 則使用 `postgres` service 與 `airme-postgres` volume。

## 路線、地點搜尋與地圖

- 路線 adapter：`backend/src/adapters/routing/mapbox.ts`，以僅供 API runtime 使用的 `MAPBOX_ACCESS_TOKEN` 呼叫 Mapbox Directions；只傳送當次精確座標與移動方式，要求 GeoJSON、替代方案與 `zh-TW` 指示，回傳距離、預估時間與文字步驟；請求／回應不持久化。
- 地點搜尋 adapter：`backend/src/adapters/geocoding/mapbox.ts`，以同一 API runtime token 呼叫 Mapbox Search Box `/forward`，支援車站、公園、學校等 POI；強制 `country=tw`、`language=zh-TW`、關閉 autocomplete，並在後端再次剔除台灣範圍外結果。它不保存查詢文字或座標。
- UI：MapLibre React Native／MapLibre GL 顯示路線。若未指定 `EXPO_PUBLIC_MAP_STYLE_URL`，使用 `EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN` 建立 Mapbox Streets raster style；這是可見的 read-only public token，必須最小權限，Web token 必須限制至 AirMe HTTPS origin。Map data／style 必須保留 Mapbox 與 OpenStreetMap attribution。
- 既有 [docker-compose.maps.yml](../docker-compose.maps.yml) 保留為未來自架圖資的本機／維運選項，不是目前 Mapbox production 路徑，也不應與 Mapbox key 混用。
- route provider 不可用時 API 回傳安全的 unavailable 錯誤，App 顯示降級訊息與使用者主動開啟的 OpenStreetMap 路線交接。功能不計算沿途空品、不宣稱最低污染或安全路線，也不是 turn-by-turn 導航。
- 參考： [Mapbox Directions](https://docs.mapbox.com/api/navigation/directions/)、[Mapbox Search Box](https://docs.mapbox.com/api/search/search-box/)、[Mapbox Static Tiles](https://docs.mapbox.com/api/maps/static-tiles/)；[MapLibre React Native Expo 設定](https://maplibre.org/maplibre-react-native/docs/setup/expo/) 說明原生地圖需要 development build，不能在 Expo Go 執行。

## 官方規則

- 環境部 AQI 與活動建議、教育部校園空品措施整理成小型、版本化規則表。
- 規則表由團隊人工核對，不讓模型自行搜尋或發明門檻。
- 每條規則保留來源 URL、適用對象、AQI category、活動限制與更新日期。

## 共同非功能要求

- 每個 upstream 都有 timeout、資料新鮮度、快取與 fixture／partial fallback。
- API、PostgreSQL 技術事件與 Coolify log 不記錄 secret、完整 prompt、個人症狀或精確位置。
- 對外展示清楚區分即時資料、快取資料與 fixture。
- 串接前確認 API 使用條款、attribution、額度與競賽公開展示權。

## 競賽展示部署

Coolify + PostgreSQL + 量界智算是競賽展示部署路徑。正式展示前要以真實 model ID、環境資料 API、Coolify preview 與來源／provenance 畫面完成端到端驗證；在此前只可展示明確標示的 fixture 流程。
