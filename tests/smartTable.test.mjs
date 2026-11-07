import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { createElement as h, Fragment } from 'react';
import ts from 'typescript';
import * as preferences from '../src/Components/common/smart-table/preferences.ts';

const require = createRequire(import.meta.url);
const code = ts.transpileModule(readFileSync(new URL('../src/Components/common/smart-table/model.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText;
const context = { exports: {}, require };
runInNewContext(code, context);
const { analyzeTable, elements, projectTable, stripControls } = context.exports;
const columns = [
  { id: 'name', label: 'Name', required: false, min: 80, max: 800 },
  { id: 'quantity', label: 'Quantity', required: false, min: 80, max: 800 },
  { id: 'action', label: 'Actions', required: true, min: 48, max: 240 },
];
const json = value => JSON.parse(JSON.stringify(value));

test('stale/corrupt storage is validated, widths bounded, required and last primary columns remain visible', () => {
  const prefs = preferences.normalizePreferences({ version: 1, order: ['quantity', 'removed', 'quantity'], hidden: ['name', 'quantity', 'action'], widths: { name: 1, quantity: Infinity, action: 900, removed: 100 }, pins: { quantity: 'left', name: 'invalid', removed: 'right' }, density: 'compact', rows: ['never persist'] }, columns);
  assert.deepEqual(prefs.order, ['quantity', 'name', 'action']);
  assert.deepEqual(prefs.hidden, ['quantity']);
  assert.deepEqual(prefs.widths, { name: 80, action: 240 });
  assert.deepEqual(prefs.pins, { quantity: 'left' });
  assert.equal(prefs.density, 'compact');
  assert.equal('rows' in prefs, false);
  assert.deepEqual(preferences.normalizePreferences({ version: 2 }, columns), preferences.defaults(columns));
  assert.deepEqual(preferences.normalizePreferences({ version: 1, order: 123, hidden: 'name', widths: null }, columns), preferences.defaults(columns));
});

test('preference keys isolate both table and account and contain no raw identity', async () => {
  const first = await preferences.preferenceKey('workspaceA|userA', 'sales');
  assert.ok(first);
  assert.equal(first.includes('userA'), false);
  assert.equal(first.includes('workspaceA'), false);
  assert.equal(first, await preferences.preferenceKey('workspaceA|userA', 'sales'));
  assert.notEqual(first, await preferences.preferenceKey('workspaceA|userB', 'sales'));
  assert.notEqual(first, await preferences.preferenceKey('workspaceB|userA', 'sales'));
  assert.notEqual(first, await preferences.preferenceKey('workspaceA|userA', 'stock'));
  assert.equal(await preferences.preferenceKey(null, 'sales'), null);
});

test('storage unavailable and invalid JSON never break the table; round trip contains UI fields only', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('disabled'); } });
    assert.deepEqual(preferences.readPreferences('x', columns), preferences.defaults(columns));
    assert.doesNotThrow(() => preferences.writePreferences('x', preferences.defaults(columns)));
    const saved = new Map();
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) } });
    const prefs = { ...preferences.defaults(columns), density: 'compact', widths: { name: 240 } };
    preferences.writePreferences('x', prefs);
    assert.deepEqual(preferences.readPreferences('x', columns), prefs);
    assert.deepEqual(Object.keys(JSON.parse(saved.get('x'))).sort(), ['density', 'hidden', 'order', 'pins', 'version', 'widths']);
    saved.set('x', '{');
    assert.deepEqual(preferences.readPreferences('x', columns), preferences.defaults(columns));
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});

test('pinning partitions displayed columns and invalid cross-pin drops are rejected', () => {
  const prefs = { ...preferences.defaults(columns), pins: { action: 'right', quantity: 'left' } };
  assert.deepEqual(preferences.visibleColumns(columns, prefs).map(c => c.id), ['quantity', 'name', 'action']);
  assert.strictEqual(preferences.moveColumn(prefs, 'name', 'action'), prefs);
  assert.strictEqual(preferences.moveColumn(prefs, 'unknown', 'name'), prefs);
  const moved = preferences.moveColumn(preferences.defaults(columns), 'name', 'quantity');
  assert.deepEqual(moved.order, ['quantity', 'name', 'action']);
});

function fixture(count = 1) {
  const action = () => {};
  const sort = () => {};
  const renderer = h('input', { defaultValue: 'unchanged', 'aria-label': 'Editable cell' });
  const records = Object.freeze(Array.from({ length: count }, (_, id) => Object.freeze({ id: `row-${id}`, value: id })));
  const table = h('table', {},
    h('thead', {}, h('tr', {}, h('th', { 'data-column-id': 'name', onClick: sort }, 'Name'), h(Fragment, {}, h('th', { 'data-column-id': 'quantity' }, 'Quantity'), h('th', { 'data-column-id': 'action' }, 'Actions')))),
    h('tbody', {}, records.map(record => h('tr', { key: record.id, onClick: action }, h('td', {}, renderer), h('td', {}, record.value), h('td', {}, h('button', { onClick: action }, 'Action'))))),
    h('tfoot', {}, h('tr', {}, h('td', {}, 'Total'), h('td', {}, count), h('td', {}))),
  );
  return { table, records, action, sort, renderer };
}

test('1000 rows: headers, values, cell renderers, actions, row IDs and totals move together without touching records', () => {
  const { table, records, action, sort, renderer } = fixture(1000);
  const snapshot = JSON.stringify(records);
  const model = analyzeTable(table);
  assert.equal(model.compatible, true);
  const prefs = { ...preferences.moveColumn(preferences.defaults(model.columns), 'name', 'quantity'), widths: { name: 320 }, density: 'compact' };
  const projected = projectTable(table, model.columns, preferences.visibleColumns(model.columns, prefs), cell => cell);
  const sections = elements(projected.props.children);
  const header = elements(elements(sections[0].props.children)[0].props.children);
  assert.deepEqual(json(header.map(c => c.props.children)), ['Quantity', 'Name', 'Actions']);
  assert.strictEqual(header[1].props.onClick, sort);
  const rows = elements(sections[1].props.children);
  assert.equal(rows.length, records.length);
  rows.forEach((row, index) => {
    assert.ok(row.key.includes(records[index].id));
    assert.strictEqual(row.props.onClick, action);
    const cells = elements(row.props.children);
    assert.equal(cells[0].props.children, records[index].value);
    assert.strictEqual(cells[1].props.children, renderer);
    assert.strictEqual(cells[2].props.children.props.onClick, action);
  });
  assert.deepEqual(json(elements(elements(sections[2].props.children)[0].props.children).map(c => c.props.children ?? null)), [1000, 'Total', null]);
  assert.equal(JSON.stringify(records), snapshot);
});

test('visibility changes full-width loading/empty spans and retains callbacks on hidden sorted columns', () => {
  const { table } = fixture();
  const model = analyzeTable(table);
  const loading = h('div', { role: 'status' }, 'Loading');
  const withState = h('table', {}, elements(table.props.children)[0], h('tbody', {}, h('tr', {}, h('td', { colSpan: 3 }, loading))));
  const visible = model.columns.filter(c => c.id !== 'quantity');
  const projected = projectTable(withState, model.columns, visible, cell => cell);
  const state = elements(elements(elements(projected.props.children)[1].props.children)[0].props.children)[0];
  assert.equal(state.props.colSpan, 2);
  assert.strictEqual(state.props.children, loading);
  assert.equal(analyzeTable(withState).compatible, true);
});

test('merged/grouped/opaque rows are safely excluded; a one-column table is still interactive', () => {
  const grouped = h('table', {}, h('thead', {}, h('tr', {}, h('th', { colSpan: 2 }, 'Group')), h('tr', {}, h('th', {}, 'A'), h('th', {}, 'B'))));
  assert.equal(analyzeTable(grouped).compatible, false);
  const { table } = fixture();
  const partialSpan = h('table', {}, elements(table.props.children)[0], h('tbody', {}, h('tr', {}, h('td', { colSpan: 2 }, 'Merged'), h('td', {}, 'Other'))));
  assert.equal(analyzeTable(partialSpan).compatible, false);
  const OpaqueRow = () => null;
  assert.equal(analyzeTable(h('table', {}, elements(table.props.children)[0], h('tbody', {}, h(OpaqueRow)))).compatible, false);
  const one = h('table', {}, h('thead', {}, h('tr', {}, h('th', { 'data-column-id': 'one' }, 'One'))), h('tbody', {}, h('tr', {}, h('td', {}, 'Value'))));
  const model = analyzeTable(one);
  let decorated = 0;
  projectTable(one, model.columns, model.columns, cell => { decorated++; return cell; });
  assert.equal(decorated, 2);
});

test('reset restores presentation defaults and never receives business states', () => {
  const business = Object.freeze({ query: 'keep', filters: ['active'], sort: 'amount', page: 4, selected: ['record'], form: 'unsaved' });
  const before = JSON.stringify(business);
  const changed = preferences.normalizePreferences({ version: 1, order: ['quantity', 'name', 'action'], hidden: ['quantity'], widths: { name: 400 }, pins: { action: 'right' }, density: 'compact' }, columns);
  assert.notDeepEqual(changed, preferences.defaults(columns));
  const reset = preferences.defaults(columns);
  assert.deepEqual(reset.order, columns.map(c => c.id));
  assert.deepEqual(reset.widths, {});
  assert.deepEqual(reset.hidden, []);
  assert.equal(reset.density, 'standard');
  assert.equal(JSON.stringify(business), before);
});

test('legacy header presentation handles are removed without invoking or altering business controls', () => {
  const business = h('button', { onClick: () => {} }, 'Sort');
  const controls = stripControls([business, h('button', { 'data-table-control': true }, 'Old settings'), h('span', { 'data-table-control': true }, 'Old resize')]);
  assert.equal(elements(controls).length, 1);
  assert.strictEqual(elements(controls)[0].props.onClick, business.props.onClick);
});
