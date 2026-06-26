import { useEffect, useMemo, useState } from "react";
import {
  CircleAlert,
  LoaderCircle,
  Plus,
  RefreshCw,
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
    if (!qiymat) return sotuvlar;

    return sotuvlar.filter((sotuv) =>
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
  }, [qidiruv, sotuvlar]);

  async function sotuvniOchish(sotuv: Sotuv) {
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
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-orange-500">
          Savdo bo'limi
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => void boshlangichMalumotlarniYuklash()}
            disabled={yuklanmoqda}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-gray-600 shadow-sm ring-1 ring-orange-100 hover:text-orange-600 disabled:opacity-50"
          >
            <RefreshCw size={17} className={yuklanmoqda ? "animate-spin" : ""} />
            Yangilash
          </button>
          <button
            onClick={() => setYangiSotuvOchiq(true)}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white shadow-lg shadow-orange-200 hover:bg-orange-600"
          >
            <Plus size={18} />
            Yangi sotuv
          </button>
        </div>
      </header>

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

      {!["tolovlar", "qaytarish"].includes(faolTab) && (
        <label className="flex h-12 items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 shadow-sm xl:w-96">
          <Search size={18} className="shrink-0 text-gray-400" />
          <input
            value={qidiruv}
            onChange={(event) => setQidiruv(event.target.value)}
            placeholder="Sotuv, mijoz yoki telefon..."
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </label>
      )}

      {yuklanmoqda ? (
        <div className="flex min-h-80 items-center justify-center rounded-2xl border border-orange-100 bg-white">
          <div className="text-center">
            <LoaderCircle className="mx-auto animate-spin text-orange-500" size={34} />
            <p className="mt-3 text-sm font-semibold text-gray-500">
              Ma'lumotlar serverdan yuklanmoqda...
            </p>
          </div>
        </div>
      ) : (
        <>
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
          {faolTab === "tolovlar" && <Tolovlar sotuvlar={sotuvlar} />}
          {faolTab === "bekor-qilingan" && (
            <BekorQilinganlar
              sotuvlar={qidirilganSotuvlar}
              onSotuvniOchish={sotuvniOchish}
            />
          )}
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
          amalBajarilmoqda={amalBajarilmoqda}
          onYopish={tanlanganSotuvniTozalash}
          onTasdiqlash={(sotuvId) => void tasdiqlash(sotuvId)}
          onBekorQilish={(sotuvId) => void bekorQilish(sotuvId)}
        />
      )}
    </div>
  );
}
