import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ClipboardCheck, PackageOpen, Plus, RefreshCw, Rocket } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ishlabChiqarishApi } from "@/api/ishlabChiqarishApi";
import { kunMatni } from "@/lib/hujjatSanasi";
import { miqdorMatni, qatorNomi, sonMaydoni, tozaTana } from "@/lib/ishlabChiqarish";
import type { Buyurtma, BuyurtmaTanasi, Mavjudlik } from "@/types/ishlabChiqarish";
import { HolatFiltri, Holat, Jadval, MahsulotQidiruvi, Maydon, Ogohlantirish, OmborTanlash, Oyna, Sahifa, XatoQutisi, Yuklanmoqda, inputKlass, tugmaAsosiy, tugmaIkkinchi, tugmaXavfli, type Ustun } from "./umumiy";
import { useAmal, useMalumot, useOmborlar } from "./hooklar";

const TUGAGAN = ["DRAFT", "COMPLETED", "CLOSED", "CANCELLED"];

export default function Buyurtmalar() {
  const { t } = useTranslation("ishlab_chiqarish");
  const [status, setStatus] = useState("");
  const royxat = useMalumot(() => ishlabChiqarishApi.buyurtmalar.royxat({ status }), status);
  const [ochiq, setOchiq] = useState<string | null>(null);
  const [forma, setForma] = useState<{ hujjat?: Buyurtma } | null>(null);
  const ustunlar: Ustun<Buyurtma>[] = [
    { nom: t("fields.document"), katak: (hujjat) => <span className="font-black text-slate-900">{hujjat.docNumber ?? "—"}</span> },
    { nom: t("fields.product"), katak: (hujjat) => qatorNomi(hujjat) },
    { nom: t("fields.quantity"), ong: true, katak: (hujjat) => miqdorMatni(hujjat.quantity) },
    { nom: t("fields.produced"), ong: true, katak: (hujjat) => miqdorMatni(hujjat.produced ?? 0) },
    { nom: t("fields.dueDate"), katak: (hujjat) => kunMatni(hujjat.dueDate ?? undefined) || "—" },
    { nom: t("fields.status"), katak: (hujjat) => <Holat status={hujjat.status} /> },
  ];
  return (
    <Sahifa
      sarlavha={t("orders.title")}
      izoh={t("orders.subtitle")}
      amal={<>
        <HolatFiltri qiymat={status} onChange={setStatus} holatlar={["DRAFT", "RELEASED", "COMPLETED", "CLOSED", "CANCELLED"]} />
        <button type="button" onClick={() => setForma({})} className={tugmaAsosiy}><Plus size={16} />{t("orders.create")}</button>
      </>}
    >
      <XatoQutisi matn={royxat.xato} />
      {royxat.yuklanmoqda && !royxat.malumot ? <Yuklanmoqda /> : <Jadval ustunlar={ustunlar} qatorlar={royxat.malumot ?? []} kalit={(hujjat) => hujjat.id} onBos={(hujjat) => setOchiq(hujjat.id)} bosh={t("empty.orders")} />}
      {ochiq && <BuyurtmaKorish id={ochiq} onYopish={() => setOchiq(null)} onOzgardi={royxat.qayta} onTahrir={(hujjat) => { setOchiq(null); setForma({ hujjat }); }} />}
      {forma && <BuyurtmaOynasi hujjat={forma.hujjat} onYopish={() => setForma(null)} onSaqlandi={(id) => { setForma(null); royxat.qayta(); setOchiq(id); }} />}
    </Sahifa>
  );
}

function BuyurtmaOynasi({ hujjat, onYopish, onSaqlandi }: { hujjat?: Buyurtma; onYopish: () => void; onSaqlandi: (id: string) => void }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const omborlar = useOmborlar();
  const amal = useAmal();
  const [mahsulot, setMahsulot] = useState({ id: hujjat?.modificationId ?? "", nom: hujjat ? qatorNomi(hujjat) : "" });
  const [quantity, setQuantity] = useState(hujjat?.quantity != null ? String(hujjat.quantity) : "");
  const [sourceWarehouseId, setSource] = useState(hujjat?.sourceWarehouseId ?? "");
  const [destWarehouseId, setDest] = useState(hujjat?.destWarehouseId ?? "");
  const [recipeId, setRecipeId] = useState(hujjat?.recipeId ?? "");
  const [dueDate, setDueDate] = useState(hujjat?.dueDate?.slice(0, 10) ?? "");
  const [note, setNote] = useState(hujjat?.note ?? "");
  const retseptlar = useMalumot(() => ishlabChiqarishApi.retseptlar.royxat({ status: "ACTIVE", modificationId: mahsulot.id || undefined }), mahsulot.id);

  function saqlash() {
    const miqdor = sonMaydoni(quantity);
    if (!mahsulot.id) return amal.setXato(t("errors.product"));
    if (!(miqdor && miqdor > 0)) return amal.setXato(t("errors.lineQuantity"));
    if (!sourceWarehouseId || !destWarehouseId) return amal.setXato(t("errors.warehouses"));
    const tana: BuyurtmaTanasi = tozaTana({ modificationId: mahsulot.id, quantity: miqdor, sourceWarehouseId, destWarehouseId, recipeId, dueDate, note: note.trim() });
    void amal.bajar(async () => {
      const saqlangan = hujjat ? await ishlabChiqarishApi.buyurtmalar.yangilash(hujjat.id, tana) : await ishlabChiqarishApi.buyurtmalar.yaratish(tana);
      onSaqlandi(saqlangan.id);
    });
  }

  return (
    <Oyna sarlavha={t(hujjat ? "orders.edit" : "orders.create")} onYopish={onYopish} pastki={<>
      <button type="button" onClick={onYopish} className={tugmaIkkinchi}>{t("actions.cancel")}</button>
      <button type="button" disabled={amal.band} onClick={saqlash} className={tugmaAsosiy}>{t("actions.save")}</button>
    </>}>
      <XatoQutisi matn={amal.xato} />
      <Maydon nom={t("fields.product")}><MahsulotQidiruvi value={mahsulot.id} nom={mahsulot.nom} onChange={(id, nom) => { setMahsulot({ id, nom }); setRecipeId(""); }} /></Maydon>
      <div className="grid gap-3 sm:grid-cols-2">
        <Maydon nom={t("fields.quantity")}><input type="number" min="0" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} className={inputKlass} /></Maydon>
        <Maydon nom={t("fields.dueDate")}><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className={inputKlass} /></Maydon>
        <Maydon nom={t("fields.sourceWarehouse")}><OmborTanlash value={sourceWarehouseId} omborlar={omborlar} onChange={setSource} /></Maydon>
        <Maydon nom={t("fields.destWarehouse")}><OmborTanlash value={destWarehouseId} omborlar={omborlar} onChange={setDest} /></Maydon>
      </div>
      <Maydon nom={t("fields.recipe")} izoh={t("orders.recipeHint")}>
        <select value={recipeId} onChange={(event) => setRecipeId(event.target.value)} className={inputKlass}>
          <option value="">{t("orders.recipeAuto")}</option>
          {(retseptlar.malumot ?? []).map((retsept) => <option key={retsept.id} value={retsept.id}>{qatorNomi(retsept)}{retsept.version ? ` · v${retsept.version}` : ""}</option>)}
        </select>
      </Maydon>
      <Maydon nom={t("fields.note")}><textarea value={note} rows={2} onChange={(event) => setNote(event.target.value)} className={`${inputKlass} h-auto py-2`} /></Maydon>
    </Oyna>
  );
}

function BuyurtmaKorish({ id, onYopish, onOzgardi, onTahrir }: { id: string; onYopish: () => void; onOzgardi: () => void; onTahrir: (hujjat: Buyurtma) => void }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const navigate = useNavigate();
  const hujjat = useMalumot(() => ishlabChiqarishApi.buyurtmalar.olish(id), id);
  const amal = useAmal();
  const [mavjudlik, setMavjudlik] = useState<Mavjudlik | null>(null);
  const [yakun, setYakun] = useState(false);
  const [sabab, setSabab] = useState("");
  const buyurtma = hujjat.malumot;
  const status = buyurtma?.status ?? "";
  const qoralama = status === "DRAFT";
  const ishda = Boolean(buyurtma) && !TUGAGAN.includes(status);
  const qatorlar = mavjudlik?.items ?? buyurtma?.requirements ?? [];
  const bajarish = (ish: () => Promise<unknown>) => void amal.bajar(async () => { await ish(); hujjat.qayta(); onOzgardi(); });

  function yakunlash() {
    void amal.bajar(async () => {
      await ishlabChiqarishApi.buyurtmalar.yakunlash(id, sabab.trim() || undefined);
      setYakun(false);
      hujjat.qayta();
      onOzgardi();
    });
  }

  return (
    <Oyna keng sarlavha={buyurtma?.docNumber ?? t("loading")} belgi={<Holat status={status} />} onYopish={onYopish} pastki={buyurtma && <>
      {(qoralama || status === "CANCELLED") && <button type="button" disabled={amal.band} onClick={() => void amal.bajar(async () => { await ishlabChiqarishApi.buyurtmalar.ochirish(id); onOzgardi(); onYopish(); })} className={tugmaXavfli}>{t("actions.delete")}</button>}
      {qoralama && <button type="button" onClick={() => onTahrir(buyurtma)} className={tugmaIkkinchi}>{t("actions.edit")}</button>}
      {(qoralama || ishda) && <button type="button" disabled={amal.band} onClick={() => bajarish(() => ishlabChiqarishApi.buyurtmalar.bekorQilish(id))} className={tugmaXavfli}>{t("actions.cancelDocument")}</button>}
      {ishda && <button type="button" disabled={amal.band} onClick={() => void amal.bajar(async () => setMavjudlik(await ishlabChiqarishApi.buyurtmalar.mavjudlik(id)))} className={tugmaIkkinchi}><RefreshCw size={15} />{t("orders.checkAvailability")}</button>}
      {ishda && <button type="button" disabled={amal.band} onClick={() => void amal.bajar(async () => { const berish = await ishlabChiqarishApi.berishlar.buyurtmadan(id); navigate(`/ishlab-chiqarish/sexga-berish?hujjat=${berish.id}`); })} className={tugmaIkkinchi}><PackageOpen size={15} />{t("orders.issue")}</button>}
      {ishda && <button type="button" disabled={amal.band} onClick={() => setYakun(true)} className={tugmaAsosiy}><CheckCircle2 size={16} />{t("orders.complete")}</button>}
      {status === "COMPLETED" && <button type="button" disabled={amal.band} onClick={() => bajarish(() => ishlabChiqarishApi.buyurtmalar.yopish(id))} className={tugmaAsosiy}><ClipboardCheck size={16} />{t("orders.close")}</button>}
      {qoralama && <button type="button" disabled={amal.band} onClick={() => void amal.bajar(async () => { const javob = await ishlabChiqarishApi.buyurtmalar.chiqarish(id); setMavjudlik(javob.availability); hujjat.qayta(); onOzgardi(); })} className={tugmaAsosiy}><Rocket size={16} />{t("orders.release")}</button>}
    </>}>
      <XatoQutisi matn={hujjat.xato || amal.xato} />
      {!buyurtma ? <Yuklanmoqda /> : <>
        <dl className="grid gap-3 text-sm sm:grid-cols-4">
          <div className="sm:col-span-2"><dt className="text-xs font-bold text-slate-400">{t("fields.product")}</dt><dd className="font-black text-slate-800">{qatorNomi(buyurtma)}</dd></div>
          <div><dt className="text-xs font-bold text-slate-400">{t("fields.quantity")}</dt><dd className="font-black text-slate-800">{miqdorMatni(buyurtma.quantity)}</dd></div>
          <div><dt className="text-xs font-bold text-slate-400">{t("fields.produced")}</dt><dd className="font-black text-slate-800">{miqdorMatni(buyurtma.produced ?? 0)}</dd></div>
        </dl>
        {buyurtma.completionSuggested && ishda && <Ogohlantirish>{t("orders.completionSuggested")}</Ogohlantirish>}
        {mavjudlik?.hasShortage && <Ogohlantirish>{t("orders.shortageWarning")}</Ogohlantirish>}
        <Jadval
          ustunlar={[
            { nom: t("fields.product"), katak: (qator) => qatorNomi(qator) },
            { nom: t("fields.required"), ong: true, katak: (qator) => miqdorMatni(qator.required) },
            { nom: t("fields.issued"), ong: true, katak: (qator) => miqdorMatni(qator.issued) },
            { nom: t("fields.available"), ong: true, katak: (qator) => miqdorMatni(qator.available) },
            { nom: t("fields.shortage"), ong: true, katak: (qator) => <span className={Number(qator.shortage ?? 0) > 0 ? "font-black text-red-600" : ""}>{miqdorMatni(qator.shortage)}</span> },
          ]}
          qatorlar={qatorlar}
          kalit={(qator, indeks) => qator.modificationId ?? String(indeks)}
          bosh={t("empty.requirements")}
        />
        {yakun && (
          <div className="space-y-2 rounded-2xl bg-slate-50 p-4">
            <Maydon nom={t("orders.completeReason")} izoh={t("orders.completeReasonHint")}><textarea value={sabab} rows={2} onChange={(event) => setSabab(event.target.value)} className={`${inputKlass} h-auto py-2`} /></Maydon>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setYakun(false)} className={tugmaIkkinchi}>{t("actions.cancel")}</button>
              <button type="button" disabled={amal.band} onClick={yakunlash} className={tugmaAsosiy}>{t("orders.complete")}</button>
            </div>
          </div>
        )}
      </>}
    </Oyna>
  );
}
