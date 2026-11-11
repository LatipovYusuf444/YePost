import test from 'node:test';
import assert from 'node:assert/strict';
import { narxSotuvValyutasida, turNarxi, yuboriladiganQator } from '../src/lib/savdoNarxlari.ts';

// Valyuta rejimi (backend 11.11.2026): "Faqat dollar" (USD_ONLY) rejimida sotuv qatorlari faqat dollarda yuboriladi,
// ikki valyuta (DUAL) rejimida esa avvalgidek mahsulot o'z valyutasida.

const KURS = 12000;
const SOM = { modificationId: 'a', sellingPrice: 24000, price: 24000, modification: { id: 'a', price: { retailPrice: 24000, sellingPrice: 24000 } } };
// Dollar narxli mahsulot, kurs kiritilmagan: so'mdagi narx yo'q (uzs: null).
const DOLLAR_KURSSIZ = { modificationId: 'b', valyuta: { currency: 'USD', asl: 3.5, kurs: null, uzs: null }, modification: { id: 'b', price: {} } };

const qator = (p) => yuboriladiganQator({ modificationId: p.qoldiq.modificationId, miqdor: 2, tur: 'RETAIL', chegirmaTuri: 'sum', foiz: 0, chegirma: 0, ...p });

test('DUAL: dollarli sotuvda so‘mda narxlangan mahsulot avvalgidek so‘mda (currency: UZS) yuboriladi', () => {
  const q = qator({ qoldiq: SOM, sotuvVal: 'USD', kurs: KURS, narx: 2, chegirma: 0.5 });
  assert.equal(q.currency, 'UZS');
  assert.equal(q.price, 24000);
  assert.equal(q.discount, 6000);
});

test('USD_ONLY: so‘mda narxlangan mahsulot ham ko‘rinib turgan dollar narxida (currency: USD) yuboriladi', () => {
  const q = qator({ qoldiq: SOM, sotuvVal: 'USD', kurs: KURS, narx: 2, chegirma: 0.5, ustama: 0.25, yagonaValyuta: true });
  assert.equal(q.currency, 'USD');
  assert.equal(q.price, 2.25);
  assert.equal(q.discount, 0.5);
});

test('USD_ONLY: dollar narxli mahsulot kurs bo‘lmasa ham o‘z narxida sotiladi', () => {
  const narx = narxSotuvValyutasida(turNarxi(DOLLAR_KURSSIZ, 'RETAIL', 0), 'USD', 0);
  assert.equal(narx, 3.5);
  const q = qator({ qoldiq: DOLLAR_KURSSIZ, sotuvVal: 'USD', kurs: 0, narx, yagonaValyuta: true });
  assert.deepEqual({ price: q.price, currency: q.currency }, { price: 3.5, currency: 'USD' });
});

test('UZS_ONLY: so‘mdagi sotuvda qator valyutasi yuborilmaydi (avvalgidek), bayroq ta’sir qilmaydi', () => {
  const oddiy = qator({ qoldiq: SOM, sotuvVal: 'UZS', kurs: KURS, narx: 24000 });
  const yagona = qator({ qoldiq: SOM, sotuvVal: 'UZS', kurs: KURS, narx: 24000, yagonaValyuta: true });
  assert.deepEqual(yagona, oddiy);
  assert.ok(!('currency' in yagona));
});

// Qoralama joyida tahrirlash va nusxa: bir valyutali rejimda boshqa valyutadagi qoralama (yoki qator) aniqlanadi — so'rov yuborilmaydi.
import { rejimgaMosEmasValyuta } from '../src/lib/qoralamaTahriri.ts';

test('DUAL: qoralama valyutasi tekshirilmaydi (avvalgidek)', () => {
  assert.equal(rejimgaMosEmasValyuta({ currency: 'USD', items: [{ currency: 'UZS' }] }, null), null);
});

test('USD_ONLY: so‘mdagi qoralama va dollar qoralamadagi so‘m qatori aniqlanadi', () => {
  assert.equal(rejimgaMosEmasValyuta({ currency: 'UZS', items: [] }, 'USD'), 'UZS');
  assert.equal(rejimgaMosEmasValyuta({ currency: 'usd', items: [{ currency: 'USD' }, { currency: 'UZS' }] }, 'USD'), 'UZS');
  assert.equal(rejimgaMosEmasValyuta({ currency: 'USD', items: [{}, { currency: 'USD' }] }, 'USD'), null);
});

test('UZS_ONLY: dollar qoralama aniqlanadi, valyutasiz (so‘m) qoralama mos', () => {
  assert.equal(rejimgaMosEmasValyuta({ currency: 'USD', items: [{}] }, 'UZS'), 'USD');
  assert.equal(rejimgaMosEmasValyuta({ items: [{ currency: null }] }, 'UZS'), null);
  assert.equal(rejimgaMosEmasValyuta({ currency: 'UZS', items: [{ currency: 'USD' }] }, 'UZS'), 'USD');
});
