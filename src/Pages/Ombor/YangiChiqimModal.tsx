import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, LoaderCircle, MessageSquare, PackageMinus, Plus, Trash2, Warehouse, X } from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { useOmborStore } from "@/store/omborStore";
import type { ChiqimSababi } from "@/types/ombor";
import { modificationNomi, pul, qoldiqMiqdori } from "./omborYordamchilari";

type Props = { onClose: () => void };
type Qator = { id: string; modificationId: string; quantity: number };

const chiqimSabablari: Record<ChiqimSababi, string> = {
  DAMAGE: "Shikastlangan",
  EXPIRY: "Muddati o'tgan",
  THEFT: "Yo'qolgan yoki o'g'irlangan",
  OTHER: "Boshqa",
};

const input = "h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100";
const yangiQator = (): Qator => ({ id: crypto.randomUUID(), modificationId: "", quantity: 1 });

export default function YangiChiqimModal({ onClose }: Props) {
  const store = useOmborStore();
  const defaultOmbor = store.omborlar.find((item) => item.isActive !== false)?.id ?? store.omborlar[0]?.id ?? "";
  const [warehouseId, setWarehouseId] = useState(defaultOmbor);
  const [responsibleId, setResponsibleId] = useState("");
  const [reason, setReason] = useState<ChiqimSababi>("OTHER");
  const [note, setNote] = useState("");
  const [qatorlar, setQatorlar] = useState<Qator[]>([yangiQator()]);
  const [xato, setXato] = useState("");

  useEffect(() => {
    if (warehouseId) void store.qoldiqlarniYuklash(warehouseId);
    // Store funksiyasi Zustand ichida barqaror.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId]);

  const omborQoldiqlari = useMemo(
    () => store.qoldiqlar.filter((item) => item.warehouseId === warehouseId || item.warehouse?.id === warehouseId),
    [store.qoldiqlar, warehouseId]
  );

  const chiqimQiymati = useMemo(() => qatorlar.reduce((sum, row) => {
    const mod = store.modifikatsiyalar.find((item) => item.id === row.modificationId);
    return sum + row.quantity * Number(mod?.price?.costPrice ?? 0);
  }, 0), [qatorlar, store.modifikatsiyalar]);

  function qatorniYangilash(id: string, value: Partial<Qator>) {
    setQatorlar((rows) => rows.map((row) => row.id === id ? { ...row, ...value } : row));
  }

  async function saqlash(tasdiqlash: boolean) {
    setXato("");
    if (!warehouseId) return setXato("Omborni tanlang.");
    if (!qatorlar.length || qatorlar.some((row) => !row.modificationId || row.quantity <= 0)) {
      return setXato("Har bir qatorda mahsulot va to'g'ri miqdorni kiriting.");
    }
    if (new Set(qatorlar.map((row) => row.modificationId)).size !== qatorlar.length) {
      return setXato("Bir mahsulotni bir necha marta kiritmang; miqdorini bitta qatorda yozing.");
    }
    const ortiqcha = qatorlar.find((row) => {
      const stock = omborQoldiqlari.find((item) => item.modificationId === row.modificationId);
      return row.quantity > Number(stock ? qoldiqMiqdori(stock) : 0);
    });
    if (ortiqcha) return setXato("Chiqim miqdori ombordagi mavjud qoldiqdan oshib ketdi.");

    const hujjat = await store.chiqimYaratish({
      warehouseId,
      reason,
      responsibleId: responsibleId || undefined,
      note: note.trim() || undefined,
      items: qatorlar.map(({ modificationId, quantity }) => ({ modificationId, quantity })),
    });
    if (!hujjat) return;
    if (tasdiqlash && !(await store.chiqimTasdiqlash(hujjat.id))) return;
    onClose();
  }

  return <AppModal className="!items-stretch !p-3 sm:!p-5">
    <div className="flex min-h-0 w-full flex-col overflow-hidden rounded-[32px] border border-orange-100 bg-[#fffaf4] shadow-[0_28px_90px_rgba(69,35,13,.32)]">
      <header className="flex shrink-0 items-center justify-between border-b border-orange-100 bg-white/75 px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3"><h2 className="text-2xl font-black text-slate-950 sm:text-3xl">Yangi chiqim</h2><span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-500">YANGI</span></div>
        <button type="button" onClick={onClose} aria-label="Yopish" className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:text-orange-500"><X size={21}/></button>
      </header>

      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8">
        {(xato || store.xatolik) && <div className="mb-4 flex items-start justify-between gap-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600"><span>{xato || store.xatolik}</span><button type="button" onClick={() => { setXato(""); store.xatolikniTozalash(); }}>Yopish</button></div>}

        <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
          <section className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm">
            <Title icon={<PackageMinus size={18}/>} text="Chiqim haqida" />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Ombor *"><div className="relative"><Warehouse size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><select value={warehouseId} onChange={(event) => { setWarehouseId(event.target.value); setQatorlar([yangiQator()]); }} className={`${input} appearance-none pl-11 pr-10`}><option value="">Omborni tanlang</option>{store.omborlar.filter((item) => item.isActive !== false).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"/></div></Field>
              <Field label="Chiqim sababi *"><div className="relative"><select value={reason} onChange={(event) => setReason(event.target.value as ChiqimSababi)} className={`${input} appearance-none pr-10`}>{Object.entries(chiqimSabablari).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><ChevronDown size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"/></div></Field>
              <Field label="Mas'ul shaxs"><div className="relative"><select value={responsibleId} onChange={(event) => setResponsibleId(event.target.value)} className={`${input} appearance-none pr-10`}><option value="">Mas'ul shaxsni tanlang</option>{store.xodimlar.map((item) => <option key={item.id} value={item.id}>{item.fullName ?? item.name ?? item.username ?? item.id}</option>)}</select><ChevronDown size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"/></div></Field>
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4"><div className="flex gap-2 text-amber-700"><AlertTriangle size={18}/><p className="text-sm font-black">Tasdiqlanganda qoldiq kamayadi</p></div><p className="mt-1 text-xs font-medium text-amber-600">Qoralama ombor qoldig'ini o'zgartirmaydi.</p></div>
            </div>
          </section>
          <section className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm"><Title icon={<MessageSquare size={18}/>} text="Kommentariya"/><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={5} placeholder="Izoh yozing..." className="w-full resize-none rounded-2xl border border-slate-200 p-4 text-sm font-medium outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"/></section>
        </div>

        <section className="mt-5 rounded-[26px] border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-black uppercase tracking-wide text-slate-600">Tovarlar</h3><p className="mt-1 text-xs font-medium text-slate-400">Faqat tanlangan omborda qoldig‘i bor mahsulotlar.</p></div><button type="button" onClick={() => setQatorlar((rows) => [...rows, yangiQator()])} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white shadow-lg shadow-orange-100 hover:bg-orange-600"><Plus size={18}/>Qator qo'shish</button></div>
          <div className="space-y-3">
            {qatorlar.map((row, index) => {
              const stock = omborQoldiqlari.find((item) => item.modificationId === row.modificationId);
              const mavjud = Number(stock ? qoldiqMiqdori(stock) : 0);
              return <div key={row.id} className="grid gap-3 rounded-2xl border border-orange-100 bg-[#fffdfa] p-3 md:grid-cols-[42px_1fr_160px_150px_48px] md:items-center">
                <span className="text-center text-sm font-black text-slate-400">{index + 1}</span>
                <select value={row.modificationId} onChange={(event) => qatorniYangilash(row.id, { modificationId: event.target.value })} className={input}><option value="">Mahsulotni tanlang</option>{omborQoldiqlari.filter((item) => Number(qoldiqMiqdori(item)) > 0).map((item, itemIndex) => <option key={`${item.modificationId}-${itemIndex}`} value={item.modificationId}>{modificationNomi(item.modification ?? store.modifikatsiyalar.find((mod) => mod.id === item.modificationId))}</option>)}</select>
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm"><p className="text-xs font-bold text-slate-400">Mavjud qoldiq</p><p className="mt-0.5 font-black text-slate-700">{mavjud.toLocaleString("uz-UZ")}</p></div>
                <input type="number" min="0.001" max={mavjud || undefined} step="0.001" value={row.quantity} onChange={(event) => qatorniYangilash(row.id, { quantity: Number(event.target.value) })} className={input}/>
                <button type="button" disabled={qatorlar.length === 1} onClick={() => setQatorlar((rows) => rows.filter((item) => item.id !== row.id))} aria-label="Qatorni o'chirish" className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-30"><Trash2 size={17}/></button>
              </div>;
            })}
          </div>
          <div className="mt-4 flex justify-end border-t border-orange-100 pt-4 text-right"><div><p className="text-xs font-black uppercase text-slate-400">Chiqim qiymati</p><p className="mt-1 text-2xl font-black text-slate-950">{pul(chiqimQiymati)}</p><p className="text-[10px] font-semibold text-slate-400">Katalogdagi tan narxlar bo‘yicha</p></div></div>
        </section>
      </div>

      <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-orange-100 bg-white/75 px-5 py-4 sm:flex-row sm:justify-end sm:px-8"><button type="button" onClick={onClose} className="h-12 rounded-2xl bg-slate-100 px-7 text-sm font-black text-slate-600">Bekor qilish</button><Action busy={store.amalBajarilmoqda} outline onClick={() => void saqlash(false)}>Saqlash</Action><Action busy={store.amalBajarilmoqda} onClick={() => void saqlash(true)}>Saqlash va tasdiqlash</Action></footer>
    </div>
  </AppModal>;
}

function Title({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="mb-4 flex items-center gap-2 border-b border-orange-100 pb-4 text-sm font-black uppercase tracking-wide text-slate-600"><span className="text-orange-500">{icon}</span>{text}</div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="space-y-2 text-sm font-bold text-slate-500"><span>{label}</span>{children}</label>; }
function Action({ children, busy, outline, onClick }: { children: React.ReactNode; busy: boolean; outline?: boolean; onClick: () => void }) { return <button type="button" onClick={onClick} disabled={busy} className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-7 text-sm font-black disabled:opacity-50 ${outline ? "border border-orange-300 bg-white text-orange-600" : "bg-orange-500 text-white shadow-lg shadow-orange-100 hover:bg-orange-600"}`}>{busy && <LoaderCircle size={17} className="animate-spin"/>}{children}</button>; }
