import { useState } from "react";
import { CreditCard, LoaderCircle, RefreshCw, Search, WalletCards, X } from "lucide-react";
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

const turiOptions = [
  { value: "BARCHASI", label: "Barcha turlar" },
  { value: "KIRIM", label: "Kirim" },
  { value: "CHIQIM", label: "Chiqim" },
];

const tolovTuriOptions = [
  { value: "BARCHASI", label: "Barcha to'lovlar" },
  { value: "CASH", label: "Naqd" },
  { value: "CARD", label: "Karta" },
  { value: "CLICK", label: "Click" },
  { value: "PAYME", label: "Payme" },
  { value: "BANK", label: "Bank" },
  { value: "OTHER", label: "Boshqa" },
];
const manbaOptions = [
  { value: "BARCHASI", label: "Barcha manbalar" }, { value: "SALE", label: "Sotuv" },
  { value: "RETURN", label: "Qaytarim" }, { value: "CASH_IN", label: "Kassa kirimi" }, { value: "EXPENSE", label: "Xarajat" },
];

function turiBadge(tolov: TolovYozuvi) {
  const kirim = tolov.turi === "KIRIM";
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
        kirim
          ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100"
          : "bg-red-50 text-red-600 ring-1 ring-red-100"
      }`}
    >
      {kirim ? "Kirim" : "Chiqim"}
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
  const [tanlanganTolov, setTanlanganTolov] = useState<TolovYozuvi | null>(null);
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
    <section className="rounded-[32px] border border-orange-100/70 bg-white/95 p-5 shadow-[0_24px_70px_rgba(249,115,22,.08)] sm:p-7">
      <div className="flex flex-col gap-4 border-b border-orange-100/80 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">Savdo</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">To'lovlar</h1>
          <p className="mt-1 text-sm font-semibold text-slate-400">
            Sotuv, qaytarim, kassa kirimi va xarajatlar real backenddan olinadi.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-orange-100 bg-white px-4 text-sm font-bold text-orange-600 shadow-sm transition hover:border-orange-200 hover:bg-orange-50 disabled:opacity-50"
          disabled={yuklanmoqda}
        >
          {yuklanmoqda ? <LoaderCircle className="animate-spin" size={16} /> : <RefreshCw size={16} />}
          Yangilash
        </button>
      </div>

      <div className="grid gap-3 py-5 lg:grid-cols-[minmax(220px,1fr)_150px_170px_170px_150px_150px]">
        <label className="flex h-11 items-center gap-2 rounded-2xl border border-orange-100 bg-[#FFF8EF]/70 px-4 transition focus-within:border-orange-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-100">
          <Search size={18} className="shrink-0 text-orange-300" />
          <input
            value={filtrlar.search}
            onChange={(event) => filtrniYangilash({ search: event.target.value })}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400"
            placeholder="Sotuv ID, mijoz yoki to'lov turi"
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
          aria-label="Boshlanish sanasi"
        />
        <input
          type="date"
          value={filtrlar.endDate}
          onChange={(event) => filtrniYangilash({ endDate: event.target.value })}
          className="h-11 rounded-2xl border border-orange-100 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
          aria-label="Tugash sanasi"
        />
      </div>

      {xatolik && (
        <div className="mb-5 flex items-start justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-600">
          <span>{xatolik}</span>
          <button type="button" onClick={() => void refetch()} className="font-black">
            Qayta urinish
          </button>
        </div>
      )}

      <div className="hidden overflow-hidden rounded-[24px] border border-orange-100 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left text-sm">
            <thead className="bg-[#FFF8EF] text-xs font-black uppercase tracking-wide text-orange-700/70">
              <tr>
                <th className="px-6 py-4">Sotuv ID</th>
                <th className="px-6 py-4">Mijoz</th>
                <th className="px-6 py-4">Turi</th>
                <th className="px-6 py-4">To'lov turi</th>
                <th className="px-6 py-4">Summa</th>
                <th className="px-6 py-4">Sana</th>
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
                    title={tolov.sotuv ? "Sotuv tafsilotlarini ochish" : "To'lov tafsilotlarini ochish"}
                  >
                    <td className="px-6 py-5 font-black text-orange-600">{tolov.sotuvId}</td>
                    <td className="px-6 py-5 font-bold">{tolov.mijoz}</td>
                    <td className="px-6 py-5">{turiBadge(tolov)}</td>
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
                    <p className="mt-3 text-lg font-black text-slate-700">To'lovlar topilmadi</p>
                    <p className="mt-1 text-sm font-semibold text-slate-400">
                      Filterlarni o'zgartiring yoki backendda to'lov yozuvlari yaratilishini kuting.
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
                  {turiBadge(tolov)}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-400">To'lov turi</p>
                    <p className="mt-1 font-bold text-slate-700">{tolovUsuliMatni(tolov.tolovTuri)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-slate-400">Summa</p>
                    <p className={`mt-1 font-black ${tolov.turi === "CHIQIM" ? "text-red-600" : "text-slate-950"}`}>
                      {tolov.turi === "CHIQIM" ? "-" : ""}
                      {tolovSummasiniFormatlash(tolov.summa)}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-xs font-semibold text-slate-400">
                  Sana: {tolovSanasiniFormatlash(tolov.sana)}
                </p>
              </article>
            ))}

        {!yuklanmoqda && rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/40 p-8 text-center">
            <WalletCards className="mx-auto text-orange-300" size={36} />
            <p className="mt-3 font-black text-slate-700">To'lovlar topilmadi</p>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-3 text-sm font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Jami: {jami} ta to'lov. Sahifa {currentPage}/{totalPages}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => filtrniYangilash({ page: Math.max(currentPage - 1, 1) })}
            className="h-10 rounded-xl border border-orange-100 bg-white px-4 transition hover:border-orange-300 hover:text-orange-600 disabled:opacity-40"
          >
            Oldingi
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => filtrniYangilash({ page: Math.min(currentPage + 1, totalPages) })}
            className="h-10 rounded-xl border border-orange-100 bg-white px-4 transition hover:border-orange-300 hover:text-orange-600 disabled:opacity-40"
          >
            Keyingi
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
  return (
    <AppModal>
      <div className="w-full max-w-2xl overflow-hidden rounded-[32px] border border-orange-100 bg-[#FFF8EF] shadow-[0_30px_90px_rgba(15,23,42,.24)]">
        <div className="flex items-start justify-between gap-4 border-b border-orange-100 bg-white/70 px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">To'lov tafsilotlari</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">{tolov.sotuvId}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-400">{tolov.mijoz}</p>
          </div>
          <button
            type="button"
            onClick={onYopish}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm ring-1 ring-orange-100 transition hover:bg-orange-50 hover:text-orange-600"
            aria-label="Modalni yopish"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-[1fr_220px]">
          <div className="rounded-[24px] border border-orange-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-black uppercase text-slate-400">Miqdor va valyuta</p>
            <p className={`mt-3 text-4xl font-light tracking-wide ${tolov.turi === "CHIQIM" ? "text-red-600" : "text-slate-700"}`}>
              {tolov.turi === "CHIQIM" ? "-" : ""}
              {tolovSummasiniFormatlash(tolov.summa)}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {turiBadge(tolov)}
              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-600 ring-1 ring-orange-100">
                {tolovUsuliMatni(tolov.tolovTuri)}
              </span>
            </div>
          </div>

          <div className="rounded-[24px] border border-orange-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-black uppercase text-slate-400">Manba</p>
            <p className="mt-3 text-lg font-black text-slate-800">
              {tolov.manba === "CASH_IN"
                ? "Kassa kirimi"
                : tolov.manba === "EXPENSE"
                  ? "Xarajat"
                  : tolov.manba === "RETURN"
                    ? "Qaytarim"
                    : "Sotuv"}
            </p>
            <p className="mt-4 text-sm font-semibold text-slate-400">Sana</p>
            <p className="mt-1 font-bold text-slate-700">{tolovSanasiniFormatlash(tolov.sana)}</p>
          </div>

          <div className="rounded-[24px] border border-orange-100 bg-white p-5 shadow-sm md:col-span-2">
            <p className="text-sm font-black uppercase text-slate-400">Umumiy ma'lumot</p>
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              <Info label="Sotuv / hujjat ID" value={tolov.sotuvId} />
              <Info label="Mijoz / manba" value={tolov.mijoz} />
              <Info label="Turi" value={tolov.turi === "KIRIM" ? "Kirim" : "Chiqim"} />
              <Info label="To'lov turi" value={tolovUsuliMatni(tolov.tolovTuri)} />
            </div>
          </div>
        </div>
      </div>
    </AppModal>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#FFF8EF]/70 px-4 py-3">
      <p className="text-xs font-black uppercase text-slate-400">{label}</p>
      <p className="mt-1 font-bold text-slate-800">{value}</p>
    </div>
  );
}
