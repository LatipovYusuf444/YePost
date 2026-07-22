import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { BolimKarta, Maydon, SaqlashTugma } from "./UmumiyUI";
import { maydonKlass } from "./yordamchilar";

function ismniAjratish(fullName?: string | null) {
  const qismlar = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return { ism: qismlar[0] ?? "", familiya: qismlar.slice(1).join(" ") };
}

export default function ProfilBolimi() {
  const profil = useAuthProfileStore((s) => s.profil);
  const yuklanmoqda = useAuthProfileStore((s) => s.yuklanmoqda);
  const amalBajarilmoqda = useAuthProfileStore((s) => s.amalBajarilmoqda);
  const xatolik = useAuthProfileStore((s) => s.xatolik);
  const muvaffaqiyat = useAuthProfileStore((s) => s.muvaffaqiyat);
  const profilniYuklash = useAuthProfileStore((s) => s.profilniYuklash);
  const profilniYangilash = useAuthProfileStore((s) => s.profilniYangilash);
  const xabarlarniTozalash = useAuthProfileStore((s) => s.xabarlarniTozalash);
  const [ism, setIsm] = useState("");
  const [familiya, setFamiliya] = useState("");
  const [telefon, setTelefon] = useState("");
  const [email, setEmail] = useState("");
  const [lavozim, setLavozim] = useState("");
  const [telegramId, setTelegramId] = useState("");

  useEffect(() => { if (!profil && !yuklanmoqda) void profilniYuklash(); }, [profil, profilniYuklash, yuklanmoqda]);
  useEffect(() => {
    const ajratilgan = ismniAjratish(profil?.fullName);
    setIsm(ajratilgan.ism); setFamiliya(ajratilgan.familiya);
    setTelefon(profil?.phone ?? ""); setEmail(profil?.email ?? "");
    setLavozim(profil?.position ?? ""); setTelegramId(profil?.telegramId ?? "");
  }, [profil]);

  async function saqlash() {
    xabarlarniTozalash();
    await profilniYangilash({
      fullName: [ism.trim(), familiya.trim()].filter(Boolean).join(" "),
      phone: telefon.trim(), email: email.trim(), position: lavozim.trim(), telegramId: telegramId.trim(),
    });
  }

  const boshHarf = `${familiya[0] ?? ""}${ism[0] ?? ""}`.toUpperCase() || "?";
  return <BolimKarta sarlavha="Mening profilim" izoh="Shaxsiy ma'lumotlaringiz real hisobdan olinadi." amal={muvaffaqiyat ? <span className="text-sm font-bold text-emerald-600">Saqlandi ✓</span> : undefined}>
    {yuklanmoqda && !profil ? <div className="flex h-48 items-center justify-center gap-2 text-sm font-bold text-slate-400"><LoaderCircle className="animate-spin" size={20}/>Profil yuklanmoqda...</div> : <>
      {xatolik && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xatolik}</p>}
      <div className="flex items-center gap-4"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-xl font-black text-[#FF6A00]">{boshHarf}</div><div><p className="text-lg font-black text-gray-950">{profil?.fullName || profil?.username || "Foydalanuvchi"}</p><p className="text-sm font-semibold text-gray-400">{profil?.role || "—"}</p></div></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Maydon label="Ism"><input value={ism} onChange={(e) => setIsm(e.target.value)} className={maydonKlass}/></Maydon>
        <Maydon label="Familiya"><input value={familiya} onChange={(e) => setFamiliya(e.target.value)} className={maydonKlass}/></Maydon>
        <Maydon label="Telefon"><input type="tel" value={telefon} onChange={(e) => setTelefon(e.target.value)} className={maydonKlass}/></Maydon>
        <Maydon label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={maydonKlass}/></Maydon>
        <Maydon label="Lavozim"><input value={lavozim} onChange={(e) => setLavozim(e.target.value)} className={maydonKlass}/></Maydon>
        <Maydon label="Telegram ID"><input value={telegramId} onChange={(e) => setTelegramId(e.target.value)} className={maydonKlass}/></Maydon>
        <Maydon label="Login"><input value={profil?.username ?? ""} disabled className={`${maydonKlass} bg-slate-50 text-slate-400`}/></Maydon>
        <Maydon label="Tizim roli"><input value={profil?.role ?? ""} disabled className={`${maydonKlass} bg-slate-50 text-slate-400`}/></Maydon>
      </div>
      <div className="mt-6 flex justify-end"><SaqlashTugma disabled={amalBajarilmoqda} onClick={() => void saqlash()}/></div>
      {amalBajarilmoqda && <p className="mt-3 text-right text-xs font-bold text-slate-400">Backendga saqlanmoqda...</p>}
    </>}
  </BolimKarta>;
}
