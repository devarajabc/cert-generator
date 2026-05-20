/**
 * Google Apps Script: 研習證明書發放紀錄接收端
 *
 * 用途：接收研習證明書產生系統送來的 HTTP POST 請求，把每筆發放紀錄寫入試算表。
 *
 * 部署步驟：
 *   1. 開啟一張空白 Google 試算表（取名「研習證明發放紀錄」）
 *   2. 上方選單「擴充功能 → Apps Script」
 *   3. 把編輯器裡原本的 myFunction() 全部刪掉，貼上這份程式碼
 *   4. 按 💾 儲存
 *   5. 右上角「部署 → 新增部署作業」
 *   6. 類型選「網頁應用程式」
 *   7. 執行身分：自己
 *   8. 存取權：所有人
 *   9. 按「部署」，第一次會要求授權
 *  10. 部署完成後複製產生的網址，回到工具的「設定」分頁貼入
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // 第一次寫入時自動建立標題列
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        '訓練日期', '文號', '姓名', '身分證字號',
        '課程清單', '總時數', '發行時間'
      ]);
    }

    for (const row of data.rows) {
      sheet.appendRow([
        row['訓練日期'],
        row['文號'],
        row['姓名'],
        row['身分證'],
        row['課程清單'],
        row['總時數'],
        row['發行時間']
      ]);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, added: data.rows.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput('Cert system endpoint OK')
    .setMimeType(ContentService.MimeType.TEXT);
}
