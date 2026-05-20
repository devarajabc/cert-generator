import { describe, it, expect, beforeEach } from 'vitest';
import { loadSource } from './helpers/load-source.mjs';

let ctx;
beforeEach(() => { ctx = loadSource(); });

describe('sanitizeFilename', () => {
  it('replaces each forbidden filesystem char with underscore', () => {
    // Characters that aren't legal in Windows filenames: / \ : * ? " < > |
    expect(ctx.window.sanitizeFilename('王/小明')).toBe('王_小明');
    expect(ctx.window.sanitizeFilename('a\\b')).toBe('a_b');
    expect(ctx.window.sanitizeFilename('c:foo')).toBe('c_foo');
    expect(ctx.window.sanitizeFilename('a*b?c"d<e>f|g')).toBe('a_b_c_d_e_f_g');
  });
  it('preserves Chinese, English, digits, spaces', () => {
    expect(ctx.window.sanitizeFilename('個案研討 ABC 123')).toBe('個案研討 ABC 123');
  });
  it('trims leading/trailing whitespace', () => {
    expect(ctx.window.sanitizeFilename('  hello  ')).toBe('hello');
  });
  it('empty string in → empty string out', () => {
    expect(ctx.window.sanitizeFilename('')).toBe('');
  });
  // NOTE: production sanitizeFilename uses `String(name)` (not `String(name ?? '')`)
  // so `null` → 'null', `undefined` → 'undefined'. Inconsistent with escapeHtml
  // which uses `?? ''`. Filed as a finding in the Tier 1 summary, not fixed.
});
