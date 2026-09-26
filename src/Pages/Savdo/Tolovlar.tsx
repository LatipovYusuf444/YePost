import { useState } from "react";
import { CreditCard, LoaderCircle, RefreshCw, Search, WalletCards, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useTolovlar } from "@/hooks/useTolovlar";
import type { Qaytarish, Sotuv } from "@/types/savdo";
import type { TolovYozuvi } from "@/types/tolov";
import { tolovSanasiniFormatlash, tolovSummasiniFormatlash, tolovUsuliMatni } from "@/utils/tolovFormatters";
import AppModal from "@/Components/common/AppModal";
import SavdoSelect from "./SavdoSelect";

type TolovlarProps = {
  sotuvlar: Sotuv[];
  qaytarishlar: Qaytarish[];
  onSotuvniOchish: (sotuv: Sotuv) => Promise<void> | void;
};

function turiBadge(tolov: TolovYozuvi, t: TFunction) {
  const kirim = tolov.turi === "KIRIM";
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
        kirim
          ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100"
          : "bg-red-50 text-red-600 ring-1 ring-red-100"
      }`}
    >
      {kirim ? t("tolovlar.turiOptions.kirim") : t("tolovlar.turiOptions.chiqim")}
    </span>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <tr key={index}>
          {Array.from({ length: 6 }).map((__, cellIndex) => (
            <td key={cellIndex} className="px-6 py-5">
              <div className="h-4 w-full max-w-[150px] animate-pulse rounded-full bg-orange-100/70" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function Tolovlar({ sotuvlar, qaytarishlar, onSotuvniOchish }: TolovlarProps) {
  const { t } = useTranslation("savdo_tolov");
  const [tanlanganTolov, setTanlanganTolov] = useState<TolovYozuvi | null>(null);

  const turiOptions = [
    { value: "BARCHASI", label: t("tolovlar.turiOptions.all") },
    { value: "KIRIM", label: t("tolovlar.turiOptions.kirim") },
    { value: "CHIQIM", label: t("tolovlar.turiOptions.chiqim") },
  ];

  const tolovTuriOptions = [
    { value: "BARCHASI", label: t("tolovlar.tolovTuriOptions.all") },
    { value: "CASH", label: t("tolovlar.tolovTuriOptions.cash") },
    { value: "CARD", label: t("tolovlar.tolovTuriOptions.card") },
    { value: "CLICK", label: t("tolovlar.tolovTuriOptions.click") },
    { value: "PAYME", label: t("tolovlar.tolovTuriOptions.payme") },
    { value: "BANK", label: t("tolovlar.tolovTuriOptions.bank") },
    { value: "OTHER", label: t("tolovlar.tolovTuriOptions.other") },
  ];
  const manbaOptions = [
    { value: "BARCHASI", label: t("tolovlar.manbaOptions.all") },
    { value: "SALE", label: t("tolovlar.manbaOptions.sale") },
    { value: "RETURN", label: t("tolovlar.manbaOptions.return") },
    { value: "CASH_IN", label: t("tolovlar.manbaOptions.cashIn") },
    { value: "EXPENSE", label: t("tolovlar.manbaOptions.expense") },
  ];

  const {
    rows,
    jami,
    currentPage,
    totalPages,
    filtrlar,
    yuklanmoqda,
    xatolik,
    refetch,
    filtrniYangilash,
  } = useTolovlar(sotuvlar, qaytarishlar);

  function tolovniOchish(tolov: TolovYozuvi) {
    if (tolov.sotuv) {
      void onSotuvniOchish(tolov.sotuv);
      return;
    }

    setTanlanganTolov(tolov);
  }

  return (
    <section className="rounded-[32px] border border-orange-100/70 bg-white/95 p-5 shadow-[0_24px_70px_rgba(37,99,235,.08)] sm:p-7">
      <div className="flex flex-col gap-4 border-b border-orange-100/80 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">{t("tolovlar.eyebrow")}</p>
          <h1 className="savdo-section-title mt-1">{t("tolovlar.title")}</h1>
          <p className="mt-1 text-sm font-semibold text-slate-400">
            {t("tolovlar.subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-orange-100 bg-white px-4 text-sm font-bold text-orange-600 shadow-sm transition hover:border-orange-200 hover:bg-orange-50 disabled:opacity-50"
          disabled={yuklanmoqda}
        >
          {yuklanmoqda ? <LoaderCircle className="animate-spin" size={16} /> : <RefreshCw size={16} />}
          {t("tolovlar.refreshButton")}
        </button>
      </div>

      <div className="grid gap-3 py-5 @min-[1130px]:grid-cols-[minmax(220px,1fr)_150px_170px_170px_150px_150px]">
        <label className="flex h-11 items-center gap-2 rounded-2xl border border-orange-100 bg-[#F8FAFC]/70 px-4 transition focus-within:border-orange-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-100">
          <Search size={18} className="shrink-0 text-orange-300" />
          <input
            value={filtrlar.search}
            onChange={(event) => filtrniYangilash({ search: event.target.value })}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400"
            placeholder={t("tolovlar.searchPlaceholder")}
          />
        </label>

        <SavdoSelect
          value={filtrlar.turi}
          onChange={(value) => filtrniYangilash({ turi: value as typeof filtrlar.turi })}
          options={turiOptions}
          portal
          buttonClassName="h-11 rounded-2xl px-4 text-sm"
        />
        <SavdoSelect value={filtrlar.manba} onChange={(value) => filtrniYangilash({ manba: value as typeof filtrlar.manba })} options={manbaOptions} portal buttonClassName="h-11 rounded-2xl px-4 text-sm" />
        <SavdoSelect
          value={filtrlar.tolovTuri}
          onChange={(value) => filtrniYangilash({ tolovTuri: value })}
          options={tolovTuriOptions}
          portal
          buttonClassName="h-11 rounded-2xl px-4 text-sm"
        />
        <input
          type="date"
          value={filtrlar.startDate}
          onChange={(event) => filtrniYangilash({ startDate: event.target.value })}
          className="h-11 rounded-2xl border border-orange-100 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
          aria-label={t("tolovlar.startDateAria")}
        />
        <input
          type="date"
          value={filtrlar.endDate}
          onChange={(event) => filtrniYangilash({ endDate: event.target.value })}
          className="h-11 rounded-2xl border border-orange-100 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
          aria-label={t("tolovlar.endDateAria")}
        />
      </div>

      {xatolik && (
        <div className="mb-5 flex items-start justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-600">
          <span>{xatolik}</span>
          <button type="button" onClick={() => void refetch()} className="font-black">
            {t("tolovlar.retry")}
          </button>
        </div>
      )}

      <div className="hidden overflow-hidden rounded-[24px] border border-orange-100 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left text-sm">
            <thead className="bg-[#F8FAFC] text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-4">{t("tolovlar.table.columns.sotuvId")}</th>
                <th className="px-6 py-4">{t("tolovlar.table.columns.mijoz")}</th>
                <th className="px-6 py-4">{t("tolovlar.table.columns.turi")}</th>
                <th className="px-6 py-4">{t("tolovlar.table.columns.tolovTuri")}</th>
                <th className="px-6 py-4">{t("tolovlar.table.columns.summa")}</th>
                <th className="px-6 py-4">{t("tolovlar.table.columns.sana")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-100/80 text-slate-800">
              {yuklanmoqda ? (
                <SkeletonRows />
              ) : (
                rows.map((tolov) => (
                  <tr
                    key={tolov.id}
                    onClick={() => tolovniOchish(tolov)}
                    className="cursor-pointer transition hover:bg-orange-50/55"
                    title={tolov.sotuv ? t("tolovlar.table.rowTitleSotuv") : t("tolovlar.table.rowTitleTolov")}
                  >
                    <td className="px-6 py-5 font-semibold text-slate-900">{tolov.sotuvId}</td>
                    <td className="px-6 py-5 font-bold">{tolov.mijoz}</td>
                    <td className="px-6 py-5">{turiBadge(tolov, t)}</td>
                    <td className="px-6 py-5 font-semibold text-slate-700">{tolovUsuliMatni(tolov.tolovTuri)}</td>
                    <td className={`px-6 py-5 font-black ${tolov.turi === "CHIQIM" ? "text-red-600" : "text-slate-950"}`}>
                      {tolov.turi === "CHIQIM" ? "-" : ""}
                      {tolovSummasiniFormatlash(tolov.summa)}
                    </td>
                    <td className="px-6 py-5 text-slate-600">{tolovSanasiniFormatlash(tolov.sana)}</td>
                  </tr>
                ))
              )}

              {!yuklanmoqda && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <CreditCard className="mx-auto text-orange-200" size={42} />
                    <p className="mt-3 text-lg font-black text-slate-700">{t("tolovlar.table.emptyTitle")}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-400">
                      {t("tolovlar.table.emptyHint")}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-3 md:hidden">
        {yuklanmoqda
          ? Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
                <div className="h-4 w-32 animate-pulse rounded-full bg-orange-100" />
                <div className="mt-3 h-4 w-44 animate-pulse rounded-full bg-orange-100" />
                <div className="mt-4 h-8 w-full animate-pulse rounded-xl bg-orange-100" />
              </div>
            ))
          : rows.map((tolov) => (
              <article
                key={tolov.id}
                onClick={() => tolovniOchish(tolov)}
                className="cursor-pointer rounded-2xl border border-orange-100 bg-white p-4 shadow-sm transition hover:bg-orange-50/45"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-orange-600">{tolov.sotuvId}</p>
                    <p className="mt-1 text-sm font-bold text-slate-800">{tolov.mijoz}</p>
                  </div>
                  {turiBadge(tolov, t)}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-400">{t("tolovlar.mobile.tolovTuri")}</p>
                    <p className="mt-1 font-bold text-slate-700">{tolovUsuliMatni(tolov.tolovTuri)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-slate-400">{t("tolovlar.mobile.summa")}</p>
                    <p className={`mt-1 font-black ${tolov.turi === "CHIQIM" ? "text-red-600" : "text-slate-950"}`}>
                      {tolov.turi === "CHIQIM" ? "-" : ""}
                      {tolovSummasiniFormatlash(tolov.summa)}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-xs font-semibold text-slate-400">
                  {t("tolovlar.mobile.sana", { sana: tolovSanasiniFormatlash(tolov.sana) })}
                </p>
              </article>
            ))}

        {!yuklanmoqda && rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/40 p-8 text-center">
            <WalletCards className="mx-auto text-orange-300" size={36} />
            <p className="mt-3 font-black text-slate-700">{t("tolovlar.mobile.emptyTitle")}</p>
          </div>
        )}
      </div>

      <div className="table-pagination mt-5 flex flex-col gap-3 text-sm font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>
          {t("tolovlar.pagination.summary", { jami, currentPage, totalPages })}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => filtrniYangilash({ page: Math.max(currentPage - 1, 1) })}
            className="h-10 rounded-xl border border-orange-100 bg-white px-4 transition hover:border-orange-300 hover:text-orange-600 disabled:opacity-40"
          >
            {t("tolovlar.pagination.prev")}
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => filtrniYangilash({ page: Math.min(currentPage + 1, totalPages) })}
            className="h-10 rounded-xl border border-orange-100 bg-white px-4 transition hover:border-orange-300 hover:text-orange-600 disabled:opacity-40"
          >
            {t("tolovlar.pagination.next")}
          </button>
        </div>
      </div>

      {tanlanganTolov && (
        <TolovTafsilotlariModal
          tolov={tanlanganTolov}
          onYopish={() => setTanlanganTolov(null)}
        />
      )}
    </section>
  );
}

function TolovTafsilotlariModal({
  tolov,
  onYopish,
}: {
  tolov: TolovYozuvi;
  onYopish: () => void;
}) {
  const { t } = useTranslation("savdo_tolov");

  return (
    <AppModal>
      <div className="w-full max-w-2xl overflow-hidden rounded-[32px] border border-orange-100 bg-[#F8FAFC] shadow-[0_30px_90px_rgba(15,23,42,.24)]">
        <div className="flex items-start justify-between gap-4 border-b border-orange-100 bg-white/70 px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">{t("tolovlar.modal.eyebrow")}</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">{tolov.sotuvId}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-400">{tolov.mijoz}</p>
          </div>
          <button
            type="button"
            onClick={onYopish}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm ring-1 ring-orange-100 transition hover:bg-orange-50 hover:text-orange-600"
            aria-label={t("tolovlar.modal.closeAria")}
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-[1fr_220px]">
          <div className="rounded-[24px] border border-orange-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-black uppercase text-slate-400">{t("tolovlar.modal.amountLabel")}</p>
            <p className={`mt-3 text-4xl font-light tracking-wide ${tolov.turi === "CHIQIM" ? "text-red-600" : "text-slate-700"}`}>
              {tolov.turi === "CHIQIM" ? "-" : ""}
              {tolovSummasiniFormatlash(tolov.summa)}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {turiBadge(tolov, t)}
              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-600 ring-1 ring-orange-100">
                {tolovUsuliMatni(tolov.tolovTuri)}
              </span>
            </div>
          </div>

          <div className="rounded-[24px] border border-orange-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-black uppercase text-slate-400">{t("tolovlar.modal.manbaLabel")}</p>
            <p className="mt-3 text-lg font-black text-slate-800">
              {tolov.manba === "CASH_IN"
                ? t("tolovlar.modal.manba.cashIn")
                : tolov.manba === "EXPENSE"
                  ? t("tolovlar.modal.manba.expense")
                  : tolov.manba === "RETURN"
                    ? t("tolovlar.modal.manba.return")
                    : t("tolovlar.modal.manba.sale")}
            </p>
            <p className="mt-4 text-sm font-semibold text-slate-400">{t("tolovlar.modal.sanaLabel")}</p>
            <p className="mt-1 font-bold text-slate-700">{tolovSanasiniFormatlash(tolov.sana)}</p>
          </div>

          <div className="rounded-[24px] border border-orange-100 bg-white p-5 shadow-sm md:col-span-2">
            <p className="text-sm font-black uppercase text-slate-400">{t("tolovlar.modal.summaryLabel")}</p>
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              <Info label={t("tolovlar.modal.info.sotuvId")} value={tolov.sotuvId} />
              <Info label={t("tolovlar.modal.info.mijoz")} value={tolov.mijoz} />
              <Info label={t("tolovlar.modal.info.turi")} value={tolov.turi === "KIRIM" ? t("tolovlar.turiOptions.kirim") : t("tolovlar.turiOptions.chiqim")} />
              <Info label={t("tolovlar.modal.info.tolovTuri")} value={tolovUsuliMatni(tolov.tolovTuri)} />
            </div>
          </div>
        </div>
      </div>
    </AppModal>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#F8FAFC]/70 px-4 py-3">
      <p className="text-xs font-black uppercase text-slate-400">{label}</p>
      <p className="mt-1 font-bold text-slate-800">{value}</p>
    </div>
  );
}
