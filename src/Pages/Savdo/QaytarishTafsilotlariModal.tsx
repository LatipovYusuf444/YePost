import { useEffect, useMemo, useState } from "react";
import {
  Edit3,
  LoaderCircle,
  Package,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { sotuvTafsilotiniOlish } from "@/api/savdoApi";
import { mahsulotlarApi, modifikatsiyalarApi } from "@/api/catalogApi";
import { useSavdoStore } from "@/store/savdoStore";
import type {
  Qaytarish,
  QaytarishSababi,
  QaytarishToloviniQaytarishUsuli as RefundMethod,
} from "@/types/savdo";
import {
  mijozNomi,
  pulniFormatlash,
  qaytarishSummasi,
  sananiFormatlash,
  sotuvMahsulotiId,
  sotuvMahsulotiMiqdori,
  sotuvMahsulotiModifikatsiyaId,
  sotuvMahsulotiNarxi,
  sotuvRaqami,
} from "./savdoYordamchilari";
import SavdoSelect from "./SavdoSelect";

type Props = {
  qaytarishId: string;
  onYopish: () => void;
};

type Qator = {
  saleItemId: string;
  modificationId: string;
  quantity: number;
  price: number;
  maxQuantity: number;
  nom: string;
};

const sababMatni: Record<QaytarishSababi, string> = {
  DEFECT: "Nuqsonli mahsulot",
  WRONG: "Noto'g'ri mahsulot",
  OTHER: "Boshqa sabab",
};

const refundMethodMatni: Record<RefundMethod, string> = {
  CASH: "Naqd",
  CARD: "Karta",
  BALANCE: "Mijoz balansiga",
  NONE: "Pul qaytarilmaydi",
};

function mahsulotNomi(item: {
  modificationId: string;
  modification?: {
    name?: string;
    product?: { name?: string };
  };
}) {
  const productName = item.modification?.product?.name;
  const variantName = item.modification?.name;
  return [productName, variantName && variantName !== productName ? variantName : ""]
    .filter(Boolean)
    .join(" / ") || item.modificationId;
}

function sababniOzbekcha(reason?: string) {
  return sababMatni[String(reason ?? "OTHER").toUpperCase() as QaytarishSababi] ?? "Boshqa sabab";
}

function refundMethodniOzbekcha(method?: string) {
  return refundMethodMatni[String(method ?? "CASH").toUpperCase() as RefundMethod] ?? "Naqd";
}

export default function QaytarishTafsilotlariModal({
  qaytarishId,
  onYopish,
}: Props) {
  const qaytarishTafsilotiniYuklash = useSavdoStore(
    (state) => state.qaytarishTafsilotiniYuklash
  );
  const qaytarishniYangilash = useSavdoStore(
    (state) => state.qaytarishniYangilash
  );
  const xatolikniTozalash = useSavdoStore(
    (state) => state.xatolikniTozalash
  );
  const sotuvlar = useSavdoStore((state) => state.sotuvlar);
  const omborlar = useSavdoStore((state) => state.omborlar);
  const xodimlar = useSavdoStore((state) => state.xodimlar);
  const amalBajarilmoqda = useSavdoStore(
    (state) => state.amalBajarilmoqda
  );
  const xatolik = useSavdoStore((state) => state.xatolik);

  const [qaytarish, setQaytarish] = useState<Qaytarish | null>(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [tahrir, setTahrir] = useState(false);
  const [sotuvYuklanmoqda, setSotuvYuklanmoqda] = useState(false);
  const [saleId, setSaleId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [responsibleId, setResponsibleId] = useState("");
  const [reason, setReason] = useState<QaytarishSababi>("OTHER");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<Qator[]>([]);

  useEffect(() => {
    let faol = true;
    async function yuklash() {
      setYuklanmoqda(true);
      xatolikniTozalash();
      const item = await qaytarishTafsilotiniYuklash(qaytarishId);
      if (!faol) return;
      if (item?.saleId) {
        try {
          const sale = await sotuvTafsilotiniOlish(item.saleId);
          if (!faol) return;
          const sotuvdanBoyitilgan = (item.items ?? []).map((returnItem) => {
            const saleItem = (sale.items ?? []).find(
              (candidate) =>
                sotuvMahsulotiId(candidate) === returnItem.saleItemId ||
                sotuvMahsulotiModifikatsiyaId(candidate) === returnItem.modificationId
            );
            return { ...returnItem, modification: returnItem.modification ?? saleItem?.modification };
          });
          const boyitilganItems = await Promise.all(
            sotuvdanBoyitilgan.map(async (returnItem) => {
              if (returnItem.modification?.product?.name) return returnItem;
              try {
                const modification = await modifikatsiyalarApi.olish(returnItem.modificationId);
                const nestedProduct = (modification as typeof modification & { product?: { id: string; name?: string } }).product;
                const productId = modification.productId ?? nestedProduct?.id;
                let product = null;
                if (productId) {
                  try {
                    product = await mahsulotlarApi.olish(productId);
                  } catch {
                    product = null;
                  }
                }
                return {
                  ...returnItem,
                  modification: {
                    ...returnItem.modification,
                    id: modification.id,
                    name: modification.name ?? returnItem.modification?.name,
                    product: product
                      ? { id: product.id, name: product.name }
                      : nestedProduct?.name
                        ? { id: nestedProduct.id, name: nestedProduct.name }
                        : returnItem.modification?.product,
                  },
                };
              } catch {
                return returnItem;
              }
            })
          );
          if (!faol) return;
          setQaytarish({ ...item, sale, items: boyitilganItems });
        } catch {
          setQaytarish(item);
        }
      } else {
        setQaytarish(item);
      }
      setYuklanmoqda(false);
    }
    void yuklash();
    return () => {
      faol = false;
    };
  }, [qaytarishId, qaytarishTafsilotiniYuklash, xatolikniTozalash]);

  async function sotuvdanQatorlar(sotuvId: string, mavjud?: Qaytarish) {
    setSotuvYuklanmoqda(true);
    try {
      const sotuv = await sotuvTafsilotiniOlish(sotuvId);
      setWarehouseId(sotuv.warehouseId ?? sotuv.warehouse?.id ?? "");
      setResponsibleId(sotuv.responsibleId ?? "");
      setItems(
        (sotuv.items ?? [])
          .map((item) => {
            const saleItemId = sotuvMahsulotiId(item);
            const modificationId = sotuvMahsulotiModifikatsiyaId(item);
            const sotilganMiqdor = sotuvMahsulotiMiqdori(item);
            const sotilganNarx = sotuvMahsulotiNarxi(item);
            const qaytarilgan = mavjud?.items?.find(
              (qaytarishItem) =>
                qaytarishItem.saleItemId === saleItemId ||
                qaytarishItem.saleItemId === item.saleItemId
            );
            return {
              saleItemId,
              modificationId,
              quantity: Number(qaytarilgan?.quantity ?? sotilganMiqdor),
              price: Number(qaytarilgan?.price ?? sotilganNarx),
              maxQuantity: sotilganMiqdor,
              nom: mahsulotNomi(item),
            };
          })
          .filter(
            (item) =>
              item.saleItemId &&
              item.modificationId &&
              Number.isFinite(item.quantity) &&
              Number.isFinite(item.price) &&
              item.maxQuantity >= 0.001
          )
      );
      return sotuv;
    } finally {
      setSotuvYuklanmoqda(false);
    }
  }

  async function tahrirlashniBoshlash() {
    if (!qaytarish) return;
    xatolikniTozalash();
    setSaleId(qaytarish.saleId);
    setWarehouseId(qaytarish.warehouseId);
    setResponsibleId(qaytarish.responsibleId ?? "");
    setReason((qaytarish.reason as QaytarishSababi) ?? "OTHER");
    setNote(qaytarish.note ?? "");

    if (qaytarish.saleId) {
      await sotuvdanQatorlar(qaytarish.saleId, qaytarish);
    } else {
      setItems(
        (qaytarish.items ?? []).map((item) => ({
          saleItemId: item.saleItemId,
          modificationId: item.modificationId,
          quantity: Number(item.quantity),
          price: Number(item.price),
          maxQuantity: Number(item.quantity),
          nom: mahsulotNomi(item),
        }))
      );
    }
    setTahrir(true);
  }

  async function sotuvniTanlash(yangiSaleId: string) {
    setSaleId(yangiSaleId);
    if (!yangiSaleId) {
      setItems([]);
      return;
    }
    await sotuvdanQatorlar(yangiSaleId);
  }

  const tanlanganQatorlar = useMemo(
    () =>
      items.filter(
        (item) =>
          item.saleItemId &&
          item.modificationId &&
          item.quantity > 0 &&
          item.quantity <= item.maxQuantity
      ),
    [items]
  );

  const jami = useMemo(
    () =>
      tanlanganQatorlar.reduce(
        (summa, item) => summa + item.quantity * item.price,
        0
      ),
    [tanlanganQatorlar]
  );

  async function saqlash() {
    if (
      !qaytarish ||
      !saleId ||
      !warehouseId ||
      tanlanganQatorlar.length === 0
    )
      return;

    const yangilangan = await qaytarishniYangilash(qaytarish.id, {
      saleId,
      warehouseId,
      responsibleId: responsibleId || undefined,
      reason,
      note,
      items: tanlanganQatorlar.map(
        ({ saleItemId, modificationId, quantity, price }) => ({
          saleItemId,
          modificationId,
          quantity,
          price,
        })
      ),
    });
    if (!yangilangan) return;

    const toliq = await qaytarishTafsilotiniYuklash(qaytarish.id);
    setQaytarish(toliq ?? yangilangan);
    setTahrir(false);
  }

  const holat = String(qaytarish?.status ?? "DRAFT").toUpperCase();
  const qoralama = holat === "DRAFT";
  const tasdiqlanganSotuvlar = sotuvlar.filter(
    (sotuv) =>
      String(sotuv.status).toUpperCase() === "CONFIRMED" &&
      (sotuv.items?.length ?? 0) > 0
  );

  return (
    <AppModal className="items-start justify-start bg-[rgba(54,22,8,.50)] p-3 backdrop-blur-[3px] lg:py-4 lg:pl-[88px] lg:pr-4">
      <section className="scrollbar-hidden h-[calc(100vh-24px)] w-full overflow-y-auto rounded-[34px] border border-orange-100 bg-gradient-to-br from-[#FFF8EF] via-[#FFFDF9] to-[#FFE8D2] text-[#253044] shadow-[0_34px_120px_rgba(92,38,8,.42)] ring-1 ring-white/80 lg:h-[calc(100vh-32px)] lg:rounded-l-[46px] lg:rounded-r-[36px]">
        <header className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-orange-100/80 bg-[#FFF8EF]/90 px-6 py-5 backdrop-blur-xl lg:px-10 lg:py-6">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-200">
              <RotateCcw size={22} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-500">
                Qaytarish tafsilotlari
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                {qaytarish
                  ? `Qaytarish В· ${qaytarish.id.slice(0, 8).toUpperCase()}`
                  : "Qaytarish hujjati"}
              </h2>
            </div>
          </div>
          <button
            onClick={onYopish}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm ring-1 ring-orange-100 transition hover:bg-orange-500 hover:text-white"
            aria-label="Oynani yopish"
          >
            <X size={19} />
          </button>
        </header>

        {yuklanmoqda ? (
          <div className="flex h-72 items-center justify-center">
            <LoaderCircle className="animate-spin text-orange-500" size={34} />
          </div>
        ) : !qaytarish ? (
          <div className="p-12 text-center text-gray-500">
            Qaytarish ma'lumotlarini olib bo'lmadi.
          </div>
        ) : (
          <div className="p-5 lg:p-9">
            {xatolik && (
              <div className="mb-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
                {xatolik}
              </div>
            )}

            {!tahrir ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Malumot nom="Holat" qiymat={holatMatni(holat)} />
                  <Malumot
                    nom="Sotuv"
                    qiymat={
                      qaytarish.sale
                        ? sotuvRaqami(qaytarish.sale)
                        : sotuvRaqami({ id: qaytarish.saleId })
                    }
                  />
                  <Malumot
                    nom="Summa"
                    qiymat={pulniFormatlash(qaytarishSummasi(qaytarish))}
                  />
                  <Malumot
                    nom="Yaratilgan sana"
                    qiymat={sananiFormatlash(qaytarish.createdAt)}
                  />
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Malumot
                    nom="Mijoz"
                    qiymat={
                      qaytarish.sale
                        ? mijozNomi(qaytarish.sale)
                        : "Ma'lumot mavjud emas"
                    }
                  />
                  <Malumot
                    nom="Ombor"
                    qiymat={
                      qaytarish.warehouse?.name ??
                      omborlar.find(
                        (item) => item.id === qaytarish.warehouseId
                      )?.name ??
                      qaytarish.warehouseId
                    }
                  />
                  <Malumot
                    nom="Sabab"
                    qiymat={
                      sababniOzbekcha(qaytarish.reason)
                    }
                  />
                  <Malumot
                    nom="Mas'ul xodim"
                    qiymat={
                      qaytarish.responsible?.fullName ??
                      xodimlar.find(
                        (item) => item.id === qaytarish.responsibleId
                      )?.fullName ??
                      "Biriktirilmagan"
                    }
                  />
                  <Malumot
                    nom="Pul qaytarish turi"
                    qiymat={
                      refundMethodniOzbekcha(qaytarish.refundMethod)
                    }
                  />
                </div>

                <div className="mt-7 overflow-hidden rounded-[26px] border border-orange-100 bg-white shadow-[0_16px_45px_rgba(249,115,22,.07)]">
                  <table className="w-full min-w-[650px] text-left text-sm">
                    <thead className="bg-[#FFF3E4] text-xs font-black uppercase tracking-wide text-orange-700/70">
                      <tr>
                        <th className="px-4 py-3">Mahsulot</th>
                        <th className="px-4 py-3">Miqdor</th>
                        <th className="px-4 py-3">Narx</th>
                        <th className="px-4 py-3">Jami</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-100">
                      {(qaytarish.items ?? []).map((item, index) => (
                        <tr key={item.id ?? `${item.saleItemId}-${index}`} className="transition hover:bg-orange-50/50">
                          <td className="px-4 py-3 font-bold">
                            {mahsulotNomi(item)}
                          </td>
                          <td className="px-4 py-3">{item.quantity}</td>
                          <td className="px-4 py-3">
                            {pulniFormatlash(item.price)}
                          </td>
                          <td className="px-4 py-3 font-black">
                            {pulniFormatlash(item.quantity * item.price)}
                          </td>
                        </tr>
                      ))}
                      {(qaytarish.items ?? []).length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-10 text-center text-gray-400"
                          >
                            Mahsulotlar mavjud emas
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {qaytarish.note && (
                  <div className="mt-5 rounded-[24px] border border-slate-100 bg-white/80 p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Izoh
                    </p>
                    <p className="mt-1 text-sm font-medium text-gray-700">
                      {qaytarish.note}
                    </p>
                  </div>
                )}

                <div className="mt-7 flex justify-end">
                  {qoralama ? (
                    <button
                      onClick={() => void tahrirlashniBoshlash()}
                      className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-5 font-black text-white"
                    >
                      <Edit3 size={17} />
                      Qaytarishni tahrirlash
                    </button>
                  ) : (
                    <p className="rounded-2xl bg-gray-100 px-4 py-3 text-sm font-bold text-gray-500">
                      Faqat qoralama qaytarishni tahrirlash mumkin.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-bold">
                    Tasdiqlangan sotuv *
                    <SavdoSelect
                      value={saleId}
                      onChange={(value) => void sotuvniTanlash(value)}
                      placeholder="Sotuvni tanlang"
                      className="mt-2"
                      buttonClassName="h-12"
                      options={[
                        ...tasdiqlanganSotuvlar.map((sotuv) => ({
                          value: sotuv.id,
                          label: `${sotuvRaqami(sotuv)} — ${mijozNomi(sotuv)}`,
                        })),
                        ...(!tasdiqlanganSotuvlar.some((sotuv) => sotuv.id === qaytarish.saleId)
                          ? [
                              {
                                value: qaytarish.saleId,
                                label: qaytarish.sale ? sotuvRaqami(qaytarish.sale) : sotuvRaqami({ id: qaytarish.saleId }),
                              },
                            ]
                          : []),
                      ]}
                    />
                  </label>
                  <label className="text-sm font-bold">
                    Ombor *
                    <SavdoSelect
                      value={warehouseId}
                      onChange={setWarehouseId}
                      placeholder="Omborni tanlang"
                      className="mt-2"
                      buttonClassName="h-12"
                      options={omborlar.map((item) => ({
                        value: item.id,
                        label: item.name ?? item.id,
                      }))}
                    />
                  </label>
                  <label className="text-sm font-bold">
                    Qaytarish sababi
                    <SavdoSelect
                      value={reason}
                      onChange={(value) => setReason(value as QaytarishSababi)}
                      className="mt-2"
                      buttonClassName="h-12"
                      options={Object.entries(sababMatni).map(([value, label]) => ({
                        value,
                        label,
                      }))}
                    />
                  </label>
                  <label className="text-sm font-bold">
                    Mas'ul xodim
                    <SavdoSelect
                      value={responsibleId}
                      onChange={setResponsibleId}
                      placeholder="Biriktirilmagan"
                      className="mt-2"
                      buttonClassName="h-12"
                      options={xodimlar.map((item) => ({
                        value: item.id,
                        label: item.fullName ?? item.name ?? item.id,
                      }))}
                    />
                  </label>
                </div>

                <div className="mt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-black">Qaytariladigan mahsulotlar</h3>
                      <p className="text-xs text-gray-400">
                        Miqdorni 0 qilish mahsulotni qaytarishdan chiqaradi.
                      </p>
                    </div>
                    {sotuvYuklanmoqda && (
                      <LoaderCircle
                        size={19}
                        className="animate-spin text-orange-500"
                      />
                    )}
                  </div>
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div
                        key={item.saleItemId}
                        className="grid items-center gap-3 rounded-2xl bg-gray-50 p-4 md:grid-cols-[1fr_130px_140px_44px]"
                      >
                        <div>
                          <p className="font-bold">{item.nom}</p>
                          <p className="mt-1 text-xs text-gray-400">
                            Sotilgan miqdor: {item.maxQuantity}
                          </p>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max={item.maxQuantity}
                          step="0.001"
                          value={item.quantity}
                          onChange={(event) =>
                            setItems((oldingi) =>
                              oldingi.map((qator, qatorIndex) =>
                                qatorIndex === index
                                  ? {
                                      ...qator,
                                      quantity: Number(event.target.value),
                                    }
                                  : qator
                              )
                            )
                          }
                          className={`h-11 rounded-xl border bg-white px-3 ${
                            item.quantity > item.maxQuantity
                              ? "border-red-300"
                              : ""
                          }`}
                        />
                        <div className="rounded-xl bg-white px-3 py-3 text-sm font-bold">
                          {pulniFormatlash(item.quantity * item.price)}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setItems((oldingi) =>
                              oldingi.map((qator, qatorIndex) =>
                                qatorIndex === index
                                  ? { ...qator, quantity: 0 }
                                  : qator
                              )
                            )
                          }
                          className="flex h-11 items-center justify-center rounded-xl bg-red-50 text-red-500"
                          aria-label="Mahsulotni qaytarishdan chiqarish"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {!sotuvYuklanmoqda && items.length === 0 && (
                      <div className="rounded-2xl border border-dashed p-10 text-center text-gray-400">
                        Sotuv mahsulotlari topilmadi.
                      </div>
                    )}
                  </div>
                </div>

                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="mt-5 min-h-24 w-full rounded-2xl border p-4 outline-none focus:border-orange-300"
                  placeholder="Qaytarish bo'yicha izoh"
                />

                <div className="mt-4 flex justify-end rounded-2xl bg-orange-50 p-4">
                  <span className="font-black text-orange-700">
                    Qaytarish summasi: {pulniFormatlash(jami)}
                  </span>
                </div>

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
                    disabled={
                      amalBajarilmoqda ||
                      sotuvYuklanmoqda ||
                      !saleId ||
                      !warehouseId ||
                      tanlanganQatorlar.length === 0
                    }
                    className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-6 font-black text-white disabled:opacity-50"
                  >
                    {amalBajarilmoqda ? (
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
      </section>
    </AppModal>
  );
}

function Malumot({ nom, qiymat }: { nom: string; qiymat: string }) {
  return (
    <div className="group min-h-[112px] rounded-[24px] border border-orange-100 bg-white/80 p-5 shadow-[0_12px_35px_rgba(249,115,22,.06)] transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_18px_45px_rgba(249,115,22,.10)]">
      <div className="flex items-center gap-2 text-slate-400">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-orange-500 transition group-hover:bg-orange-500 group-hover:text-white">
          <Package size={15} />
        </span>
        <span className="text-xs font-bold uppercase tracking-wider">{nom}</span>
      </div>
      <p className="mt-3 break-words text-base font-black text-slate-800">{qiymat}</p>
    </div>
  );
}

function holatMatni(holat: string) {
  if (holat === "CONFIRMED") return "Tasdiqlangan";
  if (holat === "CANCELLED" || holat === "CANCELED")
    return "Bekor qilingan";
  return "Qoralama";
}
