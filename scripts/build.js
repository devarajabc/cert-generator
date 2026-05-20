#!/usr/bin/env node
/**
 * 內嵌打包腳本
 *
 * 把 src/index.html 中的 5 個 CDN <script src="..."> 替換為實際的函式庫程式碼，
 * 產生一個自給自足的單一 HTML 檔到 dist/cert-generator.html。
 *
 * 使用方式：node scripts/build.js
 * 或：npm run build
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src', 'index.html');
const OUT_DIR = path.join(ROOT, 'dist');
const OUT = path.join(OUT_DIR, 'cert-generator.html');

const libs = [
  { name: 'xlsx',        path: 'node_modules/xlsx/dist/xlsx.mini.min.js' },
  { name: 'html2canvas', path: 'node_modules/html2canvas/dist/html2canvas.min.js' },
  { name: 'jspdf',       path: 'node_modules/jspdf/dist/jspdf.umd.min.js' },
  { name: 'jszip',       path: 'node_modules/jszip/dist/jszip.min.js' },
  { name: 'docx',        path: 'node_modules/docx/build/index.js' },
];

// 依序檢查相依檔存在
for (const lib of libs) {
  const full = path.join(ROOT, lib.path);
  if (!fs.existsSync(full)) {
    console.error(`✗ 找不到 ${lib.path}`);
    console.error('  請先執行：npm install');
    process.exit(1);
  }
}

// 讀取原始 HTML
if (!fs.existsSync(SRC)) {
  console.error(`✗ 找不到 ${SRC}`);
  process.exit(1);
}
let html = fs.readFileSync(SRC, 'utf8');

// 比對的 regex — 一次匹配 5 個連續的 CDN script tag
const cdnTagsRegex = /<script src="https:\/\/cdn\.sheetjs\.com[^"]*"><\/script>\s*<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/html2canvas[^"]*"><\/script>\s*<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/jspdf[^"]*"><\/script>\s*<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/jszip[^"]*"><\/script>\s*<script src="https:\/\/unpkg\.com\/docx[^"]*"><\/script>/;

if (!cdnTagsRegex.test(html)) {
  console.error('✗ 在 src/index.html 中找不到預期的 5 個 CDN script tag');
  console.error('  可能 CDN 連結有改動，請檢查 scripts/build.js 的 cdnTagsRegex');
  process.exit(1);
}

// 組合 inline blocks
let inlineBlocks = '';
let totalSize = 0;
console.log('打包函式庫：');
for (const lib of libs) {
  const content = fs.readFileSync(path.join(ROOT, lib.path), 'utf8');
  totalSize += content.length;
  inlineBlocks += `<script>/* ${lib.name} */\n${content}\n</script>\n`;
  console.log(`  ${lib.name.padEnd(12)} ${(content.length / 1024).toFixed(1).padStart(7)} KB`);
}
console.log(`  ${''.padEnd(12)} ${'─'.repeat(10)}`);
console.log(`  內嵌總大小   ${(totalSize / 1024).toFixed(1).padStart(7)} KB`);

// 用 callback 形式避開 $& 等替換變數的特殊處理
html = html.replace(cdnTagsRegex, () => inlineBlocks);

// 確認輸出目錄
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

fs.writeFileSync(OUT, html);
const finalSize = fs.statSync(OUT).size;
console.log('');
console.log(`✓ 已輸出到 dist/cert-generator.html (${(finalSize / 1024).toFixed(1)} KB / ${(finalSize / 1024 / 1024).toFixed(2)} MB)`);

// 驗證：HTML 裡不應該再有任何函式庫 CDN 外部 src
const scriptCdn = (html.match(/<script src="https?:\/\/[^"]+"/g) || [])
  .filter(s => /sheetjs|jsdelivr|unpkg/.test(s));
// 字型 CDN（Google Fonts）也是外部相依，列出以供確認
const fontCdn = html.match(/<(?:link|script)[^>]*(?:fonts\.googleapis|fonts\.gstatic)\.com[^>]*>/g) || [];

if (scriptCdn.length === 0 && fontCdn.length === 0) {
  console.log('✓ 已無外部 CDN 載入');
} else {
  if (scriptCdn.length) {
    console.warn('⚠ 仍有外部函式庫 CDN script:');
    scriptCdn.forEach(s => console.warn('  ' + s));
  }
  if (fontCdn.length) {
    console.warn('⚠ 仍有外部字型 CDN（Google Fonts）— 離線環境會 fallback 到系統字型:');
    fontCdn.forEach(s => console.warn('  ' + s));
  }
}
