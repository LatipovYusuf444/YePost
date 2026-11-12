// TZ 12.11.2026 "Mijoz tanlash/yaratish va umumiy chegirma": kirill/lotin + telefon qidiruvi, "Yangi xaridor" oynasini qidiruv matnidan
// to'ldirish, Kontakt ro'yxatida doim turadigan "+ Mijoz qo'shish", Yangi sotuvda umumiy chegirma (foiz va summa).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const { mijozMosmi, mijozMatniniAjratish, telefonKorinishi } = require('../src/lib/mijozQidiruvi.ts');
const ch = require('../src/lib/umumiyChegirma.ts');

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
    '@/lib/optionlarniCheklash': require('../src/lib/optionlarniCheklash.ts'),
    '@/lib/hujjatSanasi': { bugungiToshkentKuni: () => '2026-11-12', yangiHujjatSanasi: () => ({}) },
    '@/lib/savdoNarxlari': require('../src/lib/savdoNarxlari.ts'),
    '@/lib/umumiyChegirma': ch,
    '@/lib/mijozQidiruvi': require('../src/lib/mijozQidiruvi.ts'),
    '@/lib/kopBirlik': require('../src/lib/kopBirlik.ts'),
    '@/lib/valyuta': { useValyutaStore: selector => selector({ kurs: 12000, kursBor: true, rejimYoniq: true }) },
    '@/store/authProfileStore': { useAuthProfileStore: selector => selector({ profil: { id: 'cashier' }, profilniYuklash: noop }) },
    '@/store/inventorySettingsStore': { useInventorySettingsStore: selector => selector({ canSellNegative: false }) },
    '@/store/savdoSozlamalariStore': { useSavdoSozlamalariStore: selector => selector({ narxTurlari: ['COST', 'RETAIL', 'WHOLESALE'], yuklash: noop }) },
    './savdoYordamchilari': { pulniFormatlash: String },
    '@/Pages/XaridorUchot/backendAdapters': { kompaniyaniUiGa: item => ({ id: item.id, nomi: item.name }) },
    '@/hooks/useMaydonXatolari': { useMaydonXatolari: () => ({ xato: () => undefined, bor: false, tepadagi: '', ornat() {}, tozala() {}, tekshiruv() {}, serverdan: () => false, kuzat: (f) => f() }) },
    ...overrides,
  };
  const compiled = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { exports: {}, TextEncoder, window: { location: { origin: 'http://localhost', href: 'http://localhost/savdo' }, requestAnimationFrame: noop }, require(name) {
    return mocks[name] ?? (name === 'react/jsx-runtime' ? require(name) : new Proxy({ __esModule: true, default: name }, { get: (target, key) => target[key] ?? noop }));
  } };
  runInNewContext(compiled, context);
  return props => { cursor = 0; return context.exports.default(props); };
}

// ── 4. Qidiruv: kirill ↔ lotin, telefon ──
const jamshid = { nomlar: ['JAMSHID'], telefon: '+998777777777' };
test('"жам", "jam", "Jam" va "77777" JAMSHID ni topadi; boshqa so\'z topmaydi', () => {
  for (const soz of ['жам', 'jam', 'Jam', 'ЖАМШИД', '77777', '+998 77 777', 'jamshid']) {
    assert.equal(mijozMosmi(jamshid.nomlar, jamshid.telefon, soz), true, soz);
  }
  assert.equal(mijozMosmi(jamshid.nomlar, jamshid.telefon, 'Abdulaziz'), false);
  assert.equal(mijozMosmi(jamshid.nomlar, jamshid.telefon, ''), true, 'bo\'sh so\'z — hammasi');
  // kirillda saqlangan mijoz lotincha so'z bilan
  assert.equal(mijozMosmi(['Шохрух Каримов'], null, 'shohruh'), true);
  assert.equal(mijozMosmi(['Шохрух Каримов'], null, 'karim'), true);
});

// ── 2. "Yangi xaridor" oynasini matndan to'ldirish ──
test('qidiruv matni: ism / ism+familiya / telefon (TZ jadvali)', () => {
  assert.deepEqual(mijozMatniniAjratish('Abdulaziz'), { ism: 'Abdulaziz', familiya: '', telefon: '' });
  assert.deepEqual(mijozMatniniAjratish('  Abdulaziz   Karimov '), { ism: 'Abdulaziz', familiya: 'Karimov', telefon: '' });
  assert.deepEqual(mijozMatniniAjratish('901234567'), { ism: '', familiya: '', telefon: '+998901234567' });
  assert.deepEqual(mijozMatniniAjratish('+998 90 123 45 67'), { ism: '', familiya: '', telefon: '+998901234567' });
  assert.deepEqual(mijozMatniniAjratish('998901234567'), { ism: '', familiya: '', telefon: '+998901234567' });
  assert.deepEqual(mijozMatniniAjratish(''), { ism: '', familiya: '', telefon: '' });
  assert.equal(telefonKorinishi('+998777777777'), '+998 77 777 77 77');
});

test('XaridorModal: boshlangichMatn faqat yangi mijozda ism/familiya/telefonni to\'ldiradi va kursor bo\'sh majburiy maydonga', () => {
  const kod = readFileSync(new URL('../src/Pages/XaridorUchot/XaridorModal.tsx', import.meta.url), 'utf8');
  assert.match(kod, /boshlangich \? null : mijozMatniniAjratish\(boshlangichMatn\)/);
  assert.match(kod, /useState\(boshlangich\?\.ism \?\? matndan\?\.ism \?\? ""\)/);
  assert.match(kod, /\[matndan\?\.telefon \?\? ""\]/);
  assert.match(kod, /if \(!ismRef\.current\?\.value\.trim\(\)\) ismRef\.current\?\.focus\(\);\s*else formaRef\.current\?\.querySelector<HTMLInputElement>\("#xaridor-telefon-0"\)\?\.focus\(\);/);
});

// ── 1. Kontakt: "+ Mijoz qo'shish" doim, matn bilan ──
test('SavdoSelect: doim=true bo\'lsa ro\'yxat bo\'sh bo\'lmasa ham "+ Mijoz qo\'shish" turadi va yozilgan matnni beradi', () => {
  const ochilgan = [];
  const render = component('../src/Pages/Savdo/SavdoSelect.tsx');
  const props = {
    value: '', onChange: noop, klaviatura: true,
    options: [{ value: 'j', label: 'JAMSHID - +998777777777' }],
    qidiruvMosligi: (option, soz) => mijozMosmi([option.label], '+998777777777', soz),
    boshNatijaAmali: { label: 'Mijoz qo‘shish', doim: true, onClick: matn => ochilgan.push(matn) },
  };
  nodes(render(props)).find(n => n.type === 'button').props.onClick();
  let tree = render(props);
  assert.ok(nodes(tree).find(n => n.props?.['aria-label'] === 'Mijoz qo‘shish'), 'hech narsa yozilmaganda ham bor');
  assert.ok(nodes(tree).some(n => n.props?.children === 'JAMSHID - +998777777777'));
  nodes(tree).find(n => n.type === 'input').props.onChange({ target: { value: 'жам' } });
  tree = render(props);
  assert.ok(nodes(tree).some(n => n.props?.children === 'JAMSHID - +998777777777'), 'kirillcha so\'z bilan topildi');
  nodes(tree).find(n => n.type === 'input').props.onChange({ target: { value: ' Abdulaziz ' } });
  tree = render(props);
  nodes(tree).find(n => n.props?.['aria-label'] === 'Mijoz qo‘shish').props.onClick();
  assert.deepEqual(ochilgan, ['Abdulaziz']);
});

test('Yangi sotuv → Kontakt: doim ko\'rinadigan amal, matn "Yangi xaridor" oynasiga o\'tadi, bekor qilinsa ro\'yxat matn bilan qayta ochiladi', () => {
  const render = component('../src/Pages/Savdo/YangiSotuvModal.tsx');
  const props = { omborlar: [], mijozlar: [{ id: 'j', firstName: 'JAMSHID', phone: '+998777777777' }], mijozKompaniyalari: [], xodimlar: [], qoldiqlar: [], amalBajarilmoqda: false, onOmborTanlash: noop, onSaqlash: noop, onYopish: noop };
  const kontakt = () => nodes(render(props)).find(n => n.type === './SavdoSelect' && n.props.placeholder === 'placeholders.clientSearch');
  assert.equal(kontakt().props.boshNatijaAmali.doim, true);
  const option = kontakt().props.options[0];
  assert.equal(kontakt().props.qidiruvMosligi(option, 'жам'), true);
  assert.equal(kontakt().props.qidiruvMosligi(option, '77777'), true);
  assert.equal(kontakt().props.qidiruvMosligi(option, 'Abdulaziz'), false);
  kontakt().props.boshNatijaAmali.onClick('Abdulaziz Karimov');
  const modal = nodes(render(props)).find(n => n.type === '@/Pages/XaridorUchot/XaridorModal');
  assert.equal(modal.props.boshlangichMatn, 'Abdulaziz Karimov');
  const oldingiSorov = kontakt().props.ochishSorovi;
  modal.props.onYopish();
  assert.equal(nodes(render(props)).some(n => n.type === '@/Pages/XaridorUchot/XaridorModal'), false);
  assert.equal(kontakt().props.boshlangichQidiruv, 'Abdulaziz Karimov', 'bekor qilinganda matn joyida');
  assert.equal(kontakt().props.ochishSorovi, oldingiSorov + 1);
});

// ── 5. Umumiy chegirma (toza funksiyalar) ──
const qator = (id, extra = {}) => ({ modificationId: id, discount: '', discountTuri: 'sum', discountFoiz: '', ...extra });
test('umumiy foiz: hamma qatorga % rejimida; qo\'lda o\'zgartirilgani "Aralash"; tozalash faqat umumiyni oladi', () => {
  let rows = ch.umumiyFoizniQollash([qator('a'), qator('b', { discount: '500' }), qator('')], 10);
  assert.deepEqual(rows.map(r => [r.discountTuri, r.discountFoiz, r.umumiyChegirmadan]), [['foiz', '10', true], ['foiz', '10', true], ['foiz', '10', true]]);
  assert.equal(ch.aralashmi(rows, 10), false);
  rows = rows.map((r, i) => (i === 1 ? ch.qolBilanOzgardi({ ...r, discountFoiz: '25' }) : r));
  assert.equal(ch.aralashmi(rows, 10), true);
  const tozalangan = ch.umumiyChegirmaniTozalash(rows);
  assert.deepEqual(tozalangan.map(r => [r.discountTuri, r.discountFoiz, r.discount]), [['sum', '', ''], ['foiz', '25', ''], ['sum', '', '']]);
  assert.equal(ch.qatorgaUmumiyFoiz(qator('c'), 15).discountFoiz, '15', 'keyin qo\'shilgan qator');
  assert.equal(ch.qatorgaUmumiyFoiz(qator('c'), 0).discountTuri, 'sum');
  assert.equal(ch.foizChegarasi(150), 100);
  assert.equal(ch.faolUmumiyFoiz({ tur: 'foiz', qiymat: '0' }), 0);
});

test('umumiy summa qatorlarga mutanosib taqsimlanadi, jami aniq, qatordan oshmaydi', () => {
  assert.deepEqual(ch.summaUlushlari([100000, 300000], 40000), [10000, 30000]);
  const u = ch.summaUlushlari([1, 1, 1], 1);
  assert.equal(Math.round(u.reduce((a, b) => a + b, 0) * 100) / 100, 1);
  assert.deepEqual(ch.summaUlushlari([50, 0, 50], 500), [50, 0, 50], 'jamidan katta summa — jami');
  assert.deepEqual(ch.summaUlushlari([0, 0], 10), [0, 0]);
  assert.deepEqual(ch.summaUlushlari([100000, 240000], 40000, 0), [11765, 28235], "so'mda butun so'm, jami aniq");
  assert.deepEqual(ch.summaUlushlari([10, 24], 4), [1.18, 2.82], 'dollarda sent');
  assert.equal(ch.tannarxdanArzonmi({ miqdor: 2, birNarx: 100, chegirma: 40, tannarx: 90 }), true);
  assert.equal(ch.tannarxdanArzonmi({ miqdor: 2, birNarx: 100, chegirma: 20, tannarx: 90 }), false);
  assert.equal(ch.tannarxdanArzonmi({ miqdor: 2, birNarx: 100, chegirma: 40, tannarx: 0 }), false, 'tannarx noma\'lum');
});

// ── 5. Yangi sotuv: blok ishlashi va backendga ketadigan qatorlar ──
function sotuv() {
  const saved = [];
  const render = component('../src/Pages/Savdo/YangiSotuvModal.tsx');
  const stock = (id, narx, tannarx) => ({ modificationId: id, warehouseId: 'w', quantity: 100, sellingPrice: narx, birliklar: [], modification: { id, product: { name: id }, price: { retailPrice: narx, costPrice: tannarx } } });
  const props = { omborlar: [{ id: 'w', name: 'W' }], mijozlar: [], mijozKompaniyalari: [], xodimlar: [], qoldiqlar: [stock('a', 100000, 50000), stock('b', 300000, 280000)], onOmborTanlash: noop, onYopish: noop, onSaqlash: async data => { saved.push(data); return false; } };
  const find = predicate => nodes(render(props)).find(predicate);
  const mahsulotTanlash = (indeks, qiymat) => nodes(render(props)).filter(n => n.type === './SavdoSelect' && n.props.placeholder === 'placeholders.selectProduct')[indeks].props.onChange(qiymat);
  const qatorQoshish = () => find(n => n.type === 'button' && nodes(n.props.children).length >= 0 && [n.props.children].flat().includes('actions.addProduct')).props.onClick();
  const tezFoiz = foiz => find(n => n.type === 'button' && Array.isArray(n.props.children) && n.props.children[0] === foiz && n.props.children[1] === '%').props.onClick();
  const chegirmaMaydoni = indeks => find(n => n.props?.['data-sotuv-chegirma'] === indeks);
  const umumiyMaydon = () => find(n => n.props?.['data-umumiy-chegirma-qiymat']);
  const submit = async () => { await find(n => n.type === 'form').props.onSubmit({ preventDefault: noop }); return JSON.parse(JSON.stringify(saved.at(-1)?.items ?? null)); };
  return { find, mahsulotTanlash, qatorQoshish, tezFoiz, chegirmaMaydoni, umumiyMaydon, submit, render: () => render(props) };
}

test('"Umumiy chegirma 10%" bitta bosishda hamma qatorga 10% qo\'yadi; keyin qo\'shilgan qatorga ham; qo\'lda o\'zgartirish "Aralash"', async () => {
  const s = sotuv();
  s.mahsulotTanlash(0, 'a::w');
  s.qatorQoshish();
  s.mahsulotTanlash(1, 'b::w');
  s.tezFoiz(10);
  assert.equal(s.chegirmaMaydoni(0).props.value, '10');
  assert.equal(s.chegirmaMaydoni(1).props.value, '10');
  let items = await s.submit();
  assert.deepEqual(items.map(i => [i.discount, i.discountPercent]), [[10000, 10], [30000, 10]]);
  // keyin qo'shilgan qator
  s.qatorQoshish();
  assert.equal(s.chegirmaMaydoni(2).props.value, '10');
  // qo'lda o'zgartirish → "Aralash"
  assert.equal(nodes(s.render()).some(n => n.props?.children === 'generalDiscount.mixed'), false);
  s.chegirmaMaydoni(1).props.onChange('20');
  assert.equal(nodes(s.render()).some(n => n.props?.children === 'generalDiscount.mixed'), true);
  items = await s.submit();
  assert.deepEqual(items.map(i => i.discount), [10000, 60000]);
  // ✕ — faqat umumiy foiz qo'ygan chegirmalar olinadi, qo'lda yozilgani qoladi
  s.find(n => n.type === 'button' && n.props['aria-label'] === 'generalDiscount.clear').props.onClick();
  items = await s.submit();
  assert.deepEqual(items.map(i => i.discount), [0, 60000]);
});

test('Umumiy chegirma summada: butun sotuvga, qatorlarga mutanosib; tannarxdan arzon ogohlantirishi saqlashni to\'xtatmaydi', async () => {
  const s = sotuv();
  s.mahsulotTanlash(0, 'a::w');
  s.qatorQoshish();
  s.mahsulotTanlash(1, 'b::w');
  s.find(n => n.type === 'button' && n.key === 'sum' && n.props['aria-pressed'] === false).props.onClick();
  s.umumiyMaydon().props.onChange('40000');
  assert.equal(nodes(s.render()).some(n => n.props?.children === 'generalDiscount.belowCost'), true, 'b: 300 000 − 30 000 < 280 000');
  const items = await s.submit();
  assert.deepEqual(items.map(i => [i.discount, i.discountPercent]), [[10000, undefined], [30000, undefined]]);
  // 0 — umumiy summa olinadi
  s.umumiyMaydon().props.onChange('0');
  assert.deepEqual((await s.submit()).map(i => i.discount), [0, 0]);
});
