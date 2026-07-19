import { useMemo, useState } from "react";
import {
  Building2,
  ChevronDown,
  Minus,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import BolimModal from "./BolimModal";
import XodimFormaModal from "./XodimFormaModal";
import XodimTafsilotlariModal from "./XodimTafsilotlariModal";
import { mockTarix } from "./mockData";
import type { Bolim, Lavozim, Xodim } from "./types";
import { bosHarflar, lavozimNomi, xodimNomi } from "./yordamchilar";

type Props = {
  bolimlar: Bolim[];
  xodimlar: Xodim[];
  lavozimlar: Lavozim[];
  onBolimSaqlash: (bolim: Bolim) => void;
  onBolimOchirish: (id: string) => void;
  onXodimSaqlash: (xodim: Xodim) => void;
  onYopish: () => void;
};

// Bitrix "Структура компании" uslubi: chapda bo'limlar daraxti (kanva),
// o'ngda tanlangan bo'lim paneli — rahbarlar va bo'ysunuvchi xodimlar.
export default function TashkilotTuzilmasi({
  bolimlar,
  xodimlar,
  lavozimlar,
  onBolimSaqlash,
  onBolimOchirish,
  onXodimSaqlash,
  onYopish,
}: Props) {
  const [tanlanganId, setTanlanganId] = useState(bolimlar[0]?.id ?? "");
  const [masshtab, setMasshtab] = useState(100);
  const [menyuId, setMenyuId] = useState<string | null>(null);
  const [bolimModal, setBolimModal] = useState<{ bolim: Bolim | null; otaId: string } | null>(null);
  const [tafsilotXodim, setTafsilotXodim] = useState<Xodim | null>(null);
  const [tahrirXodim, setTahrirXodim] = useState<Xodim | null>(null);
  const [xodimModal, setXodimModal] = useState(false);

  const bolalar = useMemo(() => {
    const xarita = new Map<string, Bolim[]>();
    const idlar = new Set(bolimlar.map((bolim) => bolim.id));
    bolimlar.forEach((bolim) => {
      const ota = bolim.otaId && idlar.has(bolim.otaId) ? bolim.otaId : "";
      xarita.set(ota, [...(xarita.get(ota) ?? []), bolim]);
    });
    return xarita;
  }, [bolimlar]);

  const tanlangan = bolimlar.find((bolim) => bolim.id === tanlanganId) ?? bolimlar[0] ?? null;

  const bolimXodimlari = (bolimId: string) => xodimlar.filter((xodim) => xodim.bolimId === bolimId);

  function bolimniOchirish(bolim: Bolim) {
    const ostidagilar = bolalar.get(bolim.id) ?? [];
    const savol = ostidagilar.length
      ? `"${bolim.nomi}" bo'limini o'chirasizmi? Ostidagi ${ostidagilar.length} ta bo'lim yuqoriga ko'chadi.`
      : `"${bolim.nomi}" bo'limini o'chirasizmi?`;
    if (!window.confirm(savol)) return;
    onBolimOchirish(bolim.id);
    setMenyuId(null);
  }

  function Karta({ bolim }: { bolim: Bolim }) {
    const ostidagiBolimlar = bolalar.get(bolim.id) ?? [];
    const xodimSoni = bolimXodimlari(bolim.id).length;
    const faol = tanlangan?.id === bolim.id;

    return (
      <div className="flex flex-col items-center">
        <div
          className={`w-[300px] rounded-[18px] p-1 transition ${
            faol ? "bg-orange-200/60 ring-2 ring-orange-300" : "bg-transparent"
          }`}
        >
          <article
            onClick={() => setTanlanganId(bolim.id)}
            className="relative cursor-pointer rounded-[15px] border border-orange-100 bg-white shadow-sm transition hover:border-orange-200 hover:shadow-md"
          >
            {bolim.otaId === "" && (
              <span className="absolute -top-2.5 right-4 rounded-md bg-[#FF6A00] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                Kompaniya
              </span>
            )}

            <div className="flex items-start justify-between gap-2 px-4 pt-4">
              <div className="flex min-w-0 items-center gap-2">
                <Building2 size={17} className="shrink-0 text-[#FF6A00]" />
                <h3 className="truncate font-black text-slate-900">{bolim.nomi}</h3>
              </div>

              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenyuId((joriy) => (joriy === bolim.id ? null : bolim.id));
                  }}
                  aria-label="Amallar"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-orange-50 hover:text-[#FF6A00]"
                >
                  <MoreHorizontal size={16} />
                </button>

                {menyuId === bolim.id && (
                  <>
                    <button
                      type="button"
                      aria-label="Yopish"
                      onClick={(event) => {
                        event.stopPropagation();
                        setMenyuId(null);
                      }}
                      className="fixed inset-0 z-40 cursor-default"
                    />
                    <div className="absolute right-0 top-8 z-50 w-48 rounded-2xl border border-orange-100 bg-white p-1.5 shadow-[0_18px_50px_rgba(92,38,8,.16)]">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setBolimModal({ bolim, otaId: bolim.otaId });
                          setMenyuId(null);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-orange-50 hover:text-[#FF6A00]"
                      >
                        <Pencil size={15} />
                        Tahrirlash
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setBolimModal({ bolim: null, otaId: bolim.id });
                          setMenyuId(null);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-orange-50 hover:text-[#FF6A00]"
                      >
                        <Plus size={15} />
                        Ichki bo'lim
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          bolimniOchirish(bolim);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-bold text-red-500 transition hover:bg-red-50"
                      >
                        <Trash2 size={15} />
                        O'chirish
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="px-4 pb-4 pt-3">
              <p className="text-xs font-bold text-slate-400">Bo'ysunuvchilar</p>
              <span className="mt-1.5 inline-flex rounded-lg bg-orange-50 px-2.5 py-1 text-xs font-black text-[#FF6A00]">
                {xodimSoni} xodim
              </span>
            </div>

            <p className="border-t border-orange-100 px-4 py-2.5 text-center text-xs font-bold text-slate-400">
              {ostidagiBolimlar.length
                ? `${ostidagiBolimlar.length} ta bo'lim bo'ysunadi`
                : "bo'ysunuvchi bo'lim yo'q"}
            </p>
          </article>
        </div>

        <button
          type="button"
          onClick={() => setBolimModal({ bolim: null, otaId: bolim.id })}
          title="Ichki bo'lim qo'shish"
          aria-label="Ichki bo'lim qo'shish"
          className="z-10 -mt-3 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#FF6A00] text-white shadow-md transition hover:bg-[#EA580C]"
        >
          <Plus size={15} />
        </button>
      </div>
    );
  }

  function Tugun({ bolim }: { bolim: Bolim }) {
    const ostidagilar = bolalar.get(bolim.id) ?? [];

    return (
      <li className="flex flex-col items-center">
        <Karta bolim={bolim} />

        {ostidagilar.length > 0 && (
          <>
            <span className="h-6 w-px bg-orange-200" />
            <ul className="flex items-start">
              {ostidagilar.map((bola, index) => (
                <li key={bola.id} className="relative px-4 pt-6">
                  <span className="absolute left-1/2 top-0 h-6 w-px bg-orange-200" />
                  <span
                    className={`absolute top-0 h-px bg-orange-200 ${
                      ostidagilar.length === 1
                        ? "left-1/2 right-1/2"
                        : index === 0
                          ? "left-1/2 right-0"
                          : index === ostidagilar.length - 1
                            ? "left-0 right-1/2"
                            : "left-0 right-0"
                    }`}
                  />
                  <Tugun bolim={bola} />
                </li>
              ))}
            </ul>
          </>
        )}
      </li>
    );
  }

  const choqqilar = bolalar.get("") ?? [];

  return (
    <AppModal className="items-center justify-center bg-[rgba(54,22,8,.50)] p-4 backdrop-blur-[3px]">
      <div className="flex h-[calc(100vh-32px)] w-full flex-col overflow-hidden rounded-[28px] bg-gradient-to-br from-[#FFF8EF] via-[#FFFDF9] to-[#FFE8D2] text-[#253044] shadow-[0_34px_120px_rgba(92,38,8,.42)] ring-1 ring-white/80">
        <header className="flex items-center justify-between gap-4 border-b border-orange-100/80 bg-[#FFF8EF]/90 px-7 py-5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#FFF3E2] text-[#FF6A00]">
              <Building2 size={22} />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Tashkilot tuzilmasi</h1>
              <span className="text-xs font-black uppercase tracking-wider text-[#FF6A00]">
                Bo'limlar, rahbarlar va xodimlar
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setBolimModal({ bolim: null, otaId: tanlangan?.id ?? "" })}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#FF6A00] px-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(249,115,22,.24)] transition hover:bg-[#EA580C]"
            >
              <Plus size={16} />
              Bo'lim qo'shish
            </button>
            <button
              type="button"
              onClick={onYopish}
              aria-label="Yopish"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm transition hover:bg-orange-500 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          {/* Kanva */}
          <div className="relative min-h-0 overflow-hidden rounded-[24px] border border-orange-100 bg-white/70 shadow-sm">
            <div className="scrollbar-orange h-full overflow-auto p-8">
            <div
              style={{ transform: `scale(${masshtab / 100})`, transformOrigin: "top center" }}
              className="flex min-w-fit justify-center transition-transform"
            >
              {choqqilar.length === 0 ? (
                <p className="p-14 text-center font-bold text-gray-400">Bo'lim yo'q</p>
              ) : (
                <ul className="flex items-start gap-6">
                  {choqqilar.map((bolim) => (
                    <Tugun key={bolim.id} bolim={bolim} />
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Masshtab */}
          <div className="absolute bottom-4 left-4 flex items-center gap-1 rounded-2xl border border-orange-100 bg-white px-2 py-1.5 shadow-md">
            <button
              type="button"
              onClick={() => setMasshtab((joriy) => Math.max(50, joriy - 10))}
              aria-label="Kichraytirish"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-orange-50 hover:text-[#FF6A00]"
            >
              <Minus size={15} />
            </button>
            <span className="w-12 text-center text-xs font-black text-slate-600">{masshtab} %</span>
            <button
              type="button"
              onClick={() => setMasshtab((joriy) => Math.min(150, joriy + 10))}
              aria-label="Kattalashtirish"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-orange-50 hover:text-[#FF6A00]"
            >
              <Plus size={15} />
            </button>
          </div>
        </div>

          {/* O'ng panel */}
          {tanlangan && (
            <BolimPaneli
              bolim={tanlangan}
              xodimlar={bolimXodimlari(tanlangan.id)}
              lavozimlar={lavozimlar}
              onXodimBosildi={setTafsilotXodim}
              onTahrirlash={() => setBolimModal({ bolim: tanlangan, otaId: tanlangan.otaId })}
            />
          )}
        </div>
      </div>

      {bolimModal && (
        <BolimModal
          boshlangich={bolimModal.bolim}
          otaId={bolimModal.otaId}
          otaNomi={bolimlar.find((item) => item.id === bolimModal.otaId)?.nomi ?? "Tuzilma cho'qqisi"}
          xodimlar={
            bolimModal.bolim ? bolimXodimlari(bolimModal.bolim.id) : []
          }
          lavozimlar={lavozimlar}
          onYopish={() => setBolimModal(null)}
          onSaqlash={(bolim) => {
            onBolimSaqlash(bolim);
            setTanlanganId(bolim.id);
            setBolimModal(null);
          }}
        />
      )}

      {tafsilotXodim && (
        <XodimTafsilotlariModal
          xodim={tafsilotXodim}
          lavozimlar={lavozimlar}
          bolimlar={bolimlar}
          tarix={mockTarix}
          onTahrirlash={() => {
            setTahrirXodim(tafsilotXodim);
            setXodimModal(true);
          }}
          onYopish={() => setTafsilotXodim(null)}
        />
      )}

      {xodimModal && (
        <XodimFormaModal
          boshlangich={tahrirXodim}
          lavozimlar={lavozimlar}
          bolimlar={bolimlar}
          tarix={mockTarix}
          onYopish={() => setXodimModal(false)}
          onSaqlash={(xodim) => {
            onXodimSaqlash(xodim);
            setTafsilotXodim((joriy) => (joriy?.id === xodim.id ? xodim : joriy));
            setXodimModal(false);
          }}
        />
      )}
    </AppModal>
  );
}

function BolimPaneli({
  bolim,
  xodimlar,
  lavozimlar,
  onXodimBosildi,
  onTahrirlash,
}: {
  bolim: Bolim;
  xodimlar: Xodim[];
  lavozimlar: Lavozim[];
  onXodimBosildi: (xodim: Xodim) => void;
  onTahrirlash: () => void;
}) {
  const [qidiruv, setQidiruv] = useState("");

  const mos = (xodim: Xodim) => {
    const soz = qidiruv.trim().toLowerCase();
    if (!soz) return true;
    return [xodimNomi(xodim), lavozimNomi(lavozimlar, xodim.lavozimId)]
      .join(" ")
      .toLowerCase()
      .includes(soz);
  };

  const rahbarlar = xodimlar.filter((xodim) => bolim.rahbarIdlar.includes(xodim.id) && mos(xodim));
  const boysunuvchilar = xodimlar.filter(
    (xodim) => !bolim.rahbarIdlar.includes(xodim.id) && mos(xodim)
  );

  return (
    <aside className="flex min-h-0 flex-col rounded-[24px] border border-orange-100 bg-white shadow-sm">
      <header className="border-b border-orange-100 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="truncate text-xl font-black text-slate-900">{bolim.nomi}</h2>
          <button
            type="button"
            onClick={onTahrirlash}
            aria-label="Bo'limni tahrirlash"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#FFF3E2] text-[#FF6A00] transition hover:bg-orange-500 hover:text-white"
          >
            <Pencil size={15} />
          </button>
        </div>

        <span className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-orange-100 bg-orange-50/60 px-3 py-1.5 text-xs font-black text-slate-600">
          Jami xodimlar
          <span className="text-[#FF6A00]">{xodimlar.length}</span>
        </span>
      </header>

      <div className="px-5 py-3">
        <label className="flex h-10 items-center gap-2 rounded-xl border border-orange-100 bg-white px-3">
          <Search size={15} className="text-gray-400" />
          <input
            value={qidiruv}
            onChange={(event) => setQidiruv(event.target.value)}
            className="min-w-0 flex-1 text-sm font-semibold outline-none"
            placeholder="Ism yoki lavozim bo'yicha topish"
          />
        </label>
      </div>

      <div className="scrollbar-orange flex-1 space-y-4 overflow-y-auto px-5 pb-5">
        <Guruh
          nom="Rahbarlar"
          xodimlar={rahbarlar}
          lavozimlar={lavozimlar}
          bosh="Rahbar tayinlanmagan"
          onXodimBosildi={onXodimBosildi}
        />
        <Guruh
          nom="Bo'ysunuvchilar"
          xodimlar={boysunuvchilar}
          lavozimlar={lavozimlar}
          bosh="Bo'limda xodim yo'q"
          onXodimBosildi={onXodimBosildi}
        />
      </div>
    </aside>
  );
}

function Guruh({
  nom,
  xodimlar,
  lavozimlar,
  bosh,
  onXodimBosildi,
}: {
  nom: string;
  xodimlar: Xodim[];
  lavozimlar: Lavozim[];
  bosh: string;
  onXodimBosildi: (xodim: Xodim) => void;
}) {
  const [ochiq, setOchiq] = useState(true);

  return (
    <section>
      <button
        type="button"
        onClick={() => setOchiq((joriy) => !joriy)}
        className="flex w-full items-center gap-2 py-2 text-left"
      >
        <ChevronDown size={15} className={`text-[#FF6A00] transition ${ochiq ? "" : "-rotate-90"}`} />
        <span className="font-black text-slate-800">{nom}</span>
        <span className="font-black text-slate-400">{xodimlar.length}</span>
      </button>

      {ochiq && (
        <div className="space-y-1.5">
          {xodimlar.map((xodim) => (
            <button
              key={xodim.id}
              type="button"
              onClick={() => onXodimBosildi(xodim)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-orange-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-50 text-xs font-black text-orange-500">
                {bosHarflar(xodim) || <UserRound size={16} />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-slate-800">
                  {xodimNomi(xodim)}
                </span>
                <span className="block truncate text-xs font-semibold text-slate-400">
                  {lavozimNomi(lavozimlar, xodim.lavozimId) || "Lavozim ko'rsatilmagan"}
                </span>
              </span>
            </button>
          ))}

          {xodimlar.length === 0 && (
            <p className="rounded-xl bg-slate-50 px-3 py-3 text-xs font-bold text-slate-400">{bosh}</p>
          )}
        </div>
      )}
    </section>
  );
}
