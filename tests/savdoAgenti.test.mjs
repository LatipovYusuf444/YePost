// Savdo agenti: Telegram Business suhbatlari (kanal, sentById null) va lidlar (bosqich so'rovi) yordamchilari + ulanishlar.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as lib from '../src/lib/savdoAgenti.ts';

const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8').split(String.fromCharCode(13)).join('');

test('suhbat nomi: ism → @username → chat id → qisqa id; bosh harflar', () => {
  assert.equal(lib.suhbatNomi({ id: 't1', displayName: '  Ali Valiyev ', telegramUsername: 'ali' }), 'Ali Valiyev');
  assert.equal(lib.suhbatNomi({ id: 't1', displayName: '', telegramUsername: '@ali' }), '@ali');
  assert.equal(lib.suhbatNomi({ id: 't1', telegramUsername: 'ali' }), '@ali');
  assert.equal(lib.suhbatNomi({ id: 't1', telegramChatId: '12345' }), '12345');
  assert.equal(lib.suhbatNomi({ id: 'abcdef1234567' }), '#abcdef12');
  assert.equal(lib.suhbatNomi(null), '');
  assert.equal(lib.suhbatBoshHarflari('Ali Valiyev'), 'AV');
  assert.equal(lib.suhbatBoshHarflari('@ali'), 'AL');
  assert.equal(lib.suhbatBoshHarflari(''), '@');
});

test('kanal: faqat TELEGRAM_BUSINESS — akkaunt, qolgani bot', () => {
  assert.equal(lib.kanalTuri('TELEGRAM_BUSINESS'), 'BUSINESS');
  assert.equal(lib.kanalTuri('TELEGRAM_BOT'), 'BOT');
  assert.equal(lib.kanalTuri(undefined), 'BOT');
});

test('xabar muallifi: IN — mijoz; OUT + sentById null — Telegram akkauntdan; OUT + id yoki maydonsiz — xodim', () => {
  assert.equal(lib.xabarMuallifi({ direction: 'IN', sentById: null }), 'mijoz');
  assert.equal(lib.xabarMuallifi({ direction: 'OUT', sentById: null }), 'akkaunt');
  assert.equal(lib.xabarMuallifi({ direction: 'OUT', sentById: 'u1' }), 'xodim');
  // Eski javob (maydon yo'q) akkaunt deb ko'rsatilmaydi.
  assert.equal(lib.xabarMuallifi({ direction: 'OUT' }), 'xodim');
});

test('xabarlar birlashtiriladi: eng yangisi birinchi kelgan sahifa eskidan yangiga, takrorlar bitta', () => {
  const sahifa1 = [
    { id: 'c', createdAt: '2026-11-26T10:03:00Z', text: 'c' },
    { id: 'b', createdAt: '2026-11-26T10:02:00Z', text: 'b' },
  ];
  const sahifa2 = [
    { id: 'b', createdAt: '2026-11-26T10:02:00Z', text: 'b-yangi' },
    { id: 'a', createdAt: '2026-11-26T10:01:00Z', text: 'a' },
  ];
  const natija = lib.xabarlarniBirlashtirish(sahifa1, sahifa2);
  assert.deepEqual(natija.map((x) => x.id), ['a', 'b', 'c']);
  assert.equal(natija[1].text, 'b-yangi');
  assert.deepEqual(lib.xabarlarniBirlashtirish([]), []);
});

test('davomiylik va ulush', () => {
  assert.deepEqual(lib.davomiylikQismlari(3725), { soat: 1, daqiqa: 2, soniya: 5 });
  assert.deepEqual(lib.davomiylikQismlari(40), { soat: 0, daqiqa: 0, soniya: 40 });
  assert.equal(lib.davomiylikQismlari(null), null);
  assert.equal(lib.davomiylikQismlari(-1), null);
  assert.equal(lib.ulush(1, 3), 33);
  assert.equal(lib.ulush(5, 0), 0);
});

test('bosqich so\'rovi: LOST sababsiz yuborilmaydi, o\'zgarmagan bosqich yuborilmaydi', () => {
  assert.equal(lib.bosqichSorovi('NEW', 'NEW'), null);
  assert.equal(lib.bosqichSorovi('NEW', 'LOST'), null);
  assert.deepEqual(lib.bosqichSorovi('NEW', 'LOST', 'TOO_EXPENSIVE'), { stage: 'LOST', lostReason: 'TOO_EXPENSIVE' });
  assert.deepEqual(lib.bosqichSorovi('NEW', 'ORDER', 'TOO_EXPENSIVE'), { stage: 'ORDER' });
  assert.equal(lib.lidYopiqmi({ stage: 'SALE' }), true);
  assert.equal(lib.lidYopiqmi({ stage: 'NEW', closedAt: null }), false);
});

test('API: thread xabarlari / javob yo\'llari, lidlar /leads', () => {
  const api = manba('src/api/crmApi.ts');
  assert.match(api, /`\/crm\/chat\/threads\/\$\{threadId\}\/messages`/);
  assert.match(api, /\{ text, \.\.\.\(attachmentIds\?\.length \? \{ attachmentIds \} : \{\}\) \}/);
  assert.match(api, /"\/leads\/stats"/);
  assert.match(api, /`\/leads\/\$\{id\}\/notes`/);
});

test('xato kodlari: telegram_business_cannot_reply va 24 soat matni bor', () => {
  const kodlar = manba('src/api/xatoKodlari.ts');
  for (const kod of ['chat_thread_not_found', 'telegram_bot_not_configured', 'telegram_business_cannot_reply', 'telegram_send_failed']) {
    assert.ok(kodlar.includes(`"errors.crm.${kod}"`), kod);
  }
  assert.match(kodlar, /javob berish ruxsatini yoqing/);
});

test('ulanish: menyu, marshrutlar, kassir/omborchi ruxsati, i18n namespace', () => {
  const yon = manba('src/Components/layout/YonPanel.tsx');
  assert.match(yon, /key: "savdoAgenti",\s*path: "\/savdo-agenti",\s*icon: Bot/);
  for (const yol of ['tasdiq-kutayotganlar', 'lidlar', 'suhbatlar', 'sozlamalar']) {
    assert.ok(yon.includes(`/savdo-agenti/${yol}`), yol);
    assert.ok(manba('src/routes/AppRouter.tsx').includes(`path="/savdo-agenti/${yol}"`), yol);
  }
  assert.match(manba('src/lib/roles.ts'), /KASSIR_YOLLARI = \[[^\]]*"\/savdo-agenti"/);
  const i18n = manba('src/i18n/index.ts');
  assert.match(i18n, /savdo_agenti: savdoAgentiUz/);
  assert.match(i18n, /"savdo_agenti",/);
  for (const til of ['uz', 'ru']) {
    const nav = JSON.parse(manba(`src/i18n/locales/${til}/nav.json`));
    for (const kalit of ['savdoAgenti', 'saTasdiq', 'saLidlar', 'saSuhbatlar', 'saSozlamalar']) assert.ok(nav.menu[kalit], `${til}:${kalit}`);
  }
});

test('uz va ru tarjimalari bir xil kalitlarga ega', () => {
  const kalitlar = (obj, oldingi = '') =>
    Object.entries(obj).flatMap(([k, v]) => (v && typeof v === 'object' ? kalitlar(v, `${oldingi}${k}.`) : [`${oldingi}${k}`])).sort();
  const uz = JSON.parse(manba('src/i18n/locales/uz/savdo_agenti.json'));
  const ru = JSON.parse(manba('src/i18n/locales/ru/savdo_agenti.json'));
  assert.deepEqual(kalitlar(uz), kalitlar(ru));
});

test('mijoz faoliyati: OUT + sentById null "Telegram akkauntdan" deb yoziladi', () => {
  const panel = manba('src/Pages/XaridorUchot/FaoliyatPaneli.tsx');
  assert.match(panel, /item\.sentById === null \? t\("faoliyatPaneli\.chatFromAccount"\)/);
  for (const til of ['uz', 'ru']) assert.ok(JSON.parse(manba(`src/i18n/locales/${til}/xaridor_uchot.json`)).faoliyatPaneli.chatFromAccount);
});

test('nisbiy vaqt: hozir / daqiqa / soat / kun; kelajak va bo\'sh qiymat', () => {
  const hozir = Date.parse('2026-11-26T12:00:00Z');
  assert.deepEqual(lib.nisbiyVaqt('2026-11-26T11:59:30Z', hozir), { tur: 'hozir', n: 0 });
  assert.deepEqual(lib.nisbiyVaqt('2026-11-26T11:48:00Z', hozir), { tur: 'daqiqa', n: 12 });
  assert.deepEqual(lib.nisbiyVaqt('2026-11-26T09:00:00Z', hozir), { tur: 'soat', n: 3 });
  assert.deepEqual(lib.nisbiyVaqt('2026-11-24T10:00:00Z', hozir), { tur: 'kun', n: 2 });
  assert.deepEqual(lib.nisbiyVaqt('2026-11-26T12:05:00Z', hozir), { tur: 'hozir', n: 0 });
  assert.equal(lib.nisbiyVaqt(null, hozir), null);
  assert.equal(lib.nisbiyVaqt('xato', hozir), null);
});

test('tezkor davr: bugun / hafta (7 kun) / oy (30 kun), oy chegarasi; faol tugma aniqlanadi', () => {
  assert.deepEqual(lib.tezDavrOraligi('bugun', '2026-11-26'), { dateFrom: '2026-11-26', dateTo: '2026-11-26' });
  assert.deepEqual(lib.tezDavrOraligi('hafta', '2026-11-26'), { dateFrom: '2026-11-20', dateTo: '2026-11-26' });
  assert.deepEqual(lib.tezDavrOraligi('hafta', '2026-03-03'), { dateFrom: '2026-02-25', dateTo: '2026-03-03' });
  assert.deepEqual(lib.tezDavrOraligi('oy', '2026-11-26'), { dateFrom: '2026-10-28', dateTo: '2026-11-26' });
  assert.equal(lib.faolTezDavr('', '', '2026-11-26'), 'hammasi');
  assert.equal(lib.faolTezDavr('2026-11-20', '2026-11-26', '2026-11-26'), 'hafta');
  assert.equal(lib.faolTezDavr('2026-11-01', '2026-11-26', '2026-11-26'), null);
});

test('lidlar: kanban asosiy ko\'rinish, LOST ga tashlansa sabab oynasi, mas\'ul tayinlash, suhbatda lid holati', () => {
  const lidlar = manba('src/Pages/SavdoAgenti/Lidlar.tsx');
  assert.match(lidlar, /=== "jadval" \? "jadval" : "kanban"/);
  assert.match(lidlar, /<LidlarKanban/);
  assert.match(lidlar, /ownerId/);
  const kanban = manba('src/Pages/SavdoAgenti/LidlarKanban.tsx');
  assert.match(kanban, /if \(ga === "LOST"\) setSababSorovi/);
  assert.match(kanban, /style=\{\{ touchAction: "none" \}\}/);
  assert.match(manba('src/Pages/SavdoAgenti/LidKartasi.tsx'), /void yangilash\(\{ ownerId: yangi \}\)/);
  assert.match(manba('src/Pages/SavdoAgenti/Suhbatlar.tsx'), /lidlarApi\s*\.royxat\(\{ threadId: tanlanganId, page: 1, pageSize: 1 \}\)/);
});
