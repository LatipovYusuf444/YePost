import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Yozish oqimlari bitta batch so'rovda: variantlar POST …/modifications/bulk, narxlar PATCH /catalog/modifications/prices.

const require = createRequire(import.meta.url);

function compile(path, dependencies) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { exports: {}, require: name => {
    if (name in dependencies) return dependencies[name];
    if (name === 'react/jsx-runtime') return require(name);
    throw new Error(`Unmocked dependency: ${name}`);
  } };
  runInNewContext(code, context);
  return context.exports;
}

function katalogApi(calls) {
  const yozish = method => async (url, body) => { calls.push([method, url, body]); return { data: body.items.map((item, i) => ({ id: `r${i}`, ...item })) }; };
  return compile('../src/api/catalogApi.ts', {
    './axios': { __esModule: true, default: { post: yozish('post'), patch: yozish('patch'), put: yozish('put'), get: async () => { throw new Error('GET kutilmagan'); }, delete: async () => ({ data: null }), interceptors: { request: { use() {} }, response: { use() {} } } } },
    './response': { apiList: data => data, apiData: data => data, ruxsatsizBulsaBosh: callback => callback(), sahifaJavobi: data => data },
    './catalogSearch': { katalogQidiruvQatoriniMoslash: value => value, katalogQidiruvYuklagich: () => ({}) },
    '@/lib/authTokenStorage': { authTokenlarniOlish: () => ({}) },
    '@/lib/kopBirlik': { birliklarniMoslash: value => value, birliklarTanasi: value => value },
    './apiLanguage': { apiTiliniOlish: () => 'uz' },
    '@/lib/malumotnomaKeshi': { malumotnomaniOlish: (guruh, nom, yuklash) => yuklash(), ozgartirishdanKeyinTozalash: (guruh, amal) => amal() },
  });
}

test('bir nechta variant bitta POST …/modifications/bulk so\'rovida yuboriladi', async () => {
  const calls = [];
  const { modifikatsiyalarApi } = katalogApi(calls);
  const natija = await modifikatsiyalarApi.yaratishKoplab('p1', [{ name: 'Qizil' }, { name: 'Ko\'k' }]);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [['post', '/catalog/products/p1/modifications/bulk', { items: [{ name: 'Qizil' }, { name: 'Ko\'k' }] }]]);
  assert.equal(natija.length, 2);
});

test('kirimdagi o\'zgargan narxlar valyutasi bilan bitta PATCH /catalog/modifications/prices so\'rovida', async () => {
  const calls = [];
  const { modifikatsiyalarApi } = katalogApi(calls);
  const items = [
    { modificationId: 'm1', retailPrice: 12000, retailCurrency: 'UZS' },
    { modificationId: 'm2', retailPrice: 5, wholesalePrice: 4, retailCurrency: 'USD', wholesaleCurrency: 'USD' },
  ];
  await modifikatsiyalarApi.narxlarniYangilash(items);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [['patch', '/catalog/modifications/prices', { items }]]);
});

test('kirim modali narxlarni har qator uchun alohida emas, bitta batch bilan va per-maydon valyuta bilan yuboradi', () => {
  const manba = readFileSync(new URL('../src/Pages/Ombor/YangiKirimModal.tsx', import.meta.url), 'utf8');
  assert.ok(manba.includes('.narxlarniYangilash('));
  assert.ok(!manba.includes('.narxYangilash(row.modificationId'));
  assert.ok(manba.includes('retailCurrency: maydonValyutasi(row, "retailPrice")'));
});
