// Do'kon valyuta rejimi (backend 11.11.2026): DUAL / UZS_ONLY / USD_ONLY — API, store yordamchilari va xato matni.
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const src = new URL('../src/', import.meta.url);
// apiClient o'rniga yozib oluvchi stub: PATCH tanasi tekshiriladi, backendga hech narsa ketmaydi.
const axiosStub = `data:text/javascript,${encodeURIComponent(`
  const client = {
    async patch(url, body) { globalThis.__patch = { url, body }; return { data: { ...globalThis.__javob } }; },
    async get(url) { return { data: url === '/settings/currency' ? { ...globalThis.__rejim } : { ...globalThis.__kurs } }; },
    async put() { return { data: {} }; },
  };
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

const { rejimKodiniOlish, rejimValyutasi, valyutaApi } = await import('../src/api/valyutaApi.ts');
const v = await import('../src/lib/valyuta.ts');
const { xatoKodiMatni } = await import('../src/api/xatoKodlari.ts');
const tozala = (matn) => matn.replace(/[\s  ]/g, '').replace(',', '.');

async function yukla(rejim, kurs = null) {
  globalThis.__rejim = rejim;
  globalThis.__kurs = { date: '2026-11-11', rate: kurs, rateDate: kurs ? '2026-11-11' : null };
  await v.useValyutaStore.getState().kursniYuklash();
}

test('rejimKodiniOlish: mode ustun, katta-kichik harf farqsiz; mode yo‘q bo‘lsa enabled bo‘yicha (eski backend)', () => {
  assert.equal(rejimKodiniOlish({ mode: 'USD_ONLY', enabled: true }), 'USD_ONLY');
  assert.equal(rejimKodiniOlish({ mode: 'uzs_only' }), 'UZS_ONLY');
  assert.equal(rejimKodiniOlish({ mode: 'DUAL' }), 'DUAL');
  assert.equal(rejimKodiniOlish({ enabled: true }), 'DUAL');
  assert.equal(rejimKodiniOlish({ enabled: false }), 'UZS_ONLY');
  assert.equal(rejimKodiniOlish({ mode: 'NOMALUM', enabled: false }), 'UZS_ONLY');
  assert.equal(rejimKodiniOlish(null), 'UZS_ONLY');
  assert.equal(rejimValyutasi('USD_ONLY'), 'USD');
  assert.equal(rejimValyutasi('UZS_ONLY'), 'UZS');
  assert.equal(rejimValyutasi('DUAL'), null);
});

test('PATCH /settings/currency: yangi forma faqat mode yuboradi; hisobot valyutasi faqat DUAL da', async () => {
  globalThis.__javob = { mode: 'USD_ONLY' };
  await valyutaApi.rejimniYangilash('USD_ONLY');
  assert.deepEqual(globalThis.__patch, { url: '/settings/currency', body: { mode: 'USD_ONLY' } });
  await valyutaApi.rejimniYangilash('USD_ONLY', 'UZS');
  assert.deepEqual(globalThis.__patch.body, { mode: 'USD_ONLY' }, 'bir valyutali rejimda boshqa reportCurrency yuborilmaydi');
  await valyutaApi.rejimniYangilash('DUAL', 'USD');
  assert.deepEqual(globalThis.__patch.body, { mode: 'DUAL', reportCurrency: 'USD' });
  assert.equal('enabled' in globalThis.__patch.body, false);
});

test('Faqat dollar (USD_ONLY), kurs yo‘q: hamma narsa $ da, kurs kerak emas, so‘m tanlovi rejim valyutasiga aylanadi', async () => {
  await yukla({ mode: 'USD_ONLY', enabled: false, reportCurrency: 'USD', defaultCurrency: 'USD' }, null);
  const h = v.useValyutaStore.getState();
  assert.equal(h.rejim, 'USD_ONLY');
  assert.equal(h.rejimYoniq, false, 'navbar va valyuta tanlovlari yashirin');
  assert.equal(h.kursBor, false);
  assert.equal(v.yagonaValyuta(), 'USD');
  assert.equal(v.standartValyuta(), 'USD');
  assert.equal(v.ruxsatEtilganValyuta('UZS'), 'USD');
  assert.equal(v.ruxsatEtilganValyuta(undefined), 'USD');
  assert.equal(v.korsatiladiganValyuta(), 'USD');
  assert.equal(tozala(v.pulMatni(12.5)), '$12.5', 'jami summa kurs bilan o‘girilmaydi');
});

test('Faqat dollar, kurs bor (Candy-gold: 12 000 kiritilgan): jami summalar baribir o‘girilmaydi', async () => {
  await yukla({ mode: 'USD_ONLY', reportCurrency: 'USD', defaultCurrency: 'USD' }, 12000);
  assert.equal(v.useValyutaStore.getState().kursBor, true);
  assert.equal(tozala(v.pulMatni(3.5)), '$3.5');
  assert.equal(tozala(v.pulMatni(3.5, 'USD')), '$3.5');
});

test('Faqat so‘m (UZS_ONLY): dollar yuborilmaydi, avvalgi "rejim o‘chiq" kabi so‘mda', async () => {
  await yukla({ mode: 'UZS_ONLY', enabled: false, reportCurrency: 'UZS', defaultCurrency: 'UZS' }, 12000);
  assert.equal(v.useValyutaStore.getState().rejimYoniq, false);
  assert.equal(v.yagonaValyuta(), 'UZS');
  assert.equal(v.ruxsatEtilganValyuta('USD'), 'UZS');
  assert.equal(v.korsatiladiganValyuta(), 'UZS');
  assert.equal(tozala(v.pulMatni(728000)), "728000so'm");
});

test('Ikki valyuta (DUAL): tanlov ishlaydi, standart — defaultCurrency, hisobot $ bo‘lsa jami kurs bilan o‘giriladi (avvalgidek)', async () => {
  await yukla({ mode: 'DUAL', enabled: true, reportCurrency: 'USD', defaultCurrency: 'UZS' }, 12100);
  assert.equal(v.useValyutaStore.getState().rejimYoniq, true);
  assert.equal(v.yagonaValyuta(), null);
  assert.equal(v.standartValyuta(), 'UZS');
  assert.equal(v.ruxsatEtilganValyuta('USD'), 'USD');
  assert.equal(v.ruxsatEtilganValyuta('UZS'), 'UZS');
  assert.equal(v.korsatiladiganValyuta(), 'USD');
  assert.equal(tozala(v.pulMatni(121000)), '$10');
});

test('rejim o‘qilmasa (ruxsat yo‘q) oxirgi ma‘lum rejim saqlanadi', async () => {
  await yukla({ mode: 'USD_ONLY' }, null);
  const asl = valyutaApi.rejimniOlish;
  valyutaApi.rejimniOlish = async () => { throw new Error('403'); };
  try {
    await v.useValyutaStore.getState().kursniYuklash();
    assert.equal(v.useValyutaStore.getState().rejim, 'USD_ONLY');
  } finally {
    valyutaApi.rejimniOlish = asl;
  }
});

test('errors.currency.not_allowed: javobdagi mode/allowed bo‘yicha aniq matn; mode_off o‘rniga', () => {
  const usd = xatoKodiMatni('errors.currency.not_allowed', '/sales', 'uz', { code: 'errors.currency.not_allowed', mode: 'USD_ONLY', allowed: ['USD'] });
  assert.match(usd, /faqat dollarda/);
  const uzs = xatoKodiMatni('errors.currency.not_allowed', '/sales', 'uz', { code: 'errors.currency.not_allowed', details: { mode: 'UZS_ONLY', allowed: ['UZS'] } });
  assert.match(uzs, /faqat so'mda/);
  assert.match(xatoKodiMatni('errors.currency.not_allowed', '/sales', 'ru', { mode: 'USD_ONLY' }), /только в долларах/);
  assert.ok(xatoKodiMatni('errors.currency.not_allowed', '/sales', 'uz', {}));
});
