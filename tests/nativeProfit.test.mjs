import test from 'node:test';
import assert from 'node:assert/strict';
import { foydaHisobotiniMoslash, engKopFoyda, qatorJufti } from '../src/Pages/HisobotUchot/foydaHisobotiModeli.ts';

const part = (qty, revenue, cost, profit, marginPct) => ({ qty, checks: 1, revenue, cost, profit, marginPct });
const nativeReport = {
  currency: 'USD',
  summary: {
    qtySold: 27, revenueUzs: 159033714, revenueUsd: 13500.32, costUzs: 108635052, costUsd: 9221.99, profitUzs: 50398662, profitUsd: 4278.32, marginPct: 31.69,
    bySaleCurrency: {
      UZS: { qtySold: 17, checks: 4, revenue: 121550000, cost: 85000000, profit: 36550000, marginPct: 30.07 },
      USD: { qtySold: 10, checks: 1, revenue: 1176.5, cost: 1000, profit: 176.5, marginPct: 15 },
    }, costMissing: { count: 1, revenue: { UZS: 0, USD: 100 } },
  },
  topProfit: [{ productId: 'legacy-top', productName: 'Converted result', profitUzs: 100000000, profitUsd: 9999 }],
  items: [
    { productId: 'both', productName: 'Mixed product', qtySold: 27, revenue: 13500.32, cost: 9221.99, profit: 4278.32, revenueUzs: 159033714, revenueUsd: 13500.32, costUzs: 108635052, costUsd: 9221.99, profitUzs: 50398662, profitUsd: 4278.32, marginPct: 31.69, bySaleCurrency: { UZS: part(17, 121550000, 85000000, 36550000, 30.07), USD: part(10, 1176.5, 1000, 176.5, 15) }, costMissing: false },
    { productId: 'missing', productName: 'No cost', qtySold: 1, revenue: 100, cost: 0, profit: 100, marginPct: 100, bySaleCurrency: { USD: part(1, 100, 0, 100, 100) }, costMissing: true },
    { productId: 'som-only', productName: 'Som only', qtySold: 1, revenue: 1, cost: .5, profit: .5, bySaleCurrency: { UZS: part(1, 20000, 15000, 5000, 25) }, costMissing: false },
  ],
};

test('native USD profit and margin use sale-currency groups, never legacy conversions', () => {
  const result = foydaHisobotiniMoslash(nativeReport, 'USD');
  assert.equal(result.aslValyutada, true);
  const row = result.qatorlar.find(row => row.id === 'both');
  assert.equal(row.tushum, 1176.5);
  assert.equal(row.tannarx, 1000);
  assert.equal(row.foyda, 176.5);
  assert.equal(row.rentabellik, 15);
  assert.equal(row.sotilgan, 10);
  assert.equal(result.xulosa.uzs.foyda, 36550000);
  assert.equal(result.xulosa.usd.foyda, 176.5);
  assert.equal(result.xulosa.bySaleCurrency.UZS.rentabellik, 30.07);
  assert.equal(result.xulosa.bySaleCurrency.USD.rentabellik, 15);
  assert.equal(result.eng, null, 'legacy converted topProfit cannot rank native profits');
  assert.deepEqual(qatorJufti(row, 'foyda', 'USD'), { asosiy: { summa: 176.5, valyuta: 'USD' }, qoshimcha: null });
});

test('UZS projection preserves backend historical cost; absent USD never falls back to UZS', () => {
  const uzs = foydaHisobotiniMoslash({ ...nativeReport, currency: 'UZS' }, 'UZS');
  assert.equal(uzs.qatorlar[0].foyda, 36550000);
  assert.equal(uzs.qatorlar[0].rentabellik, 30.07);
  const usd = foydaHisobotiniMoslash(nativeReport, 'USD');
  const somOnly = usd.qatorlar.find(row => row.id === 'som-only');
  assert.equal(somOnly.foyda, 0);
  assert.equal(somOnly.usd, null);
  assert.deepEqual(qatorJufti(somOnly, 'foyda', 'USD'), { asosiy: { summa: 0, valyuta: 'USD' }, qoshimcha: null });
});

test('missing cost is marked and excluded from profit rankings; explicit zero cost remains valid', () => {
  const result = foydaHisobotiniMoslash(nativeReport, 'USD');
  assert.equal(result.qatorlar.find(row => row.id === 'missing').tannarxKiritilmagan, true);
  assert.equal(result.xulosa.tannarxYetishmaganSoni, 1);
  assert.deepEqual(engKopFoyda(result.qatorlar).map(row => row.id), ['both']);
  const zero = foydaHisobotiniMoslash({ currency: 'USD', items: [{ productId: 'free', qtySold: 1, bySaleCurrency: { USD: part(1, 50, 0, 50, 100) }, costMissing: false }] }, 'USD');
  assert.equal(zero.qatorlar[0].tannarxKiritilmagan, false);
  assert.equal(engKopFoyda(zero.qatorlar)[0].id, 'free');
});
