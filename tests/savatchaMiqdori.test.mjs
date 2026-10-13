import test from 'node:test';
import assert from 'node:assert/strict';
import { savatchaMiqdoriniOqish } from '../src/Pages/BoshSahifa/savatchaMiqdori.ts';
import { tanlashQoldigi } from '../src/Components/layout/posMahsulotlari.ts';
globalThis.window = {localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}}};
const { usePosStore, savatchaSotuvNarxi, savatchaChegirma } = await import('../src/store/posStore.ts');
const product = { id:'item::warehouse',modificationId:'item',nom:'Mahsulot',narx:5955,chakanaNarx:5955,ulgurjiNarx:5800,qoldiq:100,warehouseId:'warehouse' };
function prepare(qoldiq = 100) {
  usePosStore.setState({cart:[],narxTuri:'chakana'});
  usePosStore.getState().addToCart({...product,qoldiq});
}

test('manual quantity changes update the actual cart and line/discount totals', () => {
  prepare();
  usePosStore.getState().setSotuvNarxi(product.id,5900);
  usePosStore.getState().updateQuantity(product.id,25);
  const item = usePosStore.getState().cart[0];
  assert.equal(item.soni,25);
  assert.equal(item.narx * item.soni,148875);
  assert.equal(savatchaSotuvNarxi(item) * item.soni,147500);
  assert.equal(savatchaChegirma(item),1375);
});

test('manual quantities are capped at this warehouse stock and preserve fractional stock', () => {
  prepare(3.5);
  usePosStore.getState().updateQuantity(product.id,200000);
  assert.equal(usePosStore.getState().cart[0].soni,3.5);
  usePosStore.getState().updateQuantity(product.id,1.25);
  assert.equal(usePosStore.getState().cart[0].soni,1.25);
});

test('invalid quantity cannot remove or corrupt a valid cart line', () => {
  prepare();
  for (const quantity of [NaN,Infinity,-Infinity]) {
    usePosStore.getState().updateQuantity(product.id,quantity);
    assert.equal(usePosStore.getState().cart[0]?.soni,1);
  }
});

test('zero or unknown stock never permits unlimited additions or updates', () => {
  for (const qoldiq of [0,NaN,Infinity]) {
    prepare(qoldiq);
    assert.equal(usePosStore.getState().cart.length,0);
    usePosStore.setState({cart:[{...product,qoldiq,soni:1}]});
    usePosStore.getState().updateQuantity(product.id,10);
    assert.equal(usePosStore.getState().cart.length,0);
  }
});

test('adding an existing product and +/- controls obey the same stock bound', () => {
  prepare(5);
  usePosStore.getState().addToCart({...product,qoldiq:5},20);
  assert.equal(usePosStore.getState().cart[0].soni,5);
  usePosStore.getState().updateQuantity(product.id,6);
  assert.equal(usePosStore.getState().cart[0].soni,5);
  usePosStore.getState().updateQuantity(product.id,0);
  assert.equal(usePosStore.getState().cart.length,0);
});

test('typed input accepts comma fractions, caps pasted quantities and leaves incomplete edits uncommitted', () => {
  assert.deepEqual(savatchaMiqdoriniOqish('1,25',100),{matn:'1,25',soni:1.25});
  assert.deepEqual(savatchaMiqdoriniOqish('999999',100),{matn:'100',soni:100});
  assert.deepEqual(savatchaMiqdoriniOqish('9'.repeat(400),100),{matn:'100',soni:100});
  for (const value of ['', '0', '0,', '.']) assert.equal(savatchaMiqdoriniOqish(value,100).soni,undefined);
  for (const value of ['-5', 'abc', '1.2.3', 'NaN']) assert.equal(savatchaMiqdoriniOqish(value,100),null);
  assert.equal(savatchaMiqdoriniOqish('10',0),null);
  prepare();
  const typed = savatchaMiqdoriniOqish('25',100);
  usePosStore.getState().updateQuantity(product.id,typed.soni);
  assert.equal(usePosStore.getState().cart[0].narx * usePosStore.getState().cart[0].soni,148875);
});

test('picker input accepts zero to deselect without changing the cart input empty-edit behavior', () => {
  assert.deepEqual(savatchaMiqdoriniOqish('0',100,true),{matn:'0',soni:0});
  assert.equal(savatchaMiqdoriniOqish('',100,true).soni,undefined);
  assert.equal(savatchaMiqdoriniOqish('0',100).soni,undefined);
});

test('picker caps the additional amount at remaining stock for the same warehouse', () => {
  const stock={modificationId:'item',quantity:100};
  const cart=[{id:'item::warehouse',soni:20},{id:'item::other',soni:50}];
  assert.equal(tanlashQoldigi(stock,'warehouse',cart),80);
  const selected=savatchaMiqdoriniOqish('1000',tanlashQoldigi(stock,'warehouse',cart),true).soni;
  assert.equal(selected,80);
  assert.equal(selected*5955,476400);
  assert.equal(tanlashQoldigi(stock,'third',cart),100);
  assert.equal(tanlashQoldigi({...stock,quantity:10},'warehouse',cart),0);
});
