// Yangi sotuv oynasi: "To'liq | Qisqa" ko'rinishi. Rejim faqat ko'rinishni o'zgartiradi — forma holati bitta, almashtirishda hech qaysi
// qiymat tozalanmaydi, backendga ketadigan qatorlar ikkala rejimda bir xil.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const ch = require('../src/lib/umumiyChegirma.ts');
const noop = () => {};
const nodes = (value) => (Array.isArray(value) ? value.flatMap(nodes) : !value || typeof value !== 'object' ? [] : [value, ...nodes(value.props?.children)]);
const matnlar = (tree) => nodes(tree).flatMap((n) => [n.props?.children].flat().filter((c) => typeof c === 'string'));

function component(path, overrides = {}) {
  let cursor = 0;
  const states = [];
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], (next) => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
    useRef(initial) { return hooks.useState(() => ({ current: initial }))[0]; },
    useMemo: (fn) => fn(), useCallback: (fn) => fn, useEffect: noop, useLayoutEffect: noop, useId: () => 'select-id',
  };
  const mocks = {
    react: hooks, 'react-dom': { createPortal: (node) => node },
    'react-i18next': { useTranslation: () => ({ t: (key, o) => (o?.summa ? `${key}:${o.summa}` : o?.maydonlar ? `${key}:${o.maydonlar}` : key) }) },
    '@/lib/utils': { cn: (...args) => args.filter(Boolean).join(' ') },
    '@/lib/optionlarniCheklash': require('../src/lib/optionlarniCheklash.ts'),
    '@/lib/hujjatSanasi': { bugungiToshkentKuni: () => '2026-11-26', kunMatni: (k) => k.split('-').reverse().join('.'), yangiHujjatSanasi: () => ({}) },
    '@/lib/savdoNarxlari': require('../src/lib/savdoNarxlari.ts'),
    '@/lib/umumiyChegirma': ch,
    '@/lib/mijozQidiruvi': require('../src/lib/mijozQidiruvi.ts'),
    '@/lib/kopBirlik': require('../src/lib/kopBirlik.ts'),
    '@/lib/valyuta': { useValyutaStore: (selector) => selector({ kurs: 12000, kursBor: true, rejimYoniq: true }) },
    '@/store/authProfileStore': { useAuthProfileStore: (selector) => selector({ profil: { id: 'cashier' }, profilniYuklash: noop }) },
    '@/store/inventorySettingsStore': { useInventorySettingsStore: (selector) => selector({ canSellNegative: false }) },
    '@/store/savdoSozlamalariStore': { useSavdoSozlamalariStore: (selector) => selector({ narxTurlari: ['COST', 'RETAIL', 'WHOLESALE'], yuklash: noop }) },
    './savdoYordamchilari': { pulniFormatlash: String },
    '@/Pages/XaridorUchot/backendAdapters': { kompaniyaniUiGa: (item) => ({ id: item.id, nomi: item.name }) },
    '@/hooks/useMaydonXatolari': { useMaydonXatolari: () => ({ xato: () => undefined, bor: false, tepadagi: '', ornat() {}, tozala() {}, tekshiruv() {}, serverdan: () => false, kuzat: (f) => f() }) },
    ...overrides,
  };
  const compiled = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { exports: {}, TextEncoder, document: { querySelectorAll: () => [] }, window: { location: { origin: 'http://localhost', href: 'http://localhost/savdo' }, requestAnimationFrame: noop, setTimeout: noop }, require(name) {
    return mocks[name] ?? (name === 'react/jsx-runtime' ? require(name) : new Proxy({ __esModule: true, default: name }, { get: (target, key) => target[key] ?? noop }));
  } };
  runInNewContext(compiled, context);
  return (props) => { cursor = 0; return context.exports.default(props); };
}

function sotuv(overrides) {
  const saved = [];
  const render = component('../src/Pages/Savdo/YangiSotuvModal.tsx', overrides);
  const stock = (id, narx, tannarx) => ({ modificationId: id, warehouseId: 'w', quantity: 100, sellingPrice: narx, birliklar: [], modification: { id, product: { name: id }, price: { retailPrice: narx, costPrice: tannarx } } });
  const props = { omborlar: [{ id: 'w', name: 'W' }], mijozlar: [{ id: 'm1', firstName: 'Ali', phone: '+998901112233' }], mijozKompaniyalari: [], xodimlar: [], qoldiqlar: [stock('a', 100000, 50000), stock('b', 300000, 280000)], onOmborTanlash: noop, onYopish: noop, onSaqlash: async (data) => { saved.push(data); return false; } };
  const tree = () => render(props);
  const find = (predicate) => nodes(tree()).find(predicate);
  const rejim = (kalit) => find((n) => n.type === 'button' && n.props?.['data-korinish'] === kalit).props.onClick();
  const mahsulotTanlash = (indeks, qiymat) => nodes(tree()).filter((n) => n.type === './SavdoSelect' && n.props.placeholder === 'placeholders.selectProduct')[indeks].props.onChange(qiymat);
  const qatorQoshish = () => find((n) => n.type === 'button' && [n.props.children].flat().includes('actions.addProduct')).props.onClick();
  const submit = async () => { await find((n) => n.type === 'form').props.onSubmit({ preventDefault: noop }); return JSON.parse(JSON.stringify(saved.at(-1) ?? null)); };
  return { tree, find, rejim, mahsulotTanlash, qatorQoshish, submit, props };
}

test('dastlab To\'liq: hamma bo\'limlar, almashtirgich sarlavhada; Qisqa: sozlamalar va faoliyat yo\'q, ixcham jadval va yakun', () => {
  const s = sotuv();
  let tree = s.tree();
  const tugmalar = nodes(tree).filter((n) => n.props?.['data-korinish']);
  assert.deepEqual(tugmalar.map((n) => [n.props['data-korinish'], n.props['aria-checked']]), [['toliq', true], ['qisqa', false]]);
  assert.ok(nodes(tree).some((n) => n.props?.sarlavha === 'sections.saleSettings'), 'To\'liq: Sotuv sozlamalari');
  assert.ok(matnlar(tree).includes('table.catalogPrice'));
  assert.ok(matnlar(tree).includes('actions.clear'));
  assert.doesNotMatch(nodes(tree).find((n) => n.props?.['data-faoliyat-karta'] !== undefined).props.className, /hidden/);

  s.rejim('qisqa');
  tree = s.tree();
  assert.equal(nodes(tree).find((n) => n.props?.['data-korinish'] === 'qisqa').props['aria-checked'], true);
  assert.equal(nodes(tree).some((n) => n.props?.sarlavha === 'sections.saleSettings'), false, 'Sotuv sozlamalari sarlavhasi ham yo\'q');
  assert.equal(nodes(tree).some((n) => n.props?.sarlavha === 'sections.productList'), false, 'takroriy sarlavha va import yo\'q');
  assert.match(nodes(tree).find((n) => n.props?.['data-faoliyat-karta'] !== undefined).props.className, /\bhidden\b/, 'Faoliyat to\'liq yashirin');
  const m = matnlar(tree);
  for (const yoq of ['table.catalogPrice', 'table.discount', 'products.keyboardHint', 'katalog.button', 'actions.clear', 'comment.label']) assert.equal(m.includes(yoq), false, yoq);
  for (const bor of ['common.client', 'actions.addProduct', 'table.quantity', 'table.salePrice', 'table.total', 'summary.grandTotal', 'viewMode.steps.save']) assert.ok(m.includes(bor), bor);
  assert.ok(nodes(tree).some((n) => n.props?.['data-qisqa-jami'] !== undefined));
  assert.ok(nodes(tree).some((n) => n.props?.ixcham === true), 'Qisqa: kartalar ixcham (faqat yoqilganlari)');
  assert.ok(nodes(tree).some((n) => n.type === 'button' && n.props?.type === 'submit'), 'Qoralama saqlash');
  // Ombor majburiy — ko'rinadi.
  assert.ok(nodes(tree).some((n) => n.type === './SavdoSelect' && n.props.placeholder === 'placeholders.selectWarehouse'));
});

test('Qisqa qator: Miqdor → Sotuv narxi (DOM tartibi ham), katalog narxi va chegirma kataklari yo\'q', () => {
  const s = sotuv();
  s.mahsulotTanlash(0, 'a::w');
  s.rejim('qisqa');
  const tartib = nodes(s.tree()).flatMap((n) => (n.props?.['data-sotuv-miqdor'] === 0 ? ['miqdor'] : n.props?.['data-sotuv-narx'] === 0 ? ['narx'] : []));
  assert.deepEqual(tartib, ['miqdor', 'narx']);
  assert.equal(nodes(s.tree()).some((n) => n.props?.['data-sotuv-chegirma'] === 0), false);
  s.rejim('toliq');
  const toliq = nodes(s.tree()).flatMap((n) => (n.props?.['data-sotuv-narx'] === 0 ? ['narx'] : n.props?.['data-sotuv-miqdor'] === 0 ? ['miqdor'] : []));
  assert.deepEqual(toliq, ['narx', 'miqdor']);
});

test('bitta forma: To\'liqda chegirma va izoh → Qisqa → To\'liq; qiymatlar saqlanadi, backendga bir xil qatorlar ketadi', async () => {
  const s = sotuv();
  s.mahsulotTanlash(0, 'a::w');
  s.qatorQoshish();
  s.mahsulotTanlash(1, 'b::w');
  // Qator chegirmasi va umumiy 10%
  s.find((n) => n.props?.['data-sotuv-chegirma'] === 1).props.onChange('5000');
  s.find((n) => n.type === 'button' && Array.isArray(n.props.children) && n.props.children[0] === 10 && n.props.children[1] === '%').props.onClick();
  s.find((n) => n.type === 'textarea' && n.props.maxLength === 500).props.onChange({ target: { value: 'Ertaga olib ketadi' } });
  const toliqSaqlash = await s.submit();

  s.rejim('qisqa');
  const tree = s.tree();
  // Chegirma hisobda qoladi va yakunda bitta qatorda ko'rinadi.
  assert.ok(matnlar(tree).some((m) => m.startsWith('viewMode.discountLine:')), 'chegirma ta\'siri');
  const qisqaSaqlash = await s.submit();
  assert.deepEqual(qisqaSaqlash.items, toliqSaqlash.items, 'qatorlar bir xil');
  assert.equal(qisqaSaqlash.note, toliqSaqlash.note, 'izoh (note) yashirin bo\'lsa ham saqlanadi');

  s.rejim('toliq');
  assert.equal(s.find((n) => n.props?.['data-sotuv-chegirma'] === 1).props.value, '10', 'qator chegirmasi qaytadi');
  assert.equal(s.find((n) => n.type === 'textarea' && n.props.maxLength === 500).props.value, 'Ertaga olib ketadi');
  assert.deepEqual((await s.submit()).items, toliqSaqlash.items);
});

test('Qisqa rejimda yashirin maydon xatosi: nima yetishmayotgani aytiladi va "To\'liq rejimda ochish" To\'liqqa o\'tkazadi', () => {
  const s = sotuv({ '@/hooks/useMaydonXatolari': { useMaydonXatolari: () => ({ xato: (yol) => (yol === 'currency' || yol === 'endDate' ? 'xato' : undefined), bor: true, tepadagi: '', ornat() {}, tozala() {}, tekshiruv() {}, serverdan: () => false, kuzat: (f) => f() }) } });
  assert.equal(nodes(s.tree()).some((n) => n.props?.['data-qisqa-yashirin-xato'] !== undefined), false, 'To\'liqda kerak emas');
  s.rejim('qisqa');
  const banner = s.find((n) => n.props?.['data-qisqa-yashirin-xato'] !== undefined);
  assert.ok(banner);
  assert.ok(matnlar(banner).includes('viewMode.hiddenErrors:note.currencyLabel, note.endDateLabel'));
  nodes(banner).find((n) => n.type === 'button').props.onClick();
  assert.equal(s.find((n) => n.props?.['data-korinish'] === 'toliq').props['aria-checked'], true);
  assert.ok(nodes(s.tree()).some((n) => n.props?.sarlavha === 'sections.saleSettings'));
});

test('rejim qoralama o\'zgarishlariga kirmaydi va Tozalash uni tegmaydi; oyna har safar To\'liqda ochiladi', () => {
  const kod = readFileSync(new URL('../src/Pages/Savdo/YangiSotuvModal.tsx', import.meta.url), 'utf8');
  assert.match(kod, /useState<"toliq" \| "qisqa">\("toliq"\)/);
  const tozalash = kod.slice(kod.indexOf('function formaniTozalash'), kod.indexOf('function formaniTozalash') + 3500);
  assert.doesNotMatch(tozalash, /setKorinish/);
  const holat = kod.slice(kod.indexOf('const joriyHolat'), kod.indexOf('const joriyHolat') + 600);
  assert.doesNotMatch(holat, /korinish/);
  assert.match(readFileSync(new URL('../src/Pages/Savdo/SotuvKartalari.tsx', import.meta.url), 'utf8'), /if \(ixcham\) \{/);
});

test('ko\'rib chiqish tuzatishlari: Enter tartibi, chegirma xatosi qatori, bitta banner, ochiq qoluvchi maydonlar, tannarx ogohlantirishi, telefon footeri', () => {
  const kod = readFileSync(new URL('../src/Pages/Savdo/YangiSotuvModal.tsx', import.meta.url), 'utf8').split(String.fromCharCode(13)).join('');
  // Enter ko'ringan tartibga mos: Qisqa (miqdor · narx) doim narx miqdordan keyin; To'liq — foydalanuvchi ustun tartibi bo'yicha.
  assert.match(kod, /const korinadiganUstunlar: SotuvUstuni\[\] = qisqa \? \["mahsulot", "miqdor", "sotuvNarxi", "chegirma"\]/);
  assert.match(kod, /const narxMiqdordanKeyin = korinadiganUstunlar\.indexOf\("sotuvNarxi"\) > korinadiganUstunlar\.indexOf\("miqdor"\);/);
  assert.match(kod, /if \(narxMiqdordanKeyin\) keyingiQatorgaOtish\(index\);\n\s+else fokusSoralish\(index, "miqdor"\);/, 'narx → keyingi qator (Qisqa)');
  assert.match(kod, /if \(narxMiqdordanKeyin && fokusQoyish\(index, "narx"\)\) return;\n\s+keyingiQatorgaOtish\(index\);/, 'miqdor → narx (Qisqa)');
  assert.match(kod, /qisqa && "sm:col-span-2 @min-\[900px\]:order-last @min-\[900px\]:col-span-full"/);
  assert.match(kod, /\{tepaXatosi && !\(qisqa && qisqaYashirinXatolar\.length > 0 && tepaXatosi === fx\.tepadagi\) && \(/);
  assert.match(kod, /const qisqaKorsat = \(yol: string\) => !qisqa \|\| Boolean\(fx\.xato\(yol\)\) \|\| qisqaOchiqMaydonlar\.includes\(yol\);/);
  assert.match(kod, /\{\(kartaKor\("izoh"\) \|\| qisqaKorsat\("note"\)\) && \(/);
  assert.match(kod, /\{qisqa && !kartaKor\("umumiyChegirma"\) && tannarxdanArzonSoni > 0 && \(/);
  assert.match(kod, /data-qisqa-jami className="mr-auto min-w-0 basis-full sm:basis-auto"/);
  assert.match(readFileSync(new URL('../src/hooks/useMaydonXatolari.ts', import.meta.url), 'utf8'), /hammasi: xatolar,/);
});

test('Qisqa: Enter narxda keyingi qatorga o\'tadi (shallow)', () => {
  const s = sotuv();
  s.mahsulotTanlash(0, 'a::w');
  s.rejim('qisqa');
  const qatorlarOldin = nodes(s.tree()).filter((n) => n.props?.['data-sotuv-narx'] !== undefined).length;
  s.find((n) => n.props?.['data-sotuv-narx'] === 0).props.onKeyDown({ key: 'Enter', nativeEvent: { isComposing: false }, preventDefault: noop, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false });
  const qatorlarKeyin = nodes(s.tree()).filter((n) => n.props?.['data-sotuv-narx'] !== undefined).length;
  assert.equal(qatorlarKeyin, qatorlarOldin + 1, 'oxirgi qatorda Enter yangi qator qo\'shadi');
});

test('Ko\'rinishni sozlash: Qisqa\'da kartani yoqish/o\'chirish qiymatni o\'zgartirmaydi; matnlar tanlov bo\'yicha', async () => {
  const lib = require('../src/lib/qisqaKorinish.ts');
  let tanlov = lib.STANDART_QISQA;
  const s = sotuv({ '@/hooks/useQisqaSozlamasi': { useQisqaSozlamasi: () => ({ korinish: tanlov, saqlangan: true, saqlash: (k) => { tanlov = k; } }) } });
  s.mahsulotTanlash(0, 'a::w');
  // To'liq: umumiy 10% chegirma va izoh
  s.find((n) => n.type === 'button' && Array.isArray(n.props.children) && n.props.children[0] === 10 && n.props.children[1] === '%').props.onClick();
  s.find((n) => n.type === 'textarea' && n.props.maxLength === 500).props.onChange({ target: { value: 'Izoh matni' } });
  const toliq = await s.submit();

  s.rejim('qisqa');
  let tree = s.tree();
  // Standart: kartalar yopiq, qoldiq yozuvi va narx birligi ochiq, klaviatura yo'riqnomasi yopiq; sozlash tugmasi bor.
  // SotuvKartalari mazmunsiz (children false/null) kartani chizmaydi — hisobga olinmaydi.
  const kartalar = () => nodes(s.tree()).filter((n) => n.props?.kalit && n.props?.nom !== undefined && n.props.children !== undefined && n.props.children !== false && n.props.children !== null).map((n) => n.props.kalit);
  assert.deepEqual(kartalar(), []);
  assert.ok(matnlar(tree).includes('labels.availableStock'));
  assert.equal(matnlar(tree).includes('products.keyboardHint'), false);
  assert.ok(nodes(tree).some((n) => n.props?.joriyOyna === 'yaratish'), '⚙ Ko\'rinishni sozlash');
  assert.equal(nodes(tree).some((n) => n.type === 'textarea' && n.props.maxLength === 500), false);
  assert.ok(matnlar(tree).some((m) => m.startsWith('viewMode.discountLine:')), 'yashirin chegirma jami yonida');
  assert.deepEqual((await s.submit()).items, toliq.items, 'karta yashirin — hisob o\'zgarmadi');

  // Ikki kartani yoqish (Umumiy chegirma, Izoh), ikki matnni o'chirish (qoldiq, birlik)
  tanlov = { kartalar: { ...lib.STANDART_QISQA.kartalar, umumiyChegirma: true, izoh: true }, matnlar: { ...lib.STANDART_QISQA.matnlar, qoldiq: false, birlik: false } };
  tree = s.tree();
  assert.deepEqual(kartalar(), ['umumiyChegirma']);
  const umumiyMaydon = nodes(tree).find((n) => n.props?.['data-umumiy-chegirma-qiymat']);
  assert.equal(umumiyMaydon.props.value, '10', 'qayta yoqilgan karta avvalgi qiymat bilan');
  assert.equal(nodes(tree).find((n) => n.type === 'textarea' && n.props.maxLength === 500).props.value, 'Izoh matni');
  assert.equal(matnlar(tree).includes('labels.availableStock'), false, 'qoldiq yozuvi o\'chirildi');
  assert.equal(nodes(tree).some((n) => [n.props?.children].flat().includes('/ ') && n.type === 'p'), false, 'narx birligi o\'chirildi');
  const qisqaSaqlash = await s.submit();
  assert.deepEqual(qisqaSaqlash.items, toliq.items);
  assert.equal(qisqaSaqlash.note, toliq.note);

  // To'liq — hammasi
  s.rejim('toliq');
  assert.ok(matnlar(s.tree()).includes('labels.availableStock'));
  assert.deepEqual(kartalar().sort(), ['narxTuri', 'umumiyChegirma', 'xulosa']);
});

test('ustunlar tartibi: foydalanuvchi tartibi sarlavhada ham, qatorda ham (DOM tartibi); Qisqa tartibi o\'zgarmaydi; Enter ko\'rinishga mos', () => {
  const saqlangan = [];
  const tartib = ['miqdor', 'mahsulot', 'chegirma', 'sotuvNarxi', 'katalog'];
  const s = sotuv({ '@/hooks/useSotuvUstunTartibi': { useSotuvUstunTartibi: () => ({ tartib, standartmi: false, saqlash: (yangi) => saqlangan.push(yangi) }) } });
  const sarlavha = s.find((n) => n.props?.['data-sotuv-sarlavha'] !== undefined);
  const yorliqlar = matnlar(sarlavha).filter((m) => m.startsWith('table.'));
  assert.deepEqual(yorliqlar, ['table.number', 'table.quantity', 'table.product', 'table.discount', 'table.salePrice', 'table.catalogPrice', 'table.total']);
  // Qatordagi kataklar ham shu tartibda: miqdor maydoni mahsulot tanlovidan oldin, katalog narxi oxirida.
  const tartibli = nodes(s.tree()).filter((n) => n.props?.['data-sotuv-miqdor'] === 0 || n.props?.['data-sotuv-mahsulot'] === 0 || n.props?.['data-sotuv-chegirma'] === 0 || n.props?.['data-sotuv-narx'] === 0 || n.props?.['aria-label'] === 'table.catalogPrice / common.unit');
  const nomi = (n) => (n.props['data-sotuv-miqdor'] === 0 ? 'miqdor' : n.props['data-sotuv-mahsulot'] === 0 ? 'mahsulot' : n.props['data-sotuv-chegirma'] === 0 ? 'chegirma' : n.props['data-sotuv-narx'] === 0 ? 'sotuvNarxi' : 'katalog');
  assert.deepEqual(tartibli.map(nomi), tartib);
  // "Standart tartib" tugmasi (tartib standart emas) standartni saqlaydi.
  s.find((n) => n.props?.['data-ustun-standart'] !== undefined).props.onClick();
  assert.deepEqual(JSON.parse(JSON.stringify(saqlangan.at(-1))), ['mahsulot', 'katalog', 'sotuvNarxi', 'miqdor', 'chegirma']);
  // Qisqa: tartib o'zgarmas — mahsulot, miqdor, narx; sarlavhada sudrash yo'q.
  s.rejim('qisqa');
  const qisqaTartib = nodes(s.tree()).filter((n) => n.props?.['data-sotuv-miqdor'] === 0 || n.props?.['data-sotuv-mahsulot'] === 0 || n.props?.['data-sotuv-narx'] === 0).map(nomi);
  assert.deepEqual(qisqaTartib, ['mahsulot', 'miqdor', 'sotuvNarxi']);
  assert.equal(s.find((n) => n.props?.['data-sotuv-sarlavha'] !== undefined), undefined);
});
