// 3D Demo — DEMO ma'lumot manbai (sinov ma'lumotlari). Haqiqiy stanok, backend yoki maxfiy kalit kerak emas.
// Ssenariy soniyalar bo'yicha (tik = 1 s) yuradi; Pauza/Davom ettirish/Qayta boshlash bilan boshqariladi.
// Sahna faqat `SexManbasi` interfeysini biladi — keyinchalik shu joyga Ye-Post API manbai qo'yiladi.
// UI'siz va `@/` importlarisiz — testlarda ishlaydi.
import type { Reys, ReysBosqichi, SexHodisasi, SexHolati, SexManbasi, StanokHolati, StanokTavsifi, Topshiriq } from "./sexModeli.ts";

/** Liniyalardagi stanoklar joyi (x, metr) — ikkala liniyada bir xil. Oqim: material ombori → kesish → CNC → qirra → burg'ilash → qadoqlash → tayyor mahsulot. */
const LINIYA_X = { kesish: -15, cnc: -5, qirra: 5.5, burgilash: 14.5, qadoqlash: 22.5 } as const;
/** 1-liniya z = −7.5 (oldi +z — markaziy yo'lakka), 2-liniya z = 7.5 (oldi −z — yo'lakka). */
const LINIYALAR = [{ z: -7.5, burilish: 0 }, { z: 7.5, burilish: Math.PI }] as const;

/** Ishlab chiqarish rejasi (metr): ikki parallel liniya, har birida 5 ta stanok (ID: "kesish-01" … "qadoqlash-02"). */
export const DEMO_STANOKLAR: StanokTavsifi[] = LINIYALAR.flatMap(({ z, burilish }, i) => {
  const n = `0${i + 1}`;
  const s = (tur: StanokTavsifi["tur"], nom: string): StanokTavsifi => ({ id: `${tur}-${n}`, nom: `${nom}-${n}`, tur, joy: [LINIYA_X[tur], z], burilish });
  return [s("kesish", "Kesish"), s("cnc", "CNC"), s("qirra", "Qirra"), s("burgilash", "Burg'ilash"), s("qadoqlash", "Qadoqlash")];
});

const t = (id: string, buyurtma: string, detal: string, operatsiya: string, bajarildi: number, jami: number, birlik = "dona"): Topshiriq =>
  ({ id, buyurtma, detal, operatsiya, bajarildi, jami, birlik });

/** Ssenariy boshidagi holat (yangilangan / aloqa — boshlashda qo'yiladi). */
function boshlangichHolat(): Record<string, Omit<StanokHolati, "yangilangan" | "aloqa">> {
  return {
    "kesish-01": {
      stanokId: "kesish-01", holat: "ishlayapti",
      joriy: t("T-174-1", "№174", "Yon panel", "Kesish", 32, 80),
      navbat: [t("T-174-2", "№174", "Orqa panel", "Kesish", 0, 40), t("T-178-1", "№178", "Tokcha", "Kesish", 0, 60)],
    },
    "cnc-01": {
      stanokId: "cnc-01", holat: "bosh", joriy: null,
      navbat: [t("T-181-1", "№181", "Eshik fasadi", "Frezalash", 0, 24), t("T-174-3", "№174", "Yon panel", "Teshik ochish", 0, 80)],
    },
    "qirra-01": {
      stanokId: "qirra-01", holat: "ishlayapti",
      joriy: t("T-172-2", "№172", "Qopqoq", "Qirra yopishtirish", 18, 50),
      navbat: [t("T-174-4", "№174", "Yon panel", "Qirra yopishtirish", 0, 80)],
    },
    "burgilash-01": {
      stanokId: "burgilash-01", holat: "ishlayapti",
      joriy: t("T-172-3", "№172", "Tokcha", "Burg'ilash", 14, 30),
      navbat: [t("T-172-4", "№172", "Qopqoq", "Burg'ilash", 0, 50)],
    },
    "qadoqlash-01": {
      stanokId: "qadoqlash-01", holat: "ishlayapti",
      joriy: t("T-170-9", "№170", "Shkaf \"Lux\"", "Qadoqlash", 6, 12, "komplekt"),
      navbat: [t("T-172-9", "№172", "Komod", "Qadoqlash", 0, 8, "komplekt")],
    },
    // 2-liniya: boshqa buyurtmalar (№184 — ofis mebeli, №186 — shkaf-kupe, №188 — bolalar xonasi).
    "kesish-02": {
      stanokId: "kesish-02", holat: "ishlayapti",
      joriy: t("T-186-1", "№186", "Shkaf-kupe yon devori", "Kesish", 18, 48),
      navbat: [t("T-188-1", "№188", "Krovat yon paneli", "Kesish", 0, 24), t("T-186-2", "№186", "Polka", "Kesish", 0, 64)],
    },
    "cnc-02": {
      stanokId: "cnc-02", holat: "ishlayapti",
      joriy: t("T-186-3", "№186", "Eshik fasadi (MDF)", "Frezalash", 7, 20),
      navbat: [t("T-188-2", "№188", "Tortma fasadi", "Frezalash", 0, 16)],
    },
    "qirra-02": {
      stanokId: "qirra-02", holat: "ishlayapti",
      joriy: t("T-184-2", "№184", "Stol qopqog'i", "Qirra yopishtirish", 22, 40),
      navbat: [t("T-186-4", "№186", "Shkaf-kupe yon devori", "Qirra yopishtirish", 0, 48)],
    },
    "burgilash-02": {
      stanokId: "burgilash-02", holat: "bosh", sabab: "Detal kutilmoqda (Qirra-02)", joriy: null,
      navbat: [t("T-184-3", "№184", "Stol qopqog'i", "Burg'ilash", 0, 40), t("T-186-5", "№186", "Shkaf-kupe yon devori", "Burg'ilash", 0, 48)],
    },
    "qadoqlash-02": {
      stanokId: "qadoqlash-02", holat: "ishlayapti",
      joriy: t("T-184-9", "№184", "Ofis stoli", "Qadoqlash", 3, 10, "komplekt"),
      navbat: [t("T-188-9", "№188", "Kitob javoni", "Qadoqlash", 0, 6, "komplekt")],
    },
  };
}

/** Ishlayotgan stanokda miqdor qancha soniyada nechtaga oshadi (demo tezligi). */
const TEZLIK: Record<string, { har: number; qadam: number }> = {
  "kesish-01": { har: 2, qadam: 4 },
  "cnc-01": { har: 3, qadam: 1 },
  "qirra-01": { har: 2, qadam: 2 },
  "burgilash-01": { har: 2, qadam: 1 },
  "qadoqlash-01": { har: 5, qadam: 1 },
  "kesish-02": { har: 3, qadam: 2 },
  "cnc-02": { har: 4, qadam: 1 },
  "qirra-02": { har: 3, qadam: 2 },
  "burgilash-02": { har: 3, qadam: 2 },
  "qadoqlash-02": { har: 6, qadam: 1 },
};

/** Ssenariy voqealari (soniya → amal). Natija: ikki xil buyurtma yangilanadi, pauza, aloqa uzilishi va tiklanishi. */
export const SSENARIY = {
  cncBoshlanadi: 5,
  qirraPauza: 9,
  aloqaUziladi: 13,
  qirraDavom: 19,
  aloqaTiklanadi: 23,
  /** 2-liniya: Burg'ilash-02 qirradan detal kelgach ishga tushadi. */
  burgilash2Boshlanadi: 16,
  /** Tugagan topshiriqdan keyin navbatdagisi necha soniyada (alohida hodisa) boshlanadi. */
  keyingiKutish: 2,
} as const;

/** Navbat tugasa demo davom etishi uchun yangi topshiriqlar (aylanib). */
const ZAXIRA: Array<[string, string, string, number, string?]> = [
  ["№183", "Yon panel", "Kesish", 40],
  ["№183", "Eshik", "Frezalash", 12],
  ["№185", "Polka", "Qirra yopishtirish", 36],
  ["№185", "Yashik devori", "Burg'ilash", 24],
  ["№181", "Oshxona to'plami", "Qadoqlash", 4, "komplekt"],
];

type Ichki = StanokHolati & { kutish?: number };
type Hodisachi = (stanokId: string, tur: SexHodisasi["tur"], matn: string, obyekt?: SexHodisasi["obyekt"]) => void;

/** Reys bosqichlari ketma-ketligi va uzunligi (s). Yig'indisi — `LOGISTIKA.davr`. */
export type ReysBosqichlari = ReadonlyArray<readonly [ReysBosqichi, number]>;

/** Reys jadvali: tavsif + davrdagi siljish (s) + o'z bosqichlari (kelish/ketish uzunligi rampaga qarab har xil). */
export type ReysJadvali = Omit<Reys, "bosqich" | "boshlangan" | "palet"> & { siljish: number; bosqichlar: ReysBosqichlari };

/** Har bir reys davri (s). To'rt reys bir xil davr bilan aylanadi — o'zaro joylashuvi har davrda takrorlanadi. */
const LOGISTIKA_DAVRI = 140;
/** Rampada turish (s): 6 palet ~19.6 s da tugaydi, qolgani — hujjat va eshiklarni yopish. */
const RAMPADA_TURISH = 26;

/** Bosqichlar: kelmoqda (ko'chadan rampagacha), rampada (yuklash/tushirish), ketmoqda (rampadan ko'chagacha), yoq — davrning qolgani. */
const bosqichlar = (kelmoqda: number, ketmoqda: number): ReysBosqichlari => [
  ["kelmoqda", kelmoqda],
  ["rampada", RAMPADA_TURISH],
  ["ketmoqda", ketmoqda],
  ["yoq", LOGISTIKA_DAVRI - kelmoqda - RAMPADA_TURISH - ketmoqda],
];

/**
 * Logistika (sinov): to'rt KAMAZ reysi 140 s davr bilan aylanadi. Kelish/ketish bosqichi yollar.ts dagi marshrut
 * davomiyligiga moslangan (1, 2 — old rampa, qisqaroq; 3, 4 — chap rampa, uzunroq). Siljishlar shunday tanlanganki, kirishlar
 * navbat bilan (0 → 41 → 76 → 108 s: 1-, 3-, 4-, 2-reys) keladi va istalgan ikki mashina markazlari orasi doim ≥ 6 m,
 * to'rtburchaklari kesishmaydi (tests/demo3dLogistika.test.mjs simulyatsiya qiladi).
 */
export const REYSLAR_JADVALI: ReadonlyArray<ReysJadvali> = [
  { id: "reys-1", raqam: "01 345 ABA", yonalish: "jonatish", rampa: 1, yuk: "№170 · Shkaf \"Lux\"", jamiPalet: 6, siljish: 0, bosqichlar: bosqichlar(43, 35) },
  { id: "reys-2", raqam: "01 712 BBA", yonalish: "jonatish", rampa: 2, yuk: "№172 · Komod \"Nova\"", jamiPalet: 6, siljish: 108, bosqichlar: bosqichlar(42, 34) },
  { id: "reys-3", raqam: "40 512 CAA", yonalish: "qabul", rampa: 3, yuk: "LDSP 16 mm · 120 list", jamiPalet: 6, siljish: 41, bosqichlar: bosqichlar(52, 51) },
  { id: "reys-4", raqam: "30 228 DAA", yonalish: "qabul", rampa: 4, yuk: "MDF 18 mm · 80 list", jamiPalet: 6, siljish: 76, bosqichlar: bosqichlar(49, 47) },
];

/** Reys siljishlari (s) — ID bo'yicha. */
export const REYS_SILJISHLARI: Readonly<Record<string, number>> = Object.fromEntries(REYSLAR_JADVALI.map((r) => [r.id, r.siljish]));

/** Umumiy davr, rampada turish va standart bosqichlar (1-reysniki). Har reysning o'z bosqichlari — `REYSLAR_JADVALI[i].bosqichlar`. */
export const LOGISTIKA = {
  davr: LOGISTIKA_DAVRI,
  rampada: RAMPADA_TURISH,
  bosqichlar: REYSLAR_JADVALI[0].bosqichlar,
};

/** Ssenariy soniyasida reys qaysi bosqichda va bosqich boshlanganiga necha soniya bo'ldi (`reysBosqichlari` — reysning o'zi; standart — 1-reys). */
export function reysBosqichi(soniya: number, siljish: number, reysBosqichlari: ReysBosqichlari = LOGISTIKA.bosqichlar): { bosqich: ReysBosqichi; otgan: number } {
  let l = (((soniya - siljish) % LOGISTIKA.davr) + LOGISTIKA.davr) % LOGISTIKA.davr;
  for (const [bosqich, davom] of reysBosqichlari) {
    if (l < davom) return { bosqich, otgan: l };
    l -= davom;
  }
  return { bosqich: "yoq", otgan: 0 };
}

/** Pogruzchik har 7.5 s da 2 palet olib o'tadi (rampaga turgandan 0.8 s keyin boshlaydi, palet ~4.55 s da o'tadi). */
function paletSoni(bosqich: ReysBosqichi, otgan: number, jami: number) {
  if (bosqich === "rampada") return Math.min(jami, 2 * Math.floor((otgan + 2.95) / 7.5));
  return bosqich === "ketmoqda" ? jami : 0;
}

export class DemoSexManbasi implements SexManbasi {
  private ichki: Record<string, Ichki> = {};
  /** Foydalanuvchiga ko'rsatiladigan holat: aloqa uzilgan stanokda — oxirgi ma'lum nusxa (eskirgan). */
  private korsatilgan: SexHolati = {};
  private tinglovchilar = new Set<(holat: SexHolati, hodisa?: SexHodisasi) => void>();
  private taymer: ReturnType<typeof setInterval> | null = null;
  private zaxiraIndeks = 0;
  private reysHolati: Reys[] = [];
  /** Ssenariy soniyasi. */
  soniya = 0;
  hodisalar: SexHodisasi[] = [];
  private vaqt: () => number;

  constructor(vaqt: () => number = Date.now) {
    this.vaqt = vaqt;
    this.qaytaBoshlash(false);
  }

  holat() {
    return this.korsatilgan;
  }

  reyslar() {
    return this.reysHolati;
  }

  obuna(tinglovchi: (holat: SexHolati, hodisa?: SexHodisasi) => void) {
    this.tinglovchilar.add(tinglovchi);
    return () => { this.tinglovchilar.delete(tinglovchi); };
  }

  get ishlayapti() {
    return this.taymer !== null;
  }

  /** Taymerni yoqadi (har `oraliq` ms da bitta soniya). */
  boshlash(oraliq = 1000) {
    if (this.taymer) return;
    this.taymer = setInterval(() => this.tik(), oraliq);
    this.xabar();
  }

  pauza() {
    if (!this.taymer) return;
    clearInterval(this.taymer);
    this.taymer = null;
    this.xabar();
  }

  /** Ssenariyni boshidan boshlaydi (taymer holati saqlanadi). */
  qaytaBoshlash(xabarBerilsin = true) {
    const hozir = this.vaqt();
    this.soniya = 0;
    this.zaxiraIndeks = 0;
    this.hodisalar = [];
    this.ichki = Object.fromEntries(Object.entries(boshlangichHolat()).map(([id, h]) => [id, { ...h, yangilangan: hozir, aloqa: true }]));
    this.reysHolati = [];
    this.reyslarniYangila(hozir);
    this.nashr();
    if (xabarBerilsin) this.xabar();
  }

  /** Bitta soniya oldinga (taymer chaqiradi; testlar ham bevosita). */
  tik() {
    this.soniya += 1;
    const s = this.soniya;
    const hozir = this.vaqt();
    const hodisalar: SexHodisasi[] = [];
    const hodisa: Hodisachi = (stanokId, tur, matn, obyekt) => { hodisalar.push({ vaqt: hozir, stanokId, tur, matn, ...(obyekt ? { obyekt } : {}) }); };

    // Ssenariy voqealari.
    if (s === SSENARIY.cncBoshlanadi) this.keyinginiBoshlash("cnc-01", hodisa);
    if (s === SSENARIY.burgilash2Boshlanadi) this.keyinginiBoshlash("burgilash-02", hodisa);
    if (s === SSENARIY.qirraPauza) {
      Object.assign(this.ichki["qirra-01"], { holat: "pauza", sabab: "Lenta almashtirilmoqda" });
      hodisa("qirra-01", "pauza", "Qirra-01 pauzada — lenta almashtirilmoqda");
    }
    if (s === SSENARIY.qirraDavom) {
      Object.assign(this.ichki["qirra-01"], { holat: "ishlayapti", sabab: undefined });
      hodisa("qirra-01", "davom", "Qirra-01 ishni davom ettirdi");
    }
    if (s === SSENARIY.aloqaUziladi) {
      this.ichki["burgilash-01"].aloqa = false;
      hodisa("burgilash-01", "aloqa_uzildi", "Burg'ilash-01 bilan aloqa uzildi");
    }
    if (s === SSENARIY.aloqaTiklanadi) {
      this.ichki["burgilash-01"].aloqa = true;
      hodisa("burgilash-01", "aloqa_tiklandi", "Burg'ilash-01 bilan aloqa tiklandi");
    }

    // Ish jarayoni: ishlayotgan stanoklarda miqdor oshadi (aloqa uzilgan stanok ham ishlayveradi — faqat biz ko'rmaymiz).
    for (const [id, st] of Object.entries(this.ichki)) {
      if (st.kutish !== undefined) {
        st.kutish -= 1;
        if (st.kutish <= 0) {
          st.kutish = undefined;
          this.keyinginiBoshlash(id, hodisa);
        }
      } else if (st.holat === "ishlayapti" && st.joriy) {
        const tezlik = TEZLIK[id];
        if (tezlik && s % tezlik.har === 0) {
          st.joriy = { ...st.joriy, bajarildi: Math.min(st.joriy.jami, st.joriy.bajarildi + tezlik.qadam) };
          if (st.joriy.bajarildi >= st.joriy.jami) {
            hodisa(id, "tugadi", `${this.nomi(id)}: ${st.joriy.buyurtma} · ${st.joriy.detal} tugadi (${st.joriy.jami} ${st.joriy.birlik})`);
            st.holat = "bosh";
            st.kutish = SSENARIY.keyingiKutish;
          }
        }
      }
      if (st.aloqa) st.yangilangan = hozir;
    }

    this.reyslarniYangila(hozir, hodisa);
    this.nashr();
    this.hodisalar = [...hodisalar.reverse(), ...this.hodisalar].slice(0, 30);
    if (hodisalar.length) for (const h of hodisalar) this.xabar(h);
    else this.xabar();
  }

  /** Navbatdagi topshiriq alohida hodisa sifatida boshlanadi (tugagani yopilgandan keyin). */
  private keyinginiBoshlash(id: string, hodisa: Hodisachi) {
    const st = this.ichki[id];
    const navbat = [...st.navbat];
    let keyingi = navbat.shift();
    if (!keyingi) {
      const [buyurtma, detal, operatsiya, jami, birlik] = ZAXIRA[this.zaxiraIndeks++ % ZAXIRA.length];
      keyingi = t(`Z-${this.zaxiraIndeks}`, buyurtma, detal, operatsiya, 0, jami, birlik);
    }
    if (navbat.length === 0) {
      const [buyurtma, detal, operatsiya, jami, birlik] = ZAXIRA[this.zaxiraIndeks++ % ZAXIRA.length];
      navbat.push(t(`Z-${this.zaxiraIndeks}`, buyurtma, detal, operatsiya, 0, jami, birlik));
    }
    Object.assign(st, { holat: "ishlayapti", sabab: undefined, joriy: { ...keyingi, bajarildi: 0 }, navbat });
    hodisa(id, "boshlandi", `${this.nomi(id)}: ${keyingi.buyurtma} · ${keyingi.detal} boshlandi (0/${keyingi.jami} ${keyingi.birlik})`);
  }

  /** Reyslar bosqichi: bosqich almashganda `boshlangan` yangilanadi va hodisa yoziladi (sahna harakatni shu vaqtdan hisoblaydi). */
  private reyslarniYangila(hozir: number, hodisa?: Hodisachi) {
    const oldingi = new Map(this.reysHolati.map((reys) => [reys.id, reys]));
    this.reysHolati = REYSLAR_JADVALI.map(({ siljish, bosqichlar: reysBosqichlari, ...tavsif }) => {
      const { bosqich, otgan } = reysBosqichi(this.soniya, siljish, reysBosqichlari);
      const eski = oldingi.get(tavsif.id);
      const almashdi = !eski || eski.bosqich !== bosqich;
      if (almashdi && eski && hodisa) {
        const { raqam, yuk, jamiPalet, rampa } = tavsif;
        const jonatish = tavsif.yonalish === "jonatish";
        if (bosqich === "kelmoqda") hodisa(tavsif.id, "reys_keldi", `${raqam} KPP'ga kelmoqda — ${jonatish ? `${yuk} uchun` : `yuk: ${yuk}`}`, "reys");
        if (bosqich === "rampada") hodisa(tavsif.id, "reys_rampada", `${raqam} ${rampa}-rampada — ${yuk} ${jonatish ? "yuklanmoqda" : "tushirilmoqda"}`, "reys");
        if (bosqich === "ketmoqda") hodisa(tavsif.id, "reys_ketdi", `${raqam} ${jonatish ? "yuklandi" : "tushirildi"} (${jamiPalet} palet) va jo'nab ketdi`, "reys");
      }
      return {
        ...tavsif,
        bosqich,
        boshlangan: almashdi || !eski ? hozir - otgan * 1000 : eski.boshlangan,
        palet: paletSoni(bosqich, otgan, tavsif.jamiPalet),
      };
    });
  }

  private nomi(id: string) {
    return DEMO_STANOKLAR.find((stanok) => stanok.id === id)?.nom ?? id;
  }

  /** Ichki holatdan ko'rsatiladiganini yangilaydi: aloqa yo'q stanokda oxirgi ma'lum nusxa qoladi (faqat aloqa bayrog'i). */
  private nashr() {
    const keyingi: SexHolati = {};
    for (const [id, st] of Object.entries(this.ichki)) {
      const { kutish: _kutish, ...ochiq } = st;
      void _kutish;
      const oldingi = this.korsatilgan[id];
      keyingi[id] = st.aloqa || !oldingi ? { ...ochiq, navbat: [...ochiq.navbat] } : { ...oldingi, aloqa: false };
    }
    this.korsatilgan = keyingi;
  }

  private xabar(hodisa?: SexHodisasi) {
    for (const tinglovchi of [...this.tinglovchilar]) tinglovchi(this.korsatilgan, hodisa);
  }
}
