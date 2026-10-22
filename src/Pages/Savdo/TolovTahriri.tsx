import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Banknote, Calculator, CheckCircle2, Circle, CreditCard, LoaderCircle, RotateCcw, Send, TriangleAlert, Wallet, XCircle } from "lucide-react";
import HujjatSanasiMaydoni from "@/Components/common/HujjatSanasi";
import SummaMaydoni from "@/Components/common/SummaMaydoni";
import TasdiqlashOynasi from "@/Components/common/TasdiqlashOynasi";
import type { TolovTahririSorovi } from "@/api/tolovTahririApi";
import { kursniSongaAylantirish, valyutaApi } from "@/api/valyutaApi";
import { asosiyXatoKodi } from "@/api/xatoKodlari";
import { bugungiToshkentKuni, kelajakKunmi, kunMatni, toshkentKuni } from "@/lib/hujjatSanasi";
import { dollarQatnashdimi, ortiqchaTahlili, qaytimSomda, somMatni, tolovlarQaytimi, valyutadaMatn, type OrtiqchaQatori } from "@/lib/tolovOrtiqchasi";
import {
  TOLOV_TAHRIRI_BOSQICHLARI,
  TOLOV_TOPILMADI,
  tolovOzgarganmi,
  tolovYangilanishi,
  type TolovTahririBosqichi,
} from "@/lib/tolovTahriri";
import { useKursniTayyorlash, useValyutaStore, type Valyuta } from "@/lib/valyuta";
import { useDavrStore } from "@/store/davrStore";
import { useSavdoStore, type NakladnoyNatijasi } from "@/store/savdoStore";
import type { Sotuv, SotuvTolovi, TolovTuri } from "@/types/savdo";
import SavdoSelect from "./SavdoSelect";
import TolovNatijasiKarta from "./TolovNatijasi";
import { qatorValyutasi, sotuvQarzdorlikSummasi, sotuvSummasi, sotuvValyutasi, tolovSotuvValyutasida, tolovValyutasi } from "./savdoYordamchilari";

/** Sotuv sanasidagi dollar kursi (GET /settings/exchange-rates/effective?date=): `kurs` null — shu kunda ham, undan oldin ham kiritilmagan. */
type SotuvKursi = { holat: "yuklanmoqda" } | { holat: "xato" } | { holat: "tayyor"; kurs: number | null; kursSanasi: string | null };
type BosqichHolati = "kutilmoqda" | "bajarilmoqda" | "tugadi" | "xato";
type Holatlar = Record<TolovTahririBosqichi, BosqichHolati>;

const BOSHLANGICH_HOLATLAR: Holatlar = { bekor: "kutilmoqda", tiklash: "kutilmoqda", yangilash: "kutilmoqda", tasdiqlash: "kutilmoqda" };
const TAHRIRLANADIGAN_TURLAR: TolovTuri[] = ["CASH", "CARD", "BANK"];
// Qayta tasdiqlashda hisobdan to'langan qism uchun mijoz hisobida pul yetmasa (mijoz uni bekor qilish va tasdiqlash orasida ishlatgan) sotuv qoralamada qoladi.
const HISOBDA_PUL_YETMAYDI = "errors.wallet.insufficient_balance";

// PATCH kursni tekshirmaydi: kurs yo'qligi (yoki valyuta rejimi o'chiqligi) faqat tasdiqlashda bilinadi, sotuv esa shunda qoralamada qoladi.
function xatoHolatiKaliti(bosqich: TolovTahririBosqichi, kod: string | null) {
  if (bosqich !== "tasdiqlash") return bosqich;
  if (kod === HISOBDA_PUL_YETMAYDI) return "tasdiqlashHisob";
  const asosiy = asosiyXatoKodi(kod);
  return asosiy === "errors.currency.rate_missing" || asosiy === "errors.currency.mode_off" ? "tasdiqlashKurs" : bosqich;
}

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
      valyutalar: tolovlar.map((element) => tolovValyutasi(element, sotuv)),
      // Dollar hujjat: sotuv yoki uning qatorlaridan biri dollarda. Qayta tasdiqlash shunday hujjatga valyuta rejimini talab qiladi (mode_off).
      dollarHujjat: sotuvVal === "USD" || (sotuv.items ?? []).some((qator) => qatorValyutasi(qator, sotuv) === "USD"),
    };
  });

  // Backend boshqa valyutadagi to'lovni SOTUV SANASIDAGI kurs bilan o'giradi (shu kunga kurs kiritilmagan bo'lsa undan oldingi oxirgisi), bugungi bilan emas:
  // shu kursni backenddan so'raymiz. So'm sotuvga dollar to'lov (`payments[].currency: "USD"`) valyuta rejimi o'chiq bo'lsa ham qabul qilinadi — kurs
  // yetarli; rejim (yoqilgan/o'chiq, umumiy sozlama, uni store o'qiydi) faqat dollar sotuv va dollar qatorlar uchun kerak.
  const rejimYoniq = useValyutaStore((holat) => holat.rejimYoniq);
  const rejimYuklandi = useValyutaStore((holat) => holat.yuklandi);
  useKursniTayyorlash();
  const [sotuvKursi, setSotuvKursi] = useState<SotuvKursi>({ holat: "yuklanmoqda" });
  useEffect(() => {
    let faol = true;
    valyutaApi
      .amaldagiKurs(asos.sotuvKuni || undefined)
      .then((javob) => {
        if (faol) setSotuvKursi({ holat: "tayyor", kurs: kursniSongaAylantirish(javob.rate), kursSanasi: javob.rateDate ?? null });
      })
      .catch(() => {
        if (faol) setSotuvKursi({ holat: "xato" });
      });
    return () => {
      faol = false;
    };
  }, [asos.sotuvKuni]);
  const kurs = sotuvKursi.holat === "tayyor" && sotuvKursi.kurs ? sotuvKursi.kurs : 0;
  const valyutaTanlashMumkin = kurs > 0 && (rejimYoniq || !asos.dollarHujjat);
  const kursYuklandi = rejimYuklandi && sotuvKursi.holat !== "yuklanmoqda";
  const dollarHujjatRejimsiz = asos.dollarHujjat && rejimYuklandi && !rejimYoniq;
  const dollarXabari = !kursYuklandi
    ? ""
    : dollarHujjatRejimsiz
      ? t("tolovTahriri.dollarRejimOchiq")
      : valyutaTanlashMumkin
        ? ""
        : sotuvKursi.holat === "xato"
          ? t("tolovTahriri.kursOqilmadi")
          : t("tolovTahriri.dollarKursYoq", { sana: kunMatni(asos.sotuvKuni) });
  const yopilganKun = useDavrStore((holat) => holat.holat?.closedUntil ?? null);

  const [tur, setTur] = useState<TolovTuri>(tolov.paymentType);
  const [val, setVal] = useState<Valyuta>(aslVal);
  const [summa, setSumma] = useState(String(aslSumma));
  const [kun, setKun] = useState(aslKun);
  const [izoh, setIzoh] = useState(aslIzoh);
  const [ortiqchaniHisobga, setOrtiqchaniHisobga] = useState(false);
  // Dollar qatnashganda backend qaytimni minggacha yaxlitlaydi (`roundChange`, standart yoqilgan); belgi olinsa aniq qaytim.
  const [qaytimniYaxlitlash, setQaytimniYaxlitlash] = useState(true);
  const [tasdiqOchiq, setTasdiqOchiq] = useState(false);
  const [xatolik, setXatolik] = useState("");

  const [faza, setFaza] = useState<"forma" | "jarayon" | "tugadi">("forma");
  const [holatlar, setHolatlar] = useState<Holatlar>(BOSHLANGICH_HOLATLAR);
  const [zanjirXatosi, setZanjirXatosi] = useState<{ bosqich: TolovTahririBosqichi | null; matn: string; kod: string | null } | null>(null);
  const [yakuniy, setYakuniy] = useState<Sotuv | null>(null);
  // Qayta tasdiqlashda nakladnoy mijozga o'zi ketmaydi: mijozli sotuvda yuborish tanlovi (standart — yuborish).
  const [nakladnoyniYuborish, setNakladnoyniYuborish] = useState(true);
  const [nakladnoy, setNakladnoy] = useState<NakladnoyNatijasi | null>(null);
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

  // Bu oynada summalar ko'rinish valyutasiga (sarlavhadagi so'm/dollar) o'girilmaydi: sotuvning o'z valyutasida, qaytim esa doim so'mda ko'rsatiladi.
  // Ko'rinish valyutasi bugungi kurs bilan o'giradi, forma esa sotuv sanasidagi kurs bilan hisoblaydi — aralashtirilsa summalar bir-biriga mos kelmaydi.
  const pul = (miqdor: number, valyuta: Valyuta) => valyutadaMatn(miqdor, valyuta, t("tolovModal.somBelgisi"));
  const sotuvPuli = (miqdor: number) => pul(miqdor, sotuvVal);
  const hisobgaYozish = ortiqchaniHisobga && asos.mijozBor;
  const dollarQatnashdi = dollarQatnashdimi(sotuvVal, [val, ...asos.valyutalar.filter((_, indeks) => indeks !== asos.indeks)]);
  const ortiqchaNaqd = tahlil.ortiqcha > 0 && !tahlil.naqdEmas;
  // Mijozga beriladigan qaytim, so'mda (taxminiy: aniq summani backend tasdiqlashda hisoblaydi). Mijozning eski qarzi bo'lsa ortiqcha avval o'shani yopadi.
  const qaytimTaxmini = ortiqchaNaqd && !hisobgaYozish ? qaytimSomda({ ortiqcha: tahlil.ortiqcha, sotuvValyutasi: sotuvVal, kurs, dollarQatnashdi, yaxlitlash: qaytimniYaxlitlash }) : 0;

  const aslForma = { paymentType: tolov.paymentType, amount: aslSumma, currency: aslVal, kun: aslKun, izoh: aslIzoh };
  const yangiForma = { paymentType: tur, amount: yangiSumma, currency: val, kun, izoh };
  const ozgardi = tolovOzgarganmi(aslForma, yangiForma);

  function tekshirish() {
    if (!(yangiSumma > 0)) return t("tolovModal.errors.nolDanKatta");
    // Qayta tasdiqlash (mode_off, rate_missing) PATCH'dan keyin tekshiriladi: xato bo'lsa sotuv bekor qilinib qoralamada qolardi — shuning uchun oldindan.
    if (dollarHujjatRejimsiz) return t("tolovTahriri.dollarRejimOchiq");
    if (val !== sotuvVal && !valyutaTanlashMumkin) return dollarXabari || t("tolovTahriri.kursOqilmadi");
    if (kelajakKunmi(kun)) return t("tolovModal.errors.sanaKelajak");
    if (asos.sotuvKuni && kun < asos.sotuvKuni) return t("tolovModal.errors.sanaSotuvdanOldin", { sana: kunMatni(asos.sotuvKuni) });
    // Bekor qilish va qayta tasdiqlash sotuv sanasida ham, yangi to'lov sanasida ham yopilgan davrga tegmasligi kerak (backend 423).
    if (yopilganKun && [asos.sotuvKuni, kun].some((sana) => sana && sana <= yopilganKun)) {
      return t("tolovModal.errors.davrYopilgan", { sana: kunMatni(yopilganKun) });
    }
    if (tahlil.ortiqcha > 0 && tahlil.naqdEmas) {
      return t("tolovModal.errors.ortiqchaFaqatNaqd", { maksimal: pul(maksimalTolov, val) });
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
        setNakladnoy(natija.nakladnoy);
        setFaza("tugadi");
      } else {
        const bosqich = natija.bosqich;
        if (bosqich) setHolatlar((joriy) => ({ ...joriy, [bosqich]: "xato" }));
        setZanjirXatosi({ bosqich, kod: natija.kod, matn: natija.xato === TOLOV_TOPILMADI ? t("tolovTahriri.errors.topilmadi") : natija.xato });
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
      ...(qaytimTaxmini > 0 && dollarQatnashdi && !qaytimniYaxlitlash ? { roundChange: false as const } : {}),
      ...(asos.mijozBor && nakladnoyniYuborish ? { nakladnoyYuborish: true } : {}),
    };
    void bajarish("bekor");
  }

  if (faza === "tugadi" && yakuniy) {
    const natija = tolovlarQaytimi(yakuniy.payments);
    return (
      <div className="mx-auto w-full max-w-xl px-7 pb-6">
        <TolovNatijasiKarta
          sarlavha={t("tolovTahriri.tugadi")}
          qaytim={natija.qaytim}
          hisobga={natija.hisobga}
          sotuvValyutasi={sotuvVal}
          qolganQarz={sotuvQarzdorlikSummasi(yakuniy)}
          pul={sotuvPuli}
          qoshimcha={
            nakladnoy && (
              <p
                data-testid="nakladnoy-natijasi"
                className={`flex items-start gap-2.5 rounded-2xl p-4 text-xs font-semibold leading-5 ring-1 ${
                  nakladnoy.ok ? "bg-sky-50 text-sky-800 ring-sky-100" : "bg-amber-50 text-amber-800 ring-amber-200"
                }`}
              >
                {nakladnoy.ok ? <Send size={16} aria-hidden className="mt-0.5 shrink-0" /> : <TriangleAlert size={16} aria-hidden className="mt-0.5 shrink-0" />}
                {nakladnoy.ok
                  ? t("tolovTahriri.nakladnoy.yuborildi")
                  : t("tolovTahriri.nakladnoy.yuborilmadi", { sabab: `${nakladnoy.xato.replace(/[.\s]+$/, "")}.` })}
              </p>
            )
          }
          onYopish={onYopish}
        />
      </div>
    );
  }

  if (faza === "jarayon") {
    return (
      <div className="mx-auto w-full max-w-xl space-y-4 px-7 py-6" data-testid="tolov-tahriri-jarayon">
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
            {zanjirXatosi.bosqich && (
              <p className="font-semibold text-red-600">
                {t(`tolovTahriri.xatoHolati.${xatoHolatiKaliti(zanjirXatosi.bosqich, zanjirXatosi.kod)}`)}
              </p>
            )}
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
    "h-11 w-full rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100";
  const belgiSinfi = "text-xs font-bold uppercase tracking-wide text-slate-400";

  // Hisob-kitob qatorlari: sotuv summasi, jami to'lov va (qarz, ortiqcha yoki "yo'q") natija.
  const hisobQatorlari = [
    { nom: t("tolovTahriri.hisob.sotuv"), qiymat: sotuvPuli(asos.jami), rang: "text-slate-800", id: "sotuv" },
    { nom: t("tolovTahriri.hisob.tolov"), qiymat: sotuvPuli(yakuniyTolangan), rang: "text-[#2563EB]", id: "tolov" },
    qarz > 0
      ? { nom: t("tolovTahriri.hisob.qarz"), qiymat: sotuvPuli(qarz), rang: "text-red-500", id: "qarz" }
      : tahlil.ortiqcha > 0
        ? { nom: t("tolovTahriri.hisob.ortiqcha"), qiymat: sotuvPuli(ortiqchaKorinishi), rang: "text-sky-600", id: "ortiqcha" }
        : { nom: t("tolovTahriri.hisob.qarz"), qiymat: t("tolovModal.yoq"), rang: "text-emerald-600", id: "qarz" },
  ];
  const ortiqchaVariantlari = [
    { hisobga: false, nom: t("tolovTahriri.ortiqcha.qaytim"), ikonka: <Banknote size={16} aria-hidden /> },
    { hisobga: true, nom: t("tolovTahriri.ortiqcha.hisobga"), ikonka: <Wallet size={16} aria-hidden /> },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="tolov-tahriri-forma">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5 sm:px-7">
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold leading-5 text-amber-800">
          <TriangleAlert size={16} aria-hidden className="mt-0.5 shrink-0" />
          {t("tolovTahriri.ogohlantirish")}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-4">
            <section className="space-y-3.5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <h3 className="flex items-center gap-2 text-sm font-black text-slate-800">
                <CreditCard size={16} aria-hidden className="text-[#2563EB]" />
                {t("tolovTahriri.bolim.tolov")}
              </h3>

              <div className="grid gap-1.5">
                <span className={belgiSinfi}>{t("tolovTahriri.maydon.tur")}</span>
                <SavdoSelect
                  value={tur}
                  onChange={(value) => {
                    setTur(value as TolovTuri);
                    setXatolik("");
                  }}
                  options={tolovTuriOptions}
                  buttonClassName="h-11 rounded-xl px-4 text-sm"
                  portal
                />
              </div>

              <div className="grid gap-1.5" data-testid="tolov-valyutasi">
                <span className={belgiSinfi}>{t("tolovTahriri.maydon.summa")}</span>
                <div className="flex items-stretch gap-2">
                  <div className="relative min-w-0 flex-1">
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
                      className={`${maydonSinfi} ${val === "USD" ? "pl-9 pr-4" : "pl-4 pr-16"}`}
                      placeholder="0"
                    />
                    {val !== "USD" && (
                      <span aria-hidden className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{t("tolovModal.somBelgisi")}</span>
                    )}
                  </div>
                  <div role="group" aria-label={t("tolovModal.tolovValyutasi")} className="inline-flex shrink-0 items-center rounded-xl bg-slate-100 p-1">
                    {(["UZS", "USD"] as const).map((valyuta) => (
                      <button
                        key={valyuta}
                        type="button"
                        // Kurs yo'q yoki valyuta rejimi o'chiq bo'lsa faqat sotuv valyutasi tanlanadi.
                        disabled={!valyutaTanlashMumkin && valyuta !== sotuvVal}
                        onClick={() => {
                          setVal(valyuta);
                          setXatolik("");
                        }}
                        className={`h-9 rounded-lg px-3.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${val === valyuta ? "bg-white text-[#2563EB] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        {valyuta === "USD" ? t("tolovModal.valyutaDollar") : t("tolovModal.valyutaSom")}
                      </button>
                    ))}
                  </div>
                </div>
                {val !== sotuvVal && kurs > 0 && (
                  <span className="text-xs font-semibold leading-5 text-slate-500" data-testid="sotuv-kursi">
                    {t("tolovTahriri.kursQatori", { sana: kunMatni(asos.sotuvKuni), kurs: kurs.toLocaleString("uz-UZ", { maximumFractionDigits: 2 }) })}
                    {sotuvKursi.holat === "tayyor" && sotuvKursi.kursSanasi && sotuvKursi.kursSanasi !== asos.sotuvKuni && ` ${t("tolovTahriri.kursKiritilganKun", { sana: kunMatni(sotuvKursi.kursSanasi) })}`}
                    {yangiSumma > 0 && ` · ${t("tolovModal.sotuvValyutasidagiQiymat", { summa: sotuvPuli(yangiQiymat) })}`}
                  </span>
                )}
                {dollarXabari && (
                  <p className="text-xs font-semibold leading-5 text-amber-700" data-testid="dollar-mumkin-emas">
                    {dollarXabari}
                  </p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-[156px_minmax(0,1fr)]">
                <label className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1.5">
                  <span className={belgiSinfi}>{t("tolovTahriri.maydon.sana")}</span>
                  <HujjatSanasiMaydoni
                    value={kun}
                    onChange={(qiymat) => {
                      setKun(qiymat);
                      setXatolik("");
                    }}
                    aria-label={t("tolovModal.tolovSanasi")}
                    korsatma={false}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100"
                  />
                </label>
                <label className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1.5">
                  <span className={belgiSinfi}>{t("tolovTahriri.maydon.izoh")}</span>
                  <input
                    type="text"
                    value={izoh}
                    maxLength={300}
                    onChange={(event) => setIzoh(event.target.value)}
                    placeholder={t("tolovTahriri.maydon.izohPlaceholder")}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-300 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100"
                  />
                </label>
              </div>
            </section>

            {asos.mijozBor && (
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                <input
                  type="checkbox"
                  checked={nakladnoyniYuborish}
                  onChange={(event) => setNakladnoyniYuborish(event.target.checked)}
                  data-testid="nakladnoy-yuborish"
                  className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[#2563EB]"
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-black text-slate-800">
                    <Send size={15} aria-hidden className="shrink-0 text-[#2563EB]" />
                    {t("tolovTahriri.nakladnoy.yuborish")}
                  </span>
                  <span className="mt-0.5 block text-xs font-semibold leading-5 text-slate-500">{t("tolovTahriri.nakladnoy.izoh")}</span>
                </span>
              </label>
            )}
          </div>

          <section className="space-y-3 rounded-2xl bg-linear-to-br from-blue-50/70 to-white p-4 ring-1 ring-blue-100 sm:p-5">
            <h3 className="flex items-center gap-2 text-sm font-black text-slate-800">
              <Calculator size={16} aria-hidden className="text-[#2563EB]" />
              {t("tolovTahriri.bolim.hisob")}
            </h3>

            <dl className="divide-y divide-slate-100 rounded-xl bg-white px-4 ring-1 ring-slate-100" data-testid="tolov-hisobi">
              {hisobQatorlari.map((qator) => (
                <div key={qator.id} className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-sm font-semibold text-slate-500">{qator.nom}</dt>
                  <dd className={`text-base font-black tabular-nums ${qator.rang}`}>{qator.qiymat}</dd>
                </div>
              ))}
            </dl>

            {tahlil.ortiqcha > 0 && tahlil.naqdEmas && (
              <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs font-semibold leading-5 text-amber-800 ring-1 ring-amber-200" data-testid="ortiqcha-naqd-emas">
                <TriangleAlert size={15} aria-hidden className="mt-0.5 shrink-0" />
                {t("tolovModal.errors.ortiqchaFaqatNaqd", { maksimal: pul(maksimalTolov, val) })}
              </p>
            )}

            {ortiqchaNaqd && (
              <div className="space-y-2.5">
                {asos.mijozBor ? (
                  <div className="space-y-1.5">
                    <p className={belgiSinfi}>{t("tolovTahriri.ortiqcha.sarlavha")}</p>
                    <div role="radiogroup" aria-label={t("tolovTahriri.ortiqcha.sarlavha")} className="grid grid-cols-2 gap-2">
                      {ortiqchaVariantlari.map((variant) => {
                        const tanlangan = hisobgaYozish === variant.hisobga;
                        return (
                          <label
                            key={variant.nom}
                            className={`flex cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-2 text-[13px] font-bold leading-tight transition focus-within:ring-2 focus-within:ring-blue-200 ${
                              tanlangan ? "border-[#2563EB] bg-blue-50 text-[#2563EB] shadow-[0_6px_16px_rgba(37,99,235,.12)]" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/40"
                            }`}
                          >
                            <input
                              type="radio"
                              name="ortiqcha-tolov"
                              checked={tanlangan}
                              onChange={() => setOrtiqchaniHisobga(variant.hisobga)}
                              className="sr-only"
                            />
                            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tanlangan ? "bg-[#2563EB] text-white" : "bg-slate-100 text-slate-500"}`}>{variant.ikonka}</span>
                            {variant.nom}
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-[11px] font-medium leading-4 text-slate-500">{t("tolovTahriri.ortiqcha.eskiQarz")}</p>
                  </div>
                ) : (
                  <p className="rounded-xl bg-sky-50 px-3.5 py-2.5 text-xs font-semibold leading-5 text-sky-800 ring-1 ring-sky-100">{t("tolovTahriri.qaytimBoladi")}</p>
                )}

                {qaytimTaxmini > 0 && (
                  <div aria-label={t("tolovTahriri.qaytim.sarlavha")} role="group" className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-3" data-testid="qaytim-taxmini">
                    <div className="flex items-center justify-between gap-3">
                      <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-emerald-700">
                        <Banknote size={15} aria-hidden className="shrink-0" />
                        {t("tolovTahriri.qaytim.sarlavha")}
                      </p>
                      <p className="whitespace-nowrap text-xl font-black tabular-nums text-emerald-600" data-testid="qaytim-taxmini-summa">
                        {somMatni(qaytimTaxmini, t("tolovModal.somBelgisi"))}
                      </p>
                    </div>
                    <p className="mt-0.5 text-[11px] font-semibold leading-4 text-slate-500">{t("tolovTahriri.qaytim.taxminiy")}</p>
                    {dollarQatnashdi && (
                      <label className="mt-2 flex cursor-pointer items-center gap-2 text-[13px] font-bold text-slate-700" title={t("tolovTahriri.qaytim.yaxlitlashIzoh")}>
                        <input
                          type="checkbox"
                          checked={qaytimniYaxlitlash}
                          onChange={(event) => setQaytimniYaxlitlash(event.target.checked)}
                          data-testid="qaytim-yaxlitlash"
                          className="h-4 w-4 shrink-0 accent-[#2563EB]"
                        />
                        {t("tolovTahriri.qaytim.yaxlitlash")}
                      </label>
                    )}
                  </div>
                )}

                {hisobgaYozish && (
                  <p className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-3 text-sm font-black text-sky-700" data-testid="hisobga-yoziladi">
                    <Wallet size={16} aria-hidden className="shrink-0" />
                    {t("tolovTahriri.hisobgaYoziladi", { summa: sotuvPuli(ortiqchaKorinishi) })}
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="shrink-0 space-y-3 border-t border-slate-100 bg-white px-6 py-4 sm:px-7">
        {xatolik && (
          <div role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600">
            {xatolik}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold text-slate-400">{ozgardi ? "" : t("tolovTahriri.ozgarishYoq")}</p>
          <div className="ml-auto flex gap-3">
            <button
              type="button"
              onClick={onOrqaga}
              className="h-11 rounded-xl bg-gray-100 px-5 text-sm font-bold text-gray-600 transition hover:bg-gray-200"
            >
              {t("tolovTahriri.orqaga")}
            </button>
            <button
              type="button"
              disabled={!ozgardi}
              onClick={saqlashniSorash}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#2563EB] px-6 text-sm font-black text-white shadow-[0_10px_24px_rgba(37,99,235,.24)] transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("tolovTahriri.saqlash")}
            </button>
          </div>
        </div>
      </div>

      {tasdiqOchiq && (
        <TasdiqlashOynasi
          ikonka={<TriangleAlert size={26} />}
          ohang="sariq"
          sarlavha={t("tolovTahriri.tasdiq.sarlavha")}
          nom={`№${raqam}`}
          tavsif={asos.mijozBor ? `${t("tolovTahriri.tasdiq.tavsif")} ${t("tolovTahriri.tasdiq.telegram")}` : t("tolovTahriri.tasdiq.tavsif")}
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
