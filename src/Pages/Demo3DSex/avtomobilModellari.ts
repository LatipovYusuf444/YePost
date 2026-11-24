import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { ASOSIY_YOL, AVTOBUS_BEKATI, CHIQISH, KIRISH, KUTISH_JOYLARI, ORQA_YOL, TASHQI_TURARGOH, type RampaRaqami } from "./hudud.ts";
import { MARSHRUTLAR, YUK_MASHINASI, marshrutHolati, marshrutTuz, yangiHolat, type Bolak, type Marshrut, type Nuqta } from "./yollar.ts";
import type { ReysBosqichi } from "./sexModeli.ts";

// Transport ko'rinishining sof qismi (React'siz): KAMAZ-uslubidagi yuk mashinasi o'lchamlari va geometriyalari, materiallar,
// shlagbaum mantig'i, tashqi avtoturargoh (band joylar, qatnovchi avtomobillar jadvali), avtobus bekati qarori, ko'cha harakati
// va GLB avtomobil modellarini instancing uchun tayyorlash. Testlar shu faylni to'g'ridan-to'g'ri import qiladi (node).

// ───────────────────────────── Yuk mashinasi (6×4, kabina dvigatel ustida) ─────────────────────────────

/**
 * O'lchamlar (metr). Markaz — uzunlik o'rtasi, oldi +z (old bamper z = 4.3, orqa z = −4.3), chap tomoni +x.
 * Oldingi o'q kabina ostida, orqada ikki yetakchi o'q (juft g'ildiraklar).
 */
export const YUK = {
  yarimUzunlik: YUK_MASHINASI.uzunlik / 2,
  yarimEni: YUK_MASHINASI.eni / 2,
  goldirak: { r: 0.52, oldZ: 3.35, orqaZ: [-1.45, -2.78] as const },
  kabina: { orqa: 1.95, old: 4.25, past: 1.1, bel: 2.05, tom: 2.86, yarimEni: 1.21 },
  kuzov: { orqa: -4.3, old: 1.75, pol: 1.25, balandlik: 2.55 },
  /** Haydovchi o'rni (chap tomonda): `Ishchi` ning `p` qiymati (o'tirgan holatda boshi ≈ 2.55 m da). */
  haydovchi: [0.55, 0.87, 3.3] as [number, number, number],
} as const;

/** Kuzovdagi palet joylari [x, z] (oldindan orqaga). */
export const PALET_JOYLARI: ReadonlyArray<readonly [number, number]> = [[-0.6, 1.05], [0.6, 1.05], [-0.6, -0.25], [0.6, -0.25], [-0.6, -1.55], [0.6, -1.55]];

export type KuzovTuri = "furgon" | "tent";
/** Ko'rinish: kabina rangi (0 — to'q sariq, 1 — oq, 2 — ko'k), kuzov turi, tent rangi (0 — ko'k, 1 — yashil, 2 — kulrang). */
export type YukKorinishi = { kabina: 0 | 1 | 2; kuzov: KuzovTuri; tent: 0 | 1 | 2 };

/** Reys yuk mashinasining ko'rinishi: jo'natish — yopiq furgon, qabul — tentli bort. Rampa bo'yicha rang. */
export function reysKorinishi(rampa: RampaRaqami, yonalish: "jonatish" | "qabul"): YukKorinishi {
  const kabina = ([0, 1, 2, 0] as const)[(rampa - 1) % 4];
  return { kabina, kuzov: yonalish === "jonatish" ? "furgon" : "tent", tent: rampa === 3 ? 0 : 1 };
}

/** Kutish joylaridagi to'xtab turgan mashinalar (haydovchisiz, oldi +z). */
export const KUTAYOTGAN_MASHINALAR: ReadonlyArray<YukKorinishi & { x: number; z: number; raqam: string }> = KUTISH_JOYLARI.map((j, i) => ({
  x: j.x,
  z: j.z,
  raqam: ["01 518 FAA", "10 274 HBA", "25 903 KAA"][i % 3],
  ...([{ kabina: 2, kuzov: "tent", tent: 1 }, { kabina: 0, kuzov: "furgon", tent: 0 }, { kabina: 1, kuzov: "tent", tent: 2 }] as const)[i % 3],
}));

/** Kuzovdagi paletlar soni: jo'natishda yuklangan, qabulda hali tushirilmagan. */
export function kuzovdagiPalet(r: { yonalish: "jonatish" | "qabul"; bosqich: ReysBosqichi; palet: number; jamiPalet: number }) {
  if (r.yonalish === "jonatish") return r.bosqich === "rampada" ? r.palet : r.bosqich === "ketmoqda" ? r.jamiPalet : 0;
  return r.bosqich === "kelmoqda" ? r.jamiPalet : r.bosqich === "rampada" ? Math.max(0, r.jamiPalet - r.palet) : 0;
}

/** Orqaga yurish bo'lagi (rampaga kirish) qachon boshlanadi — kelish marshruti boshidan soniya. */
export function orqagaBoshlanishi(rampa: RampaRaqami) {
  const b = MARSHRUTLAR[rampa].kelish.bolaklar;
  return b[b.length - 1].boshlanish;
}

/**
 * Orqa eshiklar (tentda — pardalar va bort) ochiqligi: rampaga orqa bilan kirishdan sal oldin ochiladi (devorga tegmasligi uchun),
 * rampada ochiq turadi, jo'nab ketgach 2 s da yopiladi.
 */
export function eshikOchiqmi(rampa: RampaRaqami, bosqich: ReysBosqichi, t: number) {
  if (bosqich === "rampada") return true;
  if (bosqich === "kelmoqda") return t >= orqagaBoshlanishi(rampa) - 0.6;
  if (bosqich === "ketmoqda") return t < 2;
  return false;
}

// ───────────────────────────── Shlagbaumlar ─────────────────────────────

/** Shlagbaum: qator markazi, strela tekisligi (z) va mashina o'tish yo'nalishi (−1 — hududga kirish, +1 — chiqish). */
export type ShlagbaumTavsifi = { x: number; z: number; yon: -1 | 1; ustunX: number };
export const SHLAGBAUMLAR = {
  kirish: { x: KIRISH.x, z: KIRISH.shlagbaumZ, yon: -1, ustunX: KIRISH.ustunX },
  chiqish: { x: CHIQISH.x, z: CHIQISH.shlagbaumZ, yon: 1, ustunX: CHIQISH.ustunX },
} as const satisfies Record<string, ShlagbaumTavsifi>;

/**
 * Strela uzunligi (aylanish o'qidan uchigacha). hudud.ts dagi 4.8 m dan qisqaroq: KPP navesi 5.4 m balandlikda — tik ko'tarilgan
 * strela uchi (0.95 + 4.3 = 5.25 m) navesga tegmaydi. Uchi qator chetidagi tayanchga (orol bordyuri yonida) yotadi.
 */
export const STRELA = { uzunlik: 4.3, oqBalandligi: 0.95, ochiqBurchak: 1.53, ochilishVaqti: 1.3 } as const;
/** Mashina shlagbaum oldidagi kutishi tugashidan necha soniya oldin strela ko'tarila boshlaydi. */
export const SHLAGBAUM_OLDIN = 1.7;

/** Shlagbaumga yaqin mashina: markazi, yo'nalishi, marshrut vaqti va shu shlagbaum oldida turish oralig'i (marshrut boshidan, s). */
export type ShlagbaumMashinasi = { x: number; z: number; burchak: number; t: number; toxtash: readonly [number, number] };

/**
 * Strela ko'tarilishi kerakmi: mashina shu qatorda, shlagbaum tomonga qarab harakatlanmoqda (kirishda — hududga, chiqishda — ko'chaga),
 * shlagbaum oldida (yoki tagida) va kutish vaqti tugay deb qolgan. Mashina orqasi strela tekisligidan o'tib ketgach yopiladi.
 */
export function shlagbaumOchiqmi(mashinalar: ReadonlyArray<ShlagbaumMashinasi>, s: ShlagbaumTavsifi, oldin = SHLAGBAUM_OLDIN) {
  const yarim = YUK.yarimUzunlik;
  return mashinalar.some((m) => {
    if (Math.abs(m.x - s.x) > 2.6) return false;
    if (Math.cos(m.burchak) * s.yon < 0.5) return false;
    // Strela mashina markazidan oldinda qancha masofada (musbat — hali yetib kelmagan).
    const d = (s.z - m.z) * s.yon;
    if (d > yarim + 2.5 || d < -(yarim + 1.2)) return false;
    return m.t >= m.toxtash[1] - oldin;
  });
}

/** Strela harakati: `ulush` 0 (yopiq) … 1 (ochiq) tomon doimiy tezlikda siljiydi; burchak — silliq egri bo'yicha. */
export function strelaQadami(ulush: number, ochiq: boolean, dt: number) {
  const q = dt / STRELA.ochilishVaqti;
  return ochiq ? Math.min(1, ulush + q) : Math.max(0, ulush - q);
}
export const strelaBurchagi = (ulush: number) => ulush * ulush * (3 - 2 * ulush) * STRELA.ochiqBurchak;

// ───────────────────────────── Yo'l chizgich (to'g'ri chiziq + aylana yoyi) ─────────────────────────────
// Yo'nalish burchagi: (sin θ, cos θ) — θ = 0 → +z, π/2 → +x, −π/2 → −x, π → −z. Burilish: musbat — chapga, manfiy — o'ngga.

const CHAP = Math.PI / 2;
const ONG = -Math.PI / 2;

class Yol {
  nuqtalar: Nuqta[];
  x: number;
  z: number;
  th: number;

  constructor(x: number, z: number, burchak: number, tezlik: number) {
    this.x = x;
    this.z = z;
    this.th = burchak;
    this.nuqtalar = [[x, z, tezlik]];
  }

  togri(uzunlik: number, tezlik: number) {
    if (uzunlik <= 1e-6) return this;
    const dx = Math.sin(this.th);
    const dz = Math.cos(this.th);
    const qadamlar = new Set<number>();
    if (uzunlik > 4) { qadamlar.add(1.2); qadamlar.add(uzunlik - 1.2); }
    for (let d = 8; d < uzunlik - 4; d += 8) qadamlar.add(d);
    qadamlar.add(uzunlik);
    for (const d of [...qadamlar].sort((a, b) => a - b)) this.nuqtalar.push([this.x + dx * d, this.z + dz * d, tezlik]);
    this.x += dx * uzunlik;
    this.z += dz * uzunlik;
    return this;
  }

  gacha(o: { x?: number; z?: number }, tezlik: number) {
    const uzunlik = o.x !== undefined ? (o.x - this.x) / Math.sin(this.th) : ((o.z ?? this.z) - this.z) / Math.cos(this.th);
    return this.togri(uzunlik, tezlik);
  }

  buril(radius: number, burchak: number, tezlik: number) {
    const s = Math.sign(burchak);
    const cx = this.x + s * radius * Math.cos(this.th);
    const cz = this.z - s * radius * Math.sin(this.th);
    const bolinish = Math.max(3, Math.ceil(Math.abs(burchak) / (Math.PI / 12)));
    for (let i = 1; i <= bolinish; i++) {
      const th = this.th + (burchak * i) / bolinish;
      this.nuqtalar.push([cx - s * radius * Math.cos(th), cz + s * radius * Math.sin(th), tezlik]);
    }
    this.th += burchak;
    this.x = cx - s * radius * Math.cos(this.th);
    this.z = cz + s * radius * Math.sin(this.th);
    return this;
  }
}

// ───────────────────────────── Ko'chalar va harakat ─────────────────────────────

export type Qator = { z: number; yon: -1 | 1 };
/** Ko'cha qatorlari: asosiy ko'cha (z 66: −x, z 70: +x) va orqa ko'cha (z −52: −x, z −48: +x). */
export const KOCHA_QATORLARI: ReadonlyArray<Qator> = [
  ...ASOSIY_YOL.qatorlar.map((q) => ({ z: q.z, yon: q.yon as -1 | 1 })),
  ...ORQA_YOL.qatorlar.map((q) => ({ z: q.z, yon: q.yon as -1 | 1 })),
];
/** Ko'chadagi avtomobillar x bo'yicha −CHEGARA…CHEGARA oralig'ida aylanadi (shaharcha radiusi). */
export const KOCHA_CHEGARASI = 240;

/** Yo'ldagi obyekt (to'siq): markazi, yo'nalishi va yarim uzunligi. */
export type YoldagiObyekt = { x: number; z: number; burchak: number; yarimUzunlik: number };

/** Ko'rinib turgan yuk mashinasi (shlagbaum, qorovul nigohi, ko'chadagi harakat uchun). */
export type YukMashinaIzi = { p: THREE.Vector3; burchak: number; rampa: RampaRaqami; bosqich: ReysBosqichi; t: number };

/** Transport qismlari o'zaro shu yerdan bir-birini "ko'radi" (har kadrda yangilanadi, React holati emas). */
export type TransportReestri = {
  yukMashinalari: Record<string, YukMashinaIzi | null>;
  /** Ko'chadagi yengil avtomobillar va ko'chaga chiqqan qatnovchilar. */
  avtomobillar: YoldagiObyekt[];
  avtobus: YoldagiObyekt & { korinadi: boolean };
  /** Qorovul qaraydigan eng yaqin mashina. */
  yaqin: { current: THREE.Vector3 | null };
};

export const yangiReestr = (): TransportReestri => ({
  yukMashinalari: {},
  avtomobillar: [],
  avtobus: { x: 0, z: 0, burchak: 0, yarimUzunlik: 0, korinadi: false },
  yaqin: { current: null },
});

/**
 * Qatordagi oldinda turgan eng yaqin to'siqgacha bo'sh masofa (bamperdan bamperga, m). Yo'q bo'lsa Infinity.
 * `qatorEni` — to'siq markazining qator o'qidan eng ko'p uzoqligi (burilayotgan mashina ham hisobga olinadi).
 */
export function oldindagiMasofa(x: number, z: number, yon: -1 | 1, yarim: number, obyektlar: ReadonlyArray<YoldagiObyekt>, qatorEni = 2.2) {
  let eng = Infinity;
  for (const o of obyektlar) {
    if (Math.abs(o.z - z) > qatorEni) continue;
    const d = (o.x - x) * yon;
    if (d <= 0.05) continue;
    eng = Math.min(eng, d - o.yarimUzunlik - yarim);
  }
  return eng;
}

/** Yuk mashinalari ko'chadagi to'siq sifatida, shu jumladan chiqish qatorida ko'chaga qo'shilish uchun turganlari. */
export function yukMashinaTosiqlari(reestr: TransportReestri, natija: YoldagiObyekt[], qoshilish: YoldagiObyekt[]) {
  natija.length = 0;
  qoshilish.length = 0;
  for (const m of Object.values(reestr.yukMashinalari)) {
    if (!m) continue;
    natija.push({ x: m.p.x, z: m.p.z, burchak: m.burchak, yarimUzunlik: YUK.yarimUzunlik });
    // Chiqish qatorida (shlagbaumdan ko'chagacha) — ko'chadagilar to'xtab o'tkazadi.
    if (m.bosqich === "ketmoqda" && Math.abs(m.p.x - CHIQISH.x) < 3.5 && m.p.z > 34 && m.p.z < ASOSIY_YOL.qatorlar[0].z - 1.2) {
      qoshilish.push({ x: CHIQISH.x + 7, z: ASOSIY_YOL.qatorlar[0].z, burchak: -Math.PI / 2, yarimUzunlik: 1 });
    }
  }
}

/** Takrorlanadigan "tasodifiy" son. */
export function urugliSon(urug: number) {
  let s = urug >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ───────────────────────────── Yengil avtomobillar (GLB) ─────────────────────────────

export type AvtomobilTuri = "sedan" | "hatchback" | "suv";
export const AVTOMOBIL_TURLARI: ReadonlyArray<AvtomobilTuri> = ["sedan", "hatchback", "suv"];
/** GLB modellarining gabariti (metr, oynalarsiz; fayllardagi chegaralar bo'yicha). */
export const AVTOMOBIL_OLCHAMI: Record<AvtomobilTuri, { uzunlik: number; eni: number }> = {
  sedan: { uzunlik: 4.22, eni: 1.81 },
  hatchback: { uzunlik: 3.31, eni: 1.64 },
  suv: { uzunlik: 4.19, eni: 2.11 },
};
/** Kuzov ranglari (O'zbekiston ko'chalaridagidek — oq va kumushrang ko'p). */
export const KUZOV_RANGLARI = ["#f4f5f7", "#f4f5f7", "#e9ebee", "#b9bec5", "#8d939b", "#2b2f36", "#111318", "#7a1a1a", "#1f3f7a", "#d8cfbf", "#2f4a3a", "#f4f5f7"];

export type TrafikMashina = { qator: number; x0: number; tezlik: number; tur: AvtomobilTuri; rang: string };

/** Ko'chadagi ~20 ta avtomobil: qatorlar bo'yicha teng taqsimlangan, tezliklari 9–13.5 m/s. */
export const TRAFIK: ReadonlyArray<TrafikMashina> = (() => {
  const soni = [5, 6, 4, 5];
  const turlar: AvtomobilTuri[] = ["sedan", "hatchback", "sedan", "suv", "sedan", "hatchback", "suv"];
  const rnd = urugliSon(907);
  const natija: TrafikMashina[] = [];
  soni.forEach((n, qator) => {
    const oraliq = (KOCHA_CHEGARASI * 2) / n;
    for (let j = 0; j < n; j++) {
      natija.push({
        qator,
        x0: -KOCHA_CHEGARASI + (j + 0.2 + rnd() * 0.6) * oraliq,
        tezlik: 9 + rnd() * 4.5,
        tur: turlar[(natija.length * 3 + qator) % turlar.length],
        rang: KUZOV_RANGLARI[Math.floor(rnd() * KUZOV_RANGLARI.length)],
      });
    }
  });
  return natija;
})();

// ───────────────────────────── Tashqi avtoturargoh ─────────────────────────────

export type TurargohJoyi = { qator: 0 | 1; j: number; x: number; z: number; burchak: number };
/** Joy chiziqlari x = x0 + qadam·k (k = 1…16) — har qatorda 15 ta joy (Shaharcha'dagi chizilgan joylar bilan bir xil). */
export const JOY_SONI = Math.floor((TASHQI_TURARGOH.x1 - TASHQI_TURARGOH.x0) / TASHQI_TURARGOH.qadam) - 2;
/** Yo'lak markazi (ikki qator orasida). */
export const YOLAK_Z = (TASHQI_TURARGOH.qatorlar[0] + TASHQI_TURARGOH.qatorlar[1]) / 2;
/** Turgan avtomobil markazi qator o'qidan tashqariga (yo'lakdan uzoqroq) surilgan — yo'lakda o'tish uchun joy qoladi. */
const QATOR_SURILISHI = 0.25;

export const turargohJoyi = (qator: 0 | 1, j: number): TurargohJoyi => ({
  qator,
  j,
  x: TASHQI_TURARGOH.x0 + (j + 1.5) * TASHQI_TURARGOH.qadam,
  z: TASHQI_TURARGOH.qatorlar[qator] + (qator === 0 ? -QATOR_SURILISHI : QATOR_SURILISHI),
  // 1-qator (panjara tomoni) — oldi −z ga, 2-qator — oldi +z ga (ko'chaga).
  burchak: qator === 0 ? Math.PI : 0,
});

/**
 * Qatnovchi avtomobillar joylari va turlari. Yo'lak tor (≈ 2.2 m) — shuning uchun qatnovchilar ixcham (hatchback);
 * ularning manyovr izi tushadigan joylarda kattaroq avtomobil turmaydi (pastdagi TURGAN_AVTOMOBILLAR).
 */
export const QATNOVCHI_JOYLARI: ReadonlyArray<TurargohJoyi> = [turargohJoyi(0, 3), turargohJoyi(1, 6), turargohJoyi(0, 9), turargohJoyi(1, 11)];
export const QATNOVCHI_TURLARI: ReadonlyArray<AvtomobilTuri> = ["hatchback", "hatchback", "hatchback", "hatchback"];
export const QATNOVCHI_RANGLARI: ReadonlyArray<string> = ["#b91c1c", "#f4f5f7", "#1d4ed8", "#9ca3af"];

/** Yo'naltirilgan to'rtburchak: markazi, yo'nalishi (oldi (sin θ, cos θ)), uzunligi va eni. */
export type YonalganTortburchak = { x: number; z: number; burchak: number; uzunlik: number; eni: number };

/** Ikki yo'naltirilgan to'rtburchak kesishadimi (ajratuvchi o'q teoremasi). */
export function tortburchakKesishadimi(a: YonalganTortburchak, b: YonalganTortburchak) {
  const oqlar = (t: YonalganTortburchak) => {
    const f: [number, number] = [Math.sin(t.burchak), Math.cos(t.burchak)];
    return [f, [f[1], -f[0]] as [number, number]];
  };
  const oa = oqlar(a);
  const ob = oqlar(b);
  const proyeksiya = (t: YonalganTortburchak, o: ReadonlyArray<[number, number]>, ox: number, oz: number) =>
    (t.uzunlik / 2) * Math.abs(o[0][0] * ox + o[0][1] * oz) + (t.eni / 2) * Math.abs(o[1][0] * ox + o[1][1] * oz);
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  for (const [ox, oz] of [...oa, ...ob]) {
    if (Math.abs(dx * ox + dz * oz) >= proyeksiya(a, oa, ox, oz) + proyeksiya(b, ob, ox, oz)) return false;
  }
  return true;
}

/** Qatnovchilar jadvali: davr 240 s, har 60 s da bittasi keladi, kelganidan 150 s keyin ketadi (turargohda bir vaqtda bittasi harakatlanadi). */
export const QATNOV = { davr: 240, oraliq: 60, turish: 150, boshlanish: 5, kirishX: TASHQI_TURARGOH.x1, chiqishX: TASHQI_TURARGOH.x0 } as const;

/** Burilish radiuslari: ko'chadan/ko'chaga — 4 m, yo'lakdan joyga — 2.7 m yoy va 0.5 m to'g'ri (joyga tekis kiradi). */
const QATNOV_TOGRI = 0.5;
const QATNOV_R = { kocha: 4, yolak: 3, joy: YOLAK_Z - turargohJoyi(0, 0).z - QATNOV_TOGRI, togri: QATNOV_TOGRI } as const;
const V_Q = { kocha: 11, burilish: 3.4, yolak: 3.6, joy: 1.6, orqaga: 1.3 } as const;

/** Qatnovchining marshrutlari: ko'chadan (x 62) yo'lak orqali joyga to'g'ri kiradi; ketishda orqaga chiqib, yo'lak bo'ylab x 14 dan ko'chaga. */
export function qatnovchiMarshrutlari(joy: TurargohJoyi): { kelish: Marshrut; ketish: Marshrut } {
  const kochaZ = ASOSIY_YOL.qatorlar[0].z;
  const rk = QATNOV_R.kocha;
  const ry = QATNOV_R.yolak;
  const rj = QATNOV_R.joy;
  const kelish = new Yol(112, kochaZ, -Math.PI / 2, V_Q.kocha)
    .gacha({ x: QATNOV.kirishX + rk }, V_Q.kocha)
    .buril(rk, ONG, V_Q.burilish)
    .gacha({ z: YOLAK_Z + ry }, V_Q.burilish)
    .buril(ry, CHAP, V_Q.burilish)
    .gacha({ x: joy.x + rj }, V_Q.yolak)
    .buril(rj, joy.qator === 0 ? ONG : CHAP, V_Q.joy)
    .togri(QATNOV_R.togri, V_Q.joy);
  const orqaga = new Yol(joy.x, joy.z, joy.qator === 0 ? 0 : Math.PI, V_Q.orqaga)
    .togri(QATNOV_R.togri, V_Q.orqaga)
    .buril(rj, joy.qator === 0 ? CHAP : ONG, V_Q.orqaga);
  const ketish = new Yol(orqaga.x, orqaga.z, -Math.PI / 2, 0)
    .gacha({ x: QATNOV.chiqishX + ry }, V_Q.yolak)
    .buril(ry, CHAP, V_Q.burilish)
    .gacha({ z: kochaZ - rk }, V_Q.burilish)
    .buril(rk, ONG, V_Q.burilish)
    .gacha({ x: -112 }, V_Q.kocha);
  const kelishBolaklari: Bolak[] = [{ nuqtalar: kelish.nuqtalar, boshTezlik: V_Q.kocha }];
  const ketishBolaklari: Bolak[] = [
    { nuqtalar: orqaga.nuqtalar, orqaga: true, kutish: 0.5 },
    { nuqtalar: ketish.nuqtalar, toxtamaydi: true },
  ];
  return { kelish: marshrutTuz(kelishBolaklari), ketish: marshrutTuz(ketishBolaklari) };
}

export type QatnovBosqichi = "yoq" | "kelmoqda" | "turibdi" | "ketmoqda";

/**
 * Qatnovchi k ning `soniya` (devor soati, s) dagi bosqichi va bosqich ichidagi vaqt. Jadval davriy: kelishi k·60 + 5,
 * ketishi kelishidan 150 s keyin. Kelish/ketish davomiyligi — marshrutdan.
 */
export function qatnovBosqichi(k: number, soniya: number, davomlar: { kelish: number; ketish: number }): { bosqich: QatnovBosqichi; t: number } {
  const kelishi = QATNOV.boshlanish + k * QATNOV.oraliq;
  const l = (((soniya - kelishi) % QATNOV.davr) + QATNOV.davr) % QATNOV.davr;
  if (l < davomlar.kelish) return { bosqich: "kelmoqda", t: l };
  if (l < QATNOV.turish) return { bosqich: "turibdi", t: l - davomlar.kelish };
  if (l < QATNOV.turish + davomlar.ketish) return { bosqich: "ketmoqda", t: l - QATNOV.turish };
  return { bosqich: "yoq", t: l - QATNOV.turish - davomlar.ketish };
}

/** Qatnovchi avtomobil izi atrofidagi zaxira (har tomondan, m). */
export const QATNOV_ZAXIRA = 0.08;

/** Qatnovchilarning turargoh ichidagi (ko'chadan tashqari) barcha holatlari — joy band qilishda shu izlarga tegmaslik tekshiriladi. */
function qatnovIzlari() {
  const h = yangiHolat();
  const izlar: YonalganTortburchak[][] = [];
  QATNOVCHI_JOYLARI.forEach((joy, k) => {
    const m = qatnovchiMarshrutlari(joy);
    const o = AVTOMOBIL_OLCHAMI[QATNOVCHI_TURLARI[k]];
    const iz: YonalganTortburchak[] = [];
    for (const r of [m.kelish, m.ketish]) {
      for (let t = 0; t <= r.davom; t += 0.1) {
        marshrutHolati(r, t, h);
        if (kochadami(h.p.z)) continue;
        iz.push({ x: h.p.x, z: h.p.z, burchak: h.burchak, uzunlik: o.uzunlik + 2 * QATNOV_ZAXIRA, eni: o.eni + 2 * QATNOV_ZAXIRA });
      }
    }
    izlar.push(iz);
  });
  return izlar;
}

/**
 * Doim turgan avtomobillar: har joyga tasodifiy tur va rang; agar shu tur biror qatnovchining manyovr iziga tegsa — ixchamroq tur
 * (hatchback), u ham tegsa joy bo'sh qoladi. Bundan tashqari ~30 % joy tabiiy ravishda bo'sh. Qatnovchilar kelganda ~70–75 % to'la.
 */
export const TURGAN_AVTOMOBILLAR: ReadonlyArray<TurargohJoyi & { tur: AvtomobilTuri; rang: string }> = (() => {
  const izlar = qatnovIzlari().flat();
  const rnd = urugliSon(77);
  const natija: Array<TurargohJoyi & { tur: AvtomobilTuri; rang: string }> = [];
  const tegadimi = (joy: TurargohJoyi, tur: AvtomobilTuri) => {
    const t = { x: joy.x, z: joy.z, burchak: joy.burchak, ...AVTOMOBIL_OLCHAMI[tur] };
    return izlar.some((iz) => tortburchakKesishadimi(iz, t));
  };
  for (const qator of [0, 1] as const) {
    for (let j = 0; j < JOY_SONI; j++) {
      const r = rnd();
      const tasodifiy = AVTOMOBIL_TURLARI[Math.floor(rnd() * 3)];
      const rang = KUZOV_RANGLARI[Math.floor(rnd() * KUZOV_RANGLARI.length)];
      const joy = turargohJoyi(qator, j);
      if (r < 0.3 || QATNOVCHI_JOYLARI.some((q) => q.qator === qator && q.j === j)) continue;
      const tur = !tegadimi(joy, tasodifiy) ? tasodifiy : !tegadimi(joy, "hatchback") ? "hatchback" : null;
      if (tur) natija.push({ ...joy, tur, rang });
    }
  }
  return natija;
})();

/** Qatnovchi ko'chada (asosiy ko'cha qatorida) turibdimi — u yerda oldindagilarga qarab sekinlashadi. */
export function kochadami(z: number) {
  return z > ASOSIY_YOL.z - ASOSIY_YOL.eni / 2 - 0.4;
}
/** Ko'chada sekinlashish hisobiga jadvaldan eng ko'p kechikish (s): turargohdagi oraliqlar bundan katta. */
export const QATNOV_KECHIKISH_CHEGARASI = 8;

// ───────────────────────────── Avtobus (xodimlar servisi) ─────────────────────────────

/** Avtobus: z = 66 qatori bo'ylab −x ga; bekatda eshigi bekatga to'g'ri keladigan joyda to'xtaydi (har ~60 s da bir reys). */
export const AVTOBUS = {
  davr: 60,
  boshX: 175,
  oxiriX: -215,
  tezlik: 12,
  kutish: 9,
  uzunlik: 9.2,
  /** Old eshik markazi avtobus markazidan oldinga (m). */
  eshikOldinda: 3.75,
  qatorZ: ASOSIY_YOL.qatorlar[0].z,
  /** Bekat yonida yo'l chetiga qanchalik yaqinlashadi (m). */
  chetga: 0.5,
  tormoz: 1.4,
} as const;
export const AVTOBUS_TOXTASH_X = AVTOBUS_BEKATI.x + AVTOBUS.eshikOldinda;
/** Bekat atrofidagi zona (to'xtagan avtobus va orqasidagi navbat): yuk mashinasi shu yerdan o'tadigan vaqtda avtobus to'xtamaydi. */
const BEKAT_ZONASI = { x0: AVTOBUS_BEKATI.x - 22, x1: AVTOBUS_BEKATI.x + 24 } as const;

/** Ketish marshruti bo'yicha yuk mashinasi bekat zonasida bo'ladigan vaqt oralig'i (marshrut boshidan, s). */
export const BEKAT_OYNALARI: Record<RampaRaqami, readonly [number, number] | null> = (() => {
  const natija = {} as Record<RampaRaqami, readonly [number, number] | null>;
  const h = yangiHolat();
  for (const rampa of [1, 2, 3, 4] as const) {
    const m = MARSHRUTLAR[rampa].ketish;
    let a = -1;
    let b = -1;
    for (let t = 0; t <= m.davom; t += 0.1) {
      marshrutHolati(m, t, h);
      const ichida = h.p.z > ASOSIY_YOL.z - ASOSIY_YOL.eni / 2 && h.p.x - YUK.yarimUzunlik < BEKAT_ZONASI.x1 && h.p.x + YUK.yarimUzunlik > BEKAT_ZONASI.x0;
      if (ichida && a < 0) a = t;
      if (ichida) b = t;
    }
    natija[rampa] = a < 0 ? null : [a, b];
  }
  return natija;
})();

/** Avtobus bekatda to'xtasinmi: to'xtash oralig'i hech bir yuk mashinasining bekat zonasidan o'tish oralig'iga tegmasa (zaxira bilan). */
export function avtobusToxtaydimi(toxtash: readonly [number, number], yuklar: ReadonlyArray<readonly [number, number]>, zaxira = 3) {
  return yuklar.every(([a, b]) => b + zaxira < toxtash[0] || a - zaxira > toxtash[1]);
}

// ───────────────────────────── Geometriyalar (bir marta yaratiladi, barcha nusxalar ishlatadi) ─────────────────────────────

const ATRIBUTLAR = ["position", "normal", "uv"];

function birlashtir(qismlar: THREE.BufferGeometry[], atributlar = ATRIBUTLAR) {
  const tayyor = qismlar.map((g) => {
    const n = g.index ? g.toNonIndexed() : g.clone();
    for (const nom of Object.keys(n.attributes)) if (!atributlar.includes(nom)) n.deleteAttribute(nom);
    return n;
  });
  const natija = mergeGeometries(tayyor, false);
  qismlar.forEach((g) => g.dispose());
  tayyor.forEach((g) => g.dispose());
  if (!natija) throw new Error("Geometriyalarni birlashtirib bo'lmadi");
  return natija;
}

function rangla(g: THREE.BufferGeometry, rang: THREE.Color) {
  const n = g.getAttribute("position").count;
  const r = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { r[i * 3] = rang.r; r[i * 3 + 1] = rang.g; r[i * 3 + 2] = rang.b; }
  g.setAttribute("color", new THREE.BufferAttribute(r, 3));
  return g;
}

/** Profil (z, y tekisligida) x bo'ylab `eni` ga cho'ziladi, qirralari yumaloq (bevel). Markazi x = 0. */
function profildan(shakl: THREE.Shape, eni: number, bevel = 0.05) {
  const g = new THREE.ExtrudeGeometry(shakl, { depth: eni - 2 * bevel, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 3, curveSegments: 10 });
  g.translate(0, 0, -(eni / 2 - bevel));
  g.rotateY(-Math.PI / 2);
  return g;
}

/** G'ildirak (shina profili + disk + gupchak), o'qi x bo'ylab, vertex ranglari bilan. */
function goldirakQismlari(r: number, en: number, x: number, rang: { shina: THREE.Color; disk: THREE.Color; gupchak: THREE.Color }) {
  const disk = r * 0.6;
  const y = en / 2;
  const profil = [[disk, -y], [r * 0.9, -y], [r * 0.985, -y * 0.78], [r, -y * 0.45], [r, y * 0.45], [r * 0.985, y * 0.78], [r * 0.9, y], [disk, y]].map(([a, b]) => new THREE.Vector2(a, b));
  const shina = rangla(new THREE.LatheGeometry(profil, 30), rang.shina);
  const diskG = rangla(new THREE.CylinderGeometry(disk, disk, en * 0.86, 26), rang.disk);
  const halqa = rangla(new THREE.CylinderGeometry(disk * 0.72, disk * 0.72, en * 0.9, 20), rang.gupchak);
  const gupchak = rangla(new THREE.CylinderGeometry(r * 0.16, r * 0.2, en + 0.05, 12), rang.gupchak);
  return [shina, diskG, halqa, gupchak].map((g) => {
    g.rotateZ(Math.PI / 2);
    g.translate(x, 0, 0);
    return g;
  });
}

/** O'qdagi g'ildiraklar (bitta mesh — butun o'q bir xil aylanadi). `xlar` — g'ildirak markazlari. */
export function oqGeometriyasi(r: number, en: number, xlar: ReadonlyArray<number>) {
  const rang = { shina: new THREE.Color("#1b1d20"), disk: new THREE.Color("#b8bec6"), gupchak: new THREE.Color("#5b626c") };
  return birlashtir(xlar.flatMap((x) => goldirakQismlari(r, en, x, rang)), [...ATRIBUTLAR, "color"]);
}

function yaratYukGeometriyalari() {
  const k = YUK.kabina;
  // Kabinaning pastki qismi (deraza chizig'igacha): old qirralari yumaloq.
  const past = new THREE.Shape();
  past.moveTo(k.orqa, k.past);
  past.lineTo(k.old - 0.14, k.past);
  past.quadraticCurveTo(k.old, k.past, k.old, k.past + 0.14);
  past.lineTo(k.old + 0.02, k.bel - 0.08);
  past.quadraticCurveTo(k.old + 0.02, k.bel, k.old - 0.06, k.bel);
  past.lineTo(k.orqa, k.bel);
  past.lineTo(k.orqa, k.past);
  // Tom ustidagi havo yo'naltirgich (spoyler): orqada baland, oldga qiya tushadi.
  const sp = new THREE.Shape();
  sp.moveTo(3.55, k.tom + 0.12);
  sp.lineTo(2.0, k.tom + 0.12);
  sp.lineTo(2.0, 3.62);
  sp.quadraticCurveTo(2.02, 3.74, 2.3, 3.74);
  sp.lineTo(3.55, k.tom + 0.12);
  // Old g'ildirak qanoti (yarim halqa).
  const qanot = new THREE.Shape();
  qanot.absarc(0, 0, 0.64, 0, Math.PI, false);
  qanot.absarc(0, 0, 0.6, Math.PI, 0, true);
  const qanotG = new THREE.ExtrudeGeometry(qanot, { depth: 0.38, bevelEnabled: false, curveSegments: 18 });
  qanotG.translate(0, 0, -0.19);
  qanotG.rotateY(-Math.PI / 2);
  const g = YUK.goldirak;
  return {
    kabinaPast: profildan(past, k.yarimEni * 2, 0.06),
    spoyler: profildan(sp, 2.3, 0.05),
    tom: (() => {
      const t = new RoundedBoxGeometry(k.yarimEni * 2, 0.16, 4.07 - k.orqa, 3, 0.07);
      t.translate(0, k.tom + 0.06, (4.07 + k.orqa) / 2);
      return t;
    })(),
    oldQanot: qanotG,
    oqOld: oqGeometriyasi(g.r, 0.3, [-1.03, 1.03]),
    oqOrqa: oqGeometriyasi(g.r, 0.28, [-1.1, -0.79, 0.79, 1.1]),
    avtobusOqOld: oqGeometriyasi(0.45, 0.27, [-1.0, 1.0]),
    avtobusOqOrqa: oqGeometriyasi(0.45, 0.25, [-1.03, -0.76, 0.76, 1.03]),
  };
}
let yukGeo: ReturnType<typeof yaratYukGeometriyalari> | null = null;
/** Yuk mashinasi va avtobusning maxsus qismlari (sahifa yopilganda ham saqlanadi — kichik). */
export function yukGeometriyalari() {
  yukGeo ??= yaratYukGeometriyalari();
  return yukGeo;
}

// ───────────────────────────── Materiallar ─────────────────────────────

type Chizuvchi = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

function kanvas(w: number, h: number, chiz: Chizuvchi) {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  chiz(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Furgon yon tomoni (6 × 2.55 m): oq panel, vertikal choklar va parchin qatorlari, pastda rangli tasma, "MEBEL" yozuvi va mebel tasviri. */
const furgonYoni = () => kanvas(1024, 432, (ctx, w, h) => {
  ctx.fillStyle = "#f3f5f7";
  ctx.fillRect(0, 0, w, h);
  const yorug = ctx.createLinearGradient(0, 0, 0, h);
  yorug.addColorStop(0, "rgba(255,255,255,0.5)");
  yorug.addColorStop(1, "rgba(160,170,182,0.18)");
  ctx.fillStyle = yorug;
  ctx.fillRect(0, 0, w, h);
  for (let x = w / 10; x < w; x += w / 10) {
    ctx.fillStyle = "rgba(110,122,138,0.35)";
    ctx.fillRect(x - 1, 0, 2, h);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillRect(x + 1, 0, 1, h);
    ctx.fillStyle = "rgba(90,100,115,0.35)";
    for (let y = 10; y < h; y += 22) ctx.fillRect(x - 5, y, 3, 3);
  }
  const tasma = ctx.createLinearGradient(0, 0, w, 0);
  tasma.addColorStop(0, "#1e3a8a");
  tasma.addColorStop(1, "#0284c7");
  ctx.fillStyle = tasma;
  ctx.fillRect(0, h * 0.74, w, h * 0.11);
  ctx.fillStyle = "#f59e0b";
  ctx.fillRect(0, h * 0.86, w, h * 0.025);
  ctx.fillStyle = "#1e3a8a";
  ctx.font = "900 120px Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("MEBEL", w * 0.07, h * 0.36);
  ctx.fillStyle = "#475569";
  ctx.font = "600 34px Arial, sans-serif";
  ctx.fillText("yuk tashish · yetkazib berish", w * 0.075, h * 0.6);
  // Mebel tasviri: shkaf va komod (oddiy shakllar).
  const x0 = w * 0.66;
  ctx.fillStyle = "#c79a64";
  ctx.fillRect(x0, h * 0.14, w * 0.1, h * 0.52);
  ctx.fillStyle = "#e5c8a0";
  ctx.fillRect(x0 + w * 0.112, h * 0.36, w * 0.15, h * 0.3);
  ctx.strokeStyle = "#7c5a34";
  ctx.lineWidth = 4;
  ctx.strokeRect(x0, h * 0.14, w * 0.1, h * 0.52);
  ctx.beginPath(); ctx.moveTo(x0 + w * 0.05, h * 0.14); ctx.lineTo(x0 + w * 0.05, h * 0.66); ctx.stroke();
  ctx.strokeRect(x0 + w * 0.112, h * 0.36, w * 0.15, h * 0.3);
  for (const y of [0.46, 0.56]) { ctx.beginPath(); ctx.moveTo(x0 + w * 0.112, h * y); ctx.lineTo(x0 + w * 0.262, h * y); ctx.stroke(); }
});

/** Tent (brezent) — oq asos (rangi materialdan): vertikal choklar, tasmalar, pastda arqon va ilgaklar, burmalar. */
const tentMatosi = () => kanvas(1024, 352, (ctx, w, h) => {
  ctx.fillStyle = "#e8e8e8";
  ctx.fillRect(0, 0, w, h);
  const rnd = urugliSon(31);
  for (let i = 0; i < 70; i++) {
    const x = rnd() * w;
    const g = ctx.createLinearGradient(x - 18, 0, x + 18, 0);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.5, rnd() > 0.5 ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.1)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - 18, 0, 36, h);
  }
  for (let x = w / 6; x < w; x += w / 6) {
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(x - 7, 0, 14, h);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(x - 7, 0, 2, h);
  }
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(0, 0, w, 10);
  // Pastki arqon (zigzag) va ilgaklar
  ctx.strokeStyle = "rgba(40,40,40,0.75)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 32) ctx.lineTo(x, x % 64 === 0 ? h - 34 : h - 12);
  ctx.stroke();
  ctx.fillStyle = "rgba(30,30,30,0.85)";
  for (let x = 0; x <= w; x += 64) ctx.fillRect(x - 4, h - 40, 8, 12);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(0, h - 8, w, 8);
});

/** Avtobus yo'nalish tablosi (sariq LED yozuv). */
const tabloMatni = () => kanvas(512, 64, (ctx, w, h) => {
  ctx.fillStyle = "#0b0b0b";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 40px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("XIZMAT · ZAVOD", w / 2, h / 2 + 2);
});

const std = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1, ...extra });

/** Yuk mashinalari, shlagbaum va avtobus materiallari (Logistika bir marta yaratadi va yopilganda tozalaydi). */
export function transportMateriallari() {
  const furgonT = furgonYoni();
  const tentT = tentMatosi();
  const tabloT = tabloMatni();
  return {
    kabina: [std("#df6418", { roughness: 0.3, metalness: 0.35 }), std("#eef1f4", { roughness: 0.3, metalness: 0.3 }), std("#1f4e96", { roughness: 0.3, metalness: 0.35 })],
    kabinaOyna: new THREE.MeshStandardMaterial({ color: "#2a3946", roughness: 0.04, metalness: 0.3, transparent: true, opacity: 0.4, depthWrite: false }),
    qoraPlastik: std("#25292f", { roughness: 0.75 }),
    rama: std("#1a1d22", { roughness: 0.55, metalness: 0.45 }),
    xrom: std("#e2e7ec", { roughness: 0.14, metalness: 0.95 }),
    alyumin: std("#c3c9d0", { roughness: 0.35, metalness: 0.8 }),
    /** Kabina ichki qoplamasi — faqat ichidan ko'rinadi (oynadan haydovchi va o'rindiqlar ko'rinib turadi). */
    ichki: std("#4a5059", { roughness: 0.9, side: THREE.BackSide }),
    orindiq: std("#2b2f36", { roughness: 0.85 }),
    rezina: std("#141619", { roughness: 0.95 }),
    oldChiroq: std("#fff8e1", { emissive: "#fff1c4", emissiveIntensity: 0.85, roughness: 0.2 }),
    orqaChiroq: std("#7f1212", { emissive: "#ef4444", emissiveIntensity: 0.8, roughness: 0.3 }),
    sariqChiroq: std("#d97706", { emissive: "#f59e0b", emissiveIntensity: 0.7, roughness: 0.3 }),
    furgonYon: std("#ffffff", { map: furgonT, roughness: 0.45, metalness: 0.15 }),
    furgonOq: std("#eef1f4", { roughness: 0.45, metalness: 0.2 }),
    furgonIchi: std("#8f969e", { roughness: 0.9, side: THREE.BackSide }),
    tent: [std("#2d5c8f", { map: tentT, roughness: 0.92 }), std("#4b6a43", { map: tentT, roughness: 0.92 }), std("#7d868f", { map: tentT, roughness: 0.92 })],
    goldirak: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0.25 }),
    avtobusKuzov: std("#f4f6f8", { roughness: 0.28, metalness: 0.35 }),
    avtobusOyna: std("#111a23", { roughness: 0.06, metalness: 0.65 }),
    avtobusTasma: std("#0f766e", { roughness: 0.4, metalness: 0.2 }),
    tablo: std("#111111", { map: tabloT, emissive: "#ffffff", emissiveMap: tabloT, emissiveIntensity: 0.9 }),
  };
}
export type TransportMateriallari = ReturnType<typeof transportMateriallari>;

/** Yengil avtomobillar (GLB) uchun: kuzov oq asosda (rangi har nusxaga instanceColor orqali), oyna, qolgan qismlar vertex rangida. */
export function avtomobilMateriallari() {
  return {
    kuzov: std("#ffffff", { roughness: 0.32, metalness: 0.45 }),
    oyna: std("#0e1822", { roughness: 0.05, metalness: 0.75 }),
    qolgan: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.2 }),
    goldirak: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.15 }),
  };
}

/** Obyekt ichidagi barcha material va teksturalarni bo'shatadi. */
export function materiallarniTozala(obj: Record<string, unknown>) {
  const tozalangan = new Set<unknown>();
  const toz = (x: unknown) => {
    if (tozalangan.has(x)) return;
    tozalangan.add(x);
    if (x instanceof THREE.MeshStandardMaterial) {
      x.map?.dispose();
      x.emissiveMap?.dispose();
      x.dispose();
    } else if (x instanceof THREE.Material) x.dispose();
  };
  Object.values(obj).forEach((q) => (Array.isArray(q) ? q.forEach(toz) : toz(q)));
}

// ───────────────────────────── GLB avtomobilni instancing uchun tayyorlash ─────────────────────────────

export type AvtomobilModeli = {
  kuzov: THREE.BufferGeometry;
  oyna: THREE.BufferGeometry;
  qolgan: THREE.BufferGeometry;
  /** Bitta g'ildirak (markazi 0 da, o'qi x bo'ylab). */
  goldirak: THREE.BufferGeometry;
  /** G'ildirak markazlari (avtomobil koordinatasida); `chap` — +x tomonda. */
  goldiraklar: Array<{ x: number; y: number; z: number; chap: boolean }>;
  /** G'ildirak radiusi. */
  radius: number;
};

/** Qolgan qismlar materiallari nomi → vertex rangi (chiroqlar yorqinroq). Ro'yxatda yo'q, "Windows" dan boshqa material — kuzov. */
const QOLGAN_RANGI: Record<string, string | null> = {
  Black: null,
  Grey: null,
  "Material.007": "#8a8f96",
  Headlights: "#f6efd8",
  TailLights: "#c0221c",
};

/**
 * GLB sahnasidan: kuzov (rangi instanceColor), oyna va qolgan qismlar (vertex rangi) alohida birlashtiriladi; g'ildiraklar
 * (tugunlarining pivoti markazda emas) alohida — markazga keltirilgan bitta g'ildirak va 4 ta joy.
 */
export function glbAvtomobili(ildiz: THREE.Object3D): AvtomobilModeli {
  ildiz.updateMatrixWorld(true);
  const kuzov: THREE.BufferGeometry[] = [];
  const oyna: THREE.BufferGeometry[] = [];
  const qolgan: THREE.BufferGeometry[] = [];
  const goldirak: Record<"oldChap" | "oldOng" | "orqa", THREE.BufferGeometry[]> = { oldChap: [], oldOng: [], orqa: [] };
  const rang = new THREE.Color();
  ildiz.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material)) return;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    const g = mesh.geometry.clone();
    g.applyMatrix4(mesh.matrixWorld);
    for (const nom of Object.keys(g.attributes)) if (nom !== "position" && nom !== "normal") g.deleteAttribute(nom);
    let tugun: THREE.Object3D | null = mesh;
    let goldirakTuri: keyof typeof goldirak | null = null;
    while (tugun && !goldirakTuri) {
      const n = tugun.name;
      if (/FrontLeftWheel/i.test(n)) goldirakTuri = "oldChap";
      else if (/FrontRightWheel/i.test(n)) goldirakTuri = "oldOng";
      else if (/BackWheels?/i.test(n)) goldirakTuri = "orqa";
      tugun = tugun.parent;
    }
    const nom = mat.name ?? "";
    if (goldirakTuri) {
      goldirak[goldirakTuri].push(rangla(g, rang.copy(mat.color)));
    } else if (nom === "Windows") {
      oyna.push(g);
    } else if (nom in QOLGAN_RANGI) {
      const r = QOLGAN_RANGI[nom];
      qolgan.push(rangla(g, r ? rang.set(r) : rang.copy(mat.color)));
    } else {
      kuzov.push(g);
    }
  });
  const pn = ["position", "normal"];
  const pnc = ["position", "normal", "color"];
  const chap = birlashtir(goldirak.oldChap, pnc);
  chap.computeBoundingBox();
  const cb = chap.boundingBox as THREE.Box3;
  const markaz = cb.getCenter(new THREE.Vector3());
  const eni = cb.max.x - cb.min.x;
  chap.translate(-markaz.x, -markaz.y, -markaz.z);
  const chegara = (qismlar: THREE.BufferGeometry[]) => {
    const b = new THREE.Box3();
    qismlar.forEach((q) => { q.computeBoundingBox(); if (q.boundingBox) b.union(q.boundingBox); });
    return b;
  };
  const ong = chegara(goldirak.oldOng).getCenter(new THREE.Vector3());
  const orqaB = chegara(goldirak.orqa);
  const orqa = orqaB.getCenter(new THREE.Vector3());
  goldirak.oldOng.forEach((g) => g.dispose());
  goldirak.orqa.forEach((g) => g.dispose());
  const orqaX = orqaB.max.x - eni / 2;
  return {
    kuzov: birlashtir(kuzov, pn),
    oyna: birlashtir(oyna, pn),
    qolgan: birlashtir(qolgan, pnc),
    goldirak: chap,
    goldiraklar: [
      { x: markaz.x, y: markaz.y, z: markaz.z, chap: true },
      { x: ong.x, y: ong.y, z: ong.z, chap: false },
      { x: orqaX, y: orqa.y, z: orqa.z, chap: true },
      { x: -orqaX, y: orqa.y, z: orqa.z, chap: false },
    ],
    radius: (cb.max.y - cb.min.y) / 2,
  };
}
