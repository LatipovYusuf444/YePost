import { useState } from "react";
import TashkilotTuzilmasi from "./TashkilotTuzilmasi";
import Xodimlar from "./Xodimlar";
import { mockBolimlar, mockLavozimlar, mockXodimlar } from "./mockData";
import type { Bolim, Lavozim, Xodim } from "./types";

// Vakolatlar endi Sozlamalarda (SozlamalarUchot/VakolatlarBolimi).
// "Tashkilot tuzilmasi" — tab emas: bosilganda to'liq ekranli oyna ochadi.
type Tab = "xodimlar";

const tablar: Array<{ id: Tab; nom: string }> = [{ id: "xodimlar", nom: "Xodimlar" }];

// Mock holat: barcha tablar bitta joydan boshqariladi, backendga so'rov yuborilmaydi.
function saqlash<T extends { id: string }>(royxat: T[], item: T) {
  return royxat.some((old) => old.id === item.id)
    ? royxat.map((old) => (old.id === item.id ? item : old))
    : [item, ...royxat];
}

export default function XodimUchot() {
  const [faolTab, setFaolTab] = useState<Tab>("xodimlar");
  const [tuzilmaOchiq, setTuzilmaOchiq] = useState(false);
  const [xodimlar, setXodimlar] = useState<Xodim[]>(mockXodimlar);
  const [lavozimlar] = useState<Lavozim[]>(mockLavozimlar);
  const [bolimlar, setBolimlar] = useState<Bolim[]>(mockBolimlar);

  function xodimniOchirish(id: string) {
    setXodimlar((oldRoyxat) => oldRoyxat.filter((item) => item.id !== id));
    setBolimlar((oldRoyxat) =>
      oldRoyxat.map((bolim) =>
        bolim.rahbarIdlar.includes(id)
          ? { ...bolim, rahbarIdlar: bolim.rahbarIdlar.filter((xodimId) => xodimId !== id) }
          : bolim
      )
    );
  }

  // Bo'lim o'chirilsa: ostidagi bo'limlar bir pog'ona yuqoriga ko'chadi,
  // xodimlarning bo'lim biriktirmasi bo'shaydi.
  function bolimniOchirish(id: string) {
    const ochirilgan = bolimlar.find((bolim) => bolim.id === id);
    setBolimlar((oldRoyxat) =>
      oldRoyxat
        .filter((bolim) => bolim.id !== id)
        .map((bolim) =>
          bolim.otaId === id ? { ...bolim, otaId: ochirilgan?.otaId ?? "" } : bolim
        )
    );
    setXodimlar((oldRoyxat) =>
      oldRoyxat.map((xodim) => (xodim.bolimId === id ? { ...xodim, bolimId: "" } : xodim))
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

        <button
          onClick={() => setTuzilmaOchiq(true)}
          className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold ${
            tuzilmaOchiq
              ? "bg-orange-500 text-white"
              : "text-gray-500 hover:bg-orange-50 hover:text-orange-600"
          }`}
        >
          Tashkilot tuzilmasi
        </button>
      </div>

      {faolTab === "xodimlar" && (
        <Xodimlar
          xodimlar={xodimlar}
          lavozimlar={lavozimlar}
          bolimlar={bolimlar}
          onSaqlash={(xodim) => setXodimlar((oldRoyxat) => saqlash(oldRoyxat, xodim))}
          onOchirish={xodimniOchirish}
        />
      )}

      {tuzilmaOchiq && (
        <TashkilotTuzilmasi
          bolimlar={bolimlar}
          xodimlar={xodimlar}
          lavozimlar={lavozimlar}
          onBolimSaqlash={(bolim) => setBolimlar((oldRoyxat) => saqlash(oldRoyxat, bolim))}
          onBolimOchirish={bolimniOchirish}
          onXodimSaqlash={(xodim) => setXodimlar((oldRoyxat) => saqlash(oldRoyxat, xodim))}
          onYopish={() => setTuzilmaOchiq(false)}
        />
      )}
    </div>
  );
}
