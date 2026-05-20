# Tests

Two layers:

- **Unit tests** (Vitest) — `tests/*.test.mjs`. Evaluate `src/index.html`'s inline
  `<script>` block inside a JSDOM + Node `vm` context. Production code is
  **not** extracted into a module; the helper at `tests/helpers/load-source.mjs`
  loads the file as-is.
- **Smoke test** (Playwright) — `tests/e2e/smoke.spec.mjs`. Opens the built
  `dist/cert-generator.html` in headless Chromium via `file://` and runs the
  full generate-and-download flow once. Built fresh per run by `test.beforeAll`.

## Commands

```
npm run test         # vitest run (units only, ~3s)
npm run test:watch   # vitest watch mode
npm run test:smoke   # playwright (~3s incl. browser startup)
npm run test:all     # both, sequentially
```

First-time setup: `npx playwright install chromium` (~150 MB).

## Helper notes

`loadSource()` does three things you should know about:

1. **Cross-realm identity** — `win.Date = Date; win.ArrayBuffer = ArrayBuffer; win.Uint8Array = Uint8Array;` forces JSDOM to share Node's class identities so `instanceof` checks against XLSX-returned values (Date cells, ArrayBuffers) work. JSDOM 29 isolates these by default.
2. **`File.arrayBuffer` polyfill** — copies bytes into a Node-realm ArrayBuffer, otherwise XLSX falls into a base64 path and crashes on `input.replace`.
3. **`__SKIP_INIT__` sentinel** — `init()` in `src/index.html` only runs if `__SKIP_INIT__` is undefined. The helper sets it true before evaluating, so test state isn't polluted by the two pre-populated empty course rows.

## Bug-marker conventions

- `it.fails(...)` marks assertions that describe **how the code should behave**
  for a known unfixed bug. The test passes *because* the assertion fails. When
  the underlying bug is fixed, the test will start failing — that's the cue to
  flip it back to plain `it(...)`.
- `validate.test.mjs` currently has 4 `it.fails` markers (hours = 0, negative
  hours, month > 12, day > 31).

## What's intentionally NOT tested

- `generatePdfBlob`, `generateRegistrationDocx` internals — they're pass-through
  to vendored libraries (html2canvas, jsPDF, docx). The smoke test exercises
  them end-to-end through a real browser; mocking them at unit level would just
  validate the mock shape.
- DOM render functions (`renderEmployeeTable`, `renderCourses`, etc.)
- Live Google Apps Script integration
- Coverage thresholds (no gate; use `vitest --coverage` ad-hoc if curious)
