import AppSelect from "@/Components/ui/AppSelect";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Barcode,
  CalendarDays,
  Check,
  CheckSquare,
  ChevronDown,
  Clock3,
  FileText,
  LoaderCircle,
  MessageSquare,
  Paperclip,
  PackagePlus,
  Plus,
  Square,
  Trash2,
  UserPlus,
  Warehouse,
  X,
} from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { useOmborStore } from "@/store/omborStore";
import {
  birliklarApi,
  kategoriyalarApi,
  mahsulotlarApi,
  mediaApi,
  modifikatsiyalarApi,
} from "@/api/catalogApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { Kategoriya, OlchovBirligi } from "@/types/catalog";
import { modificationNomi, pul, qoldiqMiqdori } from "./omborYordamchilari";

type Fayl = { id: string; nomi: string; url: string };

type Qator = {
  id: string;
  modificationId: string;
  warehouseId: string;
  quantity: number;
  price: string;
  retailPrice: string;
  wholesalePrice: string;
  boshlangichRetail: number;
  boshlangichWholesale: number;
};

type Props = { onClose: () => void };

function yangiQator(warehouseId = ""): Qator {
  return {
    id: crypto.randomUUID(),
    modificationId: "",
    warehouseId,
    quantity: 1,
    price: "",
    retailPrice: "",
    wholesalePrice: "",
    boshlangichRetail: 0,
    boshlangichWholesale: 0,
  };
}

const input =
  "h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100";
const inputSm =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100";

export default function YangiKirimModal({ onClose }: Props) {
  const store = useOmborStore();
  const birinchiOmbor =
    store.omborlar.find((item) => item.isActive !== false)?.id ?? store.omborlar[0]?.id ?? "";

  const [kirimNomi, setKirimNomi] = useState(`Kirim hujjati #${store.kirimlar.length + 1}`);
  const [supplierQuery, setSupplierQuery] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [supplierOchiq, setSupplierOchiq] = useState(false);
  const supplierRef = useRef<HTMLDivElement | null>(null);
  const [responsibleId, setResponsibleId] = useState("");
  const [note, setNote] = useState("");
  const [qatorlar, setQatorlar] = useState<Qator[]>([yangiQator(birinchiOmbor)]);
  const [tanlangan, setTanlangan] = useState<Set<string>>(new Set());
  const [xato, setXato] = useState("");
  const [yaratishOchiqUchun, setYaratishOchiqUchun] = useState<string | null>(null);
  const [fayllar, setFayllar] = useState<Fayl[]>([]);
  const [faylYuklanmoqda, setFaylYuklanmoqda] = useState(false);
  const faylInputRef = useRef<HTMLInputElement | null>(null);

  async function faylTanlandi(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setFaylYuklanmoqda(true);
    setXato("");
    try {
      const natija = await mediaApi.yuklash(file);
      setFayllar((joriy) => [...joriy, { id: natija.id, nomi: file.name, url: natija.imageUrl }]);
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setFaylYuklanmoqda(false);
    }
  }

  function faylniOchirish(id: string) {
    setFayllar((joriy) => joriy.filter((item) => item.id !== id));
  }

  const jami = useMemo(
    () => qatorlar.reduce((sum, row) => sum + row.quantity * Number(row.price || 0), 0),
    [qatorlar]
  );
  const bugun = new Intl.DateTimeFormat("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

  useEffect(() => {
    function tashqariBosildi(event: MouseEvent) {
      if (supplierRef.current && !supplierRef.current.contains(event.target as Node)) {
        setSupplierOchiq(false);
      }
    }
    document.addEventListener("mousedown", tashqariBosildi);
    return () => document.removeEventListener("mousedown", tashqariBosildi);
  }, []);

  const supplierMoslari = useMemo(() => {
    const q = supplierQuery.trim().toLowerCase();
    if (!q) return store.yetkazibBeruvchilar;
    return store.yetkazibBeruvchilar.filter((item) =>
      (item.name ?? item.fullName ?? "").toLowerCase().includes(q)
    );
  }, [store.yetkazibBeruvchilar, supplierQuery]);

  const aynanMosSupplier = store.yetkazibBeruvchilar.some(
    (item) => (item.name ?? item.fullName ?? "").trim().toLowerCase() === supplierQuery.trim().toLowerCase()
  );

  function supplierTanlash(id: string, name: string) {
    setSupplierId(id);
    setSupplierQuery(name);
    setSupplierOchiq(false);
  }

  async function yangiSupplierQoshish() {
    const nomi = supplierQuery.trim();
    if (!nomi) return;
    const ok = await store.yetkazibBeruvchiYaratish({ name: nomi });
    if (!ok) return;
    const yaratilgan = useOmborStore.getState().yetkazibBeruvchilar[0];
    if (yaratilgan) supplierTanlash(yaratilgan.id, yaratilgan.name ?? nomi);
  }

  function yangilash(id: string, value: Partial<Qator>) {
    setQatorlar((rows) => rows.map((row) => (row.id === id ? { ...row, ...value } : row)));
  }

  function mahsulotTanlash(id: string, modificationId: string) {
    const mod = store.modifikatsiyalar.find((item) => item.id === modificationId);
    const cost = Number(mod?.price?.costPrice ?? 0);
    const retail = Number(mod?.price?.retailPrice ?? 0);
    const wholesale = Number(mod?.price?.wholesalePrice ?? 0);
    yangilash(id, {
      modificationId,
      price: cost ? String(cost) : "",
      retailPrice: retail ? String(retail) : "",
      wholesalePrice: wholesale ? String(wholesale) : "",
      boshlangichRetail: retail,
      boshlangichWholesale: wholesale,
    });
  }

  function barchasiniBelgilash() {
    setTanlangan((joriy) =>
      joriy.size === qatorlar.length ? new Set() : new Set(qatorlar.map((row) => row.id))
    );
  }

  function belgilashniAlmashtirish(id: string) {
    setTanlangan((joriy) => {
      const nusxa = new Set(joriy);
      if (nusxa.has(id)) nusxa.delete(id);
      else nusxa.add(id);
      return nusxa;
    });
  }

  function tanlanganlarniOchirish() {
    setQatorlar((rows) => (rows.length > tanlangan.size ? rows.filter((row) => !tanlangan.has(row.id)) : rows));
    setTanlangan(new Set());
  }

  async function saqlash(tasdiqlash: boolean) {
    setXato("");
    const valid = qatorlar.filter(
      (row) => row.modificationId && row.warehouseId && row.quantity > 0 && Number(row.price) >= 0
    );
    if (!supplierId) return setXato("Yetkazib beruvchini ro'yxatdan tanlang yoki yangi qo'shing.");
    if (!valid.length || valid.length !== qatorlar.length)
      return setXato("Har bir qatorda mahsulot, ombor, miqdor va tan narxni to'liq kiriting.");
    if (new Set(valid.map((row) => row.warehouseId)).size !== 1)
      return setXato("Barcha qatorlarda bir xil omborni tanlang.");

    const izohQismlari = [`Nomi: ${kirimNomi.trim() || "Kirim hujjati"}`];
    if (note.trim()) izohQismlari.push(note.trim());
    fayllar.forEach((fayl) => izohQismlari.push(`Fayl: ${fayl.nomi} (${fayl.url})`));

    const hujjat = await store.kirimYaratish({
      supplierId,
      warehouseId: valid[0].warehouseId,
      responsibleId: responsibleId || undefined,
      note: izohQismlari.join(" | "),
      items: valid.map((row) => ({
        modificationId: row.modificationId,
        quantity: row.quantity,
        price: Number(row.price || 0),
      })),
    });
    if (!hujjat) return;

    const narxOzgarganlar = valid.filter((row) => {
      const retail = Number(row.retailPrice || 0);
      const wholesale = Number(row.wholesalePrice || 0);
      return retail !== row.boshlangichRetail || wholesale !== row.boshlangichWholesale;
    });
    if (narxOzgarganlar.length > 0) {
      await Promise.all(
        narxOzgarganlar.map((row) =>
          modifikatsiyalarApi
            .narxYangilash(row.modificationId, {
              retailPrice: Number(row.retailPrice || 0) || undefined,
              wholesalePrice: Number(row.wholesalePrice || 0) || undefined,
            })
            .catch(() => null)
        )
      );
      await store.malumotlarniYuklash();
    }

    if (tasdiqlash && !(await store.kirimTasdiqlash(hujjat.id))) return;
    onClose();
  }

  return (
    <AppModal onClose={onClose} className="sidebar-aligned-document-modal items-stretch p-3 sm:p-5">
      <div className="flex min-h-0 w-full flex-col overflow-hidden rounded-[32px] border border-orange-100 bg-[#fffaf4] shadow-[0_28px_90px_rgba(69,35,13,.32)]">
        <header className="flex shrink-0 items-center border-b border-orange-100 bg-white/75 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Yangi kirim</h2>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-500">YANGI</span>
          </div>
        </header>

        <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8">
          {(xato || store.xatolik) && (
            <div className="mb-4 flex justify-between gap-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
              <span>{xato || store.xatolik}</span>
              <button
                type="button"
                onClick={() => {
                  setXato("");
                  store.xatolikniTozalash();
                }}
              >
                Yopish
              </button>
            </div>
          )}

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm">
              <SectionTitle icon={<PackagePlus size={18} />} text="Kirim haqida" />
              <div className="grid gap-4">
                <label className="space-y-2 text-sm font-bold text-slate-500">
                  <span>Kirimni nomi</span>
                  <input
                    value={kirimNomi}
                    onChange={(event) => setKirimNomi(event.target.value)}
                    className={input}
                    placeholder="Masalan: Yangi partiya"
                  />
                </label>

                <div ref={supplierRef} className="relative space-y-2 text-sm font-bold text-slate-500">
                  <span>Yetkazib beruvchi *</span>
                  <input
                    value={supplierQuery}
                    onChange={(event) => {
                      setSupplierQuery(event.target.value);
                      setSupplierId("");
                      setSupplierOchiq(true);
                    }}
                    onFocus={() => setSupplierOchiq(true)}
                    className={input}
                    placeholder="Yetkazib beruvchi nomini yozing"
                  />
                  {supplierOchiq && (
                    <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-56 overflow-y-auto rounded-2xl border border-orange-100 bg-white p-1.5 shadow-[0_18px_44px_rgba(15,23,42,.16)]">
                      {supplierMoslari.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => supplierTanlash(item.id, item.name ?? item.fullName ?? item.id)}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-orange-50"
                        >
                          {item.name ?? item.fullName}
                          {item.id === supplierId && <Check size={15} className="text-orange-500" />}
                        </button>
                      ))}
                      {supplierQuery.trim() && !aynanMosSupplier && (
                        <button
                          type="button"
                          onClick={() => void yangiSupplierQoshish()}
                          disabled={store.amalBajarilmoqda}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-black text-orange-600 hover:bg-orange-50 disabled:opacity-50"
                        >
                          <UserPlus size={15} />
                          "{supplierQuery.trim()}" вЂ” yangi yetkazib beruvchi qo'shish
                        </button>
                      )}
                      {supplierMoslari.length === 0 && !supplierQuery.trim() && (
                        <p className="px-3 py-2.5 text-xs font-semibold text-slate-400">
                          Yetkazib beruvchilar ro'yxati bo'sh.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <SelectField
                  label="Mas'ul shaxs"
                  value={responsibleId}
                  onChange={setResponsibleId}
                  placeholder="Mas'ul shaxsni tanlang"
                  options={store.xodimlar.map((item) => ({
                    id: item.id,
                    name: item.fullName ?? item.name ?? item.username ?? item.id,
                  }))}
                />

                <label className="space-y-2 text-sm font-bold text-slate-500">
                  <span>Qachon kirim qilingan</span>
                  <div className="relative">
                    <input value={bugun} readOnly className={`${input} pr-11 text-slate-400`} />
                    <CalendarDays size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                  <span className="block text-xs font-semibold text-slate-400">
                    Backend hujjat sanasini avtomatik belgilaydi.
                  </span>
                </label>
              </div>
            </section>

            <div className="space-y-5">
              <section className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm">
                <SectionTitle icon={<MessageSquare size={18} />} text="Kommentariya" />
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  placeholder="Izoh yozing..."
                  className="w-full resize-none rounded-2xl border border-slate-200 p-4 text-sm font-medium outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </section>
              <section className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm">
                <SectionTitle icon={<Clock3 size={18} />} text="Tarix" />
                <div className="flex items-start gap-3 text-sm">
                  <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-orange-500" />
                  <div>
                    <p className="font-bold text-slate-700">Yangi hujjat qoralamasi ochildi</p>
                    <p className="text-xs font-semibold text-slate-400">{bugun}</p>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <section className="mt-5 rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <SectionTitle icon={<Paperclip size={18} />} text="Fayllar" />
              <input ref={faylInputRef} type="file" onChange={(event) => void faylTanlandi(event)} className="hidden" />
              <button
                type="button"
                onClick={() => faylInputRef.current?.click()}
                disabled={faylYuklanmoqda}
                className="mb-4 inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white shadow-lg shadow-orange-100 hover:bg-orange-600 disabled:opacity-50"
              >
                {faylYuklanmoqda ? <LoaderCircle size={17} className="animate-spin" /> : <Paperclip size={17} />}
                Fayl yuklash
              </button>
            </div>
            {fayllar.length === 0 ? (
              <p className="py-4 text-center text-sm font-semibold text-slate-400">Fayl yuklanmagan</p>
            ) : (
              <div className="space-y-2">
                {fayllar.map((fayl) => (
                  <div
                    key={fayl.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-[#fffdfa] px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText size={16} className="shrink-0 text-orange-500" />
                      <span className="truncate text-sm font-bold text-slate-700">{fayl.nomi}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => faylniOchirish(fayl.id)}
                      aria-label="Faylni o'chirish"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-5 rounded-[26px] border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">Tovarlar</h3>
                <p className="mt-1 text-xs font-medium text-slate-400">
                  Mahsulotlar, miqdor va real omborni kiriting.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setYaratishOchiqUchun(qatorlar[qatorlar.length - 1]?.id ?? null)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-orange-300 bg-white px-5 text-sm font-black text-orange-600 hover:bg-orange-50"
                >
                  <Plus size={18} /> Mahsulot yaratish
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setQatorlar((rows) => [...rows, yangiQator(rows[0]?.warehouseId || birinchiOmbor)])
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white shadow-lg shadow-orange-100 hover:bg-orange-600"
                >
                  <Plus size={18} /> Qator qo'shish
                </button>
              </div>
            </div>

            <div className="scrollbar-orange overflow-x-auto pb-2">
              <div className="min-w-[1280px] space-y-3">
                <div className="grid grid-cols-[28px_38px_2fr_1fr_1fr_1fr_1fr_1fr_1.2fr_1fr_48px] gap-3 px-3 text-[11px] font-black uppercase tracking-wide text-slate-400">
                  <button type="button" onClick={barchasiniBelgilash} aria-label="Hammasini belgilash">
                    {tanlangan.size === qatorlar.length && qatorlar.length > 0 ? (
                      <CheckSquare size={16} className="text-orange-500" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                  <span>в„–</span>
                  <span>Mahsulot</span>
                  <span>Shtrix kod</span>
                  <span>Tan narxi</span>
                  <span>Sotuv narxi</span>
                  <span>Ulgurji narxi</span>
                  <span>Soni</span>
                  <span>Ombor</span>
                  <span>Qoldiq</span>
                  <span />
                </div>
                {qatorlar.map((row, index) => {
                  const mod = store.modifikatsiyalar.find((item) => item.id === row.modificationId);
                  const stock = store.qoldiqlar.find(
                    (item) => item.modificationId === row.modificationId && item.warehouseId === row.warehouseId
                  );
                  return (
                    <div
                      key={row.id}
                      className="grid grid-cols-[28px_38px_2fr_1fr_1fr_1fr_1fr_1fr_1.2fr_1fr_48px] items-center gap-3 rounded-2xl border border-orange-100 bg-[#fffdfa] p-3"
                    >
                      <button
                        type="button"
                        onClick={() => belgilashniAlmashtirish(row.id)}
                        aria-label="Qatorni belgilash"
                      >
                        {tanlangan.has(row.id) ? (
                          <CheckSquare size={16} className="text-orange-500" />
                        ) : (
                          <Square size={16} className="text-slate-300" />
                        )}
                      </button>
                      <span className="text-center text-sm font-black text-slate-400">{index + 1}</span>
                      <AppSelect
                        value={row.modificationId}
                        onChange={(event) => mahsulotTanlash(row.id, event.target.value)}
                        className={`${inputSm} min-w-0`}
                      >
                        <option value="">Mahsulotni tanlang</option>
                        {store.modifikatsiyalar.map((item) => (
                          <option key={item.id} value={item.id}>
                            {modificationNomi(item)}
                          </option>
                        ))}
                      </AppSelect>
                      <div className="relative">
                        <Barcode size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={mod?.barcode ?? ""} readOnly placeholder="Shtrix kod" className={`${inputSm} pl-8`} />
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={row.price}
                        onChange={(event) => yangilash(row.id, { price: event.target.value })}
                        placeholder="0"
                        className={inputSm}
                      />
                      <input
                        type="number"
                        min="0"
                        value={row.retailPrice}
                        onChange={(event) => yangilash(row.id, { retailPrice: event.target.value })}
                        placeholder="0"
                        className={inputSm}
                      />
                      <input
                        type="number"
                        min="0"
                        value={row.wholesalePrice}
                        onChange={(event) => yangilash(row.id, { wholesalePrice: event.target.value })}
                        placeholder="0"
                        className={inputSm}
                      />
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={row.quantity}
                        onChange={(event) => yangilash(row.id, { quantity: Number(event.target.value) })}
                        className={inputSm}
                      />
                      <div className="relative">
                        <Warehouse size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <AppSelect
                          value={row.warehouseId}
                          onChange={(event) => yangilash(row.id, { warehouseId: event.target.value })}
                          className={`${inputSm} appearance-none pl-8 pr-7`}
                        >
                          <option value="">Omborni tanlang</option>
                          {store.omborlar
                            .filter((item) => item.isActive !== false)
                            .map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                        </AppSelect>
                        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                      <p className="truncate text-center text-xs font-bold text-slate-500">
                        {stock ? qoldiqMiqdori(stock) : 0}
                      </p>
                      <button
                        type="button"
                        disabled={qatorlar.length === 1}
                        onClick={() => setQatorlar((rows) => rows.filter((item) => item.id !== row.id))}
                        aria-label="Qatorni o'chirish"
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-30"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 border-t border-orange-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={tanlanganlarniOchirish}
                disabled={tanlangan.size === 0}
                className="inline-flex items-center gap-2 self-start rounded-xl bg-red-50 px-4 py-2.5 text-xs font-black text-red-500 hover:bg-red-100 disabled:opacity-30"
              >
                <Trash2 size={14} /> Belgilanganlarni o'chirish ({tanlangan.size})
              </button>
              <div className="text-right">
                <p className="text-xs font-black uppercase text-slate-400">Umumiy summa</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{pul(jami)}</p>
              </div>
            </div>
          </section>
        </div>

        <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-orange-100 bg-white/75 px-5 py-4 sm:flex-row sm:justify-end sm:px-8">
          <button type="button" onClick={onClose} className="h-12 rounded-2xl bg-slate-100 px-7 text-sm font-black text-slate-600 hover:bg-slate-200">
            Bekor qilish
          </button>
          <ActionButton busy={store.amalBajarilmoqda} outline onClick={() => void saqlash(false)}>
            Saqlash
          </ActionButton>
          <ActionButton busy={store.amalBajarilmoqda} onClick={() => void saqlash(true)}>
            Saqlash va tasdiqlash
          </ActionButton>
        </footer>
      </div>

      {yaratishOchiqUchun && (
        <MahsulotYaratishPanel
          onClose={() => setYaratishOchiqUchun(null)}
          onYaratildi={(modification) => {
            mahsulotTanlash(yaratishOchiqUchun, modification.id);
            setYaratishOchiqUchun(null);
          }}
        />
      )}
    </AppModal>
  );
}

function MahsulotYaratishPanel({
  onClose,
  onYaratildi,
}: {
  onClose: () => void;
  onYaratildi: (modification: { id: string }) => void;
}) {
  const store = useOmborStore();
  const [kategoriyalar, setKategoriyalar] = useState<Kategoriya[]>([]);
  const [birliklar, setBirliklar] = useState<OlchovBirligi[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [xato, setXato] = useState("");
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [nomi, setNomi] = useState("");
  const [barcode, setBarcode] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [retailPrice, setRetailPrice] = useState("");
  const [wholesalePrice, setWholesalePrice] = useState("");

  useEffect(() => {
    let faol = true;
    async function yuklash() {
      try {
        const [k, b] = await Promise.all([kategoriyalarApi.royxat(), birliklarApi.royxat()]);
        if (!faol) return;
        setKategoriyalar(k);
        setBirliklar(b);
      } catch (error) {
        if (faol) setXato(getApiErrorMessage(error));
      } finally {
        if (faol) setYuklanmoqda(false);
      }
    }
    void yuklash();
    return () => {
      faol = false;
    };
  }, []);

  async function saqlash() {
    setXato("");
    if (!nomi.trim() || !barcode.trim() || !categoryId || !unitId) {
      setXato("Nomi, shtrix kod, kategoriya va o'lchov birligini to'ldiring.");
      return;
    }
    setSaqlanmoqda(true);
    try {
      const mahsulot = await mahsulotlarApi.yaratish({
        name: nomi.trim(),
        categoryId,
        unitId,
        barcode: barcode.trim(),
      });
      const modification = await modifikatsiyalarApi.yaratish(mahsulot.id, {
        barcode: barcode.trim(),
        price: {
          costPrice: Number(costPrice || 0),
          retailPrice: Number(retailPrice || 0),
          wholesalePrice: Number(wholesalePrice || 0),
        },
      });
      await store.malumotlarniYuklash();
      onYaratildi({ id: modification.id });
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setSaqlanmoqda(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-950">Yangi mahsulot yaratish</h3>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <X size={18} />
          </button>
        </div>

        {yuklanmoqda ? (
          <div className="flex h-40 items-center justify-center">
            <LoaderCircle className="animate-spin text-orange-500" size={28} />
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {xato && <div className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-600">{xato}</div>}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-bold text-slate-500 sm:col-span-2">
                <span>Mahsulot nomi *</span>
                <input value={nomi} onChange={(event) => setNomi(event.target.value)} className={inputSm} placeholder="Masalan: Coca-Cola 1.5L" />
              </label>
              <label className="space-y-2 text-sm font-bold text-slate-500">
                <span>Shtrix kod *</span>
                <input value={barcode} onChange={(event) => setBarcode(event.target.value)} className={inputSm} placeholder="4870..." />
              </label>
              <SelectField label="Kategoriya *" value={categoryId} onChange={setCategoryId} placeholder="Tanlang" options={kategoriyalar.map((item) => ({ id: item.id, name: item.name }))} />
              <SelectField label="O'lchov birligi *" value={unitId} onChange={setUnitId} placeholder="Tanlang" options={birliklar.map((item) => ({ id: item.id, name: item.shortName ? `${item.name} (${item.shortName})` : item.name }))} />
              <label className="space-y-2 text-sm font-bold text-slate-500">
                <span>Tan narx</span>
                <input type="number" min="0" value={costPrice} onChange={(event) => setCostPrice(event.target.value)} className={inputSm} placeholder="0" />
              </label>
              <label className="space-y-2 text-sm font-bold text-slate-500">
                <span>Sotuv narxi</span>
                <input type="number" min="0" value={retailPrice} onChange={(event) => setRetailPrice(event.target.value)} className={inputSm} placeholder="0" />
              </label>
              <label className="space-y-2 text-sm font-bold text-slate-500">
                <span>Ulgurji narxi</span>
                <input type="number" min="0" value={wholesalePrice} onChange={(event) => setWholesalePrice(event.target.value)} className={inputSm} placeholder="0" />
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="h-11 rounded-2xl bg-slate-100 px-5 text-sm font-bold text-slate-600">
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={() => void saqlash()}
                disabled={saqlanmoqda}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-6 text-sm font-black text-white disabled:opacity-50"
              >
                {saqlanmoqda && <LoaderCircle size={16} className="animate-spin" />}
                Yaratish
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="mb-4 flex items-center gap-2 border-b border-orange-100 pb-4 text-sm font-black uppercase tracking-wide text-slate-600">
      <span className="text-orange-500">{icon}</span>
      {text}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  placeholder,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: Array<{ id: string; name: string }>;
}) {
  return (
    <label className="space-y-2 text-sm font-bold text-slate-500">
      <span>{label}</span>
      <div className="relative">
        <AppSelect value={value} onChange={(event) => onChange(event.target.value)} className={`${input} appearance-none pr-10`}>
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </AppSelect>
        <ChevronDown size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
      </div>
    </label>
  );
}

function ActionButton({
  children,
  busy,
  outline,
  onClick,
}: {
  children: React.ReactNode;
  busy: boolean;
  outline?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-7 text-sm font-black disabled:opacity-50 ${
        outline ? "border border-orange-300 bg-white text-orange-600" : "bg-orange-500 text-white shadow-lg shadow-orange-100 hover:bg-orange-600"
      }`}
    >
      {busy && <LoaderCircle size={17} className="animate-spin" />}
      {children}
    </button>
  );
}
