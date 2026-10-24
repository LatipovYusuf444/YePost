import test from 'node:test';
import assert from 'node:assert/strict';

test('cash report values keep currencies separate, including negative dollars and cents', async () => {
  const { cashAmount, dailyNet } = await import('../src/lib/cashReports.ts');
  assert.match(cashAmount(14350000, 'UZS'), /so'm$/);
  assert.match(cashAmount(-100.25, 'USD'), /^\$-100[.,]25$/);
  const day = { UZS: { income: 1000000, expense: 30000, byPaymentType: { CASH: { income: 1000000, expense: 30000 } } }, USD: { income: 100.25, expense: 0.5, byPaymentType: { CASH: { income: 100.25, expense: 0.5 } } } };
  assert.equal(dailyNet(day, 'UZS', 'CASH'), 970000);
  assert.equal(dailyNet(day, 'USD', 'CASH'), 99.75);
  assert.equal(dailyNet(day, 'USD'), 99.75);
  assert.equal(dailyNet(day, 'USD', 'BANK'), 0);
});

test('daily cash range accepts at most 400 real calendar days, inclusively', async () => {
  const { dailyRangeError } = await import('../src/lib/cashReports.ts');
  assert.equal(dailyRangeError('2026-01-01', '2027-02-04'), '');
  assert.ok(dailyRangeError('2026-01-01', '2027-02-05'));
  assert.ok(dailyRangeError('2026-10-24', '2026-10-17'));
  assert.ok(dailyRangeError('', '2026-10-17'));
  assert.ok(dailyRangeError('2026-02-30', '2026-03-01'));
});
