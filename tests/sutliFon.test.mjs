// 25.11: toza oq fon ko'zni charchatardi — butun ilovada kartalar, oynalar va sahifa foni sutli tusda (har bir mavzuga mos).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8').split(String.fromCharCode(13)).join('');

test('sutli fon: bg-white/slate-50 o\'zgaruvchi orqali, uchala mavzuda o\'z tusi, chop etishda oq', () => {
  const css = manba('src/index.css');
  const blok = css.slice(css.indexOf('"Sutli" fon'));
  assert.ok(blok.length > 100, 'sutli fon bloki bor');
  for (const tema of [':root {', 'html[data-theme="green"] {', 'html[data-theme="purple"] {']) {
    const i = blok.indexOf(tema);
    assert.ok(i >= 0, tema);
    assert.match(blok.slice(i, i + 200), /--yp-sut: #[0-9A-F]{6};/);
    assert.doesNotMatch(blok.slice(i, i + 200), /--yp-sut: #FFFFFF;/, `${tema} toza oq emas`);
  }
  assert.match(blok, /--color-white: var\(--yp-sut\);/);
  assert.match(blok, /--color-slate-50: var\(--yp-sut-ichki\);/);
  assert.match(blok, /--theme-surface: var\(--yp-sut\);/);
  assert.match(blok, /@media print \{[\s\S]*--yp-sut: #FFFFFF;/);
  // Hover holatlari buzilmasin: qo'lda yozilgan oq fonlar faqat utilities qatlamida (!important yo'q).
  const qatlam = blok.slice(blok.indexOf('@layer utilities'), blok.indexOf('/* Yashil/binafsha mavzularda'));
  assert.doesNotMatch(qatlam, /!important/);
  assert.match(manba('src/Components/common/smart-table/smart-table.css'), /--smart-surface: var\(--color-white, #fff\);/);
});

test('chegaralar va tugmalar sutli fonda ko\'rinadi: iliq/to\'q chegara, tugma kartadan yorqin, inline rang bosilmaydi', () => {
  const css = manba('src/index.css');
  const blok = css.slice(css.indexOf('"Sutli" fon'));
  assert.match(blok, /--color-slate-200: var\(--yp-chegara\);/);
  assert.match(blok, /--border: var\(--yp-chegara\);/);
  // gold/orange `@theme inline` — sinf qoidalari bilan.
  assert.match(blok, /html \[class~="border-orange-100"\],[\s\S]*?\{ border-color: var\(--yp-chegara-rang\); \}/);
  assert.match(blok, /html \[class~="ring-orange-100"\],[\s\S]*?--tw-ring-color: var\(--yp-chegara-rang\);/);
  assert.match(blok, /html button\[class~="bg-white"\],[\s\S]*?\{ background-color: var\(--yp-sut-tugma\); \}/);
  assert.match(css, /html\[data-theme="green"\] \[class~="bg-white"\]:not\(\[style\*="background"\]\)/);
  assert.match(blok, /:is\(button, input, textarea, select\)\[class~="bg-white"\]:not\(\[style\*="background"\]\)/);
  assert.match(manba('src/Components/common/smart-table/smart-table.css'), /--smart-cell-border: var\(--yp-chegara, #d5dde8\);/);
  assert.match(manba('src/Pages/BoshSahifa/index.tsx'), /rounded-xl border border-gray-200 bg-white text-xs font-bold text-\[#475569\] shadow-sm/);
});

test('Bosh sahifa: maydonlar chegarali va sutli, jami bloki sutli + chegara, kartalar 2px chegara, tanlov paneli iliq', () => {
  const kod = manba('src/Pages/BoshSahifa/index.tsx');
  assert.doesNotMatch(kod, /bg-gold-50 px-3 (py-2 )?text-sm outline-none focus:bg-white/, 'eski chegarasiz oq-havorang maydon qolmasin');
  assert.equal((kod.match(/border border-gray-200 bg-white px-3 (py-2 )?text-sm shadow-\[inset_0_1px_2px_rgba\(15,23,42,\.04\)\]/g) ?? []).length, 4);
  assert.match(kod, /<div className="mt-auto rounded-xl border border-gray-200 bg-slate-50 p-3">/);
  assert.equal((kod.match(/rounded-\[26px\] border-2 border-\(--yp-chegara\)/g) ?? []).length, 2);
  assert.match(manba('src/index.css'), /html \[class~="bg-gold-100"\] \{ background-color: var\(--yp-chegara-och\); \}/);
});
