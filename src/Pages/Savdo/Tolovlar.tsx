import { CreditCard } from "lucide-react";
import type { Sotuv } from "@/types/savdo";
import {
  mijozNomi,
  pulniFormatlash,
  sananiFormatlash,
  sotuvRaqami,
  tolovTuriMatni,
} from "./savdoYordamchilari";

type TolovlarProps = {
  sotuvlar: Sotuv[];
};

export default function Tolovlar({ sotuvlar }: TolovlarProps) {
  const tolovlar = sotuvlar.flatMap((sotuv) =>
    (sotuv.payments ?? []).map((tolov, index) => ({
      ...tolov,
      id: tolov.id ?? `${sotuv.id}-${index}`,
      sotuv,
    }))
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-orange-50 text-xs uppercase tracking-wide text-orange-900/60">
            <tr>
              <th className="px-5 py-4">Sotuv</th>
              <th className="px-5 py-4">Mijoz</th>
              <th className="px-5 py-4">To'lov turi</th>
              <th className="px-5 py-4">Summa</th>
              <th className="px-5 py-4">Sana</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-orange-100/70">
            {tolovlar.map((tolov) => (
              <tr key={tolov.id} className="hover:bg-orange-50/60">
                <td className="px-5 py-4 font-bold text-orange-600">
                  {sotuvRaqami(tolov.sotuv)}
                </td>
                <td className="px-5 py-4 font-semibold text-gray-900">
                  {mijozNomi(tolov.sotuv)}
                </td>
                <td className="px-5 py-4">{tolovTuriMatni[tolov.paymentType]}</td>
                <td className="px-5 py-4 font-bold">{pulniFormatlash(tolov.amount)}</td>
                <td className="px-5 py-4">{sananiFormatlash(tolov.sotuv.createdAt)}</td>
              </tr>
            ))}

            {tolovlar.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center">
                  <CreditCard className="mx-auto text-orange-200" size={40} />
                  <p className="mt-3 font-semibold text-gray-500">
                    To'lov ma'lumotlari mavjud emas
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
