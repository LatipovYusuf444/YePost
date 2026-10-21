import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const src = new URL('../src/', import.meta.url);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.startsWith(src.href) && specifier.startsWith('.') && !specifier.endsWith('.ts')) {
      return { url: new URL(specifier + '.ts', context.parentURL).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
const { kassaRaqamlari, kassaTartibi, sotuvMahsulotNomlari, mahsulotlarQisqacha, sotuvHujjatRaqami } = await import('../src/lib/kassaNomlari.ts');

const qator = (id, sana, qism = {}) => ({ id, kanal: 'bank', yonalish: 'tushum', sana, ...qism });

test('kassaRaqamlari: eng eskisi K1, keyingisi K2 — kirish tartibiga bog‘liq emas', () => {
  const qatorlar = [qator('c', '2026-10-23T08:00:00.000Z'), qator('a', '2026-10-21T08:00:00.000Z'), qator('b', '2026-10-22T08:00:00.000Z')];
  const raqamlar = kassaRaqamlari(qatorlar);
  assert.deepEqual([raqamlar.get('a'), raqamlar.get('b'), raqamlar.get('c')], ['K1', 'K2', 'K3']);
  assert.deepEqual([...kassaRaqamlari([...qatorlar].reverse())].sort(), [...raqamlar].sort());
});

test('kassaRaqamlari: har bir bo‘lim (to‘lov turi + tushum/chiqim) o‘z K1’dan boshlanadi', () => {
  const raqamlar = kassaRaqamlari([
    qator('bank-1', '2026-10-21T08:00:00.000Z'),
    qator('naqd-1', '2026-10-21T09:00:00.000Z', { kanal: 'naqd' }),
    qator('bank-chiqim', '2026-10-21T10:00:00.000Z', { yonalish: 'chiqim' }),
    qator('bank-2', '2026-10-22T08:00:00.000Z'),
    qator('naqd-2', '2026-10-22T09:00:00.000Z', { kanal: 'naqd' }),
  ]);
  assert.deepEqual(
    ['bank-1', 'bank-2', 'naqd-1', 'naqd-2', 'bank-chiqim'].map((id) => raqamlar.get(id)),
    ['K1', 'K2', 'K1', 'K2', 'K1']
  );
});

test('kassaTartibi: avval Toshkent kuni, keyin kiritilgan vaqt, oxirida id', () => {
  // 20:30 UTC = ertasi kuni 01:30 Toshkent: 21-oktabr hisoblanadi, 20-oktabrdagi yozuvdan keyin keladi.
  const yarimKechasi = qator('a', '2026-10-20T20:30:00.000Z');
  const oldingiKun = qator('b', '2026-10-20T10:00:00.000Z');
  assert.ok(kassaTartibi(oldingiKun, yarimKechasi) < 0);

  // Bir kun ichida: kun bo‘yicha kiritilgan (createdAt) vaqt hal qiladi — sanasi faqat kun bo‘lgan kassa amaliyoti ham o‘z vaqtida turadi.
  const sotuv = qator('s', '2026-10-21T04:00:00.000Z'); // 09:00 Toshkent
  const amaliyot = qator('o', '2026-10-21', { kiritilgan: '2026-10-21T10:00:00.000Z' });
  assert.ok(kassaTartibi(sotuv, amaliyot) < 0);
  const raqamlar = kassaRaqamlari([amaliyot, sotuv]);
  assert.equal(raqamlar.get('s'), 'K1');
  assert.equal(raqamlar.get('o'), 'K2');

  // To‘liq teng bo‘lsa id tartibi — natija har safar bir xil.
  const bir = qator('x1', '2026-10-21T04:00:00.000Z');
  const ikki = qator('x2', '2026-10-21T04:00:00.000Z');
  assert.equal(kassaRaqamlari([ikki, bir]).get('x1'), 'K1');
  assert.equal(kassaRaqamlari([bir, ikki]).get('x1'), 'K1');
});

test('kassaRaqamlari: sanasi noma‘lum yozuv ham raqam oladi (yiqilmaydi)', () => {
  const raqamlar = kassaRaqamlari([qator('a', ''), qator('b', 'noto‘g‘ri'), qator('c', '2026-10-21T08:00:00.000Z')]);
  assert.equal(raqamlar.size, 3);
  assert.deepEqual([...new Set(raqamlar.values())].sort(), ['K1', 'K2', 'K3']);
});

test('sotuvMahsulotNomlari: mahsulot nomi, takrorsiz, tartibda; mahsulot nomi bo‘lmasa variant nomi', () => {
  const nomlar = sotuvMahsulotNomlari([
    { modification: { name: 'Konfet 1kg', product: { name: 'Konfet' } } },
    { modification: { name: 'Konfet 2kg', product: { name: 'Konfet' } } },
    { modification: { name: 'Pishloq 400g', product: { name: ' Pishloq ' } } },
    { modification: { name: 'Non' } },
    { modification: null },
    {},
  ]);
  assert.deepEqual(nomlar, ['Konfet', 'Pishloq', 'Non']);
  assert.deepEqual(sotuvMahsulotNomlari(undefined), []);
  assert.deepEqual(sotuvMahsulotNomlari(null), []);
});

test('mahsulotlarQisqacha: birinchi 3 ta, qolgani soni bilan', () => {
  assert.deepEqual(mahsulotlarQisqacha(['a', 'b']), { korinadi: ['a', 'b'], yana: 0 });
  assert.deepEqual(mahsulotlarQisqacha(['a', 'b', 'c']), { korinadi: ['a', 'b', 'c'], yana: 0 });
  assert.deepEqual(mahsulotlarQisqacha(['a', 'b', 'c', 'd', 'e']), { korinadi: ['a', 'b', 'c'], yana: 2 });
  assert.deepEqual(mahsulotlarQisqacha(['a', 'b', 'c', 'd'], 2), { korinadi: ['a', 'b'], yana: 2 });
  assert.deepEqual(mahsulotlarQisqacha([]), { korinadi: [], yana: 0 });
});

test('sotuvHujjatRaqami: documentNumber → docNumber → number; bo‘sh bo‘lsa ""', () => {
  assert.equal(sotuvHujjatRaqami({ documentNumber: 'SOT-000014' }), 'SOT-000014');
  assert.equal(sotuvHujjatRaqami({ docNumber: ' SOT-000015 ', number: 'x' }), 'SOT-000015');
  assert.equal(sotuvHujjatRaqami({ number: 'SOT-000016' }), 'SOT-000016');
  assert.equal(sotuvHujjatRaqami({ documentNumber: '  ', number: null }), '');
  assert.equal(sotuvHujjatRaqami(null), '');
});
