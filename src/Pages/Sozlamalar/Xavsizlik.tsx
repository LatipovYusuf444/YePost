import { useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { useAuthStore } from "@/store/authStore";

export default function Xavsizlik() {
  const store = useAuthProfileStore();
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [korinsin, setKorinsin] = useState(false);

  const mos = newPassword === confirmPassword;
  const yetarli = newPassword.length >= 6;

  async function saqlash(event: FormEvent) {
    event.preventDefault();
    store.xabarlarniTozalash();
    if (!oldPassword || !newPassword || !mos || !yetarli) return;

    const ok = await store.parolniYangilash({ oldPassword, newPassword });
    if (ok) {
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      window.alert(
        "Parol muvaffaqiyatli almashtirildi. Xavfsizlik uchun yangi parol bilan qayta kiring."
      );
      await logout();
      navigate("/login", { replace: true });
    }
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_340px]">
      <form
        onSubmit={saqlash}
        className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-sm md:p-8"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
            <LockKeyhole size={23} />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">
              Hisob xavfsizligi
            </p>
            <h2 className="mt-1 text-2xl font-black">Parolni almashtirish</h2>
            <p className="mt-1 text-sm text-gray-500">
              Avval amaldagi parolingizni tasdiqlang.
            </p>
          </div>
        </div>

        {store.xatolik && (
          <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
            {store.xatolik}
          </div>
        )}
        {store.muvaffaqiyat && (
          <div className="mt-5 flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            <CheckCircle2 size={18} />
            {store.muvaffaqiyat}
          </div>
        )}

        <div className="mt-6 space-y-5">
          <label className="block text-sm font-bold">
            Amaldagi parol *
            <div className="relative mt-2">
              <KeyRound
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type={korinsin ? "text" : "password"}
                value={oldPassword}
                onChange={(event) => setOldPassword(event.target.value)}
                className="h-12 w-full rounded-2xl border pl-11 pr-12 font-medium outline-none focus:border-orange-300"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setKorinsin((value) => !value)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                aria-label={korinsin ? "Parolni yashirish" : "Parolni ko'rsatish"}
              >
                {korinsin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          <label className="block text-sm font-bold">
            Yangi parol *
            <input
              type={korinsin ? "text" : "password"}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border px-4 font-medium outline-none focus:border-orange-300"
              autoComplete="new-password"
              placeholder="Kamida 6 ta belgi"
            />
          </label>
          <label className="block text-sm font-bold">
            Yangi parolni takrorlang *
            <input
              type={korinsin ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={`mt-2 h-12 w-full rounded-2xl border px-4 font-medium outline-none ${
                confirmPassword && !mos
                  ? "border-red-300"
                  : "focus:border-orange-300"
              }`}
              autoComplete="new-password"
            />
            {confirmPassword && !mos && (
              <span className="mt-2 block text-xs font-bold text-red-500">
                Yangi parollar bir xil emas.
              </span>
            )}
          </label>
        </div>

        <div className="mt-7 flex justify-end">
          <button
            disabled={
              store.amalBajarilmoqda ||
              !oldPassword ||
              !newPassword ||
              !mos ||
              !yetarli
            }
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-6 font-black text-white disabled:opacity-50"
          >
            {store.amalBajarilmoqda && (
              <LoaderCircle size={17} className="animate-spin" />
            )}
            Parolni almashtirish
          </button>
        </div>
      </form>

      <aside className="rounded-[28px] border border-orange-100 bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white shadow-lg shadow-orange-500/20">
        <ShieldCheck size={38} />
        <h3 className="mt-5 text-xl font-black">Xavfsiz parol tavsiyalari</h3>
        <ul className="mt-4 space-y-3 text-sm font-medium text-white/90">
          <li>Kamida 6 ta belgidan foydalaning.</li>
          <li>Harflar, raqamlar va belgilarni aralashtiring.</li>
          <li>Login yoki ismingizni parol sifatida ishlatmang.</li>
          <li>Parolingizni boshqa odamga bermang.</li>
        </ul>
      </aside>
    </section>
  );
}
