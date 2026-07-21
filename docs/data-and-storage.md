# 資料與儲存

## P0 資料位置

| 資料 | 位置 | 保留與限制 |
|---|---|---|
| 裝置暱稱、個人敏感標籤、常用活動與地區 | App／瀏覽器裝置端 | 暱稱不需真名且不傳後端；清除 App 或本機資料時刪除 |
| 個人自我描述原稿 | 表單記憶體 | 結構化確認後丟棄，不寫 AsyncStorage、API、log 或 PostgreSQL |
| Air 日誌 | 裝置端 | 最多 20 筆結構化活動、環境與建議摘要；不保存 currentCondition、完整活動文字或模型對話 |
| 活動後回饋 | 裝置端 | 最多 50 筆，只保留是否進行、不舒服程度、建議是否有幫助、短註記與時間 |
| 必要帳號 | PostgreSQL `accounts` | 小寫 Email、顯示名稱、scrypt password hash、隱私同意與建立時間；不包含裝置個人檔案或健康內容 |
| 必要帳號 session | PostgreSQL `account_sessions` + 裝置 SecureStore | 伺服器只保存 HMAC token digest、到期與撤銷資訊；原始 token 只留在使用者裝置安全儲存 |
| 當次 recommendation request | API 記憶體 | 回應後不寫入資料庫或 log；送入量界前移除自訂地點名與座標 |
| 當次 activity intent request | API 記憶體 | 回應後不寫入資料庫或 log；最多回一個澄清問題 |
| 路線起點、終點、時間與方式 | 路線頁與 API request 記憶體 | 僅為當次地點搜尋／Valhalla 路線請求轉送；AirMe 不持久化、不建立軌跡；使用者主動開啟外部地圖時才另受該服務政策約束 |
| AQI／天氣 cache | PostgreSQL `environment_cache` | 受控縣市＋粗略座標 key、固定 `AirMe 粗略位置`名稱、正規化公開資料與取得時間；短期使用 |
| 技術事件 | PostgreSQL `service_events` | request ID、route、status、耗時與時間；不含 IP 或 body |
| 示範 fixture | Repository | 只能使用虛構、可公開資料並標示時間 |

## PostgreSQL 的用途與邊界

使用 PostgreSQL 是為了讓 Coolify API container restart 後仍可重用公開環境資料快取、保存匿名技術事件，並提供最小化的必要帳號驗證。它不是個人健康資料庫，也不作為跨裝置個人資料同步資料庫。

- migration 是版本化 SQL，放在 `backend/database/migrations/`。
- API 只使用 internal Compose network 連線；不對 Internet 公開 `5432`。
- migration 失敗時 API container 不應啟動為健康狀態。
- PostgreSQL password、connection URL、dump 與 backup 都是秘密，不能進入 App bundle、repository、截圖或文件。
- 帳號資料採 `002-accounts.sql` migration；密碼僅以 scrypt hash 存放，session 只保留 token digest。帳號刪除會連帶刪除其 session。
- 快取不保存使用者輸入的地點顯示名。讀取到舊版名稱時先在記憶體正規化，並嘗試以固定名稱回寫。
- 生產前需由 VPS owner 設定加密備份、保存期、存取權限與 restore 演練；尚未完成前不可聲稱備份已驗證。

## 資料契約

- 來源欄位先正規化，不讓前端依賴政府 API 原始格式。
- 所有時間使用 ISO 8601，回應包含來源觀測與取得時間。
- 每筆環境資料包含 source、observedAt、fetchedAt、stale。
- 使用者條件以受控列舉傳送，不傳自由文字病歷。
- `confirmedIntent` 可傳活動、時間、地點文字、強度、時長、當下狀況與目標到 AirMe API，只用於當次推薦；交給量界前將地點文字縮減為操場／公園／道路／室內／戶外等類型。日誌只保存 activity、time、duration、intensity。
- 帳號 Email 在 API 端先正規化為小寫；密碼最少 12 字元，從不寫入 log、技術事件或公開回應。顯示名稱不應填真名，也不與本機 profile 合併。
- 路線與地點搜尋可使用較精確座標，但只存在當次 UI/API 記憶體並送往已部署的 Valhalla／Photon；不得加入 PostgreSQL、日誌、analytics 或推薦 AI prompt。
- 裝置端最多保存一個粗略地點；新輸入四捨五入到小數二位，舊資料相容上限為三位，且只接受臺灣服務範圍，不保存精確地址或長期軌跡。
- Schema 版本改變需同步 App、API、fixture、測試與文件。
- 本機 LocalState version 2 會 migration version 1 的 profile、單一地點、歷史與回饋；舊歷史沒有環境欄位時保留原摘要並顯示資料未保存。舊 `feeling` 回饋保留是否完成與註記，新欄位安全正規化為「不想回答／不確定」，不臆測醫療含義。

## 刪除與重設

- App 提供清除個人設定與回饋的操作。
- Web 提供清除本機資料的操作說明。
- 初始化與 Demo 不 seed 真實個資。
- 清除 App 資料不會影響 PostgreSQL，因資料庫本來就不應保存可識別的個人資料。
- 登出只撤銷目前 session；刪除帳號會刪除帳號與全部 server session，但依隱私優先設計不會刪除裝置端個人檔案、日誌或回饋。使用者可另行在設定中清除本機資料。
- 未來若要雲端同步或保存回饋，仍必須先完成適合未成年人的同意、資料最小化、retention、delete、export、backup、restore 與存取權限設計；不屬於目前實作範圍。
