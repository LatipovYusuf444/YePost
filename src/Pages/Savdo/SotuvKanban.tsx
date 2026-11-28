import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Ban, CalendarClock, CircleAlert, Ellipsis, Eye, EyeOff, LoaderCircle, Package, RefreshCw, Truck, Undo2, Wallet, X } from "lucide-react";
import { sotuvTaxtasiniOlish, taxtaUstuniniOlish } from "@/api/savdoApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { xatoKodi } from "@/api/xatoKodlari";
import DateRangePicker from "@/Components/ui/DateRangePicker";
import { kunMatni } from "@/lib/hujjatSanasi";
import {
  TAXTA_KURSOR_XATOSI,
  TAXTA_USTUNLARI,
  kartochkalarniQoshish,
  sahifalarniQaytaYurish,
  taxtaAmali,
  taxtaMijozi,
  taxtaMumkinAmallari,
  taxtaOgohlantirishi,
  taxtaRadSababi,
  taxtaSummasi,
  type TaxtaAmali,
  type TaxtaKaliti,
  type TaxtaRuxsatlari,
} from "@/lib/sotuvTaxtasi";
import { ogohlantirishXabari } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { valyutaKodi } from "@/lib/valyuta";
import type { NomliMalumot, OmborTanlovi, TaxtaFiltri, TaxtaJami, TaxtaKartochkasi, XodimTanlovi } from "@/types/savdo";
import SavdoSelect from "./SavdoSelect";
import { pulniFormatlash } from "./savdoYordamchilari";

export type SotuvKanbanProps = {
  /** Sahifa qidiruvi (komponent ~350 ms kechiktiradi). */
  qidiruv: string;
  omborlar: OmborTanlovi[];
  xodimlar: XodimTanlovi[];
  /** Ota oshiradi — taxta qayta yuklanadi (oyna yopilgandan / amaldan keyin). */
  yangilanish: number;
  /** Oyna ochiq: 30 s avtomatik yangilash to'xtaydi. */
  toxtatilgan: boolean;
  ruxsat: TaxtaRuxsatlari;
  onKartochkaOchish: (sotuvId: string) => void;
  /** true — amal bajarildi; har ikki holatda ham taxta qayta yuklanadi. */
  onAmal: (amal: TaxtaAmali, kartochka: TaxtaKartochkasi) => Promise<boolean>;
};

type UstunHolati = {
  key: TaxtaKaliti;
  count: number;
  totals: TaxtaJami[];
  items: TaxtaKartochkasi[];
  nextCursor: string | null;
  /** Yuklangan sahifalar soni (yangilashda shuncha sahifa qayta yuriladi); yig'ilgan "cancelled" da 0. */
  sahifalar: number;
  yuklanmoqda: boolean;
  xato: string | null;
};
type Taxta = Record<TaxtaKaliti, UstunHolati>;

type Bosish = {
  pointerId: number;
  turi: string;
  el: HTMLElement;
  kartochka: TaxtaKartochkasi;
  qayerdan: TaxtaKaliti;
  x0: number;
  y0: number;
  x: number;
  y: number;
  ofsetX: number;
  ofsetY: number;
  eni: number;
  faol: boolean;
  taymer: number | null;
  ustida: TaxtaKaliti | null;
};
type Sudrash = { kartochka: TaxtaKartochkasi; qayerdan: TaxtaKaliti; ustida: TaxtaKaliti | null; eni: number; x: number; y: number };

const SICHQONCHA_MASOFASI = 6;
const BOSIB_TURISH_MS = 350;
const BARMOQ_TOLERANSI = 10;
const AVTO_YANGILASH_MS = 30_000;
const QIDIRUV_KECHIKISHI = 350;
const YANGILASH_TAKRORI_MS = 400;
const CHET = 56;

const USTUN_RANGI: Record<TaxtaKaliti, string> = {
  draft: "bg-slate-400",
  shipped: "bg-blue-500",
  partial: "bg-amber-500",
  closed: "bg-emerald-500",
  cancelled: "bg-rose-500",
};

const AMAL_BELGISI: Record<TaxtaAmali, typeof Truck> = { tasdiqlash: Truck, tolov: Wallet, bekor: Ban };

function bosUstun(key: TaxtaKaliti): UstunHolati {
  return { key, count: 0, totals: [], items: [], nextCursor: null, sahifalar: key === "cancelled" ? 0 : 1, yuklanmoqda: false, xato: null };
}

function bosTaxta(): Taxta {
  return Object.fromEntries(TAXTA_USTUNLARI.map((key) => [key, bosUstun(key)])) as Taxta;
}

function xatoKodiniOlish(xato: unknown) {
  return axios.isAxiosError(xato) ? xatoKodi(xato.response?.data) : undefined;
}

function nomliNom(x: NomliMalumot & { username?: string }) {
  return x.fullName || x.name || [x.firstName, x.lastName].filter(Boolean).join(" ") || x.username || x.id;
}

function summaBormi(qiymat: string | null | undefined) {
  return (taxtaSummasi(qiymat) ?? 0) !== 0;
}

/** Ustun sarlavhasidagi jamilar: har valyuta alohida qatorda (so'm va dollar hech qachon qo'shilmaydi). */
function UstunJamilari({ totals, t }: { totals: TaxtaJami[]; t: TFunction }) {
  const qatorlar = totals.filter((j) => summaBormi(j.total) || summaBormi(j.paid) || summaBormi(j.debt));
  if (qatorlar.length === 0) return <p className="text-[11px] font-semibold text-slate-400">{t("kanban.jami.yoq")}</p>;
  return (
    <div className="space-y-1.5">
      {qatorlar.map((j) => {
        const v = valyutaKodi(j.currency);
        return (
          <div key={j.currency} className="rounded-lg bg-slate-50 px-2 py-1.5 ring-1 ring-slate-100">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">{j.currency}</span>
              <span className="truncate text-sm font-black tabular-nums text-slate-800" title={t("kanban.jami.jami")}>{pulniFormatlash(j.total, v)}</span>
            </div>
            <div className="mt-0.5 flex flex-wrap justify-end gap-x-2 text-[11px] font-semibold tabular-nums text-slate-500">
              <span>{t("kanban.jami.tolangan")}: <b className="text-emerald-700">{pulniFormatlash(j.paid, v)}</b></span>
              <span>{t("kanban.jami.qarz")}: <b className={summaBormi(j.debt) ? "text-rose-600" : "text-slate-600"}>{pulniFormatlash(j.debt, v)}</b></span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type KartochkaProps = {
  kartochka: TaxtaKartochkasi;
  ustun: TaxtaKaliti;
  amalRuxsati: boolean;
  bekorRuxsati: boolean;
  kutilmoqda: boolean;
  bloklangan: boolean;
  sudralmoqda: boolean;
  t: TFunction;
  onOchish: (id: string) => void;
  onBosish: (event: ReactPointerEvent<HTMLElement>, kartochka: TaxtaKartochkasi, ustun: TaxtaKaliti) => void;
  onAmal: (amal: TaxtaAmali, kartochka: TaxtaKartochkasi) => void;
};

// Kartochka: o'zi tugma (Enter — ochish); "…" menyusida sudrashsiz foydalanuvchilar uchun o'sha amallar.
const KanbanKartochkasi = memo(function KanbanKartochkasi({
  kartochka: k,
  ustun,
  amalRuxsati,
  bekorRuxsati,
  kutilmoqda,
  bloklangan,
  sudralmoqda,
  t,
  onOchish,
  onBosish,
  onAmal,
}: KartochkaProps) {
  const [menyu, setMenyu] = useState<CSSProperties | null>(null);
  const menyuTugmasi = useRef<HTMLButtonElement | null>(null);
  const menyuRef = useRef<HTMLDivElement | null>(null);
  const amallar = useMemo(() => taxtaMumkinAmallari(ustun, { amal: amalRuxsati, bekor: bekorRuxsati }), [ustun, amalRuxsati, bekorRuxsati]);
  const v = valyutaKodi(k.currency);
  const chiziq = taxtaOgohlantirishi(k);
  const qoralama = ustun === "draft";
  const tolovQatori = ustun !== "draft" && ustun !== "cancelled";

  useEffect(() => {
    if (!menyu) return;
    const yopish = (event: Event) => {
      const nishon = event.target as Node;
      if (menyuRef.current?.contains(nishon) || menyuTugmasi.current?.contains(nishon)) return;
      setMenyu(null);
    };
    const klavish = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenyu(null);
      menyuTugmasi.current?.focus();
    };
    const aylantirish = (event: Event) => {
      if (!menyuRef.current?.contains(event.target as Node)) setMenyu(null);
    };
    document.addEventListener("pointerdown", yopish);
    document.addEventListener("keydown", klavish);
    window.addEventListener("scroll", aylantirish, true);
    window.addEventListener("resize", aylantirish);
    window.requestAnimationFrame(() => menyuRef.current?.querySelector<HTMLButtonElement>("button")?.focus());
    return () => {
      document.removeEventListener("pointerdown", yopish);
      document.removeEventListener("keydown", klavish);
      window.removeEventListener("scroll", aylantirish, true);
      window.removeEventListener("resize", aylantirish);
    };
  }, [menyu]);

  function menyuniOchish() {
    if (menyu) return setMenyu(null);
    const r = menyuTugmasi.current?.getBoundingClientRect();
    if (!r) return;
    const eni = 240;
    const balandlik = amallar.length * 40 + 12;
    const pastga = window.innerHeight - r.bottom > balandlik + 12;
    setMenyu({
      position: "fixed",
      left: Math.max(12, Math.min(r.right - eni, window.innerWidth - eni - 12)),
      top: pastga ? r.bottom + 6 : Math.max(12, r.top - balandlik - 6),
      width: eni,
    });
  }

  const mijoz = taxtaMijozi(k) || t("kanban.karta.donalik");
  const sarlavha = k.docNumber?.trim() || t("kanban.karta.qoralama");

  return (
    <div
      className={cn(
        "relative select-none [-webkit-touch-callout:none]",
        sudralmoqda && "opacity-40",
        kutilmoqda && "pointer-events-none"
      )}
      onPointerDown={(event) => onBosish(event, k, ustun)}
    >
      <button
        type="button"
        onClick={() => onOchish(k.id)}
        aria-busy={kutilmoqda || undefined}
        aria-label={`${t("kanban.karta.ochish")}: ${sarlavha}, ${mijoz}`}
        className={cn(
          "relative block w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-3 pl-3.5 text-left shadow-[0_4px_14px_rgba(15,23,42,0.05)] outline-none motion-safe:transition hover:border-orange-200 hover:shadow-[0_8px_22px_rgba(15,23,42,0.08)] focus-visible:ring-4 focus-visible:ring-orange-100",
          amallar.length > 0 && "pr-9",
          !bloklangan && "cursor-grab active:cursor-grabbing"
        )}
      >
        {/* Mavzuda Tailwind `orange` brend ko'kiga qayta belgilangan (index.css) — to'q sariq aniq rang bilan. */}
        {chiziq && <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", chiziq === "qizil" ? "bg-rose-500" : "bg-[#F97316]")} />}
        <span className="flex items-start justify-between gap-2">
          <span className={cn("truncate text-[13px] font-black", k.docNumber ? "text-slate-800" : "text-slate-500")}>{sarlavha}</span>
          <span className="shrink-0 text-[11px] font-semibold tabular-nums text-slate-400">{kunMatni(k.date)}</span>
        </span>
        <span className="mt-1 block truncate text-sm font-bold text-slate-700" title={mijoz}>{mijoz}</span>
        {k.responsible?.name && (
          <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-400">
            {t("kanban.karta.masul")}: {k.responsible.name}
          </span>
        )}
        <span className="mt-2 block">
          {k.priceIncomplete ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-amber-100">
              <CircleAlert size={12} aria-hidden />
              {t("kanban.karta.kursYoq")}
            </span>
          ) : (
            <span className="text-[15px] font-black tabular-nums text-slate-900">{pulniFormatlash(k.totalAmount, v)}</span>
          )}
          {tolovQatori && (
            <span className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] font-semibold tabular-nums text-slate-500">
              <span>{t("kanban.jami.tolangan")}: <b className="text-emerald-700">{pulniFormatlash(k.paidAmount, v)}</b></span>
              {summaBormi(k.debtAmount) && (
                <span>{t("kanban.jami.qarz")}: <b className="text-rose-600">{pulniFormatlash(k.debtAmount, v)}</b></span>
              )}
            </span>
          )}
        </span>
        <span className="mt-2 flex flex-wrap gap-1 text-[11px] font-bold">
          {k.itemsCount != null && (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-1.5 py-0.5 text-slate-500 ring-1 ring-slate-100">
              <Package size={11} aria-hidden />
              {t("kanban.karta.tovarlar", { soni: k.itemsCount })}
            </span>
          )}
          {k.dueDate && (
            <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 ring-1", k.overdue ? "bg-rose-50 text-rose-600 ring-rose-100" : "bg-slate-50 text-slate-500 ring-slate-100")}>
              <CalendarClock size={11} aria-hidden />
              {t("kanban.karta.muddat", { sana: kunMatni(k.dueDate) })}
              {k.overdue && <span className="sr-only">({t("kanban.karta.muddatiOtgan")})</span>}
            </span>
          )}
          {k.debtDays != null && k.debtDays > 0 && (
            <span className={cn("rounded-md px-1.5 py-0.5 ring-1", k.overdue ? "bg-rose-50 text-rose-600 ring-rose-100" : "bg-amber-50 text-amber-700 ring-amber-100")}>
              {t("kanban.karta.kunQarz", { soni: k.debtDays })}
            </span>
          )}
          {qoralama && k.draftDays != null && (
            <span className={cn("rounded-md px-1.5 py-0.5 ring-1", k.draftDays > 2 ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-slate-50 text-slate-500 ring-slate-100")}>
              {t("kanban.karta.kunQoralama", { soni: k.draftDays })}
            </span>
          )}
          {k.hasReturns && (
            <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-1.5 py-0.5 text-violet-600 ring-1 ring-violet-100">
              <Undo2 size={11} aria-hidden />
              {t("kanban.karta.qaytarishBor")}
            </span>
          )}
        </span>
        {kutilmoqda && (
          <span className="absolute inset-0 flex items-center justify-center gap-2 bg-white/75 text-xs font-black text-slate-600 backdrop-blur-[1px]">
            <LoaderCircle size={16} className="animate-spin" aria-hidden />
            {t("kanban.karta.bajarilmoqda")}
          </span>
        )}
      </button>

      {amallar.length > 0 && (
        <button
          ref={menyuTugmasi}
          type="button"
          data-kanban-menyu
          disabled={bloklangan}
          aria-label={t("kanban.karta.amallar")}
          aria-haspopup="menu"
          aria-expanded={Boolean(menyu)}
          onClick={menyuniOchish}
          className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 outline-none motion-safe:transition hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-4 focus-visible:ring-orange-100 disabled:opacity-40"
        >
          <Ellipsis size={16} aria-hidden />
        </button>
      )}

      {menyu &&
        createPortal(
          <div
            ref={menyuRef}
            role="menu"
            data-kanban-menyu
            style={menyu}
            className="z-[100010] rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_44px_rgba(15,23,42,.18)]"
          >
            {amallar.map(({ amal }) => {
              const Belgi = AMAL_BELGISI[amal];
              return (
                <button
                  key={amal}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenyu(null);
                    onAmal(amal, k);
                  }}
                  className={cn(
                    "flex min-h-9 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold outline-none focus-visible:bg-slate-100",
                    amal === "bekor" ? "text-rose-600 hover:bg-rose-50" : "text-slate-700 hover:bg-orange-50 hover:text-orange-600"
                  )}
                >
                  <Belgi size={15} aria-hidden />
                  {t(`kanban.amal.${amal}`)}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
});

function Skelet() {
  return (
    <div className="flex gap-3 overflow-hidden pb-3" aria-hidden>
      {TAXTA_USTUNLARI.map((key) => (
        <div key={key} className="w-[284px] shrink-0 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100 sm:w-[296px]">
          <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-12 animate-pulse rounded-lg bg-slate-200/70" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="mt-3 h-28 animate-pulse rounded-xl bg-white ring-1 ring-slate-100" />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function SotuvKanban({ qidiruv, omborlar, xodimlar, yangilanish, toxtatilgan, ruxsat, onKartochkaOchish, onAmal }: SotuvKanbanProps) {
  const { t } = useTranslation("savdo_bosh");

  // ---- Filtrlar (sana bo'sh: backend yopilgan/bekor qilinganlarni oxirgi 7 kun bilan ko'rsatadi) ----
  const [masul, setMasul] = useState("");
  const [ombor, setOmbor] = useState("");
  const [valyuta, setValyuta] = useState("");
  const [turi, setTuri] = useState("");
  const [muddatiOtgan, setMuddatiOtgan] = useState(false);
  const [sanaDan, setSanaDan] = useState("");
  const [sanaGacha, setSanaGacha] = useState("");
  const [qidiruvMatni, setQidiruvMatni] = useState(qidiruv.trim());

  useEffect(() => {
    const id = window.setTimeout(() => setQidiruvMatni(qidiruv.trim()), QIDIRUV_KECHIKISHI);
    return () => window.clearTimeout(id);
  }, [qidiruv]);

  const filtr = useMemo<TaxtaFiltri>(
    () => ({
      search: qidiruvMatni,
      responsibleId: masul,
      warehouseId: ombor,
      currency: valyuta,
      saleType: turi,
      overdue: muddatiOtgan,
      dateFrom: sanaDan,
      dateTo: sanaGacha,
    }),
    [qidiruvMatni, masul, ombor, valyuta, turi, muddatiOtgan, sanaDan, sanaGacha]
  );
  const filtrBormi = Boolean(masul || ombor || valyuta || turi || muddatiOtgan || sanaDan || sanaGacha);

  // ---- Taxta holati ----
  const [taxta, setTaxta] = useState<Taxta | null>(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [yangilanmoqda, setYangilanmoqda] = useState(false);
  const [xato, setXato] = useState<string | null>(null);
  const [bekorOchiq, setBekorOchiq] = useState(false);
  const [kutilayotgan, setKutilayotgan] = useState<string | null>(null);
  const [sudrash, setSudrash] = useState<Sudrash | null>(null);

  const taxtaRef = useRef<Taxta | null>(null);
  const filtrRef = useRef(filtr);
  const bekorOchiqRef = useRef(false);
  const kutilayotganRef = useRef<string | null>(null);
  const asosiyNazorat = useRef<AbortController | null>(null);
  const ustunNazoratlari = useRef(new Map<TaxtaKaliti, AbortController>());
  const oxirgiYangilash = useRef(0);
  const oxirgiSorov = useRef(0);
  const bosish = useRef<Bosish | null>(null);
  const oxirgiSudrash = useRef(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    taxtaRef.current = taxta;
  }, [taxta]);
  useEffect(() => {
    bekorOchiqRef.current = bekorOchiq;
  }, [bekorOchiq]);

  const ustunniYangilash = useCallback((key: TaxtaKaliti, qism: Partial<UstunHolati>) => {
    setTaxta((joriy) => {
      if (!joriy) return joriy;
      const yangi = { ...joriy, [key]: { ...joriy[key], ...qism } };
      taxtaRef.current = yangi;
      return yangi;
    });
  }, []);

  /**
   * Taxtani yuklash. `saqlash` — avtomatik/amal keyingi yangilash: har ustunda foydalanuvchi ochgan sahifalar soni
   * kursorlarni qayta yurib tiklanadi (ro'yxat boshiga sakramaydi). Filtr o'zgarsa — doim birinchi sahifadan.
   */
  const yuklash = useCallback(async (saqlash: boolean) => {
    const filtrNusxa = filtrRef.current;
    asosiyNazorat.current?.abort();
    ustunNazoratlari.current.forEach((n) => n.abort());
    ustunNazoratlari.current.clear();
    const nazorat = new AbortController();
    asosiyNazorat.current = nazorat;
    oxirgiYangilash.current = Date.now();
    const oldingi = taxtaRef.current;
    const bekor = bekorOchiqRef.current;
    if (saqlash) setYangilanmoqda(true);
    else setYuklanmoqda(true);

    const olish = async (sahifalarniSaqlash: boolean): Promise<Taxta> => {
      const ustunlar = await sotuvTaxtasiniOlish(filtrNusxa, nazorat.signal);
      const yangi = bosTaxta();
      await Promise.all(
        TAXTA_USTUNLARI.map(async (key) => {
          const manba = ustunlar.find((u) => u.key === key);
          const asos = { ...bosUstun(key), count: manba?.count ?? 0, totals: manba?.totals ?? [] };
          if (key === "cancelled" && !bekor) {
            yangi[key] = { ...asos, sahifalar: 0 };
            return;
          }
          const birinchi = key === "cancelled"
            ? await taxtaUstuniniOlish(key, filtrNusxa, null, nazorat.signal)
            : { items: manba?.items ?? [], nextCursor: manba?.nextCursor ?? null };
          const kerak = sahifalarniSaqlash && oldingi ? Math.max(1, oldingi[key].sahifalar) : 1;
          const natija = await sahifalarniQaytaYurish(birinchi, kerak, (cursor) => taxtaUstuniniOlish(key, filtrNusxa, cursor, nazorat.signal));
          yangi[key] = { ...asos, ...natija };
        })
      );
      return yangi;
    };

    try {
      let yangi: Taxta;
      try {
        yangi = await olish(saqlash);
      } catch (birinchiXato) {
        // Eskirgan kursor: barcha ustunlar birinchi sahifadan.
        if (!saqlash || nazorat.signal.aborted || xatoKodiniOlish(birinchiXato) !== TAXTA_KURSOR_XATOSI) throw birinchiXato;
        yangi = await olish(false);
      }
      if (nazorat.signal.aborted) return;
      // Yuklash paytida bosilgan "Yana yuklash" eski holatga tegishli — bekor qilinadi.
      ustunNazoratlari.current.forEach((n) => n.abort());
      ustunNazoratlari.current.clear();
      // Yuklash paytida "cancelled" yig'ilgan bo'lsa — kartochkalari tashlanadi (ochilgani effektda yuklanadi).
      if (!bekorOchiqRef.current && yangi.cancelled.sahifalar > 0) yangi.cancelled = { ...yangi.cancelled, items: [], nextCursor: null, sahifalar: 0 };
      taxtaRef.current = yangi;
      setTaxta(yangi);
      setXato(null);
    } catch (sabab) {
      if (nazorat.signal.aborted || axios.isCancel(sabab)) return;
      // Yangilash boshida bekor qilingan "Yana yuklash" lar aylanuvchisi abadiy qolmasin (taxta eski holicha qoladi).
      setTaxta((joriy) => {
        if (!joriy) return joriy;
        let ozgardi = false;
        const yangi = { ...joriy };
        for (const key of TAXTA_USTUNLARI) {
          if (yangi[key].yuklanmoqda && !ustunNazoratlari.current.has(key)) {
            yangi[key] = { ...yangi[key], yuklanmoqda: false };
            ozgardi = true;
          }
        }
        if (!ozgardi) return joriy;
        taxtaRef.current = yangi;
        return yangi;
      });
      setXato(getApiErrorMessage(sabab));
    } finally {
      if (asosiyNazorat.current === nazorat) {
        asosiyNazorat.current = null;
        setYuklanmoqda(false);
        setYangilanmoqda(false);
      }
    }
  }, []);

  // Amaldan keyin ham, ota `yangilanish` ni oshirganda ham chaqiriladi — ketma-ket ikki so'rov bittaga qisqaradi.
  const yangilashSorovi = useCallback(() => {
    if (Date.now() - oxirgiSorov.current < YANGILASH_TAKRORI_MS) return;
    oxirgiSorov.current = Date.now();
    void yuklash(true);
  }, [yuklash]);

  // Filtr o'zgarsa: qo'shimcha sahifalar tashlanadi, hammasi birinchi sahifadan.
  useEffect(() => {
    filtrRef.current = filtr;
    void yuklash(false);
  }, [filtr, yuklash]);

  const oldingiYangilanish = useRef(yangilanish);
  useEffect(() => {
    if (oldingiYangilanish.current === yangilanish) return;
    oldingiYangilanish.current = yangilanish;
    yangilashSorovi();
  }, [yangilanish, yangilashSorovi]);

  // Har 30 s (sahifa ko'rinib tursa, oyna ochiq emas, sudrash/amal/yuklash yo'q). Boshqa tabdan qaytilganda ham.
  useEffect(() => {
    if (toxtatilgan) return;
    const mumkinmi = () =>
      document.visibilityState === "visible" && !bosish.current && !kutilayotganRef.current && !asosiyNazorat.current && ustunNazoratlari.current.size === 0;
    const id = window.setInterval(() => {
      if (mumkinmi()) void yuklash(true);
    }, AVTO_YANGILASH_MS);
    const korinish = () => {
      if (mumkinmi() && Date.now() - oxirgiYangilash.current > AVTO_YANGILASH_MS) void yuklash(true);
    };
    document.addEventListener("visibilitychange", korinish);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", korinish);
    };
  }, [toxtatilgan, yuklash]);

  useEffect(() => {
    const nazoratlar = ustunNazoratlari.current;
    return () => {
      asosiyNazorat.current?.abort();
      nazoratlar.forEach((n) => n.abort());
    };
  }, []);

  /** Ustunda keyingi sahifa; yig'ilgan "cancelled" ochilganda — kursorsiz birinchi sahifa. Kursor o'zgartirilmaydi. */
  const yanaYuklash = useCallback(
    async (key: TaxtaKaliti) => {
      const ustun = taxtaRef.current?.[key];
      if (!ustun || ustun.yuklanmoqda) return;
      const birinchiSahifa = key === "cancelled" && ustun.sahifalar === 0;
      const cursor = birinchiSahifa ? null : ustun.nextCursor;
      if (!birinchiSahifa && !cursor) return;
      const filtrNusxa = filtrRef.current;
      ustunNazoratlari.current.get(key)?.abort();
      const nazorat = new AbortController();
      ustunNazoratlari.current.set(key, nazorat);
      ustunniYangilash(key, { yuklanmoqda: true, xato: null });
      try {
        const natija = await taxtaUstuniniOlish(key, filtrNusxa, cursor, nazorat.signal);
        if (nazorat.signal.aborted) return;
        setTaxta((joriy) => {
          if (!joriy) return joriy;
          const eski = joriy[key];
          const yangi = {
            ...joriy,
            [key]: {
              ...eski,
              items: birinchiSahifa ? natija.items : kartochkalarniQoshish(eski.items, natija.items),
              nextCursor: natija.nextCursor,
              sahifalar: (birinchiSahifa ? 0 : eski.sahifalar) + 1,
              yuklanmoqda: false,
            },
          };
          taxtaRef.current = yangi;
          return yangi;
        });
      } catch (sabab) {
        if (nazorat.signal.aborted || axios.isCancel(sabab)) return;
        if (xatoKodiniOlish(sabab) === TAXTA_KURSOR_XATOSI) {
          ustunniYangilash(key, { yuklanmoqda: false });
          void yuklash(false);
          return;
        }
        ustunniYangilash(key, { yuklanmoqda: false, xato: getApiErrorMessage(sabab) });
      } finally {
        if (ustunNazoratlari.current.get(key) === nazorat) ustunNazoratlari.current.delete(key);
      }
    },
    [ustunniYangilash, yuklash]
  );

  const bekorniOchish = useCallback(() => {
    bekorOchiqRef.current = true;
    setBekorOchiq(true);
  }, []);

  // Ochilgan "cancelled" hali yuklanmagan bo'lsa (bosilganda yoki taxta yuklanayotganda ochilganda) — birinchi sahifa.
  const bekorUstuni = taxta?.cancelled;
  useEffect(() => {
    if (!bekorOchiq || !bekorUstuni || bekorUstuni.sahifalar > 0 || bekorUstuni.yuklanmoqda || bekorUstuni.xato) return;
    void yanaYuklash("cancelled");
  }, [bekorOchiq, bekorUstuni, yanaYuklash]);

  const bekorniYigish = useCallback(() => {
    bekorOchiqRef.current = false;
    setBekorOchiq(false);
    ustunNazoratlari.current.get("cancelled")?.abort();
    ustunNazoratlari.current.delete("cancelled");
    ustunniYangilash("cancelled", { items: [], nextCursor: null, sahifalar: 0, yuklanmoqda: false, xato: null });
  }, [ustunniYangilash]);

  // ---- Amal (sudrash yoki menyu): kartochka joyida qoladi (optimistik ko'chirish yo'q), tugagach taxta qayta yuklanadi ----
  const amalniBajarish = useCallback(
    async (amal: TaxtaAmali, kartochka: TaxtaKartochkasi) => {
      if (kutilayotganRef.current) return;
      kutilayotganRef.current = kartochka.id;
      setKutilayotgan(kartochka.id);
      try {
        await onAmal(amal, kartochka);
      } catch {
        // Xatoni ota ko'rsatadi; kartochka o'z ustunida qoladi.
      } finally {
        kutilayotganRef.current = null;
        setKutilayotgan(null);
        yangilashSorovi();
      }
    },
    [onAmal, yangilashSorovi]
  );

  const kartochkaniOchish = useCallback(
    (id: string) => {
      // Sudrash tugagandagi "click" sotuvni ochmasin.
      if (Date.now() - oxirgiSudrash.current < 400) return;
      onKartochkaOchish(id);
    },
    [onKartochkaOchish]
  );

  const menyuAmali = useCallback((amal: TaxtaAmali, k: TaxtaKartochkasi) => void amalniBajarish(amal, k), [amalniBajarish]);

  // Oyna tinglovchilari bir marta ulanadi: eng so'nggi qiymatlar shu ref orqali o'qiladi.
  const joriy = useRef({ ruxsat, t, amalniBajarish });
  useEffect(() => {
    joriy.current = { ruxsat, t, amalniBajarish };
  }, [ruxsat, t, amalniBajarish]);

  // ---- Sudrash (Pointer Events): sichqoncha ~6 px dan keyin, barmoq/qalam ~350 ms bosib turgandan keyin ----
  const bosishBoshlash = useRef<((event: ReactPointerEvent<HTMLElement>, k: TaxtaKartochkasi, ustun: TaxtaKaliti) => void) | null>(null);

  useEffect(() => {
    let kadrId = 0;
    let oldingiTanlash = "";

    const ustunTopish = (x: number, y: number): TaxtaKaliti | null => {
      const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-taxta-ustun]");
      const kalit = el?.dataset.taxtaUstun;
      return kalit && (TAXTA_USTUNLARI as readonly string[]).includes(kalit) ? (kalit as TaxtaKaliti) : null;
    };

    const kadr = () => {
      const b = bosish.current;
      if (!b?.faol) return;
      if (ghostRef.current) ghostRef.current.style.transform = `translate3d(${b.x - b.ofsetX}px, ${b.y - b.ofsetY}px, 0) rotate(2deg)`;
      // Chetga yaqinlashganda taxta gorizontal, ustun ro'yxati tik aylanadi (telefonda boshqa ustunga yetish uchun).
      const scroller = scrollerRef.current;
      if (scroller) {
        const r = scroller.getBoundingClientRect();
        if (b.x < r.left + CHET) scroller.scrollLeft -= Math.ceil((r.left + CHET - b.x) / 4);
        else if (b.x > r.right - CHET) scroller.scrollLeft += Math.ceil((b.x - (r.right - CHET)) / 4);
      }
      const royxat = document.elementFromPoint(b.x, b.y)?.closest<HTMLElement>("[data-taxta-royxat]");
      if (royxat) {
        const r = royxat.getBoundingClientRect();
        if (b.y < r.top + 40) royxat.scrollTop -= Math.ceil((r.top + 40 - b.y) / 4);
        else if (b.y > r.bottom - 40) royxat.scrollTop += Math.ceil((b.y - (r.bottom - 40)) / 4);
      }
      const ustida = ustunTopish(b.x, b.y);
      if (ustida !== b.ustida) {
        b.ustida = ustida;
        setSudrash((s) => (s ? { ...s, ustida } : s));
      }
      kadrId = window.requestAnimationFrame(kadr);
    };

    const tugatish = () => {
      const b = bosish.current;
      if (!b) return;
      if (b.taymer) window.clearTimeout(b.taymer);
      window.cancelAnimationFrame(kadrId);
      if (b.faol) {
        oxirgiSudrash.current = Date.now();
        document.body.style.userSelect = oldingiTanlash;
        try {
          if (b.el.hasPointerCapture(b.pointerId)) b.el.releasePointerCapture(b.pointerId);
        } catch {
          // ko'rsatkich allaqachon qo'yib yuborilgan
        }
        setSudrash(null);
      }
      bosish.current = null;
    };

    const faollashtirish = () => {
      const b = bosish.current;
      if (!b || b.faol) return;
      b.faol = true;
      b.taymer = null;
      b.ustida = b.qayerdan;
      oldingiTanlash = document.body.style.userSelect;
      document.body.style.userSelect = "none";
      window.getSelection?.()?.removeAllRanges();
      if (b.turi === "mouse") {
        try {
          b.el.setPointerCapture(b.pointerId);
        } catch {
          // ba'zi brauzerlarda capture bo'lmasligi mumkin — oyna tinglovchilari yetadi
        }
      } else {
        try {
          navigator.vibrate?.(12);
        } catch {
          // tebranish yo'q
        }
      }
      setSudrash({ kartochka: b.kartochka, qayerdan: b.qayerdan, ustida: b.qayerdan, eni: b.eni, x: b.x - b.ofsetX, y: b.y - b.ofsetY });
      kadrId = window.requestAnimationFrame(kadr);
    };

    const tashlash = () => {
      const b = bosish.current;
      if (!b) return;
      const qayerga = ustunTopish(b.x, b.y) ?? b.ustida;
      const { kartochka, qayerdan } = b;
      tugatish();
      if (!qayerga || qayerga === qayerdan) return;
      const { ruxsat: r, t: tarjima, amalniBajarish: bajarish } = joriy.current;
      const amal = taxtaAmali(qayerdan, qayerga, r);
      if (amal) {
        void bajarish(amal, kartochka);
        return;
      }
      const sabab = taxtaRadSababi(qayerdan, qayerga, r);
      if (sabab) ogohlantirishXabari(tarjima(`kanban.sudrash.sababi.${sabab}`));
    };

    bosishBoshlash.current = (event, kartochka, ustun) => {
      if (bosish.current || kutilayotganRef.current || !event.isPrimary) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if ((event.target as Element | null)?.closest("[data-kanban-menyu]")) return;
      const el = event.currentTarget;
      const r = el.getBoundingClientRect();
      bosish.current = {
        pointerId: event.pointerId,
        turi: event.pointerType,
        el,
        kartochka,
        qayerdan: ustun,
        x0: event.clientX,
        y0: event.clientY,
        x: event.clientX,
        y: event.clientY,
        ofsetX: event.clientX - r.left,
        ofsetY: event.clientY - r.top,
        eni: r.width,
        faol: false,
        taymer: event.pointerType === "mouse" ? null : window.setTimeout(faollashtirish, BOSIB_TURISH_MS),
        ustida: null,
      };
    };

    const harakat = (event: PointerEvent) => {
      const b = bosish.current;
      if (!b || event.pointerId !== b.pointerId) return;
      b.x = event.clientX;
      b.y = event.clientY;
      if (b.faol) return;
      const masofa = Math.hypot(b.x - b.x0, b.y - b.y0);
      if (b.turi === "mouse") {
        if (masofa >= SICHQONCHA_MASOFASI) faollashtirish();
      } else if (masofa > BARMOQ_TOLERANSI) {
        // Bosib turishdan oldin siljidi — bu oddiy aylantirish.
        tugatish();
      }
    };
    const qoyish = (event: PointerEvent) => {
      const b = bosish.current;
      if (!b || event.pointerId !== b.pointerId) return;
      if (b.faol) tashlash();
      else tugatish();
    };
    const bekor = (event: PointerEvent) => {
      if (bosish.current && event.pointerId === bosish.current.pointerId) tugatish();
    };
    const klavish = (event: KeyboardEvent) => {
      if (event.key === "Escape" && bosish.current?.faol) {
        event.preventDefault();
        event.stopPropagation();
        tugatish();
      }
    };
    // Sudrash faol bo'lganda barmoq sahifani aylantirmasin (pointercancel bo'lmasin). Tinglovchi doim ulangan bo'lishi kerak.
    const barmoqHarakati = (event: TouchEvent) => {
      if (bosish.current?.faol) event.preventDefault();
    };
    // Planshetda bosib turish — sudrash: brauzerning kontekst menyusi chiqmasin.
    const kontekst = (event: Event) => {
      if (bosish.current && bosish.current.turi !== "mouse") event.preventDefault();
    };
    const yoqolish = () => {
      if (document.visibilityState !== "visible") tugatish();
    };

    const root = rootRef.current;
    window.addEventListener("pointermove", harakat);
    window.addEventListener("pointerup", qoyish);
    window.addEventListener("pointercancel", bekor);
    window.addEventListener("keydown", klavish, true);
    window.addEventListener("blur", tugatish);
    window.addEventListener("contextmenu", kontekst);
    document.addEventListener("visibilitychange", yoqolish);
    root?.addEventListener("touchmove", barmoqHarakati, { passive: false });
    return () => {
      tugatish();
      bosishBoshlash.current = null;
      window.removeEventListener("pointermove", harakat);
      window.removeEventListener("pointerup", qoyish);
      window.removeEventListener("pointercancel", bekor);
      window.removeEventListener("keydown", klavish, true);
      window.removeEventListener("blur", tugatish);
      window.removeEventListener("contextmenu", kontekst);
      document.removeEventListener("visibilitychange", yoqolish);
      root?.removeEventListener("touchmove", barmoqHarakati);
    };
  }, []);

  const bloklangan = Boolean(kutilayotgan) || (yuklanmoqda && Boolean(taxta));
  const kartochkaBosildi = useCallback(
    (event: ReactPointerEvent<HTMLElement>, k: TaxtaKartochkasi, ustun: TaxtaKaliti) => {
      if (bloklangan) return;
      bosishBoshlash.current?.(event, k, ustun);
    },
    [bloklangan]
  );

  // ---- Filtr variantlari ----
  const masulVariantlari = useMemo(
    () => [{ value: "", label: t("kanban.filtr.masulBarchasi") }, ...xodimlar.map((x) => ({ value: x.id, label: nomliNom(x) }))],
    [xodimlar, t]
  );
  const omborVariantlari = useMemo(
    () => [{ value: "", label: t("kanban.filtr.omborBarchasi") }, ...omborlar.map((o) => ({ value: o.id, label: nomliNom(o) }))],
    [omborlar, t]
  );
  const valyutaVariantlari = useMemo(
    () => [
      { value: "", label: t("kanban.filtr.valyutaBarchasi") },
      { value: "UZS", label: "UZS" },
      { value: "USD", label: "USD" },
    ],
    [t]
  );
  const turiVariantlari = useMemo(
    () => [
      { value: "", label: t("kanban.filtr.turiBarchasi") },
      { value: "QUICK", label: t("kanban.filtr.turiQuick") },
      { value: "CLIENT", label: t("kanban.filtr.turiClient") },
    ],
    [t]
  );
  const selectSinfi = "h-10 rounded-xl border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50";

  function filtrlarniTozalash() {
    setMasul("");
    setOmbor("");
    setValyuta("");
    setTuri("");
    setMuddatiOtgan(false);
    setSanaDan("");
    setSanaGacha("");
  }

  const sudrashAmali = sudrash && sudrash.ustida && sudrash.ustida !== sudrash.qayerdan ? taxtaAmali(sudrash.qayerdan, sudrash.ustida, ruxsat) : null;

  return (
    <div ref={rootRef} className="px-5 pb-6 sm:px-10" aria-label={t("kanban.taxta")}>
      {/* Taxtaning o'z filtrlari (qidiruv sahifa bilan umumiy) */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <div className="col-span-2 sm:w-[200px]">
          <SavdoSelect value={masul} onChange={setMasul} options={masulVariantlari} portal qidirish={xodimlar.length > 8} buttonClassName={selectSinfi} />
        </div>
        <div className="col-span-2 sm:w-[190px]">
          <SavdoSelect value={ombor} onChange={setOmbor} options={omborVariantlari} portal buttonClassName={selectSinfi} />
        </div>
        <div className="sm:w-[160px]">
          <SavdoSelect value={valyuta} onChange={setValyuta} options={valyutaVariantlari} portal buttonClassName={selectSinfi} />
        </div>
        <div className="sm:w-[170px]">
          <SavdoSelect value={turi} onChange={setTuri} options={turiVariantlari} portal buttonClassName={selectSinfi} />
        </div>
        <button
          type="button"
          aria-pressed={muddatiOtgan}
          onClick={() => setMuddatiOtgan((q) => !q)}
          className={cn(
            "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-semibold shadow-sm outline-none motion-safe:transition focus-visible:ring-4 focus-visible:ring-rose-100",
            muddatiOtgan ? "border-rose-300 bg-rose-50 text-rose-700" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          )}
        >
          <CalendarClock size={15} aria-hidden />
          {t("kanban.filtr.muddatiOtgan")}
        </button>
        <div className="col-span-2 sm:w-[230px]">
          <DateRangePicker
            from={sanaDan}
            to={sanaGacha}
            onChange={(dan, gacha) => {
              setSanaDan(dan);
              setSanaGacha(gacha);
            }}
            compact
          />
        </div>
        {filtrBormi && (
          <button
            type="button"
            onClick={filtrlarniTozalash}
            className="col-span-2 inline-flex h-10 items-center justify-center gap-1 rounded-xl px-3 text-sm font-bold text-slate-500 outline-none motion-safe:transition hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-4 focus-visible:ring-orange-100 sm:col-span-1"
          >
            <X size={15} aria-hidden />
            {t("kanban.filtr.tozalash")}
          </button>
        )}
        <button
          type="button"
          onClick={() => void yuklash(true)}
          disabled={yuklanmoqda || yangilanmoqda}
          aria-label={t("kanban.yangilash")}
          title={t("kanban.yangilash")}
          className="col-span-2 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-bold text-slate-500 outline-none motion-safe:transition hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-4 focus-visible:ring-orange-100 disabled:opacity-60 sm:col-span-1 sm:ml-auto"
        >
          <RefreshCw size={15} className={cn((yuklanmoqda || yangilanmoqda) && "animate-spin")} aria-hidden />
          <span className="sm:sr-only">{t("kanban.yangilash")}</span>
        </button>
      </div>
      <p className="mt-2 text-xs font-medium text-slate-400">
        {t("kanban.filtr.sanaIzohi")} <span className="hidden sm:inline">{t("kanban.sudrash.yordam")}</span>
      </p>

      {xato && taxta && (
        <div role="status" className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 ring-1 ring-amber-100">
          <CircleAlert size={16} className="shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">{t("kanban.yangilashXatosi")} {xato}</span>
          <button type="button" onClick={() => void yuklash(true)} className="rounded-lg px-2 py-1 font-black text-amber-900 hover:bg-amber-100">
            {t("kanban.qaytaUrinish")}
          </button>
        </div>
      )}

      <div className="mt-4">
        {!taxta && xato ? (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl bg-rose-50 p-5 text-sm text-rose-700 ring-1 ring-rose-100 sm:flex-row sm:items-center">
            <CircleAlert size={20} className="shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-black">{t("kanban.xato")}</p>
              <p className="mt-0.5">{xato}</p>
            </div>
            <button
              type="button"
              onClick={() => void yuklash(false)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 font-bold text-rose-700 shadow-sm ring-1 ring-rose-200 hover:bg-rose-100"
            >
              <RefreshCw size={14} aria-hidden />
              {t("kanban.qaytaUrinish")}
            </button>
          </div>
        ) : !taxta ? (
          <Skelet />
        ) : (
          <div
            ref={scrollerRef}
            className={cn("flex gap-3 overflow-x-auto overscroll-x-contain pb-3", yuklanmoqda && "opacity-60")}
            aria-busy={yuklanmoqda || undefined}
          >
            {TAXTA_USTUNLARI.map((key) => {
              const ustun = taxta[key];
              const yigilgan = key === "cancelled" && !bekorOchiq;
              const nishonHolati = !sudrash ? null : key === sudrash.qayerdan ? "manba" : taxtaAmali(sudrash.qayerdan, key, ruxsat) ? "mumkin" : "mumkinEmas";
              const ustida = sudrash?.ustida === key;
              return (
                <section
                  key={key}
                  data-taxta-ustun={key}
                  aria-label={t(`kanban.ustunlar.${key}`)}
                  className={cn(
                    "flex w-[284px] shrink-0 flex-col rounded-2xl bg-slate-50/80 ring-1 ring-slate-100 motion-safe:transition sm:w-[296px] 2xl:w-auto 2xl:min-w-[260px] 2xl:flex-1",
                    nishonHolati === "manba" && "outline-2 outline-dashed outline-slate-300",
                    nishonHolati === "mumkin" && (ustida ? "bg-emerald-100/70 ring-2 ring-emerald-500" : "bg-emerald-50/70 ring-2 ring-emerald-300"),
                    nishonHolati === "mumkinEmas" && (ustida ? "bg-rose-50/70 opacity-70 ring-2 ring-rose-300" : "opacity-50")
                  )}
                >
                  <header className="border-b border-slate-100 p-3">
                    <div className="flex items-center gap-2">
                      <span aria-hidden className={cn("h-2.5 w-2.5 shrink-0 rounded-full", USTUN_RANGI[key])} />
                      <h2 className="min-w-0 flex-1 truncate text-sm font-black text-slate-800">{t(`kanban.ustunlar.${key}`)}</h2>
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-2 text-xs font-black tabular-nums text-slate-600 ring-1 ring-slate-200">
                        {ustun.count}
                      </span>
                      {key === "cancelled" && (
                        <button
                          type="button"
                          onClick={yigilgan ? bekorniOchish : bekorniYigish}
                          aria-expanded={!yigilgan}
                          className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-bold text-slate-500 outline-none hover:bg-white hover:text-slate-800 focus-visible:ring-4 focus-visible:ring-orange-100"
                        >
                          {yigilgan ? <Eye size={13} aria-hidden /> : <EyeOff size={13} aria-hidden />}
                          {yigilgan ? t("kanban.korsatish") : t("kanban.yigish")}
                        </button>
                      )}
                    </div>
                    <div className="mt-2">
                      <UstunJamilari totals={ustun.totals} t={t} />
                    </div>
                  </header>

                  {!yigilgan && (
                    <div data-taxta-royxat className="flex max-h-[min(70vh,720px)] min-h-[120px] flex-col gap-2 overflow-y-auto overscroll-y-contain p-2">
                      {ustun.items.map((k) => (
                        <KanbanKartochkasi
                          key={k.id}
                          kartochka={k}
                          ustun={key}
                          amalRuxsati={ruxsat.amal}
                          bekorRuxsati={ruxsat.bekor}
                          kutilmoqda={kutilayotgan === k.id}
                          bloklangan={bloklangan}
                          sudralmoqda={sudrash?.kartochka.id === k.id}
                          t={t}
                          onOchish={kartochkaniOchish}
                          onBosish={kartochkaBosildi}
                          onAmal={menyuAmali}
                        />
                      ))}
                      {ustun.items.length === 0 && !ustun.yuklanmoqda && !ustun.xato && (
                        <p className="py-6 text-center text-xs font-semibold text-slate-400">{t("kanban.bosh")}</p>
                      )}
                      {ustun.yuklanmoqda && (
                        <p className="flex items-center justify-center gap-2 py-3 text-xs font-bold text-slate-500">
                          <LoaderCircle size={14} className="animate-spin" aria-hidden />
                          {t("kanban.yuklanmoqda")}
                        </p>
                      )}
                      {ustun.xato && (
                        <div className="rounded-lg bg-rose-50 p-2 text-xs font-semibold text-rose-700 ring-1 ring-rose-100">
                          <p>{ustun.xato}</p>
                          <button type="button" onClick={() => void yanaYuklash(key)} className="mt-1 font-black underline-offset-2 hover:underline">
                            {t("kanban.qaytaUrinish")}
                          </button>
                        </div>
                      )}
                      {ustun.nextCursor && !ustun.yuklanmoqda && !ustun.xato && (
                        <button
                          type="button"
                          onClick={() => void yanaYuklash(key)}
                          className="h-9 shrink-0 rounded-xl bg-white text-xs font-black text-slate-600 shadow-sm ring-1 ring-slate-200 outline-none hover:bg-slate-100 focus-visible:ring-4 focus-visible:ring-orange-100"
                        >
                          {t("kanban.yanaYuklash", { soni: ustun.items.length, jami: ustun.count })}
                        </button>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      {sudrash &&
        createPortal(
          <div
            ref={ghostRef}
            aria-hidden
            className="pointer-events-none fixed left-0 top-0 z-[100020] rounded-xl border border-slate-200 bg-white p-3 shadow-[0_24px_60px_rgba(15,23,42,.28)]"
            style={{ width: sudrash.eni, transform: `translate3d(${sudrash.x}px, ${sudrash.y}px, 0) rotate(2deg)` }}
          >
            <p className="truncate text-[13px] font-black text-slate-800">{sudrash.kartochka.docNumber?.trim() || t("kanban.karta.qoralama")}</p>
            <p className="mt-0.5 truncate text-sm font-bold text-slate-600">{taxtaMijozi(sudrash.kartochka) || t("kanban.karta.donalik")}</p>
            <p className="mt-1 text-sm font-black tabular-nums text-slate-900">
              {sudrash.kartochka.priceIncomplete ? t("kanban.karta.kursYoq") : pulniFormatlash(sudrash.kartochka.totalAmount, valyutaKodi(sudrash.kartochka.currency))}
            </p>
            {sudrash.ustida && sudrash.ustida !== sudrash.qayerdan && (
              <p className={cn("mt-2 inline-flex rounded-md px-2 py-0.5 text-[11px] font-black", sudrashAmali ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600")}>
                {sudrashAmali ? t(`kanban.amal.${sudrashAmali}`) : t("kanban.sudrash.mumkinEmas")}
              </p>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
