# AirMe 空氣健康小管家

> 目前階段：競賽／展示｜部署：已規劃，平台尚未確認

## 專案簡介

以個人使用為主的跨平台空氣健康 AI 行動助理，結合即時環境資料、最低限度個人情境與官方準則，產生有依據、可解釋且受安全邊界限制的行動方案。


## 專案資訊

- Repository：`AirMe`
- Project slug：`airme`
- 產品型態：`hybrid`
- Bootstrap 模式：`executable`


## 目標與主要功能

- 同一套 AirMe 在 iOS、Android 與 Web 提供個人使用流程
- 最低限度個人敏感條件、常用地點、通勤方式與常見活動設定
- 取得環境部 AQI 與中央氣象署資料並顯示來源與更新時間
- 以自然語言描述活動、時間、地點、強度與當下狀況
- 由 Azure OpenAI 理解個人情境並產生固定格式的行動卡
- 在空品、活動安全與一般自我保護範圍內追問，離題與醫療診斷必須拒答
- 活動後五秒回饋與個人紀錄，決賽版不宣稱醫療因果或成熟預測模型
- 可重播的決賽示範情境與外部服務失敗時的降級展示

- 只列入本階段已確認、可展示或可驗收的功能；構想與未來功能請明確標示為非本階段範圍。

## 技術與元件

| 路徑 | 責任 | 技術 | 狀態 |
|---|---|---|---|
| `apps/airme` | 行動應用程式 | Expo | 已要求實體 bootstrap；以 manifest 與 lockfile 驗證 |
| `apps/api` | 後端／API | Azure Functions | 已要求實體 bootstrap；以 manifest 與 lockfile 驗證 |

## 專案結構

- 目前只記錄實際存在的元件；不建立未使用的空資料夾。
- 每個獨立元件依自己的 manifest、README 與框架慣例安裝、啟動、測試及建置。

## 快速開始

初始化器已確認 framework manifest、選定的 lockfile 與 Profile 要求的品質 script 存在；這不代表指令已執行成功。請實際執行元件 README 列出的檢查，然後補上已驗證的前置需求、安裝、啟動、port 與本機 URL。

## 測試與品質

只記錄實際存在且已執行成功的 lint、typecheck、test、build 或手動驗收方式。若目前沒有自動化測試，請明確記錄主要人工驗收流程與限制。

## 環境變數與敏感資訊

- 真實值只存放於本機或部署平台，不提交 `.env`。
- 以 `.env.example` 記錄必要的變數名稱、用途與安全 placeholder；公開前端設定不可用來保存秘密。

## 部署狀態

目前狀態：已規劃，平台尚未確認。只有在設定與流程實際驗證後，才補上平台、base directory、build/start command、port、healthcheck、資料與回滾方式。

## Git 與版本控制

- Repository 名稱：`AirMe`
- 全新專案由初始化器建立本機 `main` branch，並在安全掃描後以 `chore(init): 初始化學生專案結構` 提交本次初始化產物。
- 既有 Git repository 保留原 branch 與歷史，不自動 commit。
- 初始化不設定 `user.name`／`user.email`，不建立 remote，也不 push；後續 Git 操作遵守 [AGENTS.md](AGENTS.md)。
- 後續操作先以 `git remote -v` 判斷本機或遠端模式；只要求 commit 時維持目前分支，獲准合併並驗證 `main` 後才安全關閉已完整合併的任務 branch。

## 文件索引

- [專案 Profile](docs/project-profile.md)
- [專案範圍與驗收](docs/project-overview.md)
- [競賽與展示準備](docs/competition.md)
- [部署說明](docs/deployment.md)
- [安全、身份與隱私](docs/security-and-privacy.md)
- [資料與儲存](docs/data-and-storage.md)
- [外部整合與 AI](docs/integrations.md)
- [apps/airme 元件說明](apps/airme/README.md)
- [apps/api 元件說明](apps/api/README.md)

## 維護與交接

- 開發規則請見 [AGENTS.md](AGENTS.md)。
- 功能、架構、指令、環境變數、部署或限制改變時，需同步更新相關文件。
- LICENSE、資料集、模型與素材授權須依作者、學校及競賽規則確認，不由初始化工具自行決定。
