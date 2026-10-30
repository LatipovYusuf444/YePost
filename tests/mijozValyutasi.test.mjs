import test from 'node:test';
import assert from 'node:assert/strict';
import { mijozValyutasi, tahrirValyutasi, valyutaKutmoqda, yaratishValyutasi } from '../src/lib/mijozValyutasi.ts';

test('mijoz valyutasi: UZS/USD (har qanday registr) tanlov, qolgani belgilanmagan', () => {
  assert.equal(mijozValyutasi('USD'), 'USD');
  assert.equal(mijozValyutasi(' uzs '), 'UZS');
  assert.equal(mijozValyutasi(null), null);
  assert.equal(mijozValyutasi(undefined), null);
  assert.equal(mijozValyutasi(''), null);
  assert.equal(mijozValyutasi('EUR'), null);
  assert.equal(mijozValyutasi(840), null);
});

test('yaratish: faqat tanlangan valyuta yuboriladi, belgilanmagan — maydon yo‘q', () => {
  assert.deepEqual(yaratishValyutasi('USD'), { currency: 'USD' });
  assert.deepEqual(yaratishValyutasi('UZS'), { currency: 'UZS' });
  assert.deepEqual(yaratishValyutasi(null), {});
  assert.deepEqual(yaratishValyutasi(undefined), {});
});

test('tahrirlash: faqat o‘zgargan valyuta yuboriladi, null — tanlovni olib tashlash', () => {
  assert.deepEqual(tahrirValyutasi('UZS', 'UZS'), {});
  assert.deepEqual(tahrirValyutasi(null, null), {});
  assert.deepEqual(tahrirValyutasi(undefined, null), {});
  assert.deepEqual(tahrirValyutasi(null, undefined), {});
  assert.deepEqual(tahrirValyutasi('UZS', 'USD'), { currency: 'USD' });
  assert.deepEqual(tahrirValyutasi(null, 'UZS'), { currency: 'UZS' });
  assert.deepEqual(tahrirValyutasi('USD', null), { currency: null });
  assert.deepEqual(tahrirValyutasi(undefined, 'USD'), { currency: 'USD' });
});

test('kutmoqda: hisobda pul bo‘lsa va valyuta farq qilsa; bo‘sh hisobda doim darrov o‘zgaradi', () => {
  // Ahmadjon: hisob so'mda, dollarga o'tkazilmoqda
  assert.equal(valyutaKutmoqda('USD', { miqdor: 1597500, valyuta: 'UZS' }), true);
  // belgilanmagan = dollar rejimida dollar
  assert.equal(valyutaKutmoqda(null, { miqdor: 100, valyuta: 'UZS' }), true);
  assert.equal(valyutaKutmoqda(null, { miqdor: 100, valyuta: 'USD' }), false);
  assert.equal(valyutaKutmoqda('UZS', { miqdor: 100, valyuta: 'UZS' }), false);
  // hisob bo'sh — kutish yo'q
  assert.equal(valyutaKutmoqda('USD', { miqdor: 0, valyuta: 'UZS' }), false);
});
