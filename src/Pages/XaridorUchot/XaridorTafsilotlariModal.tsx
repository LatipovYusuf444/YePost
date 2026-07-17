import { useMemo, useState } from "react";
import { Briefcase, Building2, ChevronDown, Phone, Trash2 } from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import FaoliyatPaneli, { type FaoliyatTuri, type FaoliyatYozuvi } from "./FaoliyatPaneli";
import { InstagramIkonka, TelegramIkonka, WhatsappIkonka } from "./IjtimoiyIkonkalar";
import TezkorPanel from "./TezkorPanel";
import { SavdolarTab, TarixTab, TolovlarTab } from "./XaridorTablari";
import type {
  TarixYozuvi,
  Xaridor,
  XaridorKompaniyasi,
  XaridorSavdosi,
  XaridorTolovi,
} from "./types";
import { kompaniyaNomi, sanaFormat, xaridorNomi } from "./yordamchilar";

type Tab = "Ma'lumotlar" | "Savdolar" | "To'lovlar" | "Tarix";

const tablar: Tab[] = ["Ma'lumotlar", "Savdolar", "To'lovlar", "Tarix"];

type Props = {
  xaridor: Xaridor;
  kompaniyalar: XaridorKompaniyasi[];
  savdolar: XaridorSavdosi[];
  tolovlar: XaridorTolovi[];
  tarix: TarixYozuvi[];
  onTahrirlash: () => void;
  onOchirish?: () => void;
  onYopish: () => void;
};

export default function XaridorTafsilotlariModal({
  xaridor,
  kompaniyalar,
  savdolar,
  tolovlar,
  tarix,
  onTahrirlash,
  onOchirish,
  onYopish,
}: Props) {
  const [faolTab, setFaolTab] = useState<Tab>("Ma'lumotlar");

  const xaridorSavdolari = useMemo(
    () => savdolar.filter((savdo) => savdo.xaridorId === xaridor.id),
    [savdolar, xaridor.id]
  );
  const xaridorTolovlari = useMemo(
    () => tolovlar.filter((tolov) => tolov.xaridorId === xaridor.id),
    [tolovlar, xaridor.id]
  );
  const xaridorTarixi = useMemo(
    () =>
      tarix
        .filter((yozuv) => yozuv.xaridorId === xaridor.id)
        .sort((a, b) => new Date(b.sana).getTime() - new Date(a.sana).getTime()),
    [tarix, xaridor.id]
  );

  return (
    <AppModal className="items-start justify-start bg-[rgba(54,22,8,.50)] p-0 py-4 pl-[88px] pr-4 backdrop-blur-[3px]">
      <div className="relative h-[calc(100vh-32px)] w-full">
        <TezkorPanel
          havolaId={xaridor.id}
          faylNomi={`xaridor-${xaridor.id}`}
          malumot={xaridor}
          onYopish={onYopish}
        />

        <section className="relative h-full w-full overflow-hidden rounded-l-[46px] rounded-r-[36px] bg-gradient-to-br from-[#FFF8EF] via-[#FFFDF9] to-[#FFE8D2] text-[#253044] shadow-[0_34px_120px_rgba(92,38,8,.42)] ring-1 ring-white/80">
          <div className="scrollbar-orange h-full overflow-y-auto">
            <header className="sticky top-0 z-30 border-b border-orange-100/80 bg-[#FFF8EF]/90 px-9 py-6 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <h1 className="truncate text-2xl font-bold text-slate-900">
                  {xaridorNomi(xaridor)}
                </h1>

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
              <MalumotlarTab xaridor={xaridor} kompaniyalar={kompaniyalar} tarix={xaridorTarixi} />
            )}
            {faolTab === "Savdolar" && (
              <SavdolarTab
                savdolar={xaridorSavdolari}
                xaridorNomi={xaridorNomi(xaridor)}
                xaridorOlish={() => xaridor}
              />
            )}
            {faolTab === "To'lovlar" && <TolovlarTab tolovlar={xaridorTolovlari} />}
            {faolTab === "Tarix" && <TarixTab tarix={xaridorTarixi} />}
          </div>
        </section>
      </div>
    </AppModal>
  );
}

function MalumotlarTab({
  xaridor,
  kompaniyalar,
  tarix,
}: {
  xaridor: Xaridor;
  kompaniyalar: XaridorKompaniyasi[];
  tarix: TarixYozuvi[];
}) {
  // Tarix yozuvlari faoliyat oqimiga aylantiriladi.
  const faoliyatYozuvlari: FaoliyatYozuvi[] = tarix.map((yozuv) => ({
    id: yozuv.id,
    turi: tarixTuriga[yozuv.turi],
    sarlavha: yozuv.sarlavha,
    matn: yozuv.matn,
    sana: yozuv.sana,
  }));

  return (
    <div className="grid gap-6 px-9 py-7 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-5">
        <section className="rounded-[26px] bg-white/92 p-6 shadow-[0_18px_46px_rgba(255,106,0,.08)] ring-1 ring-orange-100/80">
          <div className="border-b border-orange-100/80 pb-3">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-600">
              Xaridor haqida
            </h2>
          </div>

          <dl className="mt-5 space-y-4">
            <div>
              <dt className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                <span className="text-[#FF6A00]">
                  <Phone size={14} />
                </span>
                Telefon
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
              <dt className="text-sm font-bold text-slate-400">Ijtimoiy tarmoqlar</dt>
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

            <Qator nom="Manzil" qiymat={xaridor.manzil || "Kiritilmagan"} />
            <Qator
              icon={<Building2 size={14} />}
              nom="Kompaniya"
              qiymat={kompaniyaNomi(kompaniyalar, xaridor.kompaniyaId) || "Biriktirilmagan"}
            />
            <Qator
              icon={<Briefcase size={14} />}
              nom="Lavozim"
              qiymat={xaridor.lavozim || "Kiritilmagan"}
            />
            <Qator nom="Ro'yxatga olingan sana" qiymat={sanaFormat(xaridor.yaratilganSana)} />
          </dl>
        </section>
      </div>

      <FaoliyatPaneli boshlangichYozuvlar={faoliyatYozuvlari} />
    </div>
  );
}

// Tarix turini faoliyat paneli turiga moslash.
const tarixTuriga: Record<TarixYozuvi["turi"], FaoliyatTuri> = {
  savdo: "ish",
  tolov: "tolov",
  izoh: "izoh",
  ozgarish: "ozgarish",
};

function Qator({
  icon,
  nom,
  qiymat,
}: {
  icon?: React.ReactNode;
  nom: string;
  qiymat: string;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
        {icon && <span className="text-[#FF6A00]">{icon}</span>}
        {nom}
      </dt>
      <dd className="mt-0.5 text-base font-semibold text-slate-800">{qiymat}</dd>
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
        {qiymat || "Kiritilmagan"}
      </span>
    </div>
  );
}
