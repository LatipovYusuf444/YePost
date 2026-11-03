import { useMemo, useState, type ReactNode } from "react";
import { ArrowRight, Ban, BookOpenCheck, CalendarClock, CheckCircle2, CircleCheckBig, ClipboardCheck, ClipboardList, Factory, FilePen, NotebookPen, Package, PencilLine, Plus, Printer, RefreshCw, TimerOff, Warehouse } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ishlabChiqarishApi, yorliqniChopEtish } from "@/api/ishlabChiqarishApi";
import { apiTiliniOlish } from "@/api/apiLanguage";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { serverMatniUstunmi, xatoKodi, xatoKodiMatni } from "@/api/xatoKodlari";
import { bugungiToshkentKuni, kunMatni, toshkentKuni, vaqtMatni } from "@/lib/hujjatSanasi";
import { TOXTASH_SABABLARI, butunMiqdorXatolari, chiqimMiqdori, hisobotMahsuloti, holatBoyicha, hujjatRaqami, miqdorMatni, qatorNomi, qidiruvgaMos, raqamXaritasi, serverXatoMaydonlari, smenaTanasiniYigish, sonMaydoni, type SmenaFormasi, type XatoMaydonQoidasi } from "@/lib/ishlabChiqarish";
import { foydalanuvchiKursniOzgartiraOladimi } from "@/lib/roles";
import { useAuthProfileStore } from "@/store/authProfileStore";
import type { NavbatQatori, SmenaChiqimi, SmenaHisoboti, SmenaTanasi } from "@/types/ishlabChiqarish";
import { Asboblar, Bolim, HolatFiltri, HolatKartalari, Holat, Jadval, Jarayon, MahsulotQidiruvi, Maydon, MaydonXatosi, Ogohlantirish, OmborTanlash, Oyna, QatorKartasi, QatorOchirish, QatorQoshish, QidiruvMaydoni, Sahifa, Tafsilotlar, XatoQutisi, Yuklanmoqda, inputKlass, tugmaAsosiy, tugmaIkkinchi, tugmaXavfli, type HolatGuruhi, type Ustun } from "./umumiy";
import { useAmal, useMalumot, useMaydonXatolari, useOmborlar } from "./hooklar";

type KirimQatori = SmenaFormasi["inputs"][number] & { nom?: string };
type Forma = Omit<SmenaFormasi, "inputs"> & { sarlavha: string; inputs: KirimQatori[] };

const HOLATLAR = ["DRAFT", "CONFIRMED", "CANCELLED"];

const bosh = (qism: Partial<Forma>): Forma => ({ sarlavha: "", orderId: "", recipeId: "", destWarehouseId: "", shiftEndsAt: "", comment: "", outputs: [{ quantity: "", scrapQuantity: "", serial: "", modificationId: "", role: "" }], inputs: [], downtime: [], ...qism });

const raqam = (qiymat: unknown) => Number(qiymat) || 0;

// Server xatosi qaysi maydonga tegishli (validatsiya maydoni, xato kodi yoki xabardagi so'z). Kalit — backend maydon yo'li.
const SMENA_XATO_QOIDALARI: Record<string, XatoMaydonQoidasi> = {
  recipeId: { maydonlar: ["recipeId"], kodlar: ["recipe"], sozlar: ["recipe_not_active", "retsept", "рецепт"] },
  destWarehouseId: { maydonlar: ["destWarehouseId"], kodlar: ["dest_warehouse", "warehouse"], sozlar: ["tayyor mahsulot ombori", "склад готов"] },
  // Xabar kodning o'zi bo'lishi ham mumkin ("errors.production.comment_required").
  comment: { maydonlar: ["comment"], kodlar: ["comment_required"], sozlar: ["comment_required"] },
  outputs: { maydonlar: ["outputs"], kodlar: ["serial", "no_outputs"], sozlar: ["seriya", "серия"] },
  inputs: { maydonlar: ["inputs"], kodlar: ["input"] },
  downtime: { maydonlar: ["downtime"], kodlar: ["downtime"] },
};
const BEKOR_XATO_QOIDALARI: Record<string, XatoMaydonQoidasi> = {
  reason: { maydonlar: ["reason", "cancelReason"], kodlar: ["reason"], sozlar: ["sabab", "причин"] },
};
const TUZATISH_XATO_QOIDALARI: Record<string, XatoMaydonQoidasi> = {
  outputId: { maydonlar: ["outputId"] },
  delta: { maydonlar: ["delta"], kodlar: ["delta"] },
  reason: { maydonlar: ["reason"], kodlar: ["reason"], sozlar: ["sabab", "причин"] },
};

/** Server xatosi maydonlar bo'yicha. Xabar kod bo'lsa ("errors.production.comment_required"), maydon ostida tarjima qilingan matn chiqadi. */
function maydonMatnlari(tafsilot: unknown, qoidalar: Record<string, XatoMaydonQoidasi>) {
  const kod = xatoKodi(tafsilot);
  const xabar = tafsilot && typeof tafsilot === "object" ? (tafsilot as { message?: unknown }).message : undefined;
  const matn = serverMatniUstunmi(kod, xabar) ? String(xabar) : xatoKodiMatni(kod, undefined, apiTiliniOlish(), tafsilot) ?? "";
  const natija: Record<string, string> = {};
  for (const [yol, qiymat] of Object.entries(serverXatoMaydonlari(tafsilot, qoidalar))) {
    const toza = !qiymat.trim() || qiymat.trim().startsWith("errors.") ? matn || qiymat : qiymat;
    if (toza.trim()) natija[yol] = toza;
  }
  return natija;
}

/** Maydon xatolari + server xatosini bog'lash: maydonga bog'langan xato tepada (amal.xato) takrorlanmaydi. */
function useSmenaXatolari(qoidalar: Record<string, XatoMaydonQoidasi>, setXato: (matn: string) => void) {
  const fx = useMaydonXatolari(qoidalar);
  const serverdan = (tafsilot: unknown) => {
    const maydonlar = maydonMatnlari(tafsilot, qoidalar);
    fx.ornat(maydonlar);
    const boglandi = Object.keys(maydonlar).length > 0;
    if (boglandi) setXato("");
    return boglandi;
  };
  return { ...fx, serverdan };
}

/** Hisobot jamlari (faqat ko'rsatish): yaroqli mahsulot (chiqindi qatorlaridan tashqari, tuzatishlar bilan), brak va to'xtash soati. */
function hisobotJamlari(hisobot: Pick<SmenaHisoboti, "outputs" | "downtime">) {
  const chiqimlar = hisobot.outputs ?? [];
  return {
    // Rol berilmagan qator server tomonda asosiy mahsulot: faqat WASTE chiqarib tashlanadi.
    yaroqli: chiqimlar.filter((qator) => qator.role !== "WASTE").reduce((jami, qator) => jami + chiqimMiqdori(qator), 0),
    brak: chiqimlar.reduce((jami, qator) => jami + raqam(qator.scrapQuantity), 0),
    toxtash: (hisobot.downtime ?? []).reduce((jami, qator) => jami + raqam(qator.hours), 0),
  };
}

/** Nol bo'lsa xira chiziqcha, aks holda miqdor. */
function miqdorYokiChiziq(qiymat: number, rang = "") {
  return qiymat ? <span className={rang}>{miqdorMatni(qiymat)}</span> : <span className="text-slate-300">—</span>;
}

export default function Smena() {
  const { t } = useTranslation("ishlab_chiqarish");
  const omborlar = useOmborlar();
  const [warehouseId, setWarehouseId] = useState("");
  const navbat = useMalumot(() => ishlabChiqarishApi.smena.navbat(warehouseId || undefined), warehouseId);
  const hisobotlar = useMalumot(() => ishlabChiqarishApi.smena.royxat(), "reports");
  const buyurtmalar = useMalumot(() => ishlabChiqarishApi.buyurtmalar.royxat(), "orders");
  const buyurtmaRaqamlari = useMemo(() => raqamXaritasi(buyurtmalar.malumot), [buyurtmalar.malumot]);
  const nomlar = useMemo(() => new Map(omborlar.map((ombor) => [ombor.id, ombor.name])), [omborlar]);
  const [forma, setForma] = useState<{ id?: string; qiymat: Forma } | null>(null);
  const [ochiq, setOchiq] = useState<string | null>(null);
  const [filtr, setFiltr] = useState<{ kalit: string; holatlar: string[] } | null>(null);
  const [qidiruv, setQidiruv] = useState("");
  const yangilash = () => { navbat.qayta(); hisobotlar.qayta(); };
  const buyurtmasizOchish = () => setForma({ qiymat: bosh({ sarlavha: t("shift.withoutOrder") }) });
  const navbatQatorlari = navbat.malumot ?? [];
  const hammasi = useMemo(() => hisobotlar.malumot ?? [], [hisobotlar.malumot]);
  const qatorlar = useMemo(
    () => holatBoyicha(hammasi, filtr?.holatlar ?? null).filter((hujjat) => qidiruvgaMos(qidiruv, [hujjatRaqami(hujjat), buyurtmaRaqamlari.get(hujjat.orderId ?? ""), qatorNomi(hisobotMahsuloti(hujjat)), hujjat.comment])),
    [hammasi, filtr, qidiruv, buyurtmaRaqamlari]
  );
  const guruhlar: HolatGuruhi[] = [
    { kalit: "jami", nom: t("shift.kpi.total"), holatlar: null, rang: "blue", ikonka: ClipboardList },
    { kalit: "qoralama", nom: t("shift.kpi.draft"), holatlar: ["DRAFT"], rang: "amber", ikonka: FilePen },
    { kalit: "tasdiqlangan", nom: t("shift.kpi.confirmed"), holatlar: ["CONFIRMED"], rang: "emerald", ikonka: CircleCheckBig },
    { kalit: "bekor", nom: t("shift.kpi.cancelled"), holatlar: ["CANCELLED"], rang: "rose", ikonka: Ban },
  ];
  const ustunlar: Ustun<SmenaHisoboti>[] = [
    { nom: t("fields.document"), katak: (hujjat) => hujjatRaqami(hujjat) ? <span className="font-black text-slate-900">{hujjatRaqami(hujjat)}</span> : <span className="text-slate-400">{t("status.DRAFT")}</span> },
    { nom: t("fields.order"), katak: (hujjat) => (hujjat.orderId ? buyurtmaRaqamlari.get(hujjat.orderId) || "—" : <span className="text-slate-400">{t("shift.withoutOrder")}</span>) },
    { nom: t("fields.product"), katak: (hujjat) => <span className="block max-w-[260px] truncate font-bold text-slate-800">{qatorNomi(hisobotMahsuloti(hujjat))}</span> },
    { nom: t("shift.goodOutput"), ong: true, katak: (hujjat) => miqdorYokiChiziq(hisobotJamlari(hujjat).yaroqli, "font-black text-slate-900") },
    { nom: t("fields.scrapQuantity"), ong: true, katak: (hujjat) => miqdorYokiChiziq(hisobotJamlari(hujjat).brak, "font-bold text-amber-600") },
    { nom: t("shift.downtimeHours"), ong: true, katak: (hujjat) => miqdorYokiChiziq(hisobotJamlari(hujjat).toxtash, "font-bold text-red-600") },
    { nom: t("shift.shiftEndsAt"), katak: (hujjat) => vaqtMatni(hujjat.shiftEndsAt ?? undefined) || "—" },
    { nom: t("fields.status"), katak: (hujjat) => <Holat status={hujjat.status} /> },
  ];
  const buyurtmasizTugma = <button type="button" onClick={buyurtmasizOchish} className={tugmaIkkinchi}><Plus size={16} />{t("shift.withoutOrder")}</button>;
  // Hisobot bor, lekin qidiruv yoki filtr hech narsa qoldirmagan.
  const filtrlangan = hammasi.length > 0;
  return (
    <Sahifa
      sarlavha={t("shift.title")}
      izoh={t("shift.subtitle")}
      amal={<>
        <div className="w-60"><OmborTanlash sexMi value={warehouseId} omborlar={omborlar} ariaLabel={t("fields.wipWarehouse")} onChange={setWarehouseId} /></div>
        <button type="button" onClick={yangilash} aria-label={t("actions.refresh")} className={tugmaIkkinchi}><RefreshCw size={16} /></button>
        <button type="button" onClick={buyurtmasizOchish} className={tugmaIkkinchi}><Plus size={16} />{t("shift.withoutOrder")}</button>
      </>}
    >
      <BolimSarlavhasi ikonka={Factory} sarlavha={t("shift.queueTitle")} izoh={t("shift.queueHint")} soni={navbat.malumot ? navbatQatorlari.length : undefined} />
      <XatoQutisi matn={navbat.xato} />
      {navbat.yuklanmoqda && !navbat.malumot ? <Yuklanmoqda /> : navbatQatorlari.length === 0 ? (
        <div className="flex flex-col items-center rounded-[30px] border border-dashed border-orange-200 bg-white/70 px-6 py-10 text-center">
          <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-3xl bg-orange-50 text-[#2563EB] ring-1 ring-orange-100"><Factory size={26} /></span>
          <p className="mt-4 text-lg font-black text-slate-800">{t("empty.queue")}</p>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">{t("shift.queueEmptyHint")}</p>
          <div className="mt-5">{buyurtmasizTugma}</div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {navbatQatorlari.map((qator) => <NavbatKartasi key={qator.orderId} qator={qator} onBos={() => setForma({ qiymat: bosh({ orderId: qator.orderId, sarlavha: `${qator.docNumber ?? ""} · ${qator.productName ?? ""}` }) })} />)}
        </div>
      )}
      <div className="space-y-5 pt-2">
        <BolimSarlavhasi ikonka={ClipboardCheck} sarlavha={t("shift.reports")} soni={hisobotlar.malumot ? hammasi.length : undefined} />
        <HolatKartalari guruhlar={guruhlar} qatorlar={hammasi} tanlangan={filtr?.kalit ?? ""} yuklanmoqda={hisobotlar.yuklanmoqda && !hisobotlar.malumot} onTanlash={(guruh) => setFiltr(guruh?.holatlar ? { kalit: guruh.kalit, holatlar: guruh.holatlar } : null)} />
        <Asboblar>
          <QidiruvMaydoni qiymat={qidiruv} onChange={setQidiruv} placeholder={t("shift.searchPlaceholder")} />
          <HolatFiltri qiymat={filtr?.holatlar.length === 1 ? filtr.holatlar[0] : ""} onChange={(holat) => setFiltr(holat ? { kalit: holat, holatlar: [holat] } : null)} holatlar={HOLATLAR} />
        </Asboblar>
        <XatoQutisi matn={hisobotlar.xato} />
        <Jadval
          ustunlar={ustunlar}
          qatorlar={qatorlar}
          kalit={(hujjat) => hujjat.id}
          onBos={(hujjat) => setOchiq(hujjat.id)}
          yuklanmoqda={hisobotlar.yuklanmoqda && !hisobotlar.malumot}
          sahifaHajmi={20}
          boshIkonka={ClipboardCheck}
          bosh={filtrlangan ? t("shift.emptyFiltered") : t("empty.reports")}
          boshIzoh={filtrlangan ? t("orders.emptyFilteredHint") : <IshTartibi />}
          boshAmal={filtrlangan ? <button type="button" onClick={() => { setFiltr(null); setQidiruv(""); }} className={tugmaIkkinchi}>{t("actions.resetFilters")}</button> : buyurtmasizTugma}
        />
      </div>
      {forma && <SmenaOynasi boshlangich={forma} omborlar={omborlar} onYopish={() => setForma(null)} onOzgardi={yangilash} onOchish={(id) => { setForma(null); setOchiq(id); }} />}
      {ochiq && <HisobotKorish id={ochiq} nomlar={nomlar} buyurtmaRaqamlari={buyurtmaRaqamlari} onYopish={() => setOchiq(null)} onOzgardi={yangilash} onTahrir={(hujjat) => { setOchiq(null); setForma({ id: hujjat.id, qiymat: formagaOtkazish(hujjat, t("shift.report")) }); }} />}
    </Sahifa>
  );
}

/** Sahifadagi bo'lim sarlavhasi (navbat, hisobotlar): ikonka, nom, soni va izoh. */
function BolimSarlavhasi({ ikonka: Ikonka, sarlavha, izoh, soni }: { ikonka: typeof Factory; sarlavha: string; izoh?: string; soni?: number }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#2563EB] ring-1 ring-orange-100"><Ikonka size={19} /></span>
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-base font-black uppercase tracking-wide text-slate-600">
          {sarlavha}
          {soni !== undefined && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-black text-slate-500">{soni}</span>}
        </h2>
        {izoh && <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-400">{izoh}</p>}
      </div>
    </div>
  );
}

/** Bo'sh ro'yxatda: smena hisoboti nima va qaysi tartibda yoziladi. */
function IshTartibi() {
  const { t } = useTranslation("ishlab_chiqarish");
  const qadamlar = [t("shift.flow.pick"), t("shift.flow.write"), t("shift.flow.close")];
  return (
    <div className="space-y-5">
      <p>{t("shift.emptyHint")}</p>
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

function NavbatKartasi({ qator, onBos }: { qator: NavbatQatori; onBos: () => void }) {
  const { t } = useTranslation("ishlab_chiqarish");
  // Muddati o'tgan va hali qoldig'i bor buyurtma qizil sana bilan.
  const muddatOtgan = Boolean(qator.dueDate) && raqam(qator.remaining) > 0 && toshkentKuni(qator.dueDate ?? undefined) < bugungiToshkentKuni();
  return (
    <button type="button" onClick={onBos} className="group flex flex-col rounded-[26px] border border-orange-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-[0_18px_40px_rgba(37,99,235,.12)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100">
      <span className="flex items-center justify-between gap-2">
        <span className="rounded-xl bg-orange-50 px-2.5 py-1 text-xs font-black text-[#2563EB] ring-1 ring-orange-100">{qator.docNumber || "—"}</span>
        <span className="flex items-center gap-2">
          {qator.dueDate && <span className={`inline-flex items-center gap-1 text-xs font-bold ${muddatOtgan ? "text-red-600" : "text-slate-400"}`}><CalendarClock size={14} />{kunMatni(qator.dueDate)}</span>}
          <Holat status={qator.status} />
        </span>
      </span>
      <span className="mt-3 block truncate text-lg font-black text-slate-900">{qator.productName || "—"}</span>
      <span className="mt-4 block"><Jarayon bajarilgan={qator.produced ?? 0} reja={qator.quantity} /></span>
      <span className="mt-4 flex items-center justify-between gap-3 border-t border-orange-100 pt-4">
        <span className="text-sm font-black text-slate-700">{t("shift.remaining", { miqdor: miqdorMatni(qator.remaining) })}</span>
        <span className="inline-flex items-center gap-1.5 text-sm font-black text-[#2563EB]">{t("shift.writeReport")}<ArrowRight size={16} className="transition group-hover:translate-x-0.5" /></span>
      </span>
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
    // To'liq ISO saqlanadi: kesib qayta o'qilsa mahalliy vaqt deb olinib, har tahrirda +5 soat siljiydi.
    shiftEndsAt: hujjat.shiftEndsAt ?? "",
    comment: hujjat.comment ?? "",
    outputs: (hujjat.outputs ?? []).map((qator) => ({ quantity: matn(qator.quantity), scrapQuantity: matn(qator.scrapQuantity), serial: qator.serial ?? "", modificationId: qator.modificationId ?? "", role: qator.role === "WASTE" || qator.role === "MAIN" ? qator.role : "" })),
    inputs: (hujjat.inputs ?? []).map((qator) => ({ modificationId: qator.modificationId, nom: qatorNomi(qator), quantity: matn(qator.quantity), entryMethod: qator.entryMethod === "NORM" ? "NORM" : "ACTUAL", offRecipe: Boolean(qator.offRecipe) })),
    downtime: (hujjat.downtime ?? []).map((qator) => ({ reason: qator.reason, hours: matn(qator.hours), note: qator.note ?? "" })),
  };
}

/** Kichik ko'rsatkich plitkasi (forma yakuni). */
function Plitka({ nom, qiymat }: { nom: string; qiymat: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">{nom}</dt>
      <dd className="mt-1 truncate text-lg font-black tabular-nums text-slate-800">{qiymat}</dd>
    </div>
  );
}

function SmenaOynasi({ boshlangich, omborlar, onYopish, onOzgardi, onOchish }: { boshlangich: { id?: string; qiymat: Forma }; omborlar: ReturnType<typeof useOmborlar>; onYopish: () => void; onOzgardi: () => void; onOchish: (id: string) => void }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const [forma, setForma] = useState(boshlangich.qiymat);
  // Xato bilan yopilmagan hisobot qoralamada qoladi: keyingi urinish yangi hujjat emas, shu qoralamani yangilaydi.
  const [id, setId] = useState(boshlangich.id);
  const [xatoMatni, setXatoMatni] = useState("");
  const amal = useAmal();
  const smenaXatolari = useSmenaXatolari(SMENA_XATO_QOIDALARI, amal.setXato);
  // Dona mahsulotga kasr miqdor (quantity_not_whole), qator aytilmagan: kasr miqdorli chiqish va qo'lda kiritilgan sarf qatorlari belgilanadi
  // (norma bo'yicha to'lgan qator kasr bo'lishi mumkin — u belgilanmaydi).
  const fx = {
    ...smenaXatolari,
    serverdan: (tafsilot: unknown) => {
      const butun = butunMiqdorXatolari(
        tafsilot,
        [
          ...forma.outputs.map((qator, i) => ({ yol: `outputs.${i}.quantity`, miqdor: qator.quantity })),
          ...forma.inputs.flatMap((qator, i) => (qator.entryMethod === "NORM" ? [] : [{ yol: `inputs.${i}.quantity`, miqdor: qator.quantity }])),
        ],
        t("errors.quantityNotWhole")
      );
      if (!butun) return smenaXatolari.serverdan(tafsilot);
      smenaXatolari.ornat(butun);
      amal.setXato("");
      return true;
    },
  };
  const izohXatosi = fx.xato("comment");
  const buyurtmasiz = !forma.orderId;
  const retseptlar = useMalumot(() => (buyurtmasiz ? ishlabChiqarishApi.retseptlar.royxat({ status: "ACTIVE" }) : Promise.resolve([])), String(buyurtmasiz));
  const ozgar = (qism: Partial<Forma>) => setForma((joriy) => ({ ...joriy, ...qism }));
  // Qator maydoni o'zgarsa uning xatosi (ro'yxat xatosi bo'lsa, u ham) olib tashlanadi.
  const qatorXatosiniTozala = (royxat: "outputs" | "inputs" | "downtime", indeks: number, qism: object) =>
    fx.tozala(...Object.keys(qism).map((kalit) => `${royxat}.${indeks}.${kalit}`), ...(fx.xato(royxat) ? [royxat] : []));
  const chiqim = (indeks: number, qism: Partial<Forma["outputs"][number]>) => { qatorXatosiniTozala("outputs", indeks, qism); ozgar({ outputs: forma.outputs.map((qator, i) => (i === indeks ? { ...qator, ...qism } : qator)) }); };
  const kirim = (indeks: number, qism: Partial<KirimQatori>) => { qatorXatosiniTozala("inputs", indeks, qism); ozgar({ inputs: forma.inputs.map((qator, i) => (i === indeks ? { ...qator, ...qism } : qator)) }); };
  const toxtash = (indeks: number, qism: Partial<Forma["downtime"][number]>) => { qatorXatosiniTozala("downtime", indeks, qism); ozgar({ downtime: forma.downtime.map((qator, i) => (i === indeks ? { ...qator, ...qism } : qator)) }); };
  // Qator qo'shilsa yoki o'chirilsa indekslar siljiydi: shu ro'yxatdagi barcha xatolar olib tashlanadi.
  const qatorlarniOzgartir = (qism: Partial<Pick<Forma, "outputs" | "inputs" | "downtime">>) => { fx.tozala(...Object.keys(qism)); ozgar(qism); };
  // Forma yakuni (faqat ko'rsatish): yozilgan miqdor, brak va to'xtash soati.
  const jamiMiqdor = forma.outputs.reduce((jami, qator) => jami + (sonMaydoni(qator.quantity) ?? 0), 0);
  const jamiBrak = forma.outputs.reduce((jami, qator) => jami + (sonMaydoni(qator.scrapQuantity) ?? 0), 0);
  const jamiToxtash = forma.downtime.reduce((jami, qator) => jami + (sonMaydoni(qator.hours) ?? 0), 0);

  /** Forma tekshiruvi: xato bo'lsa maydon qizil bo'ladi va `null` qaytadi. */
  function tanaYigish() {
    const natija = smenaTanasiniYigish(forma);
    if (!("xato" in natija)) return natija.tana;
    setXatoMatni("");
    amal.setXato("");
    // Retsept ham, ombor ham tanlanmagan bo'lsa ikkalasi qizil bo'ladi.
    if (natija.xato === "errors.orderOrRecipe" && !forma.recipeId && !forma.destWarehouseId) fx.ornat({ recipeId: t(natija.xato), destWarehouseId: t(natija.xato) });
    else fx.tekshiruv(natija, t(natija.xato));
    return null;
  }
  async function saqlangan(tana: SmenaTanasi) {
    const hujjat = id ? await ishlabChiqarishApi.smena.yangilash(id, tana) : await ishlabChiqarishApi.smena.yaratish(tana);
    setId(hujjat.id);
    return hujjat;
  }
  const qoralamaSaqlash = () => {
    const tana = tanaYigish();
    if (!tana) return;
    setXatoMatni("");
    fx.ornat({});
    void amal.bajar(async () => { await saqlangan(tana); onOzgardi(); onYopish(); }, fx.serverdan);
  };
  // Xato maydon yonida ko'rsatiladi: comment_required — izoh yozib qayta bosiladi, costing_card_missing — hisobot qoralamada qoladi.
  const smenaniYopish = () => {
    const tana = tanaYigish();
    if (!tana) return;
    setXatoMatni("");
    fx.ornat({});
    void amal.bajar(async () => {
      const hujjat = await saqlangan(tana);
      onOzgardi();
      try {
        await ishlabChiqarishApi.smena.tasdiqlash(hujjat.id);
      } catch (error) {
        // Qoralama saqlangan: xato maydonga bog'lansa o'sha maydon ostida, aks holda tepada.
        const boglandi = fx.serverdan((error as { response?: { data?: unknown } }).response?.data);
        setXatoMatni(boglandi ? "" : getApiErrorMessage(error));
        return;
      }
      onOzgardi();
      onOchish(hujjat.id);
    }, fx.serverdan);
  };

  return (
    <Oyna keng ikonka={Factory} sarlavha={forma.sarlavha} izoh={t("shift.formHint")} onYopish={onYopish} pastki={<>
      <button type="button" disabled={amal.band} onClick={qoralamaSaqlash} className={tugmaIkkinchi}>{t("shift.saveDraft")}</button>
      <button type="button" disabled={amal.band} onClick={smenaniYopish} className={`${tugmaAsosiy} h-14 px-8 text-base`}><CheckCircle2 size={20} />{t("shift.close")}</button>
    </>}>
      <XatoQutisi matn={fx.tepadagi || (fx.bor ? "" : xatoMatni || amal.xato)} />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          {buyurtmasiz && (
            <Bolim ikonka={Warehouse} sarlavha={t("shift.sectionRecipe")} izoh={t("shift.recipeHint")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Maydon nom={t("fields.recipe")} xato={fx.xato("recipeId")}>
                  <select value={forma.recipeId} onChange={(event) => { fx.tozala("recipeId"); ozgar({ recipeId: event.target.value }); }} className={inputKlass}>
                    <option value="">{t("fields.selectRecipe")}</option>
                    {(retseptlar.malumot ?? []).map((retsept) => <option key={retsept.id} value={retsept.id}>{qatorNomi(retsept)}{retsept.version ? ` · v${retsept.version}` : ""}</option>)}
                  </select>
                </Maydon>
                <Maydon nom={t("fields.destWarehouse")} xato={fx.xato("destWarehouseId")}><OmborTanlash value={forma.destWarehouseId} omborlar={omborlar} onChange={(destWarehouseId) => { fx.tozala("destWarehouseId"); ozgar({ destWarehouseId }); }} /></Maydon>
              </div>
            </Bolim>
          )}
          <Bolim ikonka={Package} sarlavha={t("shift.outputs")} izoh={t("shift.outputsHint")}>
            {forma.outputs.map((qator, indeks) => (
              <QatorKartasi key={indeks} className="sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_48px]">
                <Maydon nom={t("shift.weightOrQuantity")} xato={fx.xato(`outputs.${indeks}.quantity`)}><input type="number" inputMode="decimal" min="0" step="any" value={qator.quantity} onChange={(event) => chiqim(indeks, { quantity: event.target.value })} className={`${inputKlass} h-14 text-lg`} /></Maydon>
                <Maydon nom={t("fields.scrapQuantity")} xato={fx.xato(`outputs.${indeks}.scrapQuantity`)}><input type="number" inputMode="decimal" min="0" step="any" value={qator.scrapQuantity} onChange={(event) => chiqim(indeks, { scrapQuantity: event.target.value })} className={`${inputKlass} h-14 text-lg`} /></Maydon>
                <Maydon nom={t("fields.serial")} xato={fx.xato(`outputs.${indeks}.serial`)}><input value={qator.serial} placeholder={t("shift.serialAuto")} onChange={(event) => chiqim(indeks, { serial: event.target.value })} className={`${inputKlass} h-14`} /></Maydon>
                <div className="flex h-14 items-center"><QatorOchirish disabled={forma.outputs.length === 1} onClick={() => qatorlarniOzgartir({ outputs: forma.outputs.filter((_, i) => i !== indeks) })} /></div>
              </QatorKartasi>
            ))}
            <MaydonXatosi matn={fx.xato("outputs")} />
            <QatorQoshish matn={t("shift.addRoll")} onClick={() => qatorlarniOzgartir({ outputs: [...forma.outputs, { quantity: "", scrapQuantity: "", serial: "", modificationId: "", role: "" }] })} />
          </Bolim>
          <Bolim ikonka={BookOpenCheck} sarlavha={t("shift.inputs")} izoh={t("shift.inputsHint")}>
            {forma.inputs.map((qator, indeks) => (
              <QatorKartasi key={indeks} className="md:grid-cols-[minmax(0,2fr)_130px_150px_48px]">
                <Maydon nom={qator.offRecipe ? t("shift.offRecipeLine") : t("fields.product")} xato={fx.xato(`inputs.${indeks}.modificationId`)}><MahsulotQidiruvi value={qator.modificationId} nom={qator.nom} onChange={(modificationId, nom) => kirim(indeks, { modificationId, nom })} /></Maydon>
                <Maydon nom={t("fields.quantity")} xato={fx.xato(`inputs.${indeks}.quantity`)}><input type="number" inputMode="decimal" min="0" step="any" value={qator.quantity} onChange={(event) => kirim(indeks, { quantity: event.target.value })} className={inputKlass} /></Maydon>
                <Maydon nom={t("fields.entryMethod")} xato={fx.xato(`inputs.${indeks}.entryMethod`)}>
                  <select value={qator.entryMethod} onChange={(event) => kirim(indeks, { entryMethod: event.target.value as KirimQatori["entryMethod"] })} className={inputKlass}>
                    <option value="ACTUAL">{t("entryMethod.ACTUAL")}</option>
                    <option value="NORM">{t("entryMethod.NORM")}</option>
                  </select>
                </Maydon>
                <QatorOchirish onClick={() => qatorlarniOzgartir({ inputs: forma.inputs.filter((_, i) => i !== indeks) })} />
              </QatorKartasi>
            ))}
            <MaydonXatosi matn={fx.xato("inputs")} />
            <div className="flex flex-wrap gap-2">
              <QatorQoshish matn={t("shift.addInput")} onClick={() => qatorlarniOzgartir({ inputs: [...forma.inputs, { modificationId: "", quantity: "", entryMethod: "ACTUAL", offRecipe: false }] })} />
              <QatorQoshish matn={t("shift.addOffRecipe")} onClick={() => qatorlarniOzgartir({ inputs: [...forma.inputs, { modificationId: "", quantity: "", entryMethod: "ACTUAL", offRecipe: true }] })} />
            </div>
          </Bolim>
        </div>
        <div className="space-y-5">
          <Bolim ikonka={ClipboardCheck} sarlavha={t("shift.summary")}>
            <dl className="grid grid-cols-2 gap-3">
              <Plitka nom={t("shift.summaryLines")} qiymat={forma.outputs.length} />
              <Plitka nom={t("shift.weightOrQuantity")} qiymat={miqdorYokiChiziq(jamiMiqdor)} />
              <Plitka nom={t("fields.scrapQuantity")} qiymat={miqdorYokiChiziq(jamiBrak, "text-amber-600")} />
              <Plitka nom={t("shift.downtimeHours")} qiymat={miqdorYokiChiziq(jamiToxtash, "text-red-600")} />
            </dl>
          </Bolim>
          <Bolim ikonka={TimerOff} sarlavha={t("shift.downtime")} izoh={t("shift.downtimeHint")}>
            {forma.downtime.length === 0 && <p className="rounded-2xl bg-slate-50 px-4 py-4 text-center text-sm font-semibold text-slate-400">{t("shift.noDowntime")}</p>}
            {forma.downtime.map((qator, indeks) => (
              <QatorKartasi key={indeks} className="grid-cols-[minmax(0,1fr)_110px_48px]">
                <Maydon nom={t("fields.downtimeReason")} xato={fx.xato(`downtime.${indeks}.reason`)}>
                  <select value={qator.reason} onChange={(event) => toxtash(indeks, { reason: event.target.value as Forma["downtime"][number]["reason"] })} className={inputKlass}>
                    {TOXTASH_SABABLARI.map((sabab) => <option key={sabab} value={sabab}>{t(`downtime.${sabab}`)}</option>)}
                  </select>
                </Maydon>
                <Maydon nom={t("fields.hours")} xato={fx.xato(`downtime.${indeks}.hours`)}><input type="number" inputMode="decimal" min="0" step="any" value={qator.hours} onChange={(event) => toxtash(indeks, { hours: event.target.value })} className={inputKlass} /></Maydon>
                <QatorOchirish onClick={() => qatorlarniOzgartir({ downtime: forma.downtime.filter((_, i) => i !== indeks) })} />
                <Maydon nom={t("fields.note")} className="col-span-3" xato={fx.xato(`downtime.${indeks}.note`)}><input value={qator.note} onChange={(event) => toxtash(indeks, { note: event.target.value })} className={inputKlass} /></Maydon>
              </QatorKartasi>
            ))}
            <MaydonXatosi matn={fx.xato("downtime")} />
            <QatorQoshish matn={t("shift.addDowntime")} onClick={() => qatorlarniOzgartir({ downtime: [...forma.downtime, { reason: "BREAKDOWN", hours: "", note: "" }] })} />
          </Bolim>
          <Bolim ikonka={NotebookPen} sarlavha={t("fields.comment")} className={izohXatosi ? "border-red-200 ring-4 ring-red-50" : ""}>
            <textarea value={forma.comment} rows={3} autoFocus={Boolean(izohXatosi)} aria-label={t("fields.comment")} aria-invalid={Boolean(izohXatosi)} placeholder={t("shift.commentPlaceholder")} onChange={(event) => { ozgar({ comment: event.target.value }); fx.tozala("comment"); }} className={`${inputKlass} h-auto py-3 ${izohXatosi ? "border-red-400 ring-4 ring-red-100" : ""}`} />
            {izohXatosi && <p role="alert" data-maydon-xato="true" className="text-xs font-bold text-red-600">{izohXatosi}</p>}
          </Bolim>
        </div>
      </div>
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

function HisobotKorish({ id, nomlar, buyurtmaRaqamlari, onYopish, onOzgardi, onTahrir }: { id: string; nomlar: Map<string, string>; buyurtmaRaqamlari: Map<string, string>; onYopish: () => void; onOzgardi: () => void; onTahrir: (hujjat: SmenaHisoboti) => void }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const profil = useAuthProfileStore((holat) => holat.profil);
  const hujjat = useMalumot(() => ishlabChiqarishApi.smena.olish(id), id);
  const amal = useAmal();
  const fxBekor = useSmenaXatolari(BEKOR_XATO_QOIDALARI, amal.setXato);
  const fxTuzatish = useSmenaXatolari(TUZATISH_XATO_QOIDALARI, amal.setXato);
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
  const jamlar = hisobot ? hisobotJamlari(hisobot) : null;

  // Har yangi amaldan oldin eski maydon xatolari olib tashlanadi.
  const bajar = (ish: () => Promise<unknown>, onXato?: (tafsilot: unknown) => void) => { fxBekor.ornat({}); fxTuzatish.ornat({}); return amal.bajar(ish, onXato); };
  const tasdiqlash = () => void bajar(async () => { await ishlabChiqarishApi.smena.tasdiqlash(id); hujjat.qayta(); onOzgardi(); });
  const bekorQilish = () => void bajar(async () => { await ishlabChiqarishApi.smena.bekorQilish(id, sabab.trim() || undefined); hujjat.qayta(); onOzgardi(); }, fxBekor.serverdan);
  // Tekshiruv qoidalari o'zgarmagan: barcha xatoli maydonlar birdaniga qizil bo'ladi.
  function tuzatish() {
    const son = sonMaydoni(delta);
    const xatolar: Record<string, string> = {};
    if (!outputId) xatolar.outputId = t("errors.correctionOutput");
    if (son === undefined || son === 0) xatolar.delta = t("errors.correctionDelta");
    if (!tuzatishSababi.trim()) xatolar.reason = t("errors.correctionReason");
    if (Object.keys(xatolar).length || son === undefined) {
      amal.setXato("");
      fxBekor.ornat({});
      return fxTuzatish.ornat(xatolar);
    }
    void bajar(async () => {
      await ishlabChiqarishApi.smena.tuzatish(id, { outputId, delta: son, reason: tuzatishSababi.trim() });
      setTuzatishOchiq(false);
      hujjat.qayta();
      onOzgardi();
    }, fxTuzatish.serverdan);
  }

  return (
    <Oyna keng ikonka={ClipboardCheck} sarlavha={hisobot ? hujjatRaqami(hisobot) || t("shift.report") : t("loading")} izoh={hisobot ? qatorNomi(hisobotMahsuloti(hisobot)) : undefined} belgi={<Holat status={hisobot?.status} />} onYopish={onYopish} pastki={hisobot && <>
      {qoralama && <button type="button" disabled={amal.band} onClick={() => void bajar(async () => { await ishlabChiqarishApi.smena.ochirish(id); onOzgardi(); onYopish(); })} className={tugmaXavfli}>{t("actions.delete")}</button>}
      {qoralama && <button type="button" onClick={() => onTahrir(hisobot)} className={tugmaIkkinchi}>{t("actions.edit")}</button>}
      {qoralama && <button type="button" disabled={amal.band} onClick={tasdiqlash} className={tugmaAsosiy}><CheckCircle2 size={16} />{t("shift.close")}</button>}
      {tasdiqlangan && <button type="button" disabled={amal.band} onClick={bekorQilish} className={tugmaXavfli}>{t("actions.cancelDocument")}</button>}
      {tasdiqlangan && rahbar && <button type="button" onClick={() => setTuzatishOchiq(true)} className={tugmaIkkinchi}>{t("shift.correction")}</button>}
    </>}>
      <XatoQutisi matn={hujjat.xato || fxBekor.tepadagi || fxTuzatish.tepadagi || (fxBekor.bor || fxTuzatish.bor ? "" : amal.xato)} />
      {sotilgan && rahbar && !tuzatishOchiq && <Ogohlantirish>{t("shift.soldHint")}</Ogohlantirish>}
      {!hisobot ? <Yuklanmoqda /> : <>
        <Tafsilotlar qatorlar={[
          { nom: t("fields.product"), qiymat: qatorNomi(hisobotMahsuloti(hisobot)) },
          { nom: t("fields.order"), qiymat: hisobot.orderId ? buyurtmaRaqamlari.get(hisobot.orderId) || "—" : <span className="text-slate-400">{t("shift.withoutOrder")}</span> },
          { nom: t("fields.destWarehouse"), qiymat: hisobot.destWarehouseId ? nomlar.get(hisobot.destWarehouseId) ?? "—" : "—" },
          { nom: t("fields.date"), qiymat: kunMatni(hisobot.date ?? undefined) || "—" },
          { nom: t("shift.shiftEndsAt"), qiymat: vaqtMatni(hisobot.shiftEndsAt ?? undefined) || "—" },
          { nom: t("shift.goodOutput"), qiymat: miqdorYokiChiziq(jamlar?.yaroqli ?? 0) },
          { nom: t("fields.scrapQuantity"), qiymat: miqdorYokiChiziq(jamlar?.brak ?? 0, "text-amber-600") },
          { nom: t("shift.downtimeHours"), qiymat: miqdorYokiChiziq(jamlar?.toxtash ?? 0, "text-red-600") },
        ]} />
        {hisobot.cancelReason && <p className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-600"><span className="font-black">{t("shift.cancelReason")}:</span> {hisobot.cancelReason}</p>}
        {hisobot.comment && <p className="rounded-2xl border border-orange-100 bg-white p-4 text-sm font-semibold text-slate-600"><span className="font-black text-slate-800">{t("fields.comment")}:</span> {hisobot.comment}</p>}
        <Bolim ikonka={Package} sarlavha={t("shift.outputs")}>
          <Jadval
            ixcham
            ustunlar={[
              { nom: t("fields.product"), katak: (qator) => qatorNomi(qator) },
              { nom: t("fields.outputRole"), katak: (qator) => (qator.role ? t(`outputRole.${qator.role}`, { defaultValue: qator.role }) : "—") },
              { nom: t("fields.serial"), katak: (qator) => qator.serial ?? "—" },
              { nom: t("fields.quantity"), ong: true, katak: (qator) => <span className="font-black text-slate-900">{miqdorMatni(chiqimMiqdori(qator))}</span> },
              { nom: t("fields.scrapQuantity"), ong: true, katak: (qator) => miqdorMatni(qator.scrapQuantity) },
              { nom: t("rolls.label"), katak: (qator) => <YorliqTugmasi qator={qator} /> },
            ]}
            qatorlar={hisobot.outputs ?? []}
            kalit={(qator, indeks) => qator.id ?? String(indeks)}
            bosh={t("empty.lines")}
          />
        </Bolim>
        {tuzatishlar.length > 0 && (
          <Bolim ikonka={PencilLine} sarlavha={t("shift.corrections")}>
            <Jadval
              ixcham
              ustunlar={[
                { nom: t("fields.product"), katak: (qator) => qator.nom },
                { nom: t("fields.delta"), ong: true, katak: (qator) => <span className={Number(qator.delta) < 0 ? "font-black text-red-600" : "font-black text-emerald-600"}>{`${Number(qator.delta) > 0 ? "+" : ""}${miqdorMatni(qator.delta)}`}</span> },
                { nom: t("fields.reason"), katak: (qator) => qator.reason || "—" },
                { nom: t("fields.date"), katak: (qator) => kunMatni(qator.createdAt ?? undefined) || "—" },
              ]}
              qatorlar={tuzatishlar}
              kalit={(qator, indeks) => qator.id ?? String(indeks)}
              bosh={t("empty.lines")}
            />
          </Bolim>
        )}
        {(hisobot.inputs ?? []).length > 0 && (
          <Bolim ikonka={BookOpenCheck} sarlavha={t("shift.inputs")}>
            <Jadval
              ixcham
              ustunlar={[
                { nom: t("fields.product"), katak: (qator) => <>{qatorNomi(qator)}{qator.offRecipe && <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-black text-amber-700 ring-1 ring-amber-100">{t("shift.offRecipeLine")}</span>}</> },
                { nom: t("fields.entryMethod"), katak: (qator) => (qator.entryMethod ? t(`entryMethod.${qator.entryMethod}`) : "—") },
                { nom: t("fields.norm"), ong: true, katak: (qator) => miqdorMatni(qator.normQuantity) },
                { nom: t("fields.quantity"), ong: true, katak: (qator) => <span className="font-black text-slate-900">{miqdorMatni(qator.quantity)}</span> },
                { nom: t("shift.difference"), ong: true, katak: (qator) => {
                  const norma = sonMaydoni(qator.normQuantity);
                  const haqiqiy = sonMaydoni(qator.quantity);
                  if (norma === undefined || haqiqiy === undefined) return "—";
                  const farq = haqiqiy - norma;
                  return <span className={farq > 0 ? "font-black text-red-600" : farq < 0 ? "font-black text-emerald-600" : "text-slate-400"}>{`${farq > 0 ? "+" : ""}${miqdorMatni(farq)}`}</span>;
                } },
              ]}
              qatorlar={hisobot.inputs ?? []}
              kalit={(qator, indeks) => qator.id ?? String(indeks)}
              bosh={t("empty.lines")}
            />
          </Bolim>
        )}
        {(hisobot.downtime ?? []).length > 0 && (
          <Bolim ikonka={TimerOff} sarlavha={t("shift.downtime")}>
            <Jadval
              ixcham
              ustunlar={[
                { nom: t("fields.downtimeReason"), katak: (qator) => t(`downtime.${qator.reason}`, { defaultValue: qator.reason }) },
                { nom: t("fields.hours"), ong: true, katak: (qator) => miqdorMatni(qator.hours) },
                { nom: t("fields.note"), katak: (qator) => qator.note ?? "—" },
              ]}
              qatorlar={hisobot.downtime ?? []}
              kalit={(_, indeks) => String(indeks)}
              bosh={t("empty.lines")}
            />
          </Bolim>
        )}
        {tasdiqlangan && (
          <Bolim ikonka={Ban} sarlavha={t("actions.cancelDocument")}>
            <Maydon nom={t("shift.cancelReason")} izoh={t("shift.cancelHint")} xato={fxBekor.xato("reason")}><input value={sabab} onChange={(event) => { setSabab(event.target.value); fxBekor.tozala("reason"); }} className={inputKlass} /></Maydon>
          </Bolim>
        )}
        {tuzatishOchiq && (
          <Bolim ikonka={PencilLine} sarlavha={t("shift.correction")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Maydon nom={t("fields.output")} xato={fxTuzatish.xato("outputId")}>
                <select value={outputId} onChange={(event) => { setOutputId(event.target.value); fxTuzatish.tozala("outputId"); }} className={inputKlass}>
                  <option value="">{t("fields.selectOutput")}</option>
                  {(hisobot.outputs ?? []).filter((qator) => qator.id).map((qator) => <option key={qator.id} value={qator.id}>{qatorNomi(qator)} · {qator.serial ?? miqdorMatni(chiqimMiqdori(qator))}</option>)}
                </select>
              </Maydon>
              <Maydon nom={t("fields.delta")} izoh={t("shift.deltaHint")} xato={fxTuzatish.xato("delta")}><input type="number" step="any" value={delta} onChange={(event) => { setDelta(event.target.value); fxTuzatish.tozala("delta"); }} placeholder="-900" className={inputKlass} /></Maydon>
            </div>
            <Maydon nom={t("fields.reason")} xato={fxTuzatish.xato("reason")}><input value={tuzatishSababi} onChange={(event) => { setTuzatishSababi(event.target.value); fxTuzatish.tozala("reason"); }} className={inputKlass} /></Maydon>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { setTuzatishOchiq(false); fxTuzatish.ornat({}); }} className={tugmaIkkinchi}>{t("actions.cancel")}</button>
              <button type="button" disabled={amal.band} onClick={tuzatish} className={tugmaAsosiy}>{t("actions.save")}</button>
            </div>
          </Bolim>
        )}
      </>}
    </Oyna>
  );
}
