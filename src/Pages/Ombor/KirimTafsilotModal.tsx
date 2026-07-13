import { useEffect, useMemo, useState } from "react";
import { Ban, CheckCircle2, Clock3, FileText, LoaderCircle, MessageSquare, RotateCcw, X } from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { useOmborStore } from "@/store/omborStore";
import type { KirimHujjati, MahsulotModifikatsiyasi } from "@/types/ombor";
import { holat, hujjatRaqami, modificationNomi, pul, sana } from "./omborYordamchilari";

type Props = { id: string; onClose: () => void };

function faqatSana(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function statusSinfi(status?: string) {
  const value = String(status ?? "DRAFT").toUpperCase();
  if (value === "CONFIRMED") return "bg-emerald-50 text-emerald-600";
  if (value === "CANCELLED" || value === "CANCELED") return "bg-red-50 text-red-500";
  return "bg-amber-50 text-amber-600";
}

export default function KirimTafsilotModal({ id, onClose }: Props) {
  const store = useOmborStore();
  const kirimOlish = useOmborStore((state) => state.kirimOlish);
  const xatolikniTozalash = useOmborStore((state) => state.xatolikniTozalash);
  const [hujjat, setHujjat] = useState<KirimHujjati | null>(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [bekorSorash, setBekorSorash] = useState(false);

  async function qaytaYuklash() {
    setYuklanmoqda(true);
    const item = await kirimOlish(id);
    setHujjat(item);
    setYuklanmoqda(false);
  }

  useEffect(() => {
    let faol = true;
    async function yuklash() {
      xatolikniTozalash();
      const item = await kirimOlish(id);
      if (!faol) return;
      setHujjat(item);
      setYuklanmoqda(false);
    }
    void yuklash();
    return () => { faol = false; };
  }, [id, kirimOlish, xatolikniTozalash]);

  const modMap = useMemo(() => new Map(store.modifikatsiyalar.map((item) => [item.id, item])), [store.modifikatsiyalar]);
  const supplier = hujjat?.supplier ?? store.yetkazibBeruvchilar.find((item) => item.id === hujjat?.supplierId);
  const responsible = hujjat?.responsible ?? store.xodimlar.find((item) => item.id === hujjat?.responsibleId);
  const warehouse = hujjat?.warehouse ?? store.omborlar.find((item) => item.id === hujjat?.warehouseId);
  const jami = hujjat ? Number(hujjat.totalAmount ?? hujjat.total ?? 0) || (hujjat.items ?? []).reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), 0) : 0;
  const status = String(hujjat?.status ?? "DRAFT").toUpperCase();
  const bekorQilingan = status === "CANCELLED" || status === "CANCELED";

  async function tasdiqlash() {
    if (!hujjat || !(await store.kirimTasdiqlash(hujjat.id))) return;
    await qaytaYuklash();
  }

  async function bekorQilish() {
    if (!hujjat || !(await store.kirimBekorQilish(hujjat.id))) return;
    setBekorSorash(false);
    await qaytaYuklash();
  }

  return <AppModal className="!items-stretch !p-3 sm:!p-5">
    <div className="flex min-h-0 w-full flex-col overflow-hidden rounded-[32px] border border-orange-100 bg-[#fff9f2] shadow-[0_28px_90px_rgba(69,35,13,.34)]">
      <header className="flex shrink-0 flex-col gap-3 border-b border-orange-100 bg-white/75 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <h2 className="truncate text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            {hujjat ? `Kirim hujjati ${hujjatRaqami(hujjat)}` : "Kirim hujjati"}
          </h2>
          {hujjat && <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black uppercase ${statusSinfi(hujjat.status)}`}>{holat(hujjat.status)}</span>}
        </div>
        <div className="flex items-center justify-end gap-2">
          {hujjat && status === "DRAFT" && <button type="button" onClick={() => void tasdiqlash()} disabled={store.amalBajarilmoqda} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white shadow-lg shadow-emerald-100 disabled:opacity-50">{store.amalBajarilmoqda ? <LoaderCircle size={17} className="animate-spin"/> : <CheckCircle2 size={17}/>}Tasdiqlash</button>}
          {hujjat && !bekorQilingan && <button type="button" onClick={() => setBekorSorash(true)} disabled={store.amalBajarilmoqda} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-slate-700 px-5 text-sm font-black text-white shadow-lg shadow-slate-200 disabled:opacity-50"><RotateCcw size={17}/>Bekor qilish</button>}
          <button type="button" onClick={onClose} aria-label="Yopish" className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:text-orange-500"><X size={21}/></button>
        </div>
      </header>

      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto p-4 sm:p-8">
        {yuklanmoqda ? <div className="flex h-80 items-center justify-center"><LoaderCircle className="animate-spin text-orange-500" size={36}/></div> : !hujjat ? <div className="rounded-3xl bg-white p-14 text-center text-slate-500"><FileText className="mx-auto mb-3 text-orange-200" size={42}/>{store.xatolik || "Kirim hujjatini backenddan olib bo'lmadi."}</div> : <>
          {store.xatolik && <div className="mb-5 flex justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600"><span>{store.xatolik}</span><button onClick={store.xatolikniTozalash}>Yopish</button></div>}

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm">
              <SectionTitle icon={<FileText size={18}/>} text="Kirim haqida" />
              <div className="rounded-[24px] bg-gradient-to-br from-orange-50 to-orange-100/70 p-6 sm:p-8">
                <p className="text-sm font-black uppercase tracking-wide text-orange-600">Umumiy summa</p>
                <p className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">{pul(jami)}</p>
              </div>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <Info label="Yetkazib beruvchi" value={supplier?.name ?? supplier?.fullName ?? hujjat.supplierId}/>
                <Info label="Ombor" value={warehouse?.name ?? hujjat.warehouseId}/>
                <Info label="Qachon kirim qilingan" value={faqatSana(hujjat.createdAt)}/>
                <Info label="Mas'ul shaxs" value={responsible?.fullName ?? responsible?.name ?? responsible?.username ?? "Biriktirilmagan"}/>
              </div>
            </section>

            <div className="space-y-5">
              <section className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm">
                <SectionTitle icon={<MessageSquare size={18}/>} text="Kommentariya" />
                <div className="min-h-28 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm font-medium leading-6 text-slate-600">{hujjat.note?.trim() || "Bu kirim hujjatiga izoh yozilmagan."}</div>
              </section>
              <section className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm">
                <SectionTitle icon={<Clock3 size={18}/>} text="Tarix" />
                <div className="space-y-4">
                  <History text="Hujjat yaratildi" time={sana(hujjat.createdAt)}/>
                  {hujjat.updatedAt && hujjat.updatedAt !== hujjat.createdAt && <History text="Hujjat yangilandi" time={sana(hujjat.updatedAt)}/>} 
                  {hujjat.confirmedAt && <History text="Hujjat tasdiqlandi" time={sana(hujjat.confirmedAt)}/>} 
                </div>
              </section>
            </div>
          </div>

          <section className="mt-5 rounded-[26px] border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
            <SectionTitle icon={<FileText size={18}/>} text="Tovarlar" />
            <div className="scrollbar-orange overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-orange-50/70 text-[11px] font-black uppercase tracking-wide text-slate-500"><tr><th className="rounded-l-2xl px-4 py-4">№</th><th className="px-4 py-4">Mahsulot</th><th className="px-4 py-4">Shtrix kod</th><th className="px-4 py-4">Tan narxi</th><th className="px-4 py-4">Sotuv narxi</th><th className="px-4 py-4">Ulgurji narxi</th><th className="px-4 py-4">Soni</th><th className="px-4 py-4">Ombor</th><th className="rounded-r-2xl px-4 py-4">Summa</th></tr></thead>
                <tbody className="divide-y divide-orange-100">
                  {(hujjat.items ?? []).map((item, index) => {
                    const mod: MahsulotModifikatsiyasi | undefined = item.modification ?? modMap.get(item.modificationId);
                    const tanNarx = Number(item.price ?? mod?.price?.costPrice ?? 0);
                    const sotuvNarx = Number(mod?.price?.retailPrice ?? 0);
                    const ulgurjiNarx = Number(mod?.price?.wholesalePrice ?? 0);
                    return <tr key={item.id ?? `${item.modificationId}-${index}`} className="hover:bg-orange-50/30"><td className="px-4 py-4 font-bold text-slate-400">{index + 1}</td><td className="px-4 py-4 font-black text-slate-800">{modificationNomi(mod)}</td><td className="px-4 py-4 font-medium text-slate-500">{mod?.barcode || "—"}</td><td className="px-4 py-4 font-semibold text-slate-600">{pul(tanNarx)}</td><td className="px-4 py-4 text-slate-600">{pul(sotuvNarx)}</td><td className="px-4 py-4 text-slate-600">{pul(ulgurjiNarx)}</td><td className="px-4 py-4 font-bold text-slate-700">{Number(item.quantity).toLocaleString("uz-UZ")}</td><td className="px-4 py-4 text-slate-600">{warehouse?.name ?? hujjat.warehouseId}</td><td className="px-4 py-4 font-black text-emerald-600">{pul(Number(item.quantity) * tanNarx)}</td></tr>;
                  })}
                </tbody>
              </table>
            </div>
            {(!hujjat.items || hujjat.items.length === 0) && <div className="py-12 text-center text-sm font-bold text-slate-400">Hujjatda mahsulotlar mavjud emas.</div>}
          </section>
        </>}
      </div>
    </div>

    {bekorSorash && <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-black/30 p-4"><div className="w-full max-w-sm rounded-[26px] bg-white p-6 shadow-2xl"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500"><Ban size={22}/></div><h3 className="mt-4 text-center text-lg font-black text-slate-950">Kirimni bekor qilasizmi?</h3><p className="mt-2 text-center text-sm text-slate-500">Tasdiqlangan kirim bekor qilinsa, ombor qoldig‘i backend orqali qayta hisoblanadi.</p><div className="mt-6 flex gap-3"><button type="button" onClick={() => setBekorSorash(false)} className="h-11 flex-1 rounded-2xl bg-slate-100 text-sm font-bold text-slate-600">Yo‘q</button><button type="button" onClick={() => void bekorQilish()} disabled={store.amalBajarilmoqda} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-red-500 text-sm font-black text-white disabled:opacity-50">{store.amalBajarilmoqda && <LoaderCircle size={16} className="animate-spin"/>}Ha, bekor qilish</button></div></div></div>}
  </AppModal>;
}

function SectionTitle({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="mb-5 flex items-center gap-2 border-b border-orange-100 pb-4 text-sm font-black uppercase tracking-wide text-slate-600"><span className="text-orange-500">{icon}</span>{text}</div>; }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-sm font-bold text-slate-400">{label}</p><p className="mt-1 break-words text-base font-black text-slate-700">{value}</p></div>; }
function History({ text, time }: { text: string; time: string }) { return <div className="flex items-start gap-3"><span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-orange-500"/><div><p className="text-sm font-bold text-slate-700">{text}</p><p className="text-xs font-semibold text-slate-400">{time}</p></div></div>; }
