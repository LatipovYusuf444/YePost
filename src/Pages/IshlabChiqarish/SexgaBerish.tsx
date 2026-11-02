import { useEffect, useState, type KeyboardEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, Plus, ScanLine, Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import ModalTablari from "@/Components/common/ModalTablari";
import { ishlabChiqarishApi } from "@/api/ishlabChiqarishApi";
import { kunMatni } from "@/lib/hujjatSanasi";
import { hujjatRaqami, miqdorMatni, qatorNomi, raqamXaritasi, seriyaYaroqlimi, sonMaydoni, tozaTana } from "@/lib/ishlabChiqarish";
import { foydalanuvchiKursniOzgartiraOladimi } from "@/lib/roles";
import { useAuthProfileStore } from "@/store/authProfileStore";
import type { BerishTanasi, SexdanQaytarish, SexgaBerish as Berish } from "@/types/ishlabChiqarish";
import { Holat, Jadval, MahsulotQidiruvi, Maydon, OmborTanlash, Oyna, QatorOchirish, QatorQoshish, Sahifa, XatoQutisi, Yuklanmoqda, inputKlass, tugmaAsosiy, tugmaIkkinchi, tugmaXavfli, type Ustun } from "./umumiy";
import { useAmal, useMalumot, useOmborlar } from "./hooklar";

// Oynadagi qator: rulon — batchId va seriya bilan (miqdor butun og'irligi), oddiy qator — mahsulot va miqdor.
type Qator = { id?: string; modificationId: string; nom: string; quantity: string; batchId: string; serial: string; ogirlik: string };

export default function SexgaBerish() {
  const { t } = useTranslation("ishlab_chiqarish");
  const [bolim, setBolim] = useState("berishlar");
  return (
    <Sahifa sarlavha={t("issues.title")} izoh={t("issues.subtitle")}>
      <ModalTablari tablar={[{ id: "berishlar", nom: t("issues.tabIssues") }, { id: "qaytarishlar", nom: t("issues.tabReturns") }]} faol={bolim} onChange={setBolim} />
      {bolim === "berishlar" ? <Berishlar /> : <Qaytarishlar />}
    </Sahifa>
  );
}

function Berishlar() {
  const { t } = useTranslation("ishlab_chiqarish");
  const [parametrlar, setParametrlar] = useSearchParams();
  const royxat = useMalumot(() => ishlabChiqarishApi.berishlar.royxat(), "issues");
  const buyurtmalar = useMalumot(() => ishlabChiqarishApi.buyurtmalar.royxat(), "orders");
  const buyurtmaRaqamlari = raqamXaritasi(buyurtmalar.malumot);
  const [ochiq, setOchiq] = useState<{ id?: string } | null>(() => (parametrlar.get("hujjat") ? { id: parametrlar.get("hujjat") ?? undefined } : null));
  const [buyurtmaOynasi, setBuyurtmaOynasi] = useState(false);
  useEffect(() => {
    if (parametrlar.get("hujjat")) setParametrlar({}, { replace: true });
  }, [parametrlar, setParametrlar]);
  const ustunlar: Ustun<Berish>[] = [
    { nom: t("fields.document"), katak: (hujjat) => <span className="font-black text-slate-900">{hujjatRaqami(hujjat) || "—"}</span> },
    { nom: t("fields.order"), katak: (hujjat) => buyurtmaRaqamlari.get(hujjat.orderId ?? "") || "—" },
    { nom: t("fields.date"), katak: (hujjat) => kunMatni(hujjat.date ?? undefined) || "—" },
    { nom: t("fields.lines"), ong: true, katak: (hujjat) => hujjat.lines?.length ?? "—" },
    { nom: t("fields.status"), katak: (hujjat) => <Holat status={hujjat.status} /> },
  ];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={() => setBuyurtmaOynasi(true)} className={tugmaIkkinchi}>{t("issues.fromOrder")}</button>
        <button type="button" onClick={() => setOchiq({})} className={tugmaAsosiy}><Plus size={16} />{t("issues.create")}</button>
      </div>
      <XatoQutisi matn={royxat.xato} />
      {royxat.yuklanmoqda && !royxat.malumot ? <Yuklanmoqda /> : <Jadval ustunlar={ustunlar} qatorlar={royxat.malumot ?? []} kalit={(hujjat) => hujjat.id} onBos={(hujjat) => setOchiq({ id: hujjat.id })} bosh={t("empty.issues")} />}
      {ochiq && <BerishOynasi id={ochiq.id} onYopish={() => setOchiq(null)} onOzgardi={royxat.qayta} />}
      {buyurtmaOynasi && <BuyurtmaTanlash onYopish={() => setBuyurtmaOynasi(false)} onYaratildi={(hujjat) => { setBuyurtmaOynasi(false); royxat.qayta(); setOchiq({ id: hujjat.id }); }} />}
    </div>
  );
}

function BuyurtmaTanlash({ onYopish, onYaratildi }: { onYopish: () => void; onYaratildi: (hujjat: Berish) => void }) {
  const { t } = useTranslation("ishlab_chiqarish");
  // Sexga bir necha marta berish mumkin: birinchi berishdan keyin buyurtma IN_PROGRESS bo'ladi.
  const buyurtmalar = useMalumot(async () => (await ishlabChiqarishApi.buyurtmalar.royxat()).filter((buyurtma) => buyurtma.status === "RELEASED" || buyurtma.status === "IN_PROGRESS"), "ishdagi");
  const amal = useAmal();
  return (
    <Oyna sarlavha={t("issues.fromOrder")} onYopish={onYopish}>
      <XatoQutisi matn={buyurtmalar.xato || amal.xato} />
      {!buyurtmalar.malumot ? <Yuklanmoqda /> : (
        <Jadval
          ustunlar={[{ nom: t("fields.document"), katak: (qator) => hujjatRaqami(qator) || "—" }, { nom: t("fields.product"), katak: (qator) => qatorNomi(qator) }, { nom: t("fields.quantity"), ong: true, katak: (qator) => miqdorMatni(qator.quantity) }]}
          qatorlar={buyurtmalar.malumot}
          kalit={(qator) => qator.id}
          onBos={(qator) => void amal.bajar(async () => onYaratildi(await ishlabChiqarishApi.berishlar.buyurtmadan(qator.id)))}
          bosh={t("empty.orders")}
        />
      )}
    </Oyna>
  );
}

function BerishOynasi({ id: boshlangichId, onYopish, onOzgardi }: { id?: string; onYopish: () => void; onOzgardi: () => void }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const omborlar = useOmborlar();
  const profil = useAuthProfileStore((holat) => holat.profil);
  const amal = useAmal();
  const [id, setId] = useState(boshlangichId);
  const [hujjat, setHujjat] = useState<Berish | null>(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(Boolean(boshlangichId));
  const [qatorlar, setQatorlar] = useState<Qator[]>([]);
  const [sourceWarehouseId, setSource] = useState("");
  const [wipWarehouseId, setWip] = useState("");
  const [consumeOnIssue, setConsumeOnIssue] = useState(false);
  const [note, setNote] = useState("");
  const [skan, setSkan] = useState("");
  const [skanXato, setSkanXato] = useState("");

  function hujjatniQollash(yangi: Berish) {
    setHujjat(yangi);
    setId(yangi.id);
    setSource(yangi.sourceWarehouseId ?? "");
    setWip(yangi.wipWarehouseId ?? "");
    setConsumeOnIssue(Boolean(yangi.consumeOnIssue));
    setNote(yangi.note ?? "");
    setQatorlar((yangi.lines ?? []).map((qator) => ({ id: qator.id, modificationId: qator.modificationId ?? "", nom: qatorNomi(qator), quantity: qator.quantity != null ? String(qator.quantity) : "", batchId: qator.batchId ?? "", serial: qator.serial ?? "", ogirlik: qator.batchId && qator.quantity != null ? String(qator.quantity) : "" })));
  }

  useEffect(() => {
    if (!boshlangichId) return;
    let faol = true;
    ishlabChiqarishApi.berishlar.olish(boshlangichId)
      .then((yangi) => { if (faol) hujjatniQollash(yangi); })
      .catch((error) => { if (faol) amal.setXato(error instanceof Error ? error.message : String(error)); })
      .finally(() => { if (faol) setYuklanmoqda(false); });
    return () => { faol = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boshlangichId]);

  const qoralama = !hujjat || hujjat.status === "DRAFT";
  const ozgar = (indeks: number, qism: Partial<Qator>) => setQatorlar((joriy) => joriy.map((qator, i) => (i === indeks ? { ...qator, ...qism } : qator)));

  // Skaner: seriya + Enter → rulon qatori (miqdor kerak emas, butun og'irligi beriladi).
  async function rulonQoshish() {
    const seriya = skan.trim();
    if (!seriya) return;
    setSkanXato("");
    if (!seriyaYaroqlimi(seriya)) return setSkanXato(t("errors.serialFormat"));
    if (qatorlar.some((qator) => qator.serial === seriya)) return setSkanXato(t("errors.serialDuplicate", { seriya }));
    const rulon = await amal.bajar(() => ishlabChiqarishApi.rulonlar.seriyaBoyicha(seriya));
    if (!rulon) return;
    if (sourceWarehouseId && rulon.warehouseId && rulon.warehouseId !== sourceWarehouseId) return setSkanXato(t("errors.rollWarehouse", { seriya }));
    setQatorlar((joriy) => [...joriy, { modificationId: rulon.modificationId ?? "", nom: rulon.productName ?? "—", quantity: "", batchId: rulon.batchId, serial: rulon.serial ?? seriya, ogirlik: String(rulon.weightLeft ?? rulon.weight ?? "") }]);
    setSkan("");
  }
  const skanKlavishi = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    void rulonQoshish();
  };

  function tanaYigish(): BerishTanasi | null {
    const lines: BerishTanasi["lines"] = [];
    for (const qator of qatorlar) {
      if (qator.batchId) { lines.push({ batchId: qator.batchId }); continue; }
      const quantity = sonMaydoni(qator.quantity);
      if (!qator.modificationId) { amal.setXato(t("errors.lineProduct")); return null; }
      if (!(quantity && quantity > 0)) { amal.setXato(t("errors.lineQuantity")); return null; }
      lines.push({ modificationId: qator.modificationId, quantity });
    }
    if (lines.length === 0) { amal.setXato(t("errors.noLines")); return null; }
    return tozaTana({ orderId: hujjat?.orderId ?? undefined, sourceWarehouseId, wipWarehouseId, consumeOnIssue, note: note.trim(), lines });
  }

  async function saqlangan() {
    const tana = tanaYigish();
    if (!tana) return null;
    const yangi = id ? await ishlabChiqarishApi.berishlar.yangilash(id, tana) : await ishlabChiqarishApi.berishlar.yaratish(tana);
    hujjatniQollash(yangi);
    onOzgardi();
    return yangi;
  }

  const saqlash = () => void amal.bajar(saqlangan);
  const tasdiqlash = () => void amal.bajar(async () => {
    const yangi = await saqlangan();
    if (!yangi) return;
    const tasdiq = await ishlabChiqarishApi.berishlar.tasdiqlash(yangi.id);
    hujjatniQollash(tasdiq);
    onOzgardi();
  });
  const bekorQilish = () => void amal.bajar(async () => {
    if (!id) return;
    const yangi = await ishlabChiqarishApi.berishlar.bekorQilish(id);
    hujjatniQollash(yangi);
    onOzgardi();
  });
  const ochirish = () => void amal.bajar(async () => {
    if (!id) return;
    await ishlabChiqarishApi.berishlar.ochirish(id);
    onOzgardi();
    onYopish();
  });

  return (
    <Oyna keng sarlavha={hujjatRaqami(hujjat) || t("issues.create")} belgi={<Holat status={hujjat?.status} />} onYopish={onYopish} pastki={<>
      {qoralama && id && <button type="button" disabled={amal.band} onClick={ochirish} className={tugmaXavfli}>{t("actions.delete")}</button>}
      {hujjat?.status === "CONFIRMED" && foydalanuvchiKursniOzgartiraOladimi(profil) && <button type="button" disabled={amal.band} onClick={bekorQilish} className={tugmaXavfli}>{t("actions.cancelDocument")}</button>}
      {qoralama && <button type="button" disabled={amal.band} onClick={saqlash} className={tugmaIkkinchi}>{t("actions.save")}</button>}
      {qoralama && <button type="button" disabled={amal.band} onClick={tasdiqlash} className={tugmaAsosiy}><CheckCircle2 size={16} />{t("actions.confirm")}</button>}
    </>}>
      <XatoQutisi matn={amal.xato} />
      {yuklanmoqda ? <Yuklanmoqda /> : <>
        <fieldset disabled={!qoralama} className="m-0 grid gap-3 border-0 p-0 sm:grid-cols-2">
          <Maydon nom={t("fields.sourceWarehouse")}><OmborTanlash value={sourceWarehouseId} omborlar={omborlar} disabled={!qoralama} onChange={setSource} /></Maydon>
          <Maydon nom={t("fields.wipWarehouse")}><OmborTanlash sexMi value={wipWarehouseId} omborlar={omborlar} disabled={!qoralama} onChange={setWip} /></Maydon>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-600 sm:col-span-2"><input type="checkbox" checked={consumeOnIssue} onChange={(event) => setConsumeOnIssue(event.target.checked)} className="h-5 w-5 accent-orange-500" />{t("fields.consumeOnIssue")}</label>
        </fieldset>
        {qoralama && (
          <div className="rounded-2xl bg-orange-50/60 p-3">
            <Maydon nom={t("issues.scan")} izoh={t("issues.scanHint")}>
              <div className="relative">
                <ScanLine size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500" />
                <input value={skan} autoComplete="off" onChange={(event) => { setSkan(event.target.value); setSkanXato(""); }} onKeyDown={skanKlavishi} placeholder="J-1031-01" className={`${inputKlass} pl-9`} />
              </div>
            </Maydon>
            {skanXato && <p role="alert" className="mt-1 text-xs font-bold text-red-600">{skanXato}</p>}
          </div>
        )}
        <div className="space-y-2">
          {qatorlar.map((qator, indeks) => (
            <div key={qator.id ?? `${qator.batchId}-${indeks}`} className="grid items-end gap-2 rounded-2xl bg-slate-50 p-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_44px]">
              {qator.batchId ? <>
                <p className="min-w-0 self-center text-sm font-black text-slate-800"><span className="block truncate">{qator.nom}</span><span className="text-xs font-bold text-orange-600">{qator.serial}</span></p>
                <p className="self-center text-sm font-black tabular-nums text-slate-700">{miqdorMatni(qator.ogirlik)} {t("rolls.kg")}</p>
              </> : <>
                <Maydon nom={t("fields.product")}><MahsulotQidiruvi value={qator.modificationId} nom={qator.nom} disabled={!qoralama} onChange={(modificationId, nom) => ozgar(indeks, { modificationId, nom })} /></Maydon>
                <Maydon nom={t("fields.quantity")}><input type="number" min="0" step="any" disabled={!qoralama} value={qator.quantity} onChange={(event) => ozgar(indeks, { quantity: event.target.value })} className={inputKlass} /></Maydon>
              </>}
              {qoralama ? <QatorOchirish onClick={() => setQatorlar((joriy) => joriy.filter((_, i) => i !== indeks))} /> : <span />}
            </div>
          ))}
          {qoralama && <QatorQoshish matn={t("issues.addLine")} onClick={() => setQatorlar((joriy) => [...joriy, { modificationId: "", nom: "", quantity: "", batchId: "", serial: "", ogirlik: "" }])} />}
        </div>
        <Maydon nom={t("fields.note")}><textarea value={note} disabled={!qoralama} rows={2} onChange={(event) => setNote(event.target.value)} className={`${inputKlass} h-auto py-2`} /></Maydon>
      </>}
    </Oyna>
  );
}

function Qaytarishlar() {
  const { t } = useTranslation("ishlab_chiqarish");
  const royxat = useMalumot(() => ishlabChiqarishApi.qaytarishlar.royxat(), "wip-returns");
  const berishlar = useMalumot(() => ishlabChiqarishApi.berishlar.royxat(), "issues");
  const berishRaqamlari = raqamXaritasi(berishlar.malumot);
  const amal = useAmal();
  const [yaratish, setYaratish] = useState(false);
  const amalBajarish = (ish: () => Promise<unknown>) => void amal.bajar(async () => { await ish(); royxat.qayta(); });
  const ustunlar: Ustun<SexdanQaytarish>[] = [
    { nom: t("fields.document"), katak: (hujjat) => <span className="font-black text-slate-900">{hujjatRaqami(hujjat) || "—"}</span> },
    { nom: t("fields.issue"), katak: (hujjat) => berishRaqamlari.get(hujjat.issueId ?? "") || "—" },
    { nom: t("fields.date"), katak: (hujjat) => kunMatni(hujjat.date ?? undefined) || "—" },
    { nom: t("fields.status"), katak: (hujjat) => <Holat status={hujjat.status} /> },
    {
      nom: t("fields.actions"),
      katak: (hujjat) => (
        <span className="flex flex-wrap gap-2">
          {hujjat.status === "DRAFT" && <button type="button" disabled={amal.band} onClick={() => amalBajarish(() => ishlabChiqarishApi.qaytarishlar.tasdiqlash(hujjat.id))} className="text-xs font-black text-orange-600 hover:underline">{t("actions.confirm")}</button>}
          {hujjat.status !== "CANCELLED" && <button type="button" disabled={amal.band} onClick={() => amalBajarish(() => ishlabChiqarishApi.qaytarishlar.bekorQilish(hujjat.id))} className="text-xs font-black text-red-600 hover:underline">{t("actions.cancelDocument")}</button>}
        </span>
      ),
    },
  ];
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button type="button" onClick={() => setYaratish(true)} className={tugmaAsosiy}><Undo2 size={16} />{t("issues.createReturn")}</button></div>
      <p className="text-xs font-semibold text-slate-400">{t("issues.returnHint")}</p>
      <XatoQutisi matn={royxat.xato || amal.xato} />
      {royxat.yuklanmoqda && !royxat.malumot ? <Yuklanmoqda /> : <Jadval ustunlar={ustunlar} qatorlar={royxat.malumot ?? []} kalit={(hujjat) => hujjat.id} bosh={t("empty.returns")} />}
      {yaratish && <QaytarishOynasi onYopish={() => setYaratish(false)} onSaqlandi={() => { setYaratish(false); royxat.qayta(); }} />}
    </div>
  );
}

function QaytarishOynasi({ onYopish, onSaqlandi }: { onYopish: () => void; onSaqlandi: () => void }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const berishlar = useMalumot(() => ishlabChiqarishApi.berishlar.royxat({ status: "CONFIRMED" }), "confirmed-issues");
  const amal = useAmal();
  const [issueId, setIssueId] = useState("");
  const hujjat = useMalumot(() => (issueId ? ishlabChiqarishApi.berishlar.olish(issueId) : Promise.resolve(null)), issueId);
  // Rulon faqat butunligicha qaytadi: belgilanadi, miqdor yuborilmaydi. Oddiy qatorda miqdor yoziladi.
  const [tanlov, setTanlov] = useState<Record<string, { belgi: boolean; miqdor: string }>>({});
  const qatorlar = (hujjat.malumot?.lines ?? []).filter((qator) => qator.id);

  function saqlash() {
    const lines: Array<{ issueLineId: string; quantity?: number }> = [];
    for (const qator of qatorlar) {
      const holat = tanlov[qator.id as string];
      if (!holat?.belgi) continue;
      if (qator.batchId) { lines.push({ issueLineId: qator.id as string }); continue; }
      const quantity = sonMaydoni(holat.miqdor);
      if (!(quantity && quantity > 0)) return amal.setXato(t("errors.lineQuantity"));
      lines.push({ issueLineId: qator.id as string, quantity });
    }
    if (lines.length === 0) return amal.setXato(t("errors.noLines"));
    void amal.bajar(async () => { await ishlabChiqarishApi.qaytarishlar.yaratish({ issueId, lines }); onSaqlandi(); });
  }

  return (
    <Oyna sarlavha={t("issues.createReturn")} onYopish={onYopish} pastki={<>
      <button type="button" onClick={onYopish} className={tugmaIkkinchi}>{t("actions.cancel")}</button>
      <button type="button" disabled={amal.band || !issueId} onClick={saqlash} className={tugmaAsosiy}>{t("actions.save")}</button>
    </>}>
      <XatoQutisi matn={berishlar.xato || hujjat.xato || amal.xato} />
      <Maydon nom={t("fields.issue")}>
        <select value={issueId} onChange={(event) => { setIssueId(event.target.value); setTanlov({}); }} className={inputKlass}>
          <option value="">{t("fields.selectIssue")}</option>
          {(berishlar.malumot ?? []).map((item) => <option key={item.id} value={item.id}>{hujjatRaqami(item) || "—"}</option>)}
        </select>
      </Maydon>
      {qatorlar.map((qator) => {
        const kalit = qator.id as string;
        const holat = tanlov[kalit] ?? { belgi: false, miqdor: "" };
        return (
          <div key={kalit} className="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 p-3">
            <label className="flex min-w-0 flex-1 items-center gap-2 text-sm font-bold text-slate-700">
              <input type="checkbox" checked={holat.belgi} onChange={(event) => setTanlov((joriy) => ({ ...joriy, [kalit]: { ...holat, belgi: event.target.checked } }))} className="h-5 w-5 accent-orange-500" />
              <span className="min-w-0 truncate">{qatorNomi(qator)}{qator.serial ? ` · ${qator.serial}` : ""}</span>
            </label>
            {qator.batchId
              ? <span className="text-xs font-bold text-slate-400">{t("issues.wholeRoll")}</span>
              : <input type="number" min="0" step="any" aria-label={t("fields.quantity")} placeholder={miqdorMatni(qator.quantity)} value={holat.miqdor} onChange={(event) => setTanlov((joriy) => ({ ...joriy, [kalit]: { ...holat, belgi: true, miqdor: event.target.value } }))} className={`${inputKlass} w-32`} />}
          </div>
        );
      })}
    </Oyna>
  );
}
