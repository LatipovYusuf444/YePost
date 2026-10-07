import type { ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type InlineLoadingProps = {
  matn?: string;
  // Aylanayotgan halqa ichidagi kichik ikonka (masalan, kartaning o'z ikonkasi).
  ikonka?: ReactNode;
  className?: string;
};

// Karta va jadval katagi ichida ma'lumot kelguncha ko'rsatiladigan ixcham yuklanish holati:
// aylanayotgan halqa (ichida ikonka) va "Yuklanmoqda..." yozuvi. Katta bo'sh joy uchun LoadingState ishlatiladi.
export default function InlineLoading({ matn = "Yuklanmoqda...", ikonka, className }: InlineLoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex items-center gap-3 text-sm font-semibold text-slate-500", className)}
    >
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center text-orange-500" aria-hidden>
        <span className="absolute inset-0 rounded-full border-[3px] border-orange-100" />
        <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-orange-500 motion-reduce:animate-none" />
        {ikonka ?? <LoaderCircle size={14} />}
      </span>
      <span className="animate-pulse motion-reduce:animate-none">{matn}</span>
    </div>
  );
}
