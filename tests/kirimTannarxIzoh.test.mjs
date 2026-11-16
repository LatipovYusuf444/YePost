// TZ 16.11.2026: kirimda tan narx 3 xonagacha ($0.115 — backend Decimal(18,4) saqlaydi), kirim izohi yetkazib beruvchiga botda boradi
// (backend: kirim tasdiqlanganda `note` → "📝 Izoh: …"), shuning uchun `note`da izoh birinchi, texnik qismlar yo'q.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const { kirimElementiniYigish, rejimNarxi, TANNARX_KASRI } = require('../src/Pages/Ombor/kirimValyuta.ts');
const { avtomatikKirimNomimi, kirimNotesiniYigish, kirimIzohiniAjratish } = require('../src/lib/kirimTahriri.ts');
const plain = (v) => JSON.parse(JSON.stringify(v));
const noop = () => {};
const nodes = (value) => (Array.isArray(value) ? value.flatMap(nodes) : !value || typeof value !== 'object' ? [] : [value, ...nodes(value.props?.children)]);

test('tan narx: 3 xona saqlanadi ($0.115), ortig\'i yaxlitlanadi, o\'girishda ham 3 xona', () => {
  assert.equal(TANNARX_KASRI, 3);
  assert.equal(kirimElementiniYigish({ modificationId: 'm', quantity: 500, price: '0.115', currency: 'USD' }, null, 'USD').price, 0.115);
  assert.equal(kirimElementiniYigish({ modificationId: 'm', quantity: 1, price: '0.11549', currency: 'USD' }, null, 'USD').price, 0.115);
  assert.equal(kirimElementiniYigish({ modificationId: 'm', quantity: 1, price: '1000', currency: 'UZS' }, 12000, 'USD').price, 0.083);
  assert.equal(kirimElementiniYigish({ modificationId: 'm', quantity: 1, price: '', currency: 'USD', boshlangichTanNarx: 0.115 }, null, 'USD').price, 0.115);
  assert.deepEqual(rejimNarxi(1000, 'UZS', 'USD', 12000, 3), { qiymat: 0.083, tekshirish: false });
  assert.deepEqual(rejimNarxi(1000, 'UZS', 'USD', 12000), { qiymat: 0.08, tekshirish: false }, 'sotuv/ulgurji narxlar avvalgidek 2 xona');
});

test('izoh: avtomatik nom yozilmaydi (uz va ru shablon), qo\'lda yozilgan nom izohdan keyin, eski fayl havolalari saqlanadi', () => {
  const uz = (nom) => avtomatikKirimNomimi(nom, 'Kirim hujjati #{{number}}');
  const ru = (nom) => avtomatikKirimNomimi(nom, 'Приходный документ №{{number}}');
  assert.equal(uz('Kirim hujjati #12'), true);
  assert.equal(ru('Приходный документ №3'), true);
  assert.equal(uz('Asia partiya'), false);
  assert.equal(uz('Kirim hujjati #12 qo\'shimcha'), false);
  assert.equal(kirimNotesiniYigish({ izoh: ' 2 korobka singan keldi ', nomi: 'Kirim hujjati #5', avtomatikNom: uz }), '2 korobka singan keldi');
  assert.equal(kirimNotesiniYigish({ izoh: '', nomi: 'Kirim hujjati #5', avtomatikNom: uz }), '', 'izoh yo\'q — botga hech narsa bormaydi');
  const qolda = kirimNotesiniYigish({ izoh: 'izoh', nomi: 'Asia partiya', avtomatikNom: uz, eskiFayllar: [{ nomi: 'a.pdf', url: 'https://x/a.pdf' }] });
  assert.equal(qolda, 'izoh | Nomi: Asia partiya | Fayl: a.pdf (https://x/a.pdf)');
  assert.deepEqual(plain(kirimIzohiniAjratish(qolda)), { nomi: 'Asia partiya', izoh: 'izoh', fayllar: [{ id: 'https://x/a.pdf', nomi: 'a.pdf', url: 'https://x/a.pdf' }] });
  // eski format ham o'qiladi
  assert.deepEqual(plain(kirimIzohiniAjratish('Nomi: Kirim hujjati #2 | izoh')), { nomi: 'Kirim hujjati #2', izoh: 'izoh', fayllar: [] });
});

test('izoh: ikki tildagi shablon, eski raqamsiz nom va hujjat raqami avtomatik; "Nomi:" bilan boshlangan izoh nom bo\'lib qolmaydi', () => {
  const avtomatik = (nom) => avtomatikKirimNomimi(nom, ['Kirim hujjati #{{number}}', 'Приходный документ №{{number}}'], ['Kirim hujjati', 'Приходный документ', '—', 'KR-2']);
  for (const nom of ['Kirim hujjati #4', 'Приходный документ №4', 'Kirim hujjati', 'Приходный документ', '—', 'KR-2', '  ']) assert.equal(avtomatik(nom), true, nom);
  for (const nom of ['KR-3', 'Asia partiya', 'Kirim hujjati 2-qism']) assert.equal(avtomatik(nom), false, nom);
  const note = kirimNotesiniYigish({ izoh: 'Nomi: yozilmagan | Fayl: yo\'q', nomi: '', avtomatikNom: avtomatik });
  const qayta = plain(kirimIzohiniAjratish(note));
  assert.equal(qayta.nomi, '');
  assert.deepEqual(qayta.fayllar, []);
  assert.equal(qayta.izoh.replace(/\u200B/g, ''), 'Nomi: yozilmagan | Fayl: yo\'q');
});

function kirimOynasi(store) {
  let cursor = 0;
  const states = [];
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], (next) => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
    useRef(initial) { return hooks.useState(() => ({ current: initial }))[0]; },
    useMemo: (fn) => fn(), useCallback: (fn) => fn, useEffect: noop, useLayoutEffect: noop, useId: () => 'id',
  };
  const yuklanganlar = [];
  const toastlar = [];
  const mocks = {
    react: hooks,
    'react-i18next': { useTranslation: () => ({ t: (key, p) => (key === 'yangiKirim.defaultName' ? `Kirim hujjati #${p?.number}` : key) }) },
    '@/hooks/useMaydonXatolari': { useMaydonXatolari: () => ({ xato: () => undefined, bor: false, tepadagi: '', ornat() {}, tozala() {}, kuzat: (f) => f() }) },
    '@/hooks/useOzgarishBormi': { useOzgarishBormi: () => false },
    '@/lib/hujjatSanasi': require('../src/lib/hujjatSanasi.ts'),
    '@/lib/kirimTahriri': require('../src/lib/kirimTahriri.ts'),
    '@/lib/hujjatIlovalari': require('../src/lib/hujjatIlovalari.ts'),
    '@/lib/hujjatRaqamiMatni': require('../src/lib/hujjatRaqamiMatni.ts'),
    '@/lib/kopBirlik': require('../src/lib/kopBirlik.ts'),
    '@/lib/narxValyutasi': { narxValyutalari: () => ({ cost: 'USD', retail: 'USD', wholesale: 'USD' }) },
    '@/lib/asosiyValyuta': { asosiyValyuta: () => 'USD' },
    '@/lib/valyuta': { useValyuta: () => ({ kurs: 12000, kursBor: true }), useYagonaValyuta: () => null, yagonaValyuta: () => null, korsatiladiganValyuta: () => 'USD', valyutaKodi: (v) => (v === 'USD' ? 'USD' : 'UZS') },
    '@/lib/kirimYetkazibBeruvchi': { kirimYetkazibBeruvchiNomi: () => 'Asia Scotch' },
    '@/lib/toast': { xatolikXabari: (m) => toastlar.push(m) },
    '@/api/inventoryDocumentsApi': { inventoryDocumentsApi: { upload: async (tur, id, fayl) => { yuklanganlar.push([tur, id, fayl.name]); }, attachments: async () => [] } },
    './kirimValyuta': require('../src/Pages/Ombor/kirimValyuta.ts'),
    './omborYordamchilari': { hujjatRaqami: (h) => h.number ?? h.id, kodBilanTopish: () => [], modificationNomi: (m) => m?.name ?? '', qoldiqMiqdori: () => 0 },
    '@/lib/ishlabChiqarish': { seriyaYaroqlimi: () => true },
    '@/store/omborStore': { useOmborStore: Object.assign(() => store, { getState: () => store }) },
    '@/store/authProfileStore': { useAuthProfileStore: (sel) => sel({ profil: { id: 'u1' }, profilniYuklash: noop }) },
  };
  const compiled = ts.transpileModule(readFileSync(new URL('../src/Pages/Ombor/YangiKirimModal.tsx', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { exports: {}, crypto: { randomUUID: (() => { let n = 0; return () => `r${++n}`; })() }, window: { setTimeout, clearTimeout }, document: { addEventListener: noop, removeEventListener: noop }, require(name) {
    return mocks[name] ?? (name === 'react/jsx-runtime' ? require(name) : new Proxy({ __esModule: true, default: name }, { get: (target, key) => target[key] ?? noop }));
  } };
  runInNewContext(compiled, context);
  return { render: (props) => { cursor = 0; return context.exports.default(props); }, yuklanganlar, toastlar };
}

test('kirim oynasi: tan narx maydoni 3 xonali, $0.115 o\'zgarmay ketadi; izoh `note`da yolg\'iz; fayl `note`ga emas, hujjat ilovasiga', async () => {
  const chaqiruvlar = [];
  const store = {
    omborlar: [{ id: 'w1', name: 'Tepa dokon' }], kirimlar: [], yetkazibBeruvchilar: [{ id: 's1', name: 'Asia Scotch' }], xodimlar: [], qoldiqlar: [], xatolik: null, xatolikniTozalash: noop,
    modifikatsiyalar: [{ id: 'm1', name: '3,6*20', productId: 'p1', price: { costPrice: 0.1 } }], amalBajarilmoqda: false,
    kirimYaratish: async (d) => { chaqiruvlar.push(['yaratish', d]); return { id: 'yangi' }; },
    kirimYangilash: async (id, d) => { chaqiruvlar.push(['yangilash', id, d]); return { id }; },
    kirimTasdiqlash: async () => true, malumotlarniYuklash: async () => {},
  };
  const oyna = kirimOynasi(store);
  const hujjat = { id: 'p1', number: 'KR-2', status: 'DRAFT', currency: 'USD', supplierId: 's1', warehouseId: 'w1', date: '2026-11-16T10:00:00Z', note: 'Nomi: Kirim hujjati #2 | eski izoh', items: [{ modificationId: 'm1', quantity: 500, price: 0.11, modification: { id: 'm1', name: '3,6*20', productId: 'p1' } }] };
  const props = { tahrir: hujjat, onClose: noop };
  const topish = (shart) => nodes(oyna.render(props)).find(shart);

  const narx = () => topish((n) => n.props?.['data-kirim-narx'] !== undefined);
  assert.equal(narx().props.kasr, 3, 'tan narx maydoni 3 xona');
  narx().props.onChange('0.115');
  assert.equal(narx().props.value, 0.115);
  topish((n) => n.type === 'textarea').props.onChange({ target: { value: '2 korobka singan keldi' } });
  assert.ok(nodes(oyna.render(props)).some((n) => n.props?.['data-izoh-bot'] !== undefined), 'izoh ostida bot haqida yozuv');
  // fayl tanlash: darhol yuklanmaydi, `note`ga ham yozilmaydi
  const faylInput = topish((n) => n.type === 'input' && n.props.type === 'file');
  assert.match(faylInput.props.accept, /\.pdf/);
  await faylInput.props.onChange({ target: { files: [new File(['x'], 'chek.pdf', { type: 'application/pdf' })], value: 'chek.pdf' } });
  await faylInput.props.onChange({ target: { files: [new File(['x'], 'virus.exe', { type: 'application/x-msdownload' })], value: 'virus.exe' } });
  assert.deepEqual(oyna.yuklanganlar, []);

  const saqlash = nodes(oyna.render(props)).filter((n) => typeof n.type === 'function' && n.props?.children === 'yangiKirim.save')[0];
  saqlash.props.onClick();
  for (let i = 0; i < 50 && !oyna.yuklanganlar.length; i++) await new Promise((r) => setTimeout(r, 5));
  const [tur, id, tana] = chaqiruvlar[0];
  assert.equal(tur, 'yangilash');
  assert.equal(id, 'p1');
  assert.equal(plain(tana).items[0].price, 0.115, '$0.115 2 xonaga yaxlitlanmaydi');
  assert.equal(plain(tana).note, '2 korobka singan keldi', 'botga boradigan izoh — faqat izoh (avtomatik nom yo\'q)');
  assert.deepEqual(oyna.yuklanganlar, [['PURCHASE', 'p1', 'chek.pdf']], 'faqat ruxsat etilgan fayl, saqlangandan keyin hujjat ilovasiga');
  assert.doesNotMatch(plain(tana).note, /Fayl:/);
});

test('kirim tahriri: yangi formatdagi izoh o\'zgarmaydi ("Nomi: KR-2" qo\'shilmaydi), ikki marta bosish bitta so\'rov, yuklangan fayl qayta yuklanmaydi', async () => {
  const chaqiruvlar = [];
  const store = {
    omborlar: [{ id: 'w1', name: 'Tepa dokon' }], kirimlar: [], yetkazibBeruvchilar: [{ id: 's1', name: 'Asia Scotch' }], xodimlar: [], qoldiqlar: [], xatolik: null, xatolikniTozalash: noop,
    modifikatsiyalar: [{ id: 'm1', name: '3,6*20', productId: 'p1', price: { costPrice: 0.1 } }], amalBajarilmoqda: false,
    kirimYaratish: async (d) => { chaqiruvlar.push(['yaratish', d]); return { id: 'yangi' }; },
    kirimYangilash: async (id, d) => { chaqiruvlar.push(['yangilash', id, d]); await new Promise((r) => setTimeout(r, 10)); return { id }; },
    kirimTasdiqlash: async () => true, malumotlarniYuklash: async () => {},
  };
  const oyna = kirimOynasi(store);
  const hujjat = { id: 'p1', number: 'KR-2', status: 'DRAFT', currency: 'USD', supplierId: 's1', warehouseId: 'w1', date: '2026-11-16T10:00:00Z', note: '2 korobka singan', items: [{ modificationId: 'm1', quantity: 500, price: 0.115, modification: { id: 'm1', name: '3,6*20', productId: 'p1' } }] };
  const props = { tahrir: hujjat, onClose: noop };
  const topish = (shart) => nodes(oyna.render(props)).find(shart);
  const nomMaydoni = topish((n) => n.type === 'input' && n.props.placeholder === 'KR-2');
  assert.equal(nomMaydoni.props.value, '', 'nom bo\'sh, hujjat raqami faqat placeholder');
  await topish((n) => n.type === 'input' && n.props.type === 'file').props.onChange({ target: { files: [new File(['x'], 'chek.pdf', { type: 'application/pdf' })], value: 'chek.pdf' } });
  const saqlash = () => nodes(oyna.render(props)).filter((n) => typeof n.type === 'function' && n.props?.children === 'yangiKirim.save')[0];
  const tugma = saqlash();
  tugma.props.onClick();
  tugma.props.onClick();
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(chaqiruvlar.length, 1, 'ikkinchi bosish e\'tiborsiz');
  assert.equal(plain(chaqiruvlar[0][2]).note, '2 korobka singan');
  assert.equal(plain(chaqiruvlar[0][2]).items[0].price, 0.115);
  assert.equal(oyna.yuklanganlar.length, 1);
  saqlash().props.onClick();
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(chaqiruvlar.length, 2);
  assert.equal(oyna.yuklanganlar.length, 1, 'yuklangan fayl ro\'yxatdan olingan — qayta yuklanmaydi');
});

test('kirim oynasi: so\'mdagi qoralamada "USD" tanlansa hujjat USD da saqlanadi, narxlar ekrandagidek', async () => {
  const chaqiruvlar = [];
  const store = {
    omborlar: [{ id: 'w1', name: 'Tepa dokon' }], kirimlar: [], yetkazibBeruvchilar: [{ id: 's1', name: 'Asia Scotch' }], xodimlar: [], qoldiqlar: [], xatolik: null, xatolikniTozalash: noop,
    modifikatsiyalar: [], amalBajarilmoqda: false,
    kirimYaratish: async (d) => { chaqiruvlar.push(['yaratish', d]); return { id: 'yangi' }; },
    kirimYangilash: async (id, d) => { chaqiruvlar.push(['yangilash', id, d]); return { id }; },
    kirimTasdiqlash: async () => true, malumotlarniYuklash: async () => {},
  };
  const oyna = kirimOynasi(store);
  const hujjat = { id: 'p1', number: 'KR-3', status: 'DRAFT', currency: 'UZS', supplierId: 's1', warehouseId: 'w1', date: '2026-11-16T10:00:00Z', note: '', items: [
    { modificationId: 'm1', quantity: 10, price: 2160, modification: { id: 'm1', name: 'qizil 6*100', productId: 'p1' } },
    { modificationId: 'm2', quantity: 72, price: 2160, modification: { id: 'm2', name: 'яшил 6*100', productId: 'p2' } },
  ] };
  const props = { tahrir: hujjat, onClose: noop };
  const valyutaTanlovi = () => nodes(oyna.render(props)).find((n) => n.props?.['aria-label'] === 'yangiKirim.currency');
  assert.equal(valyutaTanlovi().props.value, 'UZS');
  valyutaTanlovi().props.onChange({ target: { value: 'USD' } });
  assert.deepEqual(nodes(oyna.render(props)).filter((n) => n.props?.['data-kirim-narx'] !== undefined).map((n) => n.props.value), [0.18, 0.18], 'ekranda $0.18');
  nodes(oyna.render(props)).filter((n) => typeof n.type === 'function' && n.props?.children === 'yangiKirim.save')[0].props.onClick();
  for (let i = 0; i < 50 && !chaqiruvlar.length; i++) await new Promise((r) => setTimeout(r, 5));
  const tana = plain(chaqiruvlar[0][2]);
  assert.equal(tana.currency, 'USD', 'hujjat so\'mga qaytmaydi');
  assert.deepEqual(tana.items.map((item) => item.price), [0.18, 0.18]);
});

test('Kirim hujjati oynasi: tan narx 3 xonali ko\'rinadi, izoh "Izoh" sifatida bot haqida yozuv bilan', () => {
  const kod = readFileSync(new URL('../src/Pages/Ombor/KirimTafsilotModal.tsx', import.meta.url), 'utf8');
  assert.match(kod, /tannarxMatni\(tanNarx, tanValyutasi\)/);
  assert.match(kod, /const \{ nomi, izoh \} = kirimIzohiniAjratish\(hujjat\?\.note\);/);
  assert.match(kod, /kirimTafsilotModal\.noteBotHint/);
  const yordamchi = readFileSync(new URL('../src/Pages/Ombor/omborYordamchilari.ts', import.meta.url), 'utf8');
  assert.match(yordamchi, /export function tannarxMatni[\s\S]*?maximumFractionDigits: 3/);
});
