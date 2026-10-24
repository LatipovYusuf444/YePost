import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { calls, responses } from './helpers/balanceReportClient.mjs';

const src = new URL('../src/', import.meta.url);
const fixture = new URL('./helpers/balanceReportClient.mjs', import.meta.url).href;
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.startsWith(src.href)) {
    if (specifier === './axios') return { url: fixture, shortCircuit: true };
    if (specifier === './financeApi') return { url: 'data:text/javascript,export const kassaKirimApi={}; export const xarajatApi={};', shortCircuit: true };
    if (specifier === './sozlamalarApi') return { url: 'data:text/javascript,export const getApiErrorMessage=String;', shortCircuit: true };
    if (specifier.startsWith('.') && !specifier.endsWith('.ts')) return { url: new URL(specifier + '.ts', context.parentURL).href, shortCircuit: true };
  }
  return next(specifier, context);
} });
const { cashFlowReportApi, cashDailyReportApi } = await import('../src/api/reportsApi.ts');
const { financeTransactions, barchaFinanceTransactionsHisoboti, barchaFinanceTransactions } = await import('../src/api/tolovApi.ts');
const balance = (openingBalance, income, expense, closingBalance) => ({ openingBalance, income, expense, closingBalance });
const summary = { UZS: { income: 14350000, expense: 30000, net: 14320000, count: 12 }, USD: { income: 100.25, expense: 0.5, net: 99.75, count: 1 } };

test('cash-flow keeps currency summaries and opening/closing balances across every page', async () => {
  calls.length = 0;
  const usd = { ...balance(50, 100.25, 0.5, 149.75), byPaymentMethod: { CASH: balance(50, 100.25, 0.5, 149.75) } };
  responses.push({ summary: { ...usd, byCurrency: { USD: usd, UZS: { ...balance(0, 14350000, 0, 14350000), byPaymentMethod: {} } } }, byPaymentMethod: [], items: [{ id: 'usd1', currency: 'USD', runningBalance: 150.25 }], totalPages: 2 }, { items: [{ id: 'usd2', currency: 'USD', runningBalance: 149.75 }] });
  const result = await cashFlowReportApi.olish({ currency: 'USD', dateFrom: '2026-10-17', dateTo: '2026-10-24', paymentMethods: 'CASH' });
  assert.deepEqual(result.byPaymentMethod, [{ paymentMethod: 'CASH', ...usd.byPaymentMethod.CASH }]);
  assert.equal(result.summary.byCurrency.USD.closingBalance, 149.75);
  assert.equal(result.items.length, 2);
  assert.equal(result.items[1].runningBalance, 149.75);
  assert.deepEqual(calls.map(call => call.config.params.currency), ['USD', 'USD']);
  assert.ok(calls.every(call => call.config.params.dateTo === '2026-10-24'));
});

test('finance summary is server-wide, preserved once, and never summed over pages', async () => {
  calls.length = 0;
  responses.push({ data: [{ id: '1', currency: 'UZS', amount: 10 }], summary, totalPages: 2 }, { data: [{ id: '2', currency: 'USD', amount: 0.25 }], summary });
  const result = await barchaFinanceTransactionsHisoboti({ currency: 'ALL', dateFrom: '2026-10-17', dateTo: '2026-10-24', paymentType: 'CASH', type: 'INCOME', search: 'name' });
  assert.equal(result.items.length, 2);
  assert.deepEqual(result.summary, summary);
  assert.equal(result.summary.USD.income, 100.25);
  assert.ok(calls.every(call => call.config.params.currency === 'ALL' && call.config.params.dateTo === '2026-10-24' && call.config.params.paymentType === 'CASH' && call.config.params.search === 'name'));
});

test('existing finance callers keep their default request and array response', async () => {
  calls.length = 0;
  responses.push({ data: [{ id: 'old' }] });
  assert.deepEqual(await barchaFinanceTransactions(), [{ id: 'old' }]);
  assert.equal(calls[0].config.params.currency, undefined);
  responses.push({ data: [], summary });
  assert.deepEqual((await financeTransactions({ currency: 'UZS' })).summary, summary);
});

test('daily cash preserves no-activity days, carried balances and exact totals', async () => {
  calls.length = 0;
  const zero = { opening: 100, income: 0, expense: 0, closing: 100, byPaymentType: { CASH: { income: 0, expense: 0 } } };
  const report = { from: '2026-10-17', to: '2026-10-18', timezone: 'Asia/Tashkent', days: [{ date: '2026-10-17', operationsCount: 0, UZS: zero, USD: zero }, { date: '2026-10-18', operationsCount: 0, UZS: zero, USD: zero }], totals: { operationsCount: 0, UZS: zero, USD: zero } };
  responses.push({ success: true, data: report });
  const result = await cashDailyReportApi.olish({ from: report.from, to: report.to, branchId: 'b1', paymentType: 'BANK' });
  assert.deepEqual(result, report);
  assert.equal(result.days[1].USD.opening, result.days[0].USD.closing);
  assert.deepEqual(calls[0], { url: '/reports/cash-daily', config: { params: { from: report.from, to: report.to, branchId: 'b1', paymentType: 'BANK' } } });
});

test('cash-flow Excel omits currency and keeps calendar dates for the two-currency workbook', async () => {
  calls.length = 0;
  const originalDocument = globalThis.document;
  const createURL = URL.createObjectURL;
  const revokeURL = URL.revokeObjectURL;
  globalThis.document = { createElement: () => ({ click() {}, remove() {} }), body: { appendChild() {} } };
  URL.createObjectURL = () => 'blob:test';
  URL.revokeObjectURL = () => {};
  try {
    await cashFlowReportApi.export({ dateFrom: '2026-10-17', dateTo: '2026-10-24', paymentMethods: 'CASH' });
    assert.equal(calls[0].url, '/reports/cash-flow/export');
    assert.equal('currency' in calls[0].config.params, false);
    assert.equal(calls[0].config.params.dateTo, '2026-10-24');
  } finally { globalThis.document = originalDocument; URL.createObjectURL = createURL; URL.revokeObjectURL = revokeURL; }
});
