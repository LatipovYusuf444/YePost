// 27.11 — Ikki rejim: asosiy (o'zgarmaydi) va "Shisha" (fon rasmi + tutunli shisha, oq pill tugmalar) — hozircha Bosh sahifada.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import * as tolov from '../src/lib/tolovTuriRanglari.ts';
import { QATTIQ_MATN, qoida, qiymat } from '../scripts/shisha-mavzu/generatsiya.mjs';

const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8').split(String.fromCharCode(13)).join('');
const css = manba('src/index.css');
const blok = css.slice(css.indexOf('/* SHISHA-MAVZU:BOSHI */'), css.indexOf('/* SHISHA-MAVZU:OXIRI */'));

test('rejimlar: "default" va "shisha"; eski green/purple asosiyga qaytadi, tanlagich ikki tugmali', () => {
  assert.match(manba('src/Components/theme/themeContext.ts'), /export type ThemeName = "default" \| "shisha";/);
  assert.match(manba('src/Components/theme/ThemeProvider.tsx'), /=== "shisha" \? "shisha" : "default"/);
  const tanlagich = manba('src/Components/theme/ThemeSwitcher.tsx');
  assert.doesNotMatch(tanlagich, /green|purple|emerald|violet/);
  assert.match(tanlagich, /id: "shisha"/);
  assert.doesNotMatch(css, /data-theme="(green|purple)"/);
  for (const til of ['uz', 'ru']) {
    const d = JSON.parse(manba(`src/i18n/locales/${til}/common.json`));
    assert.ok(d.theme.label && d.theme.default && d.theme.glass && d.theme.glassHint, til);
  }
});

test('shisha qoidalari faqat html[data-theme="shisha"][data-shisha-sahifa] da va faqat ekranda', () => {
  assert.ok(blok.length > 2000, 'blok bor');
  assert.match(blok, /^\/\* SHISHA-MAVZU:BOSHI \*\/\n@media screen \{/);
  const selektorlar = blok.replace(/\/\*[\s\S]*?\*\//g, '').match(/[^{}]+(?=\{)/g).map((s) => s.trim()).filter((s) => s && !s.startsWith('@'));
  const bolish = (sel) => {
    const qism = []; let chuqur = 0, joriy = '';
    for (const ch of sel) {
      if (ch === '(') chuqur += 1;
      if (ch === ')') chuqur -= 1;
      if (ch === ',' && chuqur === 0) { qism.push(joriy); joriy = ''; } else joriy += ch;
    }
    return [...qism, joriy].map((x) => x.trim()).filter(Boolean);
  };
  for (const s of selektorlar) for (const bitta of bolish(s)) assert.match(bitta, /html\[data-theme="shisha"\]\[data-shisha-sahifa\]/, bitta.slice(0, 90));
  // Generatsiya qilingan qism :where() bilan past aniqlikda (hover/fokus ustun); !important faqat Tailwind `!` tokenlari uchun.
  assert.match(blok, /@layer utilities \{\s*(\/\*[^*]*\*\/\s*)?:where\(html\[data-theme="shisha"\]\[data-shisha-sahifa\]\)/);
  const qatlam = blok.slice(blok.indexOf('@layer utilities'));
  for (const qoida of qatlam.match(/[^{}]+\{[^{}]*!important[^{}]*\}/g) ?? []) {
    for (const sel of qoida.slice(0, qoida.indexOf('{')).split(',\n')) assert.match(sel, /\[class~="(!|[^"]*:!)/, sel.trim().slice(0, 90));
  }
  const hook = manba('src/hooks/useShishaSahifa.ts');
  assert.match(hook, /html\.dataset\.shishaSahifa = nom;/);
  assert.match(hook, /if \(html\.dataset\.shishaSahifa === nom\) delete html\.dataset\.shishaSahifa;/);
  // Yon paneldagi barcha sahifalar: belgi asosiy layoutda (sahifa almashganda o'chib qolmaydi).
  assert.match(manba('src/Components/layout/AsosiyPanel.tsx'), /useShishaSahifa\("ilova"\);/);
  assert.doesNotMatch(manba('src/Pages/BoshSahifa/index.tsx'), /useShishaSahifa/);
});

test('rejim almashishi: View Transitions animatsiyasi, rejim tugmalarida ikonka; jadval sarlavhasi bitta to\'q qatlam', () => {
  const prov = manba('src/Components/theme/ThemeProvider.tsx');
  assert.match(prov, /startViewTransition/);
  assert.match(prov, /prefers-reduced-motion: reduce/, 'kam harakat — animatsiyasiz');
  assert.ok(prov.includes('flushSync(() => setThemeState(yangi))'));
  assert.ok(css.includes('html[data-mavzu-otish]::view-transition-new(root)'));
  const tanlagich = manba('src/Components/theme/ThemeSwitcher.tsx');
  assert.ok(tanlagich.includes('Ikonka: SunMedium') && tanlagich.includes('Ikonka: Sparkles'));
  assert.ok(blok.includes('table:not(:where(.font-serif *)) :is(thead, thead > tr) { background-color: transparent !important; }'));
  assert.ok(blok.includes('[style*="position: fixed"]'), 'portal (inline fixed) panellar ham noaniq');
  assert.ok(blok.includes('.app-modal-compact > [class*="rounded"]'));
});

test('generator variantlari: data-*, ekran, container, ixtiyoriy avlod, important — asosiy qoidani bosib ketmaydi', () => {
  const bir = (t) => qoida(t)[0];
  assert.match(bir('data-[state=active]:bg-white').sel, /\[class~="data-\[state=active\]:bg-white"\]\[data-state="active"\]$/);
  assert.deepEqual(bir('md:bg-white').shartlar, ['@media (width >= 48rem)']);
  assert.deepEqual(bir('@min-[900px]/cart:bg-transparent'), { sel: ':where(html[data-theme="shisha"][data-shisha-sahifa]) [class~="@min-[900px]/cart:bg-transparent"]', tana: 'background-color: transparent;', shartlar: ['@container cart (width >= 900px)'] });
  assert.equal(bir('[&_thead]:!bg-[#F4F8FF]').tana, 'background-color: var(--s-ichki) !important;');
  assert.match(bir('[&_thead]:!bg-[#F4F8FF]').sel, /\] thead$/);
  assert.equal(bir('text-red-500').tana, 'color: #F87171;', 'to\'q shishada semantik 500 matn ochroq');
  assert.deepEqual(qoida('dark:bg-input/30'), { tashlandi: 'dark:bg-input/30' });
});

test('fon rasmi va shisha sirtlar: rasm public da, yon/yuqori panel va asosiy oyna xiralashtirilgan', () => {
  const rasm = new URL('../public/mavzu/shisha-fon.webp', import.meta.url);
  assert.ok(existsSync(rasm) && statSync(rasm).size < 300_000, 'fon rasmi bor va yengil');
  // iOS: fixed fon o'rniga fixed qatlam (::before) — rasm sahifa bo'yiga cho'zilmaydi.
  assert.match(blok, /\.app-shell::before \{[^}]*position: fixed;[^}]*url\("\/mavzu\/shisha-fon\.webp"\) center \/ cover no-repeat;/);
  assert.doesNotMatch(blok, /background-attachment:\s*fixed;/);
  assert.match(blok, /:is\(\.yp-aside, \.yp-tip, \.yp-fly\) \{[^}]*backdrop-filter: var\(--s-blur\);/);
  // Yuqori panelga backdrop-filter to'g'ridan-to'g'ri emas (ichidagi fixed yopish qatlami qamalmasin) — ::before orqali.
  assert.match(blok, /header\.theme-sidebar::before \{[^}]*backdrop-filter: var\(--s-blur\);/);
  assert.doesNotMatch(blok, /header\.theme-sidebar \{[^}]*backdrop-filter/);
  assert.match(blok, /\.app-main-surface \{[^}]*backdrop-filter: var\(--s-blur-oyna\);/);
  // Yuqori panelning o'z soyasi (aylantirilgan holat halqasi) bosilmaydi.
  assert.doesNotMatch(blok, /header\.theme-sidebar \{[^}]*box-shadow/);
  assert.match(blok, /--color-white: #FFFFFF;/);
  assert.doesNotMatch(blok, /--color-slate-(900|950):/, 'qoplamalar (bg-slate-950/60) to\'q qoladi');
});

test('generator: brend ko\'k tugma oq pill + to\'q matn, oq karta shisha, semantik rang o\'z ma\'nosida', () => {
  assert.deepEqual(qiymat('bg', '[#2563EB]', undefined, null), { v: '#F4F1EC', qattiq: true });
  assert.deepEqual(qiymat('bg', 'white', undefined, null), { v: 'var(--s-karta)' });
  assert.deepEqual(qiymat('text', 'slate', '900', null), { v: 'var(--s-matn)' });
  assert.deepEqual(qiymat('bg', 'blue', '50', null), { v: 'rgb(255 255 255 / 0.06)' });
  assert.equal(qiymat('text', 'white', undefined, null), null, 'oq matn o\'zgarmaydi');
  assert.equal(qiymat('bg', 'slate', '100', null), null, 'slate 50–800 o\'zgaruvchi orqali');
  assert.match(qiymat('bg', 'emerald', '50', null).v, /^color-mix\(in srgb, #10B981 14%, transparent\)$/);
  const r = qoida('hover:bg-blue-600');
  // Hover: o'chiq tugmada emas va faqat (hover: hover) ichida.
  assert.ok(r.every((x) => x.shartlar.includes('@media (hover: hover)')));
  // Interaktiv element (tugma, havola, tab) — oq pill + to'q matn; statik (karta, plitka, belgi) — yorqinroq shisha, matn oq.
  assert.ok(r.some((x) => /\[class~="hover:bg-blue-600"\]:hover:not\(:disabled\):where\(button, a, /.test(x.sel) && x.tana === 'background-color: #ECE7E0;'));
  assert.ok(r.some((x) => /:hover:not\(:disabled\):where\(:not\(button, a, /.test(x.sel) && x.tana === 'background-color: rgb(99 102 241 / 0.36);'));
  assert.ok(r.some((x) => x.sel.endsWith(':not([class*="disabled:bg-"]:disabled) [class*="text-white"]') && x.tana === `color: ${QATTIQ_MATN}; text-shadow: none;`));
  assert.ok(!r.some((x) => /:where\(:not\(button/.test(x.sel) && x.tana.startsWith('color:')), 'statik urg\'u elementida matn oq qoladi');
  assert.ok(qoida('bg-blue-600').some((x) => x.sel.endsWith(':focus-visible') && x.tana.startsWith('outline:')), 'oq pill fokus konturi');
  // To'q navy hex karta (#18273F) — tutunli shaffof; text-slate-300 to'q kartada ko'rinadi.
  assert.deepEqual(qiymat('bg', '[#18273F]', undefined, null), { v: 'rgb(14 12 10 / 0.58)' });
  assert.deepEqual(qiymat('bg', '[#253A58]', undefined, null), { v: 'rgb(48 43 38 / 0.62)' }, 'hover — biroz ochroq');
  assert.deepEqual(qiymat('text', 'slate', '300', null), { v: '#DDD6CC' });
  assert.match(blok, /@media \(hover: hover\) \{/);
  assert.match(blok, /@container cart \(width >= 900px\) \{/);
  assert.deepEqual(qoida('peer-checked:bg-white'), { tashlandi: 'peer-checked:bg-white' });
  assert.equal(qoida('px-4'), null);
});

test('to\'lov tugmalari: asosiy rejimda inline rang avvalgidek, shishada tanlangan — oq pill, ikonka ochroq jufti', () => {
  assert.deepEqual(tolov.tolovIkonkaUslubi(tolov.tolovRangi('PAYME')), { color: '#0C447C', '--tolov-matn-q': '#A9CFF3' });
  const bosh = manba('src/Pages/BoshSahifa/index.tsx');
  assert.match(bosh, /data-tolov-tanlangan=\{paymentType === item\.label \? "" : undefined\}/);
  assert.match(bosh, /data-tolov-ikonka=""\s*style=\{tolovIkonkaUslubi\(tolovRangi\(item\.apiTuri\)\)\}/);
  assert.match(bosh, /data-tolov-tanlangan=\{tanlangan \? "" : undefined\}/);
  assert.match(blok, /\[data-tolov-tanlangan\] \{\s*background: var\(--s-pill\) !important;/);
  assert.match(blok, /:not\(\[data-tolov-tanlangan\]\) > \[data-tolov-ikonka\] \{ color: var\(--tolov-matn-q\) !important; \}/);
});
