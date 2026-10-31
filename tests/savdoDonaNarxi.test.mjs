import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const noop = () => {};
const nodes = value => Array.isArray(value) ? value.flatMap(nodes) : !value || typeof value !== 'object' ? [] : [value, ...nodes(value.props?.children)];
const base = { unitId: 'd', nomi: 'Dona', qisqa: 'dona', koeff: 1, asosiy: true, sotuv: true };
const carton = { unitId: 'k', nomi: 'Korobka', qisqa: 'k', koeff: 60, asosiy: false, sotuv: true, chakana: 12.6, ulgurji: 12, kasr: false };

function editor({ currency = 'USD', sourceCurrency = currency, units = [base, carton], basePrice = 12.6 } = {}) {
  const states = [];
  let cursor = 0;
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
    useRef(initial) { return hooks.useState(() => ({ current: initial }))[0]; },
    useMemo: fn => fn(), useCallback: fn => fn, useEffect: noop,
  };
  const mocks = {
    react: hooks,
    'react-i18next': { useTranslation: () => ({ t: key => key }) },
    '@/lib/utils': { cn: (...args) => args.join(' ') },
    '@/lib/hujjatSanasi': { bugungiToshkentKuni: () => '2026-10-31', yangiHujjatSanasi: () => ({}) },
    '@/lib/savdoNarxlari': require('../src/lib/savdoNarxlari.ts'),
    '@/lib/kopBirlik': require('../src/lib/kopBirlik.ts'),
    '@/lib/valyuta': { useValyutaStore: selector => selector({ kurs: 12000, kursBor: true, rejimYoniq: true }) },
    '@/store/authProfileStore': { useAuthProfileStore: selector => selector({ profil: { id: 'cashier' } }) },
    '@/store/inventorySettingsStore': { useInventorySettingsStore: selector => selector({ canSellNegative: false }) },
    '@/store/savdoSozlamalariStore': { useSavdoSozlamalariStore: selector => selector({ narxTurlari: ['RETAIL', 'WHOLESALE'], yuklash: noop }) },
    './savdoYordamchilari': { pulniFormatlash: String },
  };
  const source = readFileSync(new URL('../src/Pages/Savdo/YangiSotuvModal.tsx', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const context = { exports: {}, window: { requestAnimationFrame: noop }, require: name => mocks[name] ?? (name === 'react/jsx-runtime' ? require(name) : new Proxy({ __esModule: true, default: name }, { get: (target, key) => target[key] ?? noop })) };
  runInNewContext(compiled, context);
  const stock = { modificationId: 'p', warehouseId: 'w', quantity: 1200, sellingPrice: basePrice, birliklar: units, modification: { price: { retailPrice: basePrice, wholesalePrice: 12 } }, ...(sourceCurrency === 'USD' ? { valyuta: { currency: 'USD', asl: basePrice, ulgurjiCurrency: 'USD', ulgurjiAsl: 12, kurs: 12000 } } : {}) };
  const saved = [];
  const props = { omborlar: [{ id: 'w', name: 'Warehouse' }], mijozlar: [], mijozKompaniyalari: [], xodimlar: [], qoldiqlar: [stock], onOmborTanlash: noop, onYopish: noop, onSaqlash: async data => { saved.push(data); return false; } };
  const render = () => { cursor = 0; return context.exports.default(props); };
  const find = predicate => nodes(render()).find(predicate);
  find(n => n.type === './SavdoSelect' && n.props.placeholder === 'placeholders.selectProduct').props.onChange('p::w');
  if (currency === 'USD') find(n => n.type === './SavdoSelect' && n.props.options?.some(o => o.value === 'USD')).props.onChange('USD');
  const quantity = () => find(n => n.props['data-sotuv-miqdor'] === 0);
  const price = () => find(n => n.props['data-sotuv-narx'] === 0);
  const unit = () => find(n => n.type === 'select' && n.props['aria-label'] === 'labels.unit');
  const catalog = () => find(n => n.type === 'input' && n.props['aria-label'] === 'table.catalogPrice / dona');
  const submit = async () => { await find(n => n.type === 'form').props.onSubmit({ preventDefault: noop }); return saved.at(-1)?.items[0]; };
  return { find, render, quantity, price, unit, catalog, submit };
}

test('piece price changes a 20-carton sale to 1200 × 12.6; backend keeps quantity 20 and carton price', async () => {
  const e = editor();
  e.quantity().props.onChange({ target: { value: '20' } });
  e.unit().props.onChange({ target: { value: 'k' } });
  assert.equal(e.catalog().props.value, 12.6);
  assert.equal(e.price().props.value, 12.6);
  let item = await e.submit();
  assert.equal(item.quantity * item.price - item.discount, 15120, 'catalog price is per piece even when the quantity is in cartons');
  e.price().props.onChange('12.6');
  e.price().props.onBlur();
  assert.equal(e.quantity().props.value, '20');
  assert.equal(e.unit().props.value, 'k');
  assert.equal(e.price().props.value, 12.6);
  item = await e.submit();
  assert.deepEqual(JSON.parse(JSON.stringify(item)), { modificationId: 'p', quantity: 20, priceType: 'RETAIL', unitId: 'k', price: 756, discount: 0, currency: 'USD' });
  assert.equal(item.quantity * item.price - item.discount, 15120);
});

test('per-piece discount and percent toggle keep totals and quantity consistent', async () => {
  const e = editor({ currency: 'UZS' });
  e.quantity().props.onChange({ target: { value: '20' } });
  e.unit().props.onChange({ target: { value: 'k' } });
  e.price().props.onChange('10.08');
  e.price().props.onBlur();
  let item = await e.submit();
  assert.equal(item.discount, 3024);
  assert.equal(item.quantity * item.price - item.discount, 12096);
  e.find(n => n.type === 'button' && n.props.children === '%').props.onClick();
  item = await e.submit();
  assert.equal(item.discount, 3024);
  assert.equal(e.price().props.value, 10.08);
  assert.equal(e.quantity().props.value, '20');
});

test('USD sale of a UZS product uses the base catalog price and preserves the existing payload currency', async () => {
  const e = editor({ currency: 'USD', sourceCurrency: 'UZS', basePrice: 12600 });
  e.quantity().props.onChange({ target: { value: '20' } });
  e.unit().props.onChange({ target: { value: 'k' } });
  assert.equal(e.catalog().props.value, 1.05);
  let item = await e.submit();
  assert.equal(item.price, 756000);
  assert.equal(item.currency, 'UZS');
  e.price().props.onChange('2');
  item = await e.submit();
  assert.equal(item.price, 1440000);
  assert.equal(item.quantity, 20);
  assert.equal(item.unitId, 'k');
  assert.equal(item.quantity * item.price / 12000, 2400);
});

test('base-unit sales keep their original price and omit unitId', async () => {
  const e = editor({ currency: 'UZS', units: [base] });
  e.quantity().props.onChange({ target: { value: '20' } });
  assert.equal(e.price().props.value, 12.6);
  e.price().props.onChange('15');
  e.price().props.onBlur();
  const item = await e.submit();
  assert.equal(item.quantity, 20);
  assert.equal(item.price, 15);
  assert.equal('unitId' in item, false);
});
