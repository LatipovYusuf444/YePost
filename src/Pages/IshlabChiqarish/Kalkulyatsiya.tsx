import { useState } from "react";
import { Archive, CheckCircle2, Copy, Download, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ishlabChiqarishApi } from "@/api/ishlabChiqarishApi";
import { bugungiToshkentKuni, kunMatni } from "@/lib/hujjatSanasi";
import { kalkulyatsiyaJami, kalkulyatsiyaTanasiniYigish, miqdorMatni, portlashMiqdori, qatorNomi, type KalkulyatsiyaFormasi } from "@/lib/ishlabChiqarish";
import { taqsimotSummasi } from "@/lib/qarzTaqsimoti";
import type { KalkulyatsiyaKartasi } from "@/types/ishlabChiqarish";
import { HolatFiltri, Holat, Jadval, MahsulotQidiruvi, Maydon, Oyna, QatorOchirish, QatorQoshish, Sahifa, XatoQutisi, Yuklanmoqda, inputKlass, tugmaAsosiy, tugmaIkkinchi, tugmaXavfli, type Ustun } from "./umumiy";
import { useAmal, useMalumot } from "./hooklar";

type Qator = KalkulyatsiyaFormasi["lines"][number] & { nom?: string };
type Forma = Omit<KalkulyatsiyaFormasi, "lines"> & { nom?: string; lines: Qator[] };

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

export default function Kalkulyatsiya() {
  const { t } = useTranslation("ishlab_chiqarish");
  const [status, setStatus] = useState("");
  const royxat = useMalumot(() => ishlabChiqarishApi.kalkulyatsiya.royxat({ status }), status);
  const [ochiq, setOchiq] = useState<string | null>(null);
  const [forma, setForma] = useState<{ id?: string; qiymat: Forma } | null>(null);
  const ustunlar: Ustun<KalkulyatsiyaKartasi>[] = [
    { nom: t("fields.product"), katak: (karta) => <span className="font-black text-slate-900">{qatorNomi(karta)}</span> },
    { nom: t("fields.version"), katak: (karta) => karta.version ?? "—" },
    { nom: t("fields.validFrom"), katak: (karta) => kunMatni(karta.validFrom ?? undefined) || "—" },
    { nom: t("fields.total"), ong: true, katak: (karta) => (karta.total != null ? taqsimotSummasi(karta.total, "UZS") : "—") },
    { nom: t("fields.status"), katak: (karta) => <Holat status={karta.status} /> },
  ];
  return (
    <Sahifa
      sarlavha={t("costing.title")}
      izoh={t("costing.subtitle")}
      amal={<>
        <HolatFiltri qiymat={status} onChange={setStatus} holatlar={["DRAFT", "ACTIVE", "ARCHIVED"]} />
        <button type="button" onClick={() => setForma({ qiymat: bosh() })} className={tugmaAsosiy}><Plus size={16} />{t("costing.create")}</button>
      </>}
    >
      <XatoQutisi matn={royxat.xato} />
      <KunNarxi />
      {royxat.yuklanmoqda && !royxat.malumot ? <Yuklanmoqda /> : <Jadval ustunlar={ustunlar} qatorlar={royxat.malumot ?? []} kalit={(karta) => karta.id} onBos={(karta) => setOchiq(karta.id)} bosh={t("empty.costing")} />}
      {ochiq && <KartaKorish id={ochiq} onYopish={() => setOchiq(null)} onOzgardi={royxat.qayta} onOchish={setOchiq} onTahrir={(karta) => { setOchiq(null); setForma({ id: karta.id, qiymat: bo(karta) }); }} />}
      {forma && <KartaOynasi boshlangich={forma} onYopish={() => setForma(null)} onSaqlandi={(id) => { setForma(null); royxat.qayta(); setOchiq(id); }} />}
    </Sahifa>
  );
}

// GET /production/costing-cards/price: tanlangan kunga amaldagi 1 dona narxi va karta versiyasi.
function KunNarxi() {
  const { t } = useTranslation("ishlab_chiqarish");
  const [mahsulot, setMahsulot] = useState({ id: "", nom: "" });
  const [sana, setSana] = useState(() => bugungiToshkentKuni());
  const [natija, setNatija] = useState<string | null>(null);
  const amal = useAmal();
  function tekshirish() {
    if (!mahsulot.id) return amal.setXato(t("errors.product"));
    setNatija(null);
    void amal.bajar(async () => {
      const javob = await ishlabChiqarishApi.kalkulyatsiya.kunNarxi(mahsulot.id, sana);
      setNatija(`${taqsimotSummasi(javob.unitCost, "UZS")}${javob.version ? ` · v${javob.version}` : ""}`);
    });
  }
  return (
    <div className="grid items-end gap-3 rounded-2xl border border-slate-100 bg-white p-4 md:grid-cols-[minmax(0,2fr)_180px_auto]">
      <Maydon nom={t("costing.priceOnDate")}><MahsulotQidiruvi value={mahsulot.id} nom={mahsulot.nom} onChange={(id, nom) => setMahsulot({ id, nom })} /></Maydon>
      <Maydon nom={t("fields.date")}><input type="date" value={sana} onChange={(event) => setSana(event.target.value)} className={inputKlass} /></Maydon>
      <button type="button" disabled={amal.band} onClick={tekshirish} className={tugmaIkkinchi}>{t("costing.check")}</button>
      {natija && <p className="text-sm font-black text-slate-800 md:col-span-3">{natija}</p>}
      {amal.xato && <div className="md:col-span-3"><XatoQutisi matn={amal.xato} /></div>}
    </div>
  );
}

function KartaOynasi({ boshlangich, onYopish, onSaqlandi }: { boshlangich: { id?: string; qiymat: Forma }; onYopish: () => void; onSaqlandi: (id: string) => void }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const [forma, setForma] = useState(boshlangich.qiymat);
  const amal = useAmal();
  const retseptlar = useMalumot(() => ishlabChiqarishApi.retseptlar.royxat({ status: "ACTIVE", modificationId: forma.modificationId || undefined }), forma.modificationId);
  const ozgar = (qism: Partial<Forma>) => setForma((joriy) => ({ ...joriy, ...qism }));
  const qator = (indeks: number, qism: Partial<Qator>) => ozgar({ lines: forma.lines.map((item, i) => (i === indeks ? { ...item, ...qism } : item)) });

  // Miqdorlar 1 birlik mahsulot uchun retseptdan olinadi (explode?qty=1); narxni foydalanuvchi yozadi.
  function retseptdanOlish() {
    if (!forma.recipeId) return amal.setXato(t("errors.recipe"));
    void amal.bajar(async () => {
      const { inputs } = await ishlabChiqarishApi.retseptlar.portlash(forma.recipeId, 1);
      ozgar({ lines: inputs.filter((item) => item.modificationId).map((item) => ({ modificationId: item.modificationId as string, nom: qatorNomi(item), quantity: matn(portlashMiqdori(item)), price: "", currency: "UZS", costingRate: "" })) });
    });
  }
  function saqlash() {
    const natija = kalkulyatsiyaTanasiniYigish(forma);
    if ("xato" in natija) return amal.setXato(t(natija.xato));
    void amal.bajar(async () => {
      const saqlangan = boshlangich.id ? await ishlabChiqarishApi.kalkulyatsiya.yangilash(boshlangich.id, natija.tana) : await ishlabChiqarishApi.kalkulyatsiya.yaratish(natija.tana);
      onSaqlandi(saqlangan.id);
    });
  }

  return (
    <Oyna keng sarlavha={t(boshlangich.id ? "costing.edit" : "costing.create")} onYopish={onYopish} pastki={<>
      <span className="mr-auto text-sm font-black text-slate-700">{t("costing.estimate", { summa: taqsimotSummasi(kalkulyatsiyaJami(forma.lines), "UZS") })}</span>
      <button type="button" onClick={onYopish} className={tugmaIkkinchi}>{t("actions.cancel")}</button>
      <button type="button" disabled={amal.band} onClick={saqlash} className={tugmaAsosiy}>{t("actions.save")}</button>
    </>}>
      <XatoQutisi matn={amal.xato} />
      <div className="grid gap-3 md:grid-cols-2">
        <Maydon nom={t("fields.product")}><MahsulotQidiruvi value={forma.modificationId} nom={forma.nom} onChange={(modificationId, nom) => ozgar({ modificationId, nom, recipeId: "" })} /></Maydon>
        <Maydon nom={t("fields.recipe")}>
          <div className="flex gap-2">
            <select value={forma.recipeId} onChange={(event) => ozgar({ recipeId: event.target.value })} className={inputKlass}>
              <option value="">{t("fields.selectRecipe")}</option>
              {(retseptlar.malumot ?? []).map((retsept) => <option key={retsept.id} value={retsept.id}>{qatorNomi(retsept)}{retsept.version ? ` · v${retsept.version}` : ""}</option>)}
            </select>
            <button type="button" disabled={amal.band} onClick={retseptdanOlish} title={t("costing.fromRecipe")} aria-label={t("costing.fromRecipe")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 disabled:opacity-50"><Download size={16} /></button>
          </div>
        </Maydon>
        <Maydon nom={t("fields.validFrom")}><input type="date" value={forma.validFrom} onChange={(event) => ozgar({ validFrom: event.target.value })} className={inputKlass} /></Maydon>
        <Maydon nom={t("fields.normalScrapPercent")}><input type="number" min="0" step="any" value={forma.normalScrapPercent} onChange={(event) => ozgar({ normalScrapPercent: event.target.value })} className={inputKlass} /></Maydon>
      </div>
      <p className="text-xs font-semibold text-slate-400">{t("costing.rawOnlyHint")}</p>
      <div className="space-y-2">
        {forma.lines.map((item, indeks) => (
          <div key={indeks} className="grid items-end gap-2 rounded-2xl bg-slate-50 p-3 md:grid-cols-[minmax(0,2fr)_110px_130px_90px_110px_44px]">
            <Maydon nom={t("fields.product")}><MahsulotQidiruvi value={item.modificationId} nom={item.nom} onChange={(modificationId, nom) => qator(indeks, { modificationId, nom })} /></Maydon>
            <Maydon nom={t("fields.quantity")}><input type="number" min="0" step="any" value={item.quantity} onChange={(event) => qator(indeks, { quantity: event.target.value })} className={inputKlass} /></Maydon>
            <Maydon nom={t("fields.price")}><input type="number" min="0" step="any" value={item.price} onChange={(event) => qator(indeks, { price: event.target.value })} className={inputKlass} /></Maydon>
            <Maydon nom={t("fields.currency")}>
              <select value={item.currency} onChange={(event) => qator(indeks, { currency: event.target.value as Qator["currency"] })} className={inputKlass}>
                <option value="UZS">UZS</option>
                <option value="USD">USD</option>
              </select>
            </Maydon>
            <Maydon nom={t("fields.costingRate")}><input type="number" min="0" step="any" disabled={item.currency !== "USD"} value={item.costingRate} onChange={(event) => qator(indeks, { costingRate: event.target.value })} className={inputKlass} /></Maydon>
            <QatorOchirish onClick={() => ozgar({ lines: forma.lines.filter((_, i) => i !== indeks) })} />
          </div>
        ))}
        <QatorQoshish matn={t("costing.addLine")} onClick={() => ozgar({ lines: [...forma.lines, { modificationId: "", quantity: "", price: "", currency: "UZS", costingRate: "" }] })} />
      </div>
      <Maydon nom={t("fields.note")}><textarea value={forma.note} rows={2} onChange={(event) => ozgar({ note: event.target.value })} className={`${inputKlass} h-auto py-2`} /></Maydon>
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
  return (
    <Oyna keng sarlavha={karta ? qatorNomi(karta) : t("loading")} belgi={<Holat status={karta?.status} />} onYopish={onYopish} pastki={karta && <>
      {qoralama && <button type="button" disabled={amal.band} onClick={() => void amal.bajar(async () => { await ishlabChiqarishApi.kalkulyatsiya.ochirish(id); onOzgardi(); onYopish(); })} className={tugmaXavfli}>{t("actions.delete")}</button>}
      {qoralama && <button type="button" onClick={() => onTahrir(karta)} className={tugmaIkkinchi}>{t("actions.edit")}</button>}
      {karta.status === "ACTIVE" && <button type="button" disabled={amal.band} onClick={() => bajarish(() => ishlabChiqarishApi.kalkulyatsiya.arxivlash(id))} className={tugmaIkkinchi}><Archive size={15} />{t("actions.archive")}</button>}
      {!qoralama && <button type="button" disabled={amal.band} onClick={() => void amal.bajar(async () => { const yangi = await ishlabChiqarishApi.kalkulyatsiya.yangiVersiya(id); onOzgardi(); onOchish(yangi.id); })} className={tugmaIkkinchi}><Copy size={15} />{t("actions.newVersion")}</button>}
      {qoralama && <button type="button" disabled={amal.band} onClick={() => { if (!karta.validFrom) return amal.setXato(t("errors.validFrom")); bajarish(() => ishlabChiqarishApi.kalkulyatsiya.faollashtirish(id)); }} className={tugmaAsosiy}><CheckCircle2 size={16} />{t("actions.activate")}</button>}
    </>}>
      <XatoQutisi matn={hujjat.xato || amal.xato} />
      {!karta ? <Yuklanmoqda /> : <>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-xs font-bold text-slate-400">{t("fields.validFrom")}</dt><dd className="font-black text-slate-800">{kunMatni(karta.validFrom ?? undefined) || "—"}</dd></div>
          <div><dt className="text-xs font-bold text-slate-400">{t("fields.normalScrapPercent")}</dt><dd className="font-black text-slate-800">{miqdorMatni(karta.normalScrapPercent)}</dd></div>
          <div><dt className="text-xs font-bold text-slate-400">{t("fields.total")}</dt><dd className="font-black text-slate-800">{karta.total != null ? taqsimotSummasi(karta.total, "UZS") : "—"}</dd></div>
        </dl>
        <Jadval
          ustunlar={[
            { nom: t("fields.product"), katak: (qator) => qatorNomi(qator) },
            { nom: t("fields.quantity"), ong: true, katak: (qator) => miqdorMatni(qator.quantity) },
            { nom: t("fields.price"), ong: true, katak: (qator) => `${taqsimotSummasi(qator.price, qator.currency)}${qator.currency === "USD" && qator.costingRate ? ` · ${miqdorMatni(qator.costingRate)}` : ""}` },
            { nom: t("fields.amount"), ong: true, katak: (qator) => (qator.amount != null ? taqsimotSummasi(qator.amount, "UZS") : "—") },
          ]}
          qatorlar={karta.lines ?? []}
          kalit={(qator, indeks) => qator.id ?? String(indeks)}
          bosh={t("empty.lines")}
        />
      </>}
    </Oyna>
  );
}
