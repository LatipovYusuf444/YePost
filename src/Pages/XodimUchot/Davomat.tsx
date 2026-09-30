import AppSelect from "@/Components/ui/AppSelect";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronDown, Clock, LogIn, LogOut, PencilLine, Plus, RotateCcw, Save, Timer, Trash2, TriangleAlert, UserCheck } from "lucide-react";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/Components/ui/table";
import TablePagination from "@/Components/common/TablePagination";
import { davomatApi } from "@/api/hrApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { Attendance, AttendanceStatus } from "@/types/hr";
import type { Davomat as DavomatYozuvi, DavomatHolati, Xodim } from "./types";
import { davomatMatni, davomatRangi, ishSoati, maydonKlass, sanaFormat, xodimNomi } from "./yordamchilar";
import YuklanmoqdaHolati from "../HisobotUchot/YuklanmoqdaHolati";
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
  const [barchaRoyxat, setBarchaRoyxat] = useState<DavomatYozuvi[]>([]);
  const [serverNomlari, setServerNomlari] = useState<Record<string, string>>({});
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [boshYuklanmoqda, setBoshYuklanmoqda] = useState(true);
  const [formaOchiq, setFormaOchiq] = useState(false);
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
      setBarchaRoyxat(items.map(uiYozuv));
      setServerNomlari(
        Object.fromEntries(items.filter((row) => row.user?.fullName).map((row) => [row.userId, row.user?.fullName as string]))
      );
      setLateThreshold(settings.lateThreshold);
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setYuklanmoqda(false);
      setBoshYuklanmoqda(false);
    }
  }, [sanadan, sanagacha, xodimId]);

  useEffect(() => { void yuklash(); }, [yuklash]);

  // Holat bo'yicha filtr backendda yo'q — ro'yxat kelgach shu yerda saralanadi.
  const royxat = useMemo(
    () => (holat === "barchasi" ? barchaRoyxat : barchaRoyxat.filter((item) => item.holat === holat)),
    [barchaRoyxat, holat]
  );
  const korinadiganSoat = useMemo(
    () => Math.round(royxat.reduce((sum, y) => sum + ishSoati(y.kelgan, y.ketgan), 0) * 10) / 10,
    [royxat]
  );

  const statistika = useMemo(() => {
    const soatlar = barchaRoyxat.reduce((sum, yozuv) => sum + ishSoati(yozuv.kelgan, yozuv.ketgan), 0);
    return {
      keldi: barchaRoyxat.filter((yozuv) => yozuv.holat === "keldi").length,
      kechikdi: barchaRoyxat.filter((yozuv) => yozuv.holat === "kechikdi").length,
      kelmadi: barchaRoyxat.filter((yozuv) => yozuv.holat === "kelmadi").length,
      soat: Math.round(soatlar * 10) / 10,
    };
  }, [barchaRoyxat]);
  const nomOlish = (id: string) => {
    const xodim = xodimlar.find((item) => item.id === id);
    return xodim ? xodimNomi(xodim) : serverNomlari[id] || "—";
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
      setTahrirId(""); setFormaXodim(""); setFormaIzoh(""); setFormaKetgan(""); setFormaOchiq(false);
      await yuklash();
    } catch (error) { setXato(getApiErrorMessage(error)); }
  }
  function tahrirlash(row: DavomatYozuvi) {
    setTahrirId(row.id); setFormaXodim(row.xodimId); setFormaSana(row.sana);
    setFormaHolat(row.holat); setFormaKelgan(row.kelgan || "09:00");
    setFormaKetgan(row.ketgan); setFormaIzoh(row.izoh);
    setFormaOchiq(true);
  }
  async function ochirish(row: DavomatYozuvi) {
    if (!window.confirm("Davomat yozuvini o'chirasizmi?")) return;
    try { await davomatApi.ochirish(row.id); await yuklash(); }
    catch (error) { setXato(getApiErrorMessage(error)); }
  }

  const filtrOzgargan = holat !== "barchasi" || xodimId !== "" || sanadan !== sanaMinus(13) || sanagacha !== sanaMinus(0);

  function filtrTozalash() {
    setHolat("barchasi");
    setXodimId("");
    setSanadan(sanaMinus(13));
    setSanagacha(sanaMinus(0));
  }

  function formaniYopish() {
    setTahrirId("");
    setFormaXodim("");
    setFormaIzoh("");
    setFormaKetgan("");
    setFormaKelgan("09:00");
    setFormaHolat("keldi");
    setFormaSana(sanaMinus(0));
    setFormaOchiq(false);
  }

  const [sahifa, setSahifa] = useState(1);
  const [sahifaHajmi, setSahifaHajmi] = useState(10);
  useEffect(() => { setSahifa(1); }, [royxat]);
  const sahifadagi = royxat.slice((sahifa - 1) * sahifaHajmi, sahifa * sahifaHajmi);
  const jamiSoni = royxat.length;
  const barchaSoni = barchaRoyxat.length;
  const foizOlish = (son: number) => (barchaSoni ? Math.round((son / barchaSoni) * 100) : 0);
  const ishlanganKunlar = barchaRoyxat.filter((y) => ishSoati(y.kelgan, y.ketgan) > 0).length;
  const ortachaSoat = ishlanganKunlar ? Math.round((statistika.soat / ishlanganKunlar) * 10) / 10 : 0;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-600">Xodim uchoti</p>
          <h1 className="mt-1 text-3xl font-black text-gray-950">Davomat</h1>
          <p className="mt-1 text-sm text-gray-500">Xodimlarning kelish-ketish vaqti va ish soatlarini shu yerda kuzating va boshqaring.</p>
        </div>
        {!boshYuklanmoqda && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => void selfAction("in")}
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-emerald-500 px-5 font-black text-white shadow-sm shadow-emerald-200 transition hover:bg-emerald-600"
            >
              <LogIn size={18} />
              Keldim
            </button>
            <button
              onClick={() => void selfAction("out")}
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-blue-600 px-5 font-black text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
            >
              <LogOut size={18} />
              Ketdim
            </button>
          </div>
        )}
      </header>

      {xato && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}

      {boshYuklanmoqda ? (
        <section className="rounded-[28px] border border-slate-100 bg-white shadow-sm">
          <YuklanmoqdaHolati className="h-[28rem]" />
        </section>
      ) : (
        <>
          {/* Filtrlar */}
          <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <div className="grid gap-2 text-sm font-bold text-slate-500">
                <span className="flex items-center gap-1.5"><CalendarDays size={14} className="text-blue-600" /> Muddat</span>
                <span className="flex items-center gap-2">
                  <input type="date" value={sanadan} max={sanagacha} onChange={(e) => setSanadan(e.target.value)} className={maydonKlass} />
                  <span className="text-slate-300">–</span>
                  <input type="date" value={sanagacha} min={sanadan} onChange={(e) => setSanagacha(e.target.value)} className={maydonKlass} />
                </span>
              </div>
              <label className="grid gap-2 text-sm font-bold text-slate-500">
                Xodim
                <AppSelect value={xodimId} onChange={(e) => setXodimId(e.target.value)} className={maydonKlass}>
                  <option value="">Barcha xodimlar</option>
                  {xodimlar.map((x) => <option key={x.id} value={x.id}>{xodimNomi(x)}</option>)}
                </AppSelect>
              </label>
              <div className="grid gap-2 text-sm font-bold text-slate-500">
                Holat
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Holat">
                  {holatlar.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setHolat(item)}
                      aria-pressed={holat === item}
                      className={`h-10 rounded-full px-3.5 text-sm font-bold transition ${
                        holat === item ? "bg-blue-600 text-white shadow-sm shadow-blue-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {item === "barchasi" ? "Barchasi" : davomatMatni[item]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {filtrOzgargan && (
              <button
                type="button"
                onClick={filtrTozalash}
                className="mt-4 inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-bold text-slate-500 transition hover:bg-slate-50"
              >
                <RotateCcw size={14} />
                Filtrni tozalash
              </button>
            )}
          </section>

          {/* Qo'lda kiritish */}
          <section className="rounded-3xl border border-slate-100 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => (formaOchiq && !tahrirId ? formaniYopish() : setFormaOchiq(true))}
              aria-expanded={formaOchiq}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  {tahrirId ? <PencilLine size={18} /> : <Plus size={18} />}
                </span>
                <span>
                  <span className="block font-black text-slate-800">{tahrirId ? "Davomat yozuvini tahrirlash" : "Qo‘lda davomat kiritish"}</span>
                  <span className="block text-sm font-semibold text-slate-400">Xodim uchun kelish-ketish vaqtini o‘zingiz kiriting</span>
                </span>
              </span>
              <ChevronDown size={18} className={`text-slate-400 transition ${formaOchiq ? "rotate-180" : ""}`} />
            </button>

            {formaOchiq && (
              <div className="border-t-2 border-slate-100 p-5">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <label className="grid gap-2 text-sm font-bold text-slate-500">
                    Xodim
                    <AppSelect value={formaXodim} onChange={(e) => setFormaXodim(e.target.value)} className={maydonKlass}>
                      <option value="">Xodimni tanlang</option>
                      {xodimlar.map((x) => <option key={x.id} value={x.id}>{xodimNomi(x)}</option>)}
                    </AppSelect>
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-slate-500">
                    Sana
                    <input type="date" value={formaSana} onChange={(e) => setFormaSana(e.target.value)} className={maydonKlass} />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-slate-500">
                    Holat
                    <AppSelect value={formaHolat} onChange={(e) => setFormaHolat(e.target.value as DavomatHolati)} className={maydonKlass}>
                      {holatlar.filter((x) => x !== "barchasi").map((item) => <option key={item} value={item}>{davomatMatni[item]}</option>)}
                    </AppSelect>
                  </label>
                  <div className="grid gap-2 text-sm font-bold text-slate-500">
                    Kelgan va ketgan vaqt
                    <span className="flex items-center gap-2">
                      <input type="time" value={formaKelgan} onChange={(e) => setFormaKelgan(e.target.value)} aria-label="Kelgan vaqt" className={maydonKlass} />
                      <span className="text-slate-300">–</span>
                      <input type="time" value={formaKetgan} onChange={(e) => setFormaKetgan(e.target.value)} aria-label="Ketgan vaqt" className={maydonKlass} />
                    </span>
                  </div>
                  <label className="grid gap-2 text-sm font-bold text-slate-500 sm:col-span-2 xl:col-span-3">
                    Izoh
                    <input value={formaIzoh} onChange={(e) => setFormaIzoh(e.target.value)} placeholder="Ixtiyoriy izoh" className={maydonKlass} />
                  </label>
                  <div className="flex items-end gap-2">
                    <button
                      onClick={() => void yozuvSaqlash()}
                      className="h-11 flex-1 rounded-xl bg-blue-600 px-4 font-black text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
                    >
                      {tahrirId ? "Yangilash" : "Saqlash"}
                    </button>
                    <button
                      onClick={formaniYopish}
                      className="h-11 rounded-xl border border-slate-200 px-4 font-bold text-slate-500 transition hover:bg-slate-50"
                    >
                      Bekor
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Ko'rsatkichlar */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Korsatkich
              ikonka={<UserCheck size={22} />}
              nom="Keldi"
              son={statistika.keldi}
              birlik="kun"
              izoh={`Yozuvlarning ${foizOlish(statistika.keldi)}%`}
              foiz={foizOlish(statistika.keldi)}
              ton="emerald"
              faol={holat === "keldi"}
              onClick={() => setHolat(holat === "keldi" ? "barchasi" : "keldi")}
            />
            <Korsatkich
              ikonka={<Clock size={22} />}
              nom="Kechikdi"
              son={statistika.kechikdi}
              birlik="kun"
              izoh={`Yozuvlarning ${foizOlish(statistika.kechikdi)}%`}
              foiz={foizOlish(statistika.kechikdi)}
              ton="amber"
              faol={holat === "kechikdi"}
              onClick={() => setHolat(holat === "kechikdi" ? "barchasi" : "kechikdi")}
            />
            <Korsatkich
              ikonka={<TriangleAlert size={22} />}
              nom="Kelmadi"
              son={statistika.kelmadi}
              birlik="kun"
              izoh={`Yozuvlarning ${foizOlish(statistika.kelmadi)}%`}
              foiz={foizOlish(statistika.kelmadi)}
              ton="red"
              faol={holat === "kelmadi"}
              onClick={() => setHolat(holat === "kelmadi" ? "barchasi" : "kelmadi")}
            />
            <Korsatkich
              ikonka={<Timer size={22} />}
              nom="Jami ish soati"
              son={statistika.soat}
              birlik="soat"
              izoh={ishlanganKunlar ? `O‘rtacha ${ortachaSoat} soat / kun` : "Hisoblangan ish soati yo‘q"}
              foiz={Math.min(100, Math.round((ortachaSoat / 8) * 100))}
              ton="blue"
            />
          </section>

          {/* Jadval */}
          <div className={`transition-opacity ${yuklanmoqda ? "pointer-events-none opacity-50" : ""}`}>
            {royxat.length ? (
              <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                      <TableHead className="w-14 pl-5 text-center font-black text-slate-500">№</TableHead>
                      <TableHead className="font-black text-slate-500">Xodim</TableHead>
                      <TableHead className="font-black text-slate-500">Sana</TableHead>
                      <TableHead className="font-black text-slate-500">Holat</TableHead>
                      <TableHead className="font-black text-slate-500">Kelgan</TableHead>
                      <TableHead className="font-black text-slate-500">Ketgan</TableHead>
                      <TableHead className="text-right font-black text-slate-500">Ish soati</TableHead>
                      <TableHead className="font-black text-slate-500">Izoh</TableHead>
                      <TableHead className="w-16 pr-5" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sahifadagi.map((d, index) => {
                      const nom = nomOlish(d.xodimId);
                      const soat = ishSoati(d.kelgan, d.ketgan);
                      return (
                        <TableRow key={d.id} onClick={() => tahrirlash(d)} className="cursor-pointer hover:bg-blue-50/40">
                          <TableCell className="pl-5 text-center text-sm font-black text-slate-400">{(sahifa - 1) * sahifaHajmi + index + 1}</TableCell>
                          <TableCell>
                            <span className="flex items-center gap-2.5">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-black text-blue-600">
                                {nom.charAt(0).toUpperCase()}
                              </span>
                              <span className="font-black text-slate-900">{nom}</span>
                            </span>
                          </TableCell>
                          <TableCell className="font-semibold text-slate-600">{sanaFormat(d.sana)}</TableCell>
                          <TableCell>
                            <span className={`rounded-lg px-2.5 py-1 text-xs font-black ${davomatRangi[d.holat]}`}>{davomatMatni[d.holat]}</span>
                          </TableCell>
                          <TableCell>
                            {d.kelgan ? <span className="font-bold text-slate-700">{d.kelgan}</span> : <span className="text-slate-300">Kiritilmagan</span>}
                          </TableCell>
                          <TableCell>
                            {d.ketgan ? (
                              <span className="font-bold text-slate-700">{d.ketgan}</span>
                            ) : d.kelgan ? (
                              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-600">Ishda</span>
                            ) : (
                              <span className="text-slate-300">Kiritilmagan</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {soat ? <span className="font-bold text-slate-700">{soat} soat</span> : <span className="text-slate-300">Hisoblanmagan</span>}
                          </TableCell>
                          <TableCell className="max-w-56 truncate">
                            {d.izoh ? <span className="text-slate-600">{d.izoh}</span> : <span className="text-slate-300">Izoh yo‘q</span>}
                          </TableCell>
                          <TableCell className="pr-5 text-right">
                            <button
                              type="button"
                              onClick={(event) => { event.stopPropagation(); void ochirish(d); }}
                              aria-label="Yozuvni o‘chirish"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-red-500 transition hover:bg-red-50"
                            >
                              <Trash2 size={16} />
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                      <TableCell colSpan={6} className="pl-5 font-black text-slate-500">Jami</TableCell>
                      <TableCell className="text-right font-black text-slate-800">{korinadiganSoat} soat</TableCell>
                      <TableCell colSpan={2} />
                    </TableRow>
                  </TableFooter>
                </Table>
                <div className="border-t border-slate-100 [&>div]:!border-0">
                  <TablePagination accent="blue" page={sahifa} pageSize={sahifaHajmi} totalItems={jamiSoni} onPageChange={setSahifa} onPageSizeChange={(n) => { setSahifaHajmi(n); setSahifa(1); }} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400"><CalendarDays size={26} /></span>
                <p className="font-bold text-slate-500">Tanlangan davrda davomat yozuvi topilmadi</p>
                <p className="text-sm text-slate-400">Sana oralig‘ini o‘zgartiring yoki yangi yozuv kiriting.</p>
              </div>
            )}
          </div>
          {/* Kechikish chegarasi */}
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
            <div>
              <p className="font-black text-slate-800">Kechikish chegarasi</p>
              <p className="text-sm font-semibold text-slate-400">Shu vaqtdan keyin kelgan xodim "Kechikdi" deb belgilanadi</p>
            </div>
            <div className="flex items-center gap-2">
              <input type="time" value={lateThreshold} onChange={(e) => setLateThreshold(e.target.value)} aria-label="Kechikish chegarasi" className={`${maydonKlass} !h-12 w-36`} />
              <button
                onClick={() => void sozlamaSaqlash()}
                aria-label="Kechikish chegarasini saqlash"
                title="Saqlash"
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-200 text-blue-600 transition hover:bg-blue-50"
              >
                <Save size={18} />
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

const KARTA_TONLARI = {
  emerald: { ikonka: "bg-emerald-50 text-emerald-600", bar: "bg-emerald-500", halqa: "ring-emerald-300", fon: "from-emerald-50/70" },
  amber: { ikonka: "bg-amber-50 text-amber-600", bar: "bg-amber-500", halqa: "ring-amber-300", fon: "from-amber-50/70" },
  red: { ikonka: "bg-red-50 text-red-500", bar: "bg-red-500", halqa: "ring-red-300", fon: "from-red-50/70" },
  blue: { ikonka: "bg-blue-50 text-blue-600", bar: "bg-blue-500", halqa: "ring-blue-300", fon: "from-blue-50/70" },
} as const;

// Raqam o'zgarganda silliq sanab chiqadi.
function useSanoq(nishon: number) {
  const [qiymat, setQiymat] = useState(0);
  useEffect(() => {
    let kadr = 0;
    const boshi = performance.now();
    const davomiyligi = 600;
    const tick = (hozir: number) => {
      const t = Math.min(1, (hozir - boshi) / davomiyligi);
      setQiymat(Math.round(nishon * (1 - Math.pow(1 - t, 3)) * 10) / 10);
      if (t < 1) kadr = requestAnimationFrame(tick);
    };
    kadr = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(kadr);
  }, [nishon]);
  return qiymat;
}

function Korsatkich({
  ikonka, nom, son, birlik, izoh, foiz, ton, faol = false, onClick,
}: {
  ikonka: React.ReactNode; nom: string; son: number; birlik: string; izoh: string; foiz: number;
  ton: keyof typeof KARTA_TONLARI; faol?: boolean; onClick?: () => void;
}) {
  const t = KARTA_TONLARI[ton];
  const korinadigan = useSanoq(son);
  const Etiket = onClick ? "button" : "div";
  return (
    <Etiket
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-pressed={onClick ? faol : undefined}
      className={`group relative overflow-hidden rounded-3xl border border-slate-100 bg-gradient-to-br ${t.fon} to-white p-5 text-left shadow-sm transition duration-300 ${
        onClick ? "cursor-pointer hover:-translate-y-1 hover:shadow-md" : ""
      } ${faol ? `ring-2 ${t.halqa}` : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">{nom}</p>
          <p className="mt-2 text-3xl font-black text-slate-900">
            {korinadigan.toLocaleString("uz-UZ")} <span className="text-base font-bold text-slate-400">{birlik}</span>
          </p>
        </div>
        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl transition duration-300 group-hover:scale-110 ${t.ikonka}`}>{ikonka}</span>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all duration-700 ${t.bar}`} style={{ width: `${Math.max(foiz, son > 0 ? 4 : 0)}%` }} />
      </div>
      <p className="mt-2 text-xs font-semibold text-slate-400">{izoh}</p>
    </Etiket>
  );
}
