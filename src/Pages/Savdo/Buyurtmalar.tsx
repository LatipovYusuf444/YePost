import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  AlarmClock,
  Ban,
  Boxes,
  CalendarClock,
  ChevronRight,
  CircleCheck,
  ClipboardList,
  MapPin,
  PackageCheck,
  PackageOpen,
  Phone,
  ReceiptText,
  RefreshCw,
  Search,
  TriangleAlert,
  Truck,
  X,
  type LucideIcon,
} from "lucide-react";
import TablePagination from "@/Components/common/TablePagination";
import HujjatOchirish from "@/Components/common/HujjatOchirish";
import JadvalYuklanmoqda from "./JadvalYuklanmoqda";
import { BUYURTMA_HOLATLARI, buyurtmalarApi, type Buyurtma, type BuyurtmaHolati } from "@/api/buyurtmalarApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { Sotuv } from "@/types/savdo";
import { masulNomi, mijozNomi, pulniFormatlash, sananiFormatlash, sotuvRaqami, sotuvSummasi } from "./savdoYordamchilari";

type Props = {
  onSotuvniOchish: (sotuv: Sotuv) => void;
  onOchirish: (sotuvId: string) => Promise<boolean>;
  onTiklash: (sotuvId: string) => Promise<boolean>;
};

type TabId = "ALL" | BuyurtmaHolati;

// Har bir holat uchun: ikonka plitkasi, belgi (badge), tanlangan plitka halqasi va nuqta rangi.
// `orange-*` ishlatilmaydi: loyihada u tema rangiga almashtirilgan.
const HOLAT_USLUBI: Record<BuyurtmaHolati, { icon: LucideIcon; tile: string; belgi: string; halqa: string; nuqta: string }> = {
  NEW: {
    icon: ClipboardList,
    tile: "from-blue-500 to-indigo-500 shadow-blue-500/30",
    belgi: "bg-blue-50 text-blue-700 ring-blue-100",
    halqa: "ring-blue-400 bg-blue-50/60",
    nuqta: "bg-blue-500",
  },
  CONFIRMED: {
    icon: CircleCheck,
    tile: "from-sky-500 to-cyan-500 shadow-sky-500/30",
    belgi: "bg-sky-50 text-sky-700 ring-sky-100",
    halqa: "ring-sky-400 bg-sky-50/60",
    nuqta: "bg-sky-500",
  },
  DELIVERING: {
    icon: Truck,
    tile: "from-amber-500 to-yellow-500 shadow-amber-500/30",
    belgi: "bg-amber-50 text-amber-700 ring-amber-100",
    halqa: "ring-amber-400 bg-amber-50/60",
    nuqta: "bg-amber-500",
  },
  COMPLETED: {
    icon: PackageCheck,
    tile: "from-emerald-500 to-teal-500 shadow-emerald-500/30",
    belgi: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    halqa: "ring-emerald-400 bg-emerald-50/60",
    nuqta: "bg-emerald-500",
  },
  CANCELLED: {
    icon: Ban,
    tile: "from-rose-500 to-pink-500 shadow-rose-500/30",
    belgi: "bg-rose-50 text-rose-700 ring-rose-100",
    halqa: "ring-rose-400 bg-rose-50/60",
    nuqta: "bg-rose-500",
  },
};

// Backend sotuv raqamini `docNumber` (SOT-000007) sifatida qaytaradi — Kassa va Ombor sahifalarida ham shu ko'rinadi.
function buyurtmaRaqami(buyurtma: Buyurtma) {
  return buyurtma.docNumber || buyurtma.documentNumber || buyurtma.number || sotuvRaqami(buyurtma);
}

function buyurtmaHolati(buyurtma: Buyurtma): BuyurtmaHolati {
  const holat = String(buyurtma.orderStatus ?? "").toUpperCase();
  return (BUYURTMA_HOLATLARI as string[]).includes(holat) ? (holat as BuyurtmaHolati) : "NEW";
}

// Mahalliy kun "YYYY-MM-DD" (UTC emas).
function mahalliyKun(sana: Date) {
  return `${sana.getFullYear()}-${String(sana.getMonth() + 1).padStart(2, "0")}-${String(sana.getDate()).padStart(2, "0")}`;
}

// Tasdiqlangan yoki yo'ldagi buyurtmaning rejalashtirilgan kuni bugundan oldin bo'lsa — kechikkan.
function kechikkanmi(buyurtma: Buyurtma, holat: BuyurtmaHolati) {
  if (holat !== "CONFIRMED" && holat !== "DELIVERING") return false;
  const reja = buyurtma.delivery?.scheduledAt;
  if (!reja) return false;
  const sana = new Date(reja);
  return !Number.isNaN(sana.getTime()) && mahalliyKun(sana) < mahalliyKun(new Date());
}

function bosHarflar(nom: string) {
  const soz = nom.trim().split(/\s+/).filter(Boolean);
  return ((soz[0]?.[0] ?? "") + (soz[1]?.[0] ?? "")).toUpperCase() || "—";
}

// Savdo → Buyurtmalar: yetkazishi bor sotuvlar. Ro'yxat va tab sonlari backenddan (GET /orders, /orders/counts),
// qidiruv va sahifalash ham backend tomonida. Qator bosilsa sotuv tafsiloti ochiladi (yetkazishni boshqarish shu yerda).
export default function Buyurtmalar({ onSotuvniOchish, onOchirish, onTiklash }: Props) {
  const { t } = useTranslation("savdo_kichik");
  const [tab, setTab] = useState<TabId>("ALL");
  const [qidiruv, setQidiruv] = useState("");
  const [qidiruvSoz, setQidiruvSoz] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [royxat, setRoyxat] = useState<Buyurtma[]>([]);
  const [jami, setJami] = useState(0);
  const [sonlar, setSonlar] = useState<Record<string, number>>({});
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [xatolik, setXatolik] = useState("");
  const sorovRaqami = useRef(0);

  // Qidiruv matni yozilib bo'lgach (400 ms) so'rov yuboriladi.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQidiruvSoz(qidiruv.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [qidiruv]);

  const yuklash = useCallback(async () => {
    const raqam = ++sorovRaqami.current;
    setYuklanmoqda(true);
    setXatolik("");
    try {
      const [sahifa, hisob] = await Promise.all([
        buyurtmalarApi.royxat({ status: tab === "ALL" ? undefined : tab, search: qidiruvSoz || undefined, page, pageSize }),
        buyurtmalarApi.sonlari().catch(() => null),
      ]);
      if (raqam !== sorovRaqami.current) return;
      setRoyxat(sahifa.items);
      setJami(sahifa.total);
      if (hisob) setSonlar(hisob);
    } catch (error) {
      if (raqam !== sorovRaqami.current) return;
      setXatolik(getApiErrorMessage(error));
    } finally {
      if (raqam === sorovRaqami.current) setYuklanmoqda(false);
    }
  }, [page, pageSize, qidiruvSoz, tab]);

  useEffect(() => {
    void yuklash();
  }, [yuklash]);

  // Sotuv boshqa joyda (tafsilot oynasi, Kassa) o'zgarsa buyurtmalar ro'yxati ham yangilansin.
  useEffect(() => {
    const yangilash = () => void yuklash();
    window.addEventListener("savdo:yangilandi", yangilash);
    return () => window.removeEventListener("savdo:yangilandi", yangilash);
  }, [yuklash]);

  async function ochirish(sotuvId: string) {
    const ok = await onOchirish(sotuvId);
    await yuklash();
    return ok;
  }

  async function tiklash(sotuvId: string) {
    const ok = await onTiklash(sotuvId);
    await yuklash();
    return ok;
  }

  const barchasiSoni = sonlar.TOTAL ?? sonlar.ALL ?? BUYURTMA_HOLATLARI.reduce((yigindi, holat) => yigindi + (sonlar[holat] ?? 0), 0);
  const tablar: Array<{ id: TabId; nom: string; soni?: number }> = [
    { id: "ALL", nom: t("buyurtmalar.tabs.ALL"), soni: Object.keys(sonlar).length ? barchasiSoni : undefined },
    ...BUYURTMA_HOLATLARI.map((holat) => ({ id: holat, nom: t(`buyurtmalar.tabs.${holat}`), soni: sonlar[holat] })),
  ];
  const filtrFaol = tab !== "ALL" || qidiruvSoz !== "";
  const birinchiYuklanish = yuklanmoqda && royxat.length === 0;

  function filtrniTozalash() {
    setTab("ALL");
    setQidiruv("");
    setQidiruvSoz("");
    setPage(1);
  }

  // Harakatlar (o'chirish/tiklash) qator bosilishini ishga tushirmasligi uchun.
  const toxtat = (event: MouseEvent) => event.stopPropagation();

  return (
    <section className="overflow-hidden rounded-[34px] border border-orange-100 bg-gradient-to-br from-[#F8FAFC] via-white to-[#EFF6FF] shadow-[0_28px_90px_rgba(15,23,42,.12)] ring-1 ring-white/80">
      <div className="relative overflow-hidden border-b border-orange-100 px-6 py-7 sm:px-9">
        <div aria-hidden className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-orange-200/30 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-sky-500 to-indigo-500 text-white shadow-lg shadow-sky-500/30">
              <Truck size={26} strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[.22em] text-orange-500">{t("buyurtmalar.eyebrow")}</p>
              <h1 className="savdo-section-title mt-1">{t("buyurtmalar.title")}</h1>
              <p className="mt-1 max-w-xl text-[13px] font-medium leading-5 text-slate-500">{t("buyurtmalar.subtitle")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void yuklash()}
            disabled={yuklanmoqda}
            className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
          >
            <RefreshCw size={17} className={yuklanmoqda ? "animate-spin" : ""} /> {t("buyurtmalar.refresh")}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-b border-orange-100 bg-white/55 px-6 py-5 backdrop-blur sm:px-9">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6" role="tablist" aria-label={t("buyurtmalar.title")}>
          {tablar.map((item) => {
            const faol = tab === item.id;
            const uslub = item.id === "ALL" ? null : HOLAT_USLUBI[item.id];
            const Ikona = uslub?.icon ?? Boxes;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={faol}
                onClick={() => {
                  setTab(item.id);
                  setPage(1);
                }}
                className={`group grid min-w-0 cursor-pointer grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 rounded-2xl border px-3.5 py-3 text-left transition-[box-shadow,background-color] duration-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 motion-reduce:transition-none sm:flex sm:gap-y-0 ${
                  faol ? `border-transparent ring-2 shadow-sm ${uslub?.halqa ?? "ring-orange-400 bg-orange-50/60"}` : "border-slate-200/70 bg-white"
                }`}
              >
                <span
                  aria-hidden
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-lg ${
                    uslub ? `bg-linear-to-br ${uslub.tile}` : "bg-linear-to-br from-slate-600 to-slate-800 shadow-slate-500/30"
                  }`}
                >
                  <Ikona size={18} strokeWidth={2.2} />
                </span>
                <span className="contents sm:block sm:min-w-0">
                  <span className="block text-right text-2xl font-extrabold leading-none tabular-nums text-slate-950 sm:text-left">{item.soni ?? "—"}</span>
                  <span className="col-span-2 block truncate text-xs font-semibold text-slate-500 sm:mt-1">{item.nom}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex h-12 w-full items-center gap-3 rounded-2xl border border-orange-100 bg-white px-4 shadow-sm transition focus-within:border-orange-300 focus-within:ring-4 focus-within:ring-orange-50 sm:max-w-xl">
            <Search size={18} className="shrink-0 text-orange-400" aria-hidden />
            <input
              value={qidiruv}
              onChange={(event) => setQidiruv(event.target.value)}
              placeholder={t("buyurtmalar.searchPlaceholder")}
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 outline-none"
            />
            {qidiruv && (
              <button type="button" onClick={() => setQidiruv("")} aria-label={t("buyurtmalar.clearFilter")} className="cursor-pointer rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                <X size={15} />
              </button>
            )}
          </label>
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
            {!birinchiYuklanish && !xatolik && <span className="tabular-nums">{t("buyurtmalar.resultCount", { count: jami })}</span>}
            {filtrFaol && (
              <button type="button" onClick={filtrniTozalash} className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50">
                <X size={13} aria-hidden /> {t("buyurtmalar.clearFilter")}
              </button>
            )}
          </div>
        </div>
      </div>

      {xatolik && (
        <div role="alert" className="mx-6 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700 sm:mx-9">
          <span className="flex items-center gap-2"><TriangleAlert size={17} aria-hidden /> {xatolik}</span>
          <button type="button" onClick={() => void yuklash()} className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-100">
            <RefreshCw size={13} aria-hidden /> {t("buyurtmalar.retry")}
          </button>
        </div>
      )}

      {royxat.length > 0 && (
        <div className={`transition-opacity duration-200 ${yuklanmoqda ? "opacity-60" : ""}`}>
          {/* Katta ekran: jadval */}
          <div className="hidden overflow-x-auto bg-white/70 lg:block">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-[#EFF6FF] text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-8 py-4">{t("buyurtmalar.columns.buyurtma")}</th>
                  <th className="px-5 py-4">{t("buyurtmalar.columns.mijoz")}</th>
                  <th className="px-5 py-4">{t("buyurtmalar.columns.manzil")}</th>
                  <th className="px-5 py-4">{t("buyurtmalar.columns.summa")}</th>
                  <th className="px-5 py-4">{t("buyurtmalar.columns.sana")}</th>
                  <th className="px-5 py-4">{t("buyurtmalar.columns.holati")}</th>
                  <th className="w-28 px-5 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-100/70">
                {royxat.map((buyurtma) => {
                  const holat = buyurtmaHolati(buyurtma);
                  const uslub = HOLAT_USLUBI[holat];
                  const Ikona = uslub.icon;
                  const nom = mijozNomi(buyurtma);
                  const telefon = buyurtma.delivery?.recipientPhone ?? buyurtma.customer?.phone ?? "";
                  const manzil = buyurtma.delivery?.address;
                  const kechikkan = kechikkanmi(buyurtma, holat);
                  const reja = buyurtma.delivery?.scheduledAt;
                  return (
                    <tr key={buyurtma.id} onClick={() => onSotuvniOchish(buyurtma)} title={t("buyurtmalar.rowOpen")} className="group cursor-pointer transition hover:bg-orange-50/65 motion-reduce:transition-none">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <span aria-hidden className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-md ${uslub.tile}`}>
                            <Ikona size={17} strokeWidth={2.2} />
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900">{buyurtmaRaqami(buyurtma)}</p>
                            <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{buyurtma.warehouse?.name ?? masulNomi(buyurtma)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-extrabold text-slate-600">{bosHarflar(nom)}</span>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-slate-800">{nom}</p>
                            <p className="mt-0.5 flex items-center gap-1 text-xs font-medium tabular-nums text-slate-500">
                              <Phone size={11} aria-hidden /> {telefon || t("buyurtmalar.noPhone")}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[240px] px-5 py-4">
                        <p className={`flex items-start gap-1.5 text-[13px] ${manzil ? "text-slate-700" : "text-slate-400"}`} title={manzil ?? undefined}>
                          <MapPin size={14} aria-hidden className="mt-0.5 shrink-0 text-slate-400" />
                          <span className="line-clamp-2">{manzil || t("buyurtmalar.noAddress")}</span>
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-[15px] font-extrabold tabular-nums text-slate-950">{pulniFormatlash(sotuvSummasi(buyurtma))}</td>
                      <td className="px-5 py-4">
                        <p className="whitespace-nowrap text-[13px] font-semibold tabular-nums text-slate-700">{sananiFormatlash(buyurtma.createdAt ?? buyurtma.date)}</p>
                        {reja && (
                          <p className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold tabular-nums ${kechikkan ? "text-rose-600" : "text-slate-500"}`}>
                            <CalendarClock size={12} aria-hidden /> {t("buyurtmalar.scheduled", { sana: sananiFormatlash(reja).split(",")[0].split(" ")[0] })}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col items-start gap-1.5">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ring-1 ${uslub.belgi}`}>
                            <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${uslub.nuqta}`} />
                            {t(`buyurtmalar.tabs.${holat}`)}
                          </span>
                          {kechikkan && (
                            <span title={t("buyurtmalar.lateHint")} className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-black text-rose-700 ring-1 ring-rose-100">
                              <AlarmClock size={12} aria-hidden /> {t("buyurtmalar.late")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right" onClick={toxtat}>
                        <div className="flex items-center justify-end gap-1">
                          <HujjatOchirish
                            guruh="savdo"
                            status={buyurtma.status}
                            nom={buyurtmaRaqami(buyurtma)}
                            onTasdiq={() => ochirish(buyurtma.id)}
                            onTiklash={() => tiklash(buyurtma.id)}
                          />
                          <ChevronRight size={16} aria-hidden className="text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-slate-500 motion-reduce:transition-none" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Planshet va telefon: kartalar */}
          <ul className="grid gap-3 bg-white/70 p-4 sm:p-6 lg:hidden">
            {royxat.map((buyurtma) => {
              const holat = buyurtmaHolati(buyurtma);
              const uslub = HOLAT_USLUBI[holat];
              const Ikona = uslub.icon;
              const nom = mijozNomi(buyurtma);
              const telefon = buyurtma.delivery?.recipientPhone ?? buyurtma.customer?.phone ?? "";
              const manzil = buyurtma.delivery?.address;
              const kechikkan = kechikkanmi(buyurtma, holat);
              const reja = buyurtma.delivery?.scheduledAt;
              return (
                <li key={buyurtma.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onSotuvniOchish(buyurtma)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSotuvniOchish(buyurtma);
                      }
                    }}
                    className="cursor-pointer rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 motion-reduce:transition-none"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span aria-hidden className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-md ${uslub.tile}`}>
                          <Ikona size={17} strokeWidth={2.2} />
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900">{buyurtmaRaqami(buyurtma)}</p>
                          <p className="truncate text-xs font-semibold tabular-nums text-slate-500">{sananiFormatlash(buyurtma.createdAt ?? buyurtma.date)}</p>
                        </div>
                      </div>
                      <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black ring-1 ${uslub.belgi}`}>
                        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${uslub.nuqta}`} />
                        {t(`buyurtmalar.tabs.${holat}`)}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-1.5 text-[13px]">
                      <p className="flex items-center gap-2 font-bold text-slate-800">
                        <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-extrabold text-slate-600">{bosHarflar(nom)}</span>
                        <span className="truncate">{nom}</span>
                        <span className="ml-auto flex shrink-0 items-center gap-1 text-xs font-medium tabular-nums text-slate-500"><Phone size={11} aria-hidden /> {telefon || t("buyurtmalar.noPhone")}</span>
                      </p>
                      <p className={`flex items-start gap-1.5 ${manzil ? "text-slate-700" : "text-slate-400"}`}>
                        <MapPin size={14} aria-hidden className="mt-0.5 shrink-0 text-slate-400" />
                        <span>{manzil || t("buyurtmalar.noAddress")}</span>
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-extrabold tabular-nums text-slate-950">{pulniFormatlash(sotuvSummasi(buyurtma))}</span>
                        {reja && (
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums ${kechikkan ? "text-rose-600" : "text-slate-500"}`}>
                            <CalendarClock size={12} aria-hidden /> {t("buyurtmalar.scheduled", { sana: sananiFormatlash(reja).split(",")[0].split(" ")[0] })}
                          </span>
                        )}
                        {kechikkan && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-black text-rose-700 ring-1 ring-rose-100">
                            <AlarmClock size={11} aria-hidden /> {t("buyurtmalar.late")}
                          </span>
                        )}
                      </div>
                      <div onClick={toxtat}>
                        <HujjatOchirish
                          guruh="savdo"
                          status={buyurtma.status}
                          nom={buyurtmaRaqami(buyurtma)}
                          onTasdiq={() => ochirish(buyurtma.id)}
                          onTiklash={() => tiklash(buyurtma.id)}
                        />
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {birinchiYuklanish && <JadvalYuklanmoqda ikonka={<Truck size={24} />} />}

      {!yuklanmoqda && royxat.length === 0 && !xatolik && (
        <div className="bg-white/70 px-6 py-14 text-center sm:py-16">
          <span aria-hidden className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-linear-to-br from-sky-50 to-indigo-50 text-sky-500 ring-1 ring-sky-100">
            <PackageOpen size={31} />
          </span>
          {filtrFaol ? (
            <>
              <h2 className="mt-4 text-lg font-black text-slate-800">{t("buyurtmalar.emptyFilterTitle")}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">{t("buyurtmalar.emptyFilterSubtitle")}</p>
              <button type="button" onClick={filtrniTozalash} className="mt-5 inline-flex h-11 cursor-pointer items-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600">
                <X size={15} aria-hidden /> {t("buyurtmalar.clearFilter")}
              </button>
            </>
          ) : (
            <>
              <h2 className="mt-4 text-lg font-black text-slate-800">{t("buyurtmalar.emptyTitle")}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">{t("buyurtmalar.emptySubtitle")}</p>
              <div className="mx-auto mt-7 max-w-3xl text-left">
                <p className="mb-3 text-center text-xs font-black uppercase tracking-wide text-slate-500">{t("buyurtmalar.howTitle")}</p>
                <ol className="grid gap-3 sm:grid-cols-3">
                  {(["one", "two", "three"] as const).map((qadam, index) => (
                    <li key={qadam} className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
                      <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-sky-500 to-indigo-500 text-sm font-extrabold text-white shadow-md shadow-sky-500/30">{index + 1}</span>
                      <span className="text-[13px] font-semibold leading-5 text-slate-700">{t(`buyurtmalar.steps.${qadam}`)}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-5 text-center">
                  <Link to="/savdo" className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600">
                    <ReceiptText size={16} aria-hidden /> {t("buyurtmalar.goToSales")}
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <TablePagination page={page} pageSize={pageSize} totalItems={jami} onPageChange={setPage} onPageSizeChange={(hajm) => { setPageSize(hajm); setPage(1); }} />
    </section>
  );
}
