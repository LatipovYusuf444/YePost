import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, Factory, LoaderCircle, PackageOpen, Plus, Tags, Trash2, Warehouse } from "lucide-react";
import { useTranslation } from "react-i18next";
import AppSelect from "@/Components/ui/AppSelect";
import { ishlabChiqarishApi } from "@/api/ishlabChiqarishApi";
import { omborlarApi } from "@/api/omborApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { sonMaydoni } from "@/lib/ishlabChiqarish";
import { foydalanuvchiAdminmi } from "@/lib/roles";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { useIshlabChiqarishStore } from "@/store/ishlabChiqarishStore";
import type { BrakSababi } from "@/types/ishlabChiqarish";
import type { Ombor } from "@/types/ombor";
import { BolimKarta } from "./UmumiyUI";

const inputKlass = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100";
const selectKlass = "h-11 w-full rounded-xl text-sm font-semibold text-slate-700 [&>button]:rounded-xl [&>button]:px-3";

/** Yoqish/o'chirish kartasi: sarlavha, izoh va o'ngda switch. */
function Almashtirgich({ id, ikonka, sarlavha, izoh, qiymat, onChange }: { id: string; ikonka: ReactNode; sarlavha: string; izoh: string; qiymat: boolean; onChange: (qiymat: boolean) => void }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">{ikonka}</span>
      <div className="min-w-0 flex-1">
        <h3 id={id} className="text-base font-bold text-slate-900">{sarlavha}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">{izoh}</p>
      </div>
      <button type="button" role="switch" aria-checked={qiymat} aria-labelledby={id} onClick={() => onChange(!qiymat)} className={`relative mt-1 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${qiymat ? "bg-blue-600" : "bg-slate-300"}`}>
        <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${qiymat ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

function OmborMaydoni({ nom, izoh, value, onChange, omborlar }: { nom: string; izoh: string; value: string; onChange: (id: string) => void; omborlar: Ombor[] }) {
  const { t } = useTranslation("ishlab_chiqarish");
  return (
    <label className="grid content-start gap-1.5">
      <span className="text-xs font-bold text-slate-500">{nom}</span>
      <AppSelect value={value} aria-label={nom} onChange={(event) => onChange(event.target.value)} className={selectKlass}>
        <option value="">{t("settings.noWarehouse")}</option>
        {omborlar.map((ombor) => <option key={ombor.id} value={ombor.id}>{ombor.name}</option>)}
      </AppSelect>
      <span className="text-xs font-semibold leading-5 text-slate-400">{izoh}</span>
    </label>
  );
}

// Sozlamalar → Ishlab chiqarish (faqat direktor saqlaydi). Modul shu yerda yoqiladi: o'chiq paytda menyu ko'rinmaydi.
export default function IshlabChiqarishBolimi() {
  const { t } = useTranslation("ishlab_chiqarish");
  const saqlash = useIshlabChiqarishStore((holat) => holat.saqlash);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [band, setBand] = useState(false);
  const [xato, setXato] = useState("");
  const [saqlandi, setSaqlandi] = useState(false);
  const [omborlar, setOmborlar] = useState<Ombor[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [deviationPercent, setDeviation] = useState("");
  const [yieldWarnPercent, setYieldWarn] = useState("");
  const [commentRequired, setCommentRequired] = useState(false);
  const [scrapAlertPercent, setScrapAlert] = useState("");
  const [issueStageEnabled, setIssueStage] = useState(true);
  const [defaultSourceWarehouseId, setDefaultSource] = useState("");
  const [defaultDestWarehouseId, setDefaultDest] = useState("");
  const [scrapWarehouseId, setScrapWarehouse] = useState("");

  useEffect(() => {
    let faol = true;
    ishlabChiqarishApi.sozlamaOlish()
      .then((sozlama) => {
        if (!faol) return;
        setEnabled(sozlama.enabled === true);
        setDeviation(sozlama.deviationPercent != null ? String(sozlama.deviationPercent) : "");
        setYieldWarn(sozlama.yieldWarnPercent != null ? String(sozlama.yieldWarnPercent) : "");
        setCommentRequired(sozlama.commentRequired === true);
        setScrapAlert(sozlama.scrapAlertPercent != null ? String(sozlama.scrapAlertPercent) : "");
        setIssueStage(sozlama.issueStageEnabled !== false);
        setDefaultSource(sozlama.defaultSourceWarehouseId ?? "");
        setDefaultDest(sozlama.defaultDestWarehouseId ?? "");
        setScrapWarehouse(sozlama.scrapWarehouseId ?? "");
      })
      .catch((error) => { if (faol) setXato(getApiErrorMessage(error)); })
      .finally(() => { if (faol) setYuklanmoqda(false); });
    omborlarApi.royxat().then((royxat) => { if (faol) setOmborlar(royxat); }).catch(() => undefined);
    return () => { faol = false; };
  }, []);

  async function yuborish() {
    setBand(true);
    setXato("");
    setSaqlandi(false);
    try {
      // Bo'sh ombor — null (sozlamadan o'chiriladi).
      await saqlash({
        enabled,
        deviationPercent: sonMaydoni(deviationPercent),
        yieldWarnPercent: sonMaydoni(yieldWarnPercent),
        commentRequired,
        scrapAlertPercent: sonMaydoni(scrapAlertPercent),
        issueStageEnabled,
        defaultSourceWarehouseId: defaultSourceWarehouseId || null,
        defaultDestWarehouseId: defaultDestWarehouseId || null,
        scrapWarehouseId: scrapWarehouseId || null,
      });
      setSaqlandi(true);
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setBand(false);
    }
  }

  return (
    <div className="space-y-6">
      <BolimKarta sarlavha={t("settings.title")} izoh={t("settings.subtitle")}>
        {yuklanmoqda ? (
          <p className="flex items-center gap-2 text-sm font-bold text-slate-400"><LoaderCircle size={16} className="animate-spin" />{t("loading")}</p>
        ) : (
          <div className="space-y-5">
            <Almashtirgich id="production-enabled" ikonka={<Factory size={24} />} sarlavha={t("settings.enabled")} izoh={t("settings.enabledHint")} qiymat={enabled} onChange={setEnabled} />
            <Almashtirgich id="production-issue-stage" ikonka={<PackageOpen size={24} />} sarlavha={t("settings.issueStageEnabled")} izoh={t(issueStageEnabled ? "settings.issueStageOnHint" : "settings.issueStageOffHint")} qiymat={issueStageEnabled} onChange={setIssueStage} />
            <section className="space-y-3 rounded-2xl border border-slate-200 p-5">
              <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-600"><Warehouse size={17} className="text-blue-600" />{t("settings.warehousesTitle")}</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <OmborMaydoni nom={t("settings.defaultSource")} izoh={t("settings.defaultSourceHint")} value={defaultSourceWarehouseId} onChange={setDefaultSource} omborlar={omborlar} />
                <OmborMaydoni nom={t("settings.defaultDest")} izoh={t("settings.defaultDestHint")} value={defaultDestWarehouseId} onChange={setDefaultDest} omborlar={omborlar} />
                <OmborMaydoni nom={t("settings.scrapWarehouse")} izoh={t("settings.scrapWarehouseHint")} value={scrapWarehouseId} onChange={setScrapWarehouse} omborlar={omborlar} />
              </div>
            </section>
            <section className="space-y-3 rounded-2xl border border-slate-200 p-5">
              <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-600"><AlertTriangle size={17} className="text-amber-500" />{t("settings.controlTitle")}</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="grid content-start gap-1.5"><span className="text-xs font-bold text-slate-500">{t("settings.scrapAlertPercent")}</span><input type="number" min="0" max="100" step="any" value={scrapAlertPercent} placeholder="10" onChange={(event) => setScrapAlert(event.target.value)} className={inputKlass} /><span className="text-xs font-semibold leading-5 text-slate-400">{t("settings.scrapAlertHint")}</span></label>
                <label className="grid content-start gap-1.5"><span className="text-xs font-bold text-slate-500">{t("settings.deviationPercent")}</span><input type="number" min="0" step="any" value={deviationPercent} onChange={(event) => setDeviation(event.target.value)} className={inputKlass} /></label>
                <label className="grid content-start gap-1.5"><span className="text-xs font-bold text-slate-500">{t("settings.yieldWarnPercent")}</span><input type="number" min="0" step="any" value={yieldWarnPercent} onChange={(event) => setYieldWarn(event.target.value)} className={inputKlass} /></label>
              </div>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-600"><input type="checkbox" checked={commentRequired} onChange={(event) => setCommentRequired(event.target.checked)} className="h-5 w-5 accent-orange-500" />{t("settings.commentRequired")}</label>
            </section>
            {xato && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">{xato}</p>}
            {saqlandi && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{t("settings.saved")}</p>}
            <button type="button" disabled={band} onClick={() => void yuborish()} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-6 text-sm font-black text-white hover:bg-orange-600 disabled:opacity-50">{band && <LoaderCircle size={16} className="animate-spin" />}{t("actions.save")}</button>
          </div>
        )}
      </BolimKarta>
      {enabled && <BrakSabablariKartasi />}
    </div>
  );
}

/** Brak sabablari ro'yxati: tayyorlari (Kuygan, Xom qolgan, Shakli buzilgan, Boshqa) o'zi qo'shiladi; qo'shish/o'chirish — ADMIN, DIREKTOR. */
function BrakSabablariKartasi() {
  const { t } = useTranslation("ishlab_chiqarish");
  const profil = useAuthProfileStore((holat) => holat.profil);
  const [sabablar, setSabablar] = useState<BrakSababi[] | null>(null);
  const [nom, setNom] = useState("");
  const [band, setBand] = useState("");
  const [xato, setXato] = useState("");
  // Sozlamalar sahifasi faqat direktorga ochiq; baribir server ADMIN/DIRECTOR tekshiradi.
  const boshqaradi = foydalanuvchiAdminmi(profil);

  useEffect(() => {
    let faol = true;
    ishlabChiqarishApi.brakSabablari.royxat()
      .then((royxat) => { if (faol) setSabablar(royxat); })
      .catch((error) => { if (faol) { setSabablar([]); setXato(getApiErrorMessage(error)); } });
    return () => { faol = false; };
  }, []);

  async function qoshish() {
    const toza = nom.trim();
    if (!toza) return setXato(t("errors.scrapReasonName"));
    setBand("yangi");
    setXato("");
    try {
      const yangi = await ishlabChiqarishApi.brakSabablari.yaratish(toza);
      setSabablar((joriy) => [...(joriy ?? []).filter((sabab) => sabab.id !== yangi.id), yangi]);
      setNom("");
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setBand("");
    }
  }

  async function ochirish(id: string) {
    setBand(id);
    setXato("");
    try {
      await ishlabChiqarishApi.brakSabablari.ochirish(id);
      setSabablar((joriy) => (joriy ?? []).filter((sabab) => sabab.id !== id));
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setBand("");
    }
  }

  return (
    <BolimKarta sarlavha={t("scrapReasons.title")} izoh={t("scrapReasons.subtitle")}>
      {sabablar === null ? (
        <p className="flex items-center gap-2 text-sm font-bold text-slate-400"><LoaderCircle size={16} className="animate-spin" />{t("loading")}</p>
      ) : (
        <div className="space-y-4">
          {sabablar.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-400">{t("scrapReasons.empty")}</p> : (
            <ul className="flex flex-wrap gap-2" aria-label={t("scrapReasons.title")}>
              {sabablar.map((sabab) => (
                <li key={sabab.id} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white py-1.5 pl-3 pr-1.5 text-sm font-bold text-slate-700 shadow-sm">
                  <Tags size={15} className="text-amber-500" />
                  {sabab.name}
                  {sabab.isPreset && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-400">{t("scrapReasons.preset")}</span>}
                  {boshqaradi && (
                    <button type="button" disabled={Boolean(band)} onClick={() => void ochirish(sabab.id)} aria-label={t("scrapReasons.delete", { nom: sabab.name })} className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40">
                      {band === sabab.id ? <LoaderCircle size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {boshqaradi && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input value={nom} maxLength={100} placeholder={t("scrapReasons.placeholder")} aria-label={t("scrapReasons.placeholder")} onChange={(event) => { setNom(event.target.value); setXato(""); }} onKeyDown={(event) => { if (event.key === "Enter") void qoshish(); }} className={`${inputKlass} sm:max-w-sm`} />
              <button type="button" disabled={Boolean(band)} onClick={() => void qoshish()} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-white px-5 text-sm font-black text-orange-600 hover:bg-orange-50 disabled:opacity-50">{band === "yangi" ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />}{t("scrapReasons.add")}</button>
            </div>
          )}
          {xato && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">{xato}</p>}
          <p className="text-xs font-semibold leading-5 text-slate-400">{t("scrapReasons.hint")}</p>
        </div>
      )}
    </BolimKarta>
  );
}
