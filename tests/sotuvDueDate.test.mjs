import test from 'node:test';
import assert from 'node:assert/strict';
import { qoralamaFormasi, qoralamaPatch } from '../src/lib/qoralamaUmumiyTahrir.ts';

const eski = { id:'s1', status:'DRAFT', warehouseId:'w1', customerId:'c1', currency:'UZS', date:'2026-10-21T07:00:00Z', note:'Sotuv nomi: Buyurtma\nBoshlanish sanasi: 2026-10-21\nTugash sanasi: 2026-10-28\nIzoh: ertaga', items:[] };
const yangi = { ...eski, dueDate:'2026-11-05', note:'Sotuv nomi: Buyurtma\nIzoh: ertaga' };

test('form date comes from dueDate, falls back to the old note line', () => {
  assert.equal(qoralamaFormasi(yangi).tugash, '2026-11-05');
  assert.equal(qoralamaFormasi({ ...yangi, dueDate:'2026-11-05T00:00:00.000Z' }).tugash, '2026-11-05');
  assert.equal(qoralamaFormasi(eski).tugash, '2026-10-28');
  assert.equal(qoralamaFormasi({ ...eski, dueDate:'2026-12-01' }).tugash, '2026-12-01');
  assert.equal(qoralamaFormasi({ ...yangi, dueDate:null }).tugash, '');
});

test('unchanged form sends nothing', () => {
  assert.deepEqual(qoralamaPatch(yangi, qoralamaFormasi(yangi)), {});
  assert.deepEqual(qoralamaPatch(eski, qoralamaFormasi(eski)), {});
});

test('changing only the date sends dueDate without touching a clean note', () => {
  const patch = qoralamaPatch(yangi, { ...qoralamaFormasi(yangi), tugash:'2026-11-10' });
  assert.deepEqual(patch, { dueDate:'2026-11-10' });
  assert.deepEqual(qoralamaPatch(yangi, { ...qoralamaFormasi(yangi), tugash:'' }), { dueDate:null });
});

test('changing the date of an old sale also drops the stale note line', () => {
  const patch = qoralamaPatch(eski, { ...qoralamaFormasi(eski), tugash:'2026-11-10' });
  assert.equal(patch.dueDate, '2026-11-10');
  assert.doesNotMatch(patch.note, /Tugash sanasi/);
  assert.match(patch.note, /Boshlanish sanasi: 2026-10-21/);
  assert.match(patch.note, /Izoh: ertaga/);
});

test('whenever the note is rebuilt, dueDate is sent too and the note never carries the date', () => {
  const patch = qoralamaPatch(eski, { ...qoralamaFormasi(eski), nom:'Yangi nom' });
  assert.equal(patch.dueDate, '2026-10-28');
  assert.doesNotMatch(patch.note, /Tugash sanasi/);
  assert.match(patch.note, /Sotuv nomi: Yangi nom/);
  const ru = { ...eski, note:'Название продажи: Заказ\nДата окончания: 2026-10-30\nКомментарий: x' };
  const ruPatch = qoralamaPatch(ru, { ...qoralamaFormasi(ru), izoh:'y' });
  assert.equal(ruPatch.dueDate, '2026-10-30');
  assert.doesNotMatch(ruPatch.note, /Дата окончания/);
  const bosh = qoralamaPatch(yangi, { ...qoralamaFormasi(yangi), tugash:'', izoh:'z' });
  assert.equal(bosh.dueDate, null);
});
