import test from 'node:test';
import assert from 'node:assert/strict';
import { optionlarniCheklash, OPTION_CHEGARASI } from '../src/lib/optionlarniCheklash.ts';
import { hujjatOraligiParametrlari } from '../src/lib/hujjatOraligi.ts';

test('option ro\'yxati ~100 tagacha cheklanadi, qisqa ro\'yxat o\'zgarmaydi va asl massivga tegilmaydi', () => {
  const katta = Array.from({ length: 5000 }, (_, i) => ({ value: String(i) }));
  const kesilgan = optionlarniCheklash(katta);
  assert.equal(OPTION_CHEGARASI, 100);
  assert.equal(kesilgan.length, 100);
  assert.equal(kesilgan[0].value, '0');
  assert.equal(katta.length, 5000);
  const kichik = [{ value: 'a' }];
  assert.deepEqual(optionlarniCheklash(kichik), kichik);
  assert.notEqual(optionlarniCheklash(kichik), kichik);
  assert.equal(optionlarniCheklash(katta, 7).length, 7);
});

test('cheklash qidiruv filtridan keyin qo\'llanadi: 100 dan keyingi mahsulot yozilgan so\'z bilan topiladi', () => {
  const katta = Array.from({ length: 5000 }, (_, i) => ({ searchLabel: `Mahsulot ${i}` }));
  const mos = katta.filter((o) => o.searchLabel.toLowerCase().includes('mahsulot 4999'));
  assert.deepEqual(optionlarniCheklash(mos), [{ searchLabel: 'Mahsulot 4999' }]);
});

test('hujjat ro\'yxati so\'rovi: oraliq bo\'lsa dateFrom/dateTo yuboriladi, bo\'lmasa parametrsiz', () => {
  assert.equal(hujjatOraligiParametrlari(), undefined);
  assert.equal(hujjatOraligiParametrlari({}), undefined);
  assert.deepEqual(hujjatOraligiParametrlari({ dateFrom: '2026-10-01', dateTo: '2026-10-31' }), { params: { dateFrom: '2026-10-01', dateTo: '2026-10-31' } });
  assert.deepEqual(hujjatOraligiParametrlari({ dateTo: '2026-10-31' }), { params: { dateTo: '2026-10-31' } });
});
