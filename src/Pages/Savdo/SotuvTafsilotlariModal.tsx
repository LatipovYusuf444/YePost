import {
  Bell,
  Check,
  ChevronDown,
  FileText,
  LoaderCircle,
  MessageSquare,
  PackageCheck,
  Printer,
  Settings,
  ShieldCheck,
  Trash2,
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

const tablar = ["Asosiy", "Savatcha", "Tarix", "Bekor qilish", "Qaytarish"];

function mijozManzili(sotuv: Sotuv) {
  return sotuv.customer?.address || sotuv.clientCompany?.address || "Manzil kiritilmagan";
}

function mijozTelefon(sotuv: Sotuv) {
  return sotuv.customer?.phone || sotuv.clientCompany?.phone || "Telefon kiritilmagan";
}

function qisqaVaqt(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function mahsulotNomi(item: NonNullable<Sotuv["items"]>[number]) {
  return (
    item.modification?.product?.name ??
    item.modification?.name ??
    item.modificationId
  );
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
  const sana = sananiFormatlash(sotuv.createdAt);
  const vaqt = qisqaVaqt(sotuv.createdAt);

  return (
    <AppModal className="items-start justify-start p-0 pl-[70px] sm:py-5 sm:pr-5">
      <section className="relative flex h-screen w-full max-w-[calc(100vw-92px)] flex-col overflow-hidden bg-[#dedede] shadow-2xl sm:h-[90vh] sm:rounded-[10px] 2xl:h-[92vh]">
        <div className="absolute left-0 top-14 z-20 hidden flex-col gap-2 lg:flex">
          <button
            onClick={onYopish}
            className="flex h-9 w-10 items-center justify-center rounded-r-xl bg-orange-500 text-white shadow-lg transition hover:bg-orange-600"
            aria-label="Yopish"
          >
            <X size={18} />
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex h-9 w-10 items-center justify-center rounded-r-xl bg-orange-500 text-white shadow-lg transition hover:bg-orange-600"
            aria-label="Chop etish"
          >
            <Printer size={17} />
          </button>
        </div>

        <header className="flex shrink-0 items-center justify-between border-b border-black/5 bg-[#dedede] px-6 py-3 lg:px-16">
          <nav className="flex min-w-0 items-center gap-2 overflow-x-auto">
            {tablar.map((tab, index) => (
              <button
                key={tab}
                className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] transition ${
                  index === 0
                    ? "border border-orange-500 bg-white text-orange-600"
                    : "text-gray-600 hover:bg-white/70 hover:text-orange-600"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <button className="hidden h-9 w-9 items-center justify-center rounded-lg bg-white text-gray-600 shadow-sm transition hover:text-orange-600 sm:flex">
              <Settings size={18} />
            </button>
            <button className="hidden h-9 items-center gap-2 rounded-lg bg-white px-3 text-sm text-gray-600 shadow-sm transition hover:text-orange-600 sm:flex">
              <FileText size={16} />
              Hujjatlar
              <ChevronDown size={16} />
            </button>
            <button
              onClick={onYopish}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-gray-600 shadow-sm transition hover:bg-orange-500 hover:text-white lg:hidden"
              aria-label="Yopish"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="scrollbar-hidden grid flex-1 gap-6 overflow-y-auto p-4 lg:grid-cols-[42%_minmax(0,1fr)] lg:p-6 lg:pl-16 xl:grid-cols-[40%_minmax(0,1fr)] 2xl:grid-cols-[38%_minmax(0,1fr)]">
          <aside className="space-y-5">
            <section className="rounded-md bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="text-base font-bold text-gray-950">Savdo</h2>
                <span className="text-xs text-gray-500">Tahrirlash</span>
              </div>

              <div className="mt-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500">Summa</p>
                  <h3 className="mt-1 text-xl font-bold text-gray-700">
                    {pulniFormatlash(jami)}
                  </h3>
                </div>
                {draft ? (
                  <button
                    disabled={amalBajarilmoqda}
                    onClick={() => onTasdiqlash(sotuv.id)}
                    className="mt-4 inline-flex h-8 items-center gap-2 rounded-md bg-emerald-700 px-3 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {amalBajarilmoqda ? (
                      <LoaderCircle size={15} className="animate-spin" />
                    ) : (
                      <PackageCheck size={15} />
                    )}
                    To'lov qabul qilish
                  </button>
                ) : (
                  <span className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                    {sotuvHolatiMatni[holat]}
                  </span>
                )}
              </div>

              <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-700">To'lov va yetkazib berish</p>
                <p className="mt-1 text-xs text-gray-500">
                  To'lov, yetkazib berish haqida ma'lumot
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(sotuv.payments ?? []).length > 0 ? (
                    sotuv.payments?.map((tolov, index) => (
                      <span
                        key={tolov.id ?? `${tolov.paymentType}-${index}`}
                        className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-blue-700"
                      >
                        {tolovTuriMatni[tolov.paymentType]}: {pulniFormatlash(tolov.amount)}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-blue-700">
                      Qo'shish
                    </span>
                  )}
                </div>
              </div>

              <InfoBlock title="Kontragent" value={mijozNomi(sotuv)} />
              <InfoBlock title="Telefon" value={mijozTelefon(sotuv)} />
              <InfoBlock title="Manzil" value={mijozManzili(sotuv)} />

              <div className="mt-6 flex flex-wrap justify-between gap-3 text-[11px] text-gray-500">
                <span>Maydon tanlash</span>
                <span>Maydon yaratish</span>
                <span>Bo'limni o'chirish</span>
              </div>
            </section>

            <section className="rounded-md bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="font-bold text-gray-950">Qo'shimcha ma'lumotlar</h2>
                <span className="text-xs text-gray-500">Tahrirlash</span>
              </div>
              <InfoBlock title="Sotuv raqami" value={sotuvRaqami(sotuv)} />
              <InfoBlock title="Holati" value={sotuvHolatiMatni[holat]} />
              <InfoBlock title="Mas'ul shaxs" value={masulNomi(sotuv)} />
              <InfoBlock title="Sana" value={sana} />
              <InfoBlock title="Qo'shimcha kommentariya" value={sotuv.note || "Kommentariya yo'q"} />

              {draft && (
                <button
                  disabled={amalBajarilmoqda}
                  onClick={() => onBekorQilish(sotuv.id)}
                  className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-red-50 px-4 text-sm font-bold text-red-600 transition hover:bg-red-500 hover:text-white disabled:opacity-50"
                >
                  <Trash2 size={16} />
                  Sotuvni bekor qilish
                </button>
              )}
            </section>
          </aside>

          <main className="space-y-5">
            <section className="rounded-md bg-white p-5 shadow-sm">
              <nav className="mb-4 flex flex-wrap items-center gap-6 text-[13px] text-gray-500">
                <button className="rounded-full border border-orange-500 px-3 py-1 text-orange-600">
                  Vazifa
                </button>
                <button>Kommentariya</button>
                <button>Xabarnoma</button>
                <button className="inline-flex items-center gap-1">
                  Qo'shimcha <ShieldCheck size={13} />
                </button>
              </nav>

              <select className="h-11 w-full rounded-md border border-gray-200 bg-white px-4 text-sm text-gray-600 outline-none focus:border-orange-400">
                <option>Nima qilish kerak</option>
                <option>Mijozga qo'ng'iroq qilish</option>
                <option>Yetkazib berishni tekshirish</option>
                <option>To'lovni tasdiqlash</option>
              </select>
            </section>

            <div className="flex items-center justify-between">
              <span className="mx-auto rounded-full border border-emerald-500 bg-emerald-50 px-12 py-1.5 text-[13px] text-emerald-700">
                Bugun
              </span>
              <button className="rounded-full bg-white px-5 py-2 text-[13px] text-gray-600 shadow-sm">
                Filtr
              </button>
            </div>

            <TimelineCard
              icon={<Check size={20} />}
              rang="bg-yellow-400 text-white"
              title="Vazifa"
              time={vaqt || "Hozir"}
              text={`Sotuv ${sotuvRaqami(sotuv)} bo'yicha mijoz: ${mijozNomi(sotuv)}. Summa: ${pulniFormatlash(jami)}.`}
            />
            <TimelineCard
              icon={<MessageSquare size={18} />}
              rang="bg-blue-600 text-white"
              title="Kommentariya"
              time={vaqt || "14:00"}
              text={sotuv.note || "Sotuv tafsilotlari backenddan real yuklandi."}
            />
            <TimelineCard
              icon={<Bell size={17} />}
              rang="bg-green-500 text-white"
              title="Xabarnoma"
              time={sana}
              text={`${sotuvHolatiMatni[holat]} holatidagi sotuv. Mahsulotlar soni: ${(sotuv.items ?? []).length}.`}
            />

            <section className="rounded-[20px] bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-base font-bold text-gray-800">Mahsulotlar</h3>
              <div className="space-y-3">
                {(sotuv.items ?? []).map((item, index) => (
                  <div
                    key={item.id ?? `${item.modificationId}-${index}`}
                    className="grid gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3 text-[13px] md:grid-cols-[1fr_80px_120px_120px]"
                  >
                    <div>
                      <p className="font-bold text-gray-900">{mahsulotNomi(item)}</p>
                      <p className="mt-1 text-xs text-gray-500">{item.modificationId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Miqdor</p>
                      <p className="font-bold">{item.quantity}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Narx</p>
                      <p className="font-bold">{pulniFormatlash(item.price)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Jami</p>
                      <p className="font-bold text-emerald-700">
                        {pulniFormatlash(item.quantity * item.price - Number(item.discount ?? 0))}
                      </p>
                    </div>
                  </div>
                ))}
                {(sotuv.items ?? []).length === 0 && (
                  <p className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-400">
                    Mahsulot ma'lumoti mavjud emas
                  </p>
                )}
              </div>
            </section>
          </main>
        </div>
      </section>
    </AppModal>
  );
}

function InfoBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="mt-4">
      <p className="text-sm text-gray-500">{title}</p>
      <div className="mt-1 inline-flex min-h-8 min-w-[240px] max-w-full items-center rounded-xl bg-gray-100 px-3 text-sm text-gray-700">
        {value}
      </div>
    </div>
  );
}

function TimelineCard({
  icon,
  rang,
  title,
  time,
  text,
}: {
  icon: React.ReactNode;
  rang: string;
  title: string;
  time: string;
  text: string;
}) {
  return (
    <article className="flex gap-4 rounded-[20px] bg-white p-5 shadow-sm">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${rang}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
          <span className="text-gray-400">|</span>
          <span className="text-xs text-gray-500">{time}</span>
        </div>
        <p className="mt-2 line-clamp-3 text-[13px] leading-6 text-gray-600">{text}</p>
      </div>
    </article>
  );
}
