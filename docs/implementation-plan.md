# AirMe 決賽實作計畫

## 1. 執行原則

- 先打通一條真實 Azure AI 垂直流程，再擴充畫面。
- 每個里程碑必須能操作、測試與回退，不以完成頁面數計算進度。
- 新功能只有在 P0 驗收全通過後才可加入。
- 每天結束前更新文件、錄一段短 Demo、保留上一個可工作的版本。
- Azure 共用資源只做獲准操作；任何 quota、RBAC 或模型問題立即切換到既定替代方案，不臨時加服務。

## 目前進度（2026-07-13）

- M0 完成：規格、架構、安全、部署與競賽文件已同步。
- M1 本機部分完成：recommendation endpoint、Azure OpenAI adapter、Structured Output schema、規則與前端行動卡已完成；真實 Azure 呼叫待主辦方權限與 deployment 驗證。
- M2 本機部分完成：MOENV／CWA adapter、來源時間、timeout、cache、partial／stale／fixture 降級已完成；真實 key 呼叫待驗證。
- M3 完成：初次設定、活動輸入、行動卡、限定追問、五秒回饋、裝置端紀錄與 responsive Web 已完成。
- M4 本機完成：30 個固定案例、錯誤／安全路徑與離線示範 fixture 已完成。
- M5、M6 未執行：沒有部署授權，且實體 Mobile、真實 Azure、監控與決賽排練仍待團隊完成。

## 2. 里程碑

### M0：初始化與規格凍結（2026-07-13，已完成）

- 可執行 Expo 與 Azure Functions 官方骨架。
- Student Project Profile、產品規格、架構、安全、部署與競賽文件。
- 單一個人 AirMe 定位；教師／班級功能移出 P0。
- 技術指令與安全掃描通過。

### M1：第一條 Azure AI 垂直流程（本機完成，live 待驗證）

- 確認主辦方 Azure deployment、RBAC 與配額。
- 建立 `POST /api/recommendations` 最小 endpoint。
- 先用固定、可公開測試環境資料完成：輸入 -> 規則 -> Azure OpenAI -> Structured Output -> 驗證 -> 前端行動卡。
- 建立至少 10 個 AI 正常／拒答案例。
- 產出可錄影的線上證據。

完成條件：手機或 Web 輸入一個活動後，得到真的經 Azure 產生且通過 Schema 的行動卡。

### M2：真實環境資料（adapter 完成，live 待驗證）

- 串接環境部 AQI API。
- 串接中央氣象署資料或先使用明確核准的必要天氣欄位。
- 標準化測站、時間、污染物與 stale 狀態。
- API key 全部留在後端。
- 加入 timeout、cache 與失敗狀態。

完成條件：行動卡能顯示真實資料來源與觀測時間；資料失效時不冒充最新值。

### M3：完整個人流程（已完成）

- 初次設定。
- 今日活動輸入與必要澄清。
- 行動卡詳細內容。
- 限定追問。
- 五秒回饋與裝置端紀錄。
- App／Web responsive layout。

完成條件：App 和 Web 都能完成相同的端到端個人流程。

### M4：安全、失敗與評估（本機已完成）

- 完成至少 30 個固定測試案例。
- 跑題、提示注入、醫療、嚴重症狀、資料缺失、過期、429、timeout、無效 JSON。
- 檢查 log 與回應不含 secret／敏感 payload。
- 建立清楚標示的離線示範 fixture。
- 記錄 latency、Schema 成功率與人工評估。

完成條件：核心正常與失敗案例都有可重現結果，沒有以 fallback 冒充 Azure 線上結果。

### M5：部署與真機排練（待授權與外部環境）

- Web 部署到 Azure Static Web Apps。
- API 部署到 Azure Functions。
- Managed Identity／RBAC、CORS、Application Insights 設定完成。
- Android 實體機與決賽瀏覽器驗證。
- 檢查共用 Azure quota 與冷啟動。

完成條件：決賽設備與網路可以完成線上流程；備援流程也已演練。

### M6：簡報、Demo 與凍結（待團隊排練）

- 簡報只保留問題缺口、AI 核心、真實架構、安全、驗證與 Demo。
- 3-5 分鐘 Demo 完整排練至少 5 次。
- 準備正常網路、慢網路、Azure 限流三種情境。
- 7/25 後停止非必要功能與依賴變更。

### 決賽日（7/26）

- 提前登入並驗證 Azure 與展示設備。
- 開啟線上狀態頁與離線 fixture，但預設展示真實 Azure 流程。
- 不在現場修改 production 設定或共用 deployment。

## 3. 建議開發順序

1. TypeScript request／response Schema。
2. 官方規則資料結構與單元測試。
3. Azure OpenAI adapter 與假 adapter。
4. Recommendation orchestration。
5. 最小 HTTP endpoint。
6. 前端 API client 與單一行動卡。
7. AQI／天氣 adapter。
8. 個人設定、追問與回饋。
9. 安全測試與部署。

不要先做完整首頁、動畫、地圖、圖表或帳號；否則會再次出現外觀完整但 AI 核心未打通的問題。

## 4. 任務責任建議

團隊可按責任並行，但契約必須先凍結：

- AI／Backend：Schema、規則、Azure OpenAI、政府 API、錯誤與遙測。
- App／Web：使用流程、行動卡、responsive layout、裝置端資料與 fallback UI。
- Evidence／QA：測試資料集、來源、Demo 錄影、評估表、安全與簡報證據。

每個 PR／checkpoint 只能處理一個可理解目的，不能將 UI、模型、部署與大量重構混在一起。

## 5. 每日 Definition of Done

- 實作符合產品規格與資料契約。
- lint、typecheck、build 與相關測試通過。
- 正常、錯誤和資料不足至少各測一次。
- 沒有新增真實 secret、個資或無授權素材。
- README／docs 與實際指令、環境變數和限制同步。
- 可展示結果有截圖或短錄影，並標示是線上、fixture 或尚未完成。

## 6. 停止線

出現以下情況時停止加功能，優先修復：

- Azure AI 主流程尚未穩定。
- 無法說明 AI 輸入、規則、輸出與拒答。
- App 與 Web 使用不同產品邏輯。
- 真實資料沒有時間與來源。
- Schema、secret 或隱私檢查失敗。
- Demo 只能靠現場即興輸入或單一共用 deployment 才能成功。
