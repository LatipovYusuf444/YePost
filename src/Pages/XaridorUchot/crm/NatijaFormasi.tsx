import { useEffect, useId } from "react";
import { Check, ListChecks, Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import AppSelect from "@/Components/ui/AppSelect";
import XatoliMaydon from "@/Components/common/XatoliMaydon";
import { kunMatni } from "@/lib/hujjatSanasi";
import { CONTACT_TURLARI, NATIJALAR, RAD_SABABLARI, keyingiQadamKerakmi } from "@/lib/crmNatija";
import type { ContactTuri } from "@/types/crm";
import { CONTACT_TURI_IKONKALARI, CRM_MATN_MAYDONI, CRM_YORLIQ, NATIJA_BELGILARI } from "./crmBelgilar";
import KeyingiQadamFormasi from "./KeyingiQadamFormasi";
import type { NatijaFormasiBoshqaruvi, NatijaSotuvi, NatijaXodimi } from "./useNatijaFormasi";

// Faoliyat natijasi formasi (boshqariladigan): tur, natija, rad sababi, izoh, sotuv (ORDER), keyingi qadam.
// Holat ota komponentda: const natija = useNatijaFormasi({...}); <NatijaFormasi natija={natija} />.

export type NatijaFormasiProps = {
  natija: NatijaFormasiBoshqaruvi;
  /** Berilsa tur tanlovi yashiriladi va forma shu turda bo'ladi. */
  qatiyTur?: ContactTuri;
  /** "Zakaz olindi" da bog'lash uchun shu mijozning sotuvlari; bo'sh bo'lsa tanlov ko'rinmaydi. */
  sotuvlar?: NatijaSotuvi[];
  /** Mas'ul tanlovi uchun xodimlar (faqat `masulTanlashMumkin` bilan ko'rinadi). */
  xodimlar?: NatijaXodimi[];
  masulTanlashMumkin?: boolean;
  disabled?: boolean;
  className?: string;
};

function sotuvMatni(sotuv: NatijaSotuvi) {
  const qismlar = [sotuv.docNumber || `#${sotuv.id.slice(0, 8)}`];
  if (sotuv.date) qismlar.push(kunMatni(sotuv.date));
  if (sotuv.jamiMatni) qismlar.push(sotuv.jamiMatni);
  else if (sotuv.total !== undefined && sotuv.total !== null && sotuv.total !== "" && Number.isFinite(Number(sotuv.total))) {
    qismlar.push(Number(sotuv.total).toLocaleString("ru-RU", { maximumFractionDigits: 2 }));
  }
  return qismlar.filter(Boolean).join(" · ");
}

export default function NatijaFormasi({ natija, qatiyTur, sotuvlar, xodimlar, masulTanlashMumkin = false, disabled = false, className = "" }: NatijaFormasiProps) {
  const { t } = useTranslation("crm");
  const id = useId();
  const { forma, xatolar, natijaTanla, turTanla, setForma, keyingiOchiqligi } = natija;
  const majburiy = keyingiQadamKerakmi(forma.result) === "majburiy";
  const keyingiKorinadi = Boolean(forma.result) && (majburiy || forma.keyingiOchiq);

  // Qat'iy tur berilgan: forma shu turda bo'lsin (o'zgarish deb hisoblanmaydi).
  useEffect(() => {
    if (qatiyTur && forma.type !== qatiyTur) turTanla(qatiyTur, true);
  }, [forma.type, qatiyTur, turTanla]);

  return (
    <div className={`space-y-4 ${className}`}>
      {!qatiyTur && (
        <XatoliMaydon xato={xatolar.type}>
          <span className={CRM_YORLIQ}>{t("forma.turi")}</span>
          <div className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1" role="radiogroup" aria-label={t("forma.turi")}>
            {CONTACT_TURLARI.map((tur) => {
              const Ikonka = CONTACT_TURI_IKONKALARI[tur];
              const faol = forma.type === tur;
              return (
                <button
                  key={tur}
                  type="button"
                  role="radio"
                  aria-checked={faol}
                  disabled={disabled}
                  onClick={() => turTanla(tur)}
                  className={`inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-bold transition disabled:opacity-60 ${
                    faol ? "bg-white text-[#2563EB] shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Ikonka size={16} className="shrink-0" aria-hidden />
                  <span className="truncate">{t(`turlar.${tur}`)}</span>
                </button>
              );
            })}
          </div>
        </XatoliMaydon>
      )}

      <XatoliMaydon xato={xatolar.result}>
        <span className={CRM_YORLIQ}>{t("forma.natija")}</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t("forma.natija")}>
          {NATIJALAR.map((natijaKaliti) => {
            const belgi = NATIJA_BELGILARI[natijaKaliti];
            const Ikonka = belgi.ikonka;
            const faol = forma.result === natijaKaliti;
            return (
              <button
                key={natijaKaliti}
                type="button"
                role="radio"
                aria-checked={faol}
                disabled={disabled}
                onClick={() => natijaTanla(natijaKaliti)}
                className={`group inline-flex h-11 min-w-0 items-center gap-2 rounded-xl border px-3 text-left text-sm font-bold transition active:scale-[.98] disabled:opacity-60 ${faol ? belgi.faol : belgi.oddiy}`}
              >
                <Ikonka size={17} className="shrink-0" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{t(`natijalar.${natijaKaliti}`)}</span>
                {faol && <Check size={15} className="shrink-0" aria-hidden />}
              </button>
            );
          })}
        </div>
      </XatoliMaydon>

      {forma.result === "REJECTED" && (
        <XatoliMaydon xato={xatolar.rejectReason} className="animate-in fade-in-0 slide-in-from-top-1 duration-200">
          <span className={CRM_YORLIQ}>{t("forma.sabab")}</span>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("forma.sabab")}>
            {RAD_SABABLARI.map((sabab) => {
              const faol = forma.rejectReason === sabab;
              return (
                <button
                  key={sabab}
                  type="button"
                  role="radio"
                  aria-checked={faol}
                  disabled={disabled}
                  onClick={() => setForma((f) => ({ ...f, rejectReason: sabab }))}
                  className={`h-9 rounded-full border px-3.5 text-xs font-bold transition disabled:opacity-60 ${
                    faol ? "border-rose-500 bg-rose-500 text-white shadow-sm" : "border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                  }`}
                >
                  {t(`sabablar.${sabab}`)}
                </button>
              );
            })}
          </div>
        </XatoliMaydon>
      )}

      {forma.result === "ORDER" && Boolean(sotuvlar?.length) && (
        <XatoliMaydon xato={xatolar.saleId} className="animate-in fade-in-0 slide-in-from-top-1 duration-200">
          <span className={CRM_YORLIQ}>{t("forma.sotuv")}</span>
          <AppSelect
            value={forma.saleId}
            disabled={disabled}
            aria-label={t("forma.sotuv")}
            onChange={(e) => setForma((f) => ({ ...f, saleId: e.target.value }))}
            className="h-11 rounded-xl text-sm font-semibold text-slate-800"
          >
            <option value="">{t("forma.sotuvYoq")}</option>
            {sotuvlar!.map((sotuv) => (
              <option key={sotuv.id} value={sotuv.id}>{sotuvMatni(sotuv)}</option>
            ))}
          </AppSelect>
          {!forma.saleId && <p className="mt-1 text-xs font-medium text-slate-400">{t("forma.sotuvIzoh")}</p>}
        </XatoliMaydon>
      )}

      <XatoliMaydon xato={xatolar.text}>
        <label className={CRM_YORLIQ} htmlFor={`${id}-izoh`}>{t("forma.izoh")}</label>
        <textarea
          id={`${id}-izoh`}
          value={forma.text}
          disabled={disabled}
          maxLength={2000}
          rows={3}
          onChange={(e) => setForma((f) => ({ ...f, text: e.target.value }))}
          placeholder={forma.result === "REJECTED" ? t("forma.izohRadPlaceholder") : t("forma.izohPlaceholder")}
          className={CRM_MATN_MAYDONI}
        />
      </XatoliMaydon>

      {forma.result && (
        keyingiKorinadi ? (
          <section
            className={`animate-in fade-in-0 slide-in-from-top-1 rounded-2xl border p-4 duration-200 ${
              majburiy ? "border-blue-200 bg-blue-50/50" : "border-slate-200 bg-slate-50/70"
            }`}
            aria-label={t("forma.keyingiQadam")}
          >
            <header className="mb-3 flex items-center justify-between gap-2">
              <h3 className="inline-flex items-center gap-2 text-sm font-black text-slate-800">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2563EB] text-white">
                  <ListChecks size={15} aria-hidden />
                </span>
                {t("forma.keyingiQadam")}
              </h3>
              {majburiy ? (
                <span className="rounded-full bg-[#2563EB]/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-[#2563EB]">
                  {t("forma.keyingiMajburiy")}
                </span>
              ) : (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => keyingiOchiqligi(false)}
                  className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-bold text-slate-500 transition hover:bg-white hover:text-rose-600"
                >
                  <X size={14} aria-hidden />
                  {t("forma.keyingiOlibTashlash")}
                </button>
              )}
            </header>
            <KeyingiQadamFormasi natija={natija} xodimlar={xodimlar} masulTanlashMumkin={masulTanlashMumkin} disabled={disabled} />
          </section>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => keyingiOchiqligi(true)}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 text-sm font-bold text-slate-500 transition hover:border-[#2563EB] hover:bg-blue-50/60 hover:text-[#2563EB] disabled:opacity-60"
          >
            <Plus size={16} aria-hidden />
            {t("forma.keyingiQoshish")}
          </button>
        )
      )}
    </div>
  );
}
