# 外部整合與 AI

## 量界智算

- 用途：活動意圖理解、情境組合、結構化行動卡與限定追問。
- 介面：OpenAI 相容 `POST /v1/chat/completions`，API 以 `Authorization: Bearer <token>` 呼叫。
- 設定：`LIANGJIE_AI_BASE_URL`、`LIANGJIE_AI_MODEL`、`LIANGJIE_AI_API_KEY`、`LIANGJIE_AI_JSON_MODE`。
- 實作：`backend/src/adapters/ai/liangjie.ts`；模型 ID 一律由環境變數指定，不寫死在程式。
- 結構化輸出：請求 JSON object，並在 system prompt 要求單一 JSON；無論 provider 是否接受 JSON mode，後端都以 Zod 重新驗證。輸出無效、逾時或失敗時不回傳 provider 原文，改採安全 fixture 降級。
- `POST /api/activity-intents` 先要求量界只擷取使用者明示的活動欄位；未知值必須為 `null`／`unspecified`。Demo 或量界失敗時使用清楚標示的本機保守解析。
- 產生行動卡前，後端不把自訂地點名或座標交給量界；只傳已確認的活動欄位、粗略活動地點類型、受控個人標籤、受控縣市、環境事實與規則底線。環境 location 與來源 URL 不重複送入模型。
- 限定追問只把短效 token 中的結構化活動摘要、受控縣市、環境事實與規則底線交給量界，不帶原始活動文字、自訂地點名或座標。
- 限制：不給模型任何 secret、資料庫權限、任意 web search、工具使用權或醫療判斷權。
- 部署前必驗證：實際 model ID、JSON mode 相容性、429、timeout、延遲與 token 額度。
- API 以 `AI_MAX_REQUESTS_PER_MINUTE` 與 `AI_MAX_CONCURRENCY` 保護意圖、推薦與追問三種 AI 路由；限制是每個 process，正式擴容時需增加共用 limiter。
- 環境查詢另以 `ENVIRONMENT_MAX_REQUESTS_PER_MINUTE` 與 `ENVIRONMENT_MAX_CONCURRENCY` 保護政府 API 額度；正式多 replica 仍需共用 limiter 或 reverse proxy limit。

量界官方文件列出 OpenAI／Gemini 相容格式及 `https://liangjiewis.com/v1/chat/completions`；該文件也提示並非所有相容參數都一定可用，因此 `auto` 會在 400／404／422 時重試一次不帶 JSON mode，仍由 Zod 拒絕無效回覆。若已有證據確認某模型不支援，才改為 `disabled`。不要把文件的範例 token 視為可用或可安全使用的憑證。[量界 AI 文件](https://liangjiewis.com/cfg/doc.html)

## 環境部環境資料開放平臺

- 用途：即時 AQI、主要污染物、測站與觀測時間。
- 已實作資料集 adapter：`AQX_P_432`；fixture 測試通過，正式串接仍須用真實帳號確認欄位、更新頻率、額度與 attribution。
- API 只接受臺灣範圍粗略座標；MOENV 會先依受控縣市過濾測站，再檢查最近測站距離，避免把高雄天氣與臺北 AQI 等錯配資料混在同一張卡。
- 認證：後端保存 `MOENV_API_KEY`。
- 必做：timeout、快取、欄位缺失、測站對應、資料過期與來源標示。
- 官方說明：[API 使用說明](https://data.moenv.gov.tw/paradigm)

## 中央氣象署開放資料

- 用途：活動建議所需的溫度、降雨與短期預報欄位。
- 已實作 `F-C0032-001` 地區預報 adapter；App 將使用者顯示名稱與受控台灣縣市分開，API 以 `administrativeArea` 查詢 CWA。正式串接仍須確認實際欄位、地區對應、更新頻率與額度。
- 認證：後端保存 `CWA_API_KEY`。
- 官方說明：[OpenData API](https://opendata.cwa.gov.tw/dist/opendata-swagger.html)

## PostgreSQL

- 用途：跨 API restart 的 AQI／天氣短期快取，以及不含 payload 的技術事件。
- 快取只寫入固定 `AirMe 粗略位置`名稱，回應時才套回當次請求的顯示地點；舊快取中的私人名稱會被正規化。
- App 以 `POST /api/environment` 的 JSON body 傳送粗略地點，避免地點與座標出現在 reverse proxy access-log URL。
- MOENV 失敗時只能使用可接受時效內的 stale MOENV AQI，否則整體改為 fixture；不把 fixture AQI 混成即時部分資料。CWA 失敗時先用 stale weather，沒有時才使用明示 fixture weather 的 partial 結果。
- migration：`backend/database/migrations/`；由 `npm run db:migrate --workspace airme-api` 執行。
- AirMe PostgreSQL 不保存：帳號、IP、個人設定、活動文字、症狀、回饋、完整 prompt、context token、模型回應或精確位置；外層 Coolify／VPS proxy 的連線 IP log 需另設保存政策。
- Compose 內部 service 名稱：`postgres`；資料 volume：`airme-postgres`。不公開資料庫 port。

## 路線與外部地圖

- 目前沒有 Google Routes、Mapbox 或其他 route provider 的 API 整合、金鑰、帳務或沿途空品資料。
- Client 只產生使用者可見的 Google Maps Directions URL；使用者明示點擊後才離開 AirMe 查看路線，AirMe 不讀回距離、時間或路徑。
- 因此路線頁必須標示資料不足，不得稱為 Live 路線比較；未來若導入 provider，須先新增後端 adapter、timeout、provenance、attribution、成本與隱私驗收。

## 官方規則

- 環境部 AQI 與活動建議、教育部校園空品措施整理成小型、版本化規則表。
- 規則表由團隊人工核對，不讓模型自行搜尋或發明門檻。
- 每條規則保留來源 URL、適用對象、AQI category、活動限制與更新日期。

## 共同非功能要求

- 每個 upstream 都有 timeout、資料新鮮度、快取與 fixture／partial fallback。
- API、PostgreSQL 技術事件與 Coolify log 不記錄 secret、完整 prompt、個人症狀或精確位置。
- 對外展示清楚區分即時資料、快取資料與 fixture。
- 串接前確認 API 使用條款、attribution、額度與競賽公開展示權。

## 競賽指定雲端

官方簡章將「概念驗證（Azure）」列為 25%，並要求雲端資源使用主辦單位指定平台。Coolify／量界是目前產品部署與 AI adapter，不代表已符合該項競賽要求。決賽前必須取得書面例外，或把核心概念驗證切回 Azure／主辦指定資源。
