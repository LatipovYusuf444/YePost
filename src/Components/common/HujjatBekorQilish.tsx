import { useState, type MouseEvent } from "react";
import { Ban } from "lucide-react";
import { useTranslation } from "react-i18next";
import TasdiqlashOynasi from "@/Components/common/TasdiqlashOynasi";
import { cn } from "@/lib/utils";

type HujjatBekorQilishProps = {
  status?: string | null;
  nom: string;
  onTasdiq: () => Promise<boolean>;
  // Qaysi holatlarda tugma ko'rinadi (standart: faqat tasdiqlangan hujjat). Ko'chirmada: SENT va RECEIVED.
  holatlar?: string[];
  // Dialog tavsifi (i18n kaliti, "common" nomlar maydonida). Standart: tovar qoldig'i qaytishi haqida.
  tavsifKaliti?: string;
  className?: string;
  // "ikonka" — jadval qatori uchun; "tugma" — hujjat tafsiloti oynasi uchun (yozuvli).
  korinish?: "ikonka" | "tugma";
  // Muvaffaqiyatli bekor qilingach chaqiriladi (masalan, tafsilot oynasidagi hujjatni qayta yuklash uchun).
  onBajarildi?: () => void;
};

// "Bekor qilish" tugmasi: standart holatda faqat tasdiqlangan (CONFIRMED) hujjat uchun ko'rinadi.
// Bekor qilingan hujjat keyin "O'chirish" tugmasi bilan butunlay o'chirilishi mumkin.
export default function HujjatBekorQilish({
  status,
  nom,
  onTasdiq,
  holatlar = ["CONFIRMED"],
  tavsifKaliti = "hujjatBekorQilish.description",
  className = "",
  korinish = "ikonka",
  onBajarildi,
}: HujjatBekorQilishProps) {
  const { t } = useTranslation("common");
  const [ochiq, setOchiq] = useState(false);

  if (!holatlar.includes(String(status ?? "").toUpperCase())) return null;

  async function bekorQilish() {
    const ok = await onTasdiq();
    if (ok) onBajarildi?.();
    return ok;
  }

  return (
    <>
      <button
        type="button"
        onClick={(event: MouseEvent) => {
          event.stopPropagation();
          setOchiq(true);
        }}
        onKeyDown={(event) => event.stopPropagation()}
        title={t("hujjatBekorQilish.tooltip")}
        aria-label={t("hujjatBekorQilish.aria", { name: nom })}
        className={cn(
          "inline-flex items-center justify-center bg-amber-50 text-amber-600 transition hover:bg-amber-500 hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-100",
          korinish === "ikonka" ? "h-9 w-9 rounded-xl" : "h-12 gap-2 rounded-2xl px-6 font-black ring-1 ring-amber-100",
          className
        )}
      >
        <Ban size={korinish === "tugma" ? 18 : 16} />
        {korinish === "tugma" && t("hujjatBekorQilish.action")}
      </button>
      {ochiq && (
        <TasdiqlashOynasi
          ikonka={<Ban size={24} />}
          ohang="sariq"
          sarlavha={t("hujjatBekorQilish.title")}
          nom={nom}
          tavsif={t(tavsifKaliti)}
          ortgaMatni={t("hujjatBekorQilish.no")}
          tasdiqMatni={t("hujjatBekorQilish.yes")}
          jarayonMatni={t("hujjatBekorQilish.cancelling")}
          onTasdiq={bekorQilish}
          onYopish={() => setOchiq(false)}
        />
      )}
    </>
  );
}
