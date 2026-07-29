import AppSelect from "@/Components/ui/AppSelect";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock, LogIn, LogOut, Save, TriangleAlert, UserCheck } from "lucide-react";
import KengaytiriladiganJadval, { type Ustun } from "../HisobotUchot/KengaytiriladiganJadval";
import { davomatApi } from "@/api/hrApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { Attendance, AttendanceStatus } from "@/types/hr";
import type { Davomat as DavomatYozuvi, DavomatHolati, Xodim } from "./types";
import { davomatMatni, davomatRangi, ishSoati, maydonKlass, sanaFormat, xodimNomi } from "./yordamchilar";

type Props = { xodimlar: Xodim[] };
const holatlar: Array<DavomatHolati | "barchasi"> = ["barchasi", "keldi", "kechikdi", "kelmadi", "tatil"];
const statusMap: Record<AttendanceStatus, DavomatHolati> = {
  PRESENT: "keldi",
  LATE: "kechikdi",
  ABSENT: "kelmadi",
  LEAVE: "tatil",
};
const reverseStatus: Record<DavomatHolati, AttendanceStatus> = {
  keldi: "PRESENT",
  kechikdi: "LATE",
  kelmadi: "ABSENT",
  tatil: "LEAVE",
};

function sanaMinus(kun: number) {
  const sana = new Date();
  sana.setDate(sana.getDate() - kun);
  return sana.toISOString().slice(0, 10);
}
function vaqt(value?: string | null) {
  return value ? new Date(value).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit", hour12: false }) : "";
}
function uiYozuv(row: Attendance): DavomatYozuvi {
  return {
    id: row.id,
    xodimId: row.userId,
    sana: row.date.slice(0, 10),
    kelgan: vaqt(row.checkIn),
    ketgan: vaqt(row.checkOut),
    holat: statusMap[row.status],
    izoh: row.note ?? "",
  };
}
function iso(sana: string, vaqtQiymati: string) {
  return vaqtQiymati ? new Date(`${sana}T${vaqtQiymati}:00`).toISOString() : undefined;
}

export default function Davomat({ xodimlar }: Props) {
  const [sanadan, setSanadan] = useState(sanaMinus(13));
  const [sanagacha, setSanagacha] = useState(sanaMinus(0));
  const [xodimId, setXodimId] = useState("");
  const [holat, setHolat] = useState<DavomatHolati | "barchasi">("barchasi");
  const [royxat, setRoyxat] = useState<DavomatYozuvi[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [xato, setXato] = useState("");
  const [lateThreshold, setLateThreshold] = useState("09:00");
  const [tahrirId, setTahrirId] = useState("");
  const [formaXodim, setFormaXodim] = useState("");
  const [formaSana, setFormaSana] = useState(sanaMinus(0));
  const [formaHolat, setFormaHolat] = useState<DavomatHolati>("keldi");
  const [formaKelgan, setFormaKelgan] = useState("09:00");
  const [formaKetgan, setFormaKetgan] = useState("");
  const [formaIzoh, setFormaIzoh] = useState("");

  const yuklash = useCallback(async () => {
    setYuklanmoqda(true);
    setXato("");
    try {
      const [items, settings] = await Promise.all([
        davomatApi.royxat({
          userId: xodimId || undefined,
          dateFrom: sanadan || undefined,
          dateTo: sanagacha || undefined,
        }),
        davomatApi.sozlama(),
      ]);
      const mapped = items.map(uiYozuv);
      setRoyxat(
        holat === "barchasi"
          ? mapped
          : mapped.filter((item) => item.holat === holat)
      );
      setLateThreshold(settings.lateThreshold);
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setYuklanmoqda(false);
    }
  }, [holat, sanadan, sanagacha, xodimId]);

  useEffect(() => { void yuklash(); }, [yuklash]);

  const statistika = useMemo(() => {
    const soatlar = royxat.reduce((sum, yozuv) => sum + ishSoati(yozuv.kelgan, yozuv.ketgan), 0);
    return {
      keldi: royxat.filter((yozuv) => yozuv.holat === "keldi").length,
      kechikdi: royxat.filter((yozuv) => yozuv.holat === "kechikdi").length,
      kelmadi: royxat.filter((yozuv) => yozuv.holat === "kelmadi").length,
      soat: Math.round(soatlar * 10) / 10,
    };
  }, [royxat]);
  const nomOlish = (id: string) => {
    const xodim = xodimlar.find((item) => item.id === id);
    return xodim ? xodimNomi(xodim) : "вЂ”";
  };

  async function selfAction(action: "in" | "out") {
    setXato("");
    try {
      if (action === "in") await davomatApi.clockIn();
      else await davomatApi.clockOut();
      await yuklash();
    } catch (error) { setXato(getApiErrorMessage(error)); }
  }
  async function sozlamaSaqlash() {
    try { await davomatApi.sozlamaYangilash(lateThreshold); await yuklash(); }
    catch (error) { setXato(getApiErrorMessage(error)); }
  }
  async function yozuvSaqlash() {
    if (!formaXodim) { setXato("Xodimni tanlang."); return; }
    const payload = {
      userId: formaXodim,
      date: formaSana,
      status: reverseStatus[formaHolat],
      checkIn: iso(formaSana, formaKelgan),
      checkOut: iso(formaSana, formaKetgan),
      note: formaIzoh || undefined,
    };
    try {
      if (tahrirId) await davomatApi.yangilash(tahrirId, payload);
      else await davomatApi.yaratish(payload);
      setTahrirId(""); setFormaXodim(""); setFormaIzoh(""); setFormaKetgan("");
      await yuklash();
    } catch (error) { setXato(getApiErrorMessage(error)); }
  }
  function tahrirlash(row: DavomatYozuvi) {
    setTahrirId(row.id); setFormaXodim(row.xodimId); setFormaSana(row.sana);
    setFormaHolat(row.holat); setFormaKelgan(row.kelgan || "09:00");
    setFormaKetgan(row.ketgan); setFormaIzoh(row.izoh);
  }
  async function ochirish(row: DavomatYozuvi) {
    if (!window.confirm("Davomat yozuvini oвЂchirasizmi?")) return;
    try { await davomatApi.ochirish(row.id); await yuklash(); }
    catch (error) { setXato(getApiErrorMessage(error)); }
  }

  const ustunlar: Ustun<DavomatYozuvi>[] = [
    { id: "xodim", nom: "Xodim", kenglik: 190, katak: (d) => <span className="font-black text-slate-900">{nomOlish(d.xodimId)}</span> },
    { id: "sana", nom: "Sana", kenglik: 130, katak: (d) => <span className="text-slate-500">{sanaFormat(d.sana)}</span> },
    { id: "holat", nom: "Holat", kenglik: 130, katak: (d) => <span className={`rounded-lg px-2.5 py-1 text-xs font-black ${davomatRangi[d.holat]}`}>{davomatMatni[d.holat]}</span> },
    { id: "kelgan", nom: "Kelgan", kenglik: 110, katak: (d) => d.kelgan || "вЂ”" },
    { id: "ketgan", nom: "Ketgan", kenglik: 110, katak: (d) => d.ketgan || "вЂ”" },
    { id: "soat", nom: "Ish soati", kenglik: 110, hizalash: "right", katak: (d) => ishSoati(d.kelgan, d.ketgan) || "вЂ”", jami: () => statistika.soat },
    { id: "izoh", nom: "Izoh", kenglik: 170, katak: (d) => d.izoh || "вЂ”" },
  ];

  return <div className="space-y-5">
    <header>
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">Xodim uchoti</p>
      <h1 className="mt-1 text-3xl font-black text-gray-950">Davomat</h1>
      <p className="mt-1 text-sm text-gray-500">Kelish-ketish vaqti va ish soatlari real backend orqali boshqariladi.</p>
    </header>
    {xato && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}

    <section className="flex flex-wrap items-end gap-3 rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
      <button onClick={() => void selfAction("in")} className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-500 px-4 font-black text-white"><LogIn size={17}/>Keldim</button>
      <button onClick={() => void selfAction("out")} className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange-500 px-4 font-black text-white"><LogOut size={17}/>Ketdim</button>
      <label className="ml-auto grid gap-1 text-sm font-bold text-slate-500">Kechikish chegarasi
        <span className="flex gap-2"><input type="time" value={lateThreshold} onChange={(e) => setLateThreshold(e.target.value)} className={maydonKlass}/><button onClick={() => void sozlamaSaqlash()} className="rounded-xl border border-orange-200 px-4 text-orange-600"><Save size={17}/></button></span>
      </label>
    </section>

    <section className="grid gap-3 rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
      <label className="grid gap-2 text-sm font-bold text-slate-400"><span><CalendarDays size={14} className="inline text-orange-500"/> Muddat</span><span className="flex gap-2"><input type="date" value={sanadan} onChange={(e) => setSanadan(e.target.value)} className={maydonKlass}/><input type="date" value={sanagacha} onChange={(e) => setSanagacha(e.target.value)} className={maydonKlass}/></span></label>
      <label className="grid gap-2 text-sm font-bold text-slate-400">Xodim<AppSelect value={xodimId} onChange={(e) => setXodimId(e.target.value)} className={maydonKlass}><option value="">Barcha xodimlar</option>{xodimlar.map((x) => <option key={x.id} value={x.id}>{xodimNomi(x)}</option>)}</AppSelect></label>
      <label className="grid gap-2 text-sm font-bold text-slate-400">Holat<AppSelect value={holat} onChange={(e) => setHolat(e.target.value as DavomatHolati | "barchasi")} className={maydonKlass}>{holatlar.map((item) => <option key={item} value={item}>{item === "barchasi" ? "Barchasi" : davomatMatni[item]}</option>)}</AppSelect></label>
    </section>

    <section className="grid gap-3 rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
      <AppSelect value={formaXodim} onChange={(e) => setFormaXodim(e.target.value)} className={maydonKlass}><option value="">Xodimni tanlang</option>{xodimlar.map((x) => <option key={x.id} value={x.id}>{xodimNomi(x)}</option>)}</AppSelect>
      <input type="date" value={formaSana} onChange={(e) => setFormaSana(e.target.value)} className={maydonKlass}/>
      <AppSelect value={formaHolat} onChange={(e) => setFormaHolat(e.target.value as DavomatHolati)} className={maydonKlass}>{holatlar.filter((x) => x !== "barchasi").map((item) => <option key={item} value={item}>{davomatMatni[item]}</option>)}</AppSelect>
      <span className="flex gap-2"><input type="time" value={formaKelgan} onChange={(e) => setFormaKelgan(e.target.value)} className={maydonKlass}/><input type="time" value={formaKetgan} onChange={(e) => setFormaKetgan(e.target.value)} className={maydonKlass}/></span>
      <input value={formaIzoh} onChange={(e) => setFormaIzoh(e.target.value)} placeholder="Izoh" className={maydonKlass}/>
      <button onClick={() => void yozuvSaqlash()} className="h-11 rounded-xl bg-orange-500 px-4 font-black text-white">{tahrirId ? "Yangilash" : "QoвЂlda kiritish"}</button>
    </section>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Karta ikonka={<UserCheck size={18}/>} nom="Keldi" qiymat={`${statistika.keldi} kun`} rang="text-emerald-600 bg-emerald-50"/>
      <Karta ikonka={<Clock size={18}/>} nom="Kechikdi" qiymat={`${statistika.kechikdi} kun`} rang="text-orange-600 bg-orange-50"/>
      <Karta ikonka={<TriangleAlert size={18}/>} nom="Kelmadi" qiymat={`${statistika.kelmadi} kun`} rang="text-red-500 bg-red-50"/>
      <Karta ikonka={<Clock size={18}/>} nom="Jami ish soati" qiymat={`${statistika.soat} soat`} rang="text-sky-600 bg-sky-50"/>
    </section>
    {yuklanmoqda ? <p className="rounded-2xl bg-white p-10 text-center font-bold text-gray-400">Backenddan yuklanmoqda...</p> : royxat.length ? <KengaytiriladiganJadval ustunlar={ustunlar} qatorlar={royxat} kengaytir sozlamaBor jamiBor onQatorBosildi={tahrirlash} onQatorOchirish={ochirish}/> : <p className="rounded-2xl border border-dashed border-orange-200 bg-white p-14 text-center font-bold text-gray-400">Tanlangan filter boвЂyicha davomat yozuvi yoвЂq</p>}
  </div>;
}

function Karta({ ikonka, nom, qiymat, rang }: { ikonka: React.ReactNode; nom: string; qiymat: string; rang: string }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-white p-5 shadow-sm"><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${rang}`}>{ikonka}</span><div><p className="text-xs font-black uppercase tracking-wide text-slate-400">{nom}</p><p className="text-xl font-black text-slate-900">{qiymat}</p></div></div>;
}

