// TZ 13.11.2026 "5 ta bag": to'lov turi ranglari, katalog tanlovi, kirim jadvali ustunlari va "№" belgisi, savdo tovarlari jadvali,
// Bosh sahifa klaviaturasi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const oqi = (yol) => readFileSync(new URL(`../src/${yol}`, import.meta.url), 'utf8');
const ranglar = require('../src/lib/tolovTuriRanglari.ts');
const katalog = require('../src/Pages/Savdo/katalogTanlovi.ts');

test('5-bag: to\'lov turi ranglari — Naqd yashil, Karta/Click/Payme ko\'k, Bank siyohrang, qarz/to\'lanmagan kulrang', () => {
  assert.equal(ranglar.tolovRangGuruhi('CASH'), 'naqd');
  for (const tur of ['CARD', 'CLICK', 'PAYME', 'ilova']) assert.equal(ranglar.tolovRangGuruhi(tur), 'karta', tur);
  assert.equal(ranglar.tolovRangGuruhi('BANK'), 'bank');
  for (const tur of ['DEBT', 'BALANCE', null, '']) assert.equal(ranglar.tolovRangGuruhi(tur), 'tolanmagan');
  assert.deepEqual([ranglar.TOLOV_TURI_RANGLARI.naqd.fon, ranglar.TOLOV_TURI_RANGLARI.naqd.matn], ['#EAF3DE', '#27500A']);
  assert.deepEqual([ranglar.TOLOV_TURI_RANGLARI.karta.fon, ranglar.TOLOV_TURI_RANGLARI.karta.matn], ['#E6F1FB', '#0C447C']);
  assert.deepEqual([ranglar.TOLOV_TURI_RANGLARI.bank.fon, ranglar.TOLOV_TURI_RANGLARI.bank.matn], ['#EEEDFE', '#3C3489']);
  assert.deepEqual([ranglar.TOLOV_TURI_RANGLARI.tolanmagan.fon, ranglar.TOLOV_TURI_RANGLARI.tolanmagan.matn], ['#F1EFE8', '#444441']);
  for (const rang of Object.values(ranglar.TOLOV_TURI_RANGLARI)) assert.match(rang.klass, /dark:bg-/, 'qorong\'u variant bor');
  const turlar = ranglar.tolovlarniTurBoyichaYigish([{ paymentType: 'CASH', amount: 30 }, { paymentType: 'CARD', amount: 66.16 }, { paymentType: 'CASH', amount: 20 }, { paymentType: 'DEBT', amount: 5 }]);
  assert.deepEqual(JSON.parse(JSON.stringify(turlar)), [{ turi: 'CASH', summa: 50 }, { turi: 'CARD', summa: 66.16 }]);
});

test('5-bag: savdo tarixi, to\'lovlar ro\'yxati, savdo ichidagi to\'lovlar, kassa va kunlik kassa yagona konstantani ishlatadi', () => {
  assert.match(oqi('Pages/Savdo/SotuvlarJadvali.tsx'), /tolovlarniTurBoyichaYigish\(sotuv\.payments\)/);
  assert.match(oqi('Pages/Savdo/SotuvlarJadvali.tsx'), /<TolovTuriBelgisi key=\{turi\} turi=\{turi\}>/);
  assert.match(oqi('Pages/Savdo/Tolovlar.tsx'), /<TolovTuriBelgisi turi=\{tolov\.tolovTuri\}/);
  assert.match(oqi('Pages/Savdo/SotuvTolovlari.tsx'), /<TolovTuriBelgisi turi=\{qator\.tolov\.paymentType\}/);
  assert.match(oqi('Pages/KassaUchot/KassaAmaliyotKorinishi.tsx'), /<TolovTuriBelgisi turi=\{amaliyot\.kanal\}>/);
  assert.match(oqi('Pages/HisobotUchot/KunlikKassa.tsx'), /payment: "CARD", \.\.\.rang\("CARD"\)/);
  assert.match(oqi('Pages/BoshSahifa/index.tsx'), /tolovRangi\(item\.apiTuri\)/);
});

test('2-bag: katalog — qidiruv (kirill/lotin, shtrix kod), faqat qoldig\'i bor, kategoriya, sotib bo\'lmaydiganlar oxirida', () => {
  const variantlar = [
    { value: 'a::w', searchLabel: '6*250', kodlar: ['4789001'] },
    { value: 'b::w', searchLabel: '6*300', kodlar: ['4781002'] },
    { value: 'c::w', searchLabel: 'Рангли лента', disabled: true },
    { value: 'd::w', searchLabel: '4,5*100' },
  ];
  const qoldiq = { 'a::w': 148, 'b::w': 692, 'c::w': 0, 'd::w': 0 };
  const p = (q = {}) => ({ qidiruv: '', faqatQoldiq: false, kategoriya: null, qoldiqSoni: (k) => qoldiq[k], modificationId: (k) => k.split('::')[0], ...q });
  const nomlar = (r) => r.map((x) => x.option.value);
  assert.deepEqual(nomlar(katalog.katalogFiltrlash(variantlar, p())), ['a::w', 'b::w', 'd::w', 'c::w']);
  assert.deepEqual(nomlar(katalog.katalogFiltrlash(variantlar, p({ qidiruv: '6*' }))), ['a::w', 'b::w']);
  assert.deepEqual(nomlar(katalog.katalogFiltrlash(variantlar, p({ qidiruv: '4781002' }))), ['b::w']);
  assert.deepEqual(nomlar(katalog.katalogFiltrlash(variantlar, p({ qidiruv: 'rangli' }))), ['c::w']);
  assert.deepEqual(nomlar(katalog.katalogFiltrlash(variantlar, p({ faqatQoldiq: true }))), ['a::w', 'b::w']);
  assert.deepEqual(nomlar(katalog.katalogFiltrlash(variantlar, p({ kategoriya: new Set(['b', 'd']) }))), ['b::w', 'd::w']);
  assert.deepEqual(JSON.parse(JSON.stringify(katalog.katalogJami([{ kalit: 'a::w', miqdor: 36 }, { kalit: 'b::w', miqdor: 25 }], (k) => ({ 'a::w': 2.2, 'b::w': 2.64 })[k]))), { miqdor: 61, summa: 145.2 });
});

test('2-bag: "Qo\'shish" — bor tovarning miqdori qo\'shiladi, yangisi bo\'sh qatorga yoki oxiriga', () => {
  const qator = (kalit, soni, birlik = '') => ({ kalit, soni, birlik });
  const q = {
    kalit: (r) => r.kalit, asosiyBirlikda: (r) => !r.birlik, boshmi: (r) => !r.kalit,
    miqdorQosh: (r, m) => ({ ...r, soni: r.soni + m }), yangi: (kalit, soni) => qator(kalit, soni),
  };
  const natija = katalog.katalogniQatorlargaQoshish([qator('a::w', 2), qator('b::w', 1, 'pochka'), qator('', 1)], [{ kalit: 'a::w', miqdor: 36 }, { kalit: 'b::w', miqdor: 25 }, { kalit: 'c::w', miqdor: 3 }], q);
  assert.deepEqual(JSON.parse(JSON.stringify(natija)), [qator('a::w', 38), qator('b::w', 1, 'pochka'), qator('b::w', 25), qator('c::w', 3)]);
});

test('2-bag: Yangi sotuvda "Katalog" tugmasi va oyna ulangan', () => {
  const kod = oqi('Pages/Savdo/YangiSotuvModal.tsx');
  assert.match(kod, /onClick=\{\(\) => setKatalogOchiq\(true\)\}/);
  assert.match(kod, /<KatalogOynasi\s+variantlar=\{katalogOptionlariRoyxati\}/);
  assert.match(kod, /onQoshish=\{katalogdanQoshish\}/);
});

test('3-bag: kirim yaratish jadvali SmartTable ("Ustunlar"), Mahsulot va Soni majburiy; "№" to\'g\'ri', () => {
  const kod = oqi('Pages/Ombor/YangiKirimModal.tsx');
  assert.match(kod, /<SmartTable tableId="Ombor\/YangiKirimModal\/tovarlar" replaceColumnControls>/);
  assert.match(kod, /<th data-column-id="mahsulot" data-required/);
  assert.match(kod, /<th data-column-id="soni" data-required/);
  assert.match(kod, /<th data-column-id="ulgurji"/);
  for (const l of ['uz', 'ru']) {
    const json = JSON.parse(oqi(`i18n/locales/${l}/ombor_bosh.json`));
    assert.equal(json.yangiKirim.table.numberHeader, '№');
  }
  assert.doesNotMatch(oqi('i18n/locales/uz/ombor_bosh.json'), /в„–/);
  // data-required — "Ustunlar" panelida o'chirib bo'lmaydigan ustun (haqiqiy analyzeTable bilan).
  const ts = require('typescript');
  const { runInNewContext } = require('node:vm');
  const React = require('react');
  const ctx = { exports: {}, require };
  runInNewContext(ts.transpileModule(oqi('Components/common/smart-table/model.tsx'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, ctx);
  const h = React.createElement;
  const jadval = h('table', null, h('thead', null, h('tr', null, h('th', { 'data-column-id': 'mahsulot', 'data-required': true }, 'Mahsulot'), h('th', { 'data-column-id': 'ulgurji' }, 'Ulgurji narxi'))));
  const { columns } = ctx.exports.analyzeTable(jadval);
  assert.deepEqual(columns.map((c) => [c.id, c.required]), [['mahsulot', true], ['ulgurji', false]]);
});

test('1-bag: saqlangan savdo tovarlari — ixcham jadval, chegirma alohida ustun, kam ishlatiladiganlar yashirin, jami qatori', () => {
  const kod = oqi('Pages/Savdo/SotuvTafsilotlariModal.tsx');
  assert.match(kod, /<SmartTable tableId="Savdo\/SotuvTafsilotlari\/tovarlar" replaceColumnControls>/);
  for (const ustun of ['shtrix', 'qoldiq', 'rezerv', 'chiqdi']) assert.match(kod, new RegExp(`<th data-column-id="${ustun}" data-default-hidden`));
  assert.match(kod, /<th data-column-id="chegirma"/);
  assert.match(kod, /<thead className="sticky top-0/);
  assert.match(kod, /items\.length > 10 \? "max-h-\[520px\] overflow-auto"/);
  assert.match(kod, /t\("tovarlarTab\.jamiQatori"/);
  assert.match(kod, /setMahsulotKartasi\(\{ modificationId: item\.modificationId, productId \}\)/);
});

test('4-bag: Bosh sahifa klaviaturasi — ↓ qidiruvdan savatchaga, qatorda +/−/Del/raqam/F4, F2/F3/F8, Ctrl+/, to\'lovda 1–5', () => {
  const header = oqi('Components/layout/HeaderMahsulotQidiruvi.tsx');
  assert.match(header, /event\.key === "ArrowDown" && !matn && !kategoriyaId/);
  assert.match(header, /new CustomEvent\(POS_SAVATCHAGA_OTISH, \{ cancelable: true \}\)/);
  const kod = oqi('Pages/BoshSahifa/index.tsx');
  for (const kalit of ['"ArrowDown"', '"+"', '"-"', '"Delete"', '"Escape"', '"F4"', '"F2"', '"F3"', '"F8"']) assert.ok(kod.includes(`key === ${kalit}`), kalit);
  assert.match(kod, /window\.addEventListener\(POS_SAVATCHAGA_OTISH, savatchaga\)/);
  assert.match(kod, /const TOLOV_TEZKOR_TARTIBI = \["cash", "card", "bank", "click", "payme"\] as const;/);
  assert.match(kod, /ochirilganniQaytarish\(\)/);
  assert.match(kod, /t\("keyboard\.hint"\)/);
  assert.match(kod, /posQidiruvigaFokusKeyin\(\);/, 'to\'lovdan keyin qidiruvga');
  const { enterTolovniTasdiqlaydimi } = require('../src/lib/skanerFokusi.ts');
  assert.equal(enterTolovniTasdiqlaydimi({ key: 'Enter', target: { tagName: 'INPUT' } }, { mumkin: true, band: false }), true);
});
