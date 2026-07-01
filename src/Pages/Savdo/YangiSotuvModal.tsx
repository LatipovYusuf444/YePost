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
import SavdoSelect from "./SavdoSelect";

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
  quantity: string;
  price: string;
  discount: string;
};

function qoldiqNomi(qoldiq: QoldiqTanlovi) {
  const productName = qoldiq.modification?.product?.name;
  const variantName = qoldiq.modification?.name;

  if (productName && variantName && variantName !== "Asosiy variant") {
    return `${productName} — ${variantName}`;
  }

  return productName ?? variantName ?? qoldiq.modificationId;
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

function raqamgaAylantirish(value: string) {
  if (!value.trim()) return 0;
  const number = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function mijozKorinishi(mijoz?: MijozTanlovi) {
  return (
    [mijoz?.firstName, mijoz?.lastName].filter(Boolean).join(" ") ||
    mijoz?.fullName ||
    mijoz?.name ||
    mijoz?.id ||
    "Mijoz"
  );
}

function mijozKompaniyaId(mijoz?: MijozTanlovi) {
  return mijoz?.companyId || mijoz?.company?.id || "";
}

function kompaniyaNomi(kompaniya?: MijozTanlovi) {
  return kompaniya?.name || kompaniya?.fullName || kompaniya?.id || "";
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
  const [tolovSummasi, setTolovSummasi] = useState("");
  const [mahsulotlar, setMahsulotlar] = useState<MahsulotQatori[]>([
    { modificationId: "", quantity: "1", price: "", discount: "" },
  ]);
  const [xatolik, setXatolik] = useState("");

  const jami = useMemo(
    () =>
      mahsulotlar.reduce(
        (summa, mahsulot) =>
          summa +
          raqamgaAylantirish(mahsulot.quantity) *
            raqamgaAylantirish(mahsulot.price) -
          raqamgaAylantirish(mahsulot.discount),
        0
      ),
    [mahsulotlar]
  );
  const tolovSummasiRaqam = raqamgaAylantirish(tolovSummasi);
  const qarzdorlik = Math.max(jami - tolovSummasiRaqam, 0);
  const ortiqchaTolov = Math.max(tolovSummasiRaqam - jami, 0);

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
      price: qoldiqNarxi(qoldiq) ? String(qoldiqNarxi(qoldiq)) : "",
    });
  }

  function mijozniTanlash(tanlanganCustomerId: string) {
    setCustomerId(tanlanganCustomerId);

    if (!tanlanganCustomerId) {
      setClientCompanyId("");
      return;
    }

    const mijoz = mijozlar.find((item) => item.id === tanlanganCustomerId);
    const boglanganKompaniyaId = mijozKompaniyaId(mijoz);

    if (boglanganKompaniyaId) {
      setClientCompanyId(boglanganKompaniyaId);
    } else {
      setClientCompanyId("");
    }
  }

  function kompaniyaniTanlash(tanlanganCompanyId: string) {
    setClientCompanyId(tanlanganCompanyId);

    if (!tanlanganCompanyId) {
      setCustomerId("");
      return;
    }

    const vakil = mijozlar.find((mijoz) => mijozKompaniyaId(mijoz) === tanlanganCompanyId);
    setCustomerId(vakil?.id ?? "");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setXatolik("");

    const tozaMahsulotlar = mahsulotlar
      .map((mahsulot) => ({
        modificationId: mahsulot.modificationId,
        quantity: raqamgaAylantirish(mahsulot.quantity),
        price: raqamgaAylantirish(mahsulot.price),
        discount: raqamgaAylantirish(mahsulot.discount),
      }))
      .filter(
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

    if (jami <= 0) {
      setXatolik("Sotuv summasi 0 dan katta bo'lishi kerak.");
      return;
    }

    if (tolovSummasiRaqam > jami) {
      setXatolik(
        `To'lov summasi sotuv jamidan oshmasligi kerak. Maksimal: ${pulniFormatlash(jami)}.`
      );
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
        tolovSummasiRaqam > 0 ? [{ paymentType: tolovTuri, amount: tolovSummasiRaqam }] : [],
    });

    if (muvaffaqiyatli) onYopish();
  }

  return (
    <AppModal className="items-start justify-center bg-black/45 px-5 py-5 backdrop-blur-[2px]">
      <form
        onSubmit={submit}
        className="scrollbar-hidden max-h-[calc(100vh-40px)] min-h-[calc(100vh-76px)] w-full max-w-[min(1560px,calc(100vw-120px))] overflow-y-auto rounded-[38px] bg-white shadow-[0_34px_110px_rgba(15,23,42,.34)] ring-1 ring-white/70"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-orange-100 bg-white/95 px-8 py-7 backdrop-blur-xl">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-500">
              Yangi sotuv
            </p>
            <h2 className="mt-1 text-3xl font-black text-gray-950">Yangi sotuv yaratish</h2>
          </div>
          <button
            type="button"
            onClick={onYopish}
            className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-gray-100 text-gray-600 transition hover:bg-orange-500 hover:text-white"
            aria-label="Oynani yopish"
          >
            <X size={23} />
          </button>
        </header>

        <div className="space-y-8 px-8 py-8">
          <div className="grid gap-6 xl:grid-cols-2">
            <label className="space-y-2 text-sm font-bold text-gray-700">
              <span>Ombor *</span>
              <SavdoSelect
                value={warehouseId}
                onChange={(value) => {
                  setWarehouseId(value);
                  onOmborTanlash(value);
                }}
                placeholder="Omborni tanlang"
                options={omborlar.map((ombor) => ({
                  value: ombor.id,
                  label: ombor.name ?? ombor.id,
                }))}
              />
            </label>

            <label className="space-y-2 text-sm font-bold text-gray-700">
              <span>Mas'ul xodim</span>
              <SavdoSelect
                value={responsibleId}
                onChange={setResponsibleId}
                placeholder="Mas'ul xodimni tanlang"
                options={xodimlar.map((xodim) => ({
                  value: xodim.id,
                  label: xodim.fullName ?? xodim.username ?? xodim.id,
                }))}
              />
            </label>

            <label className="space-y-2 text-sm font-bold text-gray-700">
              <span>Jismoniy mijoz</span>
              <SavdoSelect
                value={customerId}
                onChange={mijozniTanlash}
                placeholder="Donalik mijoz"
                options={mijozlar.map((mijoz) => ({
                  value: mijoz.id,
                  label: `${mijozKorinishi(mijoz)}${mijoz.phone ? ` — ${mijoz.phone}` : ""}`,
                }))}
              />
              {customerId && clientCompanyId && (
                <p className="text-xs font-semibold text-emerald-600">
                  Mijoz kompaniyaga avtomatik biriktirildi:{" "}
                  {kompaniyaNomi(mijozKompaniyalari.find((item) => item.id === clientCompanyId))}
                </p>
              )}
            </label>

            <label className="space-y-2 text-sm font-bold text-gray-700">
              <span>Mijoz kompaniyasi</span>
              <SavdoSelect
                value={clientCompanyId}
                onChange={kompaniyaniTanlash}
                placeholder="Kompaniya tanlanmagan"
                options={mijozKompaniyalari.map((kompaniya) => ({
                  value: kompaniya.id,
                  label: `${kompaniyaNomi(kompaniya)}${kompaniya.phone ? ` — ${kompaniya.phone}` : ""}`,
                }))}
              />
              {clientCompanyId && customerId && (
                <p className="text-xs font-semibold text-emerald-600">
                  Kompaniya vakili avtomatik tanlandi:{" "}
                  {mijozKorinishi(mijozlar.find((item) => item.id === customerId))}
                </p>
              )}
            </label>
          </div>

          {omborlar.length === 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
              Serverda ombor mavjud emas. Sotuv yaratishdan oldin “Sozlamalar → Ombor”
              bo‘limida ombor yaratilishi kerak.
            </div>
          )}

          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-2xl font-black text-gray-900">Mahsulotlar</h3>
              <button
                type="button"
                onClick={() =>
                  setMahsulotlar((joriy) => [
                    ...joriy,
                    { modificationId: "", quantity: "1", price: "", discount: "" },
                  ])
                }
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-50 px-5 text-sm font-black text-orange-600 transition hover:bg-orange-100"
              >
                <Plus size={15} />
                Qator qo'shish
              </button>
            </div>

            <div className="space-y-4">
              {mahsulotlar.map((mahsulot, index) => (
                <div
                  key={index}
                  className="grid gap-4 rounded-[26px] border border-gray-100 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,.04)] md:grid-cols-[minmax(320px,1fr)_140px_190px_170px_52px]"
                >
                  <SavdoSelect
                    value={mahsulot.modificationId}
                    onChange={(value) => modifikatsiyaniTanlash(index, value)}
                    placeholder="Mahsulotni tanlang"
                    options={qoldiqlar.map((qoldiq) => ({
                      value: qoldiq.modificationId,
                      label: `${qoldiqNomi(qoldiq)} — qoldiq: ${qoldiq.quantity ?? qoldiq.balance ?? 0} — narx: ${pulniFormatlash(qoldiqNarxi(qoldiq))}`,
                    }))}
                    dropdownClassName="min-w-[520px]"
                  />
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={mahsulot.quantity}
                    onChange={(event) =>
                      mahsulotniYangilash(index, { quantity: event.target.value })
                    }
                    className="h-14 rounded-2xl border border-gray-200 px-5 text-base outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    placeholder="Miqdor"
                  />
                  <input
                    type="number"
                    min="0"
                    value={mahsulot.price}
                    onChange={(event) =>
                      mahsulotniYangilash(index, { price: event.target.value })
                    }
                    className="h-14 rounded-2xl border border-gray-200 px-5 text-base outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    placeholder="Narx"
                  />
                  <input
                    type="number"
                    min="0"
                    value={mahsulot.discount}
                    onChange={(event) =>
                      mahsulotniYangilash(index, { discount: event.target.value })
                    }
                    className="h-14 rounded-2xl border border-gray-200 px-5 text-base outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
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
                    className="flex h-14 items-center justify-center rounded-2xl bg-red-50 text-red-500 transition hover:bg-red-100 disabled:opacity-30"
                    aria-label="Mahsulot qatorini o'chirish"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 rounded-[28px] bg-gray-50 p-6 md:grid-cols-3">
            <label className="space-y-2 text-sm font-bold text-gray-700">
              <span>To'lov turi</span>
              <SavdoSelect
                value={tolovTuri}
                onChange={(value) => setTolovTuri(value as TolovTuri)}
                options={[
                  { value: "CASH", label: "Naqd" },
                  { value: "CARD", label: "Karta" },
                  { value: "BANK", label: "Bank o'tkazmasi" },
                  { value: "DEBT", label: "Qarz" },
                ]}
              />
            </label>
            <label className="space-y-2 text-sm font-bold text-gray-700">
              <span>To'lov summasi</span>
              <input
                type="number"
                min="0"
                max={jami || undefined}
                value={tolovSummasi}
                onChange={(event) => setTolovSummasi(event.target.value)}
                className={`h-14 w-full rounded-2xl border bg-white px-5 text-base outline-none transition ${
                  ortiqchaTolov > 0
                    ? "border-red-400 ring-4 ring-red-100"
                    : "border-gray-200 focus:border-orange-400"
                }`}
                placeholder="Masalan: 10000"
              />
              {ortiqchaTolov > 0 && (
                <p className="text-xs font-semibold text-red-500">
                  To'lov sotuv jamidan oshib ketdi.
                </p>
              )}
            </label>
            <div className="flex flex-col justify-end">
              <p className="text-xs font-bold uppercase text-gray-400">Sotuv jami</p>
              <p className="mt-1 text-2xl font-black text-gray-950">{pulniFormatlash(jami)}</p>
            </div>
          </div>

          <div className="grid gap-4 rounded-[28px] border border-gray-100 bg-white p-5 text-sm shadow-[0_10px_28px_rgba(15,23,42,.04)] md:grid-cols-3">
            <div>
              <p className="text-xs font-bold uppercase text-gray-400">Qabul qilinadigan to'lov</p>
              <p className="mt-1 font-black text-blue-600">{pulniFormatlash(tolovSummasiRaqam)}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-gray-400">Qarzdorlik qoldig'i</p>
              <p className={`mt-1 font-black ${qarzdorlik > 0 ? "text-red-500" : "text-emerald-600"}`}>
                {pulniFormatlash(qarzdorlik)}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-gray-400">To'lov holati</p>
              <p className="mt-1 font-black text-gray-800">
                {tolovSummasiRaqam === 0
                  ? "To'lanmagan"
                  : qarzdorlik > 0
                    ? "Qisman to'langan"
                    : "To'liq to'langan"}
              </p>
            </div>
          </div>

          <label className="block space-y-2 text-sm font-bold text-gray-700">
            <span>Izoh</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              className="w-full resize-none rounded-[24px] border border-gray-200 p-5 text-base font-medium outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              placeholder="Sotuv bo'yicha qo'shimcha izoh"
            />
          </label>

          {xatolik && (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
              {xatolik}
            </div>
          )}
        </div>

        <footer className="sticky bottom-0 flex justify-end gap-4 border-t border-orange-100 bg-white/95 px-8 py-7 backdrop-blur-xl">
          <button
            type="button"
            onClick={onYopish}
            className="h-14 rounded-2xl bg-gray-100 px-7 text-base font-bold text-gray-600 transition hover:bg-gray-200"
          >
            Yopish
          </button>
          <button
            type="submit"
            disabled={amalBajarilmoqda || omborlar.length === 0}
            className="inline-flex h-14 items-center gap-2 rounded-2xl bg-orange-500 px-8 text-base font-black text-white shadow-[0_14px_32px_rgba(249,115,22,.24)] transition hover:bg-orange-600 hover:shadow-[0_18px_40px_rgba(249,115,22,.32)] disabled:opacity-50"
          >
            {amalBajarilmoqda && <LoaderCircle size={17} className="animate-spin" />}
            Qoralama saqlash
          </button>
        </footer>
      </form>
    </AppModal>
  );
}
