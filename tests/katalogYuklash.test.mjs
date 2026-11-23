import test from 'node:test';
import assert from 'node:assert/strict';
import { katalogQidiruvYuklagich, KATALOG_YANGI_MUDDATI, KATALOG_ENG_KOP_ESKILIK } from '../src/api/catalogSearch.ts';

const tick = () => new Promise(resolve => setImmediate(resolve));

test('7-page catalogue loads in parallel batches, keeps page order and repeated consumers reuse the completed result', async () => {
  const calls = [];
  let active = 0;
  let peak = 0;
  const loader = katalogQidiruvYuklagich(async (q, page) => {
    calls.push([q, page]);
    peak = Math.max(peak, ++active);
    await new Promise(resolve => setImmediate(resolve));
    --active;
    return { items: [{ id: String(page) }], totalPages: 7 };
  });
  const [first, concurrent] = await Promise.all([loader.olish(), loader.olish()]);
  const reopened = await loader.olish();
  assert.equal(first.length, 7);
  assert.deepEqual(concurrent, first);
  assert.deepEqual(reopened, first);
  assert.equal(reopened, first, 'same array: consumers can skip re-processing an unchanged catalogue');
  assert.deepEqual(calls.map(x => x[1]), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(first.map(item => item.id), ['1', '2', '3', '4', '5', '6', '7']);
  assert.equal(peak, 5, 'server gets at most 5 pages at once');
});

test('within the fresh window the cache is reused; explicit refresh reloads prices and concurrent refreshes share one request', async () => {
  let now = 0;
  let price = 117.65;
  let calls = 0;
  const loader = katalogQidiruvYuklagich(async () => {
    calls++;
    return { items: [{ price }], totalPages: 1 };
  }, () => now);
  await loader.olish();
  price = 120;
  now = KATALOG_YANGI_MUDDATI - 1;
  assert.equal((await loader.olish())[0].price, 117.65);
  assert.equal(calls, 1);
  await Promise.all([loader.olish('', true), loader.olish('', true)]);
  assert.equal(calls, 2);
  assert.equal((await loader.olish())[0].price, 120);
});

test('stale full catalogue is returned instantly, refreshed once in the background, and subscribers hear about the new copy', async () => {
  let now = 0;
  let price = 100;
  let calls = 0;
  const loader = katalogQidiruvYuklagich(async () => {
    calls++;
    await tick();
    return { items: [{ price }], totalPages: 1 };
  }, () => now);
  const heard = [];
  const unsubscribe = loader.obuna(q => heard.push(q));
  await loader.olish();
  assert.deepEqual(heard, [], 'first load is not a replacement');
  price = 120;
  now = KATALOG_YANGI_MUDDATI + 1;
  const [a, b] = await Promise.all([loader.olish(), loader.olish()]);
  assert.equal(a[0].price, 100, 'old copy is served without waiting');
  assert.equal(b[0].price, 100);
  assert.equal(calls, 2, 'one background refresh for concurrent callers');
  await tick(); await tick();
  assert.deepEqual(heard, ['']);
  assert.equal((await loader.olish())[0].price, 120);
  assert.equal(calls, 2);
  unsubscribe();
  now += KATALOG_YANGI_MUDDATI + 1;
  await loader.olish();
  await tick(); await tick();
  assert.deepEqual(heard, [''], 'unsubscribed listener is not called');
});

test('a copy older than the maximum staleness is never shown: the caller waits for fresh data', async () => {
  let now = 0;
  let price = 100;
  const loader = katalogQidiruvYuklagich(async () => ({ items: [{ price }], totalPages: 1 }), () => now);
  await loader.olish();
  price = 120;
  now = KATALOG_ENG_KOP_ESKILIK + 1;
  assert.equal((await loader.olish())[0].price, 120);
});

test('short searches (barcode/name) are not served stale', async () => {
  let now = 0;
  let price = 100;
  const loader = katalogQidiruvYuklagich(async () => ({ items: [{ price }], totalPages: 1 }), () => now);
  await loader.olish('478');
  price = 120;
  now = KATALOG_YANGI_MUDDATI + 1;
  assert.equal((await loader.olish('478'))[0].price, 120);
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

test('a failed background refresh keeps the previous complete copy', async () => {
  let now = 0;
  let fail = false;
  const loader = katalogQidiruvYuklagich(async () => {
    if (fail) throw new Error('offline');
    return { items: [{ price: 100 }], totalPages: 1 };
  }, () => now);
  await loader.olish();
  fail = true;
  now = KATALOG_YANGI_MUDDATI + 1;
  assert.equal((await loader.olish())[0].price, 100);
  await tick(); await tick();
  assert.equal((await loader.olish())[0].price, 100);
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

test('a hard clear during a background refresh drops the old result and never notifies subscribers with it', async () => {
  let now = 0;
  let complete;
  let calls = 0;
  const loader = katalogQidiruvYuklagich(async () => {
    calls++;
    if (calls === 2) return new Promise(resolve => { complete = resolve; });
    return { items: [{ price: calls === 1 ? 100 : 130 }], totalPages: 1 };
  }, () => now);
  const heard = [];
  loader.obuna(q => heard.push(q));
  await loader.olish();
  now = KATALOG_YANGI_MUDDATI + 1;
  await loader.olish();
  loader.tozalash();
  complete({ items: [{ price: 117 }], totalPages: 1 });
  await tick(); await tick();
  assert.deepEqual(heard, []);
  assert.equal((await loader.olish())[0].price, 130);
});

test('soft invalidation keeps serving the copy and refreshes it in the background', async () => {
  let now = 0;
  let price = 100;
  let calls = 0;
  const loader = katalogQidiruvYuklagich(async () => { calls++; return { items: [{ price }], totalPages: 1 }; }, () => now);
  await loader.olish();
  price = 120;
  loader.eskirtirish();
  assert.equal((await loader.olish())[0].price, 100);
  assert.equal(calls, 2);
  await tick();
  assert.equal((await loader.olish())[0].price, 120);
});

test('background refreshes and prewarming are marked so their errors do not pop up toasts; awaited loads are not', async () => {
  let now = 0;
  const fonlar = [];
  const loader = katalogQidiruvYuklagich(async (q, page, fon) => { fonlar.push(fon); return { items: [{ id: 1 }], totalPages: 1 }; }, () => now);
  await loader.olish();
  now = KATALOG_YANGI_MUDDATI + 1;
  await loader.olish();
  await tick();
  loader.tozalash();
  await loader.olish('', false, true);
  assert.deepEqual(fonlar, [false, true, true]);
});

test('a user-awaited load that joins a quiet (prewarm) request shows its error once; a quiet-only failure stays silent', async () => {
  const korsatilgan = [];
  let fail = true;
  let rad;
  const loader = katalogQidiruvYuklagich(() => new Promise((resolve, reject) => { rad = reject; }), Date.now, error => korsatilgan.push(error.message));
  const isitish = loader.olish('', false, true);
  const kutgan1 = loader.olish();
  const kutgan2 = loader.olish();
  rad(new Error('server 500'));
  await assert.rejects(isitish, /500/);
  await assert.rejects(kutgan1, /500/);
  await assert.rejects(kutgan2, /500/);
  await tick();
  assert.deepEqual(korsatilgan, ['server 500'], 'exactly one toast for the joined request');
  const jim = loader.olish('', false, true);
  rad(new Error('offline'));
  await assert.rejects(jim, /offline/);
  await tick();
  assert.deepEqual(korsatilgan, ['server 500'], 'nobody waited: no toast');
  fail = false;
  assert.equal(fail, false);
});
