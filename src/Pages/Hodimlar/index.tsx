import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Edit3,
  KeyRound,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { useAccountStore } from "@/store/accountStore";
import type { AccountFoydalanuvchi, AccountRoli } from "@/types/account";
import Rollar from "./Rollar";
import Ruxsatlar from "./Ruxsatlar";

type Tab = "foydalanuvchilar" | "vakolatlar" | "rollar";

const tablar: Array<{ id: Tab; nom: string; icon: typeof UsersRound }> = [
  { id: "foydalanuvchilar", nom: "Foydalanuvchilar", icon: UsersRound },
  { id: "vakolatlar", nom: "Vakolatlar", icon: KeyRound },
  { id: "rollar", nom: "Rollar", icon: ShieldCheck },
];

const rolNomi: Record<AccountRoli, string> = {
  DIREKTOR: "Direktor",
  ADMIN: "Administrator",
  KASSIR: "Kassir",
  OMBORCHI: "Omborchi",
};

function sana(matn?: string) {
  if (!matn) return "—";
  return new Intl.DateTimeFormat("uz-UZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(matn));
}

function Foydalanuvchilar() {
  const store = useAccountStore();
  const [qidiruv, setQidiruv] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<AccountFoydalanuvchi | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AccountRoli>("KASSIR");
  const [branchId, setBranchId] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [isActive, setIsActive] = useState(true);

  const korsatiladiganlar = useMemo(() => {
    const query = qidiruv.trim().toLowerCase();
    if (!query) return store.foydalanuvchilar;
    return store.foydalanuvchilar.filter((item) =>
      [item.fullName, item.username, rolNomi[item.role as AccountRoli]]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query))
    );
  }, [qidiruv, store.foydalanuvchilar]);

  function yangi() {
    setEditing(null);
    setUsername("");
    setPassword("");
    setFullName("");
    setRole("KASSIR");
    setBranchId("");
    setTelegramId("");
    setIsActive(true);
    store.xatolikniTozalash();
    setModal(true);
  }

  async function tahrirlash(id: string) {
    store.xatolikniTozalash();
    const item = await store.foydalanuvchiOlish(id);
    if (!item) return;
    setEditing(item);
    setUsername(item.username);
    setPassword("");
    setFullName(item.fullName ?? "");
    setRole(item.role as AccountRoli);
    setBranchId(item.branchId ?? "");
    setTelegramId(item.telegramId ?? "");
    setIsActive(item.isActive);
    setModal(true);
  }

  async function saqlash(event: FormEvent) {
    event.preventDefault();
    if (!username.trim() || (!editing && !password.trim())) return;

    const umumiy = {
      username: username.trim(),
      fullName: fullName.trim() || undefined,
      role,
      branchId: branchId || undefined,
      telegramId: telegramId.trim() || undefined,
      isActive,
    };
    const ok = editing
      ? await store.foydalanuvchiYangilash(editing.id, {
          ...umumiy,
          ...(password.trim() ? { password: password.trim() } : {}),
        })
      : await store.foydalanuvchiYaratish({
          ...umumiy,
          password: password.trim(),
        });
    if (ok) setModal(false);
  }

  async function ochirish(item: AccountFoydalanuvchi) {
    if (item.id === store.profil?.id) return;
    if (
      !window.confirm(
        `${item.fullName || item.username} foydalanuvchisini o'chirasizmi? Uning tizimga kirishi to'xtaydi.`
      )
    )
      return;
    await store.foydalanuvchiOchirish(item.id);
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">
            Xodimlar hisobi
          </p>
          <h2 className="text-2xl font-black">Foydalanuvchilar</h2>
          <p className="mt-1 text-sm text-gray-500">
            Xodimlarning kirish ma'lumotlari, roli va filialini boshqaring.
          </p>
        </div>
        <button
          onClick={yangi}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 font-black text-white shadow-lg shadow-orange-500/20"
        >
          <Plus size={18} />
          Foydalanuvchi qo'shish
        </button>
      </div>

      <div className="relative max-w-xl">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          size={18}
        />
        <input
          value={qidiruv}
          onChange={(event) => setQidiruv(event.target.value)}
          className="h-12 w-full rounded-2xl border border-orange-100 bg-white pl-11 pr-4 outline-none focus:border-orange-300"
          placeholder="Ism, login yoki rol bo'yicha qidirish"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {korsatiladiganlar.map((item) => {
          const filial = store.filiallar.find((filialItem) => filialItem.id === item.branchId);
          const joriy = item.id === store.profil?.id;
          return (
            <article
              key={item.id}
              className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                  <UserRound size={23} />
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    item.isActive
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {item.isActive ? "Faol" : "Faol emas"}
                </span>
              </div>
              <h3 className="mt-4 text-xl font-black">
                {item.fullName || item.username}
              </h3>
              <p className="text-sm font-semibold text-orange-600">@{item.username}</p>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-400">Rol</dt>
                  <dd className="font-bold">
                    {rolNomi[item.role as AccountRoli] ?? item.role}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-400">Filial</dt>
                  <dd className="text-right font-bold">
                    {filial?.name ?? item.branch?.name ?? "Biriktirilmagan"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-400">Yaratilgan</dt>
                  <dd className="font-bold">{sana(item.createdAt)}</dd>
                </div>
              </dl>
              {joriy && (
                <p className="mt-4 rounded-xl bg-orange-50 px-3 py-2 text-xs font-bold text-orange-600">
                  Siz foydalanayotgan hisob
                </p>
              )}
              <div className="mt-5 flex gap-2 border-t border-gray-100 pt-4">
                <button
                  onClick={() => void tahrirlash(item.id)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-50 py-2.5 font-bold text-orange-600"
                >
                  <Edit3 size={15} />
                  Tahrirlash
                </button>
                <button
                  onClick={() => void ochirish(item)}
                  disabled={joriy}
                  title={joriy ? "Joriy hisobni o'chirib bo'lmaydi" : "O'chirish"}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500 disabled:opacity-30"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          );
        })}
        {korsatiladiganlar.length === 0 && (
          <div className="col-span-full rounded-[26px] border border-dashed border-orange-200 bg-orange-50/30 p-12 text-center text-gray-500">
            Foydalanuvchi topilmadi.
          </div>
        )}
      </div>

      {modal && (
        <AppModal>
          <form
            onSubmit={saqlash}
            className="my-6 w-full max-w-2xl rounded-[30px] bg-white p-6 shadow-2xl md:p-8"
          >
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">
                Foydalanuvchi hisobi
              </p>
              <h2 className="mt-1 text-2xl font-black">
                {editing ? "Foydalanuvchini tahrirlash" : "Yangi foydalanuvchi"}
              </h2>
            </div>
            {store.xatolik && (
              <div className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-600">
                {store.xatolik}
              </div>
            )}
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-bold">
                F.I.Sh.
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border px-4 font-medium outline-none focus:border-orange-300"
                  placeholder="Masalan: Ali Valiyev"
                />
              </label>
              <label className="text-sm font-bold">
                Login *
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border px-4 font-medium outline-none focus:border-orange-300"
                  placeholder="ali.valiyev"
                  autoComplete="off"
                />
              </label>
              <label className="text-sm font-bold">
                {editing ? "Yangi parol" : "Parol *"}
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border px-4 font-medium outline-none focus:border-orange-300"
                  placeholder={editing ? "O'zgarmasa bo'sh qoldiring" : "Parol kiriting"}
                  autoComplete="new-password"
                />
              </label>
              <label className="text-sm font-bold">
                Rol
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value as AccountRoli)}
                  className="mt-2 h-12 w-full rounded-2xl border bg-white px-4 font-medium outline-none focus:border-orange-300"
                >
                  {Object.entries(rolNomi).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-bold">
                Filial
                <select
                  value={branchId}
                  onChange={(event) => setBranchId(event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border bg-white px-4 font-medium outline-none focus:border-orange-300"
                >
                  <option value="">Filial biriktirilmagan</option>
                  {store.filiallar.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-bold">
                Telegram ID
                <input
                  value={telegramId}
                  onChange={(event) => setTelegramId(event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border px-4 font-medium outline-none focus:border-orange-300"
                  placeholder="Ixtiyoriy"
                />
              </label>
            </div>
            <label className="mt-5 flex items-center gap-3 rounded-2xl bg-orange-50 p-4 font-bold">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
                className="h-5 w-5 accent-orange-500"
              />
              Foydalanuvchi tizimga kira oladi
            </label>
            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModal(false)}
                className="h-11 rounded-2xl bg-gray-100 px-5 font-bold text-gray-600"
              >
                Bekor qilish
              </button>
              <button
                disabled={
                  store.amalBajarilmoqda ||
                  !username.trim() ||
                  (!editing && !password.trim())
                }
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-6 font-black text-white disabled:opacity-50"
              >
                {store.amalBajarilmoqda && (
                  <LoaderCircle size={17} className="animate-spin" />
                )}
                Saqlash
              </button>
            </div>
          </form>
        </AppModal>
      )}
    </section>
  );
}

export default function Hodimlar() {
  const store = useAccountStore();
  const malumotlarniYuklash = store.malumotlarniYuklash;
  const [tab, setTab] = useState<Tab>("foydalanuvchilar");

  useEffect(() => {
    void malumotlarniYuklash();
  }, [malumotlarniYuklash]);

  if (store.yuklanmoqda) {
    return (
      <div className="flex h-72 items-center justify-center">
        <LoaderCircle className="animate-spin text-orange-500" size={36} />
      </div>
    );
  }

  if (store.profil && store.profil.role !== "DIREKTOR") {
    return (
      <div className="rounded-[26px] border border-amber-200 bg-amber-50 p-7">
        <AlertTriangle className="text-amber-500" size={28} />
        <h1 className="mt-3 text-2xl font-black">Direktor ruxsati kerak</h1>
        <p className="mt-2 text-gray-600">
          Foydalanuvchilar va vakolatlarni faqat direktor boshqarishi mumkin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-orange-500">
            Direktor boshqaruvi
          </p>
          <h1 className="mt-1 text-3xl font-black">Hisoblar va vakolatlar</h1>
          <p className="mt-1 text-sm text-gray-500">
            Xodimlar kirishi, rollari va maxsus amallarga ruxsatlarini boshqaring.
          </p>
        </div>
        <button
          onClick={() => void malumotlarniYuklash()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-orange-100 bg-white px-5 font-bold text-gray-600"
        >
          <RefreshCw size={17} />
          Yangilash
        </button>
      </header>

      {store.xatolik && !store.amalBajarilmoqda && (
        <div className="flex items-center justify-between rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
          <span>{store.xatolik}</span>
          <button onClick={store.xatolikniTozalash}>Yopish</button>
        </div>
      )}

      <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-orange-100 bg-white p-2">
        {tablar.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-bold transition ${
                tab === item.id
                  ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                  : "text-gray-500 hover:bg-orange-50"
              }`}
            >
              <Icon size={17} />
              {item.nom}
            </button>
          );
        })}
      </nav>

      {tab === "foydalanuvchilar" && <Foydalanuvchilar />}
      {tab === "vakolatlar" && <Ruxsatlar />}
      {tab === "rollar" && <Rollar />}
    </div>
  );
}
