// Inventarizatsiyada korobkada sanash (backend 19.11): qator actualQuantity o'rniga { closedUnitId, closedQuantity, openQuantity }.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  korobkaBirliklari, korobkaJamiMatni, korobkaKorinishi, korobkaNatijasi, korobkagaAjratish, korobkaSoroviQatori, qoralamaQatorlari, saqlanganKorobka,
} from '../src/lib/inventarizatsiyaKorobka.ts';
import { inventarizatsiyaTahrirSorovi } from '../src/lib/inventarizatsiyaTahriri.ts';

const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8');
const KOROBKA = { unitId: 'u-box', nomi: 'Korobka', koeff: 12 };

test('jami backend formulasi bilan: round(yopiq × koeff, 3) + ochiq', () => {
  assert.deepEqual(korobkaNatijasi({ unitId: 'u-box', yopiq: '5', ochiq: '3' }, 12), { holat: 'tayyor', yopiq: 5, ochiq: 3, jami: 63 });
  assert.deepEqual(korobkaNatijasi({ unitId: 'u', yopiq: '12', ochiq: '7.4' }, 5), { holat: 'tayyor', yopiq: 12, ochiq: 7.4, jami: 67.4 });
  assert.equal(korobkaNatijasi({ unitId: 'u', yopiq: '5', ochiq: '' }, 12).jami, 60);
  assert.equal(korobkaNatijasi({ unitId: 'u', yopiq: '', ochiq: '4' }, 12).jami, 4);
  assert.equal(korobkaNatijasi({ unitId: 'u', yopiq: '0', ochiq: '' }, 12).jami, 0);
  assert.equal(korobkaNatijasi({ unitId: 'u', yopiq: '', ochiq: '' }, 12).holat, 'bosh');
  for (const yomon of [{ yopiq: '-1', ochiq: '' }, { yopiq: 'abc', ochiq: '' }, { yopiq: '1.2345', ochiq: '' }, { yopiq: '1', ochiq: '-2' }]) {
    assert.equal(korobkaNatijasi({ unitId: 'u', ...yomon }, 12).holat, 'xato', JSON.stringify(yomon));
  }
  assert.equal(korobkaJamiMatni({ unitId: 'u', yopiq: '5', ochiq: '3' }, 12), '63');
  assert.equal(korobkaJamiMatni({ unitId: 'u', yopiq: '', ochiq: '' }, 12), '');
  // Noto'g'ri sanoq "Miqdor" ga "x" bo'lib tushadi — sanoq xulosasi uni noto'g'ri deb ko'radi (Number("x") NaN).
  assert.ok(Number.isNaN(Number(korobkaJamiMatni({ unitId: 'u', yopiq: '-1', ochiq: '' }, 12))));
});

test('so\'rov qatori: korobka maydonlari backend nomlari bilan; noto\'g\'ri sanoq — null', () => {
  assert.deepEqual(korobkaSoroviQatori('m1', { unitId: 'u-box', yopiq: '5', ochiq: '3' }, 12), { modificationId: 'm1', closedUnitId: 'u-box', closedQuantity: 5, openQuantity: 3 });
  assert.deepEqual(korobkaSoroviQatori('m1', { unitId: 'u-box', yopiq: '5', ochiq: '' }, 12), { modificationId: 'm1', closedUnitId: 'u-box', closedQuantity: 5, openQuantity: 0 });
  assert.equal(korobkaSoroviQatori('m1', { unitId: 'u-box', yopiq: '', ochiq: '' }, 12), null);
  assert.equal(korobkaSoroviQatori('m1', { unitId: 'u-box', yopiq: '-1', ochiq: '' }, 12), null);
  assert.equal(korobkaSoroviQatori('m1', undefined, 12), null);
  assert.equal(korobkaSoroviQatori('m1', { unitId: '', yopiq: '1', ochiq: '' }, 12), null);
});

test('asosiy birlik kasr emas (dona): jami butun bo\'lishi shart (backend QUANTITY_NOT_WHOLE)', () => {
  assert.deepEqual(korobkaNatijasi({ unitId: 'u', yopiq: '2', ochiq: '0.5' }, 12, true), { holat: 'xato', sabab: 'butun' });
  assert.equal(korobkaNatijasi({ unitId: 'u', yopiq: '2', ochiq: '0.5' }, 12, false).jami, 24.5);
  assert.equal(korobkaNatijasi({ unitId: 'u', yopiq: '0.5', ochiq: '' }, 12, true).jami, 6);
  assert.equal(korobkaJamiMatni({ unitId: 'u', yopiq: '1', ochiq: '0.3' }, 12, true), 'x');
  assert.equal(korobkaSoroviQatori('m', { unitId: 'u', yopiq: '1', ochiq: '0.3' }, 12, true), null);
  assert.deepEqual(korobkaNatijasi({ unitId: 'u', yopiq: '-1', ochiq: '' }, 12), { holat: 'xato', sabab: 'son' });
});

test('yoqilganda yozilgan miqdor yo\'qolmaydi: 63 → 5 korobka + 3; 0 → "0"', () => {
  assert.deepEqual(korobkagaAjratish('63', KOROBKA), { unitId: 'u-box', yopiq: '5', ochiq: '3' });
  assert.deepEqual(korobkagaAjratish('60', KOROBKA), { unitId: 'u-box', yopiq: '5', ochiq: '' });
  assert.deepEqual(korobkagaAjratish('7', KOROBKA), { unitId: 'u-box', yopiq: '', ochiq: '7' });
  assert.deepEqual(korobkagaAjratish('0', KOROBKA), { unitId: 'u-box', yopiq: '0', ochiq: '' });
  assert.deepEqual(korobkagaAjratish('', KOROBKA), { unitId: 'u-box', yopiq: '', ochiq: '' });
  assert.deepEqual(korobkagaAjratish('abc', KOROBKA), { unitId: 'u-box', yopiq: '', ochiq: '' });
  assert.deepEqual(korobkagaAjratish('7.5', { unitId: 'kop', nomi: 'Qop', koeff: 2.5 }), { unitId: 'kop', yopiq: '3', ochiq: '' });
});

test('saqlangan qator: tahrirda korobka ko\'rinishida ochiladi, ko\'rishda "5 Korobka + 3"', () => {
  const qator = { actualQuantity: '63', closedUnitId: 'u-box', closedQuantity: '5', closedFactor: '12', openQuantity: '3' };
  // Saqlangan koeffitsient (closedFactor) ham olinadi: hozirgi koeffitsient farq qilsa qator korobka bo'lib qayta yuborilmaydi.
  assert.deepEqual(saqlanganKorobka(qator), { unitId: 'u-box', yopiq: '5', ochiq: '3', koeff: 12 });
  assert.deepEqual(saqlanganKorobka({ ...qator, openQuantity: '0' }), { unitId: 'u-box', yopiq: '5', ochiq: '', koeff: 12 });
  assert.deepEqual(saqlanganKorobka({ ...qator, closedFactor: null }), { unitId: 'u-box', yopiq: '5', ochiq: '3' });
  assert.equal(saqlanganKorobka({ actualQuantity: 63 }), null);
  assert.equal(saqlanganKorobka({ actualQuantity: 63, closedUnitId: null, closedQuantity: null }), null);
  assert.equal(korobkaKorinishi(qator, 'Korobka'), '5 Korobka + 3');
  assert.equal(korobkaKorinishi({ ...qator, openQuantity: 0 }, 'Korobka'), '5 Korobka');
  // Birlik nomi hali yuklanmagan — koeffitsient bilan.
  assert.equal(korobkaKorinishi(qator, undefined), '5 × 12 + 3');
  assert.equal(korobkaKorinishi({ actualQuantity: 10 }), null);
});

test('sanash birliklari: faqat qo\'shimcha birliklar (asosiy va koeff ≤ 1 emas)', () => {
  const birliklar = [
    { unitId: 'dona', nomi: 'Dona', qisqa: 'dona', koeff: 1, asosiy: true },
    { unitId: 'u-box', nomi: 'Korobka', qisqa: 'kor', koeff: 12, asosiy: false },
    { unitId: 'u-pack', nomi: '', qisqa: 'pachka', koeff: 6, asosiy: false },
    { unitId: 'u-half', nomi: 'Yarim', qisqa: 'yarim', koeff: 0.5, asosiy: false },
  ];
  // Eng katta qadoq birinchi (standart tanlov) — backend ro'yxati koeff o'sish tartibida keladi.
  assert.deepEqual(korobkaBirliklari([...birliklar].reverse()), [{ unitId: 'u-box', nomi: 'Korobka', koeff: 12 }, { unitId: 'u-pack', nomi: 'pachka', koeff: 6 }]);
  assert.deepEqual(korobkaBirliklari([]), []);
});

test('tahrir (/revise): korobkali qator korobka maydonlari bilan, qolganlari actualQuantity', () => {
  const hujjat = { id: 'h', status: 'CONFIRMED', type: 'PARTIAL', updatedAt: '2026-11-19T00:00:00Z', items: [] };
  const sorov = inventarizatsiyaTahrirSorovi(hujjat, {
    ids: ['m1', 'm2'], actuals: { m1: '63', m2: '4' }, note: ' ',
    korobkalar: { m1: { modificationId: 'm1', closedUnitId: 'u-box', closedQuantity: 5, openQuantity: 3 }, m2: null },
  });
  assert.deepEqual(sorov.items, [{ modificationId: 'm1', closedUnitId: 'u-box', closedQuantity: 5, openQuantity: 3 }, { modificationId: 'm2', actualQuantity: 4 }]);
  // korobkalarsiz — avvalgidek.
  assert.deepEqual(inventarizatsiyaTahrirSorovi(hujjat, { ids: ['m2'], actuals: { m2: '4' }, note: '' }).items, [{ modificationId: 'm2', actualQuantity: 4 }]);
});

test('qoralama PATCH (umumiy hujjat oynasi): o\'zgarmagan korobkali qator korobka bo\'lib qoladi', () => {
  const asl = [
    { modificationId: 'm1', actualQuantity: '63', closedUnitId: 'u-box', closedQuantity: '5', closedFactor: '12', openQuantity: '3' },
    { modificationId: 'm2', actualQuantity: '10' },
    { modificationId: 'm3', actualQuantity: '24', closedUnitId: 'u-box', closedQuantity: '2', closedFactor: '12', openQuantity: '0' },
  ];
  const koeff = (_m, unitId) => (unitId === 'u-box' ? 12 : undefined);
  // Koeffitsient o'zgargan (12 → 10) yoki birlik o'chirilgan/yuklanmagan: backend boshqa jami hisoblamasin — saqlangan jami actualQuantity bilan.
  assert.deepEqual(qoralamaQatorlari([{ modificationId: 'm1', quantity: 63 }], asl, () => 10), [{ modificationId: 'm1', actualQuantity: 63 }]);
  assert.deepEqual(qoralamaQatorlari([{ modificationId: 'm1', quantity: 63 }], asl, () => undefined), [{ modificationId: 'm1', actualQuantity: 63 }]);
  assert.deepEqual(qoralamaQatorlari([{ modificationId: 'm1', quantity: 63 }, { modificationId: 'm2', quantity: 11 }, { modificationId: 'm3', quantity: 25 }, { modificationId: 'm4', quantity: 1 }], asl, koeff), [
    { modificationId: 'm1', closedUnitId: 'u-box', closedQuantity: 5, openQuantity: 3 },
    { modificationId: 'm2', actualQuantity: 11 },
    { modificationId: 'm3', actualQuantity: 25 },
    { modificationId: 'm4', actualQuantity: 1 },
  ]);
});

test('sahifa ulanishlari: yaratish, tahrir, skaner, ko\'rish va tarjimalar', () => {
  const sahifa = manba('src/Pages/Ombor/Inventarizatsiya.tsx');
  assert.ok(sahifa.includes('const itemMap = new Map<string, InventarizatsiyaSoroviQatori>();'));
  // Yaratishda: korobka qatori, jami joriy qoldiqdan kam bo'lsa (qoldiq kamaytirilmaydi) — oddiy miqdor.
  assert.ok(sahifa.includes('korobkaQatori && actualQuantity >= joriy ? korobkaQatori : {'));
  assert.ok(sahifa.includes('korobkalar: korobkaQatorlari'));
  // Saqlashdan oldin birliklar serverdan qayta olinadi; koeffitsient o'zgarsa jami qayta hisoblanadi va saqlash to'xtaydi.
  assert.equal(sahifa.split('const korobkaQatorlari = await korobkaQatorlariniTayyorlash();').length - 1, 2);
  assert.ok(sahifa.includes('const yangi = await tovarBirliklariniYangilash(qatorlar.map(qatorTovari));'));
  assert.ok(sahifa.includes('setFormaXatosi({ key: "inventarizatsiya.createModal.box.factorChanged" });'));
  // Saqlangan qatorning koeffitsienti o'zgargan — oddiy maydon (saqlangan jami).
  assert.ok(sahifa.includes('if (korobka.koeff !== undefined && Math.abs(korobka.koeff - birlik.koeff) > 1e-9) return null;'));
  // Ko'rinmayotgan korobka sanog'i skanni yutib yubormaydi; "o'zgarish bor" korobkalarni ham kuzatadi.
  assert.ok(sahifa.includes('if (korobkalar[row.modificationId]) korobkaniOchirish(row.modificationId);'));
  assert.ok(sahifa.includes('useOzgarishBormi({ warehouseId, hujjatSanasi, actuals, korobkalar, tanlanganModifikatsiyaIds, note }, modal)'));
  // Kesh: muddatli, birlik saqlanganda tozalanadi.
  const hook = manba('src/hooks/useTovarBirliklari.ts');
  assert.ok(hook.includes('const MUDDAT = 60_000;') && hook.includes('window.addEventListener(TOVAR_BIRLIKLARI_HODISASI'));
  assert.ok(manba('src/api/catalogApi.ts').includes('window.dispatchEvent(new CustomEvent("tovar-birliklari:ozgardi", { detail: productId }))'));
  assert.ok(sahifa.includes('const korobka = saqlanganKorobka(row);'));
  assert.ok(sahifa.includes('<KorobkaTugmasi') && sahifa.includes('<KorobkaMaydoni'));
  assert.ok(sahifa.includes('korobkaOzgardi(row.modificationId, { ...korobka, ochiq: String('));
  // Tozalanish joylari: forma ochilishi, ombor almashishi, yaratilgach, qoralama saqlangach.
  assert.equal((sahifa.match(/setKorobkalar\(\{\}\);/g) ?? []).length, 4);
  // Qoralamani tahrirlash yaratish oynasida: PATCH, ombor qulflangan, tugmalar o'z matni bilan.
  assert.ok(sahifa.includes('onQoralamaTahrir={qoralamaniOchish}'));
  assert.ok(sahifa.includes('const saqlandi = await fx.kuzat(() => store.inventarizatsiyaYangilash(qoralamaId, {'));
  assert.ok(sahifa.includes('disabled={Boolean(tahrirHujjati || qoralamaHujjati)}'));
  for (const til of ['uz', 'ru']) {
    const d = JSON.parse(manba(`src/i18n/locales/${til}/ombor_harakat.json`)).inventarizatsiya.draftEdit;
    for (const kalit of ['title', 'badge', 'warehouseLocked', 'save', 'saveFinal', 'confirmDescription']) assert.ok(d[kalit], `${til} ${kalit}`);
  }
  assert.ok(manba('src/Pages/Ombor/InventarizatsiyaKorinish.tsx').includes('t("inventoryView.boxCount", { value: korobkaMatni(item) })'));
  assert.ok(manba('src/Pages/Ombor/InventoryHujjatModal.tsx').includes('items: qoralamaQatorlari(tozaItems, aslQatorlar, joriyKoeff),'));
  for (const til of ['uz', 'ru']) {
    const box = JSON.parse(manba(`src/i18n/locales/${til}/ombor_harakat.json`)).inventarizatsiya.createModal.box;
    for (const kalit of ['turnOn', 'on', 'turnOff', 'unitLabel', 'defaultUnit', 'baseUnit', 'closedLabel', 'openLabel', 'closedAria', 'openAria', 'invalid', 'invalidWhole', 'factorChanged', 'hint', 'totalTitle']) assert.ok(box[kalit], `${til} ${kalit}`);
    assert.ok(JSON.parse(manba(`src/i18n/locales/${til}/ombor_hujjat.json`)).inventoryView.boxCount, til);
  }
});

test('mahsulotlar jadvali balandligi to\'lsa doim aylantiriladi (korobka panellari qatorni balandlatadi)', () => {
  const sahifa = manba('src/Pages/Ombor/Inventarizatsiya.tsx');
  assert.match(sahifa, /<div ref=\{jadvalRef\} data-inventory-jadval className="[^"]*\boverflow-y-auto\b[^"]*\bsm:max-h-\[440px\]/);
  assert.ok(!sahifa.includes('"overflow-y-hidden"'));
});
