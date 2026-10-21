import test from 'node:test';
import assert from 'node:assert/strict';
import { belgilarSoni, kursorOrni, maydonOzgarishi, nolmi, sonniGuruhlash, sonniTozalash } from '../src/lib/sonFormatlash.ts';

test('sonniGuruhlash: uchtadan guruhlanadi, kasr va yozilayotgan nuqta saqlanadi', () => {
  assert.equal(sonniGuruhlash('30000000'), '30 000 000');
  assert.equal(sonniGuruhlash('3000300'), '3 000 300');
  assert.equal(sonniGuruhlash('300'), '300');
  assert.equal(sonniGuruhlash('1000'), '1 000');
  assert.equal(sonniGuruhlash('1234.5'), '1 234.5');
  assert.equal(sonniGuruhlash('1234567.89'), '1 234 567.89');
  assert.equal(sonniGuruhlash('12.'), '12.');
  assert.equal(sonniGuruhlash('0.5'), '0.5');
  assert.equal(sonniGuruhlash(''), '');
  assert.equal(sonniGuruhlash(null), '');
  assert.equal(sonniGuruhlash(undefined), '');
  assert.equal(sonniGuruhlash(1250000), '1 250 000');
});

test('sonniTozalash: bo‘shliq, harf va ortiqcha belgilar tashlanadi; vergul nuqtaga; kasr xonalari cheklanadi', () => {
  assert.equal(sonniTozalash('30 000 000'), '30000000');
  assert.equal(sonniTozalash('30 000'), '30000');
  assert.equal(sonniTozalash('abc12x3'), '123');
  assert.equal(sonniTozalash('1,5'), '1.5');
  assert.equal(sonniTozalash('1.2.3'), '1.23');
  assert.equal(sonniTozalash('12.345', 2), '12.34');
  assert.equal(sonniTozalash('12.', 2), '12.');
  assert.equal(sonniTozalash('.', 2), '0.');
  assert.equal(sonniTozalash('.5', 2), '0.5');
  assert.equal(sonniTozalash('12.5', 0), '12', 'kasr = 0: faqat butun');
  assert.equal(sonniTozalash('12.', 0), '12');
  assert.equal(sonniTozalash('007'), '7');
  assert.equal(sonniTozalash('0'), '0');
  assert.equal(sonniTozalash('00'), '0');
  assert.equal(sonniTozalash('0.50'), '0.50');
  assert.equal(sonniTozalash('-5'), '5', 'manfiy belgi tashlanadi');
  assert.equal(sonniTozalash(''), '');
  assert.equal(sonniTozalash('1234567890123456789'), '123456789012345', 'butun qism 15 xona bilan cheklanadi');
});

test('kursor: yozilgan joydan keyin turadi (guruh bo‘shliqlari qo‘shilsa ham siljimaydi)', () => {
  // "3000" ga "0" qo'shildi: yozilgan "30 000" emas, "3 0000" ko'rinishida kelishi mumkin — tozalab guruhlash 30 000
  const guruh = sonniGuruhlash(sonniTozalash('30000'));
  assert.equal(guruh, '30 000');
  // kursordan oldin 5 ta raqam bor edi → guruhlangan matnda oxirgi raqamdan keyin
  assert.equal(kursorOrni(guruh, 5), 6);
  // 2 ta raqamdan keyin: "30| 000" emas, "30" dan keyin (bo'shliqdan oldin)
  assert.equal(kursorOrni(guruh, 2), 2);
  assert.equal(kursorOrni(guruh, 3), 4, 'uchinchi raqamdan keyin (bo‘shliqdan o‘tib)');
  assert.equal(kursorOrni('1 234.5', 5), 6, 'nuqtadan keyin');
  assert.equal(kursorOrni('1 234.5', 6), 7);
  assert.equal(kursorOrni('123', 0), 0);
  assert.equal(kursorOrni('123', 99), 3);
  assert.equal(belgilarSoni('30 00|0', 5), 4);
  assert.equal(belgilarSoni('1 234.5', 7), 6);
});

test('maydonOzgarishi: oddiy yozish va o‘chirish', () => {
  // "3 000" oxiriga "0" yozildi: kursor oxirida
  let n = maydonOzgarishi({ yozilgan: '3 0000', kursor: 6, joriyToza: '3000', joriyKorinish: '3 000', kasr: 2 });
  assert.deepEqual(n, { toza: '30000', kursordanOldin: 5 });
  // o'rtaga raqam qo'shish: "3 000" da "3" dan keyin "7"
  n = maydonOzgarishi({ yozilgan: '37 000', kursor: 2, joriyToza: '3000', joriyKorinish: '3 000', kasr: 2 });
  assert.deepEqual(n, { toza: '37000', kursordanOldin: 2 });
  // raqamni o'chirish: "30 000" oxiridan bitta raqam
  n = maydonOzgarishi({ yozilgan: '30 00', kursor: 5, joriyToza: '30000', joriyKorinish: '30 000', kasr: 2 });
  assert.deepEqual(n, { toza: '3000', kursordanOldin: 4 });
  // harf yozish: toza qiymat o'zgarmaydi
  n = maydonOzgarishi({ yozilgan: '30 000a', kursor: 7, joriyToza: '30000', joriyKorinish: '30 000', kasr: 2 });
  assert.equal(n.toza, '30000');
  // hammasini o'chirish
  n = maydonOzgarishi({ yozilgan: '', kursor: 0, joriyToza: '30000', joriyKorinish: '30 000', kasr: 2 });
  assert.deepEqual(n, { toza: '', kursordanOldin: 0 });
});

test('maydonOzgarishi: guruh bo‘shlig‘ini Backspace bilan o‘chirish bo‘shliq oldidagi raqamni o‘chiradi (qiymat "qotib" qolmaydi)', () => {
  // "30 |000" da Backspace: yozilgan "30000", kursor 2
  const n = maydonOzgarishi({ yozilgan: '30000', kursor: 2, joriyToza: '30000', joriyKorinish: '30 000', kasr: 2 });
  assert.deepEqual(n, { toza: '3000', kursordanOldin: 1 });
  // kasrli yozuvda ham
  const k = maydonOzgarishi({ yozilgan: '1234.5', kursor: 1, joriyToza: '1234.5', joriyKorinish: '1 234.5', kasr: 2 });
  assert.deepEqual(k, { toza: '234.5', kursordanOldin: 0 });
});

test('nolmi: nol ko‘rinishlari bo‘sh maydon sifatida ko‘rsatiladi (placeholder), bo‘sh matn va musbat son nol emas', () => {
  for (const nol of ['0', '0.', '0.0', '0.00', '00']) assert.equal(nolmi(nol), true, nol);
  for (const emas of ['', '1', '0.5', '10', '0.01']) assert.equal(nolmi(emas), false, emas);
});
