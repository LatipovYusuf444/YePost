import test from 'node:test';
import assert from 'node:assert/strict';
import { modalYuklagichYaratish } from '../src/lib/modalYuklash.ts';

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
function setup() {
  const events = [];
  const loader = modalYuklagichYaratish({
    boshlash: () => events.push('loading'),
    natija: value => events.push(value),
    xato: error => events.push(error.message),
    yakun: () => events.push('done'),
  });
  return { events, loader };
}
test('modal yuklanish holati server javobini kutmasdan boshlanadi', async () => {
  const { loader, events } = setup();
  const response = deferred();
  const work = loader.yuklash(() => response.promise);
  assert.deepEqual(events, ['loading']);
  response.resolve({ id: 'sale-a' });
  assert.deepEqual(await work, { id: 'sale-a' });
  assert.deepEqual(events, ['loading', { id: 'sale-a' }, 'done']);
});
test('tez ketma-ket bosilgan ikki qatordan oxirgisi ochiladi', async () => {
  const { loader, events } = setup();
  const first = deferred();
  const second = deferred();
  const a = loader.yuklash(() => first.promise);
  const b = loader.yuklash(() => second.promise);
  second.resolve('sale-b');
  await b;
  first.resolve('sale-a');
  assert.equal(await a, null);
  assert.deepEqual(events, ['loading', 'loading', 'sale-b', 'done']);
});
test('yopilgan yoki unmount qilingan oyna kech kelgan javob bilan ochilmaydi', async () => {
  const { loader, events } = setup();
  const response = deferred();
  const work = loader.yuklash(() => response.promise);
  loader.bekorQilish();
  response.resolve('old');
  assert.equal(await work, null);
  assert.deepEqual(events, ['loading']);
});
test('faol so‘rov xatosi ko‘rsatiladi, eski so‘rov xatosi yangi oynaga tegmaydi', async () => {
  const { loader, events } = setup();
  const first = deferred();
  const a = loader.yuklash(() => first.promise);
  await loader.yuklash(async () => { throw new Error('current error'); });
  first.reject(new Error('stale error'));
  await a;
  assert.deepEqual(events, ['loading', 'loading', 'current error', 'done']);
});
