import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Bell,
  CalendarDays,
  Copy,
  Download,
  ExternalLink,
  ImageIcon,
  Link,
  LoaderCircle,
  MessageSquare,
  Plus,
  Printer,
  Search,
  Settings,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import AppModal from "@/Components/common/AppModal";
import { crmApi } from "@/api/crmApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { useAuthProfileStore } from "@/store/authProfileStore";
import type {
  MijozTanlovi,
  OmborTanlovi,
  QoldiqTanlovi,
  SotuvYaratishMalumoti,
  XodimTanlovi,
} from "@/types/savdo";
import { pulniFormatlash } from "./savdoYordamchilari";
import SavdoSelect from "./SavdoSelect";

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
};

const faoliyatTablar = ["Ish", "Izoh", "Xabar", "Vazifa", "Uchrashuv"];

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

  return productName ?? variantName ?? t("common.unknownProduct");
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

function FieldSettings() {
  return <Settings size={16} className="shrink-0 text-slate-300" />;
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
  const [boshlanishSanasi, setBoshlanishSanasi] = useState(bugungiSana());
  const [tugashSanasi, setTugashSanasi] = useState(kelasiHafta());
  const [faolTab, setFaolTab] = useState("Ish");
  const [faoliyatSarlavha, setFaoliyatSarlavha] = useState("");
  const [faoliyatTafsilot, setFaoliyatTafsilot] = useState("");
  const [faoliyatSana, setFaoliyatSana] = useState(bugungiSana());
  const [faoliyatSoat, setFaoliyatSoat] = useState("15:00");
  const [faoliyatSaqlangan, setFaoliyatSaqlangan] = useState(false);
  const [sotuvBackendgaSaqlandi, setSotuvBackendgaSaqlandi] = useState(false);
  const [mahsulotlar, setMahsulotlar] = useState<MahsulotQatori[]>([
    { modificationId: "", qoldiqKaliti: "", quantity: "1", price: "", discount: "" },
  ]);
  const [xatolik, setXatolik] = useState("");

  const jami = useMemo(
    () =>
      mahsulotlar.reduce(
        (summa, mahsulot) =>
          summa +
          raqamgaAylantirish(mahsulot.quantity) *
            raqamgaAylantirish(mahsulot.price) -
          raqamgaAylantirish(mahsulot.discount),
        0
      ),
    [mahsulotlar]
  );
  const bosqichlar = useMemo(
    () => bosqichKodlari.map((item) => ({ value: item.value, label: t(item.labelKey) })),
    [t]
  );
  const valyutalar = useMemo(
    () => valyutaKodlari.map((item) => ({ value: item.value, label: t(item.labelKey) })),
    [t]
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
  const korsatiladiganSotuvNomi =
    sotuvNomi.trim() ||
    (tanlanganMijoz
      ? t("preview.autoName", {
          client: mijozKorinishi(tanlanganMijoz, t),
          type: draftMode ? t("preview.typeDraft") : t("preview.typeSale"),
        })
      : "");

  function backendIzohiniYigish() {
    const metadata = [
      korsatiladiganSotuvNomi ? `${modalMatnlari.notePrefix}: ${korsatiladiganSotuvNomi}` : "",
      bosqich ? `${t("note.stageLabel")}: ${bosqich}` : "",
      `${t("note.currencyLabel")}: ${valyutalar.find((item) => item.value === valyuta)?.label ?? valyuta}`,
      boshlanishSanasi ? `${t("note.startDateLabel")}: ${boshlanishSanasi}` : "",
      tugashSanasi ? `${t("note.endDateLabel")}: ${tugashSanasi}` : "",
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
    mahsulotniYangilash(index, {
      modificationId: qoldiq?.modificationId ?? tanlanganQoldiqKaliti,
      qoldiqKaliti: tanlanganQoldiqKaliti,
      price: qoldiqNarxi(qoldiq) ? String(qoldiqNarxi(qoldiq)) : "",
    });

    if (qoldiq?.warehouseId && qoldiq.warehouseId !== warehouseId) {
      setWarehouseId(qoldiq.warehouseId);
      onOmborTanlash(qoldiq.warehouseId);
    }
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
    setMahsulotlar((joriy) => [
      ...joriy,
      { modificationId: "", qoldiqKaliti: "", quantity: "1", price: "", discount: "" },
    ]);
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
            sotuvNomi: korsatiladiganSotuvNomi,
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

    const tozaMahsulotlar = mahsulotlar
      .map((mahsulot) => ({
        modificationId: mahsulot.modificationId,
        quantity: raqamgaAylantirish(mahsulot.quantity),
        price: raqamgaAylantirish(mahsulot.price),
        discount: raqamgaAylantirish(mahsulot.discount),
      }))
      .filter(
        (mahsulot) =>
          mahsulot.modificationId && mahsulot.quantity > 0 && mahsulot.price >= 0
      );

    if (!warehouseId) {
      setXatolik("errors.selectWarehouseFirst");
      return;
    }

    if (boshlanishSanasi && tugashSanasi && tugashSanasi < boshlanishSanasi) {
      setXatolik("errors.endDateBeforeStart");
      return;
    }

    if (tozaMahsulotlar.length === 0) {
      setXatolik("errors.selectAtLeastOneProduct");
      return;
    }

    for (const mahsulot of mahsulotlar) {
      const soralganMiqdor = raqamgaAylantirish(mahsulot.quantity);
      if (!mahsulot.modificationId || soralganMiqdor <= 0) continue;
      const tanlanganQoldiq = qoldiqlar.find((item) => qoldiqKaliti(item) === mahsulot.qoldiqKaliti);
      const mavjudMiqdor = tanlanganQoldiq ? qoldiqMiqdori(tanlanganQoldiq) : 0;
      if (soralganMiqdor > mavjudMiqdor) {
        setXatolik(
          t("errors.insufficientStock", {
            name: tanlanganQoldiq ? qoldiqNomi(tanlanganQoldiq, t) : t("common.selectedProductFallback"),
            available: mavjudMiqdor,
            requested: soralganMiqdor,
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
        warehouseId,
        customerId: customerId || undefined,
        clientCompanyId: clientCompanyId || undefined,
        responsibleId: responsibleId || undefined,
        saleType: customerId || clientCompanyId ? "CLIENT" : "QUICK",
        note: backendIzohiniYigish() || undefined,
        items: tozaMahsulotlar,
      });
      if (muvaffaqiyatli) setSotuvBackendgaSaqlandi(true);
    }

    if (muvaffaqiyatli && await faoliyatniBackendgaSaqlash()) onYopish();
  }

  return (
    <AppModal className="items-start justify-start bg-slate-950/55 p-0 py-3 pl-[78px] pr-3 backdrop-blur-[3px]">
      <div className="relative h-[calc(100vh-32px)] w-full">
        <div className="absolute -left-[46px] top-5 z-[90] flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onYopish}
            title={t("header.closeButtonTitle")}
            className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#2563EB] text-white shadow-[0_10px_22px_rgba(37,99,235,.32)] ring-1 ring-white/80 transition duration-300 hover:-translate-x-0.5 hover:scale-105 active:scale-95"
          >
            <X size={18} />
          </button>
          <button
            type="button"
            onClick={nusxaOlish}
            title={t("header.copyLinkTitle")}
            className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-white text-[#2563EB] shadow-md ring-1 ring-orange-100 transition hover:-translate-x-0.5 hover:bg-orange-50"
          >
            <Link size={15} />
          </button>
          <button
            type="button"
            onClick={qoralamaniYuklash}
            title={t("header.downloadDraftTitle")}
            className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-white text-[#2563EB] shadow-md ring-1 ring-orange-100 transition hover:-translate-x-0.5 hover:bg-orange-50"
          >
            <Download size={15} />
          </button>
          <button
            type="button"
            onClick={() => window.open(window.location.href, "_blank", "noopener,noreferrer")}
            title={t("header.openNewWindowTitle")}
            className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-white text-[#2563EB] shadow-md ring-1 ring-orange-100 transition hover:-translate-x-0.5 hover:bg-orange-50"
          >
            <ExternalLink size={15} />
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            title={t("header.printTitle")}
            className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-white text-[#2563EB] shadow-md ring-1 ring-orange-100 transition hover:-translate-x-0.5 hover:bg-orange-50"
          >
            <Printer size={15} />
          </button>
        </div>

        <form
          onSubmit={submit}
          className="relative h-full w-full overflow-hidden rounded-[20px] bg-[#F8FAFC] text-[#253044] shadow-[0_24px_80px_rgba(15,23,42,.30)] ring-1 ring-slate-200/80"
        >
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-7 py-3.5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-[30px] font-bold tracking-tight text-slate-900">
                    {modalMatnlari.title}
                  </h2>
                  <Copy size={17} className="text-slate-400" />
                  <span className="rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-black uppercase tracking-wider text-[#2563EB]">
                    {modalMatnlari.badge}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onYopish}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label={t("header.closeAriaLabel")}
              >
                <X size={19} />
              </button>
            </div>

          </header>

          {xatolik && (
            <div className="mx-7 mt-4 flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-3.5 text-sm font-bold text-red-600 shadow-sm">
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

          <div className="scrollbar-hidden h-[calc(100%-74px)] overflow-y-auto px-7 py-4 pb-28">
            <div className="grid gap-5 xl:grid-cols-[minmax(390px,0.78fr)_minmax(540px,1.22fr)]">
              <div className="min-w-0 space-y-4">
                <section className="overflow-hidden rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)] ring-1 ring-[#DCE5F0]">
                  <div className="mb-4 border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                      {modalMatnlari.sectionTitle}
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-600">{modalMatnlari.nameLabel}</span>
                      <div className="flex items-center gap-2">
                        <input
                          value={sotuvNomi}
                          onChange={(event) => setSotuvNomi(event.target.value)}
                          placeholder={korsatiladiganSotuvNomi || modalMatnlari.namePlaceholder}
                          className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-orange-100 text-slate-900 placeholder:text-slate-400"
                        />
                        <FieldSettings />
                      </div>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-600">{t("note.stageLabel")}</span>
                      <div className="flex items-center gap-2">
                        <SavdoSelect
                          value={bosqich}
                          onChange={setBosqich}
                          options={bosqichlar}
                          className="min-w-0 flex-1"
                          buttonClassName="h-11 rounded-xl border-slate-200 shadow-none hover:shadow-none focus:border-[#2563EB] px-3.5 text-sm"
                          dropdownClassName="[&>div>div]:text-center min-w-[320px]"
                          portal
                        />
                        <FieldSettings />
                      </div>
                    </label>

                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_150px]">
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold text-slate-600">{modalMatnlari.amountLabel}</span>
                        <div className="flex items-center gap-2">
                          <input
                            value={jami > 0 ? pulniFormatlash(jami) : ""}
                            readOnly
                            className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-black text-slate-900 outline-none"
                            placeholder={t("labels.zeroAmountPlaceholder")}
                          />
                        </div>
                      </label>
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold text-slate-600">{t("note.currencyLabel")}</span>
                        <SavdoSelect
                          value={valyuta}
                          onChange={setValyuta}
                          options={valyutalar}
                          buttonClassName="h-11 rounded-xl border-slate-200 shadow-none hover:shadow-none focus:border-[#2563EB] px-3.5 text-sm"
                          dropdownClassName="[&>div>div]:text-center min-w-[180px]"
                          portal
                        />
                      </label>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold text-slate-600">{t("note.startDateLabel")}</span>
                        <div className="relative">
                          <input
                            type="date"
                            value={boshlanishSanasi}
                            onChange={(event) => setBoshlanishSanasi(event.target.value)}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 pr-10 text-sm font-semibold outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-orange-100 text-slate-900 placeholder:text-slate-400"
                          />
                          <CalendarDays
                            size={18}
                            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                        </div>
                      </label>
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold text-slate-600">{t("note.endDateLabel")}</span>
                        <div className="relative">
                          <input
                            type="date"
                            value={tugashSanasi}
                            onChange={(event) => setTugashSanasi(event.target.value)}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 pr-10 text-sm font-semibold outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-orange-100 text-slate-900 placeholder:text-slate-400"
                          />
                          <CalendarDays
                            size={18}
                            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                        </div>
                      </label>
                    </div>
                  </div>
                </section>

                <section className="overflow-hidden rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)] ring-1 ring-[#DCE5F0]">
                  <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                      {t("sections.clientAndCompany")}
                    </h3>
                    <FieldSettings />
                  </div>

                  <div className="space-y-4">
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-600">{t("labels.contact")}</span>
                      <div className="relative">
                        <UserRound
                          size={18}
                          className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400"
                        />
                        <SavdoSelect
                          value={customerId}
                          onChange={mijozniTanlash}
                          placeholder={t("placeholders.clientSearch")}
                          className="w-full"
                          buttonClassName="h-11 rounded-xl border-slate-200 shadow-none hover:shadow-none focus:border-[#2563EB] pl-10 pr-3.5 text-sm"
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

                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-600">{t("labels.company")}</span>
                      <div className="relative">
                        <Search
                          size={18}
                          className="pointer-events-none absolute right-4 top-1/2 z-10 -translate-y-1/2 text-slate-400"
                        />
                        <SavdoSelect
                          value={clientCompanyId}
                          onChange={kompaniyaniTanlash}
                          placeholder={t("placeholders.companySearch")}
                          buttonClassName="h-11 rounded-xl border-slate-200 shadow-none hover:shadow-none focus:border-[#2563EB] pl-3.5 pr-10 text-sm"
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

                <section className="overflow-hidden rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)] ring-1 ring-[#DCE5F0]">
                  <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                      {t("sections.additional")}
                    </h3>
                    <FieldSettings />
                  </div>
                  <div className="grid gap-3">
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-600">{t("labels.responsible")}</span>
                      <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold text-slate-600">
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
                      <p className="text-xs text-slate-400">
                        {t("hints.saleCreatedByCurrentUser")}
                      </p>
                    </label>
                  </div>
                </section>
              </div>

              <div className="min-w-0 space-y-4">
                <section className="overflow-hidden rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)] ring-1 ring-[#DCE5F0]">
                  <div className="flex flex-wrap items-center gap-2">
                    {faoliyatTablar.map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => {
                          setFaolTab(tab);
                          setFaoliyatSaqlangan(false);
                        }}
                        className={`relative inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold transition ${
                          faolTab === tab
                            ? "border border-orange-200 bg-orange-50 text-[#2563EB]"
                            : "text-slate-500 hover:bg-orange-50 hover:text-[#2563EB]"
                        }`}
                      >
                        {t(faoliyatTabKalitlari[tab] ?? tab)}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 transition focus-within:border-[#2563EB] focus-within:ring-4 focus-within:ring-orange-100">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1 space-y-3">
                        <input
                          value={faoliyatSarlavha}
                          onChange={(event) => {
                            setFaoliyatSarlavha(event.target.value);
                            setFaoliyatSaqlangan(false);
                          }}
                          placeholder={
                            faoliyatMatnlari[faolTab] ? t(faoliyatMatnlari[faolTab].title) : t("activity.namePlaceholderFallback")
                          }
                          className="h-9 w-full border-0 bg-transparent text-base font-semibold text-slate-700 outline-none placeholder:text-slate-700"
                        />
                        <textarea
                          value={faoliyatTafsilot}
                          onChange={(event) => {
                            setFaoliyatTafsilot(event.target.value);
                            setFaoliyatSaqlangan(false);
                          }}
                          rows={4}
                          placeholder={
                            faoliyatMatnlari[faolTab]
                              ? t(faoliyatMatnlari[faolTab].placeholder)
                              : t("activity.detailsPlaceholderFallback")
                          }
                          className="w-full resize-none border-0 bg-transparent text-sm font-semibold leading-6 text-slate-600 outline-none placeholder:text-slate-400"
                        />
                      </div>
                      <div className="flex shrink-0 items-center gap-3 pt-1">
                        <span className="h-3.5 w-3.5 rounded-full bg-amber-400" />
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

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <div className="inline-flex min-h-11 flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                        <CalendarDays size={16} className="shrink-0" />
                        <span className="shrink-0">
                          {faoliyatSanasiMatni(faoliyatSana, faoliyatSoat, t)}
                        </span>
                        <input
                          type="date"
                          value={faoliyatSana}
                          onChange={(event) => {
                            setFaoliyatSana(event.target.value);
                            setFaoliyatSaqlangan(false);
                          }}
                          className="h-7 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-600 outline-none focus:border-[#2563EB]"
                        />
                        <input
                          type="time"
                          value={faoliyatSoat}
                          onChange={(event) => {
                            setFaoliyatSoat(event.target.value);
                            setFaoliyatSaqlangan(false);
                          }}
                          className="h-7 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-600 outline-none focus:border-[#2563EB]"
                        />
                      </div>
                      <button
                        type="button"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-orange-50 hover:text-[#2563EB]"
                        title={t("activity.reminderTitle")}
                      >
                        <Bell size={18} />
                      </button>
                      {faolTab === "Xabar" && (
                        <button
                          type="button"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-orange-50 hover:text-[#2563EB]"
                          title={t(faoliyatTabKalitlari.Xabar)}
                        >
                          <MessageSquare size={18} />
                        </button>
                      )}
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (!faoliyatSarlavha.trim()) {
                            const faolTabMatni = faoliyatMatnlari[faolTab];
                            setFaoliyatSarlavha(faolTabMatni ? t(faolTabMatni.title) : "");
                          }
                          setFaoliyatSaqlangan(true);
                        }}
                        className="inline-flex h-10 items-center justify-center rounded-xl bg-[#2563EB] px-6 text-sm font-black uppercase text-white shadow-sm transition hover:bg-[#1D4ED8]"
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
                        }}
                        className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-black uppercase text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
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
                </section>

                <section className="overflow-hidden rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)] ring-1 ring-[#DCE5F0]">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                      {t("sections.products")}
                    </h3>
                    <button
                      type="button"
                      onClick={qatorQoshish}
                      className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#2563EB] px-3.5 text-sm font-black text-white shadow-sm transition hover:bg-[#1D4ED8]"
                    >
                      <Plus size={16} />
                      {t("actions.addRow")}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {mahsulotlar.map((mahsulot, index) => {
                      const qoldiq = qoldiqlar.find(
                        (item) => qoldiqKaliti(item) === mahsulot.qoldiqKaliti
                      );
                      const miqdor = raqamgaAylantirish(mahsulot.quantity);
                      const narx = raqamgaAylantirish(mahsulot.price);
                      const chegirma = raqamgaAylantirish(mahsulot.discount);
                      const qatorJami = Math.max(miqdor * narx - chegirma, 0);

                      return (
                        <div
                          key={index}
                          className="overflow-hidden rounded-2xl border border-slate-200 bg-[#F8FAFC] p-3.5"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <span className="text-sm font-black text-slate-400">
                              #{index + 1}
                            </span>
                            <button
                              type="button"
                              disabled={mahsulotlar.length === 1}
                              onClick={() =>
                                setMahsulotlar((joriy) =>
                                  joriy.filter((_, qatorIndex) => qatorIndex !== index)
                                )
                              }
                              className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-500 transition hover:bg-red-100 disabled:opacity-30"
                              aria-label={t("products.removeRowAriaLabel")}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>

                          <div className="grid min-w-0 gap-2 xl:grid-cols-[minmax(150px,1fr)_42px_96px_88px_96px] 2xl:grid-cols-[minmax(190px,1fr)_48px_118px_108px_112px]">
                            <SavdoSelect
                              value={mahsulot.qoldiqKaliti}
                              onChange={(value) => modifikatsiyaniTanlash(index, value)}
                              placeholder={t("placeholders.selectProduct")}
                              options={qoldiqlar
                                .filter((item) => qoldiqMiqdori(item) > 0)
                                .map((item) => {
                                  const itemOmborNomi =
                                    item.warehouse?.name ?? omborlar.find((ombor) => ombor.id === item.warehouseId)?.name;
                                  return {
                                    value: qoldiqKaliti(item),
                                    label: `${qoldiqNomi(item, t)}${itemOmborNomi ? ` (${itemOmborNomi})` : ""} - ${t("products.stockLabelShort")}: ${qoldiqMiqdori(item)} - ${t("products.priceLabelShort")}: ${pulniFormatlash(qoldiqNarxi(item))}`,
                                  };
                                })}
                              buttonClassName="h-11 rounded-xl border-slate-200 shadow-none hover:shadow-none focus:border-[#2563EB] px-3.5 text-sm"
                              dropdownClassName="[&>div>div]:text-center min-w-[520px] max-w-[min(720px,calc(100vw-32px))]"
                              portal
                            />

                            <button
                              type="button"
                              className="flex h-11 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-slate-400 transition hover:border-[#2563EB] hover:text-[#2563EB]"
                              title={t("products.imageButtonTitle")}
                            >
                              <ImageIcon size={18} />
                            </button>

                            <input
                              type="number"
                              min="0"
                              value={mahsulot.price}
                              onChange={(event) =>
                                mahsulotniYangilash(index, { price: event.target.value })
                              }
                              className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-orange-100 text-slate-900 placeholder:text-slate-400"
                              placeholder={t("placeholders.price")}
                            />

                            <input
                              type="number"
                              min="0.001"
                              step="0.001"
                              value={mahsulot.quantity}
                              onChange={(event) =>
                                mahsulotniYangilash(index, { quantity: event.target.value })
                              }
                              className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-orange-100 text-slate-900 placeholder:text-slate-400"
                              placeholder={t("placeholders.quantity")}
                            />

                            <input
                              type="number"
                              min="0"
                              value={mahsulot.discount}
                              onChange={(event) =>
                                mahsulotniYangilash(index, { discount: event.target.value })
                              }
                              className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-orange-100 text-slate-900 placeholder:text-slate-400"
                              placeholder={t("placeholders.discount")}
                            />
                          </div>

                          <div className="mt-3 grid gap-2 md:grid-cols-3">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                {t("labels.warehouse")}
                              </p>
                              <SavdoSelect
                                className="mt-1.5"
                                value={warehouseId}
                                onChange={(value) => {
                                  setWarehouseId(value);
                                  onOmborTanlash(value);
                                }}
                                placeholder={t("placeholders.selectWarehouse")}
                                options={omborlar.map((ombor) => ({
                                  value: ombor.id,
                                  label: ombor.name ?? ombor.id,
                                }))}
                                buttonClassName="h-11 rounded-xl border-slate-200 px-3.5 text-sm shadow-none hover:shadow-none focus:border-[#2563EB]"
                                dropdownClassName="[&>div>div]:text-center"
                                portal
                              />
                            </div>
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                {t("labels.availableStock")}
                              </p>
                              <div className="mt-1.5 flex h-11 items-center rounded-xl border border-slate-200 bg-white px-3.5">
                                <p className="truncate text-sm font-bold text-[#2563EB]">
                                  {qoldiq ? `${qoldiqMiqdori(qoldiq)} ${qoldiqBirligi(qoldiq, t)}` : "—"}
                                </p>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                {t("labels.rowTotal")}
                              </p>
                              <div className="mt-1.5 flex h-11 items-center rounded-xl border border-slate-200 bg-white px-3.5">
                                <p className="truncate text-sm font-black text-emerald-600">
                                  {pulniFormatlash(qatorJami)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#EFF6FF] p-5 ring-1 ring-blue-100">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-[#1D4ED8]">
                      {t("summary.totalLabel")}
                    </p>
                    <p className="mt-1 text-3xl font-black text-slate-950">
                      {pulniFormatlash(jami)}
                    </p>
                  </div>
                  <p className="max-w-[300px] text-xs font-semibold leading-5 text-[#1E40AF]">
                    {t("summary.paymentHint")}
                  </p>
                </section>

                {omborlar.length === 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
                    {modalMatnlari.stockWarning}
                  </div>
                )}
              </div>
            </div>
          </div>

          <footer className="absolute bottom-0 left-0 right-0 z-30 flex justify-end gap-3 border-t border-slate-200 bg-white px-7 py-3.5">
            <button
              type="button"
              onClick={onYopish}
              className="rounded-xl bg-white px-6 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              {t("actions.cancel")}
            </button>
            <button
              type="submit"
              disabled={amalBajarilmoqda || omborlar.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-7 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#1D4ED8] disabled:opacity-50"
            >
              {amalBajarilmoqda && <LoaderCircle size={17} className="animate-spin" />}
              {modalMatnlari.submitLabel}
            </button>
          </footer>
        </form>
      </div>
    </AppModal>
  );
}
