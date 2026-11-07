import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { calls, handlers, reset } from './helpers/savdoYuklashClient.mjs';
import { yetkazibQarzAmali, yetkazibQarzi, yetkazibQarzlari, yetkazibQarzRuxsati } from '../src/lib/yetkazibBoshlangichQarz.ts';
import { mijozTelegramHolati, mijozTelegramTuri } from '../src/lib/telegramXabarnoma.ts';

// Yetkazib beruvchi: Telegram botga ulash (mijozdagi bilan bir xil) va boshlang'ich qarz (kiritish, ro'yxat, bekor qilish, tiklash).
const fixture = new URL('./helpers/savdoYuklashClient.mjs', import.meta.url).href;
const src = new URL('../src/', import.meta.url);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.startsWith(src.href)) {
      if (['./axios', './catalogApi', './sozlamalarApi', './hujjatOgohlantirishi', '@/api/sozlamalarApi'].includes(specifier)) {
        return { url: fixture, shortCircuit: true };
      }
      if (specifier.startsWith('@/')) return { url: new URL(specifier.slice(2) + '.ts', src).href, shortCircuit: true };
      if (specifier.startsWith('.') && !specifier.endsWith('.ts')) return { url: new URL(specifier + '.ts', context.parentURL).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
globalThis.window ??= new EventTarget();
const { yetkazibBoshlangichQarzApi } = await import('../src/api/yetkazibBoshlangichQarzApi.ts');
const { telegramApi } = await import('../src/api/telegramApi.ts');

const javob = (data) => ({ success: true, statusCode: 200, data });
const qarz = { id: 'd1', docNumber: 'YQB-000001', status: 'CONFIRMED', amount: '10150', currency: 'USD', rate: '12650', date: '2026-09-01T00:00:00.000Z', note: 'Eski daftardan' };

test('opening debt response (wrapped or plain) is read: number, status, amount, currency, rate, date, note', () => {
  assert.deepEqual(yetkazibQarzi(javob(qarz)), {
    id: 'd1', docNumber: 'YQB-000001', status: 'CONFIRMED', amount: 10150, currency: 'USD', rate: 12650, date: '2026-09-01', note: 'Eski daftardan', createdAt: '',
  });
  const somda = yetkazibQarzi({ id: 'd2', amount: 500000, status: 'cancelled', rate: null });
  assert.equal(somda.currency, 'UZS');
  assert.equal(somda.status, 'CANCELLED');
  assert.equal(somda.rate, null);
  assert.equal(yetkazibQarzi({ amount: 1 }), null);
});

test('list keeps server order (newest first, cancelled included) in any envelope', () => {
  const royxat = [qarz, { ...qarz, id: 'd0', status: 'CANCELLED' }];
  for (const raw of [royxat, javob(royxat), { items: royxat }, javob({ items: royxat })]) {
    assert.deepEqual(yetkazibQarzlari(raw).map((q) => [q.id, q.status]), [['d1', 'CONFIRMED'], ['d0', 'CANCELLED']]);
  }
  assert.deepEqual(yetkazibQarzlari(javob(null)), []);
});

test('confirmed debt can be cancelled, a cancelled one restored; only admin and director manage opening debts', () => {
  assert.equal(yetkazibQarzAmali({ status: 'CONFIRMED' }), 'bekor');
  assert.equal(yetkazibQarzAmali({ status: 'CANCELLED' }), 'tiklash');
  assert.equal(yetkazibQarzAmali({ status: 'DRAFT' }), null);
  assert.equal(yetkazibQarzRuxsati('DIREKTOR'), true);
  assert.equal(yetkazibQarzRuxsati('ADMIN'), true);
  for (const rol of ['KASSIR', 'OMBORCHI', '']) assert.equal(yetkazibQarzRuxsati(rol), false);
});

test('opening debt API: create, list, cancel and restore go to the documented supplier endpoints', async () => {
  reset();
  handlers.set('POST /partners/suppliers/s1/opening-debt', () => javob(qarz));
  handlers.set('/partners/suppliers/s1/opening-debts', () => javob([qarz]));
  handlers.set('POST /partners/suppliers/s1/opening-debts/d1/cancel', () => javob({ ...qarz, status: 'CANCELLED' }));
  handlers.set('POST /partners/suppliers/s1/opening-debts/d1/restore', () => javob(qarz));
  const tana = { amount: 10150, currency: 'USD', date: '2026-09-01', note: 'Eski daftardan' };
  assert.equal((await yetkazibBoshlangichQarzApi.yaratish('s1', tana)).docNumber, 'YQB-000001');
  assert.equal((await yetkazibBoshlangichQarzApi.royxat('s1')).length, 1);
  assert.equal((await yetkazibBoshlangichQarzApi.bekorQilish('s1', 'd1')).status, 'CANCELLED');
  assert.equal((await yetkazibBoshlangichQarzApi.tiklash('s1', 'd1')).status, 'CONFIRMED');
  assert.deepEqual(calls.map((c) => [c.method ?? 'get', c.url, c.data]), [
    ['post', '/partners/suppliers/s1/opening-debt', tana],
    ['get', '/partners/suppliers/s1/opening-debts', undefined],
    ['post', '/partners/suppliers/s1/opening-debts/d1/cancel', undefined],
    ['post', '/partners/suppliers/s1/opening-debts/d1/restore', undefined],
  ]);
});

test('supplier Telegram: link from POST /partners/suppliers/:id/telegram-link (url + groupUrl), logs by supplierId, status like the customer', async () => {
  reset();
  handlers.set('POST /partners/suppliers/s1/telegram-link', () => javob({ url: 'https://t.me/bot?start=abc', groupUrl: 'https://t.me/bot?startgroup=abc', expiresAt: '2026-11-14T10:00:00.000Z' }));
  handlers.set('/notification-logs', () => javob({ items: [{ id: 'n1', event: 'SUPPLIER_PAYMENT', status: 'SENT', sentAt: '2026-11-07T10:00:00.000Z', createdAt: '2026-11-07T10:00:00.000Z' }] }));
  assert.deepEqual(await telegramApi.yetkazibHavolasi('s1'), { url: 'https://t.me/bot?start=abc', groupUrl: 'https://t.me/bot?startgroup=abc', expiresAt: '2026-11-14T10:00:00.000Z' });
  const yozuvlar = await telegramApi.xabarnomalar({ supplierId: 's1', pageSize: 10 });
  assert.equal(yozuvlar[0].event, 'SUPPLIER_PAYMENT');
  assert.deepEqual(calls.find((c) => c.url === '/notification-logs').config.params, { supplierId: 's1', pageSize: 10 });
  assert.equal(calls[0].url, '/partners/suppliers/s1/telegram-link');
  assert.equal(mijozTelegramTuri(mijozTelegramHolati({ telegramChatId: null })), 'ulanmagan');
  assert.equal(mijozTelegramTuri(mijozTelegramHolati({ telegramChatId: '555', telegramNotify: true })), 'ulangan');
  assert.equal(mijozTelegramTuri(mijozTelegramHolati({ telegramChatId: '555', telegramNotify: false })), 'ochirgan');
  assert.equal(mijozTelegramTuri(mijozTelegramHolati({ telegramChatId: '555', telegramBlocked: true })), 'bloklagan');
});
