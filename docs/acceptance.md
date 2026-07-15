# AirMe 決賽驗收清單

## 目前驗收狀態

| 驗收項目 | 狀態 | 證據／限制 |
|---|---|---|
| 初次設定、Demo 首頁與活動輸入 | 通過 | 手機瀏覽器實際操作 |
| 結構化行動卡與資料來源 | 通過 | fixture 流程、schema 與元件測試 |
| 醫療拒答、追問、回饋與歷史 | 通過 | 手機瀏覽器實際操作與自動化測試 |
| Responsive Web | 通過 | 375×812 與 1440px 桌面檢查 |
| 共用資料契約 | 通過 | Zod runtime schema 與契約測試 |
| API orchestration、規則與安全處理 | 通過 | fixture／mock 自動化測試與本機 Fastify 四 endpoint smoke |
| 30 個安全評估案例 | 通過 | `npm run evaluate` 30/30 |
| Web production static export | 通過 | `npm run build:web --workspace airme` |
| 真實 MOENV／CWA 呼叫 | 未驗證 | adapter 已完成；尚未使用真實 key |
| 真實量界智算呼叫 | 未驗證 | adapter 已完成；尚未以真實 token 與 model ID 執行 |
| Coolify／PostgreSQL 部署 | 未驗證 | Compose 與 migration 已完成，沒有 production URL |
| 實體 iOS／Android | 未驗證 | 尚未在決賽設備執行 |

## 核心流程驗收

1. 新裝置先顯示最小設定，不要求姓名、帳號或病歷。
2. 完成設定後可看到環境資料的來源、時間與資料模式。
3. 輸入「下午四點想在操場全力跑 30 分鐘」可得到固定格式行動卡。
4. 相同 AQI 下，敏感條件或劇烈活動不得得到比一般短時間活動更寬鬆的風險。
5. 行動卡至少顯示風險、建議方案、理由、安全提醒與 provenance。
6. 追問「如果改室內呢」可在原情境回答，不重猜環境資料。
7. 詢問診斷／藥物、離題問題或提示注入時，不執行要求並引導回產品範圍。
8. 出現呼吸困難、胸痛或昏厥等描述時，停止一般建議並提示立即求助。
9. 回饋保存後可在紀錄看到摘要；清除資料後設定、紀錄與回饋全部移除。
10. Demo 模式全程標示示範資料，不宣稱是即時 AI。

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
