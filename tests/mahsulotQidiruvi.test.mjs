import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { calls, handlers, reset } from './helpers/savdoYuklashClient.mjs';
import { parallelBajarish } from '../src/lib/parallelBajarish.ts';

// Bosh sahifa qidiruvi: so'z serverga yuboriladi, butun katalog brauzerda filtrlanmaydi va har mahsulot uchun alohida search= ketmaydi.
const fixture = new URL('./helpers/savdoYuklashClient.mjs', import.meta.url).href;
const src = new URL('../src/', import.meta.url);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.startsWith(src.href)) {
      if (['./axios', './catalogApi', './sozlamalarApi', './hujjatOgohlantirishi', '@/api/sozlamalarApi', '@/api/partnersApi', '@/Pages/Savdo/savdoYordamchilari'].includes(specifier)) {
        return { url: fixture, shortCircuit: true };
      }
      if (specifier.startsWith('@/')) return { url: new URL(specifier.slice(2) + '.ts', src).href, shortCircuit: true };
      if (specifier.startsWith('.') && !specifier.endsWith('.ts')) return { url: new URL(specifier + '.ts', context.parentURL).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
globalThis.window ??= new EventTarget();
const { mahsulotlarniServerdanQidirish, qoldiqNomlariniBoyitish } = await import('../src/api/savdoApi.ts');
const { serverQatorlari, qatorlarniUlash } = await import('../src/Components/layout/headerQidiruv.ts');

const mod = (id, nom, barcode, qism = {}) => ({ id, productId: `p-${id}`, name: 'Asosiy variant', barcode, article: qism.article, product: { id: `p-${id}`, name: nom }, price: { retailPrice: 5000, wholesalePrice: 4000 } });
const qator = (id, quantity, qism = {}) => ({ modificationId: id, productId: `p-${id}`, quantity, modification: mod(id, qism.nom ?? `Mahsulot ${id}`, qism.barcode ?? `BC${id}`, qism), ...qism });
const yozuv = (id, quantity, qism = {}) => ({ modificationId: id, productId: `p-${id}`, quantity, modification: { id, name: 'Asosiy variant', barcode: qism.barcode ?? `BC${id}`, article: qism.article, product: { id: `p-${id}`, name: qism.nom ?? `Mahsulot ${id}` } }, ...(qism.birliklar ? { birliklar: qism.birliklar } : {}), ...(qism.qidiruvBirligi ? { qidiruvBirligi: qism.qidiruvBirligi } : {}) });

test('search goes to the server once per warehouse with search, page, pageSize and warehouseId; stock comes from the search row', async () => {
  reset();
  handlers.set('qidiruvSahifasi', (sorov) => ({ items: [qator('m1', sorov.warehouseId === 'w1' ? '7' : '0')], total: 41 }));
  const natija = await mahsulotlarniServerdanQidirish({ search: 'sement', page: 2, pageSize: 20, warehouseIds: ['w1', 'w2'] });
  const sorovlar = calls.filter((call) => call.url === 'qidiruvSahifasi');
  assert.deepEqual(sorovlar.map((call) => call.sorov), [
    { search: 'sement', page: 2, pageSize: 20, warehouseId: 'w1', signal: undefined },
    { search: 'sement', page: 2, pageSize: 20, warehouseId: 'w2', signal: undefined },
  ]);
  assert.equal(calls.some((call) => String(call.url).includes('stock-balance')), false, 'qoldiq alohida so‘ralmaydi');
  assert.equal(natija[0].jami, 41);
  assert.equal(natija[0].qatorlar[0].quantity, 7);
  assert.equal(natija[1].qatorlar[0].quantity, 0);
  assert.equal(natija[0].qatorlar[0].modification.price.retailPrice, 5000);
});

test('without a warehouse list the search still works and returns the total across warehouses', async () => {
  reset();
  handlers.set('qidiruvSahifasi', () => ({ items: [qator('m1', 12)], total: 1 }));
  const natija = await mahsulotlarniServerdanQidirish({ search: 'x', warehouseIds: [] });
  assert.equal(calls.filter((call) => call.url === 'qidiruvSahifasi')[0].sorov.warehouseId, undefined);
  assert.equal(natija[0].warehouseId, '');
  assert.equal(natija[0].qatorlar[0].quantity, 12);
});

test('one failed warehouse keeps the others; when all fail the error reaches the caller', async () => {
  reset();
  handlers.set('qidiruvSahifasi', (sorov) => { if (sorov.warehouseId === 'w2') throw new Error('w2 down'); return { items: [qator('m1', 3)], total: 1 }; });
  assert.equal((await mahsulotlarniServerdanQidirish({ search: 'x', warehouseIds: ['w1', 'w2'] })).length, 1);
  handlers.set('qidiruvSahifasi', () => { throw new Error('down'); });
  await assert.rejects(mahsulotlarniServerdanQidirish({ search: 'x', warehouseIds: ['w1'] }), /down/);
});

test('inactive products are not offered', async () => {
  reset();
  handlers.set('qidiruvSahifasi', () => ({ items: [{ ...qator('m1', 3), modification: { ...mod('m1', 'Eski', 'B1'), product: { id: 'p', name: 'Eski', isActive: false } } }], total: 1 }));
  assert.equal((await mahsulotlarniServerdanQidirish({ search: 'x', warehouseIds: [] }))[0].qatorlar.length, 0);
});

test('rows split by warehouse: stocked warehouses first, nothing in stock becomes one unassigned row', () => {
  const natija = serverQatorlari([
    { warehouseId: 'w1', warehouseName: 'Bir', qatorlar: [yozuv('m1', 0), yozuv('m2', 0), yozuv('m3', -3)] },
    { warehouseId: 'w2', warehouseName: 'Ikki', qatorlar: [yozuv('m1', 5), yozuv('m2', 0), yozuv('m3', 2)] },
  ], 'mahsulot');
  assert.deepEqual(natija.map((row) => [row.kalit, row.warehouseName, row.qoldiq]), [
    ['m1::w2', 'Ikki', 5],
    ['m2::', '', 0],
    ['m3::w2', 'Ikki', 2],
    ['m3::w1', 'Bir', -3],
  ]);
});

test('with a single warehouse a zero-stock row stays on that warehouse (minusga sotish needs it)', () => {
  const [row] = serverQatorlari([{ warehouseId: 'w1', warehouseName: 'Bir', qatorlar: [yozuv('m1', 0)] }], 'x');
  assert.equal(row.warehouseId, 'w1');
  assert.equal(row.kalit, 'm1::w1');
});

test('exact barcode or article is rank 0 and first, server order is otherwise preserved, a partial code is not exact', () => {
  const natija = serverQatorlari([{ warehouseId: 'w1', warehouseName: 'Bir', qatorlar: [yozuv('b', 1, { nom: 'Bolt' }), yozuv('a', 1, { barcode: '4400', article: 'ART' }), yozuv('c', 1, { nom: 'Anker' })] }], '4400');
  assert.deepEqual(natija.map((row) => [row.item.modificationId, row.daraja]), [['a', 0], ['b', 2], ['c', 2]]);
  assert.equal(serverQatorlari([{ warehouseId: 'w1', warehouseName: 'Bir', qatorlar: [yozuv('a', 1, { barcode: '44001' })] }], '4400')[0].daraja, 2);
  assert.equal(serverQatorlari([{ warehouseId: 'w1', warehouseName: 'Bir', qatorlar: [yozuv('a', 1, { article: 'ART-1' })] }], 'art-1')[0].daraja, 0);
});

const pochka = { unitId: 'u-box', kod: null, nomi: 'Pochka', qisqa: 'poch', kasr: false, koeff: 10, asosiy: false, qabul: true, sotuv: true, chakana: null, ulgurji: null, shtrix: 'PACK1' };

test('a unit barcode (unitId in the search row) is exact and carries the sale unit; a partial match does not', () => {
  const [row] = serverQatorlari([{ warehouseId: 'w1', warehouseName: 'Bir', qatorlar: [yozuv('a', 50, { birliklar: [pochka], qidiruvBirligi: 'u-box' })] }], 'pack1');
  assert.equal(row.daraja, 0);
  assert.equal(row.birlik.unitId, 'u-box');
  const [qisman] = serverQatorlari([{ warehouseId: 'w1', warehouseName: 'Bir', qatorlar: [yozuv('a', 50, { birliklar: [pochka], qidiruvBirligi: 'u-box' })] }], 'pack');
  assert.equal(qisman.daraja, 2);
  assert.equal(qisman.birlik, undefined);
  const [shtrixsiz] = serverQatorlari([{ warehouseId: 'w1', warehouseName: 'Bir', qatorlar: [yozuv('a', 50, { birliklar: [{ ...pochka, shtrix: null }], qidiruvBirligi: 'u-box' })] }], 'pack1');
  assert.equal(shtrixsiz.daraja, 0, 'birlik shtrix-kodi javobda bo‘lmasa server unitId si ishoniladi');
});

test('next page rows are appended without duplicates', () => {
  const birinchi = serverQatorlari([{ warehouseId: 'w1', warehouseName: 'Bir', qatorlar: [yozuv('a', 1)] }], 'x');
  const ikkinchi = serverQatorlari([{ warehouseId: 'w1', warehouseName: 'Bir', qatorlar: [yozuv('a', 1), yozuv('b', 1)] }], 'x');
  assert.deepEqual(qatorlarniUlash(birinchi, ikkinchi).map((row) => row.kalit), ['a::w1', 'b::w1']);
});

const qoldiq = (id) => ({ modificationId: id, narxAniq: false, quantity: 3, modification: { id, barcode: `440${id}`, product: { id: `p${id}`, name: `Tovar ${id}` } } });

test('enriching 680 rows sends no per-barcode search: the catalogue is read once', async () => {
  reset();
  handlers.set('qidiruv', () => Array.from({ length: 680 }, (_, i) => mod(String(i), `Tovar ${i}`, `440${i}`)));
  const natija = await qoldiqNomlariniBoyitish(Array.from({ length: 680 }, (_, i) => qoldiq(String(i))));
  const qidiruvlar = calls.filter((call) => call.url === 'qidiruv');
  assert.equal(qidiruvlar.length, 1);
  assert.equal(qidiruvlar[0].q, undefined);
  assert.equal(natija.length, 680);
  assert.equal(natija[5].modification.price.retailPrice, 5000);
});

test('rows missing from the catalogue use the detail endpoint at most 6 at a time and keep their order', async () => {
  reset();
  let faol = 0;
  let eng = 0;
  handlers.set('qidiruv', () => []);
  handlers.set('olish', async (id) => {
    eng = Math.max(eng, ++faol);
    await new Promise((resolve) => setImmediate(resolve));
    faol -= 1;
    return mod(id, `Detail ${id}`, `D${id}`);
  });
  const natija = await qoldiqNomlariniBoyitish(Array.from({ length: 30 }, (_, i) => qoldiq(`d${i}`)));
  assert.ok(eng <= 6, `parallel ${eng}`);
  assert.deepEqual(natija.map((row) => row.modificationId), Array.from({ length: 30 }, (_, i) => `d${i}`));
  assert.equal(calls.filter((call) => call.url === 'qidiruv').length, 1);
});

test('a failed catalogue read leaves rows untouched instead of sending one request per row', async () => {
  reset();
  handlers.set('qidiruv', () => { throw new Error('catalog down'); });
  const qatorlar = Array.from({ length: 20 }, (_, i) => qoldiq(`f${i}`));
  assert.deepEqual(await qoldiqNomlariniBoyitish(qatorlar), qatorlar);
  assert.equal(calls.length, 1);
});

test('a handful of rows keeps the targeted lookup (no whole catalogue for a return document)', async () => {
  reset();
  handlers.set('qidiruv', (q) => (q === '4401' ? [mod('1', 'Bitta', '4401')] : []));
  const natija = await qoldiqNomlariniBoyitish([qoldiq('1')]);
  assert.deepEqual(calls.filter((call) => call.url === 'qidiruv').map((call) => call.q), ['4401']);
  assert.equal(natija[0].modification.product.name, 'Bitta');
});

test('parallelBajarish respects the limit, keeps order and stops on the first failure', async () => {
  let faol = 0;
  let eng = 0;
  const natija = await parallelBajarish([1, 2, 3, 4, 5, 6, 7], 3, async (son) => {
    eng = Math.max(eng, ++faol);
    await new Promise((resolve) => setTimeout(resolve, (8 - son) % 3));
    faol -= 1;
    return son * 2;
  });
  assert.deepEqual(natija, [2, 4, 6, 8, 10, 12, 14]);
  assert.equal(eng, 3);
  assert.deepEqual(await parallelBajarish([], 3, async () => 1), []);
  const boshlangan = [];
  await assert.rejects(parallelBajarish([1, 2, 3, 4], 1, async (son) => { boshlangan.push(son); if (son === 2) throw new Error('fail'); }), /fail/);
  assert.deepEqual(boshlangan, [1, 2]);
});
