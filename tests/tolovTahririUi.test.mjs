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
const nodes = value => Array.isArray(value) ? value.flatMap(nodes) : !value || typeof value !== 'object' ? [] : [value, ...nodes(value.props?.children)];
const text = value => Array.isArray(value) ? value.map(text).join('') : value?.props ? text(value.props.children) : String(value ?? '');
const payment = { id: 'p1', paymentType: 'CASH', amount: '60', currency: 'USD', rate: '11980', settledAmount: '0', date: '2026-11-05' };
const sale = { id: 's1', status: 'CONFIRMED', currency: 'UZS', date: '2026-11-05', totalAmount: 720000, customerId: 'c1', payments: [payment] };
const money = n => String(n);
const helpers = {
  sotuvRaqami: () => '17317410', sotuvSummasi: s => Number(s.totalAmount), sotuvValyutasi: s => s.currency,
  tolovValyutasi: p => p.currency, qatorValyutasi: p => p.currency,
  tolovSotuvValyutasida: (p, s) => p.currency === s.currency ? Number(p.amount) : Number(p.amount) * Number(p.rate),
  tolovFoizi: () => 99, sotuvQarzdorlikSummasi: () => 0, masulNomi: () => 'Owner', pulniFormatlash: money,
  tolovTuriMatni: { CASH: 'Naqd', CARD: 'Karta', BANK: 'Bank' },
};

function mount(file, props, { profile = { role: 'DIRECTOR' }, closed = null, exportName, dependencies = {} } = {}) {
  const slots = [], effects = [];
  let cursor = 0;
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(initial) { return react.useState(() => ({ current: initial }))[0]; },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((d, n) => !Object.is(d, slots[i].deps[n]))) { slots[i]?.cleanup?.(); slots[i] = { deps }; effects.push(() => { slots[i].cleanup = fn(); }); } },
  };
  const defaults = {
    './savdoYordamchilari': helpers,
    '@/lib/hujjatSanasi': dateLib,
    '@/lib/tolovTahriri': editLib,
    '@/lib/tolovOrtiqchasi': excessLib,
    '@/hooks/useTolovTahririRuxsati': { useTolovTahririRuxsati: () => (s, p) => tolovTahririCheklovi(profile, s, p, closed) },
    '@/lib/valyuta': { useValyutaStore: select => select({ rejimYoniq: true, yuklandi: true }), useKursniTayyorlash() {} },
    '@/store/davrStore': { useDavrStore: select => select({ holat: { closedUntil: closed } }) },
    '@/lib/kursChegarasi': { ENG_KAM_KURS: 1000, kursJudaKichik: value => value > 0 && value < 1000 },
    '@/api/xatoKodlari': { asosiyXatoKodi: value => value },
  };
  const context = { exports: {}, require(name) {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'react-i18next') return { useTranslation: () => ({ t: key => key }) };
    if (name in dependencies) return dependencies[name];
    if (name in defaults) return defaults[name];
    return new Proxy({ __esModule: true, default: name.split('/').at(-1) }, { get: (target, key) => target[key] ?? String(key) });
  } };
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(compiled + (exportName ? `\nexports.testComponent = ${exportName};` : ''), context);
  const render = () => { cursor = 0; return (context.exports.testComponent ?? context.exports.default)(props); };
  return { render, async settle() { render(); effects.splice(0).forEach(fn => fn()); await new Promise(resolve => setImmediate(resolve)); return render(); } };
}

const editButton = tree => nodes(tree).find(n => n.type === 'button' && text(n) === 'tolovTahriri.tugma');

test('confirmed payment edit stays visible for a director, including after draft confirmation', () => {
  const document = { ...sale, status: 'DRAFT' };
  const modal = mount('../src/Pages/Savdo/SotuvTolovlari.tsx', { sotuv: document, mijoz: 'Customer', qator: { tolov: payment, raqam: '17317410/1' }, onYopish() {} }, { exportName: 'TolovTafsilotModal' });
  assert.equal(editButton(modal.render()).props.disabled, false);
  document.status = 'CONFIRMED';
  assert.equal(editButton(modal.render()).props.disabled, false);
  editButton(modal.render()).props.onClick();
  assert.ok(nodes(modal.render()).some(n => n.type === 'TolovTahriri'));
});

test('external cash payments, missing ids and closed periods show the disabled edit button and reason', () => {
  for (const [p, closed, reason] of [
    [{ ...payment, cashOperationId: 'cash-1' }, null, 'tolovTahriri.cheklov.kassaHujjati'],
    [{ ...payment, id: undefined }, null, 'tolovTahriri.cheklov.tolovIdYoq'],
    [payment, '2026-11-05', 'tolovTahriri.cheklov.davrYopilgan'],
  ]) {
    const modal = mount('../src/Pages/Savdo/SotuvTolovlari.tsx', { sotuv: sale, mijoz: 'Customer', qator: { tolov: p, raqam: '17317410/1' }, onYopish() {} }, { exportName: 'TolovTafsilotModal', closed });
    const tree = modal.render();
    assert.equal(editButton(tree).props.disabled, true);
    assert.equal(editButton(tree).props.title, reason);
    assert.ok(text(tree).includes(reason));
  }
});

test('actions menu opens editing directly and uses a portal with viewport collision padding', () => {
  const list = mount('../src/Pages/Savdo/SotuvTolovlari.tsx', { sotuv: sale, mijoz: 'Customer' });
  const menu = nodes(list.render()).find(n => n.type === 'DropdownMenuContent');
  assert.equal(menu.props.align, 'end');
  assert.equal(menu.props.collisionPadding, 12);
  const edit = nodes(menu).find(n => n.type === 'DropdownMenuItem' && text(n).includes('tolovTahriri.tugma'));
  assert.equal(edit.props.disabled, false);
  edit.props.onSelect();
  assert.equal(nodes(list.render()).find(n => typeof n.type === 'function' && n.type.name === 'TolovTafsilotModal').props.boshlangichTahrir, true);
});

function form(status) {
  const requests = [], rateDates = [];
  const document = { ...sale, status, customerId: undefined };
  const component = mount('../src/Pages/Savdo/TolovTahriri.tsx', { sotuv: document, tolov: payment, raqam: '17317410/1', onBand() {}, onOrqaga() {}, onYopish() {} }, { dependencies: {
    '@/api/valyutaApi': { kursniSongaAylantirish: Number, valyutaApi: { async amaldagiKurs(date) { rateDates.push(date); return { rate: '11980', rateDate: date }; } } },
    '@/store/savdoStore': { useSavdoStore: { getState: () => ({ async tolovniTahrirlash(request) { requests.push(request); return { ok: true, sotuv: { ...document, payments: [{ ...payment, ...request.yangi }] }, nakladnoy: null }; } }) } },
  } });
  return { ...component, requests, rateDates };
}

test('draft form saves the edited rate without confirmation or changing sale status', async () => {
  const editor = form('DRAFT');
  await editor.settle();
  const rate = nodes(editor.render()).find(n => n.type === 'SummaMaydoni' && n.props['aria-label'] === 'tolovTahriri.kurs.nomi');
  rate.props.onChange('12000');
  const tree = editor.render();
  assert.ok(text(nodes(tree).find(n => n.props['data-testid'] === 'tolov-kurs-hisobi')).replace(/\s/g, '').includes('720000'));
  const save = nodes(tree).find(n => n.type === 'button' && text(n) === 'tolovTahriri.qoralamaSaqlash');
  assert.equal(save.props.disabled, false);
  save.props.onClick();
  await editor.settle();
  assert.equal(editor.requests.length, 1);
  assert.equal(editor.requests[0].qoralama, true);
  assert.equal(editor.requests[0].yangi.rate, 12000);
  assert.equal(editor.requests[0].nakladnoyYuborish, undefined);
  assert.ok(nodes(editor.render()).some(n => n.props['data-testid'] === 'qoralama-tolov-tugadi'));
});

test('confirmed form retains the cancel/restore confirmation and loads rates for payment date', async () => {
  const editor = form('CONFIRMED');
  await editor.settle();
  const date = nodes(editor.render()).find(n => n.type === 'HujjatSanasi');
  // The date component is a default import, so use its date-change callback by accessible label.
  const dateField = date ?? nodes(editor.render()).find(n => n.props['aria-label'] === 'tolovModal.tolovSanasi');
  dateField.props.onChange('2026-11-06');
  await editor.settle();
  assert.deepEqual(editor.rateDates, ['2026-11-05', '2026-11-06']);
  const rate = nodes(editor.render()).find(n => n.type === 'SummaMaydoni' && n.props['aria-label'] === 'tolovTahriri.kurs.nomi');
  rate.props.onChange('12000');
  nodes(editor.render()).find(n => n.type === 'button' && text(n) === 'tolovTahriri.saqlash').props.onClick();
  assert.equal(editor.requests.length, 0);
  assert.ok(nodes(editor.render()).some(n => n.type === 'TasdiqlashOynasi'));
});
