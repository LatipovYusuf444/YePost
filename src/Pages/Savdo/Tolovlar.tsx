import { CreditCard } from "lucide-react";
import type { Qaytarish, Sotuv, TolovTuri } from "@/types/savdo";
import {
  mijozNomi,
  pulniFormatlash,
  qaytarishSummasi,
  sananiFormatlash,
  sotuvRaqami,
  tolovTuriMatni,
} from "./savdoYordamchilari";

type TolovlarProps = {
  sotuvlar: Sotuv[];
  qaytarishlar: Qaytarish[];
};

type QaytarimTolovUsuli = Extract<TolovTuri, "CASH" | "CARD" | "BANK">;

export default function Tolovlar({ sotuvlar, qaytarishlar }: TolovlarProps) {
  const sotuvTolovlari = sotuvlar.flatMap((sotuv) =>
    (sotuv.payments ?? []).map((tolov, index) => ({
      ...tolov,
      id: tolov.id ?? `${sotuv.id}-${index}`,
      sotuv,
      turi: "Kirim" as const,
      sana: sotuv.createdAt,
    }))
  );
  const qaytarilganTolovlar: Array<{
    id: string;
    sotuv?: Sotuv;
    paymentType: QaytarimTolovUsuli;
    amount: number;
    turi: "Qaytarim";
    sana?: string;
  }> = [];
  const qaytarilganSummaBySale = new Map<string, number>();

  qaytarishlar
    .filter((qaytarish) => String(qaytarish.status ?? "").toUpperCase() === "CONFIRMED")
    .sort(
      (a, b) =>
        new Date(a.updatedAt ?? a.createdAt ?? 0).getTime() -
        new Date(b.updatedAt ?? b.createdAt ?? 0).getTime()
    )
    .forEach((qaytarish) => {
      const sotuv = qaytarish.sale ?? sotuvlar.find((item) => item.id === qaytarish.saleId);
      const pulliTolovlar = (sotuv?.payments ?? []).filter((tolov) =>
        ["CASH", "CARD", "BANK"].includes(String(tolov.paymentType ?? "").toUpperCase())
      );
      const jamiTolangan = pulliTolovlar.reduce(
        (summa, tolov) => summa + Number(tolov.amount ?? 0),
        0
      );
      const avvalQaytarilgan = qaytarilganSummaBySale.get(qaytarish.saleId) ?? 0;
      const amount = Math.min(qaytarishSummasi(qaytarish), Math.max(jamiTolangan - avvalQaytarilgan, 0));
      const paymentType = (pulliTolovlar[0]?.paymentType ?? "CASH") as QaytarimTolovUsuli;

      if (amount <= 0) return;

      qaytarilganSummaBySale.set(qaytarish.saleId, avvalQaytarilgan + amount);
      qaytarilganTolovlar.push({
        id: `return-${qaytarish.id}`,
        sotuv,
        paymentType,
        amount,
        turi: "Qaytarim" as const,
        sana: qaytarish.updatedAt ?? qaytarish.createdAt,
      });
    });
  const tolovlar = [...sotuvTolovlari, ...qaytarilganTolovlar];

  return (
    <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-orange-50 text-xs uppercase tracking-wide text-orange-900/60">
            <tr>
              <th className="px-5 py-4">Sotuv</th>
              <th className="px-5 py-4">Mijoz</th>
              <th className="px-5 py-4">Turi</th>
              <th className="px-5 py-4">To'lov turi</th>
              <th className="px-5 py-4">Summa</th>
              <th className="px-5 py-4">Sana</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-orange-100/70">
            {tolovlar.map((tolov) => (
              <tr key={tolov.id} className="hover:bg-orange-50/60">
                <td className="px-5 py-4 font-bold text-orange-600">
                  {tolov.sotuv ? sotuvRaqami(tolov.sotuv) : "Qaytarish"}
                </td>
                <td className="px-5 py-4 font-semibold text-gray-900">
                  {tolov.sotuv ? mijozNomi(tolov.sotuv) : "Mijoz"}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      tolov.turi === "Qaytarim"
                        ? "bg-red-50 text-red-600"
                        : "bg-emerald-50 text-emerald-600"
                    }`}
                  >
                    {tolov.turi}
                  </span>
                </td>
                <td className="px-5 py-4">{tolovTuriMatni[tolov.paymentType]}</td>
                <td
                  className={`px-5 py-4 font-bold ${
                    tolov.turi === "Qaytarim" ? "text-red-600" : "text-gray-900"
                  }`}
                >
                  {tolov.turi === "Qaytarim" ? "-" : ""}
                  {pulniFormatlash(tolov.amount)}
                </td>
                <td className="px-5 py-4">{sananiFormatlash(tolov.sana)}</td>
              </tr>
            ))}

            {tolovlar.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
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
