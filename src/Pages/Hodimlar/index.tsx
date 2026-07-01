import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Building2,
  Camera,
  Download,
  Edit3,
  ExternalLink,
  Grid2X2,
  KeyRound,
  LayoutGrid,
  Link,
  List,
  LoaderCircle,
  Mail,
  Monitor,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Table2,
  Trash2,
  Upload,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { useAccountStore } from "@/store/accountStore";
import type { AccountFoydalanuvchi, AccountRoli, VakolatKodi } from "@/types/account";
import Rollar from "./Rollar";
import Ruxsatlar from "./Ruxsatlar";

type Tab = "foydalanuvchilar" | "vakolatlar" | "rollar";
type Korinish = "kartochka" | "kichik" | "royxat" | "jadval";

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

const rolBackendNomi: Record<AccountRoli, string> = {
  DIREKTOR: "DIREKTOR",
  ADMIN: "ADMINISTRATOR",
  KASSIR: "KASSIR",
  OMBORCHI: "OMBORCHI",
};

const korinishlar: Array<{ id: Korinish; nom: string; icon: typeof Monitor }> = [
  { id: "kartochka", nom: "Kartochka", icon: LayoutGrid },
  { id: "kichik", nom: "Kichik ikonlar", icon: Grid2X2 },
  { id: "royxat", nom: "Ro'yxat", icon: List },
  { id: "jadval", nom: "Jadval", icon: Table2 },
];

const vakolatMatnlari: Record<VakolatKodi, { nom: string; izoh: string }> = {
  DELETE: {
    nom: "Ma'lumotlarni o'chirish",
    izoh: "Ruxsat etilgan bo'limlarda o'chirish amallarini bajaradi.",
  },
  REPORTS: {
    nom: "Hisobotlarni ko'rish",
    izoh: "Savdo, kassa va boshqaruv hisobotlarini ochadi.",
  },
  EXPENSE: {
    nom: "Xarajat kiritish",
    izoh: "Kassa va moliyaviy xarajatlarni ro'yxatga oladi.",
  },
  CASH_IN: {
    nom: "Kassaga kirim qilish",
    izoh: "Kassaga qo'shimcha pul kirimini amalga oshiradi.",
  },
  RETURN_CANCEL: {
    nom: "Qaytarishni bekor qilish",
    izoh: "Tasdiqlangan mahsulot qaytarishlarini bekor qiladi.",
  },
};

const vakolatKodlari = Object.keys(vakolatMatnlari) as VakolatKodi[];

function sana(matn?: string) {
  if (!matn) return "-";
  return new Intl.DateTimeFormat("uz-UZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(matn));
}

function xodimRasmi(item?: AccountFoydalanuvchi | null) {
  return item?.avatarUrl ?? item?.photoUrl ?? item?.imageUrl ?? "";
}

function Foydalanuvchilar() {
  const store = useAccountStore();
  const [qidiruv, setQidiruv] = useState("");
  const [korinish, setKorinish] = useState<Korinish>("kartochka");
  const [korinishMenu, setKorinishMenu] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<AccountFoydalanuvchi | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AccountRoli>("KASSIR");
  const [branchId, setBranchId] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [tanlanganVakolatlar, setTanlanganVakolatlar] = useState<Set<VakolatKodi>>(
    () => new Set()
  );
  const [kameraOchiq, setKameraOchiq] = useState(false);
  const [kameraXatolik, setKameraXatolik] = useState("");
  const firstInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const kameraStreamRef = useRef<MediaStream | null>(null);

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
    setAvatarPreview("");
    setTanlanganVakolatlar(new Set());
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
    setAvatarPreview(xodimRasmi(item));
    setTanlanganVakolatlar(
      new Set(
        store.vakolatlar
          .filter((vakolat) => vakolat.userId === item.id && vakolat.isActive)
          .map((vakolat) => vakolat.code as VakolatKodi)
          .filter((code): code is VakolatKodi => vakolatKodlari.includes(code))
      )
    );
    setModal(true);
  }

  function rasmTanlash(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  }

  function kameraniYopish() {
    kameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    kameraStreamRef.current = null;
    setKameraOchiq(false);
  }

  async function kameraniOchish() {
    setKameraXatolik("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      kameraStreamRef.current = stream;
      setKameraOchiq(true);
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      }, 0);
    } catch {
      setKameraXatolik("Kamera ochilmadi. Brauzer ruxsatini tekshiring.");
    }
  }

  function kameradanRasmOlish() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setAvatarPreview(canvas.toDataURL("image/jpeg", 0.9));
    kameraniYopish();
  }

  function xodimMalumoti() {
    const filial = store.filiallar.find((item) => item.id === branchId);
    return {
      id: editing?.id ?? "yangi-xodim",
      fullName: fullName.trim(),
      username: username.trim(),
      role,
      roleName: rolNomi[role],
      branchId: branchId || null,
      branchName: filial?.name ?? null,
      telegramId: telegramId.trim() || null,
      isActive,
    };
  }

  async function havolaniNusxalash() {
    const url = new URL(window.location.href);
    url.hash = editing?.id ? `xodim-${editing.id}` : "yangi-xodim";
    const text = url.toString();
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    window.prompt("Havolani nusxalang:", text);
  }

  function xodimniYuklabOlish() {
    const data = JSON.stringify(xodimMalumoti(), null, 2);
    const blob = new Blob([data], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${username.trim() || "yangi-xodim"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function formagaOtish() {
    firstInputRef.current?.focus();
    firstInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function vakolatniAlmashtirish(code: VakolatKodi) {
    setTanlanganVakolatlar((oldingi) => {
      const keyingi = new Set(oldingi);
      if (keyingi.has(code)) keyingi.delete(code);
      else keyingi.add(code);
      return keyingi;
    });
  }

  async function vakolatlarniSinxronlash(userId: string) {
    const mavjudVakolatlar = store.vakolatlar.filter((item) => item.userId === userId);
    let hammasiOk = true;

    for (const code of vakolatKodlari) {
      const mavjud = mavjudVakolatlar.find((item) => item.code === code);
      const tanlangan = tanlanganVakolatlar.has(code);

      if (tanlangan && !mavjud) {
        hammasiOk = (await store.vakolatYaratish({ userId, code, isActive: true })) && hammasiOk;
      } else if (tanlangan && mavjud && !mavjud.isActive) {
        hammasiOk = (await store.vakolatYangilash(mavjud.id, { isActive: true })) && hammasiOk;
      } else if (!tanlangan && mavjud) {
        hammasiOk = (await store.vakolatOchirish(mavjud.id)) && hammasiOk;
      }
    }

    return hammasiOk;
  }

  useEffect(() => kameraniYopish, []);

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
    const saqlangan = editing
      ? await store.foydalanuvchiYangilash(editing.id, {
          ...umumiy,
          ...(password.trim() ? { password: password.trim() } : {}),
        })
      : await store.foydalanuvchiYaratish({
          ...umumiy,
          password: password.trim(),
        });
    if (!saqlangan) return;
    const vakolatOk = await vakolatlarniSinxronlash(saqlangan.id);
    if (vakolatOk) setModal(false);
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

  const tanlanganKorinish = korinishlar.find((item) => item.id === korinish) ?? korinishlar[0];
  const TanlanganIcon = tanlanganKorinish.icon;
  const xodimRaqami = editing
    ? store.foydalanuvchilar.findIndex((item) => item.id === editing.id) + 1
    : store.foydalanuvchilar.length + 1;

  function renderAmallar(item: AccountFoydalanuvchi, joriy: boolean, ixcham = false) {
    return (
      <div className={ixcham ? "flex shrink-0 items-center gap-2" : "mt-5 flex gap-2 border-t border-gray-100 pt-4"}>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            void tahrirlash(item.id);
          }}
          className={`inline-flex items-center justify-center gap-2 rounded-xl bg-orange-50 font-bold text-orange-600 ${
            ixcham ? "h-10 px-3" : "flex-1 py-2.5"
          }`}
        >
          <Edit3 size={15} />
          {!ixcham && "Tahrirlash"}
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            void ochirish(item);
          }}
          disabled={joriy}
          title={joriy ? "Joriy hisobni o'chirib bo'lmaydi" : "O'chirish"}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500 disabled:opacity-30"
        >
          <Trash2 size={16} />
        </button>
      </div>
    );
  }

  function holatBelgisi(item: AccountFoydalanuvchi) {
    return (
      <span
        className={`rounded-full px-3 py-1 text-xs font-bold ${
          item.isActive
            ? "bg-emerald-50 text-emerald-600"
            : "bg-gray-100 text-gray-500"
        }`}
      >
        {item.isActive ? "Faol" : "Faol emas"}
      </span>
    );
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
          Xodim qo'shish
        </button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative max-w-xl flex-1">
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
        <div className="relative">
          <button
            type="button"
            onClick={() => setKorinishMenu((current) => !current)}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 font-bold text-gray-600 shadow-sm transition hover:border-orange-200 hover:bg-orange-50 md:w-auto"
            aria-expanded={korinishMenu}
          >
            <TanlanganIcon size={18} className="text-orange-500" />
            Ko'rinish
            {korinishMenu ? (
              <ChevronUp size={16} className="text-orange-500" />
            ) : (
              <ChevronDown size={16} className="text-orange-500" />
            )}
          </button>
          {korinishMenu && (
            <div className="absolute right-0 z-20 mt-2 w-48 rounded-2xl border border-orange-100 bg-white p-1.5 shadow-xl shadow-orange-900/10">
              {korinishlar.map((item) => {
                const Icon = item.icon;
                const active = item.id === korinish;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setKorinish(item.id);
                      setKorinishMenu(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-bold transition ${
                      active
                        ? "bg-orange-500 text-white"
                        : "text-gray-600 hover:bg-orange-50 hover:text-orange-600"
                    }`}
                  >
                    <Icon size={16} />
                    {item.nom}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {korinish === "kartochka" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {korsatiladiganlar.map((item) => {
            const filial = store.filiallar.find((filialItem) => filialItem.id === item.branchId);
            const joriy = item.id === store.profil?.id;
            return (
              <article
                key={item.id}
                onClick={() => void tahrirlash(item.id)}
                className="cursor-pointer rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") void tahrirlash(item.id);
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                    <UserRound size={23} />
                  </div>
                  {holatBelgisi(item)}
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
                {renderAmallar(item, joriy)}
              </article>
            );
          })}
        </div>
      )}

      {korinish === "kichik" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {korsatiladiganlar.map((item) => {
            const joriy = item.id === store.profil?.id;
            return (
              <article
                key={item.id}
                onClick={() => void tahrirlash(item.id)}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-orange-100 bg-white p-3 shadow-sm transition hover:border-orange-200 hover:shadow-md"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") void tahrirlash(item.id);
                }}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <UserRound size={21} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-black">{item.fullName || item.username}</h3>
                  <p className="truncate text-xs font-semibold text-gray-400">
                    @{item.username} / {rolNomi[item.role as AccountRoli] ?? item.role}
                  </p>
                </div>
                {renderAmallar(item, joriy, true)}
              </article>
            );
          })}
        </div>
      )}

      {korinish === "royxat" && (
        <div className="space-y-3">
          {korsatiladiganlar.map((item) => {
            const filial = store.filiallar.find((filialItem) => filialItem.id === item.branchId);
            const joriy = item.id === store.profil?.id;
            return (
              <article
                key={item.id}
                onClick={() => void tahrirlash(item.id)}
                className="flex cursor-pointer flex-col gap-4 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm transition hover:border-orange-200 hover:shadow-md lg:flex-row lg:items-center"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") void tahrirlash(item.id);
                }}
              >
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                    <UserRound size={23} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-black">{item.fullName || item.username}</h3>
                    <p className="truncate text-sm font-semibold text-orange-600">@{item.username}</p>
                  </div>
                </div>
                <div className="grid gap-3 text-sm sm:grid-cols-3 lg:w-[520px]">
                  <div>
                    <p className="text-xs font-bold text-gray-400">Rol</p>
                    <p className="font-bold">{rolNomi[item.role as AccountRoli] ?? item.role}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400">Filial</p>
                    <p className="font-bold">{filial?.name ?? item.branch?.name ?? "Biriktirilmagan"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400">Holat</p>
                    {holatBelgisi(item)}
                  </div>
                </div>
                {renderAmallar(item, joriy, true)}
              </article>
            );
          })}
        </div>
      )}

      {korinish === "jadval" && (
        <div className="overflow-x-auto rounded-2xl border border-orange-100 bg-white">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="bg-orange-50 text-gray-500">
              <tr>
                <th className="px-5 py-4">Foydalanuvchi</th>
                <th className="px-5 py-4">Rol</th>
                <th className="px-5 py-4">Filial</th>
                <th className="px-5 py-4">Yaratilgan</th>
                <th className="px-5 py-4">Holat</th>
                <th className="px-5 py-4 text-right">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-100">
              {korsatiladiganlar.map((item) => {
                const filial = store.filiallar.find((filialItem) => filialItem.id === item.branchId);
                const joriy = item.id === store.profil?.id;
                return (
                  <tr
                    key={item.id}
                    onClick={() => void tahrirlash(item.id)}
                    className="cursor-pointer transition hover:bg-orange-50/70"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") void tahrirlash(item.id);
                    }}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                          <UserRound size={20} />
                        </div>
                        <div>
                          <p className="font-black">{item.fullName || item.username}</p>
                          <p className="text-xs font-semibold text-orange-600">@{item.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-bold">{rolNomi[item.role as AccountRoli] ?? item.role}</td>
                    <td className="px-5 py-4 font-bold">{filial?.name ?? item.branch?.name ?? "Biriktirilmagan"}</td>
                    <td className="px-5 py-4 font-bold">{sana(item.createdAt)}</td>
                    <td className="px-5 py-4">{holatBelgisi(item)}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end">{renderAmallar(item, joriy, true)}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {korsatiladiganlar.length === 0 && (
        <div className="rounded-[26px] border border-dashed border-orange-200 bg-orange-50/30 p-12 text-center text-gray-500">
          Foydalanuvchi topilmadi.
        </div>
      )}

      {modal && (
        <AppModal className="items-center justify-center p-4">
          <form
            onSubmit={saqlash}
            className="relative flex h-[90vh] w-full max-w-[1420px] flex-col overflow-visible rounded-[28px] bg-white shadow-2xl"
          >
            <div className="absolute -left-11 top-5 hidden flex-col gap-3 md:flex">
              <button
                type="button"
                onClick={() => setModal(false)}
                title="Yopish"
                className="flex h-10 w-10 items-center justify-center rounded-l-2xl rounded-r-md bg-orange-500 text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
              >
                <X size={18} />
              </button>
              <button
                type="button"
                onClick={() => void havolaniNusxalash()}
                title="Havolani nusxalash"
                className="flex h-10 w-10 items-center justify-center rounded-l-2xl rounded-r-md border border-orange-100 bg-white text-orange-500 shadow-lg shadow-orange-500/10 transition hover:bg-orange-50"
              >
                <Link size={17} />
              </button>
              <button
                type="button"
                onClick={xodimniYuklabOlish}
                title="Ma'lumotni yuklab olish"
                className="flex h-10 w-10 items-center justify-center rounded-l-2xl rounded-r-md border border-orange-100 bg-white text-orange-500 shadow-lg shadow-orange-500/10 transition hover:bg-orange-50"
              >
                <Download size={17} />
              </button>
              <button
                type="button"
                onClick={formagaOtish}
                title="Formaga o'tish"
                className="flex h-10 w-10 items-center justify-center rounded-l-2xl rounded-r-md border border-orange-100 bg-white text-orange-500 shadow-lg shadow-orange-500/10 transition hover:bg-orange-50"
              >
                <ExternalLink size={17} />
              </button>
            </div>

            <div className="relative overflow-hidden rounded-t-[28px] border-b border-orange-100 bg-white px-5 py-5 text-gray-900 md:px-7">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">
                    Xodimlar profili
                  </p>
                  <h2 className="mt-2 text-2xl font-black leading-tight text-gray-900 md:text-3xl">
                    {editing ? "Xodimni tahrirlash" : "Yangi xodim qo'shish"}
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-orange-50 px-4 py-2 text-sm font-black text-orange-600">
                    {role ? rolNomi[role] : "Rol"}
                  </span>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-orange-50/40 p-5 md:p-7">
              {store.xatolik && (
                <div className="mb-5 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-600">
                  {store.xatolik}
                </div>
              )}
              <div className="grid gap-5 lg:grid-cols-[330px_minmax(0,1fr)]">
                <div className="space-y-4">
                  <section className="relative overflow-hidden rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-end">
                      <div className="absolute left-0 top-3 z-10 flex flex-col items-start gap-1">
                        <div
                          className="inline-flex h-6 min-w-[122px] items-center bg-orange-500 pl-4 pr-7 text-[10px] font-black uppercase text-white shadow-sm"
                          style={{
                            clipPath:
                              "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)",
                          }}
                        >
                          {role ? rolBackendNomi[role] : "XODIM"}
                          <ChevronDown size={11} className="ml-1.5 shrink-0 text-white/90" />
                        </div>
                        <div
                          className="inline-flex h-7 min-w-[58px] items-center justify-center gap-1 bg-orange-500 pl-2 pr-5 text-xs font-black text-white shadow-sm"
                          style={{
                            clipPath:
                              "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)",
                          }}
                        >
                          <span className="text-[10px]">#</span>
                          {Math.max(xodimRaqami, 1)}
                        </div>
                      </div>
                      <span className="flex items-center gap-2 text-xs font-black text-emerald-600">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        {isActive ? "Faol" : "Faol emas"}
                      </span>
                    </div>
                    <div className="group relative mx-auto mt-9 flex h-36 w-36 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-orange-100 to-gray-100 text-orange-500 ring-4 ring-orange-50 transition hover:ring-orange-100">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Xodim rasmi"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserRound size={58} />
                      )}
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/82 text-gray-600 opacity-0 backdrop-blur-[1px] transition group-hover:opacity-100">
                        {avatarPreview && (
                          <button
                            type="button"
                            onClick={() => setAvatarPreview("")}
                            className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-400 shadow-sm transition hover:bg-orange-50 hover:text-orange-600"
                            title="Rasmni olib tashlash"
                          >
                            <X size={16} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void kameraniOchish()}
                          className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-black transition hover:bg-orange-50 hover:text-orange-600"
                        >
                          <Camera size={17} className="shrink-0 text-orange-500" />
                          Rasmga olish
                        </button>
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-black transition hover:bg-orange-50 hover:text-orange-600">
                          <Upload size={17} className="shrink-0 text-orange-500" />
                          Rasm yuklash
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(event) => rasmTanlash(event.target.files?.[0])}
                          />
                        </label>
                      </div>
                    </div>
                    {kameraXatolik && (
                      <p className="mt-3 text-center text-xs font-bold text-red-500">
                        {kameraXatolik}
                      </p>
                    )}
                    <h3 className="mt-4 truncate text-center text-lg font-black">
                      {fullName.trim() || username.trim() || "Yangi xodim"}
                    </h3>
                    <p className="mt-1 truncate text-center text-sm font-bold text-orange-600">
                      @{username.trim() || "login"}
                    </p>
                  </section>

                  <section className="grid grid-cols-2 gap-3 rounded-2xl border border-orange-100 bg-white p-3 text-sm font-bold text-gray-500 shadow-sm">
                    <div className="flex items-center gap-2 rounded-xl border border-orange-100 p-3">
                      <Smartphone size={18} className="text-orange-500" />
                      Telefon
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-orange-100 p-3">
                      <Monitor size={18} className="text-orange-500" />
                      Kompyuter
                    </div>
                  </section>

                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="space-y-4">
                    <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm md:p-6">
                    <h3 className="border-b border-gray-100 pb-4 text-xl font-black text-gray-700">
                      Kontakt ma'lumotlari
                    </h3>
                    <div className="mt-5 grid gap-4">
                      <label className="text-sm font-bold text-gray-400">
                        F.I.Sh.
                        <input
                          ref={firstInputRef}
                          value={fullName}
                          onChange={(event) => setFullName(event.target.value)}
                          className="mt-2 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 font-semibold text-gray-700 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                          placeholder="Masalan: Ali Valiyev"
                        />
                      </label>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-sm font-bold text-gray-400">
                          Login *
                          <input
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                            className="mt-2 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 font-semibold text-gray-700 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                            placeholder="ali.valiyev"
                            autoComplete="off"
                          />
                        </label>
                        <label className="text-sm font-bold text-gray-400">
                          {editing ? "Yangi parol" : "Parol *"}
                          <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            className="mt-2 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 font-semibold text-gray-700 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                            placeholder={editing ? "O'zgarmasa bo'sh qoldiring" : "Parol kiriting"}
                            autoComplete="new-password"
                          />
                        </label>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-sm font-bold text-gray-400">
                          Rol
                          <select
                            value={role}
                            onChange={(event) => setRole(event.target.value as AccountRoli)}
                            className="mt-2 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 font-semibold text-gray-700 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                          >
                            {Object.entries(rolNomi).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-sm font-bold text-gray-400">
                          Filial
                          <select
                            value={branchId}
                            onChange={(event) => setBranchId(event.target.value)}
                            className="mt-2 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 font-semibold text-gray-700 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                          >
                            <option value="">Filial biriktirilmagan</option>
                            {store.filiallar.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-sm font-bold text-gray-400">
                          Telegram ID
                          <input
                            value={telegramId}
                            onChange={(event) => setTelegramId(event.target.value)}
                            className="mt-2 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 font-semibold text-gray-700 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                            placeholder="Ixtiyoriy"
                          />
                        </label>
                        <label className="flex items-center gap-3 self-end rounded-xl border border-orange-100 bg-orange-50 p-4 font-bold text-gray-700">
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={(event) => setIsActive(event.target.checked)}
                            className="h-5 w-5 accent-orange-500"
                          />
                          Xodim tizimga kira oladi
                        </label>
                      </div>
                    </div>
                    </section>

                    <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm md:p-6">
                    <h3 className="border-b border-gray-100 pb-4 text-xl font-black text-gray-700">
                      Hujjatlar uchun ma'lumot
                    </h3>
                    <div className="mt-5 grid gap-4 md:grid-cols-[96px_minmax(0,1fr)] md:items-center">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-orange-100 bg-orange-50 text-orange-500">
                        <Building2 size={34} />
                      </div>
                      <div className="space-y-3 text-sm font-semibold text-gray-500">
                        <p className="flex items-center gap-2">
                          <Mail size={17} className="text-orange-500" />
                          Login va filial ma'lumotlari kadr hujjatlarida ishlatiladi.
                        </p>
                        <p>
                          Rol va faol holat xodimning tizimdagi imkoniyatlarini belgilaydi.
                        </p>
                      </div>
                    </div>
                    </section>
                  </div>

                  <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm md:p-6">
                    <h3 className="border-b border-gray-100 pb-4 text-xl font-black text-gray-700">
                      Ruxsat sozlamalari
                    </h3>
                    <div className="mt-5 space-y-4">
                      <div className="overflow-hidden rounded-2xl border border-orange-100">
                        <div className="bg-orange-50 px-4 py-3 text-sm font-black text-gray-600">
                          Maxsus vakolatlar
                        </div>
                        <div className="divide-y divide-orange-100 p-4">
                          {vakolatKodlari.map((code) => (
                            <label
                              key={code}
                              className="flex cursor-pointer items-start gap-3 py-3"
                            >
                              <input
                                type="checkbox"
                                checked={tanlanganVakolatlar.has(code)}
                                onChange={() => vakolatniAlmashtirish(code)}
                                className="mt-1 h-5 w-5 shrink-0 accent-orange-500"
                              />
                              <span className="min-w-0">
                                <span className="block text-sm font-black text-gray-700">
                                  {vakolatMatnlari[code].nom}
                                </span>
                                <span className="mt-1 block text-xs font-semibold leading-5 text-gray-400">
                                  {vakolatMatnlari[code].izoh}
                                </span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>

            {kameraOchiq && (
              <div className="absolute inset-0 z-30 flex items-center justify-center rounded-[28px] bg-gray-950/55 p-4 backdrop-blur-sm">
                <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b border-orange-100 px-5 py-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-500">
                        Kamera
                      </p>
                      <h3 className="text-xl font-black text-gray-900">Rasmga olish</h3>
                    </div>
                    <button
                      type="button"
                      onClick={kameraniYopish}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition hover:bg-orange-50 hover:text-orange-600"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="bg-gray-950 p-4">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="aspect-video w-full rounded-xl bg-black object-cover"
                    />
                  </div>
                  <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={kameraniYopish}
                      className="h-11 rounded-xl bg-gray-100 px-5 font-bold text-gray-600 transition hover:bg-gray-200"
                    >
                      Bekor qilish
                    </button>
                    <button
                      type="button"
                      onClick={kameradanRasmOlish}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 font-black text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
                    >
                      <Camera size={17} />
                      Suratga olish
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-gray-100 bg-white px-5 py-4 md:flex-row md:items-center md:justify-end md:px-7">
              <button
                type="button"
                onClick={() => setModal(false)}
                className="h-11 rounded-xl bg-gray-100 px-5 font-bold text-gray-600 transition hover:bg-gray-200"
              >
                Bekor qilish
              </button>
              <button
                disabled={
                  store.amalBajarilmoqda ||
                  !username.trim() ||
                  (!editing && !password.trim())
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-7 font-black text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 disabled:opacity-50"
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
