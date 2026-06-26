import { useMemo, useState, type FormEvent } from "react";
import { LoaderCircle, Plus, Trash2, X } from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import type {
  MijozTanlovi,
  OmborTanlovi,
  QoldiqTanlovi,
  SotuvYaratishMalumoti,
  TolovTuri,
  XodimTanlovi,
} from "@/types/savdo";
import { pulniFormatlash } from "./savdoYordamchilari";

type YangiSotuvModalProps = {
  omborlar: OmborTanlovi[];
  mijozlar: MijozTanlovi[];
  mijozKompaniyalari: MijozTanlovi[];
  xodimlar: XodimTanlovi[];
  qoldiqlar: QoldiqTanlovi[];
  amalBajarilmoqda: boolean;
  onOmborTanlash: (omborId: string) => void;
  onSaqlash: (malumot: SotuvYaratishMalumoti) => Promise<boolean>;
  onYopish: () => void;
};

type MahsulotQatori = {
  modificationId: string;
  quantity: number;
  price: number;
  discount: number;
};

function qoldiqNomi(qoldiq: QoldiqTanlovi) {
  return (
    qoldiq.modification?.product?.name ??
    qoldiq.modification?.name ??
    qoldiq.modificationId
  );
}

function qoldiqNarxi(qoldiq?: QoldiqTanlovi) {
  return (
    qoldiq?.sellingPrice ??
    qoldiq?.price ??
    qoldiq?.modification?.price?.sellingPrice ??
    qoldiq?.modification?.price?.retailPrice ??
    0
  );
}

export default function YangiSotuvModal({
  omborlar,
  mijozlar,
  mijozKompaniyalari,
  xodimlar,
  qoldiqlar,
  amalBajarilmoqda,
  onOmborTanlash,
  onSaqlash,
  onYopish,
}: YangiSotuvModalProps) {
  const [warehouseId, setWarehouseId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [clientCompanyId, setClientCompanyId] = useState("");
  const [responsibleId, setResponsibleId] = useState("");
  const [note, setNote] = useState("");
  const [tolovTuri, setTolovTuri] = useState<TolovTuri>("CASH");
  const [tolovSummasi, setTolovSummasi] = useState(0);
  const [mahsulotlar, setMahsulotlar] = useState<MahsulotQatori[]>([
    { modificationId: "", quantity: 1, price: 0, discount: 0 },
  ]);
  const [xatolik, setXatolik] = useState("");

  const jami = useMemo(
    () =>
      mahsulotlar.reduce(
        (summa, mahsulot) =>
          summa + mahsulot.quantity * mahsulot.price - mahsulot.discount,
        0
      ),
    [mahsulotlar]
  );

  function mahsulotniYangilash(index: number, yangilanish: Partial<MahsulotQatori>) {
    setMahsulotlar((joriy) =>
      joriy.map((mahsulot, qatorIndex) =>
        qatorIndex === index ? { ...mahsulot, ...yangilanish } : mahsulot
      )
    );
  }

  function modifikatsiyaniTanlash(index: number, modificationId: string) {
    const qoldiq = qoldiqlar.find((item) => item.modificationId === modificationId);
    mahsulotniYangilash(index, {
      modificationId,
      price: qoldiqNarxi(qoldiq),
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setXatolik("");

    const tozaMahsulotlar = mahsulotlar.filter(
      (mahsulot) =>
        mahsulot.modificationId && mahsulot.quantity > 0 && mahsulot.price >= 0
    );

    if (!warehouseId) {
      setXatolik("Avval omborni tanlang.");
      return;
    }

    if (tozaMahsulotlar.length === 0) {
      setXatolik("Kamida bitta mahsulot tanlang.");
      return;
    }

    const muvaffaqiyatli = await onSaqlash({
      warehouseId,
      customerId: customerId || undefined,
      clientCompanyId: clientCompanyId || undefined,
      responsibleId: responsibleId || undefined,
      saleType: customerId || clientCompanyId ? "CLIENT" : "QUICK",
      note: note.trim() || undefined,
      items: tozaMahsulotlar,
      payments:
        tolovSummasi > 0 ? [{ paymentType: tolovTuri, amount: tolovSummasi }] : [],
    });

    if (muvaffaqiyatli) onYopish();
  }

  return (
    <AppModal>
      <form
        onSubmit={submit}
        className="scrollbar-hidden max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-[30px] bg-white shadow-2xl"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-orange-100 bg-white/95 p-6 backdrop-blur-xl">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-orange-500">
              Yangi sotuv
            </p>
            <h2 className="text-2xl font-black text-gray-950">Yangi sotuv yaratish</h2>
          </div>
          <button
            type="button"
            onClick={onYopish}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100 text-gray-600 hover:bg-orange-500 hover:text-white"
            aria-label="Oynani yopish"
          >
            <X size={20} />
          </button>
        </header>

        <div className="space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-bold text-gray-700">
              <span>Ombor *</span>
              <select
                value={warehouseId}
                onChange={(event) => {
                  setWarehouseId(event.target.value);
                  onOmborTanlash(event.target.value);
                }}
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 font-medium outline-none focus:border-orange-400"
              >
                <option value="">Omborni tanlang</option>
                {omborlar.map((ombor) => (
                  <option key={ombor.id} value={ombor.id}>
                    {ombor.name ?? ombor.id}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-bold text-gray-700">
              <span>Mas'ul xodim</span>
              <select
                value={responsibleId}
                onChange={(event) => setResponsibleId(event.target.value)}
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 font-medium outline-none focus:border-orange-400"
              >
                <option value="">Mas'ul xodimni tanlang</option>
                {xodimlar.map((xodim) => (
                  <option key={xodim.id} value={xodim.id}>
                    {xodim.fullName ?? xodim.username ?? xodim.id}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-bold text-gray-700">
              <span>Jismoniy mijoz</span>
              <select
                value={customerId}
                onChange={(event) => {
                  setCustomerId(event.target.value);
                  if (event.target.value) setClientCompanyId("");
                }}
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 font-medium outline-none focus:border-orange-400"
              >
                <option value="">Donalik mijoz</option>
                {mijozlar.map((mijoz) => (
                  <option key={mijoz.id} value={mijoz.id}>
                    {[mijoz.firstName, mijoz.lastName].filter(Boolean).join(" ") ||
                      mijoz.fullName ||
                      mijoz.name ||
                      mijoz.id}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-bold text-gray-700">
              <span>Mijoz kompaniyasi</span>
              <select
                value={clientCompanyId}
                onChange={(event) => {
                  setClientCompanyId(event.target.value);
                  if (event.target.value) setCustomerId("");
                }}
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 font-medium outline-none focus:border-orange-400"
              >
                <option value="">Kompaniya tanlanmagan</option>
                {mijozKompaniyalari.map((kompaniya) => (
                  <option key={kompaniya.id} value={kompaniya.id}>
                    {kompaniya.name ?? kompaniya.id}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {omborlar.length === 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
              Serverda ombor mavjud emas. Sotuv yaratishdan oldin “Sozlamalar → Ombor”
              bo‘limida ombor yaratilishi kerak.
            </div>
          )}

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">Mahsulotlar</h3>
              <button
                type="button"
                onClick={() =>
                  setMahsulotlar((joriy) => [
                    ...joriy,
                    { modificationId: "", quantity: 1, price: 0, discount: 0 },
                  ])
                }
                className="inline-flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-xs font-bold text-orange-600"
              >
                <Plus size={15} />
                Qator qo'shish
              </button>
            </div>

            <div className="space-y-3">
              {mahsulotlar.map((mahsulot, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-2xl border border-gray-100 p-4 md:grid-cols-[minmax(220px,1fr)_110px_150px_130px_44px]"
                >
                  <select
                    value={mahsulot.modificationId}
                    onChange={(event) => modifikatsiyaniTanlash(index, event.target.value)}
                    className="h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none"
                  >
                    <option value="">Mahsulotni tanlang</option>
                    {qoldiqlar.map((qoldiq) => (
                      <option key={qoldiq.modificationId} value={qoldiq.modificationId}>
                        {qoldiqNomi(qoldiq)} — qoldiq: {qoldiq.quantity ?? qoldiq.balance ?? 0}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={mahsulot.quantity}
                    onChange={(event) =>
                      mahsulotniYangilash(index, { quantity: Number(event.target.value) })
                    }
                    className="h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none"
                    placeholder="Miqdor"
                  />
                  <input
                    type="number"
                    min="0"
                    value={mahsulot.price}
                    onChange={(event) =>
                      mahsulotniYangilash(index, { price: Number(event.target.value) })
                    }
                    className="h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none"
                    placeholder="Narx"
                  />
                  <input
                    type="number"
                    min="0"
                    value={mahsulot.discount}
                    onChange={(event) =>
                      mahsulotniYangilash(index, { discount: Number(event.target.value) })
                    }
                    className="h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none"
                    placeholder="Chegirma"
                  />
                  <button
                    type="button"
                    disabled={mahsulotlar.length === 1}
                    onClick={() =>
                      setMahsulotlar((joriy) =>
                        joriy.filter((_, qatorIndex) => qatorIndex !== index)
                      )
                    }
                    className="flex h-11 items-center justify-center rounded-xl bg-red-50 text-red-500 disabled:opacity-30"
                    aria-label="Mahsulot qatorini o'chirish"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 rounded-2xl bg-gray-50 p-5 md:grid-cols-3">
            <label className="space-y-2 text-sm font-bold text-gray-700">
              <span>To'lov turi</span>
              <select
                value={tolovTuri}
                onChange={(event) => setTolovTuri(event.target.value as TolovTuri)}
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3"
              >
                <option value="CASH">Naqd</option>
                <option value="CARD">Karta</option>
                <option value="BANK">Bank o'tkazmasi</option>
                <option value="DEBT">Qarz</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-bold text-gray-700">
              <span>To'lov summasi</span>
              <input
                type="number"
                min="0"
                value={tolovSummasi}
                onChange={(event) => setTolovSummasi(Number(event.target.value))}
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3"
              />
            </label>
            <div className="flex flex-col justify-end">
              <p className="text-xs font-bold uppercase text-gray-400">Sotuv jami</p>
              <p className="mt-1 text-xl font-black text-gray-950">{pulniFormatlash(jami)}</p>
            </div>
          </div>

          <label className="block space-y-2 text-sm font-bold text-gray-700">
            <span>Izoh</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              className="w-full resize-none rounded-2xl border border-gray-200 p-4 font-medium outline-none focus:border-orange-400"
              placeholder="Sotuv bo'yicha qo'shimcha izoh"
            />
          </label>

          {xatolik && (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
              {xatolik}
            </div>
          )}
        </div>

        <footer className="sticky bottom-0 flex justify-end gap-3 border-t border-orange-100 bg-white/95 p-6 backdrop-blur-xl">
          <button
            type="button"
            onClick={onYopish}
            className="h-12 rounded-2xl bg-gray-100 px-5 text-sm font-bold text-gray-600"
          >
            Yopish
          </button>
          <button
            type="submit"
            disabled={amalBajarilmoqda || omborlar.length === 0}
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-orange-500 px-6 text-sm font-black text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {amalBajarilmoqda && <LoaderCircle size={17} className="animate-spin" />}
            Qoralama saqlash
          </button>
        </footer>
      </form>
    </AppModal>
  );
}
