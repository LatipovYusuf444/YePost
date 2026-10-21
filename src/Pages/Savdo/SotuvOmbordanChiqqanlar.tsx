import { useMemo } from "react";
import { LoaderCircle, PackageCheck, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useHujjatHarakatlari } from "@/hooks/useHujjatHarakatlari";
import { harakatJamilari, harakatQatorlari, hujjatQatorlariNomlari } from "@/lib/hujjatHarakatlari";
import { vaqtMatni } from "@/lib/hujjatSanasi";
import type { Sotuv } from "@/types/savdo";
import { sotuvHolati } from "./savdoYordamchilari";

const sonMatni = (son: number) => son.toLocaleString("uz-UZ", { maximumFractionDigits: 3 });
const miqdorMatni = (son: number, birlik: string) => `${sonMatni(son)}${birlik ? ` ${birlik}` : ""}`;

// Ombordan chiqarish panelida: shu sotuv bilan ombordan qaysi mahsulot qancha chiqqani. Ma'lumot ombor harakati hisobotidan olinadi
// (GET /reports/stock-movement?documentIds=<sotuv id>, qatorda refId = sotuv id). Qoralama sotuvda ombor harakati yo'q.
// `className` berilsa (masalan, o'z kartasi ichida) standart yuqori chiziq va bo'shliq o'rniga ishlatiladi.
export default function SotuvOmbordanChiqqanlar({ sotuv, className }: { sotuv: Sotuv; className?: string }) {
  const { t } = useTranslation("savdo_tafsilot");
  const holat = sotuvHolati(sotuv);
  const korsatiladi = holat !== "DRAFT";
  const { harakatlar, yuklanmoqda, xato, yangilash } = useHujjatHarakatlari(sotuv.id, korsatiladi, holat);

  // Harakatda tovar nomi kelmasa, sotuvning o'z qatorlaridan olinadi.
  const nomlar = useMemo(() => hujjatQatorlariNomlari(sotuv.items), [sotuv.items]);
  const qatorlar = useMemo(
    () => harakatQatorlari(harakatlar ?? [], (variantId) => (variantId ? nomlar.get(variantId) : undefined)),
    [harakatlar, nomlar]
  );
  const jamilar = useMemo(() => harakatJamilari(qatorlar), [qatorlar]);
  const tovarSoni = useMemo(() => new Set((harakatlar ?? []).map((harakat) => harakat.variantId ?? harakat.mahsulotId ?? harakat.kalit)).size, [harakatlar]);
  const qaytganBor = qatorlar.some((qator) => qator.qaytdi > 0);

  if (!korsatiladi) return null;

  return (
    <div className={className ?? "mt-5 border-t border-slate-200 pt-4"} data-testid="ombordan-chiqqanlar">
      <div className="flex items-center justify-between gap-3">
        <h4 className="flex items-center gap-2 text-sm font-black text-slate-800">
          <PackageCheck size={17} className="text-emerald-600" />
          {t("ombordanChiqqan.sarlavha")}
        </h4>
        <button
          type="button"
          onClick={() => void yangilash()}
          disabled={yuklanmoqda}
          aria-label={t("ombordanChiqqan.yangilash")}
          title={t("ombordanChiqqan.yangilash")}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
        >
          <RefreshCw size={15} className={yuklanmoqda ? "animate-spin" : ""} />
        </button>
      </div>
      <p className="mt-1 text-xs font-medium leading-5 text-slate-400">{t("ombordanChiqqan.tavsif")}</p>

      {harakatlar === null && yuklanmoqda ? (
        <div role="status" className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-400">
          <LoaderCircle size={16} className="animate-spin" />
          {t("ombordanChiqqan.yuklanmoqda")}
        </div>
      ) : xato && harakatlar === null ? (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-xs font-bold text-red-600">
          {t("ombordanChiqqan.xato")}{" "}
          <button type="button" onClick={() => void yangilash()} className="underline underline-offset-2">
            {t("ombordanChiqqan.qaytaUrinish")}
          </button>
        </p>
      ) : qatorlar.length === 0 ? (
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-3 text-xs font-semibold leading-5 text-slate-500">{t("ombordanChiqqan.bosh")}</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-400/60 bg-white">
          <table className="w-full min-w-[460px] text-left text-sm">
            <thead className="border-b border-slate-300 bg-slate-50 text-[11px] font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2.5">{t("ombordanChiqqan.jadval.mahsulot")}</th>
                <th className="px-3 py-2.5">{t("ombordanChiqqan.jadval.ombor")}</th>
                <th className="px-3 py-2.5 text-right">{t("ombordanChiqqan.jadval.chiqdi")}</th>
                {qaytganBor && <th className="px-3 py-2.5 text-right">{t("ombordanChiqqan.jadval.qaytdi")}</th>}
                <th className="px-3 py-2.5 text-right">{t("ombordanChiqqan.jadval.vaqt")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 text-slate-700">
              {qatorlar.map((qator) => (
                <tr key={qator.kalit}>
                  <td className="px-3 py-2.5">
                    <p className="font-semibold text-slate-800">{qator.mahsulotNomi || t("ombordanChiqqan.nomiYoq")}</p>
                    {qator.variantNomi && <p className="mt-0.5 text-xs text-slate-400">{qator.variantNomi}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-slate-500">{qator.omborNomi || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    <span className="inline-flex rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold tabular-nums text-emerald-700 ring-1 ring-emerald-100">
                      {miqdorMatni(qator.chiqdi, qator.birlik)}
                    </span>
                  </td>
                  {qaytganBor && (
                    <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold tabular-nums text-amber-700">
                      {qator.qaytdi > 0 ? miqdorMatni(qator.qaytdi, qator.birlik) : "—"}
                    </td>
                  )}
                  <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold tabular-nums text-slate-400">{vaqtMatni(qator.sana) || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-slate-300 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-600">
            <span>{t("ombordanChiqqan.tovarSoni", { soni: tovarSoni })}</span>
            <span className="text-emerald-700">
              {t("ombordanChiqqan.jamiChiqdi")}: {jamilar.filter((jami) => jami.chiqdi > 0).map((jami) => miqdorMatni(jami.chiqdi, jami.birlik)).join(" · ") || "—"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
