import { useEffect, useMemo, useState, type FormEvent } from "react";
import { LoaderCircle, Plus, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import AppModal from "@/Components/common/AppModal";
import AppSelect from "@/Components/ui/AppSelect";
import { mahsulotBirliklariApi } from "@/api/catalogApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { birliklarXatosi, type TovarBirligi } from "@/lib/kopBirlik";
import type { Mahsulot, OlchovBirligi } from "@/types/catalog";

// Tovar birliklari: asosiy birlikda qoldiq yuritiladi, qo'shimcha birliklar (pochka, qop, korobka) koeffitsient bilan qo'yiladi.
// Koeffitsient — 1 shu birlikda nechta asosiy birlik. Narx bo'sh bo'lsa asosiy narx × koeffitsient olinadi.

type Qator = { kalit: number; unitId: string; koeff: string; qabul: boolean; sotuv: boolean; chakana: string; ulgurji: string; shtrix: string };

let qatorHisobi = 0;
const bosQator = (): Qator => ({ kalit: ++qatorHisobi, unitId: "", koeff: "", qabul: true, sotuv: true, chakana: "", ulgurji: "", shtrix: "" });

function qatordanBirlik(qator: Qator, birlik: OlchovBirligi | undefined): TovarBirligi {
  const narx = (matn: string) => (matn.trim() && Number(matn) > 0 ? Number(matn) : null);
  return {
    unitId: qator.unitId,
    kod: birlik?.code ?? null,
    nomi: birlik?.name ?? "",
    qisqa: birlik?.shortName ?? birlik?.name ?? "",
    kasr: birlik?.isFractional === true,
    koeff: Number(qator.koeff.replace(",", ".")),
    asosiy: false,
    qabul: qator.qabul,
    sotuv: qator.sotuv,
    chakana: narx(qator.chakana),
    ulgurji: narx(qator.ulgurji),
    shtrix: qator.shtrix.trim() || null,
  };
}

export default function BirliklarModal({ product, birliklar, onClose }: { product: Mahsulot; birliklar: OlchovBirligi[]; onClose: () => void }) {
  const { t } = useTranslation("mahsulotlar");
  const [qatorlar, setQatorlar] = useState<Qator[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [xato, setXato] = useState("");
  const asosiy = birliklar.find((birlik) => birlik.id === product.unitId) ?? product.unit;
  const asosiyNomi = asosiy?.shortName ?? asosiy?.name ?? t("fallback.unit");

  useEffect(() => {
    let active = true;
    mahsulotBirliklariApi.olish(product.id)
      .then((royxat) => {
        if (!active) return;
        setQatorlar(royxat.filter((birlik) => !birlik.asosiy).map((birlik) => ({
          kalit: ++qatorHisobi,
          unitId: birlik.unitId,
          koeff: String(birlik.koeff),
          qabul: birlik.qabul,
          sotuv: birlik.sotuv,
          chakana: birlik.chakana === null ? "" : String(birlik.chakana),
          ulgurji: birlik.ulgurji === null ? "" : String(birlik.ulgurji),
          shtrix: birlik.shtrix ?? "",
        })));
      })
      .catch((error) => { if (active) setXato(getApiErrorMessage(error)); })
      .finally(() => { if (active) setYuklanmoqda(false); });
    return () => { active = false; };
  }, [product.id]);

  const tanlanganlar = useMemo(() => new Set(qatorlar.map((qator) => qator.unitId).filter(Boolean)), [qatorlar]);

  function yangila(kalit: number, ozgarish: Partial<Qator>) {
    setQatorlar((joriy) => joriy.map((qator) => (qator.kalit === kalit ? { ...qator, ...ozgarish } : qator)));
  }

  async function saqlash(event: FormEvent) {
    event.preventDefault();
    setXato("");
    if (qatorlar.some((qator) => !qator.unitId)) return setXato(t("units.errors.unitRequired"));
    const royxat: TovarBirligi[] = [
      { unitId: product.unitId, kod: null, nomi: asosiyNomi, qisqa: asosiyNomi, kasr: false, koeff: 1, asosiy: true, qabul: true, sotuv: true, chakana: null, ulgurji: null, shtrix: null },
      ...qatorlar.map((qator) => qatordanBirlik(qator, birliklar.find((birlik) => birlik.id === qator.unitId))),
    ];
    const tekshiruv = birliklarXatosi(royxat);
    if (tekshiruv) return setXato(t(`units.errors.${tekshiruv}`));
    setSaqlanmoqda(true);
    try {
      await mahsulotBirliklariApi.saqlash(product.id, royxat);
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
          <div className="mt-4 space-y-3">
            {qatorlar.length === 0 && <p className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-sm font-semibold text-slate-400">{t("units.empty")}</p>}
            {qatorlar.map((qator) => {
              const birlik = birliklar.find((item) => item.id === qator.unitId);
              const nom = birlik?.shortName ?? birlik?.name ?? "";
              return (
                <div key={qator.kalit} className="rounded-2xl border border-slate-200 p-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="grid gap-1.5">
                      <span className="text-xs font-bold text-slate-400">{t("units.unit")}</span>
                      <AppSelect value={qator.unitId} onChange={(event) => yangila(qator.kalit, { unitId: event.target.value })} className="input">
                        <option value="">{t("units.pickUnit")}</option>
                        {birliklar.filter((item) => item.id !== product.unitId && (item.id === qator.unitId || !tanlanganlar.has(item.id))).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </AppSelect>
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-xs font-bold text-slate-400">{t("units.factor")}</span>
                      <input value={qator.koeff} inputMode="decimal" onChange={(event) => yangila(qator.kalit, { koeff: event.target.value.replace(/[^\d.,]/g, "") })} className="input" placeholder="50" />
                      {nom && Number(qator.koeff.replace(",", ".")) > 0 && <span className="text-[11px] font-semibold text-slate-400">{t("units.factorHint", { unit: nom, n: qator.koeff, base: asosiyNomi })}</span>}
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-xs font-bold text-slate-400">{t("units.retail")}</span>
                      <input value={qator.chakana} inputMode="decimal" onChange={(event) => yangila(qator.kalit, { chakana: event.target.value.replace(/[^\d.]/g, "") })} className="input" placeholder={t("units.auto")} />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-xs font-bold text-slate-400">{t("units.wholesale")}</span>
                      <input value={qator.ulgurji} inputMode="decimal" onChange={(event) => yangila(qator.kalit, { ulgurji: event.target.value.replace(/[^\d.]/g, "") })} className="input" placeholder={t("units.auto")} />
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
                    <button type="button" onClick={() => setQatorlar((joriy) => joriy.filter((item) => item.kalit !== qator.kalit))} aria-label={t("units.remove")} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100"><Trash2 size={16} /></button>
                  </div>
                </div>
              );
            })}
            <button type="button" onClick={() => setQatorlar((joriy) => [...joriy, bosQator()])} disabled={qatorlar.length >= Math.max(birliklar.length - 1, 0)} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-orange-200 bg-white px-4 text-sm font-black text-orange-600 hover:bg-orange-50 disabled:opacity-50"><Plus size={16} />{t("units.add")}</button>
            <p className="text-xs font-semibold text-slate-400">{t("units.priceHint")}</p>
          </div>
        )}

        {xato && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">{xato}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-11 rounded-2xl bg-gray-100 px-5 font-bold">{t("actions.cancel")}</button>
          <button disabled={saqlanmoqda || yuklanmoqda} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-6 font-black text-white disabled:opacity-50">{saqlanmoqda && <LoaderCircle size={16} className="animate-spin" />}{t("actions.save")}</button>
        </div>
      </form>
    </AppModal>
  );
}
