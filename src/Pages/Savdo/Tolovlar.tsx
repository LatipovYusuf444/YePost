import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Banknote, CreditCard, Landmark, LoaderCircle, ReceiptText, RefreshCw, Scale, Search, Wallet, WalletCards, X } from "lucide-react";
import JadvalYuklanmoqda from "./JadvalYuklanmoqda";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useTolovlar } from "@/hooks/useTolovlar";
import type { Qaytarish, Sotuv } from "@/types/savdo";
import type { TolovYozuvi } from "@/types/tolov";
import { tolovSanasiniFormatlash, tolovSummasiniFormatlash, tolovUsuliMatni } from "@/utils/tolovFormatters";
import AppModal from "@/Components/common/AppModal";
import SavdoSelect from "./SavdoSelect";
import TablePagination from "@/Components/common/TablePagination";
import DateRangePicker from "@/Components/ui/DateRangePicker";
import KorinishTanlash, { type RoyxatKorinishi } from "@/Pages/Ombor/KorinishTanlash";

type TolovlarProps = {
  sotuvlar: Sotuv[];
  qaytarishlar: Qaytarish[];
  onSotuvniOchish: (sotuv: Sotuv) => Promise<void> | void;
};

function turiBadge(tolov: TolovYozuvi, t: TFunction) {
  const kirim = tolov.turi === "KIRIM";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${
        kirim
          ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100"
          : "bg-red-50 text-red-600 ring-1 ring-red-100"
      }`}
    >
      {kirim ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
      {kirim ? t("tolovlar.turiOptions.kirim") : t("tolovlar.turiOptions.chiqim")}
    </span>
  );
}

function tolovIkonkasi(turi: string, size = 15) {
  switch (String(turi).toUpperCase()) {
    case "CASH":
      return <Banknote size={size} />;
    case "CARD":
      return <CreditCard size={size} />;
    case "BANK":
      return <Landmark size={size} />;
    default:
      return <Wallet size={size} />;
  }
}

function boshHarflar(nom: string) {
  return nom
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((qism) => qism[0]?.toUpperCase())
    .join("");
}

export default function Tolovlar({ sotuvlar, qaytarishlar, onSotuvniOchish }: TolovlarProps) {
  const { t } = useTranslation("savdo_tolov");
  const [tanlanganTolov, setTanlanganTolov] = useState<TolovYozuvi | null>(null);
  // Standart ko'rinish — jadval; kartochka ko'rinishi barcha ekranlarda.
  const [korinish, setKorinish] = useState<RoyxatKorinishi>("jadval");

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
    xulosa,
    currentPage,
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
        <div className="flex flex-wrap items-center gap-2">
        <KorinishTanlash
          qiymat={korinish}
          onChange={setKorinish}
          sarlavha={t("tolovlar.viewToggle")}
          jadvalMatni={t("tolovlar.viewTable")}
          kartochkaMatni={t("tolovlar.viewCards")}
        />
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
      </div>

      <section className="grid gap-4 pt-5 sm:grid-cols-2 xl:grid-cols-4" aria-label={t("tolovlar.title")}>
        {[
          { kalit: "kirim", label: t("tolovlar.stat.kirim"), qiymat: tolovSummasiniFormatlash(xulosa.kirim), ikonka: ArrowDownLeft, stil: "from-emerald-400 to-emerald-600 shadow-emerald-200", chegara: "border-emerald-100", matn: "text-slate-900" },
          { kalit: "chiqim", label: t("tolovlar.stat.chiqim"), qiymat: tolovSummasiniFormatlash(xulosa.chiqim), ikonka: ArrowUpRight, stil: "from-rose-400 to-rose-600 shadow-rose-200", chegara: "border-rose-100", matn: "text-slate-900" },
          { kalit: "balans", label: t("tolovlar.stat.balans"), qiymat: tolovSummasiniFormatlash(xulosa.kirim - xulosa.chiqim), ikonka: Scale, stil: "from-blue-500 to-blue-700 shadow-blue-200", chegara: "border-blue-100", matn: xulosa.kirim - xulosa.chiqim < 0 ? "text-rose-600" : "text-slate-900" },
          { kalit: "soni", label: t("tolovlar.stat.soni"), qiymat: String(jami), ikonka: ReceiptText, stil: "from-violet-500 to-violet-700 shadow-violet-200", chegara: "border-violet-100", matn: "text-slate-900" },
        ].map((karta) => {
          const Ikonka = karta.ikonka;
          return (
            <div
              key={karta.kalit}
              className={`group flex items-center gap-4 rounded-[22px] border bg-gradient-to-br from-white to-slate-50/70 p-5 shadow-[0_5px_18px_rgba(15,23,42,.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(15,23,42,.10)] ${karta.chegara}`}
            >
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md transition duration-300 group-hover:-rotate-6 group-hover:scale-105 ${karta.stil}`}>
                <Ikonka size={22} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-500">{karta.label}</p>
                {xulosa.yuklanmoqda && karta.kalit !== "soni" ? (
                  <div className="mt-2 h-7 w-32 animate-pulse rounded-lg bg-slate-100" />
                ) : (
                  <p className={`mt-1 truncate text-2xl font-black leading-none tracking-tight tabular-nums ${karta.matn}`}>{karta.qiymat}</p>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <div className="grid gap-3 py-5 @min-[1130px]:grid-cols-[minmax(220px,1fr)_150px_170px_170px_240px]">
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
        <DateRangePicker
          from={filtrlar.startDate}
          to={filtrlar.endDate}
          onChange={(from, to) => filtrniYangilash({ startDate: from, endDate: to })}
          compact
          className="h-11"
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

      <div className={`overflow-hidden rounded-[24px] border border-orange-100 bg-white shadow-sm ${korinish === "jadval" ? "hidden md:block" : "hidden"}`}>
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
                <tr>
                  <td colSpan={6} className="p-0">
                    <JadvalYuklanmoqda ikonka={<CreditCard size={24} />} />
                  </td>
                </tr>
              ) : (
                rows.map((tolov) => (
                  <tr
                    key={tolov.id}
                    onClick={() => tolovniOchish(tolov)}
                    className="cursor-pointer transition hover:bg-orange-50/55"
                    title={tolov.sotuv ? t("tolovlar.table.rowTitleSotuv") : t("tolovlar.table.rowTitleTolov")}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#2563EB] ring-1 ring-orange-100">
                          <ReceiptText size={18} />
                        </span>
                        <span className="font-black tabular-nums text-slate-900">{tolov.sotuvId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-50 text-[11px] font-black text-[#2563EB] ring-1 ring-orange-100">
                          {boshHarflar(tolov.mijoz) || "—"}
                        </span>
                        <span className="truncate font-bold">{tolov.mijoz}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{turiBadge(tolov, t)}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-100">
                        <span className="text-slate-400">{tolovIkonkasi(tolov.tolovTuri, 14)}</span>
                        {tolovUsuliMatni(tolov.tolovTuri)}
                      </span>
                    </td>
                    <td className={`whitespace-nowrap px-6 py-4 font-black tabular-nums ${tolov.turi === "CHIQIM" ? "text-red-600" : "text-emerald-700"}`}>
                      {tolov.turi === "CHIQIM" ? "-" : "+"}
                      {tolovSummasiniFormatlash(tolov.summa)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-600">{tolovSanasiniFormatlash(tolov.sana)}</td>
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

      <div className={`grid gap-4 ${korinish === "kartochka" ? "sm:grid-cols-2 xl:grid-cols-3" : "md:hidden"}`}>
        {yuklanmoqda ? (
          <div className="col-span-full">
            <JadvalYuklanmoqda ikonka={<CreditCard size={24} />} className="min-h-[260px]" />
          </div>
        ) : (
          rows.map((tolov) => {
            const chiqim = tolov.turi === "CHIQIM";
            return (
              <article
                key={tolov.id}
                onClick={() => tolovniOchish(tolov)}
                title={tolov.sotuv ? t("tolovlar.table.rowTitleSotuv") : t("tolovlar.table.rowTitleTolov")}
                className="group cursor-pointer overflow-hidden rounded-[22px] border border-orange-100 bg-white shadow-[0_10px_30px_rgba(37,99,235,.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(37,99,235,.12)]"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#2563EB] ring-1 ring-orange-100 transition duration-300 group-hover:-rotate-6 group-hover:scale-105">
                        <ReceiptText size={20} />
                      </span>
                      <p className="truncate font-black tabular-nums text-slate-900">{tolov.sotuvId}</p>
                    </div>
                    {turiBadge(tolov, t)}
                  </div>

                  <p className={`mt-5 text-2xl font-black tracking-tight tabular-nums ${chiqim ? "text-red-600" : "text-emerald-700"}`}>
                    {chiqim ? "-" : "+"}
                    {tolovSummasiniFormatlash(tolov.summa)}
                  </p>

                  <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-slate-50 px-3.5 py-3 ring-1 ring-slate-100">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-50 text-[11px] font-black text-[#2563EB] ring-1 ring-orange-100">
                      {boshHarflar(tolov.mijoz) || "—"}
                    </span>
                    <span className="truncate text-sm font-bold text-slate-800">{tolov.mijoz}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-orange-100 bg-orange-50/40 px-5 py-3">
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-100">
                    <span className="text-slate-400">{tolovIkonkasi(tolov.tolovTuri, 14)}</span>
                    {tolovUsuliMatni(tolov.tolovTuri)}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">{tolovSanasiniFormatlash(tolov.sana)}</span>
                </div>
              </article>
            );
          })
        )}

        {!yuklanmoqda && rows.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-orange-200 bg-orange-50/40 p-8 text-center">
            <WalletCards className="mx-auto text-orange-300" size={36} />
            <p className="mt-3 font-black text-slate-700">{t("tolovlar.mobile.emptyTitle")}</p>
          </div>
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-orange-100 bg-white">
        <TablePagination page={currentPage} pageSize={filtrlar.pageSize} totalItems={jami} onPageChange={(page) => filtrniYangilash({ page })} onPageSizeChange={(pageSize) => filtrniYangilash({ pageSize, page: 1 })} />
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
