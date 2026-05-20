import { describe, it, expect, beforeEach } from 'vitest';
import { loadSource } from './helpers/load-source.mjs';

// Regression test for HIGH #4 (debug review, batch 1):
// `generating` flag must short-circuit re-entrant generateAll calls.

function seedValidState(ctx) {
  ctx.setState({
    employees: [{
      id: 'e1', name: '王', idNumber: 'A123456789',
      birthY: 80, birthM: 5, birthD: 12, title: '',
    }],
    courses: [{ id: 'c1', name: '個案研討', instructor: '王老師', hours: '3' }],
    selectedIds: new Set(['e1']),
    settings: {
      sheetUrl: '', sheetViewUrl: '',
      defaultOrg: '財團法人',
      sealInstitution: 'data:image/png;base64,iVBOR=',
      sealDirector: 'data:image/png;base64,iVBOR=',
    },
  });
  const set = (id, v) => { ctx.document.getElementById(id).value = String(v); };
  set('t-docnum', '114001');
  set('t-issuedate-y', 114); set('t-issuedate-m', 5); set('t-issuedate-d', 20);
  set('t-traindate-y', 114); set('t-traindate-m', 5); set('t-traindate-d', 21);
  set('t-signdate-y', 114); set('t-signdate-m', 5); set('t-signdate-d', 22);
}

// Install benign stubs for the libraries that generateAll touches *before*
// it reaches html2canvas: new JSZip() / zip.folder() / jspdf.jsPDF must not
// throw. html2canvas itself is set per-test to inspect call counts.
function installPipelineStubs(ctx) {
  ctx.run(`
    JSZip = function () {
      return {
        folder: () => ({ file: () => {} }),
        generateAsync: () => Promise.resolve(new Blob([''], { type: 'application/zip' })),
      };
    };
    jspdf = {
      jsPDF: function () {
        return {
          internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
          addImage: () => {},
          output: () => new Blob([''], { type: 'application/pdf' }),
        };
      },
    };
  `);
}

let ctx;
beforeEach(() => { ctx = loadSource(); });

describe('generateAll — busy flag', () => {
  it('rejects a second concurrent call (HIGH #4 regression)', async () => {
    seedValidState(ctx);
    installPipelineStubs(ctx);
    ctx.run(`
      window.__h2cCalls = 0;
      html2canvas = () => {
        window.__h2cCalls++;
        // Reject after a tick so the first call yields, second call has
        // a chance to enter, and the guard short-circuits it.
        return new Promise((_, reject) => setTimeout(() => reject(new Error('test stub')), 30));
      };
    `);

    const p1 = ctx.window.generateAll();
    const p2 = ctx.window.generateAll();
    await Promise.allSettled([p1, p2]);

    // If the busy flag works: p1 enters the loop, sets generating=true, awaits
    // html2canvas → bumps __h2cCalls to 1. p2 sees generating === true and
    // short-circuits at the guard, never reaching html2canvas. Total = 1.
    expect(ctx.run('window.__h2cCalls')).toBe(1);
  });

  it('resets the flag after generation throws (next call can proceed)', async () => {
    seedValidState(ctx);
    installPipelineStubs(ctx);
    ctx.run(`
      window.__count = 0;
      html2canvas = () => {
        window.__count++;
        return Promise.reject(new Error('boom'));
      };
    `);

    await ctx.window.generateAll(); // errors, finally{} resets generating
    expect(ctx.run('generating')).toBe(false);
    expect(ctx.run('window.__count')).toBe(1);

    // Sequential second call — must reach html2canvas again (not blocked).
    await ctx.window.generateAll();
    expect(ctx.run('window.__count')).toBe(2);
  });
});
