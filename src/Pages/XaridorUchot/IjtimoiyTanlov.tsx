import { useState, type ReactNode } from "react";
import { InstagramIkonka, TelegramIkonka, WhatsappIkonka } from "./IjtimoiyIkonkalar";
import type { IjtimoiyTarmoqlar } from "./types";
import { maydonKlass } from "./yordamchilar";

type TarmoqKaliti = keyof IjtimoiyTarmoqlar;

const tarmoqlar: Array<{
  kalit: TarmoqKaliti;
  nom: string;
  ikonka: ReactNode;
  rang: string;
  placeholder: string;
}> = [
  {
    kalit: "telegram",
    nom: "Telegram",
    ikonka: <TelegramIkonka size={18} />,
    rang: "bg-[#E7F3FB] text-[#229ED9]",
    placeholder: "@username",
  },
  {
    kalit: "whatsapp",
    nom: "WhatsApp",
    ikonka: <WhatsappIkonka size={18} />,
    rang: "bg-[#E6F6EC] text-[#25D366]",
    placeholder: "+998 90 123 45 67",
  },
  {
    kalit: "instagram",
    nom: "Instagram",
    ikonka: <InstagramIkonka size={18} />,
    rang: "bg-[#FCE9F1] text-[#E1306C]",
    placeholder: "username",
  },
];

// Uchta ikonka qatori: bittasi tanlansa, o'sha tarmoq uchun yozish maydoni ochiladi.
export default function IjtimoiyTanlov({
  qiymatlar,
  onChange,
}: {
  qiymatlar: IjtimoiyTarmoqlar;
  onChange: (tarmoq: TarmoqKaliti, qiymat: string) => void;
}) {
  const [faol, setFaol] = useState<TarmoqKaliti | null>(null);
  const tanlangan = tarmoqlar.find((tarmoq) => tarmoq.kalit === faol);

  return (
    <div className="grid gap-2">
      <span className="text-sm font-bold text-slate-400">Ijtimoiy tarmoqlar</span>

      <div className="flex items-center gap-2">
        {tarmoqlar.map((tarmoq) => {
          const toldirilgan = Boolean((qiymatlar[tarmoq.kalit] ?? "").trim());
          const ochiq = faol === tarmoq.kalit;
          return (
            <button
              key={tarmoq.kalit}
              type="button"
              onClick={() => setFaol(ochiq ? null : tarmoq.kalit)}
              title={tarmoq.nom}
              className={`relative flex h-11 w-11 items-center justify-center rounded-xl transition ${tarmoq.rang} ${
                ochiq ? "ring-2 ring-[#FF6A00] ring-offset-2" : "opacity-70 hover:opacity-100"
              }`}
              aria-label={tarmoq.nom}
            >
              {tarmoq.ikonka}
              {toldirilgan && (
                <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
              )}
            </button>
          );
        })}
      </div>

      {tanlangan && (
        <input
          key={tanlangan.kalit}
          autoFocus
          value={qiymatlar[tanlangan.kalit] ?? ""}
          onChange={(event) => onChange(tanlangan.kalit, event.target.value)}
          placeholder={`${tanlangan.nom}: ${tanlangan.placeholder}`}
          className={maydonKlass}
        />
      )}
    </div>
  );
}
