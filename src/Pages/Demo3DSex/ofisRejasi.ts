import * as THREE from "three";
import { DIREKTOR_JOYI, OFIS } from "./hudud.ts";
import {
  POL_QALINLIGI,
  ishJoyi,
  keyingiFaza,
  lokal,
  qarashBurchagi,
  stolGuruhi,
  stulVaOdam,
  type IshJoyi,
  type MebelJoyi,
  type MebelTuri,
  type OdamJoyi,
  type OtirishJuftligi,
  type Tortburchak,
  type Tosiq,
  type V3,
  type YuruvchiJoyi,
} from "./mebelModellari.ts";
import type { OdamHarakati, OdamTuri } from "./odamModellari.ts";

// Ma'muriy bino (8 qavat, 20 × 16 m, har qavat 3.6 m) rejasi: qavatlar, xonalar, ichki devorlar, mebel va odamlar joyi,
// panorama lift jadvali, stol tennisi to'pi va direktor avtomobili geometriyasi. JSX yo'q — node testlari to'g'ridan-to'g'ri
// import qiladi; chizish — Ofis.tsx va DirektorMashinasi.tsx da.
//
// Qavatlar: 1 — vestibyul va restoran; 2, 3 — ochiq ofis; 4 — kutubxona va o'yin xonasi; 5 — stol tennisi va sport zali;
// 6 — majlislar zallari va HR; 7 — dizayn studiyasi; 8 (tomsiz) — direktor qavati. Kamera tomonidagi old (z = 42) va
// o'ng (x = −38) fasadlar — shisha parda-devor; old fasadda panorama lift shaxtasi.

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const P = Math.PI;

// ---------------------------------------------------------------------------------------------------------------------
// Qavatlar va asosiy o'lchamlar

export const QAVAT_SONI = OFIS.qavatlar;
/** Har qavat poli (qoplama ustki yuzasi): 0.05, 3.65, … 25.25. */
export const OFIS_POLLARI: readonly number[] = Array.from({ length: QAVAT_SONI }, (_, k) => r3(POL_QALINLIGI + k * OFIS.qavatBalandligi));
/** Plita qalinligi va qavatdagi devor balandligi (poldan yuqori plita ostigacha). */
export const PLITA = 0.3;
export const DEVOR_BALANDLIGI = r3(OFIS.qavatBalandligi - PLITA);
/** Eng yuqori nuqta (tomsiz yuqori qavat devorlari tepasi). */
export const OFIS_TEPASI = r3(OFIS_POLLARI[QAVAT_SONI - 1] + DEVOR_BALANDLIGI);
/** Ichki chegara: chap/orqa devor 0.25 m, old/o'ng shisha fasad 0.15 m. */
export const OFIS_ICHI: Tortburchak = { x0: OFIS.x0 + 0.25, x1: OFIS.x1 - 0.15, z0: OFIS.z0 + 0.25, z1: OFIS.z1 - 0.15 };
/** Kirish eshigi (old fasad, 1-qavat): x oralig'i (fasad tik profillariga to'g'ri keladi) va balandligi. */
export const OFIS_ESHIGI = { x0: -49.25, x1: -46.75, h: 2.7 } as const;
/** Qavat vazifalari (1-qavatdan 8-qavatgacha). */
export const QAVAT_VAZIFALARI = [
  "Vestibyul va restoran",
  "Ochiq ofis",
  "Ochiq ofis (noutbuklar)",
  "Kutubxona va o'yin xonasi",
  "Stol tennisi va sport zali",
  "Majlislar zallari va HR",
  "Dizayn studiyasi",
  "Direktor qavati",
] as const;

/** Zina va xizmat lifti yadrosi (chap-orqa burchak). Zina: ikki marshli, oraliq maydonchasi orqada. */
export const YADRO = { x0: OFIS_ICHI.x0, x1: -52.5, z0: OFIS_ICHI.z0, z1: 33 } as const;
export const ZINA = {
  x0: OFIS_ICHI.x0,
  x1: -54.75,
  z0: OFIS_ICHI.z0,
  /** Qavat maydonchasi z 31.4…33 (plitaning bir qismi), oraliq maydoncha z0…28.6. */
  marshBoshi: 31.4,
  oraliq: 28.6,
  /** Chap marsh (pastdan oraliqqa), o'ng marsh (oraliqdan yuqoriga). */
  chap: [-57.7, -56.3] as const,
  ong: [-56.15, -54.8] as const,
  pogona: 11,
} as const;
/** Yadro ichidagi xizmat lifti. */
export const LIFT = { x0: ZINA.x1, x1: YADRO.x1, z0: OFIS_ICHI.z0, z1: 28.6, eshik: [-54.1, -53.1] as const } as const;
/** Yadro old devoridagi (z = 33) eshiklar: zina va lift oldi. */
export const YADRO_ESHIKLARI: readonly (readonly [number, number])[] = [[-57.4, -55.4], [-54.4, -52.9]];
/** Yadro eshiklari oldidagi bo'sh yo'lak (har qavatda mebel qo'yilmaydi). */
export const YADRO_YOLAGI: Tortburchak = { x0: -57.4, x1: -52.9, z0: YADRO.z1, z1: 34.3 };

// ---------------------------------------------------------------------------------------------------------------------
// Panorama lift (old fasadda, bino tashqarisida, shisha shaxta)

/**
 * Shaxta: x −53.575…−51.175, z 42.05…44.25 (fasad tik profillari −53.0 va −51.75 orasida fasaddagi eshik). Kabina
 * 1.9 × 1.7 × 2.5 m, eshigi binoga (−z) qaragan. Bayroqlar (z = 45.6) shaxtadan 1.3 m oldinda.
 */
export const PANORAMA_LIFT = {
  x0: -53.575,
  x1: -51.175,
  z0: OFIS.z1 + 0.05,
  z1: OFIS.z1 + 2.25,
  kabina: { x: -52.375, z: r3(OFIS.z1 + 1.15), eni: 1.9, chuqurlik: 1.7, balandlik: 2.5 },
  /** Fasaddagi eshik ochig'i (har qavatda). */
  eshik: { x0: -52.95, x1: -51.8, h: 2.3 },
  /** Shaxta tepasi (mashina xonasi qopqog'i). */
  tepasi: r3(OFIS_TEPASI + 1.8),
} as const;
/** Lift eshigi oldidagi bo'sh maydoncha (har qavatda mebel qo'yilmaydi). */
export const LIFT_MAYDONCHASI: Tortburchak = { x0: -54.0, x1: -50.7, z0: 40.3, z1: OFIS_ICHI.z1 };

/** Lift tezligi (m/s, o'rtacha), har qavatdagi to'xtash (s), eshik ochilish/yopilish vaqti (s). */
export const LIFT_TEZLIGI = 1.8;
export const LIFT_TURISHI = 5.5;
export const ESHIK_VAQTI = 1;
export type LiftToxtashi = { qavat: number; boshi: number; yolVaqti: number; yDan: number; yGa: number };
export type LiftJadvali = { toxtashlar: readonly LiftToxtashi[]; davr: number };
export type LiftHolati = { y: number; eshik: number; harakatda: boolean; qavat: number; yonalish: -1 | 0 | 1 };

/** Takrorlanadigan "tasodifiy" son. */
function tasodifiy(urug: number) {
  let s = urug >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Lift jadvali: `son` ta to'xtash (tasodifiy qavatlar, ketma-ket ikkitasi bir xil emas), davr oxirida birinchi qavatga qaytadi.
 * Har bosqich: yo'l (silliq tezlanish/sekinlanish) + to'xtash (eshik ochiladi, turadi, yopiladi).
 */
export function liftJadvali(urug = 7, son = 12): LiftJadvali {
  const rnd = tasodifiy(urug);
  const qavatlar = [0];
  while (qavatlar.length < son) {
    const oldingi = qavatlar[qavatlar.length - 1];
    const oxirgi = qavatlar.length === son - 1;
    const mumkin = Array.from({ length: QAVAT_SONI }, (_, i) => i).filter((i) => i !== oldingi && !(oxirgi && i === qavatlar[0]));
    qavatlar.push(mumkin[Math.floor(rnd() * mumkin.length)]);
  }
  let t = 0;
  const toxtashlar: LiftToxtashi[] = qavatlar.map((qavat, i) => {
    const dan = qavatlar[(i - 1 + son) % son];
    const yDan = OFIS_POLLARI[dan];
    const yGa = OFIS_POLLARI[qavat];
    const yolVaqti = r3(Math.abs(yGa - yDan) / LIFT_TEZLIGI + 1.4);
    const b = { qavat, boshi: r3(t), yolVaqti, yDan, yGa };
    t += yolVaqti + LIFT_TURISHI;
    return b;
  });
  return { toxtashlar, davr: r3(t) };
}

const silliq = (u: number) => u * u * (3 - 2 * u);

/** Lift holati t soniyada: kabina poli balandligi, eshik ochiqligi (0…1), harakatda/to'xtagan, joriy (yoki boriladigan) qavat. */
export function liftHolati(j: LiftJadvali, t: number): LiftHolati {
  const tt = ((t % j.davr) + j.davr) % j.davr;
  let b = j.toxtashlar[0];
  for (const x of j.toxtashlar) {
    if (x.boshi <= tt) b = x;
    else break;
  }
  const ichki = tt - b.boshi;
  if (ichki < b.yolVaqti) {
    const u = ichki / b.yolVaqti;
    const s = u * u * u * (u * (u * 6 - 15) + 10);
    return { y: b.yDan + (b.yGa - b.yDan) * s, eshik: 0, harakatda: true, qavat: b.qavat, yonalish: b.yGa > b.yDan ? 1 : -1 };
  }
  const d = ichki - b.yolVaqti;
  const T = LIFT_TURISHI;
  const ochiq = d < 0.5 ? 0 : d < 0.5 + ESHIK_VAQTI ? (d - 0.5) / ESHIK_VAQTI : d < T - 0.5 - ESHIK_VAQTI ? 1 : d < T - 0.5 ? (T - 0.5 - d) / ESHIK_VAQTI : 0;
  return { y: b.yGa, eshik: silliq(Math.min(1, Math.max(0, ochiq))), harakatda: false, qavat: b.qavat, yonalish: 0 };
}

// ---------------------------------------------------------------------------------------------------------------------
// Joylashuv turlari

export type OfisXonasi = Tortburchak & { nom: string; y: number; qavat: number };
export type DevorTuri = "shisha" | "devor" | "yongoq";
/** Ichki devor chizig'i: o = "z" — devor z = c da x bo'ylab (a0…a1); "x" — x = c da z bo'ylab. */
export type OfisDevori = { qavat: number; tur: DevorTuri; o: "x" | "z"; c: number; a0: number; a1: number; eshiklar: readonly (readonly [number, number])[] };
export type PolTuri = "granit" | "kovrolin" | "parket" | "sportPol" | "mikrotsement" | "zina";
export type PolQoplamasi = Tortburchak & { qavat: number; tur: PolTuri };
/** Stol tennisi stoli: markazi, bo'ylama o'qi x bo'ylab. */
export type TennisStoli = { x: number; z: number; y: number };
/** Ekran yuzasi (televizor oldida): markazi, burilishi (yuzasi qaragan tomon), o'lchami. */
export type Ekran = { x: number; y: number; z: number; burchak: number; eni: number; balandlik: number };
/** Qo'ldagi kichik buyum (o'yin pulti, kitob): joyi va burilishi. */
export type QolBuyumi = { p: V3; b: number };
/** Kitob qatori (javon tokchasida): markazi, burilishi, o'lchami. */
export type KitobQatori = { p: V3; b: number; o: V3 };

/** Stol tennisi stoli o'lchami (ITTF): 2.74 × 1.525 m, balandligi 0.76 m. */
export const TENNIS_STOLI = { uzunlik: 2.74, eni: 1.525, balandlik: 0.76 } as const;
/** O'yinchi stol chetidan qancha nariroqda turadi. */
export const TENNIS_ORALIGI = 0.95;

/** Televizor (televisionModern.glb) ekrani: model birligida markazi (y, old tomonga z) va o'lchami. */
const TV_EKRANI = { y: 0.262, z: 0.0217, eni: 0.667, balandlik: 0.367 } as const;
/** Televizor joyidan (masshtab s, burilish b) ekran yuzasi. */
function tvEkrani(x: number, y: number, z: number, b: number, s: number): Ekran {
  const [ex, ez] = lokal(x, z, b, 0, TV_EKRANI.z * s + 0.004);
  return { x: ex, y: r3(y + TV_EKRANI.y * s), z: ez, burchak: b, eni: r3(TV_EKRANI.eni * s), balandlik: r3(TV_EKRANI.balandlik * s) };
}

/** Qavat poli. */
const Y = OFIS_POLLARI;
const IX0 = OFIS_ICHI.x0;
const IX1 = OFIS_ICHI.x1;
const IZ0 = OFIS_ICHI.z0;
const IZ1 = OFIS_ICHI.z1;
/** Old zona (yadro old devoridan fasadgacha) va orqa zona (yadrodan o'ngda) chegaralari. */
const OLD_Z0 = 33.06;
const ORQA_X0 = -52.44;
const ORQA_Z1 = 32.94;

/** Qabulxona peshtaxtasi (1-qavat): old qismi baland (1.08), ichida past ish stoli (0.75). */
export const QABUL_PESHTAXTASI = { x0: -50.6, x1: -47.0, z0: 35.3, z1: 36.55, oldZ: 35.8, y: Y[0] } as const;
/** Restoran bufeti (1-qavat): peshtaxta, ustida issiq taomlar idishlari va shisha qalqon. */
export const BUFET = { x0: -44.9, x1: -40.7, z0: 27.35, z1: 28.05, h: 0.92, y: Y[0] } as const;
/** Katta majlislar zali stoli (6-qavat). */
export const KATTA_MAJLIS_STOLI = { x: -45.4, z: 29.6, eni: 5.2, chuqurlik: 1.4, h: 0.75, y: Y[5] } as const;
/** Direktor stoli (8-qavat, yong'oq, 2.2 × 1.0). */
export const DIREKTOR_STOLI = { x: -41.8, z: 36.0, eni: 2.2, chuqurlik: 1.0, h: 0.76, y: Y[7] } as const;
/** VIP majlislar stoli (8-qavat, 4.4 × 1.3). */
export const MAJLIS_STOLI = { x: -42.6, z: 29.6, eni: 4.4, chuqurlik: 1.3, h: 0.75, y: Y[7] } as const;
/** Dizayn studiyasidagi maket stoli (7-qavat): ustida kichik mebel maketlari. */
export const MAKET_STOLI = { x0: -52.2, x1: -48.6, z0: 35.4, z1: 37.0, h: 0.9, y: Y[6] } as const;
/** Ilhom taxtasi (7-qavat, chap devorda). */
export const MOODBOARD = { x: IX0 + 0.03, z0: 34.6, z1: 40.2, y0: Y[6] + 0.9, y1: Y[6] + 2.5 } as const;
/** Yugurish yo'laklari (5-qavat): x bo'ylab, pulti +x uchida (yuguruvchi derazaga qaraydi). */
export const YUGURISH_YOLAKLARI: readonly (Tortburchak & { y: number })[] = [
  { x0: -40.7, x1: -38.7, z0: 39.4, z1: 40.3, y: Y[4] },
  { x0: -40.7, x1: -38.7, z0: 37.8, z1: 38.7, y: Y[4] },
];
/** Yugurish yo'lagi lentasi balandligi. */
export const LENTA_BALANDLIGI = 0.2;

function ofisYarat() {
  const mebel: MebelJoyi[] = [];
  const odamlar: OdamJoyi[] = [];
  const juftlar: OtirishJuftligi[] = [];
  const ishJoylari: IshJoyi[] = [];
  const yuruvchilar: YuruvchiJoyi[] = [];
  const tosiqlar: Tosiq[] = [];
  const xonalar: OfisXonasi[] = [];
  const devorlar: OfisDevori[] = [];
  const pollar: PolQoplamasi[] = [];
  const stolGuruhlari: ReturnType<typeof stolGuruhi>[] = [];
  const likopchalar: V3[] = [];
  const pultlar: QolBuyumi[] = [];
  const qolKitoblari: QolBuyumi[] = [];
  const kitobQatorlari: KitobQatori[] = [];
  const tennisStollari: TennisStoli[] = [];
  const taqdimotEkranlari: Ekran[] = [];
  let oyinEkrani: Ekran | null = null;

  const ish = (j: IshJoyi) => {
    ishJoylari.push(j);
    mebel.push(j.stol, j.stul, ...j.jihozlar);
    if (j.odam) odamlar.push(j.odam);
    juftlar.push({ stul: j.stul, nishon: [j.stol.p[0], j.stol.p[2]] });
  };
  const stul = (tur: MebelTuri, x: number, y: number, z: number, b: number, nishon: [number, number] | null, odam?: OdamTuri | null, m?: V3, lateral = 0) => {
    const n = stulVaOdam(tur, x, y, z, b, odam, m, lateral);
    mebel.push(n.stul);
    if (n.odam) odamlar.push(n.odam);
    if (nishon) juftlar.push({ stul: n.stul, nishon });
    return n;
  };
  /** Divan (yoki kreslo) va unda o'tirganlar (lateral siljish bilan). */
  const divan = (tur: MebelTuri, x: number, y: number, z: number, b: number, nishon: [number, number] | null, kimlar: readonly [number, OdamTuri][], extra: Partial<MebelJoyi> = {}) => {
    const s: MebelJoyi = { tur, p: [r3(x), y, r3(z)], b, ...extra };
    mebel.push(s);
    if (nishon) juftlar.push({ stul: s, nishon });
    return kimlar.map(([lat, kim]) => {
      const o = stulVaOdam(tur, x, y, z, b, kim, extra.m, lat).odam;
      if (o) odamlar.push(o);
      return o;
    });
  };
  const turgan = (tur: OdamTuri, harakat: OdamHarakati, x: number, y: number, z: number, burilish: number) =>
    odamlar.push({ tur, harakat, p: [r3(x), y, r3(z)], burilish: r3(burilish), faza: keyingiFaza() });
  const m = (tur: MebelTuri, x: number, y: number, z: number, extra: Partial<MebelJoyi> = {}) => mebel.push({ tur, p: [r3(x), r3(y), r3(z)], ...extra });
  const xona = (k: number, nom: string, x0: number, x1: number, z0: number, z1: number) => xonalar.push({ nom, qavat: k, y: Y[k], x0, x1, z0, z1 });
  const devor = (k: number, tur: DevorTuri, o: "x" | "z", c: number, a0: number, a1: number, eshiklar: readonly (readonly [number, number])[] = []) =>
    devorlar.push({ qavat: k, tur, o, c, a0, a1, eshiklar });
  const tosiq = (k: number, nom: string, x0: number, x1: number, z0: number, z1: number, h: number) => tosiqlar.push({ nom, y: Y[k], h, x0, x1, z0, z1 });
  const pol = (k: number, tur: PolTuri, x0: number, x1: number, z0: number, z1: number) => pollar.push({ qavat: k, tur, x0, x1, z0, z1 });
  /** Old zona (yadro old devoridan fasadgacha, x0…x1) qoplamasi. */
  const oldPol = (k: number, tur: PolTuri, x0 = IX0, x1 = IX1 + 0.1) => pol(k, tur, x0, x1, YADRO.z1, IZ1 + 0.1);
  /** Orqa zona (yadrodan o'ngda, x0…x1) qoplamasi. */
  const orqaPol = (k: number, tur: PolTuri, x0: number = YADRO.x1, x1 = IX1 + 0.1) => pol(k, tur, x0, x1, IZ0, YADRO.z1);
  /** Ochiq kitob javoni va tokchalaridagi uch qator kitob. */
  const kitobJavoni = (x: number, y: number, z: number, b: number) => {
    m("ochiqJavon", x, y, z, { b, rang: { wood: "#6f4a32" } });
    const [kx, kz] = lokal(x, z, b, 0, -0.04);
    for (const ty of [0.29, 0.818, 1.346]) kitobQatorlari.push({ p: [kx, r3(y + ty + 0.17), kz], b, o: [0.7, 0.34, 0.24] });
  };
  /** Ovqat stoli (table.glb) va 4 stul; `kimlar` — [shimoliy chap, shimoliy o'ng, janubiy chap, janubiy o'ng]. */
  const ovqatStoli = (k: number, x: number, z: number, kimlar: readonly (OdamTuri | null)[] = [], rang = "#c8a57e") => {
    m("oshxonaStoli", x, Y[k], z, { rang: { wood: rang } });
    const stolY = r3(Y[k] + 0.752);
    ([[-0.42, -0.775, 0], [0.42, -0.775, 0], [-0.42, 0.775, P], [0.42, 0.775, P]] as const).forEach(([dx, dz, b], i) => {
      const kim = kimlar[i] ?? null;
      stul("stul", x + dx, Y[k], z + dz, b, [x, z], kim);
      if (kim) likopchalar.push([r3(x + dx), stolY, r3(z + (dz > 0 ? 0.2 : -0.2))]);
    });
  };
  /** Kichik majlis stoli (tableGlass.glb) va 4 ofis stuli (bo'sh). */
  const kichikMajlis = (k: number, x: number, z: number) => {
    m("shishaStol", x, Y[k], z);
    for (const [dx, dz, b] of [[-0.42, -0.775, 0], [0.42, -0.775, 0], [-0.42, 0.775, P], [0.42, 0.775, P]] as const) stul("ofisStuli", x + dx, Y[k], z + dz, b, [x, z]);
  };

  // Umumiy (har qavat): yadro maydonchasi va xizmat lifti oldi — tosh plitka
  for (let k = 0; k < QAVAT_SONI; k++) {
    if (k === 0) pol(k, "zina", IX0, ZINA.x1, IZ0, YADRO.z1);
    else pol(k, "zina", IX0, ZINA.x1, ZINA.marshBoshi, YADRO.z1);
    pol(k, "zina", ZINA.x1, YADRO.x1, LIFT.z1, YADRO.z1);
  }

  // ── 1-qavat: vestibyul (qabulxona, kutish joyi, yashil devor), restoran (bufet, oshpaz, ovqat stollari), oshxona ──
  {
    const k = 0;
    const y = Y[k];
    xona(k, "vestibyul", IX0, -45.56, OLD_Z0, IZ1);
    xona(k, "oshxona", ORQA_X0, -45.56, IZ0, ORQA_Z1);
    xona(k, "restoran", -45.44, IX1, IZ0, IZ1);
    devor(k, "devor", "z", YADRO.z1, YADRO.x1 + 0.06, -45.44);
    devor(k, "devor", "x", -45.5, IZ0, YADRO.z1 + 0.06, [[29.4, 30.4]]);
    devor(k, "shisha", "x", -45.5, YADRO.z1 + 0.06, IZ1, [[36.6, 38.9]]);
    oldPol(k, "granit", IX0, -45.5);
    orqaPol(k, "granit", YADRO.x1, -45.5);
    pol(k, "parket", -45.5, IX1 + 0.1, IZ0, IZ1 + 0.1);
    const q = QABUL_PESHTAXTASI;
    tosiq(k, "qabul", q.x0, q.x1, q.z0, q.z1, 1.08);
    // Qabulxona xodimi (o'tirgan) va peshtaxtadagi monitorlar
    stul("kreslo", -48.8, y, 34.85, 0, [(q.x0 + q.x1) / 2, (q.z0 + q.z1) / 2], "xodimAyol");
    m("monitor", -49.35, y + 0.75, 35.56, { b: P, ustida: true });
    m("monitor", -48.25, y + 0.75, 35.56, { b: P + 0.15, ustida: true });
    m("klaviatura", -48.8, y + 0.75, 35.36, { b: P, ustida: true });
    // Kutish joyi (yashil devor oldida)
    m("divan", -57.15, y, 37.4, { b: P / 2, rang: { carpet: "#4b5563" } });
    m("jurnalStoli", -55.9, y, 37.4, { b: P / 2 });
    m("gilam", -55.9, y + 0.003, 37.4, { b: P / 2, ustida: true });
    stul("yumshoqKreslo", -54.55, y, 36.75, -P / 2, [-55.9, 37.4]);
    stul("yumshoqKreslo", -54.55, y, 38.05, -P / 2, [-55.9, 37.4]);
    m("torchiroq", -57.45, y, 39.0);
    m("gulTuvak", -50.2, y, 41.4);
    m("gulTuvak", -45.85, y, 41.4);
    m("gulTuvak", -45.85, y, 33.5);
    m("kiyimIlgich", -51.0, y, 33.55);
    // Oshxona (yopiq): javonlar, muzlatgichlar, tayyorlash stoli
    for (let i = 0; i < 7; i++) m("oshxonaShkafi", -51.9 + i * 0.86, y, IZ0 + 0.325, { rang: { wood: "#e5e7eb", woodDark: "#cbd5e1" } });
    m("muzlatgich", -51.9, y, 32.6, { b: P });
    m("muzlatgich", -51.0, y, 32.6, { b: P });
    m("oshxonaStoli", -48.6, y, 29.9, { rang: { wood: "#cbd5e1" } });
    // Restoran: bufet ortida oshpaz, kofe burchagi, 8 stol (4 kishi ovqatlanmoqda)
    tosiq(k, "bufet", BUFET.x0, BUFET.x1, BUFET.z0, BUFET.z1, BUFET.h);
    turgan("oddiyErkak", "ishlash", -42.8, y, 26.8, 0);
    m("oshxonaShkafi", -39.86, y, IZ0 + 0.325);
    m("oshxonaShkafi", -39.0, y, IZ0 + 0.325);
    m("kofeMashina", -39.0, y + 0.9, 26.55, { ustida: true });
    m("kofeMashina", -39.86, y + 0.9, 26.55, { ustida: true, rang: { metalMedium: "#7f1d1d" } });
    const ustunlar = [-43.3, -40.1];
    const qatorlar = [30.0, 32.8, 35.6, 38.4];
    for (const z of qatorlar) {
      for (const x of ustunlar) {
        const kimlar: (OdamTuri | null)[] =
          x === -43.3 && z === 35.6 ? ["xodimErkak", null, null, "xodimAyol"] : x === -40.1 && z === 32.8 ? [null, "xodimAyol", "xodimErkak", null] : [];
        ovqatStoli(k, x, z, kimlar);
      }
    }
    m("gulTuvak", -38.55, y, 41.45);
    m("gulTuvak", -45.1, y, 41.45);
    // Vestibyulda: kirish eshigidan panorama lift oldiga va qaytib
    yuruvchilar.push({ tur: "ayolRasmiy", nuqtalar: [[-47.6, 41.3], [-47.6, 38.3], [-52.375, 38.3], [-52.375, 40.9]], y, tezlik: 1.15, toxtash: [3, 0, 0, 5], toxtashHarakati: "turish", faza: 0.2 });
  }

  // ── 2-qavat: ochiq ofis (6 stol, monitorlar), kichik majlis xonasi, dam olish burchagi ──
  {
    const k = 1;
    const y = Y[k];
    xona(k, "ochiqOfis", IX0, IX1, OLD_Z0, IZ1);
    xona(k, "kichikMajlis", ORQA_X0, -45.06, IZ0, ORQA_Z1);
    xona(k, "damOlish", -44.94, IX1, IZ0, ORQA_Z1);
    devor(k, "shisha", "z", YADRO.z1, YADRO.x1 + 0.06, IX1, [[-47.2, -46.2], [-44.2, -43.2]]);
    devor(k, "shisha", "x", -45.0, IZ0, YADRO.z1 - 0.04);
    oldPol(k, "kovrolin");
    orqaPol(k, "parket");
    const a = stolGuruhi(-48.6, y, 37.4, ["xodimErkak", "xodimAyol", "xodimAyol", "xodimErkak"]);
    const b = stolGuruhi(-42.9, y, 37.4, [undefined, undefined, "xodimAyol", "xodimErkak"]);
    for (const g of [a, b]) {
      stolGuruhlari.push(g);
      g.joylar.forEach(ish);
    }
    // Tik turib suhbatlashayotgan xodim (A guruhi, janubiy o'ng stol egasi bilan)
    const suhbatdosh = a.joylar[3].odam;
    if (suhbatdosh) turgan("ayolRasmiy", "gaplashish", -46.2, y, 39.75, qarashBurchagi(-46.2, 39.75, suhbatdosh.p[0], suhbatdosh.p[2]));
    tosiq(k, "printer", -39.6, -38.8, 33.9, 34.5, 1.0);
    tosiq(k, "kuler", -38.9, -38.5, 35.1, 35.5, 1.1);
    tosiq(k, "doska", IX0, IX0 + 0.1, 35.0, 37.4, 2.0);
    for (const z of [38.0, 38.8, 39.6]) m("yopiqJavon", -57.55, y, z, { b: P / 2 });
    m("gulTuvak", -57.4, y, 41.35);
    m("gulTuvak", -38.6, y, 41.4);
    m("gulTuvak", -40.4, y, 34.2);
    m("axlatQuti", -51.0, y, 33.5, { m: [1, 1, 1] });
    kichikMajlis(k, -48.8, 29.6);
    m("gulTuvak", -45.5, y, 26.75);
    m("divan", -38.75, y, 29.6, { b: -P / 2, rang: { carpet: "#0f766e" } });
    m("jurnalStoli", -40.2, y, 29.6, { b: P / 2 });
    stul("yumshoqKreslo", -41.65, y, 29.6, P / 2, [-40.2, 29.6]);
    m("gulTuvak", -38.65, y, 26.75);
    m("gulTuvak", -44.4, y, 32.5);
  }

  // ── 3-qavat: ochiq ofis (6 stol, noutbuklar), orqada choy-kofe burchagi ──
  {
    const k = 2;
    const y = Y[k];
    xona(k, "ochiqOfis", IX0, IX1, OLD_Z0, IZ1);
    xona(k, "kofeBurchak", ORQA_X0, IX1, IZ0, OLD_Z0);
    oldPol(k, "kovrolin");
    orqaPol(k, "parket");
    const a = stolGuruhi(-49.9, y, 37.3, ["xodimAyol", "xodimErkak", "xodimErkak", "xodimAyol"], true);
    const b = stolGuruhi(-44.1, y, 37.3, ["xodimErkak", "xodimAyol", undefined, undefined], true);
    for (const g of [a, b]) {
      stolGuruhlari.push(g);
      g.joylar.forEach(ish);
    }
    for (const z of [35.6, 36.4, 37.2, 38.0]) m("yopiqJavon", -57.55, y, z, { b: P / 2 });
    m("gulTuvak", -57.4, y, 41.35);
    m("gulTuvak", -38.6, y, 41.4);
    m("gulTuvak", -38.6, y, 33.6);
    m("torchiroq", -41.0, y, 41.5);
    // Choy-kofe burchagi: shkaflar, muzlatgich, kofe mashinasi, baland stol; tik turgan xodim kofe kutmoqda
    for (let i = 0; i < 4; i++) m("oshxonaShkafi", -51.9 + i * 0.86, y, IZ0 + 0.325, { rang: { wood: "#f1ede6", woodDark: "#8b5a3c" } });
    m("muzlatgich", -47.9, y, IZ0 + 0.31);
    m("kofeMashina", -50.18, y + 0.9, 26.55, { ustida: true });
    turgan("biznesmen", "gaplashish", -50.2, y, 27.75, P);
    ovqatStoli(k, -45.6, 30.2, [], "#8b5a3c");
    m("divan", -38.75, y, 29.4, { b: -P / 2, rang: { carpet: "#9a3412" } });
    m("jurnalStoli", -40.2, y, 29.4, { b: P / 2 });
    m("gulTuvak", -38.65, y, 26.75);
    m("gulTuvak", -42.3, y, 26.75);
  }

  // ── 4-qavat: kutubxona (javonlar, o'qiyotganlar) va o'yin xonasi (katta televizor, konsol, 3 o'yinchi) ──
  {
    const k = 3;
    const y = Y[k];
    xona(k, "kutubxona", IX0, -46.06, OLD_Z0, IZ1);
    xona(k, "kitobXonasi", ORQA_X0, IX1, IZ0, ORQA_Z1);
    xona(k, "oyinXonasi", -45.94, IX1, OLD_Z0, IZ1);
    devor(k, "shisha", "x", -46.0, YADRO.z1 + 0.06, IZ1, [[33.4, 34.4]]);
    devor(k, "shisha", "z", YADRO.z1, YADRO.x1 + 0.06, IX1, [[-51.4, -50.4]]);
    oldPol(k, "parket", IX0, -46.0);
    oldPol(k, "kovrolin", -46.0);
    orqaPol(k, "parket");
    // Chap devor bo'ylab javonlar
    for (let i = 0; i < 8; i++) kitobJavoni(-57.54, y, 34.8 + i * 0.8, P / 2);
    // O'qish joyi: ikki yumshoq kreslo (o'qiyotganlar), jurnal stoli, gilam, torsher
    const oquvchilar = [
      stul("yumshoqKreslo", -55.4, y, 38.0, P / 2, [-54.15, 38.0], "xodimAyol").odam,
      stul("yumshoqKreslo", -52.9, y, 38.0, -P / 2, [-54.15, 38.0], "xodimErkak").odam,
    ];
    for (const o of oquvchilar) {
      if (!o) continue;
      const [bx, bz] = lokal(o.p[0], o.p[2], o.burilish, 0, 0.3);
      qolKitoblari.push({ p: [bx, r3(y + 0.68), bz], b: o.burilish });
    }
    m("jurnalStoli", -54.15, y, 38.0, { b: P / 2 });
    m("gilam", -54.15, y + 0.003, 38.0, { b: P / 2, ustida: true, rang: { carpet: "#7c5a3a", carpetDarker: "#5b4029" } });
    m("torchiroq", -56.0, y, 39.4);
    // O'qish stoli (4 stul)
    ovqatStoli(k, -49.6, 36.6, [], "#5a3d2b");
    m("gulTuvak", -46.6, y, 41.4);
    m("gulTuvak", -46.6, y, 34.9);
    // Orqa xona: devor bo'ylab va o'rtada orqama-orqa javonlar, o'qish burchagi
    for (let i = 0; i < 12; i++) kitobJavoni(-51.85 + i * 0.8, y, IZ0 + 0.21, 0);
    for (let i = 0; i < 6; i++) {
      kitobJavoni(-51.4 + i * 0.8, y, 29.9, 0);
      kitobJavoni(-51.4 + i * 0.8, y, 29.5, P);
    }
    m("divan", -38.75, y, 29.4, { b: -P / 2, rang: { carpet: "#365314" } });
    m("gulTuvak", -38.65, y, 31.8);
    m("torchiroq", -38.5, y, 27.6);
    // O'yin xonasi: televizor tumba ustida (shisha to'siqqa tiralgan, +x ga qaragan)
    tosiq(k, "tvTumba", -45.94, -45.44, 36.3, 38.7, 0.45);
    const tvS = 3.2;
    m("televizor", -45.72, y + 0.45, 37.5, { b: P / 2, m: [tvS, tvS, tvS], ustida: true });
    oyinEkrani = tvEkrani(-45.72, y + 0.45, 37.5, P / 2, tvS);
    const oyinchilar = [
      ...divan("divan", -42.3, y, 37.5, -P / 2, [-45.72, 37.5], [[-0.45, "xodimErkak"], [0.45, "xodimAyol"]], { rang: { carpet: "#312e81" } }),
      stul("yumshoqKreslo", -42.6, y, 35.6, qarashBurchagi(-42.6, 35.6, -45.65, 37.5), null, "xodimErkak").odam,
    ];
    for (const o of oyinchilar) {
      if (!o) continue;
      const [px, pz] = lokal(o.p[0], o.p[2], o.burilish, 0, 0.34);
      pultlar.push({ p: [px, r3(y + 0.66), pz], b: o.burilish });
    }
    m("jurnalStoli", -43.8, y, 37.5, { b: P / 2 });
    m("gilam", -43.6, y + 0.003, 37.5, { b: P / 2, ustida: true, rang: { carpet: "#4c1d95", carpetDarker: "#2e1065" } });
    m("gulTuvak", -38.6, y, 41.4);
    m("gulTuvak", -38.6, y, 33.5);
  }

  // ── 5-qavat: stol tennisi (2 stol, 4 o'yinchi) va sport burchagi (yugurish yo'laklari, velotrenajer, gantellar) ──
  {
    const k = 4;
    const y = Y[k];
    xona(k, "sportZali", IX0, IX1, OLD_Z0, IZ1);
    xona(k, "sportOrqa", ORQA_X0, IX1, IZ0, OLD_Z0);
    oldPol(k, "sportPol");
    orqaPol(k, "sportPol");
    const T = TENNIS_STOLI;
    const tennisOdamlari: [OdamTuri, OdamHarakati, OdamTuri, OdamHarakati][] = [
      ["oddiyErkak", "ishlash", "ayolOddiy", "qolSilkitish"],
      ["ayolRasmiy", "qolSilkitish", "biznesmen", "ishlash"],
    ];
    [{ x: -48.2, z: 37.6 }, { x: -48.2, z: 29.8 }].forEach((s, i) => {
      tennisStollari.push({ x: s.x, z: s.z, y });
      tosiq(k, `tennis${i + 1}`, s.x - T.uzunlik / 2, s.x + T.uzunlik / 2, s.z - T.eni / 2, s.z + T.eni / 2, T.balandlik);
      const [a, ah, b, bh] = tennisOdamlari[i];
      const d = T.uzunlik / 2 + TENNIS_ORALIGI;
      turgan(a, ah, s.x - d, y, s.z - 0.15, P / 2);
      turgan(b, bh, s.x + d, y, s.z + 0.15, -P / 2);
    });
    // Sport burchagi
    for (const [i, t] of YUGURISH_YOLAKLARI.entries()) tosiq(k, `yugurish${i + 1}`, t.x0, t.x1, t.z0, t.z1, 1.3);
    const yy = YUGURISH_YOLAKLARI[0];
    turgan("ayolOddiy", "yurish", (yy.x0 + yy.x1) / 2 - 0.1, r3(y + LENTA_BALANDLIGI), (yy.z0 + yy.z1) / 2, P / 2);
    tosiq(k, "velotrenajer", -40.5, -39.3, 35.6, 36.2, 1.1);
    tosiq(k, "gantellar", -44.2, -42.2, 41.3, 41.8, 0.9);
    tosiq(k, "kuler", -52.3, -51.9, 33.3, 33.7, 1.1);
    m("divan", -57.15, y, 37.6, { b: P / 2, rang: { carpet: "#1e3a8a" } });
    m("gulTuvak", -57.4, y, 35.6);
    m("gulTuvak", -38.6, y, 33.5);
    m("gulTuvak", -38.65, y, 26.75);
    m("axlatQuti", -44.8, y, 33.5, { m: [1, 1, 1] });
  }

  // ── 6-qavat: katta majlislar zali, HR bo'limi, kichik majlis xonasi, kutish joyi ──
  {
    const k = 5;
    const y = Y[k];
    xona(k, "kattaMajlis", ORQA_X0, IX1, IZ0, ORQA_Z1);
    xona(k, "yolak", IX0, IX1, OLD_Z0, 35.94);
    xona(k, "kutish", IX0, -50.56, OLD_Z0, IZ1);
    xona(k, "hr", -50.44, -44.56, 36.06, IZ1);
    xona(k, "kichikMajlis", -44.44, IX1, 36.06, IZ1);
    devor(k, "shisha", "z", YADRO.z1, YADRO.x1 + 0.06, IX1, [[-50.6, -49.6]]);
    devor(k, "shisha", "z", 36.0, -50.5, IX1, [[-48.4, -47.4], [-42.2, -41.2]]);
    devor(k, "shisha", "x", -50.5, 36.06, IZ1);
    devor(k, "shisha", "x", -44.5, 36.06, IZ1);
    oldPol(k, "kovrolin");
    orqaPol(k, "parket");
    // Katta majlislar zali: 5.2 m stol, 7 kreslo (3 kishi, noutbuklari bilan), ekran g'arbiy devorda
    const s = KATTA_MAJLIS_STOLI;
    tosiq(k, "kattaMajlisStoli", s.x - s.eni / 2, s.x + s.eni / 2, s.z - s.chuqurlik / 2, s.z + s.chuqurlik / 2, s.h);
    const kr: V3 = [0.95, 0.95, 0.95];
    const shimolZ = r3(s.z - s.chuqurlik / 2 - 0.42);
    const janubZ = r3(s.z + s.chuqurlik / 2 + 0.42);
    const stolY = r3(y + s.h);
    const majlis: [number, number, number, OdamTuri | null][] = [
      [-47.2, shimolZ, 0, "xodimAyol"],
      [-45.4, shimolZ, 0, null],
      [-43.6, shimolZ, 0, null],
      [-47.2, janubZ, P, null],
      [-45.4, janubZ, P, "xodimErkak"],
      [-43.6, janubZ, P, null],
      [r3(s.x + s.eni / 2 + 0.45), s.z, -P / 2, "xodimErkak"],
    ];
    for (const [x, z, b, kim] of majlis) {
      stul("kreslo", x, y, z, b, b === -P / 2 ? [s.x, s.z] : [x, s.z], kim, kr);
      if (kim) {
        const [nx, nz] = lokal(x, z, b, 0, b === -P / 2 ? 0.8 : 0.82);
        mebel.push({ tur: "noutbuk", p: [nx, stolY, nz], b, ustida: true });
      }
    }
    tosiq(k, "ekranTumba", ORQA_X0, -51.98, 28.6, 30.6, 0.45);
    m("televizor", -52.22, y + 0.45, 29.6, { b: P / 2, m: [3, 3, 3], ustida: true });
    taqdimotEkranlari.push(tvEkrani(-52.22, y + 0.45, 29.6, P / 2, 3));
    m("gulTuvak", -38.65, y, 26.75);
    m("gulTuvak", -38.65, y, 32.4);
    // HR: xodim derazaga (+z) qarab o'tiradi, qarshisida mehmon kreslosi; devor bo'ylab yopiq javonlar
    ish(ishJoyi(-47.4, y, 39.8, P, { odam: "xodimAyol", gul: true }));
    stul("kreslo", -47.4, y, 40.95, P, [-47.4, 39.8], null, [0.9, 0.9, 0.9]);
    for (const z of [37.0, 37.8]) m("yopiqJavon", -50.23, y, z, { b: P / 2 });
    m("gulTuvak", -44.85, y, 41.45);
    // Kichik majlis xonasi (bo'sh)
    kichikMajlis(k, -41.3, 39.2);
    m("gulTuvak", -38.6, y, 41.45);
    // Kutish joyi
    m("divan", -57.15, y, 37.6, { b: P / 2, rang: { carpet: "#334155" } });
    m("jurnalStoli", -55.9, y, 37.6, { b: P / 2 });
    m("gulTuvak", -57.4, y, 35.3);
  }

  // ── 7-qavat: dizayn studiyasi (3 dizayner, 2 monitor), maket stoli, ilhom taxtasi, namunalar, 3D printer ──
  {
    const k = 6;
    const y = Y[k];
    xona(k, "studiya", IX0, IX1, OLD_Z0, IZ1);
    xona(k, "studiyaOrqa", ORQA_X0, IX1, IZ0, OLD_Z0);
    oldPol(k, "mikrotsement");
    orqaPol(k, "mikrotsement");
    const dizaynerlar: OdamTuri[] = ["xodimAyol", "xodimErkak", "xodimAyol"];
    [35.2, 37.4, 39.6].forEach((z, i) => ish(ishJoyi(-43.6, y, z, P / 2, { odam: dizaynerlar[i], monitorlar: 2, gul: i === 1 })));
    const mk = MAKET_STOLI;
    tosiq(k, "maketStoli", mk.x0, mk.x1, mk.z0, mk.z1, mk.h);
    turgan("ayolRasmiy", "ishlash", -50.4, y, 37.65, P);
    tosiq(k, "moodboard", IX0, IX0 + 0.06, MOODBOARD.z0, MOODBOARD.z1, 2.5);
    m("ochiqJavon", -51.8, y, 33.28, { rang: { wood: "#e7e5e4" } });
    m("ochiqJavon", -51.0, y, 33.28, { rang: { wood: "#e7e5e4" } });
    m("gulTuvak", -38.6, y, 41.4);
    m("gulTuvak", -38.6, y, 33.6);
    m("gulTuvak", -57.4, y, 41.35);
    // Orqa qism: dam olish (divan, kreslolar), 3D printerlar
    m("divan", -50.0, y, IZ0 + 0.45, { rang: { carpet: "#b45309" } });
    m("jurnalStoli", -50.0, y, 28.0);
    stul("yumshoqKreslo", -51.3, y, 29.5, qarashBurchagi(-51.3, 29.5, -50.0, 28.0), [-50.0, 28.0]);
    stul("yumshoqKreslo", -48.7, y, 29.5, qarashBurchagi(-48.7, 29.5, -50.0, 28.0), [-50.0, 28.0]);
    tosiq(k, "printer3d", -40.6, -38.9, 26.4, 27.2, 1.0);
    m("gulTuvak", -45.0, y, 26.75);
    m("gulTuvak", -38.65, y, 31.8);
  }

  // ── 8-qavat (tomsiz): direktor kabineti, qabulxona (kotiba), VIP majlislar zali, kofe burchagi ──
  {
    const k = QAVAT_SONI - 1;
    const y = Y[k];
    xona(k, "qabulxona", IX0, -47.06, OLD_Z0, IZ1);
    xona(k, "direktor", -46.94, IX1, OLD_Z0, IZ1);
    xona(k, "kofeBurchak", ORQA_X0, -47.05, IZ0, OLD_Z0);
    xona(k, "majlislar", -46.95, IX1, IZ0, ORQA_Z1);
    devor(k, "shisha", "x", -47.0, YADRO.z1 + 0.06, 38.0, [[36.2, 37.2]]);
    devor(k, "yongoq", "x", -47.0, 38.0, IZ1);
    devor(k, "yongoq", "z", YADRO.z1, -47.06, IX1);
    devor(k, "shisha", "x", -47.0, IZ0, YADRO.z1 - 0.06, [[31.4, 32.4]]);
    oldPol(k, "kovrolin", IX0, -47.0);
    oldPol(k, "parket", -47.0);
    orqaPol(k, "kovrolin");
    const d = DIREKTOR_STOLI;
    tosiq(k, "direktorStoli", d.x - d.eni / 2, d.x + d.eni / 2, d.z - d.chuqurlik / 2, d.z + d.chuqurlik / 2, d.h);
    tosiq(k, "kredensa", -43.0, -40.6, 33.1, 33.6, 0.72);
    tosiq(k, "tvTumba", -46.92, -46.48, 39.0, 40.6, 0.5);
    // Direktor: kreslo stol ortida, eshik va mehmonlarga (+z) qaragan
    stul("kreslo", d.x, y, 34.95, 0, [d.x, d.z], "direktor", [1.06, 1.06, 1.06]);
    const dsY = r3(y + d.h);
    m("monitor", -42.3, dsY, 35.72, { b: P, ustida: true });
    m("noutbuk", -41.25, dsY, 35.8, { b: P, ustida: true });
    m("kichikGul", -40.95, dsY, 36.25, { ustida: true });
    for (const x of [-44.2, -43.4, -40.2, -39.4]) m("yopiqJavon", x, y, 33.3, { rang: { wood: "#5a3d2b", metal: "#c8a24a" } });
    stul("kreslo", -42.5, y, 37.15, P, [d.x, d.z], null, [0.95, 0.95, 0.95]);
    stul("kreslo", -41.1, y, 37.15, P, [d.x, d.z], null, [0.95, 0.95, 0.95]);
    m("divan", -38.75, y, 39.8, { b: -P / 2, rang: { carpet: "#2b2420" } });
    m("jurnalStoli", -40.2, y, 39.8, { b: P / 2 });
    m("gilam", -40.4, y + 0.003, 39.8, { b: P / 2, ustida: true, rang: { carpet: "#8a7d6b", carpetDarker: "#5c5246" } });
    m("torchiroq", -38.5, y, 38.4);
    m("gulTuvak", -38.65, y, 41.35);
    m("gulTuvak", -46.5, y, 41.35);
    m("gulTuvak", -38.65, y, 33.45);
    m("televizor", -46.7, y + 0.5, 39.8, { b: P / 2, ustida: true });
    const yk = stul("yumshoqKreslo", -41.7, y, 39.8, P / 2, [-40.2, 39.8]);
    yk.stul.rang = { carpet: "#2b2420" };
    // Qabulxona: kotiba stoli direktor eshigi yonida, kelganlarga (−x) qaragan
    ish(ishJoyi(-49.9, y, 37.4, P / 2, { odam: "xodimAyol", gul: true }));
    m("yopiqJavon", -47.26, y, 39.0, { b: -P / 2 });
    m("yopiqJavon", -47.26, y, 39.8, { b: -P / 2 });
    m("divan", -57.3, y, 38.8, { b: P / 2 });
    m("jurnalStoli", -56.0, y, 38.8, { b: P / 2 });
    m("gilam", -56.0, y + 0.003, 38.8, { b: P / 2, ustida: true });
    m("gulTuvak", -57.4, y, 41.35);
    m("gulTuvak", -57.4, y, 36.9);
    m("kiyimIlgich", -51.9, y, 33.6);
    stul("yumshoqKreslo", -54.6, y, 38.8, -P / 2, [-56.0, 38.8]);
    // Kofe burchagi
    for (let i = 0; i < 4; i++) m("oshxonaShkafi", -51.95 + i * 0.86, y, IZ0 + 0.315);
    m("muzlatgich", -48.0, y, 26.55);
    m("kofeMashina", -50.23, y + 0.9, 26.55, { ustida: true });
    m("gulTuvak", -47.5, y, 32.6);
    tosiq(k, "barStol", -50.2, -49.4, 29.6, 30.4, 1.05);
    // VIP majlislar zali: 7 o'rin (2 kishi), g'arbiy uchida taqdimot ekrani
    const mz = MAJLIS_STOLI;
    tosiq(k, "majlisStoli", mz.x - mz.eni / 2, mz.x + mz.eni / 2, mz.z - mz.chuqurlik / 2, mz.z + mz.chuqurlik / 2, mz.h);
    tosiq(k, "ekranTumba", -46.92, -46.48, 28.6, 30.6, 0.45);
    const kr: V3 = [0.95, 0.95, 0.95];
    const shimolZ = r3(mz.z - mz.chuqurlik / 2 - 0.42);
    const janubZ = r3(mz.z + mz.chuqurlik / 2 + 0.42);
    const vip: [number, number, number, OdamTuri | null][] = [
      [-44.1, shimolZ, 0, null],
      [-42.6, shimolZ, 0, null],
      [-41.1, shimolZ, 0, "xodimErkak"],
      [-44.1, janubZ, P, null],
      [-42.6, janubZ, P, null],
      [-41.1, janubZ, P, null],
      [r3(mz.x + mz.eni / 2 + 0.42), mz.z, -P / 2, "xodimAyol"],
    ];
    const vipY = r3(y + mz.h);
    for (const [x, z, b, kim] of vip) {
      stul("kreslo", x, y, z, b, b === -P / 2 ? [mz.x, mz.z] : [x, mz.z], kim, kr);
      if (kim) {
        const [nx, nz] = lokal(x, z, b, 0, b === -P / 2 ? 0.75 : 0.8);
        mebel.push({ tur: "noutbuk", p: [nx, vipY, nz], b, ustida: true });
      }
    }
    m("televizor", -46.72, y + 0.45, 29.6, { b: P / 2, m: [3, 3, 3], ustida: true });
    taqdimotEkranlari.push(tvEkrani(-46.72, y + 0.45, 29.6, P / 2, 3));
    m("gulTuvak", -38.65, y, 26.75);
    m("gulTuvak", -46.5, y, 26.75);
  }

  return {
    mebel, odamlar, juftlar, ishJoylari, yuruvchilar, tosiqlar, xonalar, devorlar, pollar, stolGuruhlari,
    likopchalar, pultlar, qolKitoblari, kitobQatorlari, tennisStollari, taqdimotEkranlari, oyinEkrani: oyinEkrani as Ekran | null,
  };
}

const OFIS_JOYLASHUVI = ofisYarat();
/** Ofisdagi barcha GLB mebel (ish joylari jihozlari bilan). */
export const OFIS_MEBELLARI: readonly MebelJoyi[] = OFIS_JOYLASHUVI.mebel;
/** Ofisdagi o'tirgan va tik turgan odamlar. */
export const OFIS_ODAMLARI: readonly OdamJoyi[] = OFIS_JOYLASHUVI.odamlar;
export const OFIS_YURUVCHILARI: readonly YuruvchiJoyi[] = OFIS_JOYLASHUVI.yuruvchilar;
export const OFIS_ISH_JOYLARI: readonly IshJoyi[] = OFIS_JOYLASHUVI.ishJoylari;
export const OFIS_OTIRISH_JUFTLARI: readonly OtirishJuftligi[] = OFIS_JOYLASHUVI.juftlar;
/** Kod bilan chiziladigan to'siqlar (peshtaxta, stol, tumba, sport jihozlari): test mebel bilan kesishmasligini tekshiradi. */
export const OFIS_TOSIQLARI: readonly Tosiq[] = OFIS_JOYLASHUVI.tosiqlar;
/** Xonalar (har qavat): har mebel va odam biror xona ichida bo'lishi shart (devordan o'tmaydi). */
export const OFIS_XONALARI: readonly OfisXonasi[] = OFIS_JOYLASHUVI.xonalar;
export const OFIS_DEVORLARI: readonly OfisDevori[] = OFIS_JOYLASHUVI.devorlar;
export const OFIS_POL_QOPLAMALARI: readonly PolQoplamasi[] = OFIS_JOYLASHUVI.pollar;
/** Ochiq ofisdagi stol guruhlari (2- va 3-qavat): orqama-orqa stollar orasida akustik to'siq. */
export const OFIS_STOL_GURUHLARI = OFIS_JOYLASHUVI.stolGuruhlari;
/** Restorandagi likopchalar (ovqatlanayotganlar oldida). */
export const LIKOPCHALAR: readonly V3[] = OFIS_JOYLASHUVI.likopchalar;
/** O'yinchilar qo'lidagi pultlar va kitobxonlar qo'lidagi kitoblar. */
export const OYIN_PULTLARI: readonly QolBuyumi[] = OFIS_JOYLASHUVI.pultlar;
export const QOL_KITOBLARI: readonly QolBuyumi[] = OFIS_JOYLASHUVI.qolKitoblari;
export const KITOB_QATORLARI: readonly KitobQatori[] = OFIS_JOYLASHUVI.kitobQatorlari;
export const TENNIS_STOLLARI: readonly TennisStoli[] = OFIS_JOYLASHUVI.tennisStollari;
export const TAQDIMOT_EKRANLARI: readonly Ekran[] = OFIS_JOYLASHUVI.taqdimotEkranlari;
export const OYIN_EKRANI: Ekran = OFIS_JOYLASHUVI.oyinEkrani ?? { x: 0, y: 0, z: 0, burchak: 0, eni: 1, balandlik: 1 };

// ---------------------------------------------------------------------------------------------------------------------
// Stol tennisi to'pi

/** To'p davri (s): A dan B ga va qaytib. */
export const TOP_DAVRI = 1.5;

/**
 * To'p holati (stol markaziga nisbatan dx, dz va poldan y). Yarim davrda: zarba nuqtasidan (o'yinchi oldida, 0.95 m) yoy bo'ylab
 * raqib yarmiga (stol yuzasi) tushadi, sakrab raqib zarba nuqtasiga boradi. `faza` — stollar bir xil o'ynamasin.
 */
export function tennisTopi(t: number, faza = 0): [number, number, number] {
  const T = TENNIS_STOLI;
  const zarbaX = T.uzunlik / 2 + 0.38;
  const u0 = (((t / TOP_DAVRI + faza) % 1) + 1) % 1;
  const orqaga = u0 >= 0.5;
  const u = orqaga ? (u0 - 0.5) * 2 : u0 * 2;
  const sakrash = 0.64;
  const yuza = T.balandlik + 0.02;
  const zarbaY = 0.95;
  let y: number;
  if (u < sakrash) {
    const s = u / sakrash;
    y = zarbaY + (yuza - zarbaY) * s + 4 * 0.28 * s * (1 - s);
  } else {
    const s = (u - sakrash) / (1 - sakrash);
    y = yuza + (zarbaY - yuza) * s + 4 * 0.2 * s * (1 - s);
  }
  const yon = orqaga ? -1 : 1;
  const dx = yon * (-zarbaX + 2 * zarbaX * u);
  const dz = yon * (-0.15 + 0.3 * u);
  return [dx, y, dz];
}

// ---------------------------------------------------------------------------------------------------------------------
// Direktor avtomobili (umumiy, hech bir brend nomi/belgisisiz hashamatli sedan) va belgilangan turargoh joyi

/**
 * Avtomobil o'lchamlari (m): uzunligi 5.72, eni 2.0, balandligi ≈ 1.66; g'ildirak radiusi 0.43 (katta disklar), o'qlar
 * lokal x = +1.86 (old) va −1.72 (orqa) — uzun kapot, baza 3.58 m. Lokal koordinata: x — oldinga, y — yuqoriga, z — yon (eni bo'ylab).
 */
export const MASHINA = { uzunlik: 5.72, eni: 2.0, balandlik: 1.66, gRadius: 0.43, oldOq: 1.86, orqaOq: -1.72, iz: 1.72 } as const;

/** Mashina joyi (DIREKTOR_JOYI: markazi va burilishi — burchak = π/2 da oldi +x ga). */
export const DIREKTOR_MASHINASI = { x: DIREKTOR_JOYI.x, z: DIREKTOR_JOYI.z, burchak: DIREKTOR_JOYI.burchak } as const;
/** Bo'yalgan turargoh joyi (mashina atrofida): uzunligi va eni. */
export const TURARGOH_JOYI = { uzunlik: 6.4, eni: 2.9 } as const;
/** Turargoh belgisi va yerdagi yozuv matnlari (faqat lavozim — hech qanday avtomobil brendi yo'q). */
export const TURARGOH_MATNLARI = { belgi: "DIREKTOR", izoh: "Faqat rahbariyat", yer: "DIREKTOR" } as const;
/** Belgi ustuni: turargoh old o'ng burchagida, lavhasi +z ga (ko'chaga) qaragan. */
export const TURARGOH_BELGISI = { x: r3(DIREKTOR_JOYI.x + 3.6), z: r3(DIREKTOR_JOYI.z + 1.35), balandlik: 2.1 } as const;
/** Haydovchi: mashina bilan bino orasida, kirish eshigiga qarab kutmoqda. */
export const HAYDOVCHI: OdamJoyi = (() => {
  const x = r3(DIREKTOR_JOYI.x - 0.7);
  const z = r3(DIREKTOR_JOYI.z - MASHINA.eni / 2 - 0.55);
  return { tur: "biznesmen", harakat: "turish", p: [x, 0, z], burilish: r3(qarashBurchagi(x, z, OFIS_ESHIGI.x1, OFIS.z1)), faza: 0.41 };
})();

/** Mashinaning lokal nuqtasini dunyo koordinatasiga (test va joylashtirish uchun). */
export function mashinaNuqtasi(lx: number, lz: number): [number, number] {
  // Guruh burilishi θ = b − π/2: lokal x (oldinga) → dunyo (sin b, cos b); lokal z → dunyo (−cos b, sin b)
  const b = DIREKTOR_MASHINASI.burchak;
  return [r3(DIREKTOR_MASHINASI.x + lx * Math.sin(b) - lz * Math.cos(b)), r3(DIREKTOR_MASHINASI.z + lx * Math.cos(b) + lz * Math.sin(b))];
}

/** Kuzov pastki qismi yon profili (g'ildirak arkalari bilan): bevel bilan birga uzunligi 5.72 m bo'ladi. */
function kuzovShakli(bevel: number) {
  const s = new THREE.Shape();
  const R = 0.53;
  const cy = MASHINA.gRadius;
  const past = 0.34;
  const th = Math.asin((cy - past) / R);
  const yarim = R * Math.cos(th);
  const old = MASHINA.uzunlik / 2 - bevel;
  s.moveTo(-old + 0.04, past);
  s.lineTo(MASHINA.orqaOq - yarim, past);
  s.absarc(MASHINA.orqaOq, cy, R, Math.PI + th, -th, true);
  s.lineTo(MASHINA.oldOq - yarim, past);
  s.absarc(MASHINA.oldOq, cy, R, Math.PI + th, -th, true);
  s.lineTo(old - 0.12, 0.36);
  s.lineTo(old - 0.02, 0.5);
  s.lineTo(old, 0.96);
  s.lineTo(old - 0.06, 1.04);
  s.lineTo(1.0, 1.09);
  s.lineTo(-2.05, 1.08);
  s.lineTo(-old + 0.2, 1.02);
  s.lineTo(-old + 0.02, 0.9);
  s.lineTo(-old, 0.55);
  s.lineTo(-old + 0.04, past);
  return s;
}

/** Salon (tom va ustunlar) yon profili: tik old oyna, uzun tom, orqa oyna. */
function salonShakli() {
  const s = new THREE.Shape();
  s.moveTo(0.98, 1.06);
  s.lineTo(0.18, 1.52);
  s.quadraticCurveTo(-0.7, 1.62, -1.5, 1.54);
  s.lineTo(-2.08, 1.06);
  s.lineTo(0.98, 1.06);
  return s;
}

/** Yon oyna (salon profilidan ichkariroq). */
function yonOynaShakli() {
  const s = new THREE.Shape();
  s.moveTo(0.84, 1.12);
  s.lineTo(0.2, 1.48);
  s.quadraticCurveTo(-0.68, 1.565, -1.44, 1.495);
  s.lineTo(-1.94, 1.12);
  s.lineTo(0.84, 1.12);
  return s;
}

/** Ikki nuqta orasidagi qiya plita (old/orqa oyna): markazi, uzunligi va z o'qi bo'yicha burilishi; tashqariga `siljish`. */
function qiyaPlita(a: readonly [number, number], b: readonly [number, number], siljish: number) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy);
  // Tashqi normal: profil soat strelkasiga teskari aylanadi — (dy, −dx) tashqariga
  const nx = dy / l;
  const ny = -dx / l;
  return { p: [r3((a[0] + b[0]) / 2 + nx * siljish), r3((a[1] + b[1]) / 2 + ny * siljish)] as [number, number], uzunlik: r3(l), burchak: Math.atan2(dy, dx) };
}

/** Old va orqa oyna joylari (salon profili qirralari ustida). */
export const MASHINA_OYNALARI = {
  old: qiyaPlita([0.98, 1.06], [0.18, 1.52], 0.068),
  orqa: qiyaPlita([-1.5, 1.54], [-2.08, 1.06], 0.068),
} as const;

/**
 * Mashinaning murakkab qismlari geometriyasi (lokal koordinatada, z markazlangan): kuzov (pastki qism, arkalar bilan), salon
 * (tom va ustunlar), yon oyna (yupqa, ikki tomonga qo'yiladi). Chaqiruvchi bo'shatadi.
 */
export function mashinaGeometriyalari() {
  const bevel = 0.05;
  const kuzovChuqurligi = MASHINA.eni - 2 * bevel;
  const kuzov = new THREE.ExtrudeGeometry(kuzovShakli(bevel), { depth: kuzovChuqurligi, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 20 });
  kuzov.translate(0, 0, -kuzovChuqurligi / 2);
  const salonChuqurligi = 1.6;
  const salon = new THREE.ExtrudeGeometry(salonShakli(), { depth: salonChuqurligi, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 3, curveSegments: 16 });
  salon.translate(0, 0, -salonChuqurligi / 2);
  const yonOyna = new THREE.ExtrudeGeometry(yonOynaShakli(), { depth: 0.012, bevelEnabled: false, curveSegments: 12 });
  for (const g of [kuzov, salon, yonOyna]) g.computeBoundingBox();
  return { kuzov, salon, yonOyna, salonYarimEni: salonChuqurligi / 2 + 0.06 };
}

/** Kichik canvas tekstura (node muhitida null). */
function canvasTekstura(w: number, h: number, chiz: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  chiz(ctx, w, h);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Turargoh belgisi lavhasi: ko'k fon, oq "P", ostida lavozim yozuvi. */
function belgiTeksturasi() {
  return canvasTekstura(256, 320, (ctx, w, h) => {
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#1d4ed8";
    ctx.fillRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 150px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("P", w / 2, 112);
    ctx.fillRect(28, 196, w - 56, 4);
    ctx.font = "bold 40px Arial, sans-serif";
    ctx.fillText(TURARGOH_MATNLARI.belgi, w / 2, 236);
    ctx.font = "22px Arial, sans-serif";
    ctx.fillText(TURARGOH_MATNLARI.izoh, w / 2, 280);
  });
}

/** Yerga bo'yalgan yozuv (sariq harflar, shaffof fon). */
function yerYozuviTeksturasi() {
  return canvasTekstura(512, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#facc15";
    ctx.font = "bold 92px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(TURARGOH_MATNLARI.yer, w / 2, h / 2 + 4);
  });
}

/** Direktor avtomobili va turargoh materiallari (chaqiruvchi `materiallarniTozala` bilan bo'shatadi). */
export function mashinaMateriallariYarat() {
  const m = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0, ...extra });
  const belgi = belgiTeksturasi();
  const yozuv = yerYozuviTeksturasi();
  return {
    // Ikki rang: pastki kuzov — chuqur qora lak, salon va kapot — shampan-kumush
    kuzov: m("#07080b", { roughness: 0.16, metalness: 0.55 }),
    shampan: m("#c9bc9c", { roughness: 0.22, metalness: 0.7 }),
    xrom: m("#e5e9ee", { roughness: 0.06, metalness: 1 }),
    oyna: new THREE.MeshStandardMaterial({ color: "#0c1218", roughness: 0.04, metalness: 0.7 }),
    rezina: m("#121316", { roughness: 0.92 }),
    disk: m("#2a2e35", { roughness: 0.3, metalness: 0.75 }),
    qoraPlastik: m("#0d0e10", { roughness: 0.55 }),
    farOq: new THREE.MeshStandardMaterial({ color: "#f8fafc", emissive: "#f1f5ff", emissiveIntensity: 1.6, roughness: 0.2 }),
    stopQizil: new THREE.MeshStandardMaterial({ color: "#7f1d1d", emissive: "#dc2626", emissiveIntensity: 1.1, roughness: 0.3 }),
    chiziqOq: m("#f1f5f9", { roughness: 0.8 }),
    chiziqSariq: m("#facc15", { roughness: 0.8 }),
    ustun: m("#6b7280", { roughness: 0.4, metalness: 0.6 }),
    belgi: m("#ffffff", { map: belgi, roughness: 0.5 }),
    yerYozuvi: new THREE.MeshStandardMaterial({ color: "#ffffff", map: yozuv, transparent: true, roughness: 0.8, depthWrite: false }),
  };
}
export type MashinaMateriallari = ReturnType<typeof mashinaMateriallariYarat>;
