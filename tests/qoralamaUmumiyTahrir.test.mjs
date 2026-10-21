import test from 'node:test';
import assert from 'node:assert/strict';
import { qoralamaFormasi, qoralamaPatch, qoralamaTahrirSummasi } from '../src/lib/qoralamaUmumiyTahrir.ts';
import { qatorniBoshlash, qatorXatolari } from '../src/lib/qoralamaTahriri.ts';

const sale = { id:'sale', status:'DRAFT', warehouseId:'w1', customerId:'c1', currency:'UZS', date:'2026-10-21T07:00:00Z', note:'Sotuv nomi: Akmal buyurtmasi\nBosqich: Yangi\nValyuta: UZS\nBoshlanish sanasi: 2026-10-21\nTugash sanasi: 2026-10-28\nIzoh: ertaga\nEski qo‘shimcha ma’lumot', paidAmount:100, items:[] };
test('unchanged form produces no PATCH fields and preserves original note exactly', () => {
  assert.deepEqual(qoralamaPatch(sale,qoralamaFormasi(sale)),{});
});
test('previously saved customer change also repairs the stale automatic title in the same PATCH', () => {
  const stale={...sale,customerId:'c2',customer:{id:'c2',firstName:'Mirmuhsin',lastName:'Rusatamov'},note:'Sotuv nomi: Hojiakbar Rahimov uchun yangi sotuv\nBosqich: Yangi\nIzoh: ertaga'};
  const form=qoralamaFormasi(stale);
  assert.equal(form.nom,'Mirmuhsin Rusatamov uchun yangi sotuv');
  const patch=qoralamaPatch(stale,form);
  assert.match(patch.note,/Sotuv nomi: Mirmuhsin Rusatamov uchun yangi sotuv/);
  assert.match(patch.note,/Izoh: ertaga/);
  assert.equal(patch.items,undefined);
  assert.equal(patch.payments,undefined);
});
test('name, customer, warehouse, currency and date edits share a single payload without touching payments', () => {
  const form={...qoralamaFormasi(sale),nom:'Yangi nom',customerId:'c2',warehouseId:'w2',currency:'USD',date:'2026-10-20'};
  const patch=qoralamaPatch(sale,form);
  assert.equal(patch.customerId,'c2'); assert.equal(patch.warehouseId,'w2'); assert.equal(patch.currency,'USD'); assert.equal(patch.date,'2026-10-20');
  assert.match(patch.note,/Sotuv nomi: Yangi nom/);
  assert.match(patch.note,/Eski qo‘shimcha ma’lumot/);
  assert.equal(patch.payments,undefined); assert.equal(patch.totalAmount,undefined); assert.equal(patch.responsibleId,undefined);
});
test('Russian note metadata and multiline comments survive editing and blank sale names are removed', () => {
  const ru={...sale,note:'Название продажи: Заказ\nЭтап: Новый\nКомментарий: строка 1\nстрока 2'};
  const form=qoralamaFormasi(ru);
  assert.equal(form.nom,'Заказ'); assert.equal(form.izoh,'строка 1\nстрока 2');
  const patch=qoralamaPatch(ru,{...form,nom:'',bosqich:'Готово'});
  assert.doesNotMatch(patch.note,/Название продажи:/);
  assert.match(patch.note,/Этап: Готово/);
  assert.match(patch.note,/Комментарий: строка 1\nстрока 2/);
});
test('changing warehouses checks unchanged quantities without borrowing old warehouse reservations', () => {
  const item={modificationId:'m1',quantity:6,price:17000};
  const row=qatorniBoshlash(item,0,{nom:'Cola',qatorValyutasi:'UZS'});
  const stock={modificationId:'m1',warehouseId:'w2',quantity:2};
  assert.deepEqual(qatorXatolari(row,stock),{});
  assert.deepEqual(qatorXatolari(row,stock,false).miqdor,{kod:'qoldiq',mavjud:2});
  assert.deepEqual(qatorXatolari(row,null,false).miqdor,{kod:'qoldiq',mavjud:0});
});
test('currency edit preview uses the current rate without reinterpreting existing settled payments', () => {
  assert.equal(qoralamaTahrirSummasi(120000,'UZS','USD',12000),10);
  assert.equal(qoralamaTahrirSummasi(10,'USD','UZS',12000),120000);
  assert.equal(qoralamaTahrirSummasi(10,'USD','USD',0),10);
  assert.equal(qoralamaTahrirSummasi(120000,'UZS','USD',0),null);
});
