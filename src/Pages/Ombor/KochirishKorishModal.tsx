import AppSelect from "@/Components/ui/AppSelect";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Ban,
  Edit3,
  FileText,
  LoaderCircle,
  PackageCheck,
  Printer,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { useOmborStore } from "@/store/omborStore";
import type { KochirishHujjati, MahsulotModifikatsiyasi, NomliEntity } from "@/types/ombor";
import { holat, hujjatRaqami, modificationNomi, pul, qoldiqMiqdori } from "./omborYordamchilari";
import InventoryDocumentActivity from "./InventoryDocumentActivity";

type Props = { id: string; onClose: () => void };
type TahrirQatori = { modificationId: string; quantity: number };
type KengaytirilganItem = NonNullable<KochirishHujjati["items"]>[number] & {
  price?: number | string;
  unitPrice?: number | string;
  costPrice?: number | string;
  unit?: string;
};

function status(hujjat?: KochirishHujjati | null) {
  return String(hujjat?.status ?? "DRAFT").toUpperCase();
}

function shaxsNomi(shaxs?: NomliEntity) {
  return shaxs?.fullName || shaxs?.name || shaxs?.username || "—";
}

function sana(value?: string, vaqt = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(vaqt ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

function narxniOlish(item: KengaytirilganItem, mod?: MahsulotModifikatsiyasi) {
  const qiymat =
    item.unitPrice ??
    item.price ??
    item.costPrice ??
    mod?.price?.retailPrice ??
    mod?.price?.costPrice ??
    mod?.price?.wholesalePrice ??
    0;
  const narx = Number(qiymat);
  return Number.isFinite(narx) ? narx : 0;
}

function statusKlasi(value: string) {
  if (["RECEIVED", "CONFIRMED"].includes(value)) return "bg-emerald-50 text-emerald-600";
  if (value === "SENT") return "bg-sky-50 text-sky-600";
  if (["CANCELLED", "CANCELED"].includes(value)) return "bg-red-50 text-red-500";
  return "bg-amber-50 text-amber-600";
}

export default function KochirishKorishModal({ id, onClose }: Props) {
  const store = useOmborStore();
  const [hujjat, setHujjat] = useState<KochirishHujjati | null>(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [tahrir, setTahrir] = useState(false);
  const [sourceWarehouseId, setSource] = useState("");
  const [destWarehouseId, setDest] = useState("");
  const [responsibleId, setResponsible] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<TahrirQatori[]>([]);
  const [xato, setXato] = useState("");

  async function hujjatniYuklash() {
    setYuklanmoqda(true);
    store.xatolikniTozalash();
    const item = await store.kochirishOlish(id);
    setHujjat(item);
    setYuklanmoqda(false);
  }

  useEffect(() => {
    void hujjatniYuklash();
    // id o'zgargandagina yangi hujjat yuklanadi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    function tugma(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", tugma);
    return () => window.removeEventListener("keydown", tugma);
  }, [onClose]);

  const toliqItems = useMemo(
    () =>
      (hujjat?.items ?? []).map((item) => ({
        item: item as KengaytirilganItem,
        mod:
          item.modification ??
          store.modifikatsiyalar.find((modification) => modification.id === item.modificationId),
      })),
    [hujjat?.items, store.modifikatsiyalar]
  );

  const jami = useMemo(() => {
    const backend = Number(hujjat?.totalAmount ?? hujjat?.total);
    if (Number.isFinite(backend) && (hujjat?.totalAmount != null || hujjat?.total != null)) return backend;
    return toliqItems.reduce(
      (summa, { item, mod }) => summa + Number(item.quantity || 0) * narxniOlish(item, mod),
      0
    );
  }, [hujjat?.total, hujjat?.totalAmount, toliqItems]);

  const manbaNomi =
    hujjat?.sourceWarehouse?.name ??
    store.omborlar.find((ombor) => ombor.id === hujjat?.sourceWarehouseId)?.name ??
    "Noma'lum ombor";
  const qabulNomi =
    hujjat?.destWarehouse?.name ??
    store.omborlar.find((ombor) => ombor.id === hujjat?.destWarehouseId)?.name ??
    "Noma'lum ombor";
  const masulObyekti = hujjat?.responsible ?? hujjat?.createdBy;
  const masulRoyxatdan = store.xodimlar.find(
    (xodim) =>
      xodim.id === hujjat?.responsibleId ||
      xodim.id === hujjat?.createdById ||
      xodim.id === masulObyekti?.id
  );
  const masulNomi =
    shaxsNomi(masulObyekti) !== "—"
      ? shaxsNomi(masulObyekti)
      : shaxsNomi(masulRoyxatdan);
  const joriyStatus = status(hujjat);

  async function amalBajarish(amal: "send" | "receive" | "cancel") {
    setXato("");
    const ok =
      amal === "send"
        ? await store.kochirishJonatish(id)
        : amal === "receive"
          ? await store.kochirishQabulQilish(id)
          : await store.kochirishBekorQilish(id);
    if (!ok) return;
    await hujjatniYuklash();
  }

  async function tahrirlashniOchish() {
    if (!hujjat) return;
    setSource(hujjat.sourceWarehouseId);
    setDest(hujjat.destWarehouseId);
    setResponsible(hujjat.responsibleId ?? "");
    setNote(hujjat.note ?? "");
    setItems((hujjat.items ?? []).map((item) => ({
      modificationId: item.modificationId,
      quantity: Number(item.quantity),
    })));
    setXato("");
    setTahrir(true);
    await store.qoldiqlarniYuklash(hujjat.sourceWarehouseId);
  }

  async function manbaniAlmashtirish(value: string) {
    setSource(value);
    setDest((oldingi) => (oldingi === value ? "" : oldingi));
    setItems([]);
    if (value) await store.qoldiqlarniYuklash(value);
  }

  async function saqlash() {
    const tozaItems = items.filter((item) => item.modificationId && item.quantity > 0);
    if (!sourceWarehouseId || !destWarehouseId || sourceWarehouseId === destWarehouseId) {
      setXato("Manba va qabul qiluvchi omborlarni to'g'ri tanlang.");
      return;
    }
    if (!tozaItems.length || tozaItems.length !== items.length) {
      setXato("Mahsulot va miqdorlarni to'liq kiriting.");
      return;
    }
    const ortiqcha = tozaItems.some((item) => {
      const qoldiq = store.qoldiqlar.find((qator) => qator.modificationId === item.modificationId);
      const avvalgi = hujjat?.items?.find((qator) => qator.modificationId === item.modificationId);
      return qoldiq && item.quantity > qoldiqMiqdori(qoldiq) + Number(avvalgi?.quantity ?? 0);
    });
    if (ortiqcha) {
      setXato("Miqdor manba ombordagi mavjud qoldiqdan oshib ketdi.");
      return;
    }
    const ok = await store.kochirishYangilash(id, {
      sourceWarehouseId,
      destWarehouseId,
      responsibleId: responsibleId || undefined,
      note: note.trim() || undefined,
      items: tozaItems,
    });
    if (!ok) return;
    setTahrir(false);
    await hujjatniYuklash();
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

        <div className="h-full overflow-hidden rounded-l-[44px] rounded-r-[36px] border border-orange-100 bg-gradient-to-br from-[#FFF9F2] via-[#FFFDF9] to-[#FFE8D2] shadow-[0_35px_110px_rgba(43,22,12,.42)]">
          <header className="sticky top-0 z-20 flex min-h-[92px] items-center justify-between gap-4 border-b border-orange-100 bg-[#FFF9F2]/95 px-8 py-4 backdrop-blur-xl">
            <div className="flex min-w-0 flex-wrap items-center gap-4">
              <h2 className="truncate text-3xl font-black tracking-tight text-slate-950 sm:text-[36px]">
                Ko'chirma hujjati #{hujjat ? hujjatRaqami(hujjat) : "..."}
              </h2>
              {hujjat && <span className={`rounded-full px-4 py-1.5 text-xs font-black uppercase ${statusKlasi(joriyStatus)}`}>{holat(joriyStatus)}</span>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {hujjat && joriyStatus === "DRAFT" && !tahrir && (
                <>
                  <button type="button" onClick={() => void tahrirlashniOchish()} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-4 font-black text-slate-700 shadow-sm ring-1 ring-slate-200">
                    <Edit3 size={17} /> Tahrirlash
                  </button>
                  <button type="button" onClick={() => void amalBajarish("send")} disabled={store.amalBajarilmoqda} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#FF5A00] px-5 font-black text-white disabled:opacity-50">
                    <Send size={17} /> Jo'natish
                  </button>
                  <button type="button" onClick={() => void amalBajarish("cancel")} disabled={store.amalBajarilmoqda} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-slate-700 px-5 font-black text-white disabled:opacity-50">
                    <Ban size={17} /> Bekor qilish
                  </button>
                </>
              )}
              {hujjat && joriyStatus === "SENT" && (
                <button type="button" onClick={() => void amalBajarish("receive")} disabled={store.amalBajarilmoqda} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-emerald-500 px-5 font-black text-white disabled:opacity-50">
                  <PackageCheck size={18} /> Qabul qilish
                </button>
              )}
            </div>
          </header>

          <div className="scrollbar-hidden h-[calc(100%-92px)] overflow-y-auto p-6 sm:p-8">
            {yuklanmoqda ? (
              <div className="flex h-full items-center justify-center"><LoaderCircle className="animate-spin text-orange-500" size={36} /></div>
            ) : !hujjat ? (
              <div className="flex h-full items-center justify-center text-lg font-bold text-slate-500">Hujjat ma'lumotlarini olib bo'lmadi.</div>
            ) : tahrir ? (
              <section className="mx-auto max-w-5xl rounded-[28px] border border-orange-100 bg-white p-6 shadow-sm">
                <h3 className="border-b border-orange-100 pb-4 text-lg font-black text-slate-700">Ko'chirmani tahrirlash</h3>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <AppSelect value={sourceWarehouseId} onChange={(event) => void manbaniAlmashtirish(event.target.value)} className="input"><option value="">Ombordan *</option>{store.omborlar.map((ombor) => <option key={ombor.id} value={ombor.id}>{ombor.name}</option>)}</AppSelect>
                  <AppSelect value={destWarehouseId} onChange={(event) => setDest(event.target.value)} className="input"><option value="">Omborga *</option>{store.omborlar.filter((ombor) => ombor.id !== sourceWarehouseId).map((ombor) => <option key={ombor.id} value={ombor.id}>{ombor.name}</option>)}</AppSelect>
                  <AppSelect value={responsibleId} onChange={(event) => setResponsible(event.target.value)} className="input"><option value="">Mas'ul shaxs</option>{store.xodimlar.map((xodim) => <option key={xodim.id} value={xodim.id}>{shaxsNomi(xodim)}</option>)}</AppSelect>
                </div>
                <div className="mt-5 space-y-3">
                  {items.map((item, index) => (
                    <div key={`${item.modificationId}-${index}`} className="grid gap-3 rounded-2xl bg-orange-50/60 p-3 md:grid-cols-[1fr_160px_44px]">
                      <AppSelect value={item.modificationId} onChange={(event) => setItems((oldingi) => oldingi.map((qator, i) => i === index ? { ...qator, modificationId: event.target.value } : qator))} className="input"><option value="">Mahsulot *</option>{store.qoldiqlar.map((qoldiq) => <option key={`${qoldiq.modificationId}-${qoldiq.id ?? "q"}`} value={qoldiq.modificationId}>{modificationNomi(qoldiq.modification)} — {qoldiqMiqdori(qoldiq)}</option>)}</AppSelect>
                      <input type="number" min="0.001" step="0.001" value={item.quantity} onChange={(event) => setItems((oldingi) => oldingi.map((qator, i) => i === index ? { ...qator, quantity: Number(event.target.value) } : qator))} className="input" />
                      <button type="button" disabled={items.length === 1} onClick={() => setItems((oldingi) => oldingi.filter((_, i) => i !== index))} className="flex h-12 items-center justify-center rounded-2xl bg-red-50 text-red-500 disabled:opacity-30"><Trash2 size={17} /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setItems((oldingi) => [...oldingi, { modificationId: "", quantity: 1 }])} className="rounded-xl bg-orange-50 px-4 py-2.5 text-sm font-black text-orange-600">+ Mahsulot qo'shish</button>
                </div>
                <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="mt-5 w-full rounded-2xl border border-slate-200 p-4 outline-none focus:border-orange-300" placeholder="Izoh" />
                {(xato || store.xatolik) && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">{xato || store.xatolik}</p>}
                <div className="mt-6 flex justify-end gap-3">
                  <button type="button" onClick={() => setTahrir(false)} className="h-12 rounded-2xl bg-slate-100 px-6 font-black text-slate-600">Bekor qilish</button>
                  <button type="button" onClick={() => void saqlash()} disabled={store.amalBajarilmoqda} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#FF5A00] px-6 font-black text-white disabled:opacity-50"><Save size={17} /> Saqlash</button>
                </div>
              </section>
            ) : (
              <>
                {(store.xatolik || xato) && <div className="mb-5 rounded-2xl bg-red-50 p-4 font-bold text-red-600">{xato || store.xatolik}</div>}
                <div className="grid gap-6 xl:grid-cols-2">
                  <section className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
                    <h3 className="border-b border-orange-100 pb-4 text-base font-black uppercase text-slate-600">Ko'chirma haqida</h3>
                    <div className="mt-5 flex min-h-48 flex-col justify-center rounded-[24px] bg-gradient-to-br from-[#FFF3E2] to-[#FFE4C7] p-8">
                      <p className="text-sm font-black uppercase tracking-wide text-[#F05A16]">Umumiy summa</p>
                      <p className="mt-2 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{pul(jami)}</p>
                    </div>
                    <div className="mt-5">
                      <p className="text-sm font-bold text-slate-400">Yo'nalish</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 font-black">
                        <span className="rounded-xl bg-orange-50 px-3 py-2 text-orange-600">{manbaNomi}</span>
                        <ArrowRight size={18} className="text-slate-400" />
                        <span className="rounded-xl bg-emerald-50 px-3 py-2 text-emerald-600">{qabulNomi}</span>
                      </div>
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-5 border-t border-orange-100 pt-5">
                      <div><p className="text-sm font-bold text-slate-400">Qachon ko'chirilgan</p><p className="mt-1 text-lg font-black text-slate-800">{sana(hujjat.createdAt)}</p></div>
                      <div><p className="text-sm font-bold text-slate-400">Mas'ul shaxs</p><p className="mt-1 text-lg font-black text-slate-800">{masulNomi}</p></div>
                    </div>
                  </section>

                  <InventoryDocumentActivity documentType="TRANSFER" documentId={hujjat.id}/>
                </div>

                <section className="mt-6 rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-center gap-2 border-b border-orange-100 pb-4"><FileText size={18} className="text-[#FF5A00]" /><h3 className="font-black uppercase text-slate-600">Tovarlar</h3></div>
                  <div className="mt-5 overflow-x-auto rounded-2xl border border-orange-100">
                    <table className="w-full min-w-[900px] text-left text-sm">
                      <thead className="bg-[#FFF9F3] text-xs font-black uppercase text-slate-500"><tr><th className="px-4 py-4">в„–</th><th className="px-4 py-4">Mahsulot</th><th className="px-4 py-4">Shtrix kod</th><th className="px-4 py-4">Narxi</th><th className="px-4 py-4">Soni</th><th className="px-4 py-4">Summa</th></tr></thead>
                      <tbody className="divide-y divide-orange-100">{toliqItems.map(({ item, mod }, index) => { const narx = narxniOlish(item, mod); return <tr key={item.id ?? `${item.modificationId}-${index}`}><td className="px-4 py-4 font-bold text-slate-400">{index + 1}</td><td className="px-4 py-4 font-black text-slate-800">{modificationNomi(mod)}</td><td className="px-4 py-4 text-slate-500">{mod?.barcode ?? "—"}</td><td className="px-4 py-4">{pul(narx)}</td><td className="px-4 py-4">{item.quantity} {item.unit ?? "dona"}</td><td className="px-4 py-4 font-black text-emerald-600">{pul(Number(item.quantity) * narx)}</td></tr>; })}{!toliqItems.length && <tr><td colSpan={6} className="px-5 py-12 text-center font-bold text-slate-400">Mahsulotlar mavjud emas</td></tr>}</tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </AppModal>
  );
}
