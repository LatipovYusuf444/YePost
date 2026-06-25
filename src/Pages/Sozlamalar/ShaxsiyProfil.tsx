import { useEffect, useState, type FormEvent } from "react";
import {
  AtSign,
  BadgeCheck,
  Building2,
  LoaderCircle,
  Save,
  Send,
  UserRound,
} from "lucide-react";
import { useAuthProfileStore } from "@/store/authProfileStore";
import type { FoydalanuvchiRoli } from "@/types/tenant";

const rolNomlari: Record<FoydalanuvchiRoli, string> = {
  DIREKTOR: "Direktor",
  ADMIN: "Administrator",
  KASSIR: "Kassir",
  OMBORCHI: "Omborchi",
};

export default function ShaxsiyProfil() {
  const store = useAuthProfileStore();
  const [fullName, setFullName] = useState("");
  const [telegramId, setTelegramId] = useState("");

  useEffect(() => {
    setFullName(store.profil?.fullName ?? "");
    setTelegramId(store.profil?.telegramId ?? "");
  }, [store.profil]);

  async function saqlash(event: FormEvent) {
    event.preventDefault();
    await store.profilniYangilash({
      fullName: fullName.trim(),
      telegramId: telegramId.trim(),
    });
  }

  const profil = store.profil;
  if (!profil) return null;

  return (
    <section className="grid gap-5 xl:grid-cols-[320px_1fr]">
      <aside className="rounded-[28px] border border-orange-100 bg-gradient-to-br from-orange-50 to-white p-6 shadow-sm">
        <div className="flex h-20 w-20 items-center justify-center rounded-[26px] bg-orange-500 text-white shadow-lg shadow-orange-500/25">
          <UserRound size={36} />
        </div>
        <h2 className="mt-5 text-2xl font-black">
          {profil.fullName || profil.username}
        </h2>
        <p className="mt-1 font-semibold text-orange-600">@{profil.username}</p>
        <div className="mt-5 space-y-3 border-t border-orange-100 pt-5 text-sm">
          <div className="flex items-center gap-3">
            <BadgeCheck size={18} className="text-orange-500" />
            <span className="text-gray-500">Rol:</span>
            <strong>
              {rolNomlari[profil.role as FoydalanuvchiRoli] ?? profil.role}
            </strong>
          </div>
          <div className="flex items-center gap-3">
            <Building2 size={18} className="text-orange-500" />
            <span className="text-gray-500">Filial:</span>
            <strong>{profil.branchId ? "Biriktirilgan" : "Biriktirilmagan"}</strong>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                profil.isActive === false ? "bg-gray-400" : "bg-emerald-500"
              }`}
            />
            <strong>
              {profil.isActive === false ? "Faol emas" : "Faol hisob"}
            </strong>
          </div>
        </div>
      </aside>

      <form
        onSubmit={saqlash}
        className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-sm md:p-8"
      >
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">
            Shaxsiy ma'lumotlar
          </p>
          <h2 className="mt-1 text-2xl font-black">Profilni tahrirlash</h2>
          <p className="mt-1 text-sm text-gray-500">
            Bu ma'lumotlar real hisobingizda saqlanadi.
          </p>
        </div>

        {store.xatolik && (
          <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
            {store.xatolik}
          </div>
        )}
        {store.muvaffaqiyat && (
          <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            {store.muvaffaqiyat}
          </div>
        )}

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="text-sm font-bold">
            F.I.Sh.
            <div className="relative mt-2">
              <UserRound
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="h-12 w-full rounded-2xl border border-gray-200 pl-11 pr-4 font-medium outline-none focus:border-orange-300"
                placeholder="To'liq ismingiz"
              />
            </div>
          </label>
          <label className="text-sm font-bold">
            Telegram ID
            <div className="relative mt-2">
              <Send
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                value={telegramId}
                onChange={(event) => setTelegramId(event.target.value)}
                className="h-12 w-full rounded-2xl border border-gray-200 pl-11 pr-4 font-medium outline-none focus:border-orange-300"
                placeholder="Telegram foydalanuvchi ID"
              />
            </div>
          </label>
          <label className="text-sm font-bold">
            Login
            <div className="relative mt-2">
              <AtSign
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                value={profil.username}
                disabled
                className="h-12 w-full rounded-2xl border border-gray-100 bg-gray-50 pl-11 pr-4 font-medium text-gray-500"
              />
            </div>
            <span className="mt-2 block text-xs font-medium text-gray-400">
              Loginni faqat direktor “Xodimlar” bo'limidan o'zgartiradi.
            </span>
          </label>
          <label className="text-sm font-bold">
            Tizimdagi rol
            <input
              value={
                rolNomlari[profil.role as FoydalanuvchiRoli] ?? profil.role
              }
              disabled
              className="mt-2 h-12 w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 font-medium text-gray-500"
            />
          </label>
        </div>

        <div className="mt-7 flex justify-end">
          <button
            disabled={store.amalBajarilmoqda}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-6 font-black text-white shadow-lg shadow-orange-500/20 disabled:opacity-50"
          >
            {store.amalBajarilmoqda ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <Save size={17} />
            )}
            O'zgarishlarni saqlash
          </button>
        </div>
      </form>
    </section>
  );
}
