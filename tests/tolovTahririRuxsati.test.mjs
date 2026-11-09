import test from 'node:test';
import assert from 'node:assert/strict';
import { tolovTahririCheklovi } from '../src/lib/tolovTahririRuxsati.ts';

const sale = { status: 'CONFIRMED', date: '2026-11-05T18:59:59.999Z' };
const payment = { id: 'p1', paymentType: 'CASH', amount: '60', date: '2026-11-09T06:00:00Z' };
const reason = (profile, document = sale, p = payment, closed = null) => tolovTahririCheklovi(profile, document, p, closed);

test('directors/owners in any shop can edit confirmed sale payments without grants', () => {
  for (const role of ['DIREKTOR', 'DIRECTOR', 'OWNER', 'director', ' DIREKTOR ']) {
    for (const workspaceId of ['shop-1', 'shop-2']) {
      assert.equal(reason({ role, workspaceId, grants: [] }), null, `${workspaceId}: ${role}`);
    }
  }
});

test('confirmed-sale permission matches the existing cancel/restore API', () => {
  assert.equal(reason({ role: 'ADMIN', grants: [{ code: 'RETURN_CANCEL', isActive: true }] }), null);
  for (const grants of [[], [{ code: 'RETURN_CANCEL', isActive: false }], [{ code: 'sales.payment.edit', isActive: true }]]) {
    assert.equal(reason({ role: 'ADMIN', grants }), 'tolovTahriri.ruxsatYoq');
  }
  for (const role of ['CASHIER', 'KASSIR', 'STOREKEEPER', 'OMBORCHI', 'unknown']) {
    assert.equal(reason({ role, grants: [{ code: 'RETURN_CANCEL', isActive: true }] }), 'tolovTahriri.ruxsatYoq');
  }
});

test('draft editing uses ordinary sale permissions, not cancellation permission', () => {
  for (const role of ['ADMIN', 'DIRECTOR', 'KASSIR', 'CASHIER', 'OMBORCHI', 'STOREKEEPER']) {
    assert.equal(reason({ role, grants: [] }, { ...sale, status: 'DRAFT' }), null, role);
  }
  assert.equal(reason(null, { ...sale, status: 'DRAFT' }), 'tolovTahriri.cheklov.profilYuklanmoqda');
  assert.equal(reason({ role: 'unknown' }, { ...sale, status: 'DRAFT' }), 'tolovTahriri.ruxsatYoq');
});

test('closed sale date or original payment date blocks editing, including the closing day', () => {
  const director = { role: 'DIRECTOR' };
  assert.equal(reason(director, sale, payment, '2026-11-04'), null);
  assert.equal(reason(director, sale, payment, '2026-11-05'), 'tolovTahriri.cheklov.davrYopilgan');
  assert.equal(reason(director, { ...sale, date: '2026-11-09' }, { ...payment, date: '2026-11-05' }, '2026-11-05'), 'tolovTahriri.cheklov.davrYopilgan');
});

test('payments that previously hid the edit button now have an explicit reason', () => {
  const director = { role: 'DIRECTOR' };
  assert.equal(reason(director, sale, { ...payment, cashOperationId: 'cash-1' }), 'tolovTahriri.cheklov.kassaHujjati');
  assert.equal(reason(director, sale, { ...payment, id: undefined }), 'tolovTahriri.cheklov.tolovIdYoq');
  for (const extra of [{ fromAccount: true }, { paymentType: 'BALANCE' }, { paymentType: 'DEBT' }, { amount: 0 }]) {
    assert.equal(reason(director, sale, { ...payment, ...extra }), 'tolovTahriri.cheklov.avtomatikTolov');
  }
  assert.equal(reason(director, { ...sale, status: 'CANCELLED' }), 'tolovTahriri.cheklov.bekorQilingan');
});
