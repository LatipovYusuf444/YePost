import { useEffect, useState } from "react";
import axios from "axios";
import {
  Ban,
  CheckCircle2,
  CircleAlert,
  CircleDot,
  FilePlus2,
  HandCoins,
  LoaderCircle,
  PackageCheck,
  Pencil,
  RefreshCw,
  Undo2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { qaytarishVaqtChiziginiOlish } from "@/api/savdoApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { QaytarishVoqeasi } from "@/types/savdo";
import { pulniFormatlash, sananiFormatlash } from "../savdoYordamchilari";
import { raqamga } from "./qaytarishYordamchilari";

const IKONKALAR: Record<string, { ikonka: LucideIcon; rang: string }> = {
  CREATED: { ikonka: FilePlus2, rang: "bg-slate-100 text-slate-600" },
  UPDATED: { ikonka: Pencil, rang: "bg-orange-50 text-orange-600" },
  CONFIRMED: { ikonka: CheckCircle2, rang: "bg-emerald-50 text-emerald-600" },
  STOCK_RETURNED: { ikonka: PackageCheck, rang: "bg-sky-50 text-sky-600" },
  DEBT_UPDATED: { ikonka: Wallet, rang: "bg-emerald-50 text-emerald-600" },
  REFUND_COMPLETED: { ikonka: HandCoins, rang: "bg-orange-50 text-orange-600" },
  CANCELLED: { ikonka: Ban, rang: "bg-rose-50 text-rose-600" },
  RESTORED: { ikonka: Undo2, rang: "bg-amber-50 text-amber-600" },
};

const STANDART_IKONKA = { ikonka: CircleDot, rang: "bg-slate-100 text-slate-500" };

// "STOCK_RETURNED" → "Stock returned" (backend yangi tur qo'shsa ham voqea yashirilmaydi).
function turniOqiladigan(tur: string) {
  const matn = tur.replace(/[_-]+/g, " ").trim().toLowerCase();
  return matn ? matn.charAt(0).toUpperCase() + matn.slice(1) : tur;
}

function voqeaVaqti(voqea: QaytarishVoqeasi) {
  const vaqt = voqea.at ? new Date(voqea.at).getTime() : Number.NaN;
  return Number.isFinite(vaqt) ? vaqt : null;
}

// Voqeaning `metadata` si bo'yicha qisqa tafsilotlar (hammasi backend qiymatlari; bo'sh maydon ko'rsatilmaydi).
// DEBT_UPDATED: { debtBefore, debtReduction, debtAfter }; REFUND_COMPLETED: { amount, method }.
function voqeaTafsilotlari(tur: string, metadata: Record<string, unknown> | null | undefined, t: TFunction) {
  const meta = metadata ?? {};
  const qismlar: string[] = [];

  if (tur === "DEBT_UPDATED") {
    const oldin = raqamga(meta.debtBefore);
    const keyin = raqamga(meta.debtAfter);
    const kamayish = raqamga(meta.debtReduction);
    if (oldin !== null && keyin !== null) qismlar.push(`${pulniFormatlash(oldin)} → ${pulniFormatlash(keyin)}`);
    if (kamayish !== null) qismlar.push(t("detail.eventDebtReduced", { summa: pulniFormatlash(kamayish) }));
    return qismlar;
  }

  const summa = raqamga(meta.amount);
  const miqdor = raqamga(meta.quantity);
  if (summa !== null) qismlar.push(pulniFormatlash(summa));
  if (miqdor !== null) qismlar.push(t("detail.eventQuantity", { count: miqdor }));
  if (typeof meta.method === "string" && meta.method) {
    qismlar.push(t(`refundMethods.${meta.method.toLowerCase()}`, { defaultValue: meta.method }));
  }
  return qismlar;
}

type Holat = { turi: "yuklanmoqda" } | { turi: "xato"; xabar: string } | { turi: "tayyor"; voqealar: QaytarishVoqeasi[] };

// Qaytarish hujjatining haqiqiy tarixi: GET /returns/{id}/timeline. Soxta voqea qo'shilmaydi —
// tarix kelmasa yuklash/xato/bo'sh holati ko'rsatiladi.
export default function QaytarishVaqtChizigi({ qaytarishId, yangilash = 0 }: { qaytarishId: string; yangilash?: number }) {
  const { t } = useTranslation("savdo_qaytarish");
  const [holat, setHolat] = useState<Holat>({ turi: "yuklanmoqda" });
  const [urinish, setUrinish] = useState(0);

  useEffect(() => {
    const boshqaruv = new AbortController();
    setHolat({ turi: "yuklanmoqda" });
    qaytarishVaqtChiziginiOlish(qaytarishId, boshqaruv.signal)
      .then((voqealar) => {
        const tartiblangan = [...voqealar];
        // Barcha voqeada sana bo'lsa — eskisidan yangisiga; aks holda backend tartibi saqlanadi.
        if (tartiblangan.every((voqea) => voqeaVaqti(voqea) !== null)) {
          tartiblangan.sort((a, b) => (voqeaVaqti(a) ?? 0) - (voqeaVaqti(b) ?? 0));
        }
        setHolat({ turi: "tayyor", voqealar: tartiblangan });
      })
      .catch((error: unknown) => {
        if (axios.isCancel(error)) return;
        setHolat({ turi: "xato", xabar: getApiErrorMessage(error) });
      });
    return () => boshqaruv.abort();
  }, [qaytarishId, yangilash, urinish]);

  return (
    <section className="rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6" aria-label={t("detail.timelineTitle")}>
      <h3 className="text-base font-black text-slate-900">{t("detail.timelineTitle")}</h3>

      {holat.turi === "yuklanmoqda" && (
        <p role="status" className="mt-5 flex items-center gap-2 text-sm font-semibold text-slate-500">
          <LoaderCircle size={16} className="animate-spin text-orange-500" aria-hidden /> {t("detail.timelineLoading")}
        </p>
      )}

      {holat.turi === "xato" && (
        <div role="alert" className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">
          <p className="flex items-start gap-2 text-sm font-bold text-rose-600">
            <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden /> {t("detail.timelineError")}
          </p>
          <p className="mt-1 break-words text-xs font-medium text-rose-500">{holat.xabar}</p>
          <button
            type="button"
            onClick={() => setUrinish((son) => son + 1)}
            className="mt-3 inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl bg-white px-3 text-xs font-extrabold text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-100"
          >
            <RefreshCw size={13} aria-hidden /> {t("detail.retry")}
          </button>
        </div>
      )}

      {holat.turi === "tayyor" && holat.voqealar.length === 0 && (
        <p className="mt-5 rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm font-semibold text-slate-400">{t("detail.timelineEmpty")}</p>
      )}

      {holat.turi === "tayyor" && holat.voqealar.length > 0 && (
        <ol className="mt-5 space-y-0">
          {holat.voqealar.map((voqea, indeks) => {
            const tur = String(voqea.type ?? "").toUpperCase();
            const { ikonka: Ikona, rang } = IKONKALAR[tur] ?? STANDART_IKONKA;
            const oxirgi = indeks === holat.voqealar.length - 1;
            const aktyor = voqea.actor?.fullName ?? voqea.actor?.name ?? null;
            const tafsilotlar = [aktyor, ...voqeaTafsilotlari(tur, voqea.metadata, t)].filter(Boolean);
            return (
              <li key={voqea.id ?? `${tur}-${voqea.at ?? indeks}`} className="relative flex gap-4 pb-5 last:pb-0">
                {!oxirgi && <span aria-hidden className="absolute left-[19px] top-10 bottom-0 w-px bg-slate-200" />}
                <span aria-hidden className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-4 ring-white ${rang}`}>
                  <Ikona size={17} />
                </span>
                <div className="min-w-0 pt-1">
                  <p className="text-sm font-extrabold text-slate-800">{t(`detail.events.${tur}`, { defaultValue: turniOqiladigan(String(voqea.type ?? "")) })}</p>
                  <p className="mt-0.5 text-xs font-semibold tabular-nums text-slate-400">{voqea.at ? sananiFormatlash(voqea.at) : t("detail.unavailable")}</p>
                  {tafsilotlar.length > 0 && <p className="mt-0.5 break-words text-xs font-medium text-slate-500">{tafsilotlar.join(" · ")}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
