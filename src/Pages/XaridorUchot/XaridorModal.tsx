import { useMemo, useState, type FormEvent } from "react";
import {
  Briefcase,
  Building2,
  CalendarDays,
  MapPin,
  Phone,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import FaoliyatPaneli from "./FaoliyatPaneli";
import IjtimoiyTanlov from "./IjtimoiyTanlov";
import Tanlov from "./Tanlov";
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
  boshlangich: Xaridor | null;
  kompaniyalar: XaridorKompaniyasi[];
  savdolar?: XaridorSavdosi[];
  tolovlar?: XaridorTolovi[];
  tarix?: TarixYozuvi[];
  onYopish: () => void;
  onSaqlash: (xaridor: Xaridor) => Promise<void>;
};

export default function XaridorModal({
  boshlangich,
  kompaniyalar,
  savdolar = [],
  tolovlar = [],
  tarix = [],
  onYopish,
  onSaqlash,
}: Props) {
  const [ism, setIsm] = useState(boshlangich?.ism ?? "");
  const [familiya, setFamiliya] = useState(boshlangich?.familiya ?? "");
  const [telefonlar, setTelefonlar] = useState<string[]>(
    boshlangich?.telefonlar.length ? boshlangich.telefonlar : [""]
  );
  const [telegram, setTelegram] = useState(boshlangich?.ijtimoiy.telegram ?? "");
  const [whatsapp, setWhatsapp] = useState(boshlangich?.ijtimoiy.whatsapp ?? "");
  const [instagram, setInstagram] = useState(boshlangich?.ijtimoiy.instagram ?? "");
  const [manzil, setManzil] = useState(boshlangich?.manzil ?? "");
  const [kompaniyaId, setKompaniyaId] = useState(boshlangich?.kompaniyaId ?? "");
  const [lavozim, setLavozim] = useState(boshlangich?.lavozim ?? "");
  const [yaratilganSana, setYaratilganSana] = useState(boshlangich?.yaratilganSana ?? bugun());
  const [xato, setXato] = useState("");
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [faolTab, setFaolTab] = useState<MalumotTab>("Ma'lumotlar");

  const xaridorSavdolari = useMemo(
    () => savdolar.filter((savdo) => savdo.xaridorId === boshlangich?.id),
    [savdolar, boshlangich?.id]
  );
  const xaridorTolovlari = useMemo(
    () => tolovlar.filter((tolov) => tolov.xaridorId === boshlangich?.id),
    [tolovlar, boshlangich?.id]
  );
  const xaridorTarixi = useMemo(
    () =>
      tarix
        .filter((yozuv) => yozuv.xaridorId === boshlangich?.id)
        .sort((a, b) => new Date(b.sana).getTime() - new Date(a.sana).getTime()),
    [tarix, boshlangich?.id]
  );

  function telefonYangilash(index: number, qiymat: string) {
    setTelefonlar((joriy) => joriy.map((telefon, i) => (i === index ? qiymat : telefon)));
  }

  function telefonQoshish() {
    setTelefonlar((joriy) => [...joriy, ""]);
  }

  function telefonOchirish(index: number) {
    setTelefonlar((joriy) => (joriy.length === 1 ? [""] : joriy.filter((_, i) => i !== index)));
  }

  async function saqlash(event: FormEvent) {
    event.preventDefault();

    const tozaTelefonlar = telefonlar.map((telefon) => telefon.trim()).filter(Boolean);

    if (!ism.trim() || !familiya.trim() || tozaTelefonlar.length === 0) {
      setXato("Ism, familiya va kamida bitta telefon to'ldirilishi shart.");
      return;
    }

    setSaqlanmoqda(true);
    try {
      await onSaqlash({
      id: boshlangich?.id ?? yangiId("xrd"),
      ism: ism.trim(),
      familiya: familiya.trim(),
      telefonlar: tozaTelefonlar,
      ijtimoiy: {
        telegram: telegram.trim(),
        whatsapp: whatsapp.trim(),
        instagram: instagram.trim(),
      },
      manzil: manzil.trim(),
      kompaniyaId,
      lavozim: lavozim.trim(),
      balans: boshlangich?.balans ?? 0,
      yaratganMasul: boshlangich?.yaratganMasul ?? "Administrator",
      yaratilganSana,
      ozgartirilganSana: bugun(),
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
          faylNomi={`xaridor-${boshlangich?.id ?? "yangi"}`}
          malumot={boshlangich ?? { ism, familiya, telefonlar }}
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
                  <UserRound size={22} />
                </span>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    {boshlangich ? "Xaridorni tahrirlash" : "Yangi xaridor"}
                  </h1>
                  <span className="text-xs font-black uppercase tracking-wider text-[#FF6A00]">
                    Xaridor ma'lumotlari
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

            {/* Chapda maydonlar, o'ngda faoliyat oqimi — tafsilotlar modalkasidagidek. */}
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-6">
                <section className="rounded-[26px] bg-white/92 p-6 shadow-[0_18px_46px_rgba(255,106,0,.08)] ring-1 ring-orange-100/80">
                  <h2 className="border-b border-orange-100/80 pb-3 text-sm font-black uppercase tracking-wide text-slate-600">
                    Shaxsiy ma'lumotlar
                  </h2>

                  <div className="mt-5 space-y-4">
                    <label className="grid gap-2">
                      <span className="text-sm font-bold text-slate-400">Ism *</span>
                      <input
                        value={ism}
                        onChange={(event) => setIsm(event.target.value)}
                        placeholder="Sardor"
                        className={maydonKlass}
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-bold text-slate-400">Familiya *</span>
                      <input
                        value={familiya}
                        onChange={(event) => setFamiliya(event.target.value)}
                        placeholder="Rahimov"
                        className={maydonKlass}
                      />
                    </label>

                    <div className="grid gap-2">
                      <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                        <Phone size={14} className="text-[#FF6A00]" />
                        Telefon *
                      </span>

                      {telefonlar.map((telefon, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="tel"
                            value={telefon}
                            onChange={(event) => telefonYangilash(index, event.target.value)}
                            placeholder="+998 90 123 45 67"
                            className={maydonKlass}
                          />
                          <button
                            type="button"
                            onClick={() => telefonOchirish(index)}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500 transition hover:bg-red-100"
                            aria-label="Telefonni o'chirish"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={telefonQoshish}
                        className="inline-flex h-10 w-fit items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3.5 text-xs font-black uppercase text-[#FF6A00] transition hover:bg-orange-100"
                      >
                        <Plus size={15} />
                        Telefon qo'shish
                      </button>
                    </div>

                    <label className="grid gap-2">
                      <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                        <MapPin size={14} className="text-[#FF6A00]" />
                        Manzil
                      </span>
                      <textarea
                        value={manzil}
                        onChange={(event) => setManzil(event.target.value)}
                        placeholder="Toshkent sh., Chilonzor tumani, 12-kvartal"
                        className="min-h-24 w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
                      />
                    </label>
                  </div>
                </section>

                <section className="rounded-[26px] bg-white/92 p-6 shadow-[0_18px_46px_rgba(255,106,0,.08)] ring-1 ring-orange-100/80">
                  <h2 className="border-b border-orange-100/80 pb-3 text-sm font-black uppercase tracking-wide text-slate-600">
                    Aloqa va ish
                  </h2>

                  <div className="mt-5 space-y-4">
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
                        <Building2 size={14} className="text-[#FF6A00]" />
                        Kompaniya
                      </span>
                      <Tanlov
                        qiymat={kompaniyaId}
                        onChange={setKompaniyaId}
                        placeholder="Biriktirilmagan"
                        variantlar={[
                          { value: "", label: "Biriktirilmagan" },
                          ...kompaniyalar.map((kompaniya) => ({
                            value: kompaniya.id,
                            label: kompaniya.nomi,
                          })),
                        ]}
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
                        placeholder="Bo'lim boshlig'i"
                        className={maydonKlass}
                      />
                    </label>

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

              <FaoliyatPaneli customerId={boshlangich?.id} />
            </div>
            </div>
            )}

            {faolTab === "Savdolar" && (
              <SavdolarTab
                savdolar={xaridorSavdolari}
                xaridorNomi={boshlangich ? xaridorNomi(boshlangich) : ""}
                xaridorOlish={() => boshlangich ?? undefined}
              />
            )}
            {faolTab === "To'lovlar" && <TolovlarTab tolovlar={xaridorTolovlari} />}
            {faolTab === "Tarix" && <TarixTab tarix={xaridorTarixi} />}
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
