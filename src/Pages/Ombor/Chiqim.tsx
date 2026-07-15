import { useEffect, useMemo, useRef, useState } from "react";
import {
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  LoaderCircle,
  Plus,
  Search,
  Settings,
  Trash2,
} from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { useOmborStore } from "@/store/omborStore";
import type {
  ChiqimHujjati,
  ChiqimSababi,
  MahsulotModifikatsiyasi,
  NomliEntity,
} from "@/types/ombor";
import { holat, hujjatRaqami, pul, sana } from "./omborYordamchilari";
import ChiqimTafsilotModal from "./ChiqimTafsilotModal";
import YangiChiqimModal from "./YangiChiqimModal";

const chiqimSabablari: Record<ChiqimSababi, string> = {
  DAMAGE: "Shikastlangan",
  EXPIRY: "Muddati o'tgan",
  THEFT: "Yo'qolgan yoki o'g'irlangan",
  OTHER: "Boshqa",
};

type Ustun =
  | "nomi"
  | "status"
  | "yaratilgan"
  | "ombor"
  | "yaratgan"
  | "ozgartirilgan"
  | "ozgartirgan"
  | "summa";

const ustunlar: Array<{ id: Ustun; nom: string; width: number }> = [
  { id: "nomi", nom: "Nomi", width: 190 },
  { id: "status", nom: "Status", width: 160 },
  { id: "yaratilgan", nom: "Yaratilgan vaqti", width: 190 },
  { id: "ombor", nom: "Ombor", width: 190 },
  { id: "yaratgan", nom: "Yaratgan mas'ul shaxs", width: 210 },
  { id: "ozgartirilgan", nom: "O'zgartirilgan vaqti", width: 210 },
  { id: "ozgartirgan", nom: "O'zgartirgan mas'ul shaxs", width: 220 },
  { id: "summa", nom: "Summa", width: 170 },
];

function statusSinfi(status?: string) {
  const value = String(status ?? "DRAFT").toUpperCase();
  if (value === "CONFIRMED") return "bg-emerald-50 text-emerald-600";
  if (value === "CANCELLED" || value === "CANCELED") return "bg-red-50 text-red-500";
  return "bg-amber-50 text-amber-600";
}

function shaxsNomi(shaxs?: NomliEntity) {
  return shaxs?.fullName ?? shaxs?.name ?? shaxs?.username;
}

export default function Chiqim() {
  const store = useOmborStore();
  const malumotlarniYuklash = store.malumotlarniYuklash;
  const [qidiruv, setQidiruv] = useState("");
  const [modal, setModal] = useState(false);
  const [tanlanganId, setTanlanganId] = useState<string | null>(null);
  const [bekorSorash, setBekorSorash] = useState<ChiqimHujjati | null>(null);
  const [sozlama, setSozlama] = useState(false);
  const [korinadigan, setKorinadigan] = useState<Set<Ustun>>(
    () => new Set(ustunlar.map((item) => item.id))
  );
  const [ustunKengliklari, setUstunKengliklari] = useState<Record<Ustun, number>>(
    () => Object.fromEntries(ustunlar.map((item) => [item.id, item.width])) as Record<Ustun, number>
  );
  const [scrollHolati, setScrollHolati] = useState({ chap: 0, kenglik: 0, maxChap: 0, maxScroll: 0 });
  const sozlamaRef = useRef<HTMLDivElement | null>(null);
  const jadvalRef = useRef<HTMLDivElement | null>(null);
  const scrollYoliRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { void malumotlarniYuklash(); }, [malumotlarniYuklash]);
  useEffect(() => {
    if (!sozlama) return;
    const yopish = (event: MouseEvent) => {
      if (!sozlamaRef.current?.contains(event.target as Node)) setSozlama(false);
    };
    document.addEventListener("mousedown", yopish);
    return () => document.removeEventListener("mousedown", yopish);
  }, [sozlama]);

  const omborMap = useMemo(
    () => new Map(store.omborlar.map((item) => [item.id, item.name])),
    [store.omborlar]
  );
  const xodimMap = useMemo(
    () => new Map(store.xodimlar.map((item) => [item.id, item])),
    [store.xodimlar]
  );
  const modMap = useMemo(
    () => new Map(store.modifikatsiyalar.map((item) => [item.id, item])),
    [store.modifikatsiyalar]
  );

  function omborNomi(item: ChiqimHujjati) {
    return item.warehouse?.name ?? omborMap.get(item.warehouseId) ?? item.warehouseId;
  }

  function masulNomi(item: ChiqimHujjati) {
    const user = item.responsibleId ? xodimMap.get(item.responsibleId) : undefined;
    return shaxsNomi(item.responsible) ?? shaxsNomi(user) ?? "Biriktirilmagan";
  }

  function yaratganNomi(item: ChiqimHujjati) {
    const user = item.createdById ? xodimMap.get(item.createdById) : undefined;
    return shaxsNomi(item.createdBy) ?? shaxsNomi(user) ?? masulNomi(item);
  }

  function ozgartirganNomi(item: ChiqimHujjati) {
    const user = item.updatedById ? xodimMap.get(item.updatedById) : undefined;
    return shaxsNomi(item.updatedBy) ?? shaxsNomi(user) ?? (item.updatedAt ? masulNomi(item) : "—");
  }

  function sababNomi(item: ChiqimHujjati) {
    return chiqimSabablari[item.reason as keyof typeof chiqimSabablari] ?? item.reason ?? "—";
  }

  function hujjatSummasi(item: ChiqimHujjati) {
    const backendSummasi = item.totalAmount ?? item.total;
    if (backendSummasi !== undefined && backendSummasi !== null) return Number(backendSummasi);
    return (item.items ?? []).reduce((sum, row) => {
      const mod: MahsulotModifikatsiyasi | undefined =
        row.modification ?? modMap.get(row.modificationId);
      return sum + Number(row.quantity ?? 0) * Number(mod?.price?.costPrice ?? 0);
    }, 0);
  }

  const royxat = useMemo(() => {
    const query = qidiruv.trim().toLowerCase();
    if (!query) return store.chiqimlar;
    return store.chiqimlar.filter((item) =>
      [
        hujjatRaqami(item),
        omborNomi(item),
        sababNomi(item),
        masulNomi(item),
        yaratganNomi(item),
        ozgartirganNomi(item),
        sana(item.createdAt),
        sana(item.updatedAt),
        holat(item.status),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
    // Qidiruv real backend ma'lumotlari va maplarga bog'liq.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qidiruv, store.chiqimlar, omborMap, xodimMap]);

  async function bekorQilish() {
    if (!bekorSorash) return;
    if (await store.chiqimBekorQilish(bekorSorash.id)) setBekorSorash(null);
  }

  function ustunniAlmashtirish(id: Ustun) {
    setKorinadigan((old) => {
      const next = new Set(old);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else next.add(id);
      return next;
    });
  }

  function jadvalniSurish(direction: -1 | 1) {
    jadvalRef.current?.scrollBy({ left: direction * 420, behavior: "smooth" });
  }

  function ustunniTortishniBoshlash(event: React.PointerEvent, id: Ustun) {
    event.preventDefault();
    event.stopPropagation();
    const boshlanishX = event.clientX;
    const boshlanishKengligi = ustunKengliklari[id];
    const oldUserSelect = document.body.style.userSelect;
    const oldCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    const tortish = (pointerEvent: PointerEvent) => {
      const yangiKenglik = Math.max(120, boshlanishKengligi + pointerEvent.clientX - boshlanishX);
      setUstunKengliklari((old) => ({ ...old, [id]: Math.round(yangiKenglik) }));
    };
    const tugatish = () => {
      document.removeEventListener("pointermove", tortish);
      document.removeEventListener("pointerup", tugatish);
      document.body.style.userSelect = oldUserSelect;
      document.body.style.cursor = oldCursor;
    };
    document.addEventListener("pointermove", tortish);
    document.addEventListener("pointerup", tugatish);
  }

  function scrollTutqichiniTortishniBoshlash(event: React.PointerEvent) {
    event.preventDefault();
    event.stopPropagation();
    const jadval = jadvalRef.current;
    if (!jadval || scrollHolati.maxChap <= 0) return;
    const boshlanishX = event.clientX;
    const boshlanishScroll = jadval.scrollLeft;
    const oldUserSelect = document.body.style.userSelect;
    const oldCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";

    const tortish = (pointerEvent: PointerEvent) => {
      const trackDelta = pointerEvent.clientX - boshlanishX;
      jadval.scrollLeft = boshlanishScroll + trackDelta * (scrollHolati.maxScroll / scrollHolati.maxChap);
    };
    const tugatish = () => {
      document.removeEventListener("pointermove", tortish);
      document.removeEventListener("pointerup", tugatish);
      document.body.style.userSelect = oldUserSelect;
      document.body.style.cursor = oldCursor;
    };
    document.addEventListener("pointermove", tortish);
    document.addEventListener("pointerup", tugatish);
  }

  function scrollYoliniBosish(event: React.PointerEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    const jadval = jadvalRef.current;
    const yol = scrollYoliRef.current;
    if (!jadval || !yol || scrollHolati.maxScroll <= 0) return;
    const rect = yol.getBoundingClientRect();
    const thumbChap = Math.min(
      Math.max(0, event.clientX - rect.left - scrollHolati.kenglik / 2),
      scrollHolati.maxChap
    );
    jadval.scrollTo({ left: (thumbChap / scrollHolati.maxChap) * scrollHolati.maxScroll, behavior: "smooth" });
  }

  function katak(item: ChiqimHujjati, id: Ustun) {
    switch (id) {
      case "nomi":
        return <div><p className="font-black text-slate-950">Chiqim hujjati</p><p className="mt-0.5 text-xs font-black text-orange-500">{hujjatRaqami(item)}</p></div>;
      case "status":
        return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${statusSinfi(item.status)}`}>{holat(item.status)}</span>;
      case "yaratilgan":
        return <span className="whitespace-nowrap text-slate-500">{sana(item.createdAt)}</span>;
      case "ombor":
        return <span className="font-semibold text-slate-600">{omborNomi(item)}</span>;
      case "yaratgan":
        return <span className="font-semibold text-slate-600">{yaratganNomi(item)}</span>;
      case "ozgartirilgan":
        return <span className="whitespace-nowrap text-slate-500">{item.updatedAt ? sana(item.updatedAt) : "—"}</span>;
      case "ozgartirgan":
        return <span className="font-semibold text-slate-600">{ozgartirganNomi(item)}</span>;
      case "summa":
        return <span className="whitespace-nowrap font-black text-slate-700">{pul(hujjatSummasi(item))}</span>;
    }
  }

  const faolUstunlar = ustunlar.filter((item) => korinadigan.has(item.id));
  const jadvalKengligi = faolUstunlar.reduce((sum, item) => sum + ustunKengliklari[item.id], 0) + 80;

  useEffect(() => {
    const jadval = jadvalRef.current;
    const yol = scrollYoliRef.current;
    if (!jadval || !yol) return;

    const yangilash = () => {
      const maxScroll = Math.max(0, jadval.scrollWidth - jadval.clientWidth);
      const trackKengligi = yol.clientWidth;
      const kenglik = maxScroll === 0
        ? trackKengligi
        : Math.max(54, trackKengligi * (jadval.clientWidth / jadval.scrollWidth));
      const maxChap = Math.max(0, trackKengligi - kenglik);
      const chap = maxScroll === 0 ? 0 : (jadval.scrollLeft / maxScroll) * maxChap;
      setScrollHolati({ chap, kenglik, maxChap, maxScroll });
    };

    yangilash();
    jadval.addEventListener("scroll", yangilash, { passive: true });
    const observer = new ResizeObserver(yangilash);
    observer.observe(jadval);
    observer.observe(yol);
    return () => {
      jadval.removeEventListener("scroll", yangilash);
      observer.disconnect();
    };
  }, [jadvalKengligi, korinadigan, royxat.length]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">Chiqim</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">Ombordan tovar chiqim qilish hujjatlari.</p>
        </div>
        <button onClick={() => setModal(true)} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 text-sm font-black text-white shadow-[0_12px_28px_rgba(249,115,22,.24)] transition hover:-translate-y-0.5 hover:bg-orange-600">
          <Plus size={18} /> Yaratish
        </button>
      </header>

      <div className="relative w-full max-w-[480px]">
        <Search size={18} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={qidiruv} onChange={(event) => setQidiruv(event.target.value)} placeholder="Nomi, sabab, mas'ul shaxs, sana yoki holati bo'yicha" className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-13 pr-5 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100" />
      </div>

      {store.xatolik && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
          <span>{store.xatolik}</span><button onClick={store.xatolikniTozalash}>Yopish</button>
        </div>
      )}

      <div className="overflow-visible rounded-[26px] border border-orange-100 bg-white shadow-[0_4px_16px_rgba(92,50,16,.08)]">
        <div ref={jadvalRef} className="scrollbar-hidden overflow-x-auto rounded-t-[26px]">
          <table className="table-fixed text-left text-sm" style={{ width: jadvalKengligi, minWidth: "100%" }}>
            <colgroup>
              {faolUstunlar.map((column) => <col key={column.id} style={{ width: ustunKengliklari[column.id] }} />)}
              <col style={{ width: 80 }} />
            </colgroup>
            <thead className="bg-[#fff9f3] text-[11px] font-black uppercase tracking-wide text-orange-500">
              <tr>
                {faolUstunlar.map((column) => (
                  <th key={column.id} className="relative border-r border-orange-200/80 px-6 py-5">
                    <span className="block truncate">{column.nom}</span>
                    <button
                      type="button"
                      aria-label={`${column.nom} ustuni kengligini o'zgartirish`}
                      onPointerDown={(event) => ustunniTortishniBoshlash(event, column.id)}
                      className="absolute -right-1 top-0 z-20 h-full w-2 cursor-col-resize touch-none bg-transparent transition hover:bg-orange-300/60 active:bg-orange-400/70"
                    />
                  </th>
                ))}
                <th className="sticky right-0 z-10 w-20 min-w-20 bg-[#fff9f3] px-5 py-3">
                  <div ref={sozlamaRef} className="relative flex justify-end">
                    <button onClick={() => setSozlama((value) => !value)} aria-label="Ustunlarni sozlash" className="flex h-9 w-9 items-center justify-center rounded-xl text-orange-500 transition hover:bg-orange-100"><Settings size={17} /></button>
                    {sozlama && (
                      <div className="absolute right-0 top-11 z-30 w-64 rounded-2xl border border-orange-100 bg-white p-2 text-slate-600 shadow-2xl">
                        {ustunlar.map((column) => (
                          <label key={column.id} className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold hover:bg-orange-50">
                            <input type="checkbox" checked={korinadigan.has(column.id)} onChange={() => ustunniAlmashtirish(column.id)} className="accent-orange-500" />{column.nom}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-100">
              {store.yuklanmoqda ? (
                <tr><td colSpan={faolUstunlar.length + 1} className="py-20 text-center"><LoaderCircle className="mx-auto animate-spin text-orange-500" size={30} /></td></tr>
              ) : royxat.map((item) => {
                const status = String(item.status ?? "DRAFT").toUpperCase();
                return (
                  <tr key={item.id} onClick={() => setTanlanganId(item.id)} className="cursor-pointer transition hover:bg-orange-50/40">
                    {faolUstunlar.map((column) => <td key={column.id} className="overflow-hidden px-6 py-5">{katak(item, column.id)}</td>)}
                    <td className="sticky right-0 bg-white px-5 py-4 group-hover:bg-orange-50/40" onClick={(event) => event.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        {status === "DRAFT" && <button onClick={() => void store.chiqimTasdiqlash(item.id)} disabled={store.amalBajarilmoqda} title="Tasdiqlash" aria-label="Tasdiqlash" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-50"><CheckCircle2 size={18} /></button>}
                        {status === "CONFIRMED" && <button onClick={() => setBekorSorash(item)} title="Bekor qilish" aria-label="Bekor qilish" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-500 transition hover:bg-red-100"><Trash2 size={18} /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!store.yuklanmoqda && royxat.length === 0 && (
            <div className="p-14 text-center"><FileText className="mx-auto text-orange-200" size={42} /><p className="mt-3 font-bold text-slate-500">Chiqim hujjati topilmadi</p><p className="mt-1 text-sm text-slate-400">“Yaratish” tugmasi orqali yangi chiqim qo'shing.</p></div>
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-orange-100 px-5 py-4">
          <button type="button" onClick={() => jadvalniSurish(-1)} aria-label="Jadvalni chapga surish" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-orange-100 bg-white text-orange-500 shadow-sm transition hover:bg-orange-50"><ChevronLeft size={19} /></button>
          <div ref={scrollYoliRef} onPointerDown={scrollYoliniBosish} className="relative h-3 flex-1 cursor-pointer touch-none rounded-full bg-orange-50">
            <button
              type="button"
              aria-label="Jadvalni chap-o'ngga surish"
              onPointerDown={scrollTutqichiniTortishniBoshlash}
              className="absolute top-0 h-3 cursor-grab touch-none rounded-full bg-orange-500 shadow-[0_2px_8px_rgba(249,115,22,.28)] active:cursor-grabbing"
              style={{ left: scrollHolati.chap, width: scrollHolati.kenglik }}
            />
          </div>
          <button type="button" onClick={() => jadvalniSurish(1)} aria-label="Jadvalni o'ngga surish" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-orange-100 bg-white text-orange-500 shadow-sm transition hover:bg-orange-50"><ChevronRight size={19} /></button>
        </div>
      </div>

      {modal && <YangiChiqimModal onClose={() => setModal(false)} />}
      {tanlanganId && <ChiqimTafsilotModal id={tanlanganId} onClose={() => setTanlanganId(null)} />}
      {bekorSorash && (
        <AppModal>
          <div className="w-full max-w-sm rounded-[26px] bg-white p-6 shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500"><Ban size={22} /></div>
            <h3 className="mt-4 text-center text-lg font-black text-slate-950">Chiqimni bekor qilasizmi?</h3>
            <p className="mt-2 text-center text-sm text-slate-500">“{hujjatRaqami(bekorSorash)}” hujjati bekor qilinadi. Ombor qoldig'i backend orqali tiklanadi.</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setBekorSorash(null)} className="h-11 flex-1 rounded-2xl bg-slate-100 text-sm font-bold text-slate-600">Yopish</button>
              <button onClick={() => void bekorQilish()} disabled={store.amalBajarilmoqda} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-red-500 text-sm font-black text-white disabled:opacity-50">{store.amalBajarilmoqda && <LoaderCircle size={16} className="animate-spin" />}Ha, bekor qilish</button>
            </div>
          </div>
        </AppModal>
      )}
    </div>
  );
}
