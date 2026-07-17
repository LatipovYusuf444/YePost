import { useMemo, useState } from "react";
import { Download, X } from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import KengaytiriladiganJadval, { type Ustun } from "./KengaytiriladiganJadval";
import HisobKitobHujjatKorish, { ochilaganHujjatmi } from "./HisobKitobHujjatKorish";
import { mockHisobKitob } from "./mockData";
import type { HisobKitobHujjati } from "./types";
import { pul, sanadaMi, vaqtFormat } from "./yordamchilar";

type Qator = {
  id: string;
  hujjat: string;
  sana: string;
  bosh: number;
  prixod: number;
  rasxod: number;
  oxirgi: number;
  oyOxiri: boolean;
  manba: HisobKitobHujjati;
};

function csvYuklash(nom: string, ustunlar: string[], qatorlar: (string | number)[][]) {
  const satrlar = [ustunlar, ...qatorlar].map((qator) =>
    qator.map((katak) => `"${String(katak).replace(/"/g, '""')}"`).join(",")
  );
  const blob = new Blob(["﻿" + satrlar.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${nom}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function HisobKitobModal({
  refId,
  nomi,
  dateFrom,
  dateTo,
  onClose,
}: {
  refId: string;
  nomi: string;
  dateFrom: string;
  dateTo: string;
  onClose: () => void;
}) {
  const [ochilganHujjat, setOchilganHujjat] = useState<HisobKitobHujjati | null>(null);

  const qatorlar = useMemo<Qator[]>(() => {
    const barcha = mockHisobKitob.filter((d) => d.refId === refId);
    const opening = barcha
      .filter((d) => dateFrom && d.sana.slice(0, 10) < dateFrom)
      .reduce((s, d) => s + d.prixod - d.rasxod, 0);

    const davr = barcha
      .filter((d) => sanadaMi(d.sana, dateFrom, dateTo))
      .sort((a, b) => a.sana.localeCompare(b.sana));

    let bal = opening;
    return davr.map((d, i) => {
      const bosh = bal;
      bal = bal + d.prixod - d.rasxod;
      const oyKey = d.sana.slice(0, 7);
      const keyingi = davr[i + 1];
      return {
        id: d.id,
        hujjat: d.hujjat,
        sana: d.sana,
        bosh,
        prixod: d.prixod,
        rasxod: d.rasxod,
        oxirgi: bal,
        oyOxiri: !keyingi || keyingi.sana.slice(0, 7) !== oyKey,
        manba: d,
      };
    });
  }, [refId, dateFrom, dateTo]);

  const ustunlar: Ustun<Qator>[] = useMemo(
    () => [
      {
        id: "hujjat",
        nom: "Hujjat",
        kenglik: 280,
        katak: (r) =>
          ochilaganHujjatmi(r.manba) ? (
            <button
              type="button"
              onClick={() => setOchilganHujjat(r.manba)}
              className="truncate text-left font-bold text-orange-600 hover:underline"
            >
              {r.hujjat} <span className="font-semibold text-orange-400">— {vaqtFormat(r.sana)}</span>
            </button>
          ) : (
            <span>
              {r.hujjat} <span className="font-semibold text-gray-400">— {vaqtFormat(r.sana)}</span>
            </span>
          ),
        jami: () => `Jami: ${qatorlar.length} hujjat`,
      },
      { id: "bosh", nom: "Boshlang'ich qoldiq", kenglik: 170, hizalash: "right", katak: (r) => son2(r.bosh) },
      {
        id: "kirim",
        nom: "Kirim",
        kenglik: 140,
        hizalash: "right",
        katak: (r) => (r.prixod ? <span className="font-black text-emerald-600">{son2(r.prixod)}</span> : ""),
      },
      {
        id: "chiqim",
        nom: "Chiqim",
        kenglik: 140,
        hizalash: "right",
        katak: (r) => (r.rasxod ? <span className="font-black text-red-500">{son2(r.rasxod)}</span> : ""),
      },
      {
        id: "oxirgi",
        nom: "Oxirgi qoldiq",
        kenglik: 170,
        hizalash: "right",
        katak: (r) => (
          <span
            className={
              r.oxirgi > 0 ? "font-black text-red-500" : r.oxirgi < 0 ? "font-black text-emerald-600" : "text-gray-500"
            }
          >
            {son2(r.oxirgi)}
          </span>
        ),
        jami: () => {
          const oxirgi = qatorlar.length ? qatorlar[qatorlar.length - 1].oxirgi : 0;
          return (
            <span className={oxirgi > 0 ? "text-red-500" : oxirgi < 0 ? "text-emerald-600" : "text-gray-500"}>
              {son2(oxirgi)}
            </span>
          );
        },
      },
    ],
    [qatorlar]
  );

  function eksport() {
    csvYuklash(
      `hisob-kitob-${nomi}`,
      ["Hujjat", "Sana", "Boshlang'ich qoldiq", "Kirim", "Chiqim", "Oxirgi qoldiq"],
      qatorlar.map((r) => [r.hujjat, vaqtFormat(r.sana), r.bosh, r.prixod, r.rasxod, r.oxirgi])
    );
  }

  return (
    <AppModal>
      <div className="scrollbar-hidden max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-orange-500">O'zaro hisob-kitob</p>
            <h2 className="mt-1 truncate text-2xl font-black text-gray-950">{nomi}</h2>
            <p className="mt-0.5 text-xs font-semibold text-gray-400">
              Oy oxiridagi qoldiq ko'k rangda. Tovar hujjatiga bosing — ochiladi.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <button
            onClick={eksport}
            className="inline-flex h-10 items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 text-sm font-bold text-orange-600 shadow-sm transition hover:bg-orange-50"
          >
            <Download size={16} />
            Excel (CSV)
          </button>

          {qatorlar.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-orange-200 bg-orange-50/30 text-center font-bold text-gray-500">
              Tanlangan muddatda hujjat yo'q.
            </div>
          ) : (
            <KengaytiriladiganJadval
              ustunlar={ustunlar}
              qatorlar={qatorlar}
              jamiBor
              kengaytir
              qatorKlass={(r) => (r.oyOxiri ? "bg-sky-50 text-sky-900 font-bold" : "")}
            />
          )}
        </div>
      </div>

      {ochilganHujjat && (
        <HisobKitobHujjatKorish
          hujjat={ochilganHujjat}
          kontragent={nomi}
          onYopish={() => setOchilganHujjat(null)}
        />
      )}
    </AppModal>
  );
}

// Ishorali son (manfiy − bilan), pul formatida.
function son2(value: number) {
  return value < 0 ? `−${pul(Math.abs(value))}` : pul(value);
}
