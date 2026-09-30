import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import KengaytiriladiganJadval, { type Ustun } from "../HisobotUchot/KengaytiriladiganJadval";
import KassaAmaliyotModal from "../KassaUchot/KassaAmaliyotModal";
import type { KassaAmaliyoti } from "../KassaUchot/types";
import { sanaFormat, summaFormat } from "../KassaUchot/yordamchilar";
import { sotuvlarRoyxatiniOlish } from "@/api/savdoApi";
import { barchaFinanceTransactions } from "@/api/tolovApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";

// Mijozning kassadagi to'lovlari (pul tushgan/qaytarilgan). Umumiy store'dan o'qiladi.
// Qatorni bosganda "pul tushgan" (kassa amaliyoti) oynasi ochiladi.
export default function XaridorTolovlariTab({ xaridorId }: { xaridorId: string }) {
  const { t } = useTranslation("kassa_uchot");
  const [tolovlar, setTolovlar] = useState<KassaAmaliyoti[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [xatolik, setXatolik] = useState("");
  const [korilayotgan, setKorilayotgan] = useState<KassaAmaliyoti | null>(null);
  const [yangilanish, setYangilanish] = useState(0);

  useEffect(() => {
    const yangilash = () => setYangilanish((value) => value + 1);
    window.addEventListener("savdo:yangilandi", yangilash);
    return () => window.removeEventListener("savdo:yangilandi", yangilash);
  }, []);

  useEffect(() => {
    let active = true;
    setYuklanmoqda(true);
    setXatolik("");
    Promise.all([
      sotuvlarRoyxatiniOlish(),
      barchaFinanceTransactions({ source: "SALE" }),
    ])
      .then(([sales, transactions]) => {
        if (!active) return;
        const saleIds = new Set(sales.filter((sale) => sale.customerId === xaridorId || sale.customer?.id === xaridorId).map((sale) => sale.id));
        setTolovlar(transactions
          .filter((item) => item.counterpartyId === xaridorId || Boolean(item.refId && saleIds.has(item.refId)))
          .map<KassaAmaliyoti>((item) => ({
            id: item.id,
            kanal: item.paymentType === "BANK" ? "bank" : item.paymentType === "CARD" ? "ilova" : "naqd",
            yonalish: "tushum",
            turi: "donalik_savdo",
            holat: "tasdiqlangan",
            xaridorId,
            raqam: item.refDocNumber || item.id.slice(0, 8).toUpperCase(),
            nomi: item.refDocNumber || t("xaridorTab.salePayment"),
            kontragent: "",
            summa: Number(item.amount ?? 0),
            sana: item.date,
            masul: t("systemFallback"),
            izoh: item.note ?? "",
            backendSource: "SALE",
            backendRefId: item.refId ?? item.id,
            readonly: true,
          }))
          .sort((a, b) => new Date(b.sana).getTime() - new Date(a.sana).getTime()));
      })
      .catch((error) => setXatolik(getApiErrorMessage(error)))
      .finally(() => { if (active) setYuklanmoqda(false); });
    return () => { active = false; };
  }, [t, xaridorId, yangilanish]);

  if (yuklanmoqda) {
    return <div className="px-9 py-7 text-sm font-bold text-slate-500">{t("xaridorTab.loading")}</div>;
  }

  if (xatolik) {
    return <div className="px-9 py-7 text-sm font-bold text-red-600">{xatolik}</div>;
  }

  if (tolovlar.length === 0) {
    return (
      <div className="px-9 py-7">
        <p className="rounded-[26px] border border-dashed border-orange-200 bg-white/60 p-16 text-center font-bold text-slate-400">
          {t("xaridorTab.empty")}
        </p>
      </div>
    );
  }

  const ustunlar: Ustun<KassaAmaliyoti>[] = [
    {
      id: "sana",
      nom: t("xaridorTab.columns.sana"),
      kenglik: 130,
      katak: (a) => <span className="text-slate-500">{sanaFormat(a.sana)}</span>,
    },
    {
      id: "raqam",
      nom: t("xaridorTab.columns.hujjat"),
      kenglik: 130,
      katak: (a) => <span className="font-black text-slate-900">{a.raqam}</span>,
    },
    {
      id: "turi",
      nom: t("xaridorTab.columns.turi"),
      kenglik: 220,
      katak: (a) => (
        <span className="inline-block rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-bold text-[#2563EB]">
          {t(`types.${a.turi}`)}
        </span>
      ),
    },
    {
      id: "kanal",
      nom: t("xaridorTab.columns.kanal"),
      kenglik: 120,
      katak: (a) => <span className="text-slate-500">{t(`channels.${a.kanal}`)}</span>,
    },
    {
      id: "izoh",
      nom: t("xaridorTab.columns.izoh"),
      kenglik: 180,
      katak: (a) => <span className="text-slate-500">{a.izoh || "—"}</span>,
    },
    {
      id: "summa",
      nom: t("xaridorTab.columns.summa"),
      kenglik: 150,
      katak: (a) => (
        <span
          className={`font-black ${a.yonalish === "tushum" ? "text-emerald-600" : "text-red-500"}`}
        >
          {a.yonalish === "tushum" ? "+" : "−"} {summaFormat(a.summa)}
        </span>
      ),
    },
  ];

  return (
    <div className="px-9 py-7">
      <KengaytiriladiganJadval
        ustunlar={ustunlar}
        qatorlar={tolovlar}
        kengaytir
        onQatorBosildi={setKorilayotgan}
      />

      {korilayotgan && (
        <KassaAmaliyotModal
          boshlangich={korilayotgan}
          boshlangichKanal={korilayotgan.kanal}
          boshlangichTuri={korilayotgan.turi}
          onYopish={() => setKorilayotgan(null)}
          onSaqlash={() => setKorilayotgan(null)}
        />
      )}
    </div>
  );
}
