# 安全、身份與隱私

## P0 身份策略

決賽版不要求登入。個人設定與回饋保存在裝置端，後端只接收完成當次建議需要的最小情境。這犧牲跨裝置同步，但避免在短期內建立不完整的未成年人帳號與健康資料系統。

## 不蒐集與不保存

- 姓名、學號、學校、生日、電話、Email。
- 精確住址、長期 GPS 軌跡與 IP 位址。
- 病歷、診斷證明、藥物或醫療機構紀錄。
- 教師可查看的個人或班級症狀資料。
- PostgreSQL 中的活動文字、profile、回饋、完整 prompt、context token、模型完整輸出或 provider 錯誤 body。

## 最小化資料

- 使用列舉標籤表示敏感狀態；當下狀況只存在於使用者主動輸入的單次 request。
- 裝置端最多保存一個座標小數三位的粗略地點，不保存精確地址或長期軌跡。
- 回饋只留在裝置端，不傳送到 API、量界智算或 PostgreSQL。
- PostgreSQL `environment_cache` 只存公開環境資料；`service_events` 只存不透明 request ID、route、狀態碼、耗時與時間。
- request ID 是隨機值，不由個資推導。

## Secrets

- `.env`、Coolify secret、PostgreSQL password／URL、量界 token、環境部／中央氣象署 key、備份檔都不提交。
- `EXPO_PUBLIC_*` 永遠視為公開資訊；不得放任何 secret。
- 全部 secret 只由 Coolify Environment Variables 或本機忽略的 `.env` 注入 API container。
- 容器、API 回應、PostgreSQL 技術事件與 log 不輸出 secret、endpoint 完整設定、request／response body 或 stack trace。
- 量界官方公開文件中的範例 token 不應被使用、複製或視為安全；若曾被任何人使用，應在供應商控制台撤銷並重新建立。

## VPS、Coolify 與資料庫

- Coolify 公開網域只指向 `web:80`；`api:3000` 與 `postgres:5432` 保持 Compose internal network。
- VPS owner 必須保護 Coolify 管理帳號、SSH、firewall、OS 更新與 PostgreSQL volume；這些是平台責任，不能只靠程式碼補足。
- PostgreSQL volume backup 必須加密、限制存取並有保存期；production 前需驗證 restore，否則部署文件保持「未驗證」。
- `CONTEXT_SIGNING_SECRET` 需使用高熵隨機值；不要重複使用 PostgreSQL 密碼或 AI token。
- 不以 Docker image、Compose 檔或 repository 取代 secret manager；Compose 只引用環境變數名稱。

## 權限與未來帳號

若決賽後需要同步，必須先設計適合未成年人的同意、身份驗證、資料查看、匯出、刪除、保留期與監護流程。沒有這些設計前，不以匿名裝置 ID 冒充安全帳號系統。

## 安全驗收

- 檢查 staged、unstaged、untracked、Docker image、bundle、Compose resolved config 與 log 的 secret。
- 測試惡意輸入、超長輸入、無效列舉、CORS、錯誤回應、AI timeout／無效 JSON。
- Demo 與測試只使用虛構人物資料。
- 查驗 PostgreSQL table／log 不含 activity text、profile、prompt、模型輸出與 IP。
- 醫療與提示注入測試依 [AI 安全規格](ai-safety-and-evaluation.md) 執行。

## 已知工具鏈 advisory

Expo SDK 57 初始化依賴在 2026-07-13 的 `npm audit --omit=dev` 中曾有 Expo／Xcode 建置鏈的 transitive advisory。每次依賴更新與正式 build 前重新執行 audit；不要以 `npm audit fix --force` 破壞 Expo 版本相容性。
