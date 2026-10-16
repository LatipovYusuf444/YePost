import test from 'node:test';
import assert from 'node:assert/strict';
import { hisobotPulMatni, hisobotValyutasiniTekshirish } from '../src/Pages/HisobotUchot/hisobotValyutasi.ts';
import { foydaXarajatniMoslash } from '../src/Pages/HisobotUchot/foydaXarajatModeli.ts';

test('server-calculated UZS returns keep all 586000 so‘m, not rounded USD converted back',()=>{
 const model=foydaXarajatniMoslash({income:{saleRevenue:2018745,returns:586000,total:2018745},cost:{costOfGoods:1757916},expenses:{items:[],refunds:0,total:0},summary:{currency:'UZS',grossProfit:260829,expense:0,netProfit:260829}},'','UZS');
 assert.equal(hisobotPulMatni(model.qaytarilgan,model.valyuta),`${(586000).toLocaleString('uz-UZ')} so'm`);
 assert.equal(hisobotPulMatni(model.jami.sof,model.valyuta),`${(260829).toLocaleString('uz-UZ')} so'm`);
});

test('formatting never applies today’s exchange rate or reinterprets a backend amount',()=>{
 assert.equal(hisobotPulMatni(169.5,'USD'),`$${(169.5).toLocaleString('uz-UZ')}`);
 assert.equal(hisobotPulMatni(12345,'UZS'),`${(12345).toLocaleString('uz-UZ')} so'm`);
 assert.equal(hisobotPulMatni(0.5,'USD'),`$${(0.5).toLocaleString('uz-UZ')}`);
 assert.equal(hisobotPulMatni(-0,'USD'),'$0');
 assert.equal(hisobotPulMatni(-0,'UZS'),"0 so'm");
});

test('localized so‘m suffix is applied to UZS only and never changes the amount',()=>{
 assert.equal(hisobotPulMatni(12345,'UZS','сум'),`${(12345).toLocaleString('uz-UZ')} сум`);
 assert.equal(hisobotPulMatni(169.5,'USD','сум'),`$${(169.5).toLocaleString('uz-UZ')}`);
});

test('missing, unsupported or unexpected currency is rejected rather than guessed',()=>{
 assert.equal(hisobotValyutasiniTekshirish('usd','USD'),'USD');
 assert.throws(()=>hisobotValyutasiniTekshirish(undefined,'UZS'),/valyuta/i);
 assert.throws(()=>hisobotValyutasiniTekshirish('EUR'),/valyuta/i);
 assert.throws(()=>hisobotValyutasiniTekshirish('USD','UZS'),/mos kelmadi/i);
});
