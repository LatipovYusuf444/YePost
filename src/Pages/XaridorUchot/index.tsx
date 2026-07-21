import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { mijozKompaniyalariApi, mijozlarApi, yetkazibBeruvchilarApi } from "@/api/partnersApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { sotuvlarRoyxatiniOlish } from "@/api/savdoApi";
import { kirimApi, omborlarApi, omborMasullari } from "@/api/omborApi";
import Kompaniyalar from "./Kompaniyalar";
import Xaridorlar from "./Xaridorlar";
import YetkazibBeruvchilar from "./YetkazibBeruvchilar";
import { kompaniyaniUiGa, kirimniUiGa, mijozniUiGa, sotuvniUiGa, yetkazibBeruvchiniUiGa } from "./backendAdapters";
import type { Kirim, Xaridor, XaridorKompaniyasi, XaridorSavdosi, YetkazibBeruvchi } from "./types";

type Tab = "xaridorlar" | "kompaniyalar" | "yetkazib-beruvchilar";

type Props = {
  faolTab?: Tab;
};

function customFieldsniTekshir(customFields: Record<string, unknown> | undefined) {
  const value = customFields ?? {};
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength > 2048) {
    throw new Error("Maxsus maydonlar hajmi 2KB dan oshmasligi kerak.");
  }
  return value;
}

export default function XaridorUchot({ faolTab = "xaridorlar" }: Props) {
  const [xaridorlar, setXaridorlar] = useState<Xaridor[]>([]);
  const [kompaniyalar, setKompaniyalar] = useState<XaridorKompaniyasi[]>([]);
  const [yetkazibBeruvchilar, setYetkazibBeruvchilar] = useState<YetkazibBeruvchi[]>([]);
  const [savdolar, setSavdolar] = useState<XaridorSavdosi[]>([]);
  const [kirimlar, setKirimlar] = useState<Kirim[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [amalBajarilmoqda, setAmalBajarilmoqda] = useState(false);
  const [xatolik, setXatolik] = useState("");

  const yuklash = useCallback(async () => {
    setYuklanmoqda(true);
    setXatolik("");
    try {
      const [customers, companies, suppliers, sales, purchases, warehouses, responsibles] = await Promise.all([
        mijozlarApi.royxat(),
        mijozKompaniyalariApi.royxat(),
        yetkazibBeruvchilarApi.royxat(),
        sotuvlarRoyxatiniOlish(),
        kirimApi.royxat(),
        omborlarApi.royxat(),
        omborMasullari(),
      ]);
      setXaridorlar(customers.map(mijozniUiGa));
      setKompaniyalar(companies.map(kompaniyaniUiGa));
      setYetkazibBeruvchilar(suppliers.map(yetkazibBeruvchiniUiGa));
      const lookup = { omborlar: warehouses, masullar: responsibles };
      setSavdolar(sales.map((item) => sotuvniUiGa(item, lookup)));
      setKirimlar(purchases.map((item) => kirimniUiGa(item, lookup)));
    } catch (error) {
      setXatolik(getApiErrorMessage(error));
    } finally {
      setYuklanmoqda(false);
    }
  }, []);

  useEffect(() => { void yuklash(); }, [yuklash]);

  async function xaridorSaqlash(xaridor: Xaridor) {
    setAmalBajarilmoqda(true); setXatolik("");
    try {
      const customFields = customFieldsniTekshir({
        ...(xaridor.customFields ?? {}),
        position: xaridor.lavozim.trim() || undefined,
        whatsapp: xaridor.ijtimoiy.whatsapp.trim() || undefined,
        instagram: xaridor.ijtimoiy.instagram.trim() || undefined,
        extraPhones: xaridor.telefonlar.slice(1).map((item) => item.trim()).filter(Boolean),
      });
      const payload = {
        firstName: xaridor.ism.trim(),
        lastName: xaridor.familiya.trim(),
        phone: xaridor.telefonlar.find((item) => item.trim())?.trim() ?? "",
        address: xaridor.manzil.trim() || undefined,
        telegramId: xaridor.ijtimoiy.telegram.trim() || undefined,
        companyId: xaridor.kompaniyaId || undefined,
        customFields,
      };
      const mavjud = xaridorlar.some((item) => item.id === xaridor.id);
      const saved = mavjud ? await mijozlarApi.yangilash(xaridor.id, payload) : await mijozlarApi.yaratish(payload);
      const ui = mijozniUiGa(saved);
      setXaridorlar((current) => mavjud ? current.map((item) => item.id === ui.id ? ui : item) : [ui, ...current]);
      return ui;
    } catch (error) {
      setXatolik(getApiErrorMessage(error));
      throw error;
    } finally { setAmalBajarilmoqda(false); }
  }

  async function xaridorOchirish(id: string) {
    setAmalBajarilmoqda(true); setXatolik("");
    try { await mijozlarApi.ochirish(id); setXaridorlar((items) => items.filter((item) => item.id !== id)); return true; }
    catch (error) { setXatolik(getApiErrorMessage(error)); return false; }
    finally { setAmalBajarilmoqda(false); }
  }

  async function kompaniyaSaqlash(kompaniya: XaridorKompaniyasi) {
    setAmalBajarilmoqda(true); setXatolik("");
    try {
      const payload = {
        name: kompaniya.nomi.trim(),
        inn: kompaniya.stir.trim() || undefined,
        phone: kompaniya.telefon.trim() || undefined,
        contactPerson: kompaniya.aloqaShaxsi.trim() || undefined,
        position: kompaniya.lavozim.trim() || undefined,
        socials: {
          telegram: kompaniya.ijtimoiy.telegram.trim() || undefined,
          whatsapp: kompaniya.ijtimoiy.whatsapp.trim() || undefined,
          instagram: kompaniya.ijtimoiy.instagram.trim() || undefined,
          website: kompaniya.ijtimoiy.website?.trim() || undefined,
        },
        customFields: customFieldsniTekshir(kompaniya.customFields),
      };
      const mavjud = kompaniyalar.some((item) => item.id === kompaniya.id);
      const saved = mavjud ? await mijozKompaniyalariApi.yangilash(kompaniya.id, payload) : await mijozKompaniyalariApi.yaratish(payload);
      const ui = kompaniyaniUiGa(saved);
      setKompaniyalar((current) => mavjud ? current.map((item) => item.id === ui.id ? ui : item) : [ui, ...current]);
      return ui;
    } catch (error) { setXatolik(getApiErrorMessage(error)); throw error; }
    finally { setAmalBajarilmoqda(false); }
  }

  async function kompaniyaOchirish(id: string) {
    setAmalBajarilmoqda(true); setXatolik("");
    try { await mijozKompaniyalariApi.ochirish(id); setKompaniyalar((items) => items.filter((item) => item.id !== id)); await yuklash(); return true; }
    catch (error) { setXatolik(getApiErrorMessage(error)); return false; }
    finally { setAmalBajarilmoqda(false); }
  }

  async function yetkazibBeruvchiSaqlash(beruvchi: YetkazibBeruvchi) {
    setAmalBajarilmoqda(true); setXatolik("");
    try {
      const payload = {
        name: beruvchi.nomi.trim(),
        inn: beruvchi.stir.trim() || undefined,
        phone: beruvchi.telefon.trim() || undefined,
        contactPerson: beruvchi.aloqaShaxsi.trim() || undefined,
        position: beruvchi.lavozim.trim() || undefined,
        socials: {
          telegram: beruvchi.ijtimoiy.telegram.trim() || undefined,
          whatsapp: beruvchi.ijtimoiy.whatsapp.trim() || undefined,
          instagram: beruvchi.ijtimoiy.instagram.trim() || undefined,
          website: beruvchi.ijtimoiy.website?.trim() || undefined,
        },
        customFields: customFieldsniTekshir(beruvchi.customFields),
      };
      const mavjud = yetkazibBeruvchilar.some((item) => item.id === beruvchi.id);
      const saved = mavjud ? await yetkazibBeruvchilarApi.yangilash(beruvchi.id, payload) : await yetkazibBeruvchilarApi.yaratish(payload);
      const ui = yetkazibBeruvchiniUiGa(saved);
      setYetkazibBeruvchilar((current) => mavjud ? current.map((item) => item.id === ui.id ? ui : item) : [ui, ...current]);
      return ui;
    } catch (error) { setXatolik(getApiErrorMessage(error)); throw error; }
    finally { setAmalBajarilmoqda(false); }
  }

  async function yetkazibBeruvchiOchirish(id: string) {
    setAmalBajarilmoqda(true); setXatolik("");
    try { await yetkazibBeruvchilarApi.ochirish(id); setYetkazibBeruvchilar((items) => items.filter((item) => item.id !== id)); return true; }
    catch (error) { setXatolik(getApiErrorMessage(error)); return false; }
    finally { setAmalBajarilmoqda(false); }
  }

  return (
    <div className="space-y-5">
      {xatolik && <div className="flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600"><span>{xatolik}</span><button onClick={() => void yuklash()} className="inline-flex items-center gap-2"><RefreshCw size={16}/>Qayta urinish</button></div>}
      {(yuklanmoqda || amalBajarilmoqda) && <div className="flex items-center justify-center gap-2 rounded-2xl bg-white p-3 text-sm font-bold text-slate-500"><LoaderCircle className="animate-spin" size={18}/>{yuklanmoqda ? "Backend ma’lumotlari yuklanmoqda..." : "Saqlanmoqda..."}</div>}

      {!yuklanmoqda && faolTab === "xaridorlar" && (
        <Xaridorlar xaridorlar={xaridorlar} kompaniyalar={kompaniyalar} savdolar={savdolar} onSaqlash={xaridorSaqlash} onOchirish={xaridorOchirish}/>
      )}
      {!yuklanmoqda && faolTab === "kompaniyalar" && (
        <Kompaniyalar kompaniyalar={kompaniyalar} xaridorlar={xaridorlar} savdolar={savdolar} onSaqlash={kompaniyaSaqlash} onOchirish={kompaniyaOchirish}/>
      )}
      {!yuklanmoqda && faolTab === "yetkazib-beruvchilar" && (
        <YetkazibBeruvchilar yetkazibBeruvchilar={yetkazibBeruvchilar} kirimlar={kirimlar} onSaqlash={yetkazibBeruvchiSaqlash} onOchirish={yetkazibBeruvchiOchirish}/>
      )}
    </div>
  );
}
