import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Building2, CalendarPlus, CreditCard, RefreshCw, UserCheck, UserX, Users } from "lucide-react";
import LoadingState from "@/Components/common/LoadingState";
import { platformApi } from "@/api/platformApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { PlatformDashboard } from "@/types/platform";
import { SahifaSarlavhasi } from "./AdminUI";

const OBUNA_HOLATLARI = ["TRIAL", "ACTIVE", "EXPIRED", "CANCELLED"] as const;
const OBUNA_RANGI: Record<(typeof OBUNA_HOLATLARI)[number], string> = {
  TRIAL: "bg-sky-500",
  ACTIVE: "bg-emerald-500",
  EXPIRED: "bg-amber-500",
  CANCELLED: "bg-red-500",
};

function Karta({ nom, qiymat, ikonka, ohang, havola }: { nom: string; qiymat: number; ikonka: React.ReactNode; ohang: string; havola?: string }) {
  const ichki = (
    <div className="group flex items-center gap-4 rounded-[24px] border border-orange-100 bg-white p-5 shadow-[0_3px_14px_rgba(15,23,42,.05)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(15,23,42,.1)]">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md ${ohang}`}>{ikonka}</span>
      <div>
        <p className="text-sm font-semibold text-slate-500">{nom}</p>
        <p className="mt-0.5 text-3xl font-black leading-none text-slate-900">{qiymat.toLocaleString("uz-UZ")}</p>
      </div>
    </div>
  );
  return havola ? <Link to={havola}>{ichki}</Link> : ichki;
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

  return (
    <div className="space-y-6">
      <SahifaSarlavhasi
        eyebrow={t("eyebrow")}
        sarlavha={t("dashboard.title")}
        tavsif={t("dashboard.subtitle")}
        amallar={
          <button
            type="button"
            onClick={() => void yuklash()}
            disabled={yuklanmoqda}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-slate-600 ring-1 ring-orange-100 transition hover:bg-orange-50 disabled:opacity-60"
          >
            <RefreshCw size={16} className={yuklanmoqda ? "animate-spin" : ""} /> {t("common.yangilash")}
          </button>
        }
      />

      {xatolik && <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">{xatolik}</div>}

      {yuklanmoqda && !malumot ? (
        <LoadingState matn={t("common.yuklanmoqda")} ikonka={<Building2 size={24} />} />
      ) : (
        malumot && (
          <>
            <section aria-label={t("dashboard.kompaniyalar")}>
              <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">{t("dashboard.kompaniyalar")}</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Karta nom={t("dashboard.jami")} qiymat={malumot.workspaces.total} ikonka={<Building2 size={22} />} ohang="bg-blue-600 shadow-blue-200" havola="/admin/kompaniyalar" />
                <Karta nom={t("dashboard.faol")} qiymat={malumot.workspaces.active} ikonka={<UserCheck size={22} />} ohang="bg-emerald-500 shadow-emerald-200" />
                <Karta nom={t("dashboard.nofaol")} qiymat={malumot.workspaces.inactive} ikonka={<UserX size={22} />} ohang="bg-slate-500 shadow-slate-200" />
                <Karta nom={t("dashboard.songgi30")} qiymat={malumot.workspaces.createdLast30Days} ikonka={<CalendarPlus size={22} />} ohang="bg-violet-500 shadow-violet-200" />
              </div>
            </section>

            <section aria-label={t("dashboard.foydalanuvchilar")}>
              <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">{t("dashboard.foydalanuvchilar")}</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <Karta nom={t("dashboard.jami")} qiymat={malumot.users.total} ikonka={<Users size={22} />} ohang="bg-blue-600 shadow-blue-200" havola="/admin/foydalanuvchilar" />
                <Karta nom={t("dashboard.faol")} qiymat={malumot.users.active} ikonka={<UserCheck size={22} />} ohang="bg-emerald-500 shadow-emerald-200" />
                <Karta nom={t("dashboard.bloklangan")} qiymat={malumot.users.inactive} ikonka={<UserX size={22} />} ohang="bg-red-500 shadow-red-200" />
              </div>
            </section>

            <section aria-label={t("dashboard.obunalar")} className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_3px_14px_rgba(15,23,42,.05)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-500">
                  <CreditCard size={16} className="text-orange-500" /> {t("dashboard.obunalar")}
                </h2>
                <Link to="/admin/obunalar" className="text-sm font-black text-orange-500 hover:underline">
                  {t("dashboard.hammasi")}
                </Link>
              </div>
              {obunaJami > 0 && (
                <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={t("dashboard.obunalar")}>
                  {OBUNA_HOLATLARI.map((holat) => {
                    const soni = malumot.subscriptions[holat] ?? 0;
                    return soni > 0 ? <span key={holat} className={OBUNA_RANGI[holat]} style={{ width: `${(soni / obunaJami) * 100}%` }} /> : null;
                  })}
                </div>
              )}
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {OBUNA_HOLATLARI.map((holat) => (
                  <div key={holat} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                    <span className={`h-3 w-3 rounded-full ${OBUNA_RANGI[holat]}`} />
                    <span className="flex-1 text-sm font-bold text-slate-600">{t(`obunalar.holatlar.${holat}`)}</span>
                    <span className="text-xl font-black text-slate-900">{malumot.subscriptions[holat] ?? 0}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )
      )}
    </div>
  );
}
