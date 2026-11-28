import { useId } from "react";
import { CalendarClock, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import AppSelect from "@/Components/ui/AppSelect";
import XatoliMaydon, { MaydonXatosi } from "@/Components/common/XatoliMaydon";
import { VAZIFA_TURLARI, tezMuddatlar } from "@/lib/crmNatija";
import { CRM_MAYDON, CRM_YORLIQ, VAZIFA_TURI_IKONKALARI } from "./crmBelgilar";
import type { NatijaFormasiBoshqaruvi, NatijaXodimi } from "./useNatijaFormasi";

// "Keyingi qadam" blokining ichi: vazifa turi, nima qilish, muddat (tez tanlovlar + sana/vaqt), mas'ul, tavsif.

type Props = {
  natija: NatijaFormasiBoshqaruvi;
  xodimlar?: NatijaXodimi[];
  masulTanlashMumkin?: boolean;
  disabled?: boolean;
};

export default function KeyingiQadamFormasi({ natija, xodimlar, masulTanlashMumkin = false, disabled = false }: Props) {
  const { t } = useTranslation("crm");
  const { forma, xatolar, keyinginiOzgartir, ogohlantirish } = natija;
  const k = forma.keyingi;
  // Tez tanlovlar har chizishda hozirgi vaqtdan (bugun 18:00 o'tib ketsa yo'qoladi).
  const id = useId();
  const tezlar = tezMuddatlar(new Date());
  const masulKorinadi = masulTanlashMumkin && Boolean(xodimlar?.length);

  return (
    <div className="space-y-3.5">
      <MaydonXatosi matn={xatolar.nextTask} />

      <div>
        <span className={CRM_YORLIQ}>{t("forma.vazifaTuri")}</span>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("forma.vazifaTuri")}>
          {VAZIFA_TURLARI.map((tur) => {
            const Ikonka = VAZIFA_TURI_IKONKALARI[tur];
            const faol = k.type === tur;
            return (
              <button
                key={tur}
                type="button"
                role="radio"
                aria-checked={faol}
                disabled={disabled}
                onClick={() => keyinginiOzgartir({ type: tur, ...(k.subject === natija.mavzular[k.type] ? { subject: natija.mavzular[tur] ?? k.subject } : {}) })}
                className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition disabled:opacity-60 ${
                  faol ? "border-[#2563EB] bg-[#2563EB] text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-[#2563EB]"
                }`}
              >
                <Ikonka size={14} aria-hidden />
                {t(`vazifaTurlari.${tur}`)}
              </button>
            );
          })}
        </div>
      </div>

      <XatoliMaydon xato={xatolar["nextTask.subject"]}>
        <label className={CRM_YORLIQ} htmlFor={`${id}-mavzu`}>{t("forma.mavzu")}</label>
        <input
          id={`${id}-mavzu`}
          value={k.subject}
          disabled={disabled}
          maxLength={200}
          onChange={(e) => keyinginiOzgartir({ subject: e.target.value })}
          placeholder={t("forma.mavzuPlaceholder")}
          className={CRM_MAYDON}
        />
      </XatoliMaydon>

      <XatoliMaydon xato={xatolar["nextTask.dueAt"]}>
        <span className={CRM_YORLIQ}>{t("forma.muddat")}</span>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {tezlar.map((m) => {
            const faol = k.kun === m.kun && k.vaqt === m.vaqt;
            return (
              <button
                key={m.kalit}
                type="button"
                disabled={disabled}
                aria-pressed={faol}
                onClick={() => keyinginiOzgartir({ kun: m.kun, vaqt: m.vaqt })}
                className={`h-8 rounded-full px-3 text-xs font-bold transition disabled:opacity-60 ${
                  faol ? "bg-[#2563EB] text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-[#2563EB]"
                }`}
              >
                {t(`muddatlar.${m.kalit}`)}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2">
          <div className="relative">
            <CalendarClock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="date"
              aria-label={t("forma.sana")}
              value={k.kun}
              disabled={disabled}
              onChange={(e) => keyinginiOzgartir({ kun: e.target.value })}
              className={`${CRM_MAYDON} pl-9`}
            />
          </div>
          <input
            type="time"
            aria-label={t("forma.vaqt")}
            value={k.vaqt}
            disabled={disabled}
            onChange={(e) => keyinginiOzgartir({ vaqt: e.target.value })}
            className={CRM_MAYDON}
          />
        </div>
        {ogohlantirish && (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold leading-5 text-amber-700">
            <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden />
            {ogohlantirish}
          </p>
        )}
      </XatoliMaydon>

      {masulKorinadi && (
        <XatoliMaydon xato={xatolar["nextTask.assigneeId"]}>
          <span className={CRM_YORLIQ}>{t("forma.masul")}</span>
          <AppSelect
            value={k.assigneeId}
            disabled={disabled}
            aria-label={t("forma.masul")}
            onChange={(e) => keyinginiOzgartir({ assigneeId: e.target.value })}
            className="h-11 rounded-xl text-sm font-semibold text-slate-800"
          >
            <option value="">{t("forma.masulStandart")}</option>
            {xodimlar!.map((x) => (
              <option key={x.id} value={x.id}>{x.nom}</option>
            ))}
          </AppSelect>
        </XatoliMaydon>
      )}

      <div>
        <label className={CRM_YORLIQ} htmlFor={`${id}-tavsif`}>{t("forma.tavsif")}</label>
        <input
          id={`${id}-tavsif`}
          value={k.description}
          disabled={disabled}
          maxLength={1000}
          onChange={(e) => keyinginiOzgartir({ description: e.target.value })}
          placeholder={t("forma.tavsifPlaceholder")}
          className={CRM_MAYDON}
        />
      </div>
    </div>
  );
}
