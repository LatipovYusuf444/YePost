import { PIYODA_YOLLARI } from "./hudud.ts";

// Yuklab olingan odam modellari (Quaternius, CC0) ro'yxati va ularga oid sof hisob-kitoblar: klip nomlari, masshtab,
// o'tirish siljishi, yo'l (polyline) bo'ylab harakat va ishga kelib-ketish jadvali. Bu faylda three/drei yuklovchilari yo'q —
// node testlari to'g'ridan-to'g'ri import qiladi. Yuklash va animatsiya — Odamlar.tsx da.
//
// Fayllardan o'lchangan qiymatlar (GLB JSON + skelet bo'yicha poza hisoblangan):
//  • ishchi, biznesmen, oddiy-erkak, ayol-rasmiy, ayol-oddiy — "CharacterArmature", 62 bo'g'im, 4 ta skinli mesh (bitta skelet),
//    kliplar "CharacterArmature|Idle", "|Idle_Neutral", "|Walk", "|Interact", "|Wave" … O'tirish klipi yo'q. Oldi +Z, oyog'i y = 0.
//  • direktor, xodim-erkak, xodim-ayol — "HumanArmature", 31 bo'g'im, 1 ta mesh, ~4.8 birlik balandlikda (masshtab ≈ 0.38).
//    Kliplar "HumanArmature|Man_Idle", "|Man_Walk", "|Man_Sitting" (ayolda "Female_*"). Sitting klipi 0…0.5 s da o'tiradi
//    (tik turgan holatdan), 0.5…8.33 s — o'tirgan holda sekin qimirlaydi. Yurish kliplari joyida (ildiz siljimaydi).

/** Odam turi (har biri alohida GLB fayl). */
export type OdamTuri = "ishchi" | "biznesmen" | "oddiyErkak" | "ayolRasmiy" | "ayolOddiy" | "direktor" | "xodimErkak" | "xodimAyol";

/** Odamning harakati (klip tanlash uchun). Modelda klip bo'lmasa — mos zaxira harakat o'ynaydi (harakatniHal). */
export type OdamHarakati = "turish" | "yurish" | "ishlash" | "otirish" | "qolSilkitish" | "gaplashish";

/** [x, z] nuqta (metr). */
export type Nuqta = readonly [number, number];

/** O'tirish ma'lumoti (model birligida, masshtabdan oldin). */
type OtirishOlchami = {
  /** O'tirgan pozada son/dumba ostining eng past nuqtasi (y) — o'rindiq yuzasiga tegadigan joy. */
  orindiqOstiY: number;
  /** O'rindiq markazi (z): dumba orqasi va tizza orasining o'rtasi. Model ildizi shu nuqtadan +z da turadi. */
  orindiqMarkaziZ: number;
  /** Klipda o'tirib bo'lingan vaqt (s): shundan keyingi qism takrorlanadi (mayatnik), o'tirish harakati qaytarilmaydi. */
  boshlanish: number;
};

export type OdamModeli = {
  /** public/models/demo3d/odamlar/ ichidagi fayl nomi. */
  fayl: string;
  /** Skelet nomi (klip nomi oldidagi qism). */
  skelet: "CharacterArmature" | "HumanArmature";
  /** Bind pozadagi balandlik (model birligida): POSITION.max (Z yuqori) × tugun masshtabi 100. Test GLB dan tekshiradi. */
  xomBalandlik: number;
  /** "turish" klipining boshidagi balandlik (model birligida, skin qilingan uchlar bo'yicha). */
  turishBalandligi: number;
  /** Kerakli bo'y (metr) — masshtab shundan hisoblanadi. */
  boy: number;
  /** Harakat → klip qisqa nomi (skelet nomisiz). Yo'q harakat — zaxiraga tushadi. */
  kliplar: Partial<Record<OdamHarakati, string>>;
  /** Yurish klipining bir siklida bosib o'tiladigan masofa (model birligida, tayanch oyoq tezligidan o'lchangan). */
  yurishSikli: number;
  otirish?: OtirishOlchami;
};

const TOLIQ_KLIPLAR: Partial<Record<OdamHarakati, string>> = {
  turish: "Idle",
  yurish: "Walk",
  ishlash: "Interact",
  qolSilkitish: "Wave",
  gaplashish: "Idle_Neutral",
};
const erkakKliplari: Partial<Record<OdamHarakati, string>> = { turish: "Man_Idle", yurish: "Man_Walk", otirish: "Man_Sitting" };
const ayolKliplari: Partial<Record<OdamHarakati, string>> = { turish: "Female_Idle", yurish: "Female_Walk", otirish: "Female_Sitting" };
const ERKAK_OTIRISH: OtirishOlchami = { orindiqOstiY: 1.07, orindiqMarkaziZ: -0.5, boshlanish: 0.5 };
const AYOL_OTIRISH: OtirishOlchami = { orindiqOstiY: 1.05, orindiqMarkaziZ: -0.5, boshlanish: 0.5 };

export const ODAM_MODELLARI: Record<OdamTuri, OdamModeli> = {
  ishchi: { fayl: "ishchi.glb", skelet: "CharacterArmature", xomBalandlik: 1.86276, turishBalandligi: 1.822, boy: 1.8, kliplar: TOLIQ_KLIPLAR, yurishSikli: 1.8 },
  biznesmen: { fayl: "biznesmen.glb", skelet: "CharacterArmature", xomBalandlik: 1.85563, turishBalandligi: 1.815, boy: 1.82, kliplar: TOLIQ_KLIPLAR, yurishSikli: 1.8 },
  oddiyErkak: { fayl: "oddiy-erkak.glb", skelet: "CharacterArmature", xomBalandlik: 1.85658, turishBalandligi: 1.814, boy: 1.78, kliplar: TOLIQ_KLIPLAR, yurishSikli: 1.8 },
  ayolRasmiy: { fayl: "ayol-rasmiy.glb", skelet: "CharacterArmature", xomBalandlik: 1.84356, turishBalandligi: 1.8, boy: 1.77, kliplar: TOLIQ_KLIPLAR, yurishSikli: 1.8 },
  ayolOddiy: { fayl: "ayol-oddiy.glb", skelet: "CharacterArmature", xomBalandlik: 1.84347, turishBalandligi: 1.801, boy: 1.76, kliplar: TOLIQ_KLIPLAR, yurishSikli: 1.8 },
  direktor: { fayl: "direktor.glb", skelet: "HumanArmature", xomBalandlik: 4.84461, turishBalandligi: 4.802, boy: 1.82, kliplar: erkakKliplari, yurishSikli: 4.53, otirish: ERKAK_OTIRISH },
  xodimErkak: { fayl: "xodim-erkak.glb", skelet: "HumanArmature", xomBalandlik: 4.84461, turishBalandligi: 4.808, boy: 1.79, kliplar: erkakKliplari, yurishSikli: 4.53, otirish: ERKAK_OTIRISH },
  xodimAyol: { fayl: "xodim-ayol.glb", skelet: "HumanArmature", xomBalandlik: 4.63697, turishBalandligi: 4.597, boy: 1.76, kliplar: ayolKliplari, yurishSikli: 4.53, otirish: AYOL_OTIRISH },
};

export const ODAM_TURLARI = Object.keys(ODAM_MODELLARI) as OdamTuri[];

/** Odatiy stul o'rindig'i balandligi (m). */
export const ORINDIQ_BALANDLIGI = 0.47;

/** Harakat almashganda kliplar orasidagi silliq o'tish (s). */
export const ALMASHISH_VAQTI = 0.35;

/** Vite BASE_URL (node testida import.meta.env yo'q — "/"). */
function asosiyYol(): string {
  const env = (import.meta as { env?: { BASE_URL?: string } }).env;
  const b = env?.BASE_URL ?? "/";
  return b.endsWith("/") ? b : `${b}/`;
}

/** Model fayli manzili: `${BASE_URL}models/demo3d/odamlar/<fayl>`. */
export function odamUrl(tur: OdamTuri): string {
  return `${asosiyYol()}models/demo3d/odamlar/${ODAM_MODELLARI[tur].fayl}`;
}

/** Model masshtabi: turish pozasidagi bo'y `boy` metr bo'ladi. */
export function odamMasshtabi(tur: OdamTuri): number {
  const m = ODAM_MODELLARI[tur];
  return m.boy / m.turishBalandligi;
}

/** Klip yo'q harakat uchun zaxira: o'tirish/ishlash/gaplashish → turish, qo'l silkitish → gaplashish → turish. */
const ZAXIRA: Record<OdamHarakati, OdamHarakati | null> = {
  turish: null,
  yurish: "turish",
  ishlash: "turish",
  otirish: "turish",
  qolSilkitish: "gaplashish",
  gaplashish: "turish",
};

/** Bu modelda haqiqatda o'ynaydigan harakat (klipi bor harakatgacha zaxira zanjiri bo'ylab). */
export function harakatniHal(tur: OdamTuri, harakat: OdamHarakati): OdamHarakati {
  const kliplar = ODAM_MODELLARI[tur].kliplar;
  let h: OdamHarakati | null = harakat;
  while (h && !kliplar[h]) h = ZAXIRA[h];
  return h ?? "turish";
}

/** GLB dagi to'liq klip nomi, masalan "CharacterArmature|Walk" yoki "HumanArmature|Man_Sitting". */
export function klipNomi(tur: OdamTuri, harakat: OdamHarakati): string {
  const m = ODAM_MODELLARI[tur];
  return `${m.skelet}|${m.kliplar[harakatniHal(tur, harakat)]}`;
}

/** O'tirish klipining takrorlanadigan qismi boshlanishi (s); o'tirish yo'q modelda null. */
export function otirishBoshlanishi(tur: OdamTuri): number | null {
  return ODAM_MODELLARI[tur].otirish?.boshlanish ?? null;
}

/**
 * O'tirgan odam uchun model ildizining siljishi (metr, odamning o'z koordinatasida: y — yuqoriga, z — oldinga).
 * Odam p = [x, y0, z] ga qo'yilganda o'rindiq yuzasi (balandligi `orindiq`, poldan) markazi aynan p ustida bo'ladi, yuzi +z ga
 * (burilish bilan aylanadi). O'tirish klipi yo'q modelda null (u tik turadi, siljish yo'q).
 * Klipdagi o'rindiq ~0.40 m (son osti, masshtabdan keyin); 0.47 m da oyoq kafti poldan ~6–7 sm yuqorida qoladi (stol ostida
 * ko'rinmaydi). Past kreslo/divan uchun `orindiq` ni 0.40–0.42 qiling — oyoq polga tegadi.
 */
export function otirishSiljishi(tur: OdamTuri, orindiq = ORINDIQ_BALANDLIGI): { y: number; z: number } | null {
  const o = ODAM_MODELLARI[tur].otirish;
  if (!o) return null;
  const s = odamMasshtabi(tur);
  return { y: orindiq - o.orindiqOstiY * s, z: -o.orindiqMarkaziZ * s };
}

/** Yurish klipining o'z (tabiiy) tezligi, m/s. */
export function tabiiyYurishTezligi(tur: OdamTuri, klipDavomiyligi: number): number {
  return (ODAM_MODELLARI[tur].yurishSikli * odamMasshtabi(tur)) / klipDavomiyligi;
}

/** Yurish klipi tezlik koeffitsienti: oyoq yerga nisbatan sirpanmasin (0.5…2 oralig'ida cheklanadi). */
export function yurishTezligiKoef(tur: OdamTuri, tezlik: number, klipDavomiyligi: number): number {
  const k = tezlik / tabiiyYurishTezligi(tur, klipDavomiyligi);
  return Math.min(2, Math.max(0.5, k));
}

// ---------------------------------------------------------------------------------------------------------------------
// Yo'l (polyline) bo'ylab harakat

/** Yo'nalish burchagi (rotation.y): model oldi (+z) shu vektorga qaraydi. */
export function yonalishBurchagi(dx: number, dz: number): number {
  return Math.atan2(dx, dz);
}

/** a dan b ga eng qisqa burchak farqi (−π…π). */
export function burchakFarqi(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Yo'lning to'liq uzunligi; halqa bo'lsa oxiridan boshiga qaytish ham qo'shiladi. */
export function yolUzunligi(nuqtalar: readonly Nuqta[], halqa = false): number {
  let L = 0;
  const n = nuqtalar.length;
  const oxiri = halqa ? n : n - 1;
  for (let i = 0; i < oxiri; i++) {
    const a = nuqtalar[i];
    const b = nuqtalar[(i + 1) % n];
    L += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return L;
}

/**
 * Yo'lni yurish yo'nalishiga nisbatan o'ng tomonga `d` metr suradi (burchaklarda miter, keskin burilishda cheklanadi).
 * Qarama-qarshi yuruvchilar har biri o'z o'ng tomonidan yursa — bir-biriga urilmaydi.
 */
export function yonSiljitilganYol(nuqtalar: readonly Nuqta[], d: number): Nuqta[] {
  const n = nuqtalar.length;
  if (n < 2 || d === 0) return nuqtalar.map((p) => [p[0], p[1]] as const);
  // Har bo'lak uchun o'ng normal: oldinga (dx, dz) → o'ng (−dz, dx)
  const normallar: ([number, number] | null)[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = nuqtalar[i + 1][0] - nuqtalar[i][0];
    const dz = nuqtalar[i + 1][1] - nuqtalar[i][1];
    const l = Math.hypot(dx, dz);
    normallar.push(l < 1e-9 ? null : [-dz / l, dx / l]);
  }
  // Nol uzunlikli bo'laklar qo'shnisining normalini oladi
  for (let i = 0; i < normallar.length; i++) if (!normallar[i]) normallar[i] = normallar[i - 1] ?? null;
  for (let i = normallar.length - 1; i >= 0; i--) if (!normallar[i]) normallar[i] = normallar[i + 1] ?? null;
  const natija: Nuqta[] = [];
  for (let i = 0; i < n; i++) {
    const oldingi = normallar[Math.max(0, i - 1)] ?? [0, 0];
    const keyingi = normallar[Math.min(normallar.length - 1, i)] ?? [0, 0];
    let mx = oldingi[0] + keyingi[0];
    let mz = oldingi[1] + keyingi[1];
    const ml = Math.hypot(mx, mz);
    if (ml < 1e-6) {
      mx = keyingi[0];
      mz = keyingi[1];
    } else {
      mx /= ml;
      mz /= ml;
    }
    // Miter uzunligi: d / cos(θ/2), keskin burilishda 2·d bilan cheklanadi
    const cos = mx * keyingi[0] + mz * keyingi[1];
    const k = Math.min(2, 1 / Math.max(cos, 0.5));
    natija.push([nuqtalar[i][0] + mx * d * k, nuqtalar[i][1] + mz * d * k]);
  }
  return natija;
}

/** Yo'l bo'ylab harakat rejimi: halqa (oxiridan boshiga), mayatnik (borib-qaytadi), bir yo'nalish (bir marta). */
export type YolRejimi = "halqa" | "mayatnik" | "birYonalish";

/** Bitta bosqich: `a` nuqtada to'xtash, so'ng `a`→`b` yurish. */
export type YolBosqichi = {
  a: Nuqta;
  b: Nuqta;
  /** `a` nuqtaning asl ro'yxatdagi indeksi. */
  nuqta: number;
  /** To'xtash boshlanishi (s, davr ichida). */
  bosh: number;
  /** Yurish boshlanishi (to'xtash tugagani). */
  yurish: number;
  /** Bosqich tugashi (`b` ga yetib keldi). */
  tugash: number;
  /** Yurish yo'nalishi (rotation.y). */
  burchak: number;
  /** To'xtab turganda qaraydigan yo'nalish (kelgan yo'nalishi). */
  toxtashBurchagi: number;
};

export type YolJadvali = { bosqichlar: YolBosqichi[]; davr: number; rejim: YolRejimi };

/**
 * Yo'l jadvali: har nuqtada `toxtash` soniya turadi (son — hammasida, massiv — nuqta indeksi bo'yicha), so'ng keyingisiga
 * `tezlik` m/s bilan yuradi. Mayatnikda nuqtalar 0…n−1…1 tartibida, halqada 0…n−1 va boshiga qaytadi.
 */
export function yolJadvali(
  nuqtalar: readonly Nuqta[],
  { rejim = "mayatnik", tezlik = 1.3, toxtash = 0 }: { rejim?: YolRejimi; tezlik?: number; toxtash?: number | readonly number[] } = {},
): YolJadvali {
  const n = nuqtalar.length;
  if (n === 0) return { bosqichlar: [], davr: 0, rejim };
  const v = Math.max(0.05, tezlik);
  const pauza = (i: number) => Math.max(0, typeof toxtash === "number" ? toxtash : (toxtash[i] ?? 0));
  // Ketma-ketlik (har juftlik — bitta bosqich)
  const tartib: number[] = [];
  for (let i = 0; i < n; i++) tartib.push(i);
  if (rejim === "mayatnik") for (let i = n - 2; i >= 1; i--) tartib.push(i);
  const juftlar: [number, number][] = [];
  if (n === 1) juftlar.push([0, 0]);
  else if (rejim === "birYonalish") for (let i = 0; i < n - 1; i++) juftlar.push([i, i + 1]);
  else for (let k = 0; k < tartib.length; k++) juftlar.push([tartib[k], tartib[(k + 1) % tartib.length]]);

  // Har bo'lak yo'nalishi; nol uzunlikli bo'lak oldingi (boshida — keyingi) yo'nalishni oladi
  const uzunliklar = juftlar.map(([i, j]) => Math.hypot(nuqtalar[j][0] - nuqtalar[i][0], nuqtalar[j][1] - nuqtalar[i][1]));
  const burchaklar: (number | null)[] = juftlar.map(([i, j], k) =>
    uzunliklar[k] > 1e-9 ? yonalishBurchagi(nuqtalar[j][0] - nuqtalar[i][0], nuqtalar[j][1] - nuqtalar[i][1]) : null,
  );
  for (let k = 1; k < burchaklar.length; k++) if (burchaklar[k] === null) burchaklar[k] = burchaklar[k - 1];
  for (let k = burchaklar.length - 2; k >= 0; k--) if (burchaklar[k] === null) burchaklar[k] = burchaklar[k + 1];
  const yon = burchaklar.map((b) => b ?? 0);
  const takrorlanadi = rejim !== "birYonalish";

  const bosqichlar: YolBosqichi[] = [];
  let t = 0;
  juftlar.forEach(([i, j], k) => {
    const bosh = t;
    const yurish = bosh + pauza(i);
    const tugash = yurish + uzunliklar[k] / v;
    // To'xtab turganda kelgan yo'nalishiga qaraydi (takrorlanadigan rejimda birinchisi — oxirgi bo'lakdan kelgan)
    const toxtashBurchagi = k > 0 ? yon[k - 1] : takrorlanadi ? yon[yon.length - 1] : yon[0];
    bosqichlar.push({ a: nuqtalar[i], b: nuqtalar[j], nuqta: i, bosh, yurish, tugash, burchak: yon[k], toxtashBurchagi });
    t = tugash;
  });
  return { bosqichlar, davr: t, rejim };
}

/** Jadval bo'yicha t vaqtdagi holat. */
export type YolHolati = { x: number; z: number; burchak: number; yurmoqda: boolean; nuqta: number; bosqich: number };

/** t (s) vaqtdagi joy. Halqa/mayatnikda t davr bo'yicha aylanadi; bir yo'nalishda 0…davr bilan cheklanadi. */
export function yoldagiHolat(jadval: YolJadvali, t: number): YolHolati {
  const { bosqichlar, davr } = jadval;
  if (!bosqichlar.length) return { x: 0, z: 0, burchak: 0, yurmoqda: false, nuqta: 0, bosqich: 0 };
  let u: number;
  if (jadval.rejim === "birYonalish") u = Math.min(Math.max(t, 0), davr);
  else u = davr > 0 ? ((t % davr) + davr) % davr : 0;
  // Ikkilik qidiruv: bosh <= u bo'lgan oxirgi bosqich
  let lo = 0;
  let hi = bosqichlar.length - 1;
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    if (bosqichlar[m].bosh <= u) lo = m;
    else hi = m - 1;
  }
  const q = bosqichlar[lo];
  if (u < q.yurish) return { x: q.a[0], z: q.a[1], burchak: q.toxtashBurchagi, yurmoqda: false, nuqta: q.nuqta, bosqich: lo };
  const davomiylik = q.tugash - q.yurish;
  const s = davomiylik > 0 ? Math.min(1, (u - q.yurish) / davomiylik) : 1;
  const oxirida = jadval.rejim === "birYonalish" && lo === bosqichlar.length - 1 && s >= 1;
  return {
    x: q.a[0] + (q.b[0] - q.a[0]) * s,
    z: q.a[1] + (q.b[1] - q.a[1]) * s,
    burchak: q.burchak,
    yurmoqda: !oxirida && davomiylik > 0,
    nuqta: q.nuqta,
    bosqich: lo,
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Ishga kelib-ketish (demo): avtobus bekati / tashqi avtoturargohdan KPP turniketi orqali maishiy blokka (ishchilar)
// yoki ofisga (rahbarlar), va teskari — uyga. Hammasi bitta umumiy davr bilan takrorlanadi (deterministik).

/** Kelib-ketish davri (s): har odam shu davrda bir marta o'z yo'lini bosib o'tadi, qolgan vaqtda bino ichida (ko'rinmaydi). */
export const KELIB_KETISH_DAVRI = 180;
/** Piyoda tezligi (m/s): bir xil yo'nalishdagilar bir xil tezlikda — bir-birini quvib o'tmaydi. */
export const KELISH_TEZLIGI = 1.3;
export const KETISH_TEZLIGI = 1.2;
/** Turniketda to'xtash (propusk tekkizadi), s. */
export const TURNIKET_TOXTASHI = 1.6;
/** Yo'lakda o'ng tomondan yurish siljishi (m). */
export const YOLAK_SILJISHI = 0.35;

type Manba = "bekat" | "turargoh";
type Manzil = "maishiy" | "ofis";

export type KelibKetuvchi = {
  id: string;
  tur: OdamTuri;
  yonalish: "kelish" | "ketish";
  /** O'ng tomonga siljitilgan, yuriladigan yo'l. */
  yol: readonly Nuqta[];
  /** Har nuqtadagi to'xtash (turniketda > 0). */
  toxtash: readonly number[];
  /** Turniket nuqtasi indeksi (shu yerda "ishlash" — propusk tekkizish). */
  turniket: number;
  tezlik: number;
  /** Davr ichidagi boshlanish (s). */
  siljish: number;
  /** Animatsiya fazasi (0…1) — yurish qadamlari bir xil bo'lmasin. */
  faza: number;
};

function asosiyYolYasa(manba: Manba, manzil: Manzil): { yol: Nuqta[]; turniket: number } {
  const tashqi = manba === "bekat" ? PIYODA_YOLLARI.bekatdanKpp : PIYODA_YOLLARI.turargohdanKpp;
  const ichki = manzil === "maishiy" ? PIYODA_YOLLARI.kppdanMaishiy : PIYODA_YOLLARI.kppdanOfis;
  const yol: Nuqta[] = [...tashqi, ...ichki].map((p) => [p[0], p[1]] as const);
  return { yol, turniket: tashqi.length };
}

/** Kim, qayerdan, qayerga: kelishda tashqi → bino, ketishda bino → tashqi. Siljishlar (s) test bilan tekshirilgan — to'qnashuv yo'q. */
const KELIB_KETISH_ROYXATI: { id: string; tur: OdamTuri; yonalish: "kelish" | "ketish"; tashqi: Manba; bino: Manzil; siljish: number }[] = [
  { id: "k1", tur: "ishchi", yonalish: "kelish", tashqi: "bekat", bino: "maishiy", siljish: 0 },
  { id: "k2", tur: "oddiyErkak", yonalish: "kelish", tashqi: "turargoh", bino: "maishiy", siljish: 9 },
  { id: "k3", tur: "ayolOddiy", yonalish: "kelish", tashqi: "bekat", bino: "maishiy", siljish: 24 },
  { id: "k4", tur: "biznesmen", yonalish: "kelish", tashqi: "turargoh", bino: "ofis", siljish: 38 },
  { id: "k5", tur: "ishchi", yonalish: "kelish", tashqi: "turargoh", bino: "maishiy", siljish: 55 },
  { id: "k6", tur: "ayolRasmiy", yonalish: "kelish", tashqi: "bekat", bino: "ofis", siljish: 71 },
  { id: "k7", tur: "ishchi", yonalish: "kelish", tashqi: "bekat", bino: "maishiy", siljish: 104 },
  { id: "u1", tur: "ishchi", yonalish: "ketish", tashqi: "bekat", bino: "maishiy", siljish: 14 },
  { id: "u2", tur: "oddiyErkak", yonalish: "ketish", tashqi: "turargoh", bino: "maishiy", siljish: 47 },
  { id: "u3", tur: "ayolOddiy", yonalish: "ketish", tashqi: "turargoh", bino: "maishiy", siljish: 83 },
  { id: "u4", tur: "biznesmen", yonalish: "ketish", tashqi: "turargoh", bino: "ofis", siljish: 118 },
  { id: "u5", tur: "ayolRasmiy", yonalish: "ketish", tashqi: "bekat", bino: "ofis", siljish: 144 },
];

/** Kelib-ketuvchilar (12 kishi): 7 tasi ishga keladi, 5 tasi uyga ketadi. Natija bir xil (deterministik). */
export function kelibKetuvchilar(): KelibKetuvchi[] {
  return KELIB_KETISH_ROYXATI.map(({ id, tur, yonalish, tashqi, bino, siljish }, i) => {
    const asos = asosiyYolYasa(tashqi, bino);
    const xom = yonalish === "kelish" ? asos.yol : [...asos.yol].reverse();
    const turniket = yonalish === "kelish" ? asos.turniket : asos.yol.length - 1 - asos.turniket;
    const yol = yonSiljitilganYol(xom, YOLAK_SILJISHI);
    const toxtash = yol.map((_, k) => (k === turniket ? TURNIKET_TOXTASHI : 0));
    const faza = (i * 0.618034) % 1;
    return { id, tur, yonalish, yol, toxtash, turniket, tezlik: yonalish === "kelish" ? KELISH_TEZLIGI : KETISH_TEZLIGI, siljish, faza };
  });
}

/** Kelib-ketuvchi jadvali (bir yo'nalishli yo'l). */
export function kelibKetuvchiJadvali(k: KelibKetuvchi): YolJadvali {
  return yolJadvali(k.yol, { rejim: "birYonalish", tezlik: k.tezlik, toxtash: k.toxtash });
}

export type KelibKetuvchiHolati = (YolHolati & { korinadi: true; turniketda: boolean }) | { korinadi: false };

/** t (s, sahna soati) vaqtda: yo'lda bo'lsa joyi, aks holda ko'rinmaydi (bino ichida / ketib bo'lgan). */
export function kelibKetuvchiHolati(k: KelibKetuvchi, jadval: YolJadvali, t: number): KelibKetuvchiHolati {
  const u = (((t - k.siljish) % KELIB_KETISH_DAVRI) + KELIB_KETISH_DAVRI) % KELIB_KETISH_DAVRI;
  if (u >= jadval.davr) return { korinadi: false };
  const h = yoldagiHolat(jadval, u);
  return { ...h, korinadi: true, turniketda: !h.yurmoqda && h.nuqta === k.turniket };
}
