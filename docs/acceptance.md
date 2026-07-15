# AirMe 決賽驗收清單

## 目前驗收狀態

| 驗收項目 | 狀態 | 證據／限制 |
|---|---|---|
| 輸入式本機個人檔案與 Demo 首頁 | 通過 | 1280×720 本機瀏覽器操作、profile parser／元件測試；手機實機待驗證 |
| 活動結構化理解、單一澄清與確認 | 通過 | fixture 瀏覽器流程、API／parser／元件測試 |
| 結構化行動卡與資料來源 | 通過 | fixture 流程、schema 與元件測試 |
| 醫療拒答、追問、回饋與 Air 日誌 | 通過 | 自動化測試；改版後完整瀏覽器回饋流程待複驗 |
| 安全路線交接與資料不足 | 通過 | 本機瀏覽器頁面、route fallback 元件測試；未配置即時 provider |
| Responsive Web | 部分通過 | 1280×720 桌面實際檢查、375px 導覽元件測試；390×844 改版視覺待複驗 |
| 共用資料契約 | 通過 | Zod runtime schema 與契約測試 |
| API orchestration、規則與安全處理 | 通過 | fixture／mock 自動化測試；本機 Docker 五 endpoint image 已重建 |
| 30 個安全評估案例 | 通過 | `npm run evaluate` 30/30 |
| Web production static export | 通過 | `npm run build:web --workspace airme` |
| 自動化品質基線 | 通過 | lint、typecheck、99 項測試、production build 與安全評估 30/30 |
| 真實 MOENV／CWA 呼叫 | 未驗證 | adapter 已完成；尚未使用真實 key |
| 真實量界智算呼叫 | 未驗證 | adapter 已完成；尚未以真實 token 與 model ID 執行 |
| Coolify／PostgreSQL 部署 | 未驗證 | Compose 與 migration 已完成，沒有 production URL |
| 實體 iOS／Android | 未驗證 | 尚未在決賽設備執行 |

## 核心流程驗收

1. 新裝置顯示免登入個人檔案；只要求裝置暱稱與日常描述，不要求 Email、密碼、真名、學號或病歷，確認後不保存原始描述。
2. 完成設定後可看到環境資料的來源、時間與資料模式。
3. 輸入「下午四點想在操場全力跑 30 分鐘」先看到 activity、time、location、intensity、duration 與 currentCondition；確認後才得到固定格式行動卡。
4. 相同 AQI 下，敏感條件或劇烈活動不得得到比一般短時間活動更寬鬆的風險。
5. 行動卡至少顯示風險、建議方案、理由、安全提醒與 provenance。
6. 追問「如果改室內呢」可在原情境回答，不重猜環境資料。
7. 詢問診斷／藥物、離題問題或提示注入時，不執行要求並引導回產品範圍。
8. 出現呼吸困難、胸痛或昏厥等描述時，停止一般建議並提示立即求助。
9. 回饋保存後可在 Air 日誌看到活動、環境、建議與主觀回饋；清除後個人檔案、日誌與回饋全部移除。
10. Demo 模式全程標示示範資料，不宣稱是即時 AI。
11. 路線沒有 provider 時不顯示距離、時間、污染分數或「最低污染」，只在使用者點擊後開啟外部地圖。

## API 驗收

- 非法欄位、超長文字、無效列舉或高精度座標回 `INVALID_REQUEST`。
- 環境來源包含 provider、URL、observedAt、fetchedAt、stale 與 provenance。
- 資料缺失採高風險保守處理；資料過期再提高一級風險。
- 模型輸出無效或含醫療因果時不顯示原文，使用安全降級。
- 追問情境 token 為短效 HMAC，過期或遭竄改不可使用。
- CORS 僅允許設定來源；公開錯誤不含 stack trace、key、endpoint 或 provider body。

## 發布前剩餘門檻

- 以團隊量界 token 與指定 model ID 執行真實 AI 流程並保存不含秘密的證據。
- 以真實 MOENV／CWA 帳號驗證欄位、額度、attribution、更新頻率與 fallback。
- 部署 preview 後驗證同源 `/api`、API／PostgreSQL healthcheck、P50／P95、429、timeout 與 log／資料庫 redaction。
- 在至少一台 Android 實機與決賽 Web 瀏覽器重跑核心流程。
- 完成素材、字型、開放資料、競賽規則與 LICENSE 人工審查。
