// Nakladnoy PDF'idagi kirill harflari ("Шина" o'rniga "????" chiqardi): PDF'ga DejaVu Sans shrifti subset qilib joylanadi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { ttfOqish, ttfSubset, glyphlar, PdfShrifti, pdfYigish } = require('../src/lib/pdfShrift.ts');
const shrift = (fayl, nom, qalin) => ttfOqish(new Uint8Array(readFileSync(new URL(`../src/assets/fonts/${fayl}`, import.meta.url))), nom, qalin);
const oddiy = shrift('DejaVuSans.ttf', 'DejaVuSans');
const qalin = shrift('DejaVuSans-Bold.ttf', 'DejaVuSans-Bold', true);

test('shriftda kirill (o\'zbek ҚЎҒҲ ham), lotin, № va ʻ belgilari bor', () => {
  for (const belgi of 'ШинаЖЩЁЎқўғҳAz№ʻ‘…') assert.notEqual(glyphlar(oddiy, belgi)[0].glyph, 0, belgi);
  assert.equal(oddiy.unitsPerEm, 2048);
});

test('subset — haqiqiy TTF: glyph raqamlari o\'zgarmaydi, kerakli glyph (va composite qismlari) qoladi, keraksizi bo\'shaydi', () => {
  const kerak = glyphlar(oddiy, 'Шa').map((g) => g.glyph);
  const sub = ttfOqish(ttfSubset(oddiy, kerak), 'sub');
  assert.equal(sub.glyphSoni, oddiy.glyphSoni);
  const uzunlik = (s, g) => {
    const dv = new DataView(s.bayt.buffer, s.bayt.byteOffset);
    const loca = s.jadvallar.get('loca').offset;
    const uzun = dv.getInt16(s.jadvallar.get('head').offset + 50) === 1;
    return uzun ? dv.getUint32(loca + g * 4 + 4) - dv.getUint32(loca + g * 4) : (dv.getUint16(loca + g * 2 + 2) - dv.getUint16(loca + g * 2)) * 2;
  };
  for (const g of kerak) assert.ok(uzunlik(sub, g) > 0, `glyph ${g}`);
  assert.equal(uzunlik(sub, glyphlar(oddiy, 'Z')[0].glyph), 0, 'ishlatilmagan glyph bo\'sh');
  assert.ok(ttfSubset(oddiy, kerak).length < 120_000, 'subset kichik');
});

test('PDF: kirillcha matn glyph raqamlari bilan, ToUnicode (nusxalash/qidiruv), xref ofsetlari to\'g\'ri', async () => {
  const sh = { F1: new PdfShrifti(oddiy), F2: new PdfShrifti(qalin) };
  const buyruq = `BT /F1 9 Tf 82 600 Td ${sh.F1.kodla('Шина 4,5*150')} Tj ET\nBT /F2 16 Tf 130 790 Td ${sh.F2.kodla('Chiqim nakladnoyi №')} Tj ET`;
  assert.match(buyruq, /<[0-9A-F]{4,}>/);
  const pdf = await pdfYigish(buyruq, sh);
  const matn = Buffer.from(pdf).toString('latin1');
  assert.match(matn, /^%PDF-1\.4/);
  assert.match(matn, /\/Subtype \/Type0 \/BaseFont \/YEPOSA\+DejaVuSans \/Encoding \/Identity-H/);
  assert.match(matn, /\/CIDToGIDMap \/Identity/);
  assert.match(matn, /\/FontFile2 \d+ 0 R/);
  const xref = Number(matn.match(/startxref\n(\d+)/)[1]);
  assert.equal(matn.slice(xref, xref + 4), 'xref');
  const ofsetlar = [...matn.slice(xref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
  ofsetlar.forEach((o, i) => assert.equal(matn.slice(o, o + `${i + 1} 0 obj`.length), `${i + 1} 0 obj`, `obyekt ${i + 1}`));
  assert.ok(pdf.length < 120_000, `PDF kichik: ${pdf.length}`);
  // "Ш" (U+0428) ToUnicode'da — siqilmagan holatda tekshirish uchun CompressionStream o'chiriladi
  const asl = globalThis.CompressionStream;
  globalThis.CompressionStream = undefined;
  try {
    const ochiq = Buffer.from(await pdfYigish(buyruq, sh)).toString('latin1');
    assert.match(ochiq, new RegExp(`<${glyphlar(oddiy, 'Ш')[0].glyph.toString(16).toUpperCase().padStart(4, '0')}> <0428>`));
  } finally {
    globalThis.CompressionStream = asl;
  }
});

test('nakladnoy endi kirill harflarini "?" ga almashtirmaydi va kirill shriftini ishlatadi', () => {
  const kod = readFileSync(new URL('../src/Pages/Savdo/SotuvTafsilotlariModal.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(kod, /\[\^\\x20-\\x7E\]/);
  assert.doesNotMatch(kod, /BaseFont \/Helvetica/);
  assert.match(kod, /await import\("@\/lib\/nakladnoyPdf"\)/);
  assert.match(kod, /shriftlar\[font\]\.kodla\(/);
});
