import SmartTable from "@/Components/common/smart-table/SmartTable";
import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import { Inbox, LoaderCircle, Plus, Search, Trash2, X, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import AppModal from "@/Components/common/AppModal";
import KorsatkichKartasi, { type KartaRangi } from "@/Components/common/KorsatkichKartasi";
import TablePagination from "@/Components/common/TablePagination";
import AppSelect from "@/Components/ui/AppSelect";
import { katalogQidiruvQatoriniMoslash } from "@/api/catalogSearch";
import { modifikatsiyalarApi } from "@/api/catalogApi";
import { miqdorMatni } from "@/lib/ishlabChiqarish";
import { MAYDON_XATOSI } from "@/lib/maydonXatolari";
import type { MahsulotModifikatsiyasi } from "@/types/catalog";
import type { Ombor } from "@/types/ombor";

// Ishlab chiqarish bo'limining umumiy UI qismlari: loyihadagi ro'yxat sahifalari (Ombor → Ko'chirish) uslubida.
export const inputKlass =
  "h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[15px] font-semibold text-slate-700 outline-none transition placeholder:font-medium placeholder:text-slate-400 hover:border-slate-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";
// AppSelect: tashqi qobiq bo'shliqsiz, ichki tugma maydon chegarasigacha (aks holda tugma ichkariga suriladi).
export const selectKlass =
  "h-12 w-full rounded-2xl text-[15px] font-semibold text-slate-700 [&>button]:rounded-2xl [&>button]:px-4 [&>button]:hover:border-slate-300";
export const tugmaAsosiy =
  "inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-6 text-sm font-black text-white shadow-[0_12px_28px_rgba(37,99,235,.22)] transition hover:-translate-y-0.5 hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";
export const tugmaIkkinchi =
  "inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-white px-5 text-sm font-black text-[#2563EB] transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50";
export const tugmaXavfli =
  "inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-red-50 px-5 text-sm font-black text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50";

export function Sahifa({ sarlavha, izoh, amal, children }: { sarlavha: string; izoh?: string; amal?: ReactNode; children: ReactNode }) {
  return (
    <section className="min-h-[calc(100vh-245px)] space-y-6">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-black tracking-tight text-slate-950">{sarlavha}</h1>
          {izoh && <p className="mt-1 max-w-3xl text-sm font-medium text-slate-500">{izoh}</p>}
        </div>
        {amal && <div className="flex flex-wrap items-center gap-3 sm:justify-end">{amal}</div>}
      </header>
      {children}
    </section>
  );
}

export function XatoQutisi({ matn, id }: { matn: string; id?: string }) {
  if (!matn) return null;
  return <p id={id} role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-600">{matn}</p>;
}

export function Ogohlantirish({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-700">{children}</p>;
}

const HOLAT_RANGI: Record<string, string> = {
  DRAFT: "bg-amber-50 text-amber-700 ring-amber-100",
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  RELEASED: "bg-sky-50 text-sky-700 ring-sky-100",
  IN_PROGRESS: "bg-violet-50 text-violet-700 ring-violet-100",
  CONFIRMED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  DONE: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  IN_STOCK: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  CLOSED: "bg-slate-100 text-slate-600 ring-slate-200",
  ARCHIVED: "bg-slate-100 text-slate-600 ring-slate-200",
  USED: "bg-slate-100 text-slate-600 ring-slate-200",
  CANCELLED: "bg-red-50 text-red-600 ring-red-100",
};

export function Holat({ status }: { status?: string | null }) {
  const { t } = useTranslation("ishlab_chiqarish");
  if (!status) return null;
  return <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-black ring-1 ${HOLAT_RANGI[status] ?? "bg-slate-100 text-slate-600 ring-slate-200"}`}>{t(`status.${status}`, { defaultValue: status })}</span>;
}

/** Forma maydoni: `majburiy` — yulduzcha; `xato` — maydon qizil ramkada, ostida qizil matn (izoh o'rniga). */
export function Maydon({ nom, children, izoh, className = "", majburiy = false, xato }: { nom: string; children: ReactNode; izoh?: ReactNode; className?: string; majburiy?: boolean; xato?: string }) {
  return (
    <label data-maydon-xato={xato ? "true" : undefined} className={`grid min-w-0 content-start gap-2 ${xato ? MAYDON_XATOSI : ""} ${className}`}>
      <span className={`text-sm font-bold ${xato ? "text-red-600" : "text-slate-500"}`}>{nom}{majburiy && <span aria-hidden className="ml-0.5 text-red-500">*</span>}</span>
      {children}
      {xato ? <span role="alert" className="text-xs font-bold leading-5 text-red-600">{xato}</span> : izoh && <span className="text-xs font-semibold leading-5 text-slate-400">{izoh}</span>}
    </label>
  );
}

/**
 * Oyna: sarlavha (ikonka, izoh, holat belgisi), suriladigan tana va pastki tugmalar. `keng` — hujjat va ko'p qatorli forma uchun
 * deyarli butun ekran; oddiy forma o'rtacha kenglikda.
 */
export function Oyna({ sarlavha, izoh, ikonka: Ikonka, belgi, onYopish, keng = false, pastki, children }: { sarlavha: string; izoh?: string; ikonka?: LucideIcon; belgi?: ReactNode; onYopish: () => void; keng?: boolean; pastki?: ReactNode; children: ReactNode }) {
  const { t } = useTranslation("ishlab_chiqarish");
  return (
    <AppModal onClose={onYopish} className="bg-slate-950/55 backdrop-blur-[3px]">
      <div className={`flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-[32px] border border-orange-100 bg-white shadow-[0_35px_110px_rgba(15,23,42,.38)] ${keng ? "min-h-[min(680px,calc(100dvh-2rem))] max-w-7xl" : "max-w-4xl"}`}>
        <header className="flex shrink-0 items-center gap-4 border-b border-orange-100 bg-[#F8FAFC]/95 px-6 py-5 sm:px-8">
          {Ikonka && <span aria-hidden className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#2563EB] ring-1 ring-orange-100 sm:flex"><Ikonka size={22} /></span>}
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <h2 className="min-w-0 truncate text-2xl font-black tracking-tight text-slate-950 sm:text-[28px]">{sarlavha}</h2>
              {belgi}
            </div>
            {izoh && <p className="mt-1 text-sm font-medium text-slate-500">{izoh}</p>}
          </div>
          <button type="button" onClick={onYopish} aria-label={t("actions.close")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-100"><X size={19} /></button>
        </header>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-gradient-to-br from-[#F8FAFC] via-white to-[#EEF2F7] px-5 py-6 sm:px-8">{children}</div>
        {pastki && <footer className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-orange-100 bg-white px-6 py-4 sm:px-8">{pastki}</footer>}
      </div>
    </AppModal>
  );
}

// Ro'yxat darajasidagi xato va xatoli konteyner ramkasi — butun loyiha uchun umumiy.
export { MaydonXatosi } from "@/Components/common/XatoliMaydon";
// lib/maydonXatolari dagi xatoRamkasi bilan bir xil (fast refresh faqat literal konstanta eksportiga ruxsat beradi).
export const xatoRamkasi = "!border-red-400 ring-4 ring-red-100";

/** Oyna ichidagi bo'lim kartasi: sarlavha (ikonka, izoh, o'ngda amal) va mazmun. */
export function Bolim({ sarlavha, izoh, ikonka: Ikonka, amal, children, className = "" }: { sarlavha: string; izoh?: string; ikonka?: LucideIcon; amal?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm sm:p-6 ${className}`}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-orange-100 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          {Ikonka && <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#2563EB]"><Ikonka size={19} /></span>}
          <div className="min-w-0">
            <h3 className="text-base font-black uppercase tracking-wide text-slate-600">{sarlavha}</h3>
            {izoh && <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-400">{izoh}</p>}
          </div>
        </div>
        {amal}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/** Hujjatning asosiy ko'rsatkichlari plitkalarda (ko'rish oynalarining tepasi). */
export function Tafsilotlar({ qatorlar }: { qatorlar: Array<{ nom: string; qiymat: ReactNode; keng?: boolean }> }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {qatorlar.map((qator) => (
        <div key={qator.nom} className={`min-w-0 rounded-2xl border border-orange-100 bg-white px-4 py-3.5 shadow-sm ${qator.keng ? "sm:col-span-2" : ""}`}>
          <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">{qator.nom}</dt>
          <dd className="mt-1 min-w-0 truncate text-base font-black text-slate-800">{qator.qiymat}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Bajarilish: `bajarilgan / reja` va foiz chizig'i. */
export function Jarayon({ bajarilgan, reja }: { bajarilgan: unknown; reja: unknown }) {
  const rejaSoni = Number(reja) || 0;
  const bajarilganSoni = Number(bajarilgan) || 0;
  const foiz = rejaSoni > 0 ? Math.min(100, (bajarilganSoni / rejaSoni) * 100) : 0;
  return (
    <div className="min-w-[160px]">
      <div className="flex items-center justify-between gap-3 text-xs font-bold">
        <span className="tabular-nums text-slate-700">{miqdorMatni(bajarilganSoni)} / {miqdorMatni(rejaSoni)}</span>
        <span className="tabular-nums text-slate-400">{Math.round(foiz)}%</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${foiz >= 100 ? "bg-emerald-500" : "bg-[#2563EB]"}`} style={{ width: `${foiz}%` }} /></div>
    </div>
  );
}

export type Ustun<T> = { id: string; nom: string; katak: (qator: T, indeks: number) => ReactNode; ong?: boolean };

type JadvalProps<T> = {
  tableId: string;
  ustunlar: Ustun<T>[];
  qatorlar: T[];
  kalit: (qator: T, indeks: number) => string;
  onBos?: (qator: T) => void;
  /** Bo'sh holat: sarlavha, izoh va amal (masalan, "Yangi buyurtma" tugmasi). */
  bosh: string;
  boshIzoh?: ReactNode;
  boshAmal?: ReactNode;
  boshIkonka?: LucideIcon;
  yuklanmoqda?: boolean;
  /** Oyna ichidagi kichik jadval (qatorlar, ehtiyojlar). */
  ixcham?: boolean;
  /** Ro'yxat sahifasi: shuncha qatordan keyin sahifalarga bo'linadi (0 — bo'linmaydi). */
  sahifaHajmi?: number;
  /** Jadval kartasining pastki qismi (masalan, server sahifalashi). */
  pastki?: ReactNode;
};

/** Jadval: sarlavha qatori doim ko'rinadi; bo'sh yoki yuklanayotgan holat jadval ichida. */
export function Jadval<T>({ tableId, ustunlar, qatorlar, kalit, onBos, bosh, boshIzoh, boshAmal, boshIkonka: BoshIkonka = Inbox, yuklanmoqda = false, ixcham = false, sahifaHajmi = 0, pastki }: JadvalProps<T>) {
  const { t } = useTranslation("ishlab_chiqarish");
  const [sahifa, setSahifa] = useState(1);
  const [hajm, setHajm] = useState(sahifaHajmi || 20);
  const jamiSahifa = Math.max(1, Math.ceil(qatorlar.length / hajm));
  const joriySahifa = Math.min(sahifa, jamiSahifa);
  const boshlanish = sahifaHajmi ? (joriySahifa - 1) * hajm : 0;
  const korinadigan = sahifaHajmi ? qatorlar.slice(boshlanish, boshlanish + hajm) : qatorlar;
  const klavish = (event: KeyboardEvent<HTMLTableRowElement>, qator: T) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onBos?.(qator);
  };
  const th = ixcham ? "px-4 py-3 text-[11px]" : "h-[58px] px-6 py-3 text-[13px]";
  const td = ixcham ? "px-4 py-3 text-sm" : "px-6 py-4 text-[15px]";
  const tana = yuklanmoqda && qatorlar.length === 0 ? (
    <tr>
      <td colSpan={ustunlar.length} className="p-0">
        <div role="status" className={`flex items-center justify-center gap-2 font-bold text-slate-400 ${ixcham ? "h-24 text-sm" : "h-48"}`}><LoaderCircle size={ixcham ? 18 : 28} className="animate-spin text-[#2563EB]" /><span className={ixcham ? "" : "sr-only"}>{t("loading")}</span></div>
      </td>
    </tr>
  ) : korinadigan.length === 0 ? (
    <tr>
      <td colSpan={ustunlar.length} className="p-0">
        {ixcham ? (
          <p className="px-4 py-8 text-center text-sm font-semibold text-slate-400">{bosh}</p>
        ) : (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <span aria-hidden className="flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-50 text-[#2563EB] ring-1 ring-orange-100"><BoshIkonka size={28} /></span>
            <p className="mt-4 text-lg font-black text-slate-800">{bosh}</p>
            {boshIzoh && <div className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">{boshIzoh}</div>}
            {boshAmal && <div className="mt-6 flex flex-wrap justify-center gap-3">{boshAmal}</div>}
          </div>
        )}
      </td>
    </tr>
  ) : (
    korinadigan.map((qator, indeks) => (
      <tr
        key={kalit(qator, boshlanish + indeks)}
        onClick={onBos ? () => onBos(qator) : undefined}
        onKeyDown={onBos ? (event) => klavish(event, qator) : undefined}
        tabIndex={onBos ? 0 : undefined}
        className={onBos ? "group cursor-pointer transition hover:bg-orange-50/40 focus-visible:bg-orange-50 focus-visible:outline-none" : ""}
      >
        {ustunlar.map((ustun) => <td key={ustun.id} className={`${td} whitespace-nowrap font-semibold text-slate-700 ${ustun.ong ? "text-right tabular-nums" : ""}`}>{ustun.katak(qator, boshlanish + indeks)}</td>)}
      </tr>
    ))
  );
  return (
    <div className={ixcham ? "overflow-hidden rounded-2xl border border-slate-200 bg-white" : "overflow-hidden rounded-[30px] border border-orange-100 bg-white shadow-sm"}>
      <div className="overflow-x-auto">
        <SmartTable tableId={tableId} replaceColumnControls><table className={`w-full border-collapse text-left ${ixcham ? "" : "min-w-[880px]"}`}>
          <thead className={`font-black uppercase ${ixcham ? "bg-slate-50 text-slate-400" : "bg-[#F8FAFC] text-slate-500"}`}>
            <tr>{ustunlar.map((ustun) => <th data-column-id={ustun.id} key={ustun.id} scope="col" className={`${th} whitespace-nowrap ${ustun.ong ? "text-right" : ""}`}>{ustun.nom}</th>)}</tr>
          </thead>
          <tbody className={`divide-y ${ixcham ? "divide-slate-100" : "divide-orange-100"}`}>{tana}</tbody>
        </table></SmartTable>
      </div>
      {sahifaHajmi > 0 && qatorlar.length > 0 && (
        <TablePagination page={joriySahifa} pageSize={hajm} totalItems={qatorlar.length} onPageChange={setSahifa} onPageSizeChange={(yangi) => { setHajm(yangi); setSahifa(1); }} />
      )}
      {pastki}
    </div>
  );
}

export function Yuklanmoqda() {
  const { t } = useTranslation("ishlab_chiqarish");
  return <p className="flex items-center gap-2 rounded-2xl bg-white p-6 text-sm font-bold text-slate-400"><LoaderCircle size={17} className="animate-spin text-[#2563EB]" />{t("loading")}</p>;
}

/** Ro'yxat qidiruvi (loyihadagi ro'yxat sahifalari uslubida). */
export function QidiruvMaydoni({ qiymat, onChange, placeholder }: { qiymat: string; onChange: (qiymat: string) => void; placeholder: string }) {
  const { t } = useTranslation("ishlab_chiqarish");
  return (
    <label className="flex h-14 w-full min-w-0 items-center gap-3 rounded-[22px] border border-slate-200 bg-white px-5 shadow-sm transition focus-within:border-orange-300 focus-within:ring-4 focus-within:ring-orange-100">
      <Search size={21} className="shrink-0 text-slate-400" />
      <input value={qiymat} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={placeholder} className="min-w-0 flex-1 bg-transparent text-base text-slate-700 outline-none placeholder:text-slate-400" />
      {qiymat && <button type="button" onClick={() => onChange("")} aria-label={t("actions.clearSearch")} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={17} /></button>}
    </label>
  );
}

/** Qidiruv va filtrlar qatori: birinchi element (qidiruv) bo'sh joyni egallaydi. */
export function Asboblar({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 sm:flex-row sm:items-center [&>*:first-child]:flex-1">{children}</div>;
}

export type HolatGuruhi = { kalit: string; nom: string; holatlar: string[] | null; rang: KartaRangi; ikonka: LucideIcon };

/** Holat bo'yicha ko'rsatkich kartalari: bosilsa ro'yxat shu guruhga filtrlanadi (yana bosilsa yoki "Jami" — hammasi). */
export function HolatKartalari<T extends { status?: string | null }>({ guruhlar, qatorlar, tanlangan, onTanlash, yuklanmoqda = false }: { guruhlar: HolatGuruhi[]; qatorlar: readonly T[]; tanlangan: string; onTanlash: (guruh: HolatGuruhi | null) => void; yuklanmoqda?: boolean }) {
  const { t } = useTranslation("ishlab_chiqarish");
  // Holat ro'yxatida bitta holat tanlansa (`tanlangan` — holat kodi), shu holatli karta ham tanlangan ko'rinadi.
  const tanlanganmi = (guruh: HolatGuruhi) => (guruh.holatlar ? tanlangan === guruh.kalit || (guruh.holatlar.length === 1 && tanlangan === guruh.holatlar[0]) : !tanlangan);
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {guruhlar.map((guruh) => {
        const soni = guruh.holatlar ? qatorlar.filter((qator) => guruh.holatlar?.includes(qator.status ?? "")).length : qatorlar.length;
        const faol = tanlanganmi(guruh);
        return (
          <KorsatkichKartasi
            key={guruh.kalit}
            icon={guruh.ikonka}
            nom={guruh.nom}
            qiymat={String(soni)}
            rang={guruh.rang}
            yuklanmoqda={yuklanmoqda}
            yuklanishMatni={t("loading")}
            tanlangan={faol}
            onClick={() => onTanlash(guruh.holatlar && !faol ? guruh : null)}
          />
        );
      })}
    </div>
  );
}

export function HolatFiltri({ qiymat, onChange, holatlar }: { qiymat: string; onChange: (qiymat: string) => void; holatlar: string[] }) {
  const { t } = useTranslation("ishlab_chiqarish");
  return (
    <AppSelect value={qiymat} onChange={(event) => onChange(event.target.value)} aria-label={t("filters.status")} className="h-14 min-w-56 rounded-[22px] text-[15px] font-semibold text-slate-700 [&>button]:rounded-[22px] [&>button]:px-5 [&>button]:shadow-sm">
      <option value="">{t("filters.allStatuses")}</option>
      {holatlar.map((holat) => <option key={holat} value={holat}>{t(`status.${holat}`, { defaultValue: holat })}</option>)}
    </AppSelect>
  );
}

export function OmborTanlash({ value, onChange, omborlar, sexMi, disabled, ariaLabel }: { value: string; onChange: (id: string) => void; omborlar: Ombor[]; sexMi?: boolean; disabled?: boolean; ariaLabel?: string }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const variantlar = sexMi ? omborlar.filter((ombor) => ombor.kind === "WIP" || ombor.id === value) : omborlar;
  return (
    <AppSelect value={value} disabled={disabled} aria-label={ariaLabel} onChange={(event) => onChange(event.target.value)} className={selectKlass}>
      <option value="">{t(sexMi ? "fields.selectWip" : "fields.selectWarehouse")}</option>
      {variantlar.map((ombor) => <option key={ombor.id} value={ombor.id}>{ombor.name}</option>)}
    </AppSelect>
  );
}

function modifikatsiyaNomi(mod: MahsulotModifikatsiyasi) {
  const variant = mod.name && mod.name !== "Asosiy variant" && mod.name !== mod.product?.name ? mod.name : "";
  return [mod.product?.name, variant].filter(Boolean).join(" / ") || mod.name || mod.barcode;
}

/** Mahsulot tanlash: so'z serverda qidiriladi (narxsiz), butun katalog yuklanmaydi. Natijalar maydon ostida ochiladi. */
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
    <div className="relative min-w-0">
      <Search size={17} className="pointer-events-none absolute left-4 top-[15px] text-slate-400" />
      <input
        value={soz ?? (value ? nom ?? "" : "")}
        disabled={disabled}
        aria-label={ariaLabel ?? t("fields.product")}
        placeholder={t("fields.productSearch")}
        onChange={(event) => setSoz(event.target.value)}
        onBlur={() => window.setTimeout(() => setSoz(null), 150)}
        className={`${inputKlass} pl-11`}
      />
      {soz !== null && matn && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_50px_rgba(15,23,42,.18)]">
          {yuklanmoqda ? (
            <p className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-slate-400"><LoaderCircle size={15} className="animate-spin" />{t("loading")}</p>
          ) : natijalar.length === 0 ? (
            <p className="px-3 py-2.5 text-sm font-semibold text-slate-400">{t("empty.products")}</p>
          ) : natijalar.map((mod) => (
            <button
              key={mod.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => { onChange(mod.id, modifikatsiyaNomi(mod)); setSoz(null); }}
              className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-orange-50"
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

/** Forma ichidagi bitta qator (xomashyo, mahsulot, to'xtash). Ustunlar `className` orqali beriladi. */
export function QatorKartasi({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`grid items-end gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 ${className}`}>{children}</div>;
}

export function QatorQoshish({ onClick, matn, disabled }: { onClick: () => void; matn: string; disabled?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-dashed border-orange-300 bg-white px-4 text-sm font-black text-[#2563EB] transition hover:bg-orange-50 disabled:opacity-50"><Plus size={16} />{matn}</button>;
}

export function QatorOchirish({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  const { t } = useTranslation("ishlab_chiqarish");
  return <button type="button" onClick={onClick} disabled={disabled} aria-label={t("actions.removeLine")} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500 transition hover:bg-red-100 disabled:opacity-40"><Trash2 size={17} /></button>;
}
