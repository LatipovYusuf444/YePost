import type { ReactNode } from "react";
import { Banknote, CreditCard, Landmark } from "lucide-react";
import { tolovRangGuruhi, TOLOV_TURI_RANGLARI } from "@/lib/tolovTuriRanglari";
import { cn } from "@/lib/utils";

const IKONKALAR = { naqd: Banknote, karta: CreditCard, bank: Landmark, tolanmagan: null } as const;

// To'lov turining rangli belgisi (TOLOV_TURI_RANGLARI): Naqd — yashil, Karta — ko'k, Bank — siyohrang, To'lanmagan — kulrang.
// `summa` berilsa belgining ichida nomdan keyin ko'rsatiladi (tor ustunda faqat nomi).
export default function TolovTuriBelgisi({
  turi,
  children,
  summa,
  ikonka = true,
  className,
  title,
}: {
  turi: string | null | undefined;
  children: ReactNode;
  summa?: ReactNode;
  ikonka?: boolean;
  className?: string;
  title?: string;
}) {
  const guruh = tolovRangGuruhi(turi);
  const Ikonka = ikonka ? IKONKALAR[guruh] : null;
  return (
    <span
      data-tolov-turi={guruh}
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-bold ring-1",
        TOLOV_TURI_RANGLARI[guruh].klass,
        className
      )}
    >
      {Ikonka && <Ikonka size={13} aria-hidden className="shrink-0" />}
      {children}
      {summa !== undefined && summa !== null && <span className="tabular-nums">{summa}</span>}
    </span>
  );
}
