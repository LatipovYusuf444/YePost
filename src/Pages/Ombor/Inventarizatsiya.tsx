import AppSelect from "@/Components/ui/AppSelect";
import { useEffect, useMemo, useState } from "react";
import { Eye, LoaderCircle, Plus, Search, X } from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { useOmborStore } from "@/store/omborStore";
import type { InventarizatsiyaTuri } from "@/types/ombor";
import { holat, hujjatRaqami, modificationNomi, qoldiqMiqdori, sana } from "./omborYordamchilari";
import InventoryHujjatModal from "./InventoryHujjatModal";
import OmborJadval from "./OmborJadval";

export default function Inventarizatsiya() {
  const store = useOmborStore();
  const malumotlarniYuklash = store.malumotlarniYuklash;
  const [modal, setModal] = useState(false);
  const [tanlanganId, setTanlanganId] = useState<string | null>(null);
  const [warehouseId, setWarehouseId] = useState("");
  const [type, setType] = useState<InventarizatsiyaTuri>("FULL");
  const [responsibleId, setResponsibleId] = useState("");
  const [actuals, setActuals] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [formaXatosi, setFormaXatosi] = useState("");
  const [qoldiqYuklanmoqda, setQoldiqYuklanmoqda] = useState(false);
  const [qidiruv, setQidiruv] = useState("");

  useEffect(() => {
    void malumotlarniYuklash();
  }, [malumotlarniYuklash]);

  const omborMap = useMemo(
    () => new Map(store.omborlar.map((ombor) => [ombor.id, ombor.name])),
    [store.omborlar]
  );
  const xodimMap = useMemo(
    () => new Map(store.xodimlar.map((xodim) => [xodim.id, xodim])),
    [store.xodimlar]
  );

  const qoldiqlar = useMemo(
    () =>
      store.qoldiqlar.filter(
        (qoldiq) =>
          Boolean(warehouseId) &&
          (qoldiq.warehouseId === warehouseId || qoldiq.warehouse?.id === warehouseId)
      ),
    [store.qoldiqlar, warehouseId]
  );

  const korinadiganHujjatlar = useMemo(() => {
    const query = qidiruv.trim().toLowerCase();
    if (!query) return store.inventarizatsiyalar;
    return store.inventarizatsiyalar.filter((item) => {
      const masul = item.responsible ?? (item.responsibleId ? xodimMap.get(item.responsibleId) : undefined);
      return [
        hujjatRaqami(item),
        item.warehouse?.name ?? omborMap.get(item.warehouseId),
        masul?.fullName ?? masul?.username ?? masul?.name,
        holat(item.status),
        item.type === "PARTIAL" ? "Qisman" : "To'liq",
        sana(item.createdAt),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [omborMap, qidiruv, store.inventarizatsiyalar, xodimMap]);

  function formaniOchish() {
    store.xatolikniTozalash();
    setWarehouseId("");
    setType("FULL");
    setResponsibleId("");
    setActuals({});
    setNote("");
    setFormaXatosi("");
    setModal(true);
  }

  function formaniYopish() {
    if (store.amalBajarilmoqda) return;
    setModal(false);
    setFormaXatosi("");
    store.xatolikniTozalash();
  }

  async function omborTanlash(id: string) {
    setWarehouseId(id);
    setActuals({});
    setFormaXatosi("");
    store.xatolikniTozalash();
    if (!id) return;

    setQoldiqYuklanmoqda(true);
    await store.qoldiqlarniYuklash(id);
    setQoldiqYuklanmoqda(false);
  }

  async function yaratish(tasdiqlash = false) {
    setFormaXatosi("");
    store.xatolikniTozalash();
    if (!warehouseId) {
      setFormaXatosi("Omborni tanlang.");
      return;
    }
    if (qoldiqlar.length === 0) {
      setFormaXatosi("Tanlangan omborda inventarizatsiya qilinadigan qoldiq mavjud emas.");
      return;
    }

    const itemMap = new Map<string, { modificationId: string; actualQuantity: number }>();
    for (const qoldiq of qoldiqlar) {
      const kiritilgan = actuals[qoldiq.modificationId];
      const actualQuantity = kiritilgan == null ? qoldiqMiqdori(qoldiq) : Number(kiritilgan);
      if (!Number.isFinite(actualQuantity) || actualQuantity < 0) {
        setFormaXatosi(
          `${modificationNomi(qoldiq.modification)} uchun haqiqiy miqdor 0 yoki undan katta raqam bo'lishi kerak.`
        );
        return;
      }
      itemMap.set(qoldiq.modificationId, {
        modificationId: qoldiq.modificationId,
        actualQuantity,
      });
    }

    const hujjat = await store.inventarizatsiyaYaratish({
      warehouseId,
      type,
      responsibleId: responsibleId || undefined,
      note: note.trim() || undefined,
      items: Array.from(itemMap.values()),
    });
    if (!hujjat) return;

    if (tasdiqlash) {
      const tasdiqlandi = await store.inventarizatsiyaTasdiqlash(hujjat.id);
      if (!tasdiqlandi) {
        setModal(false);
        return;
      }
    }

    setModal(false);
    setWarehouseId("");
    setActuals({});
    setNote("");
  }

  async function yakunlash(id: string) {
    store.xatolikniTozalash();
    await store.inventarizatsiyaTasdiqlash(id);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">Inventarizatsiya</h1>
          <p className="mt-1 text-sm text-slate-500">Ombordagi haqiqiy qoldiqlarni tekshirish hujjatlari.</p>
        </div>
        <button
          type="button"
          onClick={formaniOchish}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-[20px] bg-orange-500 px-5 font-black text-white shadow-sm transition hover:bg-orange-600"
        >
          <Plus size={18} /> Yaratish
        </button>
      </header>

      <label className="relative block w-full max-w-[480px]">
        <Search size={18} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={qidiruv}
          onChange={(event) => setQidiruv(event.target.value)}
          placeholder="Nomi, mas'ul shaxs, sana yoki holati bo'yicha qidirish"
          className="h-14 w-full rounded-[20px] border border-slate-200 bg-white pl-13 pr-5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
        />
      </label>

      {store.xatolik && !modal && (
        <div className="rounded-2xl bg-red-50 p-4 font-bold text-red-600">{store.xatolik}</div>
      )}

      <OmborJadval>
        <table className="w-full min-w-[1050px] text-left text-sm">
          <thead className="bg-orange-50/70 text-xs font-black uppercase text-orange-500">
            <tr>
              <th className="px-6 py-5">Nomi</th>
              <th className="border-l border-orange-200/70 px-6 py-5">Status</th>
              <th className="border-l border-orange-200/70 px-6 py-5">Yaratilgan vaqt</th>
              <th className="border-l border-orange-200/70 px-6 py-5">Ombor</th>
              <th className="border-l border-orange-200/70 px-6 py-5">Mas'ul shaxs</th>
              <th className="border-l border-orange-200/70 px-6 py-5">Turi</th>
              <th className="px-6 py-5 text-right">Amal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-orange-100">
            {korinadiganHujjatlar.map((item) => {
              const status = String(item.status ?? "DRAFT").toUpperCase();
              const masul = item.responsible ?? (item.responsibleId ? xodimMap.get(item.responsibleId) : undefined);
              return (
              <tr key={item.id} onClick={() => setTanlanganId(item.id)} className="cursor-pointer text-slate-600 transition hover:bg-orange-50/40">
                <td className="px-6 py-5 font-black text-slate-900">{hujjatRaqami(item)}</td>
                <td className="px-6 py-5">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                    status === "CONFIRMED"
                      ? "bg-emerald-50 text-emerald-600"
                      : status === "CANCELLED" || status === "CANCELED"
                        ? "bg-red-50 text-red-500"
                        : "bg-slate-100 text-slate-500"
                  }`}>
                    {holat(item.status)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-5">{sana(item.createdAt)}</td>
                <td className="px-6 py-5">
                  {item.warehouse?.name ?? omborMap.get(item.warehouseId) ?? "Noma'lum ombor"}
                </td>
                <td className="px-6 py-5">{masul?.fullName ?? masul?.username ?? masul?.name ?? "Biriktirilmagan"}</td>
                <td className="px-6 py-5">{item.type === "PARTIAL" ? "Qisman" : "To'liq"}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={(event) => { event.stopPropagation(); setTanlanganId(item.id); }}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 transition hover:bg-orange-100"
                      aria-label="Ko'rish"
                    >
                      <Eye size={17} />
                    </button>
                    {status === "DRAFT" && (
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); void yakunlash(item.id); }}
                        disabled={store.amalBajarilmoqda}
                        className="h-10 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Yakunlash
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );})}
            {store.yuklanmoqda && store.inventarizatsiyalar.length === 0 && (
              <tr>
                <td colSpan={7} className="py-14 text-center text-gray-400">
                  <LoaderCircle size={22} className="mx-auto mb-2 animate-spin text-orange-500" />
                  Hujjatlar yuklanmoqda...
                </td>
              </tr>
            )}
            {!store.yuklanmoqda && korinadiganHujjatlar.length === 0 && (
              <tr>
                <td colSpan={7} className="py-14 text-center text-gray-400">
                  {qidiruv ? "Qidiruv bo'yicha hujjat topilmadi" : "Inventarizatsiya hujjatlari mavjud emas"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </OmborJadval>

      {modal && (
        <AppModal>
          <div className="scrollbar-hidden flex max-h-[95vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-[36px] border border-orange-100 bg-[#fff8ef] shadow-[0_30px_100px_rgba(15,23,42,.3)]">
            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-orange-100 bg-[#fffaf5] px-7 py-5">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Yangi inventarizatsiya</h2>
                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase text-orange-600">Yangi</span>
              </div>
              <button
                type="button"
                onClick={formaniYopish}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
                aria-label="Yopish"
              >
                <X size={22} />
              </button>
            </header>

            <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
              <div className="grid gap-5 lg:grid-cols-2">
                <section className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
                  <h3 className="border-b border-orange-100 pb-4 text-sm font-black uppercase tracking-wide text-slate-600">
                    Inventarizatsiya haqida
                  </h3>
                  <div className="mt-5 space-y-4">
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-slate-500">Ombor *</span>
                      <AppSelect
                        value={warehouseId}
                        onChange={(event) => void omborTanlash(event.target.value)}
                        className="h-13 w-full rounded-2xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      >
                        <option value="">Omborni tanlang</option>
                        {store.omborlar.map((ombor) => (
                          <option key={ombor.id} value={ombor.id}>{ombor.name}</option>
                        ))}
                      </AppSelect>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-slate-500">Tekshiruv turi *</span>
                      <AppSelect
                        value={type}
                        onChange={(event) => setType(event.target.value as InventarizatsiyaTuri)}
                        className="h-13 w-full rounded-2xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      >
                        <option value="FULL">To'liq</option>
                        <option value="PARTIAL">Qisman</option>
                      </AppSelect>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-slate-500">Mas'ul shaxs</span>
                      <AppSelect
                        value={responsibleId}
                        onChange={(event) => setResponsibleId(event.target.value)}
                        className="h-13 w-full rounded-2xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      >
                        <option value="">Mas'ul biriktirilmagan</option>
                        {store.xodimlar.map((xodim) => (
                          <option key={xodim.id} value={xodim.id}>
                            {xodim.fullName ?? xodim.username ?? xodim.name ?? "Noma'lum xodim"}
                          </option>
                        ))}
                      </AppSelect>
                    </label>
                  </div>
                </section>

                <section className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
                  <h3 className="border-b border-orange-100 pb-4 text-sm font-black uppercase tracking-wide text-slate-600">Izoh</h3>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className="mt-5 min-h-40 w-full resize-none rounded-2xl border border-slate-200 p-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    placeholder="Inventarizatsiya haqida izoh yozing..."
                  />
                  <p className="mt-4 text-sm leading-6 text-slate-400">
                    Saqlanganda backendda inventarizatsiya qoralamasi yaratiladi. Tasdiqlash ombor qoldiqlarini aniqlangan farqlar bo'yicha yangilaydi.
                  </p>
                </section>
              </div>

              {(formaXatosi || store.xatolik) && (
                <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">{formaXatosi || store.xatolik}</div>
              )}

              <section className="mt-5 rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between gap-4 border-b border-orange-100 pb-4">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">Tovarlar</h3>
                    <p className="mt-1 text-xs text-slate-400">Tanlangan ombordagi real qoldiqlar</p>
                  </div>
                  {warehouseId && !qoldiqYuklanmoqda && (
                    <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-600">{qoldiqlar.length} ta</span>
                  )}
                </div>

                {qoldiqYuklanmoqda ? (
                  <div className="flex min-h-48 items-center justify-center gap-2 text-sm font-bold text-slate-400">
                    <LoaderCircle size={22} className="animate-spin text-orange-500" /> Qoldiqlar yuklanmoqda...
                  </div>
                ) : !warehouseId ? (
                  <div className="flex min-h-40 items-center justify-center text-sm font-bold text-slate-400">Mahsulotlarni ko'rish uchun omborni tanlang</div>
                ) : qoldiqlar.length === 0 ? (
                  <div className="flex min-h-40 items-center justify-center text-sm font-bold text-slate-400">Bu omborda qoldiq mavjud emas</div>
                ) : (
                  <div className="mt-5 overflow-x-auto rounded-2xl border border-orange-100 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-orange-500 [&::-webkit-scrollbar-track]:bg-orange-50">
                    <table className="w-full min-w-[980px] text-left text-sm">
                      <thead className="bg-orange-50/70 text-xs font-black uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-4">в„–</th>
                          <th className="px-4 py-4">Mahsulot</th>
                          <th className="px-4 py-4">Shtrix kod</th>
                          <th className="px-4 py-4">Ombor</th>
                          <th className="px-4 py-4">Tizimdagi qoldiq</th>
                          <th className="px-4 py-4">Haqiqiy miqdor</th>
                          <th className="px-4 py-4">Farq</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-orange-100">
                        {qoldiqlar.map((qoldiq, index) => {
                          const tizim = qoldiqMiqdori(qoldiq);
                          const haqiqiyRaw = actuals[qoldiq.modificationId] ?? String(tizim);
                          const haqiqiy = Number(haqiqiyRaw);
                          const farq = Number.isFinite(haqiqiy) ? haqiqiy - tizim : null;
                          return (
                            <tr key={`${qoldiq.modificationId}-${index}`}>
                              <td className="px-4 py-4 text-slate-400">{index + 1}</td>
                              <td className="px-4 py-4 font-black text-slate-900">{modificationNomi(qoldiq.modification)}</td>
                              <td className="px-4 py-4 text-slate-500">{qoldiq.modification?.barcode ?? "вЂ”"}</td>
                              <td className="px-4 py-4">{qoldiq.warehouse?.name ?? omborMap.get(warehouseId) ?? "Noma'lum ombor"}</td>
                              <td className="px-4 py-4 font-bold text-slate-600">{tizim}</td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={haqiqiyRaw}
                                  onChange={(event) => {
                                    setFormaXatosi("");
                                    setActuals((oldingi) => ({ ...oldingi, [qoldiq.modificationId]: event.target.value }));
                                  }}
                                  className="h-10 w-32 rounded-xl border border-slate-200 px-3 font-bold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                                  aria-label={`${modificationNomi(qoldiq.modification)} haqiqiy miqdori`}
                                />
                              </td>
                              <td className={`px-4 py-4 font-black ${farq == null || farq === 0 ? "text-slate-400" : farq > 0 ? "text-emerald-600" : "text-red-500"}`}>
                                {farq == null ? "вЂ”" : farq > 0 ? `+${farq}` : farq}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>

            <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-orange-100 bg-[#fffaf5] px-7 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={formaniYopish}
                disabled={store.amalBajarilmoqda}
                className="h-12 rounded-2xl bg-slate-100 px-6 font-bold text-slate-600 disabled:opacity-50"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={() => void yaratish(false)}
                disabled={store.amalBajarilmoqda || qoldiqYuklanmoqda || !warehouseId}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-orange-300 bg-white px-6 font-black text-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {store.amalBajarilmoqda && <LoaderCircle size={17} className="animate-spin" />}
                Saqlash
              </button>
              <button
                type="button"
                onClick={() => void yaratish(true)}
                disabled={store.amalBajarilmoqda || qoldiqYuklanmoqda || !warehouseId}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-7 font-black text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {store.amalBajarilmoqda && <LoaderCircle size={17} className="animate-spin" />}
                Saqlash va tasdiqlash
              </button>
            </footer>
          </div>
        </AppModal>
      )}

      {tanlanganId && (
        <InventoryHujjatModal
          tur="inventarizatsiya"
          id={tanlanganId}
          onClose={() => setTanlanganId(null)}
        />
      )}
    </div>
  );
}

