import { useEffect, useState } from "react";
import { FileText, RefreshCw, X } from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { counterpartyBalanceReportApi } from "@/api/reportsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { kunMatni } from "@/lib/hujjatSanasi";
import KengaytiriladiganJadval, { type Ustun } from "./KengaytiriladiganJadval";
import YuklanmoqdaHolati from "./YuklanmoqdaHolati";
import { hisobotPulMatni, type HisobotValyutasi } from "./hisobotValyutasi";
import { hisobKitobHujjatlariniMoslash, type HisobKitobHujjatQatori } from "./hisobKitobHujjatlari";

const HUJJAT_TURLARI: Record<string, string> = {
  SALE: "Sotuv", OPENING_DEBT: "Boshlang'ich qarz", PURCHASE: "Xarid", PAYMENT: "To'lov",
  CUSTOMER_PAYMENT: "Mijoz to'lovi", SUPPLIER_PAYMENT: "Yetkazib beruvchiga to'lov",
  SALE_RETURN: "Sotuvni qaytarish", PURCHASE_RETURN: "Xaridni qaytarish", SUPPLIER_BONUS: "Zavod bonusi",
};

export default function HisobKitobHujjatlariModal({ counterpartyId, counterpartyType, nomi, currency, onClose }: {
  counterpartyId: string;
  counterpartyType: "CUSTOMER" | "SUPPLIER";
  nomi: string;
  currency: HisobotValyutasi;
  onClose: () => void;
}) {
  const [qatorlar, setQatorlar] = useState<HisobKitobHujjatQatori[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [xato, setXato] = useState("");
  const [yangilanish, setYangilanish] = useState(0);

  useEffect(() => {
    let active = true;
    setYuklanmoqda(true);
    setQatorlar([]);
    setXato("");
    counterpartyBalanceReportApi.hujjatlar(counterpartyType, counterpartyId, { currency })
      .then((raw) => { if (active) setQatorlar(hisobKitobHujjatlariniMoslash(raw, currency)); })
      .catch((error) => { if (active) setXato(getApiErrorMessage(error)); })
      .finally(() => { if (active) setYuklanmoqda(false); });
    return () => { active = false; };
  }, [counterpartyId, counterpartyType, currency, yangilanish]);

  const pul = (summa: number | null) => summa === null ? "—" : hisobotPulMatni(summa, currency);
  const ustunlar: Ustun<HisobKitobHujjatQatori>[] = [
    { id: "hujjat", nom: "Hujjat", kenglik: 230, katak: (row) => <div><p className="font-bold text-slate-900">{row.hujjat}</p><p className="mt-1 text-xs text-slate-500">{HUJJAT_TURLARI[row.turi] ?? "Hujjat"}</p></div> },
    { id: "sana", nom: "Sana", kenglik: 140, katak: (row) => kunMatni(row.sana) || "—" },
    { id: "debet", nom: "Debet", kenglik: 170, hizalash: "right", katak: (row) => pul(row.debet) },
    { id: "kredit", nom: "Kredit", kenglik: 170, hizalash: "right", katak: (row) => <span className="text-emerald-600">{pul(row.kredit)}</span> },
    { id: "qoldiq", nom: "Qoldiq", kenglik: 180, hizalash: "right", katak: (row) => <span className="font-bold">{pul(row.qoldiq)}</span> },
  ];

  return <AppModal onClose={onClose} actionRail={false}>
    <section role="dialog" aria-modal="true" aria-labelledby="balance-documents-title" className="max-h-[90dvh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
      <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600"><FileText size={21} /></span>
          <div className="min-w-0"><p className="text-xs font-semibold text-slate-500">O'zaro hisob-kitob · Hujjatlar</p><h2 id="balance-documents-title" className="mt-1 truncate text-xl font-bold text-slate-900">{nomi}</h2></div>
        </div>
        <button type="button" onClick={onClose} aria-label="Hujjatlar oynasini yopish" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"><X size={20} /></button>
      </header>
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3"><span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700">{currency === "USD" ? "Dollar · USD" : "So'm · UZS"}</span>{!yuklanmoqda && <span className="text-sm text-slate-500">{qatorlar.length} ta hujjat</span>}</div>
        </div>
        {xato && <div role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-700"><p>{xato}</p><button type="button" disabled={yuklanmoqda} onClick={() => setYangilanish((value) => value + 1)} className="mt-2 inline-flex items-center gap-2 font-semibold"><RefreshCw size={14} />Qayta yuklash</button></div>}
        {yuklanmoqda ? <YuklanmoqdaHolati /> : qatorlar.length ? <KengaytiriladiganJadval ustunlar={ustunlar} qatorlar={qatorlar} /> : !xato && <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-12 text-center text-sm text-slate-500">Bu valyutada hujjatlar topilmadi.</div>}
      </div>
    </section>
  </AppModal>;
}
