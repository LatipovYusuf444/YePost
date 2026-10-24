import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import {
  BadgeCheck,
  Bell,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  ImageIcon,
  Link,
  LoaderCircle,
  MessageSquare,
  Package,
  Percent,
  PenLine,
  Plus,
  Printer,
  RotateCcw,
  ScanLine,
  Send,
  Settings,
  Trash2,
  Upload,
  UserRound,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import AppModal from "@/Components/common/AppModal";
import HujjatSanasiMaydoni from "@/Components/common/HujjatSanasi";
import SummaMaydoni from "@/Components/common/SummaMaydoni";
import { bugungiToshkentKuni, yangiHujjatSanasi } from "@/lib/hujjatSanasi";
import { crmApi } from "@/api/crmApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { cn } from "@/lib/utils";
import NarxTuriTanlovi from "./NarxTuriTanlovi";
import { sotuvNomiIzohi } from "@/lib/sotuvNomi";
import { useValyutaStore } from "@/lib/valyuta";
import type {
  MijozTanlovi,
  OmborTanlovi,
  QoldiqTanlovi,
  SotuvNarxTuri,
  SotuvYaratishMalumoti,
  XodimTanlovi,
} from "@/types/savdo";
import {
  chegirmaFoizi,
  chegirmaSummasi,
  kiritilganNarx,
  narxSotuvValyutasida,
  qatorNarxTuri,
  turNarxi,
  ustamaliNarx,
  yuboriladiganQator,
  type ChegirmaTuri,
} from "@/lib/savdoNarxlari";
import {
  asosiyMiqdor,
  birlikNarxi,
  birlikTopish,
  miqdorYaroqlimi,
  qoldiqMatni,
  shtrixBirligi,
  sotuvBirliklari,
  type TovarBirligi,
} from "@/lib/kopBirlik";
import { useSavdoSozlamalariStore } from "@/store/savdoSozlamalariStore";
import { pulniFormatlash } from "./savdoYordamchilari";
import SavdoSelect, { type SavdoSelectOption } from "./SavdoSelect";

type YangiSotuvModalProps = {
  variant?: "sale" | "draft";
  omborlar: OmborTanlovi[];
  mijozlar: MijozTanlovi[];
  mijozKompaniyalari: MijozTanlovi[];
  xodimlar: XodimTanlovi[];
  qoldiqlar: QoldiqTanlovi[];
  amalBajarilmoqda: boolean;
  onOmborTanlash: (omborId: string) => void;
  onSaqlash: (malumot: SotuvYaratishMalumoti) => Promise<boolean>;
  onYopish: () => void;
};

type MahsulotQatori = {
  modificationId: string;
  qoldiqKaliti: string;
  quantity: string;
  price: string;
  discount: string;
  // Narx turi (tan narx / chakana / ulgurji): `price` shu turdagi katalog narxi.
  priceType: SotuvNarxTuri;
  // Chegirma summada (`discount`) yoki foizda (`discountFoiz`) kiritiladi; backendga summa ketadi, foizda kiritilsa foiz ham (hisobot uchun).
  discountTuri: ChegirmaTuri;
  discountFoiz: string;
  // Sotuv birligi (pochka, qop): "" — asosiy birlik. `quantity`, `price` va chegirma shu birlikda.
  birlikId: string;
  // Sotuvchi "Sotuv narxi"ga katalog narxidan baland narx yozsa — farq (bir dona uchun ustama); backendga qo'lda narx bo'lib ketadi.
  ustama: string;
};

function bosQator(priceType: SotuvNarxTuri): MahsulotQatori {
  return { modificationId: "", qoldiqKaliti: "", quantity: "1", price: "", discount: "", priceType, discountTuri: "sum", discountFoiz: "", birlikId: "", ustama: "" };
}

// Bir dona narxi (sotuv valyutasida): katalog narxi + ustama.
function qatorBirNarxi(mahsulot: MahsulotQatori) {
  return ustamaliNarx(raqamgaAylantirish(mahsulot.price), raqamgaAylantirish(mahsulot.ustama));
}

// Qatordagi chegirma summasi (sotuv valyutasida): foizda kiritilgan bo'lsa qator jamidan hisoblanadi; qator jamidan oshmaydi.
function qatorChegirmasi(mahsulot: MahsulotQatori) {
  return chegirmaSummasi({
    miqdor: raqamgaAylantirish(mahsulot.quantity),
    narx: qatorBirNarxi(mahsulot),
    tur: mahsulot.discountTuri,
    summa: raqamgaAylantirish(mahsulot.discount),
    foiz: raqamgaAylantirish(mahsulot.discountFoiz),
  });
}

const faoliyatTablar = ["Ish", "Izoh", "Xabar", "Vazifa", "Uchrashuv"];

const faoliyatTabIkonkalari: Record<string, typeof CalendarCheck> = {
  Ish: CalendarCheck,
  Izoh: MessageSquare,
  Xabar: Send,
  Vazifa: ClipboardCheck,
  Uchrashuv: Users,
};

const faoliyatTabKalitlari: Record<string, string> = {
  Ish: "activityTabs.work",
  Izoh: "activityTabs.comment",
  Xabar: "activityTabs.message",
  Vazifa: "activityTabs.task",
  Uchrashuv: "activityTabs.meeting",
};

const faoliyatMatnlari: Record<string, { title: string; placeholder: string }> = {
  Ish: {
    title: "activityContent.work.title",
    placeholder: "activityContent.work.placeholder",
  },
  Izoh: {
    title: "activityContent.comment.title",
    placeholder: "activityContent.comment.placeholder",
  },
  Xabar: {
    title: "activityContent.message.title",
    placeholder: "activityContent.message.placeholder",
  },
  Vazifa: {
    title: "activityContent.task.title",
    placeholder: "activityContent.task.placeholder",
  },
  Uchrashuv: {
    title: "activityContent.meeting.title",
    placeholder: "activityContent.meeting.placeholder",
  },
};

const bosqichKodlari = [
  { value: "Yangi", labelKey: "stages.new" },
  { value: "Hujjat tayyorlash", labelKey: "stages.preparingDocument" },
  { value: "Oldindan to'lov hisobi", labelKey: "stages.prepaymentInvoice" },
  { value: "Ish jarayonida", labelKey: "stages.inProgress" },
  { value: "Yakuniy hisob", labelKey: "stages.finalInvoice" },
  { value: "Sotuv muvaffaqiyatli", labelKey: "stages.saleSuccessful" },
  { value: "Sotuv bekor bo'ldi", labelKey: "stages.saleCancelled" },
  { value: "Bekor sababini tahlil qilish", labelKey: "stages.cancelReasonAnalysis" },
];

const valyutaKodlari = [
  { value: "UZS", labelKey: "currencies.uzs" },
  { value: "USD", labelKey: "currencies.usd" },
];

function bugungiSana() {
  const date = new Date();
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
}

function kelasiHafta() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
}

function faoliyatSanasiMatni(dateValue: string, timeValue: string, t: TFunction) {
  const parsed = new Date(`${dateValue || bugungiSana()}T${timeValue || "00:00"}`);

  if (Number.isNaN(parsed.getTime())) {
    return t("activity.defaultDateTime");
  }

  const sanaMatni =
    dateValue === bugungiSana()
      ? t("activity.today")
      : new Intl.DateTimeFormat(t("common:dateLocale"), {
          weekday: "short",
          day: "numeric",
          month: "short",
        }).format(parsed);

  return t("activity.dateAtTime", { date: sanaMatni, time: timeValue || "15:00" });
}

function qoldiqNomi(qoldiq: QoldiqTanlovi, t: TFunction) {
  const productName = qoldiq.modification?.product?.name;
  const variantName = qoldiq.modification?.name;

  if (productName && variantName && variantName !== "Asosiy variant") {
    return `${productName} - ${variantName}`;
  }

  return (
    productName ||
    variantName ||
    qoldiq.modification?.barcode ||
    qoldiq.modification?.article ||
    t("common.unknownProduct")
  );
}

function qoldiqMiqdori(qoldiq?: QoldiqTanlovi) {
  return Number(qoldiq?.quantity ?? qoldiq?.balance ?? 0);
}

function qoldiqBirligi(qoldiq: QoldiqTanlovi | undefined, t: TFunction) {
  return qoldiq?.modification?.product?.name ? t("common.unit") : t("common.unit");
}

function qoldiqNarxi(qoldiq?: QoldiqTanlovi) {
  return (
    qoldiq?.sellingPrice ??
    qoldiq?.price ??
    qoldiq?.modification?.price?.sellingPrice ??
    qoldiq?.modification?.price?.retailPrice ??
    0
  );
}

// Dollarda narxlangan mahsulot: asl narx ($100). Sotuvga baribir so'mdagi narx (bugungi kurs bo'yicha) qo'yiladi.
function dollarNarxi(valyuta?: QoldiqTanlovi["valyuta"]) {
  return valyuta ? `$${valyuta.asl.toLocaleString("uz-UZ", { maximumFractionDigits: 2 })}` : "";
}

// Mahsulot narxi sotuv valyutasida. So'mda: katalogdagi so'mdagi narx. Dollarda: dollarda narxlangan mahsulot o'z dollar narxida,
// so'mda narxlangan mahsulot esa bugungi kurs bo'yicha o'girilgan (sentgacha yaxlitlangan) narxda.
// Tanlangan narx turi (tan narx / chakana / ulgurji) bo'yicha; narx yo'q bo'lsa 0.
function qoldiqNarxiValyutada(qoldiq: QoldiqTanlovi | undefined, valyuta: "UZS" | "USD", kurs: number, tur: SotuvNarxTuri = "RETAIL", birlik?: TovarBirligi) {
  return narxSotuvValyutasida(birlikNarxi(turNarxi(qoldiq, tur, kurs), birlik, tur), valyuta, kurs);
}

function qoldiqKaliti(qoldiq: Pick<QoldiqTanlovi, "modificationId" | "warehouseId">) {
  return qoldiq.warehouseId ? `${qoldiq.modificationId}::${qoldiq.warehouseId}` : qoldiq.modificationId;
}

function raqamgaAylantirish(value: string) {
  if (!value.trim()) return 0;
  const number = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function mijozKorinishi(mijoz: MijozTanlovi | undefined, t: TFunction) {
  return (
    [mijoz?.firstName, mijoz?.lastName].filter(Boolean).join(" ") ||
    mijoz?.fullName ||
    mijoz?.name ||
    mijoz?.id ||
    t("common.client")
  );
}

function mijozKompaniyaId(mijoz?: MijozTanlovi) {
  return mijoz?.companyId || mijoz?.company?.id || "";
}

function kompaniyaNomi(kompaniya?: MijozTanlovi) {
  return kompaniya?.name || kompaniya?.fullName || kompaniya?.id || "";
}

function xodimNomi(xodim: XodimTanlovi | undefined, t: TFunction) {
  return xodim?.fullName || xodim?.name || xodim?.username || xodim?.email || xodim?.id || t("common.employee");
}

function xodimBoshHarflari(xodim: XodimTanlovi | undefined, t: TFunction) {
  const nom = xodimNomi(xodim, t);
  const qismlar = nom.split(/\s+/).filter(Boolean);
  return qismlar
    .slice(0, 2)
    .map((qism) => qism[0])
    .join("")
    .toUpperCase();
}

export default function YangiSotuvModal({
  variant = "sale",
  omborlar,
  mijozlar,
  mijozKompaniyalari,
  xodimlar,
  qoldiqlar,
  amalBajarilmoqda,
  onOmborTanlash,
  onSaqlash,
  onYopish,
}: YangiSotuvModalProps) {
  const { t } = useTranslation("savdo_yangi");
  const [warehouseId, setWarehouseId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [clientCompanyId, setClientCompanyId] = useState("");
  const [responsibleId, setResponsibleId] = useState("");
  // Sotuv sanasi: bugun yoki o'tgan kun (kelajak yo'q); o'tgan kun tanlansa backend hujjatni shu kunning oxirida yozadi.
  const [hujjatSanasi, setHujjatSanasi] = useState(() => bugungiToshkentKuni());
  const joriyProfil = useAuthProfileStore((state) => state.profil);
  const profilniYuklash = useAuthProfileStore((state) => state.profilniYuklash);

  useEffect(() => {
    if (!joriyProfil) void profilniYuklash();
  }, [joriyProfil, profilniYuklash]);

  useEffect(() => {
    // Sotuvning mas'ul xodimi har doim tizimga real kirgan foydalanuvchining
    // o'zi bo'lishi kerak (masalan, direktor kirsa - direktor, admin kirsa - admin).
    if (joriyProfil?.id) setResponsibleId(joriyProfil.id);
  }, [joriyProfil]);
  const [sotuvNomi, setSotuvNomi] = useState("");
  const [bosqich, setBosqich] = useState("Yangi");
  const [valyuta, setValyuta] = useState("UZS");
  // Dollarda sotuv faqat valyuta rejimi yoqilgan va bugungi kurs kiritilgan bo'lsa mumkin (backend tasdiqlashda shu kurs bilan o'giradi).
  const kurs = useValyutaStore((holat) => holat.kurs);
  const usdMumkin = useValyutaStore((holat) => holat.rejimYoniq && holat.kursBor && holat.kurs > 0);
  const sotuvVal: "UZS" | "USD" = valyuta === "USD" ? "USD" : "UZS";
  const [boshlanishSanasi, setBoshlanishSanasi] = useState(bugungiSana());
  const [tugashSanasi, setTugashSanasi] = useState(kelasiHafta());
  const [faolTab, setFaolTab] = useState("Ish");
  const [faoliyatSarlavha, setFaoliyatSarlavha] = useState("");
  const [faoliyatTafsilot, setFaoliyatTafsilot] = useState("");
  const [faoliyatSana, setFaoliyatSana] = useState(bugungiSana());
  const [faoliyatSoat, setFaoliyatSoat] = useState("15:00");
  const [faoliyatSaqlangan, setFaoliyatSaqlangan] = useState(false);
  const [faoliyatOchiq, setFaoliyatOchiq] = useState(false);
  const [sanaMenyuOchiq, setSanaMenyuOchiq] = useState(false);
  const [sotuvBackendgaSaqlandi, setSotuvBackendgaSaqlandi] = useState(false);
  const [mahsulotlar, setMahsulotlar] = useState<MahsulotQatori[]>([bosQator("RETAIL")]);
  // Narx turlari (Sozlamalar → Sotuv): yoqilganlari tanlanadi; sozlama noma'lum bo'lsa chakana va ulgurji ochiq (tannarx — faqat yoqilgan bo'lsa).
  const narxSozlamasi = useSavdoSozlamalariStore((holat) => holat.narxTurlari);
  const narxSozlamasiniYuklash = useSavdoSozlamalariStore((holat) => holat.yuklash);
  const [narxTuri, setNarxTuri] = useState<SotuvNarxTuri>("RETAIL");
  const [narxXabari, setNarxXabari] = useState("");
  // "Sotuv narxi" maydoni hisoblangan qiymatni ko'rsatadi (katalog + ustama − chegirma / miqdor), shuning uchun yozilayotgan matn alohida
  // saqlanadi: aks holda maydonni bo'shatib bo'lmaydi (bo'sh qiymat darrov katalog narxiga qaytadi). Maydondan chiqilganda hisoblangan narx ko'rinadi.
  const [narxTahriri, setNarxTahriri] = useState<{ qator: number; matn: string } | null>(null);
  const narxTuriTanlandi = useRef(false);
  const turRuxsati = (tur: SotuvNarxTuri) => (narxSozlamasi ? narxSozlamasi.includes(tur) : tur !== "COST");
  useEffect(() => {
    void narxSozlamasiniYuklash();
  }, [narxSozlamasiniYuklash]);
  // Sozlama yuklangach (sotuvchi hali tur tanlamagan bo'lsa) standart tur — yoqilganlarning birinchisi.
  useEffect(() => {
    const standart = narxSozlamasi?.[0];
    if (!standart || narxTuriTanlandi.current) return;
    setNarxTuri(standart);
    setMahsulotlar((joriy) => joriy.map((qator) => (qator.modificationId ? qator : { ...qator, priceType: standart })));
  }, [narxSozlamasi]);
  const [xatolik, setXatolik] = useState("");
  // Klaviatura bilan tez kiritish: keyingi fokus (mahsulot ro'yxati yoki miqdor maydoni) va shtrix-kod skaneri.
  const [fokusSorovi, setFokusSorovi] = useState<{ qator: number; maydon: "mahsulot" | "miqdor"; n: number } | null>(null);
  const fokusNavbati = useRef(0);
  const [skanMatni, setSkanMatni] = useState("");
  const [skanXabari, setSkanXabari] = useState<{ xato: boolean; matn: string } | null>(null);
  const skanInputRef = useRef<HTMLInputElement | null>(null);
  const qatorlarRef = useRef<HTMLDivElement | null>(null);
  // UI: ixtiyoriy izoh (backend izohiga qo'shiladi), import natijasi va bosqichlar uchun bo'limlarga o'tish.
  const [izoh, setIzoh] = useState("");
  const [importXabari, setImportXabari] = useState<{ xato: boolean; matn: string } | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const mijozKartasiRef = useRef<HTMLElement | null>(null);
  const mahsulotKartasiRef = useRef<HTMLElement | null>(null);
  const xulosaKartasiRef = useRef<HTMLDivElement | null>(null);
  const saqlashTugmasiRef = useRef<HTMLButtonElement | null>(null);

  // Mahsulot ro'yxatini ochishni SavdoSelect o'zi bajaradi (`ochishSorovi`); miqdor maydoniga fokusni shu yerda beramiz.
  useEffect(() => {
    if (!fokusSorovi) return;
    if (fokusSorovi.maydon === "miqdor") {
      const maydon = qatorlarRef.current?.querySelector<HTMLInputElement>(`input[data-sotuv-miqdor="${fokusSorovi.qator}"]`);
      maydon?.focus();
      maydon?.select();
    }
    setFokusSorovi(null);
  }, [fokusSorovi]);

  const jami = useMemo(
    () =>
      mahsulotlar.reduce(
        (summa, mahsulot) =>
          summa +
          raqamgaAylantirish(mahsulot.quantity) *
            qatorBirNarxi(mahsulot) -
          qatorChegirmasi(mahsulot),
        0
      ),
    [mahsulotlar]
  );
  const bosqichlar = useMemo(
    () => bosqichKodlari.map((item) => ({ value: item.value, label: t(item.labelKey) })),
    [t]
  );
  const valyutalar = useMemo(
    () =>
      valyutaKodlari.map((item) => {
        const yopiq = item.value === "USD" && !usdMumkin;
        return { value: item.value, label: yopiq ? t("currencies.usdNoRate") : t(item.labelKey), disabled: yopiq };
      }),
    [t, usdMumkin]
  );
  const tanlanganMijoz = mijozlar.find((item) => item.id === customerId);
  const tanlanganKompaniya = mijozKompaniyalari.find((item) => item.id === clientCompanyId);
  const tanlanganXodim = xodimlar.find((item) => item.id === responsibleId);
  const draftMode = variant === "draft";
  const modalMatnlari = draftMode
    ? {
        title: t("modal.draftTitle"),
        badge: t("modal.draftBadge"),
        sectionTitle: t("modal.draftSectionTitle"),
        nameLabel: t("modal.draftNameLabel"),
        namePlaceholder: t("modal.draftNamePlaceholder"),
        amountLabel: t("modal.draftAmountLabel"),
        notePrefix: t("modal.draftNotePrefix"),
        stockWarning: t("modal.draftStockWarning"),
        submitLabel: t("modal.draftSubmitLabel"),
      }
    : {
        title: t("modal.saleTitle"),
        badge: t("modal.saleBadge"),
        sectionTitle: t("modal.saleSectionTitle"),
        nameLabel: t("modal.saleNameLabel"),
        namePlaceholder: t("modal.saleNamePlaceholder"),
        amountLabel: t("modal.saleAmountLabel"),
        notePrefix: t("modal.saleNotePrefix"),
        stockWarning: t("modal.saleStockWarning"),
        submitLabel: t("modal.saleSubmitLabel"),
      };
  function backendIzohiniYigish() {
    const metadata = [
      sotuvNomiIzohi(sotuvNomi, modalMatnlari.notePrefix),
      bosqich ? `${t("note.stageLabel")}: ${bosqich}` : "",
      `${t("note.currencyLabel")}: ${valyutalar.find((item) => item.value === valyuta)?.label ?? valyuta}`,
      boshlanishSanasi ? `${t("note.startDateLabel")}: ${boshlanishSanasi}` : "",
      tugashSanasi ? `${t("note.endDateLabel")}: ${tugashSanasi}` : "",
      izoh.trim() ? `${t("note.commentLabel")}: ${izoh.trim()}` : "",
    ].filter(Boolean);

    return metadata.join("\n");
  }

  async function faoliyatniBackendgaSaqlash() {
    const faoliyatOzgarilgan = faoliyatSaqlangan || Boolean(faoliyatSarlavha.trim()) || Boolean(faoliyatTafsilot.trim());
    if (!faoliyatOzgarilgan) return true;
    const partnerId = tanlanganMijoz?.partner?.id;
    if (!partnerId) {
      setXatolik("errors.selectClientForActivity");
      return false;
    }
    try {
      const faolTabMatni = faoliyatMatnlari[faolTab];
      const sarlavha = faoliyatSarlavha.trim() || (faolTabMatni ? t(faolTabMatni.title) : "") || t("activity.fallbackName");
      const matn = faoliyatTafsilot.trim() || sarlavha;
      if (faolTab === "Izoh") {
        await crmApi.partnerCommentYaratish(partnerId, { text: matn });
      } else if (faolTab === "Xabar") {
        await crmApi.partnerChatXabarYuborish(partnerId, matn);
      } else {
        if (!responsibleId) {
          setXatolik("errors.selectResponsibleForTask");
          return false;
        }
        const dueAt = new Date(`${faoliyatSana}T${faoliyatSoat || "00:00"}`).toISOString();
        const faoliyatTuri = faolTab === "Vazifa" ? "TASK" : faolTab === "Uchrashuv" ? "MEETING" : "CALL";
        await crmApi.activityYaratish({
          type: faoliyatTuri,
          partnerId,
          subject: sarlavha,
          description: faoliyatTafsilot.trim() || undefined,
          dueAt,
          assigneeId: responsibleId,
        });
      }
      return true;
    } catch (error) {
      setXatolik(getApiErrorMessage(error));
      return false;
    }
  }

  // Valyuta almashganda tanlangan mahsulotlarning narxi va chegirmasi yangi valyutaga o'giriladi (bugungi kurs bo'yicha).
  function valyutaniOzgartirish(yangi: string) {
    const yangiVal: "UZS" | "USD" = yangi === "USD" ? "USD" : "UZS";
    if (yangiVal === sotuvVal) return;
    if (yangiVal === "USD" && !usdMumkin) {
      setXatolik("errors.usdUnavailable");
      return;
    }
    setXatolik("");
    setMahsulotlar((joriy) =>
      joriy.map((qator) => {
        const qoldiq = qoldiqlar.find((item) => qoldiqKaliti(item) === qator.qoldiqKaliti);
        if (!qoldiq) return qator;
        const narx = qoldiqNarxiValyutada(qoldiq, yangiVal, kurs, qator.priceType, birlikTopish(qoldiq.birliklar, qator.birlikId));
        // Foizdagi chegirma valyutaga bog'liq emas; summadagisi yangi valyutaga o'giriladi.
        const eskiChegirma = qator.discountTuri === "sum" ? raqamgaAylantirish(qator.discount) : 0;
        const yangiChegirma =
          yangiVal === "USD" ? Math.round((eskiChegirma / kurs) * 100) / 100 : Math.round(eskiChegirma * kurs);
        const eskiUstama = raqamgaAylantirish(qator.ustama);
        const yangiUstama = yangiVal === "USD" ? Math.round((eskiUstama / kurs) * 100) / 100 : Math.round(eskiUstama * kurs);
        return {
          ...qator,
          price: narx ? String(narx) : "",
          discount: qator.discountTuri === "sum" ? (eskiChegirma > 0 ? String(yangiChegirma) : "") : qator.discount,
          ustama: eskiUstama > 0 && yangiUstama > 0 ? String(yangiUstama) : "",
        };
      })
    );
    setValyuta(yangiVal);
  }

  function mahsulotniYangilash(index: number, yangilanish: Partial<MahsulotQatori>) {
    setMahsulotlar((joriy) =>
      joriy.map((mahsulot, qatorIndex) =>
        qatorIndex === index ? { ...mahsulot, ...yangilanish } : mahsulot
      )
    );
  }

  function modifikatsiyaniTanlash(index: number, tanlanganQoldiqKaliti: string) {
    // Bitta mahsulot bir nechta omborda mavjud bo'lishi mumkin, shuning uchun
    // faqat modificationId emas, aynan modificationId+warehouseId kombinatsiyasi
    // bo'yicha aniq qoldiq yozuvini topamiz (aks holda boshqa ombordagi
    // qoldiq/narx tasodifan tanlanib qolishi mumkin edi).
    const qoldiq = qoldiqlar.find((item) => qoldiqKaliti(item) === tanlanganQoldiqKaliti);
    // Tanlangan narx turida narx yo'q bo'lsa (masalan, ulgurji narx belgilanmagan) mos boshqa tur olinadi.
    const tur = qatorNarxTuri(qoldiq, narxTuri, turRuxsati, kurs) ?? narxTuri;
    const narx = qoldiqNarxiValyutada(qoldiq, sotuvVal, kurs, tur);
    mahsulotniYangilash(index, {
      modificationId: qoldiq?.modificationId ?? tanlanganQoldiqKaliti,
      qoldiqKaliti: tanlanganQoldiqKaliti,
      priceType: tur,
      price: narx ? String(narx) : "",
      birlikId: "",
      ustama: "",
    });

    if (qoldiq?.warehouseId && qoldiq.warehouseId !== warehouseId) {
      setWarehouseId(qoldiq.warehouseId);
      onOmborTanlash(qoldiq.warehouseId);
    }
  }

  // Mahsulot tanlash ro'yxati: tanlangan ombordagi qoldig'i borlar tanlanadi, qoldig'i yo'qlar
  // (ombordan tugagan yoki umuman kirim qilinmagan) qizil belgi bilan o'chirilgan holda pastda ko'rsatiladi.
  function mahsulotOptionlari(): SavdoSelectOption[] {
    const korinadigan = qoldiqlar.filter(
      (item) => !warehouseId || !item.warehouseId || item.warehouseId === warehouseId
    );
    const omborniBilganlar = new Set(
      korinadigan.filter((item) => item.warehouseId).map((item) => item.modificationId)
    );
    const royxat = korinadigan.filter(
      // Ombor ma'lumotisiz katalog yozuvi, shu mahsulotning haqiqiy ombor yozuvi bor bo'lsa, takrorlanmaydi.
      (item) => item.warehouseId || !omborniBilganlar.has(item.modificationId)
    );

    // Shu mahsulotning boshqa ombordagi yozuvlaridan nom va narx olinadi (qoldig'i yo'q yozuvda ular bo'sh bo'lishi mumkin).
    const nomlar = new Map<string, string>();
    const narxlar = new Map<string, number>();
    for (const item of qoldiqlar) {
      if (!item.modificationId) continue;
      const nom = qoldiqNomi(item, t);
      if (nom !== t("common.unknownProduct") && !nomlar.has(item.modificationId)) nomlar.set(item.modificationId, nom);
      const narx = Number(qoldiqNarxi(item)) || 0;
      if (narx > 0 && !narxlar.has(item.modificationId)) narxlar.set(item.modificationId, narx);
    }

    return royxat
      .map((item) => {
        const miqdor = qoldiqMiqdori(item);
        // Dollarda narxlangan mahsulotga kurs kiritilmagan bo'lsa so'mdagi narx yo'q: sotuvga qo'shib bo'lmaydi.
        const kursYoq = item.valyuta?.currency === "USD" && item.valyuta.uzs === null;
        const mavjud = miqdor > 0 && !kursYoq;
        const oziNomi = qoldiqNomi(item, t);
        const nom =
          oziNomi !== t("common.unknownProduct")
            ? oziNomi
            : (item.modificationId ? nomlar.get(item.modificationId) : undefined) ??
              `${oziNomi} #${String(item.modificationId ?? "").slice(-6)}`;
        const itemOmborNomi =
          item.warehouse?.name ?? omborlar.find((ombor) => ombor.id === item.warehouseId)?.name;
        const narxMatni =
          kursYoq && item.valyuta
            ? dollarNarxi(item.valyuta)
            : sotuvVal === "USD"
              ? pulniFormatlash(
                  qoldiqNarxiValyutada(item, "USD", kurs) ||
                    (kurs > 0 && item.modificationId ? Math.round(((narxlar.get(item.modificationId) ?? 0) / kurs) * 100) / 100 : 0),
                  "USD"
                )
              : pulniFormatlash(Number(qoldiqNarxi(item)) || (item.modificationId ? narxlar.get(item.modificationId) : 0) || 0) +
                (item.valyuta ? ` (${dollarNarxi(item.valyuta)})` : "");

        // Qidiruv va aniq moslik uchun: shtrix-kod/artikul va aniq nom variantlari.
        const kodlar = [item.modification?.barcode, item.modification?.article].filter((kod): kod is string => Boolean(kod?.trim()));
        const aniqNomlar = [nom, item.modification?.product?.name].filter((matn): matn is string => Boolean(matn?.trim()));

        return {
          mavjud,
          nom,
          option: mavjud
            ? {
                value: qoldiqKaliti(item),
                searchLabel: nom,
                kodlar,
                nomlar: aniqNomlar,
                label: `${nom}${itemOmborNomi ? ` (${itemOmborNomi})` : ""} - ${t("products.stockLabelShort")}: ${miqdor} - ${t("products.priceLabelShort")}: ${narxMatni}`,
              }
            : {
                value: qoldiqKaliti(item),
                searchLabel: nom,
                kodlar,
                nomlar: aniqNomlar,
                disabled: true,
                xavf: true,
                label: (
                  <span className="flex w-full min-w-0 items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-slate-500">
                      {nom} - {t("products.priceLabelShort")}: {narxMatni}
                    </span>
                    <span className="shrink-0 rounded-md bg-red-100 px-2 py-0.5 text-[11px] font-black uppercase text-red-600">
                      {kursYoq ? t("products.noRate") : t("products.outOfStock")}
                    </span>
                  </span>
                ),
              },
        };
      })
      // Avval qoldig'i borlar, keyin yo'qlar; ichida nom bo'yicha.
      .sort((x, y) => Number(y.mavjud) - Number(x.mavjud) || x.nom.localeCompare(y.nom, "uz"))
      .map((x) => x.option);
  }

  function mijozniTanlash(tanlanganCustomerId: string) {
    setCustomerId(tanlanganCustomerId);

    if (!tanlanganCustomerId) {
      setClientCompanyId("");
      return;
    }

    const mijoz = mijozlar.find((item) => item.id === tanlanganCustomerId);
    const boglanganKompaniyaId = mijozKompaniyaId(mijoz);

    if (boglanganKompaniyaId) {
      setClientCompanyId(boglanganKompaniyaId);
    } else {
      setClientCompanyId("");
    }
  }

  function kompaniyaniTanlash(tanlanganCompanyId: string) {
    setClientCompanyId(tanlanganCompanyId);

    if (!tanlanganCompanyId) {
      setCustomerId("");
      return;
    }

    const vakil = mijozlar.find((mijoz) => mijozKompaniyaId(mijoz) === tanlanganCompanyId);
    setCustomerId(vakil?.id ?? "");
  }

  function qatorQoshish() {
    setMahsulotlar((joriy) => [...joriy, bosQator(narxTuri)]);
  }

  function fokusSoralish(qator: number, maydon: "mahsulot" | "miqdor") {
    fokusNavbati.current += 1;
    setFokusSorovi({ qator, maydon, n: fokusNavbati.current });
  }

  // Miqdor/chegirma maydonida Enter: keyingi qatorga o'tadi. Keyingi qator yo'q bo'lsa va joriy qatorda mahsulot bor bo'lsa,
  // yangi qator qo'shiladi va uning mahsulot ro'yxati ochiladi. Enter hech qachon sotuvni saqlamaydi.
  function keyingiQatorgaOtish(index: number) {
    const joriy = mahsulotlar[index];
    if (!joriy?.modificationId || raqamgaAylantirish(joriy.quantity) <= 0) return;
    const keyingi = mahsulotlar[index + 1];
    if (keyingi) {
      fokusSoralish(index + 1, keyingi.modificationId ? "miqdor" : "mahsulot");
      return;
    }
    qatorQoshish();
    fokusSoralish(index + 1, "mahsulot");
  }

  // Shtrix-kod (yoki artikul) to'liq mos kelsa mahsulot qo'shiladi; qator bor bo'lsa miqdori 1 taga oshadi (takror qator yo'q).
  function shtrixKodniQoshish() {
    const kod = skanMatni.trim().toLowerCase();
    if (!kod) return;
    const xato = (matn: string) => {
      setSkanXabari({ xato: true, matn });
      // Xato kod matni belgilanadi: keyingi skan uni almashtiradi.
      skanInputRef.current?.select();
    };
    const korinadigan = qoldiqlar.filter((item) => !warehouseId || !item.warehouseId || item.warehouseId === warehouseId);
    const mos = korinadigan.filter(
      (item) =>
        item.modification?.barcode?.trim().toLowerCase() === kod ||
        item.modification?.article?.trim().toLowerCase() === kod ||
        Boolean(shtrixBirligi(item.birliklar, kod))
    );
    if (mos.length === 0) {
      xato(t("products.scanNotFound"));
      return;
    }
    const sotuvga = mos.filter(
      (item) => item.warehouseId && qoldiqMiqdori(item) > 0 && !(item.valyuta?.currency === "USD" && item.valyuta.uzs === null)
    );
    if (sotuvga.length === 0) {
      const nom = qoldiqNomi(mos[0], t);
      const kursYoq = mos[0].valyuta?.currency === "USD" && mos[0].valyuta.uzs === null;
      xato(t(kursYoq ? "products.scanNoRate" : "products.scanOutOfStock", { name: nom }));
      return;
    }
    if (!warehouseId && new Set(sotuvga.map((item) => item.warehouseId)).size > 1) {
      xato(t("products.scanPickWarehouse", { name: qoldiqNomi(sotuvga[0], t) }));
      return;
    }
    const item = [...sotuvga].sort((x, y) => qoldiqMiqdori(y) - qoldiqMiqdori(x))[0];
    const nom = qoldiqNomi(item, t);
    const kalit = qoldiqKaliti(item);
    const mavjudMiqdor = qoldiqMiqdori(item);
    // Pochka shtrix-kodi o'qilsa — shu birlik tanlanadi (qoldiq asosiy birlikda tekshiriladi).
    const skanBirligi = shtrixBirligi(item.birliklar, kod);
    const skanBirlikId = skanBirligi?.unitId ?? "";
    const bor = mahsulotlar.findIndex((mahsulot) => mahsulot.qoldiqKaliti === kalit && mahsulot.birlikId === skanBirlikId);

    if (bor >= 0) {
      const yangiMiqdor = raqamgaAylantirish(mahsulotlar[bor].quantity) + 1;
      if (asosiyMiqdor(skanBirligi, yangiMiqdor) > mavjudMiqdor) {
        xato(t("products.scanNotEnough", { name: nom, available: mavjudMiqdor }));
        return;
      }
      mahsulotniYangilash(bor, { quantity: String(yangiMiqdor) });
      setSkanXabari({ xato: false, matn: t("products.scanAdded", { name: nom, qty: yangiMiqdor }) });
    } else {
      const tur = qatorNarxTuri(item, narxTuri, turRuxsati, kurs) ?? narxTuri;
      const narx = qoldiqNarxiValyutada(item, sotuvVal, kurs, tur, skanBirligi);
      const yangiQator: MahsulotQatori = {
        ...bosQator(tur),
        modificationId: item.modificationId,
        qoldiqKaliti: kalit,
        price: narx ? String(narx) : "",
        birlikId: skanBirlikId,
      };
      // Birinchi bo'sh qator to'ldiriladi, bo'lmasa yangi qator qo'shiladi.
      setMahsulotlar((joriy) => {
        const bosh = joriy.findIndex((mahsulot) => !mahsulot.modificationId);
        return bosh >= 0 ? joriy.map((mahsulot, qatorIndex) => (qatorIndex === bosh ? yangiQator : mahsulot)) : [...joriy, yangiQator];
      });
      if (item.warehouseId && item.warehouseId !== warehouseId) {
        setWarehouseId(item.warehouseId);
        onOmborTanlash(item.warehouseId);
      }
      setSkanXabari({ xato: false, matn: t("products.scanAdded", { name: nom, qty: 1 }) });
    }
    setSkanMatni("");
    skanInputRef.current?.focus();
  }

  function nusxaOlish() {
    if (typeof window === "undefined") return;
    void navigator.clipboard?.writeText(window.location.href);
  }

  function qoralamaniYuklash() {
    if (typeof window === "undefined") return;
    const blob = new Blob(
      [
        JSON.stringify(
          {
            warehouseId,
            customerId,
            clientCompanyId,
            responsibleId,
            sotuvNomi: sotuvNomi.trim(),
            bosqich,
            valyuta,
            boshlanishSanasi,
            tugashSanasi,
            note: backendIzohiniYigish(),
            items: mahsulotlar,
          },
          null,
          2
        ),
      ],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `yangi-sotuv-qoralama-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setXatolik("");

    // Backendga ketadigan qatorlar: narx turi (priceType), narx va chegirma summasi (foizda kiritilsa discountPercent ham).
    // Dollarli sotuvda mahsulot o'z valyutasida (dollarda yoki so'mda) yuboriladi: backend tasdiqlash kunidagi kurs bilan o'giradi.
    const yuboriladiganQatorlar = mahsulotlar
      .filter(
        (mahsulot) => mahsulot.modificationId && raqamgaAylantirish(mahsulot.quantity) > 0 && raqamgaAylantirish(mahsulot.price) >= 0
      )
      .map((mahsulot) =>
        yuboriladiganQator({
          modificationId: mahsulot.modificationId,
          miqdor: raqamgaAylantirish(mahsulot.quantity),
          tur: mahsulot.priceType,
          qoldiq: qoldiqlar.find((item) => qoldiqKaliti(item) === mahsulot.qoldiqKaliti),
          sotuvVal,
          kurs,
          narx: raqamgaAylantirish(mahsulot.price),
          chegirma: qatorChegirmasi(mahsulot),
          chegirmaTuri: mahsulot.discountTuri,
          foiz: raqamgaAylantirish(mahsulot.discountFoiz),
          ustama: raqamgaAylantirish(mahsulot.ustama),
          birlik: birlikTopish(qoldiqlar.find((item) => qoldiqKaliti(item) === mahsulot.qoldiqKaliti)?.birliklar, mahsulot.birlikId),
        })
      );

    if (!warehouseId) {
      setXatolik("errors.selectWarehouseFirst");
      return;
    }

    if (boshlanishSanasi && tugashSanasi && tugashSanasi < boshlanishSanasi) {
      setXatolik("errors.endDateBeforeStart");
      return;
    }

    if (sotuvVal === "USD" && !usdMumkin) {
      setXatolik("errors.usdUnavailable");
      return;
    }

    if (yuboriladiganQatorlar.length === 0) {
      setXatolik("errors.selectAtLeastOneProduct");
      return;
    }

    for (const mahsulot of mahsulotlar) {
      const soralganMiqdor = raqamgaAylantirish(mahsulot.quantity);
      if (!mahsulot.modificationId || soralganMiqdor <= 0) continue;
      const tanlanganQoldiq = qoldiqlar.find((item) => qoldiqKaliti(item) === mahsulot.qoldiqKaliti);
      if (tanlanganQoldiq?.warehouseId && tanlanganQoldiq.warehouseId !== warehouseId) {
        setXatolik("errors.productOtherWarehouse");
        return;
      }
      const mavjudMiqdor = tanlanganQoldiq ? qoldiqMiqdori(tanlanganQoldiq) : 0;
      const birlik = birlikTopish(tanlanganQoldiq?.birliklar, mahsulot.birlikId);
      if (!miqdorYaroqlimi(birlik, soralganMiqdor)) {
        setXatolik("errors.quantityNotWhole");
        return;
      }
      // Qoldiq asosiy birlikda: pochkada kiritilgan miqdor asosiy birlikka o'giriladi.
      const talab = asosiyMiqdor(birlik, soralganMiqdor);
      if (talab > mavjudMiqdor) {
        setXatolik(
          t("errors.insufficientStock", {
            name: tanlanganQoldiq ? qoldiqNomi(tanlanganQoldiq, t) : t("common.selectedProductFallback"),
            available: mavjudMiqdor,
            requested: talab,
          })
        );
        return;
      }
    }

    if (jami <= 0) {
      setXatolik("errors.totalMustBePositive");
      return;
    }

    let muvaffaqiyatli = sotuvBackendgaSaqlandi;
    if (!sotuvBackendgaSaqlandi) {
      muvaffaqiyatli = await onSaqlash({
        ...yangiHujjatSanasi(hujjatSanasi),
        warehouseId,
        customerId: customerId || undefined,
        clientCompanyId: clientCompanyId || undefined,
        responsibleId: responsibleId || undefined,
        saleType: customerId || clientCompanyId ? "CLIENT" : "QUICK",
        note: backendIzohiniYigish() || undefined,
        // Tanlangan sotuv valyutasi har doim aniq yuboriladi (berilmasa backend mijozli savdoni USD deb oladi).
        currency: sotuvVal,
        items: yuboriladiganQatorlar,
      });
      if (muvaffaqiyatli) setSotuvBackendgaSaqlandi(true);
    }

    if (muvaffaqiyatli && await faoliyatniBackendgaSaqlash()) onYopish();
  }

  // ── UI: bosqichlar, xulosa kartalari va yordamchi funksiyalar (hisob-kitob va saqlash mantiqi o'zgarmagan) ──
  const mahsulotTanlanganQatorlar = mahsulotlar.filter((mahsulot) => mahsulot.modificationId);
  const mahsulotlarSoni = mahsulotTanlanganQatorlar.length;
  const umumiyMiqdor = mahsulotTanlanganQatorlar.reduce((summa, mahsulot) => summa + raqamgaAylantirish(mahsulot.quantity), 0);
  const umumiyChegirma = mahsulotlar.reduce((summa, mahsulot) => summa + qatorChegirmasi(mahsulot), 0);
  const mijozQadamiTayyor = Boolean(customerId || clientCompanyId);
  const mahsulotQadamiTayyor = mahsulotTanlanganQatorlar.some((mahsulot) => raqamgaAylantirish(mahsulot.quantity) > 0);
  const tolovQadamiTayyor = mahsulotQadamiTayyor && jami > 0;
  const qadamHolatlari = [mijozQadamiTayyor, mahsulotQadamiTayyor, tolovQadamiTayyor, false];
  // Joriy bosqich: birinchi tugallanmagan bosqich (mahsulot tanlangan bo'lsa mijoz bosqichi ixtiyoriy deb o'tkazib yuboriladi).
  const joriyQadam = Math.min(Math.max(qadamHolatlari.findIndex((tayyor, index) => !tayyor && index >= (mahsulotQadamiTayyor ? 1 : 0)), 0), 3);
  const qadamlar = [
    { kalit: "customer", ikonka: UserRound },
    { kalit: "products", ikonka: Package },
    { kalit: "payment", ikonka: CreditCard },
    { kalit: "confirm", ikonka: BadgeCheck },
  ] as const;
  const formaBandmi = sotuvBackendgaSaqlandi || amalBajarilmoqda;

  function qadamgaOtish(index: number) {
    if (index === 3) {
      saqlashTugmasiRef.current?.focus();
      return;
    }
    [mijozKartasiRef, mahsulotKartasiRef, xulosaKartasiRef][index]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Hamma qatorga bir xil narx turi: tanlangan turda narxi bor qatorlarning narxi almashadi, qolganlari avvalgi turda qoladi.
  function narxTuriniTanlash(tur: SotuvNarxTuri) {
    narxTuriTanlandi.current = true;
    setNarxTuri(tur);
    const narxi = (qator: MahsulotQatori) => {
      const qoldiq = qoldiqlar.find((item) => qoldiqKaliti(item) === qator.qoldiqKaliti);
      return qoldiqNarxiValyutada(qoldiq, sotuvVal, kurs, tur, birlikTopish(qoldiq?.birliklar, qator.birlikId));
    };
    setMahsulotlar((joriy) =>
      joriy.map((qator) => {
        if (!qator.modificationId) return { ...qator, priceType: tur };
        const narx = narxi(qator);
        return narx ? { ...qator, priceType: tur, price: String(narx), ustama: "" } : qator;
      })
    );
    const narxsiz = mahsulotlar.filter((qator) => qator.modificationId && !narxi(qator)).length;
    setNarxXabari(
      narxsiz > 0
        ? t("priceTypes.skipped", { count: narxsiz, type: t(`priceTypes.${tur === "COST" ? "cost" : tur === "RETAIL" ? "retail" : "wholesale"}`) })
        : ""
    );
  }

  // Bitta qator uchun narx turi (sotuvchi shu mahsulotni boshqa narxda sotishi mumkin).
  function qatorNarxTuriniOzgartirish(index: number, tur: SotuvNarxTuri) {
    const qator = mahsulotlar[index];
    const qoldiq = qoldiqlar.find((item) => qoldiqKaliti(item) === qator?.qoldiqKaliti);
    const narx = qoldiqNarxiValyutada(qoldiq, sotuvVal, kurs, tur, birlikTopish(qoldiq?.birliklar, qator?.birlikId));
    if (!qator || !narx) return;
    setNarxXabari("");
    mahsulotniYangilash(index, { priceType: tur, price: String(narx), ustama: "" });
  }

  // Sotuv birligini almashtirish (dona ↔ pochka): narx yangi birlikdagi narxga o'tadi, ustama va summadagi chegirma tozalanadi.
  function birlikniOzgartirish(index: number, birlikId: string) {
    const qator = mahsulotlar[index];
    const qoldiq = qoldiqlar.find((item) => qoldiqKaliti(item) === qator?.qoldiqKaliti);
    const narx = qoldiqNarxiValyutada(qoldiq, sotuvVal, kurs, qator?.priceType, birlikTopish(qoldiq?.birliklar, birlikId));
    if (!qator || !narx) return;
    setNarxXabari("");
    mahsulotniYangilash(index, { birlikId, price: String(narx), ustama: "", discount: qator.discountTuri === "sum" ? "" : qator.discount });
  }

  // Chegirma birligi (summa yoki foiz): kiritilgan qiymat shu qator uchun ikkinchi birlikka o'giriladi.
  function chegirmaBirliginiOzgartirish(index: number, yangi: ChegirmaTuri) {
    setMahsulotlar((joriy) =>
      joriy.map((qator, qatorIndex) => {
        if (qatorIndex !== index || qator.discountTuri === yangi) return qator;
        const miqdor = raqamgaAylantirish(qator.quantity);
        const narx = qatorBirNarxi(qator);
        if (yangi === "foiz") {
          const foiz = chegirmaFoizi(miqdor, narx, raqamgaAylantirish(qator.discount));
          return { ...qator, discountTuri: "foiz", discountFoiz: foiz > 0 ? String(foiz) : "" };
        }
        const summa = chegirmaSummasi({ miqdor, narx, tur: "foiz", summa: 0, foiz: raqamgaAylantirish(qator.discountFoiz) });
        return { ...qator, discountTuri: "sum", discount: summa > 0 ? String(summa) : "" };
      })
    );
  }

  function qatorniOchirish(index: number) {
    setNarxTahriri(null);
    setMahsulotlar((joriy) => joriy.filter((_, qatorIndex) => qatorIndex !== index));
  }

  // Ombor o'zgarganda: bitta sotuv bitta ombordan bo'ladi, boshqa ombordan tanlangan qatorlar tozalanadi.
  // Ombor tanlangach birinchi bo'sh qatorning mahsulot ro'yxati ochiladi: klaviaturada to'xtamay davom etish mumkin.
  function omborniOzgartirish(value: string) {
    setWarehouseId(value);
    onOmborTanlash(value);
    const yangiQatorlar = mahsulotlar.map((qator) => {
      const tanlangan = qoldiqlar.find((item) => qoldiqKaliti(item) === qator.qoldiqKaliti);
      return tanlangan?.warehouseId && tanlangan.warehouseId !== value
        ? bosQator(narxTuri)
        : qator;
    });
    setMahsulotlar(yangiQatorlar);
    const bosh = yangiQatorlar.findIndex((qator) => !qator.modificationId);
    if (value && bosh >= 0) fokusSoralish(bosh, "mahsulot");
  }

  // "Mahsulot qo'shish": yangi qator qo'shiladi va uning mahsulot ro'yxati darrov ochiladi (sichqoncha ham, klaviatura ham).
  function yangiMahsulotQatorini() {
    qatorQoshish();
    fokusSoralish(mahsulotlar.length, "mahsulot");
  }

  // Ro'yxatda Shift+Enter: mahsulot tanlanadi (miqdor 1) va keyingi bo'sh qatorning (yo'q bo'lsa yangi qatorning) ro'yxati ochiladi.
  function tezQoshish(index: number, value: string) {
    modifikatsiyaniTanlash(index, value);
    const bosh = mahsulotlar.findIndex((qator, qatorIndex) => qatorIndex > index && !qator.modificationId);
    if (bosh >= 0) {
      fokusSoralish(bosh, "mahsulot");
      return;
    }
    qatorQoshish();
    fokusSoralish(mahsulotlar.length, "mahsulot");
  }

  // Qatordagi maydonga fokus beradi (yo'q yoki o'chirilgan bo'lsa false).
  function fokusQoyish(qator: number, maydon: "mahsulot" | "narx" | "miqdor" | "chegirma") {
    const element =
      maydon === "mahsulot"
        ? qatorlarRef.current?.querySelector<HTMLElement>(`[data-sotuv-mahsulot="${qator}"] button`)
        : qatorlarRef.current?.querySelector<HTMLInputElement>(`input[data-sotuv-${maydon}="${qator}"]`);
    if (!element || (element as HTMLInputElement).disabled) return false;
    element.focus();
    if (element instanceof HTMLInputElement) element.select();
    return true;
  }

  // Klaviatura bilan jadvalda yurish:
  //   ↑ / ↓            — narx, miqdor, chegirma maydonlarida oldingi / keyingi qatorning shu maydoniga o'tadi;
  //   Ctrl + ↑ / ↓     — har qanday maydondan oldingi / keyingi qatorning mahsulot maydoniga o'tadi;
  //   Ctrl + Delete    — shu qatorni o'chiradi (kamida bitta qator qoladi).
  // Boshqa klavishlar (Enter, Tab va h.k.) avvalgidek ishlaydi. Klavish ishlatilgan bo'lsa true qaytaradi.
  function qatorKlavishlari(event: ReactKeyboardEvent<HTMLElement>, index: number, maydon: "mahsulot" | "narx" | "miqdor" | "chegirma") {
    if (event.nativeEvent.isComposing || event.altKey || event.shiftKey) return false;
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      // Mahsulot maydonida oddiy ↑/↓ ro'yxatni ochadi (SavdoSelect); qatorlar orasida faqat Ctrl bilan yuriladi.
      if (maydon === "mahsulot" && !event.ctrlKey) return false;
      event.preventDefault();
      const nishon = index + (event.key === "ArrowDown" ? 1 : -1);
      if (nishon < 0 || nishon >= mahsulotlar.length) return true;
      if (!fokusQoyish(nishon, event.ctrlKey ? "mahsulot" : maydon)) fokusQoyish(nishon, "mahsulot");
      return true;
    }
    if (event.key === "Delete" && event.ctrlKey) {
      event.preventDefault();
      if (mahsulotlar.length <= 1) return true;
      qatorniOchirish(index);
      const nishon = Math.min(index, mahsulotlar.length - 2);
      window.requestAnimationFrame(() => {
        if (!fokusQoyish(nishon, maydon)) fokusQoyish(nishon, "mahsulot");
      });
      return true;
    }
    return false;
  }

  // Formani boshlang'ich holatga qaytaradi (faqat shu oynadagi kiritilgan ma'lumotlar; saqlangan sotuvga tegmaydi).
  function formaniTozalash() {
    if (formaBandmi) return;
    if (warehouseId) onOmborTanlash("");
    setWarehouseId("");
    setCustomerId("");
    setClientCompanyId("");
    setSotuvNomi("");
    setBosqich("Yangi");
    setValyuta("UZS");
    setBoshlanishSanasi(bugungiSana());
    setTugashSanasi(kelasiHafta());
    setIzoh("");
    setMahsulotlar([bosQator(narxTuri)]);
    setNarxXabari("");
    setSkanMatni("");
    setSkanXabari(null);
    setImportXabari(null);
    setXatolik("");
    setFaolTab("Ish");
    setFaoliyatSarlavha("");
    setFaoliyatTafsilot("");
    setFaoliyatSana(bugungiSana());
    setFaoliyatSoat("15:00");
    setFaoliyatSaqlangan(false);
    setFaoliyatOchiq(false);
    setSanaMenyuOchiq(false);
  }

  // "Qoralamani yuklash" (JSON) bilan saqlangan faylni formaga qaytaradi. Faqat hozir mavjud ombor, mijoz va qoldiq yozuvlari olinadi;
  // narx joriy qoldiqdan olinadi (fayldagi eski narx ishlatilmaydi).
  async function qoralamaniImportQilish(fayl: File) {
    try {
      const malumot = JSON.parse(await fayl.text()) as {
        warehouseId?: unknown;
        customerId?: unknown;
        clientCompanyId?: unknown;
        sotuvNomi?: unknown;
        bosqich?: unknown;
        valyuta?: unknown;
        boshlanishSanasi?: unknown;
        tugashSanasi?: unknown;
        items?: unknown;
      };
      if (!malumot || typeof malumot !== "object" || !Array.isArray(malumot.items)) throw new Error("format");

      const sanami = (qiymat: unknown): qiymat is string => typeof qiymat === "string" && /^\d{4}-\d{2}-\d{2}$/.test(qiymat);
      // Fayldagi narx va chegirmalar fayl valyutasida saqlangan: dollar mumkin bo'lmasa joriy (so'm) valyuta qoladi va chegirmalar olinmaydi.
      const faylValyutasi = malumot.valyuta === "USD" ? "USD" : malumot.valyuta === "UZS" ? "UZS" : sotuvVal;
      const yangiVal: "UZS" | "USD" = faylValyutasi === "USD" && !usdMumkin ? "UZS" : faylValyutasi;
      const chegirmaOlinadi = yangiVal === faylValyutasi;
      const ombor = omborlar.find((item) => item.id === malumot.warehouseId)?.id ?? "";
      const qatorlar: MahsulotQatori[] = [];
      let otkazilgan = 0;
      for (const qator of malumot.items as Array<Partial<MahsulotQatori>>) {
        const qoldiq = qoldiqlar.find((item) => qoldiqKaliti(item) === qator?.qoldiqKaliti);
        const mosOmbor = !ombor || !qoldiq?.warehouseId || qoldiq.warehouseId === ombor;
        if (!qoldiq || !mosOmbor) {
          if (qator?.qoldiqKaliti) otkazilgan += 1;
          continue;
        }
        const miqdor = raqamgaAylantirish(String(qator?.quantity ?? ""));
        const chegirma = raqamgaAylantirish(String(qator?.discount ?? ""));
        // Eski fayllarda narx turi va chegirma birligi bo'lmaydi: standart tur va summa olinadi.
        const faylTuri = (["COST", "RETAIL", "WHOLESALE"] as const).find((tur) => tur === qator?.priceType);
        const tur = qatorNarxTuri(qoldiq, faylTuri ?? narxTuri, turRuxsati, kurs) ?? narxTuri;
        const chegirmaTuri: ChegirmaTuri = qator?.discountTuri === "foiz" ? "foiz" : "sum";
        const faylFoizi = raqamgaAylantirish(String(qator?.discountFoiz ?? ""));
        const faylUstamasi = raqamgaAylantirish(String(qator?.ustama ?? ""));
        const faylBirligi = birlikTopish(qoldiq.birliklar, typeof qator?.birlikId === "string" ? qator.birlikId : "");
        const narx = qoldiqNarxiValyutada(qoldiq, yangiVal, kurs, tur, faylBirligi);
        qatorlar.push({
          modificationId: qoldiq.modificationId,
          qoldiqKaliti: qoldiqKaliti(qoldiq),
          quantity: miqdor > 0 ? String(miqdor) : "1",
          price: narx ? String(narx) : "",
          discount: chegirmaOlinadi && chegirmaTuri === "sum" && chegirma > 0 ? String(chegirma) : "",
          priceType: tur,
          discountTuri: chegirmaTuri,
          birlikId: faylBirligi?.unitId ?? "",
          // Foiz valyutaga bog'liq emas: har doim olinadi.
          discountFoiz: chegirmaTuri === "foiz" && faylFoizi > 0 ? String(Math.min(faylFoizi, 100)) : "",
          // Ustama summa kabi fayl valyutasida: valyuta o'zgargan bo'lsa olinmaydi.
          ustama: chegirmaOlinadi && faylUstamasi > 0 ? String(faylUstamasi) : "",
        });
      }

      if (ombor) {
        setWarehouseId(ombor);
        onOmborTanlash(ombor);
      }
      const mijoz = mijozlar.find((item) => item.id === malumot.customerId)?.id ?? "";
      const kompaniya = mijozKompaniyalari.find((item) => item.id === malumot.clientCompanyId)?.id ?? "";
      setCustomerId(mijoz);
      setClientCompanyId(kompaniya);
      if (typeof malumot.sotuvNomi === "string") setSotuvNomi(malumot.sotuvNomi);
      if (bosqichKodlari.some((item) => item.value === malumot.bosqich)) setBosqich(String(malumot.bosqich));
      setValyuta(yangiVal);
      if (sanami(malumot.boshlanishSanasi)) setBoshlanishSanasi(malumot.boshlanishSanasi);
      if (sanami(malumot.tugashSanasi)) setTugashSanasi(malumot.tugashSanasi);
      if (qatorlar.length > 0) setMahsulotlar(qatorlar);
      setXatolik("");
      setImportXabari({
        xato: false,
        matn:
          (qatorlar.length > 0 ? t("import.done", { count: qatorlar.length }) : t("import.doneNoItems")) +
          (otkazilgan > 0 ? ` ${t("import.skipped", { count: otkazilgan })}` : ""),
      });
    } catch {
      setImportXabari({ xato: true, matn: t("import.invalid") });
    }
  }

  return (
    <AppModal className="items-start justify-start bg-slate-950/55 p-0 py-3 pl-3 pr-3 backdrop-blur-[3px] sm:pl-[78px]">
      <div className="relative h-[calc(100vh-24px)] w-full min-w-0">
        <div className="absolute -left-[46px] top-5 z-[90] hidden flex-col items-center gap-2 sm:flex">
          <button
            type="button"
            onClick={onYopish}
            title={t("header.closeButtonTitle")}
            className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#2563EB] text-white shadow-[0_10px_22px_rgba(37,99,235,.32)] ring-2 ring-white/80 transition duration-300 hover:-translate-x-0.5 hover:scale-105 hover:bg-[#1D4ED8]"
          >
            <X size={18} />
          </button>
          <button
            type="button"
            onClick={nusxaOlish}
            title={t("header.copyLinkTitle")}
            className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-white text-[#2563EB] shadow-md ring-2 ring-orange-100 transition hover:-translate-x-0.5 hover:bg-orange-50"
          >
            <Link size={15} />
          </button>
          <button
            type="button"
            onClick={qoralamaniYuklash}
            title={t("header.downloadDraftTitle")}
            className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-white text-[#2563EB] shadow-md ring-2 ring-orange-100 transition hover:-translate-x-0.5 hover:bg-orange-50"
          >
            <Download size={15} />
          </button>
          <button
            type="button"
            onClick={() => window.open(window.location.href, "_blank", "noopener,noreferrer")}
            title={t("header.openNewWindowTitle")}
            className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-white text-[#2563EB] shadow-md ring-2 ring-orange-100 transition hover:-translate-x-0.5 hover:bg-orange-50"
          >
            <ExternalLink size={15} />
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            title={t("header.printTitle")}
            className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-white text-[#2563EB] shadow-md ring-2 ring-orange-100 transition hover:-translate-x-0.5 hover:bg-orange-50"
          >
            <Printer size={15} />
          </button>
        </div>

        <form
          onSubmit={submit}
          className="relative flex h-full w-full flex-col overflow-hidden rounded-[22px] bg-[#F8FAFC] text-[#1E293B] shadow-[0_24px_80px_rgba(15,23,42,.30)] ring-2 ring-slate-300/80"
        >
          <header className="z-30 shrink-0 border-b-2 border-slate-300 bg-white px-4 pb-4 pt-4 sm:px-7">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 flex-wrap items-center gap-2.5 sm:gap-3">
                <h2 className="text-2xl font-extrabold tracking-tight text-[#0F172A] sm:text-[30px]">{modalMatnlari.title}</h2>
                <button
                  type="button"
                  onClick={nusxaOlish}
                  title={t("header.copyLinkTitle")}
                  aria-label={t("header.copyLinkTitle")}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-[#2563EB]"
                >
                  <Copy size={17} />
                </button>
                <span className="rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-bold text-[#2563EB] ring-2 ring-blue-200">
                  {modalMatnlari.badge}
                </span>
              </div>

              <button
                type="button"
                onClick={onYopish}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white text-slate-600 shadow-sm ring-2 ring-slate-300 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label={t("header.closeAriaLabel")}
              >
                <X size={19} />
              </button>
            </div>

            <ol aria-label={t("stepper.aria")} className="mt-3 grid grid-cols-4 gap-1.5 sm:mt-4 sm:grid-cols-2 sm:gap-2 lg:grid-cols-4">
              {qadamlar.map((qadam, index) => {
                const tayyor = qadamHolatlari[index];
                const faol = index === joriyQadam;
                const Ikonka = qadam.ikonka;
                return (
                  <li key={qadam.kalit} className="min-w-0">
                    <button
                      type="button"
                      onClick={() => qadamgaOtish(index)}
                      aria-current={faol ? "step" : undefined}
                      className={`group flex w-full min-w-0 flex-col items-center gap-1 rounded-2xl border-2 px-1 py-2 text-center transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100 sm:flex-row sm:gap-3 sm:px-3 sm:text-left ${
                        faol
                          ? "border-blue-300 bg-[#EFF6FF] shadow-[0_6px_16px_rgba(37,99,235,.10)]"
                          : "border-slate-300 bg-slate-50/70 hover:border-blue-300 hover:bg-white"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black transition sm:h-10 sm:w-10 sm:text-base ${
                          faol
                            ? "bg-[#2563EB] text-white shadow-[0_6px_14px_rgba(37,99,235,.35)]"
                            : tayyor
                              ? "bg-emerald-500 text-white"
                              : "border-2 border-slate-300 bg-white text-slate-500"
                        }`}
                      >
                        {tayyor && !faol ? <Check size={17} strokeWidth={3} /> : index + 1}
                      </span>
                      <Ikonka size={20} className={`hidden shrink-0 sm:block ${faol ? "text-[#2563EB]" : "text-slate-400"}`} aria-hidden />
                      <span className="min-w-0 max-w-full sm:flex-1">
                        <span className={`block truncate text-[11px] font-extrabold sm:text-sm ${faol ? "text-[#0F172A]" : "text-slate-700"}`}>
                          {t(`stepper.${qadam.kalit}.title`)}
                        </span>
                        <span className="hidden truncate text-xs font-medium text-slate-500 sm:block">{t(`stepper.${qadam.kalit}.hint`)}</span>
                      </span>
                      {index < qadamlar.length - 1 && (
                        <ChevronRight size={16} className="hidden shrink-0 text-slate-300 lg:block" aria-hidden />
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </header>

          {xatolik && (
            <div className="mx-4 mt-4 flex shrink-0 items-start justify-between gap-4 rounded-2xl border-2 border-red-200 bg-red-50 px-5 py-3.5 text-sm font-bold text-red-600 shadow-sm sm:mx-7">
              <span>{t(xatolik)}</span>
              <button
                type="button"
                onClick={() => setXatolik("")}
                className="shrink-0 text-xs font-black uppercase text-red-500 hover:text-red-700"
              >
                {t("errors.dismiss")}
              </button>
            </div>
          )}

          <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-7">
            <div className="grid items-start gap-5 xl:grid-cols-[minmax(360px,0.42fr)_minmax(0,1fr)]">
              <div className="min-w-0 space-y-4">
                <section ref={mijozKartasiRef} className={kartaKlassi}>
                  <KartaBoshi ikonka={UserRound} sarlavha={t("sections.clientInfo")} />
                  <div className="space-y-4">
                    <label className="grid gap-1.5">
                      <span className={yorliqKlassi}>{t("labels.contact")}</span>
                      <div className="relative">
                        <UserRound
                          size={18}
                          className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400"
                        />
                        <SavdoSelect
                          value={customerId}
                          onChange={mijozniTanlash}
                          klaviatura
                          placeholder={t("placeholders.clientSearch")}
                          className="w-full"
                          buttonClassName={`${selectTugmasiKlassi} pl-10`}
                          options={mijozlar.map((mijoz) => ({
                            value: mijoz.id,
                            label: `${mijozKorinishi(mijoz, t)}${mijoz.phone ? ` - ${mijoz.phone}` : ""}`,
                          }))}
                          dropdownClassName="[&>div>div]:text-center min-w-[360px]"
                          portal
                        />
                      </div>
                      {customerId && clientCompanyId && (
                        <p className="text-xs font-semibold text-emerald-600">
                          {t("messages.clientAutoAttachedToCompany", {
                            company: kompaniyaNomi(tanlanganKompaniya),
                          })}
                        </p>
                      )}
                    </label>

                    <label className="grid gap-1.5">
                      <span className={yorliqKlassi}>{t("labels.company")}</span>
                      <div className="relative">
                        <Building2
                          size={18}
                          className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400"
                        />
                        <SavdoSelect
                          value={clientCompanyId}
                          onChange={kompaniyaniTanlash}
                          klaviatura
                          placeholder={t("placeholders.companySearch")}
                          className="w-full"
                          buttonClassName={`${selectTugmasiKlassi} pl-10`}
                          options={mijozKompaniyalari.map((kompaniya) => ({
                            value: kompaniya.id,
                            label: `${kompaniyaNomi(kompaniya)}${kompaniya.phone ? ` - ${kompaniya.phone}` : ""}`,
                          }))}
                          dropdownClassName="[&>div>div]:text-center min-w-[360px]"
                          portal
                        />
                      </div>
                      {clientCompanyId && customerId && (
                        <p className="text-xs font-semibold text-emerald-600">
                          {t("messages.companyRepAutoSelected", {
                            client: mijozKorinishi(tanlanganMijoz, t),
                          })}
                        </p>
                      )}
                    </label>
                  </div>
                </section>

                <section className={kartaKlassi}>
                  <KartaBoshi ikonka={Settings} sarlavha={draftMode ? t("sections.draftSettings") : t("sections.saleSettings")} />
                  <div className="space-y-4">
                    <label className="grid gap-1.5">
                      <span className={yorliqKlassi}>{modalMatnlari.nameLabel}</span>
                      <input
                        value={sotuvNomi}
                        onChange={(event) => setSotuvNomi(event.target.value)}
                        placeholder={modalMatnlari.namePlaceholder}
                        className={maydonKlassi}
                      />
                    </label>

                    <label className="grid gap-1.5">
                      <span className={yorliqKlassi}>{t("note.stageLabel")}</span>
                      <div className="relative">
                        <span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-emerald-500 ring-4 ring-emerald-200" />
                        <SavdoSelect
                          value={bosqich}
                          onChange={setBosqich}
                          klaviatura
                          options={bosqichlar}
                          className="w-full"
                          buttonClassName={`${selectTugmasiKlassi} pl-10`}
                          dropdownClassName="[&>div>div]:text-center min-w-[320px]"
                          portal
                        />
                      </div>
                    </label>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                      <label className="grid gap-1.5">
                        <span className={yorliqKlassi}>{t("note.currencyLabel")}</span>
                        <div className="relative">
                          <CircleDollarSign
                            size={18}
                            className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-[#2563EB]"
                          />
                          <SavdoSelect
                            value={valyuta}
                            onChange={valyutaniOzgartirish}
                            klaviatura
                            options={valyutalar}
                            className="w-full"
                            buttonClassName={`${selectTugmasiKlassi} pl-10`}
                            dropdownClassName="[&>div>div]:text-center min-w-[180px]"
                            portal
                          />
                        </div>
                      </label>
                      <label className="grid gap-1.5">
                        <span className={yorliqKlassi}>{modalMatnlari.amountLabel}</span>
                        <input
                          value={jami > 0 ? pulniFormatlash(jami, sotuvVal) : ""}
                          readOnly
                          className={cn(maydonKlassi, "bg-slate-50 font-black")}
                          placeholder={sotuvVal === "USD" ? "$0" : t("labels.zeroAmountPlaceholder")}
                        />
                      </label>
                    </div>

                    {sotuvVal === "USD" && (
                      <p className="-mt-2 rounded-xl bg-[#EFF6FF] px-3.5 py-2 text-xs font-semibold leading-5 text-[#1E40AF] ring-2 ring-blue-200">
                        {t("hints.usdSale", { kurs: kurs.toLocaleString("uz-UZ", { maximumFractionDigits: 2 }) })}
                      </p>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                      <label className="grid gap-1.5">
                        <span className={yorliqKlassi}>{t("note.startDateLabel")}</span>
                        <SanaMaydoni value={boshlanishSanasi} onChange={setBoshlanishSanasi} />
                      </label>
                      <label className="grid gap-1.5">
                        <span className={yorliqKlassi}>{t("note.endDateLabel")}</span>
                        <SanaMaydoni value={tugashSanasi} onChange={setTugashSanasi} />
                      </label>
                    </div>

                    <div className="grid gap-1.5">
                      <span className={yorliqKlassi}>{t("labels.responsible")}</span>
                      <div className="flex h-11 items-center gap-2 rounded-xl border-2 border-slate-300 bg-slate-50 px-3.5 text-sm font-semibold text-slate-600">
                        <UserRound size={16} className="shrink-0 text-slate-400" />
                        <span className="truncate">
                          {joriyProfil
                            ? joriyProfil.fullName?.trim() || joriyProfil.username
                            : t("common.loading")}
                        </span>
                        {joriyProfil?.role && (
                          <span className="ml-auto shrink-0 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-black uppercase text-[#2563EB]">
                            {joriyProfil.role}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{t("hints.saleCreatedByCurrentUser")}</p>
                    </div>
                  </div>
                </section>
              </div>

              <div className="min-w-0 space-y-4">
                <section ref={mahsulotKartasiRef} className={kartaKlassi}>
                  <KartaBoshi
                    ikonka={Package}
                    sarlavha={t("sections.productList")}
                    amal={
                      <>
                        <input
                          ref={importInputRef}
                          type="file"
                          accept="application/json,.json"
                          className="hidden"
                          onChange={(event) => {
                            const fayl = event.target.files?.[0];
                            event.target.value = "";
                            if (fayl) void qoralamaniImportQilish(fayl);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => importInputRef.current?.click()}
                          disabled={formaBandmi}
                          title={t("import.title")}
                          className="inline-flex h-10 items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-[#2563EB] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Upload size={16} />
                          {t("actions.import")}
                        </button>
                      </>
                    }
                  />

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={yangiMahsulotQatorini}
                      className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#2563EB] px-5 text-sm font-extrabold text-white shadow-[0_10px_22px_rgba(37,99,235,.28)] transition hover:bg-[#1D4ED8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200"
                    >
                      <Plus size={18} />
                      {t("actions.addProduct")}
                    </button>
                    <div className="flex min-w-[200px] items-center gap-2 sm:ml-auto">
                      <span className="hidden shrink-0 text-sm font-semibold text-slate-600 sm:inline">{t("labels.saleDate")}</span>
                      <HujjatSanasiMaydoni
                        value={hujjatSanasi}
                        onChange={setHujjatSanasi}
                        disabled={formaBandmi}
                        aria-label={t("labels.saleDate")}
                        className={maydonKlassi}
                      />
                    </div>
                    <div className="flex min-w-[220px] flex-1 items-center gap-2 sm:max-w-[420px]">
                      <span className="hidden shrink-0 text-sm font-semibold text-slate-600 sm:inline">{t("labels.warehouse")}</span>
                      <SavdoSelect
                        className="min-w-0 flex-1"
                        value={warehouseId}
                        onChange={omborniOzgartirish}
                        klaviatura
                        placeholder={t("placeholders.selectWarehouse")}
                        options={omborlar.map((ombor) => ({
                          value: ombor.id,
                          label: ombor.name ?? ombor.id,
                        }))}
                        buttonClassName={selectTugmasiKlassi}
                        dropdownClassName="[&>div>div]:text-center"
                        portal
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-slate-50 p-3 ring-2 ring-slate-300">
                    <span className="text-sm font-bold text-slate-600">{t("priceTypes.label")}</span>
                    <NarxTuriTanlovi
                      qiymat={narxTuri}
                      holat={(tur) => ({ ruxsat: turRuxsati(tur), narxBor: true })}
                      onChange={narxTuriniTanlash}
                    />
                    <p className="min-w-[200px] flex-1 text-xs font-medium leading-5 text-slate-500">{t("priceTypes.hint")}</p>
                    {narxXabari && (
                      <p role="status" className="basis-full text-xs font-bold text-amber-600">
                        {narxXabari}
                      </p>
                    )}
                  </div>

                  <div className="mt-3">
                    <div className="relative">
                      <ScanLine size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        ref={skanInputRef}
                        value={skanMatni}
                        onChange={(event) => setSkanMatni(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "ArrowDown" && !event.nativeEvent.isComposing) {
                            // ↓ — birinchi qatorga (miqdoriga, mahsulot tanlanmagan bo'lsa mahsulot maydoniga) o'tadi.
                            event.preventDefault();
                            if (!fokusQoyish(0, "miqdor")) fokusQoyish(0, "mahsulot");
                            return;
                          }
                          if (event.key !== "Enter") return;
                          // Skaner kod + Enter yuboradi: forma yuborilmaydi, mahsulot qo'shiladi.
                          event.preventDefault();
                          if (!event.nativeEvent.isComposing) shtrixKodniQoshish();
                        }}
                        autoComplete="off"
                        placeholder={t("products.scanPlaceholder")}
                        aria-label={t("products.scanAriaLabel")}
                        className={cn(maydonKlassi, "pl-10 pr-10")}
                      />
                      {skanMatni && (
                        <button
                          type="button"
                          onClick={() => {
                            setSkanMatni("");
                            setSkanXabari(null);
                            skanInputRef.current?.focus();
                          }}
                          aria-label={t("actions.clear")}
                          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    {skanXabari && (
                      <p role="status" className={`mt-2 text-xs font-bold ${skanXabari.xato ? "text-red-600" : "text-emerald-600"}`}>
                        {skanXabari.matn}
                      </p>
                    )}
                    {importXabari && (
                      <p role="status" className={`mt-2 text-xs font-bold ${importXabari.xato ? "text-red-600" : "text-emerald-600"}`}>
                        {importXabari.matn}
                      </p>
                    )}
                  </div>

                  <p className="mt-3 hidden text-xs font-medium leading-5 text-slate-400 lg:block">{t("products.keyboardHint")}</p>

                  <div className="mt-4">
                    <div className={`hidden rounded-t-2xl border-2 border-slate-300 bg-slate-50 px-4 py-2.5 text-[11px] font-black uppercase tracking-wide text-slate-500 lg:grid ${qatorUstunlari} lg:gap-3`}>
                      <span>{t("table.number")}</span>
                      <span>{t("table.product")}</span>
                      <span>{t("table.catalogPrice")}</span>
                      <span>{t("table.salePrice")}</span>
                      <span>{t("table.quantity")}</span>
                      <span>{t("table.discount")}</span>
                      <span className="text-right">{t("table.total")}</span>
                      <span />
                    </div>

                    <div ref={qatorlarRef} className="space-y-3 lg:space-y-0 lg:rounded-b-2xl lg:border-2 lg:border-slate-300">
                      {mahsulotlar.map((mahsulot, index) => {
                        const qoldiq = qoldiqlar.find(
                          (item) => qoldiqKaliti(item) === mahsulot.qoldiqKaliti
                        );
                        const miqdor = raqamgaAylantirish(mahsulot.quantity);
                        const qatorBirliklari = sotuvBirliklari(qoldiq?.birliklar);
                        const tanlanganBirlik = birlikTopish(qoldiq?.birliklar, mahsulot.birlikId);
                        const asosiyBirlikNomi = qoldiq?.birliklar?.find((birlik) => birlik.asosiy)?.qisqa ?? "";
                        // Qo'shimcha birlikda (pochka, korobka) faqat butun miqdor mumkin (kasrli birlik bundan mustasno).
                        const butunMiqdor = Boolean(tanlanganBirlik && !tanlanganBirlik.asosiy && !tanlanganBirlik.kasr);
                        const katalogNarxi = raqamgaAylantirish(mahsulot.price);
                        const ustama = raqamgaAylantirish(mahsulot.ustama);
                        // Bir dona narxi = katalog narxi + ustama.
                        const narx = qatorBirNarxi(mahsulot);
                        const chegirma = qatorChegirmasi(mahsulot);
                        const qatorJami = Math.max(miqdor * narx - chegirma, 0);
                        // Sotuv narxi = katalog narxi + ustama − chegirma / miqdor. Narxni pasaytirsangiz chegirma, oshirsangiz ustama avtomatik hisoblanadi.
                        const sotuvNarxi = miqdor > 0 ? Math.round(Math.max(narx - chegirma / miqdor, 0) * 100) / 100 : narx;
                        const birDonaChegirma = Math.max(narx - sotuvNarxi, 0);

                        return (
                          <div
                            key={index}
                            className={`grid grid-cols-1 gap-3 rounded-2xl border-2 border-slate-300 bg-white p-3.5 transition sm:grid-cols-2 lg:items-start lg:rounded-none lg:border-0 lg:border-b-2 lg:border-slate-200 lg:px-4 lg:py-3 lg:last:border-b-0 ${qatorUstunlari}`}
                          >
                            <div className="flex items-center justify-between sm:col-span-2 lg:col-span-1 lg:block lg:pt-3">
                              <span className="text-sm font-black text-slate-400">
                                <span className="lg:hidden">#</span>
                                {index + 1}
                              </span>
                              <button
                                type="button"
                                disabled={mahsulotlar.length === 1}
                                onClick={() => qatorniOchirish(index)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-500 transition hover:bg-red-100 disabled:opacity-30 lg:hidden"
                                aria-label={t("products.removeRowAriaLabel")}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>

                            <div className="min-w-0 sm:col-span-2 lg:col-span-1">
                              <p className={mobilYorliqKlassi}>{t("labels.product")}</p>
                              <div className="flex items-start gap-2">
                                <button
                                  type="button"
                                  className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 transition hover:border-[#2563EB] hover:text-[#2563EB] sm:flex"
                                  title={t("products.imageButtonTitle")}
                                  aria-label={t("labels.image")}
                                >
                                  <ImageIcon size={18} />
                                </button>
                                <div
                                  className="min-w-0 flex-1"
                                  data-sotuv-mahsulot={index}
                                  onKeyDownCapture={(event) => {
                                    // Faqat shu maydonning o'z tugmasidan kelgan klavishlar (ochiq ro'yxatniki emas).
                                    if (!event.currentTarget.contains(event.target as Node)) return;
                                    if (qatorKlavishlari(event, index, "mahsulot")) event.stopPropagation();
                                  }}
                                >
                                  <SavdoSelect
                                    value={mahsulot.qoldiqKaliti}
                                    onChange={(value) => {
                                      modifikatsiyaniTanlash(index, value);
                                      // Mahsulot tanlangach fokus shu qatorning miqdoriga o'tadi.
                                      fokusSoralish(index, "miqdor");
                                    }}
                                    tezTanlash={(value) => tezQoshish(index, value)}
                                    klaviatura
                                    ochishSorovi={fokusSorovi?.maydon === "mahsulot" && fokusSorovi.qator === index ? fokusSorovi.n : 0}
                                    placeholder={t("placeholders.selectProduct")}
                                    options={mahsulotOptionlari()}
                                    buttonClassName={selectTugmasiKlassi}
                                    dropdownClassName="[&>div>div]:text-center min-w-[520px] max-w-[min(720px,calc(100vw-32px))]"
                                    portal
                                  />
                                  <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                                    {t("labels.availableStock")}:{" "}
                                    <span className="font-bold text-[#2563EB]">
                                      {qoldiq ? (qoldiq.birliklar && qoldiq.birliklar.length > 1 ? qoldiqMatni(qoldiqMiqdori(qoldiq), qoldiq.birliklar) : `${qoldiqMiqdori(qoldiq)} ${qoldiqBirligi(qoldiq, t)}`) : "—"}
                                    </span>
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="min-w-0">
                              <p className={mobilYorliqKlassi}>{t(sotuvVal === "USD" ? "labels.priceUsd" : "labels.price")}</p>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={mahsulot.price}
                                readOnly
                                disabled
                                title={t("labels.priceLocked")}
                                className={maydonKlassi}
                                placeholder={t("placeholders.price")}
                              />
                              <NarxTuriTanlovi
                                kichik
                                qiymat={mahsulot.priceType}
                                disabled={!mahsulot.modificationId}
                                holat={(tur) => ({ ruxsat: turRuxsati(tur), narxBor: turNarxi(qoldiq, tur, kurs) !== null })}
                                onChange={(tur) => qatorNarxTuriniOzgartirish(index, tur)}
                              />
                              {sotuvVal === "UZS" && qoldiq?.valyuta && qoldiq.valyuta.kurs !== null && (
                                <p className="mt-1 text-[11px] font-semibold text-slate-400">
                                  {t("products.usdHint", { usd: dollarNarxi(qoldiq.valyuta), kurs: qoldiq.valyuta.kurs.toLocaleString("uz-UZ", { maximumFractionDigits: 2 }) })}
                                </p>
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className={mobilYorliqKlassi}>{t(sotuvVal === "USD" ? "labels.salePriceUsd" : "labels.salePrice")}</p>
                              <SummaMaydoni
                                disabled={narx <= 0}
                                value={narxTahriri?.qator === index ? narxTahriri.matn : narx > 0 ? sotuvNarxi : ""}
                                data-sotuv-narx={index}
                                onFocus={(event) => event.currentTarget.select()}
                                onBlur={() => setNarxTahriri(null)}
                                onKeyDown={(event) => {
                                  if (qatorKlavishlari(event, index, "narx")) return;
                                  if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
                                  event.preventDefault();
                                  fokusSoralish(index, "miqdor");
                                }}
                                onChange={(qiymat) => {
                                  setNarxTahriri({ qator: index, matn: qiymat });
                                  const kiritilgan = raqamgaAylantirish(qiymat);
                                  // Bo'sh yoki noto'g'ri qiymat katalog narxiga qaytaradi; katalogdan past narx chegirma, baland narx ustama bo'ladi.
                                  const { ustama: yangiUstama, chegirma: yangiChegirma } = kiritilganNarx({ katalog: katalogNarxi, kiritilgan, miqdor });
                                  const ustamaMatni = yangiUstama > 0 ? String(yangiUstama) : "";
                                  if (mahsulot.discountTuri === "foiz") {
                                    const foiz = kiritilgan > 0 && kiritilgan < katalogNarxi ? chegirmaFoizi(1, katalogNarxi, katalogNarxi - kiritilgan) : 0;
                                    mahsulotniYangilash(index, { ustama: ustamaMatni, discountFoiz: foiz > 0 ? String(foiz) : "" });
                                    return;
                                  }
                                  mahsulotniYangilash(index, { ustama: ustamaMatni, discount: yangiChegirma > 0 ? String(yangiChegirma) : "" });
                                }}
                                className={cn(
                                  maydonKlassi,
                                  birDonaChegirma > 0 && "border-emerald-300 text-emerald-700 focus:border-emerald-500 focus:ring-emerald-200",
                                  ustama > 0 && "border-amber-300 text-amber-700 focus:border-amber-500 focus:ring-amber-100"
                                )}
                                placeholder={t("placeholders.price")}
                              />
                            </div>

                            <div className="min-w-0">
                              <p className={mobilYorliqKlassi}>{t("labels.quantity")}</p>
                              <input
                                type="number"
                                min="0.001"
                                step={butunMiqdor ? "any" : "0.001"}
                                value={mahsulot.quantity}
                                data-sotuv-miqdor={index}
                                onChange={(event) =>
                                  mahsulotniYangilash(index, { quantity: event.target.value })
                                }
                                onKeyDown={(event) => {
                                  if (qatorKlavishlari(event, index, "miqdor")) return;
                                  if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
                                  event.preventDefault();
                                  keyingiQatorgaOtish(index);
                                }}
                                className={maydonKlassi}
                                placeholder={t("placeholders.quantity")}
                              />
                              {qatorBirliklari.length > 0 && (
                                <div className="mt-1.5">
                                  <select
                                    aria-label={t("labels.unit")}
                                    value={mahsulot.birlikId}
                                    onChange={(event) => birlikniOzgartirish(index, event.target.value)}
                                    className="h-9 w-full min-w-0 rounded-xl border-2 border-slate-300 bg-white px-1 text-[11px] font-bold text-slate-700 outline-none focus:border-[#2563EB]"
                                  >
                                    {qatorBirliklari.map((birlik) => (
                                      <option key={birlik.unitId} value={birlik.asosiy ? "" : birlik.unitId}>{birlik.qisqa || birlik.nomi}</option>
                                    ))}
                                  </select>
                                  {tanlanganBirlik && !tanlanganBirlik.asosiy && miqdor > 0 && (
                                    <p className="mt-1 text-[11px] font-semibold text-slate-400">
                                      {t("products.baseEquivalent", { qty: asosiyMiqdor(tanlanganBirlik, miqdor).toLocaleString("uz-UZ", { maximumFractionDigits: 3 }), unit: asosiyBirlikNomi })}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className={mobilYorliqKlassi}>{t(sotuvVal === "USD" ? "labels.discountUsd" : "labels.discount")}</p>
                              <div className="relative">
                                <SummaMaydoni
                                  value={mahsulot.discountTuri === "foiz" ? mahsulot.discountFoiz : mahsulot.discount}
                                  data-sotuv-chegirma={index}
                                  onChange={(qiymat) =>
                                    mahsulotniYangilash(
                                      index,
                                      mahsulot.discountTuri === "foiz"
                                        ? { discountFoiz: raqamgaAylantirish(qiymat) > 100 ? "100" : qiymat }
                                        : { discount: qiymat }
                                    )
                                  }
                                  onKeyDown={(event) => {
                                    if (qatorKlavishlari(event, index, "chegirma")) return;
                                    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
                                    event.preventDefault();
                                    keyingiQatorgaOtish(index);
                                  }}
                                  title={mahsulot.discountTuri === "foiz" ? t("discountUnit.percentTitle") : t(sotuvVal === "USD" ? "labels.discountUsd" : "labels.discount")}
                                  className={cn(maydonKlassi, "pr-[88px]")}
                                  placeholder="0"
                                />
                                <div
                                  role="group"
                                  aria-label={t("discountUnit.label")}
                                  className="absolute right-1.5 top-1/2 flex -translate-y-1/2 gap-0.5 rounded-lg bg-slate-100 p-0.5 text-[10px] font-bold"
                                >
                                  {(["sum", "foiz"] as const).map((birlik) => (
                                    <button
                                      key={birlik}
                                      type="button"
                                      aria-pressed={mahsulot.discountTuri === birlik}
                                      onClick={() => chegirmaBirliginiOzgartirish(index, birlik)}
                                      className={cn(
                                        "rounded-md px-1.5 py-1 transition",
                                        mahsulot.discountTuri === birlik
                                          ? "bg-white text-[#2563EB] shadow-sm ring-2 ring-blue-200"
                                          : "text-slate-500 hover:text-slate-800"
                                      )}
                                    >
                                      {birlik === "foiz" ? "%" : t(sotuvVal === "USD" ? "table.currencySuffixUsd" : "table.currencySuffix")}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              {mahsulot.discountTuri === "foiz" && chegirma > 0 && (
                                <p className="mt-1 text-[11px] font-semibold text-emerald-600">= {pulniFormatlash(chegirma, sotuvVal)}</p>
                              )}
                            </div>

                            <div className="min-w-0 lg:pt-3 lg:text-right">
                              <p className={mobilYorliqKlassi}>{t("labels.rowTotal")}</p>
                              <p className="flex h-11 items-center rounded-xl bg-emerald-50 px-3.5 text-sm font-black text-emerald-600 ring-2 ring-emerald-200 lg:h-auto lg:justify-end lg:bg-transparent lg:p-0 lg:ring-0">
                                <span className="truncate">{pulniFormatlash(qatorJami, sotuvVal)}</span>
                              </p>
                            </div>

                            <div className="hidden lg:flex lg:justify-end lg:pt-1.5">
                              <button
                                type="button"
                                disabled={mahsulotlar.length === 1}
                                onClick={() => qatorniOchirish(index)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-red-500 transition hover:bg-red-50 disabled:opacity-30"
                                aria-label={t("products.removeRowAriaLabel")}
                              >
                                <Trash2 size={17} />
                              </button>
                            </div>

                            {ustama > 0 && miqdor > 0 && (
                              <p className="rounded-xl bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-700 ring-2 ring-amber-100 lg:col-span-full">
                                {t("products.autoMarkupHint", {
                                  katalog: pulniFormatlash(katalogNarxi, sotuvVal),
                                  sotuv: pulniFormatlash(narx, sotuvVal),
                                  bir: pulniFormatlash(ustama, sotuvVal),
                                  jami: pulniFormatlash(ustama * miqdor, sotuvVal),
                                })}
                              </p>
                            )}

                            {birDonaChegirma > 0 && miqdor > 0 && ustama <= 0 && (
                              <p className="rounded-xl bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 ring-2 ring-emerald-200 lg:col-span-full">
                                {t("products.autoDiscountHint", {
                                  katalog: pulniFormatlash(narx, sotuvVal),
                                  sotuv: pulniFormatlash(sotuvNarxi, sotuvVal),
                                  bir: pulniFormatlash(birDonaChegirma, sotuvVal),
                                  jami: pulniFormatlash(chegirma, sotuvVal),
                                })}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div ref={xulosaKartasiRef} className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
                    <XulosaKarta ikonka={Package} nom={t("summary.productsCount")} qiymat={String(mahsulotlarSoni)} ton="kok" />
                    <XulosaKarta ikonka={ClipboardList} nom={t("summary.totalQuantity")} qiymat={umumiyMiqdor.toLocaleString("uz-UZ", { maximumFractionDigits: 3 })} ton="oddiy" />
                    <XulosaKarta ikonka={Percent} nom={t("summary.discount")} qiymat={pulniFormatlash(umumiyChegirma, sotuvVal)} ton="yashil" />
                    <XulosaKarta ikonka={Wallet} nom={t("summary.grandTotal")} qiymat={pulniFormatlash(jami, sotuvVal)} ton="asosiy" />
                  </div>
                  <p className="mt-3 text-xs font-medium leading-5 text-slate-500">{t("summary.paymentHint")}</p>

                  {omborlar.length === 0 && (
                    <div className="mt-4 rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
                      {modalMatnlari.stockWarning}
                    </div>
                  )}

                  <label className="mt-5 grid gap-1.5">
                    <span className="flex items-center justify-between gap-3">
                      <span className={yorliqKlassi}>{t("comment.label")}</span>
                      <span className="text-xs font-semibold tabular-nums text-slate-400">{izoh.length}/{IZOH_MAKS_UZUNLIK}</span>
                    </span>
                    <textarea
                      value={izoh}
                      onChange={(event) => setIzoh(event.target.value.slice(0, IZOH_MAKS_UZUNLIK))}
                      maxLength={IZOH_MAKS_UZUNLIK}
                      rows={3}
                      placeholder={t("comment.placeholder")}
                      className={cn(maydonKlassi, "h-auto min-h-[88px] resize-y py-3 font-medium")}
                    />
                  </label>
                </section>

                <section className={kartaKlassi}>
                  <KartaBoshi ikonka={CalendarCheck} sarlavha={t("sections.activity")} />
                  <nav className="mb-4 flex flex-wrap items-center gap-1.5 rounded-2xl bg-slate-50 p-1.5 text-sm font-semibold text-slate-500 ring-2 ring-slate-200">
                    {faoliyatTablar.map((tab) => {
                      const Ikonka = faoliyatTabIkonkalari[tab] ?? CalendarCheck;
                      return (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => {
                            setFaolTab(tab);
                            setFaoliyatOchiq(true);
                            setFaoliyatSaqlangan(false);
                          }}
                          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 transition ${
                            faolTab === tab && faoliyatOchiq
                              ? "bg-white text-[#2563EB] shadow-sm ring-2 ring-orange-100"
                              : "hover:bg-white/70 hover:text-[#2563EB]"
                          }`}
                        >
                          <Ikonka size={16} />
                          {t(faoliyatTabKalitlari[tab] ?? tab)}
                        </button>
                      );
                    })}
                  </nav>

                  {!faoliyatOchiq ? (
                    <button
                      type="button"
                      onClick={() => setFaoliyatOchiq(true)}
                      className="flex h-14 w-full items-center gap-3 rounded-xl border-2 border-orange-200 bg-[#F8FAFC]/60 px-5 text-left text-slate-400 transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50 hover:shadow-sm"
                    >
                      <PenLine size={18} className="shrink-0 text-slate-300" />
                      <span>{t("activity.collapsedPlaceholder")}</span>
                    </button>
                  ) : (
                    <div className="animate-in slide-in-from-top-2 fade-in-0 duration-300">
                      <div className="rounded-2xl border-2 border-orange-300 bg-gradient-to-br from-white to-[#F8FAFC] p-4 shadow-inner transition-all duration-300 ease-in-out focus-within:ring-4 focus-within:ring-orange-100">
                        <div className="flex items-start gap-4">
                          <div className="min-w-0 flex-1">
                            <input
                              value={faoliyatSarlavha}
                              onChange={(event) => {
                                setFaoliyatSarlavha(event.target.value);
                                setFaoliyatSaqlangan(false);
                              }}
                              placeholder={
                                faoliyatMatnlari[faolTab] ? t(faoliyatMatnlari[faolTab].title) : t("activity.namePlaceholderFallback")
                              }
                              autoFocus
                              className="h-10 w-full bg-transparent text-base text-slate-700 outline-none placeholder:text-slate-700"
                            />
                            <textarea
                              value={faoliyatTafsilot}
                              onChange={(event) => {
                                setFaoliyatTafsilot(event.target.value);
                                setFaoliyatSaqlangan(false);
                              }}
                              rows={3}
                              placeholder={
                                faoliyatMatnlari[faolTab]
                                  ? t(faoliyatMatnlari[faolTab].placeholder)
                                  : t("activity.detailsPlaceholderFallback")
                              }
                              className="mt-4 min-h-[72px] w-full resize-none bg-transparent text-sm text-slate-600 outline-none placeholder:text-slate-400"
                            />
                          </div>
                          <div className="flex h-10 shrink-0 items-center gap-2 text-slate-400">
                            <span className="h-3 w-3 shrink-0 rounded-full bg-amber-400 ring-4 ring-amber-50" />
                            <SavdoSelect
                              value={responsibleId}
                              onChange={(value) => {
                                setResponsibleId(value);
                                setFaoliyatSaqlangan(false);
                              }}
                              placeholder={t("labels.responsible")}
                              options={xodimlar.map((xodim) => ({
                                value: xodim.id,
                                searchLabel: xodimNomi(xodim, t),
                                label: (
                                  <span className="flex min-w-0 items-center gap-3">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-black text-[#2563EB]">
                                      {xodimBoshHarflari(xodim, t) || <UserRound size={15} />}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate">{xodimNomi(xodim, t)}</span>
                                  </span>
                                ),
                              }))}
                              selectedLabel={
                                tanlanganXodim ? (
                                  <span className="flex h-9 w-9 shrink-0 items-center justify-center text-center text-xs font-black leading-none">
                                    {xodimBoshHarflari(tanlanganXodim, t)}
                                  </span>
                                ) : (
                                  <span className="flex h-9 w-9 shrink-0 items-center justify-center leading-none">
                                    <UserRound size={18} className="block shrink-0" />
                                  </span>
                                )
                              }
                              className="w-9 shrink-0"
                              buttonClassName="h-9 w-9 justify-center gap-0 rounded-full border-0 bg-orange-100 p-0 text-center text-[#2563EB] shadow-none [&>span]:flex [&>span]:h-9 [&>span]:w-9 [&>span]:items-center [&>span]:justify-center hover:bg-orange-200 focus:ring-orange-100"
                              dropdownClassName="[&>div>div]:text-center min-w-[260px]"
                              portal
                              hideChevron
                            />
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setSanaMenyuOchiq((joriy) => !joriy)}
                              className={`inline-flex h-10 items-center gap-2 rounded-xl border-2 bg-white px-3 text-sm font-semibold text-slate-700 transition ${
                                sanaMenyuOchiq ? "border-[#2563EB] ring-4 ring-orange-100" : "border-slate-300 hover:border-orange-200"
                              }`}
                              aria-expanded={sanaMenyuOchiq}
                            >
                              <CalendarDays size={16} className="shrink-0 text-slate-400" />
                              {faoliyatSanasiMatni(faoliyatSana, faoliyatSoat, t)}
                              <ChevronDown size={15} className={`shrink-0 text-slate-400 transition ${sanaMenyuOchiq ? "rotate-180" : ""}`} />
                            </button>
                            {sanaMenyuOchiq && (
                              <>
                                <button
                                  type="button"
                                  aria-label={t("actions.cancel")}
                                  className="fixed inset-0 z-30 cursor-default"
                                  onClick={() => setSanaMenyuOchiq(false)}
                                />
                                <div className="absolute left-0 top-12 z-40 w-72 rounded-2xl bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,.16)] ring-2 ring-orange-100">
                                  <label className="grid gap-1.5 text-xs font-bold text-slate-500">
                                    {t("activity.dateLabel")}
                                    <input
                                      type="date"
                                      value={faoliyatSana}
                                      onChange={(event) => {
                                        setFaoliyatSana(event.target.value);
                                        setFaoliyatSaqlangan(false);
                                      }}
                                      className="h-10 rounded-xl border-2 border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-orange-100"
                                    />
                                  </label>
                                  <label className="mt-3 grid gap-1.5 text-xs font-bold text-slate-500">
                                    {t("activity.timeLabel")}
                                    <input
                                      type="time"
                                      value={faoliyatSoat}
                                      onChange={(event) => {
                                        setFaoliyatSoat(event.target.value);
                                        setFaoliyatSaqlangan(false);
                                      }}
                                      className="h-10 rounded-xl border-2 border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-orange-100"
                                    />
                                  </label>
                                  <div className="mt-3 flex items-center justify-between gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFaoliyatSana(bugungiSana());
                                        setFaoliyatSoat("15:00");
                                        setFaoliyatSaqlangan(false);
                                      }}
                                      className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-100"
                                    >
                                      {t("activity.resetDate")}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setSanaMenyuOchiq(false)}
                                      className="rounded-lg bg-[#2563EB] px-3.5 py-1.5 text-xs font-black text-white transition hover:bg-[#1D4ED8]"
                                    >
                                      {t("activity.dateDone")}
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                          <button
                            type="button"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-orange-50 hover:text-[#2563EB]"
                            title={t("activity.reminderTitle")}
                          >
                            <Bell size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-4">
                        <button
                          type="button"
                          onClick={() => {
                            if (!faoliyatSarlavha.trim()) {
                              const faolTabMatni = faoliyatMatnlari[faolTab];
                              setFaoliyatSarlavha(faolTabMatni ? t(faolTabMatni.title) : "");
                            }
                            setFaoliyatSaqlangan(true);
                          }}
                          className="rounded-full bg-[#2563EB] px-5 py-2 text-xs font-bold uppercase text-white transition hover:-translate-y-0.5 hover:bg-[#1D4ED8] hover:shadow-md"
                        >
                          {t("actions.save")}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFaoliyatSarlavha("");
                            setFaoliyatTafsilot("");
                            setFaoliyatSana(bugungiSana());
                            setFaoliyatSoat("15:00");
                            setFaoliyatSaqlangan(false);
                            setFaoliyatOchiq(false);
                          }}
                          className="text-xs font-bold uppercase text-slate-600 transition hover:text-slate-900"
                        >
                          {t("actions.cancel")}
                        </button>
                        {faoliyatSaqlangan && (
                          <span className="text-xs font-bold text-emerald-600">
                            {t("activity.savedNotice")}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>

          <footer className="shrink-0 border-t-2 border-slate-300 bg-white px-4 py-3 sm:px-7">
            <div className="flex items-center justify-end gap-2 sm:gap-3">
              <button
                type="button"
                onClick={formaniTozalash}
                disabled={formaBandmi}
                className="inline-flex h-11 items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-3 text-sm font-extrabold sm:h-12 sm:px-5 text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw size={17} />
                <span className="sr-only sm:not-sr-only">{t("actions.clear")}</span>
              </button>
              <button
                type="button"
                onClick={onYopish}
                className="inline-flex h-11 items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-3 text-sm font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100 sm:h-12 sm:px-5"
              >
                <X size={17} />
                <span className="sr-only sm:not-sr-only">{t("actions.close")}</span>
              </button>
              <button
                ref={saqlashTugmasiRef}
                type="submit"
                disabled={amalBajarilmoqda || omborlar.length === 0}
                className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 text-sm font-extrabold sm:h-12 sm:min-w-[160px] sm:flex-none sm:px-7 text-white shadow-[0_10px_22px_rgba(37,99,235,.30)] transition hover:bg-[#1D4ED8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {amalBajarilmoqda ? <LoaderCircle size={17} className="animate-spin" /> : <Check size={18} strokeWidth={3} />}
                <span className="whitespace-nowrap">{modalMatnlari.submitLabel}</span>
              </button>
            </div>
          </footer>
        </form>
      </div>
    </AppModal>
  );
}

// ── UI qismlari (faqat ko'rinish; mantiq YangiSotuvModal ichida) ──────────────────────────────

const IZOH_MAKS_UZUNLIK = 500;
// Mahsulot jadvali ustunlari (katta ekranda): №, mahsulot, katalog narxi, sotuv narxi, miqdor, chegirma, jami, o'chirish.
const qatorUstunlari =
  "lg:grid-cols-[32px_minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.75fr)_minmax(0,1.45fr)_minmax(0,1.1fr)_40px]";
const kartaKlassi = "rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)] ring-2 ring-[#CBD5E1] sm:p-5";
const yorliqKlassi = "text-sm font-semibold text-slate-600";
const mobilYorliqKlassi = "mb-1.5 text-[11px] font-black uppercase tracking-wide text-slate-500 lg:hidden";
const maydonKlassi =
  "h-11 w-full min-w-0 rounded-xl border-2 border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";
const selectTugmasiKlassi =
  "h-11 rounded-xl border-2 border-slate-300 px-3.5 text-sm shadow-none hover:shadow-none focus:border-[#2563EB]";

// Narx turi tugmalari (tan narx / chakana / ulgurji). Sozlamada o'chirilgan yoki mahsulotda narxi yo'q tur o'chiq turadi.

function KartaBoshi({ ikonka: Ikonka, sarlavha, amal }: { ikonka: LucideIcon; sarlavha: string; amal?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB] ring-2 ring-blue-200">
          <Ikonka size={20} />
        </span>
        <h3 className="truncate text-lg font-extrabold tracking-tight text-[#0F172A]">{sarlavha}</h3>
      </div>
      {amal}
    </div>
  );
}

function SanaMaydoni({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative">
      <CalendarClock size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          maydonKlassi,
          "pl-10 pr-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-y-0 [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-11 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
        )}
      />
      <CalendarDays size={18} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#2563EB]" />
    </div>
  );
}

const xulosaTonlari = {
  kok: { karta: "bg-[#EFF6FF] ring-blue-200", belgi: "bg-white text-[#2563EB] ring-blue-200", qiymat: "text-[#0F172A]" },
  oddiy: { karta: "bg-white ring-slate-300", belgi: "bg-slate-50 text-[#2563EB] ring-slate-300", qiymat: "text-[#0F172A]" },
  yashil: { karta: "bg-emerald-50 ring-emerald-200", belgi: "bg-white text-emerald-600 ring-emerald-200", qiymat: "text-emerald-600" },
  asosiy: { karta: "bg-[#E8EEFF] ring-blue-200", belgi: "bg-white text-[#2563EB] ring-blue-200", qiymat: "text-[#1D4ED8]" },
} as const;

function XulosaKarta({ ikonka: Ikonka, nom, qiymat, ton }: { ikonka: LucideIcon; nom: string; qiymat: string; ton: keyof typeof xulosaTonlari }) {
  const stil = xulosaTonlari[ton];
  return (
    <div className={`flex min-w-0 items-center gap-3 rounded-2xl p-3.5 ring-2 ${stil.karta}`}>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-2 ${stil.belgi}`}>
        <Ikonka size={21} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-slate-500">{nom}</p>
        <p className={`truncate text-xl font-black tabular-nums ${stil.qiymat}`} title={qiymat}>
          {qiymat}
        </p>
      </div>
    </div>
  );
}
