import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import axios from "axios";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Ban,
  BadgeCheck,
  Banknote,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  FileText,
  LoaderCircle,
  HandCoins,
  Info,
  Minus,
  Package,
  PackageCheck,
  PackageX,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldQuestion,
  ShoppingBag,
  Tag,
  Undo2,
  Undo,
  MessageSquareText,
  UserRound,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { qaytariladiganQatorlarniOlish, qaytarishniOldindanKorish, qoldiqNomlariniBoyitish } from "@/api/savdoApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type {
  Qaytarish,
  QaytarishOldindanSorovi,
  QaytarishToloviniQaytarishUsuli as RefundMethod,
  QaytarishYaratishMalumoti,
  QaytariladiganQator,
  Sotuv,
  SotuvMahsuloti,
} from "@/types/savdo";
import {
  mijozNomi,
  pulniFormatlash,
  sananiFormatlash,
  sotuvMahsulotiId,
  sotuvMahsulotiModifikatsiyaId,
  sotuvMahsulotiNarxi,
  sotuvQarzdorlikSummasi,
  sotuvRaqami,
  sotuvSummasi,
  sotuvTolanganSummasi,
} from "../savdoYordamchilari";
import QaytarishStepper from "./QaytarishStepper";
import QaytarishOldindanHisobi from "./QaytarishOldindanHisobi";
import { hisobMuvofiqmi, hujjatHisobKitobi, oldindanHisobKitob, type HisobKitob } from "./hisobKitob";
import {
  SABAB_VARIANTLARI,
  UI_SABABLAR,
  miqdorgaAylantirish,
  qaytarishMumkinmi,
  qaytarishRaqami,
  raqamga,
  sotuvSanasi,
  sotuvdaTasdiqlanganQaytarishBormi,
  type UiSabab,
} from "./qaytarishYordamchilari";

type Props = {
  sotuvlar: Sotuv[];
  qaytarishlar: Qaytarish[];
  // Sotuvlar ro'yxati hali yuklanayotgan / yuklanmagan bo'lsa 1-bosqichda tushunarli holat ko'rsatiladi.
  sotuvlarYuklanmoqda?: boolean;
  sotuvlarXatosi?: string | null;
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

// Sabab kartalari: har bir sabab o'z ikonkasi va rangiga ega (tanlanganda karta, belgi va tezkor izoh paneli shu rangda).
const SABAB_USLUBLARI: Record<
  UiSabab,
  { ikonka: LucideIcon; ikonka_: string; ikonkaFaol: string; karta: string; nuqta: string; panel: string; chipFaol: string }
> = {
  DEFECT: {
    ikonka: PackageX,
    ikonka_: "bg-rose-50 text-rose-500",
    ikonkaFaol: "bg-linear-to-br from-rose-400 to-rose-600 text-white shadow-lg shadow-rose-200",
    karta: "border-rose-300 bg-linear-to-br from-rose-50 via-white to-white shadow-[0_14px_30px_-20px_rgba(225,29,72,.55)] ring-2 ring-rose-100",
    nuqta: "border-rose-500 bg-rose-500",
    panel: "border-rose-100 bg-rose-50/40",
    chipFaol: "border-rose-300 bg-rose-100 text-rose-700",
  },
  CUSTOMER_CHANGED_MIND: {
    ikonka: Undo,
    ikonka_: "bg-sky-50 text-sky-500",
    ikonkaFaol: "bg-linear-to-br from-sky-400 to-sky-600 text-white shadow-lg shadow-sky-200",
    karta: "border-sky-300 bg-linear-to-br from-sky-50 via-white to-white shadow-[0_14px_30px_-20px_rgba(2,132,199,.55)] ring-2 ring-sky-100",
    nuqta: "border-sky-500 bg-sky-500",
    panel: "border-sky-100 bg-sky-50/40",
    chipFaol: "border-sky-300 bg-sky-100 text-sky-700",
  },
  WRONG: {
    ikonka: ArrowLeftRight,
    ikonka_: "bg-amber-50 text-amber-500",
    ikonkaFaol: "bg-linear-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-200",
    karta: "border-amber-300 bg-linear-to-br from-amber-50 via-white to-white shadow-[0_14px_30px_-20px_rgba(217,119,6,.55)] ring-2 ring-amber-100",
    nuqta: "border-amber-500 bg-amber-500",
    panel: "border-amber-100 bg-amber-50/40",
    chipFaol: "border-amber-300 bg-amber-100 text-amber-800",
  },
  NOT_SUITABLE: {
    ikonka: ShieldQuestion,
    ikonka_: "bg-violet-50 text-violet-500",
    ikonkaFaol: "bg-linear-to-br from-violet-400 to-violet-600 text-white shadow-lg shadow-violet-200",
    karta: "border-violet-300 bg-linear-to-br from-violet-50 via-white to-white shadow-[0_14px_30px_-20px_rgba(124,58,237,.55)] ring-2 ring-violet-100",
    nuqta: "border-violet-500 bg-violet-500",
    panel: "border-violet-100 bg-violet-50/40",
    chipFaol: "border-violet-300 bg-violet-100 text-violet-700",
  },
  OTHER: {
    ikonka: MessageSquareText,
    ikonka_: "bg-slate-100 text-slate-500",
    ikonkaFaol: "bg-linear-to-br from-slate-500 to-slate-700 text-white shadow-lg shadow-slate-300",
    karta: "border-slate-400 bg-linear-to-br from-slate-100 via-white to-white shadow-[0_14px_30px_-20px_rgba(51,65,85,.5)] ring-2 ring-slate-200",
    nuqta: "border-slate-600 bg-slate-600",
    panel: "border-slate-200 bg-slate-50/70",
    chipFaol: "border-slate-400 bg-slate-200 text-slate-800",
  },
};

const USULLAR: RefundMethod[] = ["CASH", "CARD", "BALANCE", "NONE"];
const USUL_IKONKALARI: Record<RefundMethod, LucideIcon> = { CASH: Banknote, CARD: CreditCard, BALANCE: Wallet, NONE: Ban };
// Sotuv kartalari shu miqdorda ko'rsatiladi, "Yana ko'rsatish" bilan kengaytiriladi.
const SOTUV_SAHIFASI = 24;

type QatorXatosi = "" | "invalid" | "negative" | "exceeds" | "data";

// 2-bosqich qatori: miqdorlar va narx backenddan (GET /sales/{id}/returnable-items), nomlar sotuv qatoridan.
type Qator = {
  id: string; // saleItemId
  modificationId: string;
  nom: string;
  // Nom hali katalogdan olinmoqda (sotuv qatorida mahsulot nomi kelmagan bo'lsa).
  nomYuklanmoqda: boolean;
  variant: string;
  sotilgan: number | null;
  oldin: number | null;
  qolgan: number | null;
  narx: number | null;
  // Qaytarishda bir dona uchun backend hisoblaydigan qiymat (unitValue); kelmasa narx.
  birlikQiymati: number | null;
  matn: string;
  son: number;
  xato: QatorXatosi;
};

type QatorlarHolati =
  | { turi: "bosh" }
  | { turi: "yuklanmoqda" }
  | { turi: "xato"; xabar: string }
  | { turi: "tayyor"; qatorlar: QaytariladiganQator[] };

type OldindanHolati =
  | { turi: "bosh" }
  | { turi: "yuklanmoqda"; kalit: string }
  | { turi: "xato"; kalit: string; xabar: string }
  | { turi: "tayyor"; kalit: string; hisob: HisobKitob; dona: number | null };

type Natija = {
  raqam: string;
  qaytarishId: string;
  holat: string | null;
  // Hujjat tafsilotini olib bo'lmasa null: summalar o'ylab topilmaydi.
  hisob: HisobKitob | null;
  dona: number;
  mijoz: string;
  sotuv: string;
};

function songa(matn: string | undefined) {
  const tozalangan = (matn ?? "").trim().replace(",", ".");
  return tozalangan === "" ? 0 : Number(tozalangan);
}

// Ro'yxatdagi sotuv qatori mijoz/kompaniya nomlari bilan boyitilgan; tafsilot javobida ular bo'lmasa saqlab qolinadi.
function sotuvniBirlashtirish(royxatdagi: Sotuv | null, tafsilot: Sotuv): Sotuv {
  if (!royxatdagi) return tafsilot;
  const royxatQatorlari = new Map((royxatdagi.items ?? []).map((item) => [sotuvMahsulotiId(item), item]));
  return {
    ...royxatdagi,
    ...tafsilot,
    customer: tafsilot.customer ?? royxatdagi.customer,
    clientCompany: tafsilot.clientCompany ?? royxatdagi.clientCompany,
    // Tafsilotda mahsulot nomi kelmasa, ro'yxatdagi (nomlari to'ldirilgan) qatordan olinadi.
    items: tafsilot.items?.map((item) => {
      if (item.modification?.product?.name || item.modification?.name) return item;
      const royxatdagi = royxatQatorlari.get(sotuvMahsulotiId(item));
      return royxatdagi?.modification ? { ...item, modification: royxatdagi.modification } : item;
    }),
  };
}

export default function QaytarishWizard({
  sotuvlar,
  qaytarishlar,
  sotuvlarYuklanmoqda = false,
  sotuvlarXatosi = null,
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
  const [sotuvXatosi, setSotuvXatosi] = useState("");
  const [qatorlarHolati, setQatorlarHolati] = useState<QatorlarHolati>({ turi: "bosh" });
  const [qidiruv, setQidiruv] = useState("");
  const [korinadiganSon, setKorinadiganSon] = useState(SOTUV_SAHIFASI);
  // Katalogdan olingan mahsulot nomlari (modificationId bo'yicha); bo'sh obyekt — nom topilmadi.
  const [qatorNomlari, setQatorNomlari] = useState<Record<string, { mahsulot?: string; variant?: string }>>({});
  const nomSorovlari = useRef(new Set<string>());
  const [miqdorlar, setMiqdorlar] = useState<Record<string, string>>({});
  const [sabab, setSabab] = useState<UiSabab | "">("");
  const [izoh, setIzoh] = useState("");
  // Tanlangan "tezkor izoh" variantlari (kalitlar); izoh matniga qo'shilib backendga reasonComment sifatida ketadi.
  const [tezkorIzohlar, setTezkorIzohlar] = useState<string[]>([]);
  const [usul, setUsul] = useState<RefundMethod>("CASH");
  const [oldindan, setOldindan] = useState<OldindanHolati>({ turi: "bosh" });
  const [oldindanUrinish, setOldindanUrinish] = useState(0);
  // Backend jami summasi (goodsValue) qator qiymatlari (miqdor × unitValue) bilan mos kelishi: true — mos, false — mos emas,
  // null — hali tekshirilmagan. Faqat mos kelganda qator bo'yicha summa ko'rsatiladi.
  const [birlikModeli, setBirlikModeli] = useState<boolean | null>(null);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);
  const [xatolik, setXatolik] = useState("");
  const [yaratilganId, setYaratilganId] = useState<string | null>(null);
  const [natija, setNatija] = useState<Natija | null>(null);
  const yuqoriRef = useRef<HTMLDivElement | null>(null);
  const boshlandi = useRef(false);
  // Tez-tez bosishda takroriy so'rov ketmasligi uchun (state asinxron yangilanadi).
  const yuborishQulfi = useRef(false);
  const tanlovTokeni = useRef(0);
  const oldindanKaliti = useRef("");
  const oldindanBoshqaruvi = useRef<AbortController | null>(null);

  const qadamlar = useMemo(
    () => (["sale", "items", "reason", "calc", "confirm", "done"] as const).map((kalit) => t(`wizard.steps.${kalit}`)),
    [t]
  );

  // ── 1-bosqich: sotuvlar ro'yxati (real backend ro'yxati) ──────────────────────────────────
  const sotuvKartalari = useMemo(() => {
    const soz = qidiruv.trim().toLowerCase();
    const vaqt = (item: Sotuv) => {
      const son = new Date(sotuvSanasi(item) ?? "").getTime();
      return Number.isFinite(son) ? son : 0;
    };
    return sotuvlar
      .filter(qaytarishMumkinmi)
      .filter((item) => !soz || `${sotuvRaqami(item)} ${mijozNomi(item)} ${item.customer?.phone ?? ""} ${item.walkInCustomerPhone ?? ""}`.toLowerCase().includes(soz))
      // Yangi sotuvlar birinchi.
      .sort((birinchi, ikkinchi) => vaqt(ikkinchi) - vaqt(birinchi))
      .map((item) => ({ sotuv: item, oldinQaytarilgan: sotuvdaTasdiqlanganQaytarishBormi(item.id, qaytarishlar) }));
  }, [qaytarishlar, qidiruv, sotuvlar]);

  // Sotuv tafsiloti va qaytarilishi mumkin bo'lgan qatorlar backenddan olinadi. Xato bo'lsa keyingi bosqichga o'tilmaydi.
  async function sotuvniTanlash(id: string) {
    const token = ++tanlovTokeni.current;
    setTanlanganId(id);
    setXatolik("");
    setSotuvXatosi("");
    setSotuv(null);
    setMiqdorlar({});
    setQatorlarHolati({ turi: "yuklanmoqda" });
    setSotuvYuklanmoqda(true);
    oldindanKaliti.current = "";
    setOldindan({ turi: "bosh" });
    setBirlikModeli(null);
    const royxatdagi = sotuvlar.find((item) => item.id === id) ?? null;
    try {
      const [tafsilot, qatorlar] = await Promise.all([onSotuvTafsilotiniOlish(id), qaytariladiganQatorlarniOlish(id)]);
      if (token !== tanlovTokeni.current) return false;
      if (!tafsilot) {
        setSotuvXatosi(t("wizard.errors.saleLoadFailed"));
        setQatorlarHolati({ turi: "bosh" });
        return false;
      }
      const birlashgan = sotuvniBirlashtirish(royxatdagi, tafsilot);
      setSotuv(birlashgan);
      setQatorlarHolati({ turi: "tayyor", qatorlar });
      // Standart: qolgan barcha miqdor qaytariladi (foydalanuvchi o'zgartirishi mumkin).
      setMiqdorlar(
        Object.fromEntries(
          qatorlar.map((qator) => {
            const qolgan = miqdorgaAylantirish(qator.remainingQuantity);
            return [qator.saleItemId, qolgan !== null && qolgan > 0 ? String(qolgan) : "0"];
          })
        )
      );
      return true;
    } catch (error) {
      if (token !== tanlovTokeni.current) return false;
      const xabar = getApiErrorMessage(error);
      setSotuvXatosi(xabar);
      setQatorlarHolati({ turi: "xato", xabar });
      return false;
    } finally {
      if (token === tanlovTokeni.current) setSotuvYuklanmoqda(false);
    }
  }

  // Sotuvlar jadvalidan kelganda (boshlangichSotuvId) tanlov bosqichi o'tkazib yuboriladi.
  useEffect(() => {
    if (!boshlangichSotuvId || boshlandi.current) return;
    if (!sotuvlar.some((item) => item.id === boshlangichSotuvId)) return;
    boshlandi.current = true;
    void sotuvniTanlash(boshlangichSotuvId).then((muvaffaqiyatli) => {
      if (muvaffaqiyatli) setQadam(QADAM_MAHSULOT);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boshlangichSotuvId, sotuvlar]);

  useEffect(() => {
    yuqoriRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [qadam]);

  // ── 2-bosqich: mahsulot qatorlari ───────────────────────────────────────────────────────
  const qatorlar = useMemo<Qator[]>(() => {
    if (!sotuv || qatorlarHolati.turi !== "tayyor") return [];
    const sotuvQatorlari = new Map<string, SotuvMahsuloti>();
    for (const item of sotuv.items ?? []) sotuvQatorlari.set(sotuvMahsulotiId(item), item);

    return qatorlarHolati.qatorlar.map((javob) => {
      const item = sotuvQatorlari.get(javob.saleItemId);
      const modifikatsiya = item?.modification ?? javob.modification;
      const modificationId = javob.modificationId || (item ? sotuvMahsulotiModifikatsiyaId(item) : "");
      const katalogdan = qatorNomlari[modificationId];
      const mahsulot = modifikatsiya?.product?.name || katalogdan?.mahsulot;
      const variantNomi = modifikatsiya?.name || katalogdan?.variant;
      // Nom hali topilmagan va katalogdan so'rov kutilmoqda; topilmasa ID emas, o'qiladigan matn ko'rsatiladi.
      const nomYuklanmoqda = !mahsulot && !variantNomi && Boolean(modificationId) && katalogdan === undefined;
      const nom = mahsulot || variantNomi || `${t("wizard.items.fallback")}${modificationId ? ` #${modificationId.slice(-6)}` : ""}`;
      const variant = mahsulot && variantNomi && mahsulot !== variantNomi ? variantNomi : "";
      const sotilgan = miqdorgaAylantirish(javob.soldQuantity);
      const oldin = miqdorgaAylantirish(javob.returnedQuantity);
      const qolgan = miqdorgaAylantirish(javob.remainingQuantity);
      // Narx: backend javobidagi narx; u kelmasa shu sotuv qatorining haqiqiy narxi.
      const narx = miqdorgaAylantirish(javob.price) ?? (item ? miqdorgaAylantirish(sotuvMahsulotiNarxi(item)) : null);
      const birlikQiymati = miqdorgaAylantirish(javob.unitValue) ?? narx;
      const matn = miqdorlar[javob.saleItemId] ?? "0";
      const son = songa(matn);
      // Backend ma'lumoti to'liq bo'lmagan qator tanlab bo'lmaydi (noto'g'ri qiymat 0 ga aylantirilmaydi).
      const malumotNoTogri = qolgan === null || narx === null || !modificationId;
      const xato: QatorXatosi = malumotNoTogri
        ? "data"
        : !Number.isFinite(son)
          ? "invalid"
          : son < 0
            ? "negative"
            : son > (qolgan ?? 0) + 1e-9
              ? "exceeds"
              : "";
      return { id: javob.saleItemId, modificationId, nom, nomYuklanmoqda, variant, sotilgan, oldin, qolgan, narx, birlikQiymati, matn, son: xato ? 0 : son, xato };
    });
  }, [miqdorlar, qatorNomlari, qatorlarHolati, sotuv, t]);

  // Sotuv qatorida mahsulot nomi bo'lmasa, real katalogdan (modifikatsiya → mahsulot) olinadi; natija keshlanadi.
  useEffect(() => {
    if (!sotuv || qatorlarHolati.turi !== "tayyor") return;
    const kerak = new Set<string>();
    for (const javob of qatorlarHolati.qatorlar) {
      const item = (sotuv.items ?? []).find((qator) => sotuvMahsulotiId(qator) === javob.saleItemId);
      const modifikatsiya = item?.modification ?? javob.modification;
      const id = javob.modificationId || (item ? sotuvMahsulotiModifikatsiyaId(item) : "");
      if (id && !modifikatsiya?.product?.name && !modifikatsiya?.name && !nomSorovlari.current.has(id)) kerak.add(id);
    }
    if (kerak.size === 0) return;
    kerak.forEach((id) => nomSorovlari.current.add(id));
    void qoldiqNomlariniBoyitish([...kerak].map((modificationId) => ({ modificationId }))).then((natija) => {
      setQatorNomlari((joriy) => {
        const yangi = { ...joriy };
        for (const id of kerak) {
          const topilgan = natija.find((qoldiq) => qoldiq.modificationId === id)?.modification;
          yangi[id] = { mahsulot: topilgan?.product?.name, variant: topilgan?.name };
        }
        return yangi;
      });
    });
  }, [qatorlarHolati, sotuv]);

  const tanlanganQatorlar = useMemo(() => qatorlar.filter((qator) => qator.son > 0), [qatorlar]);
  const dona = tanlanganQatorlar.reduce((jami, qator) => jami + qator.son, 0);
  // "data" xatosi alohida: bunday qator o'chirilgan ko'rsatiladi va boshqa qatorlarni to'smaydi.
  const xatoliQatorBor = qatorlar.some((qator) => qator.xato && qator.xato !== "data");
  const qaytariladiganQatorBor = qatorlar.some((qator) => (qator.qolgan ?? 0) > 0 && qator.xato !== "data");

  function miqdorniOzgartirish(id: string, qiymat: string) {
    setMiqdorlar((joriy) => ({ ...joriy, [id]: qiymat }));
  }

  function miqdorniSurish(id: string, qolgan: number, delta: number) {
    const yangi = Math.min(Math.max(songa(miqdorlar[id]) + delta, 0), qolgan);
    miqdorniOzgartirish(id, String(Math.round(yangi * 1000) / 1000));
  }

  // ── 4-bosqich: backend hisob-kitobi (POST /returns/preview) ──────────────────────────────
  // Kalit: sotuv + pul qaytarish usuli + tanlangan qatorlar. U o'zgarsa, eski hisob-kitob yaroqsiz bo'ladi.
  const sorovKaliti = useMemo(() => {
    if (!sotuv || tanlanganQatorlar.length === 0) return "";
    const sorov: QaytarishOldindanSorovi = {
      saleId: sotuv.id,
      refundMethod: usul,
      items: tanlanganQatorlar.map((qator) => ({ saleItemId: qator.id, quantity: qator.son })),
    };
    return JSON.stringify(sorov);
  }, [sotuv, tanlanganQatorlar, usul]);

  useEffect(() => () => oldindanBoshqaruvi.current?.abort(), []);

  // Backend hisob-kitobi mahsulot tanlash bosqichida ham olinadi (jami summa tanlov bilan birga yangilanib turadi):
  // miqdor o'zgarganda 350 ms kutiladi, shunda har bosishda so'rov ketmaydi.
  useEffect(() => {
    if (qadam !== QADAM_MAHSULOT && qadam !== QADAM_HISOB && qadam !== QADAM_TASDIQ) return;
    if (!sorovKaliti) {
      oldindanKaliti.current = "";
      return;
    }
    if (oldindanKaliti.current === sorovKaliti) return;

    const taymer = window.setTimeout(
      () => {
        oldindanKaliti.current = sorovKaliti;
        oldindanBoshqaruvi.current?.abort();
        const boshqaruv = new AbortController();
        oldindanBoshqaruvi.current = boshqaruv;
        setOldindan({ turi: "yuklanmoqda", kalit: sorovKaliti });

        qaytarishniOldindanKorish(JSON.parse(sorovKaliti) as QaytarishOldindanSorovi, boshqaruv.signal)
          .then((javob) => {
            if (oldindanKaliti.current !== sorovKaliti) return;
            const hisob = oldindanHisobKitob(javob);
            if (!hisob) {
              setOldindan({ turi: "xato", kalit: sorovKaliti, xabar: t("wizard.errors.previewIncomplete") });
              return;
            }
            if (!hisobMuvofiqmi(hisob)) {
              setOldindan({ turi: "xato", kalit: sorovKaliti, xabar: t("wizard.errors.previewInconsistent") });
              return;
            }
            setOldindan({ turi: "tayyor", kalit: sorovKaliti, hisob, dona: miqdorgaAylantirish(javob.returnedQuantity) });
          })
          .catch((error: unknown) => {
            if (axios.isCancel(error) || oldindanKaliti.current !== sorovKaliti) return;
            setOldindan({ turi: "xato", kalit: sorovKaliti, xabar: getApiErrorMessage(error) });
          });
      },
      qadam === QADAM_MAHSULOT ? 350 : 0
    );
    return () => window.clearTimeout(taymer);
  }, [qadam, sorovKaliti, oldindanUrinish, t]);

  function oldindanQaytaUrinish() {
    oldindanKaliti.current = "";
    setOldindanUrinish((son) => son + 1);
  }

  // Hisob-kitob faqat joriy tanlovga (sotuv, usul, qatorlar) mos kelganda yaroqli.
  const oldindanTayyor = oldindan.turi === "tayyor" && oldindan.kalit === sorovKaliti;
  const oldindanHisob = oldindan.turi === "tayyor" ? oldindan.hisob : null;
  // Eskirgan (boshqa tanlovga tegishli) holat ko'rsatilmaydi: o'rniga yuklanmoqda holati chiqadi.
  const korinadiganOldindan: OldindanHolati = oldindan.turi !== "bosh" && oldindan.kalit !== sorovKaliti ? { turi: "yuklanmoqda", kalit: sorovKaliti } : oldindan;
  // 2-bosqichdagi "jami summa": faqat backend hisob-kitobi (goodsValue).
  const jamiSumma: number | "kutilmoqda" | "xato" | null = !sorovKaliti
    ? null
    : korinadiganOldindan.turi === "tayyor"
      ? korinadiganOldindan.hisob.tovarQiymati
      : korinadiganOldindan.turi === "xato"
        ? "xato"
        : "kutilmoqda";

  // Backend jami summasi miqdor × unitValue yig'indisiga mos kelsa, qator bo'yicha summa ham aniq ko'rsatiladi.
  useEffect(() => {
    if (oldindan.turi !== "tayyor" || oldindan.kalit !== sorovKaliti || oldindan.hisob.tovarQiymati === null) return;
    const yigindi = tanlanganQatorlar.reduce((jami, qator) => jami + qator.son * (qator.birlikQiymati ?? Number.NaN), 0);
    if (Number.isFinite(yigindi)) setBirlikModeli(Math.abs(yigindi - oldindan.hisob.tovarQiymati) < 1.5);
  }, [oldindan, sorovKaliti, tanlanganQatorlar]);

  function qatorSummasi(qator: Qator): number | "kutilmoqda" | null {
    if (qator.birlikQiymati === null || qator.xato === "data") return null;
    if (birlikModeli === true) return qator.son * qator.birlikQiymati;
    return birlikModeli === null && qator.son > 0 ? "kutilmoqda" : null;
  }

  // ── Navigatsiya ─────────────────────────────────────────────────────────────────────────
  // Sabab izohi (reasonComment): tanlangan tezkor variantlar va erkin matn birgalikda.
  const izohMatni = [tezkorIzohlar.map((variant) => t(`wizard.presets.${variant}`)).join(", "), izoh.trim()].filter(Boolean).join(". ");
  const izohKerak = sabab === "OTHER" && izohMatni.length < 3;
  const davomEtishMumkin =
    qadam === QADAM_SOTUV
      ? Boolean(sotuv) && !sotuvYuklanmoqda && qatorlarHolati.turi === "tayyor" && qaytariladiganQatorBor
      : qadam === QADAM_MAHSULOT
        ? tanlanganQatorlar.length > 0 && !xatoliQatorBor
        : qadam === QADAM_SABAB
          ? sabab !== "" && !izohKerak
          : qadam === QADAM_HISOB
            ? oldindanTayyor
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
    // Hisob-kitob bosqichiga har kirganda backenddan yangilanadi.
    if (qadam === QADAM_SABAB) oldindanKaliti.current = "";
    setQadam((joriy) => Math.min(joriy + 1, QADAM_TASDIQ));
  }

  function oldingisi() {
    setXatolik("");
    setQadam((joriy) => Math.max(joriy - 1, QADAM_SOTUV));
  }

  function yangiQaytarish() {
    tanlovTokeni.current += 1;
    oldindanKaliti.current = "";
    oldindanBoshqaruvi.current?.abort();
    setQadam(QADAM_SOTUV);
    setTanlanganId("");
    setSotuv(null);
    setSotuvXatosi("");
    setQatorlarHolati({ turi: "bosh" });
    setMiqdorlar({});
    setSabab("");
    setIzoh("");
    setTezkorIzohlar([]);
    setUsul("CASH");
    setOldindan({ turi: "bosh" });
    setBirlikModeli(null);
    setXatolik("");
    setYaratilganId(null);
    setNatija(null);
    setQidiruv("");
  }

  // ── Tasdiqlash: mavjud API oqimi (yaratish → tasdiqlash); barcha summalarni backend hisoblaydi ──────
  async function tasdiqlash() {
    if (yuborishQulfi.current) return;
    if (!sotuv || !sabab || !oldindanTayyor) return;
    setXatolik("");

    const warehouseId = sotuv.warehouseId ?? sotuv.warehouse?.id ?? "";
    if (!warehouseId) {
      setXatolik("wizard.errors.warehouseMissing");
      return;
    }

    yuborishQulfi.current = true;
    setYuborilmoqda(true);
    try {
      // Tasdiqlash xato bersa hujjat qoralama bo'lib qoladi: qayta urinish yangisini yaratmaydi, mavjudini tasdiqlaydi.
      let id = yaratilganId;
      if (!id) {
        const yaratilgan = await onYaratish({
          saleId: sotuv.id,
          warehouseId,
          responsibleId: sotuv.responsibleId,
          reason: sabab,
          // Sabab izohi backendda `note` dan alohida maydon (reasonComment).
          reasonComment: izohMatni || undefined,
          restock: true,
          refundMethod: usul,
          items: tanlanganQatorlar.map((qator) => ({
            saleItemId: qator.id,
            modificationId: qator.modificationId,
            quantity: qator.son,
            // Narx — backend (returnable-items) bergan bir dona qiymati (unitValue, kelmasa price); frontend o'zi hisoblamaydi.
            price: qator.birlikQiymati ?? 0,
          })),
        });
        if (!yaratilgan) {
          setXatolik("wizard.errors.createFailed");
          return;
        }
        id = yaratilgan.id;
        setYaratilganId(id);
      }

      const tasdiqlandi = await onTasdiqlash(id);
      if (!tasdiqlandi) {
        setXatolik("wizard.errors.confirmFailed");
        return;
      }

      // Yakuniy qiymatlar: tasdiqlangan hujjatdan (backend hisoblagan refundAmount/debtReduction va debtBefore/debtAfter).
      const hujjat = await onTafsilotiniOlish(id);
      const hisob = hujjat ? hujjatHisobKitobi(hujjat) : null;
      const hujjatDonasi = hujjat?.items?.length ? hujjat.items.reduce((jami, qator) => jami + (raqamga(qator.quantity) ?? 0), 0) : null;

      setNatija({
        raqam: hujjat ? qaytarishRaqami(hujjat) : id.slice(0, 8).toUpperCase(),
        qaytarishId: id,
        holat: hujjat ? String(hujjat.status ?? "").toUpperCase() || null : null,
        hisob,
        dona: raqamga(hujjat?.returnedQuantity) ?? hujjatDonasi ?? dona,
        mijoz: mijozNomi(sotuv),
        sotuv: sotuvRaqami(sotuv),
      });
      setQadam(QADAM_YAKUN);
      onMuvaffaqiyat?.();
    } finally {
      yuborishQulfi.current = false;
      setYuborilmoqda(false);
    }
  }

  const tanlanganSabab = sabab ? t(`wizard.reasons.${sabab}`) : "";

  // Stepper ostidagi qisqa xulosalar: foydalanuvchi tanlovi va backend hisob-kitobi (faqat bajarilgan/hozirgi bosqichda ko'rinadi).
  const qadamTafsilotlari: Array<string | null> = [
    sotuv ? `${sotuvRaqami(sotuv)} · ${mijozNomi(sotuv)}` : null,
    tanlanganQatorlar.length > 0 ? `${dona} ${t("wizard.unit")}` : null,
    tanlanganSabab || null,
    oldindanTayyor && oldindanHisob?.tovarQiymati != null ? pulniFormatlash(oldindanHisob.tovarQiymati) : null,
    qadam >= QADAM_TASDIQ ? t(`wizard.calc.methods.${usul}`) : null,
    natija?.raqam ?? null,
  ];
  const qulf = Boolean(yaratilganId) && qadam !== QADAM_YAKUN;

  return (
    <div ref={yuqoriRef} className="space-y-6">
      <div className="rounded-[26px] border border-slate-200/80 bg-white px-4 py-5 shadow-sm sm:px-8 sm:py-6">
        <QaytarishStepper
          qadamlar={qadamlar}
          joriy={qadam}
          tafsilotlar={qadamTafsilotlari}
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
                <div className="relative mt-5">
                  <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
                  <input
                    value={qidiruv}
                    onChange={(event) => {
                      setQidiruv(event.target.value);
                      setKorinadiganSon(SOTUV_SAHIFASI);
                    }}
                    placeholder={t("wizard.sale.search")}
                    aria-label={t("wizard.sale.search")}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-11 pr-12 text-sm sm:pr-36 font-semibold outline-none transition placeholder:font-medium focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-50"
                  />
                  <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
                    {qidiruv && (
                      <button
                        type="button"
                        onClick={() => {
                          setQidiruv("");
                          setKorinadiganSon(SOTUV_SAHIFASI);
                        }}
                        aria-label={t("wizard.sale.clear")}
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      >
                        <X size={15} />
                      </button>
                    )}
                    <span className="hidden rounded-lg bg-white px-2.5 py-1 text-xs font-black tabular-nums text-slate-500 ring-1 ring-slate-200 sm:inline">
                      {t("wizard.sale.count", { count: sotuvKartalari.length })}
                    </span>
                  </div>
                </div>

                {sotuvKartalari.length === 0 ? (
                  sotuvlarYuklanmoqda ? (
                    <p role="status" className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-sm font-semibold text-slate-400">
                      <LoaderCircle size={16} className="animate-spin text-orange-500" aria-hidden /> {t("wizard.sale.listLoading")}
                    </p>
                  ) : sotuvlarXatosi ? (
                    <p role="alert" className="mt-5 flex items-start gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600">
                      <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden /> {t("wizard.sale.listError")}: {sotuvlarXatosi}
                    </p>
                  ) : (
                    <div className="mt-5 rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-center">
                      <span aria-hidden className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <Receipt size={22} />
                      </span>
                      <p className="mt-3 text-sm font-semibold text-slate-400">{t("wizard.sale.empty")}</p>
                    </div>
                  )
                ) : (
                  <ul className="mt-5 grid gap-3 lg:grid-cols-2">
                    {sotuvKartalari.slice(0, korinadiganSon).map(({ sotuv: item, oldinQaytarilgan }) => (
                      <li key={item.id}>
                        <SotuvKartasi sotuv={item} tanlangan={tanlanganId === item.id} oldinQaytarilgan={oldinQaytarilgan} onTanlash={() => void sotuvniTanlash(item.id)} />
                      </li>
                    ))}
                  </ul>
                )}
                {sotuvKartalari.length > korinadiganSon && (
                  <div className="mt-4 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setKorinadiganSon((son) => son + SOTUV_SAHIFASI)}
                      className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-600 transition hover:border-orange-200 hover:text-orange-600"
                    >
                      {t("wizard.sale.showMore", { count: sotuvKartalari.length - korinadiganSon })}
                    </button>
                  </div>
                )}
                {sotuvYuklanmoqda && (
                  <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-500" role="status">
                    <LoaderCircle size={16} className="animate-spin text-orange-500" aria-hidden /> {t("wizard.sale.loading")}
                  </p>
                )}
                {sotuvXatosi && !sotuvYuklanmoqda && (
                  <div role="alert" className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">
                    <p className="flex items-start gap-2 text-sm font-bold text-rose-600">
                      <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden /> {t("wizard.errors.saleLoadFailed")}
                    </p>
                    <p className="mt-1 break-words text-xs font-medium text-rose-500">{sotuvXatosi}</p>
                    <button
                      type="button"
                      onClick={() => void sotuvniTanlash(tanlanganId)}
                      className="mt-3 inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl bg-white px-3 text-xs font-extrabold text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-100"
                    >
                      <RefreshCw size={13} aria-hidden /> {t("wizard.retry")}
                    </button>
                  </div>
                )}
                {sotuv && !sotuvYuklanmoqda && <SotuvXulosasi sotuv={sotuv} />}
                {sotuv && !sotuvYuklanmoqda && qatorlarHolati.turi === "tayyor" && !qaytariladiganQatorBor && (
                  <p role="status" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">{t("wizard.sale.nothingReturnable")}</p>
                )}
              </section>
            )}

            {qadam === QADAM_MAHSULOT && sotuv && (
              <section aria-labelledby="qadam-mahsulot">
                <Sarlavha id="qadam-mahsulot" nom={t("wizard.items.heading")} izoh={t("wizard.items.hint")} />
                {qatorlar.length === 0 ? (
                  <div className="mt-5 rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-center">
                    <span aria-hidden className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <Package size={22} />
                    </span>
                    <p className="mt-3 text-sm font-semibold text-slate-400">{t("wizard.items.empty")}</p>
                  </div>
                ) : (
                  <>
                    <div className="mt-5 hidden grid-cols-[minmax(0,1.5fr)_minmax(0,.75fr)_minmax(0,.85fr)_minmax(0,1.1fr)_minmax(250px,1.1fr)] gap-4 px-5 text-[11px] font-black uppercase tracking-wide text-slate-400 lg:grid">
                      <span>{t("wizard.items.product")}</span>
                      <span>{t("wizard.items.sold")}</span>
                      <span>{t("wizard.items.returned")}</span>
                      <span>{t("wizard.items.price")}</span>
                      <span>{t("wizard.items.returnQty")}</span>
                    </div>
                    <ul className="mt-3 space-y-3 lg:mt-2">
                      {qatorlar.map((qator) => (
                        <li key={qator.id}>
                          <MahsulotQatori qator={qator} summa={qatorSummasi(qator)} onOzgartirish={miqdorniOzgartirish} onSurish={miqdorniSurish} />
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <div className="mt-5 overflow-hidden rounded-2xl bg-linear-to-r from-orange-50 via-orange-50/50 to-white ring-1 ring-orange-100">
                  <div className="grid gap-px bg-orange-100/70 sm:grid-cols-2">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 bg-white/85 px-5 py-4">
                      <span className="flex flex-wrap items-center gap-2.5 text-sm font-bold text-slate-600">
                        <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white shadow-md shadow-orange-200">
                          <PackageCheck size={18} />
                        </span>
                        {t("wizard.items.selectedQuantity")}
                        <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-black text-orange-700 ring-1 ring-orange-100">
                          {t("wizard.items.productsCount", { count: tanlanganQatorlar.length })}
                        </span>
                      </span>
                      <span className="text-2xl font-extrabold tabular-nums text-slate-950">
                        {dona} {t("wizard.unit")}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 bg-white/85 px-5 py-4" aria-live="polite">
                      <span className="flex items-center gap-2.5 text-sm font-bold text-slate-600">
                        <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-200">
                          <Wallet size={18} />
                        </span>
                        {t("wizard.items.totalValue")}
                      </span>
                      {jamiSumma === null ? (
                        <span className="text-2xl font-extrabold tabular-nums text-slate-300">0 so'm</span>
                      ) : jamiSumma === "kutilmoqda" ? (
                        <span role="status" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400">
                          <LoaderCircle size={16} className="animate-spin text-emerald-500" aria-hidden /> {t("wizard.items.calculating")}
                        </span>
                      ) : jamiSumma === "xato" ? (
                        <span role="alert" className="inline-flex items-center gap-2 text-sm font-bold text-rose-600">
                          {t("wizard.items.totalFailed")}
                          <button
                            type="button"
                            onClick={oldindanQaytaUrinish}
                            aria-label={t("wizard.retry")}
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-rose-50 text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-100"
                          >
                            <RefreshCw size={14} />
                          </button>
                        </span>
                      ) : (
                        <span className="text-2xl font-extrabold tabular-nums text-emerald-700">{pulniFormatlash(jamiSumma)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {qadam === QADAM_SABAB && (
              <section aria-labelledby="qadam-sabab">
                <Sarlavha id="qadam-sabab" nom={t("wizard.reason.heading")} izoh={t("wizard.reason.hint")} />
                <div role="radiogroup" aria-label={t("wizard.reason.heading")} className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {UI_SABABLAR.map((kalit) => {
                    const uslub = SABAB_USLUBLARI[kalit];
                    const Ikona = uslub.ikonka;
                    const faol = sabab === kalit;
                    return (
                      <button
                        key={kalit}
                        type="button"
                        role="radio"
                        aria-checked={faol}
                        onClick={() => {
                          if (sabab !== kalit) setTezkorIzohlar([]);
                          setSabab(kalit);
                          setXatolik("");
                        }}
                        className={`group relative flex cursor-pointer items-start gap-3.5 overflow-hidden rounded-[22px] border p-4 text-left transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 motion-reduce:transition-none ${
                          faol ? uslub.karta : "border-slate-200 bg-white hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-20px_rgba(15,23,42,.4)]"
                        }`}
                      >
                        <span
                          aria-hidden
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition ${faol ? uslub.ikonkaFaol : uslub.ikonka_}`}
                        >
                          <Ikona size={22} />
                        </span>
                        <span className="min-w-0 flex-1 pr-6">
                          <span className="block text-[15px] font-black leading-snug text-slate-900">{t(`wizard.reasons.${kalit}`)}</span>
                          <span className="mt-1 block text-xs font-medium leading-snug text-slate-500">{t(`wizard.reasonHints.${kalit}`)}</span>
                        </span>
                        <span
                          aria-hidden
                          className={`absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full border-2 transition ${
                            faol ? `${uslub.nuqta} text-white` : "border-slate-300 text-transparent group-hover:border-slate-400"
                          }`}
                        >
                          <Check size={13} strokeWidth={3.5} />
                        </span>
                      </button>
                    );
                  })}
                </div>

                {sabab && (
                  <motion.div
                    key={sabab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className={`mt-5 rounded-[22px] border p-4 sm:p-5 ${SABAB_USLUBLARI[sabab].panel}`}
                  >
                    {SABAB_VARIANTLARI[sabab].length > 0 && (
                      <div>
                        <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-black text-slate-800">
                          {t("wizard.reason.quickTitle")}
                          <span className="text-xs font-semibold text-slate-400">{t("wizard.reason.quickHint")}</span>
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {SABAB_VARIANTLARI[sabab].map((variant) => {
                            const tanlangan = tezkorIzohlar.includes(variant);
                            return (
                              <button
                                key={variant}
                                type="button"
                                aria-pressed={tanlangan}
                                onClick={() => {
                                  setTezkorIzohlar((joriy) => (joriy.includes(variant) ? joriy.filter((qiymat) => qiymat !== variant) : [...joriy, variant]));
                                  setXatolik("");
                                }}
                                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 ${
                                  tanlangan ? SABAB_USLUBLARI[sabab].chipFaol : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                }`}
                              >
                                {tanlangan ? <Check size={13} strokeWidth={3} aria-hidden /> : <Plus size={13} aria-hidden />}
                                {t(`wizard.presets.${variant}`)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <label className={`block ${SABAB_VARIANTLARI[sabab].length > 0 ? "mt-5" : ""}`}>
                      <span className="mb-1.5 flex items-center gap-2 text-sm font-bold text-slate-700">
                        {t("wizard.reason.comment")}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${sabab === "OTHER" ? "bg-rose-50 text-rose-600" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}>
                          {sabab === "OTHER" ? t("wizard.reason.required") : t("wizard.reason.optional")}
                        </span>
                      </span>
                      <textarea
                        value={izoh}
                        onChange={(event) => setIzoh(event.target.value)}
                        rows={3}
                        placeholder={t("wizard.reason.placeholder")}
                        className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold outline-none transition placeholder:font-medium focus:border-orange-400 focus:ring-4 focus:ring-orange-50"
                      />
                    </label>

                    {izohMatni && (
                      <p className="mt-3 flex items-start gap-2 rounded-xl bg-white/80 px-3.5 py-2.5 text-xs font-semibold leading-5 text-slate-600 ring-1 ring-slate-200">
                        <MessageSquareText size={14} className="mt-0.5 shrink-0 text-slate-400" aria-hidden />
                        <span className="min-w-0 break-words">
                          <span className="font-black text-slate-500">{t("wizard.reason.willBeSaved")}: </span>
                          {izohMatni}
                        </span>
                      </p>
                    )}
                  </motion.div>
                )}
              </section>
            )}

            {qadam === QADAM_HISOB && sotuv && (
              <section aria-labelledby="qadam-hisob">
                <Sarlavha id="qadam-hisob" nom={t("wizard.calc.heading")} izoh={t("wizard.calc.hint")} />
                <div className="mt-5">
                  <p className="mb-2.5 text-sm font-black text-slate-800">{t("wizard.calc.method")}</p>
                  <div role="radiogroup" aria-label={t("wizard.calc.method")} className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                    {USULLAR.map((kalit) => {
                      const faol = usul === kalit;
                      const Ikona = USUL_IKONKALARI[kalit];
                      return (
                        <button
                          key={kalit}
                          type="button"
                          role="radio"
                          aria-checked={faol}
                          onClick={() => setUsul(kalit)}
                          className={`group relative flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5 text-left transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 motion-reduce:transition-none ${
                            faol
                              ? "border-orange-400 bg-linear-to-br from-orange-50 via-white to-white shadow-[0_12px_26px_-18px_rgba(234,88,12,.6)] ring-2 ring-orange-100"
                              : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-sm"
                          }`}
                        >
                          <span
                            aria-hidden
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                              faol ? "bg-linear-to-br from-orange-400 to-orange-600 text-white shadow-md shadow-orange-200" : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            <Ikona size={18} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-black text-slate-900">{t(`wizard.calc.methods.${kalit}`)}</span>
                            <span className="mt-0.5 block text-[11px] font-medium leading-snug text-slate-500">{t(`wizard.calc.methodHints.${kalit}`)}</span>
                          </span>
                          <span
                            aria-hidden
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                              faol ? "border-orange-500 bg-orange-500 text-white" : "border-slate-300 text-transparent group-hover:border-slate-400"
                            }`}
                          >
                            <Check size={11} strokeWidth={3.5} />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-5">
                  <QaytarishOldindanHisobi holat={korinadiganOldindan} usul={usul} onQaytaUrinish={oldindanQaytaUrinish} />
                </div>
                {oldindanTayyor && <p className="mt-3 text-xs font-medium text-slate-400">{t("wizard.calc.estimateNote")}</p>}
              </section>
            )}

            {qadam === QADAM_TASDIQ && sotuv && (
              <section aria-labelledby="qadam-tasdiq">
                <Sarlavha id="qadam-tasdiq" nom={t("wizard.confirm.heading")} izoh={t("wizard.confirm.hint")} />
                <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] xl:items-start">
                  {/* Chap: sotuv, sabab, mahsulotlar */}
                  <div className="min-w-0 space-y-4">
                    <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center gap-3.5 bg-linear-to-r from-slate-50 via-white to-white px-4 py-4">
                        <MijozAvatari nom={mijozNomi(sotuv)} />
                        <div className="min-w-0">
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{t("wizard.confirm.customer")}</p>
                          <p className="truncate text-base font-black text-slate-900">{mijozNomi(sotuv)}</p>
                        </div>
                        <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-black tabular-nums text-slate-700" title={t("wizard.confirm.sale")}>
                          <Receipt size={13} aria-hidden /> {sotuvRaqami(sotuv)}
                        </span>
                      </div>
                      <dl className="grid divide-y divide-slate-100 border-t border-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                        <div className="px-4 py-3.5">
                          <dt className="text-[11px] font-black uppercase tracking-wide text-slate-400">{t("wizard.confirm.reason")}</dt>
                          <dd className="mt-1.5">
                            {sabab ? (
                              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-extrabold ${SABAB_USLUBLARI[sabab].chipFaol}`}>
                                {(() => {
                                  const Ikona = SABAB_USLUBLARI[sabab].ikonka;
                                  return <Ikona size={14} aria-hidden />;
                                })()}
                                {tanlanganSabab}
                              </span>
                            ) : null}
                          </dd>
                        </div>
                        <div className="px-4 py-3.5">
                          <dt className="text-[11px] font-black uppercase tracking-wide text-slate-400">{t("wizard.confirm.method")}</dt>
                          <dd className="mt-1.5 inline-flex items-center gap-2 text-sm font-extrabold text-slate-800">
                            {(() => {
                              const Ikona = USUL_IKONKALARI[usul];
                              return (
                                <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                                  <Ikona size={15} />
                                </span>
                              );
                            })()}
                            {t(`wizard.calc.methods.${usul}`)}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5">
                        <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
                          <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white shadow-sm shadow-orange-200">
                            <Package size={16} />
                          </span>
                          {t("wizard.confirm.itemsTitle")}
                        </h3>
                        <span className="shrink-0 whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">{t("wizard.items.productsCount", { count: tanlanganQatorlar.length })}</span>
                      </div>
                      <ul className="divide-y divide-slate-100">
                        {tanlanganQatorlar.map((qator) => {
                          const summa = qatorSummasi(qator);
                          return (
                            <li key={qator.id} className="flex items-center gap-3 px-4 py-3.5">
                              <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 ring-1 ring-orange-100">
                                <Package size={18} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="break-words text-sm font-extrabold leading-snug text-slate-900">{qator.nom}</p>
                                {qator.variant && <p className="mt-0.5 text-xs font-semibold text-slate-400">{qator.variant}</p>}
                              </div>
                              <span className="shrink-0 rounded-full bg-sky-50 px-3 py-1 text-xs font-black tabular-nums text-sky-700 ring-1 ring-sky-100">
                                {qator.son} {t("wizard.unit")}
                              </span>
                              {typeof summa === "number" && <span className="hidden shrink-0 text-sm font-extrabold tabular-nums text-slate-800 sm:block">{pulniFormatlash(summa)}</span>}
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    {izohMatni && (
                      <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
                        <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-slate-400">
                          <MessageSquareText size={13} aria-hidden /> {t("wizard.reason.comment")}
                        </p>
                        <p className="mt-1 break-words text-sm font-semibold text-slate-700">{izohMatni}</p>
                      </div>
                    )}
                  </div>

                  {/* O'ng: backend hisob-kitobi va tasdiqlangandan keyingi natija */}
                  <div className="min-w-0 space-y-4">
                    <QaytarishOldindanHisobi holat={korinadiganOldindan} usul={usul} ixcham onQaytaUrinish={oldindanQaytaUrinish} />

                    {oldindanTayyor && oldindanHisob && (
                      <div className="overflow-hidden rounded-[22px] border border-sky-200 bg-linear-to-br from-sky-50 via-white to-white shadow-sm">
                        <p className="flex items-center gap-2 border-b border-sky-100 px-4 py-3 text-sm font-black text-sky-900">
                          <ShieldCheck size={16} className="text-sky-600" aria-hidden /> {t("wizard.confirm.effectsTitle")}
                        </p>
                        <ul className="divide-y divide-sky-100/70">
                          {[
                            {
                              ikonka: PackageCheck,
                              rang: "bg-sky-100 text-sky-700",
                              matn: t("wizard.confirm.effStock", { count: (oldindan.turi === "tayyor" ? oldindan.dona : null) ?? dona }),
                            },
                            {
                              ikonka: BadgeCheck,
                              rang: "bg-emerald-100 text-emerald-700",
                              matn:
                                (oldindanHisob.qarzdanAyriladi ?? 0) > 0
                                  ? t("wizard.confirm.effDebt", { summa: pulniFormatlash(oldindanHisob.qarzdanAyriladi) })
                                  : t("wizard.confirm.effNoDebt"),
                            },
                            {
                              ikonka: HandCoins,
                              rang: "bg-orange-100 text-orange-700",
                              matn:
                                (oldindanHisob.mijozgaQaytariladi ?? 0) > 0
                                  ? t("wizard.confirm.effRefund", { summa: pulniFormatlash(oldindanHisob.mijozgaQaytariladi), usul: t(`wizard.calc.methods.${usul}`) })
                                  : t("wizard.confirm.effNoRefund"),
                            },
                          ].map((satr) => (
                            <li key={satr.matn} className="flex items-center gap-3 px-4 py-3">
                              <span aria-hidden className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${satr.rang}`}>
                                <satr.ikonka size={17} />
                              </span>
                              <span className="text-sm font-bold text-slate-800">{satr.matn}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <p className="flex items-start gap-2.5 rounded-2xl bg-amber-50/70 px-4 py-3 text-xs font-semibold leading-5 text-amber-900 ring-1 ring-amber-100">
                      <Info size={15} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
                      {t("wizard.confirm.warning")}
                    </p>
                  </div>
                </div>
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
          <footer className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-b-[26px] border-t border-slate-100 bg-slate-50/90 px-4 py-3 backdrop-blur sm:px-8 sm:py-4">
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

            {qadam === QADAM_SOTUV && sotuv && !sotuvYuklanmoqda && (
              <span className="hidden min-w-0 truncate text-sm font-bold text-slate-500 lg:inline">
                {t("wizard.sale.selected")}: <b className="font-black text-slate-900">{sotuvRaqami(sotuv)}</b> · {mijozNomi(sotuv)}
              </span>
            )}

            {qadam === QADAM_HISOB && oldindanHisob && oldindanHisob.tovarQiymati !== null && (
              <span className="hidden text-sm font-bold text-slate-500 xl:inline">
                {t("wizard.calc.goods")}: <b className="font-black tabular-nums text-slate-900">{pulniFormatlash(oldindanHisob.tovarQiymati)}</b>
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
                disabled={yuborilmoqda || !oldindanTayyor}
                className="order-first inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 text-sm font-black text-white shadow-lg shadow-emerald-200 transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none sm:order-none sm:ml-auto sm:w-auto"
              >
                {yuborilmoqda ? <LoaderCircle size={17} className="animate-spin" aria-hidden /> : <CheckCircle2 size={17} aria-hidden />}
                {yuborilmoqda
                  ? t("wizard.confirm.working")
                  : oldindanHisob?.tovarQiymati !== null && oldindanHisob?.tovarQiymati !== undefined
                    ? t("wizard.confirm.buttonWithAmount", { summa: pulniFormatlash(oldindanHisob.tovarQiymati) })
                    : t("wizard.confirm.button")}
              </button>
            )}
          </footer>
        )}
      </div>
    </div>
  );
}

// Mijoz nomidan boshlang'ich harflar va barqaror rang (bir xil mijoz doim bir xil rangda).
const AVATAR_RANGLARI = [
  "bg-orange-100 text-orange-700",
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
];

function MijozAvatari({ nom }: { nom: string }) {
  const harflar = nom
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((qism) => qism.charAt(0).toUpperCase())
    .join("");
  let hash = 0;
  for (const belgi of nom) hash = (hash * 31 + belgi.charCodeAt(0)) % 997;
  return (
    <span aria-hidden className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${AVATAR_RANGLARI[hash % AVATAR_RANGLARI.length]}`}>
      {harflar || <UserRound size={18} />}
    </span>
  );
}

// 1-bosqich: bitta sotuv kartasi (raqam, mijoz, sana, summa / to'langan / qarz). Hammasi backend sotuv ma'lumotlaridan.
function SotuvKartasi({ sotuv, tanlangan, oldinQaytarilgan, onTanlash }: { sotuv: Sotuv; tanlangan: boolean; oldinQaytarilgan: boolean; onTanlash: () => void }) {
  const { t } = useTranslation("savdo_qaytarish");
  const mijoz = mijozNomi(sotuv);
  const jami = sotuvSummasi(sotuv);
  const tolangan = sotuvTolanganSummasi(sotuv);
  const qarz = sotuvQarzdorlikSummasi(sotuv);

  return (
    <button
      type="button"
      onClick={onTanlash}
      aria-pressed={tanlangan}
      className={`group relative w-full cursor-pointer overflow-hidden rounded-[22px] border p-4 text-left transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 motion-reduce:transition-none ${
        tanlangan
          ? "border-orange-400 bg-linear-to-br from-orange-50 via-white to-white shadow-[0_12px_30px_-16px_rgba(234,88,12,.55)] ring-2 ring-orange-200"
          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_14px_30px_-18px_rgba(15,23,42,.35)]"
      }`}
    >
      <div className="flex items-start gap-3">
        <MijozAvatari nom={mijoz} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-black text-slate-900">{mijoz}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-semibold">
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-black tabular-nums text-slate-700">
              <Receipt size={11} aria-hidden /> {sotuvRaqami(sotuv)}
            </span>
            <span className="inline-flex items-center gap-1 tabular-nums text-slate-400">
              <CalendarDays size={12} aria-hidden /> {sananiFormatlash(sotuvSanasi(sotuv))}
            </span>
          </p>
          {oldinQaytarilgan && (
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700 ring-1 ring-amber-200">
              <Undo2 size={10} aria-hidden /> {t("wizard.sale.partial")}
            </span>
          )}
        </div>
        <span
          aria-hidden
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${
            tanlangan ? "border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-200" : "border-slate-200 text-transparent group-hover:border-orange-300"
          }`}
        >
          <Check size={15} strokeWidth={3} />
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="col-span-2 min-w-0 rounded-xl bg-slate-50 px-3 py-2 sm:col-span-1">
          <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{t("wizard.sale.total")}</dt>
          <dd className="mt-0.5 truncate text-[13px] font-extrabold tabular-nums text-slate-800">{pulniFormatlash(jami)}</dd>
        </div>
        <div className="min-w-0 rounded-xl bg-emerald-50/80 px-3 py-2">
          <dt className="text-[10px] font-bold uppercase tracking-wide text-emerald-600/70">{t("wizard.sale.paid")}</dt>
          <dd className="mt-0.5 truncate text-[13px] font-extrabold tabular-nums text-emerald-700">{pulniFormatlash(tolangan)}</dd>
        </div>
        <div className={`min-w-0 rounded-xl px-3 py-2 ${qarz > 0 ? "bg-rose-50/80" : "bg-slate-50"}`}>
          <dt className={`text-[10px] font-bold uppercase tracking-wide ${qarz > 0 ? "text-rose-500/80" : "text-slate-400"}`}>{t("wizard.sale.debt")}</dt>
          <dd className={`mt-0.5 truncate text-[13px] font-extrabold tabular-nums ${qarz > 0 ? "text-rose-600" : "text-slate-500"}`}>{pulniFormatlash(qarz)}</dd>
        </div>
      </dl>
    </button>
  );
}


// 2-bosqich: backend ko'rsatkichi (sotilgan / avval qaytarilgan / narx) — rangli belgi va ikonka bilan.
const KORSATKICH_RANGLARI = {
  sky: { karta: "bg-sky-50 text-sky-800 ring-sky-100", ikonka: "text-sky-600" },
  amber: { karta: "bg-amber-50 text-amber-800 ring-amber-100", ikonka: "text-amber-600" },
  slate: { karta: "bg-slate-50 text-slate-800 ring-slate-100", ikonka: "text-slate-500" },
  violet: { karta: "bg-violet-50 text-violet-800 ring-violet-100", ikonka: "text-violet-600" },
} as const;

function Korsatkich({
  ikonka: Ikona,
  nom,
  qiymat,
  rang,
  izoh,
  className = "",
}: {
  ikonka: LucideIcon;
  nom: string;
  qiymat: string;
  rang: keyof typeof KORSATKICH_RANGLARI;
  izoh?: ReactNode;
  className?: string;
}) {
  const uslub = KORSATKICH_RANGLARI[rang];
  return (
    <div className={`flex min-w-0 items-center gap-2.5 rounded-xl px-3 py-2.5 ring-1 ${uslub.karta} ${className}`}>
      <span aria-hidden className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/85 shadow-sm ring-1 ring-black/5 ${uslub.ikonka}`}>
        <Ikona size={15} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-wide opacity-70 lg:hidden">{nom}</p>
        <p className="text-sm font-extrabold tabular-nums">{qiymat}</p>
        {izoh}
      </div>
    </div>
  );
}

// 2-bosqich: bitta mahsulot qatori. Miqdorlar va narx backenddan (returnable-items), nom — sotuv qatori yoki katalogdan.
// Telefonda: nom → 2 ustunli ko'rsatkichlar → miqdor boshqaruvi; planshetda 3 ustunli ko'rsatkichlar; katta ekranda bitta qator.
function MahsulotQatori({
  qator,
  summa,
  onOzgartirish,
  onSurish,
}: {
  qator: Qator;
  // Shu qator uchun qaytariladigan summa (backend jami summasi bilan tasdiqlanganda); null — ko'rsatilmaydi.
  summa: number | "kutilmoqda" | null;
  onOzgartirish: (id: string, qiymat: string) => void;
  onSurish: (id: string, qolgan: number, delta: number) => void;
}) {
  const { t } = useTranslation("savdo_qaytarish");
  const maks = qator.qolgan ?? 0;
  const ochirilgan = qator.xato === "data" || maks === 0;
  const xatoBor = Boolean(qator.xato) && qator.xato !== "data";
  const tanlangan = qator.son > 0 && !xatoBor;
  const hammasi = maks > 0 && qator.son >= maks && !xatoBor;
  const ulush = maks > 0 ? Math.min(Math.max(qator.son / maks, 0), 1) * 100 : 0;
  const yoq = t("wizard.unavailable");
  const farqliQiymat = qator.narx !== null && qator.birlikQiymati !== null && qator.birlikQiymati !== qator.narx;

  const qatorRangi = ochirilgan
    ? "border-slate-100 bg-slate-50/60 opacity-70"
    : xatoBor
      ? "border-rose-300 bg-rose-50/40"
      : tanlangan
        ? "border-orange-300 bg-linear-to-br from-orange-50 via-white to-white shadow-[0_14px_30px_-20px_rgba(234,88,12,.6)] ring-1 ring-orange-100"
        : "border-slate-200 bg-white hover:border-orange-200 hover:shadow-sm";

  return (
    <div className={`rounded-[22px] border p-4 transition duration-200 motion-reduce:transition-none lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,.75fr)_minmax(0,.85fr)_minmax(0,1.1fr)_minmax(250px,1.1fr)] lg:items-center lg:gap-4 lg:px-5 ${qatorRangi}`}>
      {/* Mahsulot */}
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition ${
            tanlangan ? "bg-linear-to-br from-orange-400 to-orange-600 text-white shadow-lg shadow-orange-200" : "bg-slate-100 text-slate-500"
          }`}
        >
          <Package size={22} />
        </span>
        <div className="min-w-0">
          {qator.nomYuklanmoqda ? (
            <span role="status" aria-label={t("wizard.items.loadingName")} className="block h-4 w-40 max-w-full animate-pulse rounded-md bg-slate-200" />
          ) : (
            <p className="break-words text-base font-black leading-snug text-slate-900">{qator.nom}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {qator.variant && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">{qator.variant}</span>
            )}
            {tanlangan && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-black text-orange-700">
                <Check size={11} strokeWidth={3} aria-hidden /> {t("wizard.items.selected")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Backend ko'rsatkichlari */}
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 lg:contents">
        <Korsatkich ikonka={ShoppingBag} rang="sky" nom={t("wizard.items.sold")} qiymat={qator.sotilgan === null ? yoq : `${qator.sotilgan} ${t("wizard.unit")}`} />
        <Korsatkich
          ikonka={Undo2}
          rang={(qator.oldin ?? 0) > 0 ? "amber" : "slate"}
          nom={t("wizard.items.returned")}
          qiymat={qator.oldin === null ? yoq : `${qator.oldin} ${t("wizard.unit")}`}
        />
        <Korsatkich
          ikonka={Tag}
          rang="violet"
          className="col-span-2 md:col-span-1"
          nom={t("wizard.items.price")}
          qiymat={qator.narx === null ? yoq : pulniFormatlash(qator.narx)}
          izoh={
            farqliQiymat && qator.birlikQiymati !== null ? (
              <p className="mt-0.5 text-[11px] font-bold leading-snug text-emerald-600">{t("wizard.items.unitValue", { summa: pulniFormatlash(qator.birlikQiymati) })}</p>
            ) : undefined
          }
        />
      </div>

      {/* Qaytarish miqdori */}
      <div
        className={`mt-3 rounded-2xl p-3 ring-1 lg:mt-0 ${
          tanlangan ? "bg-white/80 ring-orange-100" : xatoBor ? "bg-white/80 ring-rose-100" : "bg-slate-50/80 ring-slate-100"
        }`}
      >
        <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-500 lg:hidden">{t("wizard.items.returnQty")}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSurish(qator.id, maks, -1)}
            disabled={ochirilgan}
            aria-label={t("wizard.items.decrease")}
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Minus size={16} />
          </button>
          <input
            inputMode="decimal"
            value={qator.matn}
            onChange={(event) => onOzgartirish(qator.id, event.target.value)}
            disabled={ochirilgan}
            aria-label={`${qator.nom}: ${t("wizard.items.returnQty")}`}
            aria-invalid={xatoBor}
            className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white text-center text-lg font-extrabold tabular-nums text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-50 aria-invalid:border-rose-400 aria-invalid:ring-4 aria-invalid:ring-rose-100 disabled:bg-slate-50"
          />
          <button
            type="button"
            onClick={() => onSurish(qator.id, maks, 1)}
            disabled={ochirilgan}
            aria-label={t("wizard.items.increase")}
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={16} />
          </button>
        </div>
        {!ochirilgan && (
          <span aria-hidden className="mt-3 block h-1.5 overflow-hidden rounded-full bg-slate-200/70">
            <span
              className={`block h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none ${
                hammasi ? "bg-linear-to-r from-emerald-400 to-emerald-500" : "bg-linear-to-r from-orange-400 to-orange-500"
              }`}
              style={{ width: `${ulush}%` }}
            />
          </span>
        )}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <span className="text-[11px] font-bold text-slate-500">{qator.qolgan === null ? yoq : t("wizard.items.max", { count: maks })}</span>
          {!ochirilgan && (
            <span className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onOzgartirish(qator.id, "0")}
                disabled={qator.son === 0 && qator.matn.trim() === "0"}
                className="cursor-pointer rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-100 disabled:cursor-default disabled:opacity-40"
              >
                {t("wizard.items.clear")}
              </button>
              <button
                type="button"
                onClick={() => onOzgartirish(qator.id, String(maks))}
                disabled={hammasi}
                className="cursor-pointer rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-black text-orange-700 transition hover:bg-orange-200 disabled:cursor-default disabled:opacity-50"
              >
                {t("wizard.items.all")}
              </button>
            </span>
          )}
        </div>
        {summa !== null && (
          <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl bg-emerald-50 px-3 py-2 ring-1 ring-emerald-100">
            <span className="text-[11px] font-black uppercase tracking-wide text-emerald-700/80">{t("wizard.items.rowTotal")}</span>
            {summa === "kutilmoqda" ? (
              <span className="h-4 w-20 animate-pulse rounded bg-emerald-100" aria-hidden />
            ) : (
              <span className="text-sm font-extrabold tabular-nums text-emerald-700">{pulniFormatlash(summa)}</span>
            )}
          </div>
        )}
        {qator.xato && (
          <p role="alert" className="mt-2 flex items-start gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-600">
            <AlertCircle size={13} className="mt-0.5 shrink-0" aria-hidden /> {t(`wizard.items.errors.${qator.xato}`, { max: maks })}
          </p>
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

// 1-bosqichdagi tanlangan sotuv xulosasi (summary card): sotuv raqami, mijoz, sotuv summasi, to'langan va qarz.
function SotuvXulosasi({ sotuv }: { sotuv: Sotuv }) {
  const { t } = useTranslation("savdo_qaytarish");
  const mijoz = mijozNomi(sotuv);
  const qarz = sotuvQarzdorlikSummasi(sotuv);
  const kartalar = [
    {
      nom: t("wizard.sale.total"),
      qiymat: pulniFormatlash(sotuvSummasi(sotuv)),
      ikonka: Wallet,
      karta: "bg-slate-50 ring-slate-100",
      tile: "bg-white text-slate-500 ring-slate-200",
      yozuv: "text-slate-400",
      son: "text-slate-900",
    },
    {
      nom: t("wizard.sale.paid"),
      qiymat: pulniFormatlash(sotuvTolanganSummasi(sotuv)),
      ikonka: BadgeCheck,
      karta: "bg-emerald-50/80 ring-emerald-100",
      tile: "bg-white text-emerald-600 ring-emerald-100",
      yozuv: "text-emerald-600/80",
      son: "text-emerald-700",
    },
    {
      nom: t("wizard.sale.debt"),
      qiymat: pulniFormatlash(qarz),
      ikonka: CircleDollarSign,
      karta: qarz > 0 ? "bg-rose-50/80 ring-rose-100" : "bg-slate-50 ring-slate-100",
      tile: qarz > 0 ? "bg-white text-rose-500 ring-rose-100" : "bg-white text-slate-400 ring-slate-200",
      yozuv: qarz > 0 ? "text-rose-500/80" : "text-slate-400",
      son: qarz > 0 ? "text-rose-600" : "text-slate-500",
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      aria-label={t("wizard.sale.selected")}
      className="relative mt-6 overflow-hidden rounded-[26px] border border-orange-200 bg-white shadow-[0_16px_40px_-22px_rgba(234,88,12,.45)]"
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-orange-400 via-orange-500 to-emerald-400" />
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 bg-linear-to-br from-orange-50 via-orange-50/40 to-white px-5 pb-4 pt-5 sm:px-6">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-orange-600 ring-1 ring-orange-200">
            <CheckCircle2 size={13} aria-hidden /> {t("wizard.sale.selected")}
          </p>
          <p className="mt-2 flex items-center gap-2.5 text-2xl font-black tabular-nums tracking-tight text-slate-950">
            <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white shadow-md shadow-orange-200">
              <Receipt size={19} />
            </span>
            {sotuvRaqami(sotuv)}
          </p>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <MijozAvatari nom={mijoz} />
          <p className="min-w-0 truncate text-base font-extrabold text-slate-800">{mijoz}</p>
        </div>
      </div>
      <dl className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
        {kartalar.map((karta) => {
          const Ikona = karta.ikonka;
          return (
            <div key={karta.nom} className={`flex items-center gap-3.5 rounded-2xl px-4 py-3.5 ring-1 ${karta.karta}`}>
              <span aria-hidden className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${karta.tile}`}>
                <Ikona size={20} />
              </span>
              <div className="min-w-0">
                <dt className={`text-xs font-bold ${karta.yozuv}`}>{karta.nom}</dt>
                <dd className={`mt-0.5 truncate text-xl font-extrabold tabular-nums ${karta.son}`}>{karta.qiymat}</dd>
              </div>
            </div>
          );
        })}
      </dl>
    </motion.section>
  );
}

// 6-bosqich: muvaffaqiyatli yakun ekrani — qiymatlar tasdiqlangan hujjatdan (backend javobi).
function Yakun({ natija, onKorish, onYangi, onYopish }: { natija: Natija; onKorish: () => void; onYangi: () => void; onYopish: () => void }) {
  const { t } = useTranslation("savdo_qaytarish");
  const { hisob } = natija;
  const yoq = t("wizard.unavailable");
  const holatMatni = natija.holat ? t(`status.${natija.holat === "CONFIRMED" ? "confirmed" : natija.holat === "CANCELLED" || natija.holat === "CANCELED" ? "cancelled" : "draft"}`) : yoq;

  const satrlar = [
    { matn: t("wizard.done.stock", { count: natija.dona }), yoq: false },
    {
      matn: !hisob || hisob.qarzdanAyriladi === null ? t("wizard.done.debtUnavailable") : t("wizard.done.debt", { summa: pulniFormatlash(hisob.qarzdanAyriladi) }),
      yoq: !hisob || hisob.qarzdanAyriladi === null,
    },
    {
      matn:
        !hisob || hisob.mijozgaQaytariladi === null
          ? t("wizard.done.refundUnavailable")
          : hisob.mijozgaQaytariladi > 0
            ? t("wizard.done.refund", { summa: pulniFormatlash(hisob.mijozgaQaytariladi) })
            : t("wizard.done.noRefund"),
      yoq: !hisob || hisob.mijozgaQaytariladi === null,
    },
    { matn: t("wizard.done.status", { holat: holatMatni }), yoq: !natija.holat },
  ];

  const qolgan = hisob?.qolganQarz ?? null;

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
          <li key={satr.matn} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${satr.yoq ? "border-slate-200 bg-slate-50" : "border-emerald-100 bg-emerald-50/60"}`}>
            <span aria-hidden className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${satr.yoq ? "bg-slate-300" : "bg-emerald-500"}`}><Check size={16} strokeWidth={3} /></span>
            <span className={`text-sm font-extrabold ${satr.yoq ? "text-slate-500" : "text-slate-800"}`}>{satr.matn}</span>
          </li>
        ))}
      </ul>

      <div className="mx-auto mt-5 flex max-w-md items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <span className="text-sm font-bold text-slate-500">{t("wizard.done.remaining")}</span>
        {qolgan === null ? (
          <span className="text-sm font-bold text-slate-400">{yoq}</span>
        ) : (
          <span className={`text-2xl font-extrabold tabular-nums ${qolgan > 0 ? "text-rose-600" : "text-emerald-600"}`}>{pulniFormatlash(qolgan)}</span>
        )}
      </div>
      {!hisob && <p className="mx-auto mt-3 max-w-md text-xs font-medium text-amber-700">{t("wizard.done.detailsFailed")}</p>}

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
