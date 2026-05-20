# 輸出格式說明（PDF 與 DOCX 改哪裡）

這份文件給「想改證書／登錄表內容、樣式」的人看。所有要改的程式碼都在 **`src/index.html`** 裡。改完後記得跑 `npm run build` 重新產出 `dist/cert-generator.html`。

> 行號為 v0.4.2（commit 65c554a）當下的位置；若有偏移，搜尋下方標明的「錨點字串」即可定位。

---

## 一、兩種輸出比較

| 項目 | PDF（研習證明書） | DOCX（在職訓練登錄表） |
|---|---|---|
| 每個檔案代表 | 一位員工一份 | 一堂課程一份（多位員工共用同一張表） |
| 紙張尺寸 | A4 直式 | A4 橫向（landscape） |
| 字型 | 標楷體（DFKai-SB / BiauKai / Kaiti TC） | 標楷體 |
| 技術路徑 | HTML → html2canvas → JPEG → jsPDF | docx 函式庫直接組裝 XML |
| 文字可否複製 | ❌（PDF 內是圖片） | ✅（真實 Word 表格） |
| 為何選這條路 | 跨平台保證中文字型一致 | 主管機關備查需可編輯表格 |

> **重要：PDF 的文字不可複製是刻意的**，不要為了「修好它」改成 text-based PDF，會直接破壞中文字型跨機器一致性。詳見 `CLAUDE.md`「PDF rendering quirk」段落。

---

## 二、PDF（研習證明書）改這裡

### 2.1 PDF 內容（文字、欄位、版面）

PDF 是由一段 HTML 模板「拍照」而來。模板在：

**`src/index.html` 函式 `buildCertHtmlForPdf()` — 約 line 1984**

```
buildCertHtmlForPdf(emp, t, courses, totalHours)
```

模板結構（由上到下，對應 PDF 上的位置）：

| PDF 區塊 | 內容 | CSS class | 在 `buildCertHtmlForPdf` 的位置 |
|---|---|---|---|
| 大標題 | `研習證明書` | `.cert-title` | line 1997 |
| 右上日期 + 文號 | `臺南市政府社會局 YYY 年 M 月 D 日`<br>`南市社身字第 XXX 號` | `.cert-meta` | line 1998–2001 |
| 受訓人資訊 | `〇〇 君（身分證字號 …）（生日 …）` | `.cert-person` | line 2002–2004 |
| 主文 | `參加 [機構] 於中華民國 … 辦理之研習訓練課程共計 N 小時，訓練結業。` | `.cert-body` | line 2005–2007 |
| 證明語 | `特此證明` | `.cert-attest` | line 2008 |
| 課程明細表 | 課程名稱 / 講師 / 時數 | `.pdf-cert table` | line 2009–2016 |
| 機構印章 + 機構名 | 一行圖+文字 | `.cert-org-line` | line 2018–2021 |
| 主任簽名章 | `主任` 標籤 + 簽章圖 | `.cert-director-line` | line 2022–2025 |
| 底部簽發日期 | `中華民國 … 年 … 月 … 日` | `.cert-date-bottom` | line 2027–2029 |

**常見想改的東西：**

- 「研習證明書」改別的標題 → 改 line 1997 的字串
- 「特此證明」改別的結語 → 改 line 2008
- 主文寫法（例如把「訓練結業」改成「結訓」）→ 改 line 2005–2007
- 想多加一行（例如備註、文號等）→ 在對應位置加 `<div class="…">…</div>`，並到 CSS（見 2.2）加對應 class

### 2.2 PDF 樣式（字型、字級、間距、印章大小）

PDF 用的 CSS class 全部以 `.pdf-cert` 開頭，**和螢幕預覽 `.cert-preview` 是兩套獨立樣式**，改一邊不會影響另一邊。

**`src/index.html` CSS 區塊 `.pdf-cert` — 約 line 800–913**

| 想調 | 改哪個 class | 約略行號 |
|---|---|---|
| 整張紙的邊界 / 字型家族 / 行高 | `.pdf-cert` | line 800–809 |
| 大標題字級、字距 | `.pdf-cert .cert-title` | line 810–817 |
| 右上日期文號的對齊、字級 | `.pdf-cert .cert-meta` | line 818–823 |
| 受訓人那一行的字級 | `.pdf-cert .cert-person` | line 824 |
| 主文字級 | `.pdf-cert .cert-body` | line 825 |
| 「特此證明」字距 | `.pdf-cert .cert-attest` | line 826–831 |
| 課程表格樣式（框線、欄寬、字級） | `.pdf-cert table` / `th` / `td` | line 832–853 |
| 機構印章那一行的對齊、間距 | `.pdf-cert .cert-org-line` | line 858–864 |
| 主任簽章那一行的縮排、對齊 | `.pdf-cert .cert-director-line` | line 865–871 |
| 機構印章大小 | `.pdf-cert .seal-img-inst`（width/height） | line 872–877 |
| 主任簽章大小 | `.pdf-cert .seal-img-dir`（height） | line 878–882 |
| 還沒上傳印章時顯示的虛線框 | `.seal-placeholder` / `.signature-placeholder` | line 883–908 |
| 底部簽發日期字級、置中 | `.pdf-cert .cert-date-bottom` | line 909–913 |

**注意事項：**

- 字級請用 `pt` 而不是 `px`（PDF 是印刷品，pt 比較直觀）
- 紙張寬度 `.pdf-cert { width: 210mm }`（line 801）對應 A4，**不要改**，否則 html2canvas 出來的比例會跑掉
- `padding: 25mm 25mm`（line 802）= PDF 上下左右留白，想擠多一點內容可縮小

### 2.3 PDF 印章圖檔來源

- 機構印章：`state.settings.sealInstitution`（data URL，存在 localStorage）
- 主任簽章：`state.settings.sealDirector`（data URL，存在 localStorage）
- 都是在 UI 的「設定」分頁上傳的，**不在程式碼裡寫死**
- 若沒有上傳，會自動顯示紅色／藍色虛線占位框（`.seal-placeholder` / `.signature-placeholder`）

### 2.4 PDF 解析度與檔案大小

`generatePdfBlob()` — 約 line 2035：

- `scale: 2`（line 2059）→ html2canvas 的取樣倍率。調高 = 更清楚但檔案更大；調低 = 模糊但檔案小
- `'image/jpeg', 0.96`（line 2093）→ JPEG 品質。0.96 是「肉眼幾乎無損」與檔案大小的折衷
- 想要更清楚但更大檔，把 scale 改 3；想要小檔可降到 0.85

### 2.5 PDF 檔名規則

`generateAll()` — 約 line 2355 附近，PDF 檔名格式為：
```
{員工姓名}_{文號}.pdf   ← 姓名會先經過 sanitizeFilename()
```
- 想改檔名規則 → 搜尋 `pdfBlob` 之後的 `.pdf` 字串看上下文

---

## 三、DOCX（在職訓練登錄表）改這裡

### 3.1 DOCX 整體結構

**`src/index.html` 函式 `generateRegistrationDocx()` — 約 line 2101**

```
generateRegistrationDocx(employees, t, course)
```

每堂課產生一份 DOCX；表格內每位被選到的員工 = 一列。

| DOCX 區塊 | 內容 | 在函式內位置 |
|---|---|---|
| 大標題 | `身心障礙者服務人員在職訓練登錄表` | line 2146–2155（`titlePara`） |
| 表頭（8 欄） | 姓名 / 身分證字號 / 在職訓練日期 / 課程名稱 / 辦理單位 / 合格時數 / 主管機關備查日期及文號 / 備註 | line 2158–2164（`headers` 陣列） |
| 員工資料列 | 每位員工一列，填上同一堂課程資訊 | line 2167–2178 |

### 3.2 DOCX 改欄位（增 / 減 / 改順序 / 改文字）

要改欄位需要**同步改三個地方**，順序不能錯：

1. **欄寬陣列** `colWidths`（line 2120）— 8 個數字，單位 DXA，總和必須維持 ≈ 內容區寬度
2. **表頭文字** `headers`（line 2158–2160）— 8 個字串
3. **員工列填值** `employeeRows`（line 2167–2178）— 每個 `makeCell(...)` 對應一欄

**範例：把「備註」欄改成「核章」**
- 第 8 個 header 改成 `'核章'`（line 2160）
- 第 8 個 `makeCell('', colWidths[7])` 維持空字串（line 2176）即可

**範例：刪掉「身分證字號」欄**
- `colWidths` 移掉第 2 個元素，並把寬度勻給其他欄
- `headers` 移掉 `'身分證字號'`
- `employeeRows` 移掉 `makeCell(emp.idNumber, colWidths[1])`
- 後面所有 `colWidths[N]` 的索引要往前挪一格

### 3.3 DOCX 樣式

| 想調 | 改哪 | 約略行號 |
|---|---|---|
| 全文預設字型 | `default.document.run.font: '標楷體'` | line 2189 |
| 全文預設字級 | `default.document.run.size: 20`（單位 half-pt，20 = 10pt） | line 2189 |
| 表頭字級 | `makeCell` 內 `size: isHeader ? 20 : 18` | line 2130 |
| 表頭底色 | `shading.fill: 'E8EFEB'` | line 2140 |
| 表格框線粗細 | `border = { size: 6, ... }`（單位 1/8 pt） | line 2115 |
| 儲存格內 padding | `cellMargins = { top: 100, bottom: 100, ... }`（單位 DXA） | line 2117 |
| 紙張方向 | `PageOrientation.LANDSCAPE` | line 2198 |
| 上下左右邊界 | `margin: { top: 720, ... }`（單位 DXA，720 = 0.5 inch） | line 2200 |

### 3.4 DOCX 單位對照表

`docx` 函式庫的單位很亂，常用換算：

| 單位 | 出現在 | 1 單位 = |
|---|---|---|
| **DXA** | colWidths, cellMargins, page.margin | 1/20 pt → 1 inch = 1440 DXA、1 cm ≈ 567 DXA |
| **half-pt** | TextRun.size | 1/2 pt → `size: 24` = 12pt |
| **1/8 pt** | border.size | 1/8 pt → `size: 6` ≈ 0.75pt 框線 |

---

## 四、預覽畫面（不是 PDF）

UI 上「預覽證書」按鈕跑的是另一段獨立 HTML，不是 PDF 的模板。它在：

**`src/index.html` 函式 `previewCertificate()` — 約 line 2309**

對應樣式在 `.cert-preview` CSS 區塊（約 line 551–679）。

> **如果改了 PDF 的版面，請同步改預覽**，否則社工點預覽看到的會跟下載的 PDF 不一樣。兩段模板結構幾乎相同，class 名也對齊（一個用 `.pdf-cert .xxx`、另一個用 `.cert-preview .xxx`），方便 diff 對照。

---

## 五、Google 試算表寫入的欄位

不是直接的「輸出檔」，但每次產生證書後會送資料到試算表。要改試算表記錄的欄位需要兩處同步：

1. `generateAll()` 內組 `sheetRow` 物件的欄位（約 line 2355 之後）— 客戶端送什麼上去
2. `docs/apps-script.gs` 和「設定」分頁裡內嵌的 Apps Script 程式碼 — 伺服器端怎麼把欄位寫進試算表

> ⚠️ 已知坑：客戶端有時送 `身分證`、Apps Script 預期 `身分證字號`，名稱不一致會導致該欄寫入空白。兩邊要對齊。

---

## 六、改完之後

```bash
npm run build       # 重新打包 dist/cert-generator.html
npm test            # 跑單元測試（會抓到很多版面以外的回歸）
npm run test:e2e    # Playwright 煙霧測試
```

如果只改了 CSS 或文字，建議至少做一次手動產生：
1. 打開 `src/index.html`
2. 用內建 demo 資料按一次「產生」
3. 解開下載的 ZIP，肉眼確認 PDF 與 DOCX 的版面
