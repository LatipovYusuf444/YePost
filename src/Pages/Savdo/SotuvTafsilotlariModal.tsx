import { useState, type ReactNode } from "react";
import {
  Bell,
  Building2,
  ChevronDown,
  ImageIcon,
  LoaderCircle,
  Lock,
  MessageSquare,
  Package,
  Plus,
  Search,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import type { Sotuv } from "@/types/savdo";
import {
  masulNomi,
  mijozNomi,
  pulniFormatlash,
  sananiFormatlash,
  sotuvHolati,
  sotuvHolatiMatni,
  sotuvRaqami,
  sotuvSummasi,
  tolovTuriMatni,
} from "./savdoYordamchilari";

type SotuvTafsilotlariModalProps = {
  sotuv: Sotuv;
  amalBajarilmoqda: boolean;
  onYopish: () => void;
  onTasdiqlash: (sotuvId: string) => void;
  onBekorQilish: (sotuvId: string) => void;
};

const tabs = ["Umumiy", "Tovarlar", "Takliflar", "Robotlar", "Hisob-fakturalar", "Aloqalar", "Tarix", "Bozor", "Ko'proq"];
const paymentMenu = ["Оплата", "Оплата и доставка", "Оплата через Терминал", "Доставка", "Реализация"];

function mijozTelefon(sotuv: Sotuv) {
  return sotuv.customer?.phone || sotuv.clientCompany?.phone || "—";
}

function mijozManzili(sotuv: Sotuv) {
  return sotuv.customer?.address || sotuv.clientCompany?.address || "—";
}

function mijozEmail(sotuv: Sotuv) {
  return sotuv.customer?.email || sotuv.clientCompany?.email || "";
}

function qisqaVaqt(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("uz-UZ", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function mahsulotNomi(item: NonNullable<Sotuv["items"]>[number]) {
  return item.modification?.product?.name ?? item.modification?.name ?? item.modificationId;
}

function mahsulotJami(item: NonNullable<Sotuv["items"]>[number]) {
  return item.quantity * item.price - Number(item.discount ?? 0);
}

export default function SotuvTafsilotlariModal({
  sotuv,
  amalBajarilmoqda,
  onYopish,
  onTasdiqlash,
  onBekorQilish,
}: SotuvTafsilotlariModalProps) {
  const holat = sotuvHolati(sotuv);
  const draft = holat === "DRAFT";
  const jami = sotuvSummasi(sotuv);
  const vaqt = qisqaVaqt(sotuv.createdAt) || "18:30";
  const sana = sananiFormatlash(sotuv.createdAt);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [realizationOpen, setRealizationOpen] = useState(false);

  return (
    <AppModal className="items-start justify-start bg-black/45 p-0 pl-[70px]">
      <section className="relative h-screen w-full overflow-hidden bg-[#eef3f6] text-[#303946] shadow-2xl">
        <div className="scrollbar-hidden h-full overflow-y-auto">
          <div className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#eef3f6]/95 px-6 py-4 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <h1 className="truncate text-2xl font-bold text-slate-900">{sotuvRaqami(sotuv)}</h1>
              <div className="flex shrink-0 items-center gap-2">
                <IconButton icon={<Settings size={17} />} />
                <button className="hidden h-9 items-center gap-2 rounded-lg bg-white px-3 text-sm text-slate-600 shadow-sm sm:inline-flex">
                  Hujjat <ChevronDown size={15} />
                </button>
                {draft && (
                  <button
                    disabled={amalBajarilmoqda}
                    onClick={() => onTasdiqlash(sotuv.id)}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    {amalBajarilmoqda ? <LoaderCircle size={16} className="animate-spin" /> : "Taklif"}
                    <ChevronDown size={15} />
                  </button>
                )}
                <button
                  onClick={onYopish}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm transition hover:bg-orange-500 hover:text-white"
                  aria-label="Yopish"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <nav className="mt-5 flex items-center gap-3 overflow-x-auto">
              {tabs.map((tab, index) => (
                <button
                  key={tab}
                  className={`shrink-0 rounded-lg px-3 py-2 text-sm transition ${
                    index === 0 ? "border border-sky-200 bg-white text-blue-600" : "text-slate-500 hover:bg-white hover:text-blue-600"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="grid gap-7 px-6 py-7 xl:grid-cols-[42%_32px_minmax(0,1fr)] 2xl:grid-cols-[40%_34px_minmax(0,1fr)]">
            <aside className="space-y-5">
              <DealCard
                sotuv={sotuv}
                jami={jami}
                holat={holat}
                draft={draft}
                amalBajarilmoqda={amalBajarilmoqda}
                onTasdiqlash={onTasdiqlash}
                onBekorQilish={onBekorQilish}
                onDeliveryOpen={() => setDeliveryOpen(true)}
                onRealizationOpen={() => setRealizationOpen(true)}
              />

              <section className="rounded-2xl bg-white p-5 shadow-sm">
                <CardTitle title="Qo'shimcha ma'lumotlar" action="o'zgartirish" />
                <Info label="Qaytarilgan savdo" value="Tanlanmagan" pill />
                <Info label="Mas'ul shaxs" value={masulNomi(sotuv)} />
                <Info label="Sana" value={sana} />
                <Info label="Qo'shimcha kommentariya" value={sotuv.note || "Kommentariya yo'q"} />
              </section>
            </aside>

            <TimelineRail />

            <main className="space-y-5">
              <ActivityComposer />
              <Divider label="Nima qilish kerak" green />
              <article className="flex items-center gap-4 rounded-2xl bg-yellow-50 p-5 text-slate-600 shadow-sm">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Plus size={21} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Biznes yarating</h3>
                  <p className="text-sm text-slate-500">Mijozni unutmaslik uchun bitimning keyingi bosqichini rejalashtiring</p>
                </div>
              </article>
              <Divider label="Bugun" />
              <FeedCard title="Hisoblash rejimi o'zgartirildi" time={vaqt} text={`Tovarlar narxiga asoslanib → ${pulniFormatlash(jami)}`} />
              <FeedCard title="Shartnoma tuzildi" time={vaqt} text={`${mijozNomi(sotuv)} uchun ${sotuvRaqami(sotuv)} sotuv yaratildi.`} />
              <ProductsCard sotuv={sotuv} />
            </main>
          </div>
        </div>

        {deliveryOpen && <DeliverySetupPanel sotuv={sotuv} jami={jami} onClose={() => setDeliveryOpen(false)} />}
        {realizationOpen && <RealizationPanel sotuv={sotuv} jami={jami} onClose={() => setRealizationOpen(false)} />}
      </section>
    </AppModal>
  );
}

function DealCard({
  sotuv,
  jami,
  holat,
  draft,
  amalBajarilmoqda,
  onTasdiqlash,
  onBekorQilish,
  onDeliveryOpen,
  onRealizationOpen,
}: {
  sotuv: Sotuv;
  jami: number;
  holat: ReturnType<typeof sotuvHolati>;
  draft: boolean;
  amalBajarilmoqda: boolean;
  onTasdiqlash: (sotuvId: string) => void;
  onBekorQilish: (sotuvId: string) => void;
  onDeliveryOpen: () => void;
  onRealizationOpen: () => void;
}) {
  const [paymentMenuOpen, setPaymentMenuOpen] = useState(false);
  const [selectedPaymentSection, setSelectedPaymentSection] = useState("Оплата и доставка");

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <CardTitle title="KELISHUV HAQIDA" action="o'zgartirish" />
      <Info label="Sahna" value={sotuvHolatiMatni[holat]} />

      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">Miqdori va valyutasi</p>
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
        <p className="text-sm text-slate-500">{selectedPaymentSection}</p>
        <p className="mt-3 text-sm text-slate-400">Здесь будет информация об оплатах, доставках и реализациях</p>
        <div className="mt-4 border-t border-slate-100 pt-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setPaymentMenuOpen((current) => !current)}
              className="text-sm text-blue-600 transition hover:text-blue-700 hover:underline"
            >
              Добавить
            </button>
            {paymentMenuOpen && (
              <div className="absolute left-0 top-7 z-40 w-[238px] rounded-[22px] bg-white py-3 shadow-[0_18px_50px_rgba(15,23,42,0.18)] ring-1 ring-slate-100">
                {paymentMenu.map((item) => {
                  const realization = item === "Реализация";
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setSelectedPaymentSection(item);
                        setPaymentMenuOpen(false);
                        if (item === "Доставка" || item === "Оплата и доставка") onDeliveryOpen();
                        if (realization) onRealizationOpen();
                      }}
                      className="flex h-11 w-full items-center gap-3 px-5 text-left text-[15px] text-slate-700 transition hover:bg-slate-50 hover:text-blue-600"
                    >
                      {realization && <Package size={15} className="text-sky-500" />}
                      <span>{item}</span>
                    </button>
                  );
                })}
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
          <div className="mt-6 flex justify-between text-sm text-slate-400">
            <span>Итого к оплате по сделке</span>
            <span>{pulniFormatlash(jami)}</span>
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
            Bo'limni o'chirish
          </button>
        )}
      </div>
    </section>
  );
}

function RealizationPanel({ sotuv, jami, onClose }: { sotuv: Sotuv; jami: number; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"general" | "products">("general");
  const [deliveryService, setDeliveryService] = useState("Без доставки");
  const [deliveryPrice, setDeliveryPrice] = useState("");
  const [deliveryComment, setDeliveryComment] = useState("");
  const items = sotuv.items ?? [];
  const holat = sotuvHolati(sotuv);
  const ombordanChiqqan = holat === "CONFIRMED";

  return (
    <div className="absolute inset-0 z-[60] bg-slate-900/45 backdrop-blur-[1px]">
      <div className="scrollbar-hidden ml-4 h-full overflow-y-auto rounded-l-3xl bg-[#eef3f6] px-6 py-7 shadow-2xl lg:ml-0">
        <div className="flex items-start justify-between gap-4 border-b border-slate-300/70 pb-6">
          <div>
            <h2 className="text-3xl font-semibold text-slate-900">Создание реализации</h2>
            <p className="mt-2 text-sm text-slate-500">
              Real sotuv hujjati: {sotuvRaqami(sotuv)} · {ombordanChiqqan ? "mahsulot ombordan chiqarilgan" : "tasdiqlanganda ombordan chiqadi"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="rounded-lg bg-white px-4 py-2 text-sm text-slate-600 shadow-sm transition hover:text-blue-600">Обратная связь</button>
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm transition hover:bg-sky-500 hover:text-white"
              aria-label="Realizatsiya oynasini yopish"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        <nav className="mt-7 flex items-center gap-8 text-[15px] font-semibold">
          <button
            onClick={() => setActiveTab("general")}
            className={`border-b-2 pb-2 transition ${activeTab === "general" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-blue-600"}`}
          >
            Общие
          </button>
          <button
            onClick={() => setActiveTab("products")}
            className={`border-b-2 pb-2 transition ${activeTab === "products" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-blue-600"}`}
          >
            Товары
          </button>
        </nav>

        <div className="mt-8 grid gap-6 xl:grid-cols-[42%_34px_minmax(0,1fr)] 2xl:grid-cols-[40%_36px_minmax(0,1fr)]">
          <aside className="space-y-4">
            {activeTab === "general" ? (
              <>
                <RealizationCard title="ОСНОВНОЕ">
                  <RealizationInput label="Клиент*" icon={<UserRound size={17} />} value={mijozNomi(sotuv)} />
                  <RealizationInput label="Телефон" value={mijozTelefon(sotuv)} prefix="🇺🇿" />
                  <RealizationInput label="E-mail" value={mijozEmail(sotuv)} placeholder="Email kiritilmagan" />
                  <RealizationInput label="Адрес" value={mijozManzili(sotuv)} icon={<Search size={18} />} />
                  <RealizationInput label="Реквизиты" placeholder="Укажите ИНН для автоматического заполнения" icon={<Search size={18} />} />
                  <button className="text-sm text-blue-600 underline underline-offset-4">Добавить</button>
                  <button className="block text-sm text-slate-500 underline underline-offset-4">+ Добавить участника</button>
                  <RealizationInput label="Компания" icon={<Building2 size={17} />} value={sotuv.clientCompany?.name || "Kompaniya tanlanmagan"} />
                </RealizationCard>

                <RealizationCard title="ДОСТАВКА">
                  <label className="block text-sm text-slate-400">
                    Служба доставки
                    <div className="mt-2 flex items-center gap-2">
                      <select
                        value={deliveryService}
                        onChange={(event) => setDeliveryService(event.target.value)}
                        className="h-12 flex-1 rounded-md border border-slate-300 bg-white px-3 text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      >
                        <option>Без доставки</option>
                        <option>Я Доставка</option>
                        <option>Kuryer orqali</option>
                        <option>Olib ketish</option>
                      </select>
                      <Settings size={18} className="text-slate-300" />
                    </div>
                  </label>
                  <div className="mt-4 flex items-end gap-4">
                    <div className="text-4xl font-light text-slate-700">0 so'm</div>
                    <button className="h-12 rounded-md border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-600 transition hover:border-blue-400 hover:text-blue-600">
                      обновить
                    </button>
                  </div>
                  <label className="mt-4 block text-sm text-slate-400">
                    Стоимость доставки для клиента
                    <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_180px]">
                      <input
                        value={deliveryPrice}
                        onChange={(event) => setDeliveryPrice(event.target.value)}
                        inputMode="numeric"
                        placeholder="0"
                        className="h-12 rounded-md border border-slate-300 bg-white px-3 text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      />
                      <select className="h-12 rounded-md border border-slate-300 bg-white px-3 text-slate-500 outline-none">
                        <option>so'm</option>
                      </select>
                    </div>
                  </label>
                  <label className="mt-4 block text-sm text-slate-400">
                    Комментарий
                    <input
                      value={deliveryComment}
                      onChange={(event) => setDeliveryComment(event.target.value)}
                      className="mt-2 h-12 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                  </label>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <button className="text-slate-500">Выбрать поле <ChevronDown size={14} className="inline" /></button>
                    <button className="text-red-500 underline underline-offset-4">Удалить раздел</button>
                  </div>
                </RealizationCard>

                <RealizationCard title="СВОЙСТВА ДОСТАВКИ" />
                <RealizationProductsMini sotuv={sotuv} ombordanChiqqan={ombordanChiqqan} />
                <RealizationCard title="ДОПОЛНИТЕЛЬНО">
                  <RealizationInput label="Ответственный" icon={<UserRound size={17} />} value={masulNomi(sotuv)} />
                  <button className="mt-4 text-sm text-slate-500">Выбрать поле <ChevronDown size={14} className="inline" /></button>
                </RealizationCard>
              </>
            ) : (
              <RealizationProductsFull sotuv={sotuv} ombordanChiqqan={ombordanChiqqan} />
            )}
          </aside>

          <TimelineRail />

          <main className="space-y-5">
            <section className="rounded-2xl bg-white/80 p-5 shadow-sm">
              <nav className="flex flex-wrap items-center gap-5 text-slate-500">
                <button className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-blue-600">Комментарий</button>
                <button>Маркетплейс</button>
                <button className="inline-flex items-center gap-1">Еще <ChevronDown size={14} /></button>
              </nav>
              <p className="mt-7 text-sm text-slate-700">Оставьте комментарий</p>
            </section>

            <Divider label="Сегодня" />
            <article className="rounded-2xl bg-white/80 p-5 text-slate-700 shadow-sm">
              Прямо сейчас вы создаёте документ реализации для клиента {mijozNomi(sotuv)}.
            </article>
            <article className="rounded-2xl bg-white/80 p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white ${ombordanChiqqan ? "bg-emerald-500" : "bg-amber-400"}`}>
                  <Package size={20} />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-slate-700">
                    {ombordanChiqqan ? "Ombor realizatsiyasi bajarilgan" : "Realizatsiya tasdiqlanishi kutilmoqda"}
                  </h3>
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

function RealizationCard({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <h3 className="text-xs font-black uppercase tracking-wide text-slate-600">{title}</h3>
        <button className="text-xs uppercase tracking-wide text-slate-400">отменить</button>
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function RealizationInput({
  label,
  value,
  placeholder,
  icon,
  prefix,
}: {
  label: string;
  value?: string;
  placeholder?: string;
  icon?: ReactNode;
  prefix?: string;
}) {
  return (
    <label className="block text-sm text-slate-400">
      {label}
      <div className="mt-2 flex h-12 items-center gap-3 rounded-md border border-slate-300 bg-white px-3 text-slate-700">
        {prefix && <span className="shrink-0">{prefix}</span>}
        <span className={`min-w-0 flex-1 truncate ${value ? "" : "text-slate-300"}`}>{value || placeholder || "—"}</span>
        {icon}
      </div>
    </label>
  );
}

function RealizationProductsMini({ sotuv, ombordanChiqqan }: { sotuv: Sotuv; ombordanChiqqan: boolean }) {
  return (
    <RealizationCard title="ТОВАРЫ">
      <div className="rounded-md border border-dashed border-blue-200 bg-blue-50/30 p-3">
        <button className="text-sm font-semibold text-blue-600">+ добавить</button>
      </div>
      <div className="space-y-2">
        {(sotuv.items ?? []).map((item, index) => (
          <div key={item.id ?? `${item.modificationId}-${index}`} className="rounded-xl bg-slate-50 p-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-700">{mahsulotNomi(item)}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {item.quantity} dona × {pulniFormatlash(item.price)}
                </p>
              </div>
              <span className={`rounded-full px-2 py-1 text-xs font-bold ${ombordanChiqqan ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {ombordanChiqqan ? "Ombordan chiqdi" : "Kutilmoqda"}
              </span>
            </div>
          </div>
        ))}
        {(sotuv.items ?? []).length === 0 && <p className="text-sm text-slate-400">Tovarlar mavjud emas</p>}
      </div>
    </RealizationCard>
  );
}

function RealizationProductsFull({ sotuv, ombordanChiqqan }: { sotuv: Sotuv; ombordanChiqqan: boolean }) {
  return (
    <RealizationCard title="ТОВАРЫ">
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="grid grid-cols-[1fr_90px_130px_140px_130px] bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
          <span>Tovar</span>
          <span>Miqdor</span>
          <span>Narx</span>
          <span>Jami</span>
          <span>Holat</span>
        </div>
        {(sotuv.items ?? []).map((item, index) => (
          <div key={item.id ?? `${item.modificationId}-${index}`} className="grid grid-cols-[1fr_90px_130px_140px_130px] items-center border-t border-slate-100 px-4 py-3 text-sm">
            <span className="font-semibold text-slate-700">{mahsulotNomi(item)}</span>
            <span>{item.quantity}</span>
            <span>{pulniFormatlash(item.price)}</span>
            <span className="font-bold text-emerald-600">{pulniFormatlash(mahsulotJami(item))}</span>
            <span className={`rounded-full px-2 py-1 text-center text-xs font-bold ${ombordanChiqqan ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {ombordanChiqqan ? "Chiqdi" : "Kutilmoqda"}
            </span>
          </div>
        ))}
        {(sotuv.items ?? []).length === 0 && <p className="p-5 text-center text-sm text-slate-400">Tovarlar mavjud emas</p>}
      </div>
    </RealizationCard>
  );
}

function DeliverySetupPanel({ sotuv, jami, onClose }: { sotuv: Sotuv; jami: number; onClose: () => void }) {
  const items = sotuv.items ?? [];

  return (
    <div className="absolute inset-0 z-50 bg-blue-950/70 backdrop-blur-[1px]">
      <button
        onClick={onClose}
        className="absolute left-[280px] top-7 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-sky-500 text-white shadow-xl hover:bg-sky-600"
        aria-label="Yetkazib berish oynasini yopish"
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
            <span className="inline-flex rounded-full bg-slate-500 px-4 py-1.5 text-sm font-bold text-white">Yetkazib berish</span>
            <div className="h-px bg-slate-300" />
            {["Kompaniya aloqalarini taqdim ...", "Skript taklif qiling", "U qanday ishlaydi", "Buyurtmani sozlash"].map((item) => (
              <button key={item} className="block text-left text-sm text-slate-500 hover:text-sky-600">
                {item}
              </button>
            ))}
          </aside>

          <main className="space-y-3">
            <DeliveryStep number={1} active title="Tovarlar">
              <div className="mt-6 flex items-center gap-6 text-sm">
                <button className="text-blue-600 underline underline-offset-4">Qo'shish</button>
                <button className="text-slate-500">Katalogdan tanlang</button>
                <button className="ml-auto text-slate-500 underline underline-offset-4">Kuyish</button>
              </div>
              <div className="mt-8 space-y-4">
                {items.length > 0 ? (
                  items.map((item, index) => (
                    <div key={item.id ?? `${item.modificationId}-${index}`} className="grid gap-5 lg:grid-cols-[1fr_84px_120px_90px_120px]">
                      <label className="text-sm text-slate-600">
                        Ism
                        <div className="mt-2 flex h-12 items-center rounded-md border border-slate-300 bg-white px-3">
                          <span className="min-w-0 flex-1 truncate text-slate-600">{mahsulotNomi(item)}</span>
                          <Search size={19} className="text-slate-500" />
                        </div>
                      </label>
                      <div className="mt-7 flex h-12 items-center justify-center rounded-md border border-dashed border-slate-300 text-slate-400">
                        <ImageIcon size={20} />
                      </div>
                      <DeliveryField label="Narxi" value={pulniFormatlash(item.price)} />
                      <DeliveryField label="Miqdori" value={String(item.quantity)} />
                      <DeliveryField label="Natija" value={pulniFormatlash(mahsulotJami(item))} />
                    </div>
                  ))
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-400">Tovarlar mavjud emas</p>
                )}
              </div>
              <div className="mt-10 border-t border-slate-200 pt-8">
                <div className="ml-auto max-w-md space-y-4 text-right text-slate-600">
                  <p>
                    Tovarlarning umumiy miqdori: <span className="ml-8">{pulniFormatlash(jami)}</span>
                  </p>
                  <p className="text-lime-700">
                    Mijozning foydasi quyidagilar edi: <span className="ml-8">0 so'm</span>
                  </p>
                  <div className="border-t border-slate-200 pt-4 text-2xl font-bold">
                    Tovarlar uchun jami: <span className="ml-8">{pulniFormatlash(jami)}</span>
                  </div>
                </div>
              </div>
            </DeliveryStep>

            <DeliveryStep number={2} title="Yetkazib berish">
              <div className="mt-8 grid max-w-2xl gap-4 md:grid-cols-2">
                <div className="flex h-36 items-center justify-center rounded-xl bg-white shadow-sm">
                  <span className="text-2xl font-black text-orange-600">Я Доставка</span>
                </div>
                <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400">
                  <Plus size={30} />
                  <span className="mt-2 font-semibold">Tavsiya qiling</span>
                </div>
              </div>
            </DeliveryStep>

            <DeliveryStep number={3} green title="Avtomatlashtirish">
              <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                <span>Yetkazib berish tugagandan keyingi harakatlar</span>
                <button className="rounded-full bg-sky-400 px-6 py-3 text-white">Hozirgi bosqichda qoldiring</button>
              </div>
            </DeliveryStep>
          </main>
        </div>
      </div>
    </div>
  );
}

function DeliveryStep({ number, title, children, active, green }: { number: number; title: string; children: ReactNode; active?: boolean; green?: boolean }) {
  return (
    <section className="relative rounded-xl bg-white p-6 shadow-sm">
      <span className={`absolute -left-5 top-5 flex h-10 w-10 items-center justify-center rounded-full font-bold text-white ${green ? "bg-lime-500" : active ? "bg-cyan-400" : "bg-slate-300"}`}>
        {number}
      </span>
      <h3 className="border-b border-slate-200 pb-5 text-2xl text-slate-700">{title}</h3>
      {children}
    </section>
  );
}

function DeliveryField({ label, value }: { label: string; value: string }) {
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
              <p className="mt-1 truncate text-xs text-slate-400">{item.modificationId}</p>
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

function ActivityComposer() {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <nav className="mb-5 flex flex-wrap items-center gap-5 text-sm text-slate-500">
        <button className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-blue-600">Ish</button>
        <button>Izoh</button>
        <button>Xabar</button>
        <button className="inline-flex items-center gap-1">
          <Lock size={13} /> Onlayn ro'yxatdan o'tish
        </button>
        <button className="inline-flex items-center gap-1">
          <Lock size={13} /> Vazifa
        </button>
        <button className="inline-flex items-center gap-1">
          <Lock size={13} /> Slotlar
        </button>
        <button className="inline-flex items-center gap-1">
          Ko'proq <ChevronDown size={14} />
        </button>
      </nav>
      <div className="flex h-14 items-center justify-between rounded-xl border border-slate-200 px-5 text-slate-400">
        <span>Nima qilish kerak</span>
        <span className="text-xs text-slate-500">
          harakatlar <ChevronDown size={13} className="inline" />
        </span>
      </div>
    </section>
  );
}

function TimelineRail() {
  return (
    <div className="hidden flex-col items-center xl:flex">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-400 text-white">
        <MessageSquare size={18} />
      </div>
      <div className="h-32 w-px bg-slate-300" />
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">
        <Bell size={18} />
      </div>
      <div className="h-28 w-px bg-slate-300" />
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
        <Package size={17} />
      </div>
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
  return <button className="hidden h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm transition hover:text-orange-600 sm:flex">{icon}</button>;
}
