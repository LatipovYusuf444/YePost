// Savdo Kanban (1-bosqich) — src/lib/sotuvTaxtasi.ts sof yordamchilari: filtr parametrlari, sudrash amallari,
// rad sababi, summa/mijoz/chiziq, sahifalarni qo'shish va avtomatik yangilashda kursorlarni qayta yurish.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TAXTA_KURSOR_XATOSI,
  TAXTA_USTUNLARI,
  kartochkalarniQoshish,
  sahifalarniQaytaYurish,
  taxtaAmali,
  taxtaFiltrKaliti,
  taxtaMijozi,
  taxtaMumkinAmallari,
  taxtaOgohlantirishi,
  taxtaParametrlari,
  taxtaRadSababi,
  taxtaSummasi,
} from '../src/lib/sotuvTaxtasi.ts';

const TOLIQ = { amal: true, bekor: true };
const KASSIR = { amal: true, bekor: false };
const HECH = { amal: false, bekor: false };

test('ustunlar tartibi spec bo\'yicha', () => {
  assert.deepEqual([...TAXTA_USTUNLARI], ['draft', 'shipped', 'partial', 'closed', 'cancelled']);
});

test('taxtaParametrlari: bo\'sh qiymatlar yuborilmaydi, overdue faqat true, sana YYYY-MM-DD', () => {
  assert.deepEqual(taxtaParametrlari({}), {});
  assert.deepEqual(
    taxtaParametrlari({ search: '  SOT-1 ', responsibleId: '', warehouseId: ' w1 ', currency: 'USD', saleType: 'QUICK', overdue: false, dateFrom: '', dateTo: undefined }),
    { search: 'SOT-1', warehouseId: 'w1', currency: 'USD', saleType: 'QUICK' }
  );
  assert.deepEqual(taxtaParametrlari({ overdue: true, dateFrom: '2026-11-01T10:00:00Z', dateTo: '28.11.2026' }), { overdue: 'true', dateFrom: '2026-11-01' });
});

test('taxtaFiltrKaliti: bir xil mazmun — bir xil kalit, o\'zgarsa boshqa', () => {
  assert.equal(taxtaFiltrKaliti({ search: ' a ' }), taxtaFiltrKaliti({ search: 'a', currency: '' }));
  assert.notEqual(taxtaFiltrKaliti({ search: 'a' }), taxtaFiltrKaliti({ search: 'a', overdue: true }));
});

test('taxtaAmali: faqat draft->shipped, shipped/partial->partial/closed va bekor', () => {
  assert.equal(taxtaAmali('draft', 'shipped', TOLIQ), 'tasdiqlash');
  assert.equal(taxtaAmali('shipped', 'partial', TOLIQ), 'tolov');
  assert.equal(taxtaAmali('shipped', 'closed', TOLIQ), 'tolov');
  assert.equal(taxtaAmali('partial', 'closed', TOLIQ), 'tolov');
  for (const qayerdan of ['draft', 'shipped', 'partial', 'closed']) assert.equal(taxtaAmali(qayerdan, 'cancelled', TOLIQ), 'bekor');
  // Hisoblanadigan ustunlar qo'lda o'rnatilmaydi.
  for (const [a, b] of [['draft', 'partial'], ['draft', 'closed'], ['closed', 'partial'], ['closed', 'shipped'], ['partial', 'shipped'], ['shipped', 'draft'], ['cancelled', 'draft'], ['cancelled', 'closed']]) {
    assert.equal(taxtaAmali(a, b, TOLIQ), null, `${a}->${b}`);
  }
  assert.equal(taxtaAmali('draft', 'draft', TOLIQ), null);
  assert.equal(taxtaAmali('cancelled', 'cancelled', TOLIQ), null);
});

test('taxtaAmali: ruxsatlar', () => {
  assert.equal(taxtaAmali('draft', 'cancelled', KASSIR), null);
  assert.equal(taxtaAmali('draft', 'shipped', KASSIR), 'tasdiqlash');
  assert.equal(taxtaAmali('draft', 'shipped', HECH), null);
  assert.equal(taxtaAmali('shipped', 'closed', { amal: false, bekor: true }), null);
  assert.equal(taxtaAmali('shipped', 'cancelled', { amal: false, bekor: true }), 'bekor');
});

test('taxtaMumkinAmallari: menyu uchun takrorsiz amallar', () => {
  assert.deepEqual(taxtaMumkinAmallari('draft', TOLIQ), [{ amal: 'tasdiqlash', qayerga: 'shipped' }, { amal: 'bekor', qayerga: 'cancelled' }]);
  assert.deepEqual(taxtaMumkinAmallari('shipped', TOLIQ), [{ amal: 'tolov', qayerga: 'partial' }, { amal: 'bekor', qayerga: 'cancelled' }]);
  assert.deepEqual(taxtaMumkinAmallari('partial', KASSIR), [{ amal: 'tolov', qayerga: 'closed' }]);
  assert.deepEqual(taxtaMumkinAmallari('closed', KASSIR), []);
  assert.deepEqual(taxtaMumkinAmallari('cancelled', TOLIQ), []);
  assert.deepEqual(taxtaMumkinAmallari('draft', HECH), []);
});

test('taxtaRadSababi: tushuntirish kaliti', () => {
  assert.equal(taxtaRadSababi('draft', 'shipped', TOLIQ), null);
  assert.equal(taxtaRadSababi('draft', 'draft', TOLIQ), null);
  assert.equal(taxtaRadSababi('closed', 'partial', TOLIQ), 'hisoblanadi');
  assert.equal(taxtaRadSababi('partial', 'shipped', TOLIQ), 'hisoblanadi');
  assert.equal(taxtaRadSababi('shipped', 'draft', TOLIQ), 'hisoblanadi');
  assert.equal(taxtaRadSababi('draft', 'closed', TOLIQ), 'avvalJonatish');
  assert.equal(taxtaRadSababi('draft', 'partial', TOLIQ), 'avvalJonatish');
  assert.equal(taxtaRadSababi('draft', 'cancelled', KASSIR), 'bekorRuxsat');
  assert.equal(taxtaRadSababi('cancelled', 'draft', TOLIQ), 'bekorQilingan');
  assert.equal(taxtaRadSababi('draft', 'shipped', HECH), 'ruxsat');
  assert.equal(taxtaRadSababi('shipped', 'closed', HECH), 'ruxsat');
  assert.equal(taxtaRadSababi('closed', 'partial', HECH), 'hisoblanadi');
});

test('taxtaSummasi: satr summa, bo\'sh/noto\'g\'ri — null', () => {
  assert.equal(taxtaSummasi('125000.50'), 125000.5);
  assert.equal(taxtaSummasi('1 250 000'), 1250000);
  assert.equal(taxtaSummasi(42), 42);
  assert.equal(taxtaSummasi('0'), 0);
  for (const q of [null, undefined, '', 'abc']) assert.equal(taxtaSummasi(q), null);
});

test('taxtaMijozi: customer / clientCompany / walkInCustomerName', () => {
  assert.equal(taxtaMijozi({ customer: { name: ' Ali ' } }), 'Ali');
  assert.equal(taxtaMijozi({ customer: null, clientCompany: { name: 'OOO Test' } }), 'OOO Test');
  assert.equal(taxtaMijozi({ walkInCustomerName: 'Vali' }), 'Vali');
  assert.equal(taxtaMijozi({ customer: { name: '  ' }, walkInCustomerName: null }), '');
});

test('taxtaOgohlantirishi: muddati o\'tgan — qizil, 2 kundan uzoq qoralama — sariq', () => {
  assert.equal(taxtaOgohlantirishi({ overdue: true, draftDays: 5 }), 'qizil');
  assert.equal(taxtaOgohlantirishi({ draftDays: 3 }), 'sariq');
  assert.equal(taxtaOgohlantirishi({ draftDays: 2 }), null);
  assert.equal(taxtaOgohlantirishi({ draftDays: null }), null);
  assert.equal(taxtaOgohlantirishi({}), null);
});

test('kartochkalarniQoshish: takrorlar tashlanadi, tartib saqlanadi', () => {
  const natija = kartochkalarniQoshish([{ id: 'a' }, { id: 'b' }], [{ id: 'b' }, { id: 'c' }]);
  assert.deepEqual(natija.map((k) => k.id), ['a', 'b', 'c']);
});

test('sahifalarniQaytaYurish: kursorlar o\'zgartirilmasdan, so\'ralgan sahifagacha', async () => {
  const sahifalar = { c1: { items: [{ id: '3' }, { id: '4' }], nextCursor: 'c2' }, c2: { items: [{ id: '4' }, { id: '5' }], nextCursor: null } };
  const soralgan = [];
  const olish = async (cursor) => {
    soralgan.push(cursor);
    return sahifalar[cursor];
  };
  const birinchi = { items: [{ id: '1' }, { id: '2' }], nextCursor: 'c1' };

  const bitta = await sahifalarniQaytaYurish(birinchi, 1, olish);
  assert.deepEqual(bitta, { items: [{ id: '1' }, { id: '2' }], nextCursor: 'c1', sahifalar: 1 });
  assert.deepEqual(soralgan, []);

  const ikki = await sahifalarniQaytaYurish(birinchi, 2, olish);
  assert.deepEqual(ikki.items.map((k) => k.id), ['1', '2', '3', '4']);
  assert.equal(ikki.nextCursor, 'c2');
  assert.equal(ikki.sahifalar, 2);
  assert.deepEqual(soralgan, ['c1']);

  soralgan.length = 0;
  // Ko'proq so'ralsa ham kursor tugagach to'xtaydi; takror (id 4) tashlanadi.
  const hammasi = await sahifalarniQaytaYurish(birinchi, 10, olish);
  assert.deepEqual(hammasi.items.map((k) => k.id), ['1', '2', '3', '4', '5']);
  assert.equal(hammasi.nextCursor, null);
  assert.equal(hammasi.sahifalar, 3);
  assert.deepEqual(soralgan, ['c1', 'c2']);

  // Birinchi sahifaning o'zi oxirgi.
  const oxirgi = await sahifalarniQaytaYurish({ items: [], nextCursor: null }, 3, olish);
  assert.deepEqual(oxirgi, { items: [], nextCursor: null, sahifalar: 1 });
});

test('sahifalarniQaytaYurish: xato (masalan eskirgan kursor) chaqiruvchiga o\'tadi', async () => {
  const xato = Object.assign(new Error('400'), { response: { data: { code: TAXTA_KURSOR_XATOSI } } });
  await assert.rejects(
    sahifalarniQaytaYurish({ items: [{ id: '1' }], nextCursor: 'eski' }, 2, async () => {
      throw xato;
    }),
    (e) => e === xato
  );
  assert.equal(TAXTA_KURSOR_XATOSI, 'errors.sales.board_cursor_invalid');
});
