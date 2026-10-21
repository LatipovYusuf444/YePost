import test from 'node:test';
import assert from 'node:assert/strict';
import { qoldiqBirlashtirish, qoldiqNarxi, dollarMalumoti } from '../src/Components/layout/posMahsulotlari.ts';
import { dollarNarxi, sotuvQatori } from '../src/Pages/BoshSahifa/aralashTolov.ts';
import { katalogQidiruvQatoriniMoslash, katalogNarxiniQoldiqqaMoslash } from '../src/api/catalogSearch.ts';

const usd = {
  modificationId: 'qqqq', quantity: 0,
  valyuta: { currency: 'USD', asl: 117.65, ulgurjiAsl: 115, kurs: 11780, uzs: 1385917, ulgurjiUzs: 1354700 },
  modification: { id: 'qqqq', product: { id: 'product', name: 'QQQQ' }, price: { retailPrice: 1385917, wholesalePrice: 1354700 } },
};
const stock = { modificationId: 'qqqq', quantity: 100, valyuta: undefined, modification: { id: 'qqqq', price: { retailPrice: 117.65, wholesalePrice: 115 } } };

test('stock merge preserves USD metadata rather than treating $117.65 as 117.65 UZS', () => {
  const item = qoldiqBirlashtirish([stock], [usd])[0];
  assert.equal(qoldiqNarxi(item, 'chakana'), 1385917);
  assert.equal(qoldiqNarxi(item, 'ulgurji'), 1354700);
  assert.deepEqual(dollarMalumoti(item), { valyuta: 'USD', aslNarx: 117.65, aslUlgurjiNarx: 115, kurs: 11780 });
});

test('a USD item without a rate cannot fall through to a raw positive USD price as UZS', () => {
  const item = { ...stock, valyuta: { ...usd.valyuta, kurs: null, uzs: null, ulgurjiUzs: null } };
  assert.equal(qoldiqNarxi(item, 'chakana'), 0);
  assert.equal(qoldiqNarxi(item, 'ulgurji'), 0);
  assert.deepEqual(dollarMalumoti(item), {});
});

test('USD cart metadata produces the original dollar price in the outgoing sale line', () => {
  const item = qoldiqBirlashtirish([stock], [usd])[0];
  const cart = dollarMalumoti(item);
  const line = sotuvQatori({ modificationId: 'qqqq', quantity: 11, price: qoldiqNarxi(item, 'chakana'), discount: 0, dollar: dollarNarxi(cart, 'chakana') });
  assert.deepEqual(line, { modificationId: 'qqqq', quantity: 11, price: 117.65, discount: 0, currency: 'USD' });
});

test('UZS products keep their price without conversion', () => {
  assert.equal(qoldiqNarxi({ modificationId: 'uzs', price: 7500000 }, 'chakana'), 7500000);
});

test('real nested search response retains product identity, USD price and converted UZS amounts', () => {
  const raw = {
    modificationId: 'qqqq', productId: 'product', quantity: '100',
    modification: {
      id: 'qqqq', name: 'Asosiy variant', barcode: '478400557192',
      product: { id: 'product', name: 'QQQQ' },
      price: { retailPrice: '117.65', wholesalePrice: '115', currency: 'USD', rate: '11780', retailPriceUzs: '1385917', wholesalePriceUzs: '1354700' },
    },
  };
  const mod = katalogQidiruvQatoriniMoslash(raw);
  assert.equal(mod.id, 'qqqq');
  assert.equal(mod.product.name, 'QQQQ');
  assert.equal(mod.productId, 'product');
  assert.deepEqual(mod.price, raw.modification.price);
});

test('search response units carry the backend-computed unit price (korobka = 17 700 × 3 = 53 100) into the modification', () => {
  const mod = katalogQidiruvQatoriniMoslash({
    modificationId: 'm1', productId: 'p1',
    modification: { id: 'm1', name: 'Konfet', price: { retailPrice: '17700', currency: 'UZS' } },
    units: [
      { unitId: 'u-kg', name: 'kg', factor: 1, isBase: true },
      { unitId: 'u-k', name: 'korobka', factor: 3, isBase: false, canSell: true, retailPrice: null, effectiveRetailPrice: '53100', currency: 'UZS' },
    ],
  });
  assert.equal(mod.birliklar.length, 2);
  assert.equal(mod.birliklar[1].chakana, null);
  assert.equal(mod.birliklar[1].samarali.chakana, 53100);
  assert.equal(mod.birliklar[1].samarali.chakanaValyuta, 'UZS');
});

test('legacy flat catalog search response still retains its original price currency', () => {
  const flat = { id: 'flat', barcode: '123', price: { retailPrice: '10', currency: 'USD' } };
  assert.deepEqual(katalogQidiruvQatoriniMoslash(flat), flat);
  assert.equal(katalogQidiruvQatoriniMoslash({ modificationId: 'missing', modification: null }), null);
});

test('a mismatched nested variant never supplies another product price', () => {
  assert.equal(katalogQidiruvQatoriniMoslash({ modificationId: 'qqqq', modification: { id: 'different', barcode: '123', price: { retailPrice: '60' } } }), null);
});

test('unverified report prices are blocked until catalog enrichment confirms their currency', () => {
  const raw = { ...stock, narxAniq: false };
  assert.equal(qoldiqNarxi(raw, 'chakana'), 0);
  const { modificationPrice, ...prices } = katalogNarxiniQoldiqqaMoslash({ retailPrice: '117.65', wholesalePrice: '115', currency: 'USD', rate: '11780', retailPriceUzs: '1385917', wholesalePriceUzs: '1354700' });
  const enriched = { modificationId: 'qqqq', ...prices, modification: { id: 'qqqq', price: modificationPrice } };
  const merged = qoldiqBirlashtirish([raw], [enriched])[0];
  assert.equal(qoldiqNarxi(merged, 'chakana'), 1385917);
  assert.equal(qoldiqNarxi(merged, 'ulgurji'), 1354700);
  assert.equal(dollarMalumoti(merged).aslNarx, 117.65);
});

test('USD detail fallback without conversion fields remains blocked, not mislabelled as UZS', () => {
  const { modificationPrice, ...prices } = katalogNarxiniQoldiqqaMoslash({ retailPrice: '117.65', wholesalePrice: '115', currency: 'USD' });
  const item = { modificationId: 'qqqq', ...prices, modification: { id: 'qqqq', price: modificationPrice } };
  assert.equal(qoldiqNarxi(item, 'chakana'), 0);
  assert.equal(item.valyuta.currency, 'USD');
  assert.equal(item.valyuta.asl, 117.65);
  assert.deepEqual(dollarMalumoti(item), {});
});
