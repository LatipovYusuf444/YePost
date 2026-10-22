import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dollarQatnashdimi,
  natijalarYigindisi,
  ortiqchaMaydonlari,
  ortiqchaTahlili,
  qaytimSomda,
  somMatni,
  tolovlarQaytimi,
  tolovNatijasi,
  valyutadaMatn,
} from '../src/lib/tolovOrtiqchasi.ts';

const naqd = (qiymat) => ({ paymentType: 'CASH', qiymat });
const karta = (qiymat) => ({ paymentType: 'CARD', qiymat });
const tahlil = (jami, avvalTolangan, qatorlar, chegara = 1e-6) => ortiqchaTahlili({ jami, avvalTolangan, qatorlar, chegara });

test('ortiqchaTahlili: qarzga teng to‘lov — ortiqcha yo‘q', () => {
  assert.deepEqual(tahlil(828000, 100000, [naqd(728000)]), { ortiqcha: 0, birinchiOshgan: -1, naqdEmas: false });
  assert.deepEqual(tahlil(828000, 100000, [naqd(300000), naqd(428000)]), { ortiqcha: 0, birinchiOshgan: -1, naqdEmas: false });
});

test('ortiqchaTahlili: qarz 728 000 so‘m, mijoz 100$ beradi (kurs 10 670) — 339 000 so‘m ortiqcha, naqd', () => {
  const natija = tahlil(828000, 100000, [naqd(100 * 10670)]);
  assert.equal(natija.ortiqcha, 339000);
  assert.equal(natija.birinchiOshgan, 0);
  assert.equal(natija.naqdEmas, false);
});

test('ortiqchaTahlili: ortiqchani boshlagan qator indeksi va keyingi qatorlar', () => {
  // 1-qator qarzni to‘liq yopadi (ortiqcha yo‘q), 2-qator ortiqchani boshlaydi.
  const natija = tahlil(1000, 0, [naqd(600), naqd(400), naqd(250)]);
  assert.equal(natija.birinchiOshgan, 2);
  assert.equal(natija.ortiqcha, 250);
  // Qarz birinchi qatorning o‘zida oshadi.
  assert.equal(tahlil(1000, 0, [naqd(1200), naqd(50)]).birinchiOshgan, 0);
});

test('ortiqchaTahlili: ortiqchani karta/bank/hisob hosil qilsa naqdEmas (backend 400)', () => {
  assert.equal(tahlil(1000, 0, [karta(1500)]).naqdEmas, true);
  assert.equal(tahlil(1000, 0, [{ paymentType: 'BANK', qiymat: 1001 }]).naqdEmas, true);
  assert.equal(tahlil(1000, 0, [{ paymentType: 'BALANCE', qiymat: 2000 }]).naqdEmas, true);
  // Karta qarzni aniq yopadi, ortiqchani naqd hosil qiladi — ruxsat.
  assert.equal(tahlil(1000, 0, [karta(1000), naqd(100)]).naqdEmas, false);
  // Naqd ortiqchani boshlagach, undan keyingi karta qatori ham ortiqcha bo‘ladi — rad etiladi.
  assert.equal(tahlil(1000, 0, [naqd(1200), karta(50)]).naqdEmas, true);
});

test('ortiqchaTahlili: avvalgi to‘lov sotuv jamidan oshmaydigan qismi olinadi — eski qaytim yangi ortiqcha emas', () => {
  // Sotuv 90 000, tasdiqlashda 100 000 berilib 10 000 qaytim qaytarilgan: avvalTolangan = min(100 000, 90 000) = jami.
  assert.equal(tahlil(90000, Math.min(100000, 90000), []).ortiqcha, 0);
  // Qarz yo‘q sotuvga har qanday yangi to‘lov — ortiqcha.
  assert.equal(tahlil(90000, 90000, [naqd(5000)]).ortiqcha, 5000);
});

test('ortiqchaTahlili: chegaradagi farq (yaxlitlash shovqini) ortiqcha emas; nol qatorlar o‘tkaziladi', () => {
  assert.equal(tahlil(1000, 0, [naqd(1000.4)], 1).ortiqcha, 0);
  assert.equal(tahlil(1000, 0, [naqd(1002)], 1).ortiqcha, 2);
  const natija = tahlil(1000, 0, [naqd(0), naqd(1200)]);
  assert.equal(natija.birinchiOshgan, 1);
});

test('dollarQatnashdimi: sotuv yoki qatorlardan biri dollarda', () => {
  assert.equal(dollarQatnashdimi('UZS', ['UZS', 'UZS']), false);
  assert.equal(dollarQatnashdimi('UZS', ['UZS', 'USD']), true);
  assert.equal(dollarQatnashdimi('USD', []), true);
  assert.equal(dollarQatnashdimi('UZS', []), false);
});

test('qaytimSomda: so‘m sotuvda ortiqcha o‘zi; dollar qatnashsa eng yaqin minggacha, o‘chirilsa aniq', () => {
  const asos = { sotuvValyutasi: 'UZS', kurs: 10670 };
  assert.equal(qaytimSomda({ ...asos, ortiqcha: 339000, dollarQatnashdi: true, yaxlitlash: true }), 339000);
  assert.equal(qaytimSomda({ ...asos, ortiqcha: 339400, dollarQatnashdi: true, yaxlitlash: true }), 339000);
  assert.equal(qaytimSomda({ ...asos, ortiqcha: 339500, dollarQatnashdi: true, yaxlitlash: true }), 340000);
  assert.equal(qaytimSomda({ ...asos, ortiqcha: 339400, dollarQatnashdi: true, yaxlitlash: false }), 339400);
  // Dollar qatnashmagan naqd to‘lovda yaxlitlash qo‘llanmaydi.
  assert.equal(qaytimSomda({ ...asos, ortiqcha: 339400, dollarQatnashdi: false, yaxlitlash: true }), 339400);
  assert.equal(qaytimSomda({ ...asos, ortiqcha: 0, dollarQatnashdi: true, yaxlitlash: true }), 0);
});

test('qaytimSomda: dollardagi sotuvda ortiqcha bugungi kurs bilan so‘mga o‘giriladi (kurs yo‘q — 0)', () => {
  assert.equal(qaytimSomda({ ortiqcha: 31.77, sotuvValyutasi: 'USD', kurs: 10670, dollarQatnashdi: true, yaxlitlash: true }), 339000);
  assert.equal(qaytimSomda({ ortiqcha: 31.77, sotuvValyutasi: 'USD', kurs: 10670, dollarQatnashdi: true, yaxlitlash: false }), 338986);
  assert.equal(qaytimSomda({ ortiqcha: 31.77, sotuvValyutasi: 'USD', kurs: 0, dollarQatnashdi: true, yaxlitlash: true }), 0);
});

test('ortiqchaMaydonlari: faqat ortiqcha bo‘lsa va faqat standartdan farq qilsa yuboriladi', () => {
  const asos = { ortiqcha: 339000, mijozBor: true, dollarQatnashdi: false, yaxlitlash: true };
  assert.deepEqual(ortiqchaMaydonlari({ ...asos, hisobgaYozish: false }), {});
  assert.deepEqual(ortiqchaMaydonlari({ ...asos, hisobgaYozish: true }), { keepExcess: true });
  assert.deepEqual(ortiqchaMaydonlari({ ...asos, ortiqcha: 0, hisobgaYozish: true }), {});
  // Mijozsiz sotuvda keepExcess yuborilmaydi (backend 400 beradi).
  assert.deepEqual(ortiqchaMaydonlari({ ...asos, mijozBor: false, hisobgaYozish: true }), {});
  // Dollar qatnashsa aniq qaytim uchun roundChange: false; hisobga o‘tkazishda yaxlitlash ma'nosiz.
  assert.deepEqual(ortiqchaMaydonlari({ ...asos, dollarQatnashdi: true, yaxlitlash: false, hisobgaYozish: false }), { roundChange: false });
  assert.deepEqual(ortiqchaMaydonlari({ ...asos, dollarQatnashdi: true, yaxlitlash: false, hisobgaYozish: true }), { keepExcess: true });
  assert.deepEqual(ortiqchaMaydonlari({ ...asos, dollarQatnashdi: true, yaxlitlash: true, hisobgaYozish: false }), {});
  assert.deepEqual(ortiqchaMaydonlari({ ...asos, mijozBor: false, dollarQatnashdi: true, yaxlitlash: false, hisobgaYozish: true }), { roundChange: false });
});

test('tolovNatijasi: change va keptAmount (ildizda yoki data ichida), "0" va yo‘q maydon — 0', () => {
  assert.deepEqual(tolovNatijasi({ id: 's1', change: '339000', keptAmount: '0' }), { qaytim: 339000, hisobga: 0 });
  assert.deepEqual(tolovNatijasi({ success: true, data: { id: 's1', change: '0', keptAmount: '12.5' } }), { qaytim: 0, hisobga: 12.5 });
  assert.deepEqual(tolovNatijasi({ id: 's1' }), { qaytim: 0, hisobga: 0 });
  assert.deepEqual(tolovNatijasi({ change: 0, keptAmount: null }), { qaytim: 0, hisobga: 0 });
  assert.deepEqual(tolovNatijasi({ change: '339 000,50' }), { qaytim: 339000.5, hisobga: 0 });
  assert.deepEqual(tolovNatijasi({ change: 'abc', keptAmount: -5 }), { qaytim: 0, hisobga: 0 });
  assert.deepEqual(tolovNatijasi(null), { qaytim: 0, hisobga: 0 });
  assert.deepEqual(tolovNatijasi(undefined), { qaytim: 0, hisobga: 0 });
  assert.deepEqual(tolovNatijasi([]), { qaytim: 0, hisobga: 0 });
});

test('tolovNatijasi: qarz to‘lovi (debt-repayment) natijasi — change va excessToBalance', () => {
  assert.deepEqual(tolovNatijasi({ change: '1000', excessToBalance: '2500' }), { qaytim: 1000, hisobga: 2500 });
  assert.deepEqual(tolovNatijasi({ data: { change: '0', excessToBalance: '0' } }), { qaytim: 0, hisobga: 0 });
});

test('natijalarYigindisi va tolovlarQaytimi: ketma-ket to‘lovlar qaytimi qo‘shiladi', () => {
  assert.deepEqual(natijalarYigindisi([{ qaytim: 1000, hisobga: 0 }, { qaytim: 500, hisobga: 20 }]), { qaytim: 1500, hisobga: 20 });
  assert.deepEqual(natijalarYigindisi([]), { qaytim: 0, hisobga: 0 });
  assert.deepEqual(
    tolovlarQaytimi([{ changeAmount: '339000' }, { keptAmount: 5 }, {}, { changeAmount: '0', keptAmount: null }]),
    { qaytim: 339000, hisobga: 5 }
  );
  assert.deepEqual(tolovlarQaytimi(undefined), { qaytim: 0, hisobga: 0 });
  assert.deepEqual(tolovlarQaytimi(null), { qaytim: 0, hisobga: 0 });
});

test('somMatni: butun so‘mgacha yaxlitlanib, "so‘m" bilan', () => {
  const tozala = (matn) => matn.replace(/[\s  ,]/g, '');
  assert.equal(tozala(somMatni(339000, "so'm")), "339000so'm");
  assert.equal(tozala(somMatni(338985.9, "so'm")), "338986so'm");
  assert.equal(tozala(somMatni(0, 'сум')), '0сум');
});

test('valyutadaMatn: summa o‘z valyutasida (ko‘rinish valyutasiga o‘girilmasdan): UZS — so‘m, USD — $', () => {
  const tozala = (matn) => matn.replace(/[\s  ,]/g, '');
  // Kasr belgisi tilga bog‘liq (uz-UZ — vergul): bu yerda faqat bo‘shliqlar olib tashlanadi.
  const bosh = (matn) => matn.replace(/\s/g, '');
  assert.equal(tozala(valyutadaMatn(728000, 'UZS', "so'm")), "728000so'm");
  assert.equal(tozala(valyutadaMatn(228000.4, 'UZS', "so'm")), "228000so'm");
  assert.match(bosh(valyutadaMatn(60.169, 'USD', "so'm")), /^\$60[.,]17$/);
  assert.equal(tozala(valyutadaMatn(100, 'USD', "so'm")), '$100');
  assert.equal(tozala(valyutadaMatn(1000, 'bu_noma‘lum', 'сум')), '1000сум');
});
