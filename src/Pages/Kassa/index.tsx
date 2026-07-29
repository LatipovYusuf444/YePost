import AppSelect from "@/Components/ui/AppSelect";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowDownCircle,
  Banknote,
  Edit3,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { useFinanceStore } from "@/store/financeStore";
import type {
  KassaKirim,
  KassaKirimManbasi,
  KassaKirimSaqlash,
  Qarz,
  QarzSaqlash,
  QarzYonlishi,
  TolovUsuli,
  Xarajat,
  XarajatKategoriyasi,
  XarajatSaqlash,
} from "@/types/finance";

type Tab = "xarajatlar" | "qarzlar" | "kirimlar";
type ModalItem =
  | { tur: "xarajat"; item: Xarajat | "new" }
  | { tur: "qarz"; item: Qarz | "new" }
  | { tur: "kirim"; item: KassaKirim | "new" };

const tablar: Array<{ id: Tab; nom: string; izoh: string; icon: typeof Banknote }> = [
  {
    id: "xarajatlar",
    nom: "Xarajatlar",
    izoh: "Oylik, ijara, marketing va boshqa chiqimlar.",
    icon: ArrowDownCircle,
  },
  {
    id: "qarzlar",
    nom: "Qarzlar",
    izoh: "Olingan va berilgan qarzlar nazorati.",
    icon: WalletCards,
  },
  {
    id: "kirimlar",
    nom: "Kassaga kirim",
    izoh: "Ega, investor yoki boshqa manbalardan kirim.",
    icon: Banknote,
  },
];

const xarajatMatni: Record<XarajatKategoriyasi, string> = {
  SALARY: "Oylik maosh",
  RENT: "Ijara",
  UTILITIES: "Kommunal",
  LOGISTICS: "Logistika",
  MARKETING: "Marketing",
  OTHER: "Boshqa",
};

const tolovMatni: Record<TolovUsuli, string> = {
  CASH: "Naqd",
  CARD: "Karta",
  BANK: "Bank",
};

const qarzYonlishiMatni: Record<QarzYonlishi, string> = {
  INCOMING: "Olingan qarz",
  OUTGOING: "Berilgan qarz",
};

const kassaKirimManbasiMatni: Record<KassaKirimManbasi, string> = {
  OWNER: "Ega mablag'i",
  INVESTOR: "Investor",
  LOAN: "Qarz",
  OTHER: "Boshqa",
};

function pul(value?: number | string) {
  return `${Number(value ?? 0).toLocaleString("uz-UZ")} so'm`;
}

function sana(value?: string | null) {
  if (!value) return "вЂ”";
  return new Date(value).toLocaleDateString("uz-UZ");
}

function bugun() {
  return new Date().toISOString().slice(0, 10);
}

function toDateInput(value?: string | null) {
  if (!value) return bugun();
  return new Date(value).toISOString().slice(0, 10);
}

export default function Kassa() {
  const store = useFinanceStore();
  const yuklash = store.yuklash;
  const [tab, setTab] = useState<Tab>("xarajatlar");
  const [qidiruv, setQidiruv] = useState("");
  const [modal, setModal] = useState<ModalItem | null>(null);

  useEffect(() => {
    void yuklash();
  }, [yuklash]);

  const xarajatlar = useMemo(() => {
    const q = qidiruv.trim().toLowerCase();
    if (!q) return store.xarajatlar;
    return store.xarajatlar.filter((item) =>
      [
        xarajatMatni[item.category as XarajatKategoriyasi] ?? item.category,
        item.amount,
        item.note,
        item.branch?.name,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [qidiruv, store.xarajatlar]);

  const qarzlar = useMemo(() => {
    const q = qidiruv.trim().toLowerCase();
    if (!q) return store.qarzlar;
    return store.qarzlar.filter((item) =>
      [item.counterparty, item.amount, item.note, item.direction]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [qidiruv, store.qarzlar]);

  const kirimlar = useMemo(() => {
    const q = qidiruv.trim().toLowerCase();
    if (!q) return store.kassaKirimlari;
    return store.kassaKirimlari.filter((item) =>
      [
        kassaKirimManbasiMatni[item.source as KassaKirimManbasi] ?? item.source,
        item.amount,
        item.note,
        item.branch?.name,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [qidiruv, store.kassaKirimlari]);

  const chiqimJami = store.xarajatlar.reduce((sum, item) => sum + Number(item.amount), 0);
  const qarzJami = store.qarzlar
    .filter((item) => !item.isReturned)
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const kirimJami = store.kassaKirimlari.reduce(
    (sum, item) => sum + Number(item.amount),
    0
  );

  async function ochirish() {
    if (!modal || modal.item === "new") return;
    const ok =
      modal.tur === "xarajat"
        ? await store.xarajatOchirish(modal.item.id)
        : modal.tur === "qarz"
          ? await store.qarzOchirish(modal.item.id)
          : await store.kassaKirimOchirish(modal.item.id);
    if (ok) setModal(null);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-orange-500">
            Moliya va kassa
          </p>
          <h1 className="mt-1 text-3xl font-black text-gray-950">Kassa boshqaruvi</h1>
          <p className="mt-1 text-sm text-gray-500">
            Xarajatlar, qarzlar va kassaga kirim amallari real backend bilan ulangan.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => void yuklash()}
            disabled={store.yuklanmoqda}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 font-bold text-gray-600 shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={17} className={store.yuklanmoqda ? "animate-spin" : ""} />
            Yangilash
          </button>
          <button
            onClick={() =>
              setModal({
                tur: tab === "xarajatlar" ? "xarajat" : tab === "qarzlar" ? "qarz" : "kirim",
                item: "new",
              })
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 font-black text-white shadow-lg shadow-orange-200"
          >
            <Plus size={17} />
            {tab === "xarajatlar"
              ? "Xarajat qo'shish"
              : tab === "qarzlar"
                ? "Qarz qo'shish"
                : "Kirim qo'shish"}
          </button>
        </div>
      </header>

      {store.xatolik && (
        <div className="flex justify-between rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
          <span>{store.xatolik}</span>
          <button onClick={store.xatolikniTozalash}>Yopish</button>
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-3">
        <StatCard title="Jami xarajat" value={pul(chiqimJami)} tone="red" />
        <StatCard title="Qaytarilmagan qarzlar" value={pul(qarzJami)} tone="amber" />
        <StatCard title="Kassaga kirim" value={pul(kirimJami)} tone="green" />
      </section>

      <nav className="grid gap-3 lg:grid-cols-3">
        {tablar.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`rounded-[24px] border p-5 text-left transition hover:-translate-y-0.5 ${
                active
                  ? "border-orange-200 bg-orange-500 text-white shadow-lg shadow-orange-200"
                  : "border-orange-100 bg-white text-gray-700 hover:bg-orange-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                    active ? "bg-white/20" : "bg-orange-50 text-orange-600"
                  }`}
                >
                  <Icon size={22} />
                </span>
                <div>
                  <h2 className="font-black">{item.nom}</h2>
                  <p className={`mt-1 text-sm ${active ? "text-white/80" : "text-gray-500"}`}>
                    {item.izoh}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </nav>

      <section className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row">
          <label className="flex h-11 max-w-xl flex-1 items-center gap-2 rounded-2xl border border-gray-200 px-4">
            <Search size={17} className="text-gray-400" />
            <input
              value={qidiruv}
              onChange={(event) => setQidiruv(event.target.value)}
              className="min-w-0 flex-1 outline-none"
              placeholder="Qidirish..."
            />
          </label>
        </div>

        {store.yuklanmoqda ? (
          <div className="flex h-72 items-center justify-center">
            <LoaderCircle className="animate-spin text-orange-500" size={34} />
          </div>
        ) : tab === "xarajatlar" ? (
          <XarajatlarJadvali items={xarajatlar} onEdit={(item) => setModal({ tur: "xarajat", item })} />
        ) : tab === "qarzlar" ? (
          <QarzlarJadvali items={qarzlar} onEdit={(item) => setModal({ tur: "qarz", item })} />
        ) : (
          <KirimlarJadvali items={kirimlar} onEdit={(item) => setModal({ tur: "kirim", item })} />
        )}
      </section>

      {modal && (
        <FinanceModal
          modal={modal}
          onClose={() => setModal(null)}
          onDelete={() => void ochirish()}
        />
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: "red" | "amber" | "green";
}) {
  const color =
    tone === "red"
      ? "bg-red-50 text-red-600"
      : tone === "amber"
        ? "bg-amber-50 text-amber-600"
        : "bg-emerald-50 text-emerald-600";
  return (
    <article className="rounded-[24px] border border-orange-100 bg-white p-5 shadow-sm">
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${color}`}>
        <Banknote size={22} />
      </div>
      <p className="mt-4 text-sm font-bold text-gray-400">{title}</p>
      <h2 className="mt-1 text-2xl font-black text-gray-950">{value}</h2>
    </article>
  );
}

function XarajatlarJadvali({
  items,
  onEdit,
}: {
  items: Xarajat[];
  onEdit: (item: Xarajat) => void;
}) {
  return (
    <FinanceTable empty="Xarajatlar mavjud emas">
      {items.map((item) => (
        <tr key={item.id} className="hover:bg-orange-50/50">
          <td className="px-5 py-4 font-bold text-orange-600">{item.id.slice(0, 8)}</td>
          <td className="px-5 py-4">{xarajatMatni[item.category as XarajatKategoriyasi] ?? item.category}</td>
          <td className="px-5 py-4 font-black">{pul(item.amount)}</td>
          <td className="px-5 py-4">{tolovMatni[item.paymentMethod as TolovUsuli] ?? item.paymentMethod ?? "Naqd"}</td>
          <td className="px-5 py-4">{sana(item.date ?? item.createdAt)}</td>
          <td className="px-5 py-4">{item.branch?.name ?? "Biriktirilmagan"}</td>
          <td className="px-5 py-4 text-right">
            <button onClick={() => onEdit(item)} className="inline-flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-xs font-bold text-orange-600">
              <Edit3 size={14} /> Tahrirlash
            </button>
          </td>
        </tr>
      ))}
      {items.length === 0 && <EmptyRow />}
    </FinanceTable>
  );
}

function QarzlarJadvali({ items, onEdit }: { items: Qarz[]; onEdit: (item: Qarz) => void }) {
  return (
    <FinanceTable empty="Qarzlar mavjud emas">
      {items.map((item) => (
        <tr key={item.id} className="hover:bg-orange-50/50">
          <td className="px-5 py-4 font-bold text-orange-600">{item.id.slice(0, 8)}</td>
          <td className="px-5 py-4">{qarzYonlishiMatni[item.direction as QarzYonlishi] ?? item.direction}</td>
          <td className="px-5 py-4 font-bold">{item.counterparty}</td>
          <td className="px-5 py-4 font-black">{pul(item.amount)}</td>
          <td className="px-5 py-4">{sana(item.dueDate)}</td>
          <td className="px-5 py-4">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.isReturned ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
              {item.isReturned ? "Qaytarilgan" : "Ochiq"}
            </span>
          </td>
          <td className="px-5 py-4 text-right">
            <button onClick={() => onEdit(item)} className="inline-flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-xs font-bold text-orange-600">
              <Edit3 size={14} /> Tahrirlash
            </button>
          </td>
        </tr>
      ))}
      {items.length === 0 && <EmptyRow />}
    </FinanceTable>
  );
}

function KirimlarJadvali({
  items,
  onEdit,
}: {
  items: KassaKirim[];
  onEdit: (item: KassaKirim) => void;
}) {
  return (
    <FinanceTable empty="Kirimlar mavjud emas">
      {items.map((item) => (
        <tr key={item.id} className="hover:bg-orange-50/50">
          <td className="px-5 py-4 font-bold text-orange-600">{item.id.slice(0, 8)}</td>
          <td className="px-5 py-4">{kassaKirimManbasiMatni[item.source as KassaKirimManbasi] ?? item.source}</td>
          <td className="px-5 py-4 font-black">{pul(item.amount)}</td>
          <td className="px-5 py-4">{tolovMatni[item.paymentMethod as TolovUsuli] ?? item.paymentMethod ?? "Naqd"}</td>
          <td className="px-5 py-4">{sana(item.date ?? item.createdAt)}</td>
          <td className="px-5 py-4">{item.branch?.name ?? "Biriktirilmagan"}</td>
          <td className="px-5 py-4 text-right">
            <button onClick={() => onEdit(item)} className="inline-flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-xs font-bold text-orange-600">
              <Edit3 size={14} /> Tahrirlash
            </button>
          </td>
        </tr>
      ))}
      {items.length === 0 && <EmptyRow />}
    </FinanceTable>
  );
}

function FinanceTable({ children }: { children: React.ReactNode; empty: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-orange-100">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-orange-50 text-xs uppercase tracking-wide text-orange-900/60">
          <tr>
            <th className="px-5 py-4">ID</th>
            <th className="px-5 py-4">Turi</th>
            <th className="px-5 py-4">Ma'lumot</th>
            <th className="px-5 py-4">Summa / To'lov</th>
            <th className="px-5 py-4">Sana</th>
            <th className="px-5 py-4">Holati / Filial</th>
            <th className="px-5 py-4 text-right">Amal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-orange-100/70">{children}</tbody>
      </table>
    </div>
  );
}

function EmptyRow() {
  return (
    <tr>
      <td colSpan={7} className="px-6 py-16 text-center text-gray-400">
        Ma'lumot mavjud emas
      </td>
    </tr>
  );
}

function FinanceModal({
  modal,
  onClose,
  onDelete,
}: {
  modal: ModalItem;
  onClose: () => void;
  onDelete: () => void;
}) {
  const store = useFinanceStore();
  const editing = modal.item !== "new";
  const xarajat: Xarajat | null =
    modal.tur === "xarajat" && modal.item !== "new" ? modal.item : null;
  const qarz: Qarz | null =
    modal.tur === "qarz" && modal.item !== "new" ? modal.item : null;
  const kirim: KassaKirim | null =
    modal.tur === "kirim" && modal.item !== "new" ? modal.item : null;
  const joriy = xarajat ?? qarz ?? kirim;

  const [date, setDate] = useState(toDateInput(joriy?.date));
  const [branchId, setBranchId] = useState(xarajat?.branchId ?? kirim?.branchId ?? "");
  const [category, setCategory] = useState<XarajatKategoriyasi>(
    (xarajat?.category as XarajatKategoriyasi) ?? "OTHER"
  );
  const [direction, setDirection] = useState<QarzYonlishi>(
    (qarz?.direction as QarzYonlishi) ?? "OUTGOING"
  );
  const [source, setSource] = useState<KassaKirimManbasi>(
    (kirim?.source as KassaKirimManbasi) ?? "OTHER"
  );
  const [counterparty, setCounterparty] = useState(qarz?.counterparty ?? "");
  const [amount, setAmount] = useState(String(joriy?.amount ?? ""));
  const [paymentMethod, setPaymentMethod] = useState<TolovUsuli>(
    (joriy?.paymentMethod as TolovUsuli) ?? "CASH"
  );
  const [dueDate, setDueDate] = useState(toDateInput(qarz?.dueDate));
  const [isReturned, setIsReturned] = useState(Boolean(qarz?.isReturned));
  const [note, setNote] = useState(joriy?.note ?? "");

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    let ok = false;
    if (modal.tur === "xarajat") {
      const data: XarajatSaqlash = {
        branchId: branchId || undefined,
        date: new Date(`${date}T00:00:00Z`).toISOString(),
        category,
        amount: Number(amount),
        paymentMethod,
        note: note.trim() || undefined,
      };
      ok = await store.xarajatSaqlash(xarajat?.id ?? null, data);
    } else if (modal.tur === "qarz") {
      if (!counterparty.trim()) return;
      const data: QarzSaqlash = {
        date: new Date(`${date}T00:00:00Z`).toISOString(),
        direction,
        counterparty: counterparty.trim(),
        amount: Number(amount),
        paymentMethod,
        dueDate: dueDate ? new Date(`${dueDate}T00:00:00Z`).toISOString() : undefined,
        isReturned,
        note: note.trim() || undefined,
      };
      ok = await store.qarzSaqlash(qarz?.id ?? null, data);
    } else {
      const data: KassaKirimSaqlash = {
        branchId: branchId || undefined,
        date: new Date(`${date}T00:00:00Z`).toISOString(),
        source,
        amount: Number(amount),
        paymentMethod,
        note: note.trim() || undefined,
      };
      ok = await store.kassaKirimSaqlash(kirim?.id ?? null, data);
    }
    if (ok) onClose();
  }

  const title =
    modal.tur === "xarajat"
      ? editing
        ? "Xarajatni tahrirlash"
        : "Yangi xarajat"
      : modal.tur === "qarz"
        ? editing
          ? "Qarzni tahrirlash"
          : "Yangi qarz"
        : editing
          ? "Kirimni tahrirlash"
          : "Yangi kassa kirimi";

  return (
    <AppModal>
      <form
        onSubmit={save}
        className="scrollbar-hidden max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-[30px] bg-white p-7 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">
              Finance ma'lumotlari
            </p>
            <h2 className="mt-1 text-2xl font-black">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100 text-gray-600 hover:bg-orange-500 hover:text-white"
          >
            <X size={19} />
          </button>
        </div>

        {store.xatolik && (
          <div className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-600">
            {store.xatolik}
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold">
            Sana
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border px-4"
            />
          </label>

          {modal.tur !== "qarz" && (
            <label className="text-sm font-bold">
              Filial
              <AppSelect
                value={branchId}
                onChange={(event) => setBranchId(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border bg-white px-4"
              >
                <option value="">Filial tanlanmagan</option>
                {store.filiallar.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </AppSelect>
            </label>
          )}

          {modal.tur === "xarajat" && (
            <label className="text-sm font-bold">
              Xarajat turi *
              <AppSelect
                value={category}
                onChange={(event) => setCategory(event.target.value as XarajatKategoriyasi)}
                className="mt-2 h-12 w-full rounded-2xl border bg-white px-4"
              >
                {Object.entries(xarajatMatni).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </AppSelect>
            </label>
          )}

          {modal.tur === "qarz" && (
            <>
              <label className="text-sm font-bold">
                Qarz turi *
                <AppSelect
                  value={direction}
                  onChange={(event) => setDirection(event.target.value as QarzYonlishi)}
                  className="mt-2 h-12 w-full rounded-2xl border bg-white px-4"
                >
                  {Object.entries(qarzYonlishiMatni).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </AppSelect>
              </label>
              <label className="text-sm font-bold">
                Kontragent *
                <input
                  value={counterparty}
                  onChange={(event) => setCounterparty(event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border px-4"
                  placeholder="Kimdan yoki kimga"
                />
              </label>
            </>
          )}

          {modal.tur === "kirim" && (
            <label className="text-sm font-bold">
              Kirim manbasi *
              <AppSelect
                value={source}
                onChange={(event) => setSource(event.target.value as KassaKirimManbasi)}
                className="mt-2 h-12 w-full rounded-2xl border bg-white px-4"
              >
                {Object.entries(kassaKirimManbasiMatni).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </AppSelect>
            </label>
          )}

          <label className="text-sm font-bold">
            Summa *
            <input
              type="number"
              min="0"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border px-4"
              placeholder="0"
            />
          </label>

          <label className="text-sm font-bold">
            To'lov usuli
            <AppSelect
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value as TolovUsuli)}
              className="mt-2 h-12 w-full rounded-2xl border bg-white px-4"
            >
              {Object.entries(tolovMatni).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </AppSelect>
          </label>

          {modal.tur === "qarz" && (
            <>
              <label className="text-sm font-bold">
                Qaytarish muddati
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border px-4"
                />
              </label>
              <label className="flex items-center gap-3 rounded-2xl bg-orange-50 p-4 font-bold sm:mt-7">
                <input
                  type="checkbox"
                  checked={isReturned}
                  onChange={(event) => setIsReturned(event.target.checked)}
                  className="h-5 w-5 accent-orange-500"
                />
                Qarz qaytarilgan
              </label>
            </>
          )}

          <label className="text-sm font-bold sm:col-span-2">
            Izoh
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="mt-2 min-h-24 w-full rounded-2xl border p-4"
              placeholder="Qo'shimcha ma'lumot"
            />
          </label>
        </div>

        <div className="mt-7 flex flex-col justify-between gap-3 sm:flex-row">
          <div>
            {editing && (
              <button
                type="button"
                onClick={onDelete}
                disabled={store.amalBajarilmoqda}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-red-50 px-5 font-bold text-red-600 disabled:opacity-50"
              >
                <Trash2 size={16} />
                O'chirish
              </button>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-2xl bg-gray-100 px-5 font-bold"
            >
              Bekor qilish
            </button>
            <button
              disabled={store.amalBajarilmoqda}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-6 font-black text-white disabled:opacity-50"
            >
              {store.amalBajarilmoqda && (
                <LoaderCircle size={16} className="animate-spin" />
              )}
              Saqlash
            </button>
          </div>
        </div>
      </form>
    </AppModal>
  );
}

