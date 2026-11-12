// "Faqat dollar" (USD_ONLY) rejimidagi frontend xatolari (TZ 12.11.2026, Jamol12): dollardagi tovar savatchaga qo'shiladi, qoralama $ da,
// valyutasi yozilmagan yozuvlar "UZS" emas — asosiy valyuta.
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';

const src = new URL('../src/', import.meta.url);
const axiosStub = `data:text/javascript,${encodeURIComponent(`
  const client = { async get(url) { return { data: url === '/settings/currency' ? { ...globalThis.__rejim } : { date: '2026-11-12', rate: null } }; } };
  export default client;
`)}`;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.startsWith(src.href)) {
      if (specifier === './axios' || specifier === '@/api/axios') return { url: axiosStub, shortCircuit: true };
      if (specifier.startsWith('@/')) return { url: new URL(specifier.slice(2) + '.ts', src).href, shortCircuit: true };
      if (specifier.startsWith('.') && !specifier.endsWith('.ts')) return { url: new URL(specifier + '.ts', context.parentURL).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
const xotira = new Map();
globalThis.window = { localStorage: { getItem: (k) => xotira.get(k) ?? null, setItem: (k, v) => xotira.set(k, v), removeItem: (k) => xotira.delete(k) } };
globalThis.localStorage = globalThis.window.localStorage;

const { asosiyValyuta, valyutaYokiAsosiy } = await import('../src/lib/asosiyValyuta.ts');
const { useValyutaStore, valyutaKodi } = await import('../src/lib/valyuta.ts');
const { narxValyutalari } = await import('../src/lib/narxValyutasi.ts');
const { katalogQidiruvQatoriniMoslash, katalogNarxiniQoldiqqaMoslash } = await import('../src/api/catalogSearch.ts');
const { qoldiqNarxi, somdagiNarxmi } = await import('../src/Components/layout/posMahsulotlari.ts');
const { sotuvValyutasi, sotuvSummasi } = await import('../src/Pages/Savdo/savdoYordamchilari.ts');
const { harakatPulJami } = await import('../src/Pages/HisobotUchot/tovarHarakatiModeli.ts');

async function rejim(mode) {
  globalThis.__rejim = { mode, enabled: mode === 'DUAL', reportCurrency: mode === 'USD_ONLY' ? 'USD' : 'UZS', defaultCurrency: mode === 'USD_ONLY' ? 'USD' : 'UZS' };
  await useValyutaStore.getState().kursniYuklash();
}

// Real javob (GET /catalog/modifications/search?search=Moshinka moy sariq): narxda valyuta yozilmagan, birlikda — USD.
const moshinkaMoy = {
  modificationId: 'm1', productId: 'p1', quantity: 12,
  modification: { id: 'm1', name: 'Asosiy variant', barcode: '111', product: { id: 'p1', name: 'Moshinka moy sariq', isActive: true }, price: { retailPrice: '0.17', wholesalePrice: '0.15' } },
  units: [{ unitId: 'u1', name: 'dona', factor: 1, isBase: true, currency: 'USD', wholesaleCurrency: 'USD', effectiveRetailPrice: '0.17' }],
};
function qoldiqqa(qator) {
  const mod = katalogQidiruvQatoriniMoslash(qator);
  const { modificationPrice, ...narx } = katalogNarxiniQoldiqqaMoslash(mod.price);
  return { modificationId: mod.id, quantity: 12, ...narx, modification: { ...mod, price: modificationPrice } };
}

test('1-xato: "Moshinka moy sariq" ($0.17, valyuta units[].currency da) — Faqat dollar rejimida savatchaga $0.17 bilan, kurssiz', async () => {
  await rejim('USD_ONLY');
  const mod = katalogQidiruvQatoriniMoslash(moshinkaMoy);
  assert.equal(mod.price.retailCurrency, 'USD');
  assert.equal(mod.price.wholesaleCurrency, 'USD');
  const item = qoldiqqa(moshinkaMoy);
  assert.equal(item.valyuta?.currency, 'USD');
  assert.equal(qoldiqNarxi(item, 'chakana', { rejim: 'USD_ONLY' }), 0.17, 'qidiruvda "—" emas, $0.17');
  assert.equal(somdagiNarxmi(item, 'chakana'), false, '"narxi so\'mda kiritilgan" ogohlantirishi chiqmaydi');
});

test('narxda valyuta aniq yozilgan bo\'lsa units o\'zgartirmaydi; haqiqiy so\'m narx — ogohlantirish chiqadi', async () => {
  await rejim('USD_ONLY');
  const somda = { ...moshinkaMoy, modification: { ...moshinkaMoy.modification, price: { retailPrice: '12000', retailCurrency: 'UZS', wholesaleCurrency: 'UZS' } } };
  assert.equal(katalogQidiruvQatoriniMoslash(somda).price.retailCurrency, 'UZS');
  assert.equal(somdagiNarxmi(qoldiqqa(somda), 'chakana'), true);
});

test('valyutasi yozilmagan narx/yozuv: Faqat dollar — USD, Faqat so\'m va ikki valyuta (defaultCurrency UZS) — UZS', async () => {
  await rejim('USD_ONLY');
  assert.equal(asosiyValyuta(), 'USD');
  assert.equal(valyutaYokiAsosiy(undefined), 'USD');
  assert.equal(valyutaYokiAsosiy('uzs'), 'UZS');
  assert.equal(valyutaKodi(null), 'USD');
  assert.deepEqual(narxValyutalari({ retailPrice: 1 }), { cost: 'USD', retail: 'USD', wholesale: 'USD' });
  await rejim('UZS_ONLY');
  assert.equal(valyutaYokiAsosiy(''), 'UZS');
  await rejim('DUAL');
  assert.equal(valyutaYokiAsosiy(undefined), 'UZS');
  assert.equal(valyutaYokiAsosiy('USD'), 'USD');
});

// 09.11 da (rejimdan oldin) yaratilgan qoralama: GET /sales/c5cee084-…
const qoralama1 = { id: 's1', status: 'DRAFT', currency: 'UZS', totalAmount: '0', totalsByCurrency: { USD: '1.18' }, items: [{ quantity: '2', price: '0.59', currency: 'USD' }] };

test('2-xato: qoralama №1 (currency UZS, qatorlar $) Faqat dollar rejimida $1.18 — qatorli va qatorsiz (ro\'yxat) javobda', async () => {
  await rejim('USD_ONLY');
  assert.equal(sotuvValyutasi(qoralama1), 'USD');
  assert.equal(sotuvSummasi(qoralama1), 1.18);
  const royxatdagi = { ...qoralama1, items: undefined };
  assert.equal(sotuvValyutasi(royxatdagi), 'USD', 'totalsByCurrency bo\'yicha');
  assert.equal(sotuvSummasi(royxatdagi), 1.18);
  // haqiqatan so'mli eski qoralama "$" bilan chiqmaydi
  assert.equal(sotuvValyutasi({ status: 'DRAFT', currency: 'UZS', items: [{ currency: 'UZS' }] }), 'UZS');
  // tasdiqlangan hujjat o'z valyutasida
  assert.equal(sotuvValyutasi({ ...qoralama1, status: 'CONFIRMED' }), 'UZS');
  await rejim('DUAL');
  assert.equal(sotuvValyutasi(qoralama1), 'UZS', 'ikki valyuta rejimida avvalgidek');
});

test('Tovar harakati jami: Faqat dollar rejimida dollar summalari, so\'mga o\'girilmaydi', () => {
  const rows = [
    { harakatMiqdori: 2, summa: 10, valyuta: 'USD', summaSom: null },
    { harakatMiqdori: -1, summa: 4, valyuta: 'USD', summaSom: null },
  ];
  assert.deepEqual(harakatPulJami(rows, 'USD'), { kirim: 10, chiqim: 4, toliq: true });
  // so'mdagi (eski) qator dollarga o'girilmaydi — jami to'liq emas
  assert.equal(harakatPulJami([...rows, { harakatMiqdori: 1, summa: 5000, valyuta: 'UZS', summaSom: 5000 }], 'USD').toliq, false);
  // standart (so'm) avvalgidek
  assert.deepEqual(harakatPulJami(rows), { kirim: 0, chiqim: 0, toliq: false });
});

test('3-xato: kassada valyuta filtri bir valyutali rejimda ko\'rsatilmaydi, "Jami" faqat asosiy valyutada', () => {
  const kod = readFileSync(new URL('../src/Pages/KassaUchot/index.tsx', import.meta.url), 'utf8');
  assert.match(kod, /\{!yagonaValyuta && \(\s*<label className="text-xs font-bold text-gray-700">\s*Valyuta/);
  assert.match(kod, /\.filter\(\(valyuta\) => !yagonaValyuta \|\| valyuta === yagonaValyuta\)/);
});

test('4: TZ dagi joylarda "UZS" standart qiymati qolmagan', () => {
  const o = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');
  assert.doesNotMatch(o('lib/valyuta.ts'), /export function valyutaKodi[^}]*: "UZS"/);
  assert.doesNotMatch(o('lib/qarzTaqsimoti.ts'), /=== "USD" \? "USD" : "UZS"/);
  assert.doesNotMatch(o('Pages/KassaUchot/index.tsx'), /currency \?\? "UZS"/);
  assert.doesNotMatch(o('api/tolovTahririApi.ts'), /currency \?\? "UZS"/);
  assert.doesNotMatch(o('lib/narxValyutasi.ts'), /\?\? "UZS"/);
});
