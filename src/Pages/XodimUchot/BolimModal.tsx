import { useState, type FormEvent } from "react";
import { Building2, X } from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import type { Bolim, Lavozim, Xodim } from "./types";
import { bosHarflar, lavozimNomi, maydonKlass, xodimNomi, yangiId } from "./yordamchilar";

type Props = {
  boshlangich: Bolim | null;
  otaId: string; // yangi bo'lim qaysi bo'lim ostida yaratiladi
  otaNomi: string;
  xodimlar: Xodim[];
  lavozimlar: Lavozim[];
  onYopish: () => void;
  onSaqlash: (bolim: Bolim) => void;
};

// Bo'lim yaratish/tahrirlash: nomi va rahbarlari.
export default function BolimModal({
  boshlangich,
  otaId,
  otaNomi,
  xodimlar,
  lavozimlar,
  onYopish,
  onSaqlash,
}: Props) {
  const [nomi, setNomi] = useState(boshlangich?.nomi ?? "");
  const [rahbarlar, setRahbarlar] = useState<Set<string>>(
    () => new Set(boshlangich?.rahbarIdlar ?? [])
  );
  const [xato, setXato] = useState("");

  function toggle(id: string) {
    setRahbarlar((oldingi) => {
      const yangi = new Set(oldingi);
      if (yangi.has(id)) yangi.delete(id);
      else yangi.add(id);
      return yangi;
    });
  }

  function saqlash(event: FormEvent) {
    event.preventDefault();
    if (!nomi.trim()) {
      setXato("Bo'lim nomi to'ldirilishi shart.");
      return;
    }

    onSaqlash({
      id: boshlangich?.id ?? yangiId("bol"),
      nomi: nomi.trim(),
      otaId: boshlangich?.otaId ?? otaId,
      rahbarIdlar: [...rahbarlar],
    });
  }

  return (
    <AppModal className="items-center justify-center bg-[rgba(54,22,8,.45)] p-4 backdrop-blur-[3px]">
      <form
        onSubmit={saqlash}
        className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-[28px] bg-gradient-to-br from-[#FFF8EF] via-[#FFFDF9] to-[#FFE8D2] text-[#253044] shadow-[0_34px_120px_rgba(92,38,8,.42)] ring-1 ring-white/80"
      >
        <header className="flex items-center justify-between gap-4 border-b border-orange-100/80 bg-[#FFF8EF]/90 px-7 py-5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#FFF3E2] text-[#FF6A00]">
              <Building2 size={22} />
            </span>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                {boshlangich ? "Bo'limni tahrirlash" : "Yangi bo'lim"}
              </h1>
              <span className="text-xs font-black uppercase tracking-wider text-[#FF6A00]">
                {boshlangich ? "Bo'lim ma'lumotlari" : `${otaNomi} ostida`}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onYopish}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm transition hover:bg-orange-500 hover:text-white"
            aria-label="Yopish"
          >
            <X size={18} />
          </button>
        </header>

        <div className="scrollbar-orange flex-1 space-y-5 overflow-y-auto px-7 py-6">
          {xato && (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>
          )}

          <section className="rounded-[26px] bg-white/92 p-6 shadow-[0_18px_46px_rgba(255,106,0,.08)] ring-1 ring-orange-100/80">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-400">Bo'lim nomi *</span>
              <input
                value={nomi}
                onChange={(event) => setNomi(event.target.value)}
                placeholder="Savdo bo'limi"
                className={maydonKlass}
              />
            </label>
          </section>

          <section className="rounded-[26px] bg-white/92 p-6 shadow-[0_18px_46px_rgba(255,106,0,.08)] ring-1 ring-orange-100/80">
            <h2 className="border-b border-orange-100/80 pb-3 text-sm font-black uppercase tracking-wide text-slate-600">
              Rahbarlar
            </h2>
            <p className="mt-3 text-xs font-semibold text-slate-400">
              Xodim bo'limga o'z oynasidagi "Bo'lim" maydoni orqali biriktiriladi; bu yerda
              ulardan kim rahbar ekani belgilanadi.
            </p>
            <div className="mt-4 space-y-2">
              {xodimlar.map((xodim) => (
                <label
                  key={xodim.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-orange-50"
                >
                  <input
                    type="checkbox"
                    checked={rahbarlar.has(xodim.id)}
                    onChange={() => toggle(xodim.id)}
                    className="h-5 w-5 shrink-0 accent-[#FF6A00]"
                  />
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-xs font-black text-orange-500">
                    {bosHarflar(xodim)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-slate-700">
                      {xodimNomi(xodim)}
                    </span>
                    <span className="block truncate text-xs font-semibold text-slate-400">
                      {lavozimNomi(lavozimlar, xodim.lavozimId) || "Lavozim ko'rsatilmagan"}
                    </span>
                  </span>
                </label>
              ))}

              {xodimlar.length === 0 && (
                <p className="rounded-xl border border-dashed border-orange-200 p-6 text-center text-sm font-bold text-slate-400">
                  Xodim yo'q
                </p>
              )}
            </div>
          </section>
        </div>

        <footer className="flex justify-end gap-3 border-t border-orange-100 bg-[#FFF8EF]/90 px-7 py-4 backdrop-blur-xl">
          <button
            type="button"
            onClick={onYopish}
            className="rounded-2xl bg-slate-100 px-5 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-200"
          >
            Bekor qilish
          </button>
          <button className="rounded-2xl bg-[#FF6A00] px-6 py-2.5 text-sm font-black text-white shadow-[0_14px_32px_rgba(255,106,0,.24)] transition hover:-translate-y-0.5 hover:bg-[#EA580C]">
            Saqlash
          </button>
        </footer>
      </form>
    </AppModal>
  );
}
