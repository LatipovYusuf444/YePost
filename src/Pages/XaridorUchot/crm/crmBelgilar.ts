// CRM natija/tur belgilari: ikonka va ranglar (forma, faoliyat oqimi, "Bugungi ishlar" — hammasi bir xil ko'rinsin).
// Diqqat: bu mavzuda "orange-*" ko'k rangga almashtirilgan — haqiqiy rang uchun emerald/amber/rose/sky ishlatiladi.
import {
  CircleX,
  ClipboardList,
  Clock,
  Handshake,
  Hourglass,
  MessageCircle,
  PackageCheck,
  Phone,
  PhoneMissed,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { ActivityTuri, ContactNatijasi, ContactTuri } from "@/types/crm";

export type NatijaBelgisi = {
  ikonka: LucideIcon;
  /** Tanlangan chip. */
  faol: string;
  /** Tanlanmagan chip (hover bilan). */
  oddiy: string;
  /** Kichik nishon (faoliyat oqimida). */
  nishon: string;
  /** Ikonka/nuqta rangi. */
  rang: string;
};

export const NATIJA_BELGILARI: Record<ContactNatijasi, NatijaBelgisi> = {
  ORDER: {
    ikonka: PackageCheck,
    faol: "border-emerald-500 bg-emerald-500 text-white shadow-[0_8px_20px_rgba(16,185,129,.28)]",
    oddiy: "border-emerald-200 bg-emerald-50/60 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50",
    nishon: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    rang: "text-emerald-600",
  },
  LATER: {
    ikonka: Clock,
    faol: "border-sky-500 bg-sky-500 text-white shadow-[0_8px_20px_rgba(14,165,233,.28)]",
    oddiy: "border-sky-200 bg-sky-50/60 text-sky-700 hover:border-sky-300 hover:bg-sky-50",
    nishon: "bg-sky-50 text-sky-700 ring-sky-200",
    rang: "text-sky-600",
  },
  THINKING: {
    ikonka: Hourglass,
    faol: "border-amber-500 bg-amber-500 text-white shadow-[0_8px_20px_rgba(245,158,11,.28)]",
    oddiy: "border-amber-200 bg-amber-50/60 text-amber-700 hover:border-amber-300 hover:bg-amber-50",
    nishon: "bg-amber-50 text-amber-700 ring-amber-200",
    rang: "text-amber-600",
  },
  NO_ANSWER: {
    ikonka: PhoneMissed,
    faol: "border-slate-600 bg-slate-600 text-white shadow-[0_8px_20px_rgba(71,85,105,.25)]",
    oddiy: "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100",
    nishon: "bg-slate-100 text-slate-600 ring-slate-200",
    rang: "text-slate-500",
  },
  REJECTED: {
    ikonka: CircleX,
    faol: "border-rose-500 bg-rose-500 text-white shadow-[0_8px_20px_rgba(244,63,94,.28)]",
    oddiy: "border-rose-200 bg-rose-50/60 text-rose-700 hover:border-rose-300 hover:bg-rose-50",
    nishon: "bg-rose-50 text-rose-700 ring-rose-200",
    rang: "text-rose-600",
  },
};

export const VAZIFA_TURI_IKONKALARI: Record<ActivityTuri, LucideIcon> = {
  CALL: Phone,
  MEETING: Handshake,
  MESSAGE: MessageCircle,
  DEBT: Wallet,
  TASK: ClipboardList,
};

export const CONTACT_TURI_IKONKALARI: Record<ContactTuri, LucideIcon> = {
  CALL: Phone,
  MEETING: Handshake,
  MESSAGE: MessageCircle,
};

/** Noma'lum qiymatda ham ikonka qaytaradi. */
export function vazifaIkonkasi(type?: string | null): LucideIcon {
  return VAZIFA_TURI_IKONKALARI[(type ?? "TASK") as ActivityTuri] ?? ClipboardList;
}

export function natijaBelgisi(result?: string | null): NatijaBelgisi | null {
  return result && result in NATIJA_BELGILARI ? NATIJA_BELGILARI[result as ContactNatijasi] : null;
}

/** Forma maydoni va yorlig'i (natija formasi, keyingi qadam, bekor qilish oynasi). */
export const CRM_MAYDON =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400";
export const CRM_MATN_MAYDONI =
  "min-h-[84px] w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50";
export const CRM_YORLIQ = "mb-1.5 block text-xs font-bold text-slate-500";
