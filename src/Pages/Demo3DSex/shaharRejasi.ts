// Zavod hududi va atrofdagi shaharchaning sof rejasi (React va three.js yo'q — testlar to'g'ridan-to'g'ri tekshiradi).
// Bu yerda faqat raqamlar: yer qoplamalari (asfalt, beton, piyoda yo'laklari), panjara, ko'chalar, tashqi avtoturargoh,
// shahar binolari, daraxtlar va chiroqlar joylashuvi. Chizish — Shaharcha.tsx da.
import {
  ASOSIY_YOL,
  AVTOBUS_BEKATI,
  DARVOZA,
  GALEREYA,
  HUDUD,
  KIRISH_YOLI,
  KONDALANG_YOLLAR,
  KPP,
  KUTISH_JOYLARI,
  MAISHIY,
  OFIS,
  ORQA_YOL,
  SEX,
  TASHQI_TURARGOH,
} from "./hudud.ts";

/** O'qlarga parallel to'rtburchak (metr): x0 < x1, z0 < z1. */
export type Tortburchak = { x0: number; x1: number; z0: number; z1: number };
export const tb = (x0: number, x1: number, z0: number, z1: number): Tortburchak => ({ x0, x1, z0, z1 });

/** Ikki to'rtburchak ustma-ust tushadimi (faqat tegib turish — kesishish emas). `zaxira` — orasidagi eng kam masofa. */
export function kesishadi(a: Tortburchak, b: Tortburchak, zaxira = 0) {
  return a.x0 < b.x1 + zaxira && a.x1 > b.x0 - zaxira && a.z0 < b.z1 + zaxira && a.z1 > b.z0 - zaxira;
}

export function nuqtaIchida(x: number, z: number, t: Tortburchak, zaxira = 0) {
  return x > t.x0 - zaxira && x < t.x1 + zaxira && z > t.z0 - zaxira && z < t.z1 + zaxira;
}

/** Takrorlanadigan "tasodifiy" son (materiallar.ts dagi `urugli` bilan bir xil algoritm). */
export function urugliSon(urug: number) {
  let s = urug >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Shaharcha radiusi (undan tashqarida — tuman va bo'sh yer). */
export const SHAHAR_RADIUSI = 260;
/** Yer tekisligi o'lchami. */
export const YER_OLCHAMI = 1200;
/** Ko'cha trotuari eni (asfalt chetidan). */
export const TROTUAR_ENI = 1.7;

// ── Hudud ichidagi binolar va inshootlar (oyoq izlari) ──

/** Boshqa fayllar chizadigan binolar: ishlab chiqarish (SexMuhiti), ofis (Ofis), maishiy blok va galereya (Maishiy). Bu yerda bo'sh qoladi. */
export const BINOLAR_IZI = {
  sex: tb(-SEX.eni / 2, SEX.eni / 2, -SEX.chuqurlik / 2, SEX.chuqurlik / 2),
  ofis: tb(OFIS.x0, OFIS.x1, OFIS.z0, OFIS.z1),
  maishiy: tb(MAISHIY.x0, MAISHIY.x1, MAISHIY.z0, MAISHIY.z1),
  galereya: tb(GALEREYA.x0, GALEREYA.x1, GALEREYA.z0, GALEREYA.z1),
} as const;

/** KPP binosi (orolda). */
export const KPP_BINOSI = tb(KPP.x - KPP.yarimEni, KPP.x + KPP.yarimEni, KPP.z0, KPP.z1);
/** KPP oroli: bordyurli, 15 sm baland; KPP binosi, navis ustunlari va turniket yo'lagi shu yerda. Qatorlar: x −7…−2.3 va 2.3…7. */
export const KPP_OROLI = tb(-2.3, 2.3, 38.4, 50.6);
export const OROL_BALANDLIGI = 0.15;

/** Navis (KPP ustidagi katta soyabon) — ikkala qatorni yopadi. Ostki tekisligi 5.4 m (yuk mashinasi bemalol o'tadi). */
export const NAVIS = { x0: -8.7, x1: 8.7, z0: 38.4, z1: 48.0, past: 5.4, baland: 6.3 } as const;
/** Navis ustunlari [x, z]: qatorlar tashqarisida va orolda (shlagbaum ustunlari x = ±7.2, z = 43.5 bo'sh qoladi). */
export const NAVIS_USTUNLARI: ReadonlyArray<readonly [number, number]> = [
  [-8.2, 39.1], [-1.7, 39.1], [1.7, 39.1], [8.2, 39.1],
  [-8.2, 47.5], [-1.7, 47.5], [1.7, 47.5], [8.2, 47.5],
];

/** Orqa hovli jihozlari (oyoq izlari — daraxt va chiroqlar bularga tushmaydi). */
export const ORQA_JIHOZLAR = {
  kotelxona: tb(-22, -12, -33, -26),
  mori: tb(-11, -9.4, -30.8, -29.2),
  gazShkafi: tb(-26.2, -24.8, -30.1, -28.9),
  silos: tb(7.5, 12.5, -31.5, -26.5),
  transformator: tb(43, 51, -34.5, -28),
  konteynerlar: tb(22.6, 30.6, -22.4, -20),
  paletlar: tb(15.2, 20.6, -21.6, -19.4),
} as const;

/** Bayroqlar (ofis kirishi oldida): o'rtadagisi — O'zbekiston bayrog'i (balandroq), yonida ikkita neytral korxona bayrog'i. */
export const BAYROQLAR = [
  { x: -56.6, z: 45.6, h: 9, tur: "korxona" },
  { x: -53.6, z: 45.6, h: 10.5, tur: "ozbekiston" },
  { x: -50.6, z: 45.6, h: 9, tur: "sifat" },
] as const;

// ── Yer qoplamalari ──

/** Hudud ichidagi asfalt (yuk mashinalari yuradigan joylar). Bir-birining ustiga tushmaydi. */
export const HUDUD_ASFALTI: readonly Tortburchak[] = [
  // Old hovli: darvozadan rampalargacha va kutish maydonigacha (x −38…44, z 15…48)
  tb(-38, 44, SEX.chuqurlik / 2, HUDUD.old),
  // Chap qatorga burilish (ofis bilan sex orasida)
  tb(-48, -38, SEX.chuqurlik / 2, OFIS.z0),
  // Ofis oldidagi maydoncha
  tb(-48, -38, OFIS.z1, HUDUD.old),
  // Chap qator: 3- va 4-rampalarga (x −48…−32, z −26…15)
  tb(-48, -SEX.eni / 2, -26, SEX.chuqurlik / 2),
  // Sex orqasidagi xizmat yo'li (orqa hovliga)
  tb(-SEX.eni / 2, 36, -24, -SEX.chuqurlik / 2),
  // Yuk mashinalari kutish maydoni
  tb(44, 62, 32, HUDUD.old),
];

const KOCHA_CHETI = ASOSIY_YOL.z - ASOSIY_YOL.eni / 2; // 64 — asosiy ko'cha asfaltining yaqin cheti

/** Tashqi avtoturargoh asfalti (qatorlar z 52.8 va 58.7, chiqish x ≈ 14, kirish x ≈ 62). */
export const TURARGOH_ASFALTI = tb(TASHQI_TURARGOH.x0 - 1.2, TASHQI_TURARGOH.x1 + 2.8, TASHQI_TURARGOH.z0 - 0.3, TASHQI_TURARGOH.z1 + 0.3);
/** Avtoturargohdan ko'chaga chiqish (x ≈ 14). */
export const TURARGOH_CHIQISHI = tb(TASHQI_TURARGOH.x0 - 2.8, TASHQI_TURARGOH.x0 + 2.8, TURARGOH_ASFALTI.z1, KOCHA_CHETI);
/** Ko'chadan avtoturargohga kirish (x ≈ 62). */
export const TURARGOH_KIRISHI = tb(TASHQI_TURARGOH.x1 - 2.8, TASHQI_TURARGOH.x1 + 2.8, TURARGOH_ASFALTI.z1, KOCHA_CHETI);

/** Hududdan tashqaridagi asfalt: darvozadan ko'chagacha kirish yo'li va avtoturargoh. */
export const TASHQI_ASFALT: readonly Tortburchak[] = [
  tb(KIRISH_YOLI.x0, KIRISH_YOLI.x1, KIRISH_YOLI.z0, KIRISH_YOLI.z1),
  TURARGOH_ASFALTI,
  TURARGOH_CHIQISHI,
  TURARGOH_KIRISHI,
];

/** Beton maydonlar (asfaltga tegmaydi): ofis va maishiy blok atrofi, orqa hovli jihozlari ostidagi plitalar. */
export const BETON_MAYDONLAR: readonly Tortburchak[] = [
  BINOLAR_IZI.ofis,
  tb(MAISHIY.x0 - 1, MAISHIY.x1 + 1, MAISHIY.z0 - 1, MAISHIY.z1 + 1),
  tb(-27, -8, -34.5, -24.5),
  tb(6, 14, -33, -24.5),
  tb(42.5, 51.5, -35, -27.5),
];

/** Hudud ichidagi piyoda yo'laklari (och beton plitka, PIYODA_YOLLARI bo'ylab). Bir-birining ustiga tushmaydi. */
export const PIYODA_YOLAKLARI: readonly Tortburchak[] = [
  // KPP → maishiy blok: z = 45.8 bo'ylab (chiqish qatori ustidagi zebradan keyin), so'ng x = 64 bo'ylab panjara yonidan
  tb(7, 64.8, 45, 46.6),
  tb(63.2, 64.8, -5.8, 45),
  tb(MAISHIY.x1, 63.2, -5.8, -4.2),
  // KPP → ofis: z = 45.8 bo'ylab (kirish qatori ustidagi zebradan keyin), so'ng ofis eshigiga
  tb(-48.8, -7, 45, 46.6),
  tb(-48.8, -47.2, OFIS.z1, 45),
  // Ofis oldidagi maydon (bayroqlar shu yerda)
  tb(OFIS.x0, -48.8, OFIS.z1, 47.6),
];

/** Avtobus bekati maydonchasi (trotuardan kengaytirilgan). */
export const BEKAT_MAYDONI = tb(AVTOBUS_BEKATI.x - 5.5, AVTOBUS_BEKATI.x + 5.5, 59.6, KOCHA_CHETI - TROTUAR_ENI);

/** Hududdan tashqaridagi trotuarlar (ko'tarilgan, plitka): bekatdan va avtoturargohdan KPP ga. */
export const TASHQI_TROTUARLAR: readonly Tortburchak[] = [
  tb(-10.4, -8.6, 48.6, KOCHA_CHETI - TROTUAR_ENI),
  tb(8.6, TURARGOH_ASFALTI.x0, 48.7, 50.3),
  tb(11.2, TURARGOH_ASFALTI.x0, 50.3, 56.6),
  BEKAT_MAYDONI,
];

/** Piyodalar o'tish joylari (zebra): KPP yon eshiklaridan (z = 45.8) va tashqaridan KPP old eshigiga (z = 49.5). */
export const ZEBRALAR: readonly Tortburchak[] = [
  tb(-7, -2.3, 44.6, 47),
  tb(2.3, 7, 44.6, 47),
  tb(-8.5, -2.3, 48.6, 50.4),
  tb(2.3, 8.5, 48.6, 50.4),
];

/** Asosiy ko'chadagi piyodalar o'tish joyi (avtobus bekati yonida). */
export const KOCHA_ZEBRASI_X = AVTOBUS_BEKATI.x + 7.5;

/** Sun'iy notekisliklar (ikkala qatorda): kirish — ko'chadan kelishda, chiqish — shlagbaumdan oldin. */
export const TEZLIK_TOSIQLARI = [
  { x0: -7, x1: -2.3, z: 53.2 },
  { x0: 2.3, x1: 7, z: 40.3 },
] as const;

/** To'xtash chiziqlari (shlagbaumlardan oldin): kirish −z ga harakatlanadi, chiqish +z ga. */
export const TOXTASH_CHIZIQLARI = [
  { x0: -7, x1: -2.3, z: 44.25 },
  { x0: 2.3, x1: 7, z: 42.75 },
] as const;

/** Yo'nalish strelkalari: [x, z, burchak] (burchak 0 — strelka −z ga qaraydi; π/2 — −x; −π/2 — +x; π — +z). */
export const STRELKALAR: ReadonlyArray<readonly [number, number, number]> = [
  [-4.5, 58.5, 0],
  [4.5, 57.5, Math.PI],
  [-4.5, 34.5, 0],
  [4.5, 33.5, Math.PI],
  [10, 28.5, -Math.PI / 2],
  [-24, 22, Math.PI / 2],
  [-44.5, 8, 0],
  [-44.5, -14, 0],
  [TASHQI_TURARGOH.x1, 60.2, 0],
  [TASHQI_TURARGOH.x0, 60.2, Math.PI],
];

/** Avtoturargoh joylari chegara chiziqlari: x = x0 + qadam·k (k = 1…16), har qatorda 15 ta joy; chetdagi bo'laklar — kirish/chiqish yo'lagi. */
export function turargohChiziqlari() {
  const natija: Array<{ x: number; z0: number; z1: number; qator: number }> = [];
  const son = Math.floor((TASHQI_TURARGOH.x1 - TASHQI_TURARGOH.x0) / TASHQI_TURARGOH.qadam);
  TASHQI_TURARGOH.qatorlar.forEach((qz, qator) => {
    for (let k = 1; k < son; k++) natija.push({ x: TASHQI_TURARGOH.x0 + k * TASHQI_TURARGOH.qadam, z0: qz - 2.4, z1: qz + 2.4, qator });
  });
  return natija;
}

/** Avtoturargoh joylari markazlari (chiziqlar orasida): birinchi qator oldi −z ga (panjaraga), ikkinchisi +z ga (ko'chaga). */
export function turargohJoylari() {
  const ch = turargohChiziqlari();
  const natija: Array<{ x: number; z: number; oldi: 1 | -1 }> = [];
  TASHQI_TURARGOH.qatorlar.forEach((qz, qator) => {
    const xlar = ch.filter((c) => c.qator === qator).map((c) => c.x);
    for (let i = 0; i + 1 < xlar.length; i++) natija.push({ x: (xlar[i] + xlar[i + 1]) / 2, z: qz, oldi: qator === 0 ? -1 : 1 });
  });
  return natija;
}

// ── Panjara ──

export type Kesma = readonly [readonly [number, number], readonly [number, number]];
/** Darvoza ustunlari markazi (x = ±8.85, z = 48). */
export const DARVOZA_USTUNI_X = DARVOZA.yarimEni + 0.35;
export const PANJARA_BALANDLIGI = 2.03;
export const PANJARA_QADAMI = 2.5;

/** Panjara kesmalari (hudud chegarasi bo'ylab, darvoza ochig'i x −8.5…8.5 bo'sh qoladi). */
export const PANJARA_KESMALARI: readonly Kesma[] = [
  [[HUDUD.chap, HUDUD.old], [DARVOZA.x - DARVOZA_USTUNI_X - 0.3, HUDUD.old]],
  [[DARVOZA.x + DARVOZA_USTUNI_X + 0.3, HUDUD.old], [HUDUD.ong, HUDUD.old]],
  [[HUDUD.ong, HUDUD.old], [HUDUD.ong, HUDUD.orqa]],
  [[HUDUD.ong, HUDUD.orqa], [HUDUD.chap, HUDUD.orqa]],
  [[HUDUD.chap, HUDUD.orqa], [HUDUD.chap, HUDUD.old]],
];

/** Panjara ustunlari: har kesmada teng bo'laklar (≈ 2.5 m), burchakdagi ustun bir marta. */
export function panjaraUstunlari(kesmalar: readonly Kesma[] = PANJARA_KESMALARI) {
  const joylar: Array<[number, number]> = [];
  const bor = new Set<string>();
  for (const [a, c] of kesmalar) {
    const n = Math.max(1, Math.round(Math.hypot(c[0] - a[0], c[1] - a[1]) / PANJARA_QADAMI));
    for (let i = 0; i <= n; i++) {
      const x = a[0] + ((c[0] - a[0]) * i) / n;
      const z = a[1] + ((c[1] - a[1]) * i) / n;
      const kalit = `${x.toFixed(2)}|${z.toFixed(2)}`;
      if (bor.has(kalit)) continue;
      bor.add(kalit);
      joylar.push([x, z]);
    }
  }
  return joylar;
}

// ── Ko'chalar ──

/** Ko'cha o'qlari: x bo'ylab (z = const) va z bo'ylab (x = const). Birinchi ikkitasi — hudud.ts dagi asosiy va orqa ko'chalar. */
export const X_KOCHALAR = [
  { z: ASOSIY_YOL.z, eni: ASOSIY_YOL.eni },
  { z: ORQA_YOL.z, eni: ORQA_YOL.eni },
  { z: 152, eni: 7 },
  { z: -140, eni: 7 },
] as const;
export const Z_KOCHALAR = [
  { x: KONDALANG_YOLLAR[0], eni: 8 },
  { x: KONDALANG_YOLLAR[1], eni: 8 },
  { x: -170, eni: 7 },
  { x: 182, eni: 7 },
] as const;
export const KOCHA_UZUNLIGI = SHAHAR_RADIUSI * 2 + 80;

export type Uzilish = { yon: -1 | 0 | 1; a: number; c: number };
/** Bitta to'g'ri ko'cha bo'lagi. `uzilishlar` — o'q bo'ylab (absolyut koordinata) trotuar, bordyur va chekka chiziq uziladigan joylar; yon 0 — ikkala tomonda. */
export type KochaBolagi = { boylab: "x" | "z"; markaz: readonly [number, number]; uzunlik: number; eni: number; uzilishlar: Uzilish[] };

export function kochalarRejasi(): KochaBolagi[] {
  const L = KOCHA_UZUNLIGI;
  const natija: KochaBolagi[] = [];
  for (const k of X_KOCHALAR) {
    const uzilishlar: Uzilish[] = Z_KOCHALAR.map((z) => ({ yon: 0, a: z.x - z.eni / 2 - TROTUAR_ENI - 0.1, c: z.x + z.eni / 2 + TROTUAR_ENI + 0.1 }));
    if (k.z === ASOSIY_YOL.z) {
      // Hudud tomonida (−z): kirish yo'li va avtoturargoh chiqish/kirish yo'llari trotuarni kesib o'tadi.
      for (const t of [TASHQI_ASFALT[0], TURARGOH_CHIQISHI, TURARGOH_KIRISHI]) uzilishlar.push({ yon: -1, a: t.x0, c: t.x1 });
    }
    natija.push({ boylab: "x", markaz: [0, k.z], uzunlik: L, eni: k.eni, uzilishlar });
  }
  for (const k of Z_KOCHALAR) {
    // Ko'ndalang ko'cha x bo'ylab ketgan ko'chalar kesishmasida bo'linadi (ustma-ust tushmasin).
    const chegaralar = [-L / 2];
    for (const x of [...X_KOCHALAR].sort((a, c) => a.z - c.z)) chegaralar.push(x.z - x.eni / 2 - TROTUAR_ENI, x.z + x.eni / 2 + TROTUAR_ENI);
    chegaralar.push(L / 2);
    for (let i = 0; i + 1 < chegaralar.length; i += 2) {
      const [a, c] = [chegaralar[i], chegaralar[i + 1]];
      if (c - a > 1) natija.push({ boylab: "z", markaz: [k.x, (a + c) / 2], uzunlik: c - a, eni: k.eni, uzilishlar: [] });
    }
  }
  return natija;
}

/** To'rtburchak birorta ko'cha (asfalt + trotuar + `zaxira`) ustiga tushadimi. */
export function kochaUstidami(t: Tortburchak, zaxira = 0) {
  for (const k of X_KOCHALAR) {
    const y = k.eni / 2 + TROTUAR_ENI + zaxira;
    if (t.z0 < k.z + y && t.z1 > k.z - y) return true;
  }
  for (const k of Z_KOCHALAR) {
    const y = k.eni / 2 + TROTUAR_ENI + zaxira;
    if (t.x0 < k.x + y && t.x1 > k.x - y) return true;
  }
  return false;
}

/** Zavod bloki (ko'ndalang, orqa va asosiy ko'chalar orasi): hudud, tashqi avtoturargoh, bekat va old bog' — shahar binolari tushmaydi. */
export const ZAVOD_BLOKI = tb(KONDALANG_YOLLAR[0] + 4 + TROTUAR_ENI, KONDALANG_YOLLAR[1] - 4 - TROTUAR_ENI, ORQA_YOL.z + 4 + TROTUAR_ENI, KOCHA_CHETI);
/** Asosiy ko'chaning narigi tomonidagi bog' (kamera shu tomondan qaraydi — faqat daraxtlar va yo'lkalar). */
export const OLD_BOG = tb(-54, 66, ASOSIY_YOL.z + ASOSIY_YOL.eni / 2 + TROTUAR_ENI + 2, 128);
/** Bog' yo'lkalari (plitka). */
export const BOG_YOLKALARI: readonly Tortburchak[] = [
  tb(OLD_BOG.x0 + 2, OLD_BOG.x1 - 2, 99, 101.6),
  tb(7, 9.6, OLD_BOG.z0, 99),
  tb(7, 9.6, 101.6, OLD_BOG.z1 - 2),
];

// ── Shahar binolari ──

export const BINO_TURLARI = ["panel", "gisht", "ofis", "ombor", "uy", "dokon"] as const;
export type BinoTuri = (typeof BINO_TURLARI)[number];
/** tekis — tekis tom (parapet va jihozlar bilan), tortQiya — to'rt yonli qiya tom (uylar), ikkiQiya — ikki yonli (omborlar). */
export type TomTuri = "tekis" | "tortQiya" | "ikkiQiya";
export type Bino = {
  x: number; z: number; w: number; d: number; h: number;
  /** Pastki sathi (podium ustidagi minora uchun > 0). */
  y0: number;
  tur: BinoTuri;
  tom: TomTuri;
  /** Qiya tom rangi (0 — qizil cherepitsa, 1 — yashil metall, 2 — kulrang metall). */
  tomRang: 0 | 1 | 2;
  /** Pastki qavatdagi do'konlar balandligi (0 — yo'q). */
  dokon: number;
  /** Podium ustidagi minora (oyoq izi podium ichida). */
  ustida?: boolean;
};

/** Uzoq shahar qatlamlari (har biri bitta draw call): devor turlari + tom materiallari + tom jihozlari + daraxt (tana, barg) + chiroq (ustun, bosh). */
export const SHAHAR_QATLAMLARI = { devorlar: BINO_TURLARI.length, tekisTom: 1, qiyaTomlar: 3, tomJihozlari: 1, daraxt: 2, chiroq: 2 } as const;

export const binoIzi = (b: Bino) => tb(b.x - b.w / 2, b.x + b.w / 2, b.z - b.d / 2, b.z + b.d / 2);

/** Bino shu joyga tushadimi: shahar doirasida, ko'chalardan (trotuardan) kamida 3 m, zavod bloki va old bog'dan tashqarida. */
export function binoJoyiBormi(t: Tortburchak) {
  const R = SHAHAR_RADIUSI;
  if (Math.hypot((t.x0 + t.x1) / 2, (t.z0 + t.z1) / 2) > R) return false;
  if (kesishadi(t, ZAVOD_BLOKI, 3) || kesishadi(t, OLD_BOG, 2)) return false;
  return !kochaUstidami(t, 3);
}

/** Shahar binolari: ofis minoralari, ko'p qavatli uylar, sanoat omborlari, do'konlar, mahalla uylari (bir-biriga tegmaydi). */
export function shaharBinolari(): Bino[] {
  const R = SHAHAR_RADIUSI;
  const rnd = urugliSon(2024);
  const ora = (a: number, c: number) => a + rnd() * (c - a);
  const natija: Bino[] = [];
  const izlar: Tortburchak[] = [];
  const qosh = (b: Bino, oraliq: number) => {
    const t = binoIzi(b);
    if (!binoJoyiBormi(t) || izlar.some((o) => kesishadi(t, o, oraliq))) return false;
    izlar.push(t);
    natija.push(b);
    return true;
  };
  const asos = { y0: 0, tom: "tekis" as TomTuri, tomRang: 0 as const, dokon: 0 };

  // 1) Ish markazi (orqada, o'rtaga yaqin): podium (do'konlar) va shisha minora — zavod ortidagi siluet.
  let ofislar = 0;
  for (let i = 0; i < 60 && ofislar < 7; i++) {
    const podium: Bino = { ...asos, x: ora(-120, 130), z: ora(-210, -66), w: ora(26, 36), d: ora(20, 28), h: ora(5.4, 7.6), tur: "dokon" };
    if (!qosh(podium, 8)) continue;
    ofislar++;
    natija.push({ ...asos, x: podium.x + ora(-2, 2), z: podium.z + ora(-1.5, 1.5), w: podium.w - ora(9, 13), d: podium.d - ora(7, 10), h: ora(26, 68), y0: podium.h, tur: "ofis", ustida: true });
  }
  // 2) Sanoat omborlari (o'ng tomonda, zavod qo'shnilari).
  for (let i = 0; i < 1500; i++) {
    const x = ora(KONDALANG_YOLLAR[1] + 8, R);
    const z = ora(-130, 64);
    qosh({ ...asos, x, z, w: ora(18, 42), d: ora(14, 26), h: ora(7, 12), tur: "ombor", tom: "ikkiQiya", tomRang: rnd() < 0.5 ? 2 : 1 }, 6);
  }
  // 3) Ko'p qavatli uylar (orqada va uzoq oldda): uzun panel uylar va g'isht uylar.
  for (let i = 0; i < 5000; i++) {
    const orqa = rnd() < 0.62;
    const x = ora(-R, R);
    const z = orqa ? ora(-R, ORQA_YOL.z - 10) : ora(98, R);
    const gisht = rnd() < 0.3;
    const uzun = gisht ? ora(18, 34) : ora(26, 58);
    const en = gisht ? ora(12, 15) : ora(11.5, 13.5);
    const xBoylab = rnd() < 0.68;
    const qavat = gisht ? 4 + Math.floor(rnd() * 3) : [5, 9, 9, 9, 12, 16][Math.floor(rnd() * 6)];
    const dokon = !orqa && z < 118 && rnd() < 0.6 ? 4.2 : 0;
    qosh({ ...asos, x, z, w: xBoylab ? uzun : en, d: xBoylab ? en : uzun, h: dokon + qavat * 3 + 0.6, tur: gisht ? "gisht" : "panel", dokon }, 6);
  }
  // 4) Asosiy ko'chaning narigi tomonida bir-ikki qavatli do'konlar va ko'p qavatli uylar (pastida do'kon).
  for (let i = 0; i < 1500; i++) {
    const x = ora(-R, R);
    const z = ora(78, 98);
    if (rnd() < 0.5) qosh({ ...asos, x, z, w: ora(12, 26), d: ora(10, 15), h: rnd() < 0.5 ? 4.6 : 7.8, tur: "dokon" }, 4);
    else qosh({ ...asos, x, z, w: ora(24, 40), d: ora(12, 13.5), h: 4.2 + 5 * 3 + 0.6, tur: "panel", dokon: 4.2 }, 6);
  }
  // 5) Mahalla (hovli uylar, qiya tomlar): chapda va old burchaklarda.
  for (let i = 0; i < 9000; i++) {
    const chap = rnd() < 0.72;
    const x = chap ? ora(-R, KONDALANG_YOLLAR[0] - 8) : ora(KONDALANG_YOLLAR[1] + 8, R);
    const z = chap ? ora(-120, 150) : ora(70, 150);
    qosh({ ...asos, x, z, w: ora(8, 11.5), d: ora(7.5, 10), h: rnd() < 0.35 ? 6.6 : 3.4, tur: "uy", tom: "tortQiya", tomRang: Math.floor(rnd() * 3) as 0 | 1 | 2 }, 2.2);
  }
  return natija;
}

// ── Daraxtlar ──

export type DaraxtTuri = "oddiy" | "terak" | "buta";
export type Daraxt = { x: number; z: number; tur: DaraxtTuri; r: number };

/** Daraxt tanasi tushmasligi kerak bo'lgan joylar (asfalt, trotuar, piyoda yo'laklari, binolar, jihozlar). */
function tosiqlar(binolar: readonly Bino[]) {
  const qattiq: Tortburchak[] = [
    ...HUDUD_ASFALTI,
    ...TASHQI_ASFALT,
    ...TASHQI_TROTUARLAR,
    ...PIYODA_YOLAKLARI,
    ...BETON_MAYDONLAR,
    ...Object.values(BINOLAR_IZI),
    ...Object.values(ORQA_JIHOZLAR),
    ...BOG_YOLKALARI,
    KPP_OROLI,
  ];
  const binoIzlari = binolar.filter((b) => !b.ustida).map(binoIzi);
  return { qattiq, binoIzlari, chiroqlar: chiroqlarRejasi() };
}

/** Panjara chizig'iga yaqinmi (daraxt panjarani yorib o'tmasin). */
function panjaraYonida(x: number, z: number, zaxira: number) {
  const ichida = x > HUDUD.chap - zaxira && x < HUDUD.ong + zaxira && z > HUDUD.orqa - zaxira && z < HUDUD.old + zaxira;
  if (!ichida) return false;
  return Math.min(Math.abs(x - HUDUD.chap), Math.abs(x - HUDUD.ong), Math.abs(z - HUDUD.orqa), Math.abs(z - HUDUD.old)) < zaxira;
}

export function daraxtJoyiBormi(x: number, z: number, r: number, t: ReturnType<typeof tosiqlar>) {
  if (Math.hypot(x, z) > SHAHAR_RADIUSI + 15) return false;
  const nuqta = tb(x - 0.3, x + 0.3, z - 0.3, z + 0.3);
  if (kochaUstidami(nuqta, 0.5)) return false;
  if (t.qattiq.some((q) => nuqtaIchida(x, z, q, 0.6 + r * 0.25))) return false;
  if (t.binoIzlari.some((q) => nuqtaIchida(x, z, q, r * 0.8 + 0.5))) return false;
  if (t.chiroqlar.some((c) => Math.hypot(c.x - x, c.z - z) < 1.2 + r * 0.5)) return false;
  return !panjaraYonida(x, z, Math.max(1, r * 0.75));
}

/** Daraxtlar: ko'chalar bo'ylab teraklar, hudud chetlari, old bog', avtoturargoh atrofi, mahalla hovlilari. */
export function daraxtlarRejasi(binolar: readonly Bino[]): Daraxt[] {
  const rnd = urugliSon(808);
  const t = tosiqlar(binolar);
  const natija: Daraxt[] = [];
  const qosh = (x: number, z: number, tur: DaraxtTuri, r: number) => {
    if (daraxtJoyiBormi(x, z, r, t)) natija.push({ x, z, tur, r });
  };
  const R = SHAHAR_RADIUSI;
  // Ko'chalar bo'ylab (trotuar ortida): x bo'ylab — teraklar, z bo'ylab — keng tojli daraxtlar.
  for (const k of X_KOCHALAR) {
    const y = k.eni / 2 + TROTUAR_ENI + 1.4;
    for (let x = -R; x <= R; x += 9) {
      for (const yon of [-1, 1]) {
        if (k.z === ASOSIY_YOL.z && yon === -1 && x > ZAVOD_BLOKI.x0 && x < ZAVOD_BLOKI.x1) continue;
        qosh(x + rnd() * 1.2, k.z + yon * (y + rnd() * 0.4), k.z === ASOSIY_YOL.z || k.z === ORQA_YOL.z ? "terak" : "oddiy", 1.4 + rnd() * 0.6);
      }
    }
  }
  for (const k of Z_KOCHALAR) {
    const y = k.eni / 2 + TROTUAR_ENI + 1.4;
    for (let z = -R; z <= R; z += 10) for (const yon of [-1, 1]) qosh(k.x + yon * (y + rnd() * 0.4), z + rnd() * 1.5, "oddiy", 1.6 + rnd() * 0.8);
  }
  // Hudud ichi: orqa panjara bo'ylab teraklar, chap va o'ng panjara bo'ylab daraxtlar.
  for (let x = HUDUD.chap + 3; x < HUDUD.ong - 2; x += 5.5) qosh(x, HUDUD.orqa + 1.6, "terak", 1.15);
  for (let z = HUDUD.orqa + 4; z < OFIS.z0 - 2; z += 5) qosh(HUDUD.chap + 1.7, z, "oddiy", 1.3 + rnd() * 0.4);
  for (let z = HUDUD.orqa + 4; z < 30; z += 5) qosh(HUDUD.ong - 1.4, z, "terak", 1.05);
  // Maishiy blok bilan kutish maydoni orasidagi maysa (dam olish joyi)
  for (const [x, z] of [[47, 11], [53, 13], [59, 10.5], [46.5, 20], [55, 22], [60, 27], [49, 27.5]]) qosh(x + rnd(), z + rnd(), "oddiy", 1.5 + rnd() * 0.6);
  // Hudud bilan ko'ndalang/orqa ko'chalar orasidagi yashil tasma
  for (let z = HUDUD.orqa - 4; z < HUDUD.old + 14; z += 5.5) {
    qosh(HUDUD.chap - 5 + rnd() * 2, z + rnd() * 2, "oddiy", 1.7 + rnd() * 0.8);
    qosh(HUDUD.ong + 5.5 + rnd() * 3, z + rnd() * 2, "oddiy", 1.7 + rnd() * 0.8);
  }
  for (let x = HUDUD.chap - 6; x < HUDUD.ong + 8; x += 6) qosh(x + rnd() * 2, HUDUD.orqa - 3 + rnd(), "oddiy", 1.6 + rnd() * 0.7);
  // Panjara bilan ko'cha orasidagi old bog' (chapda) va avtoturargoh atrofi: daraxtlar va butalar
  for (const z of [51.4, 55.4, 59.2]) for (let x = HUDUD.chap + 1; x < -12; x += 6.2) qosh(x + rnd() * 1.5, z + rnd() * 0.8, rnd() < 0.18 ? "terak" : "oddiy", 1.6 + rnd() * 0.9);
  for (let x = TURARGOH_ASFALTI.x0 + 3; x < TURARGOH_ASFALTI.x1; x += 2.2) qosh(x, HUDUD.old + 1.15, "buta", 0.62);
  for (let x = HUDUD.chap; x < -11; x += 2.1) qosh(x, HUDUD.old + 1.1, "buta", 0.6);
  for (let x = TURARGOH_ASFALTI.x1 + 3; x < ZAVOD_BLOKI.x1 - 1; x += 5) for (const z of [51, 56, 60.5]) qosh(x + rnd(), z + rnd(), "oddiy", 1.6 + rnd() * 0.6);
  // Old bog' (asosiy ko'chaning narigi tomoni)
  for (let i = 0; i < 150; i++) qosh(OLD_BOG.x0 + rnd() * (OLD_BOG.x1 - OLD_BOG.x0), OLD_BOG.z0 + rnd() * (OLD_BOG.z1 - OLD_BOG.z0), rnd() < 0.15 ? "terak" : "oddiy", 1.8 + rnd() * 1.4);
  // Mahalla hovlilaridagi mevali daraxtlar
  for (let i = 0; i < 320; i++) {
    const chap = rnd() < 0.75;
    qosh(chap ? -R + rnd() * (R + KONDALANG_YOLLAR[0] - 8) : KONDALANG_YOLLAR[1] + 8 + rnd() * (R - KONDALANG_YOLLAR[1] - 8), chap ? -120 + rnd() * 270 : 70 + rnd() * 80, "oddiy", 1.3 + rnd() * 0.9);
  }
  // Uylar orasidagi hovlilar (orqa va old mavzelar)
  for (let i = 0; i < 200; i++) qosh(-R + rnd() * 2 * R, rnd() < 0.6 ? -R + rnd() * (R + ORQA_YOL.z - 8) : 98 + rnd() * (R - 98), rnd() < 0.2 ? "terak" : "oddiy", 1.6 + rnd() * 1.0);
  return natija;
}

// ── Chiroqlar ──

/** Chiroq ustuni: [x, z] va kronshteyn yo'nalishi (burchak 0 — +x, π/2 — −z, −π/2 — +z, π — −x). */
export type Chiroq = { x: number; z: number; burchak: number };

export function chiroqlarRejasi(): Chiroq[] {
  const natija: Chiroq[] = [];
  const R = SHAHAR_RADIUSI;
  const tosiq = [...TASHQI_ASFALT, ...ZEBRALAR, KPP_OROLI, BEKAT_MAYDONI];
  const qosh = (x: number, z: number, burchak: number) => {
    if (Math.hypot(x, z) > R + 10) return;
    if (tosiq.some((t) => nuqtaIchida(x, z, t, 1.2))) return;
    if (Math.abs(x - KOCHA_ZEBRASI_X) < 3 || Math.abs(x - AVTOBUS_BEKATI.x) < 6.5 && Math.abs(z - AVTOBUS_BEKATI.z) < 4) return;
    natija.push({ x, z, burchak });
  };
  const kesishmada = (q: number, oqlar: readonly number[], y: number) => oqlar.some((o) => Math.abs(q - o) < y);
  // Ko'chalar: trotuar bordyuri yonida, kronshteyn ko'chaga qaraydi.
  X_KOCHALAR.forEach((k, i) => {
    const y = k.eni / 2 + 0.45;
    for (let x = -R; x <= R; x += 30) {
      if (kesishmada(x, Z_KOCHALAR.map((z) => z.x), 8)) continue;
      qosh(x, k.z - y, -Math.PI / 2);
      if (i < 2) qosh(x + 15, k.z + y, Math.PI / 2);
    }
  });
  Z_KOCHALAR.forEach((k, i) => {
    const y = k.eni / 2 + 0.45;
    for (let z = -R + 10; z <= R; z += 32) {
      if (kesishmada(z, X_KOCHALAR.map((x) => x.z), 8)) continue;
      qosh(k.x - y, z, 0);
      if (i < 2) qosh(k.x + y, z + 16, Math.PI);
    }
  });
  // Hudud ichi: old hovli (panjara yonida), chap qator, xizmat yo'li, panjara bo'yidagi piyoda yo'lagi.
  for (const x of [-40, -29, -18, 19, 31, 44, 57]) qosh(x, 47.2, Math.PI / 2);
  for (const z of [-20, -5, 9]) qosh(-48.7, z, 0);
  for (const x of [-20, 2, 22]) qosh(x, -24.7, -Math.PI / 2);
  for (const z of [-1.5, 13.5, 28.5]) qosh(65.6, z, Math.PI);
  // Tashqi avtoturargoh: ikki chetida.
  for (const x of [22, 36, 50]) {
    natija.push({ x, z: TURARGOH_ASFALTI.z1 + 0.45, burchak: Math.PI / 2 });
    natija.push({ x: x + 7, z: TURARGOH_ASFALTI.z0 - 0.45, burchak: -Math.PI / 2 });
  }
  return natija;
}

/** Hudud markazidagi KPP: piyoda yo'llari zebralari z = 45.8 (PIYODA_YOLLARI bilan mos). */
export const KPP_ZEBRA_Z = 45.8;
/** Kutish joylari belgilari: har bir joy 2.5 × 8.6 m, chiziqlar orasi 6 m. */
export const KUTISH_CHIZIQLARI = [...KUTISH_JOYLARI.map((k) => k.x - 3), KUTISH_JOYLARI[KUTISH_JOYLARI.length - 1].x + 3];
