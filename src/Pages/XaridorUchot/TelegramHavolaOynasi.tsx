import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import AppModal from "@/Components/common/AppModal";
import MijozTelegramKarti from "./MijozTelegramKarti";
import type { Xaridor } from "./types";

// Mijozlar ro'yxatidagi "Havola" tugmasi: mijoz kartasini ochmasdan botga ulash havolasi (bir martalik, 7 kun) darhol yaratiladi va QR bilan ko'rsatiladi.
// Havola, QR, nusxalash va ulanishni kutish — mijoz kartasidagi "Telegramga ulash" bilan bir xil (shu komponent).
export default function TelegramHavolaOynasi({ xaridor, onYopish }: { xaridor: Xaridor; onYopish: () => void }) {
  const { t } = useTranslation("xaridor_uchot");
  const nomi = `${xaridor.familiya} ${xaridor.ism}`.trim() || xaridor.id;

  return (
    <AppModal onClose={onYopish}>
      <div className="w-full max-w-lg overflow-hidden rounded-[28px] bg-white shadow-[0_30px_90px_rgba(15,23,42,.24)]" data-testid="telegram-havola-oynasi">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 bg-linear-to-r from-orange-50 to-white px-6 py-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2563EB]">{t("telegramBot.createLink")}</p>
            <h2 className="mt-1 truncate text-xl font-black text-slate-900">{nomi}</h2>
          </div>
          <button
            type="button"
            onClick={onYopish}
            aria-label={t("telegramBot.disconnectConfirm.no")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            <X size={17} aria-hidden />
          </button>
        </header>
        <div className="max-h-[calc(100dvh-9rem)] overflow-y-auto p-5">
          <MijozTelegramKarti xaridor={xaridor} havolaBilanOchish />
        </div>
      </div>
    </AppModal>
  );
}
