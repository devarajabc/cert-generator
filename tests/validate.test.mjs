import { describe, it, expect, beforeEach } from 'vitest';
import { loadSource } from './helpers/load-source.mjs';

// Helper: prefill DOM date fields + a valid employee + course + selection.
// Tests then mutate from this baseline.
function seedValid(ctx) {
  ctx.setState({
    employees: [{
      id: 'e1', name: '王', idNumber: 'A123456789',
      birthY: 80, birthM: 5, birthD: 12, title: '',
    }],
    courses: [{ id: 'c1', name: '個案研討', instructor: '王老師', hours: '3' }],
    selectedIds: new Set(['e1']),
  });
  const setVal = (id, v) => { ctx.document.getElementById(id).value = String(v); };
  setVal('t-docnum', '114001');
  setVal('t-issuedate-y', 114); setVal('t-issuedate-m', 5); setVal('t-issuedate-d', 20);
  setVal('t-traindate-y', 114); setVal('t-traindate-m', 5); setVal('t-traindate-d', 21);
  setVal('t-signdate-y', 114); setVal('t-signdate-m', 5); setVal('t-signdate-d', 22);
}

let ctx;
beforeEach(() => { ctx = loadSource(); });

describe('validateForGenerate — happy path', () => {
  it('returns null when everything is filled', () => {
    seedValid(ctx);
    expect(ctx.window.validateForGenerate()).toBeNull();
  });
});

describe('validateForGenerate — rejection paths', () => {
  it('rejects when no employees selected', () => {
    seedValid(ctx);
    ctx.setState({ selectedIds: new Set() });
    expect(ctx.window.validateForGenerate()).toContain('員工');
  });

  it('rejects empty docNum', () => {
    seedValid(ctx);
    ctx.document.getElementById('t-docnum').value = '';
    expect(ctx.window.validateForGenerate()).toContain('文號');
  });

  it.each([
    ['t-issuedate-y'],
    ['t-issuedate-m'],
    ['t-issuedate-d'],
    ['t-traindate-y'],
    ['t-traindate-m'],
    ['t-traindate-d'],
    ['t-signdate-y'],
    ['t-signdate-m'],
    ['t-signdate-d'],
  ])('rejects missing date field %s', (id) => {
    seedValid(ctx);
    ctx.document.getElementById(id).value = '';
    expect(ctx.window.validateForGenerate()).toBeTruthy();
  });

  it('rejects empty courses array', () => {
    seedValid(ctx);
    ctx.setState({ courses: [] });
    expect(ctx.window.validateForGenerate()).toContain('課程');
  });

  it('rejects when no course row is complete (all partial)', () => {
    seedValid(ctx);
    ctx.setState({
      courses: [
        { id: 'c1', name: '', instructor: 'I', hours: '3' },
        { id: 'c2', name: 'N', instructor: '', hours: '3' },
        { id: 'c3', name: 'N', instructor: 'I', hours: '' },
      ],
    });
    expect(ctx.window.validateForGenerate()).toContain('課程');
  });
});

describe('validateForGenerate — pending bug-fixes (it.fails markers)', () => {
  // These assertions describe desired behavior. While the bug is unfixed,
  // it.fails makes the test PASS because the assertion FAILS — flipping
  // to it() will be the signal that the fix landed.

  it.fails('rejects course row with hours = "0"', () => {
    seedValid(ctx);
    ctx.setState({ courses: [{ id: 'c1', name: 'X', instructor: 'Y', hours: '0' }] });
    expect(ctx.window.validateForGenerate()).toBeTruthy();
  });

  it.fails('rejects course row with negative hours', () => {
    seedValid(ctx);
    ctx.setState({ courses: [{ id: 'c1', name: 'X', instructor: 'Y', hours: '-1' }] });
    expect(ctx.window.validateForGenerate()).toBeTruthy();
  });

  it.fails('rejects month > 12', () => {
    seedValid(ctx);
    ctx.document.getElementById('t-issuedate-m').value = '15';
    expect(ctx.window.validateForGenerate()).toBeTruthy();
  });

  it.fails('rejects day > 31', () => {
    seedValid(ctx);
    ctx.document.getElementById('t-traindate-d').value = '99';
    expect(ctx.window.validateForGenerate()).toBeTruthy();
  });
});
