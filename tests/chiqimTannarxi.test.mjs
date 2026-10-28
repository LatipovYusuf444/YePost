import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { chiqimTannarxi, chiqimJamilari } from '../src/lib/chiqimTannarxi.ts';

const stub = new URL('./helpers/valyutaApiStub.mjs', import.meta.url).href;
const src = new URL('../src/', import.meta.url);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.startsWith(src.href)) {
      if (specifier === '@/api/valyutaApi') return { url: stub, shortCircuit: true };
      if (specifier.startsWith('@/')) return { url: new URL(specifier.slice(2) + '.ts', src).href, shortCircuit: true };
      if (specifier.startsWith('.') && !specifier.endsWith('.ts')) return { url: new URL(specifier + '.ts', context.parentURL).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const { useValyutaStore, pulMatni } = await import('../src/lib/valyuta.ts');
// Kasr va minglik ajratgich tilga bog‘liq: bo‘shliqlar olib tashlanadi, vergul/nuqta farqi e’tiborga olinmaydi.
const tozala = (matn) => matn.replace(/[\s  ]/g, '').replace(',', '.');

test('a dollar cost price keeps its currency: 0.73 is $0.73, not 0.73 so‘m', () => {
  assert.deepEqual(
    chiqimTannarxi({ price: { costPrice: 0.73, costCurrency: 'USD', retailPrice: 9000, retailCurrency: 'UZS' } }),
    { narx: 0.73, valyuta: 'USD' },
  );
});

test('the legacy single currency and a missing currency are handled', () => {
  assert.deepEqual(chiqimTannarxi({ price: { costPrice: '1.5', currency: 'USD' } }), { narx: 1.5, valyuta: 'USD' });
  assert.deepEqual(chiqimTannarxi({ price: { costPrice: 12000 } }), { narx: 12000, valyuta: 'UZS' });
  assert.deepEqual(chiqimTannarxi(undefined), { narx: 0, valyuta: 'UZS' });
  assert.deepEqual(chiqimTannarxi({ price: { costPrice: 'abc' } }), { narx: 0, valyuta: 'UZS' });
});

test('the document total of dollar rows is in dollars (the backend total, when sent, is the same number)', () => {
  const qatorlar = [{ summa: 2.92, valyuta: 'USD' }];
  assert.deepEqual(chiqimJamilari(qatorlar), [{ valyuta: 'USD', summa: 2.92 }]);
  assert.deepEqual(chiqimJamilari(qatorlar, 2.92), [{ valyuta: 'USD', summa: 2.92 }]);
  assert.deepEqual(chiqimJamilari(qatorlar, '2.92'), [{ valyuta: 'USD', summa: 2.92 }]);
});

test('so‘m rows stay in so‘m exactly as before', () => {
  assert.deepEqual(chiqimJamilari([{ summa: 9000, valyuta: 'UZS' }, { summa: 1000, valyuta: 'UZS' }]), [{ valyuta: 'UZS', summa: 10000 }]);
  assert.deepEqual(chiqimJamilari([{ summa: 9000, valyuta: 'UZS' }], 10000), [{ valyuta: 'UZS', summa: 10000 }]);
});

test('without row data the total is so‘m, as it was', () => {
  assert.deepEqual(chiqimJamilari([]), [{ valyuta: 'UZS', summa: 0 }]);
  assert.deepEqual(chiqimJamilari([], 5000), [{ valyuta: 'UZS', summa: 5000 }]);
  assert.deepEqual(chiqimJamilari([], 'xato'), [{ valyuta: 'UZS', summa: 0 }]);
});

test('mixed currencies are summed per currency, a single backend number cannot be attributed to one of them', () => {
  const qatorlar = [
    { summa: 2.92, valyuta: 'USD' },
    { summa: 9000, valyuta: 'UZS' },
    { summa: 1.08, valyuta: 'USD' },
  ];
  assert.deepEqual(chiqimJamilari(qatorlar, 99999), [
    { valyuta: 'USD', summa: 4 },
    { valyuta: 'UZS', summa: 9000 },
  ]);
});

test('the screenshot case: 4 × $0.73 shows $0.73 and $2.92 even when the report currency is so‘m', () => {
  useValyutaStore.setState({ hisobotValyutasi: 'UZS', rejimYoniq: true, kurs: 12100, kursBor: true, yuklandi: true });
  const modification = { price: { costPrice: 0.73, costCurrency: 'USD', retailPrice: 9000, retailCurrency: 'UZS' } };
  const { narx, valyuta } = chiqimTannarxi(modification);
  const summa = 4 * narx;
  assert.equal(tozala(pulMatni(narx, valyuta)), '$0.73');
  assert.equal(tozala(pulMatni(summa, valyuta)), '$2.92');
  assert.equal(chiqimJamilari([{ summa, valyuta }], 2.92).map((j) => tozala(pulMatni(j.summa, j.valyuta))).join(' + '), '$2.92');
});

test('a so‘m cost still renders in so‘m', () => {
  useValyutaStore.setState({ hisobotValyutasi: 'UZS', rejimYoniq: true, kurs: 12100, kursBor: true, yuklandi: true });
  const { narx, valyuta } = chiqimTannarxi({ price: { costPrice: 9000, costCurrency: 'UZS' } });
  assert.equal(tozala(pulMatni(4 * narx, valyuta)), "36000so'm");
});
