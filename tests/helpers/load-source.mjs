// Loads src/index.html into a JSDOM + vm context so production functions
// are callable from tests without extracting them into a separate module.
//
// Returned helpers:
//   window      — the JSDOM window (functions live here as globals)
//   document    — sugar for window.document
//   run(expr)   — eval `expr` inside the same vm context (use for const/let-scoped
//                 names like `state`, `editingEmployeeId`, `generating`)
//   setState(p) — Object.assign-style writes into the script's `state` const
//   getState()  — JSON-safe snapshot of state (selectedIds returned as array)

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import * as XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const SRC_PATH = path.join(ROOT, 'src', 'index.html');

let cachedScriptCode = null;
let cachedHtmlForJSDOM = null;

function readSource() {
  if (cachedScriptCode) return;
  const html = fs.readFileSync(SRC_PATH, 'utf8');
  // Strip external <script src=…> tags so JSDOM doesn't try to fetch them
  // (it wouldn't fetch by default, but stripping keeps the DOM cleaner).
  cachedHtmlForJSDOM = html.replace(/<script\s+src="https?:\/\/[^"]+"[^>]*><\/script>/g, '');
  // Extract the LAST inline <script> block — the app code.
  const re = /<script>([\s\S]*?)<\/script>/g;
  let last = null;
  let m;
  while ((m = re.exec(html)) !== null) last = m[1];
  if (!last) throw new Error('No inline <script> block found in src/index.html');
  cachedScriptCode = last;
}

export function loadSource() {
  readSource();
  const dom = new JSDOM(cachedHtmlForJSDOM, {
    // Use http origin so localStorage is available — JSDOM treats file:// as opaque
    url: 'http://localhost/test/',
    runScripts: 'outside-only', // allow vm.runInContext; inline <script> tags still inert
    pretendToBeVisual: true,    // enables requestAnimationFrame (used by generatePdfBlob)
  });
  const win = dom.window;

  // Provide real XLSX; throw-on-use stubs for the libraries we don't want
  // pure-fn tests to accidentally rely on. Tests that need them (concurrency,
  // smoke) override these explicitly.
  // JSDOM and Node are separate realms in JSDOM 29+: window.Date !== Date,
  // window.ArrayBuffer !== ArrayBuffer. XLSX is a Node module so it
  // creates/checks against Node's classes; production code (running in JSDOM's
  // vm context) checks against JSDOM's classes. Force the shared identity by
  // installing Node's classes on window.
  win.Date = Date;
  win.ArrayBuffer = ArrayBuffer;
  win.Uint8Array = Uint8Array;

  // JSDOM's File.arrayBuffer() returns a JSDOM-realm ArrayBuffer; after the
  // override above this is moot for new Files, but for files we create from
  // test code (which use win.File) we still want the bytes copied into a
  // Node-realm ArrayBuffer for XLSX's `data instanceof ArrayBuffer` check.
  const origArrayBuffer = win.File.prototype.arrayBuffer;
  win.File.prototype.arrayBuffer = async function () {
    const ab = await origArrayBuffer.call(this);
    const src = new Uint8Array(ab);
    const dst = new Uint8Array(src.byteLength); // allocated in Node realm
    dst.set(src);
    return dst.buffer;
  };

  win.XLSX = XLSX;
  win.html2canvas = () => Promise.reject(new Error('html2canvas not stubbed in this test'));
  win.jspdf = { jsPDF: function () { throw new Error('jspdf not stubbed in this test'); } };
  win.JSZip = function () { throw new Error('JSZip not stubbed in this test'); };
  win.docx = {};

  const ctx = dom.getInternalVMContext();
  // Skip the bottom init() call so state.courses doesn't start with 2 empty rows
  vm.runInContext('var __SKIP_INIT__ = true;', ctx);
  vm.runInContext(cachedScriptCode, ctx, { filename: 'src/index.html#inline-script' });

  return {
    window: win,
    document: win.document,
    run(expr) { return vm.runInContext(expr, ctx); },
    setState(partial) {
      for (const [k, v] of Object.entries(partial)) {
        if (v instanceof Set) {
          vm.runInContext(`state.${k} = new Set(${JSON.stringify([...v])})`, ctx);
        } else {
          vm.runInContext(`state.${k} = ${JSON.stringify(v)}`, ctx);
        }
      }
    },
    getState() {
      const snap = vm.runInContext(
        `({
          employees: state.employees,
          courses: state.courses,
          selectedIds: [...state.selectedIds],
          settings: state.settings,
        })`,
        ctx
      );
      return JSON.parse(JSON.stringify(snap));
    },
  };
}
