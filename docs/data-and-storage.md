# 資料與儲存

## P0 資料位置

| 資料 | 位置 | 保留與限制 |
|---|---|---|
| 個人敏感標籤、常用活動與地區 | App／瀏覽器裝置端 | 使用者清除 App 或本機資料時刪除 |
| 行動卡歷史 | 裝置端 | 最多 20 筆摘要，不保存完整模型對話 |
| 活動後回饋 | 裝置端 | 最多 50 筆，只保留完成、感受、短註記與時間 |
| 當次 recommendation request | API 記憶體 | 回應後不寫入資料庫或 log |
| AQI／天氣 cache | PostgreSQL `environment_cache` | 粗略座標 key、正規化公開資料與取得時間；短期使用 |
| 技術事件 | PostgreSQL `service_events` | request ID、route、status、耗時與時間；不含 IP 或 body |
| 示範 fixture | Repository | 只能使用虛構、可公開資料並標示時間 |

## PostgreSQL 的用途與邊界

使用 PostgreSQL 是為了讓 Coolify API container restart 後仍可重用公開環境資料快取，並在不保存使用者內容的前提下協助診斷服務是否健康。它不是個人資料庫。

- migration 是版本化 SQL，放在 `backend/database/migrations/`。
- API 只使用 internal Compose network 連線；不對 Internet 公開 `5432`。
- migration 失敗時 API container 不應啟動為健康狀態。
- PostgreSQL password、connection URL、dump 與 backup 都是秘密，不能進入 App bundle、repository、截圖或文件。
- 生產前需由 VPS owner 設定加密備份、保存期、存取權限與 restore 演練；尚未完成前不可聲稱備份已驗證。

## 資料契約

- 來源欄位先正規化，不讓前端依賴政府 API 原始格式。
- 所有時間使用 ISO 8601，回應包含來源觀測與取得時間。
- 每筆環境資料包含 source、observedAt、fetchedAt、stale。
- 使用者條件以受控列舉傳送，不傳自由文字病歷。
- 裝置端最多保存一個粗略地點；座標最多小數三位，不保存精確地址或長期軌跡。
- Schema 版本改變需同步 App、API、fixture、測試與文件。

## 刪除與重設

- App 提供清除個人設定與回饋的操作。
- Web 提供清除本機資料的操作說明。
- 初始化與 Demo 不 seed 真實個資。
- 清除 App 資料不會影響 PostgreSQL，因資料庫本來就不應保存可識別的個人資料。
- 若未來要保存帳號或回饋，必須先完成同意、資料最小化、retention、delete、export、backup、restore 與存取權限設計；不在決賽 P0 內。
