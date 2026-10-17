import test from 'node:test';
import assert from 'node:assert/strict';
import { xatoKodiMatni } from '../src/api/xatoKodlari.ts';

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
