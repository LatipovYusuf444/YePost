import test from 'node:test';
import assert from 'node:assert/strict';
import * as model from '../src/Pages/HisobotUchot/hisobKitobHujjatlari.ts';

test('document balances and USD fractions come from the server without conversion or recalculation', () => {
  const rows = model.hisobKitobHujjatlariniMoslash({ currency: 'USD', items: [
    { id: 'qb2', type: 'OPENING_DEBT', docNumber: 'QB-000002', date: '2026-10-22', debit: '1979.25', credit: '0', runningBalance: '1979.25' },
    { id: 'pay', type: 'PAYMENT', docNumber: 'PAY-1', date: '2026-10-23', debit: '0', credit: '10.50', runningBalance: '1968.75' },
  ] }, 'USD');
  assert.equal(rows[0].hujjat, 'QB-000002');
  assert.equal(rows[0].debet, 1979.25);
  assert.equal(rows[0].kredit, 0);
  assert.equal(rows[1].qoldiq, 1968.75);
});

test('document lists accept direct arrays and documents containers and never fabricate missing sums as zero', () => {
  for (const wrap of [rows => rows, rows => ({ documents: rows })]) {
    const rows = model.hisobKitobHujjatlariniMoslash(wrap([{ documentId: 's', documentType: 'SALE', documentNumber: 'SA-1', createdAt: '2026-10-23', debit: 'bad', credit: null, balance: '0' }]), 'UZS');
    assert.equal(rows[0].hujjat, 'SA-1');
    assert.equal(rows[0].debet, null);
    assert.equal(rows[0].kredit, null);
    assert.equal(rows[0].qoldiq, 0);
  }
  assert.deepEqual(model.hisobKitobHujjatlariniMoslash({ items: [] }, 'USD'), []);
  assert.throws(() => model.hisobKitobHujjatlariniMoslash({}, 'USD'), /hujjat/i);
  assert.throws(() => model.hisobKitobHujjatlariniMoslash({ currency: 'UZS', items: [] }, 'USD'), /valyuta/i);
  assert.throws(() => model.hisobKitobHujjatlariniMoslash([{ currency: 'UZS' }], 'USD'), /valyuta/i);
});
