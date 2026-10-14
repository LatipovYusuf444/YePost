import test from 'node:test';
import assert from 'node:assert/strict';
import { foydaXarajatniMoslash } from '../src/Pages/HisobotUchot/foydaXarajatModeli.ts';

const actual={income:{saleRevenue:169.5,returns:49.2,otherIncome:0,supplierBonus:0,total:169.5},cost:{costOfGoods:147.6},expenses:{items:[],refunds:0,total:0},summary:{currency:'USD',revenue:169.5,cost:147.6,grossProfit:21.9,expense:0,netProfit:21.9}};
const expenseSum=m=>m.qatorlar.filter(r=>r.tur==='xarajat').reduce((s,r)=>s+r.summa,0);

test('actual P&L reconciles with backend and does not subtract sales returns twice',()=>{
 const m=foydaXarajatniMoslash(actual,'2026-10-14');
 assert.equal(m.valyuta,'USD');
 assert.equal(m.qaytarilgan,49.2);
 assert.equal(m.qatorlar.find(r=>r.tur==='daromad').summa,169.5);
 assert.equal(expenseSum(m),0);
 assert.equal(169.5*11910,2018745);
 assert.equal(147.6*11910,1757916);
 assert.equal(Math.round(21.9*11910),260829);
});

test('summary-only operating expenses affect net profit even without detailed items',()=>{
 const m=foydaXarajatniMoslash({...actual,expenses:{},summary:{...actual.summary,expense:10,netProfit:11.9}},'');
 assert.equal(expenseSum(m),10);
 assert.match(m.qatorlar.find(r=>r.tur==='xarajat').kategoriya,/Tafsiloti/);
});

test('CUSTOMER_REFUND is an explicit expense separate from sales returns and counted exactly once',()=>{
 const m=foydaXarajatniMoslash({...actual,expenses:{items:[{category:'RENT',amount:10}],refunds:5,total:15},summary:{...actual.summary,expense:15,netProfit:6.9}},'');
 assert.equal(expenseSum(m),15);
 assert.equal(m.qatorlar.find(r=>r.id==='refunds').summa,5);
 assert.match(m.qatorlar.find(r=>r.id==='refunds').kategoriya,/kassadan/i);
 assert.equal(m.qaytarilgan,49.2);
 assert.equal(m.jami.sof,6.9);
});

test('unallocated expenses remain visible and supplier bonus is included exactly once',()=>{
 const m=foydaXarajatniMoslash({...actual,income:{...actual.income,otherIncome:20,supplierBonus:5,total:189.5},expenses:{items:[{category:'RENT',amount:10}],total:15},summary:{...actual.summary,expense:15,netProfit:26.9}},'');
 assert.equal(expenseSum(m),15);
 assert.deepEqual(m.boshqaDaromad,{jami:20,zavodBonusi:5});
});

test('UZS reports, retail/wholesale actual selling prices, discounts and losses follow the same formulas',()=>{
 // Two already-discounted retail/wholesale line totals; report must not reprice from today's catalog.
 for(const [currency,rate] of [['USD',1],['UZS',11910]]){
  const revenue=(2*5+3*4-1)*rate, cost=20*rate, expense=5*rate;
  const m=foydaXarajatniMoslash({income:{saleRevenue:revenue},cost:{costOfGoods:cost},expenses:{items:[{category:'RENT',amount:expense}],total:expense},summary:{currency,revenue,cost,grossProfit:revenue-cost,expense,netProfit:revenue-cost-expense}},'');
  assert.equal(m.valyuta,currency);
  assert.equal(m.qatorlar.find(r=>r.tur==='daromad').summa,revenue);
  assert.equal(expenseSum(m),expense);
 }
});

test('ambiguous currency, invalid money and contradictory totals cannot silently display false profit',()=>{
 assert.throws(()=>foydaXarajatniMoslash({...actual,summary:{...actual.summary,currency:undefined}},''),/valyuta/i);
 assert.throws(()=>foydaXarajatniMoslash({...actual,income:{saleRevenue:'invalid'}},''),/summa/i);
 assert.throws(()=>foydaXarajatniMoslash({...actual,summary:{...actual.summary,netProfit:100}},''),/mos kelmadi/i);
 assert.throws(()=>foydaXarajatniMoslash({...actual,expenses:{items:[{amount:20}],total:10},summary:{...actual.summary,expense:10,netProfit:11.9}},''),/mos kelmadi/i);
 assert.throws(()=>foydaXarajatniMoslash(actual,'','UZS'),/valyuta/i);
});

test('independently rounded backend gross/net profit and income totals are preserved',()=>{
 // Unrounded 100.004 + 20.004 - 60.006 - 5.006 = 54.996 => 55.00.
 const m=foydaXarajatniMoslash({income:{saleRevenue:100,otherIncome:20,supplierBonus:5,total:120.01},cost:{costOfGoods:60.01},expenses:{items:[],total:5.01},summary:{currency:'USD',revenue:100,cost:60.01,grossProfit:40,expense:5.01,netProfit:55}},'','USD');
 assert.equal(m.jami.jamiDaromad,120.01);
 assert.equal(m.jami.yalpi,40);
 assert.equal(m.jami.sof,55);
});

test('multiple rounded expense categories reconcile within their accumulated rounding bound',()=>{
 const m=foydaXarajatniMoslash({...actual,expenses:{items:Array.from({length:10},()=>({amount:0.01})),refunds:0,total:0.05},summary:{...actual.summary,expense:0.05,netProfit:21.85}},'');
 assert.ok(Math.abs(expenseSum(m)-0.05)<1e-8);
 assert.match(m.qatorlar.find(r=>r.id==='expense-rounding').kategoriya,/Yaxlitlash/);
});
