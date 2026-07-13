# AirMe Azure Functions API

可信任後端邊界：標準化政府資料、執行官方規則、呼叫 Azure OpenAI、驗證 Structured Outputs、簽發短效追問情境 token，並向 App／Web 回傳穩定契約。

## Endpoints

| Method | Route | 行為 |
|---|---|---|
| `GET` | `/api/health` | 服務摘要，不洩漏設定或 provider 細節 |
| `GET` | `/api/environment` | AQI／天氣、來源、時間與降級狀態 |
| `POST` | `/api/recommendations` | 規則底線 + Azure／fixture AI + 結構化行動卡 |
| `POST` | `/api/follow-ups` | 原情境內追問；固定拒答／緊急處理 |

輸入與輸出由 `packages/contracts` 的 Zod schema 驗證。模型輸出不得降低程式規則風險，provider 錯誤、stack trace、endpoint 與 secret 不會出現在公開回應。

## 執行

從 repository 根目錄：

```bash
npm ci
npm run start --workspace airme-api
```

需要 Node.js 22、Azure Functions Core Tools 4.x；使用 `UseDevelopmentStorage=true` 時另需 Azurite。

## 驗證

```bash
npm run test --workspace airme-api
npm run typecheck --workspace airme-api
npm run build --workspace airme-api
npm run evaluate --workspace airme-api
```

評估資料位於 `evaluation/cases.json`，涵蓋 30 個正常、敏感、資料品質、醫療、緊急、離題與提示注入案例。

本機已以 Core Tools + fixture 實際呼叫四條 endpoint，均為 HTTP 200 且通過共用 schema。測試當下未啟動 Azurite，因此 Functions host 的 storage health 有警告；HTTP P0 流程可操作，但正式 Storage 連線仍待驗證。

## 執行模式與設定

- `AI_MODE=fixture`：本機可重播結果，不呼叫 Azure OpenAI。
- `AI_MODE=live`：使用 Azure OpenAI Responses API 與嚴格 JSON Schema。
- `AZURE_OPENAI_ENDPOINT`、`AZURE_OPENAI_DEPLOYMENT`、`AZURE_OPENAI_API_VERSION`。
- `AZURE_OPENAI_API_KEY`：僅作受控備援；Azure 上優先使用 Managed Identity／Entra ID。
- `MOENV_API_KEY`、`CWA_API_KEY`：只存後端本機忽略檔或 Azure App Settings。
- `ALLOWED_ORIGINS`：正式環境不可使用萬用 `*`。
- `CONTEXT_SIGNING_SECRET`、`CONTEXT_TTL_SECONDS`：短效 HMAC 情境 token；`live` 模式必填，fixture 未設定時只在目前 process 產生暫時值。
- `REQUEST_TIMEOUT_MS`、`APPLICATIONINSIGHTS_CONNECTION_STRING`。

目前 adapter 與降級路徑已由 fixture 測試，但尚未以真實政府 API key、真實 Azure OpenAI deployment 或雲端 Function App 完成端到端驗證。

## 隱私

- 不建立個人雲端資料庫。
- 不記錄完整 prompt、症狀、個人設定、精確位置或完整模型輸出。
- 情境 token 有期限且不可作為帳號或長期識別碼。
- 日誌只規劃 request ID、耗時、狀態碼、資料新鮮度與匿名錯誤分類。

詳見 [AI 安全與評估](../../docs/ai-safety-and-evaluation.md) 與 [部署計畫](../../docs/deployment.md)。
