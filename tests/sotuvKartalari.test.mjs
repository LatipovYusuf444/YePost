// Yangi sotuv: Narx turi / Umumiy birlik / Umumiy chegirma / Yakuniy summalar kartalarini jadval tepasiga-ostiga ko'chirish,
// foydalanuvchi bo'yicha saqlash (refresh va qayta kirishda ham qoladi).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as lib from '../src/lib/sotuvKartalari.ts';

const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8').split(String.fromCharCode(13)).join('');
const S = lib.STANDART_JOYLASHUV;

test('standart: hamma karta jadval ostida, standart tartibda', () => {
  assert.deepEqual(S, { tepa: [], past: ['narxTuri', 'umumiyBirlik', 'umumiyChegirma', 'xulosa'], yashirin: [] });
  assert.equal(lib.standartmi(S), true);
});

test('saqlangan qiymat tahlili: noma\'lum/takror tashlanadi, yo\'q karta standart joyiga, xulosa yashirilmaydi, buzilgani null', () => {
  assert.deepEqual(lib.joylashuvniTahlil(JSON.stringify({ tepa: ['umumiyChegirma', 'xxx'], past: ['xulosa', 'umumiyChegirma'], yashirin: ['xulosa'] })), {
    tepa: ['umumiyChegirma'],
    past: ['narxTuri', 'umumiyBirlik', 'xulosa'],
    yashirin: [],
  });
  assert.equal(lib.joylashuvniTahlil('{buzuq'), null);
  assert.equal(lib.joylashuvniTahlil(null), null);
  assert.equal(lib.joylashuvniTahlil({ tepa: 'x', past: [] }), null);
  // Keyin qo'shilgan karta (saqlanmagan) oldingi qo'shnisidan keyin.
  assert.deepEqual(lib.joylashuvniTahlil({ tepa: ['narxTuri'], past: ['umumiyChegirma', 'xulosa'] }).past, ['umumiyBirlik', 'umumiyChegirma', 'xulosa']);
});

test('sudrab qo\'yish va Yuqoriga/Pastga jadval orqali o\'tadi', () => {
  let j = lib.kartaniJoylash(S, 'umumiyChegirma', 'tepa', 0);
  assert.deepEqual(j, { tepa: ['umumiyChegirma'], past: ['narxTuri', 'umumiyBirlik', 'xulosa'], yashirin: [] });
  j = lib.kartaniSiljitish(j, 'narxTuri', -1); // pastdagi birinchi → tepaning oxiriga
  assert.deepEqual(j.tepa, ['umumiyChegirma', 'narxTuri']);
  j = lib.kartaniSiljitish(j, 'narxTuri', -1);
  assert.deepEqual(j.tepa, ['narxTuri', 'umumiyChegirma']);
  assert.equal(lib.siljiyOladimi(j, 'narxTuri', -1), false, 'eng yuqorida');
  j = lib.kartaniSiljitish(j, 'umumiyChegirma', 1); // tepaning oxiri → jadval ostiga birinchi
  assert.deepEqual(j, { tepa: ['narxTuri'], past: ['umumiyChegirma', 'umumiyBirlik', 'xulosa'], yashirin: [] });
  assert.equal(lib.siljiyOladimi(j, 'xulosa', 1), false, 'eng pastda');
  assert.deepEqual(lib.kartaniJoylash(j, 'xulosa', 'past', 0).past, ['xulosa', 'umumiyChegirma', 'umumiyBirlik']);
});

test('yashirish/qaytarish: xulosa yashirilmaydi, qaytarilgan karta standart joyiga yaqin', () => {
  let j = lib.kartaniYashirish(S, 'umumiyBirlik');
  assert.deepEqual(j, { tepa: [], past: ['narxTuri', 'umumiyChegirma', 'xulosa'], yashirin: ['umumiyBirlik'] });
  assert.equal(lib.kartaniYashirish(j, 'xulosa'), j);
  j = lib.kartaniQaytarish(j, 'umumiyBirlik');
  assert.deepEqual(j.past, ['narxTuri', 'umumiyBirlik', 'umumiyChegirma', 'xulosa']);
  assert.deepEqual(j.yashirin, []);
});

test('sudrash nishoni: zona ichida — o\'sha zona, tashqarida — eng yaqini; indeks kartalar o\'rtasi bo\'yicha', () => {
  const zonalar = [
    { zona: 'tepa', tepa: 100, past: 160, ortalar: [] },
    { zona: 'past', tepa: 600, past: 900, ortalar: [650, 750, 850] },
  ];
  assert.deepEqual(lib.sudrashNishoni(120, zonalar), { zona: 'tepa', indeks: 0 });
  assert.deepEqual(lib.sudrashNishoni(700, zonalar), { zona: 'past', indeks: 1 });
  assert.deepEqual(lib.sudrashNishoni(990, zonalar), { zona: 'past', indeks: 3 });
  assert.deepEqual(lib.sudrashNishoni(300, zonalar), { zona: 'tepa', indeks: 0 }, 'jadval ustida — tepaga yaqinroq');
  assert.equal(lib.sudrashNishoni(10, []), null);
});

test('saqlash kalitlari foydalanuvchi bo\'yicha: ID + do\'kon|login zaxira; noma\'lum — mehmon', () => {
  assert.deepEqual(lib.joylashuvKalitlari({ id: 'u1', login: 'w1|kassir' }), ['yepost-sotuv-kartalari:u1', 'yepost-sotuv-kartalari:login:w1|kassir']);
  assert.deepEqual(lib.joylashuvKalitlari({}), ['yepost-sotuv-kartalari:mehmon']);
  // Chiqishda tozalanadigan do'kon kalitlari orasida emas — qayta kirganda ham qoladi.
  assert.doesNotMatch(manba('src/lib/sessiyaIzolyatsiyasi.ts'), /yepost-sotuv-kartalari/);
});

test('Yangi sotuv oynasi: jadval SotuvJadvali ichida, 4 karta SotuvKartalari ichida; chegirma qo\'llangan bo\'lsa yashirin ham ko\'rinadi', () => {
  const kod = manba('src/Pages/Savdo/YangiSotuvModal.tsx');
  // Qisqa rejimda faqat foydalanuvchi yoqqan kartalar (ixcham), To'liq rejimda avvalgidek.
  assert.match(kod, /<SotuvKartalari ixcham=\{qisqa\}>/);
  const boshi = kod.indexOf('<SotuvKartalari ixcham={qisqa}>');
  const oxiri = kod.indexOf('</SotuvKartalari>');
  assert.ok(boshi > 0 && oxiri > boshi);
  const blok = kod.slice(boshi, oxiri);
  assert.ok(blok.indexOf('<SotuvJadvali>') < blok.indexOf('products.keyboardHint'));
  for (const kalit of ['narxTuri', 'umumiyBirlik', 'umumiyChegirma', 'xulosa']) assert.match(blok, new RegExp(`<SotuvKartasi kalit="${kalit}"`));
  assert.match(blok, /kalit="umumiyChegirma"[^>]*majburiy=\{umumiyFoiz > 0 \|\| umumiySumma > 0\}/);
  assert.match(blok, /ref=\{xulosaKartasiRef\}/);
  assert.match(kod, /data-sotuv-aylantirish/);
  for (const til of ['uz', 'ru']) {
    const t = JSON.parse(manba(`src/i18n/locales/${til}/savdo_yangi.json`)).cardLayout;
    for (const k of ['summary', 'handle', 'up', 'down', 'toTop', 'toBottom', 'hide', 'hidden', 'restore', 'reset', 'dropTop', 'dropBottom']) assert.ok(t[k], `${til}:${k}`);
  }
});
