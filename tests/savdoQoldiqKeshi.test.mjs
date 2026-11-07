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
const { useSavdoStore } = await import('../src/store/savdoStore.ts');
const { malumotnomaKeshiniTozalash } = await import('../src/lib/malumotnomaKeshi.ts');
const initial = useSavdoStore.getState();
const count = url => calls.filter(call => call.url === url).length;
const stock = '/reports/stock-balance';
function boshlash() {
  reset();
  malumotnomaKeshiniTozalash();
  useSavdoStore.setState(initial, true);
}

test('sotuvni qayta ochish: kesh bilan so\'ralgan ombor qoldig\'i qayta yuklanmaydi', async () => {
  boshlash();
  await initial.qoldiqlarniYuklash('w1', { kesh: true });
  await initial.qoldiqlarniYuklash('w1', { kesh: true });
  assert.equal(count(stock), 1);
  await initial.qoldiqlarniYuklash('w2', { kesh: true });
  assert.equal(count(stock), 2, 'boshqa ombor alohida kesh kaliti');
});

test('kesh berilmasa (tasdiqlash, bekor qilish, inventarizatsiyadan keyin) qoldiq har doim yangidan olinadi va butun kesh eskirgan hisoblanadi', async () => {
  boshlash();
  await initial.qoldiqlarniYuklash('w1', { kesh: true });
  await initial.qoldiqlarniYuklash('w2', { kesh: true });
  await initial.qoldiqlarniYuklash('w1');
  assert.equal(count(stock), 3);
  await initial.qoldiqlarniYuklash('w2', { kesh: true });
  assert.equal(count(stock), 4, 'w1 yangilanganda w2 nusxasi ham eskirgan');
});

test('kesh muddati (30 s) o\'tgach qoldiq qayta so\'raladi', async () => {
  boshlash();
  const asl = Date.now;
  let hozir = 1_000_000;
  Date.now = () => hozir;
  try {
    await initial.qoldiqlarniYuklash('w1', { kesh: true });
    hozir += 29_000;
    await initial.qoldiqlarniYuklash('w1', { kesh: true });
    assert.equal(count(stock), 1);
    hozir += 2_000;
    await initial.qoldiqlarniYuklash('w1', { kesh: true });
    assert.equal(count(stock), 2);
  } finally {
    Date.now = asl;
  }
});

test('qoldiq xato bersa kesh eslamaydi: keyingi chaqiruv qayta urinadi', async () => {
  boshlash();
  let urinish = 0;
  // Hisobot ham, zaxira endpoint ham birinchi marta yiqiladi.
  handlers.set(stock, () => { throw new Error('Hisobot yiqildi'); });
  handlers.set('/inventory/stock-balance', () => { urinish += 1; if (urinish === 1) throw new Error('Qoldiq xatosi'); return []; });
  await initial.qoldiqlarniYuklash('w1', { kesh: true });
  assert.match(useSavdoStore.getState().xatolik, /Qoldiq xatosi/);
  await initial.qoldiqlarniYuklash('w1', { kesh: true });
  assert.equal(urinish, 2, 'xato eslanmadi, ikkinchi chaqiruv qayta urindi');
});

test('qaytarishlar faqat so\'ralganda olinadi va bir vaqtdagi chaqiruvlar birlashadi', async () => {
  boshlash();
  handlers.set('/returns', () => [{ id: 'r1' }]);
  assert.equal(count('/returns'), 0);
  await Promise.all([initial.qaytarishlarniYuklash(), initial.qaytarishlarniYuklash()]);
  assert.equal(count('/returns'), 1);
  assert.equal(useSavdoStore.getState().qaytarishlar[0].id, 'r1');
});

test('qoldiq sotuv ochilgandan keyin kelsa, ochiq sotuv mahsulotiga nom qo\'shiladi', async () => {
  boshlash();
  useSavdoStore.setState({ tanlanganSotuv: { id: 's1', items: [{ id: 'i1', modificationId: 'm1', quantity: 1 }] } });
  handlers.set(stock, () => ({
    items: [{ modificationId: 'm1', productId: 'p1', productName: 'Sement', modificationName: 'M400', availableQuantity: 5, retailPrice: 100, warehouseId: 'w1' }],
    totalPages: 1,
  }));
  await initial.qoldiqlarniYuklash('w1', { kesh: true });
  assert.equal(useSavdoStore.getState().tanlanganSotuv.items[0].modification.product.name, 'Sement');
});
