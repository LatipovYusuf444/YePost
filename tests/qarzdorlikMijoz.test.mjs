import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Qarzdorliklar ro'yxati: GET /sales?openingDebt=true boshlang'ich qarzlari faqat customerId bilan keladi.
// Sahifa ularni do'kon ro'yxatidan boyitishi va ro'yxatda yo'q mijozni id bo'yicha so'rashi kerak — aks holda "Doimiy mijoz" chiqadi.
const require = createRequire(import.meta.url);
function compile(path, dependencies, globals = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { ...globals, exports: {}, require: name => {
    if (name in dependencies) return dependencies[name];
    if (name === 'react/jsx-runtime') return require(name);
    throw new Error(`Unmocked dependency: ${name}`);
  } };
  runInNewContext(code, context);
  return context.exports;
}

// Minimal hooks runtime: renders the component repeatedly, runs effects whose deps changed and lets pending promises settle.
function hooksRuntime() {
  const states = [];
  const effects = [];
  let cursor = 0;
  let effectCursor = 0;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
    },
    useMemo: factory => factory(),
    useCallback: fn => fn,
    useEffect(fn, deps) {
      const index = effectCursor++;
      const previous = effects[index];
      const changed = !previous || !deps || deps.length !== previous.deps.length || deps.some((dep, i) => !Object.is(dep, previous.deps[i]));
      effects[index] = { deps, run: changed ? fn : null, cleanup: previous?.cleanup };
    },
  };
  async function render(component, props) {
    let tree;
    for (let round = 0; round < 8; round++) {
      cursor = 0; effectCursor = 0;
      tree = component(props);
      for (const effect of effects) {
        if (!effect.run) continue;
        effect.cleanup?.();
        const cleanup = effect.run();
        effect.cleanup = typeof cleanup === 'function' ? cleanup : undefined;
        effect.run = null;
      }
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    return tree;
  }
  return { react, render };
}

const texts = value => Array.isArray(value) ? value.flatMap(texts) : value && typeof value === 'object' ? texts(value.props?.children) : value == null || typeof value === 'boolean' ? [] : [String(value)];

const yordamchilar = compile('../src/Pages/Savdo/savdoYordamchilari.ts', {
  '@/lib/valyuta': { pulMatni: value => String(value), oziValyutadaMatn: value => String(value), useValyutaStore: { getState: () => ({}) }, valyutaKodi: value => value },
});

function sahifaniYaratish({ openingDebts, mijozlar }) {
  const calls = [];
  const store = {
    mijozlar,
    mijozKompaniyalari: [],
    sotuvlarniBoyitish: items => items.map(item => item.customer || !item.customerId ? item : { ...item, customer: store.mijozlar.find(mijoz => mijoz.id === item.customerId) }),
    mijozlarniOldindanYuklash: async () => {},
    mijozlarniTuldirish: async ids => {
      calls.push([...ids]);
      store.mijozlar = [...store.mijozlar, ...ids.filter(id => !store.mijozlar.some(mijoz => mijoz.id === id)).map(id => ({ id, firstName: '4-54', lastName: '', phone: '+998 90 123 45 67' }))];
    },
  };
  const { react, render } = hooksRuntime();
  const component = compile('../src/Pages/Qarzdorlik/index.tsx', {
    react,
    'react-i18next': { useTranslation: () => ({ t: key => key }) },
    'lucide-react': new Proxy({}, { get: (_, name) => String(name) }),
    '@/Pages/Savdo/JadvalYuklanmoqda': { __esModule: true, default: 'JadvalYuklanmoqda' },
    '@/Pages/Savdo/savdoYordamchilari': yordamchilar,
    '@/Components/common/TablePagination': { __esModule: true, default: 'TablePagination' },
    '@/api/savdoApi': { sotuvlarRoyxatiniOlish: async () => openingDebts },
    '@/api/sozlamalarApi': { getApiErrorMessage: error => error.message },
    '@/store/savdoStore': { useSavdoStore: selector => selector(store) },
  }, { window: { addEventListener() {}, removeEventListener() {} } }).default;
  return { calls, store, render: () => render(component, { sotuvlar: [], onSotuvniOchish() {}, onYangilash() {} }) };
}

const qarz = { id: 'debt-1', number: '37984209', isOpeningDebt: true, status: 'CONFIRMED', customerId: 'c-454', currency: 'USD', totalAmount: '915.57', paidAmount: '0', debtAmount: '915.57', date: '2026-10-01' };

test('opening debt whose customer is not in the loaded list is fetched by id and shown with the real name and phone', async () => {
  const sahifa = sahifaniYaratish({ openingDebts: [qarz], mijozlar: [] });
  const matnlar = texts(await sahifa.render());
  assert.deepEqual(sahifa.calls[0], ['c-454']);
  assert.ok(matnlar.includes('4-54'), matnlar.join(' | '));
  assert.ok(matnlar.includes('+998 90 123 45 67'));
  assert.equal(matnlar.includes(yordamchilar.BIRIKTIRILGAN_MIJOZ_NOMI), false);
  assert.equal(matnlar.includes('noPhone'), false);
});

test('opening debt customer already in the store list is used directly without an extra request', async () => {
  const sahifa = sahifaniYaratish({ openingDebts: [qarz], mijozlar: [{ id: 'c-454', fullName: 'Karimov Anvar', phone: '+998 91 000 00 00' }] });
  const matnlar = texts(await sahifa.render());
  assert.deepEqual(sahifa.calls, []);
  assert.ok(matnlar.includes('Karimov Anvar'));
  assert.ok(matnlar.includes('+998 91 000 00 00'));
});
