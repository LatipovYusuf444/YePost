import test from 'node:test';
import assert from 'node:assert/strict';
import { ozgarmaganBoshqaValyutaMaydonlar, yuboriladiganNarx } from '../src/Pages/Mahsulotlar/narxValyutaYuklama.ts';

// Bir valyutali rejimda boshqa valyutada saqlangan narxning faqat bir qismi o'zgartirilsa, tegilmagan narxlar
// rejim valyutasida jimgina yuborilmasligi kerak ($8 → "8 so'm").
const saqlangan = {
  costPrice: 8, costCurrency: 'USD',
  retailPrice: 10, retailCurrency: 'USD',
  wholesalePrice: 9, wholesaleCurrency: 'USD',
};

test('hech bir narx o\'zgarmasa — xato yo\'q (narx umuman yuborilmaydi)', () => {
  const narx = { costPrice: '8', retailPrice: '10', wholesalePrice: '9' };
  assert.deepEqual(ozgarmaganBoshqaValyutaMaydonlar(narx, saqlangan, 'UZS'), []);
  assert.equal(yuboriladiganNarx({ ...narx, costCurrency: 'UZS', retailCurrency: 'UZS', wholesaleCurrency: 'UZS' }, saqlangan, 'UZS'), undefined);
});

test('faqat sotuv narxi o\'zgarsa — tegilmagan dollardagi tannarx va ulgurji narx belgilanadi', () => {
  const narx = { costPrice: '8', retailPrice: '125000', wholesalePrice: '9' };
  assert.deepEqual(ozgarmaganBoshqaValyutaMaydonlar(narx, saqlangan, 'UZS'), ['costPrice', 'wholesalePrice']);
});

test('uchala narx qayta kiritilsa — xato yo\'q', () => {
  const narx = { costPrice: 100000, retailPrice: 125000, wholesalePrice: 115000 };
  assert.deepEqual(ozgarmaganBoshqaValyutaMaydonlar(narx, saqlangan, 'UZS'), []);
});

test('rejim valyutasida saqlangan maydon tegilmasa ham belgilanmaydi', () => {
  const aralash = { ...saqlangan, costCurrency: 'UZS', costPrice: 90000 };
  const narx = { costPrice: '90000', retailPrice: '125000', wholesalePrice: '9' };
  assert.deepEqual(ozgarmaganBoshqaValyutaMaydonlar(narx, aralash, 'UZS'), ['wholesalePrice']);
});

test('eski `currency` maydoni va Faqat dollar rejimi', () => {
  const eski = { costPrice: 90000, retailPrice: 120000, wholesalePrice: 110000, currency: 'UZS' };
  const narx = { costPrice: 90000, retailPrice: 10, wholesalePrice: 110000 };
  assert.deepEqual(ozgarmaganBoshqaValyutaMaydonlar(narx, eski, 'USD'), ['costPrice', 'wholesalePrice']);
});

test('raqami 0 bo\'lgan tegilmagan maydon belgilanmaydi', () => {
  const nolli = { ...saqlangan, wholesalePrice: 0 };
  const narx = { costPrice: '8', retailPrice: '125000', wholesalePrice: '' };
  assert.deepEqual(ozgarmaganBoshqaValyutaMaydonlar(narx, nolli, 'UZS'), ['costPrice']);
});

test('ikki valyuta rejimida yoki saqlangan narx yo\'q bo\'lsa — bo\'sh ro\'yxat', () => {
  const narx = { costPrice: '8', retailPrice: '125000', wholesalePrice: '9' };
  assert.deepEqual(ozgarmaganBoshqaValyutaMaydonlar(narx, saqlangan, null), []);
  assert.deepEqual(ozgarmaganBoshqaValyutaMaydonlar(narx, null, 'UZS'), []);
  assert.deepEqual(ozgarmaganBoshqaValyutaMaydonlar(narx, { ...saqlangan, costCurrency: 'UZS', retailCurrency: 'UZS', wholesaleCurrency: 'UZS' }, 'UZS'), []);
});
