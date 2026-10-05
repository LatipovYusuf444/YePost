import { pulMatni } from "@/lib/valyuta";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Briefcase, Building2, Phone, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import AppModal from "@/Components/common/AppModal";
import FaoliyatPaneli from "./FaoliyatPaneli";
import { crmApi, royxatniAjratish } from "@/api/crmApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { InstagramIkonka, TelegramIkonka, WhatsappIkonka } from "./IjtimoiyIkonkalar";
import TezkorPanel from "./TezkorPanel";
import { SavdolarTab, TarixTab } from "./XaridorTablari";
import XaridorTolovlariTab from "./XaridorTolovlariTab";
import { timelineniTarixga } from "./backendAdapters";
import type { TarixYozuvi, Xaridor, XaridorKompaniyasi, XaridorSavdosi } from "./types";
import { kompaniyaNomi, sanaFormat, xaridorNomi } from "./yordamchilar";

import ModalTablari from "@/Components/common/ModalTablari";
type Tab = "malumotlar" | "savdolar" | "tolovlar" | "tarix";
const tabKalitlari: Tab[] = ["malumotlar", "savdolar", "tolovlar", "tarix"];

type Props = {
  xaridor: Xaridor;
  kompaniyalar: XaridorKompaniyasi[];
  savdolar: XaridorSavdosi[];
  onTahrirlash: () => void;
  onOchirish?: () => void;
  onYopish: () => void;
};

export default function XaridorTafsilotlariModal({
  xaridor,
  kompaniyalar,
  savdolar,
  onTahrirlash,
  onOchirish,
  onYopish,
}: Props) {
  const { t } = useTranslation("xaridor_uchot");
  const tablar = tabKalitlari.map((kalit) => ({ kalit, nom: t(`shared.tabs.${kalit}`) }));
  const [faolTab, setFaolTab] = useState<Tab>("malumotlar");
  const [xaridorTarixi, setXaridorTarixi] = useState<TarixYozuvi[]>([]);
  const [xatolik, setXatolik] = useState("");

  const xaridorSavdolari = useMemo(
    () => savdolar.filter((savdo) => savdo.xaridorId === xaridor.id),
    [savdolar, xaridor.id]
  );
  useEffect(() => {
    if (!xaridor.partnerId) {
      setXaridorTarixi([]);
      return;
    }
    let active = true;
    const request = crmApi.partnerTimeline(xaridor.partnerId, { limit: 100 });
    void request.then((response) => {
      if (!active) return;
      const items = royxatniAjratish(response);
      setXaridorTarixi(items.map((item, index) => timelineniTarixga(xaridor.id, item, index)));
    }).catch((error) => { if (active) setXatolik(getApiErrorMessage(error)); });
    return () => { active = false; };
  }, [xaridor.id, xaridor.partnerId]);

  return (
    <AppModal className="items-start justify-start bg-[rgba(15,23,42,.50)] p-0 py-4 pl-[88px] pr-4 backdrop-blur-[3px]">
      <div className="relative h-[calc(100vh-32px)] w-full">
        <TezkorPanel
          havolaId={xaridor.id}
          faylNomi={`xaridor-${xaridor.id}`}
          malumot={xaridor}
          onYopish={onYopish}
        />

        <section className="relative h-full w-full overflow-hidden rounded-l-[46px] rounded-r-[36px] bg-gradient-to-br from-[#F8FAFC] via-[#FFFFFF] to-[#E8EEF7] text-[#253044] shadow-[0_34px_120px_rgba(15,23,42,.42)] ring-1 ring-white/80">
          <div className="scrollbar-orange h-full overflow-y-auto">
            <header className="sticky top-0 z-30 border-b border-orange-100/80 bg-[#F8FAFC]/90 px-9 py-6 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <h1 className="truncate text-2xl font-bold text-slate-900">
                  {xaridorNomi(xaridor)}
                </h1>

                <div className="flex shrink-0 items-center gap-2">
                  {onOchirish && (
                    <button
                      type="button"
                      onClick={onOchirish}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500 shadow-sm transition hover:bg-red-100"
                      aria-label={t("shared.deleteAria")}
                    >
                      <Trash2 size={17} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onTahrirlash}
                    className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#2563EB] px-4 text-sm font-bold text-white shadow-[0_10px_24px_rgba(37,99,235,.24)] transition hover:bg-[#1D4ED8]"
                  >
                    {t("shared.editButton")}
                  </button>
                </div>
              </div>

              <ModalTablari
                className="mt-6"
                tablar={tablar.map((tab) => ({ id: tab.kalit, nom: tab.nom }))}
                faol={faolTab}
                onChange={(id) => setFaolTab(id as typeof faolTab)}
              />
            </header>

            {xatolik && <div className="mx-9 mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">{xatolik}</div>}

            {faolTab === "malumotlar" && (
              <MalumotlarTab
                xaridor={xaridor}
                kompaniyalar={kompaniyalar}
                savdolar={xaridorSavdolari}
              />
            )}
            {faolTab === "savdolar" && (
              <SavdolarTab
                savdolar={xaridorSavdolari}
                xaridorNomi={xaridorNomi(xaridor)}
                xaridorOlish={() => xaridor}
                kompaniyalar={kompaniyalar}
                barchaSavdolar={savdolar}
              />
            )}
            {faolTab === "tolovlar" && <XaridorTolovlariTab xaridorId={xaridor.id} />}
            {faolTab === "tarix" && <TarixTab tarix={xaridorTarixi} />}
          </div>
        </section>
      </div>
    </AppModal>
  );
}

function MalumotlarTab({
  xaridor,
  kompaniyalar,
  savdolar,
}: {
  xaridor: Xaridor;
  kompaniyalar: XaridorKompaniyasi[];
  savdolar: XaridorSavdosi[];
}) {
  const { t } = useTranslation("xaridor_uchot");
  const jamiRealizatsiya = savdolar.reduce((sum, savdo) => sum + savdo.summa, 0);
  const jamiTolangan = savdolar.reduce((sum, savdo) => sum + savdo.tolangan, 0);
  const jamiQarz = savdolar.reduce((sum, savdo) => sum + savdo.qarz, 0);

  return (
    <div className="grid gap-6 px-9 py-7 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-5">
        <section className="rounded-[26px] bg-white/92 p-6 shadow-[0_18px_46px_rgba(37,99,235,.08)] ring-1 ring-orange-100/80">
          <div className="border-b border-orange-100/80 pb-3">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-600">
              {t("xaridorDetails.aboutTitle")}
            </h2>
          </div>

          <dl className="mt-2 divide-y-2 divide-slate-200 [&>div]:py-4">
            <div>
              <dt className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                <span className="text-[#2563EB]">
                  <Phone size={14} />
                </span>
                {t("shared.detailFields.phone")}
              </dt>
              <dd className="mt-1 space-y-1">
                {xaridor.telefonlar.length === 0 && (
                  <p className="text-base font-semibold text-slate-800">—</p>
                )}
                {xaridor.telefonlar.map((telefon) => (
                  <p key={telefon} className="text-base font-semibold text-slate-800">
                    {telefon}
                  </p>
                ))}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-bold text-slate-400">{t("shared.socialNetworksLabel")}</dt>
              <dd className="mt-2 space-y-2">
                <IjtimoiyQator
                  icon={<TelegramIkonka size={16} />}
                  rang="bg-[#E7F3FB] text-[#229ED9]"
                  qiymat={xaridor.ijtimoiy.telegram}
                />
                <IjtimoiyQator
                  icon={<WhatsappIkonka size={16} />}
                  rang="bg-[#E6F6EC] text-[#25D366]"
                  qiymat={xaridor.ijtimoiy.whatsapp}
                />
                <IjtimoiyQator
                  icon={<InstagramIkonka size={16} />}
                  rang="bg-[#FCE9F1] text-[#E1306C]"
                  qiymat={xaridor.ijtimoiy.instagram}
                />
              </dd>
            </div>

            <Qator nom={t("xaridorModal.address")} qiymat={xaridor.manzil || t("shared.notEntered")} />
            <Qator
              icon={<Building2 size={14} />}
              nom={t("xaridorDetails.companyLabel")}
              qiymat={kompaniyaNomi(kompaniyalar, xaridor.kompaniyaId) || t("xaridorDetails.companyUnassigned")}
            />
            <Qator
              icon={<Briefcase size={14} />}
              nom={t("shared.detailFields.position")}
              qiymat={xaridor.lavozim || t("shared.notEntered")}
            />
            <Qator nom={t("shared.registeredDateLabel")} qiymat={sanaFormat(xaridor.yaratilganSana)} />
            <Qator nom={t("xaridorDetails.totalSales")} qiymat={pulMatni(jamiRealizatsiya, "UZS", true)} />
            <Qator nom={t("xaridorDetails.totalPaid")} qiymat={pulMatni(jamiTolangan, "UZS", true)} />
            <Qator
              icon={jamiQarz > 0 ? <AlertTriangle size={14} /> : undefined}
              nom={jamiQarz > 0 ? t("xaridorDetails.debtorYes") : t("xaridorDetails.debtorNo")}
              qiymat={pulMatni(jamiQarz, "UZS", true)}
              qarz={jamiQarz > 0}
            />
          </dl>
        </section>
      </div>

      <FaoliyatPaneli partnerId={xaridor.partnerId} customerId={xaridor.id} />
    </div>
  );
}

function Qator({
  icon,
  nom,
  qiymat,
  qarz = false,
}: {
  icon?: React.ReactNode;
  nom: string;
  qiymat: string;
  qarz?: boolean;
}) {
  return (
    <div className={qarz ? "!-mx-3 !my-1 rounded-2xl !border-t-0 bg-red-50 !px-3 ring-1 ring-red-200" : undefined}>
      <dt className={`flex items-center gap-1.5 text-sm font-bold ${qarz ? "text-red-500" : "text-slate-400"}`}>
        {icon && <span className={qarz ? "text-red-500" : "text-[#2563EB]"}>{icon}</span>}
        {nom}
      </dt>
      <dd className={`mt-0.5 text-base ${qarz ? "font-black text-red-600" : "font-semibold text-slate-800"}`}>{qiymat}</dd>
    </div>
  );
}

function IjtimoiyQator({
  icon,
  rang,
  qiymat,
}: {
  icon: React.ReactNode;
  rang: string;
  qiymat: string;
}) {
  const { t } = useTranslation("xaridor_uchot");
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
          qiymat ? rang : "bg-slate-100 text-slate-300"
        }`}
      >
        {icon}
      </span>
      <span
        className={`text-sm font-semibold ${qiymat ? "text-slate-800" : "text-slate-400"}`}
      >
        {qiymat || t("shared.notEntered")}
      </span>
    </div>
  );
}
