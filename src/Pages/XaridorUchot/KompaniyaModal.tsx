import { useMemo, useState, type FormEvent } from "react";
import { Briefcase, Building2, CalendarDays, Hash, Phone, UserRound } from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import FaoliyatPaneli from "./FaoliyatPaneli";
import IjtimoiyTanlov from "./IjtimoiyTanlov";
import TezkorPanel from "./TezkorPanel";
import { SavdolarTab, TarixTab, TolovlarTab } from "./XaridorTablari";
import type {
  TarixYozuvi,
  Xaridor,
  XaridorKompaniyasi,
  XaridorSavdosi,
  XaridorTolovi,
} from "./types";
import { bugun, maydonKlass, xaridorNomi, yangiId } from "./yordamchilar";

const malumotTablari = ["Ma'lumotlar", "Savdolar", "To'lovlar", "Tarix"] as const;
type MalumotTab = (typeof malumotTablari)[number];

type Props = {
  boshlangich: XaridorKompaniyasi | null;
  xaridorlar?: Xaridor[];
  savdolar?: XaridorSavdosi[];
  tolovlar?: XaridorTolovi[];
  tarix?: TarixYozuvi[];
  onYopish: () => void;
  onSaqlash: (kompaniya: XaridorKompaniyasi) => void;
};

export default function KompaniyaModal({
  boshlangich,
  xaridorlar = [],
  savdolar = [],
  tolovlar = [],
  tarix = [],
  onYopish,
  onSaqlash,
}: Props) {
  const [nomi, setNomi] = useState(boshlangich?.nomi ?? "");
  const [stir, setStir] = useState(boshlangich?.stir ?? "");
  const [telefon, setTelefon] = useState(boshlangich?.telefon ?? "");
  const [aloqaShaxsi, setAloqaShaxsi] = useState(boshlangich?.aloqaShaxsi ?? "");
  const [aloqaTelefoni, setAloqaTelefoni] = useState(boshlangich?.aloqaTelefoni ?? "");
  const [lavozim, setLavozim] = useState(boshlangich?.lavozim ?? "");
  const [telegram, setTelegram] = useState(boshlangich?.ijtimoiy.telegram ?? "");
  const [whatsapp, setWhatsapp] = useState(boshlangich?.ijtimoiy.whatsapp ?? "");
  const [instagram, setInstagram] = useState(boshlangich?.ijtimoiy.instagram ?? "");
  const [yaratilganSana, setYaratilganSana] = useState(boshlangich?.yaratilganSana ?? bugun());
  const [xato, setXato] = useState("");
  const [faolTab, setFaolTab] = useState<MalumotTab>("Ma'lumotlar");

  // Kompaniyaning savdolari/to'lovlari/tarixi — unga biriktirilgan xaridorlarники.
  const xaridorIdlar = useMemo(
    () =>
      new Set(
        xaridorlar
          .filter((xaridor) => xaridor.kompaniyaId === boshlangich?.id)
          .map((xaridor) => xaridor.id)
      ),
    [xaridorlar, boshlangich?.id]
  );

  const kompaniyaSavdolari = useMemo(
    () => savdolar.filter((savdo) => xaridorIdlar.has(savdo.xaridorId)),
    [savdolar, xaridorIdlar]
  );
  const kompaniyaTolovlari = useMemo(
    () => tolovlar.filter((tolov) => xaridorIdlar.has(tolov.xaridorId)),
    [tolovlar, xaridorIdlar]
  );
  const kompaniyaTarixi = useMemo(
    () =>
      tarix
        .filter((yozuv) => xaridorIdlar.has(yozuv.xaridorId))
        .sort((a, b) => new Date(b.sana).getTime() - new Date(a.sana).getTime()),
    [tarix, xaridorIdlar]
  );

  function savdoXaridori(savdo: XaridorSavdosi) {
    const xaridor = xaridorlar.find((item) => item.id === savdo.xaridorId);
    return xaridor ? xaridorNomi(xaridor) : "—";
  }

  function saqlash(event: FormEvent) {
    event.preventDefault();

    if (!nomi.trim()) {
      setXato("Kompaniya nomi to'ldirilishi shart.");
      return;
    }

    onSaqlash({
      id: boshlangich?.id ?? yangiId("kmp"),
      nomi: nomi.trim(),
      stir: stir.trim(),
      telefon: telefon.trim(),
      aloqaShaxsi: aloqaShaxsi.trim(),
      aloqaTelefoni: aloqaTelefoni.trim(),
      lavozim: lavozim.trim(),
      ijtimoiy: {
        telegram: telegram.trim(),
        whatsapp: whatsapp.trim(),
        instagram: instagram.trim(),
      },
      yaratganMasul: boshlangich?.yaratganMasul ?? "Administrator",
      yaratilganSana,
      ozgartirilganSana: bugun(),
      ozgartirganMasul: "Administrator",
    });
  }

  return (
    <AppModal className="items-start justify-start bg-[rgba(54,22,8,.50)] p-0 py-4 pl-[88px] pr-4 backdrop-blur-[3px]">
      <div className="relative h-[calc(100vh-32px)] w-full">
        <TezkorPanel
          havolaId={boshlangich?.id ?? "yangi"}
          faylNomi={`kompaniya-${boshlangich?.id ?? "yangi"}`}
          malumot={boshlangich ?? { nomi, stir, telefon }}
          onYopish={onYopish}
        />

        <form
          onSubmit={saqlash}
          className="relative flex h-full w-full flex-col overflow-hidden rounded-l-[46px] rounded-r-[36px] bg-gradient-to-br from-[#FFF8EF] via-[#FFFDF9] to-[#FFE8D2] text-[#253044] shadow-[0_34px_120px_rgba(92,38,8,.42)] ring-1 ring-white/80"
        >
          <header className="border-b border-orange-100/80 bg-[#FFF8EF]/90 px-9 py-6 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#FFF3E2] text-[#FF6A00]">
                  <Building2 size={22} />
                </span>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    {boshlangich ? "Kompaniyani tahrirlash" : "Yangi kompaniya"}
                  </h1>
                  <span className="text-xs font-black uppercase tracking-wider text-[#FF6A00]">
                    Kompaniya ma'lumotlari
                  </span>
                </div>
              </div>
            </div>

            <nav className="mt-6 flex items-center gap-3 overflow-x-auto">
              {malumotTablari.map((tab) => (
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

          <div className="scrollbar-orange flex-1 overflow-y-auto">
            {faolTab === "Ma'lumotlar" && (
              <div className="px-9 py-7">
                {xato && (
                  <p className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                    {xato}
                  </p>
                )}

                {/* Chapda maydonlar, o'ngda faoliyat oqimi — xaridor modalidagidek. */}
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="space-y-6">
                    <section className="rounded-[26px] bg-white/92 p-6 shadow-[0_18px_46px_rgba(255,106,0,.08)] ring-1 ring-orange-100/80">
                      <h2 className="border-b border-orange-100/80 pb-3 text-sm font-black uppercase tracking-wide text-slate-600">
                        Kompaniya ma'lumotlari
                      </h2>

                      <div className="mt-5 space-y-4">
                        <label className="grid gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                            <Building2 size={14} className="text-[#FF6A00]" />
                            Kompaniya nomi *
                          </span>
                          <input
                            value={nomi}
                            onChange={(event) => setNomi(event.target.value)}
                            placeholder="Oq Yo'l Savdo MChJ"
                            className={maydonKlass}
                          />
                        </label>

                        <label className="grid gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                            <Hash size={14} className="text-[#FF6A00]" />
                            STIR
                          </span>
                          <input
                            value={stir}
                            onChange={(event) => setStir(event.target.value)}
                            placeholder="301234567"
                            className={maydonKlass}
                          />
                        </label>

                        <label className="grid gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                            <Phone size={14} className="text-[#FF6A00]" />
                            Telefon
                          </span>
                          <input
                            type="tel"
                            value={telefon}
                            onChange={(event) => setTelefon(event.target.value)}
                            placeholder="+998 71 200 10 10"
                            className={maydonKlass}
                          />
                        </label>

                        <label className="grid gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                            <UserRound size={14} className="text-[#FF6A00]" />
                            Xaridor ulangan shaxs
                          </span>
                          <input
                            value={aloqaShaxsi}
                            onChange={(event) => setAloqaShaxsi(event.target.value)}
                            placeholder="Sardor Rahimov"
                            className={maydonKlass}
                          />
                        </label>

                        <label className="grid gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                            <Phone size={14} className="text-[#FF6A00]" />
                            Xaridor tel raqami
                          </span>
                          <input
                            type="tel"
                            value={aloqaTelefoni}
                            onChange={(event) => setAloqaTelefoni(event.target.value)}
                            placeholder="+998 90 123 45 67"
                            className={maydonKlass}
                          />
                        </label>

                        <label className="grid gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                            <Briefcase size={14} className="text-[#FF6A00]" />
                            Lavozim
                          </span>
                          <input
                            value={lavozim}
                            onChange={(event) => setLavozim(event.target.value)}
                            placeholder="Ta'minot bo'limi boshlig'i"
                            className={maydonKlass}
                          />
                        </label>

                        <IjtimoiyTanlov
                          qiymatlar={{ telegram, whatsapp, instagram }}
                          onChange={(tarmoq, qiymat) => {
                            if (tarmoq === "telegram") setTelegram(qiymat);
                            else if (tarmoq === "whatsapp") setWhatsapp(qiymat);
                            else setInstagram(qiymat);
                          }}
                        />

                        <label className="grid gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                            <CalendarDays size={14} className="text-[#FF6A00]" />
                            Ro'yxatga olingan sana
                          </span>
                          <input
                            type="date"
                            value={yaratilganSana}
                            onChange={(event) => setYaratilganSana(event.target.value)}
                            className={maydonKlass}
                          />
                        </label>
                      </div>
                    </section>
                  </div>

                  <FaoliyatPaneli />
                </div>
              </div>
            )}

            {faolTab === "Savdolar" && (
              <SavdolarTab
                savdolar={kompaniyaSavdolari}
                xaridorNomiOlish={savdoXaridori}
                xaridorOlish={(savdo) =>
                  xaridorlar.find((xaridor) => xaridor.id === savdo.xaridorId)
                }
              />
            )}
            {faolTab === "To'lovlar" && <TolovlarTab tolovlar={kompaniyaTolovlari} />}
            {faolTab === "Tarix" && <TarixTab tarix={kompaniyaTarixi} />}
          </div>

          <footer className="flex justify-end gap-3 border-t border-orange-100 bg-[#FFF8EF]/90 px-9 py-4 backdrop-blur-xl">
            <button
              type="button"
              onClick={onYopish}
              className="rounded-2xl bg-slate-100 px-5 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-200"
            >
              Bekor qilish
            </button>
            <button className="rounded-2xl bg-[#FF6A00] px-6 py-2.5 text-sm font-black text-white shadow-[0_14px_32px_rgba(255,106,0,.24)] transition hover:-translate-y-0.5 hover:bg-[#EA580C]">
              Saqlash
            </button>
          </footer>
        </form>
      </div>
    </AppModal>
  );
}
