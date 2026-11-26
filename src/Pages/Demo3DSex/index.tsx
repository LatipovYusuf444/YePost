import { Component, Suspense, lazy, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Bot, Box, Building2, Factory, FlaskConical, LoaderCircle, MapPinned, Moon, Pause, Play, RotateCcw, ScanSearch, Shirt, Sun, SunMoon, Truck, Warehouse, X, type LucideIcon } from "lucide-react";
import { DEMO_SEX_NS } from "./matnlar";
import { DemoSexManbasi, DEMO_STANOKLAR } from "./demoManbasi";
import { HOLAT_RANGI, bajarilishUlushi, korinadiganHolat, miqdorMatni, type Reys, type SexHodisasi, type SkladHolati, type SexHolati, type StanokHolati, type StanokTavsifi, type Topshiriq } from "./sexModeli";
import type { KameraBuyrugi } from "./SexSahnasi";
import { kunFazasi, quyoshHolati, soatMatni, toshkentVaqti, type KunFazasi, type VaqtRejimi } from "./kunTun";

// 3D Demo sahifasi (/demo/3d; eski /demo/3d-sex shu yerga yo'naltiriladi). Ma'lumot: DemoSexManbasi (sinov ma'lumotlari); sahna (three.js) alohida bo'lakda yuklanadi.
// Backend, autentifikatsiya va ishlab chiqarish API'lariga tegmaydi.
const SexSahnasi = lazy(() => import("./SexSahnasi"));

function webglBormi() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

class SahnaXatosi extends Component<{ zaxira: ReactNode; children: ReactNode }, { xato: boolean }> {
  state = { xato: false };
  static getDerivedStateFromError() {
    return { xato: true };
  }
  render() {
    return this.state.xato ? this.props.zaxira : this.props.children;
  }
}

const vaqtMatni = (ms: number) => new Date(ms).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
const topshiriqMatni = (topshiriq?: Topshiriq | null) => (topshiriq ? `${topshiriq.buyurtma} · ${topshiriq.detal} · ${miqdorMatni(topshiriq)}` : "");

function HolatBelgisi({ holat, kichik = false }: { holat: StanokHolati | undefined; kichik?: boolean }) {
  const { t } = useTranslation(DEMO_SEX_NS);
  const korinadi = korinadiganHolat(holat);
  const rang = HOLAT_RANGI[korinadi];
  return (
    <span
      data-holat={korinadi}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-bold ${kichik ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"}`}
      style={{ background: `${rang}1f`, color: korinadi === "bosh" ? "#475569" : rang }}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: rang }} aria-hidden="true" />
      {t(`status.${korinadi}`)}
    </span>
  );
}

function Progress({ topshiriq, rang, ingichka = false }: { topshiriq: Topshiriq | null | undefined; rang: string; ingichka?: boolean }) {
  const ulush = bajarilishUlushi(topshiriq);
  return (
    <div className={`${ingichka ? "h-1.5" : "h-2"} w-full overflow-hidden rounded-full bg-slate-200`} role="progressbar" aria-valuemin={0} aria-valuemax={topshiriq?.jami ?? 0} aria-valuenow={topshiriq?.bajarildi ?? 0}>
      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.round(ulush * 100)}%`, background: rang }} />
    </div>
  );
}

type KameraTuri = Exclude<KameraBuyrugi["tur"], "stanok">;

/** Kamera tugmalari: tartib — ichkaridan tashqariga (ishlab chiqarish → yuqoridan → ofis → maishiy blok → butun hudud). */
const KAMERA_TUGMALARI: { tur: KameraTuri; kalit: string; Belgi: LucideIcon }[] = [
  { tur: "umumiy", kalit: "camera.overview", Belgi: Factory },
  { tur: "yuqori", kalit: "camera.top", Belgi: ScanSearch },
  { tur: "ofis", kalit: "camera.office", Belgi: Building2 },
  { tur: "maishiy", kalit: "camera.household", Belgi: Shirt },
  { tur: "avto", kalit: "camera.automated", Belgi: Bot },
  { tur: "sklad", kalit: "camera.warehouse", Belgi: Warehouse },
  { tur: "hudud", kalit: "camera.site", Belgi: MapPinned },
];

const VAQT_REJIMLARI: VaqtRejimi[] = ["avto", "kun", "tun"];
const FAZA_BELGISI: Record<KunFazasi, { Belgi: LucideIcon; rang: string; kalit: string }> = {
  kun: { Belgi: Sun, rang: "text-amber-500", kalit: "vaqt.kunFaza" },
  tong: { Belgi: SunMoon, rang: "text-orange-500", kalit: "vaqt.tong" },
  shom: { Belgi: SunMoon, rang: "text-orange-600", kalit: "vaqt.shom" },
  tun: { Belgi: Moon, rang: "text-indigo-500", kalit: "vaqt.tunFaza" },
};

/** Kun/tun: jonli Toshkent soati (quyosh/oy belgisi) va "Avto / Kun / Tun" tanlovi. */
function VaqtBoshqaruvi({ hozir, rejim, onRejim }: { hozir: number; rejim: VaqtRejimi; onRejim: (rejim: VaqtRejimi) => void }) {
  const { t } = useTranslation(DEMO_SEX_NS);
  const vaqt = toshkentVaqti(hozir);
  const quyosh = quyoshHolati(hozir);
  const faza: KunFazasi = rejim === "avto" ? kunFazasi(quyosh.balandlik, quyosh.azimut < 180).faza : rejim;
  const { Belgi, rang, kalit } = FAZA_BELGISI[faza];
  return (
    <div data-vaqt className="pointer-events-auto flex max-w-full items-center gap-1 rounded-2xl border border-white/70 bg-white/90 p-1 shadow-md backdrop-blur" role="group" aria-label={t("vaqt.title")}>
      <span data-vaqt-soat data-faza={faza} title={t("vaqt.avtoIzoh")} className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap px-2 text-xs font-bold text-slate-600 sm:h-9 sm:text-sm">
        <Belgi size={15} className={rang} aria-hidden="true" />
        {t("vaqt.toshkent")}
        <time className="font-black tabular-nums text-slate-900">{soatMatni(vaqt)}</time>
        <span className="sr-only">{t(kalit)}</span>
      </span>
      {VAQT_REJIMLARI.map((tur) => {
        const faol = rejim === tur;
        return (
          <button
            key={tur}
            type="button"
            data-vaqt-rejimi={tur}
            aria-pressed={faol}
            onClick={() => onRejim(tur)}
            className={`inline-flex h-8 items-center whitespace-nowrap rounded-xl px-2.5 text-xs font-bold transition sm:h-9 sm:text-sm ${faol ? "bg-slate-800 text-white shadow-sm" : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"}`}
          >
            {t(`vaqt.${tur}`)}
          </button>
        );
      })}
    </div>
  );
}

/** Stanoklar liniyalar bo'yicha: 1-liniya — sexning orqa yarmi (z < 0), 2-liniya — old yarmi (z ≥ 0). */
function liniyalargaAjratish(stanoklar: StanokTavsifi[]) {
  const liniyalar = [
    { raqam: 1, stanoklar: stanoklar.filter((stanok) => stanok.joy[1] < 0) },
    { raqam: 2, stanoklar: stanoklar.filter((stanok) => stanok.joy[1] >= 0) },
  ];
  // Har liniyada chapdan o'ngga (material omboridan qadoqlashgacha) — sahnadagi tartib bilan bir xil.
  for (const liniya of liniyalar) liniya.stanoklar.sort((a, b) => a.joy[0] - b.joy[0]);
  return liniyalar.filter((liniya) => liniya.stanoklar.length > 0);
}

const BOSQICH_RANGI: Record<Reys["bosqich"], string> = { kelmoqda: "bg-sky-50 text-sky-700", rampada: "bg-emerald-50 text-emerald-700", ketmoqda: "bg-slate-100 text-slate-600", yoq: "bg-slate-50 text-slate-400" };

function ReysKartasi({ reys }: { reys: Reys }) {
  const { t } = useTranslation(DEMO_SEX_NS);
  const holat = reys.bosqich === "rampada" ? t(`logistics.rampada_${reys.yonalish}`) : t(`logistics.${reys.bosqich}`);
  return (
    <li data-reys={reys.id} data-bosqich={reys.bosqich} className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5">
          <Truck size={15} className="text-slate-500" aria-hidden="true" />
          <span className="rounded-md border-2 border-slate-800 bg-white px-1.5 font-mono text-xs font-black tracking-wide text-slate-900">{reys.raqam}</span>
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${BOSQICH_RANGI[reys.bosqich]}`}>{holat}</span>
      </div>
      <p className="mt-1 truncate text-xs font-semibold text-slate-600">{t(`logistics.${reys.yonalish}`)} · {t("logistics.dock", { n: reys.rampa })} · {reys.yuk}</p>
      {reys.bosqich === "rampada" && (
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuemin={0} aria-valuemax={reys.jamiPalet} aria-valuenow={reys.palet}>
            <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-700" style={{ width: `${Math.round((reys.palet / Math.max(1, reys.jamiPalet)) * 100)}%` }} />
          </div>
          <span className="shrink-0 text-[11px] font-bold text-slate-500">{t("logistics.pallets", { a: reys.palet, b: reys.jamiPalet })}</span>
        </div>
      )}
    </li>
  );
}

function StanokQatori({ stanok, holat, faol, onTanlash }: { stanok: StanokTavsifi; holat: StanokHolati | undefined; faol: boolean; onTanlash: (id: string) => void }) {
  const { t } = useTranslation(DEMO_SEX_NS);
  return (
    <button
      type="button"
      data-stanok-royxat={stanok.id}
      onClick={() => onTanlash(stanok.id)}
      aria-pressed={faol}
      className={`w-full rounded-xl border px-2.5 py-2 text-left transition ${faol ? "border-blue-400 bg-blue-50" : "border-transparent hover:border-slate-200 hover:bg-slate-50"}`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[13px] font-black text-slate-900">{stanok.nom}</span>
        <HolatBelgisi holat={holat} kichik />
      </span>
      <span className="mt-0.5 block truncate text-[11.5px] font-semibold text-slate-500">{topshiriqMatni(holat?.joriy) || t("list.noTask")}</span>
      {holat?.joriy && <span className="mt-1 block"><Progress topshiriq={holat.joriy} rang={HOLAT_RANGI[korinadiganHolat(holat)]} ingichka /></span>}
    </button>
  );
}

export default function Demo3DSex() {
  const { t } = useTranslation(DEMO_SEX_NS);
  const [manba] = useState(() => new DemoSexManbasi());
  const [holatlar, setHolatlar] = useState<SexHolati>(() => manba.holat());
  const [reyslar, setReyslar] = useState<Reys[]>(() => manba.reyslar?.() ?? []);
  const [sklad, setSklad] = useState<SkladHolati | undefined>(() => manba.sklad?.());
  const [hodisalar, setHodisalar] = useState<SexHodisasi[]>([]);
  const [ishlayapti, setIshlayapti] = useState(false);
  const [soniya, setSoniya] = useState(0);
  const [hozir, setHozir] = useState(() => Date.now());
  const [tanlangan, setTanlangan] = useState<string | null>(null);
  const [kamera, setKamera] = useState<KameraBuyrugi>({ tur: "umumiy", n: 0 });
  const [vaqtRejimi, setVaqtRejimi] = useState<VaqtRejimi>("avto");
  const [webgl] = useState(webglBormi);

  // Demo manbai: obuna + taymer (sahifadan chiqilganda to'xtaydi).
  useEffect(() => {
    const yangila = () => {
      setHolatlar(manba.holat());
      setReyslar(manba.reyslar?.() ?? []);
      setSklad(manba.sklad?.());
      setHodisalar([...manba.hodisalar]);
      setIshlayapti(manba.ishlayapti);
      setSoniya(manba.soniya);
    };
    const bekor = manba.obuna(yangila);
    manba.boshlash(1000);
    yangila();
    return () => {
      bekor();
      manba.pauza();
    };
  }, [manba]);

  // "N s oldin" yozuvi va Toshkent soati demo pauzada bo'lsa ham yurib tursin.
  useEffect(() => {
    const taymer = window.setInterval(() => setHozir(Date.now()), 1000);
    return () => window.clearInterval(taymer);
  }, []);

  function tanlash(id: string) {
    setTanlangan(id);
    setKamera((joriy) => ({ tur: "stanok", stanokId: id, n: joriy.n + 1 }));
  }
  const kameraga = (tur: KameraBuyrugi["tur"]) => setKamera((joriy) => ({ tur, n: joriy.n + 1 }));

  const tanlanganTavsif = DEMO_STANOKLAR.find((stanok) => stanok.id === tanlangan);
  const tanlanganHolat = tanlangan ? holatlar[tanlangan] : undefined;
  const nomlar = useMemo(() => Object.fromEntries(DEMO_STANOKLAR.map((stanok) => [stanok.id, stanok.nom])), []);
  const liniyalar = useMemo(() => liniyalargaAjratish(DEMO_STANOKLAR), []);
  const ishlayotganlar = DEMO_STANOKLAR.filter((stanok) => korinadiganHolat(holatlar[stanok.id]) === "ishlayapti").length;
  const etiborKerak = DEMO_STANOKLAR.filter((stanok) => {
    const holat = korinadiganHolat(holatlar[stanok.id]);
    return holat === "nosoz" || holat === "eskirgan";
  }).length;
  const hududdagiReyslar = reyslar.filter((reys) => reys.bosqich !== "yoq").length;

  return (
    <div className="flex min-h-dvh flex-col bg-[#eef2f7] text-slate-900 lg:h-dvh">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-lg font-black text-white shadow-md" aria-hidden="true">Y</div>
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-black tracking-tight sm:text-2xl"><Box size={22} className="text-blue-600" aria-hidden="true" />{t("title")}</h1>
          <p className="truncate text-xs font-medium text-slate-500 sm:text-sm">{t("subtitle")}</p>
        </div>
        <span data-demo-belgi className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
          <FlaskConical size={14} aria-hidden="true" />
          {t("demoBadge")}
        </span>
        <Link to="/sozlamalar?bolim=demo3d" className="ml-auto inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 transition hover:border-blue-300 hover:text-blue-700">
          <ArrowLeft size={16} aria-hidden="true" />
          {t("back")}
        </Link>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 lg:flex-row">
        {/* 3D sahna */}
        <section className="relative h-[62dvh] min-h-[420px] overflow-hidden rounded-3xl border border-slate-200 bg-[#e9eef5] shadow-sm lg:h-auto lg:min-h-0 lg:flex-1" aria-label={t("title")}>
          {webgl ? (
            <SahnaXatosi zaxira={<p className="p-6 text-sm font-semibold text-slate-600">{t("noWebgl")}</p>}>
              <Suspense fallback={<div role="status" className="flex h-full items-center justify-center gap-2 text-sm font-bold text-slate-500"><LoaderCircle size={20} className="animate-spin text-blue-600" />{t("loading")}</div>}>
                <SexSahnasi stanoklar={DEMO_STANOKLAR} holatlar={holatlar} reyslar={reyslar} sklad={sklad} tanlangan={tanlangan} onTanlash={tanlash} kamera={kamera} vaqtRejimi={vaqtRejimi} />
              </Suspense>
            </SahnaXatosi>
          ) : (
            <p className="p-6 text-sm font-semibold text-slate-600">{t("noWebgl")}</p>
          )}

          {/* Kamera tugmalari + demo belgisi: bitta yuqori qator, tor ekranda (360–768 px) bir necha qatorga o'raladi */}
          <div className="pointer-events-none absolute inset-x-3 top-3 z-30 flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <div className="pointer-events-auto flex max-w-full flex-wrap gap-1 rounded-2xl border border-white/70 bg-white/90 p-1 shadow-md backdrop-blur" role="group" aria-label={t("camera.title")}>
                {KAMERA_TUGMALARI.map(({ tur, kalit, Belgi }) => {
                  const faol = kamera.tur === tur;
                  return (
                    <button
                      key={tur}
                      type="button"
                      data-kamera={tur}
                      aria-pressed={faol}
                      onClick={() => {
                        if (tur !== "umumiy" && tur !== "yuqori") setTanlangan(null);
                        kameraga(tur);
                      }}
                      className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 text-xs font-bold transition sm:h-9 sm:px-3 sm:text-sm ${faol ? "bg-blue-600 text-white shadow-sm" : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"}`}
                    >
                      <Belgi size={15} aria-hidden="true" />{t(kalit)}
                    </button>
                  );
                })}
              </div>
              <VaqtBoshqaruvi hozir={hozir} rejim={vaqtRejimi} onRejim={setVaqtRejimi} />
              {!ishlayapti && (
                <span data-pauza-belgi className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-black text-white shadow">
                  <Pause size={13} aria-hidden="true" />{t("controls.paused")}
                </span>
              )}
            </div>
            <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-amber-400/95 px-3 py-1.5 text-xs font-black text-amber-950 shadow md:inline-flex">
              <FlaskConical size={13} aria-hidden="true" />{t("demoBadge")}
            </span>
          </div>

          {/* Tanlangan stanok paneli: sahnaning bir burchagini egallaydi (to'liq yopmaydi) */}
          {tanlanganTavsif ? (
            <div data-stanok-panel={tanlanganTavsif.id} className="absolute bottom-3 left-3 right-3 z-30 max-h-[58%] overflow-y-auto rounded-2xl border border-white/80 bg-white/95 p-4 shadow-xl backdrop-blur sm:right-auto sm:w-[360px]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-black leading-6 text-slate-900">{tanlanganTavsif.nom}</p>
                  <p className="text-xs font-semibold text-slate-500">{t(`machineType.${tanlanganTavsif.tur}`)}</p>
                </div>
                <button type="button" onClick={() => { setTanlangan(null); kameraga("umumiy"); }} aria-label={t("panel.close")} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"><X size={17} /></button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <HolatBelgisi holat={tanlanganHolat} />
                {tanlanganHolat?.sabab && tanlanganHolat.aloqa && <span className="text-xs font-semibold text-amber-700">{t("panel.reason")}: {tanlanganHolat.sabab}</span>}
              </div>
              {tanlanganHolat && !tanlanganHolat.aloqa && (
                <p role="alert" className="mt-2 rounded-xl bg-purple-50 px-3 py-2 text-xs font-bold text-purple-700">{t("panel.stale")}</p>
              )}
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                <dt className="font-semibold text-slate-500">{t("panel.order")}</dt><dd data-panel="buyurtma" className="font-black text-slate-900">{tanlanganHolat?.joriy?.buyurtma ?? t("panel.none")}</dd>
                <dt className="font-semibold text-slate-500">{t("panel.part")}</dt><dd data-panel="detal" className="font-bold text-slate-800">{tanlanganHolat?.joriy?.detal ?? t("panel.none")}</dd>
                <dt className="font-semibold text-slate-500">{t("panel.operation")}</dt><dd className="font-bold text-slate-800">{tanlanganHolat?.joriy?.operatsiya ?? t("panel.none")}</dd>
                <dt className="font-semibold text-slate-500">{t("panel.done")}</dt><dd data-panel="miqdor" className="font-black text-slate-900">{tanlanganHolat?.joriy ? miqdorMatni(tanlanganHolat.joriy) : t("panel.none")}</dd>
              </dl>
              {tanlanganHolat?.joriy && <div className="mt-2"><Progress topshiriq={tanlanganHolat.joriy} rang={HOLAT_RANGI[korinadiganHolat(tanlanganHolat)]} /></div>}
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                <dt className="font-semibold text-slate-500">{t("panel.next")}</dt><dd data-panel="keyingi" className="font-semibold text-slate-700">{topshiriqMatni(tanlanganHolat?.navbat[0]) || t("panel.none")}</dd>
                <dt className="font-semibold text-slate-500">{t("panel.updated")}</dt>
                <dd data-panel="yangilangan" className={`font-semibold ${tanlanganHolat?.aloqa === false ? "text-purple-700" : "text-slate-700"}`}>
                  {tanlanganHolat ? `${vaqtMatni(tanlanganHolat.yangilangan)} · ${t("panel.ago", { s: Math.max(0, Math.round((hozir - tanlanganHolat.yangilangan) / 1000)) })}` : t("panel.none")}
                </dd>
                <dt className="font-semibold text-slate-500">{t("panel.machineId")}</dt><dd className="font-mono text-xs font-semibold text-slate-500">{tanlanganTavsif.id}</dd>
              </dl>
            </div>
          ) : (
            <p className="pointer-events-none absolute bottom-3 left-1/2 z-30 w-max max-w-[calc(100%-24px)] -translate-x-1/2 rounded-full bg-slate-900/75 px-4 py-2 text-center text-xs font-semibold text-white">{t("selectHint")}</p>
          )}
        </section>

        {/* Yon panel: demo boshqaruvi, stanoklar, hodisalar */}
        <aside className="flex w-full shrink-0 flex-col gap-3 lg:w-[320px] lg:overflow-y-auto xl:w-[360px]">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-600">{t("controls.title")}</h2>
              <span className="text-xs font-bold text-slate-400">{ishlayapti ? `● ${t("controls.running")} · ` : ""}{t("controls.second", { s: soniya })}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" data-demo-amal="pauza" onClick={() => (ishlayapti ? manba.pauza() : manba.boshlash(1000))} className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-black text-white shadow-sm transition ${ishlayapti ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700"}`}>
                {ishlayapti ? <><Pause size={16} aria-hidden="true" />{t("controls.pause")}</> : <><Play size={16} aria-hidden="true" />{t("controls.resume")}</>}
              </button>
              <button type="button" data-demo-amal="qayta" onClick={() => manba.qaytaBoshlash()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-700 transition hover:border-blue-300 hover:text-blue-700">
                <RotateCcw size={16} aria-hidden="true" />{t("controls.restart")}
              </button>
            </div>
            <dl data-zavod-korsatkich className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-emerald-50 px-1.5 py-2">
                <dt className="truncate text-[10.5px] font-bold uppercase tracking-wide text-emerald-700">{t("factory.working")}</dt>
                <dd className="text-base font-black tabular-nums text-emerald-800">{ishlayotganlar}/{DEMO_STANOKLAR.length}</dd>
              </div>
              <div className={`rounded-xl px-1.5 py-2 ${etiborKerak > 0 ? "bg-red-50" : "bg-slate-50"}`}>
                <dt className={`truncate text-[10.5px] font-bold uppercase tracking-wide ${etiborKerak > 0 ? "text-red-700" : "text-slate-500"}`}>{t("factory.attention")}</dt>
                <dd className={`text-base font-black tabular-nums ${etiborKerak > 0 ? "text-red-700" : "text-slate-700"}`}>{etiborKerak}</dd>
              </div>
              <div className="rounded-xl bg-sky-50 px-1.5 py-2">
                <dt className="truncate text-[10.5px] font-bold uppercase tracking-wide text-sky-700">{t("factory.trucks")}</dt>
                <dd className="text-base font-black tabular-nums text-sky-800">{hududdagiReyslar}/{reyslar.length}</dd>
              </div>
            </dl>
            <p className="mt-3 text-[11.5px] font-medium leading-4 text-slate-500">{t("camera.hint")}</p>
          </section>

          <section data-stanoklar className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <div className="flex items-baseline justify-between gap-2 px-2 pb-1 pt-2">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-600">{t("list.title")}</h2>
              <span className="text-xs font-bold tabular-nums text-slate-400">{DEMO_STANOKLAR.length}</span>
            </div>
            <div className="grid gap-x-2 sm:grid-cols-2 lg:grid-cols-1">
              {liniyalar.map((liniya) => {
                const ishlayotgan = liniya.stanoklar.filter((stanok) => korinadiganHolat(holatlar[stanok.id]) === "ishlayapti").length;
                return (
                  <div key={liniya.raqam} data-liniya={liniya.raqam} role="group" aria-labelledby={`liniya-${liniya.raqam}`} className="min-w-0">
                    <div className="mt-1 flex items-center justify-between gap-2 border-t border-slate-100 px-2.5 pb-1 pt-2">
                      <h3 id={`liniya-${liniya.raqam}`} className="text-xs font-black text-slate-700">{t("list.line", { n: liniya.raqam })}</h3>
                      <span className="text-[11px] font-bold tabular-nums text-slate-400">{t("list.lineCount", { a: ishlayotgan, b: liniya.stanoklar.length })}</span>
                    </div>
                    <ul className="space-y-0.5">
                      {liniya.stanoklar.map((stanok) => (
                        <li key={stanok.id}>
                          <StanokQatori stanok={stanok} holat={holatlar[stanok.id]} faol={tanlangan === stanok.id} onTanlash={tanlash} />
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>

          {sklad && (
            <section data-sklad className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h2 className="inline-flex items-center gap-1.5 text-sm font-black uppercase tracking-wide text-slate-600"><Warehouse size={15} className="text-teal-600" aria-hidden="true" />{t("warehouse.title")}</h2>
                <button type="button" onClick={() => { setTanlangan(null); kameraga("sklad"); }} className="text-xs font-bold text-blue-700 hover:text-blue-800">{t("warehouse.show")}</button>
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span data-sklad-palet className="text-lg font-black tabular-nums text-slate-900">{t("warehouse.pallets", { a: sklad.palet, b: sklad.sigim })}</span>
                <span className="text-xs font-bold text-slate-500">{t("warehouse.fill")}: {Math.round((sklad.palet / Math.max(1, sklad.sigim)) * 100)}%</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuemin={0} aria-valuemax={sklad.sigim} aria-valuenow={sklad.palet}>
                <div className="h-full rounded-full bg-teal-500 transition-[width] duration-700" style={{ width: `${Math.round((sklad.palet / Math.max(1, sklad.sigim)) * 100)}%` }} />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl bg-emerald-50 px-2 py-1.5">
                  <dt className="text-[10.5px] font-bold uppercase tracking-wide text-emerald-700">{t("warehouse.in")}</dt>
                  <dd className="text-base font-black tabular-nums text-emerald-800">+{sklad.kirim}</dd>
                </div>
                <div className="rounded-xl bg-sky-50 px-2 py-1.5">
                  <dt className="text-[10.5px] font-bold uppercase tracking-wide text-sky-700">{t("warehouse.out")}</dt>
                  <dd className="text-base font-black tabular-nums text-sky-800">−{sklad.chiqim}</dd>
                </div>
              </dl>
            </section>
          )}

          {reyslar.length > 0 && (
            <section data-logistika className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-black uppercase tracking-wide text-slate-600">{t("logistics.title")}</h2>
                <button type="button" onClick={() => { setTanlangan(null); kameraga("hudud"); }} className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-800">
                  <MapPinned size={13} aria-hidden="true" />{t("logistics.show")}
                </button>
              </div>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                {reyslar.map((reys) => <ReysKartasi key={reys.id} reys={reys} />)}
              </ul>
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-600">{t("events.title")}</h2>
            <ol data-hodisalar className="mt-2 space-y-1.5" aria-live="polite">
              {hodisalar.length === 0 && <li className="text-xs font-semibold text-slate-400">{t("events.empty")}</li>}
              {hodisalar.slice(0, 8).map((hodisa, i) => (
                <li key={`${hodisa.vaqt}-${hodisa.stanokId}-${hodisa.tur}-${i}`} className="flex gap-2 text-xs leading-4">
                  <span className="shrink-0 font-mono font-semibold text-slate-400">{vaqtMatni(hodisa.vaqt)}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (hodisa.obyekt !== "reys") return tanlash(hodisa.stanokId);
                      setTanlangan(null);
                      kameraga("hudud");
                    }}
                    className={`text-left font-semibold hover:text-blue-700 ${hodisa.obyekt === "reys" ? "text-teal-700" : "text-slate-700"}`}
                    title={nomlar[hodisa.stanokId] ?? hodisa.stanokId}
                  >
                    {hodisa.matn}
                  </button>
                </li>
              ))}
            </ol>
          </section>

          <p data-mualliflar className="px-2 pb-1 text-[11px] font-medium text-slate-400">{t("credits")}</p>
        </aside>
      </div>
    </div>
  );
}
