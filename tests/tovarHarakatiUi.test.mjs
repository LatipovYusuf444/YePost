import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as model from '../src/Pages/HisobotUchot/tovarHarakatiModeli.ts';
import * as inventory from '../src/lib/inventarizatsiyaKorinish.ts';
import { hujjatQatoriTanlangan } from '../src/lib/hujjatQatoriTanlovi.ts';

const require = createRequire(import.meta.url);
const nodes = value => Array.isArray(value) ? value.flatMap(nodes) : !value || typeof value !== 'object' ? [] : [value, ...nodes(value.props?.children)];
const text = value => Array.isArray(value) ? value.map(text).join(' ') : value?.props ? text(value.props.children) : String(value ?? '');
const row = extra => ({ id: 'movement-row', type: 'SALE', refId: 'ac92f8a3-346d-4f78-8b74-f3a3bbb4f4a2', hujjatRaqam: 'SOT-000251', productId: 'p1', xarakteristikaId: 'v1', ...extra });

function mount(file, initialProps, deps = {}) {
  let cursor = 0, props = initialProps;
  const slots = [], effects = [];
  const hooks = {
    createElement: require('react').createElement,
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useEffect(fn, dependencies) { const i = cursor++; if (!slots[i] || dependencies.some((d, n) => !Object.is(d, slots[i].deps[n]))) { slots[i]?.cleanup?.(); slots[i] = { deps: dependencies }; effects.push(() => { slots[i].cleanup = fn(); }); } },
    useMemo: fn => fn(), useCallback: fn => fn,
  };
  const window = { addEventListener() {}, removeEventListener() {} };
  const context = { exports: {}, window, require(name) {
    if (name === 'react') return hooks;
    if (name === 'react/jsx-runtime') return require(name);
    if (name in deps) return deps[name];
    if (name === './tovarHarakatiModeli') return model;
    if (name === '@/lib/inventarizatsiyaKorinish') return inventory;
    if (name === '@/hooks/useHisobotQatori') return { useHisobotQatori: selection => item => hujjatQatoriTanlangan(selection, item) ? { 'data-report-highlight': 'true' } : {} };
    if (name === 'react-i18next') return { useTranslation: () => ({ t: key => key }) };
    return new Proxy({ __esModule: true, default: name.split('/').at(-1) }, { get: (target, key) => target[key] ?? String(key) });
  } };
  const source = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(source, context);
  const render = nextProps => { if (nextProps) props = nextProps; cursor = 0; return context.exports.default(props); };
  return { render, async settle() { render(); effects.splice(0).forEach(fn => fn()); await new Promise(resolve => setImmediate(resolve)); return render(); } };
}

test('movement document type selects the native modal by refId, never docNumber or movement row id', () => {
  const expected = { SALE: 'HisobotSotuvKorish', STOCK_TAKE: 'InventoryHujjatModal', WRITE_OFF: 'ChiqimTafsilotModal', PURCHASE: 'KirimTafsilotModal', TRANSFER_IN: 'KochirishKorishModal', RETURN: 'QaytarishTafsilotlariModal' };
  for (const [type, component] of Object.entries(expected)) {
    const movement = row({ type });
    const viewer = mount('../src/Pages/HisobotUchot/HujjatKorish.tsx', { harakat: movement, onYopish() {} });
    const tree = viewer.render();
    assert.equal(tree.type, component);
    if (type === 'SALE') assert.equal(tree.props.harakat.refId, movement.refId);
    else if (type === 'RETURN') assert.equal(tree.props.qaytarishId, movement.refId);
    else {
      assert.equal(tree.props.id, movement.refId);
      assert.equal(tree.props.ajratilganQator.modificationId, 'v1');
    }
  }
});

test('missing document ID and unsupported types display an error instead of fabricated document details', () => {
  for (const movement of [row({ refId: '' }), row({ type: 'UNSUPPORTED' })]) {
    const viewer = mount('../src/Pages/HisobotUchot/HujjatKorish.tsx', { harakat: movement, onYopish() {} });
    const tree = viewer.render();
    assert.equal(tree.type, 'AppModal');
    assert.ok(nodes(tree).some(node => node.props.role === 'alert'));
    assert.ok(!text(tree).includes('Tizim'));
    assert.ok(!text(tree).includes('270000'));
  }
});

test('SOT-000251 loads its actual six-item sale and passes customer, responsible person and real totals', async () => {
  const calls = [];
  const sale = { id: row().refId, status: 'CONFIRMED', currency: 'UZS', docNumber: 'SOT-000251', customer: { fullName: 'Abduqodir Parkent' }, responsible: { fullName: 'AsiaScotch' }, warehouse: { name: 'Tepa dokon' }, totalAmount: '920000', paidAmount: '920000', debtAmount: '0', items: Array.from({ length: 6 }, (_, i) => ({ id: `line-${i}`, modificationId: `v${i}` })) };
  const viewer = mount('../src/Pages/HisobotUchot/HisobotSotuvKorish.tsx', { harakat: row(), onYopish() {} }, {
    '@/api/savdoApi': { async sotuvTafsilotiniFondaOlish(id) { calls.push(id); return sale; } },
    '@/store/savdoStore': { useSavdoStore: () => ({ qoldiqlar: [], xodimlar: [], amalBajarilmoqda: false }) },
  });
  const tree = await viewer.settle();
  const modal = nodes(tree).find(node => node.type === 'SotuvTafsilotlariModal');
  assert.deepEqual(calls, [sale.id]);
  assert.equal(modal.props.sotuv, sale);
  assert.equal(modal.props.sotuv.items.length, 6);
  assert.equal(modal.props.sotuv.totalAmount, '920000');
  assert.equal(modal.props.sotuv.customer.fullName, 'Abduqodir Parkent');
  assert.equal(modal.props.sotuv.responsible.fullName, 'AsiaScotch');
  assert.equal(modal.props.boshlangichTab, 'Tovarlar');
  assert.equal(modal.props.ajratilganQator.modificationId, 'v1');
  assert.match(modal.props.hisobotManbasi.href, /sotuv=ac92f8a3/);
});

test('403/404 on a sale detail request has retry/close controls and never opens a synthetic sale', async () => {
  const viewer = mount('../src/Pages/HisobotUchot/HisobotSotuvKorish.tsx', { harakat: row(), onYopish() {} }, {
    '@/api/savdoApi': { async sotuvTafsilotiniFondaOlish() { throw new Error('Ruxsat yoq'); } },
    '@/api/sozlamalarApi': { getApiErrorMessage: error => error.message },
    '@/store/savdoStore': { useSavdoStore: () => ({}) },
  });
  const tree = await viewer.settle();
  assert.ok(text(tree).includes('Ruxsat yoq'));
  assert.ok(text(tree).includes('Qayta urinish'));
  assert.ok(!nodes(tree).some(node => node.type === 'SotuvTafsilotlariModal'));
});

test('inventory view shows all 108 counted products and highlights only the clicked variant', () => {
  const document = { id: 'inv-1', docNumber: 'INV-000046', status: 'CONFIRMED', type: 'PARTIAL', date: '2026-11-01', items: Array.from({ length: 108 }, (_, i) => ({ id: `item-${i}`, modificationId: `v${i}`, systemQuantity: 0, actualQuantity: i === 1 ? 32 : 10, modification: { name: `Product ${i}` } })) };
  const viewer = mount('../src/Pages/Ombor/InventarizatsiyaKorinish.tsx', { hujjat: document, modifikatsiyalar: [], omborNomi: 'Tepa dokon', masulNomi: 'AsiaScotch', ajratilganQator: { modificationId: 'v1' } }, {
    './omborYordamchilari': { modificationNomi: item => item?.name, sana: String },
  });
  const tree = viewer.render();
  assert.equal(nodes(tree).filter(node => node.type === 'tr').length, 109);
  const highlighted = nodes(tree).filter(node => node.props['data-report-highlight'] === 'true');
  assert.equal(highlighted.length, 1);
  assert.ok(text(highlighted[0]).includes('Product 1'));
  assert.ok(text(highlighted[0]).includes('32'));
  assert.ok(nodes(tree).some(node => node.props.qiymat === 'AsiaScotch'));
  assert.ok(!text(tree).includes('Umumiy summa'));
});
