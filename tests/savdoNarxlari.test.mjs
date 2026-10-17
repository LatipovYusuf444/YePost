import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chakanaSomNarxi,
  chegirmaFoizi,
  chegirmaSummasi,
  narxSotuvValyutasida,
  qatorNarxTuri,
  turNarxi,
  yuboriladiganQator,
} from '../src/lib/savdoNarxlari.ts';

const KURS = 11910;

// Avvalgi (o'zgartirilmagan) chakana narx hisobi: yangi funksiyalar chakana narx uchun aynan shuni berishi shart.
function eskiNarxValyutada(qoldiq, valyuta, kurs) {
  const som = Number(chakanaSomNarxi(qoldiq)) || 0;
  if (valyuta !== 'USD') return som;
  if (qoldiq?.valyuta?.currency === 'USD' && qoldiq.valyuta.asl > 0) return qoldiq.valyuta.asl;
  return kurs > 0 ? Math.round((som / kurs) * 100) / 100 : 0;
}

const SOM = { modificationId: 'a', sellingPrice: 25000, price: 25000, modification: { id: 'a', price: { retailPrice: 25000, wholesalePrice: 22000, costPrice: 15000, sellingPrice: 25000 } } };
const DOLLAR = { modificationId: 'b', sellingPrice: 1191000, price: 1191000, valyuta: { currency: 'USD', asl: 100, kurs: KURS, uzs: 1191000, ulgurjiCurrency: 'USD', ulgurjiAsl: 90, ulgurjiUzs: 1071900 }, modification: { id: 'b', price: { retailPrice: 1191000, wholesalePrice: 1071900, costPrice: 60, costCurrency: 'USD', sellingPrice: 1191000 } } };
const ARALASH = { modificationId: 'c', sellingPrice: 9000, price: 9000, valyuta: { currency: 'UZS', asl: 0, kurs: KURS, uzs: null, ulgurjiCurrency: 'USD', ulgurjiAsl: 0.6, ulgurjiUzs: 7146 }, modification: { id: 'c', price: { retailPrice: 9000, wholesalePrice: 7146, costPrice: 0, sellingPrice: 9000 } } };
const NARXSIZ = { modificationId: 'd', modification: { id: 'd', price: { retailPrice: 0, wholesalePrice: 0, costPrice: 0 } } };

test('chakana narx: avvalgi hisob bilan bir xil (so‘m, dollar, aralash; so‘mli va dollarli sotuvda)', () => {
  for (const qoldiq of [SOM, DOLLAR, ARALASH, NARXSIZ, undefined]) {
    for (const sotuvVal of ['UZS', 'USD']) {
      for (const kurs of [KURS, 0]) {
        const yangi = narxSotuvValyutasida(turNarxi(qoldiq, 'RETAIL', kurs), sotuvVal, kurs);
        assert.equal(yangi, eskiNarxValyutada(qoldiq, sotuvVal, kurs), `${qoldiq?.modificationId} ${sotuvVal} kurs=${kurs}`);
      }
    }
  }
});

test('ulgurji narx: so‘mda, dollarda va yo‘q holat', () => {
  assert.deepEqual(turNarxi(SOM, 'WHOLESALE', KURS), { valyuta: 'UZS', asl: 22000, som: 22000 });
  assert.deepEqual(turNarxi(DOLLAR, 'WHOLESALE', KURS), { valyuta: 'USD', asl: 90, som: 1071900 });
  assert.deepEqual(turNarxi(ARALASH, 'WHOLESALE', KURS), { valyuta: 'USD', asl: 0.6, som: 7146 });
  assert.equal(turNarxi(NARXSIZ, 'WHOLESALE', KURS), null);
  // so'mli sotuv: dollar ulgurji narx so'mdagi qiymatda; dollarli sotuv: dollar narxning o'zi
  assert.equal(narxSotuvValyutasida(turNarxi(DOLLAR, 'WHOLESALE', KURS), 'UZS', KURS), 1071900);
  assert.equal(narxSotuvValyutasida(turNarxi(DOLLAR, 'WHOLESALE', KURS), 'USD', KURS), 90);
  // so'mdagi ulgurji narx dollarli sotuvda kurs bilan o'giriladi, kurs yo'q bo'lsa 0
  assert.equal(narxSotuvValyutasida(turNarxi(SOM, 'WHOLESALE', KURS), 'USD', KURS), Math.round((22000 / KURS) * 100) / 100);
  assert.equal(narxSotuvValyutasida(turNarxi(SOM, 'WHOLESALE', 0), 'USD', 0), 0);
});

test('tannarx: so‘mda, dollarda (kurs bilan) va ko‘rinmasa (kassir) null', () => {
  assert.deepEqual(turNarxi(SOM, 'COST', KURS), { valyuta: 'UZS', asl: 15000, som: 15000 });
  assert.deepEqual(turNarxi(DOLLAR, 'COST', KURS), { valyuta: 'USD', asl: 60, som: 714600 });
  assert.equal(narxSotuvValyutasida(turNarxi(DOLLAR, 'COST', KURS), 'USD', KURS), 60);
  assert.equal(narxSotuvValyutasida(turNarxi(DOLLAR, 'COST', KURS), 'UZS', KURS), 714600);
  assert.equal(turNarxi(ARALASH, 'COST', KURS), null);
  assert.equal(turNarxi(undefined, 'COST', KURS), null);
});

test('qator narx turi: so‘ralgani bor va ruxsat etilgan bo‘lsa shu, aks holda chakana → ulgurji → tannarx', () => {
  const hammasi = () => true;
  assert.equal(qatorNarxTuri(SOM, 'WHOLESALE', hammasi, KURS), 'WHOLESALE');
  assert.equal(qatorNarxTuri(SOM, 'COST', hammasi, KURS), 'COST');
  assert.equal(qatorNarxTuri(ARALASH, 'COST', hammasi, KURS), 'RETAIL');
  // tannarx ruxsat etilmagan (sozlamada o'chiq)
  assert.equal(qatorNarxTuri(SOM, 'COST', (tur) => tur !== 'COST', KURS), 'RETAIL');
  // chakana o'chiq: ulgurjiga o'tadi
  assert.equal(qatorNarxTuri(SOM, 'RETAIL', (tur) => tur === 'WHOLESALE', KURS), 'WHOLESALE');
  assert.equal(qatorNarxTuri(NARXSIZ, 'RETAIL', hammasi, KURS), null);
});

test('chegirma: summada, foizda, chegaralar', () => {
  assert.equal(chegirmaSummasi({ miqdor: 2, narx: 25000, tur: 'sum', summa: 5000, foiz: 0 }), 5000);
  assert.equal(chegirmaSummasi({ miqdor: 2, narx: 25000, tur: 'foiz', summa: 0, foiz: 10 }), 5000);
  assert.equal(chegirmaSummasi({ miqdor: 3, narx: 0.5, tur: 'foiz', summa: 0, foiz: 15 }), 0.23);
  // qator jamidan oshmaydi; foiz 100 dan oshmaydi
  assert.equal(chegirmaSummasi({ miqdor: 1, narx: 1000, tur: 'sum', summa: 5000, foiz: 0 }), 1000);
  assert.equal(chegirmaSummasi({ miqdor: 1, narx: 1000, tur: 'foiz', summa: 0, foiz: 250 }), 1000);
  // manfiy yoki narx/miqdor yo'q
  assert.equal(chegirmaSummasi({ miqdor: 1, narx: 1000, tur: 'sum', summa: -50, foiz: 0 }), 0);
  assert.equal(chegirmaSummasi({ miqdor: 0, narx: 1000, tur: 'foiz', summa: 0, foiz: 10 }), 0);
  assert.equal(chegirmaSummasi({ miqdor: 2, narx: 0, tur: 'sum', summa: 10, foiz: 0 }), 0);
  // foizdan summaga va qaytib
  assert.equal(chegirmaFoizi(2, 25000, 5000), 10);
  assert.equal(chegirmaFoizi(4, 100, 25), 6.25);
  assert.equal(chegirmaFoizi(0, 100, 25), 0);
  assert.equal(chegirmaFoizi(2, 25000, 99999), 100);
});

test('yuboriladigan qator: so‘mli sotuv — narx so‘mda, valyutasiz; foiz kiritilganda discountPercent', () => {
  const q = yuboriladiganQator({ modificationId: 'a', miqdor: 2, tur: 'WHOLESALE', qoldiq: SOM, sotuvVal: 'UZS', kurs: KURS, narx: 22000, chegirma: 4400, chegirmaTuri: 'foiz', foiz: 10 });
  assert.deepEqual(q, { modificationId: 'a', quantity: 2, priceType: 'WHOLESALE', discountPercent: 10, price: 22000, discount: 4400 });
  const summada = yuboriladiganQator({ modificationId: 'a', miqdor: 2, tur: 'RETAIL', qoldiq: SOM, sotuvVal: 'UZS', kurs: KURS, narx: 25000, chegirma: 3000, chegirmaTuri: 'sum', foiz: 0 });
  assert.deepEqual(summada, { modificationId: 'a', quantity: 2, priceType: 'RETAIL', price: 25000, discount: 3000 });
  assert.ok(!('discountPercent' in summada) && !('currency' in summada));
  // foiz rejimida lekin chegirma 0: discountPercent yuborilmaydi
  assert.ok(!('discountPercent' in yuboriladiganQator({ modificationId: 'a', miqdor: 1, tur: 'RETAIL', qoldiq: SOM, sotuvVal: 'UZS', kurs: KURS, narx: 25000, chegirma: 0, chegirmaTuri: 'foiz', foiz: 0 })));
});

test('yuboriladigan qator: dollarli sotuv — mahsulot o‘z valyutasida', () => {
  // dollarda saqlangan mahsulot: dollar narx va dollardagi chegirma
  const dollar = yuboriladiganQator({ modificationId: 'b', miqdor: 1, tur: 'WHOLESALE', qoldiq: DOLLAR, sotuvVal: 'USD', kurs: KURS, narx: 90, chegirma: 9, chegirmaTuri: 'foiz', foiz: 10 });
  assert.deepEqual(dollar, { modificationId: 'b', quantity: 1, priceType: 'WHOLESALE', discountPercent: 10, price: 90, discount: 9, currency: 'USD' });
  // so'mda saqlangan mahsulot: so'm narx, chegirma kurs bilan so'mga
  const som = yuboriladiganQator({ modificationId: 'a', miqdor: 2, tur: 'COST', qoldiq: SOM, sotuvVal: 'USD', kurs: KURS, narx: 1.26, chegirma: 0.5, chegirmaTuri: 'sum', foiz: 0 });
  assert.deepEqual(som, { modificationId: 'a', quantity: 2, priceType: 'COST', price: 15000, discount: 5955, currency: 'UZS' });
});
