// 25.11: ochiladigan ro'yxat sahifani aylantirib yubormasin; qoralama oynasida ombor tanlangach mahsulot maydoni ko'rinadi;
// maydonda faqat mahsulot nomi; qoldiq yetmasligi qisqa belgi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8').split(String.fromCharCode(13)).join('');

test('variantniKorsatish: faqat ro\'yxatni aylantiradi, sahifaga tegmaydi', async () => {
  const { variantniKorsatish } = await import('../src/lib/variantniKorsatish.ts');
  const uslub = new Map();
  globalThis.getComputedStyle = (el) => ({ overflowY: uslub.get(el) ?? 'visible' });
  const quti = { scrollTop: 0, scrollHeight: 500, clientHeight: 100, parentElement: null, getBoundingClientRect: () => ({ top: 100, bottom: 200 }) };
  const royxat = { contains: () => true };
  uslub.set(quti, 'auto');
  const pastdagi = { parentElement: quti, getBoundingClientRect: () => ({ top: 230, bottom: 260 }) };
  variantniKorsatish(royxat, pastdagi);
  assert.equal(quti.scrollTop, 60, 'pastda — 60px pastga');
  const tepadagi = { parentElement: quti, getBoundingClientRect: () => ({ top: 80, bottom: 110 }) };
  variantniKorsatish(royxat, tepadagi);
  assert.equal(quti.scrollTop, 40, 'tepada — 20px yuqoriga');
  // Aylanadigan ota yo'q (ro'yxat hali joylashmagan) — hech narsa qilinmaydi, sahifa aylanmaydi.
  const yalang = { parentElement: { parentElement: null }, getBoundingClientRect: () => ({ top: 0, bottom: 10 }) };
  assert.doesNotThrow(() => variantniKorsatish(royxat, yalang));
  assert.doesNotThrow(() => variantniKorsatish(null, null));
});

test('ochiladigan ro\'yxatlarda scrollIntoView yo\'q; portal ro\'yxat joylashguncha ko\'rinmas fixed', () => {
  for (const f of ['src/Components/ui/AppSelect.tsx', 'src/Pages/XaridorUchot/Tanlov.tsx', 'src/Components/layout/KategoriyaMenyusi.tsx', 'src/Pages/Savdo/SavdoSelect.tsx', 'src/Pages/Ombor/MahsulotTanlov.tsx']) {
    const kod = manba(f);
    assert.match(kod, /variantniKorsatish\(/, f);
    assert.doesNotMatch(kod.replace(/tugma\.scrollIntoView\(\{ block: "center" \}\)/, ''), /scrollIntoView\(/, f);
  }
  assert.match(manba('src/Components/ui/AppSelect.tsx'), /useState<CSSProperties>\(\{ position: "fixed", top: 0, left: 0, visibility: "hidden" \}\)/);
  assert.match(manba('src/Pages/Savdo/SavdoSelect.tsx'), /useState<CSSProperties>\(\{ position: "fixed", top: 0, left: 0, visibility: "hidden" \}\)/);
  assert.match(manba('src/Pages/Ombor/Inventarizatsiya.tsx'), /variantniKorsatish\(variant\?\.closest<HTMLElement>\('\[role="listbox"\]'\), variant\)/);
});

test('qoralama: dasturiy ochilishda maydon ko\'rinadigan joyga aylantiriladi; maydonda faqat nom; qisqa qoldiq belgisi', () => {
  const ss = manba('src/Pages/Savdo/SavdoSelect.tsx');
  assert.match(ss, /if \(rect\.top < 80 \|\| rect\.bottom > window\.innerHeight - 260\) tugma\.scrollIntoView\(\{ block: "center" \}\);\s*\}\s*setOpen\(true\);/);
  const kod = manba('src/Pages/Savdo/YangiSotuvModal.tsx');
  assert.match(kod, /const katalogNomlari = useMemo\(\(\) => new Map\(katalogOptionlariRoyxati\.map\(\(option\) => \[option\.value, option\.searchLabel\]\)\)/);
  assert.match(kod, /<span className="line-clamp-2 whitespace-normal break-words text-\[13px\] font-semibold leading-\[1\.2\] text-slate-800">\{nom\}<\/span>/);
  assert.match(kod, /\$\{selectTugmasiKlassi\} h-auto min-h-11 py-1 /);
  assert.match(kod, /⚠ \{t\("stockWarning\.rowShort"/);
  assert.match(kod, /title=\{t\("stockWarning\.row", \{/);
  for (const til of ['uz', 'ru']) {
    const j = JSON.parse(manba(`src/i18n/locales/${til}/savdo_yangi.json`));
    assert.ok(j.stockWarning.rowShort.includes('{{available}}'), til);
  }
});
