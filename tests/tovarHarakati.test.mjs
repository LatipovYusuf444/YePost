import test from 'node:test';
import assert from 'node:assert/strict';
import * as model from '../src/Pages/HisobotUchot/tovarHarakatiModeli.ts';
import { guruhSahifasi } from '../src/lib/guruhSahifasi.ts';
import { hujjatQatoriTanlangan } from '../src/lib/hujjatQatoriTanlovi.ts';
import { defaults, normalizePreferences } from '../src/Components/common/smart-table/preferences.ts';
import { harakatEksportQatorlari, tovarHarakatiniEksport } from '../src/Pages/HisobotUchot/tovarHarakatiEksporti.ts';

const filter = { dateFrom: '2026-10-10', dateTo: '2026-11-09', warehouseIds: [], filialIds: [], categoryIds: [], productIds: [], xarakteristikaIds: [], customerIds: [], supplierIds: [] };
const raw = extra => ({ id: 'movement-1', type: 'SALE', refId: 'ac92f8a3-346d-4f78-8b74-f3a3bbb4f4a2', docNumber: 'SOT-000251', date: '2026-10-26T15:56:01.287Z', productId: 'product-1', modificationId: 'variant-1', productName: 'кук 6*200', counterpartyName: 'Abduqodir Parkent', warehouseId: 'w1', warehouseName: 'Tepa dokon', quantity: -10, price: 27000, total: 270000, currency: 'UZS', openingBalance: 10, closingBalance: 0, ...extra });
const rows = values => model.harakatlarniMoslash({ items: values });
const compact = text => text.replace(/\s/g, '');

test('stock rows retain document identity and all identifying metadata, independently of movement id', () => {
  const [row] = rows([raw()]);
  assert.equal(row.id, 'movement-1');
  assert.equal(row.refId, 'ac92f8a3-346d-4f78-8b74-f3a3bbb4f4a2');
  assert.equal(row.type, 'SALE');
  assert.equal(row.counterpartyName, 'Abduqodir Parkent');
  assert.equal(row.warehouseName, 'Tepa dokon');
  assert.equal(row.harakatMiqdori, -10);
  assert.equal(row.closingBalance, 0);
  assert.equal(row.summaSom, 270000);
  assert.match(model.harakatHavolasi(row).href, /sotuv=ac92f8a3/);
});

test('a document number is never substituted for a missing refId', () => {
  const [row] = rows([raw({ refId: undefined })]);
  assert.equal(row.refId, '');
  assert.equal(model.harakatHavolasi(row), null);
});

test('duplicate number detection distinguishes multiple documents from multiple product rows', () => {
  const source = rows([raw(), raw({ id: 'm2', modificationId: 'v2' }), raw({ id: 'm3', refId: '00db1632-538a-4946-b774-da838075493d', counterpartyName: 'Umar' }), raw({ id: 'm4', type: 'STOCK_TAKE', refId: 'inv-1' })]);
  const duplicates = model.takroriyHujjatRaqamlari(source);
  assert.equal(duplicates.size, 1);
  assert.equal(model.harakatRaqamiTakrormi(source[0], duplicates), true);
  assert.equal(model.harakatRaqamiTakrormi(source[3], duplicates), false);
  assert.equal(model.takroriyHujjatRaqamlari(source.slice(0, 2)).size, 0);
  assert.notEqual(model.harakatHavolasi(source[0]).href, model.harakatHavolasi(source[2]).href);
});

test('search finds customer, document number and warehouse without a catalogue record', () => {
  const source = rows([raw(), raw({ id: 'm2', productId: 'p2', productName: 'Other product', counterpartyName: 'Umar', refId: 'sale-2', docNumber: 'SOT-000052' })]);
  for (const term of ['Abduqodir', 'SOT-000251', 'кук']) {
    const result = model.harakatGuruhlari(source, [], filter, term);
    assert.equal(result.length, 2);
    assert.equal(result[1].harakat.refId, source[0].refId);
  }
  assert.equal(model.harakatGuruhlari(source, [], filter, 'Tepa dokon').filter(row => row.kind === 'header').length, 2);
  assert.equal(model.harakatGuruhlari(source, [], filter, 'missing').length, 0);
});

test('stock direction follows the signed quantity, including stock-take shortage and reversed sale', () => {
  const source = rows([raw({ id: 'inv', type: 'STOCK_TAKE', quantity: -3, openingBalance: 10, closingBalance: 7 }), raw({ id: 'reverse', quantity: 10, openingBalance: 7, closingBalance: 17, date: '2026-10-27' })]);
  const result = model.harakatGuruhlari(source, [], filter);
  assert.equal(result[0].boshQoldiq, 10);
  assert.equal(result[0].chiqim, 3);
  assert.equal(result[0].kirim, 10);
  assert.equal(result[0].oxirgiQoldiq, 17);
  assert.equal(result[1].chiqim, 3);
  assert.equal(result[2].kirim, 10);
});

test('pagination keeps each product header and all its movements together', () => {
  const source = rows(Array.from({ length: 11 }, (_, product) => Array.from({ length: product + 1 }, (_, movement) => raw({ id: `${product}:${movement}`, productId: `p${product}`, productName: `Product ${product}` }))).flat());
  const grouped = model.harakatGuruhlari(source, [], filter);
  const first = guruhSahifasi(grouped, row => row.guruhId, 1, 10);
  const second = guruhSahifasi(grouped, row => row.guruhId, 2, 10);
  assert.equal(first.total, 11);
  assert.equal(first.rows.filter(row => row.kind === 'header').length, 10);
  assert.equal(second.rows.length, 12);
  assert.equal(second.rows[0].kind, 'header');
  assert.ok(second.rows.every(row => row.guruhId === 'p10'));
  assert.equal(guruhSahifasi(grouped, row => row.guruhId, 100, 10).page, 2);
});

test('USD conversion uses the saved document rate and never adds raw USD to UZS', () => {
  const source = rows([raw({ currency: 'USD', price: '1.25', total: '12.5', rate: '11860' }), raw({ id: 'm2', price: '7000', total: '70000' })]);
  assert.equal(source[0].narxSom, 14825);
  assert.equal(source[0].summaSom, 148250);
  assert.match(compact(model.harakatPulMatni(source[0], 'narx')), /14825so'm\(\$1[,.]25\)/);
  assert.deepEqual(model.harakatPulJami(source), { kirim: 0, chiqim: 218250, toliq: true });
});

test('unknown currency or missing historical rate prevents a misleading UZS total', () => {
  const unknown = rows([raw({ currency: undefined, price: 1.25, total: 12.5, rate: 11860 })])[0];
  assert.equal(unknown.narxSom, null);
  assert.match(model.harakatPulMatni(unknown, 'narx'), /valyuta noma'lum/);
  const missingRate = rows([raw({ currency: 'USD', rate: undefined })])[0];
  assert.equal(missingRate.summaSom, null);
  assert.equal(model.harakatPulJami([unknown, missingRate]).toliq, false);
  const authoritative = rows([raw({ currency: 'USD', rate: undefined, priceUzs: 100, totalUzs: 0 })])[0];
  assert.equal(authoritative.narxSom, 100);
  assert.equal(authoritative.summaSom, 0);
});

test('Tashkent time and fallback customer labels are explicit', () => {
  assert.match(model.harakatSanaMatni('2026-10-26T15:56:01.287Z'), /20:56/);
  assert.equal(model.harakatKontragenti(rows([raw({ counterpartyName: '', customerId: '' })])[0]), 'Donalik mijoz');
  assert.equal(model.harakatKontragenti(rows([raw({ counterpartyName: '', customerId: 'c1' })])[0]), "Mijoz nomi ko'rsatilmagan");
});

test('highlight prefers an exact variant and never highlights another variant of the same product', () => {
  assert.equal(hujjatQatoriTanlangan({ modificationId: 'v1', productId: 'p1' }, { modificationId: 'v2', productId: 'p1' }), false);
  assert.equal(hujjatQatoriTanlangan({ modificationId: 'v1' }, { modificationId: 'v1' }), true);
  assert.equal(hujjatQatoriTanlangan(undefined, { modificationId: 'v1' }), false);
});

test('money columns start hidden, including with older saved table settings, and can be enabled', () => {
  const columns = [{ id: 'name', label: 'Name', required: false, min: 80, max: 800 }, { id: 'price', label: 'Price', required: false, min: 80, max: 800, defaultHidden: true }];
  assert.deepEqual(defaults(columns).hidden, ['price']);
  assert.deepEqual(normalizePreferences({ version: 1, order: ['name'], hidden: [] }, columns).hidden, ['price']);
  assert.deepEqual(normalizePreferences({ version: 1, order: ['name', 'price'], hidden: [] }, columns).hidden, []);
});

test('Excel preserves raw currencies and leaves unavailable converted cells empty', async () => {
  const source = rows([raw({ currency: 'USD', price: 1.25, total: 12.5, rate: 11860 }), raw({ id: 'm2', currency: undefined })]);
  const grouped = model.harakatGuruhlari(source, [], filter);
  const records = harakatEksportQatorlari(grouped, [], [], []);
  assert.equal(records[0][12], 'USD');
  assert.equal(records[0][15], 14825);
  assert.equal(records[1][12], 'Noma\'lum');
  assert.equal(records[1][16], null);
  let blob, clicked = false;
  const originalDocument = globalThis.document;
  const create = URL.createObjectURL, revoke = URL.revokeObjectURL;
  const link = { click() { clicked = true; }, remove() {} };
  globalThis.document = { createElement: () => link, body: { appendChild() {} } };
  URL.createObjectURL = value => { blob = value; return 'blob:test'; };
  URL.revokeObjectURL = () => {};
  try {
    await tovarHarakatiniEksport(grouped, [], [], [], filter.dateFrom, filter.dateTo);
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.default.Workbook();
    await workbook.xlsx.load(await blob.arrayBuffer());
    assert.equal(clicked, true);
    assert.equal(workbook.getWorksheet('Tovar harakati').rowCount, 3);
    assert.equal(workbook.getWorksheet('Tovar harakati').getCell('M2').value, 'USD');
    assert.equal(workbook.getWorksheet('Tovar harakati').getCell('Q2').value, 148250);
    assert.equal(workbook.getWorksheet('Tovar harakati').getCell('Q3').value, null);
  } finally {
    URL.createObjectURL = create; URL.revokeObjectURL = revoke;
    if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument;
  }
});
