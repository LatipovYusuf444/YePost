// Valyuta rejimi (backend 11.11.2026): to'lov qabul qilish, to'lovni tahrirlash va savdo jami summalari bir valyutali rejimda.
// DUAL — avvalgidek; UZS_ONLY / USD_ONLY — valyuta tanlovi yashirin, to'lov rejim valyutasida, kurs faqat eski boshqa valyutadagi sotuvga kerak.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as editLib from '../src/lib/tolovTahriri.ts';
import * as excessLib from '../src/lib/tolovOrtiqchasi.ts';
import * as dateLib from '../src/lib/hujjatSanasi.ts';
import { tolovTahririCheklovi } from '../src/lib/tolovTahririRuxsati.ts';

const require = createRequire(import.meta.url);
const elements = node => Array.isArray(node) ? node.flatMap(elements) : !node || typeof node !== 'object' ? [] : [node, ...elements(node.props?.children)];
const text = value => Array.isArray(value) ? value.map(text).join('') : value?.props ? text(value.props.children) : String(value ?? '');
const noop = () => {};

// ---------- To'lov qabul qilish oynasi (SotuvTafsilotlariModal → TolovQabulQilishModal) ----------
const modalSource = readFileSync(new URL('../src/Pages/Savdo/SotuvTafsilotlariModal.tsx', import.meta.url), 'utf8');
const modalFile = ts.createSourceFile('modal.tsx', modalSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const modalNames = ['TolovQabulQilishModal', 'farqliValyuta', 'tolovValyutaMaydoni', 'valyutaYaxlitlash', 'mijozIdOlish'];
const modalCompiled = ts.transpileModule(
  modalFile.statements.filter(node => ts.isFunctionDeclaration(node) && modalNames.includes(node.name?.text)).map(node => node.getText(modalFile)).join('\n') +
    '\nexports.Modal = TolovQabulQilishModal;',
  { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } },
).outputText;
const kursChegarasi = require('../src/lib/kursChegarasi.ts');

function tolovOynasi(store, overrides = {}) {
  const states = [];
  let cursor = 0;
  const changes = [], payments = [];
  const context = {
    exports: {}, require,
    useState(initial) { const i = cursor++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useRef(value) { return context.useState(() => ({ current: value }))[0]; }, useEffect: noop,
    useTranslation: () => ({ t: key => key }), useOzgarishBormi: () => false,
    useValyutaStore: selector => selector(store),
    useDavrStore: selector => selector({ holat: null }), mijozHisobi: () => ({ miqdor: 0, valyuta: 'UZS' }),
    useSavdoStore: { getState: () => ({ xatolik: null }) },
    sotuvValyutasi: sale => sale.currency || 'UZS', tolovValyutasi: (payment, sale) => payment.currency || sale.currency || 'UZS',
    tolovSotuvValyutasida: payment => Number(payment.settledAmount ?? payment.amount),
    sotuvQarzdorlikSummasi: () => 0, pulniFormatlash: (amount, currency) => `${amount} ${currency}`,
    tolovTuriMatni: {}, ...excessLib, ...dateLib, ...kursChegarasi,
    useMaydonXatolari: () => ({ xato: () => undefined, bor: false, tepadagi: '', ornat() {}, tozala() {}, tekshiruv() {}, serverdan: () => false, kuzat: f => f() }), xatoRamkasi: '',
    xatoBelgisi: () => 0, belgidanKeyingiXato: () => undefined, formaTolovigaTegishli: () => undefined,
  };
  for (const name of ['AppModal', 'CreditCard', 'SavdoSelect', 'SummaMaydoni', 'HujjatSanasiMaydoni', 'Plus', 'X', 'TriangleAlert', 'Banknote', 'OrtiqchaTanlovi', 'TolovNatijasiKarta', 'XatoliMaydon', 'LoaderCircle', 'TolovTuriBelgisi']) context[name] = name;
  runInNewContext(modalCompiled, context);
  const props = {
    sotuv: { id: 's', status: 'CONFIRMED', currency: 'USD', payments: [], date: dateLib.bugungiToshkentKuni() }, jami: 100, draft: false,
    onYangilash: async (id, payload) => { changes.push({ id, payload }); return true; },
    onTolovQoshish: async (id, payload) => { payments.push({ id, payload }); return { qaytim: 0, hisobga: 0 }; },
    onYopish: noop, ...overrides,
  };
  return { changes, payments, render() { cursor = 0; return context.exports.Modal(props); } };
}
const topish = (oyna, type, predicate = () => true) => elements(oyna.render()).find(item => item.type === type && predicate(item.props));
const summaMaydoni = oyna => topish(oyna, 'SummaMaydoni', props => props['aria-label']?.startsWith('tolovModal.tolovSummasi'));
const kassirKursi = oyna => topish(oyna, 'SummaMaydoni', props => props['aria-label'] === 'tolovModal.kassirKursi');
const valyutaTugmasi = oyna => topish(oyna, 'button', props => props.children === 'tolovModal.valyutaDollar' || props.children === 'tolovModal.valyutaSom');
async function saqlash(oyna) {
  elements(oyna.render()).filter(item => item.type === 'button').at(-1).props.onClick();
  await new Promise(resolve => setImmediate(resolve));
}

const DUAL = { rejim: 'DUAL', rejimYoniq: true, kursBor: true, kurs: 12000 };
const USD_ONLY = { rejim: 'USD_ONLY', rejimYoniq: false, kursBor: true, kurs: 12000 };
const USD_ONLY_KURSSIZ = { rejim: 'USD_ONLY', rejimYoniq: false, kursBor: false, kurs: 0 };
const UZS_ONLY = { rejim: 'UZS_ONLY', rejimYoniq: false, kursBor: true, kurs: 12000 };

test('DUAL: to\'lov valyutasi tanlovi avvalgidek ko\'rinadi', () => {
  assert.ok(valyutaTugmasi(tolovOynasi(DUAL)), 'ikki valyuta rejimida so\'m/$ tanlovi bor');
});

test('USD_ONLY: dollar sotuvga to\'lov — tanlov va kurs yashirin, currency USD, rate yuborilmaydi', async () => {
  const oyna = tolovOynasi(USD_ONLY);
  assert.equal(valyutaTugmasi(oyna), undefined, 'valyuta tanlovi yashirin');
  assert.equal(kassirKursi(oyna), undefined, 'kurs so\'ralmaydi');
  summaMaydoni(oyna).props.onChange('100');
  assert.equal(summaMaydoni(oyna).props['aria-label'], 'tolovModal.tolovSummasi ($)');
  await saqlash(oyna);
  assert.equal(oyna.payments.length, 1);
  assert.equal(oyna.payments[0].payload.currency, 'USD');
  assert.equal(oyna.payments[0].payload.rate, undefined);
});

test('USD_ONLY: kurs bo\'lmasa ham dollar sotuvga to\'lov kursni so\'ramaydi', async () => {
  const oyna = tolovOynasi(USD_ONLY_KURSSIZ);
  assert.equal(kassirKursi(oyna), undefined);
  summaMaydoni(oyna).props.onChange('40');
  await saqlash(oyna);
  assert.equal(oyna.payments[0].payload.currency, 'USD');
});

test('UZS_ONLY: so\'m sotuvga to\'lov — tanlov yashirin, currency UZS', async () => {
  const oyna = tolovOynasi(UZS_ONLY, { sotuv: { id: 's', status: 'CONFIRMED', currency: 'UZS', payments: [], date: dateLib.bugungiToshkentKuni() }, jami: 500000 });
  assert.equal(valyutaTugmasi(oyna), undefined);
  assert.equal(kassirKursi(oyna), undefined);
  summaMaydoni(oyna).props.onChange('500000');
  await saqlash(oyna);
  assert.equal(oyna.payments[0].payload.currency, 'UZS');
  assert.equal(oyna.payments[0].payload.rate, undefined);
});

test('USD_ONLY: eski so\'mdagi sotuvga to\'lov dollarda, kunlik kurs yo\'q bo\'lsa kassir kursi talab qilinadi', async () => {
  const oyna = tolovOynasi(USD_ONLY_KURSSIZ, { sotuv: { id: 's', status: 'CONFIRMED', currency: 'UZS', payments: [], date: dateLib.bugungiToshkentKuni() }, jami: 1200000 });
  assert.equal(valyutaTugmasi(oyna), undefined);
  assert.ok(kassirKursi(oyna), 'eski boshqa valyutadagi sotuvda kurs maydoni ko\'rinadi');
  assert.ok(elements(oyna.render()).some(item => item.props?.['data-testid'] === 'yagona-rejim-izoh'));
  summaMaydoni(oyna).props.onChange('100');
  await saqlash(oyna);
  assert.equal(oyna.payments.length, 0, 'kurssiz yuborilmaydi');
  assert.ok(elements(oyna.render()).some(item => item.props?.children === 'tolovModal.errors.kursKiriting'));
  kassirKursi(oyna).props.onChange('12000');
  await saqlash(oyna);
  assert.equal(oyna.payments.length, 1);
  assert.deepEqual({ currency: oyna.payments[0].payload.currency, amount: oyna.payments[0].payload.amount, rate: oyna.payments[0].payload.rate }, { currency: 'USD', amount: 100, rate: 12000 });
});

test('USD_ONLY: eski so\'mdagi sotuv, kunlik kurs bor — to\'lov dollarda, kurs maydoni ixtiyoriy', async () => {
  const oyna = tolovOynasi(USD_ONLY, { sotuv: { id: 's', status: 'CONFIRMED', currency: 'UZS', payments: [], date: dateLib.bugungiToshkentKuni() }, jami: 1200000 });
  assert.ok(kassirKursi(oyna));
  assert.ok(text(elements(oyna.render())).includes('tolovModal.tolashToliq'), 'kurs bor: to\'liq to\'lash summasi hisoblanadi');
  summaMaydoni(oyna).props.onChange('100');
  await saqlash(oyna);
  assert.equal(oyna.payments[0].payload.currency, 'USD');
  assert.equal(oyna.payments[0].payload.rate, undefined, 'kassir kursi yozilmagan — backend kunlik kursni oladi');
});

test('UZS_ONLY: qoralamada eski dollar to\'lov bo\'lsa yangi to\'lov qo\'shish oldindan to\'xtatiladi (USD yuborilmaydi)', async () => {
  const eski = { id: 'p0', paymentType: 'CASH', amount: '50', currency: 'USD', rate: '12000' };
  const sotuv = { id: 's', status: 'DRAFT', currency: 'UZS', payments: [eski], date: dateLib.bugungiToshkentKuni() };
  const oyna = tolovOynasi(UZS_ONLY, { sotuv, jami: 1200000, draft: true });
  summaMaydoni(oyna).props.onChange('100000');
  await saqlash(oyna);
  assert.equal(oyna.changes.length, 0, 'PATCH yuborilmaydi');
  assert.ok(elements(oyna.render()).some(item => item.props?.children === 'tolovModal.errors.yagonaBoshqaTolovlar'));
});

test('UZS_ONLY: qoralamadagi barcha to\'lovlar so\'mda — to\'lov qo\'shiladi', async () => {
  const eski = { id: 'p0', paymentType: 'CASH', amount: '200000', currency: 'UZS' };
  const sotuv = { id: 's', status: 'DRAFT', currency: 'UZS', payments: [eski], date: dateLib.bugungiToshkentKuni() };
  const oyna = tolovOynasi(UZS_ONLY, { sotuv, jami: 1200000, draft: true });
  summaMaydoni(oyna).props.onChange('100000');
  await saqlash(oyna);
  assert.equal(oyna.changes.length, 1);
  assert.equal(oyna.changes[0].payload.payments.map(p => p.currency).join(','), 'UZS,UZS');
});

// ---------- To'lovni tahrirlash (TolovTahriri) ----------
const tolov = { id: 'p1', paymentType: 'CASH', amount: '60', currency: 'USD', rate: '11980', settledAmount: '0', date: '2026-11-05' };
const sotuv = { id: 's1', status: 'DRAFT', currency: 'UZS', date: '2026-11-05', totalAmount: 720000, payments: [tolov] };
const yordamchilar = {
  sotuvRaqami: () => '1', sotuvSummasi: s => Number(s.totalAmount), sotuvValyutasi: s => s.currency,
  tolovValyutasi: p => p.currency, qatorValyutasi: p => p.currency,
  tolovSotuvValyutasida: (p, s) => (p.currency === s.currency ? Number(p.amount) : Number(p.amount) * Number(p.rate)),
  sotuvQarzdorlikSummasi: () => 0, pulniFormatlash: String,
};

function tahrir(store, document = sotuv, payment = tolov) {
  const slots = [], effects = [], requests = [];
  let cursor = 0;
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(initial) { return react.useState(() => ({ current: initial }))[0]; },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((d, n) => !Object.is(d, slots[i].deps[n]))) { slots[i]?.cleanup?.(); slots[i] = { deps }; effects.push(() => { slots[i].cleanup = fn(); }); } },
  };
  const modullar = {
    './savdoYordamchilari': yordamchilar,
    '@/lib/hujjatSanasi': dateLib,
    '@/lib/tolovTahriri': editLib,
    '@/lib/tolovOrtiqchasi': excessLib,
    '@/hooks/useTolovTahririRuxsati': { useTolovTahririRuxsati: () => (s, p) => tolovTahririCheklovi({ role: 'DIRECTOR' }, s, p, null) },
    '@/lib/valyuta': { useValyutaStore: select => select({ ...store, yuklandi: true }), useKursniTayyorlash() {} },
    '@/store/davrStore': { useDavrStore: select => select({ holat: { closedUntil: null } }) },
    '@/lib/kursChegarasi': { ENG_KAM_KURS: 1000, kursJudaKichik: value => value > 0 && value < 1000 },
    '@/api/xatoKodlari': { asosiyXatoKodi: value => value },
    '@/api/valyutaApi': { kursniSongaAylantirish: Number, valyutaApi: { async amaldagiKurs(date) { return { rate: '11980', rateDate: date }; } } },
    '@/store/savdoStore': { useSavdoStore: { getState: () => ({ async tolovniTahrirlash(request) { requests.push(request); return { ok: true, sotuv: { ...document, payments: [{ ...payment, ...request.yangi }] }, nakladnoy: null }; } }) } },
  };
  const context = { exports: {}, require(name) {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'react-i18next') return { useTranslation: () => ({ t: key => key }) };
    if (name in modullar) return modullar[name];
    return new Proxy({ __esModule: true, default: name.split('/').at(-1) }, { get: (target, key) => target[key] ?? String(key) });
  } };
  const compiled = ts.transpileModule(readFileSync(new URL('../src/Pages/Savdo/TolovTahriri.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(compiled, context);
  const props = { sotuv: document, tolov: payment, raqam: '1/1', onBand() {}, onOrqaga() {}, onYopish() {} };
  const render = () => { cursor = 0; return context.exports.default(props); };
  return { render, requests, async settle() { render(); effects.splice(0).forEach(fn => fn()); await new Promise(resolve => setImmediate(resolve)); return render(); } };
}
const tanlovGuruhi = tree => elements(tree).find(n => n.props?.role === 'group' && n.props['aria-label'] === 'tolovModal.tolovValyutasi');
const saqlashTugmasi = tree => elements(tree).find(n => n.type === 'button' && text(n) === 'tolovTahriri.qoralamaSaqlash');

test('TolovTahriri DUAL: valyuta tanlovi avvalgidek', async () => {
  const forma = tahrir(DUAL);
  assert.ok(tanlovGuruhi(await forma.settle()));
});

test('TolovTahriri USD_ONLY: dollar to\'lov tahriri — tanlov yashirin, currency USD va kurs (so\'m sotuv) bilan saqlanadi', async () => {
  const forma = tahrir(USD_ONLY);
  const tree = await forma.settle();
  assert.equal(tanlovGuruhi(tree), undefined);
  assert.equal(elements(tree).find(n => n.props?.['data-testid'] === 'yagona-valyuta-almashdi'), undefined);
  elements(tree).find(n => n.type === 'SummaMaydoni' && n.props['aria-label']?.startsWith('tolovModal.tolovSummasi')).props.onChange('59');
  saqlashTugmasi(forma.render()).props.onClick();
  await forma.settle();
  assert.equal(forma.requests.length, 1);
  assert.equal(forma.requests[0].yangi.currency, 'USD');
  assert.equal(forma.requests[0].yangi.rate, 11980);
});

test('TolovTahriri UZS_ONLY: dollarda saqlangan to\'lov so\'mga o\'tadi, summa qaytadan kiritiladi, dollar yuborilmaydi', async () => {
  const forma = tahrir(UZS_ONLY);
  const tree = await forma.settle();
  assert.equal(tanlovGuruhi(tree), undefined);
  assert.ok(elements(tree).find(n => n.props?.['data-testid'] === 'yagona-valyuta-almashdi'), 'ogohlantirish ko\'rinadi');
  const summa = elements(tree).find(n => n.type === 'SummaMaydoni' && n.props['aria-label']?.startsWith('tolovModal.tolovSummasi'));
  assert.equal(summa.props.value, '', 'eski dollar soni so\'m bo\'lib qolmaydi');
  assert.equal(elements(tree).find(n => n.props?.['data-testid'] === 'kassir-kursi'), undefined, 'so\'m sotuvga so\'m to\'lov — kurs kerak emas');
  summa.props.onChange('720000');
  saqlashTugmasi(forma.render()).props.onClick();
  await forma.settle();
  assert.equal(forma.requests.length, 1);
  assert.equal(forma.requests[0].yangi.currency, 'UZS');
  assert.equal(forma.requests[0].yangi.rate, undefined);
});

test('TolovTahriri bir valyutali rejim: sotuvda boshqa valyutadagi boshqa to\'lov bo\'lsa tahrir to\'xtatiladi', async () => {
  const ikkinchi = { id: 'p2', paymentType: 'CASH', amount: '1000', currency: 'UZS', date: '2026-11-05' };
  const document = { ...sotuv, payments: [tolov, ikkinchi] };
  const forma = tahrir(USD_ONLY, document, tolov);
  const tree = await forma.settle();
  assert.ok(text(elements(tree).find(n => n.props?.['data-testid'] === 'dollar-mumkin-emas')).includes('tolovTahriri.yagonaRejim.boshqaTolovlar'));
  elements(tree).find(n => n.type === 'SummaMaydoni' && n.props['aria-label']?.startsWith('tolovModal.tolovSummasi')).props.onChange('59');
  saqlashTugmasi(forma.render()).props.onClick();
  await forma.settle();
  assert.equal(forma.requests.length, 0);
});

test('TolovTahriri UZS_ONLY: eski dollar sotuvdagi yagona to\'lov bloklanmaydi — so\'mda kurs bilan saqlanadi', async () => {
  const dollarTolov = { id: 'p1', paymentType: 'CASH', amount: '60', currency: 'USD', settledAmount: '0', date: '2026-11-05' };
  const dollarSotuv = { id: 's1', status: 'DRAFT', currency: 'USD', date: '2026-11-05', totalAmount: 60, payments: [dollarTolov] };
  const forma = tahrir(UZS_ONLY, dollarSotuv, dollarTolov);
  const tree = await forma.settle();
  assert.equal(elements(tree).find(n => n.props?.['data-testid'] === 'dollar-mumkin-emas'), undefined, 'rejimni almashtirish talab qilinmaydi');
  assert.equal(tanlovGuruhi(tree), undefined);
  elements(tree).find(n => n.type === 'SummaMaydoni' && n.props['aria-label']?.startsWith('tolovModal.tolovSummasi')).props.onChange('718800');
  saqlashTugmasi(forma.render()).props.onClick();
  await forma.settle();
  assert.equal(forma.requests.length, 1);
  assert.equal(forma.requests[0].yangi.currency, 'UZS');
  assert.equal(forma.requests[0].yangi.rate, 11980);
});

// ---------- Savdo jami summalari (savdoYordamchilari) ----------
const valyutaHolati = { kurs: 0, kursBor: false, rejim: 'USD_ONLY' };
const yordamCompiled = ts.transpileModule(readFileSync(new URL('../src/Pages/Savdo/savdoYordamchilari.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const yordamContext = { exports: {}, Intl, require: name => {
  if (name === '@/lib/valyuta') return {
    pulMatni: son => `${son} hisobot`, oziValyutadaMatn: (son, valyuta) => (valyuta === 'USD' ? `$${son}` : `${son} so'm`),
    useValyutaStore: { getState: () => valyutaHolati }, valyutaKodi: v => (String(v ?? '').toUpperCase() === 'USD' ? 'USD' : 'UZS'),
  };
  if (name === '@/lib/kassaNomlari') return require('../src/lib/kassaNomlari.ts');
  throw new Error(`Unmocked dependency: ${name}`);
} };
runInNewContext(yordamCompiled, yordamContext);
const yordam = yordamContext.exports;

test('USD_ONLY: savdo jami dollarda — dollar summalar o\'girilmaydi, eski so\'m hujjat kurs bilan dollarga', () => {
  Object.assign(valyutaHolati, { rejim: 'USD_ONLY', kurs: 0, kursBor: false });
  assert.equal(yordam.aralashJamiMatni([{ summa: 200, valyuta: 'USD' }, { summa: 50, valyuta: 'USD' }]), '$250');
  assert.equal(yordam.summaniSomga(200, 'USD'), 200);
  assert.equal(yordam.aralashJamiMatni([{ summa: 200, valyuta: 'USD' }, { summa: 120000, valyuta: 'UZS' }]), "$200 + 120000 so'm");
  Object.assign(valyutaHolati, { kurs: 12000, kursBor: true });
  assert.equal(yordam.aralashJamiMatni([{ summa: 200, valyuta: 'USD' }, { summa: 120000, valyuta: 'UZS' }]), '$210');
  assert.equal(yordam.summaniSomga(120000, 'UZS'), 10);
  assert.equal(yordam.summaniSomga(200, 'USD'), 200);
});

test('UZS_ONLY va DUAL: jami avvalgidek so\'mga o\'giriladi', () => {
  for (const rejim of ['UZS_ONLY', 'DUAL']) {
    Object.assign(valyutaHolati, { rejim, kurs: 12000, kursBor: true });
    assert.equal(yordam.aralashJamiMatni([{ summa: 1000000, valyuta: 'UZS' }, { summa: 200, valyuta: 'USD' }]), '3400000 hisobot');
    assert.equal(yordam.summaniSomga(200, 'USD'), 2400000);
    assert.equal(yordam.summaniSomga(5000, 'UZS'), 5000);
  }
});
