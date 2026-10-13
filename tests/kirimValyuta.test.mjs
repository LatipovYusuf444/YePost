import test from 'node:test';
import assert from 'node:assert/strict';
import { kirimNarxiniOgirish, kirimElementiniYigish } from '../src/Pages/Ombor/kirimValyuta.ts';

test('USD catalog cost remains USD in USD view and converts to UZS exactly once', () => {
  assert.equal(kirimNarxiniOgirish(100, 'USD', 'USD', 11780), 100);
  assert.equal(kirimNarxiniOgirish(100, 'USD', 'UZS', 11780), 1178000);
  assert.equal(kirimNarxiniOgirish(1178000, 'UZS', 'USD', 11780), 100);
});

test('1000 items at $100 send a UZS unit price and total $100000, not $8.49', () => {
  const item = kirimElementiniYigish({ modificationId: 'usd-product', quantity: 1000, price: '100', currency: 'USD' }, 11780);
  assert.deepEqual(item, { modificationId: 'usd-product', quantity: 1000, price: 1178000 });
  assert.equal(item.quantity * item.price, 1178000000);
  assert.equal(kirimNarxiniOgirish(item.quantity * item.price, 'UZS', 'USD', 11780), 100000);
});

test('mixed USD and UZS rows produce one consistent UZS purchase payload', () => {
  const rows = [
    { modificationId: 'usd', quantity: 2, price: '100', currency: 'USD' },
    { modificationId: 'uzs', quantity: 3, price: '11780', currency: 'UZS' },
  ];
  const items = rows.map(row => kirimElementiniYigish(row, 11780));
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  assert.equal(total, 2391340);
  assert.equal(kirimNarxiniOgirish(total, 'UZS', 'USD', 11780), 203);
});

test('empty cost uses catalog cost in its original currency, never an unconverted backend fallback', () => {
  const item = kirimElementiniYigish({ modificationId: 'usd', quantity: 1, price: '', currency: 'USD', boshlangichTanNarx: 100 }, 11780);
  assert.equal(item.price, 1178000);
  const free = kirimElementiniYigish({ modificationId: 'usd', quantity: 1, price: '0', currency: 'USD', boshlangichTanNarx: 100 }, 11780);
  assert.equal(free.price, 0);
});

test('editing UZS display of a USD price converts back to catalog currency', () => {
  assert.equal(kirimNarxiniOgirish(2356000, 'UZS', 'USD', 11780), 200);
  assert.equal(kirimNarxiniOgirish(1385917, 'UZS', 'USD', 11780), 117.65);
});

test('conversion without a valid rate is rejected instead of relabelling the amount', () => {
  for (const rate of [null, 0, -1, NaN, Infinity]) {
    assert.throws(() => kirimNarxiniOgirish(100, 'USD', 'UZS', rate), /KURS_KERAK/);
    assert.throws(() => kirimElementiniYigish({ modificationId: 'usd', quantity: 1, price: '100', currency: 'USD' }, rate), /KURS_KERAK/);
  }
  assert.equal(kirimNarxiniOgirish(100, 'USD', 'USD', null), 100);
  assert.equal(kirimNarxiniOgirish(100, 'UZS', 'UZS', null), 100);
});

test('invalid monetary inputs cannot enter the purchase payload', () => {
  for (const price of ['NaN', 'Infinity', '-1']) {
    assert.throws(() => kirimElementiniYigish({ modificationId: 'usd', quantity: 1, price, currency: 'USD' }, 11780), /NARX_NOTOGRI/);
  }
});
