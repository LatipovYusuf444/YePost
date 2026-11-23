import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, Disc3, FileText, LoaderCircle, NotebookPen, Package, Plus, ScanLine, Trash2, Truck, Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import AppModal from "@/Components/common/AppModal";
import AppSelect from "@/Components/ui/AppSelect";
import SummaMaydoni from "@/Components/common/SummaMaydoni";
import XatoliMaydon, { MaydonXatosi } from "@/Components/common/XatoliMaydon";
import HujjatSanasiMaydoni from "@/Components/common/HujjatSanasi";
import { ishlabChiqarishApi } from "@/api/ishlabChiqarishApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { taminotchiQaytarishApi } from "@/api/taminotchiQaytarishApi";
import { useMaydonXatolari } from "@/hooks/useMaydonXatolari";
import { useOzgarishBormi } from "@/hooks/useOzgarishBormi";
import { asosiyValyuta } from "@/lib/asosiyValyuta";
import { bugungiToshkentKuni, tahrirSanasi, toshkentKuni, yangiHujjatSanasi } from "@/lib/hujjatSanasi";
import type { XatoMaydonQoidasi } from "@/lib/maydonXatolari";
import { formaJami, hujjatdanForma, kirimNarxi, mosKirimlar, qaytarishTanasiniYigish, type QaytarishForma, type QaytarishFormaQatori } from "@/lib/taminotchiQaytarish";
import { useYagonaValyuta, valyutaKodi, type Valyuta } from "@/lib/valyuta";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { useOmborStore } from "@/store/omborStore";
import type { TaminotchiQaytarishHujjati } from "@/types/taminotchiQaytarish";
import MahsulotTanlov, { type MahsulotVarianti } from "../MahsulotTanlov";
import { AsosiyEkvivalent, QatorBirligiTanlovi, UmumiyBirlikPaneli } from "../HujjatBirligi";
import { tovarBirliklariniOlish, useTovarBirliklari } from "@/hooks/useTovarBirliklari";
import { birlikMiqdoriYaroqli, birlikNomi, birlikdagiNarx, qatorBirligi, qatorKoeffi, umumiyBirlikTovarda, umumiyBirlikVariantlari } from "@/lib/hujjatBirligi";
import { hujjatRaqami, modificationNomi, pul, qoldiqMiqdori, sana } from "../omborYordamchilari";

type Props = { tahrir?: TaminotchiQaytarishHujjati; onClose: () => void; onSaqlandi: (id: string) => void };

// Server xatosi → maydon (kalit — backend yo'li). Qator xatolari ("items.1.price") o'z maydoniga to'g'ridan-to'g'ri tushadi.
const XATO_QOIDALARI: Record<string, XatoMaydonQoidasi> = {
  supplierId: { maydonlar: ["supplierId"], kodlar: ["supplier_not_found", "supplier"], sozlar: ["yetkazib beruvchi", "поставщик"] },
  date: { maydonlar: ["date"], kodlar: ["date_in_future", "period_closed", "before_stock_take"], sozlar: ["hujjat sanasi", "дата документа"] },
  currency: { maydonlar: ["currency"], kodlar: ["currency_mismatch", "not_allowed"] },
  note: { maydonlar: ["note"] },
  items: { maydonlar: ["items"], kodlar: ["out_of_stock", "stock_reserved", "negative_stock", "serial_required", "roll_short", "roll_not_found", "purchase_mismatch", "price_required", "no_lines"] },
};

let qatorRaqami = 0;
const yangiQator = (warehouseId = ""): QaytarishFormaQatori => ({
  id: `q${++qatorRaqami}`,
  modificationId: "",
  warehouseId,
  quantity: "",
  purchaseId: "",
  price: "",
  narxKirimdan: false,
  seriyali: false,
  batchId: "",
  serial: "",
  birlikId: "",
  koeff: 1,
});

const input =
  "h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";
const selectKlass = "h-12 w-full min-w-0 rounded-2xl text-sm font-semibold text-slate-700 [&>button]:min-w-0 [&>button]:rounded-2xl [&>button]:px-4";

export default function QaytarishOynasi({ tahrir, onClose, onSaqlandi }: Props) {
  const { t: tr } = useTranslation("ombor_royxat");
  const t = (kalit: string, parametrlar?: Record<string, unknown>) => tr(`taminotchiQaytarish.${kalit}`, parametrlar);
  const store = useOmborStore();
  const malumotlarniYuklashAgarKerak = store.malumotlarniYuklashAgarKerak;
  const profil = useAuthProfileStore((holat) => holat.profil);
  const yagona = useYagonaValyuta();
  const fx = useMaydonXatolari(XATO_QOIDALARI);
  const [band, setBand] = useState(false);
  const [xato, setXato] = useState("");
  const [rulonQidiruv, setRulonQidiruv] = useState<string | null>(null);
  const [yaratilganId, setYaratilganId] = useState<string | undefined>();
  // Yaratishda yuborilgan kun: qayta urinish (PATCH) sanani shunga nisbatan yuboradi — "bugun"ga qaytarish ham ketadi.
  const [yaratilganKun, setYaratilganKun] = useState("");

  useEffect(() => { void malumotlarniYuklashAgarKerak(); }, [malumotlarniYuklashAgarKerak]);

  const modMap = useMemo(() => new Map(store.modifikatsiyalar.map((mod) => [mod.id, mod])), [store.modifikatsiyalar]);
  const seriyalimi = (modificationId: string) => Boolean(modMap.get(modificationId)?.product?.trackSerial);
  const omborlar = useMemo(() => store.omborlar.filter((ombor) => ombor.isActive !== false), [store.omborlar]);
  const standartOmbor = omborlar.find((ombor) => ombor.kind !== "WIP")?.id ?? omborlar[0]?.id ?? "";

  const [boshlangichSana] = useState(() => (tahrir ? toshkentKuni(tahrir.date ?? tahrir.createdAt ?? undefined) || bugungiToshkentKuni() : bugungiToshkentKuni()));
  const [hujjatSanasi, setHujjatSanasi] = useState(boshlangichSana);
  const [forma, setForma] = useState<QaytarishForma>(() =>
    tahrir
      ? hujjatdanForma(tahrir, () => false)
      : { supplierId: "", currency: (yagona ?? asosiyValyuta()) as "UZS" | "USD", note: "", qatorlar: [yangiQator()] }
  );
  // Standart ombor va seriyali belgisi fonda qo'yiladi — ular foydalanuvchi o'zgarishi emas (mahsulotsiz qatorning ombori hisoblanmaydi).
  const ozgarishBor = useOzgarishBormi({
    forma: { ...forma, qatorlar: forma.qatorlar.map((qator) => ({ ...qator, seriyali: undefined, warehouseId: qator.modificationId ? qator.warehouseId : "" })) },
    hujjatSanasi,
  });

  // Ombor va katalog yuklangach: bo'sh qatorlarga standart ombor, tahrirda seriyali belgisi.
  useEffect(() => {
    if (!standartOmbor && !store.modifikatsiyalar.length) return;
    setForma((joriy) => {
      let ozgardi = false;
      const qatorlar = joriy.qatorlar.map((qator) => {
        const warehouseId = qator.warehouseId || standartOmbor;
        const seriyali = qator.modificationId ? seriyalimi(qator.modificationId) : false;
        if (warehouseId === qator.warehouseId && seriyali === qator.seriyali) return qator;
        ozgardi = true;
        return { ...qator, warehouseId, seriyali };
      });
      return ozgardi ? { ...joriy, qatorlar } : joriy;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standartOmbor, store.modifikatsiyalar]);

  const ozgar = (qism: Partial<QaytarishForma>) => {
    fx.tozala(...Object.keys(qism));
    setForma((joriy) => ({ ...joriy, ...qism }));
  };
  const qatorniOzgartir = (indeks: number, qism: Partial<QaytarishFormaQatori>) => {
    fx.tozala(...Object.keys(qism).map((kalit) => `items.${indeks}.${kalit}`), "items");
    setForma((joriy) => ({ ...joriy, qatorlar: joriy.qatorlar.map((qator, i) => (i === indeks ? { ...qator, ...qism } : qator)) }));
  };
  const qatorQoshish = () => {
    fx.tozala("items");
    setForma((joriy) => ({ ...joriy, qatorlar: [...joriy.qatorlar, yangiQator(joriy.qatorlar[joriy.qatorlar.length - 1]?.warehouseId || standartOmbor)] }));
  };
  const qatorOchirish = (indeks: number) => {
    fx.ornat({});
    setForma((joriy) => ({ ...joriy, qatorlar: joriy.qatorlar.length > 1 ? joriy.qatorlar.filter((_, i) => i !== indeks) : [yangiQator(standartOmbor)] }));
  };

  function yetkazibBeruvchiTanlash(supplierId: string) {
    fx.tozala("supplierId", "items");
    setForma((joriy) => ({
      ...joriy,
      supplierId,
      qatorlar: joriy.qatorlar.map((qator) => (qator.purchaseId && kirimMap.get(qator.purchaseId)?.supplierId !== supplierId ? { ...qator, purchaseId: "", narxKirimdan: false } : qator)),
    }));
  }

  const mahsulotVariantlari = useMemo<MahsulotVarianti[]>(() => store.modifikatsiyalar.map((mod) => ({ id: mod.id, modification: mod })), [store.modifikatsiyalar]);
  const yetkazibBeruvchi = store.yetkazibBeruvchilar.find((item) => item.id === forma.supplierId);
  const qoldiq = (modificationId: string, warehouseId: string) => {
    const topilgan = store.qoldiqlar.filter((item) => item.modificationId === modificationId && item.warehouseId === warehouseId);
    return topilgan.length ? topilgan.reduce((jami, item) => jami + qoldiqMiqdori(item), 0) : null;
  };
  const kirimMap = useMemo(() => new Map(store.kirimlar.map((kirim) => [kirim.id, kirim])), [store.kirimlar]);
  const jami = formaJami(forma.qatorlar);

  // Qator tovarining birliklari (korobka, qop): qator birligi va "Umumiy birlik" uchun.
  const { t: tb } = useTranslation("ombor_kichik");
  const tovarId = (modificationId: string) => {
    const mod = modMap.get(modificationId);
    return mod?.productId ?? mod?.product?.id ?? "";
  };
  const tovarBirliklari = useTovarBirliklari(forma.qatorlar.map((qator) => tovarId(qator.modificationId)));
  const qatorBirliklari = (qator: Pick<QaytarishFormaQatori, "modificationId">) => tovarBirliklari[tovarId(qator.modificationId)];
  const koeffi = (qator: QaytarishFormaQatori, birlikId = qator.birlikId) => qatorKoeffi(qatorBirliklari(qator), birlikId, birlikId === qator.birlikId ? qator.koeff : 1);
  const [umumiyBirlik, setUmumiyBirlik] = useState<string | null>(null);
  const [birlikXabari, setBirlikXabari] = useState("");
  const umumiyBirlikRef = useRef<string | null>(null);
  const umumiyVariantlar = umumiyBirlikVariantlari(forma.qatorlar.filter((qator) => qator.modificationId).map(qatorBirliklari));

  // Birlik almashganda narx yangi birlikka o'tadi: kirimdan olingan narx — kirim narxi × koeffitsient (server ham shunday qiladi),
  // qo'lda yozilgan narx — eski birlikdan yangisiga qayta hisoblanadi. Miqdor soni o'zgarmaydi.
  function birlikdagiQator(qator: QaytarishFormaQatori, birlikId: string): QaytarishFormaQatori {
    const yangiKoeff = qatorKoeffi(qatorBirliklari(qator), birlikId);
    const eskiKoeff = koeffi(qator);
    let price = qator.price;
    if (qator.purchaseId && qator.narxKirimdan) {
      const narx = kirimNarxi(kirimMap.get(qator.purchaseId), qator.modificationId);
      if (narx !== undefined) price = String(birlikdagiNarx(narx, 1, yangiKoeff));
    } else if (price.trim()) {
      const eski = Number(String(price).replace(/\s/g, "").replace(",", "."));
      if (Number.isFinite(eski)) price = String(birlikdagiNarx(eski, eskiKoeff, yangiKoeff));
    }
    return { ...qator, birlikId, koeff: yangiKoeff, price };
  }

  function birlikniOzgartirish(indeks: number, birlikId: string) {
    fx.tozala(`items.${indeks}.quantity`, `items.${indeks}.price`);
    setForma((joriy) => ({ ...joriy, qatorlar: joriy.qatorlar.map((qator, i) => (i === indeks ? birlikdagiQator(qator, birlikId) : qator)) }));
  }

  function umumiyBirlikniTanlash(unitId: string) {
    setUmumiyBirlik(unitId);
    umumiyBirlikRef.current = unitId;
    // Natija joriy qatorlardan darhol hisoblanadi (xabardagi son to'g'ri chiqishi uchun — updater funksiyasi keyinroq ishlaydi).
    let qolgan = 0;
    const kutilayotgan: QaytarishFormaQatori[] = [];
    const yangi = forma.qatorlar.map((qator) => {
      if (!qator.modificationId) return qator;
      if (!unitId) return qator.birlikId ? birlikdagiQator(qator, "") : qator;
      if (!qatorBirliklari(qator)) {
        kutilayotgan.push(qator);
        return qator;
      }
      const birlik = umumiyBirlikTovarda(qatorBirliklari(qator), unitId);
      if (!birlik) {
        qolgan += 1;
        return qator;
      }
      return qator.birlikId === birlik.unitId ? qator : birlikdagiQator(qator, birlik.unitId);
    });
    setForma((joriy) => ({ ...joriy, qatorlar: yangi }));
    kutilayotgan.forEach((qator) => umumiyniQollash(qator.id, qator.modificationId));
    fx.tozala(...forma.qatorlar.flatMap((_, i) => [`items.${i}.quantity`, `items.${i}.price`]));
    const nom = umumiyVariantlar.find((variant) => variant.unitId === unitId)?.nom ?? "";
    setBirlikXabari(unitId && qolgan > 0 ? tb("hujjatBirligi.umumiy.skipped", { count: qolgan, unit: nom }) : "");
  }

  function mahsulotTanlash(indeks: number, modificationId: string) {
    const qatorId = forma.qatorlar[indeks]?.id;
    qatorniOzgartir(indeks, { modificationId, purchaseId: "", price: "", narxKirimdan: false, batchId: "", serial: "", seriyali: seriyalimi(modificationId), birlikId: "", koeff: 1 });
    if (qatorId) umumiyniQollash(qatorId, modificationId);
  }

  // Umumiy birlik tanlangan bo'lsa, tovar birliklari yuklangach qatorga qo'yiladi (faqat narxi hali bo'sh qatorga — narx birligi aralashmasin).
  function umumiyniQollash(qatorId: string, modificationId: string) {
    const unitId = umumiyBirlikRef.current;
    const productId = tovarId(modificationId);
    if (!unitId || !productId) return;
    void tovarBirliklariniOlish(productId).then((birliklar) => {
      const birlik = umumiyBirlikTovarda(birliklar, unitId);
      if (!birlik || umumiyBirlikRef.current !== unitId) return;
      setForma((joriy) => ({
        ...joriy,
        qatorlar: joriy.qatorlar.map((qator) => (qator.id === qatorId && qator.modificationId === modificationId && !qator.birlikId && !qator.price.trim()
          ? { ...qator, birlikId: birlik.unitId, koeff: birlik.koeff }
          : qator)),
      }));
    });
  }

  /** Kirim tanlanganda narx shu kirimdan to'ldiriladi; hujjat valyutasi kirimnikiga teng bo'lishi kerak. */
  function kirimTanlash(indeks: number, purchaseId: string) {
    const qator = forma.qatorlar[indeks];
    if (!purchaseId) return qatorniOzgartir(indeks, { purchaseId: "", narxKirimdan: false });
    const kirim = kirimMap.get(purchaseId);
    const narx = kirimNarxi(kirim, qator.modificationId);
    const kirimValyutasi = valyutaKodi(kirim?.currency) as "UZS" | "USD";
    // Hujjat valyutasi faqat boshqa qatorlarda narx yoki kirim yo'q bo'lsa kirimnikiga o'tadi: aks holda qo'lda yozilgan narxlar
    // boshqa valyutada o'qilib qolardi. Bir valyutali rejimda valyuta o'zgarmaydi.
    const boshqalarToldirilgan = forma.qatorlar.some((boshqa, i) => i !== indeks && (boshqa.purchaseId || boshqa.price.trim()));
    const almashadi = kirimValyutasi !== forma.currency && !boshqalarToldirilgan && !yagona;
    // Kirim narxi asosiy birlikda: qator korobkada bo'lsa × koeffitsient (narx yuborilmaydi — server ham shunday hisoblaydi).
    qatorniOzgartir(indeks, { purchaseId, price: narx !== undefined ? String(birlikdagiNarx(narx, 1, koeffi(qator))) : qator.price, narxKirimdan: narx !== undefined });
    if (almashadi) ozgar({ currency: kirimValyutasi });
    // Xato qator yangilangandan keyin qo'yiladi (aks holda shu yangilanish uni darhol tozalab yuboradi).
    else if (kirimValyutasi !== forma.currency) fx.ornat({ [`items.${indeks}.purchaseId`]: t("errors.currencyMismatch", { valyuta: kirimValyutasi }) });
  }

  /** Rulon seriyasi bo'yicha partiya (batchId) topiladi: rulonli tovar faqat o'z partiyasidan qaytariladi. */
  async function rulonTopish(indeks: number) {
    const qator = forma.qatorlar[indeks];
    const serial = qator.serial.trim();
    if (!serial) return fx.ornat({ [`items.${indeks}.batchId`]: t("errors.rollRequired") });
    setRulonQidiruv(qator.id);
    try {
      const rulon = await ishlabChiqarishApi.rulonlar.seriyaBoyicha(serial);
      if (rulon.modificationId && rulon.modificationId !== qator.modificationId) {
        fx.ornat({ [`items.${indeks}.batchId`]: t("errors.rollOtherProduct") });
        return;
      }
      // Kutish paytida qatorlar o'chirilgan yoki mahsulot almashtirilgan bo'lishi mumkin: qator id bo'yicha topiladi.
      setForma((joriy) => ({
        ...joriy,
        qatorlar: joriy.qatorlar.map((joriyQator) => (joriyQator.id === qator.id && joriyQator.modificationId === qator.modificationId
          ? { ...joriyQator, batchId: rulon.batchId, ...(rulon.warehouseId ? { warehouseId: rulon.warehouseId } : {}), ...(joriyQator.quantity || joriyQator.birlikId ? {} : { quantity: String(rulon.weightLeft ?? rulon.weight ?? "") }) }
          : joriyQator)),
      }));
      fx.tozala(`items.${indeks}.batchId`);
    } catch (error) {
      fx.ornat({ [`items.${indeks}.batchId`]: getApiErrorMessage(error) });
    } finally {
      setRulonQidiruv(null);
    }
  }

  async function saqlash(tasdiqlash: boolean) {
    if (band) return;
    setXato("");
    // Bo'sh qatorlar olib tashlanadi: mijoz va server xatolaridagi `items.N` ko'rinadigan qator raqamiga mos bo'ladi.
    const toldirilgan = forma.qatorlar.filter((qator) => qator.modificationId || qator.quantity.trim() || qator.price.trim());
    const ishchi = toldirilgan.length && toldirilgan.length !== forma.qatorlar.length ? { ...forma, qatorlar: toldirilgan } : forma;
    if (ishchi !== forma) setForma(ishchi);
    const natija = qaytarishTanasiniYigish(ishchi, (kalit) => t(kalit), { responsibleId: tahrir?.responsibleId ?? profil?.id });
    if ("xatolar" in natija) return fx.ornat(natija.xatolar);
    // Qo'shimcha birlikda (korobka) faqat butun son.
    const butunEmas = Object.fromEntries(ishchi.qatorlar.flatMap((qator, i) => {
      const birlik = qatorBirligi(qatorBirliklari(qator), qator.birlikId);
      return !birlikMiqdoriYaroqli(birlik, Number(qator.quantity.replace(",", ".")) || 0) ? [[`items.${i}.quantity`, tb("hujjatBirligi.notWhole", { unit: birlikNomi(birlik) })]] : [];
    }));
    if (Object.keys(butunEmas).length) return fx.ornat(butunEmas);
    // Kirimli qatorlar valyutasi hujjat valyutasiga teng (server supplier_return_currency_mismatch beradi).
    const valyutaXatolari = Object.fromEntries(ishchi.qatorlar.flatMap((qator, i) => {
      const kirim = qator.purchaseId ? kirimMap.get(qator.purchaseId) : undefined;
      return kirim && valyutaKodi(kirim.currency) !== forma.currency ? [[`items.${i}.purchaseId`, t("errors.currencyMismatch", { valyuta: valyutaKodi(kirim.currency) })]] : [];
    }));
    if (Object.keys(valyutaXatolari).length) return fx.ornat(valyutaXatolari);
    fx.ornat({});
    setBand(true);
    // Yaratilgan, lekin tasdiqlash xato bergan hujjat: keyingi urinish shu qoralamani yangilaydi (ikkinchi hujjat ochilmaydi).
    const mavjudId = tahrir?.id ?? yaratilganId;
    let saqlandi = false;
    try {
      const sana = tahrir
        ? tahrirSanasi(hujjatSanasi, boshlangichSana)
        : yaratilganId
          ? tahrirSanasi(hujjatSanasi, yaratilganKun)
          : yangiHujjatSanasi(hujjatSanasi);
      const hujjat = mavjudId
        ? await taminotchiQaytarishApi.yangilash(mavjudId, { ...natija.tana, ...sana })
        : await taminotchiQaytarishApi.yaratish({ ...natija.tana, ...sana });
      if (!tahrir) {
        setYaratilganId(hujjat.id);
        setYaratilganKun(hujjatSanasi);
      }
      saqlandi = true;
      if (tasdiqlash) await taminotchiQaytarishApi.tasdiqlash(hujjat.id);
      onSaqlandi(hujjat.id);
    } catch (error) {
      const tafsilot = (error as { response?: { data?: unknown } })?.response?.data;
      const boglandi = fx.serverdan(tafsilot);
      if (!boglandi) setXato(saqlandi ? `${getApiErrorMessage(error)} ${t("savedAsDraft")}` : getApiErrorMessage(error));
      else if (saqlandi) setXato(t("savedAsDraft"));
    } finally {
      setBand(false);
    }
  }

  const tepadagiXato = fx.tepadagi || (fx.bor ? "" : xato);

  return (
    <AppModal onClose={onClose} ozgarishBor={ozgarishBor} className="sidebar-aligned-document-modal items-stretch p-3 sm:p-5">
      <div className="relative flex min-h-0 w-full flex-col overflow-hidden rounded-[34px] border border-orange-100 bg-[#F8FAFC] shadow-[0_28px_90px_rgba(15,23,42,.34)]">
        <header className="flex shrink-0 items-center gap-4 border-b border-orange-100 bg-white/80 px-5 py-4 sm:px-8">
          <span aria-hidden className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 ring-1 ring-orange-100 sm:flex"><Undo2 size={22} /></span>
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{tahrir ? t("editTitle", { number: hujjatRaqami(tahrir) }) : t("createTitle")}</h2>
            <p className="mt-0.5 text-sm font-medium text-slate-500">{t("formHint")}</p>
          </div>
        </header>

        <div className="scrollbar-hidden min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-8">
          {tepadagiXato && <p role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-600">{tepadagiXato}</p>}

          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Karta ikonka={<Truck size={18} />} sarlavha={t("aboutSection")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Maydon nom={t("fields.supplier")} majburiy xato={fx.xato("supplierId")} className="sm:col-span-2">
                  <AppSelect value={forma.supplierId} aria-label={t("fields.supplier")} onChange={(event) => yetkazibBeruvchiTanlash(event.target.value)} className={selectKlass}>
                    <option value="">{t("fields.selectSupplier")}</option>
                    {store.yetkazibBeruvchilar.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </AppSelect>
                </Maydon>
                <Maydon nom={t("fields.date")} xato={fx.xato("date")}>
                  <HujjatSanasiMaydoni value={hujjatSanasi} onChange={(kun) => { fx.tozala("date"); setHujjatSanasi(kun); }} className={input} aria-label={t("fields.date")} />
                </Maydon>
                <Maydon nom={t("fields.currency")} xato={fx.xato("currency")} izoh={t("currencyHint")}>
                  <AppSelect value={yagona ?? forma.currency} disabled={Boolean(yagona)} aria-label={t("fields.currency")} onChange={(event) => ozgar({ currency: event.target.value as Valyuta })} className={selectKlass}>
                    <option value="UZS">UZS</option>
                    <option value="USD">USD</option>
                  </AppSelect>
                </Maydon>
              </div>
            </Karta>
            <Karta ikonka={<FileText size={18} />} sarlavha={t("summarySection")}>
              <div className="rounded-[22px] bg-orange-50 px-5 py-6">
                <p className="text-xs font-black uppercase tracking-wide text-orange-600">{t("totalAmount")}</p>
                <p className="mt-1 text-3xl font-black tracking-tight text-slate-950">{pul(jami, forma.currency)}</p>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{t("totalHint", { nom: yetkazibBeruvchi?.name || "—" })}</p>
              </div>
              <ul className="mt-4 space-y-2 text-xs font-semibold leading-5 text-slate-500">
                <li className="flex gap-2"><Package size={14} className="mt-0.5 shrink-0 text-orange-500" />{t("hintStock")}</li>
                <li className="flex gap-2"><ScanLine size={14} className="mt-0.5 shrink-0 text-orange-500" />{t("hintPurchase")}</li>
                <li className="flex gap-2"><Undo2 size={14} className="mt-0.5 shrink-0 text-orange-500" />{t("hintCash")}</li>
              </ul>
            </Karta>
          </div>

          <Karta ikonka={<Package size={18} />} sarlavha={t("itemsSection")} amal={<button type="button" onClick={qatorQoshish} className="inline-flex h-10 items-center gap-2 rounded-2xl border border-dashed border-orange-300 bg-white px-4 text-sm font-black text-orange-600 hover:bg-orange-50"><Plus size={16} />{t("addLine")}</button>}>
            <MaydonXatosi matn={fx.xato("items")} />
            <UmumiyBirlikPaneli className="mb-4" variantlar={umumiyVariantlar} tanlangan={umumiyBirlik} onTanlash={umumiyBirlikniTanlash} xabar={birlikXabari} />
            <div className="space-y-3">
              {forma.qatorlar.map((qator, indeks) => {
                const mod = modMap.get(qator.modificationId);
                const mavjud = qator.modificationId && qator.warehouseId ? qoldiq(qator.modificationId, qator.warehouseId) : null;
                const kirimlar = mosKirimlar(store.kirimlar, forma.supplierId, qator.modificationId);
                const yol = (maydon: string) => `items.${indeks}.${maydon}`;
                const summa = (Number(qator.quantity.replace(",", ".")) || 0) * (Number(String(qator.price).replace(/\s/g, "").replace(",", ".")) || 0);
                return (
                  <article key={qator.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="flex h-8 min-w-8 items-center justify-center rounded-xl bg-orange-50 px-2 text-xs font-black text-orange-600">{indeks + 1}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-slate-800">{pul(summa, forma.currency)}</span>
                        <button type="button" onClick={() => qatorOchirish(indeks)} aria-label={t("removeLine", { n: indeks + 1 })} className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100"><Trash2 size={16} /></button>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,1.5fr)_minmax(0,1fr)]">
                      <Maydon nom={t("fields.product")} majburiy xato={fx.xato(yol("modificationId"))}>
                        <MahsulotTanlov value={qator.modificationId} variantlar={mahsulotVariantlari} onChange={(id) => mahsulotTanlash(indeks, id)} placeholder={t("fields.selectProduct")} className={input} tanlanganNomi={mod ? modificationNomi(mod) : tahrir?.items?.find((item) => item.modificationId === qator.modificationId)?.productName ?? undefined} ariaLabel={`${t("fields.product")} ${indeks + 1}`} />
                      </Maydon>
                      <Maydon nom={t("fields.warehouse")} majburiy xato={fx.xato(yol("warehouseId"))} izoh={mavjud !== null ? t("inStock", { soni: mavjud.toLocaleString("uz-UZ") }) : undefined}>
                        <AppSelect value={qator.warehouseId} aria-label={`${t("fields.warehouse")} ${indeks + 1}`} onChange={(event) => qatorniOzgartir(indeks, { warehouseId: event.target.value })} className={selectKlass}>
                          <option value="">{t("fields.selectWarehouse")}</option>
                          {omborlar.map((ombor) => <option key={ombor.id} value={ombor.id}>{ombor.name}</option>)}
                        </AppSelect>
                      </Maydon>
                      <Maydon nom={t("fields.quantity")} majburiy xato={fx.xato(yol("quantity"))}>
                        <input type="number" inputMode="decimal" min="0" step="any" value={qator.quantity} placeholder="0" aria-label={`${t("fields.quantity")} ${indeks + 1}`} onChange={(event) => qatorniOzgartir(indeks, { quantity: event.target.value })} className={input} />
                        <AsosiyEkvivalent birliklar={qatorBirliklari(qator)} birlikId={qator.birlikId} miqdor={Number(qator.quantity.replace(",", ".")) || 0} zaxiraKoeff={qator.koeff} />
                      </Maydon>
                      <Maydon nom={tb("hujjatBirligi.label")}>
                        <QatorBirligiTanlovi birliklar={qatorBirliklari(qator)} value={qator.birlikId} disabled={!qator.modificationId} ariaLabel={`${tb("hujjatBirligi.label")} ${indeks + 1}`} onChange={(birlikId) => birlikniOzgartirish(indeks, birlikId)} />
                      </Maydon>
                      <Maydon nom={t("fields.purchase")} xato={fx.xato(yol("purchaseId"))} izoh={!qator.modificationId || !forma.supplierId ? t("purchaseNeedsSupplier") : kirimlar.length === 0 ? t("noPurchases") : undefined}>
                        <AppSelect value={qator.purchaseId} disabled={!kirimlar.length && !qator.purchaseId} aria-label={`${t("fields.purchase")} ${indeks + 1}`} onChange={(event) => kirimTanlash(indeks, event.target.value)} className={selectKlass}>
                          <option value="">{t("fields.noPurchase")}</option>
                          {qator.purchaseId && !kirimlar.some((kirim) => kirim.id === qator.purchaseId) && <option value={qator.purchaseId}>{kirimMap.get(qator.purchaseId) ? hujjatRaqami(kirimMap.get(qator.purchaseId)!) : t("fields.savedPurchase")}</option>}
                          {kirimlar.map((kirim) => {
                            const narx = kirimNarxi(kirim, qator.modificationId);
                            return <option key={kirim.id} value={kirim.id}>{`${hujjatRaqami(kirim)} · ${sana(kirim.date ?? kirim.createdAt)}${narx !== undefined ? ` · ${pul(narx, valyutaKodi(kirim.currency))}` : ""}`}</option>;
                          })}
                        </AppSelect>
                      </Maydon>
                      <Maydon nom={t("fields.price")} majburiy={!qator.purchaseId} xato={fx.xato(yol("price"))} izoh={qator.purchaseId && qator.narxKirimdan ? t("priceFromPurchase") : undefined}>
                        <SummaMaydoni value={qator.price} kasr={3} aria-label={`${t("fields.price")} ${indeks + 1}`} onChange={(qiymat) => qatorniOzgartir(indeks, { price: qiymat, narxKirimdan: false })} className={input} />
                      </Maydon>
                    </div>
                    {qator.seriyali && (
                      <div className="mt-3 grid gap-3 rounded-2xl bg-sky-50/60 p-3 ring-1 ring-sky-100 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <Maydon nom={t("fields.roll")} majburiy xato={fx.xato(yol("batchId"))} izoh={qator.batchId ? t("rollFound") : t("rollHint")}>
                          <input value={qator.serial} placeholder="J-1031-01" aria-label={`${t("fields.roll")} ${indeks + 1}`} onChange={(event) => qatorniOzgartir(indeks, { serial: event.target.value, batchId: "" })} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void rulonTopish(indeks); } }} className={input} />
                        </Maydon>
                        <button type="button" disabled={rulonQidiruv === qator.id} onClick={() => void rulonTopish(indeks)} className="inline-flex h-12 items-center justify-center gap-2 self-start rounded-2xl bg-sky-600 px-5 text-sm font-black text-white disabled:opacity-50 sm:mt-7">
                          {rulonQidiruv === qator.id ? <LoaderCircle size={16} className="animate-spin" /> : <Disc3 size={16} />}{t("findRoll")}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </Karta>

          <Karta ikonka={<NotebookPen size={18} />} sarlavha={t("fields.note")}>
            <XatoliMaydon xato={fx.xato("note")}>
              <textarea value={forma.note} rows={2} aria-label={t("fields.note")} placeholder={t("notePlaceholder")} onChange={(event) => ozgar({ note: event.target.value })} className={`${input} h-auto py-3`} />
              {fx.xato("note") && <p role="alert" className="mt-1 text-xs font-bold text-red-600">{fx.xato("note")}</p>}
            </XatoliMaydon>
          </Karta>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-orange-100 bg-white px-5 py-4 sm:px-8">
          <p className="mr-auto hidden text-xs font-semibold text-slate-400 sm:block"><span aria-hidden className="text-red-500">*</span> {t("requiredHint")}</p>
          <button type="button" data-modal-yopish onClick={onClose} className="h-12 rounded-2xl bg-slate-100 px-6 text-sm font-black text-slate-600 hover:bg-slate-200">{t("cancel")}</button>
          <button type="button" disabled={band} onClick={() => void saqlash(false)} className="inline-flex h-12 items-center gap-2 rounded-2xl border border-orange-200 bg-white px-6 text-sm font-black text-orange-600 hover:bg-orange-50 disabled:opacity-50">{band && <LoaderCircle size={16} className="animate-spin" />}{t("saveDraft")}</button>
          <button type="button" disabled={band} onClick={() => void saqlash(true)} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-orange-500 px-6 text-sm font-black text-white shadow-lg shadow-orange-200 hover:bg-orange-600 disabled:opacity-50"><CheckCircle2 size={17} />{t("saveAndConfirm")}</button>
        </footer>
      </div>
    </AppModal>
  );
}

function Karta({ ikonka, sarlavha, amal, children }: { ikonka: ReactNode; sarlavha: string; amal?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-orange-100 pb-4">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-600"><span className="text-orange-500">{ikonka}</span>{sarlavha}</h3>
        {amal}
      </div>
      {children}
    </section>
  );
}

function Maydon({ nom, majburiy, xato, izoh, className = "", children }: { nom: string; majburiy?: boolean; xato?: string; izoh?: string; className?: string; children: ReactNode }) {
  return (
    <XatoliMaydon xato={xato} className={`grid content-start gap-1.5 ${className}`}>
      <span className={`text-xs font-bold ${xato ? "text-red-600" : "text-slate-500"}`}>{nom}{majburiy && <span aria-hidden className="ml-0.5 text-red-500">*</span>}</span>
      {children}
      {xato ? <span role="alert" className="text-xs font-bold leading-5 text-red-600">{xato}</span> : izoh && <span className="text-xs font-semibold leading-5 text-slate-400">{izoh}</span>}
    </XatoliMaydon>
  );
}
