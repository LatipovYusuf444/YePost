import { useState } from "react";
import { CheckCircle2, Plus, Printer, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ishlabChiqarishApi, yorliqniChopEtish } from "@/api/ishlabChiqarishApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { kunMatni } from "@/lib/hujjatSanasi";
import { TOXTASH_SABABLARI, chiqimMiqdori, hisobotMahsuloti, hujjatRaqami, miqdorMatni, qatorNomi, raqamXaritasi, smenaTanasiniYigish, sonMaydoni, type SmenaFormasi } from "@/lib/ishlabChiqarish";
import { foydalanuvchiKursniOzgartiraOladimi } from "@/lib/roles";
import { useAuthProfileStore } from "@/store/authProfileStore";
import type { NavbatQatori, SmenaChiqimi, SmenaHisoboti } from "@/types/ishlabChiqarish";
import { Holat, Jadval, MahsulotQidiruvi, Maydon, Ogohlantirish, OmborTanlash, Oyna, QatorOchirish, QatorQoshish, Sahifa, XatoQutisi, Yuklanmoqda, inputKlass, tugmaAsosiy, tugmaIkkinchi, tugmaXavfli } from "./umumiy";
import { useAmal, useMalumot, useOmborlar } from "./hooklar";

type KirimQatori = SmenaFormasi["inputs"][number] & { nom?: string };
type Forma = Omit<SmenaFormasi, "inputs"> & { sarlavha: string; inputs: KirimQatori[] };

const bosh = (qism: Partial<Forma>): Forma => ({ sarlavha: "", orderId: "", recipeId: "", destWarehouseId: "", shiftEndsAt: "", comment: "", outputs: [{ quantity: "", scrapQuantity: "", serial: "", modificationId: "", role: "" }], inputs: [], downtime: [], ...qism });

export default function Smena() {
  const { t } = useTranslation("ishlab_chiqarish");
  const omborlar = useOmborlar();
  const [warehouseId, setWarehouseId] = useState("");
  const navbat = useMalumot(() => ishlabChiqarishApi.smena.navbat(warehouseId || undefined), warehouseId);
  const hisobotlar = useMalumot(() => ishlabChiqarishApi.smena.royxat(), "reports");
  const buyurtmalar = useMalumot(() => ishlabChiqarishApi.buyurtmalar.royxat(), "orders");
  const buyurtmaRaqamlari = raqamXaritasi(buyurtmalar.malumot);
  const [forma, setForma] = useState<{ id?: string; qiymat: Forma } | null>(null);
  const [ochiq, setOchiq] = useState<string | null>(null);
  const yangilash = () => { navbat.qayta(); hisobotlar.qayta(); };
  return (
    <Sahifa
      sarlavha={t("shift.title")}
      izoh={t("shift.subtitle")}
      amal={<>
        <div className="w-56"><OmborTanlash sexMi value={warehouseId} omborlar={omborlar} ariaLabel={t("fields.wipWarehouse")} onChange={setWarehouseId} /></div>
        <button type="button" onClick={yangilash} aria-label={t("actions.refresh")} className={tugmaIkkinchi}><RefreshCw size={15} /></button>
        <button type="button" onClick={() => setForma({ qiymat: bosh({ sarlavha: t("shift.withoutOrder") }) })} className={tugmaIkkinchi}><Plus size={15} />{t("shift.withoutOrder")}</button>
      </>}
    >
      <XatoQutisi matn={navbat.xato} />
      {navbat.yuklanmoqda && !navbat.malumot ? <Yuklanmoqda /> : (navbat.malumot ?? []).length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-10 text-center text-sm font-bold text-slate-400">{t("empty.queue")}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(navbat.malumot ?? []).map((qator) => <NavbatKartasi key={qator.orderId} qator={qator} onBos={() => setForma({ qiymat: bosh({ orderId: qator.orderId, sarlavha: `${qator.docNumber ?? ""} · ${qator.productName ?? ""}` }) })} />)}
        </div>
      )}
      <h2 className="pt-2 text-sm font-black uppercase tracking-wide text-slate-500">{t("shift.reports")}</h2>
      <XatoQutisi matn={hisobotlar.xato} />
      {hisobotlar.malumot && <Jadval
        ustunlar={[
          { nom: t("fields.document"), katak: (hujjat) => <span className="font-black text-slate-900">{hujjatRaqami(hujjat) || "—"}</span> },
          { nom: t("fields.order"), katak: (hujjat) => buyurtmaRaqamlari.get(hujjat.orderId ?? "") || "—" },
          { nom: t("fields.product"), katak: (hujjat) => qatorNomi(hisobotMahsuloti(hujjat)) },
          { nom: t("fields.shiftEndsAt"), katak: (hujjat) => kunMatni(hujjat.shiftEndsAt ?? undefined) || "—" },
          { nom: t("fields.status"), katak: (hujjat) => <Holat status={hujjat.status} /> },
        ]}
        qatorlar={hisobotlar.malumot}
        kalit={(hujjat) => hujjat.id}
        onBos={(hujjat) => setOchiq(hujjat.id)}
        bosh={t("empty.reports")}
      />}
      {forma && <SmenaOynasi boshlangich={forma} omborlar={omborlar} onYopish={() => setForma(null)} onOzgardi={yangilash} onOchish={(id) => { setForma(null); setOchiq(id); }} />}
      {ochiq && <HisobotKorish id={ochiq} onYopish={() => setOchiq(null)} onOzgardi={yangilash} onTahrir={(hujjat) => { setOchiq(null); setForma({ id: hujjat.id, qiymat: formagaOtkazish(hujjat, t("shift.report")) }); }} />}
    </Sahifa>
  );
}

function NavbatKartasi({ qator, onBos }: { qator: NavbatQatori; onBos: () => void }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const reja = Number(qator.quantity ?? 0);
  const bajarilgan = Math.min(reja > 0 ? (Number(qator.produced ?? 0) / reja) * 100 : 0, 100);
  return (
    <button type="button" onClick={onBos} className="rounded-2xl border border-orange-100 bg-white p-4 text-left shadow-sm transition hover:border-orange-300">
      <span className="flex items-center justify-between gap-2 text-xs font-black text-orange-600"><span>{qator.docNumber}</span>{qator.dueDate && <span className="text-slate-400">{kunMatni(qator.dueDate)}</span>}</span>
      <span className="mt-1 block truncate text-base font-black text-slate-900">{qator.productName}</span>
      <span className="mt-3 block h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-orange-500" style={{ width: `${bajarilgan}%` }} /></span>
      <span className="mt-2 flex justify-between text-xs font-bold text-slate-500"><span>{t("shift.produced", { miqdor: miqdorMatni(qator.produced ?? 0), reja: miqdorMatni(qator.quantity) })}</span><span>{t("shift.remaining", { miqdor: miqdorMatni(qator.remaining) })}</span></span>
    </button>
  );
}

function formagaOtkazish(hujjat: SmenaHisoboti, sarlavha: string): Forma {
  const matn = (qiymat: unknown) => (qiymat === null || qiymat === undefined ? "" : String(qiymat));
  return {
    sarlavha: `${sarlavha} ${hujjat.docNumber ?? ""}`,
    orderId: hujjat.orderId ?? "",
    recipeId: hujjat.recipeId ?? "",
    destWarehouseId: hujjat.destWarehouseId ?? "",
    shiftEndsAt: hujjat.shiftEndsAt ? hujjat.shiftEndsAt.slice(0, 16) : "",
    comment: hujjat.comment ?? "",
    outputs: (hujjat.outputs ?? []).map((qator) => ({ quantity: matn(qator.quantity), scrapQuantity: matn(qator.scrapQuantity), serial: qator.serial ?? "", modificationId: qator.modificationId ?? "", role: qator.role === "WASTE" || qator.role === "MAIN" ? qator.role : "" })),
    inputs: (hujjat.inputs ?? []).map((qator) => ({ modificationId: qator.modificationId, nom: qatorNomi(qator), quantity: matn(qator.quantity), entryMethod: qator.entryMethod === "NORM" ? "NORM" : "ACTUAL", offRecipe: Boolean(qator.offRecipe) })),
    downtime: (hujjat.downtime ?? []).map((qator) => ({ reason: qator.reason, hours: matn(qator.hours), note: qator.note ?? "" })),
  };
}

function SmenaOynasi({ boshlangich, omborlar, onYopish, onOzgardi, onOchish }: { boshlangich: { id?: string; qiymat: Forma }; omborlar: ReturnType<typeof useOmborlar>; onYopish: () => void; onOzgardi: () => void; onOchish: (id: string) => void }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const [forma, setForma] = useState(boshlangich.qiymat);
  // Xato bilan yopilmagan hisobot qoralamada qoladi: keyingi urinish yangi hujjat emas, shu qoralamani yangilaydi.
  const [id, setId] = useState(boshlangich.id);
  const [xatoMatni, setXatoMatni] = useState("");
  const [izohKerak, setIzohKerak] = useState(false);
  const amal = useAmal();
  const buyurtmasiz = !forma.orderId;
  const retseptlar = useMalumot(() => (buyurtmasiz ? ishlabChiqarishApi.retseptlar.royxat({ status: "ACTIVE" }) : Promise.resolve([])), String(buyurtmasiz));
  const ozgar = (qism: Partial<Forma>) => setForma((joriy) => ({ ...joriy, ...qism }));
  const chiqim = (indeks: number, qism: Partial<Forma["outputs"][number]>) => ozgar({ outputs: forma.outputs.map((qator, i) => (i === indeks ? { ...qator, ...qism } : qator)) });
  const kirim = (indeks: number, qism: Partial<KirimQatori>) => ozgar({ inputs: forma.inputs.map((qator, i) => (i === indeks ? { ...qator, ...qism } : qator)) });
  const toxtash = (indeks: number, qism: Partial<Forma["downtime"][number]>) => ozgar({ downtime: forma.downtime.map((qator, i) => (i === indeks ? { ...qator, ...qism } : qator)) });

  async function saqlangan() {
    const natija = smenaTanasiniYigish(forma);
    if ("xato" in natija) throw new Error(t(natija.xato));
    const hujjat = id ? await ishlabChiqarishApi.smena.yangilash(id, natija.tana) : await ishlabChiqarishApi.smena.yaratish(natija.tana);
    setId(hujjat.id);
    return hujjat;
  }
  const qoralamaSaqlash = () => void amal.bajar(async () => { setXatoMatni(""); await saqlangan(); onOzgardi(); onYopish(); });
  // Xato maydon yonida ko'rsatiladi: comment_required — izoh yozib qayta bosiladi, costing_card_missing — hisobot qoralamada qoladi.
  const smenaniYopish = () => {
    setXatoMatni("");
    setIzohKerak(false);
    void amal.bajar(async () => {
      const hujjat = await saqlangan();
      onOzgardi();
      try {
        await ishlabChiqarishApi.smena.tasdiqlash(hujjat.id);
      } catch (error) {
        const kod = (error as { response?: { data?: { code?: unknown; message?: unknown } } }).response?.data;
        if (kod?.code === "errors.production.comment_required" || kod?.message === "errors.production.comment_required") setIzohKerak(true);
        setXatoMatni(getApiErrorMessage(error));
        return;
      }
      onOzgardi();
      onOchish(hujjat.id);
    });
  };

  return (
    <Oyna keng sarlavha={forma.sarlavha} onYopish={onYopish} pastki={<>
      <button type="button" disabled={amal.band} onClick={qoralamaSaqlash} className={tugmaIkkinchi}>{t("shift.saveDraft")}</button>
      <button type="button" disabled={amal.band} onClick={smenaniYopish} className={`${tugmaAsosiy} h-14 px-8 text-base`}><CheckCircle2 size={20} />{t("shift.close")}</button>
    </>}>
      <XatoQutisi matn={xatoMatni || amal.xato} />
      {buyurtmasiz && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Maydon nom={t("fields.recipe")}>
            <select value={forma.recipeId} onChange={(event) => ozgar({ recipeId: event.target.value })} className={inputKlass}>
              <option value="">{t("fields.selectRecipe")}</option>
              {(retseptlar.malumot ?? []).map((retsept) => <option key={retsept.id} value={retsept.id}>{qatorNomi(retsept)}{retsept.version ? ` · v${retsept.version}` : ""}</option>)}
            </select>
          </Maydon>
          <Maydon nom={t("fields.destWarehouse")}><OmborTanlash value={forma.destWarehouseId} omborlar={omborlar} onChange={(destWarehouseId) => ozgar({ destWarehouseId })} /></Maydon>
        </div>
      )}
      <div className="space-y-2">
        <p className="text-sm font-black text-slate-700">{t("shift.outputs")}</p>
        <p className="text-xs font-semibold text-slate-400">{t("shift.outputsHint")}</p>
        {forma.outputs.map((qator, indeks) => (
          <div key={indeks} className="grid items-end gap-2 rounded-2xl bg-slate-50 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_44px]">
            <Maydon nom={t("shift.weightOrQuantity")}><input type="number" inputMode="decimal" min="0" step="any" value={qator.quantity} onChange={(event) => chiqim(indeks, { quantity: event.target.value })} className={`${inputKlass} h-14 text-lg`} /></Maydon>
            <Maydon nom={t("fields.scrapQuantity")}><input type="number" inputMode="decimal" min="0" step="any" value={qator.scrapQuantity} onChange={(event) => chiqim(indeks, { scrapQuantity: event.target.value })} className={`${inputKlass} h-14 text-lg`} /></Maydon>
            <Maydon nom={t("fields.serial")}><input value={qator.serial} placeholder={t("shift.serialAuto")} onChange={(event) => chiqim(indeks, { serial: event.target.value })} className={`${inputKlass} h-14`} /></Maydon>
            <QatorOchirish disabled={forma.outputs.length === 1} onClick={() => ozgar({ outputs: forma.outputs.filter((_, i) => i !== indeks) })} />
          </div>
        ))}
        <QatorQoshish matn={t("shift.addRoll")} onClick={() => ozgar({ outputs: [...forma.outputs, { quantity: "", scrapQuantity: "", serial: "", modificationId: "", role: "" }] })} />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-black text-slate-700">{t("shift.inputs")}</p>
        <p className="text-xs font-semibold text-slate-400">{t("shift.inputsHint")}</p>
        {forma.inputs.map((qator, indeks) => (
          <div key={indeks} className="grid items-end gap-2 rounded-2xl bg-slate-50 p-3 md:grid-cols-[minmax(0,2fr)_130px_150px_44px]">
            <Maydon nom={qator.offRecipe ? t("shift.offRecipeLine") : t("fields.product")}><MahsulotQidiruvi value={qator.modificationId} nom={qator.nom} onChange={(modificationId, nom) => kirim(indeks, { modificationId, nom })} /></Maydon>
            <Maydon nom={t("fields.quantity")}><input type="number" inputMode="decimal" min="0" step="any" value={qator.quantity} onChange={(event) => kirim(indeks, { quantity: event.target.value })} className={inputKlass} /></Maydon>
            <Maydon nom={t("fields.entryMethod")}>
              <select value={qator.entryMethod} onChange={(event) => kirim(indeks, { entryMethod: event.target.value as KirimQatori["entryMethod"] })} className={inputKlass}>
                <option value="ACTUAL">{t("entryMethod.ACTUAL")}</option>
                <option value="NORM">{t("entryMethod.NORM")}</option>
              </select>
            </Maydon>
            <QatorOchirish onClick={() => ozgar({ inputs: forma.inputs.filter((_, i) => i !== indeks) })} />
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <QatorQoshish matn={t("shift.addInput")} onClick={() => ozgar({ inputs: [...forma.inputs, { modificationId: "", quantity: "", entryMethod: "ACTUAL", offRecipe: false }] })} />
          <QatorQoshish matn={t("shift.addOffRecipe")} onClick={() => ozgar({ inputs: [...forma.inputs, { modificationId: "", quantity: "", entryMethod: "ACTUAL", offRecipe: true }] })} />
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-black text-slate-700">{t("shift.downtime")}</p>
        {forma.downtime.map((qator, indeks) => (
          <div key={indeks} className="grid items-end gap-2 rounded-2xl bg-slate-50 p-3 md:grid-cols-[minmax(0,1.5fr)_110px_minmax(0,1.5fr)_44px]">
            <Maydon nom={t("fields.downtimeReason")}>
              <select value={qator.reason} onChange={(event) => toxtash(indeks, { reason: event.target.value as Forma["downtime"][number]["reason"] })} className={inputKlass}>
                {TOXTASH_SABABLARI.map((sabab) => <option key={sabab} value={sabab}>{t(`downtime.${sabab}`)}</option>)}
              </select>
            </Maydon>
            <Maydon nom={t("fields.hours")}><input type="number" inputMode="decimal" min="0" step="any" value={qator.hours} onChange={(event) => toxtash(indeks, { hours: event.target.value })} className={inputKlass} /></Maydon>
            <Maydon nom={t("fields.note")}><input value={qator.note} onChange={(event) => toxtash(indeks, { note: event.target.value })} className={inputKlass} /></Maydon>
            <QatorOchirish onClick={() => ozgar({ downtime: forma.downtime.filter((_, i) => i !== indeks) })} />
          </div>
        ))}
        <QatorQoshish matn={t("shift.addDowntime")} onClick={() => ozgar({ downtime: [...forma.downtime, { reason: "BREAKDOWN", hours: "", note: "" }] })} />
      </div>
      <Maydon nom={t("fields.comment")}>
        <textarea value={forma.comment} rows={2} autoFocus={izohKerak} aria-invalid={izohKerak} onChange={(event) => { ozgar({ comment: event.target.value }); setIzohKerak(false); }} className={`${inputKlass} h-auto py-2 ${izohKerak ? "border-red-400 ring-4 ring-red-100" : ""}`} />
      </Maydon>
      {izohKerak && <p role="alert" className="-mt-2 text-xs font-bold text-red-600">{xatoMatni}</p>}
    </Oyna>
  );
}

function YorliqTugmasi({ qator }: { qator: SmenaChiqimi }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const amal = useAmal();
  if (!qator.batchId) return <span className="text-slate-300">—</span>;
  return (
    <span>
      <button type="button" disabled={amal.band} onClick={() => void amal.bajar(() => yorliqniChopEtish(qator.batchId as string))} className="inline-flex items-center gap-1.5 text-xs font-black text-orange-600 hover:underline disabled:opacity-50"><Printer size={14} />{t("rolls.printLabel")}</button>
      {amal.xato && <span role="alert" className="ml-2 text-xs font-bold text-red-600">{amal.xato}</span>}
    </span>
  );
}

function HisobotKorish({ id, onYopish, onOzgardi, onTahrir }: { id: string; onYopish: () => void; onOzgardi: () => void; onTahrir: (hujjat: SmenaHisoboti) => void }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const profil = useAuthProfileStore((holat) => holat.profil);
  const hujjat = useMalumot(() => ishlabChiqarishApi.smena.olish(id), id);
  const amal = useAmal();
  const [sabab, setSabab] = useState("");
  const [tuzatishOchiq, setTuzatishOchiq] = useState(false);
  const [outputId, setOutputId] = useState("");
  const [delta, setDelta] = useState("");
  const [tuzatishSababi, setTuzatishSababi] = useState("");
  const hisobot = hujjat.malumot;
  const rahbar = foydalanuvchiKursniOzgartiraOladimi(profil);
  const qoralama = hisobot?.status === "DRAFT";
  const tasdiqlangan = hisobot?.status === "CONFIRMED";
  const sotilgan = amal.xatoKodi === "errors.production.report_output_sold";
  const tuzatishlar = (hisobot?.outputs ?? []).flatMap((qator) => (qator.corrections ?? []).map((tuzatish) => ({ ...tuzatish, nom: qatorNomi(qator) })));

  const tasdiqlash = () => void amal.bajar(async () => { await ishlabChiqarishApi.smena.tasdiqlash(id); hujjat.qayta(); onOzgardi(); });
  const bekorQilish = () => void amal.bajar(async () => { await ishlabChiqarishApi.smena.bekorQilish(id, sabab.trim() || undefined); hujjat.qayta(); onOzgardi(); });
  function tuzatish() {
    const son = sonMaydoni(delta);
    if (!outputId) return amal.setXato(t("errors.correctionOutput"));
    if (son === undefined || son === 0) return amal.setXato(t("errors.correctionDelta"));
    if (!tuzatishSababi.trim()) return amal.setXato(t("errors.correctionReason"));
    void amal.bajar(async () => {
      await ishlabChiqarishApi.smena.tuzatish(id, { outputId, delta: son, reason: tuzatishSababi.trim() });
      setTuzatishOchiq(false);
      hujjat.qayta();
      onOzgardi();
    });
  }

  return (
    <Oyna keng sarlavha={hisobot ? hujjatRaqami(hisobot) || t("shift.report") : t("loading")} belgi={<Holat status={hisobot?.status} />} onYopish={onYopish} pastki={hisobot && <>
      {qoralama && <button type="button" disabled={amal.band} onClick={() => void amal.bajar(async () => { await ishlabChiqarishApi.smena.ochirish(id); onOzgardi(); onYopish(); })} className={tugmaXavfli}>{t("actions.delete")}</button>}
      {qoralama && <button type="button" onClick={() => onTahrir(hisobot)} className={tugmaIkkinchi}>{t("actions.edit")}</button>}
      {qoralama && <button type="button" disabled={amal.band} onClick={tasdiqlash} className={tugmaAsosiy}><CheckCircle2 size={16} />{t("shift.close")}</button>}
      {tasdiqlangan && <button type="button" disabled={amal.band} onClick={bekorQilish} className={tugmaXavfli}>{t("actions.cancelDocument")}</button>}
      {tasdiqlangan && rahbar && <button type="button" onClick={() => setTuzatishOchiq(true)} className={tugmaIkkinchi}>{t("shift.correction")}</button>}
    </>}>
      <XatoQutisi matn={hujjat.xato || amal.xato} />
      {sotilgan && rahbar && !tuzatishOchiq && <Ogohlantirish>{t("shift.soldHint")}</Ogohlantirish>}
      {!hisobot ? <Yuklanmoqda /> : <>
        <Jadval
          ustunlar={[
            { nom: t("fields.product"), katak: (qator) => qatorNomi(qator) },
            { nom: t("fields.serial"), katak: (qator) => qator.serial ?? "—" },
            { nom: t("fields.quantity"), ong: true, katak: (qator) => miqdorMatni(chiqimMiqdori(qator)) },
            { nom: t("fields.scrapQuantity"), ong: true, katak: (qator) => miqdorMatni(qator.scrapQuantity) },
            { nom: t("rolls.label"), katak: (qator) => <YorliqTugmasi qator={qator} /> },
          ]}
          qatorlar={hisobot.outputs ?? []}
          kalit={(qator, indeks) => qator.id ?? String(indeks)}
          bosh={t("empty.lines")}
        />
        {tuzatishlar.length > 0 && <Jadval
          ustunlar={[
            { nom: t("shift.corrections"), katak: (qator) => qator.nom },
            { nom: t("fields.delta"), ong: true, katak: (qator) => `${Number(qator.delta) > 0 ? "+" : ""}${miqdorMatni(qator.delta)}` },
            { nom: t("fields.reason"), katak: (qator) => qator.reason || "—" },
            { nom: t("fields.date"), katak: (qator) => kunMatni(qator.createdAt ?? undefined) || "—" },
          ]}
          qatorlar={tuzatishlar}
          kalit={(qator, indeks) => qator.id ?? String(indeks)}
          bosh={t("empty.lines")}
        />}
        {(hisobot.inputs ?? []).length > 0 && <Jadval
          ustunlar={[
            { nom: t("shift.inputs"), katak: (qator) => `${qatorNomi(qator)}${qator.offRecipe ? ` · ${t("shift.offRecipeLine")}` : ""}` },
            { nom: t("fields.entryMethod"), katak: (qator) => (qator.entryMethod ? t(`entryMethod.${qator.entryMethod}`) : "—") },
            { nom: t("fields.norm"), ong: true, katak: (qator) => miqdorMatni(qator.normQuantity) },
            { nom: t("fields.quantity"), ong: true, katak: (qator) => miqdorMatni(qator.quantity) },
          ]}
          qatorlar={hisobot.inputs ?? []}
          kalit={(qator, indeks) => qator.id ?? String(indeks)}
          bosh={t("empty.lines")}
        />}
        {(hisobot.downtime ?? []).length > 0 && <Jadval
          ustunlar={[
            { nom: t("shift.downtime"), katak: (qator) => t(`downtime.${qator.reason}`, { defaultValue: qator.reason }) },
            { nom: t("fields.hours"), ong: true, katak: (qator) => miqdorMatni(qator.hours) },
            { nom: t("fields.note"), katak: (qator) => qator.note ?? "—" },
          ]}
          qatorlar={hisobot.downtime ?? []}
          kalit={(_, indeks) => String(indeks)}
          bosh={t("empty.lines")}
        />}
        {hisobot.comment && <p className="rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-600">{hisobot.comment}</p>}
        {hisobot.cancelReason && <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-600"><span className="font-black">{t("shift.cancelReason")}:</span> {hisobot.cancelReason}</p>}
        {tasdiqlangan && <Maydon nom={t("shift.cancelReason")} izoh={t("shift.cancelHint")}><input value={sabab} onChange={(event) => setSabab(event.target.value)} className={inputKlass} /></Maydon>}
        {tuzatishOchiq && (
          <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-black text-slate-700">{t("shift.correction")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Maydon nom={t("fields.output")}>
                <select value={outputId} onChange={(event) => setOutputId(event.target.value)} className={inputKlass}>
                  <option value="">{t("fields.selectOutput")}</option>
                  {(hisobot.outputs ?? []).filter((qator) => qator.id).map((qator) => <option key={qator.id} value={qator.id}>{qatorNomi(qator)} · {qator.serial ?? miqdorMatni(chiqimMiqdori(qator))}</option>)}
                </select>
              </Maydon>
              <Maydon nom={t("fields.delta")} izoh={t("shift.deltaHint")}><input type="number" step="any" value={delta} onChange={(event) => setDelta(event.target.value)} placeholder="-900" className={inputKlass} /></Maydon>
            </div>
            <Maydon nom={t("fields.reason")}><input value={tuzatishSababi} onChange={(event) => setTuzatishSababi(event.target.value)} className={inputKlass} /></Maydon>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setTuzatishOchiq(false)} className={tugmaIkkinchi}>{t("actions.cancel")}</button>
              <button type="button" disabled={amal.band} onClick={tuzatish} className={tugmaAsosiy}>{t("actions.save")}</button>
            </div>
          </div>
        )}
      </>}
    </Oyna>
  );
}
