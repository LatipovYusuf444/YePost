// 26.11 BUG: Mahsulotni tahrirlashda mavjud variatsiyalar yuklanmasdi ("Paket Rulon": KG = 1 / 0.4 / 0.7).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as lib from '../src/lib/mahsulotVariatsiyalari.ts';

const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8').split(String.fromCharCode(13)).join('');
const rulon = [
  { id: 'm1', name: '1', params: { KG: '1' } },
  { id: 'm2', name: '0.4', params: { KG: '0.4' } },
  { id: 'm3', name: '0.7', params: { KG: '0.7' } },
];

test('atribut aniqlanadi: Paket Rulon → KG; xarakteristika (brand) atribut emas; oddiy mahsulot variatsiyasiz', () => {
  assert.deepEqual(lib.variatsiyaAtributlari(rulon), ['KG']);
  assert.equal(lib.variatsiyalimi(rulon), true);
  const brendli = rulon.map((v) => ({ ...v, params: { ...v.params, brand: 'Danmi' } }));
  assert.deepEqual(lib.variatsiyaAtributlari(brendli), ['KG']);
  // Ikki atribut: nom "Qizil / XL".
  const ikki = [{ id: 'a', name: 'Qizil / XL', params: { Rang: 'Qizil', Olcham: 'XL' } }, { id: 'b', name: 'Qizil / L', params: { Rang: 'Qizil', Olcham: 'L' } }];
  assert.deepEqual(lib.variatsiyaAtributlari(ikki), ['Rang', 'Olcham']);
  // Oddiy mahsulot: bitta "Asosiy variant" (xarakteristika params bilan ham) — variatsiyasiz, eski "Asosiy variant narxlari" yo'li.
  assert.equal(lib.variatsiyalimi([{ id: 'x', name: 'Asosiy variant', params: { brand: 'Danmi' } }]), false);
  assert.equal(lib.variatsiyalimi([{ id: 'x', name: 'Asosiy variant', params: null }]), false);
  // Yagona, lekin atributli variatsiya (faqat "1" kiritilgan) — variatsiyali.
  assert.equal(lib.variatsiyalimi([rulon[0]]), true);
  // Atributsiz bir nechta variant — variatsiyali (nom tahrirlanadi), "Asosiy variant" yo'li ishlatilmaydi.
  const nomli = [{ id: 'p', name: 'Kichik' }, { id: 'q', name: 'Katta' }];
  assert.equal(lib.variatsiyalimi(nomli), true);
  assert.deepEqual(lib.variatsiyaAtributlari(nomli), []);
  assert.deepEqual(lib.variatsiyaQiymatlari(nomli[0], []), { '': 'Kichik' });
});

test('PATCH tanasi: 0.7 → 0.4 nom va params; o\'zgarmagan — null; boshqa params saqlanadi; qo\'lda berilgan nom o\'zgarmaydi', () => {
  assert.deepEqual(lib.variatsiyaPatchi(rulon[2], ['KG'], { KG: '0.45' }), { name: '0.45', params: { KG: '0.45' } });
  assert.equal(lib.variatsiyaPatchi(rulon[2], ['KG'], { KG: ' 0.7 ' }), null);
  const brend = { id: 'm', name: '1', params: { KG: '1', brand: 'Danmi' } };
  assert.deepEqual(lib.variatsiyaPatchi(brend, ['KG'], { KG: '2' }), { name: '2', params: { KG: '2', brand: 'Danmi' } });
  const qolda = { id: 'm', name: 'Rulon katta', params: { KG: '1' } };
  assert.deepEqual(lib.variatsiyaPatchi(qolda, ['KG'], { KG: '2' }), { name: 'Rulon katta', params: { KG: '2' } });
  assert.deepEqual(lib.variatsiyaPatchi({ id: 'p', name: 'Kichik' }, [], { '': 'Mini' }), { name: 'Mini' });
  assert.deepEqual(lib.variatsiyaPatchi({ id: 'a', name: 'Qizil / XL', params: { Rang: 'Qizil', Olcham: 'XL' } }, ['Rang', 'Olcham'], { Rang: 'Ko\'k', Olcham: 'XL' }), { name: 'Ko\'k / XL', params: { Rang: 'Ko\'k', Olcham: 'XL' } });
});

test('yangi variatsiya params (umumiy xarakteristika bilan) va tekshiruv (bo\'sh, takror)', () => {
  const brendli = rulon.map((v) => ({ ...v, params: { ...v.params, brand: 'Danmi' } }));
  assert.deepEqual(lib.yangiVariatsiyaParams(brendli, ['KG'], { KG: '0.9' }), { brand: 'Danmi', KG: '0.9' });
  assert.equal(lib.variatsiyaNomi({ KG: ' 0.9 ' }, ['KG']), '0.9');
  const qatorlar = [
    { kalit: 'm1', qiymatlar: { KG: '1' } },
    { kalit: 'm2', qiymatlar: { KG: '0.4' } },
    { kalit: 'm3', qiymatlar: { KG: '0.4' } },
    { kalit: 'yangi', qiymatlar: { KG: '  ' } },
  ];
  assert.deepEqual(lib.variatsiyalarniTekshirish(qatorlar, ['KG']), { m3: 'takror', yangi: 'bosh' });
  assert.deepEqual(lib.variatsiyalarniTekshirish(qatorlar.slice(0, 2), ['KG']), {});
});

test('ulanish: tahrirlashda mavjud variatsiyalar, "Asosiy variant" yo\'li faqat variatsiyasiz mahsulotda, yangi variatsiyaga shtrix-kod, 0 qoldiq', () => {
  const kod = manba('src/Pages/Mahsulotlar/index.tsx');
  assert.match(kod, /const variatsiyaliTahrir=item!=="new"&&variatsiyalimi\(mavjudVariatsiyalar\);/);
  assert.match(kod, /if\(ok&&editing&&generatedVariants\.length===0&&!variatsiyaliTahrir\)\{\s*const asosiyVariant/);
  assert.match(kod, /store\.modifikatsiyaSaqlash\(item\.id,v\.id,\{\.\.\.patch,barcode:v\.barcode\}\)/);
  assert.match(kod, /barcode:yangi\.barcode\.trim\(\)\|\|generateBarcodeValue\(\)/);
  assert.match(kod, /modifikatsiyalarApi\.narxYangilash\(yaratilgan\.id,narx\)/);
  assert.match(kod, /\{variantCombinations\.length===0&&!variatsiyaliTahrir&&<div className="rounded-\[24px\] border border-orange-100/);
  assert.match(kod, /<ProductStockSummary productId=\{item\.id\} variatsiyalar=\{store\.modifikatsiyalar\[item\.id\]\} \/>/);
  assert.match(manba('src/Pages/Mahsulotlar/ProductStockSummary.tsx'), /qoldiqsizVariatsiyalarniQoshish\(yuklangan\.rows, variatsiyalar, productId\)/);
  for (const til of ['uz', 'ru']) {
    const j = JSON.parse(manba(`src/i18n/locales/${til}/mahsulotlar.json`));
    for (const k of ['title', 'attribute', 'add', 'hint']) assert.ok(j.productModal.existingVariants[k], `${til} ${k}`);
    assert.ok(j.productModal.existingVariants.errors.takror, til);
  }
});
