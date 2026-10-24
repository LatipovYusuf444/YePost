import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, CalendarDays, CircleDollarSign, History, Wallet } from "lucide-react";
import { cashDailyReportApi } from "@/api/reportsApi";
import { filiallarApi } from "@/api/omborApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { bugungiToshkentKuni, kunniSurish, kunMatni } from "@/lib/hujjatSanasi";
import { cashAmount, dailyNet, dailyRangeError } from "@/lib/cashReports";
import type { CashCurrency, CashDailyReport, CashPaymentType } from "@/types/cashReports";
import type { Filial } from "@/types/ombor";
import MuddatTanlov from "./MuddatTanlov";
import YuklanmoqdaHolati from "./YuklanmoqdaHolati";

const columns: { label: string; currency: CashCurrency; payment?: CashPaymentType; accent: string; border: string; background: string }[] = [
  { label: "Naqd so'm", currency: "UZS", payment: "CASH", accent: "#15805D", border: "#B0DDCA", background: "#F0FAF5" },
  { label: "Naqd $", currency: "USD", payment: "CASH", accent: "#0F7B85", border: "#ACD9DF", background: "#F0FAFB" },
  { label: "Karta so'm", currency: "UZS", payment: "CARD", accent: "#7C51BC", border: "#D3C1ED", background: "#F8F4FD" },
  { label: "Bank so'm", currency: "UZS", payment: "BANK", accent: "#3268B9", border: "#B5CDF0", background: "#F2F7FE" },
  { label: "Bank $", currency: "USD", payment: "BANK", accent: "#5957B3", border: "#C8C5EB", background: "#F5F4FD" },
  { label: "Jami so'm", currency: "UZS", accent: "#9A7228", border: "#DCC79F", background: "#FBF7EC" },
  { label: "Jami $", currency: "USD", accent: "#AD6439", border: "#E5C5AD", background: "#FCF5EF" },
];
const selectClass = "mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold";

export default function KunlikKassa() {
  const [today, setToday] = useState(bugungiToshkentKuni);
  const [from, setFrom] = useState(() => kunniSurish(bugungiToshkentKuni(), -7));
  const [to, setTo] = useState(bugungiToshkentKuni);
  const [paymentType, setPaymentType] = useState<CashPaymentType | "">("");
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState<Filial[]>([]);
  const [report, setReport] = useState<CashDailyReport>();
  const [todayReport, setTodayReport] = useState<CashDailyReport>();
  const [loading, setLoading] = useState(false);
  const [todayLoading, setTodayLoading] = useState(false);
  const [error, setError] = useState("");
  const [todayError, setTodayError] = useState("");
  const [branchesError, setBranchesError] = useState("");
  const rangeError = dailyRangeError(from, to);

  useEffect(() => {
    let active = true;
    filiallarApi.royxat().then((items) => { if (active) setBranches(items); })
      .catch((err) => { if (active) setBranchesError(getApiErrorMessage(err)); });
    const interval = window.setInterval(() => setToday(bugungiToshkentKuni()), 30000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  useEffect(() => {
    let active = true;
    setReport(undefined);
    setError("");
    if (rangeError) { setLoading(false); return; }
    setLoading(true);
    cashDailyReportApi.olish({ from, to, paymentType: paymentType || undefined, branchId: branchId || undefined })
      .then((data) => { if (active) setReport(data); })
      .catch((err) => { if (active) setError(getApiErrorMessage(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [from, to, paymentType, branchId, rangeError]);

  // Bugungi qoldiq tanlangan tarixiy davrdan mustaqil olinadi.
  useEffect(() => {
    let active = true;
    setTodayReport(undefined);
    setTodayError("");
    setTodayLoading(true);
    cashDailyReportApi.olish({ from: today, to: today, paymentType: paymentType || undefined, branchId: branchId || undefined })
      .then((data) => { if (active) setTodayReport(data); })
      .catch((err) => { if (active) setTodayError(getApiErrorMessage(err)); })
      .finally(() => { if (active) setTodayLoading(false); });
    return () => { active = false; };
  }, [today, paymentType, branchId]);

  return <div className="space-y-5">
    <header>
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-600">Hisobotlar</p>
      <h1 className="mt-1 text-3xl font-black text-gray-950">Kunlik kassa</h1>
      <p className="mt-1 text-sm text-gray-500">Hujjat sanasi bo'yicha · Toshkent vaqti · So'm va dollar alohida</p>
    </header>

    <section className="relative isolate overflow-hidden rounded-[28px] border border-[#DDE3EC] bg-gradient-to-br from-white via-[#FCFCFD] to-[#F0F3F8] p-5 shadow-[0_6px_26px_rgba(15,23,42,0.04)] sm:p-6" aria-label="Bugungi kassa">
      <div aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#C5AF86]/60 to-transparent" />
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:gap-7">
        <div className="flex shrink-0 items-center gap-3.5 xl:min-w-60">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border border-[#334158] bg-gradient-to-br from-[#152238] to-[#293B55] text-[#E3CDA5] shadow-[0_4px_12px_rgba(21,34,56,0.15)]"><CalendarDays size={25} strokeWidth={1.6} aria-hidden /></span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8A7653]">Bugungi kassa</p>
            <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Bugun <span className="mx-1 font-normal text-slate-300">/</span> {kunMatni(today)}</h2>
            <p className="mt-1 text-xs text-slate-500">Toshkent vaqti</p>
          </div>
        </div>
        <div className="min-w-0 flex-1" aria-live="polite" aria-busy={todayLoading}>
          <span className="sr-only">Kassada:</span>
          <dl className="grid gap-3 min-[480px]:grid-cols-2">
            {(["UZS", "USD"] as const).map((currency) => <div key={currency} className={`min-w-0 rounded-2xl border bg-white/85 px-5 py-4 ${currency === "UZS" ? "border-[#D8E2F0]" : "border-[#E7DDCC]"}`}>
              <dt className="flex items-center gap-2 text-[11px] font-medium text-slate-500"><span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${currency === "UZS" ? "bg-[#647DA6]" : "bg-[#B39560]"}`} />{currency === "UZS" ? "So'mdagi qoldiq" : "Dollardagi qoldiq"}<span className="ml-auto text-[10px] font-bold tracking-wider text-slate-400">{currency}</span></dt>
              <dd className={`mt-1.5 break-words font-bold leading-tight tracking-tight text-[#18273F] tabular-nums ${todayLoading ? "text-sm" : "text-2xl 2xl:text-[28px]"}`}>{todayLoading ? "Yuklanmoqda..." : cashAmount(todayReport?.totals[currency].closing, currency)}</dd>
            </div>)}
          </dl>
        </div>
        <button type="button" onClick={() => { setFrom(today); setTo(today); }} className="group inline-flex min-h-12 shrink-0 cursor-pointer items-center justify-center gap-3 rounded-2xl border border-[#263750] bg-[#18273F] px-5 py-3.5 text-sm font-bold text-white shadow-[0_4px_12px_rgba(24,39,63,0.12)] transition hover:bg-[#253A58] hover:shadow-[0_6px_18px_rgba(24,39,63,0.2)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200">Bugunni ko'rsatish<ArrowRight size={16} className="text-[#E3CDA5] transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden /></button>
      </div>
      {todayError && <p role="alert" className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{todayError}</p>}
    </section>

    <section className="grid gap-4 rounded-3xl border border-orange-100 bg-white p-5 sm:grid-cols-2 lg:grid-cols-3">
      <MuddatTanlov timeZone="Asia/Tashkent" dateFrom={from} dateTo={to} onChange={(start, end) => { setFrom(start); setTo(end); }} />
      <label className="text-xs font-bold text-gray-700">To'lov turi
        <select className={selectClass} value={paymentType} onChange={(event) => setPaymentType(event.target.value as typeof paymentType)}>
          <option value="">Barchasi</option><option value="CASH">Naqd</option><option value="CARD">Karta</option><option value="BANK">Bank</option>
        </select>
      </label>
      <label className="text-xs font-bold text-gray-700">Filial
        <select className={selectClass} value={branchId} onChange={(event) => setBranchId(event.target.value)}>
          <option value="">Barcha filiallar</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </select>
      </label>
    </section>

    {[rangeError, error, branchesError].filter(Boolean).map((message) => <p key={message} role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{message}</p>)}
    {loading && <YuklanmoqdaHolati className="h-48" />}
    {report && <>
      <section className="grid gap-5 lg:grid-cols-2" aria-label="Davr bo'yicha kassa qoldiqlari">
        {(["UZS", "USD"] as const).map((currency) => {
          const som = currency === "UZS";
          const Ikonka = som ? Wallet : CircleDollarSign;
          return <article key={currency} className={`relative isolate overflow-hidden rounded-[28px] border p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:p-6 ${som ? "border-[#25344D] bg-gradient-to-br from-[#111C30] via-[#18273F] to-[#25364E] text-white" : "border-[#E6DFD0] bg-gradient-to-br from-[#FFFEFB] via-[#FCFAF5] to-[#F3EFE5] text-[#18273F]"}`}>
            <div aria-hidden className={`pointer-events-none absolute -right-20 -top-28 -z-10 h-72 w-72 rounded-full blur-3xl ${som ? "bg-[#C9AB75]/10" : "bg-[#D7C29A]/15"}`} />
            <div aria-hidden className={`pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent to-transparent ${som ? "via-[#D9BF8B]/60" : "via-[#BEA471]/60"}`} />
            <div className="flex items-center gap-3">
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${som ? "border-[#D9BF8B]/20 bg-[#D9BF8B]/10 text-[#E6CFA2]" : "border-[#DED1B5] bg-white/80 text-[#92733E]"}`}><Ikonka size={23} strokeWidth={1.6} aria-hidden /></span>
              <div>
                <h2 className="text-base font-bold">{som ? "So'm" : "Dollar ($)"}</h2>
                <p className={`mt-0.5 text-xs ${som ? "text-[#AEBBD0]" : "text-[#7D817F]"}`}>{som ? "O'zbekiston so'mi" : "AQSh dollari"}</p>
              </div>
              <span className={`ml-auto rounded-full border px-3 py-1.5 text-[10px] font-bold tracking-[0.14em] ${som ? "border-[#D9BF8B]/25 bg-[#D9BF8B]/10 text-[#E6CFA2]" : "border-[#DED1B5] bg-white/70 text-[#92733E]"}`}>{currency}</span>
            </div>
            <dl className="mt-6">
              <div>
                <dt className={`text-xs font-medium ${som ? "text-[#BEC9D9]" : "text-[#767D83]"}`}>Yakuniy qoldiq</dt>
                <dd className="mt-2 break-words text-3xl font-bold leading-tight tracking-tight tabular-nums sm:text-4xl">{cashAmount(report.totals[currency].closing, currency)}</dd>
              </div>
              <div className={`mt-6 grid grid-cols-1 gap-4 border-t pt-5 min-[480px]:grid-cols-3 ${som ? "border-white/10" : "border-[#DCD5C6]/70"}`}>
                {([['opening', "Boshlang'ich qoldiq", History], ['income', 'Kirim', ArrowDownLeft], ['expense', 'Chiqim', ArrowUpRight]] as const).map(([key, label, Belgi]) => <div key={key} className="min-w-0">
                  <dt className={`flex items-center gap-1.5 text-[11px] ${key === "income" ? som ? "text-[#8DD6BD]" : "text-[#36836A]" : key === "expense" ? som ? "text-[#EEB0AD]" : "text-[#B26762]" : som ? "text-[#AEBBD0]" : "text-[#7D817F]"}`}><Belgi size={13} strokeWidth={1.8} className="shrink-0" aria-hidden />{label}</dt>
                  <dd className="mt-2 break-words text-xl font-bold leading-snug tracking-tight tabular-nums xl:text-[22px] 2xl:text-2xl">{cashAmount(report.totals[currency][key], currency)}</dd>
                </div>)}
              </div>
            </dl>
          </article>;
        })}
      </section>
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_6px_24px_rgba(15,23,42,0.03)]">
        <div className="overflow-x-auto px-2 pb-4 sm:px-3">
          <table className="w-full min-w-[1120px] border-separate border-spacing-x-2 border-spacing-y-0 whitespace-nowrap text-sm">
            <caption className="px-2 py-4 text-left text-xs text-slate-500">Kunlik harakat: kirim − chiqim. Qoldiqlar yuqorida. Amaliyotlar: {report.totals.operationsCount}.</caption>
            <thead className="text-left"><tr><th scope="col" className="rounded-t-xl px-4 py-3">Sana</th>{columns.map((column) => <th scope="col" key={column.label} className="rounded-t-xl border-x border-t-2 px-4 py-3 text-right" style={{ borderColor: column.border, borderTopColor: column.accent, backgroundColor: column.background }}><span className="inline-flex items-center gap-2" style={{ color: column.accent }}><span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: column.accent }} />{column.label}</span></th>)}</tr></thead>
            <tbody>{report.days.map((day) => <tr key={day.date}>
              <th scope="row" className="border-b border-slate-100 px-4 py-3 text-left font-semibold">{kunMatni(day.date)}</th>
              {columns.map((column) => <td key={column.label} className={`border-x border-b px-4 py-3 text-right tabular-nums ${column.payment ? "font-medium" : "font-bold"}`} style={{ borderColor: column.border, backgroundColor: column.background }}>
                {cashAmount(dailyNet(day, column.currency, column.payment), column.currency)}
              </td>)}
            </tr>)}</tbody>
            <tfoot><tr><th scope="row" className="px-4 py-4 text-left font-bold text-slate-900">Davr jami</th>{columns.map((column) => <td key={column.label} className="rounded-b-xl border-x border-b-2 border-t-2 px-4 py-4 text-right tabular-nums" style={{ borderColor: column.border, borderBottomColor: column.accent, borderTopColor: column.accent, backgroundColor: column.background }}><span className="text-base font-black" style={{ color: column.accent }}>{cashAmount(dailyNet(report.totals, column.currency, column.payment), column.currency)}</span></td>)}</tr></tfoot>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/80 px-5 py-5 sm:px-6">
          <div><h3 className="font-bold text-slate-800">Davr bo'yicha sof harakat</h3><p className="mt-1 text-xs text-slate-500">Jami kirim − jami chiqim</p></div>
          <div className="grid w-full gap-3 min-[480px]:grid-cols-2 sm:w-auto">
            {(["UZS", "USD"] as const).map((currency) => <div key={currency} className={`min-w-0 rounded-2xl border px-5 py-3 sm:min-w-44 ${currency === "UZS" ? "border-[#DCC79F] bg-[#FBF7EC]" : "border-[#E5C5AD] bg-[#FCF5EF]"}`}>
              <p className="text-[11px] font-semibold text-slate-500">{currency === "UZS" ? "Jami so'm" : "Jami dollar"}</p>
              <p className="mt-1 break-words text-2xl font-black tracking-tight text-slate-900 tabular-nums">{cashAmount(dailyNet(report.totals, currency), currency)}</p>
            </div>)}
          </div>
        </div>
      </section>
    </>}
    <Link to="/kassa" className="inline-block text-sm font-bold text-blue-600">Kassa amaliyotlariga o'tish →</Link>
  </div>;
}
