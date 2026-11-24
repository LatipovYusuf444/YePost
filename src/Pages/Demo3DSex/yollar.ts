import * as THREE from "three";
import { ASOSIY_YOL, CHIQISH, KIRISH, RAMPALAR, type RampaRaqami } from "./hudud.ts";

// Yuk mashinasi marshrutlari: ko'cha → KPP kirish qatori (shlagbaum oldida to'xtaydi) → hovli → rampaga orqa bilan kirish,
// va qaytish: rampadan → hovli → KPP chiqish qatori (shlagbaum oldida to'xtaydi) → ko'chaga o'ngga burilib ketadi.
// Tezlik oddiy fizika bilan hisoblanadi: tezlanish, burilishda sekinlashish, to'xtash joyiga tormozlab kelish.
// UI'siz va React'siz — testlarda ham ishlaydi (marshrut demo bosqichi ichiga sig'ishi va to'qnashuvlar tekshiriladi).

/** [x, z, tezlik chegarasi m/s (ixtiyoriy)] */
export type Nuqta = [number, number, number?];

export type Bolak = {
  nuqtalar: Nuqta[];
  /** Orqaga yuradi (mashina harakat yo'nalishiga teskari qaraydi). */
  orqaga?: boolean;
  /** Bo'lak boshida tezlik (m/s): ko'chadan kelayotgan mashina to'xtamasdan kiradi. */
  boshTezlik?: number;
  /** Oxirida to'xtamaydi (hududdan chiqib ketish). */
  toxtamaydi?: boolean;
  /** Bo'lakdan keyin kutish (s). */
  kutish?: number;
};

type TayyorBolak = {
  egri: THREE.CatmullRomCurve3;
  uzunlik: number;
  orqaga: boolean;
  /** Har QADAM soniyadagi bosib o'tilgan masofa. */
  jadval: number[];
  vaqt: number;
  kutish: number;
  boshlanish: number;
};

export type Marshrut = { bolaklar: TayyorBolak[]; davom: number };

const QADAM = 0.05;
const TEZLANISH = 1.8;
const TORMOZ = 2.2;
const STANDART_TEZLIK = 5;

function bolakTuz(b: Bolak, boshlanish: number): TayyorBolak {
  const egri = new THREE.CatmullRomCurve3(b.nuqtalar.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, "centripetal");
  const uzunlik = egri.getLength();
  // Nazorat nuqtalarining yo'l bo'yidagi o'rni (taxminan — vatarlar bo'yicha) va tezlik chegarasi.
  const vatar = [0];
  for (let i = 1; i < b.nuqtalar.length; i++) {
    const [ax, az] = b.nuqtalar[i - 1];
    const [cx, cz] = b.nuqtalar[i];
    vatar.push(vatar[i - 1] + Math.hypot(cx - ax, cz - az));
  }
  const jamiVatar = vatar[vatar.length - 1] || 1;
  const chegaralar = b.nuqtalar.map(([, , v], i) => ({ s: (vatar[i] / jamiVatar) * uzunlik, v: v ?? STANDART_TEZLIK }));
  const chegara = (s: number) => {
    for (let i = 1; i < chegaralar.length; i++) {
      if (s <= chegaralar[i].s) {
        const a = chegaralar[i - 1];
        const c = chegaralar[i];
        const u = c.s > a.s ? (s - a.s) / (c.s - a.s) : 1;
        return a.v + (c.v - a.v) * u;
      }
    }
    return chegaralar[chegaralar.length - 1].v;
  };
  // Oldinga qarab sekinlashish: keyingi 40 m dagi eng past chegaraga tormoz bilan yetib olish.
  const ruxsat = (s: number, v: number) => {
    let eng = chegara(s);
    for (let d = 1; d <= 40; d += 1) {
      const keyingi = chegara(Math.min(uzunlik, s + d));
      eng = Math.min(eng, Math.sqrt(keyingi * keyingi + 2 * TORMOZ * d));
    }
    if (!b.toxtamaydi) eng = Math.min(eng, Math.sqrt(2 * TORMOZ * Math.max(0, uzunlik - s)) + 0.25);
    return Math.max(0, Math.min(eng, v + TEZLANISH * QADAM));
  };
  const jadval = [0];
  let s = 0;
  let v = b.boshTezlik ?? 0;
  for (let k = 0; k < 20000 && s < uzunlik; k++) {
    const r = ruxsat(s, v);
    v = r < v ? Math.max(r, v - TORMOZ * QADAM * 1.5) : r;
    s = Math.min(uzunlik, s + Math.max(0.05, v) * QADAM);
    jadval.push(s);
  }
  return { egri, uzunlik, orqaga: Boolean(b.orqaga), jadval, vaqt: (jadval.length - 1) * QADAM, kutish: b.kutish ?? 0, boshlanish };
}

export function marshrutTuz(bolaklar: Bolak[]): Marshrut {
  const tayyor: TayyorBolak[] = [];
  let t = 0;
  for (const b of bolaklar) {
    const bolak = bolakTuz(b, t);
    tayyor.push(bolak);
    t += bolak.vaqt + bolak.kutish;
  }
  return { bolaklar: tayyor, davom: t };
}

export type Holat = { p: THREE.Vector3; burchak: number; masofa: number; orqaga: boolean; harakatda: boolean };

const vaqtinchaT = new THREE.Vector3();

/** Marshrutning `t` soniyadagi holati (t davomdan oshsa — oxirgi nuqtada turadi). `masofa` — g'ildirak aylanishi uchun. */
export function marshrutHolati(m: Marshrut, t: number, natija: Holat): Holat {
  let otilgan = 0;
  for (let i = 0; i < m.bolaklar.length; i++) {
    const b = m.bolaklar[i];
    const oxirgi = i === m.bolaklar.length - 1;
    const ichida = t - b.boshlanish;
    if (ichida < b.vaqt + b.kutish || oxirgi) {
      const k = Math.min(b.jadval.length - 1, Math.max(0, ichida / QADAM));
      const k0 = Math.floor(k);
      const k1 = Math.min(b.jadval.length - 1, k0 + 1);
      const s = b.jadval[k0] + (b.jadval[k1] - b.jadval[k0]) * (k - k0);
      const u = b.uzunlik > 0 ? Math.min(1, s / b.uzunlik) : 0;
      b.egri.getPointAt(u, natija.p);
      b.egri.getTangentAt(u, vaqtinchaT);
      const yon = b.orqaga ? -1 : 1;
      natija.burchak = Math.atan2(vaqtinchaT.x * yon, vaqtinchaT.z * yon);
      natija.masofa = otilgan + s;
      natija.orqaga = b.orqaga;
      natija.harakatda = ichida >= 0 && ichida < b.vaqt;
      return natija;
    }
    otilgan += b.uzunlik;
  }
  return natija;
}

export const yangiHolat = (): Holat => ({ p: new THREE.Vector3(), burchak: 0, masofa: 0, orqaga: false, harakatda: false });

// ── Yo'l chizgich: to'g'ri chiziq va aylana yoylaridan nazorat nuqtalari ──
// Yo'nalish burchagi `burchak` bilan bir xil: (sin θ, cos θ) — θ = 0 → +z, π/2 → +x, −π/2 → −x, π → −z.
// Burilish: musbat — chapga, manfiy — o'ngga (yuqoridan qaraganda).

class Chizgich {
  nuqtalar: Nuqta[];
  private x: number;
  private z: number;
  private th: number;

  constructor(x: number, z: number, burchak: number, tezlik: number) {
    this.x = x;
    this.z = z;
    this.th = burchak;
    this.nuqtalar = [[x, z, tezlik]];
  }

  /** To'g'ri chiziq: uzun bo'lsa oraliq nuqtalar (egri chiziq tekis qoladi, tezlik chegarasi bir xil bo'ladi). */
  togri(uzunlik: number, tezlik: number) {
    if (uzunlik <= 1e-6) return this;
    const dx = Math.sin(this.th);
    const dz = Math.cos(this.th);
    if (uzunlik < 0.6 && this.nuqtalar.length > 1) {
      // Juda qisqa bo'lak: yaqin nuqtalar egri chiziqda sinish beradi — oxirgi nuqta surib qo'yiladi.
      this.x += dx * uzunlik;
      this.z += dz * uzunlik;
      this.nuqtalar[this.nuqtalar.length - 1] = [this.x, this.z, tezlik];
      return this;
    }
    const qadamlar = new Set<number>();
    if (uzunlik > 5) { qadamlar.add(1.5); qadamlar.add(uzunlik - 1.5); }
    for (let d = 12; d < uzunlik - 6; d += 12) qadamlar.add(d);
    qadamlar.add(uzunlik);
    for (const d of [...qadamlar].sort((a, b) => a - b)) this.nuqtalar.push([this.x + dx * d, this.z + dz * d, tezlik]);
    this.x += dx * uzunlik;
    this.z += dz * uzunlik;
    return this;
  }

  /** Nuqtagacha to'g'ri (yo'nalish o'zgarmaydi — faqat shu yo'nalishdagi masofa olinadi). */
  gacha(o: { x?: number; z?: number }, tezlik: number) {
    const dx = Math.sin(this.th);
    const dz = Math.cos(this.th);
    const uzunlik = o.x !== undefined ? (o.x - this.x) / dx : ((o.z ?? this.z) - this.z) / dz;
    return this.togri(uzunlik, tezlik);
  }

  /** Aylana yoyi: `radius` bo'yicha `burchak` radianga (musbat — chapga). */
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

  /** Qator almashtirish: ikki qarama-qarshi yoy bilan yon tomonga `yon` metr siljiydi (musbat — chapga), yo'nalish o'zgarmaydi. */
  siljit(yon: number, radius: number, tezlik: number) {
    const burchak = Math.acos(1 - Math.abs(yon) / (2 * radius)) * Math.sign(yon);
    return this.buril(radius, burchak, tezlik).buril(radius, -burchak, tezlik);
  }
}

const CHAP = Math.PI / 2;
const ONG = -Math.PI / 2;
/** Yo'nalishlar (burchak). */
const YON = { pz: 0, px: Math.PI / 2, mx: -Math.PI / 2, mz: Math.PI } as const;

// ── Reja (hudud.ts) asosidagi yo'l qatorlari, metr ──

/** Yuk mashinasi: uzunligi 8.6, eni 2.5 (markaz — uzunlik o'rtasi, oldi +z). */
export const YUK_MASHINASI = { uzunlik: 8.6, eni: 2.5 } as const;
const YARIM_UZUNLIK = YUK_MASHINASI.uzunlik / 2;

/** Ko'chadagi qator (−x yo'nalish): kelayotgan ham, ketayotgan ham shu qatorda (o'ngga burilib kiradi / chiqadi). */
const KOCHA_Z = ASOSIY_YOL.qatorlar[0].z;
/** Ko'chada mashina paydo bo'ladigan va g'oyib bo'ladigan joylar (hududdan uzoqda). */
const KOCHA_BOSHI_X = 120;
const KOCHA_OXIRI_X = -110;
/** Shlagbaum oldida to'xtash: mashina oldi shlagbaumdan 0.7 m oldin (kirishda oldi z ≈ 44.2, markaz 48.5). */
const KIRISH_TOXTASH_Z = KIRISH.shlagbaumZ + 0.7 + YARIM_UZUNLIK;
const CHIQISH_TOXTASH_Z = CHIQISH.shlagbaumZ - 0.5 - YARIM_UZUNLIK;

/**
 * Hovlidagi qatorlar (o'ng tomonlama harakat):
 * old rampalarga — z = 26 bo'ylab +x ga; old rampalardan — z = 32.5 bo'ylab −x ga (6.5 m oraliq — yonma-yon o'tadi);
 * chap rampalarga — z = 23.5 bo'ylab −x ga, so'ng x = −43.5 bo'ylab pastga; chap rampalardan — x = −51 bo'ylab yuqoriga, z = 17.2 bo'ylab +x ga (KPP oldidan z = 19 ga o'tib, chiqish qatoriga buriladi).
 */
export const HOVLI_QATORLARI = {
  oldgaKelish: 26,
  olddanKetish: 32.5,
  chapgaKelish: 23.5,
  chapgaPastga: -43.5,
  chapdanYuqoriga: -51,
  chapdanKetish: 17.2,
} as const;

/** Rampada turgan mashina markazi va yo'nalishi (hudud.ts dagi tavsif bo'yicha: orqasi devorga tegadi). */
export const RAMPA_HOLATI: Record<RampaRaqami, { x: number; z: number; burchak: number }> = {
  1: { x: RAMPALAR[1].x, z: RAMPALAR[1].z + YARIM_UZUNLIK, burchak: 0 },
  2: { x: RAMPALAR[2].x, z: RAMPALAR[2].z + YARIM_UZUNLIK, burchak: 0 },
  3: { x: RAMPALAR[3].x - YARIM_UZUNLIK, z: RAMPALAR[3].z, burchak: -Math.PI / 2 },
  4: { x: RAMPALAR[4].x - YARIM_UZUNLIK, z: RAMPALAR[4].z, burchak: -Math.PI / 2 },
};

// Tezliklar (m/s): ko'chada ~43 km/soat, hovlida ~20 km/soat, burilishda 3–4, orqaga 1–2.
const V = { kocha: 12, kochaBurilish: 4.2, darvoza: 3.5, hovli: 5.8, burilish: 3.6, manyovr: 2.4, orqaga: 1.8, orqagaBurilish: 1.5, kirish: 1 } as const;

/** Ko'chadan kirish qatoriga: o'ngga burilib, shlagbaum oldida to'xtaydi va kutadi (qorovul hujjatni tekshiradi). */
function kochadanKpp(): Bolak {
  const r = 7;
  const c = new Chizgich(KOCHA_BOSHI_X, KOCHA_Z, YON.mx, V.kocha)
    .gacha({ x: KIRISH.x + r }, V.kocha)
    .buril(r, ONG, V.kochaBurilish)
    .gacha({ z: KIRISH_TOXTASH_Z }, V.darvoza);
  return { nuqtalar: c.nuqtalar, boshTezlik: V.kocha, kutish: 1.2 };
}

/** Chiqish shlagbaumidan ko'chaga: o'ngga burilib z = 66 qatori bo'ylab −x ga ketadi. */
function kppdanKochaga(): Bolak {
  const r = 7;
  const c = new Chizgich(CHIQISH.x, CHIQISH_TOXTASH_Z, YON.pz, 0)
    .gacha({ z: KOCHA_Z - r }, V.darvoza)
    .buril(r, ONG, V.kochaBurilish)
    .gacha({ x: KOCHA_OXIRI_X }, V.kocha);
  return { nuqtalar: c.nuqtalar, toxtamaydi: true };
}

/** Old rampa (1, 2): z = 26 bo'ylab +x ga rampadan o'tib to'xtaydi, so'ng orqaga burilib rampaga kiradi (oldi +z). */
function oldRampaKelish(rampa: 1 | 2): Bolak[] {
  const { x: rx, z: rz } = RAMPA_HOLATI[rampa];
  const q = HOVLI_QATORLARI.oldgaKelish;
  const r = 5.5;
  const orqagaTogri = 3.5;
  const hovli = new Chizgich(KIRISH.x, KIRISH_TOXTASH_Z, YON.mz, 0)
    .gacha({ z: q + 6 }, V.hovli)
    .buril(6, ONG, V.burilish)
    .gacha({ x: rx + r + orqagaTogri }, V.hovli);
  const orqaga = new Chizgich(rx + r + orqagaTogri, q, YON.mx, V.orqaga)
    .togri(orqagaTogri, V.orqaga)
    .buril(r, ONG, V.orqagaBurilish)
    .gacha({ z: rz }, V.kirish);
  return [
    { nuqtalar: hovli.nuqtalar, kutish: 0.6 },
    { nuqtalar: orqaga.nuqtalar, orqaga: true },
  ];
}

/** Chap rampa (3, 4): z = 23.5 bo'ylab −x ga, x = −43.5 da pastga, rampadan o'tib orqaga burilib kiradi (oldi −x). */
function chapRampaKelish(rampa: 3 | 4): Bolak[] {
  const { x: rx, z: rz } = RAMPA_HOLATI[rampa];
  const q = HOVLI_QATORLARI.chapgaKelish;
  const px = HOVLI_QATORLARI.chapgaPastga;
  const r = 5.5;
  const orqagaTogri = 1.2;
  const pastgaZ = rz - r - orqagaTogri;
  const hovli = new Chizgich(KIRISH.x, KIRISH_TOXTASH_Z, YON.mz, 0)
    .gacha({ z: q + 6 }, V.hovli)
    .buril(6, CHAP, V.burilish)
    .gacha({ x: px + 6 }, V.hovli)
    .buril(6, ONG, V.burilish)
    .gacha({ z: pastgaZ }, V.manyovr + 1);
  const orqaga = new Chizgich(px, pastgaZ, YON.pz, V.orqaga)
    .togri(orqagaTogri, V.orqaga)
    .buril(r, CHAP, V.orqagaBurilish)
    .gacha({ x: rx }, V.kirish);
  return [
    { nuqtalar: hovli.nuqtalar, kutish: 0.6 },
    { nuqtalar: orqaga.nuqtalar, orqaga: true },
  ];
}

/** Old rampadan: oldinga chiqib o'ngga (−x), z = 32.5 bo'ylab chiqish qatoriga, chapga burilib shlagbaum oldida to'xtaydi. */
function oldRampaKetish(rampa: 1 | 2): Bolak[] {
  const { x: rx, z: rz } = RAMPA_HOLATI[rampa];
  const q = HOVLI_QATORLARI.olddanKetish;
  const r = 5.5;
  const c = new Chizgich(rx, rz, YON.pz, 0)
    .gacha({ z: q - 6 }, V.manyovr + 1)
    .buril(6, ONG, V.burilish)
    .gacha({ x: CHIQISH.x + r }, V.hovli)
    .buril(r, CHAP, V.burilish)
    .gacha({ z: CHIQISH_TOXTASH_Z }, V.darvoza);
  return [{ nuqtalar: c.nuqtalar, kutish: 1 }, kppdanKochaga()];
}

/** Chap rampadan: oldinga (−x), x = −51 da yuqoriga burilib, z = 17.2 bo'ylab +x ga, chiqish qatoriga o'ngga burilib shlagbaum oldida to'xtaydi. */
function chapRampaKetish(rampa: 3 | 4): Bolak[] {
  const { x: rx, z: rz } = RAMPA_HOLATI[rampa];
  const ux = HOVLI_QATORLARI.chapdanYuqoriga;
  const q = HOVLI_QATORLARI.chapdanKetish;
  const r = 5.5;
  const chiqishBurilishi = { x: CHIQISH.x, z: 19, r: 6.5 };
  const c = new Chizgich(rx, rz, YON.mx, 0)
    .gacha({ x: ux + r }, V.manyovr + 1)
    .buril(r, CHAP, V.burilish)
    .gacha({ z: q - r }, V.manyovr + 1)
    .buril(r, CHAP, V.burilish)
    .gacha({ x: chiqishBurilishi.x - chiqishBurilishi.r - 14 }, V.hovli)
    // Burilishda mashina orqasi tashqariga chiqadi — bino devoridan uzoqlashish uchun avval qatorni z = 19 ga almashtiradi.
    .siljit(-(chiqishBurilishi.z - q), 18, V.hovli - 1)
    .gacha({ x: chiqishBurilishi.x - chiqishBurilishi.r }, V.hovli)
    .buril(chiqishBurilishi.r, ONG, V.burilish)
    .gacha({ z: CHIQISH_TOXTASH_Z }, V.darvoza + 1);
  return [{ nuqtalar: c.nuqtalar, kutish: 1 }, kppdanKochaga()];
}

export const RAMPA1_KELISH = marshrutTuz([kochadanKpp(), ...oldRampaKelish(1)]);
export const RAMPA1_KETISH = marshrutTuz(oldRampaKetish(1));
export const RAMPA2_KELISH = marshrutTuz([kochadanKpp(), ...oldRampaKelish(2)]);
export const RAMPA2_KETISH = marshrutTuz(oldRampaKetish(2));
export const RAMPA3_KELISH = marshrutTuz([kochadanKpp(), ...chapRampaKelish(3)]);
export const RAMPA3_KETISH = marshrutTuz(chapRampaKetish(3));
export const RAMPA4_KELISH = marshrutTuz([kochadanKpp(), ...chapRampaKelish(4)]);
export const RAMPA4_KETISH = marshrutTuz(chapRampaKetish(4));

export const MARSHRUTLAR: Record<RampaRaqami, { kelish: Marshrut; ketish: Marshrut }> = {
  1: { kelish: RAMPA1_KELISH, ketish: RAMPA1_KETISH },
  2: { kelish: RAMPA2_KELISH, ketish: RAMPA2_KETISH },
  3: { kelish: RAMPA3_KELISH, ketish: RAMPA3_KETISH },
  4: { kelish: RAMPA4_KELISH, ketish: RAMPA4_KETISH },
};

/**
 * Shlagbaumlar uchun vaqtlar (marshrut boshidan, s): `kirish` — kelishda mashina kirish shlagbaumi oldida turgan oraliq
 * (oxirida strela ochilgan bo'lishi kerak), `chiqish` — ketishda chiqish shlagbaumi oldida turgan oraliq.
 */
export const SHLAGBAUM_VAQTLARI: Record<RampaRaqami, { kirish: [number, number]; chiqish: [number, number] }> = Object.fromEntries(
  ([1, 2, 3, 4] as const).map((rampa) => {
    const [kpp] = MARSHRUTLAR[rampa].kelish.bolaklar;
    const [hovli] = MARSHRUTLAR[rampa].ketish.bolaklar;
    return [rampa, { kirish: [kpp.vaqt, kpp.vaqt + kpp.kutish], chiqish: [hovli.vaqt, hovli.vaqt + hovli.kutish] }];
  }),
) as Record<RampaRaqami, { kirish: [number, number]; chiqish: [number, number] }>;
