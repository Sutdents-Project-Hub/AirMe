# 學生專案 Profile

本文件是已驗證 Student Project Profile v1 的人類可讀版本；工作用 JSON 保留在 repository 外，不提交原始需求或群組對話。

## 基本資訊

- Schema version：`1`
- Project name：AirMe 空氣健康小管家
- Repository name：`AirMe`
- Project slug：`airme`
- Stage：`competition`
- Product type：`hybrid`
- Bootstrap mode：`executable`
- Deployment：`planned`
- Team：`true`

## 摘要

以個人使用為主的跨平台空氣健康 AI 行動助理，結合即時環境資料、最低限度個人情境與官方準則，產生有依據、可解釋且受安全邊界限制的行動方案。

## 元件

| ID | Path | Kind | Framework | Package manager | Quality commands | Env expected |
|---|---|---|---|---|---|---|
| `client` | `apps/client` | `app` | Expo | npm workspace | `test`、`lint`、`typecheck`、`build:web` | `true` |
| `api` | `services/api` | `backend` | Node.js／Fastify | npm workspace | `test`、`typecheck`、`build`、`evaluate`、`db:migrate` | `true` |
| `contracts` | `packages/contracts` | `library` | Zod／TypeScript | npm workspace | `test`、`typecheck`、`build` | `false` |

三個 workspace 共用根目錄 `package-lock.json`。產品流程、API endpoint、共用 schema、自動化測試、Web Demo、Coolify Compose 與 PostgreSQL migration 已完成；實際 VPS、真實外部 API 呼叫與實體 Mobile 仍未完成驗證。

## 功能領域

- 同一套 AirMe 在 iOS、Android 與 Web 提供個人使用流程
- 最低限度個人敏感條件、常用地點、通勤方式與常見活動設定
- 取得環境部 AQI 與中央氣象署資料並顯示來源與更新時間
- 以自然語言描述活動、時間、地點、強度與當下狀況
- 由量界智算理解個人情境並產生固定格式的行動卡
- 在空品、活動安全與一般自我保護範圍內追問，離題與醫療診斷必須拒答
- 活動後五秒回饋與個人紀錄，決賽版不宣稱醫療因果或成熟預測模型
- 可重播的決賽示範情境與外部服務失敗時的降級展示

## 專案限制

- 決賽日期為 2026-07-26，必須優先完成一條可現場操作的量界智算 AI 核心流程
- App 與 Web 是同一產品的不同入口，不建立教師端、班級端或角色分流
- 不得把量界智算、PostgreSQL、環境部或中央氣象署的秘密放入 App、Web、版本控制或文件
- 未成年人個人與健康情境採資料最小化；決賽版優先保存在裝置端並只傳送當次推論必要內容
- AirMe 不是醫療診斷工具，不判定症狀成因，不取代醫師與緊急協助
- 官方 AQI 與校園活動準則是安全底線，生成式 AI 不得自行發明門檻
- 未經確認不得修改或刪除 VPS、Coolify 或 PostgreSQL 中其他專案的資源
- 初始化不建立外部帳號、資料庫、部署、remote 或 GitHub repository

## 關注事項

- ai
- external-api
- personal-data

## 假設

- 採用 React Native、Expo Router 與 TypeScript，以單一前端專案輸出 iOS、Android 與 Web
- 後端採 Fastify、Node.js 22 與 TypeScript，所有外部 API 與 AI 呼叫皆經後端
- 決賽 P0 不包含班級統計、教師工作台、智慧路線、Line Bot、推播、Power BI 或健康中心串接
- 目前不自動建立 LICENSE，待確認團隊著作權、競賽規則、資料集與素材授權後再決定
- Coolify、VPS、PostgreSQL 與量界智算為規劃部署目標；本機實作已完成，但尚未執行 production 部署

## 未決定事項

- 串接前需確認量界智算的允許模型、JSON mode、速率限制與可用額度
- 團隊尚未指派 VPS／Coolify 發布、監控、備份與回滾負責人
- App 最終交付 APK、Android App Bundle、iOS TestFlight 或現場 Expo development build 的形式仍需在實作階段確認
- 跨裝置登入與雲端同步涉及未成年人資料與身份驗證，決賽 P0 先不承諾
