// 25.11: bo'sh jadval xabari ko'rinadigan qism o'rtasida; mahsulot tanlash maydonlari va ro'yxatlari nomlarni kesmaydi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STANDART_SOTUV_USTUNLARI, ustunShabloni } from '../src/lib/sotuvUstunlari.ts';

const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8').split(String.fromCharCode(13)).join('');

test('SmartTable: butun qatorli markazlangan katak ko\'rinadigan qism o\'rtasiga suriladi va aylantirish maydonini kengaytirmaydi', () => {
  const kod = manba('src/Components/common/smart-table/SmartTable.tsx');
  assert.match(kod, /frame\.style\.setProperty\("--smart-ortaga", value\)/);
  // Kirish animatsiyasidagi scale ta'sir qilmasin: rect / offsetWidth masshtabi.
  assert.match(kod, /const scale = table\.offsetWidth > 0 && rect\.width > 0 \? rect\.width \/ table\.offsetWidth : 1;/);
  assert.match(kod, /scroller\.addEventListener\("scroll", schedule, \{ passive: true \}\)/);
  const css = manba('src/Components/common/smart-table/smart-table.css');
  assert.match(css, /td\[colspan\]:only-child\.text-center > \*,\s*table\.smart-data-table > tbody > tr > td\[colspan\]:only-child > \[role="status"\] \{ translate: var\(--smart-ortaga, 0px\) 0; \}/);
  assert.match(css, /td\[colspan\]:only-child:is\(\.text-center, :has\(> \[role="status"\]\)\) \{ overflow-x: clip; \}/);
  // Inventarizatsiya: yalang'och matn element ichida.
  const inv = manba('src/Pages/Ombor/Inventarizatsiya.tsx');
  assert.match(inv, /<span className="block">\{t\("inventarizatsiya\.loadingDocuments"\)\}<\/span>/);
  assert.match(inv, /<p>\{qidiruv \|\| sanaDan/);
});

test('SavdoSelect: ro\'yxat kengligi chaqiruvchining min-w-[Npx] sinfini hisobga oladi (inline minWidth:0 uni bekor qilardi)', () => {
  const kod = manba('src/Pages/Savdo/SavdoSelect.tsx');
  assert.ok(kod.includes(String.raw`const engKichikKenglik = Number(/(?:^|\s)min-w-\[(\d+)px\]/.exec(dropdownClassName)`), "min-w sinfi o'qiladi");
  assert.match(kod, /Math\.min\(Math\.max\(rect\.width, engKichikKenglik\), window\.innerWidth - viewportPadding \* 2\)/);
  assert.match(kod, /title=\{\(labelToText\(selectedLabel\) \|\| selected\?\.searchLabel \|\| labelToText\(selected\?\.label\)\) \|\| undefined\}/);
  // Regex xulqi: prefikssiz min-w olinadi, sm:min-w emas.
  const ol = (s) => Number(/(?:^|\s)min-w-\[(\d+)px\]/.exec(s)?.[1] ?? 0);
  assert.equal(ol('[&>div>div]:text-center min-w-[600px] max-w-[min(720px,calc(100vw-32px))]'), 600);
  assert.equal(ol('sm:min-w-[400px]'), 0);
  assert.equal(ol(''), 0);
});

test('Yangi sotuv / qoralama: qatorlar konteyner kengligi bo\'yicha, mahsulot ustuni keng, narx turi va chegirma sig\'adi', () => {
  const kod = manba('src/Pages/Savdo/YangiSotuvModal.tsx');
  assert.match(kod, /<section ref=\{mahsulotKartasiRef\} className=\{cn\(kartaKlassi, "@container"\)\}>/);
  // Ustunlar tartibi foydalanuvchi bo'yicha: shablon CSS o'zgaruvchidan, kengliklar lib/sotuvUstunlari da (standart tartibda avvalgidek).
  assert.match(kod, /const qatorUstunlari = "@min-\[900px\]:grid-cols-\(--sotuv-ustunlar\)";/);
  assert.equal(
    ustunShabloni(STANDART_SOTUV_USTUNLARI),
    '32px minmax(0,2.4fr) minmax(150px,1.2fr) minmax(88px,1fr) minmax(64px,0.7fr) minmax(150px,1.25fr) minmax(96px,0.9fr) 40px'
  );
  assert.match(kod, /const mobilYorliqKlassi = "[^"]*@min-\[900px\]:hidden/);
  assert.match(kod, /dropdownClassName="\[&>div>div\]:text-center min-w-\[600px\] max-w-\[min\(720px,calc\(100vw-32px\)\)\]"/);
  assert.match(kod, /sm:flex @min-\[900px\]:hidden @min-\[1100px\]:flex/);
  const boshi = kod.indexOf('products.keyboardHint'), oxiri = kod.indexOf('ref={xulosaKartasiRef}');
  assert.ok(boshi > 0 && oxiri > boshi);
  assert.doesNotMatch(kod.slice(boshi, oxiri + 200), /\blg:/, 'qator qismida ekran (lg:) variantlari qolmagan');
});

test('Boshqa mahsulot tanlovlari: Yangi chiqim keng ustun, Ombor ro\'yxati 380px + title, Ishlab chiqarish ro\'yxati kengayadi va o\'raladi', () => {
  const chiqim = manba('src/Pages/Ombor/YangiChiqimModal.tsx');
  assert.match(chiqim, /min-w-\[1680px\] space-y-3/);
  assert.equal((chiqim.match(/grid-cols-\[42px_76px_2\.6fr_1fr_1fr_1\.15fr_1\.4fr_1\.5fr_1fr_1fr_48px\]/g) ?? []).length, 2);
  const tanlov = manba('src/Pages/Ombor/MahsulotTanlov.tsx');
  assert.match(tanlov, /Math\.max\(rect\.width, 380\)/);
  assert.match(tanlov, /title=\{qidiruv === null && tanlanganMatn \? tanlanganMatn : undefined\}/);
  const ichb = manba('src/Pages/IshlabChiqarish/umumiy.tsx');
  assert.match(ichb, /absolute inset-x-0 top-full z-30 mt-2 max-h-64 overflow-y-auto sm:right-auto sm:w-max sm:min-w-full sm:max-w-\[min\(480px,calc\(100vw-160px\)\)\]/);
  assert.match(ichb, /<span className="min-w-0 flex-1 whitespace-normal break-words">\{modifikatsiyaNomi\(mod\)\}<\/span>/);
});
