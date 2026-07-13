# 專案能力盤點

## 已完成並可本機操作

| 能力 | 實作位置 | 驗證方式 |
|---|---|---|
| 跨平台產品 UI | `apps/client/app`、`apps/client/src/components` | Web export、手機／桌面瀏覽器操作 |
| 本機個人資料 | `apps/client/src/storage/local-store.ts` | storage tests、清除流程 |
| 離線競賽 Demo | `apps/client/src/demo` | 完整瀏覽器流程 |
| 前後端契約 | `packages/contracts` | runtime schema + tests |
| 政府資料標準化 | `services/api/src/environment` | fixture／adapter tests |
| 官方安全底線 | `services/api/src/domain/rules.ts` | 單元與 orchestration tests |
| 安全領域守門 | `services/api/src/domain/safety.ts` | 醫療、緊急、離題、注入測試 |
| Azure OpenAI adapter | `services/api/src/ai` | mock／fixture tests；live 未驗證 |
| Recommendation API | `services/api/src/recommendation`、`src/functions` | handler／service tests |
| 追問 context | `services/api/src/context`、`src/follow-up` | token、分類與失效測試 |
| 固定安全評估 | `services/api/evaluation/cases.json` | 30/30 evaluation |

## 有程式碼但需外部環境驗證

- 環境部 `AQX_P_432` 即時 API 的真實欄位與額度。
- 中央氣象署 `F-C0032-001` 的真實地區預報對應。
- Azure OpenAI Responses API、Structured Outputs、內容過濾、Entra token、quota 與延遲。
- Azure Functions host、Static Web Apps、Application Insights 與正式 CORS。
- iOS／Android 實體裝置與最終安裝包形式。

## 尚未建立且不是本次已完成範圍

- Azure 資源、IaC、production secret、CI/CD、正式 URL、remote 或 GitHub repository。
- 帳號、雲端個人資料庫、跨裝置同步、教師／班級功能。
- Push notification、地圖、智慧路線、健康預測或醫療串接。

## 競賽展示建議

現場以「真實 Azure + 真實環境資料」為主流程；若政府 API 失敗，保留真實 Azure + 固定環境 fixture；若網路或 Azure 失敗，切換明確標示的完全本機 Demo。三種狀態不可混稱。
