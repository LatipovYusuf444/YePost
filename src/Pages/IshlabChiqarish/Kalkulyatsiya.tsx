import { useMemo, useState } from "react";
import { Archive, ArrowRight, Calculator, CalendarSearch, CheckCircle2, CircleCheckBig, Copy, Download, FilePen, Layers, NotebookPen, Package, Plus, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ishlabChiqarishApi } from "@/api/ishlabChiqarishApi";
import { bugungiToshkentKuni, kunMatni } from "@/lib/hujjatSanasi";
import { holatBoyicha, tahrirTanasi, hujjatRaqami, kalkulyatsiyaJami, kalkulyatsiyaTanasiniYigish, miqdorMatni, portlashMiqdori, qatorNomi, qidiruvgaMos, type KalkulyatsiyaFormasi, type XatoMaydonQoidasi } from "@/lib/ishlabChiqarish";
import { taqsimotSummasi } from "@/lib/qarzTaqsimoti";
import type { KalkulyatsiyaKartasi, KunNarxi as KunNarxiJavobi } from "@/types/ishlabChiqarish";
import { Asboblar, Bolim, HolatFiltri, HolatKartalari, Holat, Jadval, MahsulotQidiruvi, Maydon, MaydonXatosi, Ogohlantirish, Oyna, QatorKartasi, QatorOchirish, QatorQoshish, QidiruvMaydoni, Sahifa, Tafsilotlar, XatoQutisi, Yuklanmoqda, inputKlass, tugmaAsosiy, tugmaIkkinchi, tugmaXavfli, xatoRamkasi, type HolatGuruhi, type Ustun } from "./umumiy";
import { useAmal, useMalumot, useMaydonXatolari, useQoralamaNazorati } from "./hooklar";

type Qator = KalkulyatsiyaFormasi["lines"][number] & { nom?: string };
type Forma = Omit<KalkulyatsiyaFormasi, "lines"> & { nom?: string; lines: Qator[] };

const HOLATLAR = ["DRAFT", "ACTIVE", "ARCHIVED"];

const matn = (qiymat: unknown) => (qiymat === null || qiymat === undefined ? "" : String(qiymat));
const bosh = (): Forma => ({ modificationId: "", recipeId: "", validFrom: "", normalScrapPercent: "", note: "", lines: [] });
const bo = (karta: KalkulyatsiyaKartasi): Forma => ({
  modificationId: karta.modificationId,
  nom: qatorNomi(karta),
  recipeId: karta.recipeId ?? "",
  validFrom: karta.validFrom?.slice(0, 10) ?? "",
  normalScrapPercent: matn(karta.normalScrapPercent),
  note: karta.note ?? "",
  lines: (karta.lines ?? []).map((qator) => ({ modificationId: qator.modificationId, nom: qatorNomi(qator), quantity: matn(qator.quantity), price: matn(qator.price), currency: qator.currency === "USD" ? "USD" : "UZS", costingRate: matn(qator.costingRate) })),
});
const summa = (qiymat: unknown) => (qiymat != null && qiymat !== "" ? taqsimotSummasi(qiymat, "UZS") : "—");
const versiya = (karta: KalkulyatsiyaKartasi) => (karta.version != null ? `v${karta.version}` : "");

// Server xatosi qaysi maydonga tushadi (kalit — backend maydon yo'li). So'zlar tartibi muhim: "mahsulotga faol retsept yo'q" — retsept.
const KARTA_XATO_QOIDALARI: Record<string, XatoMaydonQoidasi> = {
  recipeId: { maydonlar: ["recipeId"], kodlar: ["recipe"], sozlar: ["retsept", "рецепт"] },
  validFrom: { maydonlar: ["validFrom"], kodlar: ["date", "valid_from"], sozlar: ["sana", "дат"] },
  normalScrapPercent: { maydonlar: ["normalScrapPercent"], kodlar: ["scrap"], sozlar: ["chiqindi", "отход"] },
  note: { maydonlar: ["note"] },
  lines: { maydonlar: ["lines"], kodlar: ["lines"] },
  modificationId: { maydonlar: ["modificationId"], kodlar: ["modification", "product"], sozlar: ["mahsulot", "товар"] },
};
const KUN_NARXI_XATO_QOIDALARI: Record<string, XatoMaydonQoidasi> = {
  date: { maydonlar: ["date"], kodlar: ["date"], sozlar: ["sana", "дат"] },
  modificationId: { maydonlar: ["modificationId"], kodlar: ["modification", "product"], sozlar: ["mahsulot", "товар"] },
};

export default function Kalkulyatsiya() {
  const { t } = useTranslation("ishlab_chiqarish");
  const royxat = useMalumot(() => ishlabChiqarishApi.kalkulyatsiya.royxat(), "costing");
  const [filtr, setFiltr] = useState<{ kalit: string; holatlar: string[] } | null>(null);
  const [qidiruv, setQidiruv] = useState("");
  const [ochiq, setOchiq] = useState<string | null>(null);
  const [forma, setForma] = useState<{ id?: string; qiymat: Forma } | null>(null);
  const hammasi = useMemo(() => royxat.malumot ?? [], [royxat.malumot]);
  const qatorlar = useMemo(
    () => holatBoyicha(hammasi, filtr?.holatlar ?? null).filter((karta) => qidiruvgaMos(qidiruv, [qatorNomi(karta), karta.note, hujjatRaqami(karta), versiya(karta)])),
    [hammasi, filtr, qidiruv]
  );
  const guruhlar: HolatGuruhi[] = [
    { kalit: "jami", nom: t("costing.kpi.total"), holatlar: null, rang: "blue", ikonka: Calculator },
    { kalit: "faol", nom: t("costing.kpi.active"), holatlar: ["ACTIVE"], rang: "emerald", ikonka: CircleCheckBig },
    { kalit: "qoralama", nom: t("costing.kpi.draft"), holatlar: ["DRAFT"], rang: "amber", ikonka: FilePen },
    { kalit: "arxiv", nom: t("costing.kpi.archived"), holatlar: ["ARCHIVED"], rang: "violet", ikonka: Archive },
  ];
  const ustunlar: Ustun<KalkulyatsiyaKartasi>[] = [
    { id: "kalkulyatsiya-column-1",
      nom: t("fields.product"),
      katak: (karta) => (
        <span className="block max-w-[300px]">
          <span className="block truncate font-black text-slate-900">{qatorNomi(karta)}</span>
          {hujjatRaqami(karta) && <span className="block truncate text-xs font-bold text-slate-400">{hujjatRaqami(karta)}</span>}
        </span>
      ),
    },
    { id: "kalkulyatsiya-column-2", nom: t("fields.version"), katak: (karta) => (versiya(karta) ? <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">{versiya(karta)}</span> : "—") },
    { id: "kalkulyatsiya-column-3", nom: t("fields.validFrom"), katak: (karta) => kunMatni(karta.validFrom ?? undefined) || <span className="text-slate-400">—</span> },
    { id: "kalkulyatsiya-column-4", nom: t("costing.linesCount"), ong: true, katak: (karta) => (karta.lines ? karta.lines.length : "—") },
    { id: "kalkulyatsiya-column-5", nom: t("fields.normalScrapPercent"), ong: true, katak: (karta) => miqdorMatni(karta.normalScrapPercent) },
    { id: "kalkulyatsiya-column-6", nom: t("costing.unitCost"), ong: true, katak: (karta) => <span className="font-black text-slate-900">{summa(karta.total)}</span> },
    { id: "kalkulyatsiya-column-7", nom: t("fields.status"), katak: (karta) => <Holat status={karta.status} /> },
  ];
  const yangi = <button type="button" onClick={() => setForma({ qiymat: bosh() })} className={tugmaAsosiy}><Plus size={18} />{t("costing.create")}</button>;
  // Karta bor, lekin qidiruv yoki filtr hech narsa qoldirmagan.
  const filtrlangan = hammasi.length > 0;
  return (
    <Sahifa sarlavha={t("costing.title")} izoh={t("costing.subtitle")} amal={yangi}>
      <HolatKartalari guruhlar={guruhlar} qatorlar={hammasi} tanlangan={filtr?.kalit ?? ""} yuklanmoqda={royxat.yuklanmoqda && !royxat.malumot} onTanlash={(guruh) => setFiltr(guruh?.holatlar ? { kalit: guruh.kalit, holatlar: guruh.holatlar } : null)} />
      <KunNarxi onOchish={setOchiq} />
      <Asboblar>
        <QidiruvMaydoni qiymat={qidiruv} onChange={setQidiruv} placeholder={t("costing.searchPlaceholder")} />
        <HolatFiltri qiymat={filtr?.holatlar.length === 1 ? filtr.holatlar[0] : ""} onChange={(holat) => setFiltr(holat ? { kalit: holat, holatlar: [holat] } : null)} holatlar={HOLATLAR} />
      </Asboblar>
      <XatoQutisi matn={royxat.xato} />
      <Jadval tableId="IshlabChiqarish/Kalkulyatsiya/jadval-1"
        ustunlar={ustunlar}
        qatorlar={qatorlar}
        kalit={(karta) => karta.id}
        onBos={(karta) => setOchiq(karta.id)}
        yuklanmoqda={royxat.yuklanmoqda && !royxat.malumot}
        sahifaHajmi={20}
        boshIkonka={Calculator}
        bosh={filtrlangan ? t("costing.emptyFiltered") : t("costing.emptyTitle")}
        boshIzoh={filtrlangan ? t("costing.emptyFilteredHint") : <KartaTartibi />}
        boshAmal={filtrlangan ? <button type="button" onClick={() => { setFiltr(null); setQidiruv(""); }} className={tugmaIkkinchi}>{t("actions.resetFilters")}</button> : yangi}
      />
      {ochiq && <KartaKorish id={ochiq} onYopish={() => setOchiq(null)} onOzgardi={royxat.qayta} onOchish={setOchiq} onTahrir={(karta) => { setOchiq(null); setForma({ id: karta.id, qiymat: bo(karta) }); }} />}
      {forma && <KartaOynasi boshlangich={forma} onYopish={() => setForma(null)} onSaqlandi={(id) => { setForma(null); royxat.qayta(); setOchiq(id); }} />}
    </Sahifa>
  );
}

/** Bo'sh ro'yxatda: kalkulyatsiya kartasi nima va qaysi tartibda tuziladi. */
function KartaTartibi() {
  const { t } = useTranslation("ishlab_chiqarish");
  const qadamlar = [t("costing.flow.product"), t("costing.flow.recipe"), t("costing.flow.price"), t("costing.flow.activate")];
  return (
    <div className="space-y-5">
      <p>{t("costing.emptyHint")}</p>
      <p className="font-bold text-slate-600">{t("costing.rawOnlyHint")}</p>
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

// GET /production/costing-cards/price: tanlangan kunga amaldagi 1 dona narxi va karta versiyasi.
function KunNarxi({ onOchish }: { onOchish: (id: string) => void }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const [mahsulot, setMahsulot] = useState({ id: "", nom: "" });
  const [sana, setSana] = useState(() => bugungiToshkentKuni());
  const [natija, setNatija] = useState<KunNarxiJavobi | null>(null);
  const amal = useAmal();
  const fx = useMaydonXatolari(KUN_NARXI_XATO_QOIDALARI);
  // Maydonga bog'langan server xatosi tepada qayta chiqmasin (maydon tuzatilgach ham).
  const serverXatosi = (tafsilot: unknown) => { if (fx.serverdan(tafsilot)) amal.setXato(""); };
  function tekshirish() {
    if (!mahsulot.id) { amal.setXato(""); return fx.ornat({ modificationId: t("errors.product") }); }
    setNatija(null);
    fx.ornat({});
    void amal.bajar(async () => {
      setNatija(await ishlabChiqarishApi.kalkulyatsiya.kunNarxi(mahsulot.id, sana));
    }, serverXatosi);
  }
  return (
    <Bolim ikonka={CalendarSearch} sarlavha={t("costing.priceOnDate")} izoh={t("costing.priceOnDateHint")}>
      {/* items-start: maydon ostida xato chiqsa tugma kiritish qatoridan siljimaydi (lg:mt-7 — yorliq balandligi). */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_200px_auto_minmax(0,1.2fr)]">
        <Maydon nom={t("fields.product")} xato={fx.xato("modificationId")}><MahsulotQidiruvi value={mahsulot.id} nom={mahsulot.nom} onChange={(id, nom) => { setMahsulot({ id, nom }); fx.tozala("modificationId"); }} /></Maydon>
        <Maydon nom={t("fields.date")} xato={fx.xato("date")}><input type="date" value={sana} onChange={(event) => { setSana(event.target.value); fx.tozala("date"); }} className={inputKlass} /></Maydon>
        <button type="button" disabled={amal.band} onClick={tekshirish} className={`${tugmaIkkinchi} lg:mt-7`}><Calculator size={16} />{t("costing.check")}</button>
        <div className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-[#F8FAFC] px-4 py-2.5 lg:mt-7">
          {natija ? (
            <>
              <span className="min-w-0">
                <span className="block text-xs font-bold uppercase tracking-wide text-slate-400">{t("costing.unitCost")}{natija.version ? ` · v${natija.version}` : ""}</span>
                <span className="block truncate text-lg font-black text-slate-900">{taqsimotSummasi(natija.unitCost, "UZS")}</span>
              </span>
              {natija.cardId && <button type="button" onClick={() => onOchish(natija.cardId as string)} className="shrink-0 text-sm font-black text-[#2563EB] hover:underline">{t("costing.openCard")}</button>}
            </>
          ) : (
            <span className="text-sm font-semibold text-slate-400">{t("costing.priceOnDateEmpty")}</span>
          )}
        </div>
      </div>
      <XatoQutisi matn={fx.tepadagi || (fx.bor ? "" : amal.xato)} />
    </Bolim>
  );
}

function KartaOynasi({ boshlangich, onYopish, onSaqlandi }: { boshlangich: { id?: string; qiymat: Forma }; onYopish: () => void; onSaqlandi: (id: string) => void }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const [forma, setForma] = useState(boshlangich.qiymat);
  const amal = useAmal();
  const fx = useMaydonXatolari(KARTA_XATO_QOIDALARI);
  const qoralamaNazorati = useQoralamaNazorati(boshlangich.id ? () => ishlabChiqarishApi.kalkulyatsiya.olish(boshlangich.id as string) : null);
  // Maydonga bog'langan server xatosi tepada qayta chiqmasin (maydon tuzatilgach ham).
  const serverXatosi = (tafsilot: unknown) => { if (fx.serverdan(tafsilot)) amal.setXato(""); };
  const retseptlar = useMalumot(() => ishlabChiqarishApi.retseptlar.royxat({ status: "ACTIVE", modificationId: forma.modificationId || undefined }), forma.modificationId);
  const ozgar = (qism: Partial<Forma>) => setForma((joriy) => ({ ...joriy, ...qism }));
  const qator = (indeks: number, qism: Partial<Qator>) => {
    ozgar({ lines: forma.lines.map((item, i) => (i === indeks ? { ...item, ...qism } : item)) });
    // O'zgargan maydon xatosi olib tashlanadi; valyuta o'zgarsa kurs talabi ham o'zgaradi.
    fx.tozala(...Object.keys(qism).map((kalit) => `lines.${indeks}.${kalit}`), ...("currency" in qism ? [`lines.${indeks}.costingRate`] : []));
  };
  const qatorYoli = (indeks: number, maydon: keyof KalkulyatsiyaFormasi["lines"][number]) => fx.xato(`lines.${indeks}.${maydon}`);
  const jami = kalkulyatsiyaJami(forma.lines);
  // Qator summasi (ekran uchun): dollardagi qatorda kurs yozilmagan bo'lsa hisoblanmaydi.
  const qatorSummasi = (item: Qator) => (item.currency === "USD" && !(Number(item.costingRate) > 0) ? "—" : taqsimotSummasi(kalkulyatsiyaJami([item]), "UZS"));

  // Miqdorlar 1 birlik mahsulot uchun retseptdan olinadi (explode?qty=1); narxni foydalanuvchi yozadi.
  function retseptdanOlish() {
    if (!forma.recipeId) { amal.setXato(""); return fx.ornat({ recipeId: t("errors.recipe") }); }
    fx.ornat({});
    void amal.bajar(async () => {
      const { inputs } = await ishlabChiqarishApi.retseptlar.portlash(forma.recipeId, 1);
      ozgar({ lines: inputs.filter((item) => item.modificationId).map((item) => ({ modificationId: item.modificationId as string, nom: qatorNomi(item), quantity: matn(portlashMiqdori(item)), price: "", currency: "UZS", costingRate: "" })) });
    }, serverXatosi);
  }
  function saqlash() {
    const natija = kalkulyatsiyaTanasiniYigish(forma);
    if ("xato" in natija) { amal.setXato(""); return fx.tekshiruv(natija, t(natija.xato)); }
    fx.ornat({});
    void amal.bajar(async () => {
      const saqlangan = boshlangich.id ? await ishlabChiqarishApi.kalkulyatsiya.yangilash(boshlangich.id, tahrirTanasi(natija.tana, { recipeId: null, validFrom: null, normalScrapPercent: 0, note: "" })) : await ishlabChiqarishApi.kalkulyatsiya.yaratish(natija.tana);
      onSaqlandi(saqlangan.id);
    }, (tafsilot) => {
      serverXatosi(tafsilot);
      // Shu orada faollashtirilgan bo'lsa tahrir rad etiladi: karta holati qayta o'qiladi.
      if (boshlangich.id) qoralamaNazorati.tekshir();
    });
  }

  return (
    <Oyna keng ikonka={Calculator} sarlavha={t(boshlangich.id ? "costing.edit" : "costing.create")} izoh={t("costing.formHint")} onYopish={onYopish} pastki={<>
      <span className="mr-auto text-sm font-black text-slate-700">{t("costing.estimate", { summa: taqsimotSummasi(jami, "UZS") })}</span>
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
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Bolim ikonka={Package} sarlavha={t("costing.sectionMain")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Maydon nom={t("fields.product")} xato={fx.xato("modificationId")}><MahsulotQidiruvi value={forma.modificationId} nom={forma.nom} onChange={(modificationId, nom) => { ozgar({ modificationId, nom, recipeId: "" }); fx.tozala("modificationId", "recipeId"); }} /></Maydon>
            <Maydon nom={t("fields.recipe")} izoh={t("costing.recipeHint")} xato={fx.xato("recipeId")}>
              <select value={forma.recipeId} onChange={(event) => { ozgar({ recipeId: event.target.value }); fx.tozala("recipeId"); }} className={inputKlass}>
                <option value="">{t("fields.selectRecipe")}</option>
                {(retseptlar.malumot ?? []).map((retsept) => <option key={retsept.id} value={retsept.id}>{qatorNomi(retsept)}{retsept.version ? ` · v${retsept.version}` : ""}</option>)}
              </select>
            </Maydon>
            <Maydon nom={t("fields.validFrom")} izoh={t("costing.validFromHint")} xato={fx.xato("validFrom")}><input type="date" value={forma.validFrom} onChange={(event) => { ozgar({ validFrom: event.target.value }); fx.tozala("validFrom"); }} className={inputKlass} /></Maydon>
            <Maydon nom={t("fields.normalScrapPercent")} xato={fx.xato("normalScrapPercent")}><input type="number" inputMode="decimal" min="0" step="any" value={forma.normalScrapPercent} placeholder="0" onChange={(event) => { ozgar({ normalScrapPercent: event.target.value }); fx.tozala("normalScrapPercent"); }} className={inputKlass} /></Maydon>
          </div>
        </Bolim>
        <Bolim ikonka={Wallet} sarlavha={t("costing.sectionEstimate")} izoh={t("costing.estimateHint")}>
          <div className="rounded-2xl bg-gradient-to-br from-orange-50 via-white to-sky-50 px-5 py-5 ring-1 ring-orange-100">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{t("costing.unitCost")}</p>
            <p className="mt-1 break-words text-3xl font-black tracking-tight text-slate-950 tabular-nums">{taqsimotSummasi(jami, "UZS")}</p>
            <p className="mt-2 text-sm font-semibold text-slate-500">{t("costing.linesCount")}: <span className="font-black text-slate-700">{forma.lines.length}</span></p>
          </div>
          <p className="text-xs font-semibold leading-5 text-slate-400">{t("costing.rawOnlyHint")}</p>
        </Bolim>
      </div>
      <Bolim
        ikonka={Layers}
        sarlavha={t("costing.sectionLines")}
        izoh={t("costing.linesHint")}
        amal={<button type="button" disabled={amal.band} onClick={retseptdanOlish} title={t("costing.fromRecipe")} className={tugmaIkkinchi}><Download size={16} />{t("costing.fromRecipe")}</button>}
      >
        <MaydonXatosi matn={fx.xato("lines")} />
        {forma.lines.length === 0 && <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm font-semibold leading-6 text-slate-400">{t("costing.linesEmpty")}</p>}
        {forma.lines.map((item, indeks) => (
          // !items-start: bitta maydon ostida xato chiqsa, qatordagi boshqa maydonlar siljimaydi (yorliqlar bir qatorli).
          <QatorKartasi key={indeks} className="!items-start sm:grid-cols-2 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.1fr)_110px_minmax(0,1fr)_minmax(0,1fr)_48px]">
            <Maydon nom={t("fields.product")} className="sm:col-span-2 lg:col-span-1" xato={qatorYoli(indeks, "modificationId")}><MahsulotQidiruvi value={item.modificationId} nom={item.nom} onChange={(modificationId, nom) => qator(indeks, { modificationId, nom })} /></Maydon>
            <Maydon nom={t("fields.quantity")} xato={qatorYoli(indeks, "quantity")}><input type="number" inputMode="decimal" min="0" step="any" value={item.quantity} onChange={(event) => qator(indeks, { quantity: event.target.value })} className={inputKlass} /></Maydon>
            <Maydon nom={t("fields.price")} xato={qatorYoli(indeks, "price")}><input type="number" inputMode="decimal" min="0" step="any" value={item.price} onChange={(event) => qator(indeks, { price: event.target.value })} className={inputKlass} /></Maydon>
            <Maydon nom={t("fields.currency")} xato={qatorYoli(indeks, "currency")}>
              <select value={item.currency} onChange={(event) => qator(indeks, { currency: event.target.value as Qator["currency"] })} className={inputKlass}>
                <option value="UZS">UZS</option>
                <option value="USD">USD</option>
              </select>
            </Maydon>
            <Maydon nom={t("fields.costingRate")} xato={qatorYoli(indeks, "costingRate")}><input type="number" inputMode="decimal" min="0" step="any" disabled={item.currency !== "USD"} value={item.costingRate} onChange={(event) => qator(indeks, { costingRate: event.target.value })} className={inputKlass} /></Maydon>
            <Maydon nom={t("fields.amount")}><span className="flex h-12 items-center justify-end truncate rounded-2xl bg-white px-4 text-[15px] font-black text-slate-800 ring-1 ring-slate-200 tabular-nums">{qatorSummasi(item)}</span></Maydon>
            <div className="sm:mt-7"><QatorOchirish onClick={() => { ozgar({ lines: forma.lines.filter((_, i) => i !== indeks) }); fx.tozala("lines"); }} /></div>
          </QatorKartasi>
        ))}
        <QatorQoshish matn={t("costing.addLine")} onClick={() => { ozgar({ lines: [...forma.lines, { modificationId: "", quantity: "", price: "", currency: "UZS", costingRate: "" }] }); fx.tozala("lines"); }} />
      </Bolim>
      <Bolim ikonka={NotebookPen} sarlavha={t("fields.note")}>
        <textarea value={forma.note} rows={3} aria-label={t("fields.note")} aria-invalid={fx.xato("note") ? true : undefined} placeholder={t("costing.notePlaceholder")} onChange={(event) => { ozgar({ note: event.target.value }); fx.tozala("note"); }} className={`${inputKlass} h-auto py-3 ${fx.xato("note") ? xatoRamkasi : ""}`} />
        <MaydonXatosi matn={fx.xato("note")} />
      </Bolim>
    </Oyna>
  );
}

function KartaKorish({ id, onYopish, onOzgardi, onTahrir, onOchish }: { id: string; onYopish: () => void; onOzgardi: () => void; onTahrir: (karta: KalkulyatsiyaKartasi) => void; onOchish: (id: string) => void }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const hujjat = useMalumot(() => ishlabChiqarishApi.kalkulyatsiya.olish(id), id);
  const amal = useAmal();
  const karta = hujjat.malumot;
  const qoralama = karta?.status === "DRAFT";
  const bajarish = (ish: () => Promise<unknown>) => void amal.bajar(async () => { await ish(); hujjat.qayta(); onOzgardi(); });
  const sarlavhaIzohi = karta ? [versiya(karta), hujjatRaqami(karta)].filter(Boolean).join(" · ") : "";
  return (
    <Oyna keng ikonka={Calculator} sarlavha={karta ? qatorNomi(karta) : t("loading")} izoh={sarlavhaIzohi || undefined} belgi={<Holat status={karta?.status} />} onYopish={onYopish} pastki={karta && <>
      {qoralama && <button type="button" disabled={amal.band} onClick={() => void amal.bajar(async () => { await ishlabChiqarishApi.kalkulyatsiya.ochirish(id); onOzgardi(); onYopish(); })} className={tugmaXavfli}>{t("actions.delete")}</button>}
      {qoralama && <button type="button" onClick={() => onTahrir(karta)} className={tugmaIkkinchi}>{t("actions.edit")}</button>}
      {karta.status === "ACTIVE" && <button type="button" disabled={amal.band} onClick={() => bajarish(() => ishlabChiqarishApi.kalkulyatsiya.arxivlash(id))} className={tugmaIkkinchi}><Archive size={15} />{t("actions.archive")}</button>}
      {!qoralama && <button type="button" disabled={amal.band} onClick={() => void amal.bajar(async () => { const yangi = await ishlabChiqarishApi.kalkulyatsiya.yangiVersiya(id); onOzgardi(); onOchish(yangi.id); })} className={tugmaIkkinchi}><Copy size={15} />{t("actions.newVersion")}</button>}
      {qoralama && <button type="button" disabled={amal.band} onClick={() => { if (!karta.validFrom) return amal.setXato(t("errors.validFrom")); bajarish(() => ishlabChiqarishApi.kalkulyatsiya.faollashtirish(id)); }} className={tugmaAsosiy}><CheckCircle2 size={16} />{t("actions.activate")}</button>}
    </>}>
      <XatoQutisi matn={hujjat.xato || amal.xato} />
      {!karta ? <Yuklanmoqda /> : <>
        <Tafsilotlar qatorlar={[
          { nom: t("fields.product"), qiymat: qatorNomi(karta), keng: true },
          { nom: t("costing.unitCost"), qiymat: <span className="text-[#2563EB]">{summa(karta.total)}</span> },
          { nom: t("fields.version"), qiymat: versiya(karta) || "—" },
          { nom: t("fields.validFrom"), qiymat: kunMatni(karta.validFrom ?? undefined) || "—" },
          { nom: t("fields.normalScrapPercent"), qiymat: miqdorMatni(karta.normalScrapPercent) },
          { nom: t("costing.linesCount"), qiymat: karta.lines ? karta.lines.length : "—" },
          { nom: t("fields.document"), qiymat: hujjatRaqami(karta) || "—" },
        ]} />
        {qoralama && !karta.validFrom && <Ogohlantirish>{t("costing.activateNeedsDate")}</Ogohlantirish>}
        {karta.note && <p className="rounded-2xl border border-orange-100 bg-white p-4 text-sm font-semibold text-slate-600"><span className="font-black text-slate-800">{t("fields.note")}:</span> {karta.note}</p>}
        <Bolim ikonka={Layers} sarlavha={t("costing.sectionLines")} izoh={t("costing.rawOnlyHint")}>
          <Jadval tableId="IshlabChiqarish/Kalkulyatsiya/jadval-2"
            ixcham
            ustunlar={[
              { id: "kalkulyatsiya-column-8", nom: t("fields.product"), katak: (qator) => qatorNomi(qator) },
              { id: "kalkulyatsiya-column-9", nom: t("fields.quantity"), ong: true, katak: (qator) => miqdorMatni(qator.quantity) },
              { id: "kalkulyatsiya-column-10", nom: t("fields.price"), ong: true, katak: (qator) => taqsimotSummasi(qator.price, qator.currency) },
              { id: "kalkulyatsiya-column-11", nom: t("fields.costingRate"), ong: true, katak: (qator) => (qator.currency === "USD" && qator.costingRate ? miqdorMatni(qator.costingRate) : "—") },
              { id: "kalkulyatsiya-column-12", nom: t("fields.amount"), ong: true, katak: (qator) => <span className="font-black text-slate-900">{summa(qator.amount)}</span> },
            ]}
            qatorlar={karta.lines ?? []}
            kalit={(qator, indeks) => qator.id ?? String(indeks)}
            bosh={t("empty.lines")}
          />
          {karta.total != null && (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-orange-50/60 px-4 py-3 ring-1 ring-orange-100">
              <span className="text-sm font-black uppercase tracking-wide text-slate-500">{t("fields.total")}</span>
              <span className="text-lg font-black text-slate-900 tabular-nums">{summa(karta.total)}</span>
            </div>
          )}
        </Bolim>
      </>}
    </Oyna>
  );
}
