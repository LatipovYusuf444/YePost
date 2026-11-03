import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { Gift, Info, LoaderCircle, X } from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import HujjatSanasiMaydoni from "@/Components/common/HujjatSanasi";
import { bugungiToshkentKuni, toshkentKuni } from "@/lib/hujjatSanasi";
import AppSelect from "@/Components/ui/AppSelect";
import XatoliMaydon from "@/Components/common/XatoliMaydon";
import { useMaydonXatolari } from "@/hooks/useMaydonXatolari";
import { serverXatoMaydonlari, type XatoMaydonQoidasi } from "@/lib/maydonXatolari";
import { yetkazibBeruvchilar, filiallarApi } from "@/api/omborApi";
import { zavodBonusiApi } from "@/api/zavodBonusiApi";
import type { ZavodBonusi, ZavodBonusiPayload } from "@/types/zavodBonusi";
import { maydonKlass } from "./yordamchilar";
import { zavodBonusiXatosi } from "./zavodBonusiXato";

type Tanlov = { id: string; nomi: string };

const raqamlar = (matn: string) => matn.replace(/\D/g, "");

// Server xatosi qaysi maydonga tegishli (kalit — so'rov tanasidagi backend nomi).
const XATO_QOIDALARI: Record<string, XatoMaydonQoidasi> = {
  supplierId: { maydonlar: ["supplierId"], kodlar: ["supplier"], sozlar: ["zavod", "yetkazib beruvchi", "поставщик", "завод"] },
  amount: { maydonlar: ["amount"], kodlar: ["amount"], sozlar: ["summa", "сумм"] },
  date: { maydonlar: ["date"], kodlar: ["date_in_future", "period_closed", "date"], sozlar: ["sana", "дат"] },
  branchId: { maydonlar: ["branchId"], kodlar: ["branch"], sozlar: ["filial", "филиал"] },
  note: { maydonlar: ["note"], kodlar: ["note"], sozlar: ["izoh", "примечан", "комментар"] },
};

type Props = {
  bonus: ZavodBonusi | null;
  onYopish: () => void;
  // Ro'yxatni backend holatiga moslash uchun (saqlashdan keyin, xato bo'lganda ham chaqiriladi).
  onYangilash: () => Promise<void> | void;
};

export default function ZavodBonusiModal({ bonus, onYopish, onYangilash }: Props) {
  const { t } = useTranslation("kassa_uchot");
  // Faqat qoralamani tahrirlash mumkin; tasdiqlangan yoki bekor qilingan bonus ko'rish rejimida ochiladi.
  const faqatKorish = Boolean(bonus && bonus.status !== "DRAFT");

  const [zavodlar, setZavodlar] = useState<Tanlov[]>([]);
  const [filiallar, setFiliallar] = useState<Tanlov[]>([]);
  const [zavodId, setZavodId] = useState(bonus?.supplierId ?? "");
  const [summa, setSumma] = useState(bonus ? raqamlar(String(Math.round(Number(bonus.amount ?? 0)))) : "");
  // Hujjat sanasi (kun, Toshkent): bugun yoki o'tgan kun; kelajak sana backendda rad etiladi.
  const [sana, setSana] = useState(() => toshkentKuni(bonus?.date) || bugungiToshkentKuni());
  const [filialId, setFilialId] = useState(bonus?.branchId ?? "");
  const [izoh, setIzoh] = useState(bonus?.note ?? "");
  const [joriyId, setJoriyId] = useState<string | null>(bonus?.id ?? null);
  const [xato, setXato] = useState("");
  const [jarayon, setJarayon] = useState<"saqlash" | "tasdiqlash" | null>(null);
  const fx = useMaydonXatolari(XATO_QOIDALARI);

  useEffect(() => {
    let faol = true;
    yetkazibBeruvchilar()
      .then((royxat) => {
        if (faol) setZavodlar(royxat.map((item) => ({ id: item.id, nomi: item.name ?? item.id })));
      })
      .catch(() => {
        if (faol) setZavodlar([]);
      });
    filiallarApi
      .royxat()
      .then((royxat) => {
        if (faol) setFiliallar(royxat.map((item) => ({ id: item.id, nomi: item.name ?? item.id })));
      })
      .catch(() => {
        if (faol) setFiliallar([]);
      });
    return () => {
      faol = false;
    };
  }, []);

  // Ro'yxatda bo'lmagan (masalan, o'chirilgan) zavod ham ko'rinib tursin.
  const zavodVariantlari = useMemo(() => {
    if (!zavodId || zavodlar.some((item) => item.id === zavodId)) return zavodlar;
    return [{ id: zavodId, nomi: bonus?.supplier?.name ?? zavodId }, ...zavodlar];
  }, [bonus?.supplier?.name, zavodId, zavodlar]);

  const miqdor = Number(summa || 0);
  const ishlayapti = jarayon !== null;

  async function saqlash(tasdiqlash: boolean) {
    // Bo'sh/noto'g'ri maydonlar o'z joyida (hammasi birdan) ko'rsatiladi.
    const tekshiruv: Record<string, string> = {};
    if (!zavodId) tekshiruv.supplierId = t("zavodBonusi.errors.supplierRequired");
    if (!(miqdor > 0)) tekshiruv.amount = t("zavodBonusi.errors.amountInvalid");
    if (Object.keys(tekshiruv).length) {
      setXato("");
      fx.ornat(tekshiruv);
      return;
    }
    setXato("");
    fx.ornat({});
    setJarayon(tasdiqlash ? "tasdiqlash" : "saqlash");
    const payload: ZavodBonusiPayload = {
      supplierId: zavodId,
      amount: miqdor,
      // Faqat kun yuboriladi (YYYY-MM-DD): bugun — hozirgi vaqt, o'tgan kun — shu kunning 23:59:59 (Toshkent).
      date: sana || bugungiToshkentKuni(),
      branchId: filialId || undefined,
      note: izoh.trim() || undefined,
    };
    try {
      // Yaratish muvaffaqiyatli bo'lib, tasdiqlash xato bersa, hujjat qoralama bo'lib qoladi: qayta urinish uni yangilaydi (nusxa yaratmaydi).
      let id = joriyId;
      if (id) {
        await zavodBonusiApi.yangilash(id, payload);
      } else {
        const yaratilgan = await zavodBonusiApi.yaratish(payload);
        id = yaratilgan.id;
        setJoriyId(id);
      }
      if (tasdiqlash) await zavodBonusiApi.tasdiqlash(id);
      await onYangilash();
      onYopish();
    } catch (error) {
      const matn = zavodBonusiXatosi(error, t);
      setXato(matn);
      // Validatsiyada har maydon o'z xabari bilan; biznes xatosida (kod/xabar bo'yicha) tarjima qilingan matn bilan.
      const tafsilot: unknown = axios.isAxiosError(error) ? error.response?.data : undefined;
      const maydonlar = serverXatoMaydonlari(tafsilot, XATO_QOIDALARI);
      const sabablar = (tafsilot as { errors?: unknown } | null | undefined)?.errors;
      const validatsiya = Array.isArray(sabablar) && sabablar.length > 0;
      fx.ornat(validatsiya ? maydonlar : Object.fromEntries(Object.keys(maydonlar).map((kalit) => [kalit, matn])));
      await onYangilash();
    } finally {
      setJarayon(null);
    }
  }

  return (
    <AppModal onClose={onYopish} className="p-4">
      <div className="flex max-h-[calc(100dvh-32px)] w-full max-w-lg flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25">
              <Gift size={22} />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-black text-slate-950">
                {faqatKorish ? bonus?.docNumber || t("zavodBonusi.form.titleView") : bonus ? t("zavodBonusi.form.titleEdit") : t("zavodBonusi.form.titleNew")}
              </h2>
              <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-emerald-700">
                {bonus ? t(`zavodBonusi.holatlar.${bonus.status}`) : t("zavodBonusi.form.badgeNew")}
              </span>
            </div>
          </div>
          <button type="button" onClick={onYopish} aria-label={t("zavodBonusi.form.close")} className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800">
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {!faqatKorish && (
            <p className="flex items-start gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-xs font-semibold leading-5 text-emerald-800">
              <Info size={15} className="mt-0.5 shrink-0" aria-hidden /> {t("zavodBonusi.form.info")}
            </p>
          )}

          <XatoliMaydon xato={fx.xato("supplierId")}>
            <Maydon nom={t("zavodBonusi.form.supplier")} majburiy>
              <AppSelect value={zavodId} onChange={(event) => { fx.tozala("supplierId"); setZavodId(event.target.value); }} disabled={faqatKorish || ishlayapti} aria-label={t("zavodBonusi.form.supplier")} className={maydonKlass}>
                <option value="">{t("zavodBonusi.form.supplierPlaceholder")}</option>
                {zavodVariantlari.map((item) => (
                  <option key={item.id} value={item.id}>{item.nomi}</option>
                ))}
              </AppSelect>
            </Maydon>
          </XatoliMaydon>

          <div className="grid gap-4 sm:grid-cols-2">
            <XatoliMaydon xato={fx.xato("amount")}>
              <Maydon nom={t("zavodBonusi.form.amount")} majburiy>
                <input
                  inputMode="numeric"
                  value={summa ? Number(summa).toLocaleString("uz-UZ") : ""}
                  onChange={(event) => { fx.tozala("amount"); setSumma(raqamlar(event.target.value)); }}
                  disabled={faqatKorish || ishlayapti}
                  placeholder="0"
                  className={maydonKlass}
                />
              </Maydon>
            </XatoliMaydon>
            <XatoliMaydon xato={fx.xato("date")}>
              <Maydon nom={t("zavodBonusi.form.date")}>
                <HujjatSanasiMaydoni value={sana} onChange={(qiymat) => { fx.tozala("date"); setSana(qiymat); }} disabled={faqatKorish || ishlayapti} className={maydonKlass} aria-label={t("zavodBonusi.form.date")} korsatma={!faqatKorish} />
              </Maydon>
            </XatoliMaydon>
          </div>

          {(filiallar.length > 0 || filialId) && (
            <XatoliMaydon xato={fx.xato("branchId")}>
              <Maydon nom={t("zavodBonusi.form.branch")}>
                <AppSelect value={filialId} onChange={(event) => { fx.tozala("branchId"); setFilialId(event.target.value); }} disabled={faqatKorish || ishlayapti} aria-label={t("zavodBonusi.form.branch")} className={maydonKlass}>
                  <option value="">{t("zavodBonusi.form.branchNone")}</option>
                  {filiallar.map((item) => (
                    <option key={item.id} value={item.id}>{item.nomi}</option>
                  ))}
                  {filialId && !filiallar.some((item) => item.id === filialId) && <option value={filialId}>{bonus?.branch?.name ?? filialId}</option>}
                </AppSelect>
              </Maydon>
            </XatoliMaydon>
          )}

          <XatoliMaydon xato={fx.xato("note")}>
            <Maydon nom={t("zavodBonusi.form.note")}>
              <textarea
                value={izoh}
                onChange={(event) => { fx.tozala("note"); setIzoh(event.target.value); }}
                disabled={faqatKorish || ishlayapti}
                rows={3}
                placeholder={t("zavodBonusi.form.notePlaceholder")}
                className={`${maydonKlass} h-auto min-h-24 resize-y py-2.5`}
              />
            </Maydon>
          </XatoliMaydon>

          {/* Maydoniga bog'langan xato faqat maydon ostida; bog'lanmagani shu yerda */}
          {(fx.tepadagi || (fx.bor ? "" : xato)) && (
            <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{fx.tepadagi || xato}</p>
          )}
        </div>

        <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
          <button type="button" onClick={onYopish} disabled={ishlayapti} className="h-11 cursor-pointer rounded-2xl bg-white px-5 text-sm font-black text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-50">
            {faqatKorish ? t("zavodBonusi.form.close") : t("zavodBonusi.form.cancel")}
          </button>
          {!faqatKorish && (
            <>
              <button type="button" onClick={() => void saqlash(false)} disabled={ishlayapti} className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-5 text-sm font-black text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50">
                {jarayon === "saqlash" && <LoaderCircle size={16} className="animate-spin" />} {t("zavodBonusi.form.save")}
              </button>
              <button type="button" onClick={() => void saqlash(true)} disabled={ishlayapti} className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-700 disabled:opacity-50">
                {jarayon === "tasdiqlash" && <LoaderCircle size={16} className="animate-spin" />} {t("zavodBonusi.form.saveConfirm")}
              </button>
            </>
          )}
        </footer>
      </div>
    </AppModal>
  );
}

function Maydon({ nom, majburiy = false, children }: { nom: string; majburiy?: boolean; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-bold text-slate-600">
        {nom}
        {majburiy && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}
