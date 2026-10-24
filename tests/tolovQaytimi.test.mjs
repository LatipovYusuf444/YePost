import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { calls, handlers, reset } from './helpers/savdoYuklashClient.mjs';

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
// Do'kon to'lovdan keyin `window` orqali "savdo:yangilandi" hodisasini yuboradi.
globalThis.window ??= new EventTarget();
const { sotuvgaTolovQoshish } = await import('../src/api/savdoApi.ts');
const { useSavdoStore } = await import('../src/store/savdoStore.ts');
const initial = useSavdoStore.getState();

const sotuv = (qism = {}) => ({ id: 's1', status: 'CONFIRMED', payments: [], ...qism });

test('to‘lov qo‘shish: so‘rov tanasi (keepExcess/roundChange) o‘zgarishsiz ketadi, javobdan change va keptAmount olinadi', async () => {
  reset();
  handlers.set('POST /sales/s1/payments', () => ({ id: 's1', change: '339000', keptAmount: '0' }));
  handlers.set('/sales/s1', () => sotuv({ payments: [{ id: 'p1', paymentType: 'CASH', amount: '1067000', changeAmount: '339000' }] }));
  const tana = { paymentType: 'CASH', amount: 100, currency: 'USD', date: '2026-10-20', note: 'qarz', roundChange: false };
  const natija = await sotuvgaTolovQoshish('s1', tana);
  assert.equal(natija.qaytim, 339000);
  assert.equal(natija.hisobga, 0);
  assert.equal(natija.sotuv.payments[0].changeAmount, '339000');
  const post = calls.find((qo) => qo.method === 'post');
  assert.equal(post.url, '/sales/s1/payments');
  assert.deepEqual(post.data, tana);
  // Sotuvning yangilangan holati alohida GET bilan olinadi.
  assert.ok(calls.some((qo) => qo.url === '/sales/s1' && qo.method !== 'post'));
});

test('to‘lov qo‘shish: keepExcess bilan hisobga o‘tgan pul (keptAmount), envelope ichidagi javob ham o‘qiladi', async () => {
  reset();
  handlers.set('POST /sales/s1/payments', () => ({ success: true, data: { id: 's1', change: '0', keptAmount: '339000.00' } }));
  handlers.set('/sales/s1', () => sotuv());
  const natija = await sotuvgaTolovQoshish('s1', { paymentType: 'CASH', amount: 1067000, keepExcess: true });
  assert.deepEqual({ qaytim: natija.qaytim, hisobga: natija.hisobga }, { qaytim: 0, hisobga: 339000 });
  assert.equal(calls.find((qo) => qo.method === 'post').data.keepExcess, true);
});

test('to‘lov qo‘shish: ortiqcha bo‘lmasa (oddiy javob) natija nol', async () => {
  reset();
  handlers.set('POST /sales/s1/payments', () => ({ id: 's1', status: 'CONFIRMED' }));
  handlers.set('/sales/s1', () => sotuv());
  const natija = await sotuvgaTolovQoshish('s1', { paymentType: 'CASH', amount: 1000 });
  assert.equal(natija.qaytim, 0);
  assert.equal(natija.hisobga, 0);
});

test('do‘kon: sotuvgaTolovQoshish natijani (qaytim, hisobga) qaytaradi va ochiq sotuvni yangilaydi', async () => {
  reset();
  useSavdoStore.setState({ ...initial, sotuvlar: [sotuv()], tanlanganSotuv: sotuv() }, true);
  handlers.set('POST /sales/s1/payments', () => ({ id: 's1', change: '339000', keptAmount: '0' }));
  handlers.set('/sales/s1', () => sotuv({ debtAmount: '0', payments: [{ id: 'p1', paymentType: 'CASH', amount: '1067000', changeAmount: '339000' }] }));
  const natija = await useSavdoStore.getState().sotuvgaTolovQoshish('s1', { paymentType: 'CASH', amount: 100, currency: 'USD' });
  assert.deepEqual(natija, { qaytim: 339000, hisobga: 0 });
  const holat = useSavdoStore.getState();
  assert.equal(holat.tanlanganSotuv.payments[0].changeAmount, '339000');
  assert.equal(holat.sotuvlar[0].payments[0].changeAmount, '339000');
  assert.equal(holat.amalBajarilmoqda, false);
  assert.equal(holat.xatolik, null);
});

test('do‘kon: to‘lov xato bersa null va xato sababi (modal shuni ko‘rsatadi)', async () => {
  reset();
  useSavdoStore.setState({ ...initial, sotuvlar: [sotuv()], tanlanganSotuv: sotuv() }, true);
  handlers.set('POST /sales/s1/payments', () => { throw new Error('Karta, bank yoki hisobdan qarz summasidan ko\'p to\'lab bo\'lmaydi.'); });
  const natija = await useSavdoStore.getState().sotuvgaTolovQoshish('s1', { paymentType: 'CARD', amount: 9999999 });
  assert.equal(natija, null);
  assert.match(useSavdoStore.getState().xatolik, /ko'p to'lab bo'lmaydi/);
  assert.equal(useSavdoStore.getState().amalBajarilmoqda, false);
});

test('walk-in confirmation keeps the backend changeAmount on the final cash row in both list and open sale', async () => {
  reset();
  const draft = sotuv({ status: 'DRAFT', customerId: null });
  useSavdoStore.setState({ ...initial, sotuvlar: [draft], tanlanganSotuv: draft }, true);
  handlers.set('/sales/s1', () => draft);
  handlers.set('POST /sales/s1/confirm', () => ({ data: sotuv({ customerId: null, payments: [
    { id: 'p1', paymentType: 'CARD', amount: '100000', currency: 'UZS', changeAmount: '0' },
    { id: 'p2', paymentType: 'CASH', amount: '50', currency: 'USD', rate: '12100', changeAmount: '209000' },
  ] }) }));
  assert.equal(await useSavdoStore.getState().sotuvniTasdiqlash('s1'), true);
  const state = useSavdoStore.getState();
  for (const saved of [state.sotuvlar[0], state.tanlanganSotuv]) {
    assert.equal(saved.payments[1].changeAmount, '209000');
    assert.equal(saved.payments[1].rate, '12100');
    assert.equal(saved.customerId, null);
  }
});
