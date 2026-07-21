import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Hash, Phone, Trash2, UserRound } from "lucide-react";
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

type Tab = "Ma'lumotlar" | "Kirim" | "To'lovlar" | "Tarix";
const tablar: Tab[] = ["Ma'lumotlar", "Kirim", "To'lovlar", "Tarix"];

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
  const [faolTab, setFaolTab] = useState<Tab>("Ma'lumotlar");
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
    <AppModal className="items-start justify-start bg-[rgba(54,22,8,.50)] p-0 py-4 pl-[88px] pr-4 backdrop-blur-[3px]">
      <div className="relative h-[calc(100vh-32px)] w-full">
        <TezkorPanel
          havolaId={beruvchi.id}
          faylNomi={`yetkazib-beruvchi-${beruvchi.id}`}
          malumot={beruvchi}
          onYopish={onYopish}
        />

        <section className="relative h-full w-full overflow-hidden rounded-l-[46px] rounded-r-[36px] bg-gradient-to-br from-[#FFF8EF] via-[#FFFDF9] to-[#FFE8D2] text-[#253044] shadow-[0_34px_120px_rgba(92,38,8,.42)] ring-1 ring-white/80">
          <div className="scrollbar-orange h-full overflow-y-auto">
            <header className="sticky top-0 z-30 border-b border-orange-100/80 bg-[#FFF8EF]/90 px-9 py-6 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <h1 className="truncate text-2xl font-bold text-slate-900">{beruvchi.nomi}</h1>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-sm text-slate-600 shadow-sm transition hover:text-orange-600"
                  >
                    Hujjat <ChevronDown size={15} />
                  </button>
                  {onOchirish && (
                    <button
                      type="button"
                      onClick={onOchirish}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500 shadow-sm transition hover:bg-red-100"
                      aria-label="O'chirish"
                    >
                      <Trash2 size={17} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onTahrirlash}
                    className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#FF6A00] px-4 text-sm font-bold text-white shadow-[0_10px_24px_rgba(249,115,22,.24)] transition hover:bg-[#EA580C]"
                  >
                    Ma'lumotni o'zgartirish
                  </button>
                </div>
              </div>

              <nav className="mt-6 flex items-center gap-3 overflow-x-auto">
                {tablar.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFaolTab(tab)}
                    className={`shrink-0 rounded-xl px-3 py-2 text-sm transition ${
                      faolTab === tab
                        ? "border border-orange-200 bg-white text-[#FF6A00]"
                        : "text-slate-500 hover:bg-white hover:text-[#FF6A00]"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </nav>
            </header>

            {faolTab === "Ma'lumotlar" && (
              <div className="grid gap-6 px-9 py-7 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <section className="rounded-[26px] bg-white/92 p-6 shadow-[0_18px_46px_rgba(255,106,0,.08)] ring-1 ring-orange-100/80">
                  <div className="border-b border-orange-100/80 pb-3">
                    <h2 className="text-sm font-black uppercase tracking-wide text-slate-600">
                      Yetkazib beruvchi haqida
                    </h2>
                  </div>
                  <dl className="mt-5 space-y-4">
                    <Qator icon={<Hash size={14} />} nom="STIR" qiymat={beruvchi.stir} />
                    <Qator icon={<Phone size={14} />} nom="Telefon" qiymat={beruvchi.telefon} />
                    <Qator icon={<UserRound size={14} />} nom="Aloqa shaxs" qiymat={beruvchi.aloqaShaxsi} />
                    <Qator icon={<Phone size={14} />} nom="Aloqa tel raqami" qiymat={beruvchi.aloqaTelefoni} />
                    <Qator nom="Lavozim" qiymat={beruvchi.lavozim} />
                    <IjtimoiyBlok ijtimoiy={beruvchi.ijtimoiy} />
                    <Qator nom="Yaratgan mas'ul shaxs" qiymat={beruvchi.yaratganMasul} />
                    <Qator nom="Sana yaratilgan" qiymat={sanaFormat(beruvchi.yaratilganSana)} />
                    <Qator nom="O'zgartirilgan sana" qiymat={sanaFormat(beruvchi.ozgartirilganSana)} />
                    <Qator nom="O'zgartirgan mas'ul shaxs" qiymat={beruvchi.ozgartirganMasul} />
                  </dl>
                </section>

                <FaoliyatPaneli partnerId={beruvchi.partnerId} />
              </div>
            )}
            {xatolik && <div className="mx-9 mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">{xatolik}</div>}
            {faolTab === "Kirim" && <KirimTab kirimlar={kirimlar} beruvchiNomi={beruvchi.nomi} />}
            {faolTab === "To'lovlar" && <TolovlarTab tolovlar={tolovlar} />}
            {faolTab === "Tarix" && <TarixTab tarix={tarix} />}
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
        {icon && <span className="text-[#FF6A00]">{icon}</span>}
        {nom}
      </dt>
      <dd className="mt-0.5 text-base font-semibold text-slate-800">{qiymat || "—"}</dd>
    </div>
  );
}

function IjtimoiyBlok({ ijtimoiy }: { ijtimoiy: IjtimoiyTarmoqlar }) {
  return (
    <div>
      <dt className="text-sm font-bold text-slate-400">Ijtimoiy tarmoqlar</dt>
      <dd className="mt-2 space-y-2">
        <IjtimoiyQator icon={<TelegramIkonka size={16} />} rang="bg-[#E7F3FB] text-[#229ED9]" qiymat={ijtimoiy.telegram} />
        <IjtimoiyQator icon={<WhatsappIkonka size={16} />} rang="bg-[#E6F6EC] text-[#25D366]" qiymat={ijtimoiy.whatsapp} />
        <IjtimoiyQator icon={<InstagramIkonka size={16} />} rang="bg-[#FCE9F1] text-[#E1306C]" qiymat={ijtimoiy.instagram} />
      </dd>
    </div>
  );
}

function IjtimoiyQator({ icon, rang, qiymat }: { icon: React.ReactNode; rang: string; qiymat: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${qiymat ? rang : "bg-slate-100 text-slate-300"}`}>
        {icon}
      </span>
      <span className={`text-sm font-semibold ${qiymat ? "text-slate-800" : "text-slate-400"}`}>
        {qiymat || "Kiritilmagan"}
      </span>
    </div>
  );
}
