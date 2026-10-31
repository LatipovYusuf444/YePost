import { useMahsulotlarStore } from "@/store/mahsulotlarStore";
import { useEffect, useState, type FormEvent } from "react";
import { LoaderCircle, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import AppModal from "@/Components/common/AppModal";
import { mahsulotBirliklariApi } from "@/api/catalogApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { Mahsulot, OlchovBirligi } from "@/types/catalog";
import BirlikQatorlariMaydoni from "./BirlikQatorlari";
import { birlikQatorlariniOlish, birlikRoyxatiniYigish, type BirlikQatori } from "./birlikQatorlariMantiq";

// Tovar birliklari: asosiy birlikda qoldiq yuritiladi, qo'shimcha birliklar (pochka, qop, korobka) koeffitsient bilan qo'yiladi.
// Koeffitsient — 1 shu birlikda nechta asosiy birlik. Narx bo'sh bo'lsa asosiy narx × koeffitsient olinadi.
// Qator tahrirlagichi (BirlikQatorlari.tsx) mahsulot oynasidagi "Birliklar" bo'limi bilan umumiy.

export default function BirliklarModal({ product, birliklar, onClose }: { product: Mahsulot; birliklar: OlchovBirligi[]; onClose: () => void }) {
  const { t } = useTranslation("mahsulotlar");
  const [qatorlar, setQatorlar] = useState<BirlikQatori[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [xato, setXato] = useState("");
  const [birlikYaratilmoqda, setBirlikYaratilmoqda] = useState(false);
  const donaBirliginiQoshish = useMahsulotlarStore((state) => state.donaBirliginiQoshish);
  async function donaQoshish() {
    setBirlikYaratilmoqda(true);
    try { return await donaBirliginiQoshish(); }
    finally { setBirlikYaratilmoqda(false); }
  }
  const asosiy = birliklar.find((birlik) => birlik.id === product.unitId) ?? product.unit;
  const asosiyNomi = asosiy?.shortName ?? asosiy?.name ?? t("fallback.unit");

  useEffect(() => {
    let active = true;
    mahsulotBirliklariApi.olish(product.id)
      .then((royxat) => {
        if (active) setQatorlar(birlikQatorlariniOlish(royxat));
      })
      .catch((error) => { if (active) setXato(getApiErrorMessage(error)); })
      .finally(() => { if (active) setYuklanmoqda(false); });
    return () => { active = false; };
  }, [product.id]);

  async function saqlash(event: FormEvent) {
    event.preventDefault();
    if (birlikYaratilmoqda || saqlanmoqda) return;
    setXato("");
    const yigilgan = birlikRoyxatiniYigish(qatorlar, birliklar, { unitId: product.unitId, nomi: asosiyNomi });
    if ("xato" in yigilgan) return setXato(t(`units.errors.${yigilgan.xato}`));
    setSaqlanmoqda(true);
    try {
      await mahsulotBirliklariApi.saqlash(product.id, yigilgan.royxat);
      onClose();
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setSaqlanmoqda(false);
    }
  }

  return (
    <AppModal>
      <form onSubmit={(event) => void saqlash(event)} className="scrollbar-hidden max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-[28px] bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-black sm:text-2xl">{t("units.title")}</h2>
            <p className="mt-1 truncate text-sm font-semibold text-gray-500">{product.name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("actions.close")} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 hover:bg-orange-500 hover:text-white"><X size={18} /></button>
        </div>

        <div className="mt-4 rounded-2xl bg-orange-50 p-4 text-sm text-orange-900">
          <p><span className="font-black">{t("units.base")}:</span> {asosiy?.name ?? asosiyNomi}</p>
          <p className="mt-1 text-xs font-semibold text-orange-700/80">{t("units.baseHint")}</p>
        </div>

        {yuklanmoqda ? (
          <div className="flex h-40 items-center justify-center"><LoaderCircle className="animate-spin text-orange-500" size={30} /></div>
        ) : (
          <div className="mt-4">
            <BirlikQatorlariMaydoni qatorlar={qatorlar} onChange={setQatorlar} birliklar={birliklar} asosiyId={product.unitId} asosiyNomi={asosiyNomi} onDonaQoshish={donaQoshish} />
          </div>
        )}

        {xato && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">{xato}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-11 rounded-2xl bg-gray-100 px-5 font-bold">{t("actions.cancel")}</button>
          <button disabled={saqlanmoqda || yuklanmoqda || birlikYaratilmoqda} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-6 font-black text-white disabled:opacity-50">{saqlanmoqda && <LoaderCircle size={16} className="animate-spin" />}{t("actions.save")}</button>
        </div>
      </form>
    </AppModal>
  );
}
