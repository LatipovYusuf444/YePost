import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Plus,
  Search,
  ShoppingCart,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { sotuvTafsilotiniOlish, sotuvlarSahifasiniOlish, sotuvlarXulosasiniOlish, type SotuvlarXulosasi } from "@/api/savdoApi";
import { useSavdoStore } from "@/store/savdoStore";
import type { Sotuv, SotuvHolati, SotuvYaratishMalumoti, TolovTuri } from "@/types/savdo";
import BekorQilinganlar from "./BekorQilinganlar";
import Buyurtmalar from "./Buyurtmalar";
import MahsulotQaytarishModal from "./MahsulotQaytarishModal";
import Qaytarish from "./Qaytarish";
import Savatcha from "./Savatcha";
import SotuvlarJadvali from "./SotuvlarJadvali";
import SotuvStatistikasi from "./SotuvStatistikasi";
import JadvalYuklanmoqda from "./JadvalYuklanmoqda";
import { bugungiSanaKaliti } from "@/lib/sanaKaliti";
import SotuvTafsilotlariModal from "./SotuvTafsilotlariModal";
import Tarix from "./Tarix";
import Tolovlar from "./Tolovlar";
import Qarzdorliklar from "../Qarzdorlik";
import YangiSotuvModal from "./YangiSotuvModal";
import { mijozNomi, pulniFormatlash, sotuvHolati, sotuvQarzdorlikSummasi, sotuvRaqami } from "./savdoYordamchilari";
import SavdoSelect from "./SavdoSelect";
import DateRangePicker from "@/Components/ui/DateRangePicker";

type SavdoTabi =
  | "barchasi"
  | "savatcha"
  | "tarix"
  | "tolovlar"
  | "qarzdorliklar"
  | "qaytarish"
  | "buyurtmalar"
  | "bekor-qilingan";

export default function Savdo() {
  const { t } = useTranslation("savdo_bosh");
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
    sotuvgaTolovQoshish,
    sotuvniBekorQilish,
    sotuvniOchirish,
    sotuvniTiklash,
    yangiQaytarishYaratish,
    qaytarishniTasdiqlash,
    qaytarishniBekorQilish,
    qaytarishniOchirish,
    qaytarishniTiklash,
    tanlanganSotuvniTozalash,
    xatolikniTozalash,
    sotuvlarniBoyitish,
  } = useSavdoStore();
  const [searchParams] = useSearchParams();
  const [qidiruv, setQidiruv] = useState("");
  const [sanaDan, setSanaDan] = useState(bugungiSanaKaliti);
  const [sanaGacha, setSanaGacha] = useState(bugungiSanaKaliti);
  const [statusFilteri, setStatusFilteri] = useState<SotuvHolati | "barchasi">("barchasi");
  const [tolovFilteri, setTolovFilteri] = useState<TolovTuri | "barchasi">("barchasi");
  const [yangiSotuvOchiq, setYangiSotuvOchiq] = useState(false);
  const [yangiSotuvVarianti, setYangiSotuvVarianti] = useState<"sale" | "draft">("sale");
  const [qaytarishModalSotuv, setQaytarishModalSotuv] = useState<Sotuv | null>(null);
  const [xabar, setXabar] = useState("");

  const tablar = useMemo<Array<{ id: SavdoTabi; nomi: string }>>(
    () => [
      { id: "barchasi", nomi: t("savdoSahifasi.tabs.barchasi") },
      { id: "savatcha", nomi: t("savdoSahifasi.tabs.savatcha") },
      { id: "tarix", nomi: t("savdoSahifasi.tabs.tarix") },
      { id: "tolovlar", nomi: t("savdoSahifasi.tabs.tolovlar") },
      { id: "qarzdorliklar", nomi: t("savdoSahifasi.tabs.qarzdorliklar") },
      { id: "qaytarish", nomi: t("savdoSahifasi.tabs.qaytarish") },
      { id: "buyurtmalar", nomi: t("savdoSahifasi.tabs.buyurtmalar") },
      { id: "bekor-qilingan", nomi: t("savdoSahifasi.tabs.bekorQilingan") },
    ],
    [t]
  );

  const statusFilterlari = useMemo<Array<{ value: SotuvHolati | "barchasi"; label: string }>>(
    () => [
      { value: "barchasi", label: t("savdoSahifasi.statusFilter.barchasi") },
      { value: "DRAFT", label: t("savdoSahifasi.statusFilter.draft") },
      { value: "CONFIRMED", label: t("savdoSahifasi.statusFilter.confirmed") },
      { value: "CANCELLED", label: t("savdoSahifasi.statusFilter.cancelled") },
    ],
    [t]
  );

  const tolovFilterlari = useMemo<Array<{ value: TolovTuri | "barchasi"; label: string }>>(
    () => [
      { value: "barchasi", label: t("savdoSahifasi.paymentFilter.barchasi") },
      { value: "CASH", label: t("savdoSahifasi.paymentFilter.cash") },
      { value: "CARD", label: t("savdoSahifasi.paymentFilter.card") },
      { value: "BANK", label: t("savdoSahifasi.paymentFilter.bank") },
      { value: "DEBT", label: t("savdoSahifasi.paymentFilter.debt") },
    ],
    [t]
  );

  const urlTab = searchParams.get("tab") as SavdoTabi | null;
  const faolTab: SavdoTabi = tablar.some((tab) => tab.id === urlTab)
    ? (urlTab as SavdoTabi)
    : "barchasi";
  const sahifaSarlavhasi =
    faolTab === "tarix"
      ? t("savdoSahifasi.titles.tarix")
      : faolTab === "bekor-qilingan"
        ? t("savdoSahifasi.titles.bekorQilingan")
        : t("savdoSahifasi.titles.barchasi");
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
  // ---- Server tomonidan filtr/sahifalash (GET /sales) va kartalar xulosasi (GET /sales/summary) ----
  // Server rejimi faqat "Barcha sotuvlar" tabida va to'lov turi filtri yo'q bo'lganda ishlaydi (server to'lov turi bo'yicha filtrlamaydi).
  // So'rov muvaffaqiyatsiz bo'lsa, avvalgidek yuklangan ro'yxatdan brauzerda filtrlanadi.
  const [serverSahifaTanlovi, setServerSahifaTanlovi] = useState({ kalit: "", page: 1 });
  const [serverHajm, setServerHajm] = useState(20);
  const [qidiruvKechiktirilgan, setQidiruvKechiktirilgan] = useState("");
  const [serverQatorlar, setServerQatorlar] = useState<Sotuv[]>([]);
  const [serverJami, setServerJami] = useState(0);
  const [serverYuklanmoqda, setServerYuklanmoqda] = useState(false);
  const [serverYuklanganKalit, setServerYuklanganKalit] = useState("");
  const [serverXatoKaliti, setServerXatoKaliti] = useState("");
  const [serverYangilanish, setServerYangilanish] = useState(0);
  const [xulosa, setXulosa] = useState<SotuvlarXulosasi | null>(null);

  useEffect(() => {
    const kechiktirish = window.setTimeout(() => setQidiruvKechiktirilgan(qidiruv.trim()), 350);
    return () => window.clearTimeout(kechiktirish);
  }, [qidiruv]);

  // Sotuv o'zgarganda (tasdiqlash, bekor qilish, to'lov, o'chirish) server ro'yxati va xulosa qayta olinadi.
  useEffect(() => {
    const yangilash = () => setServerYangilanish((joriy) => joriy + 1);
    window.addEventListener("savdo:yangilandi", yangilash);
    return () => window.removeEventListener("savdo:yangilandi", yangilash);
  }, []);

  const serverFiltrKaliti = [sanaDan, sanaGacha, statusFilteri, qidiruvKechiktirilgan, serverHajm].join("|");
  const serverRejimi = faolTab === "barchasi" && tolovFilteri === "barchasi" && serverXatoKaliti !== serverFiltrKaliti;
  // Filtr o'zgarsa sahifa avtomatik 1 ga qaytadi (alohida qo'shimcha so'rovsiz).
  const serverSahifa = serverSahifaTanlovi.kalit === serverFiltrKaliti ? serverSahifaTanlovi.page : 1;

  useEffect(() => {
    if (!serverRejimi) return;
    let faol = true;
    setServerYuklanmoqda(true);
    void sotuvlarSahifasiniOlish({
      dateFrom: sanaDan || undefined,
      dateTo: sanaGacha || undefined,
      status: statusFilteri === "barchasi" ? undefined : statusFilteri,
      search: qidiruvKechiktirilgan || undefined,
      page: serverSahifa,
      pageSize: serverHajm,
    })
      .then((javob) => {
        if (!faol) return;
        setServerQatorlar(sotuvlarniBoyitish(javob.items));
        setServerJami(javob.total);
        setServerYuklanganKalit(serverFiltrKaliti);
      })
      .catch(() => {
        if (faol) setServerXatoKaliti(serverFiltrKaliti);
      })
      .finally(() => {
        if (faol) setServerYuklanmoqda(false);
      });
    return () => {
      faol = false;
    };
    // sotuvlarniBoyitish store'da barqaror funksiya.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverRejimi, sanaDan, sanaGacha, statusFilteri, qidiruvKechiktirilgan, serverSahifa, serverHajm, serverYangilanish]);

  useEffect(() => {
    if (faolTab !== "barchasi") return;
    let faol = true;
    void sotuvlarXulosasiniOlish({ dateFrom: sanaDan || undefined, dateTo: sanaGacha || undefined })
      .then((javob) => {
        if (faol) setXulosa(javob);
      })
      .catch(() => {
        if (faol) setXulosa(null);
      });
    return () => {
      faol = false;
    };
  }, [faolTab, sanaDan, sanaGacha, serverYangilanish]);

  const qidirilganSotuvlar = useMemo(() => {
    const qiymat = qidiruv.trim().toLowerCase();
    const sanaBoyicha = sotuvlar.filter((sotuv) => {
      if (!sanaDan && !sanaGacha) return true;
      if (!sotuv.createdAt) return false;
      const sana = new Date(sotuv.createdAt);
      if (Number.isNaN(sana.getTime())) return false;
      const kalit = `${sana.getFullYear()}-${String(sana.getMonth() + 1).padStart(2, "0")}-${String(sana.getDate()).padStart(2, "0")}`;
      return (!sanaDan || kalit >= sanaDan) && (!sanaGacha || kalit <= sanaGacha);
    });

    const filterlangan = sanaBoyicha.filter((sotuv) => {
      const statusMos =
        !statusFilterKorinsin ||
        statusFilteri === "barchasi" ||
        sotuvHolati(sotuv) === statusFilteri;
      const tolovMos =
        tolovFilteri === "barchasi" ||
        (tolovFilteri === "DEBT"
          ? sotuvHolati(sotuv) === "CONFIRMED" && sotuvQarzdorlikSummasi(sotuv) > 0
          : sotuv.payments?.some((tolov) => String(tolov.paymentType).toUpperCase() === tolovFilteri));

      return statusMos && tolovMos;
    });

    const tartiblangan =
      tolovFilteri === "DEBT"
        ? [...filterlangan].sort((a, b) => sotuvQarzdorlikSummasi(b) - sotuvQarzdorlikSummasi(a))
        : filterlangan;

    if (!qiymat) return tartiblangan;

    return tartiblangan.filter((sotuv) =>
      [
        sotuvRaqami(sotuv),
        mijozNomi(sotuv),
        sotuv.customer?.phone,
        sotuv.clientCompany?.phone,
        sotuv.walkInCustomerPhone,
        sotuv.status,
        sotuv.note,
        ...(sotuv.payments?.map((tolov) => tolov.paymentType) ?? []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(qiymat)
    );
  }, [qidiruv, sanaDan, sanaGacha, sotuvlar, statusFilterKorinsin, statusFilteri, tolovFilteri]);

  const qarzXulosasi = useMemo(() => {
    if (tolovFilteri !== "DEBT") return null;
    const qarzdorlar = new Set(qidirilganSotuvlar.map((sotuv) => sotuv.customerId ?? sotuv.clientCompanyId ?? sotuv.id));
    return {
      sotuvlar: qidirilganSotuvlar.length,
      qarzdorlar: qarzdorlar.size,
      jami: qidirilganSotuvlar.reduce((summa, sotuv) => summa + sotuvQarzdorlikSummasi(sotuv), 0),
    };
  }, [qidirilganSotuvlar, tolovFilteri]);

  async function sotuvniOchish(sotuv: Sotuv) {
    await qoldiqlarniYuklash(sotuv.warehouseId);
    await sotuvTafsilotiniYuklash(sotuv.id);
  }

  async function mahsulotQaytarishniOchish(sotuv: Sotuv) {
    try {
      const toliqSotuv = await sotuvTafsilotiniOlish(sotuv.id);
      setQaytarishModalSotuv(toliqSotuv);
    } catch {
      setQaytarishModalSotuv(sotuv);
    }
  }

  async function yangiSotuvniSaqlash(malumot: SotuvYaratishMalumoti) {
    const sotuv = await yangiSotuvYaratish(malumot);

    if (!sotuv) return false;
    setXabar(
      yangiSotuvVarianti === "draft"
        ? "savdoSahifasi.messages.draftSaved"
        : "savdoSahifasi.messages.draftCreated"
    );
    return true;
  }

  async function tasdiqlash(sotuvId: string) {
    const muvaffaqiyatli = await sotuvniTasdiqlash(sotuvId);
    if (muvaffaqiyatli) setXabar("savdoSahifasi.messages.paymentConfirmed");
    return muvaffaqiyatli;
  }

  async function bekorQilish(sotuvId: string) {
    const rozilik = window.confirm(t("savdoSahifasi.confirmCancel"));
    if (!rozilik) return;

    const muvaffaqiyatli = await sotuvniBekorQilish(sotuvId);
    if (muvaffaqiyatli) setXabar("savdoSahifasi.messages.saleCancelled");
  }

  return (
    <div className="savdo-table-typography space-y-5">
      {xatolik && (
        <div
          className="flex items-start justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-600"
        >
          <div className="flex items-start gap-2">
            <CircleAlert size={18} className="mt-0.5 shrink-0" />
            <span>{xatolik}</span>
          </div>
          <button onClick={xatolikniTozalash} className="font-black">
            {t("savdoSahifasi.closeError")}
          </button>
        </div>
      )}

      {xabar && (
        <div className="fixed right-6 top-6 z-[100060] flex max-w-sm items-start gap-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_18px_50px_rgba(15,23,42,.16)] ring-1 ring-white/80">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={20} />
          </span>
          <div>
            <p className="font-black text-emerald-700">{t("savdoSahifasi.successTitle")}</p>
            <p className="mt-0.5 leading-5 text-slate-500">{t(xabar)}</p>
          </div>
        </div>
      )}

      {(
        <>
          {faolTab === "savatcha" && (
            <Savatcha
              sotuvlar={sotuvlar}
              xodimlar={xodimlar}
              mijozlar={mijozlar}
              qoldiqlar={qoldiqlar}
              amalBajarilmoqda={amalBajarilmoqda}
              yuklanmoqda={yuklanmoqda}
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

          {faolTab === "barchasi" && (
            <SotuvStatistikasi
              sotuvlar={sotuvlar}
              yuklanmoqda={yuklanmoqda}
              sanaDan={sanaDan}
              sanaGacha={sanaGacha}
              xulosa={xulosa}
              onSanaTanlash={(dan, gacha) => {
                setSanaDan(dan);
                setSanaGacha(gacha);
              }}
              onQarzniKorsatish={() => {
                setStatusFilteri("barchasi");
                setTolovFilteri("DEBT");
              }}
            />
          )}

          {!["tolovlar", "qarzdorliklar", "qaytarish", "savatcha", "bekor-qilingan", "buyurtmalar"].includes(faolTab) && (
            <section className="overflow-hidden rounded-[30px] border border-gray-100 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-6 sm:px-10 sm:py-7">
                <h1 className="savdo-section-title">{sahifaSarlavhasi}</h1>
                <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-orange-50 px-2.5 text-xs font-black tabular-nums text-[#2563EB] ring-1 ring-orange-100">
                  {serverRejimi && serverYuklanganKalit === serverFiltrKaliti ? serverJami : qidirilganSotuvlar.length}
                </span>
              </div>

              <div className="flex flex-col gap-4 px-5 py-5 sm:px-10 sm:py-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  {yangiSotuvKorinsin && (
                    <button
                      onClick={() => {
                        setYangiSotuvVarianti("sale");
                        setYangiSotuvOchiq(true);
                      }}
                      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/20"
                    >
                      <Plus size={16} />
                      {t("savdoSahifasi.add")}
                    </button>
                  )}

                  <label className="flex h-10 w-full items-center gap-2 rounded-xl border border-gray-200 bg-[#FAFAFA] px-3 transition focus-within:border-orange-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-100 sm:w-[390px]">
                    <input
                      value={qidiruv}
                      onChange={(event) => setQidiruv(event.target.value)}
                      placeholder={faolTab === "tarix" ? t("savdoSahifasi.searchPlaceholderHistory") : t("savdoSahifasi.searchPlaceholder")}
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
                        buttonClassName="h-10 rounded-xl border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                      />
                    </div>
                  )}

                  <div className="w-full sm:w-[170px]">
                    <SavdoSelect
                      value={tolovFilteri}
                      onChange={(value) => setTolovFilteri(value as TolovTuri | "barchasi")}
                      options={tolovFilterlari}
                      portal
                      buttonClassName="h-10 rounded-xl border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                    />
                  </div>

                  <div className="w-full sm:w-[230px]">
                    <DateRangePicker
                      from={sanaDan}
                      to={sanaGacha}
                      onChange={(from, to) => { setSanaDan(from); setSanaGacha(to); }}
                      compact
                    />
                  </div>
                </div>
              </div>

              {qarzXulosasi && (
                <div className="mx-5 mb-2 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl bg-rose-50 px-5 py-3.5 ring-1 ring-rose-100 sm:mx-10">
                  <CircleAlert size={18} className="shrink-0 text-rose-500" />
                  <span className="text-sm font-bold text-rose-700">
                    {t("savdoSahifasi.qarzXulosasi.qarzdorlar", { count: qarzXulosasi.qarzdorlar })}
                  </span>
                  <span className="text-sm text-rose-600">
                    {t("savdoSahifasi.qarzXulosasi.sotuvlar", { count: qarzXulosasi.sotuvlar })}
                  </span>
                  <span className="text-sm text-rose-600">
                    {t("savdoSahifasi.qarzXulosasi.jami")} <b className="font-black text-rose-700">{pulniFormatlash(qarzXulosasi.jami)}</b>
                  </span>
                  <button
                    type="button"
                    onClick={() => setTolovFilteri("barchasi")}
                    className="ml-auto text-xs font-bold text-rose-500 transition hover:text-rose-700"
                  >
                    {t("savdoSahifasi.qarzXulosasi.tozalash")}
                  </button>
                </div>
              )}

              {((yuklanmoqda && sotuvlar.length === 0) || (faolTab === "barchasi" && serverRejimi && serverYuklanganKalit === "")) && <JadvalYuklanmoqda />}
              {!(yuklanmoqda && sotuvlar.length === 0) && !(faolTab === "barchasi" && serverRejimi && serverYuklanganKalit === "") && faolTab === "barchasi" && (
                <SotuvlarJadvali
                  sotuvlar={serverRejimi ? serverQatorlar : qidirilganSotuvlar}
                  serverSahifalash={
                    serverRejimi
                      ? {
                          page: serverSahifa,
                          pageSize: serverHajm,
                          total: serverJami,
                          yuklanmoqda: serverYuklanmoqda,
                          onPageChange: (page) => setServerSahifaTanlovi({ kalit: serverFiltrKaliti, page }),
                          onPageSizeChange: (hajm) => setServerHajm(Math.min(hajm, 100)),
                        }
                      : undefined
                  }
                  onSotuvniOchish={sotuvniOchish}
                  onOchirish={sotuvniOchirish}
                  onTiklash={sotuvniTiklash}
                />
              )}
              {!(yuklanmoqda && sotuvlar.length === 0) && faolTab === "tarix" && (
                <Tarix
                  sotuvlar={qidirilganSotuvlar}
                  qaytarishlar={qaytarishlar}
                  onSotuvniOchish={sotuvniOchish}
                  onQaytarish={(sotuv) => void mahsulotQaytarishniOchish(sotuv)}
                />
              )}
            </section>
          )}

          {faolTab === "buyurtmalar" && (
            <Buyurtmalar
              onSotuvniOchish={sotuvniOchish}
              onOchirish={sotuvniOchirish}
              onTiklash={sotuvniTiklash}
            />
          )}

          {faolTab === "bekor-qilingan" && (
            <BekorQilinganlar
              sotuvlar={sotuvlar}
              yuklanmoqda={yuklanmoqda}
              onSotuvniOchish={sotuvniOchish}
              onYangilash={boshlangichMalumotlarniYuklash}
              onOchirish={sotuvniOchirish}
              onTiklash={sotuvniTiklash}
            />
          )}

          {faolTab === "tolovlar" && (
            <Tolovlar
              sotuvlar={sotuvlar}
              qaytarishlar={qaytarishlar}
              onSotuvniOchish={sotuvniOchish}
            />
          )}
          {faolTab === "qarzdorliklar" && (
            <Qarzdorliklar
              sotuvlar={sotuvlar}
              yuklanmoqda={yuklanmoqda}
              onSotuvniOchish={sotuvniOchish}
              onYangilash={boshlangichMalumotlarniYuklash}
            />
          )}
          {faolTab === "qaytarish" && (
            <Qaytarish
              sotuvlar={sotuvlar}
              yuklanmoqda={yuklanmoqda}
              qaytarishlar={qaytarishlar}
              amalBajarilmoqda={amalBajarilmoqda}
              onSotuvTafsilotiniOlish={sotuvTafsilotiniYuklash}
              onYaratish={yangiQaytarishYaratish}
              onTasdiqlash={qaytarishniTasdiqlash}
              onBekorQilish={qaytarishniBekorQilish}
              onOchirish={qaytarishniOchirish}
              onTiklash={qaytarishniTiklash}
            />
          )}
        </>
      )}

      {!yuklanmoqda && sotuvlar.length === 0 && omborlar.length === 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <ShoppingCart size={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-black">{t("savdoSahifasi.emptyState.title")}</p>
            <p className="mt-1">
              {t("savdoSahifasi.emptyState.description")}
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
          onTolovQoshish={sotuvgaTolovQoshish}
          onTasdiqlash={async (sotuvId) => {
            const muvaffaqiyatli = await tasdiqlash(sotuvId);
            if (muvaffaqiyatli) tanlanganSotuvniTozalash();
          }}
          onBekorQilish={(sotuvId) => void bekorQilish(sotuvId)}
        />
      )}

      {qaytarishModalSotuv && (
        <MahsulotQaytarishModal
          sotuv={qaytarishModalSotuv}
          qaytarishlar={qaytarishlar}
          amalBajarilmoqda={amalBajarilmoqda}
          onYopish={() => setQaytarishModalSotuv(null)}
          onYaratish={yangiQaytarishYaratish}
          onTasdiqlash={qaytarishniTasdiqlash}
          onMuvaffaqiyat={() => setXabar("savdoSahifasi.messages.returnConfirmed")}
        />
      )}
    </div>
  );
}
