import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { calls, handlers, reset } from './helpers/savdoYuklashClient.mjs';
import { joriyOgohlantirish, ogohlantirishgaJavob } from '../src/lib/ogohlantirishSorovi.ts';
import * as lib from '../src/lib/qarzTaqsimoti.ts';

// Mijoz to'lovi eng eski qarzdan yopiladi (FIFO): allocation o'qish, kassir xabari, force bilan qayta yuborish va oldindan ko'rish paneli.
const fixture = new URL('./helpers/savdoYuklashClient.mjs', import.meta.url).href;
const src = new URL('../src/', import.meta.url);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.startsWith(src.href)) {
      if (['./axios', './catalogApi', './sozlamalarApi', './hujjatOgohlantirishi', '@/api/sozlamalarApi', '@/api/partnersApi', '@/Pages/Savdo/savdoYordamchilari'].includes(specifier)) {
        return { url: fixture, shortCircuit: true };
      }
      if (specifier.startsWith('@/')) return { url: new URL(specifier.slice(2) + '.ts', src).href, shortCircuit: true };
      if (specifier.startsWith('.') && !specifier.endsWith('.ts')) return { url: new URL(specifier + '.ts', context.parentURL).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
globalThis.window ??= new EventTarget();
globalThis.window.localStorage ??= { getItem: () => null };
const { sotuvgaTolovQoshish } = await import('../src/api/savdoApi.ts');
const { cashOperationsApi } = await import('../src/api/cashOperationsApi.ts');
// axios brauzer muhitini import paytida aniqlaydi: `document` undan keyin qo'yiladi (apiTiliniOlish uchun kerak).
globalThis.document ??= { documentElement: { lang: 'uz' } };

const tick = () => new Promise(resolve => setImmediate(resolve));
const qator = (saleId, docNumber, amount, debtRemaining = '0.00') => ({ saleId, docNumber, isOpeningDebt: false, currency: 'UZS', amount, settledAmount: amount, rate: null, debtRemaining });
const allocation = { allocated: [qator('s1', 'SOT-07839743', '910000.00'), qator('s2', 'SOT-41633428', '687500.00')], toAccount: '0.00', accountCurrency: 'USD', closedSales: ['s1', 's2'] };

test('allocation is read from the confirm response, its envelope, the preview root and the detail allocations list', () => {
  for (const raw of [{ id: 'op', allocation }, { data: { id: 'op', allocation } }, allocation]) {
    const natija = lib.taqsimotniOqish(raw);
    assert.equal(natija.allocated.length, 2);
    assert.deepEqual(natija.closedSales, ['s1', 's2']);
    assert.equal(natija.accountCurrency, 'USD');
  }
  const tafsilot = lib.taqsimotniOqish({ id: 'op', accountAmount: '1.50', settleCurrency: 'USD', allocations: [{ saleId: 's3', amount: '20', currency: 'USD', settledAmount: '20', rate: null, sale: { docNumber: 'SOT-5', currency: 'USD', isOpeningDebt: true } }] });
  assert.equal(tafsilot.allocated.length, 1);
  assert.equal(tafsilot.toAccount, '1.50');
  assert.equal(tafsilot.accountCurrency, 'USD');
  assert.equal(lib.taqsimotQatoriRaqami(tafsilot.allocated[0]), 'SOT-5');
  assert.equal(lib.taqsimotQatoriBoshlangichmi(tafsilot.allocated[0]), true);
  assert.equal(lib.taqsimotniOqish({ id: 'op', status: 'CONFIRMED' }), null);
  assert.equal(lib.taqsimotniOqish({ id: 'op', allocations: [], accountAmount: '0.00' }), null);
  assert.equal(lib.taqsimotniOqish(null), null);
});

test('cashier message lists closed sales by short number and the part that went to the account', () => {
  assert.deepEqual(lib.taqsimotXabari(lib.taqsimotniOqish({ allocation })), { sarlavha: '2 ta savdo yopildi: №07839743, №41633428', tafsilot: 'Hisobga: $0' });
  assert.match(lib.taqsimotXabari(lib.taqsimotniOqish({ allocation }), 'ru').sarlavha, /Закрыто продаж: 2 \(№07839743, №41633428\)/);
  const qisman = { allocated: [qator('s1', 'SOT-1', '500000.00'), qator('s2', 'SOT-2', '100000.00', '587500.00')], toAccount: '0', accountCurrency: 'UZS', closedSales: ['s1'] };
  assert.deepEqual(lib.taqsimotXabari(qisman), { sarlavha: '1 ta savdo yopildi: №1', tafsilot: 'qisman: 1 ta · Hisobga: 0 so\'m' });
  assert.deepEqual(lib.taqsimotXabari({ allocated: [], toAccount: '5', accountCurrency: 'USD', closedSales: [] }), { sarlavha: 'Ochiq qarz yo\'q', tafsilot: 'Hisobga: $5' });
  assert.equal(lib.taqsimotXabari({ allocated: [], toAccount: '0', accountCurrency: 'USD', closedSales: [] }), null);
  assert.equal(lib.taqsimotXabari(null), null);
  assert.equal(lib.qisqaHujjatRaqami('SOT-07839743'), '№07839743');
  assert.equal(lib.qisqaHujjatRaqami(''), '');
  // Tafsilotda closedSales yo'q: qoldig'i 0 ga tushganlar yopilgan hisoblanadi.
  assert.deepEqual(lib.yopilganQatorlar({ allocated: [qator('a', 'SOT-A', '1', '0'), qator('b', 'SOT-B', '1', '3')], closedSales: null }).map(item => item.saleId), ['a']);
});

test('cash operation confirm resends with force only when asked and the preview request never saves anything', async () => {
  reset();
  handlers.set('POST /finance/cash-operations/op1/confirm', (data) => ({ id: 'op1', status: 'CONFIRMED', allocation, force: data?.force ?? null }));
  const oddiy = await cashOperationsApi.tasdiqlash('op1');
  assert.equal(oddiy.force, null);
  assert.equal(calls.at(-1).data, undefined);
  const majbur = await cashOperationsApi.tasdiqlash('op1', { force: true });
  assert.equal(majbur.force, true);
  assert.deepEqual(calls.at(-1).data, { force: true });
  handlers.set('POST /finance/cash-operations/allocation-preview', () => allocation);
  const korish = await cashOperationsApi.taqsimotOldindanKorish({ customerId: 'c1', amount: 1597500, currency: 'UZS', saleId: 's2' });
  assert.deepEqual(calls.at(-1).data, { customerId: 'c1', amount: 1597500, currency: 'UZS', saleId: 's2' });
  assert.equal(calls.at(-1).config.xatoniYashirish, true);
  assert.equal(korish.allocated.length, 2);
});

const shubha = url => ({ isAxiosError: true, config: { url }, response: { status: 400, data: { code: 'errors.finance.suspicious_currency', message: "Summa juda kichik. Valyuta to'g'rimi? 200.53 so'm = $0.02" } } });

test('suspicious currency on a sale payment asks the cashier and resends the same body with force: true', async () => {
  reset();
  handlers.set('POST /sales/s1/payments', (data) => { if (!data.force) throw shubha('/sales/s1/payments'); return { id: 's1' }; });
  handlers.set('/sales/s1', () => ({ id: 's1', status: 'CONFIRMED', payments: [{ id: 'p1', paymentType: 'CASH', amount: '200.53', currency: 'UZS' }] }));
  const natija = sotuvgaTolovQoshish('s1', { paymentType: 'CASH', amount: 200.53, currency: 'UZS' });
  for (let i = 0; i < 10 && !joriyOgohlantirish(); i += 1) await tick();
  const sorov = joriyOgohlantirish();
  assert.ok(sorov, 'dialog is shown');
  assert.match(sorov.matn, /200\.53 so'm = \$0\.02/);
  assert.equal(sorov.matnlar.sarlavha, "Valyuta to'g'rimi?");
  assert.equal(sorov.matnlar.ha, 'Ha, shu valyutada');
  ogohlantirishgaJavob(sorov.id, true);
  const { sotuv } = await natija;
  assert.equal(sotuv.payments.length, 1);
  const postlar = calls.filter(call => call.method === 'post' && call.url === '/sales/s1/payments');
  assert.equal(postlar.length, 2);
  assert.deepEqual(postlar[0].data, { paymentType: 'CASH', amount: 200.53, currency: 'UZS' });
  assert.deepEqual(postlar[1].data, { paymentType: 'CASH', amount: 200.53, currency: 'UZS', force: true });
});

test('declining the currency question keeps the original error and does not resend', async () => {
  reset();
  handlers.set('POST /sales/s1/payments', () => { throw shubha('/sales/s1/payments'); });
  const natija = sotuvgaTolovQoshish('s1', { paymentType: 'CASH', amount: 200.53, currency: 'UZS' });
  for (let i = 0; i < 10 && !joriyOgohlantirish(); i += 1) await tick();
  ogohlantirishgaJavob(joriyOgohlantirish().id, false);
  await assert.rejects(natija, error => error.response?.data?.code === 'errors.finance.suspicious_currency');
  assert.equal(calls.filter(call => call.method === 'post').length, 1);
  assert.equal(joriyOgohlantirish(), null);
});

// --- Oldindan ko'rish paneli (kichik hooks runtime bilan) ---
const require = createRequire(import.meta.url);
function compile(path, dependencies, globals = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { ...globals, exports: {}, require: name => {
    if (name in dependencies) return dependencies[name];
    if (name === 'react/jsx-runtime') return require(name);
    throw new Error(`Unmocked dependency: ${name}`);
  } };
  runInNewContext(code, context);
  return context.exports;
}
function hooksRuntime() {
  const states = []; const effects = []; let cursor = 0; let effectCursor = 0;
  const react = {
    useState(initial) { const index = cursor++; if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial; return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; },
    useMemo: factory => factory(),
    useCallback: fn => fn,
    useEffect(fn, deps) { const index = effectCursor++; const previous = effects[index]; const changed = !previous || !deps || deps.length !== previous.deps.length || deps.some((dep, i) => !Object.is(dep, previous.deps[i])); effects[index] = { deps, run: changed ? fn : null, cleanup: previous?.cleanup }; },
  };
  async function render(component, props) {
    let tree;
    for (let round = 0; round < 8; round++) {
      cursor = 0; effectCursor = 0;
      tree = component(props);
      for (const effect of effects) { if (!effect.run) continue; effect.cleanup?.(); const cleanup = effect.run(); effect.cleanup = typeof cleanup === 'function' ? cleanup : undefined; effect.run = null; }
      await new Promise(resolve => setTimeout(resolve, 1));
    }
    return tree;
  }
  return { react, render };
}
const nodes = value => Array.isArray(value) ? value.flatMap(nodes) : !value || typeof value !== 'object' ? [] : [value, ...nodes(value.props?.children)];
const texts = value => Array.isArray(value) ? value.flatMap(texts) : value && typeof value === 'object' ? (typeof value.type === 'function' ? texts(value.type(value.props)) : texts(value.props?.children)) : value == null || typeof value === 'boolean' ? [] : [String(value)];
const matnlar = tree => texts(tree).join('').replace(/\s+/g, ' ');

test('preview panel lists open debts oldest first, asks the server preview with the typed amount, and lets the cashier pick the first sale', async () => {
  const previewCalls = [];
  const chosen = [];
  const yordamchilar = { kassaSummasi: (summa, valyuta) => `${summa} ${valyuta ?? 'UZS'}`, sanaFormat: value => value };
  const { react, render } = hooksRuntime();
  const common = { react, 'react-i18next': { useTranslation: () => ({ t: (key, params) => params?.summa ? `${key}:${params.summa}` : key }) }, 'lucide-react': new Proxy({}, { get: (_, name) => String(name) }), '@/lib/qarzTaqsimoti': lib, './yordamchilar': yordamchilar };
  const TaqsimotQatorlari = compile('../src/Pages/KassaUchot/TaqsimotQatorlari.tsx', common).default;
  const Panel = compile('../src/Pages/KassaUchot/QarzTaqsimotiPaneli.tsx', {
    ...common,
    '@/api/cashOperationsApi': { cashOperationsApi: { taqsimotOldindanKorish: async sorov => { previewCalls.push(sorov); return { allocated: [qator('a', 'SOT-1', '910000.00')], toAccount: '5', accountCurrency: 'USD', closedSales: ['a'] }; } } },
    '@/api/mijozQarzlariApi': { mijozQarzlariniOlish: async () => ({ accountBalance: '0', accountCurrency: 'USD', debtTotals: { UZS: '910000', USD: '18.75' }, items: [
      { saleId: 'a', docNumber: 'SOT-1', currency: 'UZS', debtAmount: '910000', date: '2026-10-01', status: 'UNPAID' },
      { saleId: 'b', docNumber: 'SOT-2', currency: 'USD', debtAmount: '18.75', isOpeningDebt: true, status: 'PARTIALLY_PAID' },
    ] }) },
    '@/api/sozlamalarApi': { getApiErrorMessage: error => error.message },
    './TaqsimotQatorlari': { __esModule: true, default: TaqsimotQatorlari },
  }, { window: { setTimeout: (fn, ms) => setTimeout(fn, ms), clearTimeout: id => clearTimeout(id) } }).default;
  const props = { customerId: 'c1', amount: 1000, currency: 'UZS', saleId: '', onSaleIdChange: id => chosen.push(id), kechikishMs: 0 };
  let tree = await render(Panel, props);
  const matn = matnlar(tree);
  assert.match(matn, /1\. taqsimot\.sale №1/);
  assert.match(matn, /2\. taqsimot\.openingDebt №2/);
  assert.match(matn, /18\.75 USD/);
  assert.deepEqual(JSON.parse(JSON.stringify(previewCalls[0])), { customerId: 'c1', amount: 1000, currency: 'UZS' });
  assert.match(matn, /taqsimot\.closed/);
  assert.match(matn, /taqsimot\.toAccount:5 USD/);
  const tugmalar = nodes(tree).filter(node => node.type === 'button' && 'aria-pressed' in node.props);
  assert.equal(tugmalar.length, 2);
  tugmalar[1].props.onClick();
  assert.deepEqual(chosen, ['b']);
  tree = await render(Panel, { ...props, saleId: 'b' });
  assert.equal(previewCalls.at(-1).saleId, 'b');
  assert.match(matnlar(tree), /taqsimot\.first(?!Hint)/);
  assert.equal(nodes(tree).filter(node => node.type === 'button' && node.props['aria-pressed'] === true).length, 1);
});
