import { useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  BarChart3,
  Download,
  FileClock,
  Search,
  TrendingUp,
  UsersRound,
  WalletCards,
} from "lucide-react";
import TovarHarakati from "./TovarHarakati";
import OzaroHisobKitob from "./OzaroHisobKitob";
import FoydaHisoboti from "./FoydaHisoboti";
import { mockAudit, mockFiliallar, mockKirimChiqim } from "./mockData";
import type { Filterlar, HisobotTab } from "./types";
import {
  auditActionRangi,
  bugun,
  bugunMinus,
  pul,
  sanaFormat,
  sanadaMi,
  vaqtFormat,
} from "./yordamchilar";

const tablar: Array<{ id: HisobotTab; nom: string; icon: typeof BarChart3 }> = [
  { id: "stock", nom: "Tovar harakati", icon: Activity },
  { id: "counterparty", nom: "O'zaro hisob-kitob", icon: UsersRound },
  { id: "profit", nom: "Foyda hisoboti", icon: TrendingUp },
  { id: "income", nom: "Kirim-chiqim", icon: WalletCards },
  { id: "audit", nom: "Audit loglari", icon: FileClock },
];

const boshFilterlar: Filterlar = {
  dateFrom: bugunMinus(30),
  dateTo: bugun(),
  customerId: "",
  supplierId: "",
  categoryId: "",
  branchId: "",
  auditAction: "",
  auditResource: "",
};

// Mock CSV eksport — backendsiz, brauzerda fayl yaratadi.
function csvYuklash(nom: string, ustunlar: string[], qatorlar: (string | number)[][]) {
  const satrlar = [ustunlar, ...qatorlar].map((qator) =>
    qator.map((katak) => `"${String(katak).replace(/"/g, '""')}"`).join(",")
  );
  const blob = new Blob(["﻿" + satrlar.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${nom}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function HisobotUchot() {
  const [tab, setTab] = useState<HisobotTab>("stock");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-orange-500">
          Hisobot va audit
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-black text-gray-950">Hisobotlar</h1>
          <span className="inline-flex h-8 items-center gap-2 rounded-full bg-amber-50 px-3 text-sm font-bold text-amber-600">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Mock rejim
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Tovar harakati, kontragent balansi, foyda, kirim-chiqim va tizim loglari — namunaviy
          ma'lumot bilan. Backendga so'rov yuborilmaydi.
        </p>
      </header>

      <nav className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {tablar.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`rounded-[24px] border p-4 text-left transition hover:-translate-y-0.5 ${
                active
                  ? "border-orange-200 bg-orange-500 text-white shadow-lg shadow-orange-200"
                  : "border-orange-100 bg-white text-gray-700 hover:bg-orange-50"
              }`}
            >
              <Icon size={22} className={active ? "text-white" : "text-orange-500"} />
              <p className="mt-3 font-black">{item.nom}</p>
            </button>
          );
        })}
      </nav>

      {tab === "stock" ? (
        <TovarHarakati />
      ) : tab === "counterparty" ? (
        <OzaroHisobKitob />
      ) : tab === "profit" ? (
        <FoydaHisoboti />
      ) : (
        <BoshqaTablar tab={tab} />
      )}
    </div>
  );
}

// Tovar harakatidan tashqari tablar (keyinchalik birma-bir kengaytiriladi).
function BoshqaTablar({ tab }: { tab: HisobotTab }) {
  const [ishFilter, setIshFilter] = useState<Filterlar>(boshFilterlar);
  const [filter, setFilter] = useState<Filterlar>(boshFilterlar);
  const [auditPage, setAuditPage] = useState(1);
  const pageSize = 4;

  function yangilash<K extends keyof Filterlar>(kalit: K, qiymat: Filterlar[K]) {
    setIshFilter((old) => ({ ...old, [kalit]: qiymat }));
  }

  function korish() {
    setFilter(ishFilter);
    setAuditPage(1);
  }

  const incomeRows = useMemo(
    () =>
      mockKirimChiqim.filter(
        (r) =>
          sanadaMi(r.sana, filter.dateFrom, filter.dateTo) &&
          (!filter.branchId || r.branchId === filter.branchId)
      ),
    [filter]
  );

  const auditRows = useMemo(
    () =>
      mockAudit.filter(
        (r) =>
          sanadaMi(r.sana, filter.dateFrom, filter.dateTo) &&
          (!filter.auditAction || r.action === filter.auditAction) &&
          (!filter.auditResource ||
            r.resurs.toLowerCase().includes(filter.auditResource.toLowerCase()))
      ),
    [filter]
  );

  const auditTotalPages = Math.max(1, Math.ceil(auditRows.length / pageSize));
  const auditKorinadigan = auditRows.slice((auditPage - 1) * pageSize, auditPage * pageSize);

  const incomeJamlanma = useMemo(() => {
    const kirim = incomeRows.filter((r) => r.turi === "kirim").reduce((s, r) => s + r.summa, 0);
    const chiqim = incomeRows.filter((r) => r.turi === "chiqim").reduce((s, r) => s + r.summa, 0);
    return { kirim, chiqim, sof: kirim - chiqim };
  }, [incomeRows]);

  function eksport() {
    if (tab === "income") {
      csvYuklash(
        "kirim-chiqim",
        ["Sana", "Turi", "Kategoriya", "Summa"],
        incomeRows.map((r) => [sanaFormat(r.sana), r.turi, r.kategoriya, r.summa])
      );
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-4">
          <Input
            label="Boshlanish sanasi"
            type="date"
            value={ishFilter.dateFrom}
            onChange={(v) => yangilash("dateFrom", v)}
          />
          <Input
            label="Tugash sanasi"
            type="date"
            value={ishFilter.dateTo}
            onChange={(v) => yangilash("dateTo", v)}
          />

          {tab === "income" && (
            <Select
              label="Filial"
              value={ishFilter.branchId}
              onChange={(v) => yangilash("branchId", v)}
            >
              <option value="">Barcha filiallar</option>
              {mockFiliallar.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nomi}
                </option>
              ))}
            </Select>
          )}

          {tab === "audit" && (
            <>
              <Select
                label="Amal turi"
                value={ishFilter.auditAction}
                onChange={(v) => yangilash("auditAction", v)}
              >
                <option value="">Barchasi</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </Select>
              <Input
                label="Resurs"
                value={ishFilter.auditResource}
                onChange={(v) => yangilash("auditResource", v)}
                placeholder="Masalan: Product"
              />
            </>
          )}

          <div className="flex items-end">
            <button
              onClick={korish}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 font-black text-white transition hover:bg-orange-600"
            >
              <Search size={17} />
              Ko'rish
            </button>
          </div>
        </div>
      </section>

      {tab !== "audit" && (
        <div className="flex justify-end">
          <button
            onClick={eksport}
            className="inline-flex h-10 items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 text-sm font-bold text-orange-600 shadow-sm transition hover:bg-orange-50"
          >
            <Download size={16} />
            Excel (CSV) yuklash
          </button>
        </div>
      )}

      <section className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm">
        {tab === "income" && (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <Karta sarlavha="Kassa kirimi" qiymat={pul(incomeJamlanma.kirim)} rang="text-emerald-600" />
              <Karta sarlavha="Xarajatlar" qiymat={pul(incomeJamlanma.chiqim)} rang="text-red-500" />
              <Karta
                sarlavha="Sof daromad"
                qiymat={pul(incomeJamlanma.sof)}
                rang={incomeJamlanma.sof >= 0 ? "text-emerald-600" : "text-red-500"}
              />
            </div>
            <Jadval ustunlar={["Sana", "Turi", "Kategoriya", "Summa"]} bosh={incomeRows.length === 0}>
              {incomeRows.map((r) => (
                <tr key={r.id} className="hover:bg-orange-50/50">
                  <Td>{sanaFormat(r.sana)}</Td>
                  <Td>
                    <Belgi
                      matn={r.turi === "kirim" ? "Kirim" : "Chiqim"}
                      rang={r.turi === "kirim" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}
                    />
                  </Td>
                  <Td>{r.kategoriya}</Td>
                  <Td>{pul(r.summa)}</Td>
                </tr>
              ))}
            </Jadval>
          </div>
        )}

        {tab === "audit" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-500">Jami loglar: {auditRows.length}</p>
              <div className="flex gap-2">
                <button
                  disabled={auditPage <= 1}
                  onClick={() => setAuditPage((p) => p - 1)}
                  className="h-9 rounded-xl bg-gray-100 px-3 text-sm font-bold disabled:opacity-40"
                >
                  Oldingi
                </button>
                <button
                  disabled={auditPage >= auditTotalPages}
                  onClick={() => setAuditPage((p) => p + 1)}
                  className="h-9 rounded-xl bg-orange-500 px-3 text-sm font-bold text-white disabled:opacity-40"
                >
                  Keyingi
                </button>
              </div>
            </div>

            {auditKorinadigan.length === 0 ? (
              <Bosh text="Audit loglari mavjud emas." />
            ) : (
              <div className="space-y-3">
                {auditKorinadigan.map((log) => (
                  <article
                    key={log.id}
                    className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <Belgi matn={log.action} rang={auditActionRangi[log.action]} />
                          <span className="font-black text-gray-950">{log.resurs}</span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">{log.tafsilot}</p>
                        <p className="mt-1 text-xs font-bold text-gray-400">
                          Foydalanuvchi: {log.foydalanuvchi}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-bold text-orange-600">{vaqtFormat(log.sana)}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="text-sm font-bold text-gray-700">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 outline-none focus:border-orange-400"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="text-sm font-bold text-gray-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 outline-none focus:border-orange-400"
      >
        {children}
      </select>
    </label>
  );
}

function Jadval({
  ustunlar,
  bosh,
  children,
}: {
  ustunlar: string[];
  bosh: boolean;
  children: ReactNode;
}) {
  if (bosh) return <Bosh text="Hisobot bo'yicha ma'lumot topilmadi." />;
  return (
    <div className="overflow-x-auto rounded-2xl border border-orange-100">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-orange-50 text-xs uppercase tracking-wide text-orange-900/60">
          <tr>
            {ustunlar.map((ustun) => (
              <th key={ustun} className="px-5 py-4">
                {ustun}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-orange-100/70">{children}</tbody>
      </table>
    </div>
  );
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-5 py-4 font-semibold text-gray-700">{children}</td>;
}

function Belgi({ matn, rang }: { matn: string; rang: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${rang}`}>{matn}</span>
  );
}

function Karta({ sarlavha, qiymat, rang }: { sarlavha: string; qiymat: string; rang: string }) {
  return (
    <article className="rounded-2xl bg-orange-50 p-5">
      <p className="text-sm font-bold text-orange-600">{sarlavha}</p>
      <h3 className={`mt-2 text-2xl font-black ${rang}`}>{qiymat}</h3>
    </article>
  );
}

function Bosh({ text }: { text: string }) {
  return (
    <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-orange-200 bg-orange-50/30 text-center">
      <div>
        <BarChart3 className="mx-auto text-orange-300" size={42} />
        <p className="mt-3 font-bold text-gray-500">{text}</p>
      </div>
    </div>
  );
}
