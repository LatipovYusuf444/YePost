import test from 'node:test';
import assert from 'node:assert/strict';
import { engKopFoyda, foydaHisobotiniMoslash, foydaJami, foydaJamiIkkiValyuta, foydaniSaralash, panelRoyxati, valyutaJufti, zararliQatorlar } from '../src/Pages/HisobotUchot/foydaHisobotiModeli.ts';

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

const qator=(id,nomi,sotilgan,tushum,tannarx)=>({id,nomi,sotilgan,tushum,tannarx,foyda:tushum-tannarx,rentabellik:tushum?(tushum-tannarx)/tushum*100:0,zarar:tushum-tannarx<0,uzs:{tushum,tannarx,foyda:tushum-tannarx},usd:null});
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

const ikki={currency:'UZS',summary:{qtySold:70,revenueUzs:845000,revenueUsd:66.85,costUzs:644640,costUsd:51,profitUzs:200360,profitUsd:15.85,marginPct:23.71,checks:1,avgRate:12640},
 topProfit:[{productId:'p1',productName:'4,2*300',profitUzs:209120,profitUsd:16.54}],
 lossItems:[{productId:'p2',productName:'4,5*50',profitUzs:-8760,profitUsd:-0.69}],
 items:[
  {productId:'p1',productName:'4,2*300',qtySold:50,revenue:700000,cost:490880,profit:209120,revenueUzs:700000,revenueUsd:55.37,costUzs:490880,costUsd:38.83,profitUzs:209120,profitUsd:16.54,marginPct:29.87,isLoss:false,checks:1,unitCostUsd:0.7766},
  {productId:'p2',productName:'4,5*50',qtySold:20,revenue:145000,cost:153760,profit:-8760,revenueUzs:145000,revenueUsd:11.48,costUzs:153760,costUsd:12.17,profitUzs:-8760,profitUsd:-0.69,marginPct:-6.04,isLoss:true,checks:1,unitCostUsd:0.6085}]};

test('ikki valyutali javob: qatorlar, backend xulosasi, eng ko‘p foyda va zarar ro‘yxatlari',()=>{
 const m=foydaHisobotiniMoslash(ikki,'UZS');
 assert.deepEqual(m.qatorlar[0].uzs,{tushum:700000,tannarx:490880,foyda:209120});
 assert.deepEqual(m.qatorlar[0].usd,{tushum:55.37,tannarx:38.83,foyda:16.54});
 assert.equal(m.qatorlar[0].birDonaTannarxUsd,0.7766); assert.equal(m.qatorlar[0].cheklar,1);
 assert.equal(m.qatorlar[1].zarar,true); assert.equal(m.qatorlar[0].zarar,false);
 assert.equal(m.xulosa.uzs.foyda,200360); assert.equal(m.xulosa.usd.foyda,15.85); assert.equal(m.xulosa.ortachaKurs,12640); assert.equal(m.xulosa.rentabellik,23.71);
 assert.deepEqual(m.eng,[{id:'p1',nomi:'4,2*300',foydaUzs:209120,foydaUsd:16.54}]);
 assert.equal(m.zarar[0].foydaUzs,-8760);
});

test('kurs bo‘lmasa dollar maydonlari null: qator ham, xulosa ham so‘mda qoladi',()=>{
 const yoq={...ikki,summary:{...ikki.summary,revenueUsd:null,costUsd:null,profitUsd:null,avgRate:null},items:ikki.items.map(i=>({...i,revenueUsd:null,costUsd:null,profitUsd:null,unitCostUsd:null}))};
 const m=foydaHisobotiniMoslash(yoq,'UZS');
 assert.equal(m.qatorlar[0].usd,null); assert.equal(m.qatorlar[0].birDonaTannarxUsd,null);
 assert.equal(m.xulosa.usd,null); assert.equal(m.xulosa.ortachaKurs,null);
 assert.deepEqual(valyutaJufti(700000,null,'USD'),{asosiy:{summa:700000,valyuta:'UZS'},qoshimcha:null});
});

test('eski javob (faqat revenue/cost/profit): xulosa va ro‘yxatlar yo‘q, qatorda faqat hisobot valyutasi',()=>{
 const m=foydaHisobotiniMoslash({currency:'USD',items:[{productId:'a',productName:'A',qtySold:1,revenue:10,cost:6,profit:4}]},'USD');
 assert.equal(m.xulosa,null); assert.equal(m.eng,null); assert.equal(m.zarar,null);
 assert.equal(m.qatorlar[0].uzs,null); assert.deepEqual(m.qatorlar[0].usd,{tushum:10,tannarx:6,foyda:4});
 assert.equal(m.qatorlar[0].zarar,false);
});

test('hisobot valyutasi USD: eski maydonlar bo‘lmasa ham asosiy summa dollardagi qiymat',()=>{
 const m=foydaHisobotiniMoslash({currency:'USD',items:[{productId:'a',productName:'A',qtySold:1,revenueUzs:120000,revenueUsd:10,costUzs:72000,costUsd:6,profitUzs:48000,profitUsd:4}]},'USD');
 assert.equal(m.qatorlar[0].tushum,10); assert.equal(m.qatorlar[0].foyda,4);
 assert.deepEqual(valyutaJufti(120000,10,'USD'),{asosiy:{summa:10,valyuta:'USD'},qoshimcha:{summa:120000,valyuta:'UZS'}});
 assert.deepEqual(valyutaJufti(120000,10,'UZS'),{asosiy:{summa:120000,valyuta:'UZS'},qoshimcha:{summa:10,valyuta:'USD'}});
});

test('panel ro‘yxati: backend ro‘yxati bor bo‘lsa shu, bo‘lmasa qatorlardan; ikki valyutada jami',()=>{
 const server=[{id:'x',nomi:'X',foydaUzs:5,foydaUsd:null}];
 assert.equal(panelRoyxati(server,royxat),server);
 assert.equal(panelRoyxati(null,royxat)[0].nomi,'B mahsulot');
 const j=foydaJamiIkkiValyuta(foydaHisobotiniMoslash(ikki,'UZS').qatorlar);
 assert.equal(j.uzs.foyda,200360); assert.ok(Math.abs(j.usd.foyda-15.85)<1e-9);
 assert.equal(foydaJamiIkkiValyuta(royxat).usd,null);
 assert.equal(foydaJamiIkkiValyuta([]).uzs,null);
});
