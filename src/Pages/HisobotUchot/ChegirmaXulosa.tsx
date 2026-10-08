import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, BadgePercent, CalendarDays, Info, RefreshCw, Sun, type LucideIcon } from "lucide-react";
import InlineLoading from "@/Components/common/InlineLoading";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { sanaMatni, summaniAjratish } from "@/Pages/Monitoring/summaMatni";
import { chegirmaXulosalariniOlish, type ChegirmaXulosa, type ChegirmaXulosalari } from "./chegirmaYordamchilari";
import { pul, son } from "./yordamchilar";

// "Bugun" va "Shu oy" bo'yicha chegirmalar xulosasi: jami chegirma, chegirmali savdolar soni va ularning ulushi.
// Sana filtri bu bloka ta'sir qilmaydi — u doim bugungi kun va joriy oyni ko'rsatadi.
export default function ChegirmaXulosaBlok() {
  const [malumot, setMalumot] = useState<ChegirmaXulosalari | null>(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [xato, setXato] = useState("");

  const yuklash = useCallback(() => {
    let faol = true;
    setYuklanmoqda(true);
    setXato("");
    chegirmaXulosalariniOlish()
      .then((javob) => {
        if (faol) setMalumot(javob);
      })
      .catch((error) => {
        if (faol) setXato(getApiErrorMessage(error));
      })
      .finally(() => {
        if (faol) setYuklanmoqda(false);
      });
    return () => {
      faol = false;
    };
  }, []);

  useEffect(() => yuklash(), [yuklash]);

  return (
    <section aria-label="Chegirmalar xulosasi" className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium leading-6 text-blue-800">
        <Info size={18} className="mt-1 shrink-0" aria-hidden />
        <p>
          Kassir sotuv narxini katalog narxidan pastga tushirsa (masalan, 18 000 → 17 800), farq —{" "}
          <b className="font-extrabold">200 so‘m chegirma</b> — har bir savdoda <b className="font-extrabold">avtomatik</b>{" "}
          hisoblanib saqlanadi. Do‘konchi qo‘lda sanab yurmaydi — jamisi shu yerda ko‘rinadi.
        </p>
      </div>

      {xato ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          <span className="flex items-center gap-2">
            <AlertTriangle size={16} aria-hidden />
            {xato}
          </span>
          <button
            type="button"
            onClick={yuklash}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-100"
          >
            <RefreshCw size={13} aria-hidden /> Qayta urinish
          </button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <DavrKartasi
            icon={Sun}
            nom="Bugun"
            sana={malumot ? sanaMatni(malumot.bugunKuni) : ""}
            qiymat={malumot?.bugun}
            yuklanmoqda={yuklanmoqda}
            tile="from-amber-500 to-rose-500 shadow-amber-500/30"
            glow="from-amber-200/70 to-transparent"
            bar="from-amber-500 to-rose-500"
          />
          <DavrKartasi
            icon={CalendarDays}
            nom="Shu oy"
            sana={malumot ? `${sanaMatni(malumot.oyBoshi)} — ${sanaMatni(malumot.bugunKuni)}` : ""}
            qiymat={malumot?.oy}
            yuklanmoqda={yuklanmoqda}
            tile="from-indigo-500 to-violet-500 shadow-indigo-500/30"
            glow="from-indigo-200/70 to-transparent"
            bar="from-indigo-500 to-violet-500"
          />
        </div>
      )}

      {malumot?.manba === "sotuvlar" && (
        <p className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-800">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            Backendda chegirmalar hisoboti (<code className="font-mono">/reports/discounts</code>) hali ulanmagan, shuning uchun
            raqamlar sotuvlar ro‘yxatidagi chegirmalardan hisoblandi. Qaytarishlar hisobga olinmagan.
          </span>
        </p>
      )}
    </section>
  );
}

function DavrKartasi({
  icon: Icon,
  nom,
  sana,
  qiymat,
  yuklanmoqda,
  tile,
  glow,
  bar,
}: {
  icon: LucideIcon;
  nom: string;
  sana: string;
  qiymat?: ChegirmaXulosa;
  yuklanmoqda: boolean;
  tile: string;
  glow: string;
  bar: string;
}) {
  const jami = qiymat?.jami ?? 0;
  const chegirmali = qiymat?.chegirmaliSotuvlar ?? 0;
  const barchasi = qiymat?.sotuvlarSoni ?? 0;
  const ulush = barchasi > 0 ? Math.min(100, (chegirmali / barchasi) * 100) : 0;
  const summa = summaniAjratish(pul(jami));

  return (
    <article className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
      <span aria-hidden className={`pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-linear-to-br ${glow} blur-3xl`} />

      <header className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span aria-hidden className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br text-white shadow-lg ${tile}`}>
            <Icon size={22} strokeWidth={2.2} />
          </span>
          <div>
            <h3 className="text-lg font-extrabold tracking-tight text-slate-950">{nom}</h3>
            <p className="text-xs font-semibold tabular-nums text-slate-500">{sana || " "}</p>
          </div>
        </div>
      </header>

      <div className="relative mt-5">
        <p className="text-[13px] font-medium text-slate-500">Jami berilgan chegirma</p>
        {yuklanmoqda ? (
          <InlineLoading matn="Chegirmalar yuklanmoqda..." ikonka={<BadgePercent size={14} />} className="mt-2 h-11.5" />
        ) : (
          <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-3xl font-extrabold leading-tight tracking-tight tabular-nums text-slate-950 sm:text-[34px]">
            <span>{summa.raqam}</span>
            {summa.birlik && <span className="text-base font-semibold tracking-normal text-slate-500">{summa.birlik}</span>}
          </p>
        )}
      </div>

      <dl className="relative mt-5 grid gap-5 border-t border-dashed border-slate-200 pt-5 sm:grid-cols-2">
        <Korsatkich nom="Chegirmali savdolar" yuklanmoqda={yuklanmoqda}>
          <span className="text-2xl font-extrabold tabular-nums text-slate-950">{son(chegirmali)}</span>
          <span className="ml-1.5 text-sm font-semibold text-slate-500">ta savdo</span>
          <span className="mt-0.5 block text-xs font-medium text-slate-500">jami {son(barchasi)} ta savdodan</span>
        </Korsatkich>
        <Korsatkich nom="Chegirma ishlatilgan savdolar ulushi" yuklanmoqda={yuklanmoqda}>
          <span className="text-2xl font-extrabold tabular-nums text-slate-950">{ulush.toFixed(ulush % 1 === 0 ? 0 : 1)}%</span>
          <span
            role="progressbar"
            aria-label="Chegirma ishlatilgan savdolar ulushi"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(ulush)}
            className="mt-2 block h-1.5 overflow-hidden rounded-full bg-slate-100"
          >
            <span
              className={`block h-full origin-left rounded-full bg-linear-to-r transition-transform duration-700 motion-reduce:transition-none ${bar}`}
              style={{ transform: `scaleX(${ulush / 100})` }}
            />
          </span>
        </Korsatkich>
      </dl>

      {qiymat?.bonus != null && (
        <div className="relative mt-5 grid gap-4 rounded-2xl bg-emerald-50/70 p-4 ring-1 ring-emerald-100 sm:grid-cols-2">
          <Korsatkich nom="Olingan zavod bonusi" yuklanmoqda={yuklanmoqda}>
            <span className="text-xl font-extrabold tabular-nums text-emerald-700">{pul(qiymat.bonus)}</span>
          </Korsatkich>
          <Korsatkich nom="Bonus − chegirma" yuklanmoqda={yuklanmoqda}>
            <span className={`text-xl font-extrabold tabular-nums ${(qiymat.bonusMinusChegirma ?? 0) >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
              {pul(qiymat.bonusMinusChegirma ?? 0)}
            </span>
          </Korsatkich>
        </div>
      )}

      {!yuklanmoqda && qiymat && barchasi > 0 && chegirmali === 0 && (
        <p className="relative mt-4 text-xs font-semibold text-slate-500">Bu davrda hech bir savdoda chegirma berilmagan.</p>
      )}
      {!yuklanmoqda && qiymat && barchasi === 0 && (
        <p className="relative mt-4 text-xs font-semibold text-slate-500">Bu davrda tasdiqlangan savdo yo‘q.</p>
      )}
    </article>
  );
}

function Korsatkich({ nom, yuklanmoqda, children }: { nom: string; yuklanmoqda: boolean; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-slate-500">{nom}</dt>
      <dd className="mt-1.5">
        {yuklanmoqda ? <span aria-hidden className="block h-8 w-28 animate-pulse rounded-lg bg-slate-100" /> : children}
      </dd>
    </div>
  );
}
