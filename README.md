# 研習證明書產生系統

一個給日間照護中心、社福機構使用的研習證明書批次產生工具，協助社工把以往「手動複製貼上」的繁瑣作業自動化。

**為「財團法人台南市私立天主教瑞復益智中心」量身設計**，但其他機構也可以 fork 後客製化使用。

## 這個工具能做什麼

從「員工名單 + 訓練資訊 + 課程清單」一鍵產出：

- 📄 **每人一份研習證明書 PDF**（標楷體、含機構印章與主任簽名章）
- 📋 **每堂課一份在職訓練登錄表 docx**（送社會局備查格式，A4 橫向）
- 📊 **自動寫入 Google 試算表**作為發放紀錄（可選用）
- 📦 全部打包成一個 ZIP 自動下載

完整離線運作（含 PDF、docx、ZIP 產生），只有「寫入 Google 試算表」這一步需要網路。

## 技術特色

- **單一 HTML 檔，~1.3 MB**：所有函式庫內嵌，無外部相依
- **零安裝**：社工只要瀏覽器（Chrome / Edge / Firefox / Safari 都支援）
- **資料本地化**：員工身分證、生日等個資存在瀏覽器 localStorage，不上雲
- **跨平台**：Windows / macOS / Linux 都能跑（Windows 為主要目標平台）
- **印章設定後內建**：機構印章與主任簽名章上傳一次後存在本機，PDF 自動內嵌

## 快速開始

### 給社工（最終使用者）

直接下載 [dist/cert-generator.html](dist/cert-generator.html)，雙擊用瀏覽器打開即可。

完整使用步驟見 [docs/user-guide.md](docs/user-guide.md)。

### 給部署者（機構負責人）

1. 從 [Releases](../../releases) 下載最新版本的 HTML 檔
2. 準備兩張印章圖（機構用印、主任簽名章，PNG 去背最佳）
3. 建立一張 Google 試算表用來記錄發放歷史，套用 Apps Script 教學
4. 把 HTML 檔放到機構共用雲端硬碟或寄給社工

完整部署流程見 [docs/deployment.md](docs/deployment.md)。

### 給開發者（要修改原始碼）

```bash
# clone 專案
git clone <repo-url>
cd cert-generator

# 安裝開發相依（只有 build 用）
npm install

# 開發：直接用瀏覽器開啟
open src/index.html

# 改完後重新打包成內嵌版
npm run build

# 產出檔案在 dist/cert-generator.html
```

開發時 `src/index.html` 用 CDN 載入函式庫；build 後變成單一檔案內嵌所有相依。

## 目錄結構

```
.
├── README.md                # 本文件
├── LICENSE                  # MIT 授權
├── package.json             # npm 設定（開發用）
├── src/
│   └── index.html           # 開發版（CDN 載入函式庫）
├── scripts/
│   └── build.js             # 內嵌打包腳本
├── dist/
│   └── cert-generator.html  # 內嵌好的單一檔案（給社工下載）
├── docs/
│   ├── deployment.md        # 部署指南
│   ├── user-guide.md        # 社工操作手冊
│   └── apps-script.gs       # Google Apps Script 程式碼
└── examples/
    └── employees-template.csv  # 員工主檔範例格式
```

## 如何客製化給你的機構

如果你不是天主教瑞復益智中心，要客製化給自己的機構使用，最少需要改這幾個地方（都在 `src/index.html`）：

1. **機構名稱**：搜尋「財團法人台南市私立天主教瑞復益智中心」，全部替換
2. **文號前綴**：搜尋「南市社身字第」，改成你們的主管機關格式
3. **頂部抬頭**：搜尋「臺南市政府社會局」
4. **印章圖**：在工具的「設定」分頁上傳你們自己的印章
5. **登錄表標題**：搜尋「身心障礙者服務人員在職訓練登錄表」，改成適用的表單名稱

改完後跑 `npm run build` 重新打包。

## 相依函式庫

開發相依（runtime 都內嵌進 HTML，使用者不用裝）：

| 函式庫 | 用途 | 版本 |
|---|---|---|
| [SheetJS / xlsx](https://github.com/sheetjs/sheetjs) | Excel 匯入匯出 | 0.18.5 |
| [html2canvas](https://github.com/niklasvh/html2canvas) | HTML 轉圖片 | 1.4.1 |
| [jsPDF](https://github.com/parallax/jsPDF) | PDF 產生 | 2.5.1 |
| [JSZip](https://github.com/Stuk/jszip) | ZIP 打包 | 3.10.1 |
| [docx](https://github.com/dolanmiu/docx) | Word docx 產生 | 7.8.2 |

## 已知限制

- **PDF 是「圖片格式」**：採用 html2canvas + jsPDF 路線，PDF 內的文字無法複製/搜尋，但視覺呈現完整、跨機器一致
- **單一使用者**：員工主檔存在瀏覽器 localStorage，多人同時編輯主檔需自行協調（適合「一個社工負責」的情境）
- **30 人/場為設計上限**：超過會比較慢（每張 PDF 需 1-2 秒），但仍可運作

## 授權

[MIT License](LICENSE) — 歡迎自由使用、修改、散布。

## 致謝

- 字型支援：感謝微軟與 Apple 在系統內建「標楷體」/「BiauKai」字型
