// Zavod hududi va atrofdagi shaharcha rejasi (metr). y — yuqoriga, x — chapdan o'ngga, z — orqadan oldga (kamera old-o'ng tomondan qaraydi).
// Ishlab chiqarish binosi: x −32…32, z −15…15, balandligi 8 m. Old (z = 15) va o'ng (x = 32) devorlari qirqilgan — ichi ko'rinib turadi.

/** Ishlab chiqarish binosi o'lchami (materiallar.ts dagi SEX_ENI / SEX_CHUQURLIGI shu bilan bir xil). */
export const SEX = { eni: 64, chuqurlik: 30, balandlik: 8 } as const;

/**
 * Avtomatlashtirilgan prolyot (2-sex): asosiy sexning orqa devoriga tutashgan, x −32…32, z −41…−15, balandligi 9 m.
 * Zamonaviy texnika: avtomatik plita ombori, robotlar, konveyerlar, AGV. Asosiy sex bilan orqa devordagi ikki keng ochiq joy orqali bog'langan.
 * Tomsiz (ichi yuqoridan ko'rinadi), tashqi devorlari: orqa (z = −41) va chap (x = −32) to'liq, o'ng (x = 32) past.
 */
export const AVTO_SEX = { x0: -32, x1: 32, z0: -41, z1: -15, balandlik: 9 } as const;
/** Asosiy sex orqa devoridagi (z = −15) ochiq joylar — 2-sexga o'tish (pogruzchik va odamlar). */
export const ORQA_OCHIQLAR = [{ x: -12, eni: 8 }, { x: 12, eni: 8 }] as const;
export const ORQA_OCHIQ_BALANDLIGI = 5.5;

/** Zavod hududi chegarasi (panjara). */
export const HUDUD = { chap: -60, ong: 128, orqa: -70, old: 48 } as const;

/** Old panjaradagi darvoza ochig'i: x −8.5…8.5. O'rtada KPP oroli, ikki yonida — kirish va chiqish qatorlari. */
export const DARVOZA = { x: 0, yarimEni: 8.5 } as const;

/** KPP binosi (orolda): x −2…2, z 40…47. Ichida qorovul xonasi va piyodalar turniketi; old eshigi z = 47, orqa eshigi z = 40, yon eshiklari x = ±2. */
export const KPP = { x: 0, z0: 40, z1: 47, yarimEni: 2 } as const;

/** Kirish qatori (yuk mashinalari hududga kiradi): markazi x = −4.5, eni 5 m; shlagbaumi z = 43.5 da, ustuni chap chetda (x ≈ −7.2). */
export const KIRISH = { x: -4.5, shlagbaumZ: 43.5, ustunX: -7.2 } as const;
/** Chiqish qatori: markazi x = 4.5; shlagbaumi z = 43.5 da, ustuni o'ng chetda (x ≈ 7.2). */
export const CHIQISH = { x: 4.5, shlagbaumZ: 43.5, ustunX: 7.2 } as const;
/** Shlagbaum strelasi uzunligi (qator eni bo'ylab). */
export const SHLAGBAUM_UZUNLIGI = 4.8;

/** Asosiy ko'cha (hududdan oldinda, tashqi avtoturargohdan keyin): qatorlar z = 66 (−x yo'nalish) va z = 70 (+x yo'nalish). Trotuar z 62.3…64 va 72…73.7. */
export const ASOSIY_YOL = { z: 68, eni: 8, qatorlar: [{ z: 66, yon: -1 }, { z: 70, yon: 1 }] } as const;
/** Darvozadan ko'chagacha kirish yo'li (tashqi avtoturargoh oralig'idan): x −8.5…8.5, z 48…64. */
export const KIRISH_YOLI = { x0: -8.5, x1: 8.5, z0: 48, z1: 64 } as const;

/** Orqa ko'cha. */
export const ORQA_YOL = { z: -82, eni: 8, qatorlar: [{ z: -84, yon: -1 }, { z: -80, yon: 1 }] } as const;

/** Ko'ndalang ko'chalar (z bo'ylab). */
export const KONDALANG_YOLLAR = [-76, 150] as const;

/**
 * Tayyor mahsulot skladi (alohida bino, hududning o'ng tomonida): 46 × 38 m, devor balandligi 11 m.
 * Old devori (z = 14) da jo'natish rampalari (1, 2), g'arbiy devori (x = 74) da sexdan kelgan mahsulot kiradigan darvoza (z = 10).
 * Kamera tomonidagi sharqiy devor past (ichi ko'rinadi), old devor faqat rampa darvozalari balandligigacha (5.5 m).
 */
export const SKLAD = { x0: 74, x1: 120, z0: -24, z1: 14, balandlik: 11, oldDevor: 5.5, kirishZ: 10, kirishEni: 5 } as const;

/** Sexdan skladga tayyor mahsulot tashiydigan pogruzchiklar qatorlari (sex o'ng tomonidan sklad g'arbiy darvozasi orqali ichkariga). */
export const TASHISH_QATORLARI = [
  { z: 9.6, x0: 33.6, x1: 80.5 },
  { z: 12.0, x0: 33.6, x1: 80.5 },
] as const;

/**
 * Rampalar. Sklad old devori (z = 14) dagi 1, 2 — jo'natish (tayyor mahsulot); sex chap devori (x = −32) dagi 3, 4 — qabul (material, ko'tariluvchi darvoza).
 * Rampada turgan yuk mashinasi markazi: old rampa — (x, z + 4.3), oldi +z ga; chap rampa — (−36.3, z), oldi −x ga.
 */
export const RAMPALAR = {
  1: { x: 88, z: SKLAD.z1, devor: "old" },
  2: { x: 106, z: SKLAD.z1, devor: "old" },
  3: { x: -32, z: -6, devor: "chap" },
  4: { x: -32, z: 6, devor: "chap" },
} as const;
export type RampaRaqami = keyof typeof RAMPALAR;

/** Sex ichidagi zonalar. */
export const ZONALAR = {
  /** Material ombori (chap uchida). Qabul pogruzchiklari yo'lagi: z = −6 va z = 6 (bo'sh qoladi). */
  material: { x0: -31.5, x1: -23, z0: -13.5, z1: 13.5 },
  /** Tayyor mahsulot (old-o'ng burchak). Jo'natish pogruzchiklari yo'lagi: x = 18.5 va x = 27.5 (bo'sh qoladi). */
  tayyor: { x0: 14, x1: 31.5, z0: 10.5, z1: 14.6 },
  /** Markaziy yo'lak (x bo'ylab): pogruzchik qatori z = 1.2, piyodalar qatori z = −1.5. */
  yolak: { z0: -3, z1: 3 },
} as const;

/** Ma'muriy bino (ofis, 3 qavat): chap-old burchak. Kirish eshigi old tomonda (z = 42) x = −48 da. */
export const OFIS = { x0: -58, x1: -38, z0: 26, z1: 42, qavatlar: 8, qavatBalandligi: 3.6, eshik: [-48, 42] } as const;
/** Direktor avtomobili turadigan joy (ofis oldidagi maydoncha, belgilangan joy) — markaz va yo'nalishi (oldi +x). */
export const DIREKTOR_JOYI = { x: -42.5, z: 45.2, burchak: Math.PI / 2 } as const;

/** Maishiy blok (kiyinish xonalari, dush, oshxona): sexning o'ng tomonida, 1 qavat, tomsiz (ichi ko'rinadi). Eshigi sharq tomonda (x = 58, z = −5). */
export const MAISHIY = { x0: 40, x1: 58, z0: -16, z1: 6, balandlik: 3.6, eshik: [58, -5] } as const;
/** Maishiy blokni sex bilan bog'lovchi yopiq yo'lak (galereya): x 32…40, z −10…−7. */
export const GALEREYA = { x0: 32, x1: 40, z0: -10, z1: -7 } as const;

/** Kutish joylari (yuk mashinalari navbatda turadi, oldi +z ga — panjaraga qaragan). Markazlari. */
export const KUTISH_JOYLARI = [
  { x: 46, z: 39.5 },
  { x: 52, z: 39.5 },
  { x: 58, z: 39.5 },
] as const;

/** Xodimlar avtoturargohi — hududdan tashqarida, panjara bilan ko'cha orasida. Qatorlar z = 52.8 (oldi −z) va z = 58.7 (oldi +z), o'rtada yo'lak z ≈ 55.75. Kirish x = 62, chiqish x = 14. */
export const TASHQI_TURARGOH = { x0: 14, x1: 62, z0: 50.5, z1: 61, qatorlar: [52.8, 58.7], qadam: 2.8 } as const;

/** Avtobus bekati (ko'cha trotuarida). */
export const AVTOBUS_BEKATI = { x: -26, z: 63.1 } as const;

/**
 * Piyodalar yo'llari (nuqtalar ketma-ketligi [x, z]). Tashqaridan KPP turniketi orqali kiradi; KPP yon eshigidan chiqib,
 * qator ustidagi zebra orqali panjara bo'yidagi yo'lakka o'tadi.
 */
export const PIYODA_YOLLARI = {
  /** Avtobus bekatidan KPP old eshigigacha. */
  bekatdanKpp: [[-26, 63.1], [-9.5, 63.1], [-9.5, 49.5], [0, 49.5], [0, 47.3]],
  /** Tashqi avtoturargohdan KPP old eshigigacha. */
  turargohdanKpp: [[30, 55.75], [12, 55.75], [12, 49.5], [0, 49.5], [0, 47.3]],
  /** KPP ichidan maishiy blok eshigigacha (chiqish qatorini z = 45.8 dagi zebra orqali kesib o'tadi). */
  kppdanMaishiy: [[0, 45.8], [2.4, 45.8], [8.2, 45.8], [64, 45.8], [64, -5], [58.6, -5]],
  /** KPP ichidan ofis eshigigacha (kirish qatorini z = 45.8 dagi zebra orqali kesib o'tadi, so'ng panjara bo'yida z = 47.2 — direktor mashinasi joyidan o'tmaydi). */
  kppdanOfis: [[0, 45.8], [-2.4, 45.8], [-8.2, 45.8], [-9.6, 47.2], [-48, 47.2], [-48, 42.6]],
  /** Maishiy blokdan galereya orqali sexga. */
  maishiydanSex: [[41, -8.5], [33, -8.5], [28, -8.5], [28, -1.5]],
} as const;

/** Hududdagi orqa hovli (kotelxona, transformator, chiqindi, siloslar uchun): 2-sex orqasida, z −69…−45. */
export const ORQA_HOVLI = { x0: -58, x1: 126, z0: -69, z1: -45 } as const;
