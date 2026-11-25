// 25.11: jadval yonga aylantirilsa "Ustunlar" tugmasi ham siljib ketardi; Barcha sotuvlarda sana filtri kartadan kesilib qolardi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8').split(String.fromCharCode(13)).join('');

test('SmartTable: ramka jadval kengligida, "Ustunlar" tugmasi ko\'rinadigan o\'ng chetda sticky', () => {
  const css = manba('src/Components/common/smart-table/smart-table.css');
  const ramka = css.slice(css.indexOf('.smart-table-frame {'), css.indexOf('}', css.indexOf('.smart-table-frame {')));
  assert.match(ramka, /width: max-content; min-width: 100%; max-width: none;/);
  assert.doesNotMatch(ramka, /max-width: 100%/, 'ramka konteynerga cheklansa sticky tugma u bilan birga siljiydi');
  assert.match(css, /\.smart-table-toolbar > \.smart-settings-trigger \{ position: sticky; right: 12px; z-index: 2; \}/);
  // Aylantirish egasi o'zgarmagan: ota konteyner.
  assert.match(css, /:where\(div, section\):has\(> \.smart-table-frame\) \{ min-width: 0; max-width: 100%; overflow-x: auto;/);
  assert.match(manba('src/Components/common/smart-table/SmartTable.tsx'), /<div className="smart-table-toolbar">[\s\S]*?className="smart-settings-trigger"/);
});

test('Barcha sotuvlar: filtr qatori tor ekranda o\'raladi, qidiruv torayadi — sana filtri kesilmaydi', () => {
  const kod = manba('src/Pages/Savdo/index.tsx');
  assert.match(kod, /lg:flex-row lg:flex-wrap lg:items-center lg:justify-between/);
  assert.match(kod, /sm:w-\[390px\] lg:w-auto lg:min-w-\[220px\] lg:max-w-\[390px\] lg:flex-1/);
  assert.match(kod, /sm:flex-row sm:items-center lg:ml-auto lg:shrink-0">\s*\{statusFilterKorinsin && \(/);
  // Chap guruhda min-w-0 bo'lmasin: aks holda qator o'ralmaydi va qidiruv filtrlar ostida qisiladi.
  assert.doesNotMatch(kod, /sm:flex-row sm:items-center lg:min-w-0 lg:flex-1/);
});

test('Inventarizatsiya: 4 ustunli filtr konteyner kengligi bo\'yicha (yon panel ochiq 1280px da 2x2)', () => {
  const kod = manba('src/Pages/Ombor/Inventarizatsiya.tsx');
  assert.match(kod, /sm:grid-cols-2 @min-\[890px\]:grid-cols-\[minmax\(240px,1fr\)_minmax\(260px,1\.1fr\)_minmax\(150px,\.55fr\)_minmax\(170px,\.65fr\)\]/);
  assert.doesNotMatch(kod, /lg:grid-cols-\[minmax\(240px,1fr\)_minmax\(260px,1\.1fr\)/);
});
