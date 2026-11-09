import { useEffect, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import TasdiqlashOynasi from "@/Components/common/TasdiqlashOynasi";
import { sotuvTafsilotiniFondaOlish } from "@/api/savdoApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { useSavdoStore } from "@/store/savdoStore";
import type { Sotuv } from "@/types/savdo";
import SotuvTafsilotlariModal from "@/Pages/Savdo/SotuvTafsilotlariModal";
import { harakatHavolasi } from "./tovarHarakatiModeli";
import type { TovarHarakati } from "./types";

export default function HisobotSotuvKorish({ harakat, onYopish }: { harakat: TovarHarakati; onYopish: () => void }) {
  const store = useSavdoStore();
  const [sotuv, setSotuv] = useState<Sotuv | null>(null);
  const [xato, setXato] = useState("");
  const [urinish, setUrinish] = useState(0);
  const [bekor, setBekor] = useState(false);

  useEffect(() => {
    let active = true;
    let request = 0;
    setSotuv(null);
    setXato("");
    async function yuklash() {
      const current = ++request;
      try {
        const document = await sotuvTafsilotiniFondaOlish(harakat.refId!);
        if (active && current === request) { setSotuv(document); setXato(""); }
      } catch (error) {
        if (active && current === request) setXato(getApiErrorMessage(error));
      }
    }
    const yangilash = (event: Event) => {
      if ((event as CustomEvent<{ sotuvId?: string }>).detail?.sotuvId === harakat.refId) void yuklash();
    };
    void yuklash();
    window.addEventListener("savdo:yangilandi", yangilash);
    return () => { active = false; window.removeEventListener("savdo:yangilandi", yangilash); };
  }, [harakat.refId, urinish]);

  if (!sotuv || xato) return <AppModal onClose={onYopish}><div className="w-full max-w-lg space-y-4 rounded-3xl bg-white p-7 shadow-xl">
    <h2 className="text-xl font-bold">{harakat.hujjatRaqam || "Savdo hujjati"}</h2>
    {xato ? <><p role="alert" className="text-sm text-red-600">{xato}</p><button type="button" onClick={() => setUrinish(n => n + 1)} className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 font-semibold text-blue-700"><RefreshCw size={16} />Qayta urinish</button></>
      : <p role="status" className="flex items-center gap-2 text-slate-500"><LoaderCircle className="animate-spin" size={18} />Savdo yuklanmoqda...</p>}
    <button type="button" onClick={onYopish} className="block rounded-xl bg-slate-100 px-4 py-3 font-semibold">Yopish</button>
  </div></AppModal>;

  return <>
    <SotuvTafsilotlariModal
      sotuv={sotuv} qoldiqlar={store.qoldiqlar} xodimlar={store.xodimlar} amalBajarilmoqda={store.amalBajarilmoqda}
      onYopish={onYopish} onYangilash={store.sotuvniYangilash} onTolovQoshish={store.sotuvgaTolovQoshish}
      onTasdiqlash={async id => { await store.sotuvniTasdiqlash(id); }} onBekorQilish={() => setBekor(true)}
      boshlangichTab="Tovarlar" ajratilganQator={{ modificationId: harakat.xarakteristikaId, productId: harakat.productId }}
      hisobotManbasi={harakatHavolasi(harakat) ?? undefined}
    />
    {bekor && <TasdiqlashOynasi ikonka={<RefreshCw size={24} />} sarlavha="Savdoni bekor qilish" nom={harakat.hujjatRaqam}
      tavsif="Savdo bekor qilinadi va tovarlar omborga qaytariladi." ortgaMatni="Ortga" tasdiqMatni="Bekor qilish" jarayonMatni="Bajarilmoqda..."
      onYopish={() => setBekor(false)} onTasdiq={async () => { const ok = await store.sotuvniBekorQilish(sotuv.id); if (ok) setBekor(false); return ok; }} />}
  </>;
}
