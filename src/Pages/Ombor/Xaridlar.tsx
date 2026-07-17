import { useEffect, useMemo, useState } from "react";
import { Ban, CheckCircle2, FileText, LoaderCircle, Plus, Search } from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { useOmborStore } from "@/store/omborStore";
import type { KirimHujjati } from "@/types/ombor";
import { holat, hujjatRaqami, pul, sana } from "./omborYordamchilari";
import KirimTafsilotModal from "./KirimTafsilotModal";
import YangiKirimModal from "./YangiKirimModal";
import OmborJadval from "./OmborJadval";

function holatBadgeSinfi(status?: string) {
  const s = String(status ?? "DRAFT").toUpperCase();
  if (s === "CONFIRMED") return "bg-emerald-50 text-emerald-600";
  if (s === "CANCELLED" || s === "CANCELED") return "bg-red-50 text-red-500";
  return "bg-gray-100 text-gray-500";
}

export default function Xaridlar() {
  const store = useOmborStore();
  const malumotlarniYuklash = store.malumotlarniYuklash;
  const [qidiruv, setQidiruv] = useState("");
  const [modal, setModal] = useState(false);
  const [tanlanganId, setTanlanganId] = useState<string | null>(null);
  const [bekorSorash, setBekorSorash] = useState<KirimHujjati | null>(null);

  useEffect(() => {
    void malumotlarniYuklash();
  }, [malumotlarniYuklash]);

  const suppliersMap = useMemo(
    () => new Map(store.yetkazibBeruvchilar.map((item) => [item.id, item])),
    [store.yetkazibBeruvchilar]
  );

  const xodimlarMap = useMemo(
    () => new Map(store.xodimlar.map((item) => [item.id, item])),
    [store.xodimlar]
  );

  function supplierNomi(id: string, name?: string) {
    return name ?? suppliersMap.get(id)?.name ?? suppliersMap.get(id)?.fullName ?? id;
  }

  function masulNomi(hujjat: KirimHujjati) {
    const xodim = hujjat.responsibleId ? xodimlarMap.get(hujjat.responsibleId) : undefined;
    return (
      hujjat.responsible?.fullName ??
      hujjat.responsible?.username ??
      xodim?.fullName ??
      xodim?.username ??
      "Biriktirilmagan"
    );
  }

  function kirimSummasi(hujjat: KirimHujjati) {
    const backendSumma = Number(hujjat.totalAmount ?? hujjat.total ?? 0);
    if (backendSumma > 0) return backendSumma;
    return (hujjat.items ?? []).reduce(
      (summa, item) => summa + Number(item.quantity ?? 0) * Number(item.price ?? 0),
      0
    );
  }

  function kirimNomi(hujjat: KirimHujjati) {
    const match = (hujjat.note ?? "").trim().match(/^Nomi:\s*(.+?)\s*(?:\|.*)?$/);
    return match?.[1]?.trim() || "Kirim hujjati";
  }

  const royxat = useMemo(() => {
    const q = qidiruv.trim().toLowerCase();
    if (!q) return store.kirimlar;
    return store.kirimlar.filter((hujjat) => {
      const matn = [
        kirimNomi(hujjat),
        hujjatRaqami(hujjat),
        supplierNomi(hujjat.supplierId, hujjat.supplier?.name),
        masulNomi(hujjat),
        sana(hujjat.createdAt),
        holat(hujjat.status),
      ]
        .join(" ")
        .toLowerCase();
      return matn.includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.kirimlar, qidiruv, suppliersMap, store.xodimlar]);

  async function bekorQilishTasdiqlash() {
    if (!bekorSorash) return;
    const ok = await store.kirimBekorQilish(bekorSorash.id);
    if (ok) setBekorSorash(null);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">Ombor</p>
          <h1 className="mt-1 text-3xl font-black text-gray-950">Kirim</h1>
          <p className="mt-1 text-sm text-gray-500">Omborga tovar kirim qilish hujjatlari.</p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-black text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600"
        >
          <Plus size={17} />
          Yaratish
        </button>
      </header>

      <div className="relative max-w-sm">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={qidiruv}
          onChange={(event) => setQidiruv(event.target.value)}
          placeholder="Nomi, yetkazib beruvchi, mas'ul shaxs, sana yoki holati bo'yicha qidirish"
          className="h-11 w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-orange-400"
        />
      </div>

      {store.xatolik && (
        <div className="flex items-start justify-between gap-3 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
          <span>{store.xatolik}</span>
          <button onClick={store.xatolikniTozalash} className="shrink-0 text-red-400 hover:text-red-600">
            Yopish
          </button>
        </div>
      )}

      <OmborJadval>
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-orange-50/60 text-xs font-bold uppercase tracking-wide text-orange-500">
              <tr>
                <th className="px-5 py-3">Nomi</th>
                <th className="px-5 py-3">Yetkazib beruvchi</th>
                <th className="px-5 py-3">Sana</th>
                <th className="px-5 py-3">Mas'ul shaxs</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Summa</th>
                <th className="px-5 py-3 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {store.yuklanmoqda ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <LoaderCircle className="mx-auto animate-spin text-orange-500" size={28} />
                  </td>
                </tr>
              ) : (
                royxat.map((hujjat) => {
                  const status = String(hujjat.status ?? "DRAFT").toUpperCase();
                  return (
                    <tr
                      key={hujjat.id}
                      onClick={() => setTanlanganId(hujjat.id)}
                      className="cursor-pointer hover:bg-orange-50/30"
                    >
                      <td className="px-5 py-3">
                        <p className="font-black text-gray-950">{kirimNomi(hujjat)}</p>
                        <p className="text-xs font-semibold text-orange-500">{hujjatRaqami(hujjat)}</p>
                      </td>
                      <td className="px-5 py-3 text-gray-700">
                        {supplierNomi(hujjat.supplierId, hujjat.supplier?.name)}
                      </td>
                      <td className="px-5 py-3 text-gray-500">{sana(hujjat.createdAt)}</td>
                      <td className="px-5 py-3 text-gray-700">{masulNomi(hujjat)}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${holatBadgeSinfi(hujjat.status)}`}>
                          {holat(hujjat.status)}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-bold text-gray-700">{pul(kirimSummasi(hujjat))}</td>
                      <td className="px-5 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          {status === "DRAFT" && (
                            <button
                              onClick={() => void store.kirimTasdiqlash(hujjat.id)}
                              disabled={store.amalBajarilmoqda}
                              title="Tasdiqlash"
                              aria-label="Tasdiqlash"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-50"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                          )}
                          {status === "CONFIRMED" && (
                            <button
                              onClick={() => setBekorSorash(hujjat)}
                              title="Bekor qilish"
                              aria-label="Bekor qilish"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500 transition hover:bg-red-100"
                            >
                              <Ban size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
              {!store.yuklanmoqda && royxat.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-14 text-center">
                    <FileText className="mx-auto text-orange-200" size={42} />
                    <p className="mt-3 font-bold text-gray-500">Kirim hujjati topilmadi</p>
                    <p className="mt-1 text-sm text-gray-400">
                      "Yaratish" tugmasi orqali yangi kirim qo'shing.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
      </OmborJadval>

      {modal && <YangiKirimModal onClose={() => setModal(false)} />}

      {tanlanganId && (
        <KirimTafsilotModal id={tanlanganId} onClose={() => setTanlanganId(null)} />
      )}

      {bekorSorash && (
        <AppModal>
          <div className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,.25)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
              <Ban size={22} />
            </div>
            <h3 className="mt-4 text-center text-lg font-black text-gray-950">Hujjatni bekor qilasizmi?</h3>
            <p className="mt-1.5 text-center text-sm text-gray-500">
              "{hujjatRaqami(bekorSorash)}" hujjati bekor qilinadi va ombor qoldig'i tiklanadi.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setBekorSorash(null)}
                className="h-11 flex-1 rounded-2xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50"
              >
                Yopish
              </button>
              <button
                onClick={() => void bekorQilishTasdiqlash()}
                disabled={store.amalBajarilmoqda}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-red-500 text-sm font-black text-white hover:bg-red-600 disabled:opacity-50"
              >
                {store.amalBajarilmoqda && <LoaderCircle size={16} className="animate-spin" />}
                Ha, bekor qilish
              </button>
            </div>
          </div>
        </AppModal>
      )}
    </div>
  );
}
