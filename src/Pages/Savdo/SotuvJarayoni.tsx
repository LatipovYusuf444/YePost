import { useTranslation } from "react-i18next";
import { ArrowRight, Ban, Check, CheckCircle2, ChevronRight, CreditCard, LoaderCircle, Package } from "lucide-react";
import type { Sotuv, SotuvHolati } from "@/types/savdo";
import { pulniFormatlash, sotuvHolatiMatni, sotuvQarzdorlikSummasi, sotuvTolanganSummasi } from "./savdoYordamchilari";

type QadamHolati = "bajarilgan" | "joriy" | "kutilmoqda";

type JarayonQadami = {
  kalit: string;
  nom: string;
  izoh: string;
  holat: QadamHolati;
};

type SotuvJarayoniProps = {
  sotuv: Sotuv;
  jami: number;
  holat: SotuvHolati;
  amalBajarilmoqda: boolean;
  onTolovOchish: () => void;
  onOmbordanChiqarish: () => void;
};

const QADAM_STILI: Record<QadamHolati, { karta: string; doira: string; nom: string }> = {
  bajarilgan: {
    karta: "border-emerald-100 bg-emerald-50/70",
    doira: "bg-emerald-500 text-white",
    nom: "text-emerald-800",
  },
  joriy: {
    karta: "border-[#2563EB]/30 bg-orange-50 ring-2 ring-orange-100",
    doira: "bg-[#2563EB] text-white shadow-[0_8px_18px_rgba(37,99,235,.30)]",
    nom: "text-slate-900",
  },
  kutilmoqda: {
    karta: "border-slate-100 bg-slate-50/80",
    doira: "bg-slate-200 text-slate-500",
    nom: "text-slate-500",
  },
};

// Sotuv hayot sikli: qoralama yaratiladi → ombordan chiqarish tasdiqlanadi → to'lov qabul qilinadi → yakun.
// To'lovni tasdiqlashdan oldin ham qabul qilish mumkin, shuning uchun "to'lov" qadami mustaqil hisoblanadi.
export default function SotuvJarayoni({ sotuv, jami, holat, amalBajarilmoqda, onTolovOchish, onOmbordanChiqarish }: SotuvJarayoniProps) {
  const { t } = useTranslation("savdo_tafsilot");
  const tasdiqlangan = holat === "CONFIRMED";
  const tolangan = sotuvTolanganSummasi(sotuv);
  const qarz = sotuvQarzdorlikSummasi(sotuv);
  const toliqTolangan = qarz <= 0;

  if (holat === "CANCELLED") {
    return (
      <section className="flex items-start gap-4 rounded-[24px] border border-red-100 bg-red-50/70 p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-500">
          <Ban size={20} />
        </span>
        <div>
          <h3 className="font-black text-red-700">{t("jarayon.keyingi.bekor.sarlavha")}</h3>
          <p className="mt-1 text-sm text-red-500">{t("jarayon.keyingi.bekor.tavsif")}</p>
        </div>
      </section>
    );
  }

  const qadamlar: JarayonQadami[] = [
    {
      kalit: "yaratildi",
      nom: t("jarayon.qadamlar.yaratildi.nom"),
      izoh: t("jarayon.qadamlar.yaratildi.izoh"),
      holat: "bajarilgan",
    },
    {
      kalit: "ombor",
      nom: t("jarayon.qadamlar.ombor.nom"),
      izoh: tasdiqlangan ? t("jarayon.qadamlar.ombor.izohBajarilgan") : t("jarayon.qadamlar.ombor.izohKutilmoqda"),
      holat: tasdiqlangan ? "bajarilgan" : "joriy",
    },
    {
      kalit: "tolov",
      nom: t("jarayon.qadamlar.tolov.nom"),
      izoh: toliqTolangan
        ? t("jarayon.qadamlar.tolov.izohToliq")
        : tolangan > 0
          ? t("jarayon.qadamlar.tolov.izohQisman", { tolangan: pulniFormatlash(tolangan), jami: pulniFormatlash(jami) })
          : t("jarayon.qadamlar.tolov.izohYoq"),
      holat: toliqTolangan ? "bajarilgan" : tasdiqlangan ? "joriy" : "kutilmoqda",
    },
    {
      kalit: "yakun",
      nom: t("jarayon.qadamlar.yakun.nom"),
      izoh: tasdiqlangan && toliqTolangan ? t("jarayon.qadamlar.yakun.izohBajarilgan") : t("jarayon.qadamlar.yakun.izohKutilmoqda"),
      holat: tasdiqlangan && toliqTolangan ? "bajarilgan" : "kutilmoqda",
    },
  ];

  const yakunlandi = tasdiqlangan && toliqTolangan;

  return (
    <section className="rounded-[24px] border border-orange-100/80 bg-white/92 p-5 shadow-[0_18px_46px_rgba(37,99,235,.08)] backdrop-blur">
      <div className="flex items-center justify-between gap-3 border-b border-orange-100 pb-3">
        <h2 className="text-xs font-black uppercase tracking-wide text-slate-600">{t("jarayon.sarlavha")}</h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            tasdiqlangan ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" : "bg-amber-50 text-amber-700 ring-1 ring-amber-100"
          }`}
        >
          {sotuvHolatiMatni[holat]}
        </span>
      </div>

      <ol className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {qadamlar.map((qadam, index) => {
          const stil = QADAM_STILI[qadam.holat];
          return (
            <li
              key={qadam.kalit}
              aria-current={qadam.holat === "joriy" ? "step" : undefined}
              className={`relative flex items-start gap-3 rounded-2xl border p-4 transition ${stil.karta}`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${stil.doira}`}>
                {qadam.holat === "bajarilgan" ? <Check size={18} strokeWidth={3} /> : index + 1}
              </span>
              <div className="min-w-0">
                <p className={`flex flex-wrap items-center gap-2 text-sm font-black ${stil.nom}`}>
                  {qadam.nom}
                  {qadam.holat === "joriy" && (
                    <span className="rounded-full bg-[#2563EB] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                      {t("jarayon.hozir")}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{qadam.izoh}</p>
              </div>
              {index < qadamlar.length - 1 && (
                <span className="absolute -right-[13px] top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-300 shadow-sm ring-1 ring-slate-100 xl:flex">
                  <ChevronRight size={14} />
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {yakunlandi ? (
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
          <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-emerald-500" />
          <div>
            <p className="font-black text-emerald-800">{t("jarayon.keyingi.yakunlandi.sarlavha")}</p>
            <p className="mt-0.5 text-sm text-emerald-700">{t("jarayon.keyingi.yakunlandi.tavsif")}</p>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-orange-50 to-white p-4 ring-1 ring-orange-100">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#2563EB] shadow-sm ring-1 ring-orange-100">
              {tasdiqlangan ? <CreditCard size={21} /> : <Package size={21} />}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#2563EB]">{t("jarayon.keyingiQadam")}</p>
              <p className="mt-0.5 font-black text-slate-900">
                {tasdiqlangan ? t("jarayon.keyingi.tolov.sarlavha") : t("jarayon.keyingi.ombor.sarlavha")}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {tasdiqlangan
                  ? t("jarayon.keyingi.tolov.tavsif", { summa: pulniFormatlash(qarz) })
                  : t("jarayon.keyingi.ombor.tavsif")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!tasdiqlangan && !toliqTolangan && (
              <button
                type="button"
                disabled={amalBajarilmoqda}
                onClick={onTolovOchish}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-orange-100 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-[#2563EB] hover:text-[#2563EB] disabled:opacity-50"
              >
                <CreditCard size={16} />
                {t("header.tolovniQabulQilish")}
              </button>
            )}
            <button
              type="button"
              disabled={amalBajarilmoqda}
              onClick={tasdiqlangan ? onTolovOchish : onOmbordanChiqarish}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#2563EB] px-5 text-sm font-black text-white shadow-[0_10px_24px_rgba(37,99,235,.22)] transition hover:bg-[#1D4ED8] disabled:opacity-50"
            >
              {amalBajarilmoqda ? <LoaderCircle size={16} className="animate-spin" /> : null}
              {tasdiqlangan ? t("jarayon.keyingi.tolov.tugma") : t("jarayon.keyingi.ombor.tugma")}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
