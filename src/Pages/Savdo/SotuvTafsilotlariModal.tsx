import { useState, type ReactNode } from "react";
import {
  Bell,
  ChevronDown,
  ImageIcon,
  LoaderCircle,
  MessageSquare,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Settings,
  X,
} from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import type { QoldiqTanlovi, Sotuv, SotuvYaratishMalumoti } from "@/types/savdo";
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

type SotuvTafsilotlariModalProps = {
  sotuv: Sotuv;
  qoldiqlar: QoldiqTanlovi[];
  amalBajarilmoqda: boolean;
  onYopish: () => void;
  onYangilash: (
    sotuvId: string,
    malumot: Partial<SotuvYaratishMalumoti>
  ) => Promise<boolean>;
  onTasdiqlash: (sotuvId: string) => void;
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

const tabs = ["Umumiy", "Tovarlar", "Takliflar", "Avtomatlashtirish", "Hisob-fakturalar", "Aloqalar", "Tarix", "Bozor", "Ko'proq"];
const bolimlar = ["To'lov", "To'lov va yetkazish", "Terminal orqali to'lov", "Yetkazish", "Ombordan chiqarish"];

function mijozTelefon(sotuv: Sotuv) {
  return sotuv.customer?.phone || sotuv.clientCompany?.phone || "—";
}

function mijozManzili(sotuv: Sotuv) {
  return sotuv.customer?.address || sotuv.clientCompany?.address || "—";
}

function qisqaVaqt(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("uz-UZ", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function mahsulotNomi(item: SotuvItem) {
  return item.modification?.product?.name ?? item.modification?.name ?? "Mahsulot nomi topilmadi";
}

function mahsulotTavsifi(item: SotuvItem) {
  if (item.modification?.product?.name && item.modification?.name) return item.modification.name;
  return "Mahsulot ma'lumoti katalogdan olinadi";
}

function mahsulotJami(item: SotuvItem) {
  return item.quantity * item.price - Number(item.discount ?? 0);
}

function qoldiqMiqdori(qoldiq: QoldiqTanlovi) {
  return Number(qoldiq.quantity ?? qoldiq.balance ?? 0);
}

function qoldiqNarxi(qoldiq: QoldiqTanlovi) {
  return Number(
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
  amalBajarilmoqda,
  onYopish,
  onYangilash,
  onTasdiqlash,
  onBekorQilish,
}: SotuvTafsilotlariModalProps) {
  const [activeTab, setActiveTab] = useState("Umumiy");
  const [yetkazishOchiq, setYetkazishOchiq] = useState(false);
  const [ombordanChiqarishOchiq, setOmbordanChiqarishOchiq] = useState(false);
  const holat = sotuvHolati(sotuv);
  const jami = sotuvSummasi(sotuv);
  const draft = holat === "DRAFT";
  const vaqt = qisqaVaqt(sotuv.createdAt) || "—";

  return (
    <AppModal className="items-start justify-start bg-black/45 p-0 py-6 pl-[70px] pr-5">
      <section className="relative h-[calc(100vh-48px)] w-full overflow-hidden rounded-l-[38px] rounded-r-[28px] bg-[#eef3f6] text-[#303946] shadow-2xl ring-1 ring-white/60">
        <div className="scrollbar-hidden h-full overflow-y-auto">
          <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#eef3f6]/95 px-7 py-5 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <h1 className="truncate text-2xl font-bold text-slate-900">{sotuvJadvalId(sotuv)}</h1>
              <div className="flex shrink-0 items-center gap-2">
                <IconButton icon={<Settings size={17} />} />
                <button className="hidden h-9 items-center gap-2 rounded-xl bg-white px-3 text-sm text-slate-600 shadow-sm sm:inline-flex">
                  Hujjat <ChevronDown size={15} />
                </button>
                {draft && (
                  <button
                    disabled={amalBajarilmoqda}
                    onClick={() => onTasdiqlash(sotuv.id)}
                    className="inline-flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    {amalBajarilmoqda ? <LoaderCircle size={16} className="animate-spin" /> : "Taklif"}
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
                    activeTab === tab ? "border border-sky-200 bg-white text-blue-600" : "text-slate-500 hover:bg-white hover:text-blue-600"
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
          ) : (
            <UmumiyTab
              sotuv={sotuv}
              jami={jami}
              holat={holat}
              draft={draft}
              vaqt={vaqt}
              amalBajarilmoqda={amalBajarilmoqda}
              onTasdiqlash={onTasdiqlash}
              onBekorQilish={onBekorQilish}
              onYetkazish={() => setYetkazishOchiq(true)}
              onOmbordanChiqarish={() => setOmbordanChiqarishOchiq(true)}
            />
          )}
        </div>

        {yetkazishOchiq && <YetkazishPanel sotuv={sotuv} jami={jami} onClose={() => setYetkazishOchiq(false)} />}
        {ombordanChiqarishOchiq && <OmbordanChiqarishPanel sotuv={sotuv} jami={jami} onClose={() => setOmbordanChiqarishOchiq(false)} />}
      </section>
    </AppModal>
  );
}

function UmumiyTab({
  sotuv,
  jami,
  holat,
  draft,
  vaqt,
  amalBajarilmoqda,
  onTasdiqlash,
  onBekorQilish,
  onYetkazish,
  onOmbordanChiqarish,
}: {
  sotuv: Sotuv;
  jami: number;
  holat: ReturnType<typeof sotuvHolati>;
  draft: boolean;
  vaqt: string;
  amalBajarilmoqda: boolean;
  onTasdiqlash: (sotuvId: string) => void;
  onBekorQilish: (sotuvId: string) => void;
  onYetkazish: () => void;
  onOmbordanChiqarish: () => void;
}) {
  return (
    <div className="grid gap-7 px-7 py-7 xl:grid-cols-[42%_32px_minmax(0,1fr)] 2xl:grid-cols-[40%_34px_minmax(0,1fr)]">
      <aside className="space-y-5">
        <KelishuvCard
          sotuv={sotuv}
          jami={jami}
          holat={holat}
          draft={draft}
          amalBajarilmoqda={amalBajarilmoqda}
          onTasdiqlash={onTasdiqlash}
          onBekorQilish={onBekorQilish}
          onYetkazish={onYetkazish}
          onOmbordanChiqarish={onOmbordanChiqarish}
        />

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <CardTitle title="Qo'shimcha ma'lumotlar" action="o'zgartirish" />
          <Info label="Qaytarilgan savdo" value="Tanlanmagan" pill />
          <Info label="Mas'ul shaxs" value={masulNomi(sotuv)} />
          <Info label="Sana" value={sananiFormatlash(sotuv.createdAt)} />
          <Info label="Qo'shimcha izoh" value={sotuv.note || "Izoh yo'q"} />
        </section>
      </aside>

      <TimelineRail />

      <main className="space-y-5">
        <FaoliyatPanel />
        <Divider label="Nima qilish kerak" green />
        <article className="flex items-center gap-4 rounded-2xl bg-yellow-50 p-5 text-slate-600 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Plus size={21} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Keyingi amalni yarating</h3>
            <p className="text-sm text-slate-500">Mijoz bilan ishlashni davom ettirish uchun keyingi bosqichni rejalashtiring.</p>
          </div>
        </article>
        <Divider label="Bugun" />
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
  onTasdiqlash,
  onBekorQilish,
  onYetkazish,
  onOmbordanChiqarish,
}: {
  sotuv: Sotuv;
  jami: number;
  holat: ReturnType<typeof sotuvHolati>;
  draft: boolean;
  amalBajarilmoqda: boolean;
  onTasdiqlash: (sotuvId: string) => void;
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
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
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
            onClick={() => onTasdiqlash(sotuv.id)}
            className="h-10 rounded-md bg-sky-400 px-4 text-xs font-black uppercase text-white transition hover:bg-sky-500 disabled:opacity-50"
          >
            To'lovni qabul qilish
          </button>
        ) : (
          <span className="rounded-md bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">{sotuvHolatiMatni[holat]}</span>
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500">{tanlanganBolim}</p>
        <p className="mt-3 text-sm text-slate-400">Bu yerda to'lov, yetkazish va ombordan chiqarish ma'lumotlari ko'rsatiladi.</p>
        <div className="mt-4 border-t border-slate-100 pt-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="text-sm text-blue-600 transition hover:text-blue-700 hover:underline"
            >
              Qo'shish
            </button>
            {menuOpen && (
              <div className="absolute left-0 top-7 z-40 w-[238px] rounded-[22px] bg-white py-3 shadow-[0_18px_50px_rgba(15,23,42,0.18)] ring-1 ring-slate-100">
                {bolimlar.map((bolim) => (
                  <button
                    key={bolim}
                    type="button"
                    onClick={() => bolimniTanlash(bolim)}
                    className="flex h-11 w-full items-center gap-3 px-5 text-left text-[15px] text-slate-700 transition hover:bg-slate-50 hover:text-blue-600"
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
                <span key={tolov.id ?? `${tolov.paymentType}-${index}`} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
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
            <div className="flex justify-between text-blue-600">
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

      <Info label="Mijoz" value={mijozNomi(sotuv)} />
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
    (summa, qator) => summa + qator.quantity * qator.price - Number(qator.discount ?? 0),
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
          quantity: item.quantity,
          price: item.price,
          discount: item.discount ?? 0,
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
                              quantity: item.quantity,
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
                    {Math.max(item.quantity, 0)} dona
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

function YetkazishPanel({ sotuv, jami, onClose }: { sotuv: Sotuv; jami: number; onClose: () => void }) {
  const items = sotuv.items ?? [];

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
              <div className="mt-8 grid max-w-2xl gap-4 md:grid-cols-2">
                <div className="flex h-36 items-center justify-center rounded-xl bg-white shadow-sm">
                  <span className="text-2xl font-black text-orange-600">Yetkazish xizmati</span>
                </div>
                <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400">
                  <Plus size={30} />
                  <span className="mt-2 font-semibold">Tavsiya qiling</span>
                </div>
              </div>
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
            <FaoliyatPanel />
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
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-bold text-slate-700">Tovarlar</h3>
      <div className="space-y-3">
        {(sotuv.items ?? []).map((item, index) => (
          <div key={item.id ?? `${item.modificationId}-${index}`} className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm md:grid-cols-[1fr_80px_120px_120px]">
            <div>
              <p className="font-semibold text-slate-800">{mahsulotNomi(item)}</p>
              <p className="mt-1 truncate text-xs text-slate-400">{mahsulotTavsifi(item)}</p>
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

function FaoliyatPanel() {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <nav className="mb-5 flex flex-wrap items-center gap-5 text-sm text-slate-500">
        <button className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-blue-600">Ish</button>
        <button>Izoh</button>
        <button>Xabar</button>
        <button>Vazifa</button>
        <button className="inline-flex items-center gap-1">Ko'proq <ChevronDown size={14} /></button>
      </nav>
      <div className="flex h-14 items-center justify-between rounded-xl border border-slate-200 px-5 text-slate-400">
        <span>Nima qilish kerak</span>
        <span className="text-xs text-slate-500">harakatlar <ChevronDown size={13} className="inline" /></span>
      </div>
    </section>
  );
}

function TimelineRail() {
  return (
    <div className="hidden flex-col items-center xl:flex">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-400 text-white"><MessageSquare size={18} /></div>
      <div className="h-32 w-px bg-slate-300" />
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white"><Bell size={18} /></div>
      <div className="h-28 w-px bg-slate-300" />
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm"><Package size={17} /></div>
    </div>
  );
}

function Divider({ label, green }: { label: string; green?: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <div className="h-px flex-1 bg-slate-300" />
      <span className={`rounded-full px-6 py-1 text-sm ${green ? "bg-emerald-500 font-bold text-white" : "bg-slate-300 text-slate-600"}`}>{label}</span>
      <div className="h-px flex-1 bg-slate-300" />
    </div>
  );
}

function CardTitle({ title, action }: { title: string; action?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
      <h2 className="text-xs font-black uppercase tracking-wide text-slate-600">{title}</h2>
      {action && <button className="text-xs text-slate-400">{action}</button>}
    </div>
  );
}

function Info({ label, value, pill = false }: { label: string; value: string; pill?: boolean }) {
  return (
    <div className="mt-4">
      <p className="text-sm text-slate-400">{label}</p>
      <div className={`mt-1 text-sm text-slate-700 ${pill ? "inline-flex min-h-8 min-w-[260px] items-center rounded-xl bg-slate-100 px-3" : ""}`}>{value}</div>
    </div>
  );
}

function FeedCard({ title, time, text }: { title: string; time: string; text: string }) {
  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-bold text-slate-500">{title}</h3>
            <span className="text-sm text-slate-400">{time}</span>
          </div>
          <p className="mt-3 text-sm text-slate-700">{text}</p>
        </div>
        <div className="h-7 w-7 rounded-full bg-slate-100" />
      </div>
    </article>
  );
}

function SmallMetric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`font-bold ${accent ? "text-emerald-600" : "text-slate-700"}`}>{value}</p>
    </div>
  );
}

function IconButton({ icon }: { icon: ReactNode }) {
  return <button className="hidden h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm transition hover:text-orange-600 sm:flex">{icon}</button>;
}
