// Kassa amaliyoti oynasi: Tahrirlash / Bekor qilish / O'chirish / manba havolasi, davr yopilishi va tarix (audit) o'zgarishlari (TZ 11.11.2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bekorSababi, davrYopilganmi, kassaAmallari, kassaTarixOzgarishlari } from '../src/lib/kassaTahriri.ts';

const asos = { refId: 'op1', kun: '2026-09-29', closedUntil: null, tahrirRuxsati: true };

test('KAS-000001 (tasdiqlangan kassa amaliyoti): Tahrirlash (almashtirish) va Bekor qilish bor, O\'chirish yo\'q', () => {
  const a = kassaAmallari({ ...asos, manba: 'CASH_OPERATION', holat: 'tasdiqlangan' });
  assert.equal(a.tahrirUsuli, 'almashtirish');
  assert.deepEqual(a.tahrir, { korinadi: true, mumkin: true });
  assert.deepEqual(a.bekor, { korinadi: true, mumkin: true });
  assert.equal(a.ochirish.korinadi, false);
  assert.equal(a.havola, null);
});

test('qoralama: PATCH bilan tahrirlash va o\'chirish; bekor qilingan: faqat o\'chirish', () => {
  const q = kassaAmallari({ ...asos, manba: 'CASH_OPERATION', holat: 'qoralama' });
  assert.equal(q.tahrirUsuli, 'patch');
  assert.equal(q.ochirish.mumkin, true);
  assert.equal(q.bekor.korinadi, false);
  const b = kassaAmallari({ ...asos, manba: 'CASH_OPERATION', holat: 'bekor_qilingan' });
  assert.equal(b.tahrir.korinadi, false);
  assert.equal(b.bekor.korinadi, false);
  assert.equal(b.ochirish.mumkin, true);
});

test('savdo va qaytarishdan kelgan qator: tugmalar yo\'q, o\'rnida havola', () => {
  const s = kassaAmallari({ ...asos, manba: 'SALE', holat: 'tasdiqlangan', refId: 'sale-14' });
  assert.deepEqual(s.havola, { tur: 'sotuv', id: 'sale-14' });
  assert.equal(s.tahrir.korinadi || s.bekor.korinadi || s.ochirish.korinadi, false);
  assert.deepEqual(kassaAmallari({ ...asos, manba: 'RETURN', holat: 'tasdiqlangan', refId: 'r1' }).havola, { tur: 'qaytarish', id: 'r1' });
});

test('davr yopilgan: tugmalar ko\'rinadi, lekin o\'chiq va sababi "davrYopilgan"', () => {
  assert.equal(davrYopilganmi('2026-09-29', '2026-09-30'), true);
  assert.equal(davrYopilganmi('2026-09-30', '2026-09-30'), true, 'yopilgan kun ham kiradi');
  assert.equal(davrYopilganmi('2026-10-01', '2026-09-30'), false);
  assert.equal(davrYopilganmi('2026-10-01', null), false);
  const a = kassaAmallari({ ...asos, manba: 'CASH_OPERATION', holat: 'tasdiqlangan', closedUntil: '2026-09-30' });
  assert.deepEqual(a.tahrir, { korinadi: true, mumkin: false, sabab: 'davrYopilgan' });
  assert.deepEqual(a.bekor, { korinadi: true, mumkin: false, sabab: 'davrYopilgan' });
});

test('tasdiqlanganni tahrirlash huquqi yo\'q: Tahrirlash o\'chiq (ruxsatYoq), Bekor qilish avvalgidek', () => {
  const a = kassaAmallari({ ...asos, manba: 'CASH_OPERATION', holat: 'tasdiqlangan', tahrirRuxsati: false });
  assert.deepEqual(a.tahrir, { korinadi: true, mumkin: false, sabab: 'ruxsatYoq' });
  assert.equal(a.bekor.mumkin, true);
  // qoralamani kassir avvalgidek tahrirlaydi
  assert.equal(kassaAmallari({ ...asos, manba: 'CASH_OPERATION', holat: 'qoralama', tahrirRuxsati: false }).tahrir.mumkin, true);
});

test('eski kirim/xarajat yozuvlari: PATCH bilan tahrirlash va o\'chirish (bekor qilish endpointi yo\'q)', () => {
  for (const manba of ['CASH_IN', 'EXPENSE']) {
    const a = kassaAmallari({ ...asos, manba, holat: 'tasdiqlangan' });
    assert.equal(a.tahrirUsuli, 'eski');
    assert.equal(a.tahrir.mumkin, true);
    assert.equal(a.bekor.korinadi, false);
    assert.equal(a.ochirish.mumkin, true);
  }
});

test('bekor qilish sababi: bo\'sh yuborilmaydi, 500 belgigacha', () => {
  assert.equal(bekorSababi('  '), undefined);
  assert.equal(bekorSababi(undefined), undefined);
  assert.equal(bekorSababi(' Xato summa '), 'Xato summa');
  assert.equal(bekorSababi('x'.repeat(600)).length, 500);
});

test('tarix: "Summa 4 500 000 → 4 000 000", satr/son va ISO sana farqi o\'zgarish emas', () => {
  const o = kassaTarixOzgarishlari({
    before: { amount: '4500000.00', date: '2026-09-29T18:59:59.000Z', paymentMethod: 'CASH', note: 'Firmaga tolov', updatedAt: 'a' },
    after: { amount: 4000000, date: '2026-09-29T12:00:00.000Z', paymentMethod: 'BANK', note: 'Firmaga tolov', updatedAt: 'b' },
  });
  assert.deepEqual(o, [
    { maydon: 'amount', oldin: 4500000, keyin: 4000000 },
    { maydon: 'paymentMethod', oldin: 'CASH', keyin: 'BANK' },
  ]);
  assert.deepEqual(kassaTarixOzgarishlari({ after: { amount: 1 } }), []);
  assert.deepEqual(kassaTarixOzgarishlari({ before: { status: 'CONFIRMED' }, after: { status: 'CANCELLED' } }), [{ maydon: 'status', oldin: 'CONFIRMED', keyin: 'CANCELLED' }]);
});

test('kod: oyna amallari ulangan, tasdiqlangan tahriri eskisini bekor qilib yangisini tasdiqlaydi', () => {
  const index = readFileSync(new URL('../src/Pages/KassaUchot/index.tsx', import.meta.url), 'utf8');
  assert.match(index, /cashOperationsApi\.bekorQilish\(eski\.id, eski\.sabab\)/);
  assert.match(index, /cashOperationsApi\.ochirish\(saved\.id\)/, 'bekor qilish o\'tmasa yangi qoralama o\'chiriladi');
  assert.match(index, /onBekorQilish=\{oynadanBekorQilish\}/);
  assert.match(index, /kassaKirimApi\.yangilash\(id, malumot\)/);
  assert.match(index, /xarajatApi\.yangilash\(id, malumot\)/);
  const modal = readFileSync(new URL('../src/Pages/KassaUchot/KassaAmaliyotModal.tsx', import.meta.url), 'utf8');
  assert.match(modal, /data-testid="kassa-amallari"/);
  assert.match(modal, /\/savdo\?sotuv=/);
  const api = readFileSync(new URL('../src/api/cashOperationsApi.ts', import.meta.url), 'utf8');
  assert.match(api, /reason \? \{ reason \} : undefined/);
  for (const til of ['uz', 'ru']) {
    const json = JSON.parse(readFileSync(new URL(`../src/i18n/locales/${til}/kassa_uchot.json`, import.meta.url), 'utf8'));
    assert.ok(json.amallar.edit && json.amallar.cancel && json.amallar.delete && json.amallar.openSale && json.amallar.periodClosed && json.tarix.title);
  }
});

// ---- Mustaqil tekshiruvdan keyingi tuzatishlar (backend formati bo'yicha) ----
import { almashtirishIzohi, eskiYozuvSanasi, kassaTarixAmali, kassaTarixValyutalari, toshkentKunidan } from '../src/lib/kassaTahriri.ts';

test('tarix: backend `diff` formati — UPDATE {maydon:{from,to}} va POST {after}', () => {
  assert.deepEqual(kassaTarixOzgarishlari({ action: 'UPDATE', diff: { amount: { from: '4500000.00', to: 4000000 }, updatedAt: { from: 'a', to: 'b' } } }),
    [{ maydon: 'amount', oldin: 4500000, keyin: 4000000 }]);
  assert.deepEqual(kassaTarixOzgarishlari({ action: 'CREATE', diff: { after: { amount: 1, status: 'DRAFT' } } }), [], 'yaratishda "oldin" yo\'q');
  assert.equal(kassaTarixAmali({ action: 'CREATE', diff: { after: { status: 'DRAFT' } } }), 'CREATE');
  assert.equal(kassaTarixAmali({ action: 'CREATE', diff: { after: { status: 'CONFIRMED' } } }), 'CONFIRM', 'tasdiqlash ham POST → CREATE bo\'lib yoziladi');
  assert.equal(kassaTarixAmali({ action: 'CREATE', diff: { after: { status: 'CANCELLED' } } }), 'CANCEL');
  assert.equal(kassaTarixAmali({ action: 'DELETE', diff: { after: { status: 'CANCELLED' } } }), 'DELETE');
  assert.deepEqual(kassaTarixValyutalari({ diff: { currency: { from: 'UZS', to: 'USD' } } }), { oldin: 'UZS', keyin: 'USD' });
});

test('tarix: sana Toshkent kuni bo\'yicha (UTC 20:30 — ertasi kun), kun bir xil bo\'lsa o\'zgarish emas', () => {
  assert.equal(toshkentKunidan('2026-09-28T20:30:00.000Z'), '2026-09-29');
  assert.deepEqual(kassaTarixOzgarishlari({ before: { date: '2026-09-28T20:30:00.000Z' }, after: { date: '2026-09-29T18:59:59.000Z' } }), []);
});

test('eski yozuv sanasi: o\'zgarmasa yuborilmaydi, o\'tgan kun — 23:59:59 Toshkent (to\'liq ISO), bugun — hozirgi vaqt', () => {
  assert.equal(eskiYozuvSanasi('2026-10-05', '2026-10-05', '2026-11-11'), undefined);
  assert.equal(eskiYozuvSanasi('2026-10-04', '2026-10-05', '2026-11-11'), '2026-10-04T18:59:59.000Z');
  const hozir = new Date('2026-11-11T10:00:00.000Z');
  assert.equal(eskiYozuvSanasi('2026-11-11', '2026-10-05', '2026-11-11', hozir), hozir.toISOString());
});

test('almashtirish izohi: "KAS-000001 o\'rniga: Summa 4 500 000 → 4 000 000" va sabab', () => {
  const matn = { orniga: "o'rniga (tahrir)", summa: 'Summa', sana: 'Sana', tolovTuri: "To'lov turi", turi: 'Turi', kontragent: 'Kontragent', sabab: 'Sabab' };
  const q = { summa: 4500000, valyuta: 'UZS', kun: '29.09.2026', tolovTuri: 'Naqd', turi: "Yetkazib beruvchiga to'lov", kontragent: 'Crafers' };
  const izoh = almashtirishIzohi({ eskiRaqam: 'KAS-000001', oldin: q, keyin: { ...q, summa: 4000000 }, sabab: 'Summa xato', summaMatni: (s) => `${s} so'm`, matn });
  assert.equal(izoh, "KAS-000001 o'rniga (tahrir): Summa 4500000 so'm → 4000000 so'm. Sabab: Summa xato");
  assert.equal(almashtirishIzohi({ eskiRaqam: 'KAS-1', oldin: q, keyin: q, summaMatni: String, matn }), "KAS-1 o'rniga (tahrir).");
});

test('kod: almashtirish holati qoralamaga bog\'langach o\'chadi; valyuta, filial saqlanadi; qaytarish havolasi aniq hujjatni ochadi', () => {
  const modal = readFileSync(new URL('../src/Pages/KassaUchot/KassaAmaliyotModal.tsx', import.meta.url), 'utf8');
  assert.match(modal, /almashtirish && mavjudHolat === "tasdiqlangan" && boshlangich\?\.backendRefId/);
  assert.match(modal, /if \(boshlangich\?\.holat !== "tasdiqlangan"\) setAlmashtirish\(false\)/);
  assert.match(modal, /boshlangich\?\.valyuta \?\? "UZS"/);
  assert.match(modal, /backendBranchId: boshlangich\?\.backendBranchId/);
  assert.match(modal, /qaytarish=\$\{encodeURIComponent\(havola\.id\)\}/);
  const qaytarish = readFileSync(new URL('../src/Pages/Savdo/Qaytarish.tsx', import.meta.url), 'utf8');
  assert.match(qaytarish, /qidiruvParametrlari\.get\("qaytarish"\)/);
});
