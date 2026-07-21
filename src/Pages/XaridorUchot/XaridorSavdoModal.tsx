import { useState } from "react";
import { Bell, ChevronDown, MessageSquare, Package } from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import FaoliyatPaneli from "./FaoliyatPaneli";
import TezkorPanel from "./TezkorPanel";
import type { XaridorSavdosi } from "./types";
import {
  qisqaVaqt,
  sanaFormat,
  savdoHolatMatni,
  savdoHolatRangi,
  summaFormat,
} from "./yordamchilar";

type Props = {
  savdo: XaridorSavdosi;
  xaridorNomi: string;
  customerId?: string;
  partnerId?: string;
  onYopish: () => void;
};

const tablar = ["Umumiy", "Tovarlar", "Hisob-fakturalar", "Tarix"] as const;
type Tab = (typeof tablar)[number];

// Savdolar jadvalidagi qatorni bosganda ochiladigan savdo tafsilotlari oynasi.
// Savdo modulidagi SotuvTafsilotlariModal ko'rinishida, mock-first (backendsiz).
export default function XaridorSavdoModal({ savdo, xaridorNomi, customerId, partnerId, onYopish }: Props) {
  const [faolTab, setFaolTab] = useState<Tab>("Umumiy");

  const qarzdorlik = savdo.summa - savdo.tolangan;

  return (
    <AppModal className="items-start justify-start bg-[rgba(54,22,8,.50)] p-0 py-4 pl-[88px] pr-4 backdrop-blur-[3px]">
      <div className="relative h-[calc(100vh-32px)] w-full">
        <TezkorPanel
          havolaId={savdo.id}
          faylNomi={`savdo-${savdo.raqam}`}
          malumot={savdo}
          onYopish={onYopish}
        />

        <section className="relative h-full w-full overflow-hidden rounded-l-[46px] rounded-r-[36px] bg-gradient-to-br from-[#FFF8EF] via-[#FFFDF9] to-[#FFE8D2] text-[#253044] shadow-[0_34px_120px_rgba(92,38,8,.42)] ring-1 ring-white/80">
          <div className="scrollbar-orange h-full overflow-y-auto">
            <header className="sticky top-0 z-30 border-b border-orange-100/80 bg-[#FFF8EF]/90 px-9 py-6 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <h1 className="truncate text-2xl font-bold text-slate-900">{savdo.raqam}</h1>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-sm text-slate-600 shadow-sm transition hover:text-orange-600"
                  >
                    Hujjat <ChevronDown size={15} />
                  </button>
                </div>
              </div>

              <nav className="mt-6 flex items-center gap-3 overflow-x-auto">
                {tablar.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFaolTab(tab)}
                    className={`shrink-0 rounded-xl px-3 py-2 text-sm transition ${
                      faolTab === tab
                        ? "border border-orange-200 bg-white text-[#FF6A00]"
                        : "text-slate-500 hover:bg-white hover:text-[#FF6A00]"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </nav>
            </header>

            {faolTab === "Umumiy" ? (
              <div className="grid gap-8 px-9 py-9 xl:grid-cols-[43%_36px_minmax(0,1fr)]">
                <aside className="space-y-6">
                  <section className="rounded-[24px] border border-orange-100/80 bg-white/92 p-5 shadow-[0_18px_46px_rgba(255,106,0,.08)] backdrop-blur">
                    <CardTitle title="Kelishuv haqida" />
                    <Info label="Bosqich" value={savdoHolatMatni[savdo.holat]} />

                    <div className="mt-4 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-sm text-slate-400">Miqdor va valyuta</p>
                        <h2 className="mt-1 text-4xl font-light tracking-wide text-slate-700">
                          {summaFormat(savdo.summa)}
                        </h2>
                      </div>
                      <span
                        className={`rounded-xl px-3 py-2 text-xs font-bold ${savdoHolatRangi[savdo.holat]}`}
                      >
                        {savdoHolatMatni[savdo.holat]}
                      </span>
                    </div>

                    <div className="mt-5 rounded-2xl border border-orange-100 bg-gradient-to-br from-[#FFF8EF] to-white p-4">
                      <p className="text-sm text-slate-500">To'lov va yetkazish</p>
                      <p className="mt-3 text-sm text-slate-400">
                        Bu yerda to'lov, yetkazish va ombordan chiqarish ma'lumotlari ko'rsatiladi.
                      </p>
                      <div className="mt-4 border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          className="text-sm font-semibold text-[#FF6A00] transition hover:text-[#EA580C] hover:underline"
                        >
                          Qo'shish
                        </button>

                        {savdo.tolangan > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-[#FF6A00]">
                              Karta: {summaFormat(savdo.tolangan)}
                            </span>
                          </div>
                        )}

                        <div className="mt-6 space-y-2 text-sm">
                          <div className="flex justify-between text-slate-400">
                            <span>Sotuv jami</span>
                            <span>{summaFormat(savdo.summa)}</span>
                          </div>
                          <div className="flex justify-between text-[#FF6A00]">
                            <span>Qabul qilingan to'lov</span>
                            <span className="font-bold">{summaFormat(savdo.tolangan)}</span>
                          </div>
                          <div
                            className={`flex justify-between ${
                              qarzdorlik > 0 ? "text-red-500" : "text-emerald-600"
                            }`}
                          >
                            <span>{qarzdorlik > 0 ? "Qarzdorlik qoldig'i" : "Qarzdorlik yo'q"}</span>
                            <span className="font-bold">{summaFormat(Math.max(qarzdorlik, 0))}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[24px] border border-orange-100/80 bg-white/92 p-5 shadow-[0_18px_46px_rgba(255,106,0,.08)] backdrop-blur">
                    <CardTitle title="Qo'shimcha ma'lumotlar" />
                    <Info label="Xaridor" value={xaridorNomi} />
                    <Info label="Mas'ul shaxs" value={savdo.masul} />
                    <Info label="Ombor" value={savdo.ombor} />
                    <Info label="Sana" value={sanaFormat(savdo.sana)} />
                  </section>
                </aside>

                <TimelineRail />

                <main className="space-y-6">
                  <FaoliyatPaneli partnerId={partnerId} customerId={customerId} />
                  <Divider label="Bugun" />
                  <FeedCard
                    title="Hisoblash rejimi o'zgartirildi"
                    time={qisqaVaqt(savdo.sana)}
                    text={`Tovarlar narxiga asoslanib → ${summaFormat(savdo.summa)}`}
                  />
                  <FeedCard
                    title="Sotuv yaratildi"
                    time={qisqaVaqt(savdo.sana)}
                    text={`${xaridorNomi} uchun ${savdo.raqam} sotuv yaratildi.`}
                  />
                </main>
              </div>
            ) : (
              <div className="px-9 py-9">
                <p className="rounded-[24px] border border-dashed border-orange-200 bg-white/60 p-16 text-center font-bold text-slate-400">
                  {faolTab} bo'limi bo'sh
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </AppModal>
  );
}

function TimelineRail() {
  return (
    <div className="hidden flex-col items-center xl:flex">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF6A00] text-white shadow-[0_12px_28px_rgba(249,115,22,.28)]">
        <MessageSquare size={18} />
      </div>
      <div className="h-32 w-px bg-orange-200" />
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_12px_28px_rgba(16,185,129,.22)]">
        <Bell size={18} />
      </div>
      <div className="h-28 w-px bg-orange-200" />
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#FF6A00] shadow-sm ring-1 ring-orange-100">
        <Package size={17} />
      </div>
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="h-px flex-1 bg-orange-200" />
      <span className="rounded-full bg-orange-100 px-6 py-1 text-sm font-semibold text-[#FF6A00] ring-1 ring-orange-200">
        {label}
      </span>
      <div className="h-px flex-1 bg-orange-200" />
    </div>
  );
}

function CardTitle({ title }: { title: string }) {
  return (
    <div className="border-b border-orange-100 pb-3">
      <h2 className="text-xs font-black uppercase tracking-wide text-slate-600">{title}</h2>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4">
      <p className="text-sm text-slate-400">{label}</p>
      <div className="mt-1 text-sm text-slate-700">{value || "—"}</div>
    </div>
  );
}

function FeedCard({ title, time, text }: { title: string; time: string; text: string }) {
  return (
    <article className="group relative overflow-hidden rounded-[24px] border border-orange-100/80 bg-white/92 p-5 shadow-[0_14px_38px_rgba(255,106,0,.08)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(255,106,0,.12)]">
      <span className="absolute inset-y-5 left-0 w-1 rounded-r-full bg-gradient-to-b from-orange-400 to-orange-600 opacity-80" />
      <div className="flex items-start justify-between gap-4">
        <div className="pl-2">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-black text-slate-700">{title}</h3>
            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-slate-400 ring-1 ring-orange-100">
              {time}
            </span>
          </div>
          <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{text}</p>
        </div>
        <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-orange-50 to-[#FFF8EF] ring-1 ring-orange-100" />
      </div>
    </article>
  );
}
