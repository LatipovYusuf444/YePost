import type { ReactNode } from "react";
import { Headset, LayoutGrid, ShieldCheck, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";
import LanguageSwitcher from "@/Components/common/LanguageSwitcher";
import LoginDashboard from "./LoginDashboard";
import lentaFon from "./assets/login-ribbon.svg";
import zarrachaFon from "./assets/login-particles.svg";
import meshFon from "./assets/login-mesh.svg";
import "./auth.css";

export type AuthLocationState = {
  workspace?: string;
  username?: string;
  passwordReset?: boolean;
  from?: { pathname?: string };
};

const IMKONIYATLAR: Array<[string, typeof Zap]> = [
  ["tezkor", Zap],
  ["xavfsiz", ShieldCheck],
  ["qulay", LayoutGrid],
  ["yordam", Headset],
];

const MODULLAR = ["sotuvlar", "ombor", "kassa", "hisobotlar", "tahlil"] as const;

function Brend({ kichik = false }: { kichik?: boolean }) {
  const { t } = useTranslation("auth");
  return (
    <div className={`lp-brand${kichik ? " lp-brand-sm" : ""}`}>
      <span className="lp-logo">Y</span>
      <span>
        <b>YePost</b>
        <small>{t("brandTagline")}</small>
      </span>
    </div>
  );
}

// Kirish, parolni tiklash va yangi parol sahifalari uchun umumiy "Midnight Sapphire" sahna: fon, chap tomonda hero
// (sarlavha, imkoniyatlar, bezak paneli), o'ngda shisha karta. Fon va panel bezak — ekran o'quvchilardan yashirilgan.
export default function AuthLayout() {
  const { t } = useTranslation("auth");
  const sarlavhaOxiri = t("sapphire.heroTitleEnd");
  return (
    <main className="login-page lp">
      <div className="lp-bg" aria-hidden="true">
        <div className="lp-bg-glow lp-bg-glow-1" />
        <div className="lp-bg-glow lp-bg-glow-2" />
        <img className="lp-bg-ribbon" src={lentaFon} alt="" decoding="async" />
        <img className="lp-bg-particles" src={zarrachaFon} alt="" decoding="async" />
        <img className="lp-bg-mesh" src={meshFon} alt="" decoding="async" />
        <div className="lp-bg-vignette" />
      </div>

      <div className="lp-shell">
        <section className="lp-hero" aria-labelledby="lp-hero-title">
          <div className="lp-enter lp-enter-logo"><Brend /></div>

          <h1 id="lp-hero-title" className="lp-title lp-enter lp-enter-title">
            <span className="lp-title-line">{t("sapphire.heroTitle")}</span>
            <span className="lp-title-accent">{t("sapphire.heroAccent")}</span>
            {sarlavhaOxiri ? ` ${sarlavhaOxiri}` : ""}
          </h1>
          <p className="lp-lead lp-enter lp-enter-title">{t("subtext")}</p>

          <ul className="lp-features">
            {IMKONIYATLAR.map(([kalit, Icon], indeks) => (
              <li key={kalit} className="lp-feature lp-enter" style={{ animationDelay: `${260 + indeks * 75}ms` }}>
                <span className="lp-feature-icon"><Icon size={18} strokeWidth={1.9} aria-hidden="true" /></span>
                <span>
                  <b>{t(`sapphire.features.${kalit}.title`)}</b>
                  <small>{t(`sapphire.features.${kalit}.text`)}</small>
                </span>
              </li>
            ))}
          </ul>

          <div className="lp-dash-wrap lp-enter lp-enter-dash">
            <LoginDashboard />
          </div>

          <div className="lp-hero-foot lp-enter" style={{ animationDelay: "620ms" }} aria-hidden="true">
            <div className="lp-modules">
              {MODULLAR.map((kalit) => <span key={kalit}>{t(`sapphire.modules.${kalit}`)}</span>)}
            </div>
            <div className="lp-legend">
              <span><i className="lp-legend-dot" />{t("legend.filiallar")}</span>
              <span><i className="lp-legend-dot lp-legend-dot-cyan" />{t("legend.boshTizim")}</span>
              <span><i className="lp-legend-line" />{t("legend.oqim")}</span>
            </div>
          </div>
        </section>

        <section className="lp-side">
          <div className="lp-mobile-brand lp-enter lp-enter-logo"><Brend kichik /></div>
          <div className="lp-card-wrap lp-enter lp-enter-card">
            <div className="lp-card">
              <div className="lp-card-head">
                <span className="lp-logo lp-logo-lg" aria-hidden="true">Y</span>
                <LanguageSwitcher variant="dark" className="lp-lang" />
              </div>
              <Outlet />
            </div>
          </div>
          <p className="lp-copy">© {new Date().getFullYear()} YePost · {t("footer")}</p>
        </section>
      </div>
    </main>
  );
}

export function AuthPanel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <>
      <h2 className="lp-card-title">{title}</h2>
      <p className="lp-card-sub">{subtitle}</p>
      {children}
    </>
  );
}
