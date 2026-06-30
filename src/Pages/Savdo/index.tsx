import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  CircleAlert,
  LoaderCircle,
  Plus,
  Search,
  ShoppingCart,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useSavdoStore } from "@/store/savdoStore";
import type { Sotuv, SotuvYaratishMalumoti } from "@/types/savdo";
import BekorQilinganlar from "./BekorQilinganlar";
import Qaytarish from "./Qaytarish";
import Savatcha from "./Savatcha";
import SotuvlarJadvali from "./SotuvlarJadvali";
import SotuvTafsilotlariModal from "./SotuvTafsilotlariModal";
import Tarix from "./Tarix";
import Tolovlar from "./Tolovlar";
import YangiSotuvModal from "./YangiSotuvModal";
import { mijozNomi, sotuvRaqami } from "./savdoYordamchilari";

type SavdoTabi =
  | "barchasi"
  | "savatcha"
  | "tarix"
  | "tolovlar"
  | "qaytarish"
  | "bekor-qilingan";

const tablar: Array<{ id: SavdoTabi; nomi: string }> = [
  { id: "barchasi", nomi: "Barcha sotuvlar" },
  { id: "savatcha", nomi: "Qoralamalar" },
  { id: "tarix", nomi: "Savdo tarixi" },
  { id: "tolovlar", nomi: "To'lovlar" },
  { id: "qaytarish", nomi: "Qaytarish" },
  { id: "bekor-qilingan", nomi: "Bekor qilinganlar" },
];

export default function Savdo() {
  const {
    sotuvlar,
    qaytarishlar,
    omborlar,
    mijozlar,
    mijozKompaniyalari,
    xodimlar,
    qoldiqlar,
    tanlanganSotuv,
    yuklanmoqda,
    amalBajarilmoqda,
    xatolik,
    boshlangichMalumotlarniYuklash,
    qoldiqlarniYuklash,
    sotuvTafsilotiniYuklash,
    yangiSotuvYaratish,
    sotuvniYangilash,
    sotuvniTasdiqlash,
    sotuvniBekorQilish,
    yangiQaytarishYaratish,
    qaytarishniTasdiqlash,
    qaytarishniBekorQilish,
    tanlanganSotuvniTozalash,
    xatolikniTozalash,
  } = useSavdoStore();
  const [searchParams] = useSearchParams();
  const [qidiruv, setQidiruv] = useState("");
  const [sanaFilteri, setSanaFilteri] = useState<"bugun" | "barchasi">("bugun");
  const [yangiSotuvOchiq, setYangiSotuvOchiq] = useState(false);
  const [xabar, setXabar] = useState("");

  const urlTab = searchParams.get("tab") as SavdoTabi | null;
  const faolTab: SavdoTabi = tablar.some((tab) => tab.id === urlTab)
    ? (urlTab as SavdoTabi)
    : "barchasi";

  useEffect(() => {
    void boshlangichMalumotlarniYuklash();
  }, [boshlangichMalumotlarniYuklash]);

  useEffect(() => {
    const yangiSotuvniOchish = () => setYangiSotuvOchiq(true);
    window.addEventListener("savdo:yangi-sotuv", yangiSotuvniOchish);
    return () => window.removeEventListener("savdo:yangi-sotuv", yangiSotuvniOchish);
  }, []);

  useEffect(() => {
    if (!xabar) return;
    const timer = window.setTimeout(() => setXabar(""), 2500);
    return () => window.clearTimeout(timer);
  }, [xabar]);

  const qidirilganSotuvlar = useMemo(() => {
    const qiymat = qidiruv.trim().toLowerCase();
    const bugun = new Date().toDateString();
    const sanaBoyicha = sanaFilteri === "bugun"
      ? sotuvlar.filter((sotuv) => {
          const sana = sotuv.createdAt ? new Date(sotuv.createdAt) : null;
          return sana && !Number.isNaN(sana.getTime()) && sana.toDateString() === bugun;
        })
      : sotuvlar;

    if (!qiymat) return sanaBoyicha;

    return sanaBoyicha.filter((sotuv) =>
      [
        sotuvRaqami(sotuv),
        mijozNomi(sotuv),
        sotuv.customer?.phone,
        sotuv.status,
        sotuv.note,
      ]
        .join(" ")
        .toLowerCase()
        .includes(qiymat)
    );
  }, [qidiruv, sanaFilteri, sotuvlar]);

  async function sotuvniOchish(sotuv: Sotuv) {
    await qoldiqlarniYuklash(sotuv.warehouseId);
    await sotuvTafsilotiniYuklash(sotuv.id);
  }

  async function yangiSotuvniSaqlash(malumot: SotuvYaratishMalumoti) {
    const sotuv = await yangiSotuvYaratish(malumot);

    if (!sotuv) return false;
    setXabar("Yangi sotuv qoralama holatida yaratildi.");
    return true;
  }

  async function tasdiqlash(sotuvId: string) {
    const muvaffaqiyatli = await sotuvniTasdiqlash(sotuvId);
    if (muvaffaqiyatli) setXabar("Sotuv tasdiqlandi va ombor qoldig'i yangilandi.");
  }

  async function bekorQilish(sotuvId: string) {
    const rozilik = window.confirm(
      "Sotuvni bekor qilasizmi? Tasdiqlangan bo'lsa ombor qoldig'i tiklanadi."
    );
    if (!rozilik) return;

    const muvaffaqiyatli = await sotuvniBekorQilish(sotuvId);
    if (muvaffaqiyatli) setXabar("Sotuv bekor qilindi.");
  }

  return (
    <div className="space-y-5">
      {(xatolik || xabar) && (
        <div
          className={`flex items-start justify-between gap-3 rounded-2xl border p-4 text-sm font-semibold ${
            xatolik
              ? "border-red-100 bg-red-50 text-red-600"
              : "border-emerald-100 bg-emerald-50 text-emerald-700"
          }`}
        >
          <div className="flex items-start gap-2">
            {xatolik && <CircleAlert size={18} className="mt-0.5 shrink-0" />}
            <span>{xatolik || xabar}</span>
          </div>
          {xatolik && (
            <button onClick={xatolikniTozalash} className="font-black">
              Yopish
            </button>
          )}
        </div>
      )}

      {yuklanmoqda ? (
        <div className="flex min-h-80 items-center justify-center rounded-[28px] border border-gray-100 bg-white shadow-sm">
          <div className="text-center">
            <LoaderCircle className="mx-auto animate-spin text-orange-500" size={34} />
            <p className="mt-3 text-sm font-semibold text-gray-500">
              Ma'lumotlar serverdan yuklanmoqda...
            </p>
          </div>
        </div>
      ) : (
        <>
          {!["tolovlar", "qaytarish"].includes(faolTab) && (
            <section className="overflow-hidden rounded-[30px] border border-gray-100 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <div className="border-b border-gray-100 px-10 py-7">
                <h1 className="text-[22px] font-medium text-[#262626]">Sotuv</h1>
              </div>

              <div className="flex flex-col gap-4 px-10 py-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    onClick={() => setYangiSotuvOchiq(true)}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-orange-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/20"
                  >
                    <Plus size={16} />
                    Qo'shish
                  </button>

                  <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-gray-200 bg-[#FAFAFA] px-3 transition focus-within:border-orange-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-100 sm:w-[390px]">
                    <input
                      value={qidiruv}
                      onChange={(event) => setQidiruv(event.target.value)}
                      placeholder="Qidirish"
                      className="min-w-0 flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                    />
                    <Search size={18} className="shrink-0 text-gray-300" />
                  </label>
                </div>

                <div className="relative">
                  <select
                    value={sanaFilteri}
                    onChange={(event) =>
                      setSanaFilteri(event.target.value as "bugun" | "barchasi")
                    }
                    className="h-10 appearance-none rounded-md bg-orange-500 pl-11 pr-10 text-sm font-semibold text-white shadow-sm outline-none transition hover:bg-orange-600"
                  >
                    <option value="bugun">Bugun</option>
                    <option value="barchasi">Barchasi</option>
                  </select>
                  <CalendarDays
                    size={17}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white"
                  />
                  <ChevronDown
                    size={15}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/80"
                  />
                </div>
              </div>

              {faolTab === "barchasi" && (
                <SotuvlarJadvali
                  sotuvlar={qidirilganSotuvlar}
                  onSotuvniOchish={sotuvniOchish}
                />
              )}
              {faolTab === "savatcha" && (
                <Savatcha
                  sotuvlar={qidirilganSotuvlar}
                  onSotuvniOchish={sotuvniOchish}
                />
              )}
              {faolTab === "tarix" && (
                <Tarix sotuvlar={qidirilganSotuvlar} onSotuvniOchish={sotuvniOchish} />
              )}
              {faolTab === "bekor-qilingan" && (
                <BekorQilinganlar
                  sotuvlar={qidirilganSotuvlar}
                  onSotuvniOchish={sotuvniOchish}
                />
              )}
            </section>
          )}

          {faolTab === "tolovlar" && <Tolovlar sotuvlar={sotuvlar} />}
          {faolTab === "qaytarish" && (
            <Qaytarish
              sotuvlar={sotuvlar}
              qaytarishlar={qaytarishlar}
              amalBajarilmoqda={amalBajarilmoqda}
              onYaratish={yangiQaytarishYaratish}
              onTasdiqlash={qaytarishniTasdiqlash}
              onBekorQilish={qaytarishniBekorQilish}
            />
          )}
        </>
      )}

      {!yuklanmoqda && sotuvlar.length === 0 && omborlar.length === 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <ShoppingCart size={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-black">Serverda hozir ma'lumot yo'q</p>
            <p className="mt-1">
              Test akkauntda ombor, mahsulot va mijoz ma'lumotlari hali yaratilmagan.
              Integratsiya ishlayapti, lekin yangi sotuv uchun avval ombor va mahsulot
              qoldig'i kiritilishi kerak.
            </p>
          </div>
        </div>
      )}

      {yangiSotuvOchiq && (
        <YangiSotuvModal
          omborlar={omborlar}
          mijozlar={mijozlar}
          mijozKompaniyalari={mijozKompaniyalari}
          xodimlar={xodimlar}
          qoldiqlar={qoldiqlar}
          amalBajarilmoqda={amalBajarilmoqda}
          onOmborTanlash={(omborId) => void qoldiqlarniYuklash(omborId)}
          onSaqlash={yangiSotuvniSaqlash}
          onYopish={() => setYangiSotuvOchiq(false)}
        />
      )}

      {tanlanganSotuv && (
        <SotuvTafsilotlariModal
          sotuv={tanlanganSotuv}
          qoldiqlar={qoldiqlar}
          amalBajarilmoqda={amalBajarilmoqda}
          onYopish={tanlanganSotuvniTozalash}
          onYangilash={sotuvniYangilash}
          onTasdiqlash={(sotuvId) => void tasdiqlash(sotuvId)}
          onBekorQilish={(sotuvId) => void bekorQilish(sotuvId)}
        />
      )}
    </div>
  );
}
