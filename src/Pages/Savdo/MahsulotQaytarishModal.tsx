import { useMemo, useState } from "react";
import { RotateCcw, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import AppModal from "@/Components/common/AppModal";
import { useSavdoStore } from "@/store/savdoStore";
import type { Qaytarish, QaytarishYaratishMalumoti, Sotuv } from "@/types/savdo";
import { mijozNomi, sananiFormatlash, sotuvRaqami } from "./savdoYordamchilari";
import QaytarishTafsilotlariModal from "./QaytarishTafsilotlariModal";
import QaytarishWizard from "./qaytarish/QaytarishWizard";

type MahsulotQaytarishModalProps = {
  sotuv: Sotuv;
  qaytarishlar: Qaytarish[];
  amalBajarilmoqda: boolean;
  onYopish: () => void;
  onYaratish: (malumot: QaytarishYaratishMalumoti) => Promise<Qaytarish | null>;
  onTasdiqlash: (qaytarishId: string) => Promise<boolean>;
  onMuvaffaqiyat: () => void;
};

// Sotuvlar jadvalidagi "Qaytarish" tugmasi: sotuv allaqachon tanlangan, shuning uchun wizard 2-bosqichdan boshlanadi.
// Yaratish va tasdiqlash oqimi o'zgarmagan (props orqali mavjud store funksiyalari).
export default function MahsulotQaytarishModal({
  sotuv,
  qaytarishlar,
  onYopish,
  onYaratish,
  onTasdiqlash,
  onMuvaffaqiyat,
}: MahsulotQaytarishModalProps) {
  const { t } = useTranslation("savdo_qaytarish");
  const qaytarishTafsilotiniYuklash = useSavdoStore((state) => state.qaytarishTafsilotiniYuklash);
  const [korilayotganId, setKorilayotganId] = useState<string | null>(null);
  const sotuvlar = useMemo(() => [sotuv], [sotuv]);

  return (
    <AppModal className="items-start justify-start bg-[rgba(15,23,42,.50)] p-3 backdrop-blur-[3px] lg:py-4 lg:pl-[88px] lg:pr-4">
      <section className="scrollbar-hidden h-[calc(100vh-24px)] w-full overflow-y-auto rounded-[34px] border border-orange-100 bg-[#F8FAFC] shadow-[0_30px_90px_rgba(15,23,42,.25)] lg:h-[calc(100vh-32px)]">
        <header className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-orange-100 bg-[#F8FAFC]/95 px-5 py-5 backdrop-blur sm:px-8 lg:px-10 lg:py-6">
          <div className="flex min-w-0 items-start gap-3">
            <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-200">
              <RotateCcw size={22} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">{t("wizard.modalEyebrow")}</p>
              <h2 className="mt-0.5 truncate text-xl font-black text-slate-900 sm:text-2xl">{sotuvRaqami(sotuv)}</h2>
              <p className="truncate text-sm font-semibold text-slate-500">
                {mijozNomi(sotuv)} · {sananiFormatlash(sotuv.createdAt)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onYopish}
            aria-label={t("header.closeAria")}
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </header>

        <div className="px-4 py-5 sm:px-8 lg:px-10 lg:py-8">
          <QaytarishWizard
            sotuvlar={sotuvlar}
            qaytarishlar={qaytarishlar}
            boshlangichSotuvId={sotuv.id}
            onSotuvTafsilotiniOlish={async () => sotuv}
            onYaratish={onYaratish}
            onTasdiqlash={onTasdiqlash}
            onTafsilotiniOlish={qaytarishTafsilotiniYuklash}
            onHujjatniKorish={setKorilayotganId}
            onYopish={onYopish}
            onMuvaffaqiyat={onMuvaffaqiyat}
          />
        </div>
      </section>
      {korilayotganId && <QaytarishTafsilotlariModal qaytarishId={korilayotganId} onYopish={() => setKorilayotganId(null)} />}
    </AppModal>
  );
}
