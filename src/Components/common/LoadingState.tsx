import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type LoadingStateProps = {
  matn: string;
  // Aylanayotgan halqa ichidagi ikonka (masalan, sahifa ikonkasi).
  ikonka?: ReactNode;
  className?: string;
};

// Ma'lumot kelguncha sahifa o'rtasida ko'rsatiladigan chiroyli yuklanish holati: aylanayotgan halqa, ikonka va matn.
export default function LoadingState({ matn, ikonka, className }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex min-h-[320px] flex-col items-center justify-center gap-5 rounded-[28px] border border-dashed border-orange-200 bg-gradient-to-br from-white via-white to-orange-50/50 px-6 py-16 text-center",
        className
      )}
    >
      <div className="relative flex h-20 w-20 items-center justify-center">
        <span className="absolute inset-0 rounded-full border-4 border-orange-100" />
        <span className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-orange-500" />
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">{ikonka}</span>
      </div>
      <p className="animate-pulse text-sm font-bold text-slate-500">{matn}</p>
    </div>
  );
}
