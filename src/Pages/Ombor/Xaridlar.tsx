import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FileText, LoaderCircle, Plus, Search, Settings } from "lucide-react";
import { useOmborStore } from "@/store/omborStore";
import type { KirimHujjati } from "@/types/ombor";
import { holat, hujjatRaqami, pul, sana } from "./omborYordamchilari";
import KirimTafsilotModal from "./KirimTafsilotModal";
import YangiKirimModal from "./YangiKirimModal";
import OmborJadval from "./OmborJadval";

type UstunKaliti = "nomi" | "yetkazibBeruvchi" | "sana" | "masul" | "status" | "summa";

const USTUNLAR: Array<{ kalit: UstunKaliti; nom: string; kenglik: number }> = [
  { kalit: "nomi", nom: "Nomi", kenglik: 250 },
  { kalit: "yetkazibBeruvchi", nom: "Yetkazib beruvchi", kenglik: 260 },
  { kalit: "sana", nom: "Sana", kenglik: 220 },
  { kalit: "masul", nom: "Mas'ul shaxs", kenglik: 230 },
  { kalit: "status", nom: "Status", kenglik: 210 },
  { kalit: "summa", nom: "Summa", kenglik: 220 },
];

function holatBadgeSinfi(status?: string) {
  const s = String(status ?? "DRAFT").toUpperCase();
  if (s === "CONFIRMED") return "bg-emerald-50 text-emerald-600";
  if (s === "CANCELLED" || s === "CANCELED") return "bg-red-50 text-red-500";
  return "bg-gray-100 text-gray-500";
}

export default function Xaridlar() {
  const store = useOmborStore();
  const malumotlarniYuklash = store.malumotlarniYuklash;
  const [qidiruv, setQidiruv] = useState("");
  const [modal, setModal] = useState(false);
  const [tanlanganId, setTanlanganId] = useState<string | null>(null);
  const [sozlamaOchiq, setSozlamaOchiq] = useState(false);
  const [sozlamaJoylashuvi, setSozlamaJoylashuvi] = useState({ top: 0, left: 0 });
  const sozlamaTugmaRef = useRef<HTMLButtonElement | null>(null);
  const sozlamaRef = useRef<HTMLDivElement | null>(null);
  const [korinadiganUstunlar, setKorinadiganUstunlar] = useState<Record<UstunKaliti, boolean>>(
    () => Object.fromEntries(USTUNLAR.map((ustun) => [ustun.kalit, true])) as Record<UstunKaliti, boolean>
  );

  const faolUstunlar = USTUNLAR.filter((ustun) => korinadiganUstunlar[ustun.kalit]);

  const sozlamaJoylashuviniYangilash = useCallback(() => {
    const rect = sozlamaTugmaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const kenglik = 300;
    const balandlik = 350;
    const left = Math.min(window.innerWidth - kenglik - 12, Math.max(12, rect.right - kenglik));
    const pastga = rect.bottom + 10;
    const top = pastga + balandlik <= window.innerHeight - 12
      ? pastga
      : Math.max(12, rect.top - balandlik - 10);
    setSozlamaJoylashuvi({ top, left });
  }, []);

  useEffect(() => {
    if (!sozlamaOchiq) return;
    const tashqarigaBosish = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!sozlamaRef.current?.contains(target) && !sozlamaTugmaRef.current?.contains(target)) {
        setSozlamaOchiq(false);
      }
    };
    sozlamaJoylashuviniYangilash();
    document.addEventListener("mousedown", tashqarigaBosish);
    window.addEventListener("resize", sozlamaJoylashuviniYangilash);
    window.addEventListener("scroll", sozlamaJoylashuviniYangilash, true);
    return () => {
      document.removeEventListener("mousedown", tashqarigaBosish);
      window.removeEventListener("resize", sozlamaJoylashuviniYangilash);
      window.removeEventListener("scroll", sozlamaJoylashuviniYangilash, true);
    };
  }, [sozlamaJoylashuviniYangilash, sozlamaOchiq]);

  useEffect(() => {
    void malumotlarniYuklash();
  }, [malumotlarniYuklash]);

  const suppliersMap = useMemo(
    () => new Map(store.yetkazibBeruvchilar.map((item) => [item.id, item])),
    [store.yetkazibBeruvchilar]
  );

  const xodimlarMap = useMemo(
    () => new Map(store.xodimlar.map((item) => [item.id, item])),
    [store.xodimlar]
  );

  function supplierNomi(id: string, name?: string) {
    return name ?? suppliersMap.get(id)?.name ?? suppliersMap.get(id)?.fullName ?? id;
  }

  function masulNomi(hujjat: KirimHujjati) {
    const xodim = hujjat.responsibleId ? xodimlarMap.get(hujjat.responsibleId) : undefined;
    return (
      hujjat.responsible?.fullName ??
      hujjat.responsible?.username ??
      xodim?.fullName ??
      xodim?.username ??
      "Biriktirilmagan"
    );
  }

  function kirimSummasi(hujjat: KirimHujjati) {
    const backendSumma = Number(hujjat.totalAmount ?? hujjat.total ?? 0);
    if (backendSumma > 0) return backendSumma;
    return (hujjat.items ?? []).reduce(
      (summa, item) => summa + Number(item.quantity ?? 0) * Number(item.price ?? 0),
      0
    );
  }

  function kirimNomi(hujjat: KirimHujjati) {
    const match = (hujjat.note ?? "").trim().match(/^Nomi:\s*(.+?)\s*(?:\|.*)?$/);
    return match?.[1]?.trim() || "Kirim hujjati";
  }

  const royxat = useMemo(() => {
    const q = qidiruv.trim().toLowerCase();
    if (!q) return store.kirimlar;
    return store.kirimlar.filter((hujjat) => {
      const matn = [
        kirimNomi(hujjat),
        hujjatRaqami(hujjat),
        supplierNomi(hujjat.supplierId, hujjat.supplier?.name),
        masulNomi(hujjat),
        sana(hujjat.createdAt),
        holat(hujjat.status),
      ]
        .join(" ")
        .toLowerCase();
      return matn.includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.kirimlar, qidiruv, suppliersMap, store.xodimlar]);

  function ustunniAlmashtirish(kalit: UstunKaliti) {
    setKorinadiganUstunlar((oldingi) => {
      const korinadiganlarSoni = Object.values(oldingi).filter(Boolean).length;
      if (oldingi[kalit] && korinadiganlarSoni === 1) return oldingi;
      return { ...oldingi, [kalit]: !oldingi[kalit] };
    });
  }

  function katak(hujjat: KirimHujjati, kalit: UstunKaliti): ReactNode {
    switch (kalit) {
      case "nomi":
        return (
          <>
            <p className="font-black text-gray-950">{kirimNomi(hujjat)}</p>
            <p className="text-xs font-semibold text-orange-500">{hujjatRaqami(hujjat)}</p>
          </>
        );
      case "yetkazibBeruvchi":
        return supplierNomi(hujjat.supplierId, hujjat.supplier?.name);
      case "sana":
        return sana(hujjat.createdAt);
      case "masul":
        return masulNomi(hujjat);
      case "status":
        return (
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${holatBadgeSinfi(hujjat.status)}`}>
            {holat(hujjat.status)}
          </span>
        );
      case "summa":
        return <span className="font-bold text-gray-700">{pul(kirimSummasi(hujjat))}</span>;
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-950">Kirim</h1>
          <p className="mt-1 text-sm text-gray-500">Omborga tovar kirim qilish hujjatlari.</p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-black text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600"
        >
          <Plus size={17} />
          Yaratish
        </button>
      </header>

      <div className="relative max-w-sm">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={qidiruv}
          onChange={(event) => setQidiruv(event.target.value)}
          placeholder="Nomi, yetkazib beruvchi, mas'ul shaxs, sana yoki holati bo'yicha qidirish"
          className="h-11 w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-orange-400"
        />
      </div>

      {store.xatolik && (
        <div className="flex items-start justify-between gap-3 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
          <span>{store.xatolik}</span>
          <button onClick={store.xatolikniTozalash} className="shrink-0 text-red-400 hover:text-red-600">
            Yopish
          </button>
        </div>
      )}

      <OmborJadval>
          <table
            className="w-full table-fixed text-left text-sm"
            style={{ minWidth: Math.max(560, faolUstunlar.reduce((jami, ustun) => jami + ustun.kenglik, 76)) }}
          >
            <colgroup>
              {faolUstunlar.map((ustun) => <col key={ustun.kalit} style={{ width: ustun.kenglik }} />)}
              <col style={{ width: 76 }} />
            </colgroup>
            <thead className="bg-orange-50/60 text-xs font-bold uppercase tracking-wide text-orange-500">
              <tr>
                {faolUstunlar.map((ustun) => <th key={ustun.kalit}>{ustun.nom}</th>)}
                <th className="sticky right-0 z-10 bg-[#fff9f3] text-right">
                  <button
                    ref={sozlamaTugmaRef}
                    type="button"
                    onClick={() => {
                      if (!sozlamaOchiq) sozlamaJoylashuviniYangilash();
                      setSozlamaOchiq((oldingi) => !oldingi);
                    }}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-500 transition hover:bg-orange-100"
                    aria-label="Ko'rinadigan ustunlarni sozlash"
                    aria-expanded={sozlamaOchiq}
                  >
                    <Settings size={18} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {store.yuklanmoqda ? (
                <tr>
                  <td colSpan={faolUstunlar.length + 1} className="px-6 py-16 text-center">
                    <LoaderCircle className="mx-auto animate-spin text-orange-500" size={28} />
                  </td>
                </tr>
              ) : (
                royxat.map((hujjat) => {
                  return (
                    <tr
                      key={hujjat.id}
                      onClick={() => setTanlanganId(hujjat.id)}
                      className="cursor-pointer hover:bg-orange-50/30"
                    >
                      {faolUstunlar.map((ustun) => (
                        <td key={ustun.kalit} className="overflow-hidden text-gray-700">
                          <div className="truncate">{katak(hujjat, ustun.kalit)}</div>
                        </td>
                      ))}
                      <td className="sticky right-0 bg-white" />
                    </tr>
                  );
                })
              )}
              {!store.yuklanmoqda && royxat.length === 0 && (
                <tr>
                  <td colSpan={faolUstunlar.length + 1} className="p-14 text-center">
                    <FileText className="mx-auto text-orange-200" size={42} />
                    <p className="mt-3 font-bold text-gray-500">Kirim hujjati topilmadi</p>
                    <p className="mt-1 text-sm text-gray-400">
                      "Yaratish" tugmasi orqali yangi kirim qo'shing.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
      </OmborJadval>

      {sozlamaOchiq &&
        createPortal(
          <div
            ref={sozlamaRef}
            role="menu"
            className="fixed z-[99990] w-[300px] rounded-[22px] border border-orange-100 bg-white p-4 shadow-[0_22px_65px_rgba(15,23,42,.2)]"
            style={{ top: sozlamaJoylashuvi.top, left: sozlamaJoylashuvi.left }}
          >
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">
              Ko'rinadigan ustunlar
            </p>
            {USTUNLAR.map((ustun) => (
              <label
                key={ustun.kalit}
                className="flex cursor-pointer items-center gap-3 rounded-xl px-1 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-orange-50"
              >
                <input
                  type="checkbox"
                  checked={korinadiganUstunlar[ustun.kalit]}
                  onChange={() => ustunniAlmashtirish(ustun.kalit)}
                  className="h-5 w-5 accent-orange-500"
                />
                {ustun.nom}
              </label>
            ))}
          </div>,
          document.body
        )}

      {modal && <YangiKirimModal onClose={() => setModal(false)} />}

      {tanlanganId && (
        <KirimTafsilotModal id={tanlanganId} onClose={() => setTanlanganId(null)} />
      )}

    </div>
  );
}
