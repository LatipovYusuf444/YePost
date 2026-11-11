// Bosh sahifa (savatcha) — 3 ta tuzatish (11.11.2026): kategoriya qidiruvi, savatchadan mahsulotni tahrirlash, sotuv narxi yaxlitlanmasligi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { kategoriyalarniFiltrlash, kategoriyaMosmi } from '../src/lib/kategoriyaQidiruvi.ts';
import { qoldiqNarxi, dollarMalumoti, mahsulotIdOlish } from '../src/Components/layout/posMahsulotlari.ts';
import { dollarNarxi, sotuvQatori } from '../src/Pages/BoshSahifa/aralashTolov.ts';
import { kursBilanOgirish } from '../src/lib/yaxlitlash.ts';

const storage = new Map();
globalThis.window = {
  localStorage: { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: (k) => storage.delete(k) },
};
globalThis.localStorage = globalThis.window.localStorage;
const { usePosStore, savatchaChegirma, savatchaSotuvNarxi, eskiSavatchaQatoriniTuzatish } = await import('../src/store/posStore.ts');

// ---------- 1. Kategoriya qidiruvi ----------

const KATEGORIYALAR = [
  { id: '1', name: 'Balgarka Tosh998376677' },
  { id: '2', name: 'GIPOARK MOLLARI kuchada' },
  { id: '3', name: 'IZALATSIYA TURBA PVS' },
  { id: '4', name: 'PENA MAGNUS' },
  { id: '5', name: 'Пена монтажная' },
  { id: '6', name: "Xo'jalik mollari" },
];

test('kategoriya: "gipo" → faqat GIPOARK MOLLARI kuchada (katta-kichik harf, so‘z o‘rtasi)', () => {
  assert.deepEqual(kategoriyalarniFiltrlash(KATEGORIYALAR, 'gipo').map((k) => k.name), ['GIPOARK MOLLARI kuchada']);
  assert.deepEqual(kategoriyalarniFiltrlash(KATEGORIYALAR, 'ARK mol').map((k) => k.name), ['GIPOARK MOLLARI kuchada']);
  assert.deepEqual(kategoriyalarniFiltrlash(KATEGORIYALAR, '998376').map((k) => k.name), ['Balgarka Tosh998376677']);
});

test('kategoriya: kirill va lotin bir xil topiladi ("пена" ↔ "pena")', () => {
  const kutilgan = ['PENA MAGNUS', 'Пена монтажная'];
  assert.deepEqual(kategoriyalarniFiltrlash(KATEGORIYALAR, 'пена').map((k) => k.name), kutilgan);
  assert.deepEqual(kategoriyalarniFiltrlash(KATEGORIYALAR, 'pena').map((k) => k.name), kutilgan);
  assert.ok(kategoriyaMosmi("Xo'jalik mollari", 'хожалик'));
  assert.ok(kategoriyaMosmi('Изоляция', 'izolyatsiya'));
});

test('kategoriya: bo‘sh so‘z — hammasi, topilmasa — bo‘sh ro‘yxat, tartib saqlanadi', () => {
  assert.equal(kategoriyalarniFiltrlash(KATEGORIYALAR, '  ').length, KATEGORIYALAR.length);
  assert.deepEqual(kategoriyalarniFiltrlash(KATEGORIYALAR, 'zzzz'), []);
  assert.deepEqual(kategoriyalarniFiltrlash(KATEGORIYALAR, 'mol').map((k) => k.id), ['2', '6']);
});

test('kategoriya menyusi: qidiruv maydoni, "Barcha kategoriyalar" birinchi, ↑↓/Enter, "topilmadi" matni', () => {
  const kod = readFileSync(new URL('../src/Components/layout/KategoriyaMenyusi.tsx', import.meta.url), 'utf8');
  assert.match(kod, /t\("search\.categorySearch"\)/);
  assert.match(kod, /\[\{ id: "", name: t\("search\.allCategories"\) \}, \.\.\.kategoriyalarniFiltrlash/);
  assert.match(kod, /"ArrowDown"/);
  assert.match(kod, /event\.key === "Enter"/);
  assert.match(kod, /t\("search\.categoryNotFound"\)/);
  for (const til of ['uz', 'ru']) {
    const json = JSON.parse(readFileSync(new URL(`../src/i18n/locales/${til}/topbar.json`, import.meta.url), 'utf8'));
    assert.ok(json.search.categorySearch && json.search.categoryNotFound);
  }
  assert.equal(JSON.parse(readFileSync(new URL('../src/i18n/locales/uz/topbar.json', import.meta.url), 'utf8')).search.categorySearch, 'Kategoriyani qidirish…');
});

// ---------- 3. Sotuv narxi yaxlitlanmaydi ----------

// TZ dagi holat: backend kurs 1, retailPriceUzs butun so'mgacha yaxlitlangan (3.5 → 4).
const usdTovar = (asl, kurs, uzs) => ({
  modificationId: 'pena', quantity: 10,
  valyuta: { currency: 'USD', asl, kurs, uzs, ulgurjiCurrency: 'USD', ulgurjiAsl: 0, ulgurjiUzs: null },
  modification: { id: 'pena', product: { id: 'p-pena', name: 'PENA MAGNUS 750mm REZBA' }, price: { retailPrice: uzs } },
});

test('PENA MAGNUS $3.5 (kurs 1): savatcha narxi 3.5, 4 emas; yuboriladigan narx $3.5', () => {
  const item = usdTovar(3.5, 1, 4);
  assert.equal(qoldiqNarxi(item, 'chakana'), 3.5);
  const dollar = dollarMalumoti(item);
  assert.deepEqual(dollar, { valyuta: 'USD', aslNarx: 3.5, aslUlgurjiNarx: 0, kurs: 1 });
  const line = sotuvQatori({ modificationId: 'pena', quantity: 1, price: qoldiqNarxi(item, 'chakana'), discount: 0, dollar: dollarNarxi(dollar, 'chakana'), priceType: 'RETAIL' });
  assert.equal(line.price, 3.5);
  assert.equal(line.currency, 'USD');
});

test('$0.95, $1.25, $2.25 aynan shu narxda: kurs 1 da ham, 12 345.67 kursda ham yaxlitlanmaydi', () => {
  for (const asl of [0.95, 1.25, 2.25, 3.5]) {
    assert.equal(qoldiqNarxi(usdTovar(asl, 1, Math.round(asl)), 'chakana'), asl);
    const kurs = 12345.67;
    const som = qoldiqNarxi(usdTovar(asl, kurs, Math.round(asl * kurs)), 'chakana');
    assert.equal(som, kursBilanOgirish(asl, kurs));
    assert.notEqual(som, Math.round(asl * kurs), `${asl} $ so'mda butun songa yaxlitlanmasligi kerak`);
    // jami (2 dona) ham yaxlitlanmaydi: so'mdan qaytarilgan dollar aynan asl × 2
    assert.equal(Math.round((som * 2 / kurs) * 100) / 100, Math.round(asl * 2 * 100) / 100);
  }
});

test('so‘mdagi tovar o‘girilmaydi (asl narx to‘g‘ridan-to‘g‘ri)', () => {
  assert.equal(qoldiqNarxi({ modificationId: 'uzs', modification: { id: 'uzs', price: { retailPrice: 7500.5 } } }, 'chakana'), 7500.5);
});

test('savatcha: jami va chegirma butun so‘mga yaxlitlanmaydi; kassir 3 yozsa chegirma aynan 0.5', () => {
  usePosStore.setState({ cart: [], narxTuri: 'chakana' });
  const item = usdTovar(3.5, 1, 4);
  usePosStore.getState().addToCart({
    id: 'pena::w1', modificationId: 'pena', productId: mahsulotIdOlish(item), nom: 'PENA MAGNUS 750mm REZBA',
    narx: qoldiqNarxi(item, 'chakana'), chakanaNarx: qoldiqNarxi(item, 'chakana'), ulgurjiNarx: qoldiqNarxi(item, 'ulgurji'),
    ...dollarMalumoti(item), qoldiq: 10, warehouseId: 'w1',
  });
  const qator = usePosStore.getState().cart[0];
  assert.equal(qator.productId, 'p-pena');
  assert.equal(qator.narx, 3.5);
  assert.equal(savatchaSotuvNarxi(qator) * qator.soni, 3.5);
  usePosStore.getState().setSotuvNarxi('pena::w1', 3);
  assert.equal(savatchaChegirma({ ...usePosStore.getState().cart[0], soni: 1 }), 0.5);
});

test('eski saqlangan savatcha (chakanaNarx 4, aslNarx 3.5, kurs 1) ochilganda narx 3.5 ga tuzatiladi', () => {
  const eski = { id: 'pena::w1', modificationId: 'pena', nom: 'PENA', narx: 4, chakanaNarx: 4, ulgurjiNarx: 4, qoldiq: 10, soni: 2, valyuta: 'USD', aslNarx: 3.5, aslUlgurjiNarx: 0, kurs: 1, narxTuri: 'chakana' };
  const yangi = eskiSavatchaQatoriniTuzatish(eski);
  assert.equal(yangi.narx, 3.5);
  assert.equal(yangi.chakanaNarx, 3.5);
  assert.equal(yangi.soni, 2);
  // so'mdagi qator tegilmaydi
  const som = { ...eski, valyuta: undefined, aslNarx: undefined };
  assert.equal(eskiSavatchaQatoriniTuzatish(som), som);
});

test('Sozlamalarda "butun so‘mgacha yaxlitlanadi" matni yo‘q', () => {
  for (const til of ['uz', 'ru']) {
    const matn = readFileSync(new URL(`../src/i18n/locales/${til}/sozlamalar_uchot.json`, import.meta.url), 'utf8');
    assert.doesNotMatch(matn, /butun so'mgacha yaxlitlanadi|округляется до целого сума/);
  }
});

// ---------- 2. Saqlangach savatcha qatori yangilanadi ----------

test('katalogdanYangilash: nom va narx yangilanadi, miqdor va ombor o‘zgarmaydi, qo‘lda narx tashlanadi', () => {
  usePosStore.setState({ cart: [], narxTuri: 'chakana' });
  usePosStore.getState().addToCart({ id: 'a::w1', modificationId: 'a', nom: 'Eski nom', narx: 10000, chakanaNarx: 10000, ulgurjiNarx: 9000, qoldiq: 50, warehouseId: 'w1', warehouseName: 'Asosiy' }, 7);
  usePosStore.getState().setSotuvNarxi('a::w1', 9500);
  usePosStore.getState().katalogdanYangilash('a::w1', { nom: 'Yangi nom', productId: 'p-a', chakanaNarx: 12000, ulgurjiNarx: 11000 });
  const q = usePosStore.getState().cart[0];
  assert.equal(q.nom, 'Yangi nom');
  assert.equal(q.narx, 12000);
  assert.equal(q.chakanaNarx, 12000);
  assert.equal(q.soni, 7);
  assert.equal(q.warehouseId, 'w1');
  assert.equal(q.sotuvNarxi, undefined);
  assert.equal(q.productId, 'p-a');
  // dollarga o'tkazilgan narx: dollar maydonlari ham yangilanadi
  usePosStore.getState().katalogdanYangilash('a::w1', { nom: 'Yangi nom', chakanaNarx: 3.5, ulgurjiNarx: 3.5, valyuta: 'USD', aslNarx: 3.5, aslUlgurjiNarx: 0, kurs: 1 });
  const d = usePosStore.getState().cart[0];
  assert.equal(d.narx, 3.5);
  assert.equal(d.valyuta, 'USD');
  assert.equal(d.soni, 7);
});

test('savatcha nomi tahrir oynasini ochadi: tugma, qalam belgisi, huquqsizga faqat ko‘rish', () => {
  const kod = readFileSync(new URL('../src/Pages/BoshSahifa/index.tsx', import.meta.url), 'utf8');
  assert.match(kod, /onClick=\{\(\) => setTahrirQatori\(item\)\}/);
  // Qalam belgisi doim ko'rinadi: hover'da paydo bo'lish (opacity-0), tagiga chiziq va tooltip yo'q.
  assert.match(kod, /<Pencil size=\{14\} aria-hidden className="mt-\[5px\] shrink-0 text-gold-600" \/>/);
  assert.doesNotMatch(kod, /group-hover\/nom/);
  const oyna = readFileSync(new URL('../src/Pages/BoshSahifa/SavatchaMahsulotTahriri.tsx', import.meta.url), 'utf8');
  assert.match(oyna, /faqatKorish=\{!tahrirRuxsati\}/);
  assert.match(oyna, /sahifagaRuxsatBormi\(profil, "\/mahsulotlar"\)/);
  const mahsulotlar = readFileSync(new URL('../src/Pages/Mahsulotlar/index.tsx', import.meta.url), 'utf8');
  assert.match(mahsulotlar, /export function MahsulotModalKeng/);
  assert.match(mahsulotlar, /if\(ok\)\{onSaqlandi\?\.\(\);onClose\(\)\}/);
});
