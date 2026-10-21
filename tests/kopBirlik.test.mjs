import test from 'node:test';
import assert from 'node:assert/strict';
import {
  asosiyMiqdor, birliklarniMoslash, birliklarTanasi, birliklarXatosi, birlikdagiMiqdor, birlikNarxi, birlikTopish,
  koeffTekshiruvi, miqdorYaroqlimi, qatorBirligida, qatorMiqdoriMatni, qatorniQaytaYuborish, qoldiqTaqsimotiMatni, qaytariladiganQatorBirligida, pochkaOgirligi, qabulBirliklari, qoldiqMatni, shtrixBirligi, sotuvBirliklari,
} from '../src/lib/kopBirlik.ts';

// Backend GET /catalog/products/:id/units javobi (factor satr, asosiy birlik birinchi).
const XOM = [
  { unitId: 'u-kg', code: 'KGM', name: 'Kilogramm', shortName: 'kg', isFractional: true, factor: '1', isBase: true, canReceive: true, canSell: true, retailPrice: null, wholesalePrice: null, barcode: null },
  { unitId: 'u-pochka', name: 'pochka', shortName: 'pochka', factor: '0.403333', isBase: false, canReceive: false, canSell: true, retailPrice: '6000', wholesalePrice: null, barcode: ' POCHKA-1 ' },
  { unitId: 'u-qop', name: 'qop', factor: '24.2', isBase: false, canReceive: true, canSell: false, retailPrice: null, wholesalePrice: null, barcode: null },
];
const birliklar = birliklarniMoslash(XOM);

test('birliklarni moslash: factor songa, asosiy birinchi, qisqa nom nomga qaytadi, shtrix-kod tozalanadi', () => {
  assert.equal(birliklar.length, 3);
  assert.equal(birliklar[0].asosiy, true);
  assert.equal(birliklar[1].koeff, 0.403333);
  assert.equal(birliklar[1].chakana, 6000);
  assert.equal(birliklar[1].shtrix, 'POCHKA-1');
  assert.equal(birliklar[2].qisqa, 'qop');
  assert.equal(birliklar[0].kasr, true);
  // aralash tartib va o'ralgan javob
  assert.deepEqual(birliklarniMoslash({ data: [...XOM].reverse() }).map((b) => b.unitId), ['u-kg', 'u-pochka', 'u-qop']);
});

test('yaroqsiz yozuvlar tashlanadi: id yo‘q, factor 0 yoki manfiy, ro‘yxat emas', () => {
  assert.deepEqual(birliklarniMoslash([{ name: 'x', factor: '2' }, { unitId: 'a', factor: '0' }, { unitId: 'b', factor: '-1' }, null]), []);
  assert.deepEqual(birliklarniMoslash(undefined), []);
  assert.deepEqual(birliklarniMoslash({}), []);
});

test('sotuv va kirim birliklari: ruxsat bo‘yicha; faqat asosiy birlik bo‘lsa tanlov yo‘q', () => {
  assert.deepEqual(sotuvBirliklari(birliklar).map((b) => b.unitId), ['u-kg', 'u-pochka']);
  assert.deepEqual(qabulBirliklari(birliklar).map((b) => b.unitId), ['u-kg', 'u-qop']);
  assert.deepEqual(sotuvBirliklari([birliklar[0]]), []);
  assert.deepEqual(sotuvBirliklari(undefined), []);
});

test('asosiy birlikdagi miqdor: pochka 10 → 4.03333 kg; asosiy yoki birlik yo‘q bo‘lsa o‘zgarmaydi; teskari hisob', () => {
  const pochka = birlikTopish(birliklar, 'u-pochka');
  assert.equal(asosiyMiqdor(pochka, 10), 4.03333);
  assert.equal(asosiyMiqdor(birliklar[0], 2.5), 2.5);
  assert.equal(asosiyMiqdor(undefined, 7), 7);
  assert.equal(birlikdagiMiqdor(pochka, 4.03333), 10);
  assert.equal(birlikdagiMiqdor(undefined, 3), 3);
});

test('miqdor yaroqliligi: qo‘shimcha birlikda faqat butun (kasrli birlik bundan mustasno), asosiyda kasr mumkin', () => {
  const korobka = { ...birliklar[2], kasr: false };
  assert.equal(miqdorYaroqlimi(korobka, 2), true);
  assert.equal(miqdorYaroqlimi(korobka, 1.5), false);
  assert.equal(miqdorYaroqlimi({ ...korobka, kasr: true }, 1.5), true);
  assert.equal(miqdorYaroqlimi(birliklar[0], 0.5), true);
  assert.equal(miqdorYaroqlimi(undefined, 1.25), true);
  assert.equal(miqdorYaroqlimi(korobka, 0), false);
});

test('birlik narxi: o‘z narxi bo‘lsa shu, bo‘lmasa asosiy × koeff; dollarning so‘mdagi qiymati proporsional', () => {
  const som = { valyuta: 'UZS', asl: 27000, som: 27000 };
  const pochka = birlikTopish(birliklar, 'u-pochka');
  const qop = birlikTopish(birliklar, 'u-qop');
  assert.deepEqual(birlikNarxi(som, pochka, 'RETAIL'), { valyuta: 'UZS', asl: 6000, som: Math.round(27000 * 6000 / 27000) });
  // ulgurji narxi yo'q → asosiy × koeff
  assert.equal(birlikNarxi(som, pochka, 'WHOLESALE').asl, Math.round(27000 * 0.403333 * 100) / 100);
  assert.equal(birlikNarxi(som, qop, 'RETAIL').asl, 27000 * 24.2);
  const dollar = { valyuta: 'USD', asl: 100, som: 1191000 };
  const qopDollar = birlikNarxi(dollar, qop, 'RETAIL');
  assert.equal(qopDollar.asl, 2420);
  assert.equal(qopDollar.som, 1191000 * 24.2);
  // asosiy birlik, narx yo'q va birlik yo'q holatlari o'zgarmaydi
  assert.equal(birlikNarxi(som, birliklar[0], 'RETAIL'), som);
  assert.equal(birlikNarxi(som, undefined, 'RETAIL'), som);
  assert.equal(birlikNarxi(null, pochka, 'RETAIL'), null);
  // tannarx birlikning o'z narxini ishlatmaydi
  assert.equal(birlikNarxi(som, pochka, 'COST').asl, Math.round(27000 * 0.403333 * 100) / 100);
});

// GET /catalog/modifications/search: har bir birlikda backend hisoblagan narx (o'z narxi, bo'lmasa asosiy × koeff).
const QIDIRUV_BIRLIKLARI = [
  { unitId: 'u-kg', name: 'kg', shortName: 'kg', factor: 1, isBase: true, canReceive: true, canSell: true },
  { unitId: 'u-k', name: 'korobka', shortName: 'korobka', factor: 3, isBase: false, canReceive: true, canSell: true, retailPrice: null, wholesalePrice: null,
    effectiveRetailPrice: '53100', effectiveWholesalePrice: 48000, currency: 'UZS', wholesaleCurrency: 'uzs', effectiveRetailPriceUzs: null, effectiveWholesalePriceUzs: null },
];

test('backend birlik narxi (effective*): o‘qiladi, o‘z narxi (retailPrice) bilan aralashmaydi va PUT tanasiga tushmaydi', () => {
  const [kg, korobka] = birliklarniMoslash(QIDIRUV_BIRLIKLARI);
  assert.deepEqual(korobka.samarali, { chakana: 53100, ulgurji: 48000, chakanaValyuta: 'UZS', ulgurjiValyuta: 'UZS', chakanaSom: null, ulgurjiSom: null });
  assert.equal(korobka.chakana, null);
  assert.equal(korobka.ulgurji, null);
  assert.equal(kg.samarali, undefined);
  // effective narx faqat sotuv uchun: mahsulotni saqlashda birlikning o'z narxi sifatida yuborilmaydi
  assert.deepEqual(birliklarTanasi([kg, korobka]).units[0], { unitId: 'u-k', factor: 3, canReceive: true, canSell: true, retailPrice: null, wholesalePrice: null, barcode: null });
  // narx maydonlari yo'q (/units, bir nechta variant) — samarali yo'q
  assert.equal(birliklarniMoslash([{ unitId: 'u-k', factor: 3, effectiveRetailPrice: null, effectiveWholesalePrice: null }])[0].samarali, undefined);
});

test('birlik narxi: backend narxi (effective*) birinchi o‘rinda; valyuta mos kelmasa yoki yo‘q bo‘lsa eski hisob', () => {
  const [, korobka] = birliklarniMoslash(QIDIRUV_BIRLIKLARI);
  const som = { valyuta: 'UZS', asl: 17700, som: 17700 };
  // 17 700 × 3 = 53 100 (backend bilan bir xil)
  assert.deepEqual(birlikNarxi(som, korobka, 'RETAIL'), { valyuta: 'UZS', asl: 53100, som: 53100 });
  assert.deepEqual(birlikNarxi(som, korobka, 'WHOLESALE'), { valyuta: 'UZS', asl: 48000, som: 48000 });
  // backend narxi formuladan farq qilsa — backendniki (sotuvda "17 700" emas, korobka narxi)
  const boshqa = { ...korobka, samarali: { ...korobka.samarali, chakana: 50000 } };
  assert.equal(birlikNarxi(som, boshqa, 'RETAIL').asl, 50000);
  // tannarx backend narxini ishlatmaydi
  assert.equal(birlikNarxi(som, korobka, 'COST').asl, 53100);
  // valyuta mos kelmasa (so'mdagi narx, backend dollar yozgan) — eski formula
  const dollarBelgili = { ...korobka, samarali: { ...korobka.samarali, chakana: 15, chakanaValyuta: 'USD' } };
  assert.equal(birlikNarxi(som, dollarBelgili, 'RETAIL').asl, 53100);
  // dollar narx: so'mdagi qiymat backenddan, kelmasa proporsional
  const dollar = { valyuta: 'USD', asl: 5, som: 60000 };
  const dollarBirlik = { ...korobka, samarali: { chakana: 15, ulgurji: null, chakanaValyuta: 'USD', ulgurjiValyuta: null, chakanaSom: 181000, ulgurjiSom: null } };
  assert.deepEqual(birlikNarxi(dollar, dollarBirlik, 'RETAIL'), { valyuta: 'USD', asl: 15, som: 181000 });
  assert.deepEqual(birlikNarxi(dollar, { ...dollarBirlik, samarali: { ...dollarBirlik.samarali, chakanaSom: null } }, 'RETAIL'), { valyuta: 'USD', asl: 15, som: 180000 });
  // backend narxi bo'lmagan birlik avvalgidek
  assert.equal(birlikNarxi(som, { ...korobka, samarali: undefined }, 'RETAIL').asl, 53100);
});

test('qoldiq matni: "45 pochka 20 dona" ko‘rinishi; katta birlik bo‘lmasa faqat asosiy', () => {
  const dona = birliklarniMoslash([
    { unitId: 'd', name: 'dona', shortName: 'dona', factor: '1', isBase: true },
    { unitId: 'p', name: 'pochka', shortName: 'pochka', factor: '50', isBase: false },
  ]);
  assert.equal(qoldiqMatni(2270, dona), '45 pochka 20 dona');
  assert.equal(qoldiqMatni(2250, dona), '45 pochka');
  assert.equal(qoldiqMatni(30, dona), '30 dona');
  assert.equal(qoldiqMatni(30, [dona[0]]), '30 dona');
  assert.equal(qoldiqMatni(5, undefined), '5');
});

test('shtrix-kod qo‘shimcha birlikni topadi (faqat sotiladigan, harf registri farqsiz)', () => {
  assert.equal(shtrixBirligi(birliklar, 'pochka-1').unitId, 'u-pochka');
  assert.equal(shtrixBirligi(birliklar, 'yoq'), undefined);
  assert.equal(shtrixBirligi(birliklar, ''), undefined);
});

test('PUT tanasi: asosiy birlik yuborilmaydi, qolganlari maydonlari bilan', () => {
  assert.deepEqual(birliklarTanasi(birliklar), { units: [
    { unitId: 'u-pochka', factor: 0.403333, canReceive: false, canSell: true, retailPrice: 6000, wholesalePrice: null, barcode: 'POCHKA-1' },
    { unitId: 'u-qop', factor: 24.2, canReceive: true, canSell: false, retailPrice: null, wholesalePrice: null, barcode: null },
  ] });
  assert.deepEqual(birliklarTanasi([birliklar[0]]), { units: [] });
});

test('kartochka tekshiruvi: takrorlangan birlik va noto‘g‘ri koeffitsient', () => {
  assert.equal(birliklarXatosi(birliklar), null);
  assert.equal(birliklarXatosi([...birliklar, birliklar[1]]), 'unitDuplicate');
  assert.equal(birliklarXatosi([birliklar[0], { ...birliklar[1], koeff: 0 }]), 'factorInvalid');
});

test('1 pochka og‘irligi = jami og‘irlik ÷ pochkalar soni (24,2 kg / 60 = 0,403333)', () => {
  assert.equal(pochkaOgirligi(24.2, 60), 0.403333);
  assert.equal(pochkaOgirligi(0, 60), null);
  assert.equal(pochkaOgirligi(24.2, 0), null);
});

test('kirimda koeffitsient tekshiruvi: 50 kg / 120 pochka = 0.416667, kartochkada 0.403333 → farq 3.31% (ogohlantirish)', () => {
  const natija = koeffTekshiruvi(50, 120, 0.403333);
  assert.equal(natija.haqiqiy, 0.416667);
  assert.equal(natija.farqFoiz, 3.31);
  assert.equal(natija.ogohlantirish, true);
  // 2% dan kam farq ogohlantirmaydi (24.2 kg / 60 pochka = 0.403333)
  const mos = koeffTekshiruvi(24.2, 60, 0.403333);
  assert.equal(mos.ogohlantirish, false);
  assert.equal(koeffTekshiruvi(0, 60, 0.4), null);
  assert.equal(koeffTekshiruvi(24.2, 0, 0.4), null);
  assert.equal(koeffTekshiruvi(24.2, 60, 0), null);
});

// Backend sotuv qatori: quantity/price asosiy birlikda, unit* — kiritilgan birlikda (10 pochka × 12 000, 1 pochka = 50 dona).
const POCHKA_QATORI = { quantity: 500, price: 240, unitId: 'u-p', unitName: 'pochka', unitQuantity: '10', unitPrice: '12000', factorSnapshot: '50' };

test('qator birlikda ko‘rsatiladi: 10 pochka × 12 000; birliksiz qator asosiy birlikda', () => {
  assert.deepEqual(qatorBirligida(POCHKA_QATORI), { miqdor: 10, narx: 12000, birlik: 'pochka', unitId: 'u-p' });
  assert.deepEqual(qatorBirligida({ quantity: '5', price: '3000' }), { miqdor: 5, narx: 3000, birlik: null, unitId: null });
  assert.match(qatorMiqdoriMatni(POCHKA_QATORI), /^10 pochka$/);
  assert.equal(qatorMiqdoriMatni({ quantity: 2.5, price: 1 }), '2,5');
});

test('qatorni qayta yuborish: pochka qatori birlikdagi son/narx va unitId bilan (taqsimlangan narx yuborilmaydi)', () => {
  assert.deepEqual(qatorniQaytaYuborish(POCHKA_QATORI), { quantity: 10, price: 12000, unitId: 'u-p' });
  assert.deepEqual(qatorniQaytaYuborish({ quantity: '5', price: '3000' }), { quantity: 5, price: 3000 });
  // birlik ma'lumoti to'liq bo'lmasa asosiy birlikdagi qiymat yuboriladi
  assert.deepEqual(qatorniQaytaYuborish({ quantity: 500, price: 240, unitId: 'u-p', unitQuantity: null, unitPrice: null }), { quantity: 500, price: 240 });
  // narx 0 (sovg'a) bo'lsa ham birlik saqlanadi
  assert.deepEqual(qatorniQaytaYuborish({ quantity: 50, price: 0, unitId: 'u-p', unitQuantity: 1, unitPrice: 0 }), { quantity: 1, price: 0, unitId: 'u-p' });
});

test('qoldiq taqsimoti: "2 qop 4,367 kg" va "≈ 130,83 pochka · 2,18 qop"; taqsimot yo‘q bo‘lsa null', () => {
  const natija = qoldiqTaqsimotiMatni({
    breakdown: { unitName: 'qop', count: 2, remainder: 4.367 },
    approx: [{ unitName: 'pochka', quantity: 130.83 }, { unitName: 'qop', quantity: 2.18 }],
  }, 'kg');
  assert.equal(natija.bolingan, '2 qop 4,367 kg');
  assert.equal(natija.taxminan, '≈ 130,83 pochka · 2,18 qop');
  // qoldiq butun qopga teng: qoldiqsiz
  assert.equal(qoldiqTaqsimotiMatni({ breakdown: { unitName: 'qop', count: '3', remainder: '0' } }, 'kg').bolingan, '3 qop');
  // bitta birlikli tovar: breakdown null, approx bo'sh
  assert.deepEqual(qoldiqTaqsimotiMatni({ breakdown: null, approx: [] }, 'dona'), { bolingan: null, taxminan: null });
  assert.deepEqual(qoldiqTaqsimotiMatni({}, 'dona'), { bolingan: null, taxminan: null });
  // hali bir butun qopga yetmagan
  assert.equal(qoldiqTaqsimotiMatni({ breakdown: { unitName: 'qop', count: 0, remainder: 4 } }, 'kg').bolingan, null);
});

test('qaytarish: pochkada sotilgan qator birlikdagi miqdor bilan (10 pochkadan 7 qolgan); oddiy qator o‘zgarmaydi', () => {
  const birlikli = qaytariladiganQatorBirligida({ soldQuantity: 500, returnedQuantity: 150, remainingQuantity: 350, unitId: 'u-p', unitName: 'pochka', unitQuantity: '10', unitRemainingQuantity: '7' });
  assert.deepEqual(birlikli, { birlikda: true, birlik: 'pochka', sotilgan: 10, oldin: 3, qolgan: 7 });
  const oddiy = qaytariladiganQatorBirligida({ soldQuantity: '5', returnedQuantity: '1', remainingQuantity: '4' });
  assert.deepEqual(oddiy, { birlikda: false, birlik: null, sotilgan: '5', oldin: '1', qolgan: '4' });
  // unit* to'liq bo'lmasa asosiy birlikdagi maydonlar
  assert.equal(qaytariladiganQatorBirligida({ soldQuantity: 500, unitId: 'u-p', unitQuantity: 10 }).birlikda, false);
  assert.equal(qaytariladiganQatorBirligida({ soldQuantity: 500, remainingQuantity: 0, unitId: 'u-p', unitQuantity: 10, unitRemainingQuantity: 0 }).qolgan, 0);
});
