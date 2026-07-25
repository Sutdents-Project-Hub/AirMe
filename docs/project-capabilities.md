# 專案能力盤點

## 已完成並可本機操作

| 能力 | 實作位置 | 驗證方式 |
|---|---|---|
| 淺綠白跨平台產品 UI | `app/src/app`、`src/components`、`src/design` | Web export、桌面瀏覽器操作、responsive 元件測試 |
| 輸入式本機個人檔案 | `app/src/features/profile`、`src/storage/local-store.ts` | parser、migration、清除流程測試 |
| 必要帳號與 session | `backend/src/domain/account-auth.ts`、`app/src/storage/auth-session.ts` | 未登入導向帳號入口；scrypt／session、API 與表單測試；無個人資料同步 |
| 活動理解確認 | `backend/src/domain/activity-intent.ts`、`app/src/components/activity-composer.tsx` | fixture／live 契約、單一澄清與元件測試 |
| 整合 Air 日誌 | `app/src/components/history-list.tsx`、`src/state/app-model.ts` | 環境／建議／feedback join 與去識別測試 |
| 路線規劃與安全地圖 | `app/src/app/routes.tsx`、`src/components/route-planner.tsx`、`backend/src/adapters/routing` | fixture／元件測試、provider 失敗降級；live provider 未部署 |
| 離線競賽 Demo | `app/src/demo` | 完整瀏覽器流程 |
| 前後端契約 | `packages/contracts` | runtime schema + tests |
| 政府資料標準化 | `backend/src/adapters/environment` | fixture／adapter tests |
| 官方安全底線 | `backend/src/domain/rules.ts` | 單元與 orchestration tests |
| 安全領域守門 | `backend/src/domain/safety.ts` | 醫療、緊急、離題、注入測試 |
| 量界智算 adapter | `backend/src/adapters/ai/liangjie.ts` | mock／fixture tests；live 未驗證 |
| Fastify API | `backend/src/server.ts`、`src/http` | 帳號、地點搜尋、路線與既有流程 handler tests；malformed／32KB body 正規化與頻率／同時數防護 |
| PostgreSQL migration | `backend/database/migrations`、`src/database` | 既有 Compose migration 已驗證；新增帳號 migration 具單元／整合測試，尚待 Compose 實跑 |
| 固定安全評估 | `backend/evaluation/cases.json` | 30/30 evaluation |

## 有程式碼但需外部環境驗證

- 環境部 `AQX_P_432` 與中央氣象署 `F-C0032-001` 的真實欄位、額度與 attribution。
- 量界 OpenAI 相容 API、JSON mode、指定模型、額度、429 與延遲。
- PostgreSQL container restart 後快取、Coolify 三 Resource healthcheck、跨網域 CORS、production volume 與正式 TLS；本機 migration 與 schema 已驗證。
- VPS backup、restore、監控、disk capacity 與防火牆。
- iOS／Android 實體裝置與最終安裝包形式。
- Coolify preview、真實量界／政府 API 與完整 provenance 的端到端驗證。
- Valhalla／Photon、台灣圖資、MapLibre production style／tiles 與 native development build。

## 尚未建立且不是本次已完成範圍

- `airme-web`、真實量界／政府資料、跨網域 CORS、備份與完整 production 交接；`airme-api`／`airme-postgres` 已部署並通過公開 health，GitHub Actions 已覆蓋 Node 22 的品質與 fixture E2E 檢查。
- Email 驗證、密碼重設、MFA、帳號匯出與跨裝置個人資料同步，以及教師／班級功能。
- Push notification、街道級污染路線、健康預測或醫療串接。

## 競賽展示建議

現場以「真實量界 AI + 真實環境資料」為主流程；若政府 API 失敗，保留真實量界 AI + 固定環境 fixture；若網路或 AI 失敗，切換明確標示的完全本機 Demo。三種狀態不可混稱。
