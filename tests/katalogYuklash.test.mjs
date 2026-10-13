import test from 'node:test';
import assert from 'node:assert/strict';
import { katalogQidiruvYuklagich } from '../src/api/catalogSearch.ts';

test('7-page catalogue loads sequentially and repeated consumers reuse the completed result', async () => {
  const calls = [];
  let active = 0;
  let peak = 0;
  const loader = katalogQidiruvYuklagich(async (q, page) => {
    calls.push([q, page]);
    peak = Math.max(peak, ++active);
    await Promise.resolve();
    --active;
    return { items: [{ id: String(page) }], totalPages: 7 };
  });
  const [first, concurrent] = await Promise.all([loader.olish(), loader.olish()]);
  const reopened = await loader.olish();
  assert.equal(first.length, 7);
  assert.deepEqual(concurrent, first);
  assert.deepEqual(reopened, first);
  assert.deepEqual(calls.map(x => x[1]), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(peak, 1);
});

test('expiry and explicit refresh reload prices, while concurrent refreshes share one request', async () => {
  let now = 0;
  let price = 117.65;
  let calls = 0;
  const loader = katalogQidiruvYuklagich(async () => {
    calls++;
    return { items: [{ price }], totalPages: 1 };
  }, () => now);
  await loader.olish();
  price = 120;
  assert.equal((await loader.olish())[0].price, 117.65);
  await Promise.all([loader.olish('', true), loader.olish('', true)]);
  assert.equal(calls, 2);
  assert.equal((await loader.olish())[0].price, 120);
  now = 30_001;
  await loader.olish();
  assert.equal(calls, 3);
});

test('different search terms are independent and failed pagination is never cached as complete', async () => {
  const calls = [];
  let fail = true;
  const loader = katalogQidiruvYuklagich(async (q, page) => {
    calls.push([q, page]);
    if (page === 2 && fail) throw new Error('page failed');
    return { items: [{ id: q + page }], totalPages: q === 'barcode' ? 1 : 2 };
  });
  await assert.rejects(loader.olish(), /page failed/);
  await loader.olish('barcode');
  fail = false;
  assert.equal((await loader.olish()).length, 2);
  assert.deepEqual(calls, [['', 1], ['', 2], ['barcode', 1], ['', 1], ['', 2]]);
});

test('a mutation or session change invalidates both cached and in-flight older results', async () => {
  let complete;
  let calls = 0;
  const loader = katalogQidiruvYuklagich(async () => {
    calls++;
    if (calls === 1) return new Promise(resolve => { complete = resolve; });
    return { items: [{ price: 120 }], totalPages: 1 };
  });
  const old = loader.olish();
  loader.tozalash();
  await loader.olish();
  complete({ items: [{ price: 117.65 }], totalPages: 1 });
  await old;
  assert.equal((await loader.olish())[0].price, 120);
  assert.equal(calls, 2);
});
