import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import InlineLoading from "./InlineLoading";
import { summaniAjratish } from "@/Pages/Monitoring/summaMatni";

// Hisobotlardagi ko'rsatkich kartalari uchun yagona dizayn (Monitoring → Ombor kartalari uslubida):
// rangli ikonka plitkasi, sarlavha, katta qiymat (birligi kichikroq), burchakda belgi va o'ng tomonda kichik bezak.
export type KartaRangi = "blue" | "violet" | "amber" | "rose" | "emerald";

const USLUBLAR: Record<KartaRangi, { karta: string; plitka: string; belgi: string; halqa: string }> = {
  blue: {
    karta: "border-blue-200/70 from-blue-50 via-white to-sky-50/70 hover:shadow-blue-200/70",
    plitka: "from-blue-100 to-sky-50 text-blue-600 ring-blue-200/70",
    belgi: "bg-blue-100/80 text-blue-700",
    halqa: "ring-2 ring-blue-300",
  },
  violet: {
    karta: "border-violet-200/70 from-violet-50 via-white to-fuchsia-50/60 hover:shadow-violet-200/70",
    plitka: "from-violet-100 to-fuchsia-50 text-violet-600 ring-violet-200/70",
    belgi: "bg-violet-100/80 text-violet-700",
    halqa: "ring-2 ring-violet-300",
  },
  amber: {
    karta: "border-amber-200/70 from-amber-50 via-white to-yellow-50/70 hover:shadow-amber-200/70",
    plitka: "from-amber-100 to-yellow-50 text-amber-600 ring-amber-200/70",
    belgi: "bg-amber-100/80 text-amber-700",
    halqa: "ring-2 ring-amber-300",
  },
  rose: {
    karta: "border-rose-200/70 from-rose-50 via-white to-pink-50/70 hover:shadow-rose-200/70",
    plitka: "from-rose-100 to-pink-50 text-rose-600 ring-rose-200/70",
    belgi: "bg-rose-100/80 text-rose-700",
    halqa: "ring-2 ring-rose-300",
  },
  emerald: {
    karta: "border-emerald-200/70 from-emerald-50 via-white to-teal-50/70 hover:shadow-emerald-200/70",
    plitka: "from-emerald-100 to-teal-50 text-emerald-600 ring-emerald-200/70",
    belgi: "bg-emerald-100/80 text-emerald-700",
    halqa: "ring-2 ring-emerald-300",
  },
};

// Belgi ohangi: odatda kartaning o'z rangi; `yaxshi` — yashil, `xavfli` — qizil.
export type KartaBelgisi = { matn: string; ohang?: "yaxshi" | "xavfli" };

type Props = {
  icon: LucideIcon;
  nom: string;
  // Tayyor formatlangan qiymat, masalan "505,000 so'm" yoki "0.87%". Oxirgi qism (birlik) kichikroq ko'rsatiladi.
  qiymat: string;
  rang: KartaRangi;
  belgi?: KartaBelgisi;
  // Faqat bezak: real ma'lumotdan chizilgan KartaChiziqlari yoki KartaOlchagich.
  ornament?: ReactNode;
  yuklanmoqda?: boolean;
  // Qiymat qizil rangda (masalan, manfiy farq).
  manfiy?: boolean;
  yuklanishMatni?: string;
  // Berilsa karta bosiladigan tugmaga aylanadi (masalan, holat bo'yicha filtr); `tanlangan` — hozir tanlangan filtr.
  onClick?: () => void;
  tanlangan?: boolean;
};

export default function KorsatkichKartasi({ icon: Icon, nom, qiymat, rang, belgi, ornament, yuklanmoqda = false, manfiy = false, yuklanishMatni, onClick, tanlangan = false }: Props) {
  const uslub = USLUBLAR[rang];
  const { raqam, birlik } = summaniAjratish(qiymat);
  const belgiKlass =
    belgi?.ohang === "yaxshi" ? "bg-emerald-100/80 text-emerald-700" : belgi?.ohang === "xavfli" ? "bg-rose-100/80 text-rose-700" : uslub.belgi;

  const klass = `@container group block w-full min-w-0 rounded-[22px] border bg-linear-to-br p-4 text-left shadow-[0_8px_24px_-16px_rgba(15,23,42,.22)] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-5 ${uslub.karta} ${tanlangan && !yuklanmoqda ? uslub.halqa : ""}`;
  const ichki = (
    <span className="flex items-center gap-3.5">
      <span aria-hidden className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br shadow-sm ring-1 ${uslub.plitka}`}>
        <Icon size={26} strokeWidth={1.9} />
      </span>
      <span className="block min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="block min-w-0 text-[13px] font-semibold leading-snug text-slate-600">{nom}</span>
          {belgi && !yuklanmoqda && (
            <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${belgiKlass}`}>{belgi.matn}</span>
          )}
        </span>
        <span className="mt-1.5 flex items-end justify-between gap-3">
          {yuklanmoqda ? (
            <InlineLoading matn={yuklanishMatni ?? "Yuklanmoqda..."} className="min-h-9" />
          ) : (
            <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
              <span className={`whitespace-nowrap text-[26px] font-extrabold leading-none tracking-tight tabular-nums ${manfiy ? "text-rose-600" : "text-slate-950"}`}>{raqam}</span>
              {birlik && <span className="text-sm font-bold text-slate-500">{birlik}</span>}
            </span>
          )}
          {!yuklanmoqda && ornament && <span className="hidden shrink-0 @[300px]:block">{ornament}</span>}
        </span>
      </span>
    </span>
  );

  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      disabled={yuklanmoqda}
      aria-pressed={tanlangan}
      aria-busy={yuklanmoqda}
      className={`${klass} cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:cursor-default`}
    >
      {ichki}
    </button>
  ) : (
    <div className={klass}>{ichki}</div>
  );
}

// Bezak: ustunlar soni va balandligi kartadagi real qiymatlardan olinadi (yangi ma'lumot o'ylab topilmaydi).
export function KartaChiziqlari({ qiymatlar, klass }: { qiymatlar: number[]; klass: string }) {
  if (qiymatlar.length === 0) return null;
  const eng = Math.max(...qiymatlar.map((qiymat) => Math.abs(qiymat)), 1);
  return (
    <div aria-hidden className="flex h-9 items-end gap-1">
      {qiymatlar.map((qiymat, index) => (
        <span
          key={index}
          className={`w-2.5 rounded-t-md opacity-80 ${klass}`}
          style={{ height: `${Math.max(24, (Math.abs(qiymat) / eng) * 100)}%` }}
        />
      ))}
    </div>
  );
}

// Bezak: `faol` / `jami` nisbatiga qarab to'lgan 10 ta bo'lakli o'lchagich.
export function KartaOlchagich({ faol, jami, klass }: { faol: number; jami: number; klass: string }) {
  const BOLAKLAR = 10;
  const tolgan = jami > 0 ? Math.min(BOLAKLAR, Math.max(faol > 0 ? 1 : 0, Math.round((faol / jami) * BOLAKLAR))) : 0;
  return (
    <div aria-hidden className="flex h-9 items-end gap-1">
      {Array.from({ length: BOLAKLAR }, (_, index) => (
        <span key={index} className={`w-1.5 rounded-full ${index < tolgan ? klass : "bg-slate-200/80"}`} style={{ height: `${38 + index * 6}%` }} />
      ))}
    </div>
  );
}
