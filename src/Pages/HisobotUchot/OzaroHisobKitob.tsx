import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Download, Search } from "lucide-react";
import KengaytiriladiganJadval, { type Ustun } from "./KengaytiriladiganJadval";
import KopTanlovli from "./KopTanlovli";
import { useHisobotRealData } from "./HisobotRealData";
import { counterpartyBalanceReportApi } from "@/api/reportsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { useKursniTayyorlash, useValyuta, type Valyuta } from "@/lib/valyuta";
import { hisobotPulMatni } from "./hisobotValyutasi";
import HisobKitobHujjatlariModal from "./HisobKitobHujjatlariModal";

import YuklanmoqdaHolati from "./YuklanmoqdaHolati";
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
  useKursniTayyorlash();
  const { rejimYoniq } = useValyuta();
  const [tanlanganValyuta, setTanlanganValyuta] = useState<Valyuta>("UZS");
  const valyuta = rejimYoniq ? tanlanganValyuta : "UZS";
  const pul = (summa: number) => hisobotPulMatni(summa, valyuta);
  const { mijozlar, yetkazibBeruvchilar } = useHisobotRealData();
  const [customerIds, setCustomerIds] = useState<string[]>([]);
  const [supplierIds, setSupplierIds] = useState<string[]>([]);
  const [qatorlar, setQatorlar] = useState<Qator[]>([]);
  const [ochilganKontragent, setOchilganKontragent] = useState<Qator | null>(null);
  const [qidiruv, setQidiruv] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [natijaValyutasi, setNatijaValyutasi] = useState<Valyuta>(valyuta);
  const [eksportYuklanmoqda, setEksportYuklanmoqda] = useState(false);
  const [xato, setXato] = useState("");
  const [yangilanish, setYangilanish] = useState(0);

  useEffect(() => {
    const yangilash = () => setYangilanish((value) => value + 1);
    window.addEventListener("savdo:yangilandi", yangilash);
    return () => window.removeEventListener("savdo:yangilandi", yangilash);
  }, []);

  useEffect(() => {
    let active = true;
    setYuklanmoqda(true);
    setXato("");
    Promise.all([
      counterpartyBalanceReportApi.barchasi({
        currency: valyuta,
        counterpartyType: "CUSTOMER",
        debtStatus: "ALL",
        search: qidiruv || undefined,
      }),
      counterpartyBalanceReportApi.barchasi({
        currency: valyuta,
        counterpartyType: "SUPPLIER",
        debtStatus: "ALL",
        search: qidiruv || undefined,
      }),
    ]).then(([customerPage, supplierPage]) => {
      if (!active) return;
      setNatijaValyutasi(valyuta);
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
      .catch((error) => {
        if (active) {
          setQatorlar([]);
          setXato(getApiErrorMessage(error));
        }
      })
      .finally(() => { if (active) setYuklanmoqda(false); });
    return () => { active = false; };
  }, [customerIds, supplierIds, qidiruv, yangilanish, valyuta]);

  const korinadigan = useMemo(() => {
    // Oldingi valyutadagi javob yangi belgi bilan ko'rsatilmasin.
    if (natijaValyutasi !== valyuta) return [];
    const key = qidiruv.trim().toLowerCase();
    return qatorlar.filter((row) => !key || row.nomi.toLowerCase().includes(key));
  }, [qatorlar, qidiruv, natijaValyutasi, valyuta]);
  const jami = useMemo(() => korinadigan.reduce((sum, row) => ({ total: sum.total + row.total, paid: sum.paid + row.paid, debt: sum.debt + row.debt }), { total: 0, paid: 0, debt: 0 }), [korinadigan]);
  const ustunlar: Ustun<Qator>[] = [
    { id: "nomi", nom: "Kontragent", kenglik: 260, katak: (row) => <button type="button" onClick={() => setOchilganKontragent(row)} aria-label={`${row.nomi} hujjatlari`} className="inline-flex max-w-full items-center gap-2 text-left font-bold text-orange-600 hover:underline"><span className="truncate">{row.nomi}</span><ChevronRight size={15} className="shrink-0" /></button>, jami: () => "Jami:" },
    { id: "turi", nom: "Turi", kenglik: 180, katak: (row) => row.turi },
    { id: "total", nom: "Debet", kenglik: 190, hizalash: "right", katak: (row) => pul(row.total), jami: () => pul(jami.total) },
    { id: "paid", nom: "Kredit", kenglik: 190, hizalash: "right", katak: (row) => <span className="text-emerald-600">{pul(row.paid)}</span>, jami: () => pul(jami.paid) },
    { id: "debt", nom: "Yakuniy balans", kenglik: 190, hizalash: "right", katak: (row) =>
        // Zavod bonusi qarzdan oshsa, yetkazib beruvchi balansi musbat bo'ladi: bu zavod oldidagi avansimiz (qarz emas).
        row.turi === "Yetkazib beruvchi" && row.debt > 0 ? (
          <span className="font-black text-emerald-600">{pul(row.debt)} <span className="text-xs font-bold">(avans)</span></span>
        ) : (
          <span className={row.debt ? "font-black text-red-500" : "text-gray-500"}>{pul(row.debt)}</span>
        ), jami: () => pul(jami.debt) },
  ];

  async function eksport() {
    if (eksportYuklanmoqda) return;
    setEksportYuklanmoqda(true);
    setXato("");
    try {
      if (customerIds.length > 0 || supplierIds.length === 0) {
        await counterpartyBalanceReportApi.export({
          currency: valyuta,
          counterpartyType: "CUSTOMER",
          customerIds: customerIds.length ? customerIds.join(",") : undefined,
        }, "excel");
      }
      if (supplierIds.length > 0 || customerIds.length === 0) {
        await counterpartyBalanceReportApi.export({
          currency: valyuta,
          counterpartyType: "SUPPLIER",
          supplierIds: supplierIds.length ? supplierIds.join(",") : undefined,
        }, "excel");
      }
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setEksportYuklanmoqda(false);
    }
  }

  return <div className="space-y-5">
    <section className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
      {rejimYoniq && (
        <div role="group" aria-label="Hisobot valyutasi" className="mb-5 inline-flex gap-1 rounded-2xl bg-orange-50 p-1">
          {([{ kod: "UZS", nom: "So'm" }, { kod: "USD", nom: "Dollar" }] as const).map(({ kod, nom }) => (
            <button
              key={kod}
              type="button"
              aria-pressed={valyuta === kod}
              onClick={() => setTanlanganValyuta(kod)}
              className={`rounded-xl px-5 py-2 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-orange-500 ${valyuta === kod ? "bg-orange-500 text-white shadow-sm" : "text-orange-600 hover:bg-orange-100"}`}
            >{nom}</button>
          ))}
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <KopTanlovli label="Xaridor" options={mijozlar} selected={customerIds} onChange={setCustomerIds} />
        <KopTanlovli label="Yetkazib beruvchi" options={yetkazibBeruvchilar} selected={supplierIds} onChange={setSupplierIds} />
      </div>
      <p className="mt-4 text-xs font-semibold text-gray-400">Hujjatlarni ko'rish uchun kontragent nomiga bosing.</p>
    </section>
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <button onClick={() => void eksport()} disabled={yuklanmoqda || eksportYuklanmoqda || natijaValyutasi !== valyuta} className="inline-flex h-12 items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 text-sm font-bold text-orange-600 shadow-sm disabled:opacity-50"><Download size={16}/>{eksportYuklanmoqda ? "Yuklanmoqda..." : "Excel yuklash"}</button>
      <div className="relative md:w-72"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input value={qidiruv} onChange={(e) => setQidiruv(e.target.value)} placeholder="Jadval bo'yicha qidiruv" className="h-11 w-full rounded-2xl border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-orange-400"/></div>
    </div>
    {xato && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}
    <section className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm">
      {yuklanmoqda ? <YuklanmoqdaHolati /> : korinadigan.length ? <KengaytiriladiganJadval ustunlar={ustunlar} qatorlar={korinadigan} jamiBor kengaytir /> : <div className="p-10 text-center font-bold text-gray-400">Kontragent topilmadi.</div>}
    </section>
    {ochilganKontragent && <HisobKitobHujjatlariModal
      key={`${ochilganKontragent.turi}:${ochilganKontragent.id}:${valyuta}`}
      counterpartyId={ochilganKontragent.id}
      counterpartyType={ochilganKontragent.turi === "Xaridor" ? "CUSTOMER" : "SUPPLIER"}
      nomi={ochilganKontragent.nomi}
      currency={valyuta}
      onClose={() => setOchilganKontragent(null)}
    />}
  </div>;
}
