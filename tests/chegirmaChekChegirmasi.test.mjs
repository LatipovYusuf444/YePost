// Chegirmalar hisoboti: GET /reports/discounts (23.11 dan) qatorda chek chegirmasini alohida `receiptDiscount` da beradi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { qatorlarniOlish } from '../src/Pages/HisobotUchot/chegirmaModeli.ts';

const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8').split(String.fromCharCode(13)).join('');

test('qatordagi jami chegirma = discountAmount (qator) + receiptDiscount (chek); foiz backenddan', () => {
  const [q] = qatorlarniOlish([{ key: '2026-11-23', label: '2026-11-23', discountAmount: 200, receiptDiscount: 180, salesAmount: 9620, salesCount: 3, discountedSalesCount: 2, discountPct: 3.8 }], 'DAY');
  assert.equal(q.qatorChegirmasi, 200);
  assert.equal(q.chekChegirmasi, 180);
  assert.equal(q.chegirma, 380);
  assert.equal(q.foiz, 3.8);
  assert.equal(q.nomi, '23.11.2026');
  assert.equal(q.chegirmaliSotuvlar, 2);
});

test('faqat chek chegirmali qator ham chegirma ko\'rsatadi; satr ko\'rinishidagi sonlar o\'qiladi', () => {
  const [q] = qatorlarniOlish([{ key: 'k1', label: 'Kassir', discountAmount: '0', receiptDiscount: '100.50', salesAmount: '900' }], 'CASHIER');
  assert.equal(q.qatorChegirmasi, 0);
  assert.equal(q.chekChegirmasi, 100.5);
  assert.equal(q.chegirma, 100.5);
  // discountPct kelmasa: (qator + chek) / (sof summa + qator + chek)
  assert.ok(Math.abs(q.foiz - (100.5 / 1000.5) * 100) < 1e-9);
});

test('eski javob (receiptDiscount yo\'q) avvalgidek ishlaydi', () => {
  const [q] = qatorlarniOlish([{ key: 'p1', label: 'Mahsulot', discountAmount: 50, salesAmount: 950 }], 'PRODUCT');
  assert.equal(q.chekChegirmasi, 0);
  assert.equal(q.chegirma, 50);
  assert.equal(q.foiz, 5);
});

test('jadvalda "Qator chegirmasi", "Chek chegirmasi" va "Jami chegirma" ustunlari; zaxira hisob chek chegirmasini ikki marta qo\'shmaydi', () => {
  const sahifa = manba('src/Pages/HisobotUchot/ChegirmaHisoboti.tsx');
  for (const matn of ['id: "qatorChegirmasi"', 'id: "chekChegirmasi"', 'nom: "Jami chegirma"']) assert.ok(sahifa.includes(matn), matn);
  assert.ok(sahifa.indexOf('id: "qatorChegirmasi"') < sahifa.indexOf('id: "chekChegirmasi"') && sahifa.indexOf('id: "chekChegirmasi"') < sahifa.indexOf('id: "chegirma"'), 'ustunlar tartibi');
  assert.match(sahifa, /kengaytiriladiganjadval-1-v2/);
  const yordamchi = manba('src/Pages/HisobotUchot/chegirmaYordamchilari.ts');
  assert.match(yordamchi, /raqam\(qator\.discountAmount\) \+ raqam\(qator\.receiptDiscount\)/);
  assert.match(yordamchi, /Math\.max\(0, umumiy - sotuvChekChegirmasi\(sotuv\)\)/);
  const turlar = manba('src/types/reports.ts');
  for (const maydon of ['receiptDiscount?:', 'totalLineDiscount?:', 'totalReceiptDiscount?:']) assert.ok(turlar.includes(maydon), maydon);
});
