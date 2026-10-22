import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Circle, LoaderCircle, RotateCcw, TriangleAlert, XCircle } from "lucide-react";
import HujjatSanasiMaydoni from "@/Components/common/HujjatSanasi";
import SummaMaydoni from "@/Components/common/SummaMaydoni";
import TasdiqlashOynasi from "@/Components/common/TasdiqlashOynasi";
import type { TolovTahririSorovi } from "@/api/tolovTahririApi";
import { bugungiToshkentKuni, kelajakKunmi, kunMatni, toshkentKuni } from "@/lib/hujjatSanasi";
import { ortiqchaTahlili, tolovlarQaytimi, type OrtiqchaQatori } from "@/lib/tolovOrtiqchasi";
import {
  TOLOV_TAHRIRI_BOSQICHLARI,
  TOLOV_TOPILMADI,
  tolovOzgarganmi,
  tolovYangilanishi,
  type TolovTahririBosqichi,
} from "@/lib/tolovTahriri";
import { useValyutaStore, type Valyuta } from "@/lib/valyuta";
import { useDavrStore } from "@/store/davrStore";
import { useSavdoStore } from "@/store/savdoStore";
import type { Sotuv, SotuvTolovi, TolovTuri } from "@/types/savdo";
import OrtiqchaTanlovi from "./OrtiqchaTanlovi";
import SavdoSelect from "./SavdoSelect";
import TolovNatijasiKarta from "./TolovNatijasi";
import { pulniFormatlash, sotuvQarzdorlikSummasi, sotuvSummasi, sotuvValyutasi, tolovSotuvValyutasida, tolovValyutasi } from "./savdoYordamchilari";

type BosqichHolati = "kutilmoqda" | "bajarilmoqda" | "tugadi" | "xato";
type Holatlar = Record<TolovTahririBosqichi, BosqichHolati>;

const BOSHLANGICH_HOLATLAR: Holatlar = { bekor: "kutilmoqda", tiklash: "kutilmoqda", yangilash: "kutilmoqda", tasdiqlash: "kutilmoqda" };
const TAHRIRLANADIGAN_TURLAR: TolovTuri[] = ["CASH", "CARD", "BANK"];

function BosqichQatori({ holat, matn }: { holat: BosqichHolati; matn: string }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100" data-holat={holat}>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center">
        {holat === "tugadi" ? (
          <CheckCircle2 size={22} className="text-emerald-500" aria-hidden />
        ) : holat === "bajarilmoqda" ? (
          <LoaderCircle size={22} className="animate-spin text-[#2563EB]" aria-hidden />
        ) : holat === "xato" ? (
          <XCircle size={22} className="text-red-500" aria-hidden />
        ) : (
          <Circle size={22} className="text-slate-300" aria-hidden />
        )}
      </span>
      <span className={`text-sm font-bold ${holat === "kutilmoqda" ? "text-slate-400" : holat === "xato" ? "text-red-600" : "text-slate-800"}`}>{matn}</span>
    </li>
  );
}

type Props = {
  sotuv: Sotuv;
  tolov: SotuvTolovi;
  raqam: string;
  /** Zanjir ishlayotganda tashqi oynani yopib bo'lmaydi. */
  onBand: (band: boolean) => void;
  onOrqaga: () => void;
  onYopish: () => void;
};

// Tasdiqlangan sotuvdagi to'lovni tahrirlash: tur, summa, valyuta, sana va izoh. Saqlashda sotuv vaqtincha bekor qilinadi, qoralamaga qaytariladi,
// to'lov yangilanadi va qayta tasdiqlanadi (qaytim o'zi hisoblanadi, kassa to'g'rilanadi). Har bosqich ko'rinib turadi; xato bergan bosqichdan davom etiladi.
export default function TolovTahriri({ sotuv, tolov, raqam, onBand, onOrqaga, onYopish }: Props) {
  const { t } = useTranslation("savdo_tafsilot");
  const sotuvVal = sotuvValyutasi(sotuv);
  const aslVal = tolovValyutasi(tolov, sotuv);
  const aslKun = toshkentKuni(tolov.date ?? tolov.paidAt ?? tolov.createdAt) || bugungiToshkentKuni();
  const aslIzoh = tolov.note ?? "";
  const aslSumma = Number(tolov.amount ?? 0);

  // Oyna ochilgandagi holat: zanjir davomida sotuv o'zgaradi (bekor qilingan, qoralama), so'rov esa boshlang'ich ma'lumotdan yig'iladi.
  const [asos] = useState(() => {
    const tolovlar = sotuv.payments ?? [];
    const idBoyicha = tolov.id ? tolovlar.findIndex((element) => element.id === tolov.id) : -1;
    const indeks = idBoyicha !== -1 ? idBoyicha : tolovlar.indexOf(tolov);
    return {
      sotuvId: sotuv.id,
      tolovId: tolov.id ?? null,
      indeks,
      jami: sotuvSummasi(sotuv),
      sotuvKuni: toshkentKuni(sotuv.date ?? sotuv.createdAt),
      mijozBor: Boolean(sotuv.customerId ?? sotuv.customer?.id),
      kompaniyaBor: Boolean(sotuv.clientCompanyId ?? sotuv.clientCompany?.id),
      // Boshqa to'lovlar sotuv valyutasidagi qiymati bilan (qarz qatorlari to'langan hisoblanmaydi).
      tolovlar: tolovlar.map((element) => ({ paymentType: element.paymentType, qiymat: element.paymentType === "DEBT" ? 0 : tolovSotuvValyutasida(element, sotuv) })),
    };
  });

  const kurs = useValyutaStore((holat) => (holat.kursBor && holat.kurs > 0 ? holat.kurs : 0));
  const valyutaTanlashMumkin = useValyutaStore((holat) => holat.rejimYoniq && holat.kursBor && holat.kurs > 0);
  const yopilganKun = useDavrStore((holat) => holat.holat?.closedUntil ?? null);

  const [tur, setTur] = useState<TolovTuri>(tolov.paymentType);
  const [val, setVal] = useState<Valyuta>(aslVal);
  const [summa, setSumma] = useState(String(aslSumma));
  const [kun, setKun] = useState(aslKun);
  const [izoh, setIzoh] = useState(aslIzoh);
  const [ortiqchaniHisobga, setOrtiqchaniHisobga] = useState(false);
  const [tasdiqOchiq, setTasdiqOchiq] = useState(false);
  const [xatolik, setXatolik] = useState("");

  const [faza, setFaza] = useState<"forma" | "jarayon" | "tugadi">("forma");
  const [holatlar, setHolatlar] = useState<Holatlar>(BOSHLANGICH_HOLATLAR);
  const [zanjirXatosi, setZanjirXatosi] = useState<{ bosqich: TolovTahririBosqichi | null; matn: string } | null>(null);
  const [yakuniy, setYakuniy] = useState<Sotuv | null>(null);
  const sorov = useRef<TolovTahririSorovi | null>(null);
  const ishlayapti = useRef(false);

  const yangiSumma = Number(summa) || 0;
  const sotuvValyutasigaOgirish = (miqdor: number, valyuta: Valyuta) =>
    valyuta === sotuvVal || !(kurs > 0) ? miqdor : valyuta === "USD" ? miqdor * kurs : miqdor / kurs;
  const sotuvValyutasidanOgirish = (miqdor: number, valyuta: Valyuta) =>
    valyuta === sotuvVal || !(kurs > 0) ? miqdor : valyuta === "USD" ? miqdor / kurs : miqdor * kurs;
  const yangiQiymat = sotuvValyutasigaOgirish(yangiSumma, val);

  // To'lovlar yuboriladigan tartibda: tahrirlangani o'z o'rnida. Boshqa valyutada yaxlitlash eng ko'pi bilan bir birlik ortiqcha beradi (xato emas).
  const qatorlar: OrtiqchaQatori[] = asos.tolovlar.map((element, indeks) => (indeks === asos.indeks ? { paymentType: tur, qiymat: yangiQiymat } : element));
  const chegara = Math.max(1e-6, val !== sotuvVal ? sotuvValyutasigaOgirish(val === "USD" ? 0.01 : 1, val) : 0);
  const tahlil = ortiqchaTahlili({ jami: asos.jami, avvalTolangan: 0, qatorlar, chegara });
  const yakuniyTolangan = qatorlar.reduce((jami, qator) => jami + qator.qiymat, 0);
  const qarz = asos.jami - yakuniyTolangan > chegara ? asos.jami - yakuniyTolangan : 0;
  const boshqalarYigindisi = qatorlar.reduce((jami, qator, indeks) => (indeks === asos.indeks ? jami : jami + qator.qiymat), 0);
  const maksimalTolov = Math.max(sotuvValyutasidanOgirish(Math.max(asos.jami - boshqalarYigindisi, 0), val), 0);
  const ortiqchaKorinishi = sotuvVal === "USD" ? Math.round(tahlil.ortiqcha * 100) / 100 : Math.round(tahlil.ortiqcha);

  const aslForma = { paymentType: tolov.paymentType, amount: aslSumma, currency: aslVal, kun: aslKun, izoh: aslIzoh };
  const yangiForma = { paymentType: tur, amount: yangiSumma, currency: val, kun, izoh };
  const ozgardi = tolovOzgarganmi(aslForma, yangiForma);

  function tekshirish() {
    if (!(yangiSumma > 0)) return t("tolovModal.errors.nolDanKatta");
    if (kelajakKunmi(kun)) return t("tolovModal.errors.sanaKelajak");
    if (asos.sotuvKuni && kun < asos.sotuvKuni) return t("tolovModal.errors.sanaSotuvdanOldin", { sana: kunMatni(asos.sotuvKuni) });
    // Bekor qilish va qayta tasdiqlash sotuv sanasida ham, yangi to'lov sanasida ham yopilgan davrga tegmasligi kerak (backend 423).
    if (yopilganKun && [asos.sotuvKuni, kun].some((sana) => sana && sana <= yopilganKun)) {
      return t("tolovModal.errors.davrYopilgan", { sana: kunMatni(yopilganKun) });
    }
    if (tahlil.ortiqcha > 0 && tahlil.naqdEmas) {
      return t("tolovModal.errors.ortiqchaFaqatNaqd", { maksimal: pulniFormatlash(maksimalTolov, val) });
    }
    if (qarz > 0 && !asos.mijozBor && !asos.kompaniyaBor) return t("tolovTahriri.errors.qarzMijozsiz");
    return "";
  }

  function saqlashniSorash() {
    const xato = tekshirish();
    setXatolik(xato);
    if (!xato) setTasdiqOchiq(true);
  }

  async function bajarish(boshlash: TolovTahririBosqichi) {
    const joriySorov = sorov.current;
    if (!joriySorov || ishlayapti.current) return;
    ishlayapti.current = true;
    onBand(true);
    setFaza("jarayon");
    setZanjirXatosi(null);
    // Xato bergan bosqichdan davom etilsa, oldingilari bajarilgan.
    const boshlashIndeksi = TOLOV_TAHRIRI_BOSQICHLARI.indexOf(boshlash);
    setHolatlar(() =>
      Object.fromEntries(TOLOV_TAHRIRI_BOSQICHLARI.map((bosqich, indeks) => [bosqich, indeks < boshlashIndeksi ? "tugadi" : "kutilmoqda"])) as Holatlar
    );
    try {
      const natija = await useSavdoStore.getState().tolovniTahrirlash(joriySorov, {
        boshlash,
        onBosqich: (bosqich, holat) => setHolatlar((joriy) => ({ ...joriy, [bosqich]: holat === "boshlandi" ? "bajarilmoqda" : "tugadi" })),
      });
      if (natija.ok) {
        setYakuniy(natija.sotuv);
        setFaza("tugadi");
      } else {
        const bosqich = natija.bosqich;
        if (bosqich) setHolatlar((joriy) => ({ ...joriy, [bosqich]: "xato" }));
        setZanjirXatosi({ bosqich, matn: natija.xato === TOLOV_TOPILMADI ? t("tolovTahriri.errors.topilmadi") : natija.xato });
      }
    } finally {
      ishlayapti.current = false;
      onBand(false);
    }
  }

  function jarayonniBoshlash() {
    const izohMatni = izoh.trim();
    sorov.current = {
      sotuvId: asos.sotuvId,
      tolovId: asos.tolovId,
      tolovIndeksi: asos.indeks,
      yangi: tolovYangilanishi({ kun: aslKun, izoh: aslIzoh }, { paymentType: tur, amount: yangiSumma, currency: val, kun, izoh: izohMatni }),
      // Qarzdan ortiq pul bo'lsa tanlov aniq yuboriladi (mijozli sotuvda: hisobga yozish yoki qaytim).
      ...(tahlil.ortiqcha > 0 && asos.mijozBor ? { keepExcess: ortiqchaniHisobga } : {}),
    };
    void bajarish("bekor");
  }

  if (faza === "tugadi" && yakuniy) {
    const natija = tolovlarQaytimi(yakuniy.payments);
    return (
      <div className="px-7 pb-6">
        <TolovNatijasiKarta
          sarlavha={t("tolovTahriri.tugadi")}
          qaytim={natija.qaytim}
          hisobga={natija.hisobga}
          sotuvValyutasi={sotuvVal}
          qolganQarz={sotuvQarzdorlikSummasi(yakuniy)}
          onYopish={onYopish}
        />
      </div>
    );
  }

  if (faza === "jarayon") {
    return (
      <div className="space-y-4 px-7 py-6" data-testid="tolov-tahriri-jarayon">
        <p className="text-sm font-semibold leading-6 text-slate-500">
          {zanjirXatosi ? t("tolovTahriri.jarayonToxtadi") : t("tolovTahriri.jarayonIzoh")}
        </p>
        <ol className="space-y-2.5">
          {TOLOV_TAHRIRI_BOSQICHLARI.map((bosqich) => (
            <BosqichQatori key={bosqich} holat={holatlar[bosqich]} matn={t(`tolovTahriri.bosqichlar.${bosqich}`)} />
          ))}
        </ol>
        {zanjirXatosi && (
          <div role="alert" className="space-y-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
            <p>{zanjirXatosi.matn}</p>
            {zanjirXatosi.bosqich && <p className="font-semibold text-red-600">{t(`tolovTahriri.xatoHolati.${zanjirXatosi.bosqich}`)}</p>}
          </div>
        )}
        {zanjirXatosi && (
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onYopish}
              className="h-12 rounded-2xl bg-gray-100 px-5 text-sm font-bold text-gray-600 transition hover:bg-gray-200"
            >
              {t("tolovTahriri.yopish")}
            </button>
            {zanjirXatosi.bosqich && (
              <button
                type="button"
                onClick={() => void bajarish(zanjirXatosi.bosqich as TolovTahririBosqichi)}
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#2563EB] px-6 text-sm font-black text-white shadow-[0_10px_24px_rgba(37,99,235,.24)] transition hover:bg-[#1D4ED8]"
              >
                <RotateCcw size={16} aria-hidden />
                {t("tolovTahriri.qaytaUrinish")}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  const tolovTuriOptions = TAHRIRLANADIGAN_TURLAR.map((value) => ({
    value,
    label: t(value === "CASH" ? "common.tolovTuri.naqd" : value === "CARD" ? "common.tolovTuri.karta" : "common.tolovTuri.bank"),
  }));
  const maydonSinfi =
    "h-12 w-full rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-orange-100";

  return (
    <div className="space-y-5 px-7 py-6" data-testid="tolov-tahriri-forma">
      <p className="text-sm leading-6 text-slate-500">{t("tolovTahriri.tavsif")}</p>
      <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold leading-5 text-amber-800">
        <TriangleAlert size={17} aria-hidden className="mt-0.5 shrink-0" />
        {t("tolovTahriri.ogohlantirish")}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-400">{t("tolovModal.tolovTuri")}</span>
          <SavdoSelect
            value={tur}
            onChange={(value) => {
              setTur(value as TolovTuri);
              setXatolik("");
            }}
            options={tolovTuriOptions}
            buttonClassName="h-12 rounded-xl px-4 text-sm"
            portal
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-400">{t("tolovModal.tolovSummasi")}</span>
          <div className="relative">
            {val === "USD" && (
              <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-[#2563EB]">$</span>
            )}
            <SummaMaydoni
              value={summa}
              onChange={(qiymat) => {
                setSumma(qiymat);
                setXatolik("");
              }}
              aria-label={`${t("tolovModal.tolovSummasi")} (${val === "USD" ? "$" : t("tolovModal.somBelgisi")})`}
              className={`${maydonSinfi} ${val === "USD" ? "pl-9 pr-4" : "pl-4 pr-20"}`}
              placeholder="0"
            />
            {val !== "USD" && (
              <span aria-hidden className="pointer-events-none absolute right-9 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{t("tolovModal.somBelgisi")}</span>
            )}
          </div>
        </label>
      </div>

      {(valyutaTanlashMumkin || aslVal !== sotuvVal) && (
        <div className="grid gap-2">
          <span className="text-sm font-bold text-slate-400">{t("tolovModal.tolovValyutasi")}</span>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-xl bg-gray-100 p-1">
              {(["UZS", "USD"] as const).map((valyuta) => (
                <button
                  key={valyuta}
                  type="button"
                  onClick={() => {
                    setVal(valyuta);
                    setXatolik("");
                  }}
                  className={`rounded-lg px-4 py-2 text-xs font-bold transition ${val === valyuta ? "bg-white text-[#2563EB] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  {valyuta === "USD" ? t("tolovModal.valyutaDollar") : t("tolovModal.valyutaSom")}
                </button>
              ))}
            </div>
            {val !== sotuvVal && kurs > 0 && (
              <span className="text-xs font-semibold text-slate-500">
                {t("tolovModal.kursQatori", { kurs: kurs.toLocaleString("uz-UZ", { maximumFractionDigits: 2 }) })}
                {yangiSumma > 0 && ` · ${t("tolovModal.sotuvValyutasidagiQiymat", { summa: pulniFormatlash(yangiQiymat, sotuvVal) })}`}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
        <label className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
          <span className="text-sm font-bold text-slate-400">{t("tolovModal.tolovSanasi")}</span>
          <HujjatSanasiMaydoni
            value={kun}
            onChange={(qiymat) => {
              setKun(qiymat);
              setXatolik("");
            }}
            aria-label={t("tolovModal.tolovSanasi")}
            korsatma={false}
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-orange-100"
          />
        </label>
        <label className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
          <span className="text-sm font-bold text-slate-400">{t("tolovModal.izoh")}</span>
          <input
            type="text"
            value={izoh}
            maxLength={300}
            onChange={(event) => setIzoh(event.target.value)}
            placeholder={t("tolovModal.izohPlaceholder")}
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-300 focus:border-[#2563EB] focus:ring-4 focus:ring-orange-100"
          />
        </label>
      </div>

      <div className="grid gap-4 rounded-2xl bg-linear-to-br from-orange-50/70 to-white p-5 ring-1 ring-orange-100 sm:grid-cols-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">{t("tolovModal.sotuvJami")}</p>
          <p className="mt-1.5 text-lg font-black text-slate-800">{pulniFormatlash(asos.jami, sotuvVal)}</p>
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">{t("tolovModal.jamiTolov")}</p>
          <p className="mt-1.5 text-lg font-black text-[#2563EB]">{pulniFormatlash(yakuniyTolangan, sotuvVal)}</p>
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">
            {qarz > 0 ? t("tolovModal.qarzdorlikQoldigi") : tahlil.ortiqcha > 0 ? t("tolovModal.ortiqcha.qiymati") : t("tolovModal.qarzdorlik")}
          </p>
          <p className={`mt-1.5 text-lg font-black ${qarz > 0 ? "text-red-500" : tahlil.ortiqcha > 0 ? "text-sky-600" : "text-emerald-600"}`}>
            {qarz > 0 ? pulniFormatlash(qarz, sotuvVal) : tahlil.ortiqcha > 0 ? pulniFormatlash(ortiqchaKorinishi, sotuvVal) : t("tolovModal.yoq")}
          </p>
        </div>
      </div>

      {tahlil.ortiqcha > 0 && !tahlil.naqdEmas &&
        (asos.mijozBor ? (
          <OrtiqchaTanlovi
            rejim="qoralama"
            hisobgaYozish={ortiqchaniHisobga}
            onOzgarish={setOrtiqchaniHisobga}
            ortiqchaMatni={pulniFormatlash(ortiqchaKorinishi, sotuvVal)}
            mijozBor
          />
        ) : (
          <p className="rounded-2xl bg-sky-50 p-4 text-xs font-semibold leading-5 text-sky-800 ring-1 ring-sky-100">{t("tolovTahriri.qaytimBoladi")}</p>
        ))}

      {xatolik && (
        <div role="alert" className="rounded-2xl bg-red-50 p-3.5 text-sm font-bold text-red-600">
          {xatolik}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <p className="text-xs font-semibold text-slate-400">{ozgardi ? "" : t("tolovTahriri.ozgarishYoq")}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onOrqaga}
            className="h-12 rounded-2xl bg-gray-100 px-5 text-sm font-bold text-gray-600 transition hover:bg-gray-200"
          >
            {t("tolovTahriri.orqaga")}
          </button>
          <button
            type="button"
            disabled={!ozgardi}
            onClick={saqlashniSorash}
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#2563EB] px-6 text-sm font-black text-white shadow-[0_10px_24px_rgba(37,99,235,.24)] transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("tolovTahriri.saqlash")}
          </button>
        </div>
      </div>

      {tasdiqOchiq && (
        <TasdiqlashOynasi
          ikonka={<TriangleAlert size={26} />}
          ohang="sariq"
          sarlavha={t("tolovTahriri.tasdiq.sarlavha")}
          nom={`№${raqam}`}
          tavsif={t("tolovTahriri.tasdiq.tavsif")}
          ortgaMatni={t("tolovTahriri.tasdiq.yoq")}
          tasdiqMatni={t("tolovTahriri.tasdiq.ha")}
          jarayonMatni={t("tolovTahriri.tasdiq.jarayon")}
          onTasdiq={async () => jarayonniBoshlash()}
          onYopish={() => setTasdiqOchiq(false)}
        />
      )}
    </div>
  );
}
