import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const noop = () => {};
const customer = { id: 'new-customer', firstName: 'Ali', lastName: 'Valiyev', phone: '+998901234567' };

// Run the actual page handlers and rendered JSX with isolated hooks/API boundaries.
function page(path, routeState = null, overrides = {}) {
  let states = [], cursor = 0, effects = [], deps = [], navigations = [];
  const store = new Proxy({
    cart: [], narxTuri: 'chakana', mijozlar: [], xodimlar: [], qoldiqlar: [],
    profil: { id: 'cashier' }, kurs: 12000,
  }, { get: (target, key) => key in target ? target[key] : noop });
  const useStore = selector => selector ? selector(store) : store;
  useStore.getState = () => store;
  useStore.setState = noop;
  const api = new Proxy({
    mijozlarRoyxatiniOlish: async () => [],
    omborlarRoyxatiniOlish: async () => [{ id: 'warehouse-1' }, { id: 'warehouse-2' }],
    royxat: async () => [],
    yaratish: async () => customer,
  }, { get: (target, key) => target[key] ?? (async () => []) });
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], next => { states[index] = typeof next === 'function' ? next(states[index]) : next; }];
    },
    useRef(initial) { return hooks.useState(() => ({ current: initial }))[0]; },
    useMemo(fn) { return fn(); },
    useCallback(fn) { return fn; },
    useEffect(fn, nextDeps) {
      const index = cursor++;
      if (!deps[index] || nextDeps.some((value, i) => value !== deps[index][i])) effects.push(fn);
      deps[index] = nextDeps;
    },
  };
  const translate = { t: key => key };
  const navigate = (...args) => navigations.push(args);
  const mocks = {
    react: hooks,
    'react-i18next': { useTranslation: () => translate },
    'react-router-dom': { useLocation: () => ({ state: routeState, pathname: '/' }), useNavigate: () => navigate },
    'react-router': { useLocation: () => ({ state: routeState, pathname: '/' }), useNavigate: () => navigate },
    '@/lib/valyuta': { pulMatni: String, useValyutaStore: useStore },
    '@/store/posStore': { usePosStore: useStore },
    '@/store/savdoStore': { useSavdoStore: useStore },
    '@/store/authProfileStore': { useAuthProfileStore: useStore },
    '@/store/savdoSozlamalariStore': { useKassaNarxTurlari: () => ({ chakana: true, ulgurji: true }) },
    '@/api/savdoApi': api,
    '@/api/omborApi': { kirimApi: api, omborlarApi: api, omborMasullari: async () => [] },
    '@/api/partnersApi': { mijozlarApi: api, mijozKompaniyalariApi: api, yetkazibBeruvchilarApi: api },
    './backendAdapters': { mijozniUiGa: item => ({ id: item.id, ism: item.firstName, familiya: item.lastName }) },
    '@/Pages/Savdo/savdoYordamchilari': { sotuvHolati: () => 'CONFIRMED' },
    './yordamchilar': { xaridorNomi: x => `${x.ism} ${x.familiya}`, kompaniyaNomi: noop, asosiyTelefon: noop },
    '@/lib/telegramXabarnoma': { mijozTelegramSonlari: () => ({}), telegramUstuniKorinadimi: () => false },
    ...overrides,
  };
  const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports = {};
  runInNewContext(outputText, {
    exports, TextEncoder, window: { addEventListener: noop, removeEventListener: noop },
    require: name => mocks[name] ?? (name === 'react/jsx-runtime' ? require(name) : new Proxy({}, { get: (_, key) => key === 'default' ? name : noop })),
  });
  return {
    render(props = {}) { cursor = 0; return exports.default(props); },
    async effects() { const pending = effects; effects = []; pending.forEach(fn => fn()); await new Promise(resolve => setImmediate(resolve)); },
    navigations,
  };
}

function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== 'object') return [];
  return [node, ...elements(node.props?.children)];
}
const find = (tree, predicate) => elements(tree).find(predicate);

const modalOf = tree => find(tree, el => el.type === '@/Pages/XaridorUchot/XaridorModal');
const newCustomer = { id: 'temporary', ism: 'Ali', familiya: 'Valiyev', telefonlar: [customer.phone], manzil: '', kompaniyaId: '', lavozim: '', ijtimoiy: { telegram: '', whatsapp: '', instagram: '' } };

async function openModal(overrides = {}) {
  const home = page('../src/Pages/BoshSahifa/index.tsx', null, overrides);
  let tree = home.render();
  find(tree, el => el.props?.placeholder === 'customer.discountPlaceholder').props.onChange('500');
  find(tree, el => el.type === 'button' && el.key === 'doimiy').props.onClick();
  tree = home.render();
  find(tree, el => el.props?.placeholder === 'customer.searchPlaceholder').props.onChange({ target: { value: 'Ali' } });
  await home.effects();
  tree = home.render();
  find(tree, el => el.type === 'button' && [el.props.children].flat().includes('customer.addCustomer')).props.onClick();
  return home;
}

test('Add customer opens the existing modal directly over POS without navigating', async () => {
  const home = await openModal();
  const modal = modalOf(home.render());
  assert.ok(modal, 'existing customer modal must be rendered on the home page');
  assert.equal(modal.props.boshlangich, null);
  assert.equal(home.navigations.length, 0, 'never open the customers section');
  modal.props.onYopish();
  const tree = home.render();
  assert.equal(modalOf(tree), undefined);
  assert.equal(find(tree, el => el.props?.placeholder === 'customer.searchPlaceholder').props.value, 'Ali');
});

test('successful save closes the modal and shows/selects the new customer while preserving discount', async () => {
  const home = await openModal();
  await modalOf(home.render()).props.onSaqlash(newCustomer);
  let tree = home.render();
  assert.equal(modalOf(tree), undefined);
  assert.equal(home.navigations.length, 0);
  assert.equal(find(tree, el => el.props?.placeholder === 'customer.searchPlaceholder').props.value, 'Ali Valiyev');
  const card = find(tree, el => el.type === 'button' && el.key === customer.id);
  assert.ok(card);
  assert.match(card.props.className, /border-gold-500/);
  find(tree, el => el.type === 'button' && el.key === 'donalik').props.onClick();
  tree = home.render();
  assert.equal(find(tree, el => el.props?.placeholder === 'customer.discountPlaceholder').props.value, 500);
});

test('failed save leaves the modal open and keeps the original POS search', async () => {
  const home = await openModal({ '@/api/partnersApi': {
    mijozlarApi: { yaratish: async () => { throw new Error('Phone already exists'); } },
    mijozKompaniyalariApi: { royxat: async () => [] },
  } });
  await assert.rejects(modalOf(home.render()).props.onSaqlash(newCustomer), /Phone already exists/);
  const tree = home.render();
  assert.ok(modalOf(tree));
  assert.equal(home.navigations.length, 0);
  assert.equal(find(tree, el => el.props?.placeholder === 'customer.searchPlaceholder').props.value, 'Ali');
});

test('a pending save blocks close and duplicate creation until it succeeds', async () => {
  let resolveSave, calls = 0;
  const pending = new Promise(resolve => { resolveSave = resolve; });
  const home = await openModal({ '@/api/partnersApi': {
    mijozlarApi: { yaratish: () => { calls++; return pending; } },
    mijozKompaniyalariApi: { royxat: async () => [] },
  } });
  const modal = modalOf(home.render());
  const saving = modal.props.onSaqlash(newCustomer);
  modal.props.onYopish();
  await modal.props.onSaqlash(newCustomer);
  assert.equal(calls, 1);
  assert.ok(modalOf(home.render()));
  resolveSave(customer);
  await saving;
  assert.equal(modalOf(home.render()), undefined);
  assert.equal(home.navigations.length, 0);
});

test('the existing form retains extra phones, socials and company in the create payload', async () => {
  let payload;
  const home = await openModal({ '@/api/partnersApi': {
    mijozlarApi: { yaratish: async data => { payload = data; return customer; } },
    mijozKompaniyalariApi: { royxat: async () => [] },
  } });
  await modalOf(home.render()).props.onSaqlash({ ...newCustomer, familiya: '', kompaniyaId: 'company', telefonlar: [customer.phone, '+998991234567'], ijtimoiy: { telegram: '@ali', whatsapp: 'wa', instagram: 'ig' } });
  assert.equal(payload.firstName, 'Ali');
  assert.equal(payload.lastName, undefined);
  assert.equal(payload.companyId, 'company');
  assert.equal(payload.telegramId, '@ali');
  assert.equal(payload.customFields.extraPhones[0], '+998991234567');
  assert.equal(payload.customFields.whatsapp, 'wa');
});
