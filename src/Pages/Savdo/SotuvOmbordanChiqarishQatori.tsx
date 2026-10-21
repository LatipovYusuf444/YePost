import { useState } from "react";
import { CheckCircle2, ChevronDown, LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useHujjatHarakatlari } from "@/hooks/useHujjatHarakatlari";
import { useNakladnoy } from "@/hooks/useNakladnoy";
import { ombordanChiqarishSanasi } from "@/lib/hujjatHarakatlari";
import { kunMatni } from "@/lib/hujjatSanasi";
import type { Sotuv } from "@/types/savdo";
import { sotuvHolati, sotuvRaqami } from "./savdoYordamchilari";

// Kelishuv kartasida, to'lov qatorlari tagida: sotuv tasdiqlanib mahsulot ombordan chiqarilgach "Ombordan chiqarish" qatori havola bo'lib chiqadi
// (xuddi qabul qilingan to'lov havolasi kabi). Havola shu sotuv bilan chiqqan mahsulotlar oynasini ochadi; "Amallar" menyusida PDF nakladnoy ham bor.
export default function SotuvOmbordanChiqarishQatori({ sotuv, onOchish }: { sotuv: Sotuv; onOchish: () => void }) {
  const { t } = useTranslation("savdo_tafsilot");
  const [menuOchiq, setMenuOchiq] = useState(false);
  const holat = sotuvHolati(sotuv);
  const chiqarilgan = holat === "CONFIRMED";
  const { harakatlar } = useHujjatHarakatlari(sotuv.id, chiqarilgan, holat);
  const nakladnoy = useNakladnoy(sotuv.id, sotuvRaqami(sotuv));

  if (!chiqarilgan) return null;

  const { sana } = ombordanChiqarishSanasi(harakatlar, sotuv);
  const sanaMatni = kunMatni(sana);
  const tovarSoni = new Set((harakatlar ?? []).map((harakat) => harakat.variantId ?? harakat.mahsulotId ?? harakat.kalit)).size;

  return (
    <div className="mt-4 border-t border-slate-100 pt-4" data-testid="ombordan-chiqarish-qatori">
      <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">{t("ombordanChiqarishQatori.sarlavha")}</p>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl bg-white px-3.5 py-3 ring-1 ring-slate-100">
        <button
          type="button"
          onClick={onOchish}
          className="min-w-0 text-left text-sm font-medium text-[#2563EB] transition hover:text-[#1D4ED8] hover:underline"
        >
          {t("ombordanChiqarishQatori.nomi", { raqam: sotuvRaqami(sotuv) })}
          {sanaMatni ? ` — ${sanaMatni}` : ""}
          {tovarSoni > 0 ? ` (${t("ombordanChiqarishQatori.xulosa", { soni: tovarSoni })})` : ""}
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOchiq((joriy) => !joriy)}
              className="inline-flex h-6 items-center gap-1 rounded-full bg-slate-100 px-2.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-200"
            >
              {t("ombordanChiqarishQatori.amallar")}
              <ChevronDown size={12} className={`transition ${menuOchiq ? "rotate-180" : ""}`} />
            </button>
            {menuOchiq && (
              <>
                <button type="button" aria-label={t("ombordanChiqarishQatori.yopish")} className="fixed inset-0 z-30 cursor-default" onClick={() => setMenuOchiq(false)} />
                <div className="absolute right-0 top-8 z-40 w-[210px] rounded-2xl bg-white py-2 shadow-[0_18px_50px_rgba(15,23,42,.16)] ring-1 ring-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOchiq(false);
                      onOchish();
                    }}
                    className="flex h-9 w-full items-center px-4 text-left text-sm text-slate-700 transition hover:bg-slate-50 hover:text-[#2563EB]"
                  >
                    {t("ombordanChiqarishQatori.ochish")}
                  </button>
                  <button
                    type="button"
                    disabled={nakladnoy.yuklanmoqda}
                    onClick={() => {
                      setMenuOchiq(false);
                      nakladnoy.korish();
                    }}
                    className="flex h-9 w-full items-center gap-2 px-4 text-left text-sm text-slate-700 transition hover:bg-slate-50 hover:text-[#2563EB] disabled:opacity-50"
                  >
                    {nakladnoy.yuklanmoqda && <LoaderCircle size={13} className="animate-spin" />}
                    {t("ombordanChiqarishQatori.pdf")}
                  </button>
                </div>
              </>
            )}
          </div>
          <span className="inline-flex h-6 items-center gap-1 rounded-full bg-emerald-50 px-2.5 text-[11px] font-bold text-emerald-600">
            <CheckCircle2 size={12} />
            {t("ombordanChiqarishQatori.chiqarilgan")}
          </span>
        </div>
      </div>
    </div>
  );
}
