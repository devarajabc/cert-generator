import { describe, it, expect, beforeEach } from 'vitest';
import { loadSource } from './helpers/load-source.mjs';

let ctx;
beforeEach(() => { ctx = loadSource(); });

describe('escapeHtml', () => {
  it('escapes the five dangerous chars', () => {
    expect(ctx.window.escapeHtml('<script>')).toBe('&lt;script&gt;');
    expect(ctx.window.escapeHtml('a & b')).toBe('a &amp; b');
    expect(ctx.window.escapeHtml(`"quoted"`)).toBe('&quot;quoted&quot;');
    expect(ctx.window.escapeHtml(`it's`)).toBe('it&#39;s');
  });
  it('null / undefined → empty string (not the literal word)', () => {
    expect(ctx.window.escapeHtml(null)).toBe('');
    expect(ctx.window.escapeHtml(undefined)).toBe('');
  });
  it('coerces non-strings safely', () => {
    expect(ctx.window.escapeHtml(42)).toBe('42');
    expect(ctx.window.escapeHtml(true)).toBe('true');
  });
});

describe('escapeAttr', () => {
  it('matches escapeHtml behavior (alias)', () => {
    expect(ctx.window.escapeAttr('<>"&')).toBe(ctx.window.escapeHtml('<>"&'));
  });
});
