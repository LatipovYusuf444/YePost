import { useState } from "react";
import {
  Bell,
  Briefcase,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  MessageSquare,
  UserRound,
  Wallet,
} from "lucide-react";
import { bugun, qisqaVaqt, sanaFormat, yangiId } from "./yordamchilar";

// Tafsilotlar/yaratish modalkalarining o'ng ustunidagi faoliyat oqimi.
// Mock-first: yozilgan ish/izoh darhol lokal oqimga qo'shiladi (backend yo'q).

export type FaoliyatTuri = "ish" | "izoh" | "xabar" | "vazifa" | "tolov" | "ozgarish";

export type FaoliyatYozuvi = {
  id: string;
  turi: FaoliyatTuri;
  sarlavha: string;
  matn: string;
  sana: string; // ISO — rejalashtirilgan muddat yoki qo'shilgan vaqt
};

const yozishTablari: { kalit: FaoliyatTuri; nom: string }[] = [
  { kalit: "ish", nom: "Ish" },
  { kalit: "izoh", nom: "Izoh" },
  { kalit: "xabar", nom: "Xabar" },
  { kalit: "vazifa", nom: "Vazifa" },
];

const sarlavhaPlaceholder: Record<FaoliyatTuri, string> = {
  ish: "Mijoz bilan bog'lanish",
  izoh: "Izoh sarlavhasi",
  xabar: "Xabar mavzusi",
  vazifa: "Vazifa nomi",
  tolov: "",
  ozgarish: "",
};

const tafsilotPlaceholder: Record<FaoliyatTuri, string> = {
  ish: "Vazifa haqida batafsil yozing...",
  izoh: "Izoh matnini yozing...",
  xabar: "Xabar matnini yozing...",
  vazifa: "Vazifa haqida batafsil yozing...",
  tolov: "",
  ozgarish: "",
};

function hozirgiVaqt() {
  const sana = new Date();
  return `${String(sana.getHours()).padStart(2, "0")}:${String(sana.getMinutes()).padStart(2, "0")}`;
}

function muddatMatni(sana: string, vaqt: string) {
  const kun = sana === bugun() ? "Bugun" : sanaFormat(sana);
  return `${kun}, soat ${vaqt || "—"}`;
}

type Props = {
  boshlangichYozuvlar?: FaoliyatYozuvi[];
};

export default function FaoliyatPaneli({ boshlangichYozuvlar = [] }: Props) {
  const [faoliyatTab, setFaoliyatTab] = useState<FaoliyatTuri>("ish");
  const [sarlavha, setSarlavha] = useState("");
  const [tafsilot, setTafsilot] = useState("");
  const [sana, setSana] = useState(bugun());
  const [vaqt, setVaqt] = useState(hozirgiVaqt());
  const [yozuvlar, setYozuvlar] = useState<FaoliyatYozuvi[]>(boshlangichYozuvlar);

  function tozalash() {
    setSarlavha("");
    setTafsilot("");
    setSana(bugun());
    setVaqt(hozirgiVaqt());
  }

  function saqlash() {
    const tozaSarlavha = sarlavha.trim();
    if (!tozaSarlavha) return;

    const muddat = new Date(`${sana}T${vaqt || "00:00"}`);
    setYozuvlar((joriy) => [
      {
        id: yangiId("fao"),
        turi: faoliyatTab,
        sarlavha: tozaSarlavha,
        matn: tafsilot.trim(),
        sana: Number.isNaN(muddat.getTime()) ? new Date().toISOString() : muddat.toISOString(),
      },
      ...joriy,
    ]);
    tozalash();
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[22px] bg-white/92 p-4 shadow-[0_18px_46px_rgba(255,106,0,.08)] ring-1 ring-orange-100/80 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          {yozishTablari.map((tab) => (
            <button
              key={tab.kalit}
              type="button"
              onClick={() => setFaoliyatTab(tab.kalit)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold transition ${
                faoliyatTab === tab.kalit
                  ? "border border-orange-200 bg-orange-50 text-[#FF6A00]"
                  : "text-slate-500 hover:bg-orange-50 hover:text-[#FF6A00]"
              }`}
            >
              {tab.nom}
            </button>
          ))}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold text-slate-500 transition hover:bg-orange-50 hover:text-[#FF6A00]"
          >
            Ko'proq <ChevronDown size={14} />
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-orange-300 bg-gradient-to-br from-white to-[#FFF7EC] p-4 shadow-inner transition focus-within:ring-4 focus-within:ring-orange-100">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1 space-y-3">
              <input
                value={sarlavha}
                onChange={(event) => setSarlavha(event.target.value)}
                placeholder={sarlavhaPlaceholder[faoliyatTab]}
                className="h-9 w-full border-0 bg-transparent text-base font-semibold text-slate-700 outline-none placeholder:text-slate-700"
              />
              <textarea
                value={tafsilot}
                onChange={(event) => setTafsilot(event.target.value)}
                rows={4}
                placeholder={tafsilotPlaceholder[faoliyatTab]}
                className="w-full resize-none border-0 bg-transparent text-sm font-semibold leading-6 text-slate-600 outline-none placeholder:text-slate-400"
              />
            </div>
            <div className="flex shrink-0 items-center gap-3 pt-1">
              <span className="h-3.5 w-3.5 rounded-full bg-amber-400" title="Muhimlik" />
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-[#FF6A00]"
                title="Mas'ul"
              >
                <UserRound size={18} />
              </span>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="inline-flex min-h-11 flex-wrap items-center gap-2 rounded-xl border border-orange-200 bg-orange-50/80 px-3 py-2 text-sm font-semibold text-slate-700">
              <CalendarDays size={16} className="shrink-0 text-[#FF6A00]" />
              <span className="shrink-0">{muddatMatni(sana, vaqt)}</span>
              <input
                type="date"
                value={sana}
                onChange={(event) => setSana(event.target.value)}
                className="h-7 rounded-lg border border-orange-100 bg-white px-2 text-xs font-bold text-slate-600 outline-none focus:border-[#FF6A00]"
              />
              <input
                type="time"
                value={vaqt}
                onChange={(event) => setVaqt(event.target.value)}
                className="h-7 rounded-lg border border-orange-100 bg-white px-2 text-xs font-bold text-slate-600 outline-none focus:border-[#FF6A00]"
              />
            </div>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-orange-50 hover:text-[#FF6A00]"
              title="Eslatma"
            >
              <Bell size={18} />
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={saqlash}
              disabled={!sarlavha.trim()}
              className="inline-flex h-10 items-center justify-center rounded-2xl bg-[#FF6A00] px-6 text-sm font-black uppercase text-white shadow-[0_12px_28px_rgba(255,106,0,.22)] transition hover:-translate-y-0.5 hover:bg-[#EA580C] disabled:cursor-not-allowed disabled:bg-orange-200 disabled:shadow-none disabled:hover:translate-y-0"
            >
              Saqlash
            </button>
            <button
              type="button"
              onClick={tozalash}
              className="inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-black uppercase text-slate-600 transition hover:bg-orange-50 hover:text-[#FF6A00]"
            >
              Bekor qilish
            </button>
          </div>
        </div>
      </section>

      <div className="flex justify-center">
        <span className="rounded-full bg-orange-50 px-5 py-1.5 text-sm font-bold text-[#FF6A00]">
          Faoliyat
        </span>
      </div>

      <div className="space-y-4">
        {yozuvlar.map((yozuv) => (
          <article
            key={yozuv.id}
            className="relative overflow-hidden rounded-[22px] bg-white/92 p-5 shadow-[0_14px_36px_rgba(255,106,0,.07)] ring-1 ring-orange-100/70"
          >
            <span className="absolute inset-y-0 left-0 w-1.5 bg-[#FF6A00]" />
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-[#FF6A00]">
                <FaoliyatIkonka turi={yozuv.turi} />
              </span>
              <h3 className="text-base font-black text-slate-900">{yozuv.sarlavha}</h3>
              <span className="rounded-lg bg-orange-50 px-2 py-0.5 text-xs font-bold text-[#FF6A00]">
                {qisqaVaqt(yozuv.sana)}
              </span>
            </div>
            {yozuv.matn && (
              <p className="mt-3 text-sm leading-6 text-slate-600">{yozuv.matn}</p>
            )}
          </article>
        ))}

        {yozuvlar.length === 0 && (
          <p className="rounded-[22px] border border-dashed border-orange-200 bg-white/60 p-10 text-center text-sm font-semibold text-slate-400">
            Faoliyat yozuvlari yo'q
          </p>
        )}
      </div>
    </div>
  );
}

function FaoliyatIkonka({ turi }: { turi: FaoliyatTuri }) {
  if (turi === "tolov") return <Wallet size={15} />;
  if (turi === "izoh" || turi === "xabar") return <MessageSquare size={15} />;
  if (turi === "vazifa") return <CheckSquare size={15} />;
  if (turi === "ish") return <Briefcase size={15} />;
  return <Bell size={15} />;
}
