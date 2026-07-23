import { useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import KengaytiriladiganJadval, { type Ustun } from "./KengaytiriladiganJadval";
import KopTanlovli from "./KopTanlovli";
import { useHisobotRealData } from "./HisobotRealData";
import { counterpartyBalanceReportApi } from "@/api/reportsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { pul } from "./yordamchilar";

type Qator = {
  id: string;
  nomi: string;
  turi: "Xaridor" | "Yetkazib beruvchi";
  total: number;
  paid: number;
  debt: number;
};
type BalanceItem = {
  counterpartyId: string;
  counterpartyName: string;
  debit: number | string;
  credit: number | string;
  closingBalance: number | string;
};
type BalancePage = { items?: BalanceItem[] };

export default function OzaroHisobKitob() {
  const { mijozlar, yetkazibBeruvchilar } = useHisobotRealData();
  const [customerIds, setCustomerIds] = useState<string[]>([]);
  const [supplierIds, setSupplierIds] = useState<string[]>([]);
  const [qatorlar, setQatorlar] = useState<Qator[]>([]);
  const [qidiruv, setQidiruv] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [xato, setXato] = useState("");

  useEffect(() => {
    let active = true;
    setYuklanmoqda(true);
    setXato("");
    Promise.all([
      counterpartyBalanceReportApi.barchasi({
        counterpartyType: "CUSTOMER",
        debtStatus: "ALL",
        search: qidiruv || undefined,
      }),
      counterpartyBalanceReportApi.barchasi({
        counterpartyType: "SUPPLIER",
        debtStatus: "ALL",
        search: qidiruv || undefined,
      }),
    ]).then(([customerPage, supplierPage]) => {
      if (!active) return;
      const customers = (customerPage as BalancePage).items ?? [];
      const suppliers = (supplierPage as BalancePage).items ?? [];
      setQatorlar([
        ...customers
          .filter((item) => !customerIds.length || customerIds.includes(item.counterpartyId))
          .map((item) => ({
            id: item.counterpartyId,
            nomi: item.counterpartyName,
            turi: "Xaridor" as const,
            total: Number(item.debit ?? 0),
            paid: Number(item.credit ?? 0),
            debt: Number(item.closingBalance ?? 0),
          })),
        ...suppliers
          .filter((item) => !supplierIds.length || supplierIds.includes(item.counterpartyId))
          .map((item) => ({
            id: item.counterpartyId,
            nomi: item.counterpartyName,
            turi: "Yetkazib beruvchi" as const,
            total: Number(item.debit ?? 0),
            paid: Number(item.credit ?? 0),
            debt: Number(item.closingBalance ?? 0),
          })),
      ]);
    })
      .catch((error) => { if (active) setXato(getApiErrorMessage(error)); })
      .finally(() => { if (active) setYuklanmoqda(false); });
    return () => { active = false; };
  }, [customerIds, supplierIds, qidiruv]);

  const korinadigan = useMemo(() => {
    const key = qidiruv.trim().toLowerCase();
    return qatorlar.filter((row) => !key || row.nomi.toLowerCase().includes(key));
  }, [qatorlar, qidiruv]);
  const jami = useMemo(() => korinadigan.reduce((sum, row) => ({ total: sum.total + row.total, paid: sum.paid + row.paid, debt: sum.debt + row.debt }), { total: 0, paid: 0, debt: 0 }), [korinadigan]);
  const ustunlar: Ustun<Qator>[] = [
    { id: "nomi", nom: "Kontragent", kenglik: 260, katak: (row) => <span className="font-black text-gray-950">{row.nomi}</span>, jami: () => "Jami:" },
    { id: "turi", nom: "Turi", kenglik: 180, katak: (row) => row.turi },
    { id: "total", nom: "Debet", kenglik: 190, hizalash: "right", katak: (row) => pul(row.total), jami: () => pul(jami.total) },
    { id: "paid", nom: "Kredit", kenglik: 190, hizalash: "right", katak: (row) => <span className="text-emerald-600">{pul(row.paid)}</span>, jami: () => pul(jami.paid) },
    { id: "debt", nom: "Yakuniy balans", kenglik: 190, hizalash: "right", katak: (row) => <span className={row.debt ? "font-black text-red-500" : "text-gray-500"}>{pul(row.debt)}</span>, jami: () => pul(jami.debt) },
  ];

  async function eksport() {
    setXato("");
    try {
      if (customerIds.length > 0 || supplierIds.length === 0) {
        await counterpartyBalanceReportApi.export({
          counterpartyType: "CUSTOMER",
          customerIds: customerIds.length ? customerIds.join(",") : undefined,
        }, "excel");
      }
      if (supplierIds.length > 0 || customerIds.length === 0) {
        await counterpartyBalanceReportApi.export({
          counterpartyType: "SUPPLIER",
          supplierIds: supplierIds.length ? supplierIds.join(",") : undefined,
        }, "excel");
      }
    } catch (error) {
      setXato(getApiErrorMessage(error));
    }
  }

  return <div className="space-y-5">
    <section className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
      <div className="grid gap-5 sm:grid-cols-2">
        <KopTanlovli label="Xaridor" options={mijozlar} selected={customerIds} onChange={setCustomerIds} />
        <KopTanlovli label="Yetkazib beruvchi" options={yetkazibBeruvchilar} selected={supplierIds} onChange={setSupplierIds} />
      </div>
      <p className="mt-4 text-xs font-semibold text-gray-400">Balans, debet va kredit qiymatlari backend hisobotidan olinadi.</p>
    </section>
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <button onClick={() => void eksport()} disabled={yuklanmoqda} className="inline-flex h-12 items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 text-sm font-bold text-orange-600 shadow-sm disabled:opacity-50"><Download size={16}/>Excel yuklash</button>
      <div className="relative md:w-72"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input value={qidiruv} onChange={(e) => setQidiruv(e.target.value)} placeholder="Jadval bo'yicha qidiruv" className="h-11 w-full rounded-2xl border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-orange-400"/></div>
    </div>
    {xato && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}
    <section className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm">
      {yuklanmoqda ? <div className="p-10 text-center font-bold text-orange-500">Backenddan yuklanmoqda...</div> : korinadigan.length ? <KengaytiriladiganJadval ustunlar={ustunlar} qatorlar={korinadigan} jamiBor kengaytir /> : <div className="p-10 text-center font-bold text-gray-400">Kontragent topilmadi.</div>}
    </section>
  </div>;
}
