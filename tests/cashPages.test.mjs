import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as dates from '../src/lib/hujjatSanasi.ts';
import * as cash from '../src/lib/cashReports.ts';
import * as numbering from '../src/lib/kassaNomlari.ts';

const require = createRequire(import.meta.url);
const nodes = value => Array.isArray(value) ? value.flatMap(nodes) : !value || typeof value !== 'object' ? [] : [value, ...nodes(value.props?.children)];
const text = value => Array.isArray(value) ? value.map(text).join('') : value && typeof value === 'object' ? text(value.props?.children) : String(value ?? '');
const same = (left, right) => left && right && left.length === right.length && left.every((item, i) => Object.is(item, right[i]));

function page(path, dependencies, props = {}, globals = {}) {
  const compiled = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  let cursor = 0;
  const slots = [], pending = [];
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(initial) { return react.useState(() => ({ current: initial }))[0]; },
    useMemo(fn, deps) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { deps, value: fn() }; return slots[i].value; },
    useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) { slots[i]?.cleanup?.(); slots[i] = { deps }; pending.push(() => { slots[i].cleanup = fn(); }); } },
  };
  const context = { ...globals, exports: {}, window: { setInterval: () => 1, clearInterval() {}, addEventListener() {}, removeEventListener() {} }, require(name) {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return require(name);
    if (name === '@/lib/hujjatSanasi') return { ...dates, bugungiToshkentKuni: () => dates.bugungiToshkentKuni(new Date('2026-10-23T20:30:00Z')) };
    if (name === '@/lib/cashReports') return cash;
    if (name === '@/api/sozlamalarApi') return { getApiErrorMessage: String };
    if (name in dependencies) return dependencies[name];
    return new Proxy({ __esModule: true, default: name.split('/').at(-1) }, { get(target, key) { return target[key] ?? String(key); } });
  } };
  runInNewContext(compiled, context);
  const render = () => { cursor = 0; return context.exports.default(props); };
  return { render, async settle() { render(); pending.splice(0).forEach(fn => fn()); await new Promise(resolve => setImmediate(resolve)); return render(); } };
}
const zero = (opening = 0) => ({ opening, income: 0, expense: 0, closing: opening, byPaymentType: { CASH: { income: 0, expense: 0 }, CARD: { income: 0, expense: 0 }, BANK: { income: 0, expense: 0 } } });
const daily = params => ({ ...params, timezone: 'Asia/Tashkent', days: [{ date: params.from, operationsCount: 0, UZS: zero(1000), USD: zero(100.25) }], totals: { operationsCount: 0, UZS: zero(1000), USD: zero(100.25) } });

test('daily page uses Tashkent today, keeps historical range independent, and applies branch/payment filters to both requests', async () => {
  const calls = [];
  const screen = page('../src/Pages/HisobotUchot/KunlikKassa.tsx', {
    '@/api/reportsApi': { cashDailyReportApi: { olish: async params => { calls.push(params); return daily(params); } } },
    '@/api/omborApi': { filiallarApi: { royxat: async () => [{ id: 'b1', name: 'Branch' }] } },
  });
  let tree = await screen.settle();
  assert.ok(calls.some(call => call.from === '2026-10-24' && call.to === '2026-10-24'));
  assert.match(text(tree), /Kassada:.*1.*000 so'm.*\$100[.,]25/);
  nodes(tree).find(node => node.type === 'MuddatTanlov').props.onChange('2026-01-01', '2026-01-03');
  tree = await screen.settle();
  assert.equal(calls.at(-1).from, '2026-01-01');
  assert.equal(calls.filter(call => call.from === call.to).length, 1, 'historical range does not change today query');
  nodes(tree).filter(node => node.type === 'select')[0].props.onChange({ target: { value: 'BANK' } });
  tree = await screen.settle();
  nodes(tree).filter(node => node.type === 'select')[1].props.onChange({ target: { value: 'b1' } });
  tree = await screen.settle();
  assert.ok(calls.slice(-2).every(call => call.branchId === 'b1' && call.paymentType === 'BANK'));
  assert.equal(calls.at(-1).from, '2026-10-24');
  const row = nodes(tree).find(node => node.type === 'tbody').props.children[0];
  assert.match(text(row), /01.01.2026/);
  assert.ok(text(row).includes('$0'), 'zero-activity day remains a visible row');
  nodes(tree).find(node => node.type === 'MuddatTanlov').props.onChange('2026-01-01', '2027-02-05');
  const previousCalls = calls.length;
  tree = await screen.settle();
  assert.equal(calls.length, previousCalls, 'over-400-day range cannot reach backend');
  assert.match(text(tree), /400 kun/);
});

test('cash-flow page keeps dual-currency cards and exports without the selected USD table currency', async () => {
  const calls = [], exports = [];
  const balance = { openingBalance: 1000, income: 500, expense: 100, closingBalance: 1400 };
  const usd = { openingBalance: 100, income: 1.25, expense: 0.5, closingBalance: 100.75 };
  const screen = page('../src/Pages/HisobotUchot/KirimChiqimHisoboti.tsx', {
    './HisobotRealData': { useHisobotRealData: () => ({ filiallar: [] }) },
    './yordamchilar': { son: String },
    '@/api/reportsApi': { cashFlowReportApi: {
      olish: async params => { calls.push(params); return { items: [], byPaymentMethod: [{ paymentMethod: 'CASH', ...(params.currency === 'USD' ? usd : balance) }], summary: { ...balance, byCurrency: { UZS: { ...balance, byPaymentMethod: { CASH: balance } }, USD: { ...usd, byPaymentMethod: { CASH: usd } } } } }; },
      export: async params => exports.push(params),
    } },
  });
  let tree = await screen.settle();
  assert.match(text(tree), /\$100[.,]75/);
  assert.match(text(tree), /1.*400 so'm/);
  nodes(tree).find(node => node.type === 'select').props.onChange({ target: { value: 'USD' } });
  tree = await screen.settle();
  assert.equal(calls.at(-1).currency, 'USD');
  assert.match(calls.at(-1).dateFrom, /^\d{4}-\d{2}-\d{2}$/);
  nodes(tree).find(node => node.type === 'button' && text(node).includes('Excel')).props.onClick();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(exports.length, 1);
  assert.equal('currency' in exports[0], false);
});

test('kassa uses server totals, preserves ledger currencies, excludes duplicate/orphan operations and retains draft metadata', async () => {
  const calls = [];
  const rows = [
    { id: 'sale-payment', source: 'SALE', type: 'INCOME', paymentType: 'CASH', amount: 10, currency: 'UZS', date: '2026-10-20', refId: 'sale', refDocNumber: 'SOT-001' },
    { id: 'ledger-operation', source: 'CASH_OPERATION', type: 'INCOME', paymentType: 'CASH', amount: 100.25, currency: 'USD', date: '2026-10-21', refId: 'operation' },
  ];
  const operations = [
    { id: 'operation', docNumber: 'OP-001', type: 'CUSTOMER_PAYMENT', direction: 'INCOME', status: 'CONFIRMED', paymentMethod: 'CASH', amount: 999999, currency: 'UZS', date: '2026-10-21', customerId: 'customer' },
    { id: 'draft', docNumber: 'OP-002', type: 'OTHER_INCOME', direction: 'INCOME', status: 'DRAFT', paymentMethod: 'CASH', amount: 888888, currency: 'UZS', date: '2026-10-22' },
    { id: 'orphan', docNumber: 'OP-003', type: 'OTHER_INCOME', direction: 'INCOME', status: 'CONFIRMED', paymentMethod: 'CASH', amount: 777777, currency: 'UZS', date: '2026-10-23' },
  ];
  const screen = page('../src/Pages/KassaUchot/index.tsx', {
    'react-i18next': { useTranslation: () => ({ t: (key, args) => args?.value ? `Jami: ${args.value}` : key }) },
    '@/hooks/useHujjatniOchirishMumkinmi': { useHujjatniBekorQilishMumkinmi: () => true },
    '@/store/authProfileStore': { useAuthProfileStore: selector => selector({ profil: { role: 'DIREKTOR' } }) },
    '@/lib/roles': { rolniNormallashtirish: value => value },
    '@/lib/kassaNomlari': numbering,
    '@/hooks/useKassaSotuvlari': { useKassaSotuvKeshi: () => ({ olingan: () => undefined }) },
    './yordamchilar': { kassaSummasi: cash.cashAmount, sanaFormat: dates.kunMatni },
    '@/api/accountsApi': { foydalanuvchilarApi: { royxat: async () => [] } },
    '@/api/omborApi': { filiallarApi: { royxat: async () => [] } },
    '@/api/cashOperationsApi': { cashOperationsApi: { barchasi: async () => ({ items: operations }) } },
    '@/api/tolovApi': { barchaFinanceTransactionsHisoboti: async params => { calls.push(params); return { items: rows.filter(row => (!params.currency || params.currency === 'ALL' || row.currency === params.currency) && (!params.search || (row.refDocNumber ?? row.id).includes(params.search))), summary: { UZS: { income: 14350000 }, USD: { income: 100.25 } } }; } },
  });
  let tree = await screen.settle();
  const table = () => nodes(tree).find(node => node.type === 'KengaytiriladiganJadval');
  const loaded = table().props.qatorlar;
  assert.equal(loaded.length, 3, 'only ledger rows plus manageable draft are shown');
  assert.equal(loaded.find(row => row.id === 'operation').valyuta, 'USD');
  assert.equal(loaded.find(row => row.id === 'operation').summa, 100.25);
  assert.equal(loaded.find(row => row.id === 'operation').xaridorId, 'customer');
  assert.equal(loaded.find(row => row.id === 'draft').holat, 'qoralama');
  assert.match(text(tree), /14.*350.*000 so'm.*\$100[.,]25/);
  const dollarNumber = loaded.find(row => row.id === 'operation').raqam;
  nodes(tree).find(node => node.type === 'select').props.onChange({ target: { value: 'USD' } });
  tree = await screen.settle();
  assert.equal(table().props.qatorlar.length, 1);
  assert.equal(table().props.qatorlar[0].raqam, dollarNumber, 'currency filter does not renumber');
  assert.match(text(tree), /14.*350.*000 so'm/, 'currency filter must not discard UZS server total');
  assert.ok(calls.some(call => call.currency === 'USD' && call.paymentType === 'CASH' && call.type === 'INCOME'));
  nodes(tree).find(node => node.type === 'input').props.onChange({ target: { value: dollarNumber } });
  tree = await screen.settle();
  assert.equal(table()?.props.qatorlar[0]?.id, 'operation', 'displayed K-number remains searchable');
  assert.equal(calls.at(-1).search, undefined, 'UI-generated K-number must not be sent as a backend document search');
});

test('cash-flow details preserve server order for identical document dates and running balances', async () => {
  const screen = page('../src/Pages/HisobotUchot/KirimChiqimHisoboti.tsx', {
    './HisobotRealData': { useHisobotRealData: () => ({ filiallar: [] }) }, './yordamchilar': { son: String },
    '@/api/reportsApi': { cashFlowReportApi: { olish: async () => ({ summary: {}, byPaymentMethod: [], items: [
      { id: 'z', name: 'First', date: '2026-10-23T18:59:59Z', income: 100, currency: 'UZS', paymentType: 'CASH', runningBalance: 100 },
      { id: 'a', name: 'Second', date: '2026-10-23T18:59:59Z', income: 50, currency: 'UZS', paymentType: 'CASH', runningBalance: 150 },
    ] }) } },
  });
  let tree = await screen.settle();
  nodes(tree).find(node => node.type?.name === 'MatritsaJadval').props.satrlar[1].onClick();
  tree = screen.render();
  const details = nodes(tree).find(node => node.type?.name === 'MatritsaJadval' && node.props.birinchiSarlavha === 'Hujjatlar');
  assert.deepEqual(Array.from(details.props.satrlar, row => row.kataklar.at(-1).qoldiq), [100, 150]);
});

test('Tashkent date presets use Tashkent day in a UTC browser around midnight', () => {
  class UTCDate extends Date {
    constructor(...args) { super(args.length > 1 ? Date.UTC(...args) : args.length ? args[0] : '2026-10-23T20:00:00Z'); }
    getFullYear() { return this.getUTCFullYear(); }
    getMonth() { return this.getUTCMonth(); }
    getDate() { return this.getUTCDate(); }
    setDate(value) { return this.setUTCDate(value); }
  }
  const changes = [];
  const screen = page('../src/Components/ui/DateRangePicker.tsx', {
    'react-i18next': { useTranslation: () => ({ t: key => key, i18n: { resolvedLanguage: 'uz' } }) },
    'date-fns': { format: date => date.toISOString().slice(0, 10) },
    '@/lib/utils': { cn: (...values) => values.join(' ') },
  }, { from: '', to: '', timeZone: 'Asia/Tashkent', onChange: (...args) => changes.push(args) }, { Date: UTCDate });
  let tree = screen.render();
  nodes(tree).find(node => node.type === 'button' && text(node) === 'dateRange.today').props.onClick();
  tree = screen.render();
  nodes(tree).find(node => node.type === 'Button' && text(node) === 'dateRange.apply').props.onClick();
  assert.deepEqual(changes, [['2026-10-24', '2026-10-24']]);
});
