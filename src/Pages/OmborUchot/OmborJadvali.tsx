import { MapPin, Trash2, Warehouse } from "lucide-react";
import type { OmborItem } from "./types";
import { sana } from "./yordamchilar";

type Props = {
  omborlar: OmborItem[];
  onTahrirlash: (ombor: OmborItem) => void;
  onOchirish: (id: string) => void;
};

export default function OmborJadvali({ omborlar, onTahrirlash, onOchirish }: Props) {
  if (omborlar.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-orange-200 bg-white p-14 text-center">
        <Warehouse className="mx-auto text-orange-200" size={42} />
        <p className="mt-3 font-bold text-gray-500">Ombor mavjud emas</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-orange-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-orange-50/60 text-left text-xs font-bold uppercase tracking-wide text-orange-500">
            <tr>
              <th className="px-5 py-3">Nomi</th>
              <th className="px-5 py-3">Joylashuv</th>
              <th className="px-5 py-3">Ishlash vaqti</th>
              <th className="px-5 py-3">Kim tomonidan yaratilgan</th>
              <th className="px-5 py-3">Yaratilgan sana</th>
              <th className="px-5 py-3">Mas'ul shaxs</th>
              <th className="px-5 py-3">Mas'ul shaxs nomeri</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {omborlar.map((ombor) => (
              <tr
                key={ombor.id}
                onClick={() => onTahrirlash(ombor)}
                className="cursor-pointer hover:bg-orange-50/30"
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                      <Warehouse size={17} />
                    </span>
                    <span className="font-black text-gray-950">{ombor.nomi}</span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <p className="text-gray-600">{ombor.manzil || "—"}</p>
                  {ombor.gps && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-gray-400">
                      <MapPin size={12} />
                      {ombor.gps}
                    </p>
                  )}
                </td>
                <td className="px-5 py-3 text-gray-600">{ombor.ishlashVaqti || "—"}</td>
                <td className="px-5 py-3 text-gray-600">{ombor.yaratganShaxs || "—"}</td>
                <td className="px-5 py-3 text-gray-500">
                  {ombor.yaratilganSana ? sana(ombor.yaratilganSana) : "—"}
                </td>
                <td className="px-5 py-3 text-gray-600">{ombor.masulShaxs || "—"}</td>
                <td className="px-5 py-3 font-semibold text-gray-600">
                  {ombor.masulShaxsTel || "—"}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      ombor.faol ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {ombor.faol ? "Faol" : "Faol emas"}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex justify-end">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        onOchirish(ombor.id);
                      }}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500 transition hover:bg-red-100"
                      aria-label="Omborni o'chirish"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
