import AppModal from "@/Components/common/AppModal";
import "@/Components/common/report-document.css";
import InventoryHujjatModal from "@/Pages/Ombor/InventoryHujjatModal";
import KirimTafsilotModal from "@/Pages/Ombor/KirimTafsilotModal";
import ChiqimTafsilotModal from "@/Pages/Ombor/ChiqimTafsilotModal";
import KochirishKorishModal from "@/Pages/Ombor/KochirishKorishModal";
import QaytarishTafsilotlariModal from "@/Pages/Savdo/QaytarishTafsilotlariModal";
import HisobotSotuvKorish from "./HisobotSotuvKorish";
import { harakatHavolasi, harakatTuriNomi } from "./tovarHarakatiModeli";
import type { TovarHarakati } from "./types";

// Har doim asl hujjat IDsi ishlatiladi. Hisobot qatoridan hujjat yasalmaydi.
export default function HujjatKorish({ harakat, onYopish }: { harakat: TovarHarakati; onYopish: () => void }) {
  const props = { id: harakat.refId || "", onClose: onYopish,
    ajratilganQator: { modificationId: harakat.xarakteristikaId, productId: harakat.productId },
    hisobotManbasi: harakatHavolasi(harakat) ?? undefined };
  if (harakat.refId) {
    switch (harakat.type) {
      case "SALE": return <HisobotSotuvKorish harakat={harakat} onYopish={onYopish} />;
      case "STOCK_TAKE": return <InventoryHujjatModal {...props} tur="inventarizatsiya" />;
      case "WRITE_OFF": return <ChiqimTafsilotModal {...props} />;
      case "PURCHASE": return <KirimTafsilotModal {...props} />;
      case "TRANSFER": case "TRANSFER_IN": case "TRANSFER_OUT": return <KochirishKorishModal {...props} />;
      case "RETURN": case "SALE_RETURN": return <QaytarishTafsilotlariModal qaytarishId={harakat.refId} onYopish={onYopish} ajratilganQator={props.ajratilganQator} />;
    }
  }
  return <AppModal onClose={onYopish}><div className="w-full max-w-lg space-y-4 rounded-3xl bg-white p-7 shadow-xl">
    <h2 className="text-xl font-bold">{harakatTuriNomi(harakat)} {harakat.hujjatRaqam}</h2>
    <p role="alert" className="text-sm text-slate-600">{harakat.refId ? "Ushbu harakat turi uchun asl hujjat oynasi hali mavjud emas." : "Hisobotda asl hujjat IDsi ko'rsatilmagan. Hujjatni ochib bo'lmaydi."}</p>
    <button type="button" onClick={onYopish} className="rounded-xl bg-slate-100 px-4 py-3 font-semibold">Yopish</button>
  </div></AppModal>;
}
