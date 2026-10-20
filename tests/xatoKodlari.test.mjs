import test from 'node:test';
import assert from 'node:assert/strict';
import { OGOHLANTIRISH_KODI, xatoKodi, xatoKodiMatni, xatoMaydoni } from '../src/api/xatoKodlari.ts';

test('hisobda pul yetmasa: tushunarli matn (uz va ru)', () => {
  assert.equal(xatoKodiMatni('errors.wallet.insufficient_balance', '/sales/s1/payments', 'uz'), 'Mijoz hisobida pul yetarli emas.');
  assert.match(xatoKodiMatni('errors.wallet.insufficient_balance', '/sales/s1', 'ru'), /недостаточно средств/);
});

test('sotuvni bekor qilishda shu kod boshqa matn oladi (hisobga yozilgan pul ishlatilgan)', () => {
  const matn = xatoKodiMatni('errors.wallet.insufficient_balance', '/sales/abc-123/cancel', 'uz');
  assert.match(matn, /bekor qilib bo'lmaydi/);
  assert.match(matn, /ishlatib bo'lingan/);
  assert.match(xatoKodiMatni('errors.wallet.insufficient_balance', '/sales/abc-123/cancel', 'ru'), /нельзя отменить/);
});

test('hisobdan keragidan ko‘p yechish va valyuta rejimi o‘chiq', () => {
  assert.match(xatoKodiMatni('errors.sales.overpayment_not_allowed', '/sales/s1/payments', 'uz'), /ko'p yechib bo'lmaydi/);
  assert.match(xatoKodiMatni('errors.currency.mode_off', '/finance/cash-operations', 'uz'), /valyuta rejimi/);
});

test('noma‘lum kod, bad_request yoki kod yo‘q: null — avvalgi xabar saqlanadi', () => {
  assert.equal(xatoKodiMatni('errors.common.bad_request', '/sales', 'uz'), null);
  assert.equal(xatoKodiMatni('errors.inventory.out_of_stock', '/sales/s1/confirm', 'uz'), null);
  assert.equal(xatoKodiMatni(undefined, '/sales', 'uz'), null);
  assert.equal(xatoKodiMatni(42, '/sales', 'uz'), null);
});

test('ingliz tili so‘ralsa o‘zbekcha matn qaytadi', () => {
  assert.equal(xatoKodiMatni('errors.wallet.insufficient_balance', '/sales/s1/payments', 'en'), 'Mijoz hisobida pul yetarli emas.');
});

test('ko‘p birlikli tovar xatolari: uz va ru matn', () => {
  assert.match(xatoKodiMatni('errors.catalog.quantity_not_whole', '/sales', 'uz'), /faqat butun miqdor/);
  assert.match(xatoKodiMatni('errors.catalog.unit_not_allowed', '/inventory/purchases', 'ru'), /не допускается/);
  for (const kod of ['base_unit_factor', 'base_unit_in_use', 'unit_not_found', 'unit_duplicate', 'barcode_already_exists']) {
    assert.ok(xatoKodiMatni(`errors.catalog.${kod}`, '/catalog/products/p/units', 'uz'), kod);
    assert.ok(xatoKodiMatni(`errors.catalog.${kod}`, '/catalog/products/p/units', 'ru'), kod);
  }
});

// ── Hujjat sanasi va davrni yopish ──

test('period_closed: yopilgan kun matnga qo‘shiladi (ildizda ham, ichki obyektda ham)', () => {
  const matn = xatoKodiMatni('errors.document.period_closed', '/sales', 'uz', { closedUntil: '2026-09-30' });
  assert.match(matn, /30\.09\.2026/);
  assert.match(matn, /shu kun ham/);
  assert.match(xatoKodiMatni('errors.document.period_closed', '/sales', 'ru', { details: { closedUntil: '2026-09-30' } }), /30\.09\.2026 включительно/);
  // maydon kelmasa ham matn tushunarli
  assert.match(xatoKodiMatni('errors.document.period_closed', '/sales', 'uz', {}), /Davr yopilgan/);
});

test('date_in_future va transfers_in_transit', () => {
  assert.match(xatoKodiMatni('errors.document.date_in_future', '/sales', 'uz'), /bugundan keyin/);
  const matn = xatoKodiMatni('errors.document.transfers_in_transit', '/settings/period-close', 'uz', { transfers: ['KOCH-000012', 'KOCH-000013'] });
  assert.match(matn, /KOCH-000012, KOCH-000013/);
  assert.match(matn, /qabul qiling/);
});

test('negative_stock_after / negative_cash_after: sana va yetishmovchilik', () => {
  const ombor = xatoKodiMatni('errors.inventory.negative_stock_after', '/sales', 'uz', { date: '2026-10-12', shortage: '5', modificationId: 'm1', warehouseId: 'w1' });
  assert.match(ombor, /12\.10\.2026/);
  assert.match(ombor, /yetishmaydi: 5/);
  const kassa = xatoKodiMatni('errors.finance.negative_cash_after', '/finance/cash-operations', 'uz', { date: '2026-10-12', shortage: 1500000 });
  assert.match(kassa, /12\.10\.2026/);
  assert.match(kassa, /1[\s ]500[\s ]000/);
  assert.match(xatoKodiMatni('errors.finance.negative_cash_after', '/x', 'ru', { date: '2026-10-12', shortage: 100 }), /уйдёт в минус/);
});

test('movements_after_stock_take: harakatlar ro‘yxati', () => {
  const matn = xatoKodiMatni('errors.inventory.movements_after_stock_take', '/inventory/stock-takes/s1/confirm', 'uz', {
    movements: [{ type: 'SALE', docId: 'd1', date: '2026-10-15', quantity: 3 }, { type: 'PURCHASE', docId: 'd2', date: '2026-10-16', quantity: 10 }],
  });
  assert.match(matn, /sotuv 15\.10\.2026 \(3\)/);
  assert.match(matn, /kirim 16\.10\.2026 \(10\)/);
});

test('before_stock_take ogohlantirishi: inventarizatsiya raqami va sanasi', () => {
  const matn = xatoKodiMatni(OGOHLANTIRISH_KODI, '/sales/s1/confirm', 'uz', { stockTakeId: 'x', stockTakeNumber: 'INV-000012', stockTakeDate: '2026-10-12' });
  assert.match(matn, /INV-000012, 12\.10\.2026/);
  assert.match(matn, /oldingi sanada/);
});

test('out_of_stock avvalgidek (null), xatoKodi va xatoMaydoni yordamchilari', () => {
  assert.equal(xatoKodiMatni('errors.inventory.out_of_stock', '/sales/s1/confirm', 'uz', { remaining: 2 }), null);
  assert.equal(xatoKodi({ code: 'errors.document.period_closed' }), 'errors.document.period_closed');
  assert.equal(xatoKodi({ message: 'errors.document.date_in_future' }), 'errors.document.date_in_future');
  assert.equal(xatoKodi({ message: 'Oddiy matn' }), undefined);
  assert.equal(xatoKodi(null), undefined);
  assert.equal(xatoMaydoni({ data: { closedUntil: '2026-01-01' } }, 'closedUntil'), '2026-01-01');
  assert.equal(xatoMaydoni({ message: { shortage: 3 } }, 'shortage'), 3);
  assert.equal(xatoMaydoni('matn', 'x'), undefined);
});

// ── Telegram nakladnoy ──

test('Telegram bot kodlari: invalid_bot_token va sale_has_no_customer (uz/ru)', () => {
  assert.match(xatoKodiMatni('errors.integrations.invalid_bot_token', '/integrations/telegram', 'uz'), /bot tokeni noto'g'ri/);
  assert.match(xatoKodiMatni('errors.integrations.invalid_bot_token', '/partners/customers/c1/telegram-link', 'ru'), /Токен Telegram-бота/);
  assert.match(xatoKodiMatni('errors.integrations.sale_has_no_customer', '/sales/s1/notify', 'uz'), /mijoz yo'q/);
  assert.match(xatoKodiMatni('errors.integrations.sale_has_no_customer', '/sales/s1/notify', 'ru'), /нет клиента/);
});

test('only_confirmed_sale_payable va sale_not_found: faqat nakladnoy/notify manzillarida almashtiriladi', () => {
  assert.match(xatoKodiMatni('errors.sales.only_confirmed_sale_payable', '/sales/s1/notify', 'uz'), /faqat tasdiqlangan sotuv/);
  assert.match(xatoKodiMatni('errors.sales.only_confirmed_sale_payable', '/sales/abc-123/nakladnoy.pdf', 'ru'), /только для подтверждённой/);
  assert.equal(xatoKodiMatni('errors.sales.sale_not_found', '/sales/s1/notify', 'uz'), 'Sotuv topilmadi.');
  // to'lov va boshqa so'rovlarda avvalgidek (null — backend matni ko'rsatiladi)
  assert.equal(xatoKodiMatni('errors.sales.only_confirmed_sale_payable', '/sales/s1/payments', 'uz'), null);
  assert.equal(xatoKodiMatni('errors.sales.only_confirmed_sale_payable', '/sales/s1', 'uz'), null);
  assert.equal(xatoKodiMatni('errors.sales.sale_not_found', '/sales/s1', 'uz'), null);
});
