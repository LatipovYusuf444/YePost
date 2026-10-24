import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, ChevronRight, ClipboardCheck, LoaderCircle, Package, Settings, UserRound } from "lucide-react";
import { useSavdoStore } from "@/store/savdoStore";
import { useValyutaStore } from "@/lib/valyuta";
import { bugungiToshkentKuni, kelajakKunmi } from "@/lib/hujjatSanasi";
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
  footerContainer: HTMLDivElement | null;
};
const MAYDON = "h-11 w-full min-w-0 rounded-xl border-2 border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";
const TANLOV = "!h-11 !rounded-xl !border-2 !border-slate-300 !px-3.5 !text-sm !shadow-none hover:!shadow-none focus:!border-[#2563EB]";
function Maydon({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid min-w-0 content-start gap-1.5"><span className="text-sm font-semibold text-slate-600">{label}</span>{children}</label>;
}
function Bolim({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <section className="min-w-0 rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)] ring-2 ring-[#CBD5E1] sm:p-5">
    <div className="mb-4 flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB] ring-2 ring-blue-200">{icon}</span><h2 className="text-lg font-extrabold tracking-tight text-[#0F172A]">{title}</h2></div>
    {children}
  </section>;
}
function nom(item: { id: string; firstName?: string; lastName?: string; name?: string; fullName?: string }) {
  return [item.firstName, item.lastName].filter(Boolean).join(" ") || item.fullName || item.name || item.id;
}

export default function QoralamaUmumiyTahrir({ sotuv, amalBajarilmoqda, onYangilash, onOzgarish, onSaqlandi, footerContainer }: Props) {
  const { t } = useTranslation("savdo_tafsilot");
  const { t: yangiT } = useTranslation("savdo_yangi");
  const bolimlarRef = useRef<HTMLDivElement>(null);
  const [faolBolim, setFaolBolim] = useState(0);
  const bolimlar = [
    { key: "client", label: yangiT("sections.clientInfo"), icon: UserRound },
    { key: "settings", label: yangiT("sections.saleSettings"), icon: Settings },
    { key: "products", label: t("qoralamaTahrir.sarlavha"), icon: Package },
    { key: "summary", label: t("common.totals.umumiySumma"), icon: ClipboardCheck },
  ];
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
  const sanaMaydoni = <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-blue-100 bg-blue-50/60 px-4 py-3">
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#2563EB] ring-1 ring-blue-200"><CalendarDays size={20} aria-hidden /></span>
      <div>
        <label htmlFor="qoralama-sotuv-sanasi" className="text-sm font-bold text-slate-700">{t("fullEdit.saleDate")}</label>
        <p id="qoralama-sotuv-sanasi-hint" className="mt-0.5 text-xs font-medium leading-5 text-slate-500">{t("fullEdit.dateHint")}</p>
      </div>
    </div>
    <input id="qoralama-sotuv-sanasi" type="date" value={forma.date} max={bugungiToshkentKuni()} required disabled={band} aria-describedby="qoralama-sotuv-sanasi-hint" aria-invalid={!forma.date || kelajakKunmi(forma.date) || undefined} onChange={(e) => maydon("date", e.target.value)} className={`${MAYDON} sm:w-[210px] focus:ring-blue-100 [color-scheme:light]`} />
  </div>;
  return <>
    <nav className="shrink-0 border-b-2 border-slate-300 bg-white px-4 pb-4 pt-3 sm:px-7" aria-label={yangiT("stepper.aria")}>
      <ol className="grid grid-cols-4 gap-1.5 sm:grid-cols-2 sm:gap-2 lg:grid-cols-4">
        {bolimlar.map((bolim, index) => {
          const faol = faolBolim === index;
          const Ikonka = bolim.icon;
          return <li key={bolim.key} className="min-w-0"><button type="button" aria-current={faol ? "step" : undefined} onClick={() => {
            setFaolBolim(index);
            bolimlarRef.current?.querySelector(`[data-edit-section="${bolim.key}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
          }} className={`flex w-full min-w-0 flex-col items-center gap-1 rounded-2xl border-2 px-1 py-2 text-center transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100 sm:flex-row sm:gap-3 sm:px-3 sm:text-left ${faol ? "border-blue-300 bg-[#EFF6FF] shadow-[0_6px_16px_rgba(37,99,235,.10)]" : "border-slate-300 bg-slate-50/70 hover:border-blue-300 hover:bg-white"}`}>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black sm:h-10 sm:w-10 sm:text-base ${faol ? "bg-[#2563EB] text-white shadow-[0_6px_14px_rgba(37,99,235,.35)]" : "border-2 border-slate-300 bg-white text-slate-500"}`}>{index + 1}</span>
            <Ikonka size={20} className={`hidden shrink-0 sm:block ${faol ? "text-[#2563EB]" : "text-slate-400"}`} aria-hidden />
            <span className="min-w-0 flex-1 truncate text-[11px] font-extrabold text-slate-700 sm:text-sm">{bolim.label}</span>
            {index < bolimlar.length - 1 && <ChevronRight size={16} className="hidden shrink-0 text-slate-300 lg:block" aria-hidden />}
          </button></li>;
        })}
      </ol>
    </nav>
    <div ref={bolimlarRef} className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-7">
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(360px,0.42fr)_minmax(0,1fr)]">
    <fieldset disabled={band} className="min-w-0 space-y-4">
      <div data-edit-section="client"><Bolim title={yangiT("sections.clientInfo")} icon={<UserRound size={20} />}>
      <div className="space-y-4">
        <Maydon label={t("fullEdit.customer")}><SavdoSelect buttonClassName={TANLOV} value={forma.customerId} onChange={mijozniTanlash} disabled={band} options={[...(!asl.customerId ? [{value:"",label:t("fullEdit.none")}] : []), ...variantlar(mijozlar, asl.customerId, nom, sotuv.customer ? nom(sotuv.customer) : "")]} /></Maydon>
        <Maydon label={t("fullEdit.company")}><SavdoSelect buttonClassName={TANLOV} value={forma.clientCompanyId} onChange={kompaniyaniTanlash} disabled={band} options={[...(!asl.clientCompanyId ? [{value:"",label:t("fullEdit.none")}] : []), ...variantlar(kompaniyalar, asl.clientCompanyId, nom, sotuv.clientCompany ? nom(sotuv.clientCompany) : "")]} /></Maydon>
        {!forma.customerId && !forma.clientCompanyId && <>
          <Maydon label={t("fullEdit.walkInName")}><input value={forma.walkInCustomerName} maxLength={200} onChange={(e) => maydon("walkInCustomerName",e.target.value)} className={MAYDON} /></Maydon>
          <Maydon label={t("fullEdit.phone")}><input type="tel" value={forma.walkInCustomerPhone} maxLength={50} onChange={(e) => maydon("walkInCustomerPhone",e.target.value)} className={MAYDON} /></Maydon>
        </>}
      </div>
      </Bolim></div>
      <div data-edit-section="settings"><Bolim title={yangiT("sections.saleSettings")} icon={<Settings size={20} />}>
      <div className="space-y-4">
        <Maydon label={t("fullEdit.name")}><input value={forma.nom} maxLength={200} onChange={(e) => maydon("nom", e.target.value)} className={MAYDON} /></Maydon>
        <Maydon label={t("fullEdit.stage")}><input value={forma.bosqich} maxLength={100} onChange={(e) => maydon("bosqich", e.target.value)} className={MAYDON} /></Maydon>
        <Maydon label={t("fullEdit.warehouse")}><SavdoSelect buttonClassName={TANLOV} value={forma.warehouseId} onChange={omborniTanlash} disabled={band} options={variantlar(omborlar, asl.warehouseId, (item) => item.name || item.id, sotuv.warehouse?.name || "")} /></Maydon>
        <Maydon label={t("fullEdit.currency")}><SavdoSelect buttonClassName={TANLOV} value={forma.currency} onChange={(value) => maydon("currency", value)} disabled={band} options={[{value:"UZS",label:"UZS (so'm)"},{value:"USD",label:"USD ($)",disabled:!usdMumkin && asl.currency!=="USD"}]} /></Maydon>
        <Maydon label={t("fullEdit.responsible")}><input readOnly value={sotuv.responsible ? nom(sotuv.responsible) : sotuv.responsibleId || "—"} className={`${MAYDON} bg-slate-50`} /></Maydon>
      </div>
      </Bolim></div>
      {xato && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{xato}</p>}
      {qoldiqYuklanmoqda && <p role="status" className="mt-4 flex items-center gap-2 text-sm text-slate-500"><LoaderCircle size={16} className="animate-spin" />{t("common:actions.loading")}</p>}
    </fieldset>
    <fieldset data-edit-section="products" disabled={band} className="min-w-0">
      <QoralamaTovarlarTahriri sotuv={sotuv} qoldiqlar={qoldiqlar} amalBajarilmoqda={band} onYangilash={onYangilash} onOzgarish={setTovarOzgarishlari} footerContainer={footerContainer} umumiyTahrir={{malumot:patch,ozgarishlarSoni,warehouseId:forma.warehouseId,omborNomi,currency:forma.currency,sanaMaydoni,xatoBor:Boolean(xato),onBekor:tiklash,onSaqlandi}} />
    </fieldset>
    </div>
  </div></>;
}
