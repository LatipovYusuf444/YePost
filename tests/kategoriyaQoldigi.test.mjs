import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { calls, handlers, reset } from './helpers/savdoYuklashClient.mjs';

const src = new URL('../src/', import.meta.url);
const fixture = new URL('./helpers/savdoYuklashClient.mjs', import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.startsWith(src.href)) {
      if (['./axios', './sozlamalarApi'].includes(specifier)) return { url: fixture, shortCircuit: true };
      if (specifier.startsWith('.') && !specifier.endsWith('.ts')) return { url: new URL(specifier + '.ts', context.parentURL).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
const { kategoriyaQoldiginiOlish } = await import('../src/api/kategoriyaQoldigiApi.ts');
const { kategoriyaQatorlari, kategoriyaMiqdorJamilari } = await import('../src/lib/kategoriyaQoldigi.ts');
const products = [
  { id: 'food', name: 'Un', categoryId: 'food-category', unitId: 'kg', isActive: true },
  { id: 'empty', name: 'Guruch', categoryId: 'food-category', unitId: 'kg', isActive: false },
  { id: 'drink', name: 'Cola', categoryId: 'drinks', unitId: 'piece', isActive: true },
];
const units = [{ id: 'kg', name: 'Kilogramm', shortName: 'kg' }];

test('category request includes every warehouse, all balances and every report page', async () => {
  reset();
  let active = 0, peak = 0;
  handlers.set('/reports/stock-balance', async config => {
    peak = Math.max(peak, ++active);
    await Promise.resolve();
    active--;
    return { items: [{ productId: `p-${config.params.page}` }], totalPages: 32 };
  });
  const [first, second] = await Promise.all([kategoriyaQoldiginiOlish('food-category'), kategoriyaQoldiginiOlish('food-category')]);
  assert.equal(first.length, 32, 'no arbitrary page cap');
  assert.deepEqual(second, first);
  assert.equal(calls.length, 32, 'concurrent consumers share in-flight requests');
  assert.equal(peak, 1, 'pagination does not flood the server');
  for (const call of calls) {
    assert.equal(call.config.params.categoryIds, 'food-category');
    assert.equal(call.config.params.warehouseIds, undefined);
    assert.equal(call.config.params.groupByWarehouse, true);
    assert.equal(call.config.params.balanceStatus, 'ALL');
    assert.equal(call.config.params.includeReserved, true);
    assert.equal(call.config.params.priceType, 'RETAIL');
  }
  await kategoriyaQoldiginiOlish('food-category');
  assert.equal(calls.length, 64, 'reopening refreshes current stock');
});

test('a failed later page rejects the result and retry reloads from page one', async () => {
  reset();
  let failing = true;
  handlers.set('/reports/stock-balance', config => {
    if (config.params.page === 2 && failing) throw new Error('temporary failure');
    return { items: [{ productId: `p-${config.params.page}` }], totalPages: 2 };
  });
  await assert.rejects(kategoriyaQoldiginiOlish('retry-category'), /temporary failure/);
  failing = false;
  assert.equal((await kategoriyaQoldiginiOlish('retry-category')).length, 2);
  assert.deepEqual(calls.map(call => call.config.params.page), [1, 2, 1, 2]);
});

test('rows retain separate warehouses and variants, exclude other categories and include products without stock', () => {
  const stocks = [
    { productId: 'food', modificationId: 'plain', warehouseId: 'w1', warehouseName: 'Asosiy', quantity: '10', reservedQuantity: '3' },
    { productId: 'food', modificationId: 'plain', warehouseId: 'w2', warehouseName: 'Filial', quantity: '5', reservedQuantity: '0', availableQuantity: '4' },
    { productId: 'food', modificationId: 'premium', warehouseId: 'w1', warehouseName: 'Asosiy', quantity: 0, reservedQuantity: 0 },
    { productId: 'drink', categoryId: 'drinks', modificationId: 'cola', warehouseId: 'w1', quantity: 99 },
  ];
  const rows = kategoriyaQatorlari('food-category', products, stocks, units);
  assert.equal(rows.length, 4);
  assert.equal(new Set(rows.map(row => row.kalit)).size, 4);
  assert.equal(rows.filter(row => row.mahsulotId === 'drink').length, 0);
  assert.equal(rows.find(row => row.omborId === 'w2').mavjud, 4, 'backend available value wins');
  assert.equal(rows.find(row => row.qoldiq === 10).mavjud, 7);
  assert.equal(rows.find(row => row.mahsulotId === 'empty').qoldiq, null, 'no invented stock record');
  assert.equal(rows.find(row => row.mahsulotId === 'empty').nofaol, true);
  assert.equal(rows.find(row => row.qoldiq === 0).mavjud, 0);
  assert.equal(rows.find(row => row.qoldiq === 10).birlik, 'kg');
});

test('quantities remain separate for different units, invalid values are not replaced with zero', () => {
  const rows = kategoriyaQatorlari('food-category', products, [
    { productId: 'food', modificationId: 'm', warehouseId: 'w1', quantity: '2.5', reservedQuantity: 0, unitName: 'kg' },
    { productId: 'new-product', categoryId: 'food-category', modificationId: 'm2', warehouseId: 'w1', productName: 'Non', quantity: 4, reservedQuantity: 1, unitName: 'dona' },
    { productId: 'bad', categoryId: 'food-category', modificationId: 'bad', warehouseId: 'w1', quantity: 'bad', reservedQuantity: 0, unitName: 'kg' },
  ], units);
  assert.equal(rows.find(row => row.mahsulotId === 'bad').qoldiq, null);
  assert.equal(rows.find(row => row.mahsulotId === 'bad').mavjud, null);
  assert.deepEqual(kategoriyaMiqdorJamilari(rows).sort((a, b) => a.birlik.localeCompare(b.birlik)), [
    { birlik: 'dona', mavjud: 3 }, { birlik: 'kg', mavjud: 2.5 },
  ]);
});
