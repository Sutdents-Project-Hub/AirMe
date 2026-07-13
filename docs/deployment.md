# 部署計畫

## 現況

部署狀態為 `planned`。初始化沒有建立、修改或刪除任何 Azure 資源，也沒有建立 GitHub remote、CI 或 production secret。

## 規劃拓樸

| 元件 | 平台 | 安裝／Build（repository root） | 產物／啟動 | 發布 owner |
|---|---|---|---|---|
| Web | Azure Static Web Apps | `npm ci`；`npm run build:web --workspace airme` | `apps/client/dist/` | 尚未由團隊指派 |
| API | 獨立 Azure Functions Flex Consumption | `npm ci`；`npm run build --workspace airme-api` | Functions 平台啟動 Node.js 22 | 尚未由團隊指派 |
| Mobile | Expo development build／EAS 或 Android 本機 build | 同一 root workspace；交付形式待確認 | 尚未部署 | 尚未由團隊指派 |

專案使用 npm workspaces 與單一 root lockfile，因此部署不能只在子目錄執行獨立 `npm ci`。以上命令需在部署前用實際 Azure 建置環境再次驗證。API 採獨立 Function App，讓手機與 Web 共用同一個 HTTPS API，並保留 Managed Identity 與 Key Vault 整合能力；Web 預設直接呼叫 Functions 並限制 CORS。

取得主辦方對 subscription、resource group、RBAC、region 與命名的確認後，再新增 `infra/`、Bicep 與 `azure.yaml`。目前不建立空白基礎設施資料夾，也不把未驗證的資源名稱或 region 寫死。

## Azure 前置確認

- 主辦方是否允許建立專屬 Function App、Storage、Static Web App、Application Insights。
- Azure OpenAI deployment、region、RBAC role、quota 與 rate limit。
- Managed Identity 是否能取得 Azure OpenAI 使用權限。
- Function region 與模型 region 的延遲與資料處理要求。
- CSP 訂閱的費用歸屬與資源命名規則。

## 設定與秘密

| 設定 | 使用元件 | 值的 owner／來源 | 秘密 |
|---|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | App／Web | Azure 發布負責人填入已驗證的 Functions base URL | 否 |
| `EXPO_PUBLIC_API_TIMEOUT_MS` | App／Web | 前端維護者依實測延遲調整 | 否 |
| `AZURE_OPENAI_ENDPOINT` | API | 主辦方或 Azure 管理者提供 | 是，不進前端或 Git |
| `AZURE_OPENAI_DEPLOYMENT` | API | 主辦方核准的 deployment | 否，但不得寫死成未驗證名稱 |
| `AZURE_OPENAI_API_VERSION` | API | 依核准 Responses API 版本設定 | 否 |
| `AZURE_OPENAI_API_KEY` | API | 僅在無法使用 Entra 時由管理者注入 | 是，預設不使用 |
| `MOENV_API_KEY` | API | 環境部資料平台帳號持有人 | 是 |
| `CWA_API_KEY` | API | 中央氣象署資料平台帳號持有人 | 是 |
| `ALLOWED_ORIGINS` | API | Web 部署完成後由 Azure 發布負責人設定 | 否，但必須限制來源 |
| `CONTEXT_SIGNING_SECRET` | API | 發布 owner 產生高熵秘密 | 是 |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | API | Azure 平台建立或注入 | 是 |

- Function App settings 保存外部 API key；Azure OpenAI 優先使用 Managed Identity。
- 不把 production 值放 GitHub Actions、README、截圖或簡報。
- `ALLOWED_ORIGINS` 限定實際 Web 網域，不使用正式環境萬用 origin。

## 環境邊界與相依服務

- 決賽前先使用單一 dev／competition 環境；是否需要獨立 staging 尚未確認。
- Web、API、Azure OpenAI、環境部與中央氣象署是核心相依服務；任一失敗都必須顯示真實錯誤或清楚標示的示範備援。
- 本機前端預設 API base 是 `http://localhost:7071/api`；雲端 domain、API URL、healthcheck URL 與 Functions resource name尚未驗證，不在文件猜值。
- P0 不建立雲端個人資料庫，因此沒有 database migration 或 server backup；裝置端資料由使用者清除，示範 fixture 可由 repository 重建。

## 監控

- Health endpoint、request count、P50／P95 latency、429、5xx、環境資料失敗、AI 無效輸出。
- 不收集完整 request／response body。
- 設定合理 sampling 與資料保留，避免共用額度被大量遙測消耗。

## 發布與回滾

1. lint、typecheck、build、安全測試與核心人工流程通過。
2. 先部署 staging／preview，確認 App 和 Web 都能呼叫。
3. 記錄可回滾的前一個 commit 與部署版本。
4. 決賽前凍結設定；現場不修改共用模型 deployment。
5. 部署失敗時回到上一個驗證版本；不以 fixture 冒充 production 修復。

## 尚未驗證

- 實際 Azure resource names、region、URL、healthcheck URL 與費用。
- GitHub Actions／Static Web Apps 自動部署流程。
- Mobile 最終交付格式。
- Production backup／database，因 P0 不建立個人資料庫。
