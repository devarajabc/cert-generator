import { describe, it, expect, beforeEach } from 'vitest';
import { loadSource } from './helpers/load-source.mjs';

// Fill the employee modal inputs as if a user typed them.
function fillModal(ctx, { name, title = '', idNumber, by, bm, bd }) {
  const set = (id, v) => { ctx.document.getElementById(id).value = String(v); };
  set('emp-name', name);
  set('emp-title', title);
  set('emp-id', idNumber);
  set('emp-birth-y', by);
  set('emp-birth-m', bm);
  set('emp-birth-d', bd);
}

let ctx;
beforeEach(() => { ctx = loadSource(); });

describe('saveEmployee — new', () => {
  it('inserts a valid employee', () => {
    fillModal(ctx, { name: '王小明', idNumber: 'A123456789', by: 80, bm: 5, bd: 12 });
    ctx.run('editingEmployeeId = null');
    ctx.window.saveEmployee();
    const emps = ctx.getState().employees;
    expect(emps).toHaveLength(1);
    expect(emps[0]).toMatchObject({ name: '王小明', idNumber: 'A123456789', birthY: 80, birthM: 5, birthD: 12 });
  });

  it('rejects duplicate idNumber on insert', () => {
    ctx.setState({
      employees: [{ id: 'e1', name: '舊', idNumber: 'A123456789', birthY: 70, birthM: 1, birthD: 1, title: '' }],
    });
    fillModal(ctx, { name: '新', idNumber: 'A123456789', by: 80, bm: 5, bd: 12 });
    ctx.run('editingEmployeeId = null');
    ctx.window.saveEmployee();
    // State should still contain only the original employee
    expect(ctx.getState().employees).toHaveLength(1);
    expect(ctx.getState().employees[0].name).toBe('舊');
  });

  it('rejects invalid idNumber length', () => {
    fillModal(ctx, { name: 'X', idNumber: 'A123', by: 80, bm: 5, bd: 12 });
    ctx.run('editingEmployeeId = null');
    ctx.window.saveEmployee();
    expect(ctx.getState().employees).toHaveLength(0);
  });
});

describe('saveEmployee — edit (MEDIUM #1 regression)', () => {
  it('allows keeping the same idNumber on the same employee', () => {
    ctx.setState({
      employees: [
        { id: 'e1', name: '王', idNumber: 'A123456789', birthY: 80, birthM: 5, birthD: 12, title: '' },
        { id: 'e2', name: '李', idNumber: 'B123456789', birthY: 75, birthM: 6, birthD: 3, title: '' },
      ],
    });
    ctx.run('editingEmployeeId = "e1"');
    fillModal(ctx, { name: '王改', idNumber: 'A123456789', by: 81, bm: 5, bd: 12 });
    ctx.window.saveEmployee();
    const e1 = ctx.getState().employees.find(e => e.id === 'e1');
    expect(e1).toMatchObject({ name: '王改', idNumber: 'A123456789', birthY: 81 });
  });

  it('rejects when edited idNumber collides with another employee', () => {
    ctx.setState({
      employees: [
        { id: 'e1', name: '王', idNumber: 'A123456789', birthY: 80, birthM: 5, birthD: 12, title: '' },
        { id: 'e2', name: '李', idNumber: 'B123456789', birthY: 75, birthM: 6, birthD: 3, title: '' },
      ],
    });
    ctx.run('editingEmployeeId = "e1"');
    // Try to change e1's idNumber to e2's idNumber
    fillModal(ctx, { name: '王', idNumber: 'B123456789', by: 80, bm: 5, bd: 12 });
    ctx.window.saveEmployee();
    // e1 must remain unchanged
    const e1 = ctx.getState().employees.find(e => e.id === 'e1');
    expect(e1.idNumber).toBe('A123456789');
  });
});

describe('deleteEmployee', () => {
  it('removes from employees and from selectedIds', () => {
    ctx.setState({
      employees: [
        { id: 'e1', name: 'A', idNumber: 'A1', birthY: 80, birthM: 5, birthD: 12, title: '' },
        { id: 'e2', name: 'B', idNumber: 'B1', birthY: 81, birthM: 6, birthD: 3, title: '' },
      ],
      selectedIds: new Set(['e1', 'e2']),
    });
    // Stub confirm() → always accept
    ctx.run('window.confirm = () => true');
    ctx.window.deleteEmployee('e1');
    const s = ctx.getState();
    expect(s.employees).toHaveLength(1);
    expect(s.employees[0].id).toBe('e2');
    expect(s.selectedIds).toEqual(['e2']);
  });

  it('cancels deletion when confirm returns false', () => {
    ctx.setState({
      employees: [{ id: 'e1', name: 'A', idNumber: 'A1', birthY: 80, birthM: 5, birthD: 12, title: '' }],
    });
    ctx.run('window.confirm = () => false');
    ctx.window.deleteEmployee('e1');
    expect(ctx.getState().employees).toHaveLength(1);
  });
});
