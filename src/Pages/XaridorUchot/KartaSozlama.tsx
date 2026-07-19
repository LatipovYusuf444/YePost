import { useState, type MouseEvent } from "react";
import { Check, Settings } from "lucide-react";

export type Maydon = { id: string; nom: string };

// Kartadagi ⚙ tugma — jadvaldagi "Ustunlar" menyusi kabi, qaysi maydon
// ko'rinishini tanlash uchun. Sozlama ro'yxatdagi barcha kartalarga tegishli.
export default function KartaSozlama({
  maydonlar,
  yashirin,
  onToggle,
}: {
  maydonlar: Maydon[];
  yashirin: Set<string>;
  onToggle: (id: string) => void;
}) {
  const [ochiq, setOchiq] = useState(false);

  function toxtat(event: MouseEvent) {
    event.stopPropagation();
  }

  return (
    <div className="relative" onClick={toxtat}>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOchiq((oldingi) => !oldingi);
        }}
        title="Maydonlarni sozlash"
        aria-label="Maydonlarni sozlash"
        className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
          ochiq
            ? "bg-orange-500 text-white"
            : "bg-[#FFF3E2] text-[#FF6A00] hover:bg-orange-500 hover:text-white"
        }`}
      >
        <Settings size={16} />
      </button>

      {ochiq && (
        <>
          <button
            type="button"
            aria-label="Yopish"
            onClick={(event) => {
              event.stopPropagation();
              setOchiq(false);
            }}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute right-0 top-11 z-50 w-56 rounded-2xl border border-orange-100 bg-white p-1.5 text-left shadow-[0_18px_50px_rgba(92,38,8,.16)]">
            <p className="px-3 py-1.5 text-xs font-black uppercase tracking-wide text-slate-400">
              Maydonlar
            </p>
            {maydonlar.map((maydon) => {
              const korinmoqda = !yashirin.has(maydon.id);
              return (
                <button
                  key={maydon.id}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggle(maydon.id);
                  }}
                  className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-orange-50"
                >
                  <span className="truncate">{maydon.nom}</span>
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      korinmoqda ? "bg-[#FF6A00] text-white" : "bg-slate-100 text-slate-300"
                    }`}
                  >
                    {korinmoqda && <Check size={13} />}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
