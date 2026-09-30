import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Hash, Phone, Trash2, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import AppModal from "@/Components/common/AppModal";
import { crmApi, royxatniAjratish } from "@/api/crmApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import FaoliyatPaneli from "./FaoliyatPaneli";
import { InstagramIkonka, TelegramIkonka, WhatsappIkonka } from "./IjtimoiyIkonkalar";
import TezkorPanel from "./TezkorPanel";
import { KirimTab, TarixTab, TolovlarTab } from "./XaridorTablari";
import { timelineniTarixga, timelineniTolovga } from "./backendAdapters";
import type { IjtimoiyTarmoqlar, Kirim, TarixYozuvi, XaridorTolovi, YetkazibBeruvchi } from "./types";
import { sanaFormat } from "./yordamchilar";

import ModalTablari from "@/Components/common/ModalTablari";
type Tab = "malumotlar" | "kirim" | "tolovlar" | "tarix";
const tabKalitlari: Tab[] = ["malumotlar", "kirim", "tolovlar", "tarix"];

type Props = {
  beruvchi: YetkazibBeruvchi;
  kirimlar: Kirim[];
  onTahrirlash: () => void;
  onOchirish?: () => void;
  onYopish: () => void;
};

export default function YetkazibTafsilotlariModal({
  beruvchi,
  kirimlar: barchaKirimlar,
  onTahrirlash,
  onOchirish,
  onYopish,
}: Props) {
  const { t } = useTranslation("xaridor_uchot");
  const tablar = tabKalitlari.map((kalit) => ({ kalit, nom: t(`shared.tabs.${kalit}`) }));
  const [faolTab, setFaolTab] = useState<Tab>("malumotlar");
  const [tarix, setTarix] = useState<TarixYozuvi[]>([]);
  const [tolovlar, setTolovlar] = useState<XaridorTolovi[]>([]);
  const [xatolik, setXatolik] = useState("");

  const kirimlar = useMemo(
    () => barchaKirimlar.filter((kirim) => kirim.yetkazibBeruvchiId === beruvchi.id),
    [beruvchi.id, barchaKirimlar]
  );

  useEffect(() => {
    if (!beruvchi.partnerId) {
      setTarix([]);
      setTolovlar([]);
      return;
    }
    let faol = true;
    setXatolik("");
    void crmApi.partnerTimeline(beruvchi.partnerId, { limit: 100 }).then((response) => {
      if (!faol) return;
      const items = royxatniAjratish(response);
      setTarix(items.map((item, index) => timelineniTarixga(beruvchi.id, item, index)));
      setTolovlar(items.map((item, index) => timelineniTolovga(beruvchi.id, item, index)).filter((item): item is XaridorTolovi => item !== null));
    }).catch((error) => {
      if (faol) setXatolik(getApiErrorMessage(error));
    });
    return () => { faol = false; };
  }, [beruvchi.id, beruvchi.partnerId]);

  return (
    <AppModal className="items-start justify-start bg-[rgba(15,23,42,.50)] p-0 py-4 pl-[88px] pr-4 backdrop-blur-[3px]">
      <div className="relative h-[calc(100vh-32px)] w-full">
        <TezkorPanel
          havolaId={beruvchi.id}
          faylNomi={`yetkazib-beruvchi-${beruvchi.id}`}
          malumot={beruvchi}
          onYopish={onYopish}
        />

        <section className="relative h-full w-full overflow-hidden rounded-l-[46px] rounded-r-[36px] bg-gradient-to-br from-[#F8FAFC] via-[#FFFFFF] to-[#E8EEF7] text-[#253044] shadow-[0_34px_120px_rgba(15,23,42,.42)] ring-1 ring-white/80">
          <div className="scrollbar-orange h-full overflow-y-auto">
            <header className="sticky top-0 z-30 border-b border-orange-100/80 bg-[#F8FAFC]/90 px-9 py-6 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <h1 className="truncate text-2xl font-bold text-slate-900">{beruvchi.nomi}</h1>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-sm text-slate-600 shadow-sm transition hover:text-orange-600"
                  >
                    {t("shared.documentButton")} <ChevronDown size={15} />
                  </button>
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

            {faolTab === "malumotlar" && (
              <div className="grid gap-6 px-9 py-7 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <section className="rounded-[26px] bg-white/92 p-6 shadow-[0_18px_46px_rgba(37,99,235,.08)] ring-1 ring-orange-100/80">
                  <div className="border-b border-orange-100/80 pb-3">
                    <h2 className="text-sm font-black uppercase tracking-wide text-slate-600">
                      {t("yetkazibDetails.aboutTitle")}
                    </h2>
                  </div>
                  <dl className="mt-2 divide-y-2 divide-slate-200 [&>div]:py-4">
                    <Qator icon={<Hash size={14} />} nom={t("shared.detailFields.stir")} qiymat={beruvchi.stir} />
                    <Qator icon={<Phone size={14} />} nom={t("shared.detailFields.phone")} qiymat={beruvchi.telefon} />
                    <Qator icon={<UserRound size={14} />} nom={t("yetkazibDetails.contactPerson")} qiymat={beruvchi.aloqaShaxsi} />
                    <Qator icon={<Phone size={14} />} nom={t("yetkazibDetails.contactPhone")} qiymat={beruvchi.aloqaTelefoni} />
                    <Qator nom={t("shared.detailFields.position")} qiymat={beruvchi.lavozim} />
                    <IjtimoiyBlok ijtimoiy={beruvchi.ijtimoiy} />
                    <Qator nom={t("shared.detailFields.createdBy")} qiymat={beruvchi.yaratganMasul} />
                    <Qator nom={t("shared.detailFields.createdDate")} qiymat={sanaFormat(beruvchi.yaratilganSana)} />
                    <Qator nom={t("shared.detailFields.modifiedDate")} qiymat={sanaFormat(beruvchi.ozgartirilganSana)} />
                    <Qator nom={t("shared.detailFields.modifiedBy")} qiymat={beruvchi.ozgartirganMasul} />
                  </dl>
                </section>

                <FaoliyatPaneli partnerId={beruvchi.partnerId} />
              </div>
            )}
            {xatolik && <div className="mx-9 mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">{xatolik}</div>}
            {faolTab === "kirim" && <KirimTab kirimlar={kirimlar} beruvchiNomi={beruvchi.nomi} />}
            {faolTab === "tolovlar" && <TolovlarTab tolovlar={tolovlar} />}
            {faolTab === "tarix" && <TarixTab tarix={tarix} />}
          </div>
        </section>
      </div>
    </AppModal>
  );
}

function Qator({ icon, nom, qiymat }: { icon?: React.ReactNode; nom: string; qiymat: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
        {icon && <span className="text-[#2563EB]">{icon}</span>}
        {nom}
      </dt>
      <dd className="mt-0.5 text-base font-semibold text-slate-800">{qiymat || "—"}</dd>
    </div>
  );
}

function IjtimoiyBlok({ ijtimoiy }: { ijtimoiy: IjtimoiyTarmoqlar }) {
  const { t } = useTranslation("xaridor_uchot");
  return (
    <div>
      <dt className="text-sm font-bold text-slate-400">{t("shared.socialNetworksLabel")}</dt>
      <dd className="mt-2 space-y-2">
        <IjtimoiyQator icon={<TelegramIkonka size={16} />} rang="bg-[#E7F3FB] text-[#229ED9]" qiymat={ijtimoiy.telegram} />
        <IjtimoiyQator icon={<WhatsappIkonka size={16} />} rang="bg-[#E6F6EC] text-[#25D366]" qiymat={ijtimoiy.whatsapp} />
        <IjtimoiyQator icon={<InstagramIkonka size={16} />} rang="bg-[#FCE9F1] text-[#E1306C]" qiymat={ijtimoiy.instagram} />
      </dd>
    </div>
  );
}

function IjtimoiyQator({ icon, rang, qiymat }: { icon: React.ReactNode; rang: string; qiymat: string }) {
  const { t } = useTranslation("xaridor_uchot");
  return (
    <div className="flex items-center gap-2.5">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${qiymat ? rang : "bg-slate-100 text-slate-300"}`}>
        {icon}
      </span>
      <span className={`text-sm font-semibold ${qiymat ? "text-slate-800" : "text-slate-400"}`}>
        {qiymat || t("shared.notEntered")}
      </span>
    </div>
  );
}
