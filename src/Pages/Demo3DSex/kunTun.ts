// Kun / tun: Toshkent vaqti (UTC+5, yozgi vaqt yo'q) bo'yicha quyosh holati va sahna yoritishi parametrlari.
// Sof funksiyalar (three.js, React yoki brauzerga bog'liq emas) — node testlarida to'g'ridan-to'g'ri tekshiriladi.
// Sahna o'qlari: +x — sharq, −z — shimol (tushda quyosh +z / janub tomonda), +y — yuqori.

export const TOSHKENT = { kenglik: 41.2995, uzunlik: 69.2401, utcSiljish: 5 } as const;

const RAD = Math.PI / 180;
const SOAT_MS = 3_600_000;
const KUN_MS = 86_400_000;

export type VaqtRejimi = "avto" | "kun" | "tun";
export type Vektor = [number, number, number];

/** Sana yoki millisekund (Date.getTime()). */
type Lahza = Date | number;
const ms = (sana: Lahza) => (typeof sana === "number" ? sana : sana.getTime());

export type ToshkentVaqti = { yil: number; oy: number; kun: number; soat: number; daqiqa: number; soniya: number; /** Kun boshidan o'tgan daqiqalar (0…1440). */ kunDaqiqasi: number };

/** Toshkent mahalliy vaqti: brauzer/kompyuter vaqt mintaqasidan qat'i nazar (UTC + 5 soat). */
export function toshkentVaqti(sana: Lahza): ToshkentVaqti {
  const d = new Date(ms(sana) + TOSHKENT.utcSiljish * SOAT_MS);
  const soat = d.getUTCHours();
  const daqiqa = d.getUTCMinutes();
  const soniya = d.getUTCSeconds();
  return { yil: d.getUTCFullYear(), oy: d.getUTCMonth() + 1, kun: d.getUTCDate(), soat, daqiqa, soniya, kunDaqiqasi: soat * 60 + daqiqa + soniya / 60 };
}

/** "21:07" ko'rinishidagi soat. */
export const soatMatni = (v: Pick<ToshkentVaqti, "soat" | "daqiqa">) => `${String(v.soat).padStart(2, "0")}:${String(v.daqiqa).padStart(2, "0")}`;

export type QuyoshHolati = {
  /** Ufqdan balandlik, gradus (manfiy — ufq ostida). */
  balandlik: number;
  /** Azimut, gradus: shimoldan soat mili bo'yicha (90 — sharq, 180 — janub, 270 — g'arb). */
  azimut: number;
  /** Quyosh og'ishi (deklinatsiya), gradus. */
  ogish: number;
  /** Vaqt tenglamasi, daqiqa. */
  vaqtTenglamasi: number;
};

const mod = (a: number, b: number) => ((a % b) + b) % b;

/**
 * Quyosh holati — NOAA quyosh kalkulyatori algoritmi (Meeus asosida, aniqligi ~0.1°): Julian asr, ekliptik uzunlik, og'ish,
 * vaqt tenglamasi, soat burchagi; ufq yaqinida atmosfera sinishi (refraksiya) tuzatmasi.
 */
export function quyoshHolati(sana: Lahza, kenglik: number = TOSHKENT.kenglik, uzunlik: number = TOSHKENT.uzunlik): QuyoshHolati {
  const t = ms(sana);
  const jd = t / KUN_MS + 2440587.5;
  const T = (jd - 2451545) / 36525;
  const L0 = mod(280.46646 + T * (36000.76983 + T * 0.0003032), 360);
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const C = Math.sin(M * RAD) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(2 * M * RAD) * (0.019993 - 0.000101 * T) + Math.sin(3 * M * RAD) * 0.000289;
  const omega = 125.04 - 1934.136 * T;
  const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(omega * RAD);
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * RAD);
  const ogish = Math.asin(Math.sin(eps * RAD) * Math.sin(lambda * RAD)) / RAD;
  const y = Math.tan((eps / 2) * RAD) ** 2;
  const vaqtTenglamasi =
    (4 / RAD) *
    (y * Math.sin(2 * L0 * RAD) - 2 * e * Math.sin(M * RAD) + 4 * e * y * Math.sin(M * RAD) * Math.cos(2 * L0 * RAD) - 0.5 * y * y * Math.sin(4 * L0 * RAD) - 1.25 * e * e * Math.sin(2 * M * RAD));
  // Haqiqiy quyosh vaqti (daqiqa): UTC + vaqt tenglamasi + 4 daqiqa × uzunlik.
  const utcDaqiqa = mod(t, KUN_MS) / 60_000;
  const quyoshVaqti = mod(utcDaqiqa + vaqtTenglamasi + 4 * uzunlik, 1440);
  const soatBurchagi = quyoshVaqti / 4 - 180;
  const fi = kenglik * RAD;
  const d = ogish * RAD;
  const H = soatBurchagi * RAD;
  const cosZ = Math.min(1, Math.max(-1, Math.sin(fi) * Math.sin(d) + Math.cos(fi) * Math.cos(d) * Math.cos(H)));
  const geometrik = 90 - Math.acos(cosZ) / RAD;
  const azimut = mod(Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(fi) - Math.tan(d) * Math.cos(fi)) / RAD + 180, 360);
  return { balandlik: geometrik + refraksiya(geometrik), azimut, ogish, vaqtTenglamasi };
}

/** Atmosfera sinishi (NOAA yaqinlashuvi), gradus. */
function refraksiya(h: number) {
  if (h > 85) return 0;
  const te = Math.tan(h * RAD);
  let s: number;
  if (h > 5) s = 58.1 / te - 0.07 / te ** 3 + 0.000086 / te ** 5;
  else if (h > -0.575) s = 1735 + h * (-518.2 + h * (103.4 + h * (-12.79 + h * 0.711)));
  else s = -20.772 / te;
  return s / 3600;
}

/** Azimut + balandlik → sahna o'qlaridagi birlik vektor (+x sharq, −z shimol, +y yuqori). */
export function sahnaYonalishi(azimut: number, balandlik: number): Vektor {
  const a = azimut * RAD;
  const b = balandlik * RAD;
  return [Math.cos(b) * Math.sin(a), Math.sin(b), -Math.cos(b) * Math.cos(a)];
}

/** Silliq 0…1 o'tish (GLSL smoothstep). */
export function silliqQadam(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export type KunFazasi = "tun" | "tong" | "kun" | "shom";

export type FazaUlushlari = {
  faza: KunFazasi;
  /** 0 — tun, 1 — to'liq kun (quyosh −8° … +10°). */
  kunUlushi: number;
  /** 1 − kunUlushi. */
  tunUlushi: number;
  /** Tong / shom shafag'i (ufq yaqinida 1, kunduzi va chuqur tunda 0). */
  shafaqUlushi: number;
  /** Tungi chiroqlar yoqilishi: quyosh +5° dan pastga tushganda yonadi, −4° da to'liq. */
  chiroqUlushi: number;
  /** Yulduzlar ko'rinishi (−3° … −10°). */
  yulduzUlushi: number;
};

/** Quyosh balandligi bo'yicha faza. `ertalab` — quyosh sharq tomonda (azimut < 180°): tong yoki shom ajratiladi. */
export function kunFazasi(balandlik: number, ertalab = true): FazaUlushlari {
  const kunUlushi = silliqQadam(-8, 10, balandlik);
  const faza: KunFazasi = balandlik >= 10 ? "kun" : balandlik <= -8 ? "tun" : ertalab ? "tong" : "shom";
  return {
    faza,
    kunUlushi,
    tunUlushi: 1 - kunUlushi,
    shafaqUlushi: silliqQadam(-10, -1, balandlik) * (1 - silliqQadam(4, 18, balandlik)),
    chiroqUlushi: 1 - silliqQadam(-4, 5, balandlik),
    yulduzUlushi: 1 - silliqQadam(-10, -3, balandlik),
  };
}

// ——— Rang va son jadvallari (balandlik bo'yicha bo'lakli-chiziqli) ———

type Nuqta<T> = readonly [number, T];

function oraliq<T>(nuqtalar: readonly Nuqta<T>[], x: number, aralash: (a: T, b: T, t: number) => T): T {
  if (x <= nuqtalar[0][0]) return nuqtalar[0][1];
  for (let i = 1; i < nuqtalar.length; i++) {
    const [x1, q1] = nuqtalar[i];
    if (x <= x1) {
      const [x0, q0] = nuqtalar[i - 1];
      return aralash(q0, q1, (x - x0) / (x1 - x0));
    }
  }
  return nuqtalar[nuqtalar.length - 1][1];
}

export const sonJadval = (nuqtalar: readonly Nuqta<number>[], x: number) => oraliq(nuqtalar, x, (a, b, t) => a + (b - a) * t);
export const rangJadval = (nuqtalar: readonly Nuqta<string>[], x: number) => oraliq(nuqtalar, x, rangAralash);

const hexdan = (hex: string) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Ikki "#rrggbb" rang orasida (sRGB) aralash. */
export function rangAralash(a: string, b: string, t: number) {
  const x = hexdan(a);
  const y = hexdan(b);
  const k = Math.min(1, Math.max(0, t));
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, "0")).join("")}`;
}

// ——— Yoritish parametrlari ———

export type YoritishParametrlari = {
  rejim: VaqtRejimi;
  /** Hisoblangan lahza (ms) — majburiy rejimda shartli sana. */
  lahza: number;
  vaqt: ToshkentVaqti;
  quyosh: QuyoshHolati;
  /** Haqiqiy quyosh yo'nalishi (sahna o'qlarida). */
  quyoshYonalishi: Vektor;
  /** Oy yo'nalishi (to'lin oy taxmini: quyoshga qarama-qarshi, 25…60° balandlikda). */
  oyYonalishi: Vektor;
  faza: FazaUlushlari;
  /** Soya beruvchi yagona yo'naltirilgan yorug'lik: kunduzi quyosh, tunda oy. */
  asosiy: { manba: "quyosh" | "oy"; yonalish: Vektor; kuch: number; rang: string };
  /** Kuchsiz to'ldiruvchi yorug'lik (soyasiz). */
  toldiruvchi: { yonalish: Vektor; kuch: number; rang: string };
  yarimShar: { osmon: string; yer: string; kuch: number };
  tuman: { rang: string; yaqin: number; uzoq: number };
  /** drei Sky shader: quyosh nuqtasi (ufqdan pastga juda tushmaydi), Preetham parametrlari va tungi gradient aralashmasi. */
  osmon: { quyosh: Vektor; turbidity: number; rayleigh: number; mieCoefficient: number; mieDirectionalG: number; kunAralash: number; tunZenit: string; tunUfq: string };
  /** scene.environmentIntensity (Lightformer'lardan yasalgan muhit aksi). */
  muhitKuchi: number;
  /** Sahna foni (osmon ko'rinmaydigan joylar uchun) — tuman rangi bilan bir xil. */
  fon: string;
  yulduzlar: number;
  /** Tungi chiroqlar (derazalar, fonarlar, LED, ekranlar, nuqtali yorug'liklar) yoqilish ulushi 0…1. */
  chiroqlar: number;
};

/** Qo'lda tanlangan rejimlar uchun shartli lahzalar: "kun" — yozning 11:00 i, "tun" — 23:00 (Toshkent vaqti). */
export const MAJBURIY_LAHZA = { kun: Date.UTC(2026, 5, 15, 6, 0), tun: Date.UTC(2026, 5, 15, 18, 0) } as const;

const ASOSIY_RANG: Nuqta<string>[] = [[-2, "#ff6a2b"], [2, "#ff8c45"], [8, "#ffb36b"], [18, "#ffd9a8"], [35, "#fff1dc"], [55, "#fff6e8"]];
const ASOSIY_KUCH: Nuqta<number>[] = [[0, 0.45], [10, 0.68], [25, 0.88], [45, 1]];
const YARIM_OSMON: Nuqta<string>[] = [[-14, "#2e4372"], [-6, "#46578a"], [-1, "#a48aa0"], [4, "#e5bf9f"], [12, "#e8e3dc"], [22, "#e3edf8"]];
const YARIM_YER: Nuqta<string>[] = [[-14, "#171d29"], [-2, "#3c3a3d"], [6, "#5f6152"], [14, "#6f7d5e"]];
const YARIM_KUCH: Nuqta<number>[] = [[-14, 0.5], [-5, 0.42], [3, 0.46], [20, 0.55]];
const TUMAN_RANG: Nuqta<string>[] = [[-14, "#0d1526"], [-6, "#28344f"], [-1, "#7d7186"], [3, "#d2a284"], [9, "#d8cfc7"], [22, "#d4dfe9"]];
const TUMAN_YAQIN: Nuqta<number>[] = [[-12, 150], [2, 200], [10, 220]];
const TUMAN_UZOQ: Nuqta<number>[] = [[-12, 600], [10, 720]];
const TOLD_RANG: Nuqta<string>[] = [[-10, "#6f86c0"], [0, "#b9a9d6"], [15, "#cfe0ff"]];
const TOLD_KUCH: Nuqta<number>[] = [[-10, 0.14], [0, 0.2], [15, 0.3]];
const MUHIT_KUCHI: Nuqta<number>[] = [[-12, 0.15], [-2, 0.24], [8, 0.5], [20, 0.6]];
const TUN_ZENIT: Nuqta<string>[] = [[-14, "#040a1a"], [-4, "#16264d"]];
const TUN_UFQ: Nuqta<string>[] = [[-14, "#0d1526"], [-6, "#28344f"], [-2, "#6b5a72"]];
/** To'ldiruvchi yorug'lik doim shimoli-g'arbdan (soyalarni biroz ochadi). */
const TOLD_YONALISH: Vektor = (() => {
  const v: Vektor = [-30, 20, -20];
  const l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l];
})();

/** Sana (avto rejim, Toshkent quyoshi) yoki majburiy "kun"/"tun" uchun sahna yoritishi parametrlari. */
export function yoritishParametrlari(manba: Lahza | "kun" | "tun"): YoritishParametrlari {
  const rejim: VaqtRejimi = manba === "kun" || manba === "tun" ? manba : "avto";
  const lahza = manba === "kun" || manba === "tun" ? MAJBURIY_LAHZA[manba] : ms(manba);
  const quyosh = quyoshHolati(lahza);
  const e = quyosh.balandlik;
  const faza = kunFazasi(e, quyosh.azimut < 180);
  const quyoshYonalishi = sahnaYonalishi(quyosh.azimut, e);
  const oyYonalishi = sahnaYonalishi(mod(quyosh.azimut + 180, 360), Math.min(60, Math.max(25, -e)));

  // Asosiy yorug'lik: quyosh −4° dan yuqorida — quyosh (soya cho'zilib ketmasin: yo'nalish kamida 5°), aks holda oy.
  const quyoshKuchi = 2.3 * silliqQadam(-3, 8, e) * sonJadval(ASOSIY_KUCH, e);
  const oyKuchi = 0.6 * (1 - silliqQadam(-12, -5, e));
  const asosiy: YoritishParametrlari["asosiy"] =
    e > -4
      ? { manba: "quyosh", yonalish: sahnaYonalishi(quyosh.azimut, Math.max(5, e)), kuch: quyoshKuchi, rang: rangJadval(ASOSIY_RANG, e) }
      : { manba: "oy", yonalish: oyYonalishi, kuch: oyKuchi, rang: "#a9c1ff" };

  const tumanRang = rangJadval(TUMAN_RANG, e);
  return {
    rejim,
    lahza,
    vaqt: toshkentVaqti(lahza),
    quyosh,
    quyoshYonalishi,
    oyYonalishi,
    faza,
    asosiy,
    toldiruvchi: { yonalish: TOLD_YONALISH, kuch: sonJadval(TOLD_KUCH, e), rang: rangJadval(TOLD_RANG, e) },
    yarimShar: { osmon: rangJadval(YARIM_OSMON, e), yer: rangJadval(YARIM_YER, e), kuch: sonJadval(YARIM_KUCH, e) },
    tuman: { rang: tumanRang, yaqin: sonJadval(TUMAN_YAQIN, e), uzoq: sonJadval(TUMAN_UZOQ, e) },
    osmon: {
      quyosh: sahnaYonalishi(quyosh.azimut, Math.max(-1.5, e)),
      turbidity: sonJadval([[0, 9], [10, 6], [30, 4.5]], e),
      rayleigh: sonJadval([[0, 2.6], [10, 1.8], [30, 1.2]], e),
      mieCoefficient: sonJadval([[0, 0.006], [30, 0.004]], e),
      mieDirectionalG: sonJadval([[0, 0.86], [30, 0.8]], e),
      kunAralash: silliqQadam(-8, 2, e),
      tunZenit: rangJadval(TUN_ZENIT, e),
      tunUfq: rangJadval(TUN_UFQ, e),
    },
    muhitKuchi: sonJadval(MUHIT_KUCHI, e),
    fon: tumanRang,
    yulduzlar: faza.yulduzUlushi,
    chiroqlar: faza.chiroqUlushi,
  };
}

// ——— Tungi shahar: fasad teksturasidan "yoniq derazalar" niqobi ———

export type DerazaFasadi = "panel" | "gisht" | "ofis" | "uy" | "dokon";

/** Fasad teksturasidagi katakchalar (seksiya × qavat) soni va tunda yoniq derazalar ulushi. */
export const DERAZA_KATAKLARI: Record<DerazaFasadi, { ustun: number; qator: number; yoniq: number }> = {
  panel: { ustun: 4, qator: 4, yoniq: 0.55 },
  gisht: { ustun: 3, qator: 2, yoniq: 0.55 },
  ofis: { ustun: 4, qator: 2, yoniq: 0.45 },
  uy: { ustun: 2, qator: 1, yoniq: 0.6 },
  dokon: { ustun: 1, qator: 1, yoniq: 1 },
};

/** Piksel deraza oynasimi: ko'kish shisha (osmon aksi) yoki allaqachon yoniq sariq deraza. Devor, g'isht, rama — yo'q. */
export function derazaPikselimi(r: number, g: number, b: number) {
  const shisha = b > 90 && b > r + 18 && g > r;
  const yoniq = r > 210 && g > 150 && r - b > 90;
  return shisha || yoniq;
}

/** Katak (deraza) tunda yoniqmi — takrorlanadigan xesh (sahna har ochilganda bir xil). */
export function derazaYoniqmi(ustun: number, qator: number, ulush: number, urug = 0) {
  let h = Math.imul(ustun + 1, 73856093) ^ Math.imul(qator + 1, 19349663) ^ Math.imul(urug + 7, 83492791);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296 < ulush;
}

/**
 * Fasad teksturasi piksellaridan (RGBA) tungi nur niqobi: yoniq kataklardagi deraza piksellari iliq (ba'zilari sovuqroq) rangda,
 * qolgani qora. Natija emissiveMap sifatida ishlatiladi — tunda faqat derazalar yonadi.
 */
export function derazaNiqobi(piksellar: ArrayLike<number>, eni: number, boyi: number, tur: DerazaFasadi): Uint8ClampedArray {
  const { ustun, qator, yoniq } = DERAZA_KATAKLARI[tur];
  const natija = new Uint8ClampedArray(eni * boyi * 4);
  const iliq = [255, 196, 122];
  const sovuq = [214, 226, 255];
  for (let y = 0; y < boyi; y++) {
    const q = Math.min(qator - 1, Math.floor((y / boyi) * qator));
    for (let x = 0; x < eni; x++) {
      const u = Math.min(ustun - 1, Math.floor((x / eni) * ustun));
      const i = (y * eni + x) * 4;
      natija[i + 3] = 255;
      if (!derazaYoniqmi(u, q, yoniq) || !derazaPikselimi(piksellar[i], piksellar[i + 1], piksellar[i + 2])) continue;
      const rang = derazaYoniqmi(u, q, 0.2, 3) ? sovuq : iliq;
      natija[i] = rang[0];
      natija[i + 1] = rang[1];
      natija[i + 2] = rang[2];
    }
  }
  return natija;
}
