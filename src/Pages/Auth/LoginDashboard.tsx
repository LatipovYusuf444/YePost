import { useLayoutEffect, useRef, useState } from "react";
import { BarChart3, Boxes, LayoutDashboard, Package, ShoppingCart, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";

// Login sahifasidagi bezak uchun boshqaruv paneli ko'rinishi. Raqamlar statik NAMUNA: backendga so'rov yo'q, haqiqiy statistika emas
// (panelda "Namuna" belgisi bor). Butun blok ekran o'quvchilardan yashirilgan.
const GRAFIK = "M0 104 C 22 100 34 88 52 90 S 82 74 100 78 S 128 58 148 64 S 178 44 198 50 S 230 30 250 36 S 282 22 300 26 S 336 10 360 6";

const USTUNLAR = [34, 52, 42, 70, 57, 80, 61, 92, 70, 100, 80, 88];

// Panel bitta qat'iy o'lchamda chiziladi va joyiga proporsional sig'diriladi: har qanday ekranda kompozitsiya bir xil, ichi kesilmaydi.
const SAHNA = { kenglik: 780, balandlik: 440 };

function useSigdirish() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [masshtab, setMasshtab] = useState(1);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const hisobla = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width > 0 && height > 0) setMasshtab(Math.min(width / SAHNA.kenglik, height / SAHNA.balandlik));
    };
    hisobla();
    if (typeof ResizeObserver === "undefined") return;
    const kuzatuvchi = new ResizeObserver(hisobla);
    kuzatuvchi.observe(element);
    return () => kuzatuvchi.disconnect();
  }, []);
  return { ref, masshtab };
}

export default function LoginDashboard() {
  const { t } = useTranslation("auth");
  const { ref, masshtab } = useSigdirish();
  const nav: Array<[string, typeof LayoutDashboard]> = [
    ["boshqaruv", LayoutDashboard],
    ["savdo", ShoppingCart],
    ["ombor", Package],
    ["kassa", Wallet],
    ["hisobotlar", BarChart3],
  ];

  return (
    <div ref={ref} className="lp-dash" aria-hidden="true">
      <div className="lp-dash-stage" style={{ transform: `translate(-50%, -50%) scale(${masshtab})` }}>
      <div className="lp-dash-orbit lp-dash-orbit-1" />
      <div className="lp-dash-orbit lp-dash-orbit-2" />
      <div className="lp-dash-halo" />

      <div className="lp-dash-screen">
        <div className="lp-dash-topbar">
          <span className="lp-dash-dots"><i /><i /><i /></span>
          <span className="lp-dash-sample">{t("sapphire.dashboard.sample")}</span>
        </div>
        <div className="lp-dash-body">
          <aside className="lp-dash-side">
            <div className="lp-dash-brand">
              <span className="lp-logo lp-logo-xs">Y</span>
              <b>YePost</b>
            </div>
            {nav.map(([kalit, Icon], indeks) => (
              <div key={kalit} className={`lp-dash-nav${indeks === 0 ? " lp-dash-nav-active" : ""}`}>
                <Icon size={13} strokeWidth={2} />
                <span>{t(`sapphire.dashboard.nav.${kalit}`)}</span>
              </div>
            ))}
          </aside>

          <div className="lp-dash-main">
            <p className="lp-dash-label">{t("sapphire.dashboard.total")}</p>
            <p className="lp-dash-total">
              12 458 000 <small>{t("sapphire.dashboard.sum")}</small>
            </p>
            <p className="lp-dash-up">↑ 12.5%</p>
            <div className="lp-dash-chart">
              <svg viewBox="0 0 360 120" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="lpChartFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="#1685FF" stopOpacity=".45" />
                    <stop offset="1" stopColor="#1685FF" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="lpChartLine" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0" stopColor="#2563EB" />
                    <stop offset="1" stopColor="#22D3EE" />
                  </linearGradient>
                </defs>
                {[30, 60, 90].map((y) => (
                  <line key={y} x1="0" x2="360" y1={y} y2={y} className="lp-dash-grid" />
                ))}
                <path d={`${GRAFIK} V120 H0 Z`} fill="url(#lpChartFill)" className="lp-dash-area" />
                <path d={GRAFIK} pathLength={1} fill="none" stroke="url(#lpChartLine)" strokeWidth="2.6" strokeLinecap="round" className="lp-dash-line" />
                <circle cx="360" cy="6" r="4" className="lp-dash-point" />
              </svg>
            </div>
            <div className="lp-dash-bars">
              {USTUNLAR.map((balandlik, indeks) => (
                <span key={indeks} style={{ height: `${balandlik}%`, animationDelay: `${indeks * 70}ms` }} />
              ))}
            </div>
          </div>

          <div className="lp-dash-stats">
            <div className="lp-dash-stat">
              <span className="lp-dash-stat-icon lp-dash-stat-icon-in"><TrendingUp size={13} /></span>
              <p>{t("sapphire.dashboard.income")}</p>
              <b>8 420 000</b>
              <small className="lp-up">↑ 8.3%</small>
            </div>
            <div className="lp-dash-stat">
              <span className="lp-dash-stat-icon lp-dash-stat-icon-out"><TrendingDown size={13} /></span>
              <p>{t("sapphire.dashboard.expense")}</p>
              <b>4 036 000</b>
              <small className="lp-down">↓ 2.1%</small>
            </div>
          </div>
        </div>
      </div>

      <div className="lp-float lp-float-savdo">
        <span className="lp-float-icon"><BarChart3 size={17} /></span>
        <span><b>{t("sapphire.dashboard.nav.savdo")}</b><small className="lp-up">↑ 12.5%</small></span>
      </div>
      <div className="lp-float lp-float-ombor">
        <span className="lp-float-icon"><Boxes size={17} /></span>
        <span><b>{t("sapphire.dashboard.nav.ombor")}</b><small className="lp-up">↑ 8.3%</small></span>
      </div>
      <div className="lp-float lp-float-kassa">
        <span className="lp-float-icon"><Wallet size={17} /></span>
        <span><b>{t("sapphire.dashboard.nav.kassa")}</b><small className="lp-up">↑ 6.7%</small></span>
      </div>
      </div>
    </div>
  );
}
