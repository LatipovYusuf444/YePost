import test from 'node:test';
import assert from 'node:assert/strict';
import { narxValyutalari } from '../src/lib/narxValyutasi.ts';
import { narxYigish, narxQoralamaValyutalari, ustamaHisoblashMumkin } from '../src/Pages/Mahsulotlar/narxValyutaYuklama.ts';

test('each price keeps its own currency: cost in dollars, retail in so‘m, wholesale in dollars', () => {
  assert.deepEqual(
    narxValyutalari({ currency: 'UZS', costCurrency: 'USD', retailCurrency: 'UZS', wholesaleCurrency: 'USD' }),
    { cost: 'USD', retail: 'UZS', wholesale: 'USD' },
  );
});

test('the legacy single currency still applies to every price when the new fields are absent', () => {
  assert.deepEqual(narxValyutalari({ currency: 'USD' }), { cost: 'USD', retail: 'USD', wholesale: 'USD' });
  assert.deepEqual(narxValyutalari({ currency: 'usd' }), { cost: 'USD', retail: 'USD', wholesale: 'USD' });
});

test('the new fields win over the legacy currency, which now only describes the retail price', () => {
  assert.deepEqual(narxValyutalari({ currency: 'UZS', retailCurrency: 'USD' }), { cost: 'UZS', retail: 'USD', wholesale: 'UZS' });
  assert.deepEqual(narxValyutalari({ currency: 'USD', costCurrency: 'UZS', retailCurrency: 'USD', wholesaleCurrency: 'UZS' }), { cost: 'UZS', retail: 'USD', wholesale: 'UZS' });
});

test('a price without any currency is so‘m, unknown codes never become dollars', () => {
  assert.deepEqual(narxValyutalari(), { cost: 'UZS', retail: 'UZS', wholesale: 'UZS' });
  assert.deepEqual(narxValyutalari(null), { cost: 'UZS', retail: 'UZS', wholesale: 'UZS' });
  assert.deepEqual(narxValyutalari({ currency: 'EUR', costCurrency: null }), { cost: 'UZS', retail: 'UZS', wholesale: 'UZS' });
});

const qoralama = {
  costPrice: '0.48', costCurrency: 'USD',
  retailPrice: '9000', retailCurrency: 'UZS',
  wholesalePrice: '0.6', wholesaleCurrency: 'USD',
};

test('the product form sends cost, retail and wholesale currencies separately, never the legacy currency', () => {
  const payload = narxYigish(qoralama);
  assert.deepEqual(payload, {
    costPrice: 0.48, costCurrency: 'USD',
    retailPrice: 9000, retailCurrency: 'UZS',
    wholesalePrice: 0.6, wholesaleCurrency: 'USD',
  });
  assert.equal('currency' in payload, false);
});

test('a copied wholesale price takes the currency of the retail price it was copied from', () => {
  const payload = narxYigish({ ...qoralama, wholesalePrice: '', wholesaleCurrency: 'USD' });
  assert.equal(payload.wholesalePrice, 9000);
  assert.equal(payload.wholesaleCurrency, 'UZS');
});

test('no price fields means no price is sent at all', () => {
  assert.equal(narxYigish({ ...qoralama, costPrice: '', retailPrice: '', wholesalePrice: '' }), undefined);
  assert.equal(narxYigish(undefined), undefined);
});

test('editing starts from the saved currency of each price', () => {
  assert.deepEqual(narxQoralamaValyutalari({ costCurrency: 'USD', retailCurrency: 'UZS', wholesaleCurrency: 'USD' }), { costCurrency: 'USD', retailCurrency: 'UZS', wholesaleCurrency: 'USD' });
  assert.deepEqual(narxQoralamaValyutalari({ currency: 'USD' }), { costCurrency: 'USD', retailCurrency: 'USD', wholesaleCurrency: 'USD' });
});

test('markup is only derived from cost and retail when they share a currency', () => {
  assert.equal(ustamaHisoblashMumkin({ costCurrency: 'UZS', retailCurrency: 'UZS' }), true);
  assert.equal(ustamaHisoblashMumkin({ costCurrency: 'USD', retailCurrency: 'USD' }), true);
  assert.equal(ustamaHisoblashMumkin({ costCurrency: 'USD', retailCurrency: 'UZS' }), false);
});
