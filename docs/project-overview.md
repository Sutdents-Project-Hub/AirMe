# 專案範圍與驗收總覽

## 目標

在 2026-07-26 決賽前完成可實際使用與展示的個人 AirMe：使用者輸入活動情境，系統取得真實環境資料，AI 在官方規則約束下產生行動卡，並能安全追問與回饋。Coolify + PostgreSQL + 量界智算是競賽展示部署路徑；真實外部服務與 VPS 仍待端到端驗證。

## P0

- 單一 Expo 專案支援 iOS、Android、Web。
- 輸入式本機個人檔案、可選帳號登入、活動理解確認、真實 AQI／天氣、行動卡、追問、五秒回饋與整合 Air 日誌。
- 淺綠白跨平台 UI；MapLibre 地圖預覽、Photon 地點搜尋與 Valhalla 路線 adapter。自架服務未配置時明示 fixture／資料不足並保留外部地圖交接。
- Coolify Web + Node.js/Fastify API + PostgreSQL + 量界智算的真實核心流程。
- JSON runtime schema、領域限制、醫療界線、資料新鮮度與錯誤處理。
- 30 個 AI／安全測試案例與清楚標示的離線備援。

## 非 P0

- 教師工作台、班級統計或角色分流。
- 大眾運輸、背景／語音導航、街道級污染路線、Line Bot、推播、Power BI、健康中心整合。
- 跨裝置敏感資料同步、雲端個人健康資料庫與醫療預測。
- 用 PostgreSQL 保存個人設定、活動、回饋或模型對話。

## 元件

| 元件 | 路徑 | 現況 | 下一個外部驗收結果 |
|---|---|---|---|
| AirMe App／Web | `app` | 輸入式個人檔案、帳號頁、理解確認、Air 日誌、MapLibre 路線預覽、LIVE API client、responsive UI、Nginx image | Coolify preview URL／實體 iOS、Android development build |
| Fastify API | `backend` | 帳號 session、七項既有流程加地點搜尋／路線 adapter、政府資料、規則、量界、安全與評估 | 真實量界／MOENV／CWA／Valhalla／Photon／PostgreSQL 端到端呼叫 |
| PostgreSQL | `backend/database` | 環境快取、匿名事件、帳號與 session digest 的 versioned migration | Coolify volume、backup、restore 驗證 |
| 共用契約 | `packages/contracts` | Zod runtime schema 與 TypeScript 型別 | 部署前契約相容性複驗 |

## 驗收摘要

- 相同 AQI、不同活動／個人條件，結果不同且理由可追溯。
- 離題、提示注入與醫療診斷正確拒答。
- 資料缺失、過期、AI 限流與無效輸出不造成錯誤建議。
- App／Web、repository、container、log 與 PostgreSQL 無真實 secret 或學生個資。
- 線上 Demo 可證明量界 AI 參與核心；fallback 不冒充線上結果。

## 未決事項

- VPS、Coolify、網域、TLS、防火牆、備份與回滾 owner。
- 量界智算指定模型、額度、rate limit、JSON mode 相容性。
- Coolify preview、真實量界／環境 API 與完整 provenance 的端到端驗證。
- 實際環境部／中央氣象署 key 與 API 欄位驗證。
- 最終 App 交付格式與決賽設備。
- 原始碼採 MIT License；團隊、學校、競賽、資料與素材的個別授權及 attribution 仍需另行確認。
