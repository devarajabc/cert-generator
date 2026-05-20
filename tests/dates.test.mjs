import { describe, it, expect, beforeEach } from 'vitest';
import { loadSource } from './helpers/load-source.mjs';

let ctx;
beforeEach(() => { ctx = loadSource(); });

describe('toROCStr', () => {
  it('formats full ROC date', () => {
    expect(ctx.window.toROCStr(114, 5, 20)).toBe('民國 114 年 5 月 20 日');
  });
  it('returns empty when any field is zero/missing', () => {
    expect(ctx.window.toROCStr(114, 0, 20)).toBe('');
    expect(ctx.window.toROCStr(0, 5, 20)).toBe('');
    expect(ctx.window.toROCStr(114, 5, 0)).toBe('');
    expect(ctx.window.toROCStr(undefined, 5, 20)).toBe('');
  });
});

describe('toROCShort', () => {
  it('pads month/day to two digits', () => {
    expect(ctx.window.toROCShort(114, 5, 20)).toBe('114.05.20');
    expect(ctx.window.toROCShort(80, 12, 3)).toBe('80.12.03');
  });
  it('returns empty when any field missing', () => {
    expect(ctx.window.toROCShort(114, 0, 20)).toBe('');
  });
});

describe('toROCFileName', () => {
  it('formats with 年月日 chars, no padding', () => {
    expect(ctx.window.toROCFileName(114, 5, 20)).toBe('114年5月20日');
  });
  it('returns empty when any field missing', () => {
    expect(ctx.window.toROCFileName(114, 5, 0)).toBe('');
  });
});

describe('todayROC', () => {
  it('returns year as Gregorian-year - 1911', () => {
    const t = ctx.window.todayROC();
    const now = new Date();
    expect(t.y).toBe(now.getFullYear() - 1911);
    expect(t.m).toBe(now.getMonth() + 1);
    expect(t.d).toBe(now.getDate());
  });
});
