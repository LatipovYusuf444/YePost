import AppSelect from "@/Components/ui/AppSelect";
import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { kompaniyalarApi } from "@/api/omborApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { Kompaniya } from "@/types/ombor";
import { BolimKarta, Maydon, SaqlashTugma } from "./UmumiyUI";
import { maydonKlass } from "./yordamchilar";

export default function KompaniyaBolimi() {
  const { t } = useTranslation("sozlamalar_uchot");
  const [joriy, setJoriy] = useState<Kompaniya | null>(null);
  const [nomi, setNomi] = useState(""); const [stir, setStir] = useState("");
  const [telefon, setTelefon] = useState(""); const [manzil, setManzil] = useState("");
  const [valyuta, setValyuta] = useState<"UZS" | "USD">("UZS");
  const [yuklanmoqda, setYuklanmoqda] = useState(true); const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [xabar, setXabar] = useState(""); const [xato, setXato] = useState("");

  useEffect(() => {
    let active = true;
    kompaniyalarApi.royxat().then((items) => { if (!active) return; const item = items[0] ?? null; setJoriy(item); setNomi(item?.name ?? ""); setStir(item?.inn ?? ""); setTelefon(item?.phone ?? ""); setManzil(item?.address ?? ""); setValyuta(item?.currency === "USD" ? "USD" : "UZS"); })
      .catch((error) => active && setXato(getApiErrorMessage(error))).finally(() => active && setYuklanmoqda(false));
    return () => { active = false; };
  }, []);

  async function saqlash() {
    if (!nomi.trim()) { setXato(t("kompaniya.nameRequired")); return; }
    setSaqlanmoqda(true); setXato(""); setXabar("");
    try {
      const payload = { name: nomi.trim(), inn: stir.trim() || undefined, phone: telefon.trim() || undefined, address: manzil.trim() || undefined, currency: valyuta };
      const saved = joriy ? await kompaniyalarApi.yangilash(joriy.id, payload) : await kompaniyalarApi.yaratish(payload);
      setJoriy(saved); setXabar(t("kompaniya.savedMessage"));
    } catch (error) { setXato(getApiErrorMessage(error)); } finally { setSaqlanmoqda(false); }
  }

  return <BolimKarta sarlavha={t("kompaniya.title")} izoh={t("kompaniya.subtitle")} amal={xabar ? <span className="text-sm font-bold text-emerald-600">{t("saved")}</span> : undefined}>
    {yuklanmoqda ? <div className="flex h-44 items-center justify-center gap-2 text-sm font-bold text-slate-400"><LoaderCircle className="animate-spin" size={20}/>{t("loadingGeneric")}</div> : <>
      {xato && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Maydon label={t("kompaniya.fields.name")}><input value={nomi} onChange={(e) => setNomi(e.target.value)} className={maydonKlass}/></Maydon>
        <Maydon label={t("kompaniya.fields.inn")}><input value={stir} onChange={(e) => setStir(e.target.value)} className={maydonKlass}/></Maydon>
        <Maydon label={t("kompaniya.fields.phone")}><input type="tel" value={telefon} onChange={(e) => setTelefon(e.target.value)} className={maydonKlass}/></Maydon>
        <Maydon label={t("kompaniya.fields.currency")}><AppSelect value={valyuta} onChange={(e) => setValyuta(e.target.value as "UZS" | "USD")} className={maydonKlass}><option value="UZS">{t("kompaniya.currencyOptions.uzs")}</option><option value="USD">{t("kompaniya.currencyOptions.usd")}</option></AppSelect></Maydon>
        <div className="sm:col-span-2"><Maydon label={t("kompaniya.fields.address")}><input value={manzil} onChange={(e) => setManzil(e.target.value)} className={maydonKlass}/></Maydon></div>
      </div>
      <div className="mt-6 flex justify-end"><SaqlashTugma disabled={saqlanmoqda} onClick={() => void saqlash()}/></div>
      {saqlanmoqda && <p className="mt-3 text-right text-xs font-bold text-slate-400">{t("savingToBackend")}</p>}
    </>}
  </BolimKarta>;
}
