// Yetkazib beruvchiga qaytarish (backend d6534d7, /inventory/supplier-returns): forma → so'rov tanasi, kirim narxi, ulanish joylari.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as lib from '../src/lib/taminotchiQaytarish.ts';
import { HARAKAT_TURLARI, harakatHavolasi } from '../src/Pages/HisobotUchot/tovarHarakatiModeli.ts';
import { sahifagaRuxsatBormi } from '../src/lib/roles.ts';
import { xatoKodiMatni } from '../src/api/xatoKodlari.ts';

const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8');
const matn = (kalit) => kalit;
const qator = (qism = {}) => ({ id: 'q1', modificationId: 'm1', warehouseId: 'w1', quantity: '3', purchaseId: '', price: '15000', narxKirimdan: false, seriyali: false, batchId: '', serial: '', ...qism });
const forma = (qism = {}) => ({ supplierId: 's1', currency: 'UZS', note: ' Qadoqi singan ', qatorlar: [qator()], ...qism });

test('kirimsiz qatorda narx majburiy va yuboriladi; izoh tozalanadi', () => {
  const natija = lib.qaytarishTanasiniYigish(forma(), matn, { date: '2026-11-18', responsibleId: 'u1' });
  assert.deepEqual(natija.tana, {
    date: '2026-11-18', supplierId: 's1', currency: 'UZS', responsibleId: 'u1', note: 'Qadoqi singan',
    items: [{ modificationId: 'm1', warehouseId: 'w1', quantity: 3, price: 15000 }],
  });
  assert.deepEqual(lib.qaytarishTanasiniYigish(forma({ qatorlar: [qator({ price: '' })] }), matn).xatolar, { 'items.0.price': 'errors.priceRequired' });
});

test('kirim tanlansa: narx o\'zgartirilmagan bo\'lsa yuborilmaydi (server kirim narxini qo\'yadi), o\'zgartirilsa yuboriladi', () => {
  const kirimdan = lib.qaytarishTanasiniYigish(forma({ qatorlar: [qator({ purchaseId: 'p1', price: '15000', narxKirimdan: true })] }), matn);
  assert.deepEqual(kirimdan.tana.items, [{ modificationId: 'm1', warehouseId: 'w1', quantity: 3, purchaseId: 'p1' }]);
  const qolda = lib.qaytarishTanasiniYigish(forma({ qatorlar: [qator({ purchaseId: 'p1', price: '14000', narxKirimdan: false })] }), matn);
  assert.deepEqual(qolda.tana.items, [{ modificationId: 'm1', warehouseId: 'w1', quantity: 3, purchaseId: 'p1', price: 14000 }]);
  // Kirimli qatorda narx bo'sh bo'lsa ham xato emas.
  assert.ok(lib.qaytarishTanasiniYigish(forma({ qatorlar: [qator({ purchaseId: 'p1', price: '' })] }), matn).tana);
});

test('majburiy maydonlar: yetkazib beruvchi, mahsulot, ombor, miqdor > 0, rulonli tovarda rulon', () => {
  const xatolar = lib.qaytarishTanasiniYigish(forma({ supplierId: '', qatorlar: [qator({ modificationId: '', warehouseId: '', quantity: '0', price: '-1' })] }), matn).xatolar;
  assert.deepEqual(xatolar, { supplierId: 'errors.supplier', 'items.0.modificationId': 'errors.product', 'items.0.warehouseId': 'errors.warehouse', 'items.0.quantity': 'errors.quantity', 'items.0.price': 'errors.price' });
  assert.deepEqual(lib.qaytarishTanasiniYigish(forma({ qatorlar: [qator({ seriyali: true })] }), matn).xatolar, { 'items.0.batchId': 'errors.rollRequired' });
  const rulon = lib.qaytarishTanasiniYigish(forma({ qatorlar: [qator({ seriyali: true, batchId: 'b1', quantity: '230,5' })] }), matn).tana;
  assert.deepEqual(rulon.items, [{ modificationId: 'm1', warehouseId: 'w1', quantity: 230.5, batchId: 'b1', price: 15000 }]);
  // Xato kaliti formadagi qator raqami (o'rtadagi bo'sh qator hisobni siljitmaydi).
  const oraliq = lib.qaytarishTanasiniYigish(forma({ qatorlar: [qator(), qator({ id: 'q2', modificationId: '', quantity: '', price: '' }), qator({ id: 'q3', price: '' })] }), matn);
  assert.deepEqual(oraliq.xatolar, { 'items.2.price': 'errors.priceRequired' });
  // Butunlay bo'sh qatorlar tashlanadi; birorta ham qator bo'lmasa — xato.
  assert.deepEqual(lib.qaytarishTanasiniYigish(forma({ qatorlar: [qator({ modificationId: '', quantity: '', price: '' })] }), matn).xatolar, { items: 'errors.noLines' });
});

test('kirim narxi: shu tovarning kirimdagi o\'rtacha narxi; mos kirimlar — tasdiqlangan, shu yetkazib beruvchiniki, tovar bor', () => {
  const kirim = { items: [{ modificationId: 'm1', quantity: 10, price: 15000 }, { modificationId: 'm1', quantity: 30, price: 16000 }, { modificationId: 'm2', quantity: 1, price: 1 }] };
  assert.equal(lib.kirimNarxi(kirim, 'm1'), 15750);
  assert.equal(lib.kirimNarxi(kirim, 'm9'), undefined);
  const kirimlar = [
    { id: 'p1', status: 'CONFIRMED', supplierId: 's1', date: '2026-11-10', items: [{ modificationId: 'm1' }] },
    { id: 'p2', status: 'DRAFT', supplierId: 's1', date: '2026-11-12', items: [{ modificationId: 'm1' }] },
    { id: 'p3', status: 'CONFIRMED', supplierId: 's2', date: '2026-11-12', items: [{ modificationId: 'm1' }] },
    { id: 'p4', status: 'CONFIRMED', supplierId: 's1', date: '2026-11-15', items: [{ modificationId: 'm1' }] },
    { id: 'p5', status: 'CONFIRMED', supplierId: 's1', date: '2026-11-16', items: [{ modificationId: 'm2' }] },
  ];
  assert.deepEqual(lib.mosKirimlar(kirimlar, 's1', 'm1').map((k) => k.id), ['p4', 'p1']);
  assert.deepEqual(lib.mosKirimlar(kirimlar, '', 'm1'), []);
  assert.equal(lib.formaJami([{ quantity: '3', price: '15000' }, { quantity: '2,5', price: '1 000' }]), 47500);
});

test('saqlangan hujjat → forma (tahrir): narx foydalanuvchi qiymati, kirim va rulon saqlanadi', () => {
  const hujjat = { id: 'r1', status: 'DRAFT', supplierId: 's1', currency: 'USD', note: 'singan', items: [{ id: 'i1', modificationId: 'm1', warehouseId: 'w1', quantity: '3', price: '1.25', purchaseId: 'p1', batchId: null }] };
  const f = lib.hujjatdanForma(hujjat, (id) => id === 'm1');
  assert.equal(f.currency, 'USD');
  assert.deepEqual(f.qatorlar[0], { id: 'i1', modificationId: 'm1', warehouseId: 'w1', quantity: '3', purchaseId: 'p1', price: '1.25', narxKirimdan: false, seriyali: true, batchId: '', serial: '' });
  assert.equal(lib.qaytarishHolati('CANCELED'), 'CANCELLED');
  assert.equal(lib.qaytarishHolati(undefined), 'DRAFT');
});

test('ulanish: menyu, marshrut, hujjat turi, manfiy qoldiq, tovar harakati va hisob-kitob yorliqlari', () => {
  assert.match(manba('src/Components/layout/YonPanel.tsx'), /key: "taminotchiQaytarish", path: "\/ombor\/yetkazib-beruvchiga-qaytarish"/);
  assert.match(manba('src/routes/AppRouter.tsx'), /path="\/ombor\/yetkazib-beruvchiga-qaytarish" element={<TaminotchiQaytarish \/>}/);
  for (const til of ['uz', 'ru']) {
    assert.ok(JSON.parse(manba(`src/i18n/locales/${til}/nav.json`)).menu.taminotchiQaytarish, til);
    assert.ok(JSON.parse(manba(`src/i18n/locales/${til}/ombor_royxat.json`)).taminotchiQaytarish.title, til);
  }
  assert.match(manba('src/types/inventoryDocuments.ts'), /"SUPPLIER_RETURN"/);
  assert.match(manba('src/Pages/Ombor/TaminotchiQaytarish/QaytarishTafsilot.tsx'), /<InventoryDocumentActivity documentType="SUPPLIER_RETURN"/);
  assert.equal(HARAKAT_TURLARI.SUPPLIER_RETURN, 'Yetkazib beruvchiga qaytarish');
  assert.deepEqual(harakatHavolasi({ type: 'SUPPLIER_RETURN', refId: 'r1' }), { href: '/ombor/yetkazib-beruvchiga-qaytarish?hujjat=r1', nom: "Hujjat bo'limida ochish" });
  assert.match(manba('src/Pages/HisobotUchot/HujjatKorish.tsx'), /case "SUPPLIER_RETURN": return <QaytarishTafsilot \{\.\.\.props\} \/>;/);
  // Tovar qaytarish (VOZ-) va pul qaytishi (kassa) turli yorliq bilan.
  assert.match(manba('src/Pages/HisobotUchot/HisobKitobHujjatlariModal.tsx'), /PURCHASE_RETURN: "Tovar qaytarish", SUPPLIER_RETURN: "Pul qaytishi"/);
  // Omborchi kiradi, kassir kirmaydi.
  assert.equal(sahifagaRuxsatBormi({ role: 'STOREKEEPER' }, '/ombor/yetkazib-beruvchiga-qaytarish'), true);
  assert.equal(sahifagaRuxsatBormi({ role: 'CASHIER' }, '/ombor/yetkazib-beruvchiga-qaytarish'), false);
});

test('API yo\'llari va xato matnlari', () => {
  const api = manba('src/api/taminotchiQaytarishApi.ts');
  for (const yol of ['const YOL = "/inventory/supplier-returns"', '`${YOL}/${id}/confirm`', '`${YOL}/${id}/cancel`', '`${YOL}/${id}/restore`', 'apiClient.delete(`${YOL}/${id}`)', 'apiClient.patch']) assert.ok(api.includes(yol), yol);
  assert.match(api, /ogohlantirishBilanBajarish\(\(tana\) => apiClient\.post<Javob>\(`\$\{YOL\}\/\$\{id\}\/confirm`, tana\)\)/, 'before_stock_take savoli');
  for (const kod of ['supplier_return_not_found', 'supplier_return_price_required', 'supplier_return_purchase_mismatch', 'supplier_return_currency_mismatch']) {
    assert.ok(xatoKodiMatni(`errors.inventory.${kod}`, '/inventory/supplier-returns', 'uz'), kod);
    assert.ok(xatoKodiMatni(`errors.inventory.${kod}`, '/inventory/supplier-returns', 'ru'), kod);
  }
  // Kirimni bekor qilishda tovar qaytarishda tursa: avval qaytarishni bekor qilish kerakligi aytiladi; boshqa joyda server xabari.
  assert.match(xatoKodiMatni('errors.inventory.stock_already_consumed', '/inventory/purchases/p1/cancel', 'uz'), /yetkazib beruvchiga qaytarish/);
  assert.equal(xatoKodiMatni('errors.inventory.stock_already_consumed', '/inventory/write-offs/w1/cancel', 'uz'), null);
});
