// Valyuta rejimi (backend 11.11.2026), "Yangi sotuv" oynasi: bir valyutali rejimda kurs yo'q bo'lsa boshqa valyutada narxlangan tovar
// ro'yxatda/skanerda "mavjud, $0" bo'lib ko'rinmaydi, narx turi musbat narxlisidan tanlanadi, narxi 0 qator yuborilmaydi.
// Yordamchilar YangiSotuvModal.tsx dan TS AST orqali olinadi (oyna komponenti ishga tushirilmaydi).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as narxlar from '../src/lib/savdoNarxlari.ts';

const source = readFileSync(new URL('../src/Pages/Savdo/YangiSotuvModal.tsx', import.meta.url), 'utf8');
const file = ts.createSourceFile('modal.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = ['raqamgaAylantirish', 'qatorBirNarxi', 'tanagaKiradimi', 'qatorNarxiYoqmi', 'dollarKursYoq', 'narxTuriRuxsati', 'rejimdaKursYoq', 'blokNarxMatni', 'sotiladiganNarxTuri'];
const declarations = file.statements.filter((node) => ts.isFunctionDeclaration(node) && names.includes(node.name?.text)).map((node) => node.getText(file));
assert.equal(declarations.length, names.length, 'barcha yordamchilar topildi');
const compiled = ts.transpileModule(declarations.join('\n') + `\nexports.f = { ${names.join(', ')} };`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const context = {
  exports: {},
  ...narxlar,
  pulniFormatlash: (son, valyuta) => (valyuta === 'USD' ? `$${son}` : `${son} so'm`),
};
runInNewContext(compiled, context);
const f = context.exports.f;
// Ro'yxatdagi bloklash: dollar tovar so'm sotuvida (avvalgi) yoki bir valyutali rejimda kurssiz o'girib bo'lmaydigan narx (yangi).
f.kursYoqBloki = (q, yagona, kurs, r) => f.dollarKursYoq(q, yagona) || f.rejimdaKursYoq(q, yagona, kurs, r);

const ruxsat = f.narxTuriRuxsati(null); // sozlama noma'lum: chakana va ulgurji
const SOM = { modificationId: 's', sellingPrice: 24000, modification: { id: 's', price: { retailPrice: 24000, sellingPrice: 24000 } } };
const DOLLAR = { modificationId: 'd', valyuta: { currency: 'USD', asl: 3.5, kurs: null, uzs: null }, modification: { id: 'd', price: {} } };
// Chakana so'mda, ulgurji dollarda.
const ARALASH = {
  modificationId: 'a', sellingPrice: 24000,
  valyuta: { currency: 'UZS', asl: 0, kurs: null, uzs: null, ulgurjiCurrency: 'USD', ulgurjiAsl: 1.8, ulgurjiUzs: null },
  modification: { id: 'a', price: { retailPrice: 24000, sellingPrice: 24000 } },
};
const NARXSIZ = { modificationId: 'n', modification: { id: 'n', price: {} } };

test('USD_ONLY + kurs yo‘q: so‘mda narxlangan tovar bloklanadi, dollar narxli va narxsiz tovar — yo‘q', () => {
  assert.equal(f.kursYoqBloki(SOM, 'USD', 0, ruxsat), true);
  assert.equal(f.kursYoqBloki(DOLLAR, 'USD', 0, ruxsat), false);
  assert.equal(f.kursYoqBloki(ARALASH, 'USD', 0, ruxsat), false, 'ulgurji dollar narxi bilan sotsa bo‘ladi');
  assert.equal(f.kursYoqBloki(NARXSIZ, 'USD', 0, ruxsat), false, 'narxsiz tovar avvalgidek');
  assert.equal(f.blokNarxMatni(SOM, 0, ruxsat), "24000 so'm", 'narx o‘z valyutasida, $0 emas');
});

test('USD_ONLY + kurs bor yoki DUAL: hech narsa qo‘shimcha bloklanmaydi', () => {
  assert.equal(f.kursYoqBloki(SOM, 'USD', 12000, ruxsat), false);
  assert.equal(f.rejimdaKursYoq(SOM, null, 0, ruxsat), false);
  // DUAL so'm sotuvi, dollar tovar kurssiz — avvalgidek faqat dollarKursYoq bilan.
  assert.equal(f.kursYoqBloki(DOLLAR, null, 0, ruxsat), true);
  assert.equal(f.kursYoqBloki(SOM, null, 0, ruxsat), false);
});

test('UZS_ONLY + kurs yo‘q: dollar narxli tovar bloklanadi (avvalgidek), ulgurjisi faqat dollarda bo‘lsa ham', () => {
  assert.equal(f.dollarKursYoq(DOLLAR, 'UZS'), true);
  assert.equal(f.kursYoqBloki(DOLLAR, 'UZS', 0, ruxsat), true);
  const faqatUlgurji = f.narxTuriRuxsati(['WHOLESALE']);
  assert.equal(f.kursYoqBloki(ARALASH, 'UZS', 0, faqatUlgurji), true);
  assert.equal(f.kursYoqBloki(ARALASH, 'UZS', 0, ruxsat), false, 'chakana so‘mda');
});

test('Narx turi: bir valyutali rejimda kurssiz musbat narxli tur tanlanadi; DUAL da avvalgidek', () => {
  assert.equal(f.sotiladiganNarxTuri(ARALASH, 'RETAIL', ruxsat, 0, 'USD'), 'WHOLESALE');
  assert.equal(f.sotiladiganNarxTuri(ARALASH, 'WHOLESALE', ruxsat, 0, 'UZS'), 'RETAIL');
  assert.equal(f.sotiladiganNarxTuri(ARALASH, 'RETAIL', ruxsat, 0, null), 'RETAIL');
  assert.equal(f.sotiladiganNarxTuri(ARALASH, 'RETAIL', ruxsat, 12000, 'USD'), 'RETAIL', 'kurs bor — o‘giriladi');
  assert.equal(f.sotiladiganNarxTuri(SOM, 'RETAIL', ruxsat, 0, 'USD'), 'RETAIL', 'mos tur yo‘q — avvalgi tanlov');
});

test('Yuborishdan oldin: bir valyutali rejimda narxi 0 qator xato, DUAL da tekshirilmaydi', () => {
  const qator = (price, ustama = '') => ({ modificationId: 'x', qoldiqKaliti: 'x', quantity: '2', price, ustama, discount: '', priceType: 'RETAIL', discountTuri: 'sum', discountFoiz: '', birlikId: '' });
  assert.equal(f.qatorNarxiYoqmi(qator(''), 'USD'), true);
  assert.equal(f.qatorNarxiYoqmi(qator('0'), 'UZS'), true);
  assert.equal(f.qatorNarxiYoqmi(qator('0', '1.5'), 'USD'), false, 'ustama bilan narx musbat');
  assert.equal(f.qatorNarxiYoqmi(qator('2'), 'USD'), false);
  assert.equal(f.qatorNarxiYoqmi(qator(''), null), false);
  assert.equal(f.qatorNarxiYoqmi({ ...qator(''), modificationId: '' }, 'USD'), false, 'bo‘sh qator tanaga kirmaydi');
});
