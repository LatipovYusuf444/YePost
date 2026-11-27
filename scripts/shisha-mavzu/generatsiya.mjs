// "Shisha" rejimi (data-theme="shisha") — CSS bloki generatori.
// 1) Inventar: berilgan ildiz fayllardan import daraxti bo'ylab (src ichida) Tailwind rang klasslari yig'iladi.
// 2) Har bir klass uchun shisha (to'q, shaffof) jufti hisoblanadi: inline qiymatli ranglar (orange/gold/cream = loyihaning ko'ki,
//    blue/sky/indigo, hex), oq sirtlar, semantik ranglarning och fonlari. O'zgaruvchi orqali ishlaydiganlari (slate/gray 50–800,
//    --yp-*, --theme-*) shablon.css da.
// 3) shablon.css + generatsiya qilingan qoidalar index.css dagi /* SHISHA-MAVZU:BOSHI/OXIRI */ orasiga yoziladi (@media screen ichida).
//
// Ishlatish: node scripts/shisha-mavzu/generatsiya.mjs src/Pages/BoshSahifa/index.tsx src/Components/layout/AsosiyPanel.tsx
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ILDIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const S = ':where(html[data-theme="shisha"][data-shisha-sahifa])';
const BOSH = '/* SHISHA-MAVZU:BOSHI */';
const OXIR = '/* SHISHA-MAVZU:OXIRI */';
const LANGAR = '/*\n * 26.11 — planshet/iPad';

// ---------- 1. Inventar ----------
function yolniTopish(manba, spec) {
  let asos;
  if (spec.startsWith('@/')) asos = join(ILDIZ, 'src', spec.slice(2));
  else if (spec.startsWith('.')) asos = resolve(dirname(manba), spec);
  else return null;
  for (const qosh of ['', '.tsx', '.ts', '/index.tsx', '/index.ts']) {
    const y = asos + qosh;
    if (existsSync(y) && /\.(tsx?|jsx?)$/.test(y)) return y;
  }
  return null;
}

export function inventar(ildizlar) {
  const korilgan = new Set();
  const navbat = ildizlar.map((f) => resolve(ILDIZ, f));
  const tokenlar = new Set();
  while (navbat.length) {
    const f = navbat.pop();
    if (korilgan.has(f)) continue;
    korilgan.add(f);
    const matn = readFileSync(f, 'utf8');
    for (const m of matn.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)["']([^"']+)["']/g)) {
      const y = yolniTopish(f, m[1]);
      if (y && !korilgan.has(y)) navbat.push(y);
    }
    for (const parcha of matn.split(/[\s"'`{}(),;]+/)) if (TOKEN.test(parcha)) tokenlar.add(parcha);
  }
  return { fayllar: korilgan.size, tokenlar: [...tokenlar].sort() };
}

// ---------- 2. Qiymatlar ----------
const PALITRA = {
  violet: ['#C4B5FD', '#A78BFA', '#8B5CF6'], purple: ['#D8B4FE', '#C084FC', '#A855F7'], emerald: ['#6EE7B7', '#34D399', '#10B981'],
  green: ['#86EFAC', '#4ADE80', '#22C55E'], teal: ['#5EEAD4', '#2DD4BF', '#14B8A6'], cyan: ['#67E8F9', '#22D3EE', '#06B6D4'],
  amber: ['#FCD34D', '#FBBF24', '#F59E0B'], yellow: ['#FDE047', '#FACC15', '#EAB308'], red: ['#FCA5A5', '#F87171', '#EF4444'],
  rose: ['#FDA4AF', '#FB7185', '#F43F5E'], pink: ['#F9A8D4', '#F472B6', '#EC4899'], lime: ['#BEF264', '#A3E635', '#84CC16'],
  fuchsia: ['#F0ABFC', '#E879F9', '#D946EF'],
};
// Loyihaning brend oilasi (orange/gold nomlari aslida ko'k — inline qiymat) + blue/sky/indigo: shishada urg'u — oq "pill".
const URGU_OILA = new Set(['orange', 'gold', 'blue', 'sky', 'indigo']);
const URGU_QATTIQ = { 300: '#FFFFFF', 400: '#FFFFFF', 500: '#F4F1EC', 600: '#ECE7E0', 700: '#E2DCD3', 800: '#D6CFC5', 900: '#2A2521', 950: '#1C1916' };
const URGU_TUS = { 50: 6, 100: 10, 150: 9, 200: 14, 300: 22 };
const URGU_MATN = { 100: '#FFFFFF', 200: '#FFFFFF', 300: '#F7EEDF', 400: '#F7EEDF', 500: '#F2E3CC', 600: '#F2E3CC', 700: '#F7EEDF', 800: '#FFF6EA', 900: '#FFF6EA', 950: '#FFF6EA' };
// Neytral to'q sirtlar (slate/gray 600–950 fon/gradientda — sarlavha gradienti, qoplama): iliq to'q.
// 800–950 — tutunli shaffof (shisha ustida to'q karta/qoplama), 600–700 — qattiqroq.
const TOQ = { 600: '#4A443E', 700: '#38332E', 800: 'rgb(30 27 24 / 0.62)', 900: 'rgb(14 12 10 / 0.58)', 950: 'rgb(8 7 6 / 0.66)' };
// Oq pill bo'ladigan interaktiv elementlar.
const INTERAKTIV = 'button, a, summary, label, [role="button"], [role="tab"], [role="radio"], [role="option"], [role="menuitem"], [role="switch"], [role="checkbox"]';
export const QATTIQ_MATN = '#1A1714';

const oq = (x) => `rgb(255 255 255 / ${x})`;
const alfa = (v, a) => (a == null || a >= 100 ? v : `color-mix(in srgb, ${v} ${a}%, transparent)`);
const mix = (rang, foiz) => `color-mix(in srgb, ${rang} ${foiz}%, transparent)`;
const hexRgb = (h) => {
  let x = h.replace('#', '');
  if (x.length === 3) x = [...x].map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16));
};
const yorqinlik = (h) => {
  const k = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const [r, g, b] = hexRgb(h);
  return 0.2126 * k(r) + 0.7152 * k(g) + 0.0722 * k(b);
};
const toyinganlik = (h) => { const v = hexRgb(h); return (Math.max(...v) - Math.min(...v)) / 255; };
const kokmi = (h) => { const [r, g, b] = hexRgb(h); return b > r + 60 && b > g + 25; };
const urguPogona = (h) => { const L = yorqinlik(h); return L >= 0.2 ? 400 : L >= 0.13 ? 500 : L >= 0.08 ? 600 : 700; };

/** @returns {{ v: string, qattiq?: boolean } | null} qattiq — och "pill" fon (ustidagi matn to'q bo'lishi kerak). */
export function qiymat(xus, rang, pogona, a) {
  const p = pogona ? Number(pogona) : null;
  const sirt = ['bg', 'from', 'via', 'to'].includes(xus);
  const chiziq = ['border', 'ring', 'divide', 'outline'].includes(xus);
  if (rang === 'white') return sirt && (a == null || a >= 45) ? { v: alfa('var(--s-karta)', a) } : null;
  if (rang === 'black') return null;
  if (rang === 'slate' || rang === 'gray') {
    if (xus === 'text' && (p === 900 || p === 950)) return { v: 'var(--s-matn)' };
    if (xus === 'text' && p === 100) return { v: '#F5F3F0' };
    if (xus === 'text' && p === 200) return { v: '#E9E4DE' };
    // text-slate-300 asosiy mavzuda to'q kartadagi och kulrang matn; teskari shkalada (chegara) u ko'rinmay qolardi.
    if (xus === 'text' && p === 300) return { v: '#DDD6CC' };
    if (sirt && TOQ[p]) return { v: alfa(TOQ[p], a) };
    return null; // 50–800 o'zgaruvchi orqali (shablon)
  }
  if (rang === 'cream') return sirt ? { v: alfa('var(--s-ichki)', a) } : null;
  if (URGU_OILA.has(rang)) {
    if (p == null) return null;
    if (xus === 'shadow') return { v: alfa('rgb(0 0 0 / 0.28)', a) };
    if (sirt) {
      const gradient = xus !== 'bg';
      if ((p >= 400 || (gradient && p >= 300)) && URGU_QATTIQ[p]) return { v: alfa(URGU_QATTIQ[p], a), qattiq: p < 900 && (a == null || a >= 60) };
      return URGU_TUS[p] ? { v: alfa(oq(URGU_TUS[p] / 100), a) } : null;
    }
    if (xus === 'text') return URGU_MATN[p] ? { v: alfa(URGU_MATN[p], a) } : null;
    if (chiziq) return { v: alfa(p <= 200 ? oq(0.14) : p <= 400 ? oq(0.26) : oq(0.55), a) };
    return null;
  }
  if (PALITRA[rang]) {
    const [p300, p400, p500] = PALITRA[rang];
    if (sirt) { const f = { 50: 14, 100: 20, 200: 28 }[p]; return f ? { v: alfa(mix(p500, f), a) } : null; }
    // To'q shishada 500–600 matn xira — 400 ga, 700+ — 300 ga.
    if (xus === 'text') return p === 500 || p === 600 ? { v: p400 } : [700, 800, 900, 950].includes(p) ? { v: p300 } : null;
    if (chiziq) { const f = { 50: 28, 100: 32, 200: 40 }[p]; return f ? { v: alfa(mix(p500, f), a) } : null; }
    return null;
  }
  if (rang.startsWith('[#')) {
    const h = rang.slice(1, -1);
    const L = yorqinlik(h);
    if (L <= 0.6 && kokmi(h) && toyinganlik(h) > 0.35) {
      const pg = urguPogona(h);
      if (sirt) return { v: alfa(URGU_QATTIQ[pg], a), qattiq: a == null || a >= 60 };
      if (chiziq) return { v: alfa(oq(0.55), a) };
      if (xus === 'text') return { v: alfa('#F2E3CC', a) };
      return null;
    }
    if (sirt) {
      // To'q navy/ko'kish hex sirt (masalan, #18273F karta va tugma) — tutunli shaffof shisha.
      if (L < 0.12 && hexRgb(h)[2] > hexRgb(h)[0] + 18) return { v: alfa(L < 0.03 ? 'rgb(14 12 10 / 0.58)' : 'rgb(48 43 38 / 0.62)', a) };
      if (L <= 0.75) return null;
      const [r, , b] = hexRgb(h);
      if (toyinganlik(h) < 0.03) return { v: alfa('var(--s-karta)', a) };
      if (b > r + 12) return { v: alfa(oq(0.08), a) };
      return { v: alfa('var(--s-ichki)', a) };
    }
    if (xus === 'text') {
      if (toyinganlik(h) > 0.35 && L < 0.3) return { v: `color-mix(in srgb, ${h} 45%, #ffffff)` };
      if (L < 0.05) return { v: 'var(--s-matn)' };
      if (L < 0.12) return { v: 'var(--s-matn-2)' };
      if (L < 0.3) return { v: 'var(--s-xira)' };
      if (L < 0.6 && toyinganlik(h) < 0.25) return { v: 'var(--s-xira)' }; // ko'kish kulrang (#94A3B8) — iliq xira
      return null;
    }
    if (chiziq) {
      if (L > 0.6) return { v: alfa('var(--s-chegara)', a) };
      if (L < 0.12 && hexRgb(h)[2] > hexRgb(h)[0] + 18) return { v: alfa('rgb(255 255 255 / 0.16)', a) }; // to'q navy chegara
      return null;
    }
  }
  return null;
}

// ---------- 3. Qoidalar ----------
// Token: [variantlar:]xususiyat-rang[-pog'ona][/alfa], `!` (Tailwind important) boshida yoki oxirida.
// Variantlar ichida qavs ([...]) bo'lishi mumkin: data-[state=active]:, @min-[900px]/cart:, group-data-[x]/nom: ...
const TOKEN = /^!?((?:(?:[a-z@-]+(?:-\[[^\]\s]+\])?(?:\/[a-z-]+)?|@min-\[[^\]\s]+\](?:\/[a-z-]+)?|@max-\[[^\]\s]+\](?:\/[a-z-]+)?|\[&[^\]\s[]*\]):)*)!?(bg|text|border|ring|from|via|to|divide|outline|shadow)-(white|black|[a-z]+|\[#[0-9A-Fa-f]{3,8}\])(?:-([0-9]{2,3}))?(?:\/([0-9]{1,3}))?!?$/;
const PSEUDO = {
  hover: ':hover', focus: ':focus', 'focus-visible': ':focus-visible', 'focus-within': ':focus-within', active: ':active',
  disabled: ':disabled', enabled: ':enabled', first: ':first-child', last: ':last-child', odd: ':nth-child(odd)', even: ':nth-child(even)',
  checked: ':checked', open: '[open]', visited: ':visited', 'read-only': ':read-only', required: ':required', invalid: ':invalid',
};
const PSEUDO_ELEMENT = { before: '::before', after: '::after', placeholder: '::placeholder', file: '::file-selector-button', marker: '::marker' };
// Tailwind v4 standart breakpoint va container o'lchamlari.
const EKRAN = { sm: '40rem', md: '48rem', lg: '64rem', xl: '80rem', '2xl': '96rem' };
const KONT = { '3xs': '16rem', '2xs': '18rem', xs: '20rem', sm: '24rem', md: '28rem', lg: '32rem', xl: '36rem', '2xl': '42rem', '3xl': '48rem', '4xl': '56rem', '5xl': '64rem', '6xl': '72rem', '7xl': '80rem' };
// Rangni o'zgartirmaydigan qiymatlar: o'ralgan (media/container/holat) variantda Tailwind'ning asl qiymati qayta yoziladi —
// aks holda bazaviy shisha qoidasi (masalan, bg-emerald-50) `@min-[900px]/cart:bg-transparent` ni bosib ketardi.
const ASL = { transparent: 'transparent', current: 'currentColor', inherit: 'inherit' };
const XUSUSIYAT = {
  bg: (v) => `background-color: ${v}`, text: (v) => `color: ${v}`, border: (v) => `border-color: ${v}`,
  outline: (v) => `outline-color: ${v}`, ring: (v) => `--tw-ring-color: ${v}`, divide: (v) => `border-color: ${v}`,
  from: (v) => `--tw-gradient-from: ${v}`, via: (v) => `--tw-gradient-via: ${v}`, to: (v) => `--tw-gradient-to: ${v}`,
  shadow: (v) => `--tw-shadow-color: ${v}`,
};
const attr = (ichki) => {
  // data-[state=active] → [data-state="active"], data-[open] → [data-open]
  const m = /^([^=]+)(?:=(.+))?$/.exec(ichki);
  return m[2] === undefined ? `[${m[1]}]` : `[${m[1]}="${m[2].replace(/^["']|["']$/g, '')}"]`;
};

/** Variantlar zanjiri → { oldin (ajdod selektori), keyin (element holati), pseudoEl, shartlar (@media/@container), hover } yoki null. */
function variantlarniOqish(zanjir) {
  const natija = { oldin: '', keyin: '', avlod: '', pseudoEl: '', shartlar: [], hover: false };
  for (const v of zanjir) {
    let m;
    // Ixtiyoriy avlod varianti: [&_thead]: → " thead", [&>div:last-child]: → ">div:last-child" (`_` — bo'shliq).
    if ((m = /^\[&([^\]]*)\]$/.exec(v))) { natija.avlod += m[1].replace(/_/g, ' '); continue; }
    if (PSEUDO[v]) {
      natija.keyin += PSEUDO[v];
      if (v === 'hover') natija.hover = true;
    } else if (PSEUDO_ELEMENT[v]) natija.pseudoEl = PSEUDO_ELEMENT[v];
    else if (EKRAN[v]) natija.shartlar.push(`@media (width >= ${EKRAN[v]})`);
    else if ((m = /^max-(sm|md|lg|xl|2xl)$/.exec(v))) natija.shartlar.push(`@media (width < ${EKRAN[m[1]]})`);
    else if ((m = /^@(3xs|2xs|xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl)(?:\/([a-z-]+))?$/.exec(v))) natija.shartlar.push(`@container ${m[2] ? `${m[2]} ` : ''}(width >= ${KONT[m[1]]})`);
    else if ((m = /^@(min|max)-\[([^\]]+)\](?:\/([a-z-]+))?$/.exec(v))) natija.shartlar.push(`@container ${m[3] ? `${m[3]} ` : ''}(width ${m[1] === 'min' ? '>=' : '<'} ${m[2]})`);
    else if ((m = /^data-\[([^\]]+)\]$/.exec(v))) natija.keyin += attr(`data-${m[1]}`);
    else if ((m = /^data-([a-z-]+)$/.exec(v))) natija.keyin += `[data-${m[1]}]`;
    else if ((m = /^aria-(expanded|selected|checked|pressed|current|disabled|invalid)$/.exec(v))) natija.keyin += `[aria-${m[1]}="true"]`;
    else if ((m = /^aria-\[([^\]]+)\]$/.exec(v))) natija.keyin += attr(`aria-${m[1]}`);
    else if (v === 'group-hover') { natija.oldin += '.group:hover '; natija.hover = true; }
    else if ((m = /^group-hover\/([a-z-]+)$/.exec(v))) { natija.oldin += `[class~="group/${m[1]}"]:hover `; natija.hover = true; }
    else if ((m = /^group-data-\[([^\]]+)\](?:\/([a-z-]+))?$/.exec(v))) natija.oldin += `[class~="group${m[2] ? `/${m[2]}` : ''}"]${attr(`data-${m[1]}`)} `;
    else if ((m = /^group-(focus|focus-within|focus-visible|active|open)(?:\/([a-z-]+))?$/.exec(v))) natija.oldin += `[class~="group${m[2] ? `/${m[2]}` : ''}"]${PSEUDO[m[1]]} `;
    else if ((m = /^in-data-\[([^\]]+)\]$/.exec(v))) natija.oldin += `${attr(`data-${m[1]}`)} `;
    else return null; // dark:, peer-*, has-*, [&...]: va boshqalar — qo'llab-quvvatlanmaydi
  }
  return natija;
}

export function qoida(token) {
  const m = TOKEN.exec(token);
  if (!m) return null;
  const [, variantStr, xus, rang, pogona, aStr] = m;
  const muhim = /(^|:)!/.test(token) || token.endsWith('!');
  const zanjir = variantStr ? variantStr.slice(0, -1).split(/:(?![^[]*\])/) : [];
  const v = variantlarniOqish(zanjir);
  if (!v) return { tashlandi: token };
  let q = qiymat(xus, rang, pogona, aStr ? Number(aStr) : null);
  // O'ralgan variantda rangsiz qiymat (transparent...) asl holicha qayta yoziladi.
  if (!q && zanjir.length && ASL[rang] && !pogona) q = { v: ASL[rang] };
  if (!q) return null;
  if (v.pseudoEl === '::placeholder' && xus !== 'text') return null;
  // Hover: faqat sichqonchali qurilmada (@media (hover: hover) — Tailwind kabi) va o'chiq tugmada emas.
  const keyin = v.keyin + (v.hover && !v.avlod ? ':not(:disabled)' : '') + v.avlod;
  const asos = `${S} ${v.oldin}[class~="${token}"]${keyin}`;
  const sel = xus === 'divide' ? `${asos} > :not(:last-child)` : `${asos}${v.pseudoEl}`;
  const imp = muhim ? ' !important' : '';
  const shartlar = v.hover ? [...v.shartlar, '@media (hover: hover)'] : v.shartlar;
  // Brend urg'usi (qattiq): interaktiv element (tugma, havola, tab) — oq "pill" + to'q matn; statik element (karta, ikonka plitkasi,
  // belgi) — yorqinroq shisha, matn oq qoladi. :where() — aniqlik o'zgarmaydi (hover ustun qoladi).
  if (q.qattiq && !v.pseudoEl && xus !== 'divide') {
    const gradient = xus !== 'bg';
    // Statik urg'u — rangli (ko'k-indigo-binafsha) shisha: namunadagi rangli kartalar kabi; ustidagi oq matn/ustunlar ko'rinadi.
    const shisha = gradient ? { from: 'rgb(79 110 247 / 0.5)', via: 'rgb(99 102 241 / 0.44)', to: 'rgb(139 92 246 / 0.4)' }[xus] : 'rgb(99 102 241 / 0.36)';
    const natija = [
      { sel: `${asos}:where(${INTERAKTIV})`, tana: `${XUSUSIYAT[xus](q.v)}${imp};`, shartlar },
      { sel: `${asos}:where(:not(${INTERAKTIV}))`, tana: `${XUSUSIYAT[xus](shisha)}${imp};`, shartlar },
    ];
    // Och pill ustidagi matn (o'zi va ichidagi text-white) to'q — o'chiq holatda o'z disabled:bg-* foni bo'lsa, emas.
    const faol = `${asos}:where(${INTERAKTIV}):not([class*="disabled:bg-"]:disabled)`;
    natija.push({ sel: faol, tana: `color: ${QATTIQ_MATN}${imp}; text-shadow: none;`, shartlar });
    natija.push({ sel: `${faol} [class*="text-white"]`, tana: `color: ${QATTIQ_MATN}${imp}; text-shadow: none;`, shartlar });
    // Oq pill ustida oq fokus halqasi ko'rinmaydi — tashqi kontur.
    if (!zanjir.length) natija.push({ sel: `${asos}:where(${INTERAKTIV}):focus-visible`, tana: 'outline: 2px solid rgb(255 255 255 / 0.9); outline-offset: 2px;', shartlar: [] });
    return natija;
  }
  return [{ sel, tana: `${XUSUSIYAT[xus](q.v)}${imp};`, shartlar }];
}

export function blokYasash(tokenlar, shablon) {
  // shartlar (o'ram) → tana → selektorlar
  const guruh = new Map();
  const tashlangan = [];
  for (const t of tokenlar) {
    const r = qoida(t);
    if (!r) continue;
    if (r.tashlandi) { tashlangan.push(r.tashlandi); continue; }
    for (const q of r) {
      const kalit = q.shartlar.join(' && ');
      if (!guruh.has(kalit)) guruh.set(kalit, new Map());
      const ichki = guruh.get(kalit);
      if (!ichki.has(q.tana)) ichki.set(q.tana, new Set());
      ichki.get(q.tana).add(q.sel);
    }
  }
  // Tartib: o'ramsiz qoidalar birinchi; ichida avval fon/chegara, keyin matn rangi va kontur (pill ustidagi to'q matn keyin keladi).
  const tartib = (tana) => (tana.startsWith('color:') || tana.startsWith('outline:') ? 1 : 0);
  const bolaklar = [];
  let jami = 0;
  let bloklar = 0;
  const kalitlar = [...guruh.keys()].sort((a, b) => (a === '' ? -1 : b === '' ? 1 : a.split(' && ').length - b.split(' && ').length || a.localeCompare(b)));
  for (const kalit of kalitlar) {
    const shartlar = kalit ? kalit.split(' && ') : [];
    const chek = '  '.repeat(shartlar.length + 1);
    shartlar.forEach((sh, i) => bolaklar.push(`${'  '.repeat(i + 1)}${sh} {`));
    for (const [tana, sel] of [...guruh.get(kalit).entries()].sort((a, b) => tartib(a[0]) - tartib(b[0]) || a[0].localeCompare(b[0]))) {
      bolaklar.push(`${chek}${[...sel].sort().join(`,\n${chek}`)} { ${tana} }`);
      jami += sel.size;
      bloklar += 1;
    }
    for (let i = shartlar.length; i > 0; i -= 1) bolaklar.push(`${'  '.repeat(i)}}`);
  }
  const ichki = shablon.replace('/*GENERATSIYA*/', bolaklar.join('\n'));
  return { blok: `@media screen {\n${ichki.trim()}\n}`, selektorlar: jami, bloklar, tashlangan };
}

function indexgaYozish(blok) {
  const yol = join(ILDIZ, 'src/index.css');
  const raw = readFileSync(yol, 'utf8');
  const crlf = raw.includes('\r\n');
  let s = raw.replace(/\r\n/g, '\n');
  if (s.includes(BOSH)) s = s.slice(0, s.indexOf(BOSH)) + s.slice(s.indexOf(OXIR) + OXIR.length).replace(/^\n+/, '');
  if (s.split(LANGAR).length !== 2) throw new Error('langar topilmadi: ' + LANGAR);
  s = s.replace(LANGAR, `${BOSH}\n${blok}\n${OXIR}\n\n${LANGAR}`);
  writeFileSync(yol, crlf ? s.replace(/\n/g, '\r\n') : s);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const ildizlar = process.argv.slice(2);
  if (!ildizlar.length) throw new Error('ildiz fayllar kerak (masalan, src/Pages/BoshSahifa/index.tsx)');
  const { fayllar, tokenlar } = inventar(ildizlar);
  const shablon = readFileSync(join(ILDIZ, 'scripts/shisha-mavzu/shablon.css'), 'utf8').replace(/\r\n/g, '\n');
  const { blok, selektorlar, bloklar, tashlangan } = blokYasash(tokenlar, shablon);
  indexgaYozish(blok);
  console.log(`fayllar: ${fayllar}, rang klasslari: ${tokenlar.length}, qoidalar: ${selektorlar} selektor / ${bloklar} blok`);
  if (tashlangan.length) console.log('variant tufayli tashlangan:', tashlangan.join(' '));
}
