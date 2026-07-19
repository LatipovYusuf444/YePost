import { useState } from "react";
import { useSozlamalarStore } from "@/store/sozlamalarUchotStore";
import { BolimKarta, Maydon, SaqlashTugma } from "./UmumiyUI";
import { maydonKlass } from "./yordamchilar";

const valyutalar = ["so'm", "USD", "EUR", "RUB"];

export default function KompaniyaBolimi() {
  const kompaniya = useSozlamalarStore((s) => s.kompaniya);
  const kompaniyaSaqlash = useSozlamalarStore((s) => s.kompaniyaSaqlash);

  const [nomi, setNomi] = useState(kompaniya.nomi);
  const [stir, setStir] = useState(kompaniya.stir);
  const [telefon, setTelefon] = useState(kompaniya.telefon);
  const [manzil, setManzil] = useState(kompaniya.manzil);
  const [valyuta, setValyuta] = useState(kompaniya.valyuta);
  const [saqlandi, setSaqlandi] = useState(false);

  function saqlash() {
    kompaniyaSaqlash({
      nomi: nomi.trim(),
      stir: stir.trim(),
      telefon: telefon.trim(),
      manzil: manzil.trim(),
      valyuta,
    });
    setSaqlandi(true);
    setTimeout(() => setSaqlandi(false), 1600);
  }

  return (
    <BolimKarta
      sarlavha="Kompaniya ma'lumotlari"
      izoh="Hujjatlar va cheklarda ishlatiladi."
      amal={
        saqlandi ? (
          <span className="text-sm font-bold text-emerald-600">Saqlandi ✓</span>
        ) : undefined
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Maydon label="Kompaniya nomi">
          <input value={nomi} onChange={(e) => setNomi(e.target.value)} className={maydonKlass} />
        </Maydon>
        <Maydon label="STIR">
          <input value={stir} onChange={(e) => setStir(e.target.value)} className={maydonKlass} />
        </Maydon>
        <Maydon label="Telefon">
          <input
            type="tel"
            value={telefon}
            onChange={(e) => setTelefon(e.target.value)}
            className={maydonKlass}
          />
        </Maydon>
        <Maydon label="Valyuta">
          <select value={valyuta} onChange={(e) => setValyuta(e.target.value)} className={maydonKlass}>
            {valyutalar.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Maydon>
        <div className="sm:col-span-2">
          <Maydon label="Manzil">
            <input value={manzil} onChange={(e) => setManzil(e.target.value)} className={maydonKlass} />
          </Maydon>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <SaqlashTugma onClick={saqlash} />
      </div>
    </BolimKarta>
  );
}
