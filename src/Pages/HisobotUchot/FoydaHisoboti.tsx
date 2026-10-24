import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Banknote, Calculator, CircleDollarSign, Download, Package, ReceiptText, Search, TrendingUp, TriangleAlert, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import TablePagination from "@/Components/common/TablePagination";
import Dropdown from "./Dropdown";
import MuddatTanlov from "./MuddatTanlov";
import { useHisobotRealData } from "./HisobotRealData";
import { productProfitReportApi } from "@/api/reportsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { son } from "./yordamchilar";
import { bugungiToshkentKuni, kunniSurish } from "@/lib/hujjatSanasi";
import { korsatiladiganValyuta, type Valyuta } from "@/lib/valyuta";
import {
  engKopFoyda,
  foydaHisobotiniMoslash,
  foydaJami,
  foydaJamiIkkiValyuta,
  foydaAslJami,
  foydaniSaralash,
  panelRoyxati,
  qatorJufti,
  valyutaJufti,
  zararliQatorlar,
  type FoydaGuruhi,
  type FoydaQatori as Qator,
  type FoydaSaralashKaliti,
  type FoydaSummalari,
  type FoydaTaklifi,
  type FoydaXulosasi,
} from "./foydaHisobotiModeli";
import { hisobotPulMatni } from "./hisobotValyutasi";

import YuklanmoqdaHolati from "./YuklanmoqdaHolati";

// Sotuv qatori narx turi bo'yicha filtr (GET /reports/product-profit?priceType=...).
const NARX_TURI_VARIANTLARI = [
  { value: "", nomi: "Barchasi" },
  { value: "RETAIL", nomi: "Chakana" },
  { value: "WHOLESALE", nomi: "Ulgurji" },
  { value: "COST", nomi: "Tannarx" },
  { value: "UNKNOWN", nomi: "Noma’lum" },
];
type NarxTuriFiltri = "" | "RETAIL" | "WHOLESALE" | "COST" | "UNKNOWN";

const GURUHLAR: Array<{ id: FoydaGuruhi; nom: string; qidiruv: string }> = [
  { id: "PRODUCT", nom: "Mahsulotlar bo‘yicha", qidiruv: "Mahsulot bo‘yicha qidiruv" },
  { id: "CUSTOMER", nom: "Mijozlar bo‘yicha", qidiruv: "Mijoz bo‘yicha qidiruv" },
];

type Saralash = { kalit: FoydaSaralashKaliti; kamayish: boolean };
type Model = { qatorlar: Qator[]; xulosa: FoydaXulosasi | null; eng: FoydaTaklifi[] | null; zarar: FoydaTaklifi[] | null; aslValyutada: boolean };
const BOSH_MODEL: Model = { qatorlar: [], xulosa: null, eng: null, zarar: null, aslValyutada: false };

function hisobotParametrlari(p: { guruh: FoydaGuruhi; dateFrom: string; dateTo: string; categoryId: string; narxTuri: NarxTuriFiltri; valyuta: Valyuta; qidiruv: string }) {
  return {
    groupBy: p.guruh,
    dateFrom: p.dateFrom || undefined,
    dateTo: p.dateTo || undefined,
    categoryId: p.categoryId || undefined,
    priceType: p.narxTuri || undefined,
    currency: p.valyuta,
    // Backend qidiruvi tovar nomi bo'yicha; mijozlar kesimida mijoz nomi bo'yicha qidiruv jadvalning o'zida.
    search: p.guruh === "PRODUCT" && p.qidiruv ? p.qidiruv : undefined,
  };
}

export default function FoydaHisoboti() {
  const [tanlanganValyuta, setTanlanganValyuta] = useState<Valyuta>(korsatiladiganValyuta);
  const { kategoriyalar } = useHisobotRealData();
  const [dateFrom, setDateFrom] = useState(() => kunniSurish(bugungiToshkentKuni(), -30));
  const [dateTo, setDateTo] = useState(bugungiToshkentKuni);
  const [categoryId, setCategoryId] = useState("");
  const [narxTuri, setNarxTuri] = useState<NarxTuriFiltri>("");
  const [guruh, setGuruh] = useState<FoydaGuruhi>("PRODUCT");
  const [qidiruv, setQidiruv] = useState("");
  const [serverQidiruv, setServerQidiruv] = useState("");
  const [saralash, setSaralash] = useState<Saralash>({ kalit: "foyda", kamayish: true });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [model, setModel] = useState<Model>(BOSH_MODEL);
  const [hisobotValyutasi, setHisobotValyutasi] = useState<Valyuta>(tanlanganValyuta);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [exportYuklanmoqda, setExportYuklanmoqda] = useState(false);
  const [xato, setXato] = useState("");
  const qatorlar = model.qatorlar;

  // Mahsulotlar kesimida qidiruv backendga ketadi (jami ham shunga mos hisoblanadi): har harfda emas, yozib bo'lgach.
  useEffect(() => {
    const kutish = setTimeout(() => setServerQidiruv(qidiruv.trim()), 350);
    return () => clearTimeout(kutish);
  }, [qidiruv]);

  useEffect(() => {
    let active = true;
    setYuklanmoqda(true);
    setXato("");
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setModel(BOSH_MODEL);
      setXato("Boshlanish sanasi tugash sanasidan keyin bo'lmasin.");
      setYuklanmoqda(false);
      return;
    }
    productProfitReportApi.barchasi(hisobotParametrlari({ guruh, dateFrom, dateTo, categoryId, narxTuri, valyuta: tanlanganValyuta, qidiruv: serverQidiruv }))
      .then((value) => {
        if (!active) return;
        const natija = foydaHisobotiniMoslash(value, tanlanganValyuta, guruh);
        setHisobotValyutasi(natija.valyuta);
        setModel({ qatorlar: natija.qatorlar, xulosa: natija.xulosa, eng: natija.eng, zarar: natija.zarar, aslValyutada: natija.aslValyutada });
      })
      .catch((error) => { if (active) { setModel(BOSH_MODEL); setXato(getApiErrorMessage(error)); } })
      .finally(() => { if (active) setYuklanmoqda(false); });
    return () => { active = false; };
  }, [categoryId, dateFrom, dateTo, guruh, narxTuri, tanlanganValyuta, serverQidiruv]);

  const mijozQidiruvi = guruh === "CUSTOMER" ? qidiruv.trim().toLowerCase() : "";
  const mijozgaMos = useMemo(
    () => (mijozQidiruvi ? qatorlar.filter((item) => item.nomi.toLowerCase().includes(mijozQidiruvi)) : qatorlar),
    [qatorlar, mijozQidiruvi]
  );
  const korinadigan = useMemo(() => model.aslValyutada
    ? mijozgaMos.filter((item) => Boolean(item.sotuvValyutalari?.[hisobotValyutasi])) : mijozgaMos,
  [mijozgaMos, model.aslValyutada, hisobotValyutasi]);
  const aslJamilar = useMemo(() => !mijozQidiruvi && model.xulosa?.bySaleCurrency
    ? model.xulosa.bySaleCurrency
    : { UZS: foydaAslJami(mijozgaMos, "UZS"), USD: foydaAslJami(mijozgaMos, "USD") },
  [mijozgaMos, mijozQidiruvi, model.xulosa]);
  const tannarxYetishmaganSoni = (!mijozQidiruvi ? model.xulosa?.tannarxYetishmaganSoni : undefined) ?? mijozgaMos.filter((item) => item.tannarxKiritilmagan).length;

  const tartiblangan = useMemo(() => foydaniSaralash(korinadigan, saralash.kalit, saralash.kamayish), [korinadigan, saralash]);

  // Jami: backend `summary` butun filtr bo'yicha; mijoz nomi bo'yicha qidirilganda faqat ko'rinayotgan qatorlar yig'iladi.
  const jami = useMemo(() => {
    const qatorJami = foydaJami(korinadigan);
    const ikki = foydaJamiIkkiValyuta(korinadigan);
    const xulosa = mijozQidiruvi ? null : model.xulosa;
    return {
      sotilgan: xulosa?.sotilgan ?? qatorJami.sotilgan,
      uzs: xulosa?.uzs ?? ikki.uzs,
      usd: xulosa ? xulosa.usd : ikki.usd,
      // Dollar/so'm bo'lmagan eski javobda hisobot valyutasidagi jami.
      asosiy: { tushum: qatorJami.tushum, tannarx: qatorJami.tannarx, foyda: qatorJami.foyda },
      rentabellik: xulosa?.rentabellik ?? qatorJami.rentabellik,
      cheklar: xulosa?.cheklar ?? null,
      ortachaKurs: xulosa?.ortachaKurs ?? null,
    };
  }, [korinadigan, model.xulosa, mijozQidiruvi]);

  const eng = useMemo(() => panelRoyxati(mijozQidiruvi ? null : model.eng, engKopFoyda(korinadigan)).filter((item) => item.foydaUzs > 0 || item.foydaUsd !== null && item.foydaUsd > 0).slice(0, 5), [korinadigan, model.eng, mijozQidiruvi]);
  const zararli = useMemo(() => panelRoyxati(mijozQidiruvi ? null : model.zarar, zararliQatorlar(korinadigan)), [korinadigan, model.zarar, mijozQidiruvi]);

  useEffect(() => setPage(1), [mijozQidiruvi, saralash, model, pageSize]);
  const sahifa = tartiblangan.slice((page - 1) * pageSize, page * pageSize);
  const joriyGuruh = GURUHLAR.find((item) => item.id === guruh) ?? GURUHLAR[0];

  const pul = (summa: number, valyuta: Valyuta = hisobotValyutasi) => hisobotPulMatni(summa, valyuta);
  // Jami summa: so'm va dollar bo'lsa tanlangan valyuta asosiy; yo'q bo'lsa hisobot valyutasidagi qiymat.
  const jamiJufti = (kalit: keyof FoydaSummalari) => model.aslValyutada
    ? { asosiy: { summa: aslJamilar[hisobotValyutasi][kalit], valyuta: hisobotValyutasi }, qoshimcha: null }
    : jami.uzs ? valyutaJufti(jami.uzs[kalit], jami.usd?.[kalit] ?? null, hisobotValyutasi) : { asosiy: { summa: jami.asosiy[kalit], valyuta: hisobotValyutasi }, qoshimcha: null };
  const panelJufti = (item: FoydaTaklifi) => model.aslValyutada
    ? { asosiy: { summa: hisobotValyutasi === "USD" ? item.foydaUsd ?? 0 : item.foydaUzs, valyuta: hisobotValyutasi }, qoshimcha: null }
    : valyutaJufti(item.foydaUzs, item.foydaUsd, hisobotValyutasi);

  function saralashniOzgartirish(kalit: FoydaSaralashKaliti) {
    setSaralash((joriy) => (joriy.kalit === kalit ? { kalit, kamayish: !joriy.kamayish } : { kalit, kamayish: kalit !== "nomi" }));
  }

  async function eksport() {
    if (exportYuklanmoqda) return;
    setExportYuklanmoqda(true);
    setXato("");
    try {
      await productProfitReportApi.export(hisobotParametrlari({ guruh, dateFrom, dateTo, categoryId, narxTuri, valyuta: tanlanganValyuta, qidiruv: serverQidiruv }), "excel");
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setExportYuklanmoqda(false);
    }
  }

  const ustunlar: Array<{ kalit: FoydaSaralashKaliti; nom: string; chap?: boolean }> = [
    { kalit: "nomi", nom: guruh === "CUSTOMER" ? "Mijoz" : "Mahsulot", chap: true },
    { kalit: "sotilgan", nom: "Miqdor" },
    { kalit: "tushum", nom: "Tushum" },
    { kalit: "tannarx", nom: "Tannarx" },
    { kalit: "foyda", nom: "Yalpi foyda" },
    { kalit: "rentabellik", nom: "Rentabellik" },
  ];
  const foydaRangi = (zarar: boolean) => (zarar ? "text-red-500" : "text-orange-600");
  const tushumJufti = jamiJufti("tushum");
  const tannarxJufti = jamiJufti("tannarx");
  const foydaJuftiJami = jamiJufti("foyda");
  const jamiZarar = foydaJuftiJami.asosiy.summa < 0;
  const qoshimcha = (juft: ReturnType<typeof jamiJufti>) => (juft.qoshimcha ? `≈ ${pul(juft.qoshimcha.summa, juft.qoshimcha.valyuta)}` : "");
  const guruhSozi = guruh === "CUSTOMER" ? "mijoz" : "mahsulot";

  return <div className="space-y-5">
    <style>{`
      @keyframes profit-card-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes profit-value-in { from { opacity: .35; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes profit-bar-in { from { transform: scaleX(0); } to { transform: scaleX(1); } }
      .profit-currency-card { animation: profit-card-in .5s ease-out both; }
      .profit-currency-value { animation: profit-value-in .45s ease-out both; }
      .profit-currency-bar { transform-origin: left; animation: profit-bar-in .85s cubic-bezier(.22,1,.36,1) both; }
      @media (prefers-reduced-motion: reduce) {
        .profit-currency-card, .profit-currency-value, .profit-currency-bar { animation: none; }
      }
    `}</style>
    <section className="rounded-3xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MuddatTanlov timeZone="Asia/Tashkent" dateFrom={dateFrom} dateTo={dateTo} onChange={(from, to) => { setDateFrom(from); setDateTo(to); }} />
        <Dropdown label="Mahsulot kategoriyasi" value={categoryId} options={[{ value: "", nomi: "Barchasi" }, ...kategoriyalar.map((item) => ({ value: item.id, nomi: item.nomi }))]} onChange={setCategoryId} />
        <Dropdown label="Narx turi" value={narxTuri} options={NARX_TURI_VARIANTLARI} onChange={(value) => setNarxTuri(value as NarxTuriFiltri)} />
        <Dropdown label="Jadval va ro'yxatlar valyutasi" value={tanlanganValyuta} options={[{value:"UZS",nomi:"So'm (UZS)"},{value:"USD",nomi:"Dollar (USD)"}]} onChange={(value) => setTanlanganValyuta(value as Valyuta)} />
        <label className="block text-xs font-bold text-gray-700">
          {guruh === "CUSTOMER" ? "Mijoz" : "Mahsulot"}
          <span className="relative mt-1.5 block">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={qidiruv} onChange={(event) => setQidiruv(event.target.value)} placeholder={joriyGuruh.qidiruv} className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-gray-700 outline-none transition placeholder:font-medium placeholder:text-slate-400 hover:border-orange-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-100" />
          </span>
        </label>
      </div>
    </section>

    {xato && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}

    {model.aslValyutada ? <section aria-label="Sotuv valyutasi bo'yicha jami" className="grid gap-5 xl:grid-cols-2">
      {(["UZS", "USD"] as const).map((currency) => {
        const som = currency === "UZS";
        const qiymat = aslJamilar[currency];
        const zarar = qiymat.foyda < 0;
        const Ikonka = som ? Wallet : CircleDollarSign;
        return <article key={currency} aria-busy={yuklanmoqda} className={`profit-currency-card group relative isolate min-w-0 overflow-hidden rounded-[28px] border p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)] transition-shadow duration-300 hover:shadow-[0_14px_36px_rgba(15,23,42,0.12)] sm:p-6 ${som ? "border-[#293A54] bg-gradient-to-br from-[#111C30] via-[#192940] to-[#283B54] text-white" : "border-[#E5DCCA] bg-gradient-to-br from-[#FFFEFB] via-[#FCFAF4] to-[#F2EDE2] text-[#18273F]"}`} style={{ animationDelay: som ? "0ms" : "80ms" }}>
          <div aria-hidden className={`pointer-events-none absolute -right-20 -top-24 -z-10 h-72 w-72 rounded-full blur-3xl ${som ? "bg-[#C9AB75]/10" : "bg-[#D7C29A]/20"}`} />
          <div aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#D2B881]/60 to-transparent" />
          <div className="flex items-center gap-3">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${som ? "border-[#D9BF8B]/20 bg-[#D9BF8B]/10 text-[#E6CFA2]" : "border-[#DED1B5] bg-white/80 text-[#92733E]"}`}><Ikonka size={23} strokeWidth={1.6} aria-hidden /></span>
            <div className="min-w-0"><h2 className="text-base font-bold">{som ? "So'mdagi sotuvlar" : "Dollardagi sotuvlar"}</h2><p className={`mt-0.5 text-xs ${som ? "text-[#AEBBD0]" : "text-[#7D817F]"}`}>Sotuv valyutasi bo'yicha natija</p></div>
            <span className={`ml-auto rounded-full border px-3 py-1.5 text-[10px] font-bold tracking-[0.14em] ${som ? "border-[#D9BF8B]/25 bg-[#D9BF8B]/10 text-[#E6CFA2]" : "border-[#DED1B5] bg-white/70 text-[#92733E]"}`}>{currency}</span>
          </div>
          <dl className="mt-6">
            <div>
              <dt className={`text-xs font-medium ${som ? "text-[#BEC9D9]" : "text-[#767D83]"}`}>Yalpi foyda</dt>
              <dd key={`${yuklanmoqda}-${qiymat.foyda}`} className={`profit-currency-value mt-2 break-words text-3xl font-bold leading-tight tracking-tight tabular-nums sm:text-4xl ${zarar ? som ? "text-[#F2ACA9]" : "text-[#B84F49]" : som ? "text-[#A4E4CA]" : "text-[#23775D]"}`}>{yuklanmoqda ? "…" : pul(qiymat.foyda, currency)}</dd>
            </div>
            <div className={`mt-5 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2`}>
              {([['tushum', 'Tushum', Banknote], ['tannarx', 'Tannarx', ReceiptText]] as const).map(([key, label, Belgi]) => <div key={key} className={`min-w-0 rounded-2xl border px-4 py-3.5 ${som ? "border-white/10 bg-white/[0.04]" : "border-[#E5DCCA] bg-white/60"}`}>
                <dt className={`flex items-center gap-1.5 text-xs ${som ? "text-[#AEBBD0]" : "text-[#767D83]"}`}><Belgi size={14} strokeWidth={1.7} aria-hidden />{label}</dt>
                <dd key={`${yuklanmoqda}-${qiymat[key]}`} className="profit-currency-value mt-2 break-words text-xl font-bold leading-snug tracking-tight tabular-nums 2xl:text-2xl">{yuklanmoqda ? "…" : pul(qiymat[key], currency)}</dd>
              </div>)}
            </div>
            <div className="mt-5">
              <div className="flex items-center justify-between gap-3">
                <dt className={`text-xs font-medium ${som ? "text-[#BEC9D9]" : "text-[#767D83]"}`}>Rentabellik</dt>
                <dd className={`text-xl font-bold tabular-nums ${zarar ? som ? "text-[#F2ACA9]" : "text-[#B84F49]" : som ? "text-[#A4E4CA]" : "text-[#23775D]"}`}>{yuklanmoqda ? "…" : `${qiymat.rentabellik.toFixed(2)}%`}</dd>
              </div>
              <div aria-hidden className={`mt-2.5 h-1.5 overflow-hidden rounded-full ${som ? "bg-white/10" : "bg-[#DED8CA]/60"}`}>
                <div key={`${yuklanmoqda}-${qiymat.rentabellik}`} className={`profit-currency-bar h-full rounded-full ${zarar ? "bg-gradient-to-r from-rose-400 to-rose-500" : "bg-gradient-to-r from-[#69B99A] to-[#A4DFC6]"}`} style={{ width: `${yuklanmoqda ? 0 : Math.min(100, Math.abs(qiymat.rentabellik))}%` }} />
              </div>
            </div>
          </dl>
          <p className={`mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-4 text-xs ${som ? "border-white/10 text-[#AEBBD0]" : "border-[#DCD5C6]/70 text-[#767D83]"}`}>
            <span className="inline-flex items-center gap-1.5"><Package size={14} strokeWidth={1.7} aria-hidden />{yuklanmoqda ? "…" : son(qiymat.sotilgan)} birlik</span>
            <span className="inline-flex items-center gap-1.5"><ReceiptText size={14} strokeWidth={1.7} aria-hidden />{yuklanmoqda ? "…" : son(qiymat.cheklar ?? 0)} ta chek</span>
          </p>
        </article>;
      })}
    </section> : <section aria-label="Asosiy ko‘rsatkichlar" className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
      <Korsatkich nom="Tushum" qiymat={yuklanmoqda ? "…" : pul(tushumJufti.asosiy.summa, tushumJufti.asosiy.valyuta)} izoh={[qoshimcha(tushumJufti), jami.cheklar !== null ? `${son(jami.cheklar)} ta chek` : ""].filter(Boolean).join(" · ") || "Qaytarilganlarsiz"} />
      <Korsatkich nom="Tannarx" qiymat={yuklanmoqda ? "…" : pul(tannarxJufti.asosiy.summa, tannarxJufti.asosiy.valyuta)} izoh={qoshimcha(tannarxJufti) || "Sotilgan tovar tannarxi"} />
      <Korsatkich nom="Yalpi foyda" qiymat={yuklanmoqda ? "…" : pul(foydaJuftiJami.asosiy.summa, foydaJuftiJami.asosiy.valyuta)} izoh={qoshimcha(foydaJuftiJami) || "tushum − tannarx"} ton={jamiZarar ? "zarar" : "foyda"} keng />
      <Korsatkich nom="Rentabellik" qiymat={yuklanmoqda ? "…" : `${jami.rentabellik.toFixed(1)}%`} izoh="foyda ÷ tushum" />
      {jami.ortachaKurs !== null
        ? <Korsatkich nom="O‘rtacha kurs" qiymat={yuklanmoqda ? "…" : son(Math.round(jami.ortachaKurs))} izoh="sotuv kunlari bo‘yicha" />
        : <Korsatkich nom="Sotilgan miqdor" qiymat={yuklanmoqda ? "…" : son(jami.sotilgan)} izoh={`${korinadigan.length} ta ${guruhSozi}`} />}
    </section>}
    {!yuklanmoqda && tannarxYetishmaganSoni > 0 && <p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">Tannarxi kiritilmagan yozuvlar: {son(tannarxYetishmaganSoni)}. Ularning foydasi to'liq aniqlanmagan va ular «Eng ko'p foyda» ro'yxatiga kiritilmaydi.</p>}

    <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="min-w-0 overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-orange-100/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div role="tablist" aria-label="Hisobot kesimi" className="inline-flex w-full rounded-2xl bg-slate-100 p-1 sm:w-auto">
            {GURUHLAR.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={guruh === item.id} onClick={() => setGuruh(item.id)} className={`h-9 flex-1 whitespace-nowrap rounded-xl px-3.5 text-sm font-bold transition sm:flex-none ${guruh === item.id ? "bg-white text-orange-600 shadow-sm ring-1 ring-orange-100" : "text-slate-500 hover:text-slate-800"}`}>{item.nom}</button>
            ))}
          </div>
          <button type="button" disabled={exportYuklanmoqda || yuklanmoqda || !korinadigan.length} onClick={() => void eksport()} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 text-sm font-bold text-orange-600 shadow-sm transition hover:bg-orange-50 disabled:opacity-50"><Download size={16} />{exportYuklanmoqda ? "Yuklanmoqda..." : "Excel (.xlsx)"}</button>
        </div>

        {yuklanmoqda ? <YuklanmoqdaHolati /> : !korinadigan.length ? (
          <div className="flex h-72 items-center justify-center px-4 text-center font-bold text-slate-400">Tanlangan filtr bo‘yicha ma’lumot topilmadi.</div>
        ) : (
          <>
            <div className="scrollbar-orange hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    {ustunlar.map((ustun) => {
                      const faol = saralash.kalit === ustun.kalit;
                      const Belgi = faol ? (saralash.kamayish ? ArrowDown : ArrowUp) : ArrowUpDown;
                      return (
                        <th key={ustun.kalit} scope="col" aria-sort={faol ? (saralash.kamayish ? "descending" : "ascending") : "none"} className={`px-4 py-3.5 font-bold ${ustun.chap ? "text-left" : "text-right"}`}>
                          <button type="button" onClick={() => saralashniOzgartirish(ustun.kalit)} className={`inline-flex items-center gap-1 whitespace-nowrap uppercase tracking-wide transition hover:text-orange-600 ${faol ? "text-orange-600" : ""}`}>
                            {ustun.nom}<Belgi size={13} className={faol ? "" : "opacity-40"} />
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sahifa.map((item) => (
                    <tr key={item.id} className={`align-top transition hover:bg-orange-50/50 ${item.zarar ? "bg-red-50/40" : ""}`}>
                      <td className="max-w-[260px] px-4 py-3.5 font-black text-slate-900">
                        <span className="block truncate" title={item.nomi}>{item.nomi}</span>
                        <QatorIzohi item={item} pul={pul} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold tabular-nums text-gray-700">{son(item.sotilgan)}</td>
                      <td className="px-4 py-3.5 text-right"><SummaKatagi juft={qatorJufti(item, "tushum", hisobotValyutasi)} pul={pul} /></td>
                      <td className="px-4 py-3.5 text-right">{item.tannarxKiritilmagan ? "—" : <SummaKatagi juft={qatorJufti(item, "tannarx", hisobotValyutasi)} pul={pul} />}</td>
                      <td className="px-4 py-3.5 text-right">{item.tannarxKiritilmagan ? "—" : <SummaKatagi juft={qatorJufti(item, "foyda", hisobotValyutasi)} pul={pul} rang={foydaRangi(item.zarar)} qalin />}</td>
                      <td className="px-4 py-3.5 text-right"><RentabellikBelgisi qator={item} /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-orange-100 bg-orange-50/40 align-top font-black text-gray-700">
                    <td className="whitespace-nowrap px-4 py-3.5">Jami: {korinadigan.length} {guruhSozi}</td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums">{son(jami.sotilgan)}</td>
                    <td className="px-4 py-3.5 text-right"><SummaKatagi juft={tushumJufti} pul={pul} qalin /></td>
                    <td className="px-4 py-3.5 text-right"><SummaKatagi juft={tannarxJufti} pul={pul} qalin /></td>
                    <td className="px-4 py-3.5 text-right"><SummaKatagi juft={foydaJuftiJami} pul={pul} rang={foydaRangi(jamiZarar)} qalin /></td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums">{jami.rentabellik.toFixed(1)}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <ul className="divide-y divide-slate-100 xl:hidden">
              {sahifa.map((item) => (
                <li key={item.id} className={`p-4 ${item.zarar ? "bg-red-50/40" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-black text-slate-900">{item.nomi}</p>
                      <QatorIzohi item={item} pul={pul} />
                    </div>
                    <RentabellikBelgisi qator={item} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-4">
                    <Maydon nom="Tushum"><SummaKatagi juft={qatorJufti(item, "tushum", hisobotValyutasi)} pul={pul} chap /></Maydon>
                    <Maydon nom="Tannarx">{item.tannarxKiritilmagan ? "—" : <SummaKatagi juft={qatorJufti(item, "tannarx", hisobotValyutasi)} pul={pul} chap />}</Maydon>
                    <Maydon nom="Miqdor">{son(item.sotilgan)}</Maydon>
                    <Maydon nom="Yalpi foyda">{item.tannarxKiritilmagan ? "—" : <SummaKatagi juft={qatorJufti(item, "foyda", hisobotValyutasi)} pul={pul} rang={foydaRangi(item.zarar)} qalin chap />}</Maydon>
                  </dl>
                </li>
              ))}
            </ul>

            <TablePagination page={page} pageSize={pageSize} totalItems={tartiblangan.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
          </>
        )}
      </section>

      <aside className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-1">
        {!yuklanmoqda && eng.length > 0 && (
          <section className="rounded-3xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5 md:col-span-2 lg:col-span-1">
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-900"><TrendingUp size={16} className="text-orange-500" />Eng ko‘p foyda keltirgan</h2>
            <ul className="mt-4 space-y-3.5">
              {eng.map((item) => {
                const juft = panelJufti(item);
                return (
                  <li key={item.id}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate font-bold text-slate-800" title={item.nomi}>{item.nomi}</span>
                      <span className="shrink-0 font-black tabular-nums text-orange-600">{pul(juft.asosiy.summa, juft.asosiy.valyuta)}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100" role="presentation">
                      <div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.max((juft.asosiy.summa / (panelJufti(eng[0]).asosiy.summa || 1)) * 100, 3)}%` }} />
                    </div>
                    {juft.qoshimcha && <p className="mt-1 text-xs font-semibold tabular-nums text-slate-400">≈ {pul(juft.qoshimcha.summa, juft.qoshimcha.valyuta)}</p>}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {!yuklanmoqda && zararli.length > 0 && (
          <section role="alert" className="rounded-3xl border border-red-100 bg-red-50 p-4 sm:p-5">
            <h2 className="flex items-center gap-2 text-sm font-black text-red-700"><TriangleAlert size={16} />Zarar bilan sotilgan</h2>
            <ul className="mt-3 space-y-2.5 text-sm text-red-700">
              {zararli.slice(0, 3).map((item) => {
                const juft = panelJufti(item);
                return (
                  <li key={item.id}>
                    <p className="break-words"><span className="font-black">{item.nomi}</span> — {pul(juft.asosiy.summa, juft.asosiy.valyuta)}{juft.qoshimcha ? ` (${pul(juft.qoshimcha.summa, juft.qoshimcha.valyuta)})` : ""}</p>
                    <p className="text-xs font-semibold text-red-600/80">Sotuv narxi tannarxdan past.</p>
                  </li>
                );
              })}
            </ul>
            {zararli.length > 3 && <p className="mt-2.5 text-xs font-bold text-red-600">va yana {zararli.length - 3} ta</p>}
          </section>
        )}

        <section className="rounded-3xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="flex items-center gap-2 text-sm font-black text-slate-900"><Calculator size={16} className="text-orange-500" />Hisoblash formulasi</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
            <li><span className="font-bold text-slate-800">Yalpi foyda</span> = tushum − tannarx</li>
            <li><span className="font-bold text-slate-800">Rentabellik</span> = foyda ÷ tushum × 100%{model.aslValyutada ? " (har bir valyuta alohida)" : " (hisobot valyutasida)"}</li>
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            {model.aslValyutada ? "Har bir sotuv foydasi o'z valyutasida: dollardagi sotuv dollarda, so'mdagi sotuv so'mda. So'mdagi sotuvning dollar tannarxi sotuv kunidagi kurs bilan backendda hisoblanadi. " : "Har bir sotuv o'z kunidagi kurs bilan hisoblanadi. "}Qaytarilgan tovarlar ayirilgan, operatsion xarajatlar hisobga olinmagan. Sof foyda (xarajatlar ayirilgan) — <Link to="/hisobotlar/foyda-xarajat" className="font-black text-orange-600 underline underline-offset-2">«Foyda va xarajat»</Link> sahifasida.
          </p>
        </section>
      </aside>
    </div>
  </div>;
}

function Korsatkich({ nom, qiymat, izoh, ton, keng }: { nom: string; qiymat: string; izoh: string; ton?: "foyda" | "zarar"; keng?: boolean }) {
  const rangli = ton === "foyda" ? "border-orange-500 bg-orange-500 text-white" : ton === "zarar" ? "border-red-600 bg-red-600 text-white" : "border-orange-100 bg-white text-slate-900";
  return (
    <div className={`min-w-0 rounded-2xl border p-4 shadow-sm ${rangli} ${keng ? "col-span-2 lg:col-span-1" : ""}`}>
      <p className={`text-xs font-semibold ${ton ? "text-white/80" : "text-slate-500"}`}>{nom}</p>
      <p className="mt-1.5 break-words text-xl font-black tabular-nums">{qiymat}</p>
      <p className={`mt-1 text-xs tabular-nums ${ton ? "text-white/80" : "text-slate-400"}`}>{izoh}</p>
    </div>
  );
}

function Maydon({ nom, children }: { nom: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold text-slate-400">{nom}</dt>
      <dd className="break-words font-bold tabular-nums text-gray-700">{children}</dd>
    </div>
  );
}

type Juft = ReturnType<typeof valyutaJufti> | { asosiy: { summa: number; valyuta: Valyuta }; qoshimcha: null };

// Summa katagi: tanlangan valyutada, tagida kichik harfda ikkinchi valyutadagi qiymat (har sotuv o'z kursida hisoblangan).
function SummaKatagi({ juft, pul, rang = "text-gray-700", qalin, chap }: { juft: Juft; pul: (summa: number, valyuta: Valyuta) => string; rang?: string; qalin?: boolean; chap?: boolean }) {
  return (
    <span className={`block tabular-nums ${chap ? "text-left" : "text-right"}`}>
      <span className={`block whitespace-nowrap ${qalin ? "font-black" : "font-semibold"} ${rang}`}>{pul(juft.asosiy.summa, juft.asosiy.valyuta)}</span>
      {juft.qoshimcha && <span className="block whitespace-nowrap text-xs font-semibold text-slate-400">≈ {pul(juft.qoshimcha.summa, juft.qoshimcha.valyuta)}</span>}
    </span>
  );
}

// Nom ostidagi qisqa izoh: 1 dona tannarxi (mahsulot), eng foydali mahsulot (mijoz) va cheklar soni.
function QatorIzohi({ item, pul }: { item: Qator; pul: (summa: number, valyuta: Valyuta) => string }) {
  const qismlar = [
    item.birDonaTannarxUsd !== null ? `tannarx ${pul(item.birDonaTannarxUsd, "USD")} / dona` : "",
    item.engYaxshiMahsulot ? `eng foydali: ${item.engYaxshiMahsulot.nomi} (${pul(item.engYaxshiMahsulot.foydaUzs, "UZS")})` : "",
    item.cheklar !== null ? `${son(item.cheklar)} ta chek` : "",
  ].filter(Boolean);
  if (!qismlar.length && !item.tannarxKiritilmagan) return null;
  return <>
    {item.tannarxKiritilmagan && <span className="mt-1 inline-block rounded-lg bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">Tannarx kiritilmagan</span>}
    {qismlar.length > 0 && <span className="mt-0.5 block text-xs font-semibold text-slate-400">{qismlar.join(" · ")}</span>}
  </>;
}

function RentabellikBelgisi({ qator }: { qator: Qator }) {
  if (qator.tannarxKiritilmagan) return <span className="text-xs font-bold text-amber-700" title="Tannarx kiritilmagan">—</span>;
  const ton = qator.zarar ? "bg-red-50 text-red-600 ring-red-100" : qator.rentabellik < 10 ? "bg-amber-50 text-amber-700 ring-amber-100" : "bg-orange-50 text-orange-700 ring-orange-100";
  return <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-black tabular-nums ring-1 ${ton}`}>{qator.rentabellik.toFixed(1)}%</span>;
}
