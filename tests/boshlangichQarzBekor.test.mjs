import test from 'node:test';
import assert from 'node:assert/strict';
import * as qarz from '../src/lib/boshlangichQarz.ts';

test('DIREKTOR can cancel a confirmed opening debt without any grants', () => {
  const debt = { isOpeningDebt: true, status: 'CONFIRMED' };
  for (const role of ['DIREKTOR', 'DIRECTOR']) {
    assert.equal(qarz.boshlangichQarzniBekorQilishMumkin({ role }, debt), true, role);
  }
});

test('ADMIN needs an active RETURN_CANCEL grant to cancel a confirmed opening debt', () => {
  const debt = { isOpeningDebt: true, status: 'CONFIRMED' };
  for (const grants of [undefined, [], [{ code: 'RETURN_CANCEL', isActive: false }], [{ code: 'OTHER', isActive: true }]]) {
    assert.equal(qarz.boshlangichQarzniBekorQilishMumkin({ role: 'ADMIN', grants }, debt), false, JSON.stringify(grants));
  }
  for (const grants of [[{ code: 'RETURN_CANCEL', isActive: true }], [{ code: 'RETURN_CANCEL' }]]) {
    assert.equal(qarz.boshlangichQarzniBekorQilishMumkin({ role: 'ADMIN', grants }, debt), true);
  }
});

test('other roles cannot cancel opening debts even with a RETURN_CANCEL grant', () => {
  const debt = { isOpeningDebt: true, status: 'CONFIRMED' };
  for (const role of ['KASSIR', 'OMBORCHI', '', undefined]) {
    assert.equal(qarz.boshlangichQarzniBekorQilishMumkin({ role, grants: [{ code: 'RETURN_CANCEL', isActive: true }] }, debt), false, String(role));
  }
  assert.equal(qarz.boshlangichQarzniBekorQilishMumkin(null, debt), false);
});

test('opening debt cancellation never applies to a normal sale, draft or already cancelled debt', () => {
  for (const debt of [null, {}, { status: 'CONFIRMED' }, { isOpeningDebt: false, status: 'CONFIRMED' }, { isOpeningDebt: true, status: 'DRAFT' }, { isOpeningDebt: true, status: 'CANCELLED' }]) {
    assert.equal(qarz.boshlangichQarzniBekorQilishMumkin({ role: 'ADMIN', grants: [{ code: 'RETURN_CANCEL', isActive: true }] }, debt), false);
  }
});
