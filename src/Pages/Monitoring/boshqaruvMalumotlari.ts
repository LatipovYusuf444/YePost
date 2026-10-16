import { buyurtmalarApi, type Buyurtma, type BuyurtmaHolati } from "@/api/buyurtmalarApi";
import { incomeExpenseReportApi } from "@/api/reportsApi";
import { type Valyuta } from "@/lib/valyuta";
import { hisobotValyutasiniTekshirish } from "@/Pages/HisobotUchot/hisobotValyutasi";
import { mijozNomi, sotuvHolati, sotuvQarzdorlikSummasi, sotuvRaqami } from "@/Pages/Savdo/savdoYordamchilari";
import type { Sotuv } from "@/types/savdo";

// Monitoring → "Boshqaruv xulosasi", "E'tibor talab qiladigan holatlar" va "Moliyaviy ko'rsatkichlar" bloklari uchun
// ma'lumot olish va hisoblash. Hammasi mavjud backend endpointlaridan (/orders, /orders/counts, /reports/income-expense)
// va Monitoring sahifasi allaqachon yuklagan ma'lumotlardan olinadi. Namuna (demo) ma'lumot ishlatilmaydi.

const raqam = (value: unknown) => {
  const natija = Number(value ?? 0);
  return Number.isFinite(natija) ? natija : 0;
};

// Mahalliy kun "YYYY-MM-DD" (UTC emas — Toshkentda kechasi bir kun adashmasligi uchun).
export function kunKaliti(sana: Date) {
  return `${sana.getFullYear()}-${String(sana.getMonth() + 1).padStart(2, "0")}-${String(sana.getDate()).padStart(2, "0")}`;
}

function kundanSana(kun: string) {
  const [yil, oy, kunRaqami] = kun.split("-").map(Number);
  return new Date(yil, oy - 1, kunRaqami);
}

// ---------------------------------------------------------------------------------------------
// Buyurtmalar (yetkazib berish): jami / faol / yakunlangan / kechikayotgan
// ---------------------------------------------------------------------------------------------

export type KechikkanBuyurtma = { raqam: string; mijoz: string; sana: string };

export type BuyurtmaKorsatkichlari = {
  jami: number;
  faol: number;
  yakunlangan: number;
  bekorQilingan: number;
  kechikayotgan: number;
  // Eng uzoq kechikkan buyurtma (ogohlantirish kartasida misol sifatida ko'rsatiladi).
  engKechikkan?: KechikkanBuyurtma;
};

const FAOL_HOLATLAR: BuyurtmaHolati[] = ["NEW", "CONFIRMED", "DELIVERING"];

// Faqat tasdiqlangan va yo'ldagi buyurtmalar kechikishi mumkin (NEW — qoralama).
const KECHIKISH_TEKSHIRILADIGAN: BuyurtmaHolati[] = ["CONFIRMED", "DELIVERING"];

async function buyurtmalarRoyxati(holat: BuyurtmaHolati): Promise<Buyurtma[]> {
  const natija: Buyurtma[] = [];
  // Ko'pi bilan 5 sahifa (500 ta) — kechikkanlarni aniqlash uchun yetarli, so'rovlar soni cheklangan.
  for (let sahifa = 1; sahifa <= 5; sahifa += 1) {
    const javob = await buyurtmalarApi.royxat({ status: holat, page: sahifa, pageSize: 100 });
    natija.push(...javob.items);
    if (sahifa >= javob.totalPages) break;
  }
  return natija;
}

export async function buyurtmaKorsatkichlariniOlish(): Promise<BuyurtmaKorsatkichlari> {
  const [sonlar, ...royxatlar] = await Promise.all([
    buyurtmalarApi.sonlari(),
    ...KECHIKISH_TEKSHIRILADIGAN.map((holat) => buyurtmalarRoyxati(holat)),
  ]);
  const holatSoni = (holat: BuyurtmaHolati) => raqam(sonlar[holat]);

  const bugun = kunKaliti(new Date());
  const kechikkanlar = royxatlar
    .flat()
    .map((buyurtma) => ({ buyurtma, reja: buyurtma.delivery?.scheduledAt }))
    .filter((qator): qator is { buyurtma: Buyurtma; reja: string } => {
      if (!qator.reja) return false;
      const sana = new Date(qator.reja);
      // Rejalashtirilgan kun bugundan oldin bo'lsa kechikkan hisoblanadi.
      return !Number.isNaN(sana.getTime()) && kunKaliti(sana) < bugun;
    })
    .sort((a, b) => new Date(a.reja).getTime() - new Date(b.reja).getTime());

  const eng = kechikkanlar[0];
  return {
    jami: Object.values({
      NEW: holatSoni("NEW"),
      CONFIRMED: holatSoni("CONFIRMED"),
      DELIVERING: holatSoni("DELIVERING"),
      COMPLETED: holatSoni("COMPLETED"),
      CANCELLED: holatSoni("CANCELLED"),
    }).reduce((summa, son) => summa + son, 0),
    faol: FAOL_HOLATLAR.reduce((summa, holat) => summa + holatSoni(holat), 0),
    yakunlangan: holatSoni("COMPLETED"),
    bekorQilingan: holatSoni("CANCELLED"),
    kechikayotgan: kechikkanlar.length,
    engKechikkan: eng
      ? { raqam: sotuvRaqami(eng.buyurtma), mijoz: mijozNomi(eng.buyurtma), sana: eng.reja }
      : undefined,
  };
}

// ---------------------------------------------------------------------------------------------
// Moliya: daromad, xarajat, sof foyda (GET /reports/income-expense)
// ---------------------------------------------------------------------------------------------

type MoliyaBlogi = {
  income?: { saleRevenue?: number | string; otherIncome?: number | string; returns?: number | string; total?: number | string };
  cost?: { costOfGoods?: number | string };
  expenses?: { total?: number | string };
  summary?: {
    revenue?: number | string;
    cost?: number | string;
    expense?: number | string;
    netProfit?: number | string;
    // Hisobot valyutasi (UZS/USD): server so'ralgan `currency`da o'zi hisoblab qaytaradi, summalar qayta o'girilmaydi.
    currency?: string;
  };
};

// `groupBy` bilan so'ralganda server har bir davr uchun alohida blok qaytaradi (series): from/to — davr chegaralari (YYYY-MM-DD).
export type MoliyaJavobi = MoliyaBlogi & { series?: Array<MoliyaBlogi & { from?: string; to?: string }> };

export type MoliyaQiymatlari = {
  daromad: number;
  xarajat: number;
  sofFoyda: number;
  tannarx: number;
  operatsion: number;
  qaytarilgan: number;
};

// Daromad − xarajat = sof foyda. Xarajat = sotilgan tovar tannarxi + operatsion xarajatlar.
// Backend `summary.netProfit` ni bersa, shu qiymat sof foyda sifatida olinadi (sahifadagi boshqa kartalar bilan bir xil bo'lishi uchun).
export function moliyaQiymatlari(javob: MoliyaJavobi | null | undefined): MoliyaQiymatlari | null {
  if (!javob) return null;
  const daromad = javob.income?.total != null
    ? raqam(javob.income.total)
    : raqam(javob.income?.saleRevenue ?? javob.summary?.revenue) + raqam(javob.income?.otherIncome);
  const tannarx = raqam(javob.cost?.costOfGoods ?? javob.summary?.cost);
  const operatsion = raqam(javob.expenses?.total ?? javob.summary?.expense);
  const xarajat = tannarx + operatsion;
  const sofFoyda = javob.summary?.netProfit != null ? raqam(javob.summary.netProfit) : daromad - xarajat;
  return { daromad, xarajat, sofFoyda, tannarx, operatsion, qaytarilgan: raqam(javob.income?.returns) };
}

export type MoliyaGuruhi = "kun" | "hafta" | "oy" | "chorak" | "yil";
export const MOLIYA_GURUHLARI: MoliyaGuruhi[] = ["kun", "hafta", "oy", "chorak", "yil"];

// Bitta grafik uchun ko'pi bilan shuncha davr ko'rsatiladi (server `groupBy` bilan ko'pi bilan 400 davr beradi, lekin grafik o'qilishi kerak).
export const MOLIYA_MAKS_DAVR = 120;
// Server `groupBy` ni bilmasa (eski versiya) har davr alohida so'raladi: shuncha davrdan ko'pida bunday qilinmaydi.
const ESKI_USUL_MAKS_DAVR = 31;

export type MoliyaOraligi = { key: string; dan: string; gacha: string; yil: number; oy: number; chorak: number };

// Tanlangan oraliqni (YYYY-MM-DD, ikkala chet ham kiradi) kun / hafta / oy / chorak / yil bo'laklariga ajratadi.
// Birinchi va oxirgi bo'lak tanlangan oraliqqa kesiladi.
export function moliyaOraliqlari(dan: string, gacha: string, guruh: MoliyaGuruhi): MoliyaOraligi[] {
  const natija: MoliyaOraligi[] = [];
  const oxiri = kundanSana(gacha);
  let joriy = kundanSana(dan);
  if (Number.isNaN(joriy.getTime()) || Number.isNaN(oxiri.getTime()) || joriy > oxiri) return natija;

  while (joriy <= oxiri && natija.length <= 400) {
    let bolakOxiri: Date;
    if (guruh === "kun") bolakOxiri = new Date(joriy);
    else if (guruh === "hafta") bolakOxiri = new Date(joriy.getFullYear(), joriy.getMonth(), joriy.getDate() + (6 - ((joriy.getDay() + 6) % 7)));
    else if (guruh === "oy") bolakOxiri = new Date(joriy.getFullYear(), joriy.getMonth() + 1, 0);
    else if (guruh === "chorak") bolakOxiri = new Date(joriy.getFullYear(), Math.floor(joriy.getMonth() / 3) * 3 + 3, 0);
    else bolakOxiri = new Date(joriy.getFullYear(), 11, 31);

    const kesilgan = bolakOxiri > oxiri ? oxiri : bolakOxiri;
    natija.push({
      key: `${kunKaliti(joriy)}_${kunKaliti(kesilgan)}`,
      dan: kunKaliti(joriy),
      gacha: kunKaliti(kesilgan),
      yil: joriy.getFullYear(),
      oy: joriy.getMonth() + 1,
      chorak: Math.floor(joriy.getMonth() / 3) + 1,
    });
    joriy = new Date(kesilgan.getFullYear(), kesilgan.getMonth(), kesilgan.getDate() + 1);
  }
  return natija;
}

// Oraliq uzunligiga qarab mos guruh: qisqa davr — kunlar, uzun davr — yirikroq bo'laklar.
export function avtoMoliyaGuruhi(dan: string, gacha: string): MoliyaGuruhi {
  const kunlar = Math.round((kundanSana(gacha).getTime() - kundanSana(dan).getTime()) / 86_400_000) + 1;
  if (kunlar <= 14) return "kun";
  if (kunlar <= 120) return "hafta";
  if (kunlar <= 800) return "oy";
  return "chorak";
}

export type MoliyaNuqtasi = {
  oraliq: MoliyaOraligi;
  daromad: number;
  xarajat: number;
  sofFoyda: number;
  // Shu davr uchun hisobot yuklanmadi.
  xato: boolean;
  // Summalar valyutasi: server hisoblagan hisobot valyutasi (kesh shu valyuta bo'yicha tekshiriladi).
  valyuta?: Valyuta;
};

// Oraliqdagi kunlar soni (ikkala chet ham kiradi).
export function moliyaOraligiKunlari(oraliq: Pick<MoliyaOraligi, "dan" | "gacha">) {
  return Math.round((kundanSana(oraliq.gacha).getTime() - kundanSana(oraliq.dan).getTime()) / 86_400_000) + 1;
}

// Guruhdagi o'rtacha davr uzunligi (kun): "o'rtacha foyda" ni bir davrga keltirish uchun.
const GURUH_KUNLARI: Record<MoliyaGuruhi, number> = { kun: 1, hafta: 7, oy: 365.25 / 12, chorak: 365.25 / 4, yil: 365.25 };

/**
 * Bir davrga (kun / hafta / oy / chorak / yil) o'rtacha qiymat: jami qiymat tanlangan oraliqdagi kunlar soniga qarab bo'linadi.
 * Chetdagi to'liq bo'lmagan hafta yoki oy to'liq davr deb sanalmaydi; oraliq bitta davrdan qisqa bo'lsa — jami qiymat.
 */
export function moliyaOrtachaDavrQiymati(jami: number, nuqtalar: MoliyaNuqtasi[], guruh: MoliyaGuruhi) {
  const kunlar = nuqtalar.reduce((summa, nuqta) => summa + moliyaOraligiKunlari(nuqta.oraliq), 0);
  const davrlar = Math.max(kunlar / GURUH_KUNLARI[guruh], 1);
  return kunlar > 0 ? jami / davrlar : 0;
}

const kunBoshiISO = (kun: string) => kundanSana(kun).toISOString();
const kunOxiriISO = (kun: string) => {
  const sana = kundanSana(kun);
  return new Date(sana.getFullYear(), sana.getMonth(), sana.getDate(), 23, 59, 59, 999).toISOString();
};

// Bir vaqtda ko'pi bilan `limit` ta so'rov ketadi; shu bilan backend ortiqcha yuklanmaydi.
export async function moliyaNuqtalariniOlish(
  oraliqlar: MoliyaOraligi[],
  keshi: Map<string, MoliyaNuqtasi>,
  faolmi: () => boolean,
  valyuta: Valyuta,
  limit = 4,
): Promise<MoliyaNuqtasi[]> {
  const natija: MoliyaNuqtasi[] = new Array(oraliqlar.length);
  let navbat = 0;

  async function ishchi() {
    while (faolmi()) {
      const indeks = navbat;
      navbat += 1;
      if (indeks >= oraliqlar.length) return;
      const oraliq = oraliqlar[indeks];
      const eski = keshi.get(oraliq.key);
      if (eski && !eski.xato && eski.valyuta === valyuta) {
        natija[indeks] = eski;
        continue;
      }
      let nuqta: MoliyaNuqtasi;
      try {
        const javob = (await incomeExpenseReportApi.olish({
          dateFrom: kunBoshiISO(oraliq.dan),
          dateTo: kunOxiriISO(oraliq.gacha),
          currency: valyuta,
        })) as MoliyaJavobi;
        const qiymat = moliyaQiymatlari(javob);
        nuqta = {
          oraliq,
          daromad: qiymat?.daromad ?? 0,
          xarajat: qiymat?.xarajat ?? 0,
          sofFoyda: qiymat?.sofFoyda ?? 0,
          xato: false,
          valyuta: hisobotValyutasiniTekshirish(javob.summary?.currency, valyuta),
        };
      } catch {
        nuqta = { oraliq, daromad: 0, xarajat: 0, sofFoyda: 0, xato: true };
      }
      keshi.set(oraliq.key, nuqta);
      natija[indeks] = nuqta;
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, oraliqlar.length) }, () => ishchi()));
  return natija.filter(Boolean);
}

const GURUH_API: Record<MoliyaGuruhi, NonNullable<Parameters<typeof incomeExpenseReportApi.olish>[0]["groupBy"]>> = {
  kun: "DAY",
  hafta: "WEEK",
  oy: "MONTH",
  chorak: "QUARTER",
  yil: "YEAR",
};

function davrdanOraliq(from: string, to: string): MoliyaOraligi {
  const [yil, oy] = from.split("-").map(Number);
  return { key: `${from}_${to}`, dan: from, gacha: to, yil, oy, chorak: Math.floor((oy - 1) / 3) + 1 };
}

// Server `groupBy` parametrini bilmasa (eski versiya) so'rovni rad etadi (400/422): shunda eski usulga o'tiladi.
function groupByQollanmaydi(error: unknown) {
  const holat = (error as { response?: { status?: number } } | null)?.response?.status;
  return holat === 400 || holat === 422;
}

export type MoliyaMalumoti = { nuqtalar: MoliyaNuqtasi[]; valyuta: Valyuta };

// Grafik uchun barcha davrlar BITTA so'rovda olinadi: GET /reports/income-expense?groupBy=...&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD.
// Kunlar kompaniya vaqt mintaqasida hisoblanadi, davrlar (hafta — dushanbadan, chetlari oraliqqa kesilgan) serverdan keladi.
// Server `series` qaytarmasa yoki `groupBy` ni bilmasa — har davr alohida so'raladigan eski usul (ko'pi bilan 31 davr).
// `kutilgan` — so'ralayotgan hisobot valyutasi: server shu valyutada hisoblaydi, javob boshqa valyutada kelsa xato hisoblanadi.
export async function moliyaMalumotiniOlish(
  dan: string,
  gacha: string,
  guruh: MoliyaGuruhi,
  keshi: Map<string, MoliyaNuqtasi>,
  faolmi: () => boolean,
  kutilgan: Valyuta,
): Promise<MoliyaMalumoti> {
  const oraliqlar = moliyaOraliqlari(dan, gacha, guruh);
  const keshdagilar = oraliqlar.map((oraliq) => keshi.get(oraliq.key));
  if (oraliqlar.length > 0 && keshdagilar.every((nuqta) => nuqta && !nuqta.xato && nuqta.valyuta === kutilgan)) {
    return { nuqtalar: keshdagilar as MoliyaNuqtasi[], valyuta: kutilgan };
  }

  const xatoNuqtalari = () => oraliqlar.map((oraliq): MoliyaNuqtasi => ({ oraliq, daromad: 0, xarajat: 0, sofFoyda: 0, xato: true }));
  try {
    const javob = (await incomeExpenseReportApi.olish({ dateFrom: dan, dateTo: gacha, groupBy: GURUH_API[guruh], currency: kutilgan })) as MoliyaJavobi;
    if (!faolmi()) return { nuqtalar: [], valyuta: kutilgan };
    if (Array.isArray(javob.series) && javob.series.length > 0) {
      const valyuta = hisobotValyutasiniTekshirish(javob.summary?.currency, kutilgan);
      const nuqtalar = javob.series.map((davr): MoliyaNuqtasi => {
        const qiymat = moliyaQiymatlari(davr);
        const oraliq = davrdanOraliq(String(davr.from ?? dan), String(davr.to ?? davr.from ?? gacha));
        const nuqta: MoliyaNuqtasi = {
          oraliq,
          daromad: qiymat?.daromad ?? 0,
          xarajat: qiymat?.xarajat ?? 0,
          sofFoyda: qiymat?.sofFoyda ?? 0,
          xato: false,
          valyuta,
        };
        keshi.set(oraliq.key, nuqta);
        return nuqta;
      });
      return { nuqtalar, valyuta };
    }
  } catch (error) {
    if (!groupByQollanmaydi(error)) return { nuqtalar: xatoNuqtalari(), valyuta: kutilgan };
  }

  if (oraliqlar.length > ESKI_USUL_MAKS_DAVR) return { nuqtalar: xatoNuqtalari(), valyuta: kutilgan };
  const nuqtalar = await moliyaNuqtalariniOlish(oraliqlar, keshi, faolmi, kutilgan);
  return { nuqtalar, valyuta: kutilgan };
}

// ---------------------------------------------------------------------------------------------
// E'tibor talab qiladigan holatlar (Alert Center)
// ---------------------------------------------------------------------------------------------

export type OgohlantirishDarajasi = "critical" | "warning" | "attention";

export type Ogohlantirish = {
  id: string;
  daraja: OgohlantirishDarajasi;
  // Tarjima kaliti: boshqaruv.alerts.items.<kalit>.*
  kalit: string;
  params: Record<string, string | number>;
  son: number;
  // Asosiy summa: zarar yoki to'lanmagan qoldiq. Kartada alohida ajratib ko'rsatiladi.
  summa?: number;
  // `summa` hisobot valyutasida (server hisoblagan) bo'lsa shu valyuta; berilmasa — so'mdagi sotuv qoldig'i.
  summaValyutasi?: Valyuta;
  sana?: string;
  // `sana` dan necha kun o'tgani.
  kunOldin?: number;
  // Misol sifatida ko'rsatiladigan bog'liq nom (mijoz, buyurtma raqami va h.k.).
  bogliq?: string;
  havola: string;
};

// Qaysi ma'lumot manbasi muvaffaqiyatli yuklangan: yuklanmagan manba bo'yicha "muammo yo'q" deb aytib bo'lmaydi.
export type ManbaMavjudligi = { moliya: boolean; ombor: boolean; buyurtma: boolean; sotuv: boolean; hujjat: boolean };

export type OgohlantirishManbasi = {
  sotuvlar: Sotuv[];
  buyurtma: BuyurtmaKorsatkichlari | null;
  sofFoyda: number | null;
  omborKamQolgan: number;
  omborManfiy: number;
  qoralamaHujjatlari: number;
  mavjud: ManbaMavjudligi;
  pul: (summa: number) => string;
  // `sofFoyda` (income-expense hisoboti) summalari uchun: server hisoblagan hisobot valyutasi, qayta o'girilmaydi.
  moliyaValyutasi: Valyuta;
  moliyaPul: (summa: number) => string;
  hozir?: Date;
};

export type OgohlantirishNatijasi = {
  ogohlantirishlar: Ogohlantirish[];
  // Tekshirilgan va muammo topilmagan qoidalar (kalitlari): "Tekshiruvdan o'tgan" ro'yxati uchun.
  otganTekshiruvlar: string[];
};

// Qarz shu kundan oshsa "muddati o'tgan" hisoblanadi.
const QARZ_MUDDATI_KUN = 30;

const DARAJA_TARTIBI: Record<OgohlantirishDarajasi, number> = { critical: 0, warning: 1, attention: 2 };

// Hisoblanadigan barcha qoidalar va ularning ma'lumot manbasi.
const TEKSHIRUVLAR: { kalit: string; manba: keyof ManbaMavjudligi }[] = [
  { kalit: "loss", manba: "moliya" },
  { kalit: "negativeStock", manba: "ombor" },
  { kalit: "lateOrders", manba: "buyurtma" },
  { kalit: "overdueDebt", manba: "sotuv" },
  { kalit: "lowStock", manba: "ombor" },
  { kalit: "pendingPayments", manba: "sotuv" },
  { kalit: "draftSales", manba: "sotuv" },
  { kalit: "draftDocs", manba: "hujjat" },
];

function sotuvSanasi(sotuv: Sotuv) {
  return sotuv.confirmedAt || sotuv.date || sotuv.createdAt || "";
}

export function ogohlantirishlarniHisoblash(manba: OgohlantirishManbasi): OgohlantirishNatijasi {
  const hozir = manba.hozir ?? new Date();
  const royxat: Ogohlantirish[] = [];

  const kunlar = (sana?: string) => {
    if (!sana) return undefined;
    const vaqt = new Date(sana).getTime();
    return Number.isNaN(vaqt) ? undefined : Math.max(Math.floor((hozir.getTime() - vaqt) / 86_400_000), 0);
  };

  if (manba.sofFoyda != null && manba.sofFoyda < 0) {
    royxat.push({
      id: "loss",
      daraja: "critical",
      kalit: "loss",
      params: { summa: manba.moliyaPul(Math.abs(manba.sofFoyda)) },
      son: 1,
      summa: Math.abs(manba.sofFoyda),
      summaValyutasi: manba.moliyaValyutasi,
      havola: "/hisobotlar/foyda-xarajat",
    });
  }

  if (manba.omborManfiy > 0) {
    royxat.push({
      id: "negativeStock",
      daraja: "critical",
      kalit: "negativeStock",
      params: { count: manba.omborManfiy },
      son: manba.omborManfiy,
      havola: "/ombor/qoldiq",
    });
  }

  if (manba.buyurtma && manba.buyurtma.kechikayotgan > 0) {
    const eng = manba.buyurtma.engKechikkan;
    royxat.push({
      id: "lateOrders",
      daraja: "warning",
      kalit: "lateOrders",
      params: { count: manba.buyurtma.kechikayotgan },
      son: manba.buyurtma.kechikayotgan,
      sana: eng?.sana,
      kunOldin: kunlar(eng?.sana),
      bogliq: eng ? `№${eng.raqam} · ${eng.mijoz}` : undefined,
      havola: "/savdo?tab=buyurtmalar",
    });
  }

  // Tasdiqlangan sotuvlardagi to'lanmagan qoldiq (backend `debtAmount`): 30 kundan oshgan va yangi qarzlar alohida hisoblanadi.
  const qarzlar = manba.sotuvlar
    .filter((sotuv) => sotuvHolati(sotuv) === "CONFIRMED")
    .map((sotuv) => ({ sotuv, qarz: sotuvQarzdorlikSummasi(sotuv), sana: sotuvSanasi(sotuv) }))
    .filter((qator) => qator.qarz > 0);
  const eski = qarzlar.filter((qator) => (kunlar(qator.sana) ?? 0) > QARZ_MUDDATI_KUN);
  const yangi = qarzlar.filter((qator) => (kunlar(qator.sana) ?? 0) <= QARZ_MUDDATI_KUN);
  const yigindi = (qatorlar: typeof qarzlar) => qatorlar.reduce((summa, qator) => summa + qator.qarz, 0);
  const engKatta = (qatorlar: typeof qarzlar) => [...qatorlar].sort((a, b) => b.qarz - a.qarz)[0];
  const engEski = (qatorlar: typeof qarzlar) =>
    [...qatorlar].sort((a, b) => new Date(a.sana).getTime() - new Date(b.sana).getTime())[0]?.sana;

  if (eski.length > 0) {
    royxat.push({
      id: "overdueDebt",
      daraja: "warning",
      kalit: "overdueDebt",
      params: { count: eski.length, days: QARZ_MUDDATI_KUN, summa: manba.pul(yigindi(eski)) },
      son: eski.length,
      summa: yigindi(eski),
      sana: engEski(eski),
      kunOldin: kunlar(engEski(eski)),
      bogliq: mijozNomi(engKatta(eski).sotuv),
      havola: "/savdo?tab=qarzdorliklar",
    });
  }

  if (manba.omborKamQolgan > 0) {
    royxat.push({
      id: "lowStock",
      daraja: "warning",
      kalit: "lowStock",
      params: { count: manba.omborKamQolgan },
      son: manba.omborKamQolgan,
      havola: "/ombor/qoldiq",
    });
  }

  if (yangi.length > 0) {
    royxat.push({
      id: "pendingPayments",
      daraja: "attention",
      kalit: "pendingPayments",
      params: { count: yangi.length, days: QARZ_MUDDATI_KUN, summa: manba.pul(yigindi(yangi)) },
      son: yangi.length,
      summa: yigindi(yangi),
      sana: engEski(yangi),
      kunOldin: kunlar(engEski(yangi)),
      bogliq: mijozNomi(engKatta(yangi).sotuv),
      havola: "/savdo?tab=qarzdorliklar",
    });
  }

  const qoralamalar = manba.sotuvlar.filter((sotuv) => sotuvHolati(sotuv) === "DRAFT");
  if (qoralamalar.length > 0) {
    const oxirgi = [...qoralamalar].sort((a, b) => new Date(sotuvSanasi(b)).getTime() - new Date(sotuvSanasi(a)).getTime())[0];
    royxat.push({
      id: "draftSales",
      daraja: "attention",
      kalit: "draftSales",
      params: { count: qoralamalar.length },
      son: qoralamalar.length,
      sana: sotuvSanasi(oxirgi) || undefined,
      kunOldin: kunlar(sotuvSanasi(oxirgi) || undefined),
      havola: "/savdo?tab=savatcha",
    });
  }

  if (manba.qoralamaHujjatlari > 0) {
    royxat.push({
      id: "draftDocs",
      daraja: "attention",
      kalit: "draftDocs",
      params: { count: manba.qoralamaHujjatlari },
      son: manba.qoralamaHujjatlari,
      havola: "/ombor/kirimlar",
    });
  }

  const ogohlantirishlar = royxat.sort((a, b) => DARAJA_TARTIBI[a.daraja] - DARAJA_TARTIBI[b.daraja] || b.son - a.son);
  const otganTekshiruvlar = TEKSHIRUVLAR.filter(
    (qoida) => manba.mavjud[qoida.manba] && !ogohlantirishlar.some((item) => item.kalit === qoida.kalit),
  ).map((qoida) => qoida.kalit);

  return { ogohlantirishlar, otganTekshiruvlar };
}
