// Kassa → Yangi tushum: "Tushum turi" (umumiy Tanlov) — tanlaganda va tashqariga bosganda yopiladi; ochiq turganda boshqa joy
// (masalan "Bank") birinchi bosishda ishlaydi — butun ekranni to'suvchi ko'rinmas qatlam yo'q (kompyuter, planshet, telefon).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8').split(String.fromCharCode(13)).join('');

test('Tanlov: to\'suvchi qatlam yo\'q, tashqariga pointerdown yopadi, tanlash yopadi', () => {
  const kod = manba('src/Pages/XaridorUchot/Tanlov.tsx');
  assert.doesNotMatch(kod, /fixed inset-0/, 'bosishni yutuvchi qatlam qaytmasin');
  assert.match(kod, /document\.addEventListener\("pointerdown", tashqari, true\)/);
  assert.match(kod, /if \(ildizRef\.current\?\.contains\(event\.target as Node\)\) return;/);
  assert.match(kod, /<div ref=\{ildizRef\} className="relative">/);
  assert.match(kod, /function tanlash\(value: string\) \{\n\s+onChange\(value\);\n\s+yopish\(true\);/);
  // Kassa oynasi shu komponentni ishlatadi.
  assert.match(manba('src/Pages/KassaUchot/KassaAmaliyotModal.tsx'), /import Tanlov from "@\/Pages\/XaridorUchot\/Tanlov";/);
});
