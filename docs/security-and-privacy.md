# 安全、身份與隱私

## P0 身份策略

決賽版不要求登入。個人設定與回饋保存在裝置端，後端只接收完成當次建議需要的最小情境。這犧牲跨裝置同步，但避免在短期內建立不完整的未成年人帳號與健康資料系統。

## 不蒐集

- 姓名、學號、學校、生日、電話、Email。
- 精確住址、長期 GPS 軌跡。
- 病歷、診斷證明、藥物或醫療機構紀錄。
- 教師可查看的個人或班級症狀資料。

## 最小化資料

- 使用列舉標籤表示敏感狀態；當下狀況只能出現在使用者主動輸入的單次活動描述。
- 裝置端最多保存一個座標小數三位的粗略地點，不保存精確地址或長期軌跡。
- 決賽版回饋只留在裝置端，不傳送到後端或 Azure。
- request ID 使用不透明隨機值，不由個資推導。

## Secrets

- `.env`、`local.settings.json`、Azure credentials 與 API keys 不提交。
- `EXPO_PUBLIC_*` 永遠視為公開資訊。
- Azure 上優先 Managed Identity；外部 API key 放 Function App settings 或 Key Vault。
- 錯誤與 log 不輸出 secret、endpoint 完整設定或 stack trace。

## 權限與未來帳號

若決賽後需要同步，必須先設計適合未成年人的同意、身份驗證、資料查看、匯出、刪除、保留期與監護流程。沒有這些設計前，不以匿名裝置 ID 冒充安全帳號系統。

## 安全驗收

- 檢查 staged、unstaged、untracked、build bundle 與 log 的 secret。
- 測試惡意輸入、超長輸入、無效列舉、CORS、rate limit 與錯誤回應。
- Demo 與測試只使用虛構人物資料。
- 醫療與提示注入測試依 [AI 安全規格](ai-safety-and-evaluation.md) 執行。

## Azure 共用環境

- 目前已確認 Azure AI 資源位於主辦方共用 subscription／resource group；團隊帳號可使用部分 AI 能力，但 Managed Identity 的角色指派仍需有權限的主辦方協助。
- 不讀取、複製、寫入或輪替其他隊伍資源；部署前先確認命名、quota、rate limit 與負責人。

## 已知工具鏈 advisory

Expo SDK 57 初始化依賴在 2026-07-13 的 `npm audit --omit=dev` 中仍有 11 個 moderate 項目，根因為 Expo／Xcode 建置鏈的舊版 `uuid`。`expo-doctor` 通過 20/20；npm 提供的 force fix 會破壞 Expo 版本，因此決賽初始化不強制覆寫 transitive dependency。每次依賴更新與正式 build 前重新執行 audit，並優先採用 Expo 官方修正版。
