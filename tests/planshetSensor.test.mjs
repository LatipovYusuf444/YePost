// 26.11: iPad/planshet — ro'yxatlar barmoq bilan ishlaydi, tashqariga tegilganda yopiladi, maydon kattalashmaydi, oynalar dvh.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ildiz = new URL('../', import.meta.url);
const manba = (yol) => readFileSync(new URL(yol, ildiz), 'utf8').split(String.fromCharCode(13)).join('');
function fayllar(papka) {
  return readdirSync(papka).flatMap((nom) => { const y = join(papka, nom); return statSync(y).isDirectory() ? fayllar(y) : /\.tsx?$/.test(nom) ? [y] : []; });
}
const src = fayllar(fileURLToPath(new URL('src', ildiz)));

test('variantlarda sichqoncha harakati faqat sichqoncha uchun (iOS Safari bosishni yutmasin)', () => {
  for (const f of src) {
    const kod = readFileSync(f, 'utf8');
    // Belgilangan variant holatini o'zgartiradigan onMouseMove/onMouseEnter qolmagan.
    assert.doesNotMatch(kod, /onMouseMove=\{\(\) => \{?\s*if \([^)]*\) set[A-Z]\w*Faol/, f);
  }
  assert.match(manba('src/Pages/Savdo/SavdoSelect.tsx'), /onPointerMove: \(event: ReactPointerEvent\) => \{\s*if \(event\.pointerType === "mouse"/);
  assert.match(manba('src/Pages/Ombor/YangiKirimModal.tsx'), /if \(event\.pointerType !== "mouse"\) return;\s*if \(indeks !== supplierFaol\) setSupplierFaol\(indeks\);/);
  assert.match(manba('src/Components/layout/YonPanel.tsx'), /onPointerEnter: \(event: ReactPointerEvent<HTMLElement>\) => \{\s*if \(event\.pointerType === "mouse"\)/);
});

test('tashqariga bosib yopish pointerdown bilan (iOS oddiy joyga tegilganda mousedown yubormaydi)', () => {
  for (const f of src) assert.doesNotMatch(readFileSync(f, 'utf8'), /EventListener\("mousedown"/, f);
});

test('AppSelect: o\'ram chekinmaydi, tugma o\'z chekinishi bilan; Kirim/Chiqimda ikkinchi strelka yo\'q', () => {
  const kod = manba('src/Components/ui/AppSelect.tsx');
  assert.match(kod, /!bg-transparent !p-0 !shadow-none/);
  assert.match(kod, /bg-white px-4 py-0 text-left/);
  assert.doesNotMatch(kod, /px-\[inherit\]/);
  assert.doesNotMatch(manba('src/Pages/Ombor/YangiKirimModal.tsx'), /appearance-none pr-10/);
  assert.doesNotMatch(manba('src/Pages/Ombor/YangiChiqimModal.tsx'), /appearance-none pr-10/);
});

test('iPad: maydonga bosilganda kattalashmaydi, oynalar dvh, avtomatik fokus faqat sichqonchada, hover amallar ko\'rinadi', () => {
  assert.match(manba('index.html'), /maximum-scale=1/);
  assert.match(manba('index.html'), /navigator\.maxTouchPoints > 1/);
  for (const f of src) assert.doesNotMatch(readFileSync(f, 'utf8'), /(?:h|max-h|min-h)-\[(?:calc\()?\d+vh/, f);
  assert.match(manba('src/Pages/Savdo/SavdoSelect.tsx'), /if \(sichqonchaliQurilma\(\)\) window\.requestAnimationFrame\(\(\) => qidiruvInputRef\.current\?\.focus\(\)\);/);
  const css = manba('src/index.css');
  assert.match(css, /touch-action: manipulation;/);
  assert.match(css, /@media \(hover: none\) \{\s*\.hover-amal \{ opacity: 1 !important; \}/);
  assert.match(manba('src/Pages/SozlamalarUchot/OlchovBirligiBolimi.tsx'), /hover-amal flex gap-1\.5 opacity-0/);
  assert.match(manba('src/Components/common/smart-table/smart-table.css'), /@media \(hover: hover\) \{\s*table\.smart-data-table tbody tr:hover/);
});
