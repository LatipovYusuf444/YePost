import test from 'node:test';
import assert from 'node:assert/strict';
import { qoldiqBirlashtirish, qoldiqNarxi, dollarMalumoti } from '../src/Components/layout/posMahsulotlari.ts';
import { katalogNarxiniQoldiqqaMoslash, narxValyutasiniAniqlash } from '../src/api/catalogSearch.ts';
import { sotuvQatori } from '../src/Pages/BoshSahifa/aralashTolov.ts';
globalThis.window = { localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } };
const { savatchaSotuvNarxi, savatchaChegirma, savatchaUstama } = await import('../src/store/posStore.ts');

const item = (sotuvNarxi, soni = 1) => ({ narx: 13500, sotuvNarxi, soni });

test('sotuv narxi katalogdan baland bo‘lishi mumkin: ustama hisoblanadi, chegirma 0', () => {
  assert.equal(savatchaSotuvNarxi(item(19000)), 19000);
  assert.equal(savatchaUstama(item(19000)), 5500);
  assert.equal(savatchaChegirma(item(19000)), 0);
  assert.equal(savatchaUstama(item(19000, 3)), 16500);
});

test('sotuv narxi katalogdan past bo‘lsa avvalgidek chegirma, ustama 0', () => {
  assert.equal(savatchaSotuvNarxi(item(12000)), 12000);
  assert.equal(savatchaChegirma(item(12000, 2)), 3000);
  assert.equal(savatchaUstama(item(12000, 2)), 0);
});

test('kiritilmagan yoki noto‘g‘ri narx katalog narxiga qaytadi (chegirma ham, ustama ham yo‘q)', () => {
  for (const narx of [undefined, 0, -5, NaN, Infinity]) {
    assert.equal(savatchaSotuvNarxi(item(narx)), 13500, String(narx));
    assert.equal(savatchaChegirma(item(narx)), 0);
    assert.equal(savatchaUstama(item(narx)), 0);
  }
  assert.equal(savatchaUstama(item(13500)), 0);
});

test('katalogdan qimmat qator so‘mda ketadi: dollar ma‘lumotisiz, qo‘lda narx va narx turi bilan', () => {
  const qator = sotuvQatori({ modificationId: 'm', quantity: 2, price: 19000, discount: 0, dollar: null, priceType: 'RETAIL' });
  assert.deepEqual(qator, { modificationId: 'm', quantity: 2, price: 19000, discount: 0, priceType: 'RETAIL' });
});

// ---- Ulgurji narx dollarda: backend valyutani yubormagan bo'lsa ham so'mdagi qiymatdan aniqlanadi.
// Ombor hisobotidagi qator: narxlar o'z valyutasida xom holda (ulgurji narx dollarda bo'lsa 1.19).
function omborQatori(ulgurji) {
  return {
    modificationId: 'm', warehouseId: 'w', quantity: 10, narxAniq: false, sellingPrice: 13500, price: 13500,
    modification: { id: 'm', name: '250', product: { id: 'p', name: '3,6' }, price: { retailPrice: 13500, wholesalePrice: ulgurji, sellingPrice: 13500 } },
  };
}
function birlashgan(narx) {
  const stock = omborQatori(narx.wholesalePrice);
  const { modificationPrice, ...q } = katalogNarxiniQoldiqqaMoslash(narx);
  const katalog = { modificationId: 'm', productId: 'p', quantity: 0, ...q, modification: { id: 'm', name: '250', product: { id: 'p', name: '3,6' }, price: modificationPrice } };
  return qoldiqBirlashtirish([stock], [katalog])[0];
}

test('wholesaleCurrency yuborilmagan, lekin kurs va wholesalePriceUzs bor: ulgurji so‘mda 14 173 (1.19 emas)', () => {
  const bir = birlashgan({ retailPrice: 13500, wholesalePrice: 1.19, rate: 11910, retailPriceUzs: 13500, wholesalePriceUzs: 14173 });
  assert.equal(qoldiqNarxi(bir, 'chakana'), 13500);
  assert.equal(qoldiqNarxi(bir, 'ulgurji'), 14173);
  // qator dollarda yuboriladi: asl dollar narx va kurs saqlanadi
  assert.deepEqual(dollarMalumoti(bir), { valyuta: 'USD', aslNarx: 0, aslUlgurjiNarx: 1.19, kurs: 11910 });
});

test('valyuta to‘liq yuborilgan bo‘lsa natija o‘zgarmaydi; so‘mdagi ulgurji narx dollar deb olinmaydi', () => {
  const toliq = birlashgan({ retailPrice: 13500, wholesalePrice: 1.19, retailCurrency: 'UZS', wholesaleCurrency: 'USD', rate: 11910, retailPriceUzs: 13500, wholesalePriceUzs: 14173 });
  assert.equal(qoldiqNarxi(toliq, 'ulgurji'), 14173);
  const som = birlashgan({ retailPrice: 13500, wholesalePrice: 12000, rate: 11910, retailPriceUzs: 13500, wholesalePriceUzs: 12000 });
  assert.equal(qoldiqNarxi(som, 'ulgurji'), 12000);
  assert.deepEqual(dollarMalumoti(som), {});
});

test('valyutani aniqlash: faqat so‘mdagi qiymat narx × kursga mos kelganda dollar', () => {
  assert.equal(narxValyutasiniAniqlash(1.19, 14173, 11910, 'UZS'), 'USD');
  assert.equal(narxValyutasiniAniqlash(100, 1191000, 11910, 'UZS'), 'USD');
  // so'mdagi narx: …Uzs narxning o'ziga teng
  assert.equal(narxValyutasiniAniqlash(13500, 13500, 11910, 'UZS'), 'UZS');
  // kurs yoki so'mdagi qiymat yo'q — aniqlab bo'lmaydi
  assert.equal(narxValyutasiniAniqlash(1.19, null, 11910, 'UZS'), 'UZS');
  assert.equal(narxValyutasiniAniqlash(1.19, 14173, null, 'UZS'), 'UZS');
  // mos kelmaydigan qiymat
  assert.equal(narxValyutasiniAniqlash(5000, 9000, 11910, 'UZS'), 'UZS');
  // backend aniq USD desa o'zgarmaydi
  assert.equal(narxValyutasiniAniqlash(1.19, null, null, 'USD'), 'USD');
});
