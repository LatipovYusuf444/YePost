import AppSelect from "@/Components/ui/AppSelect";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Ban,
  Edit3,
  FileText,
  LoaderCircle,
  Package,
  PackageCheck,
  Plus,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { useOmborStore } from "@/store/omborStore";
import InventoryDocumentActivity from "./InventoryDocumentActivity";
import type { InventoryDocumentType } from "@/types/inventoryDocuments";
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
const documentTypes: Record<InventoryHujjatTuri, InventoryDocumentType> = {
  kirim: "PURCHASE", chiqim: "WRITE_OFF", kochirish: "TRANSFER", inventarizatsiya: "STOCK_TAKE",
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
  const [validatsiyaXatosi, setValidatsiyaXatosi] = useState("");

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
    setValidatsiyaXatosi("");
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

  const korishJami = useMemo(() => {
    if (!hujjat) return undefined;
    const summaMaydonlari = hujjat as Hujjat & {
      total?: number | string;
      totalAmount?: number | string;
    };
    const backendSummasi = summaMaydonlari.totalAmount ?? summaMaydonlari.total;
    if (backendSummasi != null && Number.isFinite(Number(backendSummasi))) {
      return Number(backendSummasi);
    }
    if (tur !== "kirim" || !hujjat.items?.length) return undefined;
    return (hujjat as KirimHujjati).items?.reduce(
      (summa, item) => summa + Number(item.quantity || 0) * Number(item.price || 0),
      0
    );
  }, [hujjat, tur]);

  async function saqlash() {
    if (!hujjat) return;
    setValidatsiyaXatosi("");
    const yaroqsizQator = items.some(
      (item) =>
        !item.modificationId ||
        !Number.isFinite(Number(item.quantity)) ||
        (tur === "inventarizatsiya" ? Number(item.quantity) < 0 : Number(item.quantity) <= 0) ||
        (tur === "kirim" && (!Number.isFinite(Number(item.price)) || Number(item.price) < 0))
    );
    if (items.length === 0 || yaroqsizQator) {
      setValidatsiyaXatosi(
        tur === "inventarizatsiya"
          ? "Har bir mahsulot uchun haqiqiy miqdor 0 yoki undan katta raqam bo'lishi kerak."
          : "Mahsulot, miqdor va narx qiymatlarini to'g'ri kiriting."
      );
      return;
    }
    const tozaItems = items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      price: Number(item.price),
    }));

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

  async function inventarizatsiyaniYakunlash() {
    if (tur !== "inventarizatsiya" || !hujjat || hujjatHolati(hujjat) !== "DRAFT") return;
    setValidatsiyaXatosi("");
    store.xatolikniTozalash();
    const ok = await store.inventarizatsiyaTasdiqlash(id);
    if (!ok) return;
    const yangilangan = await store.inventarizatsiyaOlish(id);
    if (yangilangan) setHujjat(yangilangan);
  }

  async function inventarizatsiyaniBekorQilish() {
    if (tur !== "inventarizatsiya" || !hujjat || hujjatHolati(hujjat) !== "CONFIRMED") return;
    if (!window.confirm("Tasdiqlangan inventarizatsiyani bekor qilasizmi? Ombor qoldiqlari qayta hisoblanadi.")) return;
    setValidatsiyaXatosi("");
    store.xatolikniTozalash();
    const ok = await store.inventarizatsiyaBekorQilish(id);
    if (!ok) return;
    const yangilangan = await store.inventarizatsiyaOlish(id);
    if (yangilangan) setHujjat(yangilangan);
  }

  async function kochirishHolatiniYangilash(amal: "send" | "receive" | "cancel") {
    if (tur !== "kochirish" || !hujjat) return;
    setValidatsiyaXatosi("");
    store.xatolikniTozalash();
    const ok =
      amal === "send"
        ? await store.kochirishJonatish(id)
        : amal === "receive"
          ? await store.kochirishQabulQilish(id)
          : await store.kochirishBekorQilish(id);
    if (!ok) return;
    const yangilangan = await store.kochirishOlish(id);
    if (yangilangan) setHujjat(yangilangan);
  }

  const qoralama = hujjatHolati(hujjat) === "DRAFT";

  return (
    <AppModal onClose={onClose}>
      <div className="scrollbar-hidden max-h-[95vh] w-full max-w-[1500px] overflow-y-auto rounded-[36px] border border-orange-100 bg-[#fff8ef] shadow-[0_30px_100px_rgba(15,23,42,.28)]">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-orange-100 bg-[#fffaf5]/95 px-7 py-5 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-200">
              <FileText size={22} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-500">
                Hujjat tafsilotlari
              </p>
              <h2 className="text-2xl font-black text-slate-950 sm:text-3xl">
                {sarlavhalar[tur]}
                {hujjat ? ` В· ${hujjatRaqami(hujjat)}` : ""}
              </h2>
              {hujjat && (
                <span
                  className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ${
                    ["CANCELLED", "CANCELED"].includes(hujjatHolati(hujjat))
                      ? "bg-red-50 text-red-500"
                      : hujjatHolati(hujjat) === "DRAFT"
                        ? "bg-orange-50 text-orange-600"
                      : hujjatHolati(hujjat) === "SENT"
                        ? "bg-blue-50 text-blue-600"
                        : "bg-emerald-50 text-emerald-600"
                  }`}
                >
                  {holat(hujjat.status)}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {hujjat && tur === "kochirish" && !tahrir && hujjatHolati(hujjat) === "DRAFT" && (
              <>
                <button
                  type="button"
                  onClick={() => void kochirishHolatiniYangilash("cancel")}
                  disabled={store.amalBajarilmoqda}
                  className="inline-flex h-12 items-center gap-2 rounded-2xl bg-red-50 px-4 font-black text-red-500 transition hover:bg-red-100 disabled:opacity-50"
                >
                  <Ban size={17} /> Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={() => void kochirishHolatiniYangilash("send")}
                  disabled={store.amalBajarilmoqda}
                  className="inline-flex h-12 items-center gap-2 rounded-2xl bg-sky-500 px-4 font-black text-white transition hover:bg-sky-600 disabled:opacity-50"
                >
                  <Send size={17} /> Jo'natish
                </button>
              </>
            )}
            {hujjat && tur === "kochirish" && !tahrir && hujjatHolati(hujjat) === "SENT" && (
              <button
                type="button"
                onClick={() => void kochirishHolatiniYangilash("receive")}
                disabled={store.amalBajarilmoqda}
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-emerald-500 px-4 font-black text-white transition hover:bg-emerald-600 disabled:opacity-50"
              >
                <PackageCheck size={18} /> Qabul qilish
              </button>
            )}
            {hujjat && qoralama && !tahrir && (
              <button
                type="button"
                onClick={tahrirlashniBoshlash}
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-orange-500 px-5 font-black text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600"
              >
                <Edit3 size={18} /> Tahrirlash
              </button>
            )}
          </div>
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
          <div className="p-5 sm:p-7">
            {(store.xatolik || validatsiyaXatosi) && (
              <div className="mb-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
                {validatsiyaXatosi || store.xatolik}
              </div>
            )}

            {!tahrir ? (
              <>
                <section className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
                  <h3 className="border-b border-orange-100 pb-4 text-sm font-black uppercase tracking-wide text-slate-600">
                    {sarlavhalar[tur]} haqida
                  </h3>
                  {korishJami != null && (
                    <div className="mt-5 rounded-[24px] bg-gradient-to-br from-orange-50 to-orange-100/70 px-7 py-8">
                      <p className="text-xs font-black uppercase tracking-wider text-orange-600">Umumiy summa</p>
                      <p className="mt-2 text-4xl font-black tracking-tight text-slate-950">{pul(korishJami)}</p>
                    </div>
                  )}
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

                <div className="mt-3 grid gap-3 md:grid-cols-2">
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
                          "Noma'lum yetkazib beruvchi"
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
                          "Noma'lum ombor"
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
                          "Noma'lum ombor"
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
                          "Noma'lum ombor"
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
                          "Noma'lum ombor"
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
                          "Noma'lum ombor"
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
                </section>

                <section className="mt-5 rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
                  <h3 className="border-b border-orange-100 pb-4 text-sm font-black uppercase tracking-wide text-slate-600">Tovarlar</h3>
                <div className="mt-5 overflow-x-auto rounded-2xl border border-orange-100">
                  <table className="w-full min-w-[700px] text-left text-sm">
                    <thead className="bg-orange-50 text-gray-600">
                      <tr>
                        <th className="px-4 py-3">Mahsulot</th>
                        {tur === "inventarizatsiya" ? (
                          <>
                            <th className="px-4 py-3">Shtrix kod</th>
                            <th className="px-4 py-3">Ombor</th>
                            <th className="px-4 py-3">Tizimdagi miqdor</th>
                            <th className="px-4 py-3">Haqiqiy miqdor</th>
                            <th className="px-4 py-3">Farq</th>
                          </>
                        ) : (
                          <>
                            <th className="px-4 py-3">Miqdor</th>
                            {tur === "kirim" && (
                              <>
                                <th className="px-4 py-3">Narx</th>
                                <th className="px-4 py-3">Jami</th>
                              </>
                            )}
                          </>
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
                        const expectedQuantity =
                          "expectedQuantity" in item ? item.expectedQuantity : undefined;
                        const inventarizatsiyaOmbori =
                          tur === "inventarizatsiya"
                            ? (hujjat as InventarizatsiyaHujjati).warehouse?.name ??
                              store.omborlar.find(
                                (warehouse) =>
                                  warehouse.id === (hujjat as InventarizatsiyaHujjati).warehouseId
                              )?.name ??
                              "Noma'lum ombor"
                            : "";
                        return (
                          <tr key={item.id ?? `${item.modificationId}-${index}`}>
                            <td className="px-4 py-3 font-bold">
                              {modificationNomi(mod)}
                            </td>
                            {tur === "inventarizatsiya" ? (
                              <>
                                <td className="px-4 py-3 text-slate-500">{mod?.barcode ?? "вЂ”"}</td>
                                <td className="px-4 py-3">{inventarizatsiyaOmbori}</td>
                                <td className="px-4 py-3">{expectedQuantity ?? "вЂ”"}</td>
                                <td className="px-4 py-3 font-black text-slate-900">{quantity}</td>
                                <td
                                  className={`px-4 py-3 font-black ${
                                    expectedQuantity == null || Number(quantity) === Number(expectedQuantity)
                                      ? "text-slate-500"
                                      : Number(quantity) > Number(expectedQuantity)
                                        ? "text-emerald-600"
                                        : "text-red-500"
                                  }`}
                                >
                                  {expectedQuantity == null
                                    ? "вЂ”"
                                    : Number(quantity) - Number(expectedQuantity) > 0
                                      ? `+${Number(quantity) - Number(expectedQuantity)}`
                                      : Number(quantity) - Number(expectedQuantity)}
                                </td>
                              </>
                            ) : (
                              <>
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
                              </>
                            )}
                          </tr>
                        );
                      })}
                      {(hujjat.items ?? []).length === 0 && (
                        <tr>
                          <td
                            colSpan={tur === "inventarizatsiya" ? 6 : tur === "kirim" ? 4 : 2}
                            className="px-5 py-12 text-center font-bold text-slate-400"
                          >
                            Mahsulotlar mavjud emas
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                </section>

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

                <div className="mt-5">
                  <InventoryDocumentActivity documentType={documentTypes[tur]} documentId={hujjat.id}/>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  {hujjatHolati(hujjat) === "CONFIRMED" && tur === "inventarizatsiya" && (
                    <button
                      type="button"
                      onClick={() => void inventarizatsiyaniBekorQilish()}
                      disabled={store.amalBajarilmoqda}
                      className="inline-flex h-12 items-center gap-2 rounded-2xl bg-red-500 px-6 font-black text-white shadow-lg shadow-red-100 transition hover:bg-red-600 disabled:opacity-50"
                    >
                      {store.amalBajarilmoqda ? (
                        <LoaderCircle size={18} className="animate-spin" />
                      ) : (
                        <Ban size={18} />
                      )}
                      Bekor qilish
                    </button>
                  )}
                  {qoralama && tur === "inventarizatsiya" && (
                    <button
                      type="button"
                      onClick={() => void inventarizatsiyaniYakunlash()}
                      disabled={store.amalBajarilmoqda}
                      className="inline-flex h-12 items-center gap-2 rounded-2xl bg-emerald-500 px-6 font-black text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-600 disabled:opacity-50"
                    >
                      {store.amalBajarilmoqda ? (
                        <LoaderCircle size={18} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={18} />
                      )}
                      Tasdiqlash
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div>
                <div className="grid gap-4 md:grid-cols-2">
                  {tur === "kirim" && (
                    <AppSelect
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
                    </AppSelect>
                  )}
                  {(tur === "kirim" ||
                    tur === "chiqim" ||
                    tur === "inventarizatsiya") && (
                    <AppSelect
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
                    </AppSelect>
                  )}
                  {tur === "kochirish" && (
                    <>
                      <AppSelect
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
                      </AppSelect>
                      <AppSelect
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
                      </AppSelect>
                    </>
                  )}
                  {tur === "chiqim" && (
                    <AppSelect
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
                    </AppSelect>
                  )}
                  {tur === "inventarizatsiya" && (
                    <AppSelect
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
                    </AppSelect>
                  )}
                  <AppSelect
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
                  </AppSelect>
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
                      <AppSelect
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
                              ? ` вЂ” ${modification.barcode}`
                              : ""}
                          </option>
                        ))}
                      </AppSelect>
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
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
      <div className="flex items-center gap-2 text-gray-400">
        <Package size={15} />
        <span className="text-xs font-bold uppercase tracking-wider">{nom}</span>
      </div>
      <p className="mt-2 break-words text-base font-black text-slate-800">{qiymat}</p>
    </div>
  );
}
