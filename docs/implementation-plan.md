# AirMe 決賽實作與部署計畫

## 執行原則

- 先打通一條真實量界 AI + 官方環境資料 + Coolify API 的垂直流程，再擴充畫面。
- 每個里程碑必須能操作、測試與回退，不以完成頁面數計算進度。
- 個人資料最小化：PostgreSQL 服務公開環境快取、匿名技術事件與最小化帳號／session 驗證；不作為個人健康資料同步資料庫。
- 新功能只有在 P0 驗收全通過後才加入。
- 每天結束前更新文件、保留上一個可工作的版本；未經授權不 commit、push 或部署。

## 目前進度（2026-07-20）

- M0 完成：產品規格、架構、安全與 Coolify 部署文件已完成；Coolify／量界是競賽展示部署方向。
- M1 本機完成、live 待驗證：Fastify API、量界 OpenAI 相容 adapter、JSON／Zod 驗證、規則、行動卡與追問已完成。
- M2 本機完成、live 待驗證：MOENV／CWA adapter、來源時間、timeout、cache、partial／stale／fixture 降級已完成；PostgreSQL cache migration 已加入。
- M3 完成：淺綠白設計系統、輸入式裝置個人檔案、活動理解確認／單一澄清、行動卡、限定追問、五秒回饋、整合 Air 日誌與 responsive Web 已完成。
- M4 完成：30 個固定案例、安全錯誤路徑與離線示範 fixture 已完成；緊急狀況在離線 Demo 也會停止一般建議。
- M4.1 完成：必要帳號 session（scrypt + token digest）與登入入口、MapLibre 路線預覽、Valhalla／Photon adapter 與安全降級已完成；帳號不同步本機敏感資料，起終點不持久化。
- M5 待執行：尚未取得 VPS／Coolify／量界／政府 API production 設定，沒有實體 mobile 或線上部署證據。

## 剩餘里程碑

### M5：Coolify 與真實整合驗證

1. 建立 Coolify Compose application，將公開網域綁定 `web:80` 並完成 TLS。
2. 以 secret 注入 PostgreSQL、量界、環境部、中央氣象署、context signing 與 account session signing 設定。
3. 確認 PostgreSQL migration、`/api/health`、Web 同源 `/api` proxy 與 container restart。
4. 使用真實量界 model ID 驗證 JSON mode；若模型拒絕該參數，才在有證據下將 `LIANGJIE_AI_JSON_MODE` 改為 `disabled`。
5. 以真實政府資料驗證來源、欄位、更新時間、cache、stale、partial、timeout、429。
6. 確認應用 log／PostgreSQL 沒有 activity text、profile、prompt、模型全文、IP 或 secret，並檢查 Coolify／VPS 外層 proxy 的 IP log 保存政策。
7. Playwright fixture 瀏覽器核心流程已通過；仍須在至少一台 Android 實機與決賽 Web 瀏覽器重跑核心流程。
8. 若決賽要展示 live 路線，先在 internal network 部署 Valhalla／Photon、台灣 OSM 圖資與 MapLibre production style／tiles，驗證 attribution、timeout、資源與隱私；否則維持安全降級與外部地圖交接。

完成條件：決賽設備與網路能完成線上流程；資料庫與 API health 正常；備援流程也已演練。

### M6：備份、Demo 與凍結

- 由 VPS owner 設定加密 PostgreSQL backup、保留期與至少一次 restore 測試。
- 簡報只保留問題缺口、AI 核心、真實架構、安全、驗證與 Demo。
- 3–5 分鐘 Demo 完整排練至少 5 次，涵蓋正常網路、慢網路、AI 限流三種情境。
- 7/25 後停止非必要功能與依賴變更；保留已驗證 image／deployment 以供回滾。

## 每日 Definition of Done

- 實作符合產品規格與資料契約。
- lint、typecheck、build 與相關測試通過。
- 正常、錯誤和資料不足至少各測一次。
- 沒有新增真實 secret、個資或無授權素材。
- README／docs 與實際指令、環境變數和限制同步。
- 可展示結果清楚標示為 live、fixture 或尚未驗證。
