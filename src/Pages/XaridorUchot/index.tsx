import { useState } from "react";
import Kompaniyalar from "./Kompaniyalar";
import Xaridorlar from "./Xaridorlar";
import YetkazibBeruvchilar from "./YetkazibBeruvchilar";
import { mockKompaniyalar, mockXaridorlar, mockYetkazibBeruvchilar } from "./mockData";
import type { Xaridor, XaridorKompaniyasi, YetkazibBeruvchi } from "./types";

type Tab = "xaridorlar" | "kompaniyalar" | "yetkazib-beruvchilar";

const tablar: Array<{ id: Tab; nom: string }> = [
  { id: "xaridorlar", nom: "Xaridorlar" },
  { id: "kompaniyalar", nom: "Kompaniya" },
  { id: "yetkazib-beruvchilar", nom: "Yetkazib beruvchilar" },
];

// Mock holat: barcha tablar bitta joydan boshqariladi, backendga so'rov yuborilmaydi.
function saqlash<T extends { id: string }>(royxat: T[], item: T) {
  return royxat.some((old) => old.id === item.id)
    ? royxat.map((old) => (old.id === item.id ? item : old))
    : [item, ...royxat];
}

export default function XaridorUchot() {
  const [faolTab, setFaolTab] = useState<Tab>("xaridorlar");
  const [xaridorlar, setXaridorlar] = useState<Xaridor[]>(mockXaridorlar);
  const [kompaniyalar, setKompaniyalar] = useState<XaridorKompaniyasi[]>(mockKompaniyalar);
  const [yetkazibBeruvchilar, setYetkazibBeruvchilar] =
    useState<YetkazibBeruvchi[]>(mockYetkazibBeruvchilar);

  function kompaniyaniOchirish(id: string) {
    setKompaniyalar((oldRoyxat) => oldRoyxat.filter((item) => item.id !== id));
    setXaridorlar((oldRoyxat) =>
      oldRoyxat.map((xaridor) =>
        xaridor.kompaniyaId === id ? { ...xaridor, kompaniyaId: "" } : xaridor
      )
    );
  }

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

      {faolTab === "xaridorlar" && (
        <Xaridorlar
          xaridorlar={xaridorlar}
          kompaniyalar={kompaniyalar}
          onSaqlash={(xaridor) => setXaridorlar((oldRoyxat) => saqlash(oldRoyxat, xaridor))}
          onOchirish={(id) =>
            setXaridorlar((oldRoyxat) => oldRoyxat.filter((item) => item.id !== id))
          }
        />
      )}

      {faolTab === "kompaniyalar" && (
        <Kompaniyalar
          kompaniyalar={kompaniyalar}
          xaridorlar={xaridorlar}
          onSaqlash={(kompaniya) => setKompaniyalar((oldRoyxat) => saqlash(oldRoyxat, kompaniya))}
          onOchirish={kompaniyaniOchirish}
        />
      )}

      {faolTab === "yetkazib-beruvchilar" && (
        <YetkazibBeruvchilar
          yetkazibBeruvchilar={yetkazibBeruvchilar}
          onSaqlash={(beruvchi) =>
            setYetkazibBeruvchilar((oldRoyxat) => saqlash(oldRoyxat, beruvchi))
          }
          onOchirish={(id) =>
            setYetkazibBeruvchilar((oldRoyxat) => oldRoyxat.filter((item) => item.id !== id))
          }
        />
      )}
    </div>
  );
}
