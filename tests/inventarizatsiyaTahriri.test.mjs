import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const load = () => require('../src/lib/inventarizatsiyaTahriri.ts');
const doc = () => ({ id: 'inv', docNumber: 'INV-00001', status: 'CONFIRMED', updatedAt: '2026-10-24T07:10:00.000Z', warehouseId: 'w', date: '2026-10-23', type: 'PARTIAL', items: [{ modificationId: 'a', actualQuantity: '100', systemQuantity: '0', modification: { id: 'a', name: 'Original product' } }] });

test('only ADMIN and DIREKTOR may revise a confirmed document', () => {
  const { inventarizatsiyaTahririMumkin } = load();
  for (const role of ['ADMIN', 'DIREKTOR', 'DIRECTOR']) assert.equal(inventarizatsiyaTahririMumkin(doc(), role), true);
  for (const role of ['', 'KASSIR', 'OMBORCHI']) assert.equal(inventarizatsiyaTahririMumkin(doc(), role), false);
  for (const status of ['DRAFT', 'CANCELLED']) assert.equal(inventarizatsiyaTahririMumkin({ ...doc(), status }, 'ADMIN'), false);
});

test('revision sends exact lower/zero/fractional counts and original updatedAt, without warehouse or date', () => {
  const { inventarizatsiyaTahrirSorovi } = load();
  for (const quantity of ['90', '0', '45.5']) {
    assert.deepEqual(inventarizatsiyaTahrirSorovi(doc(), { ids: ['a'], actuals: { a: quantity }, note: '  corrected  ' }), {
      expectedUpdatedAt: '2026-10-24T07:10:00.000Z', note: 'corrected', type: 'PARTIAL',
      items: [{ modificationId: 'a', actualQuantity: Number(quantity) }],
    });
  }
});

test('row replacement may remove A and add B, and invalid quantities cannot reach the API', () => {
  const { inventarizatsiyaTahrirSorovi } = load();
  const payload = inventarizatsiyaTahrirSorovi(doc(), { ids: ['b'], actuals: { a: '100', b: '5' }, note: '' });
  assert.deepEqual(payload.items, [{ modificationId: 'b', actualQuantity: 5 }]);
  assert.equal(payload.note, '', 'clearing the note is an explicit update');
  for (const value of ['', '-1', 'NaN', 'Infinity']) assert.throws(() => inventarizatsiyaTahrirSorovi(doc(), { ids: ['a'], actuals: { a: value }, note: '' }));
});

test('edit rows retain the original system quantity and product even when missing from the current catalog', () => {
  const { inventarizatsiyaTahrirTanlovlari } = load();
  const rows = inventarizatsiyaTahrirTanlovlari(doc(), [{ modificationId: 'b', warehouseId: 'w', quantity: 300 }]);
  assert.equal(rows.find(row => row.modificationId === 'a').availableQuantity, 0);
  assert.equal(rows.find(row => row.modificationId === 'a').modification.name, 'Original product');
  assert.equal(rows.find(row => row.modificationId === 'b').availableQuantity, 300);
});
