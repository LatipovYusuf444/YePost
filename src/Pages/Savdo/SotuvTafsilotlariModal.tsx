import { LoaderCircle, PackageCheck, Trash2, X } from "lucide-react";
import type { Sotuv } from "@/types/savdo";
import {
  mijozNomi,
  pulniFormatlash,
  sananiFormatlash,
  sotuvHolati,
  sotuvHolatiMatni,
  sotuvRaqami,
  sotuvSummasi,
  tolovTuriMatni,
} from "./savdoYordamchilari";

type SotuvTafsilotlariModalProps = {
  sotuv: Sotuv;
  amalBajarilmoqda: boolean;
  onYopish: () => void;
  onTasdiqlash: (sotuvId: string) => void;
  onBekorQilish: (sotuvId: string) => void;
};

export default function SotuvTafsilotlariModal({
  sotuv,
  amalBajarilmoqda,
  onYopish,
  onTasdiqlash,
  onBekorQilish,
}: SotuvTafsilotlariModalProps) {
  const holat = sotuvHolati(sotuv);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-950/55 p-4 backdrop-blur-sm">
      <section className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[30px] bg-white shadow-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between border-b border-orange-100 bg-white/95 p-6 backdrop-blur-xl">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-orange-500">
              Sotuv {sotuvRaqami(sotuv)}
            </p>
            <h2 className="mt-1 text-2xl font-black text-gray-950">{mijozNomi(sotuv)}</h2>
            <p className="mt-1 text-sm text-gray-500">{sananiFormatlash(sotuv.createdAt)}</p>
          </div>
          <button
            onClick={onYopish}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100 text-gray-600 hover:bg-orange-500 hover:text-white"
            aria-label="Oynani yopish"
          >
            <X size={20} />
          </button>
        </header>

        <div className="space-y-6 p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-orange-50 p-4">
              <p className="text-xs font-bold uppercase text-orange-500">Jami summa</p>
              <p className="mt-2 text-xl font-black text-gray-950">
                {pulniFormatlash(sotuvSummasi(sotuv))}
              </p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-xs font-bold uppercase text-gray-400">Holati</p>
              <p className="mt-2 text-lg font-black text-gray-800">
                {sotuvHolatiMatni[holat]}
              </p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-xs font-bold uppercase text-gray-400">Ombor</p>
              <p className="mt-2 text-lg font-black text-gray-800">
                {sotuv.warehouse?.name ?? "—"}
              </p>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-lg font-black text-gray-900">Mahsulotlar</h3>
            <div className="overflow-hidden rounded-2xl border border-gray-100">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Mahsulot</th>
                    <th className="px-4 py-3">Miqdor</th>
                    <th className="px-4 py-3">Narx</th>
                    <th className="px-4 py-3">Jami</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(sotuv.items ?? []).map((mahsulot, index) => (
                    <tr key={mahsulot.id ?? `${mahsulot.modificationId}-${index}`}>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {mahsulot.modification?.product?.name ??
                          mahsulot.modification?.name ??
                          mahsulot.modificationId}
                      </td>
                      <td className="px-4 py-3">{mahsulot.quantity}</td>
                      <td className="px-4 py-3">{pulniFormatlash(mahsulot.price)}</td>
                      <td className="px-4 py-3 font-bold">
                        {pulniFormatlash(
                          mahsulot.quantity * mahsulot.price -
                            Number(mahsulot.discount ?? 0)
                        )}
                      </td>
                    </tr>
                  ))}
                  {(sotuv.items ?? []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                        Mahsulot ma'lumoti mavjud emas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-lg font-black text-gray-900">To'lovlar</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {(sotuv.payments ?? []).map((tolov, index) => (
                <div
                  key={tolov.id ?? `${tolov.paymentType}-${index}`}
                  className="flex items-center justify-between rounded-2xl border border-orange-100 p-4"
                >
                  <span className="font-semibold text-gray-600">
                    {tolovTuriMatni[tolov.paymentType]}
                  </span>
                  <span className="font-black text-gray-950">
                    {pulniFormatlash(tolov.amount)}
                  </span>
                </div>
              ))}
              {(sotuv.payments ?? []).length === 0 && (
                <p className="text-sm text-gray-400">To'lov kiritilmagan.</p>
              )}
            </div>
          </div>

          {sotuv.note && (
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-xs font-bold uppercase text-gray-400">Izoh</p>
              <p className="mt-2 text-sm text-gray-700">{sotuv.note}</p>
            </div>
          )}

          {holat === "DRAFT" && (
            <div className="flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
              <button
                disabled={amalBajarilmoqda}
                onClick={() => onBekorQilish(sotuv.id)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-red-50 px-5 text-sm font-bold text-red-600 hover:bg-red-500 hover:text-white disabled:opacity-50"
              >
                <Trash2 size={17} />
                Bekor qilish
              </button>
              <button
                disabled={amalBajarilmoqda}
                onClick={() => onTasdiqlash(sotuv.id)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {amalBajarilmoqda ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : (
                  <PackageCheck size={17} />
                )}
                Sotuvni tasdiqlash
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

