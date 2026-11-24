// Zavod hududi va atrofdagi shaharcha rejasi (metr). Sex binosi: x −17…17, z −11…11 (materiallar.ts: SEX_ENI × SEX_CHUQURLIGI).
// Kamera "Butun sex" old-o'ng tomondan qaraydi: bino old (z = 11) va o'ng (x = 17) tomonlari ochiq (qirqilgan) ko'rinadi.

/** Zavod hududi chegarasi (panjara). */
export const HUDUD = { chap: -34, ong: 40, orqa: -26, old: 30 } as const;

/** Old panjaradagi darvoza (KPP orqali kirish-chiqish). */
export const DARVOZA = { x: 0, yarimEni: 4.6 } as const;

/** Shlagbaum: ustun o'ngda, strelasi −x tomonga yotadi. */
export const SHLAGBAUM = { x: 5.2, z: 25.2, uzunlik: 9.8 } as const;

/** KPP budkasi (darvozaning o'ng tomonida, hudud ichida). */
export const KPP = { x: 7.9, z: 26.2 } as const;

/** Asosiy ko'cha (hudud oldida): ikki qator — z = 34 (−x yo'nalish), z = 38 (+x yo'nalish). */
export const ASOSIY_YOL = { z: 36, eni: 8, qatorlar: [{ z: 34, yon: -1 }, { z: 38, yon: 1 }] } as const;

/** Orqa ko'cha. */
export const ORQA_YOL = { z: -38, eni: 8, qatorlar: [{ z: -40, yon: -1 }, { z: -36, yon: 1 }] } as const;

/** Ko'ndalang ko'chalar (z bo'ylab). */
export const KONDALANG_YOLLAR = [-50, 58] as const;

/** 1-rampa: bino old tomonida, tayyor mahsulot zonasi ro'parasida (mashina orqasi z = 11 ga tegadi). */
export const RAMPA1 = { x: -12.8, z: 11 } as const;

/** 2-rampa: chap devordagi ko'tariluvchi darvoza, material ombori yonida. */
export const RAMPA2 = { x: -17, z: 0.1 } as const;

/** Xodimlar avtoturargohi (hududning o'ng tomoni). */
export const TURARGOH = { x: 29, z: 2, qatorlar: [-3.2, 3.2], joylar: 7, qadam: 2.9 } as const;
