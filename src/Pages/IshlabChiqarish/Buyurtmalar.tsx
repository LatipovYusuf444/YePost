import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, BookOpen, BookOpenCheck, Calculator, CheckCircle2, Circle, CircleAlert, CircleCheck, CircleCheckBig, CircleDashed, CircleSlash, ClipboardCheck, ClipboardList, Factory, Hourglass, ListChecks, Lock, NotebookPen, Package, PackageCheck, PackageOpen, Plus, RefreshCw, Rocket, Sparkles, Undo2, Warehouse } from "lucide-react";
import AppSelect from "@/Components/ui/AppSelect";
import { useTranslation } from "react-i18next";
import { ishlabChiqarishApi } from "@/api/ishlabChiqarishApi";
import { bugungiToshkentKuni, kunMatni, toshkentKuni, vaqtMatni } from "@/lib/hujjatSanasi";
import { BUYURTMA_HOLATLARI, OCHIQ_BUYURTMA, YOPILADIGAN_BUYURTMA, buyurtmaBosqichlari, buyurtmaTahrirlanadimi, buyurtmaYakunlanadimi, holatBoyicha, tahrirTanasi, hujjatRaqami, miqdorMatni, portlashMiqdori, qatorNomi, qidiruvgaMos, sonMaydoni, tozaTana, yopishFormasi, yopishTanasiniYigish, yopishYoqotishi, type Bosqich, type YopishFormaQatori } from "@/lib/ishlabChiqarish";
import type { XatoMaydonQoidasi } from "@/lib/ishlabChiqarish";
import { ishlabChiqarishRuxsati } from "@/lib/roles";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { useIshlabChiqarishStore } from "@/store/ishlabChiqarishStore";
import type { Buyurtma, BuyurtmaTanasi, Mavjudlik, PortlashQatori, YopishQatori } from "@/types/ishlabChiqarish";
import { Asboblar, Bolim, HolatFiltri, HolatKartalari, Holat, Jadval, Jarayon, MahsulotQidiruvi, Maydon, Ogohlantirish, OmborTanlash, Oyna, QidiruvMaydoni, Sahifa, Tafsilotlar, XatoQutisi, Yuklanmoqda, inputKlass, selectKlass, tugmaAsosiy, tugmaIkkinchi, tugmaXavfli, xatoRamkasi, type HolatGuruhi, type Ustun } from "./umumiy";
import { useAmal, useKechiktirilgan, useMalumot, useMaydonXatolari, useOmborlar, useXodimNomlari } from "./hooklar";

// Muddat nazorati faqat ish davom etayotgan buyurtmada.
const TUGAGAN = ["DRAFT", "ACCEPTED", "DONE", "CLOSED", "CANCELLED"];
const HOLATLAR = BUYURTMA_HOLATLARI;

/** Muddati o'tgan va hali ishda bo'lgan buyurtma. */
function muddatOtganmi(buyurtma: Buyurtma) {
  return Boolean(buyurtma.dueDate) && !TUGAGAN.includes(buyurtma.status) && toshkentKuni(buyurtma.dueDate ?? undefined) < bugungiToshkentKuni();
}

export default function Buyurtmalar() {
  const { t } = useTranslation("ishlab_chiqarish");
  const omborlar = useOmborlar();
  const royxat = useMalumot(() => ishlabChiqarishApi.buyurtmalar.royxat(), "orders");
  const [filtr, setFiltr] = useState<{ kalit: string; holatlar: string[] } | null>(null);
  const [qidiruv, setQidiruv] = useState("");
  const [ochiq, setOchiq] = useState<string | null>(null);
  const [forma, setForma] = useState<{ hujjat?: Buyurtma } | null>(null);
  const nomlar = useMemo(() => new Map(omborlar.map((ombor) => [ombor.id, ombor.name])), [omborlar]);
  const hammasi = useMemo(() => royxat.malumot ?? [], [royxat.malumot]);
  const qatorlar = useMemo(
    () => holatBoyicha(hammasi, filtr?.holatlar ?? null).filter((hujjat) => qidiruvgaMos(qidiruv, [hujjatRaqami(hujjat), qatorNomi(hujjat), hujjat.note])),
    [hammasi, filtr, qidiruv]
  );
  const guruhlar: HolatGuruhi[] = [
    { kalit: "jami", nom: t("orders.kpi.total"), holatlar: null, rang: "blue", ikonka: ClipboardList },
    { kalit: "yangi", nom: t("orders.kpi.new"), holatlar: ["RELEASED", "DRAFT"], rang: "amber", ikonka: Sparkles },
    { kalit: "ishda", nom: t("orders.kpi.active"), holatlar: ["MATERIAL_ISSUED", "IN_PROGRESS", "AWAITING_ACCEPTANCE", "RETURNED"], rang: "violet", ikonka: Factory },
    { kalit: "yakunlangan", nom: t("orders.kpi.done"), holatlar: ["ACCEPTED", "DONE", "CLOSED"], rang: "emerald", ikonka: CircleCheckBig },
  ];
  const ombor = (id?: string) => (id ? nomlar.get(id) ?? "—" : "—");
  const ustunlar: Ustun<Buyurtma>[] = [
    { id: "buyurtmalar-column-1", nom: t("fields.document"), katak: (hujjat) => hujjatRaqami(hujjat) ? <span className="font-black text-slate-900">{hujjatRaqami(hujjat)}</span> : <span className="text-slate-400">{t("status.DRAFT")}</span> },
    { id: "buyurtmalar-column-2", nom: t("fields.product"), katak: (hujjat) => <span className="block max-w-[260px] truncate font-bold text-slate-800">{qatorNomi(hujjat)}</span> },
    { id: "buyurtmalar-column-3", nom: t("fields.progress"), katak: (hujjat) => <Jarayon bajarilgan={hujjat.produced ?? 0} reja={hujjat.quantity} /> },
    { id: "buyurtmalar-column-18", nom: t("orders.scrap"), ong: true, katak: (hujjat) => (Number(hujjat.scrap) > 0 ? <span className="font-bold text-amber-600">{miqdorMatni(hujjat.scrap)}</span> : <span className="text-slate-300">—</span>) },
    { id: "buyurtmalar-column-4", nom: t("fields.sourceWarehouse"), katak: (hujjat) => ombor(hujjat.sourceWarehouseId) },
    { id: "buyurtmalar-column-5", nom: t("fields.destWarehouse"), katak: (hujjat) => ombor(hujjat.destWarehouseId) },
    { id: "buyurtmalar-column-6", nom: t("fields.date"), katak: (hujjat) => kunMatni(hujjat.date ?? undefined) || "—" },
    { id: "buyurtmalar-column-7", nom: t("fields.dueDate"), katak: (hujjat) => (hujjat.dueDate ? <span className={muddatOtganmi(hujjat) ? "font-black text-red-600" : ""}>{kunMatni(hujjat.dueDate)}</span> : "—") },
    { id: "buyurtmalar-column-8", nom: t("fields.status"), katak: (hujjat) => <Holat status={hujjat.status} /> },
  ];
  const yangi = <button type="button" onClick={() => setForma({})} className={tugmaAsosiy}><Plus size={18} />{t("orders.create")}</button>;
  // Buyurtma bor, lekin qidiruv yoki filtr hech narsa qoldirmagan.
  const filtrlangan = hammasi.length > 0;
  return (
    <Sahifa sarlavha={t("orders.title")} izoh={t("orders.subtitle")} amal={yangi}>
      <HolatKartalari guruhlar={guruhlar} qatorlar={hammasi} tanlangan={filtr?.kalit ?? ""} yuklanmoqda={royxat.yuklanmoqda && !royxat.malumot} onTanlash={(guruh) => setFiltr(guruh?.holatlar ? { kalit: guruh.kalit, holatlar: guruh.holatlar } : null)} />
      <Asboblar>
        <QidiruvMaydoni qiymat={qidiruv} onChange={setQidiruv} placeholder={t("orders.searchPlaceholder")} />
        <HolatFiltri qiymat={filtr?.holatlar.length === 1 ? filtr.holatlar[0] : ""} onChange={(holat) => setFiltr(holat ? { kalit: holat, holatlar: [holat] } : null)} holatlar={HOLATLAR} />
      </Asboblar>
      <XatoQutisi matn={royxat.xato} />
      <Jadval tableId="IshlabChiqarish/Buyurtmalar/jadval-1"
        ustunlar={ustunlar}
        qatorlar={qatorlar}
        kalit={(hujjat) => hujjat.id}
        onBos={(hujjat) => setOchiq(hujjat.id)}
        yuklanmoqda={royxat.yuklanmoqda && !royxat.malumot}
        sahifaHajmi={20}
        boshIkonka={ClipboardList}
        bosh={filtrlangan ? t("orders.emptyFiltered") : t("orders.emptyTitle")}
        boshIzoh={filtrlangan ? t("orders.emptyFilteredHint") : <IshTartibi />}
        boshAmal={filtrlangan ? <button type="button" onClick={() => { setFiltr(null); setQidiruv(""); }} className={tugmaIkkinchi}>{t("actions.resetFilters")}</button> : yangi}
      />
      {ochiq && <BuyurtmaKorish id={ochiq} nomlar={nomlar} onYopish={() => setOchiq(null)} onOzgardi={royxat.qayta} onTahrir={(hujjat) => { setOchiq(null); setForma({ hujjat }); }} />}
      {forma && <BuyurtmaOynasi hujjat={forma.hujjat} onYopish={() => setForma(null)} onSaqlandi={(id) => { setForma(null); royxat.qayta(); setOchiq(id); }} />}
    </Sahifa>
  );
}

/** Bo'sh ro'yxatda: buyurtma nima va ish qaysi tartibda boradi. */
function IshTartibi() {
  const { t } = useTranslation("ishlab_chiqarish");
  const qadamlar = [t("orders.flow.recipe"), t("orders.flow.order"), t("orders.flow.issue"), t("orders.flow.report"), t("orders.flow.acceptance"), t("orders.flow.close")];
  return (
    <div className="space-y-5">
      <p>{t("orders.emptyHint")}</p>
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

// Server xatosi qaysi maydonga tegishli (validatsiya maydoni, xato kodi yoki xabardagi so'z). Kalit — backend maydon nomi.
// Xabardagi so'z bo'yicha birinchi mos qoida olinadi, shuning uchun aniqrog'i oldin: "Mahsulot retsepti faol emas" retseptga,
// "Tayyor mahsulot omborini tanlang" omborga, "Mahsulot miqdori..." miqdorga tushadi; umumiy "mahsulot" eng oxirida.
const BUYURTMA_XATO_QOIDALARI: Record<string, XatoMaydonQoidasi> = {
  recipeId: { maydonlar: ["recipeId"], kodlar: ["recipe"], sozlar: ["retsept", "рецепт"] },
  sourceWarehouseId: { maydonlar: ["sourceWarehouseId"], kodlar: ["source", "warehouse"], sozlar: ["xomashyo ombori", "склад сырья"] },
  destWarehouseId: { maydonlar: ["destWarehouseId"], kodlar: ["dest", "warehouse"], sozlar: ["tayyor mahsulot ombori", "склад готов"] },
  quantity: { maydonlar: ["quantity"], kodlar: ["quantity"], sozlar: ["miqdor", "количеств"] },
  dueDate: { maydonlar: ["dueDate", "date"], kodlar: ["due_date", "duedate"], sozlar: ["muddat", "срок"] },
  modificationId: { maydonlar: ["modificationId"], kodlar: ["modification", "product"], sozlar: ["mahsulot", "товар"] },
  note: { maydonlar: ["note"] },
};

// Yakunlash: reja bajarilmagan bo'lsa server sababni talab qiladi — xato sabab maydoniga tushadi.
const YAKUN_XATO_QOIDALARI: Record<string, XatoMaydonQoidasi> = {
  reason: { maydonlar: ["reason"], kodlar: ["completion_reason_required"] },
};

function BuyurtmaOynasi({ hujjat, onYopish, onSaqlandi }: { hujjat?: Buyurtma; onYopish: () => void; onSaqlandi: (id: string) => void }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const omborlar = useOmborlar();
  const amal = useAmal();
  const fx = useMaydonXatolari(BUYURTMA_XATO_QOIDALARI);
  // Sozlamadagi standart omborlar: buyurtmada ombor tanlanmasa server shularni oladi (oldindan to'ldiriladi, o'zgartirish mumkin).
  const sozlama = useIshlabChiqarishStore((holat) => holat.sozlama);
  const standartXomashyo = sozlama?.defaultSourceWarehouseId ?? "";
  const standartTayyor = sozlama?.defaultDestWarehouseId ?? "";
  const [mahsulot, setMahsulot] = useState({ id: hujjat?.modificationId ?? "", nom: hujjat ? qatorNomi(hujjat) : "" });
  const [quantity, setQuantity] = useState(hujjat?.quantity != null ? String(hujjat.quantity) : "");
  const [sourceWarehouseId, setSource] = useState(hujjat?.sourceWarehouseId ?? standartXomashyo);
  const [destWarehouseId, setDest] = useState(hujjat?.destWarehouseId ?? standartTayyor);
  const [recipeId, setRecipeId] = useState(hujjat?.recipeId ?? "");
  const [dueDate, setDueDate] = useState(hujjat?.dueDate?.slice(0, 10) ?? "");
  const [note, setNote] = useState(hujjat?.note ?? "");
  // Saqlash bosilgandan keyin yetishmayotgan maydonlar qizil bilan ko'rsatiladi.
  const [urinildi, setUrinildi] = useState(false);
  const omborNomlari = useMemo(() => new Map(omborlar.map((ombor) => [ombor.id, ombor.name])), [omborlar]);
  const retseptlar = useMalumot(() => ishlabChiqarishApi.retseptlar.royxat({ status: "ACTIVE", modificationId: mahsulot.id || undefined }), mahsulot.id);
  // Faqat tanlangan mahsulotning faol retseptlari (boshqa mahsulot javobi kechikib kelsa ham aralashmaydi).
  const mosRetseptlar = mahsulot.id ? (retseptlar.malumot ?? []).filter((retsept) => retsept.modificationId === mahsulot.id) : [];
  // Retsept tanlanmasa server faol retseptni oladi: hisob va xulosa ham shu retsept bo'yicha.
  const hisobRetsepti = recipeId ? mosRetseptlar.find((retsept) => retsept.id === recipeId) : mosRetseptlar[0];
  const retseptYuklanmoqda = Boolean(mahsulot.id) && retseptlar.yuklanmoqda;
  const miqdor = sonMaydoni(quantity);
  // Mahsulotning faol retsepti yo'q va retsept tanlanmagan: server buyurtmani qabul qilmaydi, shuning uchun so'rovsiz ko'rsatiladi.
  // Faqat ro'yxat muvaffaqiyatli yuklangan bo'lsa: yuklash xatosi "retsept yo'q" degani emas — unda server o'zi hal qiladi.
  const faolRetseptYoq = Boolean(mahsulot.id) && !retseptYuklanmoqda && !retseptlar.xato && retseptlar.malumot != null && !recipeId && mosRetseptlar.length === 0;
  const xatolar: Record<string, string> = {
    ...(!mahsulot.id ? { modificationId: t("errors.product") } : {}),
    ...(!(miqdor && miqdor > 0) ? { quantity: t("errors.lineQuantity") } : {}),
    ...(faolRetseptYoq ? { recipeId: t("errors.noActiveRecipe") } : {}),
    ...(!sourceWarehouseId && !standartXomashyo ? { sourceWarehouseId: t("errors.sourceWarehouse") } : {}),
    ...(!destWarehouseId && !standartTayyor ? { destWarehouseId: t("errors.destWarehouse") } : {}),
  };
  // Mijoz tekshiruvi urinishdan keyin jonli; serverdan kelgan xato maydon yonida turadi va shu maydon o'zgarsa yo'qoladi.
  const xato = (kalit: string) => (urinildi ? xatolar[kalit] : undefined) ?? fx.xato(kalit);
  const tozala = fx.tozala;
  const ombor = (id?: string) => (id ? omborNomlari.get(id) ?? "" : "");

  function saqlash() {
    setUrinildi(true);
    if (Object.keys(xatolar).length) return fx.ornat(xatolar);
    fx.ornat({});
    const tana: BuyurtmaTanasi = tozaTana({ modificationId: mahsulot.id, quantity: miqdor as number, sourceWarehouseId, destWarehouseId, recipeId, dueDate, note: note.trim() });
    void amal.bajar(async () => {
      const saqlangan = hujjat ? await ishlabChiqarishApi.buyurtmalar.yangilash(hujjat.id, tahrirTanasi(tana, { recipeId: null, dueDate: null, note: "" })) : await ishlabChiqarishApi.buyurtmalar.yaratish(tana);
      onSaqlandi(saqlangan.id);
    }, fx.serverdan);
  }

  const tekshiruv = [
    { kalit: "product", nom: t("fields.product"), tayyor: Boolean(mahsulot.id), xato: Boolean(xato("modificationId")), qiymat: mahsulot.nom || "—" },
    { kalit: "quantity", nom: t("fields.plannedQuantity"), tayyor: Boolean(miqdor && miqdor > 0), xato: Boolean(xato("quantity")), qiymat: miqdor && miqdor > 0 ? miqdorMatni(miqdor) : "—" },
    {
      kalit: "recipe",
      nom: t("fields.recipe"),
      tayyor: Boolean(recipeId || hisobRetsepti) && !xato("recipeId"),
      xato: Boolean(xato("recipeId")) || faolRetseptYoq,
      qiymat: hisobRetsepti ? `v${hisobRetsepti.version ?? 1}${recipeId ? "" : ` · ${t("orders.recipeAutoShort")}`}` : recipeId ? t("orders.recipeSelected") : faolRetseptYoq ? t("orders.noActiveRecipe") : "—",
    },
    { kalit: "warehouses", nom: t("orders.sectionWarehouses"), tayyor: Boolean((sourceWarehouseId || standartXomashyo) && (destWarehouseId || standartTayyor)) && !xato("sourceWarehouseId") && !xato("destWarehouseId"), xato: Boolean(xato("sourceWarehouseId") || xato("destWarehouseId")), qiymat: (sourceWarehouseId || standartXomashyo) && (destWarehouseId || standartTayyor) ? `${ombor(sourceWarehouseId || standartXomashyo)} → ${ombor(destWarehouseId || standartTayyor)}` : "—" },
  ];
  const toldirilgan = tekshiruv.filter((qadam) => qadam.tayyor).length;

  return (
    <Oyna keng ikonka={ClipboardList} sarlavha={t(hujjat ? "orders.edit" : "orders.create")} izoh={t("orders.formHint")} onYopish={onYopish} pastki={<>
      <p className="mr-auto hidden text-xs font-semibold text-slate-400 sm:block"><span aria-hidden className="text-red-500">*</span> {t("orders.requiredHint")}</p>
      <button type="button" onClick={onYopish} className={tugmaIkkinchi}>{t("actions.cancel")}</button>
      <button type="button" disabled={amal.band} onClick={saqlash} className={`${tugmaAsosiy} min-w-44`}><CheckCircle2 size={18} />{t(hujjat ? "actions.save" : "orders.createSubmit")}</button>
    </>}>
      <XatoQutisi matn={fx.tepadagi || (fx.bor ? "" : amal.xato)} />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          <Bolim ikonka={Package} sarlavha={t("orders.sectionPlan")} izoh={t("orders.planHint")}>
            <Maydon nom={t("fields.product")} majburiy xato={xato("modificationId")}>
              <MahsulotQidiruvi value={mahsulot.id} nom={mahsulot.nom} onChange={(id, nom) => { tozala("modificationId", "recipeId"); setMahsulot({ id, nom }); setRecipeId(""); }} />
            </Maydon>
            <div className="grid gap-4 md:grid-cols-3">
              <Maydon nom={t("fields.plannedQuantity")} majburiy xato={xato("quantity")}>
                <input type="number" inputMode="decimal" min="0" step="any" value={quantity} placeholder="5000" aria-invalid={Boolean(xato("quantity"))} onChange={(event) => { tozala("quantity"); setQuantity(event.target.value); }} className={inputKlass} />
              </Maydon>
              <Maydon nom={t("fields.dueDate")} izoh={t("orders.dueHint")} xato={xato("dueDate")}>
                <input type="date" value={dueDate} onChange={(event) => { tozala("dueDate"); setDueDate(event.target.value); }} className={inputKlass} />
              </Maydon>
              <Maydon nom={t("fields.recipe")} izoh={t("orders.recipeHint")} xato={xato("recipeId")}>
                <AppSelect value={recipeId} disabled={!mahsulot.id} aria-label={t("fields.recipe")} onChange={(event) => { tozala("recipeId"); setRecipeId(event.target.value); }} className={selectKlass}>
                  <option value="">{t("orders.recipeAuto")}</option>
                  {mosRetseptlar.map((retsept) => <option key={retsept.id} value={retsept.id}>{qatorNomi(retsept)}{retsept.version ? ` · v${retsept.version}` : ""}</option>)}
                </AppSelect>
              </Maydon>
            </div>
            {mahsulot.id && !retseptYuklanmoqda && (hisobRetsepti ? (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500">
                <BookOpen aria-hidden size={15} className="text-[#2563EB]" />
                <span className="text-slate-700">{qatorNomi(hisobRetsepti)} · v{hisobRetsepti.version ?? 1}</span>
                <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">{t("fields.baseQuantity")}: {miqdorMatni(hisobRetsepti.baseQuantity)}</span>
                {hisobRetsepti.warehouseId && <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">{t("fields.wipWarehouse")}: {ombor(hisobRetsepti.warehouseId) || "—"}</span>}
                {hisobRetsepti.inputs && <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">{t("recipes.inputs")}: {hisobRetsepti.inputs.length}</span>}
              </div>
            ) : !recipeId && !xato("recipeId") && <Ogohlantirish>{t("orders.previewNoRecipe")}</Ogohlantirish>)}
          </Bolim>
          <Bolim ikonka={Warehouse} sarlavha={t("orders.sectionWarehouses")} izoh={t("orders.warehousesHint")}>
            <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              <Maydon nom={t("fields.sourceWarehouse")} majburiy={!standartXomashyo} izoh={standartXomashyo ? t("orders.defaultWarehouseHint", { nom: ombor(standartXomashyo) || "—" }) : undefined} xato={xato("sourceWarehouseId")}><OmborTanlash value={sourceWarehouseId} omborlar={omborlar} onChange={(id) => { tozala("sourceWarehouseId", "destWarehouseId"); setSource(id); }} /></Maydon>
              <ArrowRight aria-hidden size={20} className="mt-11 hidden text-slate-300 sm:block" />
              <Maydon nom={t("fields.destWarehouse")} majburiy={!standartTayyor} izoh={standartTayyor ? t("orders.defaultWarehouseHint", { nom: ombor(standartTayyor) || "—" }) : undefined} xato={xato("destWarehouseId")}><OmborTanlash value={destWarehouseId} omborlar={omborlar} onChange={(id) => { tozala("sourceWarehouseId", "destWarehouseId"); setDest(id); }} /></Maydon>
            </div>
            <p className="flex items-start gap-2 rounded-2xl bg-sky-50 px-4 py-3 text-xs font-bold leading-5 text-sky-700"><Lock aria-hidden size={15} className="mt-0.5 shrink-0" />{t("orders.reserveHint")}</p>
            <ol aria-label={t("orders.routeTitle")} className="flex flex-wrap items-center gap-2">
              {[
                { ikonka: Warehouse, nom: t("orders.routeRaw"), qiymat: ombor(sourceWarehouseId || standartXomashyo) },
                { ikonka: Factory, nom: t("orders.routeWorkshop"), qiymat: hisobRetsepti?.warehouseId ? ombor(hisobRetsepti.warehouseId) : "" },
                { ikonka: PackageCheck, nom: t("orders.routeFinished"), qiymat: ombor(destWarehouseId || standartTayyor) },
              ].map((qadam, indeks, royxat) => (
                <li key={qadam.nom} className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold ${qadam.qiymat ? "border-orange-100 bg-orange-50/60 text-slate-700" : "border-dashed border-slate-200 bg-white text-slate-400"}`}>
                    <qadam.ikonka aria-hidden size={15} className={qadam.qiymat ? "text-[#2563EB]" : ""} />
                    <span className="text-slate-400">{qadam.nom}:</span> {qadam.qiymat || "—"}
                  </span>
                  {indeks < royxat.length - 1 && <ArrowRight aria-hidden size={14} className="text-slate-300" />}
                </li>
              ))}
            </ol>
          </Bolim>
          <Bolim ikonka={NotebookPen} sarlavha={t("fields.note")}>
            {/* Bo'lim sarlavhasi maydon nomi o'rnida: xato bo'lsa matn maydoni qizil, ostida xato matni. */}
            <div data-maydon-xato={xato("note") ? "true" : undefined} className="grid gap-2">
              <textarea value={note} rows={2} aria-label={t("fields.note")} aria-invalid={Boolean(xato("note"))} placeholder={t("orders.notePlaceholder")} onChange={(event) => { tozala("note"); setNote(event.target.value); }} className={`${inputKlass} h-auto py-3 ${xato("note") ? xatoRamkasi : ""}`} />
              {xato("note") && <span role="alert" className="text-xs font-bold leading-5 text-red-600">{xato("note")}</span>}
            </div>
          </Bolim>
        </div>
        <div className="space-y-5 xl:sticky xl:top-0">
          <Bolim ikonka={ListChecks} sarlavha={t("orders.summaryTitle")} amal={<span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-[#2563EB]">{toldirilgan}/{tekshiruv.length}</span>}>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#2563EB] transition-all" style={{ width: `${(toldirilgan / tekshiruv.length) * 100}%` }} /></div>
            <ul className="space-y-2.5">
              {tekshiruv.map((qadam) => (
                <li key={qadam.kalit} className="flex items-start gap-3 text-sm">
                  {qadam.xato ? <CircleAlert aria-hidden size={18} className="mt-0.5 shrink-0 text-red-500" /> : qadam.tayyor ? <CircleCheck aria-hidden size={18} className="mt-0.5 shrink-0 text-emerald-500" /> : <Circle aria-hidden size={18} className="mt-0.5 shrink-0 text-slate-300" />}
                  <span className="min-w-0 flex-1">
                    <span className={`block text-xs font-bold uppercase tracking-wide ${qadam.xato ? "text-red-500" : "text-slate-400"}`}>{qadam.nom}</span>
                    <span className={`block truncate font-bold ${qadam.xato ? "text-red-600" : qadam.tayyor ? "text-slate-800" : "text-slate-400"}`}>{qadam.qiymat}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Bolim>
          <XomashyoHisobi modificationId={mahsulot.id} recipeId={recipeId || mosRetseptlar[0]?.id || ""} retseptYuklanmoqda={retseptYuklanmoqda} quantity={quantity} />
        </div>
      </div>
    </Oyna>
  );
}

/** Buyurtma formasida: tanlangan (yoki faol) retsept bo'yicha shu miqdor uchun kerakli xomashyo va chiqadigan mahsulot. Faqat ko'rsatish. */
function XomashyoHisobi({ modificationId, recipeId, retseptYuklanmoqda, quantity }: { modificationId: string; recipeId: string; retseptYuklanmoqda: boolean; quantity: string }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const miqdor = sonMaydoni(useKechiktirilgan(quantity));
  const tayyor = Boolean(modificationId && recipeId && miqdor && miqdor > 0);
  const hisob = useMalumot(() => (tayyor ? ishlabChiqarishApi.retseptlar.portlash(recipeId, miqdor as number) : Promise.resolve(null)), tayyor ? `${recipeId}|${miqdor}` : "");
  const qatorMiqdori = (qator: PortlashQatori) => (qator.min != null && qator.max != null ? `${miqdorMatni(qator.min)} – ${miqdorMatni(qator.max)}` : qator.kind === "FREE" ? t("inputKind.FREE") : miqdorMatni(portlashMiqdori(qator)));
  return (
    <Bolim ikonka={BookOpenCheck} sarlavha={t("orders.sectionPreview")} izoh={tayyor ? t("orders.previewHint", { miqdor: miqdorMatni(miqdor) }) : undefined}>
      {!modificationId || !(miqdor && miqdor > 0) ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-8 text-center">
          <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#2563EB] ring-1 ring-orange-100"><Calculator size={22} /></span>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">{t("orders.previewEmpty")}</p>
        </div>
      ) : retseptYuklanmoqda && !recipeId ? (
        <Yuklanmoqda />
      ) : !recipeId ? (
        <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm font-semibold leading-6 text-slate-400">{t("orders.previewNeedsRecipe")}</p>
      ) : (
        <>
          <XatoQutisi matn={hisob.xato} />
          <Jadval tableId="IshlabChiqarish/Buyurtmalar/jadval-2"
            ixcham
            yuklanmoqda={hisob.yuklanmoqda}
            ustunlar={[
              { id: "buyurtmalar-column-9", nom: t("recipes.inputs"), katak: (qator) => qatorNomi(qator) },
              { id: "buyurtmalar-column-10", nom: t("fields.required"), ong: true, katak: qatorMiqdori },
            ]}
            qatorlar={hisob.yuklanmoqda ? [] : hisob.malumot?.inputs ?? []}
            kalit={(qator, indeks) => `${qator.modificationId ?? ""}-${indeks}`}
            bosh={t("empty.lines")}
          />
          {!hisob.yuklanmoqda && (hisob.malumot?.outputs ?? []).length > 0 && (
            <Jadval tableId="IshlabChiqarish/Buyurtmalar/jadval-3"
              ixcham
              ustunlar={[
                { id: "buyurtmalar-column-11", nom: t("recipes.outputs"), katak: (qator) => <span className="inline-flex items-center gap-2">{qatorNomi(qator)}{qator.role === "WASTE" && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-black text-amber-700">{t("outputRole.WASTE")}</span>}</span> },
                { id: "buyurtmalar-column-12", nom: t("fields.quantity"), ong: true, katak: qatorMiqdori },
              ]}
              qatorlar={hisob.malumot?.outputs ?? []}
              kalit={(qator, indeks) => `${qator.modificationId ?? ""}-${indeks}`}
              bosh={t("empty.lines")}
            />
          )}
        </>
      )}
    </Bolim>
  );
}

const YOPISH_XATO_QOIDALARI: Record<string, XatoMaydonQoidasi> = {
  lines: { maydonlar: ["lines"], kodlar: ["close_return_exceeds"] },
  note: { maydonlar: ["note"] },
};

/** Bosqichlar chizig'i: buyurtma → berish → kun yakuni → qabul → yopish; har bosqichda sana va kim. */
function Bosqichlar({ bosqichlar, xodimlar, yuklanmoqda }: { bosqichlar: Bosqich[]; xodimlar: Map<string, string>; yuklanmoqda: boolean }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const ikonka = { order: ClipboardList, issue: PackageOpen, report: Factory, acceptance: ClipboardCheck, close: Lock } as const;
  return (
    <ol aria-label={t("orders.timeline.title")} className="grid gap-3 sm:grid-cols-5">
      {bosqichlar.map((bosqich, indeks) => {
        const Ikonka = ikonka[bosqich.kalit];
        const rang = bosqich.holat === "done" ? "border-emerald-200 bg-emerald-50/70" : bosqich.holat === "current" ? "border-[#2563EB] bg-blue-50/70 ring-4 ring-blue-50" : "border-slate-200 bg-white";
        const belgi = bosqich.holat === "done" ? "bg-emerald-500 text-white" : bosqich.holat === "current" ? "bg-[#2563EB] text-white" : "bg-slate-100 text-slate-400";
        return (
          <li key={bosqich.kalit} className={`relative min-w-0 rounded-2xl border p-3.5 transition ${rang}`}>
            <div className="flex items-center gap-2.5">
              <span aria-hidden className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${belgi}`}>{bosqich.holat === "done" ? <CircleCheck size={17} /> : bosqich.holat === "skipped" ? <CircleSlash size={16} /> : <Ikonka size={16} />}</span>
              <span className="min-w-0">
                <span className="block text-[11px] font-black uppercase tracking-wide text-slate-400">{indeks + 1}-{t("orders.timeline.step")}</span>
                <span className="block truncate text-sm font-black text-slate-800">{t(`orders.timeline.${bosqich.kalit}`)}</span>
              </span>
            </div>
            <p className="mt-2 min-h-[2.5rem] text-xs font-semibold leading-5 text-slate-500">
              {bosqich.holat === "skipped" ? t("orders.timeline.skipped") : bosqich.sana ? (
                <>
                  <span className="block font-bold text-slate-700">{vaqtMatni(bosqich.sana) || kunMatni(bosqich.sana)}</span>
                  {(bosqich.raqam || (bosqich.kim && xodimlar.get(bosqich.kim))) && <span className="block truncate">{[bosqich.raqam, bosqich.kim ? xodimlar.get(bosqich.kim) : ""].filter(Boolean).join(" · ")}</span>}
                </>
              ) : yuklanmoqda && bosqich.kalit !== "close" ? <span className="text-slate-300">…</span> : bosqich.holat === "current" ? <span className="font-bold text-[#2563EB]">{t("orders.timeline.now")}</span> : <span className="text-slate-300">—</span>}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function BuyurtmaKorish({ id, nomlar, onYopish, onOzgardi, onTahrir }: { id: string; nomlar: Map<string, string>; onYopish: () => void; onOzgardi: () => void; onTahrir: (hujjat: Buyurtma) => void }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const navigate = useNavigate();
  const profil = useAuthProfileStore((holat) => holat.profil);
  const sozlama = useIshlabChiqarishStore((holat) => holat.sozlama);
  // Sozlamada "Xomashyo berish" bosqichi o'chirilgan: sexga berish tugmasi yashiriladi (server issue_stage_off qaytaradi).
  const berishYoq = sozlama?.issueStageEnabled === false;
  const hujjat = useMalumot(() => ishlabChiqarishApi.buyurtmalar.olish(id), id);
  const xodimlar = useXodimNomlari();
  const amal = useAmal();
  const fx = useMaydonXatolari(YAKUN_XATO_QOIDALARI);
  const [yakun, setYakun] = useState(false);
  const [yopishOchiq, setYopishOchiq] = useState(false);
  const [sabab, setSabab] = useState("");
  const buyurtma = hujjat.malumot;
  const status = buyurtma?.status ?? "";
  const qoralama = status === "DRAFT";
  const ochiq = OCHIQ_BUYURTMA.includes(status);
  const tahrirlanadi = buyurtmaTahrirlanadimi(status);
  // Band va yetishmovchilik ochiq buyurtmada o'zi yuklanadi (har amaldan keyin ham).
  const mavjudlik = useMalumot<Mavjudlik | null>(() => (ochiq ? ishlabChiqarishApi.buyurtmalar.mavjudlik(id) : Promise.resolve(null)), `${id}|${status}|${hujjat.malumot ? "1" : "0"}`);
  // Bosqichlar: sexga berish va smena hisobotlari ro'yxatida orderId filtri yo'q — brauzerda shu buyurtmaga ajratiladi.
  const bosqichManbasi = useMalumot(async () => {
    const [berishlar, hisobotlar, aktlar] = await Promise.all([
      ishlabChiqarishApi.berishlar.royxat().catch(() => []),
      ishlabChiqarishApi.smena.royxat().catch(() => []),
      ishlabChiqarishApi.qabul.royxat({ orderId: id }).catch(() => []),
    ]);
    return { berishlar, hisobotlar, aktlar };
  }, `${id}|${status}`);
  const qatorlar = mavjudlik.malumot?.items ?? buyurtma?.requirements ?? [];
  const bajar = <T,>(ish: () => Promise<T>, onXato?: (tafsilot: unknown) => void) => { fx.ornat({}); return amal.bajar(ish, onXato); };
  const bajarish = (ish: () => Promise<unknown>) => void bajar(async () => { await ish(); hujjat.qayta(); onOzgardi(); });
  const ombor = (omborId?: string) => (omborId ? nomlar.get(omborId) ?? "—" : "—");
  const qabulRuxsati = ishlabChiqarishRuxsati(profil, "qabul");
  const bosqichlar = buyurtma ? buyurtmaBosqichlari(buyurtma, bosqichManbasi.malumot ?? {}, berishYoq) : [];

  function yakunlash() {
    void bajar(async () => {
      await ishlabChiqarishApi.buyurtmalar.yakunlash(id, sabab.trim() || undefined);
      setYakun(false);
      hujjat.qayta();
      onOzgardi();
    }, fx.serverdan);
  }

  return (
    <Oyna keng ikonka={ClipboardList} sarlavha={buyurtma ? hujjatRaqami(buyurtma) || qatorNomi(buyurtma) : t("loading")} izoh={buyurtma && hujjatRaqami(buyurtma) ? qatorNomi(buyurtma) : undefined} belgi={<Holat status={status} />} onYopish={onYopish} pastki={buyurtma && <>
      {(qoralama || status === "CANCELLED") && <button type="button" disabled={amal.band} onClick={() => void bajar(async () => { await ishlabChiqarishApi.buyurtmalar.ochirish(id); onOzgardi(); onYopish(); })} className={tugmaXavfli}>{t("actions.delete")}</button>}
      {tahrirlanadi && <button type="button" disabled={amal.band} onClick={() => bajarish(() => ishlabChiqarishApi.buyurtmalar.bekorQilish(id))} className={tugmaXavfli}>{t("actions.cancelDocument")}</button>}
      {tahrirlanadi && <button type="button" onClick={() => onTahrir(buyurtma)} className={tugmaIkkinchi}>{t("actions.edit")}</button>}
      {ochiq && <button type="button" disabled={amal.band || mavjudlik.yuklanmoqda} onClick={mavjudlik.qayta} className={tugmaIkkinchi}><RefreshCw size={15} />{t("orders.checkAvailability")}</button>}
      {ochiq && !berishYoq && <button type="button" disabled={amal.band} onClick={() => void bajar(async () => { const berish = await ishlabChiqarishApi.berishlar.buyurtmadan(id); navigate(`/ishlab-chiqarish/sexga-berish?hujjat=${berish.id}`); })} className={tugmaIkkinchi}><PackageOpen size={15} />{t("orders.issue")}</button>}
      {status === "AWAITING_ACCEPTANCE" && qabulRuxsati && <button type="button" onClick={() => navigate("/ishlab-chiqarish/qabul")} className={tugmaIkkinchi}><ClipboardCheck size={15} />{t("orders.openAcceptance")}</button>}
      {buyurtmaYakunlanadimi(status) && status !== "AWAITING_ACCEPTANCE" && <button type="button" disabled={amal.band} onClick={() => setYakun(true)} className={tugmaIkkinchi}><CheckCircle2 size={16} />{t("orders.complete")}</button>}
      {YOPILADIGAN_BUYURTMA.includes(status) && <button type="button" disabled={amal.band} onClick={() => setYopishOchiq(true)} className={tugmaAsosiy}><Lock size={16} />{t("orders.close")}</button>}
      {qoralama && <button type="button" disabled={amal.band} onClick={() => void bajar(async () => { await ishlabChiqarishApi.buyurtmalar.chiqarish(id); hujjat.qayta(); onOzgardi(); })} className={tugmaAsosiy}><Rocket size={16} />{t("orders.release")}</button>}
    </>}>
      <XatoQutisi matn={hujjat.xato || fx.tepadagi || (fx.bor ? "" : amal.xato)} />
      {!buyurtma ? <Yuklanmoqda /> : <>
        <Bosqichlar bosqichlar={bosqichlar} xodimlar={xodimlar} yuklanmoqda={bosqichManbasi.yuklanmoqda} />
        <Tafsilotlar qatorlar={[
          { nom: t("fields.product"), qiymat: qatorNomi(buyurtma), keng: true },
          { nom: t("fields.progress"), qiymat: <Jarayon bajarilgan={buyurtma.produced ?? 0} reja={buyurtma.quantity} />, keng: true },
          { nom: t("fields.sourceWarehouse"), qiymat: ombor(buyurtma.sourceWarehouseId) },
          { nom: t("fields.destWarehouse"), qiymat: ombor(buyurtma.destWarehouseId) },
          { nom: t("orders.scrap"), qiymat: Number(buyurtma.scrap) > 0 ? <span className="text-amber-600">{miqdorMatni(buyurtma.scrap)}</span> : "—" },
          { nom: t("fields.dueDate"), qiymat: buyurtma.dueDate ? <span className={muddatOtganmi(buyurtma) ? "text-red-600" : ""}>{kunMatni(buyurtma.dueDate)}</span> : "—" },
        ]} />
        {status === "RETURNED" && <p className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700"><Undo2 size={18} className="mt-0.5 shrink-0" />{t("orders.returnedHint")}</p>}
        {status === "AWAITING_ACCEPTANCE" && <p className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-700"><Hourglass size={18} className="mt-0.5 shrink-0" />{t("orders.awaitingHint")}</p>}
        {berishYoq && ochiq && <p className="flex items-start gap-2 rounded-2xl bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-500"><CircleDashed size={18} className="mt-0.5 shrink-0" />{t("orders.issueStageOffHint")}</p>}
        {buyurtma.completionNote && <p className="rounded-2xl border border-orange-100 bg-white p-4 text-sm font-semibold text-slate-600"><span className="font-black text-slate-800">{t("orders.completeReason")}:</span> {buyurtma.completionNote}</p>}
        {buyurtma.note && <p className="rounded-2xl border border-orange-100 bg-white p-4 text-sm font-semibold text-slate-600"><span className="font-black text-slate-800">{t("fields.note")}:</span> {buyurtma.note}</p>}
        {buyurtma.completionSuggested && ochiq && <Ogohlantirish>{t("orders.completionSuggested")}</Ogohlantirish>}
        {buyurtma.close ? <YopishHujjati buyurtma={buyurtma} xodimlar={xodimlar} /> : (
          <Bolim ikonka={BookOpenCheck} sarlavha={t("orders.sectionRequirements")} izoh={qoralama ? t("orders.requirementsDraftHint") : ochiq ? t("orders.requirementsHint") : undefined} amal={ochiq && mavjudlik.malumot && (
            <span className="flex flex-wrap gap-2">
              {mavjudlik.malumot.hasShortage && <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600 ring-1 ring-red-100"><AlertTriangle size={13} />{t("orders.waitingMaterial")}</span>}
              {!mavjudlik.malumot.issuedFully && status !== "RELEASED" && <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-100"><CircleDashed size={13} />{t("orders.notFullyIssued")}</span>}
              {!mavjudlik.malumot.hasShortage && <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100"><CircleCheck size={13} />{t("orders.materialEnough")}</span>}
            </span>
          )}>
            <XatoQutisi matn={mavjudlik.xato} />
            <Jadval tableId="IshlabChiqarish/Buyurtmalar/jadval-4"
              ixcham
              yuklanmoqda={mavjudlik.yuklanmoqda && !mavjudlik.malumot}
              ustunlar={[
                { id: "buyurtmalar-column-13", nom: t("fields.product"), katak: (qator) => qatorNomi(qator) },
                { id: "buyurtmalar-column-14", nom: t("fields.required"), ong: true, katak: (qator) => miqdorMatni(qator.required ?? qator.quantity) },
                { id: "buyurtmalar-column-15", nom: t("fields.issued"), ong: true, katak: (qator) => miqdorMatni(qator.issued) },
                { id: "buyurtmalar-column-19", nom: t("fields.reserved"), ong: true, katak: (qator) => <span className="inline-flex items-center gap-1 font-bold text-sky-700">{Number(qator.reserved) > 0 && <Lock aria-hidden size={12} />}{miqdorMatni(qator.reserved)}</span> },
                { id: "buyurtmalar-column-16", nom: t("fields.available"), ong: true, katak: (qator) => miqdorMatni(qator.available) },
                { id: "buyurtmalar-column-17", nom: t("fields.shortage"), ong: true, katak: (qator) => <span className={Number(qator.shortage ?? 0) > 0 ? "font-black text-red-600" : ""}>{miqdorMatni(qator.shortage)}</span> },
              ]}
              qatorlar={qatorlar}
              kalit={(qator, indeks) => qator.modificationId ?? String(indeks)}
              bosh={t("empty.requirements")}
            />
          </Bolim>
        )}
        {yakun && (
          <Bolim ikonka={CheckCircle2} sarlavha={t("orders.complete")} izoh={t("orders.completeHint")}>
            <Maydon nom={t("orders.completeReason")} izoh={t("orders.completeReasonHint")} xato={fx.xato("reason")}><textarea value={sabab} rows={2} aria-invalid={Boolean(fx.xato("reason"))} onChange={(event) => { fx.tozala("reason"); setSabab(event.target.value); }} className={`${inputKlass} h-auto py-3`} /></Maydon>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { fx.ornat({}); setYakun(false); }} className={tugmaIkkinchi}>{t("actions.cancel")}</button>
              <button type="button" disabled={amal.band} onClick={yakunlash} className={tugmaAsosiy}>{t("orders.complete")}</button>
            </div>
          </Bolim>
        )}
      </>}
      {yopishOchiq && buyurtma && <YopishOynasi buyurtma={buyurtma} onYopish={() => setYopishOchiq(false)} onYopildi={() => { setYopishOchiq(false); hujjat.qayta(); onOzgardi(); }} />}
    </Oyna>
  );
}

/** Yopilgan buyurtmaning yopish hujjati: har xomashyo bo'yicha berildi, sarflandi, qaytdi, sexda qoldi, yo'qotish. */
function YopishHujjati({ buyurtma, xodimlar }: { buyurtma: Buyurtma; xodimlar: Map<string, string> }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const yopish = buyurtma.close;
  if (!yopish) return null;
  return (
    <Bolim ikonka={Lock} sarlavha={t("orders.closeDocument")} izoh={[vaqtMatni(yopish.date ?? yopish.createdAt ?? undefined), yopish.createdById ? xodimlar.get(yopish.createdById) : ""].filter(Boolean).join(" · ") || undefined}>
      <Jadval tableId="IshlabChiqarish/Buyurtmalar/jadval-5"
        ixcham
        ustunlar={yopishUstunlari(t, (qator) => miqdorMatni(qator.returned), (qator) => miqdorMatni(qator.kept), (qator) => <YoqotishMatni qiymat={Number(qator.loss) || 0} />)}
        qatorlar={yopish.lines ?? []}
        kalit={(qator, indeks) => `${qator.modificationId}-${indeks}`}
        bosh={t("orders.closeNoLines")}
      />
      {yopish.note && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600"><span className="font-black text-slate-800">{t("fields.note")}:</span> {yopish.note}</p>}
    </Bolim>
  );
}

function YoqotishMatni({ qiymat }: { qiymat: number }) {
  return qiymat > 0 ? <span className="font-black text-red-600">{miqdorMatni(qiymat)}</span> : qiymat < 0 ? <span className="font-black text-red-600">{miqdorMatni(qiymat)}</span> : <span className="text-slate-300">0</span>;
}

function yopishUstunlari<T extends YopishQatori>(t: (kalit: string) => string, qaytadi: (qator: T, indeks: number) => ReactNode, qoladi: (qator: T, indeks: number) => ReactNode, yoqotish: (qator: T, indeks: number) => ReactNode): Ustun<T>[] {
  return [
    { id: "yopish-column-1", nom: t("fields.product"), katak: (qator) => <span className="block max-w-[220px] truncate font-bold text-slate-800">{qatorNomi(qator)}</span> },
    { id: "yopish-column-2", nom: t("orders.closeIssued"), ong: true, katak: (qator) => miqdorMatni(qator.issued) },
    { id: "yopish-column-3", nom: t("orders.closeConsumed"), ong: true, katak: (qator) => miqdorMatni(qator.consumed) },
    { id: "yopish-column-4", nom: t("orders.closeExpected"), ong: true, katak: (qator) => <span className="font-black text-slate-900">{miqdorMatni(qator.expected)}</span> },
    { id: "yopish-column-5", nom: t("orders.closeReturned"), ong: true, katak: qaytadi },
    { id: "yopish-column-6", nom: t("orders.closeKept"), ong: true, katak: qoladi },
    { id: "yopish-column-7", nom: t("orders.closeLoss"), ong: true, katak: yoqotish },
  ];
}

/**
 * Buyurtmani yopish (faqat qabul qilingan): har xomashyo bo'yicha qancha asosiy omborga qaytadi va qancha sexda keyingi buyurtmaga
 * qoladi; qolgani yo'qotish. Standart — hammasi qaytadi. Masalan: 100 kg un berildi, 92 kg sarflandi → 8 kg ortishi kerak;
 * 5 kg qaytadi, 1 kg qoladi → 2 kg yo'qotish.
 */
function YopishOynasi({ buyurtma, onYopish, onYopildi }: { buyurtma: Buyurtma; onYopish: () => void; onYopildi: () => void }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const oldindan = useMalumot(() => ishlabChiqarishApi.buyurtmalar.yopishOldindan(buyurtma.id), buyurtma.id);
  const amal = useAmal();
  const fx = useMaydonXatolari(YOPISH_XATO_QOIDALARI);
  const [forma, setForma] = useState<YopishFormaQatori[] | null>(null);
  const [izoh, setIzoh] = useState("");
  const manba = oldindan.malumot ?? [];
  const qatorlar = forma ?? yopishFormasi(manba);
  const ozgar = (indeks: number, qism: Partial<YopishFormaQatori>) => {
    fx.tozala(`lines.${indeks}`, "lines");
    setForma(qatorlar.map((qator, i) => (i === indeks ? { ...qator, ...qism } : qator)));
  };
  const jamiYoqotish = qatorlar.reduce((jami, qator) => jami + Math.max(0, yopishYoqotishi(qator)), 0);

  function yopish() {
    const natija = yopishTanasiniYigish(qatorlar, izoh);
    if ("xato" in natija) return fx.tekshiruv(natija, t(natija.xato));
    fx.ornat({});
    void amal.bajar(async () => {
      await ishlabChiqarishApi.buyurtmalar.yopish(buyurtma.id, natija.tana);
      onYopildi();
    }, fx.serverdan);
  }

  const sonKatagi = (kalit: "returned" | "kept") => (qator: YopishQatori, indeks: number) => {
    const forma = qatorlar[indeks];
    const yol = `lines.${indeks}.${kalit}`;
    return (
      <span data-maydon-xato={fx.xato(yol) ? "true" : undefined} className="inline-grid justify-items-end gap-1">
        <input type="number" inputMode="decimal" min="0" step="any" value={forma?.[kalit] ?? ""} aria-label={`${t(kalit === "returned" ? "orders.closeReturned" : "orders.closeKept")} · ${qatorNomi(qator)}`} aria-invalid={Boolean(fx.xato(yol))} onChange={(event) => ozgar(indeks, { [kalit]: event.target.value })} className={`${inputKlass} h-11 w-28 text-right ${fx.xato(yol) ? xatoRamkasi : ""}`} />
        {fx.xato(yol) && <span role="alert" className="max-w-40 whitespace-normal text-right text-[11px] font-bold leading-4 text-red-600">{fx.xato(yol)}</span>}
      </span>
    );
  };

  return (
    <Oyna keng ikonka={Lock} sarlavha={t("orders.closeTitle", { raqam: hujjatRaqami(buyurtma) || qatorNomi(buyurtma) })} izoh={t("orders.closeHint")} onYopish={onYopish} pastki={<>
      <p className="mr-auto text-sm font-bold text-slate-500">{t("orders.closeLossTotal")}: <YoqotishMatni qiymat={Math.round(jamiYoqotish * 1000) / 1000} /></p>
      <button type="button" onClick={onYopish} className={tugmaIkkinchi}>{t("actions.cancel")}</button>
      <button type="button" disabled={amal.band || oldindan.yuklanmoqda || Boolean(oldindan.xato)} onClick={yopish} className={`${tugmaAsosiy} min-w-44`}><Lock size={17} />{t("orders.closeSubmit")}</button>
    </>}>
      <XatoQutisi matn={oldindan.xato || fx.tepadagi || (fx.bor ? "" : amal.xato)} />
      <p className="rounded-2xl border border-sky-100 bg-sky-50 px-5 py-4 text-sm font-semibold leading-6 text-sky-800">{t("orders.closeExample")}</p>
      <Bolim ikonka={Package} sarlavha={t("orders.closeLines")} izoh={t("orders.closeLinesHint")}>
        <Jadval tableId="IshlabChiqarish/Buyurtmalar/jadval-6"
          ixcham
          yuklanmoqda={oldindan.yuklanmoqda}
          ustunlar={yopishUstunlari(t, sonKatagi("returned"), sonKatagi("kept"), (_qator, indeks) => <YoqotishMatni qiymat={qatorlar[indeks] ? yopishYoqotishi(qatorlar[indeks]) : 0} />)}
          qatorlar={oldindan.yuklanmoqda ? [] : manba}
          kalit={(qator, indeks) => `${qator.modificationId}-${indeks}`}
          bosh={t("orders.closeNoLines")}
        />
      </Bolim>
      <Bolim ikonka={NotebookPen} sarlavha={t("fields.note")}>
        <textarea value={izoh} rows={2} aria-label={t("fields.note")} placeholder={t("orders.closeNotePlaceholder")} onChange={(event) => setIzoh(event.target.value)} className={`${inputKlass} h-auto py-3`} />
      </Bolim>
    </Oyna>
  );
}
