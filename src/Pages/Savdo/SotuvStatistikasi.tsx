import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDownRight, ArrowUpRight, CircleAlert, CircleCheck, CircleDollarSign, Minus, RotateCw, ShoppingBag, TrendingUp, Wallet } from "lucide-react";
import type { SotuvlarXulosasi } from "@/api/savdoApi";
import type { Sotuv } from "@/types/savdo";
import { useSotuvValyutaStatistikasi } from "./useSotuvValyutaStatistikasi";
import type { sotuvValyutaStatistikasi } from "./sotuvValyutaStatistikasi";
import { toshkentKuni, kunniSurish } from "@/lib/hujjatSanasi";
import { savdoHujjatimi } from "@/lib/boshlangichQarz";
import { sotuvHolati } from "./savdoYordamchilari";
import { useYagonaValyuta } from "@/lib/valyuta";

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

// Kartalar bir xil uslubda (valyutadan qat'i nazar): sutli yuza, aniq chegara, tepada ohang chizig'i, yumshoq rangli ikonka.
const OHANG_STILI: Record<Ohang, { ikonka: string; chiziq: string; porlash: string; matn: string }> = {
  kok: {
    ikonka: "bg-blue-50 text-blue-600 ring-blue-100",
    chiziq: "from-blue-500 via-blue-400 to-sky-300",
    porlash: "bg-blue-200/30",
    matn: "text-blue-700",
  },
  yashil: {
    ikonka: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    chiziq: "from-emerald-500 via-emerald-400 to-teal-300",
    porlash: "bg-emerald-200/30",
    matn: "text-emerald-700",
  },
  binafsha: {
    ikonka: "bg-violet-50 text-violet-600 ring-violet-100",
    chiziq: "from-violet-500 via-violet-400 to-fuchsia-300",
    porlash: "bg-violet-200/30",
    matn: "text-violet-700",
  },
  qizil: {
    ikonka: "bg-rose-50 text-rose-600 ring-rose-100",
    chiziq: "from-rose-500 via-rose-400 to-orange-300",
    porlash: "bg-rose-200/30",
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
  qiymatToliqKenglik = false,
}: {
  ikonka: ReactNode;
  ohang: Ohang;
  sarlavha: string;
  qiymat: ReactNode;
  pastki: ReactNode;
  onClick?: () => void;
  sarlavhaTitle?: string;
  qiymatToliqKenglik?: boolean;
}) {
  const stil = OHANG_STILI[ohang];
  const sinf = "group relative isolate flex h-full min-h-[164px] flex-col overflow-hidden rounded-[20px] border border-gray-200 bg-white p-5 text-left shadow-[0_1px_2px_rgba(15,23,42,.04),0_8px_22px_rgba(15,23,42,.05)] transition duration-300 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-[0_14px_30px_rgba(15,23,42,.09)]";
  const ichki = (
    <>
      <span aria-hidden className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${stil.chiziq}`} />
      <span aria-hidden className={`pointer-events-none absolute -right-10 -top-12 -z-10 h-36 w-36 rounded-full blur-3xl transition duration-500 group-hover:scale-125 ${stil.porlash}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`${qiymatToliqKenglik ? "leading-snug" : "truncate"} text-[13px] font-semibold text-slate-500`}>{sarlavha}</p>
          {!qiymatToliqKenglik && <div className="mt-2.5">{qiymat}</div>}
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 transition duration-300 group-hover:-rotate-6 group-hover:scale-105 ${stil.ikonka}`}>
          {ikonka}
        </span>
      </div>
      {qiymatToliqKenglik && <div className="mt-3">{qiymat}</div>}
      <div className="mt-auto border-t border-dashed border-gray-200 pt-3">{pastki}</div>
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
      {dollar && <span className="text-xl font-bold text-slate-400">$</span>}
      <span className="text-[28px] font-black tracking-tight text-slate-900 tabular-nums">{raqam === null ? "—" : raqam.toLocaleString("uz-UZ", { minimumFractionDigits: dollar ? 2 : 0, maximumFractionDigits: aniqlik })}</span>
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

type PulKartaTuri = "savdo" | "tolov" | "qarz";

function ValyutaKarta({ natija, valyuta, tur, yuklanmoqda, qarzTugmasiBor }: {
  natija: ReturnType<typeof sotuvValyutaStatistikasi>["UZS"];
  valyuta: "UZS" | "USD";
  tur: PulKartaTuri;
  yuklanmoqda: boolean;
  qarzTugmasiBor: boolean;
}) {
  const { t } = useTranslation("savdo_bosh");
  const aniqlik = valyuta === "USD" ? 2 : 0;
  const qiymat = useSanab(natija[tur], 750, aniqlik);
  const birlik = valyuta === "USD" ? "$" : t("savdoSahifasi.statistika.som");
  const hint = (toliq: boolean) => yuklanmoqda ? t("savdoSahifasi.loading") : !toliq ? t("savdoSahifasi.statistika.malumotYetishmaydi") : null;
  const pul = (raqam: number, toliq: boolean) => <Qiymat raqam={yuklanmoqda || !toliq ? null : raqam} birlik={birlik} aniqlik={aniqlik} />;
  if (tur === "savdo") return <StatKarta
      qiymatToliqKenglik
      ikonka={<TrendingUp size={22} />} ohang="yashil"
      sarlavha={t("savdoSahifasi.statistika.valyutaSavdo", { valyuta })}
      qiymat={pul(qiymat, natija.savdoToliq)}
      pastki={<div className="space-y-1 pr-14 text-xs leading-5 text-slate-500">
        <p>{hint(natija.savdoToliq) ?? t("savdoSahifasi.statistika.sotuvSanasi")}</p>
        {!yuklanmoqda && natija.savdoToliq && <p className="font-semibold">{t("savdoSahifasi.statistika.ortachaChek", { summa: `${(natija.savdoSoni ? natija.savdo / natija.savdoSoni : 0).toLocaleString("uz-UZ", { maximumFractionDigits: aniqlik })} ${birlik}` })}</p>}
      </div>}
    />;
  if (tur === "tolov") return <StatKarta
      qiymatToliqKenglik
      ikonka={<Wallet size={22} />} ohang="binafsha"
      sarlavha={t("savdoSahifasi.statistika.valyutaTolov", { valyuta })}
      qiymat={pul(qiymat, natija.tolovToliq)}
      pastki={<div className="space-y-1 pr-14 text-xs leading-5 text-slate-500">
        <p>{hint(natija.tolovToliq) ?? t("savdoSahifasi.statistika.tolovSanasi")}</p>
        {!yuklanmoqda && natija.tolovToliq && <p>{t("savdoSahifasi.statistika.naqdKartaBank")}</p>}
        {!yuklanmoqda && natija.tolovToliq && natija.qaytim > 0 && <p className="font-semibold">{t("savdoSahifasi.statistika.qaytim", { summa: `${raqamMatni(natija.qaytim)} ${birlik}` })}</p>}
      </div>}
    />;
  return <StatKarta
      qiymatToliqKenglik
      ikonka={natija.qarz > 0 ? <CircleAlert size={22} /> : <CircleCheck size={22} />}
      ohang={natija.qarz > 0 ? "qizil" : "yashil"}
      sarlavha={t("savdoSahifasi.statistika.valyutaQarz", { valyuta })}
      qiymat={pul(qiymat, natija.qarzToliq)}
      pastki={<div className={`pr-14 ${qarzTugmasiBor ? "pb-7" : ""}`}>{hint(natija.qarzToliq) ? <p className="text-xs text-slate-500">{hint(natija.qarzToliq)}</p> : <Belgi ohang={natija.qarz > 0 ? "sariq" : "yashil"}>{natija.qarz > 0 ? t("savdoSahifasi.statistika.qarzdorSotuvlar", { count: natija.qarzdorSotuvlar }) : t("savdoSahifasi.statistika.qarzYoq")}</Belgi>}</div>}
    />;
}

// Har bir karta o'z holatini saqlaydi; ikkala yuz ham o'z valyutasidagi tayyor statistikani oladi.
// `yagona` (bir valyutali rejim: Faqat so'm / Faqat dollar) berilsa karta aylanmaydi — faqat shu valyutadagi yuz ko'rsatiladi.
// `asosiy` — rejim valyutasi: eski hujjatlar tufayli karta aylansa ham old yuz shu valyutada ochiladi (ikki valyuta rejimida — dollar).
function AylanadiganValyutaKarta({ tur, natijalar, yuklanmoqda, onQarzniKorsatish, yagona = null, asosiy = null }: {
  tur: PulKartaTuri;
  natijalar: ReturnType<typeof sotuvValyutaStatistikasi>;
  yuklanmoqda: boolean;
  onQarzniKorsatish?: () => void;
  yagona?: "UZS" | "USD" | null;
  asosiy?: "UZS" | "USD" | null;
}) {
  const { t } = useTranslation("savdo_bosh");
  const [orqa, setOrqa] = useState(false);
  const id = useId();
  const oldi = asosiy ?? "USD";
  const orqaValyuta = oldi === "USD" ? "UZS" : "USD";
  const valyuta = yagona ?? (orqa ? orqaValyuta : oldi);
  const keyingiValyuta = orqa ? oldi : orqaValyuta;
  const sarlavhaKaliti = tur === "savdo" ? "valyutaSavdo" : tur === "tolov" ? "valyutaTolov" : "valyutaQarz";
  const aylantirishMatni = t("savdoSahifasi.statistika.kartaniAylantirish", { valyuta: keyingiValyuta });
  const qarzTugmasiBor = tur === "qarz" && Boolean(onQarzniKorsatish);
  const qarzniOchishMumkin = qarzTugmasiBor && !yuklanmoqda && natijalar[valyuta].qarzToliq && natijalar[valyuta].qarz > 0;
  const qarzTugmasi = qarzniOchishMumkin ? <button type="button" onClick={onQarzniKorsatish}
      className="absolute bottom-4 left-5 z-20 max-w-[calc(100%-96px)] cursor-pointer text-left text-xs font-bold text-blue-700 underline decoration-blue-300 underline-offset-4 hover:text-blue-900 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
      {t("savdoSahifasi.statistika.qarzdorlarniKorsatish")}
    </button> : null;

  if (yagona) return <div className="relative min-w-0 transition-transform duration-300 hover:-translate-y-1 motion-reduce:transform-none">
    <div className="grid h-full min-w-0 [&>div]:h-full [&>div]:w-full">
      <ValyutaKarta tur={tur} natija={natijalar[yagona]} valyuta={yagona} yuklanmoqda={yuklanmoqda} qarzTugmasiBor={qarzTugmasiBor} />
    </div>
    {qarzTugmasi}
  </div>;

  return <div className="relative min-w-0 transition-transform duration-300 hover:-translate-y-1 motion-reduce:transform-none" style={{ perspective: "1200px" }}>
    <div className="grid h-full transition-transform duration-700 motion-reduce:transition-none" style={{ transformStyle: "preserve-3d", transform: orqa ? "rotateY(180deg)" : "rotateY(0deg)" }}>
      {([oldi, orqaValyuta] as const).map((code) => <div key={code} id={`${id}-${code}`} aria-hidden={code !== valyuta} inert={code !== valyuta}
        className="pointer-events-none col-start-1 row-start-1 min-w-0 [&>div]:h-full [&>div]:w-full"
        style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: code === orqaValyuta ? "rotateY(180deg)" : "rotateY(0deg)" }}>
        <ValyutaKarta tur={tur} natija={natijalar[code]} valyuta={code} yuklanmoqda={yuklanmoqda} qarzTugmasiBor={qarzTugmasiBor} />
      </div>)}
    </div>
    <button type="button" onClick={() => setOrqa((old) => !old)}
      aria-label={`${t(`savdoSahifasi.statistika.${sarlavhaKaliti}`, { valyuta })}. ${aylantirishMatni}`}
      aria-describedby={`${id}-${valyuta}`} title={aylantirishMatni}
      className="absolute inset-0 z-10 cursor-pointer rounded-[20px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-400 focus-visible:ring-offset-2" />
    <span aria-hidden className="pointer-events-none absolute bottom-3.5 right-3.5 z-20 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 ring-1 ring-gray-200">
      <RotateCw size={12} />{keyingiValyuta === "USD" ? "$" : t("savdoSahifasi.statistika.som")}
    </span>
    {qarzTugmasi}
  </div>;
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
  // Bir valyutali rejimda (Faqat so'm / Faqat dollar) pul kartalari aylanmaydi — faqat rejim valyutasi. Rejim almashguncha yaratilgan
  // eski hujjatlardan boshqa valyutada summa qolgan karta esa avvalgidek ikki tomonli qoladi.
  const yagona = useYagonaValyuta();
  const valyutaNatijalari = { UZS: valyutaNatijasi("UZS"), USD: valyutaNatijasi("USD") };
  const kartaYagonasi = (tur: PulKartaTuri) => yagona && !valyutaNatijalari[yagona === "UZS" ? "USD" : "UZS"][tur] ? yagona : null;
  const kartalarAylanmaydi = (["savdo", "tolov", "qarz"] as const).every((tur) => kartaYagonasi(tur) !== null);


  if (yuklanmoqda && sotuvlar.length === 0) {
    return (
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy>
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="min-h-[164px] animate-pulse rounded-[20px] border border-gray-200 bg-white p-5">
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
    <section className="relative rounded-[28px] border border-gray-200 bg-slate-50 p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)] sm:p-5" aria-label={t("savdoSahifasi.statistika.aria")}>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-4 px-1">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100"><CircleDollarSign size={24} aria-hidden /></span>
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight text-slate-900">{t("savdoSahifasi.statistika.hisobKitob")}</h2>
            {!kartalarAylanmaydi && <p className="mt-0.5 text-xs text-slate-500">{t("savdoSahifasi.statistika.kartaAylanishIzoh")}</p>}
          </div>
        </div>
      </header>
      {/* 4 ustun faqat sahifa yuzasi (@container) yetarli keng bo'lsa; tor joyda (yon panel ochiq 1280px) pul kartalari alohida qatorda. */}
      <div className="grid gap-4 @min-[1100px]:grid-cols-4">
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

        <div className="grid gap-4 md:grid-cols-3 @min-[1100px]:col-span-3">
          {(["savdo", "tolov", "qarz"] as const).map((tur) => <AylanadiganValyutaKarta key={tur} tur={tur}
            natijalar={valyutaNatijalari} yagona={kartaYagonasi(tur)} asosiy={yagona} yuklanmoqda={valyutaStat.yuklanmoqda} onQarzniKorsatish={onQarzniKorsatish} />)}
        </div>
      </div>
    </section>
  );
}
