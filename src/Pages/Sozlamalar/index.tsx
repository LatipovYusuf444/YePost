import { useEffect, useState } from "react";
import {
  CreditCard,
  KeyRound,
  Layers3,
  LoaderCircle,
  PlugZap,
  RefreshCw,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { useTenantStore } from "@/store/tenantStore";
import KompaniyaSozlamalari from "./KompaniyaSozlamalari";
import Integratsiyalar from "./Integratsiyalar";
import Profil from "./Profil";
import ShaxsiyProfil from "./ShaxsiyProfil";
import TolovSozlamalari from "./TolovSozlamalari";
import Xavsizlik from "./Xavsizlik";

type Tab =
  | "profil"
  | "xavfsizlik"
  | "ish-maydoni"
  | "integratsiyalar"
  | "tariflar"
  | "obunalar";

const shaxsiyTablar: Array<{
  id: Tab;
  nom: string;
  icon: typeof UserRound;
}> = [
  { id: "profil", nom: "Mening profilim", icon: UserRound },
  { id: "xavfsizlik", nom: "Xavfsizlik", icon: KeyRound },
];

const direktorTablari: Array<{
  id: Tab;
  nom: string;
  icon: typeof UserRound;
}> = [
  { id: "ish-maydoni", nom: "Ish maydoni", icon: Layers3 },
  { id: "integratsiyalar", nom: "Integratsiyalar", icon: PlugZap },
  { id: "tariflar", nom: "Tariflar", icon: CreditCard },
  { id: "obunalar", nom: "Obunalar", icon: WalletCards },
];

export default function Sozlamalar() {
  const tenantStore = useTenantStore();
  const profilStore = useAuthProfileStore();
  const tenantlarniYuklash = tenantStore.malumotlarniYuklash;
  const profilniYuklash = profilStore.profilniYuklash;
  const [tab, setTab] = useState<Tab>("profil");

  useEffect(() => {
    void Promise.all([profilniYuklash(), tenantlarniYuklash()]);
  }, [profilniYuklash, tenantlarniYuklash]);

  const direktor = profilStore.profil?.role === "DIREKTOR";
  const tablar = direktor
    ? [...shaxsiyTablar, ...direktorTablari]
    : shaxsiyTablar;

  if (profilStore.yuklanmoqda) {
    return (
      <div className="flex h-72 items-center justify-center">
        <LoaderCircle className="animate-spin text-orange-500" size={34} />
      </div>
    );
  }

  async function yangilash() {
    profilStore.xabarlarniTozalash();
    await profilniYuklash();
    if (direktor) await tenantlarniYuklash();
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">
            Hisob va tizim sozlamalari
          </p>
          <h1 className="text-3xl font-black">Sozlamalar</h1>
          <p className="mt-1 text-sm text-gray-500">
            {profilStore.profil?.fullName ?? profilStore.profil?.username}
            {" · "}
            {direktor ? "Direktor" : profilStore.profil?.role}
          </p>
        </div>
        <button
          onClick={() => void yangilash()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white px-4 font-bold text-gray-600 ring-1 ring-orange-100"
        >
          <RefreshCw size={16} />
          Yangilash
        </button>
      </header>

      {(profilStore.xatolik || (direktor && tenantStore.xatolik)) && (
        <div className="flex justify-between rounded-2xl bg-red-50 p-4 font-bold text-red-600">
          <span>{profilStore.xatolik ?? tenantStore.xatolik}</span>
          <button
            onClick={() => {
              profilStore.xabarlarniTozalash();
              tenantStore.xatolikniTozalash();
            }}
          >
            Yopish
          </button>
        </div>
      )}

      <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-orange-100 bg-white p-2">
        {tablar.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 font-bold ${
                tab === item.id
                  ? "bg-orange-500 text-white"
                  : "text-gray-500 hover:bg-orange-50"
              }`}
            >
              <Icon size={17} />
              {item.nom}
            </button>
          );
        })}
      </nav>

      {tab === "profil" && <ShaxsiyProfil />}
      {tab === "xavfsizlik" && <Xavsizlik />}
      {direktor && tab === "ish-maydoni" && <KompaniyaSozlamalari />}
      {direktor && tab === "integratsiyalar" && <Integratsiyalar />}
      {direktor && tab === "tariflar" && <TolovSozlamalari />}
      {direktor && tab === "obunalar" && <Profil />}
    </div>
  );
}
