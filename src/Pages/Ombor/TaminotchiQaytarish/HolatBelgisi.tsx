import { useTranslation } from "react-i18next";
import { qaytarishHolati } from "@/lib/taminotchiQaytarish";
import { HOLAT_RANGI } from "./yordamchi";

export default function HolatBelgisi({ status }: { status?: string | null }) {
  const { t } = useTranslation("ombor_royxat");
  const holat = qaytarishHolati(status);
  return <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-black ring-1 ${HOLAT_RANGI[holat] ?? HOLAT_RANGI.DRAFT}`}>{t(`taminotchiQaytarish.status.${holat}`, { defaultValue: holat })}</span>;
}
