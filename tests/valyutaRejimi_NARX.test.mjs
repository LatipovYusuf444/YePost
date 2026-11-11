import test from 'node:test';
import assert from 'node:assert/strict';
import { narxYigish, narxQoralamaValyutalari, ozgarmaganBoshqaValyutaNarx, rejimgaMosEmasNarx, yuboriladiganNarx } from '../src/Pages/Mahsulotlar/narxValyutaYuklama.ts';
import { kalkulyatsiyaTanasiniYigish } from '../src/lib/ishlabChiqarish.ts';

// Valyuta rejimi (backend 11.11.2026): bir valyutali rejimda narxlar faqat rejim valyutasida yuboriladi.
const qoralama = {
  costPrice: '0.48', costCurrency: 'USD',
  retailPrice: '9000', retailCurrency: 'UZS',
  wholesalePrice: '0.6', wholesaleCurrency: 'USD',
};

test('ikki valyuta rejimida (yagona yo\'q) har bir narx o\'z valyutasida — avvalgidek', () => {
  assert.deepEqual(narxYigish(qoralama, null), narxYigish(qoralama));
  assert.deepEqual(narxYigish(qoralama, null), {
    costPrice: 0.48, costCurrency: 'USD',
    retailPrice: 9000, retailCurrency: 'UZS',
    wholesalePrice: 0.6, wholesaleCurrency: 'USD',
  });
});

test('Faqat dollar rejimida uchala narx ham USD da yuboriladi, so\'m yuborilmaydi', () => {
  const payload = narxYigish(qoralama, 'USD');
  assert.equal(payload.costCurrency, 'USD');
  assert.equal(payload.retailCurrency, 'USD');
  assert.equal(payload.wholesaleCurrency, 'USD');
  assert.equal(payload.retailPrice, 9000);
});

test('Faqat so\'m rejimida dollar yuborilmaydi (ko\'chirilgan ulgurji narx ham)', () => {
  const payload = narxYigish({ ...qoralama, wholesalePrice: '' }, 'UZS');
  assert.deepEqual(
    [payload.costCurrency, payload.retailCurrency, payload.wholesaleCurrency],
    ['UZS', 'UZS', 'UZS'],
  );
  assert.equal(payload.wholesalePrice, 9000);
});

test('bo\'sh narx rejimdan qat\'i nazar yuborilmaydi', () => {
  assert.equal(narxYigish({ ...qoralama, costPrice: '', retailPrice: '', wholesalePrice: '' }, 'USD'), undefined);
});

test('tahrirda forma bir valyutali rejimda rejim valyutasidan boshlanadi, ikki valyutada saqlangan valyutadan', () => {
  const saqlangan = { costCurrency: 'USD', retailCurrency: 'UZS', wholesaleCurrency: 'USD' };
  assert.deepEqual(narxQoralamaValyutalari(saqlangan, 'UZS'), { costCurrency: 'UZS', retailCurrency: 'UZS', wholesaleCurrency: 'UZS' });
  assert.deepEqual(narxQoralamaValyutalari(saqlangan, 'USD'), { costCurrency: 'USD', retailCurrency: 'USD', wholesaleCurrency: 'USD' });
  assert.deepEqual(narxQoralamaValyutalari(saqlangan, null), saqlangan);
  assert.deepEqual(narxQoralamaValyutalari(null, 'USD'), { costCurrency: 'USD', retailCurrency: 'USD', wholesaleCurrency: 'USD' });
});

test('boshqa valyutada saqlangan narx faqat bir valyutali rejimda ogohlantiriladi', () => {
  assert.equal(rejimgaMosEmasNarx({ currency: 'UZS' }, 'USD'), true);
  assert.equal(rejimgaMosEmasNarx({ costCurrency: 'USD', retailCurrency: 'USD', wholesaleCurrency: 'USD' }, 'USD'), false);
  assert.equal(rejimgaMosEmasNarx({ costCurrency: 'USD', retailCurrency: 'UZS' }, 'UZS'), true);
  assert.equal(rejimgaMosEmasNarx({ currency: 'USD' }, null), false);
  assert.equal(rejimgaMosEmasNarx(null, 'USD'), false);
});

test("tahrirda boshqa valyutadagi narx raqamlari o'zgarmagan bo'lsa narx yuborilmaydi (9 000 so'm $9 000 bo'lib qolmaydi)", () => {
  const saqlangan = { costPrice: 7000, retailPrice: 9000, wholesalePrice: null, currency: 'UZS' };
  const qoralama = { costPrice: '7000', costCurrency: 'USD', retailPrice: '9000', retailCurrency: 'USD', wholesalePrice: '', wholesaleCurrency: 'USD' };
  assert.equal(ozgarmaganBoshqaValyutaNarx(qoralama, saqlangan, 'USD'), true);
  assert.equal(yuboriladiganNarx(qoralama, saqlangan, 'USD'), undefined);
  // Narx o'zgartirilsa — rejim valyutasida yuboriladi.
  const yangi = yuboriladiganNarx({ ...qoralama, retailPrice: '0.75' }, saqlangan, 'USD');
  assert.equal(yangi.retailPrice, 0.75);
  assert.equal(yangi.retailCurrency, 'USD');
  // Saqlangan narx rejim valyutasida bo'lsa yoki ikki valyuta rejimi — avvalgidek har doim yuboriladi.
  assert.deepEqual(yuboriladiganNarx(qoralama, { ...saqlangan, currency: 'USD' }, 'USD'), narxYigish(qoralama, 'USD'));
  const dual = { ...qoralama, costCurrency: 'UZS', retailCurrency: 'UZS', wholesaleCurrency: 'UZS' };
  assert.deepEqual(yuboriladiganNarx(dual, saqlangan, null), narxYigish(dual));
  // Variant oynasi (raqamlar son ko'rinishida).
  assert.equal(ozgarmaganBoshqaValyutaNarx({ costPrice: 0.5, retailPrice: 3.5, wholesalePrice: 3.5 }, { costPrice: '0.5', retailPrice: '3.5', wholesalePrice: '3.5', currency: 'USD' }, 'UZS'), true);
  assert.equal(ozgarmaganBoshqaValyutaNarx({ costPrice: 0.5, retailPrice: 4, wholesalePrice: 3.5 }, { costPrice: '0.5', retailPrice: '3.5', wholesalePrice: '3.5', currency: 'USD' }, 'UZS'), false);
});

test('kalkulyatsiya: bir valyutali rejimda boshqa valyutadagi qator yuborilmaydi, ikki valyutada avvalgidek', () => {
  const forma = { modificationId: 'p', recipeId: '', validFrom: '', normalScrapPercent: '', note: '', lines: [
    { modificationId: 'm1', quantity: '2', price: '10', currency: 'USD', costingRate: '12000' },
  ] };
  assert.deepEqual(kalkulyatsiyaTanasiniYigish(forma, 'UZS'), { xato: 'errors.lineCurrencyMode', maydon: 'lines.0.currency' });
  assert.ok('tana' in kalkulyatsiyaTanasiniYigish(forma, 'USD'));
  assert.deepEqual(kalkulyatsiyaTanasiniYigish(forma, null), kalkulyatsiyaTanasiniYigish(forma));
  const somda = { ...forma, lines: [{ ...forma.lines[0], currency: 'UZS', costingRate: '' }] };
  assert.equal(kalkulyatsiyaTanasiniYigish(somda, 'USD').maydon, 'lines.0.currency');
  assert.ok('tana' in kalkulyatsiyaTanasiniYigish(somda, 'UZS'));
});
