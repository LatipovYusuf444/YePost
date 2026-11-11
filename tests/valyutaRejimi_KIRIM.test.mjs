// Valyuta rejimi (backend 11.11.2026): ombor kirimi va chiqim. Bir valyutali rejimda (UZS_ONLY / USD_ONLY) kirim hujjati va narxlar
// rejim valyutasida, kurs so'ralmaydi; ikki valyuta (DUAL) rejimida xatti-harakat avvalgidek.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { kirimElementiniYigish, kirimHujjatValyutasi, rejimNarxi } from '../src/Pages/Ombor/kirimValyuta.ts';
import { chiqimJamilari } from '../src/lib/chiqimTannarxi.ts';

const oqi = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8');

test('rejimNarxi: DUAL (yagona null) da narx o\'z valyutasida, o\'zgarishsiz', () => {
  assert.deepEqual(rejimNarxi(3.5, 'USD', null, null), { qiymat: 3.5, tekshirish: false });
  assert.deepEqual(rejimNarxi(45000, 'UZS', null, 12000), { qiymat: 45000, tekshirish: false });
});

test('rejimNarxi: rejim valyutasidagi narx kurssiz ham o\'zgarmaydi (USD_ONLY da dollar narx "narx yo\'q" bo\'lmaydi)', () => {
  assert.deepEqual(rejimNarxi(3.5, 'USD', 'USD', null), { qiymat: 3.5, tekshirish: false });
  assert.deepEqual(rejimNarxi(45000, 'UZS', 'UZS', null), { qiymat: 45000, tekshirish: false });
  assert.deepEqual(rejimNarxi(0, 'UZS', 'USD', null), { qiymat: 0, tekshirish: false });
});

test('rejimNarxi: boshqa valyutadagi eski narx kurs bo\'lsa o\'giriladi, bo\'lmasa soni qoladi va tekshirish so\'raladi', () => {
  assert.deepEqual(rejimNarxi(45000, 'UZS', 'USD', 12000), { qiymat: 3.75, tekshirish: false });
  assert.deepEqual(rejimNarxi(3.5, 'USD', 'UZS', 12000), { qiymat: 42000, tekshirish: false });
  assert.deepEqual(rejimNarxi(45000, 'UZS', 'USD', null), { qiymat: 45000, tekshirish: true });
  assert.deepEqual(rejimNarxi(3.5, 'USD', 'UZS', 0), { qiymat: 3.5, tekshirish: true });
});

test('USD_ONLY: dollar qatorlar kursiz USD hujjatga o\'girilmasdan yig\'iladi', () => {
  const item = kirimElementiniYigish({ modificationId: 'm1', quantity: 10, price: '3.5', currency: 'USD' }, null, 'USD');
  assert.deepEqual(item, { modificationId: 'm1', quantity: 10, price: 3.5 });
  const bosh = kirimElementiniYigish({ modificationId: 'm2', quantity: 1, price: '', currency: 'USD', boshlangichTanNarx: 1.25 }, null, 'USD');
  assert.equal(bosh.price, 1.25);
  // DUAL: avvalgidek — standart maqsad so'm, dollar qator kurssiz yig'ilmaydi.
  assert.throws(() => kirimElementiniYigish({ modificationId: 'm1', quantity: 1, price: '3.5', currency: 'USD' }, null), /KURS_KERAK/);
  assert.equal(kirimHujjatValyutasi([{ currency: 'USD' }, { currency: 'UZS' }]), 'UZS');
});

test('chiqimJamilari: qatorsiz backend jami standart so\'m (avvalgidek), bir valyutali rejimda berilgan valyutada', () => {
  assert.deepEqual(chiqimJamilari([], 120), [{ valyuta: 'UZS', summa: 120 }]);
  assert.deepEqual(chiqimJamilari([], 120, 'USD'), [{ valyuta: 'USD', summa: 120 }]);
  assert.deepEqual(chiqimJamilari([{ summa: 2, valyuta: 'USD' }], null, 'UZS'), [{ valyuta: 'USD', summa: 2 }]);
});

function omborYordamchilari(yagona) {
  const valyuta = {
    yagonaValyuta: () => yagona,
    oziValyutadaMatn: (summa, v) => `ozi:${v}:${summa}`,
    pulMatni: (summa, manba) => `pulMatni:${manba ?? 'UZS'}:${summa}`,
  };
  const context = { exports: {}, require(nom) {
    if (nom === '@/lib/valyuta') return valyuta;
    if (nom === '@/lib/hujjatRaqamiMatni') return { RAQAM_YOQ: '—' };
    return {};
  } };
  const manba = ts.transpileModule(oqi('src/Pages/Ombor/omborYordamchilari.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(manba, context);
  return context.exports;
}

test('pul(): DUAL va mos valyutada avvalgidek pulMatni; USD_ONLY da eski so\'mli hujjat o\'z valyutasida (dollar belgisisiz)', () => {
  const dual = omborYordamchilari(null);
  assert.equal(dual.pul(100, 'UZS'), 'pulMatni:UZS:100');
  assert.equal(dual.pul(100, 'USD'), 'pulMatni:USD:100');
  assert.equal(dual.pul(100), 'pulMatni:UZS:100');
  const dollar = omborYordamchilari('USD');
  assert.equal(dollar.pul(45000, 'UZS'), 'ozi:UZS:45000');
  assert.equal(dollar.pul(3.5, 'USD'), 'pulMatni:USD:3.5');
  assert.equal(dollar.pul(120), 'pulMatni:UZS:120');
  const som = omborYordamchilari('UZS');
  assert.equal(som.pul(3.5, 'USD'), 'ozi:USD:3.5');
  assert.equal(som.pul(100, 'UZS'), 'pulMatni:UZS:100');
});

test('YangiKirimModal: bir valyutali rejimda valyuta tanlovi yashirin, hujjat va yangi mahsulot narxi rejim valyutasida', () => {
  const manba = oqi('src/Pages/Ombor/YangiKirimModal.tsx');
  assert.match(manba, /\{!yagona && \(\s*<label[^>]*>\s*\{t\("yangiKirim\.currency"\)\}/);
  assert.match(manba, /const hujjatValyutasi = yagona \?\? kirimHujjatValyutasi\(valid\);/);
  assert.match(manba, /const kursKerak = !yagona && /);
  assert.match(manba, /currency: yagonaValyuta\(\) \?\? "UZS"/);
  assert.match(manba, /\.\.\.\(yagona \? \{ costCurrency: yagona, retailCurrency: yagona, wholesaleCurrency: yagona \} : \{\}\)/);
  for (const til of ['uz', 'ru']) {
    const matn = JSON.parse(oqi(`src/i18n/locales/${til}/ombor_modal.json`)).kirimValyutaRejimi?.checkPrices;
    assert.ok(matn && matn.includes('{{currency}}') && matn.includes('{{products}}'), til);
  }
});
