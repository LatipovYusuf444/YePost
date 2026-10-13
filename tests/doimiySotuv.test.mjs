import test from 'node:test';
import assert from 'node:assert/strict';
import { doimiySotuvniModalgaTayyorlash } from '../src/Pages/BoshSahifa/doimiySotuv.ts';

const sale={id:'real-sale',status:'DRAFT',customerId:'customer',warehouseId:'warehouse',responsibleId:'cashier',currency:'UZS',totalAmount:'3534000',paidAmount:'0',debtAmount:'3534000',items:[{id:'real-line',modificationId:'item',quantity:5,price:60,currency:'USD',discount:0}]};
const context={mijozlar:[{id:'customer',firstName:'Mirmuhsin',lastName:'Rusatomov'}],omborlar:[{id:'warehouse',name:'Danmi'}],xodimlar:[{id:'cashier',fullName:'Yusuf'}],cart:[{modificationId:'item',nom:'DANMI ATVERKA'}]};

test('created sale opens with known names while preserving real IDs, draft status and backend monetary fields', () => {
  const shown=doimiySotuvniModalgaTayyorlash(sale,context);
  assert.equal(shown.id,'real-sale');
  assert.equal(shown.status,'DRAFT');
  assert.equal(shown.customer.firstName,'Mirmuhsin');
  assert.equal(shown.warehouse.name,'Danmi');
  assert.equal(shown.responsible.fullName,'Yusuf');
  assert.equal(shown.items[0].modification.name,'DANMI ATVERKA');
  for (const field of ['totalAmount','paidAmount','debtAmount','currency']) assert.equal(shown[field],sale[field]);
  for (const field of ['id','modificationId','quantity','price','currency','discount']) assert.equal(shown.items[0][field],sale.items[0][field]);
  assert.equal(sale.items[0].modification,undefined);
});

test('backend-provided names take precedence and unrelated products never fill a missing name', () => {
  const existing={...sale,customer:{id:'customer',name:'Backend name'},items:[{...sale.items[0],modificationId:'other'}]};
  const shown=doimiySotuvniModalgaTayyorlash(existing,context);
  assert.equal(shown.customer.name,'Backend name');
  assert.equal(shown.items[0].modification,undefined);
});
