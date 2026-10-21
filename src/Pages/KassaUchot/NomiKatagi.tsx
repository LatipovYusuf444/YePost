import { useTranslation } from "react-i18next";
import { useKassaSotuvi } from "@/hooks/useKassaSotuvlari";
import type { KassaSotuvKeshi } from "@/lib/kassaSotuvKeshi";
import { amaliyotSotuvIdsi, nomQismlari } from "./nomQismlari";
import type { KassaAmaliyoti } from "./types";

// Jadvaldagi "Nomi" katagi. Katak ekranda bo'lgandagina (ya'ni jadvalning ochiq sahifasidagina) sotuv mahsulotlari so'raladi.
export default function NomiKatagi({ amaliyot, kesh }: { amaliyot: KassaAmaliyoti; kesh: KassaSotuvKeshi }) {
  const { t } = useTranslation("kassa_uchot");
  const sotuv = useKassaSotuvi(kesh, amaliyotSotuvIdsi(amaliyot));
  const { sarlavha, tafsilot } = nomQismlari(amaliyot, sotuv, t);
  return (
    <span className="block min-w-0" title={[sarlavha, tafsilot].filter(Boolean).join(" — ")}>
      <span className="block truncate font-semibold text-slate-700">{sarlavha}</span>
      {tafsilot && <span className="block truncate text-xs font-semibold text-slate-400">{tafsilot}</span>}
    </span>
  );
}
