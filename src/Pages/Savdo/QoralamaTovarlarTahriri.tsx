import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { ArrowLeftRight, LoaderCircle, Package, Plus, RotateCcw, Search, Trash2, TriangleAlert, Undo2, X } from "lucide-react";
import {
  bandMahsulotlar,
  chegirmaniOzgartirish,
  kiritishniTozalash,
  mahsulotniAlmashtirish,
  mavjudMahsulotmi,
  miqdorniOzgartirish,
  narxniOzgartirish,
  ozgarishlarSoni,
  qatorOzgarganmi,
  qatorXatolari,
  qatorlarJami,
  qatorniBoshlash,
  qatorSummasi,
  qoldiqMiqdori,
  qoldiqTopish,
  tahrirItemlari,
  tanlanadiganQoldiqlar,
  valyutaniOzgartirish,
  xatoBormi,
  yangiQatorYaratish,
  type QatorXatolari,
  type TahrirKonteksti,
  type TahrirQatori,
} from "@/lib/qoralamaTahriri";
import { narxSotuvValyutasida, qatorNarxTuri, turNarxi } from "@/lib/savdoNarxlari";
import { useValyutaStore, type Valyuta } from "@/lib/valyuta";
import { useSavdoSozlamalariStore } from "@/store/savdoSozlamalariStore";
import { useSavdoStore } from "@/store/savdoStore";
import { qoralamaTahrirSummasi } from "@/lib/qoralamaUmumiyTahrir";
import type { QoldiqTanlovi, Sotuv, SotuvMahsuloti, SotuvYaratishMalumoti } from "@/types/savdo";
import { pulniFormatlash, qatorValyutasi, sotuvSummasi, sotuvValyutasi, sotuvValyutasigaOgirish } from "./savdoYordamchilari";

type Props = {
  sotuv: Sotuv;
  qoldiqlar: QoldiqTanlovi[];
  amalBajarilmoqda: boolean;
  onYangilash: (sotuvId: string, malumot: Partial<SotuvYaratishMalumoti>) => Promise<boolean>;
  /** Saqlanmagan o'zgarishlar soni o'zgarganda (modalni yopish va to'lovga o'tishni nazorat qilish uchun). */
  onOzgarish?: (soni: number) => void;
  umumiyTahrir?: {
    malumot: Partial<SotuvYaratishMalumoti>;
    ozgarishlarSoni: number;
    warehouseId: string;
    omborNomi: string;
    currency: string;
    xatoBor: boolean;
    onBekor: () => void;
    onSaqlandi: () => void;
  };
};

type PopoverHolati = { kalit: string; left: number; kenglik: number; top?: number; bottom?: number };

const ORAMA =
  "flex h-10 w-full items-center gap-1.5 rounded-lg border bg-white px-3 transition focus-within:border-[#2563EB] focus-within:ring-4 focus-within:ring-blue-100";
const XATO_RAMKA = "border-red-400 ring-4 ring-red-100";
const ODDIY_RAMKA = "border-slate-300";
const SATR_USTUNLARI = "xl:grid-cols-[34px_minmax(220px,1fr)_136px_172px_132px_136px_92px_64px]";
const POPOVER_LIMIT = 80;

function formatSon(son: number) {
  return son.toLocaleString("uz-UZ", { maximumFractionDigits: 3 });
}

function qoldiqNomi(qoldiq: QoldiqTanlovi) {
  return qoldiq.modification?.product?.name ?? qoldiq.modification?.name ?? "";
}

function itemNomi(item: SotuvMahsuloti) {
  return item.modification?.product?.name ?? item.modification?.name ?? "";
}

function miqdorXatosi(xato: NonNullable<QatorXatolari["miqdor"]>, t: TFunction) {
  if (xato.kod === "nol") return t("qoralamaTahrir.xatolar.miqdorNol");
  if (xato.kod === "butunEmas") return t("qoralamaTahrir.xatolar.miqdorButun");
  return t("qoralamaTahrir.xatolar.miqdorQoldiq", { mavjud: formatSon(xato.mavjud) });
}

function Maydon({ yorliq, children, className = "" }: { yorliq: string; children: ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400 xl:hidden">{yorliq}</span>
      {children}
    </div>
  );
}

function XatoMatni({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-xs font-semibold leading-4 text-red-500">{children}</p>;
}

function Belgi({ valyuta }: { valyuta: Valyuta }) {
  return <span className="shrink-0 text-xs font-semibold text-slate-400">{valyuta === "USD" ? "$" : "so'm"}</span>;
}

// Narx valyutasi: almashtirish mumkin bo'lsa tugma (so'm ↔ $), aks holda oddiy belgi.
function ValyutaTugmasi({ valyuta, mumkin, sarlavha, onClick }: { valyuta: Valyuta; mumkin: boolean; sarlavha: string; onClick: () => void }) {
  if (!mumkin) return <Belgi valyuta={valyuta} />;
  return (
    <button
      type="button"
      onClick={onClick}
      title={sarlavha}
      aria-label={sarlavha}
      className="inline-flex shrink-0 items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-black text-slate-500 transition hover:bg-blue-50 hover:text-[#2563EB]"
    >
      {valyuta === "USD" ? "$" : "so'm"}
      <ArrowLeftRight size={10} />
    </button>
  );
}

export default function QoralamaTovarlarTahriri({ sotuv, qoldiqlar, amalBajarilmoqda, onYangilash, onOzgarish, umumiyTahrir }: Props) {
  const { t } = useTranslation("savdo_tafsilot");
  const sotuvVal = umumiyTahrir?.currency === "USD" ? "USD" : umumiyTahrir ? "UZS" : sotuvValyutasi(sotuv);
  const aslOmborId = sotuv.warehouseId ?? sotuv.warehouse?.id;
  const omborId = umumiyTahrir?.warehouseId ?? aslOmborId;
  const rezervMavjud = omborId === aslOmborId;
  const valyutaOzgargan = sotuvVal !== sotuvValyutasi(sotuv);
  const kurs = useValyutaStore((holat) => (holat.kursBor && holat.kurs > 0 ? holat.kurs : 0));
  // Valyuta rejimi yoqilgan va bugungi kurs kiritilgan bo'lsagina qatorni dollarga o'tkazish mumkin.
  const dollarMumkin = useValyutaStore((holat) => holat.rejimYoniq && holat.kursBor && holat.kurs > 0);
  const narxTurlari = useSavdoSozlamalariStore((holat) => holat.narxTurlari);
  const sozlamaniYuklash = useSavdoSozlamalariStore((holat) => holat.yuklash);

  useEffect(() => {
    void sozlamaniYuklash();
  }, [sozlamaniYuklash]);

  const ctx = useMemo<TahrirKonteksti>(
    () => ({ sotuvVal, kurs, turRuxsati: (tur) => !narxTurlari || narxTurlari.includes(tur) }),
    [sotuvVal, kurs, narxTurlari]
  );

  // Saqlangan holat: sotuv qatorlari o'zgarsa (saqlangandan keyin) komponent qayta yaratiladi (tashqarida `key`).
  const [boshlangich] = useState<TahrirQatori[]>(() =>
    (sotuv.items ?? []).map((item, indeks) =>
      qatorniBoshlash(item, indeks, { nom: itemNomi(item), qatorValyutasi: qatorValyutasi(item, sotuv) })
    )
  );
  const [qatorlar, setQatorlar] = useState<TahrirQatori[]>(boshlangich);
  const [urinildi, setUrinildi] = useState(false);
  const [popover, setPopover] = useState<PopoverHolati | null>(null);
  const [qidiruv, setQidiruv] = useState("");
  const [ochiladiganKalit, setOchiladiganKalit] = useState<string | null>(null);
  const yangiRaqami = useRef(0);
  const popoverRef = useRef<HTMLDivElement>(null);

  const qoldiqOl = useCallback(
    (q: TahrirQatori) => (q.qoldiq?.warehouseId === omborId ? q.qoldiq : null) ?? qoldiqTopish(qoldiqlar, q.modificationId, omborId) ?? null,
    [qoldiqlar, omborId]
  );

  const faol = qatorlar.filter((q) => !q.ochirildi);
  const ozgarish = ozgarishlarSoni(qatorlar);
  const jamiOzgarish = ozgarish + (umumiyTahrir?.ozgarishlarSoni ?? 0);
  const xatoBor = Boolean(umumiyTahrir?.xatoBor) || qatorlar.some((q) => xatoBormi(qatorXatolari(q, qoldiqOl(q), rezervMavjud)));

  useEffect(() => {
    onOzgarish?.(ozgarish);
  }, [ozgarish, onOzgarish]);

  useEffect(() => () => onOzgarish?.(0), [onOzgarish]);

  const jami = useMemo(
    () => qatorlarJami(qatorlar, (summa, valyuta) => valyutaOzgargan
      ? qoralamaTahrirSummasi(summa, valyuta, sotuvVal, kurs)
      : sotuvValyutasigaOgirish(summa, valyuta, sotuv)),
    [qatorlar, sotuv, sotuvVal, valyutaOzgargan, kurs]
  );
  const saqlanganJami = sotuvSummasi(sotuv);
  const umumiyJami = ozgarish === 0 && !valyutaOzgargan && saqlanganJami > 0 ? saqlanganJami : jami.jami;

  const popoverniYopish = useCallback(() => {
    setPopover(null);
    setQidiruv("");
  }, []);

  const popoverJoyi = useCallback((kalit: string, element: HTMLElement): PopoverHolati => {
    const rect = element.getBoundingClientRect();
    const kenglik = Math.min(580, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - kenglik - 12));
    const pastda = window.innerHeight - rect.bottom;
    const tepaga = pastda < 400 && rect.top > pastda;
    return tepaga
      ? { kalit, left, kenglik, bottom: window.innerHeight - rect.top + 8 }
      : { kalit, left, kenglik, top: rect.bottom + 8 };
  }, []);

  // Popover ochiq vaqtda sahifa surilsa yoki oyna o'lchami o'zgarsa, u mahsulot tugmasi yonida qoladi (ro'yxatning o'z surilishi hisobga olinmaydi).
  const popoverKaliti = popover?.kalit ?? null;
  useEffect(() => {
    if (!popoverKaliti) return;
    const kalit: string = popoverKaliti;
    function joylashtirish(event?: Event) {
      if (event?.target instanceof Node && popoverRef.current?.contains(event.target)) return;
      const element = document.querySelector<HTMLElement>(`[data-qator-mahsulot="${kalit}"]`);
      if (!element) {
        popoverniYopish();
        return;
      }
      const rect = element.getBoundingClientRect();
      // Tugma ko'rinish maydonidan chiqib ketgan bo'lsa, popover yopiladi.
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        popoverniYopish();
        return;
      }
      setPopover(popoverJoyi(kalit, element));
    }
    window.addEventListener("scroll", joylashtirish, true);
    window.addEventListener("resize", joylashtirish);
    return () => {
      window.removeEventListener("scroll", joylashtirish, true);
      window.removeEventListener("resize", joylashtirish);
    };
  }, [popoverKaliti, popoverJoyi, popoverniYopish]);

  const popoverOchish = useCallback(
    (kalit: string, element: HTMLElement) => {
      setQidiruv("");
      setPopover(popoverJoyi(kalit, element));
    },
    [popoverJoyi]
  );

  // Yangi qo'shilgan qator chizilgach, uning mahsulot ro'yxati ochiladi.
  useEffect(() => {
    if (!ochiladiganKalit) return;
    const element = document.querySelector<HTMLElement>(`[data-qator-mahsulot="${ochiladiganKalit}"]`);
    if (element) {
      element.scrollIntoView({ block: "center" });
      popoverOchish(ochiladiganKalit, element);
    }
    setOchiladiganKalit(null);
  }, [ochiladiganKalit, popoverOchish]);

  function qatorniYangilash(kalit: string, ozgartir: (q: TahrirQatori) => TahrirQatori) {
    setQatorlar((qatorlarRoyxati) => qatorlarRoyxati.map((q) => (q.kalit === kalit ? ozgartir(q) : q)));
  }

  function qatorQoshish() {
    yangiRaqami.current += 1;
    const kalit = `yangi-${yangiRaqami.current}`;
    setQatorlar((qatorlarRoyxati) => [...qatorlarRoyxati, yangiQatorYaratish(kalit, sotuvVal)]);
    setOchiladiganKalit(kalit);
  }

  function qatorniOchirish(q: TahrirQatori) {
    if (!q.asl) setQatorlar((qatorlarRoyxati) => qatorlarRoyxati.filter((qator) => qator.kalit !== q.kalit));
    else qatorniYangilash(q.kalit, (qator) => ({ ...qator, ochirildi: true }));
  }

  function qatorniAslHolatigaQaytarish(kalit: string) {
    const asl = boshlangich.find((qator) => qator.kalit === kalit);
    if (asl) qatorniYangilash(kalit, () => asl);
  }

  function standartTur(q: TahrirQatori) {
    return q.tur ?? q.asl?.priceType ?? narxTurlari?.[0] ?? "RETAIL";
  }

  function mahsulotTanlash(qoldiq: QoldiqTanlovi) {
    if (!popover) return;
    const kalit = popover.kalit;
    const aslHolati = boshlangich.find((qator) => qator.kalit === kalit);
    qatorniYangilash(kalit, (q) =>
      mahsulotniAlmashtirish(q, qoldiq, { nom: qoldiqNomi(qoldiq), standartTur: standartTur(q), ctx, aslHolati })
    );
    popoverniYopish();
  }

  function hammasiniBekorQilish() {
    setQatorlar(boshlangich);
    setUrinildi(false);
    popoverniYopish();
    umumiyTahrir?.onBekor();
  }

  async function saqlash() {
    if (amalBajarilmoqda) return;
    setUrinildi(true);
    if (jamiOzgarish === 0 || faol.length === 0 || xatoBor) {
      window.requestAnimationFrame(() => {
        document.querySelector("[data-qator-xato='true']")?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
      return;
    }
    const muvaffaqiyatli = await onYangilash(sotuv.id, {
      ...umumiyTahrir?.malumot,
      ...(ozgarish > 0 || valyutaOzgargan || !rezervMavjud ? { items: tahrirItemlari(qatorlar, ctx) as SotuvYaratishMalumoti["items"] } : {}),
    });
    // Saqlangandan keyin sotuv qatorlari yangilanadi va komponent qayta yaratiladi (tashqarida `key`).
    if (muvaffaqiyatli) {
      setUrinildi(false);
      // Qoralama rezervi o'zgargan bo'lishi mumkin (eski mahsulot bo'shaydi, yangisi band bo'ladi): "Omborda" raqamlari yangilanadi.
      void useSavdoStore.getState().qoldiqlarniYuklash(omborId);
      umumiyTahrir?.onSaqlandi();
    }
  }

  // ── Mahsulot tanlash ro'yxati ──
  const popoverQatori = popover ? qatorlar.find((q) => q.kalit === popover.kalit) : undefined;
  const tanlashRoyxati = useMemo(() => tanlanadiganQoldiqlar(qoldiqlar, omborId), [qoldiqlar, omborId]);
  const royxatElementlari = useMemo(() => {
    if (!popoverQatori) return [];
    const qiymat = qidiruv.trim().toLowerCase();
    const band = bandMahsulotlar(qatorlar, popoverQatori.kalit);
    const standart = popoverQatori.tur ?? popoverQatori.asl?.priceType ?? narxTurlari?.[0] ?? "RETAIL";
    return tanlashRoyxati
      .map((qoldiq) => {
        const nom = qoldiqNomi(qoldiq) || qoldiq.modificationId;
        const tur = qatorNarxTuri(qoldiq, standart, ctx.turRuxsati, kurs) ?? standart;
        const katalog = turNarxi(qoldiq, tur, kurs);
        const narx = narxSotuvValyutasida(katalog, sotuvVal, kurs);
        const miqdor = qoldiqMiqdori(qoldiq);
        const asliMi = popoverQatori.asl?.modificationId === qoldiq.modificationId;
        const holat = band.has(qoldiq.modificationId)
          ? "band"
          : miqdor <= 0 && !asliMi
            ? "yoq"
            : katalog !== null && narx <= 0
              ? "kurs"
              : "ok";
        const matn = [nom, qoldiq.modification?.name, qoldiq.modification?.barcode, qoldiq.modification?.article].join(" ").toLowerCase();
        return { qoldiq, nom, narx, miqdor, holat, matn };
      })
      .filter((element) => !qiymat || element.matn.includes(qiymat))
      .sort((a, b) => Number(b.holat === "ok" || b.holat === "kurs") - Number(a.holat === "ok" || a.holat === "kurs") || a.nom.localeCompare(b.nom, "uz"));
  }, [popoverQatori, qidiruv, qatorlar, tanlashRoyxati, narxTurlari, ctx.turRuxsati, kurs, sotuvVal]);

  const korsatiladiganElementlar = royxatElementlari.slice(0, POPOVER_LIMIT);

  function qidiruvdaTugma(key: string) {
    if (key === "Escape") popoverniYopish();
    if (key === "Enter") {
      const birinchi = korsatiladiganElementlar.find((element) => element.holat === "ok" || element.holat === "kurs");
      if (birinchi) mahsulotTanlash(birinchi.qoldiq);
    }
  }

  const kursYoq = sotuvVal === "USD" && kurs <= 0;
  const jamiTaxminiy = (ozgarish > 0 || valyutaOzgargan) && !jami.aniq;

  return (
    <div className={umumiyTahrir ? "mx-4 mb-5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,.025)] sm:mx-6 sm:p-5" : "px-4 py-5 sm:px-7 sm:py-7"}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">{umumiyTahrir && <Package size={18} className="text-gold-600" />}{t("qoralamaTahrir.sarlavha")}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-500">{t(umumiyTahrir ? "fullEdit.productsHint" : "qoralamaTahrir.tavsif")}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-slate-500">
              {t("common.info.ombor")}: <span className="text-slate-700">{umumiyTahrir?.omborNomi || sotuv.warehouse?.name || t("common.omborTanlanmagan")}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[#2563EB]">
              {t("qoralamaTahrir.valyuta")}: {sotuvVal === "USD" ? "USD ($)" : "UZS (so'm)"}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={qatorQoshish}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-gold-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gold-700"
        >
          <Plus size={16} />
          {t("qoralamaTahrir.mahsulotQoshish")}
        </button>
      </div>

      {kursYoq && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 ring-1 ring-amber-100">
          <TriangleAlert size={17} className="mt-0.5 shrink-0" />
          {t("qoralamaTahrir.kursYoqOgohlantirish")}
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className={`hidden gap-x-3 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 xl:grid ${SATR_USTUNLARI}`}>
          <span>№</span>
          <span>{t("common.jadval.mahsulot")}</span>
          <span className="text-right">{t("common.jadval.miqdor")}</span>
          <span className="text-right">{t("common.jadval.narx")}</span>
          <span className="text-right">{t("qoralamaTahrir.chegirma")}</span>
          <span className="text-right">{t("common.jadval.summa")}</span>
          <span className="text-right">{t("qoralamaTahrir.omborda")}</span>
          <span />
        </div>

        {qatorlar.length === 0 && (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Package size={24} />
            </span>
            <p className="mt-4 text-sm font-semibold text-slate-500">{t("tovarlarTab.mahsulotYoq")}</p>
          </div>
        )}

        {qatorlar.map((q, indeks) => {
          const qoldiq = qoldiqOl(q);
          const xatolar = qatorXatolari(q, qoldiq, rezervMavjud);
          const mavjud = mavjudMahsulotmi(q);
          const holat = q.ochirildi ? "ochirildi" : !q.asl ? "yangi" : !mavjud ? "almashtirilgan" : qatorOzgarganmi(q) ? "ozgargan" : null;
          const nom = (q.asl && mavjud ? itemNomi(q.asl) : q.nom) || (qoldiq ? qoldiqNomi(qoldiq) : "") || (q.modificationId ? t("common.mahsulotNomiTopilmadi") : "");
          const tavsif = [
            q.birlikNomi,
            qoldiq?.modification?.barcode ? t("tovarlarTab.shtrixKod", { value: qoldiq.modification.barcode }) : "",
            qoldiq?.modification?.article ? t("tovarlarTab.artikul", { value: qoldiq.modification.article }) : "",
          ]
            .filter(Boolean)
            .join(" · ");
          const mahsulotXatosi = urinildi && xatolar.mahsulot;
          const miqdorXatoKorinadi = Boolean(xatolar.miqdor);
          const narxXatoKorinadi = Boolean(xatolar.narx) && (urinildi || mavjud);
          const valyutaNishoni: Valyuta = q.valyuta === "USD" ? "UZS" : "USD";
          const valyutaMumkin =
            !q.ochirildi &&
            ((mavjud && valyutaNishoni === q.aslValyuta) || (kurs > 0 && (valyutaNishoni === "UZS" || dollarMumkin)));
          const chegirmaXatoKorinadi = Boolean(xatolar.chegirma);
          const holatStili =
            holat === "ochirildi"
              ? "border-l-red-400 bg-red-50/40"
              : holat === "yangi"
                ? "border-l-[#2563EB] bg-blue-50/40"
                : holat === "almashtirilgan"
                  ? "border-l-violet-400 bg-violet-50/40"
                  : holat === "ozgargan"
                    ? "border-l-amber-400 bg-amber-50/40"
                    : "border-l-transparent";
          const holatBelgisi =
            holat === "ochirildi"
              ? "bg-red-100 text-red-600"
              : holat === "yangi"
                ? "bg-blue-100 text-[#2563EB]"
                : holat === "almashtirilgan"
                  ? "bg-violet-100 text-violet-600"
                  : "bg-amber-100 text-amber-700";
          const ochirildi = q.ochirildi;
          const qoldiqSoni = qoldiq ? qoldiqMiqdori(qoldiq) : null;

          return (
            <div
              key={q.kalit}
              data-qator={q.kalit}
              data-qator-xato={xatoBormi(xatolar) ? "true" : "false"}
              className={`grid grid-cols-2 items-start gap-x-3 gap-y-3 border-b border-l-4 border-b-slate-100 px-4 py-4 sm:px-5 md:grid-cols-4 ${SATR_USTUNLARI} ${holatStili}`}
            >
              <span className="hidden pt-2.5 text-sm font-semibold text-slate-400 xl:block">{indeks + 1}.</span>

              <div className="col-span-2 min-w-0 md:col-span-4 xl:col-span-1">
                <button
                  type="button"
                  disabled={ochirildi}
                  data-qator-mahsulot={q.kalit}
                  onClick={(event) => popoverOchish(q.kalit, event.currentTarget)}
                  title={t("qoralamaTahrir.mahsulotniAlmashtirish")}
                  className={`flex min-h-10 w-full items-center gap-2.5 rounded-lg border bg-white px-2.5 py-1.5 text-left transition hover:border-[#2563EB]/60 focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 ${
                    mahsulotXatosi ? XATO_RAMKA : ODDIY_RAMKA
                  }`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <Package size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm font-semibold ${nom ? "text-slate-800" : "text-slate-400"} ${ochirildi ? "line-through" : ""}`}>
                      {nom || t("qoralamaTahrir.mahsulotTanlang")}
                    </span>
                    {tavsif && <span className="block truncate text-[11px] text-slate-400">{tavsif}</span>}
                  </span>
                  {holat && (
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${holatBelgisi}`}>
                      {t(`qoralamaTahrir.holat.${holat}`)}
                    </span>
                  )}
                  <Search size={15} className="shrink-0 text-slate-400" />
                </button>
                {mahsulotXatosi && <XatoMatni>{t("qoralamaTahrir.xatolar.mahsulot")}</XatoMatni>}
              </div>

              <Maydon yorliq={t("common.jadval.miqdor")}>
                <div className={`${ORAMA} ${miqdorXatoKorinadi ? XATO_RAMKA : ODDIY_RAMKA} ${ochirildi ? "bg-slate-50" : ""}`}>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={q.miqdor}
                    disabled={ochirildi}
                    aria-label={`${t("common.jadval.miqdor")}: ${nom}`}
                    onChange={(event) => qatorniYangilash(q.kalit, (qator) => miqdorniOzgartirish(qator, kiritishniTozalash(event.target.value, 3)))}
                    onFocus={(event) => event.currentTarget.select()}
                    onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
                    placeholder="0"
                    className="min-w-0 flex-1 bg-transparent text-right text-sm font-semibold tabular-nums text-slate-800 outline-none disabled:cursor-not-allowed disabled:text-slate-400"
                  />
                  <span className="shrink-0 text-xs font-semibold text-slate-400">{q.birlikNomi || t("common.dona")}</span>
                </div>
                {miqdorXatoKorinadi && xatolar.miqdor && <XatoMatni>{miqdorXatosi(xatolar.miqdor, t)}</XatoMatni>}
              </Maydon>

              <Maydon yorliq={t("common.jadval.narx")}>
                <div className={`${ORAMA} ${narxXatoKorinadi ? XATO_RAMKA : ODDIY_RAMKA}`}>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={q.narx}
                    disabled={ochirildi}
                    aria-label={`${t("common.jadval.narx")}: ${nom}`}
                    onChange={(event) => qatorniYangilash(q.kalit, (qator) => narxniOzgartirish(qator, kiritishniTozalash(event.target.value, 2)))}
                    onFocus={(event) => event.currentTarget.select()}
                    onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
                    placeholder="0"
                    className="min-w-0 flex-1 bg-transparent text-right text-sm font-semibold tabular-nums text-slate-800 outline-none disabled:cursor-not-allowed disabled:text-slate-400"
                  />
                  <ValyutaTugmasi
                    valyuta={q.valyuta}
                    mumkin={valyutaMumkin}
                    sarlavha={t("qoralamaTahrir.valyutaniAlmashtirish")}
                    onClick={() => qatorniYangilash(q.kalit, (qator) => valyutaniOzgartirish(qator, valyutaNishoni, kurs))}
                  />
                </div>
                {narxXatoKorinadi && xatolar.narx && <XatoMatni>{t("qoralamaTahrir.xatolar.narxKerak")}</XatoMatni>}
              </Maydon>

              <Maydon yorliq={t("qoralamaTahrir.chegirma")}>
                <div className={`${ORAMA} ${chegirmaXatoKorinadi ? XATO_RAMKA : ODDIY_RAMKA}`}>
                  {q.valyuta === "USD" && <Belgi valyuta="USD" />}
                  <input
                    type="text"
                    inputMode="decimal"
                    value={q.chegirma}
                    disabled={ochirildi}
                    aria-label={`${t("qoralamaTahrir.chegirma")}: ${nom}`}
                    onChange={(event) =>
                      qatorniYangilash(q.kalit, (qator) => chegirmaniOzgartirish(qator, kiritishniTozalash(event.target.value, 2)))
                    }
                    onFocus={(event) => event.currentTarget.select()}
                    onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
                    placeholder="0"
                    className="min-w-0 flex-1 bg-transparent text-right text-sm font-semibold tabular-nums text-slate-800 outline-none disabled:cursor-not-allowed disabled:text-slate-400"
                  />
                  {q.chegirmaFoiz ? (
                    <span className="shrink-0 rounded-md bg-lime-100 px-1.5 py-0.5 text-[10px] font-black text-lime-700">{q.chegirmaFoiz}%</span>
                  ) : (
                    q.valyuta !== "USD" && <Belgi valyuta="UZS" />
                  )}
                </div>
                {chegirmaXatoKorinadi && <XatoMatni>{t("qoralamaTahrir.xatolar.chegirma")}</XatoMatni>}
              </Maydon>

              <Maydon yorliq={t("common.jadval.summa")}>
                <div className={`flex h-10 items-center justify-end text-sm font-black tabular-nums ${ochirildi ? "text-slate-300 line-through" : "text-emerald-600"}`}>
                  {pulniFormatlash(qatorSummasi(q), q.valyuta)}
                </div>
              </Maydon>

              <Maydon yorliq={t("qoralamaTahrir.omborda")} className="md:col-span-3 xl:col-span-1">
                <div className="flex h-10 items-center justify-start gap-1 text-sm tabular-nums xl:justify-end">
                  {qoldiqSoni === null ? (
                    <span className="text-slate-300">—</span>
                  ) : (
                    <>
                      <span className={`font-semibold ${qoldiqSoni <= 0 ? "text-red-500" : "text-slate-600"}`}>{formatSon(qoldiqSoni)}</span>
                      <span className="text-xs text-slate-400">{t("common.dona")}</span>
                    </>
                  )}
                </div>
              </Maydon>

              <div className="flex h-10 items-center justify-end gap-1.5 xl:justify-center">
                {holat && holat !== "yangi" && !ochirildi && (
                  <button
                    type="button"
                    onClick={() => qatorniAslHolatigaQaytarish(q.kalit)}
                    title={t("qoralamaTahrir.qatorniQaytarish")}
                    aria-label={t("qoralamaTahrir.qatorniQaytarish")}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Undo2 size={15} />
                  </button>
                )}
                {ochirildi ? (
                  <button
                    type="button"
                    onClick={() => qatorniYangilash(q.kalit, (qator) => ({ ...qator, ochirildi: false }))}
                    title={t("qoralamaTahrir.qaytarish")}
                    aria-label={t("qoralamaTahrir.qaytarish")}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#2563EB] ring-1 ring-blue-100 transition hover:bg-blue-50"
                  >
                    <RotateCcw size={15} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => qatorniOchirish(q)}
                    title={t("qoralamaTahrir.qatorniOchirish")}
                    aria-label={t("qoralamaTahrir.qatorniOchirish")}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={qatorQoshish}
          className="flex h-12 w-full items-center justify-center gap-2 text-sm font-bold text-[#2563EB] transition hover:bg-blue-50/60"
        >
          <Plus size={16} />
          {t("qoralamaTahrir.mahsulotQoshish")}
        </button>
      </section>

      <div className="mt-6 flex justify-end">
        <div className="w-full max-w-sm space-y-2.5 rounded-xl border border-gold-100 bg-gold-50/40 p-4 text-sm text-slate-500">
          <p className="flex items-center justify-between gap-6">
            <span>{t("qoralamaTahrir.jami.chegirmasiz")}</span>
            <span className="font-semibold tabular-nums text-slate-700">{pulniFormatlash(jami.chegirmasiz, sotuvVal)}</span>
          </p>
          <p className="flex items-center justify-between gap-6 text-lime-700">
            <span>{t("qoralamaTahrir.jami.chegirma")}</span>
            <span className="font-semibold tabular-nums">{pulniFormatlash(jami.chegirma, sotuvVal)}</span>
          </p>
          <p className="flex items-center justify-between gap-6 border-t border-gold-200 pt-3 text-base font-bold text-gold-700">
            <span>{t("common.totals.umumiySumma")}</span>
            <span className="tabular-nums">
              {jamiTaxminiy ? "≈ " : ""}
              {pulniFormatlash(umumiyJami, sotuvVal)}
            </span>
          </p>
          {ozgarish > 0 && !valyutaOzgargan && saqlanganJami > 0 && (
            <p className="flex items-center justify-between gap-6 text-xs text-slate-400">
              <span>{t("qoralamaTahrir.jami.saqlangan")}</span>
              <span className="tabular-nums line-through">{pulniFormatlash(saqlanganJami, sotuvVal)}</span>
            </p>
          )}
          {jamiTaxminiy && <p className="text-xs font-semibold text-amber-600">{t("qoralamaTahrir.jami.taxminiy")}</p>}
        </div>
      </div>

      {(jamiOzgarish > 0 || umumiyTahrir) && (
        <div
          role="region"
          aria-label={t("qoralamaTahrir.saqlanmagan", { soni: jamiOzgarish })}
          className="sticky bottom-3 z-20 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 text-slate-700 shadow-[0_6px_24px_rgba(15,23,42,.12)] backdrop-blur-md"
        >
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <span className={`h-2 w-2 shrink-0 rounded-full ${jamiOzgarish > 0 ? "bg-amber-500" : "bg-slate-300"}`} />
              {jamiOzgarish > 0 ? t("qoralamaTahrir.saqlanmagan", { soni: jamiOzgarish }) : t("fullEdit.noChanges")}
            </p>
            {faol.length === 0 && <p className="mt-1 text-xs font-semibold text-amber-700">{t("qoralamaTahrir.kamida")}</p>}
            {faol.length > 0 && urinildi && xatoBor && <p className="mt-1 text-xs font-semibold text-amber-700">{t("qoralamaTahrir.xatolarniTuzating")}</p>}
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <button
              type="button"
              onClick={hammasiniBekorQilish}
              disabled={amalBajarilmoqda}
              className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
            >
              {t("qoralamaTahrir.bekorQilish")}
            </button>
            <button
              type="button"
              onClick={() => void saqlash()}
              disabled={amalBajarilmoqda || faol.length === 0 || jamiOzgarish === 0 || Boolean(umumiyTahrir?.xatoBor)}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-gold-600 px-5 text-sm font-semibold text-white transition hover:bg-gold-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 sm:flex-none"
            >
              {amalBajarilmoqda && <LoaderCircle size={16} className="animate-spin" />}
              {amalBajarilmoqda ? t("common.saqlanmoqda") : t("qoralamaTahrir.saqlash")}
            </button>
          </div>
        </div>
      )}

      {popover &&
        popoverQatori &&
        createPortal(
          <>
            <button
              type="button"
              aria-label={t("tovarlarTab.mahsulotOynasiniYopish")}
              className="fixed inset-0 z-100000 cursor-default bg-transparent"
              onClick={popoverniYopish}
            />
            <div
              ref={popoverRef}
              className="fixed z-100001 rounded-2xl bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,0.22)] ring-1 ring-slate-100"
              style={{ left: popover.left, width: popover.kenglik, top: popover.top, bottom: popover.bottom }}
            >
              <label className="mb-3 flex h-11 items-center gap-2 rounded-xl border border-[#2563EB] bg-white px-3.5 ring-4 ring-blue-100">
                <Search size={17} className="shrink-0 text-slate-400" />
                <input
                  value={qidiruv}
                  onChange={(event) => setQidiruv(event.target.value)}
                  onKeyDown={(event) => qidiruvdaTugma(event.key)}
                  placeholder={t("qoralamaTahrir.qidiruv")}
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  autoFocus
                />
                {qidiruv && (
                  <button type="button" onClick={() => setQidiruv("")} className="text-slate-400 transition hover:text-slate-700" aria-label={t("qoralamaTahrir.tozalash")}>
                    <X size={16} />
                  </button>
                )}
              </label>

              <div className="max-h-82.5 overflow-y-auto rounded-xl">
                {korsatiladiganElementlar.length === 0 && (
                  <div className="px-3 py-10 text-center text-sm text-slate-400">{t("tovarlarTab.qoldiqdaTopilmadi")}</div>
                )}
                {korsatiladiganElementlar.map((element) => {
                  const mumkin = element.holat === "ok" || element.holat === "kurs";
                  return (
                    <button
                      key={element.qoldiq.modificationId}
                      type="button"
                      disabled={!mumkin}
                      onClick={() => mahsulotTanlash(element.qoldiq)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                        mumkin ? "hover:bg-blue-50" : "cursor-not-allowed opacity-60"
                      }`}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#2563EB]">
                        <Package size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-800">{element.nom}</span>
                        <span className="mt-0.5 block truncate text-xs text-slate-400">
                          {mumkin ? `${t("qoralamaTahrir.omborda")}: ${formatSon(element.miqdor)} ${t("common.dona")}${element.holat === "kurs" ? ` · ${t("qoralamaTahrir.mavjudEmas.kurs")}` : ""}` : t(`qoralamaTahrir.mavjudEmas.${element.holat}`)}
                          {element.qoldiq.modification?.barcode ? ` · ${element.qoldiq.modification.barcode}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-slate-700">
                        {element.narx > 0 ? pulniFormatlash(element.narx, sotuvVal) : "—"}
                      </span>
                    </button>
                  );
                })}
                {royxatElementlari.length > POPOVER_LIMIT && (
                  <p className="px-3 py-3 text-center text-xs font-semibold text-slate-400">
                    {t("qoralamaTahrir.yanaMahsulot", { soni: royxatElementlari.length - POPOVER_LIMIT })}
                  </p>
                )}
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
