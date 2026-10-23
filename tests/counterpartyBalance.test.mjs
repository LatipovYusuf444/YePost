import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { calls, responses } from './helpers/balanceReportClient.mjs';

const apiUrl = new URL('../src/api/reportsApi.ts', import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL === apiUrl) {
      if (specifier === './axios') return { url: new URL('./helpers/balanceReportClient.mjs', import.meta.url).href, shortCircuit: true };
      if (specifier === './sozlamalarApi') return { url: 'data:text/javascript,export const getApiErrorMessage = String;', shortCircuit: true };
      if (specifier === './hisobotParametrlari') return { url: new URL('../src/api/hisobotParametrlari.ts', import.meta.url).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
const { counterpartyBalanceReportApi: api } = await import(apiUrl);
const { hisobotPulMatni } = await import('../src/Pages/HisobotUchot/hisobotValyutasi.ts');

test('USD debt stays in dollars and all report pages request the same currency', async () => {
  calls.length = 0;
  responses.push(
    { items: [{ counterpartyName: 'Umar', closingBalance: '3858.50' }], totalPages: 2 },
    { items: [{ counterpartyName: 'Other', closingBalance: '10.25' }] },
  );
  const result = await api.barchasi({ counterpartyType: 'CUSTOMER', currency: 'USD' });
  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map(call => call.config.params.currency), ['USD', 'USD']);
  assert.equal(result.items.length, 2);
  assert.equal(hisobotPulMatni(Number(result.items[0].closingBalance), 'USD').replace(/\s/g, '').replace(',', '.'), '$3858.5');
});

test('document chronology uses the selected currency and preserves date filters', async () => {
  calls.length = 0;
  await api.hujjatlar('CUSTOMER', 'umar', { currency: 'USD', dateFrom: '2026-10-01' });
  assert.deepEqual(calls, [{
    url: '/reports/counterparty-balance/CUSTOMER/umar/documents',
    config: { params: { currency: 'USD', dateFrom: '2026-10-01' } },
  }]);
});

test('document chronology defaults to UZS when currency mode is unused', async () => {
  calls.length = 0;
  await api.hujjatlar('SUPPLIER', 'supplier');
  assert.equal(calls[0].config.params.currency, 'UZS');
});

test('Excel export sends USD with the selected customer filter', async () => {
  calls.length = 0;
  const originalDocument = globalThis.document;
  globalThis.document = {
    createElement: () => ({ click() {}, remove() {} }),
    body: { appendChild() {} },
  };
  responses.push(new Blob(['xlsx']));
  try {
    await api.export({ counterpartyType: 'CUSTOMER', customerIds: 'umar', currency: 'USD' }, 'excel');
    assert.deepEqual(calls, [{
      url: '/reports/counterparty-balance',
      config: { params: { counterpartyType: 'CUSTOMER', customerIds: 'umar', currency: 'USD', export: 'excel' }, responseType: 'blob' },
    }]);
  } finally {
    globalThis.document = originalDocument;
  }
});
