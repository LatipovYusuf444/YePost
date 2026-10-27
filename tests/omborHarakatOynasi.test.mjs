import test from 'node:test';
import assert from 'node:assert/strict';
import {
  anchorOraligi,
  davrGuruhi,
  hujjatSanasi,
  omborHarakatOynasi,
  omborlarBoyichaYigish,
  omborOqiminiMoslash,
  oqimBucketKaliti,
  oqimdanHarakatlar,
  oqimdanNuqtalar,
  oqimdanOmborlar,
  oqimOraliqlari,
  sanaOraligiMatni,
} from '../src/Pages/Monitoring/omborHarakatOynasi.ts';

const h = (kun, warehouseId, turi, summa, nom = warehouseId) => ({ kun, warehouseId, nom, turi, summa });

test('bugun harakat bor: standart oyna o‘zgarmaydi (almashgan = false)', () => {
  const harakatlar = [h('2026-10-27', 'A', 'kirim', 100), h('2026-10-20', 'A', 'chiqim', 50)];
  for (const davr of ['kunlik', 'oylik', 'yillik']) {
    const oyna = omborHarakatOynasi(harakatlar, '2026-09-28', '2026-10-27', davr);
    assert.deepEqual({ from: oyna.from, to: oyna.to }, anchorOraligi('2026-09-28', '2026-10-27', davr));
    assert.equal(oyna.almashgan, false);
  }
});

test('kunlik: bugun harakat yo‘q — oxirgi harakat kuniga siljiydi va ma’lumot chiqadi', () => {
  const harakatlar = [h('2026-10-25', 'A', 'kirim', 700), h('2026-10-25', 'B', 'chiqim', 300), h('2026-10-10', 'A', 'kirim', 5)];
  const oyna = omborHarakatOynasi(harakatlar, '2026-09-28', '2026-10-27', 'kunlik');
  assert.deepEqual(oyna, { from: '2026-10-25', to: '2026-10-25', almashgan: true });
  const nuqtalar = omborlarBoyichaYigish(harakatlar, oyna);
  assert.deepEqual(nuqtalar, [
    { nom: 'A', kirim: 700, chiqim: 0 },
    { nom: 'B', kirim: 0, chiqim: 300 },
  ]);
});

test('oylik: joriy oyda harakat yo‘q — oxirgi harakat oyi (oy oxirigacha) olinadi', () => {
  const harakatlar = [h('2026-09-15', 'A', 'kirim', 10), h('2026-09-30', 'A', 'chiqim', 4), h('2026-08-31', 'A', 'kirim', 99)];
  const oyna = omborHarakatOynasi(harakatlar, '2026-06-01', '2026-10-27', 'oylik');
  assert.deepEqual(oyna, { from: '2026-09-01', to: '2026-09-30', almashgan: true });
  assert.deepEqual(omborlarBoyichaYigish(harakatlar, oyna), [{ nom: 'A', kirim: 10, chiqim: 4 }]);
});

test('yillik: o‘tgan yil harakati, dateFrom dan oldinga chiqmaydi', () => {
  const harakatlar = [h('2025-12-30', 'A', 'kirim', 8), h('2025-03-01', 'A', 'kirim', 100)];
  const oyna = omborHarakatOynasi(harakatlar, '2025-06-01', '2026-10-27', 'yillik');
  // 2025-03-01 tanlangan oraliqdan (2025-06-01 dan) oldin — hisobga olinmaydi, 2025-12-30 oxirgi.
  assert.deepEqual(oyna, { from: '2025-06-01', to: '2025-12-31', almashgan: true });
  assert.deepEqual(omborlarBoyichaYigish(harakatlar, oyna), [{ nom: 'A', kirim: 8, chiqim: 0 }]);
});

test('oylik siljish dateTo dan o‘tib ketmaydi', () => {
  const harakatlar = [h('2026-09-10', 'A', 'kirim', 1)];
  const oyna = omborHarakatOynasi(harakatlar, '2026-09-01', '2026-09-20', 'oylik');
  assert.equal(oyna.almashgan, false);
  assert.deepEqual({ from: oyna.from, to: oyna.to }, { from: '2026-09-01', to: '2026-09-20' });
});

test('butun oraliqda harakat yo‘q: standart oyna qaytadi va natija bo‘sh', () => {
  const harakatlar = [h('2026-01-05', 'A', 'kirim', 1)];
  const oyna = omborHarakatOynasi(harakatlar, '2026-09-28', '2026-10-27', 'kunlik');
  assert.deepEqual(oyna, { from: '2026-10-27', to: '2026-10-27', almashgan: false });
  assert.deepEqual(omborlarBoyichaYigish(harakatlar, oyna), []);
  assert.deepEqual(omborlarBoyichaYigish([], oyna), []);
});

test('noto‘g‘ri formatdagi sana yiqitmaydi', () => {
  const harakatlar = [h('2026-1x', 'A', 'kirim', 1), h('2026-10-02', 'A', 'kirim', 2)];
  const oyna = omborHarakatOynasi(harakatlar, '2026-09-28', '2026-10-27', 'oylik');
  assert.equal(oyna.almashgan, false);
});

test('omborlar bo‘yicha yig‘ish: kirim/chiqim qo‘shiladi va aylanma bo‘yicha tartiblanadi', () => {
  const harakatlar = [
    h('2026-10-01', 'A', 'kirim', 10),
    h('2026-10-02', 'A', 'kirim', 5),
    h('2026-10-02', 'B', 'chiqim', 100),
    h('2026-10-03', 'B', 'kirim', 1),
  ];
  assert.deepEqual(omborlarBoyichaYigish(harakatlar, { from: '2026-10-01', to: '2026-10-31' }), [
    { nom: 'B', kirim: 1, chiqim: 100 },
    { nom: 'A', kirim: 15, chiqim: 0 },
  ]);
});

test('sana matni', () => {
  assert.equal(sanaOraligiMatni('2026-10-27', '2026-10-27'), '27.10.2026');
  assert.equal(sanaOraligiMatni('2026-10-01', '2026-10-27'), '01.10.2026 – 27.10.2026');
});

test('hujjat sanasi: backend date maydoni olinadi, updatedAt/sentAt/confirmedAt sana bo‘lmaydi', () => {
  const koch = { date: '2026-10-20T00:00:00.000Z', createdAt: '2026-10-18T08:00:00.000Z', updatedAt: '2026-10-27T09:00:00.000Z', sentAt: '2026-10-25T09:00:00.000Z', receivedAt: '2026-10-26T09:00:00.000Z' };
  assert.equal(hujjatSanasi(koch), '2026-10-20T00:00:00.000Z');
  assert.equal(hujjatSanasi({ date: '2026-10-05T00:00:00.000Z', confirmedAt: '2026-10-27T09:00:00.000Z' }), '2026-10-05T00:00:00.000Z');
  assert.equal(hujjatSanasi({ createdAt: '2026-10-18T08:00:00.000Z', updatedAt: '2026-10-27T09:00:00.000Z' }), '2026-10-18T08:00:00.000Z');
  assert.equal(hujjatSanasi({}), '');
});

const oqim = (items, guruh = 'DAY', currency = 'UZS') => omborOqiminiMoslash({ currency, items, totals: {} }, guruh);

test('server javobi: raqam satrlari va bucket kalitlari moslanadi', () => {
  const { currency, qatorlar } = oqim([
    { warehouseId: 'A', warehouseName: 'Asosiy', bucket: '2026-10-27', incomeAmount: '1500.50', expenseAmount: 300 },
    { warehouseId: 'A', warehouseName: 'Asosiy', bucket: null, incomeAmount: null, expenseAmount: 'x' },
  ]);
  assert.equal(currency, 'UZS');
  assert.deepEqual(qatorlar[0], { warehouseId: 'A', nom: 'Asosiy', bucket: '2026-10-27', kirim: 1500.5, chiqim: 300 });
  assert.deepEqual(qatorlar[1], { warehouseId: 'A', nom: 'Asosiy', bucket: '', kirim: 0, chiqim: 0 });
  assert.deepEqual(omborOqiminiMoslash(undefined, 'DAY'), { currency: '', qatorlar: [] });
  assert.deepEqual(omborOqiminiMoslash([{ warehouseId: 'B', incomeAmount: 5 }], 'WAREHOUSE').qatorlar.map((q) => q.kirim), [5]);
});

test('bucket kaliti: kun/oy/yil formatlari va to‘liq sana', () => {
  assert.equal(oqimBucketKaliti('2026-10-27', 'DAY'), '2026-10-27');
  assert.equal(oqimBucketKaliti('2026-10', 'MONTH'), '2026-10');
  assert.equal(oqimBucketKaliti('2026', 'YEAR'), '2026');
  assert.equal(oqimBucketKaliti('2026-10-01', 'MONTH'), '2026-10');
  assert.equal(oqimBucketKaliti('2026-01-01', 'YEAR'), '2026');
  assert.equal(oqimBucketKaliti(null, 'DAY'), '');
  assert.equal(oqimBucketKaliti('2026-10-27', 'WAREHOUSE'), '');
  assert.equal(oqimBucketKaliti('noto‘g‘ri', 'DAY'), '');
  // to'liq vaqt MAHALLIY kunga o'tadi (hujjat sanalari ham shunday o'qiladi)
  const mahalliy = new Date('2026-10-27T12:00:00.000Z');
  const kutilgan = [mahalliy.getFullYear(), String(mahalliy.getMonth() + 1).padStart(2, '0'), String(mahalliy.getDate()).padStart(2, '0')].join('-');
  assert.equal(oqimBucketKaliti('2026-10-27T12:00:00.000Z', 'DAY'), kutilgan);
});

test('DAY qatorlari: nol summa harakat emas, kirim va chiqim alohida harakat', () => {
  const { qatorlar } = oqim([
    { warehouseId: 'A', warehouseName: 'A', bucket: '2026-10-25', incomeAmount: 100, expenseAmount: 40 },
    { warehouseId: 'A', warehouseName: 'A', bucket: '2026-10-26', incomeAmount: 0, expenseAmount: 0 },
    { warehouseId: 'B', warehouseName: 'B', bucket: '2026-10-24', incomeAmount: 0, expenseAmount: 7 },
  ]);
  const harakatlar = oqimdanHarakatlar(qatorlar);
  assert.deepEqual(harakatlar.map((h) => [h.kun, h.turi, h.summa]), [['2026-10-25', 'kirim', 100], ['2026-10-25', 'chiqim', 40], ['2026-10-24', 'chiqim', 7]]);
  // server DAY harakatlari ham oxirgi harakat kuniga siljitadi
  assert.deepEqual(omborHarakatOynasi(harakatlar, '2026-09-28', '2026-10-27', 'kunlik'), { from: '2026-10-25', to: '2026-10-25', almashgan: true });
});

test('WAREHOUSE qatorlari: nol ombor chiqarilmaydi, aylanma bo‘yicha tartiblanadi', () => {
  const { qatorlar } = oqim([
    { warehouseId: 'A', warehouseName: 'A', incomeAmount: 10, expenseAmount: 0 },
    { warehouseId: 'B', warehouseName: 'B', incomeAmount: 5, expenseAmount: 50 },
    { warehouseId: 'C', warehouseName: 'C', incomeAmount: 0, expenseAmount: 0 },
  ], 'WAREHOUSE');
  assert.deepEqual(oqimdanOmborlar(qatorlar), [{ nom: 'B', kirim: 5, chiqim: 50 }, { nom: 'A', kirim: 10, chiqim: 0 }]);
  assert.deepEqual(oqimdanOmborlar([]), []);
});

test('tafsilot nuqtalari: bo‘laklarga yig‘iladi, boshqa ombor qatori o‘tkazib yuboriladi', () => {
  const oraliqlar = [{ key: '2026-10-25', nom: '25.10' }, { key: '2026-10-26', nom: '26.10' }, { key: '2026-10-27', nom: '27.10' }];
  const { qatorlar } = oqim([
    { warehouseId: 'A', warehouseName: 'A', bucket: '2026-10-25', incomeAmount: 100, expenseAmount: 1 },
    { warehouseId: 'A', warehouseName: 'A', bucket: '2026-10-25', incomeAmount: 20, expenseAmount: 2 },
    { warehouseId: 'B', warehouseName: 'B', bucket: '2026-10-26', incomeAmount: 999, expenseAmount: 999 },
    { warehouseId: 'A', warehouseName: 'A', bucket: '2026-11-01', incomeAmount: 5, expenseAmount: 5 },
  ]);
  assert.deepEqual(oqimdanNuqtalar(qatorlar, oraliqlar, 'kirim', 'A'), [{ nom: '25.10', summa: 120 }, { nom: '26.10', summa: 0 }, { nom: '27.10', summa: 0 }]);
  assert.deepEqual(oqimdanNuqtalar(qatorlar, oraliqlar, 'chiqim', 'A').map((n) => n.summa), [3, 0, 0]);
  // ombor id berilmagan qatorlar (server faqat tanlangan ombor uchun qaytarsa) hisobga olinadi
  const idsiz = [{ warehouseId: '', nom: '', bucket: '2026-10-27', kirim: 9, chiqim: 0 }];
  assert.equal(oqimdanNuqtalar(idsiz, oraliqlar, 'kirim', 'A')[2].summa, 9);
});

test('davr guruhi va bir kunlik oraliqdagi soatlik bo‘laklar', () => {
  assert.deepEqual(['kunlik', 'oylik', 'yillik'].map(davrGuruhi), ['DAY', 'MONTH', 'YEAR']);
  const soatlik = [{ key: '2026-10-27T00', nom: '00:00' }, { key: '2026-10-27T01', nom: '01:00' }];
  assert.deepEqual(oqimOraliqlari(soatlik, '2026-10-27'), [{ key: '2026-10-27', nom: '27.10' }]);
  const kunlik = [{ key: '2026-10-26', nom: '26.10' }];
  assert.equal(oqimOraliqlari(kunlik, '2026-10-26'), kunlik);
});

test('backend shartnomasi (warehouse-flow md): har bir ombor alohida qator, raqamli summalar, WAREHOUSE bucket = null', () => {
  const totals = { incomeAmount: 187500, expenseAmount: 87500, byType: { PURCHASE: { incomeAmount: 125000, expenseAmount: 0 }, TRANSFER: { incomeAmount: 50000, expenseAmount: 50000 } } };
  const kunlik = omborOqiminiMoslash({
    currency: 'UZS',
    items: [
      { warehouseId: 'a', warehouseName: 'Asosiy', bucket: '2026-10-27', incomeAmount: 137500, expenseAmount: 87500 },
      { warehouseId: 'b', warehouseName: 'Filial', bucket: '2026-10-27', incomeAmount: 50000, expenseAmount: 0 },
      { warehouseId: 'a', warehouseName: 'Asosiy', bucket: '2026-10-26', incomeAmount: 0, expenseAmount: 0 },
    ],
    totals,
  }, 'DAY');
  assert.equal(kunlik.currency, 'UZS');
  // bir kunda ikki ombor = ikki qator; harakat kuni bitta, summalar ombor bo'yicha ajralmaydi
  const harakatlar = oqimdanHarakatlar(kunlik.qatorlar);
  assert.deepEqual(harakatlar.map((h) => [h.kun, h.warehouseId, h.turi, h.summa]), [
    ['2026-10-27', 'a', 'kirim', 137500], ['2026-10-27', 'a', 'chiqim', 87500], ['2026-10-27', 'b', 'kirim', 50000],
  ]);
  const oraliqlar = [{ key: '2026-10-26', nom: '26.10' }, { key: '2026-10-27', nom: '27.10' }];
  assert.deepEqual(oqimdanNuqtalar(kunlik.qatorlar, oraliqlar, 'kirim', 'a').map((n) => n.summa), [0, 137500]);
  assert.deepEqual(oqimdanNuqtalar(kunlik.qatorlar, oraliqlar, 'chiqim', 'b').map((n) => n.summa), [0, 0]);

  const omborlar = omborOqiminiMoslash({
    currency: 'UZS',
    items: [
      { warehouseId: 'a', warehouseName: 'Asosiy', bucket: null, incomeAmount: 137500, expenseAmount: 87500 },
      { warehouseId: 'b', warehouseName: 'Filial', bucket: null, incomeAmount: 50000, expenseAmount: 0 },
    ],
    totals,
  }, 'WAREHOUSE');
  assert.deepEqual(oqimdanOmborlar(omborlar.qatorlar), [
    { nom: 'Asosiy', kirim: 137500, chiqim: 87500 },
    { nom: 'Filial', kirim: 50000, chiqim: 0 },
  ]);

  const oylik = omborOqiminiMoslash({ currency: 'UZS', items: [{ warehouseId: 'a', warehouseName: 'A', bucket: '2026-10', incomeAmount: 5, expenseAmount: 1 }] }, 'MONTH');
  assert.equal(oylik.qatorlar[0].bucket, '2026-10');
  const yillik = omborOqiminiMoslash({ currency: 'UZS', items: [{ warehouseId: 'a', warehouseName: 'A', bucket: '2026', incomeAmount: 5, expenseAmount: 1 }] }, 'YEAR');
  assert.equal(yillik.qatorlar[0].bucket, '2026');
});
