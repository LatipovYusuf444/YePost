import test from 'node:test';
import assert from 'node:assert/strict';
import {
  botTokenKerakmi, mijozTelegramHolati, mijozTelegramTuri, nakladnoyFaylNomi, navbatdaBormi, sotuvXabarHolati, telegramHavolasi,
  xabarTuri, xabarXatoMatni, xabarnomaYozuvlari,
} from '../src/lib/telegramXabarnoma.ts';

const yozuv = (qism) => ({ id: 'n1', event: 'SALE_CONFIRMED', status: 'SENT', lastError: null, attempts: 1, sentAt: '2026-10-20T08:00:00Z', createdAt: '2026-10-20T07:59:00Z', saleId: 's1', customerId: 'c1', docId: null, ...qism });

test('xabarnomaYozuvlari: massiv, items va data.items shakllari; yangisi birinchi', () => {
  const xom = [
    { id: 'a', event: 'payment', status: 'sent', createdAt: '2026-10-20T08:00:00Z', docId: 'p1', attempts: '2' },
    { id: 'b', event: 'SALE_CONFIRMED', status: 'QUEUED', createdAt: '2026-10-20T09:00:00Z' },
    { id: '', status: 'SENT' },
    { event: 'PAYMENT', status: 'SENT' },
    null,
  ];
  for (const javob of [xom, { items: xom, total: 2 }, { data: xom }, { data: { items: xom, page: 1 } }]) {
    const natija = xabarnomaYozuvlari(javob);
    assert.deepEqual(natija.map((y) => y.id), ['b', 'a']);
    assert.equal(natija[1].event, 'PAYMENT');
    assert.equal(natija[1].status, 'SENT');
    assert.equal(natija[1].attempts, 2);
    assert.equal(natija[1].docId, 'p1');
    assert.equal(natija[0].lastError, null);
  }
  assert.deepEqual(xabarnomaYozuvlari(undefined), []);
  assert.deepEqual(xabarnomaYozuvlari({ items: 'x' }), []);
});

test('xabarTuri: holat va SKIPPED sabablari', () => {
  assert.equal(xabarTuri({ status: 'SENT', lastError: null }), 'yuborildi');
  assert.equal(xabarTuri({ status: 'QUEUED', lastError: null }), 'navbatda');
  assert.equal(xabarTuri({ status: 'FAILED', lastError: 'Bad Request: chat not found' }), 'xato');
  assert.equal(xabarTuri({ status: 'BLOCKED', lastError: 'Forbidden: bot was blocked by the user' }), 'bloklangan');
  assert.equal(xabarTuri({ status: 'SKIPPED', lastError: 'not linked' }), 'ulanmagan');
  assert.equal(xabarTuri({ status: 'SKIPPED', lastError: 'turned off' }), 'ochirilgan');
  assert.equal(xabarTuri({ status: 'SKIPPED', lastError: 'turned off by customer' }), 'mijozOchirgan');
  assert.equal(xabarTuri({ status: 'SKIPPED', lastError: 'boshqa' }), 'otkazilgan');
  assert.equal(xabarTuri({ status: 'SKIPPED', lastError: null }), 'otkazilgan');
  assert.equal(xabarTuri({ status: 'NOMA\'LUM', lastError: null }), 'yuborilmagan');
});

test('sotuvXabarHolati: yozuv yo‘q — yuborilmagan; SALE_CONFIRMED ustun, bo‘lmasa eng oxirgisi', () => {
  assert.deepEqual(sotuvXabarHolati([]), { tur: 'yuborilmagan', yozuv: null });
  const tasdiq = yozuv({ id: 't', event: 'SALE_CONFIRMED', status: 'FAILED', createdAt: '2026-10-20T07:00:00Z' });
  const tolov = yozuv({ id: 'p', event: 'PAYMENT', status: 'SENT', createdAt: '2026-10-20T09:00:00Z' });
  const h = sotuvXabarHolati([tolov, tasdiq]);
  assert.equal(h.tur, 'xato');
  assert.equal(h.yozuv.id, 't');
  // qayta yuborilgan: eng yangi SALE_CONFIRMED hisobga olinadi
  const qayta = yozuv({ id: 'q', event: 'SALE_CONFIRMED', status: 'SENT', createdAt: '2026-10-20T08:30:00Z' });
  assert.equal(sotuvXabarHolati([tasdiq, qayta, tolov]).tur, 'yuborildi');
  // faqat bekor qilish yozuvi
  const bekor = yozuv({ id: 'b', event: 'SALE_CANCELLED', status: 'SKIPPED', lastError: 'not linked' });
  assert.equal(sotuvXabarHolati([bekor]).tur, 'ulanmagan');
});

test('xabarXatoMatni va navbatdaBormi', () => {
  assert.equal(xabarXatoMatni({ status: 'FAILED', lastError: 'chat not found' }), 'chat not found');
  assert.equal(xabarXatoMatni({ status: 'BLOCKED', lastError: 'blocked' }), 'blocked');
  assert.equal(xabarXatoMatni({ status: 'SKIPPED', lastError: 'not linked' }), null);
  assert.equal(xabarXatoMatni({ status: 'SENT', lastError: null }), null);
  assert.equal(navbatdaBormi([yozuv({ status: 'QUEUED' })]), true);
  assert.equal(navbatdaBormi([yozuv({ status: 'SENT' })]), false);
});

test('mijozTelegramHolati va mijozTelegramTuri', () => {
  assert.deepEqual(mijozTelegramHolati({}), { ulangan: false, ulanganVaqt: null, ochirgan: false, bloklagan: false });
  assert.equal(mijozTelegramTuri(mijozTelegramHolati({ telegramChatId: null })), 'ulanmagan');
  assert.equal(mijozTelegramTuri(mijozTelegramHolati({ telegramChatId: '12345', telegramLinkedAt: '2026-10-20T08:00:00Z', telegramNotify: true })), 'ulangan');
  assert.equal(mijozTelegramHolati({ telegramChatId: 12345 }).ulangan, true);
  assert.equal(mijozTelegramHolati({ telegramChatId: '  ' }).ulangan, false);
  assert.equal(mijozTelegramTuri(mijozTelegramHolati({ telegramChatId: '1', telegramNotify: false })), 'ochirgan');
  assert.equal(mijozTelegramTuri(mijozTelegramHolati({ telegramChatId: '1', telegramNotify: true, telegramBlocked: true })), 'bloklagan');
  assert.equal(mijozTelegramHolati({ telegramChatId: '1', telegramLinkedAt: '2026-10-20T08:00:00Z' }).ulanganVaqt, '2026-10-20T08:00:00Z');
  assert.equal(mijozTelegramHolati(null).ulangan, false);
});

test('telegramHavolasi: url va muddat; o‘rovli javob; url yo‘q — null', () => {
  assert.deepEqual(telegramHavolasi({ url: 'https://t.me/bot?start=abc', expiresAt: '2026-10-27T08:00:00Z' }), { url: 'https://t.me/bot?start=abc', expiresAt: '2026-10-27T08:00:00Z' });
  assert.deepEqual(telegramHavolasi({ data: { url: 'https://t.me/bot?start=x' } }), { url: 'https://t.me/bot?start=x', expiresAt: null });
  assert.equal(telegramHavolasi({}), null);
  assert.equal(telegramHavolasi(null), null);
  assert.equal(telegramHavolasi({ url: '   ' }), null);
});

test('nakladnoyFaylNomi: Content-Disposition yoki zaxira nom', () => {
  assert.equal(nakladnoyFaylNomi('attachment; filename="Nakladnoy_S-000012.pdf"', 'S-000012'), 'Nakladnoy_S-000012.pdf');
  assert.equal(nakladnoyFaylNomi("attachment; filename*=UTF-8''Nakladnoy_%D0%A1-1.pdf", 'X'), 'Nakladnoy_С-1.pdf');
  assert.equal(nakladnoyFaylNomi('attachment; filename=Nakladnoy_5.pdf', 'X'), 'Nakladnoy_5.pdf');
  assert.equal(nakladnoyFaylNomi('', 'S-000012'), 'Nakladnoy_S-000012.pdf');
  assert.equal(nakladnoyFaylNomi(undefined, ''), 'Nakladnoy_sotuv.pdf');
  assert.equal(nakladnoyFaylNomi('attachment; filename="a/b:c.pdf"', 'X'), 'a_b_c.pdf');
  assert.equal(nakladnoyFaylNomi('attachment; filename="hisob"', 'X'), 'hisob.pdf');
});

test('botTokenKerakmi: faqat saqlangan token (botTokenLast4) bor-yo‘qligi tekshiriladi, Chat ID hisobga olinmaydi', () => {
  // saqlangan token bor: maydon bo'sh bo'lsa ham xato yo'q (eski token saqlanadi)
  assert.equal(botTokenKerakmi({ yoniq: true, yangiToken: '', oxirgi4: 'AbCd' }), false);
  assert.equal(botTokenKerakmi({ yoniq: true, yangiToken: '   ', oxirgi4: 'AbCd' }), false);
  // saqlangan token yo'q va maydon bo'sh: token kerak
  assert.equal(botTokenKerakmi({ yoniq: true, yangiToken: '', oxirgi4: null }), true);
  assert.equal(botTokenKerakmi({ yoniq: true, yangiToken: '  ', oxirgi4: '' }), true);
  assert.equal(botTokenKerakmi({ yoniq: true, yangiToken: '', oxirgi4: undefined }), true);
  // yangi token yozilgan: kerak emas
  assert.equal(botTokenKerakmi({ yoniq: true, yangiToken: '123:ABC', oxirgi4: null }), false);
  // bot o'chiq: hech narsa majburiy emas
  assert.equal(botTokenKerakmi({ yoniq: false, yangiToken: '', oxirgi4: null }), false);
});
