// Valyuta rejimi (11.11.2026): hisobotlar, kassa hisobotlari va savdo statistikasi bir valyutali rejimda (Faqat so'm / Faqat dollar)
// faqat rejim valyutasini ko'rsatadi, valyuta tanlovi va kurs ko'rinmaydi; ikki valyuta rejimida (DUAL) avvalgidek.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as model from '../src/Pages/HisobotUchot/foydaHisobotiModeli.ts';
import * as hisobotValyutasi from '../src/Pages/HisobotUchot/hisobotValyutasi.ts';
import * as dates from '../src/lib/hujjatSanasi.ts';
import * as cash from '../src/lib/cashReports.ts';
import * as tolovRanglari from '../src/lib/tolovTuriRanglari.ts';

const require = createRequire(import.meta.url);
const hisobotlarUz = JSON.parse(readFileSync(new URL('../src/i18n/locales/uz/hisobotlar.json', import.meta.url), 'utf8'));
const tUz = (key, args = {}) => String(key.split('.').reduce((x, k) => x?.[k], hisobotlarUz) ?? key).replace(/\{\{(\w+)\}\}/g, (_, name) => args[name]);
const nodes = value => Array.isArray(value) ? value.flatMap(nodes) : !value || typeof value !== 'object' ? [] : [value, ...nodes(value.props?.children)];
const text = value => Array.isArray(value) ? value.map(text).join(' ') : value && typeof value === 'object' ? text(typeof value.type === 'function' ? value.type(value.props) : value.props?.children) : String(value ?? '');
const same = (left, right) => left && right && left.length === right.length && left.every((item, i) => Object.is(item, right[i]));

function compile(path, extra = '') {
  return ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8') + extra, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}

// Hook'lar bilan sahifani React'siz chizadi; `yagona` — useYagonaValyuta() qiymati (null = ikki valyuta rejimi).
function page(path, { yagona = null, dependencies = {}, exportName = 'default', extra = '', props = {} } = {}) {
  const compiled = compile(path, extra);
  let cursor = 0;
  const slots = [], pending = [];
  const react = {
    useId: () => 'test-id',
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(initial) { return react.useState(() => ({ current: initial }))[0]; },
    useMemo(fn, deps) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { deps, value: fn() }; return slots[i].value; },
    useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) { slots[i]?.cleanup?.(); slots[i] = { deps }; pending.push(() => { slots[i].cleanup = fn(); }); } },
  };
  const context = { exports: {}, setTimeout: () => 0, clearTimeout() {}, window: { setInterval: () => 1, clearInterval() {}, addEventListener() {}, removeEventListener() {} }, require(name) {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return require(name);
    if (name in dependencies) return dependencies[name];
    if (name === '@/lib/valyuta') return { useYagonaValyuta: () => yagona, korsatiladiganValyuta: () => yagona ?? 'USD' };
    if (name === './hisobotValyutasi') return hisobotValyutasi;
    if (name === './foydaHisobotiModeli') return model;
    if (name === '@/lib/hujjatSanasi') return { ...dates, bugungiToshkentKuni: () => '2026-11-11' };
    if (name === '@/lib/cashReports') return cash;
    if (name === '@/lib/tolovTuriRanglari') return tolovRanglari;
    if (name === '@/api/sozlamalarApi') return { getApiErrorMessage: String };
    if (name === './yordamchilar') return { son: String };
    if (name === 'react-i18next') return { useTranslation: () => ({ t: tUz }) };
    return new Proxy({ __esModule: true, default: name.split('/').at(-1) }, { get: (target, key) => target[key] ?? String(key) });
  } };
  runInNewContext(compiled, context);
  const render = () => { cursor = 0; return context.exports[exportName](props); };
  return { render, async settle() { render(); pending.splice(0).forEach(fn => fn()); await new Promise(resolve => setImmediate(resolve)); return render(); } };
}

test('korinadiganValyutalar: ikki valyutada ikkalasi, bir valyutada rejim valyutasi va faqat qiymati bor eski valyuta', () => {
  assert.deepEqual(hisobotValyutasi.korinadiganValyutalar(null), ['UZS', 'USD']);
  assert.deepEqual(hisobotValyutasi.korinadiganValyutalar('USD'), ['USD']);
  assert.deepEqual(hisobotValyutasi.korinadiganValyutalar('UZS', () => false), ['UZS']);
  assert.deepEqual(hisobotValyutasi.korinadiganValyutalar('USD', valyuta => valyuta === 'UZS'), ['UZS', 'USD'], 'rejimgacha qolgan so\'m yashirilmaydi');
  assert.equal(hisobotValyutasi.nolEmasSummaBor(0, '0', null, undefined, 'x'), false);
  assert.equal(hisobotValyutasi.nolEmasSummaBor(0, '-5'), true);
});

test('yagonaValyutaJufti: DUAL da o\'zgarmaydi, bir valyutada ≈ yo\'q va kurs yo\'q bo\'lsa server summasi', () => {
  const juft = model.valyutaJufti(120000, 10, 'USD');
  assert.equal(model.yagonaValyutaJufti(juft, null), juft);
  assert.deepEqual(model.yagonaValyutaJufti(juft, 'USD', 99), { asosiy: { summa: 10, valyuta: 'USD' }, qoshimcha: null });
  assert.deepEqual(model.yagonaValyutaJufti(model.valyutaJufti(120000, 10, 'UZS'), 'UZS'), { asosiy: { summa: 120000, valyuta: 'UZS' }, qoshimcha: null });
  // Dollar summasi kelmagan (kurs yo'q): so'mga qaytib ketmaydi, hisobot valyutasidagi summa olinadi.
  assert.deepEqual(model.yagonaValyutaJufti(model.valyutaJufti(120000, null, 'USD'), 'USD', 10), { asosiy: { summa: 10, valyuta: 'USD' }, qoshimcha: null });
  assert.deepEqual(model.yagonaValyutaJufti(model.valyutaJufti(120000, 10, 'UZS'), 'USD'), { asosiy: { summa: 10, valyuta: 'USD' }, qoshimcha: null });
});

function foydaSahifasi(yagona, usdBor = true) {
  const calls = [];
  const usd = usdBor ? { revenueUsd: 10, costUsd: 5, profitUsd: 5 } : {};
  const view = page('../src/Pages/HisobotUchot/FoydaHisoboti.tsx', { yagona, dependencies: {
    './HisobotRealData': { useHisobotRealData: () => ({ kategoriyalar: [] }) },
    '@/api/reportsApi': { productProfitReportApi: { barchasi: async params => {
      calls.push(params);
      return {
        currency: params.currency,
        summary: { revenueUzs: 120000, costUzs: 60000, profitUzs: 60000, ...usd, qtySold: 2, avgRate: 12000 },
        items: [{ productId: 'p', productName: 'Pena', qtySold: 2, revenue: 10, cost: 5, profit: 5, revenueUzs: 120000, costUzs: 60000, profitUzs: 60000, ...usd }],
      };
    }, export: async () => {} } },
  } });
  return { calls, view };
}

test('Foyda hisoboti: Faqat dollar rejimida tanlov, ≈ so\'m va o\'rtacha kurs yo\'q, so\'rov USD da', async () => {
  const { calls, view } = foydaSahifasi('USD');
  const tree = await view.settle();
  const content = text(tree);
  assert.equal(calls[0].currency, 'USD');
  assert.equal(nodes(tree).some(node => node.type === 'Dropdown' && /valyutasi/.test(node.props.label)), false, 'valyuta tanlovi yashirin');
  assert.match(content, /\$10/);
  assert.doesNotMatch(content, /≈|so'm|O‘rtacha kurs/);
});

test('Foyda hisoboti: Faqat dollar rejimida dollar summasi kelmasa ham so\'mga qaytmaydi', async () => {
  const { view } = foydaSahifasi('USD', false);
  const content = text(await view.settle());
  assert.match(content, /\$10/);
  assert.doesNotMatch(content, /so'm/);
});

test('Foyda hisoboti: ikki valyuta rejimida tanlov, ≈ va o\'rtacha kurs avvalgidek', async () => {
  const { calls, view } = foydaSahifasi(null);
  const tree = await view.settle();
  const content = text(tree);
  assert.equal(calls[0].currency, 'USD');
  assert.ok(nodes(tree).some(node => node.type === 'Dropdown' && /valyutasi/.test(node.props.label)));
  assert.match(content, /≈/);
  assert.match(content, /O‘rtacha kurs/);
});

const zero = (opening = 0) => ({ opening, income: 0, expense: 0, closing: opening, byPaymentType: { CASH: { income: 0, expense: 0 }, CARD: { income: 0, expense: 0 }, BANK: { income: 0, expense: 0 } } });

function kunlikKassa(yagona, uzsQoldiq = 0) {
  const daily = params => ({ ...params, timezone: 'Asia/Tashkent', days: [{ date: params.from, operationsCount: 0, UZS: zero(uzsQoldiq), USD: zero(100.25) }], totals: { operationsCount: 0, UZS: zero(uzsQoldiq), USD: zero(100.25) } });
  return page('../src/Pages/HisobotUchot/KunlikKassa.tsx', { yagona, dependencies: {
    '@/api/reportsApi': { cashDailyReportApi: { olish: async params => daily(params) } },
    '@/api/omborApi': { filiallarApi: { royxat: async () => [] } },
    'react-router-dom': { Link: 'Link' },
  } });
}
const ustunlar = tree => nodes(tree).filter(node => node.type === 'th' && String(node.props['data-column-id']).startsWith('h2:')).map(node => node.props['data-column-id']);

test('Kunlik kassa: Faqat dollar rejimida faqat dollar ustunlari va kartalari', async () => {
  const tree = await kunlikKassa('USD').settle();
  assert.deepEqual(ustunlar(tree), ['h2:cashUsd', 'h2:bankUsd', 'h2:totalUsd']);
  assert.match(text(tree), /\$100[.,]25/);
  assert.doesNotMatch(text(tree), /so'm/);
});

test('Kunlik kassa: rejimgacha qolgan so\'m qoldig\'i yashirilmaydi; ikki valyutada barcha ustunlar', async () => {
  let tree = await kunlikKassa('USD', 5000).settle();
  assert.equal(ustunlar(tree).length, 7);
  assert.match(text(tree), /5.*000 so'm/);
  tree = await kunlikKassa(null).settle();
  assert.equal(ustunlar(tree).length, 7);
});

function kirimChiqim(yagona, eskiSom = false) {
  const calls = [];
  const usd = { openingBalance: 100, income: 1.25, expense: 0.5, closingBalance: 100.75 };
  const nol = eskiSom ? { openingBalance: 5000, income: 0, expense: 0, closingBalance: 5000 } : { openingBalance: 0, income: 0, expense: 0, closingBalance: 0 };
  const view = page('../src/Pages/HisobotUchot/KirimChiqimHisoboti.tsx', { yagona, dependencies: {
    './HisobotRealData': { useHisobotRealData: () => ({ filiallar: [] }) },
    '@/api/reportsApi': { cashFlowReportApi: {
      olish: async params => { calls.push(params); return { items: [], byPaymentMethod: [{ paymentMethod: 'CASH', ...(params.currency === 'USD' ? usd : nol) }], summary: { ...usd, byCurrency: { UZS: { ...nol, byPaymentMethod: { CASH: nol } }, USD: { ...usd, byPaymentMethod: { CASH: usd } } } } }; },
      export: async () => {},
    } },
  } });
  return { calls, view };
}

test('Kirim-chiqim: Faqat dollar rejimida jadval valyutasi tanlovi yo\'q, so\'rov USD da, kartalar aylanmaydi', async () => {
  const { calls, view } = kirimChiqim('USD');
  const tree = await view.settle();
  assert.equal(calls[0].currency, 'USD');
  assert.equal(nodes(tree).some(node => node.type === 'select'), false);
  const naqd = nodes(tree).find(node => node.type === 'button' && node.props['aria-label']?.startsWith('Naqd:'));
  assert.equal(naqd.props.onClick, undefined);
  assert.equal(naqd.props['aria-pressed'], undefined);
  const yuz = nodes(naqd).filter(node => node.props?.id?.startsWith?.('test-id-CASH-'));
  assert.deepEqual(yuz.map(node => node.props.id), ['test-id-CASH-USD']);
  assert.equal(yuz[0].props['aria-hidden'], false);
  assert.match(text(yuz[0]), /\$100[.,]75/);
  assert.doesNotMatch(text(naqd), /o'tish/);
});

test('Kirim-chiqim: ikki valyuta rejimida tanlov va aylanadigan kartalar avvalgidek', async () => {
  const { calls, view } = kirimChiqim(null);
  const tree = await view.settle();
  assert.equal(calls[0].currency, 'UZS');
  assert.equal(nodes(tree).find(node => node.type === 'select').props.value, 'UZS');
  const naqd = nodes(tree).find(node => node.type === 'button' && node.props['aria-label']?.startsWith('Naqd:'));
  assert.equal(typeof naqd.props.onClick, 'function');
  assert.equal(naqd.props['aria-pressed'], false);
});

test('Savdo statistikasi: bir valyutali rejimda pul kartasi aylanmaydi va faqat rejim valyutasi', () => {
  const stat = (savdo, qarz) => ({ savdo, tolov: savdo, qarz, qaytim: 0, savdoSoni: 1, qarzdorSotuvlar: qarz > 0 ? 1 : 0, savdoToliq: true, tolovToliq: true, qarzToliq: true });
  const natijalar = { USD: stat(274.91, 10), UZS: stat(0, 0) };
  let opened = 0;
  const karta = yagona => page('../src/Pages/Savdo/SotuvStatistikasi.tsx', {
    exportName: 'AylanadiganValyutaKarta', extra: '\nexport { AylanadiganValyutaKarta };',
    props: { tur: 'qarz', natijalar, yuklanmoqda: false, onQarzniKorsatish: () => opened++, yagona },
    dependencies: { 'react-i18next': { useTranslation: () => ({ t: key => key }) } },
  }).render();
  let tree = karta('USD');
  const yuzlar = nodes(tree).filter(node => node.type?.name === 'ValyutaKarta');
  assert.deepEqual(yuzlar.map(node => node.props.valyuta), ['USD']);
  assert.equal(nodes(tree).some(node => node.type === 'button' && node.props['aria-describedby']), false, 'aylantirish tugmasi yo\'q');
  nodes(tree).find(node => node.type === 'button').props.onClick();
  assert.equal(opened, 1, 'qarzdorlar ro\'yxati tugmasi ishlaydi');
  tree = karta(null);
  assert.deepEqual(nodes(tree).filter(node => node.type?.name === 'ValyutaKarta').map(node => node.props.valyuta), ['USD', 'UZS']);
  assert.ok(nodes(tree).some(node => node.type === 'button' && node.props['aria-describedby']));
});

test("Kirim-chiqim: Faqat dollar rejimida eski so'm qoldig'i bilan karta aylansa ham old yuz dollarda", async () => {
  const { view } = kirimChiqim('USD', true);
  let tree = await view.settle();
  let naqd = nodes(tree).find(node => node.type === 'button' && node.props['aria-label']?.startsWith('Naqd:'));
  assert.equal(typeof naqd.props.onClick, 'function', "eski so'm qoldig'i tufayli aylanadi");
  assert.match(naqd.props['aria-label'], /^Naqd: Dollar \(\$\)/);
  assert.equal(naqd.props['aria-describedby'], 'test-id-CASH-USD');
  naqd.props.onClick();
  tree = view.render();
  naqd = nodes(tree).find(node => node.type === 'button' && node.props['aria-label']?.startsWith('Naqd:'));
  assert.equal(naqd.props['aria-describedby'], 'test-id-CASH-UZS', "aylantirilganda so'm yuzi");
});

test("Savdo statistikasi: Faqat so'm rejimida eski dollar summasi bilan aylanadigan karta so'm yuzi bilan ochiladi", () => {
  const stat = savdo => ({ savdo, tolov: savdo, qarz: 0, qaytim: 0, savdoSoni: 1, qarzdorSotuvlar: 0, savdoToliq: true, tolovToliq: true, qarzToliq: true });
  const natijalar = { USD: stat(5), UZS: stat(120000) };
  const karta = page('../src/Pages/Savdo/SotuvStatistikasi.tsx', {
    exportName: 'AylanadiganValyutaKarta', extra: '\nexport { AylanadiganValyutaKarta };',
    props: { tur: 'savdo', natijalar, yuklanmoqda: false, yagona: null, asosiy: 'UZS' },
    dependencies: { 'react-i18next': { useTranslation: () => ({ t: (key, values) => `${key}${values ? JSON.stringify(values) : ''}` }) } },
  });
  let tree = karta.render();
  const flip = value => nodes(value).find(node => node.type === 'button' && node.props['aria-describedby']);
  assert.equal(flip(tree).props['aria-describedby'], 'test-id-UZS');
  assert.match(flip(tree).props['aria-label'], /"valyuta":"USD"/, 'keyingi yuz — dollar');
  const oldi = nodes(tree).find(node => node.props?.id === 'test-id-UZS');
  assert.equal(oldi.props.style.transform, 'rotateY(0deg)');
  assert.equal(oldi.props['aria-hidden'], false);
  flip(tree).props.onClick();
  tree = karta.render();
  assert.equal(flip(tree).props['aria-describedby'], 'test-id-USD');
  assert.equal(nodes(tree).find(node => node.props?.id === 'test-id-USD').props.style.transform, 'rotateY(180deg)');
});
