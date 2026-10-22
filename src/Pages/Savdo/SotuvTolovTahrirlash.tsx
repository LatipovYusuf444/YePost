import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CreditCard, LoaderCircle, PenLine, RefreshCw, TriangleAlert } from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { sotuvTafsilotiniOlish } from "@/api/savdoApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { useHujjatniBekorQilishMumkinmi } from "@/hooks/useHujjatniOchirishMumkinmi";
import { kunMatni } from "@/lib/hujjatSanasi";
import { valyutadaMatn } from "@/lib/tolovOrtiqchasi";
import { tahrirlanadiganTolovmi, tolovniTopish, type TolovIshorasi } from "@/lib/tolovTahriri";
import type { Sotuv } from "@/types/savdo";
import TolovTahriri from "./TolovTahriri";
import { sotuvHolati, sotuvRaqami, tolovTuriMatni, tolovValyutasi } from "./savdoYordamchilari";

type Props = {
  sotuvId: string;
  /** Kassa yoki to'lovlar ro'yxatidagi yozuv haqida ma'lum narsa: sotuvdagi qaysi to'lovga tegishli ekanini topish uchun. */
  ishora?: TolovIshorasi;
  onYopish: () => void;
  /** To'lov o'zgargan (yoki zanjir xato bilan to'xtagan) va oyna yopilayotganda: ro'yxat/ko'rinish yangilanadi. */
  onTugadi?: () => void;
};

// Sotuv oynasini ochmasdan, faqat sotuv id'si bilan to'lovni tahrirlash (kassa, xaridor to'lovlari, to'lovlar ro'yxati): sotuv yuklanadi, yozuvga mos to'lov
// topiladi (aniqlab bo'lmasa to'lovlar ro'yxatidan tanlanadi) va `TolovTahriri` ochiladi. Saqlangach sotuv, ro'yxatlar va kassa yangilanadi.
export default function SotuvTolovTahrirlash({ sotuvId, ishora, onYopish, onTugadi }: Props) {
  const { t } = useTranslation("savdo_tafsilot");
  const bekorMumkin = useHujjatniBekorQilishMumkinmi("savdo");
  const [sotuv, setSotuv] = useState<Sotuv | null>(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [xato, setXato] = useState("");
  const [tanlangan, setTanlangan] = useState<number | null>(null);
  // Tanlash ro'yxatidan ochilgan bo'lsa "Orqaga" ro'yxatga qaytaradi; to'g'ridan-to'g'ri ochilgan bo'lsa oynani yopadi.
  const [royxatdanOchilgan, setRoyxatdanOchilgan] = useState(false);
  const [band, setBand] = useState(false);
  const [urinish, setUrinish] = useState(0);

  useEffect(() => {
    let faol = true;
    setYuklanmoqda(true);
    setXato("");
    sotuvTafsilotiniOlish(sotuvId)
      .then((yuklangan) => {
        if (!faol) return;
        setSotuv(yuklangan);
        const indeks = tolovniTopish(yuklangan.payments ?? [], ishora ?? {});
        setTanlangan(indeks === -1 ? null : indeks);
        setRoyxatdanOchilgan(indeks === -1);
      })
      .catch((sabab) => {
        if (faol) setXato(getApiErrorMessage(sabab) || t("tolovTahriri.errors.yuklanmadi"));
      })
      .finally(() => {
        if (faol) setYuklanmoqda(false);
      });
    return () => {
      faol = false;
    };
    // `ishora` ota komponentda har chizishda yangi obyekt bo'lishi mumkin: sotuv faqat id o'zgarganda (yoki qayta urinishda) yuklanadi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sotuvId, urinish]);

  function yakunlash() {
    onTugadi?.();
    onYopish();
  }

  const tolov = sotuv && tanlangan !== null ? sotuv.payments?.[tanlangan] : undefined;
  const tahrirlanadiganlar = (sotuv?.payments ?? [])
    .map((element, indeks) => ({ element, indeks }))
    .filter(({ element }) => tahrirlanadiganTolovmi(element));
  const xabar = !sotuv
    ? ""
    : !bekorMumkin
      ? t("tolovTahriri.ruxsatYoq")
      : sotuvHolati(sotuv) !== "CONFIRMED"
        ? t("tolovTahriri.errors.tasdiqlanmagan")
        : tahrirlanadiganlar.length === 0
          ? t("tolovTahriri.errors.tolovYoq")
          : "";

  return (
    <AppModal
      onClose={() => {
        if (!band) onYopish();
      }}
    >
      <div className={`flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-[32px] bg-white shadow-[0_30px_90px_rgba(15,23,42,.24)] ${tolov ? "max-w-4xl" : "max-w-xl"}`}>
        <div className="flex shrink-0 items-center gap-4 border-b border-slate-100 bg-linear-to-r from-orange-50 to-white px-7 py-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#2563EB] shadow-sm ring-1 ring-orange-100">
            <PenLine size={22} />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2563EB]">{t("tolovTahriri.sarlavha")}</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">{sotuv ? `№${sotuvRaqami(sotuv)}` : "…"}</h2>
          </div>
        </div>

        {yuklanmoqda ? (
          <div role="status" className="flex items-center justify-center gap-3 px-7 py-14 text-sm font-bold text-slate-500">
            <LoaderCircle size={20} className="animate-spin text-[#2563EB]" aria-hidden />
            {t("tolovTahriri.yuklanmoqda")}
          </div>
        ) : xato || !sotuv ? (
          <div className="space-y-4 px-7 py-6">
            <div role="alert" className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
              <TriangleAlert size={18} aria-hidden className="mt-0.5 shrink-0" />
              {xato || t("tolovTahriri.errors.yuklanmadi")}
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={onYopish} className="h-12 rounded-2xl bg-gray-100 px-5 text-sm font-bold text-gray-600 transition hover:bg-gray-200">
                {t("tolovTahriri.yopish")}
              </button>
              <button
                type="button"
                onClick={() => setUrinish((joriy) => joriy + 1)}
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#2563EB] px-6 text-sm font-black text-white shadow-[0_10px_24px_rgba(37,99,235,.24)] transition hover:bg-[#1D4ED8]"
              >
                <RefreshCw size={16} aria-hidden />
                {t("tolovTahriri.qaytaUrinish")}
              </button>
            </div>
          </div>
        ) : xabar ? (
          <div className="space-y-4 px-7 py-6">
            <div role="alert" className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-800">
              <TriangleAlert size={18} aria-hidden className="mt-0.5 shrink-0" />
              {xabar}
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={onYopish} className="h-12 rounded-2xl bg-gray-100 px-5 text-sm font-bold text-gray-600 transition hover:bg-gray-200">
                {t("tolovTahriri.yopish")}
              </button>
            </div>
          </div>
        ) : tolov ? (
          <TolovTahriri
            sotuv={sotuv}
            tolov={tolov}
            raqam={`${sotuvRaqami(sotuv)}/${(tanlangan ?? 0) + 1}`}
            onBand={setBand}
            onOrqaga={() => (royxatdanOchilgan ? setTanlangan(null) : onYopish())}
            onYopish={yakunlash}
          />
        ) : (
          <div className="space-y-4 px-7 py-6" data-testid="tolov-tanlash">
            <div>
              <h3 className="text-lg font-black text-slate-900">{t("tolovTahriri.tanlash.sarlavha")}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">{t("tolovTahriri.tanlash.izoh")}</p>
            </div>
            <ul className="space-y-2.5">
              {tahrirlanadiganlar.map(({ element, indeks }) => (
                <li key={element.id ?? indeks}>
                  <button
                    type="button"
                    onClick={() => {
                      setTanlangan(indeks);
                      setRoyxatdanOchilgan(true);
                    }}
                    className="flex w-full items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3.5 text-left ring-1 ring-slate-100 transition hover:bg-blue-50 hover:ring-blue-200"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <CreditCard size={18} aria-hidden className="shrink-0 text-[#2563EB]" />
                      <span className="min-w-0">
                        <span className="block text-sm font-black text-slate-800">{tolovTuriMatni[element.paymentType] ?? element.paymentType}</span>
                        <span className="block truncate text-xs font-semibold text-slate-400">
                          {[kunMatni(element.date ?? element.paidAt ?? element.createdAt), element.note].filter(Boolean).join(" · ") || "—"}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-black tabular-nums text-slate-900">{valyutadaMatn(Number(element.amount ?? 0), tolovValyutasi(element, sotuv), t("tolovModal.somBelgisi"))}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex justify-end">
              <button type="button" onClick={onYopish} className="h-12 rounded-2xl bg-gray-100 px-5 text-sm font-bold text-gray-600 transition hover:bg-gray-200">
                {t("tolovTahriri.yopish")}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppModal>
  );
}
