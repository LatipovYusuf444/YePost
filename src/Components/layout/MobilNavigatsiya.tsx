import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Check, ChevronRight, LayoutGrid, Search, X, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/Components/ui/sheet";
import "./mobile.css";

export type MobilMenyu = {
  key: string;
  path: string;
  icon: LucideIcon;
  label: string;
  end?: boolean;
  badge?: number;
  bolalar?: { key: string; path: string; icon: LucideIcon; label: string }[];
};

function faolYol(path: string, pathname: string, search: string, aniq = false, end = false) {
  const [yol, sorov] = path.split("?");
  if (aniq || sorov) {
    return pathname === yol && (new URLSearchParams(search).get("tab") ?? "barchasi") ===
      (new URLSearchParams(sorov).get("tab") ?? "barchasi");
  }
  return pathname === yol || (!end && yol !== "/" && pathname.startsWith(`${yol}/`));
}

export default function MobilNavigatsiya({
  menyular,
  asosiyKalitlar = ["boshSahifa", "savdo", "ombor", "kassa"],
}: {
  menyular: MobilMenyu[];
  asosiyKalitlar?: string[];
}) {
  const { t } = useTranslation("nav");
  const { pathname, search } = useLocation();
  const [ochiq, setOchiq] = useState(false);
  const [qidiruv, setQidiruv] = useState("");
  const [tanlanganKalit, setTanlanganKalit] = useState<string | null>(null);
  const sarlavhaRef = useRef<HTMLHeadingElement>(null);
  const ochuvchiRef = useRef<HTMLButtonElement | null>(null);
  const tanlangan = menyular.find((item) => item.key === tanlanganKalit && item.bolalar?.length);
  const asosiy = asosiyKalitlar.flatMap((key) => menyular.filter((item) => item.key === key)).slice(0, 4);
  const boshqaFaol = !asosiy.some((item) => faolYol(item.path, pathname, search, false, item.end));
  const sorov = qidiruv.trim().toLocaleLowerCase();
  const natijalar = menyular.filter((item) => !sorov || item.label.toLocaleLowerCase().includes(sorov) ||
    item.bolalar?.some((bola) => bola.label.toLocaleLowerCase().includes(sorov)));
  const ichkiBolimlar = tanlangan ? [
    ...(tanlangan.bolalar?.some((bola) => bola.path === tanlangan.path) ? [] : [{
      key: `${tanlangan.key}-overview`, path: tanlangan.path, icon: tanlangan.icon, label: t("mobile.overview"),
    }]),
    ...(tanlangan.bolalar ?? []),
  ].filter((bola) => !sorov || bola.label.toLocaleLowerCase().includes(sorov)) : [];

  // A sheet must release its focus trap when switching to the desktop layout.
  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const yangila = () => { if (media.matches) setOchiq(false); };
    media.addEventListener("change", yangila);
    return () => media.removeEventListener("change", yangila);
  }, []);

  useEffect(() => {
    setOchiq(false);
    setQidiruv("");
    setTanlanganKalit(null);
  }, [pathname, search]);

  useEffect(() => {
    if (ochiq) sarlavhaRef.current?.focus({ preventScroll: true });
  }, [tanlanganKalit, ochiq]);

  function yopish() { setOchiq(false); }
  function bolimniOchish(key: string | null) {
    setTanlanganKalit(key);
    setQidiruv("");
  }

  return (
    <Sheet open={ochiq} onOpenChange={(value) => { setOchiq(value); if (!value) setQidiruv(""); }}>
      <nav className="mobile-dock md:hidden" aria-label={t("mobile.navigation")}>
        {asosiy.map((item) => {
          const Icon = item.icon;
          const faol = ochiq ? tanlangan?.key === item.key : faolYol(item.path, pathname, search, false, item.end);
          const mazmun = <>
            <span className="mobile-dock-icon"><Icon size={22} strokeWidth={faol ? 2.3 : 1.8} /></span>
            <span className="mobile-dock-label">{item.key === "boshSahifa" ? t("mobile.home") : item.label}</span>
          </>;
          if (item.bolalar?.length) {
            return <SheetTrigger asChild key={item.key}>
              <button type="button" onClick={(event) => { ochuvchiRef.current = event.currentTarget; bolimniOchish(item.key); }} className="mobile-dock-item" data-active={faol || undefined}>{mazmun}</button>
            </SheetTrigger>;
          }
          return (
            <Link key={item.key} to={item.path} onClick={yopish} className="mobile-dock-item" data-active={faol || undefined} aria-current={faol ? "page" : undefined}>
              {mazmun}
            </Link>
          );
        })}
        <SheetTrigger asChild>
          <button type="button" onClick={(event) => { ochuvchiRef.current = event.currentTarget; bolimniOchish(null); }} className="mobile-dock-item" data-active={(ochiq ? !tanlangan || !asosiy.some((item) => item.key === tanlangan.key) : boshqaFaol) || undefined}>
            <span className="mobile-dock-icon"><LayoutGrid size={22} strokeWidth={1.8} /></span>
            <span className="mobile-dock-label">{t("mobile.menu")}</span>
          </button>
        </SheetTrigger>
      </nav>

      <SheetContent side="bottom" showClose={false} className="mobile-menu-sheet gap-0 md:hidden" onCloseAutoFocus={(event) => {
        event.preventDefault();
        if (window.matchMedia("(max-width: 767px)").matches && ochuvchiRef.current?.isConnected) ochuvchiRef.current.focus({ preventScroll: true });
      }}>
        <div aria-hidden="true" className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-slate-200" />
        <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-4 pt-5">
          <div className="flex min-w-0 items-center gap-3">
            {tanlangan && <button type="button" onClick={() => bolimniOchish(null)} className="mobile-menu-close" aria-label={t("mobile.back")}><ArrowLeft size={20} /></button>}
            <div className="min-w-0">
              <SheetTitle ref={sarlavhaRef} tabIndex={-1} className="text-xl font-bold tracking-tight outline-none">{tanlangan?.label ?? t("mobile.menu")}</SheetTitle>
              <SheetDescription className="mt-1 text-xs">{t(tanlangan ? "mobile.chooseSection" : "mobile.description")}</SheetDescription>
            </div>
          </div>
          <SheetClose className="mobile-menu-close" aria-label={t("mobile.close")}><X size={20} /></SheetClose>
        </div>
        <label className="mobile-menu-search mx-5 mb-4 flex shrink-0 items-center gap-2.5 rounded-2xl px-3.5">
          <Search size={18} className="shrink-0 text-slate-400" />
          <input value={qidiruv} onChange={(event) => setQidiruv(event.target.value)} placeholder={t("mobile.search")} aria-label={t("mobile.search")} className="h-12 w-full min-w-0 bg-transparent text-base outline-none" />
        </label>
        <div key={tanlangan?.key ?? "menu"} className="mobile-menu-scroll min-h-0 overflow-y-auto overscroll-contain px-5 pb-6">
          {tanlangan ? <div className="mobile-section-list space-y-2">
            {ichkiBolimlar.map((bola) => {
              const Icon = bola.icon;
              const faol = faolYol(bola.path, pathname, search, true);
              return <Link key={bola.path} to={bola.path} onClick={yopish} aria-current={faol ? "page" : undefined} data-active={faol || undefined} className="mobile-section-link">
                <span className="mobile-section-icon"><Icon size={20} strokeWidth={1.8} /></span>
                <span className="min-w-0 flex-1 text-[14px] font-semibold leading-5">{bola.label}</span>
                {faol ? <Check size={18} className="shrink-0" /> : <ChevronRight size={18} className="shrink-0 opacity-40" />}
              </Link>;
            })}
          </div> : <div className="grid grid-cols-2 gap-2.5">
            {natijalar.map((item) => {
              const Icon = item.icon;
              const faol = faolYol(item.path, pathname, search, false, item.end);
              const mazmun = <>
                  <span className="flex w-full items-start justify-between gap-2">
                    <span className="mobile-menu-tile-icon"><Icon size={21} strokeWidth={1.8} /></span>
                    {item.badge ? <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{item.badge > 99 ? "99+" : item.badge}</span> : item.bolalar?.length ? <ChevronRight size={16} className="mt-1 opacity-40" /> : <ArrowUpRight size={15} className="mt-1 opacity-35" />}
                  </span>
                  <span className="text-[13px] font-semibold leading-5">{item.label}</span>
              </>;
              return item.bolalar?.length ? <button type="button" key={item.key} onClick={() => bolimniOchish(item.key)} className="mobile-menu-tile text-left" data-active={faol || undefined}>{mazmun}</button> :
                <Link key={item.key} to={item.path} onClick={yopish} className="mobile-menu-tile" data-active={faol || undefined} aria-current={faol ? "page" : undefined}>{mazmun}</Link>;
            })}
          </div>}
          {(tanlangan ? ichkiBolimlar : natijalar).length === 0 && <p className="py-10 text-center text-sm text-slate-500">{t("mobile.empty")}</p>}
        </div>
      </SheetContent>
    </Sheet>
  );
}
