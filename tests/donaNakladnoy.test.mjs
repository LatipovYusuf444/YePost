import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { donaBirligimi, donaBirliginiTopish } from '../src/lib/donaBirligi.ts';
import { nakladnoyHtmlMatni, nakladnoyQatori } from '../src/lib/nakladnoyBirligi.ts';
import { birliklarTanasi } from '../src/lib/kopBirlik.ts';
import { birlikRoyxatiniYigish, bosBirlikQatori } from '../src/Pages/Mahsulotlar/birlikQatorlariMantiq.ts';

const require = createRequire(import.meta.url);
const plain = value => JSON.parse(JSON.stringify(value));
const piece = { id: 'actual-piece-uuid', code: 'H87', name: 'Dona', shortName: 'dona', isFractional: false };
const kg = { id: 'actual-kg-uuid', name: 'Kilogramm', shortName: 'kg', isFractional: true };
function compile(path, dependencies) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { exports: {}, require: name => {
    if (name in dependencies) return dependencies[name];
    if (name === 'react/jsx-runtime') return require(name);
    return new Proxy({ __esModule: true, default: name.split('/').at(-1) }, { get: (object, name) => object[name] ?? String(name) });
  } };
  runInNewContext(code, context);
  return context.exports;
}

test('piece detection accepts saved H87/dona/шт aliases and never treats kg or korobka as dona', () => {
  for (const value of [piece, { name: 'Другая', code: 'H87' }, { name: 'Штука' }, { name: 'x', shortName: 'шт.' }, { name: ' Dona ' }]) assert.equal(donaBirligimi(value), true);
  assert.equal(donaBirligimi(kg), false);
  assert.equal(donaBirligimi({ name: 'Korobka' }), false);
  assert.equal(donaBirliginiTopish([kg, piece]), piece);
});

function pieceApi(lists, create) {
  const calls = [];
  const api = compile('../src/api/donaBirligiApi.ts', {
    './axios': { __esModule: true, default: {
      get: async (...args) => { calls.push(['get', ...args]); return { data: lists.shift() ?? [] }; },
      post: async (...args) => { calls.push(['post', ...args]); return { data: await create() }; },
    } },
    './response': { apiList: value => value.data ?? value, apiData: value => value.data ?? value },
    '../lib/donaBirligi.ts': { donaBirliginiTopish },
  });
  return { run: api.donaBirliginiTaminlash, calls };
}

test('existing piece unit is reused without creating duplicate shop units', async () => {
  const api = pieceApi([[kg, piece]], () => { throw new Error('Unexpected create'); });
  assert.equal((await api.run()).id, piece.id);
  assert.deepEqual(plain(api.calls), [['get', '/catalog/units']]);
});

test('selecting missing dona creates a real backend unit with the existing catalog DTO', async () => {
  const api = pieceApi([[kg]], () => ({ data: piece }));
  assert.equal((await api.run()).id, piece.id);
  assert.deepEqual(plain(api.calls), [['get', '/catalog/units'], ['post', '/catalog/units', { code: 'H87', name: 'Dona', shortName: 'dona', isFractional: false }]]);
});

test('concurrent duplicate creation recovers the actual ID and permission/invalid-ID failures remain errors', async () => {
  const conflict = { response: { status: 409 } };
  assert.equal((await pieceApi([[kg], [kg, piece]], () => { throw conflict; }).run()).id, piece.id);
  const forbidden = { response: { status: 403, data: { message: 'No permission' } } };
  await assert.rejects(pieceApi([[]], () => { throw forbidden; }).run(), error => error === forbidden);
  await assert.rejects(pieceApi([[]], () => ({ name: 'Dona', id: '' })).run(), /ID/);
});

const nodes = value => Array.isArray(value) ? value.flatMap(nodes) : !value || typeof value !== 'object' ? [] : [value, ...nodes(value.props?.children)];
const text = value => Array.isArray(value) ? value.map(text).join('') : value && typeof value === 'object' ? text(value.props?.children) : String(value ?? '');
function coefficientEditor(units, base = kg, create = async () => piece) {
  let rows = [{ ...bosBirlikQatori(), koeff: '0.5' }], cursor = 0;
  const states = [];
  const component = compile('../src/Pages/Mahsulotlar/BirlikQatorlari.tsx', {
    react: { useMemo: fn => fn(), useState(initial) { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = value; }]; } },
    'react-i18next': { useTranslation: () => ({ t: key => key }) },
    '@/lib/donaBirligi': { donaBirligimi, donaBirliginiTopish },
    '@/api/sozlamalarApi': { getApiErrorMessage: error => error.message },
    './birlikQatorlariMantiq': { bosBirlikQatori },
  }).default;
  const render = () => { cursor = 0; return component({ qatorlar: rows, onChange: value => { rows = value; }, birliklar: units, asosiyId: base.id, asosiyNomi: base.shortName, onDonaQoshish: create }); };
  return { render, get rows() { return rows; } };
}

test('coefficient dropdown exposes missing dona and replaces its UI marker with the backend UUID before saving', async () => {
  const view = coefficientEditor([kg]);
  const option = nodes(view.render()).find(node => node.type === 'option' && text(node) === 'units.pieceOption');
  assert.ok(option);
  nodes(view.render()).find(node => node.type === 'AppSelect').props.onChange({ target: { value: option.props.value } });
  assert.equal(view.rows[0].unitId, '');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(view.rows[0].unitId, piece.id);
  const payload = birlikRoyxatiniYigish(view.rows, [kg, piece], { unitId: kg.id, nomi: 'kg' });
  assert.deepEqual(birliklarTanasi(payload.royxat).units[0], { unitId: piece.id, factor: 0.5, canReceive: true, canSell: true, retailPrice: null, wholesalePrice: null, barcode: null });
});

test('base dona remains factor 1 and cannot be duplicated as an extra unit; an empty shop can still add missing dona', () => {
  const base = coefficientEditor([piece], piece);
  assert.equal(nodes(base.render()).some(node => node.type === 'option' && node.props.value === piece.id), false);
  assert.equal(nodes(base.render()).some(node => text(node) === 'units.pieceOption'), false);
  assert.ok(text(base.render()).includes('× 1'));
  const empty = coefficientEditor([kg]);
  const add = nodes(empty.render()).find(node => node.type === 'button' && text(node) === 'units.add');
  assert.equal(add.props.disabled, true, 'the one available dona option already has an empty editor row');
});

test('failed piece creation keeps the row unselected and shows the real backend error', async () => {
  const view = coefficientEditor([kg], kg, async () => { throw new Error('Creation forbidden'); });
  const option = nodes(view.render()).find(node => node.type === 'option' && text(node) === 'units.pieceOption');
  nodes(view.render()).find(node => node.type === 'AppSelect').props.onChange({ target: { value: option.props.value } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(view.rows[0].unitId, '');
  assert.ok(text(view.render()).includes('Creation forbidden'));
});

const carton = Object.freeze({ modificationId: 'cement', quantity: '24', price: '3000', discount: '200', currency: 'UZS', unitId: 'real-carton-uuid', unitName: 'korobka', unitQuantity: '2', unitPrice: '36000', baseUnitName: 'dona', factorSnapshot: '12' });
test('invoice uses the saved korobka quantity/price and retains base-unit handling for old sales', () => {
  assert.deepEqual(nakladnoyQatori(carton), { unitId: carton.unitId, birlik: 'korobka', miqdor: 2, narx: 36000 });
  assert.deepEqual(nakladnoyQatori({ quantity: 2.5, price: 10, baseUnitName: 'kg' }), { unitId: null, birlik: 'kg', miqdor: 2.5, narx: 10 });
  assert.equal(nakladnoyQatori({ quantity: 3, price: 10 }).birlik, 'dona');
  assert.equal(nakladnoyQatori({ ...carton, unitName: null }).birlik, '—');
  assert.equal(nakladnoyHtmlMatni('korobka <x> & "name"'), 'korobka &lt;x&gt; &amp; &quot;name&quot;');
});

function invoice() {
  const source = readFileSync(new URL('../src/Pages/Savdo/SotuvTafsilotlariModal.tsx', import.meta.url), 'utf8');
  const file = ts.createSourceFile('Sotuv.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const fn = file.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'YukXatiGeneratorModal');
  const code = ts.transpileModule(fn.getText(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  let blob, html = '';
  const context = {
    require, exports: {}, useTranslation: () => ({ t: key => key === 'common.dona' ? 'dona' : key }), useState: () => [true, () => {}], useEffect() {},
    HUJJAT_MENU_LABEL_KEYS: {}, mijozNomi: () => 'Test Buyer', mijozTelefon: () => '000',
    sotuvJadvalId: () => 'TEST-1', sotuvSummasi: sale => sale.totalAmount, sotuvValyutasi: () => 'UZS', sananiFormatlash: () => '31.10.2026',
    pulniFormatlash: value => `${Number(value)} UZS`, qatorValyutasi: () => 'UZS', mahsulotNomi: () => 'Test Product', mahsulotJami: row => Number(row.quantity) * Number(row.price) - Number(row.discount ?? 0),
    nakladnoyQatori, nakladnoyHtmlMatni, TextEncoder, Blob,
    URL: { createObjectURL: value => { blob = value; return 'blob:test'; }, revokeObjectURL() {} },
    window: { open: () => ({ document: { write: value => { html += value; }, close() {} } }) },
    document: { createElement: () => ({ click() {}, remove() {} }), body: { appendChild() {} } },
  };
  function icons(node) {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && /^[A-Z]/.test(node.tagName.getText(file))) context[node.tagName.getText(file)] = node.tagName.getText(file);
    ts.forEachChild(node, icons);
  }
  icons(fn);
  runInNewContext(code, context);
  const tree = context.YukXatiGeneratorModal({ sotuv: { id: 'test', date: '2026-10-31', totalAmount: 71800, items: [carton], payments: [] }, hujjatTuri: 'Nakladnoy', onClose() {} });
  return { tree, get blob() { return blob; }, get html() { return html; } };
}

test('actual invoice preview and HTML printing show korobka/2/36000 without changing the discounted total', () => {
  const view = invoice();
  const row = nodes(view.tree).find(node => node.type === 'tr' && text(node).includes('Test Product'));
  assert.deepEqual(nodes(row).filter(node => node.type === 'td').map(node => text(node)), ['1', 'Test Product', 'korobka', '2', '36000 UZS', '71800 UZS']);
  const print = nodes(view.tree).find(node => node.type === 'button' && node.props.onClick?.name === 'chopEtish');
  print.props.onClick();
  assert.match(view.html, /<td>korobka<\/td>\s*<td>2<\/td>\s*<td>36000 UZS<\/td>/);
  assert.match(view.html, /71800 UZS/);
});

test('actual PDF download contains korobka and saved unit values with valid PDF object offsets', async () => {
  const view = invoice();
  nodes(view.tree).find(node => node.type === 'button' && node.props.onClick?.name === 'pdfYuklash').props.onClick();
  const pdf = await view.blob.text();
  assert.equal(view.blob.type, 'application/pdf');
  assert.match(pdf, /254 [\d.]+ Td \(korobka\)/);
  assert.match(pdf, /310 [\d.]+ Td \(2\)/);
  assert.match(pdf, /360 [\d.]+ Td \(36000 UZS\)/);
  assert.match(pdf, /71800 UZS/);
  const offset = Number(pdf.match(/startxref\n(\d+)/)[1]);
  assert.equal(pdf.slice(offset, offset + 4), 'xref');
  const offsets = [...pdf.matchAll(/(\d{10}) 00000 n/g)].map(match => Number(match[1]));
  offsets.forEach((position, index) => assert.ok(pdf.slice(position).startsWith(`${index + 1} 0 obj`)));
});
