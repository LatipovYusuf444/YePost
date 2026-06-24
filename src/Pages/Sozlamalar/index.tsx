import { useEffect, useState } from "react";
import { AlertTriangle, LoaderCircle, RefreshCw } from "lucide-react";
import { useTenantStore } from "@/store/tenantStore";
import KompaniyaSozlamalari from "./KompaniyaSozlamalari";
import Profil from "./Profil";
import TolovSozlamalari from "./TolovSozlamalari";

type Tab = "ish-maydoni" | "tariflar" | "obunalar";

const tablar: Array<{ id: Tab; nom: string }> = [
  { id: "ish-maydoni", nom: "Ish maydoni" },
  { id: "tariflar", nom: "Tariflar" },
  { id: "obunalar", nom: "Obunalar" },
];

export default function Sozlamalar() {
  const store = useTenantStore();
  const malumotlarniYuklash = store.malumotlarniYuklash;
  const [tab, setTab] = useState<Tab>("ish-maydoni");

  useEffect(() => {
    void malumotlarniYuklash();
  }, [malumotlarniYuklash]);

  if (store.yuklanmoqda) {
    return (
      <div className="flex h-72 items-center justify-center">
        <LoaderCircle className="animate-spin text-orange-500" size={34} />
      </div>
    );
  }

  if (store.profil && store.profil.role !== "DIREKTOR") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <AlertTriangle className="text-amber-500" />
        <h1 className="mt-3 text-2xl font-black">Direktor ruxsati kerak</h1>
        <p className="mt-2 text-gray-600">
          Ish maydoni, tarif va obunalarni faqat direktor boshqarishi mumkin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">
            Direktor boshqaruvi
          </p>
          <h1 className="text-3xl font-black">Tizim va obuna sozlamalari</h1>
          <p className="mt-1 text-sm text-gray-500">
            {store.profil?.fullName ?? store.profil?.username} · Direktor
          </p>
        </div>
        <button
          onClick={() => void malumotlarniYuklash()}
          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-4 font-bold text-gray-600 ring-1 ring-orange-100"
        >
          <RefreshCw size={16} />
          Yangilash
        </button>
      </header>

      {store.xatolik && (
        <div className="flex justify-between rounded-2xl bg-red-50 p-4 font-bold text-red-600">
          <span>{store.xatolik}</span>
          <button onClick={store.xatolikniTozalash}>Yopish</button>
        </div>
      )}

      <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-orange-100 bg-white p-2">
        {tablar.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`rounded-xl px-5 py-2.5 font-bold ${
              tab === item.id
                ? "bg-orange-500 text-white"
                : "text-gray-500 hover:bg-orange-50"
            }`}
          >
            {item.nom}
          </button>
        ))}
      </nav>

      {tab === "ish-maydoni" && <KompaniyaSozlamalari />}
      {tab === "tariflar" && <TolovSozlamalari />}
      {tab === "obunalar" && <Profil />}
    </div>
  );
}
