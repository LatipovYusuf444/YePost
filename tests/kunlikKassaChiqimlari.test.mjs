// Kunlik kassa (backend 18.11): kassadagi naqd qoldiq (cash-daily?paymentType=CASH) va kunning chiqimlari ro'yxati (cash-flow, chiqim qatorlari).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chiqimlarJami, kassaChiqimlari } from '../src/lib/kassaChiqimlari.ts';

const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8');

test('cash-flow qatorlaridan faqat chiqimlar, yangisi birinchi; summa musbat', () => {
  const qatorlar = [
    { id: '1', currency: 'UZS', date: '2026-11-18T05:00:00Z', documentNumber: 'SAV-1', type: 'INCOME', income: 500000, expense: 0 },
    { id: '2', currency: 'UZS', date: '2026-11-18T07:00:00Z', documentNumber: 'XAR-3', name: 'Ijara', note: 'Noyabr', paymentMethod: 'CASH', type: 'EXPENSE', expense: 200000 },
    { id: '3', currency: 'UZS', date: '2026-11-18T09:00:00Z', refDocNumber: 'SAV-2', name: 'Qaytim', paymentType: 'cash', expense: '15000' },
    { id: '4', currency: 'USD', date: '2026-11-18T10:00:00Z', type: 'EXPENSE', expense: 50 },
  ];
  const chiqimlar = kassaChiqimlari(qatorlar, 'UZS');
  assert.deepEqual(chiqimlar.map((q) => [q.id, q.hujjat, q.nomi, q.tolovTuri, q.summa]), [['3', 'SAV-2', 'Qaytim', 'CASH', 15000], ['2', 'XAR-3', 'Ijara', 'CASH', 200000]]);
  assert.equal(chiqimlarJami(chiqimlar), 215000);
  assert.deepEqual(kassaChiqimlari(qatorlar, 'USD').map((q) => q.summa), [50]);
  assert.deepEqual(kassaChiqimlari([], 'UZS'), []);
});

test('haqiqiy backend qatori (reports.service cashFlow): source, paymentType, amount, refDocNumber, counterpartyName', () => {
  const qatorlar = [
    { id: 'a', source: 'SALE', type: 'INCOME', paymentType: 'CASH', currency: 'UZS', amount: 300000, date: '2026-11-18T06:00:00.000Z', note: null, refDocNumber: 'SAV-10', counterpartyName: 'Ali' },
    { id: 'b', source: 'EXPENSE', type: 'EXPENSE', paymentType: 'CASH', currency: 'UZS', amount: 120000, date: '2026-11-18T08:00:00.000Z', note: 'Svet puli', refDocNumber: 'XAR-7', counterpartyName: null },
    { id: 'c', source: 'RETURN', type: 'EXPENSE', paymentType: 'CARD', currency: 'UZS', amount: 45000, date: '2026-11-18T09:30:00.000Z', note: null, refDocNumber: 'VOZ-2', counterpartyName: 'Vali' },
  ];
  const chiqimlar = kassaChiqimlari(qatorlar, 'UZS');
  assert.deepEqual(chiqimlar.map((q) => [q.id, q.manba, q.hujjat, q.nomi, q.izoh, q.tolovTuri, q.summa]), [
    ['c', 'RETURN', 'VOZ-2', 'Vali', '', 'CARD', 45000],
    ['b', 'EXPENSE', 'XAR-7', '', 'Svet puli', 'CASH', 120000],
  ]);
  assert.equal(chiqimlarJami(chiqimlar), 165000);
  // "Hammasi" — kassa summalari kabi faqat CASH, CARD, BANK (DEBT emas); manba turi tarjima qilingan.
  const bolim = manba('src/Pages/HisobotUchot/KunChiqimlari.tsx');
  assert.ok(bolim.includes('const KASSA_TOLOV_TURLARI = "CASH,CARD,BANK";'));
  for (const til of ['uz', 'ru']) {
    const j = JSON.parse(manba(`src/i18n/locales/${til}/hisobotlar.json`)).kunlikKassa.expenses;
    for (const s of ['SALE', 'RETURN', 'CASH_IN', 'EXPENSE', 'CASH_OPERATION']) assert.ok(j.source[s], `${til} ${s}`);
    assert.ok(j.columns.type, til);
  }
});

test('kunlik kassa sahifasi: chiqimlar bo\'limi filtrlar bilan, naqd qoldiq alohida', () => {
  const sahifa = manba('src/Pages/HisobotUchot/KunlikKassa.tsx');
  assert.match(sahifa, /<KunChiqimlari from=\{from\} to=\{to\} paymentType=\{paymentType\} branchId=\{branchId\} valyutalar=\{valyutalar\} \/>/);
  assert.match(sahifa, /paymentType: "CASH"/);
  const bolim = manba('src/Pages/HisobotUchot/KunChiqimlari.tsx');
  assert.match(bolim, /cashFlowReportApi\.olish\(\{ currency: valyuta, dateFrom: from, dateTo: to, paymentMethods: paymentType \|\| KASSA_TOLOV_TURLARI, branchIds: branchId \|\| undefined \}\)/);
  // So'rov sahifa kartalari yuklanishiga bog'liq emas (doim ikkala valyuta), filtr almashganda eski qatorlar tozalanadi.
  assert.match(bolim, /const SORALADIGAN: readonly CashCurrency\[\] = \["UZS", "USD"\];/);
  assert.match(bolim, /Promise\.all\(SORALADIGAN\.map\(/);
  assert.match(bolim, /\}, \[from, to, paymentType, branchId\]\);/);
  assert.match(bolim, /let faol = true;\s*\/\/[^\n]*\n\s*setChiqimlar\(\{\}\);\s*setYuklanmoqda\(true\);/);
  for (const til of ['uz', 'ru']) {
    const j = JSON.parse(manba(`src/i18n/locales/${til}/hisobotlar.json`));
    assert.ok(j.kunlikKassa.cashInDrawer && j.kunlikKassa.expenses.title && j.kunlikKassa.expenses.columns.amount, til);
  }
});
