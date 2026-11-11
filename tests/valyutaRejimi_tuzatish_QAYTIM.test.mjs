import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ortiqchaMaydonlari,
  qaytimHisobi,
  qaytimMatni,
  qaytimValyutasi,
  yagonaValyutaliQaytim,
} from '../src/lib/tolovOrtiqchasi.ts';

// Bir valyutali rejimda (Faqat dollar / Faqat so'm) sotuv rejim valyutasida bo'lsa qaytim shu valyutada: kurs kerak emas,
// mingtagacha yaxlitlash va roundChange yo'q, "0 so'm" chiqmaydi. Ikki valyuta rejimida — avvalgidek (so'mda).

const hisob = (p) => qaytimHisobi({ kurs: 0, dollarQatnashdi: false, yaxlitlash: true, yagona: null, ...p });

test('yagonaValyutaliQaytim: faqat sotuv valyutasi rejim valyutasiga teng bo\'lsa', () => {
  assert.equal(yagonaValyutaliQaytim('USD', 'USD'), true);
  assert.equal(yagonaValyutaliQaytim('UZS', 'UZS'), true);
  assert.equal(yagonaValyutaliQaytim('UZS', 'USD'), false);
  assert.equal(yagonaValyutaliQaytim('USD', 'UZS'), false);
  assert.equal(yagonaValyutaliQaytim('USD', null), false);
  assert.equal(yagonaValyutaliQaytim('UZS', undefined), false);
});

test('qaytimValyutasi: faqat dollar rejimida dollar sotuv — USD, qolganida so\'m', () => {
  assert.equal(qaytimValyutasi('USD', 'USD'), 'USD');
  assert.equal(qaytimValyutasi('UZS', 'UZS'), 'UZS');
  assert.equal(qaytimValyutasi('USD', null), 'UZS');
  assert.equal(qaytimValyutasi('UZS', 'USD'), 'UZS');
});

test('Faqat dollar: qaytim dollarda, kurssiz, sent aniqligida', () => {
  assert.deepEqual(hisob({ ortiqcha: 2.5, sotuvValyutasi: 'USD', yagona: 'USD' }), { qiymat: 2.5, valyuta: 'USD' });
  assert.deepEqual(hisob({ ortiqcha: 1.005000001, sotuvValyutasi: 'USD', yagona: 'USD' }), { qiymat: 1.01, valyuta: 'USD' });
  // Kurs va dollarQatnashdi berilsa ham so'mga o'girilmaydi va mingtagacha yaxlitlanmaydi.
  assert.deepEqual(
    hisob({ ortiqcha: 3.27, sotuvValyutasi: 'USD', yagona: 'USD', kurs: 12500, dollarQatnashdi: true }),
    { qiymat: 3.27, valyuta: 'USD' }
  );
});

test('Faqat so\'m: qaytim so\'mda butungacha, mingtagacha yaxlitlanmaydi', () => {
  assert.deepEqual(hisob({ ortiqcha: 339400.4, sotuvValyutasi: 'UZS', yagona: 'UZS', dollarQatnashdi: true }), { qiymat: 339400, valyuta: 'UZS' });
});

test('ortiqcha yo\'q — 0 (rejim valyutasida)', () => {
  assert.deepEqual(hisob({ ortiqcha: 0, sotuvValyutasi: 'USD', yagona: 'USD' }), { qiymat: 0, valyuta: 'USD' });
});

test('ikki valyuta rejimi: avvalgidek so\'mda (kurs bilan, dollar qatnashsa mingtagacha)', () => {
  assert.deepEqual(hisob({ ortiqcha: 10, sotuvValyutasi: 'USD', kurs: 12345, dollarQatnashdi: true }), { qiymat: 123000, valyuta: 'UZS' });
  assert.deepEqual(hisob({ ortiqcha: 10, sotuvValyutasi: 'USD', kurs: 12345, dollarQatnashdi: true, yaxlitlash: false }), { qiymat: 123450, valyuta: 'UZS' });
  assert.deepEqual(hisob({ ortiqcha: 10, sotuvValyutasi: 'USD', kurs: 0 }), { qiymat: 0, valyuta: 'UZS' });
});

test('bir valyutali rejimda boshqa valyutadagi (eski) sotuv: avvalgidek so\'mda', () => {
  assert.deepEqual(hisob({ ortiqcha: 10, sotuvValyutasi: 'USD', yagona: 'UZS', kurs: 12000, dollarQatnashdi: true }), { qiymat: 120000, valyuta: 'UZS' });
});

test('qaytimMatni: o\'z valyutasi belgisi bilan', () => {
  assert.equal(qaytimMatni(2.5, 'USD', "so'm"), `$${(2.5).toLocaleString('uz-UZ', { maximumFractionDigits: 2 })}`);
  assert.equal(qaytimMatni(339000, 'UZS', "so'm"), `${(339000).toLocaleString('uz-UZ')} so'm`);
});

test('roundChange: bir valyutali rejimda dollarQatnashdi=false bo\'lgani uchun yuborilmaydi', () => {
  // Komponentlar bir valyutali rejimda (sotuv = rejim valyutasi) dollarQatnashdi ni false qiladi.
  assert.deepEqual(ortiqchaMaydonlari({ ortiqcha: 5, hisobgaYozish: false, mijozBor: true, dollarQatnashdi: false, yaxlitlash: false }), {});
});
