import AppSelect from "@/Components/ui/AppSelect";
import PhoneInput from "@/Components/ui/PhoneInput";
import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { kompaniyalarApi } from "@/api/omborApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import XatoliMaydon from "@/Components/common/XatoliMaydon";
import { useMaydonXatolari } from "@/hooks/useMaydonXatolari";
import type { XatoMaydonQoidasi } from "@/lib/maydonXatolari";
import type { Kompaniya } from "@/types/ombor";
import { BolimKarta, Maydon, SaqlashTugma } from "./UmumiyUI";
import { maydonKlass } from "./yordamchilar";

// Server xatosini kompaniya maydoniga bog'lash (kalit — backend maydon nomi). Umumiy "nomi" oxirida.
const KOMPANIYA_XATO_QOIDALARI: Record<string, XatoMaydonQoidasi> = {
  inn: { maydonlar: ["inn"], kodlar: ["inn"], sozlar: ["stir", "инн", "inn "] },
  phone: { maydonlar: ["phone"], kodlar: ["phone"], sozlar: ["telefon", "phone", "телефон"] },
  currency: { maydonlar: ["currency"], kodlar: ["currency"], sozlar: ["valyuta", "currency", "валют"] },
  address: { maydonlar: ["address"], kodlar: ["address"], sozlar: ["manzil", "address", "адрес"] },
  name: { maydonlar: ["name"], kodlar: ["name"], sozlar: ["kompaniya nomi", "nomi", "name", "название"] },
};

export default function KompaniyaBolimi() {
  const { t } = useTranslation("sozlamalar_uchot");
  const [joriy, setJoriy] = useState<Kompaniya | null>(null);
  const [nomi, setNomi] = useState(""); const [stir, setStir] = useState("");
  const [telefon, setTelefon] = useState(""); const [manzil, setManzil] = useState("");
  const [valyuta, setValyuta] = useState<"UZS" | "USD">("UZS");
  const [yuklanmoqda, setYuklanmoqda] = useState(true); const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [xabar, setXabar] = useState(""); const [xato, setXato] = useState("");
  const fx = useMaydonXatolari(KOMPANIYA_XATO_QOIDALARI);

  useEffect(() => {
    let active = true;
    kompaniyalarApi.royxat().then((items) => { if (!active) return; const item = items[0] ?? null; setJoriy(item); setNomi(item?.name ?? ""); setStir(item?.inn ?? ""); setTelefon(item?.phone ?? ""); setManzil(item?.address ?? ""); setValyuta(item?.currency === "USD" ? "USD" : "UZS"); })
      .catch((error) => active && setXato(getApiErrorMessage(error))).finally(() => active && setYuklanmoqda(false));
    return () => { active = false; };
  }, []);

  async function saqlash() {
    if (!nomi.trim()) { setXato(""); fx.ornat({ name: t("kompaniya.nameRequired") }); return; }
    setSaqlanmoqda(true); setXato(""); setXabar(""); fx.ornat({});
    try {
      const payload = { name: nomi.trim(), inn: stir.trim() || undefined, phone: telefon.trim() || undefined, address: manzil.trim() || undefined, currency: valyuta };
      const saved = joriy ? await kompaniyalarApi.yangilash(joriy.id, payload) : await kompaniyalarApi.yaratish(payload);
      setJoriy(saved); setXabar(t("kompaniya.savedMessage"));
    } catch (error) { fx.serverdan(axios.isAxiosError(error) ? error.response?.data : undefined); setXato(getApiErrorMessage(error)); } finally { setSaqlanmoqda(false); }
  }

  return <BolimKarta sarlavha={t("kompaniya.title")} izoh={t("kompaniya.subtitle")} amal={xabar ? <span className="text-sm font-bold text-emerald-600">{t("saved")}</span> : undefined}>
    {yuklanmoqda ? <div className="flex h-44 items-center justify-center gap-2 text-sm font-bold text-slate-400"><LoaderCircle className="animate-spin" size={20}/>{t("loadingGeneric")}</div> : <>
      {(fx.tepadagi || (fx.bor ? "" : xato)) && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{fx.tepadagi || xato}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <XatoliMaydon xato={fx.xato("name")}><Maydon label={t("kompaniya.fields.name")}><input value={nomi} onChange={(e) => { fx.tozala("name"); setNomi(e.target.value); }} className={maydonKlass}/></Maydon></XatoliMaydon>
        <XatoliMaydon xato={fx.xato("inn")}><Maydon label={t("kompaniya.fields.inn")}><input value={stir} onChange={(e) => { fx.tozala("inn"); setStir(e.target.value); }} className={maydonKlass}/></Maydon></XatoliMaydon>
        <XatoliMaydon xato={fx.xato("phone")}><Maydon label={t("kompaniya.fields.phone")}><PhoneInput value={telefon} onChange={(qiymat) => { fx.tozala("phone"); setTelefon(qiymat); }}/></Maydon></XatoliMaydon>
        <XatoliMaydon xato={fx.xato("currency")}><Maydon label={t("kompaniya.fields.currency")}><AppSelect value={valyuta} onChange={(e) => { fx.tozala("currency"); setValyuta(e.target.value as "UZS" | "USD"); }} className={maydonKlass}><option value="UZS">{t("kompaniya.currencyOptions.uzs")}</option><option value="USD">{t("kompaniya.currencyOptions.usd")}</option></AppSelect></Maydon></XatoliMaydon>
        <div className="sm:col-span-2"><XatoliMaydon xato={fx.xato("address")}><Maydon label={t("kompaniya.fields.address")}><input value={manzil} onChange={(e) => { fx.tozala("address"); setManzil(e.target.value); }} className={maydonKlass}/></Maydon></XatoliMaydon></div>
      </div>
      <div className="mt-6 flex justify-end"><SaqlashTugma disabled={saqlanmoqda} onClick={() => void saqlash()}/></div>
      {saqlanmoqda && <p className="mt-3 text-right text-xs font-bold text-slate-400">{t("savingToBackend")}</p>}
    </>}
  </BolimKarta>;
}
