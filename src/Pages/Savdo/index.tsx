import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  Plus,
  Search,
  ShoppingCart,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useSavdoStore } from "@/store/savdoStore";
import type { Sotuv, SotuvHolati, SotuvYaratishMalumoti, TolovTuri } from "@/types/savdo";
import BekorQilinganlar from "./BekorQilinganlar";
import Qaytarish from "./Qaytarish";
import Savatcha from "./Savatcha";
import SotuvlarJadvali from "./SotuvlarJadvali";
import SotuvTafsilotlariModal from "./SotuvTafsilotlariModal";
import Tarix from "./Tarix";
import Tolovlar from "./Tolovlar";
import YangiSotuvModal from "./YangiSotuvModal";
import { mijozNomi, sotuvHolati, sotuvRaqami } from "./savdoYordamchilari";
import SavdoSelect from "./SavdoSelect";

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

const statusFilterlari: Array<{ value: SotuvHolati | "barchasi"; label: string }> = [
  { value: "barchasi", label: "Holat: barchasi" },
  { value: "DRAFT", label: "Qoralama" },
  { value: "CONFIRMED", label: "Tasdiqlangan" },
  { value: "CANCELLED", label: "Bekor qilingan" },
];

const tolovFilterlari: Array<{ value: TolovTuri | "barchasi"; label: string }> = [
  { value: "barchasi", label: "To'lov: barchasi" },
  { value: "CASH", label: "Naqd" },
  { value: "CARD", label: "Karta" },
  { value: "BANK", label: "Bank o'tkazmasi" },
  { value: "DEBT", label: "Qarz" },
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
  const [statusFilteri, setStatusFilteri] = useState<SotuvHolati | "barchasi">("barchasi");
  const [tolovFilteri, setTolovFilteri] = useState<TolovTuri | "barchasi">("barchasi");
  const [yangiSotuvOchiq, setYangiSotuvOchiq] = useState(false);
  const [yangiSotuvVarianti, setYangiSotuvVarianti] = useState<"sale" | "draft">("sale");
  const [xabar, setXabar] = useState("");

  const urlTab = searchParams.get("tab") as SavdoTabi | null;
  const faolTab: SavdoTabi = tablar.some((tab) => tab.id === urlTab)
    ? (urlTab as SavdoTabi)
    : "barchasi";
  const sahifaSarlavhasi =
    faolTab === "tarix"
      ? "Savdo tarixi"
      : faolTab === "bekor-qilingan"
        ? "Bekor qilingan sotuvlar"
        : "Barcha sotuvlar";
  const statusFilterKorinsin = faolTab !== "tarix" && faolTab !== "bekor-qilingan";
  const yangiSotuvKorinsin = faolTab === "barchasi";

  useEffect(() => {
    void boshlangichMalumotlarniYuklash();
  }, [boshlangichMalumotlarniYuklash]);

  useEffect(() => {
    const yangiSotuvniOchish = () => {
      setYangiSotuvVarianti("sale");
      setYangiSotuvOchiq(true);
    };
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

    const filterlangan = sanaBoyicha.filter((sotuv) => {
      const statusMos =
        !statusFilterKorinsin ||
        statusFilteri === "barchasi" ||
        sotuvHolati(sotuv) === statusFilteri;
      const tolovMos =
        tolovFilteri === "barchasi" ||
        sotuv.payments?.some((tolov) => String(tolov.paymentType).toUpperCase() === tolovFilteri);

      return statusMos && tolovMos;
    });

    if (!qiymat) return filterlangan;

    return filterlangan.filter((sotuv) =>
      [
        sotuvRaqami(sotuv),
        mijozNomi(sotuv),
        sotuv.customer?.phone,
        sotuv.clientCompany?.phone,
        sotuv.status,
        sotuv.note,
        ...(sotuv.payments?.map((tolov) => tolov.paymentType) ?? []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(qiymat)
    );
  }, [qidiruv, sanaFilteri, sotuvlar, statusFilterKorinsin, statusFilteri, tolovFilteri]);

  async function sotuvniOchish(sotuv: Sotuv) {
    await qoldiqlarniYuklash(sotuv.warehouseId);
    await sotuvTafsilotiniYuklash(sotuv.id);
  }

  async function yangiSotuvniSaqlash(malumot: SotuvYaratishMalumoti) {
    const sotuv = await yangiSotuvYaratish(malumot);

    if (!sotuv) return false;
    setXabar(
      yangiSotuvVarianti === "draft"
        ? "Yangi qoralama saqlandi."
        : "Yangi sotuv qoralama holatida yaratildi."
    );
    return true;
  }

  async function tasdiqlash(sotuvId: string) {
    const muvaffaqiyatli = await sotuvniTasdiqlash(sotuvId);
    if (muvaffaqiyatli) setXabar("To'lov qabul qilindi. Qoralama savdoga aylantirildi.");
    return muvaffaqiyatli;
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
      {xatolik && (
        <div
          className="flex items-start justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-600"
        >
          <div className="flex items-start gap-2">
            <CircleAlert size={18} className="mt-0.5 shrink-0" />
            <span>{xatolik}</span>
          </div>
          <button onClick={xatolikniTozalash} className="font-black">
            Yopish
          </button>
        </div>
      )}

      {xabar && (
        <div className="fixed right-6 top-6 z-[100060] flex max-w-sm items-start gap-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_18px_50px_rgba(15,23,42,.16)] ring-1 ring-white/80">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={20} />
          </span>
          <div>
            <p className="font-black text-emerald-700">Muvaffaqiyatli</p>
            <p className="mt-0.5 leading-5 text-slate-500">{xabar}</p>
          </div>
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
          {faolTab === "savatcha" && (
            <Savatcha
              sotuvlar={sotuvlar}
              xodimlar={xodimlar}
              mijozlar={mijozlar}
              qoldiqlar={qoldiqlar}
              amalBajarilmoqda={amalBajarilmoqda}
              onQoshish={() => {
                setYangiSotuvVarianti("draft");
                setYangiSotuvOchiq(true);
              }}
              onSotuvniOchish={sotuvniOchish}
              onDavomEttirish={async (sotuv) => {
                await sotuvniOchish(sotuv);
              }}
              onRefresh={boshlangichMalumotlarniYuklash}
              onXabar={setXabar}
            />
          )}

          {!["tolovlar", "qaytarish", "savatcha"].includes(faolTab) && (
            <section className="overflow-hidden rounded-[30px] border border-gray-100 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <div className="border-b border-gray-100 px-10 py-7">
                <h1 className="text-[22px] font-medium text-[#262626]">{sahifaSarlavhasi}</h1>
              </div>

              <div className="flex flex-col gap-4 px-10 py-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  {yangiSotuvKorinsin && (
                    <button
                      onClick={() => {
                        setYangiSotuvVarianti("sale");
                        setYangiSotuvOchiq(true);
                      }}
                      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-orange-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/20"
                    >
                      <Plus size={16} />
                      Qo'shish
                    </button>
                  )}

                  <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-gray-200 bg-[#FAFAFA] px-3 transition focus-within:border-orange-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-100 sm:w-[390px]">
                    <input
                      value={qidiruv}
                      onChange={(event) => setQidiruv(event.target.value)}
                      placeholder={faolTab === "tarix" ? "Savdo tarixidan qidirish" : "Qidirish"}
                      className="min-w-0 flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                    />
                    <Search size={18} className="shrink-0 text-gray-300" />
                  </label>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  {statusFilterKorinsin && (
                    <div className="w-full sm:w-[160px]">
                      <SavdoSelect
                        value={statusFilteri}
                        onChange={(value) => setStatusFilteri(value as SotuvHolati | "barchasi")}
                        options={statusFilterlari}
                        portal
                        buttonClassName="h-10 rounded-md border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                      />
                    </div>
                  )}

                  <div className="w-full sm:w-[170px]">
                    <SavdoSelect
                      value={tolovFilteri}
                      onChange={(value) => setTolovFilteri(value as TolovTuri | "barchasi")}
                      options={tolovFilterlari}
                      portal
                      buttonClassName="h-10 rounded-md border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                    />
                  </div>

                  <div className="w-full sm:w-[150px]">
                    <SavdoSelect
                      value={sanaFilteri}
                      onChange={(value) => setSanaFilteri(value as "bugun" | "barchasi")}
                      options={[
                        { value: "bugun", label: "Sana: bugun" },
                        { value: "barchasi", label: "Sana: barchasi" },
                      ]}
                      portal
                      buttonClassName="h-10 rounded-md border-orange-500 bg-orange-500 px-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
                    />
                  </div>
                </div>
              </div>

              {faolTab === "barchasi" && (
                <SotuvlarJadvali
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

          {faolTab === "tolovlar" && <Tolovlar sotuvlar={sotuvlar} qaytarishlar={qaytarishlar} />}
          {faolTab === "qaytarish" && (
            <Qaytarish
              sotuvlar={sotuvlar}
              qaytarishlar={qaytarishlar}
              amalBajarilmoqda={amalBajarilmoqda}
              onSotuvTafsilotiniOlish={sotuvTafsilotiniYuklash}
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
          variant={yangiSotuvVarianti}
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
          xodimlar={xodimlar}
          amalBajarilmoqda={amalBajarilmoqda}
          onYopish={tanlanganSotuvniTozalash}
          onYangilash={sotuvniYangilash}
          onTasdiqlash={async (sotuvId) => {
            const muvaffaqiyatli = await tasdiqlash(sotuvId);
            if (muvaffaqiyatli) tanlanganSotuvniTozalash();
          }}
          onBekorQilish={(sotuvId) => void bekorQilish(sotuvId)}
        />
      )}
    </div>
  );
}
