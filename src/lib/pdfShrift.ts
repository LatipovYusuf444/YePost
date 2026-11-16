// Kirill (va boshqa Unicode) harflari bilan PDF: TrueType shrift PDF'ga faqat ishlatilgan harflari bilan (subset) joylanadi
// (Type0 / CIDFontType2, Identity-H, CIDToGIDMap Identity — CID = glyph raqami). Matn nusxalanishi uchun ToUnicode ham yoziladi.
// Standart Helvetica'da kirill harfi yo'q edi: nakladnoyda "Шина" o'rniga "????" chiqardi. UI'siz — testlarda to'g'ridan-to'g'ri ishlaydi.

type Jadval = { offset: number; length: number };

export type TtfShrift = {
  nom: string;
  bayt: Uint8Array;
  jadvallar: Map<string, Jadval>;
  unitsPerEm: number;
  bbox: [number, number, number, number];
  ascent: number;
  descent: number;
  capHeight: number;
  glyphSoni: number;
  kengliklar: Uint16Array;
  cmap: Map<number, number>;
  qalin: boolean;
};

function oquvchi(bayt: Uint8Array) {
  const dv = new DataView(bayt.buffer, bayt.byteOffset, bayt.byteLength);
  return {
    u16: (o: number) => dv.getUint16(o),
    i16: (o: number) => dv.getInt16(o),
    u32: (o: number) => dv.getUint32(o),
  };
}

/** TTF faylini o'qiydi: o'lchamlar, glyph kengliklari va Unicode → glyph jadvali (cmap 3/10 yoki 3/1, 0/x). */
export function ttfOqish(bayt: Uint8Array, nom: string, qalin = false): TtfShrift {
  const r = oquvchi(bayt);
  const jadvallar = new Map<string, Jadval>();
  const soni = r.u16(4);
  for (let i = 0; i < soni; i++) {
    const p = 12 + i * 16;
    const tag = String.fromCharCode(bayt[p], bayt[p + 1], bayt[p + 2], bayt[p + 3]);
    jadvallar.set(tag, { offset: r.u32(p + 8), length: r.u32(p + 12) });
  }
  const j = (tag: string) => {
    const t = jadvallar.get(tag);
    if (!t) throw new Error(`TTF: "${tag}" jadvali yo'q`);
    return t.offset;
  };
  const head = j("head");
  const unitsPerEm = r.u16(head + 18);
  const bbox: [number, number, number, number] = [r.i16(head + 36), r.i16(head + 38), r.i16(head + 40), r.i16(head + 42)];
  const hhea = j("hhea");
  const ascent = r.i16(hhea + 4);
  const descent = r.i16(hhea + 6);
  const hMetrikalar = r.u16(hhea + 34);
  const glyphSoni = r.u16(j("maxp") + 4);
  const hmtx = j("hmtx");
  const kengliklar = new Uint16Array(glyphSoni);
  let oxirgi = 0;
  for (let g = 0; g < glyphSoni; g++) {
    if (g < hMetrikalar) oxirgi = r.u16(hmtx + g * 4);
    kengliklar[g] = oxirgi;
  }
  let capHeight = Math.round(ascent * 0.7);
  const os2 = jadvallar.get("OS/2");
  if (os2 && r.u16(os2.offset) >= 2 && os2.length >= 90) capHeight = r.i16(os2.offset + 88);
  return { nom, bayt, jadvallar, unitsPerEm, bbox, ascent, descent, capHeight, glyphSoni, kengliklar, // Subset shriftda cmap yo'q (PDF uchun kerak emas).
    cmap: jadvallar.has("cmap") ? cmapOqish(bayt, j("cmap")) : new Map(), qalin };
}

function cmapOqish(bayt: Uint8Array, cmap: number) {
  const r = oquvchi(bayt);
  const natija = new Map<number, number>();
  const soni = r.u16(cmap + 2);
  const yozuvlar: Array<{ platforma: number; kodlash: number; offset: number }> = [];
  for (let i = 0; i < soni; i++) {
    const p = cmap + 4 + i * 8;
    yozuvlar.push({ platforma: r.u16(p), kodlash: r.u16(p + 2), offset: cmap + r.u32(p + 4) });
  }
  const tanla = (shart: (y: (typeof yozuvlar)[number]) => boolean) => yozuvlar.find(shart);
  const yozuv =
    tanla((y) => y.platforma === 3 && y.kodlash === 10 && r.u16(y.offset) === 12) ??
    tanla((y) => y.platforma === 0 && r.u16(y.offset) === 12) ??
    tanla((y) => y.platforma === 3 && y.kodlash === 1 && r.u16(y.offset) === 4) ??
    tanla((y) => y.platforma === 0 && r.u16(y.offset) === 4);
  if (!yozuv) return natija;
  const o = yozuv.offset;
  if (r.u16(o) === 12) {
    const guruhlar = r.u32(o + 12);
    for (let i = 0; i < guruhlar; i++) {
      const p = o + 16 + i * 12;
      const bosh = r.u32(p), oxir = r.u32(p + 4), glyph = r.u32(p + 8);
      for (let c = bosh; c <= oxir && c - bosh < 0x10000; c++) natija.set(c, glyph + (c - bosh));
    }
    return natija;
  }
  const segSoni = r.u16(o + 6) / 2;
  const oxirlar = o + 14;
  const boshlar = oxirlar + segSoni * 2 + 2;
  const deltalar = boshlar + segSoni * 2;
  const rangeOfsetlar = deltalar + segSoni * 2;
  for (let s = 0; s < segSoni; s++) {
    const bosh = r.u16(boshlar + s * 2), oxir = r.u16(oxirlar + s * 2), delta = r.i16(deltalar + s * 2);
    const rangeOfset = r.u16(rangeOfsetlar + s * 2);
    for (let c = bosh; c <= oxir && c !== 0xffff; c++) {
      let glyph: number;
      if (rangeOfset === 0) glyph = (c + delta) & 0xffff;
      else {
        const manzil = rangeOfsetlar + s * 2 + rangeOfset + (c - bosh) * 2;
        glyph = r.u16(manzil);
        if (glyph !== 0) glyph = (glyph + delta) & 0xffff;
      }
      if (glyph !== 0) natija.set(c, glyph);
    }
  }
  return natija;
}

/** Matndagi har bir belgining glyph raqami (shriftda yo'q belgi — 0, ".notdef"). */
export function glyphlar(shrift: TtfShrift, matn: string) {
  return Array.from(matn, (belgi) => ({ belgi, glyph: shrift.cmap.get(belgi.codePointAt(0) ?? 0) ?? 0 }));
}

function glyphChegarasi(shrift: TtfShrift, g: number) {
  const r = oquvchi(shrift.bayt);
  const loca = shrift.jadvallar.get("loca")!.offset;
  const uzun = r.i16(shrift.jadvallar.get("head")!.offset + 50) === 1;
  return uzun ? [r.u32(loca + g * 4), r.u32(loca + g * 4 + 4)] : [r.u16(loca + g * 2) * 2, r.u16(loca + g * 2 + 2) * 2];
}

/** Ishlatilgan glyphlar va ular tarkibidagi (composite) glyphlar. */
function toliqGlyphlar(shrift: TtfShrift, ishlatilgan: Iterable<number>) {
  const r = oquvchi(shrift.bayt);
  const glyf = shrift.jadvallar.get("glyf")!.offset;
  const natija = new Set<number>();
  const navbat = [0, ...ishlatilgan];
  while (navbat.length) {
    const g = navbat.pop()!;
    if (g >= shrift.glyphSoni || natija.has(g)) continue;
    natija.add(g);
    const [bosh, oxir] = glyphChegarasi(shrift, g);
    if (oxir <= bosh || r.i16(glyf + bosh) >= 0) continue;
    let p = glyf + bosh + 10;
    for (;;) {
      const bayroq = r.u16(p);
      navbat.push(r.u16(p + 2));
      p += 4 + (bayroq & 1 ? 4 : 2) + (bayroq & 8 ? 2 : bayroq & 0x40 ? 4 : bayroq & 0x80 ? 8 : 0);
      if (!(bayroq & 0x20)) break;
    }
  }
  return natija;
}

const SAQLANADIGAN_JADVALLAR = ["OS/2", "cvt ", "fpgm", "glyf", "head", "hhea", "hmtx", "loca", "maxp", "prep"];

function jadvalSummasi(bayt: Uint8Array) {
  let summa = 0;
  for (let i = 0; i < bayt.length; i += 4) {
    summa = (summa + (((bayt[i] ?? 0) << 24) | ((bayt[i + 1] ?? 0) << 16) | ((bayt[i + 2] ?? 0) << 8) | (bayt[i + 3] ?? 0))) >>> 0;
  }
  return summa;
}

/**
 * Subset: glyph raqamlari o'zgarmaydi (CIDToGIDMap Identity), faqat ishlatilmagan glyphlarning shakli bo'shatiladi va keraksiz
 * jadvallar (kern, GSUB, GPOS, name, post, cmap...) tashlanadi. Natija — haqiqiy TTF.
 */
export function ttfSubset(shrift: TtfShrift, ishlatilgan: Iterable<number>): Uint8Array {
  const kerak = toliqGlyphlar(shrift, ishlatilgan);
  const asl = shrift.bayt;
  const glyfAsl = shrift.jadvallar.get("glyf")!.offset;
  const qismlar: Uint8Array[] = [];
  const yangiLoca = new Uint8Array((shrift.glyphSoni + 1) * 4);
  const locaDv = new DataView(yangiLoca.buffer);
  let joy = 0;
  for (let g = 0; g < shrift.glyphSoni; g++) {
    locaDv.setUint32(g * 4, joy);
    if (!kerak.has(g)) continue;
    const [bosh, oxir] = glyphChegarasi(shrift, g);
    if (oxir <= bosh) continue;
    const uzunlik = oxir - bosh;
    const toldirilgan = new Uint8Array(uzunlik + ((4 - (uzunlik % 4)) % 4));
    toldirilgan.set(asl.subarray(glyfAsl + bosh, glyfAsl + oxir));
    qismlar.push(toldirilgan);
    joy += toldirilgan.length;
  }
  locaDv.setUint32(shrift.glyphSoni * 4, joy);
  const yangiGlyf = new Uint8Array(joy);
  let p = 0;
  for (const q of qismlar) { yangiGlyf.set(q, p); p += q.length; }

  const jadvallar = SAQLANADIGAN_JADVALLAR.filter((tag) => shrift.jadvallar.has(tag) || tag === "loca" || tag === "glyf").map((tag) => {
    if (tag === "glyf") return { tag, bayt: yangiGlyf };
    if (tag === "loca") return { tag, bayt: yangiLoca };
    const t = shrift.jadvallar.get(tag)!;
    const nusxa = asl.slice(t.offset, t.offset + t.length);
    if (tag === "head") {
      const dv = new DataView(nusxa.buffer);
      dv.setUint32(8, 0); // checkSumAdjustment — pastda hisoblanadi
      dv.setInt16(50, 1); // loca uzun formatda
    }
    return { tag, bayt: nusxa };
  });

  const soni = jadvallar.length;
  let daraja = 1, kuch = 0;
  while (daraja * 2 <= soni) { daraja *= 2; kuch++; }
  const sarlavha = 12 + soni * 16;
  let umumiy = sarlavha;
  const joylar = jadvallar.map((t) => { const j = umumiy; umumiy += t.bayt.length + ((4 - (t.bayt.length % 4)) % 4); return j; });
  const natija = new Uint8Array(umumiy);
  const dv = new DataView(natija.buffer);
  dv.setUint32(0, 0x00010000);
  dv.setUint16(4, soni);
  dv.setUint16(6, daraja * 16);
  dv.setUint16(8, kuch);
  dv.setUint16(10, soni * 16 - daraja * 16);
  jadvallar.forEach((t, i) => {
    const q = 12 + i * 16;
    for (let k = 0; k < 4; k++) natija[q + k] = t.tag.charCodeAt(k);
    dv.setUint32(q + 4, jadvalSummasi(t.bayt));
    dv.setUint32(q + 8, joylar[i]);
    dv.setUint32(q + 12, t.bayt.length);
    natija.set(t.bayt, joylar[i]);
  });
  const headIndeks = jadvallar.findIndex((t) => t.tag === "head");
  if (headIndeks >= 0) dv.setUint32(joylar[headIndeks] + 8, (0xb1b0afba - jadvalSummasi(natija)) >>> 0);
  return natija;
}

// ── PDF yig'ish ──

const kodlovchi = new TextEncoder();
const hex4 = (son: number) => son.toString(16).toUpperCase().padStart(4, "0");

/** Sahifadagi matnlar uchun shrift: glyphlarni kodlaydi va qaysilari ishlatilganini yig'adi. */
export class PdfShrifti {
  readonly ishlatilgan = new Map<number, string>();
  readonly shrift: TtfShrift;
  constructor(shrift: TtfShrift) {
    this.shrift = shrift;
  }
  /** PDF matn operandi: `<00230045...>` (2 baytli glyph raqamlari). */
  kodla(matn: string) {
    return `<${glyphlar(this.shrift, matn).map(({ belgi, glyph }) => {
      if (!this.ishlatilgan.has(glyph)) this.ishlatilgan.set(glyph, belgi);
      return hex4(glyph);
    }).join("")}>`;
  }
  /** Matn kengligi (pt) — o'ngga/markazga tekislash uchun. */
  kenglik(matn: string, olcham: number) {
    return glyphlar(this.shrift, matn).reduce((s, { glyph }) => s + this.shrift.kengliklar[glyph], 0) * olcham / this.shrift.unitsPerEm;
  }
}

type PdfObyekt = string | { lugat: string; oqim: Uint8Array };

async function siqish(bayt: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === "undefined") return null;
  try {
    const oqim = new Blob([bayt as BlobPart]).stream().pipeThrough(new CompressionStream("deflate"));
    return new Uint8Array(await new Response(oqim).arrayBuffer());
  } catch {
    return null;
  }
}

async function oqimObyekti(lugat: string, bayt: Uint8Array): Promise<PdfObyekt> {
  const siqilgan = await siqish(bayt);
  return siqilgan
    ? { lugat: `<< ${lugat} /Length ${siqilgan.length} /Filter /FlateDecode >>`, oqim: siqilgan }
    : { lugat: `<< ${lugat} /Length ${bayt.length} >>`, oqim: bayt };
}

function toUnicode(ishlatilgan: Map<number, string>) {
  const qatorlar = [...ishlatilgan].map(([glyph, belgi]) => {
    const utf16 = Array.from({ length: belgi.length }, (_, i) => hex4(belgi.charCodeAt(i))).join("");
    return `<${hex4(glyph)}> <${utf16}>`;
  });
  const bloklar: string[] = [];
  for (let i = 0; i < qatorlar.length; i += 100) {
    const qism = qatorlar.slice(i, i + 100);
    bloklar.push(`${qism.length} beginbfchar\n${qism.join("\n")}\nendbfchar`);
  }
  return `/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n${bloklar.join("\n")}\nendcmap\nCMapName currentdict /CMap defineresource pop\nend\nend`;
}

/**
 * Bir sahifali A4 PDF: `buyruqlar` — sahifa mazmuni (matn operandlari `PdfShrifti.kodla` bilan), `shriftlar` — resurs nomi → shrift
 * (masalan F1 — oddiy, F2 — qalin). Har bir shrift faqat ishlatilgan glyphlari bilan joylanadi.
 */
export async function pdfYigish(buyruqlar: string, shriftlar: Record<string, PdfShrifti>): Promise<Uint8Array> {
  const obyektlar: PdfObyekt[] = [];
  const qosh = (o: PdfObyekt) => { obyektlar.push(o); return obyektlar.length; };
  const katalog = qosh("");
  const sahifalar = qosh("");
  const sahifa = qosh("");
  const resurslar: string[] = [];
  for (const [indeks, [kalit, pdfShrift]] of Object.entries(shriftlar).entries()) {
    const s = pdfShrift.shrift;
    const masshtab = (son: number) => Math.round((son * 1000) / s.unitsPerEm);
    // Subset shrift nomi: 6 ta katta harf + "+" (har bir shriftga alohida).
    const nom = `YEPOS${String.fromCharCode(65 + indeks)}+${s.nom}`;
    const subset = ttfSubset(s, pdfShrift.ishlatilgan.keys());
    const fayl = qosh(await oqimObyekti(`/Length1 ${subset.length}`, subset));
    const tavsif = qosh(`<< /Type /FontDescriptor /FontName /${nom} /Flags 32 /FontBBox [${s.bbox.map(masshtab).join(" ")}] /ItalicAngle 0 /Ascent ${masshtab(s.ascent)} /Descent ${masshtab(s.descent)} /CapHeight ${masshtab(s.capHeight)} /StemV ${s.qalin ? 140 : 80} /FontFile2 ${fayl} 0 R >>`);
    const kengliklar = [...pdfShrift.ishlatilgan.keys()].sort((a, b) => a - b).map((g) => `${g} [${masshtab(s.kengliklar[g])}]`).join(" ");
    const cid = qosh(`<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${nom} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${tavsif} 0 R /DW ${masshtab(s.kengliklar[0])} /W [${kengliklar}] /CIDToGIDMap /Identity >>`);
    const unicode = qosh(await oqimObyekti("", kodlovchi.encode(toUnicode(pdfShrift.ishlatilgan))));
    const shriftObyekti = qosh(`<< /Type /Font /Subtype /Type0 /BaseFont /${nom} /Encoding /Identity-H /DescendantFonts [${cid} 0 R] /ToUnicode ${unicode} 0 R >>`);
    resurslar.push(`/${kalit} ${shriftObyekti} 0 R`);
  }
  const mazmun = qosh(await oqimObyekti("", kodlovchi.encode(buyruqlar)));
  obyektlar[katalog - 1] = `<< /Type /Catalog /Pages ${sahifalar} 0 R >>`;
  obyektlar[sahifalar - 1] = `<< /Type /Pages /Kids [${sahifa} 0 R] /Count 1 >>`;
  obyektlar[sahifa - 1] = `<< /Type /Page /Parent ${sahifalar} 0 R /MediaBox [0 0 595 842] /Resources << /Font << ${resurslar.join(" ")} >> >> /Contents ${mazmun} 0 R >>`;

  const qismlar: Uint8Array[] = [kodlovchi.encode("%PDF-1.4\n%âãÏÓ\n")];
  let uzunlik = qismlar[0].length;
  const ofsetlar: number[] = [];
  const yoz = (b: Uint8Array) => { qismlar.push(b); uzunlik += b.length; };
  obyektlar.forEach((o, i) => {
    ofsetlar.push(uzunlik);
    if (typeof o === "string") yoz(kodlovchi.encode(`${i + 1} 0 obj\n${o}\nendobj\n`));
    else {
      yoz(kodlovchi.encode(`${i + 1} 0 obj\n${o.lugat}\nstream\n`));
      yoz(o.oqim);
      yoz(kodlovchi.encode("\nendstream\nendobj\n"));
    }
  });
  const xref = uzunlik;
  yoz(kodlovchi.encode(`xref\n0 ${obyektlar.length + 1}\n0000000000 65535 f \n${ofsetlar.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${obyektlar.length + 1} /Root ${katalog} 0 R >>\nstartxref\n${xref}\n%%EOF`));
  const natija = new Uint8Array(uzunlik);
  let p = 0;
  for (const q of qismlar) { natija.set(q, p); p += q.length; }
  return natija;
}
