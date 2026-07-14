import { useMemo, useState } from "react";
import { Barcode, CalendarDays, ChevronDown, Clock3, LoaderCircle, MessageSquare, PackagePlus, Plus, Trash2, Warehouse, X } from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { useOmborStore } from "@/store/omborStore";
import { modificationNomi, pul, qoldiqMiqdori } from "./omborYordamchilari";

type Qator = { id: string; modificationId: string; warehouseId: string; quantity: number; price: string };
type Props = { onClose: () => void };

function yangiQator(warehouseId = ""): Qator {
  return { id: crypto.randomUUID(), modificationId: "", warehouseId, quantity: 1, price: "" };
}

const input = "h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100";

export default function YangiKirimModal({ onClose }: Props) {
  const store = useOmborStore();
  const birinchiOmbor = store.omborlar.find((item) => item.isActive !== false)?.id ?? store.omborlar[0]?.id ?? "";
  const [supplierId, setSupplierId] = useState("");
  const [responsibleId, setResponsibleId] = useState("");
  const [note, setNote] = useState("");
  const [qatorlar, setQatorlar] = useState<Qator[]>([yangiQator(birinchiOmbor)]);
  const [xato, setXato] = useState("");
  const jami = useMemo(() => qatorlar.reduce((sum, row) => sum + row.quantity * Number(row.price || 0), 0), [qatorlar]);
  const bugun = new Intl.DateTimeFormat("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());

  function yangilash(id: string, value: Partial<Qator>) {
    setQatorlar((rows) => rows.map((row) => row.id === id ? { ...row, ...value } : row));
  }

  function mahsulotTanlash(id: string, modificationId: string) {
    const mod = store.modifikatsiyalar.find((item) => item.id === modificationId);
    const cost = Number(mod?.price?.costPrice ?? 0);
    yangilash(id, { modificationId, price: cost ? String(cost) : "" });
  }

  async function saqlash(tasdiqlash: boolean) {
    setXato("");
    const valid = qatorlar.filter((row) => row.modificationId && row.warehouseId && row.quantity > 0 && Number(row.price) >= 0);
    if (!supplierId) return setXato("Yetkazib beruvchini tanlang.");
    if (!valid.length || valid.length !== qatorlar.length) return setXato("Har bir qatorda mahsulot, ombor, miqdor va tan narxni to'liq kiriting.");
    if (new Set(valid.map((row) => row.warehouseId)).size !== 1) return setXato("Barcha qatorlarda bir xil omborni tanlang.");

    const hujjat = await store.kirimYaratish({
      supplierId,
      warehouseId: valid[0].warehouseId,
      responsibleId: responsibleId || undefined,
      note: note.trim() || undefined,
      items: valid.map((row) => ({ modificationId: row.modificationId, quantity: row.quantity, price: Number(row.price || 0) })),
    });
    if (!hujjat) return;
    if (tasdiqlash && !(await store.kirimTasdiqlash(hujjat.id))) return;
    onClose();
  }

  return (
    <AppModal className="!items-stretch !p-3 sm:!p-5">
      <div className="flex min-h-0 w-full flex-col overflow-hidden rounded-[32px] border border-orange-100 bg-[#fffaf4] shadow-[0_28px_90px_rgba(69,35,13,.32)]">
        <header className="flex shrink-0 items-center justify-between border-b border-orange-100 bg-white/75 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Yangi kirim</h2>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-500">YANGI</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Yopish" className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:text-orange-500"><X size={21} /></button>
        </header>

        <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8">
          {(xato || store.xatolik) && <div className="mb-4 flex justify-between gap-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600"><span>{xato || store.xatolik}</span><button type="button" onClick={() => { setXato(""); store.xatolikniTozalash(); }}>Yopish</button></div>}

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm">
              <SectionTitle icon={<PackagePlus size={18} />} text="Kirim haqida" />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <SelectField label="Yetkazib beruvchi *" value={supplierId} onChange={setSupplierId} placeholder="Yetkazib beruvchini tanlang" options={store.yetkazibBeruvchilar.map((item) => ({ id: item.id, name: item.name ?? item.fullName ?? item.id }))} />
                <SelectField label="Mas'ul shaxs" value={responsibleId} onChange={setResponsibleId} placeholder="Mas'ul shaxsni tanlang" options={store.xodimlar.map((item) => ({ id: item.id, name: item.fullName ?? item.name ?? item.username ?? item.id }))} />
                <label className="space-y-2 text-sm font-bold text-slate-500 md:col-span-2 xl:col-span-1 2xl:col-span-2"><span>Qachon kirim qilingan</span><div className="relative"><input value={bugun} readOnly className={`${input} pr-11`} /><CalendarDays size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" /></div></label>
              </div>
            </section>

            <div className="space-y-5">
              <section className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm">
                <SectionTitle icon={<MessageSquare size={18} />} text="Kommentariya" />
                <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Izoh yozing..." className="w-full resize-none rounded-2xl border border-slate-200 p-4 text-sm font-medium outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100" />
              </section>
              <section className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm">
                <SectionTitle icon={<Clock3 size={18} />} text="Tarix" />
                <div className="flex items-start gap-3 text-sm"><span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-orange-500" /><div><p className="font-bold text-slate-700">Yangi hujjat qoralamasi ochildi</p><p className="text-xs font-semibold text-slate-400">{bugun}</p></div></div>
              </section>
            </div>
          </div>

          <section className="mt-5 rounded-[26px] border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><h3 className="text-sm font-black uppercase tracking-wide text-slate-600">Tovarlar</h3><p className="mt-1 text-xs font-medium text-slate-400">Mahsulotlar, miqdor va real omborni kiriting.</p></div>
              <button type="button" onClick={() => setQatorlar((rows) => [...rows, yangiQator(rows[0]?.warehouseId || birinchiOmbor)])} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white shadow-lg shadow-orange-100 hover:bg-orange-600"><Plus size={18} /> Qator qo'shish</button>
            </div>

            <div className="scrollbar-orange overflow-x-auto pb-2">
              <div className="min-w-[1080px] space-y-3">
                <div className="grid grid-cols-[38px_2.2fr_1fr_1fr_1.35fr_1fr_48px] gap-3 px-3 text-[11px] font-black uppercase tracking-wide text-slate-400"><span>№</span><span>Mahsulot</span><span>Shtrix kod</span><span>Tan narxi</span><span>Ombor</span><span>Soni</span><span /></div>
                {qatorlar.map((row, index) => {
                  const mod = store.modifikatsiyalar.find((item) => item.id === row.modificationId);
                  const stock = store.qoldiqlar.find((item) => item.modificationId === row.modificationId && item.warehouseId === row.warehouseId);
                  return <div key={row.id} className="grid grid-cols-[38px_2.2fr_1fr_1fr_1.35fr_1fr_48px] items-center gap-3 rounded-2xl border border-orange-100 bg-[#fffdfa] p-3">
                    <span className="text-center text-sm font-black text-slate-400">{index + 1}</span>
                    <select value={row.modificationId} onChange={(event) => mahsulotTanlash(row.id, event.target.value)} className={`${input} min-w-0`}><option value="">Mahsulotni tanlang</option>{store.modifikatsiyalar.map((item) => <option key={item.id} value={item.id}>{modificationNomi(item)}</option>)}</select>
                    <div className="relative"><Barcode size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={mod?.barcode ?? ""} readOnly placeholder="Shtrix kod" className={`${input} pl-9`} /></div>
                    <input type="number" min="0" value={row.price} onChange={(event) => yangilash(row.id, { price: event.target.value })} placeholder="0" className={input} />
                    <div className="relative"><Warehouse size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><select value={row.warehouseId} onChange={(event) => yangilash(row.id, { warehouseId: event.target.value })} className={`${input} appearance-none pl-9 pr-8`}><option value="">Omborni tanlang</option>{store.omborlar.filter((item) => item.isActive !== false).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" /></div>
                    <div><input type="number" min="0.001" step="0.001" value={row.quantity} onChange={(event) => yangilash(row.id, { quantity: Number(event.target.value) })} className={input} /><p className="mt-1 truncate text-[10px] font-semibold text-slate-400">Qoldiq: {stock ? qoldiqMiqdori(stock) : 0}</p></div>
                    <button type="button" disabled={qatorlar.length === 1} onClick={() => setQatorlar((rows) => rows.filter((item) => item.id !== row.id))} aria-label="Qatorni o'chirish" className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-30"><Trash2 size={17} /></button>
                  </div>;
                })}
              </div>
            </div>
            <div className="mt-4 flex justify-end border-t border-orange-100 pt-4 text-right"><div><p className="text-xs font-black uppercase text-slate-400">Umumiy summa</p><p className="mt-1 text-2xl font-black text-slate-950">{pul(jami)}</p></div></div>
          </section>
        </div>

        <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-orange-100 bg-white/75 px-5 py-4 sm:flex-row sm:justify-end sm:px-8">
          <button type="button" onClick={onClose} className="h-12 rounded-2xl bg-slate-100 px-7 text-sm font-black text-slate-600 hover:bg-slate-200">Bekor qilish</button>
          <ActionButton busy={store.amalBajarilmoqda} outline onClick={() => void saqlash(false)}>Saqlash</ActionButton>
          <ActionButton busy={store.amalBajarilmoqda} onClick={() => void saqlash(true)}>Saqlash va tasdiqlash</ActionButton>
        </footer>
      </div>
    </AppModal>
  );
}

function SectionTitle({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="mb-4 flex items-center gap-2 border-b border-orange-100 pb-4 text-sm font-black uppercase tracking-wide text-slate-600"><span className="text-orange-500">{icon}</span>{text}</div>;
}

function SelectField({ label, value, onChange, placeholder, options }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; options: Array<{ id: string; name: string }> }) {
  return <label className="space-y-2 text-sm font-bold text-slate-500"><span>{label}</span><div className="relative"><select value={value} onChange={(event) => onChange(event.target.value)} className={`${input} appearance-none pr-10`}><option value="">{placeholder}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select><ChevronDown size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" /></div></label>;
}

function ActionButton({ children, busy, outline, onClick }: { children: React.ReactNode; busy: boolean; outline?: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} disabled={busy} className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-7 text-sm font-black disabled:opacity-50 ${outline ? "border border-orange-300 bg-white text-orange-600" : "bg-orange-500 text-white shadow-lg shadow-orange-100 hover:bg-orange-600"}`}>{busy && <LoaderCircle size={17} className="animate-spin" />}{children}</button>;
}
