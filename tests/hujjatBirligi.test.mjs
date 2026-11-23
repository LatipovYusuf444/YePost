// 23.11: ombor hujjatlarida birlik (ko'chirish, hisobdan chiqarish, qaytarish — qatorda unitId) va hamma joyda "Umumiy birlik".
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as lib from '../src/lib/hujjatBirligi.ts';

const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8');
const birlik = (qism) => ({ unitId: 'u', kod: null, nomi: '', qisqa: '', kasr: false, koeff: 1, asosiy: false, qabul: true, sotuv: true, chakana: null, ulgurji: null, shtrix: null, ...qism });
const dona = birlik({ unitId: 'dona', nomi: 'Dona', qisqa: 'dona', asosiy: true });
const korobka = birlik({ unitId: 'box', nomi: 'Korobka', qisqa: 'korobka', koeff: 12 });
const blok = birlik({ unitId: 'blok', nomi: 'Blok', qisqa: 'blok', koeff: 10, qabul: false });
const kg = birlik({ unitId: 'kg', nomi: 'Kilogramm', qisqa: 'kg', asosiy: true, kasr: true });
const qop = birlik({ unitId: 'qop', nomi: 'Qop', qisqa: 'qop', koeff: 50 });

test('hujjat birliklari: asosiy birinchi, bitta birlikda tanlov yo‘q', () => {
  assert.deepEqual(lib.hujjatBirliklari([korobka, dona, blok]).map((b) => b.unitId), ['dona', 'blok', 'box']);
  assert.deepEqual(lib.hujjatBirliklari([dona]), []);
  assert.deepEqual(lib.hujjatBirliklari(undefined), []);
});

test('qator koeffitsienti: asosiy — 1, korobka — 12; birliklar yuklanmagan saqlangan qatorda saqlangan koeffitsient', () => {
  assert.equal(lib.qatorKoeffi([dona, korobka], ''), 1);
  assert.equal(lib.qatorKoeffi([dona, korobka], 'box'), 12);
  assert.equal(lib.qatorKoeffi([dona, korobka], 'dona'), 1);
  assert.equal(lib.qatorKoeffi(undefined, 'box', 12), 12, 'korobka soni asosiy birlik deb hisoblanmaydi');
  assert.equal(lib.qatorKoeffi(undefined, 'box'), 1);
  assert.equal(lib.asosiyBirlikdagiMiqdor(2, 12), 24);
  assert.equal(lib.asosiyBirlikdagiMiqdor(0.1, 3), 0.3);
});

test('butun son: korobkada kasr mumkin emas, kg (kasr birlik) va asosiyda mumkin', () => {
  assert.equal(lib.birlikMiqdoriYaroqli(korobka, 2), true);
  assert.equal(lib.birlikMiqdoriYaroqli(korobka, 1.5), false);
  assert.equal(lib.birlikMiqdoriYaroqli(undefined, 1.5), true);
  assert.equal(lib.birlikMiqdoriYaroqli(kg, 2.25), true);
  assert.equal(lib.birlikMiqdoriYaroqli(korobka, 0), false);
});

test('birlik almashganda narx: 1 dona 15 000 → 1 korobka 180 000 → yana dona', () => {
  assert.equal(lib.birlikdagiNarx(15000, 1, 12), 180000);
  assert.equal(lib.birlikdagiNarx(180000, 12, 1), 15000);
  assert.equal(lib.birlikdagiNarx(100, 3, 1), 33.333);
});

test('umumiy birlik variantlari: qo‘shimcha birliklar bir marta; kirimda faqat qabul birliklari; tovarda bormi', () => {
  assert.deepEqual(lib.umumiyBirlikVariantlari([[dona, korobka, blok], [kg, qop], [dona, korobka], undefined]), [
    { unitId: 'box', nom: 'korobka' }, { unitId: 'blok', nom: 'blok' }, { unitId: 'qop', nom: 'qop' },
  ]);
  assert.deepEqual(lib.umumiyBirlikVariantlari([[dona, korobka, blok]], (b) => b.qabul).map((v) => v.unitId), ['box']);
  assert.equal(lib.umumiyBirlikTovarda([dona, korobka], 'box')?.koeff, 12);
  assert.equal(lib.umumiyBirlikTovarda([kg, qop], 'box'), undefined);
  assert.equal(lib.umumiyBirlikTovarda([dona, blok], 'blok', (b) => b.qabul), undefined);
  assert.equal(lib.umumiyBirlikTovarda([dona, korobka], 'dona'), undefined, 'asosiy birlik "umumiy" emas');
});

test('saqlangan qator: birlikda kiritilgan bo‘lsa birlikdagi son va narx, aks holda asosiyda', () => {
  assert.deepEqual(lib.saqlanganQatorBirligida({ quantity: '24', price: '15000', unitId: 'box', unitQuantity: '2', unitPrice: '180000', factorSnapshot: '12' }), { miqdor: 2, birlikId: 'box', koeff: 12, narx: 180000 });
  // Ko'chirma javobida unitPrice yo'q: narx asosiy narx × koeffitsient; koeffitsient yo'q bo'lsa miqdorlardan.
  assert.deepEqual(lib.saqlanganQatorBirligida({ quantity: 24, price: 100, unitId: 'box', unitQuantity: 2 }), { miqdor: 2, birlikId: 'box', koeff: 12, narx: 1200 });
  assert.deepEqual(lib.saqlanganQatorBirligida({ quantity: '5', price: '100', unitId: null, unitQuantity: null }), { miqdor: 5, birlikId: '', koeff: 1, narx: 100 });
});

test('so‘rovga unitId: faqat qo‘shimcha birlikda; birliklar yuklanmagan bo‘lsa ham saqlangan birlik ketadi', () => {
  assert.deepEqual(lib.unitIdQismi([dona, korobka], 'box'), { unitId: 'box' });
  assert.deepEqual(lib.unitIdQismi([dona, korobka], ''), {});
  assert.deepEqual(lib.unitIdQismi([dona, korobka], 'dona'), {});
  assert.deepEqual(lib.unitIdQismi(undefined, 'box'), { unitId: 'box' });
});

test('ulanish: ko‘chirish, hisobdan chiqarish va qaytarishda qator birligi + unitId; hamma oynada "Umumiy birlik"', () => {
  for (const yol of ['src/Pages/Ombor/KochirishYaratishModal.tsx', 'src/Pages/Ombor/YangiChiqimModal.tsx', 'src/Pages/Ombor/TaminotchiQaytarish/QaytarishOynasi.tsx']) {
    const kod = manba(yol);
    assert.match(kod, /<QatorBirligiTanlovi/, yol);
    assert.match(kod, /<UmumiyBirlikPaneli/, yol);
    assert.match(kod, /tovarBirliklariniOlish\(productId\)/, yol);
  }
  assert.match(manba('src/Pages/Ombor/KochirishYaratishModal.tsx'), /\.\.\.unitIdQismi\(qatorBirliklari\(item\), item\.birlikId\)/);
  assert.match(manba('src/Pages/Ombor/YangiChiqimModal.tsx'), /\.\.\.unitIdQismi\(qatorBirliklari\(row\), row\.birlikId\)/);
  assert.match(manba('src/Pages/Ombor/KochirishKorishModal.tsx'), /\.\.\.unitIdQismi\(birliklariniOl\(item\.modificationId\), item\.birlikId\)/);
  assert.match(manba('src/Pages/Ombor/YangiKirimModal.tsx'), /<UmumiyBirlikPaneli[^>]*onTanlash=\{umumiyBirlikniTanlash\}/);
  assert.match(manba('src/Pages/Ombor/YangiKirimModal.tsx'), /umumiyBirlikTovarda\(birliklar, unitId, \(item\) => item\.qabul\)/);
  assert.match(manba('src/Pages/Ombor/Inventarizatsiya.tsx'), /<UmumiyBirlikPaneli[\s\S]*?onTanlash=\{umumiySanashniTanlash\}/);
  for (const yol of ['src/Pages/Ombor/ChiqimTafsilotModal.tsx', 'src/Pages/Ombor/TaminotchiQaytarish/QaytarishTafsilot.tsx', 'src/Pages/Ombor/KochirishKorishModal.tsx']) {
    assert.match(manba(yol), /<BirlikliMiqdor/, yol);
  }
  for (const til of ['uz', 'ru']) {
    const j = JSON.parse(manba(`src/i18n/locales/${til}/ombor_kichik.json`)).hujjatBirligi;
    for (const kalit of ['label', 'baseFallback', 'optionLabel', 'baseEquivalent', 'notWhole']) assert.ok(j[kalit], `${til} ${kalit}`);
    for (const kalit of ['label', 'base', 'baseTitle', 'optionTitle', 'hint', 'skipped']) assert.ok(j.umumiy[kalit], `${til} umumiy.${kalit}`);
    const box = JSON.parse(manba(`src/i18n/locales/${til}/ombor_harakat.json`)).inventarizatsiya.createModal.box;
    assert.ok(box.umumiyLabel && box.umumiyHint, til);
  }
});
