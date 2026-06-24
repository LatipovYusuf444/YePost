import { Eye, ReceiptText } from "lucide-react";
import type { Sotuv } from "@/types/savdo";
import {
  masulNomi,
  mijozNomi,
  pulniFormatlash,
  sananiFormatlash,
  sotuvHolati,
  sotuvHolatiMatni,
  sotuvRaqami,
  sotuvSummasi,
} from "./savdoYordamchilari";

type SotuvlarJadvaliProps = {
  sotuvlar: Sotuv[];
  onSotuvniOchish: (sotuv: Sotuv) => void;
  boshMatn?: string;
};

const holatRanglari = {
  DRAFT: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-red-50 text-red-600",
};

export default function SotuvlarJadvali({
  sotuvlar,
  onSotuvniOchish,
  boshMatn = "Sotuv topilmadi",
}: SotuvlarJadvaliProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[940px] border-collapse text-left text-sm">
          <thead className="bg-orange-50 text-xs uppercase tracking-wide text-orange-900/60">
            <tr>
              <th className="px-5 py-4">Sotuv raqami</th>
              <th className="px-5 py-4">Mijoz</th>
              <th className="px-5 py-4">Summa</th>
              <th className="px-5 py-4">Sana</th>
              <th className="px-5 py-4">Mas'ul</th>
              <th className="px-5 py-4">Holati</th>
              <th className="px-5 py-4 text-right">Amal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-orange-100/70 text-gray-700">
            {sotuvlar.map((sotuv) => {
              const holat = sotuvHolati(sotuv);

              return (
                <tr key={sotuv.id} className="transition hover:bg-orange-50/60">
                  <td className="px-5 py-4 font-bold text-orange-600">
                    {sotuvRaqami(sotuv)}
                  </td>
                  <td className="px-5 py-4 font-semibold text-gray-900">
                    {mijozNomi(sotuv)}
                  </td>
                  <td className="px-5 py-4 font-semibold">
                    {pulniFormatlash(sotuvSummasi(sotuv))}
                  </td>
                  <td className="px-5 py-4">{sananiFormatlash(sotuv.createdAt)}</td>
                  <td className="px-5 py-4">{masulNomi(sotuv)}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${holatRanglari[holat]}`}
                    >
                      {sotuvHolatiMatni[holat]}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => onSotuvniOchish(sotuv)}
                      className="inline-flex h-9 items-center gap-2 rounded-xl bg-orange-50 px-3 text-xs font-bold text-orange-600 transition hover:bg-orange-500 hover:text-white"
                    >
                      <Eye size={15} />
                      Ko'rish
                    </button>
                  </td>
                </tr>
              );
            })}

            {sotuvlar.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center">
                  <ReceiptText className="mx-auto text-orange-200" size={40} />
                  <p className="mt-3 font-semibold text-gray-500">{boshMatn}</p>
                  <p className="mt-1 text-sm text-gray-400">
                    Serverdan ma'lumot kelganda shu yerda ko'rinadi.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
