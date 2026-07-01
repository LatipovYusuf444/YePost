import { useMemo, useState } from "react";
import { Eye, LoaderCircle, RotateCcw } from "lucide-react";
import type {
  Qaytarish as QaytarishTuri,
  QaytarishSababi,
  QaytarishYaratishMalumoti,
  Sotuv,
} from "@/types/savdo";
import {
  mijozNomi,
  pulniFormatlash,
  qaytarishSummasi,
  sananiFormatlash,
  sotuvHolati,
  sotuvRaqami,
} from "./savdoYordamchilari";
import QaytarishTafsilotlariModal from "./QaytarishTafsilotlariModal";
import SavdoSelect from "./SavdoSelect";

type QaytarishProps = {
  sotuvlar: Sotuv[];
  qaytarishlar: QaytarishTuri[];
  amalBajarilmoqda: boolean;
  onYaratish: (malumot: QaytarishYaratishMalumoti) => Promise<boolean>;
  onTasdiqlash: (qaytarishId: string) => Promise<boolean>;
  onBekorQilish: (qaytarishId: string) => Promise<boolean>;
};

const sababMatni: Record<QaytarishSababi, string> = {
  DEFECT: "Nuqsonli mahsulot",
  WRONG: "Noto'g'ri mahsulot",
  OTHER: "Boshqa sabab",
};

export default function Qaytarish({
  sotuvlar,
  qaytarishlar,
  amalBajarilmoqda,
  onYaratish,
  onTasdiqlash,
  onBekorQilish,
}: QaytarishProps) {
  const qaytarishMumkinSotuvlar = useMemo(
    () =>
      sotuvlar.filter(
        (sotuv) =>
          sotuvHolati(sotuv) === "CONFIRMED" &&
          Boolean(sotuv.warehouseId ?? sotuv.warehouse?.id) &&
          (sotuv.items?.length ?? 0) > 0
      ),
    [sotuvlar]
  );
  const [saleId, setSaleId] = useState("");
  const [reason, setReason] = useState<QaytarishSababi>("OTHER");
  const [note, setNote] = useState("");
  const [xatolik, setXatolik] = useState("");
  const [tanlanganId, setTanlanganId] = useState<string | null>(null);

  async function toliqQaytarishYaratish() {
    setXatolik("");
    const sotuv = sotuvlar.find((item) => item.id === saleId);

    if (!sotuv) {
      setXatolik("Qaytariladigan sotuvni tanlang.");
      return;
    }

    const items = (sotuv.items ?? [])
      .filter((item) => item.id && item.modificationId)
      .map((item) => ({
        saleItemId: item.id as string,
        modificationId: item.modificationId,
        quantity: item.quantity,
        price: item.price,
      }));

    if (items.length === 0) {
      setXatolik("Sotuv mahsulotlarida saleItemId mavjud emas.");
      return;
    }

    const muvaffaqiyatli = await onYaratish({
      saleId: sotuv.id,
      warehouseId: sotuv.warehouseId ?? sotuv.warehouse?.id ?? "",
      responsibleId: sotuv.responsibleId,
      reason,
      note: note.trim() || undefined,
      items,
    });

    if (muvaffaqiyatli) {
      setSaleId("");
      setReason("OTHER");
      setNote("");
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <label className="flex-1 space-y-2 text-sm font-bold text-gray-700">
            <span>Tasdiqlangan sotuv</span>
            <SavdoSelect
              value={saleId}
              onChange={setSaleId}
              placeholder="Sotuvni tanlang"
              buttonClassName="h-12"
              options={qaytarishMumkinSotuvlar.map((sotuv) => ({
                value: sotuv.id,
                label: `${sotuvRaqami(sotuv)} — ${mijozNomi(sotuv)}`,
              }))}
            />
          </label>
          <label className="space-y-2 text-sm font-bold text-gray-700">
            <span>Sabab</span>
            <SavdoSelect
              value={reason}
              onChange={(value) => setReason(value as QaytarishSababi)}
              buttonClassName="h-12"
              options={Object.entries(sababMatni).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </label>
          <label className="flex-1 space-y-2 text-sm font-bold text-gray-700">
            <span>Izoh</span>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="h-12 w-full rounded-2xl border border-gray-200 px-4 outline-none focus:border-orange-400"
              placeholder="Qaytarish sababi bo'yicha izoh"
            />
          </label>
          <button
            onClick={toliqQaytarishYaratish}
            disabled={amalBajarilmoqda}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {amalBajarilmoqda ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <RotateCcw size={17} />
            )}
            To'liq qaytarish
          </button>
        </div>
        {xatolik && <p className="mt-3 text-sm font-bold text-red-600">{xatolik}</p>}
        {qaytarishMumkinSotuvlar.length === 0 && (
          <p className="mt-3 text-sm text-amber-600">
            Qaytarish uchun mahsulotli va tasdiqlangan sotuv mavjud emas.
          </p>
        )}
      </section>

      <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-orange-50 text-xs uppercase tracking-wide text-orange-900/60">
              <tr>
                <th className="px-5 py-4">Hujjat</th>
                <th className="px-5 py-4">Sotuv</th>
                <th className="px-5 py-4">Sabab</th>
                <th className="px-5 py-4">Summa</th>
                <th className="px-5 py-4">Sana</th>
                <th className="px-5 py-4">Holati</th>
                <th className="px-5 py-4 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-100/70">
              {qaytarishlar.map((qaytarish) => {
                const holat = String(qaytarish.status ?? "DRAFT").toUpperCase();

                return (
                  <tr key={qaytarish.id} className="hover:bg-orange-50/60">
                    <td className="px-5 py-4 font-bold text-orange-600">
                      {qaytarish.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-5 py-4">
                      {qaytarish.sale ? sotuvRaqami(qaytarish.sale) : qaytarish.saleId}
                    </td>
                    <td className="px-5 py-4">
                      {sababMatni[qaytarish.reason as QaytarishSababi] ??
                        qaytarish.reason ??
                        "Boshqa"}
                    </td>
                    <td className="px-5 py-4 font-bold">
                      {pulniFormatlash(qaytarishSummasi(qaytarish))}
                    </td>
                    <td className="px-5 py-4">{sananiFormatlash(qaytarish.createdAt)}</td>
                    <td className="px-5 py-4 font-semibold">{holat}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setTanlanganId(qaytarish.id)}
                          className="inline-flex items-center gap-1 rounded-xl bg-orange-50 px-3 py-2 text-xs font-bold text-orange-600"
                        >
                          <Eye size={14} />
                          Ko'rish
                        </button>
                        {holat === "DRAFT" && (
                          <>
                            <button
                              disabled={amalBajarilmoqda}
                              onClick={() => onBekorQilish(qaytarish.id)}
                              className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600"
                            >
                              Bekor qilish
                            </button>
                            <button
                              disabled={amalBajarilmoqda}
                              onClick={() => onTasdiqlash(qaytarish.id)}
                              className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
                            >
                              Tasdiqlash
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {qaytarishlar.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-gray-400">
                    Qaytarish hujjatlari mavjud emas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {tanlanganId && (
        <QaytarishTafsilotlariModal
          qaytarishId={tanlanganId}
          onYopish={() => setTanlanganId(null)}
        />
      )}
    </div>
  );
}
