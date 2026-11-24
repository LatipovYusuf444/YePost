// Ishlab chiqarish binosi (64 × 30 × 8 m) rejasi: devor ochiqlari, bordyur bo'laklari, karkas ustunlari, kran-balka harakati,
// chang so'rish quvurlari va jihozlar joylari. Toza funksiyalar (UI'siz) — SexMuhiti.tsx shu bo'yicha chizadi, testlar shu bo'yicha tekshiradi.

import { GALEREYA, RAMPALAR, SEX, ZONALAR } from "./hudud.ts";
import type { StanokTavsifi, StanokTuri } from "./sexModeli.ts";

/** Polda to'rtburchak (metr): x0 < x1, z0 < z1. */
export type Tortburchak = { x0: number; x1: number; z0: number; z1: number };
export type Ochiq = { markaz: number; eni: number };

export const YARIM_ENI = SEX.eni / 2;
export const YARIM_CHUQURLIK = SEX.chuqurlik / 2;
/** Devor qalinligi (sendvich-panel + rigel). Orqa devor markazi z = −15, chap devor markazi x = −32. */
export const DEVOR_QALINLIGI = 0.3;
export const DEVOR_BALANDLIGI = SEX.balandlik;

/** Chap devordagi ko'tariluvchi darvozalar (qabul rampalari 3 va 4): markazlari z = −6 va z = 6. Pardasi — Transport.tsx da. */
export const CHAP_ESHIKLAR_Z = [RAMPALAR[3].z, RAMPALAR[4].z] as const;
export const ESHIK_ENI = 4;
export const ESHIK_BALANDLIGI = 4.1;

/** Old tomondagi jo'natish rampalari (2 va 1): bordyur x = 18.5 va x = 27.5 da uzilgan. */
export const OLD_RAMPALAR_X = [RAMPALAR[2].x, RAMPALAR[1].x] as const;
export const RAMPA_OCHIGI = 3.6;
export const BORDYUR = { balandlik: 0.25, qalinlik: 0.25 } as const;

/** [boshi, oxiri] oralig'idan ochiqlarni chiqarib tashlab, qolgan bo'laklarni qaytaradi (devor yoki bordyur bo'laklari). */
export function bolaklar(boshi: number, oxiri: number, ochiqlar: readonly Ochiq[]): Array<[number, number]> {
  const tartib = [...ochiqlar].sort((a, b) => a.markaz - b.markaz);
  const natija: Array<[number, number]> = [];
  let joriy = boshi;
  for (const o of tartib) {
    const a = Math.max(boshi, o.markaz - o.eni / 2);
    const b = Math.min(oxiri, o.markaz + o.eni / 2);
    if (a > joriy + 1e-6) natija.push([joriy, a]);
    joriy = Math.max(joriy, b);
  }
  if (oxiri > joriy + 1e-6) natija.push([joriy, oxiri]);
  return natija;
}

/** Chap devor bo'laklari (z bo'ylab, to'liq balandlikda): darvoza ochiqlari orasida. */
export const CHAP_DEVOR_BOLAKLARI = bolaklar(-YARIM_CHUQURLIK, YARIM_CHUQURLIK, CHAP_ESHIKLAR_Z.map((z) => ({ markaz: z, eni: ESHIK_ENI })));
/** Old bordyur bo'laklari (x bo'ylab): rampalar ro'parasida ≈3.6 m uzilgan. */
export const OLD_BORDYUR_BOLAKLARI = bolaklar(-YARIM_ENI, YARIM_ENI, OLD_RAMPALAR_X.map((x) => ({ markaz: x, eni: RAMPA_OCHIGI })));
/** O'ng bordyur bo'laklari (z bo'ylab): galereya ochig'i (z −10…−7) uzilgan. */
export const GALEREYA_OCHIGI: Ochiq = { markaz: (GALEREYA.z0 + GALEREYA.z1) / 2, eni: GALEREYA.z1 - GALEREYA.z0 };
export const ONG_BORDYUR_BOLAKLARI = bolaklar(-YARIM_CHUQURLIK, YARIM_CHUQURLIK, [GALEREYA_OCHIGI]);

// ── Po'lat karkas ──

/** Asosiy fermalar (rama) qadami: 12 m (chetki oraliqlar 8 m). */
export const FERMA_X = [-24, -12, 0, 12, 24] as const;
/** Ferma pastki va yuqori belbog'i (y). */
export const FERMA = { past: 7.4, tepa: 8.4, panellar: 16 } as const;
/** Ichki ustunlar qatori: markaziy yo'lak (z −3…3) chetida, stanok maydonlaridan tashqarida. */
export const ICHKI_QATOR_Z = 3.6;
export const ORQA_USTUN_Z = -14.6;
export const OLD_USTUN_Z = 14.75;
export const CHAP_USTUN_X = -31.6;
export const ONG_USTUN_X = 31.75;
/** Progonlar (fermalar ustida, x bo'ylab) — har 3 m. */
export const PROGON_Z = Array.from({ length: 11 }, (_, i) => -YARIM_CHUQURLIK + i * 3);

export type UstunJoyi = { x: number; z: number; tur: "chet" | "ichki" };

/** Barcha ustunlar: perimetr (orqa, old, chap/o'ng torets) va ikki ichki qator (z = ±3.6). */
export function ustunlar(): UstunJoyi[] {
  const natija: UstunJoyi[] = [];
  const chetX = [CHAP_USTUN_X, ...FERMA_X, ONG_USTUN_X];
  for (const x of chetX) {
    natija.push({ x, z: ORQA_USTUN_Z, tur: "chet" });
    natija.push({ x, z: OLD_USTUN_Z, tur: "chet" });
  }
  for (const z of [-ICHKI_QATOR_Z, ICHKI_QATOR_Z]) {
    natija.push({ x: CHAP_USTUN_X, z, tur: "chet" }, { x: ONG_USTUN_X, z, tur: "chet" });
    for (const x of FERMA_X) natija.push({ x, z, tur: "ichki" });
  }
  return natija;
}
export const USTUN_KESIMI = 0.4;

// ── Kran-balka (orqa yarmida, ichki qator va orqa devor orasida) ──

export const KRAN = {
  /** Kran osti yo'li relslari (z) — orqa devor ustunlari va ichki qator konsollarida. */
  orqaRelsZ: -14.2,
  oldRelsZ: -4.0,
  /** Rels ustki sathi. */
  relsY: 6.2,
  /** Ko'prik harakat oralig'i (x). */
  xMin: -18,
  xMax: 22,
  /** Arava (tal) harakat oralig'i (z). */
  aravaZMin: -11.5,
  aravaZMax: -5.5,
  /** Ilmoq pastki sathi oralig'i: chang quvurlari ustidan o'tadi (quvur tepasi ≈ 5.6). */
  ilmoqYMin: 5.85,
  ilmoqYMax: 6.05,
} as const;

/** Kranning t (soniya) paytidagi holati: sekin, silliq (sinus) harakat — keskin to'xtash yo'q. */
export function kranHolati(t: number) {
  const ox = (KRAN.xMin + KRAN.xMax) / 2;
  const ax = (KRAN.xMax - KRAN.xMin) / 2;
  const oz = (KRAN.aravaZMin + KRAN.aravaZMax) / 2;
  const az = (KRAN.aravaZMax - KRAN.aravaZMin) / 2;
  return {
    x: ox + ax * Math.sin((2 * Math.PI * t) / 130),
    z: oz + az * Math.sin((2 * Math.PI * t) / 47 + 0.6),
    ilmoqY: KRAN.ilmoqYMin + (KRAN.ilmoqYMax - KRAN.ilmoqYMin) * (0.5 + 0.5 * Math.sin((2 * Math.PI * t) / 23)),
  };
}

// ── Chang so'rish ──

/** Magistral va tarmoq quvurlari sathi (o'qi). */
export const QUVUR_Y = 5.3;
export const MAGISTRAL_R = 0.3;
/** Orqa devor bo'yidagi magistral (1-liniya) va old tomondagi kollektor (2-liniya, oldi −z — "orqasi" +z). */
export const ORQA_MAGISTRAL_Z = -14.0;
export const OLD_MAGISTRAL_Z = 12.6;
/** Ikki magistralni bog'lovchi ko'ndalang quvur (x = 10 dagi ko'ndalang yo'lak ustida). */
export const KONDALANG_QUVUR_X = 10;
/** Siklon-filtr (orqa devor yonida, 3- va 4-stanoklar orasidagi bo'shliqda). */
export const SIKLON = { x: 10, z: -12.7, r: 0.9, tepa: 4.55 } as const;

/** Stanok ichidagi so'rish patrubkasi (lokal x siljishi) va shlang uchi balandligi. */
export const PATRUBKA: Record<StanokTuri, { x: number; y: number }> = {
  kesish: { x: 0.7, y: 2.25 },
  cnc: { x: 0, y: 2.25 },
  qirra: { x: -0.6, y: 2.25 },
  burgilash: { x: 0, y: 2.25 },
  qadoqlash: { x: 0, y: 2.6 },
};
/** Patrubka stanok markazidan orqa tomonga siljigan (lokal −z). */
const ORQAGA = 0.4;

/** Tushuvchi quvur nuqtasi [x, z]: stanok burilishiga qarab (burilish 0 — orqasi −z, burilish π — orqasi +z). */
export function tushishNuqtasi(stanok: Pick<StanokTavsifi, "joy" | "burilish" | "tur">): [number, number] {
  const lx = PATRUBKA[stanok.tur].x;
  const lz = -ORQAGA;
  const c = Math.cos(stanok.burilish);
  const s = Math.sin(stanok.burilish);
  // three.js Y atrofida burish: x' = x·cos + z·sin, z' = −x·sin + z·cos
  const x = stanok.joy[0] + lx * c + lz * s;
  const z = stanok.joy[1] - lx * s + lz * c;
  return [Math.round(x * 1000) / 1000, Math.round(z * 1000) / 1000];
}

/** Stanok qaysi magistralga ulanadi (orqa yoki old). */
export function magistralZ(z: number) {
  return z < 0 ? ORQA_MAGISTRAL_Z : OLD_MAGISTRAL_Z;
}

// ── Bo'sh qoladigan joylar (stanoklar va yo'laklar) ──

/** Stanok egallaydigan joy: x ±3, orqaga 3.5 m, oldga 3 m (liniya 1: z −11…−4.5, liniya 2: z 4.5…11). */
export function stanokMaydoni(stanok: Pick<StanokTavsifi, "joy" | "burilish">): Tortburchak {
  const orqa = Math.cos(stanok.burilish) >= 0 ? -1 : 1;
  const [x, z] = stanok.joy;
  const a = z + orqa * 3.5;
  const b = z - orqa * 3;
  return { x0: x - 3, x1: x + 3, z0: Math.min(a, b), z1: Math.max(a, b) };
}

export function kesishadi(a: Tortburchak, b: Tortburchak) {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;
}

/** Markaz va o'lchamdan to'rtburchak. */
export function tortburchak(x: number, z: number, eni: number, chuqurlik: number): Tortburchak {
  return { x0: x - eni / 2, x1: x + eni / 2, z0: z - chuqurlik / 2, z1: z + chuqurlik / 2 };
}

/** Qabul pogruzchiklari yo'laklari (z = −6 va z = 6, eni 1.6 m): chap darvozadan ko'ndalang yo'lakkacha bo'sh. */
export const MATERIAL_YOLAKLARI: Tortburchak[] = CHAP_ESHIKLAR_Z.map((z) => ({ x0: -YARIM_ENI, x1: -18.9, z0: z - 0.8, z1: z + 0.8 }));
/** Jo'natish pogruzchiklari yo'laklari (x = 18.5 va 27.5, ±1.2 m): markaziy yo'lakdan old bordyurgacha bo'sh. */
export const JONATISH_YOLAKLARI: Tortburchak[] = OLD_RAMPALAR_X.map((x) => ({ x0: x - 1.2, x1: x + 1.2, z0: ZONALAR.yolak.z1, z1: YARIM_CHUQURLIK }));
/** Markaziy yo'lak (x bo'ylab). */
export const MARKAZIY_YOLAK: Tortburchak = { x0: ZONALAR.material.x1, x1: YARIM_ENI, z0: ZONALAR.yolak.z0, z1: ZONALAR.yolak.z1 };
/** Ko'ndalang yo'laklar markazi (x): material ombori yonida va 3–4-stanoklar orasida. */
export const KONDALANG_YOLAKLAR = [{ x: -20.4, eni: 3 }, { x: 10, eni: 2.2 }] as const;
/** Galereyadan sexga piyoda yo'lagi: (32, −8.5) → (28, −8.5) → (28, −3). */
export const GALEREYA_YOLAGI: Tortburchak[] = [
  { x0: 28.8, x1: YARIM_ENI - 0.25, z0: -9.3, z1: -7.7 },
  { x0: 27.2, x1: 28.8, z0: -9.3, z1: ZONALAR.yolak.z0 },
];
/** Bo'sh qolishi shart bo'lgan barcha yo'laklar. */
export const BOSH_YOLAKLAR: Tortburchak[] = [MARKAZIY_YOLAK, ...MATERIAL_YOLAKLARI, ...JONATISH_YOLAKLARI, ...GALEREYA_YOLAGI];

// ── Jihozlar joylari ──

/** Prorab (usta) xonasi: o'ng-orqa burchak, shisha devorli. */
export const PRORAB_XONASI: Tortburchak = { x0: 26, x1: 31.5, z0: -14.5, z1: -10 };

/** Stanoklar orasidagi aravachalar (listlar bilan) — yo'laklarda emas. */
export const ARAVACHALAR: Array<{ x: number; z: number; burilish: number; varaq: number }> = [
  { x: -10, z: -7.3, burilish: 0, varaq: 9 },
  { x: 0.25, z: -7.8, burilish: Math.PI / 2, varaq: 6 },
  { x: -10, z: 7.6, burilish: 0, varaq: 12 },
  { x: 0.25, z: 7.2, burilish: Math.PI / 2, varaq: 7 },
  { x: 18.5, z: -7.6, burilish: Math.PI / 2, varaq: 10 },
];
export const ARAVACHA_OLCHAMI = { eni: 1.3, chuqurlik: 0.8 } as const;

/** Elektr shkaflar qatorlari (orqa devor bo'yida): boshlanish x, soni. */
export const ELEKTR_SHKAFLAR = [{ x: -11.4, soni: 4 }, { x: 1.0, soni: 3 }] as const;
export const SHKAF_ENI = 0.8;
/** Chilangar stoli (orqa devor bo'yida). */
export const ASBOB_STOLI = { x: 14.6, z: -14.35, eni: 2.4 } as const;
/** Favqulodda chiqish eshiklari (orqa devorda, x). */
export const CHIQISH_ESHIKLARI_X = [-20.4, 18.5] as const;

/** Material ombori: LDSP list taxlamlari (2.8 × 2.07 m, polda tagliklar ustida). Qabul yo'laklari (z = ±6) bo'sh qoladi. */
export const LIST_OLCHAMI = { uzunlik: 2.8, eni: 2.07 } as const;
export const MATERIAL_TAXLAMLARI: Array<{ x: number; z: number; qatlam: number }> = [
  ...[-11.4, -8.4].flatMap((z, i) => [-29.9, -26.75].map((x, j) => ({ x, z, qatlam: 3 + ((i + j * 2) % 3) }))),
  ...[-3.05, 0, 3.05].flatMap((z, i) => [-29.9, -26.75].map((x, j) => ({ x, z, qatlam: 2 + ((i * 2 + j) % 4) }))),
  ...[8.4, 11.4].flatMap((z, i) => [-29.9, -26.75].map((x, j) => ({ x, z, qatlam: 3 + ((i * 2 + j + 1) % 3) }))),
];
/** Palletli stellajlar (orqa va old devor bo'yida, material ombori ichida). */
export const MATERIAL_STELLAJLARI: Tortburchak[] = [
  { x0: -31.2, x1: -25.1, z0: -14.3, z1: -13.0 },
  { x0: -31.2, x1: -25.1, z0: 13.0, z1: 14.3 },
];

/** Tayyor mahsulot paletlari (o'ralgan qutilar): jo'natish yo'laklari (x 18.5 va 27.5 ±1.2) bo'sh. */
export const PALET_OLCHAMI = { eni: 1.2, chuqurlik: 0.8 } as const;
export const TAYYOR_PALETLAR: Array<{ x: number; z: number; qavat: 1 | 2; baland: number }> = (() => {
  const bloklar: Array<[number, number]> = [[14.4, 17.1], [19.95, 26.05], [28.9, 31.3]];
  const qatorlarZ = [11.75, 12.85, 13.95];
  const natija: Array<{ x: number; z: number; qavat: 1 | 2; baland: number }> = [];
  let n = 0;
  for (const [a, b] of bloklar) {
    const soni = Math.floor((b - a + 0.15) / (PALET_OLCHAMI.eni + 0.15));
    const boshi = a + (b - a - (soni * PALET_OLCHAMI.eni + (soni - 1) * 0.15)) / 2 + PALET_OLCHAMI.eni / 2;
    for (const z of qatorlarZ) {
      for (let i = 0; i < soni; i++) {
        n++;
        // Ba'zi joylar bo'sh (yuklab ketilgan) — tabiiy ko'rinadi.
        if (n % 7 === 3) continue;
        natija.push({ x: Math.round((boshi + i * (PALET_OLCHAMI.eni + 0.15)) * 100) / 100, z, qavat: n % 5 === 1 ? 2 : 1, baland: 0.9 + ((n * 37) % 5) * 0.12 });
      }
    }
  }
  return natija;
})();

/** Chiqindi idishlari (orqa devor bo'yida va galereya yonida). */
export const CHIQINDI_IDISHLARI: Array<{ x: number; z: number; rang: 0 | 1 | 2 }> = [
  { x: -6.6, z: -14.35, rang: 0 },
  { x: -5.85, z: -14.35, rang: 1 },
  { x: -5.1, z: -14.35, rang: 2 },
  { x: 30.9, z: -6.6, rang: 0 },
  { x: 30.9, z: -5.85, rang: 2 },
];
