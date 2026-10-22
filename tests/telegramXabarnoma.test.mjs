import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bildirishnomaSotuviId, botTokenKerakmi, mijozJavobiHolati, mijozJavoblari, mijozTelegramHolati, mijozTelegramTuri, nakladnoyFaylNomi,
  navbatdaBormi, sotuvXabarHolati, telegramHavolasi, xabarTuri, xabarXatoMatni, xabarnomaYozuvlari,
} from '../src/lib/telegramXabarnoma.ts';

// ── Mijoz javobi (GET /sales/:id/customer-responses) ──
const javobXom = [
  { id: 'r3', kind: 'PROBLEM', productName: 'Konfet', comment: '2 ta kam keldi', awaitingComment: false, createdAt: '2026-10-21T09:00:00Z', saleItemId: 'i1' },
  { id: 'r2', kind: 'PROBLEM', productName: null, comment: null, awaitingComment: true, createdAt: '2026-10-21T08:50:00Z', saleItemId: null },
  { id: 'r1', kind: 'OK', productName: null, comment: null, awaitingComment: false, createdAt: '2026-10-21T08:00:00Z', saleItemId: null },
];

test('mijozJavoblari: massiv, items va data.items shakllari; yangisi birinchi; noma‘lum kind va id‘siz yozuvlar tashlanadi', () => {
  const xom = [...javobXom].reverse().concat([{ id: 'x', kind: 'MAYBE' }, { kind: 'OK' }, null]);
  for (const javob of [xom, { items: xom }, { data: xom }, { data: { items: xom } }]) {
    const natija = mijozJavoblari(javob);
    assert.deepEqual(natija.map((j) => j.id), ['r3', 'r2', 'r1']);
  }
  const [konfet, boshqa] = mijozJavoblari(javobXom);
  assert.equal(konfet.productName, 'Konfet');
  assert.equal(konfet.comment, '2 ta kam keldi');
  assert.equal(konfet.awaitingComment, false);
  assert.equal(boshqa.productName, null);
  assert.equal(boshqa.awaitingComment, true);
  assert.deepEqual(mijozJavoblari(undefined), []);
  assert.deepEqual(mijozJavoblari({}), []);
  assert.equal(mijozJavoblari([{ id: 'a', kind: 'ok' }])[0].kind, 'OK');
});

test('mijozJavobiHolati: javob yo‘q / tasdiqlagan / xato (oxirgi tasdiqdan keyingi xatolar soni, izoh kutilmoqda)', () => {
  assert.deepEqual(mijozJavobiHolati([]), { tur: 'yoq', xatolar: 0, kutilmoqda: false });
  assert.deepEqual(mijozJavobiHolati(mijozJavoblari([javobXom[2]])), { tur: 'tasdiqlagan', xatolar: 0, kutilmoqda: false });
  // eng yangisi PROBLEM: undan keyingi tasdiq hisobga olinmaydi; xatolar — oxirgi OK'dan keyingilari
  assert.deepEqual(mijozJavobiHolati(mijozJavoblari(javobXom)), { tur: 'xato', xatolar: 2, kutilmoqda: true });
  assert.deepEqual(mijozJavobiHolati(mijozJavoblari([javobXom[0]])), { tur: 'xato', xatolar: 1, kutilmoqda: false });
  // avval xato, keyin "To'g'ri keldi" — mijoz fikrini o'zgartirgan: tasdiqlagan
  const keyinTasdiq = mijozJavoblari([{ id: 'ok', kind: 'OK', createdAt: '2026-10-21T10:00:00Z' }, ...javobXom]);
  assert.equal(mijozJavobiHolati(keyinTasdiq).tur, 'tasdiqlagan');
});

test('bildirishnomaSotuviId: faqat CUSTOMER_FEEDBACK + refType Sale + refId', () => {
  assert.equal(bildirishnomaSotuviId({ id: 'n', kind: 'CUSTOMER_FEEDBACK', refType: 'Sale', refId: 's-123' }), 's-123');
  assert.equal(bildirishnomaSotuviId({ kind: 'customer_feedback', refType: 'sale', refId: ' s-9 ' }), 's-9');
  assert.equal(bildirishnomaSotuviId({ kind: 'CUSTOMER_FEEDBACK', refType: 'Customer', refId: 'c1' }), null);
  assert.equal(bildirishnomaSotuviId({ kind: 'CUSTOMER_FEEDBACK', refType: 'Sale' }), null);
  assert.equal(bildirishnomaSotuviId({ kind: 'LOW_STOCK', refType: 'Sale', refId: 's1' }), null);
  assert.equal(bildirishnomaSotuviId({ id: 'n', title: 'Sotuv' }), null);
  assert.equal(bildirishnomaSotuviId(null), null);
});

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

test('mijozlar ro‘yxati: Telegram filtri va sonlari (backend maydonlari: chatId, notify, blocked)', async () => {
  const lib = await import('../src/lib/telegramXabarnoma.ts');
  const ulangan = lib.mijozTelegramHolati({ telegramChatId: '123', telegramLinkedAt: '2026-10-20T10:00:00Z', telegramNotify: true, telegramBlocked: false });
  const ulanmagan = lib.mijozTelegramHolati({ telegramChatId: null });
  const ochirgan = lib.mijozTelegramHolati({ telegramChatId: '5', telegramNotify: false });
  const bloklagan = lib.mijozTelegramHolati({ telegramChatId: '7', telegramNotify: true, telegramBlocked: true });
  assert.deepEqual(lib.MIJOZ_TELEGRAM_FILTRLARI, ['hammasi', 'ulangan', 'ulanmagan', 'ochirgan', 'bloklagan']);
  const barchasi = [ulangan, ulanmagan, ochirgan, bloklagan, undefined];
  assert.equal(barchasi.filter((holat) => lib.mijozTelegramFiltridanOtadimi(holat, 'hammasi')).length, 5);
  assert.equal(barchasi.filter((holat) => lib.mijozTelegramFiltridanOtadimi(holat, 'ulangan')).length, 1);
  // Holati noma'lum (ro'yxatda telegram maydonlari kelmagan) mijoz — ulanmagan.
  assert.equal(barchasi.filter((holat) => lib.mijozTelegramFiltridanOtadimi(holat, 'ulanmagan')).length, 2);
  assert.equal(barchasi.filter((holat) => lib.mijozTelegramFiltridanOtadimi(holat, 'ochirgan')).length, 1);
  assert.equal(barchasi.filter((holat) => lib.mijozTelegramFiltridanOtadimi(holat, 'bloklagan')).length, 1);
  assert.deepEqual(lib.mijozTelegramSonlari(barchasi), { hammasi: 5, ulangan: 1, ulanmagan: 2, ochirgan: 1, bloklagan: 1 });
  assert.deepEqual(lib.mijozTelegramSonlari([]), { hammasi: 0, ulangan: 0, ulanmagan: 0, ochirgan: 0, bloklagan: 0 });
});

test('botSozlanganmi va telegramUstuniKorinadimi: bot sozlanmagan do‘konda ustun ko‘rinmaydi', async () => {
  const lib = await import('../src/lib/telegramXabarnoma.ts');
  assert.equal(lib.botSozlanganmi({ botTokenLast4: '1234', botUsername: 'asia_bot' }), true);
  assert.equal(lib.botSozlanganmi({ botTokenLast4: '1234' }), true);
  assert.equal(lib.botSozlanganmi({ botUsername: 'asia_bot' }), true);
  assert.equal(lib.botSozlanganmi({ botTokenLast4: '', botUsername: null }), false);
  assert.equal(lib.botSozlanganmi({}), false);
  assert.equal(lib.botSozlanganmi(null), false);
  assert.equal(lib.telegramUstuniKorinadimi(true, false), true);
  assert.equal(lib.telegramUstuniKorinadimi(false, true), false);
  assert.equal(lib.telegramUstuniKorinadimi(false, false), false);
  // Sozlama o‘qilmadi (ruxsat yo‘q): faqat ro‘yxatda ulangan mijoz bor bo‘lsa.
  assert.equal(lib.telegramUstuniKorinadimi(null, true), true);
  assert.equal(lib.telegramUstuniKorinadimi(null, false), false);
});
