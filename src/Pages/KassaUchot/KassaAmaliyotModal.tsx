import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Banknote,
  CalendarDays,
  Clock3,
  Landmark,
  Lock,
  MessageSquare,
  PackagePlus,
  Smartphone,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import AppModal from "@/Components/common/AppModal";
import Tanlov from "@/Pages/XaridorUchot/Tanlov";
import { foydalanuvchilarApi } from "@/api/accountsApi";
import { mijozlarApi, yetkazibBeruvchilarApi } from "@/api/partnersApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { useValyutaStore, valyutaKodi, type Valyuta } from "@/lib/valyuta";
import KassaAmaliyotKorinishi from "./KassaAmaliyotKorinishi";
import type { KassaAmaliyoti, KassaAmaliyotTuri, KassaKanali } from "./types";
import {
  hozir,
  izohMajburiy,
  kassaSummasi,
  keyingiRaqam,
  maydonKlass,
  partiyaTuri,
  turYonalishi,
  valyutaTanlanadiganTur,
  yangiId,
} from "./yordamchilar";

const kanalIkonlari: Record<KassaKanali, typeof Banknote> = {
  naqd: Banknote,
  bank: Landmark,
  ilova: Smartphone,
};

// Qo'lda yaratiladigan turlar (donalik_savdo savdodan avtomat keladi).
const tushumTurlari: KassaAmaliyotTuri[] = [
  "xaridor_tolovi",
  "hisobdor_qaytardi",
  "taminotchi_qaytardi",
  "boshqa_kirim",
];
const chiqimTurlari: KassaAmaliyotTuri[] = [
  "taminot_tolovi",
  "xaridorga_qaytarish",
  "ish_haqi",
  "boshqa_chiqim",
];

type Props = {
  boshlangich: KassaAmaliyoti | null;
  boshlangichKanal: KassaKanali;
  boshlangichTuri: KassaAmaliyotTuri;
  onYopish: () => void;
  onSaqlash: (amaliyot: KassaAmaliyoti) => void;
};

// balans — mijoz hisobi (oldindan to'langan pul) va uning valyutasi (valyuta rejimida dollar).
type XaridorTanlov = { id: string; nomi: string; telefon: string; balans: number; balansValyutasi: Valyuta };
type OddiyTanlov = { id: string; nomi: string };

// Kassa amaliyotini yaratish (o'zimizning "Yangi kirim" uslubida).
// Mijozdan to'lov turi tanlansa — mijoz tanlanadi va qarzi (balans) kamayadi.
export default function KassaAmaliyotModal({
  boshlangich,
  boshlangichKanal,
  boshlangichTuri,
  onYopish,
  onSaqlash,
}: Props) {
  const { t } = useTranslation(["kassa_uchot", "common"]);
  const kanallar: { kalit: KassaKanali; nom: string; icon: typeof Banknote }[] = (
    ["naqd", "bank", "ilova"] as KassaKanali[]
  ).map((kalit) => ({ kalit, nom: t(`channels.${kalit}`), icon: kanalIkonlari[kalit] }));

  const [xaridorlar, setXaridorlar] = useState<XaridorTanlov[]>([]);
  const [xodimlar, setXodimlar] = useState<OddiyTanlov[]>([]);
  const [yetkazibBeruvchilar, setYetkazibBeruvchilar] = useState<OddiyTanlov[]>([]);

  const [turi, setTuri] = useState<KassaAmaliyotTuri>(boshlangich?.turi ?? boshlangichTuri);
  const [kanal, setKanal] = useState<KassaKanali>(boshlangich?.kanal ?? boshlangichKanal);
  const [nomi, setNomi] = useState(boshlangich?.nomi ?? "");
  // partiya id — xaridorId (mijoz) yoki kontragent nomi (xodim/yetkazib)
  const [xaridorId, setXaridorId] = useState(boshlangich?.xaridorId ?? "");
  const [supplierId, setSupplierId] = useState(boshlangich?.supplierId ?? "");
  const [employeeId, setEmployeeId] = useState(boshlangich?.employeeId ?? "");
  const [responsibleId, setResponsibleId] = useState(boshlangich?.responsibleId ?? "");
  const [kontragent, setKontragent] = useState(boshlangich?.kontragent ?? "");
  const [summa, setSumma] = useState(boshlangich ? String(boshlangich.summa) : "");
  const [masul, setMasul] = useState(boshlangich?.masul ?? "");
  const [sana, setSana] = useState(boshlangich?.sana.slice(0, 10) ?? hozir().slice(0, 10));
  const [izoh, setIzoh] = useState(boshlangich?.izoh ?? "");
  const [xato, setXato] = useState("");
  // Valyuta (so'm/dollar) va kurs: faqat valyuta rejimi yoqilgan va bugungi kurs kiritilgan bo'lsa; kurs yozilmasa backend kunlik kursni oladi.
  const rejimYoniq = useValyutaStore((holat) => holat.rejimYoniq);
  const kursBor = useValyutaStore((holat) => holat.kursBor);
  const kunlikKurs = useValyutaStore((holat) => holat.kurs);
  const [valyuta, setValyuta] = useState<Valyuta>(boshlangich?.valyuta ?? "UZS");
  const [kursMatni, setKursMatni] = useState(boshlangich?.kurs ? String(boshlangich.kurs) : "");
  // Yetkazib beruvchiga to'lovda qaysi valyutadagi qarz yopilishi (`settleCurrency`); tanlanmasa to'lov valyutasi bilan bir xil.
  // Mijozda hisob valyutasini backend o'zi qo'yadi.
  const [qarzVal, setQarzVal] = useState<Valyuta | null>(boshlangich?.hisobValyutasi ?? null);

  // Mas'ul shaxs — tizimga kirgan foydalanuvchi; o'zgartirib bo'lmaydi.
  const joriyProfil = useAuthProfileStore((state) => state.profil);
  const profilniYuklash = useAuthProfileStore((state) => state.profilniYuklash);
  useEffect(() => {
    if (!joriyProfil) void profilniYuklash();
  }, [joriyProfil, profilniYuklash]);
  const joriyMasulNomi = joriyProfil?.fullName?.trim() || joriyProfil?.username || "";
  useEffect(() => {
    if (boshlangich || !joriyProfil) return;
    setResponsibleId(joriyProfil.id);
    setMasul(joriyMasulNomi);
  }, [boshlangich, joriyProfil, joriyMasulNomi]);
  const masulKorinishi = boshlangich ? masul || joriyMasulNomi : joriyMasulNomi;

  useEffect(() => {
    let active = true;
    Promise.all([mijozlarApi.royxat(), foydalanuvchilarApi.royxat(), yetkazibBeruvchilarApi.royxat()])
      .then(([customers, users, suppliers]) => {
        if (!active) return;
        setXaridorlar(customers.map((item) => ({
          id: item.id,
          nomi: [item.firstName, item.lastName].filter(Boolean).join(" ") || item.phone || item.id,
          telefon: item.phone ?? "",
          balans: Number(item.balance ?? 0),
          balansValyutasi: valyutaKodi(item.balanceCurrency),
        })));
        setXodimlar(users.map((item) => ({ id: item.id, nomi: item.fullName || item.username })));
        setYetkazibBeruvchilar(suppliers.map((item) => ({ id: item.id, nomi: item.name })));
      })
      .catch((error) => setXato(getApiErrorMessage(error)));
    return () => { active = false; };
  }, []);

  // Mavjud hujjat: seed'lar tasdiqlangan; yangi hujjat — qoralama.
  const mavjudHolat = boshlangich?.holat ?? "qoralama";
  // Yangi hujjat darrov tahrirlanadi; mavjudi avval ko'rish rejimida ochiladi.
  const [tahrirRejim, setTahrirRejim] = useState(boshlangich === null);
  const readonly =
    Boolean(boshlangich?.readonly) ||
    mavjudHolat === "tasdiqlangan" ||
    mavjudHolat === "bekor_qilingan" ||
    !tahrirRejim;

  // Mavjud amaliyotni ko'rish: modal tarkibiga qarab o'lchamlanadi (pastda bo'sh joy qolmaydi).
  // Yaratish va tahrirlash formasi avvalgidek butun balandlikda.
  const korishRejimi = Boolean(boshlangich) && readonly;

  const yonalish = turYonalishi[turi];
  const tushum = yonalish === "tushum";
  const partiya = partiyaTuri(turi);
  const bugungi = hozir().slice(0, 10);

  const tanlanganXaridor = useMemo(
    () => xaridorlar.find((x) => x.id === xaridorId) ?? null,
    [xaridorlar, xaridorId]
  );
  const summaSoni = Number(summa) || 0;
  const valyutaTanlovi = rejimYoniq && kursBor && valyutaTanlanadiganTur(turi);
  const tanlanganValyuta: Valyuta = valyutaTanlovi ? valyuta : "UZS";
  // Hisob valyutasi: mijozda — uning hisobi valyutasi (faqat ko'rsatish uchun); yetkazib beruvchida — kassir tanlagan qarz valyutasi.
  const hisobVal: Valyuta | null =
    partiya === "xaridor"
      ? tanlanganXaridor
        ? tanlanganXaridor.balansValyutasi
        : null
      : partiya === "yetkazib"
        ? (qarzVal ?? tanlanganValyuta)
        : null;
  const kursKerak = valyutaTanlovi && hisobVal !== null && tanlanganValyuta !== hisobVal;
  const kiritilganKurs = Number(kursMatni.replace(",", ".")) || 0;
  const amalKurs = kiritilganKurs > 0 ? kiritilganKurs : kunlikKurs;
  // Summaning hisob valyutasidagi taxminiy qiymati (aniq qiymatni backend tasdiqlaganda hisoblaydi).
  const hisoblanganSumma =
    hisobVal === null
      ? null
      : !kursKerak
        ? summaSoni
        : amalKurs > 0
          ? tanlanganValyuta === "UZS"
            ? summaSoni / amalKurs
            : summaSoni * amalKurs
          : null;
  // To'lov hisobni to'ldiradi (+), qaytarish kamaytiradi (−).
  const balansDelta =
    hisoblanganSumma === null ? 0 : turi === "xaridor_tolovi" ? hisoblanganSumma : turi === "xaridorga_qaytarish" ? -hisoblanganSumma : 0;

  function turniOzgartir(yangiTuri: KassaAmaliyotTuri) {
    setTuri(yangiTuri);
    // Tur o'zgarsa partiya tozalanadi (chalkashmasligi uchun).
    setXaridorId("");
    setSupplierId("");
    setEmployeeId("");
    setKontragent("");
    setValyuta("UZS");
    setKursMatni("");
    setQarzVal(null);
  }

  function yubor(tasdiqla: boolean) {
    if (partiya === "xaridor" && !xaridorId) {
      setXato(t("modal.errors.selectCustomer"));
      return;
    }
    if ((partiya === "xodim" && !employeeId) || (partiya === "yetkazib" && !supplierId)) {
      setXato(partiya === "xodim" ? t("modal.errors.selectEmployee") : t("modal.errors.selectSupplier"));
      return;
    }
    if (!summa.trim() || Number.isNaN(Number(summa)) || Number(summa) <= 0) {
      setXato(t("modal.errors.invalidAmount"));
      return;
    }
    if (izohMajburiy(turi) && !izoh.trim()) {
      setXato(t("modal.errors.commentRequired"));
      return;
    }
    if (kursKerak && kursMatni.trim() && !(kiritilganKurs > 0)) {
      setXato(t("modal.errors.invalidRate"));
      return;
    }

    const yakuniyKontragent = partiya === "xaridor" && tanlanganXaridor
      ? tanlanganXaridor.nomi
      : partiya === "xodim"
        ? xodimlar.find((item) => item.id === employeeId)?.nomi ?? kontragent.trim()
        : partiya === "yetkazib"
          ? yetkazibBeruvchilar.find((item) => item.id === supplierId)?.nomi ?? kontragent.trim()
          : kontragent.trim();

    onSaqlash({
      id: boshlangich?.id ?? yangiId("ks"),
      kanal,
      yonalish,
      turi,
      holat: tasdiqla ? "tasdiqlangan" : "qoralama",
      xaridorId: partiya === "xaridor" ? xaridorId : undefined,
      supplierId: partiya === "yetkazib" ? supplierId : undefined,
      employeeId: partiya === "xodim" ? employeeId : undefined,
      responsibleId: responsibleId || undefined,
      raqam: boshlangich?.raqam ?? keyingiRaqam([]),
      nomi: nomi.trim() || t(`types.${turi}`),
      kontragent: yakuniyKontragent,
      summa: Number(summa),
      valyuta: valyutaTanlovi ? tanlanganValyuta : undefined,
      // `settleCurrency` faqat yetkazib beruvchiga to'lovda yuboriladi; mijoz hisobida backend uni o'zi qo'yadi.
      hisobValyutasi: valyutaTanlovi && partiya === "yetkazib" && hisobVal ? hisobVal : undefined,
      kurs: valyutaTanlovi && kursKerak && kiritilganKurs > 0 ? kiritilganKurs : undefined,
      sana: new Date(`${sana}T${new Date().toISOString().slice(11, 16)}`).toISOString(),
      masul: masul.trim(),
      izoh: izoh.trim(),
      backendSource: boshlangich?.backendSource,
      backendRefId: boshlangich?.backendRefId,
      saleId: boshlangich?.saleId,
      purchaseId: boshlangich?.purchaseId,
      readonly: boshlangich?.readonly,
    });
  }

  return (
    <AppModal className={`${korishRejimi ? "!items-center" : "!items-stretch"} !p-3 sm:!p-5 sm:!pl-[88px]`}>
      <div className={`relative flex min-h-0 w-full ${korishRejimi ? "max-h-full max-w-[1120px]" : ""}`}>
        {/* Modaldan chiqib turadigan yopish (X) — chap chetда */}
        <button
          type="button"
          onClick={onYopish}
          aria-label={t("common:actions.close")}
          className="absolute -left-[58px] top-3 z-50 flex h-12 w-12 items-center justify-center rounded-[15px] bg-[#2563EB] text-white shadow-[0_10px_24px_rgba(15,23,42,.18)] ring-1 ring-white/70 transition hover:-translate-x-0.5 hover:bg-[#1D4ED8]"
        >
          <X size={21} strokeWidth={2.3} />
        </button>

        <form
          onSubmit={(event) => event.preventDefault()}
          className={`flex min-h-0 w-full flex-col overflow-hidden rounded-[32px] border border-orange-100 bg-[#F8FAFC] shadow-[0_28px_90px_rgba(15,23,42,.32)] ${korishRejimi ? "max-h-full" : ""}`}
        >
        <header className="flex shrink-0 items-center justify-between border-b border-orange-100 bg-white/75 px-5 py-4 sm:px-8">
          {/* Chapda: sarlavha (X modaldan tashqarida) */}
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              {boshlangich ? t("modal.titleExisting") : tushum ? t("modal.titleNewIncome") : t("modal.titleNewExpense")}
            </h2>
            {!boshlangich ? (
              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-500">
                {t("modal.badgeNew")}
              </span>
            ) : (
              <span
                className={`rounded-full px-3 py-1 text-xs font-black ${
                  mavjudHolat === "qoralama"
                    ? "bg-amber-50 text-amber-600"
                    : mavjudHolat === "bekor_qilingan"
                      ? "bg-red-50 text-red-600"
                      : "bg-emerald-50 text-emerald-600"
                }`}
              >
                {mavjudHolat === "qoralama"
                  ? t("modal.badgeDraft")
                  : mavjudHolat === "bekor_qilingan"
                    ? t("modal.badgeCancelled")
                    : t("modal.badgeConfirmed")}
              </span>
            )}
          </div>

          {/* O'ngda (tepada) — faqat ko'rish rejimida.
              Qoralama → Tahrirlash; Tasdiqlangan → "Bekor qilish" (tasdiqlashni bekor
              qilib, o'sha oynada tahrirlashga o'tadi). Yopish faqat chapdagi X. */}
          {!boshlangich?.readonly && !tahrirRejim && mavjudHolat === "qoralama" &&
            (
              <button
                type="button"
                onClick={() => setTahrirRejim(true)}
                className="h-12 rounded-2xl bg-[#2563EB] px-6 text-sm font-black text-white shadow-lg shadow-orange-100 hover:bg-orange-600"
              >
                {t("common:actions.edit")}
              </button>
            )}
        </header>

        <div className="scrollbar-orange min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8">
          {xato && (
            <div className="mb-4 flex justify-between gap-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
              <span>{xato}</span>
              <button type="button" onClick={() => setXato("")}>
                {t("common:actions.close")}
              </button>
            </div>
          )}

          {boshlangich && korishRejimi ? (
            // Mavjud amaliyotni ko'rish: o'chirilgan forma o'rniga alohida ko'rinish (yaratish/tahrirlash formasi o'zgarmagan).
            <KassaAmaliyotKorinishi amaliyot={boshlangich} />
          ) : (
          <fieldset disabled={readonly} className="m-0 grid gap-5 border-0 p-0 xl:grid-cols-2">
            {/* --- Chap: pul tushumi haqida --- */}
            <section className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm">
              <SectionTitle
                icon={<PackagePlus size={18} />}
                text={tushum ? t("modal.incomeSectionTitle") : t("modal.expenseSectionTitle")}
              />
              <div className="grid gap-4">
                {/* 1. Nomi */}
                <Maydon label={tushum ? t("modal.incomeNameLabel") : t("modal.expenseNameLabel")}>
                  <input
                    value={nomi}
                    onChange={(event) => setNomi(event.target.value)}
                    placeholder={t(`types.${turi}`)}
                    className={maydonKlass}
                  />
                </Maydon>

                {/* 2. Tur */}
                <Maydon label={tushum ? t("modal.incomeTypeLabel") : t("modal.expenseTypeLabel")}>
                  <Tanlov
                    qiymat={turi}
                    onChange={(v) => turniOzgartir(v as KassaAmaliyotTuri)}
                    variantlar={(tushum ? tushumTurlari : chiqimTurlari).map((turKodi) => ({
                      value: turKodi,
                      label: t(`types.${turKodi}`),
                    }))}
                  />
                </Maydon>

                {/* 3. Partiya — turga qarab: mijoz / xodim / yetkazib */}
                {partiya === "xaridor" && (
                  <Maydon label={t("modal.customerLabel")}>
                    <Tanlov
                      qiymat={xaridorId}
                      onChange={setXaridorId}
                      placeholder={t("modal.customerPlaceholder")}
                      qidiruv
                      variantlar={xaridorlar.map((x) => ({
                        value: x.id,
                        label: `${x.nomi}${x.telefon ? ` — ${x.telefon}` : ""}`,
                      }))}
                    />
                    {tanlanganXaridor && (
                      <div className="mt-2 flex items-center justify-between rounded-xl bg-orange-50 px-3.5 py-2.5 text-sm">
                        <span className="font-bold text-slate-500">{t("modal.currentDebtLabel")}</span>
                        <span
                          className={`font-black ${
                            tanlanganXaridor.balans < 0 ? "text-red-500" : "text-emerald-600"
                          }`}
                        >
                          {kassaSummasi(tanlanganXaridor.balans, tanlanganXaridor.balansValyutasi)}
                          {summaSoni > 0 && hisoblanganSumma !== null && (
                            <span className="ml-2 text-xs text-slate-500">
                              → {kassaSummasi(tanlanganXaridor.balans + balansDelta, tanlanganXaridor.balansValyutasi)}
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </Maydon>
                )}

                {partiya === "xodim" && (
                  <Maydon label={t("modal.employeeLabel")}>
                    <Tanlov
                      qiymat={employeeId}
                      onChange={setEmployeeId}
                      placeholder={t("modal.employeePlaceholder")}
                      qidiruv
                      variantlar={xodimlar.map((x) => ({
                        value: x.id,
                        label: x.nomi,
                      }))}
                    />
                  </Maydon>
                )}

                {partiya === "yetkazib" && (
                  <Maydon label={t("modal.supplierLabel")}>
                    <Tanlov
                      qiymat={supplierId}
                      onChange={setSupplierId}
                      placeholder={t("modal.supplierPlaceholder")}
                      qidiruv
                      variantlar={yetkazibBeruvchilar.map((b) => ({
                        value: b.id,
                        label: b.nomi,
                      }))}
                    />
                  </Maydon>
                )}

                {partiya === null && (
                  <Maydon label={t("modal.counterpartyLabel")}>
                    <input
                      value={kontragent}
                      onChange={(event) => setKontragent(event.target.value)}
                      placeholder={t("modal.counterpartyPlaceholder")}
                      className={maydonKlass}
                    />
                  </Maydon>
                )}

                {/* Valyuta: mijoz hisobi va yetkazib beruvchi to'lovlarida so'm yoki dollar */}
                {valyutaTanlovi && (
                  <div className="space-y-2 text-sm font-bold text-slate-500">
                    <span>{t("modal.currencyLabel")}</span>
                    <div className="inline-flex rounded-xl bg-slate-100 p-1">
                      {(["UZS", "USD"] as const).map((kod) => (
                        <button
                          key={kod}
                          type="button"
                          onClick={() => {
                            if (kod === valyuta) return;
                            setValyuta(kod);
                            setSumma("");
                            setKursMatni("");
                          }}
                          className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                            valyuta === kod ? "bg-white text-[#2563EB] shadow-sm" : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          {kod === "USD" ? t("modal.currencyUsd") : t("modal.currencyUzs")}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Yetkazib beruvchi: qaysi valyutadagi qarz yopiladi (masalan, so'mda to'lab dollar qarzni yopish) */}
                {valyutaTanlovi && partiya === "yetkazib" && (
                  <div className="space-y-2 text-sm font-bold text-slate-500">
                    <span>{t("modal.settleLabel")}</span>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="inline-flex rounded-xl bg-slate-100 p-1">
                        {(["UZS", "USD"] as const).map((kod) => (
                          <button
                            key={kod}
                            type="button"
                            onClick={() => setQarzVal(kod)}
                            className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                              hisobVal === kod ? "bg-white text-[#2563EB] shadow-sm" : "text-slate-500 hover:text-slate-700"
                            }`}
                          >
                            {kod === "USD" ? t("modal.currencyUsd") : t("modal.currencyUzs")}
                          </button>
                        ))}
                      </div>
                      <span className="text-xs font-semibold text-slate-400">{t("modal.settleHint")}</span>
                    </div>
                  </div>
                )}

                {/* Summa */}
                <Maydon label={valyutaTanlovi ? t("modal.amountLabelCurrency", { valyuta: tanlanganValyuta === "USD" ? "$" : t("modal.currencyUzs") }) : t("modal.amountLabel")}>
                  <input
                    type="text"
                    inputMode={tanlanganValyuta === "USD" ? "decimal" : "numeric"}
                    value={tanlanganValyuta === "USD" ? summa : summa ? Number(summa).toLocaleString("ru-RU") : ""}
                    onChange={(event) =>
                      setSumma(
                        tanlanganValyuta === "USD"
                          ? event.target.value.replace(/,/g, ".").replace(/[^\d.]/g, "").replace(/^(\d*\.\d{0,2}).*$/, "$1").replace(/\.(?=.*\.)/g, "")
                          : event.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "")
                      )
                    }
                    placeholder={tanlanganValyuta === "USD" ? "100" : "450 000"}
                    className={maydonKlass}
                  />
                </Maydon>

                {/* Kurs: so'mda berilgan pul dollar hisobiga (yoki aksincha) o'tganda; yozilmasa kunlik kurs */}
                {kursKerak && (
                  <Maydon label={t("modal.rateLabel")}>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={kursMatni}
                      onChange={(event) => setKursMatni(event.target.value.replace(/[^\d.,]/g, ""))}
                      placeholder={kunlikKurs > 0 ? t("modal.ratePlaceholder", { kurs: kunlikKurs.toLocaleString("uz-UZ") }) : ""}
                      className={maydonKlass}
                    />
                    <span className="block text-xs font-semibold text-slate-400">{t("modal.rateHint")}</span>
                    {summaSoni > 0 && hisoblanganSumma !== null && hisobVal && (
                      <span className="block text-xs font-bold text-sky-700">
                        {t("modal.settledPreview", { summa: kassaSummasi(hisoblanganSumma, hisobVal) })}
                      </span>
                    )}
                  </Maydon>
                )}

                {/* To'lov turi / hisob */}
                <Maydon label={t("modal.paymentTypeLabel")}>
                  <div className="grid grid-cols-3 gap-2">
                    {kanallar.map(({ kalit, nom, icon: Ikonka }) => (
                      <button
                        key={kalit}
                        type="button"
                        onClick={() => setKanal(kalit)}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-sm font-bold transition ${
                          kanal === kalit
                            ? "bg-orange-500 text-white"
                            : "bg-white text-slate-500 ring-1 ring-slate-200 hover:text-orange-600"
                        }`}
                      >
                        <Ikonka size={15} />
                        {nom}
                      </button>
                    ))}
                  </div>
                </Maydon>

                {/* Mas'ul shaxs */}
                <Maydon label={t("modal.responsibleLabel")}>
                  <div className={`${maydonKlass} flex items-center justify-between !bg-slate-50 text-slate-700`}>
                    <span className="truncate">{masulKorinishi || t("modal.responsiblePlaceholder")}</span>
                    <Lock size={15} className="shrink-0 text-slate-400" />
                  </div>
                </Maydon>

                {/* Sana */}
                <Maydon label={tushum ? t("modal.incomeDateLabel") : t("modal.expenseDateLabel")}>
                  <div className="relative">
                    <input
                      type="date"
                      value={sana}
                      onChange={(event) => setSana(event.target.value)}
                      className={`${maydonKlass} pr-11`}
                    />
                    <CalendarDays
                      size={18}
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                  </div>
                </Maydon>
              </div>
            </section>

            {/* --- O'ng: kommentariya + tarix --- */}
            <div className="space-y-5">
              <section className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm">
                <SectionTitle
                  icon={<MessageSquare size={18} />}
                  text={izohMajburiy(turi) ? t("modal.commentTitleRequired") : t("modal.commentTitle")}
                />
                <textarea
                  value={izoh}
                  onChange={(event) => setIzoh(event.target.value)}
                  rows={4}
                  placeholder={
                    izohMajburiy(turi) ? t("modal.commentPlaceholderRequired") : t("modal.commentPlaceholder")
                  }
                  className="w-full resize-none rounded-2xl border border-slate-200 p-4 text-sm font-medium outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </section>
              <section className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm">
                <SectionTitle icon={<Clock3 size={18} />} text={t("modal.historyTitle")} />
                <div className="flex items-start gap-3 text-sm">
                  <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-orange-500" />
                  <div>
                    <p className="font-bold text-slate-700">{t("modal.historyDraftCreated")}</p>
                    <p className="text-xs font-semibold text-slate-400">{bugungi}</p>
                  </div>
                </div>
              </section>
            </div>
          </fieldset>
          )}
        </div>

        {tahrirRejim && (
          <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-orange-100 bg-white/75 px-5 py-4 sm:flex-row sm:justify-end sm:px-8">
            <button
              type="button"
              onClick={() => yubor(false)}
              className="h-12 rounded-2xl border border-orange-300 bg-white px-7 text-sm font-black text-orange-600 hover:bg-orange-50"
            >
              {t("common:actions.save")}
            </button>
            <button
              type="button"
              onClick={() => yubor(true)}
              className="h-12 rounded-2xl bg-orange-500 px-7 text-sm font-black text-white shadow-lg shadow-orange-100 hover:bg-orange-600"
            >
              {t("modal.saveAndConfirm")}
            </button>
          </footer>
        )}
        </form>
      </div>
    </AppModal>
  );
}

function SectionTitle({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="mb-4 flex items-center gap-2 border-b border-orange-100 pb-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-[#2563EB]">
        {icon}
      </span>
      <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">{text}</h3>
    </div>
  );
}

function Maydon({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-2 text-sm font-bold text-slate-500">
      <span>{label}</span>
      {children}
    </label>
  );
}
