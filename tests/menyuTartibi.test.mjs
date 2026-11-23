// 23.11: yon panel menyusini foydalanuvchi o'zi tartiblaydi (bosib turib sudrash / ↑↓), tartib brauzerda foydalanuvchi bo'yicha saqlanadi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as lib from '../src/lib/menyuTartibi.ts';

const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8');
const k = (x) => x;

test('saqlangan tartib qo‘llanadi; saqlanmagan (yangi) band standart joyiga yaqin, yo‘qolgan kalitlar tashlanadi', () => {
  assert.deepEqual(lib.tartibniQollash(['a', 'b', 'c', 'd'], k, ['c', 'a', 'd', 'b']), ['c', 'a', 'd', 'b']);
  assert.deepEqual(lib.tartibniQollash(['a', 'b', 'c'], k, null), ['a', 'b', 'c']);
  // "x" keyin qo'shildi (standartda b dan keyin) — tartibda ham b dan keyin chiqadi.
  assert.deepEqual(lib.tartibniQollash(['a', 'b', 'x', 'c'], k, ['c', 'b', 'a']), ['c', 'b', 'x', 'a']);
  // Standartda birinchi yangi band — boshida.
  assert.deepEqual(lib.tartibniQollash(['n', 'a', 'b'], k, ['b', 'a']), ['n', 'b', 'a']);
  // Endi yo'q va takroriy kalitlar e'tiborsiz.
  assert.deepEqual(lib.tartibniQollash(['a', 'b'], k, ['eski', 'b', 'b', 'a']), ['b', 'a']);
  const obyektlar = [{ key: 'a' }, { key: 'b' }];
  assert.equal(lib.tartibniQollash(obyektlar, (x) => x.key, ['b', 'a'])[0], obyektlar[1], 'o‘sha obyektlar qaytadi');
});

test('ko‘chirish va rol bo‘yicha yashirin bandlar o‘z joyida qoladi', () => {
  assert.deepEqual(lib.kochirish(['a', 'b', 'c', 'd'], 0, 2), ['b', 'c', 'a', 'd']);
  assert.deepEqual(lib.kochirish(['a', 'b', 'c'], 2, 0), ['c', 'a', 'b']);
  assert.deepEqual(lib.kochirish(['a', 'b'], 0, 5), ['a', 'b']);
  // Kassir "xodimlar"ni ko'rmaydi: u o'z joyida (3-o'rin) qoladi, ko'rinadiganlar tartibi qo'llanadi.
  assert.deepEqual(lib.korinadiganTartibniBirlashtirish(['bosh', 'savdo', 'xodimlar', 'kassa'], ['kassa', 'bosh', 'savdo']), ['kassa', 'bosh', 'xodimlar', 'savdo']);
});

test('saqlangan matnni tekshirish: buzilgan yoki eski format — null; foydalanuvchi bo‘yicha kalit', () => {
  assert.deepEqual(lib.tartibniTahlil('{"asosiy":["a","b"],"bolalar":{"savdo":["x","y"],"yomon":[1]}}'), { asosiy: ['a', 'b'], bolalar: { savdo: ['x', 'y'] } });
  assert.equal(lib.tartibniTahlil('buzilgan'), null);
  assert.equal(lib.tartibniTahlil('{"asosiy":"a"}'), null);
  assert.equal(lib.tartibniTahlil(null), null);
  assert.equal(lib.tartibKaliti('u1'), 'yepost-menyu-tartibi:u1');
  assert.notEqual(lib.tartibKaliti('u1'), lib.tartibKaliti('u2'));
});

test('ulanish: panel tartibni qo‘llaydi (RBAC filtri saqlangan), tahrir rejimi, bosib turish, mobil menyu ham shu tartibda', () => {
  const kod = manba('src/Components/layout/YonPanel.tsx');
  assert.match(kod, /tartibniQollash\(menyular, \(menu\) => menu\.key, tartib\?\.asosiy\)/);
  assert.match(kod, /\.filter\(\(menu\) => sahifagaRuxsatBormi\(profil, menu\.path\)\)/);
  assert.match(kod, /<MenyuTahriri[\s\S]*?onKochirish=\{tartibniKochirish\}/);
  assert.match(kod, /onPointerDown=\{navBosildi\}/);
  assert.match(kod, /data-tartib-kalit=\{bola\.key\}\s*data-tartib-ota=\{menu\.key\}/);
  assert.match(kod, /<MobilNavigatsiya menyular=\{korinadiganMenyular\.map/);
  for (const til of ['uz', 'ru']) {
    const r = JSON.parse(manba(`src/i18n/locales/${til}/nav.json`)).sidebar.reorder;
    for (const kalit of ['open', 'openHint', 'title', 'hint', 'reset', 'done', 'up', 'down', 'drag', 'children', 'moved']) assert.ok(r[kalit], `${til} ${kalit}`);
  }
});
