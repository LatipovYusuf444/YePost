import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bugungiToshkentKuni, kelajakKunmi, kiritilganVaqtMatni, kunMatni, kunniSurish, otganKunmi, tahrirSanasi,
  toshkentKuni, tolovQoshimchasi, vaqtMatni, yangiHujjatSanasi,
} from '../src/lib/hujjatSanasi.ts';

test('toshkentKuni: UTC vaqt Toshkent (UTC+5) kuniga o‘tadi', () => {
  assert.equal(toshkentKuni('2026-10-19T18:59:59Z'), '2026-10-19');
  assert.equal(toshkentKuni('2026-10-19T19:00:00Z'), '2026-10-20');
  assert.equal(toshkentKuni('2026-10-19T23:59:59+05:00'), '2026-10-19');
});

test('toshkentKuni: "YYYY-MM-DD" o‘zgarishsiz, noto‘g‘ri qiymatda bo‘sh', () => {
  assert.equal(toshkentKuni('2026-09-30'), '2026-09-30');
  assert.equal(toshkentKuni(''), '');
  assert.equal(toshkentKuni(null), '');
  assert.equal(toshkentKuni(undefined), '');
  assert.equal(toshkentKuni('abc'), '');
});

test('bugungiToshkentKuni: berilgan paytdagi Toshkent kuni', () => {
  assert.equal(bugungiToshkentKuni(new Date('2026-10-19T20:00:00Z')), '2026-10-20');
  assert.equal(bugungiToshkentKuni(new Date('2026-10-19T10:00:00Z')), '2026-10-19');
});

test('kunniSurish: oy va yil chegaralarida to‘g‘ri', () => {
  assert.equal(kunniSurish('2026-09-30', 1), '2026-10-01');
  assert.equal(kunniSurish('2026-03-01', -1), '2026-02-28');
  assert.equal(kunniSurish('2026-12-31', 1), '2027-01-01');
  assert.equal(kunniSurish('xato', 1), '');
});

test('kunMatni va vaqtMatni: Toshkent bo‘yicha dd.MM.yyyy', () => {
  assert.equal(kunMatni('2026-09-30'), '30.09.2026');
  assert.equal(kunMatni('2026-10-19T19:00:00Z'), '20.10.2026');
  assert.equal(kunMatni(''), '');
  assert.equal(vaqtMatni('2026-10-19T06:50:00Z'), '19.10.2026 11:50');
  assert.equal(vaqtMatni('2026-10-19T19:05:00Z'), '20.10.2026 00:05');
  assert.equal(vaqtMatni(null), '');
});

test('kelajakKunmi va otganKunmi', () => {
  assert.equal(kelajakKunmi('2026-10-20', '2026-10-19'), true);
  assert.equal(kelajakKunmi('2026-10-19', '2026-10-19'), false);
  assert.equal(kelajakKunmi('', '2026-10-19'), false);
  assert.equal(otganKunmi('2026-10-18', '2026-10-19'), true);
  assert.equal(otganKunmi('2026-10-19', '2026-10-19'), false);
});

test('yangiHujjatSanasi: bugun yoki bo‘sh bo‘lsa date yuborilmaydi, o‘tgan kunda yuboriladi', () => {
  assert.deepEqual(yangiHujjatSanasi('2026-10-19', '2026-10-19'), {});
  assert.deepEqual(yangiHujjatSanasi('', '2026-10-19'), {});
  assert.deepEqual(yangiHujjatSanasi('2026-10-12', '2026-10-19'), { date: '2026-10-12' });
});

test('tahrirSanasi: faqat o‘zgargan sana yuboriladi', () => {
  assert.deepEqual(tahrirSanasi('2026-10-12', '2026-10-12'), {});
  assert.deepEqual(tahrirSanasi('2026-10-13', '2026-10-12'), { date: '2026-10-13' });
  assert.deepEqual(tahrirSanasi('', '2026-10-12'), {});
});

test('kiritilganVaqtMatni: kunlar farq qilsagina "kiritilgan" vaqti qaytadi', () => {
  // hujjat 18-kunga yozilgan (23:59:59 Toshkent), 19-kuni 11:50 da kiritilgan
  assert.equal(kiritilganVaqtMatni('2026-10-18T18:59:59Z', '2026-10-19T06:50:00Z'), '19.10.2026 11:50');
  // bir kunda — belgi kerak emas
  assert.equal(kiritilganVaqtMatni('2026-10-19T06:50:00Z', '2026-10-19T06:51:00Z'), null);
  // UTC kuni farq qilsa ham Toshkent kuni bir xil bo‘lsa — null
  assert.equal(kiritilganVaqtMatni('2026-10-19T19:30:00Z', '2026-10-20T03:00:00Z'), null);
  assert.equal(kiritilganVaqtMatni(undefined, '2026-10-19T06:50:00Z'), null);
  assert.equal(kiritilganVaqtMatni('2026-10-18T18:59:59Z', null), null);
});

test('tolovQoshimchasi: bugun va bo‘sh izoh hech narsa qo‘shmaydi, o‘tgan kun va izoh qo‘shiladi', () => {
  const bugun = '2026-10-20';
  assert.deepEqual(tolovQoshimchasi('2026-10-20', '', bugun), {});
  assert.deepEqual(tolovQoshimchasi('', '   ', bugun), {});
  assert.deepEqual(tolovQoshimchasi('2026-10-18', '', bugun), { date: '2026-10-18' });
  assert.deepEqual(tolovQoshimchasi('2026-10-20', '  Akmal aka berdi, naqd  ', bugun), { note: 'Akmal aka berdi, naqd' });
  assert.deepEqual(tolovQoshimchasi('2026-10-18', 'Avans', bugun), { date: '2026-10-18', note: 'Avans' });
  assert.deepEqual(tolovQoshimchasi('noto‘g‘ri', 'x', bugun), { note: 'x' });
});
