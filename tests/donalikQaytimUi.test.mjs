import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../src/Pages/Savdo/SotuvTafsilotlariModal.tsx', import.meta.url), 'utf8');
const file = ts.createSourceFile('modal.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = ['TolovQabulQilishModal', 'farqliValyuta', 'valyutaYaxlitlash', 'mijozIdOlish'];
const declarations = file.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text)).map(node => node.getText(file));
const compiled = ts.transpileModule(declarations.join('\n') + '\nexports.Modal = TolovQabulQilishModal;', {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText;
const noop = () => {};
const helpers = require('../src/lib/tolovOrtiqchasi.ts');
const dates = require('../src/lib/hujjatSanasi.ts');
const elements = node => Array.isArray(node) ? node.flatMap(elements) : !node || typeof node !== 'object' ? [] : [node, ...elements(node.props?.children)];
function editor(overrides = {}) {
  const states = [];
  let cursor = 0;
  const changes = [], payments = [], closed = [];
  const context = {
    exports: {}, require,
    useState(initial) { const i = cursor++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useRef(value) { return context.useState(() => ({ current: value }))[0]; }, useEffect: noop,
    useTranslation: () => ({ t: key => key }),
    useValyutaStore: selector => selector({ rejimYoniq: true, kursBor: true, kurs: 12100 }),
    useDavrStore: selector => selector({ holat: null }), mijozHisobi: () => ({ miqdor: 0, valyuta: 'UZS' }),
    useSavdoStore: { getState: () => ({ xatolik: null }) },
    sotuvValyutasi: sale => sale.currency || 'UZS', tolovValyutasi: (payment, sale) => payment.currency || sale.currency || 'UZS',
    tolovSotuvValyutasida: payment => Number(payment.settledAmount ?? payment.amount),
    sotuvQarzdorlikSummasi: () => 0, pulniFormatlash: (amount, currency) => `${amount} ${currency}`,
    tolovTuriMatni: {}, ...helpers, ...dates,
  };
  for (const name of ['AppModal', 'CreditCard', 'SavdoSelect', 'SummaMaydoni', 'HujjatSanasiMaydoni', 'Plus', 'X', 'TriangleAlert', 'Banknote', 'OrtiqchaTanlovi', 'TolovNatijasiKarta']) context[name] = name;
  runInNewContext(compiled, context);
  const props = {
    sotuv: { id: 'walk-in', currency: 'UZS', payments: [], date: dates.bugungiToshkentKuni() }, jami: 396000, draft: true,
    onYangilash: async (id, payload) => { changes.push({ id, payload }); return true; },
    onTolovQoshish: async (id, payload) => { payments.push({ id, payload }); return { qaytim: 209000, hisobga: 0 }; },
    onYopish: () => closed.push(true), ...overrides,
  };
  return { changes, payments, closed, render() { cursor = 0; return context.exports.Modal(props); } };
}
function node(edit, type, predicate = () => true) { return elements(edit.render()).find(item => item.type === type && predicate(item.props)); }
function payUsd(edit, amount = '50') {
  node(edit, 'button', props => props.children === 'tolovModal.valyutaDollar').props.onClick();
  node(edit, 'SummaMaydoni', props => props['aria-label']?.startsWith('tolovModal.tolovSummasi')).props.onChange(amount);
}
async function save(edit) {
  elements(edit.render()).filter(item => item.type === 'button').at(-1).props.onClick();
  await new Promise(resolve => setImmediate(resolve));
}

test('walk-in draft accepts excess cash and shows change without a customer balance option', async () => {
  const edit = editor();
  payUsd(edit);
  const change = node(edit, 'SummaMaydoni', props => props['data-testid'] === 'qaytim-kiritish');
  assert.ok(change, 'walk-in sale must show cash change before saving');
  assert.equal(change.props.value, '209000');
  assert.equal(node(edit, 'OrtiqchaTanlovi'), undefined, 'walk-in sale has no balance choice');
  // Exercise the actual submit handler, not an isolated payload builder.
  await save(edit);
  assert.equal(edit.changes.length, 1, 'excess cash must reach the real draft update');
  assert.equal(edit.changes[0].payload.payments[0].amount, 50);
  assert.equal(edit.changes[0].payload.keepExcess, false);
});

test('cash change edits become payments[].rate and existing payment rates survive draft replacement', async () => {
  const edit = editor({ sotuv: { id: 'walk-in', currency: 'UZS', payments: [{ id: 'old', paymentType: 'CASH', currency: 'USD', amount: 10, settledAmount: 120000, rate: 12000 }] } });
  payUsd(edit);
  const input = node(edit, 'SummaMaydoni', props => props['data-testid'] === 'qaytim-kiritish');
  assert.ok(input, 'USD cash change must be editable for walk-in sales');
  input.props.onChange('200000');
  await save(edit);
  assert.equal(edit.changes.length, 1);
  assert.equal(edit.changes[0].payload.payments[0].rate, 12000);
  assert.equal(edit.changes[0].payload.payments[1].rate, 9520); // (396000 - 120000 + 200000) / 50
});

test('walk-in draft still rejects excess card payments', async () => {
  const edit = editor();
  node(edit, 'SavdoSelect').props.onChange('CARD');
  payUsd(edit);
  await save(edit);
  assert.equal(edit.changes.length, 0);
  assert.ok(elements(edit.render()).some(item => item.props?.children === 'tolovModal.errors.ortiqchaFaqatNaqd'));
});

test('UZS cash change is shown in UZS and can be saved without a customer', async () => {
  const edit = editor();
  node(edit, 'SummaMaydoni', props => props['aria-label']?.startsWith('tolovModal.tolovSummasi')).props.onChange('400000');
  assert.ok(elements(edit.render()).some(item => typeof item.props?.children === 'string' && item.props.children.replace(/\s/g, '') === '4000tolovModal.somBelgisi'));
  assert.equal(node(edit, 'OrtiqchaTanlovi'), undefined);
  await save(edit);
  assert.equal(edit.changes[0].payload.keepExcess, false);
  assert.equal(edit.changes[0].payload.payments[0].amount, 400000);
});

test('queued USD payment keeps its own edited rate when a UZS payment is added', async () => {
  const edit = editor();
  payUsd(edit);
  node(edit, 'SummaMaydoni', props => props['data-testid'] === 'qaytim-kiritish').props.onChange('200001');
  node(edit, 'button', props => Array.isArray(props.children) && props.children.includes('tolovModal.yanaTolovQoshish')).props.onClick();
  node(edit, 'SummaMaydoni', props => props['aria-label']?.startsWith('tolovModal.tolovSummasi')).props.onChange('1000');
  await save(edit);
  const payload = edit.changes[0].payload;
  assert.equal(payload.payments.length, 2);
  assert.equal(payload.payments[0].currency, 'USD');
  assert.equal(payload.payments[0].rate, 11920.02);
  assert.equal(payload.payments[1].amount, 1000);
  assert.equal(payload.payments[1].rate, undefined, 'one payment rate must not leak to another');
  assert.equal(payload.roundChange, false, 'an exact change amount must disable backend rounding');
  assert.ok(elements(edit.render()).some(item => typeof item.props?.children === 'string' && item.props.children.replace(/\s/g, '') === '201001tolovModal.somBelgisi'));
});

test('zero edited change is valid and uses a matching rate rather than the old daily rate', async () => {
  const edit = editor();
  payUsd(edit);
  node(edit, 'SummaMaydoni', props => props['data-testid'] === 'qaytim-kiritish').props.onChange('0');
  await save(edit);
  assert.equal(edit.changes[0].payload.payments[0].rate, 7920);
  assert.equal(edit.changes[0].payload.keepExcess, false);
});

test('total edited change includes earlier excess cash rather than adding it twice', async () => {
  const edit = editor({ sotuv: { id: 'walk-in', currency: 'UZS', payments: [{ id: 'old', paymentType: 'CASH', amount: 400000 }] } });
  payUsd(edit);
  node(edit, 'SummaMaydoni', props => props['data-testid'] === 'qaytim-kiritish').props.onChange('200001');
  await save(edit);
  assert.equal(edit.changes[0].payload.payments[1].rate, 3920.02); // (396000 - 400000 + 200001) / 50
  assert.equal(edit.changes[0].payload.roundChange, false);
});

test('an impossible total change cannot silently retain the old payment rate', async () => {
  const edit = editor({ sotuv: { id: 'walk-in', currency: 'UZS', payments: [{ id: 'old', paymentType: 'CASH', amount: 400000 }] } });
  payUsd(edit);
  node(edit, 'SummaMaydoni', props => props['data-testid'] === 'qaytim-kiritish').props.onChange('0');
  await save(edit);
  assert.equal(edit.changes.length, 0);
  assert.ok(elements(edit.render()).some(item => item.props?.children === 'tolovModal.errors.qaytimMosEmas'));
});

test('named customer retains the choice to keep excess in their balance', async () => {
  const edit = editor({ sotuv: { id: 'named', customerId: 'customer', currency: 'UZS', payments: [] } });
  payUsd(edit);
  node(edit, 'OrtiqchaTanlovi').props.onOzgarish(true);
  assert.equal(node(edit, 'SummaMaydoni', props => props['data-testid'] === 'qaytim-kiritish'), undefined);
  await save(edit);
  assert.equal(edit.changes[0].payload.keepExcess, true);
});

test('balance option is absent for walk-ins and remains available for named customers', () => {
  const text = readFileSync(new URL('../src/Pages/Savdo/OrtiqchaTanlovi.tsx', import.meta.url), 'utf8');
  const js = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  runInNewContext(js, { exports, require: name => name === 'react-i18next' ? { useTranslation: () => ({ t: key => key }) } : name === 'lucide-react' ? { Banknote: 'Banknote', Info: 'Info', TriangleAlert: 'TriangleAlert', Wallet: 'Wallet' } : require(name) });
  for (const customer of [false, true]) {
    const tree = exports.default({ rejim: 'qoralama', mijozBor: customer, hisobgaYozish: false, onOzgarish: noop, ortiqchaMatni: '209000' });
    const options = elements(tree).filter(item => typeof item.type === 'function' && item.props.nom);
    assert.equal(options.length, customer ? 2 : 1);
    assert.equal(options[0].props.tanlangan, true);
  }
});
