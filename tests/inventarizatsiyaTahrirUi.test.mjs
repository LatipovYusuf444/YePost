import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const noop = () => {};
const nodes = node => Array.isArray(node) ? node.flatMap(nodes) : !node || typeof node !== 'object' ? [] : [node, ...nodes(node.props?.children)];
const document = { id: 'inv', status: 'CONFIRMED', docNumber: 'INV-1', warehouseId: 'w', responsibleId: 'original-user', updatedAt: '2026-10-24T07:10:00.000Z', date: '2026-10-23', note: 'original', type: 'FULL', items: [{ modificationId: 'a', actualQuantity: 100, systemQuantity: 0, modification: { id: 'a', name: 'Product' } }] };
function editor(options = {}) {
  const states = [], calls = [], stockCalls = [];
  let cursor = 0;
  const store = { inventarizatsiyalar: [document], omborlar: [{ id: 'w', name: 'Warehouse' }], xodimlar: [], qoldiqlar: [{ modificationId: 'a', warehouseId: 'w', quantity: 100, availableQuantity: 100 }], modifikatsiyalar: [],
    xatolikniTozalash: noop, inventarizatsiyaTahrirlash: async (id, payload) => { calls.push({ id, payload }); return options.fail ? null : { ...document, items: payload.items, updatedAt: 'new-version' }; }, qoldiqlarniYuklash: noop };
  const hooks = { useState(initial) { const i = cursor++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; }, useRef: value => hooks.useState(() => ({ current: value }))[0], useEffect: noop, useMemo: fn => fn(), useCallback: fn => fn() };
  const mocks = {
    react: hooks, 'react-dom': { createPortal: node => node }, 'react-i18next': { useTranslation: () => ({ t: key => key }) },
    '@/store/omborStore': { useOmborStore: () => store }, '@/store/authProfileStore': { useAuthProfileStore: selector => selector({ profil: { id: 'admin', role: 'ADMIN' } }) },
    '@/store/savdoStore': { useSavdoStore: { getState: () => ({ qoldiqlarniYuklash: async id => stockCalls.push(id) }) } },
    '@/lib/hujjatSanasi': require('../src/lib/hujjatSanasi.ts'), '@/lib/inventarizatsiyaTahriri': require('../src/lib/inventarizatsiyaTahriri.ts'),
    './omborYordamchilari': { holat: String, hujjatRaqami: doc => doc.docNumber, sana: String, mahsulotQidiruvi: () => true, modificationNomi: mod => mod?.name || 'Product', qoldiqMiqdori: row => Number(row.availableQuantity ?? row.quantity ?? 0) },
  };
  const source = readFileSync(new URL('../src/Pages/Ombor/Inventarizatsiya.tsx', import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  runInNewContext(js, { exports, require: name => mocks[name] ?? (name === 'react/jsx-runtime' ? require(name) : new Proxy({}, { get: (_, key) => key === 'default' ? name : noop })), window: { dispatchEvent: noop }, CustomEvent: class {} });
  const result = { calls, stockCalls, store, render() { cursor = 0; return exports.default(); } };
  nodes(result.render()).find(node => node.type === 'tr' && node.key === 'inv').props.onClick();
  return result;
}
const find = (edit, type, predicate = () => true) => nodes(edit.render()).find(node => node.type === type && predicate(node.props));

test('confirmed edit opens the creation form prefilled, with warehouse and date locked', async () => {
  const edit = editor();
  const details = find(edit, './InventoryHujjatModal');
  assert.equal(typeof details.props.onTasdiqlanganTahrir, 'function');
  await details.props.onTasdiqlanganTahrir(document);
  assert.equal(find(edit, '@/Components/ui/AppSelect', props => props.value === 'w').props.disabled, true);
  assert.equal(find(edit, '@/Components/common/HujjatSanasi', props => props.value === '2026-10-23').props.disabled, true);
  assert.equal(find(edit, 'input', props => props['data-inventory-qty'] !== undefined).props.value, '100');
});

test('saving a lower count invokes revise once, preserves the snapshot, and refreshes sale stock', async () => {
  const edit = editor();
  const details = find(edit, './InventoryHujjatModal');
  assert.equal(typeof details.props.onTasdiqlanganTahrir, 'function');
  await details.props.onTasdiqlanganTahrir(document);
  find(edit, 'input', props => props['data-inventory-qty'] !== undefined).props.onChange({ target: { value: '90' } });
  find(edit, 'button', props => Array.isArray(props.children) && props.children.includes('inventarizatsiya.editModal.save')).props.onClick();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(edit.calls.length, 1);
  const payload = edit.calls[0].payload;
  assert.equal(payload.items[0].actualQuantity, 90);
  assert.equal(payload.expectedUpdatedAt, document.updatedAt);
  assert.equal(payload.responsibleId, 'original-user');
  assert.equal(payload.type, 'FULL');
  assert.equal('warehouseId' in payload, false);
  assert.equal('date' in payload, false);
  assert.deepEqual(edit.stockCalls, ['w']);
});

test('cancelling edits returns to details and sends no mutation', async () => {
  const edit = editor();
  await find(edit, './InventoryHujjatModal').props.onTasdiqlanganTahrir(document);
  find(edit, 'input', props => props['data-inventory-qty'] !== undefined).props.onChange({ target: { value: '45' } });
  find(edit, 'button', props => props.children === 'inventarizatsiya.createModal.cancel').props.onClick();
  assert.equal(edit.calls.length, 0);
  assert.equal(find(edit, './InventoryHujjatModal').props.id, 'inv');
});

test('double save sends only one revision and a failed revision preserves edited quantities and original version', async () => {
  const edit = editor({ fail: true });
  await find(edit, './InventoryHujjatModal').props.onTasdiqlanganTahrir(document);
  find(edit, 'input', props => props['data-inventory-qty'] !== undefined).props.onChange({ target: { value: '45' } });
  const save = find(edit, 'button', props => Array.isArray(props.children) && props.children.includes('inventarizatsiya.editModal.save'));
  save.props.onClick(); save.props.onClick();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(edit.calls.length, 1);
  assert.equal(edit.calls[0].payload.expectedUpdatedAt, document.updatedAt);
  assert.equal(find(edit, 'input', props => props['data-inventory-qty'] !== undefined).props.value, '45');
  assert.equal(find(edit, './InventoryHujjatModal'), undefined);
});
