import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Check,
  CheckCircle2,
  FileText,
  LoaderCircle,
  Minus,
  PackageCheck,
  PackageX,
  Plus,
  Search,
  ShieldQuestion,
  Undo2,
  Undo,
  MessageSquareText,
  type LucideIcon,
} from "lucide-react";
import { useSavdoStore } from "@/store/savdoStore";
import type {
  Qaytarish,
  QaytarishToloviniQaytarishUsuli as RefundMethod,
  QaytarishYaratishMalumoti,
  Sotuv,
} from "@/types/savdo";
import {
  mijozNomi,
  pulniFormatlash,
  sananiFormatlash,
  sotuvMahsulotiModifikatsiyaId,
  sotuvMahsulotiNarxi,
  sotuvQarzdorlikSummasi,
  sotuvRaqami,
  sotuvSummasi,
  sotuvTolanganSummasi,
} from "../savdoYordamchilari";
import QaytarishStepper from "./QaytarishStepper";
import QaytarishHisobKitobi from "./QaytarishHisobKitobi";
import { backendHisobKitobi, taxminiyHisobKitob, type HisobKitob } from "./mockReturnData";
import {
  SABAB_IZOH_MATNI,
  UI_SABABLAR,
  backendSabab,
  qaytarishMumkinmi,
  qaytarishRaqami,
  qolganMiqdor,
  sotuvSanasi,
  type UiSabab,
} from "./qaytarishYordamchilari";

type Props = {
  sotuvlar: Sotuv[];
  qaytarishlar: Qaytarish[];
  // Berilsa, sotuv tanlash bosqichi o'tkazib yuboriladi (masalan, sotuvlar jadvalidagi "Qaytarish" tugmasi).
  boshlangichSotuvId?: string;
  onSotuvTafsilotiniOlish: (sotuvId: string) => Promise<Sotuv | null>;
  onYaratish: (malumot: QaytarishYaratishMalumoti) => Promise<Qaytarish | null>;
  onTasdiqlash: (qaytarishId: string) => Promise<boolean>;
  onTafsilotiniOlish: (qaytarishId: string) => Promise<Qaytarish | null>;
  onHujjatniKorish: (qaytarishId: string) => void;
  onYopish: () => void;
  onMuvaffaqiyat?: () => void;
};

const QADAM_SOTUV = 0;
const QADAM_MAHSULOT = 1;
const QADAM_SABAB = 2;
const QADAM_HISOB = 3;
const QADAM_TASDIQ = 4;
const QADAM_YAKUN = 5;

const SABAB_IKONKALARI: Record<UiSabab, LucideIcon> = {
  DEFECT: PackageX,
  CUSTOMER_CHANGED_MIND: Undo,
  WRONG: ArrowLeftRight,
  NOT_SUITABLE: ShieldQuestion,
  OTHER: MessageSquareText,
};

const USULLAR: RefundMethod[] = ["CASH", "CARD", "BALANCE", "NONE"];
const MAKS_SOTUV_KARTALARI = 30;

type Natija = {
  raqam: string;
  qaytarishId: string;
  hisob: HisobKitob;
  dona: number;
  mijoz: string;
  sotuv: string;
};

function songa(matn: string | undefined) {
  const tozalangan = (matn ?? "").trim().replace(",", ".");
  return tozalangan === "" ? 0 : Number(tozalangan);
}

export default function QaytarishWizard({
  sotuvlar,
  qaytarishlar,
  boshlangichSotuvId = "",
  onSotuvTafsilotiniOlish,
  onYaratish,
  onTasdiqlash,
  onTafsilotiniOlish,
  onHujjatniKorish,
  onYopish,
  onMuvaffaqiyat,
}: Props) {
  const { t } = useTranslation("savdo_qaytarish");
  const [qadam, setQadam] = useState(QADAM_SOTUV);
  const [tanlanganId, setTanlanganId] = useState("");
  const [sotuv, setSotuv] = useState<Sotuv | null>(null);
  const [sotuvYuklanmoqda, setSotuvYuklanmoqda] = useState(false);
  const [qidiruv, setQidiruv] = useState("");
  const [miqdorlar, setMiqdorlar] = useState<Record<string, string>>({});
  const [sabab, setSabab] = useState<UiSabab | "">("");
  const [izoh, setIzoh] = useState("");
  const [usul, setUsul] = useState<RefundMethod>("CASH");
  const [yuborilmoqda, setYuborilmoqda] = useState(false);
  const [xatolik, setXatolik] = useState("");
  const [yaratilganId, setYaratilganId] = useState<string | null>(null);
  const [natija, setNatija] = useState<Natija | null>(null);
  const yuqoriRef = useRef<HTMLDivElement | null>(null);
  const boshlandi = useRef(false);

  const qadamlar = useMemo(
    () => (["sale", "items", "reason", "calc", "confirm", "done"] as const).map((kalit) => t(`wizard.steps.${kalit}`)),
    [t]
  );

  // ── 1-bosqich: sotuvlar ro'yxati ─────────────────────────────────────────────────────────
  const sotuvKartalari = useMemo(() => {
    const soz = qidiruv.trim().toLowerCase();
    return sotuvlar
      .filter(qaytarishMumkinmi)
      .map((item) => {
        const qatorlar = qolganMiqdor(item, qaytarishlar);
        return {
          sotuv: item,
          qaytarilishiMumkin: qatorlar.some((qator) => qator.qolgan > 0),
          qismanQaytarilgan: qatorlar.some((qator) => qator.oldin > 0),
        };
      })
      .filter((karta) => karta.qaytarilishiMumkin)
      .filter((karta) => !soz || `${sotuvRaqami(karta.sotuv)} ${mijozNomi(karta.sotuv)}`.toLowerCase().includes(soz));
  }, [qaytarishlar, qidiruv, sotuvlar]);

  async function sotuvniTanlash(id: string) {
    setTanlanganId(id);
    setXatolik("");
    setSotuvYuklanmoqda(true);
    const royxatdagi = sotuvlar.find((item) => item.id === id) ?? null;
    const toliq = (await onSotuvTafsilotiniOlish(id)) ?? royxatdagi;
    setSotuvYuklanmoqda(false);
    setSotuv(toliq);
    if (!toliq) return;
    // Standart: qolgan barcha miqdor qaytariladi (foydalanuvchi o'zgartirishi mumkin).
    setMiqdorlar(Object.fromEntries(qolganMiqdor(toliq, qaytarishlar).map((qator) => [qator.id, String(qator.qolgan)])));
  }

  // Sotuvlar jadvalidan kelganda (boshlangichSotuvId) tanlov bosqichi o'tkazib yuboriladi.
  useEffect(() => {
    if (!boshlangichSotuvId || boshlandi.current) return;
    if (!sotuvlar.some((item) => item.id === boshlangichSotuvId)) return;
    boshlandi.current = true;
    void sotuvniTanlash(boshlangichSotuvId).then(() => setQadam(QADAM_MAHSULOT));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boshlangichSotuvId, sotuvlar]);

  useEffect(() => {
    yuqoriRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [qadam]);

  // ── 2-bosqich: mahsulot qatorlari ───────────────────────────────────────────────────────
  const qatorlar = useMemo(() => {
    if (!sotuv) return [];
    return qolganMiqdor(sotuv, qaytarishlar).map(({ item, id, sotilgan, oldin, qolgan }) => {
      const mahsulot = item.modification?.product?.name;
      const variantNomi = item.modification?.name;
      const nom = mahsulot || variantNomi || sotuvMahsulotiModifikatsiyaId(item) || t("wizard.items.fallback");
      const variant = mahsulot && variantNomi && mahsulot !== variantNomi ? variantNomi : "";
      const narx = sotuvMahsulotiNarxi(item);
      const matn = miqdorlar[id] ?? "0";
      const son = songa(matn);
      const xato = !Number.isFinite(son) ? "invalid" : son < 0 ? "negative" : son > qolgan + 1e-9 ? "exceeds" : "";
      return { item, id, nom, variant, sotilgan, oldin, qolgan, narx, matn, son: xato ? 0 : son, xato };
    });
  }, [miqdorlar, qaytarishlar, sotuv, t]);

  const tanlanganQatorlar = qatorlar.filter((qator) => qator.son > 0);
  const tovarQiymati = tanlanganQatorlar.reduce((jami, qator) => jami + qator.son * qator.narx, 0);
  const dona = tanlanganQatorlar.reduce((jami, qator) => jami + qator.son, 0);
  const xatoliQatorBor = qatorlar.some((qator) => qator.xato);
  const mavjudQarz = sotuv ? sotuvQarzdorlikSummasi(sotuv) : 0;
  // KO'RSATISH uchun taxminiy hisob; yakuniy qiymatlarni backend `confirm` da hisoblaydi.
  const taxminiy = taxminiyHisobKitob(tovarQiymati, mavjudQarz, usul);

  function miqdorniOzgartirish(id: string, qiymat: string) {
    setMiqdorlar((joriy) => ({ ...joriy, [id]: qiymat }));
  }

  function miqdorniSurish(id: string, qolgan: number, delta: number) {
    const yangi = Math.min(Math.max(songa(miqdorlar[id]) + delta, 0), qolgan);
    miqdorniOzgartirish(id, String(Math.round(yangi * 1000) / 1000));
  }

  // ── Navigatsiya ─────────────────────────────────────────────────────────────────────────
  const izohKerak = sabab === "OTHER" && izoh.trim().length < 3;
  const davomEtishMumkin =
    qadam === QADAM_SOTUV
      ? Boolean(sotuv) && !sotuvYuklanmoqda
      : qadam === QADAM_MAHSULOT
        ? tanlanganQatorlar.length > 0 && !xatoliQatorBor
        : qadam === QADAM_SABAB
          ? sabab !== "" && !izohKerak
          : true;

  function keyingisi() {
    setXatolik("");
    if (qadam === QADAM_MAHSULOT && tanlanganQatorlar.length === 0) {
      setXatolik("wizard.errors.noItems");
      return;
    }
    if (qadam === QADAM_SABAB && izohKerak) {
      setXatolik("wizard.errors.noteRequired");
      return;
    }
    setQadam((joriy) => Math.min(joriy + 1, QADAM_TASDIQ));
  }

  function oldingisi() {
    setXatolik("");
    setQadam((joriy) => Math.max(joriy - 1, QADAM_SOTUV));
  }

  function yangiQaytarish() {
    setQadam(QADAM_SOTUV);
    setTanlanganId("");
    setSotuv(null);
    setMiqdorlar({});
    setSabab("");
    setIzoh("");
    setUsul("CASH");
    setXatolik("");
    setYaratilganId(null);
    setNatija(null);
    setQidiruv("");
  }

  // ── Tasdiqlash: mavjud API oqimi o'zgarmagan (yaratish → tasdiqlash) ──────────────────────────
  async function tasdiqlash() {
    if (!sotuv || !sabab) return;
    setXatolik("");

    const warehouseId = sotuv.warehouseId ?? sotuv.warehouse?.id ?? "";
    if (!warehouseId) {
      setXatolik("wizard.errors.warehouseMissing");
      return;
    }

    setYuborilmoqda(true);
    try {
      // Tasdiqlash xato bersa hujjat qoralama bo'lib qoladi: qayta urinish yangisini yaratmaydi, mavjudini tasdiqlaydi.
      let id = yaratilganId;
      if (!id) {
        const yaratilgan = await onYaratish({
          saleId: sotuv.id,
          warehouseId,
          responsibleId: sotuv.responsibleId,
          reason: backendSabab(sabab),
          restock: true,
          refundMethod: usul,
          note: [`Sabab: ${SABAB_IZOH_MATNI[sabab]}`, izoh.trim()].filter(Boolean).join(" | "),
          items: tanlanganQatorlar.map((qator) => ({
            saleItemId: qator.id,
            modificationId: sotuvMahsulotiModifikatsiyaId(qator.item),
            quantity: qator.son,
            price: qator.narx,
          })),
        });
        if (!yaratilgan) return;
        id = yaratilgan.id;
        setYaratilganId(id);
      }

      const tasdiqlandi = await onTasdiqlash(id);
      if (!tasdiqlandi) {
        setXatolik("wizard.errors.confirmFailed");
        return;
      }

      // Yakuniy qiymatlar: backend qaytargan refundAmount / debtReduction (yagona manba) va yangilangan sotuv qarzi.
      const tafsilot = await onTafsilotiniOlish(id);
      const yangiSotuv = useSavdoStore.getState().sotuvlar.find((item) => item.id === sotuv.id);
      const hozirgiQarz = yangiSotuv ? sotuvQarzdorlikSummasi(yangiSotuv) : null;
      const hisob = (tafsilot ? backendHisobKitobi(tafsilot, tovarQiymati, hozirgiQarz) : null) ?? taxminiy;

      setNatija({
        raqam: tafsilot ? qaytarishRaqami(tafsilot) : id.slice(0, 8).toUpperCase(),
        qaytarishId: id,
        hisob,
        dona,
        mijoz: mijozNomi(sotuv),
        sotuv: sotuvRaqami(sotuv),
      });
      setQadam(QADAM_YAKUN);
      onMuvaffaqiyat?.();
    } finally {
      setYuborilmoqda(false);
    }
  }

  const tanlanganSabab = sabab ? t(`wizard.reasons.${sabab}`) : "";
  const qulf = Boolean(yaratilganId) && qadam !== QADAM_YAKUN;

  return (
    <div ref={yuqoriRef} className="space-y-6">
      <div className="rounded-[26px] border border-slate-200/80 bg-white px-4 py-5 shadow-sm sm:px-8 sm:py-6">
        <QaytarishStepper
          qadamlar={qadamlar}
          joriy={qadam}
          onTanlash={qadam === QADAM_YAKUN || qulf ? undefined : (indeks) => { setXatolik(""); setQadam(indeks); }}
        />
      </div>

      <div className="rounded-[26px] border border-slate-200/80 bg-white shadow-[0_8px_30px_-18px_rgba(15,23,42,.25)]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={qadam}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="p-5 sm:p-8"
          >
            {qadam === QADAM_SOTUV && (
              <section aria-labelledby="qadam-sotuv">
                <Sarlavha id="qadam-sotuv" nom={t("wizard.sale.heading")} izoh={t("wizard.sale.hint")} />
                <label className="relative mt-5 block">
                  <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
                  <input
                    value={qidiruv}
                    onChange={(event) => setQidiruv(event.target.value)}
                    placeholder={t("wizard.sale.search")}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/60 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-50"
                  />
                </label>

                {sotuvKartalari.length === 0 ? (
                  <p className="mt-5 rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm font-semibold text-slate-400">{t("wizard.sale.empty")}</p>
                ) : (
                  <ul className="mt-5 grid gap-3 lg:grid-cols-2">
                    {sotuvKartalari.slice(0, MAKS_SOTUV_KARTALARI).map(({ sotuv: item, qismanQaytarilgan }) => {
                      const tanlangan = tanlanganId === item.id;
                      const qarz = sotuvQarzdorlikSummasi(item);
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => void sotuvniTanlash(item.id)}
                            aria-pressed={tanlangan}
                            className={`group w-full cursor-pointer rounded-[22px] border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 ${
                              tanlangan ? "border-orange-400 bg-orange-50/50 ring-2 ring-orange-200" : "border-slate-200 bg-white hover:border-orange-200 hover:shadow-md"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="flex flex-wrap items-center gap-2 text-base font-black text-slate-900">
                                  {sotuvRaqami(item)}
                                  {qismanQaytarilgan && (
                                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700 ring-1 ring-amber-200">{t("wizard.sale.partial")}</span>
                                  )}
                                </p>
                                <p className="mt-0.5 truncate text-sm font-semibold text-slate-600">{mijozNomi(item)}</p>
                                <p className="text-xs font-medium tabular-nums text-slate-400">{sananiFormatlash(sotuvSanasi(item))}</p>
                              </div>
                              <span aria-hidden className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${tanlangan ? "border-orange-500 bg-orange-500 text-white" : "border-slate-200 text-transparent group-hover:border-orange-300"}`}>
                                <Check size={15} strokeWidth={3} />
                              </span>
                            </div>
                            <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-dashed border-slate-200 pt-3 text-xs">
                              <Raqam nom={t("wizard.sale.total")} qiymat={pulniFormatlash(sotuvSummasi(item))} />
                              <Raqam nom={t("wizard.sale.paid")} qiymat={pulniFormatlash(sotuvTolanganSummasi(item))} rang="text-emerald-700" />
                              <Raqam nom={t("wizard.sale.debt")} qiymat={pulniFormatlash(qarz)} rang={qarz > 0 ? "text-rose-600" : "text-slate-500"} />
                            </dl>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {sotuvKartalari.length > MAKS_SOTUV_KARTALARI && (
                  <p className="mt-3 text-center text-xs font-semibold text-slate-400">{t("wizard.sale.showingFirst", { count: MAKS_SOTUV_KARTALARI })}</p>
                )}
                {sotuvYuklanmoqda && (
                  <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-500" role="status">
                    <LoaderCircle size={16} className="animate-spin text-orange-500" aria-hidden /> {t("wizard.sale.loading")}
                  </p>
                )}
                {sotuv && !sotuvYuklanmoqda && <SotuvXulosasi sotuv={sotuv} />}
              </section>
            )}

            {qadam === QADAM_MAHSULOT && sotuv && (
              <section aria-labelledby="qadam-mahsulot">
                <Sarlavha id="qadam-mahsulot" nom={t("wizard.items.heading")} izoh={t("wizard.items.hint")} />
                <div className="mt-5 hidden grid-cols-[minmax(0,1.7fr)_repeat(3,minmax(0,.7fr))_minmax(210px,1.1fr)] gap-4 px-4 text-[11px] font-black uppercase tracking-wide text-slate-400 lg:grid">
                  <span>{t("wizard.items.product")}</span>
                  <span>{t("wizard.items.sold")}</span>
                  <span>{t("wizard.items.price")}</span>
                  <span>{t("wizard.items.lineTotal")}</span>
                  <span>{t("wizard.items.returnQty")}</span>
                </div>
                <ul className="mt-2 space-y-3 lg:mt-2">
                  {qatorlar.map((qator) => (
                    <li
                      key={qator.id}
                      className={`grid gap-4 rounded-[22px] border p-4 lg:grid-cols-[minmax(0,1.7fr)_repeat(3,minmax(0,.7fr))_minmax(210px,1.1fr)] lg:items-center ${
                        qator.qolgan === 0 ? "border-slate-100 bg-slate-50/60 opacity-70" : qator.xato ? "border-rose-300 bg-rose-50/40" : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="break-words text-[15px] font-black text-slate-900">{qator.nom}</p>
                        {qator.variant && <p className="mt-0.5 text-xs font-semibold text-slate-500">{qator.variant}</p>}
                        {qator.oldin > 0 && <p className="mt-1 text-[11px] font-bold text-amber-700">{t("wizard.items.alreadyReturned", { count: qator.oldin })}</p>}
                      </div>
                      <Maydon nom={t("wizard.items.sold")} qiymat={`${qator.sotilgan} ${t("wizard.unit")}`} />
                      <Maydon nom={t("wizard.items.price")} qiymat={pulniFormatlash(qator.narx)} />
                      <Maydon nom={t("wizard.items.lineTotal")} qiymat={pulniFormatlash(qator.sotilgan * qator.narx)} kuchli />
                      <div>
                        <p className="mb-1.5 text-[11px] font-black uppercase tracking-wide text-slate-400 lg:hidden">{t("wizard.items.returnQty")}</p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => miqdorniSurish(qator.id, qator.qolgan, -1)}
                            disabled={qator.qolgan === 0}
                            aria-label={t("wizard.items.decrease")}
                            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Minus size={16} />
                          </button>
                          <input
                            inputMode="decimal"
                            value={qator.matn}
                            onChange={(event) => miqdorniOzgartirish(qator.id, event.target.value)}
                            disabled={qator.qolgan === 0}
                            aria-label={`${qator.nom}: ${t("wizard.items.returnQty")}`}
                            aria-invalid={Boolean(qator.xato)}
                            className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white text-center text-base font-extrabold tabular-nums outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-50 aria-invalid:border-rose-400 aria-invalid:ring-4 aria-invalid:ring-rose-100 disabled:bg-slate-50"
                          />
                          <button
                            type="button"
                            onClick={() => miqdorniSurish(qator.id, qator.qolgan, 1)}
                            disabled={qator.qolgan === 0}
                            aria-label={t("wizard.items.increase")}
                            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-400">
                          <span>{t("wizard.items.max", { count: qator.qolgan })}</span>
                          {qator.qolgan > 0 && (
                            <button type="button" onClick={() => miqdorniOzgartirish(qator.id, String(qator.qolgan))} className="cursor-pointer font-black text-orange-600 hover:underline">
                              {t("wizard.items.all")}
                            </button>
                          )}
                        </div>
                        {qator.xato && (
                          <p role="alert" className="mt-1.5 flex items-start gap-1.5 text-xs font-bold text-rose-600">
                            <AlertCircle size={13} className="mt-0.5 shrink-0" aria-hidden /> {t(`wizard.items.errors.${qator.xato}`, { max: qator.qolgan })}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-orange-50/70 px-5 py-4 ring-1 ring-orange-100">
                  <span className="text-sm font-bold text-slate-600">{t("wizard.items.selectedTotal")}</span>
                  <span className="text-2xl font-extrabold tabular-nums text-slate-950">{pulniFormatlash(tovarQiymati)}</span>
                </div>
              </section>
            )}

            {qadam === QADAM_SABAB && (
              <section aria-labelledby="qadam-sabab">
                <Sarlavha id="qadam-sabab" nom={t("wizard.reason.heading")} izoh={t("wizard.reason.hint")} />
                <div role="radiogroup" aria-label={t("wizard.reason.heading")} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {UI_SABABLAR.map((kalit) => {
                    const Ikona = SABAB_IKONKALARI[kalit];
                    const faol = sabab === kalit;
                    return (
                      <button
                        key={kalit}
                        type="button"
                        role="radio"
                        aria-checked={faol}
                        onClick={() => { setSabab(kalit); setXatolik(""); }}
                        className={`flex cursor-pointer items-center gap-3 rounded-[20px] border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 ${
                          faol ? "border-orange-400 bg-orange-50/60 ring-2 ring-orange-200" : "border-slate-200 bg-white hover:border-orange-200 hover:shadow-sm"
                        }`}
                      >
                        <span aria-hidden className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${faol ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                          <Ikona size={20} />
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-extrabold text-slate-800">{t(`wizard.reasons.${kalit}`)}</span>
                        <span aria-hidden className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${faol ? "border-orange-500 bg-orange-500" : "border-slate-300"}`}>
                          {faol && <span className="h-2 w-2 rounded-full bg-white" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {sabab && (
                  <label className="mt-5 block">
                    <span className="mb-1.5 flex items-center gap-2 text-sm font-bold text-slate-700">
                      {t("wizard.reason.comment")}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${sabab === "OTHER" ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"}`}>
                        {sabab === "OTHER" ? t("wizard.reason.required") : t("wizard.reason.optional")}
                      </span>
                    </span>
                    <textarea
                      value={izoh}
                      onChange={(event) => setIzoh(event.target.value)}
                      rows={3}
                      placeholder={t("wizard.reason.placeholder")}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm font-semibold outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-50"
                    />
                  </label>
                )}
              </section>
            )}

            {qadam === QADAM_HISOB && sotuv && (
              <section aria-labelledby="qadam-hisob">
                <Sarlavha id="qadam-hisob" nom={t("wizard.calc.heading")} izoh={t("wizard.calc.hint")} />
                <div className="mt-5">
                  <p className="mb-2 text-sm font-bold text-slate-700">{t("wizard.calc.method")}</p>
                  <div role="radiogroup" aria-label={t("wizard.calc.method")} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {USULLAR.map((kalit) => {
                      const faol = usul === kalit;
                      return (
                        <button
                          key={kalit}
                          type="button"
                          role="radio"
                          aria-checked={faol}
                          onClick={() => setUsul(kalit)}
                          className={`h-12 cursor-pointer rounded-2xl border px-3 text-sm font-extrabold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 ${
                            faol ? "border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-200" : "border-slate-200 bg-white text-slate-600 hover:border-orange-200 hover:text-orange-600"
                          }`}
                        >
                          {t(`wizard.calc.methods.${kalit}`)}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-6">
                  <QaytarishHisobKitobi hisob={taxminiy} usul={usul} />
                </div>
                <p className="mt-3 text-xs font-medium text-slate-400">{t("wizard.calc.estimateNote")}</p>
              </section>
            )}

            {qadam === QADAM_TASDIQ && sotuv && (
              <section aria-labelledby="qadam-tasdiq">
                <Sarlavha id="qadam-tasdiq" nom={t("wizard.confirm.heading")} izoh={t("wizard.confirm.hint")} />
                <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Fakt nom={t("wizard.confirm.sale")} qiymat={sotuvRaqami(sotuv)} />
                  <Fakt nom={t("wizard.confirm.customer")} qiymat={mijozNomi(sotuv)} />
                  <Fakt nom={t("wizard.confirm.reason")} qiymat={tanlanganSabab} />
                  <Fakt nom={t("wizard.confirm.method")} qiymat={t(`wizard.calc.methods.${usul}`)} />
                  <div className="sm:col-span-2">
                    <Fakt
                      nom={t("wizard.confirm.products")}
                      qiymat={tanlanganQatorlar.map((qator) => `${qator.nom} × ${qator.son}`).join(" · ")}
                    />
                  </div>
                </dl>
                <div className="mt-4">
                  <QaytarishHisobKitobi hisob={taxminiy} usul={usul} ixcham />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50/70 px-5 py-3.5">
                  <span className="flex items-center gap-2 text-sm font-bold text-sky-800"><PackageCheck size={17} aria-hidden /> {t("wizard.confirm.stock")}</span>
                  <span className="text-lg font-extrabold tabular-nums text-sky-900">{dona} {t("wizard.unit")}</span>
                </div>
                <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-semibold leading-5 text-slate-500 ring-1 ring-slate-100">{t("wizard.confirm.warning")}</p>
              </section>
            )}

            {qadam === QADAM_YAKUN && natija && (
              <Yakun natija={natija} onKorish={() => onHujjatniKorish(natija.qaytarishId)} onYangi={yangiQaytarish} onYopish={onYopish} />
            )}

            {xatolik && qadam !== QADAM_YAKUN && (
              <p role="alert" className="mt-5 flex items-start gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600">
                <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden /> {t(xatolik)}
              </p>
            )}
          </motion.div>
        </AnimatePresence>

        {qadam !== QADAM_YAKUN && (
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-8">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={oldingisi}
                disabled={qadam === QADAM_SOTUV || yuborilmoqda || qulf}
                className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft size={16} aria-hidden /> {t("wizard.nav.back")}
              </button>
              <button
                type="button"
                onClick={onYopish}
                disabled={yuborilmoqda}
                className="h-12 cursor-pointer rounded-2xl px-4 text-sm font-bold text-slate-500 transition hover:text-slate-800 disabled:opacity-40"
              >
                {t("wizard.nav.cancel")}
              </button>
            </div>

            {qadam > QADAM_MAHSULOT && qadam < QADAM_TASDIQ && (
              <span className="hidden text-sm font-bold text-slate-500 xl:inline">
                {t("wizard.items.selectedTotal")}: <b className="font-black tabular-nums text-slate-900">{pulniFormatlash(tovarQiymati)}</b>
              </span>
            )}

            {qadam < QADAM_TASDIQ ? (
              <button
                type="button"
                onClick={keyingisi}
                disabled={!davomEtishMumkin}
                className="order-first inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 text-sm font-black text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5 hover:bg-orange-600 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none sm:order-none sm:ml-auto sm:w-auto"
              >
                {t("wizard.nav.next")} <ArrowRight size={16} aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void tasdiqlash()}
                disabled={yuborilmoqda}
                className="order-first inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 text-sm font-black text-white shadow-lg shadow-emerald-200 transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none sm:order-none sm:ml-auto sm:w-auto"
              >
                {yuborilmoqda ? <LoaderCircle size={17} className="animate-spin" aria-hidden /> : <CheckCircle2 size={17} aria-hidden />}
                {yuborilmoqda ? t("wizard.confirm.working") : t("wizard.confirm.buttonWithAmount", { summa: pulniFormatlash(tovarQiymati) })}
              </button>
            )}
          </footer>
        )}
      </div>
    </div>
  );
}

function Sarlavha({ id, nom, izoh }: { id: string; nom: string; izoh: string }) {
  return (
    <div>
      <h2 id={id} className="text-xl font-black tracking-tight text-slate-950">{nom}</h2>
      <p className="mt-1 text-sm font-medium text-slate-500">{izoh}</p>
    </div>
  );
}

function Raqam({ nom, qiymat, rang = "text-slate-800" }: { nom: string; qiymat: string; rang?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold text-slate-400">{nom}</dt>
      <dd className={`mt-0.5 truncate text-[13px] font-extrabold tabular-nums ${rang}`}>{qiymat}</dd>
    </div>
  );
}

function Maydon({ nom, qiymat, kuchli = false }: { nom: string; qiymat: string; kuchli?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400 lg:hidden">{nom}</p>
      <p className={`text-sm tabular-nums ${kuchli ? "font-extrabold text-slate-900" : "font-semibold text-slate-700"}`}>{qiymat}</p>
    </div>
  );
}

function Fakt({ nom, qiymat }: { nom: string; qiymat: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <dt className="text-[11px] font-black uppercase tracking-wide text-slate-400">{nom}</dt>
      <dd className="mt-1 break-words text-sm font-extrabold text-slate-900">{qiymat}</dd>
    </div>
  );
}

// 1-bosqichdagi tanlangan sotuv xulosasi (summary card).
function SotuvXulosasi({ sotuv }: { sotuv: Sotuv }) {
  const { t } = useTranslation("savdo_qaytarish");
  const qarz = sotuvQarzdorlikSummasi(sotuv);
  return (
    <div className="mt-6 overflow-hidden rounded-[24px] border border-orange-200 bg-linear-to-br from-orange-50 via-white to-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-orange-100 px-5 py-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-orange-600">{t("wizard.sale.selected")}</p>
          <p className="mt-0.5 text-xl font-black text-slate-950">{sotuvRaqami(sotuv)}</p>
        </div>
        <p className="text-base font-extrabold text-slate-700">{mijozNomi(sotuv)}</p>
      </div>
      <dl className="grid gap-px bg-orange-100/60 sm:grid-cols-3">
        {[
          { nom: t("wizard.sale.total"), qiymat: pulniFormatlash(sotuvSummasi(sotuv)), rang: "text-slate-900" },
          { nom: t("wizard.sale.paid"), qiymat: pulniFormatlash(sotuvTolanganSummasi(sotuv)), rang: "text-emerald-700" },
          { nom: t("wizard.sale.debt"), qiymat: pulniFormatlash(qarz), rang: qarz > 0 ? "text-rose-600" : "text-slate-500" },
        ].map((karta) => (
          <div key={karta.nom} className="bg-white px-5 py-4">
            <dt className="text-xs font-bold text-slate-400">{karta.nom}</dt>
            <dd className={`mt-1 text-xl font-extrabold tabular-nums ${karta.rang}`}>{karta.qiymat}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// 6-bosqich: muvaffaqiyatli yakun ekrani.
function Yakun({ natija, onKorish, onYangi, onYopish }: { natija: Natija; onKorish: () => void; onYangi: () => void; onYopish: () => void }) {
  const { t } = useTranslation("savdo_qaytarish");
  const { hisob } = natija;
  const satrlar = [
    { ikonka: PackageCheck, matn: t("wizard.done.stock", { count: natija.dona }) },
    { ikonka: Undo2, matn: t("wizard.done.debt", { summa: pulniFormatlash(hisob.qarzdanAyriladi) }) },
    {
      ikonka: CheckCircle2,
      matn: hisob.mijozgaQaytariladi > 0 ? t("wizard.done.refund", { summa: pulniFormatlash(hisob.mijozgaQaytariladi) }) : t("wizard.done.noRefund"),
    },
    { ikonka: FileText, matn: t("wizard.done.finished") },
  ];

  return (
    <section aria-live="polite" className="mx-auto max-w-2xl py-4 text-center">
      <motion.span
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 ring-8 ring-emerald-50"
      >
        <CheckCircle2 size={42} strokeWidth={2.2} />
      </motion.span>
      <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950">{t("wizard.done.title")}</h2>
      <p className="mt-2 inline-flex rounded-full bg-slate-100 px-4 py-1.5 text-sm font-black tabular-nums text-slate-700">{natija.raqam}</p>
      <p className="mt-2 text-sm font-semibold text-slate-500">
        {natija.mijoz} · {natija.sotuv}
      </p>

      <ul className="mx-auto mt-6 max-w-md space-y-2.5 text-left">
        {satrlar.map((satr) => (
          <li key={satr.matn} className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
            <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"><Check size={16} strokeWidth={3} /></span>
            <span className="text-sm font-extrabold text-slate-800">{satr.matn}</span>
          </li>
        ))}
      </ul>

      <div className="mx-auto mt-5 flex max-w-md items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <span className="text-sm font-bold text-slate-500">{t("wizard.done.remaining")}</span>
        <span className={`text-2xl font-extrabold tabular-nums ${hisob.qolganQarz > 0 ? "text-rose-600" : "text-emerald-600"}`}>{pulniFormatlash(hisob.qolganQarz)}</span>
      </div>
      {hisob.manba === "taxminiy" && <p className="mx-auto mt-3 max-w-md text-xs font-medium text-amber-700">{t("wizard.done.estimateNote")}</p>}

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={onKorish} className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-2xl bg-orange-500 px-6 text-sm font-black text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600">
          <FileText size={16} aria-hidden /> {t("wizard.done.viewDocument")}
        </button>
        <button type="button" onClick={onYangi} className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50">
          <Undo2 size={16} aria-hidden /> {t("wizard.done.newReturn")}
        </button>
        <button type="button" onClick={onYopish} className="h-12 cursor-pointer rounded-2xl px-4 text-sm font-bold text-slate-500 transition hover:text-slate-800">
          {t("wizard.done.close")}
        </button>
      </div>
    </section>
  );
}
