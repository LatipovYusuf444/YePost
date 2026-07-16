import { useState } from "react";
import Realizatsiya from "./Realizatsiya";
import Kochirma from "./Kochirma";
import Inventarizatsiya from "./Inventarizatsiya";
import Omborlar from "./Omborlar";
import Qoldiqlar from "./Qoldiqlar";

type Tab =
  | "realizatsiya"
  | "inventarizatsiya"
  | "kochirma"
  | "omborlar"
  | "qoldiqlar";

const tablar: Array<{ id: Tab; nom: string }> = [
  { id: "realizatsiya", nom: "Realizatsiya" },
  { id: "inventarizatsiya", nom: "Inventarizatsiya" },
  { id: "kochirma", nom: "Ko'chirma" },
  { id: "omborlar", nom: "Ombor" },
  { id: "qoldiqlar", nom: "Ombordagi qoldiqlar" },
];

const sahifalar: Record<Tab, () => React.JSX.Element> = {
  realizatsiya: Realizatsiya,
  inventarizatsiya: Inventarizatsiya,
  kochirma: Kochirma,
  omborlar: Omborlar,
  qoldiqlar: Qoldiqlar,
};

export default function OmborUchot() {
  const [faolTab, setFaolTab] = useState<Tab>("realizatsiya");
  const FaolSahifa = sahifalar[faolTab];

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-orange-100 bg-white p-2 shadow-sm">
        {tablar.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFaolTab(tab.id)}
            className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold ${
              faolTab === tab.id
                ? "bg-orange-500 text-white"
                : "text-gray-500 hover:bg-orange-50 hover:text-orange-600"
            }`}
          >
            {tab.nom}
          </button>
        ))}
      </div>

      <FaolSahifa />
    </div>
  );
}
