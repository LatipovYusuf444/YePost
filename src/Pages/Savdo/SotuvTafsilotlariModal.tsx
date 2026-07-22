import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Database,
  Download,
  ExternalLink,
  FileText,
  Link,
  ImageIcon,
  LoaderCircle,
  MessageSquare,
  MoreHorizontal,
  Package,
  Paperclip,
  Pin,
  Plus,
  Printer,
  Search,
  Send,
  Settings,
  SlidersHorizontal,
  Smile,
  Trash2,
  UserRound,
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
import type { Activity, Attachment, ChatMessage, Comment } from "@/types/crm";
import type { QoldiqTanlovi, SaleAuditLog, Sotuv, SotuvTolovi, SotuvYaratishMalumoti, TolovTuri, XodimTanlovi, YetkazishMalumoti, YetkazishPayload } from "@/types/savdo";
import {
  masulNomi,
  mijozNomi,
  pulniFormatlash,
  sananiFormatlash,
  sotuvHolati,
  sotuvHolatiMatni,
  sotuvJadvalId,
  sotuvOrtiqchaTolovSummasi,
  sotuvQarzdorlikSummasi,
  sotuvRaqami,
  sotuvSummasi,
  sotuvTolanganSummasi,
  tolovTuriMatni,
} from "./savdoYordamchilari";
import SavdoSelect from "./SavdoSelect";

type SotuvTafsilotlariModalProps = {
  sotuv: Sotuv;
  qoldiqlar: QoldiqTanlovi[];
  xodimlar: XodimTanlovi[];
  amalBajarilmoqda: boolean;
  onYopish: () => void;
  onYangilash: (
    sotuvId: string,
    malumot: Partial<SotuvYaratishMalumoti>
  ) => Promise<boolean>;
  onTolovQoshish: (
    sotuvId: string,
    tolov: Pick<SotuvTolovi, "paymentType" | "amount">
  ) => Promise<boolean>;
  onTasdiqlash: (sotuvId: string) => Promise<void> | void;
  onBekorQilish: (sotuvId: string) => void;
};

type SotuvItem = NonNullable<Sotuv["items"]>[number];
type YangiTovarQatori = {
  id: string;
  modificationId: string;
  quantity: number;
  price: number;
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

const tabs = ["Umumiy", "Tovarlar", "Hisob-fakturalar", "Tarix"];
const bolimlar = ["To'lov", "To'lov va yetkazish", "Terminal orqali to'lov", "Yetkazish", "Ombordan chiqarish"];

function crmActivityniFaoliyatga(activity: Activity): SaqlanganFaoliyat {
  return {
    id: activity.id,
    turi: activity.type === "TASK" ? "Vazifa" : activity.type === "MEETING" ? "Ish" : "Ish",
    sarlavha: activity.subject ?? "CRM vazifa",
    matn: activity.description ?? activity.result ?? "",
    sana: activity.dueAt ?? activity.createdAt ?? new Date().toISOString(),
    xodimId: activity.assigneeId,
    harakat: "Kalendariga qo'shish",
    completed: String(activity.status ?? "").toUpperCase() === "DONE",
  };
}

function crmCommentniFaoliyatga(comment: Comment): SaqlanganFaoliyat {
  return {
    id: comment.id,
    turi: "Izoh",
    sarlavha: "Izoh",
    matn: comment.text ?? "",
    sana: comment.createdAt ?? new Date().toISOString(),
    pinned: Boolean(comment.pinned ?? comment.isPinned),
  };
}

function mijozIdOlish(sotuv: Sotuv) {
  return sotuv.customerId ?? sotuv.customer?.id ?? "";
}

function mijozTelefon(sotuv: Sotuv) {
  return sotuv.customer?.phone || sotuv.clientCompany?.phone || "-";
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
    "-"
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

function qisqaVaqt(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("uz-UZ", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function xodimNomi(xodim?: XodimTanlovi | null) {
  if (!xodim) return "Xodim tanlanmagan";
  return xodim.fullName || xodim.name || xodim.username || xodim.email || xodim.id;
}

function xodimBoshHarflari(xodim?: XodimTanlovi | null) {
  const nom = xodimNomi(xodim);
  if (nom === "Xodim tanlanmagan") return "";
  return nom
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((qism) => qism[0]?.toUpperCase())
    .join("");
}

function tarixVaqti(value?: string) {
  if (!value) return "Sana yo'q";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return sananiFormatlash(value);
  const diff = Date.now() - date.getTime();
  const minute = Math.floor(diff / 60000);
  if (minute >= 0 && minute < 60) return `${Math.max(minute, 1)} minut avval`;
  const hour = Math.floor(minute / 60);
  if (hour >= 1 && hour < 24) return `${hour} soat avval`;
  const today = new Date();
  if (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  ) {
    return `bugun, ${qisqaVaqt(value)}`;
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

function mahsulotNomi(item: SotuvItem) {
  return item.modification?.product?.name ?? item.modification?.name ?? "Mahsulot nomi topilmadi";
}

function mahsulotTavsifi(item: SotuvItem) {
  if (item.modification?.product?.name && item.modification?.name) return item.modification.name;
  return "Mahsulot ma'lumoti katalogdan olinadi";
}

function son(value: unknown) {
  const raqam = Number(value ?? 0);
  return Number.isFinite(raqam) ? raqam : 0;
}

function mahsulotJami(item: SotuvItem) {
  return son(item.quantity) * son(item.price) - son(item.discount);
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

function qoldiqTavsifi(qoldiq: QoldiqTanlovi) {
  const barcode = qoldiq.modification?.barcode;
  const article = qoldiq.modification?.article;
  return [barcode ? `Shtrix-kod: ${barcode}` : "", article ? `Artikul: ${article}` : ""]
    .filter(Boolean)
    .join(" · ");
}

export default function SotuvTafsilotlariModal({
  sotuv,
  qoldiqlar,
  xodimlar,
  amalBajarilmoqda,
  onYopish,
  onYangilash,
  onTolovQoshish,
  onTasdiqlash,
  onBekorQilish,
}: SotuvTafsilotlariModalProps) {
  const [activeTab, setActiveTab] = useState("Umumiy");
  const [yetkazishOchiq, setYetkazishOchiq] = useState(false);
  const [ombordanChiqarishOchiq, setOmbordanChiqarishOchiq] = useState(false);
  const [tolovModalOchiq, setTolovModalOchiq] = useState(false);
  const [hujjatMenuOchiq, setHujjatMenuOchiq] = useState(false);
  const [hujjatGeneratorOchiq, setHujjatGeneratorOchiq] = useState(false);
  const [tanlanganHujjatTuri, setTanlanganHujjatTuri] = useState<HujjatTuri>("Nakladnoy");
  const [hujjatlar, setHujjatlar] = useState<SaqlanganHujjat[]>([]);
  const holat = sotuvHolati(sotuv);
  const jami = sotuvSummasi(sotuv);
  const draft = holat === "DRAFT";
  const vaqt = qisqaVaqt(sotuv.createdAt) || "—";

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

  return (
    <AppModal className="items-start justify-start bg-[rgba(54,22,8,.50)] p-0 py-4 pl-[88px] pr-4 backdrop-blur-[3px]">
      <div className="relative h-[calc(100vh-32px)] w-full">
        <ModalTezkorPanel sotuv={sotuv} onYopish={onYopish} />
        <section className="relative h-full w-full overflow-hidden rounded-l-[46px] rounded-r-[36px] bg-gradient-to-br from-[#FFF8EF] via-[#FFFDF9] to-[#FFE8D2] text-[#253044] shadow-[0_34px_120px_rgba(92,38,8,.42)] ring-1 ring-white/80">
        <div className={`scrollbar-hidden h-full ${activeTab === "Hisob-fakturalar" ? "overflow-hidden" : "overflow-y-auto"}`}>
          <header className="sticky top-0 z-30 border-b border-orange-100/80 bg-[#FFF8EF]/90 px-9 py-6 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <h1 className="truncate text-2xl font-bold text-slate-900">{sotuvJadvalId(sotuv)}</h1>
              <div className="flex shrink-0 items-center gap-2">
                <IconButton icon={<Settings size={17} />} />
                <div className="relative hidden sm:block">
                  <button
                    type="button"
                    onClick={() => setHujjatMenuOchiq((joriy) => !joriy)}
                    className={`inline-flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-sm shadow-sm transition ${
                      hujjatMenuOchiq ? "text-orange-600 ring-1 ring-orange-100" : "text-slate-600 hover:text-orange-600"
                    }`}
                  >
                    Hujjat <ChevronDown size={15} className={`transition ${hujjatMenuOchiq ? "rotate-180" : ""}`} />
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
                            {nom}
                          </button>
                        ))}

                        <div className="my-3 h-px bg-slate-100" />
                        {["Hujjatlar ro'yxati", "Yangi shablon qo'shish"].map((nom) => (
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
                          <span>Kengaytmalar</span>
                          <ChevronRight size={17} className="text-slate-300" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {holat !== "CANCELLED" && sotuvQarzdorlikSummasi(sotuv) > 0 && (
                  <button
                    disabled={amalBajarilmoqda}
                    onClick={() => setTolovModalOchiq(true)}
                    className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#FF6A00] px-4 text-sm font-bold text-white shadow-[0_10px_24px_rgba(249,115,22,.24)] transition hover:bg-[#EA580C] disabled:opacity-50"
                  >
                    {amalBajarilmoqda ? <LoaderCircle size={16} className="animate-spin" /> : "To'lovni qabul qilish"}
                    <ChevronDown size={15} />
                  </button>
                )}
                <button
                  onClick={onYopish}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm transition hover:bg-orange-500 hover:text-white"
                  aria-label="Yopish"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <nav className="mt-6 flex items-center gap-3 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`shrink-0 rounded-xl px-3 py-2 text-sm transition ${
                    activeTab === tab ? "border border-orange-200 bg-white text-[#FF6A00]" : "text-slate-500 hover:bg-white hover:text-[#FF6A00]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </header>

          {activeTab === "Tovarlar" ? (
            <TovarlarTab
              sotuv={sotuv}
              qoldiqlar={qoldiqlar}
              amalBajarilmoqda={amalBajarilmoqda}
              onYangilash={onYangilash}
            />
          ) : activeTab === "Hisob-fakturalar" ? (
            <HisobFakturalarTab sotuv={sotuv} />
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
              onTolovOchish={() => setTolovModalOchiq(true)}
              onBekorQilish={onBekorQilish}
              onYetkazish={() => setYetkazishOchiq(true)}
              onOmbordanChiqarish={() => setOmbordanChiqarishOchiq(true)}
              hujjatlar={hujjatlar}
              onHujjatOchish={hujjatniOchish}
            />
          )}
        </div>

        {yetkazishOchiq && <YetkazishPanel sotuv={sotuv} jami={jami} onClose={() => setYetkazishOchiq(false)} />}
        {ombordanChiqarishOchiq && <OmbordanChiqarishPanel sotuv={sotuv} jami={jami} onClose={() => setOmbordanChiqarishOchiq(false)} />}
        {tolovModalOchiq && (
          <TolovQabulQilishModal
            sotuv={sotuv}
            jami={jami}
            draft={draft}
            amalBajarilmoqda={amalBajarilmoqda}
            onYangilash={onYangilash}
            onTolovQoshish={onTolovQoshish}
            onTasdiqlash={onTasdiqlash}
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
      </section>
      </div>
    </AppModal>
  );
}

function ModalTezkorPanel({ sotuv, onYopish }: { sotuv: Sotuv; onYopish: () => void }) {
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
    { label: "Yopish", icon: X, onClick: onYopish },
    { label: "Havolani nusxalash", icon: Link, onClick: havolaniNusxalash },
    { label: "Ma'lumotni yuklab olish", icon: Download, onClick: jsonYuklash },
    { label: "Alohida oynada ochish", icon: ExternalLink, onClick: alohidaOynadaOchish },
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
                ? "bg-[#FF6A00] text-white hover:bg-[#EA580C] hover:shadow-[0_16px_34px_rgba(234,88,12,.36)]"
                : "bg-white text-[#FF6A00] hover:bg-[#FFF3E2] hover:text-[#EA580C]"
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
  const [tayyor, setTayyor] = useState(false);
  const hujjatRaqam = `${sotuvJadvalId(sotuv)}-${hujjatTuri === "Nakladnoy" ? "YX" : "HF"}`;
  const hujjatSarlavha = hujjatTuri === "Nakladnoy" ? "Nakladnoy" : "Hisob-faktura";
  const mijoz = mijozNomi(sotuv);
  const jami = pulniFormatlash(sotuvSummasi(sotuv));
  const mahsulotlar = sotuv.items ?? [];
  const yetkazuvchi = sotuv.warehouse?.name || "YePost";
  const yetkazuvchiManzil = sotuv.warehouse?.address || "Savdo tizimi";
  const xaridorTelefon = mijozTelefon(sotuv);
  const qisqaSana = (() => {
    const sana = sotuv.createdAt ? new Date(sotuv.createdAt) : new Date();
    if (Number.isNaN(sana.getTime())) return sananiFormatlash(sotuv.createdAt);
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
            <td>${mahsulotNomi(item)}</td>
            <td>dona</td>
            <td>${item.quantity}</td>
            <td>${pulniFormatlash(item.price)}</td>
            <td>${pulniFormatlash(mahsulotJami(item))}</td>
          </tr>
        `
      )
      .join("");

    printWindow?.document.write(`
      <html>
        <head>
          <title>Nakladnoy ${hujjatRaqam}</title>
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
          <h1>Chiqim nakladnoyi № ${hujjatRaqam} от ${qisqaSana}</h1>
          <table class="info">
            <tr>
              <td class="label">Yetkazuvchi</td>
              <td>${yetkazuvchi}, ${yetkazuvchiManzil}</td>
            </tr>
            <tr>
              <td class="label">Xaridor</td>
              <td style="text-align:center;font-size:20px;font-weight:800;">${mijoz} tel.: ${xaridorTelefon}</td>
            </tr>
            <tr class="pay">
              <td class="label">To'lov turi</td>
              <td>
                Naqd ${tolovBor("CASH") ? "✓" : "_____"} &nbsp;&nbsp;&nbsp;&nbsp;
                Karta ${tolovBor("CARD") ? "✓" : "_____"} &nbsp;&nbsp;&nbsp;&nbsp;
                Bank o'tkazmasi ${tolovBor("BANK") ? "✓" : "_____"}
              </td>
            </tr>
          </table>
          <table class="items">
            <thead><tr><th>№</th><th>Nomi</th><th>Birlik</th><th>Miqdor</th><th>Narx</th><th>Summa</th></tr></thead>
            <tbody>${rows || `<tr><td colspan="6">Mahsulotlar mavjud emas</td></tr>`}</tbody>
            <tfoot>
              <tr class="total-row"><td colspan="5" style="text-align:right;">Jami</td><td style="text-align:center;">${jami}</td></tr>
            </tfoot>
          </table>
          <div class="signs">
            <div>Topshirdi <span class="line"></span></div>
            <div>Oldi <span class="line"></span></div>
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
            th { background: #fff7ed; color: #ea580c; }
            .total { margin-top: 24px; text-align: right; font-size: 20px; font-weight: 800; }
          </style>
        </head>
        <body>
          <h1>Yuk xati</h1>
          <div class="meta">Hujjat raqami: ${hujjatRaqam} · Sana: ${sananiFormatlash(sotuv.createdAt)}</div>
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
      text(mahsulotNomi(item).slice(0, 26), 82, y + 8, 9);
      text("dona", 254, y + 8, 9);
      text(String(item.quantity), 310, y + 8, 9);
      text(pulniFormatlash(item.price), 360, y + 8, 9);
      text(pulniFormatlash(mahsulotJami(item)), 438, y + 8, 9, "F2");
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
    <div className="fixed inset-0 z-[140] flex items-start justify-end bg-slate-950/45 px-5 py-5 pl-[380px] backdrop-blur-sm">
      <div className="relative h-[calc(100vh-40px)] w-full max-w-[1120px] overflow-visible rounded-[32px] bg-[#EEF3F6] shadow-[0_30px_90px_rgba(15,23,42,.34)]">
        <div className="absolute -left-[58px] top-4 z-20 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FF6A00] text-white shadow-[0_12px_28px_rgba(255,106,0,.35)] ring-1 ring-white/60 transition duration-200 hover:-translate-y-0.5 hover:bg-[#E45A0C]"
            aria-label="Nakladnoy oynasini yopish"
            title="Yopish"
          >
            <X size={19} />
          </button>
          <button
            type="button"
            onClick={chopEtish}
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-[#FF6A00] shadow-[0_10px_24px_rgba(15,23,42,.16)] ring-1 ring-orange-100 transition duration-200 hover:-translate-y-0.5 hover:bg-[#FFF3E2]"
            aria-label="Nakladnoyni chop etish"
            title="Chop etish"
          >
            <Printer size={17} />
          </button>
          <button
            type="button"
            onClick={pdfYuklash}
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-[#FF6A00] shadow-[0_10px_24px_rgba(15,23,42,.16)] ring-1 ring-orange-100 transition duration-200 hover:-translate-y-0.5 hover:bg-[#FFF3E2]"
            aria-label="Nakladnoy PDF yuklab olish"
            title="PDF yuklab olish"
          >
            <Download size={17} />
          </button>
        </div>

        <div className="scrollbar-hidden h-full overflow-y-auto px-6 py-5">
          <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900">{hujjatSarlavha} {hujjatRaqam}</h2>
              <p className="mt-1 text-[13px] text-slate-500">Sotuv ma'lumotlari asosida hujjat generatsiya qilinmoqda.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={chopEtish} type="button" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3.5 text-[13px] font-bold text-slate-600 shadow-sm transition hover:text-orange-600">
                <Printer size={16} />
                Chop etish
              </button>
              <button onClick={pdfYuklash} type="button" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3.5 text-[13px] font-bold text-slate-600 shadow-sm transition hover:text-blue-600">
                PDF yuklab olish <ChevronDown size={15} />
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
                  <h3 className="mt-6 text-xl font-semibold text-slate-900">PDF faylini yaratish</h3>
                  <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500">
                    Hujjat sotuvdagi real mahsulot, mijoz va summa ma'lumotlari asosida tayyorlanmoqda.
                  </p>
                  <div className="mx-auto mt-6 h-2 w-60 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full w-2/3 animate-pulse rounded-full bg-sky-400" />
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-3xl rounded-2xl border border-slate-100 bg-white p-6 font-serif text-slate-950 shadow-[0_16px_45px_rgba(15,23,42,.07)]">
                  <h3 className="text-center text-[22px] font-black">Chiqim nakladnoyi № {hujjatRaqam} от {qisqaSana}</h3>

                  <div className="mt-5 overflow-hidden border border-slate-950">
                    <div className="grid grid-cols-[150px_1fr] border-b border-slate-950">
                      <div className="flex items-center justify-center border-r border-slate-950 px-3 py-2 text-sm font-black">Yetkazuvchi</div>
                      <div className="px-3 py-2 text-center text-sm leading-5">
                        <b>{yetkazuvchi}</b>, {yetkazuvchiManzil}
                      </div>
                    </div>
                    <div className="grid grid-cols-[150px_1fr] border-b border-slate-950">
                      <div className="flex items-center justify-center border-r border-slate-950 px-3 py-3 text-sm font-black">Xaridor</div>
                      <div className="px-3 py-3 text-center text-lg font-black">
                        {mijoz} <span className="font-semibold">tel.: {xaridorTelefon}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-[150px_1fr]">
                      <div className="flex items-center justify-center border-r border-slate-950 px-3 py-2 text-sm font-black">To'lov turi</div>
                      <div className="flex flex-wrap items-center justify-around gap-3 px-3 py-2 text-sm font-bold">
                        <span>Naqd {tolovBor("CASH") ? "✓" : "_____"}</span>
                        <span>Karta {tolovBor("CARD") ? "✓" : "_____"}</span>
                        <span>Bank o'tkazmasi {tolovBor("BANK") ? "✓" : "_____"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-7 overflow-hidden border border-slate-950">
                    <table className="w-full border-collapse text-left text-[13px]">
                      <thead>
                        <tr>
                          <th className="border-r border-slate-950 px-3 py-2 text-center">№</th>
                          <th className="border-r border-slate-950 px-3 py-2 text-center">Nomi</th>
                          <th className="border-r border-slate-950 px-3 py-2 text-center">Birlik</th>
                          <th className="border-r border-slate-950 px-3 py-2 text-center">Miqdor</th>
                          <th className="border-r border-slate-950 px-3 py-2 text-center">Narx</th>
                          <th className="px-3 py-2 text-center">Summa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mahsulotlar.map((item, index) => (
                          <tr key={item.id ?? `${item.modificationId}-${index}`}>
                            <td className="border-t border-r border-slate-950 px-3 py-1.5 text-center font-bold">{index + 1}</td>
                            <td className="border-t border-r border-slate-950 px-3 py-1.5 font-semibold">{mahsulotNomi(item)}</td>
                            <td className="border-t border-r border-slate-950 px-3 py-1.5 text-center">dona</td>
                            <td className="border-t border-r border-slate-950 px-3 py-1.5 text-center">{item.quantity}</td>
                            <td className="border-t border-r border-slate-950 px-3 py-1.5 text-center">{pulniFormatlash(item.price)}</td>
                            <td className="border-t border-slate-950 px-3 py-1.5 text-center font-bold">{pulniFormatlash(mahsulotJami(item))}</td>
                          </tr>
                        ))}
                        {mahsulotlar.length === 0 && (
                          <tr>
                            <td className="border-t border-slate-950 px-3 py-5 text-center text-slate-500" colSpan={6}>
                              Mahsulotlar mavjud emas
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={5} className="border-t border-r border-slate-950 px-3 py-2 text-right font-black">
                            Jami
                          </td>
                          <td className="border-t border-slate-950 px-3 py-2 text-center font-black">{jami}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="mt-7 grid grid-cols-2 gap-8 text-base">
                    <div className="flex items-end gap-3">
                      <span>Topshirdi</span>
                      <span className="h-px flex-1 bg-slate-950" />
                    </div>
                    <div className="flex items-end gap-3">
                      <span>Oldi</span>
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
  onBekorQilish,
  onYetkazish,
  onOmbordanChiqarish,
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
  onTolovOchish: () => void;
  onBekorQilish: (sotuvId: string) => void;
  onYetkazish: () => void;
  onOmbordanChiqarish: () => void;
  hujjatlar: SaqlanganHujjat[];
  onHujjatOchish: (hujjat: SaqlanganHujjat) => void;
}) {
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
        if (!customerId && !sotuv.clientCompanyId) setCrmXatolik("Bu sotuvga mijoz yoki kompaniya biriktirilmagan.");
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
          ...activities.map(crmActivityniFaoliyatga),
          ...royxatniAjratish(comments).map(crmCommentniFaoliyatga),
          ...royxatniAjratish(messages).map(crmXabarniFaoliyatga),
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
  }, [customerId, partnerId, sotuv.clientCompanyId, sotuv.id]);

  async function faoliyatniSaqlash(faoliyat: Omit<SaqlanganFaoliyat, "id" | "sana"> & { sana?: string }) {
    try {
      setCrmXatolik("");
      if (!partnerId) {
        setCrmXatolik("Faoliyatni backendga saqlash uchun sotuvda real partner ID bo'lishi kerak.");
        return false;
      }
      if (partnerId) {
        if (faoliyat.turi === "Izoh") {
          const comment = await crmApi.partnerCommentYaratish(partnerId, {
            text: faoliyat.matn || faoliyat.sarlavha,
            attachmentIds: faoliyat.attachmentIds,
            mentionUserIds: faoliyat.mentionUserIds,
          });
          setSaqlanganFaoliyatlar((joriy) => [crmCommentniFaoliyatga(comment), ...joriy]);
          return true;
        }

        if (faoliyat.turi === "Xabar") {
          const text = faoliyat.matn || faoliyat.sarlavha;
          const message = await crmApi.partnerChatXabarYuborish(partnerId, text);
          setSaqlanganFaoliyatlar((joriy) => [crmXabarniFaoliyatga(message), ...joriy]);
          return true;
        }

        const assigneeId = faoliyat.xodimId || sotuv.responsibleId;
        if (!assigneeId) {
          setCrmXatolik("CRM ish yaratish uchun mas'ul xodim tanlanishi kerak.");
          return false;
        }

        const activity = await crmApi.activityYaratish({
          type: faoliyat.turi === "Vazifa" ? "TASK" : "CALL",
          partnerId,
          subject: faoliyat.sarlavha,
          description: faoliyat.matn || undefined,
          dueAt: faoliyat.sana ?? new Date().toISOString(),
          assigneeId,
        });
        setSaqlanganFaoliyatlar((joriy) => [crmActivityniFaoliyatga(activity), ...joriy]);
        return true;
      }
    } catch (error) {
      setCrmXatolik(getApiErrorMessage(error));
      return false;
    }
    return false;
  }

  async function faoliyatniYangilash(id: string, malumot: Partial<SaqlanganFaoliyat>) {
    try {
      const joriyFaoliyat = saqlanganFaoliyatlar.find((faoliyat) => faoliyat.id === id);
      if (partnerId && joriyFaoliyat?.turi === "Izoh" && malumot.matn !== undefined) {
        const comment = await crmApi.commentYangilash(id, malumot.matn);
        setSaqlanganFaoliyatlar((joriy) =>
          joriy.map((faoliyat) => (faoliyat.id === id ? crmCommentniFaoliyatga(comment) : faoliyat))
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
            joriy.map((faoliyat) => (faoliyat.id === id ? crmActivityniFaoliyatga(activity) : faoliyat))
          );
          return;
        }
        const activity = await crmApi.activityYangilash(id, data);
        setSaqlanganFaoliyatlar((joriy) =>
          joriy.map((faoliyat) => (faoliyat.id === id ? crmActivityniFaoliyatga(activity) : faoliyat))
        );
        return;
      }

      setCrmXatolik("Bu yozuv turi uchun backend tahrirlash endpointi mavjud emas.");
    } catch (error) {
      setCrmXatolik(getApiErrorMessage(error));
    }
  }

  async function faoliyatniOchirish(id: string) {
    try {
      const joriyFaoliyat = saqlanganFaoliyatlar.find((faoliyat) => faoliyat.id === id);
      if (joriyFaoliyat?.turi === "Xabar") {
        setCrmXatolik("Yuborilgan xabarni o‘chirish endpointi backendda mavjud emas.");
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
          joriy.map((item) => (item.id === faoliyat.id ? crmCommentniFaoliyatga(comment) : item))
        );
        return;
      }
      await faoliyatniYangilash(faoliyat.id, { pinned: !faoliyat.pinned });
    } catch (error) {
      setCrmXatolik(getApiErrorMessage(error));
    }
  }

  return (
    <div className="grid gap-8 px-9 py-9 xl:grid-cols-[43%_36px_minmax(0,1fr)] 2xl:grid-cols-[41%_38px_minmax(0,1fr)]">
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
        />

        <section className="rounded-[24px] border border-orange-100/80 bg-white/92 p-5 shadow-[0_18px_46px_rgba(255,106,0,.08)] backdrop-blur">
          <CardTitle title="Qo'shimcha ma'lumotlar" action="o'zgartirish" />
          <Info label="Qaytarilgan savdo" value="Tanlanmagan" pill />
          <Info label="Mas'ul shaxs" value={masulNomi(sotuv)} />
          <Info label="Sana" value={sananiFormatlash(sotuv.createdAt)} />
          <Info label="Qo'shimcha izoh" value={sotuv.note || "Izoh yo'q"} />
        </section>
      </aside>

      <TimelineRail />

        <main className="space-y-6">
          {crmXatolik && (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
              {crmXatolik}
            </div>
          )}
          <FaoliyatPanel xodimlar={xodimlar} onSaqlash={faoliyatniSaqlash} />
        <Divider label="Bugun" />
        {crmYuklanmoqda && (
          <div className="flex h-24 items-center justify-center rounded-2xl bg-white/92 shadow-[0_18px_46px_rgba(255,106,0,.08)]">
            <LoaderCircle className="animate-spin text-orange-500" size={24} />
          </div>
        )}
        {hujjatlar.map((hujjat) => (
          <HujjatFeedCard
            key={hujjat.id}
            hujjat={hujjat}
            sotuv={sotuv}
            onOchish={() => onHujjatOchish(hujjat)}
          />
        ))}
        {[...saqlanganFaoliyatlar]
          .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)))
          .map((faoliyat) =>
          faoliyat.harakat === "Kalendariga qo'shish" || faoliyat.matn.includes("Kalendariga qo'shish") ? (
            <CalendarFeedCard
              key={faoliyat.id}
              faoliyat={faoliyat}
              xodimlar={xodimlar}
              onOchirish={faoliyatniOchirish}
              onYangilash={faoliyatniYangilash}
              onZakrepit={() => void faoliyatniZakrepitQilish(faoliyat)}
            />
          ) : (
              <FeedCard
                key={faoliyat.id}
                title={faoliyat.turi}
                time={qisqaVaqt(faoliyat.sana)}
                text={`${faoliyat.sarlavha}${faoliyat.matn ? ` — ${faoliyat.matn}` : ""}`}
                onOchirish={faoliyat.turi === "Xabar" ? undefined : () => faoliyatniOchirish(faoliyat.id)}
              />
            )
          )}
        <FeedCard title="Hisoblash rejimi o'zgartirildi" time={vaqt} text={`Tovarlar narxiga asoslanib → ${pulniFormatlash(jami)}`} />
        <FeedCard title="Sotuv yaratildi" time={vaqt} text={`${mijozNomi(sotuv)} uchun ${sotuvRaqami(sotuv)} sotuv yaratildi.`} />
        <ProductsCard sotuv={sotuv} />
      </main>
    </div>
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
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [tanlanganBolim, setTanlanganBolim] = useState("To'lov va yetkazish");
  const tolanganSumma = sotuvTolanganSummasi(sotuv);
  const qarzdorlikSumma = sotuvQarzdorlikSummasi(sotuv);
  const ortiqchaTolovSumma = sotuvOrtiqchaTolovSummasi(sotuv);

  function bolimniTanlash(bolim: string) {
    setTanlanganBolim(bolim);
    setMenuOpen(false);
    if (bolim === "Yetkazish" || bolim === "To'lov va yetkazish") onYetkazish();
    if (bolim === "Ombordan chiqarish") onOmbordanChiqarish();
    if (bolim === "To'lov") onTolovOchish();
  }

  return (
    <section className="rounded-[24px] border border-orange-100/80 bg-white/92 p-5 shadow-[0_18px_46px_rgba(255,106,0,.08)] backdrop-blur">
      <CardTitle title="Kelishuv haqida" action="o'zgartirish" />
      <Info label="Bosqich" value={sotuvHolatiMatni[holat]} />

      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">Miqdor va valyuta</p>
          <h2 className="mt-1 text-4xl font-light tracking-wide text-slate-700">{pulniFormatlash(jami)}</h2>
        </div>
        {draft ? (
          <button
            disabled={amalBajarilmoqda}
            onClick={onTolovOchish}
            className="h-10 rounded-xl bg-[#FF6A00] px-4 text-xs font-black uppercase text-white shadow-[0_10px_24px_rgba(249,115,22,.22)] transition hover:bg-[#EA580C] disabled:opacity-50"
          >
            To'lovni qabul qilish
          </button>
        ) : (
          <span className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">{sotuvHolatiMatni[holat]}</span>
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-orange-100 bg-gradient-to-br from-[#FFF8EF] to-white p-4">
        <p className="text-sm text-slate-500">{tanlanganBolim}</p>
        <p className="mt-3 text-sm text-slate-400">Bu yerda to'lov, yetkazish va ombordan chiqarish ma'lumotlari ko'rsatiladi.</p>
        <div className="mt-4 border-t border-slate-100 pt-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="text-sm font-semibold text-[#FF6A00] transition hover:text-[#EA580C] hover:underline"
            >
              Qo'shish
            </button>
            {menuOpen && (
              <div className="absolute left-0 top-7 z-40 w-[238px] rounded-[22px] bg-white py-3 shadow-[0_18px_50px_rgba(92,38,8,.16)] ring-1 ring-orange-100">
                {bolimlar.map((bolim) => (
                  <button
                    key={bolim}
                    type="button"
                    onClick={() => bolimniTanlash(bolim)}
                    className="flex h-11 w-full items-center gap-3 px-5 text-left text-[15px] text-slate-700 transition hover:bg-orange-50 hover:text-[#FF6A00]"
                  >
                    {bolim === "Ombordan chiqarish" && <Package size={15} className="text-sky-500" />}
                    <span>{bolim}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {(sotuv.payments ?? []).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {sotuv.payments?.map((tolov, index) => (
                <span key={tolov.id ?? `${tolov.paymentType}-${index}`} className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-[#FF6A00]">
                  {tolovTuriMatni[tolov.paymentType]}: {pulniFormatlash(tolov.amount)}
                </span>
              ))}
            </div>
          )}
          <div className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Sotuv jami</span>
              <span>{pulniFormatlash(jami)}</span>
            </div>
            <div className="flex justify-between text-[#FF6A00]">
              <span>Qabul qilingan to'lov</span>
              <span className="font-bold">{pulniFormatlash(tolanganSumma)}</span>
            </div>
            <div className={`flex justify-between ${qarzdorlikSumma > 0 ? "text-red-500" : "text-emerald-600"}`}>
              <span>{qarzdorlikSumma > 0 ? "Qarzdorlik qoldig'i" : "Qarzdorlik yo'q"}</span>
              <span className="font-bold">{pulniFormatlash(qarzdorlikSumma)}</span>
            </div>
            {ortiqchaTolovSumma > 0 && (
              <div className="flex justify-between text-amber-600">
                <span>Ortiqcha to'lov / qaytim</span>
                <span className="font-bold">{pulniFormatlash(ortiqchaTolovSumma)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <Info label="Mijoz" value={modalMijozNomi(sotuv)} />
      <Info label="Telefon" value={mijozTelefon(sotuv)} />
      <Info label="Manzil" value={mijozManzili(sotuv)} />
      <Info label="Mas'ul shaxs" value={masulNomi(sotuv)} />
      <div className="mt-5 flex flex-wrap justify-between gap-3 text-xs text-slate-500">
        <span>Maydonni tanlang</span>
        <span>Maydon yarating</span>
        {draft && (
          <button disabled={amalBajarilmoqda} onClick={() => onBekorQilish(sotuv.id)} className="text-red-500 disabled:opacity-50">
            Sotuvni bekor qilish
          </button>
        )}
      </div>
    </section>
  );
}

const tolovTuriOptions: Array<{ value: TolovTuri; label: string }> = [
  { value: "CASH", label: "Naqd" },
  { value: "CARD", label: "Karta" },
  { value: "BANK", label: "Bank o'tkazmasi" },
];

function TolovQabulQilishModal({
  sotuv,
  jami,
  draft,
  amalBajarilmoqda,
  onYangilash,
  onTolovQoshish,
  onTasdiqlash,
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
    tolov: Pick<SotuvTolovi, "paymentType" | "amount">
  ) => Promise<boolean>;
  onTasdiqlash: (sotuvId: string) => Promise<void> | void;
  onYopish: () => void;
}) {
  const mavjudTolovlar = sotuv.payments ?? [];
  const mavjudYigindisi = mavjudTolovlar.reduce((jami2, tolov) => jami2 + Number(tolov.amount ?? 0), 0);
  const boshlangichQarz = Math.max(jami - mavjudYigindisi, 0);

  const [tolovTuri, setTolovTuri] = useState<TolovTuri>("CASH");
  const [summa, setSumma] = useState(
    !draft || mavjudYigindisi > 0 ? String(boshlangichQarz) : "0"
  );
  const [xatolik, setXatolik] = useState("");

  const yangiSumma = Number(summa) || 0;
  const yakuniyTolangan = mavjudYigindisi + yangiSumma;
  const qolganQarz = Math.max(jami - yakuniyTolangan, 0);

  async function submit() {
    setXatolik("");

    if (yangiSumma < 0 || (!draft && yangiSumma <= 0)) {
      setXatolik(draft ? "To'lov summasi manfiy bo'lishi mumkin emas." : "To'lov summasi 0 dan katta bo'lishi kerak.");
      return;
    }

    if (yakuniyTolangan > jami) {
      setXatolik(`To'lov summasi qarzdorlikdan oshmasligi kerak. Maksimal: ${pulniFormatlash(boshlangichQarz)}.`);
      return;
    }

    if (!draft) {
      const saqlandi = await onTolovQoshish(sotuv.id, {
        paymentType: tolovTuri,
        amount: yangiSumma,
      });
      if (!saqlandi) {
        setXatolik("To'lov saqlanmadi. Qaytadan urinib ko'ring.");
        return;
      }
      onYopish();
      return;
    }

    const yangiTolovlar = [
      ...mavjudTolovlar.map((tolov) => ({ paymentType: tolov.paymentType, amount: Number(tolov.amount ?? 0) })),
      ...(yangiSumma > 0 ? [{ paymentType: tolovTuri, amount: yangiSumma }] : []),
    ];

    const saqlandi = await onYangilash(sotuv.id, { payments: yangiTolovlar });
    if (!saqlandi) {
      setXatolik("To'lov saqlanmadi. Qaytadan urinib ko'ring.");
      return;
    }

    await onTasdiqlash(sotuv.id);
  }

  return (
    <AppModal>
      <div className="w-full max-w-lg rounded-[28px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#FF6A00]">To'lov</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">To'lovni qabul qilish</h2>
          </div>
          <button
            type="button"
            onClick={onYopish}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition hover:bg-orange-500 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 space-y-4">
            {mavjudTolovlar.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {mavjudTolovlar.map((tolov, index) => (
                  <span
                    key={tolov.id ?? `${tolov.paymentType}-${index}`}
                    className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-[#FF6A00]"
                  >
                    {tolovTuriMatni[tolov.paymentType]}: {pulniFormatlash(tolov.amount)}
                  </span>
                ))}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-400">To'lov turi</span>
                <SavdoSelect
                  value={tolovTuri}
                  onChange={(value) => setTolovTuri(value as TolovTuri)}
                  options={tolovTuriOptions}
                  buttonClassName="h-11 rounded-xl px-3.5 text-sm"
                  portal
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-400">To'lov summasi</span>
                <input
                  type="number"
                  min="0"
                  max={boshlangichQarz || undefined}
                  value={summa}
                  onChange={(event) => setSumma(event.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
                  placeholder="0"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSumma(String(boshlangichQarz))}
                className="rounded-xl bg-orange-50 px-3 py-2 text-xs font-bold text-[#FF6A00] transition hover:bg-orange-100"
              >
                To'liq to'lash ({pulniFormatlash(boshlangichQarz)})
              </button>
              <button
                type="button"
                onClick={() => setSumma("0")}
                className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-500 transition hover:bg-gray-200"
              >
                Qarzga qoldirish
              </button>
            </div>

            <div className="space-y-2 rounded-2xl bg-slate-50 p-4 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Sotuv jami</span>
                <span>{pulniFormatlash(jami)}</span>
              </div>
              <div className="flex justify-between text-[#FF6A00]">
                <span>Jami to'lov (avvalgi + yangi)</span>
                <span className="font-bold">{pulniFormatlash(yakuniyTolangan)}</span>
              </div>
              <div className={`flex justify-between ${qolganQarz > 0 ? "text-red-500" : "text-emerald-600"}`}>
                <span>{qolganQarz > 0 ? "Qarzdorlik qoldig'i" : "Qarzdorlik yo'q"}</span>
                <span className="font-bold">{pulniFormatlash(qolganQarz)}</span>
              </div>
            </div>

            {xatolik && (
              <div className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-600">{xatolik}</div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onYopish}
                className="h-11 rounded-2xl bg-gray-100 px-5 text-sm font-bold text-gray-600"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                disabled={amalBajarilmoqda}
                onClick={() => void submit()}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#FF6A00] px-6 text-sm font-black text-white shadow-[0_10px_24px_rgba(249,115,22,.24)] transition hover:bg-[#EA580C] disabled:opacity-50"
              >
                {amalBajarilmoqda && <LoaderCircle size={16} className="animate-spin" />}
                {draft ? "Tasdiqlash va yakunlash" : "To'lovni qo'shish"}
              </button>
            </div>
        </div>
      </div>
    </AppModal>
  );
}

function HisobFakturalarTab({ sotuv }: { sotuv: Sotuv }) {
  const [sahifaHajmi, setSahifaHajmi] = useState("10");
  const sotuvId = sotuvJadvalId(sotuv);
  const invoiceNomi = mijozNomi(sotuv);
  const masul = masulNomi(sotuv);
  const yaratilganSana = sotuv.createdAt ? new Date(sotuv.createdAt) : new Date();
  const muddatSana = new Date(yaratilganSana);
  muddatSana.setDate(muddatSana.getDate() + 7);
  const sanaFormat = (sana: Date) =>
    Number.isNaN(sana.getTime())
      ? "—"
      : new Intl.DateTimeFormat("uz-UZ", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(sana);
  const qatorKorinadi = true;

  return (
    <div
      className="rounded-[26px] bg-[#EEF3F6] px-8 py-8"
      onWheel={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
    >
      <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_18px_55px_rgba(15,23,42,.07)] ring-1 ring-slate-100">
        <div>
          <table className="w-full table-fixed text-left text-[13px] text-slate-600">
            <thead className="border-b border-slate-100 bg-slate-50/60 text-slate-500">
              <tr>
                <th className="w-10 px-3 py-4">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300" readOnly />
                </th>
                <th className="w-9 px-2 py-4">
                  <Settings size={16} className="text-slate-400" />
                </th>
                <th className="w-12 px-3 py-4 font-medium">ID</th>
                <th className="w-[12%] px-3 py-4 font-medium">Nomi</th>
                <th className="w-[12%] px-3 py-4 font-medium">Hisob raqami</th>
                <th className="w-[18%] px-3 py-4 font-medium">Kim yaratgan</th>
                <th className="w-[18%] px-3 py-4 font-medium">Mas'ul</th>
                <th className="w-[12%] px-3 py-4 font-medium">Berilgan sana</th>
                <th className="w-[12%] px-3 py-4 font-medium">To'lov muddati</th>
                <th className="w-[12%] px-3 py-4 font-medium">Bosqich</th>
              </tr>
            </thead>
            <tbody>
              {qatorKorinadi ? (
                <tr className="border-b border-slate-100 transition hover:bg-slate-50">
                  <td className="px-3 py-5">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300" readOnly />
                  </td>
                  <td className="px-2 py-5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400">
                      <MoreHorizontal size={18} />
                    </div>
                  </td>
                  <td className="px-3 py-5 font-medium text-slate-700">1</td>
                  <td className="truncate px-3 py-5 font-medium text-blue-600">{invoiceNomi}</td>
                  <td className="truncate px-3 py-5">{sotuvId}</td>
                  <td className="px-3 py-5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-400 text-white">
                        <UserRound size={15} />
                      </span>
                      <span>{masul === "вЂ”" ? "Kiritilmagan" : masul}</span>
                    </div>
                  </td>
                  <td className="px-3 py-5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-400 text-white">
                        <UserRound size={15} />
                      </span>
                      <span>{masul === "вЂ”" ? "Kiritilmagan" : masul}</span>
                    </div>
                  </td>
                  <td className="px-3 py-5">{sanaFormat(yaratilganSana)}</td>
                  <td className="px-3 py-5">{sanaFormat(muddatSana)}</td>
                  <td className="px-3 py-5">
                    <div className="h-2 w-full max-w-24 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full w-2/3 rounded-full bg-sky-400" />
                    </div>
                    <p className="mt-2 text-xs text-slate-400">Yangi</p>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-slate-400">
                    Qidiruv bo'yicha hisob-faktura topilmadi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 px-5 py-4 text-xs font-semibold uppercase text-slate-500">
          <span>Tanlangan: 0 / 1</span>
          <span>Jami: 1 ta hisob</span>
          <div className="flex items-center gap-2">
            <span>Sahifada:</span>
            <SavdoSelect
              value={sahifaHajmi}
              onChange={setSahifaHajmi}
              className="w-24 normal-case"
              buttonClassName="h-10 rounded-xl px-3 text-sm"
              dropdownClassName="z-[95]"
              options={[
                { value: "10", label: "10" },
                { value: "20", label: "20" },
                { value: "50", label: "50" },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

type TarixQatori = {
  id: string;
  sana: string;
  avtor: string;
  tip: string;
  tavsif: string;
  accent?: "green" | "blue" | "orange";
};

function TarixTab({ sotuv }: { sotuv: Sotuv }) {
  const [filter, setFilter] = useState("");
  const [sanaTartibi, setSanaTartibi] = useState<"desc" | "asc">("desc");
  const [backendTarix,setBackendTarix]=useState<SaleAuditLog[]>([]);
  const [tarixYuklanmoqda,setTarixYuklanmoqda]=useState(true);
  const [tarixXatosi,setTarixXatosi]=useState("");

  useEffect(() => {
    let active=true;setTarixYuklanmoqda(true);setTarixXatosi("");
    void sotuvTarixiniOlish(sotuv.id).then(data=>{if(active)setBackendTarix(data)}).catch(error=>{if(active)setTarixXatosi(getApiErrorMessage(error))}).finally(()=>{if(active)setTarixYuklanmoqda(false)});
    return()=>{active=false};
  }, [sotuv.id]);
  const qatorlar:TarixQatori[]=backendTarix.map((item):TarixQatori=>{const before=item.diff?.before??{},after=item.diff?.after??{};const oldStatus=before.status,newStatus=after.status;return{id:item.id,sana:item.createdAt,avtor:item.actor?.fullName||item.actor?.username||item.user?.fullName||item.user?.username||"Tizim",tip:item.action==="CREATE"?"Sotuv yaratildi":item.action==="DELETE"?"Sotuv o'chirildi":"Sotuv yangilandi",tavsif:oldStatus!==newStatus&&newStatus?`Holat: ${String(oldStatus??"—")} → ${String(newStatus)}`:`O'zgarish: ${JSON.stringify(item.diff??{})}`,accent:item.action==="CREATE"?"blue":"orange"}}).sort((a, b) => {
    const aVaqt = new Date(a.sana).getTime();
    const bVaqt = new Date(b.sana).getTime();
    return sanaTartibi === "desc" ? bVaqt - aVaqt : aVaqt - bVaqt;
  });

  const qidiruv = filter.trim().toLowerCase();
  const korinadiganQatorlar = qidiruv
    ? qatorlar.filter((qator) =>
        [qator.avtor, qator.tip, qator.tavsif, tarixVaqti(qator.sana)]
          .join(" ")
          .toLowerCase()
          .includes(qidiruv)
      )
    : qatorlar;

  return (
    <div className="px-9 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Sotuv tarixi</h2>
          <p className="mt-1 text-sm text-slate-500">
            Sotuv bo'yicha mahsulotlar, to'lovlar, hujjatlar va bajarilgan ishlar shu yerda jamlanadi.
          </p>
        </div>
        <label className="relative block w-full max-w-[360px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filtr"
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-medium text-slate-700 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
          />
        </label>
      </div>

      <section className="overflow-hidden rounded-[24px] bg-white shadow-[0_18px_55px_rgba(15,23,42,.07)] ring-1 ring-slate-100">
        <div className="grid grid-cols-[58px_190px_1.1fr_1.4fr_2fr] border-b border-slate-100 bg-slate-50 text-sm font-semibold text-slate-600">
          <div className="flex h-14 items-center justify-center">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300" readOnly />
          </div>
          <button
            type="button"
            onClick={() => setSanaTartibi((joriy) => (joriy === "desc" ? "asc" : "desc"))}
            className="flex h-14 items-center gap-2 text-left transition hover:text-sky-600"
            title={sanaTartibi === "desc" ? "Eski sanadan yangisiga tartiblash" : "Yangi sanadan eskisiga tartiblash"}
            aria-label="Sana bo'yicha tartiblash"
          >
            Sana
            <ChevronDown size={15} className={`transition ${sanaTartibi === "asc" ? "rotate-180" : ""}`} />
          </button>
          <div className="flex h-14 items-center">Avtor</div>
          <div className="flex h-14 items-center">Tip hodisa</div>
          <div className="flex h-14 items-center">Tavsif</div>
        </div>

        <div className="divide-y divide-slate-100">
          {korinadiganQatorlar.map((qator) => (
            <div
              key={qator.id}
              className="grid min-h-[60px] grid-cols-[58px_190px_1.1fr_1.4fr_2fr] items-center text-sm transition hover:bg-slate-50"
            >
              <div className="flex items-center justify-center">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300" readOnly />
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <span>{tarixVaqti(qator.sana)}</span>
              </div>
              <div className="flex min-w-0 items-center gap-3 text-slate-700">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-400 text-xs text-white">
                  <UserRound size={15} />
                </span>
                <span className="truncate">{qator.avtor}</span>
              </div>
              <div
                className={`font-medium ${
                  qator.accent === "green"
                    ? "text-green-700"
                    : qator.accent === "orange"
                      ? "text-orange-600"
                      : "text-slate-700"
                }`}
              >
                {qator.tip}
              </div>
              <div className="min-w-0 pr-5 text-slate-700">
                <span className="line-clamp-2">{qator.tavsif}</span>
              </div>
            </div>
          ))}

          {tarixYuklanmoqda && <div className="flex h-48 items-center justify-center"><LoaderCircle className="animate-spin text-orange-500"/></div>}
          {tarixXatosi && <div className="p-6 text-center text-sm font-semibold text-red-600">{tarixXatosi}</div>}
          {!tarixYuklanmoqda && !tarixXatosi && korinadiganQatorlar.length === 0 && (
            <div className="flex h-48 items-center justify-center text-sm font-medium text-slate-400">
              Tarix bo'yicha ma'lumot topilmadi
            </div>
          )}
        </div>
      </section>
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
  const items = sotuv.items ?? [];
  const backendJami = sotuvSummasi(sotuv);
  const qatorlarJami = items.reduce((summa, item) => summa + mahsulotJami(item), 0);
  const jami = items.length > 0 ? qatorlarJami : backendJami;
  const tasdiqlangan = sotuvHolati(sotuv) === "CONFIRMED";
  const omborNomi = sotuv.warehouse?.name || "Ombor";
  const omborManzili = sotuv.warehouse?.address || "Manzil kiritilmagan";
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
    yangiQatorniYangilash(qatorId, {
      modificationId: qoldiq.modificationId,
      price: qoldiqNarxi(qoldiq),
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
      mahsulot: !qator.modificationId ? "Mahsulotni tanlang." : "",
      narx: qator.price <= 0 ? "Narx 0 dan katta bo'lishi kerak." : "",
      miqdor:
        qator.quantity <= 0
          ? "Miqdor 0 dan katta bo'lishi kerak."
          : qator.availableQty > 0 && qator.quantity > qator.availableQty
            ? `Miqdor qoldiqdan oshmasin: ${formatlanganRaqam(qator.availableQty)} dona.`
            : "",
      ombor: !qator.warehouseName ? "Omborni tanlang." : "",
    };
  }

  function qatorValid(qator: YangiTovarQatori) {
    const xatolar = yangiQatorXatolari(qator);
    return !xatolar.mahsulot && !xatolar.narx && !xatolar.miqdor && !xatolar.ombor;
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
          quantity: son(item.quantity),
          price: son(item.price),
          discount: son(item.discount),
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
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20"
          >
            Mahsulot qo'shish
          </button>
        </div>
        <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm transition hover:text-blue-600">
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
            Saqlash
          </button>
        )}
      </div>

      <section className="rounded-2xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[1870px]">
            <div className={`grid ${jadvalUstunlari} gap-x-5 border-b border-slate-200 bg-white px-7 py-5 text-sm text-slate-600`}>
              <span>Sozlama</span>
              <span>Mahsulot</span>
              <span>Narx</span>
              <span>Miqdor</span>
              <span>Ombor</span>
              <span>Mavjud qoldiq</span>
              <span>Rezervda</span>
              <span>Ombordan chiqdi</span>
              <span>Summa</span>
            </div>

            {items.map((item, index) => {
              const itemJami = mahsulotJami(item);
              const itemNarxi = item.price;
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
                      <span className="min-w-0 flex-1 truncate text-slate-800">{mahsulotNomi(item)}</span>
                      <ChevronDown size={18} className="-rotate-90 text-slate-400" />
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-sky-300 text-slate-400">
                      <ImageIcon size={19} />
                    </div>
                  </div>

                  <div className="flex h-12 items-center justify-end rounded-md border border-slate-300 bg-white px-3">
                    {pulniFormatlash(itemNarxi)}
                  </div>

                  <div className="flex h-12 items-center justify-end gap-2 rounded-md border border-slate-300 bg-white px-3">
                    <span>{item.quantity}</span>
                    <span className="text-slate-400">dona</span>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => omborPopupOchish(omborKey, event.currentTarget, mavjudQoldiq, itemOmborNomi, itemOmborManzili)}
                    className="flex h-12 w-full items-center gap-3 rounded-md border border-slate-300 bg-white px-3 text-left transition hover:border-blue-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                  >
                    <span className="min-w-0 flex-1 truncate">{itemOmborNomi}</span>
                    <Search size={18} className="text-slate-500" />
                  </button>

                  <span className="text-blue-600 underline underline-offset-4">{Math.max(mavjudQoldiq, 0)} dona</span>

                  <div>
                    <div className="flex h-12 items-center justify-end rounded-md border border-slate-300 bg-white px-3">{rezerv}</div>
                    {!tasdiqlangan && <span className="mt-1 block text-right text-xs text-blue-600 underline underline-offset-4">qoralama</span>}
                  </div>

                  <span>{ombordanChiqdi} dona</span>
                  <span className="font-bold text-emerald-600">{pulniFormatlash(itemJami)}</span>
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
                  className={`grid ${jadvalUstunlari} items-start gap-x-5 border-b border-blue-100 bg-blue-50/30 px-7 py-4 text-sm text-slate-700`}
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
                        className={`flex h-12 min-w-0 flex-1 items-center rounded-md border bg-white px-3 text-left transition hover:border-blue-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 ${
                          xatoKorsatish && xatolar.mahsulot ? "border-red-400 ring-4 ring-red-100" : "border-slate-300"
                        }`}
                      >
                        <span className={`min-w-0 flex-1 truncate ${qatorNomi ? "text-slate-800" : "text-slate-400"}`}>
                          {qatorNomi || "Mahsulotni toping yoki yangi yarating"}
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
                      onChange={(event) => yangiQatorniYangilash(qator.id, { price: raqamniAjratish(event.target.value) })}
                      onFocus={(event) => event.currentTarget.select()}
                      placeholder="0 so'm"
                      className={`h-12 w-full rounded-md border bg-white px-3 text-right outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 ${
                        xatoKorsatish && xatolar.narx ? "border-red-400 ring-4 ring-red-100" : "border-slate-300"
                      }`}
                    />
                    {xatoKorsatish && xatolar.narx && (
                      <p className="mt-1.5 text-xs font-semibold text-red-500">{xatolar.narx}</p>
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
                      <span className="text-slate-400">dona</span>
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
                      className={`flex h-12 w-full items-center gap-3 rounded-md border bg-white px-3 text-left transition hover:border-blue-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 ${
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

                  <span className="text-blue-600 underline underline-offset-4">{Math.max(qator.availableQty, 0)} dona</span>
                  <div className="flex h-12 items-center justify-end rounded-md border border-slate-300 bg-white px-3">0</div>
                  <span>0 dona</span>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-emerald-600">{pulniFormatlash(qatorJami)}</span>
                    <button
                      type="button"
                      onClick={() => setYangiQatorlar((rows) => rows.filter((row) => row.id !== qator.id))}
                      className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-500 transition hover:bg-red-100"
                    >
                      O'chirish
                    </button>
                  </div>
                </div>
              );
            })}

            {items.length === 0 && yangiQatorlar.length === 0 && (
              <div className="px-7 py-20 text-center text-slate-400">Bu sotuvda mahsulot mavjud emas</div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 px-7 py-8">
          <div className="ml-auto max-w-md space-y-4 text-right text-slate-600">
            <p>Chegirma va soliqlarsiz summa: <span className="ml-8">{pulniFormatlash(umumiyJami)}</span></p>
            <p>Yetkazish summasi: <span className="ml-8">{pulniFormatlash(0)}</span></p>
            <p className="text-lime-700">Chegirma summasi: <span className="ml-8">{pulniFormatlash(0)}</span></p>
            <p>Soliqsiz summa: <span className="ml-8">{pulniFormatlash(umumiyJami)}</span></p>
            <p>Soliq summasi: <span className="ml-8">{pulniFormatlash(0)}</span></p>
            <div className="border-t border-slate-200 pt-5 text-2xl font-bold text-slate-700">
              Umumiy summa: <span className="ml-8">{pulniFormatlash(umumiyJami)}</span>
            </div>
          </div>
        </div>
      </section>

      {mahsulotPopover && (
        <>
          <button
            type="button"
            aria-label="Mahsulot oynasini yopish"
            className="fixed inset-0 z-[100000] cursor-default bg-transparent"
            onClick={() => setMahsulotPopover(null)}
          />
          <div
            className="fixed z-[100001] w-[690px] rounded-2xl bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,0.2)] ring-1 ring-slate-100"
            style={{ left: mahsulotPopover.left, top: mahsulotPopover.top }}
          >
            <label className="mb-3 flex h-12 items-center gap-2 rounded-xl border border-blue-400 bg-white px-4 ring-4 ring-blue-500/10">
              <input
                value={mahsulotQidiruv}
                onChange={(event) => setMahsulotQidiruv(event.target.value)}
                placeholder="Mahsulotni toping yoki yangi yarating"
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
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-blue-50"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                        <Package size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold text-slate-800">
                          {nom} <span className="font-normal text-slate-400">{miqdor} dona</span>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-400">
                          {qoldiq.warehouse?.name || omborNomi}
                          {qoldiqTavsifi(qoldiq) ? ` · ${qoldiqTavsifi(qoldiq)}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-bold text-slate-700">{pulniFormatlash(narx)}</span>
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-10 text-center text-sm text-slate-400">Ombor qoldig'ida mahsulot topilmadi</div>
              )}
            </div>
          </div>
        </>
      )}

      {omborPopover && (
        <>
          <button
            type="button"
            aria-label="Ombor oynasini yopish"
            className="fixed inset-0 z-[100000] cursor-default bg-transparent"
            onClick={() => setOmborPopover(null)}
          />
          <div
            className="fixed z-[100001] w-[360px] rounded-2xl bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.18)] ring-1 ring-slate-100"
            style={{ left: omborPopover.left, top: omborPopover.top }}
          >
            <label className="mb-2 flex h-11 items-center gap-2 rounded-xl border border-blue-400 bg-white px-3 ring-4 ring-blue-500/10">
              <input
                value={skladQidiruv}
                onChange={(event) => setSkladQidiruv(event.target.value)}
                placeholder="Ombor"
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
              className="flex w-full items-center gap-3 rounded-xl bg-blue-50 px-3 py-3 text-left transition hover:bg-blue-100"
              title={omborPopover.title}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                <Package size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-slate-800">
                  {omborPopover.title} <span className="font-normal text-slate-400">{omborPopover.quantity} dona</span>
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
  const items = sotuv.items ?? [];
  const jami = sotuvSummasi(sotuv);
  const tasdiqlangan = sotuvHolati(sotuv) === "CONFIRMED";
  const omborNomi = sotuv.warehouse?.name || "Ombor";
  const omborManzili = sotuv.warehouse?.address || "Manzil kiritilmagan";
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
          <button className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700">
            Mahsulot qo'shish
          </button>
          <button className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-600 shadow-sm transition hover:text-blue-600">
            Mahsulot tanlash
          </button>
        </div>
        <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm transition hover:text-blue-600">
          <MoreHorizontal size={20} />
        </button>
      </div>

      <section className="rounded-2xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[1380px]">
            <div className="grid grid-cols-[70px_420px_170px_190px_240px_180px_220px_170px_180px] gap-x-4 border-b border-slate-200 bg-white px-7 py-5 text-sm text-slate-600">
              <span>⚙</span>
              <span>Mahsulot</span>
              <span>Narx</span>
              <span>Miqdor</span>
              <span>Ombor</span>
              <span>Mavjud qoldiq</span>
              <span>Rezervda</span>
              <span>Ombordan chiqdi</span>
              <span>Summa</span>
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
                      <span className="min-w-0 flex-1 truncate text-slate-800">{mahsulotNomi(item)}</span>
                      <ChevronDown size={18} className="-rotate-90 text-slate-400" />
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-sky-300 text-slate-400">
                      <ImageIcon size={19} />
                    </div>
                  </div>

                  <div className="flex h-12 items-center justify-end rounded-md border border-slate-300 bg-white px-3">
                    {pulniFormatlash(item.price)}
                  </div>

                  <div className="flex h-12 items-center justify-end gap-2 rounded-md border border-slate-300 bg-white px-3">
                    <span>{item.quantity}</span>
                    <span className="text-slate-400">dona</span>
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
                      omborOchilgan ? "border-blue-400 ring-4 ring-blue-500/10" : "border-slate-300 hover:border-blue-300"
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate">{omborNomi}</span>
                    <Search size={18} className="text-slate-500" />
                  </button>

                  <a className="text-blue-600 underline underline-offset-4" href="#">
                    {Math.max(son(item.quantity), 0)} dona
                  </a>

                  <div>
                    <div className="flex h-12 items-center justify-end rounded-md border border-slate-300 bg-white px-3">
                      {rezerv}
                    </div>
                    {!tasdiqlangan && (
                      <a className="mt-1 block text-right text-xs text-blue-600 underline underline-offset-4" href="#">
                        qoralama
                      </a>
                    )}
                  </div>

                  <span>{ombordanChiqdi} dona</span>
                  <span className="font-bold text-emerald-600">{pulniFormatlash(itemJami)}</span>
                </div>
              );
            })}

            {items.length === 0 && (
              <div className="px-7 py-20 text-center text-slate-400">
                Bu sotuvda mahsulot mavjud emas
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 px-7 py-8">
          <div className="ml-auto max-w-md space-y-4 text-right text-slate-600">
            <p>Chegirma va soliqlarsiz summa: <span className="ml-8">{pulniFormatlash(jami)}</span></p>
            <p>Yetkazish summasi: <span className="ml-8">{pulniFormatlash(0)}</span></p>
            <p className="text-lime-700">Chegirma summasi: <span className="ml-8">{pulniFormatlash(0)}</span></p>
            <p>Soliqsiz summa: <span className="ml-8">{pulniFormatlash(jami)}</span></p>
            <p>Soliq summasi: <span className="ml-8">{pulniFormatlash(0)}</span></p>
            <div className="border-t border-slate-200 pt-5 text-2xl font-bold text-slate-700">
              Umumiy summa: <span className="ml-8">{pulniFormatlash(jami)}</span>
            </div>
          </div>
        </div>
      </section>

      {omborPopover && (
        <>
          <button
            type="button"
            aria-label="Ombor oynasini yopish"
            className="fixed inset-0 z-[100000] cursor-default bg-transparent"
            onClick={() => setOmborPopover(null)}
          />
          <div
            className="fixed z-[100001] w-[360px] rounded-2xl bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.18)] ring-1 ring-slate-100"
            style={{ left: omborPopover.left, top: omborPopover.top }}
          >
            <label className="mb-2 flex h-11 items-center gap-2 rounded-xl border border-blue-400 bg-white px-3 ring-4 ring-blue-500/10">
              <input
                value={skladQidiruv}
                onChange={(event) => setSkladQidiruv(event.target.value)}
                placeholder="Ombor"
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
                  className="flex w-full items-center gap-3 rounded-xl bg-blue-50 px-3 py-3 text-left transition hover:bg-blue-100"
                  title={omborNomi}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                    <Package size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-slate-800">
                      {omborNomi} <span className="font-normal text-slate-400">{omborPopover.quantity} dona</span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-400">{omborManzili}</span>
                  </span>
                </button>
              ) : (
                <div className="px-3 py-8 text-center text-sm text-slate-400">
                  Bu sotuvga biriktirilgan ombor topilmadi
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

function crmXabarniFaoliyatga(message: ChatMessage): SaqlanganFaoliyat {
  return {
    id: message.id ?? `chat-${message.createdAt ?? "unknown"}`,
    turi: "Xabar",
    sarlavha: message.direction === "IN" ? "Mijozdan xabar" : "Xabar yuborildi",
    matn: message.text ?? "",
    sana: message.createdAt ?? new Date().toISOString(),
  };
}

function YetkazishPanel({ sotuv, jami, onClose }: { sotuv: Sotuv; jami: number; onClose: () => void }) {
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
        aria-label="Yetkazish oynasini yopish"
      >
        <X size={20} />
      </button>
      <div className="scrollbar-hidden ml-[338px] h-full overflow-y-auto rounded-l-3xl bg-[#eef3f6] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-3xl font-semibold text-slate-900">Tovarlarni yetkazib berishni tashkil qilish</h2>
          <div className="flex gap-3">
            <button className="rounded-lg bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">Buyurtmani sozlash</button>
            <button className="rounded-lg bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">Fikr-mulohaza</button>
          </div>
        </div>

        <div className="mt-8 grid gap-7 lg:grid-cols-[270px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <span className="inline-flex rounded-full bg-slate-500 px-4 py-1.5 text-sm font-bold text-white">Yetkazish</span>
            <div className="h-px bg-slate-300" />
            {["Kompaniya aloqalarini taqdim etish", "Skript taklif qilish", "Qanday ishlaydi", "Buyurtmani sozlash"].map((item) => (
              <button key={item} className="block text-left text-sm text-slate-500 hover:text-sky-600">
                {item}
              </button>
            ))}
          </aside>

          <main className="space-y-3">
            <Qadam number={1} active title="Tovarlar">
              <div className="mt-6 flex items-center gap-6 text-sm">
                <button className="text-blue-600 underline underline-offset-4">Qo'shish</button>
                <button className="text-slate-500">Katalogdan tanlash</button>
              </div>
              <div className="mt-8 space-y-4">
                {items.length > 0 ? (
                  items.map((item, index) => (
                    <div key={item.id ?? `${item.modificationId}-${index}`} className="grid gap-5 lg:grid-cols-[1fr_84px_120px_90px_120px]">
                      <label className="text-sm text-slate-600">
                        Mahsulot
                        <div className="mt-2 flex h-12 items-center rounded-md border border-slate-300 bg-white px-3">
                          <span className="min-w-0 flex-1 truncate text-slate-600">{mahsulotNomi(item)}</span>
                          <Search size={19} className="text-slate-500" />
                        </div>
                      </label>
                      <div className="mt-7 flex h-12 items-center justify-center rounded-md border border-dashed border-slate-300 text-slate-400">
                        <ImageIcon size={20} />
                      </div>
                      <Maydon label="Narxi" value={pulniFormatlash(item.price)} />
                      <Maydon label="Miqdori" value={String(item.quantity)} />
                      <Maydon label="Natija" value={pulniFormatlash(mahsulotJami(item))} />
                    </div>
                  ))
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-400">Tovarlar mavjud emas</p>
                )}
              </div>
              <div className="mt-10 border-t border-slate-200 pt-8">
                <div className="ml-auto max-w-md space-y-4 text-right text-slate-600">
                  <p>Tovarlar summasi: <span className="ml-8">{pulniFormatlash(jami)}</span></p>
                  <p className="text-lime-700">Mijoz foydasi: <span className="ml-8">0 so'm</span></p>
                  <div className="border-t border-slate-200 pt-4 text-2xl font-bold">
                    Jami: <span className="ml-8">{pulniFormatlash(jami)}</span>
                  </div>
                </div>
              </div>
            </Qadam>

            <Qadam number={2} title="Yetkazish">
              {yuklanmoqda ? (
                <div className="mt-8 flex items-center gap-3 text-slate-500"><LoaderCircle className="animate-spin" size={20} /> Ma'lumot yuklanmoqda...</div>
              ) : (
                <div className="mt-6 max-w-3xl space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-500">
                      {yetkazish ? "Yetkazib berish ma'lumoti" : "Yetkazib berish ma'lumoti mavjud emas"}
                    </p>
                    {yetkazish && <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-600">{yetkazish.status}</span>}
                  </div>
                  {xato && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{xato}</p>}
                  <div className="grid gap-4 md:grid-cols-2">
                    {([
                      ["recipientName", "Qabul qiluvchi", "text"], ["recipientPhone", "Telefon", "tel"],
                      ["address", "Manzil", "text"], ["courierName", "Kuryer", "text"],
                      ["cost", "Yetkazish narxi", "number"], ["scheduledAt", "Rejalashtirilgan vaqt", "datetime-local"],
                    ] as const).map(([key, label, type]) => (
                      <label key={key} className="text-sm font-semibold text-slate-600">{label}
                        <input type={type} min={type === "number" ? 0 : undefined} value={forma[key]} onChange={(event) => setForma((old) => ({ ...old, [key]: event.target.value }))} disabled={yetkazish?.status === "DELIVERED" || yetkazish?.status === "CANCELLED"} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-orange-400 disabled:bg-slate-100" />
                      </label>
                    ))}
                  </div>
                  <label className="block text-sm font-semibold text-slate-600">Izoh
                    <textarea value={forma.note} onChange={(event) => setForma((old) => ({ ...old, note: event.target.value }))} disabled={yetkazish?.status === "DELIVERED" || yetkazish?.status === "CANCELLED"} rows={3} className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-orange-400 disabled:bg-slate-100" />
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {(!yetkazish || (yetkazish.status !== "DELIVERED" && yetkazish.status !== "CANCELLED")) && <button type="button" onClick={() => void saqlash()} disabled={saqlanmoqda || (!yetkazish && sotuvHolati(sotuv) !== "CONFIRMED")} className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-black text-white disabled:opacity-40">{yetkazish ? "Saqlash" : "Yetkazishni yaratish"}</button>}
                    {yetkazish?.status === "PENDING" && <button type="button" onClick={() => void holatAmali("dispatch")} disabled={saqlanmoqda} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white">Jo'natish</button>}
                    {yetkazish?.status === "DISPATCHED" && <button type="button" onClick={() => void holatAmali("complete")} disabled={saqlanmoqda} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-black text-white">Yetkazildi</button>}
                    {(yetkazish?.status === "PENDING" || yetkazish?.status === "DISPATCHED") && <button type="button" onClick={() => void holatAmali("cancel")} disabled={saqlanmoqda} className="rounded-xl bg-red-50 px-5 py-2.5 text-sm font-black text-red-600">Bekor qilish</button>}
                    {saqlanmoqda && <LoaderCircle className="animate-spin self-center text-orange-500" size={20} />}
                  </div>
                  {!yetkazish && sotuvHolati(sotuv) !== "CONFIRMED" && <p className="text-xs font-semibold text-amber-600">Yetkazish faqat tasdiqlangan sotuv uchun yaratiladi.</p>}
                </div>
              )}
            </Qadam>
          </main>
        </div>
      </div>
    </div>
  );
}

function OmbordanChiqarishPanel({ sotuv, jami, onClose }: { sotuv: Sotuv; jami: number; onClose: () => void }) {
  const items = sotuv.items ?? [];
  const tasdiqlangan = sotuvHolati(sotuv) === "CONFIRMED";
  const [faoliyatXatosi, setFaoliyatXatosi] = useState("");

  async function faoliyatniBackendgaSaqlash(faoliyat: Omit<SaqlanganFaoliyat, "id" | "sana"> & { sana?: string }) {
    const customerId = mijozIdOlish(sotuv);
    if (!customerId) {
      setFaoliyatXatosi("Faoliyatni saqlash uchun sotuvga mijoz biriktirilishi kerak.");
      return false;
    }
    setFaoliyatXatosi("");
    try {
      if (faoliyat.turi === "Izoh") {
        await crmApi.commentYaratish(customerId, { text: faoliyat.matn || faoliyat.sarlavha, attachmentIds: faoliyat.attachmentIds, mentionUserIds: faoliyat.mentionUserIds });
      } else if (faoliyat.turi === "Xabar") {
        await crmApi.chatXabarYuborish(customerId, faoliyat.matn || faoliyat.sarlavha);
      } else {
        const assigneeId = faoliyat.xodimId || sotuv.responsibleId;
        if (!assigneeId) {
          setFaoliyatXatosi("Ish yoki vazifa yaratish uchun mas’ul xodim kerak.");
          return false;
        }
        await crmApi.activityYaratish({ type: faoliyat.turi === "Vazifa" ? "TASK" : "CALL", customerId, subject: faoliyat.sarlavha, description: faoliyat.matn || undefined, dueAt: faoliyat.sana ?? new Date().toISOString(), assigneeId });
      }
      return true;
    } catch (error) {
      setFaoliyatXatosi(getApiErrorMessage(error));
      return false;
    }
  }

  return (
    <div className="absolute inset-0 z-[60] bg-slate-900/45 backdrop-blur-[1px]">
      <div className="scrollbar-hidden h-full overflow-y-auto rounded-l-3xl bg-[#eef3f6] px-7 py-7 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-300/70 pb-6">
          <div>
            <h2 className="text-3xl font-semibold text-slate-900">Ombordan chiqarish hujjati</h2>
            <p className="mt-2 text-sm text-slate-500">
              Real sotuv: {sotuvRaqami(sotuv)} · {tasdiqlangan ? "mahsulot ombordan chiqarilgan" : "tasdiqlanganda ombordan chiqadi"}
            </p>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm transition hover:bg-sky-500 hover:text-white">
            <X size={19} />
          </button>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[42%_34px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <CardTitle title="Asosiy ma'lumotlar" />
              <Info label="Mijoz" value={mijozNomi(sotuv)} pill />
              <Info label="Telefon" value={mijozTelefon(sotuv)} />
              <Info label="Manzil" value={mijozManzili(sotuv)} />
              <Info label="Kompaniya" value={sotuv.clientCompany?.name || "Kompaniya tanlanmagan"} />
              <Info label="Ombor" value={sotuv.warehouse?.name || sotuv.warehouseId || "Ombor tanlanmagan"} />
              <Info label="Mas'ul shaxs" value={masulNomi(sotuv)} />
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <CardTitle title="Tovarlar" />
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={item.id ?? `${item.modificationId}-${index}`} className="rounded-xl bg-slate-50 p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-700">{mahsulotNomi(item)}</p>
                        <p className="mt-1 text-xs text-slate-400">{item.quantity} dona × {pulniFormatlash(item.price)}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs font-bold ${tasdiqlangan ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {tasdiqlangan ? "Ombordan chiqdi" : "Kutilmoqda"}
                      </span>
                    </div>
                  </div>
                ))}
                {items.length === 0 && <p className="text-sm text-slate-400">Tovarlar mavjud emas</p>}
              </div>
            </section>
          </aside>

          <TimelineRail />

          <main className="space-y-5">
            {faoliyatXatosi && <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">{faoliyatXatosi}</div>}
            <FaoliyatPanel onSaqlash={faoliyatniBackendgaSaqlash} />
            <Divider label="Bugun" />
            <article className="rounded-2xl bg-white/80 p-5 text-slate-700 shadow-sm">
              Hozir siz {mijozNomi(sotuv)} uchun ombordan chiqarish hujjatini ko'ryapsiz.
            </article>
            <article className="rounded-2xl bg-white/80 p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white ${tasdiqlangan ? "bg-emerald-500" : "bg-amber-400"}`}>
                  <Package size={20} />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-slate-700">{tasdiqlangan ? "Ombor amali bajarilgan" : "Ombor amali kutilmoqda"}</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    {items.length} ta tovar, summa {pulniFormatlash(jami)}. Ombor: {sotuv.warehouse?.name || sotuv.warehouseId || "tanlanmagan"}.
                  </p>
                </div>
              </div>
            </article>
          </main>
        </div>
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

function ProductsCard({ sotuv }: { sotuv: Sotuv }) {
  return (
    <section className="rounded-[26px] border border-white/70 bg-white p-5 shadow-[0_16px_42px_rgba(15,23,42,.07)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(15,23,42,.10)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">Sotuv tarkibi</p>
          <h3 className="mt-1 text-lg font-black text-slate-800">Tovarlar</h3>
        </div>
        <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600">
          {(sotuv.items ?? []).length} qator
        </span>
      </div>
      <div className="space-y-3">
        {(sotuv.items ?? []).map((item, index) => (
          <div
            key={item.id ?? `${item.modificationId}-${index}`}
            className="grid gap-4 rounded-2xl border border-slate-100 bg-gradient-to-r from-[#FFF7ED] via-white to-[#F8FAFC] p-4 text-sm transition hover:border-orange-100 hover:shadow-[0_12px_28px_rgba(249,115,22,.10)] md:grid-cols-[1fr_90px_130px_140px]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                <Package size={20} />
              </span>
              <div className="min-w-0">
                <p className="truncate font-black text-slate-800">{mahsulotNomi(item)}</p>
                <p className="mt-1 truncate text-xs font-medium text-slate-400">{mahsulotTavsifi(item)}</p>
              </div>
            </div>
            <SmallMetric label="Miqdor" value={String(item.quantity)} />
            <SmallMetric label="Narx" value={pulniFormatlash(item.price)} />
            <SmallMetric label="Jami" value={pulniFormatlash(mahsulotJami(item))} accent />
          </div>
        ))}
        {(sotuv.items ?? []).length === 0 && <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-400">Tovarlar mavjud emas</p>}
      </div>
    </section>
  );
}

function FaoliyatPanel({
  xodimlar = [],
  onSaqlash,
}: {
  xodimlar?: XodimTanlovi[];
  onSaqlash?: (faoliyat: Omit<SaqlanganFaoliyat, "id" | "sana"> & { sana?: string }) => Promise<boolean>;
}) {
  const [activeTab, setActiveTab] = useState("Ish");
  const [ochiq, setOchiq] = useState(false);
  const [matn, setMatn] = useState("");
  const [tafsilot, setTafsilot] = useState("");
  const [kalendarOchiq, setKalendarOchiq] = useState(false);
  const [tanlanganSana, setTanlanganSana] = useState(() => boshlangichKalendarSanasi());
  const [xodimTanlashJoy, setXodimTanlashJoy] = useState<"forma" | "kalendar" | "mention" | null>(null);
  const [tanlanganXodimId, setTanlanganXodimId] = useState("");
  const [kanalModalOchiq, setKanalModalOchiq] = useState(false);
  const [xabarQoshishOchiq, setXabarQoshishOchiq] = useState(false);
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [panelXatosi, setPanelXatosi] = useState("");
  const [biriktirmalar, setBiriktirmalar] = useState<Attachment[]>([]);
  const [mentionUserIds, setMentionUserIds] = useState<string[]>([]);
  const [kalendarDrag, setKalendarDrag] = useState<{
    active: boolean;
    startX: number;
    scrollLeft: number;
  }>({ active: false, startX: 0, scrollLeft: 0 });

  const faoliyatTablari = [
    { key: "Ish", label: "Ish", title: "Mijoz bilan bog'lanish", placeholder: "Vazifa haqida batafsil yozing..." },
    { key: "Izoh", label: "Izoh", title: "Izoh yozish", placeholder: "Izoh matnini kiriting..." },
    { key: "Xabar", label: "Xabar", title: "Xabar yuborish", placeholder: "Xabar matnini kiriting..." },
    { key: "Vazifa", label: "Vazifa", title: "Vazifa yaratish", placeholder: "Vazifa tavsifini yozing..." },
  ];
  const tanlanganTab = faoliyatTablari.find((tab) => tab.key === activeTab) ?? faoliyatTablari[0];
  const ishTabi = activeTab === "Ish";
  const tanlanganSanaKaliti = sanaKaliti(tanlanganSana);
  const tanlanganSoat = String(tanlanganSana.getHours());
  const tanlanganXodim = xodimlar.find((xodim) => xodim.id === tanlanganXodimId);

  function kalendarSanasiniTanlash(sana: Date, soat: string) {
    const keyingiSana = new Date(sana);
    keyingiSana.setHours(Number(soat), 0, 0, 0);
    setTanlanganSana(keyingiSana);
    setKalendarOchiq(true);
  }

  function tabniTanlash(key: string) {
    setActiveTab(key);
    setOchiq(true);
    setXabarQoshishOchiq(false);
    setXodimTanlashJoy(null);
    if (key !== "Ish") {
      setKalendarOchiq(false);
    }
  }

  async function saqlash() {
    const sarlavha = matn.trim() || tanlanganTab.title;
    const izoh = tafsilot.trim();
    if ((!sarlavha && !izoh) || !onSaqlash || saqlanmoqda) return;
    setSaqlanmoqda(true);
    setPanelXatosi("");
    const saqlandi = await onSaqlash({
      turi: activeTab,
      sarlavha,
      matn: izoh,
      harakat: ishTabi ? "Kalendariga qo'shish" : undefined,
      xodimId: ishTabi ? tanlanganXodimId || undefined : undefined,
      sana: ishTabi ? tanlanganSana.toISOString() : undefined,
      attachmentIds: activeTab === "Izoh" ? biriktirmalar.map((item) => item.id) : undefined,
      mentionUserIds: activeTab === "Izoh" ? mentionUserIds : undefined,
    });
    setSaqlanmoqda(false);
    if (!saqlandi) {
      setPanelXatosi("Ma’lumot backendga saqlanmadi.");
      return;
    }
    setMatn("");
    setTafsilot("");
    setKalendarOchiq(false);
    setTanlanganSana(boshlangichKalendarSanasi());
    setTanlanganXodimId("");
    setXodimTanlashJoy(null);
    setKanalModalOchiq(false);
    setXabarQoshishOchiq(false);
    setBiriktirmalar([]);
    setMentionUserIds([]);
    setOchiq(false);
  }

  async function faylYuklash(file?: File) {
    if (!file) return;
    setPanelXatosi("");
    try {
      const attachment = await crmApi.faylYuklash(file);
      setBiriktirmalar((joriy) => [...joriy, attachment]);
    } catch (error) {
      setPanelXatosi(getApiErrorMessage(error));
    }
  }

  function bekorQilish() {
    setMatn("");
    setTafsilot("");
    setKalendarOchiq(false);
    setTanlanganSana(boshlangichKalendarSanasi());
    setTanlanganXodimId("");
    setXodimTanlashJoy(null);
    setKanalModalOchiq(false);
    setXabarQoshishOchiq(false);
    setBiriktirmalar([]);
    setMentionUserIds([]);
    setPanelXatosi("");
    setOchiq(false);
  }

  function xabarQoshimchaTanlash(label: string) {
    setPanelXatosi(`${label}ni chat xabariga biriktirish endpointi backendda mavjud emas.`);
    setXabarQoshishOchiq(false);
  }

  return (
    <section className="rounded-[24px] border border-orange-100/80 bg-white/92 p-5 shadow-[0_18px_46px_rgba(255,106,0,.08)] backdrop-blur transition-all duration-300">
      <nav className="mb-5 flex flex-wrap items-center gap-5 text-sm text-slate-500">
        {faoliyatTablari.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => tabniTanlash(tab.key)}
            className={`rounded-lg px-3 py-2 transition ${
              activeTab === tab.key && ochiq
                ? "border border-orange-200 bg-orange-50 text-[#FF6A00]"
                : "hover:bg-orange-50 hover:text-[#FF6A00]"
            }`}
          >
            {tab.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setOchiq(true);
          }}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-2 transition hover:bg-slate-50 hover:text-blue-600"
        >
          Ko'proq <ChevronDown size={14} />
        </button>
      </nav>

      {panelXatosi && <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-500">{panelXatosi}</p>}

      {!ochiq ? (
        <button
          type="button"
          onClick={() => {
            setOchiq(true);
          }}
          className="flex h-14 w-full items-center justify-between rounded-xl border border-orange-100 bg-[#FFF8EF]/60 px-5 text-left text-slate-400 transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50 hover:shadow-sm"
        >
          <span>Nima qilish kerak</span>
        </button>
      ) : (
        <div className="animate-in slide-in-from-top-2 fade-in-0 overflow-visible duration-300">
          {activeTab === "Xabar" ? (
            <div className="animate-in slide-in-from-top-2 fade-in-0 rounded-xl bg-white pt-1 duration-300">
              <button
                type="button"
                onClick={() => setKanalModalOchiq(true)}
                className="mb-4 inline-flex h-11 items-center gap-2 rounded-xl bg-[#FF6A00] px-4 text-sm font-bold text-white shadow-[0_10px_26px_rgba(249,115,22,.25)] transition hover:-translate-y-0.5 hover:bg-[#EA580C] hover:shadow-[0_14px_32px_rgba(249,115,22,.32)] active:scale-[.98]"
              >
                <MessageSquare size={18} />
                Xabar yuborishni ulash
              </button>

              <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-white to-[#FFF8EF] p-4 transition focus-within:border-[#FF6A00] focus-within:shadow-[0_0_0_4px_rgba(255,106,0,.10)]">
                <textarea
                  value={tafsilot}
                  onChange={(event) => setTafsilot(event.target.value.slice(0, 200))}
                  placeholder="Xabar matnini yozing"
                  className="min-h-[86px] w-full resize-none bg-transparent text-base text-slate-700 outline-none placeholder:text-slate-400"
                  autoFocus
                />
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-5 text-sm font-semibold text-slate-500">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setXabarQoshishOchiq((joriy) => !joriy)}
                        className={`inline-flex h-10 items-center gap-2 rounded-xl px-3 transition ${
                          xabarQoshishOchiq ? "bg-orange-50 text-[#FF6A00]" : "hover:bg-orange-50 hover:text-[#FF6A00]"
                        }`}
                      >
                        <Plus size={18} />
                        Qo'shish
                      </button>

                      {xabarQoshishOchiq && (
                        <div className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute left-0 top-12 z-[90] w-[245px] rounded-[22px] bg-white p-3 text-left shadow-[0_18px_55px_rgba(92,38,8,.16)] ring-1 ring-orange-100 duration-200">
                          {[
                            { label: "Fayl", icon: Paperclip, arrow: true },
                            { label: "To'lovni qabul qilish", icon: CreditCard },
                            { label: "Hujjat", icon: FileText },
                            { label: "CRM ma'lumotlari", icon: Database },
                          ].map((item, index) => {
                            const Icon = item.icon;
                            return (
                              <div key={item.label}>
                                {index === 3 && <div className="my-2 h-px bg-slate-100" />}
                                <button
                                  type="button"
                                  onClick={() => xabarQoshimchaTanlash(item.label)}
                                  className="flex h-11 w-full items-center justify-between rounded-xl px-2 text-sm font-medium text-slate-700 transition hover:bg-orange-50 hover:text-[#FF6A00]"
                                >
                                  <span>{item.label}</span>
                                  <span className="flex items-center gap-2 text-slate-300">
                                    <Icon size={18} />
                                    {item.arrow && <ChevronRight size={17} />}
                                  </span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full text-purple-500 transition hover:bg-purple-50" aria-label="AI yordamchi">
                      ◎
                    </button>
                  </div>
                  <button type="button" className="text-slate-400 transition hover:text-[#FF6A00]" aria-label="Emoji tanlash">
                    <Smile size={20} />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-slate-200">Mijoz ko'radigan xabar</span>
                <span className={tafsilot.length >= 190 ? "font-semibold text-orange-500" : "text-slate-300"}>
                  Belgilar {tafsilot.length}/200
                </span>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={saqlash}
                  disabled={!tafsilot.trim() || saqlanmoqda}
                  className="inline-flex items-center gap-2 rounded-full bg-[#FF6A00] px-5 py-2 text-xs font-bold uppercase text-white transition hover:-translate-y-0.5 hover:bg-[#EA580C] hover:shadow-md disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                >
                  <Send size={14} />
                  {saqlanmoqda ? "Yuborilmoqda..." : "Yuborish"}
                </button>
                <button
                  type="button"
                  onClick={bekorQilish}
                  className="text-xs font-bold uppercase text-slate-600 transition hover:text-slate-900"
                >
                  Bekor qilish
                </button>
              </div>
            </div>
          ) : activeTab === "Izoh" ? (
            <div className="animate-in slide-in-from-top-2 fade-in-0 rounded-xl bg-white pt-1 duration-300">
              <textarea
                value={tafsilot}
                onChange={(event) => setTafsilot(event.target.value)}
                placeholder=""
                className="min-h-[130px] w-full resize-none bg-transparent px-0 text-base text-slate-700 outline-none placeholder:text-slate-400"
                autoFocus
              />

              <div className="mt-3 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-400">
                <div className="flex flex-wrap items-center gap-7">
                  <label className="inline-flex cursor-pointer items-center gap-2 transition hover:text-[#FF6A00]">
                    <Paperclip size={18} />
                    Fayl
                    <input
                      type="file"
                      className="hidden"
                      onChange={(event) => void faylYuklash(event.target.files?.[0])}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setPanelXatosi("CRM izohidan hujjat yaratish endpointi backendda mavjud emas.")}
                    className="inline-flex items-center gap-2 transition hover:text-[#FF6A00]"
                  >
                    <FileText size={18} />
                    Hujjat yaratish
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setXodimTanlashJoy((joriy) => (joriy === "mention" ? null : "mention"))}
                      className="inline-flex items-center gap-2 transition hover:text-[#FF6A00]"
                    >
                      <span className="text-xl leading-none">@</span>
                      Odamni belgilash
                    </button>
                    {xodimTanlashJoy === "mention" && (
                      <div className="absolute left-0 top-8 z-[100] max-h-52 w-64 overflow-y-auto rounded-2xl bg-white p-2 shadow-xl ring-1 ring-orange-100">
                        {xodimlar.map((xodim) => (
                          <label key={xodim.id} className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-orange-50">
                            <input
                              type="checkbox"
                              checked={mentionUserIds.includes(xodim.id)}
                              onChange={() => setMentionUserIds((joriy) => joriy.includes(xodim.id) ? joriy.filter((id) => id !== xodim.id) : [...joriy, xodim.id])}
                              className="accent-orange-500"
                            />
                            {xodimNomi(xodim)}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="text-lg font-bold text-slate-300 transition hover:text-[#FF6A00]"
                  aria-label="Matn uslubi"
                >
                  A
                </button>
              </div>

              {(biriktirmalar.length > 0 || mentionUserIds.length > 0) && (
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                  {biriktirmalar.map((fayl) => <span key={fayl.id} className="rounded-lg bg-orange-50 px-2 py-1">{fayl.originalName || fayl.fileName || "Fayl"}</span>)}
                  {mentionUserIds.map((id) => <span key={id} className="rounded-lg bg-blue-50 px-2 py-1">@{xodimNomi(xodimlar.find((item) => item.id === id))}</span>)}
                </div>
              )}

              <div className="mt-7 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={saqlash}
                  disabled={saqlanmoqda}
                  className="rounded-full bg-[#FF6A00] px-5 py-2 text-xs font-bold uppercase text-white transition hover:-translate-y-0.5 hover:bg-[#EA580C] hover:shadow-md disabled:opacity-50"
                >
                  {saqlanmoqda ? "Saqlanmoqda..." : "Yuborish"}
                </button>
                <button
                  type="button"
                  onClick={bekorQilish}
                  className="text-xs font-bold uppercase text-slate-600 transition hover:text-slate-900"
                >
                  Bekor qilish
                </button>
              </div>
            </div>
          ) : (
            <>
          <div className="rounded-2xl border border-orange-300 bg-gradient-to-br from-white to-[#FFF8EF] p-4 shadow-inner transition-all duration-300 ease-in-out focus-within:ring-4 focus-within:ring-orange-100">
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <input
                  value={matn}
                  onChange={(event) => setMatn(event.target.value)}
                  placeholder={tanlanganTab.title}
                  className="h-10 w-full bg-transparent text-base text-slate-700 outline-none placeholder:text-slate-700"
                  autoFocus
                />
                <textarea
                  value={tafsilot}
                  onChange={(event) => setTafsilot(event.target.value)}
                  placeholder={tanlanganTab.placeholder}
                  className="mt-5 min-h-[72px] w-full resize-none bg-transparent text-sm text-slate-600 outline-none placeholder:text-slate-400"
                />
              </div>
              <div className="flex h-10 shrink-0 items-center gap-2 text-slate-400">
                <span className="h-3 w-3 shrink-0 rounded-full bg-amber-400 ring-4 ring-amber-50" />
                <div className="relative flex h-10 items-center">
                  <button
                    type="button"
                    onClick={() => setXodimTanlashJoy((joriy) => (joriy === "forma" ? null : "forma"))}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold leading-none transition ${
                      tanlanganXodim
                        ? "bg-[#FF6A00] text-white ring-2 ring-orange-100"
                        : "bg-orange-100 text-[#FF6A00] hover:bg-orange-200"
                    }`}
                    title={xodimNomi(tanlanganXodim)}
                    aria-label="Xodim tanlash"
                  >
                    {tanlanganXodim ? xodimBoshHarflari(tanlanganXodim) : <UserRound size={17} />}
                  </button>

                  {xodimTanlashJoy === "forma" && (
                    <div
                      className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-12 z-[120] w-[min(280px,calc(100vw-32px))] overflow-hidden rounded-2xl bg-white p-2 text-left shadow-[0_20px_60px_rgba(92,38,8,.22)] ring-1 ring-orange-100 duration-200"
                      style={{ right: 0 }}
                    >
                      <div className="px-3 py-2 text-xs font-bold uppercase text-slate-400">
                        Xodim tanlash
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTanlanganXodimId("");
                          setXodimTanlashJoy(null);
                        }}
                        className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${
                          !tanlanganXodimId
                            ? "bg-orange-50 text-[#FF6A00]"
                            : "text-slate-600 hover:bg-orange-50 hover:text-[#FF6A00]"
                        }`}
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                          <UserRound size={15} />
                        </span>
                        <span>Biriktirilmagan</span>
                      </button>
                      <div className="max-h-64 overflow-y-auto py-1">
                        {xodimlar.map((xodim) => {
                          const active = xodim.id === tanlanganXodimId;
                          return (
                            <button
                              key={xodim.id}
                              type="button"
                              onClick={() => {
                                setTanlanganXodimId(xodim.id);
                                setXodimTanlashJoy(null);
                              }}
                              className={`flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition ${
                                active
                                  ? "bg-[#FF6A00] font-bold text-white"
                                  : "text-slate-700 hover:bg-orange-50 hover:text-[#FF6A00]"
                              }`}
                            >
                              <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                  active ? "bg-white/20 text-white" : "bg-orange-100 text-[#FF6A00]"
                                }`}
                              >
                                {xodimBoshHarflari(xodim) || <UserRound size={15} />}
                              </span>
                              <span className="min-w-0 flex-1 truncate">{xodimNomi(xodim)}</span>
                            </button>
                          );
                        })}
                        {xodimlar.length === 0 && (
                          <div className="px-3 py-4 text-sm font-semibold text-slate-400">
                            Backenddan xodim topilmadi.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setKalendarOchiq((joriy) => !joriy);
                  }}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-orange-200 bg-white px-3 text-sm text-slate-600 transition hover:border-[#FF6A00] hover:text-[#FF6A00]"
                >
                  {kalendarMatni(tanlanganSana)}
                  <ChevronDown size={14} className={`transition ${kalendarOchiq ? "rotate-180" : ""}`} />
                </button>
                <Bell size={17} className="text-slate-400" />
              </div>
            </div>
          </div>

          {ishTabi && kalendarOchiq && (
            <div className="animate-in slide-in-from-top-2 fade-in-0 mt-3 rounded-b-xl bg-orange-50/70 px-5 py-4 duration-300">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                    <CalendarDays size={18} className="text-slate-500" />
                    <span className="font-semibold">Kalendariga qo'shildi</span>
                    <span className="truncate text-[#FF6A00]">{xodimNomi(tanlanganXodim)}</span>
                    <button type="button" className="text-xs uppercase text-slate-400 transition hover:text-[#FF6A00]">
                      o'zgartirish
                    </button>
                  </div>
                  <button type="button" className="mt-2 text-sm text-slate-400 underline underline-offset-4 hover:text-[#FF6A00]">
                    ishtirokchilar (1)
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setKalendarOchiq(false);
                  }}
                  className="rounded-full p-1 text-slate-400 transition hover:bg-white hover:text-slate-700"
                  aria-label="Kalendar panelini yopish"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="mt-5 flex gap-4">
                <div className="relative flex w-14 shrink-0 items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setXodimTanlashJoy((joriy) => (joriy === "kalendar" ? null : "kalendar"))}
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition ${
                      tanlanganXodim
                        ? "bg-[#FF6A00] text-white ring-2 ring-orange-100"
                        : "bg-orange-100 text-[#FF6A00] hover:bg-orange-200"
                    }`}
                    title={xodimNomi(tanlanganXodim)}
                    aria-label="Kalendar xodimini tanlash"
                  >
                    {tanlanganXodim ? xodimBoshHarflari(tanlanganXodim) : <UserRound size={17} />}
                  </button>

                  {xodimTanlashJoy === "kalendar" && (
                    <div className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute left-0 top-11 z-[120] w-[min(280px,calc(100vw-32px))] overflow-hidden rounded-2xl bg-white p-2 text-left shadow-[0_20px_60px_rgba(92,38,8,.22)] ring-1 ring-orange-100 duration-200">
                      <div className="px-3 py-2 text-xs font-bold uppercase text-slate-400">
                        Xodim tanlash
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTanlanganXodimId("");
                          setXodimTanlashJoy(null);
                        }}
                        className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${
                          !tanlanganXodimId
                            ? "bg-orange-50 text-[#FF6A00]"
                            : "text-slate-600 hover:bg-orange-50 hover:text-[#FF6A00]"
                        }`}
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                          <UserRound size={15} />
                        </span>
                        <span>Biriktirilmagan</span>
                      </button>
                      <div className="max-h-64 overflow-y-auto py-1">
                        {xodimlar.map((xodim) => {
                          const active = xodim.id === tanlanganXodimId;
                          return (
                            <button
                              key={xodim.id}
                              type="button"
                              onClick={() => {
                                setTanlanganXodimId(xodim.id);
                                setXodimTanlashJoy(null);
                              }}
                              className={`flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition ${
                                active
                                  ? "bg-[#FF6A00] font-bold text-white"
                                  : "text-slate-700 hover:bg-orange-50 hover:text-[#FF6A00]"
                              }`}
                            >
                              <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                  active ? "bg-white/20 text-white" : "bg-orange-100 text-[#FF6A00]"
                                }`}
                              >
                                {xodimBoshHarflari(xodim) || <UserRound size={15} />}
                              </span>
                              <span className="min-w-0 flex-1 truncate">{xodimNomi(xodim)}</span>
                            </button>
                          );
                        })}
                        {xodimlar.length === 0 && (
                          <div className="px-3 py-4 text-sm font-semibold text-slate-400">
                            Backenddan xodim topilmadi.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div
                  className={`scrollbar-hidden min-w-0 flex-1 select-none overflow-x-auto pb-3 touch-pan-x ${
                    kalendarDrag.active ? "cursor-grabbing" : "cursor-grab"
                  }`}
                  onMouseDown={(event) => {
                    setKalendarDrag({
                      active: true,
                      startX: event.pageX - event.currentTarget.offsetLeft,
                      scrollLeft: event.currentTarget.scrollLeft,
                    });
                  }}
                  onMouseMove={(event) => {
                    if (!kalendarDrag.active) return;
                    event.preventDefault();
                    const x = event.pageX - event.currentTarget.offsetLeft;
                    event.currentTarget.scrollLeft = kalendarDrag.scrollLeft - (x - kalendarDrag.startX);
                  }}
                  onMouseUp={() => setKalendarDrag((joriy) => ({ ...joriy, active: false }))}
                  onMouseLeave={() => setKalendarDrag((joriy) => ({ ...joriy, active: false }))}
                >
                  <div className="flex min-w-[760px] gap-3">
                    {yilKunlari(tanlanganSana.getFullYear()).map((kun) => (
                      <div key={kun.kun} className="min-w-[500px] border-l border-slate-200 pl-3">
                        <div className="mb-2 flex items-center gap-2 text-xs text-slate-700">
                          <span>{kun.kun}</span>
                          {kun.bugun && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] text-[#FF6A00]">bugun</span>}
                        </div>
                        <div className="grid grid-cols-10 text-xs text-slate-700">
                          {kun.soatlar.map((soat) => (
                            <span key={soat}>{soat}</span>
                          ))}
                        </div>
                        <div className="mt-2 grid h-9 grid-cols-10 overflow-hidden bg-white">
                          {kun.soatlar.map((soat, soatIndex) => (
                            <button
                              key={`${kun.kun}-${soat}`}
                              type="button"
                              onClick={() => kalendarSanasiniTanlash(kun.sana, soat)}
                              className={`border-l border-orange-100 transition hover:bg-orange-100 ${
                                kun.dateKey === tanlanganSanaKaliti && soat === tanlanganSoat
                                  ? "bg-[#FF6A00] shadow-inner"
                                  : soatIndex >= 2 && soatIndex <= 4
                                    ? "bg-orange-50"
                                    : "bg-white"
                              }`}
                              title={`${kun.kun}, soat ${soat}:00`}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 h-2 w-28 rounded-full bg-slate-300" />
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={saqlash}
              disabled={saqlanmoqda}
              className="rounded-full bg-[#FF6A00] px-5 py-2 text-xs font-bold uppercase text-white transition hover:bg-[#EA580C] disabled:opacity-50"
            >
              {saqlanmoqda ? "Saqlanmoqda..." : "Saqlash"}
            </button>
            <button
              type="button"
              onClick={bekorQilish}
              className="text-xs font-bold uppercase text-slate-600 transition hover:text-slate-900"
            >
              Bekor qilish
            </button>
          </div>
            </>
          )}
        </div>
      )}
      {kanalModalOchiq && <AloqaKanallariModal onClose={() => setKanalModalOchiq(false)} />}
    </section>
  );
}

function AloqaKanallariModal({ onClose }: { onClose: () => void }) {
  const kanallar = [
    {
      name: "Telegram",
      description: "Mijozlarga Telegram orqali tezkor xabar yuborish uchun ulanish.",
      icon: "✈",
      color: "from-sky-500 to-blue-600",
    },
    {
      name: "WhatsApp",
      description: "WhatsApp orqali mijozlar bilan yozishmalarni boshqarish.",
      icon: "☘",
      color: "from-emerald-400 to-green-600",
    },
    {
      name: "SMS",
      description: "Telefon raqamiga qisqa xabarlarni yuborish kanalini sozlash.",
      icon: "SMS",
      color: "from-orange-400 to-orange-600",
    },
    {
      name: "Web chat",
      description: "Saytdan kelgan xabarlarni sotuv kartasida kuzatish.",
      icon: "💬",
      color: "from-violet-400 to-fuchsia-500",
    },
  ];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
      <div className="animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 max-h-[86vh] w-full max-w-[980px] overflow-hidden rounded-[28px] bg-[#EEF3F7] shadow-[0_30px_90px_rgba(15,23,42,.35)] duration-300">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 bg-white/60 px-6 py-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Aloqa kanallarini ulash</h2>
            <p className="mt-1 text-sm text-slate-500">Telegram, WhatsApp, SMS yoki web chatni sotuv xabarlari uchun ulang.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-900"
            aria-label="Modalni yopish"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[calc(86vh-96px)] overflow-y-auto px-6 py-5">
          <nav className="mb-5 flex flex-wrap gap-2 text-sm">
            {["Xabarchilar", "SMS", "Barcha ulanishlar", "Bozor"].map((tab, index) => (
              <button
                key={tab}
                type="button"
                className={`rounded-xl px-4 py-2 transition ${
                  index === 0
                    ? "border border-sky-200 bg-sky-50 text-blue-600"
                    : "text-slate-500 hover:bg-white hover:text-blue-600"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>

          <section className="rounded-[26px] bg-gradient-to-br from-emerald-400 to-green-600 p-6 text-white shadow-[0_18px_50px_rgba(34,197,94,.22)]">
            <h3 className="text-4xl font-black tracking-tight">Wazzup</h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/95">
              WhatsApp va Telegram kabi xabar almashish kanallarini yagona sotuv oynasiga ulash uchun qulay integratsiya.
            </p>

            <div className="mt-7 grid gap-4 md:grid-cols-2">
              {kanallar.map((kanal) => (
                <article
                  key={kanal.name}
                  className="group rounded-3xl bg-white p-5 text-slate-900 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_38px_rgba(15,23,42,.16)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${kanal.color} text-xl font-black text-white shadow-lg`}>
                      {kanal.icon}
                    </div>
                    <button
                      type="button"
                      className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition group-hover:bg-blue-700"
                    >
                      Ulanish
                    </button>
                  </div>
                  <h4 className="mt-5 text-xl font-bold">{kanal.name}</h4>
                  <p className="mt-2 min-h-12 text-sm leading-5 text-slate-600">{kanal.description}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function TimelineRail() {
  return (
    <div className="hidden flex-col items-center xl:flex">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF6A00] text-white shadow-[0_12px_28px_rgba(249,115,22,.28)]"><MessageSquare size={18} /></div>
      <div className="h-32 w-px bg-orange-200" />
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_12px_28px_rgba(16,185,129,.22)]"><Bell size={18} /></div>
      <div className="h-28 w-px bg-orange-200" />
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#FF6A00] shadow-sm ring-1 ring-orange-100"><Package size={17} /></div>
    </div>
  );
}

function Divider({ label, green }: { label: string; green?: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <div className="h-px flex-1 bg-orange-200" />
      <span className={`rounded-full px-6 py-1 text-sm ${green ? "bg-emerald-500 font-bold text-white" : "bg-orange-100 font-semibold text-[#FF6A00] ring-1 ring-orange-200"}`}>{label}</span>
      <div className="h-px flex-1 bg-orange-200" />
    </div>
  );
}

function CardTitle({ title, action }: { title: string; action?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-orange-100 pb-3">
      <h2 className="text-xs font-black uppercase tracking-wide text-slate-600">{title}</h2>
      {action && <button className="text-xs font-semibold text-slate-400 transition hover:text-[#FF6A00]">{action}</button>}
    </div>
  );
}

function Info({ label, value, pill = false }: { label: string; value: string; pill?: boolean }) {
  return (
    <div className="mt-4">
      <p className="text-sm text-slate-400">{label}</p>
      <div className={`mt-1 text-sm text-slate-700 ${pill ? "inline-flex min-h-8 min-w-[260px] items-center rounded-xl bg-orange-50 px-3 ring-1 ring-orange-100" : ""}`}>{value}</div>
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
  return (
    <article className="group relative overflow-visible rounded-[24px] border border-orange-100/80 bg-white/92 p-5 shadow-[0_14px_38px_rgba(255,106,0,.08)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(255,106,0,.12)]">
      <div className="absolute -left-[70px] top-5 hidden h-11 w-11 items-center justify-center rounded-full bg-[#FF6A00] text-white shadow-[0_12px_30px_rgba(249,115,22,.30)] xl:flex">
        <FileText size={21} />
      </div>

      <div className="flex items-start justify-between gap-5">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-[96px] w-[108px] shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6A00] ring-1 ring-orange-100">
            <FileText size={42} strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-black text-slate-900">Hujjat tayyorlandi</h3>
              <span className="text-sm font-medium text-slate-400">{qisqaVaqt(hujjat.sana)}</span>
            </div>
            <div className="mt-3 space-y-1.5 text-sm">
              <p className="text-slate-500">
                Ism: <span className="font-semibold text-slate-800">{hujjat.nomi}</span>
              </p>
              <p className="text-slate-400">
                Sizning kompaniyangiz <span className="font-semibold text-slate-700">To'ldirilmagan</span>
              </p>
              <p className="text-slate-500">
                Mijoz <span className="font-semibold text-slate-800">{mijozNomi(sotuv)}</span>
              </p>
            </div>
          </div>
        </div>

        <UserRound className="mt-1 shrink-0 rounded-full bg-slate-100 p-1.5 text-slate-500" size={32} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onOchish}
          className="inline-flex h-10 min-w-[150px] items-center justify-center rounded-xl border border-orange-100 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-[#FF6A00] hover:text-[#FF6A00]"
        >
          Ochiq
        </button>
        <button
          type="button"
          className="inline-flex h-10 min-w-[150px] items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:text-orange-600"
        >
          Obuna bo'lish
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
  return (
    <article className="group relative overflow-hidden rounded-[24px] border border-orange-100/80 bg-white/92 p-5 shadow-[0_14px_38px_rgba(255,106,0,.08)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(255,106,0,.12)]">
      <span className="absolute inset-y-5 left-0 w-1 rounded-r-full bg-gradient-to-b from-orange-400 to-orange-600 opacity-80" />
      <div className="flex items-start justify-between gap-4">
        <div className="pl-2">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-black text-slate-700">{title}</h3>
            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-slate-400 ring-1 ring-orange-100">{time}</span>
          </div>
          <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{text}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onOchirish && (
            <button
              type="button"
              onClick={onOchirish}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-400 opacity-0 transition hover:bg-red-100 hover:text-red-600 group-hover:opacity-100"
              aria-label={`${title}ni o'chirish`}
            >
              <Trash2 size={16} />
            </button>
          )}
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-50 to-[#FFF8EF] ring-1 ring-orange-100" />
        </div>
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
              bajarildi ? "border-[#FF6A00] bg-[#FF6A00] text-white" : "border-orange-200 bg-white"
            }`}
            aria-label={bajarildi ? "Bajarilgan belgini olib tashlash" : "Vazifani bajarildi qilish"}
          >
            {bajarildi && <span className="text-xs leading-none">✓</span>}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className={`font-bold ${bajarildi ? "text-slate-900" : "text-slate-800"}`}>{faoliyat.sarlavha}</h3>
              <span className="text-sm text-slate-400">bugun, {vaqt}</span>
              {faoliyat.pinned && (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-[#FF6A00]">
                  <Pin size={12} />
                  Zakrepit
                </span>
              )}
            </div>

            <div className={`mt-5 flex flex-wrap items-center gap-5 transition-all duration-500 ${bajarildi ? "translate-y-1" : ""}`}>
              <div className={`relative flex h-24 w-[84px] shrink-0 items-center justify-center rounded-xl text-center shadow-sm transition ${bajarildi ? "bg-orange-50" : "bg-orange-100"}`}>
                <div className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-[#FF6A00] text-white shadow-sm">
                  <CalendarDays size={16} />
                </div>
                <div className="rounded-lg border border-sky-200 bg-white px-3 py-2">
                  <p className="text-2xl font-black leading-5 text-slate-700">{kun}</p>
                  <p className="mt-1 text-[10px] uppercase text-slate-500">{oy}</p>
                  <p className="text-[9px] font-bold text-[#FF6A00]">{vaqt}</p>
                </div>
              </div>

              <div className="min-w-[240px] flex-1">
                <p className="text-sm text-slate-500">
                  Rejalashtirilgan voqea{" "}
                  <span className="font-medium text-[#FF6A00]">{faoliyat.sarlavha}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setTahrirOchiq((joriy) => !joriy)}
                  className={`mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition ${
                    bajarildi ? "bg-slate-50 hover:bg-slate-100" : "bg-orange-100 hover:bg-orange-200"
                  }`}
                >
                  <span>Sana va vaqt</span>
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
                    ? "border border-orange-100 bg-white text-slate-600 hover:border-[#FF6A00] hover:text-[#FF6A00]"
                    : "bg-[#FF6A00] text-white hover:bg-[#EA580C]"
                }`}
              >
                {bajarildi ? "Takrorlash" : "Bajarildi"}
              </button>
              {!bajarildi && <button
                type="button"
                onClick={() => setTahrirOchiq(true)}
                className="rounded-xl border border-orange-100 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-[#FF6A00] hover:text-[#FF6A00]"
              >
                Tahrirlash
              </button>}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="h-3 w-3 rounded-sm bg-amber-400" />
          {bajarildi && faoliyat.pinned && <Pin size={16} className="fill-[#FF6A00] text-[#FF6A00]" />}
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              xodim ? "bg-[#FF6A00] text-white" : "bg-orange-100 text-[#FF6A00]"
            }`}
            title={xodimNomi(xodim)}
          >
            {xodim ? xodimBoshHarflari(xodim) : <UserRound size={15} />}
          </span>
          <button
            type="button"
            onClick={() => onOchirish(faoliyat.id)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-400 transition hover:bg-red-100 hover:text-red-600 active:scale-95"
            aria-label="Kalendar vazifasini o'chirish"
            title="O'chirish"
          >
            <Trash2 size={17} />
          </button>
          {bajarildi && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOchiq((joriy) => !joriy)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:scale-95"
                aria-label="Kalendar amallari"
              >
                <MoreHorizontal size={22} />
              </button>

              {menuOchiq && (
                <div className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute right-0 top-11 z-[80] w-[250px] rounded-2xl bg-white p-3 text-sm shadow-[0_20px_70px_rgba(15,23,42,.20)] ring-1 ring-slate-100 duration-200">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    <span>Kengaytmalar</span>
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
                    <span>{faoliyat.pinned ? "Zakrepitdan olish" : "Zakrepit qilish"}</span>
                    <Pin size={17} className={faoliyat.pinned ? "fill-blue-500 text-blue-500" : "text-slate-300"} />
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    <span>Bog'langan ishlar</span>
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
                    <span>O'chirish</span>
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
            <span className="font-semibold">Kalendariga qo'shildi</span>
            <span className="truncate text-blue-600">abdulaziz001969@gmail.com</span>
            <button type="button" className="text-xs uppercase text-slate-400 transition hover:text-blue-600">
              o'zgartirish
            </button>
          </div>
          <button type="button" className="mt-2 text-sm text-slate-400 underline underline-offset-4 hover:text-blue-600">
            ishtirokchilar (1)
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-slate-400 transition hover:bg-white hover:text-slate-700"
          aria-label="Kalendar panelini yopish"
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
                  {kun.bugun && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] text-sky-600">bugun</span>}
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
                      title={`${kun.kun}, soat ${soat}:00`}
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

function SmallMetric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-white/70 px-3 py-2 ring-1 ring-slate-100">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className={`mt-1 font-black ${accent ? "text-emerald-600" : "text-slate-700"}`}>{value}</p>
    </div>
  );
}

function IconButton({ icon }: { icon: ReactNode }) {
  return <button className="hidden h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm transition hover:text-orange-600 sm:flex">{icon}</button>;
}
