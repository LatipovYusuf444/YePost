// Yangi sotuv: "Umumiy miqdor" har tovarning o'z birligi bo'yicha (5 korobka · 12 kg · 3 dona), har xil birliklar qo'shilmaydi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { birlikBoyichaMiqdor, birlikMiqdoriMatni } from '../src/lib/miqdorBirliklari.ts';

test('birlik bo\'yicha jamlash, birinchi uchragan tartibda', () => {
  const natija = birlikBoyichaMiqdor([
    { birlik: 'korobka', miqdor: 2 }, { birlik: 'kg', miqdor: 7.5 }, { birlik: 'dona', miqdor: 3 },
    { birlik: 'Korobka ', miqdor: 3 }, { birlik: 'kg', miqdor: 4.5 }, { birlik: 'dona', miqdor: NaN }, { birlik: 'dona', miqdor: -1 },
  ]);
  assert.deepEqual(natija, [{ birlik: 'korobka', miqdor: 5 }, { birlik: 'kg', miqdor: 12 }, { birlik: 'dona', miqdor: 3 }]);
  assert.equal(birlikMiqdoriMatni(natija), '5 korobka · 12 kg · 3 dona');
  assert.deepEqual(birlikBoyichaMiqdor([{ birlik: 'kg', miqdor: 0.1 }, { birlik: 'kg', miqdor: 0.2 }]), [{ birlik: 'kg', miqdor: 0.3 }]);
  assert.deepEqual(birlikBoyichaMiqdor([]), []);
});

test('Yangi sotuv oynasi: qatorda tanlangan birlik, bo\'lmasa asosiy birlik; eski oddiy yig\'indi yo\'q', () => {
  const s = readFileSync(new URL('../src/Pages/Savdo/YangiSotuvModal.tsx', import.meta.url), 'utf8');
  assert.ok(s.includes('const birlik = birlikTopish(birliklar, mahsulot.birlikId) ?? birliklar?.find((item) => item.asosiy);'));
  assert.ok(s.includes('<MiqdorXulosaKarta nom={t("summary.totalQuantity")} guruhlar={birlikMiqdorlari} />'));
  assert.ok(!s.includes('const umumiyMiqdor ='));
});

test('"Umumiy birlik" paneli: hamma qatorga va keyin qo\'shiladiganlarga, shu birligi bor tovarlarga', () => {
  const s = readFileSync(new URL('../src/Pages/Savdo/YangiSotuvModal.tsx', import.meta.url), 'utf8');
  // Panel faqat qo'shimcha birligi bor tovarlar bo'lsa; "Asosiy birlik" + birliklar (unitId bo'yicha).
  assert.ok(s.includes('{umumiyBirlikVariantlari.length > 0 && ('));
  assert.ok(s.includes('[{ unitId: "", nom: t("generalUnit.base") }, ...umumiyBirlikVariantlari].map('));
  // Qatorlarni almashtirish: birligi yo'q yoki narxi chiqmagan qator o'z birligida qoladi va xabar beriladi.
  assert.ok(s.includes('function umumiyBirlikniTanlash(unitId: string) {'));
  assert.ok(s.includes('setBirlikXabari(qolgan > 0 ? t("generalUnit.skipped", { count: qolgan, unit: nom }) : "");'));
  assert.ok(s.includes('return { ...qator, birlikId, price: String(narx), ustama: "", discount: qator.discountTuri === "sum" ? "" : qator.discount };'));
  // Yangi mahsulot (tanlash va skaner) umumiy birlikda qo'shiladi; qadoq shtrix-kodi ustun.
  assert.ok(s.includes('const birlik = umumiyBirlikTovarda(qoldiq);'));
  assert.ok(s.includes('const umumiydagiBirlik = shtrixdagiBirlik ? undefined : umumiyBirlikTovarda(item);'));
  // "Tozalash" umumiy birlikni ham tozalaydi.
  assert.match(s, /setMahsulotlar\(\[bosQator\(narxTuri\)\]\);\s*setUmumiyBirlik\(null\);/);
  for (const til of ['uz', 'ru']) {
    const j = JSON.parse(readFileSync(new URL(`../src/i18n/locales/${til}/savdo_yangi.json`, import.meta.url), 'utf8'));
    for (const k of ['label', 'base', 'baseTitle', 'optionTitle', 'hint', 'skipped']) assert.ok(j.generalUnit[k], `${til} ${k}`);
    assert.ok(j.products.scanAdded.includes('{{unit}}') && j.products.scanAddedLowStock.includes('{{baseUnit}}'), til);
  }
});
