import test from 'node:test';
import assert from 'node:assert/strict';
import { foydaHisobotiniMoslash } from '../src/Pages/HisobotUchot/foydaHisobotiModeli.ts';

const report={items:[
 {productId:'p1',productName:'3,6*200',qtySold:100,revenue:95,cost:82.8,profit:12.2,marginPct:12.84},
 {productId:'p2',productName:'3,6*150',qtySold:100,revenue:74,cost:64.8,profit:9.2,marginPct:12.43},
 {productId:'p3',productName:'3,6*100',qtySold:1,revenue:0.5,cost:0,profit:0.5,marginPct:100},
 {productId:'returned',qtySold:0,revenue:0,cost:0,profit:0,marginPct:0},
]};

test('tagged USD report retains backend amounts without currency conversion',()=>{
 const model=foydaHisobotiniMoslash({...report,currency:'USD'},'USD');
 assert.equal(model.valyuta,'USD');
 assert.equal(model.qatorlar.length,3);
 assert.equal(model.qatorlar.reduce((s,r)=>s+r.tushum,0),169.5);
 assert.ok(Math.abs(model.qatorlar.reduce((s,r)=>s+r.tannarx,0)-147.6)<1e-8);
 assert.ok(Math.abs(model.qatorlar.reduce((s,r)=>s+r.foyda,0)-21.9)<1e-8);
 assert.equal(model.qatorlar[0].tushum,95);
 assert.equal(model.qatorlar[0].tushum*11910,1131450);
 assert.equal(169.5*11910,2018745);
});

test('currency is read from the response including enveloped reports',()=>{
 assert.equal(foydaHisobotiniMoslash({success:true,data:{...report,summary:{currency:'UZS'}}},'UZS').valyuta,'UZS');
 assert.equal(foydaHisobotiniMoslash({...report,currency:'USD'}).valyuta,'USD');
});

test('missing or unsupported currency cannot silently create a misleading money label',()=>{
 assert.throws(()=>foydaHisobotiniMoslash(report),/valyuta/i);
 assert.throws(()=>foydaHisobotiniMoslash({...report,currency:'EUR'}),/valyuta/i);
 assert.throws(()=>foydaHisobotiniMoslash({...report,currency:'USD'},'UZS'),/valyuta/i);
});

test('zero historical cost stays zero and malformed or mixed monetary data is rejected',()=>{
 assert.equal(foydaHisobotiniMoslash({...report,currency:'USD'}).qatorlar[2].tannarx,0);
 assert.throws(()=>foydaHisobotiniMoslash({items:[{...report.items[0],revenue:'invalid'}],currency:'USD'}),/son|summa/i);
 assert.throws(()=>foydaHisobotiniMoslash({items:[{...report.items[0],currency:'UZS'}],currency:'USD'}),/valyuta/i);
});

test('server-calculated UZS values and historical-rate margins stay unchanged',()=>{
 const model=foydaHisobotiniMoslash({currency:'UZS',items:[{productId:'historical',qtySold:1,revenue:12345,cost:10000,profit:2345,marginPct:19}]},'UZS');
 assert.equal(model.qatorlar[0].tushum,12345);
 assert.equal(model.qatorlar[0].foyda,2345);
});
