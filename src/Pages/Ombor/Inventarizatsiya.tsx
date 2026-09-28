import AppSelect from "@/Components/ui/AppSelect";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, CheckCircle2, CircleX, ClipboardList, Clock3, FileText, Filter, LoaderCircle, MessageSquareText, Package, Plus, Search, Settings, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import AppModal from "@/Components/common/AppModal";
import { useOmborStore } from "@/store/omborStore";
import type { InventarizatsiyaTuri, OmborQoldigi } from "@/types/ombor";
import { holat, hujjatRaqami, modificationNomi, qoldiqMiqdori, sana } from "./omborYordamchilari";
import InventoryHujjatModal from "./InventoryHujjatModal";
import OmborJadval from "./OmborJadval";
import TablePagination from "@/Components/common/TablePagination";

type InventarizatsiyaUstuni = "nomi" | "status" | "yaratilgan" | "ombor" | "masul" | "turi";

const INVENTARIZATSIYA_USTUNLARI: Array<{ id: InventarizatsiyaUstuni; nom: string }> = [
  { id: "nomi", nom: "inventarizatsiya.columns.nomi" },
  { id: "status", nom: "inventarizatsiya.columns.status" },
  { id: "yaratilgan", nom: "inventarizatsiya.columns.yaratilgan" },
  { id: "ombor", nom: "inventarizatsiya.columns.ombor" },
  { id: "masul", nom: "inventarizatsiya.columns.masul" },
  { id: "turi", nom: "inventarizatsiya.columns.turi" },
];

type FormaXatosi = { key: string; params?: Record<string, string | number> } | null;

const INVENTORY_BLUE_THEME = {
  "--color-blue-50": "#EFF6FF",
  "--color-blue-100": "#DBEAFE",
  "--color-blue-200": "#BFDBFE",
  "--color-blue-300": "#93C5FD",
  "--color-blue-400": "#60A5FA",
  "--color-blue-500": "#3B82F6",
  "--color-blue-600": "#2563EB",
  "--color-blue-700": "#1D4ED8",
  "--color-blue-800": "#1E40AF",
} as CSSProperties;

export default function Inventarizatsiya() {
  const { t } = useTranslation("ombor_harakat");
  const store = useOmborStore();
  const malumotlarniYuklashAgarKerak = store.malumotlarniYuklashAgarKerak;
  const [modal, setModal] = useState(false);
  const [tanlanganId, setTanlanganId] = useState<string | null>(null);
  const [warehouseId, setWarehouseId] = useState("");
  const [type, setType] = useState<InventarizatsiyaTuri>("FULL");
  const [responsibleId, setResponsibleId] = useState("");
  const [actuals, setActuals] = useState<Record<string, string>>({});
  const [tanlanganModifikatsiyaIds, setTanlanganModifikatsiyaIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [formaXatosi, setFormaXatosi] = useState<FormaXatosi>(null);
  const [qoldiqYuklanmoqda, setQoldiqYuklanmoqda] = useState(false);
  const [qidiruv, setQidiruv] = useState("");
  const [sanaDan, setSanaDan] = useState("");
  const [sanaGacha, setSanaGacha] = useState("");
  const [holatFiltri, setHolatFiltri] = useState("ALL");
  const [omborFiltri, setOmborFiltri] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [ustunlarMenyusi, setUstunlarMenyusi] = useState(false);
  const [korinadiganUstunlar, setKorinadiganUstunlar] = useState<Set<InventarizatsiyaUstuni>>(
    () => new Set(INVENTARIZATSIYA_USTUNLARI.map((ustun) => ustun.id))
  );
  const [sozlamaJoylashuvi, setSozlamaJoylashuvi] = useState({ top: 0, left: 0 });
  const sozlamaTugmaRef = useRef<HTMLButtonElement | null>(null);
  const sozlamaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void malumotlarniYuklashAgarKerak();
  }, [malumotlarniYuklashAgarKerak]);

  const sozlamaJoylashuviniYangilash = useCallback(() => {
    const rect = sozlamaTugmaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menyuKengligi = 256;
    const menyuBalandligi = 330;
    const left = Math.min(window.innerWidth - menyuKengligi - 12, Math.max(12, rect.right - menyuKengligi));
    const pastgaTop = rect.bottom + 8;
    const top = pastgaTop + menyuBalandligi <= window.innerHeight - 12
      ? pastgaTop
      : Math.max(12, rect.top - menyuBalandligi - 8);
    setSozlamaJoylashuvi({ top, left });
  }, []);

  useEffect(() => {
    if (!ustunlarMenyusi) return;
    function tashqarigaBosish(event: MouseEvent) {
      const target = event.target as Node;
      if (!sozlamaRef.current?.contains(target) && !sozlamaTugmaRef.current?.contains(target)) {
        setUstunlarMenyusi(false);
      }
    }
    sozlamaJoylashuviniYangilash();
    document.addEventListener("mousedown", tashqarigaBosish);
    window.addEventListener("resize", sozlamaJoylashuviniYangilash);
    window.addEventListener("scroll", sozlamaJoylashuviniYangilash, true);
    return () => {
      document.removeEventListener("mousedown", tashqarigaBosish);
      window.removeEventListener("resize", sozlamaJoylashuviniYangilash);
      window.removeEventListener("scroll", sozlamaJoylashuviniYangilash, true);
    };
  }, [sozlamaJoylashuviniYangilash, ustunlarMenyusi]);

  const omborMap = useMemo(
    () => new Map(store.omborlar.map((ombor) => [ombor.id, ombor.name])),
    [store.omborlar]
  );
  const xodimMap = useMemo(
    () => new Map(store.xodimlar.map((xodim) => [xodim.id, xodim])),
    [store.xodimlar]
  );

  const qoldiqlar = useMemo(
    () =>
      store.qoldiqlar.filter(
        (qoldiq) =>
          Boolean(warehouseId) &&
          (qoldiq.warehouseId === warehouseId || qoldiq.warehouse?.id === warehouseId)
      ),
    [store.qoldiqlar, warehouseId]
  );
  // PARTIAL turida omborda hali hech qachon qoldig'i bo'lmagan (Kirim qilinmagan)
  // mahsulotlarni ham tanlash mumkin — boshlang'ich qoldiqni Kirimsiz kiritish uchun.
  // Tizimdagi qoldig'i 0 deb ko'rsatiladi, chunki stock-balance'da hali yozuvi yo'q.
  const barchaTanlovlar: OmborQoldigi[] = useMemo(() => {
    if (!warehouseId) return qoldiqlar;
    const qoldiqByModification = new Map(qoldiqlar.map((qoldiq) => [qoldiq.modificationId, qoldiq]));
    const yangilari: OmborQoldigi[] = store.modifikatsiyalar
      .filter((modifikatsiya) => !qoldiqByModification.has(modifikatsiya.id))
      .map((modifikatsiya) => ({
        modificationId: modifikatsiya.id,
        warehouseId,
        availableQuantity: 0,
        modification: modifikatsiya,
      }));
    return [...qoldiqlar, ...yangilari];
  }, [qoldiqlar, store.modifikatsiyalar, warehouseId]);

  const inventarizatsiyaQatorlari = useMemo(() => {
    if (type === "FULL") return qoldiqlar;
    const tanlovByModification = new Map(barchaTanlovlar.map((qoldiq) => [qoldiq.modificationId, qoldiq]));
    return tanlanganModifikatsiyaIds
      .map((modificationId) => tanlovByModification.get(modificationId))
      .filter((qoldiq): qoldiq is (typeof qoldiqlar)[number] => Boolean(qoldiq));
  }, [barchaTanlovlar, qoldiqlar, tanlanganModifikatsiyaIds, type]);

  const inventarizatsiyaStatistikasi = useMemo(() => {
    const jami = store.inventarizatsiyalar.length;
    const tugallangan = store.inventarizatsiyalar.filter((item) => String(item.status ?? "").toUpperCase() === "CONFIRMED").length;
    const bekorQilingan = store.inventarizatsiyalar.filter((item) => ["CANCELLED", "CANCELED"].includes(String(item.status ?? "").toUpperCase())).length;
    const jarayonda = store.inventarizatsiyalar.filter((item) => !["CONFIRMED", "CANCELLED", "CANCELED"].includes(String(item.status ?? "").toUpperCase())).length;
    return { jami, tugallangan, jarayonda, bekorQilingan };
  }, [store.inventarizatsiyalar]);

  const korinadiganHujjatlar = useMemo(() => {
    const query = qidiruv.trim().toLowerCase();
    return store.inventarizatsiyalar.filter((item) => {
      const masul = item.responsible ?? (item.responsibleId ? xodimMap.get(item.responsibleId) : undefined);
      const matnMos = !query || [
        hujjatRaqami(item),
        item.warehouse?.name ?? omborMap.get(item.warehouseId),
        masul?.fullName ?? masul?.username ?? masul?.name,
        holat(item.status),
        item.type === "PARTIAL" ? t("inventarizatsiya.typePartial") : t("inventarizatsiya.typeFull"),
        sana(item.createdAt),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
      const status = String(item.status ?? "DRAFT").toUpperCase();
      const createdAt = item.createdAt ? new Date(item.createdAt) : null;
      const hujjatSanasi = createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt.toISOString().slice(0, 10) : "";
      return matnMos &&
        (holatFiltri === "ALL" || status === holatFiltri || (holatFiltri === "CANCELLED" && status === "CANCELED")) &&
        (omborFiltri === "ALL" || item.warehouseId === omborFiltri) &&
        (!sanaDan || Boolean(hujjatSanasi && hujjatSanasi >= sanaDan)) &&
        (!sanaGacha || Boolean(hujjatSanasi && hujjatSanasi <= sanaGacha));
    });
  }, [holatFiltri, omborFiltri, omborMap, qidiruv, sanaDan, sanaGacha, store.inventarizatsiyalar, t, xodimMap]);
  const sahifadagiHujjatlar = useMemo(() => korinadiganHujjatlar.slice((page - 1) * pageSize, page * pageSize), [korinadiganHujjatlar, page, pageSize]);
  useEffect(() => setPage(1), [korinadiganHujjatlar, pageSize]);

  const faolUstunlar = INVENTARIZATSIYA_USTUNLARI.filter((ustun) => korinadiganUstunlar.has(ustun.id));

  function ustunniAlmashtirish(id: InventarizatsiyaUstuni) {
    setKorinadiganUstunlar((oldingi) => {
      const keyingi = new Set(oldingi);
      if (keyingi.has(id)) {
        if (keyingi.size > 1) keyingi.delete(id);
      } else {
        keyingi.add(id);
      }
      return keyingi;
    });
  }

  function jadvalKatagi(item: (typeof store.inventarizatsiyalar)[number], ustun: InventarizatsiyaUstuni): ReactNode {
    const status = String(item.status ?? "DRAFT").toUpperCase();
    const masul = item.responsible ?? (item.responsibleId ? xodimMap.get(item.responsibleId) : undefined);
    if (ustun === "nomi") return <span className="font-black text-slate-900">{hujjatRaqami(item)}</span>;
    if (ustun === "status") {
      return (
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
          status === "CONFIRMED"
            ? "bg-emerald-50 text-emerald-600"
            : status === "CANCELLED" || status === "CANCELED"
              ? "bg-red-50 text-red-500"
              : "bg-slate-100 text-slate-500"
        }`}>
          {holat(item.status)}
        </span>
      );
    }
    if (ustun === "yaratilgan") return <span className="whitespace-nowrap">{sana(item.createdAt)}</span>;
    if (ustun === "ombor") return item.warehouse?.name ?? omborMap.get(item.warehouseId) ?? t("inventarizatsiya.unknownWarehouse");
    if (ustun === "masul") return masul?.fullName ?? masul?.username ?? masul?.name ?? t("inventarizatsiya.unassigned");
    return item.type === "PARTIAL" ? t("inventarizatsiya.typePartial") : t("inventarizatsiya.typeFull");
  }

  function formaniOchish() {
    store.xatolikniTozalash();
    setWarehouseId("");
    setType("FULL");
    setResponsibleId("");
    setActuals({});
    setTanlanganModifikatsiyaIds([]);
    setNote("");
    setFormaXatosi(null);
    setModal(true);
  }

  function formaniYopish() {
    if (store.amalBajarilmoqda) return;
    setModal(false);
    setFormaXatosi(null);
    store.xatolikniTozalash();
  }

  async function omborTanlash(id: string) {
    setWarehouseId(id);
    setActuals({});
    setTanlanganModifikatsiyaIds([]);
    setFormaXatosi(null);
    store.xatolikniTozalash();
    if (!id) return;

    setQoldiqYuklanmoqda(true);
    await store.qoldiqlarniYuklash(id);
    setQoldiqYuklanmoqda(false);
  }

  async function yaratish(tasdiqlash = false) {
    setFormaXatosi(null);
    store.xatolikniTozalash();
    if (!warehouseId) {
      setFormaXatosi({ key: "inventarizatsiya.createModal.errors.selectWarehouse" });
      return;
    }
    if (type === "FULL" && qoldiqlar.length === 0) {
      setFormaXatosi({ key: "inventarizatsiya.createModal.errors.noStockInWarehouse" });
      return;
    }
    if (inventarizatsiyaQatorlari.length === 0) {
      setFormaXatosi({ key: "inventarizatsiya.createModal.errors.selectAtLeastOne" });
      return;
    }

    const itemMap = new Map<string, { modificationId: string; actualQuantity: number }>();
    for (const qoldiq of inventarizatsiyaQatorlari) {
      const kiritilgan = actuals[qoldiq.modificationId];
      const actualQuantity = kiritilgan == null ? qoldiqMiqdori(qoldiq) : Number(kiritilgan);
      if (!Number.isFinite(actualQuantity) || actualQuantity < 0) {
        setFormaXatosi({
          key: "inventarizatsiya.createModal.errors.invalidQuantity",
          params: { name: modificationNomi(qoldiq.modification) },
        });
        return;
      }
      itemMap.set(qoldiq.modificationId, {
        modificationId: qoldiq.modificationId,
        actualQuantity,
      });
    }

    const hujjat = await store.inventarizatsiyaYaratish({
      warehouseId,
      type,
      responsibleId: responsibleId || undefined,
      note: note.trim() || undefined,
      items: Array.from(itemMap.values()),
    });
    if (!hujjat) return;

    if (tasdiqlash) {
      const tasdiqlandi = await store.inventarizatsiyaTasdiqlash(hujjat.id);
      if (!tasdiqlandi) {
        setModal(false);
        return;
      }
    }

    setModal(false);
    setWarehouseId("");
    setActuals({});
    setNote("");
  }

  return (
    <div className="space-y-5" style={INVENTORY_BLUE_THEME}>
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-200"><FileText size={23} /></span>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">{t("inventarizatsiya.pageTitle")}</h1>
            <p className="mt-1 text-sm text-slate-500">{t("inventarizatsiya.pageSubtitle")}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={formaniOchish}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 font-black text-white shadow-md shadow-blue-200 transition hover:bg-blue-700"
        >
          <Plus size={18} /> {t("inventarizatsiya.createButton")}
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={t("inventarizatsiya.pageTitle")}>
      {[
          { title: t("inventarizatsiya.stats.total"), value: inventarizatsiyaStatistikasi.jami, icon: FileText },
          { title: t("inventarizatsiya.stats.completed"), value: inventarizatsiyaStatistikasi.tugallangan, icon: CheckCircle2 },
          { title: t("inventarizatsiya.stats.inProgress"), value: inventarizatsiyaStatistikasi.jarayonda, icon: Clock3 },
          { title: t("inventarizatsiya.stats.cancelled"), value: inventarizatsiyaStatistikasi.bekorQilingan, icon: CircleX },
        ].map(({ title, value, icon: Icon }, index) => (
          <button key={title} type="button" onClick={() => { setHolatFiltri(["ALL", "CONFIRMED", "DRAFT", "CANCELLED"][index]); setPage(1); }} aria-pressed={holatFiltri === ["ALL", "CONFIRMED", "DRAFT", "CANCELLED"][index]} className={`group relative isolate flex min-h-[126px] flex-col justify-between overflow-hidden rounded-[22px] border border-blue-100 bg-gradient-to-br from-white to-blue-50/70 p-4 text-left shadow-[0_5px_18px_rgba(37,99,235,.06)] transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_14px_30px_rgba(37,99,235,.13)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 sm:p-5 ${holatFiltri === ["ALL", "CONFIRMED", "DRAFT", "CANCELLED"][index] ? "ring-2 ring-blue-300" : ""}`}>
          <span className="pointer-events-none absolute -right-7 -top-8 -z-10 h-28 w-28 rounded-full bg-blue-200/40 blur-2xl transition duration-500 group-hover:scale-150" />
            <div className="flex w-full items-center gap-3">
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md transition duration-300 group-hover:rotate-[-6deg] group-hover:scale-105 ${index === 1 ? "bg-emerald-500 shadow-emerald-200" : index === 2 ? "bg-amber-500 shadow-amber-200" : index === 3 ? "bg-rose-500 shadow-rose-200" : "bg-blue-600 shadow-blue-200"}`}><Icon size={21} /></span>
            <div><p className="text-sm font-semibold text-slate-500">{title}</p><p className="mt-1 text-2xl font-black leading-none text-slate-900">{store.yuklanmoqda && store.inventarizatsiyalar.length === 0 ? "—" : value}</p></div>
              <span className={`rounded-full bg-white/80 px-2.5 py-1 text-xs font-black shadow-sm ring-1 ring-white/90 ${index === 1 ? "text-emerald-700" : index === 2 ? "text-amber-700" : index === 3 ? "text-rose-700" : "text-blue-700"}`}>{inventarizatsiyaStatistikasi.jami ? Math.round((value / inventarizatsiyaStatistikasi.jami) * 100) : 0}%</span>
            </div>
          <span className="mt-4 block h-1.5 w-full overflow-hidden rounded-full bg-white/90 shadow-inner"><span className={`block h-full rounded-full transition-[width] duration-700 ease-out ${index === 1 ? "bg-emerald-500" : index === 2 ? "bg-amber-500" : index === 3 ? "bg-rose-500" : "bg-blue-500"}`} style={{ width: `${inventarizatsiyaStatistikasi.jami ? Math.round((value / inventarizatsiyaStatistikasi.jami) * 100) : 0}%` }} /></span>
          </button>
        ))}
      </section>

      <section className="grid gap-3 rounded-2xl border border-blue-100 bg-white p-3 shadow-[0_2px_8px_rgba(37,99,235,.05)] lg:grid-cols-[minmax(240px,1fr)_minmax(260px,1.1fr)_minmax(150px,.55fr)_minmax(170px,.65fr)] lg:items-center">
        <label className="relative block min-w-0">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-blue-700" />
          <input
            value={qidiruv}
            onChange={(event) => setQidiruv(event.target.value)}
            placeholder={t("inventarizatsiya.searchPlaceholder")}
            className="h-12 w-full rounded-2xl border border-blue-100 bg-white pl-11 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
        </label>
        <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-blue-100 px-3 py-1.5">
          <CalendarDays size={18} className="shrink-0 text-blue-700" />
          <label className="min-w-0 flex-1"><span className="sr-only">{t("inventarizatsiya.filters.dateFrom")}</span><input aria-label={t("inventarizatsiya.filters.dateFrom")} type="date" value={sanaDan} onChange={(event) => setSanaDan(event.target.value)} className="h-9 w-full min-w-0 border-0 bg-transparent text-xs text-slate-600 outline-none" /></label>
          <span className="text-xs text-slate-400">—</span>
          <label className="min-w-0 flex-1"><span className="sr-only">{t("inventarizatsiya.filters.dateTo")}</span><input aria-label={t("inventarizatsiya.filters.dateTo")} type="date" value={sanaGacha} onChange={(event) => setSanaGacha(event.target.value)} className="h-9 w-full min-w-0 border-0 bg-transparent text-xs text-slate-600 outline-none" /></label>
        </div>
        <div className="flex h-12 items-center gap-2 px-1">
          <Filter size={17} className="shrink-0 text-blue-700" />
          <AppSelect value={holatFiltri} onChange={(event) => setHolatFiltri(event.target.value)} aria-label={t("inventarizatsiya.filters.status")} className="h-full min-w-0 flex-1 rounded-xl px-1 text-sm text-slate-600 [&_svg]:!text-blue-600">
            <option value="ALL">{t("inventarizatsiya.filters.allStatuses")}</option><option value="DRAFT">{t("inventarizatsiya.stats.inProgress")}</option><option value="CONFIRMED">{t("inventarizatsiya.stats.completed")}</option><option value="CANCELLED">{t("inventarizatsiya.stats.cancelled")}</option>
          </AppSelect>
        </div>
        <div className="flex h-12 items-center gap-2 px-1">
          <Package size={17} className="shrink-0 text-blue-700" />
          <AppSelect value={omborFiltri} onChange={(event) => setOmborFiltri(event.target.value)} aria-label={t("inventarizatsiya.filters.warehouse")} className="h-full min-w-0 flex-1 rounded-xl px-1 text-sm text-slate-600 [&_svg]:!text-blue-600">
            <option value="ALL">{t("inventarizatsiya.filters.allWarehouses")}</option>{store.omborlar.map((ombor) => <option key={ombor.id} value={ombor.id}>{ombor.name}</option>)}
          </AppSelect>
        </div>
      </section>

      {store.xatolik && !modal && (
        <div className="rounded-2xl bg-red-50 p-4 font-bold text-red-600">{store.xatolik}</div>
      )}

      <OmborJadval className="border-blue-100 shadow-[0_3px_14px_rgba(37,99,235,.06)] [&_thead]:!bg-[#F4F8FF] [&_thead]:!text-blue-800 [&_thead_th]:!border-blue-100 [&_tbody]:!divide-blue-100 [&>div:last-child]:!border-blue-100 [&>div:last-child>button]:!border-blue-100 [&>div:last-child>button]:!text-blue-600 [&>div:last-child>button:hover]:!bg-blue-50 [&>div:last-child>div]:!bg-blue-50 [&>div:last-child>div>div]:!bg-blue-500">
        <table className="w-full min-w-[1050px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
            <tr>
              {faolUstunlar.map((ustun) => <th key={ustun.id}>{t(ustun.nom)}</th>)}
              <th className="sticky right-0 z-10 w-20 min-w-20 bg-[#F8FAFC] px-5 py-3 text-right">
                <button
                  ref={sozlamaTugmaRef}
                  type="button"
                  onClick={() => {
                    if (!ustunlarMenyusi) sozlamaJoylashuviniYangilash();
                    setUstunlarMenyusi((oldingi) => !oldingi);
                  }}
                  aria-label={t("inventarizatsiya.columnsMenuAria")}
                  aria-expanded={ustunlarMenyusi}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-blue-600 transition hover:bg-blue-100"
                >
                  <Settings size={18} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-100">
            {sahifadagiHujjatlar.map((item) => {
              return (
              <tr key={item.id} onClick={() => setTanlanganId(item.id)} className="cursor-pointer text-slate-600 transition hover:bg-blue-50/60">
                {faolUstunlar.map((ustun) => <td key={ustun.id}>{jadvalKatagi(item, ustun.id)}</td>)}
                <td className="sticky right-0 bg-white px-5 py-4 group-hover:bg-blue-50/60" />
              </tr>
            );})}
            {store.yuklanmoqda && store.inventarizatsiyalar.length === 0 && (
              <tr>
                <td colSpan={faolUstunlar.length + 1} className="py-14 text-center text-gray-400">
                  <LoaderCircle size={22} className="mx-auto mb-2 animate-spin text-blue-600" />
                  {t("inventarizatsiya.loadingDocuments")}
                </td>
              </tr>
            )}
            {!store.yuklanmoqda && korinadiganHujjatlar.length === 0 && (
              <tr>
                <td colSpan={faolUstunlar.length + 1} className="py-14 text-center text-gray-400">
                  {qidiruv || sanaDan || sanaGacha || holatFiltri !== "ALL" || omborFiltri !== "ALL" ? t("inventarizatsiya.emptySearch") : t("inventarizatsiya.emptyList")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </OmborJadval>
      {!store.yuklanmoqda && <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_2px_8px_rgba(37,99,235,.05)] [&>div]:!border-0"><TablePagination accent="blue" page={page} pageSize={pageSize} totalItems={korinadiganHujjatlar.length} onPageChange={setPage} onPageSizeChange={setPageSize} /></div>}

      {ustunlarMenyusi &&
        createPortal(
          <div
            ref={sozlamaRef}
            role="menu"
            className="fixed z-[99990] w-64 overflow-hidden rounded-2xl border border-blue-100 bg-white p-2 text-left text-slate-600 shadow-2xl"
            style={{ ...INVENTORY_BLUE_THEME, top: sozlamaJoylashuvi.top, left: sozlamaJoylashuvi.left }}
          >
            {INVENTARIZATSIYA_USTUNLARI.map((ustun) => (
              <label key={ustun.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold hover:bg-blue-50">
                <input
                  type="checkbox"
                  checked={korinadiganUstunlar.has(ustun.id)}
                  onChange={() => ustunniAlmashtirish(ustun.id)}
                  className="h-4 w-4 accent-blue-600"
                />
                {t(ustun.nom)}
              </label>
            ))}
          </div>,
          document.body
        )}

      {modal && (
        <AppModal>
          <div className="scrollbar-hidden flex max-h-[95vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-[24px] border border-blue-100 bg-[#F8FAFC] shadow-[0_28px_90px_rgba(15,23,42,.28)]" style={INVENTORY_BLUE_THEME}>
            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-blue-100 bg-white px-6 py-4 sm:px-7 sm:py-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-200"><FileText size={21} strokeWidth={2.2} /></span>
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{t("inventarizatsiya.createModal.title")}</h2>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black uppercase text-blue-700">{t("inventarizatsiya.createModal.newBadge")}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={formaniYopish}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                aria-label={t("inventarizatsiya.createModal.closeAria")}
              >
                <X size={22} />
              </button>
            </header>

            <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
              <div className="grid items-stretch gap-4 lg:grid-cols-2">
                <section className="rounded-[22px] border border-blue-100 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,.08)] sm:p-5">
                  <h3 className="flex items-center gap-2.5 border-b border-blue-100 pb-3.5 text-sm font-black uppercase tracking-wide text-slate-600">
                    <ClipboardList size={18} className="text-blue-600" />
                    {t("inventarizatsiya.createModal.aboutTitle")}
                  </h3>
                  <div className="mt-5 space-y-4">
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-slate-500">{t("inventarizatsiya.createModal.warehouseLabel")}</span>
                      <AppSelect
                        value={warehouseId}
                        onChange={(event) => void omborTanlash(event.target.value)}
                        className="h-12 w-full rounded-2xl border border-blue-100 bg-white px-4 font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      >
                        <option value="">{t("inventarizatsiya.createModal.selectWarehouse")}</option>
                        {store.omborlar.map((ombor) => (
                          <option key={ombor.id} value={ombor.id}>{ombor.name}</option>
                        ))}
                      </AppSelect>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-slate-500">{t("inventarizatsiya.createModal.typeLabel")}</span>
                      <AppSelect
                        value={type}
                        onChange={(event) => { setType(event.target.value as InventarizatsiyaTuri); setTanlanganModifikatsiyaIds([]); setFormaXatosi(null); }}
                        className="h-12 w-full rounded-2xl border border-blue-100 bg-white px-4 font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      >
                        <option value="FULL">{t("inventarizatsiya.typeFull")}</option>
                        <option value="PARTIAL">{t("inventarizatsiya.typePartial")}</option>
                      </AppSelect>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-slate-500">{t("inventarizatsiya.createModal.responsibleLabel")}</span>
                      <AppSelect
                        value={responsibleId}
                        onChange={(event) => setResponsibleId(event.target.value)}
                        className="h-12 w-full rounded-2xl border border-blue-100 bg-white px-4 font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      >
                        <option value="">{t("inventarizatsiya.createModal.responsibleUnassigned")}</option>
                        {store.xodimlar.map((xodim) => (
                          <option key={xodim.id} value={xodim.id}>
                            {xodim.fullName ?? xodim.username ?? xodim.name ?? t("inventarizatsiya.createModal.unknownEmployee")}
                          </option>
                        ))}
                      </AppSelect>
                    </label>
                  </div>
                </section>

                <section className="rounded-[22px] border border-blue-100 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,.08)] sm:p-5">
                  <h3 className="flex items-center gap-2.5 border-b border-blue-100 pb-3.5 text-sm font-black uppercase tracking-wide text-slate-600"><MessageSquareText size={18} className="text-blue-600" />{t("inventarizatsiya.createModal.noteTitle")}</h3>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className="mt-4 min-h-28 w-full resize-none rounded-2xl border border-blue-100 bg-white p-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 sm:min-h-32"
                    placeholder={t("inventarizatsiya.createModal.notePlaceholder")}
                  />
                  <p className="mt-4 text-sm leading-6 text-slate-400">
                    {t("inventarizatsiya.createModal.noteHelper")}
                  </p>
                </section>
              </div>

              {(formaXatosi || store.xatolik) && (
                <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
                  {formaXatosi ? t(formaXatosi.key, formaXatosi.params) : store.xatolik}
                </div>
              )}

              <section className="mt-4 rounded-[22px] border border-blue-100 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,.08)] sm:p-5">
                <div className="flex items-center justify-between gap-4 border-b border-blue-100 pb-3.5">
                  <div>
                    <h3 className="flex items-center gap-2.5 text-sm font-black uppercase tracking-wide text-slate-600"><Package size={18} className="text-blue-600" />{t("inventarizatsiya.createModal.itemsTitle")}</h3>
                    <p className="mt-1 text-xs text-slate-400">{t("inventarizatsiya.createModal.itemsSubtitle")}</p>
                  </div>
                  {warehouseId && !qoldiqYuklanmoqda && (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{t("inventarizatsiya.createModal.itemsCount", { count: type === "FULL" ? qoldiqlar.length : inventarizatsiyaQatorlari.length })}</span>
                  )}
                </div>

                {qoldiqYuklanmoqda ? (
                  <div className="flex min-h-48 items-center justify-center gap-2 text-sm font-bold text-slate-400">
                    <LoaderCircle size={22} className="animate-spin text-blue-600" /> {t("inventarizatsiya.createModal.stockLoading")}
                  </div>
                ) : !warehouseId ? (
                  <div className="flex min-h-40 items-center justify-center text-sm font-bold text-slate-400">{t("inventarizatsiya.createModal.selectWarehouseHint")}</div>
                ) : type === "FULL" && qoldiqlar.length === 0 ? (
                  <div className="flex min-h-40 items-center justify-center text-sm font-bold text-slate-400">{t("inventarizatsiya.createModal.noStock")}</div>
                ) : (
                  <div className="mt-4 overflow-x-auto rounded-2xl border border-blue-100 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-blue-400 [&::-webkit-scrollbar-track]:bg-blue-50">
                    <table className="w-full min-w-[980px] text-left text-sm">
                      <thead className="bg-[#F4F8FF] text-xs font-black uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-4">{t("inventarizatsiya.createModal.table.number")}</th>
                          <th className="px-4 py-4">{t("inventarizatsiya.createModal.table.product")}</th>
                          <th className="px-4 py-4">{t("inventarizatsiya.createModal.table.barcode")}</th>
                          <th className="px-4 py-4">{t("inventarizatsiya.createModal.table.warehouse")}</th>
                          <th className="px-4 py-4">{t("inventarizatsiya.createModal.table.systemStock")}</th>
                          <th className="px-4 py-4">{t("inventarizatsiya.createModal.table.actualQuantity")}</th>
                          <th className="px-4 py-4">{t("inventarizatsiya.createModal.table.difference")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-50">
                        {inventarizatsiyaQatorlari.map((qoldiq, index) => {
                          const tizim = qoldiqMiqdori(qoldiq);
                          const haqiqiyRaw = actuals[qoldiq.modificationId] ?? String(tizim);
                          const haqiqiy = Number(haqiqiyRaw);
                          const farq = Number.isFinite(haqiqiy) ? haqiqiy - tizim : null;
                          return (
                            <tr key={`${qoldiq.modificationId}-${index}`}>
                              <td className="px-4 py-4 text-slate-400">{index + 1}</td>
                              <td className="px-4 py-4 font-black text-slate-900">
                                <div className="flex items-center justify-between gap-2">
                                  <span>{modificationNomi(qoldiq.modification)}</span>
                                  {type === "PARTIAL" && <button type="button" onClick={() => { setTanlanganModifikatsiyaIds((oldingi) => oldingi.filter((id) => id !== qoldiq.modificationId)); setActuals((oldingi) => { const keyingi = { ...oldingi }; delete keyingi[qoldiq.modificationId]; return keyingi; }); }} className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-500" aria-label={t("inventarizatsiya.createModal.removeRowAria")}><Trash2 size={15} /></button>}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-slate-500">{qoldiq.modification?.barcode ?? "—"}</td>
                              <td className="px-4 py-4">{qoldiq.warehouse?.name ?? omborMap.get(warehouseId) ?? t("inventarizatsiya.unknownWarehouse")}</td>
                              <td className="px-4 py-4 font-bold text-slate-600">{tizim}</td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={haqiqiyRaw}
                                  onChange={(event) => {
                                    setFormaXatosi(null);
                                    setActuals((oldingi) => ({ ...oldingi, [qoldiq.modificationId]: event.target.value }));
                                  }}
                                  className="h-10 w-32 rounded-xl border border-blue-100 bg-white px-3 font-bold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                  aria-label={t("inventarizatsiya.createModal.actualQuantityAria", { name: modificationNomi(qoldiq.modification) })}
                                />
                              </td>
                              <td className={`px-4 py-4 font-black ${farq == null || farq === 0 ? "text-slate-400" : farq > 0 ? "text-emerald-600" : "text-red-500"}`}>
                                {farq == null ? "—" : farq > 0 ? `+${farq}` : farq}
                              </td>
                            </tr>
                          );
                        })}
                        {type === "PARTIAL" && barchaTanlovlar.some((qoldiq) => !tanlanganModifikatsiyaIds.includes(qoldiq.modificationId)) && (
                          <tr>
                            <td className="px-4 py-3 text-slate-400">{inventarizatsiyaQatorlari.length + 1}</td>
                            <td className="px-4 py-3">
                              <select
                                aria-label={t("inventarizatsiya.createModal.table.product")}
                                value=""
                                onChange={(event) => {
                                  const modificationId = event.target.value;
                                  const qoldiq = barchaTanlovlar.find((item) => item.modificationId === modificationId);
                                  if (!qoldiq) return;
                                  setTanlanganModifikatsiyaIds((oldingi) => [...oldingi, modificationId]);
                                  setActuals((oldingi) => ({ ...oldingi, [modificationId]: String(qoldiqMiqdori(qoldiq)) }));
                                }}
                                className="h-10 w-full min-w-64 rounded-xl border border-blue-100 bg-white px-3 font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                              >
                                <option value="">{t("inventarizatsiya.createModal.selectProduct")}</option>
                                {barchaTanlovlar.filter((qoldiq) => !tanlanganModifikatsiyaIds.includes(qoldiq.modificationId)).map((qoldiq) => (
                                  <option key={qoldiq.modificationId} value={qoldiq.modificationId}>{modificationNomi(qoldiq.modification)}</option>
                                ))}
                              </select>
                            </td>
                            <td colSpan={5} className="px-4 py-3 text-sm text-slate-400">{t("inventarizatsiya.createModal.addNextProductHint")}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>

            <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-blue-100 bg-[#F8FAFC] px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
              <button
                type="button"
                onClick={formaniYopish}
                disabled={store.amalBajarilmoqda}
                className="h-12 rounded-2xl bg-slate-100 px-6 font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
              >
                {t("inventarizatsiya.createModal.cancel")}
              </button>
              <button
                type="button"
                onClick={() => void yaratish(false)}
                disabled={store.amalBajarilmoqda || qoldiqYuklanmoqda || !warehouseId}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-blue-300 bg-white px-6 font-black text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {store.amalBajarilmoqda && <LoaderCircle size={17} className="animate-spin" />}
                {t("inventarizatsiya.createModal.save")}
              </button>
              <button
                type="button"
                onClick={() => void yaratish(true)}
                disabled={store.amalBajarilmoqda || qoldiqYuklanmoqda || !warehouseId}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-7 font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {store.amalBajarilmoqda && <LoaderCircle size={17} className="animate-spin" />}
                {t("inventarizatsiya.createModal.saveAndConfirm")}
              </button>
            </footer>
          </div>
        </AppModal>
      )}

      {tanlanganId && (
        <InventoryHujjatModal
          tur="inventarizatsiya"
          id={tanlanganId}
          onClose={() => setTanlanganId(null)}
        />
      )}
    </div>
  );
}
