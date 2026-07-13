# 外部整合與 AI

## Microsoft Foundry／Azure OpenAI

- 用途：活動意圖理解、情境組合、結構化行動卡與限定追問。
- API：Responses API；輸出使用 JSON Schema Structured Outputs。
- 驗證：Managed Identity／Entra ID 優先，不在前端或 Git 放 API key。
- 模型：以環境變數指定主辦方核准 deployment，不把 Portal 目前名稱寫死在程式。
- 限制：處理 429、timeout、內容過濾、無效輸出與共用 quota。
- 不使用：任意 web search、任意工具、通用 Agent、自主醫療判斷。

## 環境部環境資料開放平臺

- 用途：即時 AQI、主要污染物、測站與觀測時間。
- 已實作資料集 adapter：`AQX_P_432`；fixture 測試已通過，正式串接仍須用真實帳號再次確認欄位、更新頻率、額度與 attribution。
- 認證：後端保存 `MOENV_API_KEY`。
- 必做：timeout、cache、欄位缺失、測站對應、資料過期與來源標示。
- 官方說明：[API 使用說明](https://data.moenv.gov.tw/paradigm)

## 中央氣象署開放資料

- 用途：活動建議真正需要的溫度、降雨、風或短期預報欄位；避免為了完整而擷取整包資料。
- 認證：後端保存 `CWA_API_KEY`。
- 已實作 `F-C0032-001` 地區預報 adapter；fixture 測試已通過，正式串接仍須確認實際欄位、地區對應、更新頻率與額度。
- 官方說明：[OpenData API](https://opendata.cwa.gov.tw/dist/opendata-swagger.html)

## 官方規則

- 環境部 AQI 與活動建議、教育部校園空品措施整理成小型、版本化規則表。
- 規則表由團隊人工核對，不讓模型自行搜尋或發明門檻。
- 每條規則保留來源 URL、適用對象、AQI category、活動限制與更新日期。

## 共同非功能要求

- 每個依賴都有 timeout、retry policy、cache、rate-limit handling、資料新鮮度與 fallback。
- API 回應與 Application Insights 不記錄 secret、完整提示、個人症狀或精確位置。
- 對外展示清楚區分即時資料、快取資料與 fixture。
- 串接前確認 API 使用條款、attribution、額度與競賽公開展示權。
