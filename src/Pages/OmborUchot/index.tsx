import { useState } from "react";
import Kochirma from "./Kochirma";
import Qoldiqlar from "./Qoldiqlar";

type Tab =
  | "kochirma"
  | "qoldiqlar";

const tablar: Array<{ id: Tab; nom: string }> = [
  { id: "kochirma", nom: "Ko'chirma" },
  { id: "qoldiqlar", nom: "Ombordagi qoldiqlar" },
];

const sahifalar: Record<Tab, () => React.JSX.Element> = {
  kochirma: Kochirma,
  qoldiqlar: Qoldiqlar,
};

export default function OmborUchot() {
  const [faolTab, setFaolTab] = useState<Tab>("kochirma");
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
