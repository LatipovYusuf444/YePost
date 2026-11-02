import { useState } from "react";
import { BookOpenCheck, CheckCircle2, Copy, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import TasdiqlashOynasi from "@/Components/common/TasdiqlashOynasi";
import { ishlabChiqarishApi } from "@/api/ishlabChiqarishApi";
import { miqdorMatni, portlashMiqdori, qatorNomi, retseptTanasiniYigish, sonMaydoni, type RetseptFormasi } from "@/lib/ishlabChiqarish";
import type { Portlash, PortlashQatori, Retsept } from "@/types/ishlabChiqarish";
import { HolatFiltri, Holat, Jadval, MahsulotQidiruvi, Maydon, OmborTanlash, Oyna, QatorOchirish, QatorQoshish, Sahifa, XatoQutisi, Yuklanmoqda, inputKlass, tugmaAsosiy, tugmaIkkinchi, tugmaXavfli, type Ustun } from "./umumiy";
import { useAmal, useMalumot, useOmborlar } from "./hooklar";

type KirimQatori = RetseptFormasi["inputs"][number] & { nom?: string };
type ChiqimQatori = RetseptFormasi["outputs"][number] & { nom?: string };
type Forma = Omit<RetseptFormasi, "inputs" | "outputs"> & { nom?: string; inputs: KirimQatori[]; outputs: ChiqimQatori[] };

const matn = (qiymat: unknown) => (qiymat === null || qiymat === undefined ? "" : String(qiymat));
const portlashMiqdorMatni = (qator: PortlashQatori) => (qator.min != null && qator.max != null ? `${miqdorMatni(qator.min)} – ${miqdorMatni(qator.max)}` : miqdorMatni(portlashMiqdori(qator)));
const bosh = (): Forma => ({ modificationId: "", warehouseId: "", baseQuantity: "", outputMin: "", outputMax: "", normalScrapPercent: "", consumeOnIssue: false, note: "", inputs: [], outputs: [] });
const bo = (retsept: Retsept): Forma => ({
  modificationId: retsept.modificationId,
  nom: qatorNomi(retsept),
  warehouseId: retsept.warehouseId,
  baseQuantity: matn(retsept.baseQuantity),
  outputMin: matn(retsept.outputMin),
  outputMax: matn(retsept.outputMax),
  normalScrapPercent: matn(retsept.normalScrapPercent),
  consumeOnIssue: Boolean(retsept.consumeOnIssue),
  note: retsept.note ?? "",
  inputs: (retsept.inputs ?? []).map((qator) => ({ modificationId: qator.modificationId, nom: qatorNomi(qator), kind: qator.kind, quantity: matn(qator.quantity), tolerancePercent: matn(qator.tolerancePercent), min: matn(qator.min), max: matn(qator.max) })),
  outputs: (retsept.outputs ?? []).map((qator) => ({ modificationId: qator.modificationId, nom: qatorNomi(qator), role: qator.role, quantity: matn(qator.quantity), quantityType: qator.quantityType ?? "" })),
});

export default function Retseptlar() {
  const { t } = useTranslation("ishlab_chiqarish");
  const [status, setStatus] = useState("");
  const royxat = useMalumot(() => ishlabChiqarishApi.retseptlar.royxat({ status }), status);
  const [ochiq, setOchiq] = useState<string | null>(null);
  const [forma, setForma] = useState<{ id?: string; qiymat: Forma } | null>(null);
  const ustunlar: Ustun<Retsept>[] = [
    { nom: t("fields.product"), katak: (retsept) => <span className="font-black text-slate-900">{qatorNomi(retsept)}</span> },
    { nom: t("fields.version"), katak: (retsept) => retsept.version ?? "—" },
    { nom: t("fields.baseQuantity"), ong: true, katak: (retsept) => miqdorMatni(retsept.baseQuantity) },
    { nom: t("fields.consumeOnIssue"), katak: (retsept) => (retsept.consumeOnIssue ? t("common.yes") : t("common.no")) },
    { nom: t("fields.status"), katak: (retsept) => <Holat status={retsept.status} /> },
  ];
  return (
    <Sahifa
      sarlavha={t("recipes.title")}
      izoh={t("recipes.subtitle")}
      amal={<>
        <HolatFiltri qiymat={status} onChange={setStatus} holatlar={["DRAFT", "ACTIVE", "ARCHIVED"]} />
        <button type="button" onClick={() => setForma({ qiymat: bosh() })} className={tugmaAsosiy}><Plus size={16} />{t("recipes.create")}</button>
      </>}
    >
      <XatoQutisi matn={royxat.xato} />
      {royxat.yuklanmoqda && !royxat.malumot ? <Yuklanmoqda /> : <Jadval ustunlar={ustunlar} qatorlar={royxat.malumot ?? []} kalit={(retsept) => retsept.id} onBos={(retsept) => setOchiq(retsept.id)} bosh={t("empty.recipes")} />}
      {ochiq && <RetseptKorish id={ochiq} onYopish={() => setOchiq(null)} onOzgardi={royxat.qayta} onTahrir={(retsept) => { setOchiq(null); setForma({ id: retsept.id, qiymat: bo(retsept) }); }} onOchish={setOchiq} />}
      {forma && <RetseptOynasi boshlangich={forma} onYopish={() => setForma(null)} onSaqlandi={(id) => { setForma(null); royxat.qayta(); setOchiq(id); }} />}
    </Sahifa>
  );
}

function RetseptOynasi({ boshlangich, onYopish, onSaqlandi }: { boshlangich: { id?: string; qiymat: Forma }; onYopish: () => void; onSaqlandi: (id: string) => void }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const omborlar = useOmborlar();
  const [forma, setForma] = useState(boshlangich.qiymat);
  const amal = useAmal();
  const ozgar = (qism: Partial<Forma>) => setForma((joriy) => ({ ...joriy, ...qism }));
  const kirim = (indeks: number, qism: Partial<KirimQatori>) => ozgar({ inputs: forma.inputs.map((qator, i) => (i === indeks ? { ...qator, ...qism } : qator)) });
  const chiqim = (indeks: number, qism: Partial<ChiqimQatori>) => ozgar({ outputs: forma.outputs.map((qator, i) => (i === indeks ? { ...qator, ...qism } : qator)) });

  function saqlash() {
    const natija = retseptTanasiniYigish(forma);
    if ("xato" in natija) return amal.setXato(t(natija.xato));
    void amal.bajar(async () => {
      const saqlangan = boshlangich.id ? await ishlabChiqarishApi.retseptlar.yangilash(boshlangich.id, natija.tana) : await ishlabChiqarishApi.retseptlar.yaratish(natija.tana);
      onSaqlandi(saqlangan.id);
    });
  }

  return (
    <Oyna keng sarlavha={t(boshlangich.id ? "recipes.edit" : "recipes.create")} onYopish={onYopish} pastki={<>
      <button type="button" onClick={onYopish} className={tugmaIkkinchi}>{t("actions.cancel")}</button>
      <button type="button" disabled={amal.band} onClick={saqlash} className={tugmaAsosiy}>{t("actions.save")}</button>
    </>}>
      <XatoQutisi matn={amal.xato} />
      <div className="grid gap-3 md:grid-cols-2">
        <Maydon nom={t("fields.product")}><MahsulotQidiruvi value={forma.modificationId} nom={forma.nom} onChange={(modificationId, nom) => ozgar({ modificationId, nom })} /></Maydon>
        <Maydon nom={t("fields.wipWarehouse")}><OmborTanlash sexMi value={forma.warehouseId} omborlar={omborlar} onChange={(warehouseId) => ozgar({ warehouseId })} /></Maydon>
        <Maydon nom={t("fields.baseQuantity")}><input type="number" min="0" step="any" value={forma.baseQuantity} onChange={(event) => ozgar({ baseQuantity: event.target.value })} className={inputKlass} /></Maydon>
        <Maydon nom={t("fields.normalScrapPercent")}><input type="number" min="0" step="any" value={forma.normalScrapPercent} onChange={(event) => ozgar({ normalScrapPercent: event.target.value })} className={inputKlass} /></Maydon>
        <Maydon nom={t("fields.outputMin")}><input type="number" min="0" step="any" value={forma.outputMin} onChange={(event) => ozgar({ outputMin: event.target.value })} className={inputKlass} /></Maydon>
        <Maydon nom={t("fields.outputMax")}><input type="number" min="0" step="any" value={forma.outputMax} onChange={(event) => ozgar({ outputMax: event.target.value })} className={inputKlass} /></Maydon>
      </div>
      <label className="flex items-start gap-3 rounded-2xl bg-orange-50/60 p-3 text-sm font-bold text-slate-700">
        <input type="checkbox" checked={forma.consumeOnIssue} onChange={(event) => ozgar({ consumeOnIssue: event.target.checked })} className="mt-0.5 h-5 w-5 accent-orange-500" />
        <span>{t("fields.consumeOnIssue")}<span className="mt-0.5 block text-xs font-semibold text-slate-500">{t("recipes.consumeHint")}</span></span>
      </label>
      <div className="space-y-2">
        <p className="text-sm font-black text-slate-700">{t("recipes.inputs")}</p>
        {forma.inputs.map((qator, indeks) => (
          <div key={indeks} className="grid items-end gap-2 rounded-2xl bg-slate-50 p-3 md:grid-cols-[minmax(0,2fr)_140px_minmax(0,1fr)_minmax(0,1fr)_44px]">
            <Maydon nom={t("fields.product")}><MahsulotQidiruvi value={qator.modificationId} nom={qator.nom} onChange={(modificationId, nom) => kirim(indeks, { modificationId, nom })} /></Maydon>
            <Maydon nom={t("fields.inputKind")}>
              <select value={qator.kind} onChange={(event) => kirim(indeks, { kind: event.target.value as KirimQatori["kind"] })} className={inputKlass}>
                {(["FIXED", "RANGE", "FREE"] as const).map((tur) => <option key={tur} value={tur}>{t(`inputKind.${tur}`)}</option>)}
              </select>
            </Maydon>
            {qator.kind === "FIXED" && <>
              <Maydon nom={t("fields.quantity")}><input type="number" min="0" step="any" value={qator.quantity} onChange={(event) => kirim(indeks, { quantity: event.target.value })} className={inputKlass} /></Maydon>
              <Maydon nom={t("fields.tolerancePercent")}><input type="number" min="0" step="any" value={qator.tolerancePercent} onChange={(event) => kirim(indeks, { tolerancePercent: event.target.value })} className={inputKlass} /></Maydon>
            </>}
            {qator.kind === "RANGE" && <>
              <Maydon nom={t("fields.min")}><input type="number" min="0" step="any" value={qator.min} onChange={(event) => kirim(indeks, { min: event.target.value })} className={inputKlass} /></Maydon>
              <Maydon nom={t("fields.max")}><input type="number" min="0" step="any" value={qator.max} onChange={(event) => kirim(indeks, { max: event.target.value })} className={inputKlass} /></Maydon>
            </>}
            {qator.kind === "FREE" && <p className="self-center text-xs font-semibold text-slate-400 md:col-span-2">{t("recipes.freeHint")}</p>}
            <QatorOchirish onClick={() => ozgar({ inputs: forma.inputs.filter((_, i) => i !== indeks) })} />
          </div>
        ))}
        <QatorQoshish matn={t("recipes.addInput")} onClick={() => ozgar({ inputs: [...forma.inputs, { modificationId: "", kind: "FIXED", quantity: "", tolerancePercent: "", min: "", max: "" }] })} />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-black text-slate-700">{t("recipes.outputs")}</p>
        {forma.outputs.map((qator, indeks) => (
          <div key={indeks} className="grid items-end gap-2 rounded-2xl bg-slate-50 p-3 md:grid-cols-[minmax(0,2fr)_130px_minmax(0,1fr)_170px_44px]">
            <Maydon nom={t("fields.product")}><MahsulotQidiruvi value={qator.modificationId} nom={qator.nom} onChange={(modificationId, nom) => chiqim(indeks, { modificationId, nom })} /></Maydon>
            <Maydon nom={t("fields.outputRole")}>
              <select value={qator.role} onChange={(event) => chiqim(indeks, { role: event.target.value as ChiqimQatori["role"] })} className={inputKlass}>
                {(["MAIN", "WASTE"] as const).map((rol) => <option key={rol} value={rol}>{t(`outputRole.${rol}`)}</option>)}
              </select>
            </Maydon>
            <Maydon nom={t("fields.quantity")}><input type="number" min="0" step="any" value={qator.quantity} onChange={(event) => chiqim(indeks, { quantity: event.target.value })} className={inputKlass} /></Maydon>
            <Maydon nom={t("fields.quantityType")}>
              <select value={qator.quantityType} onChange={(event) => chiqim(indeks, { quantityType: event.target.value as ChiqimQatori["quantityType"] })} className={inputKlass}>
                <option value="">{t("quantityType.default")}</option>
                <option value="PROPORTIONAL">{t("quantityType.PROPORTIONAL")}</option>
                <option value="PER_BATCH">{t("quantityType.PER_BATCH")}</option>
              </select>
            </Maydon>
            <QatorOchirish onClick={() => ozgar({ outputs: forma.outputs.filter((_, i) => i !== indeks) })} />
          </div>
        ))}
        <QatorQoshish matn={t("recipes.addOutput")} onClick={() => ozgar({ outputs: [...forma.outputs, { modificationId: "", role: forma.outputs.length ? "WASTE" : "MAIN", quantity: "", quantityType: "" }] })} />
      </div>
      <Maydon nom={t("fields.note")}><textarea value={forma.note} rows={2} onChange={(event) => ozgar({ note: event.target.value })} className={`${inputKlass} h-auto py-2`} /></Maydon>
    </Oyna>
  );
}

function RetseptKorish({ id, onYopish, onOzgardi, onTahrir, onOchish }: { id: string; onYopish: () => void; onOzgardi: () => void; onTahrir: (retsept: Retsept) => void; onOchish: (id: string) => void }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const hujjat = useMalumot(() => ishlabChiqarishApi.retseptlar.olish(id), id);
  const amal = useAmal();
  const [tasdiq, setTasdiq] = useState(false);
  const [miqdor, setMiqdor] = useState("");
  const [portlash, setPortlash] = useState<Portlash | null>(null);
  const retsept = hujjat.malumot;
  const qoralama = retsept?.status === "DRAFT";

  function hisoblash() {
    const qty = sonMaydoni(miqdor);
    if (!(qty && qty > 0)) return amal.setXato(t("errors.lineQuantity"));
    void amal.bajar(async () => setPortlash(await ishlabChiqarishApi.retseptlar.portlash(id, qty)));
  }

  return (
    <Oyna keng sarlavha={retsept ? qatorNomi(retsept) : t("loading")} belgi={<Holat status={retsept?.status} />} onYopish={onYopish} pastki={retsept && <>
      {qoralama && <button type="button" disabled={amal.band} onClick={() => void amal.bajar(async () => { await ishlabChiqarishApi.retseptlar.ochirish(id); onOzgardi(); onYopish(); })} className={tugmaXavfli}>{t("actions.delete")}</button>}
      {qoralama && <button type="button" onClick={() => onTahrir(retsept)} className={tugmaIkkinchi}>{t("actions.edit")}</button>}
      {!qoralama && <button type="button" disabled={amal.band} onClick={() => void amal.bajar(async () => { const yangi = await ishlabChiqarishApi.retseptlar.yangiVersiya(id); onOzgardi(); onOchish(yangi.id); })} className={tugmaIkkinchi}><Copy size={15} />{t("actions.newVersion")}</button>}
      {qoralama && <button type="button" disabled={amal.band} onClick={() => setTasdiq(true)} className={tugmaAsosiy}><CheckCircle2 size={16} />{t("actions.activate")}</button>}
    </>}>
      <XatoQutisi matn={hujjat.xato || amal.xato} />
      {!retsept ? <Yuklanmoqda /> : <>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-xs font-bold text-slate-400">{t("fields.baseQuantity")}</dt><dd className="font-black text-slate-800">{miqdorMatni(retsept.baseQuantity)}</dd></div>
          <div><dt className="text-xs font-bold text-slate-400">{t("fields.normalScrapPercent")}</dt><dd className="font-black text-slate-800">{miqdorMatni(retsept.normalScrapPercent)}</dd></div>
          <div><dt className="text-xs font-bold text-slate-400">{t("fields.consumeOnIssue")}</dt><dd className="font-black text-slate-800">{retsept.consumeOnIssue ? t("common.yes") : t("common.no")}</dd></div>
        </dl>
        <Jadval
          ustunlar={[
            { nom: t("recipes.inputs"), katak: (qator) => qatorNomi(qator) },
            { nom: t("fields.inputKind"), katak: (qator) => t(`inputKind.${qator.kind}`, { defaultValue: qator.kind }) },
            { nom: t("fields.quantity"), ong: true, katak: (qator) => (qator.kind === "RANGE" ? `${miqdorMatni(qator.min)} – ${miqdorMatni(qator.max)}` : miqdorMatni(qator.quantity)) },
          ]}
          qatorlar={retsept.inputs ?? []}
          kalit={(qator, indeks) => qator.id ?? String(indeks)}
          bosh={t("empty.lines")}
        />
        <Jadval
          ustunlar={[
            { nom: t("recipes.outputs"), katak: (qator) => qatorNomi(qator) },
            { nom: t("fields.outputRole"), katak: (qator) => t(`outputRole.${qator.role}`, { defaultValue: qator.role }) },
            { nom: t("fields.quantity"), ong: true, katak: (qator) => miqdorMatni(qator.quantity) },
          ]}
          qatorlar={retsept.outputs ?? []}
          kalit={(qator, indeks) => qator.id ?? String(indeks)}
          bosh={t("empty.lines")}
        />
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-black text-slate-700">{t("recipes.explodeTitle")}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input type="number" min="0" step="any" value={miqdor} aria-label={t("fields.quantity")} placeholder="300" onChange={(event) => setMiqdor(event.target.value)} className={`${inputKlass} max-w-40`} />
            <button type="button" disabled={amal.band} onClick={hisoblash} className={tugmaIkkinchi}><BookOpenCheck size={15} />{t("recipes.explode")}</button>
          </div>
          {portlash && <div className="mt-3 space-y-3">
            <Jadval
              ustunlar={[
                { nom: t("recipes.inputs"), katak: (qator) => qatorNomi(qator) },
                { nom: t("fields.inputKind"), katak: (qator) => t(`inputKind.${qator.kind}`, { defaultValue: qator.kind ?? "—" }) },
                { nom: t("fields.quantity"), ong: true, katak: portlashMiqdorMatni },
              ]}
              qatorlar={portlash.inputs}
              kalit={(qator, indeks) => `${qator.modificationId ?? ""}-${indeks}`}
              bosh={t("empty.lines")}
            />
            <Jadval
              ustunlar={[
                { nom: t("recipes.outputs"), katak: (qator) => qatorNomi(qator) },
                { nom: t("fields.outputRole"), katak: (qator) => t(`outputRole.${qator.role}`, { defaultValue: qator.role ?? "—" }) },
                { nom: t("fields.quantity"), ong: true, katak: portlashMiqdorMatni },
              ]}
              qatorlar={portlash.outputs}
              kalit={(qator, indeks) => `${qator.modificationId ?? ""}-${indeks}`}
              bosh={t("empty.lines")}
            />
          </div>}
        </div>
      </>}
      {tasdiq && retsept && (
        <TasdiqlashOynasi
          ikonka={<CheckCircle2 size={24} />}
          ohang="kok"
          sarlavha={t("recipes.activateTitle")}
          nom={qatorNomi(retsept)}
          tavsif={t("recipes.activateHint")}
          ortgaMatni={t("actions.cancel")}
          tasdiqMatni={t("actions.activate")}
          jarayonMatni={t("loading")}
          onTasdiq={async () => { await amal.bajar(() => ishlabChiqarishApi.retseptlar.faollashtirish(id)); hujjat.qayta(); onOzgardi(); }}
          onYopish={() => setTasdiq(false)}
        />
      )}
    </Oyna>
  );
}
