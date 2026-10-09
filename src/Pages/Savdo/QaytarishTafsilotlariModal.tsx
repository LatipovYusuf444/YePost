import { useEffect, useMemo, useState, type ReactNode } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import {
  Ban,
  Banknote,
  BadgeCheck,
  Boxes,
  CalendarClock,
  CheckCircle2,
  Edit3,
  Info,
  ListChecks,
  LoaderCircle,
  Package,
  Receipt,
  RotateCcw,
  Save,
  Trash2,
  User,
  UserCheck,
  Warehouse,
  X,
  type LucideIcon,
} from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { qaytarishniOldindanKorish, sotuvTafsilotiniOlish } from "@/api/savdoApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { mahsulotlarApi, modifikatsiyalarApi } from "@/api/catalogApi";
import { useSavdoStore } from "@/store/savdoStore";
import HujjatOchirish from "@/Components/common/HujjatOchirish";
import TasdiqlashOynasi from "@/Components/common/TasdiqlashOynasi";
import { useHujjatniBekorQilishMumkinmi } from "@/hooks/useHujjatniOchirishMumkinmi";
import type {
  Qaytarish,
  QaytarishSababi,
  QaytarishToloviniQaytarishUsuli as RefundMethod,
} from "@/types/savdo";
import {
  mijozNomi,
  pulniFormatlash,
  qaytarishSummasi,
  sananiFormatlash,
  sotuvMahsulotiId,
  sotuvMahsulotiMiqdori,
  sotuvMahsulotiModifikatsiyaId,
  sotuvMahsulotiNarxi,
  sotuvRaqami,
} from "./savdoYordamchilari";
import SavdoSelect from "./SavdoSelect";
import QaytarishHisobKitobi from "./qaytarish/QaytarishHisobKitobi";
import QaytarishVaqtChizigi from "./qaytarish/QaytarishVaqtChizigi";
import QaytarishOldindanHisobi, { type OldindanKorinishHolati } from "./qaytarish/QaytarishOldindanHisobi";
import { hisobMuvofiqmi, hujjatHisobKitobi, oldindanHisobKitob } from "./qaytarish/hisobKitob";
import { qaytarishMijozi, qaytarishRaqami } from "./qaytarish/qaytarishYordamchilari";

type Props = {
  qaytarishId: string;
  onYopish: () => void;
};

type Qator = {
  saleItemId: string;
  modificationId: string;
  quantity: number;
  price: number;
  maxQuantity: number;
  nom: string;
};

const sababMatni: Record<QaytarishSababi, string> = {
  DEFECT: "reasons.defect",
  CUSTOMER_CHANGED_MIND: "reasons.customerChangedMind",
  WRONG: "reasons.wrong",
  NOT_SUITABLE: "reasons.notSuitable",
  OTHER: "reasons.other",
};

const refundMethodMatni: Record<RefundMethod, string> = {
  CASH: "refundMethods.cash",
  CARD: "refundMethods.card",
  BALANCE: "refundMethods.balance",
  NONE: "refundMethods.none",
};

function mahsulotNomi(
  item: {
    modificationId: string;
    modification?: {
      name?: string;
      product?: { name?: string };
    };
  },
  // Nom kelmasa ID o'rniga o'qiladigan matn ko'rsatish uchun.
  bosh: string = item.modificationId
) {
  const productName = item.modification?.product?.name;
  const variantName = item.modification?.name;
  return [productName, variantName && variantName !== productName ? variantName : ""]
    .filter(Boolean)
    .join(" / ") || bosh;
}

// Mahsulot nomi va variantini alohida qatorlarda ko'rsatish uchun.
function mahsulotQismlari(
  item: { modificationId: string; modification?: { name?: string; product?: { name?: string } } },
  bosh: string
) {
  const mahsulot = item.modification?.product?.name;
  const variant = item.modification?.name;
  return {
    nom: mahsulot || variant || bosh,
    variant: mahsulot && variant && variant !== mahsulot ? variant : "",
  };
}

function sababniOzbekcha(reason?: string) {
  return sababMatni[String(reason ?? "OTHER").toUpperCase() as QaytarishSababi] ?? "reasons.other";
}

function refundMethodniOzbekcha(method?: string) {
  return refundMethodMatni[String(method ?? "CASH").toUpperCase() as RefundMethod] ?? "refundMethods.cash";
}

export default function QaytarishTafsilotlariModal({
  qaytarishId,
  onYopish,
}: Props) {
  const { t } = useTranslation("savdo_qaytarish");
  const qaytarishTafsilotiniYuklash = useSavdoStore(
    (state) => state.qaytarishTafsilotiniYuklash
  );
  const qaytarishniYangilash = useSavdoStore(
    (state) => state.qaytarishniYangilash
  );
  const xatolikniTozalash = useSavdoStore(
    (state) => state.xatolikniTozalash
  );
  const qaytarishniOchirish = useSavdoStore(
    (state) => state.qaytarishniOchirish
  );
  const qaytarishniTiklash = useSavdoStore(
    (state) => state.qaytarishniTiklash
  );
  const qaytarishniTasdiqlash = useSavdoStore(
    (state) => state.qaytarishniTasdiqlash
  );
  const qaytarishniBekorQilish = useSavdoStore(
    (state) => state.qaytarishniBekorQilish
  );
  const bekorQilishRuxsati = useHujjatniBekorQilishMumkinmi("savdo");
  const sotuvlar = useSavdoStore((state) => state.sotuvlar);
  const omborlar = useSavdoStore((state) => state.omborlar);
  const xodimlar = useSavdoStore((state) => state.xodimlar);
  const amalBajarilmoqda = useSavdoStore(
    (state) => state.amalBajarilmoqda
  );
  const xatolik = useSavdoStore((state) => state.xatolik);

  const [qaytarish, setQaytarish] = useState<Qaytarish | null>(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [tahrir, setTahrir] = useState(false);
  // Holat o'zgartiruvchi amal tasdiqlash oynasi: tasdiqlash (DRAFT) yoki bekor qilish (CONFIRMED).
  const [holatAmali, setHolatAmali] = useState<"tasdiqlash" | "bekorQilish" | null>(null);
  // Holat o'zgargach (tasdiqlash / bekor qilish / tiklash) jarayon tarixi backenddan qayta olinadi.
  const [vaqtChizigiTokeni, setVaqtChizigiTokeni] = useState(0);
  const [sotuvYuklanmoqda, setSotuvYuklanmoqda] = useState(false);
  const [saleId, setSaleId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [responsibleId, setResponsibleId] = useState("");
  const [reason, setReason] = useState<QaytarishSababi>("OTHER");
  const [note, setNote] = useState("");
  const [reasonComment, setReasonComment] = useState("");
  // Qoralama hujjat: hisob-kitob snapshot'i faqat tasdiqlashda yoziladi, shuning uchun oldindan ko'rish (POST /returns/preview).
  const [qoralamaHisobi, setQoralamaHisobi] = useState<OldindanKorinishHolati>({ turi: "bosh" });
  const [qoralamaUrinish, setQoralamaUrinish] = useState(0);
  const [items, setItems] = useState<Qator[]>([]);

  useEffect(() => {
    let faol = true;
    async function yuklash() {
      setYuklanmoqda(true);
      xatolikniTozalash();
      const item = await qaytarishTafsilotiniYuklash(qaytarishId);
      if (!faol) return;
      if (item?.saleId) {
        try {
          const sale = await sotuvTafsilotiniOlish(item.saleId);
          if (!faol) return;
          const sotuvdanBoyitilgan = (item.items ?? []).map((returnItem) => {
            const saleItem = (sale.items ?? []).find(
              (candidate) =>
                sotuvMahsulotiId(candidate) === returnItem.saleItemId ||
                sotuvMahsulotiModifikatsiyaId(candidate) === returnItem.modificationId
            );
            return { ...returnItem, modification: returnItem.modification ?? saleItem?.modification };
          });
          const boyitilganItems = await Promise.all(
            sotuvdanBoyitilgan.map(async (returnItem) => {
              if (returnItem.modification?.product?.name) return returnItem;
              try {
                const modification = await modifikatsiyalarApi.olish(returnItem.modificationId);
                const nestedProduct = (modification as typeof modification & { product?: { id: string; name?: string } }).product;
                const productId = modification.productId ?? nestedProduct?.id;
                let product = null;
                if (productId) {
                  try {
                    product = await mahsulotlarApi.olish(productId);
                  } catch {
                    product = null;
                  }
                }
                return {
                  ...returnItem,
                  modification: {
                    ...returnItem.modification,
                    id: modification.id,
                    name: modification.name ?? returnItem.modification?.name,
                    product: product
                      ? { id: product.id, name: product.name }
                      : nestedProduct?.name
                        ? { id: nestedProduct.id, name: nestedProduct.name }
                        : returnItem.modification?.product,
                  },
                };
              } catch {
                return returnItem;
              }
            })
          );
          if (!faol) return;
          setQaytarish({ ...item, sale, items: boyitilganItems });
        } catch {
          setQaytarish(item);
        }
      } else {
        setQaytarish(item);
      }
      setYuklanmoqda(false);
    }
    void yuklash();
    return () => {
      faol = false;
    };
  }, [qaytarishId, qaytarishTafsilotiniYuklash, xatolikniTozalash]);

  async function sotuvdanQatorlar(sotuvId: string, mavjud?: Qaytarish) {
    setSotuvYuklanmoqda(true);
    try {
      const sotuv = await sotuvTafsilotiniOlish(sotuvId);
      setWarehouseId(sotuv.warehouseId ?? sotuv.warehouse?.id ?? "");
      setResponsibleId(sotuv.responsibleId ?? "");
      setItems(
        (sotuv.items ?? [])
          .map((item) => {
            const saleItemId = sotuvMahsulotiId(item);
            const modificationId = sotuvMahsulotiModifikatsiyaId(item);
            const sotilganMiqdor = sotuvMahsulotiMiqdori(item);
            const sotilganNarx = sotuvMahsulotiNarxi(item);
            const qaytarilgan = mavjud?.items?.find(
              (qaytarishItem) =>
                qaytarishItem.saleItemId === saleItemId ||
                qaytarishItem.saleItemId === item.saleItemId
            );
            return {
              saleItemId,
              modificationId,
              quantity: Number(qaytarilgan?.quantity ?? sotilganMiqdor),
              price: Number(qaytarilgan?.price ?? sotilganNarx),
              maxQuantity: sotilganMiqdor,
              nom: mahsulotNomi(item),
            };
          })
          .filter(
            (item) =>
              item.saleItemId &&
              item.modificationId &&
              Number.isFinite(item.quantity) &&
              Number.isFinite(item.price) &&
              item.maxQuantity >= 0.001
          )
      );
      return sotuv;
    } finally {
      setSotuvYuklanmoqda(false);
    }
  }

  async function tahrirlashniBoshlash() {
    if (!qaytarish) return;
    xatolikniTozalash();
    setSaleId(qaytarish.saleId);
    setWarehouseId(qaytarish.warehouseId);
    setResponsibleId(qaytarish.responsibleId ?? "");
    setReason((qaytarish.reason as QaytarishSababi) ?? "OTHER");
    setNote(qaytarish.note ?? "");
    setReasonComment(qaytarish.reasonComment ?? "");

    if (qaytarish.saleId) {
      await sotuvdanQatorlar(qaytarish.saleId, qaytarish);
    } else {
      setItems(
        (qaytarish.items ?? []).map((item) => ({
          saleItemId: item.saleItemId,
          modificationId: item.modificationId,
          quantity: Number(item.quantity),
          price: Number(item.price),
          maxQuantity: Number(item.quantity),
          nom: mahsulotNomi(item),
        }))
      );
    }
    setTahrir(true);
  }

  async function sotuvniTanlash(yangiSaleId: string) {
    setSaleId(yangiSaleId);
    if (!yangiSaleId) {
      setItems([]);
      return;
    }
    await sotuvdanQatorlar(yangiSaleId);
  }

  const tanlanganQatorlar = useMemo(
    () =>
      items.filter(
        (item) =>
          item.saleItemId &&
          item.modificationId &&
          item.quantity > 0 &&
          item.quantity <= item.maxQuantity
      ),
    [items]
  );

  const jami = useMemo(
    () =>
      tanlanganQatorlar.reduce(
        (summa, item) => summa + item.quantity * item.price,
        0
      ),
    [tanlanganQatorlar]
  );

  async function saqlash() {
    if (
      !qaytarish ||
      !saleId ||
      !warehouseId ||
      tanlanganQatorlar.length === 0
    )
      return;

    const yangilangan = await qaytarishniYangilash(qaytarish.id, {
      saleId,
      warehouseId,
      responsibleId: responsibleId || undefined,
      reason,
      reasonComment: reasonComment.trim() || undefined,
      note,
      items: tanlanganQatorlar.map(
        ({ saleItemId, modificationId, quantity, price }) => ({
          saleItemId,
          modificationId,
          quantity,
          price,
        })
      ),
    });
    if (!yangilangan) return;

    const toliq = await qaytarishTafsilotiniYuklash(qaytarish.id);
    setQaytarish(toliq ?? yangilangan);
    setTahrir(false);
  }

  const holat = String(qaytarish?.status ?? "DRAFT").toUpperCase();
  const qoralama = holat === "DRAFT";
  const tasdiqlangan = holat === "CONFIRMED";

  // Hisob-kitob kartasi: faqat tasdiqlangan hujjatning o'z (backend) maydonlari. Eski hujjatlarda debtBefore/debtAfter
  // null bo'lishi mumkin — ular "ma'lumot mavjud emas" deb ko'rsatiladi, sotuvning hozirgi qarzi o'rniga qo'yilmaydi.
  const hisobKitob = qaytarish && tasdiqlangan ? hujjatHisobKitobi(qaytarish) : null;
  const jamiDona = (qaytarish?.items ?? []).reduce((jami, qator) => jami + (Number(qator.quantity) || 0), 0);

  // Qoralama hujjat uchun oldindan ko'rish so'rovi (tahrirlash vaqtida va boshqa holatlarda yuborilmaydi).
  const qoralamaSorovi = useMemo(() => {
    if (!qaytarish || !qoralama || tahrir) return "";
    const qatorlar = (qaytarish.items ?? []).map((qator) => ({ saleItemId: qator.saleItemId, quantity: Number(qator.quantity) }));
    if (!qaytarish.saleId || qatorlar.length === 0 || qatorlar.some((qator) => !qator.saleItemId || !Number.isFinite(qator.quantity))) return "";
    const usul = String(qaytarish.refundMethod ?? "").toUpperCase();
    return JSON.stringify({
      saleId: qaytarish.saleId,
      ...(["CASH", "CARD", "BALANCE", "NONE"].includes(usul) ? { refundMethod: usul } : {}),
      items: qatorlar,
    });
  }, [qaytarish, qoralama, tahrir]);

  useEffect(() => {
    if (!qoralamaSorovi) {
      setQoralamaHisobi({ turi: "bosh" });
      return;
    }
    const boshqaruv = new AbortController();
    setQoralamaHisobi({ turi: "yuklanmoqda" });
    qaytarishniOldindanKorish(JSON.parse(qoralamaSorovi), boshqaruv.signal)
      .then((javob) => {
        const hisob = oldindanHisobKitob(javob);
        setQoralamaHisobi(
          !hisob
            ? { turi: "xato", xabar: t("wizard.errors.previewIncomplete") }
            : !hisobMuvofiqmi(hisob)
              ? { turi: "xato", xabar: t("wizard.errors.previewInconsistent") }
              : { turi: "tayyor", hisob }
        );
      })
      .catch((error: unknown) => {
        if (axios.isCancel(error)) return;
        setQoralamaHisobi({ turi: "xato", xabar: getApiErrorMessage(error) });
      });
    return () => boshqaruv.abort();
  }, [qoralamaSorovi, qoralamaUrinish, t]);

  // Tasdiqlash/bekor qilishdan keyin hujjat (status, refundAmount, debtReduction, debtBefore/After) va tarix backenddan qayta olinadi.
  async function holatniQaytaYuklash(id: string) {
    const yangi = await qaytarishTafsilotiniYuklash(id);
    if (yangi) setQaytarish((joriy) => (joriy ? { ...joriy, ...yangi } : yangi));
    setVaqtChizigiTokeni((son) => son + 1);
  }

  async function holatAmaliniBajarish(id: string) {
    const bajarildi = holatAmali === "bekorQilish" ? await qaytarishniBekorQilish(id) : await qaytarishniTasdiqlash(id);
    if (bajarildi) await holatniQaytaYuklash(id);
    return bajarildi;
  }
  const tasdiqlanganSotuvlar = sotuvlar.filter(
    (sotuv) =>
      String(sotuv.status).toUpperCase() === "CONFIRMED" &&
      (sotuv.items?.length ?? 0) > 0
  );

  return (
    <AppModal className="items-start justify-start bg-[rgba(15,23,42,.50)] p-3 backdrop-blur-[3px] lg:py-4 lg:pl-[88px] lg:pr-4">
      <section className="scrollbar-hidden h-[calc(100vh-24px)] w-full overflow-y-auto rounded-[34px] border border-orange-100 bg-gradient-to-br from-[#F8FAFC] via-[#FFFFFF] to-[#E8EEF7] text-[#253044] shadow-[0_34px_120px_rgba(15,23,42,.42)] ring-1 ring-white/80 lg:h-[calc(100vh-32px)] lg:rounded-l-[46px] lg:rounded-r-[36px]">
        <header className="sticky top-0 z-20 flex items-start justify-between gap-3 border-b border-orange-100/80 bg-[#F8FAFC]/90 px-4 py-4 backdrop-blur-xl sm:gap-4 sm:px-6 sm:py-5 lg:px-10 lg:py-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-200 sm:flex">
              <RotateCcw size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-500">
                {t("header.eyebrow")}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <h2 className="text-xl font-black text-slate-950 sm:text-2xl">
                  {qaytarish
                    ? t("header.titleWithId", {
                        id: qaytarishRaqami(qaytarish),
                      })
                    : t("header.titleFallback")}
                </h2>
                {qaytarish && <HolatBelgisi holat={holat} matn={t(holatMatni(holat))} />}
              </div>
              {qaytarish && (
                <p className="mt-1 truncate text-sm font-semibold text-slate-500">
                  {[
                    qaytarishMijozi(qaytarish, sotuvlar),
                    qaytarish.sale ? sotuvRaqami(qaytarish.sale) : sotuvRaqami({ id: qaytarish.saleId }),
                    sananiFormatlash(qaytarish.createdAt),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onYopish}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm ring-1 ring-orange-100 transition hover:bg-orange-500 hover:text-white"
            aria-label={t("header.closeAria")}
          >
            <X size={19} />
          </button>
        </header>

        {yuklanmoqda ? (
          <div className="flex h-72 items-center justify-center">
            <LoaderCircle className="animate-spin text-orange-500" size={34} />
          </div>
        ) : !qaytarish ? (
          <div className="p-12 text-center text-gray-500">
            {t("header.loadError")}
          </div>
        ) : (
          <div className="p-5 lg:p-9">
            {xatolik && (
              <div className="mb-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
                {xatolik}
              </div>
            )}

            {!tahrir ? (
              <>
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
                  <div className="min-w-0 space-y-6">
                    {/* Hisob-kitob: tasdiqlangan hujjatda hujjatning o'z (backend) qiymatlari */}
                    {hisobKitob && (
                      <section aria-label={t("detail.calcTitle")}>
                        <h3 className="mb-3 text-base font-black text-slate-900">{t("detail.calcTitle")}</h3>
                        <QaytarishHisobKitobi hisob={hisobKitob} usul={String(qaytarish.refundMethod ?? "CASH").toUpperCase()} ixcham />
                        {(hisobKitob.mavjudQarz === null || hisobKitob.qolganQarz === null) && (
                          <p className="mt-3 flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold leading-5 text-slate-500">
                            <Info size={15} className="mt-0.5 shrink-0 text-slate-400" aria-hidden />
                            {t("detail.snapshotMissing")}
                          </p>
                        )}
                      </section>
                    )}
                    {qoralama && qoralamaSorovi && (
                      <section aria-label={t("detail.calcTitle")}>
                        <h3 className="mb-3 text-base font-black text-slate-900">{t("detail.calcTitle")}</h3>
                        <QaytarishOldindanHisobi
                          holat={qoralamaHisobi}
                          usul={String(qaytarish.refundMethod ?? "CASH").toUpperCase()}
                          ixcham
                          onQaytaUrinish={() => setQoralamaUrinish((son) => son + 1)}
                        />
                      </section>
                    )}
                    {/* Backend tasdiqlashda hisoblagan qiymatlar kartada ko'rsatilmagan holatlar (masalan, bekor qilingan hujjat) */}
                    {!qoralama && !hisobKitob && (qaytarish.refundAmount != null || qaytarish.debtReduction != null) && (
                      <dl className="grid gap-3 sm:grid-cols-2">
                        {qaytarish.debtReduction != null && (
                          <BilimQatori ikonka={BadgeCheck} nom={t("view.debtReduction")} qiymat={pulniFormatlash(Number(qaytarish.debtReduction) || 0)} />
                        )}
                        {qaytarish.refundAmount != null && (
                          <BilimQatori ikonka={Banknote} nom={t("view.refundAmount")} qiymat={pulniFormatlash(Number(qaytarish.refundAmount) || 0)} />
                        )}
                      </dl>
                    )}

                    {/* Qaytarilgan mahsulotlar */}
                    <section className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_30px_-18px_rgba(15,23,42,.25)]" aria-label={t("detail.itemsTitle")}>
                      <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-linear-to-r from-orange-50/70 via-white to-white px-5 py-4">
                        <h3 className="flex items-center gap-2.5 text-base font-black text-slate-900">
                          <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white shadow-md shadow-orange-200">
                            <Boxes size={18} />
                          </span>
                          {t("detail.itemsTitle")}
                        </h3>
                        <span className="shrink-0 whitespace-nowrap rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                          {t("detail.itemsCount", { count: (qaytarish.items ?? []).length })}
                        </span>
                      </div>
                      {(qaytarish.items ?? []).length === 0 ? (
                        <p className="px-5 py-10 text-center text-sm font-semibold text-gray-400">{t("table.empty")}</p>
                      ) : (
                        <>
                          <table className="hidden w-full text-left text-sm md:table">
                            <thead className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                              <tr className="border-b border-slate-100">
                                <th className="px-5 py-3">{t("table.product")}</th>
                                <th className="px-5 py-3 text-center">{t("table.quantity")}</th>
                                <th className="px-5 py-3 text-right">{t("table.price")}</th>
                                <th className="px-5 py-3 text-right">{t("table.total")}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(qaytarish.items ?? []).map((item, index) => {
                                const qism = mahsulotQismlari(item, t("table.unknownProduct"));
                                return (
                                  <tr key={item.id ?? `${item.saleItemId}-${index}`} className="transition hover:bg-orange-50/40">
                                    <td className="px-5 py-4">
                                      <div className="flex items-center gap-3">
                                        <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 ring-1 ring-orange-100">
                                          <Package size={18} />
                                        </span>
                                        <div className="min-w-0">
                                          <p className="break-words font-extrabold text-slate-900">{qism.nom}</p>
                                          {qism.variant && <p className="mt-0.5 text-xs font-semibold text-slate-400">{qism.variant}</p>}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                      <span className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-black tabular-nums text-sky-700 ring-1 ring-sky-100">
                                        {item.quantity} {t("wizard.unit")}
                                      </span>
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-4 text-right font-semibold tabular-nums text-slate-600">{pulniFormatlash(item.price)}</td>
                                    <td className="whitespace-nowrap px-5 py-4 text-right text-[15px] font-extrabold tabular-nums text-slate-950">{pulniFormatlash(item.quantity * item.price)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          <ul className="divide-y divide-slate-100 md:hidden">
                            {(qaytarish.items ?? []).map((item, index) => {
                              const qism = mahsulotQismlari(item, t("table.unknownProduct"));
                              return (
                                <li key={item.id ?? `${item.saleItemId}-${index}`} className="flex items-start gap-3 px-5 py-4">
                                  <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 ring-1 ring-orange-100">
                                    <Package size={18} />
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="break-words text-sm font-extrabold text-slate-900">{qism.nom}</p>
                                    {qism.variant && <p className="mt-0.5 text-xs font-semibold text-slate-400">{qism.variant}</p>}
                                    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold tabular-nums text-slate-500">
                                      <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-0.5 font-black text-sky-700 ring-1 ring-sky-100">
                                        {item.quantity} {t("wizard.unit")}
                                      </span>
                                      × {pulniFormatlash(item.price)}
                                    </p>
                                  </div>
                                  <p className="shrink-0 text-sm font-extrabold tabular-nums text-slate-950">{pulniFormatlash(item.quantity * item.price)}</p>
                                </li>
                              );
                            })}
                          </ul>
                        </>
                      )}
                      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-orange-100 bg-linear-to-r from-orange-50/80 via-orange-50/40 to-white px-5 py-4">
                        <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
                          {t("view.amount")}
                          <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-black tabular-nums text-slate-600 ring-1 ring-orange-100">
                            {jamiDona} {t("wizard.unit")}
                          </span>
                        </span>
                        <span className="text-2xl font-extrabold tabular-nums text-slate-950">{pulniFormatlash(qaytarishSummasi(qaytarish))}</span>
                      </div>
                    </section>

                    {qaytarish.reasonComment && (
                      <section className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm">
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{t("view.reasonComment")}</p>
                        <p className="mt-1 whitespace-pre-line break-words text-sm font-semibold text-slate-700">{qaytarish.reasonComment}</p>
                      </section>
                    )}

                    {qaytarish.note && (
                      <section className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm">
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{t("view.note")}</p>
                        <p className="mt-1 whitespace-pre-line break-words text-sm font-semibold text-slate-700">{qaytarish.note}</p>
                      </section>
                    )}
                  </div>

                  <aside className="min-w-0 space-y-6">
                    {/* Hujjat ma'lumotlari */}
                    <section className="rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6" aria-label={t("detail.infoTitle")}>
                      <h3 className="text-base font-black text-slate-900">{t("detail.infoTitle")}</h3>
                      <dl className="mt-4 space-y-4">
                        <BilimQatori ikonka={User} nom={t("view.customer")} qiymat={qaytarishMijozi(qaytarish, sotuvlar) ?? t("view.customerUnknown")} />
                        <BilimQatori
                          ikonka={Receipt}
                          nom={t("view.sale")}
                          qiymat={qaytarish.sale ? sotuvRaqami(qaytarish.sale) : sotuvRaqami({ id: qaytarish.saleId })}
                        />
                        <BilimQatori
                          ikonka={Warehouse}
                          nom={t("view.warehouse")}
                          qiymat={qaytarish.warehouse?.name ?? omborlar.find((item) => item.id === qaytarish.warehouseId)?.name ?? qaytarish.warehouseId}
                        />
                        <BilimQatori
                          ikonka={UserCheck}
                          nom={t("view.responsible")}
                          qiymat={
                            qaytarish.responsible?.fullName ??
                            xodimlar.find((item) => item.id === qaytarish.responsibleId)?.fullName ??
                            t("view.responsibleUnassigned")
                          }
                        />
                        <BilimQatori ikonka={ListChecks} nom={t("view.reason")} qiymat={t(sababniOzbekcha(qaytarish.reason))} />
                        <BilimQatori ikonka={Banknote} nom={t("view.refundMethod")} qiymat={t(refundMethodniOzbekcha(qaytarish.refundMethod))} />
                        <BilimQatori ikonka={CalendarClock} nom={t("view.createdAt")} qiymat={sananiFormatlash(qaytarish.createdAt)} />
                        {qaytarish.confirmedAt && (
                          <BilimQatori ikonka={CheckCircle2} nom={t("detail.confirmedAt")} qiymat={sananiFormatlash(qaytarish.confirmedAt)} />
                        )}
                      </dl>
                    </section>

                    <QaytarishVaqtChizigi qaytarishId={qaytarish.id} yangilash={vaqtChizigiTokeni} />
                  </aside>
                </div>

                <div className="mt-7 flex flex-wrap items-center justify-end gap-3">
                  <HujjatOchirish
                    korinish="tugma"
                    guruh="savdo"
                    status={qaytarish.status}
                    nom={qaytarishRaqami(qaytarish)}
                    onTasdiq={() => qaytarishniOchirish(qaytarish.id)}
                    onTiklash={() => qaytarishniTiklash(qaytarish.id)}
                    onOchirildi={onYopish}
                    onTiklandi={() => void holatniQaytaYuklash(qaytarish.id)}
                  />
                  {qoralama && (
                    <button
                      type="button"
                      onClick={() => setHolatAmali("tasdiqlash")}
                      disabled={amalBajarilmoqda}
                      className="inline-flex h-11 items-center gap-2 rounded-2xl bg-emerald-500 px-5 font-black text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-600 disabled:opacity-60"
                    >
                      <CheckCircle2 size={17} />
                      {t("view.confirmButton")}
                    </button>
                  )}
                  {tasdiqlangan && bekorQilishRuxsati && (
                    <button
                      type="button"
                      onClick={() => setHolatAmali("bekorQilish")}
                      disabled={amalBajarilmoqda}
                      className="inline-flex h-11 items-center gap-2 rounded-2xl bg-amber-50 px-5 font-black text-amber-700 ring-1 ring-amber-200 transition hover:bg-amber-500 hover:text-white disabled:opacity-60"
                    >
                      <Ban size={17} />
                      {t("view.cancelButton")}
                    </button>
                  )}
                  {qoralama ? (
                    <button
                      onClick={() => void tahrirlashniBoshlash()}
                      className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-5 font-black text-white"
                    >
                      <Edit3 size={17} />
                      {t("view.editButton")}
                    </button>
                  ) : (
                    <p className="flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-xs font-bold text-slate-500">
                      <Info size={14} className="shrink-0" aria-hidden /> {t("view.onlyDraftEditable")}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-bold">
                    {t("form.saleLabel")}
                    <SavdoSelect
                      value={saleId}
                      onChange={(value) => void sotuvniTanlash(value)}
                      placeholder={t("form.salePlaceholder")}
                      className="mt-2"
                      buttonClassName="h-12"
                      options={[
                        ...tasdiqlanganSotuvlar.map((sotuv) => ({
                          value: sotuv.id,
                          label: `${sotuvRaqami(sotuv)} — ${mijozNomi(sotuv)}`,
                        })),
                        ...(!tasdiqlanganSotuvlar.some((sotuv) => sotuv.id === qaytarish.saleId)
                          ? [
                              {
                                value: qaytarish.saleId,
                                label: qaytarish.sale ? sotuvRaqami(qaytarish.sale) : sotuvRaqami({ id: qaytarish.saleId }),
                              },
                            ]
                          : []),
                      ]}
                    />
                  </label>
                  <label className="text-sm font-bold">
                    {t("form.warehouseLabel")}
                    <SavdoSelect
                      value={warehouseId}
                      onChange={setWarehouseId}
                      placeholder={t("form.warehousePlaceholder")}
                      className="mt-2"
                      buttonClassName="h-12"
                      options={omborlar.map((item) => ({
                        value: item.id,
                        label: item.name ?? item.id,
                      }))}
                    />
                  </label>
                  <label className="text-sm font-bold">
                    {t("form.reasonLabel")}
                    <SavdoSelect
                      value={reason}
                      onChange={(value) => setReason(value as QaytarishSababi)}
                      className="mt-2"
                      buttonClassName="h-12"
                      options={Object.entries(sababMatni).map(([value, key]) => ({
                        value,
                        label: t(key),
                      }))}
                    />
                  </label>
                  <label className="text-sm font-bold">
                    {t("form.responsibleLabel")}
                    <SavdoSelect
                      value={responsibleId}
                      onChange={setResponsibleId}
                      placeholder={t("form.responsiblePlaceholder")}
                      className="mt-2"
                      buttonClassName="h-12"
                      options={xodimlar.map((item) => ({
                        value: item.id,
                        label: item.fullName ?? item.name ?? item.id,
                      }))}
                    />
                  </label>
                </div>

                <div className="mt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-black">{t("form.itemsTitle")}</h3>
                      <p className="text-xs text-gray-400">
                        {t("form.itemsHint")}
                      </p>
                    </div>
                    {sotuvYuklanmoqda && (
                      <LoaderCircle
                        size={19}
                        className="animate-spin text-orange-500"
                      />
                    )}
                  </div>
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div
                        key={item.saleItemId}
                        className="grid items-center gap-3 rounded-2xl bg-gray-50 p-4 md:grid-cols-[1fr_130px_140px_44px]"
                      >
                        <div>
                          <p className="font-bold">{item.nom}</p>
                          <p className="mt-1 text-xs text-gray-400">
                            {t("form.soldQuantity", { count: item.maxQuantity })}
                          </p>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max={item.maxQuantity}
                          step="0.001"
                          value={item.quantity}
                          onChange={(event) =>
                            setItems((oldingi) =>
                              oldingi.map((qator, qatorIndex) =>
                                qatorIndex === index
                                  ? {
                                      ...qator,
                                      quantity: Number(event.target.value),
                                    }
                                  : qator
                              )
                            )
                          }
                          className={`h-11 rounded-xl border bg-white px-3 ${
                            item.quantity > item.maxQuantity
                              ? "border-red-300"
                              : ""
                          }`}
                        />
                        <div className="rounded-xl bg-white px-3 py-3 text-sm font-bold">
                          {pulniFormatlash(item.quantity * item.price)}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setItems((oldingi) =>
                              oldingi.map((qator, qatorIndex) =>
                                qatorIndex === index
                                  ? { ...qator, quantity: 0 }
                                  : qator
                              )
                            )
                          }
                          className="flex h-11 items-center justify-center rounded-xl bg-red-50 text-red-500"
                          aria-label={t("form.removeItemAria")}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {!sotuvYuklanmoqda && items.length === 0 && (
                      <div className="rounded-2xl border border-dashed p-10 text-center text-gray-400">
                        {t("form.itemsEmpty")}
                      </div>
                    )}
                  </div>
                </div>

                <textarea
                  value={reasonComment}
                  onChange={(event) => setReasonComment(event.target.value)}
                  className="mt-5 min-h-20 w-full rounded-2xl border p-4 outline-none focus:border-orange-300"
                  placeholder={t("form.reasonCommentPlaceholder")}
                  aria-label={t("form.reasonCommentPlaceholder")}
                />

                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="mt-5 min-h-24 w-full rounded-2xl border p-4 outline-none focus:border-orange-300"
                  placeholder={t("form.notePlaceholder")}
                />

                <div className="mt-4 flex justify-end rounded-2xl bg-orange-50 p-4">
                  <span className="font-black text-orange-700">
                    {t("form.totalAmount", { amount: pulniFormatlash(jami) })}
                  </span>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setTahrir(false)}
                    className="h-11 rounded-2xl bg-gray-100 px-5 font-bold text-gray-600"
                  >
                    {t("form.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void saqlash()}
                    disabled={
                      amalBajarilmoqda ||
                      sotuvYuklanmoqda ||
                      !saleId ||
                      !warehouseId ||
                      tanlanganQatorlar.length === 0
                    }
                    className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-6 font-black text-white disabled:opacity-50"
                  >
                    {amalBajarilmoqda ? (
                      <LoaderCircle size={17} className="animate-spin" />
                    ) : (
                      <Save size={17} />
                    )}
                    {t("form.save")}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
      {holatAmali && qaytarish && (
        <TasdiqlashOynasi
          ikonka={holatAmali === "bekorQilish" ? <Ban size={24} /> : <CheckCircle2 size={24} />}
          ohang={holatAmali === "bekorQilish" ? "sariq" : "yashil"}
          sarlavha={t(`dialogs.${holatAmali}.title`)}
          nom={`${qaytarishRaqami(qaytarish)} · ${pulniFormatlash(qaytarishSummasi(qaytarish))}`}
          tavsif={t(`dialogs.${holatAmali}.description`)}
          ortgaMatni={t("dialogs.no")}
          tasdiqMatni={t(`dialogs.${holatAmali}.yes`)}
          jarayonMatni={t("dialogs.working")}
          onTasdiq={() => holatAmaliniBajarish(qaytarish.id)}
          onYopish={() => setHolatAmali(null)}
        />
      )}
    </AppModal>
  );
}

// Hujjat holati belgisi (tasdiqlangan / qoralama / bekor qilingan).
function HolatBelgisi({ holat, matn }: { holat: string; matn: string }) {
  const uslub =
    holat === "CONFIRMED"
      ? { belgi: "bg-emerald-50 text-emerald-700 ring-emerald-100", nuqta: "bg-emerald-500" }
      : holat === "CANCELLED" || holat === "CANCELED"
        ? { belgi: "bg-red-50 text-red-600 ring-red-100", nuqta: "bg-red-500" }
        : { belgi: "bg-amber-50 text-amber-700 ring-amber-100", nuqta: "bg-amber-500" };
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-black ring-1 ${uslub.belgi}`}>
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${uslub.nuqta}`} />
      {matn}
    </span>
  );
}

// "Hujjat ma'lumotlari" kartasidagi bitta qator: ikonka, sarlavha va qiymat.
function BilimQatori({ ikonka: Ikona, nom, qiymat }: { ikonka: LucideIcon; nom: string; qiymat: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
        <Ikona size={16} />
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] font-black uppercase tracking-wide text-slate-400">{nom}</dt>
        <dd className="mt-0.5 break-words text-sm font-extrabold text-slate-900">{qiymat}</dd>
      </div>
    </div>
  );
}

function holatMatni(holat: string) {
  if (holat === "CONFIRMED") return "status.confirmed";
  if (holat === "CANCELLED" || holat === "CANCELED")
    return "status.cancelled";
  return "status.draft";
}
