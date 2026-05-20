import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const DIST = path.join(ROOT, 'dist', 'cert-generator.html');

// Build once before any test in this file runs. This guarantees the dist
// artifact reflects current src/index.html.
test.beforeAll(() => {
  execSync('npm run build', { cwd: ROOT, stdio: 'pipe' });
});

test('full generate flow: select employee → fill form → download ZIP', async ({ page }) => {
  await page.goto('file://' + DIST);

  // --- Add an employee through the modal ---
  await page.getByRole('button', { name: /新增員工/ }).first().click();
  await page.locator('#emp-name').fill('王小明');
  await page.locator('#emp-id').fill('A123456789');
  await page.locator('#emp-birth-y').fill('80');
  await page.locator('#emp-birth-m').fill('5');
  await page.locator('#emp-birth-d').fill('12');
  await page.getByRole('button', { name: '儲存' }).click();

  // --- Move to the Generate tab ---
  await page.getByRole('button', { name: '產生證書' }).click();

  // Select the employee we just added
  await page.locator('.selector-item input[type="checkbox"]').first().check();

  // --- Fill training data ---
  await page.locator('#t-docnum').fill('114001');
  await page.locator('#t-issuedate-y').fill('114');
  await page.locator('#t-issuedate-m').fill('5');
  await page.locator('#t-issuedate-d').fill('20');
  await page.locator('#t-traindate-y').fill('114');
  await page.locator('#t-traindate-m').fill('5');
  await page.locator('#t-traindate-d').fill('21');
  // signdate is pre-filled with today by init()

  // --- Add a course in the existing first course row ---
  // (init() pre-creates two empty rows; fill the first.)
  const courseRow = page.locator('#courses-tbody tr').first();
  await courseRow.locator('input[placeholder="課程名稱"]').fill('個案研討');
  await courseRow.locator('input[placeholder="講師"]').fill('王老師');
  await courseRow.locator('input[placeholder="時數"]').fill('3');

  // --- Accept the "no seal uploaded" confirm dialog ---
  page.once('dialog', (dialog) => dialog.accept());

  // --- Trigger generation and wait for the ZIP download ---
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30_000 }),
    page.getByRole('button', { name: '全部產生' }).click(),
  ]);

  expect(download.suggestedFilename()).toMatch(/^研習證明書_.+\.zip$/);
  // Per refinement: do NOT inspect ZIP contents — the smoke test only confirms
  // the pipeline runs end-to-end and triggers a download.
});
