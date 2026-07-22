import { useMemo, useState, type FormEvent } from "react";
import {
  Briefcase,
  CalendarDays,
  MapPin,
  Network,
  Phone,
  Plus,
  Trash2,
  UserRound,
  Wallet,
} from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import FaoliyatPaneli from "../XaridorUchot/FaoliyatPaneli";
import TezkorPanel from "../XaridorUchot/TezkorPanel";
import { TarixTab } from "./XodimTablari";
import { backendVakolatlar } from "./backendMetadata";
import type { Bolim, Lavozim, Xodim, XodimHolati, XodimTarixi } from "./types";
import { bugun, holatMatni, maydonKlass, xodimNomi, yangiId } from "./yordamchilar";

const malumotTablari = ["Ma'lumotlar", "Vakolatlar", "Tarix"] as const;
type MalumotTab = (typeof malumotTablari)[number];

const holatlar: XodimHolati[] = ["faol", "tatilda", "ishdan-ketgan"];

type Props = {
  boshlangich: Xodim | null;
  lavozimlar: Lavozim[];
  bolimlar?: Bolim[]; // bo'lim tanlash uchun
  tarix?: XodimTarixi[];
  onYopish: () => void;
  onSaqlash: (xodim: Xodim) => void;
};

export default function XodimFormaModal({
  boshlangich,
  lavozimlar,
  bolimlar = [],
  tarix = [],
  onYopish,
  onSaqlash,
}: Props) {
  const [ism, setIsm] = useState(boshlangich?.ism ?? "");
  const [familiya, setFamiliya] = useState(boshlangich?.familiya ?? "");
  const [telefonlar, setTelefonlar] = useState<string[]>(
    boshlangich?.telefonlar.length ? boshlangich.telefonlar : [""]
  );
  const [login, setLogin] = useState(boshlangich?.login ?? "");
  const [parol, setParol] = useState("");
  const [lavozimId, setLavozimId] = useState(boshlangich?.lavozimId ?? "");
  const [bolimId, setBolimId] = useState(boshlangich?.bolimId ?? "");
  const [filial, setFilial] = useState(boshlangich?.filial ?? "");
  const [manzil, setManzil] = useState(boshlangich?.manzil ?? "");
  const [ishBoshlaganSana, setIshBoshlaganSana] = useState(boshlangich?.ishBoshlaganSana ?? bugun());
  const [oylik, setOylik] = useState(String(boshlangich?.oylik ?? ""));
  const [holat, setHolat] = useState<XodimHolati>(boshlangich?.holat ?? "faol");
  const [izoh, setIzoh] = useState(boshlangich?.izoh ?? "");
  const [vakolatlar, setVakolatlar] = useState<Set<string>>(
    () => new Set(boshlangich?.vakolatlar ?? [])
  );
  const [xato, setXato] = useState("");
  const [faolTab, setFaolTab] = useState<MalumotTab>("Ma'lumotlar");

  const lavozim = lavozimlar.find((item) => item.id === lavozimId);
  const lavozimVakolatlari = useMemo(
    () => new Set(lavozim?.vakolatlar ?? []),
    [lavozim]
  );

  const xodimTarixi = useMemo(
    () =>
      tarix
        .filter((yozuv) => yozuv.xodimId === boshlangich?.id)
        .sort((a, b) => new Date(b.sana).getTime() - new Date(a.sana).getTime()),
    [tarix, boshlangich?.id]
  );

  function telefonYangilash(index: number, qiymat: string) {
    setTelefonlar((joriy) => joriy.map((telefon, i) => (i === index ? qiymat : telefon)));
  }

  function telefonOchirish(index: number) {
    setTelefonlar((joriy) => (joriy.length === 1 ? [""] : joriy.filter((_, i) => i !== index)));
  }

  function vakolatToggle(kod: string) {
    setVakolatlar((oldingi) => {
      const yangi = new Set(oldingi);
      if (yangi.has(kod)) yangi.delete(kod);
      else yangi.add(kod);
      return yangi;
    });
  }

  function saqlash(event: FormEvent) {
    event.preventDefault();

    const tozaTelefonlar = telefonlar.map((telefon) => telefon.trim()).filter(Boolean);

    if (!ism.trim() || !familiya.trim() || !login.trim() || tozaTelefonlar.length === 0 || (!boshlangich && !parol.trim())) {
      setXato("Ism, familiya, login, telefon va yangi xodim uchun parol to'ldirilishi shart.");
      return;
    }

    onSaqlash({
      id: boshlangich?.id ?? yangiId("xod"),
      ism: ism.trim(),
      familiya: familiya.trim(),
      telefonlar: tozaTelefonlar,
      login: login.trim(),
      parol: parol.trim() || undefined,
      lavozimId,
      bolimId,
      filial,
      manzil: manzil.trim(),
      ishBoshlaganSana,
      oylik: Number(oylik) || 0,
      holat,
      izoh: izoh.trim(),
      // Lavozimdan kelgan vakolat shaxsiy ro'yxatda takrorlanmaydi.
      vakolatlar: [...vakolatlar].filter((kod) => !lavozimVakolatlari.has(kod)),
      yaratganMasul: boshlangich?.yaratganMasul ?? "Administrator",
      yaratilganSana: boshlangich?.yaratilganSana ?? bugun(),
      ozgartirilganSana: bugun(),
      ozgartirganMasul: "Administrator",
    });
  }

  const guruhlar = [...new Set(backendVakolatlar.map((vakolat) => vakolat.guruh))];

  return (
    <AppModal className="items-start justify-start bg-[rgba(54,22,8,.50)] p-0 py-4 pl-[88px] pr-4 backdrop-blur-[3px]">
      <div className="relative h-[calc(100vh-32px)] w-full">
        <TezkorPanel
          havolaId={boshlangich?.id ?? "yangi"}
          faylNomi={`xodim-${boshlangich?.id ?? "yangi"}`}
          malumot={boshlangich ?? { ism, familiya, telefonlar }}
          onYopish={onYopish}
        />

        <form
          onSubmit={saqlash}
          className="relative flex h-full w-full flex-col overflow-hidden rounded-l-[46px] rounded-r-[36px] bg-gradient-to-br from-[#FFF8EF] via-[#FFFDF9] to-[#FFE8D2] text-[#253044] shadow-[0_34px_120px_rgba(92,38,8,.42)] ring-1 ring-white/80"
        >
          <header className="border-b border-orange-100/80 bg-[#FFF8EF]/90 px-9 py-6 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#FFF3E2] text-[#FF6A00]">
                <UserRound size={22} />
              </span>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {boshlangich ? "Xodimni tahrirlash" : "Yangi xodim"}
                </h1>
                <span className="text-xs font-black uppercase tracking-wider text-[#FF6A00]">
                  Xodim ma'lumotlari
                </span>
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
                            placeholder="To'xtayev"
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
                            onClick={() => setTelefonlar((joriy) => [...joriy, ""])}
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
                            placeholder="Toshkent sh., Chilonzor tumani"
                            className="min-h-24 w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
                          />
                        </label>
                      </div>
                    </section>

                    <section className="rounded-[26px] bg-white/92 p-6 shadow-[0_18px_46px_rgba(255,106,0,.08)] ring-1 ring-orange-100/80">
                      <h2 className="border-b border-orange-100/80 pb-3 text-sm font-black uppercase tracking-wide text-slate-600">
                        Ish ma'lumotlari
                      </h2>

                      <div className="mt-5 space-y-4">
                        <label className="grid gap-2">
                          <span className="text-sm font-bold text-slate-400">Login *</span>
                          <input
                            value={login}
                            onChange={(event) => setLogin(event.target.value)}
                            placeholder="sardor.t"
                            autoComplete="off"
                            className={maydonKlass}
                          />
                        </label>

                        <label className="grid gap-2">
                          <span className="text-sm font-bold text-slate-400">
                            {boshlangich ? "Yangi parol (ixtiyoriy)" : "Parol *"}
                          </span>
                          <input
                            type="password"
                            value={parol}
                            onChange={(event) => setParol(event.target.value)}
                            autoComplete="new-password"
                            className={maydonKlass}
                          />
                        </label>

                        <label className="grid gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                            <Briefcase size={14} className="text-[#FF6A00]" />
                            Lavozim
                          </span>
                          <select
                            value={lavozimId}
                            onChange={(event) => setLavozimId(event.target.value)}
                            className={maydonKlass}
                          >
                            <option value="">Biriktirilmagan</option>
                            {lavozimlar.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.nomi}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="grid gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                            <Network size={14} className="text-[#FF6A00]" />
                            Bo'lim
                          </span>
                          <select
                            value={bolimId}
                            onChange={(event) => setBolimId(event.target.value)}
                            className={maydonKlass}
                          >
                            <option value="">Biriktirilmagan</option>
                            {bolimlar.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.nomi}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="grid gap-2">
                          <span className="text-sm font-bold text-slate-400">Filial</span>
                          <select
                            value={filial}
                            onChange={(event) => setFilial(event.target.value)}
                            className={maydonKlass}
                          >
                            <option value="">Biriktirilmagan</option>
                            {bolimlar.map((item) => (
                              <option key={item.id} value={item.nomi}>
                                {item.nomi}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="grid gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                            <Wallet size={14} className="text-[#FF6A00]" />
                            Oylik (so'm)
                          </span>
                          <input
                            type="number"
                            value={oylik}
                            onChange={(event) => setOylik(event.target.value)}
                            placeholder="5000000"
                            className={maydonKlass}
                          />
                        </label>

                        <label className="grid gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                            <CalendarDays size={14} className="text-[#FF6A00]" />
                            Ishga kirgan sana
                          </span>
                          <input
                            type="date"
                            value={ishBoshlaganSana}
                            onChange={(event) => setIshBoshlaganSana(event.target.value)}
                            className={maydonKlass}
                          />
                        </label>

                        <label className="grid gap-2">
                          <span className="text-sm font-bold text-slate-400">Holat</span>
                          <select
                            value={holat}
                            onChange={(event) => setHolat(event.target.value as XodimHolati)}
                            className={maydonKlass}
                          >
                            {holatlar.map((item) => (
                              <option key={item} value={item}>
                                {holatMatni[item]}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="grid gap-2">
                          <span className="text-sm font-bold text-slate-400">Izoh</span>
                          <textarea
                            value={izoh}
                            onChange={(event) => setIzoh(event.target.value)}
                            placeholder="Qo'shimcha ma'lumot"
                            className="min-h-20 w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
                          />
                        </label>
                      </div>
                    </section>
                  </div>

                  <FaoliyatPaneli />
                </div>
              </div>
            )}

            {faolTab === "Vakolatlar" && (
              <div className="space-y-5 px-9 py-7">
                <p className="rounded-2xl bg-white/92 px-5 py-4 text-sm font-semibold text-slate-500 ring-1 ring-orange-100/80">
                  Lavozimdan kelgan vakolatlar avtomatik yoqilgan va o'chirilmaydi. Qo'shimcha
                  vakolatni shu yerdan belgilang.
                </p>

                {guruhlar.map((guruh) => (
                  <section
                    key={guruh}
                    className="rounded-[26px] bg-white/92 p-6 shadow-[0_18px_46px_rgba(255,106,0,.08)] ring-1 ring-orange-100/80"
                  >
                    <h2 className="border-b border-orange-100/80 pb-3 text-sm font-black uppercase tracking-wide text-slate-600">
                      {guruh}
                    </h2>
                    <div className="mt-4 space-y-3">
                            {backendVakolatlar
                        .filter((vakolat) => vakolat.guruh === guruh)
                        .map((vakolat) => {
                          const lavozimda = lavozimVakolatlari.has(vakolat.kod);
                          return (
                            <label
                              key={vakolat.kod}
                              className={`flex items-start gap-3 rounded-xl px-3 py-2.5 transition ${
                                lavozimda ? "bg-emerald-50/60" : "cursor-pointer hover:bg-orange-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={lavozimda || vakolatlar.has(vakolat.kod)}
                                disabled={lavozimda}
                                onChange={() => vakolatToggle(vakolat.kod)}
                                className="mt-1 h-5 w-5 shrink-0 accent-[#FF6A00]"
                              />
                              <span className="min-w-0">
                                <span className="block text-sm font-black text-slate-700">
                                  {vakolat.nom}
                                  {lavozimda && (
                                    <span className="ml-2 rounded-lg bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-600">
                                      Lavozimdan
                                    </span>
                                  )}
                                </span>
                                <span className="mt-0.5 block text-xs font-semibold text-slate-400">
                                  {vakolat.izoh}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                    </div>
                  </section>
                ))}
              </div>
            )}

            {faolTab === "Tarix" && <TarixTab tarix={xodimTarixi} />}
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-orange-100 bg-[#FFF8EF]/90 px-9 py-4 backdrop-blur-xl">
            <span className="truncate text-sm font-bold text-slate-400">
              {boshlangich ? xodimNomi(boshlangich) : "Yangi xodim"}
            </span>
            <div className="flex gap-3">
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
            </div>
          </footer>
        </form>
      </div>
    </AppModal>
  );
}
