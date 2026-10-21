import test from 'node:test';
import assert from 'node:assert/strict';
import { savatchaBirlikQiymatlari } from '../src/lib/kopBirlik.ts';
globalThis.window = { localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } };
const { usePosStore } = await import('../src/store/posStore.ts');

const dona = { unitId: 'u-d', kod: null, nomi: 'dona', qisqa: 'dona', kasr: false, koeff: 1, asosiy: true, qabul: true, sotuv: true, chakana: null, ulgurji: null, shtrix: null };
const pochka = { unitId: 'u-p', kod: null, nomi: 'pochka', qisqa: 'pochka', kasr: false, koeff: 50, asosiy: false, qabul: true, sotuv: true, chakana: 12000, ulgurji: null, shtrix: null };
const kg = { unitId: 'u-kg', kod: null, nomi: 'kg', qisqa: 'kg', kasr: true, koeff: 124, asosiy: false, qabul: true, sotuv: true, chakana: null, ulgurji: null, shtrix: null };
const BAZA = { chakanaNarx: 270, ulgurjiNarx: 250, qoldiq: 2270 };

test('savatcha birlikda: pochka o‘z narxi (12 000), ulgurji asosiy × koeff, qoldiq butun pochkada', () => {
  const q = savatchaBirlikQiymatlari(BAZA, pochka, 'chakana');
  assert.deepEqual(q, { chakanaNarx: 12000, ulgurjiNarx: 12500, narx: 12000, qoldiq: 45 });
  assert.equal(savatchaBirlikQiymatlari(BAZA, pochka, 'ulgurji').narx, 12500);
  // asosiy birlik yoki birlik yo'q: o'zgarmaydi
  assert.deepEqual(savatchaBirlikQiymatlari(BAZA, dona, 'chakana'), { chakanaNarx: 270, ulgurjiNarx: 250, narx: 270, qoldiq: 2270 });
  assert.equal(savatchaBirlikQiymatlari(BAZA, undefined, 'ulgurji').narx, 250);
});

test('savatcha birlikda: kg kabi kasrli birlikda qoldiq kasr (3 xona), narx asosiy × koeff', () => {
  const q = savatchaBirlikQiymatlari(BAZA, kg, 'chakana');
  assert.equal(q.qoldiq, 18.306);
  assert.equal(q.chakanaNarx, 270 * 124);
});

test('savatcha birlikda: dollar narx birlikka o‘tadi (1.2 $ × 50 = 60 $, so‘mda kurs bilan), kurs yo‘q bo‘lsa so‘mdagi narx × koeff', () => {
  const dollar = { chakanaNarx: 14400, ulgurjiNarx: 0, qoldiq: 100, aslNarx: 1.2, kurs: 12000 };
  const q = savatchaBirlikQiymatlari(dollar, { ...pochka, chakana: null }, 'chakana');
  assert.equal(q.aslNarx, 60);
  assert.equal(q.chakanaNarx, 720000);
  // ulgurji so'mda alohida (dollar emas)
  const aralash = { chakanaNarx: 14400, ulgurjiNarx: 13000, qoldiq: 100, aslNarx: 1.2, kurs: 12000 };
  assert.equal(savatchaBirlikQiymatlari(aralash, { ...pochka, chakana: null }, 'ulgurji').narx, 650000);
  // birlikning o'z narxi dollarda: asl narx shu, so'mi kurs bilan
  assert.deepEqual(savatchaBirlikQiymatlari(dollar, { ...pochka, chakana: 55 }, 'chakana').aslNarx, 55);
  assert.equal(savatchaBirlikQiymatlari(dollar, { ...pochka, chakana: 55 }, 'chakana').chakanaNarx, 660000);
});

test('savatcha birlikda: backend hisoblagan narx (effective*) birinchi o‘rinda, valyuta mos kelmasa eski hisob', () => {
  const samarali = (qism) => ({ chakana: null, ulgurji: null, chakanaValyuta: null, ulgurjiValyuta: null, chakanaSom: null, ulgurjiSom: null, ...qism });
  const korobka = { ...pochka, koeff: 3, chakana: null, samarali: samarali({ chakana: 53100, ulgurji: 50000 }) };
  const som = { chakanaNarx: 17700, ulgurjiNarx: 16000, qoldiq: 100 };
  assert.deepEqual(savatchaBirlikQiymatlari(som, korobka, 'chakana'), { chakanaNarx: 53100, ulgurjiNarx: 50000, narx: 53100, qoldiq: 33 });
  // backend narxi formuladan farq qilsa — backendniki
  assert.equal(savatchaBirlikQiymatlari(som, { ...korobka, samarali: samarali({ chakana: 50000 }) }, 'chakana').chakanaNarx, 50000);
  // so'mdagi savatchada dollar belgili backend narxi ishlatilmaydi
  assert.equal(savatchaBirlikQiymatlari(som, { ...korobka, samarali: samarali({ chakana: 15, chakanaValyuta: 'USD' }) }, 'chakana').chakanaNarx, 53100);
  // dollar narx: asl narx backenddan, so'mi backenddagi so'm qiymatdan (yo'q bo'lsa kurs bilan)
  const dollar = { chakanaNarx: 14400, ulgurjiNarx: 0, qoldiq: 100, aslNarx: 1.2, kurs: 12000 };
  const dollarBirlik = { ...korobka, samarali: samarali({ chakana: 3.5, chakanaValyuta: 'USD', chakanaSom: 42500 }) };
  const q = savatchaBirlikQiymatlari(dollar, dollarBirlik, 'chakana');
  assert.equal(q.aslNarx, 3.5);
  assert.equal(q.chakanaNarx, 42500);
  assert.equal(savatchaBirlikQiymatlari(dollar, { ...dollarBirlik, samarali: samarali({ chakana: 3.5, chakanaValyuta: 'USD' }) }, 'chakana').chakanaNarx, 42000);
});

const element = (extra = {}) => ({ id: 'a::w1', modificationId: 'a', nom: 'Paket', narx: 270, chakanaNarx: 270, ulgurjiNarx: 250, qoldiq: 2270, warehouseId: 'w1', birliklar: [dona, pochka], ...extra });

test('store: pochkaga o‘tganda narx, qoldiq va miqdor yangi birlikda; asosiyga qaytganda hammasi tiklanadi', () => {
  usePosStore.setState({ cart: [], narxTuri: 'chakana' });
  usePosStore.getState().addToCart(element(), 3);
  usePosStore.getState().setSotuvNarxi('a::w1', 300);
  usePosStore.getState().setBirlik('a::w1', 'u-p');
  let qator = usePosStore.getState().cart[0];
  assert.equal(qator.birlikId, 'u-p'); assert.equal(qator.narx, 12000); assert.equal(qator.qoldiq, 45); assert.equal(qator.soni, 3);
  assert.equal(qator.sotuvNarxi, undefined);
  usePosStore.getState().updateQuantity('a::w1', 100);
  assert.equal(usePosStore.getState().cart[0].soni, 45);
  usePosStore.getState().setBirlik('a::w1', '');
  qator = usePosStore.getState().cart[0];
  assert.equal(qator.birlikId, ''); assert.equal(qator.narx, 270); assert.equal(qator.qoldiq, 2270); assert.equal(qator.soni, 45);
});

test('store: pochkadagi qatorga yana qo‘shilsa birlik saqlanadi va miqdor pochkada oshadi', () => {
  usePosStore.setState({ cart: [], narxTuri: 'chakana' });
  usePosStore.getState().addToCart(element(), 1);
  usePosStore.getState().setBirlik('a::w1', 'u-p');
  usePosStore.getState().addToCart(element(), 2);
  const qator = usePosStore.getState().cart[0];
  assert.equal(qator.birlikId, 'u-p'); assert.equal(qator.narx, 12000); assert.equal(qator.soni, 3); assert.equal(qator.qoldiq, 45);
});

test('store: ulgurji narx turi pochkada ulgurji narxni oladi; birliksiz tovar o‘zgarmaydi', () => {
  usePosStore.setState({ cart: [], narxTuri: 'chakana' });
  usePosStore.getState().addToCart(element(), 1);
  usePosStore.getState().setBirlik('a::w1', 'u-p');
  usePosStore.getState().updatePriceType('ulgurji');
  assert.equal(usePosStore.getState().cart[0].narx, 12500);
  usePosStore.setState({ cart: [], narxTuri: 'chakana' });
  usePosStore.getState().addToCart({ id: 'b::w1', modificationId: 'b', nom: 'Oddiy', narx: 3000, chakanaNarx: 3000, ulgurjiNarx: 0, qoldiq: 10, warehouseId: 'w1' }, 2);
  usePosStore.getState().setBirlik('b::w1', 'u-p');
  const oddiy = usePosStore.getState().cart[0];
  assert.deepEqual([oddiy.narx, oddiy.qoldiq, oddiy.soni, oddiy.baza], [3000, 10, 2, undefined]);
});

const { sotuvQatori } = await import('../src/Pages/BoshSahifa/aralashTolov.ts');
test('sotuv qatori: pochka unitId bilan ketadi (so‘mda ham, dollar mahsulotda ham), asosiy birlikda unitId yo‘q', () => {
  assert.deepEqual(
    sotuvQatori({ modificationId: 'a', quantity: 10, price: 12000, discount: 0, dollar: null, priceType: 'RETAIL', unitId: 'u-p' }),
    { modificationId: 'a', quantity: 10, price: 12000, discount: 0, priceType: 'RETAIL', unitId: 'u-p' }
  );
  assert.deepEqual(
    sotuvQatori({ modificationId: 'a', quantity: 2, price: 720000, discount: 0, dollar: { narx: 60, kurs: 12000 }, priceType: 'RETAIL', unitId: 'u-p' }),
    { modificationId: 'a', quantity: 2, price: 60, discount: 0, currency: 'USD', priceType: 'RETAIL', unitId: 'u-p' }
  );
  assert.ok(!('unitId' in sotuvQatori({ modificationId: 'a', quantity: 1, price: 270, discount: 0, dollar: null, priceType: 'RETAIL' })));
});
