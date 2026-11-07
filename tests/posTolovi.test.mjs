import test from 'node:test';
import assert from 'node:assert/strict';
import { posQaytimi, posTolovYaroqli } from '../src/Pages/BoshSahifa/aralashTolov.ts';

test('M2: naqd so‘mda jamidan ko‘p berish mumkin, qaytim aniq (faqat so‘m — backend yaxlitlamaydi)', () => {
  assert.equal(posTolovYaroqli({ som: 100000, dollarSomda: 0, jami: 87000, naqd: true }), true);
  assert.equal(posQaytimi({ qabul: 100000, jami: 87000, dollarBor: false, yaxlitlash: true }), 13000);
  assert.equal(posQaytimi({ qabul: 100000, jami: 87500, dollarBor: false, yaxlitlash: true }), 12500);
});

test('M2: karta/bank to‘lovi jamidan oshmaydi (backend overpayment_not_allowed)', () => {
  assert.equal(posTolovYaroqli({ som: 100000, dollarSomda: 0, jami: 87000, naqd: false }), false);
  assert.equal(posTolovYaroqli({ som: 87000, dollarSomda: 0, jami: 87000, naqd: false }), true);
  assert.equal(posTolovYaroqli({ som: 0, dollarSomda: 0, jami: 87000, naqd: true }), false);
});

test('M2: dollar qatnashsa so‘m qismi qolgan summadan oshmaydi, qaytim mingtagacha HALF_UP', () => {
  // $10 × 12 100 = 121 000, jami 115 000: qaytim 6 000.
  assert.equal(posTolovYaroqli({ som: 0, dollarSomda: 121000, jami: 115000, naqd: true }), true);
  assert.equal(posTolovYaroqli({ som: 5000, dollarSomda: 121000, jami: 115000, naqd: true }), false);
  assert.equal(posQaytimi({ qabul: 121000, jami: 114500, dollarBor: true, yaxlitlash: true }), 7000, '6 500 → 7 000 (HALF_UP)');
  assert.equal(posQaytimi({ qabul: 121000, jami: 114600, dollarBor: true, yaxlitlash: true }), 6000);
  assert.equal(posQaytimi({ qabul: 121000, jami: 114600, dollarBor: true, yaxlitlash: false }), 6400, 'tanga oladigan mijoz');
});
