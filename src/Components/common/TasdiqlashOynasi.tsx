import { useEffect, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { LoaderCircle } from "lucide-react";

type TasdiqlashOynasiProps = {
  ikonka: ReactNode;
  ohang?: "qizil" | "sariq" | "yashil";
  sarlavha: string;
  nom: string;
  tavsif: string;
  // Qo'shimcha ogohlantirish (masalan, inventarizatsiya o'chirilsa ombor muzlatilishi bekor bo'ladi).
  izoh?: string;
  ortgaMatni: string;
  tasdiqMatni: string;
  jarayonMatni: string;
  onTasdiq: () => Promise<boolean | void>;
  onYopish: () => void;
};

const OHANGLAR = {
  qizil: {
    ikonka: "bg-red-50 text-red-500 ring-red-50/60",
    tugma: "bg-red-500 shadow-red-200 hover:bg-red-600",
  },
  sariq: {
    ikonka: "bg-amber-50 text-amber-500 ring-amber-50/60",
    tugma: "bg-amber-500 shadow-amber-200 hover:bg-amber-600",
  },
  yashil: {
    ikonka: "bg-emerald-50 text-emerald-500 ring-emerald-50/60",
    tugma: "bg-emerald-500 shadow-emerald-200 hover:bg-emerald-600",
  },
};

// Hujjat ustida qaytarib bo'lmaydigan amalni (o'chirish, bekor qilish) tasdiqlash oynasi.
// Oyna React daraxtida jadval qatori ichida bo'lishi mumkin, shuning uchun hodisalar
// qatorga (tafsilotni ochish) o'tmasligi kerak.
export default function TasdiqlashOynasi({
  ikonka,
  ohang = "qizil",
  sarlavha,
  nom,
  tavsif,
  izoh,
  ortgaMatni,
  tasdiqMatni,
  jarayonMatni,
  onTasdiq,
  onYopish,
}: TasdiqlashOynasiProps) {
  const [bajarilmoqda, setBajarilmoqda] = useState(false);
  const ranglar = OHANGLAR[ohang];

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

  async function tasdiqlash() {
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
      aria-labelledby="tasdiqlash-sarlavha"
      onClick={(event) => {
        event.stopPropagation();
        if (!bajarilmoqda && event.target === event.currentTarget) onYopish();
      }}
      onKeyDown={toxtatish}
      className="fixed inset-0 z-[100060] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-[26px] bg-white p-6 text-center shadow-[0_28px_80px_rgba(15,23,42,.28)]">
        <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ring-8 ${ranglar.ikonka}`}>{ikonka}</span>
        <h3 id="tasdiqlash-sarlavha" className="mt-4 text-lg font-black text-slate-950">{sarlavha}</h3>
        <p className="mx-auto mt-3 max-w-full truncate rounded-full bg-slate-100 px-4 py-1.5 text-sm font-black text-slate-700">{nom}</p>
        <p className="mt-3 text-sm leading-6 text-slate-500">{tavsif}</p>
        {izoh && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-700">{izoh}</p>}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onYopish}
            disabled={bajarilmoqda}
            className="h-11 flex-1 rounded-2xl bg-slate-100 text-sm font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
          >
            {ortgaMatni}
          </button>
          <button
            type="button"
            onClick={() => void tasdiqlash()}
            disabled={bajarilmoqda}
            autoFocus
            className={`inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl text-sm font-black text-white shadow-md transition disabled:opacity-60 ${ranglar.tugma}`}
          >
            {bajarilmoqda && <LoaderCircle size={16} className="animate-spin" />}
            {bajarilmoqda ? jarayonMatni : tasdiqMatni}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
