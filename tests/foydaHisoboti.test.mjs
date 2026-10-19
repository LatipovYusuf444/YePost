import test from 'node:test';
import assert from 'node:assert/strict';
import { engKopFoyda, foydaHisobotiniMoslash, foydaJami, foydaniSaralash, zararliQatorlar } from '../src/Pages/HisobotUchot/foydaHisobotiModeli.ts';

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

const qator=(id,nomi,sotilgan,tushum,tannarx)=>({id,nomi,sotilgan,tushum,tannarx,foyda:tushum-tannarx,rentabellik:tushum?(tushum-tannarx)/tushum*100:0});
const royxat=[qator('a','B mahsulot',10,1000,800),qator('b','A mahsulot',5,500,520),qator('c','C mahsulot',20,3000,2000),qator('d','D mahsulot',1,100,100)];

test('eng ko‘p foyda: faqat foydali qatorlar, kamayish tartibida, soni cheklangan',()=>{
 assert.deepEqual(engKopFoyda(royxat).map(q=>q.id),['c','a']);
 assert.deepEqual(engKopFoyda(royxat,1).map(q=>q.id),['c']);
 assert.deepEqual(engKopFoyda([]),[]);
});

test('zarar bilan sotilganlar: faqat foydasi manfiy, eng katta zarar birinchi',()=>{
 assert.deepEqual(zararliQatorlar(royxat).map(q=>q.id),['b']);
 assert.deepEqual(zararliQatorlar([qator('x','X',1,10,15),qator('y','Y',1,10,30)]).map(q=>q.id),['y','x']);
});

test('saralash: asl ro‘yxat o‘zgarmaydi; nom bo‘yicha harf tartibi, son bo‘yicha o‘sish/kamayish',()=>{
 const asl=royxat.map(q=>q.id).join('');
 assert.deepEqual(foydaniSaralash(royxat,'foyda',true).map(q=>q.id),['c','a','d','b']);
 assert.deepEqual(foydaniSaralash(royxat,'foyda',false).map(q=>q.id),['b','d','a','c']);
 assert.deepEqual(foydaniSaralash(royxat,'nomi',false).map(q=>q.id),['b','a','c','d'].sort((x,y)=>royxat.find(q=>q.id===x).nomi.localeCompare(royxat.find(q=>q.id===y).nomi)));
 assert.equal(royxat.map(q=>q.id).join(''),asl);
});

test('jami: yig‘indi va rentabellik tushumga nisbatan; bo‘sh ro‘yxatda 0',()=>{
 const j=foydaJami(royxat);
 assert.equal(j.sotilgan,36); assert.equal(j.tushum,4600); assert.equal(j.tannarx,3420); assert.equal(j.foyda,1180);
 assert.ok(Math.abs(j.rentabellik-1180/4600*100)<1e-9);
 assert.deepEqual(foydaJami([]),{sotilgan:0,tushum:0,tannarx:0,foyda:0,rentabellik:0});
});

test('mijozlar kesimi: guruh nomi, nomi bo‘lmagan guruh — donalik mijoz',()=>{
 const m=foydaHisobotiniMoslash({currency:'UZS',items:[{groupKey:'c1',groupName:'Ali',qtySold:3,revenue:300,cost:200,profit:100},{groupKey:null,qtySold:1,revenue:50,cost:40,profit:10}]},'UZS','CUSTOMER');
 assert.deepEqual(m.qatorlar.map(q=>q.nomi),['Ali','Donalik mijoz']);
 assert.equal(foydaHisobotiniMoslash({currency:'UZS',items:[{qtySold:1,revenue:5,cost:4,profit:1}]},'UZS').qatorlar[0].nomi,'Mahsulot');
});
