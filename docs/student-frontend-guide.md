# AirMe 學生前端協作與開發教學

> 給第一次使用 Git、GitHub、VS Code 與 Expo 的同學。本文件帶你從沒有開發環境開始，在自己的分支修改 AirMe 前端、測試、送出 Pull Request（PR）並回應審查。

## 先讀這一段：你的工作範圍

AirMe 是同一套可在網頁、iOS、Android 執行的 Expo App。本次學生的責任是**前端畫面、互動與使用體驗**；老師負責後端、功能規則、資料庫、部署與所有外部服務金鑰。

你可以安全地在瀏覽器開發與測試。專案預設為離線的 `DEMO` 示範模式，不需要 API key，也不需要啟動後端。

**本教學不需要、也不要安裝或執行 Docker、資料庫、後端、EAS 雲端建置或任何 API key。** 不要因為畫面出現資料連線錯誤而自行尋找、索取或填入金鑰；請先切回 DEMO 模式並通知老師。

## 完成後你會做的事

```text
接受 GitHub 邀請
    ↓
複製（clone）AirMe 到自己的電腦
    ↓
從最新 main 建立自己的 branch
    ↓
在 VS Code 修改 app/src/ 的前端檔案
    ↓
用 Expo 在瀏覽器檢查畫面，再執行前端檢查
    ↓
commit → push 自己的 branch → 開 Pull Request
    ↓
依老師的 review 留言調整；由老師合併到 main
```

你可以把 `main` 想成全隊已確認可用的共同版本；自己的 branch 則是安全的個人工作副本。你**不能也不需要**直接合併或推送到 `main`。

## 目錄

1. [先備知識：Git 與 GitHub 在做什麼](#先備知識git-與-github-在做什麼)
2. [第一次設定：帳號與軟體](#第一次設定帳號與軟體)
3. [取得專案與在 VS Code 開啟](#取得專案與在-vs-code-開啟)
4. [第一次啟動 AirMe 前端](#第一次啟動-airme-前端)
5. [可選的前端公開設定 `.env`](#可選的前端公開設定-env)
6. [AirMe 前端結構與可修改範圍](#airme-前端結構與可修改範圍)
7. [收到前端任務後怎麼開始](#收到前端任務後怎麼開始)
8. [修改、測試與自我檢查](#修改測試與自我檢查)
9. [協作流程 A：使用 VS Code Source Control](#協作流程-a使用-vs-code-source-control)
10. [協作流程 B：使用終端機 Git 指令](#協作流程-b使用終端機-git-指令)
11. [開 PR、回應 review 與同步 main](#開-pr回應-review-與同步-main)
12. [每日開工／收工清單](#每日開工收工清單)
13. [常見問題排除](#常見問題排除)

---

## 先備知識：Git 與 GitHub 在做什麼

不需要先背指令，但要先認識下列名詞。之後每個動作都能對得上。

| 名詞 | 白話意思 | AirMe 團隊中的做法 |
| --- | --- | --- |
| Repository（repo／儲存庫） | 一個有完整變更歷史的專案資料夾 | `AirMe` GitHub repo 與你電腦裡的 `AirMe` 資料夾 |
| Git | 記錄檔案版本的工具，安裝在你的電腦 | 用來看差異、建立 branch、commit、同步檔案 |
| GitHub | 放遠端 repository、討論與審查 PR 的網站 | 團隊共同協作的地方，不是 Git 本身 |
| `main` branch | 團隊認可的主版本 | 受保護；學生不直接推送或合併 |
| branch（分支） | 從某個版本切出的工作副本 | 每個任務建立一條自己的短期 branch |
| working tree | 你目前電腦裡尚未 commit 的修改 | 每次切 branch、更新前都先確認它乾淨 |
| diff | 新舊檔案的差異 | commit 或 PR 前一定要看，確認沒有多帶檔案 |
| stage | 指定「這些檔案要放進下一個 commit」 | 只加入自己本次修改的確切檔案，**不要**全選或使用 `git add .` |
| commit | 一筆有說明文字的本機版本紀錄 | 例如「調整首頁活動輸入區的間距」；仍只在你的電腦 |
| push | 把已 commit 的 branch 上傳到 GitHub | 上傳的是自己的 branch，絕不是 `main` |
| Pull Request（PR） | 請團隊把你的 branch 變更審查後合併到 `main` 的提案 | 老師 review 後由老師合併；PR 也是討論紀錄 |
| review | 對 PR 提出問題、修改建議或核准 | 先理解留言、修改、測試、push，再在留言下回覆 |
| rebase | 把自己的工作接到最新 `main` 後面 | PR 要求更新或衝突時才做；只對**自己的 branch**做 |

### 三個一定要記住的原則

1. 一個獨立任務一條 branch；不要在 `main` 直接改、commit 或 push。
2. 先看差異，再 commit；只 stage 本次任務應有的檔案。
3. PR 送出後不是結束：確認自動檢查、回應 review，並讓老師決定是否合併。

---

## 第一次設定：帳號與軟體

### 0. 先接受 GitHub 團隊邀請

1. 若還沒有 GitHub 帳號，先到 [GitHub 註冊頁](https://github.com/signup) 建立帳號並完成 email 驗證。帳號名稱請用老師與組員看得懂、能辨識是你的名稱。
2. 把你的 GitHub 帳號名稱交給老師，請老師邀請你加入 `Sutdents-Project-Hub/AirMe`。
3. 到 GitHub 的通知、email 或邀請頁，按 **Accept invitation**。沒有接受邀請前，即使看得到 repo，也可能無法 push branch 或開 PR。
4. 登入 GitHub 後打開 AirMe repo，確認你看得到 **Code**、**Issues**、**Pull requests** 分頁。你只需要能建立 branch、推送自己的 branch、開 PR；沒有 `main` 的合併權限是正常且正確的設定。

> 不要建立自己的 AirMe repo、不要 fork，也不要把專案壓縮檔互傳。這個團隊的協作方式是：每個人從同一個 repo 建立自己的 branch，再以 PR 交接。

### 1. 安裝 Visual Studio Code（VS Code）

VS Code 是本專案主要的編輯器。請從 [VS Code 官方下載頁](https://code.visualstudio.com/download) 取得 Stable 版，不要使用 Insiders 版。

#### macOS

1. 下載符合電腦晶片的安裝檔：Apple M 系列選 Apple silicon；不確定或 Intel 電腦則選 Intel／Universal。
2. 開啟下載的 `.dmg`，把 **Visual Studio Code** 拖到 **Applications（應用程式）**。
3. 從 Applications 開啟 VS Code。若 macOS 顯示安全提示，確認來源是官方後選擇開啟。
4. 為了讓之後可以在終端機輸入 `code .` 開專案，在 VS Code 按 `Command + Shift + P`，搜尋並執行 **Shell Command: Install 'code' command in PATH**。這一步做一次即可。

#### Windows 10／11

1. 在下載頁選 **User Installer**；一般 Intel／AMD 電腦選 x64，Windows on ARM 才選 Arm64。
2. 執行安裝程式，維持預設選項完成安裝。若安裝程式提供「加入 PATH」或「以 Code 開啟」選項，可以勾選。
3. 從開始功能表開啟 VS Code。安裝後重新開啟任何已開的 PowerShell 或 VS Code，讓 PATH 設定生效。

### 2. 安裝 Git

Git 是把修改記錄並送到 GitHub 的工具。先安裝，再用下方指令確認。

#### macOS

1. 打開 **Terminal（終端機）**；可用 Spotlight 搜尋 `Terminal`。
2. 輸入：

   ```bash
   git --version
   ```

3. 如果顯示 `git version ...`，Git 已可用，跳到「設定 Git 名稱與 email」。
4. 如果 macOS 跳出安裝 Command Line Tools 的視窗，選 **Install**，等待完成後關掉並重新開啟 Terminal。
5. 如果沒有跳出視窗，輸入以下指令後依畫面完成安裝：

   ```bash
   xcode-select --install
   ```

6. 安裝完成後再輸入 `git --version`，看到版本號才算完成。

#### Windows

1. 到 [Git 官方下載頁](https://git-scm.com/downloads) 下載 **Git for Windows** 並執行安裝程式。
2. 沒有特殊需求時維持預設選項。若看到 PATH 選項，選擇讓 Git 可從命令列與第三方軟體使用的選項；終端機選項可保留預設的 Git Bash。
3. 安裝完成後關閉並重新開啟 VS Code，按上方選單 **Terminal → New Terminal**。
4. 在 PowerShell 或 Git Bash 輸入：

   ```powershell
   git --version
   ```

5. 看到 `git version ...` 即完成。看不到版本號請先不要 clone，改看[常見問題](#常見問題排除)。

### 3. 安裝 Node.js 22.x 與 npm

AirMe 的根目錄與 App 都明確要求 **Node.js 22.x**。Node 官網當下可能把更新的版本標示為 LTS，但本專案仍必須安裝 **22.x**，不要自行改用 24.x 或其他版本。

1. 到 [Node.js 官方下載頁](https://nodejs.org/en/download)。
2. 從「Previous releases／先前版本」選擇最新的 **v22.x** 安裝程式；macOS 選 `.pkg`，Windows 選 `.msi`。不要下載 source code、Current 或其他 major version。
3. 執行安裝程式並保留 npm 的安裝選項。npm 會隨 Node.js 一起安裝，**不必**另外下載 npm。
4. 完成後關閉並重新開啟 VS Code／終端機，輸入：

   ```bash
   node --version
   npm --version
   ```

5. `node --version` 的結果必須以 `v22.` 開頭；`npm --version` 應顯示版本號。若不是 `v22.`，請先處理版本問題，勿直接安裝依賴。

> 不要用 `sudo npm ...`、不要以系統管理員身分執行 npm，也不要全域安裝 Expo CLI。AirMe 的 Expo 工具已隨專案依賴安裝，後續指令會自動使用相容版本。

### 4. 在 VS Code 加入必要擴充功能

1. 開啟 VS Code 左側的 **Extensions**（四個方塊圖示），或按 `Command + Shift + X`（macOS）／`Ctrl + Shift + X`（Windows）。
2. 搜尋並安裝 **Expo Tools**。這是專案 `app/.vscode/extensions.json` 建議的擴充功能。
3. TypeScript、Git、終端機與 Source Control 已內建在 VS Code；不需要安裝第二個 Git 圖形工具。
4. 擴充功能安裝完成若要求 Reload，按 **Reload**。

### 5. 可選：用實體手機看畫面

平常以瀏覽器開發就足夠，**不需要**安裝 Android Studio、Xcode、模擬器或 Expo 帳號。

若想在自己的手機看畫面，可額外從 iOS App Store 或 Google Play 安裝 **Expo Go**。手機與電腦要連到同一個網路；之後請看[用手機預覽（可選）](#用手機預覽可選)。不要用 EAS build，也不要申請或輸入 Apple／Google 開發者帳號。

### 6. 設定 Git 的作者資訊（每台電腦只做一次）

Git commit 會記錄作者名稱與 email。請在 VS Code 的 Terminal 或系統 Terminal 輸入，下列引號內改成你的資料：

```bash
git config --global user.name "你的姓名或團隊可辨識名稱"
git config --global user.email "你在 GitHub 驗證過的 email"
git config --global --get user.name
git config --global --get user.email
```

最後兩行應顯示你剛設定的資訊。若你不想公開主要 email，可先在 GitHub 的 email 設定啟用「Keep my email addresses private」，再使用 GitHub 顯示的 no-reply email；不要猜測或抄別人的 email。

---

## 取得專案與在 VS Code 開啟

以下兩種方法擇一即可。兩者結果相同：你的電腦會有一份 Git 管理的 `AirMe` 資料夾。

### 方法 A：在 VS Code 介面 clone（推薦第一次使用者）

1. 開啟 VS Code；若已經開著別的專案，選 **File → New Window**，避免把 AirMe 放進別的專案。
2. 點左側 **Source Control** 圖示（分支形狀），選 **Clone Repository**。
3. 若出現登入選項，選 **Clone from GitHub**，依瀏覽器畫面登入並授權 VS Code；或選 **Clone from URL** 後貼上這個已設定的遠端網址：

   ```text
   https://github.com/Sutdents-Project-Hub/AirMe.git
   ```

4. 選擇一個你找得到的位置存放專案，例如 `Documents/Projects`。**不要**放在 USB、下載資料夾、雲端同步衝突嚴重的資料夾，且不要放進另一個 Git repo。
5. 等待 clone 完成，VS Code 詢問 **Open the cloned repository?** 時選 **Open**。
6. 第一次開啟若問是否信任作者，確認資料夾是剛剛從 AirMe 官方 repo clone 的，選 **Yes, I trust the authors**。
7. 左側 Explorer 最上層應該直接是 `AirMe`，並能看到 `app`、`backend`、`packages`、`docs`、`package.json`。**不要只開 `app` 資料夾**，因為依賴與指令由根目錄的 npm workspace 管理。

### 方法 B：用終端機 clone

1. 在 VS Code 選 **Terminal → New Terminal**。下方會出現終端機面板；macOS 通常是 zsh，Windows 通常是 PowerShell。
2. 先切換到你想存放專案的資料夾。若不熟悉資料夾路徑，可以先用方法 A；不要隨便複製網路上的 `cd` 路徑。
3. 在選好的資料夾中輸入：

   ```bash
   git clone https://github.com/Sutdents-Project-Hub/AirMe.git
   cd AirMe
   ```

4. 若 GitHub 跳出登入視窗，登入自己的帳號並核准。若終端機要求密碼，不要輸入 GitHub 網站密碼；改以瀏覽器／VS Code 的 GitHub 登入完成驗證，或請老師協助檢查權限。
5. 確認目前 branch 與遠端網址：

   ```bash
   git status --short --branch
   git branch --show-current
   git remote -v
   ```

   正常情況下會顯示目前是 `main`，且 `origin` 指向 `https://github.com/Sutdents-Project-Hub/AirMe.git`。這三個指令只讀取狀態，不會改檔案。
6. 在 macOS 可輸入 `code .` 開啟目前資料夾；Windows 若 `code .` 無法使用，就在 VS Code 選 **File → Open Folder...**，選剛 clone 的 `AirMe` 根資料夾。

### 第一次安裝依賴

確認 VS Code 開的是 `AirMe` **根目錄**後，開啟 Terminal，在根目錄輸入：

```bash
npm ci
```

請耐心等待，不要在中途關閉視窗。這個指令依照專案已鎖定的 `package-lock.json` 安裝相同版本的依賴，也會安裝 App 所需的共用型別；它**不會**啟動後端、Docker、資料庫或外部 API。

安裝成功的判斷是指令以正常結束碼回到可輸入下一行的提示字元，且沒有 `npm ERR!`。完成後不要把 `node_modules/` 加入 Git；它已被忽略，每台電腦各自安裝即可。

> 這個專案有根目錄的 workspace 設定與單一 lockfile，因此請在根目錄使用 `npm ci`。不要進 `app/` 後自行執行 `npm install`，也不要手動新增套件；需要新套件先提出理由，由老師決定。

---

## 第一次啟動 AirMe 前端

### 最簡單：在瀏覽器開發（推薦）

1. 確認 Terminal 路徑在 `AirMe` 根目錄，而且 `npm ci` 已經成功。
2. 輸入：

   ```bash
   npm run web --workspace airme
   ```

3. 這會執行專案中的 `expo start --web`。終端機會持續顯示開發伺服器訊息；**不要關掉這個 Terminal**，否則網站會停止。
4. Expo 通常會自動開瀏覽器。若沒有自動開啟，請看 Terminal 顯示的 Web 網址，完整複製到瀏覽器網址列；不要自行猜測 port 或網址。也可在這個 Terminal 按小寫 `w` 開啟 Web。
5. 第一次會進入「建立我的 AirMe」頁面。使用虛構、非敏感的測試資料完成畫面流程，接著確認首頁、活動輸入、行動卡、Air 日誌、路線、設定等頁面可開啟。
6. 頁首應顯示 `DEMO`。如果看到 `LIVE` 或顯示「無法連上 AirMe 服務」，到設定頁把「決賽示範模式」打開；DEMO 不需要後端。
7. 修改並儲存 `.tsx`、`.ts` 或 `.css` 檔後，Expo 會自動重新整理。若畫面沒有更新，先重新整理瀏覽器；不要立刻重裝所有依賴。
8. 停止開發伺服器時，回到正在執行的 Terminal，按 `Control + C`（macOS、Windows 都是 Control，不是 Command），確認終止。

### 如何檢查響應式版面

AirMe 同時支援手機與桌面。每次改版面至少檢查：

1. 在瀏覽器開啟首頁。
2. 按 `F12`（Windows）或用瀏覽器選單開啟開發者工具（macOS），選手機／平板圖示切換裝置寬度。
3. 看窄版是否仍能閱讀、按鈕沒有被遮住、按鈕可點、文字不溢出；再切回桌面寬度。
4. 用鍵盤 `Tab` 走訪可點的項目，確認焦點清楚可見、順序合理。
5. 進入一次主要流程，不只停在首頁：例如建立個人檔案 → 輸入活動 → 查看行動卡 → 回到設定。

請勿把任何個人健康資料、真實地址、帳號或老師提供的內部資料輸入 demo。測試完成後，若使用過私人資料，到 App 的設定頁按「清除全部資料」；資料會存在目前瀏覽器／裝置的本機儲存中。

### 用手機預覽（可選）

這只用於檢查手機尺寸，非必要條件。

1. 確認手機與電腦在同一個 Wi-Fi。
2. 在根目錄開新的或已停止的 Terminal，輸入：

   ```bash
   npm run start --workspace airme
   ```

3. 等終端機出現 QR code。
4. iPhone 用相機掃 QR code，依畫面用 Expo Go 開啟；Android 打開 Expo Go 後使用掃描 QR code 的功能。
5. 若手機無法連線，不要改後端設定或安裝 Docker。先用瀏覽器完成開發；手機網路／校園防火牆問題請記下錯誤畫面再問老師。

本專案也有 `npm run ios --workspace airme` 與 `npm run android --workspace airme` 指令，但前者需要 macOS 的 Xcode／Simulator，後者需要 Android Studio／emulator。學生只負責前端時不必安裝這些大型工具，除非老師明確分派原生裝置測試。

---

## 可選的前端公開設定 `.env`

### 大多數同學不需要建立 `.env`

預設 DEMO 模式不需要任何環境變數，也不應連到後端。若老師沒有明確交代要測本機 API，跳過本節。

AirMe 的公開前端設定範例在 `app/.env.example`，只有兩個值：

```dotenv
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api
EXPO_PUBLIC_API_TIMEOUT_MS=22000
```

它們都以 `EXPO_PUBLIC_` 開頭，代表會被編譯進 App／Web bundle；因此**不是秘密**。不要在任何 `EXPO_PUBLIC_*` 值放 API key、token、密碼、內部網址、個資或後端金鑰。

### 只有老師明確要求時才建立

在 AirMe **根目錄**執行下列其中一種指令：

#### macOS Terminal

```bash
cp app/.env.example app/.env
```

#### Windows PowerShell

```powershell
Copy-Item app\.env.example app\.env
```

接著在 VS Code Explorer 開啟 `app/.env`，只依老師提供的**非秘密**值修改。每次變更 `.env` 後，停止 Expo 後再重新執行 `npm run web --workspace airme`，讓設定重新載入。

`app/.env` 是本機檔案，已受根目錄 `.gitignore` 保護；即使如此，commit 前仍要確認它沒有出現在 staged files。若 GitHub、VS Code 或終端機顯示它將被提交，立刻停止並通知老師。

---

## AirMe 前端結構與可修改範圍

請在 VS Code Explorer 從根目錄往下看。學生前端主要工作在 `app/`，而不是根目錄、`backend/` 或 Docker 檔案。

```text
AirMe/
├── app/                         # 學生主要前端範圍：Expo Router + TypeScript
│   ├── src/
│   │   ├── app/                 # 路由頁面與每一頁的畫面組裝
│   │   ├── components/          # 可重用的產品元件
│   │   │   └── ui/              # 基礎按鈕、文字、卡片、版面元件
│   │   ├── design/tokens.ts     # 顏色、間距、圓角、字體等設計 token
│   │   ├── global.css           # Web 共用 CSS 與無障礙焦點樣式
│   │   ├── state/               # 產品流程與裝置端狀態：除非老師指派，勿改
│   │   ├── api/                 # API client：除非老師指派，勿改
│   │   ├── demo/                # 離線示範與安全情境：除非老師指派，勿改
│   │   └── storage/             # 本機資料保存：除非老師指派，勿改
│   ├── assets/images/           # App icon、favicon、既有圖片
│   ├── package.json             # 指令與相依套件；不要自行改或安裝套件
│   └── app.json                 # Expo App 設定；不要自行改
├── packages/contracts/          # 前後端共用資料契約：學生前端不得改
├── backend/                     # 後端、外部 API、資料庫：學生前端不得改
├── docker-compose*.yml          # Docker／部署：不使用、不修改
├── .github/workflows/           # CI：不要修改
├── package.json                 # npm workspace 與團隊指令：不要自行改
└── docs/                        # 專案說明文件
```

### 先從哪個檔案找畫面？

| 想調整的畫面 | 優先查看檔案 | 常一起看的元件 |
| --- | --- | --- |
| 全站外框、頁面切換、共用 Provider | `app/src/app/_layout.tsx` | 通常先不要改 `state/` |
| 首頁「今日空氣行動」、環境／活動雙欄 | `app/src/app/index.tsx` | `components/environment-hero.tsx`、`components/activity-composer.tsx`、`components/app-header.tsx` |
| 第一次建立個人檔案 | `app/src/app/onboarding.tsx` | `components/profile-form.tsx` |
| 行動卡、追問、回饋 | `app/src/app/recommendation.tsx` | `components/action-card.tsx`、`components/follow-up-panel.tsx`、`components/feedback-panel.tsx` |
| Air 日誌 | `app/src/app/history.tsx` | `components/history-list.tsx` |
| 通勤與路線 | `app/src/app/routes.tsx` | `components/route-planner.tsx` |
| 設定與 DEMO 切換 | `app/src/app/settings.tsx` | 先只調版面與文字，不改儲存邏輯 |
| 頁首、桌面／手機導覽 | `components/app-header.tsx` | `components/app-tabs.tsx`、`components/app-tabs.web.tsx`、`components/bottom-nav.tsx` |
| 共用按鈕、文字、卡片 | `components/ui/app-button.tsx`、`app-text.tsx`、`card.tsx`、`screen.tsx` | 改前先確認會影響哪些頁面 |
| 全產品色彩、間距、圓角、字級 | `design/tokens.ts` | 先和老師確認，因為會影響全站 |
| 網頁全域字型、focus、背景 | `global.css` | 僅 Web；仍要檢查手機版 |

### 可改與不可改的界線

**一般前端任務可改**

- `app/src/app/` 中被分派頁面的排版、顯示文案、可及性標籤與元件組合。
- `app/src/components/` 中被分派的前端元件與 `components/ui/` 的樣式（修改共用元件前先說明影響範圍）。
- `app/src/design/tokens.ts`、`app/src/global.css`，但這會影響多頁，需先讓老師知道。
- 老師明確指派的圖像／素材；要先確認授權、檔案大小與用途。
- 與你改動相對應的前端測試檔（通常是相同資料夾或 `src/features/` 下的 `*.test.tsx`）。

**除非老師明確分派，請不要改**

- `backend/`、`packages/contracts/`、Docker、資料庫、部署、GitHub Actions、根 `package.json`。
- `app/src/api/`、`app/src/state/`、`app/src/demo/`、`app/src/storage/`，特別是 API 呼叫、資料模型、DEMO 安全邏輯與本機保存規則。
- `app/package.json`、`package-lock.json`、`app/app.json`、`app/eas.json`、`app/Dockerfile`、`app/nginx.conf`、`.gitignore`。
- `node_modules/`、`app/.expo/`、`app/dist/`、`app/expo-env.d.ts` 等安裝或建置產物。
- `.env`、`.env.local`、任何 key、token、密碼、憑證、個資、真實健康情境。

> AirMe 是空氣健康輔助工具，不是醫療診斷工具。不要為了「讓畫面比較好看」而刪除或改寫安全提醒、資料來源狀態、DEMO／LIVE 標示、緊急協助提示或隱私文案。這些涉及產品與安全邊界，先提 PR 留言或問老師。

---

## 收到前端任務後怎麼開始

### 先把任務講清楚，再打開程式碼

開始前，請用自己的話確認以下五件事。缺任何一項、會影響畫面結果時，先問老師，不要猜。

1. **目標**：使用者看到什麼問題？要改善成什麼樣子？
2. **範圍**：哪一個頁面或元件？可改哪些檔案？
3. **不做什麼**：是否只調整視覺？有沒有不能動的文案、安全邏輯、資料欄位？
4. **完成標準**：桌面與手機寬度要如何表現？有沒有設計圖、文字、顏色或互動要求？
5. **交付方式**：branch 名稱、是否需要截圖、預計何時開 PR？

可直接複製下面訊息向老師確認：

```text
我理解這次要處理的是：<一句話描述目標>。
預計修改：app/src/<檔案或資料夾>。
不會修改：backend、API／狀態邏輯、資料庫、Docker、套件設定。
完成時會在桌面與手機寬度測試，並執行 lint、typecheck、test 後開 PR。
請確認這個範圍與完成標準是否正確；若有設計稿或必須保留的文案請提供。
```

### 建立 branch：永遠從最新 main 開始

在做任何修改前，開啟 Terminal，確認沒有未處理的變更，再從最新 `main` 建立 branch：

```bash
git status --short --branch
git switch main
git pull --ff-only origin main
git switch -c feat/<你的英文暱稱>-<簡短任務名稱>
```

請把尖括號換成實際內容，例如：

```bash
git switch -c feat/mei-home-activity-layout
```

branch 建議使用小寫英文、數字與連字號，類型可用：

- `feat/mei-home-activity-layout`：新增或明顯改善介面／互動
- `fix/mei-mobile-nav-overflow`：修正前端問題
- `style/mei-card-spacing`：純視覺、間距、排版調整
- `docs/mei-...`：只改文件時才使用

第一個 `git status` 若看到檔案或 `git switch main` 說會覆蓋你的修改，**先停止**。不要用 `git reset --hard`、`git checkout -- .`、`git clean` 或刪檔來「清乾淨」。先確認是否有尚未 commit 的工作，或把畫面與 `git status` 結果交給老師協助判斷。

### 在 VS Code 讀程式碼的安全方式

1. 先在 Explorer 找到任務對應的頁面檔案；可用 `Command + P`（macOS）／`Ctrl + P`（Windows）輸入檔名快速開啟。
2. 按 `Command + Shift + F`／`Ctrl + Shift + F` 搜尋畫面上看得到的繁中文字或元件名稱，從使用處往元件定義追。
3. 看 import 路徑：例如 `../components/activity-composer` 表示首頁組合了該元件。先理解資料從哪裡來，再改樣式。
4. 一次只改小段，存檔後立刻回瀏覽器檢查。避免一次改很多檔，出了問題才不知道是哪一項造成。
5. VS Code 下方 **Problems** 有紅色錯誤時先處理；滑鼠移到紅色底線可讀到 TypeScript／ESLint 提示。

---

## 修改、測試與自我檢查

### 每次修改的建議節奏

1. 先啟動 Web：`npm run web --workspace airme`。
2. 在一個小範圍完成修改並儲存。
3. 回瀏覽器檢查修改目標，再看至少一個未修改的相鄰頁面，確認共用元件沒有意外改壞。
4. 切換窄版／桌面寬度，檢查換行、點擊區域、橫向捲動與焦點。
5. 打開 VS Code 的 Source Control，逐一閱讀 diff；不屬於本次任務的檔案不要 stage。
6. 完成前執行下列前端檢查。

### 本專案可用的前端檢查指令

所有指令都在 AirMe **根目錄**執行：

```bash
# 程式風格與常見問題
npm run lint --workspace airme

# TypeScript 型別檢查；不會產生輸出檔
npm run typecheck --workspace airme

# 前端單元／元件測試
npm run test --workspace airme

# 產生正式 Web 靜態輸出，檢查是否可建置
npm run build:web --workspace airme
```

前端視覺修改至少要完成 `lint`、`typecheck`、`test` 和瀏覽器人工檢查。`build:web` 是送 PR 前的加強檢查；它會產生 `app/dist/`，此資料夾是忽略的建置產物，不能 commit。

若任一指令失敗：

1. 不要把失敗訊息藏起來或用 `--force` 跳過。
2. 從最上方第一個與你檔案相關的錯誤開始看；修正後重跑相同指令。
3. 若不確定，將「執行的指令、第一段完整錯誤、你改的檔案、瀏覽器現象」交給老師。不要貼上 `.env` 或任何秘密。

### 送 PR 前的人工檢查

在 DEMO 模式完成以下項目：

- [ ] 首頁可開、沒有紅色錯誤畫面。
- [ ] 任務目標畫面在桌面與窄版都可讀、可操作，沒有水平捲動或被切掉的按鈕。
- [ ] 可以用鍵盤 `Tab` 看到清楚焦點，按鈕與連結可以操作。
- [ ] `DEMO` 標籤、資料來源／安全／隱私重要文案仍存在且含義正確。
- [ ] 未輸入真實個資、健康資料、住址或任何金鑰；測試後已清掉自己的本機資料。
- [ ] `npm run lint --workspace airme` 通過。
- [ ] `npm run typecheck --workspace airme` 通過。
- [ ] `npm run test --workspace airme` 通過。
- [ ] 已閱讀 diff，只包含本次任務該有的檔案。

---

## 協作流程 A：使用 VS Code Source Control

這條路適合不熟悉指令的同學。仍建議用下方終端機指令讀取狀態與處理 rebase，因為它會更清楚地說明發生什麼事。

### A1. 建 branch

1. 先確定沒有未完成修改。點 VS Code 左側 **Source Control**；若有檔案列在 Changes，先不要切 branch。
2. 點 VS Code 左下角狀態列顯示的 branch 名稱（最初通常是 `main`）。
3. 選 **Create new branch...**，輸入例如 `feat/mei-home-activity-layout`。
4. 出現「從哪個 branch 建立」時，選最新的 `main`。如果無法確認是否最新，改依照上節的終端機 `git pull --ff-only origin main` 更新後再建立。
5. 左下角 branch 名稱變成你的 branch 才開始改檔。

### A2. 看 diff、stage、commit

1. 修改完成後按左側 **Source Control**，快捷鍵是 `Command + Shift + G`（macOS）或 `Ctrl + Shift + G`（Windows）。
2. 在 **Changes** 清單逐一點檔案；右側會顯示 diff。綠色是新增、紅色是刪除。確認沒有 `.env`、`node_modules`、`dist`、不相干檔案或意外整檔格式化。
3. 只對本次任務的檔案按旁邊的 `+`（Stage Changes）。不要點「Stage All Changes」，除非清單中的每個檔案都是你這次有意提交的。
4. 在上方訊息欄輸入一行 commit 訊息。格式是：`<類型>(<範圍>): <繁體中文說明>`，例如：

   ```text
   feat(app): 改善首頁活動輸入區的手機版排版
   ```

   可用類型：`feat`（新介面／功能）、`fix`（修正）、`style`（純樣式）、`docs`（文件）、`test`（測試）。範圍通常填 `app`。
5. 再看一次 **Staged Changes**，確認只有本次檔案，按 **Commit**。若 VS Code 問是否先 stage 全部檔案，選擇取消，回去只 stage 確定的檔案。
6. Commit 只是記錄在你的電腦，還沒有送給老師。接著按 **Publish Branch** 或 Source Control 的 `...` 選單中 **Push**。第一次可能跳出 GitHub 登入，請登入自己的帳號。

### A3. 用 VS Code 開 PR 或到 GitHub 開 PR

branch 第一次成功 push 後，VS Code 可能在 Source Control 上方顯示 **Create Pull Request**。可按它並選擇 base branch `main`；若沒有這個按鈕，直接到 AirMe GitHub repo：

1. GitHub 通常會顯示 **Compare & pull request**，按下它；若沒出現，點 **Pull requests → New pull request**。
2. 確認 `base` 是 `main`、`compare` 是你的 branch。不能反過來。
3. 先看 **Files changed**，再次確認只有本次任務檔案。
4. 用[PR 範本](#pr-範本)填 title 與說明，按 **Create pull request**。
5. 在 PR 留言標註老師或指定 reviewer（若團隊已有分派方式），不要按 Merge。

### A4. 收到 review 後

1. 在 GitHub PR 的 **Files changed**／**Conversation** 閱讀每一則留言。先理解「要改什麼」與「為什麼」，不確定先在該留言回問。
2. 回 VS Code，確認左下角仍是原本的 PR branch；不要另開 branch。
3. 修改、瀏覽器測試、執行檢查。
4. 在 Source Control 只 stage 這次回覆相關檔案，commit，例如：

   ```text
   fix(app): 修正審查指出的按鈕焦點樣式
   ```

5. 按 **Push**。同一條 branch 的新 commit 會自動出現在原 PR，**不用**開第二張 PR。
6. 回 GitHub，在每則已處理的 review 留言下回覆「已於 `<commit 簡短描述>` 調整，並完成 `<檢查名稱>`」，不要只寫「改好了」。是否 Resolve conversation 依老師團隊習慣；不確定就先不要自行 resolve。

---

## 協作流程 B：使用終端機 Git 指令

這條路最適合需要精準確認狀態、同步 `main`、處理衝突時使用。所有指令都在 AirMe **根目錄**的 VS Code Terminal 執行。

### B1. 開始新任務：更新 main、建立 branch

```bash
# 先確認目前位置、branch 與是否有未提交修改
git status --short --branch
git branch --show-current

# 只有在工作區乾淨時才切回 main 並更新
git switch main
git pull --ff-only origin main

# 從最新 main 建一條自己的 branch；名稱請換成真正任務
git switch -c feat/mei-home-activity-layout

# 最後確認現在不是 main
git status --short --branch
git branch --show-current
```

`git pull --ff-only origin main` 只接受可安全直線更新的情況；如果失敗，不要改成其他 pull 參數硬做，也不要 merge。先保留錯誤並問老師。

### B2. 檢查、stage、commit

完成修改與前端檢查後：

```bash
# 看清楚修改檔案，確認 branch 不是 main
git status --short --branch
git diff -- app/src/app/index.tsx app/src/components/activity-composer.tsx

# 只加入本次任務確定要提交的檔案；請換成你實際改過的路徑
git add app/src/app/index.tsx app/src/components/activity-composer.tsx

# 再看 staged diff；沒有看到不該有的檔案才繼續
git diff --staged

# 建立本機 commit
git commit -m "feat(app): 改善首頁活動輸入區的手機版排版"
```

上面用兩個檔案只是示範，請務必換成自己實際修改的路徑。**不要**使用 `git add .`、`git add -A` 或 `git commit -am`，以免把不相干檔案、環境檔或別人的修改一起送出。

### B3. Push 自己的 branch

第一次推送 branch：

```bash
git push -u origin feat/mei-home-activity-layout
```

之後在同一條 branch 新增 commit，只要：

```bash
git push
```

push 成功後 GitHub 會有你的 branch。請到 GitHub 依[開 PR](#開-pr回應-review-與同步-main)章節建立 PR。若系統說沒有權限、repository not found 或 push 被拒絕，先確認你已接受邀請、目前是自己的 branch、`git remote -v` 是 AirMe repo；仍無法處理就把完整錯誤交給老師。不要改 remote URL、不要推送 `main`、不要建立新 repo。

### B4. 同一張 PR 的後續修改

```bash
# 先確認還在原本的 PR branch
git branch --show-current
git status --short --branch

# 修改、測試後，只 stage 明確檔案並 commit
git add app/src/components/<實際檔名>.tsx
git commit -m "fix(app): 修正審查指出的按鈕焦點樣式"

# 更新既有 PR
git push
```

### B5. 需要追上最新 main 時：rebase

只有下列情況才做 rebase：老師要求、GitHub 顯示 PR 無法自動合併，或你知道 `main` 有影響同一區塊的新變更。rebase 前必須先 commit 或確認沒有未提交修改。

```bash
# 1. 確認正在自己的 branch，且工作區乾淨
git branch --show-current
git status --short --branch

# 2. 取得遠端最新資訊，但不直接修改工作檔案
git fetch origin

# 3. 將自己的 commits 接到最新 origin/main 後面
git rebase origin/main
```

如果 rebase 成功，重新跑前端檢查後推送：

```bash
git push --force-with-lease
```

`--force-with-lease` 只可用於**你自己的 PR branch**，而且只在 rebase 後使用；它會安全地更新 GitHub 上同一條 branch 的歷史。絕對不要對 `main` 使用。

#### 遇到衝突怎麼辦

衝突代表同一段程式被不同人改過，Git 無法替你猜要留哪個版本。不要盲目按「Accept Current」或「Accept Incoming」，因為這些名稱在 rebase 時容易誤解。

1. 停在錯誤狀態時先輸入：

   ```bash
   git status
   ```

2. 在 VS Code Source Control 的 **Merge Changes** 打開衝突檔案，閱讀兩邊的內容和任務目標；用 Merge Editor 合併成正確的最終版本。
3. 不知道哪段要保留時，先把衝突檔、上下文和 `git status` 結果交給老師，暫停處理即可。
4. 解決後只 stage 衝突檔，接著繼續：

   ```bash
   git add <已解決的檔案路徑>
   git rebase --continue
   ```

5. 如果又出現衝突，重複上述步驟。全部完成後執行 lint、typecheck、test，再用 `git push --force-with-lease` 更新 PR。
6. 如果你發現自己不確定或做錯方向，可以安全取消這次尚未完成的 rebase：

   ```bash
   git rebase --abort
   ```

   這只會回到開始 rebase 前的 branch 狀態；然後向老師說明衝突，不要自行嘗試破壞性指令。

---

## 開 PR、回應 review 與同步 main

### 開 PR 前最後一次確認

在 GitHub 按建立 PR 前，確認：

```bash
git status --short --branch
git branch --show-current
git remote -v
```

- branch 名稱不能是 `main`。
- `git status` 不應有你忘了 commit 的重要檔案，也不應出現 `.env`、憑證、`node_modules` 或建置產物。
- `origin` 必須是團隊 AirMe repo。

### 在 GitHub 建立 PR

1. Push 後到 [AirMe repository](https://github.com/Sutdents-Project-Hub/AirMe)。
2. 點 **Compare & pull request**；沒有按鈕時，點 **Pull requests → New pull request**。
3. 上方比較器一定要是：**base: `main` ← compare: 你的 branch**。這表示「請把我的修改提給 main 審查」，不是反向合併。
4. 點 **Files changed**，從上到下確認：修改符合任務、沒有敏感資料、沒有不相干的格式化或產物、刪除內容沒有誤刪。
5. 填寫 title 與說明後按 **Create pull request**。
6. 不要按任何 Merge 按鈕。主分支由老師依 review 與自動檢查決定合併。

### PR 範本

PR 標題格式：`<type>(app): <繁體中文簡短描述>`，例如 `feat(app): 改善首頁活動輸入區的手機版排版`。

將下列內容貼到 PR 說明，再把尖括號內容換成實際資訊：

```markdown
## 目的

<使用者遇到的問題，以及本次想改善的結果>

## 修改範圍

- <檔案或元件 1：做了什麼>
- <檔案或元件 2：做了什麼>

## 沒有修改的範圍

- 未修改後端、API／狀態邏輯、資料庫、Docker、套件設定與秘密。

## 驗證

- [x] DEMO 模式手動檢查：<測試的畫面與流程>
- [x] 桌面與窄版寬度檢查
- [x] `npm run lint --workspace airme`
- [x] `npm run typecheck --workspace airme`
- [x] `npm run test --workspace airme`
- [ ] `npm run build:web --workspace airme`（若未執行，填原因）

## 風險／請 reviewer 特別查看

- <例如：共用按鈕樣式會影響首頁、設定頁與行動卡；請確認視覺一致性。>

## 截圖或錄影（如適用）

<貼上不含個資、秘密或真實健康資料的截圖；純文案／小修可寫「不適用」。>
```

只勾選你真的執行過的項目。若測試失敗或沒執行，誠實寫出原因和目前狀態，這比假裝通過更能幫助團隊。

### PR 被 review 後怎麼回應

1. 先讀完全部留言與 GitHub Actions 檢查結果。若留言相互矛盾，先在 PR 問老師，不要猜哪一位的意思優先。
2. 每個建議分成三種：
   - **同意且清楚**：直接在同一條 branch 修改、測試、commit、push。
   - **需要釐清**：在原留言下說明你的理解並提問。
   - **不同意或會擴大範圍**：用具體理由、截圖或限制說明，請老師決定；不要默默忽略。
3. 新 push 會自動更新同一張 PR，請勿另開 PR。
4. 回覆時寫清楚位置與驗證，例如：「已將 `app/src/components/activity-composer.tsx` 的按鈕最小高度調整為設計 token，並以窄版與 `npm run test --workspace airme` 驗證。」
5. 等老師核准與合併。PR 已合併後，不要在同一條 branch 接著做另一個任務。

### PR 合併後，讓本機回到最新 main

確認 GitHub PR 顯示 **Merged** 後，再在根目錄執行：

```bash
git switch main
git pull --ff-only origin main
git status --short --branch
```

看到 `main` 已是最新且工作區沒有未提交修改，即可開始下一個任務。是否刪除本機舊 branch 依老師習慣；不確定先保留，不會影響已合併的成果。

---

## 每日開工／收工清單

### 開工：準備一個乾淨的任務環境

1. 開 GitHub 看自己未合併的 PR、review 留言與老師的新任務；先處理同一條 PR 的 review，不要重複做相同功能。
2. 在 VS Code 開 **AirMe 根目錄**，開 Terminal。
3. 執行 `git status --short --branch`。若有上次未處理的修改，先確認它屬於哪個任務；不要直接丟掉。
4. 若要做新任務，依序執行：

   ```bash
   git switch main
   git pull --ff-only origin main
   git switch -c <新的 branch 名稱>
   ```

5. 執行 `npm run web --workspace airme`，確認 DEMO 網頁可正常開啟。
6. 再開始改。每做一小段就儲存與檢查，不要最後才第一次看畫面。

### 收工：讓別人可以接手

1. 儲存所有檔案，回瀏覽器做一次主要流程與窄版檢查。
2. 執行 `npm run lint --workspace airme`、`npm run typecheck --workspace airme`、`npm run test --workspace airme`；把結果記在 PR 或工作回報。
3. 在 Source Control／`git diff` 逐檔檢視；確定沒有 `.env`、`node_modules`、`dist`、截圖暫存或別人的檔案。
4. 只 stage 明確檔案，commit 一個能說明目的的訊息，push 自己 branch。
5. 尚未有 PR 就開 PR；已有 PR 就確認 GitHub 已出現最新 commit，並回應 review 留言。
6. 若還沒完成，也要 push 一個可閱讀的 WIP commit，並在 PR／訊息寫下：已完成什麼、尚未完成什麼、卡在哪裡、下一步要做什麼。不要把未儲存的修改只留在自己電腦。
7. 停止 Expo 時按正在跑伺服器的 Terminal 的 `Control + C`。不需要刪除 `node_modules` 或重裝依賴。

---

## 常見問題排除

### `git: command not found` 或 `git` 不是可辨識的指令

- Git 尚未安裝完成，或安裝後 Terminal 尚未重開。
- macOS：重新開 Terminal，再跑 `git --version`；必要時重新執行 `xcode-select --install`。
- Windows：重新開 VS Code 與 Terminal；仍失敗就重新安裝 Git for Windows，確認選了可從命令列使用 Git 的 PATH 選項。
- 不要下載不明的「Git 修復工具」。

### `node --version` 不是 `v22.`，或 `npm ci` 出現 engine／版本錯誤

- AirMe 要求 Node.js 22.x；不要因 Node 官網顯示新 LTS 就裝其他 major version。
- 移除或更新錯誤的 Node 安裝後，從官方的 Previous releases 安裝 v22.x；重開 Terminal 再確認 `node --version`。
- 先不要改 `package.json` 的 `engines`、不要用 `--force` 跳過錯誤。

### `npm ci` 失敗

1. 先確認在 AirMe 根目錄：輸入 `ls`（macOS）或 `Get-ChildItem`（Windows PowerShell），應看得到根 `package.json` 與 `package-lock.json`。
2. 確認 `node --version` 以 `v22.` 開頭。
3. 校園網路、代理、防毒軟體可能阻擋下載；把完整第一段 `npm ERR!` 交給老師或網管。
4. 不要改 lockfile、不要刪除整個專案、不要用 `sudo npm ci` 或 `npm ci --force`。依賴安裝狀態不明時請老師協助。

### Expo 網頁沒有自動打開、或不知道網址

- 確認 `npm run web --workspace airme` 還在 Terminal 持續執行。
- 在該 Terminal 按小寫 `w`，或複製 Expo 輸出中實際顯示的 Web URL 到瀏覽器；不要猜 port。
- 若提示某個 port 被占用，讀取 Expo 的問題與選項；若它提供改用其他 port 並得到你的同意，再使用終端機顯示的新 URL。
- 若你只是要前端開發，請保持 DEMO；不要為了這個問題啟動後端或 Docker。

### 畫面顯示「無法連上 AirMe 服務」

- 這通常是切到了 `LIVE`，但學生電腦沒有也不應啟動後端。
- 開設定頁，將「決賽示範模式」開啟，讓頁首顯示 `DEMO`。
- 如仍不正常，可在設定頁使用「清除全部資料」後重新進入 onboarding（會清掉本機測試資料）。
- 不要索取、填入或把任何 API key 加到 `.env`。

### 改了程式但瀏覽器沒有更新

- 先確認檔案已儲存（分頁名稱旁沒有未儲存的圓點）。
- 重新整理瀏覽器；仍無效時停止 Expo（`Control + C`）再重新執行 `npm run web --workspace airme`。
- 確認你改的是 `app/src/` 的原始碼，而不是 `app/dist/`、`node_modules/` 或其他產物。

### VS Code 有紅色錯誤、lint／typecheck／test 失敗

- 先讀最上方第一則與自己檔案有關的錯誤，不要只看最後一行。
- 回到最近改過的檔案，檢查括號、import 名稱、TypeScript 型別、元件 prop 是否正確。
- 存檔後重新執行同一條檢查指令。若錯誤來自你未修改的後端或不明檔案，保留輸出並問老師；不要順手改出範圍的程式碼。

### `git push` 被拒絕、permission denied、repository not found

- 到 GitHub 確認已接受 AirMe invitation，且 VS Code／瀏覽器登入的是正確帳號。
- 執行 `git branch --show-current`，確定不是 `main`；執行 `git remote -v`，確定是 AirMe repo。
- 若公司／學校帳號與個人帳號同時登入，登出錯誤帳號再重新授權 VS Code。
- 仍失敗就將完整錯誤貼給老師。不要改 remote、不要建立新 repository、不要把程式碼用 email 或聊天室貼出去。

### Git 顯示 merge conflict 或 PR 顯示有衝突

- 先停止修改，執行 `git status` 看清楚狀態。
- 依[需要追上最新 main 時：rebase](#b5-需要追上最新-main-時rebase)處理；不知道該保留哪段時請老師決定。
- 不要用 `git reset --hard`、`git clean -fd`、強制覆蓋 `main` 或隨意點「Accept Current／Incoming」來消除衝突。

### 我不小心在 `main` 改了檔案或 commit 了

- 立刻停止，不要 push，也不要嘗試重寫歷史。
- 執行 `git status --short --branch`、`git log -1 --oneline`，截圖或貼出結果給老師。老師會依目前是否已 push 決定安全作法。

### 我看到 `.env`、token、密碼、真實個資或不該公開的檔案

- 不要 stage、commit、push、貼到 PR、聊天室或截圖。
- 若已 stage，先在 VS Code Staged Changes 對該檔按 `-`（Unstage），或通知老師協助。
- 如果已 push，立刻通知老師，不要自行 force push 或刪除歷史；可能需要輪替憑證與處理遠端紀錄。

---

## 最小指令速查表

所有指令從 AirMe 根目錄執行：

```bash
# 確認工具版本（Node 必須是 v22.x）
git --version
node --version
npm --version

# 第一次安裝相依套件
npm ci

# 前端開發（推薦瀏覽器）
npm run web --workspace airme

# 可選：Expo QR code／手機預覽
npm run start --workspace airme

# 前端檢查
npm run lint --workspace airme
npm run typecheck --workspace airme
npm run test --workspace airme
npm run build:web --workspace airme

# 開始新任務前更新 main
git status --short --branch
git switch main
git pull --ff-only origin main
git switch -c feat/<你的名稱>-<任務>

# 只提交明確檔案、推送自己的 branch
git add app/src/<實際檔案>
git diff --staged
git commit -m "feat(app): <繁體中文描述>"
git push -u origin <你的 branch>  # 第一次 push
git push                           # 後續 push
```

只要遵守「在自己的 branch 修改、DEMO 模式測試、只提交明確檔案、用 PR 交給老師合併」四件事，就能安全地和團隊協作。遇到不確定的權限、資料、後端、安全或 Git 衝突，停下來問，比猜測後硬做更快也更安全。
