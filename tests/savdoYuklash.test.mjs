import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { calls, errors, handlers, reset } from './helpers/savdoYuklashClient.mjs';

const fixture = new URL('./helpers/savdoYuklashClient.mjs', import.meta.url).href;
const src = new URL('../src/', import.meta.url);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.startsWith(src.href)) {
      if (['./axios', './catalogApi', './sozlamalarApi', './hujjatOgohlantirishi', '@/api/sozlamalarApi', '@/api/partnersApi', '@/Pages/Savdo/savdoYordamchilari'].includes(specifier)) {
        return { url: fixture, shortCircuit: true };
      }
      if (specifier.startsWith('@/')) {
        return { url: new URL(specifier.slice(2) + '.ts', src).href, shortCircuit: true };
      }
      if (specifier.startsWith('.') && !specifier.endsWith('.ts')) {
        return { url: new URL(specifier + '.ts', context.parentURL).href, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
});
const { useSavdoStore } = await import('../src/store/savdoStore.ts');
const { omborQoldiqlariniOlish } = await import('../src/api/savdoApi.ts');
const { stockBalanceReport } = await import('../src/api/reportsApi.ts');
const initial = useSavdoStore.getState();
const count = url => calls.filter(call => call.url === url).length;

test('concurrent page mounts and customer prefetch share one initial request set', async () => {
  reset();
  useSavdoStore.setState(initial, true);
  handlers.set('/partners/customers', () => [{ id: 'customer-1', name: 'Mijoz' }]);
  await Promise.all([
    initial.boshlangichMalumotlarniYuklash(),
    initial.boshlangichMalumotlarniYuklash(),
    initial.mijozlarniOldindanYuklash(),
    initial.mijozlarniOldindanYuklash(),
  ]);
  for (const url of ['/sales', '/returns', '/organization/warehouses', '/partners/customers', '/partners/client-companies', '/accounts/users', '/reports/stock-balance', '/catalog/search']) {
    assert.equal(count(url), 1, url);
  }
  assert.equal(useSavdoStore.getState().mijozlar[0].id, 'customer-1');
  assert.equal(useSavdoStore.getState().yuklanmoqda, false);
  await initial.boshlangichMalumotlarniYuklash();
  assert.equal(count('/sales'), 2, 'explicit refresh still reloads current data');
});

test('failed initial load remains visible and a later refresh can recover', async () => {
  reset();
  useSavdoStore.setState(initial, true);
  handlers.set('/sales', () => { throw new Error('Sotuvlarni yuklab bo‘lmadi'); });
  await Promise.all([initial.boshlangichMalumotlarniYuklash(), initial.boshlangichMalumotlarniYuklash()]);
  assert.equal(count('/sales'), 1);
  assert.match(useSavdoStore.getState().xatolik, /Sotuvlarni/);
  assert.equal(useSavdoStore.getState().yuklanmoqda, false);
  handlers.delete('/sales');
  await initial.boshlangichMalumotlarniYuklash();
  assert.equal(useSavdoStore.getState().xatolik, null);
  assert.equal(count('/sales'), 2);
});

test('recovered optional stock-report failure does not produce an action-error toast', async () => {
  reset();
  handlers.set('/reports/stock-balance', () => { throw new Error('Hisobot vaqtincha ishlamadi'); });
  handlers.set('/inventory/stock-balance', () => [{ modificationId: 'm-1', quantity: 6 }]);
  const stock = await omborQoldiqlariniOlish('warehouse-1');
  assert.equal(stock[0].quantity, 6);
  assert.deepEqual(errors, []);
  assert.equal(calls.find(call => call.url === '/inventory/stock-balance').config.params.warehouseId, 'warehouse-1');
});

test('an actual stock failure and the report page itself still show errors', async () => {
  reset();
  handlers.set('/reports/stock-balance', () => { throw new Error('Hisobot ishlamadi'); });
  handlers.set('/inventory/stock-balance', () => { throw new Error('Qoldiq ishlamadi'); });
  await assert.rejects(omborQoldiqlariniOlish(), /Qoldiq ishlamadi/);
  assert.deepEqual(errors, ['Qoldiq ishlamadi']);
  await assert.rejects(stockBalanceReport({}), /Hisobot ishlamadi/);
  assert.deepEqual(errors, ['Qoldiq ishlamadi', 'Hisobot ishlamadi']);
});

test('failure on a later report page also recovers through the stock endpoint', async () => {
  reset();
  handlers.set('/reports/stock-balance', config => {
    if (config.params.page === 2) throw new Error('Ikkinchi sahifa ishlamadi');
    return { items: [], totalPages: 2 };
  });
  handlers.set('/inventory/stock-balance', () => [{ modificationId: 'm-2', quantity: 12 }]);
  const stock = await omborQoldiqlariniOlish();
  assert.equal(stock[0].quantity, 12);
  assert.equal(count('/reports/stock-balance'), 2);
  assert.deepEqual(errors, []);
});
