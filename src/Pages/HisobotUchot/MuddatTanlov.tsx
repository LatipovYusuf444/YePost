import { bugun, bugunMinus, oyBoshi } from "./yordamchilar";

// Muddat (davr) tanlash bloki: sana oralig'i + tez tugmalar + tozalash.
export default function MuddatTanlov({
  dateFrom,
  dateTo,
  onChange,
}: {
  dateFrom: string;
  dateTo: string;
  onChange: (dateFrom: string, dateTo: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-gray-700">Muddat</span>
        <button
          type="button"
          onClick={() => onChange("", "")}
          className="text-[11px] font-bold uppercase tracking-wide text-orange-500 hover:text-orange-600"
        >
          tozalash
        </button>
      </div>
      <div className="mt-1.5 flex items-center gap-1.5">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onChange(e.target.value, dateTo)}
          className="h-10 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-xs outline-none focus:border-orange-400"
        />
        <span className="text-gray-400">—</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onChange(dateFrom, e.target.value)}
          className="h-10 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-xs outline-none focus:border-orange-400"
        />
      </div>
      <div className="mt-1.5 flex flex-wrap gap-2.5 text-xs font-bold text-orange-500">
        <button type="button" className="hover:text-orange-600" onClick={() => onChange(bugun(), bugun())}>
          Bugun
        </button>
        <button
          type="button"
          className="hover:text-orange-600"
          onClick={() => onChange(bugunMinus(1), bugunMinus(1))}
        >
          Kecha
        </button>
        <button type="button" className="hover:text-orange-600" onClick={() => onChange(bugunMinus(6), bugun())}>
          Hafta
        </button>
        <button type="button" className="hover:text-orange-600" onClick={() => onChange(oyBoshi(), bugun())}>
          Oy
        </button>
      </div>
    </div>
  );
}
