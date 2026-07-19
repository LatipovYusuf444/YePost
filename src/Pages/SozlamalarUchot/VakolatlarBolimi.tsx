import { useState } from "react";
import Vakolatlar from "@/Pages/XodimUchot/Vakolatlar";
import { mockLavozimlar, mockXodimlar } from "@/Pages/XodimUchot/mockData";
import type { Xodim } from "@/Pages/XodimUchot/types";
import { BolimKarta } from "./UmumiyUI";

// Vakolatlar (xodim × ruxsat matritsasi) — Sozlamalar ichida (mock).
export default function VakolatlarBolimi() {
  const [xodimlar, setXodimlar] = useState<Xodim[]>(mockXodimlar);

  return (
    <BolimKarta
      sarlavha="Vakolatlar"
      izoh="Lavozimdan kelgan vakolatlar qulflangan; qo'shimchasini katakni bosib yoqing."
    >
      <Vakolatlar
        embedded
        xodimlar={xodimlar}
        lavozimlar={mockLavozimlar}
        onSaqlash={(xodim) =>
          setXodimlar((oldingi) => oldingi.map((x) => (x.id === xodim.id ? xodim : x)))
        }
      />
    </BolimKarta>
  );
}
