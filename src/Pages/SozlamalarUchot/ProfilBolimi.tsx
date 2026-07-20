import { useState } from "react";
import { useSozlamalarStore } from "@/store/sozlamalarUchotStore";
import { BolimKarta, Maydon, SaqlashTugma } from "./UmumiyUI";
import { maydonKlass } from "./yordamchilar";

export default function ProfilBolimi() {
  const profil = useSozlamalarStore((s) => s.profil);
  const profilSaqlash = useSozlamalarStore((s) => s.profilSaqlash);

  const [ism, setIsm] = useState(profil.ism);
  const [familiya, setFamiliya] = useState(profil.familiya);
  const [telefon, setTelefon] = useState(profil.telefon);
  const [email, setEmail] = useState(profil.email);
  const [lavozim, setLavozim] = useState(profil.lavozim);
  const [saqlandi, setSaqlandi] = useState(false);

  function saqlash() {
    profilSaqlash({
      ism: ism.trim(),
      familiya: familiya.trim(),
      telefon: telefon.trim(),
      email: email.trim(),
      lavozim: lavozim.trim(),
    });
    setSaqlandi(true);
    setTimeout(() => setSaqlandi(false), 1600);
  }

  const boshHarf = `${familiya[0] ?? ""}${ism[0] ?? ""}`.toUpperCase() || "?";

  return (
    <BolimKarta
      sarlavha="Mening profilim"
      izoh="Shaxsiy ma'lumotlaringiz."
      amal={
        saqlandi ? (
          <span className="text-sm font-bold text-emerald-600">Saqlandi ✓</span>
        ) : undefined
      }
    >
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-xl font-black text-[#FF6A00]">
          {boshHarf}
        </div>
        <div>
          <p className="text-lg font-black text-gray-950">
            {familiya} {ism}
          </p>
          <p className="text-sm font-semibold text-gray-400">{lavozim || "—"}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Maydon label="Ism">
          <input value={ism} onChange={(e) => setIsm(e.target.value)} className={maydonKlass} />
        </Maydon>
        <Maydon label="Familiya">
          <input
            value={familiya}
            onChange={(e) => setFamiliya(e.target.value)}
            className={maydonKlass}
          />
        </Maydon>
        <Maydon label="Telefon">
          <input
            type="tel"
            value={telefon}
            onChange={(e) => setTelefon(e.target.value)}
            className={maydonKlass}
          />
        </Maydon>
        <Maydon label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={maydonKlass}
          />
        </Maydon>
        <Maydon label="Lavozim">
          <input
            value={lavozim}
            onChange={(e) => setLavozim(e.target.value)}
            className={maydonKlass}
          />
        </Maydon>
      </div>

      <div className="mt-6 flex justify-end">
        <SaqlashTugma onClick={saqlash} />
      </div>
    </BolimKarta>
  );
}
