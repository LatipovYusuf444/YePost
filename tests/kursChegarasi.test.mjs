import test from 'node:test';
import assert from 'node:assert/strict';
import { ENG_KAM_KURS, kursJudaKichik } from '../src/lib/kursChegarasi.ts';

test('kursJudaKichik: 1 000 dan past musbat kurs — xato; kiritilmagan (0/null) va 1 000+ — yo‘q', () => {
  assert.equal(ENG_KAM_KURS, 1000);
  assert.equal(kursJudaKichik(999.99), true);
  assert.equal(kursJudaKichik(12.5), true);
  assert.equal(kursJudaKichik(1000), false);
  assert.equal(kursJudaKichik(11743), false);
  assert.equal(kursJudaKichik(0), false);
  assert.equal(kursJudaKichik(null), false);
  assert.equal(kursJudaKichik(Number.NaN), false);
});
