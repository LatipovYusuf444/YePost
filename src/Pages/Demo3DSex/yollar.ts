import * as THREE from "three";

// Yuk mashinasi marshrutlari: ko'cha → KPP (shlagbaum oldida to'xtaydi) → hovli → rampaga orqa bilan kirish, va qaytish.
// Tezlik oddiy fizika bilan hisoblanadi: tezlanish, burilishda sekinlashish, to'xtash joyiga tormozlab kelish.
// UI'siz va React'siz — testlarda ham ishlaydi (marshrut demo bosqichi ichiga sig'ishi tekshiriladi).

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
  // Oldinga qarab sekinlashish: keyingi 25 m dagi eng past chegaraga tormoz bilan yetib olish.
  const ruxsat = (s: number, v: number) => {
    let eng = chegara(s);
    for (let d = 1; d <= 25; d += 1) {
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

// ── Marshrutlar (hudud.ts rejasi bo'yicha) ──
// Ko'chadan (+x tomondan, z = 34 qatori) keladi, o'ngga burilib darvozaga kiradi va shlagbaum oldida to'xtaydi.
const KOCHADAN_KPP: Bolak = {
  nuqtalar: [[95, 34, 13], [40, 34, 13], [16, 34, 6], [6, 33.6, 3.8], [2.2, 32.6, 3.2], [0.3, 31.2, 2.8], [0, 29.8, 2.2]],
  boshTezlik: 13,
  kutish: 1.2,
};
// Hovlidan darvoza → ko'cha (o'ngga burilib −x tomonga ketadi).
const DARVOZADAN_KOCHAGA: Nuqta[] = [[0.5, 27, 3.5], [1, 30, 3.2], [0.2, 32.6, 3.8], [-3, 33.9, 6], [-12, 34, 11], [-50, 34, 15], [-108, 34, 15]];

/** 1-rampa (old tomon, jo'natish): hovlida chapga o'tib, orqa bilan rampaga kiradi; mashina oldi +z ga qaraydi. */
export const RAMPA1_KELISH = marshrutTuz([
  KOCHADAN_KPP,
  { nuqtalar: [[0, 29.8, 3], [-0.4, 26, 4.5], [-2.5, 22.8, 5], [-8, 21.2, 5.5], [-19.5, 21, 4]], kutish: 0.6 },
  { nuqtalar: [[-19.5, 21, 2.4], [-15.5, 20.2, 2.6], [-13.3, 18, 2.3], [-12.8, 16, 1.6], [-12.8, 15.5, 1]], orqaga: true },
]);
export const RAMPA1_KETISH = marshrutTuz([
  { nuqtalar: [[-12.8, 15.5, 2], [-12.6, 19.5, 4], [-10, 22.8, 5], [-4, 24.2, 4.5], ...DARVOZADAN_KOCHAGA], toxtamaydi: true },
]);

/** 2-rampa (chap darvoza, qabul): hovli bo'ylab binoning chap tomoniga o'tadi va orqa bilan darvozaga kiradi; oldi −x ga qaraydi. */
export const RAMPA2_KELISH = marshrutTuz([
  KOCHADAN_KPP,
  { nuqtalar: [[0, 29.8, 3], [-0.4, 26.2, 4.5], [-3, 23.6, 6], [-10, 22.6, 7.5], [-20, 22.5, 7], [-24.5, 21.4, 4.5], [-26.4, 18, 5], [-26.5, 8, 8], [-26.5, -5.5, 4]], kutish: 0.1 },
  { nuqtalar: [[-26.5, -5.5, 2.4], [-26.3, -3, 2.6], [-25, -0.8, 2.3], [-22.6, 0.1, 1.6], [-21.6, 0.1, 1]], orqaga: true },
]);
export const RAMPA2_KETISH = marshrutTuz([
  {
    nuqtalar: [[-21.6, 0.1, 2.5], [-25, 0.6, 3.5], [-26.6, 3.5, 5], [-26.6, 16, 8], [-24.8, 21.2, 5], [-20, 22.6, 7], [-8, 22.8, 7], [-2.5, 24.4, 4.5], ...DARVOZADAN_KOCHAGA],
    toxtamaydi: true,
  },
]);

export const MARSHRUTLAR = { 1: { kelish: RAMPA1_KELISH, ketish: RAMPA1_KETISH }, 2: { kelish: RAMPA2_KELISH, ketish: RAMPA2_KETISH } } as const;
