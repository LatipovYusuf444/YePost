// Telefon raqamlari: boshqa davlatlar (backend 18.11 common/utils/phone.ts): +998 (kodsiz ham), +7, +993, +992, +93, +996.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { OZBEKISTON, TELEFON_DAVLATLARI, kiritilganTelefon, kodYozilmoqda, milliyKorinish, telefonQiymati, telefonniAjratish, telefonniFormatlash, toliqTelefonmi } from '../src/lib/telefon.ts';
import { mijozMatniniAjratish, telefonKorinishi } from '../src/lib/mijozQidiruvi.ts';

const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8');

test('davlatlar va raqam uzunligi backend bilan bir xil', () => {
  assert.deepEqual(TELEFON_DAVLATLARI.map((d) => [d.kod, d.uzunlik]), [['998', 9], ['7', 10], ['993', 8], ['992', 9], ['93', 9], ['996', 9]]);
});

test('ajratish: backend namunalari (to\'liq raqam → +<kod><raqam>)', () => {
  const kutilgan = [
    ['+998901234567', '+998901234567'], ['998901234567', '+998901234567'], ['+998 (90) 123-45-67', '+998901234567'],
    ['901234567', '+998901234567'], ['90 123 45 67', '+998901234567'], ['8998901234567', '+998901234567'],
    ['+7 912 345-67-89', '+79123456789'], ['+993 65 123456', '+99365123456'], ['99365123456', '+99365123456'],
    ['+992 92 123 45 67', '+992921234567'], ['+93 70 123 4567', '+93701234567'], ['+996 555 123 456', '+996555123456'],
  ];
  for (const [matn, natija] of kutilgan) {
    const { davlat, milliy } = telefonniAjratish(matn);
    assert.equal(telefonQiymati(davlat, milliy), natija, matn);
  }
  // "+" li qisman yozuv shu davlatda qoladi, uzunlikdan oshmaydi.
  assert.deepEqual((({ davlat, milliy }) => [davlat.kod, milliy])(telefonniAjratish('+7 912')), ['7', '912']);
  assert.deepEqual((({ davlat, milliy }) => [davlat.kod, milliy])(telefonniAjratish('+996 555 123 456 789')), ['996', '555123456']);
});

test('to\'liq raqam tekshiruvi: noto\'g\'ri uzunlik va qo\'llab-quvvatlanmagan kod rad etiladi', () => {
  for (const ok of ['+998901234567', '+79123456789', '+99365123456', '+992921234567', '+93701234567', '+996555123456']) assert.equal(toliqTelefonmi(ok), true, ok);
  for (const yomon of ['', '+7 912 345-67-8', '+99365 12345', '+996 555 123 45', '+1 202 555 0143', '+998 90 123 45 6', 'abc']) assert.equal(toliqTelefonmi(yomon), false, yomon);
});

test('ko\'rinish: har davlat o\'z guruhlarida; tanilmagan raqam o\'zgarmaydi', () => {
  assert.equal(telefonniFormatlash('+998901234567'), '+998 90 123 45 67');
  assert.equal(telefonniFormatlash('+79123456789'), '+7 912 345 67 89');
  assert.equal(telefonniFormatlash('+99365123456'), '+993 65 123456');
  assert.equal(telefonniFormatlash('+992921234567'), '+992 92 123 4567');
  assert.equal(telefonniFormatlash('+93701234567'), '+93 70 123 4567');
  assert.equal(telefonniFormatlash('+996555123456'), '+996 555 123 456');
  assert.equal(telefonniFormatlash('12345'), '12345');
  assert.equal(milliyKorinish(TELEFON_DAVLATLARI[1], '91234'), '912 34');
  // Ro'yxatdagi ko'rinish ham xorijiy raqamni formatlaydi; avvalgi o'zbek ko'rinishi o'zgarmagan.
  assert.equal(telefonKorinishi('+998777777777'), '+998 77 777 77 77');
  assert.equal(telefonKorinishi('+79123456789'), '+7 912 345 67 89');
});

test('mijoz qidiruvidan yangi mijoz: kodli xorijiy raqam o\'z davlatida, kodsiz — O\'zbekiston (avvalgidek)', () => {
  assert.equal(mijozMatniniAjratish('+7 912 345 67 89').telefon, '+79123456789');
  assert.equal(mijozMatniniAjratish('+996 555 123 456').telefon, '+996555123456');
  assert.equal(mijozMatniniAjratish('901234567').telefon, '+998901234567');
  assert.equal(mijozMatniniAjratish('+998 90 123 45 67').telefon, '+998901234567');
});

test('xalqaro maydon faqat mijoz, yetkazib beruvchi va mijoz kompaniyasida; xodim, filial, profil — avvalgidek +998', () => {
  for (const fayl of ['src/Pages/XaridorUchot/XaridorModal.tsx', 'src/Pages/XaridorUchot/YetkazibBeruvchiModal.tsx', 'src/Pages/XaridorUchot/KompaniyaModal.tsx', 'src/Pages/Savdo/MijozniTahrirlashOynasi.tsx']) {
    assert.match(manba(fayl), /<XalqaroTelefon /, fayl);
  }
  for (const fayl of ['src/Pages/XodimUchot/XodimFormaModal.tsx', 'src/Pages/SozlamalarUchot/FiliallarBolimi.tsx', 'src/Pages/SozlamalarUchot/ProfilBolimi.tsx', 'src/Pages/SozlamalarUchot/KompaniyaBolimi.tsx', 'src/Pages/Ombor/Kompaniyalar.tsx']) {
    assert.doesNotMatch(manba(fayl), /XalqaroTelefon/, fayl);
  }
  for (const til of ['uz', 'ru']) assert.ok(JSON.parse(manba(`src/i18n/locales/${til}/common.json`)).phone.countryCode, til);
});

test('O\'zbekiston "0" + 9 ta raqam (backend normalizePhone) → +998', () => {
  const { davlat, milliy } = telefonniAjratish('0901234567');
  assert.equal(telefonQiymati(davlat, milliy), '+998901234567');
  assert.equal(mijozMatniniAjratish('0901234567').telefon, '+998901234567');
});

test('yopishtirish / avto-to\'ldirish: to\'liq shakl o\'z davlatida, qisqasi tanlangan davlatda (PhoneInput bilan bir xil)', () => {
  const RU = TELEFON_DAVLATLARI[1];
  const kutilgan = [
    ['998998889900', OZBEKISTON, '+998998889900'], ['998901234567', OZBEKISTON, '+998901234567'], ['8998901234567', OZBEKISTON, '+998901234567'],
    ['0901234567', OZBEKISTON, '+998901234567'], ['79123456789', OZBEKISTON, '+79123456789'], ['+993 65 123456', OZBEKISTON, '+99365123456'],
    ['90 123 45 67', OZBEKISTON, '+998901234567'], ['912 345 67 89', RU, '+79123456789'], ['998901234567', RU, '+998901234567'],
  ];
  for (const [matn, joriy, natija] of kutilgan) {
    const { davlat, milliy } = kiritilganTelefon(matn, joriy);
    assert.equal(telefonQiymati(davlat, milliy), natija, `${matn} (${joriy.kod})`);
  }
});

test('"+" qo\'lda yozilayotganda kod hali to\'liq emas — davlat tashlab yuborilmaydi', () => {
  for (const matn of ['+', '+9', '+99', ' +99']) assert.equal(kodYozilmoqda(matn), true, matn);
  for (const matn of ['+7', '+993', '+90', '+1', '99', '']) assert.equal(kodYozilmoqda(matn), false, matn);
  const komponent = manba('src/Components/ui/XalqaroTelefon.tsx');
  assert.ok(komponent.includes('if (kodYozilmoqda(matn)) {') && komponent.includes('setQoralama(matn.trim());'));
  assert.ok(komponent.includes('value={qoralama ?? milliyKorinish(davlat, milliy)}'));
  assert.ok(komponent.includes('onPaste={yopishtirildi}'));
  // Bitta ortiqcha raqam boshqa davlatga "sakratmaydi": faqat bir yo'la kiritilgan yoki "0" + 9 ta.
  assert.ok(komponent.includes('if (toliq && (birYola || nolBilan))'));
});

test('telefon yozuvi raqam maydonini nomlaydi (davlat tanlovini emas)', () => {
  assert.ok(manba('src/Components/ui/XalqaroTelefon.tsx').includes('aria-label={ariaLabel}'));
  for (const [fayl, pre] of [['src/Pages/XaridorUchot/KompaniyaModal.tsx', 'kompaniya'], ['src/Pages/XaridorUchot/YetkazibBeruvchiModal.tsx', 'yetkazib']]) {
    const m = manba(fayl);
    for (const nom of [`${pre}-telefon`, `${pre}-aloqa-telefoni`]) {
      assert.ok(m.includes(`htmlFor="${nom}"`) && m.includes(`<XalqaroTelefon id="${nom}"`), `${fayl} ${nom}`);
    }
  }
  assert.ok(manba('src/Pages/XaridorUchot/XaridorModal.tsx').includes('ariaLabel={t("xaridorModal.phone")}'));
  assert.ok(manba('src/Pages/Savdo/MijozniTahrirlashOynasi.tsx').includes('<XalqaroTelefon value={value} onChange={onChange} invalid={invalid} ariaLabel={ariaLabel} />'));
});
