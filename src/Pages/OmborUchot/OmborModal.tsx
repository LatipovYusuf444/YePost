import { useState, type FormEvent } from "react";
import {
  CalendarDays,
  Clock,
  LoaderCircle,
  MapPin,
  Phone,
  User,
  Warehouse,
  X,
} from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { mockMasulShaxslar } from "./mockData";
import type { OmborItem } from "./types";

type Props = {
  boshlangich: OmborItem | null;
  onYopish: () => void;
  onSaqlash: (ombor: OmborItem) => void;
};

export default function OmborModal({ boshlangich, onYopish, onSaqlash }: Props) {
  const [ochilishBoshlangich, yopilishBoshlangich] = (
    boshlangich?.ishlashVaqti ?? "09:00 - 18:00"
  ).split(" - ");

  const [nomi, setNomi] = useState(boshlangich?.nomi ?? "");
  const [gps, setGps] = useState(boshlangich?.gps ?? "");
  const [gpsYuklanmoqda, setGpsYuklanmoqda] = useState(false);
  const [gpsXato, setGpsXato] = useState("");
  const [manzil, setManzil] = useState(boshlangich?.manzil ?? "");
  const [ochilishVaqti, setOchilishVaqti] = useState(ochilishBoshlangich || "09:00");
  const [yopilishVaqti, setYopilishVaqti] = useState(yopilishBoshlangich || "18:00");
  const [yaratilganSana, setYaratilganSana] = useState(
    boshlangich?.yaratilganSana ?? new Date().toISOString().slice(0, 10)
  );
  const [masulShaxs, setMasulShaxs] = useState(boshlangich?.masulShaxs ?? "");
  const [masulShaxsTel, setMasulShaxsTel] = useState(boshlangich?.masulShaxsTel ?? "");
  const [faol, setFaol] = useState(boshlangich?.faol ?? true);

  function gpsniAniqlash() {
    if (!navigator.geolocation) {
      setGpsXato("Brauzer geolokatsiyani qo'llab-quvvatlamaydi.");
      return;
    }
    setGpsXato("");
    setGpsYuklanmoqda(true);
    navigator.geolocation.getCurrentPosition(
      (holat) => {
        const { latitude, longitude } = holat.coords;
        setGps(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        setGpsYuklanmoqda(false);
      },
      () => {
        setGpsXato("Joylashuvni aniqlab bo'lmadi. Koordinatani qo'lda kiriting.");
        setGpsYuklanmoqda(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function saqlash(event: FormEvent) {
    event.preventDefault();
    if (!nomi.trim()) return;

    onSaqlash({
      id: boshlangich?.id ?? crypto.randomUUID(),
      nomi: nomi.trim(),
      manzil: manzil.trim(),
      gps: gps.trim(),
      ishlashVaqti: `${ochilishVaqti} - ${yopilishVaqti}`,
      faol,
      masulShaxs: masulShaxs.trim(),
      masulShaxsTel: masulShaxsTel.trim(),
      yaratganShaxs: boshlangich?.yaratganShaxs ?? masulShaxs.trim() ?? "Siz",
      yaratilganSana,
    });
  }

  return (
    <AppModal className="items-start justify-end bg-slate-950/55 p-0 py-3 pl-3 pr-3 backdrop-blur-[3px]">
      <form
        onSubmit={saqlash}
        className="flex h-[calc(100vh-24px)] w-full max-w-[520px] flex-col overflow-hidden rounded-[36px] bg-gradient-to-br from-[#FFF8EF] via-[#FFFDF9] to-[#FFE7D1] text-[#253044] shadow-[0_34px_120px_rgba(92,38,8,.42)] ring-1 ring-white/80"
      >
        <header className="flex items-start justify-between gap-4 border-b border-orange-100/80 bg-[#FFF8EF]/88 px-6 py-3.5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-[#FFF3E2] text-[#FF6A00]">
              <Warehouse size={20} />
            </span>
            <div className="min-w-0">
              <h2 className="text-[22px] font-black tracking-tight text-slate-950">
                {boshlangich ? "Omborni tahrirlash" : "Yangi ombor"}
              </h2>
              <span className="text-xs font-black uppercase tracking-wider text-[#FF6A00]">
                {boshlangich ? "Tahrirlash" : "Yangi"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onYopish}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-[#FF6A00] hover:text-white"
            aria-label="Oynani yopish"
          >
            <X size={18} />
          </button>
        </header>

        <div className="scrollbar-hidden flex-1 overflow-y-auto px-6 py-4">
          <section className="rounded-[22px] bg-white/92 p-4 shadow-[0_18px_46px_rgba(255,106,0,.08)] ring-1 ring-orange-100/80 backdrop-blur">
            <div className="mb-4 border-b border-orange-100/80 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">
                Ombor haqida
              </h3>
            </div>

            <div className="space-y-4">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-400">Ombor nomi *</span>
                <input
                  value={nomi}
                  onChange={(event) => setNomi(event.target.value)}
                  placeholder="Masalan: Markaziy ombor"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <div className="grid gap-2">
                <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                  <MapPin size={14} className="text-[#FF6A00]" />
                  Joylashuvi (GPS)
                </span>
                <div className="flex gap-2">
                  <input
                    value={gps}
                    onChange={(event) => setGps(event.target.value)}
                    placeholder="41.311081, 69.240562"
                    className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
                  />
                  <button
                    type="button"
                    onClick={gpsniAniqlash}
                    disabled={gpsYuklanmoqda}
                    className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 text-xs font-black uppercase text-[#FF6A00] transition hover:bg-orange-100 disabled:opacity-60"
                  >
                    {gpsYuklanmoqda ? (
                      <LoaderCircle size={15} className="animate-spin" />
                    ) : (
                      <MapPin size={15} />
                    )}
                    Aniqlash
                  </button>
                </div>
                {gpsXato && <p className="text-xs font-semibold text-red-500">{gpsXato}</p>}
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-400">Manzil</span>
                <input
                  value={manzil}
                  onChange={(event) => setManzil(event.target.value)}
                  placeholder="Toshkent, Chilonzor tumani, 12-uy"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <div className="grid gap-2">
                <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                  <Clock size={14} className="text-[#FF6A00]" />
                  Ishlash vaqti
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={ochilishVaqti}
                    onChange={(event) => setOchilishVaqti(event.target.value)}
                    className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
                  />
                  <span className="text-slate-400">—</span>
                  <input
                    type="time"
                    value={yopilishVaqti}
                    onChange={(event) => setYopilishVaqti(event.target.value)}
                    className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
                  />
                </div>
              </div>

              <label className="grid gap-2">
                <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                  <CalendarDays size={14} className="text-[#FF6A00]" />
                  Yaratilgan sana
                </span>
                <input
                  type="date"
                  value={yaratilganSana}
                  onChange={(event) => setYaratilganSana(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <div className="grid gap-3 rounded-2xl border border-orange-100 bg-orange-50/40 p-3.5">
                <div className="flex items-center gap-2">
                  <User size={15} className="text-[#FF6A00]" />
                  <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Mas'ul shaxs
                  </span>
                </div>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-400">Ismi</span>
                  <input
                    value={masulShaxs}
                    onChange={(event) => setMasulShaxs(event.target.value)}
                    list="ombor-masul-shaxslar"
                    placeholder="Mas'ul shaxs ismi"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
                  />
                  <datalist id="ombor-masul-shaxslar">
                    {mockMasulShaxslar.map((shaxs) => (
                      <option key={shaxs} value={shaxs} />
                    ))}
                  </datalist>
                </label>

                <label className="grid gap-2">
                  <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                    <Phone size={14} className="text-[#FF6A00]" />
                    Tel nomer
                  </span>
                  <input
                    type="tel"
                    value={masulShaxsTel}
                    onChange={(event) => setMasulShaxsTel(event.target.value)}
                    placeholder="+998 90 123 45 67"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
                  />
                </label>
              </div>

              <label className="flex items-center gap-3 text-sm font-bold text-slate-600">
                <input
                  type="checkbox"
                  checked={faol}
                  onChange={(event) => setFaol(event.target.checked)}
                  className="h-5 w-5 accent-orange-500"
                />
                Ombor faol
              </label>
            </div>
          </section>
        </div>

        <footer className="flex justify-end gap-3 border-t border-orange-100 bg-[#FFF8EF]/90 px-6 py-3.5 backdrop-blur-xl">
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
