import test from 'node:test';
import assert from 'node:assert/strict';

// Brauzer hodisalari: sessiya o'zgarishi keshni tozalashini tekshirish uchun (modul import qilinishidan oldin).
globalThis.window = new EventTarget();
const { malumotnomaniOlish, malumotnomaKeshiniTozalash, ozgartirishdanKeyinTozalash, MALUMOTNOMA_KESH_MUDDATI } = await import('../src/lib/malumotnomaKeshi.ts');
const { AUTH_SESSION_CHANGED_EVENT } = await import('../src/lib/authTokenStorage.ts');

function hisoblagich(qiymat = ['a', 'b']) {
  let soni = 0;
  return { yuklash: async () => { soni += 1; return qiymat; }, soni: () => soni };
}

test('TTL ichida ikkinchi chaqiruv so\'rov yubormaydi, muddat o\'tgach qayta so\'raydi', async () => {
  malumotnomaKeshiniTozalash();
  const h = hisoblagich();
  await malumotnomaniOlish('omborlar', 'royxat', h.yuklash, 60_000, 1_000);
  await malumotnomaniOlish('omborlar', 'royxat', h.yuklash, 60_000, 60_999);
  assert.equal(h.soni(), 1);
  await malumotnomaniOlish('omborlar', 'royxat', h.yuklash, 60_000, 61_000);
  assert.equal(h.soni(), 2);
  assert.equal(MALUMOTNOMA_KESH_MUDDATI, 60_000);
});

test('bir vaqtdagi bir xil so\'rovlar bittaga birlashadi va massiv nusxasi qaytadi', async () => {
  malumotnomaKeshiniTozalash();
  const h = hisoblagich();
  const [x, y] = await Promise.all([malumotnomaniOlish('birliklar', 'r', h.yuklash), malumotnomaniOlish('birliklar', 'r', h.yuklash)]);
  assert.equal(h.soni(), 1);
  x.sort().reverse();
  assert.deepEqual(y, ['a', 'b'], 'bir chaqiruvchining saralashi boshqasiga tegmaydi');
  assert.deepEqual(await malumotnomaniOlish('birliklar', 'r', h.yuklash), ['a', 'b']);
});

test('muvaffaqiyatsiz so\'rov eslanmaydi', async () => {
  malumotnomaKeshiniTozalash();
  let urinish = 0;
  const yuklash = async () => { urinish += 1; if (urinish === 1) throw new Error('503'); return ['ok']; };
  await assert.rejects(malumotnomaniOlish('filiallar', 'r', yuklash), /503/);
  assert.deepEqual(await malumotnomaniOlish('filiallar', 'r', yuklash), ['ok']);
  assert.equal(urinish, 2);
});

test('guruh bo\'yicha tozalash faqat shu guruhga tegadi; o\'zgartirish amalidan keyin (xato bo\'lsa ham) tozalanadi', async () => {
  malumotnomaKeshiniTozalash();
  const omborlar = hisoblagich(['w']);
  const birliklar = hisoblagich(['kg']);
  await malumotnomaniOlish('omborlar', 'royxat', omborlar.yuklash);
  await malumotnomaniOlish('birliklar', 'royxat', birliklar.yuklash);
  await ozgartirishdanKeyinTozalash('omborlar', async () => 'yaratildi');
  await malumotnomaniOlish('omborlar', 'royxat', omborlar.yuklash);
  await malumotnomaniOlish('birliklar', 'royxat', birliklar.yuklash);
  assert.equal(omborlar.soni(), 2);
  assert.equal(birliklar.soni(), 1);
  await assert.rejects(ozgartirishdanKeyinTozalash(['birliklar'], async () => { throw new Error('409'); }), /409/);
  await malumotnomaniOlish('birliklar', 'royxat', birliklar.yuklash);
  assert.equal(birliklar.soni(), 2);
});

test('sessiya o\'zgarganda (kirish/chiqish) hamma kesh tozalanadi', async () => {
  malumotnomaKeshiniTozalash();
  const h = hisoblagich();
  await malumotnomaniOlish('foydalanuvchilar', 'royxat', h.yuklash);
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));
  await malumotnomaniOlish('foydalanuvchilar', 'royxat', h.yuklash);
  assert.equal(h.soni(), 2);
});
