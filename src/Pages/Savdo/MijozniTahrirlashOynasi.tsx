import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Building2, Info, LoaderCircle, MapPin, Phone, UserRound } from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import PhoneInput from "@/Components/ui/PhoneInput";
import { mijozKompaniyalariRoyxatiniOlish, mijozlarRoyxatiniOlish } from "@/api/savdoApi";
import { mijozKompaniyalariApi, mijozlarApi } from "@/api/partnersApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { useSavdoStore } from "@/store/savdoStore";
import type { Mijoz, MijozKompaniyasi, MijozKompaniyasiMalumoti, MijozMalumoti } from "@/types/partner";
import type { MijozTanlovi, Sotuv, SotuvYaratishMalumoti } from "@/types/savdo";
import SavdoSelect from "./SavdoSelect";
import { donalikMijozNomi, sotuvJadvalId } from "./savdoYordamchilari";

type Props = {
  sotuv: Sotuv;
  onSotuvniYangilash: (sotuvId: string, malumot: Partial<SotuvYaratishMalumoti>) => Promise<boolean>;
  onYopish: () => void;
};

type MijozForma = { id: string; ism: string; familiya: string; telefon: string; manzil: string };
type KompaniyaForma = { id: string; nomi: string; stir: string; telefon: string };

const MAYDON =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-300 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";
const XATO_MAYDON = "!border-red-400 !ring-4 !ring-red-100";

function mijozFormasi(mijoz: {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  name?: string | null;
  phone?: string | null;
  address?: string | null;
}): MijozForma {
  return {
    id: mijoz.id,
    ism: mijoz.firstName ?? mijoz.fullName ?? mijoz.name ?? "",
    familiya: mijoz.lastName ?? "",
    telefon: mijoz.phone ?? "",
    manzil: mijoz.address ?? "",
  };
}

function kompaniyaFormasi(kompaniya: {
  id: string;
  name?: string | null;
  fullName?: string | null;
  inn?: string | null;
  phone?: string | null;
}): KompaniyaForma {
  return { id: kompaniya.id, nomi: kompaniya.name ?? kompaniya.fullName ?? "", stir: kompaniya.inn ?? "", telefon: kompaniya.phone ?? "" };
}

function mijozMatni(mijoz: MijozTanlovi) {
  const nom = [mijoz.firstName, mijoz.lastName].filter(Boolean).join(" ") || mijoz.fullName || mijoz.name || mijoz.id;
  return `${nom}${mijoz.phone ? ` - ${mijoz.phone}` : ""}`;
}

function kompaniyaMatni(kompaniya: MijozTanlovi) {
  const nom = kompaniya.name || kompaniya.fullName || kompaniya.id;
  return `${nom}${kompaniya.phone ? ` - ${kompaniya.phone}` : ""}`;
}

/** O'zbekiston raqami ("+998XXXXXXXXX") yoki bo'sh bo'lsa — formatlangan kiritish; boshqa (xorijiy, eski) raqam buzilmasligi uchun oddiy matn maydoni. */
function TelefonMaydoni({
  value,
  onChange,
  invalid,
  maxLength,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  maxLength?: number;
  ariaLabel: string;
}) {
  const [uzbekMi] = useState(() => value === "" || /^\+?998\d{9}$/.test(value.replace(/[\s()-]/g, "")));
  if (uzbekMi) return <PhoneInput value={value} onChange={onChange} invalid={invalid} />;
  return (
    <input
      type="tel"
      value={value}
      maxLength={maxLength}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
      className={`${MAYDON} ${invalid ? XATO_MAYDON : ""}`}
    />
  );
}

function Qism({ ikonka, sarlavha, children }: { ikonka: ReactNode; sarlavha: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5">
      <h3 className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#2563EB] shadow-sm ring-1 ring-blue-100">{ikonka}</span>
        {sarlavha}
      </h3>
      {children}
    </section>
  );
}

function Yorliq({ matn, children }: { matn: string; children: ReactNode }) {
  return (
    <label className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1.5">
      <span className="text-sm font-bold text-slate-400">{matn}</span>
      {children}
    </label>
  );
}

function Izoh({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 flex items-start gap-2 rounded-xl bg-blue-50/70 px-3.5 py-2.5 text-xs font-semibold leading-5 text-blue-700 ring-1 ring-blue-100">
      <Info size={14} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

function XatoMatni({ children }: { children: ReactNode }) {
  return <span className="text-xs font-semibold text-red-500">{children}</span>;
}

export default function MijozniTahrirlashOynasi({ sotuv, onSotuvniYangilash, onYopish }: Props) {
  const { t } = useTranslation("savdo_tafsilot");
  const storeMijozlar = useSavdoStore((holat) => holat.mijozlar);
  const storeKompaniyalar = useSavdoStore((holat) => holat.mijozKompaniyalari);
  const mijozniStoreDaYangilash = useSavdoStore((holat) => holat.mijozMalumotiniYangilash);
  const kompaniyaniStoreDaYangilash = useSavdoStore((holat) => holat.kompaniyaMalumotiniYangilash);

  const sotuvMijozId = sotuv.customerId ?? sotuv.customer?.id ?? "";
  const sotuvKompaniyaId = sotuv.clientCompanyId ?? sotuv.clientCompany?.id ?? "";
  const boshlangichDonalikIsm = donalikMijozNomi(sotuv);
  const boshlangichDonalikTelefon = sotuv.walkInCustomerPhone ?? "";

  // Savdo sahifasida ro'yxatlar yuklangan; boshqa joyda (bosh sahifa) ochilganda oyna o'zi oladi.
  const [yuklanganMijozlar, setYuklanganMijozlar] = useState<MijozTanlovi[]>([]);
  const [yuklanganKompaniyalar, setYuklanganKompaniyalar] = useState<MijozTanlovi[]>([]);
  const mijozlar = storeMijozlar.length > 0 ? storeMijozlar : yuklanganMijozlar;
  const kompaniyalar = storeKompaniyalar.length > 0 ? storeKompaniyalar : yuklanganKompaniyalar;

  const [mijozId, setMijozId] = useState(sotuvMijozId);
  const [kompaniyaId, setKompaniyaId] = useState(sotuvKompaniyaId);

  const [mijozAsl, setMijozAsl] = useState<MijozForma | null>(() => {
    const mijoz = sotuv.customer ?? storeMijozlar.find((item) => item.id === sotuvMijozId);
    return mijoz ? mijozFormasi(mijoz) : null;
  });
  const [mijozForma, setMijozForma] = useState<(MijozForma & { tahrirlandi: boolean }) | null>(() =>
    mijozAsl ? { ...mijozAsl, tahrirlandi: false } : null
  );
  const [kompaniyaAsl, setKompaniyaAsl] = useState<KompaniyaForma | null>(() => {
    const kompaniya = sotuv.clientCompany ?? storeKompaniyalar.find((item) => item.id === sotuvKompaniyaId);
    return kompaniya ? kompaniyaFormasi(kompaniya) : null;
  });
  const [kompaniyaForma, setKompaniyaForma] = useState<(KompaniyaForma & { tahrirlandi: boolean }) | null>(() =>
    kompaniyaAsl ? { ...kompaniyaAsl, tahrirlandi: false } : null
  );
  const [donalikIsm, setDonalikIsm] = useState(boshlangichDonalikIsm);
  const [donalikTelefon, setDonalikTelefon] = useState(boshlangichDonalikTelefon);

  const [urinildi, setUrinildi] = useState(false);
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [xato, setXato] = useState("");

  useEffect(() => {
    if (storeMijozlar.length > 0) return;
    let faol = true;
    mijozlarRoyxatiniOlish()
      .then((royxat) => faol && setYuklanganMijozlar(royxat))
      .catch(() => undefined);
    return () => {
      faol = false;
    };
  }, [storeMijozlar.length]);

  useEffect(() => {
    if (storeKompaniyalar.length > 0) return;
    let faol = true;
    mijozKompaniyalariRoyxatiniOlish()
      .then((royxat) => faol && setYuklanganKompaniyalar(royxat))
      .catch(() => undefined);
    return () => {
      faol = false;
    };
  }, [storeKompaniyalar.length]);

  // Tanlangan mijoz kartasining eng yangi holati: foydalanuvchi hali yozmagan bo'lsa maydonlar shu bilan to'ldiriladi.
  useEffect(() => {
    if (!mijozId) return;
    let faol = true;
    mijozlarApi
      .olish(mijozId, true)
      .then((mijoz: Mijoz) => {
        if (!faol) return;
        const yangi = mijozFormasi(mijoz);
        setMijozAsl(yangi);
        setMijozForma((joriy) => (joriy && joriy.id === yangi.id && joriy.tahrirlandi ? joriy : { ...yangi, tahrirlandi: false }));
      })
      .catch(() => undefined);
    return () => {
      faol = false;
    };
  }, [mijozId]);

  useEffect(() => {
    if (!kompaniyaId) return;
    let faol = true;
    mijozKompaniyalariApi
      .olish(kompaniyaId, true)
      .then((kompaniya: MijozKompaniyasi) => {
        if (!faol) return;
        const yangi = kompaniyaFormasi(kompaniya);
        setKompaniyaAsl(yangi);
        setKompaniyaForma((joriy) => (joriy && joriy.id === yangi.id && joriy.tahrirlandi ? joriy : { ...yangi, tahrirlandi: false }));
      })
      .catch(() => undefined);
    return () => {
      faol = false;
    };
  }, [kompaniyaId]);

  function mijozniTanlash(id: string) {
    if (!id || id === mijozId) return;
    setMijozId(id);
    const royxatdagi = mijozlar.find((mijoz) => mijoz.id === id);
    if (royxatdagi) {
      const forma = mijozFormasi(royxatdagi);
      setMijozAsl(forma);
      setMijozForma({ ...forma, tahrirlandi: false });
    } else {
      setMijozAsl(null);
      setMijozForma(null);
    }
    // Mijozning kompaniyasi bo'lsa, "Yangi sotuv"dagidek sotuvga kompaniya ham biriktiriladi.
    const kompaniya = royxatdagi?.companyId || royxatdagi?.company?.id;
    if (kompaniya && kompaniya !== kompaniyaId) kompaniyaniTanlash(kompaniya);
  }

  function kompaniyaniTanlash(id: string) {
    if (!id || id === kompaniyaId) return;
    setKompaniyaId(id);
    const royxatdagi = kompaniyalar.find((kompaniya) => kompaniya.id === id);
    if (royxatdagi) {
      const forma = kompaniyaFormasi(royxatdagi);
      setKompaniyaAsl(forma);
      setKompaniyaForma({ ...forma, tahrirlandi: false });
    } else {
      setKompaniyaAsl(null);
      setKompaniyaForma(null);
    }
  }

  function mijozMaydoni(maydon: keyof Omit<MijozForma, "id">, qiymat: string) {
    setMijozForma((joriy) => (joriy ? { ...joriy, [maydon]: qiymat, tahrirlandi: true } : joriy));
  }

  function kompaniyaMaydoni(maydon: keyof Omit<KompaniyaForma, "id">, qiymat: string) {
    setKompaniyaForma((joriy) => (joriy ? { ...joriy, [maydon]: qiymat, tahrirlandi: true } : joriy));
  }

  // ── O'zgarishlar (faqat o'zgargan maydonlar yuboriladi) ──
  const mijozPatch: Partial<MijozMalumoti> = {};
  if (mijozId && mijozForma && mijozAsl && mijozForma.id === mijozAsl.id) {
    if (mijozForma.ism.trim() !== mijozAsl.ism.trim()) mijozPatch.firstName = mijozForma.ism.trim();
    if (mijozForma.familiya.trim() !== mijozAsl.familiya.trim()) mijozPatch.lastName = mijozForma.familiya.trim();
    if (mijozForma.telefon.trim() !== mijozAsl.telefon.trim()) mijozPatch.phone = mijozForma.telefon.trim();
    if (mijozForma.manzil.trim() !== mijozAsl.manzil.trim()) mijozPatch.address = mijozForma.manzil.trim();
  }

  const kompaniyaPatch: Partial<MijozKompaniyasiMalumoti> = {};
  if (kompaniyaId && kompaniyaForma && kompaniyaAsl && kompaniyaForma.id === kompaniyaAsl.id) {
    if (kompaniyaForma.nomi.trim() !== kompaniyaAsl.nomi.trim()) kompaniyaPatch.name = kompaniyaForma.nomi.trim();
    if (kompaniyaForma.stir.trim() !== kompaniyaAsl.stir.trim()) kompaniyaPatch.inn = kompaniyaForma.stir.trim();
    if (kompaniyaForma.telefon.trim() !== kompaniyaAsl.telefon.trim()) kompaniyaPatch.phone = kompaniyaForma.telefon.trim();
  }

  const sotuvPatch: Partial<SotuvYaratishMalumoti> = {};
  const hechKimYoq = !sotuvMijozId && !sotuvKompaniyaId;
  if (mijozId && mijozId !== sotuvMijozId) sotuvPatch.customerId = mijozId;
  if (kompaniyaId && kompaniyaId !== sotuvKompaniyaId) sotuvPatch.clientCompanyId = kompaniyaId;
  if (hechKimYoq && (sotuvPatch.customerId || sotuvPatch.clientCompanyId)) sotuvPatch.saleType = "CLIENT";
  if (!mijozId && !kompaniyaId) {
    if (donalikIsm.trim() !== boshlangichDonalikIsm.trim()) sotuvPatch.walkInCustomerName = donalikIsm.trim();
    if (donalikTelefon.trim() !== boshlangichDonalikTelefon.trim()) sotuvPatch.walkInCustomerPhone = donalikTelefon.trim();
  }

  const mijozOzgardi = Object.keys(mijozPatch).length > 0;
  const kompaniyaOzgardi = Object.keys(kompaniyaPatch).length > 0;
  const sotuvOzgardi = Object.keys(sotuvPatch).length > 0;
  const ozgarish = mijozOzgardi || kompaniyaOzgardi || sotuvOzgardi;

  const ismXatosi = Boolean(mijozId && mijozForma && !mijozForma.ism.trim());
  const telefonXatosi = Boolean(mijozId && mijozForma && !mijozForma.telefon.trim());
  const kompaniyaXatosi = Boolean(kompaniyaId && kompaniyaForma && !kompaniyaForma.nomi.trim());
  const yaroqsiz = ismXatosi || telefonXatosi || kompaniyaXatosi;
  const mijozYuklanmoqda = Boolean(mijozId) && !mijozForma;
  const kompaniyaYuklanmoqda = Boolean(kompaniyaId) && !kompaniyaForma;

  async function saqlash() {
    setUrinildi(true);
    setXato("");
    if (!ozgarish || yaroqsiz) return;
    setSaqlanmoqda(true);
    try {
      // Avval mijoz va kompaniya kartalari, oxirida sotuv: sotuv javobida yangi nom/telefon/manzil keladi.
      if (mijozOzgardi) {
        const yangilangan = await mijozlarApi.yangilash(mijozId, mijozPatch);
        mijozniStoreDaYangilash(yangilangan as unknown as MijozTanlovi);
        const yangi = mijozFormasi(yangilangan);
        setMijozAsl(yangi);
        setMijozForma({ ...yangi, tahrirlandi: false });
      }
      if (kompaniyaOzgardi) {
        const yangilangan = await mijozKompaniyalariApi.yangilash(kompaniyaId, kompaniyaPatch);
        kompaniyaniStoreDaYangilash(yangilangan as unknown as MijozTanlovi);
        const yangi = kompaniyaFormasi(yangilangan);
        setKompaniyaAsl(yangi);
        setKompaniyaForma({ ...yangi, tahrirlandi: false });
      }
      if (sotuvOzgardi && !(await onSotuvniYangilash(sotuv.id, sotuvPatch))) return;
      onYopish();
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setSaqlanmoqda(false);
    }
  }

  const mijozTanlanmagan = !mijozId && !kompaniyaId;

  // Ro'yxat hali yuklanmagan bo'lsa ham tanlangan mijoz/kompaniya nomi tanlovda ko'rinib turadi.
  const mijozTanlovMatni =
    mijozId && !mijozlar.some((mijoz) => mijoz.id === mijozId)
      ? mijozForma
        ? mijozMatni({ id: mijozForma.id, firstName: mijozForma.ism, lastName: mijozForma.familiya, phone: mijozForma.telefon })
        : sotuv.customer
          ? mijozMatni(sotuv.customer)
          : undefined
      : undefined;
  const kompaniyaTanlovMatni =
    kompaniyaId && !kompaniyalar.some((kompaniya) => kompaniya.id === kompaniyaId)
      ? kompaniyaForma
        ? kompaniyaMatni({ id: kompaniyaForma.id, name: kompaniyaForma.nomi, phone: kompaniyaForma.telefon })
        : sotuv.clientCompany
          ? kompaniyaMatni(sotuv.clientCompany)
          : undefined
      : undefined;

  return (
    <AppModal onClose={onYopish}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mijoz-tahrir-sarlavha"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl"
      >
        <header className="flex items-center gap-4 px-8 pb-5 pt-8">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB]">
            <UserRound size={26} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2563EB]">{t("mijozTahrir.belgisi")}</p>
            <h2 id="mijoz-tahrir-sarlavha" className="mt-1 text-2xl font-black text-slate-900">
              {t("mijozTahrir.sarlavha")}
            </h2>
            <p className="mt-0.5 truncate text-sm text-slate-400">{t("mijozTahrir.sotuv", { raqam: sotuvJadvalId(sotuv) })}</p>
          </div>
        </header>

        <div className="scrollbar-hidden min-h-0 flex-1 space-y-5 overflow-y-auto px-8 pb-6">
          <Qism ikonka={<UserRound size={14} />} sarlavha={t("mijozTahrir.biriktirish.sarlavha")}>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <Yorliq matn={t("mijozTahrir.biriktirish.mijoz")}>
                <SavdoSelect
                  value={mijozId}
                  onChange={mijozniTanlash}
                  klaviatura
                  placeholder={t("mijozTahrir.biriktirish.mijozPlaceholder")}
                  selectedLabel={mijozTanlovMatni}
                  buttonClassName="h-11 rounded-xl px-3.5 text-sm"
                  options={mijozlar.map((mijoz) => ({ value: mijoz.id, label: mijozMatni(mijoz) }))}
                  dropdownClassName="min-w-[320px]"
                  portal
                />
              </Yorliq>
              <Yorliq matn={t("mijozTahrir.biriktirish.kompaniya")}>
                <SavdoSelect
                  value={kompaniyaId}
                  onChange={kompaniyaniTanlash}
                  klaviatura
                  placeholder={t("mijozTahrir.biriktirish.kompaniyaPlaceholder")}
                  selectedLabel={kompaniyaTanlovMatni}
                  buttonClassName="h-11 rounded-xl px-3.5 text-sm"
                  options={kompaniyalar.map((kompaniya) => ({ value: kompaniya.id, label: kompaniyaMatni(kompaniya) }))}
                  dropdownClassName="min-w-[320px]"
                  portal
                />
              </Yorliq>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">
              {t("mijozTahrir.biriktirish.izoh")}
              {!mijozTanlanmagan && <> {t("mijozTahrir.biriktirish.ajratibBolmaydi")}</>}
            </p>
          </Qism>

          {mijozId && (
            <Qism ikonka={<UserRound size={14} />} sarlavha={t("mijozTahrir.mijozKarta.sarlavha")}>
              {mijozYuklanmoqda || !mijozForma ? (
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-400">
                  <LoaderCircle size={16} className="animate-spin" />
                  {t("mijozTahrir.mijozKarta.yuklanmoqda")}
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" key={mijozForma.id}>
                  <Yorliq matn={t("mijozTahrir.mijozKarta.ism")}>
                    <input
                      value={mijozForma.ism}
                      onChange={(event) => mijozMaydoni("ism", event.target.value)}
                      maxLength={120}
                      aria-invalid={urinildi && ismXatosi}
                      className={`${MAYDON} ${urinildi && ismXatosi ? XATO_MAYDON : ""}`}
                    />
                    {urinildi && ismXatosi && <XatoMatni>{t("mijozTahrir.xatolar.ism")}</XatoMatni>}
                  </Yorliq>
                  <Yorliq matn={t("mijozTahrir.mijozKarta.familiya")}>
                    <input
                      value={mijozForma.familiya}
                      onChange={(event) => mijozMaydoni("familiya", event.target.value)}
                      maxLength={120}
                      className={MAYDON}
                    />
                  </Yorliq>
                  <div className="grid gap-1.5">
                    <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                      <Phone size={13} className="text-[#2563EB]" />
                      {t("mijozTahrir.mijozKarta.telefon")}
                    </span>
                    <TelefonMaydoni
                      key={mijozForma.id}
                      value={mijozForma.telefon}
                      onChange={(qiymat) => mijozMaydoni("telefon", qiymat)}
                      invalid={urinildi && telefonXatosi}
                      ariaLabel={t("mijozTahrir.mijozKarta.telefon")}
                    />
                    {urinildi && telefonXatosi && <XatoMatni>{t("mijozTahrir.xatolar.telefon")}</XatoMatni>}
                  </div>
                  <div className="grid gap-1.5 sm:col-span-2">
                    <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                      <MapPin size={13} className="text-[#2563EB]" />
                      {t("mijozTahrir.mijozKarta.manzil")}
                    </span>
                    <textarea
                      value={mijozForma.manzil}
                      onChange={(event) => mijozMaydoni("manzil", event.target.value)}
                      placeholder={t("mijozTahrir.mijozKarta.manzilPlaceholder")}
                      rows={2}
                      className="min-h-18 w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-300 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                </div>
              )}
              <Izoh>{t("mijozTahrir.mijozKarta.ogohlantirish")}</Izoh>
            </Qism>
          )}

          {kompaniyaId && (
            <Qism ikonka={<Building2 size={14} />} sarlavha={t("mijozTahrir.kompaniyaKarta.sarlavha")}>
              {kompaniyaYuklanmoqda || !kompaniyaForma ? (
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-400">
                  <LoaderCircle size={16} className="animate-spin" />
                  {t("mijozTahrir.kompaniyaKarta.yuklanmoqda")}
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" key={kompaniyaForma.id}>
                  <div className="sm:col-span-2">
                    <Yorliq matn={t("mijozTahrir.kompaniyaKarta.nomi")}>
                      <input
                        value={kompaniyaForma.nomi}
                        onChange={(event) => kompaniyaMaydoni("nomi", event.target.value)}
                        maxLength={200}
                        aria-invalid={urinildi && kompaniyaXatosi}
                        className={`${MAYDON} ${urinildi && kompaniyaXatosi ? XATO_MAYDON : ""}`}
                      />
                      {urinildi && kompaniyaXatosi && <XatoMatni>{t("mijozTahrir.xatolar.kompaniyaNomi")}</XatoMatni>}
                    </Yorliq>
                  </div>
                  <Yorliq matn={t("mijozTahrir.kompaniyaKarta.stir")}>
                    <input
                      value={kompaniyaForma.stir}
                      onChange={(event) => kompaniyaMaydoni("stir", event.target.value)}
                      inputMode="numeric"
                      maxLength={20}
                      className={MAYDON}
                    />
                  </Yorliq>
                  <div className="grid gap-1.5">
                    <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                      <Phone size={13} className="text-[#2563EB]" />
                      {t("mijozTahrir.kompaniyaKarta.telefon")}
                    </span>
                    <TelefonMaydoni
                      key={kompaniyaForma.id}
                      value={kompaniyaForma.telefon}
                      onChange={(qiymat) => kompaniyaMaydoni("telefon", qiymat)}
                      ariaLabel={t("mijozTahrir.kompaniyaKarta.telefon")}
                    />
                  </div>
                </div>
              )}
              <Izoh>
                {t("mijozTahrir.kompaniyaKarta.ogohlantirish")} {t("mijozTahrir.kompaniyaKarta.manzilYoq")}
              </Izoh>
            </Qism>
          )}

          {mijozTanlanmagan && (
            <Qism ikonka={<UserRound size={14} />} sarlavha={t("mijozTahrir.donalik.sarlavha")}>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <Yorliq matn={t("mijozTahrir.donalik.ism")}>
                  <input value={donalikIsm} onChange={(event) => setDonalikIsm(event.target.value)} maxLength={200} className={MAYDON} />
                </Yorliq>
                <div className="grid gap-1.5">
                  <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                    <Phone size={13} className="text-[#2563EB]" />
                    {t("mijozTahrir.donalik.telefon")}
                  </span>
                  <TelefonMaydoni value={donalikTelefon} onChange={setDonalikTelefon} maxLength={50} ariaLabel={t("mijozTahrir.donalik.telefon")} />
                </div>
              </div>
              <Izoh>
                {t("mijozTahrir.donalik.izoh")} {t("mijozTahrir.donalik.manzilIzoh")}
              </Izoh>
            </Qism>
          )}

          {xato && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-8 py-5">
          <span className="text-xs font-semibold text-slate-400">{ozgarish ? "" : t("mijozTahrir.ozgarishYoq")}</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onYopish}
              disabled={saqlanmoqda}
              className="h-11 rounded-xl bg-slate-100 px-5 text-sm font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
            >
              {t("mijozTahrir.bekorQilish")}
            </button>
            <button
              type="button"
              onClick={() => void saqlash()}
              disabled={saqlanmoqda || !ozgarish}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#2563EB] px-6 text-sm font-black text-white shadow-[0_10px_24px_rgba(37,99,235,.22)] transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {saqlanmoqda && <LoaderCircle size={16} className="animate-spin" />}
              {saqlanmoqda ? t("mijozTahrir.saqlanmoqda") : t("mijozTahrir.saqlash")}
            </button>
          </div>
        </footer>
      </div>
    </AppModal>
  );
}
