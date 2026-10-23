import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { AxiosError } from 'axios';

const apiUrl = new URL('../src/api/sozlamalarApi.ts', import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL === apiUrl) {
      if (specifier === './apiConfig') return { url: 'data:text/javascript,export const API_BASE_URL = "/backend-api/api/v1";', shortCircuit: true };
      if (specifier === './apiLanguage' || specifier === './xatoKodlari') return { url: new URL(specifier + '.ts', apiUrl).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
const { getApiErrorMessage } = await import(apiUrl);
const error = (status, data, url = '/sales/opening-debt/cancel') => {
  const config = { url, headers: {} };
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, undefined, { status, data, config, headers: {}, statusText: 'Error' });
};

test('a forbidden sale cancellation displays Ruxsat yo‘q instead of a backend code or English message', () => {
  for (const data of [{ code: 'errors.common.forbidden', message: 'Forbidden' }, { message: 'Forbidden' }, {}]) {
    assert.equal(getApiErrorMessage(error(403, data)), "Ruxsat yo'q");
  }
});

test('other cancellation errors and errors outside cancellation keep their existing messages', () => {
  assert.equal(getApiErrorMessage(error(400, { message: "Qarzga to'lov qilingan" })), "Qarzga to'lov qilingan");
  assert.match(getApiErrorMessage(error(423, { code: 'errors.document.period_closed' })), /Davr yopilgan/);
  assert.equal(getApiErrorMessage(error(403, { message: 'Forbidden' }, '/catalog/products')), 'Forbidden');
});

test('a forbidden cancellation is localized in Russian too', () => {
  const originalWindow = globalThis.window;
  globalThis.window = { localStorage: { getItem: () => 'ru' } };
  try { assert.equal(getApiErrorMessage(error(403, { code: 'errors.common.forbidden' })), 'Нет доступа'); }
  finally { if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow; }
});
