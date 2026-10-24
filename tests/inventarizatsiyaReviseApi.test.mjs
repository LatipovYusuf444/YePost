import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { calls, handlers, reset } from './helpers/inventoryReviseClient.mjs';
const src = new URL('../src/', import.meta.url);
const fixture = new URL('./helpers/inventoryReviseClient.mjs', import.meta.url).href;
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.startsWith(src.href)) {
    if (['./axios', './authProfileApi', './hujjatOgohlantirishi', '@/api/sozlamalarApi', '@/api/savdoApi'].includes(specifier)) return { url: fixture, shortCircuit: true };
    if (specifier.startsWith('@/')) return { url: new URL(specifier.slice(2) + '.ts', src).href, shortCircuit: true };
    if (specifier.startsWith('.') && !specifier.endsWith('.ts')) return { url: new URL(specifier + '.ts', context.parentURL).href, shortCircuit: true };
  }
  return next(specifier, context);
} });
globalThis.window ??= new EventTarget();
const { inventarizatsiyaApi } = await import('../src/api/omborApi.ts');
const { useOmborStore } = await import('../src/store/omborStore.ts');
const initial = useOmborStore.getState();
const old = { id: 'inv', docNumber: 'INV-1', status: 'CONFIRMED', warehouseId: 'w', updatedAt: '2026-10-24T07:10:00.000Z', items: [{ modificationId: 'a', systemQuantity: 0, actualQuantity: 100 }] };
const revised = { ...old, updatedAt: '2026-10-24T08:00:00.000Z', items: [{ modificationId: 'a', systemQuantity: 0, actualQuantity: 90 }] };
const payload = { expectedUpdatedAt: old.updatedAt, items: [{ modificationId: 'a', actualQuantity: 90 }] };

test('revision uses one POST /revise, returns the updated document, and sends no cancel/restore/PATCH/confirm', async () => {
  reset();
  handlers.set('POST /inventory/stock-takes/inv/revise', () => ({ data: revised }));
  const result = await inventarizatsiyaApi.tahrirlash('inv', payload);
  assert.deepEqual(result, revised);
  assert.deepEqual(calls.map(call => [call.method, call.url]), [['post', '/inventory/stock-takes/inv/revise']]);
  assert.deepEqual(calls[0].data, { ...payload, confirmWarnings: false });
});

test('revision updates the list and stock cache to 90 while retaining ID, document number and historical baseline', async () => {
  reset();
  useOmborStore.setState({ ...initial, inventarizatsiyalar: [old], omborlar: [{ id: 'w', name: 'Warehouse' }], modifikatsiyalar: [] }, true);
  handlers.set('POST /inventory/stock-takes/inv/revise', () => revised);
  handlers.set('/inventory/stock-balance', () => [{ warehouseId: 'w', modificationId: 'a', quantity: 90 }]);
  const result = await useOmborStore.getState().inventarizatsiyaTahrirlash('inv', payload);
  assert.deepEqual(result, revised);
  assert.deepEqual(useOmborStore.getState().inventarizatsiyalar[0], revised);
  assert.equal(useOmborStore.getState().qoldiqlar[0].quantity, 90);
  assert.equal(calls.filter(call => call.method === 'post').length, 1);
});

test('movement conflict leaves the original document intact and retains all movement details', async () => {
  reset();
  useOmborStore.setState({ ...initial, inventarizatsiyalar: [old] }, true);
  const movements = [{ type: 'SALE', docId: 'sale', date: '2026-10-24', quantity: -10 }];
  handlers.set('POST /inventory/stock-takes/inv/revise', () => { throw Object.assign(new Error('conflict'), { isAxiosError: true, response: { status: 409, data: { code: 'errors.inventory.movements_after_stock_take', movements } } }); });
  assert.equal(await useOmborStore.getState().inventarizatsiyaTahrirlash('inv', payload), null);
  assert.deepEqual(useOmborStore.getState().inventarizatsiyalar[0], old);
  assert.deepEqual(useOmborStore.getState().inventarizatsiyaTahrirXatosi.movements, movements);
  assert.equal(useOmborStore.getState().amalBajarilmoqda, false);
});

test('a successful revision is not reported as failed if only the stock refresh fails', async () => {
  reset();
  useOmborStore.setState({ ...initial, inventarizatsiyalar: [old] }, true);
  handlers.set('POST /inventory/stock-takes/inv/revise', () => revised);
  handlers.set('/inventory/stock-balance', () => { throw new Error('stock refresh unavailable'); });
  assert.deepEqual(await useOmborStore.getState().inventarizatsiyaTahrirlash('inv', payload), revised);
  assert.deepEqual(useOmborStore.getState().inventarizatsiyalar[0], revised);
  assert.equal(useOmborStore.getState().amalBajarilmoqda, false);
  assert.match(useOmborStore.getState().xatolik, /refresh unavailable/);
});

test('stale-version and closed-period errors never replace the existing inventory or stock', async () => {
  for (const [status, code] of [[409, 'errors.inventory.document_changed'], [423, 'errors.period.closed'], [400, 'errors.inventory.confirmed_only_revisable']]) {
    reset();
    useOmborStore.setState({ ...initial, inventarizatsiyalar: [old], qoldiqlar: [{ modificationId: 'a', quantity: 100 }] }, true);
    handlers.set('POST /inventory/stock-takes/inv/revise', () => { throw Object.assign(new Error(code), { isAxiosError: true, response: { status, data: { code } } }); });
    assert.equal(await useOmborStore.getState().inventarizatsiyaTahrirlash('inv', payload), null);
    assert.equal(useOmborStore.getState().inventarizatsiyaTahrirXatosi.code, code);
    assert.equal(useOmborStore.getState().qoldiqlar[0].quantity, 100);
    assert.deepEqual(useOmborStore.getState().inventarizatsiyalar[0], old);
    assert.equal(calls.length, 1);
  }
});
