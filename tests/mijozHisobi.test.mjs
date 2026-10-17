import test from 'node:test';
import assert from 'node:assert/strict';
import { mijozHisobi } from '../src/lib/mijozHisobi.ts';

test('mijoz hisobi: faqat musbat balans ishlatiladi, valyuta USD yoki so‘m', () => {
  assert.deepEqual(mijozHisobi({ balance: '12.5', balanceCurrency: 'USD' }), { miqdor: 12.5, valyuta: 'USD' });
  assert.deepEqual(mijozHisobi({ balance: 150000, balanceCurrency: 'UZS' }), { miqdor: 150000, valyuta: 'UZS' });
  assert.deepEqual(mijozHisobi({ balance: '-40', balanceCurrency: 'USD' }), { miqdor: 0, valyuta: 'USD' });
  assert.deepEqual(mijozHisobi({ balance: null }), { miqdor: 0, valyuta: 'UZS' });
  assert.deepEqual(mijozHisobi(undefined), { miqdor: 0, valyuta: 'UZS' });
  assert.deepEqual(mijozHisobi({ balance: 'abc', balanceCurrency: 'usd' }), { miqdor: 0, valyuta: 'USD' });
  assert.deepEqual(mijozHisobi({ balance: 0, balanceCurrency: 'USD' }), { miqdor: 0, valyuta: 'USD' });
});
