import { useEffect, useMemo, type ReactNode } from "react";
import { Boxes, CalendarDays, ChevronRight, FileText, LoaderCircle, PackageCheck, PackageSearch, RefreshCw, TriangleAlert, Warehouse, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import AppModal from "@/Components/common/AppModal";
import { useHujjatHarakatlari } from "@/hooks/useHujjatHarakatlari";
import { harakatJamilari, harakatQatorlari, hujjatQatorlariNomlari, ombordanChiqarishSanasi } from "@/lib/hujjatHarakatlari";
import { hujjatVaqtiMatni, kiritilganVaqtMatni } from "@/lib/hujjatSanasi";
import type { Sotuv } from "@/types/savdo";
import { mijozNomi, sotuvHolati, sotuvRaqami } from "./savdoYordamchilari";

const sonMatni = (son: number) => son.toLocaleString("uz-UZ", { maximumFractionDigits: 3 });
const miqdorMatni = (son: number, birlik: string) => `${sonMatni(son)}${birlik ? ` ${birlik}` : ""}`;

type Ohang = "yashil" | "kok" | "binafsha" | "kulrang";

const OHANGLAR: Record<Ohang, { karta: string; ikona: string }> = {
  yashil: { karta: "border-emerald-200 bg-emerald-50/60", ikona: "bg-emerald-100 text-emerald-600" },
  kok: { karta: "border-sky-200 bg-sky-50/60", ikona: "bg-sky-100 text-sky-600" },
  binafsha: { karta: "border-violet-200 bg-violet-50/60", ikona: "bg-violet-100 text-violet-600" },
  kulrang: { karta: "border-slate-200 bg-slate-50", ikona: "bg-slate-100 text-slate-500" },
};

function KorsatkichKarta({ ikona, nom, qiymat, izoh, ohang }: { ikona: ReactNode; nom: string; qiymat: string; izoh?: string; ohang: Ohang }) {
  const stil = OHANGLAR[ohang];
  return (
    <div className={`flex items-start gap-3 rounded-2xl border px-3.5 py-3 sm:px-4 sm:py-3.5 ${stil.karta}`}>
      <span className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:flex ${stil.ikona}`}>{ikona}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{nom}</p>
        <p className="mt-0.5 break-words text-base font-black leading-6 text-slate-900">{qiymat}</p>
        {izoh && <p className="mt-0.5 text-[11px] font-semibold leading-4 text-amber-600">{izoh}</p>}
      </div>
    </div>
  );
}

// Sotuv kartasidagi havola: "Chiqarilgan mahsulotlarni ko'rish" + qisqa xulosa (nechta mahsulot, jami miqdor). Bosilsa to'liq oyna ochiladi.
export function OmbordanChiqqanlarHavolasi({ sotuv, onOchish }: { sotuv: Sotuv; onOchish: () => void }) {
  const { t } = useTranslation("savdo_tafsilot");
  const holat = sotuvHolati(sotuv);
  const { harakatlar, yuklanmoqda } = useHujjatHarakatlari(sotuv.id, holat !== "DRAFT", holat);
  const qatorlar = useMemo(() => harakatQatorlari(harakatlar ?? []), [harakatlar]);
  const jami = harakatJamilari(qatorlar)
    .filter((yozuv) => yozuv.chiqdi > 0)
    .map((yozuv) => miqdorMatni(yozuv.chiqdi, yozuv.birlik))
    .join(" · ");
  const tovarSoni = new Set((harakatlar ?? []).map((harakat) => harakat.variantId ?? harakat.mahsulotId ?? harakat.kalit)).size;

  return (
    <button
      type="button"
      onClick={onOchish}
      className="group/havola flex w-full items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-left transition hover:border-emerald-400 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-emerald-500"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-100">
        <PackageCheck size={19} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-emerald-800">{t("ombordanChiqqan.havola")}</span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-700/80">
          {harakatlar === null && yuklanmoqda ? (
            <LoaderCircle size={12} className="animate-spin" />
          ) : tovarSoni > 0 ? (
            <>
              {t("ombordanChiqqan.havolaXulosa", { soni: tovarSoni })}
              {jami && ` · ${jami}`}
            </>
          ) : (
            t("ombordanChiqqan.havolaOchish")
          )}
        </span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-emerald-500 transition group-hover/havola:translate-x-0.5" />
    </button>
  );
}

// Shu sotuv bilan ombordan chiqarilgan mahsulotlar: sana, ombor, har bir mahsulot qancha chiqqani.
// GET /reports/stock-movement?documentIds=<sotuv id>; harakat kelmasa ham sana sotuvning o'zidan olinadi.
export default function OmbordanChiqqanlarOynasi({ sotuv, onYopish }: { sotuv: Sotuv; onYopish: () => void }) {
  const { t } = useTranslation("savdo_tafsilot");
  const holat = sotuvHolati(sotuv);
  const { harakatlar, yuklanmoqda, xato, yangilash } = useHujjatHarakatlari(sotuv.id, holat !== "DRAFT", holat);

  useEffect(() => {
    const yopish = (event: KeyboardEvent) => {
      if (event.key === "Escape") onYopish();
    };
    window.addEventListener("keydown", yopish);
    return () => window.removeEventListener("keydown", yopish);
  }, [onYopish]);

  const nomlar = useMemo(() => hujjatQatorlariNomlari(sotuv.items), [sotuv.items]);
  const qatorlar = useMemo(
    () => harakatQatorlari(harakatlar ?? [], (variantId) => (variantId ? nomlar.get(variantId) : undefined)),
    [harakatlar, nomlar]
  );
  const jamilar = useMemo(() => harakatJamilari(qatorlar).filter((yozuv) => yozuv.chiqdi > 0), [qatorlar]);
  const tovarSoni = useMemo(() => new Set((harakatlar ?? []).map((harakat) => harakat.variantId ?? harakat.mahsulotId ?? harakat.kalit)).size, [harakatlar]);
  const qaytganBor = qatorlar.some((qator) => qator.qaytdi > 0);

  const { sana, kiritilgan } = ombordanChiqarishSanasi(harakatlar, sotuv);
  const sanaMatni = hujjatVaqtiMatni(sana, kiritilgan) || "—";
  const kiritilganMatni = kiritilganVaqtMatni(sana, kiritilgan);
  const omborNomlari = Array.from(new Set(qatorlar.map((qator) => qator.omborNomi).filter(Boolean)));
  const omborMatni = omborNomlari.join(", ") || sotuv.warehouse?.name || "—";
  const hujjatRaqami = harakatlar?.find((harakat) => harakat.hujjatRaqami)?.hujjatRaqami ?? sotuvRaqami(sotuv);
  const bekor = holat === "CANCELLED";

  return (
    <AppModal onClose={onYopish} actionRail={false} className="bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="ombordan-chiqqanlar-nomi"
        data-testid="ombordan-chiqqanlar-oynasi"
        className="flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_30px_100px_rgba(2,6,23,.38)]"
      >
        <header className="relative shrink-0 overflow-hidden border-b border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-sky-50 px-6 py-5 sm:px-8 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-[0_12px_28px_rgba(16,185,129,.32)]">
                <PackageCheck size={27} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-600">{t("ombordanChiqqan.oyna.eyebrow")}</p>
                <h2 id="ombordan-chiqqanlar-nomi" className="mt-1 break-words text-2xl font-black text-slate-900">
                  {t("ombordanChiqqan.oyna.sarlavha")}
                </h2>
                <p className="mt-1 break-words text-sm font-semibold text-slate-500">
                  {sotuvRaqami(sotuv)} · {mijozNomi(sotuv)}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`hidden rounded-full px-3.5 py-1.5 text-xs font-bold ring-1 sm:inline-flex ${
                  bekor ? "bg-red-50 text-red-600 ring-red-100" : "bg-emerald-50 text-emerald-700 ring-emerald-100"
                }`}
              >
                {bekor ? t("ombordanChiqqan.oyna.holat.bekor") : t("ombordanChiqqan.oyna.holat.chiqarilgan")}
              </span>
              <button
                type="button"
                onClick={onYopish}
                aria-label={t("ombordanChiqqan.oyna.yopish")}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 px-4 pt-5 sm:px-8 lg:grid-cols-4">
            <KorsatkichKarta ikona={<CalendarDays size={19} />} nom={t("ombordanChiqqan.oyna.sana")} qiymat={sanaMatni} izoh={kiritilganMatni ? t("ombordanChiqqan.oyna.kiritilgan", { vaqt: kiritilganMatni }) : undefined} ohang="yashil" />
            <KorsatkichKarta ikona={<Warehouse size={19} />} nom={t("ombordanChiqqan.oyna.ombor")} qiymat={omborMatni} ohang="kok" />
            <KorsatkichKarta ikona={<Boxes size={19} />} nom={t("ombordanChiqqan.oyna.mahsulotlar")} qiymat={harakatlar === null ? "—" : t("ombordanChiqqan.oyna.mahsulotSoni", { soni: tovarSoni })} ohang="binafsha" />
            <KorsatkichKarta ikona={<PackageCheck size={19} />} nom={t("ombordanChiqqan.jamiChiqdi")} qiymat={jamilar.length ? jamilar.map((yozuv) => miqdorMatni(yozuv.chiqdi, yozuv.birlik)).join(" · ") : "—"} ohang="kulrang" />
          </div>

          <div className="px-4 pb-6 pt-5 sm:px-8">
            {harakatlar === null && yuklanmoqda ? (
              <div role="status" className="flex min-h-52 items-center justify-center gap-3 text-sm font-semibold text-slate-500">
                <LoaderCircle size={22} className="animate-spin text-emerald-600" />
                {t("ombordanChiqqan.yuklanmoqda")}
              </div>
            ) : xato && harakatlar === null ? (
              <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                <TriangleAlert size={20} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">{t("ombordanChiqqan.xato")}</p>
                  <button type="button" onClick={() => void yangilash()} className="mt-2 font-bold underline underline-offset-4">
                    {t("ombordanChiqqan.qaytaUrinish")}
                  </button>
                </div>
              </div>
            ) : qatorlar.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center">
                <PackageSearch size={38} className="mx-auto text-slate-300" />
                <p className="mt-3 font-bold text-slate-600">{t("ombordanChiqqan.bosh")}</p>
                <p className="mx-auto mt-1 max-w-md text-xs font-medium leading-5 text-slate-400">{t("ombordanChiqqan.oyna.boshIzoh")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-400/60">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-slate-300 bg-slate-50 text-[11px] font-black uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="w-12 px-4 py-3">#</th>
                      <th className="px-3 py-3">{t("ombordanChiqqan.jadval.mahsulot")}</th>
                      <th className="px-3 py-3">{t("ombordanChiqqan.jadval.ombor")}</th>
                      <th className="px-3 py-3 text-right">{t("ombordanChiqqan.jadval.chiqdi")}</th>
                      {qaytganBor && <th className="px-3 py-3 text-right">{t("ombordanChiqqan.jadval.qaytdi")}</th>}
                      <th className="px-4 py-3 text-right">{t("ombordanChiqqan.oyna.sanaVaVaqt")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 text-slate-700">
                    {qatorlar.map((qator, indeks) => {
                      const chiqdiMatni = miqdorMatni(qator.chiqdi, qator.birlik);
                      // "Sotuvda: 2 korobka" faqat sotuv qatori boshqa birlikda yozilgan bo'lsa (birlik nomi bor); asosiy birlikda bu takror bo'lardi.
                      const sotuvdaKorsatilsin = /\p{L}/u.test(qator.sotuvdagi) && qator.sotuvdagi !== chiqdiMatni;
                      return (
                        <tr key={qator.kalit} className="transition hover:bg-slate-50/70">
                          <td className="px-4 py-3.5 text-slate-400">{indeks + 1}</td>
                          <td className="px-3 py-3.5">
                            <p className="font-semibold text-slate-900">{qator.mahsulotNomi || t("ombordanChiqqan.nomiYoq")}</p>
                            {qator.variantNomi && <p className="mt-0.5 text-xs text-slate-400">{qator.variantNomi}</p>}
                            {sotuvdaKorsatilsin && (
                              <p className="mt-0.5 text-[11px] font-semibold text-slate-400">{t("ombordanChiqqan.oyna.sotuvda", { miqdor: qator.sotuvdagi })}</p>
                            )}
                          </td>
                          <td className="px-3 py-3.5 text-slate-500">{qator.omborNomi || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-3.5 text-right">
                            <span className="inline-flex rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-black tabular-nums text-emerald-700 ring-1 ring-emerald-100">{chiqdiMatni}</span>
                          </td>
                          {qaytganBor && (
                            <td className="whitespace-nowrap px-3 py-3.5 text-right text-xs font-bold tabular-nums text-amber-700">
                              {qator.qaytdi > 0 ? miqdorMatni(qator.qaytdi, qator.birlik) : "—"}
                            </td>
                          )}
                          <td className="whitespace-nowrap px-4 py-3.5 text-right text-xs font-semibold tabular-nums text-slate-500">
                            {hujjatVaqtiMatni(qator.sana, kiritilgan) || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/70 px-6 py-4 sm:px-8">
          <p className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <FileText size={15} className="text-slate-400" />
            {t("ombordanChiqqan.oyna.hujjat")}: <span className="text-slate-700">{hujjatRaqami}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void yangilash()}
              disabled={yuklanmoqda}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
            >
              <RefreshCw size={15} className={yuklanmoqda ? "animate-spin" : ""} />
              {t("ombordanChiqqan.yangilash")}
            </button>
            <button
              type="button"
              onClick={onYopish}
              className="inline-flex h-10 items-center rounded-xl bg-emerald-600 px-5 text-sm font-black text-white shadow-[0_10px_24px_rgba(16,185,129,.24)] transition hover:bg-emerald-700"
            >
              {t("ombordanChiqqan.oyna.yopish")}
            </button>
          </div>
        </footer>
      </section>
    </AppModal>
  );
}
