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

// 25.11: tartib qayta kirganda / ertasi kuni standartga qaytib qolardi — kalit profil yuklanishiga bog'liq edi (profil?.id ?? username).
test('saqlash kalitlari: asosiy — foydalanuvchi ID, zaxira — do‘kon|login; eski login kaliti faqat o‘qiladi', () => {
  const { yozish, oqish } = lib.tartibKalitlari({ id: 'u1', login: 'w1|admin', eskiLogin: 'admin' });
  assert.deepEqual(yozish, ['yepost-menyu-tartibi:u1', 'yepost-menyu-tartibi:login:w1|admin']);
  assert.deepEqual(oqish, [...yozish, 'yepost-menyu-tartibi:admin']);
  assert.equal(yozish[0], lib.tartibKaliti('u1'), 'oldin saqlangan (profil.id) tartib yo‘qolmaydi');
  // ID hali noma'lum bo'lsa ham zaxira kalit bir xil — o'sha tartib topiladi.
  assert.deepEqual(lib.tartibKalitlari({ login: 'w1|admin' }).yozish, ['yepost-menyu-tartibi:login:w1|admin']);
  assert.deepEqual(lib.tartibKalitlari({}), { yozish: ['yepost-menyu-tartibi:mehmon'], oqish: ['yepost-menyu-tartibi:mehmon'] });
});

test('tartibni topish: birinchi yaroqli kalit; buzilgan qiymat va xotira xatosi o‘tkazib yuboriladi', () => {
  const xotira = new Map([
    ['b', 'buzilgan'],
    ['c', '{"asosiy":["kassa","savdo"],"bolalar":{}}'],
  ]);
  const olish = (k) => xotira.get(k) ?? null;
  assert.deepEqual(lib.tartibniTopish(olish, ['a', 'b', 'c']), { tartib: { asosiy: ['kassa', 'savdo'], bolalar: {} }, kalit: 'c' });
  assert.equal(lib.tartibniTopish(olish, ['a', 'b']), null);
  assert.equal(lib.tartibniTopish(() => { throw new Error('yopiq'); }, ['a']), null);
});

test('ulanish: panel egasini token ichidagi ID dan oladi, hook barcha kalitlarga yozadi va eski kalitdan ko‘chiradi', () => {
  const panel = manba('src/Components/layout/YonPanel.tsx');
  assert.match(panel, /id: profil\?\.id \?\? token\.id/);
  assert.match(panel, /useMenyuTartibi\(tartibEgasi\)/);
  const hook = manba('src/Components/layout/useMenyuTartibi.ts');
  assert.match(hook, /tartibKalitlari\(egasi\)/);
  assert.match(hook, /if \(yangi\) yozish\(yozishImzo\.split\([^)]*\), yangi\);\s*else yozish\(kalitlar, null\);/);
  assert.match(hook, /yozish\(kalitlar, tartib\)/, 'zaxira/eski kalitdan topilgan tartib asosiy kalitga ko‘chiriladi');
  assert.ok(!/localStorage\.clear\(\)/.test(manba('src/lib/sessiyaIzolyatsiyasi.ts') + manba('src/lib/authTokenStorage.ts')), 'chiqishda tartib o‘chmaydi');
});

// 25.11: ochiq bo'lim qayta bosilsa yopiladi va ostidagi keyingi bo'lim avtomatik ochiladi (ketma-ket).
test('keyingi bo‘lim: tartibdagi navbatdagi bo‘lim, oddiy bandlar o‘tkaziladi, oxirgisidan keyin — null', () => {
  const r = [
    { path: '/', },
    { path: '/savdo', bolalar: [1] },
    { path: '/kassa' },
    { path: '/ombor', bolalar: [1, 2] },
    { path: '/bosh', bolalar: [] },
    { path: '/hisobot', bolalar: [1] },
  ];
  assert.equal(lib.keyingiBolim(r, '/savdo')?.path, '/ombor');
  assert.equal(lib.keyingiBolim(r, '/ombor')?.path, '/hisobot', 'bo‘sh bo‘lim o‘tkaziladi');
  assert.equal(lib.keyingiBolim(r, '/hisobot'), null);
  assert.equal(lib.keyingiBolim(r, '/yoq'), null);
  const panel = manba('src/Components/layout/YonPanel.tsx');
  assert.match(panel, /const keyingi = keyingiBolim\(korinadiganMenyular, menu\.path\);/);
  assert.match(panel, /\[menu\.path\]: false, \.\.\.\(keyingi \? \{ \[keyingi\.path\]: true \} : \{\}\)/);
});
