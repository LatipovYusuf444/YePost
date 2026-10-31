import { StockQuantity } from "@/Components/common/NegativeStockBadge";
import { useInventorySettingsStore } from "@/store/inventorySettingsStore";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ClipboardList,
  Image as ImageIcon,
  LoaderCircle,
  Package,
  Percent,
  ScanLine,
  Trash2,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import AppSelect from "@/Components/ui/AppSelect";
import SummaMaydoni from "@/Components/common/SummaMaydoni";
import SavdoSelect, { type SavdoSelectOption } from "@/Pages/Savdo/SavdoSelect";
import NarxTuriTanlovi from "@/Pages/Savdo/NarxTuriTanlovi";
import { cn } from "@/lib/utils";
import { kategoriyalarApi } from "@/api/catalogApi";
import { kategoriyaMahsulotlariniOlish } from "@/api/kategoriyaQoldigiApi";
import { usePosMahsulotlar } from "@/Components/layout/usePosMahsulotlar";
import {
  dollarMalumoti,
  qoldiqMiqdori,
  qoldiqNarxi,
  savatNomi,
  tanlashQoldigi,
  tanlovKaliti,
} from "@/Components/layout/posMahsulotlari";
import {
  savatchaChegirma,
  savatchaNarxTuri,
  savatchaSotuvNarxi,
  savatchaUstama,
  usePosStore,
  type CartItem,
  type NarxTuri,
} from "@/store/posStore";
import { useKassaNarxTurlari } from "@/store/savdoSozlamalariStore";
import { sotuvBirliklari } from "@/lib/kopBirlik";
import type { Kategoriya } from "@/types/catalog";
import type { OmborTanlovi, QoldiqTanlovi, SotuvNarxTuri } from "@/types/savdo";
import SavatchaMiqdoriMaydoni from "./SavatchaMiqdoriMaydoni";
import SotuvNarxiMaydoni from "./SotuvNarxiMaydoni";
import { dollarNarxi } from "./aralashTolov";
import {
  chegirmadanSotuvNarxi,
  chegirmaFoizi,
  foizdanChegirma,
  jadvalXulosasi,
  kategoriyaFiltri,
  shtrixKodTopish,
} from "./savatchaHisobi";

// Yangi sotuv oynasidagi qatorli jadval (Savdo/YangiSotuvModal) ko'rinishi: shtrix-kod, kategoriya, mahsulot tanlash va
// har bir qator uchun katalog narxi, sotuv narxi (narx turi bilan), miqdor, chegirma va jami. Ma'lumot savatcha store'idan
// olinadi va unga yoziladi — sotuvni yaratish/to'lov jarayoni (backendga yuboriladigan qatorlar) o'zgarmaydi.

const qatorUstunlari =
  "@min-[900px]/cart:grid-cols-[32px_minmax(0,1.8fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,1.9fr)_minmax(0,1.1fr)_40px]";
const mobilYorliqKlassi = "mb-1.5 text-[11px] font-black uppercase tracking-wide text-slate-500 @min-[900px]/cart:hidden";
const maydonKlassi =
  "h-11 w-full min-w-0 rounded-xl border-2 border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";
const selectTugmasiKlassi = "h-11 rounded-xl border-2 border-slate-300 px-3.5 text-sm shadow-none hover:shadow-none focus:border-[#2563EB]";

const xulosaTonlari = {
  kok: { karta: "bg-[#EFF6FF] ring-blue-200", belgi: "bg-white text-[#2563EB] ring-blue-200", qiymat: "text-[#0F172A]" },
  oddiy: { karta: "bg-white ring-slate-300", belgi: "bg-slate-50 text-[#2563EB] ring-slate-300", qiymat: "text-[#0F172A]" },
  yashil: { karta: "bg-emerald-50 ring-emerald-200", belgi: "bg-white text-emerald-600 ring-emerald-200", qiymat: "text-emerald-600" },
  asosiy: { karta: "bg-[#E8EEFF] ring-blue-200", belgi: "bg-white text-[#2563EB] ring-blue-200", qiymat: "text-[#1D4ED8]" },
} as const;

function omborNomi(ombor?: OmborTanlovi | null) {
  return ombor ? ombor.fullName || ombor.name || ombor.id : "";
}

function turKodi(tur: NarxTuri): SotuvNarxTuri {
  return tur === "ulgurji" ? "WHOLESALE" : "RETAIL";
}

type Xabar = { matn: string; xato: boolean };

export default function SavatchaJadvali({
  omborlar,
  warehouseId,
  onWarehouseChange,
  formatSumma,
  yangilash = 0,
}: {
  omborlar: OmborTanlovi[];
  warehouseId: string;
  onWarehouseChange: (id: string) => void;
  formatSumma: (value: number) => string;
  // O'sishi bilan ombor qoldig'i va katalog qayta yuklanadi ("Yangilash" tugmasi).
  yangilash?: number;
}) {
  const { t } = useTranslation("bosh_sahifa");
  const canSellNegative = useInventorySettingsStore((s) => s.canSellNegative);
  const cart = usePosStore((state) => state.cart);
  const umumiyNarxTuri = usePosStore((state) => state.narxTuri);
  const addToCart = usePosStore((state) => state.addToCart);
  const { mahsulotlar, yuklanmoqda, xato: yuklashXatosi } = usePosMahsulotlar(warehouseId, yangilash);
  const skanInputRef = useRef<HTMLInputElement>(null);
  const [skanMatni, setSkanMatni] = useState("");
  const [xabar, setXabar] = useState<Xabar | null>(null);
  const [ochishSorovi, setOchishSorovi] = useState(0);

  // Kategoriya: tanlansa mahsulot ro'yxatida faqat shu kategoriya mahsulotlari qoladi.
  const [kategoriyalar, setKategoriyalar] = useState<Kategoriya[]>([]);
  const [kategoriyaId, setKategoriyaId] = useState("");
  const [kategoriyaNatijasi, setKategoriyaNatijasi] = useState<{ id: string; idlar: Set<string> | null } | null>(null);

  useEffect(() => {
    let active = true;
    kategoriyalarApi
      .royxat()
      .then((royxat) => {
        if (active) setKategoriyalar(royxat);
      })
      .catch(() => {
        // Kategoriyasiz ham ishlaydi: filtr maydoni ko'rsatilmaydi.
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!kategoriyaId) return;
    let active = true;
    kategoriyaMahsulotlariniOlish(kategoriyaId)
      .then((royxat) => {
        if (active) setKategoriyaNatijasi({ id: kategoriyaId, idlar: new Set(royxat.map((mahsulot) => mahsulot.id)) });
      })
      .catch(() => {
        if (active) setKategoriyaNatijasi({ id: kategoriyaId, idlar: null });
      });
    return () => {
      active = false;
    };
  }, [kategoriyaId]);

  const kategoriyaYuklanmoqda = Boolean(kategoriyaId) && kategoriyaNatijasi?.id !== kategoriyaId;
  const kategoriyaXatosi = Boolean(kategoriyaId) && kategoriyaNatijasi?.id === kategoriyaId && kategoriyaNatijasi.idlar === null;
  const kategoriyaIdlari = kategoriyaId && kategoriyaNatijasi?.id === kategoriyaId ? kategoriyaNatijasi.idlar : null;
  const korinadigan = useMemo(
    () => (kategoriyaId ? (kategoriyaIdlari ? kategoriyaFiltri(mahsulotlar, kategoriyaIdlari) : []) : mahsulotlar),
    [kategoriyaId, kategoriyaIdlari, mahsulotlar],
  );

  const tanlanganOmbor = omborlar.find((ombor) => String(ombor.id) === warehouseId);

  const mahsulotOptionlari = useMemo<SavdoSelectOption[]>(() => {
    return korinadigan
      .filter((item) => canSellNegative || qoldiqMiqdori(item) > 0)
      .map((item) => {
        const nom = savatNomi(item) || t("jadval.unnamed");
        const narx = qoldiqNarxi(item, umumiyNarxTuri);
        const kodlar = [item.modification?.barcode, item.modification?.article].filter((kod): kod is string => Boolean(kod?.trim()));
        const aniqNomlar = [nom, item.modification?.product?.name].filter((matn): matn is string => Boolean(matn?.trim()));
        const asos = { value: item.modificationId, searchLabel: nom, kodlar, nomlar: aniqNomlar };
        if (narx <= 0) {
          return {
            ...asos,
            disabled: true,
            xavf: true,
            label: (
              <span className="flex w-full min-w-0 items-center justify-between gap-3">
                <span className="min-w-0 truncate text-slate-500">{nom}</span>
                <span className="shrink-0 rounded-md bg-red-100 px-2 py-0.5 text-[11px] font-black uppercase text-red-600">
                  {t("jadval.noPriceBadge")}
                </span>
              </span>
            ),
          };
        }
        return {
          ...asos,
          label: `${nom} - ${t("jadval.stockShort")}: ${qoldiqMiqdori(item)} - ${t("jadval.priceShort")}: ${formatSumma(narx)}`,
        };
      })
      .sort((a, b) => String(a.searchLabel).localeCompare(String(b.searchLabel), "uz"));
  }, [korinadigan, umumiyNarxTuri, formatSumma, t, canSellNegative]);

  // Mahsulotni savatchaga bitta dona qo'shadi; sabab qaytadi ("" — qo'shildi).
  function qoshish(item: QoldiqTanlovi): "" | "noStock" | "noPrice" {
    if (!canSellNegative && tanlashQoldigi(item, warehouseId, cart) <= 0) return "noStock";
    const narx = qoldiqNarxi(item, umumiyNarxTuri);
    if (narx <= 0) return "noPrice";
    addToCart(
      {
        id: tanlovKaliti(item.modificationId, warehouseId),
        modificationId: item.modificationId,
        nom: savatNomi(item) || t("jadval.unnamed"),
        narx,
        chakanaNarx: qoldiqNarxi(item, "chakana"),
        ulgurjiNarx: qoldiqNarxi(item, "ulgurji"),
        ...dollarMalumoti(item),
        qoldiq: qoldiqMiqdori(item),
        ...(item.birliklar?.length ? { birliklar: item.birliklar } : {}),
        warehouseId,
        warehouseName: omborNomi(tanlanganOmbor) || warehouseId,
      },
      1,
    );
    return "";
  }

  function mahsulotniTanlash(modificationId: string, qaytaOchish = false) {
    const item = mahsulotlar.find((element) => element.modificationId === modificationId);
    if (!item) return;
    const sabab = qoshish(item);
    setXabar(sabab ? { matn: t(`jadval.errors.${sabab}`), xato: true } : null);
    if (!sabab && qaytaOchish) setOchishSorovi((n) => n + 1);
  }

  function shtrixKodniQoshish() {
    if (!skanMatni.trim()) return;
    const natija = shtrixKodTopish(mahsulotlar, skanMatni);
    if (natija.holat === "topilmadi") {
      setXabar({ matn: t("jadval.scan.notFound"), xato: true });
      return;
    }
    const sabab = qoshish(natija.item);
    if (sabab) {
      setXabar({ matn: t(`jadval.errors.${sabab}`), xato: true });
      return;
    }
    setXabar({ matn: t("jadval.scan.added", { name: savatNomi(natija.item) || t("jadval.unnamed") }), xato: false });
    setSkanMatni("");
  }

  const xulosa = jadvalXulosasi(cart);
  const xatoMatni = yuklashXatosi ? t(`jadval.loadErrors.${yuklashXatosi}`) : "";
  const omborOptionlari: SavdoSelectOption[] = omborlar.map((ombor) => ({ value: String(ombor.id), label: omborNomi(ombor) }));
  const kategoriyaOptionlari: SavdoSelectOption[] = [
    { value: "", label: t("jadval.allCategories") },
    ...kategoriyalar.map((kategoriya) => ({ value: kategoriya.id, label: kategoriya.name })),
  ];

  return (
    <div className="@container/cart min-w-0">
      <div className="grid gap-3 @min-[700px]/cart:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <div className="min-w-0 @min-[700px]/cart:col-span-2">
          <div className="relative">
            <ScanLine size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              ref={skanInputRef}
              value={skanMatni}
              onChange={(event) => setSkanMatni(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                // Skaner kod + Enter yuboradi: mahsulot qo'shiladi.
                event.preventDefault();
                if (!event.nativeEvent.isComposing) shtrixKodniQoshish();
              }}
              autoComplete="off"
              placeholder={t("jadval.scanPlaceholder")}
              aria-label={t("jadval.scanAria")}
              className={cn(maydonKlassi, "pl-10 pr-10")}
            />
            {skanMatni && (
              <button
                type="button"
                onClick={() => {
                  setSkanMatni("");
                  setXabar(null);
                  skanInputRef.current?.focus();
                }}
                aria-label={t("jadval.clear")}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {kategoriyalar.length > 0 && (
          <div className="min-w-0">
            <p className="mb-1.5 text-[11px] font-black uppercase tracking-wide text-slate-500">{t("jadval.category")}</p>
            <SavdoSelect
              value={kategoriyaId}
              onChange={setKategoriyaId}
              options={kategoriyaOptionlari}
              placeholder={t("jadval.allCategories")}
              qidirish
              buttonClassName={selectTugmasiKlassi}
              portal
            />
          </div>
        )}

        {omborlar.length > 1 && (
          <div className="min-w-0">
            <p className="mb-1.5 text-[11px] font-black uppercase tracking-wide text-slate-500">{t("cart.warehouse")}</p>
            <SavdoSelect
              value={warehouseId}
              onChange={onWarehouseChange}
              options={omborOptionlari}
              buttonClassName={selectTugmasiKlassi}
              portal
            />
          </div>
        )}
      </div>

      {xabar && (
        <p role="status" className={`mt-2 text-xs font-bold ${xabar.xato ? "text-red-600" : "text-emerald-600"}`}>
          {xabar.matn}
        </p>
      )}
      {xatoMatni && (
        <p role="alert" className="mt-2 text-xs font-bold text-red-600">
          {xatoMatni}
        </p>
      )}
      {kategoriyaXatosi && (
        <p role="alert" className="mt-2 text-xs font-bold text-red-600">
          {t("jadval.categoryFailed")}
        </p>
      )}
      <p className="mt-3 text-xs font-medium leading-5 text-slate-400">{t("jadval.hint")}</p>

      <div className="mt-4">
        <div
          className={`hidden rounded-t-2xl border-2 border-slate-300 bg-slate-50 px-4 py-2.5 text-[11px] font-black uppercase tracking-wide text-slate-500 @min-[900px]/cart:grid ${qatorUstunlari} @min-[900px]/cart:gap-3`}
        >
          <span>#</span>
          <span>{t("jadval.product")}</span>
          <span>{t("jadval.catalogPrice")}</span>
          <span>{t("jadval.salePrice")}</span>
          <span>{t("cart.quantity")}</span>
          <span>{t("jadval.discount")}</span>
          <span className="text-right">{t("cart.lineTotal")}</span>
          <span />
        </div>

        <div className="space-y-3 @min-[900px]/cart:space-y-0 @min-[900px]/cart:rounded-b-2xl @min-[900px]/cart:border-2 @min-[900px]/cart:border-slate-300">
          {cart.map((item, index) => (
            <SavatchaQatori
              key={item.id}
              item={item}
              tartib={index + 1}
              umumiyNarxTuri={umumiyNarxTuri}
              omborNomiKorsatish={omborlar.length > 1}
              omborlar={omborlar}
              formatSumma={formatSumma}
            />
          ))}

          <div
            className={`grid grid-cols-1 gap-3 rounded-2xl border-2 border-slate-300 bg-white p-3.5 transition @min-[560px]/cart:grid-cols-2 @min-[900px]/cart:items-start @min-[900px]/cart:rounded-none @min-[900px]/cart:border-0 @min-[900px]/cart:px-4 @min-[900px]/cart:py-3 ${qatorUstunlari}`}
          >
            <div className="flex items-center @min-[560px]/cart:col-span-2 @min-[900px]/cart:col-span-1 @min-[900px]/cart:block @min-[900px]/cart:pt-3">
              <span className="text-sm font-black text-slate-400">
                <span className="@min-[900px]/cart:hidden">#</span>
                {cart.length + 1}
              </span>
            </div>

            <div className="min-w-0 @min-[560px]/cart:col-span-2 @min-[900px]/cart:col-span-1">
              <p className={mobilYorliqKlassi}>{t("jadval.product")}</p>
              <div className="flex items-start gap-2">
                <span
                  aria-hidden
                  className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 @min-[560px]/cart:flex"
                >
                  <ImageIcon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <SavdoSelect
                    value=""
                    onChange={(value) => mahsulotniTanlash(value)}
                    tezTanlash={(value) => mahsulotniTanlash(value, true)}
                    klaviatura
                    ochishSorovi={ochishSorovi}
                    placeholder={yuklanmoqda || kategoriyaYuklanmoqda ? t("jadval.loading") : t("jadval.selectProduct")}
                    disabled={!warehouseId || yuklanmoqda || kategoriyaYuklanmoqda}
                    options={mahsulotOptionlari}
                    buttonClassName={selectTugmasiKlassi}
                    dropdownClassName="[&>div>div]:text-center min-w-[520px] max-w-[min(720px,calc(100vw-32px))]"
                    portal
                  />
                  <p className="mt-1 flex items-center gap-1.5 truncate text-xs font-semibold text-slate-500">
                    {yuklanmoqda || kategoriyaYuklanmoqda ? (
                      <LoaderCircle size={12} className="animate-spin text-[#2563EB]" aria-hidden />
                    ) : null}
                    {t("jadval.availableStock")}: <span className="font-bold text-[#2563EB]">—</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="min-w-0">
              <p className={mobilYorliqKlassi}>{t("jadval.catalogPrice")}</p>
              <input disabled placeholder={t("jadval.pricePlaceholder")} className={maydonKlassi} />
            </div>
            <div className="min-w-0">
              <p className={mobilYorliqKlassi}>{t("jadval.salePrice")}</p>
              <input disabled placeholder={t("jadval.pricePlaceholder")} className={maydonKlassi} />
            </div>
            <div className="min-w-0">
              <p className={mobilYorliqKlassi}>{t("cart.quantity")}</p>
              <input disabled placeholder="1" className={maydonKlassi} />
            </div>
            <div className="min-w-0">
              <p className={mobilYorliqKlassi}>{t("jadval.discount")}</p>
              <input disabled placeholder="0" className={maydonKlassi} />
            </div>
            <div className="min-w-0 @min-[900px]/cart:pt-3 @min-[900px]/cart:text-right">
              <p className={mobilYorliqKlassi}>{t("cart.lineTotal")}</p>
              <p className="flex h-11 items-center rounded-xl bg-emerald-50 px-3.5 text-sm font-black text-emerald-600 ring-2 ring-emerald-200 @min-[900px]/cart:h-auto @min-[900px]/cart:justify-end @min-[900px]/cart:bg-transparent @min-[900px]/cart:p-0 @min-[900px]/cart:ring-0">
                {formatSumma(0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 @min-[900px]/cart:grid-cols-4">
        <XulosaKarta ikonka={Package} nom={t("jadval.summary.products")} qiymat={String(xulosa.mahsulotlar)} ton="kok" />
        <XulosaKarta
          ikonka={ClipboardList}
          nom={t("jadval.summary.quantity")}
          qiymat={xulosa.miqdor.toLocaleString("uz-UZ", { maximumFractionDigits: 3 })}
          ton="oddiy"
        />
        <XulosaKarta ikonka={Percent} nom={t("jadval.summary.discount")} qiymat={formatSumma(xulosa.chegirma)} ton="yashil" />
        <XulosaKarta ikonka={Wallet} nom={t("jadval.summary.total")} qiymat={formatSumma(xulosa.jami)} ton="asosiy" />
      </div>
    </div>
  );
}

function XulosaKarta({ ikonka: Ikonka, nom, qiymat, ton }: { ikonka: LucideIcon; nom: string; qiymat: string; ton: keyof typeof xulosaTonlari }) {
  const stil = xulosaTonlari[ton];
  return (
    <div className={cn("flex min-w-0 items-center gap-3 rounded-2xl p-3.5 ring-2", stil.karta)}>
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-2", stil.belgi)}>
        <Ikonka size={20} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-slate-600">{nom}</p>
        <p className={cn("truncate text-lg font-black tabular-nums", stil.qiymat)}>{qiymat}</p>
      </div>
    </div>
  );
}

function SavatchaQatori({
  item,
  tartib,
  umumiyNarxTuri,
  omborNomiKorsatish,
  omborlar,
  formatSumma,
}: {
  item: CartItem;
  tartib: number;
  umumiyNarxTuri: NarxTuri;
  omborNomiKorsatish: boolean;
  omborlar: OmborTanlovi[];
  formatSumma: (value: number) => string;
}) {
  const { t } = useTranslation("bosh_sahifa");
  const updateQuantity = usePosStore((state) => state.updateQuantity);
  const setBirlik = usePosStore((state) => state.setBirlik);
  const setSotuvNarxi = usePosStore((state) => state.setSotuvNarxi);
  const setItemNarxTuri = usePosStore((state) => state.setItemNarxTuri);
  const removeFromCart = usePosStore((state) => state.removeFromCart);
  const narxRuxsati = useKassaNarxTurlari();
  const [chegirmaTuri, setChegirmaTuri] = useState<"sum" | "foiz">("sum");
  // Chegirma yozilayotganda kiritilgan matn ko'rsatiladi (masalan "12."); aks holda narxdan hisoblangan qiymat.
  const [chegirmaMatni, setChegirmaMatni] = useState<string | null>(null);

  const tur = savatchaNarxTuri(item, umumiyNarxTuri);
  const sotuvNarxi = savatchaSotuvNarxi(item);
  const chegirma = savatchaChegirma(item);
  const ustama = savatchaUstama(item);
  const foiz = chegirmaFoizi(item);
  const dollar = dollarNarxi(item, tur);
  const qatorJami = sotuvNarxi * item.soni;
  const birliklar = item.baza ? sotuvBirliklari(item.birliklar) : [];
  const omborNomi = item.warehouseName || omborlar.find((ombor) => String(ombor.id) === item.warehouseId)?.name || "";
  const chegirmaQiymati =
    chegirmaMatni ?? (chegirmaTuri === "foiz" ? (foiz > 0 ? String(foiz) : "") : chegirma > 0 ? String(chegirma) : "");

  function chegirmaOzgardi(matn: string) {
    setChegirmaMatni(matn);
    const son = Number(matn) || 0;
    const summa = chegirmaTuri === "foiz" ? foizdanChegirma(item, son) : son;
    // Chegirma sotuv narxini pasaytiradi (bo'sh yoki 0 — katalog narxiga qaytadi); savatcha chegirmani shundan hisoblaydi.
    setSotuvNarxi(item.id, chegirmadanSotuvNarxi(item, summa));
  }

  function chegirmaBirliginiOzgartirish(yangi: "sum" | "foiz") {
    setChegirmaTuri(yangi);
    setChegirmaMatni(null);
  }

  return (
    <div className={`grid grid-cols-1 gap-3 rounded-2xl border-2 border-slate-300 bg-white p-3.5 transition @min-[560px]/cart:grid-cols-2 @min-[900px]/cart:items-start @min-[900px]/cart:rounded-none @min-[900px]/cart:border-0 @min-[900px]/cart:border-b-2 @min-[900px]/cart:border-slate-200 @min-[900px]/cart:px-4 @min-[900px]/cart:py-3 ${qatorUstunlari}`}>
      <div className="flex items-center justify-between @min-[560px]/cart:col-span-2 @min-[900px]/cart:col-span-1 @min-[900px]/cart:block @min-[900px]/cart:pt-3">
        <span className="text-sm font-black text-slate-400">
          <span className="@min-[900px]/cart:hidden">#</span>
          {tartib}
        </span>
        <button
          type="button"
          onClick={() => removeFromCart(item.id)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-500 transition hover:bg-red-100 @min-[900px]/cart:hidden"
          aria-label={`${t("cart.removeAria")}: ${item.nom}`}
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="min-w-0 @min-[560px]/cart:col-span-2 @min-[900px]/cart:col-span-1">
        <p className={mobilYorliqKlassi}>{t("jadval.product")}</p>
        <div className="flex items-start gap-2">
          <span
            aria-hidden
            className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 @min-[560px]/cart:flex"
          >
            <ImageIcon size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p
              title={item.nom}
              className={cn(maydonKlassi, "flex items-center truncate bg-slate-50 hover:border-slate-300")}
            >
              <span className="truncate">{item.nom}</span>
            </p>
            <p className="mt-1 truncate text-xs font-semibold text-slate-500">
              {t("jadval.availableStock")}:{" "}
              <span className="font-bold text-[#2563EB]">{<StockQuantity value={item.qoldiq} />}</span>
              {omborNomiKorsatish && omborNomi ? <span className="text-slate-400"> · {omborNomi}</span> : null}
            </p>
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <p className={mobilYorliqKlassi}>{t("jadval.catalogPrice")}</p>
        <input
          readOnly
          disabled
          value={item.narx.toLocaleString("uz-UZ", { maximumFractionDigits: 2 })}
          title={t("jadval.priceLocked")}
          aria-label={t("jadval.catalogPrice")}
          className={maydonKlassi}
        />
        <NarxTuriTanlovi
          kichik
          qiymat={turKodi(tur)}
          holat={(kod) => {
            if (kod === "COST") return { ruxsat: false, narxBor: false };
            const narxTuri: NarxTuri = kod === "WHOLESALE" ? "ulgurji" : "chakana";
            return {
              ruxsat: narxRuxsati[narxTuri],
              narxBor: (narxTuri === "ulgurji" ? item.ulgurjiNarx : item.chakanaNarx) > 0,
            };
          }}
          onChange={(kod) => setItemNarxTuri(item.id, kod === "WHOLESALE" ? "ulgurji" : "chakana")}
        />
        {dollar && (
          <p className="mt-1 text-[11px] font-semibold text-slate-400">
            ${dollar.narx.toLocaleString("uz-UZ", { maximumFractionDigits: 2 })}
          </p>
        )}
      </div>

      <div className="min-w-0">
        <p className={mobilYorliqKlassi}>{t("jadval.salePrice")}</p>
        <SotuvNarxiMaydoni
          jadval
          item={item}
          onChange={(narx) => {
            setChegirmaMatni(null);
            setSotuvNarxi(item.id, narx);
          }}
          formatSumma={formatSumma}
          className={cn(maydonKlassi, "text-right tabular-nums")}
        />
      </div>

      <div className="min-w-0">
        <p className={mobilYorliqKlassi}>{t("cart.quantity")}</p>
        <SavatchaMiqdoriMaydoni
          soni={item.soni}
          qoldiq={item.qoldiq}
          label={t("cart.quantityLabel", { name: item.nom })}
          onChange={(soni) => updateQuantity(item.id, soni)}
          className={maydonKlassi}
        />
        {birliklar.length > 0 && (
          <div className="mt-1.5">
            <AppSelect
              aria-label={t("cart.unitLabel", { name: item.nom })}
              value={item.birlikId ?? ""}
              onChange={(event) => setBirlik(item.id, event.target.value)}
              dropdownMinWidth={160}
              className="h-9 w-full min-w-0 rounded-xl text-[11px] font-bold text-slate-700 [&>button]:border-2 [&>button]:border-slate-300 [&>button]:px-2"
            >
              {birliklar.map((birlik) => (
                <option key={birlik.unitId} value={birlik.asosiy ? "" : birlik.unitId}>
                  {birlik.qisqa || birlik.nomi}
                </option>
              ))}
            </AppSelect>
          </div>
        )}
      </div>

      <div className="min-w-0">
        <p className={mobilYorliqKlassi}>{t("jadval.discount")}</p>
        <div className="relative">
          <SummaMaydoni
            value={chegirmaQiymati}
            onChange={(matn) => {
              // Foiz 100 dan oshmaydi.
              chegirmaOzgardi(chegirmaTuri === "foiz" && Number(matn) > 100 ? "100" : matn);
            }}
            onBlur={() => setChegirmaMatni(null)}
            aria-label={t("jadval.discount")}
            className={cn(maydonKlassi, "pr-[84px]")}
            placeholder="0"
          />
          <div
            role="group"
            aria-label={t("jadval.discountUnit")}
            className="absolute right-1.5 top-1/2 flex -translate-y-1/2 gap-0.5 rounded-lg bg-slate-100 p-0.5 text-[10px] font-bold"
          >
            {(["sum", "foiz"] as const).map((birlik) => (
              <button
                key={birlik}
                type="button"
                aria-pressed={chegirmaTuri === birlik}
                onClick={() => chegirmaBirliginiOzgartirish(birlik)}
                className={cn(
                  "rounded-md px-1.5 py-1 transition",
                  chegirmaTuri === birlik ? "bg-white text-[#2563EB] shadow-sm ring-2 ring-blue-200" : "text-slate-500 hover:text-slate-800",
                )}
              >
                {birlik === "foiz" ? "%" : t("jadval.currencySuffix")}
              </button>
            ))}
          </div>
        </div>
        {chegirmaTuri === "foiz" && chegirma > 0 && (
          <p className="mt-1 text-[11px] font-semibold text-emerald-600">= {formatSumma(chegirma)}</p>
        )}
      </div>

      <div className="min-w-0 @min-[900px]/cart:pt-3 @min-[900px]/cart:text-right">
        <p className={mobilYorliqKlassi}>{t("cart.lineTotal")}</p>
        <p className="flex h-11 items-center rounded-xl bg-emerald-50 px-3.5 text-sm font-black text-emerald-600 ring-2 ring-emerald-200 @min-[900px]/cart:h-auto @min-[900px]/cart:justify-end @min-[900px]/cart:bg-transparent @min-[900px]/cart:p-0 @min-[900px]/cart:ring-0">
          <span className="truncate">{formatSumma(qatorJami)}</span>
        </p>
      </div>

      <div className="hidden @min-[900px]/cart:flex @min-[900px]/cart:justify-end @min-[900px]/cart:pt-1.5">
        <button
          type="button"
          onClick={() => removeFromCart(item.id)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-red-500 transition hover:bg-red-50"
          aria-label={`${t("cart.removeAria")}: ${item.nom}`}
        >
          <Trash2 size={17} />
        </button>
      </div>

      {ustama > 0 && (
        <p className="rounded-xl bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-700 ring-2 ring-amber-100 @min-[560px]/cart:col-span-2 @min-[900px]/cart:col-span-full">
          {t("jadval.markupHint", { katalog: formatSumma(item.narx), sotuv: formatSumma(sotuvNarxi), jami: formatSumma(ustama) })}
        </p>
      )}
      {chegirma > 0 && ustama <= 0 && (
        <p className="rounded-xl bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 ring-2 ring-emerald-200 @min-[560px]/cart:col-span-2 @min-[900px]/cart:col-span-full">
          {t("jadval.discountHint", { katalog: formatSumma(item.narx), sotuv: formatSumma(sotuvNarxi), jami: formatSumma(chegirma) })}
        </p>
      )}
    </div>
  );
}
