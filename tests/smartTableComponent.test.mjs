import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { JSDOM } from 'jsdom';
import ts from 'typescript';
import * as preferences from '../src/Components/common/smart-table/preferences.ts';
import { sotuvMasulMalumoti } from '../src/lib/sotuvMasulMalumoti.ts';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' });
for (const key of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent', 'localStorage']) Object.defineProperty(globalThis, key, { configurable: true, value: key === 'window' ? dom.window : dom.window[key] });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.requestAnimationFrame = fn => setTimeout(fn, 0);
globalThis.cancelAnimationFrame = clearTimeout;
const require = createRequire(import.meta.url);
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { act, createElement: h, useEffect } = React;
let auth = { accessToken: null, username: null };

function compile(file, dependencies = {}) {
  const source = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = { exports: {}, window, document, localStorage, requestAnimationFrame, cancelAnimationFrame, console, require(name) {
    if (name in dependencies) return dependencies[name];
    if (name.endsWith('.css')) return {};
    return require(name);
  } };
  runInNewContext(source, context);
  return context.exports;
}
const model = compile('../src/Components/common/smart-table/model.tsx');
const SmartTable = compile('../src/Components/common/smart-table/SmartTable.tsx', {
  './model': model, './preferences': preferences,
  'react-i18next': { useTranslation: () => ({ i18n: { language: 'uz' } }) },
  '@/store/authStore': { useAuthStore: selector => selector(auth) },
  '@/lib/sessiyaIzolyatsiyasi': { sessiyaEgasi: (_, username) => `workspace|${username}` },
  // The library's popover is tested by Radix. Keep its children mounted for deterministic behavior tests.
  '@/Components/ui/popover': { Popover: ({ children }) => children, PopoverTrigger: ({ children }) => children, PopoverContent: ({ children, className, 'aria-labelledby': labelledBy }) => h('div', { role: 'dialog', className, 'aria-labelledby': labelledBy }, children) },
}).default;

let root;
const container = document.getElementById('root');
const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
const button = label => [...container.querySelectorAll('button')].find(node => node.textContent === label);
const option = label => [...container.querySelectorAll('.smart-column-option')].find(node => node.querySelector('label > span')?.textContent === label);
const visibleHeaders = () => [...container.querySelectorAll('thead th')].filter(node => !node.hidden).map(node => node.dataset.smartId);
const click = node => act(async () => { node.click(); });

function fixture({ id = 'mounted', onAction = () => {}, onMount = () => {}, count = 1 } = {}) {
  function Editor() {
    useEffect(() => { onMount(); }, []);
    return h('input', { 'aria-label': 'Draft value', defaultValue: 'draft' });
  }
  return h(SmartTable, { tableId: id }, h('table', {},
    h('thead', {}, h('tr', {}, h('th', { 'data-column-id': 'a' }, 'A'), h('th', { 'data-column-id': 'b' }, 'B'), h('th', { 'data-column-id': 'actions' }, 'Amallar'))),
    h('tbody', {}, Array.from({ length: count }, (_, index) => h('tr', { key: `stable-${index}` }, h('td', {}, h(Editor)), h('td', {}, `B-${index}`), h('td', {}, h('button', { onClick: onAction }, `Action-${index}`))))),
  ));
}

test('mounted inputs and unsaved values survive resize, density, reorder, hide/show and reset', async () => {
  let mounts = 0, actions = 0;
  root = createRoot(container);
  await act(async () => root.render(fixture({ onMount: () => mounts++, onAction: () => actions++ })));
  await settle();
  const input = container.querySelector('input[aria-label="Draft value"]');
  input.value = 'unsaved'; input.focus(); input.setSelectionRange(2, 4);
  const resize = container.querySelector('[role=separator]');
  await act(async () => resize.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
  assert.strictEqual(document.activeElement, input, 'resize must preserve input focus');
  assert.strictEqual(container.querySelector('input[aria-label="Draft value"]'), input);
  await click(button('Ixcham'));
  assert.strictEqual(container.querySelector('input[aria-label="Draft value"]'), input);
  assert.equal(input.value, 'unsaved');
  await click(option('A').querySelector('.smart-column-toggle'));
  await click(option('A').querySelector('button[aria-label="O‘ngga: A"]'));
  assert.deepEqual(visibleHeaders(), ['b', 'a', 'actions']);
  assert.strictEqual(container.querySelector('input[aria-label="Draft value"]'), input);
  assert.strictEqual(document.activeElement, input, 'moving cells must retain the active editor');
  await click(option('A').querySelector('input[type=checkbox]'));
  assert.equal(input.closest('td').hidden, true);
  await click(option('A').querySelector('input[type=checkbox]'));
  assert.equal(input.closest('td').hidden, false);
  await click(button('Standart holatga qaytarish'));
  assert.deepEqual(visibleHeaders(), ['a', 'b', 'actions']);
  assert.equal(input.value, 'unsaved');
  assert.equal(mounts, 1, 'editable renderer must not remount');
  await click(button('Action-0'));
  assert.equal(actions, 1);
  await act(async () => root.unmount());
});

test('mounted resize cancellation restores CSS widths and unmount removes drag listeners', async () => {
  root = createRoot(container);
  await act(async () => root.render(fixture({ id: 'resize' })));
  const separator = container.querySelector('[role=separator]');
  await act(async () => separator.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })));
  const table = container.querySelector('table');
  const width = table.style.getPropertyValue('--smart-width-0');
  const add = window.addEventListener.bind(window), remove = window.removeEventListener.bind(window), listeners = new Set();
  window.addEventListener = (type, callback, options) => { if (type === 'pointermove') listeners.add(callback); return add(type, callback, options); };
  window.removeEventListener = (type, callback, options) => { if (type === 'pointermove') listeners.delete(callback); return remove(type, callback, options); };
  try {
    await act(async () => separator.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 100 })));
    await act(async () => { window.dispatchEvent(new MouseEvent('pointermove', { clientX: 200 })); await new Promise(resolve => setTimeout(resolve, 10)); });
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    assert.equal(table.dataset.resizing, undefined);
    assert.equal(table.style.getPropertyValue('--smart-width-0'), width);
    assert.equal(listeners.size, 0);
    await act(async () => separator.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 100 })));
    assert.equal(listeners.size, 1);
    await act(async () => root.unmount());
    assert.equal(listeners.size, 0);
  } finally { window.addEventListener = add; window.removeEventListener = remove; }
});

test('mounted refresh loads preferences only for the same account and table', async () => {
  localStorage.clear(); auth = { accessToken: 'test-only', username: 'account-A' };
  root = createRoot(container);
  await act(async () => root.render(fixture({ id: 'persist' })));
  await settle();
  await click(button('Ixcham'));
  const key = await preferences.preferenceKey('workspace|account-A', 'persist');
  assert.equal(JSON.parse(localStorage.getItem(key)).density, 'compact');
  await act(async () => root.unmount());
  root = createRoot(container);
  await act(async () => root.render(fixture({ id: 'persist' })));
  await settle();
  assert.equal(container.querySelector('[data-density]').dataset.density, 'compact');
  auth = { accessToken: 'test-only', username: 'account-B' };
  await act(async () => root.render(fixture({ id: 'persist' })));
  await settle();
  assert.equal(container.querySelector('[data-density]').dataset.density, 'standard');
  await act(async () => root.render(fixture({ id: 'another-table' })));
  await settle();
  assert.equal(container.querySelector('[data-density]').dataset.density, 'standard');
  await act(async () => root.unmount());
  auth = { accessToken: null, username: null };
});

test('shared report reset preserves pagination, row callbacks, delete permissions and original values', async () => {
  const Report = compile('../src/Pages/HisobotUchot/KengaytiriladiganJadval.tsx', {
    '@/Components/common/smart-table/SmartTable': { __esModule: true, default: SmartTable },
    '@/Components/common/TablePagination': { __esModule: true, default: ({ page, onPageChange }) => h('div', {}, h('output', { 'aria-label': 'Page' }, page), h('button', { onClick: () => onPageChange(2) }, 'Next page')) },
  }).default;
  const records = Object.freeze(Array.from({ length: 12 }, (_, index) => Object.freeze({ id: `record-${index}`, amount: index + 1 })));
  const rowsClicked = [], deleted = [];
  root = createRoot(container);
  await act(async () => root.render(h(Report, {
    tableId: 'report', qatorlar: records,
    ustunlar: [{ id: 'amount', nom: 'Amount', katak: row => row.amount, jami: () => 78 }],
    jamiBor: true, onQatorBosildi: row => rowsClicked.push(row), onQatorOchirish: row => deleted.push(row),
    qatorOchirishHolati: row => ({ mumkin: row.id === 'record-11', sarlavha: 'Existing permission' }),
  })));
  await click(button('Next page'));
  assert.equal(container.querySelector('output[aria-label=Page]').textContent, '2');
  assert.equal(container.querySelectorAll('tbody tr').length, 2);
  const rows = [...container.querySelectorAll('tbody tr')];
  assert.equal(rows[0].querySelector('td').textContent, '11');
  assert.equal(rows[0].querySelector('button').disabled, true);
  assert.equal(rows[1].querySelector('button').disabled, false);
  await click(button('Ixcham'));
  await click(button('Standart holatga qaytarish'));
  assert.equal(container.querySelector('output[aria-label=Page]').textContent, '2');
  assert.equal(container.querySelectorAll('tbody tr').length, 2);
  await click(rows[0]);
  await click(rows[1].querySelector('button'));
  assert.deepEqual(rowsClicked, [records[10]]);
  assert.deepEqual(deleted, [records[11]]);
  assert.equal(container.querySelector('tfoot td').textContent, '78');
  assert.equal(records[10].amount, 11);
  await act(async () => root.unmount());
});

test('stored preferences survive permission-dependent headers arriving after the initial render', async () => {
  auth = { accessToken: 'test-only', username: 'schema-account' };
  const key = await preferences.preferenceKey('workspace|schema-account', 'dynamic-schema');
  localStorage.setItem(key, JSON.stringify({ version: 1, order: ['b', 'a', 'actions'], hidden: ['b'], widths: { a: 210, b: 240 }, pins: {}, density: 'compact' }));
  const render = includeB => h(SmartTable, { tableId: 'dynamic-schema' }, h('table', {},
    h('thead', {}, h('tr', {}, h('th', { 'data-column-id': 'a' }, 'A'), includeB && h('th', { 'data-column-id': 'b' }, 'B'), h('th', { 'data-column-id': 'actions' }, 'Amallar'))),
    h('tbody', {}, h('tr', {}, h('td', {}, 'A'), includeB && h('td', {}, 'B'), h('td', {}, 'Action'))),
  ));
  root = createRoot(container);
  await act(async () => root.render(render(false)));
  await settle();
  await act(async () => root.render(render(true)));
  assert.equal(container.querySelector('th[data-smart-id=b]').hidden, true);
  assert.equal(container.querySelector('table').style.getPropertyValue('--smart-width-0'), '210px');
  assert.equal(container.querySelector('[data-density]').dataset.density, 'compact');
  await act(async () => root.unmount());
  auth = { accessToken: null, username: null };
});

test('narrow saved widths keep values on one line and let the table scroll without clipping menus or editors', async () => {
  const styles = document.createElement('style');
  styles.textContent = '.whitespace-nowrap{white-space:nowrap}.inline-block{display:inline-block}.inline-flex{display:inline-flex}.flex{display:flex}.truncate{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}'
    + readFileSync(new URL('../src/Components/common/smart-table/smart-table.css', import.meta.url), 'utf8');
  document.head.appendChild(styles);
  const longName = 'DANMI SERI STROYITLNI OYOQ KIYDIRILISH UCHUN 500MM';
  let actions = 0;
  root = createRoot(container);
  try {
    await act(async () => root.render(h(SmartTable, { tableId: 'overflow-regression' }, h('table', { className: 'whitespace-nowrap' },
      h('thead', {}, h('tr', {}, h('th', { 'data-column-id': 'name' }, 'Mahsulot'), h('th', { 'data-column-id': 'code' }, 'Artikul'), h('th', { 'data-column-id': 'actions' }, 'Amallar'))),
      h('tbody', {}, h('tr', {},
        h('td', {}, h('span', { className: 'inline-block whitespace-nowrap', 'data-test': 'product', style: { padding: '8px 12px' } }, longName)),
        h('td', {}, 'CODE-WITHOUT-BREAKS-12345678901234567890', h('input', { 'aria-label': 'Overflow editor', defaultValue: 'keep me' })),
        h('td', {}, h('div', { className: 'flex', 'data-test': 'actions' }, h('button', { onClick: () => actions++ }, 'Action')),
          h('div', { role: 'menu', style: { position: 'absolute', width: 320 } }, h('button', { role: 'menuitem', onClick: () => actions++ }, 'Menu action'))))),
      h('tfoot', {}, h('tr', {}, h('td', {}, h('span', { className: 'inline-flex whitespace-nowrap', 'data-test': 'total' }, '12345678901234567890')), h('td', {}, 'Total'), h('td', {}))),
    ))));
    const product = container.querySelector('[data-test=product]');
    const editor = container.querySelector('input[aria-label="Overflow editor"]');
    editor.value = 'unsaved input';
    await click(option('Mahsulot').querySelector('.smart-column-toggle'));
    await click(option('Mahsulot').querySelector('button[aria-label="O‘ngga: Mahsulot"]'));
    const resize = container.querySelector('th[data-smart-id=name] [role=separator]');
    await act(async () => resize.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true })));
    for (const node of [product, container.querySelector('[data-test=total]')]) {
      const computed = window.getComputedStyle(node);
      assert.equal(computed.whiteSpace, 'nowrap', 'names, statuses and amounts must never split across lines');
      assert.equal(computed.overflowWrap, 'normal');
      assert.equal(computed.minInlineSize, 'max-content', 'content must retain its intrinsic single-line width');
      assert.equal(computed.maxInlineSize, 'none');
      assert.equal(computed.boxSizing, 'border-box');
    }
    assert.equal(window.getComputedStyle(product.closest('td')).whiteSpace, 'nowrap');
    assert.equal(window.getComputedStyle(container.querySelector('[data-test=actions]')).flexWrap, 'nowrap');
    const table = container.querySelector('table');
    assert.equal(window.getComputedStyle(table).tableLayout, 'auto');
    assert.equal(window.getComputedStyle(table).width, 'max-content');
    assert.equal(window.getComputedStyle(table).minWidth, '100%');
    assert.equal(window.getComputedStyle(container).overflowX, 'auto', 'overflow belongs to the table container');
    const menu = container.querySelector('[role=menu]');
    assert.equal(window.getComputedStyle(menu).width, '320px');
    assert.equal(window.getComputedStyle(menu).maxInlineSize, 'none', 'floating menu must not be narrowed to its cell');
    assert.notEqual(window.getComputedStyle(product.closest('td')).overflow, 'hidden');
    assert.strictEqual(container.querySelector('input[aria-label="Overflow editor"]'), editor);
    assert.equal(editor.value, 'unsaved input');
    assert.equal(product.textContent, longName);
    await click(button('Action'));
    await click(button('Menu action'));
    assert.equal(actions, 2);
  } finally {
    await act(async () => root.unmount());
    styles.remove();
  }
});

test('compact column menu keeps header/reset outside its scroll area and expands only the selected column', async () => {
  const styles = document.createElement('style');
  styles.textContent = readFileSync(new URL('../src/Components/common/smart-table/smart-table.css', import.meta.url), 'utf8');
  document.head.appendChild(styles);
  root = createRoot(container);
  try {
    await act(async () => root.render(fixture({ id: 'compact-menu' })));
    const menu = container.querySelector('.smart-table-settings');
    const list = menu.querySelector('.smart-column-list');
    const header = menu.querySelector('.smart-settings-header');
    const footer = menu.querySelector('.smart-settings-footer');
    assert.equal(list.contains(header), false);
    assert.equal(list.contains(footer), false);
    assert.equal(window.getComputedStyle(menu).overflow, 'hidden');
    assert.equal(window.getComputedStyle(list).overflowY, 'auto');
    assert.equal(window.getComputedStyle(list).minHeight, '0px');
    assert.equal(window.getComputedStyle(header).flexShrink, '0');
    assert.equal(window.getComputedStyle(footer).flexShrink, '0');
    menu.style.setProperty('--radix-popover-content-available-height', '260px');
    assert.match(window.getComputedStyle(menu).maxHeight, /260px/, 'height constraint must use the available space reported by the popover');
    assert.equal(document.getElementById(menu.getAttribute('aria-labelledby')).textContent, 'Ustunlar');
    assert.equal(menu.querySelectorAll('.smart-column-details:not([hidden])').length, 0);
    const toggleA = option('A').querySelector('.smart-column-toggle');
    await click(toggleA);
    assert.equal(toggleA.getAttribute('aria-expanded'), 'true');
    assert.equal(document.getElementById(toggleA.getAttribute('aria-controls')).hidden, false);
    await click(option('B').querySelector('.smart-column-toggle'));
    assert.equal(option('A').querySelector('.smart-column-details').hidden, true);
    assert.equal(option('B').querySelector('.smart-column-details').hidden, false);
    assert.equal(menu.querySelectorAll('.smart-column-details:not([hidden])').length, 1);
    assert.equal(window.getComputedStyle(option('B').querySelector('.smart-width-option > span')).whiteSpace, 'nowrap');
    await click(option('A').querySelector('input[type=checkbox]'));
    await click(button('Ixcham'));
    await click(menu.querySelector('button[aria-label=Yopish]'));
    assert.equal(menu.querySelectorAll('.smart-column-details:not([hidden])').length, 0);
    assert.deepEqual(visibleHeaders(), ['b', 'actions'], 'closing settings must retain the chosen table view');
    assert.equal(container.querySelector('[data-density]').dataset.density, 'compact');
    await click(footer.querySelector('.smart-reset'));
    assert.deepEqual(visibleHeaders(), ['a', 'b', 'actions']);
  } finally {
    await act(async () => root.unmount());
    styles.remove();
  }
});

test('pinned offsets follow rendered intrinsic widths instead of narrower saved widths', async () => {
  const styles = document.createElement('style');
  styles.textContent = readFileSync(new URL('../src/Components/common/smart-table/smart-table.css', import.meta.url), 'utf8');
  document.head.appendChild(styles);
  const originalRect = HTMLElement.prototype.getBoundingClientRect;
  const originalObserver = window.ResizeObserver;
  const callbacks = new Set();
  const widths = { a: 280, b: 190, actions: 96 };
  HTMLElement.prototype.getBoundingClientRect = function () {
    if (this.matches('thead th[data-smart-id]')) return { x: 0, y: 0, top: 0, left: 0, right: widths[this.dataset.smartId], bottom: 44, height: 44, width: widths[this.dataset.smartId] };
    return originalRect.call(this);
  };
  window.ResizeObserver = class {
    constructor(callback) { this.callback = callback; callbacks.add(callback); }
    observe() {}
    disconnect() { callbacks.delete(this.callback); }
  };
  const pin = async (label, side) => {
    const row = option(label);
    if (row.querySelector('.smart-column-details').hidden) await click(row.querySelector('.smart-column-toggle'));
    const select = row.querySelector('select');
    await act(async () => { select.value = side; select.dispatchEvent(new Event('change', { bubbles: true })); });
  };
  root = createRoot(container);
  try {
    await act(async () => root.render(fixture({ id: 'intrinsic-pins' })));
    await pin('A', 'left');
    await pin('B', 'left');
    const separator = container.querySelector('th[data-smart-id=a] [role=separator]');
    await act(async () => separator.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true })));
    const table = container.querySelector('table');
    assert.equal(table.style.getPropertyValue('--smart-width-0'), '80px');
    assert.equal(window.getComputedStyle(container.querySelector('td[data-smart-id=b]')).left, '280px');
    assert.equal(window.getComputedStyle(container.querySelector('th[data-smart-id=b]')).left, '280px');
    widths.a = 340;
    await act(async () => callbacks.forEach(callback => callback()));
    assert.equal(window.getComputedStyle(container.querySelector('td[data-smart-id=b]')).left, '340px');
    await pin('Amallar', 'right');
    await pin('B', 'right');
    assert.equal(window.getComputedStyle(container.querySelector('td[data-smart-id=b]')).right, '96px');
    widths.actions = 110;
    await act(async () => callbacks.forEach(callback => callback()));
    assert.equal(window.getComputedStyle(container.querySelector('td[data-smart-id=b]')).right, '110px');
  } finally {
    await act(async () => root.unmount());
    assert.equal(callbacks.size, 0);
    HTMLElement.prototype.getBoundingClientRect = originalRect;
    if (originalObserver) window.ResizeObserver = originalObserver;
    else delete window.ResizeObserver;
    styles.remove();
  }
});

test('sales employee/phone columns refresh from matching directory/profile data and stay attached after reorder', async () => {
  const { create } = require('zustand');
  const employees = create(() => ({ xodimlar: [] }));
  const profiles = create(() => ({ profil: null }));
  const Sales = compile('../src/Pages/Savdo/SotuvlarJadvali.tsx', {
    '@/Components/common/smart-table/SmartTable': { __esModule: true, default: SmartTable },
    '@/Components/common/TablePagination': { __esModule: true, default: () => null },
    '@/Components/common/HujjatOchirish': { __esModule: true, default: () => null },
    '@/Components/common/HujjatSanasi': { KiritilganBelgisi: () => null },
    '@/lib/sotuvMasulMalumoti': { sotuvMasulMalumoti },
    '@/lib/sotuvNomi': { sotuvJadvalNomi: () => 'Sale', sotuvSarlavhaMijozi: () => '' },
    '@/store/savdoStore': { useSavdoStore: employees },
    '@/store/authProfileStore': { useAuthProfileStore: profiles },
    'react-i18next': { useTranslation: () => ({ t: key => key }) },
    './savdoYordamchilari': {
      mijozNomi: () => 'Customer', sotuvdaMijozBiriktirilganmi: () => false,
      pulniFormatlash: String, sotuvValyutasi: sale => sale.currency,
      sotuvHolati: sale => sale.status, sotuvSummasi: sale => Number(sale.totalAmount),
      sotuvChegirmaSummasi: () => 0, sotuvTolanganSummasi: sale => Number(sale.paidAmount),
      sotuvQarzdorlikSummasi: () => 0, sotuvRaqami: sale => sale.number,
      qaytarishSummasi: () => 0, sotuvMahsulotiId: item => item.id, sotuvMahsulotiMiqdori: item => Number(item.quantity),
    },
  }).default;
  const record = Object.freeze({ id: 'sale-employee', number: 'S-1', cashierId: 'employee-1', responsible: Object.freeze({ id: 'employee-1' }), status: 'CONFIRMED', currency: 'UZS', totalAmount: 100, paidAmount: 100, date: '2026-11-07', items: [] });
  const before = JSON.stringify(record);
  const opened = [];
  const cell = id => container.querySelector(`tbody td[data-smart-id="${id}"]`);
  root = createRoot(container);
  try {
    await act(async () => root.render(h(Sales, { tableId: 'sales-employee', sotuvlar: [record], onSotuvniOchish: sale => opened.push(sale) })));
    assert.equal(cell('h11').textContent.trim(), '-');
    assert.equal(cell('h12').textContent, '-');
    await act(async () => employees.setState({ xodimlar: [{ id: 'employee-1', fullName: 'Employee One', phone: '+998900000001' }] }));
    assert.match(cell('h11').textContent, /Employee One/);
    assert.equal(cell('h12').textContent, '+998900000001');
    const employeeOption = option('sotuvlarJadvali.columns.masulShaxs');
    await click(employeeOption.querySelector('.smart-column-toggle'));
    await click(employeeOption.querySelector('button[aria-label="Chapga: sotuvlarJadvali.columns.masulShaxs"]'));
    assert.match(cell('h11').textContent, /Employee One/);
    assert.equal(cell('h12').textContent, '+998900000001');
    await act(async () => {
      employees.setState({ xodimlar: [] });
      profiles.setState({ profil: { id: 'employee-1', fullName: 'Own Profile', phone: '+998900000002' } });
    });
    assert.match(cell('h11').textContent, /Own Profile/);
    assert.equal(cell('h12').textContent, '+998900000002');
    await act(async () => profiles.setState({ profil: { id: 'other-employee', fullName: 'Other Person', phone: '+998900000099' } }));
    assert.equal(cell('h11').textContent.trim(), '-');
    assert.equal(cell('h12').textContent, '-');
    await click(container.querySelector('tbody tr'));
    assert.strictEqual(opened[0], record);
    assert.equal(JSON.stringify(record), before);
  } finally { await act(async () => root.unmount()); }
});
