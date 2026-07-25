# 安全、身份與隱私

## 身份策略

AirMe 以 Email 帳號作為 App／Web 產品入口；使用者完成註冊或登入後才建立「此裝置個人檔案」。本機暱稱不需真名；設定、粗略地點、結構化日誌摘要與回饋只有在後端配置 `CLOUD_SYNC_ENCRYPTION_KEY` 時，才以帳號為界、AES-256-GCM 加密同步。

- 註冊要求 Email、非真名顯示名稱、至少 12 字元密碼與明確隱私同意。
- 密碼使用 Node `scrypt` 雜湊；資料庫不保存明文密碼或原始 session token。
- session token 是隨機不透明值；iOS／Android 儲存在 Expo SecureStore，Web 只留於當前 browser tab 的 `sessionStorage`。伺服器只保存以 `AUTH_SESSION_HMAC_SECRET` 產生的 HMAC digest、到期與撤銷資訊。Production Web 應使用 HTTPS、嚴格 CSP，並在未來遷移為 secure HttpOnly cookie／CSRF 防護後再承諾長效 Web session。
- 登出撤銷目前 session；刪除帳號會 cascade 刪除帳號、所有 server session 與加密同步 snapshot，並由 App 清除當前裝置的同步 state。

## 不蒐集與不保存

- 姓名、學號、學校、生日、電話、精確住址與長期 GPS 軌跡。AirMe App／API／PostgreSQL 不建立 IP 欄位；網路與 Coolify reverse proxy 仍會處理連線 IP，production 必須限制其 log 與保存期。
- 病歷、診斷證明、藥物或醫療機構紀錄。
- 教師可查看的個人或班級症狀資料。
- PostgreSQL 中的完整活動文字、完整 prompt、context token、模型完整輸出、provider 錯誤 body、路線起終點、查詢歷史、座標或精確路徑。

## 最小化資料

- 使用列舉標籤表示敏感狀態；當下狀況只存在於使用者主動輸入的單次 request。
- 個人自我描述原稿只存在表單、AirMe API 與量界 request 的暫時記憶體；在線分析前明示會送給量界，AirMe 不將其寫入裝置、雲端同步、技術事件或 PostgreSQL。確認後只保存受控 profile 欄位與本機暱稱；量界供應商的保留與訓練政策須在 production 前由團隊確認。
- 裝置端最多保存一個臺灣服務範圍內、四捨五入到小數二位的粗略地點；API 只為舊資料相容接受到三位，不保存精確地址或長期軌跡。
- 回饋不傳送到量界智算；啟用同步時會與日誌摘要一起透過驗證帳號 API 送入後端，先以 AES-256-GCM 加密再寫入 PostgreSQL。
- 必要帳號保存 Email、顯示名稱、password hash、隱私同意與建立時間。加密 snapshot 與帳號 ID 關聯，但 server-side table 不保存可直接讀取的 profile、回饋或日誌 JSON。
- 登入失敗一律回覆通用憑證錯誤，避免用 API 洩漏某 Email 是否已註冊；註冊重複 Email 則回明確可登入提示。
- PostgreSQL `environment_cache` 只存公開環境資料、粗略座標 key 與固定非個資地點名；`service_events` 只存不透明 request ID、route、狀態碼、耗時與時間。
- request ID 是隨機值，不由個資推導。
- `service_events` 不接受 client 提供的 request ID，伺服器每次產生隨機 UUID，避免 header 注入個資。
- 環境查詢使用 `POST /api/environment`，粗略地點只放在 request body，不放入 URL query；Nginx／Fastify 不記錄 request body，因此一般 access log 不會保存地點名稱或座標。
- 推薦送往量界前再最小化：移除自訂地點顯示名、座標、通勤方式與重複的環境地點，只傳結構化活動欄位、活動地點類型、受控年齡／敏感標籤、受控縣市、環境事實與官方規則底線。
- 短效追問 token 只簽入結構化活動摘要、受控縣市、環境事實與規則底線；不簽入原始活動文字、自訂地點名、座標或 currentCondition。

## 路線、地圖與外部服務

- AirMe 會將使用者當次輸入的起終點座標與移動方式傳給已部署的 Valhalla，用來取得路線；地點關鍵字會送到已部署的 Photon。開源地圖 overlay 只供本機／維運；若另行上線，router、geocoder 與 tiles 必須使用受限的 private network 或單獨審查的公開 HTTPS endpoint，兩類資料都不由 AirMe 寫入資料庫或 application log。
- 路線可在 MapLibre 顯示；多 Resource 部署的自架圖磚使用獨立 HTTPS style URL，production 必須設定 canonical `MAP_PUBLIC_BASE_URL` 與 `MAP_ALLOWED_HOSTS`，並保留 OSM attribution。Demo 的 MapLibre style 只可作展示，不是 production tile SLA。
- AirMe 不保存或追蹤路線；使用者按「在 OpenStreetMap 查看路線」後，當次起終點才會傳給該外部網站，此交接受其隱私政策約束。AirMe 不讀取外部帳號、地圖歷史、cookie 或位置權限。
- 路線功能不會顯示沿途污染、最低污染、街道級 AQI 或 turn-by-turn 導航；route provider 未完成圖資 bootstrap 或不可用時，介面會安全降級為無地圖／OpenStreetMap 路線交接。

## Secrets

- `.env`、Coolify secret、PostgreSQL password／URL、量界 token、環境部／中央氣象署 key、備份檔都不提交。
- `AUTH_SESSION_HMAC_SECRET` 與 `CONTEXT_SIGNING_SECRET` 都要使用不同的至少 32 bytes 高熵隨機值；不得重複使用 PostgreSQL 密碼或 AI token。
- `CLOUD_SYNC_ENCRYPTION_KEY` 必須是獨立的 32-byte base64url 高熵值；輪替前需完成既有 snapshot 的 re-encryption／使用者重設策略，不能直接遺失舊 key。
- `EXPO_PUBLIC_*` 永遠視為公開資訊；不得放任何 secret。
- 全部 secret 只由 Coolify Environment Variables 或本機忽略的 `.env` 注入 API container。
- Repository 內的 Nginx 關閉 access log；容器、API 回應與 PostgreSQL 技術事件不輸出 secret、endpoint 完整設定、request／response body 或 stack trace。Coolify／VPS 外層 proxy log 仍需由 owner 另行限制。
- 量界官方公開文件中的範例 token 不應被使用、複製或視為安全；若曾被任何人使用，應在供應商控制台撤銷並重新建立。

## VPS、Coolify 與資料庫

- Coolify 的 `airme-web:80` 與 `airme-api:3000` 各自透過 HTTPS 網域公開；`airme-postgres:5432` 保持 Coolify private network。API CORS 只允許明確 Web／native origin。
- VPS owner 必須保護 Coolify 管理帳號、SSH、firewall、OS 更新與 PostgreSQL volume；這些是平台責任，不能只靠程式碼補足。
- PostgreSQL volume backup 必須加密、限制存取並有保存期；production 前需驗證 restore，否則部署文件保持「未驗證」。
- `CONTEXT_SIGNING_SECRET` 輪替會使既有追問 token 失效；`AUTH_SESSION_HMAC_SECRET` 輪替會使既有登入 session 失效，需安排公告與重新登入流程。
- API 對所有 AI 關聯 endpoint 與環境查詢分別套用同時數／每分鐘上限，對 request body 限制 32KB；這是單 process 防護，正式多 replica 仍需 reverse proxy／共用 rate limiter。
- 不以 Docker image、Compose 檔或 repository 取代 secret manager；Coolify Resource 只從 runtime environment 注入 API secret。

## 帳號能力與剩餘安全工作

目前已完成加密跨裝置 snapshot 同步；但 Email 驗證、忘記密碼／密碼重設、MFA、帳號匯出、監護流程、retention job、key rotation 與 restore 演練尚未建立。它們仍需要寄信供應商、正式網域、保存期、資料查看／刪除、備份與適合未成年人的同意設計，完成前不應承諾為正式雲端健康帳號。

## 安全驗收

- 檢查 staged、unstaged、untracked、Docker image、bundle、本機 Compose resolved config 與 Coolify Resource environment／log 的 secret。
- 測試惡意輸入、超長輸入／body、malformed JSON、無效列舉、CORS、錯誤回應、AI 同時數／頻率限制、timeout／無效 JSON。
- Demo 與測試只使用虛構人物資料。
- 查驗 PostgreSQL 的 `account_cloud_states` 不含明文 profile、activity text、prompt、模型輸出、路線或 IP，且 ciphertext 無法由資料庫帳號單獨解密；另查 Coolify／VPS proxy 的 IP 保存政策。
- 醫療與提示注入測試依 [AI 安全規格](ai-safety-and-evaluation.md) 執行。

## 已知工具鏈 advisory

2026-07-22 已執行 `npm audit fix --package-lock-only`，移除 `fast-uri` 的 high advisory；目前 `npm audit --audit-level=high` 為 11 個 moderate、0 high、0 critical。剩餘項目均位於 Expo CLI／Xcode 建置鏈的 transitive dependency `uuid`；完整修正需要跨 major 安裝 `expo-splash-screen@55`，因此不執行 `npm audit fix --force`。Node 22 API production runtime image 的 `npm ci --omit=dev` 為 0 漏洞；每次 Expo 更新與正式 build 前重新檢查。
