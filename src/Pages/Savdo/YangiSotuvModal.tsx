import { useMemo, useState, type FormEvent } from "react";
import {
  Bell,
  CalendarDays,
  ChevronDown,
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
import AppModal from "@/Components/common/AppModal";
import { crmApi } from "@/api/crmApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
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
  quantity: string;
  price: string;
  discount: string;
};

const faoliyatTablar = ["Ish", "Izoh", "Xabar", "Vazifa", "Ko'proq"];

const faoliyatMatnlari: Record<string, { title: string; placeholder: string }> = {
  Ish: {
    title: "Mijoz bilan bog'lanish",
    placeholder: "Vazifa haqida batafsil yozing...",
  },
  Izoh: {
    title: "Izoh yozish",
    placeholder: "Izoh matnini kiriting...",
  },
  Xabar: {
    title: "Xabar yuborish",
    placeholder: "Xabar matnini kiriting...",
  },
  Vazifa: {
    title: "Vazifa yaratish",
    placeholder: "Vazifa haqida batafsil yozing...",
  },
  "Ko'proq": {
    title: "Qo'shimcha ish",
    placeholder: "Qo'shimcha ma'lumot kiriting...",
  },
};

const bosqichlar = [
  { value: "Yangi", label: "Yangi" },
  { value: "Hujjat tayyorlash", label: "Hujjat tayyorlash" },
  { value: "Oldindan to'lov hisobi", label: "Oldindan to'lov hisobi" },
  { value: "Ish jarayonida", label: "Ish jarayonida" },
  { value: "Yakuniy hisob", label: "Yakuniy hisob" },
  { value: "Sotuv muvaffaqiyatli", label: "Sotuv muvaffaqiyatli" },
  { value: "Sotuv bekor bo'ldi", label: "Sotuv bekor bo'ldi" },
  { value: "Bekor sababini tahlil qilish", label: "Bekor sababini tahlil qilish" },
];

const valyutalar = [
  { value: "UZS", label: "O'zbek so'mi" },
  { value: "USD", label: "AQSH dollari" },
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

function faoliyatSanasiMatni(dateValue: string, timeValue: string) {
  const parsed = new Date(`${dateValue || bugungiSana()}T${timeValue || "00:00"}`);

  if (Number.isNaN(parsed.getTime())) {
    return "Bugun, soat 15:00";
  }

  const sanaMatni =
    dateValue === bugungiSana()
      ? "Bugun"
      : new Intl.DateTimeFormat("uz-UZ", {
          weekday: "short",
          day: "numeric",
          month: "short",
        }).format(parsed);

  return `${sanaMatni}, soat ${timeValue || "15:00"}`;
}

function qoldiqNomi(qoldiq: QoldiqTanlovi) {
  const productName = qoldiq.modification?.product?.name;
  const variantName = qoldiq.modification?.name;

  if (productName && variantName && variantName !== "Asosiy variant") {
    return `${productName} - ${variantName}`;
  }

  return productName ?? variantName ?? "Nomi aniqlanmagan mahsulot";
}

function qoldiqMiqdori(qoldiq?: QoldiqTanlovi) {
  return Number(qoldiq?.quantity ?? qoldiq?.balance ?? 0);
}

function qoldiqBirligi(qoldiq?: QoldiqTanlovi) {
  return qoldiq?.modification?.product?.name ? "dona" : "dona";
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

function raqamgaAylantirish(value: string) {
  if (!value.trim()) return 0;
  const number = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function mijozKorinishi(mijoz?: MijozTanlovi) {
  return (
    [mijoz?.firstName, mijoz?.lastName].filter(Boolean).join(" ") ||
    mijoz?.fullName ||
    mijoz?.name ||
    mijoz?.id ||
    "Mijoz"
  );
}

function mijozKompaniyaId(mijoz?: MijozTanlovi) {
  return mijoz?.companyId || mijoz?.company?.id || "";
}

function kompaniyaNomi(kompaniya?: MijozTanlovi) {
  return kompaniya?.name || kompaniya?.fullName || kompaniya?.id || "";
}

function xodimNomi(xodim?: XodimTanlovi) {
  return xodim?.fullName || xodim?.name || xodim?.username || xodim?.email || xodim?.id || "Xodim";
}

function xodimBoshHarflari(xodim?: XodimTanlovi) {
  const nom = xodimNomi(xodim);
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
  const [warehouseId, setWarehouseId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [clientCompanyId, setClientCompanyId] = useState("");
  const [responsibleId, setResponsibleId] = useState("");
  const [sotuvNomi, setSotuvNomi] = useState("");
  const [bosqich, setBosqich] = useState("Yangi");
  const [valyuta, setValyuta] = useState("UZS");
  const [note, setNote] = useState("");
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
    { modificationId: "", quantity: "1", price: "", discount: "" },
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
  const tanlanganMijoz = mijozlar.find((item) => item.id === customerId);
  const tanlanganKompaniya = mijozKompaniyalari.find((item) => item.id === clientCompanyId);
  const tanlanganOmbor = omborlar.find((item) => item.id === warehouseId);
  const tanlanganXodim = xodimlar.find((item) => item.id === responsibleId);
  const draftMode = variant === "draft";
  const modalMatnlari = draftMode
    ? {
        title: "Qoralama qo'shish",
        badge: "Qoralama",
        sectionTitle: "Qoralama haqida",
        nameLabel: "Qoralama nomi",
        namePlaceholder: "Qoralama #",
        amountLabel: "Qoralama summasi",
        notePrefix: "Qoralama nomi",
        stockWarning: "Serverda ombor mavjud emas. Qoralama yaratishdan oldin Sozlamalar - Ombor bo'limida ombor yaratilishi kerak.",
        submitLabel: "Qoralama saqlash",
      }
    : {
        title: "Sotuv yaratish",
        badge: "Yangi",
        sectionTitle: "Sotuv haqida",
        nameLabel: "Sotuv nomi",
        namePlaceholder: "Sotuv #",
        amountLabel: "Sotuv summasi",
        notePrefix: "Sotuv nomi",
        stockWarning: "Serverda ombor mavjud emas. Sotuv yaratishdan oldin Sozlamalar - Ombor bo'limida ombor yaratilishi kerak.",
        submitLabel: "Qoralama saqlash",
      };
  const korsatiladiganSotuvNomi =
    sotuvNomi.trim() ||
    (tanlanganMijoz
      ? `${mijozKorinishi(tanlanganMijoz)} uchun yangi ${draftMode ? "qoralama" : "sotuv"}`
      : "");

  function backendIzohiniYigish() {
    const metadata = [
      korsatiladiganSotuvNomi ? `${modalMatnlari.notePrefix}: ${korsatiladiganSotuvNomi}` : "",
      bosqich ? `Bosqich: ${bosqich}` : "",
      `Valyuta: ${valyutalar.find((item) => item.value === valyuta)?.label ?? valyuta}`,
      boshlanishSanasi ? `Boshlanish sanasi: ${boshlanishSanasi}` : "",
      tugashSanasi ? `Tugash sanasi: ${tugashSanasi}` : "",
    ].filter(Boolean);

    return [...metadata, note.trim()].filter(Boolean).join("\n");
  }

  async function faoliyatniBackendgaSaqlash() {
    const faoliyatOzgarilgan = faoliyatSaqlangan || Boolean(faoliyatSarlavha.trim()) || Boolean(faoliyatTafsilot.trim());
    if (!faoliyatOzgarilgan) return true;
    const partnerId = tanlanganMijoz?.partner?.id;
    if (!partnerId) {
      setXatolik("CRM faoliyatini saqlash uchun mijozni tanlang.");
      return false;
    }
    try {
      const sarlavha = faoliyatSarlavha.trim() || faoliyatMatnlari[faolTab]?.title || "Faoliyat";
      const matn = faoliyatTafsilot.trim() || sarlavha;
      if (faolTab === "Izoh") {
        await crmApi.partnerCommentYaratish(partnerId, { text: matn });
      } else if (faolTab === "Xabar") {
        await crmApi.partnerChatXabarYuborish(partnerId, matn);
      } else {
        if (!responsibleId) {
          setXatolik("Ish yoki vazifa yaratish uchun mas’ul xodimni tanlang.");
          return false;
        }
        const dueAt = new Date(`${faoliyatSana}T${faoliyatSoat || "00:00"}`).toISOString();
        await crmApi.activityYaratish({
          type: faolTab === "Vazifa" ? "TASK" : "CALL",
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

  function modifikatsiyaniTanlash(index: number, modificationId: string) {
    const qoldiq = qoldiqlar.find((item) => item.modificationId === modificationId);
    mahsulotniYangilash(index, {
      modificationId,
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
      { modificationId: "", quantity: "1", price: "", discount: "" },
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
      setXatolik("Avval omborni tanlang.");
      return;
    }

    if (boshlanishSanasi && tugashSanasi && tugashSanasi < boshlanishSanasi) {
      setXatolik("Tugash sanasi boshlanish sanasidan oldin bo'lmasligi kerak.");
      return;
    }

    if (tozaMahsulotlar.length === 0) {
      setXatolik("Kamida bitta mahsulot tanlang.");
      return;
    }

    if (jami <= 0) {
      setXatolik("Sotuv summasi 0 dan katta bo'lishi kerak.");
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
            title="Yopish"
            className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#FF6A00] text-white shadow-[0_10px_22px_rgba(249,115,22,.32)] ring-1 ring-white/80 transition duration-300 hover:-translate-x-0.5 hover:scale-105 active:scale-95"
          >
            <X size={18} />
          </button>
          <button
            type="button"
            onClick={nusxaOlish}
            title="Havolani nusxalash"
            className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-white text-[#FF6A00] shadow-md ring-1 ring-orange-100 transition hover:-translate-x-0.5 hover:bg-orange-50"
          >
            <Link size={15} />
          </button>
          <button
            type="button"
            onClick={qoralamaniYuklash}
            title="Qoralamani yuklash"
            className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-white text-[#FF6A00] shadow-md ring-1 ring-orange-100 transition hover:-translate-x-0.5 hover:bg-orange-50"
          >
            <Download size={15} />
          </button>
          <button
            type="button"
            onClick={() => window.open(window.location.href, "_blank", "noopener,noreferrer")}
            title="Yangi oynada ochish"
            className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-white text-[#FF6A00] shadow-md ring-1 ring-orange-100 transition hover:-translate-x-0.5 hover:bg-orange-50"
          >
            <ExternalLink size={15} />
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            title="Chop etish"
            className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-white text-[#FF6A00] shadow-md ring-1 ring-orange-100 transition hover:-translate-x-0.5 hover:bg-orange-50"
          >
            <Printer size={15} />
          </button>
        </div>

        <form
          onSubmit={submit}
          className="relative h-full w-full overflow-hidden rounded-l-[48px] rounded-r-[36px] bg-gradient-to-br from-[#FFF8EF] via-[#FFFDF9] to-[#FFE7D1] text-[#253044] shadow-[0_34px_120px_rgba(92,38,8,.42)] ring-1 ring-white/80"
        >
          <header className="sticky top-0 z-30 border-b border-orange-100/80 bg-[#FFF8EF]/88 px-7 py-3.5 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-[30px] font-black tracking-tight text-slate-950">
                    {modalMatnlari.title}
                  </h2>
                  <Copy size={17} className="text-slate-300" />
                  <span className="rounded-full bg-[#FFF3E2] px-3 py-1 text-xs font-black uppercase tracking-wider text-[#FF6A00]">
                    {modalMatnlari.badge}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onYopish}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-[#FF6A00] hover:text-white"
                aria-label="Oynani yopish"
              >
                <X size={19} />
              </button>
            </div>

          </header>

          <div className="scrollbar-hidden h-[calc(100%-74px)] overflow-y-auto px-7 py-4 pb-28">
            <div className="grid gap-5 xl:grid-cols-[minmax(390px,0.78fr)_minmax(540px,1.22fr)]">
              <div className="min-w-0 space-y-4">
                <section className="overflow-hidden rounded-[22px] bg-white/92 p-4 shadow-[0_18px_46px_rgba(255,106,0,.08)] ring-1 ring-orange-100/80 backdrop-blur">
                  <div className="mb-4 border-b border-orange-100/80 pb-3">
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">
                      {modalMatnlari.sectionTitle}
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <label className="grid gap-2">
                      <span className="text-sm font-bold text-slate-400">{modalMatnlari.nameLabel}</span>
                      <div className="flex items-center gap-2">
                        <input
                          value={sotuvNomi}
                          onChange={(event) => setSotuvNomi(event.target.value)}
                          placeholder={korsatiladiganSotuvNomi || modalMatnlari.namePlaceholder}
                          className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
                        />
                        <FieldSettings />
                      </div>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-bold text-slate-400">Bosqich</span>
                      <div className="flex items-center gap-2">
                        <SavdoSelect
                          value={bosqich}
                          onChange={setBosqich}
                          options={bosqichlar}
                          className="min-w-0 flex-1"
                          buttonClassName="h-11 rounded-xl px-3.5 text-sm"
                          dropdownClassName="min-w-[320px]"
                          portal
                        />
                        <FieldSettings />
                      </div>
                    </label>

                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_150px]">
                      <label className="grid gap-2">
                        <span className="text-sm font-bold text-slate-400">{modalMatnlari.amountLabel}</span>
                        <div className="flex items-center gap-2">
                          <input
                            value={jami > 0 ? pulniFormatlash(jami) : ""}
                            readOnly
                            className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-black text-slate-800 outline-none"
                            placeholder="0 so'm"
                          />
                        </div>
                      </label>
                      <label className="grid gap-2">
                        <span className="text-sm font-bold text-slate-400">Valyuta</span>
                        <SavdoSelect
                          value={valyuta}
                          onChange={setValyuta}
                          options={valyutalar}
                          buttonClassName="h-11 rounded-xl px-3.5 text-sm"
                          dropdownClassName="min-w-[180px]"
                          portal
                        />
                      </label>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="grid gap-2">
                        <span className="text-sm font-bold text-slate-400">Boshlanish sanasi</span>
                        <div className="relative">
                          <input
                            type="date"
                            value={boshlanishSanasi}
                            onChange={(event) => setBoshlanishSanasi(event.target.value)}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 pr-10 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
                          />
                          <CalendarDays
                            size={18}
                            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                        </div>
                      </label>
                      <label className="grid gap-2">
                        <span className="text-sm font-bold text-slate-400">Tugash sanasi</span>
                        <div className="relative">
                          <input
                            type="date"
                            value={tugashSanasi}
                            onChange={(event) => setTugashSanasi(event.target.value)}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 pr-10 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
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

                <section className="overflow-hidden rounded-[22px] bg-white/92 p-4 shadow-[0_18px_46px_rgba(255,106,0,.08)] ring-1 ring-orange-100/80 backdrop-blur">
                  <div className="mb-4 flex items-center justify-between border-b border-orange-100/80 pb-3">
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">
                      Mijoz va kompaniya
                    </h3>
                    <FieldSettings />
                  </div>

                  <div className="space-y-4">
                    <label className="grid gap-2">
                      <span className="text-sm font-bold text-slate-400">Kontakt</span>
                      <div className="relative">
                        <UserRound
                          size={18}
                          className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400"
                        />
                        <SavdoSelect
                          value={customerId}
                          onChange={mijozniTanlash}
                          placeholder="Mijoz ismi, telefon yoki email"
                          className="w-full"
                          buttonClassName="h-11 rounded-xl pl-10 pr-3.5 text-sm"
                          options={mijozlar.map((mijoz) => ({
                            value: mijoz.id,
                            label: `${mijozKorinishi(mijoz)}${mijoz.phone ? ` - ${mijoz.phone}` : ""}`,
                          }))}
                          dropdownClassName="min-w-[360px]"
                          portal
                        />
                      </div>
                      {customerId && clientCompanyId && (
                        <p className="text-xs font-semibold text-emerald-600">
                          Mijoz kompaniyaga avtomatik biriktirildi:{" "}
                          {kompaniyaNomi(tanlanganKompaniya)}
                        </p>
                      )}
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-bold text-slate-400">Kompaniya</span>
                      <div className="relative">
                        <Search
                          size={18}
                          className="pointer-events-none absolute right-4 top-1/2 z-10 -translate-y-1/2 text-slate-400"
                        />
                        <SavdoSelect
                          value={clientCompanyId}
                          onChange={kompaniyaniTanlash}
                          placeholder="Kompaniya nomi, telefon yoki email"
                          buttonClassName="h-11 rounded-xl pl-3.5 pr-10 text-sm"
                          options={mijozKompaniyalari.map((kompaniya) => ({
                            value: kompaniya.id,
                            label: `${kompaniyaNomi(kompaniya)}${kompaniya.phone ? ` - ${kompaniya.phone}` : ""}`,
                          }))}
                          dropdownClassName="min-w-[360px]"
                          portal
                        />
                      </div>
                      {clientCompanyId && customerId && (
                        <p className="text-xs font-semibold text-emerald-600">
                          Kompaniya vakili avtomatik tanlandi: {mijozKorinishi(tanlanganMijoz)}
                        </p>
                      )}
                    </label>
                  </div>
                </section>

                <section className="overflow-hidden rounded-[22px] bg-white/92 p-4 shadow-[0_18px_46px_rgba(255,106,0,.08)] ring-1 ring-orange-100/80 backdrop-blur">
                  <div className="mb-4 flex items-center justify-between border-b border-orange-100/80 pb-3">
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">
                      Qo'shimcha
                    </h3>
                    <FieldSettings />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-sm font-bold text-slate-400">Ombor *</span>
                      <SavdoSelect
                        value={warehouseId}
                        onChange={(value) => {
                          setWarehouseId(value);
                          onOmborTanlash(value);
                        }}
                        placeholder="Omborni tanlang"
                        options={omborlar.map((ombor) => ({
                          value: ombor.id,
                          label: ombor.name ?? ombor.id,
                        }))}
                        buttonClassName="h-11 rounded-xl px-3.5 text-sm"
                        dropdownClassName="min-w-[300px]"
                        portal
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm font-bold text-slate-400">Mas'ul xodim</span>
                      <SavdoSelect
                        value={responsibleId}
                        onChange={setResponsibleId}
                        placeholder="Mas'ul xodimni tanlang"
                        options={xodimlar.map((xodim) => ({
                          value: xodim.id,
                          label: xodim.fullName ?? xodim.username ?? xodim.id,
                        }))}
                        buttonClassName="h-11 rounded-xl px-3.5 text-sm"
                        dropdownClassName="min-w-[320px]"
                        portal
                      />
                    </label>
                  </div>
                </section>

                <section className="overflow-hidden rounded-[22px] bg-white/92 p-4 shadow-[0_18px_46px_rgba(255,106,0,.08)] ring-1 ring-orange-100/80 backdrop-blur">
                  <div className="mb-4 flex items-center justify-between border-b border-orange-100/80 pb-3">
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">
                      Izoh
                    </h3>
                    <FieldSettings />
                  </div>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-2xl border border-slate-200 p-3.5 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
                    placeholder="Sotuv bo'yicha qo'shimcha izoh"
                  />
                </section>
              </div>

              <div className="min-w-0 space-y-4">
                <section className="overflow-hidden rounded-[22px] bg-white/92 p-4 shadow-[0_18px_46px_rgba(255,106,0,.08)] ring-1 ring-orange-100/80 backdrop-blur">
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
                            ? "border border-orange-200 bg-orange-50 text-[#FF6A00]"
                            : "text-slate-500 hover:bg-orange-50 hover:text-[#FF6A00]"
                        }`}
                      >
                        {tab}
                        {tab === "Ko'proq" && <ChevronDown size={14} />}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl border border-orange-300 bg-gradient-to-br from-white to-[#FFF7EC] p-4 shadow-inner transition focus-within:ring-4 focus-within:ring-orange-100">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1 space-y-3">
                        <input
                          value={faoliyatSarlavha}
                          onChange={(event) => {
                            setFaoliyatSarlavha(event.target.value);
                            setFaoliyatSaqlangan(false);
                          }}
                          placeholder={faoliyatMatnlari[faolTab]?.title ?? "Faoliyat nomi"}
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
                            faoliyatMatnlari[faolTab]?.placeholder ??
                            "Faoliyat haqida batafsil yozing..."
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
                          placeholder="Mas'ul xodim"
                          options={xodimlar.map((xodim) => ({
                            value: xodim.id,
                            searchLabel: xodimNomi(xodim),
                            label: (
                              <span className="flex min-w-0 items-center gap-3">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-black text-[#FF6A00]">
                                  {xodimBoshHarflari(xodim) || <UserRound size={15} />}
                                </span>
                                <span className="min-w-0 flex-1 truncate">{xodimNomi(xodim)}</span>
                              </span>
                            ),
                          }))}
                          selectedLabel={
                            tanlanganXodim ? (
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center text-center text-xs font-black leading-none">
                                {xodimBoshHarflari(tanlanganXodim)}
                              </span>
                            ) : (
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center leading-none">
                                <UserRound size={18} className="block shrink-0" />
                              </span>
                            )
                          }
                          className="w-9 shrink-0"
                          buttonClassName="h-9 w-9 justify-center gap-0 rounded-full border-0 bg-orange-100 p-0 text-center text-[#FF6A00] shadow-none [&>span]:flex [&>span]:h-9 [&>span]:w-9 [&>span]:items-center [&>span]:justify-center hover:bg-orange-200 focus:ring-orange-100"
                          dropdownClassName="min-w-[260px]"
                          portal
                          hideChevron
                        />
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <div className="inline-flex min-h-11 flex-wrap items-center gap-2 rounded-xl border border-orange-200 bg-orange-50/80 px-3 py-2 text-sm font-semibold text-slate-700">
                        <CalendarDays size={16} className="shrink-0" />
                        <span className="shrink-0">
                          {faoliyatSanasiMatni(faoliyatSana, faoliyatSoat)}
                        </span>
                        <input
                          type="date"
                          value={faoliyatSana}
                          onChange={(event) => {
                            setFaoliyatSana(event.target.value);
                            setFaoliyatSaqlangan(false);
                          }}
                          className="h-7 rounded-lg border border-orange-100 bg-white px-2 text-xs font-bold text-slate-600 outline-none focus:border-[#FF6A00]"
                        />
                        <input
                          type="time"
                          value={faoliyatSoat}
                          onChange={(event) => {
                            setFaoliyatSoat(event.target.value);
                            setFaoliyatSaqlangan(false);
                          }}
                          className="h-7 rounded-lg border border-orange-100 bg-white px-2 text-xs font-bold text-slate-600 outline-none focus:border-[#FF6A00]"
                        />
                      </div>
                      <button
                        type="button"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-orange-50 hover:text-[#FF6A00]"
                        title="Eslatma"
                      >
                        <Bell size={18} />
                      </button>
                      {(faolTab === "Xabar" || faolTab === "Ko'proq") && (
                        <button
                          type="button"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-orange-50 hover:text-[#FF6A00]"
                          title="Xabar"
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
                            setFaoliyatSarlavha(faoliyatMatnlari[faolTab]?.title ?? "");
                          }
                          setFaoliyatSaqlangan(true);
                        }}
                        className="inline-flex h-10 items-center justify-center rounded-2xl bg-[#FF6A00] px-6 text-sm font-black uppercase text-white shadow-[0_12px_28px_rgba(255,106,0,.22)] transition hover:-translate-y-0.5 hover:bg-[#EA580C]"
                      >
                        Saqlash
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
                        className="inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-black uppercase text-slate-600 transition hover:bg-orange-50 hover:text-[#FF6A00]"
                      >
                        Bekor qilish
                      </button>
                      {faoliyatSaqlangan && (
                        <span className="text-xs font-bold text-emerald-600">
                          Faoliyat qoralamaga qo'shildi
                        </span>
                      )}
                    </div>
                  </div>
                </section>

                <section className="overflow-hidden rounded-[22px] bg-white/92 p-4 shadow-[0_18px_46px_rgba(255,106,0,.08)] ring-1 ring-orange-100/80 backdrop-blur">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">
                      Tovarlar
                    </h3>
                    <button
                      type="button"
                      onClick={qatorQoshish}
                      className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#FF6A00] px-3.5 text-sm font-black text-white shadow-[0_10px_24px_rgba(249,115,22,.22)] transition hover:-translate-y-0.5 hover:bg-[#EA580C]"
                    >
                      <Plus size={16} />
                      Qo'shish
                    </button>
                  </div>

                  <div className="space-y-3">
                    {mahsulotlar.map((mahsulot, index) => {
                      const qoldiq = qoldiqlar.find(
                        (item) => item.modificationId === mahsulot.modificationId
                      );
                      const miqdor = raqamgaAylantirish(mahsulot.quantity);
                      const narx = raqamgaAylantirish(mahsulot.price);
                      const chegirma = raqamgaAylantirish(mahsulot.discount);
                      const qatorJami = Math.max(miqdor * narx - chegirma, 0);

                      return (
                        <div
                          key={index}
                          className="overflow-hidden rounded-[18px] border border-orange-100 bg-gradient-to-br from-[#FFF8EF] to-white p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,.8)]"
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
                              aria-label="Mahsulot qatorini o'chirish"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>

                          <div className="grid min-w-0 gap-2 xl:grid-cols-[minmax(150px,1fr)_42px_96px_88px_96px] 2xl:grid-cols-[minmax(190px,1fr)_48px_118px_108px_112px]">
                            <SavdoSelect
                              value={mahsulot.modificationId}
                              onChange={(value) => modifikatsiyaniTanlash(index, value)}
                              placeholder="Mahsulotni tanlang"
                              options={qoldiqlar.map((item) => ({
                                value: item.modificationId,
                                label: `${qoldiqNomi(item)} - qoldiq: ${qoldiqMiqdori(item)} - narx: ${pulniFormatlash(qoldiqNarxi(item))}`,
                              }))}
                              buttonClassName="h-11 rounded-xl px-3.5 text-sm"
                              dropdownClassName="min-w-[520px] max-w-[min(720px,calc(100vw-32px))]"
                              portal
                            />

                            <button
                              type="button"
                              className="flex h-11 items-center justify-center rounded-xl border border-dashed border-orange-200 bg-white text-slate-400 transition hover:border-[#FF6A00] hover:text-[#FF6A00]"
                              title="Rasm"
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
                              className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
                              placeholder="Narx"
                            />

                            <input
                              type="number"
                              min="0.001"
                              step="0.001"
                              value={mahsulot.quantity}
                              onChange={(event) =>
                                mahsulotniYangilash(index, { quantity: event.target.value })
                              }
                              className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
                              placeholder="Miqdor"
                            />

                            <input
                              type="number"
                              min="0"
                              value={mahsulot.discount}
                              onChange={(event) =>
                                mahsulotniYangilash(index, { discount: event.target.value })
                              }
                              className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
                              placeholder="Chegirma"
                            />
                          </div>

                          <div className="mt-3 grid gap-2 md:grid-cols-3">
                            <div className="rounded-xl bg-white/80 px-3 py-2.5 ring-1 ring-orange-50">
                              <p className="text-xs font-black uppercase text-slate-400">
                                Ombor
                              </p>
                              <p className="mt-1 text-sm font-bold text-slate-700">
                                {tanlanganOmbor?.name || "Tanlanmagan"}
                              </p>
                            </div>
                            <div className="rounded-xl bg-white/80 px-3 py-2.5 ring-1 ring-orange-50">
                              <p className="text-xs font-black uppercase text-slate-400">
                                Mavjud qoldiq
                              </p>
                              <p className="mt-1 text-sm font-bold text-[#FF6A00]">
                                {qoldiq ? `${qoldiqMiqdori(qoldiq)} ${qoldiqBirligi(qoldiq)}` : "—"}
                              </p>
                            </div>
                            <div className="rounded-xl bg-white/80 px-3 py-2.5 ring-1 ring-orange-50">
                              <p className="text-xs font-black uppercase text-slate-400">
                                Qator jami
                              </p>
                              <p className="mt-1 text-sm font-black text-emerald-600">
                                {pulniFormatlash(qatorJami)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] bg-gradient-to-br from-[#FFF3E2] to-[#FFE7D1] p-5 shadow-[0_18px_46px_rgba(255,106,0,.08)] ring-1 ring-orange-100/80 backdrop-blur">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-[#EA580C]">
                      Sotuv jami
                    </p>
                    <p className="mt-1 text-3xl font-black text-slate-950">
                      {pulniFormatlash(jami)}
                    </p>
                  </div>
                  <p className="max-w-[300px] text-xs font-semibold leading-5 text-[#8A4B12]">
                    To'lov shu yerda qabul qilinmaydi — sotuv qoralama sifatida saqlangach,
                    to'lovni sotuv sahifasidan alohida qabul qilasiz.
                  </p>
                </section>

                {omborlar.length === 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
                    {modalMatnlari.stockWarning}
                  </div>
                )}

                {xatolik && (
                  <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
                    {xatolik}
                  </div>
                )}
              </div>
            </div>
          </div>

          <footer className="absolute bottom-0 left-0 right-0 z-30 flex justify-end gap-3 border-t border-orange-100 bg-[#FFF8EF]/90 px-7 py-3.5 backdrop-blur-xl">
            <button
              type="button"
              onClick={onYopish}
              className="rounded-2xl bg-slate-100 px-6 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-200"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={amalBajarilmoqda || omborlar.length === 0}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#FF6A00] px-7 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(255,106,0,.24)] transition hover:-translate-y-0.5 hover:bg-[#EA580C] hover:shadow-[0_18px_40px_rgba(234,88,12,.32)] disabled:opacity-50"
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
