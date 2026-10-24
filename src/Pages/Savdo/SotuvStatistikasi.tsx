import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDownRight, ArrowUpRight, CircleAlert, CircleCheck, CircleDollarSign, Minus, ShoppingBag, TrendingUp, Wallet } from "lucide-react";
import type { SotuvlarXulosasi } from "@/api/savdoApi";
import type { Sotuv } from "@/types/savdo";
import { useSotuvValyutaStatistikasi } from "./useSotuvValyutaStatistikasi";
import type { sotuvValyutaStatistikasi } from "./sotuvValyutaStatistikasi";
import { toshkentKuni, kunniSurish } from "@/lib/hujjatSanasi";
import { savdoHujjatimi } from "@/lib/boshlangichQarz";
import { sotuvHolati } from "./savdoYordamchilari";

type SotuvStatistikasiProps = {
  sotuvlar: Sotuv[];
  yuklanmoqda: boolean;
  malumotToliq?: boolean;
  sanaDan: string;
  sanaGacha: string;
  onSanaTanlash: (dan: string, gacha: string) => void;
  // Qarzdorlik kartasi bosilganda nima qilinishi; berilmasa karta bosilmaydi.
  onQarzniKorsatish?: () => void;
  // Backenddan kelgan tayyor xulosa (GET /sales/summary). Berilmasa yoki kelmasa, ko'rsatkichlar yuklangan ro'yxatdan hisoblanadi.
  xulosa?: SotuvlarXulosasi | null;
  // Qoralama tushunchasi yo'q sahifalarda (masalan, Ombor → Amalga oshirilganlar) "qoralama" belgisi yashiriladi.
  qoralamaKorsatilsin?: boolean;
  // Sotuv qaysi sanaga tegishli ekanini aniqlaydi (standart: yaratilgan sana).
  sanaOlish?: (sotuv: Sotuv) => string | undefined;
};

type Ohang = "kok" | "yashil" | "binafsha" | "qizil";
type Rejim = "barchasi" | "bugun" | "davr";

const OHANG_STILI: Record<Ohang, { ikonka: string; chegara: string; porlash: string; matn: string }> = {
  kok: {
    ikonka: "from-blue-500 to-blue-700 shadow-blue-200",
    chegara: "border-blue-100 to-blue-50/70",
    porlash: "bg-blue-200/40",
    matn: "text-blue-700",
  },
  yashil: {
    ikonka: "from-emerald-400 to-emerald-600 shadow-emerald-200",
    chegara: "border-emerald-100 to-emerald-50/70",
    porlash: "bg-emerald-200/40",
    matn: "text-emerald-700",
  },
  binafsha: {
    ikonka: "from-violet-500 to-violet-700 shadow-violet-200",
    chegara: "border-violet-100 to-violet-50/70",
    porlash: "bg-violet-200/40",
    matn: "text-violet-700",
  },
  qizil: {
    ikonka: "from-rose-400 to-rose-600 shadow-rose-200",
    chegara: "border-rose-100 to-rose-50/70",
    porlash: "bg-rose-200/40",
    matn: "text-rose-700",
  },
};

// Raqam qiymati o'zgarganda silliq "sanab" ko'rsatadi (harakatni kamaytirish sozlamasi yoqilgan bo'lsa — darrov).
function useSanab(qiymat: number, davomiyligi = 750, aniqlik = 0) {
  const [korsatilgan, setKorsatilgan] = useState(0);
  const oldingi = useRef(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      oldingi.current = qiymat;
      setKorsatilgan(qiymat);
      return;
    }
    const boshlanish = oldingi.current;
    const boshVaqti = performance.now();
    let kadr = 0;
    const qadam = (hozir: number) => {
      const jarayon = Math.min(1, (hozir - boshVaqti) / davomiyligi);
      const silliq = 1 - Math.pow(1 - jarayon, 3);
      const koeffitsient = 10 ** aniqlik;
      setKorsatilgan(Math.round((boshlanish + (qiymat - boshlanish) * silliq) * koeffitsient) / koeffitsient);
      if (jarayon < 1) kadr = requestAnimationFrame(qadam);
      else oldingi.current = qiymat;
    };
    kadr = requestAnimationFrame(qadam);
    return () => cancelAnimationFrame(kadr);
  }, [qiymat, davomiyligi, aniqlik]);

  return korsatilgan;
}

function kunlarOrasida(dan: string, gacha: string) {
  const a = new Date(`${dan}T12:00:00`).getTime();
  const b = new Date(`${gacha}T12:00:00`).getTime();
  return Math.round((b - a) / 86400000);
}

// Sotuvning kuni jadvaldagi sana filtri bilan bir xil bo'lishi kerak (standart: hujjat sanasi, eski yozuvlarda yaratilgan kun).
function standartSana(sotuv: Sotuv) {
  return sotuv.date ?? sotuv.createdAt;
}

function hisoblash(sotuvlar: Sotuv[], dan: string, gacha: string, sanaOlish: (sotuv: Sotuv) => string | undefined) {
  const bugun = toshkentKuni(new Date());
  const rejim: Rejim = !dan && !gacha ? "barchasi" : dan === bugun && gacha === bugun ? "bugun" : "davr";

  // Oldingi davr: tanlangan davr bilan bir xil uzunlikdagi, undan darhol oldingi oraliq (faqat ikkala chegara ham bo'lsa).
  let oldingiDan = "";
  let oldingiGacha = "";
  if (dan && gacha && rejim !== "barchasi") {
    const kunlar = kunlarOrasida(dan, gacha) + 1;
    oldingiGacha = kunniSurish(dan, -1);
    oldingiDan = kunniSurish(dan, -kunlar);
  }

  const oxirgi = gacha || bugun;
  const haftalikKunlar = Array.from({ length: 7 }, (_, index) => kunniSurish(oxirgi, index - 6));
  const kunSoni: Record<string, number> = {};
  let tasdiqlangan = 0;
  let qoralama = 0;
  let oldingiSoni = 0;

  for (const sotuv of sotuvlar) {
    if (!savdoHujjatimi(sotuv)) continue;
    const holat = sotuvHolati(sotuv);
    if (holat === "CANCELLED") continue;
    const kun = toshkentKuni(sanaOlish(sotuv));
    if (!kun) continue;
    kunSoni[kun] = (kunSoni[kun] ?? 0) + 1;

    if (oldingiDan && kun >= oldingiDan && kun <= oldingiGacha) {
      oldingiSoni += 1;
    }

    const davrda = (!dan || kun >= dan) && (!gacha || kun <= gacha);
    if (!davrda) continue;

    if (holat === "CONFIRMED") {
      tasdiqlangan += 1;
    } else {
      qoralama += 1;
    }
  }

  return {
    rejim,
    soni: tasdiqlangan + qoralama,
    tasdiqlangan,
    qoralama,
    taqqoslash: Boolean(oldingiDan),
    oldingiSoni,
    haftalik: haftalikKunlar.map((kun) => ({ kun, soni: kunSoni[kun] ?? 0 })),
  };
}

function raqamMatni(qiymat: number) {
  return qiymat.toLocaleString("uz-UZ");
}

function OzgarishBelgisi({ rejim, taqqoslash, joriy, oldingi }: { rejim: Rejim; taqqoslash: boolean; joriy: number; oldingi: number }) {
  const { t } = useTranslation("savdo_bosh");
  if (!taqqoslash) return <span className="text-xs text-slate-400">{t("savdoSahifasi.statistika.barchaVaqt")}</span>;
  if (oldingi <= 0) {
    return (
      <span className="text-xs text-slate-400">
        {rejim === "bugun" ? t("savdoSahifasi.statistika.kechaYoq") : t("savdoSahifasi.statistika.davrYoq")}
      </span>
    );
  }
  const foiz = Math.round(((joriy - oldingi) / oldingi) * 100);
  const Ikonka = foiz > 0 ? ArrowUpRight : foiz < 0 ? ArrowDownRight : Minus;
  const stil = foiz > 0 ? "bg-emerald-50 text-emerald-700" : foiz < 0 ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500";
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
      <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-black ${stil}`}>
        <Ikonka size={13} />
        {Math.abs(foiz)}%
      </span>
      {rejim === "bugun" ? t("savdoSahifasi.statistika.kechagiga") : t("savdoSahifasi.statistika.oldingiDavrga")}
    </span>
  );
}

function HaftalikChiziq({ haftalik }: { haftalik: Array<{ kun: string; soni: number }> }) {
  const eng = Math.max(1, ...haftalik.map((element) => element.soni));
  return (
    <div className="flex h-10 shrink-0 items-end gap-1" aria-hidden>
      {haftalik.map((element, index) => (
        <span
          key={element.kun}
          title={`${element.kun}: ${element.soni}`}
          className={`w-2 rounded-t-md transition-all duration-700 ${index === haftalik.length - 1 ? "bg-blue-600" : "bg-blue-200"}`}
          style={{ height: `${Math.max(12, Math.round((element.soni / eng) * 100))}%` }}
        />
      ))}
    </div>
  );
}

function StatKarta({
  ikonka,
  ohang,
  sarlavha,
  qiymat,
  pastki,
  onClick,
  sarlavhaTitle,
  dollar = false,
}: {
  ikonka: ReactNode;
  ohang: Ohang;
  sarlavha: string;
  qiymat: ReactNode;
  pastki: ReactNode;
  onClick?: () => void;
  sarlavhaTitle?: string;
  dollar?: boolean;
}) {
  const stil = OHANG_STILI[ohang];
  const sinf = `group relative isolate flex min-h-[148px] flex-col justify-between overflow-hidden rounded-[22px] border bg-gradient-to-br p-5 text-left transition duration-300 hover:-translate-y-1 ${dollar ? "border-[#A8C2EF] from-[#ECF3FF] to-[#D9E6FC] shadow-[0_4px_16px_rgba(37,99,235,.07)] hover:border-blue-400 hover:shadow-[0_10px_24px_rgba(37,99,235,.12)]" : `from-white shadow-[0_5px_18px_rgba(15,23,42,.05)] hover:shadow-[0_16px_34px_rgba(15,23,42,.10)] ${stil.chegara}`}`;
  const ichki = (
    <>
      <span className={`pointer-events-none absolute -right-8 -top-10 -z-10 h-32 w-32 rounded-full blur-2xl transition duration-500 group-hover:scale-150 ${dollar ? "bg-blue-300/20" : stil.porlash}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`truncate text-sm font-bold ${dollar ? "text-blue-950/80" : "text-slate-500"}`}>{sarlavha}</p>
          <div className="mt-2">{qiymat}</div>
        </div>
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition duration-300 group-hover:-rotate-6 group-hover:scale-105 ${dollar ? "border border-blue-300/60 bg-blue-200/70 text-blue-700" : `bg-gradient-to-br text-white shadow-md ${stil.ikonka}`}`}
        >
          {ikonka}
        </span>
      </div>
      <div className="mt-4">{pastki}</div>
    </>
  );

  return onClick ? (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      title={sarlavhaTitle}
      className={`${sinf} cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200`}
    >
      {ichki}
    </div>
  ) : (
    <div className={sinf}>{ichki}</div>
  );
}

function Qiymat({ raqam, birlik, aniqlik = 0 }: { raqam: number | null; birlik?: string; aniqlik?: number }) {
  const dollar = birlik === "$";
  return (
    <p className="flex flex-wrap items-baseline gap-x-1.5 leading-none">
      {dollar && <span className="text-2xl font-semibold text-blue-600">$</span>}
      <span className="text-3xl font-black tracking-tight text-slate-900 tabular-nums">{raqam === null ? "—" : raqam.toLocaleString("uz-UZ", { minimumFractionDigits: dollar ? 2 : 0, maximumFractionDigits: aniqlik })}</span>
      {birlik && !dollar && <span className="text-sm font-bold text-slate-400">{birlik}</span>}
    </p>
  );
}

function Belgi({ ohang, children }: { ohang: "yashil" | "sariq" | "kulrang"; children: ReactNode }) {
  const stil =
    ohang === "yashil"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : ohang === "sariq"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : "bg-slate-50 text-slate-500 ring-slate-100";
  return <span className={`inline-flex rounded-lg px-2 py-1 text-xs font-bold ring-1 ${stil}`}>{children}</span>;
}

function ValyutaKartalari({ natija, valyuta, yuklanmoqda, onQarzniKorsatish }: {
  natija: ReturnType<typeof sotuvValyutaStatistikasi>["UZS"];
  valyuta: "UZS" | "USD";
  yuklanmoqda: boolean;
  onQarzniKorsatish?: () => void;
}) {
  const { t } = useTranslation("savdo_bosh");
  const aniqlik = valyuta === "USD" ? 2 : 0;
  const summa = useSanab(natija.savdo, 750, aniqlik);
  const tolov = useSanab(natija.tolov, 750, aniqlik);
  const qarz = useSanab(natija.qarz, 750, aniqlik);
  const birlik = valyuta === "USD" ? "$" : t("savdoSahifasi.statistika.som");
  const hint = (toliq: boolean) => yuklanmoqda ? t("savdoSahifasi.loading") : !toliq ? t("savdoSahifasi.statistika.malumotYetishmaydi") : null;
  const pul = (raqam: number, toliq: boolean) => <Qiymat raqam={yuklanmoqda || !toliq ? null : raqam} birlik={birlik} aniqlik={aniqlik} />;
  return <>
    <StatKarta
      dollar={valyuta === "USD"}
      ikonka={<TrendingUp size={22} />} ohang="yashil"
      sarlavha={t("savdoSahifasi.statistika.valyutaSavdo", { valyuta })}
      qiymat={pul(summa, natija.savdoToliq)}
      pastki={<div className="space-y-1.5 text-xs text-slate-500">
        <p>{hint(natija.savdoToliq) ?? t("savdoSahifasi.statistika.sotuvSanasi")}</p>
        {!yuklanmoqda && natija.savdoToliq && <p className="font-semibold">{t("savdoSahifasi.statistika.ortachaChek", { summa: `${(natija.savdoSoni ? natija.savdo / natija.savdoSoni : 0).toLocaleString("uz-UZ", { maximumFractionDigits: aniqlik })} ${birlik}` })}</p>}
      </div>}
    />
    <StatKarta
      dollar={valyuta === "USD"}
      ikonka={<Wallet size={22} />} ohang="binafsha"
      sarlavha={t("savdoSahifasi.statistika.valyutaTolov", { valyuta })}
      qiymat={pul(tolov, natija.tolovToliq)}
      pastki={<div className="space-y-1.5 text-xs text-slate-500">
        <p>{hint(natija.tolovToliq) ?? t("savdoSahifasi.statistika.tolovSanasi")}</p>
        {!yuklanmoqda && natija.tolovToliq && <p>{t("savdoSahifasi.statistika.naqdKartaBank")}</p>}
        {!yuklanmoqda && natija.tolovToliq && natija.qaytim > 0 && <p className="font-semibold">{t("savdoSahifasi.statistika.qaytim", { summa: `${raqamMatni(natija.qaytim)} ${birlik}` })}</p>}
      </div>}
    />
    <StatKarta
      dollar={valyuta === "USD"}
      ikonka={natija.qarz > 0 ? <CircleAlert size={22} /> : <CircleCheck size={22} />}
      ohang={natija.qarz > 0 ? "qizil" : "yashil"}
      sarlavha={t("savdoSahifasi.statistika.valyutaQarz", { valyuta })}
      qiymat={pul(qarz, natija.qarzToliq)}
      onClick={!yuklanmoqda && natija.qarzToliq && natija.qarz > 0 ? onQarzniKorsatish : undefined}
      pastki={hint(natija.qarzToliq) ? <p className="text-xs text-slate-500">{hint(natija.qarzToliq)}</p> : <Belgi ohang={natija.qarz > 0 ? "sariq" : "yashil"}>{natija.qarz > 0 ? t("savdoSahifasi.statistika.qarzdorSotuvlar", { count: natija.qarzdorSotuvlar }) : t("savdoSahifasi.statistika.qarzYoq")}</Belgi>}
    />
  </>;
}

// Savdo sahifasi tepasidagi ko'rsatkichlar: sana filtriga qarab — barcha vaqt, bugun yoki tanlangan davr bo'yicha.
export default function SotuvStatistikasi({
  sotuvlar,
  yuklanmoqda,
  malumotToliq = true,
  sanaDan,
  sanaGacha,
  onSanaTanlash,
  onQarzniKorsatish,
  qoralamaKorsatilsin = true,
  sanaOlish = standartSana,
  xulosa = null,
}: SotuvStatistikasiProps) {
  const { t } = useTranslation("savdo_bosh");
  const mahalliy = useMemo(() => hisoblash(sotuvlar, sanaDan, sanaGacha, sanaOlish), [sotuvlar, sanaDan, sanaGacha, sanaOlish]);
  // Xulosadan faqat sonlar olinadi: valyutasiz pul maydonlari UZS/USD kartalariga tushmaydi.
  const natija = useMemo(() => {
    if (!xulosa) return mahalliy;
    const joriy = xulosa.current;
    const oldingi = xulosa.previous;
    return {
      ...mahalliy,
      soni: joriy.confirmedCount + joriy.draftCount,
      tasdiqlangan: joriy.confirmedCount,
      qoralama: joriy.draftCount,
      taqqoslash: mahalliy.rejim !== "barchasi" && oldingi !== null,
      oldingiSoni: oldingi ? oldingi.confirmedCount + oldingi.draftCount : 0,
      haftalik: xulosa.daily.length > 0 ? xulosa.daily.map((element) => ({ kun: element.date, soni: element.count })) : mahalliy.haftalik,
    };
  }, [mahalliy, xulosa]);
  const valyutaStat = useSotuvValyutaStatistikasi(sotuvlar, yuklanmoqda, sanaDan, sanaGacha, sanaOlish);
  const royxatToliq = malumotToliq && (!xulosa || mahalliy.tasdiqlangan >= xulosa.current.confirmedCount);
  const valyutaNatijasi = (valyuta: "UZS" | "USD") => royxatToliq ? valyutaStat.natija[valyuta] : {
    ...valyutaStat.natija[valyuta], savdoToliq: false, tolovToliq: false, qarzToliq: false,
  };
  const soni = useSanab(natija.soni);


  if (yuklanmoqda && sotuvlar.length === 0) {
    return (
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy>
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="min-h-[148px] animate-pulse rounded-[22px] border border-slate-100 bg-white p-5">
            <div className="h-3 w-24 rounded-full bg-slate-100" />
            <div className="mt-4 h-8 w-32 rounded-lg bg-slate-100" />
            <div className="mt-8 h-2 w-full rounded-full bg-slate-100" />
          </div>
        ))}
      </section>
    );
  }

  const bugun = toshkentKuni(new Date());
  const bugunTanlangan = natija.rejim === "bugun";

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={t("savdoSahifasi.statistika.aria")}>
      <StatKarta
        ikonka={<ShoppingBag size={22} />}
        ohang="kok"
        sarlavha={t(`savdoSahifasi.statistika.sarlavhalar.${natija.rejim}.sotuvlar`)}
        qiymat={<Qiymat raqam={soni} />}
        onClick={() => (bugunTanlangan ? onSanaTanlash("", "") : onSanaTanlash(bugun, bugun))}
        sarlavhaTitle={bugunTanlangan ? t("savdoSahifasi.statistika.barchasiniKorsatish") : t("savdoSahifasi.statistika.bugunniKorsatish")}
        pastki={
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                <Belgi ohang="yashil">{t("savdoSahifasi.statistika.tasdiqlangan", { count: natija.tasdiqlangan })}</Belgi>
                {qoralamaKorsatilsin && <Belgi ohang="sariq">{t("savdoSahifasi.statistika.qoralama", { count: natija.qoralama })}</Belgi>}
              </div>
              <OzgarishBelgisi rejim={natija.rejim} taqqoslash={natija.taqqoslash} joriy={natija.soni} oldingi={natija.oldingiSoni} />
            </div>
            <HaftalikChiziq haftalik={natija.haftalik} />
          </div>
        }
      />

      <ValyutaKartalari natija={valyutaNatijasi("UZS")} valyuta="UZS" yuklanmoqda={valyutaStat.yuklanmoqda} onQarzniKorsatish={onQarzniKorsatish} />
      <section aria-label={t("savdoSahifasi.statistika.dollarBlok")} className="rounded-[28px] border border-[#9DBBEF] bg-gradient-to-br from-[#D4E2FB] via-[#DFE9FC] to-[#C9DAF7] p-4 shadow-[0_6px_24px_rgba(37,99,235,.09)] sm:col-span-2 sm:p-5 xl:col-span-4">
        <header className="mb-4 flex items-center justify-between gap-3 px-1">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-white text-blue-600 shadow-sm"><CircleDollarSign size={25} aria-hidden /></span>
            <div className="min-w-0">
              <h2 className="text-base font-bold tracking-tight text-slate-900">{t("savdoSahifasi.statistika.dollarBlok")}</h2>
              <p className="mt-0.5 text-xs text-slate-500">{t("savdoSahifasi.statistika.dollarBlokIzoh")}</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-blue-500 bg-blue-600 px-3 py-1.5 text-xs font-black tracking-[0.16em] text-white shadow-sm">USD</span>
        </header>
        <div className="grid gap-3 md:grid-cols-3">
          <ValyutaKartalari natija={valyutaNatijasi("USD")} valyuta="USD" yuklanmoqda={valyutaStat.yuklanmoqda} onQarzniKorsatish={onQarzniKorsatish} />
        </div>
      </section>
    </section>
  );
}
