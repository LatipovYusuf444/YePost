import { useMemo, useState } from "react";
import { LoaderCircle, Plus, Ruler, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import AppSelect from "@/Components/ui/AppSelect";
import SummaMaydoni from "@/Components/common/SummaMaydoni";
import type { OlchovBirligi } from "@/types/catalog";
import { bosBirlikQatori, type BirlikQatori } from "./birlikQatorlariMantiq";
import { donaBirligimi, donaBirliginiTopish } from "@/lib/donaBirligi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";

// Tovar birliklari: asosiy birlikda qoldiq yuritiladi, qo'shimcha birliklar (pochka, qop, korobka) koeffitsient bilan qo'yiladi.
// Koeffitsient — 1 shu birlikda nechta asosiy birlik (masalan 1 korobka = 3 kg). Narx bo'sh bo'lsa asosiy narx × koeffitsient olinadi.
// Mantiq birlikQatorlariMantiq.ts da. Bu komponent ham alohida "Birliklar" oynasida (BirliklarModal), ham mahsulot yaratish/tahrirlash oynasida ishlatiladi.

type Props = {
  qatorlar: BirlikQatori[];
  onChange: (qatorlar: BirlikQatori[]) => void;
  /** Ish maydonidagi barcha o'lchov birliklari (qo'shimcha birlik shulardan tanlanadi). */
  birliklar: OlchovBirligi[];
  /** Asosiy birlik (tanlanmaydi) va uning qisqa nomi (izoh uchun: "1 korobka = 3 kg"). */
  asosiyId: string;
  asosiyNomi: string;
  onDonaQoshish: () => Promise<OlchovBirligi>;
};

export default function BirlikQatorlariMaydoni({ qatorlar, onChange, birliklar, asosiyId, asosiyNomi, onDonaQoshish }: Props) {
  const { t } = useTranslation("mahsulotlar");
  const tanlanganlar = useMemo(() => new Set(qatorlar.map((qator) => qator.unitId).filter(Boolean)), [qatorlar]);
  const [yaratilmoqda, setYaratilmoqda] = useState<number | null>(null);
  const [xato, setXato] = useState("");
  const asosiyDona = donaBirligimi(birliklar.find((item) => item.id === asosiyId) ?? { name: asosiyNomi });
  const donaQoshishMumkin = !asosiyDona && !donaBirliginiTopish(birliklar);
  const donaVarianti = "__add_piece_unit__";

  function yangila(kalit: number, ozgarish: Partial<BirlikQatori>) {
    onChange(qatorlar.map((qator) => (qator.kalit === kalit ? { ...qator, ...ozgarish } : qator)));
  }

  async function birlikTanlash(qator: BirlikQatori, value: string) {
    if (value !== donaVarianti) { yangila(qator.kalit, { unitId: value }); return; }
    if (yaratilmoqda !== null) return;
    setYaratilmoqda(qator.kalit);
    setXato("");
    try {
      const unit = await onDonaQoshish();
      yangila(qator.kalit, { unitId: unit.id });
    } catch (error) { setXato(getApiErrorMessage(error)); }
    finally { setYaratilmoqda(null); }
  }

  return (
    <fieldset disabled={yaratilmoqda !== null} className="space-y-3 border-0 p-0">
      <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
        <Ruler size={18} className="shrink-0 text-blue-500" />
        <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-700">{t("units.base")}: {asosiyNomi}</p><p className="mt-1 text-xs text-slate-500">{t("units.baseNotRepeated")}</p></div>
        <span className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-blue-600">× 1</span>
      </div>
      {qatorlar.length === 0 && <p className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-sm font-semibold text-slate-400">{t("units.empty")}</p>}
      {qatorlar.map((qator) => {
        const birlik = birliklar.find((item) => item.id === qator.unitId);
        const nom = birlik?.shortName ?? birlik?.name ?? "";
        return (
          <div key={qator.kalit} className="rounded-2xl border border-slate-200 p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="grid gap-1.5">
                <span className="text-xs font-bold text-slate-400">{t("units.unit")}</span>
                <AppSelect value={qator.unitId} onChange={(event) => void birlikTanlash(qator, event.target.value)} disabled={yaratilmoqda !== null} className="input">
                  <option value="">{t("units.pickUnit")}</option>
                  {birliklar.filter((item) => item.id !== asosiyId && (item.id === qator.unitId || !tanlanganlar.has(item.id))).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  {donaQoshishMumkin && <option value={donaVarianti}>{t("units.pieceOption")}</option>}
                </AppSelect>
                {yaratilmoqda === qator.kalit && <span role="status" className="flex items-center gap-1.5 text-xs text-blue-600"><LoaderCircle size={13} className="animate-spin" />{t("units.creatingPiece")}</span>}
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-bold text-slate-400">{t("units.factor")}</span>
                <input value={qator.koeff} inputMode="decimal" onChange={(event) => yangila(qator.kalit, { koeff: event.target.value.replace(/[^\d.,]/g, "") })} className="input" placeholder="50" />
                {nom && Number(qator.koeff.replace(",", ".")) > 0 && <span className="text-[11px] font-semibold text-slate-400">{t("units.factorHint", { unit: nom, n: qator.koeff, base: asosiyNomi })}</span>}
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-bold text-slate-400">{t("units.retail")}</span>
                <SummaMaydoni value={qator.chakana} onChange={(qiymat) => yangila(qator.kalit, { chakana: qiymat })} className="input" placeholder={t("units.auto")} />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-bold text-slate-400">{t("units.wholesale")}</span>
                <SummaMaydoni value={qator.ulgurji} onChange={(qiymat) => yangila(qator.kalit, { ulgurji: qiymat })} className="input" placeholder={t("units.auto")} />
              </label>
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="grid flex-1 gap-1.5">
                <span className="text-xs font-bold text-slate-400">{t("units.barcode")}</span>
                <input value={qator.shtrix} onChange={(event) => yangila(qator.kalit, { shtrix: event.target.value })} className="input" placeholder={t("units.barcodePlaceholder")} />
              </label>
              <div className="flex flex-wrap items-center gap-4 pb-2.5 text-sm font-bold text-gray-600">
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={qator.qabul} onChange={(event) => yangila(qator.kalit, { qabul: event.target.checked })} />{t("units.canReceive")}</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={qator.sotuv} onChange={(event) => yangila(qator.kalit, { sotuv: event.target.checked })} />{t("units.canSell")}</label>
              </div>
              <button type="button" onClick={() => onChange(qatorlar.filter((item) => item.kalit !== qator.kalit))} aria-label={t("units.remove")} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100"><Trash2 size={16} /></button>
            </div>
          </div>
        );
      })}
      <button type="button" onClick={() => onChange([...qatorlar, bosBirlikQatori()])} disabled={yaratilmoqda !== null || qatorlar.length >= birliklar.filter((item) => item.id !== asosiyId).length + Number(donaQoshishMumkin)} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-orange-200 bg-white px-4 text-sm font-black text-orange-600 hover:bg-orange-50 disabled:opacity-50"><Plus size={16} />{t("units.add")}</button>
      {xato && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{xato}</p>}
      <p className="text-xs font-semibold text-slate-400">{t("units.priceHint")}</p>
    </fieldset>
  );
}
