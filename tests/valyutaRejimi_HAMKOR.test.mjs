import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Valyuta rejimi (backend 11.11.2026): mijoz va yetkazib beruvchining boshlang'ich qarzi. DUAL — valyuta tanlovi (avvalgidek);
// UZS_ONLY / USD_ONLY — tanlov yashirin, qarz rejim valyutasida yuboriladi (boshqasini backend errors.currency.not_allowed bilan rad etadi).
const require = createRequire(import.meta.url);
const noop = () => {};
const nodes = value => Array.isArray(value) ? value.flatMap(nodes) : !value || typeof value !== 'object' ? [] : [value, ...nodes(value.props?.children)];
const matn = value => Array.isArray(value) ? value.map(matn).join('') : value && typeof value === 'object' ? matn(value.props?.children) : value == null || value === false ? '' : String(value);

// Rejim holati — `@/lib/valyuta` yordamchilari bilan bir xil ma'noda.
const holat = { rejim: 'DUAL', asosiy: 'UZS' };
const yagona = () => (holat.rejim === 'UZS_ONLY' ? 'UZS' : holat.rejim === 'USD_ONLY' ? 'USD' : null);
const valyutaMock = {
  useYagonaValyuta: yagona,
  yagonaValyuta: yagona,
  standartValyuta: () => yagona() ?? holat.asosiy,
  ruxsatEtilganValyuta: tanlangan => yagona() ?? (tanlangan ? (String(tanlangan).toUpperCase() === 'USD' ? 'USD' : 'UZS') : holat.asosiy),
};

function component(path, overrides = {}) {
  let cursor = 0;
  const states = [];
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
    useRef(initial) { return hooks.useState(() => ({ current: initial }))[0]; },
    useMemo: fn => fn(), useCallback: fn => fn, useEffect: noop,
  };
  const mocks = {
    react: hooks,
    axios: { isAxiosError: () => false },
    'react-i18next': { useTranslation: () => ({ t: (key, opts) => (opts ? `${key} ${JSON.stringify(opts)}` : key) }) },
    '@/lib/valyuta': valyutaMock,
    '@/lib/boshlangichQarz': require('../src/lib/boshlangichQarz.ts'),
    '@/lib/hujjatSanasi': { bugungiToshkentKuni: () => '2026-11-11', kunMatni: String },
    '@/lib/toast': { muvaffaqiyatXabari: noop },
    '@/lib/yetkazibBoshlangichQarz': { YETKAZIB_QARZ_IZOH_UZUNLIGI: 500 },
    '@/api/sozlamalarApi': { getApiErrorMessage: String },
    '@/hooks/useMaydonXatolari': { useMaydonXatolari: () => ({ xato: () => undefined, bor: false, tepadagi: '', ornat: noop, tozala: noop, serverdan: () => false, kuzat: f => f() }) },
    './yordamchilar': { xaridorNomi: x => x.ism },
    ...overrides,
  };
  const compiled = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { exports: {}, Event: class { constructor(type) { this.type = type; } }, window: { dispatchEvent: noop }, require(name) {
    return mocks[name] ?? (name === 'react/jsx-runtime' ? require(name) : new Proxy({ __esModule: true, default: name }, { get: (target, key) => target[key] ?? noop }));
  } };
  runInNewContext(compiled, context);
  return props => { cursor = 0; return context.exports.default(props); };
}

const tick = () => new Promise(resolve => setImmediate(resolve));
const summaMaydoni = tree => nodes(tree).find(node => node.type === '@/Components/common/SummaMaydoni');
const tanlov = tree => nodes(tree).find(node => node.type === 'select');

function mijozQarzi() {
  const yuborilgan = [];
  const render = component('../src/Pages/XaridorUchot/BoshlangichQarzModal.tsx', {
    '@/api/boshlangichQarzApi': { boshlangichQarzYaratish: async (id, data) => { yuborilgan.push(data); return {}; } },
  });
  const props = { xaridor: { id: 'c1', ism: 'Ali' }, onClose: noop };
  return { yuborilgan, render: () => render(props) };
}

function yetkazibQarzi() {
  const yuborilgan = [];
  const render = component('../src/Pages/XaridorUchot/YetkazibBoshlangichQarzModal.tsx', {
    '@/api/yetkazibBoshlangichQarzApi': { yetkazibBoshlangichQarzApi: { yaratish: async (id, data) => { yuborilgan.push(data); return { docNumber: 'YQB-1' }; } } },
  });
  const props = { beruvchi: { id: 's1', nomi: 'Taminotchi' }, onClose: noop };
  return { yuborilgan, render: () => render(props) };
}

async function saqlash(modal, summa = '150') {
  summaMaydoni(modal.render()).props.onChange(summa);
  nodes(modal.render()).find(node => node.type === 'form').props.onSubmit({ preventDefault: noop });
  await tick();
  return modal.yuborilgan.at(-1);
}

for (const [nomi, yarat] of [['mijoz', mijozQarzi], ['yetkazib beruvchi', yetkazibQarzi]]) {
  test(`${nomi} boshlang'ich qarzi — DUAL: valyuta tanlovi bor, standart so'm, tanlangan dollar yuboriladi`, async () => {
    holat.rejim = 'DUAL';
    const modal = yarat();
    const tree = modal.render();
    assert.ok(tanlov(tree), 'ikki valyuta rejimida tanlov ko‘rinadi');
    assert.equal(tanlov(tree).props.value, 'UZS');
    assert.equal(matn(nodes(tree).find(node => node.type === 'label')), 'openingDebt.amount', 'DUAL da summa yorlig‘i o‘zgarmaydi');
    tanlov(tree).props.onChange({ target: { value: 'USD' } });
    assert.equal((await saqlash(modal)).currency, 'USD');
    const yangi = yarat();
    assert.equal((await saqlash(yangi)).currency, 'UZS');
  });

  for (const [rejim, valyuta] of [['UZS_ONLY', 'UZS'], ['USD_ONLY', 'USD']]) {
    test(`${nomi} boshlang'ich qarzi — ${rejim}: tanlov yashirin, qarz ${valyuta} da yuboriladi`, async () => {
      holat.rejim = rejim;
      const modal = yarat();
      const tree = modal.render();
      assert.equal(tanlov(tree), undefined, 'bir valyutali rejimda valyuta tanlovi chizilmaydi');
      assert.ok(matn(nodes(tree).find(node => node.type === 'label')).includes(`(${valyuta})`), 'summa yorlig‘ida rejim valyutasi');
      const payload = await saqlash(modal, '1 250');
      assert.deepEqual({ amount: payload.amount, currency: payload.currency }, { amount: 1250, currency: valyuta });
    });
  }

  test(`${nomi} boshlang'ich qarzi — oyna ochiq turganda rejim bir valyutaliga o'tsa, tanlangan boshqa valyuta yuborilmaydi`, async () => {
    holat.rejim = 'DUAL';
    const modal = yarat();
    tanlov(modal.render()).props.onChange({ target: { value: 'USD' } });
    holat.rejim = 'UZS_ONLY';
    assert.equal((await saqlash(modal)).currency, 'UZS');
    holat.rejim = 'DUAL';
  });
}

test('Excel importi: bir valyutali rejimda fayldagi valyuta haqida izoh, DUAL da yo‘q', () => {
  const render = component('../src/Pages/XaridorUchot/BoshlangichQarzImportModal.tsx', {
    '@/api/boshlangichQarzApi': { boshlangichQarzImporti: noop, boshlangichQarzShabloni: noop },
    '@/lib/maydonXatolari': { serverXatoMaydonlari: () => ({}) },
  });
  const izohlar = () => nodes(render({ onClose: noop })).map(node => node.props?.children).filter(child => typeof child === 'string' && child.startsWith('openingDebt.import.modeHint'));
  holat.rejim = 'DUAL';
  assert.deepEqual(izohlar(), []);
  holat.rejim = 'USD_ONLY';
  assert.deepEqual(izohlar(), ['openingDebt.import.modeHintUSD']);
  holat.rejim = 'UZS_ONLY';
  assert.deepEqual(izohlar(), ['openingDebt.import.modeHintUZS']);
  holat.rejim = 'DUAL';
});

test('eski qarzga to‘lov: Faqat dollar rejimida so‘mdagi qarzga ogohlantirish (DUAL va Faqat so‘mda yo‘q)', () => {
  const render = component('../src/Pages/XaridorUchot/BoshlangichQarzTafsilotlariModal.tsx', {
    '@/api/savdoApi': { sotuvTafsilotiniOlish: async () => ({}), sotuvniBekorQilish: noop },
    '@/api/boshlangichQarzApi': { mijozQarziniTolash: noop },
    '@/store/authProfileStore': { useAuthProfileStore: selector => selector({ profil: { id: 'u' }, profilniYuklash: noop }) },
    '@/Pages/Savdo/savdoYordamchilari': {
      mijozNomi: () => 'Ali', pulniFormatlash: String, sotuvQarzdorlikSummasi: () => 500000, sotuvRaqami: () => 'BQ-1',
      sotuvSummasi: () => 500000, sotuvTolanganSummasi: () => 0, sotuvValyutasi: sotuv => sotuv.currency, tolovValyutasi: () => 'UZS',
    },
  });
  const props = { sotuvId: 'd1', boshlangich: { id: 'd1', customerId: 'c1', currency: 'UZS', isOpeningDebt: true, status: 'CONFIRMED' }, onClose: noop };
  const ogohlantirish = () => nodes(render(props)).some(node => typeof node.props?.children === 'string' && node.props.children.startsWith('openingDebt.payment.modeMismatch'));
  for (const [rejim, kutilgan] of [['DUAL', false], ['UZS_ONLY', false], ['USD_ONLY', true]]) {
    holat.rejim = rejim;
    assert.equal(ogohlantirish(), kutilgan, rejim);
  }
  holat.rejim = 'DUAL';
});
