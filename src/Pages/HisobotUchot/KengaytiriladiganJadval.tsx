import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { Check, Settings, Trash2 } from "lucide-react";

// Ustun kengligini sichqoncha bilan o'zgartirsa (resize) va sudrab joyini
// almashtirsa (reorder) bo'ladigan umumiy hisobot jadvali.

export type Ustun<T> = {
  id: string;
  nom: string;
  kenglik?: number; // boshlang'ich piksel kenglik
  hizalash?: "left" | "right" | "center"; // katak matnini tekislash
  katak: (row: T) => ReactNode;
  jami?: () => ReactNode; // footer katagi (ixtiyoriy)
};

function hizKlass(hizalash?: "left" | "right" | "center") {
  return hizalash === "right" ? "text-right" : hizalash === "center" ? "text-center" : "text-left";
}

const MIN_KENGLIK = 70;
const ODATIY_KENGLIK = 140;

export default function KengaytiriladiganJadval<T extends { id: string }>({
  ustunlar,
  qatorlar,
  jamiBor = false,
  onQatorBosildi,
  kengaytir = true,
  qatorKlass,
  sozlamaBor = false,
  onQatorOchirish,
}: {
  ustunlar: Ustun<T>[];
  qatorlar: T[];
  jamiBor?: boolean;
  onQatorBosildi?: (row: T) => void;
  kengaytir?: boolean; // true — jadval konteynerni to'ldirib oxirigacha cho'ziladi
  qatorKlass?: (row: T) => string; // qatorga qo'shimcha klass (masalan guruh sarlavhasi)
  sozlamaBor?: boolean; // true — jadval oxirida ustunlarni sozlash (yashirish) tugmasi
  onQatorOchirish?: (row: T) => void; // oxirgi ustunda (⚙ ostida) har qator uchun o'chirish tugmasi
}) {
  const [tartib, setTartib] = useState<string[]>(() => ustunlar.map((u) => u.id));
  const [kengliklar, setKengliklar] = useState<Record<string, number>>(() =>
    Object.fromEntries(ustunlar.map((u) => [u.id, u.kenglik ?? ODATIY_KENGLIK]))
  );
  const [sudralayotgan, setSudralayotgan] = useState<string | null>(null);
  const [nishon, setNishon] = useState<string | null>(null);
  const [yashirin, setYashirin] = useState<Set<string>>(() => new Set());
  const [sozlamaOchiq, setSozlamaOchiq] = useState(false);
  const SOZLAMA_KENGLIK = 52;

  // Ustunlar ro'yxati o'zgarsa (qo'shildi/olib tashlandi) tartib va kengliklarni moslaymiz.
  useEffect(() => {
    setTartib((old) => {
      const mavjud = old.filter((id) => ustunlar.some((u) => u.id === id));
      const yangi = ustunlar.filter((u) => !old.includes(u.id)).map((u) => u.id);
      return yangi.length === 0 && mavjud.length === old.length ? old : [...mavjud, ...yangi];
    });
    setKengliklar((old) => {
      let ozgardi = false;
      const natija = { ...old };
      for (const u of ustunlar) {
        if (!(u.id in natija)) {
          natija[u.id] = u.kenglik ?? ODATIY_KENGLIK;
          ozgardi = true;
        }
      }
      return ozgardi ? natija : old;
    });
  }, [ustunlar]);

  const tartiblangan = tartib
    .map((id) => ustunlar.find((u) => u.id === id))
    .filter((u): u is Ustun<T> => Boolean(u));

  const korinadigan = tartiblangan.filter((u) => !yashirin.has(u.id));

  // Oxirgi (amallar) ustuni: header'da ⚙, qatorlarda o'chirish tugmasi.
  const amallarUstuni = sozlamaBor || Boolean(onQatorOchirish);

  const jamiKenglik =
    korinadigan.reduce((s, u) => s + (kengliklar[u.id] ?? ODATIY_KENGLIK), 0) +
    (amallarUstuni ? SOZLAMA_KENGLIK : 0);

  // --- Kenglikni o'zgartirish (self-contained listenerlar) ---
  function resizeBoshla(e: MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = kengliklar[id] ?? ODATIY_KENGLIK;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    function harakat(ev: globalThis.MouseEvent) {
      const yangi = Math.max(MIN_KENGLIK, startW + (ev.clientX - startX));
      setKengliklar((old) => ({ ...old, [id]: yangi }));
    }
    function tugat() {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", harakat);
      window.removeEventListener("mouseup", tugat);
    }
    window.addEventListener("mousemove", harakat);
    window.addEventListener("mouseup", tugat);
  }

  // --- Joyini almashtirish (drag & drop) ---
  function tashla(maqsadId: string) {
    setNishon(null);
    if (!sudralayotgan || sudralayotgan === maqsadId) {
      setSudralayotgan(null);
      return;
    }
    setTartib((old) => {
      const yangi = old.filter((id) => id !== sudralayotgan);
      const idx = yangi.indexOf(maqsadId);
      yangi.splice(idx < 0 ? yangi.length : idx, 0, sudralayotgan);
      return yangi;
    });
    setSudralayotgan(null);
  }

  return (
    <div className="scrollbar-orange w-full overflow-x-auto rounded-2xl border border-orange-100">
      <table
        className="min-w-full text-left text-sm"
        style={
          kengaytir
            ? { tableLayout: "fixed", width: "100%", minWidth: jamiKenglik }
            : { tableLayout: "fixed", width: jamiKenglik }
        }
      >
        <colgroup>
          {korinadigan.map((u) => (
            <col key={u.id} style={{ width: kengliklar[u.id] ?? ODATIY_KENGLIK }} />
          ))}
          {amallarUstuni && <col style={{ width: SOZLAMA_KENGLIK }} />}
        </colgroup>
        <thead className="bg-orange-50 text-xs uppercase tracking-wide text-orange-900/60">
          <tr>
            {korinadigan.map((u) => (
              <th
                key={u.id}
                className={`relative select-none px-4 py-4 ${
                  nishon === u.id ? "bg-orange-100" : ""
                }`}
              >
                <span
                  draggable
                  onDragStart={() => setSudralayotgan(u.id)}
                  onDragEnter={() => sudralayotgan && setNishon(u.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => tashla(u.id)}
                  onDragEnd={() => {
                    setSudralayotgan(null);
                    setNishon(null);
                  }}
                  title={u.nom}
                  className={`block cursor-grab truncate pr-2 active:cursor-grabbing ${hizKlass(
                    u.hizalash
                  )} ${sudralayotgan === u.id ? "opacity-40" : ""}`}
                >
                  {u.nom}
                </span>
                <span
                  onMouseDown={(e) => resizeBoshla(e, u.id)}
                  className="absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize hover:bg-orange-300"
                />
              </th>
            ))}
            {amallarUstuni && (
              <th className="relative px-3 py-4">
                <div className="flex justify-end">
                  {sozlamaBor && (
                  <button
                    type="button"
                    onClick={() => setSozlamaOchiq((old) => !old)}
                    title="Ustunlarni sozlash"
                    aria-label="Ustunlarni sozlash"
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition ${
                      sozlamaOchiq
                        ? "bg-orange-100 text-orange-600"
                        : "text-orange-400 hover:bg-orange-100 hover:text-orange-600"
                    }`}
                  >
                    <Settings size={16} />
                  </button>
                  )}
                </div>
                {sozlamaOchiq && (
                  <>
                    <button
                      type="button"
                      aria-label="Yopish"
                      onClick={() => setSozlamaOchiq(false)}
                      className="fixed inset-0 z-40 cursor-default"
                    />
                    <div className="absolute right-2 top-12 z-50 w-56 rounded-2xl border border-orange-100 bg-white p-1.5 text-left normal-case tracking-normal shadow-[0_18px_50px_rgba(92,38,8,.16)]">
                      <p className="px-3 py-1.5 text-xs font-black uppercase tracking-wide text-slate-400">
                        Ustunlar
                      </p>
                      {tartiblangan.map((u) => {
                        const korinmoqda = !yashirin.has(u.id);
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() =>
                              setYashirin((old) => {
                                const yangi = new Set(old);
                                if (yangi.has(u.id)) yangi.delete(u.id);
                                else yangi.add(u.id);
                                return yangi;
                              })
                            }
                            className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-orange-50"
                          >
                            <span className="truncate">{u.nom}</span>
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
                                korinmoqda
                                  ? "bg-[#FF6A00] text-white"
                                  : "bg-slate-100 text-slate-300"
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
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-orange-100/70">
          {qatorlar.map((row) => (
            <tr
              key={row.id}
              onClick={onQatorBosildi ? () => onQatorBosildi(row) : undefined}
              className={`hover:bg-orange-50/50 ${onQatorBosildi ? "cursor-pointer" : ""} ${
                qatorKlass?.(row) ?? ""
              }`}
            >
              {korinadigan.map((u) => (
                <td key={u.id} className={`truncate px-4 py-4 font-semibold text-gray-700 ${hizKlass(u.hizalash)}`}>
                  {u.katak(row)}
                </td>
              ))}
              {amallarUstuni && (
                <td className="px-3 py-4">
                  {onQatorOchirish && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQatorOchirish(row);
                        }}
                        aria-label="O'chirish"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500 transition hover:bg-red-100"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
        {jamiBor && (
          <tfoot className="border-t border-orange-100 bg-orange-50/40 text-sm font-black text-gray-700">
            <tr>
              {korinadigan.map((u) => (
                <td key={u.id} className={`truncate px-4 py-4 ${hizKlass(u.hizalash)}`}>
                  {u.jami?.()}
                </td>
              ))}
              {amallarUstuni && <td />}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
