import { CircleCheck, Link2, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { vaqtMatni } from "@/lib/hujjatSanasi";
import { mijozTelegramHolati, mijozTelegramTuri, type MijozTelegramHolati } from "@/lib/telegramXabarnoma";
import { TELEGRAM_HOLAT_RANGI } from "./telegramHolati";

// Mijozning Telegram bot holati: bloklagan / ulanmagan / o'chirgan (/stop) / ulangan. Ulanmagan mijozda yonida "Havola" tugmasi: bosilsa botga ulash
// havolasi (QR bilan) ochiladi — mijozga shuni yuborish kerak. Izoh (sichqoncha ustiga olib borilganda) — ulangan vaqti yoki muammo sababi.
export default function TelegramHolatBelgisi({ holat, onHavola }: { holat?: MijozTelegramHolati; onHavola?: () => void }) {
  const { t } = useTranslation("xaridor_uchot");
  const tur = mijozTelegramTuri(holat ?? mijozTelegramHolati({}));
  const izoh =
    tur === "ulangan" && holat?.ulanganVaqt
      ? t("telegramBot.linkedAt", { vaqt: vaqtMatni(holat.ulanganVaqt) })
      : tur === "ochirgan" || tur === "bloklagan"
        ? t(`telegramBot.hints.${tur}`)
        : undefined;
  const Belgi = tur === "ulangan" ? CircleCheck : Send;

  return (
    <span className="inline-flex items-center gap-2">
      <span
        title={izoh}
        data-testid="telegram-holati"
        data-holat={tur}
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-black ring-1 ${TELEGRAM_HOLAT_RANGI[tur]}`}
      >
        <Belgi size={12} aria-hidden />
        {t(`telegramBot.kolonka.${tur}`)}
      </span>
      {onHavola && tur === "ulanmagan" && (
        <button
          type="button"
          data-testid="telegram-havola"
          onClick={(voqea) => {
            voqea.stopPropagation();
            onHavola();
          }}
          className="inline-flex h-6 items-center gap-1 rounded-lg bg-[#2563EB] px-2 text-[11px] font-black text-white shadow-sm transition hover:bg-[#1D4ED8]"
        >
          <Link2 size={11} aria-hidden />
          {t("xaridorlar.telegramFilter.havola")}
        </button>
      )}
    </span>
  );
}
