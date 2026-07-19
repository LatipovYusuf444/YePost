import { useState } from "react";
import {
  Bell,
  BookText,
  Building2,
  MapPin,
  PlugZap,
  Receipt,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { foydalanuvchiDirektormi } from "@/lib/roles";
import BildirishnomaBolimi from "./BildirishnomaBolimi";
import ChekBolimi from "./ChekBolimi";
import FiliallarBolimi from "./FiliallarBolimi";
import IntegratsiyaBolimi from "./IntegratsiyaBolimi";
import KompaniyaBolimi from "./KompaniyaBolimi";
import MalumotnomaBolimi from "./MalumotnomaBolimi";
import ProfilBolimi from "./ProfilBolimi";
import VakolatlarBolimi from "./VakolatlarBolimi";
import type { SozlamaBolim } from "./types";

// faqatDirektor: true — bo'lim faqat superadmin/direktor uchun ochiladi.
const bolimlar: { id: SozlamaBolim; nom: string; icon: typeof UserRound; faqatDirektor?: boolean }[] =
  [
    { id: "profil", nom: "Mening profilim", icon: UserRound },
    { id: "kompaniya", nom: "Kompaniya", icon: Building2 },
    { id: "filiallar", nom: "Filiallar", icon: MapPin },
    { id: "malumotnoma", nom: "Ma'lumotnoma", icon: BookText },
    { id: "vakolatlar", nom: "Vakolatlar", icon: ShieldCheck },
    { id: "integratsiya", nom: "Integratsiya", icon: PlugZap, faqatDirektor: true },
    { id: "chek", nom: "Chek sozlamalari", icon: Receipt },
    { id: "bildirishnoma", nom: "Bildirishnomalar", icon: Bell },
  ];

// Sozlamalar uchoti — mock modul (backendsiz). Chapda bo'limlar, o'ngda tanlangani.
export default function SozlamalarUchot() {
  const [bolim, setBolim] = useState<SozlamaBolim>("profil");

  // Rol: SUPERADMIN/OWNER ham DIREKTOR sifatida normallashadi (lib/roles).
  const profil = useAuthProfileStore((s) => s.profil);
  const direktor = foydalanuvchiDirektormi(profil);
  const korinadiganBolimlar = bolimlar.filter((b) => !b.faqatDirektor || direktor);

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">
          Sozlamalar uchoti
        </p>
        <h1 className="mt-1 text-3xl font-black text-gray-950">Sozlamalar</h1>
        <p className="mt-1 text-sm text-gray-500">Profil, kompaniya, filiallar va boshqalar.</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* Chap navigatsiya */}
        <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-orange-100 bg-white p-2 shadow-sm lg:flex-col lg:overflow-visible">
          {korinadiganBolimlar.map((b) => {
            const Ikonka = b.icon;
            const faol = bolim === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setBolim(b.id)}
                className={`inline-flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-bold transition lg:w-full ${
                  faol
                    ? "bg-orange-500 text-white"
                    : "text-gray-500 hover:bg-orange-50 hover:text-orange-600"
                }`}
              >
                <Ikonka size={17} />
                {b.nom}
              </button>
            );
          })}
        </nav>

        {/* O'ng: tanlangan bo'lim */}
        <div className="min-w-0">
          {bolim === "profil" && <ProfilBolimi />}
          {bolim === "kompaniya" && <KompaniyaBolimi />}
          {bolim === "filiallar" && <FiliallarBolimi />}
          {bolim === "malumotnoma" && <MalumotnomaBolimi />}
          {bolim === "vakolatlar" && <VakolatlarBolimi />}
          {bolim === "integratsiya" && direktor && <IntegratsiyaBolimi />}
          {bolim === "chek" && <ChekBolimi />}
          {bolim === "bildirishnoma" && <BildirishnomaBolimi />}
        </div>
      </div>
    </div>
  );
}
