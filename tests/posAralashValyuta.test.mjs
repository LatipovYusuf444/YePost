import test from 'node:test';
import assert from 'node:assert/strict';
import { qoldiqNarxi, dollarMalumoti } from '../src/Components/layout/posMahsulotlari.ts';
import { dollarNarxi, sotuvQatori, narxTuriKodi } from '../src/Pages/BoshSahifa/aralashTolov.ts';
import { katalogNarxiniQoldiqqaMoslash } from '../src/api/catalogSearch.ts';

const KURS = '11910';

function mahsulot(narx) {
  const { modificationPrice, ...qolgan } = katalogNarxiniQoldiqqaMoslash(narx);
  return { modificationId: 'm1', quantity: 5, ...qolgan, modification: { id: 'm1', price: modificationPrice } };
}

test('retail in so‘m and wholesale in so‘m: no dollar metadata, prices unchanged', () => {
  const item = mahsulot({ retailPrice: '9000', wholesalePrice: '8000', retailCurrency: 'UZS', wholesaleCurrency: 'UZS' });
  assert.equal(item.valyuta, undefined);
  assert.equal(qoldiqNarxi(item, 'chakana'), 9000);
  assert.equal(qoldiqNarxi(item, 'ulgurji'), 8000);
  assert.deepEqual(dollarMalumoti(item), {});
});

test('retail in dollars and wholesale in dollars behaves exactly like the previous single-currency USD product', () => {
  const item = mahsulot({ retailPrice: '10', wholesalePrice: '8', retailCurrency: 'USD', wholesaleCurrency: 'USD', rate: KURS, retailPriceUzs: '119100', wholesalePriceUzs: '95280' });
  assert.equal(qoldiqNarxi(item, 'chakana'), 119100);
  assert.equal(qoldiqNarxi(item, 'ulgurji'), 95280);
  assert.deepEqual(dollarMalumoti(item), { valyuta: 'USD', aslNarx: 10, aslUlgurjiNarx: 8, kurs: 11910 });
});

test('retail in so‘m and wholesale in dollars: retail line stays in so‘m, wholesale line is sent in dollars', () => {
  const item = mahsulot({ retailPrice: '9000', wholesalePrice: '0.6', retailCurrency: 'UZS', wholesaleCurrency: 'USD', rate: KURS, retailPriceUzs: '9000', wholesalePriceUzs: '7146' });
  assert.equal(qoldiqNarxi(item, 'chakana'), 9000);
  assert.equal(qoldiqNarxi(item, 'ulgurji'), 7146);
  const cart = dollarMalumoti(item);
  assert.deepEqual(cart, { valyuta: 'USD', aslNarx: 0, aslUlgurjiNarx: 0.6, kurs: 11910 });
  assert.equal(dollarNarxi(cart, 'chakana'), null);
  assert.deepEqual(dollarNarxi(cart, 'ulgurji'), { narx: 0.6, kurs: 11910 });
  assert.deepEqual(
    sotuvQatori({ modificationId: 'm1', quantity: 2, price: 9000, discount: 0, dollar: dollarNarxi(cart, 'chakana'), priceType: 'RETAIL' }),
    { modificationId: 'm1', quantity: 2, price: 9000, discount: 0, priceType: 'RETAIL' },
  );
  assert.deepEqual(
    sotuvQatori({ modificationId: 'm1', quantity: 2, price: 7146, discount: 0, dollar: dollarNarxi(cart, 'ulgurji'), priceType: 'WHOLESALE' }),
    { modificationId: 'm1', quantity: 2, price: 0.6, discount: 0, currency: 'USD', priceType: 'WHOLESALE' },
  );
});

test('retail in dollars and wholesale in so‘m: wholesale must not be sent as dollars', () => {
  const item = mahsulot({ retailPrice: '10', wholesalePrice: '95000', retailCurrency: 'USD', wholesaleCurrency: 'UZS', rate: KURS, retailPriceUzs: '119100', wholesalePriceUzs: '95000' });
  assert.equal(qoldiqNarxi(item, 'chakana'), 119100);
  assert.equal(qoldiqNarxi(item, 'ulgurji'), 95000);
  const cart = dollarMalumoti(item);
  assert.equal(cart.aslNarx, 10);
  assert.equal(cart.aslUlgurjiNarx, 0);
  assert.deepEqual(dollarNarxi(cart, 'chakana'), { narx: 10, kurs: 11910 });
  assert.equal(dollarNarxi(cart, 'ulgurji'), null);
});

test('retail in dollars without any wholesale price still falls back to the dollar retail line', () => {
  const item = mahsulot({ retailPrice: '10', retailCurrency: 'USD', wholesaleCurrency: 'USD', rate: KURS, retailPriceUzs: '119100' });
  assert.equal(qoldiqNarxi(item, 'ulgurji'), 119100);
  const cart = dollarMalumoti(item);
  assert.deepEqual(dollarNarxi(cart, 'ulgurji'), { narx: 10, kurs: 11910 });
});

test('a dollar wholesale price without an exchange rate cannot be sold, nor silently replaced by the retail price', () => {
  const item = mahsulot({ retailPrice: '9000', wholesalePrice: '0.6', retailCurrency: 'UZS', wholesaleCurrency: 'USD' });
  assert.equal(qoldiqNarxi(item, 'chakana'), 9000);
  assert.equal(qoldiqNarxi(item, 'ulgurji'), 0);
  assert.deepEqual(dollarMalumoti(item), {});
});

test('a legacy single USD currency on the price keeps both prices in dollars', () => {
  const item = mahsulot({ retailPrice: '10', wholesalePrice: '8', currency: 'USD', rate: KURS, retailPriceUzs: '119100', wholesalePriceUzs: '95280' });
  assert.equal(item.valyuta.currency, 'USD');
  assert.equal(item.valyuta.ulgurjiCurrency, 'USD');
  assert.equal(qoldiqNarxi(item, 'ulgurji'), 95280);
});

test('cart lines persisted before this change keep selecting the same dollar price', () => {
  const eski = { valyuta: 'USD', aslNarx: 117.65, aslUlgurjiNarx: 115, kurs: 11780 };
  assert.deepEqual(dollarNarxi(eski, 'chakana'), { narx: 117.65, kurs: 11780 });
  assert.deepEqual(dollarNarxi(eski, 'ulgurji'), { narx: 115, kurs: 11780 });
  assert.deepEqual(dollarNarxi({ ...eski, aslUlgurjiNarx: 0 }, 'ulgurji'), { narx: 117.65, kurs: 11780 });
});

test('the sale line carries the price type only when one is chosen', () => {
  assert.equal(narxTuriKodi('chakana'), 'RETAIL');
  assert.equal(narxTuriKodi('ulgurji'), 'WHOLESALE');
  assert.deepEqual(sotuvQatori({ modificationId: 'a', quantity: 1, price: 10, discount: 0, dollar: null }), { modificationId: 'a', quantity: 1, price: 10, discount: 0 });
});
