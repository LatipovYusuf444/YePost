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
import { useTranslation } from "react-i18next";
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

const documentTypes: Record<InventoryHujjatTuri, InventoryDocumentType> = {
  kirim: "PURCHASE", chiqim: "WRITE_OFF", kochirish: "TRANSFER", inventarizatsiya: "STOCK_TAKE",
};

const chiqimSabablari: ChiqimSababi[] = ["DAMAGE", "EXPIRY", "THEFT", "OTHER"];

function hujjatHolati(hujjat: Hujjat | null) {
  return String(hujjat?.status ?? "DRAFT").toUpperCase();
}

export default function InventoryHujjatModal({ tur, id, onClose }: Props) {
  const { t } = useTranslation("ombor_hujjat");
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
          ? "errors.invalidStockTakeQuantity"
          : "errors.invalidItems"
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
    if (!window.confirm(t("confirm.cancelStockTake"))) return;
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
      <div className="scrollbar-hidden max-h-[95vh] w-full max-w-[1500px] overflow-y-auto rounded-[36px] border border-orange-100 bg-[#F8FAFC] shadow-[0_30px_100px_rgba(15,23,42,.28)]">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-orange-100 bg-[#F8FAFC]/95 px-7 py-5 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-200">
              <FileText size={22} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-500">
                {t("header.detailsLabel")}
              </p>
              <h2 className="text-2xl font-black text-slate-950 sm:text-3xl">
                {t(`documentTitles.${tur}`)}
                {hujjat ? ` · ${hujjatRaqami(hujjat)}` : ""}
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
                  <Ban size={17} /> {t("actions.cancel")}
                </button>
                <button
                  type="button"
                  onClick={() => void kochirishHolatiniYangilash("send")}
                  disabled={store.amalBajarilmoqda}
                  className="inline-flex h-12 items-center gap-2 rounded-2xl bg-sky-500 px-4 font-black text-white transition hover:bg-sky-600 disabled:opacity-50"
                >
                  <Send size={17} /> {t("actions.send")}
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
                <PackageCheck size={18} /> {t("actions.receive")}
              </button>
            )}
            {hujjat && qoralama && !tahrir && (
              <button
                type="button"
                onClick={tahrirlashniBoshlash}
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-orange-500 px-5 font-black text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600"
              >
                <Edit3 size={18} /> {t("actions.edit")}
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
            {t("header.loadError")}
          </div>
        ) : (
          <div className="p-5 sm:p-7">
            {(store.xatolik || validatsiyaXatosi) && (
              <div className="mb-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
                {validatsiyaXatosi ? t(validatsiyaXatosi) : store.xatolik}
              </div>
            )}

            {!tahrir ? (
              <>
                <section className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
                  <h3 className="border-b border-orange-100 pb-4 text-sm font-black uppercase tracking-wide text-slate-600">
                    {t("header.aboutTitle", { title: t(`documentTitles.${tur}`) })}
                  </h3>
                  {korishJami != null && (
                    <div className="mt-5 rounded-[24px] bg-gradient-to-br from-orange-50 to-orange-100/70 px-7 py-8">
                      <p className="text-xs font-black uppercase tracking-wider text-orange-600">{t("view.totalAmount")}</p>
                      <p className="mt-2 text-4xl font-black tracking-tight text-slate-950">{pul(korishJami)}</p>
                    </div>
                  )}
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Malumot nom={t("view.status")} qiymat={holat(hujjat.status)} />
                  <Malumot nom={t("view.createdAt")} qiymat={sana(hujjat.createdAt)} />
                  <Malumot
                    nom={t("view.responsible")}
                    qiymat={
                      hujjat.responsible?.fullName ??
                      hujjat.responsible?.username ??
                      store.xodimlar.find(
                        (item) => item.id === hujjat.responsibleId
                      )?.fullName ??
                      t("view.unassigned")
                    }
                  />
                  <Malumot nom={t("view.products")} qiymat={t("view.productsCount", { count: hujjat.items?.length ?? 0 })} />
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {tur === "kirim" && (
                    <>
                      <Malumot
                        nom={t("view.supplier")}
                        qiymat={
                          (hujjat as KirimHujjati).supplier?.name ??
                          store.yetkazibBeruvchilar.find(
                            (item) =>
                              item.id === (hujjat as KirimHujjati).supplierId
                          )?.name ??
                          t("view.unknownSupplier")
                        }
                      />
                      <Malumot
                        nom={t("view.warehouse")}
                        qiymat={
                          (hujjat as KirimHujjati).warehouse?.name ??
                          store.omborlar.find(
                            (item) =>
                              item.id === (hujjat as KirimHujjati).warehouseId
                          )?.name ??
                          t("view.unknownWarehouse")
                        }
                      />
                    </>
                  )}
                  {tur === "chiqim" && (
                    <>
                      <Malumot
                        nom={t("view.warehouse")}
                        qiymat={
                          (hujjat as ChiqimHujjati).warehouse?.name ??
                          store.omborlar.find(
                            (item) =>
                              item.id === (hujjat as ChiqimHujjati).warehouseId
                          )?.name ??
                          t("view.unknownWarehouse")
                        }
                      />
                      <Malumot
                        nom={t("view.writeOffReason")}
                        qiymat={t(
                          `reasons.${String((hujjat as ChiqimHujjati).reason ?? "").toLowerCase()}`,
                          { defaultValue: (hujjat as ChiqimHujjati).reason }
                        )}
                      />
                    </>
                  )}
                  {tur === "kochirish" && (
                    <>
                      <Malumot
                        nom={t("view.sourceWarehouse")}
                        qiymat={
                          (hujjat as KochirishHujjati).sourceWarehouse?.name ??
                          store.omborlar.find(
                            (item) =>
                              item.id ===
                              (hujjat as KochirishHujjati).sourceWarehouseId
                          )?.name ??
                          t("view.unknownWarehouse")
                        }
                      />
                      <Malumot
                        nom={t("view.destWarehouse")}
                        qiymat={
                          (hujjat as KochirishHujjati).destWarehouse?.name ??
                          store.omborlar.find(
                            (item) =>
                              item.id ===
                              (hujjat as KochirishHujjati).destWarehouseId
                          )?.name ??
                          t("view.unknownWarehouse")
                        }
                      />
                    </>
                  )}
                  {tur === "inventarizatsiya" && (
                    <>
                      <Malumot
                        nom={t("view.warehouse")}
                        qiymat={
                          (hujjat as InventarizatsiyaHujjati).warehouse?.name ??
                          store.omborlar.find(
                            (item) =>
                              item.id ===
                              (hujjat as InventarizatsiyaHujjati).warehouseId
                          )?.name ??
                          t("view.unknownWarehouse")
                        }
                      />
                      <Malumot
                        nom={t("view.stockTakeType")}
                        qiymat={
                          (hujjat as InventarizatsiyaHujjati).type === "PARTIAL"
                            ? t("stockTakeType.partial")
                            : t("stockTakeType.full")
                        }
                      />
                    </>
                  )}
                </div>
                </section>

                <section className="mt-5 rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
                  <h3 className="border-b border-orange-100 pb-4 text-sm font-black uppercase tracking-wide text-slate-600">{t("table.sectionTitle")}</h3>
                <div className="mt-5 overflow-x-auto rounded-2xl border border-orange-100">
                  <table className="w-full min-w-[700px] text-left text-sm">
                    <thead className="bg-slate-50 text-gray-600">
                      <tr>
                        <th className="px-4 py-3">{t("table.product")}</th>
                        {tur === "inventarizatsiya" ? (
                          <>
                            <th className="px-4 py-3">{t("table.barcode")}</th>
                            <th className="px-4 py-3">{t("table.warehouse")}</th>
                            <th className="px-4 py-3">{t("table.systemQuantity")}</th>
                            <th className="px-4 py-3">{t("table.actualQuantity")}</th>
                            <th className="px-4 py-3">{t("table.difference")}</th>
                          </>
                        ) : (
                          <>
                            <th className="px-4 py-3">{t("table.quantity")}</th>
                            {tur === "kirim" && (
                              <>
                                <th className="px-4 py-3">{t("table.price")}</th>
                                <th className="px-4 py-3">{t("table.total")}</th>
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
                              t("view.unknownWarehouse")
                            : "";
                        return (
                          <tr key={item.id ?? `${item.modificationId}-${index}`}>
                            <td className="px-4 py-3 font-bold">
                              {modificationNomi(mod)}
                            </td>
                            {tur === "inventarizatsiya" ? (
                              <>
                                <td className="px-4 py-3 text-slate-500">{mod?.barcode ?? "—"}</td>
                                <td className="px-4 py-3">{inventarizatsiyaOmbori}</td>
                                <td className="px-4 py-3">{expectedQuantity ?? "—"}</td>
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
                                    ? "—"
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
                            {t("table.empty")}
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
                      {t("view.note")}
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
                      {t("actions.cancel")}
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
                      {t("actions.confirmStockTake")}
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
                      <option value="">{t("form.supplierPlaceholder")}</option>
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
                      <option value="">{t("form.warehousePlaceholder")}</option>
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
                        <option value="">{t("form.sourceWarehousePlaceholder")}</option>
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
                        <option value="">{t("form.destWarehousePlaceholder")}</option>
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
                      {chiqimSabablari.map((value) => (
                        <option key={value} value={value}>
                          {t(`reasons.${value.toLowerCase()}`)}
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
                      <option value="FULL">{t("stockTakeType.full")}</option>
                      <option value="PARTIAL">{t("stockTakeType.partial")}</option>
                    </AppSelect>
                  )}
                  <AppSelect
                    value={responsibleId}
                    onChange={(event) => setResponsibleId(event.target.value)}
                    className="h-12 rounded-2xl border px-4"
                  >
                    <option value="">{t("form.responsibleUnassigned")}</option>
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
                        <option value="">{t("form.productPlaceholder")}</option>
                        {store.modifikatsiyalar.map((modification) => (
                          <option key={modification.id} value={modification.id}>
                            {modificationNomi(modification)}
                            {modification.barcode
                              ? ` — ${modification.barcode}`
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
                            ? t("form.actualQuantityPlaceholder")
                            : t("form.quantityPlaceholder")
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
                          placeholder={t("form.costPricePlaceholder")}
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
                    {t("actions.addProduct")}
                  </button>
                </div>

                {tur === "kirim" && (
                  <div className="mt-4 flex justify-end rounded-2xl bg-orange-50 p-4">
                    <span className="font-black text-orange-700">
                      {t("view.documentTotal", { amount: pul(jami) })}
                    </span>
                  </div>
                )}

                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="mt-5 min-h-24 w-full rounded-2xl border p-4 outline-none focus:border-orange-300"
                  placeholder={t("form.notePlaceholder")}
                />

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setTahrir(false)}
                    className="h-11 rounded-2xl bg-gray-100 px-5 font-bold text-gray-600"
                  >
                    {t("actions.cancel")}
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
                    {t("actions.saveChanges")}
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
