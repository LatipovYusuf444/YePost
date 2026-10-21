import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, FilePenLine, LoaderCircle } from "lucide-react";
import { useSavdoStore } from "@/store/savdoStore";
import { useValyutaStore } from "@/lib/valyuta";
import { kelajakKunmi } from "@/lib/hujjatSanasi";
import { qoralamaFormasi, qoralamaPatch, type QoralamaForma } from "@/lib/qoralamaUmumiyTahrir";
import { mijozgaMosSotuvNomi } from "@/lib/sotuvNomi";
import type { Sotuv, SotuvYaratishMalumoti } from "@/types/savdo";
import SavdoSelect from "./SavdoSelect";
import QoralamaTovarlarTahriri from "./QoralamaTovarlarTahriri";

type Props = {
  sotuv: Sotuv;
  amalBajarilmoqda: boolean;
  onYangilash: (id: string, payload: Partial<SotuvYaratishMalumoti>) => Promise<boolean>;
  onOzgarish: (soni: number) => void;
  onSaqlandi: () => void;
};
const MAYDON = "h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition-colors hover:border-slate-300 focus:border-gold-400 focus:ring-2 focus:ring-gold-100 disabled:bg-slate-50";
const TANLOV = "!h-11 !rounded-xl !border-slate-200 !px-3 !text-sm !shadow-none focus:!border-gold-400 focus:!ring-2 focus:!ring-gold-100";
function Maydon({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid min-w-0 content-start gap-2"><span className="text-xs font-semibold text-slate-600">{label}</span>{children}</label>;
}
function Bolim({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,.025)] sm:p-5">
    <div className="mb-5 flex items-center gap-2.5 border-b border-slate-100 pb-4"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-50 text-gold-700">{icon}</span><h2 className="text-base font-bold text-slate-900">{title}</h2></div>
    {children}
  </section>;
}
function nom(item: { id: string; firstName?: string; lastName?: string; name?: string; fullName?: string }) {
  return [item.firstName, item.lastName].filter(Boolean).join(" ") || item.fullName || item.name || item.id;
}

export default function QoralamaUmumiyTahrir({ sotuv, amalBajarilmoqda, onYangilash, onOzgarish, onSaqlandi }: Props) {
  const { t } = useTranslation("savdo_tafsilot");
  const omborlar = useSavdoStore((s) => s.omborlar);
  const mijozlar = useSavdoStore((s) => s.mijozlar);
  const kompaniyalar = useSavdoStore((s) => s.mijozKompaniyalari);
  const qoldiqlar = useSavdoStore((s) => s.qoldiqlar);
  const qoldiqYuklanmoqda = useSavdoStore((s) => s.qoldiqYuklanmoqda);
  const qoldiqlarniYuklash = useSavdoStore((s) => s.qoldiqlarniYuklash);
  const usdMumkin = useValyutaStore((s) => s.rejimYoniq && s.kursBor && s.kurs > 0);
  const [asl] = useState(() => qoralamaFormasi(sotuv));
  const [forma, setForma] = useState(asl);
  const [tovarOzgarishlari, setTovarOzgarishlari] = useState(0);
  const patch = useMemo(() => qoralamaPatch(sotuv, forma), [sotuv, forma]);
  const ozgarishlarSoni = Object.keys(patch).length;
  useEffect(() => { onOzgarish(ozgarishlarSoni + tovarOzgarishlari); }, [ozgarishlarSoni, tovarOzgarishlari, onOzgarish]);
  const sanaXato = !forma.date || kelajakKunmi(forma.date) || Boolean(forma.boshlanish && forma.tugash && forma.boshlanish > forma.tugash);
  const xato = !forma.warehouseId ? t("fullEdit.warehouseRequired") : sanaXato ? t("fullEdit.dateError") : forma.currency !== asl.currency && !usdMumkin ? t("fullEdit.rateRequired") : "";
  const band = amalBajarilmoqda || qoldiqYuklanmoqda;
  function maydon(key: keyof QoralamaForma, value: string) { setForma((s) => ({ ...s, [key]: value })); }
  function mijozniTanlash(id: string) {
    const mijoz = mijozlar.find((item) => item.id === id);
    setForma((s) => ({ ...s, customerId: id, nom: mijozgaMosSotuvNomi(s.nom, mijoz ? nom(mijoz) : "") }));
  }
  function kompaniyaniTanlash(id: string) {
    const kompaniya = kompaniyalar.find((item) => item.id === id);
    setForma((s) => ({ ...s, clientCompanyId: id, nom: !s.customerId && kompaniya ? mijozgaMosSotuvNomi(s.nom, nom(kompaniya)) : s.nom }));
  }
  function omborniTanlash(id: string) {
    maydon("warehouseId", id);
    void qoldiqlarniYuklash(id);
  }
  function tiklash() {
    if (forma.warehouseId !== asl.warehouseId) void qoldiqlarniYuklash(asl.warehouseId);
    setForma(asl);
  }
  function variantlar<T extends { id: string }>(items: T[], id: string, label: (item: T) => string, fallback: string) {
    const options = items.map((item) => ({ value: item.id, label: label(item) }));
    if (id && !items.some((item) => item.id === id)) options.unshift({ value: id, label: fallback || id });
    return options;
  }
  const omborNomi = omborlar.find((item) => item.id === forma.warehouseId)?.name ?? (forma.warehouseId === asl.warehouseId ? sotuv.warehouse?.name : "") ?? "";
  return <div className="pb-2">
    <fieldset disabled={band} className="mx-4 mb-5 mt-5 min-w-0 sm:mx-6 sm:mt-6">
      <p className="mb-4 text-sm leading-6 text-slate-500">{t("fullEdit.hint")}</p>
      <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <Bolim title={t("fullEdit.saleSection")} icon={<FilePenLine size={18} />}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Maydon label={t("fullEdit.name")}><input value={forma.nom} maxLength={200} onChange={(e) => maydon("nom", e.target.value)} className={MAYDON} /></Maydon></div>
        <Maydon label={t("fullEdit.customer")}><SavdoSelect buttonClassName={TANLOV} value={forma.customerId} onChange={mijozniTanlash} disabled={band} options={[...(!asl.customerId ? [{value:"",label:t("fullEdit.none")}] : []), ...variantlar(mijozlar, asl.customerId, nom, sotuv.customer ? nom(sotuv.customer) : "")]} /></Maydon>
        <Maydon label={t("fullEdit.company")}><SavdoSelect buttonClassName={TANLOV} value={forma.clientCompanyId} onChange={kompaniyaniTanlash} disabled={band} options={[...(!asl.clientCompanyId ? [{value:"",label:t("fullEdit.none")}] : []), ...variantlar(kompaniyalar, asl.clientCompanyId, nom, sotuv.clientCompany ? nom(sotuv.clientCompany) : "")]} /></Maydon>
        <Maydon label={t("fullEdit.warehouse")}><SavdoSelect buttonClassName={TANLOV} value={forma.warehouseId} onChange={omborniTanlash} disabled={band} options={variantlar(omborlar, asl.warehouseId, (item) => item.name || item.id, sotuv.warehouse?.name || "")} /></Maydon>
        <Maydon label={t("fullEdit.currency")}><SavdoSelect buttonClassName={TANLOV} value={forma.currency} onChange={(value) => maydon("currency", value)} disabled={band} options={[{value:"UZS",label:"UZS (so'm)"},{value:"USD",label:"USD ($)",disabled:!usdMumkin && asl.currency!=="USD"}]} /></Maydon>
        {!forma.customerId && !forma.clientCompanyId && <>
          <Maydon label={t("fullEdit.walkInName")}><input value={forma.walkInCustomerName} maxLength={200} onChange={(e) => maydon("walkInCustomerName",e.target.value)} className={MAYDON} /></Maydon>
          <Maydon label={t("fullEdit.phone")}><input type="tel" value={forma.walkInCustomerPhone} maxLength={50} onChange={(e) => maydon("walkInCustomerPhone",e.target.value)} className={MAYDON} /></Maydon>
        </>}
        <div className="sm:col-span-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3"><Maydon label={t("fullEdit.responsible")}><input readOnly value={sotuv.responsible ? nom(sotuv.responsible) : sotuv.responsibleId || "—"} className="w-full min-w-0 bg-transparent text-sm font-semibold text-slate-700 outline-none" /></Maydon></div>
      </div>
      </Bolim>
      <Bolim title={t("fullEdit.scheduleSection")} icon={<CalendarDays size={18} />}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Maydon label={t("fullEdit.date")}><input type="date" value={forma.date} onChange={(e) => maydon("date", e.target.value)} className={MAYDON} /></Maydon>
        <Maydon label={t("fullEdit.stage")}><input value={forma.bosqich} maxLength={100} onChange={(e) => maydon("bosqich", e.target.value)} className={MAYDON} /></Maydon>
        <Maydon label={t("fullEdit.start")}><input type="date" value={forma.boshlanish} onChange={(e) => maydon("boshlanish", e.target.value)} className={MAYDON} /></Maydon>
        <Maydon label={t("fullEdit.end")}><input type="date" value={forma.tugash} onChange={(e) => maydon("tugash", e.target.value)} className={MAYDON} /></Maydon>
        <div className="sm:col-span-2"><Maydon label={t("fullEdit.note")}><textarea value={forma.izoh} maxLength={2000} rows={4} onChange={(e) => maydon("izoh",e.target.value)} className={`${MAYDON} h-auto min-h-28 resize-y py-3`} /></Maydon></div>
      </div>
      </Bolim>
      </div>
      {xato && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{xato}</p>}
      {qoldiqYuklanmoqda && <p role="status" className="mt-4 flex items-center gap-2 text-sm text-slate-500"><LoaderCircle size={16} className="animate-spin" />{t("common:actions.loading")}</p>}
    </fieldset>
    <fieldset disabled={band} className="min-w-0">
      <QoralamaTovarlarTahriri sotuv={sotuv} qoldiqlar={qoldiqlar} amalBajarilmoqda={band} onYangilash={onYangilash} onOzgarish={setTovarOzgarishlari} umumiyTahrir={{malumot:patch,ozgarishlarSoni,warehouseId:forma.warehouseId,omborNomi,currency:forma.currency,xatoBor:Boolean(xato),onBekor:tiklash,onSaqlandi}} />
    </fieldset>
  </div>;
}
