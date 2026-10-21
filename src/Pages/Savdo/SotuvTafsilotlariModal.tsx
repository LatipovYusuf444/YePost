import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import HujjatSanasiMaydoni, { KiritilganBelgisi } from "@/Components/common/HujjatSanasi";
import { bugungiToshkentKuni, hujjatVaqtiMatni, kelajakKunmi, kunMatni, saqlanganTolovMaydonlari, tolovQoshimchasi, toshkentKuni } from "@/lib/hujjatSanasi";
import { ombordanChiqarishSanasi } from "@/lib/hujjatHarakatlari";
import { useHujjatHarakatlari } from "@/hooks/useHujjatHarakatlari";
import { useNakladnoy } from "@/hooks/useNakladnoy";
import { useDavrStore } from "@/store/davrStore";
import type { TFunction } from "i18next";
import {
  ArrowLeft,
  Ban,
  Bell,
  Building2,
  Calculator,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Link,
  ImageIcon,
  LoaderCircle,
  MessageSquare,
  MapPin,
  MoreHorizontal,
  Package,
  PenLine,
  Phone,
  Pin,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Send,
  ShoppingCart,
  SlidersHorizontal,
  StickyNote,
  Trash2,
  TriangleAlert,
  UserCheck,
  UserRound,
  Wallet,
  Warehouse,
  X,
} from "lucide-react";
import { crmApi, royxatniAjratish } from "@/api/crmApi";
import {
  yetkazishniBekorQilish,
  yetkazishniJonatish,
  yetkazishniOlish,
  yetkazishniYakunlash,
  yetkazishniYangilash,
  yetkazishYaratish,
  sotuvTarixiniOlish,
  sotuvTafsilotiniOlish,
} from "@/api/savdoApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { mijozlarApi, mijozKompaniyalariApi } from "@/api/partnersApi";
import AppModal from "@/Components/common/AppModal";
import { useOmborStore } from "@/store/omborStore";
import { useSavdoStore } from "@/store/savdoStore";
import type { Activity, ChatMessage, Comment } from "@/types/crm";
import type { Ombor } from "@/types/ombor";
import type { QoldiqTanlovi, SaleAuditLog, Sotuv, SotuvYaratishMalumoti, TolovQoshishMalumoti, TolovTuri, XodimTanlovi, YetkazishMalumoti, YetkazishPayload } from "@/types/savdo";
import { dollarQatnashdimi, natijalarYigindisi, ortiqchaMaydonlari, ortiqchaTahlili, qaytimSomda, somMatni, tolovlarQaytimi, type OrtiqchaQatori, type TolovNatijasi } from "@/lib/tolovOrtiqchasi";
import {
  BIRIKTIRILGAN_MIJOZ_NOMI,
  donalikMijozNomi,
  masulNomi,
  mijozNomi,
  pulniFormatlash,
  qatorValyutasi,
  sananiFormatlash,
  sotuvChegirmaSummasi,
  sotuvdaMijozBiriktirilganmi,
  sotuvHolati,
  sotuvHolatiMatni,
  sotuvJadvalId,
  sotuvOrtiqchaTolovSummasi,
  sotuvQarzdorlikSummasi,
  sotuvRaqami,
  sotuvSummasi,
  sotuvTolanganSummasi,
  sotuvValyutasi,
  sotuvValyutasigaOgirish,
  tolovSotuvValyutasida,
  tolovTuriMatni,
  tolovValyutasi,
} from "./savdoYordamchilari";
import { qatorBirligida, qatorMiqdoriMatni, qatorniQaytaYuborish } from "@/lib/kopBirlik";
import { useValyutaStore, valyutaKodi, type Valyuta } from "@/lib/valyuta";
import { mijozHisobi } from "@/lib/mijozHisobi";
import { qoralamaFormasi } from "@/lib/qoralamaUmumiyTahrir";
import { xatolikXabari } from "@/lib/toast";
import SavdoSelect from "./SavdoSelect";
import OrtiqchaTanlovi from "./OrtiqchaTanlovi";
import TolovNatijasiKarta from "./TolovNatijasi";
import SotuvTolovlari from "./SotuvTolovlari";
import SotuvOmbordanChiqarishQatori from "./SotuvOmbordanChiqarishQatori";
import SummaMaydoni from "@/Components/common/SummaMaydoni";
import SotuvJarayoni from "./SotuvJarayoni";
import TelegramXabarnomaKarti from "./TelegramXabarnoma";
import SotuvOmbordanChiqqanlar from "./SotuvOmbordanChiqqanlar";
import OmbordanChiqqanlarOynasi, { OmbordanChiqqanlarHavolasi } from "./OmbordanChiqqanlarOynasi";
import QoralamaUmumiyTahrir from "./QoralamaUmumiyTahrir";
import QoralamaTovarlarTahriri from "./QoralamaTovarlarTahriri";
import BoshlangichQarzTafsilotlariModal from "@/Pages/XaridorUchot/BoshlangichQarzTafsilotlariModal";

import ModalTablari from "@/Components/common/ModalTablari";
import TasdiqlashOynasi from "@/Components/common/TasdiqlashOynasi";
import HujjatOchirish from "@/Components/common/HujjatOchirish";
import { useHujjatniBekorQilishMumkinmi } from "@/hooks/useHujjatniOchirishMumkinmi";
type SotuvTafsilotlariModalProps = {
  sotuv: Sotuv;
  qoldiqlar: QoldiqTanlovi[];
  xodimlar: XodimTanlovi[];
  amalBajarilmoqda: boolean;
  qoldiqYuklanmoqda?: boolean;
  onYopish: () => void;
  onYangilash: (
    sotuvId: string,
    malumot: Partial<SotuvYaratishMalumoti>
  ) => Promise<boolean>;
  onTolovQoshish: (
    sotuvId: string,
    tolov: TolovQoshishMalumoti
  ) => Promise<TolovNatijasi | null>;
  onTasdiqlash: (sotuvId: string) => Promise<void> | void;
  onBekorQilish: (sotuvId: string) => void;
  // Qoralamalar ro'yxatidagi "Tahrirlash" oynani to'g'ridan-to'g'ri "Tovarlar" bo'limida ochadi.
  boshlangichTab?: "Umumiy" | "Tovarlar" | "Tarix";
};

type SotuvItem = NonNullable<Sotuv["items"]>[number];
type YangiTovarQatori = {
  id: string;
  modificationId: string;
  quantity: number;
  price: number;
  // Narx katalogdan kelgan bo'lsa qulflanadi (faqat chegirma o'zgaradi); katalogda narx bo'lmasa qo'lda kiritiladi.
  priceLocked?: boolean;
  discount: number;
  availableQty: number;
  warehouseName: string;
  warehouseAddress?: string;
  modification?: SotuvItem["modification"];
};

type SaqlanganFaoliyat = {
  id: string;
  turi: string;
  sarlavha: string;
  matn: string;
  sana: string;
  xodimId?: string;
  harakat?: string;
  pinned?: boolean;
  completed?: boolean;
  attachmentIds?: string[];
  mentionUserIds?: string[];
};

type HujjatTuri = "Nakladnoy" | "Hisob-faktura";

type SaqlanganHujjat = {
  id: string;
  sotuvId: string;
  turi: HujjatTuri;
  nomi: string;
  sana: string;
};

// Bu identifikatorlar activeTab/tanlanganBolim state qiymatlari sifatida ham
// ishlatiladi (bir nechta joyda taqqoslanadi) — shuning uchun o'zi o'zgarmaydi,
// faqat TAB_LABEL_KEYS/BOLIM_LABEL_KEYS orqali ekranda tarjima qilinadi.
const tabs = ["Umumiy", "Tovarlar", "Tarix"];
const bolimlar = ["To'lov", "To'lov va yetkazish", "Terminal orqali to'lov", "Yetkazish", "Ombordan chiqarish"];
// Real backend bilan hozircha faqat shu ikkisi ishlaydi — qolganlari
// tayyor bo'lguncha "Qo'shish" menyusida o'chiq (bosib bo'lmaydigan) holatda turadi.
const faolBolimlar = new Set(["To'lov", "Ombordan chiqarish"]);

const TAB_LABEL_KEYS: Record<string, string> = {
  Umumiy: "tabs.umumiy",
  Tovarlar: "tabs.tovarlar",
  Tarix: "tabs.tarix",
};

const BOLIM_LABEL_KEYS: Record<string, string> = {
  "To'lov": "bolimlar.tolov",
  "To'lov va yetkazish": "bolimlar.tolovVaYetkazish",
  "Terminal orqali to'lov": "bolimlar.terminalTolov",
  Yetkazish: "bolimlar.yetkazish",
  "Ombordan chiqarish": "bolimlar.ombordanChiqarish",
};

const HUJJAT_MENU_LABEL_KEYS: Record<string, string> = {
  Akt: "header.hujjatTurlari.akt",
  Hisob: "header.hujjatTurlari.hisob",
  "Hisob-faktura": "header.hujjatTurlari.hisobFaktura",
  Nakladnoy: "header.hujjatTurlari.nakladnoy",
  Ishonchnoma: "header.hujjatTurlari.ishonchnoma",
  "Tijorat taklifi": "header.hujjatTurlari.tijoratTaklifi",
  "Pudrat shartnomasi": "header.hujjatTurlari.pudratShartnomasi",
  "Yetkazib berish shartnomasi": "header.hujjatTurlari.yetkazibBerishShartnomasi",
  "Xizmat ko'rsatish shartnomasi": "header.hujjatTurlari.xizmatShartnomasi",
  "Universal topshirish hujjati": "header.hujjatTurlari.universalHujjat",
  "EDI jismoniy shaxs kelishuvi": "header.hujjatTurlari.ediJismoniy",
  "EDI yuridik shaxs kelishuvi": "header.hujjatTurlari.ediYuridik",
};

function crmActivityniFaoliyatga(activity: Activity, t: TFunction): SaqlanganFaoliyat {
  return {
    id: activity.id,
    turi: activity.type === "TASK" ? "Vazifa" : activity.type === "MEETING" ? "Ish" : "Ish",
    sarlavha: activity.subject ?? t("umumiyTab.faoliyat.crmVazifa"),
    matn: activity.description ?? activity.result ?? "",
    sana: activity.dueAt ?? activity.createdAt ?? new Date().toISOString(),
    xodimId: activity.assigneeId,
    harakat: "Kalendariga qo'shish",
    completed: String(activity.status ?? "").toUpperCase() === "DONE",
  };
}

function crmCommentniFaoliyatga(comment: Comment, t: TFunction): SaqlanganFaoliyat {
  return {
    id: comment.id,
    turi: "Izoh",
    sarlavha: t("umumiyTab.faoliyat.izoh"),
    matn: comment.text ?? "",
    sana: comment.createdAt ?? new Date().toISOString(),
    pinned: Boolean(comment.pinned ?? comment.isPinned),
  };
}

function mijozIdOlish(sotuv: Sotuv) {
  return sotuv.customerId ?? sotuv.customer?.id ?? "";
}

function mijozTelefon(sotuv: Sotuv) {
  return sotuv.customer?.phone || sotuv.clientCompany?.phone || sotuv.walkInCustomerPhone || "-";
}

function modalMijozNomi(sotuv: Sotuv) {
  const customerName = [sotuv.customer?.firstName, sotuv.customer?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return (
    customerName ||
    sotuv.customer?.fullName ||
    sotuv.customer?.name ||
    sotuv.clientCompany?.name ||
    donalikMijozNomi(sotuv) ||
    (sotuvdaMijozBiriktirilganmi(sotuv) ? BIRIKTIRILGAN_MIJOZ_NOMI : "-")
  );
}

function tozaManzil(value?: string | null) {
  const text = String(value ?? "").trim();
  const placeholderlar = new Set(["", "—", "-", "null", "undefined", "string"]);
  return placeholderlar.has(text.toLowerCase()) ? "" : text;
}

function mijozManzili(sotuv: Sotuv) {
  return tozaManzil(sotuv.customer?.address) || tozaManzil(sotuv.clientCompany?.address) || "—";
}

function sotuvOmborNomi(sotuv: Sotuv, omborlar: Ombor[], t: TFunction) {
  return (
    sotuv.warehouse?.name ||
    omborlar.find((ombor) => ombor.id === sotuv.warehouseId)?.name ||
    t("common.omborTanlanmagan")
  );
}

function qisqaVaqt(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("uz-UZ", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function xodimNomi(xodim: XodimTanlovi | null | undefined, t: TFunction) {
  if (!xodim) return t("common.xodimTanlanmagan");
  return xodim.fullName || xodim.name || xodim.username || xodim.email || xodim.id;
}

function xodimBoshHarflari(xodim?: XodimTanlovi | null) {
  if (!xodim) return "";
  const nom = xodim.fullName || xodim.name || xodim.username || xodim.email || xodim.id;
  return nom
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((qism) => qism[0]?.toUpperCase())
    .join("");
}

function tarixVaqti(value: string | undefined, t: TFunction) {
  if (!value) return t("tarix.vaqt.sanaYoq");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return sananiFormatlash(value);
  const diff = Date.now() - date.getTime();
  const minute = Math.floor(diff / 60000);
  if (minute >= 0 && minute < 60) return t("tarix.vaqt.minutAvval", { count: Math.max(minute, 1) });
  const hour = Math.floor(minute / 60);
  if (hour >= 1 && hour < 24) return t("tarix.vaqt.soatAvval", { count: hour });
  const today = new Date();
  if (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  ) {
    return t("tarix.vaqt.bugun", { vaqt: qisqaVaqt(value) });
  }
  return sananiFormatlash(value);
}

function boshlangichKalendarSanasi() {
  const sana = new Date();
  sana.setHours(15, 0, 0, 0);
  return sana;
}

function sanaKaliti(sana: Date) {
  const year = sana.getFullYear();
  const month = String(sana.getMonth() + 1).padStart(2, "0");
  const day = String(sana.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function kalendarMatni(value: Date | string, qisqa = false) {
  const sana = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(sana.getTime())) return "";
  const weekday = new Intl.DateTimeFormat("uz-UZ", { weekday: qisqa ? "short" : "long" }).format(sana);
  const month = new Intl.DateTimeFormat("uz-UZ", { month: "long" }).format(sana);
  const vaqt = new Intl.DateTimeFormat("uz-UZ", { hour: "2-digit", minute: "2-digit" }).format(sana);
  const haftaKuni = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${haftaKuni}, ${sana.getDate()}-${month}, soat ${vaqt}`;
}

function yilKunlari(year = new Date().getFullYear()) {
  const bugun = new Date();
  const formatter = new Intl.DateTimeFormat("uz-UZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const soatlar = ["8", "9", "10", "11", "12", "13", "14", "15", "16", "17"];
  const kunlar: Array<{ kun: string; sana: Date; dateKey: string; soatlar: string[]; bugun: boolean }> = [];
  const sana = new Date(year, 0, 1);

  while (sana.getFullYear() === year) {
    const kunSanasi = new Date(sana);
    kunlar.push({
      kun: formatter.format(sana),
      sana: kunSanasi,
      dateKey: sanaKaliti(kunSanasi),
      soatlar,
      bugun:
        sana.getFullYear() === bugun.getFullYear() &&
        sana.getMonth() === bugun.getMonth() &&
        sana.getDate() === bugun.getDate(),
    });
    sana.setDate(sana.getDate() + 1);
  }

  return kunlar;
}

function mahsulotNomi(item: SotuvItem, t: TFunction) {
  return item.modification?.product?.name ?? item.modification?.name ?? t("common.mahsulotNomiTopilmadi");
}

function son(value: unknown) {
  const raqam = Number(value ?? 0);
  return Number.isFinite(raqam) ? raqam : 0;
}

function mahsulotJami(item: SotuvItem) {
  return son(item.quantity) * son(item.price) - son(item.discount);
}

// Qatorlar bo'yicha yig'indi sotuv valyutasida (aralash sotuvda dollar qatorlari kurs bilan o'giriladi).
// Kurs topilmasa — `zaxira` (backend jami) qaytadi.
function qatorlarYigindisi(sotuv: Sotuv, items: SotuvItem[], qiymat: (item: SotuvItem) => number, zaxira: number) {
  let jami = 0;
  for (const item of items) {
    const ogirilgan = sotuvValyutasigaOgirish(qiymat(item), qatorValyutasi(item, sotuv), sotuv);
    if (ogirilgan === null) return zaxira;
    jami += ogirilgan;
  }
  return jami;
}

// Sotuv valyutasidan farqli bo'lgan qator/to'lov valyutasi (bir xil bo'lsa `currency` yuborilmaydi — sotuv valyutasi default).
function farqliValyuta(valyuta: Valyuta, sotuv: Pick<Sotuv, "currency">) {
  return valyuta !== sotuvValyutasi(sotuv) ? { currency: valyuta } : {};
}

// Dollarni sentgacha, so'mni butungacha YUQORIGA yaxlitlaydi (qarzni to'liq yopish uchun).
function valyutaYaxlitlash(summa: number, valyuta: Valyuta) {
  return valyuta === "USD" ? Math.ceil(summa * 100 - 1e-9) / 100 : Math.ceil(summa - 1e-9);
}

function qoldiqMiqdori(qoldiq: QoldiqTanlovi) {
  return son(qoldiq.quantity ?? qoldiq.balance);
}

function qoldiqNarxi(qoldiq: QoldiqTanlovi) {
  return son(
    qoldiq.sellingPrice ??
      qoldiq.price ??
      qoldiq.modification?.price?.sellingPrice ??
      qoldiq.modification?.price?.retailPrice ??
      qoldiq.modification?.price?.wholesalePrice ??
      0
  );
}

function qoldiqNomi(qoldiq: QoldiqTanlovi) {
  return qoldiq.modification?.product?.name ?? qoldiq.modification?.name ?? qoldiq.modificationId;
}

function qoldiqTavsifi(qoldiq: QoldiqTanlovi, t: TFunction) {
  const barcode = qoldiq.modification?.barcode;
  const article = qoldiq.modification?.article;
  return [
    barcode ? t("tovarlarTab.shtrixKod", { value: barcode }) : "",
    article ? t("tovarlarTab.artikul", { value: article }) : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

export default function SotuvTafsilotlariModal(props: SotuvTafsilotlariModalProps) {
  return props.sotuv.isOpeningDebt
    ? <BoshlangichQarzTafsilotlariModal key={props.sotuv.id} sotuvId={props.sotuv.id} boshlangich={props.sotuv} onClose={props.onYopish} />
    : <OddiySotuvTafsilotlariModal {...props} />;
}

function OddiySotuvTafsilotlariModal({
  sotuv,
  qoldiqlar,
  xodimlar,
  amalBajarilmoqda,
  onYopish,
  onYangilash,
  onTolovQoshish,
  onBekorQilish,
  boshlangichTab,
  qoldiqYuklanmoqda = false,
}: SotuvTafsilotlariModalProps) {
  const { t } = useTranslation("savdo_tafsilot");
  const sotuvniOchirish = useSavdoStore((state) => state.sotuvniOchirish);
  const sotuvniTiklash = useSavdoStore((state) => state.sotuvniTiklash);
  const bekorMumkin = useHujjatniBekorQilishMumkinmi("savdo");
  const [activeTab, setActiveTab] = useState<string>(boshlangichTab === "Tovarlar" && sotuvHolati(sotuv) === "DRAFT" ? "Umumiy" : boshlangichTab ?? "Umumiy");
  const [tahrirRejimi, setTahrirRejimi] = useState(boshlangichTab === "Tovarlar" && sotuvHolati(sotuv) === "DRAFT");
  // Qoralama tovarlaridagi saqlanmagan o'zgarishlar soni (tahrirlagich xabar beradi): yopish va to'lovga o'tish shunga qarab nazorat qilinadi.
  const [tovarOzgarishlari, setTovarOzgarishlari] = useState(0);
  const [chiqishSorovi, setChiqishSorovi] = useState<"modal" | "tahrir" | null>(null);
  const [yetkazishOchiq, setYetkazishOchiq] = useState(false);
  const [ombordanChiqarishOchiq, setOmbordanChiqarishOchiq] = useState(false);
  // Shu sotuv bilan ombordan chiqarilgan mahsulotlar oynasi (sotuv kartasidagi havoladan ochiladi).
  const [chiqarilganlarOchiq, setChiqarilganlarOchiq] = useState(false);
  const [tolovModalOchiq, setTolovModalOchiq] = useState(false);
  const [hujjatMenuOchiq, setHujjatMenuOchiq] = useState(false);
  const [hujjatGeneratorOchiq, setHujjatGeneratorOchiq] = useState(false);
  const [tanlanganHujjatTuri, setTanlanganHujjatTuri] = useState<HujjatTuri>("Nakladnoy");
  const [hujjatlar, setHujjatlar] = useState<SaqlanganHujjat[]>([]);
  const holat = sotuvHolati(sotuv);
  const jami = sotuvSummasi(sotuv);
  const draft = holat === "DRAFT";
  const vaqt = qisqaVaqt(sotuv.date ?? sotuv.createdAt) || "—";

  useEffect(() => {
    setHujjatlar([]);
  }, [sotuv.id]);

  function hujjatYaratish(turi: HujjatTuri) {
    const suffix = turi === "Nakladnoy" ? "YX" : "HF";
    const yangiHujjat: SaqlanganHujjat = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      sotuvId: sotuv.id,
      turi,
      nomi: `${turi} ${sotuvJadvalId(sotuv)}-${suffix}`,
      sana: new Date().toISOString(),
    };

    setTanlanganHujjatTuri(turi);
    setActiveTab("Umumiy");
    setHujjatlar((joriy) => {
      return [yangiHujjat, ...joriy.filter((hujjat) => hujjat.turi !== turi)];
    });
    setHujjatGeneratorOchiq(true);
  }

  function hujjatniOchish(hujjat: SaqlanganHujjat) {
    setTanlanganHujjatTuri(hujjat.turi);
    setHujjatGeneratorOchiq(true);
  }

  const saqlanmaganTovarlar = draft && tovarOzgarishlari > 0;

  // Saqlanmagan tovar o'zgarishlari bo'lsa, oyna yopilishidan oldin so'raladi.
  function yopishniSoraymiz() {
    if (saqlanmaganTovarlar) setChiqishSorovi("modal");
    else onYopish();
  }
  function tahrirniTugatish() {
    setTahrirRejimi(false);
    setTovarOzgarishlari(0);
    setActiveTab("Umumiy");
    setChiqishSorovi(null);
  }
  function tahrirniBekorQilish() {
    if (saqlanmaganTovarlar) setChiqishSorovi("tahrir");
    else tahrirniBekorQilibChiqish();
  }
  function tahrirniBekorQilibChiqish() {
    void useSavdoStore.getState().qoldiqlarniYuklash(sotuv.warehouseId ?? sotuv.warehouse?.id);
    tahrirniTugatish();
  }

  // To'lov backendda saqlangan qatorlar bo'yicha hisoblanadi: saqlanmagan o'zgarish bo'lsa avval saqlash (yoki bekor qilish) kerak.
  function tolovniOchish() {
    if (saqlanmaganTovarlar) {
      setActiveTab("Tovarlar");
      xatolikXabari(t("qoralamaTahrir.avvalSaqlang"));
      return;
    }
    setTolovModalOchiq(true);
  }

  return (
    <AppModal className={`items-start justify-start p-0 py-4 pl-[88px] pr-4 ${tahrirRejimi ? "draft-sale-edit-overlay" : "bg-[rgba(15,23,42,.50)] backdrop-blur-[3px]"}`}>
      <div className={`relative h-[calc(100vh-32px)] w-full ${tahrirRejimi ? "mx-auto max-w-[1440px]" : ""}`}>
        <ModalTezkorPanel sotuv={sotuv} onYopish={yopishniSoraymiz} />
        <section className={`relative h-full w-full overflow-hidden text-[#253044] shadow-[0_34px_120px_rgba(15,23,42,.42)] ring-1 ring-white/80 ${tahrirRejimi ? "rounded-[26px] bg-[#F5F7FB]" : "rounded-l-[46px] rounded-r-[36px] bg-gradient-to-br from-[#F8FAFC] via-[#FFFFFF] to-[#E8EEF7]"}`}>
        <div className="scrollbar-hidden h-full overflow-y-auto">
          <header className={`sticky top-0 z-30 border-b backdrop-blur-xl ${tahrirRejimi ? "border-slate-200/80 bg-white/95 px-5 py-4 sm:px-6" : "border-orange-100/80 bg-[#F8FAFC]/90 px-9 py-6"}`}>
            <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <div className="min-w-0 flex-1"><h1 className="break-words text-xl font-bold text-slate-900 sm:text-2xl">{qoralamaFormasi(sotuv).nom || `№${sotuvJadvalId(sotuv)}`}</h1><p className="mt-1 text-xs font-medium text-slate-500">{t(tahrirRejimi && draft ? "fullEdit.title" : "fullEdit.details")}</p></div>
              <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
                {draft && !tahrirRejimi && <button type="button" disabled={amalBajarilmoqda || qoldiqYuklanmoqda} onClick={() => setTahrirRejimi(true)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-gold-600 px-4 text-sm font-semibold text-white disabled:opacity-50"><PenLine size={16} />{t("fullEdit.edit")}</button>}
                {draft && tahrirRejimi && <button type="button" disabled={amalBajarilmoqda} onClick={tahrirniBekorQilish} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 disabled:opacity-50"><X size={16} />{t("fullEdit.discard")}</button>}
                {!tahrirRejimi && holat !== "CANCELLED" && bekorMumkin && <button type="button" disabled={amalBajarilmoqda} onClick={() => onBekorQilish(sotuv.id)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-600 disabled:opacity-50"><Ban size={16} />{t("fullEdit.cancelSale")}</button>}
                {!tahrirRejimi && <div className="relative hidden sm:block">
                  <button
                    type="button"
                    onClick={() => setHujjatMenuOchiq((joriy) => !joriy)}
                    className={`inline-flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-sm shadow-sm transition ${
                      hujjatMenuOchiq ? "text-orange-600 ring-1 ring-orange-100" : "text-slate-600 hover:text-orange-600"
                    }`}
                  >
                    {t("header.hujjat")} <ChevronDown size={15} className={`transition ${hujjatMenuOchiq ? "rotate-180" : ""}`} />
                  </button>

                  {hujjatMenuOchiq && (
                    <div className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute right-0 top-12 z-[90] w-[390px] overflow-hidden rounded-[22px] bg-white p-4 text-left shadow-[0_24px_70px_rgba(15,23,42,.24)] ring-1 ring-slate-100 duration-200">
                      <div className="max-h-[62vh] overflow-y-auto pr-1">
                        {[
                          "Akt",
                          "Hisob",
                          "Hisob-faktura",
                          "Nakladnoy",
                          "Ishonchnoma",
                          "Tijorat taklifi",
                          "Pudrat shartnomasi",
                          "Yetkazib berish shartnomasi",
                          "Xizmat ko'rsatish shartnomasi",
                          "Universal topshirish hujjati",
                          "EDI jismoniy shaxs kelishuvi",
                          "EDI yuridik shaxs kelishuvi",
                        ].map((nom) => (
                          <button
                            key={nom}
                            type="button"
                            onClick={() => {
                              setHujjatMenuOchiq(false);
                              if (nom === "Nakladnoy" || nom === "Hisob-faktura") hujjatYaratish(nom);
                            }}
                            className="flex h-10 w-full items-center rounded-xl px-2 text-sm font-medium text-slate-700 transition hover:bg-orange-50 hover:text-orange-600"
                          >
                            {t(HUJJAT_MENU_LABEL_KEYS[nom] ?? nom)}
                          </button>
                        ))}

                        <div className="my-3 h-px bg-slate-100" />
                        {[t("header.hujjatlarRoyxati"), t("header.yangiShablon")].map((nom) => (
                          <button
                            key={nom}
                            type="button"
                            onClick={() => setHujjatMenuOchiq(false)}
                            className="flex h-10 w-full items-center rounded-xl px-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-blue-600"
                          >
                            {nom}
                          </button>
                        ))}
                        <div className="my-3 h-px bg-slate-100" />
                        <button
                          type="button"
                          onClick={() => setHujjatMenuOchiq(false)}
                          className="flex h-10 w-full items-center justify-between rounded-xl px-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-blue-600"
                        >
                          <span>{t("header.kengaytmalar")}</span>
                          <ChevronRight size={17} className="text-slate-300" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>}
                {!tahrirRejimi && <HujjatOchirish
                  korinish="kichik"
                  guruh="savdo"
                  status={sotuv.status}
                  nom={sotuvJadvalId(sotuv)}
                  onTasdiq={() => sotuvniOchirish(sotuv.id)}
                  onTiklash={() => sotuvniTiklash(sotuv.id)}
                  onOchirildi={onYopish}
                />}
              </div>
            </div>

            {!tahrirRejimi && <ModalTablari
                className="mt-6"
                tablar={tabs.map((tab) => ({ id: tab, nom: t(TAB_LABEL_KEYS[tab] ?? tab) }))}
                faol={activeTab}
                onChange={setActiveTab}
              />}
          </header>

          {saqlanmaganTovarlar && !tahrirRejimi && (
            <div className="mx-9 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 px-5 py-3.5 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
              <span className="flex items-center gap-2.5">
                <TriangleAlert size={18} className="shrink-0" />
                {t("qoralamaTahrir.saqlanmagan", { soni: tovarOzgarishlari })}
              </span>
              <button
                type="button"
                onClick={() => setTahrirRejimi(true)}
                className="h-9 rounded-xl bg-amber-500 px-4 text-xs font-black text-white transition hover:bg-amber-600"
              >
                {t("tabs.tovarlar")}
              </button>
            </div>
          )}

          {draft && tahrirRejimi ? <QoralamaUmumiyTahrir sotuv={sotuv} amalBajarilmoqda={amalBajarilmoqda} onYangilash={onYangilash} onOzgarish={setTovarOzgarishlari} onSaqlandi={tahrirniTugatish} /> : activeTab === "Tovarlar" ? (
              <TovarlarTab
                sotuv={sotuv}
                qoldiqlar={qoldiqlar}
                amalBajarilmoqda={amalBajarilmoqda}
                onYangilash={onYangilash}
              />
          ) : activeTab === "Tarix" ? (
            <TarixTab sotuv={sotuv} />
          ) : (
            <UmumiyTab
              sotuv={sotuv}
              xodimlar={xodimlar}
              jami={jami}
              holat={holat}
              draft={draft}
              vaqt={vaqt}
              amalBajarilmoqda={amalBajarilmoqda}
              onTolovOchish={tolovniOchish}
              onSanaSaqlash={(kun) => onYangilash(sotuv.id, { date: kun })}
              onBekorQilish={onBekorQilish}
              onYetkazish={() => setYetkazishOchiq(true)}
              onOmbordanChiqarish={() => setOmbordanChiqarishOchiq(true)}
              onChiqarilganlarniKorish={() => setChiqarilganlarOchiq(true)}
              onMijozniTahrirlash={() => setTahrirRejimi(true)}
              hujjatlar={hujjatlar}
              onHujjatOchish={hujjatniOchish}
            />
          )}
        </div>

        {yetkazishOchiq && <YetkazishPanel sotuv={sotuv} jami={jami} onClose={() => setYetkazishOchiq(false)} />}
        {ombordanChiqarishOchiq && <OmbordanChiqarishPanel sotuv={sotuv} jami={jami} onClose={() => setOmbordanChiqarishOchiq(false)} onOzgarish={setTovarOzgarishlari} />}
        {chiqarilganlarOchiq && <OmbordanChiqqanlarOynasi sotuv={sotuv} onYopish={() => setChiqarilganlarOchiq(false)} />}
        {tolovModalOchiq && (
          <TolovQabulQilishModal
            sotuv={sotuv}
            jami={jami}
            draft={draft}
            amalBajarilmoqda={amalBajarilmoqda}
            onYangilash={onYangilash}
            onTolovQoshish={onTolovQoshish}
            onYopish={() => setTolovModalOchiq(false)}
          />
        )}
        {hujjatGeneratorOchiq && (
          <YukXatiGeneratorModal
            sotuv={sotuv}
            hujjatTuri={tanlanganHujjatTuri}
            onClose={() => setHujjatGeneratorOchiq(false)}
          />
        )}
        {chiqishSorovi && (
          <TasdiqlashOynasi
            ikonka={<TriangleAlert size={26} />}
            ohang="sariq"
            sarlavha={t("qoralamaTahrir.yopishTasdigi.sarlavha")}
            nom={sotuvJadvalId(sotuv)}
            tavsif={t("fullEdit.discardDescription")}
            ortgaMatni={t("qoralamaTahrir.yopishTasdigi.qolish")}
            tasdiqMatni={t(chiqishSorovi === "tahrir" ? "fullEdit.discardConfirm" : "qoralamaTahrir.yopishTasdigi.yopish")}
            jarayonMatni={t("qoralamaTahrir.yopishTasdigi.yopilmoqda")}
            onTasdiq={async () => { if (chiqishSorovi === "tahrir") tahrirniBekorQilibChiqish(); else onYopish(); }}
            onYopish={() => setChiqishSorovi(null)}
          />
        )}
      </section>
      </div>
    </AppModal>
  );
}

function ModalTezkorPanel({ sotuv, onYopish }: { sotuv: Sotuv; onYopish: () => void }) {
  const { t } = useTranslation("savdo_tafsilot");
  function havolaniNusxalash() {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}${window.location.pathname}?sotuv=${sotuv.id}`;
    void navigator.clipboard?.writeText(url);
  }

  function jsonYuklash() {
    if (typeof window === "undefined") return;
    const blob = new Blob([JSON.stringify(sotuv, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sotuv-${sotuvJadvalId(sotuv)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function alohidaOynadaOchish() {
    if (typeof window === "undefined") return;
    window.open(`${window.location.origin}${window.location.pathname}?sotuv=${sotuv.id}`, "_blank", "noopener,noreferrer");
  }

  const amallar = [
    { label: t("tezkorPanel.yopish"), icon: X, onClick: onYopish },
    { label: t("tezkorPanel.havolaNusxalash"), icon: Link, onClick: havolaniNusxalash },
    { label: t("tezkorPanel.malumotYuklab"), icon: Download, onClick: jsonYuklash },
    { label: t("tezkorPanel.alohidaOyna"), icon: ExternalLink, onClick: alohidaOynadaOchish },
  ];

  return (
    <div className="absolute -left-[52px] top-7 z-50 flex flex-col items-center gap-2">
      {amallar.map((amal, index) => {
        const Icon = amal.icon;
        const close = index === 0;
        return (
          <button
            key={amal.label}
            type="button"
            onClick={amal.onClick}
            title={amal.label}
            className={`flex h-11 w-11 items-center justify-center rounded-[15px] shadow-[0_10px_24px_rgba(15,23,42,.18)] ring-1 ring-white/70 transition duration-300 hover:-translate-x-0.5 hover:scale-105 active:scale-95 ${
              close
                ? "bg-[#2563EB] text-white hover:bg-[#1D4ED8] hover:shadow-[0_16px_34px_rgba(37,99,235,.36)]"
                : "bg-white text-[#2563EB] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
            }`}
            aria-label={amal.label}
          >
            <Icon size={close ? 19 : 17} strokeWidth={2.3} />
          </button>
        );
      })}
    </div>
  );
}

function YukXatiGeneratorModal({
  sotuv,
  hujjatTuri,
  onClose,
}: {
  sotuv: Sotuv;
  hujjatTuri: HujjatTuri;
  onClose: () => void;
}) {
  const { t } = useTranslation("savdo_tafsilot");
  const [tayyor, setTayyor] = useState(false);
  const hujjatRaqam = `${sotuvJadvalId(sotuv)}-${hujjatTuri === "Nakladnoy" ? "YX" : "HF"}`;
  const hujjatSarlavha = hujjatTuri === "Nakladnoy" ? "Nakladnoy" : "Hisob-faktura";
  const hujjatSarlavhaKorinishi = t(HUJJAT_MENU_LABEL_KEYS[hujjatSarlavha] ?? hujjatSarlavha);
  const mijoz = mijozNomi(sotuv);
  const jami = pulniFormatlash(sotuvSummasi(sotuv), sotuvValyutasi(sotuv));
  const mahsulotlar = sotuv.items ?? [];
  const yetkazuvchi = sotuv.warehouse?.name || "YePost";
  const yetkazuvchiManzil = sotuv.warehouse?.address || "Savdo tizimi";
  const xaridorTelefon = mijozTelefon(sotuv);
  const qisqaSana = (() => {
    const hujjatVaqti = sotuv.date ?? sotuv.createdAt;
    const sana = hujjatVaqti ? new Date(hujjatVaqti) : new Date();
    if (Number.isNaN(sana.getTime())) return sananiFormatlash(sotuv.date ?? sotuv.createdAt);
    return new Intl.DateTimeFormat("uz-UZ", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(sana);
  })();
  const tolovlar = sotuv.payments ?? [];
  const tolovBor = (tur: "CASH" | "CARD" | "BANK") => tolovlar.some((tolov) => tolov.paymentType === tur);

  useEffect(() => {
    const timer = window.setTimeout(() => setTayyor(true), 700);
    return () => window.clearTimeout(timer);
  }, []);

  function chopEtish() {
    if (typeof window === "undefined") return;
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1000,height=800");
    if (!printWindow) return;
    const rows = mahsulotlar
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${mahsulotNomi(item, t)}</td>
            <td>${t("common.dona")}</td>
            <td>${item.quantity}</td>
            <td>${pulniFormatlash(item.price, qatorValyutasi(item, sotuv))}</td>
            <td>${pulniFormatlash(mahsulotJami(item), qatorValyutasi(item, sotuv))}</td>
          </tr>
        `
      )
      .join("");

    printWindow?.document.write(`
      <html>
        <head>
          <title>${t("nakladnoy.printTitle", { raqam: hujjatRaqam })}</title>
          <style>
            body { font-family: "Times New Roman", Arial, sans-serif; color: #000; padding: 36px 46px; }
            h1 { margin: 0 0 18px; text-align: center; font-size: 24px; font-weight: 800; }
            table { width: 100%; border-collapse: collapse; }
            .info td { border: 1px solid #000; padding: 8px 10px; font-size: 15px; }
            .info .label { width: 190px; text-align: center; font-weight: 800; }
            .pay td { padding: 4px 10px; font-weight: 700; }
            .items { margin-top: 36px; }
            .items th, .items td { border: 1px solid #000; padding: 4px 8px; font-size: 14px; }
            .items th { text-align: center; font-weight: 800; }
            .items td:nth-child(1), .items td:nth-child(3), .items td:nth-child(4), .items td:nth-child(5), .items td:nth-child(6) { text-align: center; }
            .total-row td { border: 0; padding-top: 8px; font-weight: 800; }
            .signs { margin-top: 28px; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; font-size: 16px; }
            .line { display: inline-block; width: 260px; border-bottom: 1px solid #000; }
          </style>
        </head>
        <body>
          <h1>${t("nakladnoy.sarlavha", { raqam: hujjatRaqam, sana: qisqaSana })}</h1>
          <table class="info">
            <tr>
              <td class="label">${t("nakladnoy.yetkazuvchi")}</td>
              <td>${yetkazuvchi}, ${yetkazuvchiManzil}</td>
            </tr>
            <tr>
              <td class="label">${t("nakladnoy.xaridor")}</td>
              <td style="text-align:center;font-size:20px;font-weight:800;">${mijoz} ${t("nakladnoy.tel")} ${xaridorTelefon}</td>
            </tr>
            <tr class="pay">
              <td class="label">${t("nakladnoy.tolovTuri")}</td>
              <td>
                ${t("common.tolovTuri.naqd")} ${tolovBor("CASH") ? "✓" : "_____"} &nbsp;&nbsp;&nbsp;&nbsp;
                ${t("common.tolovTuri.karta")} ${tolovBor("CARD") ? "✓" : "_____"} &nbsp;&nbsp;&nbsp;&nbsp;
                ${t("common.tolovTuri.bank")} ${tolovBor("BANK") ? "✓" : "_____"}
              </td>
            </tr>
          </table>
          <table class="items">
            <thead><tr><th>${t("nakladnoy.jadval.raqam")}</th><th>${t("nakladnoy.jadval.nomi")}</th><th>${t("nakladnoy.jadval.birlik")}</th><th>${t("nakladnoy.jadval.miqdor")}</th><th>${t("nakladnoy.jadval.narx")}</th><th>${t("nakladnoy.jadval.summa")}</th></tr></thead>
            <tbody>${rows || `<tr><td colspan="6">${t("nakladnoy.mahsulotYoq")}</td></tr>`}</tbody>
            <tfoot>
              <tr class="total-row"><td colspan="5" style="text-align:right;">${t("nakladnoy.jami")}</td><td style="text-align:center;">${jami}</td></tr>
            </tfoot>
          </table>
          <div class="signs">
            <div>${t("nakladnoy.topshirdi")} <span class="line"></span></div>
            <div>${t("nakladnoy.oldi")} <span class="line"></span></div>
          </div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    printWindow?.document.close();
    return;

    printWindow?.document.write(`
      <html>
        <head>
          <title>Yuk xati ${hujjatRaqam}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #1f2937; padding: 32px; }
            h1 { margin: 0 0 8px; font-size: 28px; }
            .meta { color: #64748b; margin-bottom: 24px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
            .box { border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            th, td { border-bottom: 1px solid #e5e7eb; padding: 12px; text-align: left; }
            th { background: #EFF6FF; color: #1D4ED8; }
            .total { margin-top: 24px; text-align: right; font-size: 20px; font-weight: 800; }
          </style>
        </head>
        <body>
          <h1>Yuk xati</h1>
          <div class="meta">Hujjat raqami: ${hujjatRaqam} · Sana: ${sananiFormatlash(sotuv.date ?? sotuv.createdAt)}</div>
          <div class="grid">
            <div class="box"><b>Mijoz:</b><br/>${mijoz}</div>
            <div class="box"><b>Mas'ul:</b><br/>${masulNomi(sotuv)}</div>
            <div class="box"><b>Telefon:</b><br/>${mijozTelefon(sotuv)}</div>
            <div class="box"><b>Manzil:</b><br/>${mijozManzili(sotuv)}</div>
          </div>
          <table>
            <thead><tr><th>#</th><th>Mahsulot</th><th>Miqdor</th><th>Narx</th><th>Jami</th></tr></thead>
            <tbody>${rows || `<tr><td colspan="5">Mahsulotlar mavjud emas</td></tr>`}</tbody>
          </table>
          <div class="total">Umumiy summa: ${jami}</div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    printWindow?.document.close();
  }

  function pdfYuklash() {
    if (typeof window === "undefined") return;

    const pdfText = (value: string | number | null | undefined) =>
      String(value ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)")
        .replace(/[^\x20-\x7E]/g, "?");
    const commands: string[] = [];
    const text = (value: string, x: number, y: number, size = 10, font = "F1") => {
      commands.push(`BT /${font} ${size} Tf ${x} ${y} Td (${pdfText(value)}) Tj ET`);
    };
    const line = (x1: number, y1: number, x2: number, y2: number) => {
      commands.push(`${x1} ${y1} m ${x2} ${y2} l S`);
    };
    const rect = (x: number, y: number, width: number, height: number) => {
      commands.push(`${x} ${y} ${width} ${height} re S`);
    };

    text(`Chiqim nakladnoyi No ${hujjatRaqam} ot ${qisqaSana}`, 130, 790, 16, "F2");
    rect(45, 710, 505, 60);
    line(160, 710, 160, 770);
    line(45, 740, 550, 740);
    text("Yetkazuvchi", 70, 752, 10, "F2");
    text(`${yetkazuvchi}, ${yetkazuvchiManzil}`.slice(0, 70), 175, 752, 10);
    text("Xaridor", 78, 722, 10, "F2");
    text(`${mijoz} tel.: ${xaridorTelefon}`.slice(0, 70), 230, 722, 12, "F2");

    rect(45, 680, 505, 30);
    line(160, 680, 160, 710);
    text("To'lov turi", 72, 692, 10, "F2");
    text(`Naqd ${tolovBor("CASH") ? "X" : "_____"}     Karta ${tolovBor("CARD") ? "X" : "_____"}     Bank ${tolovBor("BANK") ? "X" : "_____"}`, 175, 692, 10, "F2");

    const tableTop = 625;
    const rowHeight = 24;
    const colX = [45, 75, 245, 300, 350, 430, 550];
    rect(45, tableTop, 505, rowHeight);
    ["No", "Nomi", "Birlik", "Miqdor", "Narx", "Summa"].forEach((label, index) => {
      text(label, colX[index] + 6, tableTop + 8, 9, "F2");
      if (index > 0) line(colX[index], tableTop, colX[index], tableTop + rowHeight);
    });

    let y = tableTop - rowHeight;
    const visibleItems = mahsulotlar.slice(0, 14);
    visibleItems.forEach((item, index) => {
      rect(45, y, 505, rowHeight);
      colX.slice(1, -1).forEach((x) => line(x, y, x, y + rowHeight));
      text(String(index + 1), 55, y + 8, 9, "F2");
      text(mahsulotNomi(item, t).slice(0, 26), 82, y + 8, 9);
      text("dona", 254, y + 8, 9);
      text(String(item.quantity), 310, y + 8, 9);
      text(pulniFormatlash(item.price, qatorValyutasi(item, sotuv)), 360, y + 8, 9);
      text(pulniFormatlash(mahsulotJami(item), qatorValyutasi(item, sotuv)), 438, y + 8, 9, "F2");
      y -= rowHeight;
    });
    if (visibleItems.length === 0) {
      rect(45, y, 505, rowHeight);
      text("Mahsulotlar mavjud emas", 220, y + 8, 9);
      y -= rowHeight;
    }

    text("Jami", 390, y + 6, 10, "F2");
    text(jami, 438, y + 6, 10, "F2");
    y -= 45;
    text("Topshirdi", 55, y, 11);
    line(125, y - 2, 275, y - 2);
    text("Oldi", 315, y, 11);
    line(360, y - 2, 520, y - 2);

    const stream = `q\n1 w\n${commands.join("\n")}\nQ`;
    const encoder = new TextEncoder();
    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
      `<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream`,
    ];
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets.push(encoder.encode(pdf).length);
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xrefOffset = encoder.encode(pdf).length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    const blob = new Blob([pdf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${hujjatTuri === "Nakladnoy" ? "nakladnoy" : "hisob-faktura"}-${hujjatRaqam}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app-modal-compact fixed inset-0 z-[140] flex items-start justify-end bg-slate-950/45 px-5 py-5 pl-[380px] backdrop-blur-sm">
      <div className="relative h-[calc(100vh-40px)] w-full max-w-[1120px] overflow-visible rounded-[32px] bg-[#EEF3F6] shadow-[0_30px_90px_rgba(15,23,42,.34)]">
        <div className="absolute -left-[58px] top-4 z-20 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2563EB] text-white shadow-[0_12px_28px_rgba(37,99,235,.35)] ring-1 ring-white/60 transition duration-200 hover:-translate-y-0.5 hover:bg-[#1D4ED8]"
            aria-label={t("nakladnoy.oynaniYopish")}
            title={t("tezkorPanel.yopish")}
          >
            <X size={19} />
          </button>
          <button
            type="button"
            onClick={chopEtish}
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-[#2563EB] shadow-[0_10px_24px_rgba(15,23,42,.16)] ring-1 ring-orange-100 transition duration-200 hover:-translate-y-0.5 hover:bg-[#EFF6FF]"
            aria-label={t("nakladnoy.chopEtishTitle")}
            title={t("nakladnoy.chopEtish")}
          >
            <Printer size={17} />
          </button>
          <button
            type="button"
            onClick={pdfYuklash}
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-[#2563EB] shadow-[0_10px_24px_rgba(15,23,42,.16)] ring-1 ring-orange-100 transition duration-200 hover:-translate-y-0.5 hover:bg-[#EFF6FF]"
            aria-label={t("nakladnoy.pdfYuklabTitle")}
            title={t("nakladnoy.pdfYuklab")}
          >
            <Download size={17} />
          </button>
        </div>

        <div className="scrollbar-hidden h-full overflow-y-auto px-6 py-5">
          <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900">{hujjatSarlavhaKorinishi} {hujjatRaqam}</h2>
              <p className="mt-1 text-[13px] text-slate-500">{t("nakladnoy.generatorTavsif")}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={chopEtish} type="button" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3.5 text-[13px] font-bold text-slate-600 shadow-sm transition hover:text-orange-600">
                <Printer size={16} />
                {t("nakladnoy.chopEtish")}
              </button>
              <button onClick={pdfYuklash} type="button" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3.5 text-[13px] font-bold text-slate-600 shadow-sm transition hover:text-blue-600">
                {t("nakladnoy.pdfYuklab")} <ChevronDown size={15} />
              </button>
            </div>
          </header>

          <div>
            <section className="flex min-h-[590px] items-center justify-center rounded-[26px] bg-white p-6 shadow-sm">
              {!tayyor ? (
                <div className="text-center">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-sky-50 text-sky-500">
                    <FileText size={48} />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-slate-900">{t("nakladnoy.yaratilmoqdaSarlavha")}</h3>
                  <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500">
                    {t("nakladnoy.yaratilmoqdaTavsif")}
                  </p>
                  <div className="mx-auto mt-6 h-2 w-60 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full w-2/3 animate-pulse rounded-full bg-sky-400" />
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-3xl rounded-2xl border border-slate-100 bg-white p-6 font-serif text-slate-950 shadow-[0_16px_45px_rgba(15,23,42,.07)]">
                  <h3 className="text-center text-[22px] font-black">{t("nakladnoy.sarlavha", { raqam: hujjatRaqam, sana: qisqaSana })}</h3>

                  <div className="mt-5 overflow-hidden border border-slate-950">
                    <div className="grid grid-cols-[150px_1fr] border-b border-slate-950">
                      <div className="flex items-center justify-center border-r border-slate-950 px-3 py-2 text-sm font-black">{t("nakladnoy.yetkazuvchi")}</div>
                      <div className="px-3 py-2 text-center text-sm leading-5">
                        <b>{yetkazuvchi}</b>, {yetkazuvchiManzil}
                      </div>
                    </div>
                    <div className="grid grid-cols-[150px_1fr] border-b border-slate-950">
                      <div className="flex items-center justify-center border-r border-slate-950 px-3 py-3 text-sm font-black">{t("nakladnoy.xaridor")}</div>
                      <div className="px-3 py-3 text-center text-lg font-black">
                        {mijoz} <span className="font-semibold">{t("nakladnoy.tel")} {xaridorTelefon}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-[150px_1fr]">
                      <div className="flex items-center justify-center border-r border-slate-950 px-3 py-2 text-sm font-black">{t("nakladnoy.tolovTuri")}</div>
                      <div className="flex flex-wrap items-center justify-around gap-3 px-3 py-2 text-sm font-bold">
                        <span>{t("common.tolovTuri.naqd")} {tolovBor("CASH") ? "✓" : "_____"}</span>
                        <span>{t("common.tolovTuri.karta")} {tolovBor("CARD") ? "✓" : "_____"}</span>
                        <span>{t("common.tolovTuri.bank")} {tolovBor("BANK") ? "✓" : "_____"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-7 overflow-hidden border border-slate-950">
                    <table className="w-full border-collapse text-left text-[13px]">
                      <thead>
                        <tr>
                          <th className="border-r border-slate-950 px-3 py-2 text-center">{t("nakladnoy.jadval.raqam")}</th>
                          <th className="border-r border-slate-950 px-3 py-2 text-center">{t("nakladnoy.jadval.nomi")}</th>
                          <th className="border-r border-slate-950 px-3 py-2 text-center">{t("nakladnoy.jadval.birlik")}</th>
                          <th className="border-r border-slate-950 px-3 py-2 text-center">{t("nakladnoy.jadval.miqdor")}</th>
                          <th className="border-r border-slate-950 px-3 py-2 text-center">{t("nakladnoy.jadval.narx")}</th>
                          <th className="px-3 py-2 text-center">{t("nakladnoy.jadval.summa")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mahsulotlar.map((item, index) => (
                          <tr key={item.id ?? `${item.modificationId}-${index}`}>
                            <td className="border-t border-r border-slate-950 px-3 py-1.5 text-center font-bold">{index + 1}</td>
                            <td className="border-t border-r border-slate-950 px-3 py-1.5 font-semibold">{mahsulotNomi(item, t)}</td>
                            <td className="border-t border-r border-slate-950 px-3 py-1.5 text-center">{t("common.dona")}</td>
                            <td className="border-t border-r border-slate-950 px-3 py-1.5 text-center">{item.quantity}</td>
                            <td className="border-t border-r border-slate-950 px-3 py-1.5 text-center">{pulniFormatlash(item.price, qatorValyutasi(item, sotuv))}</td>
                            <td className="border-t border-slate-950 px-3 py-1.5 text-center font-bold">{pulniFormatlash(mahsulotJami(item), qatorValyutasi(item, sotuv))}</td>
                          </tr>
                        ))}
                        {mahsulotlar.length === 0 && (
                          <tr>
                            <td className="border-t border-slate-950 px-3 py-5 text-center text-slate-500" colSpan={6}>
                              {t("nakladnoy.mahsulotYoq")}
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={5} className="border-t border-r border-slate-950 px-3 py-2 text-right font-black">
                            {t("nakladnoy.jami")}
                          </td>
                          <td className="border-t border-slate-950 px-3 py-2 text-center font-black">{jami}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="mt-7 grid grid-cols-2 gap-8 text-base">
                    <div className="flex items-end gap-3">
                      <span>{t("nakladnoy.topshirdi")}</span>
                      <span className="h-px flex-1 bg-slate-950" />
                    </div>
                    <div className="flex items-end gap-3">
                      <span>{t("nakladnoy.oldi")}</span>
                      <span className="h-px flex-1 bg-slate-950" />
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function UmumiyTab({
  sotuv,
  xodimlar,
  jami,
  holat,
  draft,
  vaqt,
  amalBajarilmoqda,
  onTolovOchish,
  onSanaSaqlash,
  onBekorQilish,
  onYetkazish,
  onOmbordanChiqarish,
  onChiqarilganlarniKorish,
  onMijozniTahrirlash,
  hujjatlar,
  onHujjatOchish,
}: {
  sotuv: Sotuv;
  xodimlar: XodimTanlovi[];
  jami: number;
  holat: ReturnType<typeof sotuvHolati>;
  draft: boolean;
  vaqt: string;
  amalBajarilmoqda: boolean;
  // Qoralama sotuv sanasini o'zgartirish (PATCH { date }).
  onSanaSaqlash: (kun: string) => Promise<boolean>;
  onTolovOchish: () => void;
  onBekorQilish: (sotuvId: string) => void;
  onYetkazish: () => void;
  onOmbordanChiqarish: () => void;
  onChiqarilganlarniKorish: () => void;
  onMijozniTahrirlash: () => void;
  hujjatlar: SaqlanganHujjat[];
  onHujjatOchish: (hujjat: SaqlanganHujjat) => void;
}) {
  const { t } = useTranslation("savdo_tafsilot");
  const [saqlanganFaoliyatlar, setSaqlanganFaoliyatlar] = useState<SaqlanganFaoliyat[]>([]);
  const [crmYuklanmoqda, setCrmYuklanmoqda] = useState(false);
  const [crmXatolik, setCrmXatolik] = useState("");
  const customerId = mijozIdOlish(sotuv);
  const [partnerId, setPartnerId] = useState(sotuv.customer?.partner?.id ?? sotuv.clientCompany?.partner?.id ?? "");

  useEffect(() => {
    let active = true;
    const request = customerId
      ? mijozlarApi.olish(customerId)
      : sotuv.clientCompanyId
        ? mijozKompaniyalariApi.olish(sotuv.clientCompanyId)
        : null;
    if (!request) {
      setPartnerId("");
      return () => { active = false; };
    }
    request
      .then((entity) => { if (active) setPartnerId(entity.partner?.id ?? ""); })
      .catch((error) => { if (active) setCrmXatolik(getApiErrorMessage(error)); });
    return () => { active = false; };
  }, [customerId, sotuv.clientCompanyId]);

  useEffect(() => {
    let active = true;

    async function yuklash() {
      setCrmXatolik("");
      if (!partnerId) {
        setSaqlanganFaoliyatlar([]);
        if (!customerId && !sotuv.clientCompanyId) setCrmXatolik(t("umumiyTab.errors.mijozBiriktirilmagan"));
        return;
      }

      setCrmYuklanmoqda(true);
      try {
        const [activities, comments, messages] = await Promise.all([
          crmApi.activities({ partnerId }),
          crmApi.partnerComments(partnerId, { limit: 50 }),
          crmApi.partnerChatTarixi(partnerId, { limit: 50 }),
        ]);
        if (!active) return;
        setSaqlanganFaoliyatlar([
          ...activities.map((activity) => crmActivityniFaoliyatga(activity, t)),
          ...royxatniAjratish(comments).map((comment) => crmCommentniFaoliyatga(comment, t)),
          ...royxatniAjratish(messages).map((message) => crmXabarniFaoliyatga(message, t)),
        ]);
      } catch (error) {
        if (!active) return;
        setCrmXatolik(getApiErrorMessage(error));
        setSaqlanganFaoliyatlar([]);
      } finally {
        if (active) setCrmYuklanmoqda(false);
      }
    }

    void yuklash();
    return () => {
      active = false;
    };
  }, [customerId, partnerId, sotuv.clientCompanyId, sotuv.id, t]);

  async function faoliyatniYangilash(id: string, malumot: Partial<SaqlanganFaoliyat>) {
    try {
      const joriyFaoliyat = saqlanganFaoliyatlar.find((faoliyat) => faoliyat.id === id);
      if (partnerId && joriyFaoliyat?.turi === "Izoh" && malumot.matn !== undefined) {
        const comment = await crmApi.commentYangilash(id, malumot.matn);
        setSaqlanganFaoliyatlar((joriy) =>
          joriy.map((faoliyat) => (faoliyat.id === id ? crmCommentniFaoliyatga(comment, t) : faoliyat))
        );
        return;
      }

      if (partnerId && joriyFaoliyat?.turi !== "Izoh") {
        const data: Record<string, string> = {};
        if (malumot.sarlavha !== undefined) data.subject = malumot.sarlavha;
        if (malumot.matn !== undefined) data.description = malumot.matn;
        if (malumot.sana !== undefined) data.dueAt = malumot.sana;
        if (malumot.completed !== undefined) {
          const activity = malumot.completed
            ? await crmApi.activityYakunlash(id)
            : await crmApi.activityYangilash(id, { dueAt: joriyFaoliyat?.sana });
          setSaqlanganFaoliyatlar((joriy) =>
            joriy.map((faoliyat) => (faoliyat.id === id ? crmActivityniFaoliyatga(activity, t) : faoliyat))
          );
          return;
        }
        const activity = await crmApi.activityYangilash(id, data);
        setSaqlanganFaoliyatlar((joriy) =>
          joriy.map((faoliyat) => (faoliyat.id === id ? crmActivityniFaoliyatga(activity, t) : faoliyat))
        );
        return;
      }

      setCrmXatolik(t("umumiyTab.errors.tahrirEndpointYoq"));
    } catch (error) {
      setCrmXatolik(getApiErrorMessage(error));
    }
  }

  async function faoliyatniOchirish(id: string) {
    try {
      const joriyFaoliyat = saqlanganFaoliyatlar.find((faoliyat) => faoliyat.id === id);
      if (joriyFaoliyat?.turi === "Xabar") {
        setCrmXatolik(t("umumiyTab.errors.xabarniOchirishYoq"));
        return;
      }
      if (partnerId && joriyFaoliyat?.turi === "Izoh") {
        await crmApi.commentOchirish(id);
      } else if (partnerId && joriyFaoliyat && !id.startsWith("chat-")) {
        await crmApi.activityOchirish(id);
      }
      setSaqlanganFaoliyatlar((joriy) => joriy.filter((faoliyat) => faoliyat.id !== id));
    } catch (error) {
      setCrmXatolik(getApiErrorMessage(error));
    }
  }

  async function faoliyatniZakrepitQilish(faoliyat: SaqlanganFaoliyat) {
    try {
      if (partnerId && faoliyat.turi === "Izoh") {
        const comment = faoliyat.pinned
          ? await crmApi.commentUnpin(faoliyat.id)
          : await crmApi.commentPin(faoliyat.id);
        setSaqlanganFaoliyatlar((joriy) =>
          joriy.map((item) => (item.id === faoliyat.id ? crmCommentniFaoliyatga(comment, t) : item))
        );
        return;
      }
      await faoliyatniYangilash(faoliyat.id, { pinned: !faoliyat.pinned });
    } catch (error) {
      setCrmXatolik(getApiErrorMessage(error));
    }
  }

  function faoliyatIkonkasi(turi: string) {
    switch (turi) {
      case "Izoh":
        return <MessageSquare size={18} />;
      case "Xabar":
        return <Send size={18} />;
      case "Vazifa":
        return <ClipboardCheck size={18} />;
      default:
        return <CalendarCheck size={18} />;
    }
  }

  // faoliyat.turi qiymati ("Ish"/"Izoh"/"Xabar"/"Vazifa") state va taqqoslashlarda
  // ishlatilgani uchun o'zi o'zgarmaydi — bu faqat ekranda ko'rsatish uchun tarjima.
  function faoliyatTuriKorinishi(turi: string) {
    switch (turi) {
      case "Ish":
        return t("common.faoliyatTuri.ish");
      case "Izoh":
        return t("common.faoliyatTuri.izoh");
      case "Xabar":
        return t("common.faoliyatTuri.xabar");
      case "Vazifa":
        return t("common.faoliyatTuri.vazifa");
      default:
        return turi;
    }
  }

  return (
    <>
    <div className="px-4 pt-5 sm:px-7 sm:pt-7">
      <SotuvJarayoni
        sotuv={sotuv}
        jami={jami}
        holat={holat}
        amalBajarilmoqda={amalBajarilmoqda}
        onTolovOchish={onTolovOchish}
        onOmbordanChiqarish={onOmbordanChiqarish}
        onChiqarilganlarniKorish={onChiqarilganlarniKorish}
      />
    </div>
    <div className="grid gap-5 px-4 pb-6 pt-5 sm:gap-6 sm:px-7 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <aside className="space-y-6">
        <KelishuvCard
          sotuv={sotuv}
          jami={jami}
          holat={holat}
          draft={draft}
          amalBajarilmoqda={amalBajarilmoqda}
          onTolovOchish={onTolovOchish}
          onBekorQilish={onBekorQilish}
          onYetkazish={onYetkazish}
          onOmbordanChiqarish={onOmbordanChiqarish}
          onChiqarilganlarniKorish={onChiqarilganlarniKorish}
          onMijozniTahrirlash={onMijozniTahrirlash}
        />

        <QoshimchaMalumotCard sotuv={sotuv} draft={draft} onSanaSaqlash={onSanaSaqlash} />

        <TelegramXabarnomaKarti sotuv={sotuv} />
      </aside>

        <main className="space-y-6">
          {crmXatolik && (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
              {crmXatolik}
            </div>
          )}
        <Divider label={t("umumiyTab.feed.bugun")} />
        {crmYuklanmoqda && (
          <div className="flex h-24 items-center justify-center rounded-2xl bg-white/92 shadow-[0_18px_46px_rgba(37,99,235,.08)]">
            <LoaderCircle className="animate-spin text-orange-500" size={24} />
          </div>
        )}
        <ol className="relative space-y-4 before:absolute before:bottom-6 before:left-5 before:top-6 before:w-px before:bg-orange-200">
          {hujjatlar.map((hujjat) => (
            <TimelineElement key={hujjat.id} icon={<FileText size={18} />} ohang="kok">
              <HujjatFeedCard hujjat={hujjat} sotuv={sotuv} onOchish={() => onHujjatOchish(hujjat)} />
            </TimelineElement>
          ))}
          {[...saqlanganFaoliyatlar]
            .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)))
            .map((faoliyat) =>
              faoliyat.harakat === "Kalendariga qo'shish" || faoliyat.matn.includes("Kalendariga qo'shish") ? (
                <TimelineElement key={faoliyat.id} icon={<CalendarDays size={18} />} ohang="sariq">
                  <CalendarFeedCard
                    faoliyat={faoliyat}
                    xodimlar={xodimlar}
                    onOchirish={faoliyatniOchirish}
                    onYangilash={faoliyatniYangilash}
                    onZakrepit={() => void faoliyatniZakrepitQilish(faoliyat)}
                  />
                </TimelineElement>
              ) : (
                <TimelineElement key={faoliyat.id} icon={faoliyatIkonkasi(faoliyat.turi)} ohang={faoliyat.turi === "Vazifa" ? "yashil" : "kok"}>
                  <FeedCard
                    title={faoliyatTuriKorinishi(faoliyat.turi)}
                    time={qisqaVaqt(faoliyat.sana)}
                    text={`${faoliyat.sarlavha}${faoliyat.matn ? ` — ${faoliyat.matn}` : ""}`}
                    onOchirish={faoliyat.turi === "Xabar" ? undefined : () => faoliyatniOchirish(faoliyat.id)}
                  />
                </TimelineElement>
              )
            )}
          {holat === "CONFIRMED" && (
            <TimelineElement icon={<Package size={18} />} ohang="yashil">
              <OmbordanChiqarishHujjatFeedCard
                sotuv={sotuv}
                vaqt={qisqaVaqt(sotuv.confirmedAt) || vaqt}
                onOchish={onOmbordanChiqarish}
                onChiqarilganlar={onChiqarilganlarniKorish}
              />
            </TimelineElement>
          )}
          <TimelineElement icon={<Calculator size={18} />} ohang="kulrang">
            <FeedCard title={t("umumiyTab.feed.hisoblashRejimi")} time={vaqt} text={t("umumiyTab.feed.hisoblashRejimiTavsif", { summa: pulniFormatlash(jami, sotuvValyutasi(sotuv)) })} />
          </TimelineElement>
          <TimelineElement icon={<ShoppingCart size={18} />} ohang="kok">
            <FeedCard title={t("umumiyTab.feed.sotuvYaratildi")} time={vaqt} text={t("umumiyTab.feed.sotuvYaratildiTavsif", { mijoz: mijozNomi(sotuv), raqam: sotuvRaqami(sotuv) })} />
          </TimelineElement>
        </ol>
      </main>
    </div>
    </>
  );
}

function KelishuvCard({
  sotuv,
  jami,
  holat,
  draft,
  amalBajarilmoqda,
  onTolovOchish,
  onBekorQilish,
  onYetkazish,
  onOmbordanChiqarish,
  onChiqarilganlarniKorish,
  onMijozniTahrirlash,
}: {
  sotuv: Sotuv;
  jami: number;
  holat: ReturnType<typeof sotuvHolati>;
  draft: boolean;
  amalBajarilmoqda: boolean;
  onTolovOchish: () => void;
  onBekorQilish: (sotuvId: string) => void;
  onYetkazish: () => void;
  onOmbordanChiqarish: () => void;
  onChiqarilganlarniKorish: () => void;
  onMijozniTahrirlash: () => void;
}) {
  const bekorMumkin = useHujjatniBekorQilishMumkinmi("savdo");
  const { t } = useTranslation("savdo_tafsilot");
  const [menuOpen, setMenuOpen] = useState(false);
  const [tanlanganBolim, setTanlanganBolim] = useState("To'lov va yetkazish");
  const tolanganSumma = sotuvTolanganSummasi(sotuv);
  const qarzdorlikSumma = sotuvQarzdorlikSummasi(sotuv);
  const ortiqchaTolovSumma = sotuvOrtiqchaTolovSummasi(sotuv);
  // Mijozga berilgan qaytim (so'mda) va hisobga o'tgan pul: to'lov qatorlarining `changeAmount` / `keptAmount` maydonlaridan.
  const berilganQaytim = tolovlarQaytimi(sotuv.payments);
  function bolimniTanlash(bolim: string) {
    setTanlanganBolim(bolim);
    setMenuOpen(false);
    if (bolim === "Yetkazish" || bolim === "To'lov va yetkazish") onYetkazish();
    if (bolim === "Ombordan chiqarish") onOmbordanChiqarish();
    if (bolim === "To'lov") onTolovOchish();
  }

  const tolanganFoiz = jami > 0 ? Math.min(100, Math.round((tolanganSumma / jami) * 100)) : 0;
  const telefon = mijozTelefon(sotuv);
  const holatStili =
    holat === "CONFIRMED"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : holat === "CANCELLED"
        ? "bg-red-50 text-red-600 ring-red-100"
        : "bg-amber-50 text-amber-700 ring-amber-100";

  return (
    <section className="rounded-[24px] border border-orange-100/80 bg-white/92 p-5 shadow-[0_18px_46px_rgba(37,99,235,.08)] backdrop-blur">
      <CardTitle title={t("kelishuvCard.sarlavha")} action={t("common.ozgartirish")} />

      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{t("kelishuvCard.miqdorVaValyuta")}</p>
          <h2 className="mt-1 text-4xl font-light tracking-wide text-slate-700">{pulniFormatlash(jami, sotuvValyutasi(sotuv))}</h2>
        </div>
        <span className={`rounded-full px-3.5 py-1.5 text-xs font-bold ring-1 ${holatStili}`}>{sotuvHolatiMatni[holat]}</span>
      </div>

      <div className="mt-5 rounded-2xl border border-orange-100 bg-gradient-to-br from-[#F8FAFC] to-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#2563EB] shadow-sm ring-1 ring-orange-100">
              <Wallet size={19} />
            </span>
            <div className="min-w-0">
              <h3 className="font-black text-slate-800">{t(BOLIM_LABEL_KEYS[tanlanganBolim] ?? tanlanganBolim)}</h3>
              <p className="mt-0.5 text-xs leading-5 text-slate-400">{t("kelishuvCard.bolimTavsif")}</p>
            </div>
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2563EB] px-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(37,99,235,.22)] transition hover:-translate-y-0.5 hover:bg-[#1D4ED8]"
            >
              <Plus size={16} />
              {t("common.qoshish")}
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-12 z-40 w-[238px] rounded-[22px] bg-white py-3 shadow-[0_18px_50px_rgba(15,23,42,.16)] ring-1 ring-orange-100">
                {bolimlar.map((bolim) => {
                  const faol = faolBolimlar.has(bolim);
                  return (
                    <button
                      key={bolim}
                      type="button"
                      disabled={!faol}
                      onClick={() => bolimniTanlash(bolim)}
                      title={faol ? undefined : t("common.tezOradaQoshiladi")}
                      className={`flex h-11 w-full items-center gap-3 px-5 text-left text-[15px] transition ${
                        faol
                          ? "text-slate-700 hover:bg-orange-50 hover:text-[#2563EB]"
                          : "cursor-not-allowed text-slate-300"
                      }`}
                    >
                      {bolim === "Ombordan chiqarish" && (
                        <Package size={15} className={faol ? "text-sky-500" : "text-slate-300"} />
                      )}
                      <span className="flex-1">{t(BOLIM_LABEL_KEYS[bolim] ?? bolim)}</span>
                      {!faol && (
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-400">
                          {t("common.tezOrada")}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2">
          <Korsatkich label={t("kelishuvCard.sotuvJami")} value={pulniFormatlash(jami, sotuvValyutasi(sotuv))} />
          <Korsatkich label={t("kelishuvCard.qabulQilingan")} value={pulniFormatlash(tolanganSumma, sotuvValyutasi(sotuv))} ohang="kok" />
          <Korsatkich
            label={qarzdorlikSumma > 0 ? t("kelishuvCard.qarzdorlikQoldigi") : t("kelishuvCard.qarzdorlikYoq")}
            value={pulniFormatlash(qarzdorlikSumma, sotuvValyutasi(sotuv))}
            ohang={qarzdorlikSumma > 0 ? "qizil" : "yashil"}
          />
        </div>

        {jami > 0 && (
          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-slate-400">{t("kelishuvCard.tolovHolati")}</span>
              <span className="font-bold text-slate-600">{t("kelishuvCard.tolanganFoiz", { foiz: tolanganFoiz })}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={tolanganFoiz}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${qarzdorlikSumma > 0 ? "bg-[#2563EB]" : "bg-emerald-500"}`}
                style={{ width: `${tolanganFoiz}%` }}
              />
            </div>
          </div>
        )}

        {ortiqchaTolovSumma > 0 && berilganQaytim.qaytim <= 0 && berilganQaytim.hisobga <= 0 && (
          <div className="mt-3 flex justify-between rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <span>{t("kelishuvCard.ortiqchaTolov")}</span>
            <span className="font-bold">{pulniFormatlash(ortiqchaTolovSumma, sotuvValyutasi(sotuv))}</span>
          </div>
        )}

        {berilganQaytim.qaytim > 0 && (
          <div className="mt-3 flex justify-between rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            <span>{t("kelishuvCard.qaytimBerilgan")}</span>
            <span className="font-bold">{somMatni(berilganQaytim.qaytim, t("tolovModal.somBelgisi"))}</span>
          </div>
        )}

        {Number(sotuv.excessToBalance ?? 0) <= 0 && berilganQaytim.hisobga > 0 && (
          <div className="mt-3 flex justify-between rounded-xl bg-sky-50 px-3 py-2 text-xs text-sky-700">
            <span>{t("kelishuvCard.hisobgaYozilgan")}</span>
            <span className="font-bold">{pulniFormatlash(berilganQaytim.hisobga, sotuvValyutasi(sotuv))}</span>
          </div>
        )}

        {Number(sotuv.excessToBalance ?? 0) > 0 && (
          <div className="mt-3 flex justify-between rounded-xl bg-sky-50 px-3 py-2 text-xs text-sky-700">
            <span>{t("kelishuvCard.hisobgaYozilgan")}</span>
            <span className="font-bold">{pulniFormatlash(Number(sotuv.excessToBalance), sotuvValyutasi(sotuv))}</span>
          </div>
        )}

        {Number(sotuv.excessToDebt ?? 0) > 0 && (
          <div className="mt-3 flex justify-between rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            <span>{t("kelishuvCard.qarzgaKetgan")}</span>
            <span className="font-bold">{pulniFormatlash(Number(sotuv.excessToDebt), sotuvValyutasi(sotuv))}</span>
          </div>
        )}

        <SotuvTolovlari sotuv={sotuv} mijoz={modalMijozNomi(sotuv)} />

        <SotuvOmbordanChiqarishQatori sotuv={sotuv} onOchish={onChiqarilganlarniKorish} />
      </div>

      {draft && (
        <div className="mt-5 flex items-center justify-between gap-3">
          <h3 className="text-xs font-black uppercase tracking-wide text-slate-600">{t("kelishuvCard.mijozMalumotlari")}</h3>
          <button
            type="button"
            onClick={onMijozniTahrirlash}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-50 px-3 text-xs font-black text-[#2563EB] transition hover:bg-blue-100"
          >
            <PenLine size={13} />
            {t("kelishuvCard.mijozniTahrirlash")}
          </button>
        </div>
      )}
      <div className={`${draft ? "mt-3" : "mt-5"} divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white`}>
        <KontaktQatori icon={<UserRound size={17} />} label={t("common.info.mijoz")} value={modalMijozNomi(sotuv)} />
        <KontaktQatori
          icon={<Phone size={17} />}
          label={t("common.info.telefon")}
          value={telefon}
          href={`tel:${telefon.replace(/[^\d+]/g, "")}`}
        />
        <KontaktQatori icon={<MapPin size={17} />} label={t("common.info.manzil")} value={mijozManzili(sotuv)} />
        <KontaktQatori icon={<UserCheck size={17} />} label={t("common.info.masulShaxs")} value={masulNomi(sotuv)} />
      </div>

      <div className="mt-5 flex flex-wrap justify-between gap-3 text-xs text-slate-500">
        <span>{t("kelishuvCard.maydonniTanlang")}</span>
        <span>{t("kelishuvCard.maydonYarating")}</span>
        {draft && bekorMumkin && (
          <button disabled={amalBajarilmoqda} onClick={() => onBekorQilish(sotuv.id)} className="text-red-500 disabled:opacity-50">
            {t("kelishuvCard.sotuvniBekorQilish")}
          </button>
        )}
      </div>
    </section>
  );
}

// Saqlashni kutayotgan to'lov (bir sotuvga bir nechta to'lov: masalan, bir qismi dollarda, qolgani so'mda).
type YangiTolovQatori = { paymentType: TolovTuri; amount: number; currency: Valyuta; date: string; note: string };

function TolovQabulQilishModal({
  sotuv,
  jami,
  draft,
  amalBajarilmoqda,
  onYangilash,
  onTolovQoshish,
  onYopish,
}: {
  sotuv: Sotuv;
  jami: number;
  draft: boolean;
  amalBajarilmoqda: boolean;
  onYangilash: (
    sotuvId: string,
    malumot: Partial<SotuvYaratishMalumoti>
  ) => Promise<boolean>;
  onTolovQoshish: (
    sotuvId: string,
    tolov: TolovQoshishMalumoti
  ) => Promise<TolovNatijasi | null>;
  onYopish: () => void;
}) {
  const { t } = useTranslation("savdo_tafsilot");
  const mavjudTolovlar = sotuv.payments ?? [];
  const mavjudYigindisi = mavjudTolovlar.reduce((jami2, tolov) => jami2 + tolovSotuvValyutasida(tolov, sotuv), 0);

  // Valyuta rejimi yoqilgan va bugungi kurs bor bo'lsa to'lovni sotuvdan boshqa valyutada (so'm/dollar) qabul qilish mumkin:
  // backend uni bugungi kurs bilan sotuv valyutasiga o'giradi.
  const rejimYoniq = useValyutaStore((holat) => holat.rejimYoniq);
  const kursBor = useValyutaStore((holat) => holat.kursBor);
  const kurs = useValyutaStore((holat) => holat.kurs);
  const sotuvVal = sotuvValyutasi(sotuv);
  const valyutaTanlashMumkin = rejimYoniq && kursBor && kurs > 0;

  // Mijoz hisobi (oldindan to'langan pul): faqat mijozli sotuvda, to'lov hisob valyutasida (valyuta rejimida dollar) yechiladi.
  const mijozId = mijozIdOlish(sotuv);
  const [hisobManbasi, setHisobManbasi] = useState<{ balance?: number | string | null; balanceCurrency?: string | null } | null>(
    sotuv.customer ? { balance: sotuv.customer.balance, balanceCurrency: sotuv.customer.balanceCurrency } : null
  );
  useEffect(() => {
    if (!mijozId) return;
    let faol = true;
    mijozlarApi
      .olish(mijozId, true)
      .then((mijoz) => {
        if (faol) setHisobManbasi(mijoz);
      })
      .catch(() => undefined);
    return () => {
      faol = false;
    };
  }, [mijozId]);
  const hisob = mijozHisobi(hisobManbasi);
  // Dollar hisobni so'mlik sotuvga (yoki aksincha) o'girish uchun bugungi kurs kerak.
  const balansTuriMumkin = Boolean(mijozId) && hisob.miqdor > 0 && (hisob.valyuta === sotuvVal || valyutaTanlashMumkin);
  const tolovTuriOptions: Array<{ value: TolovTuri; label: string }> = [
    { value: "CASH", label: t("common.tolovTuri.naqd") },
    { value: "CARD", label: t("common.tolovTuri.karta") },
    { value: "BANK", label: t("common.tolovTuri.bank") },
    ...(balansTuriMumkin
      ? [{ value: "BALANCE" as const, label: t("tolovModal.hisobdanTolov", { summa: pulniFormatlash(hisob.miqdor, hisob.valyuta) }) }]
      : []),
  ];

  const [tolovTuri, setTolovTuri] = useState<TolovTuri>("CASH");
  const [tolovVal, setTolovVal] = useState<Valyuta>(sotuvVal);
  const [summa, setSumma] = useState("0");
  // To'lov sanasi (qachon berilgani; kun, Toshkent) va izoh. Bugun/bo'sh bo'lsa so'rovga qo'shilmaydi — backend hozirgi vaqtni oladi.
  const [tolovKuni, setTolovKuni] = useState(() => bugungiToshkentKuni());
  const [izoh, setIzoh] = useState("");
  const yopilganKun = useDavrStore((holat) => holat.holat?.closedUntil ?? null);
  const [xatolik, setXatolik] = useState("");
  // Bir nechta to'lov: shakldagi to'lov "Yana to'lov qo'shish" bilan ro'yxatga o'tadi; saqlashda ro'yxat va
  // shakldagi summa (bo'lsa) birga yuboriladi.
  const [qatorlar, setQatorlar] = useState<YangiTolovQatori[]>([]);
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  // Qarzdan ortiq pul: qaytim yoki mijoz hisobiga yozish (backend `keepExcess`). Qoralamadagi mijozli sotuvda va tasdiqlangan sotuvga keyingi naqd to'lovda.
  const [ortiqchaniHisobga, setOrtiqchaniHisobga] = useState(false);
  // Tasdiqlangan sotuvda dollar qatnashganda qaytim mingtagacha yaxlitlanadi (backend `roundChange`, standart yoqilgan).
  const [qaytimYaxlitlash, setQaytimYaxlitlash] = useState(true);
  // Saqlangan to'lovlarning natijasi (mijozga qaytim, hisobga o'tgan pul): hammasi saqlangach natija oynasi ko'rsatiladi,
  // bir qismi saqlanib keyingisi xato bersa — qaytim eslatmasi forma ichida turadi.
  const [natija, setNatija] = useState<TolovNatijasi | null>(null);
  const [tugatildi, setTugatildi] = useState(false);
  // To'lovlar ketma-ket yuborilganda `amalBajarilmoqda` har so'rov orasida o'chib qoladi — ikki marta bosish takroriy to'lov yaratmasin.
  const saqlashQulfi = useRef(false);

  const boshqaValyuta = valyutaTanlashMumkin && tolovVal !== sotuvVal;
  // To'lov valyutasidagi summani sotuv valyutasiga (va aksincha) bugungi kurs bilan o'giradi.
  const sotuvValyutasigaOgirish = (miqdor: number, valyuta: Valyuta) =>
    valyuta === sotuvVal || !(kurs > 0) ? miqdor : valyuta === "USD" ? miqdor * kurs : miqdor / kurs;
  const sotuvValyutasidanOgirish = (miqdor: number, valyuta: Valyuta) =>
    valyuta === sotuvVal || !(kurs > 0) ? miqdor : valyuta === "USD" ? miqdor / kurs : miqdor * kurs;

  // Ro'yxatdagi to'lovlar hisobga olingandan keyingi qarz.
  const qatorlarYigindisi = qatorlar.reduce((jami2, qator) => jami2 + sotuvValyutasigaOgirish(qator.amount, qator.currency), 0);
  const boshlangichQarz = Math.max(jami - mavjudYigindisi - qatorlarYigindisi, 0);
  // Tanlangan to'lov valyutasida to'lash mumkin bo'lgan eng katta summa (qolgan qarzni to'liq yopadi).
  // Sotuv valyutasida tiyingacha yuqoriga yaxlitlanadi: boshqa valyutadan o'girishdagi kasr shovqini kiritish maydoniga tushmasin.
  // Qarz yo'q bo'lsa 0 (ceil(-0.000001) manfiy nol bo'lib, "-0 so'm" chiqmasligi uchun).
  const maxTolov = Math.max(
    tolovVal === sotuvVal
      ? Math.ceil(boshlangichQarz * 100 - 1e-6) / 100
      : valyutaYaxlitlash(sotuvValyutasidanOgirish(boshlangichQarz, tolovVal), tolovVal),
    0
  );

  // Hisobdan to'lov: hisobdagi qoldiq (ro'yxatdagi hisobdan to'lovlar ayirilgan) va qolgan qarzdan oshmaydi (backend
  // `overpayment_not_allowed`), shuning uchun qarz hisob valyutasining eng kichik birligigacha PASTGA yaxlitlanadi.
  const balansTanlangan = tolovTuri === "BALANCE";
  const birlikdaPastga = (miqdor: number, valyuta: Valyuta) =>
    valyuta === "USD" ? Math.floor(miqdor * 100 + 1e-6) / 100 : Math.floor(miqdor + 1e-6);
  const balansQatorlari = qatorlar.filter((qator) => qator.paymentType === "BALANCE").reduce((jami2, qator) => jami2 + qator.amount, 0);
  const balansMaxHisobda = Math.min(
    birlikdaPastga(sotuvValyutasidanOgirish(boshlangichQarz, hisob.valyuta), hisob.valyuta),
    birlikdaPastga(Math.max(hisob.miqdor - balansQatorlari, 0), hisob.valyuta)
  );
  const balansMax = balansTanlangan ? balansMaxHisobda : 0;
  const korsatiladiganMax = balansTanlangan ? balansMax : maxTolov;

  const yangiSumma = Number(summa) || 0;
  const yangiSummaSotuvValyutasida = sotuvValyutasigaOgirish(yangiSumma, tolovVal);
  const yakuniyTolangan = mavjudYigindisi + qatorlarYigindisi + yangiSummaSotuvValyutasida;
  const qarzFarqi = jami - yakuniyTolangan;
  const qolganQarz = qarzFarqi > 1e-6 ? qarzFarqi : 0;
  // Qoralamadagi mijozli sotuvda chekdan ortiq pul qabul qilinadi (kassir qaytim yoki hisobga yozishni tanlaydi).
  // Tasdiqlangan sotuvda qarzdan ortiq faqat NAQD to'lov qabul qilinadi: qarz yopiladi, ortgani qaytim bo'ladi yoki hisobga o'tadi;
  // karta, bank va hisobdan to'lov qarzdan oshmasligi kerak.
  const ortiqchaYoziladi = draft && Boolean(mijozId);
  // Boshqa valyutada yaxlitlash (dollar — sentgacha, so'm — butungacha yuqoriga) eng ko'pi bilan bir birlik ortiqcha beradi:
  // bu xato hisoblanmaydi. Bir xil valyutada (naqd bo'lmagan to'lovda) ortiqcha to'lov qabul qilinmaydi.
  const qatorValyutalari = [...qatorlar.map((qator) => qator.currency), ...(yangiSumma > 0 ? [tolovVal] : [])];
  const ruxsatEtilganFarq = Math.max(
    1e-6,
    ...qatorValyutalari
      .filter((valyuta) => valyuta !== sotuvVal)
      .map((valyuta) => sotuvValyutasigaOgirish(valyuta === "USD" ? 0.01 : 1, valyuta))
  );
  const qoralamaOrtiqchasi = yakuniyTolangan - jami > ruxsatEtilganFarq ? yakuniyTolangan - jami : 0;
  // Tasdiqlangan sotuv: to'lovlar yuboriladigan tartibda qaysi biri qarzdan oshishi. Avvalgi to'lovlar jamidan oshgan qismi (oldin berilgan
  // qaytim) yangi ortiqcha bo'lib ko'rinmasligi uchun avvalgi to'lov sotuv jamidan oshmaydigan qismi olinadi.
  const avvalTolangan = Math.min(mavjudYigindisi, jami);
  const qarzBor = jami - avvalTolangan > 1e-6;
  const ortiqchaQatorlari: OrtiqchaQatori[] = [
    ...qatorlar.map((qator) => ({ paymentType: qator.paymentType, qiymat: sotuvValyutasigaOgirish(qator.amount, qator.currency) })),
    ...(yangiSumma > 0 ? [{ paymentType: tolovTuri, qiymat: yangiSummaSotuvValyutasida }] : []),
  ];
  const tahlil = ortiqchaTahlili({ jami, avvalTolangan, qatorlar: ortiqchaQatorlari, chegara: ruxsatEtilganFarq });
  const ortiqchaSumma = draft ? qoralamaOrtiqchasi : tahlil.ortiqcha;
  // Ekranda ortiqcha so'mda butungacha, dollarda sentgacha (boshqa valyutadan o'girishdagi kasr shovqini ko'rinmasin).
  const ortiqchaKorinishi = sotuvVal === "USD" ? Math.round(ortiqchaSumma * 100) / 100 : Math.round(ortiqchaSumma);
  // Tasdiqlangan sotuvda qarzdan ortiq naqd to'lov: ikki tanlov ko'rsatiladi (qaytim yoki mijoz hisobiga).
  const naqdOrtiqcha = !draft && qarzBor && tahlil.ortiqcha > 0 && !tahlil.naqdEmas;
  const ortiqchaTanloviKorinadi = (ortiqchaYoziladi && ortiqchaSumma > 0) || naqdOrtiqcha;
  const dollarQatnashdi = dollarQatnashdimi(sotuvVal, qatorValyutalari);
  // Mijozga beriladigan qaytim, so'mda (taxminiy: yakuniy summani server hisoblaydi).
  const qaytimTaxmini = naqdOrtiqcha
    ? qaytimSomda({ ortiqcha: tahlil.ortiqcha, sotuvValyutasi: sotuvVal, kurs, dollarQatnashdi, yaxlitlash: qaytimYaxlitlash })
    : 0;

  // Xulosa (Sotuv jami / Jami to'lov / Qarzdorlik) tanlangan to'lov valyutasida ko'rsatiladi: dollar tanlansa — dollarda
  // (bugungi kurs bilan, backend ham shu kursda hisoblaydi), so'm tanlansa — so'mda. Sotuv valyutasidagi asl qiymat ostida turadi.
  const xulosaVal: Valyuta = boshqaValyuta ? tolovVal : sotuvVal;
  const xulosaQiymati = (miqdor: number, yaxlitlash: "yuqoriga" | "yaqin") => {
    if (xulosaVal === sotuvVal) return miqdor;
    const ogirilgan = sotuvValyutasidanOgirish(miqdor, xulosaVal);
    if (yaxlitlash === "yuqoriga") return valyutaYaxlitlash(ogirilgan, xulosaVal);
    return xulosaVal === "USD" ? Math.round(ogirilgan * 100) / 100 : Math.round(ogirilgan);
  };

  function valyutaniOzgartirish(yangi: Valyuta) {
    if (yangi === tolovVal) return;
    setTolovVal(yangi);
    setSumma("0");
    setXatolik("");
  }

  function tolovTuriniOzgartirish(yangi: TolovTuri) {
    if (yangi === tolovTuri) return;
    setTolovTuri(yangi);
    setSumma("0");
    setXatolik("");
    // Hisobdan to'lov faqat hisob valyutasida yechiladi; boshqa usulga qaytganda valyuta sotuv valyutasiga qaytadi.
    if (yangi === "BALANCE") setTolovVal(hisob.valyuta);
    else if (tolovTuri === "BALANCE") setTolovVal(sotuvVal);
  }

  // Saqlanadigan to'lovlar (ro'yxat + shakldagi summa) bo'yicha xato matni; xato bo'lmasa bo'sh qator.
  function tolovlarniTekshirish(tolovlarSoni: number) {
    if (yangiSumma < 0) return draft ? t("tolovModal.errors.manfiyBolmasin") : t("tolovModal.errors.nolDanKatta");
    if (!draft && tolovlarSoni === 0) return t("tolovModal.errors.nolDanKatta");
    if (balansTanlangan && yangiSumma > balansMax + 1e-9) {
      return t("tolovModal.errors.hisobdanOshmasin", { maksimal: pulniFormatlash(balansMax, tolovVal) });
    }
    if (draft) {
      if (!ortiqchaYoziladi && yakuniyTolangan > jami + ruxsatEtilganFarq) {
        return t("tolovModal.errors.qarzdorlikdanOshmasin", { maksimal: pulniFormatlash(maxTolov, tolovVal) });
      }
    } else if (tahlil.ortiqcha > 0) {
      // Qarz yo'q bo'lsa ortiqcha to'lov qabul qilinmaydi; qarz bor bo'lsa ortiqchani faqat naqd to'lov hosil qilishi mumkin.
      if (!qarzBor) return t("tolovModal.errors.qarzdorlikdanOshmasin", { maksimal: pulniFormatlash(maxTolov, tolovVal) });
      if (tahlil.naqdEmas) return t("tolovModal.errors.ortiqchaFaqatNaqd", { maksimal: pulniFormatlash(maxTolov, tolovVal) });
    }
    // To'lov sanasi: kelajak kun va yopilgan davr kuni backendda rad etiladi (date_in_future, period_closed).
    const kunlar = [...qatorlar.map((qator) => qator.date), ...(yangiSumma > 0 ? [tolovKuni] : [])];
    if (kunlar.some((kun) => kelajakKunmi(kun))) return t("tolovModal.errors.sanaKelajak");
    // To'lov sotuv kunidan oldingi kunga yozilmaydi (backend: 400 errors.sales.payment_before_sale).
    const sotuvKuni = toshkentKuni(sotuv.date ?? sotuv.createdAt);
    if (sotuvKuni && kunlar.some((kun) => kun && kun < sotuvKuni)) {
      return t("tolovModal.errors.sanaSotuvdanOldin", { sana: kunMatni(sotuvKuni) });
    }
    if (yopilganKun && kunlar.some((kun) => kun && kun <= yopilganKun)) {
      return t("tolovModal.errors.davrYopilgan", { sana: kunMatni(yopilganKun) });
    }
    return "";
  }

  function qatorQoshish() {
    setXatolik("");
    const xato = yangiSumma > 0 ? tolovlarniTekshirish(1) : t("tolovModal.errors.nolDanKatta");
    if (xato) {
      setXatolik(xato);
      return;
    }
    setQatorlar((joriy) => [...joriy, { paymentType: tolovTuri, amount: yangiSumma, currency: tolovVal, date: tolovKuni, note: izoh.trim() }]);
    setSumma("0");
    setIzoh("");
    // Hisobdan to'lovdan keyin qolgani odatda naqd to'lanadi.
    if (tolovTuri === "BALANCE") setTolovTuri("CASH");
    // Ikkinchi to'lov odatda boshqa valyutada bo'ladi (masalan, dollardan keyin qolgani so'mda).
    if (valyutaTanlashMumkin) setTolovVal(tolovVal === "USD" ? "UZS" : "USD");
  }

  async function submit() {
    if (saqlashQulfi.current) return;
    setXatolik("");

    const tolovlar: YangiTolovQatori[] = [
      ...qatorlar,
      ...(yangiSumma > 0 ? [{ paymentType: tolovTuri, amount: yangiSumma, currency: tolovVal, date: tolovKuni, note: izoh.trim() }] : []),
    ];
    const xato = tolovlarniTekshirish(tolovlar.length);
    if (xato) {
      setXatolik(xato);
      return;
    }

    saqlashQulfi.current = true;
    setSaqlanmoqda(true);
    try {
      if (!draft) {
        // Tasdiqlangan sotuvga to'lov qo'shish endpointi bitta to'lov oladi: har biri alohida yuboriladi.
        // Qarzdan ortiq naqd to'lovda tanlov (hisobga o'tkazish yoki aniq qaytim) faqat ortiqchani boshlagan va undan keyingi qatorlarga qo'shiladi.
        const bayroqlar = ortiqchaMaydonlari({
          ortiqcha: tahlil.ortiqcha,
          hisobgaYozish: ortiqchaniHisobga,
          mijozBor: Boolean(mijozId),
          dollarQatnashdi,
          yaxlitlash: qaytimYaxlitlash,
        });
        const natijalar: TolovNatijasi[] = natija ? [natija] : [];
        for (let i = 0; i < tolovlar.length; i += 1) {
          const tolov = tolovlar[i];
          const saqlandi = await onTolovQoshish(sotuv.id, {
            paymentType: tolov.paymentType,
            amount: tolov.amount,
            ...farqliValyuta(tolov.currency, sotuv),
            ...tolovQoshimchasi(tolov.date, tolov.note),
            ...(tahlil.birinchiOshgan !== -1 && i >= tahlil.birinchiOshgan ? bayroqlar : {}),
          });
          if (!saqlandi) {
            // Oldingilari saqlangan: ular ro'yxatdan chiqariladi, qolganlari qayta urinish uchun turadi.
            setQatorlar(qatorlar.slice(i));
            // Saqlangan to'lovlardan mijozga qaytim berilgan bo'lsa, u kassirga ko'rinib turadi.
            const oldingi = natijalarYigindisi(natijalar);
            if (oldingi.qaytim > 0 || oldingi.hisobga > 0) setNatija(oldingi);
            // Backendning aniq sababi (masalan, hisobda pul yetmaydi) bo'lsa, shu ko'rsatiladi.
            const sabab = useSavdoStore.getState().xatolik;
            setXatolik(
              i > 0
                ? `${t("tolovModal.errors.qismanSaqlandi", { saqlandi: i, jami: tolovlar.length })}${sabab ? ` ${sabab}` : ""}`
                : sabab || t("tolovModal.errors.saqlanmadi")
            );
            return;
          }
          natijalar.push(saqlandi);
        }
        // Qaytim yoki hisobga o'tgan pul bo'lsa oyna yopilmaydi: kassir mijozga qancha qaytim berishini ko'rishi kerak.
        const yigindi = natijalarYigindisi(natijalar);
        if (yigindi.qaytim > 0 || yigindi.hisobga > 0) {
          setNatija(yigindi);
          setTugatildi(true);
          return;
        }
        onYopish();
        return;
      }

      const yangiTolovlar = [
        ...mavjudTolovlar.map((tolov) => ({
          paymentType: tolov.paymentType,
          amount: Number(tolov.amount ?? 0),
          ...farqliValyuta(tolovValyutasi(tolov, sotuv), sotuv),
          // Qoralamada to'lovlar ro'yxati to'liq almashtiriladi: eski to'lov `id` bilan qaytariladi, shunda uning sanasi va izohi saqlanadi.
          ...saqlanganTolovMaydonlari(tolov),
        })),
        ...tolovlar.map((tolov) => ({
          paymentType: tolov.paymentType,
          amount: tolov.amount,
          ...farqliValyuta(tolov.currency, sotuv),
          ...tolovQoshimchasi(tolov.date, tolov.note),
        })),
      ];

      const saqlandi = await onYangilash(sotuv.id, {
        payments: yangiTolovlar,
        // Chekdan ortiq pul bo'lsa tanlov aniq yuboriladi (eski qarzlar yopilgach qolgani qaytim yoki mijoz hisobiga).
        ...(ortiqchaYoziladi && ortiqchaSumma > 0 ? { keepExcess: ortiqchaniHisobga } : {}),
      });
      if (!saqlandi) {
        setXatolik(useSavdoStore.getState().xatolik || t("tolovModal.errors.saqlanmadi"));
        return;
      }

      // To'lov qabul qilish sotuvni avtomatik tasdiqlamaydi — sotuv hali
      // qoralama holatida qoladi, ombordan real chiqarish uchun "Ombordan
      // chiqarish" bo'limida alohida tasdiqlash kerak.
      onYopish();
    } finally {
      saqlashQulfi.current = false;
      setSaqlanmoqda(false);
    }
  }

  return (
    <AppModal onClose={onYopish}>
      <div className="w-full max-w-2xl rounded-[32px] bg-white p-8 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#2563EB]">
              <CreditCard size={26} />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2563EB]">{t("tolovModal.belgisi")}</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">{t("tolovModal.sarlavha")}</h2>
            </div>
          </div>
        </div>

        {tugatildi && natija ? (
          <TolovNatijasiKarta
            qaytim={natija.qaytim}
            hisobga={natija.hisobga}
            sotuvValyutasi={sotuvVal}
            qolganQarz={sotuvQarzdorlikSummasi(sotuv)}
            onYopish={onYopish}
          />
        ) : (
        <div className="mt-7 space-y-5">
            {mavjudTolovlar.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">
                  {t("tolovModal.avvalgiTolovlar")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {mavjudTolovlar.map((tolov, index) => (
                    <span
                      key={tolov.id ?? `${tolov.paymentType}-${index}`}
                      className="rounded-full bg-orange-50 px-3.5 py-1.5 text-xs font-bold text-[#2563EB]"
                    >
                      {tolovTuriMatni[tolov.paymentType]}: {pulniFormatlash(tolov.amount, tolovValyutasi(tolov, sotuv))}
                      {kunMatni(tolov.date ?? tolov.paidAt ?? tolov.createdAt) && (
                        <span className="ml-1.5 font-semibold text-slate-400">· {kunMatni(tolov.date ?? tolov.paidAt ?? tolov.createdAt)}</span>
                      )}
                      {tolov.note && (
                        <span className="ml-1.5 font-semibold text-slate-500" title={tolov.note}>
                          · {tolov.note.length > 28 ? `${tolov.note.slice(0, 28)}…` : tolov.note}
                        </span>
                      )}
                      {tolovlarQaytimi([tolov]).qaytim > 0 && (
                        <span className="ml-1.5 font-semibold text-emerald-600">
                          · {t("tolovModal.qaytimQatori", { summa: somMatni(tolovlarQaytimi([tolov]).qaytim, t("tolovModal.somBelgisi")) })}
                        </span>
                      )}
                      {tolovlarQaytimi([tolov]).hisobga > 0 && (
                        <span className="ml-1.5 font-semibold text-sky-600">
                          · {t("tolovModal.hisobgaQatori", { summa: pulniFormatlash(tolovlarQaytimi([tolov]).hisobga, sotuvVal) })}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {qatorlar.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">
                  {t("tolovModal.qoshiladiganTolovlar")}
                </p>
                <div className="space-y-2">
                  {qatorlar.map((qator, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-2.5 ring-1 ring-slate-100"
                    >
                      <div className="min-w-0 text-sm font-bold text-slate-700">
                        {tolovTuriMatni[qator.paymentType]}: {pulniFormatlash(qator.amount, qator.currency)}
                        {qator.currency !== sotuvVal && (
                          <span className="ml-2 text-xs font-semibold text-slate-400">
                            ≈ {pulniFormatlash(sotuvValyutasigaOgirish(qator.amount, qator.currency), sotuvVal)}
                          </span>
                        )}
                        {(qator.date !== bugungiToshkentKuni() || qator.note) && (
                          <span className="mt-0.5 block text-xs font-semibold text-slate-400">
                            {qator.date !== bugungiToshkentKuni() ? kunMatni(qator.date) : ""}
                            {qator.date !== bugungiToshkentKuni() && qator.note ? " · " : ""}
                            {qator.note}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={saqlanmoqda}
                        onClick={() => setQatorlar((joriy) => joriy.filter((_, qatorIndeksi) => qatorIndeksi !== index))}
                        aria-label={t("tolovModal.tolovniOlibTashlash")}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-400">{t("tolovModal.tolovTuri")}</span>
                <SavdoSelect
                  value={tolovTuri}
                  onChange={(value) => tolovTuriniOzgartirish(value as TolovTuri)}
                  options={tolovTuriOptions}
                  buttonClassName="h-12 rounded-xl px-4 text-sm"
                  portal
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-400">{t("tolovModal.tolovSummasi")}</span>
                <div className="relative">
                  {/* Valyuta belgisi: dollarda summa oldida "$", so'mda oxirida "so'm" — qaysi valyutada kiritilayotgani ko'rinib turadi. */}
                  {tolovVal === "USD" && (
                    <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-[#2563EB]">$</span>
                  )}
                  <SummaMaydoni
                    value={summa}
                    onChange={setSumma}
                    aria-label={`${t("tolovModal.tolovSummasi")} (${tolovVal === "USD" ? "$" : t("tolovModal.somBelgisi")})`}
                    className={`h-12 w-full rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-orange-100 ${tolovVal === "USD" ? "pl-9 pr-4" : "pl-4 pr-20"}`}
                    placeholder="0"
                  />
                  {tolovVal !== "USD" && (
                    <span aria-hidden className="pointer-events-none absolute right-9 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{t("tolovModal.somBelgisi")}</span>
                  )}
                </div>
              </label>
            </div>

            {valyutaTanlashMumkin && (
              <div className="grid gap-2">
                <span className="text-sm font-bold text-slate-400">{t("tolovModal.tolovValyutasi")}</span>
                <div className="flex flex-wrap items-center gap-3">
                  {balansTanlangan ? (
                    <span className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-bold text-slate-600">
                      {t("tolovModal.hisobValyutasi", { valyuta: tolovVal === "USD" ? t("tolovModal.valyutaDollar") : t("tolovModal.valyutaSom") })}
                    </span>
                  ) : (
                  <div className="inline-flex rounded-xl bg-gray-100 p-1">
                    {(["UZS", "USD"] as const).map((valyuta) => (
                      <button
                        key={valyuta}
                        type="button"
                        onClick={() => valyutaniOzgartirish(valyuta)}
                        className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                          tolovVal === valyuta ? "bg-white text-[#2563EB] shadow-sm" : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        {valyuta === "USD" ? t("tolovModal.valyutaDollar") : t("tolovModal.valyutaSom")}
                      </button>
                    ))}
                  </div>
                  )}
                  {boshqaValyuta && (
                    <span className="text-xs font-semibold text-slate-500">
                      {t("tolovModal.kursQatori", { kurs: kurs.toLocaleString("uz-UZ", { maximumFractionDigits: 2 }) })}
                      {yangiSumma > 0 &&
                        ` · ${t("tolovModal.sotuvValyutasidagiQiymat", { summa: pulniFormatlash(yangiSummaSotuvValyutasida, sotuvVal) })}`}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
              <label className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
                <span className="text-sm font-bold text-slate-400">{t("tolovModal.tolovSanasi")}</span>
                <HujjatSanasiMaydoni
                  value={tolovKuni}
                  onChange={setTolovKuni}
                  aria-label={t("tolovModal.tolovSanasi")}
                  korsatma={false}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-orange-100"
                />
              </label>
              <label className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
                <span className="text-sm font-bold text-slate-400">{t("tolovModal.izoh")}</span>
                <input
                  type="text"
                  value={izoh}
                  maxLength={300}
                  onChange={(event) => setIzoh(event.target.value)}
                  placeholder={t("tolovModal.izohPlaceholder")}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-300 focus:border-[#2563EB] focus:ring-4 focus:ring-orange-100"
                />
              </label>
            </div>
            {tolovKuni !== bugungiToshkentKuni() && (
              <p className="-mt-2 text-xs font-semibold leading-5 text-amber-600">{t("tolovModal.sanaOtganIzoh", { sana: kunMatni(tolovKuni) })}</p>
            )}

            <div className="flex flex-wrap gap-2.5">
              {balansTuriMumkin && !balansTanlangan && balansMaxHisobda > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    tolovTuriniOzgartirish("BALANCE");
                    setSumma(String(balansMaxHisobda));
                  }}
                  className="rounded-xl bg-sky-50 px-4 py-2.5 text-xs font-bold text-sky-700 transition hover:bg-sky-100"
                >
                  {t("tolovModal.hisobidanTolash", { summa: pulniFormatlash(balansMaxHisobda, hisob.valyuta) })}
                </button>
              )}
              <button
                type="button"
                onClick={() => setSumma(String(korsatiladiganMax))}
                className="rounded-xl bg-orange-50 px-4 py-2.5 text-xs font-bold text-[#2563EB] transition hover:bg-orange-100"
              >
                {t("tolovModal.tolashToliq", { summa: pulniFormatlash(korsatiladiganMax, tolovVal) })}
              </button>
              <button
                type="button"
                onClick={() => setSumma("0")}
                className="rounded-xl bg-gray-100 px-4 py-2.5 text-xs font-bold text-gray-500 transition hover:bg-gray-200"
              >
                {t("tolovModal.qarzgaQoldirish")}
              </button>
              <button
                type="button"
                disabled={saqlanmoqda || !(yangiSumma > 0)}
                onClick={qatorQoshish}
                className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[#2563EB]/40 px-4 py-2.5 text-xs font-bold text-[#2563EB] transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus size={14} />
                {t("tolovModal.yanaTolovQoshish")}
              </button>
            </div>
            {qatorlar.length === 0 && (
              <p className="-mt-2 text-xs font-semibold leading-5 text-slate-400">{t("tolovModal.yanaTolovIzoh")}</p>
            )}
            {balansTuriMumkin && (
              <p className="-mt-2 text-xs font-bold leading-5 text-sky-700">
                {balansTanlangan
                  ? t("tolovModal.hisobQoldigi", { summa: pulniFormatlash(Math.max(hisob.miqdor - balansQatorlari, 0), hisob.valyuta) })
                  : t("tolovModal.hisobMavjud", { summa: pulniFormatlash(hisob.miqdor, hisob.valyuta) })}
              </p>
            )}

            <div className="grid gap-4 rounded-2xl bg-gradient-to-br from-orange-50/70 to-white p-5 ring-1 ring-orange-100 sm:grid-cols-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">{t("tolovModal.sotuvJami")}</p>
                <p className="mt-1.5 text-lg font-black text-slate-800">{pulniFormatlash(xulosaQiymati(jami, "yuqoriga"), xulosaVal)}</p>
                {boshqaValyuta && <p className="mt-0.5 text-[11px] font-semibold text-slate-400">≈ {pulniFormatlash(jami, sotuvVal)}</p>}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  {t("tolovModal.jamiTolov")}
                </p>
                <p className="mt-1.5 text-lg font-black text-[#2563EB]">{pulniFormatlash(xulosaQiymati(yakuniyTolangan, "yaqin"), xulosaVal)}</p>
                {boshqaValyuta && <p className="mt-0.5 text-[11px] font-semibold text-slate-400">≈ {pulniFormatlash(yakuniyTolangan, sotuvVal)}</p>}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  {qolganQarz > 0
                    ? t("tolovModal.qarzdorlikQoldigi")
                    : naqdOrtiqcha
                      ? t("tolovModal.ortiqcha.qiymati")
                      : t("tolovModal.qarzdorlik")}
                </p>
                <p className={`mt-1.5 text-lg font-black ${qolganQarz > 0 ? "text-red-500" : naqdOrtiqcha ? "text-sky-600" : "text-emerald-600"}`}>
                  {qolganQarz > 0
                    ? pulniFormatlash(xulosaQiymati(qolganQarz, "yuqoriga"), xulosaVal)
                    : naqdOrtiqcha
                      ? pulniFormatlash(xulosaQiymati(tahlil.ortiqcha, "yaqin"), xulosaVal)
                      : t("tolovModal.yoq")}
                </p>
                {boshqaValyuta && qolganQarz > 0 && <p className="mt-0.5 text-[11px] font-semibold text-slate-400">≈ {pulniFormatlash(qolganQarz, sotuvVal)}</p>}
                {boshqaValyuta && naqdOrtiqcha && <p className="mt-0.5 text-[11px] font-semibold text-slate-400">≈ {pulniFormatlash(ortiqchaKorinishi, sotuvVal)}</p>}
              </div>
            </div>

            {ortiqchaTanloviKorinadi && (
              <OrtiqchaTanlovi
                rejim={draft ? "qoralama" : "tasdiqlangan"}
                hisobgaYozish={ortiqchaniHisobga}
                onOzgarish={setOrtiqchaniHisobga}
                ortiqchaMatni={pulniFormatlash(ortiqchaKorinishi, sotuvVal)}
                qaytimMatni={qaytimTaxmini > 0 ? somMatni(qaytimTaxmini, t("tolovModal.somBelgisi")) : undefined}
                mijozBor={Boolean(mijozId)}
                yaxlitlashKorsatilsin={naqdOrtiqcha && dollarQatnashdi}
                yaxlitlash={qaytimYaxlitlash}
                onYaxlitlash={setQaytimYaxlitlash}
              />
            )}

            {!draft && qarzBor && tahlil.ortiqcha > 0 && tahlil.naqdEmas && (
              <div role="alert" className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-800">
                <TriangleAlert size={18} aria-hidden className="mt-0.5 shrink-0" />
                {t("tolovModal.errors.ortiqchaFaqatNaqd", { maksimal: pulniFormatlash(maxTolov, tolovVal) })}
              </div>
            )}

            {natija && !tugatildi && (natija.qaytim > 0 || natija.hisobga > 0) && (
              <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-800">
                {natija.qaytim > 0 && <p>{t("tolovModal.natija.saqlanganQaytim", { summa: somMatni(natija.qaytim, t("tolovModal.somBelgisi")) })}</p>}
                {natija.hisobga > 0 && <p>{t("tolovModal.natija.saqlanganHisobga", { summa: pulniFormatlash(natija.hisobga, sotuvVal) })}</p>}
              </div>
            )}

            {xatolik && (
              <div className="rounded-2xl bg-red-50 p-3.5 text-sm font-bold text-red-600">{xatolik}</div>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={onYopish}
                className="h-12 rounded-2xl bg-gray-100 px-5 text-sm font-bold text-gray-600 transition hover:bg-gray-200"
              >
                {t("common.bekorQilish")}
              </button>
              <button
                type="button"
                disabled={amalBajarilmoqda || saqlanmoqda}
                onClick={() => void submit()}
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#2563EB] px-6 text-sm font-black text-white shadow-[0_10px_24px_rgba(37,99,235,.24)] transition hover:bg-[#1D4ED8] disabled:opacity-50"
              >
                {(amalBajarilmoqda || saqlanmoqda) && <LoaderCircle size={16} className="animate-spin" />}
                {draft ? t("tolovModal.tolovniSaqlash") : t("tolovModal.tolovniQoshish")}
              </button>
            </div>
        </div>
        )}
      </div>
    </AppModal>
  );
}

type TarixAccent = "green" | "blue" | "orange" | "red";
type TarixTuri = "yaratildi" | "tasdiqlandi" | "tolov" | "bekor" | "ochirildi" | "tiklandi" | "yangilandi";
type TarixChipOhangi = "kulrang" | "kok" | "yashil" | "qizil" | "sariq";
type TarixChip = { label?: string; value: string; ohang: TarixChipOhangi };

type TarixQatori = {
  id: string;
  sana: string;
  avtor: string;
  tip: string;
  tavsif: string;
  chiplar: TarixChip[];
  turi: TarixTuri;
  accent?: TarixAccent;
};

const TARIX_MAYDON_NOMLARI: Record<string, string> = {
  status: "tarix.maydonlar.holat",
  debtAmount: "tarix.maydonlar.qarzdorlik",
  paidAmount: "tarix.maydonlar.tolanganSumma",
  totalAmount: "tarix.maydonlar.jamiSumma",
  discountAmount: "tarix.maydonlar.chegirma",
  note: "tarix.maydonlar.izoh",
  warehouseId: "tarix.maydonlar.ombor",
  responsibleId: "tarix.maydonlar.masulShaxs",
  customerId: "tarix.maydonlar.mijoz",
  clientCompanyId: "tarix.maydonlar.mijozKompaniyasi",
  paymentType: "tarix.maydonlar.tolovTuri",
  saleType: "tarix.maydonlar.saleType",
};

const TARIX_PUL_MAYDONLARI = new Set(["debtAmount", "paidAmount", "totalAmount", "discountAmount", "amount"]);

const TARIX_CHIP_STILI: Record<TarixChipOhangi, string> = {
  kulrang: "bg-slate-50 text-slate-700 ring-slate-100",
  kok: "bg-orange-50 text-[#2563EB] ring-orange-100",
  yashil: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  qizil: "bg-red-50 text-red-600 ring-red-100",
  sariq: "bg-amber-50 text-amber-700 ring-amber-100",
};

const TARIX_TIP_RANGI: Record<TarixAccent, string> = {
  green: "text-emerald-700",
  blue: "text-slate-900",
  orange: "text-amber-700",
  red: "text-red-600",
};

const TARIX_TIMELINE_OHANGI: Record<TarixAccent, TimelineOhangi> = {
  green: "yashil",
  blue: "kok",
  orange: "sariq",
  red: "qizil",
};

function tarixIkonkasi(turi: TarixTuri) {
  switch (turi) {
    case "tasdiqlandi":
      return <CheckCircle2 size={18} />;
    case "tolov":
      return <CreditCard size={18} />;
    case "bekor":
      return <Ban size={18} />;
    case "ochirildi":
      return <Trash2 size={18} />;
    case "tiklandi":
      return <RotateCcw size={18} />;
    case "yaratildi":
      return <ShoppingCart size={18} />;
    default:
      return <PenLine size={18} />;
  }
}

function tarixHolatMatni(value: unknown) {
  const kalit = String(value ?? "").toUpperCase();
  return sotuvHolatiMatni[kalit as keyof typeof sotuvHolatiMatni] ?? (kalit || "—");
}

function tarixMaydonNomi(maydon: string, t: TFunction) {
  const kalit = TARIX_MAYDON_NOMLARI[maydon];
  return kalit
    ? t(kalit)
    : maydon.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, (harf) => harf.toUpperCase());
}

function tarixQiymatMatni(maydon: string, value: unknown, t: TFunction): string {
  if (value === null || value === undefined || value === "") return "—";
  if (maydon === "status") return tarixHolatMatni(value);
  if (TARIX_PUL_MAYDONLARI.has(maydon)) return pulniFormatlash(value as number | string);
  if (Array.isArray(value)) {
    if (maydon === "payments") {
      return value
        .map((tolov) => {
          const record = tolov as { amount?: number | string; paymentType?: string; currency?: string | null };
          const turi = record.paymentType
            ? tolovTuriMatni[record.paymentType as TolovTuri] ?? record.paymentType
            : "";
          return `${pulniFormatlash(record.amount, record.currency ? valyutaKodi(record.currency) : undefined)}${turi ? ` (${turi})` : ""}`;
        })
        .join(", ");
    }
    return t("tarix.qiymat.taSoni", { count: value.length });
  }
  if (typeof value === "object") return "";
  return String(value);
}

function tarixHolatOhangi(value: unknown): TarixChipOhangi {
  const kalit = String(value ?? "").toUpperCase();
  if (kalit === "CONFIRMED") return "yashil";
  if (kalit === "CANCELLED" || kalit === "CANCELED") return "qizil";
  return "sariq";
}

function tarixPulChipi(maydon: string, qiymat: unknown, t: TFunction): TarixChip {
  const summa = Number(qiymat);
  return {
    label: tarixMaydonNomi(maydon, t),
    value: tarixQiymatMatni(maydon, qiymat, t),
    ohang: maydon === "paidAmount" ? "kok" : maydon === "debtAmount" ? (summa > 0 ? "qizil" : "yashil") : "kulrang",
  };
}

// Audit yozuvidagi o'zgarishlar ekranda qisqa "belgi"lar (chip) sifatida ko'rsatiladi.
function tarixChiplari(item: SaleAuditLog, t: TFunction): TarixChip[] {
  const diff = (item.diff ?? {}) as Record<string, unknown>;
  const before = (diff.before ?? null) as Record<string, unknown> | null;
  const after = (diff.after ?? null) as Record<string, unknown> | null;
  const chiplar: TarixChip[] = [];

  if (before || after) {
    const eskiHolat = before?.status;
    const yangiHolat = after?.status;
    if (yangiHolat && eskiHolat !== yangiHolat) {
      chiplar.push({
        label: tarixMaydonNomi("status", t),
        value: eskiHolat ? `${tarixHolatMatni(eskiHolat)} → ${tarixHolatMatni(yangiHolat)}` : tarixHolatMatni(yangiHolat),
        ohang: tarixHolatOhangi(yangiHolat),
      });
    }
    for (const maydon of ["totalAmount", "paidAmount", "debtAmount"]) {
      const qiymat = after?.[maydon];
      if (qiymat !== undefined && qiymat !== null) chiplar.push(tarixPulChipi(maydon, qiymat, t));
    }
  } else {
    for (const [maydon, qiymat] of Object.entries(diff)) {
      if (maydon === "before" || maydon === "after") continue;
      const record = qiymat as { from?: unknown; to?: unknown } | null;
      const yangiQiymat = record && "to" in record ? record.to : qiymat;
      const yangi = tarixQiymatMatni(maydon, yangiQiymat, t);
      if (!yangi) continue;
      if (maydon === "payments") {
        chiplar.push({ value: t("tarix.tavsifMatni.tolovQoshildi", { qiymat: yangi }), ohang: "yashil" });
        continue;
      }
      const eski = record && "from" in record ? tarixQiymatMatni(maydon, record.from, t) : null;
      chiplar.push({
        label: tarixMaydonNomi(maydon, t),
        value: eski && eski !== "—" && eski !== yangi ? `${eski} → ${yangi}` : yangi,
        ohang: maydon === "status" ? tarixHolatOhangi(yangiQiymat) : "kulrang",
      });
    }
  }

  if (chiplar.length === 0) chiplar.push({ value: t("tarix.tavsifMatni.malumotYangilandi"), ohang: "kulrang" });
  return chiplar;
}

function tarixTipiniAniqlash(item: SaleAuditLog, t: TFunction): { tip: string; accent: TarixAccent; turi: TarixTuri } {
  if (item.action === "DELETE") return { tip: t("tarix.tip.ochirildi"), accent: "red", turi: "ochirildi" };

  const diff = (item.diff ?? {}) as Record<string, unknown>;
  if ("payments" in diff) return { tip: t("tarix.tip.tolovQabulQilindi"), accent: "green", turi: "tolov" };

  const yangiHolat = String(
    (diff.status as { to?: unknown } | undefined)?.to ??
      (diff.after as Record<string, unknown> | undefined)?.status ??
      ""
  ).toUpperCase();
  if (yangiHolat === "CONFIRMED") return { tip: t("tarix.tip.tasdiqlandi"), accent: "green", turi: "tasdiqlandi" };
  if (yangiHolat === "CANCELLED") return { tip: t("tarix.tip.bekorQilindi"), accent: "red", turi: "bekor" };
  // Bekor qilingan sotuv qayta tiklanganda backend `diff.status: { from: CANCELLED, to: DRAFT }` yozadi.
  const eskiHolat = String((diff.status as { from?: unknown } | undefined)?.from ?? "").toUpperCase();
  if (eskiHolat === "CANCELLED" && yangiHolat === "DRAFT") return { tip: t("tarix.tip.tiklandi"), accent: "blue", turi: "tiklandi" };
  if (item.action === "CREATE") return { tip: t("tarix.tip.yaratildi"), accent: "blue", turi: "yaratildi" };
  return { tip: t("tarix.tip.yangilandi"), accent: "orange", turi: "yangilandi" };
}

function tarixMuallifBoshHarflari(nom: string) {
  return nom
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((qism) => qism[0]?.toUpperCase())
    .join("");
}

function TarixTab({ sotuv }: { sotuv: Sotuv }) {
  const { t } = useTranslation("savdo_tafsilot");
  const [filter, setFilter] = useState("");
  const [sanaTartibi, setSanaTartibi] = useState<"desc" | "asc">("desc");
  const [backendTarix, setBackendTarix] = useState<SaleAuditLog[]>([]);
  const [tarixYuklanmoqda, setTarixYuklanmoqda] = useState(true);
  const [tarixXatosi, setTarixXatosi] = useState("");

  useEffect(() => {
    let active = true;
    setTarixYuklanmoqda(true);
    setTarixXatosi("");
    void sotuvTarixiniOlish(sotuv.id)
      .then((data) => {
        if (active) setBackendTarix(data);
      })
      .catch((error) => {
        if (active) setTarixXatosi(getApiErrorMessage(error));
      })
      .finally(() => {
        if (active) setTarixYuklanmoqda(false);
      });
    return () => {
      active = false;
    };
  }, [sotuv.id]);

  const qatorlar: TarixQatori[] = backendTarix
    .map((item): TarixQatori => {
      const { tip, accent, turi } = tarixTipiniAniqlash(item, t);
      const chiplar = tarixChiplari(item, t);
      return {
        id: item.id,
        sana: item.createdAt,
        avtor: item.actor?.fullName || item.actor?.username || item.user?.fullName || item.user?.username || t("common.tizim"),
        tip,
        tavsif: chiplar.map((chip) => (chip.label ? `${chip.label}: ${chip.value}` : chip.value)).join(" · "),
        chiplar,
        turi,
        accent,
      };
    })
    .sort((a, b) => {
      const aVaqt = new Date(a.sana).getTime();
      const bVaqt = new Date(b.sana).getTime();
      return sanaTartibi === "desc" ? bVaqt - aVaqt : aVaqt - bVaqt;
    });

  const qidiruv = filter.trim().toLowerCase();
  const korinadiganQatorlar = qidiruv
    ? qatorlar.filter((qator) =>
        [qator.avtor, qator.tip, qator.tavsif, tarixVaqti(qator.sana, t)]
          .join(" ")
          .toLowerCase()
          .includes(qidiruv)
      )
    : qatorlar;

  return (
    <div className="px-9 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">{t("tarix.sarlavha")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("tarix.tavsif")}</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <label className="relative block w-full sm:w-[320px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder={t("tarix.filtr")}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-medium text-slate-700 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
            />
          </label>
          <button
            type="button"
            onClick={() => setSanaTartibi((joriy) => (joriy === "desc" ? "asc" : "desc"))}
            className="inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-sky-300 hover:text-sky-600"
            title={sanaTartibi === "desc" ? t("tarix.tartiblashEskidan") : t("tarix.tartiblashYangidan")}
            aria-label={t("tarix.sanaBoyichaTartiblash")}
          >
            {t("tarix.sana")}
            <ChevronDown size={15} className={`transition ${sanaTartibi === "asc" ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {sotuv.items && sotuv.items.length > 0 && (
        <section className="mb-6 rounded-[24px] border border-orange-100 bg-[#F8FAFC] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-orange-600">
              <Package size={15} />
              {t("tarix.sotilganMahsulotlar", { count: sotuv.items.length })}
            </p>
            <p className="text-sm text-slate-500">
              {t("nakladnoy.jami")} <span className="ml-1 font-black text-slate-800">{pulniFormatlash(sotuvSummasi(sotuv), sotuvValyutasi(sotuv))}</span>
            </p>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {sotuv.items.map((item, index) => (
              <div
                key={item.id ?? item.saleItemId ?? index}
                className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-100"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#2563EB] ring-1 ring-orange-100">
                  <Package size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{mahsulotNomi(item, t)}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {qatorMiqdoriMatni(item)} × {pulniFormatlash(qatorBirligida(item).narx, qatorValyutasi(item, sotuv))}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-black text-slate-800">{pulniFormatlash(mahsulotJami(item), qatorValyutasi(item, sotuv))}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {tarixYuklanmoqda && (
        <div className="flex h-48 items-center justify-center rounded-[24px] bg-white ring-1 ring-slate-100">
          <LoaderCircle className="animate-spin text-orange-500" />
        </div>
      )}
      {tarixXatosi && (
        <div className="rounded-[24px] bg-red-50 p-6 text-center text-sm font-semibold text-red-600 ring-1 ring-red-100">{tarixXatosi}</div>
      )}
      {!tarixYuklanmoqda && !tarixXatosi && korinadiganQatorlar.length === 0 && (
        <div className="flex h-48 items-center justify-center rounded-[24px] bg-white text-sm font-medium text-slate-400 ring-1 ring-slate-100">
          {t("tarix.topilmadi")}
        </div>
      )}

      {korinadiganQatorlar.length > 0 && (
        <ol className="relative space-y-4 before:absolute before:bottom-6 before:left-5 before:top-6 before:w-px before:bg-orange-200">
          {korinadiganQatorlar.map((qator) => {
            const accent = qator.accent ?? "blue";
            const tizim = qator.avtor === t("common.tizim");
            return (
              <TimelineElement key={qator.id} icon={tarixIkonkasi(qator.turi)} ohang={TARIX_TIMELINE_OHANGI[accent]}>
                <article className="rounded-[20px] border border-slate-100 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,.05)] transition hover:shadow-[0_20px_50px_rgba(15,23,42,.09)]">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div className="min-w-0">
                      <h3 className={`font-black ${TARIX_TIP_RANGI[accent]}`}>{qator.tip}</h3>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                        <span className="font-semibold text-slate-500">{tarixVaqti(qator.sana, t)}</span>
                        <span aria-hidden>·</span>
                        <span>{sananiFormatlash(qator.sana)}</span>
                      </p>
                    </div>
                    <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-slate-50 py-1 pl-1 pr-3 ring-1 ring-slate-100">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-400 text-[11px] font-bold text-white">
                        {tizim ? <UserRound size={15} /> : tarixMuallifBoshHarflari(qator.avtor) || <UserRound size={15} />}
                      </span>
                      <span className="truncate text-sm font-semibold text-slate-700">{qator.avtor}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {qator.chiplar.map((chip, index) => (
                      <span
                        key={`${chip.label ?? "matn"}-${index}`}
                        className={`inline-flex max-w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs ring-1 ${TARIX_CHIP_STILI[chip.ohang]}`}
                      >
                        {chip.label && <span className="opacity-70">{chip.label}</span>}
                        <span className="break-words font-bold">{chip.value}</span>
                      </span>
                    ))}
                  </div>
                </article>
              </TimelineElement>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function TovarlarTab({
  sotuv,
  qoldiqlar,
  amalBajarilmoqda,
  onYangilash,
}: {
  sotuv: Sotuv;
  qoldiqlar: QoldiqTanlovi[];
  amalBajarilmoqda: boolean;
  onYangilash: (
    sotuvId: string,
    malumot: Partial<SotuvYaratishMalumoti>
  ) => Promise<boolean>;
}) {
  const { t } = useTranslation("savdo_tafsilot");
  const items = sotuv.items ?? [];
  const backendJami = sotuvSummasi(sotuv);
  const qatorlarJami = qatorlarYigindisi(sotuv, items, mahsulotJami, backendJami);
  const jami = items.length > 0 ? qatorlarJami : backendJami;
  const tasdiqlangan = sotuvHolati(sotuv) === "CONFIRMED";
  const omborNomi = sotuv.warehouse?.name || t("common.info.ombor");
  const omborManzili = sotuv.warehouse?.address || t("common.manzilKiritilmagan");
  const [skladQidiruv, setSkladQidiruv] = useState("");
  const [mahsulotQidiruv, setMahsulotQidiruv] = useState("");
  const [yangiQatorlar, setYangiQatorlar] = useState<YangiTovarQatori[]>([]);
  const [saqlashgaUrinildi, setSaqlashgaUrinildi] = useState(false);
  const [omborPopover, setOmborPopover] = useState<{
    key: string;
    left: number;
    top: number;
    quantity: number;
    title: string;
    subtitle: string;
  } | null>(null);
  const [mahsulotPopover, setMahsulotPopover] = useState<{
    key: string;
    left: number;
    top: number;
  } | null>(null);

  const yangiQatorJami = yangiQatorlar.reduce(
    (summa, qator) => summa + qator.quantity * qator.price - son(qator.discount),
    0
  );
  const umumiyJami = jami + yangiQatorJami;
  const umumiyChegirma =
    qatorlarYigindisi(sotuv, items, (item) => son(item.discount), sotuvChegirmaSummasi(sotuv)) +
    yangiQatorlar.reduce((summa, qator) => summa + son(qator.discount), 0);
  const chegirmasizJami = umumiyJami + umumiyChegirma;
  const qidirilganQoldiqlar = qoldiqlar
    .filter((qoldiq) => !sotuv.warehouseId || !qoldiq.warehouseId || qoldiq.warehouseId === sotuv.warehouseId)
    .filter((qoldiq) => {
      const qiymat = mahsulotQidiruv.trim().toLowerCase();
      if (!qiymat) return true;
      return [qoldiqNomi(qoldiq), qoldiq.modification?.barcode, qoldiq.modification?.article, qoldiq.warehouse?.name]
        .join(" ")
        .toLowerCase()
        .includes(qiymat);
    });

  function yangiMahsulotQatoriQoshish() {
    const id = `yangi-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setYangiQatorlar((rows) => [
      ...rows,
      {
        id,
        modificationId: "",
        quantity: 1,
        price: 0,
        priceLocked: false,
        discount: 0,
        availableQty: 0,
        warehouseName: omborNomi,
        warehouseAddress: omborManzili,
      },
    ]);
  }

  function yangiQatorniYangilash(id: string, patch: Partial<YangiTovarQatori>) {
    setYangiQatorlar((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function qoldiqniTanlash(qatorId: string, qoldiq: QoldiqTanlovi) {
    const katalogNarxi = qoldiqNarxi(qoldiq);
    yangiQatorniYangilash(qatorId, {
      modificationId: qoldiq.modificationId,
      price: katalogNarxi,
      priceLocked: katalogNarxi > 0,
      availableQty: qoldiqMiqdori(qoldiq),
      warehouseName: qoldiq.warehouse?.name || omborNomi,
      warehouseAddress: qoldiq.warehouse?.address || omborManzili,
      modification: qoldiq.modification
        ? {
            id: qoldiq.modification.id,
            name: qoldiq.modification.name,
            product: qoldiq.modification.product,
          }
        : undefined,
    });
    setMahsulotPopover(null);
    setMahsulotQidiruv("");
  }

  function yangiQatorNomi(qator: YangiTovarQatori) {
    return qator.modification?.product?.name ?? qator.modification?.name ?? "";
  }

  function formatlanganRaqam(value: number) {
    if (!value) return "";
    return new Intl.NumberFormat("en-US").format(value);
  }

  function raqamniAjratish(value: string) {
    return Number(value.replace(/[^\d]/g, "") || 0);
  }

  function yangiQatorXatolari(qator: YangiTovarQatori) {
    return {
      mahsulot: !qator.modificationId ? t("tovarlarTab.errors.mahsulotniTanlang") : "",
      narx: qator.price <= 0 ? t("tovarlarTab.errors.narxKatta") : "",
      miqdor:
        qator.quantity <= 0
          ? t("tovarlarTab.errors.miqdorKatta")
          : qator.availableQty > 0 && qator.quantity > qator.availableQty
            ? t("tovarlarTab.errors.miqdorOshmasin", { qty: formatlanganRaqam(qator.availableQty) })
            : "",
      ombor: !qator.warehouseName ? t("tovarlarTab.errors.omborniTanlang") : "",
      chegirma:
        qator.discount > 0 && qator.discount > qator.quantity * qator.price
          ? t("tovarlarTab.errors.chegirmaOshmasin")
          : "",
    };
  }

  function qatorValid(qator: YangiTovarQatori) {
    const xatolar = yangiQatorXatolari(qator);
    return !xatolar.mahsulot && !xatolar.narx && !xatolar.miqdor && !xatolar.ombor && !xatolar.chegirma;
  }

  function itemQoldiginiTopish(item: SotuvItem) {
    const warehouseId = sotuv.warehouseId ?? sotuv.warehouse?.id;
    const birXilModifikatsiya = qoldiqlar.filter(
      (qoldiq) => qoldiq.modificationId === item.modificationId
    );

    return (
      birXilModifikatsiya.find(
        (qoldiq) =>
          !warehouseId ||
          qoldiq.warehouseId === warehouseId ||
          qoldiq.warehouse?.id === warehouseId
      ) ?? birXilModifikatsiya[0]
    );
  }

  async function yangiQatorlarniSaqlash() {
    setSaqlashgaUrinildi(true);
    const yaroqsizQator = yangiQatorlar.find((qator) => !qatorValid(qator));

    if (yaroqsizQator) {
      return;
    }

    const muvaffaqiyatli = await onYangilash(sotuv.id, {
      items: [
        ...items.map((item) => ({
          modificationId: item.modificationId,
          // Pochka kabi birlikda sotilgan qator birlikdagi son va narx bilan qayta yuboriladi (summa va birlik o'zgarmaydi).
          ...qatorniQaytaYuborish(item),
          discount: son(item.discount),
          ...farqliValyuta(qatorValyutasi(item, sotuv), sotuv),
        })),
        ...yangiQatorlar.map((qator) => ({
          modificationId: qator.modificationId,
          quantity: qator.quantity,
          price: qator.price,
          discount: qator.discount ?? 0,
        })),
      ],
    });

    if (muvaffaqiyatli) {
      setYangiQatorlar([]);
      setSaqlashgaUrinildi(false);
    }
  }

  function omborPopupOchish(
    key: string,
    element: HTMLElement,
    quantity: number,
    title: string,
    subtitle: string
  ) {
    const rect = element.getBoundingClientRect();
    setSkladQidiruv("");
    setOmborPopover((current) =>
      current?.key === key
        ? null
        : {
            key,
            left: Math.min(rect.left, window.innerWidth - 390),
            top: rect.bottom + 8,
            quantity,
            title,
            subtitle,
          }
    );
  }

  const jadvalUstunlari = "grid-cols-[70px_420px_170px_190px_240px_180px_220px_170px_180px]";

  return (
    <div className="px-7 py-7">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={yangiMahsulotQatoriQoshish}
            className="rounded-xl bg-[#2563EB] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#1D4ED8] hover:shadow-lg hover:shadow-orange-500/20"
          >
            {t("tovarlarTab.mahsulotQoshish")}
          </button>
        </div>
        <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm transition hover:text-[#2563EB]">
          <MoreHorizontal size={20} />
        </button>
        {yangiQatorlar.length > 0 && (
          <button
            type="button"
            disabled={amalBajarilmoqda}
            onClick={() => void yangiQatorlarniSaqlash()}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {amalBajarilmoqda && <LoaderCircle size={16} className="animate-spin" />}
            {t("tovarlarTab.saqlash")}
          </button>
        )}
      </div>

      <section className="rounded-2xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[1870px]">
            <div className={`grid ${jadvalUstunlari} gap-x-5 border-b border-slate-200 bg-white px-7 py-5 text-sm text-slate-600`}>
              <span>{t("tovarlarTab.sozlama")}</span>
              <span>{t("common.jadval.mahsulot")}</span>
              <span>{t("common.jadval.narx")}</span>
              <span>{t("common.jadval.miqdor")}</span>
              <span>{t("common.jadval.ombor")}</span>
              <span>{t("common.jadval.mavjudQoldiq")}</span>
              <span>{t("common.jadval.rezervda")}</span>
              <span>{t("common.jadval.ombordanChiqdi")}</span>
              <span>{t("common.jadval.summa")}</span>
            </div>

            {items.map((item, index) => {
              const itemJami = mahsulotJami(item);
              const itemNarxi = qatorBirligida(item).narx;
              const ombordanChiqdi = tasdiqlangan ? item.quantity : 0;
              const rezerv = tasdiqlangan ? 0 : item.quantity;
              const omborKey = item.id ?? `${item.modificationId}-${index}`;
              const itemQoldiq = itemQoldiginiTopish(item);
              const mavjudQoldiq = itemQoldiq ? qoldiqMiqdori(itemQoldiq) : 0;
              const itemOmborNomi = itemQoldiq?.warehouse?.name || omborNomi;
              const itemOmborManzili = itemQoldiq?.warehouse?.address || omborManzili;

              return (
                <div
                  key={omborKey}
                  className={`grid ${jadvalUstunlari} items-center gap-x-5 border-b border-slate-100 px-7 py-4 text-sm text-slate-700`}
                >
                  <div className="flex items-center gap-4 text-slate-400">
                    <span className="text-lg">☰</span>
                    <span>{index + 1}.</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-12 min-w-0 flex-1 items-center rounded-md border border-slate-300 bg-white px-3">
                      <span className="min-w-0 flex-1 truncate text-slate-800">{mahsulotNomi(item, t)}</span>
                      <ChevronDown size={18} className="-rotate-90 text-slate-400" />
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-sky-300 text-slate-400">
                      <ImageIcon size={19} />
                    </div>
                  </div>

                  <div>
                    <div className="flex h-12 items-center justify-end rounded-md border border-slate-300 bg-white px-3">
                      {pulniFormatlash(itemNarxi, qatorValyutasi(item, sotuv))}
                    </div>
                    {son(item.discount) > 0 && (
                      <span className="mt-1 block text-right text-xs font-semibold text-lime-700">
                        {t("tovarlarTab.chegirmaQatori", { summa: pulniFormatlash(son(item.discount), qatorValyutasi(item, sotuv)) })}
                      </span>
                    )}
                  </div>

                  <div className="flex h-12 items-center justify-end gap-2 rounded-md border border-slate-300 bg-white px-3">
                    <span>{qatorBirligida(item).miqdor}</span>
                    <span className="text-slate-400">{qatorBirligida(item).birlik ?? t("common.dona")}</span>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => omborPopupOchish(omborKey, event.currentTarget, mavjudQoldiq, itemOmborNomi, itemOmborManzili)}
                    className="flex h-12 w-full items-center gap-3 rounded-md border border-slate-300 bg-white px-3 text-left transition hover:border-orange-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10"
                  >
                    <span className="min-w-0 flex-1 truncate">{itemOmborNomi}</span>
                    <Search size={18} className="text-slate-500" />
                  </button>

                  <span className="text-[#2563EB] underline underline-offset-4">{Math.max(mavjudQoldiq, 0)} {t("common.dona")}</span>

                  <div>
                    <div className="flex h-12 items-center justify-end rounded-md border border-slate-300 bg-white px-3">{rezerv}</div>
                    {!tasdiqlangan && <span className="mt-1 block text-right text-xs text-[#2563EB] underline underline-offset-4">{t("tovarlarTab.qoralama")}</span>}
                  </div>

                  <span>{ombordanChiqdi} {t("common.dona")}</span>
                  <span className="font-bold text-emerald-600">{pulniFormatlash(itemJami, qatorValyutasi(item, sotuv))}</span>
                </div>
              );
            })}

            {yangiQatorlar.map((qator, index) => {
              const qatorNomi = yangiQatorNomi(qator);
              const qatorJami = qator.quantity * qator.price - Number(qator.discount ?? 0);
              const qatorRaqami = items.length + index + 1;
              const xatolar = yangiQatorXatolari(qator);
              const xatoKorsatish = saqlashgaUrinildi;

              return (
                <div
                  key={qator.id}
                  className={`grid ${jadvalUstunlari} items-start gap-x-5 border-b border-orange-100 bg-orange-50/30 px-7 py-4 text-sm text-slate-700`}
                >
                  <div className="flex items-center gap-4 text-slate-400">
                    <span className="text-lg">☰</span>
                    <span>{qatorRaqami}.</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={(event) => {
                          const rect = event.currentTarget.getBoundingClientRect();
                          setMahsulotQidiruv("");
                          setMahsulotPopover((current) =>
                            current?.key === qator.id
                              ? null
                              : { key: qator.id, left: Math.min(rect.left, window.innerWidth - 720), top: rect.bottom + 8 }
                          );
                        }}
                        className={`flex h-12 min-w-0 flex-1 items-center rounded-md border bg-white px-3 text-left transition hover:border-orange-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 ${
                          xatoKorsatish && xatolar.mahsulot ? "border-red-400 ring-4 ring-red-100" : "border-slate-300"
                        }`}
                      >
                        <span className={`min-w-0 flex-1 truncate ${qatorNomi ? "text-slate-800" : "text-slate-400"}`}>
                          {qatorNomi || t("tovarlarTab.mahsulotToping")}
                        </span>
                        <Search size={18} className="text-slate-500" />
                      </button>
                      <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-sky-300 text-slate-400">
                        <ImageIcon size={19} />
                      </div>
                    </div>
                    {xatoKorsatish && xatolar.mahsulot && (
                      <p className="mt-1.5 text-xs font-semibold text-red-500">{xatolar.mahsulot}</p>
                    )}
                  </div>

                  <div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={qator.price ? `${formatlanganRaqam(qator.price)} so'm` : ""}
                      readOnly={qator.priceLocked}
                      title={qator.priceLocked ? t("tovarlarTab.narxQulflangan") : undefined}
                      onChange={(event) => yangiQatorniYangilash(qator.id, { price: raqamniAjratish(event.target.value) })}
                      onFocus={(event) => event.currentTarget.select()}
                      placeholder="0 so'm"
                      className={`h-12 w-full rounded-md border px-3 text-right outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 ${
                        qator.priceLocked ? "cursor-not-allowed bg-slate-50 text-slate-500" : "bg-white"
                      } ${xatoKorsatish && xatolar.narx ? "border-red-400 ring-4 ring-red-100" : "border-slate-300"}`}
                    />
                    {xatoKorsatish && xatolar.narx && (
                      <p className="mt-1.5 text-xs font-semibold text-red-500">{xatolar.narx}</p>
                    )}
                    <input
                      type="text"
                      inputMode="numeric"
                      aria-label={t("tovarlarTab.chegirmaPlaceholder")}
                      value={qator.discount ? `${formatlanganRaqam(qator.discount)} so'm` : ""}
                      onChange={(event) => yangiQatorniYangilash(qator.id, { discount: raqamniAjratish(event.target.value) })}
                      onFocus={(event) => event.currentTarget.select()}
                      placeholder={t("tovarlarTab.chegirmaPlaceholder")}
                      className={`mt-2 h-10 w-full rounded-md border bg-white px-3 text-right text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 ${
                        xatoKorsatish && xatolar.chegirma ? "border-red-400 ring-4 ring-red-100" : "border-slate-300"
                      }`}
                    />
                    {xatoKorsatish && xatolar.chegirma && (
                      <p className="mt-1.5 text-xs font-semibold text-red-500">{xatolar.chegirma}</p>
                    )}
                  </div>

                  <div>
                    <div
                      className={`flex h-12 items-center gap-2 rounded-md border bg-white px-3 transition ${
                        xatoKorsatish && xatolar.miqdor ? "border-red-400 ring-4 ring-red-100" : "border-slate-300"
                      }`}
                    >
                      <input
                        type="text"
                        inputMode="numeric"
                        value={qator.quantity ? formatlanganRaqam(qator.quantity) : ""}
                        onChange={(event) => yangiQatorniYangilash(qator.id, { quantity: raqamniAjratish(event.target.value) })}
                        onFocus={(event) => event.currentTarget.select()}
                        placeholder="1"
                        className="min-w-0 flex-1 bg-transparent text-right outline-none"
                      />
                      <span className="text-slate-400">{t("common.dona")}</span>
                    </div>
                    {xatoKorsatish && xatolar.miqdor && (
                      <p className="mt-1.5 text-xs font-semibold text-red-500">{xatolar.miqdor}</p>
                    )}
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={(event) =>
                        omborPopupOchish(
                          `yangi-ombor-${qator.id}`,
                          event.currentTarget,
                          qator.availableQty,
                          qator.warehouseName || omborNomi,
                          qator.warehouseAddress || omborManzili
                        )
                      }
                      className={`flex h-12 w-full items-center gap-3 rounded-md border bg-white px-3 text-left transition hover:border-orange-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 ${
                        xatoKorsatish && xatolar.ombor ? "border-red-400 ring-4 ring-red-100" : "border-slate-300"
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate">{qator.warehouseName || omborNomi}</span>
                      <Search size={18} className="text-slate-500" />
                    </button>
                    {xatoKorsatish && xatolar.ombor && (
                      <p className="mt-1.5 text-xs font-semibold text-red-500">{xatolar.ombor}</p>
                    )}
                  </div>

                  <span className="text-[#2563EB] underline underline-offset-4">{Math.max(qator.availableQty, 0)} {t("common.dona")}</span>
                  <div className="flex h-12 items-center justify-end rounded-md border border-slate-300 bg-white px-3">0</div>
                  <span>0 {t("common.dona")}</span>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-emerald-600">{pulniFormatlash(qatorJami)}</span>
                    <button
                      type="button"
                      onClick={() => setYangiQatorlar((rows) => rows.filter((row) => row.id !== qator.id))}
                      className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-500 transition hover:bg-red-100"
                    >
                      {t("tovarlarTab.ochirish")}
                    </button>
                  </div>
                </div>
              );
            })}

            {items.length === 0 && yangiQatorlar.length === 0 && (
              <div className="px-7 py-20 text-center text-slate-400">{t("tovarlarTab.mahsulotYoq")}</div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 px-7 py-8">
          <div className="ml-auto max-w-md space-y-4 text-right text-slate-600">
            <p>{t("common.totals.chegirmaSoliqsiz")} <span className="ml-8">{pulniFormatlash(chegirmasizJami, sotuvValyutasi(sotuv))}</span></p>
            <p>{t("common.totals.yetkazishSummasi")} <span className="ml-8">{pulniFormatlash(0, sotuvValyutasi(sotuv))}</span></p>
            <p className="text-lime-700">{t("common.totals.chegirmaSummasi")} <span className="ml-8">{pulniFormatlash(umumiyChegirma, sotuvValyutasi(sotuv))}</span></p>
            <p>{t("common.totals.soliqsizSumma")} <span className="ml-8">{pulniFormatlash(umumiyJami, sotuvValyutasi(sotuv))}</span></p>
            <p>{t("common.totals.soliqSummasi")} <span className="ml-8">{pulniFormatlash(0, sotuvValyutasi(sotuv))}</span></p>
            <div className="border-t border-slate-200 pt-5 text-2xl font-bold text-slate-700">
              {t("common.totals.umumiySumma")} <span className="ml-8">{pulniFormatlash(umumiyJami, sotuvValyutasi(sotuv))}</span>
            </div>
          </div>
        </div>
      </section>

      {mahsulotPopover && (
        <>
          <button
            type="button"
            aria-label={t("tovarlarTab.mahsulotOynasiniYopish")}
            className="fixed inset-0 z-[100000] cursor-default bg-transparent"
            onClick={() => setMahsulotPopover(null)}
          />
          <div
            className="fixed z-[100001] w-[690px] rounded-2xl bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,0.2)] ring-1 ring-slate-100"
            style={{ left: mahsulotPopover.left, top: mahsulotPopover.top }}
          >
            <label className="mb-3 flex h-12 items-center gap-2 rounded-xl border border-orange-400 bg-white px-4 ring-4 ring-orange-500/10">
              <input
                value={mahsulotQidiruv}
                onChange={(event) => setMahsulotQidiruv(event.target.value)}
                placeholder={t("tovarlarTab.mahsulotToping")}
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                autoFocus
              />
              {mahsulotQidiruv ? (
                <button type="button" onClick={() => setMahsulotQidiruv("")} className="text-slate-400 transition hover:text-slate-700">
                  <X size={17} />
                </button>
              ) : (
                <Search size={18} className="text-slate-400" />
              )}
            </label>

            <div className="max-h-[340px] overflow-y-auto rounded-xl bg-white">
              {qidirilganQoldiqlar.length > 0 ? (
                qidirilganQoldiqlar.map((qoldiq) => {
                  const miqdor = qoldiqMiqdori(qoldiq);
                  const narx = qoldiqNarxi(qoldiq);
                  const nom = qoldiqNomi(qoldiq);
                  return (
                    <button
                      key={`${qoldiq.warehouseId ?? qoldiq.warehouse?.id ?? "ombor"}-${qoldiq.modificationId}`}
                      type="button"
                      onClick={() => qoldiqniTanlash(mahsulotPopover.key, qoldiq)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-orange-50"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50 text-[#2563EB]">
                        <Package size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold text-slate-800">
                          {nom} <span className="font-normal text-slate-400">{miqdor} {t("common.dona")}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-400">
                          {qoldiq.warehouse?.name || omborNomi}
                          {qoldiqTavsifi(qoldiq, t) ? ` · ${qoldiqTavsifi(qoldiq, t)}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-bold text-slate-700">{pulniFormatlash(narx)}</span>
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-10 text-center text-sm text-slate-400">{t("tovarlarTab.qoldiqdaTopilmadi")}</div>
              )}
            </div>
          </div>
        </>
      )}

      {omborPopover && (
        <>
          <button
            type="button"
            aria-label={t("tovarlarTab.omborOynasiniYopish")}
            className="fixed inset-0 z-[100000] cursor-default bg-transparent"
            onClick={() => setOmborPopover(null)}
          />
          <div
            className="fixed z-[100001] w-[360px] rounded-2xl bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.18)] ring-1 ring-slate-100"
            style={{ left: omborPopover.left, top: omborPopover.top }}
          >
            <label className="mb-2 flex h-11 items-center gap-2 rounded-xl border border-orange-400 bg-white px-3 ring-4 ring-orange-500/10">
              <input
                value={skladQidiruv}
                onChange={(event) => setSkladQidiruv(event.target.value)}
                placeholder={t("tovarlarTab.omborPlaceholder")}
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                autoFocus
              />
              {skladQidiruv ? (
                <button type="button" onClick={() => setSkladQidiruv("")} className="text-slate-400 transition hover:text-slate-700">
                  <X size={17} />
                </button>
              ) : (
                <Search size={17} className="text-slate-400" />
              )}
            </label>

            <button
              type="button"
              onClick={() => setOmborPopover(null)}
              className="flex w-full items-center gap-3 rounded-xl bg-orange-50 px-3 py-3 text-left transition hover:bg-orange-100"
              title={omborPopover.title}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                <Package size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-slate-800">
                  {omborPopover.title} <span className="font-normal text-slate-400">{omborPopover.quantity} {t("common.dona")}</span>
                </span>
                <span className="mt-0.5 block truncate text-xs text-slate-400">{omborPopover.subtitle}</span>
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function EskiTovarlarTab({ sotuv }: { sotuv: Sotuv }) {
  const { t } = useTranslation("savdo_tafsilot");
  const items = sotuv.items ?? [];
  const jami = items.length > 0 ? qatorlarYigindisi(sotuv, items, mahsulotJami, sotuvSummasi(sotuv)) : sotuvSummasi(sotuv);
  const chegirmaSummasi = sotuvChegirmaSummasi(sotuv);
  const tasdiqlangan = sotuvHolati(sotuv) === "CONFIRMED";
  const omborNomi = sotuv.warehouse?.name || t("common.info.ombor");
  const omborManzili = sotuv.warehouse?.address || t("common.manzilKiritilmagan");
  const [skladQidiruv, setSkladQidiruv] = useState("");
  const [omborPopover, setOmborPopover] = useState<{
    key: string;
    left: number;
    top: number;
    quantity: number;
  } | null>(null);
  const omborKorinsin =
    !skladQidiruv.trim() ||
    omborNomi.toLowerCase().includes(skladQidiruv.trim().toLowerCase()) ||
    omborManzili.toLowerCase().includes(skladQidiruv.trim().toLowerCase());

  return (
    <div className="px-7 py-7">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <button className="rounded-xl bg-[#2563EB] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#1D4ED8]">
            {t("eskiTovarlarTab.mahsulotQoshish")}
          </button>
          <button className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-600 shadow-sm transition hover:text-[#2563EB]">
            {t("eskiTovarlarTab.mahsulotTanlash")}
          </button>
        </div>
        <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm transition hover:text-[#2563EB]">
          <MoreHorizontal size={20} />
        </button>
      </div>

      <section className="rounded-2xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[1380px]">
            <div className="grid grid-cols-[70px_420px_170px_190px_240px_180px_220px_170px_180px] gap-x-4 border-b border-slate-200 bg-white px-7 py-5 text-sm text-slate-600">
              <span>⚙</span>
              <span>{t("common.jadval.mahsulot")}</span>
              <span>{t("common.jadval.narx")}</span>
              <span>{t("common.jadval.miqdor")}</span>
              <span>{t("common.jadval.ombor")}</span>
              <span>{t("common.jadval.mavjudQoldiq")}</span>
              <span>{t("common.jadval.rezervda")}</span>
              <span>{t("common.jadval.ombordanChiqdi")}</span>
              <span>{t("common.jadval.summa")}</span>
            </div>

            {items.map((item, index) => {
              const itemJami = mahsulotJami(item);
              const ombordanChiqdi = tasdiqlangan ? item.quantity : 0;
              const rezerv = tasdiqlangan ? 0 : item.quantity;
              const omborKey = item.id ?? `${item.modificationId}-${index}`;
              const omborOchilgan = omborPopover?.key === omborKey;

              return (
                <div
                  key={omborKey}
                  className="grid grid-cols-[70px_420px_170px_190px_240px_180px_220px_170px_180px] items-center gap-x-4 border-b border-slate-100 px-7 py-4 text-sm text-slate-700"
                >
                  <div className="flex items-center gap-4 text-slate-400">
                    <span className="text-lg">≡</span>
                    <span>{index + 1}.</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-12 min-w-0 flex-1 items-center rounded-md border border-slate-300 bg-white px-3">
                      <span className="min-w-0 flex-1 truncate text-slate-800">{mahsulotNomi(item, t)}</span>
                      <ChevronDown size={18} className="-rotate-90 text-slate-400" />
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-sky-300 text-slate-400">
                      <ImageIcon size={19} />
                    </div>
                  </div>

                  <div className="flex h-12 items-center justify-end rounded-md border border-slate-300 bg-white px-3">
                    {pulniFormatlash(qatorBirligida(item).narx, qatorValyutasi(item, sotuv))}
                  </div>

                  <div className="flex h-12 items-center justify-end gap-2 rounded-md border border-slate-300 bg-white px-3">
                    <span>{qatorBirligida(item).miqdor}</span>
                    <span className="text-slate-400">{qatorBirligida(item).birlik ?? t("common.dona")}</span>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      const rect = event.currentTarget.getBoundingClientRect();
                      setSkladQidiruv("");
                      setOmborPopover((current) =>
                        current?.key === omborKey
                          ? null
                          : {
                              key: omborKey,
                              left: Math.min(rect.left, window.innerWidth - 390),
                              top: rect.bottom + 8,
                              quantity: son(item.quantity),
                            }
                      );
                    }}
                    className={`flex h-12 w-full items-center gap-3 rounded-md border bg-white px-3 text-left transition ${
                      omborOchilgan ? "border-orange-400 ring-4 ring-orange-500/10" : "border-slate-300 hover:border-orange-300"
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate">{omborNomi}</span>
                    <Search size={18} className="text-slate-500" />
                  </button>

                  <a className="text-[#2563EB] underline underline-offset-4" href="#">
                    {Math.max(son(item.quantity), 0)} {t("common.dona")}
                  </a>

                  <div>
                    <div className="flex h-12 items-center justify-end rounded-md border border-slate-300 bg-white px-3">
                      {rezerv}
                    </div>
                    {!tasdiqlangan && (
                      <a className="mt-1 block text-right text-xs text-[#2563EB] underline underline-offset-4" href="#">
                        {t("eskiTovarlarTab.qoralama")}
                      </a>
                    )}
                  </div>

                  <span>{ombordanChiqdi} {t("common.dona")}</span>
                  <span className="font-bold text-emerald-600">{pulniFormatlash(itemJami, qatorValyutasi(item, sotuv))}</span>
                </div>
              );
            })}

            {items.length === 0 && (
              <div className="px-7 py-20 text-center text-slate-400">
                {t("eskiTovarlarTab.mahsulotYoq")}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 px-7 py-8">
          <div className="ml-auto max-w-md space-y-4 text-right text-slate-600">
            <p>{t("common.totals.chegirmaSoliqsiz")} <span className="ml-8">{pulniFormatlash(jami + chegirmaSummasi, sotuvValyutasi(sotuv))}</span></p>
            <p>{t("common.totals.yetkazishSummasi")} <span className="ml-8">{pulniFormatlash(0, sotuvValyutasi(sotuv))}</span></p>
            <p className="text-lime-700">{t("common.totals.chegirmaSummasi")} <span className="ml-8">{pulniFormatlash(chegirmaSummasi, sotuvValyutasi(sotuv))}</span></p>
            <p>{t("common.totals.soliqsizSumma")} <span className="ml-8">{pulniFormatlash(jami, sotuvValyutasi(sotuv))}</span></p>
            <p>{t("common.totals.soliqSummasi")} <span className="ml-8">{pulniFormatlash(0, sotuvValyutasi(sotuv))}</span></p>
            <div className="border-t border-slate-200 pt-5 text-2xl font-bold text-slate-700">
              {t("common.totals.umumiySumma")} <span className="ml-8">{pulniFormatlash(jami, sotuvValyutasi(sotuv))}</span>
            </div>
          </div>
        </div>
      </section>

      {omborPopover && (
        <>
          <button
            type="button"
            aria-label={t("eskiTovarlarTab.omborOynasiniYopish")}
            className="fixed inset-0 z-[100000] cursor-default bg-transparent"
            onClick={() => setOmborPopover(null)}
          />
          <div
            className="fixed z-[100001] w-[360px] rounded-2xl bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.18)] ring-1 ring-slate-100"
            style={{ left: omborPopover.left, top: omborPopover.top }}
          >
            <label className="mb-2 flex h-11 items-center gap-2 rounded-xl border border-orange-400 bg-white px-3 ring-4 ring-orange-500/10">
              <input
                value={skladQidiruv}
                onChange={(event) => setSkladQidiruv(event.target.value)}
                placeholder={t("eskiTovarlarTab.omborPlaceholder")}
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                autoFocus
              />
              {skladQidiruv ? (
                <button type="button" onClick={() => setSkladQidiruv("")} className="text-slate-400 transition hover:text-slate-700">
                  <X size={17} />
                </button>
              ) : (
                <Search size={17} className="text-slate-400" />
              )}
            </label>

            <div className="max-h-[210px] overflow-y-auto rounded-xl bg-white">
              {omborKorinsin ? (
                <button
                  type="button"
                  onClick={() => setOmborPopover(null)}
                  className="flex w-full items-center gap-3 rounded-xl bg-orange-50 px-3 py-3 text-left transition hover:bg-orange-100"
                  title={omborNomi}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                    <Package size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-slate-800">
                      {omborNomi} <span className="font-normal text-slate-400">{omborPopover.quantity} {t("common.dona")}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-400">{omborManzili}</span>
                  </span>
                </button>
              ) : (
                <div className="px-3 py-8 text-center text-sm text-slate-400">
                  {t("eskiTovarlarTab.biriktirilganOmborTopilmadi")}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function yetkazishFormasiniYigish(data: YetkazishMalumoti | null, sotuv: Sotuv) {
  return {
    recipientName: data?.recipientName ?? mijozNomi(sotuv),
    recipientPhone: data?.recipientPhone ?? mijozTelefon(sotuv),
    address: data?.address ?? mijozManzili(sotuv),
    courierName: data?.courierName ?? "",
    cost: data?.cost == null ? "" : String(data.cost),
    scheduledAt: data?.scheduledAt ? data.scheduledAt.slice(0, 16) : "",
    note: data?.note ?? "",
  };
}

function crmXabarniFaoliyatga(message: ChatMessage, t: TFunction): SaqlanganFaoliyat {
  return {
    id: message.id ?? `chat-${message.createdAt ?? "unknown"}`,
    turi: "Xabar",
    sarlavha: message.direction === "IN" ? t("umumiyTab.faoliyat.mijozdanXabar") : t("umumiyTab.faoliyat.xabarYuborildi"),
    matn: message.text ?? "",
    sana: message.createdAt ?? new Date().toISOString(),
  };
}

function YetkazishPanel({ sotuv, jami, onClose }: { sotuv: Sotuv; jami: number; onClose: () => void }) {
  const { t } = useTranslation("savdo_tafsilot");
  const items = sotuv.items ?? [];
  const [yetkazish, setYetkazish] = useState<YetkazishMalumoti | null>(null);
  const [forma, setForma] = useState({ recipientName: "", recipientPhone: "", address: "", courierName: "", cost: "", scheduledAt: "", note: "" });
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [xato, setXato] = useState("");

  function formaniToldirish(data: YetkazishMalumoti | null) {
    setForma(yetkazishFormasiniYigish(data, sotuv));
  }

  useEffect(() => {
    let bekorQilindi = false;
    setYuklanmoqda(true);
    void yetkazishniOlish(sotuv.id)
      .then((data) => {
        if (bekorQilindi) return;
        setYetkazish(data);
        setForma(yetkazishFormasiniYigish(data, sotuv));
      })
      .catch((error) => !bekorQilindi && setXato(getApiErrorMessage(error)))
      .finally(() => !bekorQilindi && setYuklanmoqda(false));
    return () => { bekorQilindi = true; };
  }, [sotuv]);

  function payloadniYigish(): YetkazishPayload {
    const qiymat = (value: string) => value.trim() || undefined;
    return {
      recipientName: qiymat(forma.recipientName),
      recipientPhone: qiymat(forma.recipientPhone),
      address: qiymat(forma.address),
      courierName: qiymat(forma.courierName),
      cost: forma.cost === "" ? undefined : Number(forma.cost),
      scheduledAt: forma.scheduledAt ? new Date(forma.scheduledAt).toISOString() : undefined,
      note: qiymat(forma.note),
    };
  }

  async function saqlash() {
    setSaqlanmoqda(true); setXato("");
    try {
      const data = yetkazish
        ? await yetkazishniYangilash(sotuv.id, payloadniYigish())
        : await yetkazishYaratish(sotuv.id, payloadniYigish());
      await Promise.all([sotuvTafsilotiniOlish(sotuv.id), sotuvTarixiniOlish(sotuv.id)]);
      setYetkazish(data); formaniToldirish(data);
    } catch (error) { setXato(getApiErrorMessage(error)); }
    finally { setSaqlanmoqda(false); }
  }

  async function holatAmali(action: "dispatch" | "complete" | "cancel") {
    setSaqlanmoqda(true); setXato("");
    try {
      const data = action === "dispatch"
        ? await yetkazishniJonatish(sotuv.id)
        : action === "complete"
          ? await yetkazishniYakunlash(sotuv.id)
          : await yetkazishniBekorQilish(sotuv.id);
      await Promise.all([sotuvTafsilotiniOlish(sotuv.id), sotuvTarixiniOlish(sotuv.id)]);
      setYetkazish(data); formaniToldirish(data);
    } catch (error) { setXato(getApiErrorMessage(error)); }
    finally { setSaqlanmoqda(false); }
  }

  return (
    <div className="absolute inset-0 z-50 bg-blue-950/70 backdrop-blur-[1px]">
      <button
        onClick={onClose}
        className="absolute left-[280px] top-7 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-sky-500 text-white shadow-xl hover:bg-sky-600"
        aria-label={t("yetkazishPanel.oynaniYopish")}
      >
        <X size={20} />
      </button>
      <div className="scrollbar-hidden ml-[338px] h-full overflow-y-auto rounded-l-3xl bg-[#eef3f6] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-3xl font-semibold text-slate-900">{t("yetkazishPanel.sarlavha")}</h2>
          <div className="flex gap-3">
            <button className="rounded-lg bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">{t("yetkazishPanel.buyurtmaniSozlash")}</button>
            <button className="rounded-lg bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">{t("yetkazishPanel.fikrMulohaza")}</button>
          </div>
        </div>

        <div className="mt-8 grid gap-7 lg:grid-cols-[270px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <span className="inline-flex rounded-full bg-slate-500 px-4 py-1.5 text-sm font-bold text-white">{t("yetkazishPanel.badge")}</span>
            <div className="h-px bg-slate-300" />
            {[
              t("yetkazishPanel.sidebar.kompaniyaAloqalari"),
              t("yetkazishPanel.sidebar.skriptTaklif"),
              t("yetkazishPanel.sidebar.qandayIshlaydi"),
              t("yetkazishPanel.sidebar.buyurtmaniSozlash"),
            ].map((item) => (
              <button key={item} className="block text-left text-sm text-slate-500 hover:text-sky-600">
                {item}
              </button>
            ))}
          </aside>

          <main className="space-y-3">
            <Qadam number={1} active title={t("yetkazishPanel.qadamTovarlar")}>
              <div className="mt-6 flex items-center gap-6 text-sm">
                <button className="text-blue-600 underline underline-offset-4">{t("yetkazishPanel.qoshish")}</button>
                <button className="text-slate-500">{t("yetkazishPanel.katalogdanTanlash")}</button>
              </div>
              <div className="mt-8 space-y-4">
                {items.length > 0 ? (
                  items.map((item, index) => (
                    <div key={item.id ?? `${item.modificationId}-${index}`} className="grid gap-5 lg:grid-cols-[1fr_84px_120px_90px_120px]">
                      <label className="text-sm text-slate-600">
                        {t("yetkazishPanel.mahsulot")}
                        <div className="mt-2 flex h-12 items-center rounded-md border border-slate-300 bg-white px-3">
                          <span className="min-w-0 flex-1 truncate text-slate-600">{mahsulotNomi(item, t)}</span>
                          <Search size={19} className="text-slate-500" />
                        </div>
                      </label>
                      <div className="mt-7 flex h-12 items-center justify-center rounded-md border border-dashed border-slate-300 text-slate-400">
                        <ImageIcon size={20} />
                      </div>
                      <Maydon label={t("yetkazishPanel.narxi")} value={pulniFormatlash(item.price, qatorValyutasi(item, sotuv))} />
                      <Maydon label={t("yetkazishPanel.miqdori")} value={String(item.quantity)} />
                      <Maydon label={t("yetkazishPanel.natija")} value={pulniFormatlash(mahsulotJami(item), qatorValyutasi(item, sotuv))} />
                    </div>
                  ))
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-400">{t("common.tovarlarYoq")}</p>
                )}
              </div>
              <div className="mt-10 border-t border-slate-200 pt-8">
                <div className="ml-auto max-w-md space-y-4 text-right text-slate-600">
                  <p>{t("yetkazishPanel.tovarlarSummasi")} <span className="ml-8">{pulniFormatlash(jami, sotuvValyutasi(sotuv))}</span></p>
                  <p className="text-lime-700">{t("yetkazishPanel.mijozFoydasiLabel")} <span className="ml-8">{pulniFormatlash(0, sotuvValyutasi(sotuv))}</span></p>
                  <div className="border-t border-slate-200 pt-4 text-2xl font-bold">
                    {t("yetkazishPanel.jami")} <span className="ml-8">{pulniFormatlash(jami, sotuvValyutasi(sotuv))}</span>
                  </div>
                </div>
              </div>
            </Qadam>

            <Qadam number={2} title={t("yetkazishPanel.qadamYetkazish")}>
              {yuklanmoqda ? (
                <div className="mt-8 flex items-center gap-3 text-slate-500"><LoaderCircle className="animate-spin" size={20} /> {t("yetkazishPanel.malumotYuklanmoqda")}</div>
              ) : (
                <div className="mt-6 max-w-3xl space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-500">
                      {yetkazish ? t("yetkazishPanel.malumotBor") : t("yetkazishPanel.malumotYoq")}
                    </p>
                    {yetkazish && <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-600">{yetkazish.status}</span>}
                  </div>
                  {xato && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{xato}</p>}
                  <div className="grid gap-4 md:grid-cols-2">
                    {([
                      ["recipientName", t("yetkazishPanel.forma.qabulQiluvchi"), "text"], ["recipientPhone", t("yetkazishPanel.forma.telefon"), "tel"],
                      ["address", t("yetkazishPanel.forma.manzil"), "text"], ["courierName", t("yetkazishPanel.forma.kuryer"), "text"],
                      ["cost", t("yetkazishPanel.forma.yetkazishNarxi"), "number"], ["scheduledAt", t("yetkazishPanel.forma.rejalashtirilganVaqt"), "datetime-local"],
                    ] as const).map(([key, label, type]) => (
                      <label key={key} className="text-sm font-semibold text-slate-600">{label}
                        <input type={type} min={type === "number" ? 0 : undefined} value={forma[key]} onChange={(event) => setForma((old) => ({ ...old, [key]: event.target.value }))} disabled={yetkazish?.status === "DELIVERED" || yetkazish?.status === "CANCELLED"} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-orange-400 disabled:bg-slate-100" />
                      </label>
                    ))}
                  </div>
                  <label className="block text-sm font-semibold text-slate-600">{t("yetkazishPanel.forma.izoh")}
                    <textarea value={forma.note} onChange={(event) => setForma((old) => ({ ...old, note: event.target.value }))} disabled={yetkazish?.status === "DELIVERED" || yetkazish?.status === "CANCELLED"} rows={3} className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-orange-400 disabled:bg-slate-100" />
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {(!yetkazish || (yetkazish.status !== "DELIVERED" && yetkazish.status !== "CANCELLED")) && <button type="button" onClick={() => void saqlash()} disabled={saqlanmoqda || (!yetkazish && sotuvHolati(sotuv) !== "CONFIRMED")} className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-black text-white disabled:opacity-40">{yetkazish ? t("yetkazishPanel.saqlash") : t("yetkazishPanel.yetkazishniYaratish")}</button>}
                    {yetkazish?.status === "PENDING" && <button type="button" onClick={() => void holatAmali("dispatch")} disabled={saqlanmoqda} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white">{t("yetkazishPanel.jonatish")}</button>}
                    {yetkazish?.status === "DISPATCHED" && <button type="button" onClick={() => void holatAmali("complete")} disabled={saqlanmoqda} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-black text-white">{t("yetkazishPanel.yetkazildi")}</button>}
                    {(yetkazish?.status === "PENDING" || yetkazish?.status === "DISPATCHED") && <button type="button" onClick={() => void holatAmali("cancel")} disabled={saqlanmoqda} className="rounded-xl bg-red-50 px-5 py-2.5 text-sm font-black text-red-600">{t("yetkazishPanel.bekorQilish")}</button>}
                    {saqlanmoqda && <LoaderCircle className="animate-spin self-center text-orange-500" size={20} />}
                  </div>
                  {!yetkazish && sotuvHolati(sotuv) !== "CONFIRMED" && <p className="text-xs font-semibold text-amber-600">{t("yetkazishPanel.faqatTasdiqlangan")}</p>}
                </div>
              )}
            </Qadam>
          </main>
        </div>
      </div>
    </div>
  );
}

// `onOzgarish`: qoralama tovarlaridagi saqlanmagan o'zgarishlar soni (tahrirlashda) — tashqi oyna yopilishini nazorat qilish uchun.
function OmbordanChiqarishPanel({ sotuv, jami, onClose, onOzgarish }: { sotuv: Sotuv; jami: number; onClose: () => void; onOzgarish?: (soni: number) => void }) {
  return (
    <div className="absolute inset-0 z-[60] bg-[rgba(15,23,42,.45)] backdrop-blur-[1px]">
      <OmbordanChiqarishHujjatMazmuni sotuv={sotuv} jami={jami} onClose={onClose} onOzgarish={onOzgarish} />
    </div>
  );
}

export function OmbordanChiqarishHujjatModal({ sotuv, jami, onClose }: { sotuv: Sotuv; jami: number; onClose: () => void }) {
  const { t } = useTranslation("savdo_tafsilot");
  const [saqlanmaganSoni, setSaqlanmaganSoni] = useState(0);
  const [yopishSorovi, setYopishSorovi] = useState(false);
  return (
    <AppModal className="items-start justify-start bg-[rgba(15,23,42,.50)] p-0 py-4 pl-[88px] pr-4 backdrop-blur-[3px]">
      <div className="relative h-[calc(100vh-32px)] w-full">
        <ModalTezkorPanel sotuv={sotuv} onYopish={() => (saqlanmaganSoni > 0 ? setYopishSorovi(true) : onClose())} />
        <OmbordanChiqarishHujjatMazmuni sotuv={sotuv} jami={jami} onClose={onClose} onOzgarish={setSaqlanmaganSoni} />
        {yopishSorovi && (
          <TasdiqlashOynasi
            ikonka={<TriangleAlert size={26} />}
            ohang="sariq"
            sarlavha={t("qoralamaTahrir.yopishTasdigi.sarlavha")}
            nom={sotuvJadvalId(sotuv)}
            tavsif={t("qoralamaTahrir.yopishTasdigi.tavsif")}
            ortgaMatni={t("qoralamaTahrir.yopishTasdigi.qolish")}
            tasdiqMatni={t("qoralamaTahrir.yopishTasdigi.yopish")}
            jarayonMatni={t("qoralamaTahrir.yopishTasdigi.yopilmoqda")}
            onTasdiq={async () => onClose()}
            onYopish={() => setYopishSorovi(false)}
          />
        )}
      </div>
    </AppModal>
  );
}

function OmbordanChiqarishHujjatMazmuni({
  sotuv,
  jami,
  onClose,
  onOzgarish,
}: {
  sotuv: Sotuv;
  jami: number;
  onClose: () => void;
  onOzgarish?: (soni: number) => void;
}) {
  const { t } = useTranslation("savdo_tafsilot");
  const items = sotuv.items ?? [];
  const tasdiqlangan = sotuvHolati(sotuv) === "CONFIRMED";
  const omborlar = useOmborStore((state) => state.omborlar);
  const omborNomi = sotuvOmborNomi(sotuv, omborlar, t);
  const qoldiqlar = useSavdoStore((state) => state.qoldiqlar);
  const mahsulotlarJami = qatorlarYigindisi(
    sotuv,
    items,
    (item) => son(item.quantity) * son(item.price),
    sotuvSummasi(sotuv) + sotuvChegirmaSummasi(sotuv)
  );
  const chegirmaSummasi = sotuvChegirmaSummasi(sotuv);
  // Ombordan chiqarish sanasi (kun va vaqt): o'tgan kunga yozilgan hujjatda faqat kun.
  const chiqarishSanasi = hujjatVaqtiMatni(sotuv.date ?? sotuv.confirmedAt ?? sotuv.createdAt, sotuv.confirmedAt ?? sotuv.createdAt);
  const nakladnoy = useNakladnoy(sotuv.id, sotuvRaqami(sotuv));

  function itemQoldiginiTopish(item: SotuvItem) {
    const warehouseId = sotuv.warehouseId ?? sotuv.warehouse?.id;
    const birXilModifikatsiya = qoldiqlar.filter((qoldiq) => qoldiq.modificationId === item.modificationId);
    return (
      birXilModifikatsiya.find(
        (qoldiq) => !warehouseId || qoldiq.warehouseId === warehouseId || qoldiq.warehouse?.id === warehouseId
      ) ?? birXilModifikatsiya[0]
    );
  }

  const sotuvniHaqiqiyTasdiqlash = useSavdoStore((state) => state.sotuvniTasdiqlash);
  const [ombordanChiqarishTasdiqlanmoqda, setOmbordanChiqarishTasdiqlanmoqda] = useState(false);
  const [ombordanChiqarishXatosi, setOmbordanChiqarishXatosi] = useState("");
  const [yaqindaTasdiqlandi, setYaqindaTasdiqlandi] = useState(false);

  // Qoralama hujjatni shu oynaning o'zida tahrirlash: barcha mahsulotlar (qo'shish, almashtirish, o'chirish, miqdor, narx, chegirma).
  // Saqlash sotuvni backendda yangilaydi va umumiy ombor ichidagi sotuv o'rnini almashtiradi: sana, summa va mahsulotlar hamma joyda bir xil bo'ladi.
  const qoralama = sotuvHolati(sotuv) === "DRAFT";
  const sotuvniYangilash = useSavdoStore((state) => state.sotuvniYangilash);
  const saqlanmoqda = useSavdoStore((state) => state.amalBajarilmoqda);
  const qoldiqYuklanmoqda = useSavdoStore((state) => state.qoldiqYuklanmoqda);
  const qoldiqlarniYuklash = useSavdoStore((state) => state.qoldiqlarniYuklash);
  const [tahrirRejimi, setTahrirRejimi] = useState(false);
  const [tovarOzgarishlari, setTovarOzgarishlari] = useState(0);
  const [chiqishSorovi, setChiqishSorovi] = useState<"orqaga" | "tahrir" | null>(null);
  const tahrirdaMi = qoralama && tahrirRejimi;

  const ozgarishniBildirish = useCallback(
    (soni: number) => {
      setTovarOzgarishlari(soni);
      onOzgarish?.(soni);
    },
    [onOzgarish]
  );

  function tahrirniBoshlash() {
    // Ombordagi qoldiq (tahrirlagichdagi "Omborda" va miqdor tekshiruvi) shu sotuv ombori bo'yicha yangilanadi.
    void qoldiqlarniYuklash(sotuv.warehouseId ?? sotuv.warehouse?.id);
    setTahrirRejimi(true);
  }
  function tahrirdanChiqish() {
    if (tovarOzgarishlari > 0) setChiqishSorovi("tahrir");
    else setTahrirRejimi(false);
  }
  function orqagaQaytish() {
    if (tahrirdaMi && tovarOzgarishlari > 0) setChiqishSorovi("orqaga");
    else onClose();
  }
  async function tovarlarniSaqlash(sotuvId: string, malumot: Partial<SotuvYaratishMalumoti>) {
    const muvaffaqiyatli = await sotuvniYangilash(sotuvId, malumot);
    if (muvaffaqiyatli) setTahrirRejimi(false);
    return muvaffaqiyatli;
  }

  async function ombordanChiqarishniTasdiqlash() {
    setOmbordanChiqarishXatosi("");
    setOmbordanChiqarishTasdiqlanmoqda(true);
    const muvaffaqiyatli = await sotuvniHaqiqiyTasdiqlash(sotuv.id);
    setOmbordanChiqarishTasdiqlanmoqda(false);
    if (!muvaffaqiyatli) {
      setOmbordanChiqarishXatosi(
        useSavdoStore.getState().xatolik || t("ombordanChiqarish.tasdiqlabBolmadi")
      );
      return;
    }
    setYaqindaTasdiqlandi(true);
  }

  return (
      <div className="scrollbar-hidden h-full overflow-y-auto rounded-l-[46px] rounded-r-[36px] bg-gradient-to-br from-[#EEF2F7] via-[#F6F8FB] to-[#E8EEF7] px-7 py-7 shadow-[0_34px_120px_rgba(15,23,42,.42)] ring-1 ring-white/80">
        <div className="border-b border-slate-400/50 pb-6">
          <button
            type="button"
            onClick={orqagaQaytish}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-orange-50 hover:text-[#2563EB] hover:ring-orange-200"
          >
            <ArrowLeft size={17} />
            {t("ombordanChiqarish.orqaga")}
          </button>

          <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-3xl font-semibold text-slate-900">{t("ombordanChiqarish.sarlavha")}</h2>
              <p className="mt-2 text-sm text-slate-500">
                {tasdiqlangan
                  ? t("ombordanChiqarish.tavsifBajarilgan", { raqam: sotuvRaqami(sotuv) })
                  : t("ombordanChiqarish.tavsifKutilmoqda", { raqam: sotuvRaqami(sotuv) })}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {qoralama && !tahrirdaMi && (
                <button
                  type="button"
                  onClick={tahrirniBoshlash}
                  disabled={saqlanmoqda || ombordanChiqarishTasdiqlanmoqda}
                  className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#2563EB] px-4 text-xs font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,.24)] transition hover:bg-[#1D4ED8] disabled:opacity-50"
                >
                  <PenLine size={14} />
                  {t("ombordanChiqarish.tahrirlash")}
                </button>
              )}
              {tahrirdaMi && (
                <button
                  type="button"
                  onClick={tahrirdanChiqish}
                  disabled={saqlanmoqda}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition hover:border-slate-400 disabled:opacity-50"
                >
                  <X size={14} />
                  {t("ombordanChiqarish.tahrirdanChiqish")}
                </button>
              )}
              {tasdiqlangan && (
                <button
                  type="button"
                  onClick={nakladnoy.korish}
                  disabled={nakladnoy.yuklanmoqda}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition hover:border-[#2563EB] hover:text-[#2563EB] disabled:opacity-60"
                >
                  {nakladnoy.yuklanmoqda ? <LoaderCircle size={14} className="animate-spin" /> : <FileText size={14} />}
                  {t("telegramXabar.pdfButton")}
                </button>
              )}
              <span
                className={`inline-flex h-8 items-center gap-1.5 rounded-full px-4 text-xs font-bold ring-1 ${
                  tasdiqlangan ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-amber-50 text-amber-700 ring-amber-100"
                }`}
              >
                {tasdiqlangan ? <CheckCircle2 size={14} /> : <Package size={14} />}
                {tasdiqlangan ? t("ombordanChiqarish.holatBajarilgan") : t("ombordanChiqarish.holatKutilmoqda")}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-7 space-y-6">
          {yaqindaTasdiqlandi && (
            <article className="flex items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 shadow-sm">
              <CheckCircle2 size={20} className="shrink-0" />
              {t("ombordanChiqarish.tasdiqlandiXabar")}
            </article>
          )}

          {/* Holat kartasi: sarlavha, tushuntirish, tasdiqlash va asosiy ko'rsatkichlar */}
          <section
            className={`relative overflow-hidden rounded-[28px] border bg-white shadow-[0_24px_64px_rgba(15,23,42,.09)] ${
              tasdiqlangan ? "border-emerald-300" : "border-amber-300"
            }`}
          >
            <span
              aria-hidden
              className={`absolute inset-y-0 left-0 w-1.5 ${
                tasdiqlangan ? "bg-gradient-to-b from-emerald-300 to-emerald-600" : "bg-gradient-to-b from-amber-300 to-amber-500"
              }`}
            />
            <div className={`bg-gradient-to-r via-white to-white px-8 py-7 ${tasdiqlangan ? "from-emerald-50/80" : "from-amber-50/80"}`}>
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="flex min-w-0 items-start gap-5">
                  <span
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg ${
                      tasdiqlangan
                        ? "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30"
                        : "bg-gradient-to-br from-amber-300 to-amber-500 shadow-amber-500/30"
                    }`}
                  >
                    {tasdiqlangan ? <CheckCircle2 size={27} /> : <Package size={27} />}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-2xl font-black tracking-tight text-slate-900">
                      {tasdiqlangan ? t("ombordanChiqarish.amaliBajarilgan") : t("ombordanChiqarish.amaliKutilmoqda")}
                    </h3>
                    <p className="mt-1.5 flex max-w-2xl items-start gap-2 text-sm leading-6 text-slate-500">
                      <Eye size={16} className="mt-1 shrink-0 text-slate-400" />
                      {t("ombordanChiqarish.koryapsiz", { mijoz: mijozNomi(sotuv) })}
                    </p>
                    {!tasdiqlangan && (
                      <p className="mt-3 max-w-2xl rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2.5 text-xs leading-5 text-amber-800">
                        {tahrirdaMi ? t("ombordanChiqarish.tahrirdaTasdiqlab") : t("ombordanChiqarish.tasdiqlanmaguncha")}
                      </p>
                    )}
                    {!tasdiqlangan && ombordanChiqarishXatosi && (
                      <p className="mt-3 max-w-2xl rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-bold text-red-600">{ombordanChiqarishXatosi}</p>
                    )}
                  </div>
                </div>
                {!tasdiqlangan && (
                  <button
                    type="button"
                    disabled={ombordanChiqarishTasdiqlanmoqda || tahrirdaMi}
                    title={tahrirdaMi ? t("qoralamaTahrir.avvalSaqlang") : undefined}
                    onClick={() => void ombordanChiqarishniTasdiqlash()}
                    className="inline-flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-[#2563EB] px-7 text-sm font-black text-white shadow-[0_14px_30px_rgba(37,99,235,.28)] transition hover:-translate-y-0.5 hover:bg-[#1D4ED8] disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    {ombordanChiqarishTasdiqlanmoqda && <LoaderCircle size={17} className="animate-spin" />}
                    {t("ombordanChiqarish.tasdiqlash")}
                  </button>
                )}
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-px border-t border-slate-300 bg-slate-300 lg:grid-cols-4">
              <RaqamUyasi ikona={<Package size={18} />} nom={t("ombordanChiqqan.oyna.mahsulotlar")} qiymat={t("ombordanChiqqan.oyna.mahsulotSoni", { soni: items.length })} />
              <RaqamUyasi ikona={<Wallet size={18} />} nom={t("common.jadval.summa")} qiymat={pulniFormatlash(jami, sotuvValyutasi(sotuv))} ohang="yashil" />
              <RaqamUyasi ikona={<Warehouse size={18} />} nom={t("common.info.ombor")} qiymat={omborNomi} />
              <RaqamUyasi ikona={<CalendarDays size={18} />} nom={t("umumiyTab.sana")} qiymat={chiqarishSanasi || "—"} />
            </dl>
          </section>

          <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="min-w-0 space-y-6">
              {/* Tahrirlash rejimi: barcha mahsulotlar shu joyning o'zida tahrirlanadi, saqlangach jadval yangi ma'lumot bilan qaytadi */}
              {tahrirdaMi ? (
                <section className="overflow-hidden rounded-[28px] border border-blue-300 bg-white shadow-[0_18px_50px_rgba(15,23,42,.07)]" data-testid="ombordan-chiqarish-tahrir">
                  <QoralamaTovarlarTahriri
                    sotuv={sotuv}
                    qoldiqlar={qoldiqlar}
                    amalBajarilmoqda={saqlanmoqda || qoldiqYuklanmoqda}
                    onYangilash={tovarlarniSaqlash}
                    onOzgarish={ozgarishniBildirish}
                  />
                </section>
              ) : (
              /* Mahsulotlar jadvali (avvalgi "Tovarlar" bo'limi) */
              <section className="overflow-hidden rounded-[28px] border border-slate-400/60 bg-white shadow-[0_18px_50px_rgba(15,23,42,.07)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 px-7 py-5">
                  <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-600">{t("ombordanChiqqan.oyna.mahsulotlar")}</h3>
                  <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-500">
                    {t("ombordanChiqqan.tovarSoni", { soni: items.length })}
                  </span>
                </div>

                {items.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[880px] text-left text-sm">
                      <thead className="border-b border-slate-300 bg-slate-50 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                        <tr>
                          <th className="w-14 px-7 py-3.5">#</th>
                          <th className="px-3 py-3.5">{t("common.jadval.mahsulot")}</th>
                          <th className="px-3 py-3.5">{t("common.jadval.narx")}</th>
                          <th className="px-3 py-3.5">{t("common.jadval.miqdor")}</th>
                          <th className="px-3 py-3.5">{t("common.jadval.mavjudQoldiq")}</th>
                          <th className="px-3 py-3.5">{t("common.jadval.rezervda")}</th>
                          <th className="px-3 py-3.5">{t("common.jadval.ombordanChiqdi")}</th>
                          <th className="px-7 py-3.5 text-right">{t("common.jadval.summa")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300 text-slate-700">
                        {items.map((item, index) => {
                          const itemJami = mahsulotJami(item);
                          const itemQoldiq = itemQoldiginiTopish(item);
                          const mavjudQoldiq = itemQoldiq ? qoldiqMiqdori(itemQoldiq) : 0;
                          const miqdor = son(item.quantity);
                          const rezerv = tasdiqlangan ? 0 : miqdor;
                          const ombordanChiqdi = tasdiqlangan ? miqdor : 0;

                          return (
                            <tr key={item.id ?? `${item.modificationId}-${index}`} className="transition hover:bg-slate-50/80">
                              <td className="px-7 py-4 text-slate-400">{index + 1}</td>
                              <td className="px-3 py-4">
                                <div className="flex min-w-0 items-center gap-3">
                                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 text-[#2563EB]">
                                    <Package size={17} />
                                  </span>
                                  <span className="min-w-0 break-words font-bold text-slate-900">{mahsulotNomi(item, t)}</span>
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 tabular-nums">{pulniFormatlash(item.price, qatorValyutasi(item, sotuv))}</td>
                              <td className="whitespace-nowrap px-3 py-4 font-bold tabular-nums">
                                {item.quantity} <span className="font-medium text-slate-400">{t("common.dona")}</span>
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 font-bold tabular-nums text-[#2563EB]">
                                {Math.max(mavjudQoldiq, 0)} {t("common.dona")}
                              </td>
                              <td className="px-3 py-4">
                                <span
                                  className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-bold tabular-nums ${
                                    rezerv > 0 ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-50 text-slate-400"
                                  }`}
                                >
                                  {rezerv}
                                </span>
                              </td>
                              <td className="px-3 py-4">
                                <span
                                  className={`inline-flex whitespace-nowrap rounded-lg border px-2.5 py-1 text-xs font-bold tabular-nums ${
                                    ombordanChiqdi > 0 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-400"
                                  }`}
                                >
                                  {ombordanChiqdi} {t("common.dona")}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-7 py-4 text-right font-black tabular-nums text-emerald-600">
                                {pulniFormatlash(itemJami, qatorValyutasi(item, sotuv))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="px-7 py-16 text-center text-sm text-slate-400">{t("common.tovarlarYoq")}</p>
                )}

                {items.length > 0 && (
                  <div className="border-t border-slate-300 bg-slate-50/70 px-7 py-6">
                    <div className="ml-auto w-full max-w-md space-y-2.5 text-sm">
                      <div className="flex justify-between gap-6 text-slate-500">
                        <span>{t("common.totals.chegirmaSoliqsiz").replace(/:\s*$/, "")}</span>
                        <span className="font-semibold tabular-nums text-slate-700">{pulniFormatlash(mahsulotlarJami, sotuvValyutasi(sotuv))}</span>
                      </div>
                      <div className="flex justify-between gap-6 text-slate-500">
                        <span>{t("common.totals.yetkazishSummasi").replace(/:\s*$/, "")}</span>
                        <span className="font-semibold tabular-nums text-slate-700">{pulniFormatlash(0, sotuvValyutasi(sotuv))}</span>
                      </div>
                      <div className="flex justify-between gap-6 text-lime-700">
                        <span>{t("common.totals.chegirmaSummasi").replace(/:\s*$/, "")}</span>
                        <span className="font-semibold tabular-nums">{pulniFormatlash(chegirmaSummasi, sotuvValyutasi(sotuv))}</span>
                      </div>
                      <div className="flex justify-between gap-6 text-slate-500">
                        <span>{t("common.totals.soliqsizSumma").replace(/:\s*$/, "")}</span>
                        <span className="font-semibold tabular-nums text-slate-700">{pulniFormatlash(mahsulotlarJami - chegirmaSummasi, sotuvValyutasi(sotuv))}</span>
                      </div>
                      <div className="flex justify-between gap-6 text-slate-500">
                        <span>{t("common.totals.soliqSummasi").replace(/:\s*$/, "")}</span>
                        <span className="font-semibold tabular-nums text-slate-700">{pulniFormatlash(0, sotuvValyutasi(sotuv))}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-6 rounded-2xl bg-slate-900 px-5 py-4 text-white shadow-[0_14px_30px_rgba(15,23,42,.22)]">
                        <span className="text-sm font-bold uppercase tracking-[0.14em] text-slate-300">{t("common.totals.umumiySumma").replace(/:\s*$/, "")}</span>
                        <span className="text-2xl font-black tabular-nums">{pulniFormatlash(jami, sotuvValyutasi(sotuv))}</span>
                      </div>
                    </div>
                  </div>
                )}
              </section>
              )}

              {/* Haqiqatda ombordan chiqqan mahsulotlar (ombor harakati hisobotidan) */}
              {sotuvHolati(sotuv) !== "DRAFT" && (
                <section className="rounded-[28px] border border-slate-400/60 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,.07)]">
                  <SotuvOmbordanChiqqanlar sotuv={sotuv} className="" />
                </section>
              )}
            </div>

            <aside className="min-w-0">
              <section className="rounded-[28px] border border-slate-400/60 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,.07)]">
                <div className="border-b border-slate-300 pb-4">
                  <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-600">{t("ombordanChiqarish.asosiyMalumotlar")}</h3>
                </div>
                <div className="mt-5 divide-y divide-slate-300 overflow-hidden rounded-2xl border border-slate-300 bg-white">
                  <KontaktQatori icon={<UserRound size={17} />} label={t("common.info.mijoz")} value={mijozNomi(sotuv)} />
                  <KontaktQatori
                    icon={<Phone size={17} />}
                    label={t("common.info.telefon")}
                    value={mijozTelefon(sotuv)}
                    href={`tel:${mijozTelefon(sotuv).replace(/[^\d+]/g, "")}`}
                  />
                  <KontaktQatori icon={<MapPin size={17} />} label={t("common.info.manzil")} value={mijozManzili(sotuv)} />
                  <KontaktQatori
                    icon={<Building2 size={17} />}
                    label={t("common.info.kompaniya")}
                    value={sotuv.clientCompany?.name || t("common.info.kompaniyaTanlanmagan")}
                  />
                  <KontaktQatori icon={<UserCheck size={17} />} label={t("common.info.masulShaxs")} value={masulNomi(sotuv)} />
                </div>
              </section>
            </aside>
          </div>
        </div>

        {chiqishSorovi && (
          <TasdiqlashOynasi
            ikonka={<TriangleAlert size={26} />}
            ohang="sariq"
            sarlavha={t("qoralamaTahrir.yopishTasdigi.sarlavha")}
            nom={sotuvJadvalId(sotuv)}
            tavsif={t("fullEdit.discardDescription")}
            ortgaMatni={t("qoralamaTahrir.yopishTasdigi.qolish")}
            tasdiqMatni={t("fullEdit.discardConfirm")}
            jarayonMatni={t("qoralamaTahrir.yopishTasdigi.yopilmoqda")}
            onTasdiq={async () => {
              if (chiqishSorovi === "orqaga") onClose();
              else setTahrirRejimi(false);
            }}
            onYopish={() => setChiqishSorovi(null)}
          />
        )}
      </div>
  );
}

type RaqamOhangi = "kulrang" | "yashil";

// Ombordan chiqarish kartasi pastidagi ko'rsatkich katagi (tovarlar soni, summa, ombor, sana).
function RaqamUyasi({ ikona, nom, qiymat, ohang = "kulrang" }: { ikona: ReactNode; nom: string; qiymat: string; ohang?: RaqamOhangi }) {
  return (
    <div className="flex items-center gap-3.5 bg-white px-6 py-4">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${ohang === "yashil" ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
        {ikona}
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{nom}</dt>
        <dd className={`mt-0.5 break-words text-lg font-black tabular-nums ${ohang === "yashil" ? "text-emerald-600" : "text-slate-900"}`}>{qiymat}</dd>
      </div>
    </div>
  );
}

function Qadam({ number, title, children, active }: { number: number; title: string; children: ReactNode; active?: boolean }) {
  return (
    <section className="relative rounded-xl bg-white p-6 shadow-sm">
      <span className={`absolute -left-5 top-5 flex h-10 w-10 items-center justify-center rounded-full font-bold text-white ${active ? "bg-cyan-400" : "bg-slate-300"}`}>
        {number}
      </span>
      <h3 className="border-b border-slate-200 pb-5 text-2xl text-slate-700">{title}</h3>
      {children}
    </section>
  );
}

function Maydon({ label, value }: { label: string; value: string }) {
  return (
    <label className="text-sm text-slate-600">
      {label}
      <div className="mt-2 flex h-12 items-center justify-end rounded-md border border-slate-300 bg-white px-3 text-slate-600">{value}</div>
    </label>
  );
}

type TimelineOhangi = "kok" | "yashil" | "sariq" | "qizil" | "kulrang";
const TIMELINE_OHANGI: Record<TimelineOhangi, string> = {
  kok: "bg-[#2563EB] text-white shadow-[0_10px_24px_rgba(37,99,235,.28)]",
  yashil: "bg-emerald-500 text-white shadow-[0_10px_24px_rgba(16,185,129,.26)]",
  sariq: "bg-amber-400 text-white shadow-[0_10px_24px_rgba(245,158,11,.26)]",
  qizil: "bg-red-500 text-white shadow-[0_10px_24px_rgba(239,68,68,.26)]",
  kulrang: "bg-white text-slate-500 shadow-sm ring-1 ring-slate-200",
};

// Faoliyat lentasidagi bitta hodisa: chapdagi ikonka umumiy vertikal chiziqqa ulanadi.
function TimelineElement({ icon, ohang, children }: { icon: ReactNode; ohang: TimelineOhangi; children: ReactNode }) {
  return (
    <li className="relative pl-14">
      <span className={`absolute left-0 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full ring-4 ring-[#F5F8FC] ${TIMELINE_OHANGI[ohang]}`}>{icon}</span>
      {children}
    </li>
  );
}

function Divider({ label, green }: { label: string; green?: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <div className="h-px flex-1 bg-orange-200" />
      <span className={`rounded-full px-6 py-1 text-sm ${green ? "bg-emerald-500 font-bold text-white" : "bg-orange-100 font-semibold text-[#2563EB] ring-1 ring-orange-200"}`}>{label}</span>
      <div className="h-px flex-1 bg-orange-200" />
    </div>
  );
}

function CardTitle({ title, action }: { title: string; action?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-orange-100 pb-3">
      <h2 className="text-xs font-black uppercase tracking-wide text-slate-600">{title}</h2>
      {action && <button className="text-xs font-semibold text-slate-400 transition hover:text-[#2563EB]">{action}</button>}
    </div>
  );
}

type IzohQatori = { kalit?: string; qiymat: string };

// Sotuv yaratishda izoh "Kalit: qiymat" qatorlaridan (har biri yangi qatorda) yig'iladi; erkin matn ham bo'lishi mumkin.
function izohniQatorlarga(izoh?: string): IzohQatori[] {
  return (izoh ?? "")
    .split(/\r?\n/)
    .map((qator) => qator.trim())
    .filter(Boolean)
    .map((qator) => {
      const moslik = qator.match(/^(\p{L}[^:\d]{0,39}):\s*(.+)$/u);
      return moslik ? { kalit: moslik[1].trim(), qiymat: moslik[2].trim() } : { qiymat: qator };
    });
}

function QoshimchaMalumotCard({
  sotuv,
  draft,
  onSanaSaqlash,
}: {
  sotuv: Sotuv;
  draft: boolean;
  // Qoralama sotuv sanasini o'zgartirish (PATCH { date }); tasdiqlangan hujjat sanasi: bekor qilish → tiklash → sana → tasdiqlash.
  onSanaSaqlash: (kun: string) => Promise<boolean>;
}) {
  const { t } = useTranslation("savdo_tafsilot");
  const hujjatKuni = toshkentKuni(sotuv.date ?? sotuv.createdAt);
  const [kun, setKun] = useState(hujjatKuni);
  const [sanaSaqlanmoqda, setSanaSaqlanmoqda] = useState(false);
  useEffect(() => setKun(hujjatKuni), [hujjatKuni]);

  async function sananiSaqlash() {
    if (!kun || kun === hujjatKuni || sanaSaqlanmoqda) return;
    setSanaSaqlanmoqda(true);
    try {
      const saqlandi = await onSanaSaqlash(kun);
      // Xato toasti ko'rsatilgan: maydon backenddagi sanaga qaytadi.
      if (!saqlandi) setKun(hujjatKuni);
    } finally {
      setSanaSaqlanmoqda(false);
    }
  }

  const izohQatorlari = izohniQatorlarga(sotuv.note);
  const kalitliQatorlar = izohQatorlari.filter((qator) => qator.kalit);
  const erkinMatn = izohQatorlari.filter((qator) => !qator.kalit);

  return (
    <section className="rounded-[24px] border border-orange-100/80 bg-white/92 p-5 shadow-[0_18px_46px_rgba(37,99,235,.08)] backdrop-blur">
      <CardTitle title={t("umumiyTab.qoshimchaMalumotlar")} action={t("common.ozgartirish")} />

      <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white">
        <KontaktQatori icon={<RotateCcw size={17} />} label={t("umumiyTab.qaytarilganSavdo")} value={t("umumiyTab.tanlanmagan")} />
        <KontaktQatori icon={<UserCheck size={17} />} label={t("common.info.masulShaxs")} value={masulNomi(sotuv)} />
        {draft ? (
          <div className="flex items-start gap-3 px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#2563EB] ring-1 ring-orange-100"><CalendarDays size={17} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-400">{t("umumiyTab.sana")}</p>
              <div className="mt-1 flex flex-wrap items-start gap-2">
                <HujjatSanasiMaydoni
                  value={kun}
                  onChange={setKun}
                  disabled={sanaSaqlanmoqda}
                  aria-label={t("umumiyTab.sana")}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-orange-100 disabled:opacity-60"
                />
                {kun && kun !== hujjatKuni && (
                  <button
                    type="button"
                    onClick={() => void sananiSaqlash()}
                    disabled={sanaSaqlanmoqda}
                    className="h-9 rounded-lg bg-[#2563EB] px-3 text-xs font-black text-white transition hover:bg-[#1D4ED8] disabled:opacity-60"
                  >
                    {t("umumiyTab.sanaSaqlash")}
                  </button>
                )}
              </div>
              <KiritilganBelgisi date={sotuv.date} createdAt={sotuv.createdAt} className="mt-1" />
            </div>
          </div>
        ) : (
          <div>
            <KontaktQatori icon={<CalendarDays size={17} />} label={t("umumiyTab.sana")} value={sananiFormatlash(sotuv.date ?? sotuv.createdAt)} />
            <KiritilganBelgisi date={sotuv.date} createdAt={sotuv.createdAt} className="-mt-2 pb-2 pl-16" />
          </div>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 text-[#2563EB] ring-1 ring-orange-100">
            <StickyNote size={15} />
          </span>
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">{t("umumiyTab.qoshimchaIzoh")}</p>
        </div>

        {izohQatorlari.length === 0 ? (
          <p className="mt-3 text-sm text-slate-300">{t("umumiyTab.izohYoq")}</p>
        ) : (
          <>
            {kalitliQatorlar.length > 0 && (
              <dl className="mt-3 divide-y divide-slate-100">
                {kalitliQatorlar.map((qator, index) => (
                  <div key={`${qator.kalit}-${index}`} className="flex items-start justify-between gap-4 py-2 text-sm">
                    <dt className="shrink-0 text-slate-400">{qator.kalit}</dt>
                    <dd className="min-w-0 break-words text-right font-semibold text-slate-800">{qator.qiymat}</dd>
                  </div>
                ))}
              </dl>
            )}
            {erkinMatn.length > 0 && (
              <p className={`whitespace-pre-line break-words text-sm leading-6 text-slate-600 ${kalitliQatorlar.length > 0 ? "mt-3 border-t border-slate-100 pt-3" : "mt-3"}`}>
                {erkinMatn.map((qator) => qator.qiymat).join("\n")}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

type KorsatkichOhangi = "kulrang" | "kok" | "qizil" | "yashil";
const KORSATKICH_OHANGI: Record<KorsatkichOhangi, string> = {
  kulrang: "text-slate-700",
  kok: "text-[#2563EB]",
  qizil: "text-red-500",
  yashil: "text-emerald-600",
};

// `chegara` — aniq ko'rinadigan chegara (oq fonli kartada, masalan ombordan chiqarish oynasida); odatda yengil ring.
function Korsatkich({ label, value, ohang = "kulrang", chegara = false }: { label: string; value: string; ohang?: KorsatkichOhangi; chegara?: boolean }) {
  return (
    <div className={`rounded-xl bg-white px-3 py-2.5 ring-1 ${chegara ? "ring-slate-400/60" : "ring-slate-100"}`}>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-black ${KORSATKICH_OHANGI[ohang]}`}>{value}</p>
    </div>
  );
}

function KontaktQatori({ icon, label, value, href }: { icon: ReactNode; label: string; value: string; href?: string }) {
  const bosh = !value || value === "-" || value === "—";
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#2563EB] ring-1 ring-orange-100">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-400">{label}</p>
        {href && !bosh ? (
          <a href={href} className="mt-0.5 block break-words text-sm font-semibold text-slate-800 transition hover:text-[#2563EB]">
            {value}
          </a>
        ) : (
          <p className={`mt-0.5 break-words text-sm font-semibold ${bosh ? "text-slate-300" : "text-slate-800"}`}>{bosh ? "—" : value}</p>
        )}
      </div>
    </div>
  );
}

function HujjatFeedCard({
  hujjat,
  sotuv,
  onOchish,
}: {
  hujjat: SaqlanganHujjat;
  sotuv: Sotuv;
  onOchish: () => void;
}) {
  const { t } = useTranslation("savdo_tafsilot");
  return (
    <article className="group relative overflow-visible rounded-[20px] border border-orange-100/80 bg-white/92 p-5 shadow-[0_14px_38px_rgba(37,99,235,.06)] transition duration-300 hover:shadow-[0_20px_50px_rgba(37,99,235,.10)]">
      <div className="flex items-start justify-between gap-5">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#2563EB] ring-1 ring-orange-100">
            <FileText size={30} strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-black text-slate-900">{t("hujjatFeedCard.tayyorlandi")}</h3>
              <span className="text-sm font-medium text-slate-400">{qisqaVaqt(hujjat.sana)}</span>
            </div>
            <div className="mt-3 space-y-1.5 text-sm">
              <p className="text-slate-500">
                {t("hujjatFeedCard.ism")} <span className="font-semibold text-slate-800">{hujjat.nomi}</span>
              </p>
              <p className="text-slate-400">
                {t("hujjatFeedCard.kompaniyangiz")} <span className="font-semibold text-slate-700">{t("hujjatFeedCard.toldirilmagan")}</span>
              </p>
              <p className="text-slate-500">
                {t("hujjatFeedCard.mijoz")} <span className="font-semibold text-slate-800">{mijozNomi(sotuv)}</span>
              </p>
            </div>
          </div>
        </div>

      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onOchish}
          className="inline-flex h-10 min-w-[150px] items-center justify-center rounded-xl border border-orange-100 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-[#2563EB] hover:text-[#2563EB]"
        >
          {t("hujjatFeedCard.ochiq")}
        </button>
        <button
          type="button"
          className="inline-flex h-10 min-w-[150px] items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:text-orange-600"
        >
          {t("hujjatFeedCard.obunaBolish")}
        </button>

        <div className="ml-auto flex items-center gap-3 text-slate-300">
          <Printer size={18} className="transition group-hover:text-slate-400" />
          <FileText size={18} className="transition group-hover:text-slate-400" />
          <MoreHorizontal size={22} className="transition group-hover:text-slate-400" />
        </div>
      </div>
    </article>
  );
}

function OmbordanChiqarishHujjatFeedCard({
  sotuv,
  vaqt,
  onOchish,
  onChiqarilganlar,
}: {
  sotuv: Sotuv;
  vaqt: string;
  onOchish: () => void;
  onChiqarilganlar: () => void;
}) {
  const { t } = useTranslation("savdo_tafsilot");
  const omborlar = useOmborStore((state) => state.omborlar);
  const omborNomi = sotuvOmborNomi(sotuv, omborlar, t);
  // Ombordan chiqarilgan sana: ombor harakatining o'z sanasi (kelmasa sotuv hujjat sanasi); faqat vaqt (12:00) emas, kun ham ko'rsatiladi.
  const { harakatlar } = useHujjatHarakatlari(sotuv.id, true, sotuv.status ?? "");
  const { sana, kiritilgan } = ombordanChiqarishSanasi(harakatlar, sotuv);
  const sanaVaVaqt = hujjatVaqtiMatni(sana, kiritilgan) || vaqt;
  // "Hujjatni ko'rish": backend tayyorlagan PDF nakladnoy (GET /sales/:id/nakladnoy.pdf) yangi oynada ochiladi.
  const nakladnoy = useNakladnoy(sotuv.id, sotuvRaqami(sotuv));

  return (
    <article className="group relative overflow-hidden rounded-[20px] border border-emerald-100 bg-white/92 p-5 shadow-[0_14px_38px_rgba(16,185,129,.07)] transition duration-300 hover:shadow-[0_20px_50px_rgba(16,185,129,.12)]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 className="font-black text-slate-900">{t("ombordanChiqarishFeedCard.qoshildi")}</h3>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold tabular-nums text-slate-500">{sanaVaVaqt}</span>
      </div>

      <dl className="mt-3 grid gap-2 rounded-2xl bg-emerald-50/60 p-4 text-sm sm:grid-cols-3">
        <div className="min-w-0">
          <dt className="text-xs text-slate-400">{t("ombordanChiqarishFeedCard.sotuv")}</dt>
          <dd className="mt-0.5 break-words font-semibold text-slate-800">{sotuvRaqami(sotuv)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-slate-400">{t("ombordanChiqarishFeedCard.mijoz")}</dt>
          <dd className="mt-0.5 break-words font-semibold text-slate-800">{mijozNomi(sotuv)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-slate-400">{t("ombordanChiqarishFeedCard.ombor")}</dt>
          <dd className="mt-0.5 break-words font-semibold text-slate-800">{omborNomi}</dd>
        </div>
      </dl>

      <div className="mt-3">
        <OmbordanChiqqanlarHavolasi sotuv={sotuv} onOchish={onChiqarilganlar} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={nakladnoy.korish}
          disabled={nakladnoy.yuklanmoqda}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-500 hover:text-white disabled:opacity-60"
        >
          {nakladnoy.yuklanmoqda ? <LoaderCircle size={16} className="animate-spin" /> : <FileText size={16} />}
          {t("ombordanChiqarishFeedCard.korish")}
        </button>
        <button
          type="button"
          onClick={onOchish}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 hover:text-[#2563EB]"
        >
          <Package size={16} />
          {t("ombordanChiqarishFeedCard.tafsilot")}
        </button>
      </div>
    </article>
  );
}

function FeedCard({
  title,
  time,
  text,
  onOchirish,
}: {
  title: string;
  time: string;
  text: string;
  onOchirish?: () => void;
}) {
  const { t } = useTranslation("savdo_tafsilot");
  return (
    <article className="group relative overflow-hidden rounded-[20px] border border-orange-100/80 bg-white/92 p-5 shadow-[0_14px_38px_rgba(37,99,235,.06)] transition duration-300 hover:shadow-[0_20px_50px_rgba(37,99,235,.10)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="font-black text-slate-800">{title}</h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500">{time}</span>
          </div>
          <p className="mt-2 break-words text-sm leading-6 text-slate-600">{text}</p>
        </div>
        {onOchirish && (
          <button
            type="button"
            onClick={onOchirish}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-400 opacity-0 transition hover:bg-red-100 hover:text-red-600 group-hover:opacity-100"
            aria-label={t("feedCard.ochirishAria", { title })}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </article>
  );
}

function CalendarFeedCard({
  faoliyat,
  xodimlar,
  onOchirish,
  onYangilash,
  onZakrepit,
}: {
  faoliyat: SaqlanganFaoliyat;
  xodimlar: XodimTanlovi[];
  onOchirish: (id: string) => void;
  onYangilash: (id: string, malumot: Partial<SaqlanganFaoliyat>) => void;
  onZakrepit: (id: string) => void;
}) {
  const { t } = useTranslation("savdo_tafsilot");
  const sana = new Date(faoliyat.sana);
  const vaqt = qisqaVaqt(faoliyat.sana);
  const kun = Number.isNaN(sana.getTime()) ? "--" : String(sana.getDate()).padStart(2, "0");
  const oy = Number.isNaN(sana.getTime())
    ? ""
    : new Intl.DateTimeFormat("uz-UZ", { month: "short" }).format(sana);
  const xodim = xodimlar.find((item) => item.id === faoliyat.xodimId);
  const [bajarildi, setBajarildi] = useState(Boolean(faoliyat.completed));
  const [tahrirOchiq, setTahrirOchiq] = useState(false);
  const [menuOchiq, setMenuOchiq] = useState(false);

  useEffect(() => {
    setBajarildi(Boolean(faoliyat.completed));
  }, [faoliyat.completed]);

  function bajarildiHolatiniAlmashtirish() {
    const keyingiHolat = !bajarildi;
    setBajarildi(keyingiHolat);
    onYangilash(faoliyat.id, { completed: keyingiHolat });
  }

  return (
    <article
      className={`animate-in fade-in-0 duration-500 rounded-2xl p-5 shadow-sm transition-all ease-out ${
        bajarildi
          ? "slide-in-from-top-4 translate-y-3 bg-white/92 ring-1 ring-orange-100"
          : "slide-in-from-top-3 bg-orange-50/80 ring-1 ring-orange-100"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <button
            type="button"
            onClick={bajarildiHolatiniAlmashtirish}
            className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border transition ${
              bajarildi ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-orange-200 bg-white"
            }`}
            aria-label={bajarildi ? t("calendarFeedCard.bajarildiBelgisiniOlish") : t("calendarFeedCard.bajarildiQilish")}
          >
            {bajarildi && <span className="text-xs leading-none">✓</span>}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className={`font-bold ${bajarildi ? "text-slate-900" : "text-slate-800"}`}>{faoliyat.sarlavha}</h3>
              <span className="text-sm text-slate-400">{t("calendarFeedCard.bugunVaqt", { vaqt })}</span>
              {faoliyat.pinned && (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-[#2563EB]">
                  <Pin size={12} />
                  {t("calendarFeedCard.zakrepit")}
                </span>
              )}
            </div>

            <div className={`mt-5 flex flex-wrap items-center gap-5 transition-all duration-500 ${bajarildi ? "translate-y-1" : ""}`}>
              <div className={`relative flex h-24 w-[84px] shrink-0 items-center justify-center rounded-xl text-center shadow-sm transition ${bajarildi ? "bg-orange-50" : "bg-orange-100"}`}>
                <div className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-[#2563EB] text-white shadow-sm">
                  <CalendarDays size={16} />
                </div>
                <div className="rounded-lg border border-sky-200 bg-white px-3 py-2">
                  <p className="text-2xl font-black leading-5 text-slate-700">{kun}</p>
                  <p className="mt-1 text-[10px] uppercase text-slate-500">{oy}</p>
                  <p className="text-[9px] font-bold text-[#2563EB]">{vaqt}</p>
                </div>
              </div>

              <div className="min-w-[240px] flex-1">
                <p className="text-sm text-slate-500">
                  {t("calendarFeedCard.rejalashtirilganVoqea")}{" "}
                  <span className="font-medium text-[#2563EB]">{faoliyat.sarlavha}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setTahrirOchiq((joriy) => !joriy)}
                  className={`mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition ${
                    bajarildi ? "bg-slate-50 hover:bg-slate-100" : "bg-orange-100 hover:bg-orange-200"
                  }`}
                >
                  <span>{t("calendarFeedCard.sanaVaVaqt")}</span>
                  <span className="font-semibold text-slate-900">{kalendarMatni(faoliyat.sana, true)}</span>
                  <ChevronDown size={14} className={`transition ${tahrirOchiq ? "rotate-180" : ""}`} />
                </button>
              </div>

              <Bell size={18} className="text-slate-400" />
            </div>

            {tahrirOchiq && (
              <div className="animate-in slide-in-from-top-2 fade-in-0 mt-5 duration-300">
                <KalendarTanlashPanel
                  selectedDate={sana}
                  onSelect={(keyingiSana) => {
                    onYangilash(faoliyat.id, { sana: keyingiSana.toISOString() });
                    setTahrirOchiq(false);
                  }}
                  onClose={() => setTahrirOchiq(false)}
                />
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={bajarildiHolatiniAlmashtirish}
                className={`rounded-xl px-6 py-3 text-sm font-bold shadow-sm transition ${
                  bajarildi
                    ? "border border-orange-100 bg-white text-slate-600 hover:border-[#2563EB] hover:text-[#2563EB]"
                    : "bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
                }`}
              >
                {bajarildi ? t("calendarFeedCard.takrorlash") : t("calendarFeedCard.bajarildi")}
              </button>
              {!bajarildi && <button
                type="button"
                onClick={() => setTahrirOchiq(true)}
                className="rounded-xl border border-orange-100 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-[#2563EB] hover:text-[#2563EB]"
              >
                {t("calendarFeedCard.tahrirlash")}
              </button>}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="h-3 w-3 rounded-sm bg-amber-400" />
          {bajarildi && faoliyat.pinned && <Pin size={16} className="fill-[#2563EB] text-[#2563EB]" />}
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              xodim ? "bg-[#2563EB] text-white" : "bg-orange-100 text-[#2563EB]"
            }`}
            title={xodimNomi(xodim, t)}
          >
            {xodim ? xodimBoshHarflari(xodim) : <UserRound size={15} />}
          </span>
          <button
            type="button"
            onClick={() => onOchirish(faoliyat.id)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-400 transition hover:bg-red-100 hover:text-red-600 active:scale-95"
            aria-label={t("calendarFeedCard.ochirishAria")}
            title={t("calendarFeedCard.ochirishTitle")}
          >
            <Trash2 size={17} />
          </button>
          {bajarildi && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOchiq((joriy) => !joriy)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:scale-95"
                aria-label={t("calendarFeedCard.amallarAria")}
              >
                <MoreHorizontal size={22} />
              </button>

              {menuOchiq && (
                <div className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute right-0 top-11 z-[80] w-[250px] rounded-2xl bg-white p-3 text-sm shadow-[0_20px_70px_rgba(15,23,42,.20)] ring-1 ring-slate-100 duration-200">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    <span>{t("calendarFeedCard.kengaytmalar")}</span>
                    <ChevronDown size={17} className="-rotate-90 text-slate-300" />
                  </button>
                  <div className="my-2 h-px bg-slate-100" />
                  <button
                    type="button"
                    onClick={() => {
                      onZakrepit(faoliyat.id);
                      setMenuOchiq(false);
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
                  >
                    <span>{faoliyat.pinned ? t("calendarFeedCard.zakrepitdanOlish") : t("calendarFeedCard.zakrepitQilish")}</span>
                    <Pin size={17} className={faoliyat.pinned ? "fill-blue-500 text-blue-500" : "text-slate-300"} />
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    <span>{t("calendarFeedCard.boglanganIshlar")}</span>
                    <SlidersHorizontal size={17} className="text-slate-300" />
                  </button>
                  <div className="my-2 h-px bg-slate-100" />
                  <button
                    type="button"
                    onClick={() => {
                      onOchirish(faoliyat.id);
                      setMenuOchiq(false);
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left font-semibold text-red-500 transition hover:bg-red-50"
                  >
                    <span>{t("calendarFeedCard.ochirish")}</span>
                    <Trash2 size={17} className="text-red-300" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function KalendarTanlashPanel({
  selectedDate,
  onSelect,
  onClose,
}: {
  selectedDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation("savdo_tafsilot");
  const [drag, setDrag] = useState({ active: false, startX: 0, scrollLeft: 0 });
  const joriySana = Number.isNaN(selectedDate.getTime()) ? boshlangichKalendarSanasi() : selectedDate;
  const selectedDateKey = sanaKaliti(joriySana);
  const selectedHour = String(joriySana.getHours());
  const kunlar = yilKunlari(joriySana.getFullYear());

  function sananiTanlash(sana: Date, soat: string) {
    const keyingiSana = new Date(sana);
    keyingiSana.setHours(Number(soat), 0, 0, 0);
    onSelect(keyingiSana);
  }

  return (
    <div className="rounded-b-xl bg-slate-50 px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
            <CalendarDays size={18} className="text-slate-500" />
            <span className="font-semibold">{t("kalendarTanlash.qoshildi")}</span>
            <span className="truncate text-blue-600">abdulaziz001969@gmail.com</span>
            <button type="button" className="text-xs uppercase text-slate-400 transition hover:text-blue-600">
              {t("common.ozgartirish")}
            </button>
          </div>
          <button type="button" className="mt-2 text-sm text-slate-400 underline underline-offset-4 hover:text-blue-600">
            {t("kalendarTanlash.ishtirokchilar")}
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-slate-400 transition hover:bg-white hover:text-slate-700"
          aria-label={t("kalendarTanlash.yopishAria")}
        >
          <X size={17} />
        </button>
      </div>

      <div className="mt-5 flex gap-4">
        <div className="flex w-14 shrink-0 items-center justify-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-400 text-white">👤</span>
        </div>
        <div
          className={`scrollbar-hidden min-w-0 flex-1 select-none overflow-x-auto pb-3 touch-pan-x ${
            drag.active ? "cursor-grabbing" : "cursor-grab"
          }`}
          onMouseDown={(event) => {
            setDrag({
              active: true,
              startX: event.pageX - event.currentTarget.offsetLeft,
              scrollLeft: event.currentTarget.scrollLeft,
            });
          }}
          onMouseMove={(event) => {
            if (!drag.active) return;
            event.preventDefault();
            const x = event.pageX - event.currentTarget.offsetLeft;
            event.currentTarget.scrollLeft = drag.scrollLeft - (x - drag.startX);
          }}
          onMouseUp={() => setDrag((joriy) => ({ ...joriy, active: false }))}
          onMouseLeave={() => setDrag((joriy) => ({ ...joriy, active: false }))}
        >
          <div className="flex min-w-max gap-3">
            {kunlar.map((kun) => (
              <button
                key={kun.kun}
                type="button"
                className="min-w-[500px] border-l border-slate-200 pl-3 text-left transition hover:bg-white/60"
              >
                <div className="mb-2 flex items-center gap-2 text-xs text-slate-700">
                  <span className="capitalize">{kun.kun}</span>
                  {kun.bugun && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] text-sky-600">{t("kalendarTanlash.bugun")}</span>}
                </div>
                <div className="grid grid-cols-10 text-xs text-slate-700">
                  {kun.soatlar.map((soat) => (
                    <span key={soat}>{soat}</span>
                  ))}
                </div>
                <div className="mt-2 grid h-11 grid-cols-10 overflow-hidden bg-white">
                  {kun.soatlar.map((soat, index) => (
                    <button
                      key={`${kun.kun}-${soat}`}
                      type="button"
                      onClick={() => sananiTanlash(kun.sana, soat)}
                      className={`border-l border-slate-100 transition hover:bg-blue-100 ${
                        kun.dateKey === selectedDateKey && soat === selectedHour
                          ? "bg-blue-500 shadow-inner"
                          : kun.bugun && index >= 2 && index <= 4
                            ? "bg-slate-100"
                            : "bg-white"
                      }`}
                      title={t("common.soatTitle", { kun: kun.kun, soat })}
                    />
                  ))}
                </div>
              </button>
            ))}
          </div>
          <div className="mt-3 h-2 w-36 rounded-full bg-slate-300" />
        </div>
      </div>
    </div>
  );
}
