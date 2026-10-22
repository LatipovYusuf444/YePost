import type { MijozTelegramTuri } from "@/lib/telegramXabarnoma";

// Mijozning Telegram bot holati belgisi ranglari: mijoz kartasida ham, mijozlar ro'yxatida ham bir xil.
export const TELEGRAM_HOLAT_RANGI: Record<MijozTelegramTuri, string> = {
  ulangan: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  ulanmagan: "bg-slate-100 text-slate-500 ring-slate-200",
  ochirgan: "bg-amber-50 text-amber-700 ring-amber-100",
  bloklagan: "bg-red-50 text-red-600 ring-red-100",
};
