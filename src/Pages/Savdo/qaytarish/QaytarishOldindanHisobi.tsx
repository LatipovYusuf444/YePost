import { AlertCircle, LoaderCircle, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import QaytarishHisobKitobi from "./QaytarishHisobKitobi";
import type { HisobKitob } from "./hisobKitob";

export type OldindanKorinishHolati =
  | { turi: "bosh" }
  | { turi: "yuklanmoqda" }
  | { turi: "xato"; xabar: string }
  | { turi: "tayyor"; hisob: HisobKitob };

type Props = {
  holat: OldindanKorinishHolati;
  usul?: string;
  ixcham?: boolean;
  onQaytaUrinish: () => void;
};

// Backend hisob-kitobi (POST /returns/preview) holatlari: yuklanmoqda / xato (qayta urinish bilan) / tayyor.
// Wizard (4–5-bosqich) va qoralama hujjat tafsiloti shu komponentdan foydalanadi.
export default function QaytarishOldindanHisobi({ holat, usul, ixcham = false, onQaytaUrinish }: Props) {
  const { t } = useTranslation("savdo_qaytarish");

  if (holat.turi === "tayyor") return <QaytarishHisobKitobi hisob={holat.hisob} usul={usul} ixcham={ixcham} oldindan />;

  if (holat.turi === "xato") {
    return (
      <div role="alert" className="rounded-[22px] border border-rose-100 bg-rose-50 px-5 py-4">
        <p className="flex items-start gap-2 text-sm font-bold text-rose-600">
          <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden /> {t("wizard.calc.previewFailed")}
        </p>
        <p className="mt-1 break-words text-xs font-medium text-rose-500">{holat.xabar}</p>
        <p className="mt-1 text-xs font-semibold text-rose-500">{t("wizard.calc.cannotConfirm")}</p>
        <button
          type="button"
          onClick={onQaytaUrinish}
          className="mt-3 inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl bg-white px-3 text-xs font-extrabold text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-100"
        >
          <RefreshCw size={13} aria-hidden /> {t("wizard.retry")}
        </button>
      </div>
    );
  }

  return (
    <p role="status" className="flex items-center justify-center gap-2 rounded-[22px] border border-dashed border-slate-200 px-5 py-12 text-sm font-semibold text-slate-500">
      <LoaderCircle size={17} className="animate-spin text-orange-500" aria-hidden /> {t("wizard.calc.loading")}
    </p>
  );
}
