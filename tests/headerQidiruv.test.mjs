import test from 'node:test';
import assert from 'node:assert/strict';
import { qidirish, KO_RSATILADIGAN_SONI, KATEGORIYA_RO_YXATI_SONI } from '../src/Components/layout/headerQidiruv.ts';

const qator = (id, nom, productId, qoldiq = 5, extra = {}) => ({
  kalit: `${id}::w1`,
  warehouseId: 'w1',
  warehouseName: 'Asosiy',
  qoldiq,
  item: {
    modificationId: id,
    productId,
    modification: { id, name: 'Asosiy variant', barcode: extra.barcode, article: extra.article, product: { id: productId, name: nom } },
  },
});

const qatorlar = [
  qator('m1', 'iPhone 15', 'p-ip15', 5, { barcode: '4000111', article: 'IP-15' }),
  qator('m2', 'iPhone 14', 'p-ip14', 0, { barcode: '4000114' }),
  qator('m3', 'Samsung S24', 'p-s24', 8, { barcode: '4000222' }),
  qator('m4', 'iPhone sim karta', 'p-sim', 3),
];
const iphone = new Set(['p-ip15', 'p-ip14']);

test('kategoriyasiz: yozuv bo‘lmasa natija yo‘q; yozuv bo‘lsa nom/shtrix/artikul bo‘yicha', () => {
  assert.deepEqual(qidirish(qatorlar, ''), []);
  assert.deepEqual(qidirish(qatorlar, '   '), []);
  assert.deepEqual(qidirish(qatorlar, 'iphone').map((q) => q.item.modificationId), ['m1', 'm4', 'm2']);
  assert.deepEqual(qidirish(qatorlar, 'ip-15').map((q) => q.item.modificationId), ['m1']);
  assert.deepEqual(qidirish(qatorlar, '4000222').map((q) => q.item.modificationId), ['m3']);
});

test('kategoriya tanlangan, yozuv yo‘q: shu kategoriyaning butun ro‘yxati (qoldig‘i borlar oldin, keyin nom bo‘yicha)', () => {
  const natija = qidirish(qatorlar, '', iphone);
  assert.deepEqual(natija.map((q) => q.item.modificationId), ['m1', 'm2']);
  assert.ok(natija.every((q) => q.daraja === 2));
  // kategoriyada mahsulot bo'lmasa — bo'sh
  assert.deepEqual(qidirish(qatorlar, '', new Set(['p-yoq'])), []);
});

test('kategoriya + yozuv: faqat shu kategoriya ichida qidiriladi', () => {
  assert.deepEqual(qidirish(qatorlar, 'iphone', iphone).map((q) => q.item.modificationId), ['m1', 'm2']);
  assert.deepEqual(qidirish(qatorlar, 'samsung', iphone), []);
  assert.deepEqual(qidirish(qatorlar, '15', iphone).map((q) => q.item.modificationId), ['m1']);
});

test('skaner kodi (shtrix/artikul aniq mos) kategoriyadan qat‘i nazar topiladi va birinchi turadi', () => {
  const natija = qidirish(qatorlar, '4000222', iphone);
  assert.deepEqual(natija.map((q) => [q.item.modificationId, q.daraja]), [['m3', 0]]);
  // qisman kod filtrdan o'tmaydi (faqat aniq mos istisno)
  assert.deepEqual(qidirish(qatorlar, '4000', new Set(['p-ip15'])).map((q) => q.item.modificationId), ['m1']);
  const artikul = qidirish(qatorlar, 'IP-15', new Set(['p-s24']));
  assert.deepEqual(artikul.map((q) => [q.item.modificationId, q.daraja]), [['m1', 0]]);
});

test('mahsulot id modifikatsiyada bo‘lmasa qator productId si olinadi; id yo‘q mahsulot kategoriyaga kirmaydi', () => {
  const faqatQatorda = { ...qator('m5', 'Qopqoq', ''), item: { modificationId: 'm5', productId: 'p-ip15', modification: { id: 'm5', product: { id: '', name: 'Qopqoq' } } } };
  assert.deepEqual(qidirish([faqatQatorda], '', iphone).map((q) => q.item.modificationId), ['m5']);
  const idsiz = { ...qator('m6', 'Nomsiz', ''), item: { modificationId: 'm6', modification: { id: 'm6', product: { id: '', name: 'Nomsiz' } } } };
  assert.deepEqual(qidirish([idsiz], '', iphone), []);
});

test('natijalar soni cheklanadi: yozuv bilan 50 ta, kategoriya ro‘yxatida 200 ta', () => {
  const kop = Array.from({ length: 260 }, (_, i) => qator(`x${i}`, `Mahsulot ${String(i).padStart(3, '0')}`, `p${i}`));
  const hammasi = new Set(kop.map((q) => q.item.productId));
  assert.equal(qidirish(kop, 'mahsulot').length, KO_RSATILADIGAN_SONI);
  assert.equal(qidirish(kop, '', hammasi).length, KATEGORIYA_RO_YXATI_SONI);
});
