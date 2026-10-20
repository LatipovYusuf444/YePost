import AppSelect from "@/Components/ui/AppSelect";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Check, ClipboardList, FileText, Filter, Info, LoaderCircle, Lock, MessageSquareText, Package, Plus, ScanLine, Search, Settings, Trash2, UserRound, Warehouse } from "lucide-react";
import { useTranslation } from "react-i18next";
import AppModal from "@/Components/common/AppModal";
import HujjatSanasiMaydoni, { KiritilganBelgisi } from "@/Components/common/HujjatSanasi";
import DateRangePicker from "@/Components/ui/DateRangePicker";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { omborQoldiqlari } from "@/api/omborApi";
import { useOmborStore } from "@/store/omborStore";
import { bugungiToshkentKuni, kunMatni, toshkentKuni, yangiHujjatSanasi } from "@/lib/hujjatSanasi";
import type { InventarizatsiyaTuri, OmborQoldigi } from "@/types/ombor";
import { holat, hujjatRaqami, mahsulotQidiruvi, modificationNomi, qoldiqMiqdori, sana } from "./omborYordamchilari";
import InventoryHujjatModal from "./InventoryHujjatModal";
import HujjatStatistikaKartalari from "./HujjatStatistikaKartalari";
import OmborJadval from "./OmborJadval";
import TablePagination from "@/Components/common/TablePagination";
import HujjatOchirish from "@/Components/common/HujjatOchirish";

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

// Yangi inventarizatsiyada faqat qidirib qo'shilgan mahsulotlar sanaladi, ombordagi qolganlarga tegilmaydi.
const YARATISH_TURI: InventarizatsiyaTuri = "PARTIAL";

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

// Backend hisoblaydigan umumiy qoldiq: rezerv qilingan miqdor ham kiradi (availableQuantity emas).
function tizimQoldigi(qoldiq: OmborQoldigi) {
  const raw = qoldiq as OmborQoldigi & { quantity?: number | string; balance?: number | string; availableQuantity?: number | string };
  const qiymatlar = [raw.quantity, raw.balance, raw.availableQuantity].map((value) => Number(value)).filter((value) => Number.isFinite(value) && value >= 0);
  return qiymatlar.length ? Math.max(...qiymatlar) : 0;
}

export default function Inventarizatsiya() {
  const { t } = useTranslation("ombor_harakat");
  const store = useOmborStore();
  const malumotlarniYuklashAgarKerak = store.malumotlarniYuklashAgarKerak;
  const joriyProfil = useAuthProfileStore((state) => state.profil);
  const profilniYuklash = useAuthProfileStore((state) => state.profilniYuklash);
  const [modal, setModal] = useState(false);
  const [tanlanganId, setTanlanganId] = useState<string | null>(null);
  const [warehouseId, setWarehouseId] = useState("");
  const [responsibleId, setResponsibleId] = useState("");
  // Hujjat sanasi: bugun yoki o'tgan kun (kelajak yo'q); o'tgan kun tanlansa backend hujjatni shu kunning oxirida yozadi.
  const [hujjatSanasi, setHujjatSanasi] = useState(() => bugungiToshkentKuni());
  const [actuals, setActuals] = useState<Record<string, string>>({});
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scanFeedback, setScanFeedback] = useState("");
  const [reviewAction, setReviewAction] = useState<"save" | "confirm" | null>(null);
  const [tanlanganModifikatsiyaIds, setTanlanganModifikatsiyaIds] = useState<string[]>([]);
  const [mahsulotQidiruv, setMahsulotQidiruv] = useState("");
  const [mahsulotDropdownOchiq, setMahsulotDropdownOchiq] = useState(false);
  // Ro'yxat pastga ochilsa `top`, yuqoriga ochilsa `bottom` bilan inputga bog'lanadi: natija kam bo'lsa ham input yonida turadi.
  const [mahsulotMenyuJoylashuvi, setMahsulotMenyuJoylashuvi] = useState<{ top?: number; bottom?: number; maxHeight?: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
  const mahsulotSearchRef = useRef<HTMLDivElement | null>(null);
  const mahsulotMenyuRef = useRef<HTMLDivElement | null>(null);
  // Klaviatura bilan boshqarish: ro'yxatdagi faol variant, qidiruv/shtrix-kod maydonlari va jadval.
  const [mahsulotFaolIndeks, setMahsulotFaolIndeks] = useState(-1);
  const [fokusNavbati, setFokusNavbati] = useState(0);
  const mahsulotInputRef = useRef<HTMLInputElement | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const jadvalRef = useRef<HTMLDivElement | null>(null);
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
    setMahsulotMenyuJoylashuvi(
      pastgaTop + menyuBalandligi <= window.innerHeight - 12
        ? { top: pastgaTop, left: rect.left, width: rect.width }
        : {
            bottom: window.innerHeight - rect.top + 4,
            maxHeight: Math.max(80, Math.min(menyuBalandligi, rect.top - 16)),
            left: rect.left,
            width: rect.width,
          }
    );
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
  // Omborda hali hech qachon qoldig'i bo'lmagan (Kirim qilinmagan) mahsulotlarni ham qidirib
  // qo'shish mumkin — boshlang'ich qoldiqni Kirimsiz kiritish uchun.
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

  // Jadvalda faqat qidirib (yoki shtrix-kod bilan) qo'shilgan mahsulotlar turadi: ombordagi
  // barcha qoldiq avtomatik chiqmaydi, backend ham faqat ro'yxatdagilarni tuzatadi.
  const inventarizatsiyaQatorlari = useMemo(() => {
    const tanlovByModification = new Map(barchaTanlovlar.map((qoldiq) => [qoldiq.modificationId, qoldiq]));
    return tanlanganModifikatsiyaIds
      .map((modificationId) => tanlovByModification.get(modificationId))
      .filter((qoldiq): qoldiq is OmborQoldigi => Boolean(qoldiq));
  }, [barchaTanlovlar, tanlanganModifikatsiyaIds]);

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
      // Faqat ortiqcha (musbat) farq qoldiqqa qo'shiladi; kamomad ombordan ayirilmaydi.
      if (difference > 0) variances.push({ id: row.modificationId, name: modificationNomi(row.modification), system, actual, difference });
    }
    return { counted, uncounted, invalid, surplus, shortage, variances };
  }, [actuals, inventarizatsiyaQatorlari]);

  // "Mahsulot qo'shish" ro'yxatida hali qatorga kiritilmagan tanlovlar — FULL turida
  // avtomatik qoldiqlar ham hisobga olinadi (ularni qayta taklif qilmaslik uchun).
  const tanlanmaganTanlovlar = useMemo(() => {
    const kiritilganIds = new Set(inventarizatsiyaQatorlari.map((qoldiq) => qoldiq.modificationId));
    return barchaTanlovlar.filter((qoldiq) => !kiritilganIds.has(qoldiq.modificationId));
  }, [barchaTanlovlar, inventarizatsiyaQatorlari]);

  // Qidiruv maydoni ro'yxat ostida qotirilgan: yangi qator qo'shilganda ro'yxat pastiga siljiydi.
  useEffect(() => {
    const royxat = jadvalRef.current;
    if (royxat) royxat.scrollTop = royxat.scrollHeight;
  }, [inventarizatsiyaQatorlari.length]);

  // Qidiruv matniga mos tanlovlar — mahsulot nomi, shtrix-kod yoki artikul bo'yicha qidiriladi.
  // Tartib backend qidiruvi bilan bir xil (aniq mos kelgani birinchi), chunki Enter birinchi natijani qo'shadi.
  // Qidiruv matni bo'sh bo'lsa hech narsa ko'rsatilmaydi: ro'yxat faqat yozilgandan keyin chiqadi.
  const qidiruvYozilgan = mahsulotQidiruv.trim().length > 0;
  const mahsulotQidiruviMoslari = useMemo(
    () => (qidiruvYozilgan ? mahsulotQidiruvi(tanlanmaganTanlovlar, mahsulotQidiruv) : []),
    [qidiruvYozilgan, tanlanmaganTanlovlar, mahsulotQidiruv]
  );
  const mahsulotRoyxatiKorinadi = mahsulotDropdownOchiq && qidiruvYozilgan;

  function mahsulotQoshish(modificationId: string) {
    if (qoldiqYuklanmoqda) return;
    const qoldiq = barchaTanlovlar.find((item) => item.modificationId === modificationId);
    if (!qoldiq) return;
    // Tez-tez bosilgan Enter yoki ikki marta bosish bitta mahsulotni ikki marta qo'shmasin.
    if (inventarizatsiyaQatorlari.some((item) => item.modificationId === modificationId)) return;
    setTanlanganModifikatsiyaIds((oldingi) => (oldingi.includes(modificationId) ? oldingi : [...oldingi, modificationId]));
    setMahsulotQidiruv("");
    // Qidiruv matni tozalandi: keyingi mahsulot yozilmaguncha ro'yxat yopiq turadi.
    setMahsulotDropdownOchiq(false);
    setMahsulotFaolIndeks(-1);
    // Yangi qator qo'shilgach fokus yana mahsulot qidiruv maydoniga qaytadi (keyingi mahsulot uchun).
    setFokusNavbati((navbat) => navbat + 1);
  }

  // Qidiruv maydonida: ↑/↓ — ro'yxatda yurish, Enter — tanlangan mahsulotni qo'shish, Escape — ro'yxatni yopish.
  function mahsulotKlavishi(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    const moslar = mahsulotQidiruviMoslari;
    // ↑ ro'yxatning boshida (yoki ro'yxat yopiq bo'lsa) jadvalning oxirgi qatoriga, ya'ni miqdor maydoniga o'tadi:
    // yuqoridagi xatoni sichqonsiz tuzatish uchun. Yozilgan qidiruv matni saqlanadi.
    if (event.key === "ArrowUp" && (!mahsulotRoyxatiKorinadi || mahsulotFaolIndeks <= 0)) {
      const maydonlar = jadvalRef.current?.querySelectorAll<HTMLInputElement>("input[data-inventory-qty]");
      const oxirgi = maydonlar?.[maydonlar.length - 1];
      if (oxirgi) {
        event.preventDefault();
        setMahsulotDropdownOchiq(false);
        setMahsulotFaolIndeks(-1);
        oxirgi.focus();
        oxirgi.select();
        return;
      }
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      // Hali hech narsa yozilmagan: ro'yxat ochilmaydi.
      if (moslar.length === 0) {
        if (qidiruvYozilgan) setMahsulotDropdownOchiq(true);
        return;
      }
      const pastga = event.key === "ArrowDown";
      let keyingi: number;
      if (!mahsulotDropdownOchiq) keyingi = pastga ? 0 : moslar.length - 1;
      else if (pastga) keyingi = (mahsulotFaolIndeks + 1) % moslar.length;
      else keyingi = mahsulotFaolIndeks <= 0 ? moslar.length - 1 : mahsulotFaolIndeks - 1;
      setMahsulotDropdownOchiq(true);
      setMahsulotFaolIndeks(keyingi);
      window.requestAnimationFrame(() => {
        document.getElementById(`inventory-product-option-${keyingi}`)?.scrollIntoView({ block: "nearest" });
      });
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      if (!mahsulotDropdownOchiq) {
        // Ro'yxat Escape bilan yopilgan bo'lsa, Enter uni qayta ochadi (mahsulot qo'shilmaydi).
        if (mahsulotQidiruv.trim()) {
          setMahsulotDropdownOchiq(true);
          setMahsulotFaolIndeks(0);
        }
        return;
      }
      const tanlangan = moslar[mahsulotFaolIndeks];
      if (tanlangan) mahsulotQoshish(tanlangan.modificationId);
      return;
    }
    if (event.key === "Escape" && mahsulotRoyxatiKorinadi) {
      event.preventDefault();
      event.stopPropagation();
      setMahsulotDropdownOchiq(false);
      setMahsulotFaolIndeks(-1);
      return;
    }
    if (event.key === "Tab") setMahsulotDropdownOchiq(false);
  }

  // Miqdor maydonlari orasida Excel kabi yurish: ↓/Enter — keyingi qator, ↑/Shift+Enter — oldingi qator.
  // Oxirgi qatordan pastga mahsulot qidiruviga o'tadi; birinchi qatordan yuqoriga o'tilmaydi.
  function miqdorlarOrasidaYurish(joriy: HTMLInputElement, yonalish: 1 | -1) {
    const maydonlar = Array.from(jadvalRef.current?.querySelectorAll<HTMLInputElement>("input[data-inventory-qty]") ?? []);
    const keyingi = maydonlar[maydonlar.indexOf(joriy) + yonalish];
    if (keyingi) {
      keyingi.focus();
      keyingi.select();
      return;
    }
    if (yonalish === 1) mahsulotInputRef.current?.focus();
  }

  useEffect(() => {
    if (fokusNavbati === 0) return;
    const qidiruv = mahsulotInputRef.current;
    if (qidiruv) {
      if (document.activeElement !== qidiruv) qidiruv.focus({ preventScroll: true });
      qidiruv.scrollIntoView({ block: "nearest" });
      // Qidiruv qatori pastga siljigan: ochiq ro'yxat yangi joyga ko'chadi.
      mahsulotMenyuJoylashuviniYangilash();
      return;
    }
    // Barcha mahsulotlar qo'shib bo'lingan: qidiruv qatori yo'q, oxirgi miqdor maydoniga o'tamiz.
    const maydonlar = jadvalRef.current?.querySelectorAll<HTMLInputElement>("input[data-inventory-qty]");
    maydonlar?.[maydonlar.length - 1]?.focus();
  }, [fokusNavbati, mahsulotMenyuJoylashuviniYangilash]);

  function barcodeSanash() {
    const code = barcodeInput.trim().toLowerCase();
    if (!warehouseId || !code) return;
    const matches = barchaTanlovlar.filter((row) => row.modification?.barcode?.trim().toLowerCase() === code);
    if (matches.length !== 1) {
      setScanFeedback(t(matches.length ? "inventarizatsiya.createModal.scanAmbiguous" : "inventarizatsiya.createModal.scanNotFound"));
      // Keyingi skan xato kod bilan qo'shilib ketmasligi uchun matn belgilab qo'yiladi (yangi skan uni almashtiradi).
      barcodeInputRef.current?.select();
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
    // "Sanash" tugmasi bosilgan bo'lsa ham fokus shtrix-kod maydonida qoladi — keyingi skanga tayyor.
    barcodeInputRef.current?.focus();
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
        sana(item.date ?? item.createdAt),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
      const status = String(item.status ?? "DRAFT").toUpperCase();
      // Hujjat sanasi (`date`, Toshkent kuni); eski yozuvlarda — yaratilgan kun.
      const hujjatKuni = toshkentKuni(item.date ?? item.createdAt);
      return matnMos &&
        (holatFiltri === "ALL" || status === holatFiltri || (holatFiltri === "CANCELLED" && status === "CANCELED")) &&
        (omborFiltri === "ALL" || item.warehouseId === omborFiltri) &&
        (!sanaDan || Boolean(hujjatKuni && hujjatKuni >= sanaDan)) &&
        (!sanaGacha || Boolean(hujjatKuni && hujjatKuni <= sanaGacha));
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
    if (ustun === "yaratilgan") {
      return (
        <span className="whitespace-nowrap">
          {sana(item.date ?? item.createdAt)}
          <KiritilganBelgisi date={item.date} createdAt={item.createdAt} />
        </span>
      );
    }
    if (ustun === "ombor") return item.warehouse?.name ?? omborMap.get(item.warehouseId) ?? t("inventarizatsiya.unknownWarehouse");
    if (ustun === "masul") return masul?.fullName ?? masul?.username ?? masul?.name ?? t("inventarizatsiya.unassigned");
    return item.type === "PARTIAL" ? t("inventarizatsiya.typePartial") : t("inventarizatsiya.typeFull");
  }

  function formaniOchish() {
    store.xatolikniTozalash();
    setWarehouseId("");
    setResponsibleId(joriyProfil?.id ?? "");
    setHujjatSanasi(bugungiToshkentKuni());
    setActuals({});
    setBarcodeInput("");
    setScanFeedback("");
    setReviewAction(null);
    setTanlanganModifikatsiyaIds([]);
    setMahsulotQidiruv("");
    setMahsulotDropdownOchiq(false);
    setMahsulotFaolIndeks(-1);
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
    setMahsulotFaolIndeks(-1);
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
  }

  async function yaratish() {
    if (!reviewAction) return;
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
    // Ombor qoldig'i hech qachon kamaytirilmaydi: backend farqni (haqiqiy - tizim) bo'yicha FIFO
    // tuzatish qiladi, shuning uchun haqiqiy miqdor eng kamida joriy tizim qoldig'iga tenglashtiriladi.
    // Sotuvlar tufayli o'zgargan bo'lishi mumkinligi uchun qoldiq yuborishdan oldin qayta olinadi.
    const joriyQoldiq = new Map<string, number>();
    for (const qoldiq of inventarizatsiyaQatorlari) joriyQoldiq.set(qoldiq.modificationId, tizimQoldigi(qoldiq));
    try {
      const yangiQoldiqlar = await omborQoldiqlari(warehouseId);
      const yigindi = new Map<string, number>();
      for (const qoldiq of yangiQoldiqlar) {
        yigindi.set(qoldiq.modificationId, (yigindi.get(qoldiq.modificationId) ?? 0) + tizimQoldigi(qoldiq));
      }
      for (const [modificationId, miqdor] of yigindi) {
        joriyQoldiq.set(modificationId, Math.max(miqdor, joriyQoldiq.get(modificationId) ?? 0));
      }
    } catch {
      // Yangilab bo'lmasa, ekrandagi qoldiq bilan davom etiladi
    }

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
        actualQuantity: Math.max(actualQuantity, joriyQoldiq.get(qoldiq.modificationId) ?? 0),
      });
    }

    const hujjat = await store.inventarizatsiyaYaratish({
      ...yangiHujjatSanasi(hujjatSanasi),
      warehouseId,
      type: YARATISH_TURI,
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

      <HujjatStatistikaKartalari
        labels={[t("inventarizatsiya.stats.total"), t("inventarizatsiya.stats.completed"), t("inventarizatsiya.stats.inProgress"), t("inventarizatsiya.stats.cancelled")]}
        values={[inventarizatsiyaStatistikasi.jami, inventarizatsiyaStatistikasi.tugallangan, inventarizatsiyaStatistikasi.jarayonda, inventarizatsiyaStatistikasi.bekorQilingan]}
        selected={holatFiltri}
        onSelect={(holat) => { setHolatFiltri(holat); setPage(1); }}
        ariaLabel={t("inventarizatsiya.pageTitle")}
        loading={store.yuklanmoqda && store.inventarizatsiyalar.length === 0}
        loadingText={t("inventarizatsiya.loadingDocuments")}
      />

      <section className="grid gap-3 rounded-2xl border border-blue-100 bg-white p-3 shadow-[0_2px_8px_rgba(37,99,235,.05)] sm:grid-cols-2 lg:grid-cols-[minmax(240px,1fr)_minmax(260px,1.1fr)_minmax(150px,.55fr)_minmax(170px,.65fr)] lg:items-center">
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
                <td className="sticky right-0 bg-white px-5 py-4 text-right group-hover:bg-blue-50/60">
                  <HujjatOchirish
                    guruh="ombor"
                    status={item.status}
                    nom={hujjatRaqami(item)}
                    izoh={String(item.status ?? "").toUpperCase() === "DRAFT" ? t("hujjatOchirish.freezeNote", { ns: "common" }) : undefined}
                    onTasdiq={() => store.inventarizatsiyaOchirish(item.id)}
                    onTiklash={() => store.inventarizatsiyaTiklash(item.id)}
                  />
                </td>
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
        <AppModal onClose={formaniYopish} className="p-4">
          <div className={`flex w-full max-w-[1200px] flex-col overflow-hidden rounded-[32px] bg-[#F4F5F9] shadow-[0_44px_120px_-24px_rgba(8,14,40,.7)] ring-1 ring-slate-900/10 ${reviewAction ? "max-h-[min(94vh,940px)]" : "h-[min(94vh,940px)]"}`} style={INVENTORY_BLUE_THEME}>
            <header className="relative shrink-0 overflow-hidden bg-gradient-to-br from-[#0B1330] via-[#101C4A] to-[#1B2E6E] px-5 py-5 sm:px-8">
              <div aria-hidden className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-amber-300/15 blur-3xl" />
              <div aria-hidden className="pointer-events-none absolute -bottom-16 left-24 h-40 w-72 rounded-full bg-blue-400/15 blur-3xl" />
              <div className="relative flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-200 via-amber-300 to-amber-500 text-[#0B1330] shadow-[0_10px_28px_-6px_rgba(251,191,36,.6)] ring-1 ring-white/50"><ClipboardList size={22} strokeWidth={2.2} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">{t("inventarizatsiya.createModal.title")}</h2>
                    <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-2.5 py-0.5 text-[11px] font-black tracking-wide text-amber-200">{t(reviewAction ? "inventarizatsiya.createModal.reviewBadge" : "inventarizatsiya.createModal.newBadge")}</span>
                  </div>
                  {(warehouseId || hujjatSanasi) && (
                    <p className="mt-1 truncate text-xs font-semibold tracking-wide text-slate-300">
                      {[omborMap.get(warehouseId), kunMatni(hujjatSanasi)].filter(Boolean).join("  ·  ")}
                    </p>
                  )}
                </div>
                <ol className="hidden shrink-0 items-center gap-2.5 sm:flex" aria-label={t("inventarizatsiya.createModal.steps.aria")}>
                  {(["fill", "review"] as const).map((qadam, indeks) => {
                    const faol = indeks === 0 ? !reviewAction : Boolean(reviewAction);
                    const tugagan = indeks === 0 && Boolean(reviewAction);
                    return (
                      <li key={qadam} className="flex items-center gap-2.5" aria-current={faol ? "step" : undefined}>
                        {indeks > 0 && <span className={`h-px w-8 ${reviewAction ? "bg-amber-300/70" : "bg-white/20"}`} aria-hidden />}
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black transition ${tugagan ? "bg-emerald-400 text-[#0B1330]" : faol ? "bg-amber-300 text-[#0B1330] shadow-[0_0_0_4px_rgba(252,211,77,.18)]" : "bg-white/10 text-slate-400"}`}>
                          {tugagan ? <Check size={14} strokeWidth={3} /> : indeks + 1}
                        </span>
                        <span className={`text-xs font-bold tracking-wide ${faol ? "text-white" : "text-slate-400"}`}>{t(`inventarizatsiya.createModal.steps.${qadam}`)}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
              <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
            </header>

            <div className={`flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent ${reviewAction ? "" : "lg:overflow-hidden"}`}>
              {!reviewAction ? <>
              {(formaXatosi || store.xatolik) && (
                <div role="alert" className="flex shrink-0 items-start gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>{formaXatosi ? t(formaXatosi.key, formaXatosi.params) : store.xatolik}</span>
                </div>
              )}
              <div className="grid gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-[330px_minmax(0,1fr)]">
                <aside className="lg:min-h-0 lg:overflow-y-auto lg:pb-2 lg:pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
                  <section className="rounded-[26px] border border-slate-200/70 bg-white p-4 shadow-[0_14px_34px_-20px_rgba(15,23,42,.22)] sm:p-5">
                    <div role="heading" aria-level={3} className="mb-4 flex items-center gap-2.5 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0B1330] text-amber-300 shadow-md shadow-slate-900/20"><ClipboardList size={15} /></span>
                      {t("inventarizatsiya.createModal.aboutTitle")}
                    </div>
                    <div className="grid gap-3.5">
                      <label className="block">
                        <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400">{t("inventarizatsiya.createModal.warehouseLabel")}</span>
                        <AppSelect
                          value={warehouseId}
                          onChange={(event) => void omborTanlash(event.target.value)}
                          // AppSelect ichki tugmaga tashqi paddingni meros qiladi: manfiy chekka tugmani yorliq va boshqa maydonlar bilan tekislaydi.
                          className="-mx-4 h-12 rounded-2xl px-4 text-[15px] font-semibold text-slate-800"
                        >
                          <option value="">{t("inventarizatsiya.createModal.selectWarehouse")}</option>
                          {store.omborlar.map((ombor) => (
                            <option key={ombor.id} value={ombor.id}>{ombor.name}</option>
                          ))}
                        </AppSelect>
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400">{t("inventarizatsiya.createModal.dateLabel")}</span>
                        <HujjatSanasiMaydoni
                          value={hujjatSanasi}
                          onChange={setHujjatSanasi}
                          aria-label={t("inventarizatsiya.createModal.dateLabel")}
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[15px] font-semibold text-slate-800 outline-none transition hover:border-slate-300 focus:border-[#1B2E6E] focus:ring-4 focus:ring-blue-100"
                        />
                      </label>
                      <div className="block">
                        <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400">{t("inventarizatsiya.createModal.responsibleLabel")}</span>
                        <div className="flex h-12 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-[15px] font-semibold text-slate-800">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-amber-400 text-[#0B1330]"><UserRound size={14} /></span>
                          <span className="min-w-0 flex-1 truncate">
                            {joriyProfil?.fullName ?? joriyProfil?.username ?? t("inventarizatsiya.createModal.unknownEmployee")}
                          </span>
                          <Lock size={14} className="shrink-0 text-slate-400" />
                        </div>
                      </div>
                      <label className="block">
                        <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400"><MessageSquareText size={13} className="text-slate-400" />{t("inventarizatsiya.createModal.noteTitle")}</span>
                        <textarea
                          value={note}
                          onChange={(event) => setNote(event.target.value)}
                          rows={3}
                          className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#1B2E6E] focus:ring-4 focus:ring-blue-100"
                          placeholder={t("inventarizatsiya.createModal.notePlaceholder")}
                        />
                        <p className="mt-2 flex items-start gap-1.5 text-[11px] font-medium leading-4 text-slate-400">
                          <Info size={12} className="mt-px shrink-0" />
                          {t("inventarizatsiya.createModal.noteHelper")}
                        </p>
                      </label>
                    </div>
                  </section>

                  {warehouseId && !qoldiqYuklanmoqda && (
                    <section className="relative mt-3.5 overflow-hidden rounded-[26px] bg-gradient-to-br from-[#0B1330] via-[#101C4A] to-[#1B2E6E] p-4 text-white shadow-[0_8px_18px_-12px_rgba(11,19,48,.6)]">
                      <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-amber-300/20 blur-2xl" />
                      <div className="relative grid grid-cols-2 gap-x-4 gap-y-3">
                        {[
                          ["totalRows", inventarizatsiyaQatorlari.length, "text-white"],
                          ["counted", sanoqXulosasi.counted, "text-emerald-300"],
                          ["surplus", `+${sanoqXulosasi.surplus}`, "text-amber-200"],
                          ["shortage", sanoqXulosasi.shortage ? `-${sanoqXulosasi.shortage}` : "0", "text-red-300"],
                        ].map(([key, value, rang]) => (
                          <div key={key}>
                            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">{t(`inventarizatsiya.createModal.${key}`)}</p>
                            <p className={`mt-0.5 text-xl font-black tabular-nums ${rang}`}>{value}</p>
                          </div>
                        ))}
                      </div>
                      <div
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={inventarizatsiyaQatorlari.length}
                        aria-valuenow={sanoqXulosasi.counted}
                        className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"
                      >
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-300 to-emerald-300 transition-all duration-300"
                          style={{ width: `${inventarizatsiyaQatorlari.length ? Math.round((sanoqXulosasi.counted / inventarizatsiyaQatorlari.length) * 100) : 0}%` }}
                        />
                      </div>
                    </section>
                  )}
                </aside>

                <section className="flex min-w-0 flex-col rounded-[26px] border border-slate-200/70 bg-white shadow-[0_14px_34px_-20px_rgba(15,23,42,.22)] lg:min-h-0">
                  <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-3 pt-5">
                    <div className="min-w-0">
                      <div role="heading" aria-level={3} className="flex items-center gap-2.5 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0B1330] text-amber-300 shadow-md shadow-slate-900/20"><Package size={15} /></span>
                        {t("inventarizatsiya.createModal.itemsTitle")}
                      </div>
                      <p className="mt-1.5 text-xs font-medium text-slate-400">{t("inventarizatsiya.createModal.itemsSubtitle")}</p>
                    </div>
                    {warehouseId && !qoldiqYuklanmoqda && (
                      <span className="inline-flex h-8 shrink-0 items-center rounded-full bg-[#0B1330] px-3.5 text-xs font-black text-amber-200 shadow-md shadow-slate-900/20">{t("inventarizatsiya.createModal.itemsCount", { count: inventarizatsiyaQatorlari.length })}</span>
                    )}
                  </div>

                  {warehouseId && !qoldiqYuklanmoqda && (
                    <div className="shrink-0 space-y-2.5 px-5 pb-3">
                      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                          <label htmlFor="inventory-barcode" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#1B2E6E]"><ScanLine size={15} />{t("inventarizatsiya.createModal.scanTitle")}</label>
                          <p className="text-[11px] font-medium leading-4 text-slate-500">{t("inventarizatsiya.createModal.scanHint")}</p>
                        </div>
                        <div className="mt-2.5 flex gap-2.5"><input id="inventory-barcode" ref={barcodeInputRef} autoComplete="off" value={barcodeInput} onChange={(event) => setBarcodeInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); if (!event.nativeEvent.isComposing) barcodeSanash(); } }} placeholder={t("inventarizatsiya.createModal.scanPlaceholder")} className="h-12 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-[15px] font-semibold text-slate-800 outline-none transition placeholder:font-medium placeholder:text-slate-400 hover:border-slate-300 focus:border-[#1B2E6E] focus:ring-4 focus:ring-blue-100" /><button type="button" onClick={barcodeSanash} disabled={!barcodeInput.trim()} className="h-12 rounded-2xl bg-gradient-to-b from-[#1C2F72] to-[#0B1330] px-6 text-sm font-black text-white shadow-[0_10px_22px_-10px_rgba(11,19,48,.8)] ring-1 ring-amber-300/30 transition hover:from-[#233A8A] disabled:opacity-40 disabled:shadow-none">{t("inventarizatsiya.createModal.scanButton")}</button></div>
                        {scanFeedback && <p role="status" className="mt-2 text-xs font-bold text-[#1B2E6E]">{scanFeedback}</p>}
                      </div>
                      <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-bold leading-4 text-amber-800 ring-1 ring-amber-200/70">
                        <AlertTriangle size={13} className="mt-px shrink-0" />
                        {t("inventarizatsiya.createModal.addOnlyNote")}
                      </p>
                    </div>
                  )}

                  {qoldiqYuklanmoqda ? (
                    <div className="m-5 mt-2 flex min-h-48 flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 text-sm font-bold text-slate-400">
                      <LoaderCircle size={24} className="animate-spin text-[#1B2E6E]" />
                      {t("inventarizatsiya.createModal.stockLoading")}
                    </div>
                  ) : !warehouseId ? (
                    <div className="m-5 mt-2 flex min-h-48 flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 text-center text-sm font-bold text-slate-400">
                      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#1B2E6E] shadow-md ring-1 ring-slate-100"><Warehouse size={24} /></span>
                      {t("inventarizatsiya.createModal.selectWarehouseHint")}
                    </div>
                  ) : (
                    <>
                      <div ref={jadvalRef} className="mx-5 min-h-40 flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white lg:min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
                        {inventarizatsiyaQatorlari.length > 0 ? (
                          <>
                            <div className="sticky top-0 z-10 hidden grid-cols-[32px_minmax(0,1fr)_88px_136px_104px_36px] items-center gap-x-3 border-b border-slate-100 bg-slate-50/95 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 backdrop-blur sm:grid">
                              <span>{t("inventarizatsiya.createModal.table.number")}</span>
                              <span>{t("inventarizatsiya.createModal.table.product")}</span>
                              <span className="text-right">{t("inventarizatsiya.createModal.table.systemShort")}</span>
                              <span>{t("inventarizatsiya.createModal.table.actualQuantity")}</span>
                              <span>{t("inventarizatsiya.createModal.table.difference")}</span>
                              <span />
                            </div>
                            <div className="divide-y divide-slate-100">
                              {inventarizatsiyaQatorlari.map((qoldiq, index) => {
                                const tizim = qoldiqMiqdori(qoldiq);
                                const haqiqiyRaw = actuals[qoldiq.modificationId] ?? "";
                                const haqiqiy = Number(haqiqiyRaw);
                                const sanaldi = haqiqiyRaw.trim() !== "" && Number.isFinite(haqiqiy) && haqiqiy >= 0;
                                const farq = sanaldi ? haqiqiy - tizim : null;
                                const farqChipi = (
                                  <span
                                    title={farq != null && farq < 0 ? t("inventarizatsiya.createModal.notDeducted") : undefined}
                                    className={`inline-flex min-w-11 items-center justify-center rounded-full px-2.5 py-1 text-xs font-black tabular-nums ring-1 ${farq == null || farq === 0 ? "bg-slate-50 text-slate-400 ring-slate-200" : farq > 0 ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-amber-200"}`}
                                  >
                                    {farq == null ? "—" : farq > 0 ? `+${farq}` : farq}
                                  </span>
                                );
                                return (
                                  <div key={`${qoldiq.modificationId}-${index}`} className="grid grid-cols-[24px_minmax(0,1fr)_36px] items-center gap-x-3 gap-y-2.5 px-4 py-3.5 transition hover:bg-slate-50/80 sm:grid-cols-[32px_minmax(0,1fr)_88px_136px_104px_36px] sm:gap-y-0">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[11px] font-black tabular-nums text-slate-500">{index + 1}</span>
                                    <div className="min-w-0">
                                      <p className="line-clamp-2 text-[15px] font-bold leading-snug text-slate-900" title={modificationNomi(qoldiq.modification)}>{modificationNomi(qoldiq.modification)}</p>
                                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold tracking-wide text-slate-400">
                                        <span className="truncate">{qoldiq.modification?.barcode ?? "—"}</span>
                                        <span className="flex items-center gap-1.5 sm:hidden">
                                          <span className="text-slate-300">·</span>
                                          {t("inventarizatsiya.createModal.table.systemShort")}: <b className="text-slate-600">{tizim}</b>
                                          {farqChipi}
                                        </span>
                                      </p>
                                    </div>
                                    <span className="hidden text-right text-[15px] font-bold tabular-nums text-slate-600 sm:block">{tizim}</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="any"
                                      data-inventory-qty
                                      value={haqiqiyRaw}
                                      placeholder={t("inventarizatsiya.createModal.quantityPlaceholder")}
                                      onChange={(event) => {
                                        setFormaXatosi(null);
                                        setActuals((oldingi) => ({ ...oldingi, [qoldiq.modificationId]: event.target.value }));
                                      }}
                                      onKeyDown={(event) => {
                                        if (event.nativeEvent.isComposing) return;
                                        if (event.key === "Enter") {
                                          event.preventDefault();
                                          miqdorlarOrasidaYurish(event.currentTarget, event.shiftKey ? -1 : 1);
                                        } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                                          // Sonni oshirib-kamaytirish o'rniga qatorlar orasida yuriladi (sichqoncha bilan spinner ishlaydi).
                                          event.preventDefault();
                                          miqdorlarOrasidaYurish(event.currentTarget, event.key === "ArrowDown" ? 1 : -1);
                                        }
                                      }}
                                      className="col-[2/4] row-start-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[15px] font-bold tabular-nums text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-300 hover:border-slate-300 focus:border-[#1B2E6E] focus:ring-4 focus:ring-blue-100 sm:col-auto sm:row-auto"
                                      aria-label={t("inventarizatsiya.createModal.actualQuantityAria", { name: modificationNomi(qoldiq.modification) })}
                                    />
                                    <div className="hidden sm:block">{farqChipi}</div>
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
                                      className="col-start-3 row-start-1 flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 transition hover:bg-red-50 hover:text-red-500 sm:col-auto sm:row-auto"
                                      aria-label={t("inventarizatsiya.createModal.removeRowAria")}
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <div className="flex min-h-40 flex-col items-center justify-center gap-2.5 px-4 py-8 text-center">
                            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 ring-1 ring-slate-100"><Package size={22} /></span>
                            <p className="text-sm font-semibold text-slate-400">{t("inventarizatsiya.createModal.itemsSubtitle")}</p>
                          </div>
                        )}
                      </div>

                      {tanlanmaganTanlovlar.length > 0 && (
                        <div className="shrink-0 px-5 pb-5 pt-3">
                          <div ref={mahsulotSearchRef} className="relative">
                            <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#1B2E6E]/60" />
                            <input
                              ref={mahsulotInputRef}
                              value={mahsulotQidiruv}
                              onChange={(event) => {
                                setMahsulotQidiruv(event.target.value);
                                setMahsulotFaolIndeks(event.target.value.trim() ? 0 : -1);
                                setMahsulotDropdownOchiq(true);
                              }}
                              // Bo'sh maydonni bosganda ro'yxat ochilmaydi; avval yozilgan qidiruv matni bo'lsa, natijalari qayta chiqadi.
                              onFocus={() => { if (qidiruvYozilgan) setMahsulotDropdownOchiq(true); }}
                              onKeyDown={mahsulotKlavishi}
                              autoComplete="off"
                              role="combobox"
                              aria-expanded={mahsulotRoyxatiKorinadi}
                              aria-controls="inventory-product-list"
                              aria-autocomplete="list"
                              aria-activedescendant={mahsulotRoyxatiKorinadi && mahsulotFaolIndeks >= 0 ? `inventory-product-option-${mahsulotFaolIndeks}` : undefined}
                              aria-label={t("inventarizatsiya.createModal.table.product")}
                              placeholder={t("inventarizatsiya.createModal.selectProduct")}
                              className="h-12 w-full rounded-2xl border border-slate-300 bg-white pl-11 pr-4 text-[15px] font-semibold text-slate-800 shadow-[0_8px_20px_-14px_rgba(15,23,42,.4)] outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-[#1B2E6E] focus:ring-4 focus:ring-blue-100"
                            />
                          </div>
                          {mahsulotRoyxatiKorinadi &&
                            createPortal(
                              <div
                                ref={mahsulotMenyuRef}
                                id="inventory-product-list"
                                role="listbox"
                                className="fixed z-100000 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_22px_54px_-12px_rgba(15,23,42,.32)]"
                                style={{ top: mahsulotMenyuJoylashuvi.top, bottom: mahsulotMenyuJoylashuvi.bottom, maxHeight: mahsulotMenyuJoylashuvi.maxHeight, left: mahsulotMenyuJoylashuvi.left, width: Math.max(mahsulotMenyuJoylashuvi.width, 256) }}
                              >
                                {mahsulotQidiruviMoslari.map((qoldiq, optionIndex) => (
                                  <button
                                    key={qoldiq.modificationId}
                                    id={`inventory-product-option-${optionIndex}`}
                                    role="option"
                                    aria-selected={optionIndex === mahsulotFaolIndeks}
                                    type="button"
                                    tabIndex={-1}
                                    // Sichqoncha bilan tanlaganda qidiruv maydoni fokusini yo'qotmasin (keyingi mahsulotni darrov yozish uchun).
                                    onMouseDown={(event) => event.preventDefault()}
                                    onMouseMove={() => {
                                      if (optionIndex !== mahsulotFaolIndeks) setMahsulotFaolIndeks(optionIndex);
                                    }}
                                    onClick={() => mahsulotQoshish(qoldiq.modificationId)}
                                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 ${optionIndex === mahsulotFaolIndeks ? "bg-slate-100" : ""}`}
                                  >
                                    <span className="truncate">{modificationNomi(qoldiq.modification)}</span>
                                    {qoldiq.modification?.barcode && (
                                      <span className="shrink-0 text-xs font-semibold text-slate-400">{qoldiq.modification.barcode}</span>
                                    )}
                                  </button>
                                ))}
                                {mahsulotQidiruviMoslari.length === 0 && (
                                  <p role="status" className="px-3 py-2.5 text-xs font-semibold text-slate-400">{t("inventarizatsiya.createModal.searchEmpty")}</p>
                                )}
                              </div>,
                              document.body
                            )}
                          <p className="mt-2 px-1 text-[11px] font-medium leading-4 text-slate-400">{t("inventarizatsiya.createModal.addNextProductHint")}</p>
                        </div>
                      )}
                    </>
                  )}
                </section>
              </div>
              </> : <div className="mx-auto w-full max-w-3xl space-y-4">
                <div className="rounded-[26px] border border-slate-200/70 bg-white p-5 shadow-[0_14px_34px_-20px_rgba(15,23,42,.22)] sm:p-6">
                  <h3 className="text-lg font-black text-slate-900">{t("inventarizatsiya.createModal.reviewTitle")}</h3>
                  <div aria-hidden className="mt-2 h-px w-16 bg-gradient-to-r from-amber-400 to-transparent" />
                  <p className="mt-2 text-xs font-semibold text-slate-500">{omborMap.get(warehouseId)} · {t("inventarizatsiya.typePartial")}</p>
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {[
                      ["totalRows", inventarizatsiyaQatorlari.length, "text-slate-900", "bg-slate-400"],
                      ["counted", sanoqXulosasi.counted, "text-emerald-700", "bg-emerald-500"],
                      ["uncounted", sanoqXulosasi.uncounted.length + sanoqXulosasi.invalid.length, "text-amber-700", "bg-amber-500"],
                      ["surplus", `+${sanoqXulosasi.surplus}`, "text-emerald-700", "bg-emerald-500"],
                      ["shortage", sanoqXulosasi.shortage ? `-${sanoqXulosasi.shortage}` : "0", "text-red-600", "bg-red-500"],
                    ].map(([key, value, color, nuqta]) => (
                      <div key={key} className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-200/70">
                        <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500"><span className={`h-1.5 w-1.5 rounded-full ${nuqta}`} />{t(`inventarizatsiya.createModal.${key}`)}</p>
                        <p className={`mt-1.5 text-2xl font-black tabular-nums ${color}`}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {sanoqXulosasi.uncounted.length > 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-black">{t("inventarizatsiya.createModal.uncountedWarning", { count: sanoqXulosasi.uncounted.length })}</p><p className="mt-2 leading-6">{sanoqXulosasi.uncounted.join(", ")}</p><p className="mt-2 text-xs">{t("inventarizatsiya.createModal.uncountedBackendHint")}</p></div>}
                {sanoqXulosasi.invalid.length > 0 && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{t("inventarizatsiya.createModal.errors.invalidQuantity", { name: sanoqXulosasi.invalid[0] })}</div>}
                <div className="rounded-[26px] border border-slate-200/70 bg-white p-5 shadow-[0_14px_34px_-20px_rgba(15,23,42,.22)] sm:p-6">
                  <div role="heading" aria-level={3} className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{t("inventarizatsiya.createModal.varianceTitle")}</div>
                  {sanoqXulosasi.variances.length === 0 ? <p className="mt-3 text-sm font-medium text-slate-500">{t("inventarizatsiya.createModal.noVariance")}</p> : <div className="mt-3 max-h-60 divide-y divide-slate-100 overflow-y-auto rounded-2xl border border-slate-100">{sanoqXulosasi.variances.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 px-3.5 py-3 text-sm"><span className="min-w-0 truncate font-semibold text-slate-700">{item.name} <span className="font-normal text-slate-400">({item.system} → {item.actual})</span></span><span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-black tabular-nums ${item.difference > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>{item.difference > 0 ? "+" : ""}{item.difference}</span></div>)}</div>}
                  {sanoqXulosasi.variances.length > 0 && <><label htmlFor="inventory-variance-reason" className="mt-4 block text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400">{t("inventarizatsiya.createModal.varianceReason")}</label><textarea id="inventory-variance-reason" value={note} onChange={(event) => setNote(event.target.value)} rows={2} placeholder={t("inventarizatsiya.createModal.varianceReasonPlaceholder")} className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#1B2E6E] focus:ring-4 focus:ring-blue-100" /><p className="mt-1.5 text-[11px] font-medium leading-4 text-slate-400">{t("inventarizatsiya.createModal.variancePolicyHint")}</p></>}
                </div>
                {(formaXatosi || store.xatolik) && <div role="alert" className="flex items-start gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600"><AlertTriangle size={16} className="mt-0.5 shrink-0" /><span>{formaXatosi ? t(formaXatosi.key, formaXatosi.params) : store.xatolik}</span></div>}
              </div>}
            </div>

            <footer className="flex shrink-0 flex-col-reverse gap-2.5 border-t border-slate-200/70 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-8">
              <button
                type="button"
                onClick={formaniYopish}
                disabled={store.amalBajarilmoqda}
                className="h-12 rounded-2xl px-5 text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50 sm:mr-auto"
              >
                {t("inventarizatsiya.createModal.cancel")}
              </button>
              {reviewAction ? <>
              <button type="button" onClick={() => { setReviewAction(null); setFormaXatosi(null); }} disabled={store.amalBajarilmoqda} className="h-12 rounded-2xl border border-slate-300 bg-white px-6 text-sm font-black text-[#0B1330] transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50">{t("inventarizatsiya.createModal.backToCount")}</button>
              <button type="button" onClick={() => void yaratish()} disabled={store.amalBajarilmoqda || sanoqXulosasi.uncounted.length > 0 || sanoqXulosasi.invalid.length > 0} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#1C2F72] to-[#0B1330] px-7 text-sm font-black text-white shadow-[0_14px_30px_-10px_rgba(11,19,48,.85)] ring-1 ring-amber-300/40 transition hover:from-[#233A8A] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none">{store.amalBajarilmoqda && <LoaderCircle size={17} className="animate-spin" />}{t(reviewAction === "confirm" ? "inventarizatsiya.createModal.confirmFinal" : "inventarizatsiya.createModal.saveFinal")}</button>
              </> : <>
              <button
                type="button"
                onClick={() => koribChiqish("save")}
                disabled={store.amalBajarilmoqda || qoldiqYuklanmoqda || !warehouseId}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 text-sm font-black text-[#0B1330] transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
              >
                {store.amalBajarilmoqda && <LoaderCircle size={17} className="animate-spin" />}
                {t("inventarizatsiya.createModal.save")}
              </button>
              <button
                type="button"
                onClick={() => koribChiqish("confirm")}
                disabled={store.amalBajarilmoqda || qoldiqYuklanmoqda || !warehouseId}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#1C2F72] to-[#0B1330] px-7 text-sm font-black text-white shadow-[0_14px_30px_-10px_rgba(11,19,48,.85)] ring-1 ring-amber-300/40 transition hover:from-[#233A8A] disabled:opacity-50 disabled:shadow-none"
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
