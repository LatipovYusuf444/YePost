// Monitoring ombor grafiklari (GET /reports/warehouse-flow) va valyuta rejimi: so'ralgan valyuta korsatiladiganValyuta(), javob shu
// valyutada tekshiriladi va summalar o'girilmasdan formatlanadi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const src = new URL('../src/', import.meta.url);
// apiClient o'rniga yozib oluvchi stub: GET parametrlari tekshiriladi, backendga hech narsa ketmaydi.
const axiosStub = `data:text/javascript,${encodeURIComponent(`
  const client = {
    async get(url, config) {
      if (url === '/settings/currency') return { data: { ...globalThis.__rejim } };
      if (url === '/reports/warehouse-flow') {
        globalThis.__get = { url, params: config?.params };
        return { data: { success: true, data: { currency: config?.params?.currency, items: [], totals: {} } } };
      }
      return { data: { ...globalThis.__kurs } };
    },
    async patch() { return { data: {} }; },
    async put() { return { data: {} }; },
    async post() { return { data: {} }; },
    interceptors: { request: { use() {} }, response: { use() {} } },
  };
  export default client;
`)}`;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.startsWith(src.href)) {
      if (specifier === './axios' || specifier === '@/api/axios') return { url: axiosStub, shortCircuit: true };
      if (specifier === './sozlamalarApi') return { url: 'data:text/javascript,export const getApiErrorMessage = String;', shortCircuit: true };
      if (specifier.startsWith('@/')) return { url: new URL(specifier.slice(2) + '.ts', src).href, shortCircuit: true };
      if (specifier.startsWith('.') && !specifier.endsWith('.ts')) return { url: new URL(specifier + '.ts', context.parentURL).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const xotira = new Map();
globalThis.window = { localStorage: { getItem: (k) => xotira.get(k) ?? null, setItem: (k, v) => xotira.set(k, v), removeItem: (k) => xotira.delete(k) } };
globalThis.localStorage = globalThis.window.localStorage;

const v = await import('../src/lib/valyuta.ts');
const { hisobotPulMatni, hisobotValyutasiniTekshirish } = await import('../src/Pages/HisobotUchot/hisobotValyutasi.ts');
const { warehouseFlowReportApi } = await import('../src/api/reportsApi.ts');
const tozala = (matn) => matn.replace(/[\s  ]/g, '');

async function yukla(mode, reportCurrency = 'UZS', kurs = null) {
  globalThis.__rejim = { mode, reportCurrency, defaultCurrency: 'UZS' };
  globalThis.__kurs = { date: '2026-11-11', rate: kurs, rateDate: kurs ? '2026-11-11' : null };
  await v.useValyutaStore.getState().kursniYuklash();
}

const params = { dateFrom: '2026-11-01', dateTo: '2026-11-11', groupBy: 'DAY' };

test('Faqat dollar rejimida warehouse-flow dollarda so\'raladi va javob USD bo\'lishi kerak', async () => {
  await yukla('USD_ONLY');
  const valyuta = v.korsatiladiganValyuta();
  assert.equal(valyuta, 'USD');
  const javob = await warehouseFlowReportApi.olish({ ...params, currency: valyuta });
  assert.equal(globalThis.__get.params.currency, 'USD');
  assert.equal(hisobotValyutasiniTekshirish(javob.currency, valyuta), 'USD');
  assert.throws(() => hisobotValyutasiniTekshirish('UZS', valyuta));
  // Summa o'girilmaydi: 1250.5 dollar — "$1 250,5", kurs ishlatilmaydi.
  assert.equal(tozala(hisobotPulMatni(1250.5, valyuta)), tozala(v.oziValyutadaMatn(1250.5, 'USD')));
});

test('Faqat so\'m rejimida — so\'mda so\'raladi, summa yaxlit so\'mda', async () => {
  await yukla('UZS_ONLY', 'USD', 12500);
  const valyuta = v.korsatiladiganValyuta();
  assert.equal(valyuta, 'UZS');
  await warehouseFlowReportApi.olish({ ...params, currency: valyuta });
  assert.equal(globalThis.__get.params.currency, 'UZS');
  assert.equal(tozala(hisobotPulMatni(1500000.4, valyuta)), tozala("1 500 000 so'm"));
});

test('Ikki valyuta: hisobot valyutasi dollar va kurs bor — dollarda so\'raladi (server hisoblaydi, frontend o\'girmaydi)', async () => {
  await yukla('DUAL', 'USD', 12500);
  assert.equal(v.korsatiladiganValyuta(), 'USD');
  await warehouseFlowReportApi.olish({ ...params, currency: v.korsatiladiganValyuta() });
  assert.equal(globalThis.__get.params.currency, 'USD');
});

test('Ikki valyuta: hisobot valyutasi so\'m (yoki kurs yo\'q) — avvalgidek so\'mda so\'raladi', async () => {
  await yukla('DUAL', 'UZS', 12500);
  assert.equal(v.korsatiladiganValyuta(), 'UZS');
  await yukla('DUAL', 'USD', null);
  assert.equal(v.korsatiladiganValyuta(), 'UZS');
  await warehouseFlowReportApi.olish({ ...params, warehouseIds: '', currency: v.korsatiladiganValyuta() });
  assert.equal(globalThis.__get.params.currency, 'UZS');
  assert.equal('warehouseIds' in globalThis.__get.params, false);
});
