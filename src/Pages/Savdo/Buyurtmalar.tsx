import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { PackageOpen, RefreshCw, Search, Truck } from "lucide-react";
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

const HOLAT_RANGI: Record<BuyurtmaHolati, string> = {
  NEW: "bg-blue-50 text-blue-700 ring-blue-100",
  CONFIRMED: "bg-sky-50 text-sky-700 ring-sky-100",
  DELIVERING: "bg-amber-50 text-amber-700 ring-amber-100",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  CANCELLED: "bg-red-50 text-red-600 ring-red-100",
};

// Backend sotuv raqamini `docNumber` (SOT-000007) sifatida qaytaradi — Kassa va Ombor sahifalarida ham shu ko'rinadi.
function buyurtmaRaqami(buyurtma: Buyurtma) {
  return buyurtma.docNumber || buyurtma.documentNumber || buyurtma.number || sotuvRaqami(buyurtma);
}

function buyurtmaHolati(buyurtma: Buyurtma): BuyurtmaHolati {
  const holat = String(buyurtma.orderStatus ?? "").toUpperCase();
  return (BUYURTMA_HOLATLARI as string[]).includes(holat) ? (holat as BuyurtmaHolati) : "NEW";
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

  return (
    <section className="overflow-hidden rounded-[34px] border border-orange-100 bg-gradient-to-br from-[#F8FAFC] via-white to-[#EFF6FF] shadow-[0_28px_90px_rgba(15,23,42,.12)] ring-1 ring-white/80">
      <div className="relative overflow-hidden border-b border-orange-100 px-6 py-8 sm:px-9">
        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-orange-200/30 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.22em] text-orange-500">
              <Truck size={17} /> {t("buyurtmalar.eyebrow")}
            </p>
            <h1 className="savdo-section-title mt-2">{t("buyurtmalar.title")}</h1>
          </div>
          <button
            type="button"
            onClick={() => void yuklash()}
            disabled={yuklanmoqda}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5 hover:bg-orange-600 disabled:opacity-60"
          >
            <RefreshCw size={17} className={yuklanmoqda ? "animate-spin" : ""} /> {t("buyurtmalar.refresh")}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-b border-orange-100 bg-white/55 px-6 py-5 backdrop-blur sm:px-9">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("buyurtmalar.title")}>
          {tablar.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => {
                setTab(item.id);
                setPage(1);
              }}
              className={`inline-flex h-10 items-center gap-2 rounded-2xl px-4 text-sm font-black transition ${
                tab === item.id ? "bg-orange-500 text-white shadow-md shadow-orange-200" : "bg-white text-slate-600 ring-1 ring-orange-100 hover:bg-orange-50"
              }`}
            >
              {item.nom}
              {item.soni !== undefined && (
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${tab === item.id ? "bg-white/25 text-white" : "bg-orange-50 text-orange-600"}`}>{item.soni}</span>
              )}
            </button>
          ))}
        </div>
        <label className="flex h-12 w-full items-center gap-3 rounded-2xl border border-orange-100 bg-white px-4 shadow-sm transition focus-within:border-orange-300 focus-within:ring-4 focus-within:ring-orange-50 lg:max-w-xl">
          <Search size={18} className="text-orange-400" />
          <input
            value={qidiruv}
            onChange={(event) => setQidiruv(event.target.value)}
            placeholder={t("buyurtmalar.searchPlaceholder")}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 outline-none"
          />
        </label>
      </div>

      {xatolik && <div className="mx-6 mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600 sm:mx-9">{xatolik}</div>}

      <div className="overflow-x-auto bg-white/70">
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
              return (
                <tr key={buyurtma.id} onClick={() => onSotuvniOchish(buyurtma)} className="cursor-pointer transition hover:bg-orange-50/65">
                  <td className="px-8 py-5">
                    <p className="font-semibold text-slate-900">{buyurtmaRaqami(buyurtma)}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">{buyurtma.warehouse?.name ?? masulNomi(buyurtma)}</p>
                  </td>
                  <td className="px-5 py-5">
                    <p className="font-bold text-slate-800">{mijozNomi(buyurtma)}</p>
                    <p className="mt-1 text-xs text-slate-400">{buyurtma.delivery?.recipientPhone ?? buyurtma.customer?.phone ?? ""}</p>
                  </td>
                  <td className="max-w-[220px] truncate px-5 py-5 text-slate-600">{buyurtma.delivery?.address || "—"}</td>
                  <td className="px-5 py-5 font-black text-slate-900">{pulniFormatlash(sotuvSummasi(buyurtma))}</td>
                  <td className="whitespace-nowrap px-5 py-5 font-semibold text-slate-600">{sananiFormatlash(buyurtma.createdAt ?? buyurtma.date)}</td>
                  <td className="px-5 py-5">
                    <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ring-1 ${HOLAT_RANGI[holat]}`}>{t(`buyurtmalar.tabs.${holat}`)}</span>
                  </td>
                  <td className="px-5 py-5 text-right">
                    <HujjatOchirish
                      guruh="savdo"
                      status={buyurtma.status}
                      nom={buyurtmaRaqami(buyurtma)}
                      onTasdiq={() => ochirish(buyurtma.id)}
                      onTiklash={() => tiklash(buyurtma.id)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {yuklanmoqda && royxat.length === 0 && <JadvalYuklanmoqda ikonka={<Truck size={24} />} />}

      {!yuklanmoqda && royxat.length === 0 && !xatolik && (
        <div className="bg-white/70 px-6 py-20 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-orange-50 text-orange-300">
            <PackageOpen size={31} />
          </span>
          <h2 className="mt-4 text-lg font-black text-slate-800">{t("buyurtmalar.emptyTitle")}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-400">{t("buyurtmalar.emptySubtitle")}</p>
        </div>
      )}

      <TablePagination page={page} pageSize={pageSize} totalItems={jami} onPageChange={setPage} onPageSizeChange={(hajm) => { setPageSize(hajm); setPage(1); }} />
    </section>
  );
}
