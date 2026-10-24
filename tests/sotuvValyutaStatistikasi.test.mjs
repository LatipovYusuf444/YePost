import test from 'node:test';
import assert from 'node:assert/strict';
import { sotuvValyutaStatistikasi, statistikaTafsilotlariniYuklash } from '../src/Pages/Savdo/sotuvValyutaStatistikasi.ts';

const sale = changes => ({ id: 's1', status: 'CONFIRMED', currency: 'UZS', date: '2026-10-24', totalAmount: 100000, debtAmount: 0, totalsByCurrency: { UZS: 100000 }, payments: [], ...changes });
const stats = sales => sotuvValyutaStatistikasi(sales, '2026-10-24', '2026-10-24');

test('mixed goods and actual payment currencies remain independent, including USD cents', () => {
  const result = stats([sale({ totalsByCurrency: { UZS: '15000', USD: '12.5' }, payments: [
    { id: 'p1', paymentType: 'CASH', currency: 'USD', amount: '20.25', settledAmount: 230000, date: '2026-10-24' },
    { id: 'p2', paymentType: 'CARD', currency: 'UZS', amount: '5000', date: '2026-10-24' },
  ] })]);
  assert.equal(result.UZS.savdo, 15000);
  assert.equal(result.USD.savdo, 12.5);
  assert.equal(result.USD.tolov, 20.25);
  assert.equal(result.UZS.tolov, 5000);
  assert.equal(result.USD.savdoToliq, true);
});

test('payments use their own Tashkent date even for old sales and opening debts', () => {
  const result = stats([
    sale({ date: '2026-09-01', payments: [{ paymentType: 'CASH', amount: 75.55, currency: 'USD', date: '2026-10-23T20:00:00Z' }] }),
    sale({ id: 'opening', date: '2026-01-01', isOpeningDebt: true, payments: [{ paymentType: 'BANK', amount: 2000, currency: 'UZS', createdAt: '2026-10-24T01:00:00Z' }] }),
  ]);
  assert.equal(result.USD.tolov, 75.55);
  assert.equal(result.UZS.tolov, 2000);
  assert.equal(result.UZS.savdo, 0);
});

test('draft/cancelled documents and BALANCE/DEBT rows are not received money', () => {
  const result = stats([
    sale({ status: 'DRAFT', payments: [{ paymentType: 'CASH', amount: 100 }] }),
    sale({ id: 'cancelled', status: 'CANCELLED', payments: [{ paymentType: 'CASH', amount: 100 }] }),
    sale({ id: 'real', payments: [{ paymentType: 'BALANCE', amount: 500 }, { paymentType: 'DEBT', amount: 200 }] }),
  ]);
  assert.equal(result.UZS.savdo, 100000);
  assert.equal(result.UZS.tolov, 0);
});

test('line fallback applies discounts in each line currency without changing rates', () => {
  const result = stats([sale({ totalsByCurrency: null, items: [
    { currency: 'USD', quantity: 3, price: '4.25', discount: '.25' },
    { currency: 'UZS', quantity: 2, price: 10000, discount: 1000 },
  ] })]);
  assert.equal(result.USD.savdo, 12.5);
  assert.equal(result.UZS.savdo, 19000);
});

test('opening debt affects only debt in its own currency', () => {
  const result = stats([sale({ isOpeningDebt: true, currency: 'USD', debtAmount: '120.75' })]);
  assert.equal(result.USD.savdo, 0);
  assert.equal(result.USD.qarz, 120.75);
  assert.equal(result.UZS.qarz, 0);
});

test('missing arrays and invalid/unknown currencies are unavailable, never a fabricated zero', () => {
  const missing = stats([sale({ totalsByCurrency: null, items: undefined, payments: undefined })]);
  assert.equal(missing.USD.savdoToliq, false);
  assert.equal(missing.UZS.tolovToliq, false);
  const unknown = stats([sale({ totalsByCurrency: { EUR: 100 }, payments: [{ paymentType: 'CASH', currency: 'EUR', amount: 10, date: '2026-10-24' }] })]);
  assert.equal(unknown.USD.savdoToliq, false);
  assert.equal(unknown.UZS.tolovToliq, false);
  assert.equal(stats([sale({ totalsByCurrency: { USD: 0 }, payments: [] })]).USD.savdoToliq, true);
  assert.equal(stats([sale({ paidAmount: 1000, payments: [] })]).USD.tolovToliq, false);
});

test('gross dollar receipts and UZS change are separated and duplicates counted once', () => {
  const s = sale({ payments: [{ id: 'p', paymentType: 'CASH', currency: 'USD', amount: 100, changeAmount: 339000, date: '2026-10-24' }] });
  const result = stats([s, s]);
  assert.equal(result.USD.tolov, 100);
  assert.equal(result.UZS.qaytim, 339000);
});

test('missing payment currency inherits the sale currency; dates never inherit the sale date', () => {
  const result = stats([sale({ currency: 'USD', payments: [{ paymentType: 'CASH', amount: '.15', date: '2026-10-24' }, { paymentType: 'CASH', amount: '.15', date: '2026-10-24' }] })]);
  assert.equal(result.USD.tolov, .3);
  assert.equal(stats([sale({ payments: [{ paymentType: 'CASH', amount: 10 }] })]).USD.tolovToliq, false);
});

test('detail hydration fills missing rows only and preserves failed rows as incomplete', async () => {
  const complete = sale({ id: 'complete' });
  const partial = sale({ id: 'partial', payments: undefined });
  const failed = sale({ id: 'failed', payments: undefined });
  const calls = [];
  const rows = await statistikaTafsilotlariniYuklash([complete, partial, failed], async id => {
    calls.push(id);
    if (id === 'failed') throw new Error('not available');
    return sale({ id, payments: [{ paymentType: 'CASH', amount: 10, currency: 'USD', date: '2026-10-24' }] });
  });
  assert.deepEqual(calls.sort(), ['failed', 'partial']);
  assert.equal(rows[0], complete);
  assert.equal(stats(rows).USD.tolovToliq, false);
});
