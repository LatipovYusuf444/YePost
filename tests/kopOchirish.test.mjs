// Belgilanganlarni birdaniga o'chirish (backend 20.11): Xaridorlar — POST /partners/customers/bulk-delete,
// Mahsulotlar — POST /catalog/products/bulk-delete; { ids } 1–500; 200 { deleted }; 404 { ids } — hech narsa o'chmaydi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  KOP_OCHIRISH_CHEGARASI, hammasiHolati, kopOchirishTanasi, ochirilganSoni, tanlovniOzgartirish, tanlovniQisqartirish, topilmaganIdlar,
} from '../src/lib/kopTanlov.ts';

const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8');

test('belgilash: qo\'shish/olib tashlash, 500 chegarasi', () => {
  let { tanlangan, kesildi } = tanlovniOzgartirish(new Set(), ['a', 'b'], true);
  assert.deepEqual([...tanlangan], ['a', 'b']);
  assert.equal(kesildi, false);
  ({ tanlangan } = tanlovniOzgartirish(tanlangan, ['a'], false));
  assert.deepEqual([...tanlangan], ['b']);
  const kop = Array.from({ length: 600 }, (_, i) => `id${i}`);
  const natija = tanlovniOzgartirish(new Set(), kop, true);
  assert.equal(KOP_OCHIRISH_CHEGARASI, 500);
  assert.equal(natija.tanlangan.size, 500);
  assert.equal(natija.kesildi, true);
  // Allaqachon belgilangan qayta qo'shilsa chegara buzilmaydi.
  assert.equal(tanlovniOzgartirish(natija.tanlangan, ['id0'], true).kesildi, false);
});

test('"hammasini tanlash" holati ko\'rinib turgan qatorlar bo\'yicha', () => {
  const t = new Set(['a', 'b']);
  assert.equal(hammasiHolati(t, ['a', 'b']), 'hammasi');
  assert.equal(hammasiHolati(t, ['a', 'c']), 'qisman');
  assert.equal(hammasiHolati(t, ['c']), 'hech');
  assert.equal(hammasiHolati(t, []), 'hech');
});

test('ro\'yxatda yo\'q belgilar hisobga olinmaydi; o\'zgarmasa o\'sha Set', () => {
  const t = new Set(['a', 'b', 'c']);
  assert.deepEqual([...tanlovniQisqartirish(t, ['a', 'c', 'd'])], ['a', 'c']);
  assert.equal(tanlovniQisqartirish(t, ['a', 'b', 'c', 'd']), t);
  const bosh = new Set();
  assert.equal(tanlovniQisqartirish(bosh, ['a']), bosh);
});

test('so\'rov tanasi va javoblar', () => {
  assert.deepEqual(kopOchirishTanasi(['a', 'b', 'a']), { ids: ['a', 'b'] });
  assert.deepEqual(topilmaganIdlar({ success: false, statusCode: 404, code: 'errors.common.not_found', ids: ['x', 'y'] }), ['x', 'y']);
  assert.deepEqual(topilmaganIdlar({ data: { ids: ['x'] } }), ['x']);
  assert.deepEqual(topilmaganIdlar(null), []);
  assert.equal(ochirilganSoni({ deleted: 3 }, 5), 3);
  assert.equal(ochirilganSoni({ data: { deleted: 2 } }, 5), 2);
  assert.equal(ochirilganSoni(undefined, 5), 5);
});

test('API: to\'g\'ri endpointlar, xato toasti yashirin (sahifa o\'zi xabar beradi)', () => {
  assert.ok(manba('src/api/partnersApi.ts').includes('apiClient.post<unknown>("/partners/customers/bulk-delete", kopOchirishTanasi(ids), { xatoniYashirish: true })'));
  assert.ok(manba('src/api/catalogApi.ts').includes('apiClient.post<unknown>("/catalog/products/bulk-delete", kopOchirishTanasi(ids), { xatoniYashirish: true })'));
});

test('oqim: tasdiq, 200 — tozalash + yangilash, 404 — topilmaganlar olinadi + yangilash', () => {
  const hook = manba('src/hooks/useKopOchirish.ts');
  assert.ok(hook.includes('if (!(await tasdiqSorash(tasdiqMatni(ids.length), { ochirish: true })).rozi) return;'));
  assert.match(hook, /const javob = await api\(ids\);\s*muvaffaqiyatXabari\([^\n]*\);\s*tozalash\(\);\s*await yangilash\(\);/);
  assert.match(hook, /error\.response\?\.status === 404\) \{\s*const topilmagan = topilmaganIdlar\(error\.response\.data\);/);
  assert.match(hook, /tanlovniOzgartirish\(joriy, topilmagan, false\)\.tanlangan\);\s*await yangilash\(\);/);
});

test('Xaridorlar: faqat ADMIN/DIREKTOR, karta va jadvalda belgilash, panel', () => {
  const s = manba('src/Pages/XaridorUchot/Xaridorlar.tsx');
  assert.ok(s.includes('const kopOchirishMumkin = foydalanuvchiAdminmi('));
  assert.ok(s.includes('api: mijozlarApi.kopOchirish,'));
  assert.ok(s.includes('{kopOchirishMumkin && (\n        <KopTanlovPaneli') || s.includes('{kopOchirishMumkin && (\r\n        <KopTanlovPaneli'));
  assert.ok(s.includes('tanlash={kopOchirishMumkin ? {'));
  assert.ok(s.includes('onChange={(belgilansin) => kop.ozgartirish([xaridor.id], belgilansin)}'));
  // Karta ko'rinishida "hammasini tanlash" — filtrdan o'tgan hamma kartalar; jadvalda — sahifadagi qatorlar (sarlavhada).
  assert.ok(s.includes('hammasi={korinish === "karta" ? {'));
  assert.ok(manba('src/Pages/XaridorUchot/index.tsx').includes('onYangilash={xaridorlarniYangilash}'));
  const jadval = manba('src/Pages/HisobotUchot/KengaytiriladiganJadval.tsx');
  assert.ok(jadval.includes('const korinadiganIds = visibleRows.map((row) => row.id);'));
  assert.ok(jadval.includes('onChange={(belgilansin) => tanlash.onChange(korinadiganIds, belgilansin)}'));
});

test('Mahsulotlar: faqat ADMIN/DIREKTOR, jadvalda sahifa, kartada hammasi', () => {
  const s = manba('src/Pages/Mahsulotlar/index.tsx');
  assert.ok(s.includes('const kopOchirishMumkin = excelAmallariMumkin;'));
  assert.ok(s.includes('api: mahsulotlarApi.kopOchirish,'));
  assert.ok(s.includes('yangilash: yuklash,'));
  assert.ok(s.includes('onChange={(belgilansin)=>kop.ozgartirish(sahifaIds,belgilansin)}'));
  assert.ok(s.includes('hammasi={korinish==="kartochka"?{holat:kop.holat(mahsulotIds)'));
});

test('tarjimalar uz/ru', () => {
  for (const til of ['uz', 'ru']) {
    const c = JSON.parse(manba(`src/i18n/locales/${til}/common.json`)).bulkDelete;
    for (const k of ['panelAria', 'selectAll', 'selectAllAria', 'selectAllPageAria', 'rowAria', 'selected', 'clear', 'delete', 'limit', 'deleted', 'notFound']) assert.ok(c[k], `${til} ${k}`);
    assert.ok(JSON.parse(manba(`src/i18n/locales/${til}/xaridor_uchot.json`)).bulkDelete.confirm, til);
    assert.ok(JSON.parse(manba(`src/i18n/locales/${til}/mahsulotlar.json`)).bulkDelete.confirm, til);
  }
});

test('global "Muvaffaqiyatli yaratildi" toasti chiqmaydi — natijani sahifa o\'zi aytadi', () => {
  assert.match(manba('src/api/axios.ts'), /const TOAST_ISTISNOLARI = \[[^\]]*"\/bulk-delete"\]/);
});
