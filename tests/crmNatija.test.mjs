// CRM 1-bosqich: faoliyat natijasi va keyingi qadam qoidalari (src/lib/crmNatija.ts).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as lib from '../src/lib/crmNatija.ts';

// 2026-11-28 14:30 Toshkent (09:30 UTC)
const HOZIR = new Date('2026-11-28T09:30:00Z');
// 2026-11-28 19:00 Toshkent
const KECHQURUN = new Date('2026-11-28T14:00:00Z');

test('konstantalar', () => {
  assert.deepEqual([...lib.CONTACT_TURLARI], ['CALL', 'MEETING', 'MESSAGE']);
  assert.deepEqual([...lib.NATIJALAR], ['ORDER', 'LATER', 'THINKING', 'NO_ANSWER', 'REJECTED']);
  assert.deepEqual([...lib.RAD_SABABLARI], ['PRICE', 'COMPETITOR', 'NOT_NEEDED', 'OTHER']);
  assert.deepEqual([...lib.VAZIFA_TURLARI], ['CALL', 'MEETING', 'MESSAGE', 'DEBT', 'TASK']);
  assert.deepEqual([...lib.kunTartibiBolimlari], ['overdue', 'today', 'tomorrow', 'later']);
});

test('keyingi qadam: LATER/THINKING majburiy, qolgani ixtiyoriy; standart ochiq — LATER/THINKING/NO_ANSWER', () => {
  assert.equal(lib.keyingiQadamKerakmi('LATER'), 'majburiy');
  assert.equal(lib.keyingiQadamKerakmi('THINKING'), 'majburiy');
  for (const r of ['ORDER', 'NO_ANSWER', 'REJECTED', '', undefined]) assert.equal(lib.keyingiQadamKerakmi(r), 'ixtiyoriy');
  assert.equal(lib.keyingiQadamStandartOchiqmi('LATER'), true);
  assert.equal(lib.keyingiQadamStandartOchiqmi('THINKING'), true);
  assert.equal(lib.keyingiQadamStandartOchiqmi('NO_ANSWER'), true);
  assert.equal(lib.keyingiQadamStandartOchiqmi('ORDER'), false);
  assert.equal(lib.keyingiQadamStandartOchiqmi('REJECTED'), false);
});

test('Toshkent vaqti: toshkentIso va isoniAjratish', () => {
  assert.equal(lib.toshkentIso('2026-11-29', '10:00'), '2026-11-29T10:00:00+05:00');
  assert.equal(lib.toshkentIso('2026-11-29', '24:00'), '');
  assert.equal(lib.toshkentIso('2026-02-30', '10:00'), '');
  assert.equal(lib.toshkentIso('', '10:00'), '');
  assert.equal(lib.toshkentIso('2026-11-29', ''), '');
  assert.deepEqual(lib.isoniAjratish('2026-11-29T10:00:00+05:00'), { kun: '2026-11-29', vaqt: '10:00' });
  // UTC kechasi — Toshkentda ertasi kun
  assert.deepEqual(lib.isoniAjratish('2026-11-28T20:30:00Z'), { kun: '2026-11-29', vaqt: '01:30' });
  assert.deepEqual(lib.isoniAjratish(''), { kun: '', vaqt: '' });
  assert.deepEqual(lib.isoniAjratish('xato'), { kun: '', vaqt: '' });
});

test('standart keyingi vazifa: tur kontakt turidan, NO_ANSWER/LATER ertaga, THINKING 2 kundan keyin 10:00', () => {
  assert.deepEqual(lib.standartKeyingiVazifa('NO_ANSWER', 'CALL', HOZIR), { type: 'CALL', subject: "Qayta qo'ng'iroq", dueAt: '2026-11-29T10:00:00+05:00' });
  assert.equal(lib.standartKeyingiVazifa('LATER', 'MEETING', HOZIR).dueAt, '2026-11-29T10:00:00+05:00');
  assert.equal(lib.standartKeyingiVazifa('LATER', 'MEETING', HOZIR).type, 'MEETING');
  assert.equal(lib.standartKeyingiVazifa('THINKING', 'MESSAGE', HOZIR).dueAt, '2026-11-30T10:00:00+05:00');
  assert.equal(lib.standartKeyingiVazifa('THINKING', 'MESSAGE', HOZIR).type, 'MESSAGE');
  assert.equal(lib.standartKeyingiVazifa('ORDER', 'CALL', HOZIR).dueAt, '2026-11-29T10:00:00+05:00');
  assert.equal(lib.standartKeyingiVazifa('REJECTED', 'CALL', HOZIR, { CALL: 'Перезвонить' }).subject, 'Перезвонить');
  // Oy oxiri
  assert.equal(lib.standartKeyingiVazifa('THINKING', 'CALL', new Date('2026-11-30T05:00:00Z')).dueAt, '2026-12-02T10:00:00+05:00');
});

test('tez muddatlar: bugun 18:00 o\'tgan bo\'lsa chiqmaydi', () => {
  assert.deepEqual(lib.tezMuddatlar(HOZIR).map((m) => [m.kalit, m.dueAt]), [
    ['bugun18', '2026-11-28T18:00:00+05:00'],
    ['ertaga10', '2026-11-29T10:00:00+05:00'],
    ['uchKun', '2026-12-01T10:00:00+05:00'],
    ['birHafta', '2026-12-05T10:00:00+05:00'],
  ]);
  assert.deepEqual(lib.tezMuddatlar(KECHQURUN).map((m) => m.kalit), ['ertaga10', 'uchKun', 'birHafta']);
  const ertaga = lib.tezMuddatlar(HOZIR)[1];
  assert.equal(ertaga.kun, '2026-11-29');
  assert.equal(ertaga.vaqt, '10:00');
});

test('vazifa turidan faoliyat turi', () => {
  assert.equal(lib.vazifaTuridanContactTuri('CALL'), 'CALL');
  assert.equal(lib.vazifaTuridanContactTuri('MEETING'), 'MEETING');
  assert.equal(lib.vazifaTuridanContactTuri('MESSAGE'), 'MESSAGE');
  assert.equal(lib.vazifaTuridanContactTuri('DEBT'), 'CALL');
  assert.equal(lib.vazifaTuridanContactTuri('TASK'), 'CALL');
  assert.equal(lib.vazifaTuridanContactTuri(undefined), 'CALL');
  assert.equal(lib.contactTuriTanlanadimi('CALL'), false);
  assert.equal(lib.contactTuriTanlanadimi('DEBT'), true);
  assert.equal(lib.contactTuriTanlanadimi('TASK'), true);
});

test('boshlang\'ich forma va natija tanlash', () => {
  const f = lib.boshNatijaFormasi({}, HOZIR);
  assert.equal(f.type, 'CALL');
  assert.equal(f.result, '');
  assert.equal(f.keyingiOchiq, false);
  assert.equal(f.keyingi.kun, '2026-11-29');
  assert.equal(f.keyingi.vaqt, '10:00');
  assert.equal(f.keyingi.subject, "Qayta qo'ng'iroq");

  const think = lib.natijaniOzgartirish(f, 'THINKING', HOZIR);
  assert.equal(think.keyingiOchiq, true);
  assert.equal(think.keyingi.kun, '2026-11-30');

  // REJECTED: blok yopiladi (foydalanuvchi tegmagan), sabab saqlanadi faqat REJECTED da
  const rad = lib.natijaniOzgartirish({ ...think, rejectReason: 'PRICE' }, 'REJECTED', HOZIR);
  assert.equal(rad.keyingiOchiq, false);
  assert.equal(rad.rejectReason, 'PRICE');
  const order = lib.natijaniOzgartirish({ ...rad, saleId: 's1' }, 'ORDER', HOZIR);
  assert.equal(order.rejectReason, '');
  assert.equal(order.saleId, 's1');
  assert.equal(lib.natijaniOzgartirish(order, 'LATER', HOZIR).saleId, '');

  // Foydalanuvchi o'zgartirgan keyingi qadam ustidan yozilmaydi va ochiq qoladi
  const qolda = { ...think, keyingiQolda: true, keyingi: { ...think.keyingi, subject: 'Narx yuborish', kun: '2026-12-10' } };
  const keyin = lib.natijaniOzgartirish(qolda, 'ORDER', HOZIR);
  assert.equal(keyin.keyingiOchiq, true);
  assert.equal(keyin.keyingi.subject, 'Narx yuborish');
  assert.equal(keyin.keyingi.kun, '2026-12-10');
});

test('faoliyat turi o\'zgarsa tegilmagan keyingi vazifa moslashadi', () => {
  const f = lib.boshNatijaFormasi({ result: 'NO_ANSWER' }, HOZIR);
  const m = lib.contactTuriniOzgartirish(f, 'MESSAGE');
  assert.equal(m.type, 'MESSAGE');
  assert.equal(m.keyingi.type, 'MESSAGE');
  assert.equal(m.keyingi.subject, 'Qayta xabar yozish');
  const q = lib.contactTuriniOzgartirish({ ...f, keyingiQolda: true }, 'MEETING');
  assert.equal(q.keyingi.type, 'CALL');
});

test('tekshiruv: natija majburiy, REJECTED da sabab, LATER/THINKING da mavzu va muddat', () => {
  const f = lib.boshNatijaFormasi({}, HOZIR);
  assert.deepEqual(lib.natijaXatolari(f), { result: 'natijaKerak' });
  assert.deepEqual(lib.natijaXatolari(lib.natijaniOzgartirish(f, 'ORDER', HOZIR)), {});
  assert.deepEqual(lib.natijaXatolari(lib.natijaniOzgartirish(f, 'REJECTED', HOZIR)), { rejectReason: 'sababKerak' });

  const later = lib.natijaniOzgartirish(f, 'LATER', HOZIR);
  assert.deepEqual(lib.natijaXatolari(later), {});
  // Majburiy: blok "yopiq" bo'lsa ham tekshiriladi
  const bosh = { ...later, keyingiOchiq: false, keyingi: { ...later.keyingi, subject: '  ', kun: '' } };
  assert.deepEqual(lib.natijaXatolari(bosh), { 'nextTask.subject': 'mavzuKerak', 'nextTask.dueAt': 'muddatKerak' });
  assert.deepEqual(lib.natijaXatolari({ ...later, keyingi: { ...later.keyingi, vaqt: '25:00' } }), { 'nextTask.dueAt': 'muddatNotogri' });

  // NO_ANSWER: blok ochiq bo'lsa tekshiriladi, yopilsa — yo'q
  const na = lib.natijaniOzgartirish(f, 'NO_ANSWER', HOZIR);
  const naBosh = { ...na, keyingi: { ...na.keyingi, subject: '' } };
  assert.deepEqual(lib.natijaXatolari(naBosh), { 'nextTask.subject': 'mavzuKerak' });
  assert.deepEqual(lib.natijaXatolari({ ...naBosh, keyingiOchiq: false }), {});
});

test('o\'tgan muddat — faqat ogohlantirish (bir necha daqiqa bardosh)', () => {
  const f = lib.natijaniOzgartirish(lib.boshNatijaFormasi({}, HOZIR), 'LATER', HOZIR);
  // 14:28 — 2 daqiqa oldin: ogohlantirish yo'q
  assert.equal(lib.muddatOtganmi({ ...f, keyingi: { ...f.keyingi, kun: '2026-11-28', vaqt: '14:28' } }, HOZIR), false);
  // 14:00 — ogohlantirish, lekin xato emas
  const otgan = { ...f, keyingi: { ...f.keyingi, kun: '2026-11-28', vaqt: '14:00' } };
  assert.equal(lib.muddatOtganmi(otgan, HOZIR), true);
  assert.deepEqual(lib.natijaXatolari(otgan), {});
  // Blok yuborilmasa — ogohlantirish ham yo'q
  const order = lib.natijaniOzgartirish(otgan, 'ORDER', HOZIR);
  assert.equal(lib.muddatOtganmi({ ...order, keyingiOchiq: false }, HOZIR), false);
});

test('contact tanasi: ortiqcha maydonlar yuborilmaydi', () => {
  const f = lib.boshNatijaFormasi({ type: 'MEETING' }, HOZIR);
  const order = { ...lib.natijaniOzgartirish(f, 'ORDER', HOZIR), saleId: 's1', text: '  10 ta tovar  ', rejectReason: 'PRICE' };
  assert.deepEqual(lib.contactTanasi(order, 'p1'), { partnerId: 'p1', type: 'MEETING', result: 'ORDER', text: '10 ta tovar', saleId: 's1' });

  const rad = { ...lib.natijaniOzgartirish(f, 'REJECTED', HOZIR), rejectReason: 'COMPETITOR', saleId: 's1', text: '   ' };
  assert.deepEqual(lib.contactTanasi(rad, 'p1'), { partnerId: 'p1', type: 'MEETING', result: 'REJECTED', rejectReason: 'COMPETITOR' });

  const later = lib.natijaniOzgartirish(lib.boshNatijaFormasi({}, HOZIR), 'LATER', HOZIR);
  assert.deepEqual(lib.contactTanasi(later, 'p1'), {
    partnerId: 'p1', type: 'CALL', result: 'LATER',
    nextTask: { type: 'CALL', subject: "Qayta qo'ng'iroq", dueAt: '2026-11-29T10:00:00+05:00' },
  });
  const toliq = { ...later, keyingi: { ...later.keyingi, subject: ' Narx ', assigneeId: 'u2', description: ' izoh ', saleId: 's9' } };
  assert.deepEqual(lib.contactTanasi(toliq, 'p1').nextTask, {
    type: 'CALL', subject: 'Narx', dueAt: '2026-11-29T10:00:00+05:00', assigneeId: 'u2', description: 'izoh', saleId: 's9',
  });

  // NO_ANSWER: blok yopilsa nextTask yo'q
  const na = lib.natijaniOzgartirish(lib.boshNatijaFormasi({}, HOZIR), 'NO_ANSWER', HOZIR);
  assert.ok(lib.contactTanasi(na, 'p1').nextTask);
  assert.equal('nextTask' in lib.contactTanasi({ ...na, keyingiOchiq: false }, 'p1'), false);
  // ORDER + ixtiyoriy blok ochilgan
  assert.ok(lib.contactTanasi({ ...order, keyingiOchiq: true }, 'p1').nextTask);
});

test('yakunlash tanasi: { contact, nextTask? }', () => {
  const later = lib.natijaniOzgartirish(lib.boshNatijaFormasi({ type: 'MESSAGE' }, HOZIR), 'THINKING', HOZIR);
  assert.deepEqual(lib.yakunlashTanasi({ ...later, text: 'katalog yuborildi' }), {
    contact: { type: 'MESSAGE', result: 'THINKING', text: 'katalog yuborildi' },
    nextTask: { type: 'MESSAGE', subject: 'Qayta xabar yozish', dueAt: '2026-11-30T10:00:00+05:00' },
  });
  const order = lib.natijaniOzgartirish(later, 'ORDER', HOZIR);
  assert.deepEqual(lib.yakunlashTanasi(order), { contact: { type: 'MESSAGE', result: 'ORDER' } });
});

test('server xato kodi -> maydon', () => {
  assert.equal(lib.serverXatoMaydoni('errors.crm.contact_next_task_required'), 'nextTask');
  assert.equal(lib.serverXatoMaydoni('errors.crm.contact_reject_reason_required'), 'rejectReason');
  assert.equal(lib.serverXatoMaydoni('errors.crm.contact_reject_reason_not_allowed'), 'rejectReason');
  assert.equal(lib.serverXatoMaydoni('errors.crm.sale_partner_mismatch'), 'saleId');
  assert.equal(lib.serverXatoMaydoni('errors.crm.contact_sale_already_linked'), 'saleId');
  assert.equal(lib.serverXatoMaydoni('errors.crm.activity_next_task_needs_contact'), 'result');
  assert.equal(lib.serverXatoMaydoni('errors.crm.activity_cancel_reason_required'), 'reason');
  assert.equal(lib.serverXatoMaydoni('errors.crm.activity_not_pending'), null);
  assert.equal(lib.serverXatoMaydoni(undefined), null);
});

test('activity_not_pending — vazifa boshqa joyda yopilgan (oyna yopiladi, ro\'yxat yangilanadi)', () => {
  assert.equal(lib.vazifaYopilganXatosimi('errors.crm.activity_not_pending'), true);
  assert.equal(lib.vazifaYopilganXatosimi('errors.crm.activity_cancel_reason_required'), false);
  assert.equal(lib.vazifaYopilganXatosimi(undefined), false);
});
