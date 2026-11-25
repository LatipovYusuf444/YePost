// Tayyor mahsulot skladi ichki rejasi (metr): stellaj qatorlari, palet joylari, yo'laklar, darvozalar.
// UI'siz va three/React'siz — testlarda ishlaydi. Bino o'lchami — hudud.ts dagi SKLAD.
import { RAMPALAR, SKLAD } from "./hudud.ts";

/**
 * Baland stellajlar: 6 qator (orqa devor yonida bitta, o'rtada ikkita qo'shaloq, oldida bitta), har qatorda 10 bo'lim × 2.8 m,
 * 5 qavat (pol + 4 to'sin sathi), har bo'lim-qavatda 2 palet → 600 palet joyi. Qatorlar orasida 3.65 m yo'lak (richtrak uchun).
 */
export const STELLAJ = {
  x0: 80,
  bolimlar: 10,
  bolimEni: 2.8,
  chuqurlik: 1.1,
  balandlik: 9.6,
  /** Har qavatdagi palet tagining balandligi (0 — pol). */
  qavatlar: [0, 2.08, 3.93, 5.78, 7.63],
  /** To'sinlar sathi (palet tagidan biroz pastda). */
  tosinlar: [2.0, 3.85, 5.7, 7.55],
  /** Qator markazlari (z). */
  qatorlarZ: [-22.7, -17.95, -16.65, -11.9, -10.6, -5.85],
  /** Bo'lim ichida palet markazlari (bo'lim markaziga nisbatan, x). */
  paletX: [-0.68, 0.68],
} as const;

export const STELLAJ_X1 = STELLAJ.x0 + STELLAJ.bolimlar * STELLAJ.bolimEni;
export const STELLAJ_SIGIMI = STELLAJ.qatorlarZ.length * STELLAJ.bolimlar * STELLAJ.qavatlar.length * STELLAJ.paletX.length;

/** Yo'laklar (qatorlar orasi, z oralig'i). Richtrak o'rtadagi yo'lakda yuradi. */
export const YOLAKLAR = [
  { z0: STELLAJ.qatorlarZ[0] + STELLAJ.chuqurlik / 2, z1: STELLAJ.qatorlarZ[1] - STELLAJ.chuqurlik / 2 },
  { z0: STELLAJ.qatorlarZ[2] + STELLAJ.chuqurlik / 2, z1: STELLAJ.qatorlarZ[3] - STELLAJ.chuqurlik / 2 },
  { z0: STELLAJ.qatorlarZ[4] + STELLAJ.chuqurlik / 2, z1: STELLAJ.qatorlarZ[5] - STELLAJ.chuqurlik / 2 },
] as const;
export const RICHTRAK_YOLAGI = { z: (YOLAKLAR[1].z0 + YOLAKLAR[1].z1) / 2, x0: STELLAJ.x0 + 1.4, x1: STELLAJ_X1 - 1.4 } as const;

/** Old devordagi darvozalar (x markazi): rampa 1, 2 — ochiq (yuk mashinasi turadi), qolganlari yopiq seksiyali darvoza. */
export const DOK_DARVOZALARI = [82, RAMPALAR[1].x, 94, 100, RAMPALAR[2].x, 112].map((x) => ({ x, ochiq: x === RAMPALAR[1].x || x === RAMPALAR[2].x }));
export const DOK_ENI = 3.2;
export const DOK_BALANDLIGI = 3.6;

/** Ustunlar (x) — old va orqa devor bo'ylab; dok darvozalari orasiga tushadi. */
export const USTUNLAR_X = [SKLAD.x0 + 0.2, 79, 85, 91, 97, 103, 109, 115, SKLAD.x1 - 0.2];

/** Sklad mudiri xonasi (shisha kabina) — o'ng-old burchakda. */
export const MUDIR_XONASI = { x0: 113.4, x1: 119.6, z0: 5.6, z1: 13.4, h: 3 } as const;

/** Rampa oldidagi yig'ish maydoni (palet taxlamlari): yuklash pogruzchiklari yo'laklari (rampa x ± 1.3) bo'sh qoladi. */
export const YIGISH_PALETLARI: ReadonlyArray<readonly [number, number, number]> = [
  // [x, z, qavat soni]
  [92.6, 1.6, 2], [94.0, 1.6, 1], [95.4, 1.6, 2], [96.8, 1.6, 1], [99.6, 1.6, 2], [101.0, 1.6, 1],
  [92.6, 4.0, 1], [94.0, 4.0, 2], [96.8, 4.0, 2], [99.6, 4.0, 1], [101.0, 4.0, 2],
  [109.0, 1.6, 1], [110.4, 1.6, 2],
];

/** Takrorlanadigan "tasodifiy" son (har ochilganda bir xil). */
function urugli(urug: number) {
  let s = urug >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export type PaletJoyi = { x: number; y: number; z: number; rang: number };

/**
 * Barcha palet joylari to'ldirilish tartibida: ko'rinadigan paletlar soni sklad qoldig'iga teng bo'ladi, shuning uchun tartib aralash
 * (bir qatorning boshidan oxirigacha emas), lekin pastki qavatlar biroz oldinroq to'ladi (haqiqiy skladdagidek).
 */
export function paletJoylari(): PaletJoyi[] {
  const rnd = urugli(2026);
  const joylar: Array<PaletJoyi & { navbat: number }> = [];
  STELLAJ.qatorlarZ.forEach((z) => {
    for (let b = 0; b < STELLAJ.bolimlar; b++) {
      const bx = STELLAJ.x0 + (b + 0.5) * STELLAJ.bolimEni;
      STELLAJ.qavatlar.forEach((y, q) => {
        for (const dx of STELLAJ.paletX) {
          joylar.push({ x: bx + dx, y, z, rang: Math.floor(rnd() * 4), navbat: rnd() + q * 0.12 });
        }
      });
    }
  });
  joylar.sort((a, c) => a.navbat - c.navbat);
  return joylar.map(({ x, y, z, rang }) => ({ x, y, z, rang }));
}

/** Stellajda ko'rinadigan paletlar soni (sig'imdan oshmaydi). */
export function korinadiganPalet(palet: number) {
  return Math.max(0, Math.min(STELLAJ_SIGIMI, Math.round(palet)));
}

/** Sexdan skladga tashuvchi pogruzchik sikli (s): yuklash → borish → tushirish → orqaga qaytish → kutish. */
export const TASHISH_SIKLI = { yuklash: 3, borish: 17, tushirish: 3, qaytish: 17, kutish: 4 } as const;
export const TASHISH_DAVRI = Object.values(TASHISH_SIKLI).reduce((s, v) => s + v, 0);

/** Tashuvchi pogruzchikning `t` soniyadagi holati: u — qator bo'ylab ulush (0 — sex tomoni, 1 — sklad ichi), yuk — vilkada yuk bormi, vilka — ko'tarilish (0…1). */
export function tashishHolati(t: number): { u: number; yuk: boolean; vilka: number } {
  const T = TASHISH_SIKLI;
  let l = ((t % TASHISH_DAVRI) + TASHISH_DAVRI) % TASHISH_DAVRI;
  const silliq = (x: number) => x * x * (3 - 2 * x);
  if (l < T.yuklash) return { u: 0, yuk: l > T.yuklash / 2, vilka: Math.min(1, l / T.yuklash) * 0.6 };
  l -= T.yuklash;
  if (l < T.borish) return { u: silliq(l / T.borish), yuk: true, vilka: 0.6 };
  l -= T.borish;
  if (l < T.tushirish) return { u: 1, yuk: l < T.tushirish / 2, vilka: 0.6 * (1 - l / T.tushirish) };
  l -= T.tushirish;
  if (l < T.qaytish) return { u: 1 - silliq(l / T.qaytish), yuk: false, vilka: 0 };
  return { u: 0, yuk: false, vilka: 0 };
}
