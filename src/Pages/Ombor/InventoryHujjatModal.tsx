import { useEffect, useMemo, useState } from "react";
import {
  Edit3,
  FileText,
  LoaderCircle,
  Package,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { useOmborStore } from "@/store/omborStore";
import type {
  ChiqimHujjati,
  ChiqimSababi,
  InventarizatsiyaHujjati,
  InventarizatsiyaTuri,
  KirimHujjati,
  KochirishHujjati,
} from "@/types/ombor";
import {
  holat,
  hujjatRaqami,
  modificationNomi,
  pul,
  sana,
} from "./omborYordamchilari";

export type InventoryHujjatTuri =
  | "kirim"
  | "chiqim"
  | "kochirish"
  | "inventarizatsiya";

type Props = {
  tur: InventoryHujjatTuri;
  id: string;
  onClose: () => void;
};

type Hujjat =
  | KirimHujjati
  | ChiqimHujjati
  | KochirishHujjati
  | InventarizatsiyaHujjati;

type Qator = {
  modificationId: string;
  quantity: number;
  price: number;
};

const sarlavhalar: Record<InventoryHujjatTuri, string> = {
  kirim: "Kirim hujjati",
  chiqim: "Chiqim hujjati",
  kochirish: "Ko'chirish hujjati",
  inventarizatsiya: "Inventarizatsiya hujjati",
};

const sabablar: Record<ChiqimSababi, string> = {
  DAMAGE: "Shikastlangan",
  EXPIRY: "Muddati o'tgan",
  THEFT: "Yo'qolgan yoki o'g'irlangan",
  OTHER: "Boshqa",
};

function hujjatHolati(hujjat: Hujjat | null) {
  return String(hujjat?.status ?? "DRAFT").toUpperCase();
}

export default function InventoryHujjatModal({ tur, id, onClose }: Props) {
  const store = useOmborStore();
  const kirimOlish = useOmborStore((state) => state.kirimOlish);
  const chiqimOlish = useOmborStore((state) => state.chiqimOlish);
  const kochirishOlish = useOmborStore((state) => state.kochirishOlish);
  const inventarizatsiyaOlish = useOmborStore(
    (state) => state.inventarizatsiyaOlish
  );
  const xatolikniTozalash = useOmborStore(
    (state) => state.xatolikniTozalash
  );
  const [hujjat, setHujjat] = useState<Hujjat | null>(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [tahrir, setTahrir] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [sourceWarehouseId, setSourceWarehouseId] = useState("");
  const [destWarehouseId, setDestWarehouseId] = useState("");
  const [responsibleId, setResponsibleId] = useState("");
  const [reason, setReason] = useState<ChiqimSababi>("OTHER");
  const [stockTakeType, setStockTakeType] =
    useState<InventarizatsiyaTuri>("FULL");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<Qator[]>([]);

  useEffect(() => {
    let faol = true;
    async function yuklash() {
      setYuklanmoqda(true);
      xatolikniTozalash();
      const item =
        tur === "kirim"
          ? await kirimOlish(id)
          : tur === "chiqim"
            ? await chiqimOlish(id)
            : tur === "kochirish"
              ? await kochirishOlish(id)
              : await inventarizatsiyaOlish(id);
      if (!faol) return;
      setHujjat(item);
      setYuklanmoqda(false);
    }
    void yuklash();
    return () => {
      faol = false;
    };
  }, [
    chiqimOlish,
    id,
    inventarizatsiyaOlish,
    kirimOlish,
    kochirishOlish,
    tur,
    xatolikniTozalash,
  ]);

  function formaniToldirish(item: Hujjat) {
    setResponsibleId(item.responsibleId ?? "");
    setNote(item.note ?? "");

    if (tur === "kirim") {
      const kirim = item as KirimHujjati;
      setSupplierId(kirim.supplierId);
      setWarehouseId(kirim.warehouseId);
      setItems(
        (kirim.items ?? []).map((qator) => ({
          modificationId: qator.modificationId,
          quantity: Number(qator.quantity),
          price: Number(qator.price),
        }))
      );
    } else if (tur === "chiqim") {
      const chiqim = item as ChiqimHujjati;
      setWarehouseId(chiqim.warehouseId);
      setReason(chiqim.reason as ChiqimSababi);
      setItems(
        (chiqim.items ?? []).map((qator) => ({
          modificationId: qator.modificationId,
          quantity: Number(qator.quantity),
          price: 0,
        }))
      );
    } else if (tur === "kochirish") {
      const kochirish = item as KochirishHujjati;
      setSourceWarehouseId(kochirish.sourceWarehouseId);
      setDestWarehouseId(kochirish.destWarehouseId);
      setItems(
        (kochirish.items ?? []).map((qator) => ({
          modificationId: qator.modificationId,
          quantity: Number(qator.quantity),
          price: 0,
        }))
      );
    } else {
      const inventarizatsiya = item as InventarizatsiyaHujjati;
      setWarehouseId(inventarizatsiya.warehouseId);
      setStockTakeType(
        inventarizatsiya.type === "PARTIAL" ? "PARTIAL" : "FULL"
      );
      setItems(
        (inventarizatsiya.items ?? []).map((qator) => ({
          modificationId: qator.modificationId,
          quantity: Number(qator.actualQuantity),
          price: 0,
        }))
      );
    }
  }

  function tahrirlashniBoshlash() {
    if (!hujjat) return;
    formaniToldirish(hujjat);
    store.xatolikniTozalash();
    setTahrir(true);
  }

  const jami = useMemo(
    () =>
      items.reduce(
        (summa, item) => summa + Number(item.quantity) * Number(item.price),
        0
      ),
    [items]
  );

  async function saqlash() {
    if (!hujjat) return;
    const tozaItems = items.filter(
      (item) => item.modificationId && item.quantity > 0
    );
    if (tozaItems.length === 0) return;

    let ok = false;
    if (tur === "kirim") {
      if (!supplierId || !warehouseId) return;
      ok = await store.kirimYangilash(id, {
        supplierId,
        warehouseId,
        responsibleId: responsibleId || undefined,
        note,
        items: tozaItems.map(({ modificationId, quantity, price }) => ({
          modificationId,
          quantity,
          price,
        })),
      });
    } else if (tur === "chiqim") {
      if (!warehouseId) return;
      ok = await store.chiqimYangilash(id, {
        warehouseId,
        reason,
        responsibleId: responsibleId || undefined,
        note,
        items: tozaItems.map(({ modificationId, quantity }) => ({
          modificationId,
          quantity,
        })),
      });
    } else if (tur === "kochirish") {
      if (
        !sourceWarehouseId ||
        !destWarehouseId ||
        sourceWarehouseId === destWarehouseId
      )
        return;
      ok = await store.kochirishYangilash(id, {
        sourceWarehouseId,
        destWarehouseId,
        responsibleId: responsibleId || undefined,
        note,
        items: tozaItems.map(({ modificationId, quantity }) => ({
          modificationId,
          quantity,
        })),
      });
    } else {
      if (!warehouseId) return;
      ok = await store.inventarizatsiyaYangilash(id, {
        warehouseId,
        type: stockTakeType,
        responsibleId: responsibleId || undefined,
        note,
        items: tozaItems.map(({ modificationId, quantity }) => ({
          modificationId,
          actualQuantity: quantity,
        })),
      });
    }

    if (!ok) return;
    const yangilangan =
      tur === "kirim"
        ? await store.kirimOlish(id)
        : tur === "chiqim"
          ? await store.chiqimOlish(id)
          : tur === "kochirish"
            ? await store.kochirishOlish(id)
            : await store.inventarizatsiyaOlish(id);
    setHujjat(yangilangan);
    setTahrir(false);
  }

  function qatorQoshish() {
    setItems((oldingi) => [
      ...oldingi,
      { modificationId: "", quantity: 1, price: 0 },
    ]);
  }

  function qatorniYangilash(index: number, data: Partial<Qator>) {
    setItems((oldingi) =>
      oldingi.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...data } : item
      )
    );
  }

  const qoralama = hujjatHolati(hujjat) === "DRAFT";

  return (
    <AppModal>
      <div className="scrollbar-hidden max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-[30px] bg-white shadow-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-orange-100 bg-white/95 px-6 py-5 backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
              <FileText size={22} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-500">
                Hujjat tafsilotlari
              </p>
              <h2 className="text-2xl font-black">
                {sarlavhalar[tur]}
                {hujjat ? ` · ${hujjatRaqami(hujjat)}` : ""}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-500"
            aria-label="Yopish"
          >
            <X size={19} />
          </button>
        </header>

        {yuklanmoqda ? (
          <div className="flex h-72 items-center justify-center">
            <LoaderCircle className="animate-spin text-orange-500" size={34} />
          </div>
        ) : !hujjat ? (
          <div className="p-12 text-center text-gray-500">
            Hujjat ma'lumotlarini olib bo'lmadi.
          </div>
        ) : (
          <div className="p-6">
            {store.xatolik && (
              <div className="mb-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
                {store.xatolik}
              </div>
            )}

            {!tahrir ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Malumot nom="Holat" qiymat={holat(hujjat.status)} />
                  <Malumot nom="Yaratilgan sana" qiymat={sana(hujjat.createdAt)} />
                  <Malumot
                    nom="Mas'ul xodim"
                    qiymat={
                      hujjat.responsible?.fullName ??
                      hujjat.responsible?.username ??
                      store.xodimlar.find(
                        (item) => item.id === hujjat.responsibleId
                      )?.fullName ??
                      "Biriktirilmagan"
                    }
                  />
                  <Malumot nom="Mahsulotlar" qiymat={`${hujjat.items?.length ?? 0} ta`} />
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {tur === "kirim" && (
                    <>
                      <Malumot
                        nom="Yetkazib beruvchi"
                        qiymat={
                          (hujjat as KirimHujjati).supplier?.name ??
                          store.yetkazibBeruvchilar.find(
                            (item) =>
                              item.id === (hujjat as KirimHujjati).supplierId
                          )?.name ??
                          (hujjat as KirimHujjati).supplierId
                        }
                      />
                      <Malumot
                        nom="Ombor"
                        qiymat={
                          (hujjat as KirimHujjati).warehouse?.name ??
                          store.omborlar.find(
                            (item) =>
                              item.id === (hujjat as KirimHujjati).warehouseId
                          )?.name ??
                          (hujjat as KirimHujjati).warehouseId
                        }
                      />
                    </>
                  )}
                  {tur === "chiqim" && (
                    <>
                      <Malumot
                        nom="Ombor"
                        qiymat={
                          (hujjat as ChiqimHujjati).warehouse?.name ??
                          store.omborlar.find(
                            (item) =>
                              item.id === (hujjat as ChiqimHujjati).warehouseId
                          )?.name ??
                          (hujjat as ChiqimHujjati).warehouseId
                        }
                      />
                      <Malumot
                        nom="Chiqim sababi"
                        qiymat={
                          sabablar[
                            (hujjat as ChiqimHujjati).reason as ChiqimSababi
                          ] ?? (hujjat as ChiqimHujjati).reason
                        }
                      />
                    </>
                  )}
                  {tur === "kochirish" && (
                    <>
                      <Malumot
                        nom="Manba ombor"
                        qiymat={
                          (hujjat as KochirishHujjati).sourceWarehouse?.name ??
                          store.omborlar.find(
                            (item) =>
                              item.id ===
                              (hujjat as KochirishHujjati).sourceWarehouseId
                          )?.name ??
                          (hujjat as KochirishHujjati).sourceWarehouseId
                        }
                      />
                      <Malumot
                        nom="Qabul qiluvchi ombor"
                        qiymat={
                          (hujjat as KochirishHujjati).destWarehouse?.name ??
                          store.omborlar.find(
                            (item) =>
                              item.id ===
                              (hujjat as KochirishHujjati).destWarehouseId
                          )?.name ??
                          (hujjat as KochirishHujjati).destWarehouseId
                        }
                      />
                    </>
                  )}
                  {tur === "inventarizatsiya" && (
                    <>
                      <Malumot
                        nom="Ombor"
                        qiymat={
                          (hujjat as InventarizatsiyaHujjati).warehouse?.name ??
                          store.omborlar.find(
                            (item) =>
                              item.id ===
                              (hujjat as InventarizatsiyaHujjati).warehouseId
                          )?.name ??
                          (hujjat as InventarizatsiyaHujjati).warehouseId
                        }
                      />
                      <Malumot
                        nom="Tekshiruv turi"
                        qiymat={
                          (hujjat as InventarizatsiyaHujjati).type === "PARTIAL"
                            ? "Qisman"
                            : "To'liq"
                        }
                      />
                    </>
                  )}
                </div>

                <div className="mt-6 overflow-hidden rounded-2xl border border-orange-100">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-orange-50 text-gray-600">
                      <tr>
                        <th className="px-4 py-3">Mahsulot</th>
                        <th className="px-4 py-3">Miqdor</th>
                        {tur === "kirim" && (
                          <>
                            <th className="px-4 py-3">Narx</th>
                            <th className="px-4 py-3">Jami</th>
                          </>
                        )}
                        {tur === "inventarizatsiya" && (
                          <th className="px-4 py-3">Tizimdagi miqdor</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-100">
                      {(hujjat.items ?? []).map((item, index) => {
                        const mod =
                          item.modification ??
                          store.modifikatsiyalar.find(
                            (modification) =>
                              modification.id === item.modificationId
                          );
                        const quantity =
                          "actualQuantity" in item
                            ? item.actualQuantity
                            : item.quantity;
                        const price = "price" in item ? item.price : 0;
                        return (
                          <tr key={item.id ?? `${item.modificationId}-${index}`}>
                            <td className="px-4 py-3 font-bold">
                              {modificationNomi(mod)}
                            </td>
                            <td className="px-4 py-3">{quantity}</td>
                            {tur === "kirim" && (
                              <>
                                <td className="px-4 py-3">
                                  {pul(Number(price))}
                                </td>
                                <td className="px-4 py-3 font-bold">
                                  {pul(Number(quantity) * Number(price))}
                                </td>
                              </>
                            )}
                            {tur === "inventarizatsiya" && (
                              <td className="px-4 py-3">
                                {"expectedQuantity" in item
                                  ? (item.expectedQuantity ?? "—")
                                  : "—"}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {hujjat.note && (
                  <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Izoh
                    </p>
                    <p className="mt-1 text-sm font-medium text-gray-700">
                      {hujjat.note}
                    </p>
                  </div>
                )}

                <div className="mt-6 flex justify-end gap-3">
                  {qoralama && (
                    <button
                      onClick={tahrirlashniBoshlash}
                      className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-5 font-black text-white"
                    >
                      <Edit3 size={17} />
                      Hujjatni tahrirlash
                    </button>
                  )}
                  {!qoralama && (
                    <p className="rounded-2xl bg-gray-100 px-4 py-3 text-sm font-bold text-gray-500">
                      Faqat qoralama hujjatni tahrirlash mumkin.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div>
                <div className="grid gap-4 md:grid-cols-2">
                  {tur === "kirim" && (
                    <select
                      value={supplierId}
                      onChange={(event) => setSupplierId(event.target.value)}
                      className="h-12 rounded-2xl border px-4"
                    >
                      <option value="">Yetkazib beruvchi *</option>
                      {store.yetkazibBeruvchilar.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name ?? item.id}
                        </option>
                      ))}
                    </select>
                  )}
                  {(tur === "kirim" ||
                    tur === "chiqim" ||
                    tur === "inventarizatsiya") && (
                    <select
                      value={warehouseId}
                      onChange={(event) => setWarehouseId(event.target.value)}
                      className="h-12 rounded-2xl border px-4"
                    >
                      <option value="">Ombor *</option>
                      {store.omborlar.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {tur === "kochirish" && (
                    <>
                      <select
                        value={sourceWarehouseId}
                        onChange={(event) =>
                          setSourceWarehouseId(event.target.value)
                        }
                        className="h-12 rounded-2xl border px-4"
                      >
                        <option value="">Manba ombor *</option>
                        {store.omborlar.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={destWarehouseId}
                        onChange={(event) =>
                          setDestWarehouseId(event.target.value)
                        }
                        className="h-12 rounded-2xl border px-4"
                      >
                        <option value="">Qabul qiluvchi ombor *</option>
                        {store.omborlar
                          .filter((item) => item.id !== sourceWarehouseId)
                          .map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                      </select>
                    </>
                  )}
                  {tur === "chiqim" && (
                    <select
                      value={reason}
                      onChange={(event) =>
                        setReason(event.target.value as ChiqimSababi)
                      }
                      className="h-12 rounded-2xl border px-4"
                    >
                      {Object.entries(sabablar).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  )}
                  {tur === "inventarizatsiya" && (
                    <select
                      value={stockTakeType}
                      onChange={(event) =>
                        setStockTakeType(
                          event.target.value as InventarizatsiyaTuri
                        )
                      }
                      className="h-12 rounded-2xl border px-4"
                    >
                      <option value="FULL">To'liq</option>
                      <option value="PARTIAL">Qisman</option>
                    </select>
                  )}
                  <select
                    value={responsibleId}
                    onChange={(event) => setResponsibleId(event.target.value)}
                    className="h-12 rounded-2xl border px-4"
                  >
                    <option value="">Mas'ul xodim biriktirilmagan</option>
                    {store.xodimlar.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.fullName ?? item.username ?? item.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-5 space-y-3">
                  {items.map((item, index) => (
                    <div
                      key={`${index}-${item.modificationId}`}
                      className={`grid gap-3 rounded-2xl bg-gray-50 p-4 ${
                        tur === "kirim"
                          ? "md:grid-cols-[1fr_120px_150px_44px]"
                          : "md:grid-cols-[1fr_140px_44px]"
                      }`}
                    >
                      <select
                        value={item.modificationId}
                        onChange={(event) =>
                          qatorniYangilash(index, {
                            modificationId: event.target.value,
                          })
                        }
                        className="h-11 rounded-xl border bg-white px-3"
                      >
                        <option value="">Mahsulot *</option>
                        {store.modifikatsiyalar.map((modification) => (
                          <option key={modification.id} value={modification.id}>
                            {modificationNomi(modification)}
                            {modification.barcode
                              ? ` — ${modification.barcode}`
                              : ""}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={item.quantity}
                        onChange={(event) =>
                          qatorniYangilash(index, {
                            quantity: Number(event.target.value),
                          })
                        }
                        className="h-11 rounded-xl border bg-white px-3"
                        placeholder={
                          tur === "inventarizatsiya"
                            ? "Haqiqiy miqdor"
                            : "Miqdor"
                        }
                      />
                      {tur === "kirim" && (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.price}
                          onChange={(event) =>
                            qatorniYangilash(index, {
                              price: Number(event.target.value),
                            })
                          }
                          className="h-11 rounded-xl border bg-white px-3"
                          placeholder="Tan narx"
                        />
                      )}
                      <button
                        type="button"
                        disabled={items.length === 1}
                        onClick={() =>
                          setItems((oldingi) =>
                            oldingi.filter(
                              (_, itemIndex) => itemIndex !== index
                            )
                          )
                        }
                        className="flex h-11 items-center justify-center rounded-xl bg-red-50 text-red-500 disabled:opacity-30"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={qatorQoshish}
                    className="inline-flex items-center gap-2 rounded-xl bg-orange-50 px-4 py-2.5 text-sm font-bold text-orange-600"
                  >
                    <Plus size={16} />
                    Mahsulot qo'shish
                  </button>
                </div>

                {tur === "kirim" && (
                  <div className="mt-4 flex justify-end rounded-2xl bg-orange-50 p-4">
                    <span className="font-black text-orange-700">
                      Hujjat summasi: {pul(jami)}
                    </span>
                  </div>
                )}

                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="mt-5 min-h-24 w-full rounded-2xl border p-4 outline-none focus:border-orange-300"
                  placeholder="Izoh"
                />

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setTahrir(false)}
                    className="h-11 rounded-2xl bg-gray-100 px-5 font-bold text-gray-600"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="button"
                    onClick={() => void saqlash()}
                    disabled={store.amalBajarilmoqda || items.length === 0}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-6 font-black text-white disabled:opacity-50"
                  >
                    {store.amalBajarilmoqda ? (
                      <LoaderCircle size={17} className="animate-spin" />
                    ) : (
                      <Save size={17} />
                    )}
                    O'zgarishlarni saqlash
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppModal>
  );
}

function Malumot({ nom, qiymat }: { nom: string; qiymat: string }) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4">
      <div className="flex items-center gap-2 text-gray-400">
        <Package size={15} />
        <span className="text-xs font-bold uppercase tracking-wider">{nom}</span>
      </div>
      <p className="mt-2 break-words font-black text-gray-800">{qiymat}</p>
    </div>
  );
}
