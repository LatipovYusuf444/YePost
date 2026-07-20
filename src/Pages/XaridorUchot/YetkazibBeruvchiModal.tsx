import { useMemo, useState, type FormEvent } from "react";
import { Briefcase, Building2, CalendarDays, Hash, Phone, Truck, UserRound } from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import FaoliyatPaneli from "./FaoliyatPaneli";
import IjtimoiyTanlov from "./IjtimoiyTanlov";
import TezkorPanel from "./TezkorPanel";
import { KirimTab, TarixTab, TolovlarTab } from "./XaridorTablari";
import type { Kirim, YetkazibBeruvchi } from "./types";
import { bugun, maydonKlass, yangiId } from "./yordamchilar";

const malumotTablari = ["Ma'lumotlar", "Kirim", "To'lovlar", "Tarix"] as const;
type MalumotTab = (typeof malumotTablari)[number];

type Props = {
  boshlangich: YetkazibBeruvchi | null;
  kirimlar: Kirim[];
  onYopish: () => void;
  onSaqlash: (yetkazibBeruvchi: YetkazibBeruvchi) => Promise<void>;
};

export default function YetkazibBeruvchiModal({ boshlangich, kirimlar, onYopish, onSaqlash }: Props) {
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
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [faolTab, setFaolTab] = useState<MalumotTab>("Ma'lumotlar");

  const beruvchiKirimlari = useMemo(
    () => kirimlar.filter((kirim) => kirim.yetkazibBeruvchiId === boshlangich?.id),
    [boshlangich?.id, kirimlar]
  );

  async function saqlash(event: FormEvent) {
    event.preventDefault();

    if (!nomi.trim()) {
      setXato("Yetkazib beruvchi nomi to'ldirilishi shart.");
      return;
    }

    setSaqlanmoqda(true);
    try {
      await onSaqlash({
      id: boshlangich?.id ?? yangiId("ytk"),
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
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setSaqlanmoqda(false);
    }
  }

  return (
    <AppModal className="items-start justify-start bg-[rgba(54,22,8,.50)] p-0 py-4 pl-[88px] pr-4 backdrop-blur-[3px]">
      <div className="relative h-[calc(100vh-32px)] w-full">
        <TezkorPanel
          havolaId={boshlangich?.id ?? "yangi"}
          faylNomi={`yetkazib-beruvchi-${boshlangich?.id ?? "yangi"}`}
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
                  <Truck size={22} />
                </span>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    {boshlangich ? "Yetkazib beruvchini tahrirlash" : "Yangi yetkazib beruvchi"}
                  </h1>
                  <span className="text-xs font-black uppercase tracking-wider text-[#FF6A00]">
                    Yetkazib beruvchi ma'lumotlari
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

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="space-y-6">
                    <section className="rounded-[26px] bg-white/92 p-6 shadow-[0_18px_46px_rgba(255,106,0,.08)] ring-1 ring-orange-100/80">
                      <h2 className="border-b border-orange-100/80 pb-3 text-sm font-black uppercase tracking-wide text-slate-600">
                        Yetkazib beruvchi ma'lumotlari
                      </h2>

                      <div className="mt-5 space-y-4">
                        <label className="grid gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                            <Building2 size={14} className="text-[#FF6A00]" />
                            Nomi *
                          </span>
                          <input
                            value={nomi}
                            onChange={(event) => setNomi(event.target.value)}
                            placeholder="Nestle Uzbekistan"
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
                            placeholder="201112223"
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
                            Aloqa shaxsi
                          </span>
                          <input
                            value={aloqaShaxsi}
                            onChange={(event) => setAloqaShaxsi(event.target.value)}
                            placeholder="Aziz Tursunov"
                            className={maydonKlass}
                          />
                        </label>

                        <label className="grid gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                            <Phone size={14} className="text-[#FF6A00]" />
                            Aloqa tel raqami
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
                            placeholder="Savdo vakili"
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

            {faolTab === "Kirim" && (
              <KirimTab kirimlar={beruvchiKirimlari} beruvchiNomi={nomi || boshlangich?.nomi || "—"} />
            )}
            {faolTab === "To'lovlar" && <TolovlarTab tolovlar={[]} />}
            {faolTab === "Tarix" && <TarixTab tarix={[]} />}
          </div>

          <footer className="flex justify-end gap-3 border-t border-orange-100 bg-[#FFF8EF]/90 px-9 py-4 backdrop-blur-xl">
            <button
              type="button"
              onClick={onYopish}
              className="rounded-2xl bg-slate-100 px-5 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-200"
            >
              Bekor qilish
            </button>
            <button disabled={saqlanmoqda} className="rounded-2xl bg-[#FF6A00] px-6 py-2.5 text-sm font-black text-white shadow-[0_14px_32px_rgba(255,106,0,.24)] transition hover:-translate-y-0.5 hover:bg-[#EA580C] disabled:opacity-50">
              {saqlanmoqda ? "Saqlanmoqda..." : "Saqlash"}
            </button>
          </footer>
        </form>
      </div>
    </AppModal>
  );
}
