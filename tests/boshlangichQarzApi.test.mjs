import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { calls, responses } from './helpers/openingDebtClient.mjs';

const apiUrl = new URL('../src/api/boshlangichQarzApi.ts', import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL === apiUrl && specifier === './axios') {
      return { url: new URL('./helpers/openingDebtClient.mjs', import.meta.url).href, shortCircuit: true };
    }
    if (context.parentURL === apiUrl && specifier === './response') {
      return { url: new URL('../src/api/response.ts', import.meta.url).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
const api = await import(apiUrl);

test('opening debt posts amount/currency/date/note to the customer endpoint without creating a product sale', async () => {
  calls.length = 0;
  const payload = { amount: 1200000, currency: 'UZS', date: '2026-09-01', note: 'daftardan' };
  responses.push({ data: { id: 'opening-1', isOpeningDebt: true } });
  const result = await api.boshlangichQarzYaratish('customer-1', payload);
  assert.equal(result.isOpeningDebt, true);
  assert.deepEqual(calls, [{ method: 'post', url: '/partners/customers/customer-1/opening-debt', data: payload, config: undefined }]);
});

test('checking and saving use one multipart file with explicit dryRun true/false', async () => {
  calls.length = 0;
  const file = new File(['fixture'], 'opening.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  await api.boshlangichQarzImporti(file, true);
  await api.boshlangichQarzImporti(file, false);
  assert.equal(calls.length, 2);
  for (const [index, call] of calls.entries()) {
    assert.equal(call.url, '/partners/customers/opening-debts/import');
    assert.equal(call.config.params.dryRun, index === 0);
    assert.equal(call.config.headers['Content-Type'], null);
    assert.ok(call.data instanceof FormData);
    assert.equal([...call.data.keys()].join(','), 'file');
    assert.equal(call.data.get('file').name, 'opening.xlsx');
    assert.equal(await call.data.get('file').text(), 'fixture');
  }
});

test('the official template is fetched as a Blob from the supplied endpoint', async () => {
  calls.length = 0;
  const blob = new Blob(['xlsx']);
  responses.push(blob);
  assert.equal(await api.boshlangichQarzShabloni(), blob);
  assert.deepEqual(calls, [{ method: 'get', url: '/partners/customers/opening-debts/template', config: { responseType: 'blob' } }]);
});

test('repayment delegates oldest-first allocation to the documented backend debt API', async () => {
  calls.length = 0;
  const payload = { customerId: 'customer-1', amount: 100, paymentMethod: 'CASH', currency: 'USD', note: 'qarz uchun' };
  await api.mijozQarziniTolash(payload);
  assert.deepEqual(calls, [{ method: 'post', url: '/finance/debt-repayment', data: payload, config: undefined }]);
});
