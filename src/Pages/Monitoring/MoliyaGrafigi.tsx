import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChartColumn, Eye, EyeOff, Receipt, RefreshCw, TrendingDown, TrendingUp, TriangleAlert, Wallet, type LucideIcon } from "lucide-react";
import { Area, Bar, CartesianGrid, ComposedChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import LoadingState from "@/Components/common/LoadingState";
import { pulMatni, summaniOgirish } from "@/lib/valyuta";
import {
  MOLIYA_GURUHLARI,
  MOLIYA_MAKS_DAVR,
  avtoMoliyaGuruhi,
  moliyaNuqtalariniOlish,
  moliyaOraliqlari,
  type MoliyaGuruhi,
  type MoliyaNuqtasi,
  type MoliyaOraligi,
} from "./boshqaruvMalumotlari";
import { sanaMatni, summaniAjratish } from "./summaMatni";

// Daromad, xarajat va sof foyda bitta grafikda. Sana oralig'i Monitoring sahifasining umumiy filtridan olinadi;
// "Guruhlash" faqat shu oraliq qanday bo'laklarga bo'linishini tanlaydi. Ma'lumot /reports/income-expense dan keladi
// (har bir davr uchun alohida so'rov); hech qanday namuna ma'lumot ishlatilmaydi.
const DAROMAD_RANGI = "var(--theme-primary, #2563EB)";
const XARAJAT_RANGI = "#F59E0B";
const FOYDA_RANGI = "#059669";
const OQ_MATN_RANGI = "#64748b";

type Qator = "daromad" | "xarajat" | "sofFoyda";

type Props = {
  dateFrom: string;
  dateTo: string;
  // Yuqoridagi "Yangilash" tugmasi bosilganda o'zgaradi: keshni tozalab, qayta yuklaydi.
  yangilanish: number;
};

type GrafikQatori = { nom: string; toliqNom: string; daromad: number; xarajat: number; sofFoyda: number };

export default function MoliyaGrafigi({ dateFrom, dateTo, yangilanish }: Props) {
  const { t, i18n } = useTranslation("monitoring");
  const id = useId().replace(/:/g, "");
  const [tanlangan, setTanlangan] = useState<MoliyaGuruhi | null>(null);
  const [nuqtalar, setNuqtalar] = useState<MoliyaNuqtasi[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [qaytaSoni, setQaytaSoni] = useState(0);
  const [yashirin, setYashirin] = useState<Record<Qator, boolean>>({ daromad: false, xarajat: false, sofFoyda: false });
  const [harakatKam, setHarakatKam] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const keshi = useRef(new Map<string, MoliyaNuqtasi>());
  const oxirgiYangilanish = useRef(yangilanish);
  const locale = i18n.resolvedLanguage === "ru" ? "ru-RU" : "uz-UZ";

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const yangila = () => setHarakatKam(query.matches);
    query.addEventListener("change", yangila);
    return () => query.removeEventListener("change", yangila);
  }, []);

  // Har bir guruhlash uchun davrlar soni: juda ko'p so'rov ketmasligi uchun cheklangan.
  const davrlarSoni = useMemo(
    () => Object.fromEntries(MOLIYA_GURUHLARI.map((guruh) => [guruh, moliyaOraliqlari(dateFrom, dateTo, guruh).length])) as Record<MoliyaGuruhi, number>,
    [dateFrom, dateTo],
  );
  const mumkin = (guruh: MoliyaGuruhi) => davrlarSoni[guruh] > 0 && davrlarSoni[guruh] <= MOLIYA_MAKS_DAVR;
  const guruh = useMemo<MoliyaGuruhi>(() => {
    const avto = avtoMoliyaGuruhi(dateFrom, dateTo);
    if (tanlangan && mumkin(tanlangan)) return tanlangan;
    if (mumkin(avto)) return avto;
    return MOLIYA_GURUHLARI.find(mumkin) ?? "yil";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tanlangan, dateFrom, dateTo, davrlarSoni]);

  const oraliqlar = useMemo(() => moliyaOraliqlari(dateFrom, dateTo, guruh), [dateFrom, dateTo, guruh]);

  useEffect(() => {
    if (oxirgiYangilanish.current !== yangilanish) {
      keshi.current.clear();
      oxirgiYangilanish.current = yangilanish;
    }
    let faol = true;
    setYuklanmoqda(true);
    moliyaNuqtalariniOlish(oraliqlar, keshi.current, () => faol)
      .then((natija) => {
        if (faol) setNuqtalar(natija);
      })
      .finally(() => {
        if (faol) setYuklanmoqda(false);
      });
    return () => {
      faol = false;
    };
  }, [oraliqlar, yangilanish, qaytaSoni]);

  const pul = (summa: number) => pulMatni(summa, "UZS", true, t("dynamics.currency"));
  const qisqa = (qiymat: number) => {
    const value = summaniOgirish(qiymat);
    const abs = Math.abs(value);
    if (abs >= 1_000_000_000) return `${Number((value / 1_000_000_000).toFixed(1))} ${t("dynamics.billion")}`;
    if (abs >= 1_000_000) return `${Number((value / 1_000_000).toFixed(1))} ${t("dynamics.million")}`;
    if (abs >= 1_000) return `${Number((value / 1_000).toFixed(1))} ${t("dynamics.thousand")}`;
    return value.toLocaleString(locale);
  };

  const kunOy = (kun: string) => `${kun.slice(8, 10)}.${kun.slice(5, 7)}`;
  const qisqaNom = (o: MoliyaOraligi) =>
    guruh === "kun" || guruh === "hafta"
      ? kunOy(o.dan)
      : guruh === "oy"
        ? `${String(o.oy).padStart(2, "0")}.${o.yil}`
        : guruh === "chorak"
          ? t("boshqaruv.chart.quarterShort", { n: o.chorak, yil: o.yil })
          : String(o.yil);
  // "Eng yaxshi davr" uchun: hafta bo'lsa butun oraliq ("09.09 – 13.09"), qolganlarida qisqa nom.
  const davrNomi = (o: MoliyaOraligi) => (guruh === "hafta" && o.dan !== o.gacha ? `${kunOy(o.dan)} – ${kunOy(o.gacha)}` : qisqaNom(o));
  const toliqNom = (o: MoliyaOraligi) => (o.dan === o.gacha ? sanaMatni(o.dan) : `${sanaMatni(o.dan)} — ${sanaMatni(o.gacha)}`);

  const qatorlar = useMemo<GrafikQatori[]>(
    () => nuqtalar.map((nuqta) => ({ nom: qisqaNom(nuqta.oraliq), toliqNom: toliqNom(nuqta.oraliq), daromad: nuqta.daromad, xarajat: nuqta.xarajat, sofFoyda: nuqta.sofFoyda })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nuqtalar, guruh, i18n.resolvedLanguage],
  );

  const yuklanmaganlar = nuqtalar.filter((nuqta) => nuqta.xato).length;
  const hammasiXato = nuqtalar.length > 0 && yuklanmaganlar === nuqtalar.length;
  const yuklanganlar = nuqtalar.filter((nuqta) => !nuqta.xato);
  const jami = useMemo(
    () => ({
      daromad: nuqtalar.reduce((sum, n) => sum + n.daromad, 0),
      xarajat: nuqtalar.reduce((sum, n) => sum + n.xarajat, 0),
      sofFoyda: nuqtalar.reduce((sum, n) => sum + n.sofFoyda, 0),
    }),
    [nuqtalar],
  );
  const malumotBor = nuqtalar.some((n) => !n.xato && (n.daromad !== 0 || n.xarajat !== 0 || n.sofFoyda !== 0));
  const foyda = jami.sofFoyda;
  const foydaFoizi = jami.daromad > 0 ? (foyda / jami.daromad) * 100 : null;
  const xarajatFoizi = jami.daromad > 0 ? (jami.xarajat / jami.daromad) * 100 : null;

  // Grafik ostidagi qisqa xulosa: faqat yuklangan davrlar bo'yicha hisoblanadi.
  const engYaxshi = yuklanganlar.length > 0 ? [...yuklanganlar].sort((a, b) => b.sofFoyda - a.sofFoyda)[0] : undefined;
  const ortachaFoyda = yuklanganlar.length > 0 ? foyda / yuklanganlar.length : 0;
  const zararDavrlari = yuklanganlar.filter((nuqta) => nuqta.sofFoyda < 0).length;

  const korsatkichlar: { kalit: Qator; nom: string; rang: string; qiymat: number; icon: LucideIcon; tile: string; izoh: string; manfiy: boolean }[] = [
    {
      kalit: "daromad",
      nom: t("boshqaruv.chart.revenue"),
      rang: DAROMAD_RANGI,
      qiymat: jami.daromad,
      icon: TrendingUp,
      tile: "from-blue-500 to-indigo-500 shadow-blue-500/30",
      izoh: t("boshqaruv.chart.revenueSub", { count: yuklanganlar.length }),
      manfiy: false,
    },
    {
      kalit: "xarajat",
      nom: t("boshqaruv.chart.expense"),
      rang: XARAJAT_RANGI,
      qiymat: jami.xarajat,
      icon: Receipt,
      tile: "from-amber-500 to-yellow-500 shadow-amber-500/30",
      izoh: xarajatFoizi != null ? t("boshqaruv.chart.expenseSub", { percent: xarajatFoizi.toFixed(1) }) : t("boshqaruv.chart.expenseSubEmpty"),
      manfiy: false,
    },
    {
      kalit: "sofFoyda",
      nom: foyda < 0 ? t("boshqaruv.chart.loss") : t("boshqaruv.chart.profit"),
      rang: FOYDA_RANGI,
      qiymat: foyda,
      icon: foyda < 0 ? TrendingDown : Wallet,
      tile: foyda < 0 ? "from-rose-500 to-pink-500 shadow-rose-500/30" : "from-emerald-500 to-teal-500 shadow-emerald-500/30",
      izoh: foydaFoizi != null ? t("boshqaruv.chart.profitSub", { percent: foydaFoizi.toFixed(1) }) : t("boshqaruv.chart.profitSubEmpty"),
      manfiy: foyda < 0,
    },
  ];

  const tayyor = !yuklanmoqda && !hammasiXato && malumotBor;

  return (
    <section aria-label={t("boshqaruv.chart.title")} className="monitoring-enter relative flex h-full min-w-0 flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm">
      <span aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-linear-to-br from-emerald-200/50 to-transparent blur-3xl" />

      <header className="relative flex flex-wrap items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="flex min-w-0 items-center gap-3.5">
          <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30">
            <ChartColumn size={22} strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-slate-950">{t("boshqaruv.chart.title")}</h2>
            <p className="mt-0.5 text-[13px] leading-5 text-slate-500">
              {t("boshqaruv.chart.subtitle")} · <span className="tabular-nums">{sanaMatni(dateFrom)} — {sanaMatni(dateTo)}</span>
            </p>
          </div>
        </div>
        <div className="flex max-w-full flex-wrap gap-1 rounded-2xl bg-slate-100/80 p-1" role="group" aria-label={t("boshqaruv.chart.grouping")}>
          {MOLIYA_GURUHLARI.map((item) => {
            const ruxsat = mumkin(item);
            return (
              <button
                key={item}
                type="button"
                disabled={!ruxsat}
                aria-pressed={guruh === item}
                title={ruxsat ? undefined : t("boshqaruv.chart.tooMany", { max: MOLIYA_MAKS_DAVR })}
                onClick={() => setTanlangan(item)}
                className={`cursor-pointer rounded-xl px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:cursor-not-allowed disabled:opacity-40 ${
                  guruh === item ? "bg-blue-600 text-white shadow-md shadow-blue-600/25" : "text-slate-600 hover:bg-white hover:text-slate-950"
                }`}
              >
                {t(`boshqaruv.chart.group.${item}`)}
              </button>
            );
          })}
        </div>
      </header>

      <div className="relative mt-5 grid gap-3 px-5 sm:grid-cols-3 sm:px-6">
        {korsatkichlar.map((item) => {
          const bolak = summaniAjratish(pul(item.qiymat));
          const ochiq = !yashirin[item.kalit];
          const Ikona = item.icon;
          const Korinish = ochiq ? Eye : EyeOff;
          return (
            <button
              key={item.kalit}
              type="button"
              aria-pressed={ochiq}
              title={t("boshqaruv.chart.toggleHint")}
              onClick={() => setYashirin((joriy) => ({ ...joriy, [item.kalit]: !joriy[item.kalit] }))}
              className={`group relative flex min-w-0 cursor-pointer items-start gap-3 rounded-2xl border border-slate-200/70 p-3.5 text-left transition-[opacity,box-shadow] duration-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 motion-reduce:transition-none ${ochiq ? "bg-white" : "bg-slate-50 opacity-55"}`}
            >
              <span aria-hidden className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-lg ${item.tile}`}>
                <Ikona size={18} strokeWidth={2.2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-500">
                  <span className="truncate">{item.nom}</span>
                  <Korinish size={14} aria-hidden className="shrink-0 text-slate-300 transition-colors group-hover:text-slate-500" />
                </span>
                <span className={`mt-0.5 flex flex-wrap items-baseline gap-x-1.5 text-xl font-extrabold leading-tight tracking-tight tabular-nums ${item.manfiy ? "text-rose-600" : "text-slate-950"}`}>
                  {yuklanmoqda || hammasiXato ? "—" : bolak.raqam}
                  {!yuklanmoqda && !hammasiXato && bolak.birlik && <span className="text-xs font-semibold tracking-normal text-slate-500">{bolak.birlik}</span>}
                </span>
                <span className="mt-1 block text-[11px] font-medium leading-4 text-slate-500">{yuklanmoqda || hammasiXato ? " " : item.izoh}</span>
              </span>
              <span aria-hidden className="absolute inset-x-3.5 bottom-0 h-0.5 rounded-full" style={{ background: ochiq ? item.rang : "transparent", opacity: 0.55 }} />
            </button>
          );
        })}
      </div>

      <div className="relative mt-4 flex min-h-0 flex-1 flex-col px-2 sm:px-4">
        <div className="relative min-h-72 flex-1" aria-busy={yuklanmoqda}>
          <div className="absolute inset-0">
            {yuklanmoqda ? (
              <LoadingState
                matn={t("boshqaruv.chart.loading")}
                ikonka={<ChartColumn size={22} />}
                className="h-full min-h-0 rounded-2xl border-slate-200 bg-slate-50/60 bg-none py-0"
              />
            ) : hammasiXato ? (
              <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-5 text-center text-sm text-rose-700">
                <TriangleAlert size={24} aria-hidden />
                <p className="font-semibold">{t("boshqaruv.chart.error")}</p>
                <button type="button" onClick={() => setQaytaSoni((son) => son + 1)} className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-100">
                  <RefreshCw size={13} aria-hidden /> {t("boshqaruv.retry")}
                </button>
              </div>
            ) : !malumotBor ? (
              <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/50 px-5 text-center">
                <span aria-hidden className="mb-3 rounded-2xl bg-slate-100 p-3 text-slate-500"><ChartColumn size={25} /></span>
                <p className="text-sm font-semibold text-slate-700">{t("boshqaruv.chart.empty")}</p>
                <p className="mt-2 max-w-72 text-xs leading-5 text-slate-500">{t("boshqaruv.chart.emptyHint")}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 320, height: 288 }}>
                <ComposedChart data={qatorlar} margin={{ top: 16, right: 12, left: 0, bottom: 4 }} barCategoryGap="26%" barGap={4}>
                  <defs>
                    <linearGradient id={`${id}-daromad`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={DAROMAD_RANGI} stopOpacity={1} />
                      <stop offset="100%" stopColor={DAROMAD_RANGI} stopOpacity={0.62} />
                    </linearGradient>
                    <linearGradient id={`${id}-xarajat`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FBBF24" stopOpacity={1} />
                      <stop offset="100%" stopColor={XARAJAT_RANGI} stopOpacity={0.75} />
                    </linearGradient>
                    <linearGradient id={`${id}-foyda`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={FOYDA_RANGI} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={FOYDA_RANGI} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--theme-chart-grid)" />
                  <XAxis dataKey="nom" axisLine={false} tickLine={false} tick={{ fill: OQ_MATN_RANGI, fontSize: 12 }} tickMargin={10} minTickGap={16} padding={{ left: 8, right: 8 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: OQ_MATN_RANGI, fontSize: 12 }} tickFormatter={qisqa} width={64} />
                  <ReferenceLine y={0} stroke="#cbd5e1" />
                  <Tooltip content={<MoliyaTooltip pul={pul} nomlar={{ daromad: t("boshqaruv.chart.revenue"), xarajat: t("boshqaruv.chart.expense"), sofFoyda: t("boshqaruv.chart.profit") }} />} cursor={{ fill: "rgba(148,163,184,0.12)", radius: 8 }} />
                  {!yashirin.daromad && <Bar dataKey="daromad" fill={`url(#${id}-daromad)`} radius={[7, 7, 0, 0]} maxBarSize={30} isAnimationActive={!harakatKam} animationDuration={600} />}
                  {!yashirin.xarajat && <Bar dataKey="xarajat" fill={`url(#${id}-xarajat)`} radius={[7, 7, 0, 0]} maxBarSize={30} isAnimationActive={!harakatKam} animationDuration={600} />}
                  {!yashirin.sofFoyda && (
                    <Area
                      type="monotone"
                      dataKey="sofFoyda"
                      baseValue={0}
                      stroke={FOYDA_RANGI}
                      strokeWidth={2.5}
                      fill={`url(#${id}-foyda)`}
                      dot={{ r: 3.5, fill: "white", stroke: FOYDA_RANGI, strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: FOYDA_RANGI, stroke: "white", strokeWidth: 3 }}
                      isAnimationActive={!harakatKam}
                      animationDuration={700}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        {!yuklanmoqda && yuklanmaganlar > 0 && !hammasiXato && (
          <p className="mx-3 mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium leading-5 text-amber-800">
            <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden />
            {t("boshqaruv.chart.partial", { count: yuklanmaganlar })}
          </p>
        )}
      </div>

      {tayyor && engYaxshi && (
        <dl className="relative mx-5 mb-5 mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-dashed border-slate-200 pt-4 sm:mx-6 sm:mb-6 lg:grid-cols-4">
          <Xulosa nom={t("boshqaruv.chart.insights.best")} qiymat={davrNomi(engYaxshi.oraliq)} izoh={pul(engYaxshi.sofFoyda)} manfiy={engYaxshi.sofFoyda < 0} />
          <Xulosa nom={t(`boshqaruv.chart.insights.avg.${guruh}`)} qiymat={pul(ortachaFoyda)} manfiy={ortachaFoyda < 0} />
          <Xulosa nom={t("boshqaruv.chart.insights.margin")} qiymat={foydaFoizi != null ? `${foydaFoizi.toFixed(1)}%` : "—"} manfiy={foydaFoizi != null && foydaFoizi < 0} />
          <Xulosa
            nom={t("boshqaruv.chart.insights.lossPeriods")}
            qiymat={t("boshqaruv.chart.insights.lossCount", { count: zararDavrlari })}
            izoh={zararDavrlari === 0 ? t("boshqaruv.chart.insights.noLoss") : undefined}
            manfiy={zararDavrlari > 0}
          />
        </dl>
      )}
      {!tayyor && <div className="pb-5 sm:pb-6" />}
    </section>
  );
}

function Xulosa({ nom, qiymat, izoh, manfiy = false }: { nom: string; qiymat: string; izoh?: string; manfiy?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold text-slate-500">{nom}</dt>
      <dd className={`mt-0.5 truncate text-sm font-extrabold tabular-nums ${manfiy ? "text-rose-600" : "text-slate-950"}`}>{qiymat}</dd>
      {izoh && <dd className="mt-0.5 truncate text-[11px] font-medium text-slate-500">{izoh}</dd>}
    </div>
  );
}

function MoliyaTooltip({
  active,
  payload,
  pul,
  nomlar,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: GrafikQatori }>;
  pul: (summa: number) => string;
  nomlar: Record<Qator, string>;
}) {
  const nuqta = payload?.[0]?.payload;
  if (!active || !nuqta) return null;
  const qatorlar: { kalit: Qator; rang: string }[] = [
    { kalit: "daromad", rang: DAROMAD_RANGI },
    { kalit: "xarajat", rang: XARAJAT_RANGI },
    { kalit: "sofFoyda", rang: FOYDA_RANGI },
  ];
  return (
    <div className="min-w-56 rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-xl shadow-slate-900/10 backdrop-blur">
      <p className="mb-2 text-xs font-semibold tabular-nums text-slate-500">{nuqta.toliqNom}</p>
      <div className="space-y-1.5">
        {qatorlar.map((item) => (
          <p key={item.kalit} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-2 text-slate-500">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full ring-2 ring-white" style={{ background: item.rang }} />
              {nomlar[item.kalit]}
            </span>
            <span className={`font-bold tabular-nums ${item.kalit === "sofFoyda" && nuqta[item.kalit] < 0 ? "text-rose-600" : "text-slate-900"}`}>{pul(nuqta[item.kalit])}</span>
          </p>
        ))}
      </div>
    </div>
  );
}
