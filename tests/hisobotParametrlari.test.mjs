import test from 'node:test';
import assert from 'node:assert/strict';
import { chegirmaParametrlari } from '../src/api/hisobotParametrlari.ts';

test('the discount report sends the cashier filter as cashierId, never as the rejected responsibleId', () => {
  const params = chegirmaParametrlari({ groupBy: 'CASHIER', branchId: 'b1', responsibleId: 'u1', dateFrom: '2026-10-01T00:00:00.000Z' });
  assert.equal(params.cashierId, 'u1');
  assert.equal('responsibleId' in params, false);
  assert.equal(params.groupBy, 'CASHIER');
  assert.equal(params.branchId, 'b1');
});

test('an explicit cashierId wins and the default grouping is by day', () => {
  assert.equal(chegirmaParametrlari({ cashierId: 'a', responsibleId: 'b' }).cashierId, 'a');
  assert.equal(chegirmaParametrlari({}).groupBy, 'DAY');
  assert.equal(chegirmaParametrlari({}).cashierId, undefined);
});
