import AppSelect from "@/Components/ui/AppSelect";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Barcode,
  Check,
  CheckSquare,
  ChevronDown,
  Clock3,
  FileText,
  LoaderCircle,
  MessageSquare,
  Paperclip,
  PackagePlus,
  Plus,
  Square,
  Trash2,
  UserPlus,
  Warehouse,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import AppModal from "@/Components/common/AppModal";
import HujjatSanasiMaydoni from "@/Components/common/HujjatSanasi";
import { bugungiToshkentKuni, yangiHujjatSanasi } from "@/lib/hujjatSanasi";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { useOmborStore } from "@/store/omborStore";
import {
  birliklarApi,
  kategoriyalarApi,
  mahsulotlarApi,
  mediaApi,
  modifikatsiyalarApi,
} from "@/api/catalogApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { Kategoriya, OlchovBirligi } from "@/types/catalog";
import { kodBilanTopish, modificationNomi, qoldiqMiqdori } from "./omborYordamchilari";
import { korsatiladiganValyuta, useValyuta, type Valyuta } from "@/lib/valyuta";
import { narxValyutalari } from "@/lib/narxValyutasi";
import { kirimElementiniYigish, kirimNarxiniOgirish } from "./kirimValyuta";
import { mahsulotBirliklariApi } from "@/api/catalogApi";
import { asosiyMiqdor, birlikTopish, koeffTekshiruvi, miqdorYaroqlimi, qabulBirliklari, type TovarBirligi } from "@/lib/kopBirlik";
import type { KirimOgohlantirishi } from "@/types/ombor";
import MahsulotTanlov, { type MahsulotVarianti } from "./MahsulotTanlov";
import ShtrixKodMaydoni, { type SkanNatijasi } from "./ShtrixKodMaydoni";

type Fayl = { id: string; nomi: string; url: string };

type Qator = {
  id: string;
  modificationId: string;
  warehouseId: string;
  quantity: number;
  price: string;
  retailPrice: string;
  wholesalePrice: string;
  boshlangichRetail: number;
  boshlangichWholesale: number;
  boshlangichTanNarx: number;
  // Tannarx (kirim narxi) valyutasi; chakana va ulgurji narxlarning valyutasi alohida bo'lishi mumkin (berilmasa — tannarx valyutasi).
  currency: Valyuta;
  retailValyuta?: Valyuta;
  wholesaleValyuta?: Valyuta;
  // Tovar birliklari (pochka, qop, korobka) mahsulot tanlangach yuklanadi; `birlikId` "" — asosiy birlik.
  birliklar: TovarBirligi[];
  birlikId: string;
  // Sanalgan qo'shimcha birlik (pochka) soni: backend haqiqiy koeffitsientni kartochka bilan solishtiradi.
  sanash: string;
  // Miqdor maydonida yozilayotgan matn: "24." kabi tugallanmagan kasr son (raqamga aylantirilsa 0 bo'lib qolar edi) maydonda saqlanadi.
  miqdorMatni: string | null;
};

// Tovar birliklari bir marta olinadi (bir tovar bir nechta qatorda ham so'rovni takrorlamaydi); xatolik kesh qilinmaydi.
const birlikKeshi = new Map<string, Promise<TovarBirligi[]>>();
function tovarBirliklari(productId: string) {
  let sorov = birlikKeshi.get(productId);
  if (!sorov) {
    sorov = mahsulotBirliklariApi.olish(productId).catch(() => {
      birlikKeshi.delete(productId);
      return [] as TovarBirligi[];
    });
    birlikKeshi.set(productId, sorov);
  }
  return sorov;
}

type Props = { onClose: () => void };

function yangiQator(warehouseId = ""): Qator {
  return {
    id: crypto.randomUUID(),
    modificationId: "",
    warehouseId,
    quantity: 1,
    price: "",
    retailPrice: "",
    wholesalePrice: "",
    boshlangichRetail: 0,
    boshlangichWholesale: 0,
    boshlangichTanNarx: 0,
    currency: "UZS",
    birliklar: [],
    birlikId: "",
    sanash: "",
    miqdorMatni: null,
  };
}

const input =
  "h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 aria-invalid:border-red-400 aria-invalid:ring-4 aria-invalid:ring-red-100 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-70";
const inputSm =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 aria-invalid:border-red-400 aria-invalid:ring-4 aria-invalid:ring-red-100 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-70";

export default function YangiKirimModal({ onClose }: Props) {
  const { t } = useTranslation("ombor_bosh");
  const store = useOmborStore();
  const { kurs, kursBor } = useValyuta();
  const [narxValyutasi, setNarxValyutasi] = useState<Valyuta>(() => korsatiladiganValyuta());
  const amaldagiKurs = kursBor ? kurs : null;
  const birinchiOmbor =
    store.omborlar.find((item) => item.isActive !== false)?.id ?? store.omborlar[0]?.id ?? "";

  const [kirimNomi, setKirimNomi] = useState(
    t("yangiKirim.defaultName", { number: store.kirimlar.length + 1 })
  );
  const [supplierQuery, setSupplierQuery] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [supplierOchiq, setSupplierOchiq] = useState(false);
  const supplierRef = useRef<HTMLDivElement | null>(null);
  const [responsibleId, setResponsibleId] = useState("");
  const joriyProfil = useAuthProfileStore((state) => state.profil);
  const profilniYuklash = useAuthProfileStore((state) => state.profilniYuklash);

  useEffect(() => {
    if (!joriyProfil) void profilniYuklash();
  }, [joriyProfil, profilniYuklash]);

  useEffect(() => {
    // Kirim hujjatining mas'ul xodimi har doim tizimga real kirgan
    // foydalanuvchi bo'lishi kerak.
    if (joriyProfil?.id) setResponsibleId(joriyProfil.id);
  }, [joriyProfil]);

  const [note, setNote] = useState("");
  // Hujjat sanasi: bugun yoki o'tgan kun (kelajak yo'q); o'tgan kun tanlansa backend hujjatni shu kunning oxirida yozadi.
  const [hujjatSanasi, setHujjatSanasi] = useState(() => bugungiToshkentKuni());
  const [qatorlar, setQatorlar] = useState<Qator[]>([yangiQator(birinchiOmbor)]);
  // Klaviatura bilan tez kiritish: keyingi fokus (mahsulot ro'yxati, miqdor yoki tannarx maydoni).
  const { t: tk } = useTranslation("ombor_kichik");
  const [fokus, setFokus] = useState<{ qatorId: string; maydon: "mahsulot" | "miqdor" | "narx"; n: number } | null>(null);
  const fokusNavbati = useRef(0);
  const qatorlarRef = useRef<HTMLDivElement | null>(null);
  const mahsulotVariantlari = useMemo<MahsulotVarianti[]>(
    () => store.modifikatsiyalar.map((item) => ({ id: item.id, modification: item })),
    [store.modifikatsiyalar]
  );

  // Mahsulot ro'yxatini ochishni MahsulotTanlov o'zi bajaradi (`ochishSorovi`); qolgan maydonlarga fokusni shu yerda beramiz.
  useEffect(() => {
    if (!fokus) return;
    if (fokus.maydon !== "mahsulot") {
      const maydon = qatorlarRef.current?.querySelector<HTMLInputElement>(
        `input[data-kirim-${fokus.maydon}="${fokus.qatorId}"]`
      );
      maydon?.focus();
      maydon?.select();
    }
    setFokus(null);
  }, [fokus]);
  const [tanlangan, setTanlangan] = useState<Set<string>>(new Set());
  const [xato, setXato] = useState("");
  const [ogohlantirishlar, setOgohlantirishlar] = useState<KirimOgohlantirishi[]>([]);
  const [yaratishOchiqUchun, setYaratishOchiqUchun] = useState<string | null>(null);
  const [fayllar, setFayllar] = useState<Fayl[]>([]);
  const [faylYuklanmoqda, setFaylYuklanmoqda] = useState(false);
  const faylInputRef = useRef<HTMLInputElement | null>(null);

  async function faylTanlandi(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setFaylYuklanmoqda(true);
    setXato("");
    try {
      const natija = await mediaApi.yuklash(file);
      setFayllar((joriy) => [...joriy, { id: natija.id, nomi: file.name, url: natija.imageUrl }]);
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setFaylYuklanmoqda(false);
    }
  }

  function faylniOchirish(id: string) {
    setFayllar((joriy) => joriy.filter((item) => item.id !== id));
  }

  const jami = useMemo(() => {
    try {
      return qatorlar.reduce((sum, row) => {
        const item = kirimElementiniYigish({ ...row, birlik: birlikTopish(row.birliklar, row.birlikId) }, amaldagiKurs);
        return sum + item.quantity * item.price;
      }, 0);
    } catch { return null; }
  }, [qatorlar, amaldagiKurs]);
  const kursKerak = qatorlar.some((row) => row.modificationId && row.currency === "USD") && !kursBor;

  // Har bir narx o'z valyutasida saqlanadi: tannarx — `currency`, chakana va ulgurji — o'z valyutasida (berilmasa tannarxniki).
  function maydonValyutasi(row: Qator, maydon: "price" | "retailPrice" | "wholesalePrice"): Valyuta {
    if (maydon === "retailPrice") return row.retailValyuta ?? row.currency;
    if (maydon === "wholesalePrice") return row.wholesaleValyuta ?? row.currency;
    return row.currency;
  }

  // Ko'rsatiladigan valyuta: kurs bor bo'lsa tanlangan valyuta, aks holda narxning o'z valyutasi.
  function korsatishValyutasi(row: Qator, maydon: "price" | "retailPrice" | "wholesalePrice"): Valyuta {
    return !kursBor ? maydonValyutasi(row, maydon) : narxValyutasi;
  }

  function narxQiymati(row: Qator, maydon: "price" | "retailPrice" | "wholesalePrice") {
    if (row[maydon] === "") return "";
    const qiymat = kirimNarxiniOgirish(Number(row[maydon]), maydonValyutasi(row, maydon), korsatishValyutasi(row, maydon), amaldagiKurs);
    return Math.round(qiymat * 100) / 100;
  }

  function narxniKiritish(row: Qator, maydon: "price" | "retailPrice" | "wholesalePrice", qiymat: string) {
    if (qiymat !== "" && (!Number.isFinite(Number(qiymat)) || Number(qiymat) < 0)) return;
    const asl = qiymat === "" ? "" : String(kirimNarxiniOgirish(Number(qiymat), korsatishValyutasi(row, maydon), maydonValyutasi(row, maydon), amaldagiKurs));
    yangilash(row.id, { [maydon]: asl });
  }

  function jamiMatni() {
    if (jami === null) return "—";
    const valyuta = kursBor ? narxValyutasi : "UZS";
    const qiymat = kirimNarxiniOgirish(jami, "UZS", valyuta, amaldagiKurs);
    const matn = qiymat.toLocaleString("uz-UZ", { maximumFractionDigits: 2 });
    return valyuta === "USD" ? `$${matn}` : `${matn} so'm`;
  }
  const bugun = new Intl.DateTimeFormat("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

  useEffect(() => {
    function tashqariBosildi(event: MouseEvent) {
      if (supplierRef.current && !supplierRef.current.contains(event.target as Node)) {
        setSupplierOchiq(false);
      }
    }
    document.addEventListener("mousedown", tashqariBosildi);
    return () => document.removeEventListener("mousedown", tashqariBosildi);
  }, []);

  const supplierMoslari = useMemo(() => {
    const q = supplierQuery.trim().toLowerCase();
    if (!q) return store.yetkazibBeruvchilar;
    return store.yetkazibBeruvchilar.filter((item) =>
      (item.name ?? item.fullName ?? "").toLowerCase().includes(q)
    );
  }, [store.yetkazibBeruvchilar, supplierQuery]);

  const aynanMosSupplier = store.yetkazibBeruvchilar.some(
    (item) => (item.name ?? item.fullName ?? "").trim().toLowerCase() === supplierQuery.trim().toLowerCase()
  );

  function supplierTanlash(id: string, name: string) {
    setSupplierId(id);
    setSupplierQuery(name);
    setSupplierOchiq(false);
  }

  async function yangiSupplierQoshish() {
    const nomi = supplierQuery.trim();
    if (!nomi) return;
    const ok = await store.yetkazibBeruvchiYaratish({ name: nomi });
    if (!ok) return;
    const yaratilgan = useOmborStore.getState().yetkazibBeruvchilar[0];
    if (yaratilgan) supplierTanlash(yaratilgan.id, yaratilgan.name ?? nomi);
  }

  function yangilash(id: string, value: Partial<Qator>) {
    setQatorlar((rows) => rows.map((row) => (row.id === id ? { ...row, ...value } : row)));
  }

  function mahsulotTanlash(id: string, modificationId: string) {
    const mod = store.modifikatsiyalar.find((item) => item.id === modificationId);
    const cost = Number(mod?.price?.costPrice ?? 0);
    const retail = Number(mod?.price?.retailPrice ?? 0);
    const wholesale = Number(mod?.price?.wholesalePrice ?? 0);
    yangilash(id, {
      modificationId,
      price: cost ? String(cost) : "",
      retailPrice: retail ? String(retail) : "",
      wholesalePrice: wholesale ? String(wholesale) : "",
      boshlangichRetail: retail,
      boshlangichWholesale: wholesale,
      boshlangichTanNarx: cost,
      // Har bir narxning o'z valyutasi: kirim narxi (tannarx) costCurrency'da, chakana/ulgurji o'z valyutasida.
      currency: narxValyutalari(mod?.price).cost,
      retailValyuta: narxValyutalari(mod?.price).retail,
      wholesaleValyuta: narxValyutalari(mod?.price).wholesale,
      birliklar: [],
      birlikId: "",
      sanash: "",
    });
    if (mod?.productId) void tovarBirliklari(mod.productId).then((birliklar) => yangilash(id, { birliklar }));
  }

  // Qabul birligini almashtirish: tannarx yangi birlikdagi narxga (asosiy narx × koeffitsient) o'tadi.
  function birlikniOzgartirish(row: Qator, birlikId: string) {
    const birlik = birlikTopish(row.birliklar, birlikId);
    const koeff = birlik && !birlik.asosiy ? birlik.koeff : 1;
    const narx = Math.round(row.boshlangichTanNarx * koeff * 100) / 100;
    yangilash(row.id, { birlikId, price: narx ? String(narx) : "", sanash: "" });
  }

  // Yig'ish uchun qatorning tanlangan birligi va sanash birligi (kirimda `canReceive: false` pochka ham sanash uchun bo'ladi).
  function qatorBirliklari(row: Qator) {
    const birlik = birlikTopish(row.birliklar, row.birlikId);
    const sanashBirligi = row.birliklar.find((item) => !item.asosiy && item.unitId !== row.birlikId && !item.qabul)
      ?? row.birliklar.find((item) => !item.asosiy && item.unitId !== row.birlikId);
    return { birlik, sanashBirligi };
  }

  function fokusSoralish(qatorId: string, maydon: "mahsulot" | "miqdor" | "narx") {
    fokusNavbati.current += 1;
    setFokus({ qatorId, maydon, n: fokusNavbati.current });
  }

  // Qator oxirida Enter: keyingi qatorga o'tadi. Keyingi qator yo'q bo'lsa va joriy qatorda mahsulot bor bo'lsa,
  // yangi qator qo'shiladi va uning mahsulot ro'yxati ochiladi.
  function keyingiQatorgaOtish(qatorId: string) {
    const index = qatorlar.findIndex((row) => row.id === qatorId);
    const joriy = qatorlar[index];
    if (!joriy?.modificationId) return;
    const keyingi = qatorlar[index + 1];
    if (keyingi) {
      fokusSoralish(keyingi.id, keyingi.modificationId ? "miqdor" : "mahsulot");
      return;
    }
    const yangi = yangiQator(qatorlar[0]?.warehouseId || birinchiOmbor);
    setQatorlar((rows) => [...rows, yangi]);
    fokusSoralish(yangi.id, "mahsulot");
  }

  // Shtrix-kod (yoki artikul) to'liq mos kelsa mahsulot qo'shiladi; qator bor bo'lsa miqdori 1 taga oshadi (takror qator yo'q).
  function kodniQoshish(kod: string): SkanNatijasi {
    const mos = kodBilanTopish(store.modifikatsiyalar, kod, (item) => item);
    if (mos.length === 0) return { xato: true, matn: tk("shtrixKod.notFound") };
    if (mos.length > 1) return { xato: true, matn: tk("shtrixKod.ambiguous") };
    const mod = mos[0];
    const nom = modificationNomi(mod);
    const bor = qatorlar.find((row) => row.modificationId === mod.id);
    if (bor) {
      const yangiMiqdor = Number(bor.quantity || 0) + 1;
      yangilash(bor.id, { quantity: yangiMiqdor });
      return { xato: false, matn: tk("shtrixKod.added", { name: nom, qty: yangiMiqdor }) };
    }
    const bosh = qatorlar.find((row) => !row.modificationId);
    if (bosh) {
      mahsulotTanlash(bosh.id, mod.id);
      return { xato: false, matn: tk("shtrixKod.added", { name: nom, qty: bosh.quantity || 1 }) };
    }
    const yangi = yangiQator(qatorlar[0]?.warehouseId || birinchiOmbor);
    setQatorlar((rows) => [...rows, yangi]);
    mahsulotTanlash(yangi.id, mod.id);
    return { xato: false, matn: tk("shtrixKod.added", { name: nom, qty: 1 }) };
  }

  function barchasiniBelgilash() {
    setTanlangan((joriy) =>
      joriy.size === qatorlar.length ? new Set() : new Set(qatorlar.map((row) => row.id))
    );
  }

  function belgilashniAlmashtirish(id: string) {
    setTanlangan((joriy) => {
      const nusxa = new Set(joriy);
      if (nusxa.has(id)) nusxa.delete(id);
      else nusxa.add(id);
      return nusxa;
    });
  }

  function tanlanganlarniOchirish() {
    setQatorlar((rows) => (rows.length > tanlangan.size ? rows.filter((row) => !tanlangan.has(row.id)) : rows));
    setTanlangan(new Set());
  }

  async function saqlash(tasdiqlash: boolean) {
    setXato("");
    if (kursKerak) return setXato("yangiKirim.errors.exchangeRateRequired");
    const valid = qatorlar.filter(
      (row) => row.modificationId && row.warehouseId && Number.isFinite(row.quantity) && row.quantity > 0 && Number.isFinite(Number(row.price)) && Number(row.price) >= 0
    );
    if (!supplierId) return setXato("yangiKirim.errors.supplierRequired");
    if (!valid.length || valid.length !== qatorlar.length)
      return setXato("yangiKirim.errors.rowsIncomplete");
    if (new Set(valid.map((row) => row.warehouseId)).size !== 1)
      return setXato("yangiKirim.errors.mixedWarehouse");
    if (valid.some((row) => !miqdorYaroqlimi(birlikTopish(row.birliklar, row.birlikId), row.quantity)))
      return setXato("yangiKirim.errors.quantityNotWhole");

    const izohQismlari = [`Nomi: ${kirimNomi.trim() || "Kirim hujjati"}`];
    if (note.trim()) izohQismlari.push(note.trim());
    fayllar.forEach((fayl) => izohQismlari.push(`Fayl: ${fayl.nomi} (${fayl.url})`));

    const hujjat = await store.kirimYaratish({
      ...yangiHujjatSanasi(hujjatSanasi),
      supplierId,
      warehouseId: valid[0].warehouseId,
      responsibleId: responsibleId || undefined,
      note: izohQismlari.join(" | "),
      items: valid.map((row) => {
        const { birlik, sanashBirligi } = qatorBirliklari(row);
        return kirimElementiniYigish({ ...row, birlik, sanashBirligi, sanashSoni: Number(row.sanash) || 0 }, amaldagiKurs);
      }),
    });
    if (!hujjat) return;

    const narxOzgarganlar = valid.filter((row) => {
      const retail = Number(row.retailPrice || 0);
      const wholesale = Number(row.wholesalePrice || 0);
      return retail !== row.boshlangichRetail || wholesale !== row.boshlangichWholesale;
    });
    if (narxOzgarganlar.length > 0) {
      await Promise.all(
        narxOzgarganlar.map((row) =>
          modifikatsiyalarApi
            .narxYangilash(row.modificationId, {
              retailPrice: Number(row.retailPrice || 0) || undefined,
              wholesalePrice: Number(row.wholesalePrice || 0) || undefined,
              // Valyuta faqat yuborilayotgan narx uchun, har biri o'z valyutasida (eski umumiy `currency` endi faqat chakana narxniki).
              ...(Number(row.retailPrice || 0) ? { retailCurrency: maydonValyutasi(row, "retailPrice") } : {}),
              ...(Number(row.wholesalePrice || 0) ? { wholesaleCurrency: maydonValyutasi(row, "wholesalePrice") } : {}),
            })
            .catch(() => null)
        )
      );
      await store.malumotlarniYuklash();
    }

    if (tasdiqlash && !(await store.kirimTasdiqlash(hujjat.id))) return;
    // Sanalgan miqdor kartochkadagi koeffitsientdan farq qilsa hujjat saqlangan: foydalanuvchiga ko'rsatib, keyin yopiladi.
    if (hujjat.warnings?.length) {
      setOgohlantirishlar(hujjat.warnings);
      return;
    }
    onClose();
  }

  return (
    <AppModal onClose={onClose} className="sidebar-aligned-document-modal items-stretch p-3 sm:p-5">
      <div className="flex min-h-0 w-full flex-col overflow-hidden rounded-[32px] border border-orange-100 bg-[#F8FAFC] shadow-[0_28px_90px_rgba(15,23,42,.32)]">
        <header className="flex shrink-0 items-center border-b border-orange-100 bg-white/75 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{t("yangiKirim.title")}</h2>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-500">{t("yangiKirim.badgeNew")}</span>
          </div>
        </header>

        <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8">
          {ogohlantirishlar.length > 0 && (
            <div role="alert" className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              <p className="font-black">{t("yangiKirim.units.warningTitle")}</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5">
                {ogohlantirishlar.map((item, index) => (
                  <li key={`${item.modificationId ?? ""}-${item.unitId ?? ""}-${index}`}>
                    {t("yangiKirim.units.warningLine", { unit: item.unitName ?? "", card: Number(item.cardFactor ?? 0), actual: Number(item.actualFactor ?? 0) })}
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-xs font-semibold text-amber-700">{t("yangiKirim.units.warningHint")}</p>
              <button type="button" onClick={onClose} className="mt-3 h-10 rounded-xl bg-amber-500 px-5 text-sm font-black text-white hover:bg-amber-600">{t("yangiKirim.units.continue")}</button>
            </div>
          )}
          {(xato || store.xatolik) && (
            <div className="mb-4 flex justify-between gap-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
              <span>{xato ? t(xato) : store.xatolik}</span>
              <button
                type="button"
                onClick={() => {
                  setXato("");
                  store.xatolikniTozalash();
                }}
              >
                {t("yangiKirim.close")}
              </button>
            </div>
          )}

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm">
              <SectionTitle icon={<PackagePlus size={18} />} text={t("yangiKirim.sectionAbout")} />
              <div className="grid gap-4">
                <label className="space-y-2 text-sm font-bold text-slate-500">
                  <span>{t("yangiKirim.nameLabel")}</span>
                  <input
                    value={kirimNomi}
                    onChange={(event) => setKirimNomi(event.target.value)}
                    className={input}
                    placeholder={t("yangiKirim.namePlaceholder")}
                  />
                </label>

                <div ref={supplierRef} className="relative space-y-2 text-sm font-bold text-slate-500">
                  <span>{t("yangiKirim.supplierLabel")}</span>
                  <input
                    value={supplierQuery}
                    onChange={(event) => {
                      setSupplierQuery(event.target.value);
                      setSupplierId("");
                      setSupplierOchiq(true);
                    }}
                    onFocus={() => setSupplierOchiq(true)}
                    className={input}
                    placeholder={t("yangiKirim.supplierPlaceholder")}
                  />
                  {supplierOchiq && (
                    <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-56 overflow-y-auto rounded-2xl border border-orange-100 bg-white p-1.5 shadow-[0_18px_44px_rgba(15,23,42,.16)]">
                      {supplierMoslari.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => supplierTanlash(item.id, item.name ?? item.fullName ?? item.id)}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-orange-50"
                        >
                          {item.name ?? item.fullName}
                          {item.id === supplierId && <Check size={15} className="text-orange-500" />}
                        </button>
                      ))}
                      {supplierQuery.trim() && !aynanMosSupplier && (
                        <button
                          type="button"
                          onClick={() => void yangiSupplierQoshish()}
                          disabled={store.amalBajarilmoqda}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-black text-orange-600 hover:bg-orange-50 disabled:opacity-50"
                        >
                          <UserPlus size={15} />
                          {t("yangiKirim.addSupplier", { name: supplierQuery.trim() })}
                        </button>
                      )}
                      {supplierMoslari.length === 0 && !supplierQuery.trim() && (
                        <p className="px-3 py-2.5 text-xs font-semibold text-slate-400">
                          {t("yangiKirim.supplierListEmpty")}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <SelectField
                  label={t("yangiKirim.responsibleLabel")}
                  value={responsibleId}
                  onChange={setResponsibleId}
                  placeholder={t("yangiKirim.responsiblePlaceholder")}
                  options={store.xodimlar.map((item) => ({
                    id: item.id,
                    name: item.fullName ?? item.name ?? item.username ?? item.id,
                  }))}
                />

                <label className="space-y-2 text-sm font-bold text-slate-500">
                  <span>{t("yangiKirim.dateLabel")}</span>
                  <HujjatSanasiMaydoni value={hujjatSanasi} onChange={setHujjatSanasi} className={input} aria-label={t("yangiKirim.dateLabel")} />
                </label>
              </div>
            </section>

            <div className="space-y-5">
              <section className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm">
                <SectionTitle icon={<MessageSquare size={18} />} text={t("yangiKirim.commentSection")} />
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  placeholder={t("yangiKirim.commentPlaceholder")}
                  className="w-full resize-none rounded-2xl border border-slate-200 p-4 text-sm font-medium outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </section>
              <section className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm">
                <SectionTitle icon={<Clock3 size={18} />} text={t("yangiKirim.historySection")} />
                <div className="flex items-start gap-3 text-sm">
                  <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-orange-500" />
                  <div>
                    <p className="font-bold text-slate-700">{t("yangiKirim.historyDraftCreated")}</p>
                    <p className="text-xs font-semibold text-slate-400">{bugun}</p>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <section className="mt-5 rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <SectionTitle icon={<Paperclip size={18} />} text={t("yangiKirim.filesSection")} />
              <input ref={faylInputRef} type="file" onChange={(event) => void faylTanlandi(event)} className="hidden" />
              <button
                type="button"
                onClick={() => faylInputRef.current?.click()}
                disabled={faylYuklanmoqda}
                className="mb-4 inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white shadow-lg shadow-orange-100 hover:bg-orange-600 disabled:opacity-50"
              >
                {faylYuklanmoqda ? <LoaderCircle size={17} className="animate-spin" /> : <Paperclip size={17} />}
                {t("yangiKirim.uploadFile")}
              </button>
            </div>
            {fayllar.length === 0 ? (
              <p className="py-4 text-center text-sm font-semibold text-slate-400">{t("yangiKirim.noFiles")}</p>
            ) : (
              <div className="space-y-2">
                {fayllar.map((fayl) => (
                  <div
                    key={fayl.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-[#FFFFFF] px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText size={16} className="shrink-0 text-orange-500" />
                      <span className="truncate text-sm font-bold text-slate-700">{fayl.nomi}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => faylniOchirish(fayl.id)}
                      aria-label={t("yangiKirim.deleteFileAria")}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-5 rounded-[26px] border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">{t("yangiKirim.productsTitle")}</h3>
                <p className="mt-1 text-xs font-medium text-slate-400">
                  {t("yangiKirim.productsSubtitle")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  {t("yangiKirim.currency")}
                  <AppSelect aria-label={t("yangiKirim.currency")} value={kursBor ? narxValyutasi : "UZS"} onChange={(event) => setNarxValyutasi(event.target.value as Valyuta)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">
                    <option value="UZS">UZS</option>
                    <option value="USD" disabled={!kursBor}>USD</option>
                  </AppSelect>
                </label>
                <button
                  type="button"
                  onClick={() => setYaratishOchiqUchun(qatorlar[qatorlar.length - 1]?.id ?? null)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-orange-300 bg-white px-5 text-sm font-black text-orange-600 hover:bg-orange-50"
                >
                  <Plus size={18} /> {t("yangiKirim.createProduct")}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setQatorlar((rows) => [...rows, yangiQator(rows[0]?.warehouseId || birinchiOmbor)])
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white shadow-lg shadow-orange-100 hover:bg-orange-600"
                >
                  <Plus size={18} /> {t("yangiKirim.addRow")}
                </button>
              </div>
            </div>

            {kursKerak && <p role="alert" className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{t("yangiKirim.errors.exchangeRateRequired")}</p>}
            <div className="mb-4">
              <ShtrixKodMaydoni onSkan={kodniQoshish} inputClassName={inputSm} />
            </div>

            <div className="scrollbar-orange overflow-x-auto pb-2">
              <div ref={qatorlarRef} className="min-w-[1280px] space-y-3">
                <div className="grid grid-cols-[28px_38px_2fr_1fr_1fr_1fr_1fr_1fr_1.2fr_1fr_48px] gap-3 px-3 text-[13px] font-semibold text-slate-600">
                  <button type="button" onClick={barchasiniBelgilash} aria-label={t("yangiKirim.table.selectAllAria")}>
                    {tanlangan.size === qatorlar.length && qatorlar.length > 0 ? (
                      <CheckSquare size={16} className="text-orange-500" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                  <span>{t("yangiKirim.table.numberHeader")}</span>
                  <span>{t("yangiKirim.table.productHeader")}</span>
                  <span>{t("yangiKirim.table.barcodeHeader")}</span>
                  <span>{t("yangiKirim.table.costPriceHeader")}</span>
                  <span>{t("yangiKirim.table.retailPriceHeader")}</span>
                  <span>{t("yangiKirim.table.wholesalePriceHeader")}</span>
                  <span>{t("yangiKirim.table.quantityHeader")}</span>
                  <span>{t("yangiKirim.table.warehouseHeader")}</span>
                  <span>{t("yangiKirim.table.stockHeader")}</span>
                  <span />
                </div>
                {qatorlar.map((row, index) => {
                  const mod = store.modifikatsiyalar.find((item) => item.id === row.modificationId);
                  const stock = store.qoldiqlar.find(
                    (item) => item.modificationId === row.modificationId && item.warehouseId === row.warehouseId
                  );
                  const qabulOptlari = qabulBirliklari(row.birliklar);
                  const { birlik: qabulBirligi, sanashBirligi } = qatorBirliklari(row);
                  const asosiyNomi = row.birliklar.find((item) => item.asosiy)?.qisqa ?? "";
                  // Sanalgan son kiritilgan bo'lsa: 1 pochka necha kg ekani va kartochkadan farqi (2% dan ko'p — ogohlantirish).
                  const tekshiruv = sanashBirligi ? koeffTekshiruvi(asosiyMiqdor(qabulBirligi, row.quantity), Number(row.sanash) || 0, sanashBirligi.koeff) : null;
                  return (
                    <div
                      key={row.id}
                      className="grid grid-cols-[28px_38px_2fr_1fr_1fr_1fr_1fr_1fr_1.2fr_1fr_48px] items-center gap-3 rounded-2xl border border-orange-100 bg-[#FFFFFF] p-3"
                    >
                      <button
                        type="button"
                        onClick={() => belgilashniAlmashtirish(row.id)}
                        aria-label={t("yangiKirim.table.selectRowAria")}
                      >
                        {tanlangan.has(row.id) ? (
                          <CheckSquare size={16} className="text-orange-500" />
                        ) : (
                          <Square size={16} className="text-slate-300" />
                        )}
                      </button>
                      <span className="text-center text-sm font-black text-slate-400">{index + 1}</span>
                      <MahsulotTanlov
                        value={row.modificationId}
                        variantlar={mahsulotVariantlari}
                        onChange={(id) => {
                          mahsulotTanlash(row.id, id);
                          // Mahsulot tanlangach fokus shu qatorning miqdoriga o'tadi.
                          fokusSoralish(row.id, "miqdor");
                        }}
                        placeholder={t("yangiKirim.table.selectProductOption")}
                        className={inputSm}
                        tanlanganNomi={mod ? modificationNomi(mod) : undefined}
                        ochishSorovi={fokus?.maydon === "mahsulot" && fokus.qatorId === row.id ? fokus.n : 0}
                      />
                      <div className="relative">
                        <Barcode size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={mod?.barcode ?? ""} readOnly placeholder={t("yangiKirim.table.barcodePlaceholder")} className={`${inputSm} pl-8`} />
                      </div>
                      <div className="relative"><input
                        type="number"
                        min="0"
                        step="0.01"
                        aria-label={`${t("yangiKirim.table.costPriceHeader")} (${korsatishValyutasi(row, "price")})`}
                        value={narxQiymati(row, "price")}
                        data-kirim-narx={row.id}
                        onChange={(event) => narxniKiritish(row, "price", event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
                          event.preventDefault();
                          keyingiQatorgaOtish(row.id);
                        }}
                        placeholder={t("yangiKirim.table.pricePlaceholder")}
                        className={`${inputSm} pr-16`}
                      /><span className="pointer-events-none absolute right-7 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">{korsatishValyutasi(row, "price")}</span></div>
                      <div className="relative"><input
                        type="number"
                        min="0"
                        step="0.01"
                        aria-label={`${t("yangiKirim.table.retailPriceHeader")} (${korsatishValyutasi(row, "retailPrice")})`}
                        value={narxQiymati(row, "retailPrice")}
                        onChange={(event) => narxniKiritish(row, "retailPrice", event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
                          event.preventDefault();
                          keyingiQatorgaOtish(row.id);
                        }}
                        placeholder={t("yangiKirim.table.pricePlaceholder")}
                        className={`${inputSm} pr-16`}
                      /><span className="pointer-events-none absolute right-7 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">{korsatishValyutasi(row, "retailPrice")}</span></div>
                      <div className="relative"><input
                        type="number"
                        min="0"
                        step="0.01"
                        aria-label={`${t("yangiKirim.table.wholesalePriceHeader")} (${korsatishValyutasi(row, "wholesalePrice")})`}
                        value={narxQiymati(row, "wholesalePrice")}
                        onChange={(event) => narxniKiritish(row, "wholesalePrice", event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
                          event.preventDefault();
                          keyingiQatorgaOtish(row.id);
                        }}
                        placeholder={t("yangiKirim.table.pricePlaceholder")}
                        className={`${inputSm} pr-16`}
                      /><span className="pointer-events-none absolute right-7 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">{korsatishValyutasi(row, "wholesalePrice")}</span></div>
                      <div className="min-w-0 space-y-1.5">
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={row.miqdorMatni ?? row.quantity}
                        data-kirim-miqdor={row.id}
                        onChange={(event) => yangilash(row.id, { miqdorMatni: event.target.value, quantity: Number(event.target.value) })}
                        onBlur={() => yangilash(row.id, { miqdorMatni: null })}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
                          event.preventDefault();
                          // Miqdordan keyin tannarxga o'tiladi (qolgan narxlarga Tab bilan).
                          fokusSoralish(row.id, "narx");
                        }}
                        className={inputSm}
                      />
                      {qabulOptlari.length > 0 && (
                        <select
                          aria-label={t("yangiKirim.units.unit")}
                          value={row.birlikId}
                          onChange={(event) => birlikniOzgartirish(row, event.target.value)}
                          className="h-9 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-1 text-[11px] font-bold text-slate-700 outline-none focus:border-orange-400"
                        >
                          {qabulOptlari.map((birlik) => (
                            <option key={birlik.unitId} value={birlik.asosiy ? "" : birlik.unitId}>{birlik.qisqa || birlik.nomi}</option>
                          ))}
                        </select>
                      )}
                      {sanashBirligi && (
                        <div>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={row.sanash}
                            onChange={(event) => yangilash(row.id, { sanash: event.target.value })}
                            aria-label={t("yangiKirim.units.countLabel", { unit: sanashBirligi.nomi })}
                            placeholder={t("yangiKirim.units.countPlaceholder", { unit: sanashBirligi.qisqa || sanashBirligi.nomi })}
                            className="h-9 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-700 outline-none focus:border-orange-400"
                          />
                          {tekshiruv && (
                            <p className={`mt-1 text-[11px] font-semibold ${tekshiruv.ogohlantirish ? "text-amber-600" : "text-slate-400"}`}>
                              {t("yangiKirim.units.factorLine", { unit: sanashBirligi.qisqa || sanashBirligi.nomi, actual: tekshiruv.haqiqiy, base: asosiyNomi, card: sanashBirligi.koeff })}
                            </p>
                          )}
                        </div>
                      )}
                      </div>
                      <div className="relative">
                        <Warehouse size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <AppSelect
                          value={row.warehouseId}
                          onChange={(event) => yangilash(row.id, { warehouseId: event.target.value })}
                          className={`${inputSm} appearance-none pl-8 pr-7`}
                        >
                          <option value="">{t("yangiKirim.table.selectWarehouseOption")}</option>
                          {store.omborlar
                            .filter((item) => item.isActive !== false)
                            .map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                        </AppSelect>
                        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                      <p className="truncate text-center text-xs font-bold text-slate-500">
                        {stock ? qoldiqMiqdori(stock) : 0}
                      </p>
                      <button
                        type="button"
                        disabled={qatorlar.length === 1}
                        onClick={() => setQatorlar((rows) => rows.filter((item) => item.id !== row.id))}
                        aria-label={t("yangiKirim.table.deleteRowAria")}
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-30"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 border-t border-orange-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={tanlanganlarniOchirish}
                disabled={tanlangan.size === 0}
                className="inline-flex items-center gap-2 self-start rounded-xl bg-red-50 px-4 py-2.5 text-xs font-black text-red-500 hover:bg-red-100 disabled:opacity-30"
              >
                <Trash2 size={14} /> {t("yangiKirim.deleteSelected", { count: tanlangan.size })}
              </button>
              <div className="text-right">
                <p className="text-xs font-black uppercase text-slate-400">{t("yangiKirim.totalLabel")}</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{jamiMatni()}</p>
              </div>
            </div>
          </section>
        </div>

        <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-orange-100 bg-white/75 px-5 py-4 sm:flex-row sm:justify-end sm:px-8">
          <button type="button" onClick={onClose} className="h-12 rounded-2xl bg-slate-100 px-7 text-sm font-black text-slate-600 hover:bg-slate-200">
            {t("yangiKirim.cancel")}
          </button>
          <ActionButton busy={store.amalBajarilmoqda} outline onClick={() => void saqlash(false)}>
            {t("yangiKirim.save")}
          </ActionButton>
          <ActionButton busy={store.amalBajarilmoqda} onClick={() => void saqlash(true)}>
            {t("yangiKirim.saveAndConfirm")}
          </ActionButton>
        </footer>
      </div>

      {yaratishOchiqUchun && (
        <MahsulotYaratishPanel
          onClose={() => setYaratishOchiqUchun(null)}
          onYaratildi={(modification) => {
            mahsulotTanlash(yaratishOchiqUchun, modification.id);
            setYaratishOchiqUchun(null);
          }}
        />
      )}
    </AppModal>
  );
}

function MahsulotYaratishPanel({
  onClose,
  onYaratildi,
}: {
  onClose: () => void;
  onYaratildi: (modification: { id: string }) => void;
}) {
  const { t } = useTranslation("ombor_bosh");
  const store = useOmborStore();
  const [kategoriyalar, setKategoriyalar] = useState<Kategoriya[]>([]);
  const [birliklar, setBirliklar] = useState<OlchovBirligi[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [xato, setXato] = useState("");
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [nomi, setNomi] = useState("");
  const [barcode, setBarcode] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [retailPrice, setRetailPrice] = useState("");
  const [wholesalePrice, setWholesalePrice] = useState("");

  useEffect(() => {
    let faol = true;
    async function yuklash() {
      try {
        const [k, b] = await Promise.all([kategoriyalarApi.royxat(), birliklarApi.royxat()]);
        if (!faol) return;
        setKategoriyalar(k);
        setBirliklar(b);
      } catch (error) {
        if (faol) setXato(getApiErrorMessage(error));
      } finally {
        if (faol) setYuklanmoqda(false);
      }
    }
    void yuklash();
    return () => {
      faol = false;
    };
  }, []);

  async function saqlash() {
    setXato("");
    if (!nomi.trim() || !barcode.trim() || !categoryId || !unitId) {
      setXato("mahsulotYaratish.errors.required");
      return;
    }
    setSaqlanmoqda(true);
    try {
      const mahsulot = await mahsulotlarApi.yaratish({
        name: nomi.trim(),
        categoryId,
        unitId,
        barcode: barcode.trim(),
      });
      const modification = await modifikatsiyalarApi.yaratish(mahsulot.id, {
        barcode: barcode.trim(),
        price: {
          costPrice: Number(costPrice || 0),
          retailPrice: Number(retailPrice || 0),
          wholesalePrice: Number(wholesalePrice || 0),
        },
      });
      await store.malumotlarniYuklash();
      onYaratildi({ id: modification.id });
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setSaqlanmoqda(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-950">{t("mahsulotYaratish.title")}</h3>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <X size={18} />
          </button>
        </div>

        {yuklanmoqda ? (
          <div className="flex h-40 items-center justify-center">
            <LoaderCircle className="animate-spin text-orange-500" size={28} />
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {xato && <div className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-600">{t(xato)}</div>}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-bold text-slate-500 sm:col-span-2">
                <span>{t("mahsulotYaratish.nameLabel")}</span>
                <input value={nomi} onChange={(event) => setNomi(event.target.value)} className={inputSm} placeholder={t("mahsulotYaratish.namePlaceholder")} />
              </label>
              <label className="space-y-2 text-sm font-bold text-slate-500">
                <span>{t("mahsulotYaratish.barcodeLabel")}</span>
                <input value={barcode} onChange={(event) => setBarcode(event.target.value)} className={inputSm} placeholder={t("mahsulotYaratish.barcodePlaceholder")} />
              </label>
              <SelectField label={t("mahsulotYaratish.categoryLabel")} value={categoryId} onChange={setCategoryId} placeholder={t("mahsulotYaratish.selectPlaceholder")} options={kategoriyalar.map((item) => ({ id: item.id, name: item.name }))} />
              <SelectField label={t("mahsulotYaratish.unitLabel")} value={unitId} onChange={setUnitId} placeholder={t("mahsulotYaratish.selectPlaceholder")} options={birliklar.map((item) => ({ id: item.id, name: item.shortName ? `${item.name} (${item.shortName})` : item.name }))} />
              <label className="space-y-2 text-sm font-bold text-slate-500">
                <span>{t("mahsulotYaratish.costPriceLabel")}</span>
                <input type="number" min="0" step="0.01" value={costPrice} onChange={(event) => setCostPrice(event.target.value)} className={inputSm} placeholder={t("mahsulotYaratish.pricePlaceholder")} />
              </label>
              <label className="space-y-2 text-sm font-bold text-slate-500">
                <span>{t("mahsulotYaratish.retailPriceLabel")}</span>
                <input type="number" min="0" step="0.01" value={retailPrice} onChange={(event) => setRetailPrice(event.target.value)} className={inputSm} placeholder={t("mahsulotYaratish.pricePlaceholder")} />
              </label>
              <label className="space-y-2 text-sm font-bold text-slate-500">
                <span>{t("mahsulotYaratish.wholesalePriceLabel")}</span>
                <input type="number" min="0" step="0.01" value={wholesalePrice} onChange={(event) => setWholesalePrice(event.target.value)} className={inputSm} placeholder={t("mahsulotYaratish.pricePlaceholder")} />
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="h-11 rounded-2xl bg-slate-100 px-5 text-sm font-bold text-slate-600">
                {t("mahsulotYaratish.cancel")}
              </button>
              <button
                type="button"
                onClick={() => void saqlash()}
                disabled={saqlanmoqda}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-6 text-sm font-black text-white disabled:opacity-50"
              >
                {saqlanmoqda && <LoaderCircle size={16} className="animate-spin" />}
                {t("mahsulotYaratish.create")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="mb-4 flex items-center gap-2 border-b border-orange-100 pb-4 text-sm font-black uppercase tracking-wide text-slate-600">
      <span className="text-orange-500">{icon}</span>
      {text}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  placeholder,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: Array<{ id: string; name: string }>;
}) {
  return (
    <label className="space-y-2 text-sm font-bold text-slate-500">
      <span>{label}</span>
      <div className="relative">
        <AppSelect value={value} onChange={(event) => onChange(event.target.value)} className={`${input} appearance-none pr-10`}>
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </AppSelect>
        <ChevronDown size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
      </div>
    </label>
  );
}

function ActionButton({
  children,
  busy,
  outline,
  onClick,
}: {
  children: React.ReactNode;
  busy: boolean;
  outline?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-7 text-sm font-black disabled:opacity-50 ${
        outline ? "border border-orange-300 bg-white text-orange-600" : "bg-orange-500 text-white shadow-lg shadow-orange-100 hover:bg-orange-600"
      }`}
    >
      {busy && <LoaderCircle size={17} className="animate-spin" />}
      {children}
    </button>
  );
}
