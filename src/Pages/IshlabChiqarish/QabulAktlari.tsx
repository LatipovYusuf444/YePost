import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Ban, CheckCircle2, ClipboardCheck, ClipboardList, CornerUpLeft, Hourglass, NotebookPen, PackageCheck, Scale, Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ishlabChiqarishApi } from "@/api/ishlabChiqarishApi";
import { kunMatni, vaqtMatni } from "@/lib/hujjatSanasi";
import { brakFoizi, hujjatRaqami, miqdorMatni, qabulFormasi, qabulTanasiniYigish, qidiruvgaMos, sonMaydoni, type QabulFormaQatori, type XatoMaydonQoidasi } from "@/lib/ishlabChiqarish";
import { useIshlabChiqarishStore } from "@/store/ishlabChiqarishStore";
import type { QabulAkti, QabulOgohlantirishi } from "@/types/ishlabChiqarish";
import { Asboblar, Bolim, BrakSababiTanlash, Farq, HolatKartalari, Jadval, Maydon, Oyna, QidiruvMaydoni, Sahifa, Tafsilotlar, XatoQutisi, Yuklanmoqda, inputKlass, tugmaAsosiy, tugmaIkkinchi, tugmaXavfli, xatoRamkasi, type HolatGuruhi, type Ustun } from "./umumiy";
import { useAmal, useBrakSabablari, useMalumot, useMaydonXatolari, useXodimNomlari } from "./hooklar";

// Akt holati: DRAFT — qabul kutilmoqda, CONFIRMED — qabul qilingan, CANCELLED — qaytarilgan (returned) yoki bekor (smena hisoboti bekor qilingan).
type AktHolatKodi = "DRAFT" | "CONFIRMED" | "RETURNED" | "CANCELLED";
const aktHolati = (akt: Pick<QabulAkti, "status" | "returned" | "returnReason">): AktHolatKodi =>
  akt.status === "CANCELLED" ? (akt.returned || akt.returnReason ? "RETURNED" : "CANCELLED") : akt.status === "CONFIRMED" ? "CONFIRMED" : "DRAFT";
const AKT_RANGI: Record<AktHolatKodi, string> = {
  DRAFT: "bg-amber-50 text-amber-700 ring-amber-100",
  CONFIRMED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  RETURNED: "bg-rose-50 text-rose-700 ring-rose-100",
  CANCELLED: "bg-slate-100 text-slate-600 ring-slate-200",
};

function AktHolati({ akt }: { akt: Pick<QabulAkti, "status" | "returned" | "returnReason"> }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const kod = aktHolati(akt);
  return <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-black ring-1 ${AKT_RANGI[kod]}`}>{t(`acceptance.status.${kod}`)}</span>;
}

/** Aktdagi mahsulot(lar) nomi: bitta bo'lsa nomi, ko'p bo'lsa "nom +2". */
function aktMahsuloti(akt: Pick<QabulAkti, "lines">) {
  const qatorlar = akt.lines ?? [];
  const birinchi = qatorlar[0]?.productName?.trim() || "—";
  return qatorlar.length > 1 ? `${birinchi} +${qatorlar.length - 1}` : birinchi;
}

/** Brak foizi matni; chegaradan oshsa qizil. */
function BrakFoizi({ foiz, chegara, alert }: { foiz: number; chegara: number | null; alert?: boolean }) {
  const oshdi = alert ?? (chegara !== null && foiz > chegara);
  return <span className={`tabular-nums ${oshdi ? "font-black text-red-600" : "text-slate-500"}`}>{foiz.toLocaleString("uz-UZ", { maximumFractionDigits: 2 })}%</span>;
}

const QABUL_XATO_QOIDALARI: Record<string, XatoMaydonQoidasi> = {
  lines: { maydonlar: ["lines"], kodlar: ["accept_quantity_required"] },
  note: { maydonlar: ["note"] },
};
const QAYTARISH_XATO_QOIDALARI: Record<string, XatoMaydonQoidasi> = {
  reason: { maydonlar: ["reason"], kodlar: ["reason_required"], sozlar: ["sabab", "причин"] },
};

export default function QabulAktlari() {
  const { t } = useTranslation("ishlab_chiqarish");
  const royxat = useMalumot(() => ishlabChiqarishApi.qabul.royxat(), "acceptances");
  const chegara = sonMaydoni(useIshlabChiqarishStore((holat) => holat.sozlama?.scrapAlertPercent) ?? undefined) ?? null;
  const [filtr, setFiltr] = useState<{ kalit: string; holatlar: string[] } | null>({ kalit: "kutilmoqda", holatlar: ["DRAFT"] });
  const [qidiruv, setQidiruv] = useState("");
  const [ochiq, setOchiq] = useState<string | null>(null);
  // Holat kartalari akt holati bo'yicha (qaytarilgan va bekor alohida): `status` o'rniga hisoblangan kod.
  const hammasi = useMemo(() => (royxat.malumot ?? []).map((akt) => ({ ...akt, status: aktHolati(akt), asl: akt })), [royxat.malumot]);
  const qatorlar = useMemo(
    () => hammasi.filter((akt) => (!filtr || filtr.holatlar.includes(akt.status)) && qidiruvgaMos(qidiruv, [hujjatRaqami(akt), akt.report?.docNumber, akt.order?.docNumber, aktMahsuloti(akt), akt.returnReason])),
    [hammasi, filtr, qidiruv]
  );
  const guruhlar: HolatGuruhi[] = [
    { kalit: "kutilmoqda", nom: t("acceptance.kpi.waiting"), holatlar: ["DRAFT"], rang: "amber", ikonka: Hourglass },
    { kalit: "qabul", nom: t("acceptance.kpi.accepted"), holatlar: ["CONFIRMED"], rang: "emerald", ikonka: PackageCheck },
    { kalit: "qaytarilgan", nom: t("acceptance.kpi.returned"), holatlar: ["RETURNED"], rang: "rose", ikonka: Undo2 },
    { kalit: "jami", nom: t("acceptance.kpi.total"), holatlar: null, rang: "blue", ikonka: ClipboardList },
  ];
  type Qator = (typeof hammasi)[number];
  const ustunlar: Ustun<Qator>[] = [
    { id: "qabul-column-1", nom: t("acceptance.act"), katak: (akt) => (hujjatRaqami(akt) ? <span className="font-black text-slate-900">{hujjatRaqami(akt)}</span> : <span className="text-slate-400">{t("acceptance.noNumber")}</span>) },
    { id: "qabul-column-2", nom: t("shift.report"), katak: (akt) => akt.report?.docNumber || "—" },
    { id: "qabul-column-3", nom: t("fields.order"), katak: (akt) => akt.order?.docNumber || <span className="text-slate-400">{t("shift.withoutOrder")}</span> },
    { id: "qabul-column-4", nom: t("fields.product"), katak: (akt) => <span className="block max-w-[240px] truncate font-bold text-slate-800">{aktMahsuloti(akt)}</span> },
    { id: "qabul-column-5", nom: t("acceptance.good"), ong: true, katak: (akt) => <span className="font-black text-slate-900">{miqdorMatni(akt.totals?.good)}</span> },
    { id: "qabul-column-6", nom: t("acceptance.scrap"), ong: true, katak: (akt) => <span className="inline-flex items-center gap-2"><span className="font-bold text-amber-600">{miqdorMatni(akt.totals?.scrap)}</span><BrakFoizi foiz={Number(akt.totals?.scrapPercent) || 0} chegara={chegara} alert={akt.status === "CONFIRMED" ? akt.scrapAlert : undefined} /></span> },
    { id: "qabul-column-7", nom: t("acceptance.shiftDate"), katak: (akt) => kunMatni(akt.report?.date ?? undefined) || "—" },
    { id: "qabul-column-8", nom: t("acceptance.acceptedAt"), katak: (akt) => vaqtMatni(akt.acceptedAt ?? undefined) || "—" },
    { id: "qabul-column-9", nom: t("fields.status"), katak: (akt) => <AktHolati akt={akt.asl} /> },
  ];
  const filtrlangan = hammasi.length > 0;
  return (
    <Sahifa sarlavha={t("acceptance.title")} izoh={t("acceptance.subtitle")}>
      <HolatKartalari guruhlar={guruhlar} qatorlar={hammasi} tanlangan={filtr?.kalit ?? ""} yuklanmoqda={royxat.yuklanmoqda && !royxat.malumot} onTanlash={(guruh) => setFiltr(guruh?.holatlar ? { kalit: guruh.kalit, holatlar: guruh.holatlar } : null)} />
      <Asboblar>
        <QidiruvMaydoni qiymat={qidiruv} onChange={setQidiruv} placeholder={t("acceptance.searchPlaceholder")} />
      </Asboblar>
      <XatoQutisi matn={royxat.xato} />
      <Jadval tableId="IshlabChiqarish/Qabul/jadval-1"
        ustunlar={ustunlar}
        qatorlar={qatorlar}
        kalit={(akt) => akt.id}
        onBos={(akt) => setOchiq(akt.id)}
        yuklanmoqda={royxat.yuklanmoqda && !royxat.malumot}
        sahifaHajmi={20}
        boshIkonka={ClipboardCheck}
        bosh={filtr?.kalit === "kutilmoqda" ? t("acceptance.emptyWaiting") : filtrlangan ? t("acceptance.emptyFiltered") : t("acceptance.emptyTitle")}
        boshIzoh={<IshTartibi />}
        boshAmal={filtr || qidiruv ? <button type="button" onClick={() => { setFiltr(null); setQidiruv(""); }} className={tugmaIkkinchi}>{t("acceptance.showAll")}</button> : undefined}
      />
      {ochiq && <AktOynasi id={ochiq} chegara={chegara} onYopish={() => setOchiq(null)} onOzgardi={royxat.qayta} />}
    </Sahifa>
  );
}

/** Bo'sh ro'yxatda: akt qayerdan keladi. */
function IshTartibi() {
  const { t } = useTranslation("ishlab_chiqarish");
  const qadamlar = [t("acceptance.flow.report"), t("acceptance.flow.check"), t("acceptance.flow.accept")];
  return (
    <div className="space-y-5">
      <p>{t("acceptance.emptyHint")}</p>
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

function AktOynasi({ id, chegara, onYopish, onOzgardi }: { id: string; chegara: number | null; onYopish: () => void; onOzgardi: () => void }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const hujjat = useMalumot(() => ishlabChiqarishApi.qabul.olish(id), id);
  const sabablar = useBrakSabablari();
  const xodimlar = useXodimNomlari();
  const amal = useAmal();
  const fx = useMaydonXatolari(QABUL_XATO_QOIDALARI);
  const fxQaytarish = useMaydonXatolari(QAYTARISH_XATO_QOIDALARI);
  const akt = hujjat.malumot;
  const kutilmoqda = akt?.status === "DRAFT";
  // PM soni forma qiymatlari: akt yuklangach bir marta to'ldiriladi (qayta yuklashda yozilgani yo'qolmaydi).
  const [forma, setForma] = useState<{ aktId: string; qatorlar: QabulFormaQatori[] } | null>(null);
  const qatorlar = forma && forma.aktId === akt?.id ? forma.qatorlar : akt ? qabulFormasi(akt) : [];
  const [izoh, setIzoh] = useState("");
  const [qaytarishOchiq, setQaytarishOchiq] = useState(false);
  const [sabab, setSabab] = useState("");
  const [ogohlantirishlar, setOgohlantirishlar] = useState<QabulOgohlantirishi[] | null>(null);

  const qatorniOzgartir = (indeks: number, qism: Partial<QabulFormaQatori>) => {
    fx.tozala(...Object.keys(qism).map((kalit) => `lines.${indeks}.${kalit}`), ...(fx.xato("lines") ? ["lines"] : []));
    setForma({ aktId: akt?.id ?? "", qatorlar: qatorlar.map((qator, i) => (i === indeks ? { ...qator, ...qism } : qator)) });
  };
  // Jonli jami (PM soni bo'yicha): qabul qilishdan oldin brak chegarasi ko'rinadi.
  const jamiYaroqli = kutilmoqda ? qatorlar.reduce((jami, qator) => jami + (sonMaydoni(qator.good) ?? 0), 0) : Number(akt?.totals?.good) || 0;
  const jamiBrak = kutilmoqda ? qatorlar.reduce((jami, qator) => jami + (sonMaydoni(qator.scrap) ?? 0), 0) : Number(akt?.totals?.scrap) || 0;
  const foiz = brakFoizi(jamiYaroqli, jamiBrak);
  const chegaradanOshdi = kutilmoqda && chegara !== null && foiz > chegara;
  const reja = sonMaydoni(akt?.totals?.planned ?? akt?.order?.quantity ?? undefined);

  function qabulQilish() {
    const natija = qabulTanasiniYigish(qatorlar, izoh);
    if ("xato" in natija) return fx.tekshiruv(natija, t(natija.xato));
    fx.ornat({});
    fxQaytarish.ornat({});
    void amal.bajar(async () => {
      const javob = await ishlabChiqarishApi.qabul.qabulQilish(id, natija.tana);
      setOgohlantirishlar(javob.ogohlantirishlar);
      hujjat.qayta();
      onOzgardi();
    }, fx.serverdan);
  }

  function qaytarish() {
    if (!sabab.trim()) return fxQaytarish.ornat({ reason: t("errors.returnReason") });
    fx.ornat({});
    fxQaytarish.ornat({});
    void amal.bajar(async () => {
      await ishlabChiqarishApi.qabul.qaytarish(id, sabab.trim());
      setQaytarishOchiq(false);
      hujjat.qayta();
      onOzgardi();
    }, fxQaytarish.serverdan);
  }

  const sarlavha = akt ? hujjatRaqami(akt) || t("acceptance.actFor", { raqam: akt.report?.docNumber || "—" }) : t("loading");
  const tepadagi = hujjat.xato || fx.tepadagi || fxQaytarish.tepadagi || (fx.bor || fxQaytarish.bor ? "" : amal.xato);
  const brakOmboriYoq = amal.xatoKodi === "errors.production.scrap_target_missing";
  const kartaYoq = amal.xatoKodi === "errors.production.costing_card_missing";

  return (
    <Oyna keng ikonka={ClipboardCheck} sarlavha={sarlavha} izoh={akt ? `${aktMahsuloti(akt)}${akt.order?.docNumber ? ` · ${akt.order.docNumber}` : ""}` : undefined} belgi={akt && <AktHolati akt={akt} />} onYopish={onYopish} pastki={akt && kutilmoqda && <>
      <p className="mr-auto hidden max-w-md text-xs font-semibold leading-5 text-slate-400 lg:block">{t("acceptance.footerHint")}</p>
      <button type="button" disabled={amal.band} onClick={() => { setQaytarishOchiq(true); fx.ornat({}); }} className={tugmaXavfli}><CornerUpLeft size={16} />{t("acceptance.return")}</button>
      <button type="button" disabled={amal.band} onClick={qabulQilish} className={`${tugmaAsosiy} h-14 px-8 text-base`}><CheckCircle2 size={20} />{t("acceptance.accept")}</button>
    </>}>
      <XatoQutisi matn={tepadagi} />
      {brakOmboriYoq && <p className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-700">{t("acceptance.scrapTargetHint")}</p>}
      {kartaYoq && <p className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-700">{t("acceptance.costingCardHint")}</p>}
      {ogohlantirishlar && akt?.status === "CONFIRMED" && (
        ogohlantirishlar.some((ogoh) => ogoh.code === "SCRAP_ABOVE_LIMIT") ? (
          ogohlantirishlar.filter((ogoh) => ogoh.code === "SCRAP_ABOVE_LIMIT").map((ogoh, indeks) => (
            <div key={indeks} role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
              <AlertTriangle size={20} className="mt-0.5 shrink-0" />
              <span>{t("acceptance.scrapAboveLimit", { foiz: miqdorMatni(ogoh.percent), chegara: miqdorMatni(ogoh.limit) })}</span>
            </div>
          ))
        ) : (
          <p role="status" className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700"><CheckCircle2 size={18} />{t("acceptance.acceptedOk")}</p>
        )
      )}
      {!akt ? <Yuklanmoqda /> : <>
        {aktHolati(akt) === "RETURNED" && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
            <Undo2 size={19} className="mt-0.5 shrink-0" />
            <span><span className="font-black">{t("acceptance.returnReason")}:</span> {akt.returnReason}</span>
          </div>
        )}
        {aktHolati(akt) === "CANCELLED" && akt.cancelReason && <p className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-600"><Ban size={16} className="mr-2 inline" />{akt.cancelReason}</p>}
        {akt.status === "CONFIRMED" && akt.scrapAlert && !ogohlantirishlar && (
          <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            <AlertTriangle size={20} className="mt-0.5 shrink-0" />
            <span>{t("acceptance.scrapAlertSaved", { foiz: miqdorMatni(akt.scrapPercent) })}</span>
          </div>
        )}
        <Tafsilotlar qatorlar={[
          { nom: t("shift.report"), qiymat: akt.report?.docNumber || "—" },
          { nom: t("acceptance.shiftDate"), qiymat: kunMatni(akt.report?.date ?? undefined) || "—" },
          { nom: t("shift.shiftEndsAt"), qiymat: vaqtMatni(akt.report?.shiftEndsAt ?? undefined) || "—" },
          { nom: t("fields.order"), qiymat: akt.order?.docNumber ? `${akt.order.docNumber}${reja !== undefined ? ` · ${t("acceptance.plan")} ${miqdorMatni(reja)}` : ""}` : t("shift.withoutOrder") },
          { nom: t("acceptance.good"), qiymat: <span className="tabular-nums">{miqdorMatni(jamiYaroqli)}</span> },
          { nom: t("acceptance.scrap"), qiymat: <span className="tabular-nums text-amber-600">{miqdorMatni(jamiBrak)}</span> },
          { nom: t("acceptance.scrapPercent"), qiymat: <span className="inline-flex items-center gap-2"><BrakFoizi foiz={foiz} chegara={chegara} alert={akt.status === "CONFIRMED" ? akt.scrapAlert : undefined} />{chegara !== null && <span className="text-xs font-bold text-slate-400">{t("acceptance.limit", { chegara: miqdorMatni(chegara) })}</span>}</span> },
          { nom: t("acceptance.acceptedAt"), qiymat: akt.acceptedAt ? `${vaqtMatni(akt.acceptedAt)}${akt.acceptedById && xodimlar.get(akt.acceptedById) ? ` · ${xodimlar.get(akt.acceptedById)}` : ""}` : "—" },
        ]} />
        {chegaradanOshdi && (
          <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            <AlertTriangle size={20} className="mt-0.5 shrink-0" />
            <span>{t("acceptance.scrapAboveLimitPreview", { foiz: miqdorMatni(foiz), chegara: miqdorMatni(chegara) })}</span>
          </div>
        )}
        <Bolim ikonka={Scale} sarlavha={t("acceptance.linesTitle")} izoh={kutilmoqda ? t("acceptance.linesHint") : undefined}>
          {(akt.lines ?? []).length === 0 && <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-400">{t("empty.lines")}</p>}
          {(akt.lines ?? []).map((qator, indeks) => {
            const forma = qatorlar[indeks];
            const pmYaroqli = kutilmoqda ? sonMaydoni(forma?.good) ?? 0 : Number(qator.good) || 0;
            const pmBrak = kutilmoqda ? sonMaydoni(forma?.scrap) ?? 0 : Number(qator.scrap) || 0;
            const brakBor = pmBrak > 0;
            return (
              <article key={qator.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <h4 className="mb-4 flex items-center gap-2 text-base font-black text-slate-900"><PackageCheck size={18} className="text-[#2563EB]" />{qator.productName || "—"}</h4>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)]">
                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">{t("acceptance.masterWrote")}</p>
                    <dl className="mt-3 grid grid-cols-2 gap-3">
                      <div><dt className="text-xs font-bold text-slate-400">{t("acceptance.good")}</dt><dd className="text-xl font-black tabular-nums text-slate-800">{miqdorMatni(qator.masterGood)}</dd></div>
                      <div><dt className="text-xs font-bold text-slate-400">{t("acceptance.scrap")}</dt><dd className="text-xl font-black tabular-nums text-amber-600">{miqdorMatni(qator.masterScrap)}</dd></div>
                      <div className="col-span-2"><dt className="text-xs font-bold text-slate-400">{t("fields.scrapReason")}</dt><dd className="truncate text-sm font-bold text-slate-600">{qator.masterScrapReasonName || "—"}</dd></div>
                    </dl>
                  </div>
                  <div className="rounded-2xl bg-blue-50/40 p-4 ring-1 ring-blue-100">
                    <p className="text-xs font-black uppercase tracking-wide text-[#2563EB]">{t("acceptance.pmCount")}</p>
                    {kutilmoqda && forma ? (
                      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)]">
                        <Maydon nom={t("acceptance.good")} xato={fx.xato(`lines.${indeks}.good`)}>
                          <input type="number" inputMode="decimal" min="0" step="any" value={forma.good} aria-label={`${t("acceptance.good")} ${indeks + 1}`} onChange={(event) => qatorniOzgartir(indeks, { good: event.target.value })} className={`${inputKlass} h-14 text-lg`} />
                          <Farq qiymat={pmYaroqli - (Number(qator.masterGood) || 0)} />
                        </Maydon>
                        <Maydon nom={t("acceptance.scrap")} xato={fx.xato(`lines.${indeks}.scrap`)}>
                          <input type="number" inputMode="decimal" min="0" step="any" value={forma.scrap} aria-label={`${t("acceptance.scrap")} ${indeks + 1}`} onChange={(event) => qatorniOzgartir(indeks, { scrap: event.target.value })} className={`${inputKlass} h-14 text-lg`} />
                          <Farq qiymat={pmBrak - (Number(qator.masterScrap) || 0)} />
                        </Maydon>
                        <Maydon nom={t("fields.scrapReason")} majburiy={brakBor} xato={fx.xato(`lines.${indeks}.scrapReasonId`)}>
                          <div className="h-14 [&>div]:h-14"><BrakSababiTanlash value={forma.scrapReasonId} disabled={!brakBor} sabablar={sabablar.malumot ?? []} eskiNom={qator.scrapReasonName ?? qator.masterScrapReasonName} xato={Boolean(fx.xato(`lines.${indeks}.scrapReasonId`))} onChange={(scrapReasonId) => qatorniOzgartir(indeks, { scrapReasonId })} /></div>
                        </Maydon>
                      </div>
                    ) : (
                      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <div><dt className="text-xs font-bold text-slate-400">{t("acceptance.good")}</dt><dd className="text-xl font-black tabular-nums text-slate-900">{miqdorMatni(qator.good)}</dd><Farq qiymat={qator.goodDifference} /></div>
                        <div><dt className="text-xs font-bold text-slate-400">{t("acceptance.scrap")}</dt><dd className="text-xl font-black tabular-nums text-amber-600">{miqdorMatni(qator.scrap)}</dd><Farq qiymat={qator.scrapDifference} /></div>
                        <div className="col-span-2 sm:col-span-1"><dt className="text-xs font-bold text-slate-400">{t("fields.scrapReason")}</dt><dd className="truncate text-sm font-bold text-slate-600">{qator.scrapReasonName || "—"}</dd></div>
                      </dl>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </Bolim>
        {kutilmoqda && !qaytarishOchiq && (
          <Bolim ikonka={NotebookPen} sarlavha={t("fields.note")}>
            <textarea value={izoh} rows={2} aria-label={t("fields.note")} placeholder={t("acceptance.notePlaceholder")} onChange={(event) => setIzoh(event.target.value)} className={`${inputKlass} h-auto py-3`} />
          </Bolim>
        )}
        {!kutilmoqda && akt.note && <p className="rounded-2xl border border-orange-100 bg-white p-4 text-sm font-semibold text-slate-600"><span className="font-black text-slate-800">{t("fields.note")}:</span> {akt.note}</p>}
        {kutilmoqda && qaytarishOchiq && (
          <Bolim ikonka={CornerUpLeft} sarlavha={t("acceptance.returnTitle")} izoh={t("acceptance.returnHint")} className="border-rose-200">
            <div data-maydon-xato={fxQaytarish.xato("reason") ? "true" : undefined} className="grid gap-2">
              <textarea value={sabab} rows={3} autoFocus aria-label={t("acceptance.returnReason")} aria-invalid={Boolean(fxQaytarish.xato("reason"))} placeholder={t("acceptance.returnPlaceholder")} onChange={(event) => { setSabab(event.target.value); fxQaytarish.tozala("reason"); }} className={`${inputKlass} h-auto py-3 ${fxQaytarish.xato("reason") ? xatoRamkasi : ""}`} />
              {fxQaytarish.xato("reason") && <span role="alert" className="text-xs font-bold leading-5 text-red-600">{fxQaytarish.xato("reason")}</span>}
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => { setQaytarishOchiq(false); fxQaytarish.ornat({}); }} className={tugmaIkkinchi}>{t("actions.cancel")}</button>
              <button type="button" disabled={amal.band} onClick={qaytarish} className={tugmaXavfli}><CornerUpLeft size={16} />{t("acceptance.returnSubmit")}</button>
            </div>
          </Bolim>
        )}
      </>}
    </Oyna>
  );
}
