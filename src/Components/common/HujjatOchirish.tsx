import { useState, type MouseEvent } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import TasdiqlashOynasi from "@/Components/common/TasdiqlashOynasi";
import { cn } from "@/lib/utils";
import { hujjatOchiriladimi } from "@/lib/hujjatHolati";
import { useHujjatniOchirishMumkinmi, useHujjatniTiklashMumkinmi, type HujjatGuruhi } from "@/hooks/useHujjatniOchirishMumkinmi";

type HujjatOchirishOynasiProps = {
  nom: string;
  bekorQilingan?: boolean;
  onTasdiq: () => Promise<boolean | void>;
  onYopish: () => void;
  // Qo'shimcha ogohlantirish (masalan, inventarizatsiya o'chirilsa ombor muzlatilishi bekor bo'ladi).
  izoh?: string;
};

// Qoralama yoki bekor qilingan hujjatni o'chirishni tasdiqlash oynasi.
export function HujjatOchirishOynasi({ nom, bekorQilingan = false, onTasdiq, onYopish, izoh }: HujjatOchirishOynasiProps) {
  const { t } = useTranslation("common");
  return (
    <TasdiqlashOynasi
      ikonka={<Trash2 size={24} />}
      sarlavha={t(bekorQilingan ? "hujjatOchirish.titleCancelled" : "hujjatOchirish.title")}
      nom={nom}
      tavsif={t("hujjatOchirish.description")}
      izoh={izoh}
      ortgaMatni={t("hujjatOchirish.no")}
      tasdiqMatni={t("hujjatOchirish.yes")}
      jarayonMatni={t("hujjatOchirish.deleting")}
      onTasdiq={onTasdiq}
      onYopish={onYopish}
    />
  );
}

type HujjatOchirishProps = {
  guruh: HujjatGuruhi;
  status?: string | null;
  nom: string;
  onTasdiq: () => Promise<boolean>;
  // Berilsa, bekor qilingan hujjatda "Qayta tiklash" (CANCELLED → DRAFT) tugmasi ham chiqadi.
  onTiklash?: () => Promise<boolean>;
  izoh?: string;
  className?: string;
  // "ikonka" — jadval qatori uchun; "tugma" / "kichik" — hujjat tafsiloti oynasi uchun (yozuvli).
  korinish?: "ikonka" | "tugma" | "kichik";
  // Muvaffaqiyatli o'chirilgach chaqiriladi (masalan, tafsilot oynasini yopish uchun).
  onOchirildi?: () => void;
  // Muvaffaqiyatli tiklangach chaqiriladi (masalan, tafsilot oynasidagi hujjatni qayta yuklash uchun).
  onTiklandi?: () => void;
};

function tugmaKlassi(korinish: "ikonka" | "tugma" | "kichik", ohang: "qizil" | "yashil", className: string) {
  const rang =
    ohang === "qizil"
      ? "bg-red-50 text-red-500 hover:bg-red-500 hover:text-white focus-visible:ring-red-100"
      : "bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white focus-visible:ring-emerald-100";
  const halqa = ohang === "qizil" ? "ring-red-100" : "ring-emerald-100";
  return cn(
    "inline-flex items-center justify-center transition focus-visible:outline-none focus-visible:ring-4",
    rang,
    korinish === "ikonka" && "h-9 w-9 rounded-xl",
    korinish === "kichik" && "h-9 gap-1.5 rounded-xl px-3 text-sm font-bold ring-1 " + halqa,
    korinish === "tugma" && "h-12 gap-2 rounded-2xl px-6 font-black ring-1 " + halqa,
    className
  );
}

// Hujjat qatori / tafsiloti uchun "O'chirish" va "Qayta tiklash" tugmalari.
// O'chirish: faqat qoralama (DRAFT) yoki bekor qilingan hujjat va ruxsati bor rol uchun ko'rinadi.
// Qayta tiklash: faqat bekor qilingan hujjat va admin/direktor uchun. Tasdiqlangan hujjatni o'chirib bo'lmaydi — uni bekor qilish kerak.
export default function HujjatOchirish({ guruh, status, nom, onTasdiq, onTiklash, izoh, className = "", korinish = "ikonka", onOchirildi, onTiklandi }: HujjatOchirishProps) {
  const { t } = useTranslation("common");
  const ochirishRuxsati = useHujjatniOchirishMumkinmi(guruh);
  const tiklashRuxsati = useHujjatniTiklashMumkinmi(guruh);
  const [ochiq, setOchiq] = useState(false);
  const [tiklashOchiq, setTiklashOchiq] = useState(false);
  const bekorQilingan = ["CANCELLED", "CANCELED"].includes(String(status ?? "").toUpperCase());
  const ochirishKorinsin = ochirishRuxsati && hujjatOchiriladimi(status);
  const tiklashKorinsin = Boolean(onTiklash) && tiklashRuxsati && bekorQilingan;

  async function ochirish() {
    const ok = await onTasdiq();
    if (ok) onOchirildi?.();
    return ok;
  }

  async function tiklash() {
    const ok = (await onTiklash?.()) ?? false;
    if (ok) onTiklandi?.();
    return ok;
  }

  if (!ochirishKorinsin && !tiklashKorinsin) return null;

  return (
    <span className="inline-flex items-center gap-2">
      {tiklashKorinsin && (
        <button
          type="button"
          onClick={(event: MouseEvent) => {
            event.stopPropagation();
            setTiklashOchiq(true);
          }}
          onKeyDown={(event) => event.stopPropagation()}
          title={t("hujjatTiklash.tooltip")}
          aria-label={t("hujjatTiklash.aria", { name: nom })}
          className={tugmaKlassi(korinish, "yashil", className)}
        >
          <RotateCcw size={korinish === "tugma" ? 18 : 16} />
          {korinish !== "ikonka" && t("hujjatTiklash.action")}
        </button>
      )}
      {ochirishKorinsin && (
        <button
          type="button"
          onClick={(event: MouseEvent) => {
            event.stopPropagation();
            setOchiq(true);
          }}
          onKeyDown={(event) => event.stopPropagation()}
          title={t(bekorQilingan ? "hujjatOchirish.tooltipCancelled" : "hujjatOchirish.tooltip")}
          aria-label={t("hujjatOchirish.aria", { name: nom })}
          className={tugmaKlassi(korinish, "qizil", className)}
        >
          <Trash2 size={korinish === "tugma" ? 18 : 16} />
          {korinish !== "ikonka" && t("actions.delete")}
        </button>
      )}
      {ochiq && <HujjatOchirishOynasi nom={nom} bekorQilingan={bekorQilingan} izoh={izoh} onTasdiq={ochirish} onYopish={() => setOchiq(false)} />}
      {tiklashOchiq && (
        <TasdiqlashOynasi
          ikonka={<RotateCcw size={24} />}
          ohang="yashil"
          sarlavha={t("hujjatTiklash.title")}
          nom={nom}
          tavsif={t("hujjatTiklash.description")}
          ortgaMatni={t("hujjatTiklash.no")}
          tasdiqMatni={t("hujjatTiklash.yes")}
          jarayonMatni={t("hujjatTiklash.restoring")}
          onTasdiq={tiklash}
          onYopish={() => setTiklashOchiq(false)}
        />
      )}
    </span>
  );
}
