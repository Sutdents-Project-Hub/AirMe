# 資料與儲存

## P0 資料位置

| 資料 | 位置 | 保留 |
|---|---|---|
| 個人敏感標籤、常用活動與地區 | App／瀏覽器裝置端 | 使用者清除 App 或本機資料時刪除 |
| 行動卡歷史 | 裝置端 | 最多 20 筆摘要，不保存完整模型對話 |
| 活動後回饋 | 裝置端 | 最多 50 筆，只保留完成、感受、短註記與時間 |
| 當次 recommendation request | Azure Functions 記憶體 | 請求完成後不建立個人資料庫 |
| AQI／天氣 cache | 後端短期 cache | 依官方更新頻率設定，不含個資 |
| 技術遙測 | Application Insights | 只含 request ID、耗時、狀態與匿名錯誤分類 |
| 示範 fixture | Repository | 只能使用虛構、可公開資料並標示時間 |

## 不建立 Cosmos DB 的理由

決賽核心不需要雲端個人病歷。加入 Cosmos DB 會同時引入身份、授權、刪除、保留、資料外洩與成本問題。只有在 P0 全部完成且有明確匿名評估需求時，才評估保存不含身份的 aggregate feedback。

## 資料契約

- 來源欄位先正規化，不讓前端依賴政府 API 原始格式。
- 所有時間使用 ISO 8601，回應包含 timezone 與來源觀測時間。
- 每筆環境資料包含 source、observedAt、fetchedAt、stale。
- 使用者條件以受控列舉傳送，不傳自由文字病歷。
- 裝置端最多保存一個粗略地點；座標最多小數三位，不保存精確地址或長期軌跡。
- Schema 版本改變需同步 App、API、fixture、測試與文件。

## 刪除與重設

- App 提供清除個人設定與回饋的操作。
- Web 提供清除本機資料的操作說明。
- 初始化與 Demo 不 seed 真實個資。
- 若未來加入伺服器儲存，必須先補 migration、retention、delete、backup、restore 與存取權限設計。
