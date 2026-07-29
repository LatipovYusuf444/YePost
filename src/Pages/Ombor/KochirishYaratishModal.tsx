import AppSelect from "@/Components/ui/AppSelect";
import { useEffect, useMemo, useState } from "react";
import {
  Barcode,
  CalendarDays,
  Clock3,
  Copy,
  GripVertical,
  LoaderCircle,
  MessageSquare,
  Package,
  Plus,
  Printer,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { useOmborStore } from "@/store/omborStore";
import type { MahsulotModifikatsiyasi, OmborQoldigi } from "@/types/ombor";
import { modificationNomi, pul, qoldiqMiqdori } from "./omborYordamchilari";

type Props = { onClose: () => void };
type Qator = { id: string; modificationId: string; quantity: number };

function yangiQator(): Qator {
  return { id: crypto.randomUUID(), modificationId: "", quantity: 1 };
}

function shaxsNomi(shaxs?: { fullName?: string; username?: string; name?: string }) {
  return shaxs?.fullName || shaxs?.name || shaxs?.username || "вЂ”";
}

function modifikatsiyaNarxi(mod?: MahsulotModifikatsiyasi) {
  const qiymat = mod?.price?.retailPrice ?? mod?.price?.costPrice ?? mod?.price?.wholesalePrice ?? 0;
  const narx = Number(qiymat);
  return Number.isFinite(narx) ? narx : 0;
}

function bugungiSana() {
  return new Intl.DateTimeFormat("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function hozirgiVaqt() {
  return new Intl.DateTimeFormat("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

export default function KochirishYaratishModal({ onClose }: Props) {
  const store = useOmborStore();
  const [sourceWarehouseId, setSource] = useState("");
  const [destWarehouseId, setDest] = useState("");
  const [responsibleId, setResponsible] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<Qator[]>([yangiQator()]);
  const [xato, setXato] = useState("");
  const [jonatilmoqda, setJonatilmoqda] = useState(false);

  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape" && !store.amalBajarilmoqda) onClose();
    }
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [onClose, store.amalBajarilmoqda]);

  const qoldiqlar = useMemo(() => {
    const map = new Map<string, OmborQoldigi>();
    store.qoldiqlar.forEach((qoldiq) => {
      const warehouseId = qoldiq.warehouseId ?? qoldiq.warehouse?.id;
      if (sourceWarehouseId && warehouseId && warehouseId !== sourceWarehouseId) return;
      const oldingi = map.get(qoldiq.modificationId);
      if (!oldingi || qoldiqMiqdori(qoldiq) > qoldiqMiqdori(oldingi)) {
        map.set(qoldiq.modificationId, qoldiq);
      }
    });
    return Array.from(map.values());
  }, [sourceWarehouseId, store.qoldiqlar]);

  const qatorMalumotlari = useMemo(
    () =>
      items.map((item) => {
        const qoldiq = qoldiqlar.find((qator) => qator.modificationId === item.modificationId);
        const mod =
          qoldiq?.modification ??
          store.modifikatsiyalar.find((modification) => modification.id === item.modificationId);
        const narx = modifikatsiyaNarxi(mod);
        return { item, qoldiq, mod, narx, summa: narx * Number(item.quantity || 0) };
      }),
    [items, qoldiqlar, store.modifikatsiyalar]
  );
  const jami = qatorMalumotlari.reduce((summa, qator) => summa + qator.summa, 0);

  async function manbaTanlash(id: string) {
    setSource(id);
    setDest((oldingi) => (oldingi === id ? "" : oldingi));
    setItems([yangiQator()]);
    setXato("");
    if (id) await store.qoldiqlarniYuklash(id);
  }

  function qatorniYangilash(id: string, data: Partial<Qator>) {
    setItems((oldingi) => oldingi.map((item) => (item.id === id ? { ...item, ...data } : item)));
  }

  function tekshirish() {
    if (!sourceWarehouseId || !destWarehouseId) return "Manba va qabul qiluvchi omborni tanlang.";
    if (sourceWarehouseId === destWarehouseId) return "Manba va qabul qiluvchi ombor bir xil bo'lishi mumkin emas.";
    if (!items.length || items.some((item) => !item.modificationId || !Number.isFinite(item.quantity) || item.quantity <= 0)) {
      return "Har bir qatorda mahsulot va musbat miqdor kiriting.";
    }
    if (new Set(items.map((item) => item.modificationId)).size !== items.length) {
      return "Bir mahsulotni faqat bitta qatorda kiriting.";
    }
    const ortiqcha = items.some((item) => {
      const qoldiq = qoldiqlar.find((qator) => qator.modificationId === item.modificationId);
      return !qoldiq || item.quantity > qoldiqMiqdori(qoldiq);
    });
    if (ortiqcha) return "Ko'chirish miqdori manba ombordagi qoldiqdan oshmasligi kerak.";
    return "";
  }

  async function saqlashVaYopish(send = false) {
    const validatsiya = tekshirish();
    if (validatsiya) {
      setXato(validatsiya);
      return;
    }
    setXato("");
    setJonatilmoqda(send);
    const hujjat = await store.kochirishYaratish({
      sourceWarehouseId,
      destWarehouseId,
      responsibleId: responsibleId || undefined,
      note: note.trim() || undefined,
      items: items.map(({ modificationId, quantity }) => ({ modificationId, quantity })),
    });
    if (!hujjat) {
      setJonatilmoqda(false);
      return;
    }
    if (send) {
      const jonatildi = await store.kochirishJonatish(hujjat.id);
      setJonatilmoqda(false);
      if (!jonatildi) {
        onClose();
        return;
      }
    }
    onClose();
  }

  return (
    <AppModal className="items-start justify-start overflow-hidden bg-slate-950/60 p-0 py-4 pl-[92px] pr-4 backdrop-blur-[3px]">
      <div className="relative h-[calc(100dvh-32px)] w-full">
        <aside className="absolute -left-[58px] top-6 z-30 flex flex-col items-center gap-3">
          <button type="button" onClick={onClose} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF5A00] text-white shadow-xl ring-1 ring-white/80" aria-label="Yopish">
            <X size={21} />
          </button>
          <button type="button" onClick={() => window.print()} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#FF5A00] shadow-lg ring-1 ring-orange-100" aria-label="Chop etish">
            <Printer size={18} />
          </button>
        </aside>

        <div className="flex h-full flex-col overflow-hidden rounded-l-[44px] rounded-r-[36px] border border-orange-100 bg-gradient-to-br from-[#FFF9F2] via-[#FFFDF9] to-[#FFE8D2] shadow-[0_35px_110px_rgba(43,22,12,.42)]">
          <header className="flex min-h-[92px] shrink-0 items-center justify-between gap-4 border-b border-orange-100 bg-[#FFF9F2]/95 px-8 py-4 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-[38px]">Yangi ko'chirma</h2>
              <Copy size={19} className="text-slate-300" />
              <span className="rounded-full bg-orange-50 px-4 py-1.5 text-xs font-black uppercase text-[#FF5A00]">Yangi</span>
            </div>
            <button type="button" onClick={onClose} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-200" aria-label="Oynani yopish">
              <X size={20} />
            </button>
          </header>

          <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto p-6 sm:p-8">
            <div className="grid gap-6 xl:grid-cols-2">
              <section className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
                <h3 className="border-b border-orange-100 pb-4 text-base font-black uppercase text-slate-600">Ko'chirma haqida</h3>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-bold text-slate-400">
                    Ombordan *
                    <AppSelect value={sourceWarehouseId} onChange={(event) => void manbaTanlash(event.target.value)} className="input text-slate-700">
                      <option value="">Manba omborni tanlang</option>
                      {store.omborlar.map((ombor) => <option key={ombor.id} value={ombor.id}>{ombor.name}</option>)}
                    </AppSelect>
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-slate-400">
                    Omborga *
                    <AppSelect value={destWarehouseId} onChange={(event) => setDest(event.target.value)} className="input text-slate-700">
                      <option value="">Qabul qiluvchi omborni tanlang</option>
                      {store.omborlar.filter((ombor) => ombor.id !== sourceWarehouseId).map((ombor) => <option key={ombor.id} value={ombor.id}>{ombor.name}</option>)}
                    </AppSelect>
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-slate-400 sm:col-span-2">
                    Yaratilish sanasi
                    <span className="flex h-12 items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 font-black text-slate-700">
                      {bugungiSana()} <CalendarDays size={18} className="text-slate-400" />
                    </span>
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-slate-400 sm:col-span-2">
                    Mas'ul shaxs
                    <AppSelect value={responsibleId} onChange={(event) => setResponsible(event.target.value)} className="input text-slate-700">
                      <option value="">Mas'ul shaxsni tanlang</option>
                      {store.xodimlar.map((xodim) => <option key={xodim.id} value={xodim.id}>{shaxsNomi(xodim)}</option>)}
                    </AppSelect>
                  </label>
                </div>
              </section>

              <div className="space-y-6">
                <section className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-center gap-2 border-b border-orange-100 pb-4"><MessageSquare size={18} className="text-[#FF5A00]" /><h3 className="font-black uppercase text-slate-600">Izoh</h3></div>
                  <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} className="mt-5 w-full resize-none rounded-2xl border border-slate-200 p-4 font-semibold outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" placeholder="Izoh yozing..." />
                </section>
                <section className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-center gap-2 border-b border-orange-100 pb-4"><Clock3 size={18} className="text-[#FF5A00]" /><h3 className="font-black uppercase text-slate-600">Tarix</h3></div>
                  <div className="mt-5 flex gap-3"><span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[#FF5A00]" /><div><p className="font-black text-slate-700">Yangi hujjat qoralamasi ochildi</p><p className="text-sm font-bold text-slate-400">{hozirgiVaqt()}</p></div></div>
                </section>
              </div>
            </div>

            <section className="mt-6 rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-100 pb-4">
                <h3 className="font-black uppercase text-slate-600">Tovarlar</h3>
                <button type="button" onClick={() => setItems((oldingi) => [...oldingi, yangiQator()])} disabled={!sourceWarehouseId} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#FF5A00] px-5 text-sm font-black uppercase text-white shadow-lg shadow-orange-100 disabled:opacity-40">
                  <Plus size={17} /> Qator qo'shish
                </button>
              </div>

              <div className="mt-5 overflow-x-auto rounded-2xl border border-orange-100">
                <table className="w-full min-w-[1150px] table-fixed text-left text-sm">
                  <thead className="bg-[#FFF9F3] text-xs font-black uppercase text-slate-500">
                    <tr><th className="w-12 px-3 py-4">в„–</th><th className="w-[310px] px-3 py-4">Mahsulot</th><th className="w-44 px-3 py-4">Shtrix kod</th><th className="w-36 px-3 py-4">Narxi</th><th className="w-36 px-3 py-4">Soni</th><th className="w-44 px-3 py-4">Ombordagi qoldiq</th><th className="w-40 px-3 py-4">Summa</th><th className="w-16 px-3 py-4"><Package size={16} /></th></tr>
                  </thead>
                  <tbody className="divide-y divide-orange-100">
                    {qatorMalumotlari.map(({ item, qoldiq, mod, narx, summa }, index) => (
                      <tr key={item.id}>
                        <td className="px-3 py-3 font-bold text-slate-400"><span className="flex items-center gap-1"><GripVertical size={14} className="text-slate-300" />{index + 1}</span></td>
                        <td className="px-3 py-3"><AppSelect value={item.modificationId} disabled={!sourceWarehouseId} onChange={(event) => qatorniYangilash(item.id, { modificationId: event.target.value })} className="input"><option value="">{sourceWarehouseId ? "Mahsulotni tanlang" : "Avval omborni tanlang"}</option>{qoldiqlar.map((variant) => <option key={`${variant.modificationId}-${variant.id ?? "q"}`} value={variant.modificationId} disabled={items.some((qator) => qator.id !== item.id && qator.modificationId === variant.modificationId)}>{modificationNomi(variant.modification)}</option>)}</AppSelect></td>
                        <td className="px-3 py-3"><span className="flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-slate-500"><Barcode size={16} />{mod?.barcode ?? "вЂ”"}</span></td>
                        <td className="px-3 py-3 font-black text-slate-700">{pul(narx)}</td>
                        <td className="px-3 py-3"><label className="relative block"><input type="number" min="0.001" max={qoldiq ? qoldiqMiqdori(qoldiq) : undefined} step="0.001" value={item.quantity} onChange={(event) => qatorniYangilash(item.id, { quantity: Number(event.target.value) })} className="input pr-12" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">dona</span></label></td>
                        <td className="px-3 py-3"><p className="font-black text-slate-700">{qoldiq ? qoldiqMiqdori(qoldiq) : 0}</p><p className="text-xs font-bold text-slate-400">{store.omborlar.find((ombor) => ombor.id === sourceWarehouseId)?.name ?? "вЂ”"}</p></td>
                        <td className="px-3 py-3 font-black text-emerald-600">{pul(summa)}</td>
                        <td className="px-3 py-3"><button type="button" onClick={() => setItems((oldingi) => oldingi.filter((qator) => qator.id !== item.id))} disabled={items.length === 1} className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500 disabled:opacity-30" aria-label="Qatorni o'chirish"><Trash2 size={16} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-5 flex justify-end"><div className="text-right"><p className="text-xs font-black uppercase text-slate-400">Umumiy summa</p><p className="mt-1 text-2xl font-black text-slate-950">{pul(jami)}</p></div></div>
            </section>

            {(xato || store.xatolik) && <p className="mt-5 rounded-2xl bg-red-50 px-5 py-4 text-sm font-bold text-red-600">{xato || store.xatolik}</p>}
          </div>

          <footer className="flex shrink-0 justify-end gap-3 border-t border-orange-100 bg-[#FFF9F2]/95 px-8 py-4 backdrop-blur-xl">
            <button type="button" onClick={onClose} disabled={store.amalBajarilmoqda} className="h-12 rounded-2xl bg-slate-100 px-7 font-black text-slate-600 disabled:opacity-50">Bekor qilish</button>
            <button type="button" onClick={() => void saqlashVaYopish(false)} disabled={store.amalBajarilmoqda} className="inline-flex h-12 items-center gap-2 rounded-2xl border border-orange-300 bg-white px-7 font-black text-[#FF5A00] disabled:opacity-50">{store.amalBajarilmoqda && !jonatilmoqda ? <LoaderCircle size={17} className="animate-spin" /> : <Save size={17} />} Saqlash</button>
            <button type="button" onClick={() => void saqlashVaYopish(true)} disabled={store.amalBajarilmoqda} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#FF5A00] px-7 font-black text-white shadow-lg shadow-orange-100 disabled:opacity-50">{store.amalBajarilmoqda && jonatilmoqda ? <LoaderCircle size={17} className="animate-spin" /> : <Send size={17} />} Saqlash va jo'natish</button>
          </footer>
        </div>
      </div>
    </AppModal>
  );
}

