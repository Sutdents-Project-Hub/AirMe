# AirMe 決賽驗收清單

## 目前驗收狀態

| 驗收項目 | 狀態 | 證據／限制 |
|---|---|---|
| 輸入式本機個人檔案與 Demo 首頁 | 通過 | 1280×720 本機瀏覽器操作、profile parser／元件測試；手機實機待驗證 |
| 活動結構化理解、單一澄清與確認 | 通過 | fixture 瀏覽器流程、API／parser／元件測試 |
| 結構化行動卡與資料來源 | 通過 | fixture 流程、schema 與元件測試 |
| 醫療拒答、追問、回饋與 Air 日誌 | 通過 | 自動化測試與 390px 完整瀏覽器回饋／日誌流程 |
| 可選帳號註冊／登入／登出／刪除 | 通過（自動化） | scrypt／session HMAC、API handler 與 App 元件測試；真實 SMTP／Email 驗證尚未建立 |
| 路線規劃與地圖安全降級 | 通過（fixture／元件） | Valhalla／Photon adapter、MapLibre route 元件與 fallback 測試；自架 live provider 尚未部署 |
| Responsive Web | 部分通過（本機） | Web static export、390px／桌面版面與元件測試已通過；Desktop Chromium 的 Playwright fixture 核心流程 E2E 已通過，實體決賽設備待驗證 |
| 共用資料契約 | 通過 | Zod runtime schema 與契約測試 |
| API orchestration、規則與安全處理 | 通過 | fixture／mock 自動化測試；本機 Docker 五 endpoint、緊急 422 與 malformed JSON 400 已實際驗證 |
| 30 個安全評估案例 | 通過 | `npm run evaluate` 30/30 |
| Web production static export | 通過 | `npm run build:web --workspace airme` |
| 自動化品質基線 | 通過（本輪） | lint、三個 workspace typecheck、206 項測試（12 + 138 + 56）、production Web export、安全評估 30/30 與 Playwright fixture E2E 已通過 |
| 真實 MOENV／CWA 呼叫 | 未驗證 | adapter 已完成；尚未使用真實 key |
| 真實量界智算呼叫 | 未驗證 | adapter 已完成；尚未以真實 token 與 model ID 執行 |
| Coolify／PostgreSQL 部署 | 未驗證 | Compose 與 migration 已完成，沒有 production URL |
| 本機 Compose／PostgreSQL | 通過 | `airme` 三容器 healthy，API 以 non-root `node` 執行；migration 後僅有 `environment_cache`、`schema_migrations`、`service_events` |
| Coolify／量界競賽展示核心 | 未驗證 | 部署方向已確認；尚未取得 VPS、真實量界／政府 API 與 production URL 的端到端證據 |
| 實體 iOS／Android | 未驗證 | 尚未在決賽設備執行 |

## 核心流程驗收

1. 新裝置仍可免登入建立本機個人檔案；只要求裝置暱稱與日常描述，不要求真名、學號或病歷，確認後不保存原始描述。使用者可自願建立 Email 帳號，但不會因此同步本機健康內容。
2. 完成設定後可看到環境資料的來源、時間與資料模式。
3. 輸入「下午四點想在操場全力跑 30 分鐘」先看到 activity、time、location、intensity、duration 與 currentCondition；確認後才得到固定格式行動卡。
4. 相同 AQI 下，敏感條件或劇烈活動不得得到比一般短時間活動更寬鬆的風險。
5. 行動卡至少顯示風險、建議方案、理由、安全提醒與 provenance。
6. 追問「如果改室內呢」可在原情境回答，不重猜環境資料。
7. 詢問診斷／藥物、離題問題或提示注入時，不執行要求並引導回產品範圍。
8. 出現呼吸困難、胸痛或昏厥等描述時，停止一般建議並提示立即求助。
9. 回饋保存後可在 Air 日誌看到活動、環境、建議與主觀回饋；清除後個人檔案、日誌與回饋全部移除。
10. Demo 模式全程標示示範資料，不宣稱是即時 AI。
11. 路線在已部署 provider 時可顯示不同移動方式的距離／預估時間與 MapLibre 路線預覽，但不顯示污染分數、「最低污染」、街道級 AQI 或 turn-by-turn 導航；provider 不可用時安全降級並可由使用者主動開啟外部地圖。
12. 登入失敗不洩漏帳號存在與否；登出後 session 失效；刪除帳號後 server session 不可再用，且使用者清楚知道本機資料要另行清除。

## API 驗收

- 非法欄位、超長文字、無效列舉、臺灣範圍外或高精度座標回 `INVALID_REQUEST`；縣市／測站距離錯配不混合成 live 資料。
- 環境來源包含 provider、URL、observedAt、fetchedAt、stale 與 provenance。
- 資料缺失採高風險保守處理；資料過期再提高一級風險。
- 模型輸出無效或含醫療因果時不顯示原文，使用安全降級。
- 追問情境 token 為短效 HMAC，過期或遭竄改不可使用。
- CORS 僅允許設定來源；公開錯誤不含 stack trace、key、endpoint 或 provider body。
- 密碼不寫入資料庫明文、log 或公開回應；資料庫 session 只保存 token digest。路線／搜尋 request 不寫入 database 或 service events。

## 發布前剩餘門檻

- 以團隊量界 token 與指定 model ID 執行真實 AI 流程並保存不含秘密的證據。
- 依 Coolify／量界部署路徑完成 preview，驗證線上 AI、環境資料、同源 `/api` 與 provenance。
- 以真實 MOENV／CWA 帳號驗證欄位、額度、attribution、更新頻率與 fallback。
- 部署正式網域與 SMTP／Email 驗證、忘記密碼／重設與適合未成年人的帳號流程後，才宣稱帳號可以作為 production identity。
- 若要啟用 live 地圖，另行部署並驗證 Valhalla／Photon、台灣 OSM 圖資、MapLibre style／tile provider、attribution、資源用量與行動裝置 development build。
- 部署 preview 後驗證同源 `/api`、API／PostgreSQL healthcheck、P50／P95、429、timeout 與 log／資料庫 redaction。
- 在至少一台 Android 實機與決賽 Web 瀏覽器重跑核心流程。
- 完成素材、字型、開放資料、競賽規則與第三方授權人工審查；原始碼 MIT License 已加入，個別資料與素材授權仍須逐項確認。
