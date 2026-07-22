import { useState, type FormEvent } from "react";
import { ShieldCheck, X } from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { backendVakolatlar } from "./backendMetadata";
import type { Lavozim } from "./types";
import { bugun, maydonKlass, yangiId } from "./yordamchilar";

type Props = {
  boshlangich: Lavozim | null;
  onYopish: () => void;
  onSaqlash: (lavozim: Lavozim) => void;
};

// Lavozim yaratish/tahrirlash — vakolatlar shu yerda belgilanadi va
// lavozimdagi barcha xodimlarga avtomatik tarqaladi.
export default function LavozimModal({ boshlangich, onYopish, onSaqlash }: Props) {
  const [nomi, setNomi] = useState(boshlangich?.nomi ?? "");
  const [izoh, setIzoh] = useState(boshlangich?.izoh ?? "");
  const [vakolatlar, setVakolatlar] = useState<Set<string>>(
    () => new Set(boshlangich?.vakolatlar ?? [])
  );
  const [xato, setXato] = useState("");

  const guruhlar = [...new Set(backendVakolatlar.map((vakolat) => vakolat.guruh))];

  function toggle(kod: string) {
    setVakolatlar((oldingi) => {
      const yangi = new Set(oldingi);
      if (yangi.has(kod)) yangi.delete(kod);
      else yangi.add(kod);
      return yangi;
    });
  }

  function saqlash(event: FormEvent) {
    event.preventDefault();
    if (!nomi.trim()) {
      setXato("Lavozim nomi to'ldirilishi shart.");
      return;
    }

    onSaqlash({
      id: boshlangich?.id ?? yangiId("lav"),
      nomi: nomi.trim(),
      izoh: izoh.trim(),
      vakolatlar: [...vakolatlar],
      yaratganMasul: boshlangich?.yaratganMasul ?? "Administrator",
      yaratilganSana: boshlangich?.yaratilganSana ?? bugun(),
      ozgartirilganSana: bugun(),
    });
  }

  return (
    <AppModal className="items-center justify-center bg-[rgba(54,22,8,.45)] p-4 backdrop-blur-[3px]">
      <form
        onSubmit={saqlash}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-gradient-to-br from-[#FFF8EF] via-[#FFFDF9] to-[#FFE8D2] text-[#253044] shadow-[0_34px_120px_rgba(92,38,8,.42)] ring-1 ring-white/80"
      >
        <header className="flex items-center justify-between gap-4 border-b border-orange-100/80 bg-[#FFF8EF]/90 px-7 py-5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#FFF3E2] text-[#FF6A00]">
              <ShieldCheck size={22} />
            </span>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                {boshlangich ? "Lavozimni tahrirlash" : "Yangi lavozim"}
              </h1>
              <span className="text-xs font-black uppercase tracking-wider text-[#FF6A00]">
                Lavozim va vakolatlari
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

          <section className="space-y-4 rounded-[26px] bg-white/92 p-6 shadow-[0_18px_46px_rgba(255,106,0,.08)] ring-1 ring-orange-100/80">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-400">Lavozim nomi *</span>
              <input
                value={nomi}
                onChange={(event) => setNomi(event.target.value)}
                placeholder="Sotuv menejeri"
                className={maydonKlass}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-400">Izoh</span>
              <textarea
                value={izoh}
                onChange={(event) => setIzoh(event.target.value)}
                placeholder="Lavozim nima bilan shug'ullanadi"
                className="min-h-20 w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
              />
            </label>
          </section>

          {guruhlar.map((guruh) => (
            <section
              key={guruh}
              className="rounded-[26px] bg-white/92 p-6 shadow-[0_18px_46px_rgba(255,106,0,.08)] ring-1 ring-orange-100/80"
            >
              <h2 className="border-b border-orange-100/80 pb-3 text-sm font-black uppercase tracking-wide text-slate-600">
                {guruh}
              </h2>
              <div className="mt-4 space-y-2">
                {backendVakolatlar
                  .filter((vakolat) => vakolat.guruh === guruh)
                  .map((vakolat) => (
                    <label
                      key={vakolat.kod}
                      className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 transition hover:bg-orange-50"
                    >
                      <input
                        type="checkbox"
                        checked={vakolatlar.has(vakolat.kod)}
                        onChange={() => toggle(vakolat.kod)}
                        className="mt-1 h-5 w-5 shrink-0 accent-[#FF6A00]"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-black text-slate-700">{vakolat.nom}</span>
                        <span className="mt-0.5 block text-xs font-semibold text-slate-400">
                          {vakolat.izoh}
                        </span>
                      </span>
                    </label>
                  ))}
              </div>
            </section>
          ))}
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
