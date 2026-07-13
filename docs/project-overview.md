# 專案範圍與驗收總覽

## 目標

在 2026-07-26 決賽前完成一個可實際使用與展示的個人 AirMe：使用者輸入活動情境，系統取得真實環境資料，Azure OpenAI 產生受官方規則約束的行動卡，並能安全追問與回饋。

## P0

- 單一 Expo 專案支援 iOS、Android、Web。
- 個人設定、活動輸入、真實 AQI／天氣、行動卡、追問、五秒回饋。
- Azure Functions + Azure OpenAI Responses API 真實核心流程。
- 固定 JSON Schema、領域限制、醫療界線、資料新鮮度與錯誤處理。
- 30 個 AI／安全測試案例。
- Azure 部署與清楚標示的離線展示備援；其中離線備援已完成，Azure 部署尚未執行。

## 非 P0

- 教師工作台、班級統計或角色分流。
- 智慧路線、Line Bot、推播、Power BI、健康中心整合。
- Azure Machine Learning、個人敏感閾值與疾病／症狀預測。
- 帳號、跨裝置同步與個人健康資料庫。
- 以大量圖表或 Azure 服務數量作為作品核心。

## 元件

| 元件 | 路徑 | 現況 | 下一個外部驗收結果 |
|---|---|---|---|
| AirMe App／Web | `apps/client` | 完整 Demo、LIVE API client、本機資料與 responsive UI | 實體 iOS／Android與 preview URL 驗證 |
| Azure Functions API | `services/api` | 四個 endpoint、政府資料 adapter、規則、Azure OpenAI adapter、安全與評估 | 真實 Azure／MOENV／CWA 端到端呼叫 |
| 共用契約 | `packages/contracts` | Zod runtime schema 與 TypeScript 型別 | 部署前契約相容性複驗 |

## 驗收摘要

- 相同 AQI、不同活動／個人條件，結果不同且理由可追溯。
- 離題、提示注入與醫療診斷正確拒答。
- 資料缺失、過期、AI 限流與無效輸出不造成錯誤建議。
- App／Web、repository 與 log 無真實 secret 或學生個資。
- 線上 Demo 可證明 Azure 參與核心；fallback 不冒充線上結果。

完整規格見 [產品規格](product-spec.md)，執行時程見 [實作計畫](implementation-plan.md)。

## 未決事項

- 主辦方核准的 Azure OpenAI deployment、RBAC、速率與額度。
- 最終 App 交付格式與決賽設備。
- 決賽後是否加入帳號與跨裝置同步。
- 團隊、學校、競賽、資料與素材確認後的 LICENSE 選擇。
