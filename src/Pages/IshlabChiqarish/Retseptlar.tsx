import { useMemo, useState } from "react";
import { Archive, ArrowRight, BookOpen, BookOpenCheck, Calculator, CheckCircle2, CircleCheckBig, Copy, Factory, FilePen, NotebookPen, Package, PackageCheck, Plus, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import TasdiqlashOynasi from "@/Components/common/TasdiqlashOynasi";
import { ishlabChiqarishApi } from "@/api/ishlabChiqarishApi";
import { holatBoyicha, tahrirTanasi, miqdorMatni, portlashMiqdori, qatorNomi, qidiruvgaMos, retseptTanasiniYigish, sonMaydoni, type RetseptFormasi, type XatoMaydonQoidasi } from "@/lib/ishlabChiqarish";
import type { Portlash, PortlashQatori, Retsept, RetseptKirimi } from "@/types/ishlabChiqarish";
import { Asboblar, Bolim, HolatFiltri, HolatKartalari, Holat, Jadval, MahsulotQidiruvi, Maydon, MaydonXatosi, Ogohlantirish, OmborTanlash, Oyna, QatorKartasi, QatorOchirish, QatorQoshish, QidiruvMaydoni, Sahifa, Tafsilotlar, XatoQutisi, Yuklanmoqda, inputKlass, tugmaAsosiy, tugmaIkkinchi, tugmaXavfli, xatoRamkasi, type HolatGuruhi, type Ustun } from "./umumiy";
import { useAmal, useMaydonXatolari, useMalumot, useOmborlar, useQoralamaNazorati } from "./hooklar";

type KirimQatori = RetseptFormasi["inputs"][number] & { nom?: string };
type ChiqimQatori = RetseptFormasi["outputs"][number] & { nom?: string };
type Forma = Omit<RetseptFormasi, "inputs" | "outputs"> & { nom?: string; inputs: KirimQatori[]; outputs: ChiqimQatori[] };

const HOLATLAR = ["DRAFT", "ACTIVE", "ARCHIVED"];

// Server xatosi → retsept formasidagi maydon (kalit — backend yo'li). Tartib muhim: xabar so'zi bo'yicha birinchi mosi olinadi.
const RETSEPT_XATO_QOIDALARI: Record<string, XatoMaydonQoidasi> = {
  consumeOnIssue: { maydonlar: ["consumeOnIssue"], kodlar: ["serial_needs_on_issue", "on_issue"], sozlar: ["berilganda sarf", "расход при выдаче"] },
  warehouseId: { maydonlar: ["warehouseId"], kodlar: ["warehouse", "wip"], sozlar: ["sex ombori", "ombor", "склад"] },
  baseQuantity: { maydonlar: ["baseQuantity"], kodlar: ["base_quantity"], sozlar: ["asos miqdor", "базов"] },
  normalScrapPercent: { maydonlar: ["normalScrapPercent"], kodlar: ["scrap"], sozlar: ["chiqindi foizi", "процент отход"] },
  outputMin: { maydonlar: ["outputMin"], kodlar: ["output_min", "output_range"] },
  outputMax: { maydonlar: ["outputMax"], kodlar: ["output_max", "output_range"] },
  outputs: { maydonlar: ["outputs"], kodlar: ["main_output", "no_output", "outputs"], sozlar: ["asosiy mahsulot", "основн"] },
  inputs: { maydonlar: ["inputs"], kodlar: ["no_input", "inputs"], sozlar: ["xomashyo", "сырь"] },
  note: { maydonlar: ["note"] },
  modificationId: { maydonlar: ["modificationId"], kodlar: ["modification", "product"], sozlar: ["mahsulot", "товар"] },
};
// Portlash kalkulyatori: miqdor maydoni.
const PORTLASH_XATO_QOIDALARI: Record<string, XatoMaydonQoidasi> = { qty: { maydonlar: ["qty", "quantity"], kodlar: ["qty", "quantity"], sozlar: ["miqdor", "количеств"] } };

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

/** Bo'sh qiymat — chiziqcha; foiz qiymati `%` bilan. */
const foizMatni = (qiymat: unknown) => (qiymat === null || qiymat === undefined || qiymat === "" ? "—" : `${miqdorMatni(qiymat)}%`);
const versiyaMatni = (retsept: Retsept) => (retsept.version != null ? `v${retsept.version}` : "—");
/** Xomashyo qatori miqdori: oraliq — "min – max", aniq — miqdor. */
const kirimMiqdori = (qator: RetseptKirimi) => (qator.kind === "RANGE" ? `${miqdorMatni(qator.min)} – ${miqdorMatni(qator.max)}` : miqdorMatni(qator.quantity));
/** Chiqim oralig'i (eng kami – eng ko'pi): biri bo'lmasa bori ko'rsatiladi. */
function oraliqMatni(min: unknown, max: unknown) {
  const bor = (qiymat: unknown) => qiymat !== null && qiymat !== undefined && qiymat !== "";
  if (bor(min) && bor(max)) return `${miqdorMatni(min)} – ${miqdorMatni(max)}`;
  if (bor(min)) return `≥ ${miqdorMatni(min)}`;
  if (bor(max)) return `≤ ${miqdorMatni(max)}`;
  return "—";
}

function HaYoq({ qiymat }: { qiymat?: boolean }) {
  const { t } = useTranslation("ishlab_chiqarish");
  return <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-black ring-1 ${qiymat ? "bg-sky-50 text-sky-700 ring-sky-100" : "bg-slate-100 text-slate-500 ring-slate-200"}`}>{qiymat ? t("common.yes") : t("common.no")}</span>;
}

export default function Retseptlar() {
  const { t } = useTranslation("ishlab_chiqarish");
  const omborlar = useOmborlar();
  const royxat = useMalumot(() => ishlabChiqarishApi.retseptlar.royxat(), "recipes");
  const [filtr, setFiltr] = useState<{ kalit: string; holatlar: string[] } | null>(null);
  const [qidiruv, setQidiruv] = useState("");
  const [ochiq, setOchiq] = useState<string | null>(null);
  const [forma, setForma] = useState<{ id?: string; qiymat: Forma } | null>(null);
  const nomlar = useMemo(() => new Map(omborlar.map((ombor) => [ombor.id, ombor.name])), [omborlar]);
  const ombor = (retsept: Retsept) => retsept.warehouse?.name || nomlar.get(retsept.warehouseId) || "—";
  const hammasi = useMemo(() => royxat.malumot ?? [], [royxat.malumot]);
  const qatorlar = useMemo(
    () => holatBoyicha(hammasi, filtr?.holatlar ?? null).filter((retsept) => qidiruvgaMos(qidiruv, [qatorNomi(retsept), retsept.note, retsept.warehouse?.name ?? nomlar.get(retsept.warehouseId)])),
    [hammasi, filtr, qidiruv, nomlar]
  );
  const guruhlar: HolatGuruhi[] = [
    { kalit: "jami", nom: t("recipes.kpi.total"), holatlar: null, rang: "blue", ikonka: BookOpen },
    { kalit: "faol", nom: t("recipes.kpi.active"), holatlar: ["ACTIVE"], rang: "emerald", ikonka: CircleCheckBig },
    { kalit: "qoralama", nom: t("recipes.kpi.draft"), holatlar: ["DRAFT"], rang: "amber", ikonka: FilePen },
    { kalit: "arxiv", nom: t("recipes.kpi.archived"), holatlar: ["ARCHIVED"], rang: "violet", ikonka: Archive },
  ];
  const ustunlar: Ustun<Retsept>[] = [
    { id: "retseptlar-column-1",
      nom: t("fields.product"),
      katak: (retsept) => (
        <span className="block max-w-[280px]">
          <span className="block truncate font-black text-slate-900">{qatorNomi(retsept)}</span>
          {retsept.note && <span className="block truncate text-xs font-semibold text-slate-400">{retsept.note}</span>}
        </span>
      ),
    },
    { id: "retseptlar-column-2", nom: t("fields.version"), katak: (retsept) => <span className="font-bold text-slate-600">{versiyaMatni(retsept)}</span> },
    { id: "retseptlar-column-3", nom: t("fields.wipWarehouse"), katak: ombor },
    { id: "retseptlar-column-4", nom: t("fields.baseQuantity"), ong: true, katak: (retsept) => <span className="font-black text-slate-800">{miqdorMatni(retsept.baseQuantity)}</span> },
    { id: "retseptlar-column-5", nom: t("recipes.inputs"), ong: true, katak: (retsept) => (retsept.inputs ? t("recipes.inputsCount", { soni: retsept.inputs.length }) : "—") },
    { id: "retseptlar-column-6", nom: t("fields.normalScrapPercent"), ong: true, katak: (retsept) => foizMatni(retsept.normalScrapPercent) },
    { id: "retseptlar-column-7", nom: t("fields.consumeOnIssue"), katak: (retsept) => <HaYoq qiymat={retsept.consumeOnIssue} /> },
    { id: "retseptlar-column-8", nom: t("fields.status"), katak: (retsept) => <Holat status={retsept.status} /> },
  ];
  const yangi = <button type="button" onClick={() => setForma({ qiymat: bosh() })} className={tugmaAsosiy}><Plus size={18} />{t("recipes.create")}</button>;
  // Retsept bor, lekin qidiruv yoki filtr hech narsa qoldirmagan.
  const filtrlangan = hammasi.length > 0;
  return (
    <Sahifa sarlavha={t("recipes.title")} izoh={t("recipes.subtitle")} amal={yangi}>
      <HolatKartalari guruhlar={guruhlar} qatorlar={hammasi} tanlangan={filtr?.kalit ?? ""} yuklanmoqda={royxat.yuklanmoqda && !royxat.malumot} onTanlash={(guruh) => setFiltr(guruh?.holatlar ? { kalit: guruh.kalit, holatlar: guruh.holatlar } : null)} />
      <Asboblar>
        <QidiruvMaydoni qiymat={qidiruv} onChange={setQidiruv} placeholder={t("recipes.searchPlaceholder")} />
        <HolatFiltri qiymat={filtr?.holatlar.length === 1 ? filtr.holatlar[0] : ""} onChange={(holat) => setFiltr(holat ? { kalit: holat, holatlar: [holat] } : null)} holatlar={HOLATLAR} />
      </Asboblar>
      <XatoQutisi matn={royxat.xato} />
      <Jadval tableId="IshlabChiqarish/Retseptlar/jadval-1"
        ustunlar={ustunlar}
        qatorlar={qatorlar}
        kalit={(retsept) => retsept.id}
        onBos={(retsept) => setOchiq(retsept.id)}
        yuklanmoqda={royxat.yuklanmoqda && !royxat.malumot}
        sahifaHajmi={20}
        boshIkonka={BookOpen}
        bosh={filtrlangan ? t("recipes.emptyFiltered") : t("recipes.emptyTitle")}
        boshIzoh={filtrlangan ? t("recipes.emptyFilteredHint") : <RetseptTartibi />}
        boshAmal={filtrlangan ? <button type="button" onClick={() => { setFiltr(null); setQidiruv(""); }} className={tugmaIkkinchi}>{t("actions.resetFilters")}</button> : yangi}
      />
      {ochiq && <RetseptKorish id={ochiq} nomlar={nomlar} onYopish={() => setOchiq(null)} onOzgardi={royxat.qayta} onTahrir={(retsept) => { setOchiq(null); setForma({ id: retsept.id, qiymat: bo(retsept) }); }} onOchish={setOchiq} />}
      {forma && <RetseptOynasi boshlangich={forma} onYopish={() => setForma(null)} onSaqlandi={(id) => { setForma(null); royxat.qayta(); setOchiq(id); }} />}
    </Sahifa>
  );
}

/** Bo'sh ro'yxatda: retsept nima va u qanday ishga tushadi. */
function RetseptTartibi() {
  const { t } = useTranslation("ishlab_chiqarish");
  const qadamlar = [t("recipes.flow.create"), t("recipes.flow.lines"), t("recipes.flow.activate"), t("recipes.flow.order")];
  return (
    <div className="space-y-5">
      <p>{t("recipes.emptyHint")}</p>
      <ol className="flex flex-wrap items-center justify-center gap-2 text-left">
        {qadamlar.map((qadam, indeks) => (
          <li key={qadam} className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-2xl border border-orange-100 bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2563EB] text-[11px] text-white">{indeks + 1}</span>
              {qadam}
            </span>
            {indeks < qadamlar.length - 1 && <ArrowRight aria-hidden size={15} className="text-slate-300" />}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Forma ichida qatorlar hali qo'shilmaganda. */
function BoshQatorlar({ matn: izoh }: { matn: string }) {
  return <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-sm font-semibold leading-6 text-slate-400">{izoh}</p>;
}

function RetseptOynasi({ boshlangich, onYopish, onSaqlandi }: { boshlangich: { id?: string; qiymat: Forma }; onYopish: () => void; onSaqlandi: (id: string) => void }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const omborlar = useOmborlar();
  const [forma, setForma] = useState(boshlangich.qiymat);
  const amal = useAmal();
  const fx = useMaydonXatolari(RETSEPT_XATO_QOIDALARI);
  const qoralamaNazorati = useQoralamaNazorati(boshlangich.id ? () => ishlabChiqarishApi.retseptlar.olish(boshlangich.id as string) : null);
  // Maydon o'zgarsa uning xatosi olib tashlanadi; "inputs"/"outputs" o'zgarsa (qator qo'shildi/o'chdi) — butun ro'yxat xatolari.
  const ozgar = (qism: Partial<Forma>) => {
    fx.tozala(...Object.keys(qism).filter((kalit) => kalit !== "nom"));
    setForma((joriy) => ({ ...joriy, ...qism }));
  };
  const kirim = (indeks: number, qism: Partial<KirimQatori>) => {
    fx.tozala(...Object.keys(qism).filter((kalit) => kalit !== "nom").map((kalit) => `inputs.${indeks}.${kalit}`));
    setForma((joriy) => ({ ...joriy, inputs: joriy.inputs.map((qator, i) => (i === indeks ? { ...qator, ...qism } : qator)) }));
  };
  const chiqim = (indeks: number, qism: Partial<ChiqimQatori>) => {
    fx.tozala(...Object.keys(qism).filter((kalit) => kalit !== "nom").map((kalit) => `outputs.${indeks}.${kalit}`));
    setForma((joriy) => ({ ...joriy, outputs: joriy.outputs.map((qator, i) => (i === indeks ? { ...qator, ...qism } : qator)) }));
  };
  // Tur o'zgarsa yashiringan maydonlar xatosi ham ketadi.
  const kirimTuri = (indeks: number, kind: KirimQatori["kind"]) => {
    fx.tozala(...["quantity", "tolerancePercent", "min", "max"].map((kalit) => `inputs.${indeks}.${kalit}`));
    kirim(indeks, { kind });
  };
  // "Asosiy mahsulot yo'q" xatosi rol o'zgarganda ketadi.
  const chiqimRoli = (indeks: number, role: ChiqimQatori["role"]) => {
    if (fx.xato("outputs")) fx.tozala("outputs");
    chiqim(indeks, { role });
  };
  const kirimQoshish = () => ozgar({ inputs: [...forma.inputs, { modificationId: "", kind: "FIXED", quantity: "", tolerancePercent: "", min: "", max: "" }] });
  const chiqimQoshish = () => ozgar({ outputs: [...forma.outputs, { modificationId: "", role: forma.outputs.length ? "WASTE" : "MAIN", quantity: "", quantityType: "" }] });

  function saqlash() {
    const natija = retseptTanasiniYigish(forma);
    if ("xato" in natija) return fx.tekshiruv(natija, t(natija.xato));
    fx.ornat({});
    void amal.bajar(async () => {
      const saqlangan = boshlangich.id ? await ishlabChiqarishApi.retseptlar.yangilash(boshlangich.id, tahrirTanasi(natija.tana, { outputMin: null, outputMax: null, normalScrapPercent: 0, note: "" })) : await ishlabChiqarishApi.retseptlar.yaratish(natija.tana);
      onSaqlandi(saqlangan.id);
    }, (tafsilot) => {
      fx.serverdan(tafsilot);
      // Shu orada faollashtirilgan bo'lsa tahrir rad etiladi: hujjat holati qayta o'qiladi.
      if (boshlangich.id) qoralamaNazorati.tekshir();
    });
  }

  return (
    <Oyna keng ikonka={BookOpen} sarlavha={t(boshlangich.id ? "recipes.edit" : "recipes.create")} izoh={t("recipes.formHint")} onYopish={onYopish} pastki={<>
      <button type="button" onClick={onYopish} className={tugmaIkkinchi}>{t("actions.cancel")}</button>
      <button type="button" disabled={amal.band || qoralamaNazorati.qoralamaEmas} onClick={saqlash} className={`${tugmaAsosiy} min-w-40`}><CheckCircle2 size={18} />{t("actions.save")}</button>
    </>}>
      <XatoQutisi matn={fx.tepadagi || (fx.bor ? "" : amal.xato)} />
      {qoralamaNazorati.qoralamaEmas && boshlangich.id && (
        <Ogohlantirish>
          {t("errors.notDraftAnymore")}{" "}
          <button type="button" onClick={() => onSaqlandi(boshlangich.id as string)} className="font-black text-[#2563EB] underline underline-offset-2">{t("actions.openUpdated")}</button>
        </Ogohlantirish>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Bolim ikonka={SlidersHorizontal} sarlavha={t("recipes.sectionMain")} izoh={t("recipes.mainHint")}>
          <div className="grid gap-4 md:grid-cols-2">
            <Maydon nom={t("fields.product")} majburiy xato={fx.xato("modificationId")}><MahsulotQidiruvi value={forma.modificationId} nom={forma.nom} onChange={(modificationId, nom) => ozgar({ modificationId, nom })} /></Maydon>
            <Maydon nom={t("fields.wipWarehouse")} majburiy xato={fx.xato("warehouseId")}><OmborTanlash sexMi value={forma.warehouseId} omborlar={omborlar} onChange={(warehouseId) => ozgar({ warehouseId })} /></Maydon>
            <Maydon nom={t("fields.baseQuantity")} majburiy xato={fx.xato("baseQuantity")} izoh={t("recipes.baseQuantityHint")}><input type="number" inputMode="decimal" min="0" step="any" value={forma.baseQuantity} placeholder="100" onChange={(event) => ozgar({ baseQuantity: event.target.value })} className={inputKlass} /></Maydon>
            <Maydon nom={t("fields.normalScrapPercent")} xato={fx.xato("normalScrapPercent")}><input type="number" inputMode="decimal" min="0" step="any" value={forma.normalScrapPercent} placeholder="0" onChange={(event) => ozgar({ normalScrapPercent: event.target.value })} className={inputKlass} /></Maydon>
            <Maydon nom={t("fields.outputMin")} xato={fx.xato("outputMin")}><input type="number" inputMode="decimal" min="0" step="any" value={forma.outputMin} onChange={(event) => ozgar({ outputMin: event.target.value })} className={inputKlass} /></Maydon>
            <Maydon nom={t("fields.outputMax")} xato={fx.xato("outputMax")}><input type="number" inputMode="decimal" min="0" step="any" value={forma.outputMax} onChange={(event) => ozgar({ outputMax: event.target.value })} className={inputKlass} /></Maydon>
          </div>
        </Bolim>
        <div className="space-y-5">
          <Bolim ikonka={Factory} sarlavha={t("recipes.sectionIssue")}>
            <label data-maydon-xato={fx.xato("consumeOnIssue") ? "true" : undefined} className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition ${forma.consumeOnIssue ? `border-[#2563EB] bg-blue-50/60 ${fx.xato("consumeOnIssue") ? "" : "ring-4 ring-blue-50"}` : "border-slate-200 bg-slate-50/70 hover:border-slate-300"} ${fx.xato("consumeOnIssue") ? xatoRamkasi : ""}`}>
              <input type="checkbox" checked={forma.consumeOnIssue} onChange={(event) => ozgar({ consumeOnIssue: event.target.checked })} className="mt-0.5 h-5 w-5 shrink-0 accent-[#2563EB]" />
              <span className="min-w-0 text-[15px] font-black text-slate-800">
                {t("fields.consumeOnIssue")}
                <span className="mt-1 block text-sm font-semibold leading-6 text-slate-500">{t("recipes.consumeHint")}</span>
                {fx.xato("consumeOnIssue") && <span role="alert" className="mt-2 block text-xs font-bold leading-5 text-red-600">{fx.xato("consumeOnIssue")}</span>}
              </span>
            </label>
          </Bolim>
          <Bolim ikonka={NotebookPen} sarlavha={t("fields.note")}>
            <div data-maydon-xato={fx.xato("note") ? "true" : undefined} className="grid gap-2">
              <textarea value={forma.note} rows={3} aria-label={t("fields.note")} aria-invalid={fx.xato("note") ? true : undefined} placeholder={t("recipes.notePlaceholder")} onChange={(event) => ozgar({ note: event.target.value })} className={`${inputKlass} h-auto py-3 ${fx.xato("note") ? xatoRamkasi : ""}`} />
              {fx.xato("note") && <span role="alert" className="text-xs font-bold leading-5 text-red-600">{fx.xato("note")}</span>}
            </div>
          </Bolim>
        </div>
      </div>
      <Bolim ikonka={Package} sarlavha={t("recipes.inputs")} izoh={t("recipes.inputsHint")} amal={<QatorQoshish matn={t("recipes.addInput")} onClick={kirimQoshish} />}>
        <MaydonXatosi matn={fx.xato("inputs")} />
        {forma.inputs.length === 0 && <BoshQatorlar matn={t("recipes.inputsEmpty")} />}
        {forma.inputs.map((qator, indeks) => (
          <QatorKartasi key={indeks} className="md:grid-cols-[minmax(0,2fr)_160px_minmax(0,1fr)_minmax(0,1fr)_48px]">
            <Maydon nom={t("fields.product")} majburiy xato={fx.xato(`inputs.${indeks}.modificationId`)}><MahsulotQidiruvi value={qator.modificationId} nom={qator.nom} onChange={(modificationId, nom) => kirim(indeks, { modificationId, nom })} /></Maydon>
            <Maydon nom={t("fields.inputKind")} xato={fx.xato(`inputs.${indeks}.kind`)}>
              <select value={qator.kind} onChange={(event) => kirimTuri(indeks, event.target.value as KirimQatori["kind"])} className={inputKlass}>
                {(["FIXED", "RANGE", "FREE"] as const).map((tur) => <option key={tur} value={tur}>{t(`inputKind.${tur}`)}</option>)}
              </select>
            </Maydon>
            {qator.kind === "FIXED" && <>
              <Maydon nom={t("fields.quantity")} majburiy xato={fx.xato(`inputs.${indeks}.quantity`)}><input type="number" inputMode="decimal" min="0" step="any" value={qator.quantity} onChange={(event) => kirim(indeks, { quantity: event.target.value })} className={inputKlass} /></Maydon>
              <Maydon nom={t("fields.tolerancePercent")} xato={fx.xato(`inputs.${indeks}.tolerancePercent`)}><input type="number" inputMode="decimal" min="0" step="any" value={qator.tolerancePercent} onChange={(event) => kirim(indeks, { tolerancePercent: event.target.value })} className={inputKlass} /></Maydon>
            </>}
            {qator.kind === "RANGE" && <>
              <Maydon nom={t("fields.min")} majburiy xato={fx.xato(`inputs.${indeks}.min`)}><input type="number" inputMode="decimal" min="0" step="any" value={qator.min} onChange={(event) => kirim(indeks, { min: event.target.value })} className={inputKlass} /></Maydon>
              <Maydon nom={t("fields.max")} majburiy xato={fx.xato(`inputs.${indeks}.max`)}><input type="number" inputMode="decimal" min="0" step="any" value={qator.max} onChange={(event) => kirim(indeks, { max: event.target.value })} className={inputKlass} /></Maydon>
            </>}
            {qator.kind === "FREE" && <p className="flex h-12 items-center rounded-2xl bg-white px-4 text-sm font-semibold text-slate-400 ring-1 ring-slate-200 md:col-span-2">{t("recipes.freeHint")}</p>}
            <QatorOchirish onClick={() => ozgar({ inputs: forma.inputs.filter((_, i) => i !== indeks) })} />
          </QatorKartasi>
        ))}
        {forma.inputs.length > 0 && <QatorQoshish matn={t("recipes.addInput")} onClick={kirimQoshish} />}
      </Bolim>
      <Bolim ikonka={PackageCheck} sarlavha={t("recipes.outputs")} izoh={t("recipes.outputsHint")} amal={<QatorQoshish matn={t("recipes.addOutput")} onClick={chiqimQoshish} />}>
        <MaydonXatosi matn={fx.xato("outputs")} />
        {forma.outputs.length === 0 && <BoshQatorlar matn={t("recipes.outputsEmpty")} />}
        {forma.outputs.map((qator, indeks) => (
          <QatorKartasi key={indeks} className="md:grid-cols-[minmax(0,2fr)_150px_minmax(0,1fr)_190px_48px]">
            <Maydon nom={t("fields.product")} majburiy xato={fx.xato(`outputs.${indeks}.modificationId`)}><MahsulotQidiruvi value={qator.modificationId} nom={qator.nom} onChange={(modificationId, nom) => chiqim(indeks, { modificationId, nom })} /></Maydon>
            <Maydon nom={t("fields.outputRole")} xato={fx.xato(`outputs.${indeks}.role`)}>
              <select value={qator.role} onChange={(event) => chiqimRoli(indeks, event.target.value as ChiqimQatori["role"])} className={inputKlass}>
                {(["MAIN", "WASTE"] as const).map((rol) => <option key={rol} value={rol}>{t(`outputRole.${rol}`)}</option>)}
              </select>
            </Maydon>
            <Maydon nom={t("fields.quantity")} majburiy xato={fx.xato(`outputs.${indeks}.quantity`)}><input type="number" inputMode="decimal" min="0" step="any" value={qator.quantity} onChange={(event) => chiqim(indeks, { quantity: event.target.value })} className={inputKlass} /></Maydon>
            <Maydon nom={t("fields.quantityType")} xato={fx.xato(`outputs.${indeks}.quantityType`)}>
              <select value={qator.quantityType} onChange={(event) => chiqim(indeks, { quantityType: event.target.value as ChiqimQatori["quantityType"] })} className={inputKlass}>
                <option value="">{t("quantityType.default")}</option>
                <option value="PROPORTIONAL">{t("quantityType.PROPORTIONAL")}</option>
                <option value="PER_BATCH">{t("quantityType.PER_BATCH")}</option>
              </select>
            </Maydon>
            <QatorOchirish onClick={() => ozgar({ outputs: forma.outputs.filter((_, i) => i !== indeks) })} />
          </QatorKartasi>
        ))}
        {forma.outputs.length > 0 && <QatorQoshish matn={t("recipes.addOutput")} onClick={chiqimQoshish} />}
      </Bolim>
    </Oyna>
  );
}

function RetseptKorish({ id, nomlar, onYopish, onOzgardi, onTahrir, onOchish }: { id: string; nomlar: Map<string, string>; onYopish: () => void; onOzgardi: () => void; onTahrir: (retsept: Retsept) => void; onOchish: (id: string) => void }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const hujjat = useMalumot(() => ishlabChiqarishApi.retseptlar.olish(id), id);
  const amal = useAmal();
  const fx = useMaydonXatolari(PORTLASH_XATO_QOIDALARI);
  const [tasdiq, setTasdiq] = useState(false);
  const [miqdor, setMiqdor] = useState("");
  const [portlash, setPortlash] = useState<Portlash | null>(null);
  const retsept = hujjat.malumot;
  const qoralama = retsept?.status === "DRAFT";

  function hisoblash() {
    const qty = sonMaydoni(miqdor);
    if (!(qty && qty > 0)) return fx.ornat({ qty: t("errors.lineQuantity") });
    fx.ornat({});
    void amal.bajar(async () => setPortlash(await ishlabChiqarishApi.retseptlar.portlash(id, qty)), fx.serverdan);
  }
  // Boshqa amallar (o'chirish, versiya, faollashtirish) xatosi tepada: kalkulyator xatosi uni yashirmasin.
  const amalBajar = <T,>(ish: () => Promise<T>) => {
    fx.ornat({});
    return amal.bajar(ish);
  };

  return (
    <Oyna keng ikonka={BookOpen} sarlavha={retsept ? qatorNomi(retsept) : t("loading")} izoh={retsept?.version != null ? `${t("fields.version")}: ${versiyaMatni(retsept)}` : undefined} belgi={<Holat status={retsept?.status} />} onYopish={onYopish} pastki={retsept && <>
      {qoralama && <button type="button" disabled={amal.band} onClick={() => void amalBajar(async () => { await ishlabChiqarishApi.retseptlar.ochirish(id); onOzgardi(); onYopish(); })} className={tugmaXavfli}>{t("actions.delete")}</button>}
      {qoralama && <button type="button" onClick={() => onTahrir(retsept)} className={tugmaIkkinchi}>{t("actions.edit")}</button>}
      {!qoralama && <button type="button" disabled={amal.band} onClick={() => void amalBajar(async () => { const yangi = await ishlabChiqarishApi.retseptlar.yangiVersiya(id); onOzgardi(); onOchish(yangi.id); })} className={tugmaIkkinchi}><Copy size={15} />{t("actions.newVersion")}</button>}
      {qoralama && <button type="button" disabled={amal.band} onClick={() => setTasdiq(true)} className={tugmaAsosiy}><CheckCircle2 size={16} />{t("actions.activate")}</button>}
    </>}>
      <XatoQutisi matn={hujjat.xato || fx.tepadagi || (fx.bor ? "" : amal.xato)} />
      {!retsept ? <Yuklanmoqda /> : <>
        <Tafsilotlar qatorlar={[
          { nom: t("fields.product"), qiymat: qatorNomi(retsept), keng: true },
          { nom: t("fields.wipWarehouse"), qiymat: retsept.warehouse?.name || nomlar.get(retsept.warehouseId) || "—" },
          { nom: t("fields.version"), qiymat: versiyaMatni(retsept) },
          { nom: t("fields.baseQuantity"), qiymat: miqdorMatni(retsept.baseQuantity) },
          { nom: t("fields.normalScrapPercent"), qiymat: foizMatni(retsept.normalScrapPercent) },
          { nom: t("recipes.outputRange"), qiymat: oraliqMatni(retsept.outputMin, retsept.outputMax) },
          { nom: t("fields.consumeOnIssue"), qiymat: retsept.consumeOnIssue ? t("common.yes") : t("common.no") },
        ]} />
        {retsept.note && <p className="rounded-2xl border border-orange-100 bg-white p-4 text-sm font-semibold text-slate-600"><span className="font-black text-slate-800">{t("fields.note")}:</span> {retsept.note}</p>}
        <div className="grid items-start gap-5 xl:grid-cols-2">
          <Bolim ikonka={Package} sarlavha={t("recipes.inputs")} izoh={t("recipes.viewInputsHint", { miqdor: miqdorMatni(retsept.baseQuantity) })}>
            <Jadval tableId="IshlabChiqarish/Retseptlar/jadval-2"
              ixcham
              ustunlar={[
                { id: "retseptlar-column-9", nom: t("fields.product"), katak: (qator) => <span className="block max-w-[240px] truncate font-bold text-slate-800">{qatorNomi(qator)}</span> },
                { id: "retseptlar-column-10", nom: t("fields.inputKind"), katak: (qator) => t(`inputKind.${qator.kind}`, { defaultValue: qator.kind }) },
                { id: "retseptlar-column-11", nom: t("fields.quantity"), ong: true, katak: (qator) => (qator.kind === "FREE" ? <span className="text-slate-400">—</span> : kirimMiqdori(qator)) },
                { id: "retseptlar-column-12", nom: t("fields.tolerancePercent"), ong: true, katak: (qator) => (qator.kind === "FIXED" && qator.tolerancePercent != null && qator.tolerancePercent !== "" ? `±${miqdorMatni(qator.tolerancePercent)}%` : "—") },
              ]}
              qatorlar={retsept.inputs ?? []}
              kalit={(qator, indeks) => qator.id ?? String(indeks)}
              bosh={t("empty.lines")}
            />
          </Bolim>
          <Bolim ikonka={PackageCheck} sarlavha={t("recipes.outputs")}>
            <Jadval tableId="IshlabChiqarish/Retseptlar/jadval-3"
              ixcham
              ustunlar={[
                { id: "retseptlar-column-13", nom: t("fields.product"), katak: (qator) => <span className="block max-w-[240px] truncate font-bold text-slate-800">{qatorNomi(qator)}</span> },
                { id: "retseptlar-column-14", nom: t("fields.outputRole"), katak: (qator) => t(`outputRole.${qator.role}`, { defaultValue: qator.role }) },
                { id: "retseptlar-column-15", nom: t("fields.quantity"), ong: true, katak: (qator) => miqdorMatni(qator.quantity) },
                { id: "retseptlar-column-16", nom: t("fields.quantityType"), katak: (qator) => t(`quantityType.${qator.quantityType || "default"}`, { defaultValue: qator.quantityType ?? "" }) },
              ]}
              qatorlar={retsept.outputs ?? []}
              kalit={(qator, indeks) => qator.id ?? String(indeks)}
              bosh={t("empty.lines")}
            />
          </Bolim>
        </div>
        <Bolim ikonka={Calculator} sarlavha={t("recipes.explodeTitle")} izoh={t("recipes.explodeHint")}>
          <div data-maydon-xato={fx.xato("qty") ? "true" : undefined} className="grid gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={miqdor}
                aria-label={t("fields.quantity")}
                aria-invalid={fx.xato("qty") ? true : undefined}
                placeholder="300"
                onChange={(event) => { setMiqdor(event.target.value); fx.tozala("qty"); }}
                onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); hisoblash(); } }}
                className={`${inputKlass} max-w-56 ${fx.xato("qty") ? xatoRamkasi : ""}`}
              />
              <button type="button" disabled={amal.band} onClick={hisoblash} className={tugmaIkkinchi}><BookOpenCheck size={15} />{t("recipes.explode")}</button>
            </div>
            {fx.xato("qty") && <span role="alert" className="text-xs font-bold leading-5 text-red-600">{fx.xato("qty")}</span>}
          </div>
          {portlash && <div className="grid items-start gap-4 xl:grid-cols-2">
            <Jadval tableId="IshlabChiqarish/Retseptlar/jadval-4"
              ixcham
              ustunlar={[
                { id: "retseptlar-column-17", nom: t("recipes.inputs"), katak: (qator) => qatorNomi(qator) },
                { id: "retseptlar-column-18", nom: t("fields.inputKind"), katak: (qator) => t(`inputKind.${qator.kind}`, { defaultValue: qator.kind ?? "—" }) },
                { id: "retseptlar-column-19", nom: t("fields.required"), ong: true, katak: portlashMiqdorMatni },
              ]}
              qatorlar={portlash.inputs}
              kalit={(qator, indeks) => `${qator.modificationId ?? ""}-${indeks}`}
              bosh={t("empty.lines")}
            />
            <Jadval tableId="IshlabChiqarish/Retseptlar/jadval-5"
              ixcham
              ustunlar={[
                { id: "retseptlar-column-20", nom: t("recipes.outputs"), katak: (qator) => qatorNomi(qator) },
                { id: "retseptlar-column-21", nom: t("fields.outputRole"), katak: (qator) => t(`outputRole.${qator.role}`, { defaultValue: qator.role ?? "—" }) },
                { id: "retseptlar-column-22", nom: t("fields.quantity"), ong: true, katak: portlashMiqdorMatni },
              ]}
              qatorlar={portlash.outputs}
              kalit={(qator, indeks) => `${qator.modificationId ?? ""}-${indeks}`}
              bosh={t("empty.lines")}
            />
          </div>}
        </Bolim>
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
          onTasdiq={async () => { await amalBajar(() => ishlabChiqarishApi.retseptlar.faollashtirish(id)); hujjat.qayta(); onOzgardi(); }}
          onYopish={() => setTasdiq(false)}
        />
      )}
    </Oyna>
  );
}
