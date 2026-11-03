import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import PhoneInput from "@/Components/ui/PhoneInput";
import { useTranslation } from "react-i18next";
import XatoliMaydon from "@/Components/common/XatoliMaydon";
import { useMaydonXatolari } from "@/hooks/useMaydonXatolari";
import type { XatoMaydonQoidasi } from "@/lib/maydonXatolari";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { BolimKarta, Maydon, SaqlashTugma } from "./UmumiyUI";
import { maydonKlass } from "./yordamchilar";

import AvatarYuklash, { type TanlanganRasm } from "@/Components/common/AvatarYuklash";
import { avatarApi } from "@/api/avatarApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { useAvatarUrl } from "@/store/avatarStore";
// Server xatosini profil maydoniga bog'lash (kalit — backend maydon nomi; fullName "Ism" maydonida ko'rsatiladi).
const PROFIL_XATO_QOIDALARI: Record<string, XatoMaydonQoidasi> = {
  email: { maydonlar: ["email"], kodlar: ["email"], sozlar: ["email", "e-mail", "почт"] },
  phone: { maydonlar: ["phone"], kodlar: ["phone"], sozlar: ["telefon", "phone", "телефон"] },
  telegramId: { maydonlar: ["telegramId"], kodlar: ["telegram"], sozlar: ["telegram"] },
  position: { maydonlar: ["position"], kodlar: ["position"], sozlar: ["lavozim", "position", "должност"] },
  fullName: { maydonlar: ["fullName"], kodlar: ["full_name"], sozlar: ["full name", "fullname", "f.i.sh", "фио"] },
};

function ismniAjratish(fullName?: string | null) {
  const qismlar = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return { ism: qismlar[0] ?? "", familiya: qismlar.slice(1).join(" ") };
}

export default function ProfilBolimi() {
  const { t } = useTranslation("sozlamalar_uchot");
  const profil = useAuthProfileStore((s) => s.profil);
  const yuklanmoqda = useAuthProfileStore((s) => s.yuklanmoqda);
  const amalBajarilmoqda = useAuthProfileStore((s) => s.amalBajarilmoqda);
  const xatolik = useAuthProfileStore((s) => s.xatolik);
  const muvaffaqiyat = useAuthProfileStore((s) => s.muvaffaqiyat);
  const profilniYuklash = useAuthProfileStore((s) => s.profilniYuklash);
  const profilniYangilash = useAuthProfileStore((s) => s.profilniYangilash);
  const xabarlarniTozalash = useAuthProfileStore((s) => s.xabarlarniTozalash);
  const fx = useMaydonXatolari(PROFIL_XATO_QOIDALARI);
  const [ism, setIsm] = useState("");
  const [familiya, setFamiliya] = useState("");
  const [telefon, setTelefon] = useState("");
  const [email, setEmail] = useState("");
  const [lavozim, setLavozim] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [tanlanganRasm, setTanlanganRasm] = useState<TanlanganRasm | null>(null);
  const [rasmOlibTashlandi, setRasmOlibTashlandi] = useState(false);
  const [rasmXatosi, setRasmXatosi] = useState("");
  const [rasmMahalliy, setRasmMahalliy] = useState(false);
  const [rasmSaqlanmoqda, setRasmSaqlanmoqda] = useState(false);
  const mavjudRasm = useAvatarUrl(profil?.id, profil?.avatarUrl);
  const korinadiganRasm = tanlanganRasm?.dataUrl ?? (rasmOlibTashlandi ? "" : mavjudRasm);

  useEffect(() => { if (!profil && !yuklanmoqda) void profilniYuklash(); }, [profil, profilniYuklash, yuklanmoqda]);
  useEffect(() => {
    const ajratilgan = ismniAjratish(profil?.fullName);
    setIsm(ajratilgan.ism); setFamiliya(ajratilgan.familiya);
    setTelefon(profil?.phone ?? ""); setEmail(profil?.email ?? "");
    setLavozim(profil?.position ?? ""); setTelegramId(profil?.telegramId ?? "");
  }, [profil]);

  async function saqlash() {
    xabarlarniTozalash();
    setRasmXatosi("");
    fx.ornat({});
    // Faqat o'zgargan maydonlar yuboriladi: o'zgarmagan email qayta yuborilsa, backend uni
    // "allaqachon ro'yxatdan o'tgan" (409) deb rad etishi mumkin.
    const yangi = {
      fullName: [ism.trim(), familiya.trim()].filter(Boolean).join(" "),
      phone: telefon.trim(),
      email: email.trim(),
      position: lavozim.trim(),
      telegramId: telegramId.trim(),
    };
    const eski = {
      fullName: (profil?.fullName ?? "").trim(),
      phone: (profil?.phone ?? "").trim(),
      email: (profil?.email ?? "").trim(),
      position: (profil?.position ?? "").trim(),
      telegramId: (profil?.telegramId ?? "").trim(),
    };
    const ozgargan = Object.fromEntries(
      Object.entries(yangi).filter(([kalit, qiymat]) => qiymat !== eski[kalit as keyof typeof eski])
    );
    const malumotOzgardi = Object.keys(ozgargan).length > 0;
    const saqlandi = malumotOzgardi ? await fx.kuzat(() => profilniYangilash(ozgargan)) : true;
    if (!saqlandi || !profil || (!tanlanganRasm && !rasmOlibTashlandi)) return;

    // Rasm profil ma'lumotlari saqlangandan keyin yuklanadi (yoki o'chiriladi).
    setRasmSaqlanmoqda(true);
    try {
      const natija = tanlanganRasm
        ? await avatarApi.yuklash(profil.id, tanlanganRasm.blob, tanlanganRasm.dataUrl, true)
        : await avatarApi.olibTashlash(profil.id, true);
      setRasmMahalliy(natija.mahalliy);
      setTanlanganRasm(null);
      setRasmOlibTashlandi(false);
      if (!natija.mahalliy) await profilniYuklash();
    } catch (error) {
      setRasmXatosi(getApiErrorMessage(error));
    } finally {
      setRasmSaqlanmoqda(false);
    }
  }

  const boshHarf = `${familiya[0] ?? ""}${ism[0] ?? ""}`.toUpperCase() || "?";
  return <BolimKarta sarlavha={t("nav.profil")} izoh={t("profil.subtitle")} amal={muvaffaqiyat ? <span className="text-sm font-bold text-emerald-600">{t("saved")}</span> : undefined}>
    {yuklanmoqda && !profil ? <div className="flex h-48 items-center justify-center gap-2 text-sm font-bold text-slate-400"><LoaderCircle className="animate-spin" size={20}/>{t("profil.loading")}</div> : <>
      {(fx.tepadagi || (fx.bor ? "" : xatolik)) && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{fx.tepadagi || xatolik}</p>}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-3xl bg-gradient-to-br from-gold-50/70 to-white p-5 ring-1 ring-gold-100">
        <AvatarYuklash
          korinadiganRasm={korinadiganRasm}
          bosHarflar={boshHarf}
          disabled={amalBajarilmoqda || rasmSaqlanmoqda}
          onTanlandi={(rasm) => { setTanlanganRasm(rasm); setRasmOlibTashlandi(false); setRasmMahalliy(false); }}
          onOlibTashlandi={() => { setTanlanganRasm(null); setRasmOlibTashlandi(true); setRasmMahalliy(false); }}
        />
        <div className="min-w-0">
          <p className="truncate text-xl font-black text-gray-950">{profil?.fullName || profil?.username || t("profil.unknownUser")}</p>
          <p className="mt-1 inline-flex rounded-full bg-gold-50 px-3 py-1 text-xs font-bold uppercase text-gold-600">{profil?.role || "—"}</p>
          {rasmMahalliy && <p className="mt-2 text-xs font-bold text-amber-600">{t("avatar.localNote")}</p>}
          {rasmXatosi && <p className="mt-2 text-xs font-bold text-red-500">{rasmXatosi}</p>}
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <XatoliMaydon xato={fx.xato("fullName")}><Maydon label={t("profil.fields.firstName")}><input value={ism} onChange={(e) => { fx.tozala("fullName"); setIsm(e.target.value); }} className={maydonKlass}/></Maydon></XatoliMaydon>
        <Maydon label={t("profil.fields.lastName")}><input value={familiya} onChange={(e) => { fx.tozala("fullName"); setFamiliya(e.target.value); }} className={maydonKlass}/></Maydon>
        <XatoliMaydon xato={fx.xato("phone")}><Maydon label={t("profil.fields.phone")}><PhoneInput value={telefon} onChange={(qiymat) => { fx.tozala("phone"); setTelefon(qiymat); }}/></Maydon></XatoliMaydon>
        <XatoliMaydon xato={fx.xato("email")}><Maydon label={t("profil.fields.email")}><input type="email" value={email} onChange={(e) => { fx.tozala("email"); setEmail(e.target.value); }} className={maydonKlass}/></Maydon></XatoliMaydon>
        <XatoliMaydon xato={fx.xato("position")}><Maydon label={t("profil.fields.position")}><input value={lavozim} onChange={(e) => { fx.tozala("position"); setLavozim(e.target.value); }} className={maydonKlass}/></Maydon></XatoliMaydon>
        <XatoliMaydon xato={fx.xato("telegramId")}><Maydon label={t("profil.fields.telegramId")}><input value={telegramId} onChange={(e) => { fx.tozala("telegramId"); setTelegramId(e.target.value); }} className={maydonKlass}/></Maydon></XatoliMaydon>
        <Maydon label={t("profil.fields.login")}><input value={profil?.username ?? ""} disabled className={maydonKlass}/></Maydon>
        <Maydon label={t("profil.fields.role")}><input value={profil?.role ?? ""} disabled className={maydonKlass}/></Maydon>
        {/* Kirishdagi "Do'kon kodi" (Workspace.slug): xodimlarga aytish uchun. Platforma xodimida do'kon yo'q. */}
        {profil?.workspace?.slug && <div className="sm:col-span-2">
          <Maydon label={t("profil.fields.workspaceCode")}><input value={profil.workspace.slug} readOnly onFocus={(e) => e.currentTarget.select()} className={`${maydonKlass} font-mono`}/></Maydon>
          <p className="mt-1.5 text-xs font-medium text-slate-400">{t("profil.workspaceCodeHint")}</p>
        </div>}
      </div>
      <div className="mt-6 flex justify-end"><SaqlashTugma disabled={amalBajarilmoqda || rasmSaqlanmoqda} onClick={() => void saqlash()}/></div>
      {amalBajarilmoqda && <p className="mt-3 text-right text-xs font-bold text-slate-400">{t("savingToBackend")}</p>}
    </>}
  </BolimKarta>;
}
