import { useEffect, useMemo, useRef, useState } from "react";
import { Ban, CheckCircle2, FileText, LoaderCircle, Plus, Search, Settings, Trash2 } from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { useOmborStore } from "@/store/omborStore";
import type { ChiqimHujjati, ChiqimSababi, MahsulotModifikatsiyasi } from "@/types/ombor";
import { holat, hujjatRaqami, pul, sana } from "./omborYordamchilari";
import InventoryHujjatModal from "./InventoryHujjatModal";
import YangiChiqimModal from "./YangiChiqimModal";

const chiqimSabablari: Record<ChiqimSababi, string> = {
  DAMAGE: "Shikastlangan",
  EXPIRY: "Muddati o'tgan",
  THEFT: "Yo'qolgan yoki o'g'irlangan",
  OTHER: "Boshqa",
};

type Ustun = "nomi" | "ombor" | "sabab" | "sana" | "masul" | "status" | "summa";
const ustunlar: Array<{ id: Ustun; nom: string }> = [
  { id: "nomi", nom: "Nomi" },
  { id: "ombor", nom: "Ombor" },
  { id: "sabab", nom: "Sabab" },
  { id: "sana", nom: "Sana" },
  { id: "masul", nom: "Mas'ul shaxs" },
  { id: "status", nom: "Status" },
  { id: "summa", nom: "Summa" },
];

function statusSinfi(status?: string) {
  const value = String(status ?? "DRAFT").toUpperCase();
  if (value === "CONFIRMED") return "bg-emerald-50 text-emerald-600";
  if (value === "CANCELLED" || value === "CANCELED") return "bg-red-50 text-red-500";
  return "bg-amber-50 text-amber-600";
}

export default function Chiqim() {
  const store = useOmborStore();
  const malumotlarniYuklash = store.malumotlarniYuklash;
  const [qidiruv, setQidiruv] = useState("");
  const [modal, setModal] = useState(false);
  const [tanlanganId, setTanlanganId] = useState<string | null>(null);
  const [bekorSorash, setBekorSorash] = useState<ChiqimHujjati | null>(null);
  const [sozlama, setSozlama] = useState(false);
  const [korinadigan, setKorinadigan] = useState<Set<Ustun>>(() => new Set(ustunlar.map((item) => item.id)));
  const sozlamaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { void malumotlarniYuklash(); }, [malumotlarniYuklash]);
  useEffect(() => {
    if (!sozlama) return;
    const yopish = (event: MouseEvent) => { if (!sozlamaRef.current?.contains(event.target as Node)) setSozlama(false); };
    document.addEventListener("mousedown", yopish);
    return () => document.removeEventListener("mousedown", yopish);
  }, [sozlama]);

  const omborMap = useMemo(() => new Map(store.omborlar.map((item) => [item.id, item.name])), [store.omborlar]);
  const xodimMap = useMemo(() => new Map(store.xodimlar.map((item) => [item.id, item])), [store.xodimlar]);
  const modMap = useMemo(() => new Map(store.modifikatsiyalar.map((item) => [item.id, item])), [store.modifikatsiyalar]);

  function omborNomi(item: ChiqimHujjati) { return item.warehouse?.name ?? omborMap.get(item.warehouseId) ?? item.warehouseId; }
  function masulNomi(item: ChiqimHujjati) {
    const user = item.responsibleId ? xodimMap.get(item.responsibleId) : undefined;
    return item.responsible?.fullName ?? item.responsible?.name ?? item.responsible?.username ?? user?.fullName ?? user?.name ?? user?.username ?? "Biriktirilmagan";
  }
  function sababNomi(item: ChiqimHujjati) { return chiqimSabablari[item.reason as keyof typeof chiqimSabablari] ?? item.reason ?? "—"; }
  function hujjatSummasi(item: ChiqimHujjati) {
    return (item.items ?? []).reduce((sum, row) => {
      const mod: MahsulotModifikatsiyasi | undefined = row.modification ?? modMap.get(row.modificationId);
      return sum + Number(row.quantity ?? 0) * Number(mod?.price?.costPrice ?? 0);
    }, 0);
  }

  const royxat = useMemo(() => {
    const query = qidiruv.trim().toLowerCase();
    if (!query) return store.chiqimlar;
    return store.chiqimlar.filter((item) => [
      hujjatRaqami(item), omborNomi(item), sababNomi(item), masulNomi(item), sana(item.createdAt), holat(item.status),
    ].join(" ").toLowerCase().includes(query));
    // Qidiruv yordamchi funksiyalardagi real maplarga bog'liq.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qidiruv, store.chiqimlar, omborMap, xodimMap]);

  async function bekorQilish() {
    if (!bekorSorash) return;
    if (await store.chiqimBekorQilish(bekorSorash.id)) setBekorSorash(null);
  }

  function ustunniAlmashtirish(id: Ustun) {
    setKorinadigan((old) => {
      const next = new Set(old);
      if (next.has(id)) { if (next.size > 1) next.delete(id); } else next.add(id);
      return next;
    });
  }

  function katak(item: ChiqimHujjati, id: Ustun) {
    switch (id) {
      case "nomi": return <div><p className="font-black text-slate-900">Chiqim hujjati</p><p className="mt-0.5 text-xs font-bold text-orange-500">{hujjatRaqami(item)}</p></div>;
      case "ombor": return <span className="font-semibold text-slate-600">{omborNomi(item)}</span>;
      case "sabab": return <span className="text-slate-500">{sababNomi(item)}</span>;
      case "sana": return <span className="text-slate-500">{sana(item.createdAt)}</span>;
      case "masul": return <span className="font-semibold text-slate-600">{masulNomi(item)}</span>;
      case "status": return <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusSinfi(item.status)}`}>{holat(item.status)}</span>;
      case "summa": return <span className="font-black text-slate-700">{pul(hujjatSummasi(item))}</span>;
    }
  }

  const faolUstunlar = ustunlar.filter((item) => korinadigan.has(item.id));

  return <div className="space-y-5">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">Ombor uchoti</p><h1 className="mt-1 text-3xl font-black text-slate-950">Chiqim</h1><p className="mt-1 text-sm text-slate-500">Ombordan tovar chiqim qilish hujjatlari.</p></div>
      <button onClick={() => setModal(true)} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600"><Plus size={17}/>Yaratish</button>
    </header>

    <div className="relative max-w-sm"><Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input value={qidiruv} onChange={(event) => setQidiruv(event.target.value)} placeholder="Nomi, ombor, mas'ul, sana yoki holati bo'yicha" className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-orange-400"/></div>

    {store.xatolik && <div className="flex items-start justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600"><span>{store.xatolik}</span><button onClick={store.xatolikniTozalash}>Yopish</button></div>}

    <div className="overflow-hidden rounded-[24px] border border-orange-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="bg-orange-50/70 text-[11px] font-black uppercase tracking-wide text-orange-500"><tr>{faolUstunlar.map((column) => <th key={column.id} className="border-r border-orange-200/70 px-5 py-4 last:border-r-0">{column.nom}</th>)}<th className="w-28 px-5 py-3"><div ref={sozlamaRef} className="relative flex justify-end"><button onClick={() => setSozlama((value) => !value)} aria-label="Ustunlarni sozlash" className="flex h-8 w-8 items-center justify-center rounded-lg text-orange-500 hover:bg-orange-100"><Settings size={16}/></button>{sozlama && <div className="absolute right-0 top-10 z-20 w-56 rounded-2xl border border-orange-100 bg-white p-2 text-slate-600 shadow-xl">{ustunlar.map((column) => <label key={column.id} className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold hover:bg-orange-50"><input type="checkbox" checked={korinadigan.has(column.id)} onChange={() => ustunniAlmashtirish(column.id)} className="accent-orange-500"/>{column.nom}</label>)}</div>}</div></th></tr></thead>
          <tbody className="divide-y divide-orange-100">
            {store.yuklanmoqda ? <tr><td colSpan={faolUstunlar.length + 1} className="py-16 text-center"><LoaderCircle className="mx-auto animate-spin text-orange-500" size={29}/></td></tr> : royxat.map((item) => {
              const status = String(item.status ?? "DRAFT").toUpperCase();
              const bekor = status === "CANCELLED" || status === "CANCELED";
              return <tr key={item.id} onClick={() => setTanlanganId(item.id)} className="cursor-pointer transition hover:bg-orange-50/40">{faolUstunlar.map((column) => <td key={column.id} className="px-5 py-4">{katak(item, column.id)}</td>)}<td className="px-5 py-4" onClick={(event) => event.stopPropagation()}><div className="flex justify-end gap-2">{status === "DRAFT" && <button onClick={() => void store.chiqimTasdiqlash(item.id)} disabled={store.amalBajarilmoqda} title="Tasdiqlash" className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50"><CheckCircle2 size={16}/></button>}{!bekor && <button onClick={() => setBekorSorash(item)} title="Bekor qilish" className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100"><Trash2 size={16}/></button>}</div></td></tr>;
            })}
          </tbody>
        </table>
      </div>
      {!store.yuklanmoqda && royxat.length === 0 && <div className="p-14 text-center"><FileText className="mx-auto text-orange-200" size={42}/><p className="mt-3 font-bold text-slate-500">Chiqim hujjati topilmadi</p><p className="mt-1 text-sm text-slate-400">“Yaratish” tugmasi orqali yangi chiqim qo‘shing.</p></div>}
    </div>

    {modal && (
      <YangiChiqimModal onClose={() => setModal(false)} />
    )}
    {tanlanganId && (
      <InventoryHujjatModal
        tur="chiqim"
        id={tanlanganId}
        onClose={() => setTanlanganId(null)}
      />
    )}
    {bekorSorash && <AppModal><div className="w-full max-w-sm rounded-[26px] bg-white p-6 shadow-2xl"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500"><Ban size={22}/></div><h3 className="mt-4 text-center text-lg font-black text-slate-950">Chiqimni bekor qilasizmi?</h3><p className="mt-2 text-center text-sm text-slate-500">“{hujjatRaqami(bekorSorash)}” hujjati bekor qilinadi. Tasdiqlangan bo‘lsa, ombor qoldig‘i backend orqali tiklanadi.</p><div className="mt-6 flex gap-3"><button onClick={() => setBekorSorash(null)} className="h-11 flex-1 rounded-2xl bg-slate-100 text-sm font-bold text-slate-600">Yopish</button><button onClick={() => void bekorQilish()} disabled={store.amalBajarilmoqda} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-red-500 text-sm font-black text-white disabled:opacity-50">{store.amalBajarilmoqda && <LoaderCircle size={16} className="animate-spin"/>}Ha, bekor qilish</button></div></div></AppModal>}
  </div>;
}
