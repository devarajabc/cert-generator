# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A batch generator for Taiwanese social-service training certificates (研習證明書), written as a **single self-contained HTML file** intended to be opened directly in a browser by social workers — no server, no install, no network required (except optional Google Sheets logging). Designed for 財團法人台南市私立天主教瑞復益智中心; forkable for other organizations. UI strings and templates are all Traditional Chinese.

## Commands

```bash
npm install      # devDependencies only; runtime libs are bundled into the HTML at build time
npm run build    # node scripts/build.js — inlines node_modules libs into src/index.html → dist/cert-generator.html
npm run dev      # noop; for development, just open src/index.html directly in a browser (CDN-loaded libs)
```

There is no test runner, linter, or formatter configured. There is no dev server — `src/index.html` works straight off the filesystem (`file://`).

## Architecture

**One file does almost everything.** `src/index.html` (~2560 lines) contains HTML, CSS, and all application JS in `<script>` blocks at the end. Treat the section banners (`// ========== 狀態管理 ==========`, etc.) inside that file as the module structure:

- **State (`STORAGE_KEY = 'cert_system_v1'`)** — single `state` object (`employees`, `selectedIds`, `courses`, `settings`) persisted to `localStorage`. `loadState`/`saveState` are the only persistence path. No backend.
- **ROC year helpers** (`toROCStr`, `todayROC`, etc.) — the entire UI works in 民國 (ROC) years; Gregorian conversion happens only when calling `new Date()` for "today."
- **Tabs** — single-page tabs (`employees` / `generate` / `history` / `settings`) toggled by `switchTab`; each panel has its own render function.
- **Generation pipeline** — `generateAll()` (src/index.html:2355) is the orchestrator: for each selected employee → `generatePdfBlob` (HTML → html2canvas → jsPDF) → JSZip; then for each course → `generateRegistrationDocx` (uses the `docx` library, A4 landscape) → JSZip; then download the ZIP; then optionally POST rows to a Google Apps Script Web App (`sendToGoogleSheet`).
- **PDF rendering quirk** — PDFs are rasterized images (html2canvas → JPEG → jsPDF). Text inside the PDF is **not selectable/searchable** by design; this is the deliberate trade-off to guarantee Traditional Chinese 標楷體 font rendering is identical across machines. Do not "fix" this by switching to text-based PDF unless you also solve cross-platform font embedding.
- **Seals** — institution + director seal PNGs are uploaded once and stored as data URLs in `localStorage` (`state.settings.sealInstitution`, `sealDirector`); embedded inline into each cert HTML before rasterization.
- **Google Sheets integration** — entirely client-side: an Apps Script Web App that the deployer pastes into their own sheet (see `docs/apps-script.gs` and the in-app Settings tab). The fetch deliberately omits `Content-Type` to avoid a CORS preflight.

## Build pipeline

`scripts/build.js` does one thing: it finds the block of 5 consecutive CDN `<script src="...">` tags in `src/index.html` (matched by a single regex) and replaces it with inline `<script>` blocks containing the contents of the corresponding files under `node_modules/`. Libraries and exact paths:

| Lib | Bundle path used |
|---|---|
| xlsx | `node_modules/xlsx/dist/xlsx.mini.min.js` |
| html2canvas | `node_modules/html2canvas/dist/html2canvas.min.js` |
| jspdf | `node_modules/jspdf/dist/jspdf.umd.min.js` |
| jszip | `node_modules/jszip/dist/jszip.min.js` |
| docx | `node_modules/docx/build/index.js` |

If you change the CDN tags in `src/index.html` (URLs, order, or count), update `cdnTagsRegex` in `scripts/build.js` to match — the build will fail loud rather than silently produce a half-bundled file.

## Customization points (when forking for another org)

These are the search-and-replace anchors in `src/index.html` — keep them grep-able if you edit nearby code:

1. Org name: `財團法人台南市私立天主教瑞復益智中心`
2. Document number prefix: `南市社身字第`
3. Top header: `臺南市政府社會局`
4. Registration form title: `身心障礙者服務人員在職訓練登錄表`
5. Seals: uploaded via the Settings tab, not hard-coded.

## Working in this codebase

- **Edits to JS go inside `src/index.html`**, not a separate file. Resist the urge to extract modules — the "single HTML file" is a hard product constraint (social workers receive one file via shared drive or email).
- **After any change to `src/index.html`, run `npm run build`** to refresh `dist/cert-generator.html`. The dist file is checked in and is what end-users actually download.
- **Don't introduce build steps that require Node at runtime.** The output must run from `file://` with zero dependencies.
- **Don't add new external CDN/network calls.** The only acceptable network egress is the optional Apps Script POST in `sendToGoogleSheet`. Adding fonts, analytics, error reporting, etc. breaks the offline guarantee.
- **`employees` storage is per-browser, per-machine.** Anything you add to `state` will also be per-browser; do not assume cross-device sync.
- **Reserved storage key:** `cert_system_v1`. If you change the schema, either migrate in `loadState` or bump the key.

## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

Note: the graph currently parses `scripts/build.js` only — `src/index.html` is HTML and is not in the graph, so for the main app you'll still fall back to grep/read.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
