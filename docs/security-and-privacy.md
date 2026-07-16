# 安全、身份與隱私

## P0 身份策略

決賽版不要求登入。使用者建立「此裝置個人檔案」，可選一個不需真名的本機暱稱；它不是帳號，不產生 Email、密碼、token 或匿名裝置 ID。個人設定、日誌與回饋保存在裝置端，後端只接收完成當次理解／建議需要的最小情境。

## 不蒐集與不保存

- 姓名、學號、學校、生日、電話、Email。
- 精確住址與長期 GPS 軌跡。AirMe App／API／PostgreSQL 不建立 IP 欄位；網路與 Coolify reverse proxy 仍會處理連線 IP，production 必須限制其 log 與保存期。
- 病歷、診斷證明、藥物或醫療機構紀錄。
- 教師可查看的個人或班級症狀資料。
- PostgreSQL 中的活動文字、profile、回饋、完整 prompt、context token、模型完整輸出或 provider 錯誤 body。
- 路線起點、終點、查詢歷史或精確路徑。

## 最小化資料

- 使用列舉標籤表示敏感狀態；當下狀況只存在於使用者主動輸入的單次 request。
- 個人自我描述原稿只存在表單記憶體；確認後只保存受控 profile 欄位與本機暱稱。
- 裝置端最多保存一個臺灣服務範圍內、四捨五入到小數二位的粗略地點；API 只為舊資料相容接受到三位，不保存精確地址或長期軌跡。
- 回饋只留在裝置端，不傳送到 API、量界智算或 PostgreSQL。
- PostgreSQL `environment_cache` 只存公開環境資料、粗略座標 key 與固定非個資地點名；`service_events` 只存不透明 request ID、route、狀態碼、耗時與時間。
- request ID 是隨機值，不由個資推導。
- `service_events` 不接受 client 提供的 request ID，伺服器每次產生隨機 UUID，避免 header 注入個資。
- 環境查詢使用 `POST /api/environment`，粗略地點只放在 request body，不放入 URL query；Nginx／Fastify 不記錄 request body，因此一般 access log 不會保存地點名稱或座標。
- 推薦送往量界前再最小化：移除自訂地點顯示名、座標、通勤方式與重複的環境地點，只傳結構化活動欄位、活動地點類型、受控年齡／敏感標籤、受控縣市、環境事實與官方規則底線。
- 短效追問 token 只簽入結構化活動摘要、受控縣市、環境事實與規則底線；不簽入原始活動文字、自訂地點名、座標或 currentCondition。

## 路線與外部地圖

- AirMe 不保存或傳送路線輸入；只有使用者按下「開啟外部地圖」後，瀏覽器／App 才將當次起終點交給外部地圖服務。
- 此交接受外部服務自己的隱私政策約束；AirMe 不讀取外部帳號、地圖歷史、cookie 或位置權限。
- 未配置可信 route provider 前，不顯示即時距離、時間、沿途空品、污染分數或保證安全。

## Secrets

- `.env`、Coolify secret、PostgreSQL password／URL、量界 token、環境部／中央氣象署 key、備份檔都不提交。
- `EXPO_PUBLIC_*` 永遠視為公開資訊；不得放任何 secret。
- 全部 secret 只由 Coolify Environment Variables 或本機忽略的 `.env` 注入 API container。
- Repository 內的 Nginx 關閉 access log；容器、API 回應與 PostgreSQL 技術事件不輸出 secret、endpoint 完整設定、request／response body 或 stack trace。Coolify／VPS 外層 proxy log 仍需由 owner 另行限制。
- 量界官方公開文件中的範例 token 不應被使用、複製或視為安全；若曾被任何人使用，應在供應商控制台撤銷並重新建立。

## VPS、Coolify 與資料庫

- Coolify 公開網域只指向 `web:80`；`api:3000` 與 `postgres:5432` 保持 Compose internal network。
- VPS owner 必須保護 Coolify 管理帳號、SSH、firewall、OS 更新與 PostgreSQL volume；這些是平台責任，不能只靠程式碼補足。
- PostgreSQL volume backup 必須加密、限制存取並有保存期；production 前需驗證 restore，否則部署文件保持「未驗證」。
- `CONTEXT_SIGNING_SECRET` 需使用高熵隨機值；不要重複使用 PostgreSQL 密碼或 AI token。
- API 對所有 AI 關聯 endpoint 與環境查詢分別套用同時數／每分鐘上限，對 request body 限制 32KB；這是單 process 防護，正式多 replica 仍需 reverse proxy／共用 rate limiter。
- 不以 Docker image、Compose 檔或 repository 取代 secret manager；Compose 只引用環境變數名稱。

## 權限與未來帳號

若決賽後需要同步，必須先設計適合未成年人的同意、身份驗證、資料查看、匯出、刪除、保留期與監護流程。沒有這些設計前，不以匿名裝置 ID 冒充安全帳號系統。

## 安全驗收

- 檢查 staged、unstaged、untracked、Docker image、bundle、Compose resolved config 與 log 的 secret。
- 測試惡意輸入、超長輸入／body、malformed JSON、無效列舉、CORS、錯誤回應、AI 同時數／頻率限制、timeout／無效 JSON。
- Demo 與測試只使用虛構人物資料。
- 查驗 PostgreSQL table 與應用層 log 不含 activity text、profile、prompt、模型輸出或 IP；另查 Coolify／VPS proxy 的 IP 保存政策。
- 醫療與提示注入測試依 [AI 安全規格](ai-safety-and-evaluation.md) 執行。

## 已知工具鏈 advisory

2026-07-16 的 `npm audit --omit=dev` 為 11 個 moderate、0 high、0 critical，全部位於 Expo CLI／Xcode 建置鏈的 transitive dependencies；API production runtime image 為 0 漏洞。npm 提供的完整修正會降級／跨 major 破壞 Expo SDK 57，相容性風險高於本次建置工具 advisory，因此不執行 `npm audit fix --force`；每次 Expo 更新與正式 build 前重新檢查。
