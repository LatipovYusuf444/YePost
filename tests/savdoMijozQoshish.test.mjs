import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const noop = () => {};
const nodes = value => Array.isArray(value) ? value.flatMap(nodes) : !value || typeof value !== 'object' ? [] : [value, ...nodes(value.props?.children)];
function component(path, overrides = {}) {
  let cursor = 0;
  const states = [];
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
    useRef(initial) { return hooks.useState(() => ({ current: initial }))[0]; },
    useMemo: fn => fn(), useCallback: fn => fn, useEffect: noop, useLayoutEffect: noop, useId: () => 'select-id',
  };
  const mocks = {
    react: hooks, 'react-dom': { createPortal: node => node },
    'react-i18next': { useTranslation: () => ({ t: key => key }) },
    '@/lib/utils': { cn: (...args) => args.join(' ') },
    '@/lib/hujjatSanasi': { bugungiToshkentKuni: () => '2026-10-24' },
    '@/lib/savdoNarxlari': require('../src/lib/savdoNarxlari.ts'),
    '@/lib/kopBirlik': require('../src/lib/kopBirlik.ts'),
    '@/lib/valyuta': { useValyutaStore: selector => selector({ kurs: 12000, kursBor: true, rejimYoniq: true }) },
    '@/store/authProfileStore': { useAuthProfileStore: selector => selector({ profil: { id: 'cashier' }, profilniYuklash: noop }) },
    '@/store/savdoSozlamalariStore': { useSavdoSozlamalariStore: selector => selector({ narxTurlari: ['RETAIL', 'WHOLESALE'], yuklash: noop }) },
    './savdoYordamchilari': { pulniFormatlash: String },
    '@/Pages/XaridorUchot/backendAdapters': { kompaniyaniUiGa: item => ({ id: item.id, nomi: item.name }) },
    ...overrides,
  };
  const compiled = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { exports: {}, TextEncoder, window: { location: { origin: 'http://localhost', href: 'http://localhost/savdo' }, requestAnimationFrame: noop }, require(name) {
    return mocks[name] ?? (name === 'react/jsx-runtime' ? require(name) : new Proxy({ __esModule: true, default: name }, { get: (target, key) => target[key] ?? noop }));
  } };
  runInNewContext(compiled, context);
  return props => { cursor = 0; return context.exports.default(props); };
}

test('empty customer search exposes an opt-in add button and keeps Tab available to reach it', () => {
  let opened = 0;
  const render = component('../src/Pages/Savdo/SavdoSelect.tsx');
  const props = { value: '', onChange: noop, klaviatura: true, options: [{ value: 'known', label: 'Ali' }], boshNatijaAmali: { label: 'Mijoz qo‘shish', onClick: () => opened++ } };
  let tree = render(props);
  nodes(tree).find(node => node.type === 'button').props.onClick();
  tree = render(props);
  assert.equal(nodes(tree).some(node => node.props?.children === 'Mijoz qo‘shish'), false);
  nodes(tree).find(node => node.type === 'input').props.onChange({ target: { value: 'Not found' } });
  tree = render(props);
  const action = nodes(tree).find(node => node.type === 'button' && node.props['aria-label'] === 'Mijoz qo‘shish');
  assert.ok(action, 'no matching customer must offer the create action');
  let prevented = false;
  nodes(tree).find(node => node.type === 'input').props.onKeyDown({ key: 'Tab', nativeEvent: {}, stopPropagation: noop, preventDefault: () => { prevented = true; } });
  tree = render(props);
  assert.equal(prevented, false);
  assert.ok(nodes(tree).find(node => node.type === 'button' && node.props['aria-label'] === 'Mijoz qo‘shish'));
  action.props.onClick();
  assert.equal(opened, 1);
  assert.equal(nodes(render(props)).some(node => node.type === 'input'), false, 'dropdown closes before opening customer modal');
});

test('other selects retain their normal empty state without a create action', () => {
  const render = component('../src/Pages/Savdo/SavdoSelect.tsx');
  const props = { value: '', onChange: noop, klaviatura: true, options: [] };
  nodes(render(props)).find(node => node.type === 'button').props.onClick();
  assert.equal(nodes(render(props)).filter(node => node.type === 'button').length, 1);
});

const draftCustomer = { id: 'temporary-ui-id', ism: 'Ali', familiya: 'Valiyev', telefonlar: ['+998901234567', '+998909999999'], ijtimoiy: { telegram: 'ali', whatsapp: 'whatsapp', instagram: '' }, manzil: 'Address', kompaniyaId: 'company', lavozim: 'Manager', customFields: { source: 'sales' } };
const savedCustomer = { id: 'real-backend-id', firstName: 'Ali', lastName: 'Valiyev', phone: '+998901234567', companyId: 'company', balance: 0, balanceCurrency: 'UZS' };
function saleEditor(create = async () => savedCustomer) {
  const calls = [], updated = [];
  const render = component('../src/Pages/Savdo/YangiSotuvModal.tsx', {
    '@/api/partnersApi': { mijozlarApi: { yaratish: async payload => { calls.push(payload); return create(payload); } } },
    '@/store/savdoStore': { useSavdoStore: { getState: () => ({ mijozMalumotiniYangilash: item => updated.push(item) }) } },
  });
  const props = { omborlar: [], mijozlar: [], mijozKompaniyalari: [{ id: 'company', name: 'Existing company' }], xodimlar: [], qoldiqlar: [], amalBajarilmoqda: false, onOmborTanlash: noop, onSaqlash: noop, onYopish: noop };
  return { calls, updated, render: () => render(props) };
}
const customerSelect = tree => nodes(tree).find(node => node.type === './SavdoSelect' && node.props.placeholder === 'placeholders.clientSearch');
const customerModal = tree => nodes(tree).find(node => node.type === '@/Pages/XaridorUchot/XaridorModal');

test('sales opens the existing customer modal and selects the saved backend customer without losing the sale form', async () => {
  const editor = saleEditor();
  let tree = editor.render();
  const name = nodes(tree).find(node => node.type === 'input' && node.props.placeholder === 'modal.saleNamePlaceholder');
  name.props.onChange({ target: { value: 'Keep sale name' } });
  customerSelect(tree).props.boshNatijaAmali.onClick();
  tree = editor.render();
  const modal = customerModal(tree);
  assert.ok(modal);
  assert.equal(modal.props.boshlangich, null);
  assert.equal(modal.props.kompaniyalar[0].nomi, 'Existing company');
  await modal.props.onSaqlash(draftCustomer);
  tree = editor.render();
  assert.equal(customerModal(tree), undefined);
  assert.equal(customerSelect(tree).props.value, 'real-backend-id');
  assert.match(customerSelect(tree).props.options.find(option => option.value === savedCustomer.id).label, /Ali Valiyev/);
  assert.equal(nodes(tree).find(node => node.type === './SavdoSelect' && node.props.placeholder === 'placeholders.companySearch').props.value, 'company');
  assert.equal(nodes(tree).find(node => node.type === 'input' && node.props.placeholder === 'modal.saleNamePlaceholder').props.value, 'Keep sale name');
  assert.equal(editor.calls[0].customFields.position, 'Manager');
  assert.equal(editor.calls[0].customFields.extraPhones[0], '+998909999999');
  assert.equal(editor.calls[0].companyId, 'company');
  assert.equal(editor.updated[0].id, 'real-backend-id');
});

test('failed customer save keeps the customer modal open and leaves the sale customer unchanged', async () => {
  const editor = saleEditor(async () => { throw new Error('Existing backend validation error'); });
  customerSelect(editor.render()).props.boshNatijaAmali.onClick();
  await assert.rejects(customerModal(editor.render()).props.onSaqlash(draftCustomer), /validation error/);
  assert.ok(customerModal(editor.render()));
  assert.equal(customerSelect(editor.render()).props.value, '');
  assert.equal(editor.updated.length, 0);
  customerModal(editor.render()).props.onYopish();
  assert.equal(customerModal(editor.render()), undefined);
});

test('repeated save and close actions cannot duplicate or dismiss an in-flight customer creation', async () => {
  let finish;
  const editor = saleEditor(() => new Promise(resolve => { finish = resolve; }));
  customerSelect(editor.render()).props.boshNatijaAmali.onClick();
  const modal = customerModal(editor.render());
  const saving = modal.props.onSaqlash(draftCustomer);
  await modal.props.onSaqlash(draftCustomer);
  modal.props.onYopish();
  assert.equal(editor.calls.length, 1);
  assert.ok(customerModal(editor.render()));
  finish(savedCustomer);
  await saving;
  assert.equal(customerModal(editor.render()), undefined);
  assert.equal(customerSelect(editor.render()).props.value, savedCustomer.id);
});
