import test from 'node:test';
import assert from 'node:assert/strict';
import {
  qoralamaFormasi,
  qoralamaOzgarishlari,
  qoralamaPatch,
  qoralamaQatoriniOgirish,
  qoralamaQatorlari,
  qoralamaQatorTanasi,
  sotuvMasuli,
  sotuvMasulTafsiloti,
  suzishQadami,
} from '../src/lib/qoralamaUmumiyTahrir.ts';
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
test('responsible staff shows the name and role from the users list, never a raw id', () => {
  const uuid = 'd3de3fa1-79c7-47db-bff7-a26082a92238';
  const xodimlar = [{ id: uuid, fullName: 'AsiaScotch', role: 'DIRECTOR' }, { id: 'x', username: 'kassir1' }];
  assert.equal(sotuvMasuli({ cashierId: uuid }, xodimlar), 'AsiaScotch, DIRECTOR');
  assert.equal(sotuvMasuli({ responsibleId: 'x' }, xodimlar), 'kassir1');
  assert.equal(sotuvMasuli({ cashierId: uuid, responsible: { id: uuid, fullName: 'Eski nom' } }, xodimlar), 'AsiaScotch, DIRECTOR');
  assert.equal(sotuvMasuli({ cashierId: uuid, responsible: { id: uuid, fullName: 'Boyitilgan' } }, []), 'Boyitilgan');
  assert.equal(sotuvMasuli({ cashierId: uuid }, [], { id: uuid, fullName: 'Men', role: 'CASHIER' }), 'Men, CASHIER');
  assert.equal(sotuvMasuli({ cashierId: uuid }, []), '—');
  assert.equal(sotuvMasuli({ cashierId: uuid }, [], { id: 'boshqa', fullName: 'Boshqa' }), '—');
  assert.equal(sotuvMasuli({}, xodimlar), '—');
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

const usdItem = { id:'i1', modificationId:'m1', quantity:'5', price:'1.25', discount:'0', currency:'USD', priceType:'RETAIL', modification:{ id:'m1', name:'Asosiy variant', product:{ id:'p1', name:'Ruchka' } } };
const usdSale = { ...sale, currency:'USD', note:'Qoralama nomi: Test\nValyuta: USD', items:[usdItem] };
const qatorlar = (sotuv, ortiqcha = {}) => qoralamaQatorlari(sotuv, { warehouseId:'w1', sotuvVal:'USD', kurs:12700, standartTur:'RETAIL', ...ortiqcha });
const tana = (q) => qoralamaQatorTanasi({ modificationId:q.modificationId, miqdor:Number(q.quantity), narx:Number(q.price)+Number(q.ustama||0), chegirma:Number(q.discount||0), birlikId:q.birlikId, sotuvVal:'USD', tur:q.priceType, turRuxsati:()=>true, foiz:null });

test('saved USD line opens in the create form as dollars and is sent back with the sale currency', () => {
  const [q] = qatorlar(usdSale);
  assert.equal(q.quantity,'5');
  assert.equal(q.price,'1.25');
  assert.equal(q.qoldiqKaliti,'m1::w1');
  assert.equal(q.saqlanganNom,'Ruchka');
  assert.equal(q.tuzatilgan,undefined);
  assert.equal(q.kutilayotganValyuta,undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(tana(q))),{ modificationId:'m1', quantity:5, price:1.25, discount:0, currency:'USD', priceType:'RETAIL' });
  assert.equal(tana({ ...q, quantity:'6' }).quantity*tana(q).price,7.5);
});
test('a line the server stored as so\'m in a dollar sale becomes dollars: mislabelled sub-cent price keeps its number, a real so\'m price is converted', () => {
  const buzilgan = qatorlar({ ...usdSale, items:[{ ...usdItem, currency:'UZS' }] })[0];
  assert.equal(buzilgan.price,'1.25');
  assert.equal(buzilgan.tuzatilgan,true);
  const som = qatorlar({ ...usdSale, items:[{ ...usdItem, currency:'UZS', price:'127000' }] })[0];
  assert.equal(som.price,'10');
  assert.equal(tana(som).currency,'USD');
});
test('without a rate a so\'m line stays as it is and is flagged so that saving is blocked', () => {
  const q = qatorlar({ ...usdSale, items:[{ ...usdItem, currency:'UZS', price:'127000' }] }, { kurs:0 })[0];
  assert.equal(q.price,'127000');
  assert.equal(q.kutilayotganValyuta,'UZS');
});
test('price above the catalog opens as catalog plus markup, price below it stays unchanged', () => {
  const baland = qatorlar(usdSale, { katalogNarxi:()=>1 })[0];
  assert.equal(baland.price,'1');
  assert.equal(baland.ustama,'0.25');
  assert.equal(tana(baland).price,1.25);
  const past = qatorlar(usdSale, { katalogNarxi:()=>2 })[0];
  assert.equal(past.price,'1.25');
  assert.equal(past.ustama,'');
});
test('percent discount opens in percent mode', () => {
  const q = qatorlar({ ...usdSale, items:[{ ...usdItem, discount:'0.63', discountPercent:'10' }] })[0];
  assert.equal(q.discountTuri,'foiz');
  assert.equal(q.discountFoiz,'10');
  assert.equal(q.discount,'');
});
test('changing the sale currency converts the saved price and never rounds a positive price to zero', () => {
  const [q] = qatorlar(usdSale);
  assert.equal(qoralamaQatoriniOgirish(q,'UZS',12700).price,'15875');
  const kichik = { ...q, price:'1', discount:'', ustama:'' };
  assert.ok(Number(qoralamaQatoriniOgirish(kichik,'USD',12700).price)>0);
  assert.equal(qoralamaQatoriniOgirish(q,'UZS',0),q);
  const foizli = { ...q, discountTuri:'foiz', discount:'', discountFoiz:'10' };
  assert.equal(qoralamaQatoriniOgirish(foizli,'UZS',12700).discountFoiz,'10');
});
test('unsaved change counter: untouched form is 0, empty rows are ignored, fields and rows are counted, a repaired line must be saved', () => {
  const [q] = qatorlar(usdSale);
  const asl = { maydonlar:{ nom:'a', izoh:'' }, qatorlar:[q] };
  assert.equal(qoralamaOzgarishlari(asl,{ maydonlar:{ nom:'a', izoh:'' }, qatorlar:[q, { ...q, modificationId:'' }] }),0);
  assert.equal(qoralamaOzgarishlari(asl,{ maydonlar:{ nom:'b', izoh:'' }, qatorlar:[q] }),1);
  assert.equal(qoralamaOzgarishlari(asl,{ maydonlar:{ nom:'b', izoh:'x' }, qatorlar:[{ ...q, quantity:'6' }] }),3);
  assert.equal(qoralamaOzgarishlari(asl,{ maydonlar:asl.maydonlar, qatorlar:[] }),1);
  assert.equal(qoralamaOzgarishlari(asl,{ maydonlar:asl.maydonlar, qatorlar:[{ ...q, tuzatilgan:true }] }),1);
});
test('stepper follows the card that crossed the line, near the top it falls back to the filled-in step', () => {
  assert.equal(suzishQadami([0,500,900],300,{ tepada:true, oxirida:false }),null);
  assert.equal(suzishQadami([-300,200,900],300,{ tepada:false, oxirida:false }),1);
  assert.equal(suzishQadami([-900,-300,250],300,{ tepada:false, oxirida:false }),2);
  assert.equal(suzishQadami([-900,-300,400],300,{ tepada:false, oxirida:true }),2);
});
test('responsible employee details never expose an id', () => {
  const sotuv = { cashierId:'11111111-1111-1111-1111-111111111111' };
  assert.deepEqual(sotuvMasulTafsiloti(sotuv,[{ id:sotuv.cashierId, firstName:'Ali', lastName:'Valiyev', role:'DIRECTOR' }]),{ nom:'Ali Valiyev', rol:'DIRECTOR' });
  assert.deepEqual(sotuvMasulTafsiloti(sotuv,[]),{ nom:'', rol:'' });
  assert.equal(sotuvMasuli(sotuv,[]),'—');
});
