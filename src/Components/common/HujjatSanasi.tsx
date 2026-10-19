import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { bugungiToshkentKuni, kiritilganVaqtMatni, kunMatni, kunniSurish, otganKunmi } from "@/lib/hujjatSanasi";
import { useDavrStore } from "@/store/davrStore";

type HujjatSanasiMaydoniProps = {
  value: string;
  onChange: (kun: string) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  // Pastdagi tushuntirish (o'tgan sana / yopilgan davr); ko'rsatma kerak bo'lmagan joyda o'chiriladi.
  korsatma?: boolean;
};

// Hujjat sanasi maydoni (backend `date`): faqat kun, kelajak sana tanlanmaydi, yopilgan davr kunlari tanlanmaydi.
// Bugun tanlansa hujjat hozirgi vaqt bilan, o'tgan kun tanlansa o'sha kunning 23:59:59 (Toshkent) bilan yoziladi.
export default function HujjatSanasiMaydoni({
  value,
  onChange,
  disabled = false,
  className = "",
  "aria-label": ariaLabel,
  korsatma = true,
}: HujjatSanasiMaydoniProps) {
  const { t } = useTranslation("common");
  const davr = useDavrStore((holat) => holat.holat);
  const davrniYuklash = useDavrStore((holat) => holat.yuklash);
  useEffect(() => {
    void davrniYuklash();
  }, [davrniYuklash]);

  const bugun = bugungiToshkentKuni();
  const yopilganKun = davr?.closedUntil ?? null;
  const engKichik = yopilganKun ? kunniSurish(yopilganKun, 1) : undefined;
  const yopiq = Boolean(yopilganKun && value && value <= yopilganKun);

  return (
    <div className="min-w-0">
      <input
        type="date"
        value={value}
        min={engKichik}
        max={bugun}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={yopiq || undefined}
        onChange={(event) => onChange(event.target.value)}
        className={className}
      />
      {korsatma && yopiq && yopilganKun && (
        <p className="mt-1.5 text-xs font-bold leading-5 text-red-600">{t("hujjatSanasi.closedHint", { sana: kunMatni(yopilganKun) })}</p>
      )}
      {korsatma && !yopiq && otganKunmi(value, bugun) && (
        <p className="mt-1.5 text-xs font-semibold leading-5 text-amber-600">{t("hujjatSanasi.pastHint")}</p>
      )}
    </div>
  );
}

// Ro'yxat qatorida: hujjat sanasi va kiritilgan kun farq qilsa "kiritilgan: 19.10.2026 11:50" belgisi.
export function KiritilganBelgisi({
  date,
  createdAt,
  className = "",
}: {
  date?: string | null;
  createdAt?: string | null;
  className?: string;
}) {
  const { t } = useTranslation("common");
  const vaqt = kiritilganVaqtMatni(date, createdAt);
  if (!vaqt) return null;
  return (
    <span className={`block whitespace-nowrap text-[11px] font-semibold leading-4 text-amber-600 ${className}`} title={t("hujjatSanasi.createdAtTitle")}>
      {t("hujjatSanasi.createdAt", { vaqt })}
    </span>
  );
}
