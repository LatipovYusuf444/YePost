import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const noop = () => {};
const stock = id => ({ modificationId: id, warehouseId: 'w', quantity: 50, sellingPrice: 25000, modification: { id, name: id, price: { retailPrice: 25000, wholesalePrice: 22000 } } });
const item = id => ({ id, modificationId: id, quantity: 2, price: 25000, priceType: 'RETAIL' });

function editor() {
  let cursor = 0;
  const states = [];
  const settings = { narxTurlari: ['RETAIL', 'WHOLESALE'], yuklash: noop };
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
    useRef(initial) { return hooks.useState(() => ({ current: initial }))[0]; },
    useMemo: fn => fn(), useCallback: fn => fn, useEffect: noop,
  };
  const calls = [];
  const mocks = {
    react: hooks, 'react-dom': { createPortal: node => node },
    'react-i18next': { useTranslation: () => ({ t: key => key }) },
    '@/lib/qoralamaTahriri': require('../src/lib/qoralamaTahriri.ts'),
    '@/lib/savdoNarxlari': require('../src/lib/savdoNarxlari.ts'),
    '@/lib/valyuta': { useValyutaStore: selector => selector({ kurs: 12000, kursBor: true, rejimYoniq: true }) },
    '@/store/savdoSozlamalariStore': { useSavdoSozlamalariStore: selector => selector(settings) },
    '@/store/savdoStore': { useSavdoStore: { getState: () => ({ qoldiqlarniYuklash: noop }) } },
    './savdoYordamchilari': { pulniFormatlash: String, sotuvValyutasi: () => 'UZS', qatorValyutasi: () => 'UZS', sotuvSummasi: () => 100000, sotuvValyutasigaOgirish: value => value },
  };
  const source = readFileSync(new URL('../src/Pages/Savdo/QoralamaTovarlarTahriri.tsx', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } });
  const exports = {};
  runInNewContext(outputText, { exports, require: name => mocks[name] ?? (name === 'react/jsx-runtime' ? require(name) : new Proxy({}, { get: (_, key) => key === 'default' ? name : noop })) });
  const props = {
    sotuv: { id: 'draft', status: 'DRAFT', warehouseId: 'w', currency: 'UZS', items: [item('a'), item('b')] },
    qoldiqlar: [stock('a'), stock('b')], amalBajarilmoqda: false, footerContainer: {},
    umumiyTahrir: { malumot: { note: 'kept' }, ozgarishlarSoni: 0, warehouseId: 'w', currency: 'UZS', xatoBor: false, onBekor: noop, onSaqlandi: noop },
    onYangilash: async (...args) => { calls.push(args); return true; },
  };
  return { calls, render() { cursor = 0; return exports.default(props); } };
}
function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== 'object') return [];
  return [node, ...elements(node.props?.children)];
}
const controls = tree => elements(tree).filter(node => node.type === './NarxTuriTanlovi');
const save = tree => elements(tree).find(node => node.type === 'button' && [node.props.children].flat().includes('qoralamaTahrir.saqlash'));

test('draft editor exposes a bulk selector and saves selected price types in the real update handler', async () => {
  const edit = editor();
  let tree = edit.render();
  const bulk = controls(tree).find(node => !node.props.kichik);
  assert.ok(bulk, 'draft editing must include the price type control');
  assert.equal(save(tree).props.disabled, true, 'opening a draft does not change prices');
  assert.equal(bulk.props.holat('COST').ruxsat, false);
  bulk.props.onChange('WHOLESALE');
  tree = edit.render();
  assert.equal(save(tree).props.disabled, false);
  save(tree).props.onClick();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(edit.calls[0][0], 'draft');
  assert.equal(edit.calls[0][1].note, 'kept');
  for (const row of edit.calls[0][1].items) { assert.equal(row.priceType, 'WHOLESALE'); assert.equal(row.price, 22000); }
});

test('individual price override affects only its own row after a bulk selection', async () => {
  const edit = editor();
  controls(edit.render()).find(node => !node.props.kichik).props.onChange('WHOLESALE');
  const rows = controls(edit.render()).filter(node => node.props.kichik);
  assert.equal(rows.length, 2);
  rows[0].props.onChange('RETAIL');
  save(edit.render()).props.onClick();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(edit.calls[0][1].items[0].priceType, 'RETAIL');
  assert.equal(edit.calls[0][1].items[0].price, 25000);
  assert.equal(edit.calls[0][1].items[1].priceType, 'WHOLESALE');
});
