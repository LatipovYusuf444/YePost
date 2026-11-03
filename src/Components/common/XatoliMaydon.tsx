import type { ReactNode } from "react";
import { MAYDON_XATOSI } from "@/lib/maydonXatolari";

/**
 * Har qanday forma maydonini (yorliq + kiritish/tanlash) o'raydi: `xato` bo'lsa ichidagi boshqaruv qizil ramkada, ostida xato matni,
 * va `useMaydonXatolari` birinchi xatoli maydonga surishi uchun `data-maydon-xato` belgisi. Xato bo'lmasa hech narsa o'zgarmaydi.
 */
export default function XatoliMaydon({ xato, children, className = "" }: { xato?: string; children: ReactNode; className?: string }) {
  return (
    <div data-maydon-xato={xato ? "true" : undefined} className={`min-w-0 ${xato ? MAYDON_XATOSI : ""} ${className}`}>
      {children}
      {xato && <p role="alert" className="mt-1.5 text-xs font-bold leading-5 text-red-600">{xato}</p>}
    </div>
  );
}

/** Ro'yxat yoki guruh darajasidagi xato (masalan, "Kamida bitta mahsulot qo'shing"): suriladigan va qizil. */
export function MaydonXatosi({ matn }: { matn?: string }) {
  if (!matn) return null;
  return <p role="alert" data-maydon-xato="true" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 ring-1 ring-red-100">{matn}</p>;
}
