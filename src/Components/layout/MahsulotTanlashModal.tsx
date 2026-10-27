import { pulMatni } from "@/lib/valyuta";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PackagePlus, RefreshCw, ShoppingCart, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { omborlarRoyxatiniOlish } from "@/api/savdoApi";
import { usePosStore } from "@/store/posStore";
import SavatchaJadvali from "@/Pages/BoshSahifa/SavatchaJadvali";
import { jadvalXulosasi } from "@/Pages/BoshSahifa/savatchaHisobi";
import type { OmborTanlovi } from "@/types/savdo";

// Topbar'dagi "Mahsulot tanlash" oynasi: Yangi sotuvdagi kabi qatorli jadval (shtrix-kod, kategoriya, mahsulot tanlash,
// narx turi, chegirma). Qatorlar to'g'ridan-to'g'ri Bosh sahifadagi savatchaga yoziladi — jadval shu savatchaning o'zi.

function formatSumma(value: number) {
  return pulMatni(Number(value) || 0, "UZS", true);
}

export default function MahsulotTanlashModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation("topbar");
  const cart = usePosStore((state) => state.cart);
  const [omborlar, setOmborlar] = useState<OmborTanlovi[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [xabar, setXabar] = useState("");
  const [yangilash, setYangilash] = useState(0);
  const xulosa = jadvalXulosasi(cart);

  useEffect(() => {
    let active = true;
    omborlarRoyxatiniOlish()
      .then((royxat) => {
        if (!active) return;
        setOmborlar(royxat);
        setWarehouseId((joriy) => joriy || String(royxat[0]?.id ?? ""));
      })
      .catch(() => {
        if (active) setXabar("posModal.errors.warehousesLoadFailed");
      });
    return () => {
      active = false;
    };
  }, []);

  return createPortal(
    <div className="app-modal-compact fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/55 px-5 backdrop-blur-md">
      <div className="relative w-full max-w-[1500px]">
        <div className="absolute -left-20 top-7 hidden flex-col gap-3 xl:flex">
          <button
            type="button"
            onClick={onClose}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-500 text-white shadow-lg shadow-gold-200 transition hover:bg-gold-600"
            aria-label={t("posModal.closeAria")}
          >
            <X size={24} />
          </button>
          <button
            type="button"
            onClick={() => setYangilash((value) => value + 1)}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-gold-500 shadow-md ring-1 ring-gold-100 transition hover:bg-gold-50"
            aria-label={t("posModal.refreshAria")}
          >
            <RefreshCw size={22} />
          </button>
        </div>

        <section className="flex h-[min(880px,94vh)] w-full flex-col overflow-hidden rounded-[36px] border border-white/60 bg-white shadow-[0_40px_140px_rgba(15,23,42,.45)]">
          {/* Sarlavha */}
          <header className="relative flex shrink-0 items-center justify-between gap-4 overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 px-8 py-6">
            <span aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-gold-500/20 blur-2xl" />
            <span aria-hidden className="pointer-events-none absolute bottom-0 left-1/3 h-px w-1/3 bg-gradient-to-r from-transparent via-gold-400/50 to-transparent" />
            <div className="relative flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 text-white shadow-lg shadow-gold-500/30">
                <PackagePlus size={26} />
              </span>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-gold-300">YePost</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-white">{t("posModal.title")}</h2>
              </div>
            </div>
            <div className="relative flex items-center gap-3">
              <span className="hidden rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-white/80 ring-1 ring-white/15 sm:inline-flex">
                {t("posModal.results", { count: cart.length })}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white/80 ring-1 ring-white/15 transition hover:bg-white/20 hover:text-white"
                aria-label={t("posModal.closeAria")}
              >
                <X size={20} />
              </button>
            </div>
          </header>

          {xabar && (
            <div className="mx-8 mt-4 shrink-0 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{t(xabar)}</div>
          )}

          {/* Qatorli jadval */}
          <div className="min-h-0 flex-1 overflow-auto p-8">
            <SavatchaJadvali
              omborlar={omborlar}
              warehouseId={warehouseId}
              onWarehouseChange={setWarehouseId}
              formatSumma={formatSumma}
              yangilash={yangilash}
            />
          </div>

          {/* Pastki panel */}
          <footer className="flex shrink-0 flex-col gap-4 border-t border-slate-100 bg-white px-8 py-5 shadow-[0_-12px_30px_rgba(15,23,42,.04)] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-50 text-gold-600 ring-1 ring-gold-100">
                <ShoppingCart size={24} />
                {cart.length > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-gold-500 px-1.5 text-[11px] font-black text-white ring-2 ring-white">{cart.length}</span>
                )}
              </span>
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{t("posModal.cartProducts")}</p>
                <p className="mt-0.5 text-lg font-black text-slate-900">
                  {xulosa.miqdor.toLocaleString("uz-UZ", { maximumFractionDigits: 3 })} {t("posModal.unit")} <span className="mx-1 text-slate-300">·</span>{" "}
                  <span className="text-gold-600">{formatSumma(xulosa.jami)}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold-500 to-gold-600 px-8 text-sm font-black text-white shadow-lg shadow-gold-200 transition hover:scale-[1.02]"
            >
              <ShoppingCart size={18} /> {t("posModal.done")}
            </button>
          </footer>
        </section>
      </div>
    </div>,
    document.body
  );
}
