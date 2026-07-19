import { useSozlamalarStore } from "@/store/sozlamalarUchotStore";
import type { BildirishnomaSozlama } from "./types";
import { BolimKarta, Switch } from "./UmumiyUI";

const qatorlar: { kalit: keyof BildirishnomaSozlama; nom: string; izoh: string }[] = [
  { kalit: "yangiSavdo", nom: "Yangi savdo", izoh: "Har yangi sotuv haqida xabar." },
  { kalit: "kamQoldiq", nom: "Kam qoldiq", izoh: "Mahsulot tugab qolganda ogohlantirish." },
  { kalit: "kunlikHisobot", nom: "Kunlik hisobot", izoh: "Har kun oxirida umumiy hisobot." },
  { kalit: "yangiXaridor", nom: "Yangi xaridor", izoh: "Yangi mijoz qo'shilganda xabar." },
];

export default function BildirishnomaBolimi() {
  const bildirishnoma = useSozlamalarStore((s) => s.bildirishnoma);
  const ozgartir = useSozlamalarStore((s) => s.bildirishnomaOzgartir);

  return (
    <BolimKarta sarlavha="Bildirishnomalar" izoh="Qaysi hodisalar haqida xabar olishni tanlang.">
      <div className="space-y-2.5">
        {qatorlar.map((qator) => (
          <div
            key={qator.kalit}
            className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3.5"
          >
            <div>
              <p className="text-sm font-black text-gray-800">{qator.nom}</p>
              <p className="text-xs text-gray-400">{qator.izoh}</p>
            </div>
            <Switch yoniq={bildirishnoma[qator.kalit]} onChange={() => ozgartir(qator.kalit)} />
          </div>
        ))}
      </div>
    </BolimKarta>
  );
}
