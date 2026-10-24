import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as model from '../src/Pages/HisobotUchot/foydaHisobotiModeli.ts';
import { hisobotPulMatni } from '../src/Pages/HisobotUchot/hisobotValyutasi.ts';
import * as dates from '../src/lib/hujjatSanasi.ts';

const require = createRequire(import.meta.url);
const compiled = ts.transpileModule(readFileSync(new URL('../src/Pages/HisobotUchot/FoydaHisoboti.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText;
const nodes = value => Array.isArray(value) ? value.flatMap(nodes) : !value || typeof value !== 'object' ? [] : [value, ...nodes(value.props?.children)];
const text = value => Array.isArray(value) ? value.map(text).join(' ') : value && typeof value === 'object' ? text(typeof value.type === 'function' ? value.type(value.props) : value.props?.children) : String(value ?? '');
const part = (revenue, cost, profit, marginPct) => ({ revenue, cost, profit, marginPct, qty: 2, checks: 1 });
const summary = { bySaleCurrency: { UZS: { ...part(90000, 60000, 30000, 33.33), qtySold: 20 }, USD: { ...part(100, 50, 50, 50), qtySold: 10 } }, costMissing: { count: 1 } };
const items = [
  { productId: 'known', productName: 'Known', qtySold: 4, revenue: 9999, profit: 9999, bySaleCurrency: { UZS: part(20000, 15000, 5000, 25), USD: part(20, 10, 10, 50) }, costMissing: false },
  { productId: 'missing', productName: 'Missing', qtySold: 1, bySaleCurrency: { USD: part(9000, 0, 9000, 100) }, costMissing: true },
];
function screen() {
  let cursor = 0;
  const slots = [], effects = [], calls = [], exports = [];
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useMemo: fn => fn(),
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((value, n) => !Object.is(value, slots[i].deps[n]))) { slots[i]?.cleanup?.(); slots[i] = { deps }; effects.push(() => { slots[i].cleanup = fn(); }); } },
  };
  const context = { exports: {}, setTimeout: () => 0, clearTimeout() {}, require(name) {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return require(name);
    if (name === './foydaHisobotiModeli') return model;
    if (name === './hisobotValyutasi') return { hisobotPulMatni };
    if (name === './HisobotRealData') return { useHisobotRealData: () => ({ kategoriyalar: [] }) };
    if (name === '@/lib/valyuta') return { korsatiladiganValyuta: () => 'USD' };
    if (name === '@/lib/hujjatSanasi') return { ...dates, bugungiToshkentKuni: () => '2026-10-24' };
    if (name === './yordamchilar') return { son: String };
    if (name === '@/api/sozlamalarApi') return { getApiErrorMessage: String };
    if (name === '@/api/reportsApi') return { productProfitReportApi: {
      barchasi: async params => { calls.push(params); return { currency: params.currency, summary, items, topProfit: [{ productId: 'wrong', productName: 'Converted legacy top', profitUzs: 9999999, profitUsd: 9999 }] }; },
      export: async params => exports.push(params),
    } };
    return new Proxy({ __esModule: true, default: name.split('/').at(-1) }, { get: (target, key) => target[key] ?? String(key) });
  } };
  runInNewContext(compiled, context);
  const render = () => { cursor = 0; return context.exports.default(); };
  return { calls, exports, async settle() { render(); effects.splice(0).forEach(fn => fn()); await new Promise(resolve => setImmediate(resolve)); return render(); } };
}

test('profit page displays independent server totals and margins, and marks missing cost without a fake 100% rank', async () => {
  const view = screen();
  let tree = await view.settle();
  let content = text(tree);
  assert.match(content, /30[,.\s]*000 so'm/);
  assert.match(content, /\$50/);
  assert.match(content, /33.33%/);
  assert.match(content, /50.00%/);
  assert.doesNotMatch(content, /≈|Converted legacy top|100.0%/);
  assert.match(content, /Tannarx kiritilmagan/);
  const topPanel = nodes(tree).find(node => node.type === 'section' && nodes(node).some(child => child.type === 'h2' && text(child).includes('Eng ko‘p foyda')));
  assert.match(text(topPanel), /Known/);
  assert.doesNotMatch(text(topPanel), /Missing/);
  assert.equal(view.calls[0].dateFrom, '2026-09-24');
  assert.equal(view.calls[0].dateTo, '2026-10-24');
  nodes(tree).find(node => node.type === 'Dropdown' && node.props.label.startsWith('Jadval')).props.onChange('UZS');
  tree = await view.settle();
  content = text(tree);
  assert.equal(view.calls.at(-1).currency, 'UZS');
  assert.match(content, /5[,.\s]*000 so'm/);
  assert.doesNotMatch(content, /Missing/, 'USD-only product is absent in the UZS table');
});

test('clearing profit dates does not throw or create UTC bounds and export keeps the selected filters', async () => {
  const view = screen();
  let tree = await view.settle();
  nodes(tree).find(node => node.type === 'MuddatTanlov').props.onChange('', '');
  tree = await view.settle();
  assert.equal(view.calls.at(-1).dateFrom, undefined);
  assert.equal(view.calls.at(-1).dateTo, undefined);
  nodes(tree).find(node => node.type === 'button' && text(node).includes('Excel')).props.onClick();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(view.exports[0].currency, 'USD');
  assert.equal(view.exports[0].dateFrom, undefined);
});

test('local customer search scopes the missing-cost warning and each currency total to matching customers', async () => {
  const view = screen();
  let tree = await view.settle();
  nodes(tree).find(node => node.type === 'button' && node.props.role === 'tab' && text(node).includes('Mijozlar')).props.onClick();
  tree = await view.settle();
  nodes(tree).find(node => node.type === 'input').props.onChange({ target: { value: 'Known' } });
  tree = await view.settle();
  const content = text(tree);
  assert.doesNotMatch(content, /Tannarxi kiritilmagan yozuvlar/);
  assert.match(content, /5[,.\s]*000 so'm/);
  assert.match(content, /\$10/);
});
