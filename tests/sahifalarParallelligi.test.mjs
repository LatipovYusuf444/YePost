import test from 'node:test';
import assert from 'node:assert/strict';
import { qolganSahifalar, SAHIFALAR_PARALLELLIGI } from '../src/lib/parallelBajarish.ts';

test('T2: qolgan sahifalar tartib bilan, bir paytda SAHIFALAR_PARALLELLIGI tadan ortiq emas', async () => {
  let faol = 0;
  let engKop = 0;
  const olingan = [];
  const natija = await qolganSahifalar(12, async (page) => {
    faol += 1;
    engKop = Math.max(engKop, faol);
    olingan.push(page);
    await new Promise(resolve => setTimeout(resolve, 2));
    faol -= 1;
    return `p${page}`;
  });
  assert.equal(SAHIFALAR_PARALLELLIGI, 3);
  assert.ok(engKop <= SAHIFALAR_PARALLELLIGI, `bir paytda ${engKop} ta so'rov`);
  assert.deepEqual(natija, Array.from({ length: 11 }, (_, i) => `p${i + 2}`), 'natija sahifa tartibida');
  assert.deepEqual([...olingan].sort((a, b) => a - b), Array.from({ length: 11 }, (_, i) => i + 2), 'birinchi sahifa qayta so‘ralmaydi');
});

test('T2: bitta sahifa yoki noto‘g‘ri totalPages — qo‘shimcha so‘rov yo‘q', async () => {
  for (const totalPages of [1, 0, NaN, undefined]) {
    assert.deepEqual(await qolganSahifalar(totalPages, async () => { throw new Error('so‘ralmasligi kerak'); }), []);
  }
});

test('T2: xato bo‘lsa yangi sahifa boshlanmaydi va xato qaytadi', async () => {
  const boshlangan = [];
  await assert.rejects(qolganSahifalar(20, async (page) => {
    boshlangan.push(page);
    if (page === 3) throw new Error('500');
    await new Promise(resolve => setTimeout(resolve, 5));
    return page;
  }), /500/);
  assert.ok(boshlangan.length <= SAHIFALAR_PARALLELLIGI + 1, `xatodan keyin ${boshlangan.length} ta boshlandi`);
});
