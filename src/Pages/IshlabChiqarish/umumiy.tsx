import { useEffect, useState, type ReactNode } from "react";
import { LoaderCircle, Plus, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import AppModal from "@/Components/common/AppModal";
import AppSelect from "@/Components/ui/AppSelect";
import { katalogQidiruvQatoriniMoslash } from "@/api/catalogSearch";
import { modifikatsiyalarApi } from "@/api/catalogApi";
import type { MahsulotModifikatsiyasi } from "@/types/catalog";
import type { Ombor } from "@/types/ombor";

export const inputKlass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";
export const tugmaAsosiy =
  "inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white shadow-lg shadow-orange-100 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50";
export const tugmaIkkinchi =
  "inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-white px-5 text-sm font-black text-orange-600 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50";
export const tugmaXavfli =
  "inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-red-50 px-5 text-sm font-black text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50";

export function Sahifa({ sarlavha, izoh, amal, children }: { sarlavha: string; izoh?: string; amal?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-slate-900">{sarlavha}</h1>
          {izoh && <p className="mt-1 max-w-3xl text-sm font-semibold text-slate-500">{izoh}</p>}
        </div>
        {amal && <div className="flex flex-wrap items-center gap-2">{amal}</div>}
      </div>
      {children}
    </section>
  );
}

export function XatoQutisi({ matn, id }: { matn: string; id?: string }) {
  if (!matn) return null;
  return <p id={id} role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{matn}</p>;
}

export function Ogohlantirish({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">{children}</p>;
}

const HOLAT_RANGI: Record<string, string> = {
  DRAFT: "bg-amber-50 text-amber-700 ring-amber-100",
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  RELEASED: "bg-sky-50 text-sky-700 ring-sky-100",
  IN_PROGRESS: "bg-sky-50 text-sky-700 ring-sky-100",
  CONFIRMED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  IN_STOCK: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  CLOSED: "bg-slate-100 text-slate-600 ring-slate-200",
  ARCHIVED: "bg-slate-100 text-slate-600 ring-slate-200",
  USED: "bg-slate-100 text-slate-600 ring-slate-200",
  CANCELLED: "bg-red-50 text-red-600 ring-red-100",
};

export function Holat({ status }: { status?: string | null }) {
  const { t } = useTranslation("ishlab_chiqarish");
  if (!status) return null;
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${HOLAT_RANGI[status] ?? "bg-slate-100 text-slate-600 ring-slate-200"}`}>{t(`status.${status}`, { defaultValue: status })}</span>;
}

export function Maydon({ nom, children, izoh }: { nom: string; children: ReactNode; izoh?: string }) {
  return (
    <label className="grid min-w-0 gap-1.5">
      <span className="text-xs font-bold text-slate-500">{nom}</span>
      {children}
      {izoh && <span className="text-[11px] font-semibold text-slate-400">{izoh}</span>}
    </label>
  );
}

export function Oyna({ sarlavha, belgi, onYopish, keng = false, pastki, children }: { sarlavha: string; belgi?: ReactNode; onYopish: () => void; keng?: boolean; pastki?: ReactNode; children: ReactNode }) {
  const { t } = useTranslation("ishlab_chiqarish");
  return (
    <AppModal onClose={onYopish}>
      <div className={`flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_30px_90px_rgba(15,23,42,.24)] ${keng ? "max-w-5xl" : "max-w-xl"}`}>
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="min-w-0 truncate text-lg font-black text-slate-900">{sarlavha}</h2>
            {belgi}
          </div>
          <button type="button" onClick={onYopish} aria-label={t("actions.close")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"><X size={17} /></button>
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">{children}</div>
        {pastki && <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">{pastki}</footer>}
      </div>
    </AppModal>
  );
}

export type Ustun<T> = { nom: string; katak: (qator: T) => ReactNode; ong?: boolean };

export function Jadval<T>({ ustunlar, qatorlar, kalit, onBos, bosh }: { ustunlar: Ustun<T>[]; qatorlar: T[]; kalit: (qator: T, indeks: number) => string; onBos?: (qator: T) => void; bosh: string }) {
  if (qatorlar.length === 0) return <p className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-10 text-center text-sm font-bold text-slate-400">{bosh}</p>;
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-slate-50 text-xs font-black uppercase text-slate-400">
          <tr>{ustunlar.map((ustun) => <th key={ustun.nom} className={`px-4 py-3 ${ustun.ong ? "text-right" : ""}`}>{ustun.nom}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {qatorlar.map((qator, indeks) => (
            <tr key={kalit(qator, indeks)} onClick={onBos ? () => onBos(qator) : undefined} className={onBos ? "cursor-pointer hover:bg-orange-50/50" : ""}>
              {ustunlar.map((ustun) => <td key={ustun.nom} className={`px-4 py-3 font-semibold text-slate-700 ${ustun.ong ? "text-right tabular-nums" : ""}`}>{ustun.katak(qator)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Yuklanmoqda() {
  const { t } = useTranslation("ishlab_chiqarish");
  return <p className="flex items-center gap-2 rounded-2xl bg-white p-6 text-sm font-bold text-slate-400"><LoaderCircle size={17} className="animate-spin text-orange-500" />{t("loading")}</p>;
}

export function HolatFiltri({ qiymat, onChange, holatlar }: { qiymat: string; onChange: (qiymat: string) => void; holatlar: string[] }) {
  const { t } = useTranslation("ishlab_chiqarish");
  return (
    <AppSelect value={qiymat} onChange={(event) => onChange(event.target.value)} aria-label={t("filters.status")} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
      <option value="">{t("filters.allStatuses")}</option>
      {holatlar.map((holat) => <option key={holat} value={holat}>{t(`status.${holat}`, { defaultValue: holat })}</option>)}
    </AppSelect>
  );
}

export function OmborTanlash({ value, onChange, omborlar, sexMi, disabled, ariaLabel }: { value: string; onChange: (id: string) => void; omborlar: Ombor[]; sexMi?: boolean; disabled?: boolean; ariaLabel?: string }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const variantlar = sexMi ? omborlar.filter((ombor) => ombor.kind === "WIP" || ombor.id === value) : omborlar;
  return (
    <AppSelect value={value} disabled={disabled} aria-label={ariaLabel} onChange={(event) => onChange(event.target.value)} className={inputKlass}>
      <option value="">{t(sexMi ? "fields.selectWip" : "fields.selectWarehouse")}</option>
      {variantlar.map((ombor) => <option key={ombor.id} value={ombor.id}>{ombor.name}</option>)}
    </AppSelect>
  );
}

function modifikatsiyaNomi(mod: MahsulotModifikatsiyasi) {
  const variant = mod.name && mod.name !== "Asosiy variant" && mod.name !== mod.product?.name ? mod.name : "";
  return [mod.product?.name, variant].filter(Boolean).join(" / ") || mod.name || mod.barcode;
}

/** Mahsulot tanlash: so'z serverda qidiriladi (narxsiz), butun katalog yuklanmaydi. */
export function MahsulotQidiruvi({ value, nom, onChange, disabled, ariaLabel }: { value: string; nom?: string; onChange: (id: string, nom: string) => void; disabled?: boolean; ariaLabel?: string }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const [soz, setSoz] = useState<string | null>(null);
  const [natijalar, setNatijalar] = useState<MahsulotModifikatsiyasi[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const matn = soz?.trim() ?? "";
  useEffect(() => {
    if (!matn) { setNatijalar([]); setYuklanmoqda(false); return; }
    let faol = true;
    setYuklanmoqda(true);
    const taymer = window.setTimeout(() => {
      modifikatsiyalarApi.qidiruvSahifasi({ search: matn, pageSize: 20 })
        .then((sahifa) => { if (faol) setNatijalar(sahifa.items.flatMap((qator) => { const mod = katalogQidiruvQatoriniMoslash(qator); return mod?.id ? [mod] : []; })); })
        .catch(() => { if (faol) setNatijalar([]); })
        .finally(() => { if (faol) setYuklanmoqda(false); });
    }, 300);
    return () => { faol = false; window.clearTimeout(taymer); };
  }, [matn]);
  return (
    <div className="min-w-0">
      <input
        value={soz ?? (value ? nom ?? "" : "")}
        disabled={disabled}
        aria-label={ariaLabel ?? t("fields.product")}
        placeholder={t("fields.productSearch")}
        onChange={(event) => setSoz(event.target.value)}
        onBlur={() => window.setTimeout(() => setSoz(null), 150)}
        className={inputKlass}
      />
      {soz !== null && matn && (
        <div className="mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-100 bg-white p-1 shadow-sm">
          {yuklanmoqda ? (
            <p className="px-3 py-2 text-xs font-semibold text-slate-400">{t("loading")}</p>
          ) : natijalar.length === 0 ? (
            <p className="px-3 py-2 text-xs font-semibold text-slate-400">{t("empty.products")}</p>
          ) : natijalar.map((mod) => (
            <button
              key={mod.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => { onChange(mod.id, modifikatsiyaNomi(mod)); setSoz(null); }}
              className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-orange-50"
            >
              <span className="min-w-0 truncate">{modifikatsiyaNomi(mod)}</span>
              <span className="shrink-0 text-xs text-slate-400">{mod.barcode}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function QatorQoshish({ onClick, matn, disabled }: { onClick: () => void; matn: string; disabled?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-orange-300 px-3 py-2 text-xs font-black text-orange-600 transition hover:bg-orange-50 disabled:opacity-50"><Plus size={14} />{matn}</button>;
}

export function QatorOchirish({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  const { t } = useTranslation("ishlab_chiqarish");
  return <button type="button" onClick={onClick} disabled={disabled} aria-label={t("actions.removeLine")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500 transition hover:bg-red-100 disabled:opacity-40"><Trash2 size={16} /></button>;
}
