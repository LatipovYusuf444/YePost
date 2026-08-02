import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  LoaderCircle,
  PackageMinus,
  RotateCcw,
  Settings,
  X,
} from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { useOmborStore } from "@/store/omborStore";
import type { ChiqimHujjati, ChiqimSababi, MahsulotModifikatsiyasi } from "@/types/ombor";
import { holat, hujjatRaqami, modificationNomi, pul, sana } from "./omborYordamchilari";
import InventoryDocumentActivity from "./InventoryDocumentActivity";

type Props = { id: string; onClose: () => void };

const sabablar: Record<ChiqimSababi, string> = {
  DAMAGE: "Shikastlangan",
  EXPIRY: "Muddati o'tgan",
  THEFT: "Yo'qolgan yoki o'g'irlangan",
  OTHER: "Boshqa",
};

function statusSinfi(status?: string) {
  const value = String(status ?? "DRAFT").toUpperCase();
  if (value === "CONFIRMED") return "bg-emerald-50 text-emerald-600";
  if (value === "CANCELLED" || value === "CANCELED") return "bg-red-50 text-red-500";
  return "bg-amber-50 text-amber-600";
}

export default function ChiqimTafsilotModal({ id, onClose }: Props) {
  const store = useOmborStore();
  const chiqimOlish = useOmborStore((state) => state.chiqimOlish);
  const xatolikniTozalash = useOmborStore((state) => state.xatolikniTozalash);
  const [hujjat, setHujjat] = useState<ChiqimHujjati | null>(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [bekorTasdiq, setBekorTasdiq] = useState(false);

  async function hujjatniYangilash() {
    const item = await chiqimOlish(id);
    setHujjat(item);
    return item;
  }

  useEffect(() => {
    let faol = true;
    async function yuklash() {
      setYuklanmoqda(true);
      xatolikniTozalash();
      const item = await chiqimOlish(id);
      if (!faol) return;
      setHujjat(item);
      setYuklanmoqda(false);
    }
    void yuklash();
    return () => { faol = false; };
  }, [chiqimOlish, id, xatolikniTozalash]);

  const status = String(hujjat?.status ?? "DRAFT").toUpperCase();
  const qoralama = status === "DRAFT";
  const tasdiqlangan = status === "CONFIRMED";

  const modMap = useMemo(
    () => new Map(store.modifikatsiyalar.map((item) => [item.id, item])),
    [store.modifikatsiyalar]
  );

  const qatorlar = useMemo(
    () => (hujjat?.items ?? []).map((item) => {
      const modification: MahsulotModifikatsiyasi | undefined =
        item.modification ?? modMap.get(item.modificationId);
      const quantity = Number(item.quantity ?? 0);
      const price = Number(modification?.price?.costPrice ?? 0);
      return { ...item, modification, quantity, price, summa: quantity * price };
    }),
    [hujjat?.items, modMap]
  );

  const jami = useMemo(() => {
    const backendSummasi = hujjat?.totalAmount ?? hujjat?.total;
    return backendSummasi !== undefined && backendSummasi !== null
      ? Number(backendSummasi)
      : qatorlar.reduce((sum, item) => sum + item.summa, 0);
  }, [hujjat?.total, hujjat?.totalAmount, qatorlar]);

  const omborNomi = hujjat?.warehouse?.name ??
    store.omborlar.find((item) => item.id === hujjat?.warehouseId)?.name ??
    hujjat?.warehouseId ?? "—";
  const masulNomi = hujjat?.responsible?.fullName ??
    hujjat?.responsible?.name ??
    hujjat?.responsible?.username ??
    store.xodimlar.find((item) => item.id === hujjat?.responsibleId)?.fullName ??
    store.xodimlar.find((item) => item.id === hujjat?.responsibleId)?.username ??
    "Biriktirilmagan";
  const sabab = hujjat
    ? sabablar[hujjat.reason as ChiqimSababi] ?? hujjat.reason ?? "—"
    : "—";

  async function tasdiqlash() {
    if (!hujjat || !qoralama) return;
    if (await store.chiqimTasdiqlash(id)) await hujjatniYangilash();
  }

  async function bekorQilish() {
    if (!hujjat || !tasdiqlangan) return;
    if (await store.chiqimBekorQilish(id)) {
      setBekorTasdiq(false);
      await hujjatniYangilash();
    }
  }

  return (
    <AppModal onClose={onClose} className="sidebar-aligned-document-modal items-stretch p-3 sm:p-5">
      <div className="relative flex min-h-0 w-full flex-col overflow-hidden rounded-[34px] border border-orange-100 bg-[#fff8ef] shadow-[0_28px_90px_rgba(69,35,13,.34)]">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-orange-100 bg-white/80 px-5 py-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <h2 className="truncate text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Chiqim hujjati {hujjat ? hujjatRaqami(hujjat) : ""}
            </h2>
            {hujjat && <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black uppercase ${statusSinfi(hujjat.status)}`}>{holat(hujjat.status)}</span>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {qoralama && <button type="button" onClick={() => void tasdiqlash()} disabled={store.amalBajarilmoqda} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white shadow-lg shadow-emerald-100 disabled:opacity-50"><CheckCircle2 size={18} />Tasdiqlash</button>}
            {tasdiqlangan && <button type="button" onClick={() => setBekorTasdiq(true)} disabled={store.amalBajarilmoqda} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-slate-700 px-5 text-sm font-black text-white shadow-lg disabled:opacity-50"><RotateCcw size={18} />Bekor qilish</button>}
            <button type="button" onClick={onClose} aria-label="Yopish" className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-orange-500"><X size={21} /></button>
          </div>
        </header>

        {yuklanmoqda ? (
          <div className="flex flex-1 items-center justify-center"><LoaderCircle size={36} className="animate-spin text-orange-500" /></div>
        ) : !hujjat ? (
          <div className="flex flex-1 items-center justify-center p-10 text-center font-bold text-slate-500">Chiqim hujjati ma'lumotlarini olib bo'lmadi.</div>
        ) : (
          <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8">
            {store.xatolik && <div className="mb-5 flex justify-between gap-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600"><span>{store.xatolik}</span><button type="button" onClick={store.xatolikniTozalash}>Yopish</button></div>}

            <div className="grid gap-5 xl:grid-cols-2">
              <section className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm">
                <SectionTitle icon={<PackageMinus size={18} />} text="Chiqim haqida" />
                <div className="rounded-[24px] bg-orange-50 px-7 py-10 sm:px-8">
                  <p className="text-sm font-black uppercase text-orange-600">Umumiy summa</p>
                  <p className="mt-2 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{pul(jami)}</p>
                </div>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <Info label="Sabab" value={sabab} className="sm:col-span-2" />
                  <Info label="Qachon chiqim qilingan" value={sana(hujjat.createdAt)} />
                  <Info label="Mas'ul shaxs" value={masulNomi} />
                  <Info label="Ombor" value={omborNomi} className="sm:col-span-2" />
                </div>
              </section>

              <InventoryDocumentActivity documentType="WRITE_OFF" documentId={hujjat.id}/>
            </div>

            <section className="mt-5 rounded-[26px] border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
              <SectionTitle icon={<PackageMinus size={18} />} text="Tovarlar" />
              <div className="overflow-x-auto rounded-[22px] border border-orange-100">
                <table className="w-full min-w-[960px] text-left text-sm">
                  <thead className="bg-[#fff9f3] text-[11px] font-black uppercase tracking-wide text-slate-500">
                    <tr><th className="px-4 py-4">№</th><th className="px-4 py-4">Mahsulot</th><th className="px-4 py-4">Shtrix kod</th><th className="px-4 py-4">Tan narxi</th><th className="px-4 py-4">Soni</th><th className="px-4 py-4">Ombor</th><th className="px-4 py-4">Summa</th><th className="w-14 px-4 py-4 text-right"><Settings size={16} className="ml-auto text-slate-400" /></th></tr>
                  </thead>
                  <tbody className="divide-y divide-orange-100">
                    {qatorlar.map((item, index) => (
                      <tr key={item.id ?? `${item.modificationId}-${index}`}>
                        <td className="px-4 py-4 font-bold text-slate-400">{index + 1}</td>
                        <td className="px-4 py-4 font-black text-slate-800">{modificationNomi(item.modification)}</td>
                        <td className="px-4 py-4 font-medium text-slate-500">{item.modification?.barcode || "—"}</td>
                        <td className="px-4 py-4 font-semibold text-slate-600">{pul(item.price)}</td>
                        <td className="px-4 py-4 font-semibold text-slate-700">{item.quantity.toLocaleString("uz-UZ")}</td>
                        <td className="px-4 py-4 text-slate-600">{omborNomi}</td>
                        <td className="px-4 py-4 font-black text-emerald-600">{pul(item.summa)}</td>
                        <td />
                      </tr>
                    ))}
                  </tbody>
                </table>
                {qatorlar.length === 0 && <div className="p-10 text-center text-sm font-bold text-slate-400">Hujjatda tovarlar mavjud emas.</div>}
              </div>
            </section>
          </div>
        )}

        {bekorTasdiq && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-[26px] bg-white p-6 shadow-2xl">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500"><RotateCcw size={21} /></div>
              <h3 className="mt-4 text-center text-lg font-black text-slate-950">Chiqimni bekor qilasizmi?</h3>
              <p className="mt-2 text-center text-sm text-slate-500">Tasdiqlangan hujjat bekor qilinadi va ombor qoldig'i backend orqali tiklanadi.</p>
              <div className="mt-6 flex gap-3"><button type="button" onClick={() => setBekorTasdiq(false)} className="h-11 flex-1 rounded-2xl bg-slate-100 text-sm font-bold text-slate-600">Yo'q</button><button type="button" onClick={() => void bekorQilish()} disabled={store.amalBajarilmoqda} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-red-500 text-sm font-black text-white disabled:opacity-50">{store.amalBajarilmoqda && <LoaderCircle size={16} className="animate-spin" />}Ha, bekor qilish</button></div>
            </div>
          </div>
        )}
      </div>
    </AppModal>
  );
}

function SectionTitle({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="mb-4 flex items-center gap-2 border-b border-orange-100 pb-4 text-sm font-black uppercase tracking-wide text-slate-600"><span className="text-orange-500">{icon}</span>{text}</div>;
}

function Info({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return <div className={className}><p className="text-sm font-bold text-slate-400">{label}</p><p className="mt-1 font-black text-slate-800">{value}</p></div>;
}
