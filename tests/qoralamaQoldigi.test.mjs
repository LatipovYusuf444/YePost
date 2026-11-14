// TZ 14.11.2026: qoldiq kam bo'lsa ham savdo qoralamasi saqlanadi (faqat ogohlantirish); qoldiq faqat "Ombordan chiqarish"da tekshiriladi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const { qoldiqYetmaydimi, yetmaydiganTovarlar } = require('../src/lib/qoralamaQoldigi.ts');
const plain = (v) => JSON.parse(JSON.stringify(v));
const noop = () => {};
const nodes = value => Array.isArray(value) ? value.flatMap(nodes) : !value || typeof value !== 'object' ? [] : [value, ...nodes(value.props?.children)];

test('yetishmovchilik: bir xil tovar qatorlari qo\'shiladi, qoldig\'i noma\'lum tovar backendga qoldiriladi', () => {
  assert.equal(qoldiqYetmaydimi(1, 0), true);
  assert.equal(qoldiqYetmaydimi(5, 5), false);
  const qoldiq = { a: 0, b: 5, c: 100 };
  const natija = yetmaydiganTovarlar(
    [{ modificationId: 'a', quantity: 1, nom: '0 SHINA 10 TALI' }, { modificationId: 'b', quantity: 3, nom: 'B' }, { modificationId: 'b', quantity: 3, nom: 'B' }, { modificationId: 'c', quantity: 1, nom: 'C' }, { modificationId: 'x', quantity: 9, nom: 'X' }],
    (id) => (id in qoldiq ? qoldiq[id] : null)
  );
  assert.deepEqual(plain(natija), [{ modificationId: 'a', nom: '0 SHINA 10 TALI', mavjud: 0, kerak: 1 }, { modificationId: 'b', nom: 'B', mavjud: 5, kerak: 6 }]);
});

test('qoralama tahrirlagichi: qoldiq yetmasligi xato emas (saqlash to\'xtamaydi), boshqa miqdor xatolari xato', () => {
  const { xatoBormi } = require('../src/lib/qoralamaTahriri.ts');
  assert.equal(xatoBormi({ miqdor: { kod: 'qoldiq', mavjud: 0 } }), false);
  assert.equal(xatoBormi({ miqdor: { kod: 'nol' } }), true);
  assert.equal(xatoBormi({ miqdor: { kod: 'qoldiq', mavjud: 0 }, narx: 'kerak' }), true);
});

function sotuvOynasi(canSellNegative) {
  let cursor = 0;
  const states = [];
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
    useRef(initial) { return hooks.useState(() => ({ current: initial }))[0]; },
    useMemo: fn => fn(), useCallback: fn => fn, useEffect: noop, useLayoutEffect: noop, useId: () => 'id',
  };
  const mocks = {
    react: hooks,
    'react-i18next': { useTranslation: () => ({ t: (key, p) => (p ? `${key}:${JSON.stringify(p)}` : key) }) },
    '@/lib/utils': { cn: (...args) => args.filter(Boolean).join(' ') },
    '@/lib/hujjatSanasi': { bugungiToshkentKuni: () => '2026-11-14', yangiHujjatSanasi: () => ({}) },
    '@/lib/savdoNarxlari': require('../src/lib/savdoNarxlari.ts'),
    '@/lib/umumiyChegirma': require('../src/lib/umumiyChegirma.ts'),
    '@/lib/mijozQidiruvi': require('../src/lib/mijozQidiruvi.ts'),
    '@/lib/qoralamaQoldigi': require('../src/lib/qoralamaQoldigi.ts'),
    '@/lib/kopBirlik': require('../src/lib/kopBirlik.ts'),
    '@/lib/valyuta': { useValyutaStore: selector => selector({ kurs: 12000, kursBor: true, rejimYoniq: true }) },
    '@/store/authProfileStore': { useAuthProfileStore: selector => selector({ profil: { id: 'cashier' }, profilniYuklash: noop }) },
    '@/store/inventorySettingsStore': { useInventorySettingsStore: selector => selector({ canSellNegative }) },
    '@/store/savdoSozlamalariStore': { useSavdoSozlamalariStore: selector => selector({ narxTurlari: ['RETAIL', 'WHOLESALE'], yuklash: noop }) },
    './savdoYordamchilari': { pulniFormatlash: String },
    '@/hooks/useMaydonXatolari': { useMaydonXatolari: () => ({ xato: () => undefined, bor: false, tepadagi: '', ornat() {}, tozala() {}, tekshiruv() {}, serverdan: () => false, kuzat: (f) => f() }) },
  };
  const compiled = ts.transpileModule(readFileSync(new URL('../src/Pages/Savdo/YangiSotuvModal.tsx', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { exports: {}, TextEncoder, window: { location: { origin: 'http://x', href: 'http://x/savdo' }, requestAnimationFrame: noop }, require(name) {
    return mocks[name] ?? (name === 'react/jsx-runtime' ? require(name) : new Proxy({ __esModule: true, default: name }, { get: (target, key) => target[key] ?? noop }));
  } };
  runInNewContext(compiled, context);
  const stock = (id, nom, soni) => ({ modificationId: id, warehouseId: 'w', quantity: soni, sellingPrice: 100, birliklar: [], modification: { id, product: { name: nom }, price: { retailPrice: 100 } } });
  const saved = [];
  const props = { omborlar: [{ id: 'w', name: '4-134' }], mijozlar: [], mijozKompaniyalari: [], xodimlar: [], qoldiqlar: [stock('a', '0 SHINA 10 TALI', 0), stock('b', 'Besh', 5)], onOmborTanlash: noop, onYopish: noop, onSaqlash: async data => { saved.push(data); return false; } };
  const render = () => { cursor = 0; return context.exports.default(props); };
  const find = predicate => nodes(render()).find(predicate);
  return { saved, render, find };
}

test('ruxsat o\'chiq: qoldig\'i 0 tovar tanlanadi, 5 talik tovarga 20 yoziladi, qoralama saqlanadi; qatorda va pastda sariq ogohlantirish', async () => {
  const s = sotuvOynasi(false);
  const tanlov = () => s.find(n => n.type === './SavdoSelect' && n.props.placeholder === 'placeholders.selectProduct');
  const variant = tanlov().props.options.find(o => o.value === 'a::w');
  assert.ok(variant, 'qoldig\'i 0 tovar ro\'yxatda');
  assert.notEqual(variant.disabled, true, 'tanlab bo\'ladi');
  tanlov().props.onChange('a::w');
  s.find(n => n.type === 'button' && [n.props.children].flat().includes('actions.addProduct')).props.onClick();
  nodes(s.render()).filter(n => n.type === './SavdoSelect' && n.props.placeholder === 'placeholders.selectProduct')[1].props.onChange('b::w');
  s.find(n => n.props?.['data-sotuv-miqdor'] === 1).props.onChange({ target: { value: '20' } });
  assert.equal(s.find(n => n.props?.['data-sotuv-miqdor'] === 1).props.value, '20', '5 ga qisqartirilmaydi');
  const tree = nodes(s.render());
  assert.ok(tree.some(n => n.props?.['data-qoldiq-ogohlantirish'] === 0));
  assert.ok(tree.some(n => n.props?.['data-qoldiq-ogohlantirish'] === 1));
  assert.ok(tree.some(n => n.props?.['data-qoldiq-xulosa']));
  await s.find(n => n.type === 'form').props.onSubmit({ preventDefault: noop });
  assert.equal(s.saved.length, 1, 'qoralama saqlandi (POST /sales)');
  assert.deepEqual(plain(s.saved[0].items).map(i => [i.modificationId, i.quantity]), [['a', 1], ['b', 20]]);
});

test('ruxsat yoqilgan: hozirgidek — ogohlantirish yo\'q, saqlanadi', async () => {
  const s = sotuvOynasi(true);
  s.find(n => n.type === './SavdoSelect' && n.props.placeholder === 'placeholders.selectProduct').props.onChange('a::w');
  assert.equal(nodes(s.render()).some(n => n.props?.['data-qoldiq-ogohlantirish'] !== undefined), false);
  await s.find(n => n.type === 'form').props.onSubmit({ preventDefault: noop });
  assert.equal(s.saved.length, 1);
});

test('"Ombordan chiqarish": ruxsat o\'chiq bo\'lsa yangi qoldiq bilan oldindan tekshiriladi, yetmasa ro\'yxat ko\'rsatiladi, backend rad etsa ham', () => {
  const kod = readFileSync(new URL('../src/Pages/Savdo/SotuvTafsilotlariModal.tsx', import.meta.url), 'utf8');
  assert.match(kod, /const ruxsatYoq = !useInventorySettingsStore\.getState\(\)\.canSellNegative;/);
  assert.match(kod, /await qoldiqlarniYuklash\(sotuv\.warehouseId \?\? sotuv\.warehouse\?\.id\);\s*const yetmaydi = yetishmovchilikHisobi\(false\);/);
  assert.match(kod, /if \(ruxsatYoq\) setYetmaydiganlar\(yetishmovchilikHisobi\(true\)\);/);
  assert.match(kod, /t\("ombordanChiqarish\.qoldiqYetmaydiQatori"/);
  // Qoralama saqlashda qoldiq tekshiruvi (errors.insufficientStock) endi yo'q
  assert.doesNotMatch(readFileSync(new URL('../src/Pages/Savdo/YangiSotuvModal.tsx', import.meta.url), 'utf8'), /errors\.insufficientStock|products\.scanNotEnough/);
});
