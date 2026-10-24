import { useEffect, useId, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, Banknote, CreditCard, Download, Landmark, RotateCw, Wallet } from "lucide-react";
import MuddatTanlov from "./MuddatTanlov";
import KopTanlovli from "./KopTanlovli";
import { useHisobotRealData } from "./HisobotRealData";
import type { Tanlov } from "./types";
import { son } from "./yordamchilar";
import { bugungiToshkentKuni, kunniSurish, kunMatni } from "@/lib/hujjatSanasi";
import { cashAmount } from "@/lib/cashReports";
import type { CashCurrency } from "@/types/cashReports";
import type { KassaHujjati } from "./types";
import KassaAmaliyotModal from "@/Pages/KassaUchot/KassaAmaliyotModal";
import type { KassaAmaliyoti, KassaAmaliyotTuri, KassaKanali } from "@/Pages/KassaUchot/types";
import { cashFlowReportApi, type CashFlowReport } from "@/api/reportsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import AppModal from "@/Components/common/AppModal";

import YuklanmoqdaHolati from "./YuklanmoqdaHolati";
// Kirim-chiqim (kassa oboroti) hisoboti — matritsa: kassalar × (Kirim/Chiqim/Qoldiq).
// Qatorlar: Boshlang'ich qoldiq / Aylanma / Yakuniy qoldiq.
// "Aylanma" bosilsa — backend tranzaksiyalari hujjatlar kesimida ochiladi.

// Ustunlar tartibi: Bank → Karta → Naqd
const KASSA_TARTIB = ["BANK", "CARD", "CASH"];
const KASSA_TANLOVLARI: Tanlov[] = [
  { id: "BANK", nomi: "Bank" },
  { id: "CARD", nomi: "Karta" },
  { id: "CASH", nomi: "Naqd" },
];

// To'lov turi qaysi kassaga tushadi: naqd→Naqd, karta→Karta, bank/payme/click→Bank
const TOLOV_KASSA: Record<string, string> = {
  CASH: "CASH",
  CARD: "CARD",
  BANK: "BANK",
};

function kassaNomi(id: string) {
  return KASSA_TANLOVLARI.find((k) => k.id === id)?.nomi ?? id;
}

// Kassa (hisobot) → Kassa moduli kanali
const KASSA_KANAL: Record<string, KassaKanali> = { CASH: "naqd", BANK: "bank", CARD: "ilova" };

function kanalOl(kassaId: string): KassaKanali {
  return KASSA_KANAL[kassaId] ?? "naqd";
}
function turiOl(h: KassaHujjati): KassaAmaliyotTuri {
  return h.turi === "kirim" ? "boshqa_kirim" : "boshqa_chiqim";
}

// Hisobot hujjatini kassa moduli amaliyotiga o'girish (to'lov moduliga ulangan holda ochish)
function hujjatAmaliyoti(h: KassaHujjati, filiallar: Tanlov[]): KassaAmaliyoti {
  return {
    id: h.id,
    kanal: kanalOl(h.kassaId),
    yonalish: h.turi === "kirim" ? "tushum" : "chiqim",
    turi: turiOl(h),
    holat: "tasdiqlangan",
    raqam: h.raqam,
    nomi: h.nomi,
    kontragent: filiallar.find((item) => item.id === h.branchId)?.nomi ?? h.branchId,
    summa: h.summa,
    valyuta: h.currency ?? "UZS",
    readonly: true,
    sana: h.sana,
    masul: "",
    izoh: "",
  };
}

type Guruh = { id: string; nomi: string };
type Katak = { kirim: number; chiqim: number; qoldiq: number | null; currency?: CashCurrency };
type Satr = { label: string; belgi?: boolean; onClick?: () => void; kataklar: Katak[] };

// Leaf ustun kengliklarining boshlang'ich qiymati
function boshEn(leaf: string) {
  if (leaf === "label") return 190;
  if (leaf.endsWith("qoldiq")) return 140;
  return 120;
}

function csvYuklash(nom: string, ustunlar: string[], qatorlar: (string | number)[][]) {
  const satrlar = [ustunlar, ...qatorlar].map((qator) =>
    qator.map((katak) => `"${String(katak).replace(/"/g, '""')}"`).join(",")
  );
  const blob = new Blob(["﻿" + satrlar.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${nom}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function KirimChiqimHisoboti() {
  void csvYuklash;
  const { filiallar: filialTanlovlari } = useHisobotRealData();
  const [dateFrom, setDateFrom] = useState(() => kunniSurish(bugungiToshkentKuni(), -30));
  const [dateTo, setDateTo] = useState(bugungiToshkentKuni);
  const [currency, setCurrency] = useState<CashCurrency>("UZS");
  const [currencySummary, setCurrencySummary] = useState<CashFlowReport["summary"]["byCurrency"]>();
  const [dollarKartalar, setDollarKartalar] = useState<Record<string, boolean>>({});
  const kartalarId = useId();
  const [kassalar, setKassalar] = useState<string[]>([]);
  const [kassaHujjatlar, setKassaHujjatlar] = useState<KassaHujjati[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [xato, setXato] = useState("");
  const [tolovTurlari, setTolovTurlari] = useState<string[]>([]);
  const [backendSummary, setBackendSummary] = useState<CashFlowReport["byPaymentMethod"]>([]);
  const [exportYuklanmoqda, setExportYuklanmoqda] = useState(false);
  const [aylanmaOchiq, setAylanmaOchiq] = useState(false);
  const [tanlanganHujjat, setTanlanganHujjat] = useState<KassaHujjati | null>(null);
  const [enlar, setEnlar] = useState<Record<string, number>>({});
  const [tartib, setTartib] = useState<string[]>(KASSA_TARTIB);

  useEffect(() => {
    let active = true;
    setYuklanmoqda(true);
    setXato("");
    setKassaHujjatlar([]);
    setBackendSummary([]);
    setCurrencySummary(undefined);
    if (!dateFrom || !dateTo || dateFrom > dateTo) {
      setXato("Sana oralig'ini to'g'ri kiriting.");
      setYuklanmoqda(false);
      return;
    }
    const methods = KASSA_TARTIB.filter((id) => (!kassalar.length || kassalar.includes(id)) && (!tolovTurlari.length || tolovTurlari.includes(id)));
    if (!methods.length) { setYuklanmoqda(false); return; }
    cashFlowReportApi
      .olish({
        dateFrom,
        dateTo,
        currency,
        paymentMethods: methods.length === 3 ? undefined : methods.join(","),
      })
      .then((report) => {
        if (!active) return;
        setBackendSummary(report.byPaymentMethod ?? []);
        setCurrencySummary(report.summary.byCurrency);
        setKassaHujjatlar((report.items ?? []).map((item) => ({
          id: item.id,
          currency: item.currency ?? currency,
          runningBalance: item.runningBalance == null ? undefined : Number(item.runningBalance),
          sana: item.date,
          raqam: item.documentNumber || item.refDocNumber || item.id,
          nomi: item.name || item.note || item.documentNumber || "Kassa amaliyoti",
          branchId: item.branchId ?? "",
          kassaId: TOLOV_KASSA[item.paymentMethod ?? item.paymentType ?? "CASH"] ?? "CASH",
          tolovTuri: item.paymentMethod ?? item.paymentType ?? "CASH",
          turi: Number(item.expense ?? 0) > 0 || item.type === "EXPENSE" ? "chiqim" : "kirim",
          summa: Number(
            Number(item.expense ?? 0) > 0
              ? item.expense
              : Number(item.income ?? 0) > 0
                ? item.income
                : item.amount ?? 0
          ),
        })));
      })
      .catch((error) => { if (active) setXato(getApiErrorMessage(error)); })
      .finally(() => { if (active) setYuklanmoqda(false); });
    return () => { active = false; };
  }, [dateFrom, dateTo, tolovTurlari, kassalar, currency]);

  // Guruh (kassa) ustunini sudrab qayta joylashtirish
  function qaytaTartibla(fromId: string, toId: string) {
    if (fromId === toId) return;
    setTartib((old) => {
      const from = old.indexOf(fromId);
      const to = old.indexOf(toId);
      if (from < 0 || to < 0) return old;
      const yangi = [...old];
      yangi.splice(from, 1);
      yangi.splice(to, 0, fromId);
      return yangi;
    });
  }

  const enOl = (leaf: string) => enlar[leaf] ?? boshEn(leaf);

  function boshlaResize(leaf: string, e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = enOl(leaf);
    function move(ev: PointerEvent) {
      setEnlar((o) => ({ ...o, [leaf]: Math.max(64, startW + (ev.clientX - startX)) }));
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  // Ko'rsatiladigan kassalar: Kassa tanlovi + To'lov turi (naqd tanlansa faqat Naqd)
  const kassaIdlar = useMemo(() => {
    const tolovKassalar = tolovTurlari.length
      ? new Set(tolovTurlari.map((t) => TOLOV_KASSA[t]).filter(Boolean))
      : null;
    return tartib.filter(
      (id) =>
        (kassalar.length === 0 || kassalar.includes(id)) &&
        (!tolovKassalar || tolovKassalar.has(id))
    );
  }, [tartib, kassalar, tolovTurlari]);
  const ustunlar = useMemo<Guruh[]>(
    () => [...kassaIdlar.map((id) => ({ id, nomi: kassaNomi(id) })), { id: "jami", nomi: "Jami" }],
    [kassaIdlar]
  );

  // Backend transaction endpointi filial kesimini bermaydi; to'lov turiga mos hujjatlar.
  const mosHujjatlar = useMemo(
    () =>
      kassaHujjatlar.filter(
        (r) => tolovTurlari.length === 0 || tolovTurlari.includes(r.tolovTuri)
      ),
    [kassaHujjatlar, tolovTurlari]
  );

  // Har bir kassaning boshlang'ich (davr boshigacha) va davr aylanmasi
  const kassaHisob = useMemo(() => {
    const map: Record<string, { boshlangich: number; kirim: number; chiqim: number; yakuniy: number }> = {};
    kassaIdlar.forEach((id) => {
      const summary = backendSummary.find((item) => item.paymentMethod === id);
      map[id] = {
        boshlangich: Number(summary?.openingBalance ?? 0),
        kirim: Number(summary?.income ?? 0),
        chiqim: Number(summary?.expense ?? 0),
        yakuniy: Number(summary?.closingBalance ?? 0),
      };
    });
    return map;
  }, [kassaIdlar, backendSummary]);

  // Umumiy matritsa qatorlari (Boshlang'ich / Aylanma / Yakuniy)
  const satrlar: Satr[] = useMemo(() => {
    const jamiKatak = (fn: (id: string) => Katak): Katak => {
      const list = kassaIdlar.map(fn);
      const qoldiqlar = list.map((k) => k.qoldiq).filter((q): q is number => q !== null);
      return {
        kirim: list.reduce((s, k) => s + k.kirim, 0),
        chiqim: list.reduce((s, k) => s + k.chiqim, 0),
        qoldiq: qoldiqlar.length ? qoldiqlar.reduce((s, q) => s + q, 0) : null,
      };
    };
    const bosh = (id: string): Katak => ({ kirim: 0, chiqim: 0, qoldiq: kassaHisob[id]?.boshlangich ?? 0 });
    const ayl = (id: string): Katak => ({
      kirim: kassaHisob[id]?.kirim ?? 0,
      chiqim: kassaHisob[id]?.chiqim ?? 0,
      qoldiq: null,
    });
    const yak = (id: string): Katak => {
      const h = kassaHisob[id];
      return { kirim: h?.kirim ?? 0, chiqim: h?.chiqim ?? 0, qoldiq: h?.yakuniy ?? 0 };
    };
    const qator = (fn: (id: string) => Katak): Katak[] => [...kassaIdlar.map(fn), jamiKatak(fn)].map((katak) => ({ ...katak, currency }));
    return [
      { label: "Boshlang'ich qoldiq", kataklar: qator(bosh) },
      { label: "Aylanma", belgi: true, onClick: () => setAylanmaOchiq(true), kataklar: qator(ayl) },
      { label: "Yakuniy qoldiq", kataklar: qator(yak) },
    ];
  }, [kassaHisob, kassaIdlar, currency]);

  // Hujjatlar bo'yicha aylanma (running qoldiq) — modal uchun
  const tafsilotSatrlar: Satr[] = useMemo(() => {
    const running: Record<string, number> = {};
    kassaIdlar.forEach((id) => (running[id] = kassaHisob[id]?.boshlangich ?? 0));
    // runningBalance server ketma-ketligiga tegishli; teng sanalarda qayta saralamaymiz.
    const docs = mosHujjatlar.filter((r) => kassaIdlar.includes(r.kassaId));

    return docs.map((d) => {
      running[d.kassaId] += d.turi === "kirim" ? d.summa : -d.summa;
      const kataklar: Katak[] = kassaIdlar.map((id) => ({
        currency: d.currency ?? currency,
        kirim: id === d.kassaId && d.turi === "kirim" ? d.summa : 0,
        chiqim: id === d.kassaId && d.turi === "chiqim" ? d.summa : 0,
        qoldiq: running[id],
      }));
      const jami: Katak = {
        currency: d.currency ?? currency,
        kirim: kataklar.reduce((s, k) => s + k.kirim, 0),
        chiqim: kataklar.reduce((s, k) => s + k.chiqim, 0),
        qoldiq: d.runningBalance ?? kassaIdlar.reduce((s, id) => s + running[id], 0),
      };
      return {
        label: `${kunMatni(d.sana)} · ${d.nomi} · ${d.currency ?? currency}`,
        onClick: () => setTanlanganHujjat(d),
        kataklar: [...kataklar, jami],
      };
    });
  }, [mosHujjatlar, kassaIdlar, kassaHisob, currency]);

  async function eksport() {
    if (exportYuklanmoqda) return;
    setExportYuklanmoqda(true);
    setXato("");
    try {
      await cashFlowReportApi.export({
        dateFrom,
        dateTo,
        paymentMethods: kassaIdlar.length === 3 ? undefined : kassaIdlar.join(","),
      });
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setExportYuklanmoqda(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Oval to'q sariq scroll */}
      <style>{`
        .aylanma-scroll{scrollbar-width:thin;scrollbar-color:#60A5FA #EFF6FF}
        .aylanma-scroll::-webkit-scrollbar{height:10px;width:10px}
        .aylanma-scroll::-webkit-scrollbar-track{background:#EFF6FF;border-radius:9999px}
        .aylanma-scroll::-webkit-scrollbar-thumb{background:#60A5FA;border-radius:9999px}
        .aylanma-scroll::-webkit-scrollbar-thumb:hover{background:#2563EB}
      `}</style>

      {/* Filter paneli */}
      <section className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
        <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <MuddatTanlov
            timeZone="Asia/Tashkent"
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={(f, t) => {
              setDateFrom(f);
              setDateTo(t);
            }}
          />
          <KopTanlovli label="Kassa" options={KASSA_TANLOVLARI} selected={kassalar} onChange={setKassalar} />
          <KopTanlovli
            label="To'lov turi"
            options={KASSA_TANLOVLARI}
            selected={tolovTurlari}
            onChange={setTolovTurlari}
          />
          <label className="text-xs font-bold text-gray-700">Jadval valyutasi
            <select aria-label="Hisobot valyutasi" value={currency} onChange={(event) => setCurrency(event.target.value as CashCurrency)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
              <option value="UZS">So'm</option><option value="USD">Dollar ($)</option>
            </select>
          </label>
        </div>
      </section>

      {xato && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}
      {yuklanmoqda && <YuklanmoqdaHolati className="h-48" />}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Kassa qoldiqlari">
        {[...kassaIdlar, "jami"].map((id) => {
          const nomi = id === "jami" ? "Jami" : kassaNomi(id);
          const dollar = Boolean(dollarKartalar[id]);
          const keyingi = dollar ? "So'm" : "Dollar ($)";
          const jami = id === "jami";
          const Ikonka = id === "BANK" ? Landmark : id === "CARD" ? CreditCard : id === "CASH" ? Banknote : Wallet;
          const ohang = id === "BANK" ? "border-blue-100 from-white to-blue-50/80" : id === "CARD" ? "border-violet-100 from-white to-violet-50/80" : "border-emerald-100 from-white to-emerald-50/80";
          const ikonkaStili = id === "BANK" ? "bg-blue-100 text-blue-600" : id === "CARD" ? "bg-violet-100 text-violet-600" : "bg-emerald-100 text-emerald-600";
          return <button key={id} type="button"
            onClick={() => setDollarKartalar((old) => ({ ...old, [id]: !old[id] }))}
            aria-label={`${nomi}: ${dollar ? "Dollar ($)" : "So'm"}. ${keyingi} ko'rsatish uchun aylantirish`}
            aria-describedby={`${kartalarId}-${id}-${dollar ? "USD" : "UZS"}`}
            aria-pressed={dollar}
            title={`${keyingi} ko'rsatish uchun bosing`}
            className="group relative min-w-0 cursor-pointer rounded-3xl text-left transition-transform duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-400 focus-visible:ring-offset-2 motion-reduce:transform-none"
            style={{ perspective: "1200px" }}>
            <span className="grid h-full transition-transform duration-700 motion-reduce:transition-none"
              style={{ transformStyle: "preserve-3d", transform: dollar ? "rotateY(180deg)" : "rotateY(0deg)" }}>
            {(["UZS", "USD"] as const).map((code) => {
              const summary = currencySummary?.[code];
              const balance = id === "jami" ? summary : summary?.byPaymentMethod[id as "BANK" | "CARD" | "CASH"];
              const usd = code === "USD";
              return <span key={code} id={`${kartalarId}-${id}-${code}`} aria-hidden={usd !== dollar}
                className={`relative col-start-1 row-start-1 flex min-w-0 flex-col overflow-hidden rounded-3xl border bg-gradient-to-br p-5 shadow-[0_5px_20px_rgba(15,23,42,0.04)] transition-shadow duration-300 group-hover:shadow-[0_12px_28px_rgba(15,23,42,0.09)] ${jami ? "border-slate-700 from-slate-900 to-slate-800 text-white" : usd ? "border-blue-200 from-blue-50 to-indigo-50 text-slate-900" : `${ohang} text-slate-900`}`}
                style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: usd ? "rotateY(180deg)" : "rotateY(0deg)" }}>
                <span aria-hidden className={`pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full blur-2xl ${jami ? "bg-blue-500/20" : usd ? "bg-blue-200/40" : "bg-white/60"}`} />
                <span className="relative flex items-center gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${jami ? "bg-white/10 text-blue-200" : usd ? "bg-blue-100 text-blue-600" : ikonkaStili}`}><Ikonka size={20} aria-hidden /></span>
                  <span className={`font-bold ${jami ? "text-white" : "text-slate-700"}`}>{nomi}</span>
                  <span className={`ml-auto rounded-full border px-2.5 py-1 text-[10px] font-black tracking-wider ${jami ? "border-white/15 bg-white/10 text-blue-100" : "border-white bg-white/80 text-slate-500"}`}>{code}</span>
                </span>
                <span className={`mt-4 text-[11px] font-medium ${jami ? "text-slate-300" : "text-slate-500"}`}>Yakuniy qoldiq</span>
                <span className="mt-1 break-words text-2xl font-black leading-tight tracking-tight tabular-nums">{cashAmount(balance?.closingBalance, code)}</span>
                <span className={`mt-4 grid grid-cols-2 gap-3 border-t pt-3 ${jami ? "border-white/10" : "border-slate-200/60"}`}>
                  <span className="min-w-0">
                    <span className={`flex items-center gap-1 text-[11px] ${jami ? "text-emerald-300" : "text-emerald-600"}`}><ArrowDownLeft size={13} aria-hidden />Kirim</span>
                    <span className="mt-1 block break-words text-xs font-bold tabular-nums">{cashAmount(balance?.income, code)}</span>
                  </span>
                  <span className="min-w-0">
                    <span className={`flex items-center gap-1 text-[11px] ${jami ? "text-rose-300" : "text-rose-500"}`}><ArrowUpRight size={13} aria-hidden />Chiqim</span>
                    <span className="mt-1 block break-words text-xs font-bold tabular-nums">{cashAmount(balance?.expense, code)}</span>
                  </span>
                </span>
                <span className={`mt-4 flex items-center justify-end gap-1.5 text-[10px] font-bold ${jami ? "text-blue-200" : "text-blue-600"}`}><RotateCw size={12} aria-hidden />{usd ? "So'mga o'tish" : "Dollarga o'tish"}</span>
              </span>;
            })}
            </span>
          </button>;
        })}
      </section>

      <button
        onClick={() => void eksport()}
        disabled={exportYuklanmoqda || !dateFrom || !dateTo || dateFrom > dateTo || !kassaIdlar.length}
        className="inline-flex h-12 items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 text-sm font-bold text-orange-600 shadow-sm transition hover:bg-orange-50"
      >
        <Download size={16} />
        {exportYuklanmoqda ? "Yuklanmoqda..." : "Excel (.xlsx)"}
      </button>

      {/* Kassa oboroti matritsasi */}
      <MatritsaJadval
        birinchiSarlavha=""
        ustunlar={ustunlar}
        satrlar={satrlar}
        enOl={enOl}
        boshlaResize={boshlaResize}
        onReorder={qaytaTartibla}
      />

      {/* Aylanma tafsiloti — modal */}
      {aylanmaOchiq && (
        <AppModal onClose={() => setAylanmaOchiq(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${kartalarId}-aylanma-title`}
            className="flex h-[94dvh] w-[calc(100vw-2rem)] max-w-[1900px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 shadow-2xl sm:w-[calc(100vw-6rem)]"
          >
            <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
              <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600 sm:flex"><ArrowRightLeft size={23} aria-hidden /></span>
              <div className="min-w-0">
                <h3 id={`${kartalarId}-aylanma-title`} className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">Aylanma tafsiloti</h3>
                <p className="mt-1 text-xs text-slate-500">{kunMatni(dateFrom)} — {kunMatni(dateTo)} <span className="mx-1 text-slate-300">·</span> {tafsilotSatrlar.length} ta hujjat</p>
              </div>
              <span className="ml-auto shrink-0 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">{currency === "USD" ? "Dollar · USD" : "So'm · UZS"}</span>
            </div>
            <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-5">
              <MatritsaJadval
                ichkiScroll
                birinchiSarlavha="Hujjatlar"
                ustunlar={ustunlar}
                satrlar={tafsilotSatrlar}
                enOl={enOl}
                boshlaResize={boshlaResize}
                onReorder={qaytaTartibla}
                bosh="Tanlangan davrda hujjat yo'q."
              />
            </div>
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
              <p className="text-xs text-slate-500">Hujjat tafsilotini ochish uchun qatorni bosing.</p>
              <button type="button" onClick={() => setAylanmaOchiq(false)} className="shrink-0 cursor-pointer rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200">Yopish</button>
            </div>
          </div>
        </AppModal>
      )}

      {/* Hujjat ko'rish — kassa (to'lov) moduli amaliyot modalida ochiladi */}
      {tanlanganHujjat && (
        <KassaAmaliyotModal
            boshlangich={hujjatAmaliyoti(tanlanganHujjat, filialTanlovlari)}
          boshlangichKanal={kanalOl(tanlanganHujjat.kassaId)}
          boshlangichTuri={turiOl(tanlanganHujjat)}
          onYopish={() => setTanlanganHujjat(null)}
          onSaqlash={() => setTanlanganHujjat(null)}
        />
      )}
    </div>
  );
}

function MatritsaJadval({
  birinchiSarlavha,
  ustunlar,
  satrlar,
  enOl,
  boshlaResize,
  onReorder,
  bosh,
  ichkiScroll = false,
}: {
  birinchiSarlavha: string;
  ustunlar: Guruh[];
  satrlar: Satr[];
  enOl: (leaf: string) => number;
  boshlaResize: (leaf: string, e: React.PointerEvent) => void;
  onReorder?: (fromId: string, toId: string) => void;
  bosh?: string;
  ichkiScroll?: boolean;
}) {
  const [sudralgan, setSudralgan] = useState<string | null>(null);
  const [nishon, setNishon] = useState<string | null>(null);
  const leaflar = ["label", ...ustunlar.flatMap((g) => [`${g.id}-kirim`, `${g.id}-chiqim`, `${g.id}-qoldiq`])];
  const jamiEn = leaflar.reduce((s, l) => s + enOl(l), 0);
  const metrikalar: Array<["kirim" | "chiqim" | "qoldiq", string]> = [
    ["kirim", "Kirim"],
    ["chiqim", "Chiqim"],
    ["qoldiq", "Qoldiq"],
  ];

  if (ustunlar.length <= 1 || (bosh && satrlar.length === 0)) {
    return (
      <section className="rounded-[28px] border border-orange-100 bg-white p-10 text-center shadow-sm">
        <p className="font-bold text-gray-400">{bosh ?? "Kassa topilmadi."}</p>
      </section>
    );
  }

  return (
    <section className={`${ichkiScroll ? "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl" : "rounded-[28px]"} border border-orange-100 bg-white shadow-sm`}>
      <div className={`aylanma-scroll ${ichkiScroll ? "min-h-0 flex-1 overflow-auto" : "overflow-x-auto rounded-[28px]"}`}>
        <table className={ichkiScroll ? "border-separate border-spacing-0 text-sm [&_td]:border-b [&_td]:border-slate-100" : "text-sm"} style={{ tableLayout: "fixed", width: ichkiScroll ? "100%" : jamiEn, minWidth: ichkiScroll ? jamiEn : undefined }}>
          <colgroup>
            {leaflar.map((l) => (
              <col key={l} style={{ width: enOl(l) }} />
            ))}
          </colgroup>
          <thead className={ichkiScroll ? "sticky top-0 z-20 bg-slate-50 shadow-[0_1px_0_#e2e8f0] [&_th]:bg-slate-50!" : undefined}>
            <tr className="border-b border-orange-100">
              <th className="px-4 py-3" />
              {ustunlar.map((g) => {
                const sudralishi = onReorder && g.id !== "jami";
                return (
                  <th
                    key={g.id}
                    colSpan={3}
                    draggable={sudralishi || undefined}
                    onDragStart={sudralishi ? () => setSudralgan(g.id) : undefined}
                    onDragOver={
                      sudralishi
                        ? (e) => {
                            e.preventDefault();
                            if (sudralgan && sudralgan !== g.id) setNishon(g.id);
                          }
                        : undefined
                    }
                    onDragLeave={sudralishi ? () => setNishon((n) => (n === g.id ? null : n)) : undefined}
                    onDrop={
                      sudralishi
                        ? () => {
                            if (sudralgan) onReorder?.(sudralgan, g.id);
                            setSudralgan(null);
                            setNishon(null);
                          }
                        : undefined
                    }
                    onDragEnd={() => {
                      setSudralgan(null);
                      setNishon(null);
                    }}
                    className={`border-l border-orange-100 px-4 py-3 text-center text-base font-black transition ${
                      g.id === "jami" ? "bg-orange-50/70 text-orange-600" : "text-gray-800"
                    } ${sudralishi ? "cursor-grab active:cursor-grabbing select-none" : ""} ${
                      sudralgan === g.id ? "opacity-40" : ""
                    } ${nishon === g.id ? "bg-orange-100/70" : ""}`}
                    title={sudralishi ? "Ustunni sudrab joyini almashtiring" : undefined}
                  >
                    {g.nomi}
                  </th>
                );
              })}
            </tr>
            <tr className="border-b border-orange-100 text-xs font-black uppercase tracking-wide text-gray-400">
              <th className="relative px-4 py-2.5 text-left align-bottom text-gray-500">
                {birinchiSarlavha}
                <Tutqich onDown={(e) => boshlaResize("label", e)} />
              </th>
              {ustunlar.map((g) =>
                metrikalar.map(([m, nomi]) => (
                  <th
                    key={`${g.id}-${m}`}
                    className={`relative border-l px-4 py-2.5 text-center ${
                      g.id === "jami" ? "border-orange-100 bg-orange-50/40" : "border-orange-50"
                    }`}
                  >
                    {nomi}
                    <Tutqich onDown={(e) => boshlaResize(`${g.id}-${m}`, e)} />
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {satrlar.map((q) => (
              <tr
                key={q.label}
                onClick={q.onClick}
                className={`border-b border-orange-50 last:border-0 ${q.belgi ? "bg-amber-50/60" : ""} ${
                  q.onClick ? "cursor-pointer hover:bg-amber-100/60" : ""
                }`}
              >
                <td className={`${ichkiScroll ? "break-words whitespace-normal leading-relaxed" : "truncate"} px-4 py-3.5 font-bold text-gray-700`} title={q.label}>
                  {q.label}
                </td>
                {q.kataklar.map((k, i) => (
                  <TripKatak key={i} katak={k} jami={ustunlar[i]?.id === "jami"} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Tutqich({ onDown }: { onDown: (e: React.PointerEvent) => void }) {
  return (
    <span
      onPointerDown={onDown}
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 top-0 z-10 h-full w-2 cursor-col-resize touch-none select-none hover:bg-orange-200/60"
    />
  );
}

function TripKatak({ katak, jami }: { katak: Katak; jami: boolean }) {
  const asos = `px-4 py-3.5 text-right tabular-nums ${jami ? "bg-orange-50/40 font-black" : "font-semibold"}`;
  return (
    <>
      <td className={`border-l border-orange-50 ${asos} ${katak.kirim > 0 ? "text-emerald-600" : "text-gray-300"}`}>
        {katak.currency ? cashAmount(katak.kirim, katak.currency) : son(katak.kirim)}
      </td>
      <td className={`${asos} ${katak.chiqim > 0 ? "text-red-500" : "text-gray-300"}`}>{katak.currency ? cashAmount(katak.chiqim, katak.currency) : son(katak.chiqim)}</td>
      <td
        className={`${asos} ${
          katak.qoldiq === null ? "text-gray-300" : katak.qoldiq >= 0 ? "text-gray-900" : "text-red-500"
        }`}
      >
        {katak.qoldiq === null ? "—" : katak.currency ? cashAmount(katak.qoldiq, katak.currency) : son(katak.qoldiq)}
      </td>
    </>
  );
}
