import { useEffect, useState, type KeyboardEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { LoaderCircle, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { hujjatOchiriladimi } from "@/lib/hujjatHolati";
import { useHujjatniOchirishMumkinmi, type HujjatGuruhi } from "@/hooks/useHujjatniOchirishMumkinmi";

type HujjatOchirishOynasiProps = {
  nom: string;
  bekorQilingan?: boolean;
  onTasdiq: () => Promise<boolean | void>;
  onYopish: () => void;
  // Qo'shimcha ogohlantirish (masalan, inventarizatsiya o'chirilsa ombor muzlatilishi bekor bo'ladi).
  izoh?: string;
};

// Qoralama hujjatni o'chirishni tasdiqlash oynasi.
// Oyna React daraxtida jadval qatori ichida bo'lishi mumkin, shuning uchun hodisalar
// qatorga (tafsilotni ochish) o'tmasligi kerak.
export function HujjatOchirishOynasi({ nom, bekorQilingan = false, onTasdiq, onYopish, izoh }: HujjatOchirishOynasiProps) {
  const { t } = useTranslation("common");
  const [bajarilmoqda, setBajarilmoqda] = useState(false);

  useEffect(() => {
    function tugmaBosildi(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape" && !bajarilmoqda) onYopish();
    }
    document.addEventListener("keydown", tugmaBosildi);
    return () => document.removeEventListener("keydown", tugmaBosildi);
  }, [bajarilmoqda, onYopish]);

  function toxtatish(event: MouseEvent | KeyboardEvent) {
    event.stopPropagation();
  }

  async function ochirish() {
    setBajarilmoqda(true);
    try {
      await onTasdiq();
    } finally {
      // Muvaffaqiyatsiz bo'lsa ham yopamiz: xato toasti ko'rsatilgan va ro'yxat backend holatiga moslangan.
      setBajarilmoqda(false);
      onYopish();
    }
  }

  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="hujjat-ochirish-sarlavha"
      onClick={(event) => {
        event.stopPropagation();
        if (!bajarilmoqda && event.target === event.currentTarget) onYopish();
      }}
      onKeyDown={toxtatish}
      className="fixed inset-0 z-[100060] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-[26px] bg-white p-6 text-center shadow-[0_28px_80px_rgba(15,23,42,.28)]">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500 ring-8 ring-red-50/60">
          <Trash2 size={24} />
        </span>
        <h3 id="hujjat-ochirish-sarlavha" className="mt-4 text-lg font-black text-slate-950">{t(bekorQilingan ? "hujjatOchirish.titleCancelled" : "hujjatOchirish.title")}</h3>
        <p className="mx-auto mt-3 max-w-full truncate rounded-full bg-slate-100 px-4 py-1.5 text-sm font-black text-slate-700">{nom}</p>
        <p className="mt-3 text-sm leading-6 text-slate-500">{t("hujjatOchirish.description")}</p>
        {izoh && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-700">{izoh}</p>}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onYopish}
            disabled={bajarilmoqda}
            className="h-11 flex-1 rounded-2xl bg-slate-100 text-sm font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
          >
            {t("hujjatOchirish.no")}
          </button>
          <button
            type="button"
            onClick={() => void ochirish()}
            disabled={bajarilmoqda}
            autoFocus
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-red-500 text-sm font-black text-white shadow-md shadow-red-200 transition hover:bg-red-600 disabled:opacity-60"
          >
            {bajarilmoqda && <LoaderCircle size={16} className="animate-spin" />}
            {bajarilmoqda ? t("hujjatOchirish.deleting") : t("hujjatOchirish.yes")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

type HujjatOchirishProps = {
  guruh: HujjatGuruhi;
  status?: string | null;
  nom: string;
  onTasdiq: () => Promise<boolean>;
  izoh?: string;
  className?: string;
};

// Jadval qatoridagi "O'chirish" tugmasi: faqat qoralama (DRAFT) yoki bekor qilingan hujjat va ruxsati bor rol uchun ko'rinadi.
// Tasdiqlangan hujjatni o'chirib bo'lmaydi — uni bekor qilish kerak.
export default function HujjatOchirish({ guruh, status, nom, onTasdiq, izoh, className = "" }: HujjatOchirishProps) {
  const { t } = useTranslation("common");
  const ruxsat = useHujjatniOchirishMumkinmi(guruh);
  const [ochiq, setOchiq] = useState(false);
  const bekorQilingan = ["CANCELLED", "CANCELED"].includes(String(status ?? "").toUpperCase());

  if (!ruxsat || !hujjatOchiriladimi(status)) return null;

  return (
    <>
      <button
        type="button"
        onClick={(event: MouseEvent) => {
          event.stopPropagation();
          setOchiq(true);
        }}
        onKeyDown={(event) => event.stopPropagation()}
        title={t(bekorQilingan ? "hujjatOchirish.tooltipCancelled" : "hujjatOchirish.tooltip")}
        aria-label={t("hujjatOchirish.aria", { name: nom })}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500 transition hover:bg-red-500 hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-100 ${className}`}
      >
        <Trash2 size={16} />
      </button>
      {ochiq && <HujjatOchirishOynasi nom={nom} bekorQilingan={bekorQilingan} izoh={izoh} onTasdiq={onTasdiq} onYopish={() => setOchiq(false)} />}
    </>
  );
}
