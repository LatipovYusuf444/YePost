import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { calls, handlers, reset } from './helpers/savdoYuklashClient.mjs';

const src = new URL('../src/', import.meta.url);
const fixture = new URL('./helpers/savdoYuklashClient.mjs', import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.startsWith(src.href)) {
      if (['./axios'].includes(specifier)) return { url: fixture, shortCircuit: true };
      if (specifier.startsWith('.') && !specifier.endsWith('.ts')) return { url: new URL(specifier + '.ts', context.parentURL).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
const { hujjatHarakatlari, harakatQatorlari, harakatJamilari, hujjatQatorlariNomlari, ombordanChiqarishSanasi } = await import('../src/lib/hujjatHarakatlari.ts');
const { hujjatHarakatlariniOlish } = await import('../src/api/hujjatHarakatlariApi.ts');

const qator = (qism = {}) => ({
  id: 'm1', date: '2026-10-21T07:00:00.000Z', type: 'SALE', docNumber: 'SAV-000012', refId: 's1', warehouseId: 'w1', warehouseName: 'Asosiy ombor',
  productId: 'p1', productName: 'Konfet', modificationId: 'v1', modificationName: 'Konfet 1kg', quantity: '-5', unitName: 'dona', ...qism,
});

test('hujjatHarakatlari: massiv, items va data.items shakllari; miqdor musbat, yo‘nalish faqat ishoradan (+ kirim, − chiqim)', () => {
  const xom = [qator(), qator({ id: 'm2', type: 'SALE', quantity: '3' }), qator({ id: 'm3', type: 'RETURN', quantity: '2' }), qator({ id: 'm4', type: 'TRANSFER_IN', quantity: -1 })];
  for (const javob of [xom, { items: xom, total: 4 }, { data: xom }, { data: { items: xom, page: 1 } }]) {
    const natija = hujjatHarakatlari(javob);
    assert.deepEqual(natija.map((h) => h.miqdor), [5, 3, 2, 1]);
    // backend: ishorali miqdor. Manfiy — chiqim, musbat — kirim (hujjat turidan qat'i nazar: musbat SALE — bekor qilingan sotuv qaytargan tovar)
    assert.deepEqual(natija.map((h) => h.yonalish), ['chiqim', 'kirim', 'kirim', 'chiqim']);
  }
  const [birinchi] = hujjatHarakatlari([qator()]);
  assert.equal(birinchi.mahsulotNomi, 'Konfet');
  assert.equal(birinchi.variantNomi, 'Konfet 1kg');
  assert.equal(birinchi.omborNomi, 'Asosiy ombor');
  assert.equal(birinchi.birlik, 'dona');
  assert.equal(birinchi.hujjatId, 's1');
  assert.equal(birinchi.variantId, 'v1');
});

test('hujjatHarakatlari: boshqa hujjat qatorlari (refId) tashlanadi — eski server documentIds\'ni bilmasa ham; noto‘g‘ri qatorlar tashlanadi', () => {
  const xom = [qator(), qator({ id: 'x', refId: 'boshqa-sotuv' }), qator({ id: 'nol', quantity: 0 }), qator({ id: 'xato', quantity: 'abc' }), null, 'matn', qator({ id: 'refsiz', refId: undefined })];
  assert.deepEqual(hujjatHarakatlari(xom, 's1').map((h) => h.kalit), ['m1', 'refsiz']);
  assert.deepEqual(hujjatHarakatlari(xom).map((h) => h.kalit), ['m1', 'x', 'refsiz']);
  assert.deepEqual(hujjatHarakatlari(undefined, 's1'), []);
  assert.deepEqual(hujjatHarakatlari({}, 's1'), []);
});

test('hujjatHarakatlari: ichki obyektdagi nomlar (product/modification/warehouse/unit) va id yo‘q qatorga kalit beriladi', () => {
  const [h] = hujjatHarakatlari([{ refId: 's1', type: 'SALE', quantity: -2, date: '2026-10-21T07:00:00Z', product: { id: 'p9', name: 'Un' }, modification: { id: 'v9', name: 'Un 50kg' }, warehouse: { id: 'w9', name: 'Filial' }, unit: { shortName: 'kg' } }], 's1');
  assert.equal(h.mahsulotNomi, 'Un');
  assert.equal(h.variantNomi, 'Un 50kg');
  assert.equal(h.omborNomi, 'Filial');
  assert.equal(h.birlik, 'kg');
  assert.equal(h.mahsulotId, 'p9');
  assert.equal(h.variantId, 'v9');
  assert.equal(h.omborId, 'w9');
  assert.match(h.kalit, /^s1:v9:0$/);
});

test('harakatQatorlari: bir tovar va ombor bo‘yicha yig‘iladi, nom sotuv qatoridan to‘ldiriladi, qaytgani alohida', () => {
  const harakatlar = hujjatHarakatlari([
    qator({ id: 'a', quantity: -5 }),
    qator({ id: 'b', quantity: -2.5 }),
    qator({ id: 'c', type: 'RETURN', quantity: 1, date: '2026-10-22T07:00:00.000Z' }),
    qator({ id: 'd', modificationId: 'v2', productId: 'p2', productName: undefined, modificationName: undefined, unitName: undefined, quantity: -3, warehouseId: 'w2', warehouseName: 'Filial' }),
  ], 's1');
  const nomlar = (variantId) => (variantId === 'v2' ? { mahsulot: 'Shokolad', variant: 'Qora', birlik: 'dona' } : undefined);
  const qatorlar = harakatQatorlari(harakatlar, nomlar);
  assert.equal(qatorlar.length, 2);
  const konfet = qatorlar.find((q) => q.mahsulotNomi === 'Konfet');
  assert.equal(konfet.chiqdi, 7.5);
  assert.equal(konfet.qaytdi, 1);
  assert.equal(konfet.sana, '2026-10-22T07:00:00.000Z');
  const shokolad = qatorlar.find((q) => q.mahsulotNomi === 'Shokolad');
  assert.deepEqual([shokolad.variantNomi, shokolad.birlik, shokolad.omborNomi, shokolad.chiqdi, shokolad.qaytdi], ['Qora', 'dona', 'Filial', 3, 0]);
  // tartib: mahsulot nomi bo'yicha
  assert.deepEqual(qatorlar.map((q) => q.mahsulotNomi), ['Konfet', 'Shokolad']);
});

test('harakatJamilari: birliklar qo‘shib yuborilmaydi', () => {
  const qatorlar = harakatQatorlari(hujjatHarakatlari([
    qator({ id: 'a', quantity: -4 }),
    qator({ id: 'b', modificationId: 'v3', productId: 'p3', productName: 'Un', unitName: 'kg', quantity: -2.5 }),
    qator({ id: 'c', modificationId: 'v4', productId: 'p4', productName: 'Shakar', unitName: 'kg', quantity: -1 }),
  ], 's1'));
  assert.deepEqual(harakatJamilari(qatorlar).sort((a, b) => a.birlik.localeCompare(b.birlik)), [
    { birlik: 'dona', chiqdi: 4, qaytdi: 0 }, { birlik: 'kg', chiqdi: 3.5, qaytdi: 0 },
  ]);
});

test('API: documentIds bilan so‘raydi, sana yuborilmaydi, xato toasti yashirin; boshqa hujjat qatorlari tashlanadi', async () => {
  reset();
  handlers.set('/reports/stock-movement', () => ({ items: [qator(), qator({ id: 'x', refId: 'boshqa' })], page: 1, pageSize: 200, total: 2, totalPages: 1 }));
  const natija = await hujjatHarakatlariniOlish('s1');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/reports/stock-movement');
  assert.deepEqual(calls[0].config.params, { documentIds: 's1', page: 1, pageSize: 200 });
  assert.equal(calls[0].config.xatoniYashirish, true);
  assert.deepEqual(natija.map((h) => h.kalit), ['m1']);
});

test('API: oddiy massiv javobda keyingi sahifa so‘ralmaydi; totalPages aniq yozilsa ketma-ket olinadi; xato yuqoriga chiqadi', async () => {
  reset();
  handlers.set('/reports/stock-movement', () => Array.from({ length: 250 }, (_, i) => qator({ id: `r${i}` })));
  assert.equal((await hujjatHarakatlariniOlish('s1')).length, 250);
  assert.equal(calls.length, 1, 'massiv javobda sahifalash taxmin qilinmaydi');

  reset();
  handlers.set('/reports/stock-movement', (config) => ({ items: [qator({ id: `p${config.params.page}` })], totalPages: 3 }));
  assert.deepEqual((await hujjatHarakatlariniOlish('s1')).map((h) => h.kalit), ['p1', 'p2', 'p3']);
  assert.deepEqual(calls.map((c) => c.config.params.page), [1, 2, 3]);

  reset();
  handlers.set('/reports/stock-movement', () => { throw new Error('403'); });
  await assert.rejects(hujjatHarakatlariniOlish('s1'), /403/);
});

test('hujjatHarakatlari: hujjat raqami (docNumber) o‘qiladi', () => {
  assert.equal(hujjatHarakatlari([qator()], 's1')[0].hujjatRaqami, 'SAV-000012');
  assert.equal(hujjatHarakatlari([qator({ docNumber: undefined })], 's1')[0].hujjatRaqami, null);
});

test('hujjatQatorlariNomlari: nom, birlik va hujjatdagi miqdor (korobkada sotilgan qator); bir variant ikki qatorda bo‘lsa birlashadi', () => {
  const xarita = hujjatQatorlariNomlari([
    { modificationId: 'v1', modification: { name: 'Konfet 1kg', product: { name: 'Konfet' } }, baseUnitName: 'kg', quantity: 6, price: 1000, unitId: 'u-k', unitName: 'korobka', unitQuantity: 2, unitPrice: 3000 },
    { modificationId: 'v1', modification: { name: 'Konfet 1kg', product: { name: 'Konfet' } }, baseUnitName: 'kg', quantity: 1, price: 1000 },
    { modificationId: 'v2', modification: { name: 'Un', product: { name: 'Un' } }, quantity: 3, price: 500 },
    { modificationId: 'v3' },
  ]);
  assert.deepEqual(xarita.get('v1'), { mahsulot: 'Konfet', variant: 'Konfet 1kg', birlik: 'kg', sotuvdagi: '2 korobka + 1' });
  assert.deepEqual(xarita.get('v2'), { mahsulot: 'Un', variant: '', birlik: undefined, sotuvdagi: '3' });
  assert.equal(xarita.get('v3').mahsulot, '');
  assert.equal(hujjatQatorlariNomlari(undefined).size, 0);
});

test('harakatQatorlari: hujjatdagi miqdor ("2 korobka") qatorga o‘tadi — ombordagi hisob (kg) bilan solishtirish uchun', () => {
  const nomlar = hujjatQatorlariNomlari([{ modificationId: 'v1', modification: { name: 'Konfet', product: { name: 'Konfet' } }, quantity: 6, price: 1000, unitId: 'u-k', unitName: 'korobka', unitQuantity: 2, unitPrice: 3000 }]);
  const [konfet] = harakatQatorlari(hujjatHarakatlari([qator({ quantity: -6, unitName: 'kg' })], 's1'), (variantId) => nomlar.get(variantId));
  assert.equal(konfet.chiqdi, 6);
  assert.equal(konfet.birlik, 'kg');
  assert.equal(konfet.sotuvdagi, '2 korobka');
});

test('ombordanChiqarishSanasi: harakat sanasi, bo‘lmasa hujjat sanasi → tasdiqlangan → yaratilgan; kiritilgan vaqt alohida', () => {
  const sotuv = { date: '2026-10-20T18:59:59.999Z', confirmedAt: '2026-10-21T07:00:00.000Z', createdAt: '2026-10-20T06:00:00.000Z' };
  const harakatlar = hujjatHarakatlari([qator({ date: '2026-10-20T18:59:59.999Z' })], 's1');
  assert.deepEqual(ombordanChiqarishSanasi(harakatlar, sotuv), { sana: '2026-10-20T18:59:59.999Z', kiritilgan: '2026-10-21T07:00:00.000Z' });
  assert.deepEqual(ombordanChiqarishSanasi(null, sotuv), { sana: '2026-10-20T18:59:59.999Z', kiritilgan: '2026-10-21T07:00:00.000Z' });
  assert.deepEqual(ombordanChiqarishSanasi([], { confirmedAt: '2026-10-21T07:00:00.000Z' }), { sana: '2026-10-21T07:00:00.000Z', kiritilgan: '2026-10-21T07:00:00.000Z' });
  assert.deepEqual(ombordanChiqarishSanasi([], {}), { sana: null, kiritilgan: null });
});

test('API: bir paytdagi so‘rovlar bitta bo‘ladi (kartadagi havola, qadam va oyna), keyingisi yangi so‘rov', async () => {
  reset();
  handlers.set('/reports/stock-movement', async () => { await Promise.resolve(); return { items: [qator()], totalPages: 1 }; });
  const [a, b, c] = await Promise.all([hujjatHarakatlariniOlish('s1'), hujjatHarakatlariniOlish('s1'), hujjatHarakatlariniOlish('s1')]);
  assert.equal(calls.length, 1);
  assert.deepEqual(a, b);
  assert.deepEqual(b, c);
  await hujjatHarakatlariniOlish('s1');
  assert.equal(calls.length, 2, 'tugagan so‘rov keshlanmaydi: yangilash yangi ma’lumot oladi');
  await Promise.all([hujjatHarakatlariniOlish('s1'), hujjatHarakatlariniOlish('s2')]);
  assert.equal(calls.length, 4, 'boshqa hujjat alohida so‘raladi');
});

test('bekor qilingan sotuv: SALE −5 (chiqdi) va SALE +5 (omborga qaytdi) — turi bir xil bo‘lsa ham ishora bo‘yicha ajraladi', () => {
  const harakatlar = hujjatHarakatlari([
    qator({ id: 'a', type: 'SALE', quantity: -5, date: '2026-10-21T07:00:00.000Z' }),
    qator({ id: 'b', type: 'SALE', quantity: 5, date: '2026-10-22T08:00:00.000Z' }),
  ], 's1');
  assert.deepEqual(harakatlar.map((h) => h.yonalish), ['chiqim', 'kirim']);
  const [qatorYozuvi] = harakatQatorlari(harakatlar);
  assert.equal(qatorYozuvi.chiqdi, 5);
  assert.equal(qatorYozuvi.qaytdi, 5);
  assert.equal(qatorYozuvi.birlik, 'dona');
  assert.equal(qatorYozuvi.sana, '2026-10-22T08:00:00.000Z');
});
