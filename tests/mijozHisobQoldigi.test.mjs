import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { mijozHisoblariniMoslash, mijozQarzdormi } from '../src/lib/mijozHisobQoldigi.ts';
import { mahsulotlarQisqacha } from '../src/lib/kassaNomlari.ts';

test('customer cards keep report balances per currency; advance in one currency cannot hide debt in another', () => {
  const result = mijozHisoblariniMoslash({ items: [
    { counterpartyId: '4-54', closingBalance: '-100000' },
    { counterpartyId: 'other', closingBalance: '12000' },
  ] }, { items: [{ counterpartyId: '4-54', closingBalance: '858.85' }] });
  assert.deepEqual(result['4-54'], { UZS: -100000, USD: 858.85 });
  assert.deepEqual(result.other, { UZS: 12000, USD: 0 });
  assert.equal(mijozQarzdormi(result['4-54']), true);
  assert.equal(mijozQarzdormi({ UZS: 0, USD: -100 }), false);
  assert.equal(mijozQarzdormi(undefined), false);
});

test('missing or malformed report amounts never become zero debt', () => {
  for (const invalid of [null, {}, { items: null }, { items: [{ counterpartyId: 'c' }] }, { items: [{ counterpartyId: 'c', closingBalance: '' }] }, { items: [{ counterpartyId: 'c', closingBalance: null }] }, { items: [{ counterpartyId: 'c', closingBalance: 'bad' }] }]) {
    assert.throws(() => mijozHisoblariniMoslash(invalid, { items: [] }));
  }
  assert.throws(() => mijozHisoblariniMoslash({ currency: 'USD', items: [] }, { items: [] }));
  assert.throws(() => mijozHisoblariniMoslash({ items: [{ counterpartyId: 'c', closingBalance: 100, currency: 'USD' }] }, { items: [] }));
});

const code = ts.transpileModule(readFileSync(new URL('../src/Pages/KassaUchot/nomQismlari.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const context = { exports: {}, require: () => ({ mahsulotlarQisqacha }) };
runInNewContext(code, context);

for (const lang of ['uz', 'ru']) {
  const translations = JSON.parse(readFileSync(new URL(`../src/i18n/locales/${lang}/kassa_uchot.json`, import.meta.url), 'utf8'));
  const t = (key, args = {}) => key.split('.').reduce((value, part) => value?.[part], translations)?.replace(/\{\{(\w+)\}\}/g, (_, name) => args[name]) ?? key;
  test(`${lang}: customer payment shows KAS identity and opening-debt allocation, including before sale details arrive`, () => {
    const operation = { backendSource: 'CASH_OPERATION', turi: 'xaridor_tolovi', hujjatRaqami: 'KAS-000025', saleId: 'qb', nomi: 'old stored name' };
    const result = context.exports.nomQismlari(operation, { raqam: 'QB-000004', isOpeningDebt: true, mahsulotlar: [] }, t);
    assert.ok(result.sarlavha.includes('KAS-000025'));
    assert.ok(result.tafsilot.includes('QB-000004'));
    assert.equal(result.tafsilot.includes(lang === 'uz' ? 'Sotuv' : 'Продажа'), false);
    const pending = context.exports.nomQismlari(operation, undefined, t);
    assert.ok(pending.sarlavha.includes('KAS-000025'));
    assert.equal(pending.tafsilot, '');
    const sale = context.exports.nomQismlari(operation, { raqam: 'SOT-000027', mahsulotlar: [] }, t);
    assert.ok(sale.tafsilot.includes('SOT-000027'));
    assert.notEqual(sale.tafsilot, result.tafsilot);
  });
}
