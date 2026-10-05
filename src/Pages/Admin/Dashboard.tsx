import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, Building2, CalendarPlus, CreditCard, Headset, RefreshCw, ShieldCheck, Tag, UserCheck, UserX, Users, type LucideIcon } from "lucide-react";
import LoadingState from "@/Components/common/LoadingState";
import { platformApi } from "@/api/platformApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { PlatformDashboard } from "@/types/platform";
import { XatoXabari } from "./AdminUI";

const OBUNA_HOLATLARI = ["TRIAL", "ACTIVE", "EXPIRED", "CANCELLED"] as const;
const OBUNA_RANGI: Record<(typeof OBUNA_HOLATLARI)[number], { stroke: string; nuqta: string }> = {
  TRIAL: { stroke: "stroke-sky-500", nuqta: "bg-sky-500" },
  ACTIVE: { stroke: "stroke-emerald-500", nuqta: "bg-emerald-500" },
  EXPIRED: { stroke: "stroke-amber-500", nuqta: "bg-amber-500" },
  CANCELLED: { stroke: "stroke-red-500", nuqta: "bg-red-500" },
};

const TEZKOR_HAVOLALAR: { key: string; path: string; icon: LucideIcon; ohang: string }[] = [
  { key: "kompaniyalar", path: "/admin/kompaniyalar", icon: Building2, ohang: "from-blue-400 to-blue-600 shadow-blue-500/30" },
  { key: "tariflar", path: "/admin/tariflar", icon: Tag, ohang: "from-violet-400 to-purple-600 shadow-violet-500/30" },
  { key: "obunalar", path: "/admin/obunalar", icon: CreditCard, ohang: "from-emerald-400 to-teal-600 shadow-emerald-500/30" },
  { key: "foydalanuvchilar", path: "/admin/foydalanuvchilar", icon: Users, ohang: "from-amber-400 to-orange-600 shadow-orange-500/30" },
  { key: "qollabQuvvatlash", path: "/admin/qollab-quvvatlash", icon: Headset, ohang: "from-rose-400 to-pink-600 shadow-pink-500/30" },
];

type Bolak = { qiymat: number; stroke: string };

// Halqa diagramma: bir nechta bo'lak (yoki bitta foiz) va o'rtasida istalgan kontent.
function Halqa({ bolaklar, olcham = 160, qalinlik = 16, children }: { bolaklar: Bolak[]; olcham?: number; qalinlik?: number; children?: ReactNode }) {
  const radius = (olcham - qalinlik) / 2;
  const aylana = 2 * Math.PI * radius;
  const jami = bolaklar.reduce((yigindi, item) => yigindi + item.qiymat, 0);
  let surilish = 0;
  return (
    <div className="relative shrink-0" style={{ width: olcham, height: olcham }}>
      <svg width={olcham} height={olcham} viewBox={`0 0 ${olcham} ${olcham}`} className="-rotate-90" aria-hidden>
        <circle cx={olcham / 2} cy={olcham / 2} r={radius} fill="none" strokeWidth={qalinlik} className="stroke-slate-100" />
        {jami > 0 &&
          bolaklar.map((bolak, index) => {
            if (bolak.qiymat <= 0) return null;
            const uzunlik = (bolak.qiymat / jami) * aylana;
            // Bo'laklar orasida kichik bo'shliq (faqat bir nechta bo'lak bo'lsa).
            const bosh = bolaklar.filter((item) => item.qiymat > 0).length > 1 ? 4 : 0;
            const element = (
              <circle
                key={index}
                cx={olcham / 2}
                cy={olcham / 2}
                r={radius}
                fill="none"
                strokeWidth={qalinlik}
                strokeLinecap="round"
                strokeDasharray={`${Math.max(uzunlik - bosh, 0.01)} ${aylana}`}
                strokeDashoffset={-surilish}
                className={`${bolak.stroke} transition-all duration-700`}
              />
            );
            surilish += uzunlik;
            return element;
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

function QatorMalumot({ nom, qiymat, nuqta, ikonka }: { nom: string; qiymat: number; nuqta?: string; ikonka?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50/80 px-3.5 py-2.5">
      {nuqta ? <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${nuqta}`} /> : <span className="shrink-0 text-slate-400">{ikonka}</span>}
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-600">{nom}</span>
      <span className="text-lg font-black text-slate-900">{qiymat.toLocaleString("uz-UZ")}</span>
    </div>
  );
}

function BentoKarta({ nom, ikonka, ohang, havola, children, className = "" }: { nom: string; ikonka: ReactNode; ohang: string; havola: string; children: ReactNode; className?: string }) {
  return (
    <section aria-label={nom} className={`group flex flex-col rounded-[28px] border border-slate-200/70 bg-white p-6 shadow-[0_6px_28px_rgba(15,23,42,.06)] transition duration-200 hover:shadow-[0_16px_40px_rgba(15,23,42,.1)] ${className}`}>
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${ohang}`}>{ikonka}</span>
        <h2 className="flex-1 text-base font-black text-slate-900">{nom}</h2>
        <Link to={havola} aria-label={nom} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition hover:bg-orange-500 hover:text-white">
          <ArrowUpRight size={17} />
        </Link>
      </div>
      {children}
    </section>
  );
}

export default function AdminDashboard() {
  const { t } = useTranslation("admin");
  const [malumot, setMalumot] = useState<PlatformDashboard | null>(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [xatolik, setXatolik] = useState("");

  const yuklash = useCallback(async () => {
    setYuklanmoqda(true);
    setXatolik("");
    try {
      setMalumot(await platformApi.dashboard());
    } catch (error) {
      setXatolik(getApiErrorMessage(error));
    } finally {
      setYuklanmoqda(false);
    }
  }, []);

  useEffect(() => {
    void yuklash();
  }, [yuklash]);

  const obunaJami = malumot ? OBUNA_HOLATLARI.reduce((yigindi, holat) => yigindi + (malumot.subscriptions[holat] ?? 0), 0) : 0;
  const foiz = (qism: number, jami: number) => (jami > 0 ? Math.round((qism / jami) * 100) : 0);

  return (
    <div className="space-y-6">
      {/* Banner: sarlavha, yangilash va asosiy uchta jami ko'rsatkich */}
      <header className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-orange-500 via-orange-600 to-orange-800 p-6 text-white shadow-[0_20px_50px_rgba(15,23,42,.25)] sm:p-8">
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10" />
        <span aria-hidden className="pointer-events-none absolute -bottom-24 right-40 h-56 w-56 rounded-full bg-white/10" />
        <span aria-hidden className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-black/10" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 max-w-xl">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-[.18em] ring-1 ring-white/20">
              <ShieldCheck size={13} /> {t("eyebrow")}
            </p>
            <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl">{t("dashboard.title")}</h1>
            <p className="mt-2 text-sm leading-6 text-white/75">{t("dashboard.subtitle")}</p>
            <button
              type="button"
              onClick={() => void yuklash()}
              disabled={yuklanmoqda}
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-white/15 px-4 text-sm font-bold ring-1 ring-white/25 backdrop-blur transition hover:bg-white/25 disabled:opacity-60"
            >
              <RefreshCw size={15} className={yuklanmoqda ? "animate-spin" : ""} /> {t("common.yangilash")}
            </button>
          </div>

          {malumot && (
            <div className="grid grid-cols-3 gap-3 lg:w-[460px]">
              {[
                { nom: t("dashboard.kompaniyalar"), qiymat: malumot.workspaces.total, ikonka: <Building2 size={18} /> },
                { nom: t("dashboard.foydalanuvchilar"), qiymat: malumot.users.total, ikonka: <Users size={18} /> },
                { nom: t("dashboard.obunalar"), qiymat: obunaJami, ikonka: <CreditCard size={18} /> },
              ].map((item) => (
                <div key={item.nom} className="rounded-2xl bg-white/15 p-4 ring-1 ring-white/20 backdrop-blur">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">{item.ikonka}</span>
                  <p className="mt-3 text-3xl font-black leading-none">{item.qiymat.toLocaleString("uz-UZ")}</p>
                  <p className="mt-1.5 truncate text-xs font-semibold text-white/70">{item.nom}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      {xatolik && <XatoXabari matn={xatolik} />}

      {yuklanmoqda && !malumot ? (
        <LoadingState matn={t("common.yuklanmoqda")} ikonka={<Building2 size={24} />} />
      ) : (
        malumot && (
          <>
            <div className="grid gap-5 lg:grid-cols-3">
              <BentoKarta nom={t("dashboard.kompaniyalar")} ikonka={<Building2 size={20} />} ohang="from-blue-400 to-blue-600 shadow-blue-500/30" havola="/admin/kompaniyalar">
                <div className="flex flex-1 flex-col items-center gap-5 pt-6">
                  <Halqa
                    bolaklar={[
                      { qiymat: malumot.workspaces.active, stroke: "stroke-emerald-500" },
                      { qiymat: malumot.workspaces.inactive, stroke: "stroke-slate-400" },
                    ]}
                  >
                    <span className="text-4xl font-black leading-none tracking-tight text-slate-900">{foiz(malumot.workspaces.active, malumot.workspaces.total)}%</span>
                    <span className="mt-1 text-xs font-bold text-slate-400">{t("dashboard.ulush")}</span>
                  </Halqa>
                  <div className="w-full space-y-2">
                    <QatorMalumot nom={t("dashboard.faol")} qiymat={malumot.workspaces.active} nuqta="bg-emerald-500" />
                    <QatorMalumot nom={t("dashboard.nofaol")} qiymat={malumot.workspaces.inactive} nuqta="bg-slate-400" />
                    <QatorMalumot nom={t("dashboard.songgi30")} qiymat={malumot.workspaces.createdLast30Days} ikonka={<CalendarPlus size={15} />} />
                  </div>
                </div>
              </BentoKarta>

              <BentoKarta nom={t("dashboard.foydalanuvchilar")} ikonka={<Users size={20} />} ohang="from-amber-400 to-orange-600 shadow-orange-500/30" havola="/admin/foydalanuvchilar">
                <div className="flex flex-1 flex-col items-center gap-5 pt-6">
                  <Halqa
                    bolaklar={[
                      { qiymat: malumot.users.active, stroke: "stroke-emerald-500" },
                      { qiymat: malumot.users.inactive, stroke: "stroke-red-500" },
                    ]}
                  >
                    <span className="text-4xl font-black leading-none tracking-tight text-slate-900">{malumot.users.total.toLocaleString("uz-UZ")}</span>
                    <span className="mt-1 text-xs font-bold text-slate-400">{t("dashboard.jami")}</span>
                  </Halqa>
                  <div className="w-full space-y-2">
                    <QatorMalumot nom={t("dashboard.faol")} qiymat={malumot.users.active} nuqta="bg-emerald-500" ikonka={<UserCheck size={15} />} />
                    <QatorMalumot nom={t("dashboard.bloklangan")} qiymat={malumot.users.inactive} nuqta="bg-red-500" ikonka={<UserX size={15} />} />
                  </div>
                </div>
              </BentoKarta>

              <BentoKarta nom={t("dashboard.obunalar")} ikonka={<CreditCard size={20} />} ohang="from-emerald-400 to-teal-600 shadow-emerald-500/30" havola="/admin/obunalar">
                <div className="flex flex-1 flex-col items-center gap-5 pt-6">
                  <Halqa bolaklar={OBUNA_HOLATLARI.map((holat) => ({ qiymat: malumot.subscriptions[holat] ?? 0, stroke: OBUNA_RANGI[holat].stroke }))}>
                    <span className="text-4xl font-black leading-none tracking-tight text-slate-900">{obunaJami}</span>
                    <span className="mt-1 text-xs font-bold text-slate-400">{t("dashboard.jami")}</span>
                  </Halqa>
                  <div className="w-full space-y-2">
                    {OBUNA_HOLATLARI.map((holat) => (
                      <QatorMalumot key={holat} nom={`${t(`obunalar.holatlar.${holat}`)} · ${foiz(malumot.subscriptions[holat] ?? 0, obunaJami)}%`} qiymat={malumot.subscriptions[holat] ?? 0} nuqta={OBUNA_RANGI[holat].nuqta} />
                    ))}
                  </div>
                </div>
              </BentoKarta>
            </div>

            <section aria-label={t("dashboard.tezkor")}>
              <h2 className="mb-3 text-xs font-black uppercase tracking-[.16em] text-slate-400">{t("dashboard.tezkor")}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {TEZKOR_HAVOLALAR.map((item) => {
                  const Ikonka = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="group relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_16px_36px_rgba(15,23,42,.12)]"
                    >
                      <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition group-hover:scale-110 ${item.ohang}`}>
                        <Ikonka size={22} />
                      </span>
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-black text-slate-800">{t(`menu.${item.key}`)}</span>
                        <ArrowUpRight size={16} className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-orange-500" />
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          </>
        )
      )}
    </div>
  );
}
