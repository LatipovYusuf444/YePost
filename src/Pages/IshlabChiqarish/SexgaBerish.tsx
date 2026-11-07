import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, Ban, CheckCircle2, ClipboardList, Disc3, FileCheck2, FilePen, Layers, ListChecks, NotebookPen, PackageOpen, Plus, ScanLine, Undo2, Warehouse } from "lucide-react";
import { useTranslation } from "react-i18next";
import ModalTablari from "@/Components/common/ModalTablari";
import { ishlabChiqarishApi } from "@/api/ishlabChiqarishApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { kunMatni } from "@/lib/hujjatSanasi";
import { butunMiqdorXatolari, holatBoyicha, hujjatRaqami, miqdorMatni, qatorNomi, qidiruvgaMos, raqamXaritasi, seriyaYaroqlimi, serverXatoMaydonlari, sonMaydoni, tozaTana, type XatoMaydonQoidasi } from "@/lib/ishlabChiqarish";
import { foydalanuvchiKursniOzgartiraOladimi } from "@/lib/roles";
import { useAuthProfileStore } from "@/store/authProfileStore";
import type { BerishTanasi, SexdanQaytarish, SexgaBerish as Berish } from "@/types/ishlabChiqarish";
import { Asboblar, Bolim, HolatFiltri, HolatKartalari, Holat, Jadval, Jarayon, MahsulotQidiruvi, Maydon, MaydonXatosi, OmborTanlash, Oyna, QatorKartasi, QatorOchirish, QatorQoshish, QidiruvMaydoni, Sahifa, Tafsilotlar, XatoQutisi, Yuklanmoqda, inputKlass, xatoRamkasi, tugmaAsosiy, tugmaIkkinchi, tugmaXavfli, type HolatGuruhi, type Ustun } from "./umumiy";
import { useAmal, useMaydonXatolari, useMalumot, useOmborlar } from "./hooklar";

// Oynadagi qator: rulon — batchId va seriya bilan (miqdor butun og'irligi), oddiy qator — mahsulot va miqdor.
type Qator = { id?: string; modificationId: string; nom: string; quantity: string; batchId: string; serial: string; ogirlik: string };

const HOLATLAR = ["DRAFT", "CONFIRMED", "CANCELLED"];

/** Sexga berish va sexdan qaytarish hujjatlari uchun bir xil holat kartalari. */
function useHolatGuruhlari(): HolatGuruhi[] {
  const { t } = useTranslation("ishlab_chiqarish");
  return [
    { kalit: "jami", nom: t("issues.kpi.total"), holatlar: null, rang: "blue", ikonka: ClipboardList },
    { kalit: "qoralama", nom: t("issues.kpi.draft"), holatlar: ["DRAFT"], rang: "amber", ikonka: FilePen },
    { kalit: "tasdiqlangan", nom: t("issues.kpi.confirmed"), holatlar: ["CONFIRMED"], rang: "emerald", ikonka: FileCheck2 },
    { kalit: "bekor", nom: t("issues.kpi.cancelled"), holatlar: ["CANCELLED"], rang: "rose", ikonka: Ban },
  ];
}

/** Hujjat raqami: qoralamada raqam yo'q — kulrang "Qoralama". */
function RaqamKatagi({ hujjat }: { hujjat: { docNumber?: string | null } }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const raqam = hujjatRaqami(hujjat);
  return raqam ? <span className="font-black text-slate-900">{raqam}</span> : <span className="text-slate-400">{t("status.DRAFT")}</span>;
}

// Sexga berish: server xatosi qaysi maydonga. "serial" — skaner (javobda qo'shilgan rulon seriyasi bo'lsa, o'sha rulon qatori).
const BERISH_XATO_QOIDALARI: Record<string, XatoMaydonQoidasi> = {
  consumeOnIssue: { maydonlar: ["consumeOnIssue"], kodlar: ["on_issue", "consume"], sozlar: ["berilganda sarf", "расход при выдаче"] },
  serial: { maydonlar: ["serial", "batchId"], kodlar: ["serial", "batch", "roll"], sozlar: ["seriya", "rulon", "серия", "серий", "рулон"] },
  sourceWarehouseId: { maydonlar: ["sourceWarehouseId"], kodlar: ["source"], sozlar: ["xomashyo ombori", "склад сырья"] },
  wipWarehouseId: { maydonlar: ["wipWarehouseId"], kodlar: ["wip"], sozlar: ["sex ombori", "цеховой склад", "цехового склад"] },
  note: { maydonlar: ["note"] },
  lines: { maydonlar: ["lines"], kodlar: ["no_lines", "lines_empty", "empty_lines", "lines_required"] },
};

// Sexdan qaytarish: qator xatolari keyin issueLineId bo'yicha qayta bog'lanadi (QaytarishOynasi.serverXatosi).
const QAYTARISH_XATO_QOIDALARI: Record<string, XatoMaydonQoidasi> = {
  issueId: { maydonlar: ["issueId"], kodlar: ["issue_not", "issue_status", "issue_cancel"], sozlar: ["sexga berish hujjati", "документ выдачи"] },
  lines: { maydonlar: ["lines"], kodlar: ["lines", "quantity", "exceed"], sozlar: ["miqdor", "количеств"] },
};

const rulonlarSoni = (hujjat: Berish) => (hujjat.lines ? hujjat.lines.filter((qator) => qator.batchId).length : undefined);

export default function SexgaBerish() {
  const { t } = useTranslation("ishlab_chiqarish");
  const [bolim, setBolim] = useState("berishlar");
  return (
    <Sahifa sarlavha={t("issues.title")} izoh={t("issues.subtitle")}>
      <ModalTablari tablar={[{ id: "berishlar", nom: t("issues.tabIssues"), icon: <PackageOpen size={15} /> }, { id: "qaytarishlar", nom: t("issues.tabReturns"), icon: <Undo2 size={15} /> }]} faol={bolim} onChange={setBolim} />
      {bolim === "berishlar" ? <Berishlar /> : <Qaytarishlar />}
    </Sahifa>
  );
}

function Berishlar() {
  const { t } = useTranslation("ishlab_chiqarish");
  const [parametrlar, setParametrlar] = useSearchParams();
  const omborlar = useOmborlar();
  const royxat = useMalumot(() => ishlabChiqarishApi.berishlar.royxat(), "issues");
  const buyurtmalar = useMalumot(() => ishlabChiqarishApi.buyurtmalar.royxat(), "orders");
  const buyurtmaRaqamlari = useMemo(() => raqamXaritasi(buyurtmalar.malumot), [buyurtmalar.malumot]);
  const nomlar = useMemo(() => new Map(omborlar.map((ombor) => [ombor.id, ombor.name])), [omborlar]);
  const [ochiq, setOchiq] = useState<{ id?: string } | null>(() => (parametrlar.get("hujjat") ? { id: parametrlar.get("hujjat") ?? undefined } : null));
  const [buyurtmaOynasi, setBuyurtmaOynasi] = useState(false);
  const [filtr, setFiltr] = useState<{ kalit: string; holatlar: string[] } | null>(null);
  const [qidiruv, setQidiruv] = useState("");
  useEffect(() => {
    if (parametrlar.get("hujjat")) setParametrlar({}, { replace: true });
  }, [parametrlar, setParametrlar]);
  const guruhlar = useHolatGuruhlari();
  const hammasi = useMemo(() => royxat.malumot ?? [], [royxat.malumot]);
  const qatorlar = useMemo(
    () => holatBoyicha(hammasi, filtr?.holatlar ?? null).filter((hujjat) => qidiruvgaMos(qidiruv, [hujjatRaqami(hujjat), buyurtmaRaqamlari.get(hujjat.orderId ?? ""), hujjat.note])),
    [hammasi, filtr, qidiruv, buyurtmaRaqamlari]
  );
  const ombor = (id?: string | null) => (id ? nomlar.get(id) ?? "—" : "—");
  const ustunlar: Ustun<Berish>[] = [
    { id: "sexgaberish-column-1", nom: t("fields.document"), katak: (hujjat) => <RaqamKatagi hujjat={hujjat} /> },
    { id: "sexgaberish-column-2", nom: t("fields.order"), katak: (hujjat) => (hujjat.orderId ? buyurtmaRaqamlari.get(hujjat.orderId) || "—" : <span className="text-slate-400">{t("issues.manual")}</span>) },
    { id: "sexgaberish-column-3", nom: t("fields.date"), katak: (hujjat) => kunMatni(hujjat.date ?? undefined) || "—" },
    { id: "sexgaberish-column-4", nom: t("fields.sourceWarehouse"), katak: (hujjat) => ombor(hujjat.sourceWarehouseId) },
    { id: "sexgaberish-column-5", nom: t("fields.wipWarehouse"), katak: (hujjat) => ombor(hujjat.wipWarehouseId) },
    { id: "sexgaberish-column-6", nom: t("fields.lines"), ong: true, katak: (hujjat) => hujjat.lines?.length ?? "—" },
    { id: "sexgaberish-column-7", nom: t("issues.colRolls"), ong: true, katak: (hujjat) => rulonlarSoni(hujjat) ?? "—" },
    { id: "sexgaberish-column-8", nom: t("fields.status"), katak: (hujjat) => <Holat status={hujjat.status} /> },
  ];
  const buyurtmadanTugma = <button type="button" onClick={() => setBuyurtmaOynasi(true)} className={tugmaIkkinchi}><ClipboardList size={16} />{t("issues.fromOrder")}</button>;
  const yangiTugma = <button type="button" onClick={() => setOchiq({})} className={tugmaAsosiy}><Plus size={18} />{t("issues.create")}</button>;
  // Hujjat bor, lekin qidiruv yoki filtr hech narsa qoldirmagan.
  const filtrlangan = hammasi.length > 0;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end gap-3">{buyurtmadanTugma}{yangiTugma}</div>
      <HolatKartalari guruhlar={guruhlar} qatorlar={hammasi} tanlangan={filtr?.kalit ?? ""} yuklanmoqda={royxat.yuklanmoqda && !royxat.malumot} onTanlash={(guruh) => setFiltr(guruh?.holatlar ? { kalit: guruh.kalit, holatlar: guruh.holatlar } : null)} />
      <Asboblar>
        <QidiruvMaydoni qiymat={qidiruv} onChange={setQidiruv} placeholder={t("issues.searchPlaceholder")} />
        <HolatFiltri qiymat={filtr?.holatlar.length === 1 ? filtr.holatlar[0] : ""} onChange={(holat) => setFiltr(holat ? { kalit: holat, holatlar: [holat] } : null)} holatlar={HOLATLAR} />
      </Asboblar>
      <XatoQutisi matn={royxat.xato} />
      <Jadval tableId="IshlabChiqarish/SexgaBerish/jadval-1"
        ustunlar={ustunlar}
        qatorlar={qatorlar}
        kalit={(hujjat) => hujjat.id}
        onBos={(hujjat) => setOchiq({ id: hujjat.id })}
        yuklanmoqda={royxat.yuklanmoqda && !royxat.malumot}
        sahifaHajmi={20}
        boshIkonka={PackageOpen}
        bosh={filtrlangan ? t("issues.emptyFiltered") : t("issues.emptyTitle")}
        boshIzoh={filtrlangan ? t("issues.emptyFilteredHint") : <BerishUsullari />}
        boshAmal={filtrlangan ? <button type="button" onClick={() => { setFiltr(null); setQidiruv(""); }} className={tugmaIkkinchi}>{t("actions.resetFilters")}</button> : <>{buyurtmadanTugma}{yangiTugma}</>}
      />
      {ochiq && <BerishOynasi id={ochiq.id} buyurtmaRaqamlari={buyurtmaRaqamlari} onYopish={() => setOchiq(null)} onOzgardi={royxat.qayta} />}
      {buyurtmaOynasi && <BuyurtmaTanlash nomlar={nomlar} onYopish={() => setBuyurtmaOynasi(false)} onYaratildi={(hujjat) => { setBuyurtmaOynasi(false); royxat.qayta(); setOchiq({ id: hujjat.id }); }} />}
    </div>
  );
}

/** Bo'sh ro'yxatda: sexga berish nima va hujjat qanday to'ldiriladi. */
function BerishUsullari() {
  const { t } = useTranslation("ishlab_chiqarish");
  const usullar = [
    { ikonka: ClipboardList, matn: t("issues.ways.order") },
    { ikonka: Layers, matn: t("issues.ways.manual") },
    { ikonka: ScanLine, matn: t("issues.ways.scan") },
  ];
  return (
    <div className="space-y-5">
      <p>{t("issues.emptyHint")}</p>
      <ul className="flex flex-wrap items-center justify-center gap-2 text-left">
        {usullar.map(({ ikonka: Ikonka, matn }) => (
          <li key={matn} className="inline-flex items-center gap-2 rounded-2xl border border-orange-100 bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm">
            <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2563EB] text-white"><Ikonka size={13} /></span>
            {matn}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BuyurtmaTanlash({ nomlar, onYopish, onYaratildi }: { nomlar: Map<string, string>; onYopish: () => void; onYaratildi: (hujjat: Berish) => void }) {
  const { t } = useTranslation("ishlab_chiqarish");
  // Sexga bir necha marta berish mumkin: birinchi berishdan keyin buyurtma IN_PROGRESS bo'ladi.
  const buyurtmalar = useMalumot(async () => (await ishlabChiqarishApi.buyurtmalar.royxat()).filter((buyurtma) => buyurtma.status === "RELEASED" || buyurtma.status === "IN_PROGRESS"), "ishdagi");
  const amal = useAmal();
  const [qidiruv, setQidiruv] = useState("");
  const qatorlar = (buyurtmalar.malumot ?? []).filter((buyurtma) => qidiruvgaMos(qidiruv, [hujjatRaqami(buyurtma), qatorNomi(buyurtma)]));
  const ombor = (id?: string) => (id ? nomlar.get(id) ?? "—" : "—");
  return (
    <Oyna keng ikonka={ClipboardList} sarlavha={t("issues.fromOrder")} izoh={t("issues.fromOrderHint")} onYopish={onYopish}>
      <XatoQutisi matn={buyurtmalar.xato || amal.xato} />
      <QidiruvMaydoni qiymat={qidiruv} onChange={setQidiruv} placeholder={t("issues.fromOrderSearch")} />
      <Jadval tableId="IshlabChiqarish/SexgaBerish/jadval-2"
        ustunlar={[
          { id: "sexgaberish-column-9", nom: t("fields.document"), katak: (qator) => <RaqamKatagi hujjat={qator} /> },
          { id: "sexgaberish-column-10", nom: t("fields.product"), katak: (qator) => <span className="block max-w-[260px] truncate font-bold text-slate-800">{qatorNomi(qator)}</span> },
          { id: "sexgaberish-column-11", nom: t("fields.progress"), katak: (qator) => <Jarayon bajarilgan={qator.produced ?? 0} reja={qator.quantity} /> },
          { id: "sexgaberish-column-12", nom: t("fields.sourceWarehouse"), katak: (qator) => ombor(qator.sourceWarehouseId) },
          { id: "sexgaberish-column-13", nom: t("fields.dueDate"), katak: (qator) => (qator.dueDate ? kunMatni(qator.dueDate) : "—") },
          { id: "sexgaberish-column-14", nom: t("fields.status"), katak: (qator) => <Holat status={qator.status} /> },
          { id: "sexgaberish-column-15", nom: t("fields.actions"), katak: () => <span className="inline-flex items-center gap-1.5 text-sm font-black text-[#2563EB]">{t("issues.pickOrder")}<ArrowRight size={15} /></span> },
        ]}
        qatorlar={qatorlar}
        kalit={(qator) => qator.id}
        onBos={(qator) => void amal.bajar(async () => onYaratildi(await ishlabChiqarishApi.berishlar.buyurtmadan(qator.id)))}
        yuklanmoqda={buyurtmalar.yuklanmoqda && !buyurtmalar.malumot}
        boshIkonka={ClipboardList}
        bosh={(buyurtmalar.malumot ?? []).length > 0 ? t("issues.emptyFiltered") : t("issues.noActiveOrders")}
        boshIzoh={(buyurtmalar.malumot ?? []).length > 0 ? t("issues.emptyFilteredHint") : t("issues.noActiveOrdersHint")}
      />
    </Oyna>
  );
}

function BerishOynasi({ id: boshlangichId, buyurtmaRaqamlari, onYopish, onOzgardi }: { id?: string; buyurtmaRaqamlari: Map<string, string>; onYopish: () => void; onOzgardi: () => void }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const omborlar = useOmborlar();
  const profil = useAuthProfileStore((holat) => holat.profil);
  const amal = useAmal();
  const fx = useMaydonXatolari(BERISH_XATO_QOIDALARI);
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
      .catch((error) => { if (faol) amal.setXato(getApiErrorMessage(error)); })
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
    // Seriya topilmasa (yoki boshqa server xatosi) — matn tepada emas, skaner ostida.
    const rulon = await amal.bajar(async () => {
      try {
        return await ishlabChiqarishApi.rulonlar.seriyaBoyicha(seriya);
      } catch (error) {
        setSkanXato(getApiErrorMessage(error));
        return undefined;
      }
    });
    if (!rulon) return;
    if (sourceWarehouseId && rulon.warehouseId && rulon.warehouseId !== sourceWarehouseId) return setSkanXato(t("errors.rollWarehouse", { seriya }));
    setQatorlar((joriy) => [...joriy, { modificationId: rulon.modificationId ?? "", nom: rulon.productName ?? "—", quantity: "", batchId: rulon.batchId, serial: rulon.serial ?? seriya, ogirlik: String(rulon.weightLeft ?? rulon.weight ?? "") }]);
    fx.tozala("lines", "serial");
    setSkan("");
  }
  const skanKlavishi = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    void rulonQoshish();
  };

  function tanaYigish(): BerishTanasi | null {
    const lines: BerishTanasi["lines"] = [];
    for (const [i, qator] of qatorlar.entries()) {
      // Rulon qatori: modificationId TZ bo'yicha majburiy, miqdor yuborilmaydi (butun og'irligi beriladi).
      if (qator.batchId) { lines.push(qator.modificationId ? { modificationId: qator.modificationId, batchId: qator.batchId } : { batchId: qator.batchId }); continue; }
      const quantity = sonMaydoni(qator.quantity);
      if (!qator.modificationId) { fx.ornat({ [`lines.${i}.modificationId`]: t("errors.lineProduct") }); return null; }
      if (!(quantity && quantity > 0)) { fx.ornat({ [`lines.${i}.quantity`]: t("errors.lineQuantity") }); return null; }
      lines.push({ modificationId: qator.modificationId, quantity });
    }
    if (lines.length === 0) { fx.ornat({ lines: t("errors.noLines") }); return null; }
    return tozaTana({ orderId: hujjat?.orderId ?? undefined, sourceWarehouseId, wipWarehouseId, consumeOnIssue, note: note.trim(), lines });
  }

  // Server xatosi maydonga. Tana qatorlari oynadagi tartibda yuboriladi — "lines.2.*" indeksi oynadagi 2-qator. Rulon qatorining har qanday
  // maydoni rulon kartasiga; seriya/rulon xatosi javobda seriyasi yoki batchId si bor qatorga, topilmasa skanerga.
  function serverXatosi(tafsilot: unknown) {
    // Dona mahsulotga kasr miqdor (quantity_not_whole): qaysi qator ekani aytilmasa, kasr miqdorli oddiy qatorlar belgilanadi.
    const butun = butunMiqdorXatolari(tafsilot, qatorlar.flatMap((qator, i) => (qator.batchId ? [] : [{ yol: `lines.${i}.quantity`, miqdor: qator.quantity }])), t("errors.quantityNotWhole"));
    if (butun) return fx.ornat(butun);
    const maydonlar = serverXatoMaydonlari(tafsilot, BERISH_XATO_QOIDALARI);
    // serial_needs_on_issue "serial" so'zini ham o'z ichiga oladi: bu belgilash katagining xatosi.
    if (maydonlar.consumeOnIssue) delete maydonlar.serial;
    const javob = JSON.stringify(tafsilot ?? "");
    const natija: Record<string, string> = {};
    for (const [yol, xabar] of Object.entries(maydonlar)) {
      const qism = /^lines\.(\d+)(?:\.(.+))?$/.exec(yol);
      const indeks = qism ? Number(qism[1]) : yol === "serial" ? qatorlar.findIndex((qator) => qator.batchId && ((qator.serial && javob.includes(qator.serial)) || javob.includes(qator.batchId))) : -1;
      const qator = indeks >= 0 ? qatorlar[indeks] : undefined;
      const kalit = !qator ? yol : qator.batchId ? `lines.${indeks}.batchId` : qism?.[2] === "quantity" ? `lines.${indeks}.quantity` : `lines.${indeks}.modificationId`;
      natija[kalit] ??= xabar;
    }
    fx.ornat(natija);
  }

  async function saqlangan() {
    const tana = tanaYigish();
    if (!tana) return null;
    const yangi = id ? await ishlabChiqarishApi.berishlar.yangilash(id, tana) : await ishlabChiqarishApi.berishlar.yaratish(tana);
    hujjatniQollash(yangi);
    onOzgardi();
    return yangi;
  }

  const saqlash = () => { fx.ornat({}); void amal.bajar(saqlangan, serverXatosi); };
  const tasdiqlash = () => { fx.ornat({}); void amal.bajar(async () => {
    const yangi = await saqlangan();
    if (!yangi) return;
    const tasdiq = await ishlabChiqarishApi.berishlar.tasdiqlash(yangi.id);
    hujjatniQollash(tasdiq);
    onOzgardi();
  }, serverXatosi); };
  // Bekor qilish va o'chirish forma maydonlariga tegishli emas: eski maydon xatolari olinadi, xato tepada chiqadi.
  const bekorQilish = () => { fx.ornat({}); void amal.bajar(async () => {
    if (!id) return;
    const yangi = await ishlabChiqarishApi.berishlar.bekorQilish(id);
    hujjatniQollash(yangi);
    onOzgardi();
  }); };
  const ochirish = () => { fx.ornat({}); void amal.bajar(async () => {
    if (!id) return;
    await ishlabChiqarishApi.berishlar.ochirish(id);
    onOzgardi();
    onYopish();
  }); };

  const nomlar = new Map(omborlar.map((ombor) => [ombor.id, ombor.name]));
  const ombor = (omborId: string) => (omborId ? nomlar.get(omborId) ?? "—" : "—");
  const rulonQatorlari = qatorlar.filter((qator) => qator.batchId);
  const rulonOgirligi = rulonQatorlari.reduce((jami, qator) => jami + (Number(qator.ogirlik) || 0), 0);
  const buyurtmaRaqami = hujjat?.orderId ? buyurtmaRaqamlari.get(hujjat.orderId) || "—" : "";
  const sarlavha = hujjatRaqami(hujjat) || (id ? t("issues.draftTitle") : t("issues.create"));

  return (
    <Oyna keng ikonka={PackageOpen} sarlavha={sarlavha} izoh={buyurtmaRaqami ? t("issues.forOrder", { raqam: buyurtmaRaqami }) : t("issues.formHint")} belgi={<Holat status={hujjat?.status} />} onYopish={onYopish} pastki={<>
      {qoralama && id && <button type="button" disabled={amal.band} onClick={ochirish} className={tugmaXavfli}>{t("actions.delete")}</button>}
      {hujjat?.status === "CONFIRMED" && foydalanuvchiKursniOzgartiraOladimi(profil) && <button type="button" disabled={amal.band} onClick={bekorQilish} className={tugmaXavfli}>{t("actions.cancelDocument")}</button>}
      {qoralama && <button type="button" disabled={amal.band} onClick={saqlash} className={tugmaIkkinchi}>{t("actions.save")}</button>}
      {qoralama && <button type="button" disabled={amal.band} onClick={tasdiqlash} className={`${tugmaAsosiy} min-w-40`}><CheckCircle2 size={18} />{t("actions.confirm")}</button>}
    </>}>
      <XatoQutisi matn={fx.tepadagi || (fx.bor ? "" : amal.xato)} />
      {yuklanmoqda ? <Yuklanmoqda /> : <>
        {hujjat && (
          <Tafsilotlar qatorlar={[
            { nom: t("fields.order"), qiymat: buyurtmaRaqami || t("issues.manual") },
            { nom: t("fields.date"), qiymat: kunMatni(hujjat.date ?? undefined) || "—" },
            { nom: t("fields.lines"), qiymat: qatorlar.length },
            { nom: t("issues.colRolls"), qiymat: rulonQatorlari.length ? t("rolls.summary", { soni: rulonQatorlari.length, ogirlik: miqdorMatni(rulonOgirligi) }) : "—" },
            ...(!qoralama ? [
              { nom: t("fields.sourceWarehouse"), qiymat: ombor(sourceWarehouseId), keng: true },
              { nom: t("fields.wipWarehouse"), qiymat: ombor(wipWarehouseId), keng: true },
            ] : []),
          ]} />
        )}
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)]">
          <div className="space-y-5">
            <Bolim ikonka={Warehouse} sarlavha={t("orders.sectionWarehouses")} izoh={t("issues.warehousesHint")}>
              <fieldset disabled={!qoralama} className="m-0 space-y-4 border-0 p-0">
                <div className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:grid-cols-1">
                  <Maydon nom={t("fields.sourceWarehouse")} xato={fx.xato("sourceWarehouseId")}><OmborTanlash value={sourceWarehouseId} omborlar={omborlar} disabled={!qoralama} onChange={(qiymat) => { setSource(qiymat); fx.tozala("sourceWarehouseId"); }} /></Maydon>
                  <ArrowRight aria-hidden size={20} className="mb-3.5 hidden text-slate-300 sm:block xl:hidden" />
                  <Maydon nom={t("fields.wipWarehouse")} xato={fx.xato("wipWarehouseId")}><OmborTanlash sexMi value={wipWarehouseId} omborlar={omborlar} disabled={!qoralama} onChange={(qiymat) => { setWip(qiymat); fx.tozala("wipWarehouseId"); }} /></Maydon>
                </div>
                <label data-maydon-xato={fx.xato("consumeOnIssue") ? "true" : undefined} className={`flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 ${fx.xato("consumeOnIssue") ? xatoRamkasi : ""}`}>
                  <input type="checkbox" checked={consumeOnIssue} onChange={(event) => { setConsumeOnIssue(event.target.checked); fx.tozala("consumeOnIssue"); }} className="mt-0.5 h-5 w-5 shrink-0 accent-orange-500" />
                  <span className="min-w-0">
                    <span className={`block text-sm font-black ${fx.xato("consumeOnIssue") ? "text-red-600" : "text-slate-700"}`}>{t("fields.consumeOnIssue")}</span>
                    <span className="mt-0.5 block text-xs font-semibold leading-5 text-slate-400">{t("issues.consumeHint")}</span>
                    {fx.xato("consumeOnIssue") && <span role="alert" className="mt-1 block text-xs font-bold leading-5 text-red-600">{fx.xato("consumeOnIssue")}</span>}
                  </span>
                </label>
              </fieldset>
            </Bolim>
            {qoralama && (
              <Bolim ikonka={ScanLine} sarlavha={t("issues.sectionScan")}>
                {/* Skaner xatosi (format, takror, ombor, topilmadi) va server seriya xatosi — skaner maydoni ostida. */}
                <Maydon nom={t("issues.scan")} izoh={t("issues.scanHint")} xato={skanXato || fx.xato("serial")}>
                  <div className="flex gap-2">
                    <div className="relative min-w-0 flex-1">
                      <ScanLine size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#2563EB]" />
                      <input value={skan} autoComplete="off" onChange={(event) => { setSkan(event.target.value); setSkanXato(""); fx.tozala("serial"); }} onKeyDown={skanKlavishi} placeholder="J-1031-01" className={`${inputKlass} pl-11`} />
                    </div>
                    <button type="button" disabled={amal.band || !skan.trim()} onClick={() => void rulonQoshish()} className={tugmaIkkinchi}><Plus size={16} />{t("issues.scanAdd")}</button>
                  </div>
                </Maydon>
              </Bolim>
            )}
            <Bolim ikonka={NotebookPen} sarlavha={t("fields.note")}>
              <div data-maydon-xato={fx.xato("note") ? "true" : undefined} className="grid gap-2">
                <textarea value={note} disabled={!qoralama} rows={3} aria-label={t("fields.note")} aria-invalid={fx.xato("note") ? true : undefined} placeholder={qoralama ? t("issues.notePlaceholder") : undefined} onChange={(event) => { setNote(event.target.value); fx.tozala("note"); }} className={`${inputKlass} h-auto py-3 ${fx.xato("note") ? xatoRamkasi : ""}`} />
                {fx.xato("note") && <span role="alert" className="text-xs font-bold leading-5 text-red-600">{fx.xato("note")}</span>}
              </div>
            </Bolim>
          </div>
          <Bolim
            ikonka={ListChecks}
            sarlavha={t("fields.lines")}
            izoh={qoralama ? t("issues.linesHint") : undefined}
            amal={qatorlar.length > 0 ? <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-[#2563EB] ring-1 ring-orange-100">{qatorlar.length}</span> : undefined}
          >
            {qatorlar.length === 0 && (
              <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm font-semibold leading-6 text-slate-400">{qoralama ? t("issues.linesEmpty") : t("empty.lines")}</p>
            )}
            <MaydonXatosi matn={fx.xato("lines")} />
            {qatorlar.map((qator, indeks) => {
              const rulonXatosi = qator.batchId ? fx.xato(`lines.${indeks}.batchId`) : undefined;
              return (
                <QatorKartasi key={qator.id ?? `${qator.batchId}-${indeks}`} className={`md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_48px] ${qator.batchId ? "border-orange-100 bg-orange-50/40" : ""} ${rulonXatosi ? xatoRamkasi : ""}`}>
                  {qator.batchId ? <>
                    <div data-maydon-xato={rulonXatosi ? "true" : undefined} className="flex min-w-0 items-center gap-3 self-center">
                      <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#2563EB] ring-1 ring-orange-100"><Disc3 size={20} /></span>
                      <p className="min-w-0">
                        <span className="block truncate text-sm font-black text-slate-800">{qator.nom}</span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs font-bold">
                          <span className="rounded-full bg-white px-2 py-0.5 text-[#2563EB] ring-1 ring-orange-100">{t("issues.roll")}</span>
                          <span className="text-orange-600">{qator.serial}</span>
                        </span>
                      </p>
                    </div>
                    <p className="self-center text-sm font-bold text-slate-500">{t("rolls.weight")}: <span className="font-black tabular-nums text-slate-800">{miqdorMatni(qator.ogirlik)} {t("rolls.kg")}</span></p>
                  </> : <>
                    <Maydon nom={t("fields.product")} xato={fx.xato(`lines.${indeks}.modificationId`)}><MahsulotQidiruvi value={qator.modificationId} nom={qator.nom} disabled={!qoralama} onChange={(modificationId, nom) => { ozgar(indeks, { modificationId, nom }); fx.tozala(`lines.${indeks}.modificationId`); }} /></Maydon>
                    <Maydon nom={t("fields.quantity")} xato={fx.xato(`lines.${indeks}.quantity`)}><input type="number" inputMode="decimal" min="0" step="any" disabled={!qoralama} value={qator.quantity} onChange={(event) => { ozgar(indeks, { quantity: event.target.value }); fx.tozala(`lines.${indeks}.quantity`); }} className={inputKlass} /></Maydon>
                  </>}
                  {qoralama ? <QatorOchirish onClick={() => { setQatorlar((joriy) => joriy.filter((_, i) => i !== indeks)); fx.tozala("lines"); }} /> : <span />}
                  {rulonXatosi && <p role="alert" className="text-xs font-bold leading-5 text-red-600 md:col-span-3">{rulonXatosi}</p>}
                </QatorKartasi>
              );
            })}
            {qoralama && <QatorQoshish matn={t("issues.addLine")} onClick={() => { setQatorlar((joriy) => [...joriy, { modificationId: "", nom: "", quantity: "", batchId: "", serial: "", ogirlik: "" }]); fx.tozala("lines"); }} />}
          </Bolim>
        </div>
      </>}
    </Oyna>
  );
}

/** Jadval qatoridagi kichik amal tugmasi: bosish qatorga o'tmaydi. */
function AmalTugmasi({ onClick, disabled, xavfli, children }: { onClick: () => void; disabled: boolean; xavfli?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(event) => { event.stopPropagation(); onClick(); }}
      onKeyDown={(event) => event.stopPropagation()}
      className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${xavfli ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-orange-50 text-[#2563EB] ring-1 ring-orange-100 hover:bg-orange-100"}`}
    >
      {children}
    </button>
  );
}

function Qaytarishlar() {
  const { t } = useTranslation("ishlab_chiqarish");
  const royxat = useMalumot(() => ishlabChiqarishApi.qaytarishlar.royxat(), "wip-returns");
  const berishlar = useMalumot(() => ishlabChiqarishApi.berishlar.royxat(), "issues");
  const berishRaqamlari = useMemo(() => raqamXaritasi(berishlar.malumot), [berishlar.malumot]);
  const amal = useAmal();
  // Tasdiqlangan qaytarishni faqat ADMIN yoki direktor bekor qiladi (TZ, 6-bo'lim).
  const rahbar = foydalanuvchiKursniOzgartiraOladimi(useAuthProfileStore((holat) => holat.profil));
  const [yaratish, setYaratish] = useState(false);
  const [filtr, setFiltr] = useState<{ kalit: string; holatlar: string[] } | null>(null);
  const [qidiruv, setQidiruv] = useState("");
  const guruhlar = useHolatGuruhlari();
  const hammasi = useMemo(() => royxat.malumot ?? [], [royxat.malumot]);
  const qatorlar = useMemo(
    () => holatBoyicha(hammasi, filtr?.holatlar ?? null).filter((hujjat) => qidiruvgaMos(qidiruv, [hujjatRaqami(hujjat), berishRaqamlari.get(hujjat.issueId ?? "")])),
    [hammasi, filtr, qidiruv, berishRaqamlari]
  );
  const amalBajarish = (ish: () => Promise<unknown>) => void amal.bajar(async () => { await ish(); royxat.qayta(); });
  const ustunlar: Ustun<SexdanQaytarish>[] = [
    { id: "sexgaberish-column-16", nom: t("fields.document"), katak: (hujjat) => <RaqamKatagi hujjat={hujjat} /> },
    { id: "sexgaberish-column-17", nom: t("fields.issue"), katak: (hujjat) => berishRaqamlari.get(hujjat.issueId ?? "") || "—" },
    { id: "sexgaberish-column-18", nom: t("fields.date"), katak: (hujjat) => kunMatni(hujjat.date ?? undefined) || "—" },
    { id: "sexgaberish-column-19", nom: t("fields.lines"), ong: true, katak: (hujjat) => hujjat.lines?.length ?? "—" },
    { id: "sexgaberish-column-20", nom: t("fields.status"), katak: (hujjat) => <Holat status={hujjat.status} /> },
    { id: "sexgaberish-column-21",
      nom: t("fields.actions"),
      katak: (hujjat) => (
        <span className="flex flex-wrap gap-2">
          {hujjat.status === "DRAFT" && <AmalTugmasi disabled={amal.band} onClick={() => amalBajarish(() => ishlabChiqarishApi.qaytarishlar.tasdiqlash(hujjat.id))}><CheckCircle2 size={14} />{t("actions.confirm")}</AmalTugmasi>}
          {hujjat.status !== "CANCELLED" && (hujjat.status === "DRAFT" || rahbar) && <AmalTugmasi xavfli disabled={amal.band} onClick={() => amalBajarish(() => ishlabChiqarishApi.qaytarishlar.bekorQilish(hujjat.id))}><Ban size={14} />{t("actions.cancelDocument")}</AmalTugmasi>}
        </span>
      ),
    },
  ];
  const yangiTugma = <button type="button" onClick={() => setYaratish(true)} className={tugmaAsosiy}><Undo2 size={16} />{t("issues.createReturn")}</button>;
  const filtrlangan = hammasi.length > 0;
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-slate-400">{t("issues.returnHint")}</p>
        <div className="flex justify-end">{yangiTugma}</div>
      </div>
      <HolatKartalari guruhlar={guruhlar} qatorlar={hammasi} tanlangan={filtr?.kalit ?? ""} yuklanmoqda={royxat.yuklanmoqda && !royxat.malumot} onTanlash={(guruh) => setFiltr(guruh?.holatlar ? { kalit: guruh.kalit, holatlar: guruh.holatlar } : null)} />
      <Asboblar>
        <QidiruvMaydoni qiymat={qidiruv} onChange={setQidiruv} placeholder={t("issues.returnSearchPlaceholder")} />
        <HolatFiltri qiymat={filtr?.holatlar.length === 1 ? filtr.holatlar[0] : ""} onChange={(holat) => setFiltr(holat ? { kalit: holat, holatlar: [holat] } : null)} holatlar={HOLATLAR} />
      </Asboblar>
      <XatoQutisi matn={royxat.xato || amal.xato} />
      <Jadval tableId="IshlabChiqarish/SexgaBerish/jadval-3"
        ustunlar={ustunlar}
        qatorlar={qatorlar}
        kalit={(hujjat) => hujjat.id}
        yuklanmoqda={royxat.yuklanmoqda && !royxat.malumot}
        sahifaHajmi={20}
        boshIkonka={Undo2}
        bosh={filtrlangan ? t("issues.emptyFiltered") : t("issues.returnsEmptyTitle")}
        boshIzoh={filtrlangan ? t("issues.emptyFilteredHint") : t("issues.returnsEmptyHint")}
        boshAmal={filtrlangan ? <button type="button" onClick={() => { setFiltr(null); setQidiruv(""); }} className={tugmaIkkinchi}>{t("actions.resetFilters")}</button> : yangiTugma}
      />
      {yaratish && <QaytarishOynasi onYopish={() => setYaratish(false)} onSaqlandi={() => { setYaratish(false); royxat.qayta(); }} />}
    </div>
  );
}

function QaytarishOynasi({ onYopish, onSaqlandi }: { onYopish: () => void; onSaqlandi: () => void }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const omborlar = useOmborlar();
  const berishlar = useMalumot(() => ishlabChiqarishApi.berishlar.royxat({ status: "CONFIRMED" }), "confirmed-issues");
  const amal = useAmal();
  const fx = useMaydonXatolari(QAYTARISH_XATO_QOIDALARI);
  const [issueId, setIssueId] = useState("");
  const hujjat = useMalumot(() => (issueId ? ishlabChiqarishApi.berishlar.olish(issueId) : Promise.resolve(null)), issueId);
  // Rulon faqat butunligicha qaytadi: belgilanadi, miqdor yuborilmaydi. Oddiy qatorda miqdor yoziladi.
  const [tanlov, setTanlov] = useState<Record<string, { belgi: boolean; miqdor: string }>>({});
  const qatorlar = (hujjat.malumot?.lines ?? []).filter((qator) => qator.id);
  const nomlar = new Map(omborlar.map((ombor) => [ombor.id, ombor.name]));
  const ombor = (omborId?: string | null) => (omborId ? nomlar.get(omborId) ?? "—" : "—");
  const tanlanganlar = qatorlar.filter((qator) => tanlov[qator.id as string]?.belgi).length;

  // Qator xatosi kaliti — tananing indeksi emas, issueLineId: "lines.<issueLineId>.quantity" (oddiy qator miqdori) va "lines.<issueLineId>"
  // (qator kartasi, rulon). Tanaga faqat belgilangan qatorlar tushadi, shuning uchun server "lines.1.quantity" dagi 1 — oynadagi 1-qator emas.
  type QaytarishQatori = { issueLineId: string; quantity?: number };

  function serverXatosi(tafsilot: unknown, lines: QaytarishQatori[]) {
    const butun = butunMiqdorXatolari(tafsilot, lines.flatMap((qator) => (qator.quantity === undefined ? [] : [{ yol: `lines.${qator.issueLineId}.quantity`, miqdor: qator.quantity }])), t("errors.quantityNotWhole"));
    if (butun) return fx.ornat(butun);
    const maydonlar = serverXatoMaydonlari(tafsilot, QAYTARISH_XATO_QOIDALARI);
    const javob = JSON.stringify(tafsilot ?? "");
    const natija: Record<string, string> = {};
    for (const [yol, xabar] of Object.entries(maydonlar)) {
      const qism = /^lines\.(\d+)(?:\.(.+))?$/.exec(yol);
      // Kod yoki so'z bo'yicha "lines": javobda tanlangan qatorning id si bo'lsa — o'sha qator.
      const qator = qism ? lines[Number(qism[1])] : yol === "lines" ? lines.find((element) => javob.includes(element.issueLineId)) : undefined;
      const kalit = !qator ? yol : qator.quantity !== undefined && (qism?.[2] ?? "quantity") === "quantity" ? `lines.${qator.issueLineId}.quantity` : `lines.${qator.issueLineId}`;
      natija[kalit] ??= xabar;
    }
    fx.ornat(natija);
  }

  function saqlash() {
    fx.ornat({});
    const lines: QaytarishQatori[] = [];
    for (const qator of qatorlar) {
      const holat = tanlov[qator.id as string];
      if (!holat?.belgi) continue;
      if (qator.batchId) { lines.push({ issueLineId: qator.id as string }); continue; }
      const quantity = sonMaydoni(holat.miqdor);
      if (!(quantity && quantity > 0)) return fx.ornat({ [`lines.${qator.id as string}.quantity`]: t("errors.lineQuantity") });
      lines.push({ issueLineId: qator.id as string, quantity });
    }
    if (lines.length === 0) return fx.ornat({ lines: t("errors.noLines") });
    void amal.bajar(async () => { await ishlabChiqarishApi.qaytarishlar.yaratish({ issueId, lines }); onSaqlandi(); }, (tafsilot) => serverXatosi(tafsilot, lines));
  }

  const tanlangan = hujjat.malumot && issueId && !hujjat.yuklanmoqda ? hujjat.malumot : null;
  return (
    <Oyna keng ikonka={Undo2} sarlavha={t("issues.createReturn")} izoh={t("issues.returnFormHint")} onYopish={onYopish} pastki={<>
      <button type="button" onClick={onYopish} className={tugmaIkkinchi}>{t("actions.cancel")}</button>
      <button type="button" disabled={amal.band || !issueId} onClick={saqlash} className={`${tugmaAsosiy} min-w-40`}><CheckCircle2 size={18} />{t("actions.save")}</button>
    </>}>
      <XatoQutisi matn={berishlar.xato || hujjat.xato || fx.tepadagi || (fx.bor ? "" : amal.xato)} />
      <Bolim ikonka={PackageOpen} sarlavha={t("fields.issue")}>
        <Maydon nom={t("fields.selectIssue")} izoh={t("issues.issueSelectHint")} xato={fx.xato("issueId")}>
          <select value={issueId} onChange={(event) => { setIssueId(event.target.value); setTanlov({}); fx.tozala("issueId", "lines"); }} className={inputKlass}>
            <option value="">{t("fields.selectIssue")}</option>
            {(berishlar.malumot ?? []).map((item) => <option key={item.id} value={item.id}>{hujjatRaqami(item) || "—"}</option>)}
          </select>
        </Maydon>
        {tanlangan && (
          <Tafsilotlar qatorlar={[
            { nom: t("fields.date"), qiymat: kunMatni(tanlangan.date ?? undefined) || "—" },
            { nom: t("fields.lines"), qiymat: tanlangan.lines?.length ?? 0 },
            { nom: t("fields.sourceWarehouse"), qiymat: ombor(tanlangan.sourceWarehouseId) },
            { nom: t("fields.wipWarehouse"), qiymat: ombor(tanlangan.wipWarehouseId) },
          ]} />
        )}
      </Bolim>
      <Bolim
        ikonka={ListChecks}
        sarlavha={t("issues.sectionReturnLines")}
        izoh={issueId ? t("issues.returnLinesHint") : undefined}
        amal={tanlanganlar > 0 ? <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-[#2563EB] ring-1 ring-orange-100">{t("issues.selectedCount", { soni: tanlanganlar })}</span> : undefined}
      >
        {!issueId ? (
          <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm font-semibold leading-6 text-slate-400">{t("issues.returnPickIssue")}</p>
        ) : hujjat.yuklanmoqda ? (
          <Yuklanmoqda />
        ) : qatorlar.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-400">{t("empty.lines")}</p>
        ) : (
          <div className="space-y-3">
            <MaydonXatosi matn={fx.xato("lines")} />
            <div className="grid gap-3 lg:grid-cols-2">
              {qatorlar.map((qator) => {
                const kalit = qator.id as string;
                const holat = tanlov[kalit] ?? { belgi: false, miqdor: "" };
                const kartaXatosi = fx.xato(`lines.${kalit}`);
                // Qator o'zgarsa — uning xatosi; ro'yxat xatosi ("kamida bitta qator") bo'lsa u ham olinadi.
                const qatorniTozala = () => { fx.tozala(`lines.${kalit}`); if (fx.xato("lines")) fx.tozala("lines"); };
                return (
                  <div key={kalit} data-maydon-xato={kartaXatosi ? "true" : undefined} className={`flex flex-col gap-3 rounded-2xl border p-4 transition ${holat.belgi ? "bg-orange-50/50" : "bg-slate-50/70"} ${kartaXatosi ? xatoRamkasi : holat.belgi ? "border-orange-300 ring-4 ring-orange-100/60" : "border-slate-200"}`}>
                    <label className="flex min-w-0 cursor-pointer items-start gap-3">
                      <input type="checkbox" checked={holat.belgi} onChange={(event) => { setTanlov((joriy) => ({ ...joriy, [kalit]: { ...holat, belgi: event.target.checked } })); qatorniTozala(); }} className="mt-0.5 h-5 w-5 shrink-0 accent-orange-500" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black text-slate-800">{qatorNomi(qator)}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400">
                          {qator.batchId && <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[#2563EB] ring-1 ring-orange-100"><Disc3 size={12} />{t("issues.roll")}</span>}
                          {qator.serial && <span className="text-orange-600">{qator.serial}</span>}
                          <span>{t("issues.issuedQuantity", { miqdor: `${miqdorMatni(qator.quantity)}${qator.batchId ? ` ${t("rolls.kg")}` : ""}` })}</span>
                        </span>
                      </span>
                    </label>
                    {qator.batchId
                      ? <span className="self-start rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-500 ring-1 ring-slate-200">{t("issues.wholeRoll")}</span>
                      : (
                        <Maydon nom={t("issues.returnQuantity")} xato={fx.xato(`lines.${kalit}.quantity`)}>
                          <input type="number" inputMode="decimal" min="0" step="any" aria-label={t("fields.quantity")} placeholder={miqdorMatni(qator.quantity)} value={holat.miqdor} onChange={(event) => { setTanlov((joriy) => ({ ...joriy, [kalit]: { ...holat, belgi: true, miqdor: event.target.value } })); qatorniTozala(); }} className={inputKlass} />
                        </Maydon>
                      )}
                    {kartaXatosi && <p role="alert" className="text-xs font-bold leading-5 text-red-600">{kartaXatosi}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Bolim>
    </Oyna>
  );
}
