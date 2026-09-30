import AppSelect from "@/Components/ui/AppSelect";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, CircleX, ClipboardList, Clock3, FileText, Filter, LoaderCircle, Lock, MessageSquareText, Package, Plus, ScanLine, Search, Settings, Trash2, Warehouse } from "lucide-react";
import { useTranslation } from "react-i18next";
import AppModal from "@/Components/common/AppModal";
import DateRangePicker from "@/Components/ui/DateRangePicker";
import { useAuthProfileStore } from "@/store/authProfileStore";
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
  const joriyProfil = useAuthProfileStore((state) => state.profil);
  const profilniYuklash = useAuthProfileStore((state) => state.profilniYuklash);
  const [modal, setModal] = useState(false);
  const [tanlanganId, setTanlanganId] = useState<string | null>(null);
  const [warehouseId, setWarehouseId] = useState("");
  const [type, setType] = useState<InventarizatsiyaTuri>("FULL");
  const [responsibleId, setResponsibleId] = useState("");
  const [actuals, setActuals] = useState<Record<string, string>>({});
  const [blindCount, setBlindCount] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scanFeedback, setScanFeedback] = useState("");
  const [reviewAction, setReviewAction] = useState<"save" | "confirm" | null>(null);
  const [freezeAcknowledged, setFreezeAcknowledged] = useState(false);
  const [varianceAcknowledged, setVarianceAcknowledged] = useState(false);
  const [tanlanganModifikatsiyaIds, setTanlanganModifikatsiyaIds] = useState<string[]>([]);
  const [mahsulotQidiruv, setMahsulotQidiruv] = useState("");
  const [mahsulotDropdownOchiq, setMahsulotDropdownOchiq] = useState(false);
  const [mahsulotMenyuJoylashuvi, setMahsulotMenyuJoylashuvi] = useState({ top: 0, left: 0, width: 0 });
  const mahsulotSearchRef = useRef<HTMLDivElement | null>(null);
  const mahsulotMenyuRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    if (!joriyProfil) void profilniYuklash();
  }, [joriyProfil, profilniYuklash]);

  // Inventarizatsiya hujjatining mas'ul shaxsi har doim tizimga real kirgan
  // foydalanuvchi bo'lishi kerak — boshqa xodimga o'tkazib bo'lmaydi.
  useEffect(() => {
    if (joriyProfil?.id) setResponsibleId(joriyProfil.id);
  }, [joriyProfil]);

  const mahsulotMenyuJoylashuviniYangilash = useCallback(() => {
    const rect = mahsulotSearchRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menyuBalandligi = 256;
    const pastgaTop = rect.bottom + 4;
    const top = pastgaTop + menyuBalandligi <= window.innerHeight - 12
      ? pastgaTop
      : Math.max(12, rect.top - menyuBalandligi - 4);
    setMahsulotMenyuJoylashuvi({ top, left: rect.left, width: rect.width });
  }, []);

  useEffect(() => {
    if (!mahsulotDropdownOchiq) return;
    function tashqarigaBosish(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !mahsulotSearchRef.current?.contains(target) &&
        !mahsulotMenyuRef.current?.contains(target)
      ) {
        setMahsulotDropdownOchiq(false);
      }
    }
    mahsulotMenyuJoylashuviniYangilash();
    document.addEventListener("mousedown", tashqarigaBosish);
    window.addEventListener("resize", mahsulotMenyuJoylashuviniYangilash);
    window.addEventListener("scroll", mahsulotMenyuJoylashuviniYangilash, true);
    return () => {
      document.removeEventListener("mousedown", tashqarigaBosish);
      window.removeEventListener("resize", mahsulotMenyuJoylashuviniYangilash);
      window.removeEventListener("scroll", mahsulotMenyuJoylashuviniYangilash, true);
    };
  }, [mahsulotDropdownOchiq, mahsulotMenyuJoylashuviniYangilash]);

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

  // Qo'lda "Mahsulot qo'shish" orqali tanlangan qo'shimcha qatorlar — FULL va PARTIAL
  // turlarining ikkalasida ham ishlaydi (masalan, hali umuman qoldig'i bo'lmagan
  // mahsulotni FULL inventarizatsiyaga ham qo'shish mumkin).
  const qolQoshilganQatorlar = useMemo(() => {
    const tanlovByModification = new Map(barchaTanlovlar.map((qoldiq) => [qoldiq.modificationId, qoldiq]));
    return tanlanganModifikatsiyaIds
      .map((modificationId) => tanlovByModification.get(modificationId))
      .filter((qoldiq): qoldiq is (typeof qoldiqlar)[number] => Boolean(qoldiq));
  }, [barchaTanlovlar, tanlanganModifikatsiyaIds]);

  const inventarizatsiyaQatorlari = useMemo(() => {
    if (type === "PARTIAL") return qolQoshilganQatorlar;
    // FULL: mavjud barcha qoldiqlar avtomatik + qo'lda qo'shilgan yangi mahsulotlar.
    const mavjudIds = new Set(qoldiqlar.map((qoldiq) => qoldiq.modificationId));
    return [...qoldiqlar, ...qolQoshilganQatorlar.filter((qoldiq) => !mavjudIds.has(qoldiq.modificationId))];
  }, [qoldiqlar, qolQoshilganQatorlar, type]);

  const sanoqXulosasi = useMemo(() => {
    let counted = 0;
    let surplus = 0;
    let shortage = 0;
    const uncounted: string[] = [];
    const invalid: string[] = [];
    const variances: Array<{ id: string; name: string; system: number; actual: number; difference: number }> = [];
    for (const row of inventarizatsiyaQatorlari) {
      const raw = actuals[row.modificationId]?.trim();
      if (!raw) {
        uncounted.push(modificationNomi(row.modification));
        continue;
      }
      const actual = Number(raw);
      if (!Number.isFinite(actual) || actual < 0) {
        invalid.push(modificationNomi(row.modification));
        continue;
      }
      counted += 1;
      const system = qoldiqMiqdori(row);
      const difference = actual - system;
      if (difference > 0) surplus += difference;
      if (difference < 0) shortage += Math.abs(difference);
      if (difference !== 0) variances.push({ id: row.modificationId, name: modificationNomi(row.modification), system, actual, difference });
    }
    return { counted, uncounted, invalid, surplus, shortage, variances };
  }, [actuals, inventarizatsiyaQatorlari]);

  // "Mahsulot qo'shish" ro'yxatida hali qatorga kiritilmagan tanlovlar — FULL turida
  // avtomatik qoldiqlar ham hisobga olinadi (ularni qayta taklif qilmaslik uchun).
  const tanlanmaganTanlovlar = useMemo(() => {
    const kiritilganIds = new Set(inventarizatsiyaQatorlari.map((qoldiq) => qoldiq.modificationId));
    return barchaTanlovlar.filter((qoldiq) => !kiritilganIds.has(qoldiq.modificationId));
  }, [barchaTanlovlar, inventarizatsiyaQatorlari]);

  // Qidiruv matniga mos tanlovlar — mahsulot nomi yoki shtrix-kod bo'yicha qidiriladi,
  // ro'yxat katta bo'lganda mahsulotni qo'lda topish uchun.
  const mahsulotQidiruviMoslari = useMemo(() => {
    const q = mahsulotQidiruv.trim().toLowerCase();
    if (!q) return tanlanmaganTanlovlar;
    return tanlanmaganTanlovlar.filter((qoldiq) => {
      const nomi = modificationNomi(qoldiq.modification).toLowerCase();
      const barcode = (qoldiq.modification?.barcode ?? "").toLowerCase();
      return nomi.includes(q) || barcode.includes(q);
    });
  }, [tanlanmaganTanlovlar, mahsulotQidiruv]);

  function mahsulotQoshish(modificationId: string) {
    const qoldiq = barchaTanlovlar.find((item) => item.modificationId === modificationId);
    if (!qoldiq) return;
    setTanlanganModifikatsiyaIds((oldingi) => [...oldingi, modificationId]);
    setMahsulotQidiruv("");
    setMahsulotDropdownOchiq(false);
  }

  function barcodeSanash() {
    const code = barcodeInput.trim().toLowerCase();
    if (!warehouseId || !code) return;
    const matches = barchaTanlovlar.filter((row) => row.modification?.barcode?.trim().toLowerCase() === code);
    if (matches.length !== 1) {
      setScanFeedback(t(matches.length ? "inventarizatsiya.createModal.scanAmbiguous" : "inventarizatsiya.createModal.scanNotFound"));
      return;
    }
    const row = matches[0];
    if (!inventarizatsiyaQatorlari.some((item) => item.modificationId === row.modificationId)) {
      setTanlanganModifikatsiyaIds((previous) => previous.includes(row.modificationId) ? previous : [...previous, row.modificationId]);
    }
    setActuals((previous) => {
      const current = previous[row.modificationId]?.trim();
      const number = current && Number.isFinite(Number(current)) && Number(current) >= 0 ? Number(current) : 0;
      return { ...previous, [row.modificationId]: String(number + 1) };
    });
    setBarcodeInput("");
    setScanFeedback(t("inventarizatsiya.createModal.scanSuccess", { name: modificationNomi(row.modification) }));
    setFormaXatosi(null);
  }

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
    setResponsibleId(joriyProfil?.id ?? "");
    setActuals({});
    setBlindCount(false);
    setBarcodeInput("");
    setScanFeedback("");
    setReviewAction(null);
    setFreezeAcknowledged(false);
    setVarianceAcknowledged(false);
    setTanlanganModifikatsiyaIds([]);
    setMahsulotQidiruv("");
    setMahsulotDropdownOchiq(false);
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
    setBarcodeInput("");
    setScanFeedback("");
    setReviewAction(null);
    setTanlanganModifikatsiyaIds([]);
    setMahsulotQidiruv("");
    setMahsulotDropdownOchiq(false);
    setFormaXatosi(null);
    store.xatolikniTozalash();
    if (!id) return;

    setQoldiqYuklanmoqda(true);
    await store.qoldiqlarniYuklash(id);
    setQoldiqYuklanmoqda(false);
  }

  function koribChiqish(action: "save" | "confirm") {
    setFormaXatosi(null);
    store.xatolikniTozalash();
    if (!warehouseId) {
      setFormaXatosi({ key: "inventarizatsiya.createModal.errors.selectWarehouse" });
      return;
    }
    if (inventarizatsiyaQatorlari.length === 0) {
      setFormaXatosi({ key: "inventarizatsiya.createModal.errors.selectAtLeastOne" });
      return;
    }
    setReviewAction(action);
    setFreezeAcknowledged(false);
    setVarianceAcknowledged(false);
  }

  async function yaratish() {
    if (!reviewAction || !freezeAcknowledged) return;
    setFormaXatosi(null);
    store.xatolikniTozalash();
    if (sanoqXulosasi.uncounted.length > 0) {
      setFormaXatosi({ key: "inventarizatsiya.createModal.errors.uncounted", params: { count: sanoqXulosasi.uncounted.length } });
      return;
    }
    if (sanoqXulosasi.invalid.length > 0) {
      setFormaXatosi({ key: "inventarizatsiya.createModal.errors.invalidQuantity", params: { name: sanoqXulosasi.invalid[0] } });
      return;
    }
    if (reviewAction === "confirm" && sanoqXulosasi.variances.length > 0 && !note.trim()) {
      setFormaXatosi({ key: "inventarizatsiya.createModal.errors.varianceReason" });
      return;
    }
    if (reviewAction === "confirm" && sanoqXulosasi.variances.length > 0 && !varianceAcknowledged) return;
    const itemMap = new Map<string, { modificationId: string; actualQuantity: number }>();
    for (const qoldiq of inventarizatsiyaQatorlari) {
      const kiritilgan = actuals[qoldiq.modificationId]?.trim();
      if (!kiritilgan) {
        setFormaXatosi({ key: "inventarizatsiya.createModal.errors.uncounted", params: { count: sanoqXulosasi.uncounted.length } });
        return;
      }
      const actualQuantity = Number(kiritilgan);
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

    if (reviewAction === "confirm") {
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
        ].map(({ title, value, icon: Icon }, index) => {
          const kartaYuklanmoqda = store.yuklanmoqda && store.inventarizatsiyalar.length === 0;
          return (
          <button key={title} type="button" onClick={() => { setHolatFiltri(["ALL", "CONFIRMED", "DRAFT", "CANCELLED"][index]); setPage(1); }} disabled={kartaYuklanmoqda} aria-pressed={holatFiltri === ["ALL", "CONFIRMED", "DRAFT", "CANCELLED"][index]} aria-busy={kartaYuklanmoqda} className={`group relative isolate flex min-h-[126px] flex-col justify-center overflow-hidden rounded-[22px] border border-blue-100 bg-gradient-to-br from-white to-blue-50/70 p-4 text-left shadow-[0_5px_18px_rgba(37,99,235,.06)] transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_14px_30px_rgba(37,99,235,.13)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-default disabled:hover:translate-y-0 disabled:hover:border-blue-100 disabled:hover:shadow-[0_5px_18px_rgba(37,99,235,.06)] sm:p-5 ${holatFiltri === ["ALL", "CONFIRMED", "DRAFT", "CANCELLED"][index] && !kartaYuklanmoqda ? "ring-2 ring-blue-300" : ""}`}>
          <span className="pointer-events-none absolute -right-7 -top-8 -z-10 h-28 w-28 rounded-full bg-blue-200/40 blur-2xl transition duration-500 group-hover:scale-150" />
            {kartaYuklanmoqda ? (
              <span className="flex items-center justify-center gap-2 text-sm font-bold text-slate-400">
                <LoaderCircle size={18} className="animate-spin text-blue-500" />
                {t("inventarizatsiya.loadingDocuments")}
              </span>
            ) : (
              <div className="flex w-full items-center gap-3">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md transition duration-300 group-hover:rotate-[-6deg] group-hover:scale-105 ${index === 1 ? "bg-emerald-500 shadow-emerald-200" : index === 2 ? "bg-amber-500 shadow-amber-200" : index === 3 ? "bg-rose-500 shadow-rose-200" : "bg-blue-600 shadow-blue-200"}`}><Icon size={21} /></span>
                <div><p className="text-sm font-semibold text-slate-500">{title}</p><p className="mt-1 text-2xl font-black leading-none text-slate-900">{value}</p></div>
                <span className={`rounded-full bg-white/80 px-2.5 py-1 text-xs font-black shadow-sm ring-1 ring-white/90 ${index === 1 ? "text-emerald-700" : index === 2 ? "text-amber-700" : index === 3 ? "text-rose-700" : "text-blue-700"}`}>{inventarizatsiyaStatistikasi.jami ? Math.round((value / inventarizatsiyaStatistikasi.jami) * 100) : 0}%</span>
              </div>
            )}
          {!kartaYuklanmoqda && <span className="mt-4 block h-1.5 w-full overflow-hidden rounded-full bg-white/90 shadow-inner"><span className={`block h-full rounded-full transition-[width] duration-700 ease-out ${index === 1 ? "bg-emerald-500" : index === 2 ? "bg-amber-500" : index === 3 ? "bg-rose-500" : "bg-blue-500"}`} style={{ width: `${inventarizatsiyaStatistikasi.jami ? Math.round((value / inventarizatsiyaStatistikasi.jami) * 100) : 0}%` }} /></span>}
          </button>
          );
        })}
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
        <DateRangePicker
          from={sanaDan}
          to={sanaGacha}
          onChange={(from, to) => { setSanaDan(from); setSanaGacha(to); }}
          className="min-w-0"
          compact
        />
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
        <AppModal onClose={formaniYopish} className="sidebar-aligned-document-modal p-3 sm:p-5">
          <div className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[32px] border border-blue-100 bg-[#F8FAFC] shadow-[0_28px_90px_rgba(15,23,42,.32)]" style={INVENTORY_BLUE_THEME}>
            <header className="flex shrink-0 items-center gap-3 border-b border-blue-100 bg-gradient-to-r from-white via-white to-blue-50/60 px-5 py-4 sm:px-8">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-200"><ClipboardList size={20} /></span>
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{t("inventarizatsiya.createModal.title")}</h2>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-600">{t(reviewAction ? "inventarizatsiya.createModal.reviewBadge" : "inventarizatsiya.createModal.newBadge")}</span>
              </div>
            </header>

            <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8">
              {!reviewAction ? <>
              <section className="rounded-[26px] border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
                <h3 className="mb-5 flex items-center gap-2 border-b border-blue-100 pb-4 text-sm font-black uppercase tracking-wide text-slate-600">
                  <ClipboardList size={18} className="text-blue-600" />
                  {t("inventarizatsiya.createModal.aboutTitle")}
                </h3>
                <div className="grid gap-5 md:grid-cols-2">
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
                    <span className="mb-2 block text-sm font-bold text-slate-500">{t("inventarizatsiya.createModal.responsibleLabel")}</span>
                    <div className="flex h-12 w-full items-center justify-between rounded-2xl border border-blue-100 bg-slate-50 px-4 font-semibold text-slate-700">
                      <span className="truncate">
                        {joriyProfil?.fullName ?? joriyProfil?.username ?? t("inventarizatsiya.createModal.unknownEmployee")}
                      </span>
                      <Lock size={15} className="shrink-0 text-slate-400" />
                    </div>
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-500"><MessageSquareText size={16} className="text-blue-600" />{t("inventarizatsiya.createModal.noteTitle")}</span>
                    <textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-2xl border border-blue-100 bg-white p-4 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      placeholder={t("inventarizatsiya.createModal.notePlaceholder")}
                    />
                    <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
                      {t("inventarizatsiya.createModal.noteHelper")}
                    </p>
                  </label>
                </div>
              </section>

              {(formaXatosi || store.xatolik) && (
                <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
                  {formaXatosi ? t(formaXatosi.key, formaXatosi.params) : store.xatolik}
                </div>
              )}

              <div className="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />
                <div><p className="font-black">{t("inventarizatsiya.createModal.freezeTitle")}</p><p className="mt-1 leading-6">{t("inventarizatsiya.createModal.freezeWarning")}</p></div>
              </div>

              <section className="mt-5 rounded-[26px] border border-blue-100 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">{t("inventarizatsiya.createModal.itemsTitle")}</h3>
                    <p className="mt-1 text-xs font-medium text-slate-400">{t("inventarizatsiya.createModal.itemsSubtitle")}</p>
                  </div>
                  {warehouseId && !qoldiqYuklanmoqda && (
                    <span className="inline-flex h-9 w-fit items-center rounded-xl bg-blue-50 px-3 text-xs font-black text-blue-700">{t("inventarizatsiya.createModal.itemsCount", { count: inventarizatsiyaQatorlari.length })}</span>
                  )}
                </div>

                {warehouseId && !qoldiqYuklanmoqda && <>
                  <div className="mb-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-blue-50 p-3"><span className="text-xs font-bold text-blue-700">{t("inventarizatsiya.createModal.totalRows")}</span><p className="mt-1 text-xl font-black text-slate-900">{inventarizatsiyaQatorlari.length}</p></div>
                    <div className="rounded-2xl bg-emerald-50 p-3"><span className="text-xs font-bold text-emerald-700">{t("inventarizatsiya.createModal.counted")}</span><p className="mt-1 text-xl font-black text-emerald-700">{sanoqXulosasi.counted}</p></div>
                    <div className="rounded-2xl bg-amber-50 p-3"><span className="text-xs font-bold text-amber-700">{t("inventarizatsiya.createModal.uncounted")}</span><p className="mt-1 text-xl font-black text-amber-700">{sanoqXulosasi.uncounted.length + sanoqXulosasi.invalid.length}</p></div>
                  </div>
                  <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" checked={blindCount} onChange={(event) => setBlindCount(event.target.checked)} className="h-4 w-4 accent-blue-600" />{t("inventarizatsiya.createModal.blindCount")}</label>
                    <span className="text-xs text-slate-500">{t("inventarizatsiya.createModal.blindCountHint")}</span>
                  </div>
                  <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                    <label htmlFor="inventory-barcode" className="flex items-center gap-2 text-sm font-black text-blue-800"><ScanLine size={18} />{t("inventarizatsiya.createModal.scanTitle")}</label>
                    <div className="mt-2 flex gap-2"><input id="inventory-barcode" value={barcodeInput} onChange={(event) => setBarcodeInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); barcodeSanash(); } }} placeholder={t("inventarizatsiya.createModal.scanPlaceholder")} className="h-11 min-w-0 flex-1 rounded-xl border border-blue-200 bg-white px-3 outline-none focus:border-blue-500" /><button type="button" onClick={barcodeSanash} disabled={!barcodeInput.trim()} className="rounded-xl bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-50">{t("inventarizatsiya.createModal.scanButton")}</button></div>
                    <p className="mt-2 text-xs text-slate-500">{t("inventarizatsiya.createModal.scanHint")}</p>
                    {scanFeedback && <p role="status" className="mt-2 text-xs font-bold text-blue-700">{scanFeedback}</p>}
                  </div>
                  <p className="mb-3 text-xs font-medium text-slate-500">{t("inventarizatsiya.createModal.locationBackendHint")}</p>
                </>}

                {qoldiqYuklanmoqda ? (
                  <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-200 bg-blue-50/40 text-sm font-bold text-slate-400">
                    <LoaderCircle size={24} className="animate-spin text-blue-600" />
                    {t("inventarizatsiya.createModal.stockLoading")}
                  </div>
                ) : !warehouseId ? (
                  <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-200 bg-blue-50/40 text-sm font-bold text-slate-400">
                    <Warehouse size={24} className="text-blue-300" />
                    {t("inventarizatsiya.createModal.selectWarehouseHint")}
                  </div>
                ) : (
                  <div className="mt-4 overflow-x-auto rounded-2xl border border-blue-100 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-blue-400 [&::-webkit-scrollbar-track]:bg-blue-50">
                    <table className="w-full min-w-[1430px] text-left text-sm">
                      <thead className="bg-[#F4F8FF] text-xs font-black uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-4">{t("inventarizatsiya.createModal.table.number")}</th>
                          <th className="px-4 py-4">{t("inventarizatsiya.createModal.table.product")}</th>
                          <th className="px-4 py-4">{t("inventarizatsiya.createModal.table.barcode")}</th>
                          <th className="px-4 py-4">{t("inventarizatsiya.createModal.table.warehouse")}</th>
                          <th className="px-4 py-4">{t("inventarizatsiya.createModal.table.location")}</th>
                          <th className="px-4 py-4">{t("inventarizatsiya.createModal.table.batchSerial")}</th>
                          <th className="px-4 py-4">{t("inventarizatsiya.createModal.table.systemStock")}</th>
                          <th className="px-4 py-4">{t("inventarizatsiya.createModal.table.actualQuantity")}</th>
                          <th className="px-4 py-4">{t("inventarizatsiya.createModal.table.countStatus")}</th>
                          <th className="px-4 py-4">{t("inventarizatsiya.createModal.table.difference")}</th>
                          <th className="px-4 py-4" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-50">
                        {inventarizatsiyaQatorlari.map((qoldiq, index) => {
                          const tizim = qoldiqMiqdori(qoldiq);
                          const haqiqiyRaw = actuals[qoldiq.modificationId] ?? "";
                          const haqiqiy = Number(haqiqiyRaw);
                          const sanaldi = haqiqiyRaw.trim() !== "" && Number.isFinite(haqiqiy) && haqiqiy >= 0;
                          const farq = sanaldi ? haqiqiy - tizim : null;
                          const qolQoshilgan = tanlanganModifikatsiyaIds.includes(qoldiq.modificationId);
                          return (
                            <tr key={`${qoldiq.modificationId}-${index}`}>
                              <td className="px-4 py-4 text-slate-400">{index + 1}</td>
                              <td className="px-4 py-4 font-black text-slate-900">{modificationNomi(qoldiq.modification)}</td>
                              <td className="px-4 py-4 text-slate-500">{qoldiq.modification?.barcode ?? "—"}</td>
                              <td className="px-4 py-4">{qoldiq.warehouse?.name ?? omborMap.get(warehouseId) ?? t("inventarizatsiya.unknownWarehouse")}</td>
                              <td className="px-4 py-3"><input disabled placeholder="—" title={t("inventarizatsiya.createModal.locationBackendHint")} className="h-10 w-24 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-400" /></td>
                              <td className="px-4 py-3"><input disabled placeholder="—" title={t("inventarizatsiya.createModal.locationBackendHint")} className="h-10 w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-400" /></td>
                              <td className="px-4 py-4 font-bold text-slate-600">{blindCount ? "•••" : tizim}</td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={haqiqiyRaw}
                                  placeholder={t("inventarizatsiya.createModal.quantityPlaceholder")}
                                  onChange={(event) => {
                                    setFormaXatosi(null);
                                    setActuals((oldingi) => ({ ...oldingi, [qoldiq.modificationId]: event.target.value }));
                                  }}
                                  className="h-10 w-32 rounded-xl border border-blue-100 bg-white px-3 font-bold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                  aria-label={t("inventarizatsiya.createModal.actualQuantityAria", { name: modificationNomi(qoldiq.modification) })}
                                />
                              </td>
                              <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${sanaldi ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{t(sanaldi ? "inventarizatsiya.createModal.counted" : "inventarizatsiya.createModal.uncounted")}</span></td>
                              <td className={`px-4 py-4 font-black ${farq == null || farq === 0 ? "text-slate-400" : farq > 0 ? "text-emerald-600" : "text-red-500"}`}>
                                {blindCount || farq == null ? "—" : farq > 0 ? `+${farq}` : farq}
                              </td>
                              <td className="px-4 py-4 text-right">
                                {qolQoshilgan && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTanlanganModifikatsiyaIds((oldingi) => oldingi.filter((id) => id !== qoldiq.modificationId));
                                      setActuals((oldingi) => {
                                        const keyingi = { ...oldingi };
                                        delete keyingi[qoldiq.modificationId];
                                        return keyingi;
                                      });
                                    }}
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                                    aria-label={t("inventarizatsiya.createModal.removeRowAria")}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {tanlanmaganTanlovlar.length > 0 && (
                          <tr>
                            <td className="px-4 py-3 text-slate-400">{inventarizatsiyaQatorlari.length + 1}</td>
                            <td className="px-4 py-3">
                              <div ref={mahsulotSearchRef} className="relative">
                                <input
                                  value={mahsulotQidiruv}
                                  onChange={(event) => {
                                    setMahsulotQidiruv(event.target.value);
                                    setMahsulotDropdownOchiq(true);
                                  }}
                                  onFocus={() => setMahsulotDropdownOchiq(true)}
                                  aria-label={t("inventarizatsiya.createModal.table.product")}
                                  placeholder={t("inventarizatsiya.createModal.selectProduct")}
                                  className="h-10 w-full min-w-64 rounded-xl border border-blue-100 bg-white px-3 font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                />
                              </div>
                              {mahsulotDropdownOchiq &&
                                createPortal(
                                  <div
                                    ref={mahsulotMenyuRef}
                                    className="fixed z-100000 max-h-64 overflow-y-auto rounded-2xl border border-blue-100 bg-white p-1.5 shadow-[0_18px_44px_rgba(15,23,42,.16)]"
                                    style={{ top: mahsulotMenyuJoylashuvi.top, left: mahsulotMenyuJoylashuvi.left, width: Math.max(mahsulotMenyuJoylashuvi.width, 256) }}
                                  >
                                    {mahsulotQidiruviMoslari.map((qoldiq) => (
                                      <button
                                        key={qoldiq.modificationId}
                                        type="button"
                                        onClick={() => mahsulotQoshish(qoldiq.modificationId)}
                                        className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-blue-50"
                                      >
                                        <span className="truncate">{modificationNomi(qoldiq.modification)}</span>
                                        {qoldiq.modification?.barcode && (
                                          <span className="shrink-0 text-xs font-semibold text-slate-400">{qoldiq.modification.barcode}</span>
                                        )}
                                      </button>
                                    ))}
                                    {mahsulotQidiruviMoslari.length === 0 && (
                                      <p className="px-3 py-2.5 text-xs font-semibold text-slate-400">{t("inventarizatsiya.createModal.searchEmpty")}</p>
                                    )}
                                  </div>,
                                  document.body
                                )}
                            </td>
                            <td colSpan={9} className="px-4 py-3 text-sm text-slate-400">{t("inventarizatsiya.createModal.addNextProductHint")}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
              </> : <div className="space-y-5">
                <div className="rounded-[26px] border border-blue-100 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900">{t("inventarizatsiya.createModal.reviewTitle")}</h3>
                  <p className="mt-1 text-sm text-slate-500">{omborMap.get(warehouseId)} · {t(type === "FULL" ? "inventarizatsiya.typeFull" : "inventarizatsiya.typePartial")}</p>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {[
                      ["totalRows", inventarizatsiyaQatorlari.length, "text-slate-900"],
                      ["counted", sanoqXulosasi.counted, "text-emerald-700"],
                      ["uncounted", sanoqXulosasi.uncounted.length + sanoqXulosasi.invalid.length, "text-amber-700"],
                      ["surplus", `+${sanoqXulosasi.surplus}`, "text-emerald-700"],
                      ["shortage", sanoqXulosasi.shortage ? `-${sanoqXulosasi.shortage}` : "0", "text-red-600"],
                    ].map(([key, value, color]) => <div key={key} className="rounded-2xl bg-slate-50 p-3"><p className="text-xs font-bold text-slate-500">{t(`inventarizatsiya.createModal.${key}`)}</p><p className={`mt-1 text-xl font-black ${color}`}>{value}</p></div>)}
                  </div>
                </div>
                {sanoqXulosasi.uncounted.length > 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-black">{t("inventarizatsiya.createModal.uncountedWarning", { count: sanoqXulosasi.uncounted.length })}</p><p className="mt-2 leading-6">{sanoqXulosasi.uncounted.join(", ")}</p><p className="mt-2 text-xs">{t("inventarizatsiya.createModal.uncountedBackendHint")}</p></div>}
                {sanoqXulosasi.invalid.length > 0 && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{t("inventarizatsiya.createModal.errors.invalidQuantity", { name: sanoqXulosasi.invalid[0] })}</div>}
                <div className="rounded-[26px] border border-blue-100 bg-white p-5 shadow-sm">
                  <h3 className="font-black text-slate-900">{t("inventarizatsiya.createModal.varianceTitle")}</h3>
                  {sanoqXulosasi.variances.length === 0 ? <p className="mt-3 text-sm text-slate-500">{t("inventarizatsiya.createModal.noVariance")}</p> : <div className="mt-3 max-h-48 divide-y divide-slate-100 overflow-y-auto">{sanoqXulosasi.variances.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="font-semibold text-slate-700">{item.name} <span className="font-normal text-slate-400">({item.system} → {item.actual})</span></span><span className={`font-black ${item.difference > 0 ? "text-emerald-700" : "text-red-600"}`}>{item.difference > 0 ? "+" : ""}{item.difference}</span></div>)}</div>}
                  {sanoqXulosasi.variances.length > 0 && <><label htmlFor="inventory-variance-reason" className="mt-4 block text-sm font-bold text-slate-700">{t("inventarizatsiya.createModal.varianceReason")}{reviewAction === "confirm" ? " *" : ""}</label><textarea id="inventory-variance-reason" value={note} onChange={(event) => setNote(event.target.value)} rows={2} placeholder={t("inventarizatsiya.createModal.varianceReasonPlaceholder")} className="mt-2 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500" /><p className="mt-2 text-xs text-slate-500">{t("inventarizatsiya.createModal.variancePolicyHint")}</p></>}
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><div className="flex gap-2"><AlertTriangle size={19} className="shrink-0 text-amber-600" /><div><p className="font-black">{t("inventarizatsiya.createModal.freezeTitle")}</p><p className="mt-1 leading-6">{t("inventarizatsiya.createModal.freezeWarning")}</p></div></div><label className="mt-4 flex cursor-pointer items-start gap-2 font-bold"><input type="checkbox" checked={freezeAcknowledged} onChange={(event) => setFreezeAcknowledged(event.target.checked)} className="mt-1 h-4 w-4 accent-amber-600" />{t("inventarizatsiya.createModal.freezeAcknowledgement")}</label></div>
                {reviewAction === "confirm" && sanoqXulosasi.variances.length > 0 && <label className="flex cursor-pointer items-start gap-2 rounded-2xl border border-blue-100 bg-white p-4 text-sm font-bold text-slate-700"><input type="checkbox" checked={varianceAcknowledged} onChange={(event) => setVarianceAcknowledged(event.target.checked)} className="mt-0.5 h-4 w-4 accent-blue-600" />{t("inventarizatsiya.createModal.varianceAcknowledgement")}</label>}
                {(formaXatosi || store.xatolik) && <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">{formaXatosi ? t(formaXatosi.key, formaXatosi.params) : store.xatolik}</div>}
              </div>}
            </div>

            <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-blue-100 bg-white/75 px-5 py-4 sm:flex-row sm:justify-end sm:px-8">
              <button
                type="button"
                onClick={formaniYopish}
                disabled={store.amalBajarilmoqda}
                className="h-12 rounded-2xl bg-slate-100 px-7 text-sm font-black text-slate-600 hover:bg-slate-200 disabled:opacity-50"
              >
                {t("inventarizatsiya.createModal.cancel")}
              </button>
              {reviewAction ? <>
              <button type="button" onClick={() => { setReviewAction(null); setFormaXatosi(null); }} disabled={store.amalBajarilmoqda} className="h-12 rounded-2xl border border-blue-200 bg-white px-7 text-sm font-black text-blue-700 disabled:opacity-50">{t("inventarizatsiya.createModal.backToCount")}</button>
              <button type="button" onClick={() => void yaratish()} disabled={store.amalBajarilmoqda || !freezeAcknowledged || sanoqXulosasi.uncounted.length > 0 || sanoqXulosasi.invalid.length > 0 || (reviewAction === "confirm" && sanoqXulosasi.variances.length > 0 && (!note.trim() || !varianceAcknowledged))} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-7 text-sm font-black text-white shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{store.amalBajarilmoqda && <LoaderCircle size={17} className="animate-spin" />}{t(reviewAction === "confirm" ? "inventarizatsiya.createModal.confirmFinal" : "inventarizatsiya.createModal.saveFinal")}</button>
              </> : <>
              <button
                type="button"
                onClick={() => koribChiqish("save")}
                disabled={store.amalBajarilmoqda || qoldiqYuklanmoqda || !warehouseId}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-blue-300 bg-white px-7 text-sm font-black text-blue-700 disabled:opacity-50"
              >
                {store.amalBajarilmoqda && <LoaderCircle size={17} className="animate-spin" />}
                {t("inventarizatsiya.createModal.save")}
              </button>
              <button
                type="button"
                onClick={() => koribChiqish("confirm")}
                disabled={store.amalBajarilmoqda || qoldiqYuklanmoqda || !warehouseId}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-7 text-sm font-black text-white shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50"
              >
                {store.amalBajarilmoqda && <LoaderCircle size={17} className="animate-spin" />}
                {t("inventarizatsiya.createModal.saveAndConfirm")}
              </button>
              </>}
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
