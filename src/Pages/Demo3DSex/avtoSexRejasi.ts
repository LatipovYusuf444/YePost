// 2-sex — avtomatlashtirilgan prolyot (x −32…32, z −41…−15) rejasi: bino karkasi, plita ombori (portal + vakuum ko'targich),
// 2 ta CNC nesting, 3 ta sanoat roboti (6 o'qli), kromka liniyasi, burg'ilash stanogi, konveyerlar, AGV yo'li va vaqt jadvallari.
// Toza funksiyalar (UI'siz, `@/` importlarisiz) — AvtoSex.tsx shu bo'yicha chizadi va jonlantiradi, testlar shu bo'yicha tekshiradi.
// Hamma harakat bitta soat (t, soniya) dan hisoblanadi: setState yo'q, kadrlar orasida holat saqlanmaydi.

import { AVTO_SEX, ORQA_OCHIQLAR, ORQA_OCHIQ_BALANDLIGI } from "./hudud.ts";
import { CHIQISH_ESHIKLARI_X, LIST_OLCHAMI, SIKLON_TRUBASI } from "./sexBinosi.ts";

export type Tortburchak = { x0: number; x1: number; z0: number; z1: number };
export type Nuqta = readonly [number, number];
export type V3 = [number, number, number];

export const tb = (x0: number, x1: number, z0: number, z1: number): Tortburchak => ({ x0, x1, z0, z1 });
/** Ustma-ust tushadimi (faqat tegib turish — kesishish emas). */
export function kesishadi(a: Tortburchak, b: Tortburchak, zaxira = 0) {
  return a.x0 < b.x1 + zaxira && a.x1 > b.x0 - zaxira && a.z0 < b.z1 + zaxira && a.z1 > b.z0 - zaxira;
}
export function ichida(a: Tortburchak, b: Tortburchak) {
  return a.x0 >= b.x0 - 1e-9 && a.x1 <= b.x1 + 1e-9 && a.z0 >= b.z0 - 1e-9 && a.z1 <= b.z1 + 1e-9;
}
const markaz = (x: number, z: number, eni: number, chuqurlik: number) => tb(x - eni / 2, x + eni / 2, z - chuqurlik / 2, z + chuqurlik / 2);

/** Silliq 0→1 (boshida va oxirida tezlik nol). */
export function silliq(u: number) {
  const v = Math.min(1, Math.max(0, u));
  return v * v * (3 - 2 * v);
}
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
/** Musbat qoldiq (manfiy vaqtlarda ham 0…m). */
export const qoldiq = (a: number, m: number) => ((a % m) + m) % m;
/** Burchaklar farqi (−π…π]. */
export function burchakFarqi(a: number, b: number) {
  let d = qoldiq(b - a, Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  return d;
}

// ── Bino ──

export const DEVOR_Q = 0.3;
/** Devorlarning ichki yuzi bilan chegaralangan pol (orqa z = −41, chap x = −32, o'ng past devor x = 32; old — asosiy sex devori z = −15). */
export const ICHKI = tb(AVTO_SEX.x0 + DEVOR_Q / 2, AVTO_SEX.x1 - DEVOR_Q / 2, AVTO_SEX.z0 + DEVOR_Q / 2, AVTO_SEX.z1 - DEVOR_Q / 2);
export const AVTO_H = AVTO_SEX.balandlik;
/** O'ng (kamera tomondagi) past devor balandligi. */
export const ONG_DEVOR_H = 1.2;
/** Deraza tasmasi (orqa va chap devor): gaz quvuri (4.8 m) va silos quvuri kirishi (8.2 m) bilan to'qnashmaydi. */
export const AVTO_DERAZA = { past: 5.6, tepa: 7.4, eni: 3.2 } as const;
export const ORQA_DERAZALAR_X = Array.from({ length: 15 }, (_, i) => -28 + i * 4);
export const CHAP_DERAZALAR_Z = [-38, -34, -30, -26, -22, -18];
/** Chap devordagi seksiyali darvoza (plita ombori ro'parasida, yopiq): markazi z, eni, balandligi. */
export const CHAP_DARVOZA = { z: -35.75, eni: 4.4, h: 4.6 } as const;

/** Fermalar (z bo'ylab, butun chuqurlik): ichki fermalar ochiqlar yonidagi portal ustunlariga tushadi (ochiq ichida ustun yo'q). */
export const AVTO_FERMA_X = [-24, -16.25, -7.75, 0, 7.75, 16.25, 24] as const;
export const AVTO_FERMA = { past: 8.0, tepa: 8.9, panellar: 12 } as const;
export const AVTO_USTUN_X = [-31.6, ...AVTO_FERMA_X, 31.6] as const;
/** Ustunlar qatori: orqa devor yonida va asosiy sex devori yonida (2-sex tomonida). */
export const AVTO_USTUN_Z = [-40.6, -15.4] as const;
export const AVTO_USTUN_KESIMI = 0.4;
export const AVTO_PROGON_Z = Array.from({ length: 9 }, (_, i) => AVTO_USTUN_Z[0] + (i * (AVTO_USTUN_Z[1] - AVTO_USTUN_Z[0])) / 8);
export function avtoUstunlar(): Array<{ x: number; z: number }> {
  return AVTO_USTUN_X.flatMap((x) => AVTO_USTUN_Z.map((z) => ({ x, z })));
}
/** Asosiy sexga o'tish ochiqlari (hudud.ts dan): x markazi, eni, balandligi. */
export const OCHIQLAR = ORQA_OCHIQLAR.map((o) => ({ x: o.x, eni: o.eni, h: ORQA_OCHIQ_BALANDLIGI }));

// ── Plita ombori: portal (gantry) va vakuum ko'targich ──

/** LDSP plita (2.8 × 2.07 m). */
export const PLITA = { uzunlik: LIST_OLCHAMI.uzunlik, eni: LIST_OLCHAMI.eni, qalinlik: 0.03 } as const;
/** Ombor maydoni (polda sariq chegarali): taxlamlar va CNC kirish stollari shu portal ostida. */
export const OMBOR = tb(-31.4, -13.9, -40.4, -30.6);
export const PORTAL = {
  /** Rels to'sinlari (x bo'ylab) z lari va ustki sathi. */
  relsZ: [-40.1, -30.9] as const,
  relsY: 6.0,
  relsX0: -31.35,
  relsX1: -13.95,
  /** Rels ustunlari (har ikki relsda). */
  ustunlarX: [-31.1, -24.65, -18.0, -14.2] as const,
  ustunKesimi: 0.35,
  /** Ko'prik (z bo'ylab) va arava sathi. */
  koprikY: 6.35,
  /** Vakuum ramasi (so'rg'ichlar osti) yuqori holati. */
  yuqori: 3.2,
} as const;
export const TAXLAM_X = [-29.6, -26.3, -23.0, -19.7] as const;
export const TAXLAM_Z = [-38.7, -35.75, -32.8] as const;
export const PACHKA = 0.22;
export const TAGLIK = 0.1;
/** Plita taxlamlari: 4 × 3, har biri 2–6 pachka. `tepa` — ustki plita yuzi (ko'targich shu yerga tushadi). */
export const TAXLAMLAR = TAXLAM_Z.flatMap((z, i) => TAXLAM_X.map((x, j) => {
  const pachka = 2 + ((i * 7 + j * 3 + 1) % 5);
  return { x, z, pachka, tepa: Math.round((TAGLIK + pachka * PACHKA) * 1000) / 1000, rang: (i + j * 2) % 4 };
}));

// ── CNC nesting (2 ta): kirish (ko'targich stol) → ishlov stoli → chiqish stoli, plita +x ga siljiydi ──

export const CNC_QATORLARI = [
  { id: "cnc1", z: -37.1, faza: 0 },
  { id: "cnc2", z: -33.1, faza: 12 },
] as const;
export const CNC = {
  kirishX: -15.7,
  stolX: -11.5,
  chiqishX: -7.5,
  stolY: 0.9,
  /** Kirish stolidagi plitalar ustki yuzi (portal shu yerga qo'yadi). */
  kirishY: 0.96,
  /** Portal (ko'prik) va shpindel harakati oralig'i (stol markaziga nisbatan). */
  portalX: 1.25,
  aravaZ: 0.85,
  shpindelYuqori: 1.55,
  shpindelKesish: 0.98,
  davr: 24,
  kochish: 2,
} as const;
export const CNC_KIRISH_STOLI = (z: number) => markaz(CNC.kirishX, z, 3.0, 2.2);
export const CNC_STANOGI = (z: number) => markaz(CNC.stolX, z, 4.4, 3.0);
export const CNC_CHIQISH_STOLI = (z: number) => markaz(CNC.chiqishX, z, 3.0, 2.2);

/** CNC holati: plitalar joyi (A — yangi plita kirishdan stolga, B — kesilgan plita stoldan chiqishga), portal/arava/shpindel. */
export function cncHolati(t: number, faza: number, qatorZ: number) {
  const tau = qoldiq(t - faza, CNC.davr);
  const u = tau < CNC.kochish ? silliq(tau / CNC.kochish) : 1;
  const a = lerp(CNC.kirishX, CNC.stolX, u);
  const b = lerp(CNC.stolX, CNC.chiqishX, u);
  // Kesish: [2.5, 23] da — portal x bo'ylab sekin, arava z bo'ylab tez (zig-zag), shpindel vaqti-vaqti bilan ko'tariladi.
  const ichki = Math.min(silliq((tau - 2.2) / 0.8), silliq((CNC.davr - 0.4 - tau) / 0.8));
  const w = (tau - 2.2) / (CNC.davr - 2.6);
  const px = CNC.stolX + ichki * CNC.portalX * Math.sin(2 * Math.PI * w * 1.5);
  const az = qatorZ + ichki * CNC.aravaZ * Math.sin(2 * Math.PI * w * 7 + 0.4);
  const kotar = Math.pow(Math.max(0, Math.sin(2 * Math.PI * w * 5)), 10);
  const sy = lerp(CNC.shpindelYuqori, CNC.shpindelKesish, ichki) + kotar * 0.25 * ichki;
  return { plitaA: a, plitaB: b, portalX: px, aravaZ: az, shpindelY: sy, kesmoqda: ichki > 0.5 && kotar < 0.2 };
}

/** Portal yarim sikli (s): bitta plitani taxlamdan bitta CNC kirish stoliga olib boradi. Juft yarimlarda — cnc2, toqlarida — cnc1. */
export const PORTAL_YARIM = 12;
const P_FAZA = { borish: 3.5, tushish: 5.0, olish: 5.6, kotarish: 7.0, eltish: 10.0, qoyish: 11.0, qoyib: 11.4 } as const;
export const PORTAL_USHLASH = 5.3;
export const PORTAL_QOYISH = 11.2;
function portalManzili(k: number) {
  const cnc = CNC_QATORLARI[qoldiq(k, 2) === 0 ? 1 : 0];
  const taxlam = TAXLAMLAR[qoldiq(k * 5, TAXLAMLAR.length)];
  return { taxlam, kirishZ: cnc.z };
}
/** Portal holati: ko'prik x, arava z, vakuum ramasi ostki sathi y, plita ushlanganmi. */
export function portalHolati(t: number) {
  const k = Math.floor(t / PORTAL_YARIM);
  const tau = t - k * PORTAL_YARIM;
  const { taxlam, kirishZ } = portalManzili(k);
  const oldingi = portalManzili(k - 1);
  const yuqori = PORTAL.yuqori;
  const qoyishY = CNC.kirishY + PLITA.qalinlik;
  let x: number, z: number, y: number;
  if (tau < P_FAZA.borish) {
    const u = silliq(tau / P_FAZA.borish);
    x = lerp(CNC.kirishX, taxlam.x, u);
    z = lerp(oldingi.kirishZ, taxlam.z, u);
    y = yuqori;
  } else if (tau < P_FAZA.olish) {
    x = taxlam.x;
    z = taxlam.z;
    y = lerp(yuqori, taxlam.tepa, silliq((tau - P_FAZA.borish) / (P_FAZA.tushish - P_FAZA.borish)));
  } else if (tau < P_FAZA.kotarish) {
    x = taxlam.x;
    z = taxlam.z;
    y = lerp(taxlam.tepa, yuqori, silliq((tau - P_FAZA.olish) / (P_FAZA.kotarish - P_FAZA.olish)));
  } else if (tau < P_FAZA.eltish) {
    const u = silliq((tau - P_FAZA.kotarish) / (P_FAZA.eltish - P_FAZA.kotarish));
    x = lerp(taxlam.x, CNC.kirishX, u);
    z = lerp(taxlam.z, kirishZ, u);
    y = yuqori;
  } else if (tau < P_FAZA.qoyib) {
    x = CNC.kirishX;
    z = kirishZ;
    y = lerp(yuqori, qoyishY, silliq((tau - P_FAZA.eltish) / (P_FAZA.qoyish - P_FAZA.eltish)));
  } else {
    x = CNC.kirishX;
    z = kirishZ;
    y = lerp(qoyishY, yuqori, silliq((tau - P_FAZA.qoyib) / (PORTAL_YARIM - P_FAZA.qoyib)));
  }
  return { x, z, y, yuk: tau >= PORTAL_USHLASH && tau < PORTAL_QOYISH, kirishZ };
}

// ── Detal oqimi (takt 4 s): R1 saralaydi → C1 → R2 kromkaga beradi → kromka → burilish → burg'ilash → C3 → R3 paletlaydi ──

export const TAKT = 4;
export const DETAL = { uzunlik: 0.9, eni: 0.55, qalinlik: 0.03 } as const;
/** Rolik/lenta ustki sathi (barcha konveyerlar, kromka va burg'ilash stoli). */
export const KONVEYER_Y = 0.9;
const DY = KONVEYER_Y + DETAL.qalinlik;
export const LINIYA_Z = -36.4;
export const BURILISH_X = 23.0;
export const C1 = { x0: -2.2, x1: 1.4, v: 0.6 } as const;
export const KROMKA = { kirishX: 5.2, x0: 7.2, x1: 17.2, v: 0.6 } as const;
export const BURGILASH = { z0: -31.8, z1: -26.8, ishZ: -29.3, toxtash: 1.8 } as const;
export const C3_OXIRI_Z = -24.3;
export const S3_V = 0.5;
/** Paletlash: 2 palet (navbat bilan), har birida 12 qatlamgacha. */
export const PALETLAR: readonly Nuqta[] = [[27.4, -25.4], [27.4, -21.6]];
export const PALET_Y = 0.15;
export const QATLAM_MAX = 12;

// ── Robotlar (6 o'qli, umumiy sanoat roboti: poydevor, asos (J1), yelka (J2), tirsak (J3), bilak (J5), flanets (J6)) ──

export const ROBOT = { poydevor: 0.6, h1: 0.75, a1: 0.3, L2: 1.3, L3: 1.45, Lt: 0.55 } as const;
/** Robot sikli (takt ichida, s): ushlash va qo'yib yuborish paytlari. */
export const USHLASH = 1.65;
export const QOYISH = 3.65;
const KUTISH = 0.4;

export type RobotVazifa = "saralash" | "kromkaga" | "paletlash";
export type RobotTavsifi = { id: string; vazifa: RobotVazifa; asos: Nuqta; faza: number };

// Vaqtlar (detal yoshi — R1 uni C1 ga qo'ygandan beri o'tgan soniyalar)
export const YOSH = (() => {
  const c1Oxiri = (C1.x1 - C1.x0) / C1.v;
  const r2Ushlash = c1Oxiri + KUTISH;
  const r2Qoyish = r2Ushlash + (QOYISH - USHLASH);
  const burilish = r2Qoyish + (BURILISH_X - KROMKA.kirishX) / KROMKA.v;
  const burgilashga = burilish + (BURGILASH.ishZ - LINIYA_Z) / S3_V;
  const burgilashdan = burgilashga + BURGILASH.toxtash;
  const c3Oxiri = burgilashdan + (C3_OXIRI_Z - BURGILASH.ishZ) / S3_V;
  const r3Ushlash = c3Oxiri + KUTISH;
  return { c1Oxiri, r2Ushlash, r2Qoyish, burilish, burgilashga, burgilashdan, c3Oxiri, r3Ushlash, r3Qoyish: r3Ushlash + (QOYISH - USHLASH) };
})();

const R1_FAZA = 0;
export const ROBOTLAR: readonly RobotTavsifi[] = [
  { id: "R1", vazifa: "saralash", asos: [-4.6, -35.1], faza: R1_FAZA },
  { id: "R2", vazifa: "kromkaga", asos: [3.2, -34.6], faza: qoldiq(R1_FAZA + QOYISH + YOSH.r2Ushlash - USHLASH, TAKT) },
  { id: "R3", vazifa: "paletlash", asos: [25.4, -23.6], faza: qoldiq(R1_FAZA + QOYISH + YOSH.r3Ushlash - USHLASH, TAKT) },
];

/** k-detalning tug'ilishi (R1 uni C1 ga qo'yadi). */
export const tugilish = (k: number) => R1_FAZA + QOYISH + k * TAKT;

/** Robot sikli n dagi olish va qo'yish nuqtalari (asbob uchi — detal ustki yuzi). */
export function robotNuqtalari(r: RobotTavsifi, n: number): { olish: V3; qoyish: V3 } {
  if (r.vazifa === "saralash") {
    const qator = CNC_QATORLARI[qoldiq(n, 2)];
    return { olish: [CNC.chiqishX + 0.6, CNC.stolY + PLITA.qalinlik, qator.z + (qator.z < -35 ? 0.5 : -0.5)], qoyish: [C1.x0, DY, LINIYA_Z] };
  }
  if (r.vazifa === "kromkaga") return { olish: [C1.x1, DY, LINIYA_Z], qoyish: [KROMKA.kirishX, DY, LINIYA_Z] };
  const [px, pz] = PALETLAR[qoldiq(n, 2)];
  const qatlam = qoldiq(Math.floor(n / 2), QATLAM_MAX);
  return { olish: [BURILISH_X, DY, C3_OXIRI_Z], qoyish: [px, PALET_Y + (qatlam + 1) * DETAL.qalinlik, pz] };
}

export type Bogimlar = { q1: number; q2: number; q3: number; q5: number };

/** Teskari kinematika: asbob uchi pastga qaragan holda `nuqta` ga yetish uchun bo'g'im burchaklari (tirsak yuqorida). */
export function robotIK(asos: Nuqta, nuqta: V3): Bogimlar {
  const dx = nuqta[0] - asos[0];
  const dz = nuqta[2] - asos[1];
  const q1 = Math.atan2(dx, dz);
  const r = Math.hypot(dx, dz) - ROBOT.a1;
  const h = nuqta[1] + ROBOT.Lt - (ROBOT.poydevor + ROBOT.h1);
  const { L2, L3 } = ROBOT;
  const d = Math.min(L2 + L3 - 1e-4, Math.max(Math.abs(L2 - L3) + 1e-4, Math.hypot(r, h)));
  const cos3 = (d * d - L2 * L2 - L3 * L3) / (2 * L2 * L3);
  const q3 = Math.acos(Math.min(1, Math.max(-1, cos3)));
  const beta = Math.atan2(r, h);
  const q2 = beta - Math.atan2(L3 * Math.sin(q3), L2 + L3 * Math.cos(q3));
  return { q1, q2, q3, q5: Math.PI - q2 - q3 };
}

/** To'g'ri kinematika: asbob uchining dunyo koordinatasi. */
export function robotFK(asos: Nuqta, q: Bogimlar): V3 {
  const { L2, L3, Lt, a1, h1, poydevor } = ROBOT;
  const f = a1 + L2 * Math.sin(q.q2) + L3 * Math.sin(q.q2 + q.q3) + Lt * Math.sin(q.q2 + q.q3 + q.q5);
  const y = poydevor + h1 + L2 * Math.cos(q.q2) + L3 * Math.cos(q.q2 + q.q3) + Lt * Math.cos(q.q2 + q.q3 + q.q5);
  return [asos[0] + f * Math.sin(q.q1), y, asos[1] + f * Math.cos(q.q1)];
}

/** Uchi `nuqta` dan qancha yuqorida turadi (yaqinlashish/uzoqlashish pozasi). */
export const YAQINLASHISH = 0.45;
const yuqoriroq = (n: V3, d = YAQINLASHISH): V3 => [n[0], n[1] + d, n[2]];

function bogimlarAralash(a: Bogimlar, b: Bogimlar, u: number): Bogimlar {
  return {
    q1: a.q1 + burchakFarqi(a.q1, b.q1) * u,
    q2: lerp(a.q2, b.q2, u),
    q3: lerp(a.q3, b.q3, u),
    q5: lerp(a.q5, b.q5, u),
  };
}

/**
 * Robot holati t paytida: bo'g'im burchaklari (silliq interpolyatsiya), q6 (detal dunyo x o'qiga parallel qolishi uchun = q1),
 * ushlaganmi va qaysi detal (k) ni ushlagan.
 * Sikl (takt ichida): qo'yish ustidan → olish ustiga (0–1.2), tushish (1.2–1.5), ushlash (1.5–1.8), ko'tarilish (1.8–2.1),
 * olib borish (2.1–3.2), tushish (3.2–3.5), qo'yib yuborish (3.5–3.8), ko'tarilish (3.8–4).
 */
export function robotHolati(r: RobotTavsifi, t: number) {
  const n = Math.floor((t - r.faza) / TAKT);
  const tau = t - r.faza - n * TAKT;
  const joriy = robotNuqtalari(r, n);
  const oldingi = robotNuqtalari(r, n - 1);
  const ik = (p: V3) => robotIK(r.asos, p);
  const kadrlar: Array<[number, Bogimlar]> = [
    [0, ik(yuqoriroq(oldingi.qoyish))],
    [1.2, ik(yuqoriroq(joriy.olish))],
    [1.5, ik(joriy.olish)],
    [1.8, ik(joriy.olish)],
    [2.1, ik(yuqoriroq(joriy.olish))],
    [3.2, ik(yuqoriroq(joriy.qoyish))],
    [3.5, ik(joriy.qoyish)],
    [3.8, ik(joriy.qoyish)],
    [TAKT, ik(yuqoriroq(joriy.qoyish))],
  ];
  let i = 0;
  while (i < kadrlar.length - 2 && tau >= kadrlar[i + 1][0]) i++;
  const [ta, qa] = kadrlar[i];
  const [tb2, qb] = kadrlar[i + 1];
  const q = bogimlarAralash(qa, qb, silliq((tau - ta) / (tb2 - ta)));
  const ushlagan = tau >= USHLASH && tau < QOYISH;
  // Ushlangan detal raqami: tug'ilishi = ushlash payti − ushlashdagi yoshi (R1 uchun yosh manfiy: detal qo'yilganda tug'iladi).
  const ushlashPayti = r.faza + n * TAKT + USHLASH;
  const yosh = r.vazifa === "kromkaga" ? YOSH.r2Ushlash : r.vazifa === "paletlash" ? YOSH.r3Ushlash : USHLASH - QOYISH;
  const k = Math.round((ushlashPayti - yosh - tugilish(0)) / TAKT);
  return { ...q, q6: q.q1, ushlagan, k, n };
}

/** Konveyerdagi detal joyi (yoshi bo'yicha); robot qo'lida yoki paletda bo'lsa — null. */
export function detalJoyi(yosh: number): V3 | null {
  const y = KONVEYER_Y + DETAL.qalinlik / 2;
  const Y = YOSH;
  if (yosh < 0) return null;
  if (yosh < Y.r2Ushlash) return [Math.min(C1.x1, C1.x0 + C1.v * yosh), y, LINIYA_Z];
  if (yosh < Y.r2Qoyish) return null;
  if (yosh < Y.burilish) return [KROMKA.kirishX + KROMKA.v * (yosh - Y.r2Qoyish), y, LINIYA_Z];
  if (yosh < Y.burgilashga) return [BURILISH_X, y, LINIYA_Z + S3_V * (yosh - Y.burilish)];
  if (yosh < Y.burgilashdan) return [BURILISH_X, y, BURGILASH.ishZ];
  if (yosh < Y.r3Ushlash) return [BURILISH_X, y, Math.min(C3_OXIRI_Z, BURGILASH.ishZ + S3_V * (yosh - Y.burgilashdan))];
  return null;
}

/** Konveyerlardagi barcha detallar (k — detal raqami, rang shu bo'yicha). */
export function detallarHolati(t: number): Array<{ k: number; p: V3 }> {
  const natija: Array<{ k: number; p: V3 }> = [];
  const oxirgi = Math.floor((t - tugilish(0)) / TAKT);
  const soni = Math.ceil(YOSH.r3Ushlash / TAKT) + 1;
  for (let k = oxirgi; k > oxirgi - soni; k--) {
    const p = detalJoyi(t - tugilish(k));
    if (p) natija.push({ k, p });
  }
  return natija;
}
export const DETAL_MAX = Math.ceil(YOSH.r3Ushlash / TAKT) + 1;

/** Burg'ilash kallagi: detal to'xtagan paytda pastga tushib-ko'tariladi (0 — yuqorida, 1 — pastda). */
export function burgilashHolati(t: number) {
  const tau = qoldiq(t - tugilish(0) - YOSH.burgilashga, TAKT);
  if (tau > BURGILASH.toxtash) return 0;
  return Math.max(0, Math.sin((tau / BURGILASH.toxtash) * Math.PI * 3)) * silliq(tau / 0.2);
}

/** Paletlardagi qatlamlar soni (R3 qo'ygan detallar). */
export function paletQatlamlari(t: number): [number, number] {
  const r3 = ROBOTLAR[2];
  const oxirgi = Math.floor((t - r3.faza - QOYISH) / TAKT);
  const natija: [number, number] = [0, 0];
  for (const p of [0, 1] as const) {
    const n = qoldiq(oxirgi, 2) === p ? oxirgi : oxirgi - 1;
    natija[p] = qoldiq(Math.floor(n / 2), QATLAM_MAX) + 1;
  }
  return natija;
}

// ── Xavfsizlik to'siqlari (robot kataklari) va yorug'lik pardalari ──

export type Tosiq = { id: string; t: Tortburchak; eshik: { yon: "x0" | "x1" | "z0" | "z1"; u: number } };
export const TOSIQLAR: readonly Tosiq[] = [
  { id: "R1", t: tb(-6.4, -0.5, -38.8, -31.4), eshik: { yon: "z1", u: -3.4 } },
  { id: "R2", t: tb(0.3, 6.6, -38.8, -31.4), eshik: { yon: "z1", u: 1.6 } },
  { id: "R3", t: tb(21.0, 29.4, -26.6, -20.4), eshik: { yon: "z1", u: 27.6 } },
];
export const TOSIQ_H = 2.2;
/** Konveyer/stol to'siqdan o'tadigan joylar — yorug'lik pardasi bilan himoyalangan. `yon` — to'siqning qaysi tomoni, `u` — o'sha tomondagi markaz. */
export const NUR_PARDALARI: ReadonlyArray<{ tosiq: string; yon: "x0" | "x1" | "z0" | "z1"; u: number; eni: number }> = [
  { tosiq: "R1", yon: "x0", u: CNC_QATORLARI[0].z, eni: 2.4 },
  { tosiq: "R1", yon: "x0", u: CNC_QATORLARI[1].z, eni: 2.4 },
  { tosiq: "R1", yon: "x1", u: LINIYA_Z, eni: 1.1 },
  { tosiq: "R2", yon: "x0", u: LINIYA_Z, eni: 1.1 },
  { tosiq: "R2", yon: "x1", u: LINIYA_Z, eni: 1.1 },
  { tosiq: "R3", yon: "z0", u: BURILISH_X, eni: 1.1 },
];

// ── Konveyerlar (roliklar instancing bilan chiziladi) ──

export type Konveyer = { id: string; t: Tortburchak; oqi: "x" | "z"; tur: "rolik" | "lenta" };
const KENG = 0.9;
export const KONVEYERLAR: readonly Konveyer[] = [
  { id: "c1", t: tb(C1.x0 - 0.6, C1.x1 + 0.4, LINIYA_Z - KENG / 2, LINIYA_Z + KENG / 2), oqi: "x", tur: "lenta" },
  { id: "kromkaKirish", t: tb(4.4, KROMKA.x0, LINIYA_Z - KENG / 2, LINIYA_Z + KENG / 2), oqi: "x", tur: "rolik" },
  { id: "kromkaChiqish", t: tb(KROMKA.x1, BURILISH_X - KENG / 2, LINIYA_Z - KENG / 2, LINIYA_Z + KENG / 2), oqi: "x", tur: "rolik" },
  { id: "burilish", t: tb(BURILISH_X - KENG / 2, BURILISH_X + KENG / 2, LINIYA_Z - KENG / 2, LINIYA_Z + KENG / 2), oqi: "z", tur: "rolik" },
  { id: "c2", t: tb(BURILISH_X - KENG / 2, BURILISH_X + KENG / 2, LINIYA_Z + KENG / 2, BURGILASH.z0), oqi: "z", tur: "rolik" },
  { id: "c3", t: tb(BURILISH_X - KENG / 2, BURILISH_X + KENG / 2, BURGILASH.z1, C3_OXIRI_Z + 0.5), oqi: "z", tur: "rolik" },
  ...CNC_QATORLARI.flatMap((q) => [
    { id: `${q.id}Kirish`, t: CNC_KIRISH_STOLI(q.z), oqi: "x" as const, tur: "lenta" as const },
    { id: `${q.id}Chiqish`, t: CNC_CHIQISH_STOLI(q.z), oqi: "x" as const, tur: "lenta" as const },
  ]),
];
export const ROLIK_QADAMI = 0.16;
/** Roliklar: konveyer o'qi bo'ylab har 16 sm, uzunligi — konveyer eni. */
export function roliklar(): Array<{ x: number; z: number; oqi: "x" | "z"; uzunlik: number }> {
  const natija: Array<{ x: number; z: number; oqi: "x" | "z"; uzunlik: number }> = [];
  for (const k of KONVEYERLAR) {
    if (k.tur !== "rolik") continue;
    const [a, b] = k.oqi === "x" ? [k.t.x0, k.t.x1] : [k.t.z0, k.t.z1];
    const soni = Math.max(1, Math.floor((b - a) / ROLIK_QADAMI));
    const qadam = (b - a) / soni;
    for (let i = 0; i < soni; i++) {
      const u = a + qadam * (i + 0.5);
      natija.push(k.oqi === "x"
        ? { x: u, z: (k.t.z0 + k.t.z1) / 2, oqi: "x", uzunlik: k.t.z1 - k.t.z0 - 0.08 }
        : { x: (k.t.x0 + k.t.x1) / 2, z: u, oqi: "z", uzunlik: k.t.x1 - k.t.x0 - 0.08 });
    }
  }
  return natija;
}

// ── Boshqa jihozlar (oyoq izlari) ──

export const KROMKA_STANOGI = tb(KROMKA.x0, KROMKA.x1, -37.2, -35.0);
export const BURGILASH_STANOGI = tb(BURILISH_X - 1.4, BURILISH_X + 1.4, BURGILASH.z0, BURGILASH.z1);
/** Shisha SCADA (boshqaruv) xonasi: chap-old burchakda. Eshigi sharq devorida (x = −23.5, z = −21). */
export const BOSHQARUV_XONASI = tb(-31.5, -23.5, -24.6, -17.4);
export const XONA_H = 3.2;
export const XONA_POL = 0.12;
/** Elektr shkaflar (MCC) qatori — kromka orqasida, orqa devor bo'yida. */
export const MCC_SHKAFLARI = tb(8.0, 15.2, -40.75, -40.15);
/** CNC elektr shkaflari — CNC1 orqasida. */
export const CNC_SHKAFLARI = tb(-13.4, -8.6, -40.25, -39.55);
/** Kompressor va resiver — o'ng-orqa burchakda. */
export const KOMPRESSOR = tb(26.6, 31.2, -40.6, -38.2);
/** Robot boshqaruv shkaflari (to'siq tashqarisida). */
export const ROBOT_SHKAFLARI: readonly Tortburchak[] = [tb(-3.0, -2.0, -31.2, -30.7), tb(4.6, 5.6, -31.2, -30.7), tb(29.8, 30.4, -24.5, -23.5)];
export const ROBOT_POYDEVORI = 0.8;

/** Bo'sh qolishi shart joylar: asosiy sex favqulodda chiqish eshiklari oldi va siklon trubasi. */
export const BAND_JOYLAR: ReadonlyArray<{ nom: string; t: Tortburchak }> = [
  ...CHIQISH_ESHIKLARI_X.map((x) => ({ nom: `chiqish ${x}`, t: tb(x - 1.4, x + 1.4, -16.8, ICHKI.z1) })),
  { nom: "siklon trubasi", t: tb(SIKLON_TRUBASI.x - 1.0, SIKLON_TRUBASI.x + 0.6, SIKLON_TRUBASI.z - 0.3, ICHKI.z1) },
];

export type Jihoz = { nom: string; t: Tortburchak };
/** Polda turadigan qattiq jihozlar (bir-biriga tegmaydi): taxlamlar, portal ustunlari, stanoklar, xona, shkaflar, robot poydevorlari. */
export function jihozlar(): Jihoz[] {
  const r: Jihoz[] = [];
  TAXLAMLAR.forEach((s, i) => r.push({ nom: `taxlam ${i}`, t: markaz(s.x, s.z, PLITA.uzunlik, PLITA.eni) }));
  PORTAL.relsZ.forEach((z) => PORTAL.ustunlarX.forEach((x) => r.push({ nom: `portal ustuni ${x},${z}`, t: markaz(x, z, PORTAL.ustunKesimi, PORTAL.ustunKesimi) })));
  CNC_QATORLARI.forEach((q) => r.push({ nom: q.id, t: CNC_STANOGI(q.z) }));
  r.push({ nom: "kromka", t: KROMKA_STANOGI });
  r.push({ nom: "burg'ilash", t: BURGILASH_STANOGI });
  r.push({ nom: "boshqaruv xonasi", t: BOSHQARUV_XONASI });
  r.push({ nom: "MCC", t: MCC_SHKAFLARI });
  r.push({ nom: "CNC shkaflari", t: CNC_SHKAFLARI });
  r.push({ nom: "kompressor", t: KOMPRESSOR });
  ROBOT_SHKAFLARI.forEach((t, i) => r.push({ nom: `robot shkafi ${i}`, t }));
  ROBOTLAR.forEach((rb) => r.push({ nom: `robot ${rb.id}`, t: markaz(rb.asos[0], rb.asos[1], ROBOT_POYDEVORI, ROBOT_POYDEVORI) }));
  PALETLAR.forEach(([x, z], i) => r.push({ nom: `palet ${i}`, t: markaz(x, z, 1.2, 0.8) }));
  return r;
}

// ── AGV (avtonom transport robotlari): 2-sex ichida halqa, ikki ochiq orqali asosiy sexga kirib chiqadi ──

/** AGV yo'li tayanch nuqtalari (yopiq halqa). Chapdan va o'ngdan ochiqlarga U-burilish bilan kirib chiqadi. */
export const AGV_TAYANCH: readonly Nuqta[] = [
  [19.6, -21.4], [19.6, -18.6], [14, -18.6], [14, -13.2], [10, -13.2], [10, -18.6],
  [-10, -18.6], [-10, -13.2], [-14, -13.2], [-14, -21.4],
];
export const AGV_BURILISH_R = 0.9;
export const AGV = { uzunlik: 1.3, eni: 0.9, yarimKenglik: 0.75, v: 1.0, tezlanish: 0.5 } as const;
/** To'xtash joylari: paletlash yonida (yuk oladi), o'ng ochiqda (asosiy sexga topshiradi), chap ochiqda (bo'sh paletlar oladi). */
export const AGV_BEKATLAR: ReadonlyArray<{ nuqta: Nuqta; vaqt: number; nom: "paletlash" | "topshirish" | "olish" }> = [
  { nuqta: [19.6, -20.0], vaqt: 4, nom: "paletlash" },
  { nuqta: [12, -13.2], vaqt: 3, nom: "topshirish" },
  { nuqta: [-12, -13.2], vaqt: 3, nom: "olish" },
];
export const AGV_SONI = 3;

/** Burchaklari yumaloqlangan yopiq yo'l (zich nuqtalar) va kumulyativ uzunliklar. */
export function agvYoli() {
  const n = AGV_TAYANCH.length;
  const nuqtalar: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const p = AGV_TAYANCH[(i - 1 + n) % n];
    const c = AGV_TAYANCH[i];
    const q = AGV_TAYANCH[(i + 1) % n];
    const d1 = Math.hypot(c[0] - p[0], c[1] - p[1]);
    const d2 = Math.hypot(q[0] - c[0], q[1] - c[1]);
    const r = Math.min(AGV_BURILISH_R, d1 / 2, d2 / 2);
    const a: [number, number] = [c[0] - ((c[0] - p[0]) / d1) * r, c[1] - ((c[1] - p[1]) / d1) * r];
    const b: [number, number] = [c[0] + ((q[0] - c[0]) / d2) * r, c[1] + ((q[1] - c[1]) / d2) * r];
    const bolak = 8;
    for (let j = 0; j <= bolak; j++) {
      const u = j / bolak;
      const m0 = (1 - u) * (1 - u);
      const m1 = 2 * (1 - u) * u;
      const m2 = u * u;
      nuqtalar.push([m0 * a[0] + m1 * c[0] + m2 * b[0], m0 * a[1] + m1 * c[1] + m2 * b[1]]);
    }
  }
  nuqtalar.push([nuqtalar[0][0], nuqtalar[0][1]]);
  const uzunlik = [0];
  for (let i = 1; i < nuqtalar.length; i++) uzunlik.push(uzunlik[i - 1] + Math.hypot(nuqtalar[i][0] - nuqtalar[i - 1][0], nuqtalar[i][1] - nuqtalar[i - 1][1]));
  return { nuqtalar, uzunlik, jami: uzunlik[uzunlik.length - 1] };
}

/** Yo'ldagi s masofadagi nuqta va yo'nalish (rotation.y: +z → harakat yo'nalishi). */
export function yoldaNuqta(yol: ReturnType<typeof agvYoli>, s: number) {
  const ss = qoldiq(s, yol.jami);
  let i = 1;
  while (i < yol.uzunlik.length - 1 && yol.uzunlik[i] < ss) i++;
  const [a, b] = [yol.nuqtalar[i - 1], yol.nuqtalar[i]];
  const l = yol.uzunlik[i] - yol.uzunlik[i - 1] || 1;
  const u = (ss - yol.uzunlik[i - 1]) / l;
  return { x: lerp(a[0], b[0], u), z: lerp(a[1], b[1], u), burchak: Math.atan2(b[0] - a[0], b[1] - a[1]) };
}

/** Trapetsiya tezlik profili: D masofani v tezlik va a tezlanish bilan bosib o'tish — vaqti va t paytdagi masofa. */
export function trapetsiya(D: number, v: number, a: number) {
  const da = (v * v) / (2 * a);
  if (D < 2 * da) {
    const vm = Math.sqrt(D * a);
    const ta = vm / a;
    return { vaqt: 2 * ta, masofa: (t: number) => (t < ta ? 0.5 * a * t * t : D - 0.5 * a * (2 * ta - t) ** 2) };
  }
  const ta = v / a;
  const tc = (D - 2 * da) / v;
  return {
    vaqt: 2 * ta + tc,
    masofa: (t: number) => (t < ta ? 0.5 * a * t * t : t < ta + tc ? da + v * (t - ta) : D - 0.5 * a * Math.max(0, 2 * ta + tc - t) ** 2),
  };
}

/** AGV jadvali: bekatlar orasidagi bo'laklar (trapetsiya profili) va to'xtashlar; butun davr. */
export function agvJadvali(yol = agvYoli()) {
  const sBekat = AGV_BEKATLAR.map((b) => {
    let eng = 0;
    let masofa = Infinity;
    yol.nuqtalar.forEach((p, i) => {
      const d = Math.hypot(p[0] - b.nuqta[0], p[1] - b.nuqta[1]);
      if (d < masofa) { masofa = d; eng = yol.uzunlik[i]; }
    });
    return { ...b, s: eng };
  }).sort((a, b) => a.s - b.s);
  const bolaklar: Array<{ t0: number; s0: number; D: number; prof: ReturnType<typeof trapetsiya>; toxtash: number; bekat: (typeof sBekat)[number] }> = [];
  let t = 0;
  for (let i = 0; i < sBekat.length; i++) {
    const b = sBekat[i];
    const keyingi = sBekat[(i + 1) % sBekat.length];
    const D = qoldiq(keyingi.s - b.s, yol.jami) || yol.jami;
    const prof = trapetsiya(D, AGV.v, AGV.tezlanish);
    bolaklar.push({ t0: t, s0: b.s, D, prof, toxtash: b.vaqt, bekat: b });
    t += b.vaqt + prof.vaqt;
  }
  return { yol, bolaklar, davr: t };
}

/** i-AGV holati (bir xil jadval, davrning 1/3 qismiga siljigan): joyi, yo'nalishi, to'xtaganmi, yuki (0 — yo'q, 1 — detallar, 2 — bo'sh paletlar). */
export function agvHolati(jadval: ReturnType<typeof agvJadvali>, i: number, t: number) {
  const tau = qoldiq(t + (i * jadval.davr) / AGV_SONI, jadval.davr);
  let bolak = jadval.bolaklar[jadval.bolaklar.length - 1];
  for (const b of jadval.bolaklar) if (tau >= b.t0) bolak = b;
  const ichki = tau - bolak.t0;
  const toxtagan = ichki < bolak.toxtash;
  const s = bolak.s0 + (toxtagan ? 0 : bolak.prof.masofa(Math.min(bolak.prof.vaqt, ichki - bolak.toxtash)));
  const p = yoldaNuqta(jadval.yol, s);
  // Yuk: paletlashda (to'xtash yarmida) detallar ortiladi, o'ng ochiqda topshiriladi, chap ochiqda bo'sh paletlar olinadi.
  const yarim = toxtagan && ichki > bolak.toxtash / 2;
  const nom = bolak.bekat.nom;
  let yuk: 0 | 1 | 2;
  if (nom === "paletlash") yuk = toxtagan && !yarim ? 2 : 1;
  else if (nom === "topshirish") yuk = toxtagan && !yarim ? 1 : 0;
  else yuk = toxtagan && !yarim ? 0 : 2;
  return { ...p, toxtagan, yuk };
}

// ── Odamlar ──

/** Turgan odamlar (operator/muhandis): oyoq osti nuqtasi va qarash yo'nalishi (0 — +z). */
export const TURGAN_ODAMLAR: ReadonlyArray<{ tur: "ishchi" | "biznesmen"; p: V3; burilish: number }> = [
  { tur: "biznesmen", p: [-28.4, XONA_POL, -21.2], burilish: -Math.PI / 2 },
  { tur: "ishchi", p: [CNC.stolX, 0, -30.2], burilish: Math.PI },
  { tur: "ishchi", p: [12.0, 0, -34.3], burilish: Math.PI },
  { tur: "ishchi", p: [25.4, 0, -19.5], burilish: Math.PI },
];
/** Yuruvchi odamlar yo'llari (yashil piyoda yo'lagi bo'ylab). */
export const ODAM_YOLLARI: ReadonlyArray<{ tur: "ishchi" | "biznesmen"; nuqtalar: Nuqta[]; tezlik: number; faza: number }> = [
  { tur: "biznesmen", nuqtalar: [[-9.5, -29.2], [19.5, -29.2]], tezlik: 1.0, faza: 0.2 },
  { tur: "ishchi", nuqtalar: [[-25, -25.2], [-25, -27.4], [18.5, -27.4]], tezlik: 1.2, faza: 0.6 },
];
/** Piyoda yo'lagi (yashil) — boshqaruv xonasidan liniya bo'ylab. */
export const PIYODA_YOLAGI: readonly Tortburchak[] = [tb(-25.8, 21.3, -29.8, -26.8), tb(-25.8, -24.2, -26.8, BOSHQARUV_XONASI.z0)];
