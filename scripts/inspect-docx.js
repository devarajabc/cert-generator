#!/usr/bin/env node
/**
 * inspect-docx.js — 從一個 .docx 範本抓出可直接套進 src/index.html 的格式規格
 *
 * 用法：
 *   node scripts/inspect-docx.js <path-to-template.docx>
 *
 * 輸出：人類可讀的規格表（頁面邊界、字級、表格欄寬、cell 樣式等）
 *
 * 設計目的：解決「使用者只能傳截圖、我們靠 pixel 反推 Word 規格不準」的問題。
 * 任何人想對齊一份新的 Word 範本，跑這個就有 ground truth，不用靠肉眼比對。
 *
 * 需要 Node 內建模組 (fs, path, zlib, child_process)，加上一個輕量 unzip：
 * 我們用 system 的 `unzip` 指令，避免引入新的 npm 相依。
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

function die(msg) {
  console.error(`錯誤：${msg}`);
  process.exit(1);
}

function unzipToTmp(docxPath) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inspect-docx-'));
  try {
    execSync(`unzip -q "${docxPath}" -d "${tmpDir}"`, { stdio: 'pipe' });
  } catch {
    die(`unzip 失敗，請確認 ${docxPath} 是合法的 .docx 檔`);
  }
  return tmpDir;
}

// 簡易 XML 走訪：我們只關心 <w:xxx> 標籤的 attributes 與 text 子節點。
// 用 regex 處理，不引入 xml2js 之類重相依。.docx 的 XML 是 well-formed Office 產出，
// 形狀可預測，不需要完整 SAX/DOM parser。
function getTagsByName(xml, name) {
  const re = new RegExp(`<w:${name}(\\s[^>/]*)?(?:/>|>([\\s\\S]*?)</w:${name}>)`, 'g');
  const out = [];
  let m;
  while ((m = re.exec(xml)) !== null) {
    out.push({
      attrs: parseAttrs(m[1] || ''),
      inner: m[2] || '',
      full: m[0]
    });
  }
  return out;
}

function parseAttrs(attrStr) {
  const out = {};
  const re = /w:(\w+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(attrStr)) !== null) {
    out[m[1]] = m[2];
  }
  return out;
}

function dxaToCm(dxa) {
  return (Number(dxa) / 567).toFixed(2) + ' cm';
}
function dxaToInch(dxa) {
  return (Number(dxa) / 1440).toFixed(2) + ' inch';
}
function halfPtToPt(hp) {
  return (Number(hp) / 2) + ' pt';
}

function main() {
  const docxPath = process.argv[2];
  if (!docxPath) die('用法：node scripts/inspect-docx.js <path-to-template.docx>');
  if (!fs.existsSync(docxPath)) die(`找不到檔案：${docxPath}`);

  const tmp = unzipToTmp(docxPath);
  const documentXml = fs.readFileSync(path.join(tmp, 'word', 'document.xml'), 'utf-8');

  console.log(`\n=== ${path.basename(docxPath)} 規格報告 ===\n`);

  // 1. 頁面設定
  const pgSz = getTagsByName(documentXml, 'pgSz')[0];
  const pgMar = getTagsByName(documentXml, 'pgMar')[0];
  console.log('【頁面】');
  if (pgSz) {
    console.log(`  尺寸: ${pgSz.attrs.w} × ${pgSz.attrs.h} DXA (= ${dxaToCm(pgSz.attrs.w)} × ${dxaToCm(pgSz.attrs.h)})`);
    if (pgSz.attrs.orient) console.log(`  方向: ${pgSz.attrs.orient}`);
  }
  if (pgMar) {
    console.log(`  邊界: top=${dxaToInch(pgMar.attrs.top)} bottom=${dxaToInch(pgMar.attrs.bottom)} left=${dxaToInch(pgMar.attrs.left)} right=${dxaToInch(pgMar.attrs.right)}`);
    const usableW = Number(pgSz.attrs.w) - Number(pgMar.attrs.left) - Number(pgMar.attrs.right);
    console.log(`  可用寬度: ${usableW} DXA (= ${dxaToCm(usableW)})`);
  }

  // 2. 段落（標題、本文、簽名等）依序列出
  console.log('\n【段落（依文件順序）】');
  // 抓 body 內的 <w:p> — 用 split 法保留順序
  const bodyMatch = documentXml.match(/<w:body>([\s\S]*)<\/w:body>/);
  if (!bodyMatch) die('找不到 <w:body> 區塊');
  const body = bodyMatch[1];

  // 走訪 body 內每個直接子節點（p 或 tbl）
  const childRe = /<w:(p|tbl)(\s[^>/]*)?(?:\/>|>([\s\S]*?)<\/w:\1>)/g;
  let idx = 0;
  let m;
  while ((m = childRe.exec(body)) !== null) {
    const kind = m[1];
    const inner = m[3] || '';
    if (kind === 'p') {
      const texts = [];
      for (const t of getTagsByName(inner, 't')) texts.push(t.inner);
      const text = texts.join('');
      if (!text.trim() && !inner.includes('<w:rPr>')) { idx++; continue; }

      const sizes = new Set();
      for (const sz of getTagsByName(inner, 'sz')) sizes.add(`${sz.attrs.val} (=${halfPtToPt(sz.attrs.val)})`);
      const bolds = getTagsByName(inner, 'b').length > 0;
      const fonts = new Set();
      for (const f of getTagsByName(inner, 'rFonts')) {
        if (f.attrs.eastAsia) fonts.add(f.attrs.eastAsia);
        else if (f.attrs.ascii) fonts.add(f.attrs.ascii);
      }
      const colors = new Set();
      for (const c of getTagsByName(inner, 'color')) colors.add(c.attrs.val);
      const jc = getTagsByName(inner, 'jc')[0];
      const align = jc ? jc.attrs.val : 'left (default)';

      console.log(`\n  [${idx}] P  align=${align}  sizes={${[...sizes].join(', ')}}  bold=${bolds}  fonts={${[...fonts].join(', ')}}  colors={${[...colors].join(', ')}}`);
      if (text) console.log(`        text: "${text.substring(0, 80)}"`);
    } else if (kind === 'tbl') {
      console.log(`\n  [${idx}] TABLE`);
      // tblGrid 抓欄寬
      const grid = inner.match(/<w:tblGrid>([\s\S]*?)<\/w:tblGrid>/);
      if (grid) {
        const cols = [];
        const colRe = /<w:gridCol\s+w:w="(\d+)"/g;
        let c;
        while ((c = colRe.exec(grid[1])) !== null) cols.push(Number(c[1]));
        const total = cols.reduce((a, b) => a + b, 0);
        console.log(`      欄寬 (DXA): [${cols.join(', ')}]  total=${total} (= ${dxaToCm(total)})`);
        const pct = cols.map(c => ((c / total) * 100).toFixed(1) + '%');
        console.log(`      欄寬比例: [${pct.join(', ')}]`);
      }
      // 抓第一個 row 的 cell 樣式作為樣本
      const firstRow = inner.match(/<w:tr(?:\s[^>]*)?>([\s\S]*?)<\/w:tr>/);
      if (firstRow) {
        const cells = [];
        const tcRe = /<w:tc(?:\s[^>]*)?>([\s\S]*?)<\/w:tc>/g;
        let cm;
        while ((cm = tcRe.exec(firstRow[1])) !== null) cells.push(cm[1]);
        console.log(`      第一列 ${cells.length} 個 cell 樣本：`);
        cells.forEach((cellXml, ci) => {
          const shd = getTagsByName(cellXml, 'shd')[0];
          const fill = shd ? shd.attrs.fill : 'none';
          const sizes = new Set();
          for (const sz of getTagsByName(cellXml, 'sz')) sizes.add(halfPtToPt(sz.attrs.val));
          const bolds = getTagsByName(cellXml, 'b').length > 0;
          const text = getTagsByName(cellXml, 't').map(t => t.inner).join('');
          console.log(`        cell ${ci}: fill=${fill} sizes={${[...sizes].join(',')}} bold=${bolds} text="${text.substring(0, 30)}"`);
        });
      }
      // 列數
      const rowCount = (inner.match(/<w:tr(?:\s[^>]*)?>/g) || []).length;
      console.log(`      總列數: ${rowCount}`);
    }
    idx++;
  }

  console.log('\n=== 完 ===\n');
  console.log(`提示：原始 XML 已展開在 ${tmp}/word/document.xml，要查更細的可以直接看`);
}

main();
