import AppSelect from "@/Components/ui/AppSelect";
import { useMemo, useState, type FormEvent } from "react";
import {
  Briefcase,
  CalendarDays,
  Check,
  Lock,
  ShieldCheck,
  MapPin,
  Network,
  Phone,
  Plus,
  Trash2,
  UserRound,
  Wallet,
} from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import PhoneInput from "@/Components/ui/PhoneInput";
import FaoliyatPaneli from "../XaridorUchot/FaoliyatPaneli";
import TezkorPanel from "../XaridorUchot/TezkorPanel";
import { TarixTab } from "./XodimTablari";
import { backendVakolatlar } from "./backendMetadata";
import type { Bolim, Lavozim, Xodim, XodimHolati, XodimTarixi } from "./types";
import { bugun, holatMatni, maydonKlass, xodimNomi, yangiId } from "./yordamchilar";

import AvatarYuklash, { type TanlanganRasm } from "@/Components/common/AvatarYuklash";
import { Checkbox } from "@/Components/ui/checkbox";
import { useAvatarUrl } from "@/store/avatarStore";
import ModalTablari from "@/Components/common/ModalTablari";
const malumotTablari = ["Ma'lumotlar", "Vakolatlar", "Tarix"] as const;
type MalumotTab = (typeof malumotTablari)[number];

const holatlar: XodimHolati[] = ["faol", "tatilda", "ishdan-ketgan"];

type Props = {
  boshlangich: Xodim | null;
  lavozimlar: Lavozim[];
  bolimlar?: Bolim[]; // bo'lim tanlash uchun
  filiallar?: Array<{ id: string; nomi: string }>;
  tarix?: XodimTarixi[];
  onYopish: () => void;
  onSaqlash: (xodim: Xodim) => void;
};

export default function XodimFormaModal({
  boshlangich,
  lavozimlar,
  bolimlar = [],
  filiallar = [],
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
  const [rol, setRol] = useState<Xodim["rol"]>(boshlangich?.rol ?? "CASHIER");
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
  const [tanlanganRasm, setTanlanganRasm] = useState<TanlanganRasm | null>(null);
  const [rasmOlibTashlandi, setRasmOlibTashlandi] = useState(false);
  const mavjudRasm = useAvatarUrl(boshlangich?.id, boshlangich?.rasmUrl);
  const korinadiganRasm = tanlanganRasm?.dataUrl ?? (rasmOlibTashlandi ? "" : mavjudRasm);
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
      rol,
      parol: parol.trim() || undefined,
      lavozimId,
      bolimId,
      filial,
      manzil: manzil.trim(),
      ishBoshlaganSana,
      oylik: oylik.trim() === "" ? null : Number(oylik),
      holat,
      izoh: izoh.trim(),
      // Lavozimdan kelgan vakolat shaxsiy ro'yxatda takrorlanmaydi.
      vakolatlar: [...vakolatlar].filter((kod) => !lavozimVakolatlari.has(kod)),
      yaratganMasul: boshlangich?.yaratganMasul ?? "Administrator",
      yaratilganSana: boshlangich?.yaratilganSana ?? bugun(),
      ozgartirilganSana: bugun(),
      ozgartirganMasul: "Administrator",
      rasmUrl: boshlangich?.rasmUrl,
      rasmFayli: tanlanganRasm,
      rasmOlibTashlash: rasmOlibTashlandi && !tanlanganRasm,
    });
  }

  const guruhlar = [...new Set(backendVakolatlar.map((vakolat) => vakolat.guruh))];
  const lavozimdanSoni = backendVakolatlar.filter((vakolat) => lavozimVakolatlari.has(vakolat.kod)).length;
  const shaxsiySoni = backendVakolatlar.filter((vakolat) => !lavozimVakolatlari.has(vakolat.kod) && vakolatlar.has(vakolat.kod)).length;
  const berilganSoni = lavozimdanSoni + shaxsiySoni;

  function guruhniAlmashtirish(kodlar: string[], yoqish: boolean) {
    setVakolatlar((oldingi) => {
      const yangi = new Set(oldingi);
      kodlar.forEach((kod) => {
        if (yoqish) yangi.add(kod);
        else yangi.delete(kod);
      });
      return yangi;
    });
  }


  return (
    <AppModal className="items-start justify-start bg-[rgba(15,23,42,.50)] p-0 py-4 pl-[88px] pr-4 backdrop-blur-[3px]">
      <div className="relative h-[calc(100vh-32px)] w-full">
        <TezkorPanel
          havolaId={boshlangich?.id ?? "yangi"}
          faylNomi={`xodim-${boshlangich?.id ?? "yangi"}`}
          malumot={boshlangich ?? { ism, familiya, telefonlar }}
          onYopish={onYopish}
        />

        <form
          onSubmit={saqlash}
          className="relative flex h-full w-full flex-col overflow-hidden rounded-l-[46px] rounded-r-[36px] bg-gradient-to-br from-[#F8FAFC] via-[#FFFFFF] to-[#E8EEF7] text-[#253044] shadow-[0_34px_120px_rgba(15,23,42,.42)] ring-1 ring-white/80"
        >
          <header className="border-b border-orange-100/80 bg-[#F8FAFC]/90 px-9 py-6 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#EFF6FF] text-[#2563EB]">
                <UserRound size={22} />
              </span>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {boshlangich ? "Xodimni tahrirlash" : "Yangi xodim"}
                </h1>
                <span className="text-xs font-black uppercase tracking-wider text-[#2563EB]">
                  Xodim ma'lumotlari
                </span>
              </div>
            </div>

            <ModalTablari
                className="mt-6"
                tablar={malumotTablari.map((tab) => ({ id: tab, nom: tab }))}
                faol={faolTab}
                onChange={(id) => setFaolTab(id as typeof faolTab)}
              />
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
                    <section className="rounded-[26px] bg-white/92 p-6 shadow-[0_18px_46px_rgba(37,99,235,.08)] ring-1 ring-orange-100/80">
                      <h2 className="border-b border-orange-100/80 pb-3 text-sm font-black uppercase tracking-wide text-slate-600">
                        Shaxsiy ma'lumotlar
                      </h2>

                      <div className="mt-5 space-y-4">
                        <AvatarYuklash
                          korinadiganRasm={korinadiganRasm}
                          bosHarflar={`${familiya[0] ?? ""}${ism[0] ?? ""}`.toUpperCase() || "?"}
                          onTanlandi={(rasm) => {
                            setTanlanganRasm(rasm);
                            setRasmOlibTashlandi(false);
                          }}
                          onOlibTashlandi={() => {
                            setTanlanganRasm(null);
                            setRasmOlibTashlandi(true);
                          }}
                        />
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
                            <Phone size={14} className="text-[#2563EB]" />
                            Telefon *
                          </span>

                          {telefonlar.map((telefon, index) => (
                            <div key={index} className="flex gap-2">
                              <PhoneInput value={telefon} onChange={(qiymat) => telefonYangilash(index, qiymat)} className="min-w-0 flex-1" />
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
                            className="inline-flex h-10 w-fit items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3.5 text-xs font-black uppercase text-[#2563EB] transition hover:bg-orange-100"
                          >
                            <Plus size={15} />
                            Telefon qo'shish
                          </button>
                        </div>

                        <label className="grid gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                            <MapPin size={14} className="text-[#2563EB]" />
                            Manzil
                          </span>
                          <textarea
                            value={manzil}
                            onChange={(event) => setManzil(event.target.value)}
                            placeholder="Toshkent sh., Chilonzor tumani"
                            className="min-h-24 w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm font-semibold outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-orange-100"
                          />
                        </label>
                      </div>
                    </section>

                    <section className="rounded-[26px] bg-white/92 p-6 shadow-[0_18px_46px_rgba(37,99,235,.08)] ring-1 ring-orange-100/80">
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
                          <span className="text-sm font-bold text-slate-400">Tizim roli</span>
                          <AppSelect
                            value={rol}
                            onChange={(event) => setRol(event.target.value as Xodim["rol"])}
                            className={maydonKlass}
                          >
                            <option value="CASHIER">Kassir</option>
                            <option value="STOREKEEPER">Omborchi</option>
                            <option value="ADMIN">Administrator</option>
                            <option value="DIRECTOR">Direktor</option>
                          </AppSelect>
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
                            <Briefcase size={14} className="text-[#2563EB]" />
                            Lavozim
                          </span>
                          <AppSelect
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
                          </AppSelect>
                        </label>

                        <label className="grid gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                            <Network size={14} className="text-[#2563EB]" />
                            Bo'lim
                          </span>
                          <AppSelect
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
                          </AppSelect>
                        </label>

                        <label className="grid gap-2">
                          <span className="text-sm font-bold text-slate-400">Filial</span>
                          <AppSelect
                            value={filial}
                            onChange={(event) => setFilial(event.target.value)}
                            className={maydonKlass}
                          >
                            <option value="">Biriktirilmagan</option>
                            {filiallar.map((item) => (
                              <option key={item.id} value={item.nomi}>
                                {item.nomi}
                              </option>
                            ))}
                          </AppSelect>
                        </label>

                        <label className="grid gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                            <Wallet size={14} className="text-[#2563EB]" />
                            Oylik (so'm)
                          </span>
                          <div className="relative">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={oylik ? Number(oylik).toLocaleString("ru-RU") : ""}
                              onChange={(event) => setOylik(event.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, ""))}
                              placeholder="5 000 000"
                              className={`${maydonKlass} pr-16`}
                            />
                            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">so'm</span>
                          </div>
                        </label>

                        <label className="grid gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                            <CalendarDays size={14} className="text-[#2563EB]" />
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
                          <AppSelect
                            value={holat}
                            onChange={(event) => setHolat(event.target.value as XodimHolati)}
                            className={maydonKlass}
                          >
                            {holatlar.map((item) => (
                              <option key={item} value={item}>
                                {holatMatni[item]}
                              </option>
                            ))}
                          </AppSelect>
                        </label>

                        <label className="grid gap-2">
                          <span className="text-sm font-bold text-slate-400">Izoh</span>
                          <textarea
                            value={izoh}
                            onChange={(event) => setIzoh(event.target.value)}
                            placeholder="Qo'shimcha ma'lumot"
                            className="min-h-20 w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm font-semibold outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-orange-100"
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
              <div className="space-y-6 px-9 py-7">
                {/* Umumiy holat */}
                <section className="grid gap-5 rounded-[26px] bg-white/92 p-6 shadow-[0_18px_46px_rgba(37,99,235,.08)] ring-1 ring-orange-100/80 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center">
                  <div className="flex items-start gap-4">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB]">
                      <ShieldCheck size={26} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-lg font-black text-slate-900">Xodim vakolatlari</p>
                      <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                        Lavozimdan kelgan vakolatlar avtomatik yoqilgan va o'chirilmaydi. Qo'shimcha vakolatni shu yerdan belgilang.
                      </p>
                    </div>
                  </div>
                  <div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-2xl bg-slate-50 px-3 py-3">
                        <p className="text-2xl font-black text-slate-900">{berilganSoni}</p>
                        <p className="mt-0.5 text-xs font-bold text-slate-400">Jami berilgan</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-3 py-3">
                        <p className="text-2xl font-black text-emerald-600">{lavozimdanSoni}</p>
                        <p className="mt-0.5 text-xs font-bold text-slate-400">Lavozimdan</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-3 py-3">
                        <p className="text-2xl font-black text-[#2563EB]">{shaxsiySoni}</p>
                        <p className="mt-0.5 text-xs font-bold text-slate-400">Shaxsiy</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[#2563EB] transition-all duration-500"
                          style={{ width: `${backendVakolatlar.length ? Math.round((berilganSoni / backendVakolatlar.length) * 100) : 0}%` }}
                        />
                      </div>
                      <span className="text-xs font-black text-slate-500">{berilganSoni}/{backendVakolatlar.length}</span>
                    </div>
                  </div>
                </section>

                <div className="grid gap-5 xl:grid-cols-2">
                  {guruhlar.map((guruh) => {
                    const guruhVakolatlari = backendVakolatlar.filter((vakolat) => vakolat.guruh === guruh);
                    const tanlanadigan = guruhVakolatlari.filter((vakolat) => !lavozimVakolatlari.has(vakolat.kod));
                    const guruhBerilgan = guruhVakolatlari.filter((vakolat) => lavozimVakolatlari.has(vakolat.kod) || vakolatlar.has(vakolat.kod)).length;
                    const hammasiTanlangan = tanlanadigan.length > 0 && tanlanadigan.every((vakolat) => vakolatlar.has(vakolat.kod));

                    return (
                      <section
                        key={guruh}
                        className="overflow-hidden rounded-[26px] bg-white/92 shadow-[0_18px_46px_rgba(37,99,235,.08)] ring-1 ring-orange-100/80"
                      >
                        <header className="flex items-center justify-between gap-3 border-b-2 border-slate-200 px-6 py-4">
                          <div className="flex items-center gap-3">
                            <h2 className="text-sm font-black uppercase tracking-wide text-slate-600">{guruh}</h2>
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-black ${
                                guruhBerilgan === guruhVakolatlari.length
                                  ? "bg-emerald-50 text-emerald-600"
                                  : guruhBerilgan > 0
                                    ? "bg-blue-50 text-[#2563EB]"
                                    : "bg-slate-100 text-slate-400"
                              }`}
                            >
                              {guruhBerilgan}/{guruhVakolatlari.length}
                            </span>
                          </div>
                          {tanlanadigan.length > 0 && (
                            <button
                              type="button"
                              onClick={() => guruhniAlmashtirish(tanlanadigan.map((vakolat) => vakolat.kod), !hammasiTanlangan)}
                              className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#2563EB] transition hover:bg-blue-50"
                            >
                              {hammasiTanlangan ? "Hammasini olib tashlash" : "Hammasini tanlash"}
                            </button>
                          )}
                        </header>

                        <ul className="divide-y-2 divide-slate-100">
                          {guruhVakolatlari.map((vakolat) => {
                            const lavozimda = lavozimVakolatlari.has(vakolat.kod);
                            const belgilangan = lavozimda || vakolatlar.has(vakolat.kod);
                            return (
                              <li key={vakolat.kod}>
                                <label
                                  className={`flex items-center gap-4 px-6 py-4 transition ${
                                    lavozimda
                                      ? "cursor-default bg-emerald-50/50"
                                      : belgilangan
                                        ? "cursor-pointer bg-blue-50/50"
                                        : "cursor-pointer hover:bg-slate-50"
                                  }`}
                                >
                                  <span
                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                                      belgilangan ? (lavozimda ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-[#2563EB]") : "bg-slate-100 text-slate-300"
                                    }`}
                                  >
                                    {belgilangan ? <Check size={18} strokeWidth={3} /> : <Lock size={16} />}
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className={`flex flex-wrap items-center gap-2 text-sm font-black ${belgilangan ? "text-slate-800" : "text-slate-500"}`}>
                                      {vakolat.nom}
                                      {lavozimda && (
                                        <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-600">
                                          Lavozimdan
                                        </span>
                                      )}
                                    </span>
                                    <span className="mt-0.5 block text-xs font-semibold text-slate-400">{vakolat.izoh}</span>
                                  </span>
                                  <Checkbox
                                    checked={belgilangan}
                                    disabled={lavozimda}
                                    onCheckedChange={() => vakolatToggle(vakolat.kod)}
                                    aria-label={vakolat.nom}
                                    className="size-5 shrink-0 rounded-md border-slate-300 data-checked:border-[#2563EB] data-checked:bg-[#2563EB] data-checked:text-white disabled:opacity-100 disabled:data-checked:border-emerald-500 disabled:data-checked:bg-emerald-500"
                                  />
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    );
                  })}
                </div>
              </div>
            )}

            {faolTab === "Tarix" && <TarixTab tarix={xodimTarixi} />}
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-orange-100 bg-[#F8FAFC]/90 px-9 py-4 backdrop-blur-xl">
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
              <button className="rounded-2xl bg-[#2563EB] px-6 py-2.5 text-sm font-black text-white shadow-[0_14px_32px_rgba(37,99,235,.24)] transition hover:-translate-y-0.5 hover:bg-[#1D4ED8]">
                Saqlash
              </button>
            </div>
          </footer>
        </form>
      </div>
    </AppModal>
  );
}

