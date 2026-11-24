import { Component, Suspense, lazy, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Box, Eye, FlaskConical, LoaderCircle, MapPinned, Pause, Play, RotateCcw, ScanSearch, Truck, X } from "lucide-react";
import { DEMO_SEX_NS } from "./matnlar";
import { DemoSexManbasi, DEMO_STANOKLAR } from "./demoManbasi";
import { HOLAT_RANGI, bajarilishUlushi, korinadiganHolat, miqdorMatni, type Reys, type SexHodisasi, type SexHolati, type StanokHolati, type Topshiriq } from "./sexModeli";
import type { KameraBuyrugi } from "./SexSahnasi";

// 3D sex — Demo sahifasi (/demo/3d-sex). Ma'lumot: DemoSexManbasi (sinov ma'lumotlari); sahna (three.js) alohida bo'lakda yuklanadi.
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

function Progress({ topshiriq, rang }: { topshiriq: Topshiriq | null | undefined; rang: string }) {
  const ulush = bajarilishUlushi(topshiriq);
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuemin={0} aria-valuemax={topshiriq?.jami ?? 0} aria-valuenow={topshiriq?.bajarildi ?? 0}>
      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.round(ulush * 100)}%`, background: rang }} />
    </div>
  );
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

export default function Demo3DSex() {
  const { t } = useTranslation(DEMO_SEX_NS);
  const [manba] = useState(() => new DemoSexManbasi());
  const [holatlar, setHolatlar] = useState<SexHolati>(() => manba.holat());
  const [reyslar, setReyslar] = useState<Reys[]>(() => manba.reyslar?.() ?? []);
  const [hodisalar, setHodisalar] = useState<SexHodisasi[]>([]);
  const [ishlayapti, setIshlayapti] = useState(false);
  const [soniya, setSoniya] = useState(0);
  const [hozir, setHozir] = useState(() => Date.now());
  const [tanlangan, setTanlangan] = useState<string | null>(null);
  const [kamera, setKamera] = useState<KameraBuyrugi>({ tur: "umumiy", n: 0 });
  const [webgl] = useState(webglBormi);

  // Demo manbai: obuna + taymer (sahifadan chiqilganda to'xtaydi).
  useEffect(() => {
    const yangila = () => {
      setHolatlar(manba.holat());
      setReyslar(manba.reyslar?.() ?? []);
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

  // "N s oldin" yozuvi demo pauzada bo'lsa ham yurib tursin.
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
        <Link to="/" className="ml-auto inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 transition hover:border-blue-300 hover:text-blue-700">
          <ArrowLeft size={16} aria-hidden="true" />
          {t("back")}
        </Link>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 lg:flex-row">
        {/* 3D sahna */}
        <section className="relative h-[62vh] min-h-[420px] overflow-hidden rounded-3xl border border-slate-200 bg-[#e9eef5] shadow-sm lg:h-auto lg:min-h-0 lg:flex-1" aria-label={t("title")}>
          {webgl ? (
            <SahnaXatosi zaxira={<p className="p-6 text-sm font-semibold text-slate-600">{t("noWebgl")}</p>}>
              <Suspense fallback={<div role="status" className="flex h-full items-center justify-center gap-2 text-sm font-bold text-slate-500"><LoaderCircle size={20} className="animate-spin text-blue-600" />{t("loading")}</div>}>
                <SexSahnasi stanoklar={DEMO_STANOKLAR} holatlar={holatlar} reyslar={reyslar} tanlangan={tanlangan} onTanlash={tanlash} kamera={kamera} />
              </Suspense>
            </SahnaXatosi>
          ) : (
            <p className="p-6 text-sm font-semibold text-slate-600">{t("noWebgl")}</p>
          )}

          {/* Kamera tugmalari */}
          <div className="pointer-events-none absolute left-3 top-3 z-30 flex flex-wrap items-center gap-2">
            <div className="pointer-events-auto flex gap-1 rounded-2xl border border-white/70 bg-white/90 p-1 shadow-md backdrop-blur" role="group" aria-label={t("camera.title")}>
              <button type="button" data-kamera="umumiy" onClick={() => kameraga("umumiy")} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">
                <Eye size={16} aria-hidden="true" />{t("camera.overview")}
              </button>
              <button type="button" data-kamera="yuqori" onClick={() => kameraga("yuqori")} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">
                <ScanSearch size={16} aria-hidden="true" />{t("camera.top")}
              </button>
              <button type="button" data-kamera="hudud" onClick={() => { setTanlangan(null); kameraga("hudud"); }} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">
                <MapPinned size={16} aria-hidden="true" />{t("camera.site")}
              </button>
            </div>
            {!ishlayapti && (
              <span data-pauza-belgi className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-black text-white shadow">
                <Pause size={13} aria-hidden="true" />{t("controls.paused")}
              </span>
            )}
          </div>
          <span className="pointer-events-none absolute right-3 top-3 z-30 inline-flex items-center gap-1.5 rounded-full bg-amber-400/95 px-3 py-1.5 text-xs font-black text-amber-950 shadow">
            <FlaskConical size={13} aria-hidden="true" />{t("demoBadge")}
          </span>

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
            <p className="mt-3 text-[11.5px] font-medium leading-4 text-slate-500">{t("camera.hint")}</p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <h2 className="px-2 pb-1 pt-2 text-sm font-black uppercase tracking-wide text-slate-600">{t("list.title")}</h2>
            <ul className="space-y-1">
              {DEMO_STANOKLAR.map((stanok) => {
                const holat = holatlar[stanok.id];
                const faol = tanlangan === stanok.id;
                return (
                  <li key={stanok.id}>
                    <button
                      type="button"
                      data-stanok-royxat={stanok.id}
                      onClick={() => tanlash(stanok.id)}
                      aria-pressed={faol}
                      className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${faol ? "border-blue-400 bg-blue-50" : "border-transparent hover:border-slate-200 hover:bg-slate-50"}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-black text-slate-900">{stanok.nom}</span>
                        <HolatBelgisi holat={holat} kichik />
                      </span>
                      <span className="mt-1 block truncate text-xs font-semibold text-slate-500">{topshiriqMatni(holat?.joriy) || t("list.noTask")}</span>
                      {holat?.joriy && <span className="mt-1.5 block"><Progress topshiriq={holat.joriy} rang={HOLAT_RANGI[korinadiganHolat(holat)]} /></span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {reyslar.length > 0 && (
            <section data-logistika className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-black uppercase tracking-wide text-slate-600">{t("logistics.title")}</h2>
                <button type="button" onClick={() => { setTanlangan(null); kameraga("hudud"); }} className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-800">
                  <MapPinned size={13} aria-hidden="true" />{t("logistics.show")}
                </button>
              </div>
              <ul className="mt-2 space-y-2">
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
        </aside>
      </div>
    </div>
  );
}
