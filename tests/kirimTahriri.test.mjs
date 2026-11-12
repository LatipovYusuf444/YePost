// Kirim qoralamasini tahrirlash (PATCH /inventory/purchases/:id): "Tahrirlash" faqat DRAFT da va omborchi/admin/direktorga,
// "Yangi kirim" oynasi saqlangan qiymatlar bilan ochiladi va PATCH bilan saqlaydi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const { kirimIzohiniAjratish, kirimQatoriFormaga, saqlanganBirlik, birliklarniBirlashtirish } = require('../src/lib/kirimTahriri.ts');
const noop = () => {};
const plain = (v) => JSON.parse(JSON.stringify(v));
const nodes = value => Array.isArray(value) ? value.flatMap(nodes) : !value || typeof value !== 'object' ? [] : [value, ...nodes(value.props?.children)];

test('izoh: nom, izoh va fayllar o\'z joyiga qaytadi', () => {
  assert.deepEqual(plain(kirimIzohiniAjratish('Nomi: Kirim hujjati #2 | Tez yetkazildi | Fayl: chek.pdf (https://cdn/x/chek.pdf)')), {
    nomi: 'Kirim hujjati #2', izoh: 'Tez yetkazildi', fayllar: [{ id: 'https://cdn/x/chek.pdf', nomi: 'chek.pdf', url: 'https://cdn/x/chek.pdf' }],
  });
  assert.deepEqual(plain(kirimIzohiniAjratish('')), { nomi: '', izoh: '', fayllar: [] });
  assert.deepEqual(plain(kirimIzohiniAjratish('oddiy izoh')), { nomi: '', izoh: 'oddiy izoh', fayllar: [] });
});

test('saqlangan qator: qo\'shimcha birlikda — o\'sha birlikdagi son/narx, aks holda asosiy', () => {
  assert.deepEqual(plain(kirimQatoriFormaga({ quantity: 500, price: 0.11 })), { quantity: 500, price: 0.11, birlikId: '', serial: '' });
  assert.deepEqual(plain(kirimQatoriFormaga({ quantity: 120, price: 2, unitId: 'kor', unitQuantity: 10, unitPrice: 24, factorSnapshot: 12 })), { quantity: 10, price: 24, birlikId: 'kor', serial: '' });
  assert.equal(kirimQatoriFormaga({ quantity: 120, price: 2, unitId: 'kor', unitQuantity: '10', factorSnapshot: '12' }).price, 24, 'unitPrice kelmasa — narx × koeffitsient');
  assert.equal(kirimQatoriFormaga({ quantity: 50, price: 3, serial: 'R-1' }).serial, 'R-1');
  const kor = saqlanganBirlik({ unitId: 'kor', unitName: 'korobka', factorSnapshot: '12' });
  assert.equal(kor.koeff, 12);
  assert.equal(saqlanganBirlik({ quantity: 1 }), null);
  const yuklangan = [{ unitId: 'dona', asosiy: true }, { unitId: 'kor', asosiy: false, koeff: 12 }];
  assert.equal(birliklarniBirlashtirish(yuklangan, kor).length, 2, 'yuklanganda bor — takrorlanmaydi');
  assert.equal(birliklarniBirlashtirish([], kor)[0].unitId, 'kor', "yuklab bo'lmasa saqlangani qoladi");
});

function component(path, mocks) {
  let cursor = 0;
  const states = [];
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
    useRef(initial) { return hooks.useState(() => ({ current: initial }))[0]; },
    useMemo: fn => fn(), useCallback: fn => fn, useEffect: noop, useLayoutEffect: noop, useId: () => 'id',
  };
  const all = {
    react: hooks,
    'react-i18next': { useTranslation: () => ({ t: key => key }) },
    '@/hooks/useMaydonXatolari': { useMaydonXatolari: () => ({ xato: () => undefined, bor: false, tepadagi: '', ornat() {}, tozala() {}, kuzat: (f) => f() }) },
    '@/hooks/useOzgarishBormi': { useOzgarishBormi: () => false },
    '@/lib/hujjatSanasi': require('../src/lib/hujjatSanasi.ts'),
    '@/lib/kirimTahriri': require('../src/lib/kirimTahriri.ts'),
    '@/lib/kopBirlik': require('../src/lib/kopBirlik.ts'),
    '@/lib/narxValyutasi': { narxValyutalari: () => ({ cost: 'USD', retail: 'UZS', wholesale: 'USD' }) },
    '@/lib/asosiyValyuta': { asosiyValyuta: () => 'UZS' },
    '@/lib/valyuta': { useValyuta: () => ({ kurs: 12000, kursBor: true }), useYagonaValyuta: () => null, yagonaValyuta: () => null, korsatiladiganValyuta: () => 'USD', valyutaKodi: (v) => (v === 'USD' ? 'USD' : 'UZS') },
    '@/lib/kirimYetkazibBeruvchi': { kirimYetkazibBeruvchiNomi: () => 'Asia Scotch' },
    './kirimValyuta': {
      rejimNarxi: (qiymat) => ({ qiymat, tekshirish: false }),
      kirimHujjatValyutasi: (rows) => (rows.every((r) => r.currency === 'USD') ? 'USD' : 'UZS'),
      kirimNarxiniOgirish: (q) => q,
      kirimElementiniYigish: (row) => ({ modificationId: row.modificationId, quantity: row.quantity, price: Number(row.price), ...(row.birlik && !row.birlik.asosiy ? { unitId: row.birlik.unitId } : {}) }),
    },
    './omborYordamchilari': { hujjatRaqami: (h) => h.number ?? h.id, kodBilanTopish: () => [], modificationNomi: (m) => m?.name ?? '', qoldiqMiqdori: () => 0, holat: (s) => s, pul: String },
    '@/lib/ishlabChiqarish': { seriyaYaroqlimi: () => true },
    ...mocks,
  };
  const compiled = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { exports: {}, crypto: { randomUUID: (() => { let n = 0; return () => `r${++n}`; })() }, window: { setTimeout, clearTimeout }, document: { addEventListener: noop, removeEventListener: noop }, require(name) {
    return all[name] ?? (name === 'react/jsx-runtime' ? require(name) : new Proxy({ __esModule: true, default: name }, { get: (target, key) => target[key] ?? noop }));
  } };
  runInNewContext(compiled, context);
  return props => { cursor = 0; return context.exports.default(props); };
}

const hujjat = {
  id: 'p1', number: 'KR-2', status: 'DRAFT', currency: 'USD', supplierId: 's1', warehouseId: 'w1', responsibleId: 'u7', date: '2026-11-12T12:22:00.000Z',
  note: 'Nomi: Kirim hujjati #2 | izoh', items: [
    { modificationId: 'm1', quantity: 500, price: 0.11, modification: { id: 'm1', name: '3,6*20', productId: 'pr1' } },
    { modificationId: 'm2', quantity: 120, price: 1.5, unitId: 'kor', unitQuantity: 10, unitPrice: 18, factorSnapshot: 12, modification: { id: 'm2', name: '4,2*300', productId: 'pr2' } },
  ],
};

test('YangiKirimModal tahrir: saqlangan qiymatlar bilan ochiladi, "Saqlash" PATCH (kirimYangilash) yuboradi, yaratish emas', async () => {
  const chaqiruvlar = [];
  const store = {
    omborlar: [{ id: 'w1', name: 'Tepa dokon' }], kirimlar: [], yetkazibBeruvchilar: [{ id: 's1', name: 'Asia Scotch' }], xodimlar: [],
    modifikatsiyalar: [], qoldiqlar: [], amalBajarilmoqda: false, xatolik: null, xatolikniTozalash: noop,
    kirimYaratish: async (d) => { chaqiruvlar.push(['yaratish', d]); return { id: 'yangi' }; },
    kirimYangilash: async (id, d) => { chaqiruvlar.push(['yangilash', id, d]); return { id }; },
    kirimTasdiqlash: async () => true, malumotlarniYuklash: async () => {},
  };
  const useOmborStore = Object.assign(() => store, { getState: () => store });
  const render = component('../src/Pages/Ombor/YangiKirimModal.tsx', {
    '@/store/omborStore': { useOmborStore },
    '@/store/authProfileStore': { useAuthProfileStore: (sel) => sel({ profil: { id: 'u1' }, profilniYuklash: noop }) },
  });
  let yopildi = 0;
  const props = { tahrir: hujjat, onClose: () => { yopildi++; } };
  const tree = render(props);
  assert.ok(nodes(tree).some((n) => n.props?.children === 'yangiKirim.editTitle'), 'sarlavha — tahrirlash');
  assert.ok(nodes(tree).some((n) => n.props?.children === 'yangiKirim.badgeDraft'));
  assert.equal(nodes(tree).find((n) => n.type === 'input' && n.props.placeholder === 'yangiKirim.namePlaceholder').props.value, 'Kirim hujjati #2');
  assert.equal(nodes(tree).find((n) => n.type === 'textarea').props.value, 'izoh');
  const saqlash = nodes(tree).filter((n) => typeof n.type === 'function' && n.props?.children === 'yangiKirim.save')[0];
  saqlash.props.onClick();
  for (let i = 0; i < 20 && !chaqiruvlar.length; i++) await new Promise((r) => setTimeout(r, 5));
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(chaqiruvlar.length, 1);
  const [tur, id, tana] = chaqiruvlar[0];
  assert.equal(tur, 'yangilash');
  assert.equal(id, 'p1');
  const body = plain(tana);
  assert.equal(body.date, undefined, 'sana o\'zgarmagan — yuborilmaydi');
  assert.equal(body.supplierId, 's1');
  assert.equal(body.warehouseId, 'w1');
  assert.equal(body.responsibleId, 'u7', 'saqlangan mas\'ul o\'zgarmaydi');
  assert.equal(body.currency, 'USD');
  assert.equal(body.note, 'Nomi: Kirim hujjati #2 | izoh');
  assert.deepEqual(body.items.map((i) => [i.modificationId, i.quantity, i.price, i.unitId]), [['m1', 500, 0.11, undefined], ['m2', 10, 18, 'kor']], "birliklar yuklanmagan bo'lsa ham korobka saqlanadi");
  assert.equal(yopildi, 1);
});

test('KirimTafsilotModal: "Tahrirlash" faqat DRAFT va ruxsatli rolda, YangiKirimModal tahrir bilan ochiladi', () => {
  const kod = readFileSync(new URL('../src/Pages/Ombor/KirimTafsilotModal.tsx', import.meta.url), 'utf8');
  assert.match(kod, /const tahrirMumkin = useHujjatniOchirishMumkinmi\("ombor"\);/);
  assert.match(kod, /\{hujjat && status === "DRAFT" && tahrirMumkin && <button[\s\S]*?setTahrirOchiq\(true\)[\s\S]*?kirimTafsilotModal\.editButton/);
  assert.match(kod, /<YangiKirimModal tahrir=\{hujjat\} onClose=\{\(\) => \{ setTahrirOchiq\(false\); void qaytaYuklash\(\); \}\} \/>/);
  const ruxsat = readFileSync(new URL('../src/hooks/useHujjatniOchirishMumkinmi.ts', import.meta.url), 'utf8');
  assert.match(ruxsat, /OMBOR_ROLLARI = \["OMBORCHI", "STOREKEEPER", "ADMIN", "DIREKTOR"\]/);
});
