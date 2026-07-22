import { useEffect, useState } from "react";
import KengaytiriladiganJadval, { type Ustun } from "../HisobotUchot/KengaytiriladiganJadval";
import KassaAmaliyotModal from "../KassaUchot/KassaAmaliyotModal";
import type { KassaAmaliyoti } from "../KassaUchot/types";
import { amaliyotTuriMatni, kanalMatni, sanaFormat, summaFormat } from "../KassaUchot/yordamchilar";
import { sotuvlarRoyxatiniOlish } from "@/api/savdoApi";
import { financeTransactions } from "@/api/tolovApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";

// Mijozning kassadagi to'lovlari (pul tushgan/qaytarilgan). Umumiy store'dan o'qiladi.
// Qatorni bosganda "pul tushgan" (kassa amaliyoti) oynasi ochiladi.
export default function XaridorTolovlariTab({ xaridorId }: { xaridorId: string }) {
  const [tolovlar, setTolovlar] = useState<KassaAmaliyoti[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [xatolik, setXatolik] = useState("");
  const [korilayotgan, setKorilayotgan] = useState<KassaAmaliyoti | null>(null);

  useEffect(() => {
    let active = true;
    setYuklanmoqda(true);
    setXatolik("");
    Promise.all([sotuvlarRoyxatiniOlish(), financeTransactions({ source: "SALE", page: 1, pageSize: 100 })])
      .then(([sales, transactions]) => {
        if (!active) return;
        const saleIds = new Set(sales.filter((sale) => sale.customerId === xaridorId || sale.customer?.id === xaridorId).map((sale) => sale.id));
        setTolovlar(transactions.items
          .filter((item) => Boolean(item.refId && saleIds.has(item.refId)))
          .map<KassaAmaliyoti>((item) => ({
            id: item.id,
            kanal: item.paymentType === "BANK" ? "bank" : item.paymentType === "CARD" ? "ilova" : "naqd",
            yonalish: "tushum",
            turi: "donalik_savdo",
            holat: "tasdiqlangan",
            xaridorId,
            raqam: item.refDocNumber || item.id.slice(0, 8).toUpperCase(),
            nomi: item.refDocNumber || "Sotuv to'lovi",
            kontragent: "",
            summa: Number(item.amount ?? 0),
            sana: item.date,
            masul: "Tizim",
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
  }, [xaridorId]);

  if (yuklanmoqda) {
    return <div className="px-9 py-7 text-sm font-bold text-slate-500">To'lovlar backenddan yuklanmoqda...</div>;
  }

  if (xatolik) {
    return <div className="px-9 py-7 text-sm font-bold text-red-600">{xatolik}</div>;
  }

  if (tolovlar.length === 0) {
    return (
      <div className="px-9 py-7">
        <p className="rounded-[26px] border border-dashed border-orange-200 bg-white/60 p-16 text-center font-bold text-slate-400">
          Bu mijozda kassa to'lovlari yo'q
        </p>
      </div>
    );
  }

  const ustunlar: Ustun<KassaAmaliyoti>[] = [
    {
      id: "sana",
      nom: "Sana",
      kenglik: 130,
      katak: (a) => <span className="text-slate-500">{sanaFormat(a.sana)}</span>,
    },
    {
      id: "raqam",
      nom: "Hujjat",
      kenglik: 130,
      katak: (a) => <span className="font-black text-slate-900">{a.raqam}</span>,
    },
    {
      id: "turi",
      nom: "Turi",
      kenglik: 220,
      katak: (a) => (
        <span className="inline-block rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-bold text-[#FF6A00]">
          {amaliyotTuriMatni[a.turi]}
        </span>
      ),
    },
    {
      id: "kanal",
      nom: "To'lov turi",
      kenglik: 120,
      katak: (a) => <span className="text-slate-500">{kanalMatni[a.kanal]}</span>,
    },
    {
      id: "izoh",
      nom: "Izoh",
      kenglik: 180,
      katak: (a) => <span className="text-slate-500">{a.izoh || "—"}</span>,
    },
    {
      id: "summa",
      nom: "Summa",
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
