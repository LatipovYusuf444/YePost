import test from 'node:test';
import assert from 'node:assert/strict';

const { KassaSotuvKeshi } = await import('../src/lib/kassaSotuvKeshi.ts');

const kut = () => new Promise((resolve) => setImmediate(resolve));

function soxta({ xato = [] } = {}) {
  const chaqiruvlar = [];
  let hozir = 0;
  let eng_kop = 0;
  const olish = async (id) => {
    chaqiruvlar.push(id);
    hozir += 1;
    eng_kop = Math.max(eng_kop, hozir);
    await kut();
    hozir -= 1;
    if (xato.includes(id)) throw new Error('404');
    return { raqam: `SOT-${id}`, mahsulotlar: [`Mahsulot ${id}`] };
  };
  return { olish, chaqiruvlar, engKop: () => eng_kop };
}

test('KassaSotuvKeshi: sotuv olinadi, tinglovchi xabardor qilinadi, har safar bitta obyekt qaytadi', async () => {
  const f = soxta();
  const kesh = new KassaSotuvKeshi(f.olish);
  let xabar = 0;
  kesh.obuna(() => { xabar += 1; });
  assert.equal(kesh.olingan('a'), undefined);
  kesh.talab('a');
  await kut(); await kut(); await kut();
  const birinchi = kesh.olingan('a');
  assert.deepEqual(birinchi, { raqam: 'SOT-a', mahsulotlar: ['Mahsulot a'] });
  assert.equal(kesh.olingan('a'), birinchi);
  assert.ok(xabar >= 1);
  assert.equal(kesh.olingan(undefined), undefined);
});

test('KassaSotuvKeshi: bir sotuv bir marta so‘raladi (takror talab, olingandan keyingi talab)', async () => {
  const f = soxta();
  const kesh = new KassaSotuvKeshi(f.olish);
  kesh.talab('a'); kesh.talab('a'); kesh.talab('b');
  await kut(); await kut(); await kut();
  kesh.talab('a'); kesh.talab('b');
  await kut(); await kut(); await kut();
  assert.deepEqual([...f.chaqiruvlar].sort(), ['a', 'b']);
});

test('KassaSotuvKeshi: xato bo‘lsa qator oddiy ko‘rinadi (undefined) va qayta urinilmaydi', async () => {
  const f = soxta({ xato: ['x'] });
  const kesh = new KassaSotuvKeshi(f.olish);
  kesh.talab('x'); kesh.talab('y');
  await kut(); await kut(); await kut();
  assert.equal(kesh.olingan('x'), undefined);
  assert.equal(kesh.olingan('y')?.raqam, 'SOT-y');
  kesh.talab('x');
  await kut(); await kut();
  assert.equal(f.chaqiruvlar.filter((id) => id === 'x').length, 1);
});

test('KassaSotuvKeshi: bir vaqtda ko‘pi bilan 6 ta so‘rov; oxirgi so‘ralganlar birinchi olinadi', async () => {
  const f = soxta();
  const kesh = new KassaSotuvKeshi(f.olish);
  const idlar = Array.from({ length: 20 }, (_, i) => `s${i + 1}`);
  idlar.forEach((id) => kesh.talab(id));
  for (let i = 0; i < 30; i += 1) await kut();
  assert.equal(f.chaqiruvlar.length, 20);
  assert.ok(f.engKop() <= 6, `bir vaqtda ${f.engKop()} ta`);
  // bir chizishdagi talablar jamlanadi; eng oxirgi so‘ralgan 6 tasi birinchi ketadi, undan oldingilari keyin
  assert.deepEqual(new Set(f.chaqiruvlar.slice(0, 6)), new Set(['s15', 's16', 's17', 's18', 's19', 's20']));
  assert.deepEqual(new Set(f.chaqiruvlar.slice(6, 12)), new Set(['s9', 's10', 's11', 's12', 's13', 's14']));
  idlar.forEach((id) => assert.ok(kesh.olingan(id)));
});

test('KassaSotuvKeshi: ekrandan ketgan qatorning hali yuborilmagan so‘rovi bekor bo‘ladi', async () => {
  const f = soxta();
  const kesh = new KassaSotuvKeshi(f.olish);
  const idlar = Array.from({ length: 14 }, (_, i) => `s${i + 1}`);
  idlar.forEach((id) => kesh.talab(id));
  // hali yuborilmagan ikkita qator ekrandan ketdi
  kesh.bekor('s1'); kesh.bekor('s2');
  for (let i = 0; i < 30; i += 1) await kut();
  assert.ok(!f.chaqiruvlar.includes('s1') && !f.chaqiruvlar.includes('s2'));
  assert.equal(f.chaqiruvlar.length, 12);
  // bekor qilinganni keyin qayta so‘rash mumkin
  kesh.talab('s1');
  for (let i = 0; i < 5; i += 1) await kut();
  assert.equal(kesh.olingan('s1')?.raqam, 'SOT-s1');
});
