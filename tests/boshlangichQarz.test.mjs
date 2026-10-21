import test from 'node:test';
import assert from 'node:assert/strict';
import { boshlangichQarzMalumoti, mijozQarzXulosasi, qarzImportJavobi, qarzImportiniSaqlashMumkin, savdoHujjatimi } from '../src/lib/boshlangichQarz.ts';

const bugun = '2026-10-21';

test('opening debt accepts a formatted amount and preserves its original date and currency', () => {
  assert.deepEqual(boshlangichQarzMalumoti({ amount: '1 200 000', currency: 'UZS', date: '2026-09-01', note: ' daftardan ' }, bugun), {
    payload: { amount: 1200000, currency: 'UZS', date: '2026-09-01', note: 'daftardan' },
  });
  assert.deepEqual(boshlangichQarzMalumoti({ amount: '12,50', currency: 'USD', date: '', note: '' }, bugun), {
    payload: { amount: 12.5, currency: 'USD' },
  });
});

test('empty, negative, nonfinite or malformed debt amounts cannot be sent', () => {
  for (const amount of ['', '0', '-100', 'NaN', 'Infinity', '12x', '1.2.3', '1e5']) {
    assert.equal(boshlangichQarzMalumoti({ amount, currency: 'UZS', date: '', note: '' }, bugun).error, 'amount', amount);
  }
});

test('future dates, impossible calendar dates and unsupported currencies are rejected', () => {
  const base = { amount: '100', currency: 'UZS', date: '', note: '' };
  for (const date of ['2026-10-22', '2026-02-30', '2026-13-01', '01/09/2026']) {
    assert.equal(boshlangichQarzMalumoti({ ...base, date }, bugun).error, 'date', date);
  }
  assert.equal(boshlangichQarzMalumoti({ ...base, currency: 'EUR' }, bugun).error, 'currency');
});

test('opening debts remain debt documents but never count as sales turnover', () => {
  const sale = { id: 'sale', totalAmount: '500000' };
  const legacySale = { id: 'legacy', isOpeningDebt: false, totalAmount: '250000' };
  const debt = { id: 'debt', isOpeningDebt: true, totalAmount: '1200000', debtAmount: '1200000' };
  const documents = [sale, legacySale, debt];
  assert.deepEqual(documents.filter(savdoHujjatimi), [sale, legacySale]);
  assert.equal(documents.filter(savdoHujjatimi).reduce((sum, item) => sum + Number(item.totalAmount), 0), 750000);
  assert.equal(debt.debtAmount, '1200000');
  assert.equal(documents.length, 3);
});

test('Excel confirmation requires an explicitly successful full-file validation', () => {
  const report = qarzImportJavobi({ dryRun: true, totalRows: 200, validRows: 200, errors: [] });
  assert.equal(qarzImportiniSaqlashMumkin(report), true);
  for (const raw of [null, {}, { totalRows: 200 }, { totalRows: 0, errors: [] }, { totalRows: 200, validRows: 199, errors: [] }, { success: false, totalRows: 200, errors: [] }, { dryRun: false, totalRows: 200, errors: [] }]) {
    assert.equal(qarzImportiniSaqlashMumkin(qarzImportJavobi(raw)), false, JSON.stringify(raw));
  }
});

test('one invalid row blocks the entire file and keeps the exact row and error text', () => {
  const report = qarzImportJavobi({ data: { dryRun: true, totalRows: 200, errors: [{ row: 17, column: 'amount', message: 'Summa musbat bo‘lishi kerak', value: '-10' }] } });
  assert.equal(qarzImportiniSaqlashMumkin(report), false);
  assert.deepEqual(report.errors, [{ row: 17, column: 'amount', message: 'Summa musbat bo‘lishi kerak', value: '-10' }]);
});

test('validation errors from an HTTP failure keep row details and cannot pass as a preview', () => {
  const report = qarzImportJavobi({ success: false, message: 'Faylda xato', details: { errors: [{ row: 4, message: ['Telefon noto‘g‘ri', 'Mijoz topilmadi'] }] } });
  assert.equal(qarzImportiniSaqlashMumkin(report), false);
  assert.equal(report.errors[0].row, 4);
  assert.match(report.errors[0].message, /Telefon/);
  assert.match(report.errors[0].message, /Mijoz/);
});

test('customer totals keep USD separate and opening debt never increases turnover', () => {
  const result = mijozQarzXulosasi([
    { summa: 500000, tolangan: 100000, qarz: 400000, currency: 'UZS' },
    { summa: 1200000, tolangan: 200000, qarz: 1000000, currency: 'UZS', isOpeningDebt: true },
    { summa: 150, tolangan: 20, qarz: 130, currency: 'USD', isOpeningDebt: true },
  ]);
  assert.deepEqual(result.aylanma, { UZS: 500000, USD: 0 });
  assert.deepEqual(result.tolangan, { UZS: 300000, USD: 20 });
  assert.deepEqual(result.qarz, { UZS: 1400000, USD: 130 });
});

test('an explicit error count or logical failure cannot be reported as successful import', () => {
  const report = qarzImportJavobi({ totalRows: 2, errors: [], errorCount: 1 });
  assert.equal(qarzImportiniSaqlashMumkin(report), false);
  assert.equal(report.radEtildi, true);
  assert.equal(qarzImportJavobi({ success: false, data: { errors: [] } }).radEtildi, true);
});
