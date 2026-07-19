import { useState } from "react";
import { useSozlamalarStore } from "@/store/sozlamalarUchotStore";
import { BolimKarta, Maydon, SaqlashTugma, Switch } from "./UmumiyUI";
import { maydonKlass } from "./yordamchilar";

export default function ChekBolimi() {
  const chek = useSozlamalarStore((s) => s.chek);
  const kompaniya = useSozlamalarStore((s) => s.kompaniya);
  const chekSaqlash = useSozlamalarStore((s) => s.chekSaqlash);

  const [sarlavha, setSarlavha] = useState(chek.sarlavha);
  const [pastMatn, setPastMatn] = useState(chek.pastMatn);
  const [telefonKorsat, setTelefonKorsat] = useState(chek.telefonKorsat);
  const [manzilKorsat, setManzilKorsat] = useState(chek.manzilKorsat);
  const [logoKorsat, setLogoKorsat] = useState(chek.logoKorsat);
  const [saqlandi, setSaqlandi] = useState(false);

  function saqlash() {
    chekSaqlash({ sarlavha: sarlavha.trim(), pastMatn: pastMatn.trim(), telefonKorsat, manzilKorsat, logoKorsat });
    setSaqlandi(true);
    setTimeout(() => setSaqlandi(false), 1600);
  }

  return (
    <BolimKarta
      sarlavha="Chek sozlamalari"
      izoh="Sotuv chekida ko'rinadigan ma'lumotlar."
      amal={saqlandi ? <span className="text-sm font-bold text-emerald-600">Saqlandi ✓</span> : undefined}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sozlamalar */}
        <div className="space-y-4">
          <Maydon label="Chek sarlavhasi">
            <input value={sarlavha} onChange={(e) => setSarlavha(e.target.value)} className={maydonKlass} />
          </Maydon>
          <Maydon label="Pastki matn">
            <textarea
              value={pastMatn}
              onChange={(e) => setPastMatn(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-xl border border-slate-200 p-3.5 text-sm font-semibold outline-none focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
            />
          </Maydon>

          <Qatordagi label="Logotipni ko'rsatish" yoniq={logoKorsat} onChange={() => setLogoKorsat((v) => !v)} />
          <Qatordagi label="Telefonni ko'rsatish" yoniq={telefonKorsat} onChange={() => setTelefonKorsat((v) => !v)} />
          <Qatordagi label="Manzilni ko'rsatish" yoniq={manzilKorsat} onChange={() => setManzilKorsat((v) => !v)} />
        </div>

        {/* Oldindan ko'rish */}
        <div>
          <p className="mb-2 text-sm font-bold text-slate-400">Oldindan ko'rish</p>
          <div className="mx-auto max-w-[280px] rounded-2xl border border-dashed border-slate-300 bg-white p-5 font-mono text-xs text-slate-700 shadow-inner">
            {logoKorsat && (
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 font-black text-[#FF6A00]">
                Y
              </div>
            )}
            <p className="text-center text-sm font-black text-slate-900">{sarlavha || kompaniya.nomi}</p>
            {manzilKorsat && <p className="mt-1 text-center text-[11px]">{kompaniya.manzil}</p>}
            {telefonKorsat && <p className="text-center text-[11px]">{kompaniya.telefon}</p>}
            <div className="my-2 border-t border-dashed border-slate-300" />
            <div className="flex justify-between">
              <span>Scotch 4.5×300</span>
              <span>40 000</span>
            </div>
            <div className="flex justify-between">
              <span>Scotch 6×300</span>
              <span>60 000</span>
            </div>
            <div className="my-2 border-t border-dashed border-slate-300" />
            <div className="flex justify-between font-black">
              <span>JAMI</span>
              <span>100 000 {kompaniya.valyuta}</span>
            </div>
            {pastMatn && <p className="mt-3 text-center text-[11px] text-slate-500">{pastMatn}</p>}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <SaqlashTugma onClick={saqlash} />
      </div>
    </BolimKarta>
  );
}

function Qatordagi({ label, yoniq, onChange }: { label: string; yoniq: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
      <span className="text-sm font-bold text-slate-600">{label}</span>
      <Switch yoniq={yoniq} onChange={onChange} />
    </div>
  );
}
