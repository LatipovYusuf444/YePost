import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ShoppingCart } from "lucide-react";
import LoadingState from "@/Components/common/LoadingState";
import { cn } from "@/lib/utils";

// Savdo bo'limi jadvallari ichida ma'lumot kelguncha ko'rsatiladigan markazlashgan yuklanish holati
// (aylanayotgan halqa, ikonka va "Ma'lumotlar yuklanmoqda..."). Sarlavha va filtrlar joyida qoladi.
export default function JadvalYuklanmoqda({ ikonka, className }: { ikonka?: ReactNode; className?: string }) {
  const { t } = useTranslation("savdo_bosh");
  return (
    <LoadingState
      matn={t("savdoSahifasi.loading")}
      ikonka={ikonka ?? <ShoppingCart size={24} />}
      className={cn("min-h-[360px] rounded-none border-0 bg-transparent", className)}
    />
  );
}
