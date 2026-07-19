import { useMemo, useState } from "react";
import KengaytiriladiganJadval, { type Ustun } from "../HisobotUchot/KengaytiriladiganJadval";
import KassaAmaliyotModal from "../KassaUchot/KassaAmaliyotModal";
import type { KassaAmaliyoti } from "../KassaUchot/types";
import { amaliyotTuriMatni, kanalMatni, sanaFormat, summaFormat } from "../KassaUchot/yordamchilar";
import { useUchotStore } from "@/store/uchotStore";

// Mijozning kassadagi to'lovlari (pul tushgan/qaytarilgan). Umumiy store'dan o'qiladi.
// Qatorni bosganda "pul tushgan" (kassa amaliyoti) oynasi ochiladi.
export default function XaridorTolovlariTab({ xaridorId }: { xaridorId: string }) {
  const amaliyotlar = useUchotStore((s) => s.amaliyotlar);
  const amaliyotSaqlash = useUchotStore((s) => s.amaliyotSaqlash);
  const [korilayotgan, setKorilayotgan] = useState<KassaAmaliyoti | null>(null);

  const tolovlar = useMemo(
    () =>
      amaliyotlar
        .filter((a) => a.xaridorId === xaridorId)
        .sort((a, b) => new Date(b.sana).getTime() - new Date(a.sana).getTime()),
    [amaliyotlar, xaridorId]
  );

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
          onSaqlash={(amaliyot) => {
            amaliyotSaqlash(amaliyot);
            setKorilayotgan(null);
          }}
        />
      )}
    </div>
  );
}
