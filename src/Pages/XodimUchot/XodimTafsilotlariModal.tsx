import { useMemo, useState } from "react";
import {
  Briefcase,
  Building2,
  CalendarDays,
  MapPin,
  Network,
  Phone,
  Trash2,
  Wallet,
} from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import FaoliyatPaneli, { type FaoliyatTuri, type FaoliyatYozuvi } from "../XaridorUchot/FaoliyatPaneli";
import TezkorPanel from "../XaridorUchot/TezkorPanel";
import { TarixTab, VakolatlarTab } from "./XodimTablari";
import type { Bolim, Lavozim, TarixTuri, Xodim, XodimTarixi } from "./types";
import {
  holatMatni,
  holatRangi,
  lavozimNomi,
  sanaFormat,
  summaFormat,
  xodimNomi,
} from "./yordamchilar";

type Tab = "Ma'lumotlar" | "Vakolatlar" | "Tarix";

const tablar: Tab[] = ["Ma'lumotlar", "Vakolatlar", "Tarix"];

type Props = {
  xodim: Xodim;
  lavozimlar: Lavozim[];
  bolimlar?: Bolim[]; // bo'lim nomini ko'rsatish uchun
  tarix: XodimTarixi[];
  onTahrirlash: () => void;
  onOchirish?: () => void;
  onYopish: () => void;
};

export default function XodimTafsilotlariModal({
  xodim,
  lavozimlar,
  bolimlar = [],
  tarix,
  onTahrirlash,
  onOchirish,
  onYopish,
}: Props) {
  const [faolTab, setFaolTab] = useState<Tab>("Ma'lumotlar");

  const xodimTarixi = useMemo(
    () =>
      tarix
        .filter((yozuv) => yozuv.xodimId === xodim.id)
        .sort((a, b) => new Date(b.sana).getTime() - new Date(a.sana).getTime()),
    [tarix, xodim.id]
  );

  return (
    <AppModal className="items-start justify-start bg-[rgba(54,22,8,.50)] p-0 py-4 pl-[88px] pr-4 backdrop-blur-[3px]">
      <div className="relative h-[calc(100vh-32px)] w-full">
        <TezkorPanel
          havolaId={xodim.id}
          faylNomi={`xodim-${xodim.id}`}
          malumot={xodim}
          onYopish={onYopish}
        />

        <section className="relative h-full w-full overflow-hidden rounded-l-[46px] rounded-r-[36px] bg-gradient-to-br from-[#FFF8EF] via-[#FFFDF9] to-[#FFE8D2] text-[#253044] shadow-[0_34px_120px_rgba(92,38,8,.42)] ring-1 ring-white/80">
          <div className="scrollbar-orange h-full overflow-y-auto">
            <header className="sticky top-0 z-30 border-b border-orange-100/80 bg-[#FFF8EF]/90 px-9 py-6 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <h1 className="truncate text-2xl font-bold text-slate-900">{xodimNomi(xodim)}</h1>
                  <span
                    className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-black ${holatRangi[xodim.holat]}`}
                  >
                    {holatMatni[xodim.holat]}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-2">
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
              <MalumotlarTab
                xodim={xodim}
                lavozimlar={lavozimlar}
                bolimlar={bolimlar}
                tarix={xodimTarixi}
              />
            )}
            {faolTab === "Vakolatlar" && <VakolatlarTab xodim={xodim} lavozimlar={lavozimlar} />}
            {faolTab === "Tarix" && <TarixTab tarix={xodimTarixi} />}
          </div>
        </section>
      </div>
    </AppModal>
  );
}

// Tarix turini faoliyat paneli turiga moslash.
const tarixTuriga: Record<TarixTuri, FaoliyatTuri> = {
  ozgarish: "ozgarish",
  izoh: "izoh",
  davomat: "ish",
  vakolat: "ozgarish",
};

function MalumotlarTab({
  xodim,
  lavozimlar,
  bolimlar,
  tarix,
}: {
  xodim: Xodim;
  lavozimlar: Lavozim[];
  bolimlar: Bolim[];
  tarix: XodimTarixi[];
}) {
  const bolim = bolimlar.find((item) => item.id === xodim.bolimId);
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
              Xodim haqida
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
                {xodim.telefonlar.length === 0 && (
                  <p className="text-base font-semibold text-slate-800">—</p>
                )}
                {xodim.telefonlar.map((telefon) => (
                  <p key={telefon} className="text-base font-semibold text-slate-800">
                    {telefon}
                  </p>
                ))}
              </dd>
            </div>

            <Qator nom="Login" qiymat={xodim.login || "Kiritilmagan"} />
            <Qator
              icon={<Briefcase size={14} />}
              nom="Lavozim"
              qiymat={lavozimNomi(lavozimlar, xodim.lavozimId) || "Biriktirilmagan"}
            />
            <Qator
              icon={<Network size={14} />}
              nom="Bo'lim"
              qiymat={bolim?.nomi ?? "Biriktirilmagan"}
            />
            <Qator
              icon={<Building2 size={14} />}
              nom="Filial"
              qiymat={xodim.filial || "Biriktirilmagan"}
            />
            <Qator icon={<MapPin size={14} />} nom="Manzil" qiymat={xodim.manzil || "Kiritilmagan"} />
            <Qator
              icon={<Wallet size={14} />}
              nom="Oylik"
              qiymat={xodim.oylik ? summaFormat(xodim.oylik) : "Kiritilmagan"}
            />
            <Qator
              icon={<CalendarDays size={14} />}
              nom="Ishga kirgan sana"
              qiymat={sanaFormat(xodim.ishBoshlaganSana)}
            />
            <Qator nom="Izoh" qiymat={xodim.izoh || "Yo'q"} />
          </dl>
        </section>

        <section className="rounded-[26px] bg-white/92 p-6 shadow-[0_18px_46px_rgba(255,106,0,.08)] ring-1 ring-orange-100/80">
          <div className="border-b border-orange-100/80 pb-3">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-600">
              Qo'shimcha ma'lumotlar
            </h2>
          </div>
          <dl className="mt-5 space-y-4">
            <Qator nom="Yaratgan mas'ul shaxs" qiymat={xodim.yaratganMasul} />
            <Qator nom="Yaratilgan sana" qiymat={sanaFormat(xodim.yaratilganSana)} />
            <Qator nom="O'zgartirgan mas'ul shaxs" qiymat={xodim.ozgartirganMasul} />
            <Qator nom="O'zgartirilgan sana" qiymat={sanaFormat(xodim.ozgartirilganSana)} />
          </dl>
        </section>
      </div>

      <FaoliyatPaneli boshlangichYozuvlar={faoliyatYozuvlari} />
    </div>
  );
}

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
