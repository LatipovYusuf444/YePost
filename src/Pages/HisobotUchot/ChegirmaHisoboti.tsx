import { useEffect, useMemo, useState } from "react";
import { BadgePercent, Download, Gift, Percent, ReceiptText, Scale, Search, ShoppingCart } from "lucide-react";
import KengaytiriladiganJadval, { type Ustun } from "./KengaytiriladiganJadval";
import Dropdown from "./Dropdown";
import MuddatTanlov from "./MuddatTanlov";
import LoadingState from "@/Components/common/LoadingState";
import KorsatkichKartasi, { KartaChiziqlari, KartaOlchagich } from "@/Components/common/KorsatkichKartasi";
import ChegirmaXulosaBlok from "./ChegirmaXulosa";
import {
  backendYoqmi,
  javobQatorlari,
  javobXulosasi,
  sotuvlardanQatorlar,
  sotuvlardanXulosa,
  tasdiqlanganSotuvlar,
  xulosaSummaryga,
  type ChegirmaManbasi,
} from "./chegirmaYordamchilari";
import { sotuvSummasi } from "@/Pages/Savdo/savdoYordamchilari";
import { useHisobotRealData } from "./HisobotRealData";
import { foydalanuvchilarApi } from "@/api/accountsApi";
import { discountReportApi } from "@/api/reportsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type {
  DiscountReportFilter,
  DiscountReportGroupBy,
  DiscountReportRow,
  DiscountReportSummary,
} from "@/types/reports";
import { bugun, bugunMinus, pul, son } from "./yordamchilar";

type Qator = {
  id: string;
  nomi: string;
  sotuvlarSoni: number;
  chegirmaliSotuvlar: number;
  sotuvSummasi: number;
  chegirma: number;
  foiz: number;
  // Zavod bonusi (faqat kun/oy kesimida).
  bonus: number;
};

const guruhlar: { value: DiscountReportGroupBy; nomi: string; ustun: string; qidiruv: string }[] = [
  { value: "DAY", nomi: "Kun bo'yicha", ustun: "Sana", qidiruv: "Sana bo‘yicha qidiruv" },
  { value: "MONTH", nomi: "Oy bo'yicha", ustun: "Oy", qidiruv: "Oy bo‘yicha qidiruv" },
  { value: "CASHIER", nomi: "Kassir bo'yicha", ustun: "Kassir", qidiruv: "Kassir bo‘yicha qidiruv" },
  { value: "CUSTOMER", nomi: "Mijoz bo'yicha", ustun: "Mijoz", qidiruv: "Mijoz bo‘yicha qidiruv" },
  { value: "PRODUCT", nomi: "Mahsulot bo'yicha", ustun: "Mahsulot", qidiruv: "Mahsulot bo‘yicha qidiruv" },
];

const raqam = (value: unknown) => {
  const natija = Number(value ?? 0);
  return Number.isFinite(natija) ? natija : 0;
};

// Backend sana yoki oyni ISO ("2026-10-05", "2026-10") ko'rinishida qaytarsa, o'qishga qulay qilinadi.
function sarlavhaMatni(label: string, guruh: DiscountReportGroupBy) {
  if (guruh === "DAY") {
    const mos = /^(\d{4})-(\d{2})-(\d{2})/.exec(label);
    if (mos) return `${mos[3]}.${mos[2]}.${mos[1]}`;
  }
  if (guruh === "MONTH") {
    const mos = /^(\d{4})-(\d{2})/.exec(label);
    if (mos) return `${mos[2]}.${mos[1]}`;
  }
  return label;
}

function qatorlarniOlish(royxat: DiscountReportRow[], guruh: DiscountReportGroupBy): Qator[] {
  return royxat.map((item, index) => {
    const chegirma = raqam(item.discountAmount);
    const sotuvSummasi = raqam(item.salesAmount);
    const label = String(item.label ?? item.key ?? "").trim();
    return {
      id: String(item.key ?? item.label ?? `chegirma-${index}`),
      nomi: label ? sarlavhaMatni(label, guruh) : "—",
      sotuvlarSoni: raqam(item.salesCount),
      chegirmaliSotuvlar: raqam(item.discountedSalesCount ?? item.salesCount),
      sotuvSummasi,
      chegirma,
      bonus: raqam(item.bonusAmount),
      // Foiz backenddan kelmasa, chegirmagacha bo'lgan summaga nisbatan hisoblanadi.
      foiz: item.discountPct != null
        ? raqam(item.discountPct)
        : sotuvSummasi + chegirma > 0 ? (chegirma / (sotuvSummasi + chegirma)) * 100 : 0,
    };
  });
}

export default function ChegirmaHisoboti() {
  const { filiallar } = useHisobotRealData();
  const [dateFrom, setDateFrom] = useState(bugunMinus(30));
  const [dateTo, setDateTo] = useState(bugun());
  const [guruh, setGuruh] = useState<DiscountReportGroupBy>("DAY");
  const [branchId, setBranchId] = useState("");
  const [responsibleId, setResponsibleId] = useState("");
  const [kassirlar, setKassirlar] = useState<{ value: string; nomi: string }[]>([]);
  const [qidiruv, setQidiruv] = useState("");
  const [qatorlar, setQatorlar] = useState<Qator[]>([]);
  const [xulosa, setXulosa] = useState<DiscountReportSummary | null>(null);
  const [manba, setManba] = useState<ChegirmaManbasi>("backend");
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [exportYuklanmoqda, setExportYuklanmoqda] = useState(false);
  const [xato, setXato] = useState("");

  // Kassir tanlovi: /accounts/users ruxsati bo'lmasa (403) ro'yxat bo'sh qoladi va filtr faqat "Barchasi" bo'ladi.
  useEffect(() => {
    let active = true;
    foydalanuvchilarApi.royxat()
      .then((users) => {
        if (active) setKassirlar(users.map((item) => ({ value: item.id, nomi: item.fullName || item.username || item.id })));
      })
      .catch(() => { if (active) setKassirlar([]); });
    return () => { active = false; };
  }, []);

  const filtr = useMemo<DiscountReportFilter>(() => ({
    groupBy: guruh,
    dateFrom: new Date(`${dateFrom}T00:00:00.000Z`).toISOString(),
    dateTo: new Date(`${dateTo}T23:59:59.999Z`).toISOString(),
    branchId: branchId || undefined,
    responsibleId: responsibleId || undefined,
  }), [branchId, dateFrom, dateTo, guruh, responsibleId]);

  useEffect(() => {
    let active = true;
    setYuklanmoqda(true);
    setXato("");
    discountReportApi.barchasi(filtr)
      .then((javob) => {
        if (!active) return;
        setManba("backend");
        setQatorlar(qatorlarniOlish(javobQatorlari(javob), guruh));
        setXulosa(javobXulosasi(javob) ?? null);
      })
      .catch(async (error) => {
        if (!active) return;
        if (backendYoqmi(error)) {
          // Backendda hisobot yo'q: shu oraliq uchun jadval sotuvlar ro'yxatidan hisoblanadi.
          try {
            const sotuvlar = (await tasdiqlanganSotuvlar(dateFrom, dateTo)).filter(
              (sotuv) => !responsibleId || sotuv.responsibleId === responsibleId,
            );
            if (!active) return;
            const jamiSumma = sotuvlar.reduce((sum, sotuv) => sum + sotuvSummasi(sotuv), 0);
            setManba("sotuvlar");
            setQatorlar(qatorlarniOlish(sotuvlardanQatorlar(sotuvlar, guruh), guruh));
            setXulosa(xulosaSummaryga(sotuvlardanXulosa(sotuvlar), jamiSumma));
          } catch (sotuvXatosi) {
            if (!active) return;
            setQatorlar([]);
            setXulosa(null);
            setXato(getApiErrorMessage(sotuvXatosi));
          }
          return;
        }
        setQatorlar([]);
        setXulosa(null);
        setXato(getApiErrorMessage(error));
      })
      .finally(() => { if (active) setYuklanmoqda(false); });
    return () => { active = false; };
  }, [dateFrom, dateTo, filtr, guruh, responsibleId]);

  const joriyGuruh = guruhlar.find((item) => item.value === guruh) ?? guruhlar[0];

  const korinadigan = useMemo(() => {
    const key = qidiruv.trim().toLowerCase();
    const royxat = key ? qatorlar.filter((item) => item.nomi.toLowerCase().includes(key)) : qatorlar;
    // Kassir, mijoz va mahsulot kesimida eng ko'p chegirma berilganlar tepada ko'rsatiladi.
    return guruh === "CASHIER" || guruh === "CUSTOMER" || guruh === "PRODUCT"
      ? [...royxat].sort((a, b) => b.chegirma - a.chegirma)
      : royxat;
  }, [guruh, qatorlar, qidiruv]);

  const jami = useMemo(() => {
    const chegirma = korinadigan.reduce((sum, item) => sum + item.chegirma, 0);
    const sotuvSummasi = korinadigan.reduce((sum, item) => sum + item.sotuvSummasi, 0);
    return {
      sotuvlarSoni: korinadigan.reduce((sum, item) => sum + item.sotuvlarSoni, 0),
      chegirmaliSotuvlar: korinadigan.reduce((sum, item) => sum + item.chegirmaliSotuvlar, 0),
      sotuvSummasi,
      chegirma,
      bonus: korinadigan.reduce((sum, item) => sum + item.bonus, 0),
      foiz: sotuvSummasi + chegirma > 0 ? (chegirma / (sotuvSummasi + chegirma)) * 100 : 0,
    };
  }, [korinadigan]);

  // Kartalar: backend `summary` bergan bo'lsa shu, bo'lmasa jadval yig'indisi.
  const kartalar = useMemo(() => ({
    chegirma: xulosa?.totalDiscount != null ? raqam(xulosa.totalDiscount) : jami.chegirma,
    chegirmaliSotuvlar: xulosa?.discountedSalesCount != null ? raqam(xulosa.discountedSalesCount) : jami.chegirmaliSotuvlar,
    sotuvlarSoni: xulosa?.totalSalesCount != null ? raqam(xulosa.totalSalesCount) : jami.sotuvlarSoni,
    foiz: xulosa?.avgDiscountPct != null ? raqam(xulosa.avgDiscountPct) : jami.foiz,
    // Zavod bonusi kartalari faqat backend hisoboti bonusni qaytarganda ko'rsatiladi.
    bonus: xulosa?.totalBonus != null ? raqam(xulosa.totalBonus) : null,
    bonusFarqi:
      xulosa?.bonusMinusDiscount != null
        ? raqam(xulosa.bonusMinusDiscount)
        : xulosa?.totalBonus != null
          ? raqam(xulosa.totalBonus) - raqam(xulosa.totalDiscount)
          : null,
  }), [jami, xulosa]);

  // Bonus kesimlari: kun/oy qatorlarida ustun bor; kassir, mijoz va mahsulot kesimida bonus berilmaydi.
  const bonusUstuniBor = guruh === "DAY" || guruh === "MONTH";

  // Kartalardagi bezak ustunlari jadvaldagi real qatorlardan olinadi: kun/oy kesimida oxirgi 7 ta (vaqt tartibida), qolganlarida eng kattalari.
  const bezakQiymatlari = (olish: (item: Qator) => number) => (bonusUstuniBor ? korinadigan.slice(-7) : korinadigan.slice(0, 7)).map(olish);
  const chegirmaliUlushi = kartalar.sotuvlarSoni > 0 ? Math.min(100, (kartalar.chegirmaliSotuvlar / kartalar.sotuvlarSoni) * 100) : 0;

  const bonusUstuni: Ustun<Qator>[] = bonusUstuniBor
    ? [{ id: "bonus", nom: "Zavod bonusi", kenglik: 170, hizalash: "right", katak: (item) => (item.bonus ? <span className="font-black text-emerald-700">{pul(item.bonus)}</span> : <span className="text-slate-300">—</span>), jami: () => <span className="text-emerald-700">{pul(jami.bonus)}</span> }]
    : [];

  const ustunlar: Ustun<Qator>[] = [
    { id: "nomi", nom: joriyGuruh.ustun, kenglik: 240, katak: (item) => <span className="font-black text-slate-900">{item.nomi}</span>, jami: () => `Jami: ${korinadigan.length} ta` },
    { id: "sotuvlarSoni", nom: "Sotuvlar soni", kenglik: 150, hizalash: "right", katak: (item) => son(item.sotuvlarSoni), jami: () => son(jami.sotuvlarSoni) },
    { id: "chegirmaliSotuvlar", nom: "Chegirmali sotuvlar", kenglik: 180, hizalash: "right", katak: (item) => son(item.chegirmaliSotuvlar), jami: () => son(jami.chegirmaliSotuvlar) },
    { id: "sotuvSummasi", nom: "Sotuv summasi", kenglik: 190, hizalash: "right", katak: (item) => pul(item.sotuvSummasi), jami: () => pul(jami.sotuvSummasi) },
    { id: "chegirma", nom: "Chegirma summasi", kenglik: 190, hizalash: "right", katak: (item) => <span className="font-black text-lime-700">{pul(item.chegirma)}</span>, jami: () => <span className="text-lime-700">{pul(jami.chegirma)}</span> },
    { id: "foiz", nom: "Chegirma %", kenglik: 140, hizalash: "right", katak: (item) => `${item.foiz.toFixed(2)}%`, jami: () => `${jami.foiz.toFixed(2)}%` },
    ...bonusUstuni,
  ];

  async function eksport() {
    if (exportYuklanmoqda) return;
    setExportYuklanmoqda(true);
    setXato("");
    try {
      await discountReportApi.export(filtr, "excel");
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setExportYuklanmoqda(false);
    }
  }

  return <div className="space-y-5">
    <ChegirmaXulosaBlok />
    <section className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-black uppercase tracking-wide text-slate-600">Tanlangan davr bo‘yicha batafsil</h2>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <MuddatTanlov dateFrom={dateFrom} dateTo={dateTo} onChange={(from, to) => { setDateFrom(from); setDateTo(to); }} />
        <Dropdown label="Guruhlash" value={guruh} options={guruhlar.map((item) => ({ value: item.value, nomi: item.nomi }))} onChange={(value) => setGuruh(value as DiscountReportGroupBy)} />
        <Dropdown label="Filial" value={branchId} options={[{ value: "", nomi: "Barchasi" }, ...filiallar.map((item) => ({ value: item.id, nomi: item.nomi }))]} onChange={setBranchId} />
        <Dropdown label="Kassir" value={responsibleId} options={[{ value: "", nomi: "Barchasi" }, ...kassirlar]} onChange={setResponsibleId} />
      </div>
    </section>

    <div className={`grid gap-4 sm:grid-cols-2 ${kartalar.bonus != null ? "xl:grid-cols-3" : "xl:grid-cols-4"}`}>
      <KorsatkichKartasi
        icon={BadgePercent}
        nom="Jami chegirma"
        qiymat={pul(kartalar.chegirma)}
        rang="amber"
        belgi={{ matn: "Jami" }}
        ornament={<KartaChiziqlari qiymatlar={bezakQiymatlari((item) => item.chegirma)} klass="bg-amber-400" />}
        yuklanmoqda={yuklanmoqda}
      />
      <KorsatkichKartasi
        icon={ReceiptText}
        nom="Chegirmali sotuvlar"
        qiymat={son(kartalar.chegirmaliSotuvlar)}
        rang="violet"
        belgi={{ matn: `${chegirmaliUlushi.toFixed(chegirmaliUlushi % 1 === 0 ? 0 : 1)}%` }}
        ornament={<KartaOlchagich faol={kartalar.chegirmaliSotuvlar} jami={kartalar.sotuvlarSoni} klass="bg-violet-400" />}
        yuklanmoqda={yuklanmoqda}
      />
      <KorsatkichKartasi
        icon={ShoppingCart}
        nom="Jami sotuvlar"
        qiymat={son(kartalar.sotuvlarSoni)}
        rang="blue"
        belgi={{ matn: "Jami" }}
        ornament={<KartaChiziqlari qiymatlar={bezakQiymatlari((item) => item.sotuvlarSoni)} klass="bg-blue-400" />}
        yuklanmoqda={yuklanmoqda}
      />
      <KorsatkichKartasi
        icon={Percent}
        nom="O‘rtacha chegirma"
        qiymat={`${kartalar.foiz.toFixed(2)}%`}
        rang="rose"
        belgi={{ matn: "o‘rtacha" }}
        ornament={<KartaOlchagich faol={kartalar.foiz} jami={100} klass="bg-rose-400" />}
        yuklanmoqda={yuklanmoqda}
      />
      {kartalar.bonus != null && (
        <>
          <KorsatkichKartasi
            icon={Gift}
            nom="Olingan zavod bonusi"
            qiymat={pul(kartalar.bonus)}
            rang="emerald"
            belgi={{ matn: "Zavoddan" }}
            ornament={bonusUstuniBor ? <KartaChiziqlari qiymatlar={bezakQiymatlari((item) => item.bonus)} klass="bg-emerald-400" /> : undefined}
            yuklanmoqda={yuklanmoqda}
          />
          <KorsatkichKartasi
            icon={Scale}
            nom="Bonus − chegirma"
            qiymat={pul(kartalar.bonusFarqi ?? 0)}
            rang={(kartalar.bonusFarqi ?? 0) >= 0 ? "emerald" : "rose"}
            manfiy={(kartalar.bonusFarqi ?? 0) < 0}
            belgi={(kartalar.bonusFarqi ?? 0) >= 0 ? { matn: "Bonus ustun", ohang: "yaxshi" } : { matn: "Chegirma ustun", ohang: "xavfli" }}
            yuklanmoqda={yuklanmoqda}
          />
        </>
      )}
    </div>
    {responsibleId && kartalar.bonus != null && (
      <p className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-semibold leading-5 text-blue-800">
        Zavod bonusi kassirga bog‘liq emas, shuning uchun kassir filtri tanlanganda olingan bonus 0 ko‘rsatiladi.
      </p>
    )}

    {xato && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}
    {manba === "sotuvlar" && !xato && (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-800">
        Jadval sotuvlar ro‘yxatidan hisoblandi. Filial bo‘yicha filtr, mahsulot kesimi va Excel eksport backend hisoboti ulangach ishlaydi.
      </p>
    )}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <button type="button" disabled={exportYuklanmoqda || manba === "sotuvlar"} title={manba === "sotuvlar" ? "Excel eksport backend hisoboti ulangach ishlaydi" : undefined} onClick={() => void eksport()} className="inline-flex h-12 items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 text-sm font-bold text-orange-600 shadow-sm disabled:opacity-50"><Download size={16}/>{exportYuklanmoqda ? "Yuklanmoqda..." : "Excel (.xlsx)"}</button>
      <label className="relative sm:w-72"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={qidiruv} onChange={(event) => setQidiruv(event.target.value)} placeholder={joriyGuruh.qidiruv} className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-orange-400"/></label>
    </div>
    <section className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm">
      {yuklanmoqda ? <LoadingState matn="Chegirmalar jadvali yuklanmoqda..." ikonka={<BadgePercent size={24} />} className="min-h-[300px] rounded-none border-0 bg-transparent py-12" /> : korinadigan.length ? <KengaytiriladiganJadval ustunlar={ustunlar} qatorlar={korinadigan} jamiBor /> : <div className="flex h-72 items-center justify-center font-bold text-slate-400">Tanlangan filtr bo‘yicha chegirma topilmadi.</div>}
    </section>
  </div>;
}
