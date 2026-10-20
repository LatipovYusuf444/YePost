import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bandMahsulotlar,
  chegirmaniOzgartirish,
  kiritishniTozalash,
  mahsulotniAlmashtirish,
  miqdorniOzgartirish,
  narxniOzgartirish,
  ozgarishlarSoni,
  qatorOzgarganmi,
  qatorXatolari,
  qatorlarImzosi,
  qatorlarJami,
  qatorniBoshlash,
  qatorSummasi,
  qoldiqTopish,
  raqamMatni,
  sonniOqish,
  tahrirItemlari,
  tanlanadiganQoldiqlar,
  xatoBormi,
  yangiQatorYaratish,
} from '../src/lib/qoralamaTahriri.ts';

const KURS = 12000;
const HAMMASI = () => true;
const UZS = { sotuvVal: 'UZS', kurs: KURS, turRuxsati: HAMMASI };
const USD = { sotuvVal: 'USD', kurs: KURS, turRuxsati: HAMMASI };

const dona = { unitId: 'dona', kod: null, nomi: 'dona', qisqa: 'dona', kasr: false, koeff: 1, asosiy: true, qabul: true, sotuv: true, chakana: null, ulgurji: null, shtrix: null };
const pochka = { unitId: 'pochka', kod: null, nomi: 'pochka', qisqa: 'pochka', kasr: false, koeff: 50, asosiy: false, qabul: false, sotuv: true, chakana: null, ulgurji: null, shtrix: null };

// Qoldiq (ombor 'w1'): so'mdagi mahsulot, dollarda narxlangan mahsulot, ko'p birlikli mahsulot, narxsiz mahsulot.
const SOM = { modificationId: 'a', warehouseId: 'w1', quantity: 3, sellingPrice: 25000, price: 25000, modification: { id: 'a', price: { retailPrice: 25000, wholesalePrice: 22000, costPrice: 15000, sellingPrice: 25000 } } };
const DOLLAR = { modificationId: 'b', warehouseId: 'w1', quantity: 4, sellingPrice: 1200000, price: 1200000, valyuta: { currency: 'USD', asl: 100, kurs: KURS, uzs: 1200000 }, modification: { id: 'b', price: { retailPrice: 1200000, wholesalePrice: 0, costPrice: 0, sellingPrice: 1200000 } } };
const BIRLIKLI = { modificationId: 'c', warehouseId: 'w1', quantity: 500, sellingPrice: 1000, price: 1000, birliklar: [dona, pochka], modification: { id: 'c', price: { retailPrice: 1000, wholesalePrice: 0, costPrice: 0, sellingPrice: 1000 } } };
const NARXSIZ = { modificationId: 'd', warehouseId: 'w1', quantity: 9, modification: { id: 'd', price: { retailPrice: 0, wholesalePrice: 0, costPrice: 0 } } };

const ITEM_A = { id: 'i1', modificationId: 'a', quantity: 5, price: 25000, discount: 0, priceType: 'RETAIL' };
const ITEM_POCHKA = { id: 'i2', modificationId: 'c', quantity: 100, price: 20, discount: 0, unitId: 'pochka', unitName: 'pochka', unitQuantity: 2, unitPrice: 1000 };
const ITEM_DOLLAR = { id: 'i3', modificationId: 'b', quantity: 2, price: 100, discount: 5, currency: 'USD' };
const ITEM_FOIZLI = { id: 'i4', modificationId: 'a', quantity: 5, price: 25000, discount: 12500, discountPercent: 10, priceType: 'WHOLESALE' };

function boshlash(item, qatorValyutasi = 'UZS', indeks = 0) {
  return qatorniBoshlash(item, indeks, { nom: item.modificationId, qatorValyutasi });
}

test('sonniOqish va kiritishniTozalash: vergul, bo‘shliq va noto‘g‘ri matn', () => {
  assert.equal(sonniOqish('1 500,5'), 1500.5);
  assert.equal(sonniOqish('12.'), 12);
  assert.equal(sonniOqish(''), null);
  assert.equal(sonniOqish('.'), null);
  assert.equal(sonniOqish('abc'), null);
  assert.equal(sonniOqish(5), 5);
  assert.equal(sonniOqish(null), null);
  assert.equal(kiritishniTozalash('12,345', 3), '12.345');
  assert.equal(kiritishniTozalash('1.2.3', 3), '1.23');
  assert.equal(kiritishniTozalash('abc12.3456', 3), '12.345');
  assert.equal(kiritishniTozalash('5.5', 0), '5');
  assert.equal(kiritishniTozalash('-7', 0), '7');
  assert.equal(raqamMatni(2.5), '2.5');
  assert.equal(raqamMatni(1200000), '1200000');
  assert.equal(raqamMatni(0.1 + 0.2), '0.3');
});

test('mavjud qator: o‘zgarmasa o‘zgarish yo‘q va avvalgidek qayta yuboriladi (birlik, valyuta, narx turi, foiz saqlanadi)', () => {
  const qatorlar = [boshlash(ITEM_A), boshlash(ITEM_POCHKA, 'UZS', 1), boshlash(ITEM_DOLLAR, 'USD', 2), boshlash(ITEM_FOIZLI, 'UZS', 3)];
  assert.equal(ozgarishlarSoni(qatorlar), 0);
  for (const q of qatorlar) assert.equal(qatorOzgarganmi(q), false);

  assert.deepEqual(tahrirItemlari(qatorlar, UZS), [
    { modificationId: 'a', quantity: 5, price: 25000, discount: 0, priceType: 'RETAIL' },
    // pochkada kiritilgan qator birlikdagi son va narx bilan yuboriladi (asosiy birlikdagi taqsimlangan narx emas)
    { modificationId: 'c', quantity: 2, price: 1000, discount: 0, unitId: 'pochka' },
    // so'mli sotuvda dollarli qator o'z valyutasi bilan
    { modificationId: 'b', quantity: 2, price: 100, discount: 5, currency: 'USD' },
    { modificationId: 'a', quantity: 5, price: 25000, discount: 12500, priceType: 'WHOLESALE', discountPercent: 10 },
  ]);

  // dollarli sotuvda dollar qator valyuta yubormaydi (sotuv valyutasi), so'mli qator esa 'UZS' bilan
  const dollarSotuv = tahrirItemlari([boshlash(ITEM_DOLLAR, 'USD'), boshlash(ITEM_A, 'UZS', 1)], USD);
  assert.deepEqual(dollarSotuv[0], { modificationId: 'b', quantity: 2, price: 100, discount: 5 });
  assert.deepEqual(dollarSotuv[1], { modificationId: 'a', quantity: 5, price: 25000, discount: 0, currency: 'UZS', priceType: 'RETAIL' });
});

test('sozlamada o‘chirilgan narx turi mavjud qatorda yuborilmaydi', () => {
  const ctx = { ...UZS, turRuxsati: (tur) => tur !== 'RETAIL' };
  assert.deepEqual(tahrirItemlari([boshlash(ITEM_A)], ctx), [{ modificationId: 'a', quantity: 5, price: 25000, discount: 0 }]);
});

test('miqdorni o‘zgartirish: faqat miqdor o‘zgaradi, narx qulflangan, summa qayta hisoblanadi', () => {
  const q = miqdorniOzgartirish(boshlash(ITEM_A), '8');
  assert.equal(qatorOzgarganmi(q), true);
  assert.equal(ozgarishlarSoni([q]), 1);
  assert.equal(qatorSummasi(q), 200000);
  assert.deepEqual(tahrirItemlari([q], UZS), [{ modificationId: 'a', quantity: 8, price: 25000, discount: 0, priceType: 'RETAIL' }]);
  // narx qulflangan: o'zgarmaydi
  assert.equal(narxniOzgartirish(q, '1').narx, '25000');
  // qaytadan asl miqdor yozilsa o'zgarish qolmaydi
  assert.equal(qatorOzgarganmi(miqdorniOzgartirish(q, '5')), false);
  assert.equal(qatorOzgarganmi(miqdorniOzgartirish(q, '5.0')), false);
});

test('foizli chegirma miqdor bilan qayta hisoblanadi, summa qo‘lda yozilsa foiz o‘chadi', () => {
  const q = miqdorniOzgartirish(boshlash(ITEM_FOIZLI), '4');
  assert.equal(q.chegirma, '10000');
  const [qator] = tahrirItemlari([q], UZS);
  assert.equal(qator.discount, 10000);
  assert.equal(qator.discountPercent, 10);

  const qoldan = chegirmaniOzgartirish(q, '7000');
  assert.equal(qoldan.chegirmaFoiz, null);
  const [qoldanQator] = tahrirItemlari([qoldan], UZS);
  assert.equal(qoldanQator.discount, 7000);
  assert.equal('discountPercent' in qoldanQator, false);
});

test('pochkali qator: miqdor pochkada o‘zgaradi, birlik saqlanadi', () => {
  const q = miqdorniOzgartirish(boshlash(ITEM_POCHKA), '3');
  assert.deepEqual(tahrirItemlari([q], UZS), [{ modificationId: 'c', quantity: 3, price: 1000, discount: 0, unitId: 'pochka' }]);
  assert.equal(qatorSummasi(q), 3000);
});

test('mahsulotni almashtirish: so‘mli sotuvda katalog narxi, narx qulflanadi, chegirma tozalanadi', () => {
  const asl = boshlash(ITEM_FOIZLI);
  const q = mahsulotniAlmashtirish(asl, DOLLAR, { nom: 'Dollarli', standartTur: 'RETAIL', ctx: UZS, aslHolati: asl });
  assert.equal(q.modificationId, 'b');
  assert.equal(q.narx, '1200000');
  assert.equal(q.narxQulf, true);
  assert.equal(q.chegirma, '');
  assert.equal(q.chegirmaFoiz, null);
  assert.equal(q.tur, 'RETAIL');
  assert.equal(q.miqdor, '5');
  assert.equal(qatorOzgarganmi(q), true);
  assert.deepEqual(tahrirItemlari([q], UZS), [{ modificationId: 'b', quantity: 5, priceType: 'RETAIL', price: 1200000, discount: 0 }]);
});

test('mahsulotni almashtirish: dollarli sotuvda dollarli mahsulot dollarda, so‘mli mahsulot o‘z valyutasida yuboriladi', () => {
  const aslSom = boshlash(ITEM_A);
  const dollarli = mahsulotniAlmashtirish(aslSom, DOLLAR, { nom: 'D', standartTur: 'RETAIL', ctx: USD, aslHolati: aslSom });
  assert.equal(dollarli.narx, '100');
  assert.deepEqual(tahrirItemlari([dollarli], USD), [{ modificationId: 'b', quantity: 5, priceType: 'RETAIL', price: 100, discount: 0, currency: 'USD' }]);

  const aslDollar = boshlash(ITEM_DOLLAR, 'USD');
  const somli = mahsulotniAlmashtirish(aslDollar, SOM, { nom: 'S', standartTur: 'RETAIL', ctx: USD, aslHolati: aslDollar });
  assert.equal(somli.narx, '2.08');
  assert.equal(somli.valyuta, 'USD');
  assert.deepEqual(tahrirItemlari([somli], USD), [{ modificationId: 'a', quantity: 2, priceType: 'RETAIL', price: 25000, discount: 0, currency: 'UZS' }]);
});

test('asl mahsulot qaytadan tanlansa qator dastlabki holatiga qaytadi', () => {
  const asl = boshlash(ITEM_FOIZLI);
  const almashgan = mahsulotniAlmashtirish(asl, DOLLAR, { nom: 'D', standartTur: 'RETAIL', ctx: UZS, aslHolati: asl });
  const qaytgan = mahsulotniAlmashtirish(almashgan, SOM, { nom: 'S', standartTur: 'RETAIL', ctx: UZS, aslHolati: asl });
  assert.equal(qaytgan.modificationId, 'a');
  assert.equal(qaytgan.chegirma, '12500');
  assert.equal(qaytgan.chegirmaFoiz, 10);
  assert.equal(qatorOzgarganmi(qaytgan), false);
  assert.equal(ozgarishlarSoni([qaytgan]), 0);
});

test('pochkali qator almashtirilsa asosiy birlikka o‘tadi va miqdor 1 bo‘ladi', () => {
  const asl = boshlash(ITEM_POCHKA);
  const q = mahsulotniAlmashtirish(asl, SOM, { nom: 'S', standartTur: 'RETAIL', ctx: UZS, aslHolati: asl });
  assert.equal(q.birlikId, null);
  assert.equal(q.birlikNomi, '');
  assert.equal(q.miqdor, '1');
  const [qator] = tahrirItemlari([q], UZS);
  assert.equal('unitId' in qator, false);
});

test('narx turi: so‘ralgan tur narxi yo‘q bo‘lsa ruxsat etilgan boshqa tur olinadi; narxsiz mahsulotda narx qo‘lda yoziladi', () => {
  const asl = boshlash(ITEM_A);
  const dollarQatori = boshlash(ITEM_DOLLAR, 'USD');
  const ulgurjiOchiq = { ...UZS, turRuxsati: (tur) => tur === 'WHOLESALE' };
  const ulgurji = mahsulotniAlmashtirish(dollarQatori, SOM, { nom: 'S', standartTur: 'RETAIL', ctx: ulgurjiOchiq, aslHolati: dollarQatori });
  assert.equal(ulgurji.tur, 'WHOLESALE');
  assert.equal(ulgurji.narx, '22000');

  const narxsiz = mahsulotniAlmashtirish(asl, NARXSIZ, { nom: 'N', standartTur: 'RETAIL', ctx: UZS, aslHolati: asl });
  assert.equal(narxsiz.narxQulf, false);
  assert.equal(narxsiz.narx, '');
  assert.deepEqual(qatorXatolari(narxsiz, NARXSIZ), { narx: 'kerak' });
  const yozilgan = narxniOzgartirish(narxsiz, '15000');
  assert.deepEqual(qatorXatolari(yozilgan, NARXSIZ), {});
  assert.deepEqual(tahrirItemlari([yozilgan], UZS), [{ modificationId: 'd', quantity: 5, priceType: 'RETAIL', price: 15000, discount: 0 }]);
});

test('kurs yo‘qligi: so‘mli mahsulotni dollarli sotuvga qo‘shib bo‘lmaydi (narx yozilmaydi, "kurs" xatosi)', () => {
  const kursYoq = { sotuvVal: 'USD', kurs: 0, turRuxsati: HAMMASI };
  const asl = boshlash(ITEM_DOLLAR, 'USD');
  const q = mahsulotniAlmashtirish(asl, SOM, { nom: 'S', standartTur: 'RETAIL', ctx: kursYoq, aslHolati: asl });
  assert.equal(q.narx, '');
  assert.equal(q.narxQulf, true);
  assert.deepEqual(qatorXatolari(q, SOM), { narx: 'kurs' });
  // narx qulflangan: qo'lda yozish mumkin emas
  assert.equal(narxniOzgartirish(q, '5').narx, '');
});

test('ombor qoldig‘i: mavjud qator o‘z miqdorini band qilgan, almashtirilgan qator faqat o‘z qoldig‘i bilan', () => {
  // SOM qoldig'i 3 (qoralamadagi 5 ta allaqachon rezerv): jami 8 tagacha ruxsat
  const q = boshlash(ITEM_A);
  assert.deepEqual(qatorXatolari(miqdorniOzgartirish(q, '8'), SOM), {});
  assert.deepEqual(qatorXatolari(miqdorniOzgartirish(q, '9'), SOM), { miqdor: { kod: 'qoldiq', mavjud: 8 } });
  assert.deepEqual(qatorXatolari(miqdorniOzgartirish(q, '2'), SOM), {});

  const almashgan = mahsulotniAlmashtirish(q, DOLLAR, { nom: 'D', standartTur: 'RETAIL', ctx: UZS, aslHolati: q });
  assert.deepEqual(qatorXatolari(almashgan, DOLLAR), { miqdor: { kod: 'qoldiq', mavjud: 4 } });
  assert.deepEqual(qatorXatolari(miqdorniOzgartirish(almashgan, '4'), DOLLAR), {});
  // qoldiq noma'lum bo'lsa tekshirilmaydi (tasdiqlashda backend tekshiradi)
  assert.deepEqual(qatorXatolari(miqdorniOzgartirish(almashgan, '400'), undefined), {});
});

test('miqdor xatolari: nol, bo‘sh, pochkada kasr; pochka qoldig‘i asosiy birlikka o‘giriladi', () => {
  const q = boshlash(ITEM_A);
  assert.deepEqual(qatorXatolari(miqdorniOzgartirish(q, '0'), SOM), { miqdor: { kod: 'nol' } });
  assert.deepEqual(qatorXatolari(miqdorniOzgartirish(q, ''), SOM), { miqdor: { kod: 'nol' } });

  const p = boshlash(ITEM_POCHKA);
  assert.deepEqual(qatorXatolari(miqdorniOzgartirish(p, '2.5'), BIRLIKLI), { miqdor: { kod: 'butunEmas' } });
  // 500 dona qoldiq + qoralamadagi 100 dona = 600 dona = 12 pochka
  assert.deepEqual(qatorXatolari(miqdorniOzgartirish(p, '12'), BIRLIKLI), {});
  assert.deepEqual(qatorXatolari(miqdorniOzgartirish(p, '13'), BIRLIKLI), { miqdor: { kod: 'qoldiq', mavjud: 12 } });
  // eng ko'pi bilan 12.2 pochka chiqsa ham, butun birlikda 12 ko'rsatiladi
  assert.deepEqual(qatorXatolari(miqdorniOzgartirish(p, '13'), { ...BIRLIKLI, quantity: 510 }), { miqdor: { kod: 'qoldiq', mavjud: 12 } });
});

test('chegirma qator jamidan oshmasin; o‘zgarmagan qator tekshirilmaydi; bo‘sh yangi qator mahsulot talab qiladi', () => {
  const q = boshlash(ITEM_A);
  assert.deepEqual(qatorXatolari(chegirmaniOzgartirish(q, '125000'), SOM), {});
  assert.deepEqual(qatorXatolari(chegirmaniOzgartirish(q, '125001'), SOM), { chegirma: true });
  assert.deepEqual(qatorXatolari(q, undefined), {});
  const bosh = yangiQatorYaratish('yangi-1', 'UZS');
  assert.deepEqual(qatorXatolari(bosh, undefined), { mahsulot: true });
  assert.equal(xatoBormi(qatorXatolari(bosh, undefined)), true);
  assert.equal(xatoBormi({}), false);
});

test('o‘chirilgan qator yuborilmaydi va o‘zgarish hisoblanadi; yangi qatorni qo‘shib o‘chirish o‘zgarish emas', () => {
  const a = boshlash(ITEM_A);
  const b = boshlash(ITEM_POCHKA, 'UZS', 1);
  assert.equal(ozgarishlarSoni([a, { ...b, ochirildi: true }]), 1);
  assert.deepEqual(tahrirItemlari([a, { ...b, ochirildi: true }], UZS).map((q) => q.modificationId), ['a']);
  // o'chirilgan qator xatosiz
  assert.deepEqual(qatorXatolari({ ...miqdorniOzgartirish(a, '0'), ochirildi: true }, SOM), {});

  const yangi = yangiQatorYaratish('yangi-1', 'UZS');
  assert.equal(ozgarishlarSoni([a, yangi]), 1);
  assert.equal(ozgarishlarSoni([a, { ...yangi, ochirildi: true }]), 0);
});

test('yangi qator: mahsulot tanlanadi, "Sotuv yaratish" qoidasi bilan yuboriladi', () => {
  const yangi = yangiQatorYaratish('yangi-1', 'UZS');
  const tanlangan = mahsulotniAlmashtirish(yangi, SOM, { nom: 'S', standartTur: 'RETAIL', ctx: UZS });
  const q = miqdorniOzgartirish(tanlangan, '2');
  assert.deepEqual(qatorXatolari(q, SOM), {});
  assert.deepEqual(tahrirItemlari([boshlash(ITEM_A), q], UZS), [
    { modificationId: 'a', quantity: 5, price: 25000, discount: 0, priceType: 'RETAIL' },
    { modificationId: 'a', quantity: 2, priceType: 'RETAIL', price: 25000, discount: 0 },
  ]);
  // chegirma yangi qatorda sotuv valyutasida
  const chegirmali = chegirmaniOzgartirish(q, '1000');
  assert.deepEqual(tahrirItemlari([chegirmali], UZS), [{ modificationId: 'a', quantity: 2, priceType: 'RETAIL', price: 25000, discount: 1000 }]);
});

test('jami: qator valyutalari sotuv valyutasiga o‘giriladi, kurs bo‘lmasa aniq=false', () => {
  const qatorlar = [boshlash(ITEM_A), boshlash(ITEM_DOLLAR, 'USD', 1)];
  const ogirish = (summa, valyuta) => (valyuta === 'USD' ? summa * KURS : summa);
  const jami = qatorlarJami(qatorlar, ogirish);
  assert.equal(jami.jami, 125000 + 195 * KURS);
  assert.equal(jami.chegirma, 5 * KURS);
  assert.equal(jami.chegirmasiz, jami.jami + jami.chegirma);
  assert.equal(jami.aniq, true);

  const kursYoq = qatorlarJami(qatorlar, (summa, valyuta) => (valyuta === 'USD' ? null : summa));
  assert.equal(kursYoq.aniq, false);
  assert.equal(kursYoq.jami, 125000);

  // o'chirilgan qator hisobga olinmaydi
  assert.equal(qatorlarJami([{ ...qatorlar[0], ochirildi: true }], ogirish).jami, 0);
});

test('qoldiq qidirish: shu ombor, keyin katalog yozuvi; boshqa ombor hisobga olinmaydi; ro‘yxatda dublikat yo‘q', () => {
  const katalog = { modificationId: 'a', quantity: 0, modification: { id: 'a' } };
  const boshqaOmbor = { ...SOM, warehouseId: 'w2', quantity: 99 };
  const royxat = [katalog, boshqaOmbor, SOM, DOLLAR];
  assert.equal(qoldiqTopish(royxat, 'a', 'w1'), SOM);
  assert.equal(qoldiqTopish([katalog, boshqaOmbor], 'a', 'w1'), katalog);
  assert.equal(qoldiqTopish([boshqaOmbor], 'a', 'w1'), undefined);
  assert.equal(qoldiqTopish(royxat, 'yo‘q', 'w1'), undefined);

  const tanlash = tanlanadiganQoldiqlar(royxat, 'w1');
  assert.deepEqual(tanlash.map((q) => q.modificationId).sort(), ['a', 'b']);
  assert.equal(tanlash.find((q) => q.modificationId === 'a'), SOM);
  assert.equal(tanlanadiganQoldiqlar([katalog], 'w1')[0], katalog);
});

test('band mahsulotlar: o‘chirilgan va o‘zi hisobga olinmaydi', () => {
  const a = boshlash(ITEM_A);
  const b = boshlash(ITEM_POCHKA, 'UZS', 1);
  assert.deepEqual([...bandMahsulotlar([a, b])].sort(), ['a', 'c']);
  assert.deepEqual([...bandMahsulotlar([a, b], a.kalit)], ['c']);
  assert.deepEqual([...bandMahsulotlar([a, { ...b, ochirildi: true }])], ['a']);
});

test('qatorlar imzosi: ma‘lumot o‘zgarsa o‘zgaradi, bir xil bo‘lsa o‘zgarmaydi', () => {
  const bir = qatorlarImzosi([ITEM_A, ITEM_POCHKA]);
  assert.equal(bir, qatorlarImzosi([{ ...ITEM_A }, { ...ITEM_POCHKA }]));
  assert.notEqual(bir, qatorlarImzosi([{ ...ITEM_A, quantity: 6 }, ITEM_POCHKA]));
  assert.notEqual(bir, qatorlarImzosi([ITEM_A]));
  assert.equal(qatorlarImzosi(undefined), '');
});
