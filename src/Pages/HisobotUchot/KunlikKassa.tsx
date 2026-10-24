import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cashDailyReportApi } from "@/api/reportsApi";
import { filiallarApi } from "@/api/omborApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { bugungiToshkentKuni, kunniSurish, kunMatni } from "@/lib/hujjatSanasi";
import { cashAmount, dailyNet, dailyRangeError } from "@/lib/cashReports";
import type { CashCurrency, CashDailyReport, CashPaymentType } from "@/types/cashReports";
import type { Filial } from "@/types/ombor";
import MuddatTanlov from "./MuddatTanlov";
import YuklanmoqdaHolati from "./YuklanmoqdaHolati";

const columns: { label: string; currency: CashCurrency; payment?: CashPaymentType }[] = [
  { label: "Naqd so'm", currency: "UZS", payment: "CASH" },
  { label: "Naqd $", currency: "USD", payment: "CASH" },
  { label: "Karta so'm", currency: "UZS", payment: "CARD" },
  { label: "Bank so'm", currency: "UZS", payment: "BANK" },
  { label: "Bank $", currency: "USD", payment: "BANK" },
  { label: "Jami so'm", currency: "UZS" },
  { label: "Jami $", currency: "USD" },
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

    <section className="rounded-3xl border border-blue-100 bg-blue-50 p-5" aria-label="Bugungi kassa">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-blue-700">Bugun · {kunMatni(today)}</h2>
        <button type="button" onClick={() => { setFrom(today); setTo(today); }} className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-blue-700">Bugunni ko'rsatish</button>
      </div>
      <p className="mt-2 text-xl font-black text-gray-950" aria-live="polite">
        {todayLoading ? "Yuklanmoqda..." : `Kassada: ${cashAmount(todayReport?.totals.UZS.closing, "UZS")} · ${cashAmount(todayReport?.totals.USD.closing, "USD")}`}
      </p>
      {todayError && <p role="alert" className="mt-2 text-sm font-bold text-red-600">{todayError}</p>}
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
      <section className="grid gap-4 sm:grid-cols-2">
        {(["UZS", "USD"] as const).map((currency) => <div key={currency} className="rounded-2xl border border-orange-100 bg-white p-4">
          <h2 className="mb-2 font-black">{currency === "UZS" ? "So'm" : "Dollar ($)"}</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {([['opening', "Boshlang'ich qoldiq"], ['income', 'Kirim'], ['expense', 'Chiqim'], ['closing', 'Yakuniy qoldiq']] as const).map(([key, label]) => <div key={key}>
              <dt className="text-gray-500">{label}</dt><dd className="font-bold tabular-nums">{cashAmount(report.totals[currency][key], currency)}</dd>
            </div>)}
          </dl>
        </div>)}
      </section>
      <section className="overflow-x-auto rounded-3xl border border-orange-100 bg-white">
        <table className="w-full whitespace-nowrap text-sm">
          <caption className="px-4 py-3 text-left text-xs text-gray-500">Kunlik harakat: kirim − chiqim. Qoldiqlar yuqorida. Amaliyotlar: {report.totals.operationsCount}.</caption>
          <thead className="bg-slate-50 text-left text-gray-600"><tr><th className="px-4 py-3">Sana</th>{columns.map((column) => <th key={column.label} className="px-4 py-3 text-right">{column.label}</th>)}</tr></thead>
          <tbody>{report.days.map((day) => <tr key={day.date} className="border-t border-orange-50">
            <th scope="row" className="px-4 py-3 text-left font-semibold">{kunMatni(day.date)}</th>
            {columns.map((column) => <td key={column.label} className={`px-4 py-3 text-right tabular-nums ${column.payment ? "" : "bg-blue-50/40 font-bold"}`}>
              {cashAmount(dailyNet(day, column.currency, column.payment), column.currency)}
            </td>)}
          </tr>)}</tbody>
          <tfoot className="border-t bg-slate-50 font-black"><tr><th className="px-4 py-3 text-left">Jami</th>{columns.map((column) => <td key={column.label} className="px-4 py-3 text-right tabular-nums">{cashAmount(dailyNet(report.totals, column.currency, column.payment), column.currency)}</td>)}</tr></tfoot>
        </table>
      </section>
    </>}
    <Link to="/kassa" className="inline-block text-sm font-bold text-blue-600">Kassa amaliyotlariga o'tish →</Link>
  </div>;
}
