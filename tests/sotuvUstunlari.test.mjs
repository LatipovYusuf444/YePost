// Yangi sotuv: mahsulotlar jadvali ustunlari tartibi (sudrab o'zgartirish, foydalanuvchi bo'yicha saqlash).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as lib from '../src/lib/sotuvUstunlari.ts';

const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8').split(String.fromCharCode(13)).join('');

test('ko\'chirish: chapga/o\'ngga, chegaradan chiqmaydi, o\'zgarmasa o\'sha massiv', () => {
  const t = lib.STANDART_SOTUV_USTUNLARI;
  assert.deepEqual(lib.ustunniKochirish(t, 'miqdor', 0), ['miqdor', 'mahsulot', 'katalog', 'sotuvNarxi', 'chegirma']);
  assert.deepEqual(lib.ustunniKochirish(t, 'mahsulot', 9), ['katalog', 'sotuvNarxi', 'miqdor', 'chegirma', 'mahsulot']);
  assert.deepEqual(lib.ustunniKochirish(t, 'katalog', -3), ['katalog', 'mahsulot', 'sotuvNarxi', 'miqdor', 'chegirma']);
  assert.equal(lib.ustunniKochirish(t, 'sotuvNarxi', 2), t);
});

test("saqlangan tartib tahlili: noma'lum/takror tashlanadi, yetishmagani standart qo'shnisidan keyin, buzilgani null", () => {
  assert.deepEqual(lib.ustunTartibiniTahlil(JSON.stringify(['chegirma', 'mahsulot', 'katalog', 'sotuvNarxi', 'miqdor'])), ['chegirma', 'mahsulot', 'katalog', 'sotuvNarxi', 'miqdor']);
  // Yetishmagani standartdagi qo'shnisidan keyin: katalog — mahsulotdan, sotuvNarxi — katalogdan, chegirma — miqdordan keyin.
  assert.deepEqual(lib.ustunTartibiniTahlil(JSON.stringify(['miqdor', 'x', 'miqdor', 'mahsulot'])), ['miqdor', 'chegirma', 'mahsulot', 'katalog', 'sotuvNarxi']);
  assert.equal(lib.ustunTartibiniTahlil('buzuq'), null);
  assert.equal(lib.ustunTartibiniTahlil('{}'), null);
  assert.equal(lib.ustunTartibiniTahlil(null), null);
  assert.equal(lib.ustunTartibiniTahlil('[]'), null);
});

test('shablon: № va Jami/o\'chirish joyida, o\'rtadagilar tartib bo\'yicha; standart tartib aniqlanadi', () => {
  assert.equal(lib.ustunShabloni(['miqdor', 'mahsulot', 'katalog', 'sotuvNarxi', 'chegirma']), '32px minmax(64px,0.7fr) minmax(0,2.4fr) minmax(150px,1.2fr) minmax(88px,1fr) minmax(150px,1.25fr) minmax(96px,0.9fr) 40px');
  assert.equal(lib.standartTartibmi([...lib.STANDART_SOTUV_USTUNLARI]), true);
  assert.equal(lib.standartTartibmi(['miqdor', 'mahsulot', 'katalog', 'sotuvNarxi', 'chegirma']), false);
});

test('ulanishlar: foydalanuvchi bo\'yicha saqlash (standart — o\'chiriladi), sudrash barmoq va klaviaturada, tarjimalar', () => {
  const hook = manba('src/hooks/useSotuvUstunTartibi.ts');
  assert.match(hook, /useFoydalanuvchiSozlamasi<SotuvUstuni\[\]>\(SOTUV_USTUN_KALITI, ustunTartibiniTahlil\)/);
  assert.match(hook, /saqlash\(standartTartibmi\(yangi\) \? null : yangi\)/);
  const sudrash = manba('src/Pages/Savdo/useUstunSudrash.ts');
  assert.match(sudrash, /onPointerDown/);
  assert.match(sudrash, /event\.key !== "ArrowLeft" && event\.key !== "ArrowRight"/);
  assert.match(manba('src/Pages/Savdo/YangiSotuvModal.tsx'), /touch-pan-y select-none/);
  for (const til of ['uz', 'ru']) {
    const d = JSON.parse(manba(`src/i18n/locales/${til}/savdo_yangi.json`));
    assert.ok(d.table.dragColumn && d.table.moveColumn.includes('{{nom}}') && d.table.resetColumns, til);
  }
});
