import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { canSellNegativeStock, limitedStockQuantity, movementStockTotals, negativeStockMessages, setNegativeStockPermission, stockQuantity } from '../src/lib/negativeStock.ts';
import { inventarizatsiyaQatorFarqi } from '../src/lib/inventarizatsiyaKorinish.ts';
import { savatchaMiqdoriniOqish } from '../src/Pages/BoshSahifa/savatchaMiqdori.ts';

const require = createRequire(import.meta.url);
const plain = value => JSON.parse(JSON.stringify(value));
function compile(path, dependencies, globals = {}, replace = value => value) {
  const source = replace(readFileSync(new URL(path, import.meta.url), 'utf8'));
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { ...globals, exports: {}, require: name => {
    if (name in dependencies) return dependencies[name];
    if (name === 'react/jsx-runtime') return require(name);
    throw new Error(`Unmocked dependency: ${name}`);
  } };
  runInNewContext(code, context);
  return context.exports;
}
const warning = { code: 'NEGATIVE_STOCK', modificationId: 'cement', productName: 'Sement M400', stockBefore: '2', stockAfter: '-3' };
const closed = { modificationId: 'cement', productName: 'Sement M400', previousStock: '-3', stockAfter: '7' };

test('all three outgoing confirmations show a warning without treating the confirmed document as an error', () => {
  for (const url of ['/sales/s/confirm', '/inventory/write-offs/w/confirm', '/inventory/transfers/t/send']) {
    for (const raw of [{ warnings: [warning] }, { data: { id: 'doc', warnings: [warning] } }, { data: { id: 'doc' }, warnings: [warning] }]) {
      assert.deepEqual(negativeStockMessages(raw, url, 'post'), [{ kind: 'warning', text: 'Sement M400: qoldiq 2 edi, endi −3' }]);
    }
  }
});

test('all three incoming confirmations display closure even if selling in minus is now disabled', () => {
  setNegativeStockPermission({ allowNegativeStock: false, canSellNegative: false });
  for (const url of ['/inventory/purchases/p/confirm', '/inventory/transfers/t/receive', '/inventory/stock-takes/s/confirm']) {
    assert.deepEqual(negativeStockMessages({ data: { id: 'doc' }, closedNegative: [closed] }, url, 'post'), [{ kind: 'success', text: 'Sement M400: minus yopildi (−3 → 7)' }]);
  }
});

test('empty arrays, unrelated warnings, reads and unrelated endpoints do not create stock notifications', () => {
  assert.deepEqual(negativeStockMessages({ warnings: [] }, '/sales/s/confirm', 'post'), []);
  assert.deepEqual(negativeStockMessages({ warnings: [{ code: 'FACTOR_CHANGED' }] }, '/sales/s/confirm', 'post'), []);
  assert.deepEqual(negativeStockMessages({ warnings: [warning] }, '/sales/s', 'get'), []);
  assert.deepEqual(negativeStockMessages({ warnings: [warning] }, '/sales/s/cancel', 'post'), []);
  assert.deepEqual(negativeStockMessages(null, '/sales/s/confirm', 'post'), []);
  assert.match(negativeStockMessages({ warnings: [warning] }, '/sales/s/confirm', 'post', 'ru')[0].text, /остаток был 2, теперь −3/);
  assert.equal(negativeStockMessages({ warnings: [warning], data: { warnings: [] } }, '/sales/s/confirm', 'post').length, 1);
  assert.equal(negativeStockMessages({ warnings: [warning], data: { warnings: [warning] } }, '/sales/s/confirm', 'post').length, 1);
});

test('signed stock keeps negative decimals and never rounds small shortages to zero', () => {
  assert.equal(stockQuantity(-3), '−3');
  assert.match(stockQuantity('-0.000001'), /^−0[.,]000001$/);
  assert.equal(stockQuantity(0), '0');
  assert.equal(stockQuantity(undefined), '—');
  assert.equal(inventarizatsiyaQatorFarqi({ systemQuantity: '-3', actualQuantity: '5' }), 8);
  assert.equal(inventarizatsiyaQatorFarqi({ expectedQuantity: '-3', actualQuantity: '0' }), 3);
});

test('movement reports use server closing balances, preserving negative opening stock and separate warehouse streams', () => {
  const result = movementStockTotals([
    { key: 'w1:m1', movement: -5, closingBalance: '-3' },
    { key: 'w2:m1', movement: -2, closingBalance: '-6' },
    { key: 'w1:m1', movement: 10, closingBalance: '7' },
  ]);
  assert.equal(result.opening, -2); // w1 starts at 2, w2 at -4
  assert.deepEqual(result.lines, [{ opening: -2, closing: -7 }, { opening: -7, closing: -9 }, { opening: -9, closing: 1 }]);
  assert.equal(result.closing, 1);
  assert.deepEqual(movementStockTotals([{ key: 'w:m', movement: -5, openingBalance: '-3', closingBalance: '-8' }]).lines, [{ opening: -3, closing: -8 }]);
});

test('with feature off existing quantity limits remain; permission allows excess quantity without changing stock itself', () => {
  assert.equal(limitedStockQuantity(5, 2), 2);
  assert.equal(limitedStockQuantity(5, -3), 0);
  assert.equal(limitedStockQuantity(5, -3, true), 5);
  assert.equal(limitedStockQuantity(-2, -3, true), 0);
  assert.equal(savatchaMiqdoriniOqish('5', -3), null);
  assert.deepEqual(savatchaMiqdoriniOqish('5', -3, false, true), { soni: 5, matn: '5' });
  assert.deepEqual(savatchaMiqdoriniOqish('5', 2), { soni: 2, matn: '2' });
});

test('real POS store accepts zero/negative stock only with the current server permission and supports unit changes', async () => {
  globalThis.window = { localStorage: { getItem: () => null, setItem() {}, removeItem() {} } };
  const { usePosStore } = await import('../src/store/posStore.ts');
  const store = usePosStore.getState;
  const item = { id: 'cement:w', modificationId: 'cement', nom: 'Cement', narx: 20, chakanaNarx: 20, ulgurjiNarx: 18, warehouseId: 'w', qoldiq: -3, birliklar: [{ unitId: 'box', nomi: 'box', qisqa: 'box', koeff: 5, asosiy: false, kasr: false, sotuv: true }] };
  usePosStore.setState({ cart: [], narxTuri: 'chakana' });
  setNegativeStockPermission({ allowNegativeStock: true, canSellNegative: false });
  store().addToCart(item, 5);
  assert.equal(store().cart.length, 0);
  setNegativeStockPermission({ allowNegativeStock: true, canSellNegative: true });
  store().addToCart(item, 5);
  assert.equal(store().cart[0].soni, 5);
  assert.equal(store().cart[0].qoldiq, -3);
  store().addToCart(item, 2);
  assert.equal(store().cart[0].soni, 7);
  store().updateQuantity(item.id, 12);
  store().setBirlik(item.id, 'box');
  assert.equal(store().cart[0].soni, 12);
  setNegativeStockPermission({ allowNegativeStock: false, canSellNegative: true });
  assert.equal(canSellNegativeStock(), false);
  usePosStore.setState({ cart: [] });
});

test('settings API never enables shops while rollout is locked, but can disable existing negative selling', async () => {
  const calls = [];
  const settings = { allowNegativeStock: false, canSellNegative: false };
  const dependencies = {
    './axios': { __esModule: true, default: { get: async (...args) => { calls.push(['get', ...args]); return { data: { data: settings } }; }, patch: async (...args) => { calls.push(['patch', ...args]); return { data: settings }; } } },
    './response': { apiData: response => response.data ?? response },
  };
  const loadApi = enabled => compile('../src/api/inventorySettingsApi.ts', dependencies, {}, source => source.replace('import.meta.env.VITE_NEGATIVE_STOCK_ENABLE_READY', JSON.stringify(String(enabled))));
  const locked = loadApi(false);
  assert.deepEqual(await locked.inventorySettingsApi.get(), settings);
  await assert.rejects(locked.inventorySettingsApi.update(true));
  assert.equal(calls.length, 1);
  await locked.inventorySettingsApi.update(false);
  assert.deepEqual(plain(calls.at(-1)), ['patch', '/settings/inventory', { allowNegativeStock: false }]);
  await loadApi(true).inventorySettingsApi.update(true);
  assert.deepEqual(plain(calls.at(-1)), ['patch', '/settings/inventory', { allowNegativeStock: true }]);
});

test('settings UI is read-only for cashier, locked for rollout, and enabled only for admin/director after rollout', () => {
  const nodes = value => Array.isArray(value) ? value.flatMap(nodes) : !value || typeof value !== 'object' ? [] : [value, ...nodes(value.props?.children)];
  for (const [role, ready, allowNegativeStock, expectedDisabled] of [['CASHIER', true, false, true], ['DIRECTOR', false, false, true], ['DIRECTOR', false, true, false], ['ADMIN', true, false, false]]) {
    const state = { loaded: true, loading: false, saving: false, error: '', canSellNegative: allowNegativeStock, allowNegativeStock, load() {}, update() {} };
    const component = compile('../src/Pages/SozlamalarUchot/InventoryBolimi.tsx', {
      react: { useEffect() {} }, 'react-i18next': { useTranslation: () => ({ t: key => key }) },
      'lucide-react': new Proxy({}, { get: (_, name) => String(name) }),
      '@/api/inventorySettingsApi': { negativeStockEnableReady: ready },
      '@/store/inventorySettingsStore': { useInventorySettingsStore: () => state },
      '@/store/authProfileStore': { useAuthProfileStore: selector => selector({ profil: { role } }) },
      '@/lib/roles': { rolniNormallashtirish: value => value === 'DIRECTOR' ? 'DIREKTOR' : value },
      './UmumiyUI': { BolimKarta: 'BolimKarta' },
    }).default;
    const toggle = nodes(component()).find(node => node.props.role === 'switch');
    assert.equal(toggle.props.disabled, expectedDisabled, `${role}, ready=${ready}, enabled=${allowNegativeStock}`);
    assert.equal(toggle.props['aria-checked'], allowNegativeStock);
  }
});

test('grant codes use the documented PUT user endpoint, retain unknown codes and refresh server records', async () => {
  const calls = [];
  const grants = [{ id: 'g', userId: 'employee', code: 'NEGATIVE_STOCK_SALE', isActive: true }];
  const api = compile('../src/api/accountsApi.ts', {
    './axios': { __esModule: true, default: { put: async (...args) => calls.push(args), get: async () => ({ data: grants }) } },
    './response': { apiList: response => response, apiData: response => response, ruxsatsizBulsaBosh: callback => callback() },
  });
  const result = await api.vakolatlarApi.foydalanuvchiKodlariniSaqlash('employee', ['REPORTS', 'FUTURE_CODE', 'NEGATIVE_STOCK_SALE', 'REPORTS']);
  assert.deepEqual(plain(calls), [['/accounts/grants/users/employee', { codes: ['REPORTS', 'FUTURE_CODE', 'NEGATIVE_STOCK_SALE'] }]]);
  assert.deepEqual(plain(result), grants);
});

test('actual inventory system-stock reader keeps negative total quantity instead of clamping to zero', () => {
  const source = readFileSync(new URL('../src/Pages/Ombor/Inventarizatsiya.tsx', import.meta.url), 'utf8');
  const file = ts.createSourceFile('Inventarizatsiya.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const fn = file.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'tizimQoldigi');
  const code = ts.transpileModule(fn.getText(file), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = {};
  runInNewContext(code, context);
  assert.equal(context.tizimQoldigi({ quantity: '-3', availableQuantity: '-5' }), -3);
  assert.equal(context.tizimQoldigi({ balance: '-3' }), -3);
  assert.equal(context.tizimQoldigi({ quantity: '0', availableQuantity: '-3' }), 0);
});

test('shared Axios success interceptor emits stock notifications before DTO unwrapping and preserves the successful response', () => {
  let success;
  const messages = [];
  const client = { interceptors: { request: { use() {} }, response: { use(callback) { success = callback; } } } };
  compile('../src/api/axios.ts', {
    axios: { __esModule: true, default: { create: () => client } },
    './apiConfig': { API_BASE_URL: '/api/v1' },
    './sozlamalarApi': {}, './hujjatOgohlantirishi': {},
    './apiLanguage': { apiTiliniOlish: () => 'uz' },
    '@/lib/authTokenStorage': {},
    '@/lib/toast': { muvaffaqiyatXabari() {}, xatolikXabari() {} },
    sonner: { toast: { warning: value => messages.push(['warning', value]), success: value => messages.push(['success', value]) } },
    '@/lib/negativeStock': { negativeStockMessages },
  });
  const outgoing = { data: { data: { id: 's', status: 'CONFIRMED' }, warnings: [warning] }, config: { method: 'post', url: '/sales/s/confirm' } };
  assert.equal(success(outgoing), outgoing);
  const incoming = { data: { data: { id: 'p', status: 'CONFIRMED' }, closedNegative: [closed] }, config: { method: 'post', url: '/inventory/purchases/p/confirm' } };
  assert.equal(success(incoming), incoming);
  assert.deepEqual(messages, [['warning', 'Sement M400: qoldiq 2 edi, endi −3'], ['success', 'Sement M400: minus yopildi (−3 → 7)']]);
});

test('permissions clear on logout and a late settings response cannot grant the next user access', async () => {
  const listeners = new Map();
  let auth = { username: 'director', expiresAt: 100 };
  let resolve;
  const permissions = [];
  const { useInventorySettingsStore } = compile('../src/store/inventorySettingsStore.ts', {
    zustand: require('zustand'),
    '@/api/inventorySettingsApi': { inventorySettingsApi: { get: () => new Promise(done => { resolve = done; }) } },
    '@/api/sozlamalarApi': { getApiErrorMessage: String },
    '@/lib/authTokenStorage': { AUTH_SESSION_CHANGED_EVENT: 'session', authTokenlarniOlish: () => auth },
    '@/lib/negativeStock': { setNegativeStockPermission: value => permissions.push(plain(value)) },
  }, { window: { addEventListener: (name, callback) => listeners.set(name, callback) } });
  const request = useInventorySettingsStore.getState().load();
  auth = { username: 'cashier', expiresAt: 200 };
  listeners.get('session')();
  resolve({ allowNegativeStock: true, canSellNegative: true });
  await request;
  assert.equal(useInventorySettingsStore.getState().canSellNegative, false);
  assert.equal(useInventorySettingsStore.getState().loaded, false);
  assert.ok(permissions.every(value => value.canSellNegative === false));
});

test('out-of-stock errors keep product/barcode and forbidden messages supplied by the server', () => {
  const source = readFileSync(new URL('../src/store/savdoStore.ts', import.meta.url), 'utf8');
  const file = ts.createSourceFile('savdoStore.ts', source, ts.ScriptTarget.Latest, true);
  const fn = file.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'tasdiqlashXatoligiMatni');
  const code = ts.transpileModule(fn.getText(file), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { getApiErrorMessage: error => error.response.data.message };
  runInNewContext(code, context);
  for (const [code, message] of [['errors.inventory.out_of_stock', 'Sement M400 (478000123): qoldiq yetmaydi'], ['errors.inventory.negative_stock_forbidden', 'Sement M400: minusga sotish uchun ruxsatingiz yo‘q']]) {
    assert.equal(context.tasdiqlashXatoligiMatni({ response: { data: { code, message } } }), message);
  }
});

test('barcode selection allows a catalogue item with no stock record only with permission and a selected warehouse', () => {
  const source = readFileSync(new URL('../src/Pages/Savdo/YangiSotuvModal.tsx', import.meta.url), 'utf8');
  const file = ts.createSourceFile('YangiSotuvModal.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression;
  function find(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === 'sotuvga') expression = node.initializer.getText(file);
    ts.forEachChild(node, find);
  }
  find(file);
  assert.ok(expression);
  const item = { modificationId: 'cement', quantity: 0 };
  for (const [canSellNegative, warehouseId, count] of [[false, 'w', 0], [true, '', 0], [true, 'w', 1]]) {
    const result = runInNewContext(expression, { mos: [item], canSellNegative, warehouseId, qoldiqMiqdori: row => row.quantity });
    assert.equal(result.length, count);
  }
});
