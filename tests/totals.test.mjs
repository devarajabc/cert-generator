import { describe, it, expect, beforeEach } from 'vitest';
import { loadSource } from './helpers/load-source.mjs';

// Regression test for HIGH #1 (debug review, batch 1):
// Before the fix, previewCertificate summed state.courses (raw) while
// generateAll summed validCourses. With a half-filled row, the two totals
// diverged.  Both now sum validCourses.
//
// Test calls previewCertificate and reads the "共計 N 小時" line out of
// the emitted HTML.

function setupForPreview(ctx) {
  ctx.setState({
    employees: [{ id: 'e1', name: '王', idNumber: 'A123456789',
                  birthY: 80, birthM: 5, birthD: 12, title: '' }],
    selectedIds: new Set(['e1']),
  });
  const setVal = (id, v) => { ctx.document.getElementById(id).value = String(v); };
  setVal('t-docnum', '114001');
  setVal('t-issuedate-y', 114); setVal('t-issuedate-m', 5); setVal('t-issuedate-d', 20);
  setVal('t-traindate-y', 114); setVal('t-traindate-m', 5); setVal('t-traindate-d', 21);
  setVal('t-signdate-y', 114); setVal('t-signdate-m', 5); setVal('t-signdate-d', 22);
}

function previewTotal(ctx) {
  ctx.window.previewCertificate();
  const html = ctx.document.getElementById('cert-preview-content').innerHTML;
  const m = html.match(/共計\s*(\d+(?:\.\d+)?)\s*小時/);
  if (!m) throw new Error('共計 N 小時 line not found in preview');
  return parseFloat(m[1]);
}

let ctx;
beforeEach(() => { ctx = loadSource(); });

describe('Preview totals (HIGH #1 regression)', () => {
  it('matches sum of valid courses only — half-filled rows excluded', () => {
    setupForPreview(ctx);
    ctx.setState({
      courses: [
        { id: 'c1', name: 'A', instructor: 'I1', hours: '2' },
        { id: 'c2', name: 'B', instructor: 'I2', hours: '3' },
        { id: 'c3', name: '', instructor: '', hours: '99' }, // half-filled, should not count
      ],
    });
    expect(previewTotal(ctx)).toBe(5);
  });

  it('zero when all rows are partial', () => {
    setupForPreview(ctx);
    ctx.setState({
      courses: [
        { id: 'c1', name: 'A', instructor: '', hours: '2' },
        { id: 'c2', name: '', instructor: 'I', hours: '3' },
      ],
    });
    // previewCertificate runs validateForGenerate first and toasts/bails on
    // "no valid courses".  Assert it did NOT render a preview HTML body.
    ctx.window.previewCertificate();
    const html = ctx.document.getElementById('cert-preview-content').innerHTML;
    expect(html).toBe('');
  });

  it('full sum when every row is complete', () => {
    setupForPreview(ctx);
    ctx.setState({
      courses: [
        { id: 'c1', name: 'A', instructor: 'I1', hours: '2' },
        { id: 'c2', name: 'B', instructor: 'I2', hours: '3' },
        { id: 'c3', name: 'C', instructor: 'I3', hours: '1.5' },
      ],
    });
    expect(previewTotal(ctx)).toBe(6.5);
  });
});

describe('recalcTotal (DOM-driven course-table footer)', () => {
  it('sums all rows, formats integer without decimal', () => {
    ctx.setState({
      courses: [
        { id: 'c1', name: '', instructor: '', hours: '2' },
        { id: 'c2', name: '', instructor: '', hours: '3' },
      ],
    });
    ctx.window.recalcTotal();
    expect(ctx.document.getElementById('total-hours').textContent).toBe('5');
  });

  it('formats fractional total to one decimal', () => {
    ctx.setState({
      courses: [
        { id: 'c1', name: '', instructor: '', hours: '1.5' },
        { id: 'c2', name: '', instructor: '', hours: '2' },
      ],
    });
    ctx.window.recalcTotal();
    expect(ctx.document.getElementById('total-hours').textContent).toBe('3.5');
  });
});
