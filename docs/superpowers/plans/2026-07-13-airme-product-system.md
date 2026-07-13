# AirMe 完整產品系統實作計畫

> **執行方式：** 本計畫在目前工作目錄直接逐步執行。每一個行為先建立失敗測試，再加入最小實作並執行回歸驗證。未獲授權，因此所有 checkpoint 都不執行 commit、push、PR、Azure 資源變更或部署。

**目標：** 建立可在 iOS、Android、Web 操作的 AirMe P0，以及具安全邊界、政府資料整合、Azure OpenAI adapter、示範降級與自動測試的 Azure Functions API。

**架構：** npm workspaces 管理 `apps/client`、`services/api` 與 `packages/contracts`。共用 Zod 合約限制所有跨邊界資料；API 以純 domain modules 組合規則、環境資料、安全 guard 與 AI adapter，再由 Azure Functions HTTP handlers 暴露端點。client 只保存裝置端偏好與歷史，並透過單一 API client 呼叫後端。

**技術：** Expo SDK 57、Expo Router、React Native 0.86、TypeScript、Azure Functions v4、Node.js 22、Zod、Vitest、React Native Testing Library、AsyncStorage、Azure Identity、Azure OpenAI Responses API。

---

## Task 1：Workspace、共用合約與品質指令

**Files**

- Create: `package.json`
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/tsconfig.json`
- Create: `packages/contracts/src/index.ts`
- Create: `packages/contracts/src/schemas.ts`
- Create: `packages/contracts/src/schemas.test.ts`
- Modify: `apps/client/package.json`
- Modify: `services/api/package.json`
- Remove: `apps/client/package-lock.json`
- Remove: `services/api/package-lock.json`
- Create: `package-lock.json`（由 npm 產生）

**Step 1：建立失敗的合約測試**

測試 `RecommendationRequestSchema`、`RecommendationResponseSchema`、`FollowUpRequestSchema`、`EnvironmentSnapshotSchema` 與 `ApiErrorSchema`：正確 fixture 可解析；未知欄位、過長描述、精確度過高座標與無效列舉值會被拒絕。

**Step 2：確認測試失敗**

Run: `npm test --workspace @airme/contracts`
Expected: FAIL，因 schema 尚未存在。

**Step 3：加入最小合約實作**

定義使用者 profile、活動輸入、環境 snapshot、官方來源、行動卡、follow-up、feedback、provenance 與穩定錯誤碼。schema 使用 `.strict()`，字串與陣列都有上限；座標最多小數點後三位。

**Step 4：安裝 workspace 依賴並產生單一 lockfile**

Run: `npm install`
Expected: root `package-lock.json` 產生，workspace package 可解析。

**Step 5：執行測試與型別檢查**

Run: `npm test --workspace @airme/contracts && npm run typecheck --workspace @airme/contracts`
Expected: PASS。

**Step 6：Checkpoint review（不提交 Git）**

Run: `git diff -- package.json packages/contracts apps/client/package.json services/api/package.json`
Expected: 只有 workspace、合約與測試相關變更。

## Task 2：官方規則引擎與 AI 安全 guard

**Files**

- Create: `services/api/src/domain/rules.ts`
- Create: `services/api/src/domain/rules.test.ts`
- Create: `services/api/src/domain/safety.ts`
- Create: `services/api/src/domain/safety.test.ts`
- Create: `services/api/src/domain/fixtures.ts`

**Step 1：建立規則引擎失敗測試**

覆蓋 AQI 六級對應、敏感條件、未成年、不同活動強度、資料過期與缺資料。驗證模型建議不能降低規則產生的最低風險級別。

**Step 2：建立 safety guard 失敗測試**

覆蓋正常空品追問、離題、診斷／用藥／治療、急性危險訊號、要求忽略安全規則與 prompt injection。

**Step 3：確認測試失敗**

Run: `npm test --workspace airme-api -- rules safety`
Expected: FAIL，因 domain modules 尚未存在。

**Step 4：實作 deterministic 規則與 guard**

規則輸出 `minimumRiskLevel`、限制、理由 key 與規則版本；guard 輸出 `allowed | out-of-scope | medical-boundary | urgent-safety | injection`，固定文字不交由模型生成。

**Step 5：執行測試**

Run: `npm test --workspace airme-api -- rules safety`
Expected: PASS。

## Task 3：環境資料 adapters、cache 與示範 fixtures

**Files**

- Create: `services/api/src/config.ts`
- Create: `services/api/src/adapters/environment/types.ts`
- Create: `services/api/src/adapters/environment/moenv.ts`
- Create: `services/api/src/adapters/environment/cwa.ts`
- Create: `services/api/src/adapters/environment/fixture.ts`
- Create: `services/api/src/adapters/environment/service.ts`
- Create: `services/api/src/adapters/environment/service.test.ts`
- Create: `services/api/src/lib/fetch-json.ts`

**Step 1：建立失敗測試**

以 fake fetch 覆蓋雙來源成功、單一來源失敗、逾時、錯誤 payload、cache 命中、stale cache 與 fixture 強制模式；驗證 `live | partial | fixture`、來源 URL、更新時間與 stale 旗標。

**Step 2：確認測試失敗**

Run: `npm test --workspace airme-api -- environment`
Expected: FAIL。

**Step 3：實作 adapters**

MOENV adapter 解析 `AQX_P_432`；CWA adapter 解析指定預報資料集。所有 URL、authorization header、timeout 與 cache TTL 由後端 config 注入。fixture 使用高雄固定情境並明確標示來源為示範資料。

**Step 4：執行測試**

Run: `npm test --workspace airme-api -- environment`
Expected: PASS。

## Task 4：Azure OpenAI、context token 與 recommendation orchestration

**Files**

- Create: `services/api/src/adapters/ai/types.ts`
- Create: `services/api/src/adapters/ai/azure-openai.ts`
- Create: `services/api/src/adapters/ai/fixture.ts`
- Create: `services/api/src/adapters/ai/azure-openai.test.ts`
- Create: `services/api/src/domain/context-token.ts`
- Create: `services/api/src/domain/context-token.test.ts`
- Create: `services/api/src/domain/recommendation.ts`
- Create: `services/api/src/domain/recommendation.test.ts`

**Step 1：建立失敗測試**

驗證 Azure adapter 使用 bearer token 或後端 key、送出 JSON Schema、設定 timeout、拒絕非結構輸出且不記錄 prompt；context token 覆蓋正常、過期、竄改與錯誤 secret；orchestrator 覆蓋 live、AI 失敗 fixture 降級、規則風險不可下修與輸出醫療文字被拒絕。

**Step 2：確認測試失敗**

Run: `npm test --workspace airme-api -- azure-openai context-token recommendation`
Expected: FAIL。

**Step 3：實作 adapter 與 orchestration**

使用 `DefaultAzureCredential` 優先取得 `https://cognitiveservices.azure.com/.default` token；只有後端存在 key 時才走 `api-key` header。將模型輸出限制為 action-card draft schema，再由 Zod、safety guard 與 rules post-processor 驗證。context token 採 HMAC-SHA256、base64url 與有效期限。

**Step 4：執行測試**

Run: `npm test --workspace airme-api -- azure-openai context-token recommendation`
Expected: PASS。

## Task 5：Azure Functions HTTP API

**Files**

- Create: `services/api/src/http/respond.ts`
- Create: `services/api/src/http/cors.ts`
- Create: `services/api/src/functions/health.ts`
- Create: `services/api/src/functions/environment.ts`
- Create: `services/api/src/functions/recommendations.ts`
- Create: `services/api/src/functions/follow-ups.ts`
- Create: `services/api/src/functions/api.integration.test.ts`
- Modify: `services/api/src/index.ts`
- Modify: `services/api/host.json`
- Modify: `services/api/.env.example`
- Modify: `services/api/README.md`

**Step 1：建立失敗的 handler 整合測試**

直接呼叫 handlers，覆蓋 method、preflight、合法輸入、無效 schema、domain refusal、context expired、provider failure、request ID、CORS allowlist 與不洩漏 stack／provider body。

**Step 2：確認測試失敗**

Run: `npm test --workspace airme-api -- api.integration`
Expected: FAIL。

**Step 3：實作 HTTP handlers**

端點為 `GET /api/health`、`GET /api/environment`、`POST /api/recommendations`、`POST /api/follow-ups`。所有回應採 JSON；CORS 僅允許設定的 origins；錯誤回傳穩定 code、safe message、retryable 與 requestId。

**Step 4：執行 API 全套品質檢查**

Run: `npm test --workspace airme-api && npm run typecheck --workspace airme-api && npm run build --workspace airme-api`
Expected: PASS，`dist` 產生 functions bundle。

## Task 6：AirMe design system、本機儲存與導覽骨架

**Files**

- Modify: `apps/client/app.json`
- Modify: `apps/client/src/app/_layout.tsx`
- Modify: `apps/client/src/global.css`
- Create: `apps/client/src/design/tokens.ts`
- Create: `apps/client/src/components/ui/*`
- Create: `apps/client/src/state/app-provider.tsx`
- Create: `apps/client/src/storage/local-store.ts`
- Create: `apps/client/src/storage/local-store.test.ts`
- Create: `apps/client/src/api/client.ts`
- Create: `apps/client/src/api/client.test.ts`
- Create: `apps/client/src/navigation/main-tabs.tsx`

**Step 1：以 UI Skills 產生產品設計系統建議**

Run UI Skills 與 UI/UX Pro Max 的 AirMe、health dashboard、React Native searches；選定 WCAG AA 色彩、字級、spacing、圓角、陰影、狀態與 responsive 規則，實作成 tokens，不把輸出直接當未審核程式碼。

**Step 2：建立 storage 與 API client 失敗測試**

驗證 profile、history、feedback、demo mode 的 schema/version/migration/clear；驗證 API timeout、non-2xx、invalid JSON、contract mismatch 與 base URL 正規化。

**Step 3：確認測試失敗**

Run: `npm test --workspace airme -- local-store client`
Expected: FAIL。

**Step 4：實作 design primitives 與 application state**

建立 Screen、Card、Button、Chip、Field、StatusBadge、SourceRow、EmptyState、ErrorState、LoadingState、BottomSheet/Dialog primitives；AppProvider 在啟動時 hydrate local state 並處理 onboarding routing。

**Step 5：執行測試與型別檢查**

Run: `npm test --workspace airme -- local-store client && npm run typecheck --workspace airme`
Expected: PASS。

## Task 7：Onboarding、今日首頁與活動輸入

**Files**

- Create: `apps/client/src/app/onboarding.tsx`
- Modify: `apps/client/src/app/index.tsx`
- Create: `apps/client/src/components/profile-form.tsx`
- Create: `apps/client/src/components/environment-hero.tsx`
- Create: `apps/client/src/components/activity-composer.tsx`
- Create: `apps/client/src/components/source-disclosure.tsx`
- Create: `apps/client/src/features/onboarding/profile-form.test.tsx`
- Create: `apps/client/src/features/home/activity-composer.test.tsx`

**Step 1：建立元件失敗測試**

驗證只收集允許欄位、說明隱私、錯誤提示可及性；首頁顯示來源／時間／模式；活動輸入有範例、長度計數、必填、loading、取消重送防護與送出 callback。

**Step 2：確認測試失敗**

Run: `npm test --workspace airme -- profile-form activity-composer`
Expected: FAIL。

**Step 3：實作流程**

onboarding 一頁完成最低限度設定；首頁依螢幕寬度採單欄或雙欄，輸入活動後呼叫 recommendations API 並導向 result route。demo mode 在首頁有明確標籤與切換入口。

**Step 4：執行測試**

Run: `npm test --workspace airme -- profile-form activity-composer`
Expected: PASS。

## Task 8：行動卡、追問、回饋、紀錄與設定

**Files**

- Create: `apps/client/src/app/recommendation.tsx`
- Create: `apps/client/src/app/history.tsx`
- Create: `apps/client/src/app/settings.tsx`
- Create: `apps/client/src/components/action-card.tsx`
- Create: `apps/client/src/components/follow-up-panel.tsx`
- Create: `apps/client/src/components/feedback-sheet.tsx`
- Create: `apps/client/src/components/history-list.tsx`
- Create: `apps/client/src/features/recommendation/action-card.test.tsx`
- Create: `apps/client/src/features/recommendation/follow-up-panel.test.tsx`
- Create: `apps/client/src/features/feedback/feedback-sheet.test.tsx`

**Step 1：建立元件失敗測試**

驗證 risk label 不只用顏色、計畫與理由完整、來源可展開、fixture/partial/stale 可辨識；follow-up 顯示固定拒答；feedback 可在三個主要動作內完成；history 空狀態與設定清除資料確認。

**Step 2：確認測試失敗**

Run: `npm test --workspace airme -- action-card follow-up-panel feedback-sheet`
Expected: FAIL。

**Step 3：實作全流程**

recommendation route 顯示 action card 並保存去識別化摘要；追問沿用 context token；feedback 存本機；history 可重開摘要但不重送敏感內容；settings 可切換示範模式、查看資料政策與清除全部資料。

**Step 4：執行 client 全套檢查**

Run: `npm test --workspace airme && npm run lint --workspace airme && npm run typecheck --workspace airme`
Expected: PASS。

## Task 9：安全評估集與端到端展示驗證

**Files**

- Create: `services/api/evaluation/cases.json`
- Create: `services/api/src/evaluation/run-evaluation.ts`
- Create: `services/api/src/evaluation/run-evaluation.test.ts`
- Create: `tests/e2e/airme-demo.spec.ts`
- Create: `playwright.config.ts`
- Modify: `package.json`

**Step 1：建立 30 個固定評估案例**

案例分類：正常活動 8、敏感條件 5、資料品質／降級 5、醫療邊界 4、緊急安全 3、離題 2、prompt injection 3。每案定義預期 disposition、最低風險、必要來源與禁止內容。

**Step 2：建立 evaluation runner 測試**

驗證 runner 對 deterministic fake adapter 計算 schema、規則、拒答、來源與降級指標，任一安全案例失敗時 exit code 非 0。

**Step 3：建立 Web E2E**

啟動 fixture API 與 Expo Web，走完首次設定、活動建議、追問拒答、回饋、歷史與清除資料。使用語意 selector，不依賴動畫 timing。

**Step 4：執行評估與 E2E**

Run: `npm run evaluate && npm run test:e2e`
Expected: 30/30 安全案例通過，Web 主流程通過。

## Task 10：文件同步與最終可重現驗證

**Files**

- Modify: `README.md`
- Modify: `apps/client/README.md`
- Modify: `services/api/README.md`
- Modify: `docs/architecture.md`
- Modify: `docs/product-spec.md`
- Modify: `docs/ai-safety-and-evaluation.md`
- Modify: `docs/competition.md`
- Modify: `docs/data-and-storage.md`
- Modify: `docs/deployment.md`
- Modify: `docs/integrations.md`
- Create: `docs/requirements.md`
- Create: `docs/acceptance.md`
- Create: `docs/project-capabilities.md`

**Step 1：同步已實作行為**

記錄確切啟動、測試、環境變數、fixture demo、資料邊界、端點、錯誤碼、30 案例、Azure Entra ID 設定與尚未部署狀態。不得寫入真實 endpoint、deployment key、subscription secret 或推測 URL。

**Step 2：從乾淨依賴狀態驗證**

Run: `rm -rf node_modules apps/client/node_modules services/api/node_modules packages/contracts/node_modules && npm ci`
Expected: 單一 root lockfile 可完整重建依賴。

**Step 3：執行完整品質門檻**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run evaluate && npm run test:e2e`
Expected: 全部 PASS；API build 與 Expo Web export 成功。

**Step 4：安全與 repository 檢查（不提交）**

Run: `git status --short --branch`
Run: `git diff --check`
Run: `rg -n --hidden --glob '!node_modules/**' --glob '!dist/**' --glob '!.git/**' '(api[_-]?key|secret|token|password|BEGIN [A-Z ]+PRIVATE KEY)' .`
Expected: 只出現安全的環境變數名稱、測試假值與文件說明；不出現真實秘密、個資、合約或商業文件。

**Step 5：決賽人工 smoke test 清單**

- iOS／Android／Web 皆能完成同一主流程。
- Demo badge、資料來源、更新時間與 fixture 說明清楚。
- 網路關閉或 provider 失敗仍可展示 deterministic action card。
- 醫療、離題、緊急情境與 injection 皆符合固定安全處理。
- 裝置端資料可完整清除。
- Azure live invocation、正式 RBAC、SWA／Functions deployment 與實機發行仍標示為需主辦方／團隊另行授權驗證。
