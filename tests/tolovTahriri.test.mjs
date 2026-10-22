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
globalThis.window ??= new EventTarget();
const lib = await import('../src/lib/tolovTahriri.ts');
const { tolovniTahrirlash, TolovTahririXatosi } = await import('../src/api/tolovTahririApi.ts');
const { useSavdoStore } = await import('../src/store/savdoStore.ts');
const initial = useSavdoStore.getState();

const tolovlar = () => [
  { id: 'p1', paymentType: 'CASH', amount: '413600', note: '413600', currency: null },
  { id: 'p2', paymentType: 'CARD', amount: '13600', currency: 'UZS' },
];

// ───────── sof kutubxona ─────────

test('qolganBosqichlar: bekor → tiklash → yangilash → tasdiqlash; xato bergan bosqichdan davom', () => {
  assert.deepEqual(lib.qolganBosqichlar(), ['bekor', 'tiklash', 'yangilash', 'tasdiqlash']);
  assert.deepEqual(lib.qolganBosqichlar('yangilash'), ['yangilash', 'tasdiqlash']);
  assert.deepEqual(lib.qolganBosqichlar('tasdiqlash'), ['tasdiqlash']);
});

test('tahrirlanadiganTolovIndeksi: avval id, topilmasa avvalgi o‘rni, bo‘lmasa -1', () => {
  assert.equal(lib.tahrirlanadiganTolovIndeksi(tolovlar(), { id: 'p2', indeks: 0 }), 1);
  assert.equal(lib.tahrirlanadiganTolovIndeksi(tolovlar(), { id: 'yangi-id', indeks: 1 }), 1);
  assert.equal(lib.tahrirlanadiganTolovIndeksi(tolovlar(), { id: null, indeks: 0 }), 0);
  assert.equal(lib.tahrirlanadiganTolovIndeksi(tolovlar(), { id: 'yo‘q', indeks: 5 }), -1);
  assert.equal(lib.tahrirlanadiganTolovIndeksi(tolovlar(), { id: null, indeks: -1 }), -1);
});

test('tolovlarniYangilash: backend namunasi — dollar, 100, kerakli kun; boshqa to‘lov id va izohi bilan o‘zgarishsiz', () => {
  const natija = lib.tolovlarniYangilash(
    tolovlar(),
    { id: 'p1', indeks: 0 },
    { paymentType: 'CASH', amount: 100, currency: 'USD', date: '2026-10-20' },
    'UZS'
  );
  assert.deepEqual(natija, [
    { id: 'p1', paymentType: 'CASH', amount: 100, currency: 'USD', date: '2026-10-20' },
    { paymentType: 'CARD', amount: 13600, id: 'p2' },
  ]);
});

test('tolovlarniYangilash: valyuta faqat sotuv valyutasidan farq qilsa; sana va izoh faqat o‘zgargan bo‘lsa', () => {
  // Dollardagi sotuvda to'lov so'mda: currency "UZS" yuboriladi; sotuv valyutasidagi to'lovda — yuborilmaydi.
  const usdSotuv = lib.tolovlarniYangilash(
    [{ id: 'a', paymentType: 'CASH', amount: 20, currency: 'USD' }, { id: 'b', paymentType: 'CASH', amount: 500000, currency: 'UZS' }],
    { id: 'a', indeks: 0 },
    { paymentType: 'CASH', amount: 25, currency: 'USD' },
    'USD'
  );
  assert.deepEqual(usdSotuv, [
    { id: 'a', paymentType: 'CASH', amount: 25 },
    { paymentType: 'CASH', amount: 500000, currency: 'UZS', id: 'b' },
  ]);
  // Izoh o'zgargan (bo'sh — o'chirish) va sana berilmagan.
  const izohli = lib.tolovlarniYangilash(tolovlar(), { id: 'p1', indeks: 0 }, { paymentType: 'BANK', amount: 1, currency: 'UZS', note: '' }, 'UZS');
  assert.deepEqual(izohli[0], { id: 'p1', paymentType: 'BANK', amount: 1, note: '' });
  assert.ok(!('date' in izohli[0]));
});

test('tolovlarniYangilash: to‘lov topilmasa null; id yo‘q to‘lov o‘rni bo‘yicha topiladi', () => {
  assert.equal(lib.tolovlarniYangilash(tolovlar(), { id: 'yo‘q', indeks: 9 }, { paymentType: 'CASH', amount: 1, currency: 'UZS' }, 'UZS'), null);
  const idsiz = lib.tolovlarniYangilash([{ paymentType: 'CASH', amount: 5 }], { id: null, indeks: 0 }, { paymentType: 'CASH', amount: 7, currency: 'UZS' }, 'UZS');
  assert.deepEqual(idsiz, [{ paymentType: 'CASH', amount: 7 }]);
});

test('tolovTahririTanasi: payments va (berilsa) aniq keepExcess', () => {
  assert.deepEqual(lib.tolovTahririTanasi([{ amount: 1 }]), { payments: [{ amount: 1 }] });
  assert.deepEqual(lib.tolovTahririTanasi([{ amount: 1 }], false), { payments: [{ amount: 1 }], keepExcess: false });
  assert.deepEqual(lib.tolovTahririTanasi([{ amount: 1 }], true), { payments: [{ amount: 1 }], keepExcess: true });
});

test('tolovYangilanishi: sana va izoh faqat asl qiymatdan farq qilsa qo‘shiladi', () => {
  const asl = { kun: '2026-10-20', izoh: '413600' };
  const forma = { paymentType: 'CASH', amount: 100, currency: 'USD', kun: '2026-10-20', izoh: ' 413600 ' };
  assert.deepEqual(lib.tolovYangilanishi(asl, forma), { paymentType: 'CASH', amount: 100, currency: 'USD' });
  assert.deepEqual(lib.tolovYangilanishi(asl, { ...forma, kun: '2026-10-19', izoh: 'adashgan' }), { paymentType: 'CASH', amount: 100, currency: 'USD', date: '2026-10-19', note: 'adashgan' });
  assert.deepEqual(lib.tolovYangilanishi(asl, { ...forma, izoh: '' }), { paymentType: 'CASH', amount: 100, currency: 'USD', note: '' });
});

test('tolovOzgarganmi: har bir maydon o‘zgarishi seziladi, bir xil forma — yo‘q', () => {
  const asl = { paymentType: 'CASH', amount: 413600, currency: 'UZS', kun: '2026-10-20', izoh: 'a' };
  assert.equal(lib.tolovOzgarganmi(asl, { ...asl, izoh: ' a ' }), false);
  assert.equal(lib.tolovOzgarganmi(asl, { ...asl, amount: 413600.0000000001 }), false);
  for (const o of [{ paymentType: 'CARD' }, { amount: 1 }, { currency: 'USD' }, { kun: '2026-10-21' }, { izoh: 'b' }]) {
    assert.equal(lib.tolovOzgarganmi(asl, { ...asl, ...o }), true, JSON.stringify(o));
  }
});

// ───────── zanjir (API) ─────────

const sotuv = (qism = {}) => ({ id: 's1', status: 'CONFIRMED', currency: 'UZS', warehouseId: 'w1', payments: tolovlar(), ...qism });
const sorov = (qism = {}) => ({
  sotuvId: 's1',
  tolovId: 'p1',
  tolovIndeksi: 0,
  yangi: { paymentType: 'CASH', amount: 100, currency: 'USD', date: '2026-10-20' },
  ...qism,
});
function zanjirniTayyorlash({ tasdiqlashXatosi = false, tiklashXatosi = false } = {}) {
  reset();
  let holat = sotuv();
  handlers.set('POST /sales/s1/cancel', () => (holat = sotuv({ status: 'CANCELLED' })));
  handlers.set('POST /sales/s1/restore', () => {
    if (tiklashXatosi) throw new Error('Tiklab bo‘lmadi');
    return (holat = sotuv({ status: 'DRAFT', payments: [{ id: 'q1', paymentType: 'CASH', amount: '413600', note: '413600' }, { id: 'q2', paymentType: 'CARD', amount: '13600' }] }));
  });
  handlers.set('PATCH /sales/s1', (tana) => (holat = sotuv({ status: 'DRAFT', payments: tana.payments })));
  handlers.set('POST /sales/s1/confirm', () => {
    if (tasdiqlashXatosi) throw new Error('Ombor qoldig‘i yetarli emas');
    return (holat = sotuv({ payments: [{ id: 'q1', paymentType: 'CASH', amount: '100', currency: 'USD', changeAmount: '339000' }, { id: 'q2', paymentType: 'CARD', amount: '13600' }] }));
  });
  handlers.set('/sales/s1', () => holat);
}

test('zanjir: bekor → tiklash → (qoralamani olish) PATCH payments → tasdiqlash → oxirgi holat; id tiklangan sotuvdan olinadi', async () => {
  zanjirniTayyorlash();
  const voqealar = [];
  const natija = await tolovniTahrirlash(sorov(), { onBosqich: (bosqich, holat) => voqealar.push(`${bosqich}:${holat}`) });
  const tartib = calls.map((qo) => `${(qo.method ?? 'get').toUpperCase()} ${qo.url}`);
  assert.deepEqual(tartib, [
    'POST /sales/s1/cancel',
    'POST /sales/s1/restore',
    'GET /sales/s1',
    'PATCH /sales/s1',
    'POST /sales/s1/confirm',
    'GET /sales/s1',
  ]);
  const patch = calls.find((qo) => qo.method === 'patch');
  // To'lov tiklangan qoralamadagi id ("q1") bilan, dollar va aniq sana; ikkinchi to'lov o'z id'si bilan.
  assert.deepEqual(patch.data, {
    payments: [
      { id: 'q1', paymentType: 'CASH', amount: 100, currency: 'USD', date: '2026-10-20' },
      { paymentType: 'CARD', amount: 13600, id: 'q2' },
    ],
  });
  assert.deepEqual(voqealar, ['bekor:boshlandi', 'bekor:tugadi', 'tiklash:boshlandi', 'tiklash:tugadi', 'yangilash:boshlandi', 'yangilash:tugadi', 'tasdiqlash:boshlandi', 'tasdiqlash:tugadi']);
  assert.equal(natija.status, 'CONFIRMED');
  assert.equal(natija.payments[0].changeAmount, '339000');
});

test('zanjir: keepExcess aniq yuboriladi (qarzdan ortiq pulda mijoz hisobiga yozish)', async () => {
  zanjirniTayyorlash();
  await tolovniTahrirlash(sorov({ keepExcess: true }));
  assert.equal(calls.find((qo) => qo.method === 'patch').data.keepExcess, true);
});

test('zanjir: tiklash xato bersa to‘xtaydi (keyingi bosqichlar chaqirilmaydi), xato bosqichi aniq; shu bosqichdan davom etiladi', async () => {
  zanjirniTayyorlash({ tiklashXatosi: true });
  await assert.rejects(
    () => tolovniTahrirlash(sorov()),
    (xato) => xato instanceof TolovTahririXatosi && xato.bosqich === 'tiklash' && /Tiklab bo‘lmadi/.test(xato.message)
  );
  assert.deepEqual(calls.map((qo) => `${(qo.method ?? 'get').toUpperCase()} ${qo.url}`), ['POST /sales/s1/cancel', 'POST /sales/s1/restore']);

  // Qayta urinish: bekor qilish takrorlanmaydi, "tiklash"dan davom etadi.
  zanjirniTayyorlash();
  await tolovniTahrirlash(sorov(), { boshlash: 'tiklash' });
  assert.ok(!calls.some((qo) => qo.url === '/sales/s1/cancel'));
  assert.ok(calls.some((qo) => qo.url === '/sales/s1/confirm'));
});

test('zanjir: tahrirlanadigan to‘lov topilmasa "yangilash" bosqichida xato, PATCH ketmaydi', async () => {
  zanjirniTayyorlash();
  await assert.rejects(
    () => tolovniTahrirlash(sorov({ tolovId: 'yo‘q', tolovIndeksi: 7 })),
    (xato) => xato instanceof TolovTahririXatosi && xato.bosqich === 'yangilash' && xato.message === lib.TOLOV_TOPILMADI
  );
  assert.ok(!calls.some((qo) => qo.method === 'patch'));
});

// ───────── do'kon ─────────

test('do‘kon: muvaffaqiyatda sotuv va ro‘yxat yangilanadi, ok: true', async () => {
  zanjirniTayyorlash();
  useSavdoStore.setState({ ...initial, sotuvlar: [sotuv()], tanlanganSotuv: sotuv(), qoldiqlarniYuklash: async () => {} }, true);
  const natija = await useSavdoStore.getState().tolovniTahrirlash(sorov());
  assert.equal(natija.ok, true);
  const holat = useSavdoStore.getState();
  assert.equal(holat.tanlanganSotuv.status, 'CONFIRMED');
  assert.equal(holat.tanlanganSotuv.payments[0].changeAmount, '339000');
  assert.equal(holat.sotuvlar[0].payments[0].currency, 'USD');
  assert.equal(holat.amalBajarilmoqda, false);
});

test('do‘kon: tasdiqlashda xato — ok: false, bosqich "tasdiqlash", sotuv backend holatiga (qoralama) moslanadi', async () => {
  zanjirniTayyorlash({ tasdiqlashXatosi: true });
  useSavdoStore.setState({ ...initial, sotuvlar: [sotuv()], tanlanganSotuv: sotuv(), qoldiqlarniYuklash: async () => {} }, true);
  const natija = await useSavdoStore.getState().tolovniTahrirlash(sorov());
  assert.equal(natija.ok, false);
  assert.equal(natija.bosqich, 'tasdiqlash');
  assert.match(natija.xato, /Ombor qoldig‘i yetarli emas/);
  const holat = useSavdoStore.getState();
  assert.equal(holat.tanlanganSotuv.status, 'DRAFT');
  assert.equal(holat.sotuvlar[0].status, 'DRAFT');
  assert.equal(holat.amalBajarilmoqda, false);
  assert.match(holat.xatolik, /Ombor qoldig‘i yetarli emas/);
});

// ───────── kassa yozuvidan to'lovni topish ─────────

test('tahrirlanadiganTolovmi: faqat id bor naqd/karta/bank to‘lovi', () => {
  assert.equal(lib.tahrirlanadiganTolovmi({ id: 'a', paymentType: 'CASH', amount: 5 }), true);
  assert.equal(lib.tahrirlanadiganTolovmi({ id: 'a', paymentType: 'BANK', amount: '5' }), true);
  assert.equal(lib.tahrirlanadiganTolovmi({ id: 'a', paymentType: 'BALANCE', amount: 5 }), false);
  assert.equal(lib.tahrirlanadiganTolovmi({ id: 'a', paymentType: 'DEBT', amount: 5 }), false);
  assert.equal(lib.tahrirlanadiganTolovmi({ paymentType: 'CASH', amount: 5 }), false);
  assert.equal(lib.tahrirlanadiganTolovmi({ id: 'a', paymentType: 'CASH', amount: 0 }), false);
});

const topish = [
  { id: 'p1', paymentType: 'CASH', amount: '413600', date: '2026-10-20T08:00:00.000Z' },
  { id: 'p2', paymentType: 'CASH', amount: '13600', date: '2026-10-22T08:00:00.000Z' },
  { id: 'p3', paymentType: 'CARD', amount: '13600', date: '2026-10-22T09:00:00.000Z' },
  { id: 'p4', paymentType: 'BALANCE', amount: '500', date: '2026-10-22T09:00:00.000Z' },
  { id: 'p5', paymentType: 'CASH', amount: '100', currency: 'USD', settledAmount: '1067000', date: '2026-10-23T09:00:00.000Z' },
];

test('tolovniTopish: bitta tahrirlanadigan to‘lov bo‘lsa shu; hech biri bo‘lmasa -1', () => {
  assert.equal(lib.tolovniTopish([{ id: 'x', paymentType: 'CASH', amount: 5 }, { id: 'y', paymentType: 'BALANCE', amount: 5 }], {}), 0);
  assert.equal(lib.tolovniTopish([{ id: 'y', paymentType: 'BALANCE', amount: 5 }], {}), -1);
  assert.equal(lib.tolovniTopish([], { summa: 1 }), -1);
});

test('tolovniTopish: id, keyin tur + summa, keyin kun bo‘yicha aniqlaydi', () => {
  assert.equal(lib.tolovniTopish(topish, { id: 'p2' }), 1);
  // Tur va summa: 13 600 ham naqd, ham karta — turi ajratadi.
  assert.equal(lib.tolovniTopish(topish, { paymentType: 'CARD', summa: 13600 }), 2);
  assert.equal(lib.tolovniTopish(topish, { paymentType: 'CASH', summa: 413600 }), 0);
  // Dollar to'lov: summa so'mdagi qiymati (settledAmount) bilan ham mos keladi.
  assert.equal(lib.tolovniTopish(topish, { paymentType: 'CASH', summa: 1067000 }), 4);
  // Bir xil tur va summa bo'lsa kun hal qiladi.
  const ikki = [
    { id: 'a', paymentType: 'CASH', amount: '100', date: '2026-10-20T08:00:00.000Z' },
    { id: 'b', paymentType: 'CASH', amount: '100', date: '2026-10-22T08:00:00.000Z' },
  ];
  assert.equal(lib.tolovniTopish(ikki, { paymentType: 'CASH', summa: 100, kun: '2026-10-22' }), 1);
  // Aniqlab bo'lmasa -1 (foydalanuvchi tanlaydi).
  assert.equal(lib.tolovniTopish(ikki, { paymentType: 'CASH', summa: 100 }), -1);
  assert.equal(lib.tolovniTopish(ikki, { paymentType: 'CASH', summa: 100, kun: '2026-10-25' }), -1);
  assert.equal(lib.tolovniTopish(topish, {}), -1);
});
