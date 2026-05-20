import { describe, it, expect, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';
import { loadSource } from './helpers/load-source.mjs';

// Build an .xlsx buffer in memory and feed it through the actual #import-excel
// change handler. Tests the full path; doesn't extract logic.
async function importRows(ctx, rowObjects, { cellDates = false } = {}) {
  const ws = XLSX.utils.json_to_sheet(rowObjects, { cellDates });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'sheet1');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

  const input = ctx.document.getElementById('import-excel');
  const file = new ctx.window.File([buf], 'test.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  Object.defineProperty(input, 'files', { value: [file], writable: true, configurable: true });
  input.dispatchEvent(new ctx.window.Event('change'));
  // Let the async handler finish (file.arrayBuffer + sync XLSX work + DOM updates)
  await new Promise((r) => setTimeout(r, 100));
}

let ctx;
beforeEach(() => { ctx = loadSource(); });

describe('Excel import — ROC year strings', () => {
  it('parses "80/5/12"', async () => {
    await importRows(ctx, [{ 姓名: '王小明', 身分證字號: 'A123456789', 出生日期: '80/5/12' }]);
    expect(ctx.getState().employees).toMatchObject([
      { name: '王小明', idNumber: 'A123456789', birthY: 80, birthM: 5, birthD: 12 },
    ]);
  });

  it('parses "80-5-12" (dashes)', async () => {
    await importRows(ctx, [{ 姓名: '李四', 身分證字號: 'B123456789', 出生日期: '80-5-12' }]);
    expect(ctx.getState().employees[0]).toMatchObject({ birthY: 80, birthM: 5, birthD: 12 });
  });

  it('parses "80年5月12日" (Chinese chars)', async () => {
    await importRows(ctx, [{ 姓名: '陳', 身分證字號: 'C123456789', 出生日期: '80年5月12日' }]);
    expect(ctx.getState().employees[0]).toMatchObject({ birthY: 80, birthM: 5, birthD: 12 });
  });
});

describe('Excel import — western year auto-conversion', () => {
  it('"1991/5/12" → birthY=80 (year - 1911)', async () => {
    await importRows(ctx, [{ 姓名: '張', 身分證字號: 'D123456789', 出生日期: '1991/5/12' }]);
    expect(ctx.getState().employees[0]).toMatchObject({ birthY: 80, birthM: 5, birthD: 12 });
  });
});

describe('Excel import — Date-type cell (regression for MEDIUM #2)', () => {
  // The bug: prior to the cellDates: true fix, XLSX returned date-typed cells
  // as either Excel serial numbers (skipped silently) or strings like "5/12/91"
  // (corrupting birthY/M/D).  With cellDates: true + Date branch, this works.
  it('round-trips a Date cell to correct ROC birthday', async () => {
    await importRows(
      ctx,
      [{ 姓名: '日', 身分證字號: 'E123456789', 出生日期: new Date(1991, 4, 12) }],
      { cellDates: true }
    );
    const emps = ctx.getState().employees;
    expect(emps).toHaveLength(1);
    expect(emps[0]).toMatchObject({ birthY: 80, birthM: 5, birthD: 12 });
  });
});

describe('Excel import — synonym headers', () => {
  it.each([
    ['生日'],
    ['出生日期'],
    ['birthday'],
    ['出生年月日'],
  ])('accepts birthday under header %s', async (header) => {
    await importRows(ctx, [{
      姓名: 'syn', 身分證字號: 'F123456789', [header]: '80/5/12',
    }]);
    expect(ctx.getState().employees[0]).toMatchObject({ birthY: 80, birthM: 5, birthD: 12 });
  });

  it.each([
    ['身分證字號'],
    ['身分證'],
    ['生份證字號'],  // common typo
    ['身份證字號'],  // alt char
  ])('accepts id under header %s', async (header) => {
    await importRows(ctx, [{ 姓名: 'idsyn', [header]: 'G123456789', 生日: '80/5/12' }]);
    expect(ctx.getState().employees[0].idNumber).toBe('G123456789');
  });
});

describe('Excel import — skip rules', () => {
  it('skips row missing 姓名', async () => {
    await importRows(ctx, [{ 身分證字號: 'A1', 生日: '80/5/12' }]);
    expect(ctx.getState().employees).toHaveLength(0);
  });

  it('skips row missing idNumber', async () => {
    await importRows(ctx, [{ 姓名: 'noid', 生日: '80/5/12' }]);
    expect(ctx.getState().employees).toHaveLength(0);
  });

  it('skips row with fewer than 3 date components in birth string', async () => {
    await importRows(ctx, [{ 姓名: 'bad', 身分證字號: 'H123456789', 生日: '80年' }]);
    expect(ctx.getState().employees).toHaveLength(0);
  });

  it('skips duplicate idNumber within same import', async () => {
    await importRows(ctx, [
      { 姓名: 'A', 身分證字號: 'I123456789', 生日: '80/5/12' },
      { 姓名: 'B', 身分證字號: 'I123456789', 生日: '81/6/13' },
    ]);
    expect(ctx.getState().employees).toHaveLength(1);
    expect(ctx.getState().employees[0].name).toBe('A');
  });
});
