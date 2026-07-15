# 專案能力盤點

## 已完成並可本機操作

| 能力 | 實作位置 | 驗證方式 |
|---|---|---|
| 跨平台產品 UI | `app/src/app`、`src/components` | Web export、手機／桌面瀏覽器操作 |
| 本機個人資料 | `app/src/storage/local-store.ts` | storage tests、清除流程 |
| 離線競賽 Demo | `app/src/demo` | 完整瀏覽器流程 |
| 前後端契約 | `packages/contracts` | runtime schema + tests |
| 政府資料標準化 | `backend/src/adapters/environment` | fixture／adapter tests |
| 官方安全底線 | `backend/src/domain/rules.ts` | 單元與 orchestration tests |
| 安全領域守門 | `backend/src/domain/safety.ts` | 醫療、緊急、離題、注入測試 |
| 量界智算 adapter | `backend/src/adapters/ai/liangjie.ts` | mock／fixture tests；live 未驗證 |
| Fastify API | `backend/src/server.ts`、`src/http` | handler tests 與 fixture HTTP smoke |
| PostgreSQL migration | `backend/database/migrations`、`src/database` | Compose schema 解析；實際 DB 未驗證 |
| 固定安全評估 | `backend/evaluation/cases.json` | 30/30 evaluation |

## 有程式碼但需外部環境驗證

- 環境部 `AQX_P_432` 與中央氣象署 `F-C0032-001` 的真實欄位、額度與 attribution。
- 量界 OpenAI 相容 API、JSON mode、指定模型、額度、429 與延遲。
- PostgreSQL migration、container restart 後快取、Coolify healthcheck、同源 proxy 與正式 TLS。
- VPS backup、restore、監控、disk capacity 與防火牆。
- iOS／Android 實體裝置與最終安裝包形式。

## 尚未建立且不是本次已完成範圍

- VPS／Coolify application、production secret、production URL、CI/CD、remote 或 GitHub repository。
- 帳號、雲端個人資料庫、跨裝置同步、教師／班級功能。
- Push notification、地圖、智慧路線、健康預測或醫療串接。

## 競賽展示建議

現場以「真實量界 AI + 真實環境資料」為主流程；若政府 API 失敗，保留真實量界 AI + 固定環境 fixture；若網路或 AI 失敗，切換明確標示的完全本機 Demo。三種狀態不可混稱。
