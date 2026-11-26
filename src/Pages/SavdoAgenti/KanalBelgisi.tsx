import { useTranslation } from "react-i18next";
import { Bot, Smartphone } from "lucide-react";
import { kanalTuri } from "@/lib/savdoAgenti";

// Suhbat/lid kanali: "Bot" (TELEGRAM_BOT) yoki "Telegram akkaunt" (TELEGRAM_BUSINESS — do'konning o'z akkaunti).
export default function KanalBelgisi({ kanal, ixcham = false }: { kanal?: string | null; ixcham?: boolean }) {
  const { t } = useTranslation("savdo_agenti");
  const tur = kanalTuri(kanal);
  const Icon = tur === "BUSINESS" ? Smartphone : Bot;
  const matn = t(`kanal.${tur}`);
  return (
    <span
      title={matn}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full font-bold ${ixcham ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]"} ${
        tur === "BUSINESS" ? "bg-violet-50 text-violet-700 ring-1 ring-violet-100" : "bg-sky-50 text-sky-700 ring-1 ring-sky-100"
      }`}
    >
      <Icon size={ixcham ? 10 : 12} className="shrink-0" />
      {matn}
    </span>
  );
}
