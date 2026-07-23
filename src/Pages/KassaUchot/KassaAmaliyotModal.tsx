import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Banknote,
  CalendarDays,
  Clock3,
  Landmark,
  MessageSquare,
  PackagePlus,
  Smartphone,
  X,
} from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import Tanlov from "@/Pages/XaridorUchot/Tanlov";
import { foydalanuvchilarApi } from "@/api/accountsApi";
import { mijozlarApi, yetkazibBeruvchilarApi } from "@/api/partnersApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { KassaAmaliyoti, KassaAmaliyotTuri, KassaKanali } from "./types";
import {
  hozir,
  izohMajburiy,
  keyingiRaqam,
  maydonKlass,
  partiyaTuri,
  summaFormat,
  turYonalishi,
  yangiId,
} from "./yordamchilar";

const kanallar: { kalit: KassaKanali; nom: string; icon: typeof Banknote }[] = [
  { kalit: "naqd", nom: "Naqd", icon: Banknote },
  { kalit: "bank", nom: "Bank", icon: Landmark },
  { kalit: "ilova", nom: "Ilova", icon: Smartphone },
];

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

const turNomi: Record<KassaAmaliyotTuri, string> = {
  xaridor_tolovi: "Mijozdan to'lov",
  hisobdor_qaytardi: "Hisobdor shaxs mablag'ini qaytarish",
  taminotchi_qaytardi: "Yetkazib beruvchi mablag'ini qaytarishi",
  boshqa_kirim: "Boshqa pul mablag'lari tushumi",
  donalik_savdo: "Donalik savdo",
  taminot_tolovi: "Yetkazib beruvchiga to'lov",
  xaridorga_qaytarish: "Xaridorga pul mablag'larini qaytarish",
  ish_haqi: "Ish haqini to'lash",
  boshqa_chiqim: "Boshqa pul xarajatlari",
  xarajat: "Xarajat",
};

type Props = {
  boshlangich: KassaAmaliyoti | null;
  boshlangichKanal: KassaKanali;
  boshlangichTuri: KassaAmaliyotTuri;
  onYopish: () => void;
  onSaqlash: (amaliyot: KassaAmaliyoti) => void;
};

type XaridorTanlov = { id: string; nomi: string; telefon: string; balans: number };
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
        })));
        setXodimlar(users.map((item) => ({ id: item.id, nomi: item.fullName || item.username })));
        setYetkazibBeruvchilar(suppliers.map((item) => ({ id: item.id, nomi: item.name })));
      })
      .catch((error) => setXato(getApiErrorMessage(error)));
    return () => { active = false; };
  }, []);

  // Mavjud hujjat: seed'lar tasdiqlangan; yangi hujjat — qoralama.
  const mavjudHolat = boshlangich?.holat ?? "tasdiqlangan";
  // Yangi hujjat darrov tahrirlanadi; mavjudi avval ko'rish rejimida ochiladi.
  const [tahrirRejim, setTahrirRejim] = useState(boshlangich === null);
  const readonly =
    Boolean(boshlangich?.readonly) ||
    mavjudHolat === "tasdiqlangan" ||
    mavjudHolat === "bekor_qilingan" ||
    !tahrirRejim;

  const yonalish = turYonalishi[turi];
  const tushum = yonalish === "tushum";
  const partiya = partiyaTuri(turi);
  const bugungi = hozir().slice(0, 10);

  const tanlanganXaridor = useMemo(
    () => xaridorlar.find((x) => x.id === xaridorId) ?? null,
    [xaridorlar, xaridorId]
  );
  const summaSoni = Number(summa) || 0;
  // To'lov qarzni kamaytiradi (+), qaytarish oshiradi (−).
  const balansDelta =
    turi === "xaridor_tolovi" ? summaSoni : turi === "xaridorga_qaytarish" ? -summaSoni : 0;

  function turniOzgartir(yangiTuri: KassaAmaliyotTuri) {
    setTuri(yangiTuri);
    // Tur o'zgarsa partiya tozalanadi (chalkashmasligi uchun).
    setXaridorId("");
    setSupplierId("");
    setEmployeeId("");
    setKontragent("");
  }

  function yubor(tasdiqla: boolean) {
    if (partiya === "xaridor" && !xaridorId) {
      setXato("Mijozdan to'lov uchun mijoz tanlanishi shart.");
      return;
    }
    if ((partiya === "xodim" && !employeeId) || (partiya === "yetkazib" && !supplierId)) {
      setXato(partiya === "xodim" ? "Xodim tanlanishi shart." : "Yetkazib beruvchi tanlanishi shart.");
      return;
    }
    if (!summa.trim() || Number.isNaN(Number(summa)) || Number(summa) <= 0) {
      setXato("Summa 0 dan katta son bo'lishi kerak.");
      return;
    }
    if (izohMajburiy(turi) && !izoh.trim()) {
      setXato("Boshqa pul xarajatlari uchun kommentariya (nega chiqim) to'ldirilishi shart.");
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
      nomi: nomi.trim() || turNomi[turi],
      kontragent: yakuniyKontragent,
      summa: Number(summa),
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
    <AppModal className="!items-stretch !p-3 !pl-[74px] sm:!p-5 sm:!pl-[88px]">
      <div className="relative flex min-h-0 w-full">
        {/* Modaldan chiqib turadigan yopish (X) — chap chetда */}
        <button
          type="button"
          onClick={onYopish}
          aria-label="Yopish"
          className="absolute -left-[58px] top-3 z-50 flex h-12 w-12 items-center justify-center rounded-[15px] bg-[#FF6A00] text-white shadow-[0_10px_24px_rgba(15,23,42,.18)] ring-1 ring-white/70 transition hover:-translate-x-0.5 hover:bg-[#EA580C]"
        >
          <X size={21} strokeWidth={2.3} />
        </button>

        <form
          onSubmit={(event) => event.preventDefault()}
          className="flex min-h-0 w-full flex-col overflow-hidden rounded-[32px] border border-orange-100 bg-[#fffaf4] shadow-[0_28px_90px_rgba(69,35,13,.32)]"
        >
        <header className="flex shrink-0 items-center justify-between border-b border-orange-100 bg-white/75 px-5 py-4 sm:px-8">
          {/* Chapda: sarlavha (X modaldan tashqarida) */}
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              {boshlangich ? "Amaliyot" : tushum ? "Yangi tushum" : "Yangi chiqim"}
            </h2>
            {!boshlangich ? (
              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-500">
                YANGI
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
                  ? "QORALAMA"
                  : mavjudHolat === "bekor_qilingan"
                    ? "BEKOR QILINGAN"
                    : "TASDIQLANGAN"}
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
                className="h-12 rounded-2xl bg-[#FF6A00] px-6 text-sm font-black text-white shadow-lg shadow-orange-100 hover:bg-orange-600"
              >
                Tahrirlash
              </button>
            )}
        </header>

        <div className="scrollbar-orange min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8">
          {xato && (
            <div className="mb-4 flex justify-between gap-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
              <span>{xato}</span>
              <button type="button" onClick={() => setXato("")}>
                Yopish
              </button>
            </div>
          )}

          <fieldset disabled={readonly} className="m-0 grid gap-5 border-0 p-0 xl:grid-cols-2">
            {/* --- Chap: pul tushumi haqida --- */}
            <section className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm">
              <SectionTitle
                icon={<PackagePlus size={18} />}
                text={tushum ? "Pul tushumi haqida" : "Pul chiqimi haqida"}
              />
              <div className="grid gap-4">
                {/* 1. Nomi */}
                <Maydon label={tushum ? "Pul tushumni nomi" : "Chiqim nomi"}>
                  <input
                    value={nomi}
                    onChange={(event) => setNomi(event.target.value)}
                    placeholder={turNomi[turi]}
                    className={maydonKlass}
                  />
                </Maydon>

                {/* 2. Tur */}
                <Maydon label={tushum ? "Tushum turi *" : "Chiqim turi *"}>
                  <Tanlov
                    qiymat={turi}
                    onChange={(v) => turniOzgartir(v as KassaAmaliyotTuri)}
                    variantlar={(tushum ? tushumTurlari : chiqimTurlari).map((t) => ({
                      value: t,
                      label: turNomi[t],
                    }))}
                  />
                </Maydon>

                {/* 3. Partiya — turga qarab: mijoz / xodim / yetkazib */}
                {partiya === "xaridor" && (
                  <Maydon label="Mijoz *">
                    <Tanlov
                      qiymat={xaridorId}
                      onChange={setXaridorId}
                      placeholder="Mijozni tanlang"
                      qidiruv
                      variantlar={xaridorlar.map((x) => ({
                        value: x.id,
                        label: `${x.nomi}${x.telefon ? ` — ${x.telefon}` : ""}`,
                      }))}
                    />
                    {tanlanganXaridor && (
                      <div className="mt-2 flex items-center justify-between rounded-xl bg-orange-50 px-3.5 py-2.5 text-sm">
                        <span className="font-bold text-slate-500">Joriy qarzi</span>
                        <span
                          className={`font-black ${
                            tanlanganXaridor.balans < 0 ? "text-red-500" : "text-emerald-600"
                          }`}
                        >
                          {summaFormat(tanlanganXaridor.balans)}
                          {summaSoni > 0 && (
                            <span className="ml-2 text-xs text-slate-500">
                              → {summaFormat(tanlanganXaridor.balans + balansDelta)}
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </Maydon>
                )}

                {partiya === "xodim" && (
                  <Maydon label="Xodim *">
                    <Tanlov
                      qiymat={employeeId}
                      onChange={setEmployeeId}
                      placeholder="Xodimni tanlang"
                      qidiruv
                      variantlar={xodimlar.map((x) => ({
                        value: x.id,
                        label: x.nomi,
                      }))}
                    />
                  </Maydon>
                )}

                {partiya === "yetkazib" && (
                  <Maydon label="Yetkazib beruvchi *">
                    <Tanlov
                      qiymat={supplierId}
                      onChange={setSupplierId}
                      placeholder="Yetkazib beruvchini tanlang"
                      qidiruv
                      variantlar={yetkazibBeruvchilar.map((b) => ({
                        value: b.id,
                        label: b.nomi,
                      }))}
                    />
                  </Maydon>
                )}

                {partiya === null && (
                  <Maydon label="Kontragent">
                    <input
                      value={kontragent}
                      onChange={(event) => setKontragent(event.target.value)}
                      placeholder="Ixtiyoriy — kimdan/kimga"
                      className={maydonKlass}
                    />
                  </Maydon>
                )}

                {/* Summa */}
                <Maydon label="Summa (so'm) *">
                  <input
                    type="number"
                    min="0"
                    value={summa}
                    onChange={(event) => setSumma(event.target.value)}
                    placeholder="450000"
                    className={maydonKlass}
                  />
                </Maydon>

                {/* To'lov turi / hisob */}
                <Maydon label="To'lov turi">
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
                <Maydon label="Mas'ul shaxs">
                  <Tanlov
                    qiymat={responsibleId}
                    onChange={(value) => {
                      setResponsibleId(value);
                      setMasul(xodimlar.find((item) => item.id === value)?.nomi ?? "");
                    }}
                    placeholder="Mas'ul shaxsni tanlang"
                    variantlar={xodimlar.map((x) => ({ value: x.id, label: x.nomi }))}
                  />
                </Maydon>

                {/* Sana */}
                <Maydon label={tushum ? "Qachon tushdi" : "Qachon chiqdi"}>
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
                  text={izohMajburiy(turi) ? "Kommentariya *" : "Kommentariya"}
                />
                <textarea
                  value={izoh}
                  onChange={(event) => setIzoh(event.target.value)}
                  rows={4}
                  placeholder={
                    izohMajburiy(turi) ? "Nega chiqim bo'layotganini yozing..." : "Izoh yozing..."
                  }
                  className="w-full resize-none rounded-2xl border border-slate-200 p-4 text-sm font-medium outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </section>
              <section className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm">
                <SectionTitle icon={<Clock3 size={18} />} text="Tarix" />
                <div className="flex items-start gap-3 text-sm">
                  <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-orange-500" />
                  <div>
                    <p className="font-bold text-slate-700">Yangi hujjat qoralamasi ochildi</p>
                    <p className="text-xs font-semibold text-slate-400">{bugungi}</p>
                  </div>
                </div>
              </section>
            </div>
          </fieldset>
        </div>

        {tahrirRejim && (
          <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-orange-100 bg-white/75 px-5 py-4 sm:flex-row sm:justify-end sm:px-8">
            <button
              type="button"
              onClick={() => yubor(false)}
              className="h-12 rounded-2xl border border-orange-300 bg-white px-7 text-sm font-black text-orange-600 hover:bg-orange-50"
            >
              Saqlash
            </button>
            <button
              type="button"
              onClick={() => yubor(true)}
              className="h-12 rounded-2xl bg-orange-500 px-7 text-sm font-black text-white shadow-lg shadow-orange-100 hover:bg-orange-600"
            >
              Saqlash va tasdiqlash
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
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-[#FF6A00]">
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
