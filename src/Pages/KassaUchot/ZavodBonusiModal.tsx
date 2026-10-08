import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Gift, Info, LoaderCircle, X } from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import AppSelect from "@/Components/ui/AppSelect";
import { yetkazibBeruvchilar, filiallarApi } from "@/api/omborApi";
import { zavodBonusiApi } from "@/api/zavodBonusiApi";
import type { ZavodBonusi, ZavodBonusiPayload } from "@/types/zavodBonusi";
import { maydonKlass } from "./yordamchilar";
import { zavodBonusiXatosi } from "./zavodBonusiXato";

type Tanlov = { id: string; nomi: string };

const raqamlar = (matn: string) => matn.replace(/\D/g, "");
const bosh = (qiymat: number) => String(qiymat).padStart(2, "0");

// Mahalliy sana ("YYYY-MM-DD") + hozirgi mahalliy vaqt -> ISO. UTC kuni siljib ketmasligi uchun kun mahalliy olinadi.
function sanaISO(sana: string) {
  const hozir = new Date();
  return new Date(`${sana}T${bosh(hozir.getHours())}:${bosh(hozir.getMinutes())}`).toISOString();
}

function bugungiKun() {
  const hozir = new Date();
  return `${hozir.getFullYear()}-${bosh(hozir.getMonth() + 1)}-${bosh(hozir.getDate())}`;
}

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
  const [sana, setSana] = useState(bonus?.date ? bonus.date.slice(0, 10) : bugungiKun());
  const [filialId, setFilialId] = useState(bonus?.branchId ?? "");
  const [izoh, setIzoh] = useState(bonus?.note ?? "");
  const [joriyId, setJoriyId] = useState<string | null>(bonus?.id ?? null);
  const [xato, setXato] = useState("");
  const [jarayon, setJarayon] = useState<"saqlash" | "tasdiqlash" | null>(null);

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
    if (!zavodId) {
      setXato(t("zavodBonusi.errors.supplierRequired"));
      return;
    }
    if (!(miqdor > 0)) {
      setXato(t("zavodBonusi.errors.amountInvalid"));
      return;
    }
    setXato("");
    setJarayon(tasdiqlash ? "tasdiqlash" : "saqlash");
    const payload: ZavodBonusiPayload = {
      supplierId: zavodId,
      amount: miqdor,
      date: sanaISO(sana || bugungiKun()),
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
      setXato(zavodBonusiXatosi(error, t));
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

          <Maydon nom={t("zavodBonusi.form.supplier")} majburiy>
            <AppSelect value={zavodId} onChange={(event) => setZavodId(event.target.value)} disabled={faqatKorish || ishlayapti} aria-label={t("zavodBonusi.form.supplier")} className={maydonKlass}>
              <option value="">{t("zavodBonusi.form.supplierPlaceholder")}</option>
              {zavodVariantlari.map((item) => (
                <option key={item.id} value={item.id}>{item.nomi}</option>
              ))}
            </AppSelect>
          </Maydon>

          <div className="grid gap-4 sm:grid-cols-2">
            <Maydon nom={t("zavodBonusi.form.amount")} majburiy>
              <input
                inputMode="numeric"
                value={summa ? Number(summa).toLocaleString("uz-UZ") : ""}
                onChange={(event) => setSumma(raqamlar(event.target.value))}
                disabled={faqatKorish || ishlayapti}
                placeholder="0"
                className={maydonKlass}
              />
            </Maydon>
            <Maydon nom={t("zavodBonusi.form.date")}>
              <input type="date" value={sana} onChange={(event) => setSana(event.target.value)} disabled={faqatKorish || ishlayapti} className={maydonKlass} />
            </Maydon>
          </div>

          {(filiallar.length > 0 || filialId) && (
            <Maydon nom={t("zavodBonusi.form.branch")}>
              <AppSelect value={filialId} onChange={(event) => setFilialId(event.target.value)} disabled={faqatKorish || ishlayapti} aria-label={t("zavodBonusi.form.branch")} className={maydonKlass}>
                <option value="">{t("zavodBonusi.form.branchNone")}</option>
                {filiallar.map((item) => (
                  <option key={item.id} value={item.id}>{item.nomi}</option>
                ))}
                {filialId && !filiallar.some((item) => item.id === filialId) && <option value={filialId}>{bonus?.branch?.name ?? filialId}</option>}
              </AppSelect>
            </Maydon>
          )}

          <Maydon nom={t("zavodBonusi.form.note")}>
            <textarea
              value={izoh}
              onChange={(event) => setIzoh(event.target.value)}
              disabled={faqatKorish || ishlayapti}
              rows={3}
              placeholder={t("zavodBonusi.form.notePlaceholder")}
              className={`${maydonKlass} h-auto min-h-24 resize-y py-2.5`}
            />
          </Maydon>

          {xato && (
            <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>
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
