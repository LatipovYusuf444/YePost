import test from 'node:test';
import assert from 'node:assert/strict';
import { qoldiqNarxi, dollarMalumoti, somdagiNarxmi, posSavatValyutasi } from '../src/Components/layout/posMahsulotlari.ts';
import { dollarNarxi, rejimSotuvQatori, sotuvQatori } from '../src/Pages/BoshSahifa/aralashTolov.ts';
import { chegirmadanSotuvNarxi } from '../src/Pages/BoshSahifa/savatchaHisobi.ts';
import { savatchaBirlikQiymatlari } from '../src/lib/kopBirlik.ts';
globalThis.window = { localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } };
globalThis.localStorage = globalThis.window.localStorage;
const { usePosStore } = await import('../src/store/posStore.ts');

// POS (Bosh sahifa) valyuta rejimlari: DUAL — avvalgidek; UZS_ONLY — hammasi so'mda; USD_ONLY — hammasi dollarda, kurs so'ralmaydi.
const DUAL = { rejim: 'DUAL' };
const SOM = { rejim: 'UZS_ONLY', kurs: 12000 };
const DOLLAR = { rejim: 'USD_ONLY' };

// Backend narxda kurs bermagan dollar tovar (kurs kiritilmagan): so'mdagi qiymat yo'q.
const usdKurssiz = {
  modificationId: 'usd', narxAniq: true,
  valyuta: { currency: 'USD', asl: 3.5, kurs: null, uzs: null, ulgurjiCurrency: 'USD', ulgurjiAsl: 3.2, ulgurjiUzs: null },
  modification: { id: 'usd', product: { id: 'p-usd', name: 'Dollar tovar' }, price: { retailPrice: 0, wholesalePrice: 0 } },
};
// Kursli dollar tovar (ikki valyuta rejimidagi kabi).
const usdKursli = {
  modificationId: 'usd2', narxAniq: true,
  valyuta: { currency: 'USD', asl: 10, kurs: 11910, uzs: 119100, ulgurjiCurrency: 'USD', ulgurjiAsl: 8, ulgurjiUzs: 95280 },
  modification: { id: 'usd2', price: { retailPrice: 119100, wholesalePrice: 95280 } },
};
// So'mdagi (eski) narxli tovar.
const somTovar = { modificationId: 'som', narxAniq: true, modification: { id: 'som', price: { retailPrice: 15000, wholesalePrice: 14000 } } };
// Chakana dollarda, ulgurji so'mda alohida.
const aralash = {
  modificationId: 'ar', narxAniq: true,
  valyuta: { currency: 'USD', asl: 10, kurs: 11910, uzs: 119100, ulgurjiCurrency: 'UZS', ulgurjiAsl: 0, ulgurjiUzs: 95000 },
  modification: { id: 'ar', price: { retailPrice: 119100, wholesalePrice: 95000 } },
};

test('DUAL: rejim berilmasa ham, DUAL berilsa ham natija bir xil (avvalgi xatti-harakat)', () => {
  for (const item of [usdKurssiz, usdKursli, somTovar, aralash]) {
    for (const tur of ['chakana', 'ulgurji']) {
      assert.equal(qoldiqNarxi(item, tur, DUAL), qoldiqNarxi(item, tur));
    }
    assert.deepEqual(dollarMalumoti(item, DUAL), dollarMalumoti(item));
  }
  assert.equal(qoldiqNarxi(usdKurssiz, 'chakana'), 0, 'ikki valyutada kurssiz dollar narx sotilmaydi (avvalgidek)');
  const qator = { modificationId: 'a', quantity: 2, price: 119100, discount: 11910, dollar: { narx: 10, kurs: 11910 }, priceType: 'RETAIL' };
  assert.deepEqual(rejimSotuvQatori(qator, null), sotuvQatori(qator));
});

test('USD_ONLY: dollar narx kurs bo‘lmasa ham o‘girilmasdan ishlatiladi, savatcha qatori kurs 1 bilan', () => {
  assert.equal(qoldiqNarxi(usdKurssiz, 'chakana', DOLLAR), 3.5);
  assert.equal(qoldiqNarxi(usdKurssiz, 'ulgurji', DOLLAR), 3.2);
  assert.equal(qoldiqNarxi(usdKursli, 'chakana', DOLLAR), 10, 'kurs bo‘lsa ham so‘mga o‘girilmaydi');
  assert.deepEqual(dollarMalumoti(usdKurssiz, DOLLAR), { valyuta: 'USD', aslNarx: 3.5, aslUlgurjiNarx: 3.2, kurs: 1 });
  assert.equal(somdagiNarxmi(usdKurssiz, 'chakana'), false);
  assert.equal(posSavatValyutasi(DOLLAR), 'USD');
  assert.equal(posSavatValyutasi(SOM), 'UZS');
  assert.equal(posSavatValyutasi(DUAL), 'UZS');
});

test('USD_ONLY: so‘mdagi narx sotilmaydi (0) va sababi aniq — narx so‘mda', () => {
  assert.equal(qoldiqNarxi(somTovar, 'chakana', DOLLAR), 0);
  assert.equal(qoldiqNarxi(somTovar, 'ulgurji', DOLLAR), 0);
  assert.equal(somdagiNarxmi(somTovar, 'chakana'), true);
  assert.deepEqual(dollarMalumoti(somTovar, DOLLAR), {});
  // Chakana dollarda, ulgurji so'mda: chakana sotiladi, ulgurji so'mda bo'lgani uchun — yo'q (chakanaga jimgina o'tilmaydi).
  assert.equal(qoldiqNarxi(aralash, 'chakana', DOLLAR), 10);
  assert.equal(qoldiqNarxi(aralash, 'ulgurji', DOLLAR), 0);
  assert.equal(somdagiNarxmi(aralash, 'ulgurji'), true);
  assert.equal(somdagiNarxmi(aralash, 'chakana'), false);
  // Narx umuman yo'q tovar — "so'mda" emas, oddiy "narx yo'q".
  assert.equal(somdagiNarxmi({ modificationId: 'x', modification: { id: 'x', price: { retailPrice: 0 } } }, 'chakana'), false);
});

test('USD_ONLY: backendga qator, chegirma va valyuta dollarda, o‘girilmasdan', () => {
  const dollar = dollarMalumoti(usdKurssiz, DOLLAR);
  const qator = rejimSotuvQatori(
    { modificationId: 'usd', quantity: 3, price: 3.5, discount: 0.75, dollar: dollarNarxi(dollar, 'chakana'), priceType: 'RETAIL' },
    'USD'
  );
  assert.deepEqual(qator, { modificationId: 'usd', quantity: 3, price: 3.5, discount: 0.75, currency: 'USD', priceType: 'RETAIL' });
});

test('USD_ONLY: pochkada narx dollarda, butun songa yaxlitlanmaydi ($1.25 × 3 = $3.75)', () => {
  const pochka = { unitId: 'u-p', kod: null, nomi: 'pochka', qisqa: 'pochka', kasr: false, koeff: 3, asosiy: false, qabul: true, sotuv: true, chakana: null, ulgurji: null, shtrix: null };
  const q = savatchaBirlikQiymatlari({ chakanaNarx: 1.25, ulgurjiNarx: 0, qoldiq: 30, aslNarx: 1.25, aslUlgurjiNarx: 0, kurs: 1 }, pochka, 'chakana');
  assert.equal(q.narx, 3.75);
  assert.equal(q.aslNarx, 3.75);
});

test('USD_ONLY: ulgurji narxi yo‘q dollar tovar — pochkada ulgurji ham $3.75 ($4 emas)', () => {
  const pochka = { unitId: 'u-p', kod: null, nomi: 'pochka', qisqa: 'pochka', kasr: false, koeff: 3, asosiy: false, qabul: true, sotuv: true, chakana: null, ulgurji: null, shtrix: null };
  const tovar = {
    modificationId: 'u125', narxAniq: true,
    valyuta: { currency: 'USD', asl: 1.25, kurs: null, uzs: null, ulgurjiCurrency: null, ulgurjiAsl: 0, ulgurjiUzs: null },
    modification: { id: 'u125', price: { retailPrice: 0, wholesalePrice: 0 } },
  };
  const dollar = dollarMalumoti(tovar, DOLLAR);
  assert.deepEqual(dollar, { valyuta: 'USD', aslNarx: 1.25, aslUlgurjiNarx: 1.25, kurs: 1 });
  const baza = { chakanaNarx: qoldiqNarxi(tovar, 'chakana', DOLLAR), ulgurjiNarx: qoldiqNarxi(tovar, 'ulgurji', DOLLAR), qoldiq: 30, ...dollar };
  const q = savatchaBirlikQiymatlari(baza, pochka, 'ulgurji');
  assert.equal(q.ulgurjiNarx, 3.75);
  assert.equal(q.narx, 3.75);
  // Ikki valyuta va "Faqat so'm" rejimlarida o'zgarmaydi.
  assert.deepEqual(dollarMalumoti(tovar, DUAL), dollarMalumoti(tovar));
});

test('USD_ONLY: ulgurji narxi so‘mda tovar — ulgurji turiga o‘tkazilsa chakana dollar narxi olinmaydi', () => {
  const dollar = dollarMalumoti(aralash, DOLLAR);
  assert.deepEqual(dollar, { valyuta: 'USD', aslNarx: 10, aslUlgurjiNarx: 0, kurs: 1, ulgurjiSomda: true });
  usePosStore.setState({ cart: [], savatValyutasi: 'USD', narxTuri: 'chakana' });
  usePosStore.getState().addToCart({
    id: 'ar::w1', modificationId: 'ar', nom: 'Aralash', narx: 10, qoldiq: 5, warehouseId: 'w1',
    chakanaNarx: qoldiqNarxi(aralash, 'chakana', DOLLAR), ulgurjiNarx: qoldiqNarxi(aralash, 'ulgurji', DOLLAR), ...dollar,
  });
  usePosStore.getState().setItemNarxTuri('ar::w1', 'ulgurji');
  assert.equal(usePosStore.getState().cart[0].narx, 0, 'narxsiz — kassaga yuborilmaydi');
  usePosStore.getState().updatePriceType('ulgurji');
  assert.equal(usePosStore.getState().cart[0].narx, 0);
  usePosStore.getState().updatePriceType('chakana');
  assert.equal(usePosStore.getState().cart[0].narx, 10);
  usePosStore.setState({ cart: [], savatValyutasi: 'UZS', narxTuri: 'chakana' });
});

test('DUAL: ulgurji narxi so‘mda tovar ulgurji turida avvalgidek so‘mdagi ulgurji narxda', () => {
  const dollar = dollarMalumoti(aralash, DUAL);
  assert.equal(dollar.ulgurjiSomda, true);
  usePosStore.setState({ cart: [], savatValyutasi: 'UZS', narxTuri: 'chakana' });
  usePosStore.getState().addToCart({
    id: 'ar::w1', modificationId: 'ar', nom: 'Aralash', narx: 119100, qoldiq: 5, warehouseId: 'w1',
    chakanaNarx: qoldiqNarxi(aralash, 'chakana'), ulgurjiNarx: qoldiqNarxi(aralash, 'ulgurji'), ...dollar,
  });
  usePosStore.getState().setItemNarxTuri('ar::w1', 'ulgurji');
  assert.equal(usePosStore.getState().cart[0].narx, 95000);
  usePosStore.setState({ cart: [], savatValyutasi: 'UZS', narxTuri: 'chakana' });
});

test('USD_ONLY: chegirmadan sotuv narxi eng kamida 1 sent ($1 emas); so‘mda avvalgidek 1 so‘m', () => {
  assert.equal(chegirmadanSotuvNarxi({ narx: 3.5, soni: 1 }, 3.5, 0.01), 0.01);
  assert.equal(chegirmadanSotuvNarxi({ narx: 3.5, soni: 1 }, 3, 0.01), 0.5);
  assert.equal(chegirmadanSotuvNarxi({ narx: 15000, soni: 1 }, 15000), 1);
});

test('UZS_ONLY: dollar narx kurs bilan so‘mga o‘giriladi (narxda kurs kelmasa do‘kon kursi), qator so‘mda ketadi', () => {
  assert.equal(qoldiqNarxi(usdKurssiz, 'chakana', SOM), 42000);
  assert.equal(qoldiqNarxi(usdKurssiz, 'ulgurji', SOM), 38400);
  assert.equal(qoldiqNarxi(usdKursli, 'chakana', SOM), 119100, 'narxdagi kurs birinchi o‘rinda');
  assert.equal(qoldiqNarxi(somTovar, 'chakana', SOM), 15000);
  assert.equal(qoldiqNarxi(usdKurssiz, 'chakana', { rejim: 'UZS_ONLY' }), 0, 'kurs umuman bo‘lmasa sotilmaydi');
  const dollar = dollarMalumoti(usdKurssiz, SOM);
  assert.deepEqual(dollar, { valyuta: 'USD', aslNarx: 3.5, aslUlgurjiNarx: 3.2, kurs: 12000 });
  const qator = rejimSotuvQatori(
    { modificationId: 'usd', quantity: 2, price: 42000, discount: 1200, dollar: dollarNarxi(dollar, 'chakana'), priceType: 'RETAIL' },
    'UZS'
  );
  // Dollar backendga yuborilmaydi: narx va chegirma so'mda, valyuta UZS.
  assert.deepEqual(qator, { modificationId: 'usd', quantity: 2, price: 42000, discount: 1200, currency: 'UZS', priceType: 'RETAIL' });
});

test('savatcha valyutasi: rejim almashsa eski valyutadagi savatcha tozalanadi, bir xil bo‘lsa tegilmaydi', () => {
  usePosStore.setState({ cart: [], savatValyutasi: 'UZS', narxTuri: 'chakana' });
  usePosStore.getState().addToCart({ id: 'som::w1', modificationId: 'som', nom: 'Som tovar', narx: 15000, chakanaNarx: 15000, ulgurjiNarx: 14000, qoldiq: 5, warehouseId: 'w1' });
  assert.equal(usePosStore.getState().savatValyutasiniMoslash('UZS'), false);
  assert.equal(usePosStore.getState().cart.length, 1);
  assert.equal(usePosStore.getState().savatValyutasiniMoslash('USD'), true, 'mahsulotli savatcha tozalandi');
  assert.equal(usePosStore.getState().cart.length, 0);
  assert.equal(usePosStore.getState().savatValyutasi, 'USD');
  assert.equal(usePosStore.getState().savatValyutasiniMoslash('UZS'), false, 'bo‘sh savatcha — xabar kerak emas');
  assert.equal(usePosStore.getState().savatValyutasi, 'UZS');
});
